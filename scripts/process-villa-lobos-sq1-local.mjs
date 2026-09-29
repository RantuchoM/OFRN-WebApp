/**
 * Copia partes y SCORE del Cuarteto Nro. 1 de Villa-Lobos a Para acomodar.
 * Typeset y score Southern: página 1 ya es música, sin split/crop.
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync } from "fs";
import { join } from "path";
import { canonicalPartFilename } from "./lib/pdfPartsRenaming.mjs";
import {
  PARA_ACOMODAR_ROOT,
  VILLA_LOBOS_SQ1_DOWNLOADS,
  VILLA_LOBOS_SQ1_WORK,
} from "./lib/villaLobosSq1Catalog.mjs";

const dryRun = process.argv.includes("--dry-run");
const work = VILLA_LOBOS_SQ1_WORK;
const workDir = join(PARA_ACOMODAR_ROOT, work.targetFolder);

function findSource(fileId) {
  if (!existsSync(VILLA_LOBOS_SQ1_DOWNLOADS)) return null;
  const hits = readdirSync(VILLA_LOBOS_SQ1_DOWNLOADS).filter((name) => {
    if (!/\.pdf$/i.test(name)) return false;
    return new RegExp(`IMSLP${fileId}\\b|${fileId}`, "i").test(name);
  });
  const pdfs = hits.filter((name) => {
    const path = join(VILLA_LOBOS_SQ1_DOWNLOADS, name);
    const header = readFileSync(path).subarray(0, 5).toString("latin1");
    return header === "%PDF-";
  });
  return pdfs[0] ? join(VILLA_LOBOS_SQ1_DOWNLOADS, pdfs[0]) : null;
}

function targetName(instrument) {
  return canonicalPartFilename(
    instrument,
    work.workNumber,
    work.titulo,
    work.composerTag,
  );
}

if (!dryRun) mkdirSync(workDir, { recursive: true });
console.log(dryRun ? "=== DRY RUN ===" : "=== APLICANDO ===");
console.log(workDir);

for (const item of work.wholes) {
  const destName = targetName(item.instrument);
  const dest = join(workDir, destName);
  if (existsSync(dest) && item.instrument !== "SCORE") {
    console.log(`  OK ${item.instrument} (ya canónico)`);
    continue;
  }
  const src = findSource(item.id);
  if (!src) throw new Error(`Falta IMSLP #${item.id} (${item.instrument})`);
  if (dryRun) {
    console.log(`  [COPY] ${item.instrument} ← ${src}`);
    continue;
  }
  copyFileSync(src, dest);
  const buf = readFileSync(dest);
  if (buf.subarray(0, 5).toString("latin1") !== "%PDF-" || buf.length < 1000) {
    throw new Error(`PDF inválido: ${destName}`);
  }
  console.log(`  ${item.instrument}  ${buf.length}  ${destName}`);
}

if (!dryRun) {
  const pdfs = readdirSync(workDir).filter((name) => /\.pdf$/i.test(name));
  console.log(`\nListo. ${pdfs.length} PDFs en carpeta.`);
}
