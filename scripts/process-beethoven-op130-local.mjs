/**
 * Op.130: renombra cuarteto completo + recorta Cavatina (mov. V) a carpeta propia.
 *
 *   node scripts/process-beethoven-op130-local.mjs [--dry-run]
 */
import { existsSync, mkdirSync, renameSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";
import {
  canonicalPartFilename,
  normalizeInstrumentLabel,
} from "./lib/pdfPartsRenaming.mjs";
import {
  OP130_CAVATINA,
  OP130_COMPLETE,
  PARA_ACOMODAR_ROOT,
} from "./lib/beethovenOp130Catalog.mjs";

const dryRun = process.argv.includes("--dry-run");
const extractPy = join(
  dirname(fileURLToPath(import.meta.url)),
  "lib",
  "extract_pdf_pages.py",
);

function pagesCsv(start, end) {
  const out = [];
  for (let i = start; i <= end; i++) out.push(String(i));
  return out.join(",");
}

function extractPages(src, dst, start, end) {
  const r = spawnSync(
    "python",
    [extractPy, "extract", src, dst, pagesCsv(start, end)],
    { encoding: "utf8" },
  );
  if (r.status !== 0) {
    throw new Error(
      `extract falló ${src} → ${dst}: ${r.stderr || r.stdout || r.status}`,
    );
  }
}

console.log(dryRun ? "=== DRY RUN ===" : "=== APLICANDO ===");

const completeDir = join(PARA_ACOMODAR_ROOT, OP130_COMPLETE.targetFolder);
console.log(`\n--- Completo: ${OP130_COMPLETE.targetFolder} ---`);
if (!existsSync(completeDir)) {
  console.error("Carpeta ausente:", completeDir);
  process.exit(1);
}

const renamedByInstrument = new Map();
for (const r of OP130_COMPLETE.renames) {
  const src = join(completeDir, r.pdf);
  if (!existsSync(src)) {
    console.warn(`  Falta: ${r.pdf}`);
    continue;
  }
  const instrument = normalizeInstrumentLabel(r.instrument);
  const target = canonicalPartFilename(
    instrument,
    OP130_COMPLETE.workNumber,
    OP130_COMPLETE.workTitle,
    OP130_COMPLETE.composerTag,
  );
  const dst = join(completeDir, target);
  console.log(`  ${r.pdf} → ${target}`);
  if (!dryRun && src !== dst) {
    if (existsSync(dst)) {
      console.warn(`  Colisión, omito rename: ${target}`);
    } else {
      renameSync(src, dst);
    }
  }
  renamedByInstrument.set(instrument, dryRun ? src : dst);
}

const leftover = existsSync(completeDir)
  ? readdirSync(completeDir).filter((f) => /\.pdf$/i.test(f) && /^IMSLP/i.test(f))
  : [];
if (leftover.length) console.warn(`  Quedan IMSLP: ${leftover.join(", ")}`);

const cavatinaDir = join(PARA_ACOMODAR_ROOT, OP130_CAVATINA.targetFolder);
console.log(`\n--- Cavatina: ${OP130_CAVATINA.targetFolder} ---`);
if (!dryRun) mkdirSync(cavatinaDir, { recursive: true });

for (const crop of OP130_CAVATINA.cropsFromComplete) {
  const srcInst = normalizeInstrumentLabel(crop.sourceInstrument);
  const outInst = normalizeInstrumentLabel(crop.instrument);
  let src = renamedByInstrument.get(srcInst);
  if (!src || !existsSync(src)) {
    // Si ya estaba renombrado de una corrida previa
    const guess = canonicalPartFilename(
      srcInst,
      OP130_COMPLETE.workNumber,
      OP130_COMPLETE.workTitle,
      OP130_COMPLETE.composerTag,
    );
    src = join(completeDir, guess);
  }
  if (!existsSync(src)) {
    console.warn(`  Sin fuente ${srcInst}`);
    continue;
  }
  const outName = canonicalPartFilename(
    outInst,
    OP130_CAVATINA.workNumber,
    OP130_CAVATINA.workTitle,
    OP130_CAVATINA.composerTag,
  );
  const dst = join(cavatinaDir, outName);
  console.log(
    `  ${srcInst} p.${crop.start}-${crop.end} → ${outName}`,
  );
  if (!dryRun) extractPages(src, dst, crop.start, crop.end);
}

console.log("\nListo.");
