/**
 * Rename Debussy Fauno Reinisch a nombres canónicos OFRN.
 */
import { existsSync, readdirSync, renameSync } from "fs";
import { join } from "path";
import { canonicalPartFilename } from "./lib/pdfPartsRenaming.mjs";
import {
  DEBUSSY_FAUNO_WORK,
  PARA_ACOMODAR_ROOT,
} from "./lib/debussyFaunoCatalog.mjs";

const dryRun = process.argv.includes("--dry-run");
const workDir = join(PARA_ACOMODAR_ROOT, DEBUSSY_FAUNO_WORK.targetFolder);
if (!existsSync(workDir)) throw new Error(`No se encuentra: ${workDir}`);

function targetName(instrument) {
  return canonicalPartFilename(
    instrument,
    DEBUSSY_FAUNO_WORK.workNumber,
    DEBUSSY_FAUNO_WORK.workTitleShort,
    DEBUSSY_FAUNO_WORK.composerTag,
  );
}

console.log(dryRun ? "=== DRY RUN ===" : "=== APLICANDO ===");

// Resolve SCORE pdf if accent/encoding differs
const wholes = DEBUSSY_FAUNO_WORK.wholes.map((item) => {
  if (existsSync(join(workDir, item.pdf))) return item;
  if (item.instrument === "SCORE") {
    const hit = readdirSync(workDir).find(
      (f) => /^IMSLP853690-/i.test(f) && /\.pdf$/i.test(f),
    );
    if (hit) return { ...item, pdf: hit };
  }
  return item;
});

for (const item of wholes) {
  const src = join(workDir, item.pdf);
  const dest = join(workDir, targetName(item.instrument));
  if (!existsSync(src)) {
    if (existsSync(dest)) {
      console.log(`  ok ${item.instrument}`);
      continue;
    }
    throw new Error(`Falta ${item.pdf}`);
  }
  if (dryRun) {
    console.log(`  [RENAME] ${item.instrument}`);
    continue;
  }
  renameSync(src, dest);
  console.log(`  ${item.instrument}`);
}

console.log("Listo");
