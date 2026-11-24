/**
 * Renombra PDFs + carpeta del Concierto triple Op.56 (archivo 2458).
 */
import { existsSync, renameSync, readdirSync } from "fs";
import { join } from "path";
import { canonicalPartFilename } from "./lib/pdfPartsRenaming.mjs";
import {
  ARCHIVO_ORQUESTA_ROOT,
  BEETHOVEN_TRIPLE_WORK,
} from "./lib/beethovenTripleCatalog.mjs";

const dryRun = process.argv.includes("--dry-run");
const work = BEETHOVEN_TRIPLE_WORK;

let workDir = join(ARCHIVO_ORQUESTA_ROOT, work.sourceFolder);
if (!existsSync(workDir)) {
  const alt = join(ARCHIVO_ORQUESTA_ROOT, work.targetFolder);
  if (existsSync(alt)) workDir = alt;
  else throw new Error(`No se encuentra: ${work.sourceFolder}`);
}

function targetName(instrument) {
  return canonicalPartFilename(
    instrument,
    work.workNumber,
    work.workTitleShort,
    work.composerTag,
  );
}

console.log(dryRun ? "=== DRY RUN ===" : "=== APLICANDO ===");
console.log(workDir);

const pdfs = readdirSync(workDir).filter((f) => /\.pdf$/i.test(f));
for (const file of pdfs) {
  const rule = work.renames.find((r) => r.from.test(file));
  if (!rule) {
    console.warn(`  skip (sin regla): ${file}`);
    continue;
  }
  const dest = targetName(rule.instrument);
  if (file === dest) {
    console.log(`  ok ${rule.instrument}`);
    continue;
  }
  if (dryRun) {
    console.log(`  [RENAME] ${rule.instrument}\n    ← ${file}\n    → ${dest}`);
    continue;
  }
  const srcPath = join(workDir, file);
  const destPath = join(workDir, dest);
  if (existsSync(destPath) && destPath !== srcPath) {
    throw new Error(`Colisión: ${dest}`);
  }
  renameSync(srcPath, destPath);
  console.log(`  ${rule.instrument}`);
}

const parent = ARCHIVO_ORQUESTA_ROOT;
const currentName = workDir.split(/[/\\]/).pop();
if (currentName !== work.targetFolder) {
  const destDir = join(parent, work.targetFolder);
  if (dryRun) {
    console.log(`  [FOLDER] ${currentName} → ${work.targetFolder}`);
  } else if (!existsSync(destDir)) {
    renameSync(workDir, destDir);
    console.log(`  folder → ${work.targetFolder}`);
  } else {
    console.warn(`  folder destino ya existe: ${work.targetFolder}`);
  }
}

console.log("Listo");
