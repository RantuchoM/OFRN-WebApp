/**
 * Sync LEMA — Acomodar → BD: link_drive directo, particellas desde PDFs sin renombrar.
 */
import { calculateInstrumentation } from "./lib/calculateInstrumentation.mjs";
import { suggestPartFromDriveFile } from "./lib/drivePartMatcher.mjs";
import {
  buildSeedSql,
  fetchInstrumentos,
  fetchWorkMetadata,
  listFolder,
  personVarSafe,
  sleep,
  sqlEscape,
  writeSeed,
} from "./lib/repertoireSeedUtils.mjs";
import {
  LEMA_ARRANGER,
  LEMA_WORKS,
  driveFolderUrl,
} from "./lib/lemaCatalog.mjs";

function dedupeParts(parts) {
  const map = new Map();
  for (const p of parts) {
    const key = `${p.id_instrumento}|${p.nombre_archivo}`;
    if (map.has(key)) {
      const existing = map.get(key);
      const merged = [
        ...JSON.parse(existing.url_archivo),
        ...JSON.parse(p.url_archivo),
      ];
      existing.url_archivo = JSON.stringify(merged);
    } else {
      map.set(key, { ...p });
    }
  }
  return [...map.values()];
}

async function buildParts(folderUrl, instrumentos) {
  const files = (await listFolder(folderUrl)).filter((f) =>
    /\.pdf$/i.test(f.name || ""),
  );
  const parts = [];
  for (const file of files.sort((a, b) =>
    (a.name || "").localeCompare(b.name || "", "es"),
  )) {
    const suggested = suggestPartFromDriveFile(file, instrumentos);
    if (!suggested) {
      console.warn("  Sin match:", file.name);
      continue;
    }
    parts.push({
      ...suggested,
      url_archivo: JSON.stringify([
        { url: file.webViewLink, description: file.name },
      ]),
    });
  }
  return dedupeParts(parts);
}

function sqlUpdateObra(work, linkDrive, inst, meta, parts) {
  const obs = sqlEscape(`LEMA — ${work.targetFolder}`);
  let sql = `  -- UPDATE ${work.titulo} (id ${work.obraId})
  UPDATE obras SET
    link_drive = '${sqlEscape(linkDrive)}',
    observaciones = '${obs}',
    instrumentacion = '${sqlEscape(inst)}'
  WHERE id = ${work.obraId};

  DELETE FROM obras_particellas WHERE id_obra = ${work.obraId};

`;
  for (const p of parts) {
    const solista = p.es_solista ? "true" : "false";
    sql += `  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (${work.obraId}, '${sqlEscape(p.id_instrumento)}', '${sqlEscape(p.nombre_archivo)}', '${sqlEscape(p.url_archivo)}', ${solista});

`;
  }
  return sql;
}

async function main() {
  const instrumentos = await fetchInstrumentos();
  const inserts = [];
  let updateSql = `-- LEMA sync: updates + inserts (link_drive directo, sin copias)
-- Generado: ${new Date().toISOString().slice(0, 10)}

DO $$
BEGIN
`;

  for (const work of LEMA_WORKS) {
    const folderUrl = driveFolderUrl(work.driveFolderId);
    const parts = await buildParts(folderUrl, instrumentos);
    const inst = calculateInstrumentation(parts);

    let meta = { anio: null, duracion_segundos: null };
    if (work.action === "insert") {
      meta = await fetchWorkMetadata(
        work.titulo,
        work.compositors[0],
        `${work.compositors[0].nombre || ""} ${work.compositors[0].apellido} ${work.titulo}`.trim(),
      );
      if (meta.duracion_segundos != null && meta.duracion_segundos > 900) {
        meta.duracion_segundos = null;
      }
      await sleep(300);
    }

    console.log(
      `${work.action.toUpperCase()} ${work.titulo}: ${parts.length} partes | ${inst}`,
    );

    if (work.action === "update") {
      updateSql += sqlUpdateObra(work, folderUrl, inst, meta, parts);
    } else {
      inserts.push({
        titulo: work.titulo,
        compositors: work.compositors,
        arranger: LEMA_ARRANGER,
        observaciones: `LEMA — ${work.targetFolder}`,
        link_drive: folderUrl,
        instrumentacion: inst,
        parts,
        ...meta,
      });
    }
  }

  updateSql += `END $$;
`;

  const insertSql =
    inserts.length > 0
      ? buildSeedSql({
          outComment: `-- LEMA inserts: ${inserts.length} obras nuevas`,
          workData: inserts,
          resolveArrangerVar: () => `_id_arr_${personVarSafe("Lema|Germán")}`,
        })
      : "";

  const fullSql = updateSql + "\n" + insertSql;
  writeSeed("supabase/seed_lema_sync.sql", fullSql, inserts);
  console.log(`\nSeed: supabase/seed_lema_sync.sql (${inserts.length} inserts)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
