/**
 * Renombra carpeta y PDFs — Mendelssohn Sinfonía para cuerdas Nro 1 (sin split/crop).
 */
import { existsSync, readdirSync, renameSync } from "fs";
import { join } from "path";
import {
  canonicalPartFilename,
  renameFolderIfNeeded,
} from "./lib/pdfPartsRenaming.mjs";
import {
  MENDELSSOHN_STRING_SYM1_WORK,
  PARA_ACOMODAR_ROOT,
} from "./lib/mendelssohnStringSym1Catalog.mjs";

const dryRun = process.argv.includes("--dry-run");

function resolveWorkDir() {
  const target = join(PARA_ACOMODAR_ROOT, MENDELSSOHN_STRING_SYM1_WORK.targetFolder);
  if (existsSync(target)) return target;
  const src = join(PARA_ACOMODAR_ROOT, MENDELSSOHN_STRING_SYM1_WORK.sourceFolder);
  if (existsSync(src)) {
    if (!dryRun) {
      renameFolderIfNeeded(
        PARA_ACOMODAR_ROOT,
        MENDELSSOHN_STRING_SYM1_WORK.sourceFolder,
        MENDELSSOHN_STRING_SYM1_WORK.targetFolder,
        false,
      );
      return target;
    }
    return src;
  }
  throw new Error("No se encuentra carpeta Nueva carpeta en Para acomodar");
}

const workDir = resolveWorkDir();
const meta = {
  workNumber: MENDELSSOHN_STRING_SYM1_WORK.workNumber,
  workTitle: MENDELSSOHN_STRING_SYM1_WORK.titulo,
  composerTag: MENDELSSOHN_STRING_SYM1_WORK.composerTag,
};

console.log(`Para acomodar / Mendelssohn Str. Sym. 1: ${workDir}`);
console.log(dryRun ? "=== DRY RUN ===" : "=== APLICANDO ===");

for (const item of MENDELSSOHN_STRING_SYM1_WORK.renames) {
  const src = join(workDir, item.pdf);
  const targetName = canonicalPartFilename(
    item.instrument,
    meta.workNumber,
    meta.workTitle,
    meta.composerTag,
  );
  const dst = join(workDir, targetName);
  if (!existsSync(src)) {
    if (existsSync(dst)) {
      console.log(`  OK: ${targetName}`);
      continue;
    }
    console.warn(`  Omitido (no existe): ${item.pdf}`);
    continue;
  }
  if (dryRun) {
    console.log(`  ${item.pdf} → ${targetName}`);
  } else {
    renameSync(src, dst);
    console.log(`  ${item.pdf} → ${targetName}`);
  }
}

const pdfs = existsSync(workDir)
  ? readdirSync(workDir).filter((f) => /\.pdf$/i.test(f))
  : [];
console.log(`\nListo. ${pdfs.length} PDFs en carpeta.`);
