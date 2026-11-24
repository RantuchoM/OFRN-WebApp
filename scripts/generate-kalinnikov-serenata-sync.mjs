/**
 * Sync Kalinnikov Serenata → obra 3893 (UPDATE + particellas + título programa).
 */
import { existsSync, readdirSync } from "fs";
import { join } from "path";
import { calculateInstrumentation } from "./lib/calculateInstrumentation.mjs";
import {
  appendSeedPartsFromFile,
  collapseSameChairTranspositions,
} from "./lib/drivePartMatcher.mjs";
import {
  KALINNIKOV_SERENATA_WORK,
  PARA_ACOMODAR_FOLDER_ID,
  PARA_ACOMODAR_ROOT,
  driveFolderUrl,
} from "./lib/kalinnikovSerenataCatalog.mjs";
import {
  fetchInstrumentos,
  listFolder,
  sqlEscape,
  writeSeed,
} from "./lib/repertoireSeedUtils.mjs";

function foldName(s) {
  return String(s || "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function localPdfFiles(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => /\.pdf$/i.test(f))
    .map((name) => ({ name, webViewLink: null }));
}

async function discoverDriveFolderId() {
  if (KALINNIKOV_SERENATA_WORK.driveFolderId) {
    return KALINNIKOV_SERENATA_WORK.driveFolderId;
  }
  const files = await listFolder(driveFolderUrl(PARA_ACOMODAR_FOLDER_ID));
  const needle = foldName(KALINNIKOV_SERENATA_WORK.targetFolder);
  const hit = files.find((f) => {
    const isFolder = String(f.mimeType || "").includes("folder");
    return isFolder && foldName(f.name) === needle;
  });
  if (!hit?.id) {
    throw new Error(
      `Drive todavía no lista «${KALINNIKOV_SERENATA_WORK.targetFolder}». Esperá File Stream y reintentá.`,
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

function buildParts(files, instrumentos) {
  const parts = [];
  for (const file of files
    .filter((f) => /\.pdf$/i.test(f.name || ""))
    .sort((a, b) => (a.name || "").localeCompare(b.name || "", "es"))) {
    const before = parts.length;
    appendSeedPartsFromFile(parts, file, instrumentos);
    if (parts.length === before) console.warn("  Sin match:", file.name);
    else console.log(`  ${file.name}`);
  }
  return collapseSameChairTranspositions(parts);
}

async function main() {
  const allowEmpty = process.argv.includes("--allow-empty-urls");
  const w = KALINNIKOV_SERENATA_WORK;
  const localDir = join(PARA_ACOMODAR_ROOT, w.targetFolder);
  const localFiles = localPdfFiles(localDir);
  console.log(`Local PDFs: ${localFiles.length}`);

  const driveId = await discoverDriveFolderId();
  const linkDrive = driveFolderUrl(driveId);
  let driveFiles = [];
  try {
    driveFiles = (await listFolder(linkDrive)).filter((f) =>
      /\.pdf$/i.test(f.name || ""),
    );
  } catch (e) {
    console.warn(`  listFolder: ${e.message}`);
  }
  console.log(`Drive PDFs: ${driveFiles.length}`);

  const files = mergeDriveLinks(localFiles, driveFiles);
  const withUrl = files.filter((f) => f.webViewLink).length;
  if (withUrl < localFiles.length && !allowEmpty) {
    throw new Error(
      `URLs Drive incompletas (${withUrl}/${localFiles.length}). Sync File Stream o --allow-empty-urls.`,
    );
  }

  const instrumentos = await fetchInstrumentos();
  const parts = buildParts(files, instrumentos);
  const inst = calculateInstrumentation(parts);
  console.log(`UPDATE obra ${w.obraId}: ${parts.length} partes | ${inst}`);

  let sql = `-- Kalinnikov — Serenata para Cuerdas en sol menor → obra ${w.obraId}
-- Generado: ${new Date().toISOString().slice(0, 10)}

DO $$
BEGIN
  UPDATE obras SET
    titulo = '${sqlEscape(w.titulo)}',
    link_drive = '${sqlEscape(linkDrive)}',
    observaciones = '${sqlEscape(`Para acomodar — ${w.targetFolder}. Edición H. Sawano (IMSLP).`)}',
    instrumentacion = '${sqlEscape(inst)}',
    anio_composicion = ${w.anio},
    duracion_segundos = ${w.duracion_segundos},
    estado = 'Oficial'
  WHERE id = ${w.obraId};

  DELETE FROM obras_particellas WHERE id_obra = ${w.obraId};

`;

  for (const p of parts) {
    const solista = p.es_solista ? "true" : "false";
    sql += `  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (${w.obraId}, '${sqlEscape(p.id_instrumento)}', '${sqlEscape(p.nombre_archivo)}', '${sqlEscape(p.url_archivo)}', ${solista});

`;
  }

  sql += `END $$;
`;

  writeSeed("supabase/seed_kalinnikov_serenata_sync.sql", sql, []);
  console.log("Seed: supabase/seed_kalinnikov_serenata_sync.sql");
  console.log(`Drive folder id: ${driveId}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
