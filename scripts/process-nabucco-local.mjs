/**
 * Divide PDFs mal asignados, recorta portada SCORE y renombra Nabucco (ARIAS).
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
import { LOCAL_ARIAS, NABUCCO_WORK } from "./lib/nabuccoCatalog.mjs";

const SPLIT_SCRIPT =
  process.env.SPLIT_PARTS_SCRIPT ||
  "c:\\Users\\marti\\Downloads\\Cursor - Proyectos\\scripts\\split_and_rename_parts.py";

const dryRun = process.argv.includes("--dry-run");

function resolveWorkDir() {
  const target = join(LOCAL_ARIAS, NABUCCO_WORK.targetFolder);
  if (!existsSync(target)) {
    throw new Error(`No se encuentra carpeta Nabucco en ARIAS: ${target}`);
  }
  return target;
}

function runSplit(workDir, split) {
  const pdfPath = join(workDir, split.pdf);
  if (!existsSync(pdfPath)) {
    console.warn(`  Omitido (no existe): ${split.pdf}`);
    return;
  }
  if (dryRun) {
    console.log(
      `  [SPLIT] ${split.pdf} → ${split.parts.map((p) => `${p.instrument} (${p.start}-${p.end})`).join(", ")}`,
    );
    return;
  }
  const manifest = { parts: split.parts };
  const manifestPath = join(workDir, `${split.pdf}.manifest.json`);
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
console.log(`ARIAS / Nabucco: ${workDir}`);
console.log(dryRun ? "=== DRY RUN ===" : "=== APLICANDO ===");

const meta = {
  workNumber: NABUCCO_WORK.workNumber,
  workTitle: NABUCCO_WORK.titulo,
  composerTag: NABUCCO_WORK.composerTag,
};

console.log("\n--- Dividir combinados mal asignados ---");
for (const split of NABUCCO_WORK.splits) runSplit(workDir, split);

console.log("\n--- Recortar portada SCORE ---");
for (const crop of NABUCCO_WORK.crops) runCrop(workDir, crop);

cleanupArtifacts(workDir);

console.log("\n--- Renombrar canónicamente ---");
const renames = renamePdfFilesInFolder(workDir, meta, { dryRun });
for (const r of renames) {
  if (r.action === "rename") console.log(`  ${r.from} → ${r.to}`);
  else if (r.action === "ok") console.log(`  OK: ${r.file}`);
  else console.log(`  ${r.action}: ${r.file}${r.target ? ` → ${r.target}` : ""}`);
}

const pdfs = readdirSync(workDir).filter((f) => /\.pdf$/i.test(f));
console.log(`\nListo. ${pdfs.length} PDFs en carpeta.`);
