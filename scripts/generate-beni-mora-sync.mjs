/**
 * Sync Holst — Beni Mora, Op. 29 Nro. 1 → catálogo (obra nueva).
 * link_drive = carpeta en Para acomodar.
 */
import { existsSync, readdirSync } from "fs";
import { join } from "path";
import { calculateInstrumentation } from "./lib/calculateInstrumentation.mjs";
import { appendSeedPartsFromFile } from "./lib/drivePartMatcher.mjs";
import {
  BENI_MORA_WORK,
  PARA_ACOMODAR_FOLDER_ID,
  PARA_ACOMODAR_ROOT,
  driveFolderUrl,
} from "./lib/beniMoraCatalog.mjs";
import {
  buildSeedSql,
  fetchInstrumentos,
  listFolder,
  personKey,
  personVarSafe,
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

async function discoverDriveFolderId() {
  if (BENI_MORA_WORK.driveFolderId) return BENI_MORA_WORK.driveFolderId;
  const parentUrl = driveFolderUrl(PARA_ACOMODAR_FOLDER_ID);
  const files = await listFolder(parentUrl);
  const hit = files.find((f) => {
    const name = String(f.name || "").toLowerCase();
    const isFolder = String(f.mimeType || "").includes("folder");
    return isFolder && name.includes("beni") && name.includes("mora");
  });
  if (!hit?.id) {
    throw new Error(
      "Para acomodar Drive no lista la carpeta Beni Mora. Esperá el sync y reintentá.",
    );
  }
  console.log(`  Drive folder: ${hit.name} (${hit.id})`);
  return hit.id;
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
    const n = appendSeedPartsFromFile(parts, file, instrumentos);
    const added = parts.length - before;
    if (!added && !n) {
      console.warn("  Sin match:", file.name);
      continue;
    }
    console.log(`  ${file.name} → ${added} particella(s)`);
  }
  return dedupeParts(parts);
}

async function main() {
  const allowEmptyUrls = process.argv.includes("--allow-empty-urls");
  const instrumentos = await fetchInstrumentos();
  const localDir = join(PARA_ACOMODAR_ROOT, BENI_MORA_WORK.targetFolder);
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
  console.log(`\nINSERT Beni Mora: ${parts.length} partes | ${inst}`);

  const compKey = personKey(BENI_MORA_WORK.compositor);
  const sql = buildSeedSql({
    outComment: `-- Holst — Beni Mora, Op. 29 Nro. 1 (catálogo; Para acomodar)`,
    workData: [
      {
        titulo: BENI_MORA_WORK.titulo,
        compositors: [BENI_MORA_WORK.compositor],
        observaciones: `Para acomodar — ${BENI_MORA_WORK.targetFolder}`,
        link_drive: linkDrive,
        instrumentacion: inst,
        anio: BENI_MORA_WORK.anio,
        duracion_segundos: null,
        parts,
      },
    ],
    resolveArrangerVar: () => "NULL",
  });

  writeSeed("supabase/seed_beni_mora_sync.sql", sql, [
    { titulo: BENI_MORA_WORK.titulo },
  ]);
  console.log(`Drive folder id: ${driveId}`);
  console.log(`Compositor var: _id_comp_${personVarSafe(compKey)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
