/**
 * Renombra Beethoven Elegischer Gesang a nombres canónicos (wholes).
 */
import { existsSync, renameSync } from "fs";
import { join } from "path";
import { canonicalPartFilename } from "./lib/pdfPartsRenaming.mjs";
import {
  BEETHOVEN_ELEGISCHER_WORK,
  PARA_ACOMODAR_ROOT,
} from "./lib/beethovenElegischerCatalog.mjs";

const dryRun = process.argv.includes("--dry-run");
const workDir = join(PARA_ACOMODAR_ROOT, BEETHOVEN_ELEGISCHER_WORK.targetFolder);
if (!existsSync(workDir)) throw new Error(`No se encuentra: ${workDir}`);

console.log(dryRun ? "=== DRY RUN ===" : "=== APLICANDO ===");
for (const item of BEETHOVEN_ELEGISCHER_WORK.wholes) {
  const src = join(workDir, item.pdf);
  const destName = canonicalPartFilename(
    item.instrument,
    BEETHOVEN_ELEGISCHER_WORK.workNumber,
    BEETHOVEN_ELEGISCHER_WORK.workTitleShort,
    BEETHOVEN_ELEGISCHER_WORK.composerTag,
  );
  const dest = join(workDir, destName);
  if (!existsSync(src)) {
    if (existsSync(dest)) {
      console.log(`  ok ${item.instrument}`);
      continue;
    }
    throw new Error(`Falta ${item.pdf}`);
  }
  if (dryRun) {
    console.log(`  [RENAME] ${item.pdf} → ${destName}`);
    continue;
  }
  renameSync(src, dest);
  console.log(`  ${item.instrument}`);
}
console.log("Listo");
