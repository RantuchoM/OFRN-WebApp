/**
 * Copia ya hecha en Para acomodar: rename canónico de las 4 obras
 * (Christmas Lullaby, Estonian Lullaby, Vater unser, Messiah).
 * Sin split/crop (PDFs ya por instrumento, música en p.1).
 *
 *   node scripts/process-orquesta-particellas-local.mjs --dry-run
 *   node scripts/process-orquesta-particellas-local.mjs
 */
import { existsSync, readdirSync, renameSync } from "fs";
import { join } from "path";
import { canonicalPartFilename } from "./lib/pdfPartsRenaming.mjs";
import {
  ORQUESTA_PARTICELLAS_WORKS,
  PARA_ACOMODAR_ROOT,
} from "./lib/orquestaParticellasCatalog.mjs";

const dryRun = process.argv.includes("--dry-run");

function foldName(s) {
  return String(s || "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function resolveWorkDir(work) {
  const target = join(PARA_ACOMODAR_ROOT, work.targetFolder);
  if (existsSync(target)) return target;
  if (!existsSync(PARA_ACOMODAR_ROOT)) return null;
  const needle = foldName(work.targetFolder);
  const hit = readdirSync(PARA_ACOMODAR_ROOT, { withFileTypes: true })
    .filter((d) => d.isDirectory() && foldName(d.name) === needle)
    .map((d) => d.name)[0];
  return hit ? join(PARA_ACOMODAR_ROOT, hit) : null;
}

function findPdf(dir, item, used) {
  const pdfs = readdirSync(dir).filter((f) => /\.pdf$/i.test(f));
  const re = new RegExp(item.re, "i");
  const hits = pdfs.filter((f) => {
    if (used.has(foldName(f))) return false;
    return re.test(foldName(f));
  });
  return hits[0] || null;
}

function processWork(work) {
  const workDir = resolveWorkDir(work);
  console.log(`\n=== ${work.targetFolder} ===`);
  if (!workDir) {
    console.error("  No se encuentra carpeta local");
    return { missing: work.renames.length, renamed: 0, pdfs: 0 };
  }
  console.log(`  ${workDir}`);

  const used = new Set();
  let renamed = 0;
  let missing = 0;

  for (const item of work.renames) {
    const targetName = canonicalPartFilename(
      item.instrument,
      work.workNumber,
      work.titulo,
      work.composerTag,
    );
    const dst = join(workDir, targetName);
    if (existsSync(dst)) {
      console.log(`  OK: ${targetName}`);
      used.add(foldName(targetName));
      const already = readdirSync(workDir).find(
        (f) => foldName(f) === foldName(targetName),
      );
      if (already) used.add(foldName(already));
      continue;
    }
    const found = findPdf(workDir, item, used);
    if (!found) {
      console.warn(`  Omitido (${item.instrument}): /${item.re}/`);
      missing += 1;
      continue;
    }
    used.add(foldName(found));
    if (foldName(found) === foldName(targetName)) {
      console.log(`  OK: ${targetName}`);
      continue;
    }
    if (dryRun) {
      console.log(`  ${found} → ${targetName}`);
      renamed += 1;
      continue;
    }
    renameSync(join(workDir, found), dst);
    used.add(foldName(targetName));
    console.log(`  ${found} → ${targetName}`);
    renamed += 1;
  }

  const leftover = readdirSync(workDir).filter(
    (f) => /\.pdf$/i.test(f) && !used.has(foldName(f)),
  );
  for (const extra of leftover) {
    console.warn(`  Sin mapa: ${extra}`);
  }

  const pdfs = readdirSync(workDir).filter((f) => /\.pdf$/i.test(f));
  console.log(`  PDFs: ${pdfs.length} | renombrados=${renamed} omitidos=${missing}`);
  return { missing, renamed, pdfs: pdfs.length };
}

console.log(dryRun ? "=== DRY RUN ===" : "=== APLICANDO ===");
console.log("Omitido: Suite Rutter");

let failed = 0;
for (const work of ORQUESTA_PARTICELLAS_WORKS) {
  const result = processWork(work);
  failed += result.missing;
}

if (failed) {
  console.error(`\nCompletado con ${failed} omisiones.`);
  process.exitCode = 1;
} else {
  console.log("\nTodas las obras renombradas.");
}
