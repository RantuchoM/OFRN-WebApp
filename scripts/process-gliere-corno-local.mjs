/**
 * Deja el manuscrito IMSLP en la carpeta de la obra y mueve Mitteldorf/Maximov
 * a «Versión alternativa». No recorta: la página 1 del manuscrito ya es música.
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync } from "fs";
import { join } from "path";
import { canonicalPartFilename, extractInstrumentFromExistingName } from "./lib/pdfPartsRenaming.mjs";
import {
  ALTERNATE_FOLDER_NAME,
  GLIERE_CORNO_DOWNLOADS,
  GLIERE_CORNO_WORK,
  PARA_ACOMODAR_ROOT,
} from "./lib/gliereCornoCatalog.mjs";

const dryRun = process.argv.includes("--dry-run");
const workDir = join(PARA_ACOMODAR_ROOT, GLIERE_CORNO_WORK.targetFolder);
const altDir = join(workDir, ALTERNATE_FOLDER_NAME);

function fold(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function targetName(instrument) {
  return canonicalPartFilename(
    instrument,
    GLIERE_CORNO_WORK.workNumber,
    GLIERE_CORNO_WORK.titulo,
    GLIERE_CORNO_WORK.composerTag,
  );
}

function findSource(pdf) {
  const candidates = [
    join(GLIERE_CORNO_DOWNLOADS, "manuscrito", pdf),
    join(GLIERE_CORNO_DOWNLOADS, pdf),
  ];
  return candidates.find((path) => existsSync(path)) || null;
}

const moveSet = new Set(GLIERE_CORNO_WORK.alternativa.map(fold));

if (!dryRun) {
  mkdirSync(workDir, { recursive: true });
  mkdirSync(altDir, { recursive: true });
}
console.log(dryRun ? "=== DRY RUN ===" : "=== APLICANDO ===");
console.log(workDir);

if (existsSync(workDir)) {
  for (const name of readdirSync(workDir)) {
    if (!/\.pdf$/i.test(name)) continue;
    const instrument = extractInstrumentFromExistingName(name);
    if (!moveSet.has(fold(instrument))) continue;
    const dest = join(altDir, name);
    if (existsSync(dest)) throw new Error(`Ya está en Versión alternativa: ${name}`);
    if (dryRun) {
      console.log(`  [MOVE] ${instrument}`);
      continue;
    }
    renameSync(join(workDir, name), dest);
    console.log(`  → alternativa: ${instrument}`);
  }
}

for (const item of GLIERE_CORNO_WORK.wholes) {
  const src = findSource(item.pdf);
  const dest = join(workDir, targetName(item.instrument));
  if (!src) throw new Error(`Falta ${item.pdf}`);
  if (dryRun) {
    console.log(`  [COPY] ${item.instrument}`);
    continue;
  }
  copyFileSync(src, dest);
  const header = readFileSync(dest).subarray(0, 5).toString("latin1");
  if (header !== "%PDF-" || readFileSync(dest).length < 1000) {
    throw new Error(`PDF inválido: ${dest}`);
  }
  console.log(`  ${item.instrument}`);
}

console.log("Listo");
