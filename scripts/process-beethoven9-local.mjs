/**
 * Rename Beethoven 9 (Ottaviano + Feduol cuerdas + coro + SCORE) a canónicos OFRN.
 * Elimina PDFs Feduol combinados de vientos/metales (reemplazados por Ottaviano).
 */
import { existsSync, renameSync, unlinkSync } from "fs";
import { join } from "path";
import { canonicalPartFilename } from "./lib/pdfPartsRenaming.mjs";
import {
  BEETHOVEN_9_WORK,
  PARA_ACOMODAR_ROOT,
} from "./lib/beethoven9Catalog.mjs";

const dryRun = process.argv.includes("--dry-run");
const workDir = join(PARA_ACOMODAR_ROOT, BEETHOVEN_9_WORK.targetFolder);
if (!existsSync(workDir)) throw new Error(`No se encuentra: ${workDir}`);

function targetName(instrument) {
  return canonicalPartFilename(
    instrument,
    BEETHOVEN_9_WORK.workNumber,
    BEETHOVEN_9_WORK.workTitleShort,
    BEETHOVEN_9_WORK.composerTag,
  );
}

console.log(dryRun ? "=== DRY RUN ===" : "=== APLICANDO ===");
console.log(workDir);

for (const item of BEETHOVEN_9_WORK.wholes) {
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
    console.log(`  [RENAME] ${item.instrument} ← ${item.pdf.slice(0, 55)}`);
    continue;
  }
  if (existsSync(dest) && dest !== src) unlinkSync(dest);
  renameSync(src, dest);
  console.log(`  ${item.instrument}`);
}

for (const name of BEETHOVEN_9_WORK.removePdfs || []) {
  const p = join(workDir, name);
  if (!existsSync(p)) continue;
  if (dryRun) {
    console.log(`  [DEL] ${name}`);
    continue;
  }
  unlinkSync(p);
  console.log(`  del ${name}`);
}

console.log("Listo");
