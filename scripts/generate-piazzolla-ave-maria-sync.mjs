/**
 * Alta de Piazzolla Ave Maria desde Para acomodar y fila en el bloque
 * Repertorio de la gira 22, con excluir = true.
 *
 *   node scripts/generate-piazzolla-ave-maria-sync.mjs
 */
import { existsSync, readdirSync } from "fs";
import { join } from "path";
import { calculateInstrumentation } from "./lib/calculateInstrumentation.mjs";
import {
  appendSeedPartsFromFile,
  collapseSameChairTranspositions,
} from "./lib/drivePartMatcher.mjs";
import {
  PARA_ACOMODAR_FOLDER_ID,
  PARA_ACOMODAR_ROOT,
  PIAZZOLLA_AVE_MARIA_WORK,
} from "./lib/piazzollaAveMariaCatalog.mjs";
import {
  buildSeedSql,
  fetchInstrumentos,
  listFolder,
  sqlEscape,
  writeSeed,
} from "./lib/repertoireSeedUtils.mjs";

const work = PIAZZOLLA_AVE_MARIA_WORK;
const GIRA_ID = 22;
const BLOCK_NAME = "Repertorio";

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
  if (!hit?.id) {
    throw new Error(
      `Drive todavía no lista «${targetFolder}». Esperá el sync de Para acomodar.`,
    );
  }
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
    else console.log(`  ${file.name} → ${parts.length - before}`);
  }
  return collapseSameChairTranspositions(parts);
}

function repertoireSql() {
  const titulo = sqlEscape(work.titulo);
  const obs = sqlEscape(work.observaciones);
  return `
-- Gira ${GIRA_ID}, bloque «${BLOCK_NAME}», al final, excluir = true
DO $$
DECLARE
  _id_obra bigint;
  _block_id bigint;
  _next_orden integer;
BEGIN
  SELECT id INTO _block_id
  FROM programas_repertorios
  WHERE id_programa = ${GIRA_ID} AND nombre = '${sqlEscape(BLOCK_NAME)}'
  ORDER BY orden
  LIMIT 1;
  IF _block_id IS NULL THEN
    RAISE EXCEPTION 'No hay bloque ${BLOCK_NAME} en la gira ${GIRA_ID}';
  END IF;

  SELECT o.id INTO _id_obra
  FROM obras o
  WHERE o.titulo = '${titulo}'
    AND o.observaciones = '${obs}'
  ORDER BY o.id DESC
  LIMIT 1;
  IF _id_obra IS NULL THEN
    RAISE EXCEPTION 'No se encontró Ave Maria de Piazzolla recién cargada';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM repertorio_obras
    WHERE id_repertorio = _block_id AND id_obra = _id_obra
  ) THEN
    SELECT COALESCE(MAX(orden), 0) + 1 INTO _next_orden
    FROM repertorio_obras
    WHERE id_repertorio = _block_id;

    INSERT INTO repertorio_obras (id_repertorio, id_obra, orden, excluir)
    VALUES (_block_id, _id_obra, _next_orden, true);
  ELSE
    UPDATE repertorio_obras
    SET excluir = true
    WHERE id_repertorio = _block_id AND id_obra = _id_obra;
  END IF;
END $$;
`;
}

async function main() {
  const localDir = join(PARA_ACOMODAR_ROOT, work.targetFolder);
  if (!existsSync(localDir)) throw new Error(`No existe ${localDir}`);

  const instrumentos = await fetchInstrumentos();
  const localFiles = localPdfFiles(localDir);
  const driveId = await discoverFolderId(work.targetFolder);
  const linkDrive = driveFolderUrl(driveId);
  const driveFiles = (await listFolder(linkDrive)).filter((f) =>
    /\.pdf$/i.test(f.name || ""),
  );
  console.log(`local ${localFiles.length} / drive ${driveFiles.length}`);
  const files = mergeDriveLinks(localFiles, driveFiles);
  const missing = files.filter((f) => !f.webViewLink).map((f) => f.name);
  if (missing.length) {
    throw new Error(`Sin URL Drive:\n${missing.join("\n")}`);
  }

  const parts = buildParts(files, instrumentos);
  const inst = calculateInstrumentation(parts);
  console.log(`${parts.length} particellas | ${inst}`);
  console.log(`link_drive ${linkDrive}`);

  const sql = buildSeedSql({
    outComment:
      "-- Piazzolla Ave Maria (Amici della Sabina) → catálogo + gira 22 / Repertorio / excluir",
    workData: [
      {
        titulo: work.titulo,
        compositors: [work.compositor],
        observaciones: work.observaciones,
        link_drive: linkDrive,
        instrumentacion: inst,
        anio: work.anio,
        duracion_segundos: work.duracion_segundos,
        parts,
      },
    ],
    resolveArrangerVar: () => "NULL",
  });

  writeSeed(
    "supabase/seed_piazzolla_ave_maria_sync.sql",
    `${sql}\n${repertoireSql()}`,
    [work],
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
