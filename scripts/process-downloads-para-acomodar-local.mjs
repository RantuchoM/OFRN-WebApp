/**
 * Copia y renombra las 4 obras de Downloads/Para acomodar → Drive File Stream.
 *
 *   node scripts/process-downloads-para-acomodar-local.mjs --dry-run
 *   node scripts/process-downloads-para-acomodar-local.mjs
 */
import { existsSync } from "fs";
import { join } from "path";
import {
  BERNSTEIN_CANDIDE_WORK,
  DOWNLOADS_PARA_ACOMODAR as CANDIDE_DL,
  PARA_ACOMODAR_ROOT as CANDIDE_ROOT,
} from "./lib/bernsteinCandideCatalog.mjs";
import {
  findSourceDir,
  processWork,
} from "./lib/processParaAcomodarWork.mjs";
import {
  PROKOFIEV_ROMEO_WORKS,
  DOWNLOADS_PARA_ACOMODAR as ROMEO_DL,
  PARA_ACOMODAR_ROOT as ROMEO_ROOT,
} from "./lib/prokofievRomeoCatalog.mjs";
import {
  ROSSINI_BARBERO_WORK,
  DOWNLOADS_PARA_ACOMODAR as BARBERO_DL,
  PARA_ACOMODAR_ROOT as BARBERO_ROOT,
} from "./lib/rossiniBarberoCatalog.mjs";

const dryRun = process.argv.includes("--dry-run");
const downloadsRoot = CANDIDE_DL || ROMEO_DL || BARBERO_DL;
const paraRoot = CANDIDE_ROOT || ROMEO_ROOT || BARBERO_ROOT;

const works = [
  BERNSTEIN_CANDIDE_WORK,
  ROSSINI_BARBERO_WORK,
  ...PROKOFIEV_ROMEO_WORKS,
];

console.log(dryRun ? "=== DRY RUN ===" : "=== APLICANDO ===");
console.log(`Downloads: ${downloadsRoot}`);
console.log(`Para acomodar: ${paraRoot}`);
if (!existsSync(downloadsRoot)) {
  throw new Error(`No existe ${downloadsRoot}`);
}
if (!existsSync(paraRoot)) {
  throw new Error(`No existe ${paraRoot}`);
}

let failed = 0;
for (const work of works) {
  const sourceDir = findSourceDir(downloadsRoot, work.sourceMatch);
  const targetDir = join(paraRoot, work.targetFolder);
  try {
    const result = processWork({ work, sourceDir, targetDir, dryRun });
    if (result.missing) failed += result.missing;
  } catch (e) {
    console.error(`  ERROR ${work.targetFolder}:`, e.message);
    failed += 1;
  }
}

if (failed) {
  console.error(`\nCompletado con ${failed} omisiones.`);
  process.exitCode = 1;
} else {
  console.log("\nTodas las obras copiadas/renombradas.");
}
