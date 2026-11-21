/**
 * Sync Strauss Jr. — Éljen a Magyar!, Op. 332 → catálogo (obra nueva).
 * link_drive = carpeta en Para acomodar. Set incompleto (sin vientos/metales/timbales).
 */
import { existsSync, readdirSync } from "fs";
import { join } from "path";
import { calculateInstrumentation } from "./lib/calculateInstrumentation.mjs";
import { appendSeedPartsFromFile } from "./lib/drivePartMatcher.mjs";
import {
  ELJEN_MAGYAR_WORK,
  PARA_ACOMODAR_FOLDER_ID,
  PARA_ACOMODAR_ROOT,
  driveFolderUrl,
} from "./lib/eljenMagyarCatalog.mjs";
import {
  buildSeedSql,
  fetchInstrumentos,
  listFolder,
  personKey,
  personVarSafe,
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
  if (ELJEN_MAGYAR_WORK.driveFolderId) return ELJEN_MAGYAR_WORK.driveFolderId;
  const parentUrl = driveFolderUrl(PARA_ACOMODAR_FOLDER_ID);
  const files = await listFolder(parentUrl);
  const needle = foldName(ELJEN_MAGYAR_WORK.targetFolder);
  const hit = files.find((f) => {
    const isFolder = String(f.mimeType || "").includes("folder");
    return isFolder && foldName(f.name) === needle;
  });
  if (!hit?.id) {
    throw new Error(
      `Para acomodar Drive no lista «${ELJEN_MAGYAR_WORK.targetFolder}». Esperá el sync y reintentá.`,
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
  return dedupeParts(parts);
}

async function main() {
  const allowEmptyUrls = process.argv.includes("--allow-empty-urls");
  const instrumentos = await fetchInstrumentos();
  const localDir = join(PARA_ACOMODAR_ROOT, ELJEN_MAGYAR_WORK.targetFolder);
  const localFiles = localPdfFiles(localDir);
  console.log(`Local PDFs: ${localFiles.length} en ${localDir}`);
  if (localFiles.length !== 7) {
    throw new Error(`Se esperaban 7 PDFs (SCORE + 5 cuerdas + Percusión), hay ${localFiles.length}`);
  }

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
  console.log(`\nINSERT Éljen a Magyar!: ${parts.length} partes | ${inst}`);
  if (parts.length !== 7) {
    throw new Error(`Se esperaban 7 particellas, hay ${parts.length}`);
  }

  const compKey = personKey(ELJEN_MAGYAR_WORK.compositor);
  const sql = buildSeedSql({
    outComment: `-- Strauss Jr. — Éljen a Magyar!, Op. 332 (catálogo; Para acomodar)
-- Set incompleto: SCORE, cuerdas y percusión (caja, bombo y platillos). Sin vientos, metales ni timbales.
-- bajo.pdf duplicaba el contrabajo y no se sube.`,
    workData: [
      {
        titulo: ELJEN_MAGYAR_WORK.titulo,
        compositors: [ELJEN_MAGYAR_WORK.compositor],
        observaciones: `Para acomodar — ${ELJEN_MAGYAR_WORK.targetFolder}. Edición Doblinger (Nischkauer). Set incompleto: faltan vientos, metales y timbales.`,
        link_drive: linkDrive,
        instrumentacion: inst,
        anio: ELJEN_MAGYAR_WORK.anio,
        duracion_segundos: ELJEN_MAGYAR_WORK.duracionSegundos,
        parts,
      },
    ],
    resolveArrangerVar: () => "NULL",
  });

  writeSeed("supabase/seed_eljen_magyar_sync.sql", sql, [
    { titulo: ELJEN_MAGYAR_WORK.titulo },
  ]);
  console.log(`Drive folder id: ${driveId}`);
  console.log(`Compositor var: _id_comp_${personVarSafe(compKey)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
