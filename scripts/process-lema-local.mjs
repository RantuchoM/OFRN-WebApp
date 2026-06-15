/**
 * Renombra solo carpetas en LEMA — Acomodar (local sync). No toca PDFs.
 */
import { existsSync, readdirSync } from "fs";
import { join } from "path";
import { renameFolderIfNeeded } from "./lib/pdfPartsRenaming.mjs";
import { LEMA_WORKS, LOCAL_LEMA } from "./lib/lemaCatalog.mjs";

function findSourceDir(sourceFolder) {
  if (!existsSync(LOCAL_LEMA)) return null;
  const exact = join(LOCAL_LEMA, sourceFolder);
  if (existsSync(exact)) return exact;
  const dirs = readdirSync(LOCAL_LEMA, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
  const norm = (s) => s.replace(/\s+/g, " ").trim().toLowerCase();
  const hit = dirs.find((d) => norm(d) === norm(sourceFolder));
  return hit ? join(LOCAL_LEMA, hit) : null;
}

function resolveWorkDir(work, dryRun) {
  if (work.sourceFolder === work.targetFolder) {
    return findSourceDir(work.sourceFolder);
  }
  const src = findSourceDir(work.sourceFolder);
  if (!src) return null;
  const srcName = src.split(/[/\\]/).pop();
  if (!dryRun) {
    renameFolderIfNeeded(LOCAL_LEMA, srcName, work.targetFolder, false);
  }
  return join(LOCAL_LEMA, work.targetFolder);
}

const dryRun = process.argv.includes("--dry-run");
console.log(`LEMA local: ${LOCAL_LEMA}`);
console.log(dryRun ? "=== DRY RUN ===" : "=== APLICANDO ===");

let renamed = 0;
let skipped = 0;

for (const work of LEMA_WORKS) {
  if (work.sourceFolder === work.targetFolder) {
    const dir = findSourceDir(work.sourceFolder);
    if (dir) {
      console.log(`OK (sin cambio): ${work.targetFolder}`);
    } else {
      console.warn("Omitida (no existe):", work.sourceFolder);
      skipped++;
    }
    continue;
  }

  const src = findSourceDir(work.sourceFolder);
  if (!src) {
    console.warn("Omitida (no existe):", work.sourceFolder);
    skipped++;
    continue;
  }

  const srcName = src.split(/[/\\]/).pop();
  if (dryRun) {
    console.log(`  ${srcName} → ${work.targetFolder}`);
    renamed++;
    continue;
  }

  try {
    const result = renameFolderIfNeeded(
      LOCAL_LEMA,
      srcName,
      work.targetFolder,
      false,
    );
    if (result) {
      console.log(`  ${result.from} → ${result.to}`);
      renamed++;
    }
  } catch (err) {
    if (existsSync(join(LOCAL_LEMA, work.targetFolder))) {
      console.log(`OK (ya renombrada): ${work.targetFolder}`);
    } else {
      console.error("Error:", work.sourceFolder, err.message);
      skipped++;
    }
  }
}

console.log(`\nListo. Renombradas: ${renamed}, omitidas: ${skipped}`);
