/**
 * Rename particellas Schubert Rosamunda Entreacto Nro. 3 a nombres canónicos OFRN.
 */
import { existsSync, renameSync } from "fs";
import { join } from "path";
import { canonicalPartFilename } from "./lib/pdfPartsRenaming.mjs";
import {
  PARA_ACOMODAR_ROOT,
  SCHUBERT_ROSAMUNDA_E3_WORK,
} from "./lib/schubertRosamundaE3Catalog.mjs";

const dryRun = process.argv.includes("--dry-run");
const workDir = join(PARA_ACOMODAR_ROOT, SCHUBERT_ROSAMUNDA_E3_WORK.targetFolder);
if (!existsSync(workDir)) throw new Error(`No se encuentra: ${workDir}`);

function targetName(instrument) {
  return canonicalPartFilename(
    instrument,
    SCHUBERT_ROSAMUNDA_E3_WORK.workNumber,
    SCHUBERT_ROSAMUNDA_E3_WORK.workTitleShort,
    SCHUBERT_ROSAMUNDA_E3_WORK.composerTag,
  );
}

console.log(dryRun ? "=== DRY RUN ===" : "=== APLICANDO ===");
console.log(workDir);

for (const item of SCHUBERT_ROSAMUNDA_E3_WORK.wholes) {
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
