/**
 * Seed Beethoven Op.130 completo + Cavatina (recorte mov. V).
 *
 *   node scripts/generate-beethoven-op130-sync.mjs [--allow-empty-urls]
 */
import { existsSync, readdirSync } from "fs";
import { join } from "path";
import { calculateInstrumentation } from "./lib/calculateInstrumentation.mjs";
import {
  appendSeedPartsFromFile,
  collapseSameChairTranspositions,
} from "./lib/drivePartMatcher.mjs";
import {
  OP130_CAVATINA,
  OP130_COMPLETE,
  PARA_ACOMODAR_FOLDER_ID,
  PARA_ACOMODAR_ROOT,
  driveFolderUrl,
} from "./lib/beethovenOp130Catalog.mjs";
import {
  buildSeedSql,
  fetchInstrumentos,
  listFolder,
  personKey,
  personVarSafe,
  writeSeed,
} from "./lib/repertoireSeedUtils.mjs";

const allowEmptyUrls = process.argv.includes("--allow-empty-urls");

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
    .filter((f) => /\.pdf$/i.test(f) && !/^IMSLP/i.test(f))
    .map((name) => ({ name, webViewLink: null }));
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

async function resolveFolder(targetFolder, parentFiles) {
  const hit = parentFiles.find((f) => {
    const name = String(f.name || "");
    return (
      String(f.mimeType || "").includes("folder") &&
      name.toLowerCase() === targetFolder.toLowerCase()
    );
  });
  if (hit?.id) return hit.id;
  const soft = parentFiles.find((f) => {
    const name = String(f.name || "").toLowerCase();
    return (
      String(f.mimeType || "").includes("folder") &&
      name.includes(targetFolder.toLowerCase().slice(0, 40))
    );
  });
  return soft?.id || null;
}

async function buildWorkEntry(meta, parentFiles, instrumentos) {
  console.log(`\n=== ${meta.targetFolder} ===`);
  const localDir = join(PARA_ACOMODAR_ROOT, meta.targetFolder);
  const localFiles = localPdfFiles(localDir);
  if (!localFiles.length) {
    console.warn("  Sin PDFs canónicos");
    return null;
  }
  const folderId = await resolveFolder(meta.targetFolder, parentFiles);
  if (!folderId && !allowEmptyUrls) {
    throw new Error(
      `Drive no lista aún «${meta.targetFolder}». Esperá File Stream o --allow-empty-urls.`,
    );
  }
  const linkDrive = folderId
    ? driveFolderUrl(folderId)
    : driveFolderUrl(PARA_ACOMODAR_FOLDER_ID);
  console.log(`  link_drive: ${linkDrive}`);

  let driveFiles = [];
  if (folderId) {
    try {
      driveFiles = (await listFolder(linkDrive)).filter((f) =>
        /\.pdf$/i.test(f.name || ""),
      );
    } catch (e) {
      console.warn(`  listFolder: ${e.message}`);
    }
  }
  const files = mergeDriveLinks(localFiles, driveFiles);
  const withUrl = files.filter((f) => f.webViewLink).length;
  console.log(`  URLs ${withUrl}/${localFiles.length}`);
  if (withUrl < localFiles.length && !allowEmptyUrls) {
    throw new Error(
      `URLs incompletas (${withUrl}/${localFiles.length}). Sync Drive o --allow-empty-urls.`,
    );
  }

  const parts = buildPartsFromFiles(files, instrumentos);
  const instrumentacion = calculateInstrumentation(parts);
  console.log(`  ${parts.length} partes | ${instrumentacion}`);
  return {
    titulo: meta.titulo,
    compositors: [meta.compositor],
    observaciones: `Para acomodar — ${meta.targetFolder}`,
    link_drive: linkDrive,
    instrumentacion,
    anio: meta.anio,
    duracion_segundos: meta.duracion_segundos ?? null,
    parts,
  };
}

async function main() {
  const instrumentos = await fetchInstrumentos();
  const parentUrl = driveFolderUrl(PARA_ACOMODAR_FOLDER_ID);
  console.log(`Listando Para acomodar: ${parentUrl}`);
  const parentFiles = await listFolder(parentUrl);

  const workData = [];
  for (const meta of [OP130_COMPLETE, OP130_CAVATINA]) {
    const entry = await buildWorkEntry(meta, parentFiles, instrumentos);
    if (entry) workData.push(entry);
  }
  if (!workData.length) throw new Error("Nada para seedear");

  const sql = buildSeedSql({
    outComment:
      "-- Beethoven Op.130 cuarteto completo + Cavatina (mov. V) — Para acomodar",
    workData,
    resolveArrangerVar: () => "NULL",
  });
  writeSeed("supabase/seed_beethoven_op130_sync.sql", sql, workData);
  console.log(
    `\nCompositor var: _id_comp_${personVarSafe(personKey(OP130_COMPLETE.compositor))}`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
