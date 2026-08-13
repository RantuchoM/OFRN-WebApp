/**
 * Copia Larks desde Downloads a Para acomodar y renombra particellas canónicas.
 * PDFs ya separados (sin split/crop). Combinados: Corno F 1y2 / 3y4.
 */
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  renameSync,
} from "fs";
import { join } from "path";
import { canonicalPartFilename } from "./lib/pdfPartsRenaming.mjs";
import {
  LARKS_SOURCE_DEFAULT,
  LARKS_WORK,
  PARA_ACOMODAR_ROOT,
} from "./lib/larksCatalog.mjs";

const dryRun = process.argv.includes("--dry-run");

function foldName(s) {
  return String(s || "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function findLocalPdf(dir, wantedName) {
  if (!existsSync(dir)) return null;
  const pdfs = readdirSync(dir).filter((f) => /\.pdf$/i.test(f));
  const want = foldName(wantedName);
  const exact = pdfs.find((f) => foldName(f) === want);
  if (exact) return exact;
  const wantNoExt = want.replace(/\.pdf$/i, "");
  return (
    pdfs.find((f) => foldName(f).replace(/\.pdf$/i, "") === wantNoExt) || null
  );
}

function resolveSourceDir() {
  if (existsSync(LARKS_SOURCE_DEFAULT)) return LARKS_SOURCE_DEFAULT;
  const paraSrc = join(PARA_ACOMODAR_ROOT, LARKS_WORK.sourceFolder);
  if (existsSync(paraSrc)) return paraSrc;
  const hit = existsSync(PARA_ACOMODAR_ROOT)
    ? readdirSync(PARA_ACOMODAR_ROOT, { withFileTypes: true })
        .filter((d) => d.isDirectory() && /larks/i.test(d.name))
        .map((d) => join(PARA_ACOMODAR_ROOT, d.name))[0]
    : null;
  if (hit) return hit;
  throw new Error(
    `No se encuentra fuente Larks (${LARKS_SOURCE_DEFAULT} ni Para acomodar)`,
  );
}

function copySourceToTarget(sourceDir, targetDir) {
  if (!existsSync(targetDir)) {
    if (dryRun) {
      console.log(`  [MKDIR] ${targetDir}`);
    } else {
      mkdirSync(targetDir, { recursive: true });
    }
  }
  const pdfs = readdirSync(sourceDir).filter((f) => /\.pdf$/i.test(f));
  for (const pdf of pdfs) {
    const dst = join(targetDir, pdf);
    if (existsSync(dst)) {
      console.log(`  OK (ya copiado): ${pdf}`);
      continue;
    }
    if (dryRun) {
      console.log(`  [COPY] ${pdf}`);
      continue;
    }
    copyFileSync(join(sourceDir, pdf), dst);
    console.log(`  Copiado: ${pdf}`);
  }
}

const sourceDir = resolveSourceDir();
const targetDir = join(PARA_ACOMODAR_ROOT, LARKS_WORK.targetFolder);
const sourceIsTarget =
  foldName(sourceDir) === foldName(targetDir) ||
  foldName(sourceDir.split(/[/\\]/).pop()) === foldName(LARKS_WORK.targetFolder);

console.log(`Fuente: ${sourceDir}`);
console.log(`Destino Para acomodar: ${targetDir}`);
console.log(dryRun ? "=== DRY RUN ===" : "=== APLICANDO ===");

if (!sourceIsTarget) {
  console.log("\n--- Copiar a Para acomodar ---");
  copySourceToTarget(sourceDir, targetDir);
}

const renameDir =
  sourceIsTarget || existsSync(targetDir) ? (existsSync(targetDir) ? targetDir : sourceDir) : sourceDir;

const meta = {
  workNumber: LARKS_WORK.workNumber,
  workTitle: LARKS_WORK.titulo,
  composerTag: LARKS_WORK.composerTag,
};

console.log(`\n--- Renombrar canónicamente (${renameDir}) ---`);
let renamed = 0;
let missing = 0;
for (const item of LARKS_WORK.renames) {
  const found = findLocalPdf(renameDir, item.pdf);
  const targetName = canonicalPartFilename(
    item.instrument,
    meta.workNumber,
    meta.workTitle,
    meta.composerTag,
  );
  const dst = join(renameDir, targetName);
  if (!found) {
    if (existsSync(dst)) {
      console.log(`  OK: ${targetName}`);
      continue;
    }
    console.warn(`  Omitido (no existe): ${item.pdf}`);
    missing += 1;
    continue;
  }
  if (foldName(found) === foldName(targetName)) {
    console.log(`  OK: ${targetName}`);
    continue;
  }
  if (dryRun) {
    console.log(`  ${found} → ${targetName}`);
    renamed += 1;
    continue;
  }
  if (existsSync(dst)) {
    console.warn(`  Colisión omitida: ${found} → ${targetName}`);
    continue;
  }
  renameSync(join(renameDir, found), dst);
  console.log(`  ${found} → ${targetName}`);
  renamed += 1;
}

const pdfs = existsSync(renameDir)
  ? readdirSync(renameDir).filter((f) => /\.pdf$/i.test(f))
  : [];
console.log(
  `\nListo. ${pdfs.length} PDFs | renames=${renamed} omitidos=${missing}`,
);
