/**
 * Recorta portadas de viola y contrabajo y renombra las partes de
 * Bachiana brasileira Nro. 9 (W449) en Para acomodar.
 * SCORE, violines y violonchelo ya empiezan en música.
 */
import { execSync } from "child_process";
import { existsSync, readdirSync, renameSync, unlinkSync, writeFileSync } from "fs";
import { join } from "path";
import {
  canonicalPartFilename,
  renameFolderIfNeeded,
  renamePdfFilesInFolder,
} from "./lib/pdfPartsRenaming.mjs";
import {
  BACHIANA9_WORK,
  PARA_ACOMODAR_ROOT,
} from "./lib/bachiana9Catalog.mjs";

const SPLIT_SCRIPT =
  process.env.SPLIT_PARTS_SCRIPT ||
  "c:\\Users\\marti\\Downloads\\Cursor - Proyectos\\scripts\\split_and_rename_parts.py";

const dryRun = process.argv.includes("--dry-run");
const work = BACHIANA9_WORK;

function findByImslpId(workDir, fileId) {
  if (!existsSync(workDir)) return null;
  const hit = readdirSync(workDir).find(
    (name) => /\.pdf$/i.test(name) && new RegExp(`IMSLP${fileId}\\b`, "i").test(name),
  );
  return hit || null;
}

function targetName(instrument) {
  return canonicalPartFilename(
    instrument,
    work.workNumber,
    work.titulo,
    work.composerTag,
  );
}

function resolveWorkDir() {
  const target = join(PARA_ACOMODAR_ROOT, work.targetFolder);
  if (existsSync(target)) return target;
  const src = join(PARA_ACOMODAR_ROOT, work.sourceFolder);
  if (existsSync(src)) {
    if (!dryRun) {
      renameFolderIfNeeded(
        PARA_ACOMODAR_ROOT,
        work.sourceFolder,
        work.targetFolder,
        false,
      );
    }
    return dryRun ? src : target;
  }
  throw new Error(
    `No se encuentra «${work.sourceFolder}» ni «${work.targetFolder}» en Para acomodar`,
  );
}

function runCrop(workDir, crop) {
  const pdfName = findByImslpId(workDir, crop.fileId);
  const destName = targetName(crop.instrument);
  if (!pdfName) {
    if (existsSync(join(workDir, destName))) {
      console.log(`  OK ${crop.instrument} (ya canónico)`);
      return;
    }
    throw new Error(`Falta IMSLP #${crop.fileId} (${crop.instrument})`);
  }
  if (dryRun) {
    console.log(
      `  [CROP] #${crop.fileId} ${crop.instrument} páginas ${crop.start}-${crop.end} ← ${pdfName}`,
    );
    return;
  }
  const manifest = {
    parts: [{ instrument: crop.instrument, start: crop.start, end: crop.end }],
  };
  const manifestPath = join(workDir, `${pdfName}.manifest.json`);
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf8");
  execSync(
    `python "${SPLIT_SCRIPT}" --work-dir "${workDir}" --input "${join(workDir, pdfName)}" --manifest "${manifestPath}" --split-only`,
    { stdio: "inherit" },
  );
  unlinkSync(join(workDir, pdfName));
  unlinkSync(manifestPath);
}

function renameWhole(workDir, item) {
  const destName = targetName(item.instrument);
  const dest = join(workDir, destName);
  if (existsSync(dest)) {
    console.log(`  OK ${item.instrument} (ya canónico)`);
    return;
  }
  const pdfName = findByImslpId(workDir, item.fileId);
  if (!pdfName) throw new Error(`Falta IMSLP #${item.fileId} (${item.instrument})`);
  if (dryRun) {
    console.log(`  [RENAME] ${item.instrument} ← ${pdfName}`);
    return;
  }
  renameSync(join(workDir, pdfName), dest);
  console.log(`  ${item.instrument} → ${destName}`);
}

const workDir = resolveWorkDir();
console.log(`Para acomodar / Bachiana 9: ${workDir}`);
console.log(dryRun ? "=== DRY RUN ===" : "=== APLICANDO ===");
if (dryRun && !existsSync(join(PARA_ACOMODAR_ROOT, work.targetFolder))) {
  console.log(`  [FOLDER] ${work.sourceFolder} → ${work.targetFolder}`);
}

console.log("\n--- Partes enteras (página 1 ya es música) ---");
for (const item of work.wholes) renameWhole(workDir, item);

console.log("\n--- Recortar portada de título ---");
for (const crop of work.crops) runCrop(workDir, crop);

if (!dryRun) {
  console.log("\n--- Renombrar recortes ---");
  const renames = renamePdfFilesInFolder(workDir, {
    workNumber: work.workNumber,
    workTitle: work.titulo,
    composerTag: work.composerTag,
  }, { dryRun: false });
  for (const r of renames) {
    if (r.action === "rename") console.log(`  ${r.from} → ${r.to}`);
    else if (r.action !== "ok") console.log(`  ${r.action}: ${r.file || r.from}`);
  }
  const pdfs = readdirSync(workDir).filter((name) => /\.pdf$/i.test(name));
  console.log(`\nListo. ${pdfs.length} PDFs en carpeta.`);
  for (const name of pdfs.sort((a, b) => a.localeCompare(b, "es"))) console.log(`  ${name}`);
} else {
  console.log("\n--- Recortes (preview de nombre) ---");
  for (const crop of work.crops) console.log(`  ${targetName(crop.instrument)}`);
}
