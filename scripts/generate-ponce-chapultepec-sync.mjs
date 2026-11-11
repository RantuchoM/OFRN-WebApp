/**
 * Sync Ponce — Chapultepec → obra nueva + 3ª de gira 201.
 * link_drive = carpeta en Para acomodar (sin copiar_carpeta_a_archivo).
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
  PONCE_CHAPULTEPEC_WORK,
  driveFolderUrl,
} from "./lib/ponceChapultepecCatalog.mjs";
import {
  buildSeedSql,
  fetchInstrumentos,
  listFolder,
  personKey,
  personVarSafe,
  sqlEscape,
  writeSeed,
} from "./lib/repertoireSeedUtils.mjs";

function dedupeParts(parts) {
  const map = new Map();
  for (const p of parts) {
    const key = `${p.id_instrumento}|${p.nombre_archivo}`;
    if (!map.has(key)) map.set(key, { ...p });
  }
  return [...map.values()];
}

function localPdfFiles(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => /\.pdf$/i.test(f))
    .map((name) => ({ name, webViewLink: null }));
}

function foldName(s) {
  return String(s || "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

async function discoverDriveFolderId() {
  if (PONCE_CHAPULTEPEC_WORK.driveFolderId) {
    return PONCE_CHAPULTEPEC_WORK.driveFolderId;
  }
  const parentUrl = driveFolderUrl(PARA_ACOMODAR_FOLDER_ID);
  const files = await listFolder(parentUrl);
  const needle = foldName(PONCE_CHAPULTEPEC_WORK.targetFolder);
  const hit = files.find((f) => {
    const isFolder = String(f.mimeType || "").includes("folder");
    return isFolder && foldName(f.name) === needle;
  });
  if (!hit?.id) {
    throw new Error(
      `Drive todavía no lista ${PONCE_CHAPULTEPEC_WORK.targetFolder}. Esperá el sync de Para acomodar.`,
    );
  }
  console.log(`  Drive folder: ${hit.name} (${hit.id})`);
  return hit.id;
}

function mergeDriveLinks(localFiles, driveFiles) {
  const byName = new Map(
    (driveFiles || []).map((f) => [foldName(f.name), f]),
  );
  return localFiles.map((f) => {
    const hit = byName.get(foldName(f.name));
    if (!hit?.webViewLink) return f;
    return { ...f, webViewLink: hit.webViewLink, id: hit.id };
  });
}

function buildPartsFromFiles(files, instrumentos) {
  const parts = [];
  const pdfs = files
    .filter((f) => /\.pdf$/i.test(f.name || ""))
    .sort((a, b) => (a.name || "").localeCompare(b.name || "", "es"));
  for (const file of pdfs) {
    const before = parts.length;
    const n = appendSeedPartsFromFile(parts, file, instrumentos);
    const added = parts.length - before;
    if (!added && !n) {
      console.warn("  Sin match:", file.name);
      continue;
    }
    console.log(`  ${file.name} → ${added} particella(s)`);
  }
  return dedupeParts(collapseSameChairTranspositions(parts));
}

function giraSql(observaciones) {
  const w = PONCE_CHAPULTEPEC_WORK;
  const titulo = sqlEscape(w.titulo);
  const obs = sqlEscape(observaciones);
  return `
-- Gira ${w.giraId}: 3ª obra del bloque Repertorio (id ${w.repertorioId})
DO $$
DECLARE
  _id_obra bigint;
  _block_id bigint := ${w.repertorioId};
BEGIN
  SELECT o.id INTO _id_obra
  FROM obras o
  WHERE o.titulo = '${titulo}'
    AND o.observaciones = '${obs}'
  ORDER BY o.id DESC
  LIMIT 1;
  IF _id_obra IS NULL THEN
    RAISE EXCEPTION 'No se encontró Chapultepec recién cargada';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM repertorio_obras
    WHERE id_repertorio = _block_id AND id_obra = _id_obra
  ) THEN
    INSERT INTO repertorio_obras (id_repertorio, id_obra, orden, excluir)
    VALUES (_block_id, _id_obra, ${w.ordenEnGira}, false);
  ELSE
    UPDATE repertorio_obras
    SET orden = ${w.ordenEnGira}, excluir = false
    WHERE id_repertorio = _block_id AND id_obra = _id_obra;
  END IF;
END $$;
`;
}

async function main() {
  const allowEmptyUrls = process.argv.includes("--allow-empty-urls");
  const instrumentos = await fetchInstrumentos();
  const localDir = join(PARA_ACOMODAR_ROOT, PONCE_CHAPULTEPEC_WORK.targetFolder);
  const localFiles = localPdfFiles(localDir);
  console.log(`Local PDFs: ${localFiles.length} en ${localDir}`);

  const driveId = await discoverDriveFolderId();
  const linkDrive = driveFolderUrl(driveId);
  console.log(`Drive: ${linkDrive}`);
  let driveFiles = [];
  try {
    driveFiles = (await listFolder(linkDrive)).filter((f) =>
      /\.pdf$/i.test(f.name || ""),
    );
  } catch (e) {
    console.warn(`  listFolder: ${e.message}`);
  }
  console.log(`  Drive PDFs: ${driveFiles.length} / local ${localFiles.length}`);

  const files = mergeDriveLinks(localFiles, driveFiles);
  const withUrl = files.filter((f) => f.webViewLink).length;
  if (withUrl < localFiles.length && !allowEmptyUrls) {
    throw new Error(
      `URLs Drive incompletas (${withUrl}/${localFiles.length}). Reintentá tras el sync o usá --allow-empty-urls.`,
    );
  }

  const parts = buildPartsFromFiles(files, instrumentos);
  const inst = calculateInstrumentation(parts);
  console.log(`\nINSERT Chapultepec: ${parts.length} partes | ${inst}`);

  const observaciones = `Para acomodar — ${PONCE_CHAPULTEPEC_WORK.targetFolder}`;
  const compKey = personKey(PONCE_CHAPULTEPEC_WORK.compositor);
  let sql = buildSeedSql({
    outComment:
      "-- Ponce — Chapultepec (catálogo; Para acomodar; 3ª obra gira 201)",
    workData: [
      {
        titulo: PONCE_CHAPULTEPEC_WORK.titulo,
        compositors: [PONCE_CHAPULTEPEC_WORK.compositor],
        observaciones,
        link_drive: linkDrive,
        instrumentacion: inst,
        anio: PONCE_CHAPULTEPEC_WORK.anio,
        duracion_segundos: PONCE_CHAPULTEPEC_WORK.duracion_segundos,
        parts,
      },
    ],
    resolveArrangerVar: () => "NULL",
  });
  sql += giraSql(observaciones);

  writeSeed("supabase/seed_ponce_chapultepec_sync.sql", sql, [
    { titulo: PONCE_CHAPULTEPEC_WORK.titulo },
  ]);
  console.log(`Drive folder id: ${driveId}`);
  console.log(`Compositor var: _id_comp_${personVarSafe(compKey)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
