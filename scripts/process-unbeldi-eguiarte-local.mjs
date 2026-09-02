/**
 * Renombra particellas Un bel di vedremo [recorte Eguiarte] en ARIAS (sync local).
 */
import { existsSync, readdirSync, renameSync, unlinkSync } from "fs";
import { join } from "path";
import { canonicalPartFilename } from "./lib/pdfPartsRenaming.mjs";
import {
  LOCAL_ARIAS,
  UNBELDI_EGUIARTE_WORK,
} from "./lib/unbeldiEguiarteCatalog.mjs";

const dryRun = process.argv.includes("--dry-run");
const work = UNBELDI_EGUIARTE_WORK;
const workDir = join(LOCAL_ARIAS, work.targetFolder);

if (!existsSync(workDir)) {
  console.error("No existe carpeta:", workDir);
  process.exit(1);
}

console.log(dryRun ? "=== DRY RUN ===" : "=== APLICANDO ===");
console.log(workDir);

const onDisk = new Set(readdirSync(workDir));
const usedTargets = new Set();

for (const [from, instrument] of Object.entries(work.renameMap)) {
  if (!onDisk.has(from)) {
    console.warn(`  FALTA origen: ${from}`);
    continue;
  }
  let target = canonicalPartFilename(
    instrument,
    work.workNumber,
    work.titulo,
    work.composerTag,
  );
  if (usedTargets.has(target.toLowerCase())) {
    target = canonicalPartFilename(
      `${instrument} bis`,
      work.workNumber,
      work.titulo,
      work.composerTag,
    );
  }
  usedTargets.add(target.toLowerCase());

  if (from === target) {
    console.log(`  OK: ${target}`);
    continue;
  }
  const dst = join(workDir, target);
  if (existsSync(dst) && from !== target) {
    console.warn(`  SKIP colisión: ${from} → ${target}`);
    continue;
  }
  console.log(`  ${from}`);
  console.log(`    → ${target}`);
  if (!dryRun) renameSync(join(workDir, from), dst);
}

for (const junk of work.deleteFiles || []) {
  const p = join(workDir, junk);
  if (!existsSync(p)) continue;
  console.log(`  DELETE: ${junk}`);
  if (!dryRun) unlinkSync(p);
}

const stillOld = readdirSync(workDir).filter(
  (f) =>
    (/\.pdf$/i.test(f) || /\.lnk$/i.test(f)) &&
    !f.includes(work.titulo),
);
if (stillOld.length) {
  console.log("\nQuedan sin renombrar:");
  stillOld.forEach((f) => console.log(" ", f));
} else {
  console.log("\nTodos los PDFs en formato canónico.");
}

console.log("Listo.");
