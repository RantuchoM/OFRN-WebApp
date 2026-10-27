/**
 * Rename canónico Hammersmith (carpeta ORQUESTA «para orquesta»).
 * PDFs ya separados; sin split/crop.
 *
 *   node scripts/process-hammersmith-orquesta-local.mjs --dry-run
 *   node scripts/process-hammersmith-orquesta-local.mjs
 */
import { existsSync } from "fs";
import {
  HAMMERSMITH_ORQUESTA_ROOT,
  HAMMERSMITH_ORQUESTA_WORK,
} from "./lib/hammersmithOrquestaCatalog.mjs";
import { processWorkInPlace } from "./lib/processParaAcomodarWork.mjs";

const dryRun = process.argv.includes("--dry-run");
const work = HAMMERSMITH_ORQUESTA_WORK;
const workDir = HAMMERSMITH_ORQUESTA_ROOT;

console.log(dryRun ? "=== DRY RUN ===" : "=== APLICANDO ===");
console.log(`Carpeta: ${workDir}`);

if (!existsSync(workDir)) {
  throw new Error(`No existe: ${workDir}`);
}

const result = processWorkInPlace({ work, workDir, dryRun });
if (result.missing) {
  console.error(`\nOmitidos: ${result.missing}`);
  process.exitCode = 1;
} else {
  console.log("\nHammersmith renombrado.");
}
