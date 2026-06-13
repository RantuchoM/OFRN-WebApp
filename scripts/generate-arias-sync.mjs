/**
 * Sync ARIAS → BD: link_drive directo, sin copiar carpetas.
 */
import { calculateInstrumentation } from "./lib/calculateInstrumentation.mjs";
import { suggestPartFromDriveFile } from "./lib/drivePartMatcher.mjs";
import {
  SB_URL,
  buildSeedSql,
  fetchInstrumentos,
  fetchWorkMetadata,
  headers,
  listFolder,
  personVarSafe,
  personKey,
  sleep,
  sqlEscape,
  writeSeed,
} from "./lib/repertoireSeedUtils.mjs";
import {
  ARIAS_ROOT,
  ARIAS_WORKS,
  ARCHIVO_COPIES_TO_DELETE,
} from "./lib/ariasCatalog.mjs";

const PARA_ACOMODAR_LINKS = {
  3490: "https://drive.google.com/drive/folders/10sckeWeQ0gqazLMAHHJHj-IKLELHor5Y",
  3494: "https://drive.google.com/drive/folders/14AOYP_S4dpm7wv-qe-8CjmYFbmFALJ4p",
  3497: "https://drive.google.com/drive/folders/1K6H_Os6xNMfjJvUt5MFmzhFJqkJHrwM9",
  3498: "https://drive.google.com/drive/folders/1L3nW2TgQJ2igG5d-3Qjv3A7fzN9sjGmp",
};

const PARA_ACOMODAR_DELETE = [
  { obraId: 3490, folderId: "1uf2qAGjKK6d4cts1i8Q3WbqJknSF69Js" },
  { obraId: 3494, folderId: "1320-8NjiLCLkLoMaSuZR4Su-XQC6R_US" },
  { obraId: 3497, folderId: "1igMJPTxpRWAgv-wTuin3yXdw3In9R87K" },
  { obraId: 3498, folderId: "13wx5S99W5CoJLaxjHBBYJxk71BRNAZsR" },
];

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

function findAriasFolder(rootItems, work) {
  if (work.driveUrlOverride) {
    return { webViewLink: work.driveUrlOverride, name: work.targetFolder };
  }
  const names = [work.targetFolder, work.sourceFolder];
  for (const n of names) {
    const hit = rootItems.find(
      (f) => f.mimeType?.includes("folder") && f.name === n,
    );
    if (hit) return hit;
  }
  const loose = rootItems.find(
    (f) =>
      f.mimeType?.includes("folder") &&
      f.name.replace(/\s+/g, " ").trim() ===
        work.targetFolder.replace(/\s+/g, " ").trim(),
  );
  return loose;
}

function sqlUpdateObra(work, linkDrive, inst, meta, parts) {
  const titulo = sqlEscape(work.titulo);
  const obs = sqlEscape(`ARIAS — ${work.targetFolder}`);
  let sql = `  -- UPDATE ${work.titulo} (id ${work.obraId})
  UPDATE obras SET
    titulo = '${titulo}',
    link_drive = '${sqlEscape(linkDrive)}',
    observaciones = '${obs}',
    instrumentacion = '${sqlEscape(inst)}',
    anio_composicion = ${meta.anio != null ? meta.anio : "NULL"},
    duracion_segundos = ${meta.duracion_segundos != null ? meta.duracion_segundos : "NULL"}
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
  const rootItems = await listFolder(ARIAS_ROOT);
  const inserts = [];
  let updateSql = `-- ARIAS sync: updates + inserts (sin copias)
-- Generado: ${new Date().toISOString().slice(0, 10)}

DO $$
BEGIN
`;

  for (const work of ARIAS_WORKS) {
    const folder = findAriasFolder(rootItems, work);
    if (!folder?.webViewLink) {
      console.warn("Carpeta no encontrada:", work.targetFolder);
      continue;
    }

    const parts = await buildParts(folder.webViewLink, instrumentos);
    let meta = { anio: work.anio ?? null, duracion_segundos: null };
    if (work.action === "insert") {
      const fetched = await fetchWorkMetadata(
        work.titulo,
        work.compositor,
        `${work.compositor.nombre || ""} ${work.compositor.apellido} ${work.titulo}`.trim(),
      );
      meta = {
        anio: fetched.anio ?? work.anio ?? null,
        duracion_segundos: fetched.duracion_segundos,
      };
      if (meta.duracion_segundos != null && meta.duracion_segundos > 900) {
        meta.duracion_segundos = null;
      }
      await sleep(300);
    }

    const inst = calculateInstrumentation(parts);
    console.log(
      `${work.action.toUpperCase()} ${work.titulo}: ${parts.length} partes | ${inst}`,
    );

    if (work.action === "update") {
      updateSql += sqlUpdateObra(work, folder.webViewLink, inst, meta, parts);
    } else {
      inserts.push({
        titulo: work.titulo,
        compositors: [work.compositor],
        arranger: null,
        observaciones: `ARIAS — ${work.targetFolder}`,
        link_drive: folder.webViewLink,
        instrumentacion: inst,
        parts,
        ...meta,
      });
    }
  }

  for (const [obraId, link] of Object.entries(PARA_ACOMODAR_LINKS)) {
    updateSql += `  UPDATE obras SET link_drive = '${sqlEscape(link)}', observaciones = 'Para acomodar — link original' WHERE id = ${obraId};

`;
  }

  updateSql += `END $$;
`;

  const insertSql =
    inserts.length > 0
      ? buildSeedSql({
          outComment: `-- ARIAS inserts: ${inserts.length} obras nuevas`,
          workData: inserts,
          resolveArrangerVar: () => "NULL",
        })
      : "";

  const fullSql = updateSql + "\n" + insertSql;
  writeSeed("supabase/seed_arias_sync.sql", fullSql, inserts);

  console.log("\nCopias Archivo a eliminar:", ARCHIVO_COPIES_TO_DELETE.length + PARA_ACOMODAR_DELETE.length);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
