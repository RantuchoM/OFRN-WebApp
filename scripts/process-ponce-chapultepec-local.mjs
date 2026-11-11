/**
 * Divide PDFs IMSLP combinados, recorta portadas y renombra particellas Chapultepec.
 */
import { execSync } from "child_process";
import {
  existsSync,
  readdirSync,
  unlinkSync,
  writeFileSync,
} from "fs";
import { join } from "path";
import {
  renameFolderIfNeeded,
  renamePdfFilesInFolder,
} from "./lib/pdfPartsRenaming.mjs";
import {
  PARA_ACOMODAR_ROOT,
  PONCE_CHAPULTEPEC_WORK,
} from "./lib/ponceChapultepecCatalog.mjs";

const SPLIT_SCRIPT =
  process.env.SPLIT_PARTS_SCRIPT ||
  "c:\\Users\\marti\\Downloads\\Cursor - Proyectos\\scripts\\split_and_rename_parts.py";

const dryRun = process.argv.includes("--dry-run");

function resolveWorkDir() {
  const target = join(PARA_ACOMODAR_ROOT, PONCE_CHAPULTEPEC_WORK.targetFolder);
  if (existsSync(target)) return target;
  const src = join(PARA_ACOMODAR_ROOT, PONCE_CHAPULTEPEC_WORK.sourceFolder);
  if (existsSync(src) && src !== target) {
    if (!dryRun) {
      renameFolderIfNeeded(
        PARA_ACOMODAR_ROOT,
        PONCE_CHAPULTEPEC_WORK.sourceFolder,
        PONCE_CHAPULTEPEC_WORK.targetFolder,
        false,
      );
    }
    return target;
  }
  throw new Error("No se encuentra carpeta Ponce Chapultepec en Para acomodar");
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

function cleanupArtifacts(workDir) {
  for (const f of readdirSync(workDir)) {
    if (
      /\.manifest\.template\.json$/i.test(f) ||
      /\.manifest\.json$/i.test(f) ||
      /\.zip$/i.test(f)
    ) {
      if (!dryRun) unlinkSync(join(workDir, f));
      else console.log(`  [DEL] ${f}`);
    }
  }
}

const workDir = resolveWorkDir();
console.log(`Para acomodar / Chapultepec: ${workDir}`);
console.log(dryRun ? "=== DRY RUN ===" : "=== APLICANDO ===");

const meta = {
  workNumber: PONCE_CHAPULTEPEC_WORK.workNumber,
  workTitle: PONCE_CHAPULTEPEC_WORK.workTitleShort,
  composerTag: PONCE_CHAPULTEPEC_WORK.composerTag,
};

console.log("\n--- Dividir combinados ---");
for (const split of PONCE_CHAPULTEPEC_WORK.splits) runSplit(workDir, split);

console.log("\n--- Recortar portadas ---");
for (const crop of PONCE_CHAPULTEPEC_WORK.crops) runCrop(workDir, crop);

cleanupArtifacts(workDir);

if (!dryRun) {
  console.log("\n--- Renombrar canónicamente ---");
  const renames = renamePdfFilesInFolder(workDir, meta, { dryRun: false });
  for (const r of renames) {
    if (r.action === "rename") console.log(`  ${r.from} → ${r.to}`);
    else console.log(`  OK: ${r.file}`);
  }
} else {
  console.log("\n--- Renombrar (preview) ---");
  const renames = renamePdfFilesInFolder(workDir, meta, { dryRun: true });
  for (const r of renames) {
    if (r.action === "rename") console.log(`  ${r.from} → ${r.to}`);
  }
}

const pdfs = readdirSync(workDir).filter((f) => /\.pdf$/i.test(f));
console.log(`\nListo. ${pdfs.length} PDFs en carpeta.`);
