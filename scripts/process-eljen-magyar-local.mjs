/**
 * Divide cuerdas.pdf, recorta SCORE y percusión, y renombra Éljen a Magyar! Op. 332.
 * Descarta bajo.pdf (duplicado del Kontrabass de cuerdas p.8).
 */
import { execSync } from "child_process";
import { existsSync, readdirSync, unlinkSync, writeFileSync } from "fs";
import { join } from "path";
import {
  ELJEN_MAGYAR_WORK,
  PARA_ACOMODAR_ROOT,
} from "./lib/eljenMagyarCatalog.mjs";
import {
  renameFolderIfNeeded,
  renamePdfFilesInFolder,
} from "./lib/pdfPartsRenaming.mjs";

const SPLIT_SCRIPT =
  process.env.SPLIT_PARTS_SCRIPT ||
  "c:\\Users\\marti\\Downloads\\Cursor - Proyectos\\scripts\\split_and_rename_parts.py";

const dryRun = process.argv.includes("--dry-run");

function resolveWorkDir() {
  const target = join(PARA_ACOMODAR_ROOT, ELJEN_MAGYAR_WORK.targetFolder);
  if (existsSync(target)) return target;
  const src = join(PARA_ACOMODAR_ROOT, ELJEN_MAGYAR_WORK.sourceFolder);
  if (!existsSync(src)) {
    throw new Error(`No se encuentra carpeta Nueva ni ${ELJEN_MAGYAR_WORK.targetFolder}`);
  }
  if (dryRun) {
    console.log(
      `  [RENAME DIR] ${ELJEN_MAGYAR_WORK.sourceFolder} → ${ELJEN_MAGYAR_WORK.targetFolder}`,
    );
    return src;
  }
  renameFolderIfNeeded(
    PARA_ACOMODAR_ROOT,
    ELJEN_MAGYAR_WORK.sourceFolder,
    ELJEN_MAGYAR_WORK.targetFolder,
    false,
  );
  return target;
}

function runSplit(workDir, split) {
  const pdfPath = join(workDir, split.pdf);
  if (!existsSync(pdfPath)) {
    console.warn(`  Omitido (no existe): ${split.pdf}`);
    return;
  }
  const manifest = { parts: split.parts };
  const manifestPath = join(workDir, `${split.pdf}.manifest.json`);
  if (dryRun) {
    console.log(
      `  [SPLIT] ${split.pdf} → ${split.parts.map((p) => `${p.instrument} (${p.start}-${p.end})`).join(", ")}`,
    );
    return;
  }
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf8");
  execSync(
    `python "${SPLIT_SCRIPT}" --work-dir "${workDir}" --input "${pdfPath}" --manifest "${manifestPath}" --split-only`,
    { stdio: "inherit" },
  );
  unlinkSync(pdfPath);
  unlinkSync(manifestPath);
}

function runCrop(workDir, crop) {
  runSplit(workDir, {
    pdf: crop.pdf,
    parts: [{ instrument: crop.instrument, start: crop.start, end: crop.end }],
  });
}

const workDir = resolveWorkDir();
console.log(`Para acomodar / Éljen a Magyar!: ${workDir}`);
console.log(dryRun ? "=== DRY RUN ===" : "=== APLICANDO ===");

console.log("\n--- Dividir cuerdas ---");
for (const split of ELJEN_MAGYAR_WORK.splits) runSplit(workDir, split);

console.log("\n--- SCORE y percusión ---");
for (const crop of ELJEN_MAGYAR_WORK.crops) runCrop(workDir, crop);

console.log("\n--- Duplicado de contrabajo ---");
for (const name of ELJEN_MAGYAR_WORK.dropDuplicates) {
  const path = join(workDir, name);
  if (!existsSync(path)) continue;
  if (dryRun) console.log(`  [DEL] ${name}`);
  else {
    unlinkSync(path);
    console.log(`  borrado ${name} (mismo Kontrabass que cuerdas p.8)`);
  }
}

const meta = {
  workNumber: ELJEN_MAGYAR_WORK.workNumber,
  workTitle: ELJEN_MAGYAR_WORK.workTitle,
  composerTag: ELJEN_MAGYAR_WORK.composerTag,
};

console.log(dryRun ? "\n--- Renombrar (preview) ---" : "\n--- Renombrar canónicamente ---");
const renames = renamePdfFilesInFolder(workDir, meta, { dryRun });
for (const r of renames) {
  if (r.action === "rename") console.log(`  ${r.from} → ${r.to}`);
  else console.log(`  ${r.action}: ${r.file || r.target}`);
}

if (!dryRun) {
  console.log("\nPDFs:");
  for (const name of readdirSync(workDir).filter((f) => /\.pdf$/i.test(f)).sort()) {
    console.log(`  ${name}`);
  }
}

console.log("\nListo.");
