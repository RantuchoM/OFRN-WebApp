/**
 * Rename particellas Borodin Sinfonía Nro. 2 (Lancec) a nombres canónicos OFRN.
 */
import { existsSync, renameSync } from "fs";
import { join } from "path";
import { canonicalPartFilename } from "./lib/pdfPartsRenaming.mjs";
import {
  BORODIN_SYM2_WORK,
  PARA_ACOMODAR_ROOT,
} from "./lib/borodinSym2Catalog.mjs";

const dryRun = process.argv.includes("--dry-run");
const workDir = join(PARA_ACOMODAR_ROOT, BORODIN_SYM2_WORK.targetFolder);
if (!existsSync(workDir)) throw new Error(`No se encuentra: ${workDir}`);

function targetName(instrument) {
  return canonicalPartFilename(
    instrument,
    BORODIN_SYM2_WORK.workNumber,
    BORODIN_SYM2_WORK.workTitleShort,
    BORODIN_SYM2_WORK.composerTag,
  );
}

console.log(dryRun ? "=== DRY RUN ===" : "=== APLICANDO ===");
console.log(workDir);

for (const item of BORODIN_SYM2_WORK.wholes) {
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
    console.log(`  [RENAME] ${item.instrument} ← ${item.pdf.slice(0, 50)}`);
    continue;
  }
  renameSync(src, dest);
  console.log(`  ${item.instrument}`);
}

console.log("Listo");
