/**
 * Seed obras nuevas ES129 + vínculo al bloque Repertorio de la gira 129.
 *
 *   node scripts/generate-es129-sync.mjs
 *   node scripts/generate-es129-sync.mjs --local-only   # sin exigir URLs Drive
 */
import { existsSync, readdirSync } from "fs";
import { join } from "path";
import { calculateInstrumentation } from "./lib/calculateInstrumentation.mjs";
import {
  appendSeedPartsFromFile,
  collapseSameChairTranspositions,
} from "./lib/drivePartMatcher.mjs";
import {
  ARCHIVE_ONLY_WORKS,
  EXISTING_WORKS,
  GIRA_129,
  NEW_WORKS,
  PARA_ACOMODAR_FOLDER_ID,
  PARA_ACOMODAR_ROOT,
} from "./lib/es129Catalog.mjs";
import {
  buildSeedSql,
  fetchInstrumentos,
  listFolder,
  personKey,
  personVarSafe,
  sqlEscape,
  writeSeed,
} from "./lib/repertoireSeedUtils.mjs";

const localOnly = process.argv.includes("--local-only");
const onlyArg = process.argv.find((a) => a.startsWith("--only="));
const onlyKey = onlyArg ? onlyArg.slice("--only=".length) : null;
const skipRepertorio = process.argv.includes("--no-repertorio") || Boolean(onlyKey);

function driveFolderUrl(folderId) {
  return `https://drive.google.com/open?id=${folderId}`;
}

function localPdfFiles(dir) {
  return readdirSync(dir)
    .filter((f) => /\.pdf$/i.test(f))
    .map((name) => ({ name, webViewLink: null }));
}

async function discoverFolderId(targetFolder) {
  const files = await listFolder(driveFolderUrl(PARA_ACOMODAR_FOLDER_ID));
  const hit = files.find((f) => {
    const isFolder = String(f.mimeType || "").includes("folder");
    return isFolder && f.name === targetFolder;
  });
  if (!hit?.id) return null;
  return hit.id;
}

function mergeDriveLinks(localFiles, driveFiles) {
  const byName = new Map(
    (driveFiles || []).map((f) => [String(f.name || ""), f]),
  );
  return localFiles.map((f) => {
    const hit = byName.get(f.name);
    if (!hit?.webViewLink) return f;
    return { ...f, webViewLink: hit.webViewLink, id: hit.id };
  });
}

function buildParts(files, instrumentos) {
  const parts = [];
  const pdfs = [...files].sort((a, b) =>
    (a.name || "").localeCompare(b.name || "", "es"),
  );
  for (const file of pdfs) {
    const before = parts.length;
    const n = appendSeedPartsFromFile(parts, file, instrumentos);
    if (!n) console.warn("  Sin match:", file.name);
    else console.log(`  ${file.name} → +${parts.length - before}`);
  }
  return collapseSameChairTranspositions(parts);
}

function resolveArrangerVar(w) {
  if (!w.arranger) return "NULL";
  return `_id_arr_${personVarSafe(personKey(w.arranger))}`;
}

async function main() {
  const instrumentos = await fetchInstrumentos();
  const workData = [];
  const seededKeys = [];

  const works = onlyKey
    ? [...NEW_WORKS, ...ARCHIVE_ONLY_WORKS].filter((w) => w.key === onlyKey)
    : NEW_WORKS;
  if (!works.length) throw new Error(`--only=${onlyKey} no coincide`);

  for (const work of works) {
    const localDir = join(PARA_ACOMODAR_ROOT, work.targetFolder);
    if (!existsSync(localDir)) {
      throw new Error(`No existe ${localDir}`);
    }
    const localFiles = localPdfFiles(localDir);
    console.log(`\n${work.targetFolder}: ${localFiles.length} PDFs locales`);

    let linkDrive = null;
    let files = localFiles;

    if (!localOnly) {
      const driveId = await discoverFolderId(work.targetFolder);
      if (!driveId) {
        throw new Error(
          `Drive todavía no lista «${work.targetFolder}». Esperá sync File Stream o usá --local-only.`,
        );
      }
      linkDrive = driveFolderUrl(driveId);
      const driveFiles = (await listFolder(linkDrive)).filter((f) =>
        /\.pdf$/i.test(f.name || ""),
      );
      console.log(`  drive ${driveFiles.length} | link ${linkDrive}`);
      files = mergeDriveLinks(localFiles, driveFiles);
      const missing = files.filter((f) => !f.webViewLink).map((f) => f.name);
      if (missing.length) {
        throw new Error(`Sin URL Drive:\n${missing.join("\n")}`);
      }
    } else {
      linkDrive = `local://${work.targetFolder}`;
      files = localFiles.map((f) => ({
        ...f,
        webViewLink: `local://${work.targetFolder}/${f.name}`,
      }));
      console.log("  --local-only (URLs placeholder)");
    }

    const parts = buildParts(files, instrumentos);
    const inst = calculateInstrumentation(parts);
    console.log(`  ${parts.length} particellas | ${inst}`);

    workData.push({
      titulo: work.titulo,
      compositors: [work.compositor],
      arranger: work.arranger,
      observaciones: work.observaciones,
      link_drive: linkDrive,
      instrumentacion: inst,
      anio: work.anio,
      duracion_segundos: work.duracion_segundos,
      parts,
      key: work.key,
    });
    seededKeys.push(work.key);
  }

  const outPath = onlyKey
    ? `supabase/seed_es129_${onlyKey}_sync.sql`
    : "supabase/seed_es129_sync.sql";

  const sql = buildSeedSql({
    outComment: onlyKey
      ? `-- ES / archivo — ${onlyKey} desde Para acomodar (sin repertorio gira)`
      : "-- ES 04/26 / gira 129 — obras nuevas desde Para acomodar + repertorio",
    workData,
    resolveArrangerVar,
  });

  const repSql = skipRepertorio ? "" : repertoireSqlFixed(seededKeys);

  writeSeed(outPath, `${sql}\n${repSql}`, workData);
}

function repertoireSqlFixed(newWorkKeys) {
  const byOrden = [
    ...NEW_WORKS.filter((w) => newWorkKeys.includes(w.key)).map((w) => ({
      orden: w.orden,
      kind: "new",
      titulo: w.titulo,
      observaciones: w.observaciones,
      arranger: w.arranger,
    })),
    ...EXISTING_WORKS.map((w) => ({
      orden: w.orden,
      kind: "existing",
      obraId: w.obraId,
      duracion_segundos: w.duracion_segundos,
    })),
  ].sort((a, b) => a.orden - b.orden);

  let body = `
-- Gira ${GIRA_129.id_programa} bloque «${GIRA_129.bloque}» (id=${GIRA_129.id_repertorio})
DO $$
DECLARE
  _block_id bigint := ${GIRA_129.id_repertorio};
  _id_obra bigint;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM programas_repertorios WHERE id = _block_id AND id_programa = ${GIRA_129.id_programa}) THEN
    RAISE EXCEPTION 'Bloque repertorio ${GIRA_129.id_repertorio} no pertenece a gira ${GIRA_129.id_programa}';
  END IF;
`;

  for (const item of byOrden) {
    body += `\n  -- orden ${item.orden}\n`;
    if (item.kind === "existing") {
      body += `  _id_obra := ${item.obraId};\n`;
      if (item.duracion_segundos != null) {
        body += `  UPDATE obras SET duracion_segundos = ${item.duracion_segundos}
    WHERE id = _id_obra
      AND (duracion_segundos IS NULL OR duracion_segundos = 0 OR id = ${item.obraId});\n`;
      }
    } else {
      const titulo = sqlEscape(item.titulo);
      const obs = sqlEscape(item.observaciones);
      if (item.arranger) {
        const ap = sqlEscape(item.arranger.apellido);
        const nom = item.arranger.nombre
          ? `'${sqlEscape(item.arranger.nombre)}'`
          : "NULL";
        body += `  SELECT o.id INTO _id_obra
  FROM obras o
  JOIN obras_compositores oc ON oc.id_obra = o.id AND oc.rol = 'arreglador'
  JOIN compositores ca ON ca.id = oc.id_compositor
  WHERE o.titulo = '${titulo}'
    AND ca.apellido = '${ap}'
    AND (ca.nombre = ${nom} OR (${nom} IS NULL AND ca.nombre IS NULL))
  ORDER BY o.id DESC
  LIMIT 1;\n`;
      } else {
        body += `  SELECT o.id INTO _id_obra
  FROM obras o
  WHERE o.titulo = '${titulo}'
    AND o.observaciones = '${obs}'
  ORDER BY o.id DESC
  LIMIT 1;\n`;
      }
      body += `  IF _id_obra IS NULL THEN
    RAISE EXCEPTION 'No se encontró obra recién sembrada: ${titulo}';
  END IF;\n`;
    }

    body += `  IF NOT EXISTS (
    SELECT 1 FROM repertorio_obras
    WHERE id_repertorio = _block_id AND id_obra = _id_obra
  ) THEN
    INSERT INTO repertorio_obras (id_repertorio, id_obra, orden, excluir)
    VALUES (_block_id, _id_obra, ${item.orden}, false);
  ELSE
    UPDATE repertorio_obras
    SET orden = ${item.orden}, excluir = false
    WHERE id_repertorio = _block_id AND id_obra = _id_obra;
  END IF;\n`;
  }

  body += `END $$;\n`;
  return body;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
