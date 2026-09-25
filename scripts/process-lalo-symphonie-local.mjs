/**
 * Divide PDFs IMSLP combinados y renombra particellas de Lalo — Sinfonía española.
 * Los escaneos no traen portada IMSLP: los crops conservan desde la página 1.
 */
import { execSync } from "child_process";
import {
  existsSync,
  readdirSync,
  unlinkSync,
  writeFileSync,
} from "fs";
import { join } from "path";
import { renamePdfFilesInFolder } from "./lib/pdfPartsRenaming.mjs";
import {
  LALO_SYMPHONIE_WORK,
  PARA_ACOMODAR_ROOT,
} from "./lib/laloSymphonieCatalog.mjs";

const SPLIT_SCRIPT =
  process.env.SPLIT_PARTS_SCRIPT ||
  "c:\\Users\\marti\\Downloads\\Cursor - Proyectos\\scripts\\split_and_rename_parts.py";

const dryRun = process.argv.includes("--dry-run");

function resolveWorkDir() {
  const target = join(PARA_ACOMODAR_ROOT, LALO_SYMPHONIE_WORK.targetFolder);
  if (existsSync(target)) return target;
  throw new Error(`No se encuentra carpeta: ${target}`);
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
console.log(`Para acomodar / Lalo: ${workDir}`);
console.log(dryRun ? "=== DRY RUN ===" : "=== APLICANDO ===");

const meta = {
  workNumber: LALO_SYMPHONIE_WORK.workNumber,
  workTitle: LALO_SYMPHONIE_WORK.titulo,
  composerTag: LALO_SYMPHONIE_WORK.composerTag,
};

console.log("\n--- Dividir combinados ---");
for (const split of LALO_SYMPHONIE_WORK.splits) runSplit(workDir, split);

console.log("\n--- Extraer partes (p.1 es música, sin portada IMSLP) ---");
for (const crop of LALO_SYMPHONIE_WORK.crops) runCrop(workDir, crop);

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
for (const name of pdfs.sort((a, b) => a.localeCompare(b, "es"))) {
  console.log(`  ${name}`);
}
