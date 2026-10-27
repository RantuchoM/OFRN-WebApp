/**
 * Copia + rename canónico Leng La muerte de Alsino → Para acomodar.
 * PDFs ya separados (RAR); sin split/crop.
 *
 *   node scripts/process-leng-alsino-local.mjs --dry-run
 *   node scripts/process-leng-alsino-local.mjs
 */
import { existsSync } from "fs";
import { join } from "path";
import {
  LENG_ALSINO_SOURCE_DIR,
  LENG_ALSINO_WORK,
  PARA_ACOMODAR_ROOT,
} from "./lib/lengAlsinoCatalog.mjs";
import { processWork } from "./lib/processParaAcomodarWork.mjs";

const dryRun = process.argv.includes("--dry-run");
const work = LENG_ALSINO_WORK;
const sourceDir = LENG_ALSINO_SOURCE_DIR;
const targetDir = join(PARA_ACOMODAR_ROOT, work.targetFolder);

console.log(dryRun ? "=== DRY RUN ===" : "=== APLICANDO ===");
console.log(`Fuente: ${sourceDir}`);
console.log(`Destino: ${targetDir}`);

if (!existsSync(sourceDir)) {
  throw new Error(`No existe fuente: ${sourceDir}`);
}
if (!existsSync(PARA_ACOMODAR_ROOT)) {
  throw new Error(`No existe Para acomodar: ${PARA_ACOMODAR_ROOT}`);
}

const result = processWork({ work, sourceDir, targetDir, dryRun });
if (result.missing) {
  console.error(`\nOmitidos: ${result.missing}`);
  process.exitCode = 1;
} else {
  console.log("\nLeng Alsino listo en Para acomodar.");
}
