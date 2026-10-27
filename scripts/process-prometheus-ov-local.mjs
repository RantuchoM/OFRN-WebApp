/**
 * Divide PDFs IMSLP Breitkopf Orch.B. 4482 y renombra particellas
 * de Beethoven — Obertura Las Criaturas de Prometeo, Op. 43.
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
  PARA_ACOMODAR_ROOT,
  PROMETHEUS_OV_WORK,
} from "./lib/prometheusOvCatalog.mjs";

const SPLIT_SCRIPT =
  process.env.SPLIT_PARTS_SCRIPT ||
  "c:\\Users\\marti\\Downloads\\Cursor - Proyectos\\scripts\\split_and_rename_parts.py";

const dryRun = process.argv.includes("--dry-run");

function resolveWorkDir() {
  const target = join(PARA_ACOMODAR_ROOT, PROMETHEUS_OV_WORK.targetFolder);
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
console.log(`Para acomodar / Prometheus OV: ${workDir}`);
console.log(dryRun ? "=== DRY RUN ===" : "=== APLICANDO ===");

const meta = {
  workNumber: PROMETHEUS_OV_WORK.workNumber,
  workTitle: PROMETHEUS_OV_WORK.workTitleShort,
  composerTag: PROMETHEUS_OV_WORK.composerTag,
};

console.log("\n--- Dividir combinados / transposiciones ---");
for (const split of PROMETHEUS_OV_WORK.splits) runSplit(workDir, split);

console.log("\n--- Extraer partes / SCORE ---");
for (const crop of PROMETHEUS_OV_WORK.crops) runCrop(workDir, crop);

if (!dryRun) {
  for (const f of readdirSync(workDir)) {
    if (/\.manifest\.template\.json$/i.test(f) || /^IMSLP/i.test(f)) {
      const p = join(workDir, f);
      try {
        unlinkSync(p);
        console.log(`  cleaned ${f}`);
      } catch {
        /* ignore */
      }
    }
  }

  console.log("\n--- Renombrar canónicamente ---");
  const renames = renamePdfFilesInFolder(workDir, meta, { dryRun: false });
  for (const r of renames) {
    console.log(`  ${r.from} → ${r.to}`);
  }
}

console.log("\nListo.");
