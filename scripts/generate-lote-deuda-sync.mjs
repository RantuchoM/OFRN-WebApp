/**
 * Seed del lote en deuda (orquestales + cámara + SCORE-only + Hammersmith + Williams).
 *
 * Uso:
 *   node scripts/generate-lote-deuda-sync.mjs [--allow-empty-urls] [--only=onslow,carnival]
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
  SEED_WORKS,
  driveFolderUrl,
} from "./lib/loteDeudaSeedMeta.mjs";
import {
  buildSeedSql,
  fetchInstrumentos,
  listFolder,
  writeSeed,
} from "./lib/repertoireSeedUtils.mjs";

const allowEmptyUrls = process.argv.includes("--allow-empty-urls");
const only = process.argv
  .filter((a) => a.startsWith("--only="))
  .flatMap((a) => a.slice("--only=".length).toLowerCase().split(","))
  .filter(Boolean);

function matchesOnly(work) {
  if (!only.length) return true;
  const f = work.targetFolder.toLowerCase();
  return only.some((o) => f.includes(o));
}

function localPdfFiles(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => /\.pdf$/i.test(f) && !/^IMSLP/i.test(f) && !/raw split/i.test(f))
    .map((name) => ({ name, webViewLink: null }));
}

function dedupeParts(parts) {
  const map = new Map();
  for (const p of parts) {
    const key = `${p.id_instrumento}|${p.nombre_archivo}`;
    if (!map.has(key)) map.set(key, { ...p });
  }
  return [...map.values()];
}

function mergeDriveLinks(localFiles, driveFiles) {
  const byName = new Map(
    (driveFiles || []).map((f) => [String(f.name || "").toLowerCase(), f]),
  );
  return localFiles.map((f) => {
    const hit = byName.get(String(f.name || "").toLowerCase());
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
    appendSeedPartsFromFile(parts, file, instrumentos);
    const added = parts.length - before;
    if (!added) console.warn("  Sin match:", file.name);
    else console.log(`  ${file.name} → ${added}`);
  }
  return dedupeParts(collapseSameChairTranspositions(parts));
}

async function main() {
  const instrumentos = await fetchInstrumentos();
  const parentUrl = driveFolderUrl(PARA_ACOMODAR_FOLDER_ID);
  console.log(`Listando Para acomodar: ${parentUrl}`);
  const parentFiles = await listFolder(parentUrl);
  const foldersByName = new Map();
  for (const f of parentFiles) {
    if (!String(f.mimeType || "").includes("folder")) continue;
    foldersByName.set(String(f.name || "").toLowerCase(), f);
  }

  const workData = [];
  for (const work of SEED_WORKS) {
    if (!matchesOnly(work)) continue;
    console.log(`\n=== ${work.targetFolder} ===`);
    const localDir = join(PARA_ACOMODAR_ROOT, work.targetFolder);
    const localFiles = localPdfFiles(localDir);
    if (!localFiles.length) {
      console.warn("  Sin PDFs canónicos — omitida");
      continue;
    }
    const driveHit = foldersByName.get(work.targetFolder.toLowerCase());
    if (!driveHit?.id && !allowEmptyUrls) {
      console.warn("  Carpeta no listada en Drive aún — omitida");
      continue;
    }
    const linkDrive = driveHit?.id
      ? driveFolderUrl(driveHit.id)
      : driveFolderUrl(PARA_ACOMODAR_FOLDER_ID);
    let driveFiles = [];
    try {
      driveFiles = (await listFolder(linkDrive)).filter((f) =>
        /\.pdf$/i.test(f.name || ""),
      );
    } catch (e) {
      console.warn(`  listFolder: ${e.message}`);
    }
    const files = mergeDriveLinks(localFiles, driveFiles);
    const withUrl = files.filter((f) => f.webViewLink).length;
    console.log(`  Local ${localFiles.length} | Drive URLs ${withUrl}`);
    if (withUrl < localFiles.length && !allowEmptyUrls) {
      console.warn(
        `  URLs incompletas (${withUrl}/${localFiles.length}) — omitida (reintentá sync)`,
      );
      continue;
    }
    const parts = buildPartsFromFiles(files, instrumentos);
    const inst = calculateInstrumentation(parts);
    console.log(`  → ${parts.length} partes | ${inst}`);
    workData.push({
      titulo: work.titulo,
      compositors: [work.compositor],
      observaciones: `Para acomodar — ${work.targetFolder}`,
      link_drive: linkDrive,
      instrumentacion: inst,
      anio: work.anio ?? null,
      duracion_segundos: null,
      parts,
    });
  }

  if (!workData.length) {
    console.error("Ninguna obra lista para seed.");
    process.exit(1);
  }

  const sql = buildSeedSql({
    outComment:
      "-- Lote deuda Para acomodar (orquestales + cámara + SCORE-only + Hammersmith)",
    workData,
    resolveArrangerVar: () => "NULL",
  });
  writeSeed(
    "supabase/seed_lote_deuda_sync.sql",
    sql,
    workData.map((w) => ({ titulo: w.titulo })),
  );
  console.log(`\nObras en seed: ${workData.length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
