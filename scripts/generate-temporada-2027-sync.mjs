/**
 * Alta de Beethoven op.103 y Weill op.12 desde Para acomodar.
 * No toca programas ni giras.
 *
 *   node scripts/generate-temporada-2027-sync.mjs
 */
import { existsSync, readdirSync } from "fs";
import { join } from "path";
import { calculateInstrumentation } from "./lib/calculateInstrumentation.mjs";
import { appendSeedPartsFromFile } from "./lib/drivePartMatcher.mjs";
import {
  BEETHOVEN_OCTET_WORK,
  PARA_ACOMODAR_FOLDER_ID,
  PARA_ACOMODAR_ROOT,
  WEILL_VIOLIN_WORK,
} from "./lib/temporada2027Catalog.mjs";
import {
  buildSeedSql,
  fetchInstrumentos,
  listFolder,
  writeSeed,
} from "./lib/repertoireSeedUtils.mjs";

const WORKS = [BEETHOVEN_OCTET_WORK, WEILL_VIOLIN_WORK];

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
  return parts;
}

async function loadWork(work, instrumentos) {
  const localDir = join(PARA_ACOMODAR_ROOT, work.targetFolder);
  if (!existsSync(localDir)) throw new Error(`No existe ${localDir}`);
  const localFiles = localPdfFiles(localDir);
  const driveId = await discoverFolderId(work.targetFolder);
  const linkDrive = driveFolderUrl(driveId);
  const driveFiles = (await listFolder(linkDrive)).filter((f) =>
    /\.pdf$/i.test(f.name || ""),
  );
  console.log(`\n${work.targetFolder}`);
  console.log(`  local ${localFiles.length} / drive ${driveFiles.length}`);
  const files = mergeDriveLinks(localFiles, driveFiles);
  const missing = files.filter((f) => !f.webViewLink).map((f) => f.name);
  if (missing.length) {
    throw new Error(
      `Sin URL Drive en ${work.targetFolder}:\n${missing.join("\n")}`,
    );
  }
  const parts = buildParts(files, instrumentos);
  const inst = calculateInstrumentation(parts);
  console.log(`  ${parts.length} particellas | ${inst}`);
  return {
    titulo: work.titulo,
    compositors: [work.compositor],
    observaciones: work.observaciones,
    link_drive: linkDrive,
    instrumentacion: inst,
    anio: work.anio,
    duracion_segundos: work.duracion_segundos,
    parts,
  };
}

async function main() {
  const instrumentos = await fetchInstrumentos();
  const workData = [];
  for (const work of WORKS) {
    workData.push(await loadWork(work, instrumentos));
  }
  const sql = buildSeedSql({
    outComment:
      "-- Temporada 2027: Beethoven octeto op.103 y Weill concierto de violín op.12 (catálogo; sin programa)",
    workData,
    resolveArrangerVar: () => "NULL",
  });
  writeSeed("supabase/seed_temporada_2027_octet_weill_sync.sql", sql, workData);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
