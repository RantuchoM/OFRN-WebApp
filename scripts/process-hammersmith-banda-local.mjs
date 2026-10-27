/**
 * Split/crop/rename Holst — Hammersmith (banda).
 * SCORE: whole, sin inspección por instrumento.
 */
import { execSync } from "child_process";
import { existsSync, readdirSync, unlinkSync, writeFileSync } from "fs";
import { join } from "path";
import { renamePdfFilesInFolder } from "./lib/pdfPartsRenaming.mjs";
import {
  HAMMERSMITH_BANDA_WORK,
  PARA_ACOMODAR_ROOT,
} from "./lib/hammersmithBandaCatalog.mjs";

const SPLIT_SCRIPT =
  process.env.SPLIT_PARTS_SCRIPT ||
  "c:\\Users\\marti\\Downloads\\Cursor - Proyectos\\scripts\\split_and_rename_parts.py";

const dryRun = process.argv.includes("--dry-run");

function resolveWorkDir() {
  const target = join(PARA_ACOMODAR_ROOT, HAMMERSMITH_BANDA_WORK.targetFolder);
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
console.log(`Para acomodar / Hammersmith banda: ${workDir}`);
console.log(dryRun ? "=== DRY RUN ===" : "=== APLICANDO ===");

const meta = {
  workNumber: HAMMERSMITH_BANDA_WORK.workNumber,
  workTitle: "Hammersmith",
  composerTag: HAMMERSMITH_BANDA_WORK.composerTag,
};

console.log("\n--- Dividir combinados ---");
for (const split of HAMMERSMITH_BANDA_WORK.splits) runSplit(workDir, split);

console.log("\n--- Extraer partes / SCORE ---");
for (const crop of HAMMERSMITH_BANDA_WORK.crops) runCrop(workDir, crop);

if (!dryRun) {
  for (const f of readdirSync(workDir)) {
    if (/\.manifest(\.template)?\.json$/i.test(f) || /^IMSLP/i.test(f)) {
      try {
        unlinkSync(join(workDir, f));
        console.log(`  cleaned ${f}`);
      } catch {
        /* ignore */
      }
    }
  }
  console.log("\n--- Renombrar canónicamente ---");
  const renames = renamePdfFilesInFolder(workDir, meta, { dryRun: false });
  for (const r of renames) {
    if (r.from) console.log(`  ${r.from} → ${r.to}`);
  }
}

console.log("\nListo.");
