/**
 * Renombra PDFs IMSLP → canónicos para el lote cámara/cuerdas (y SCORE-only).
 */
import { existsSync, renameSync, readdirSync } from "fs";
import { join } from "path";
import {
  canonicalPartFilename,
  normalizeInstrumentLabel,
} from "./lib/pdfPartsRenaming.mjs";
import {
  LOTE_CAMARA_CUERDAS,
  PARA_ACOMODAR_ROOT,
} from "./lib/loteCamaraCuerdasCatalog.mjs";

const dryRun = process.argv.includes("--dry-run");
const only = process.argv
  .filter((a) => a.startsWith("--only="))
  .map((a) => a.slice("--only=".length).toLowerCase());

function matchOnly(folder) {
  if (!only.length) return true;
  const f = folder.toLowerCase();
  return only.some((o) => f.includes(o));
}

console.log(dryRun ? "=== DRY RUN ===" : "=== APLICANDO ===");

for (const work of LOTE_CAMARA_CUERDAS) {
  if (!matchOnly(work.targetFolder)) continue;
  const dir = join(PARA_ACOMODAR_ROOT, work.targetFolder);
  console.log(`\n--- ${work.targetFolder} ---`);
  if (!existsSync(dir)) {
    console.warn("  Carpeta ausente");
    continue;
  }

  for (const r of work.renames) {
    const src = join(dir, r.pdf);
    if (!existsSync(src)) {
      console.warn(`  Falta: ${r.pdf}`);
      continue;
    }
    const instrument = normalizeInstrumentLabel(r.instrument);
    const target = canonicalPartFilename(
      instrument,
      work.workNumber,
      work.workTitle,
      work.composerTag,
    );
    const dst = join(dir, target);
    if (src === dst) {
      console.log(`  ok ${target}`);
      continue;
    }
    if (existsSync(dst)) {
      console.warn(`  Colisión: ${r.pdf} → ${target}`);
      continue;
    }
    console.log(`  ${r.pdf} → ${target}`);
    if (!dryRun) renameSync(src, dst);
  }

  const leftover = readdirSync(dir).filter(
    (f) => /\.pdf$/i.test(f) && /^IMSLP/i.test(f),
  );
  if (leftover.length) {
    console.warn(`  Quedan IMSLP: ${leftover.join(", ")}`);
  }
}

console.log("\nListo.");
