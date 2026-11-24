/**
 * Renombra particellas Kalinnikov Serenata a nombres canónicos OFRN (wholes).
 */
import { existsSync, renameSync } from "fs";
import { join } from "path";
import { canonicalPartFilename } from "./lib/pdfPartsRenaming.mjs";
import {
  KALINNIKOV_SERENATA_WORK,
  PARA_ACOMODAR_ROOT,
} from "./lib/kalinnikovSerenataCatalog.mjs";

const dryRun = process.argv.includes("--dry-run");
const workDir = join(
  PARA_ACOMODAR_ROOT,
  KALINNIKOV_SERENATA_WORK.targetFolder,
);

if (!existsSync(workDir)) {
  throw new Error(`No se encuentra carpeta: ${workDir}`);
}

console.log(dryRun ? "=== DRY RUN ===" : "=== APLICANDO ===");
console.log(workDir);

for (const item of KALINNIKOV_SERENATA_WORK.wholes) {
  const src = join(workDir, item.pdf);
  const destName = canonicalPartFilename(
    item.instrument,
    KALINNIKOV_SERENATA_WORK.workNumber,
    KALINNIKOV_SERENATA_WORK.workTitleShort,
    KALINNIKOV_SERENATA_WORK.composerTag,
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
  if (existsSync(dest) && dest !== src) {
    throw new Error(`Ya existe destino: ${destName}`);
  }
  renameSync(src, dest);
  console.log(`  ${item.instrument} → ${destName}`);
}

console.log("Listo");
