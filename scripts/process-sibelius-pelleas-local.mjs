/**
 * Split + rename Sibelius Pelléas et Mélisande Op. 46.
 */
import { execSync } from "child_process";
import { existsSync, renameSync, unlinkSync, writeFileSync } from "fs";
import { join } from "path";
import { canonicalPartFilename } from "./lib/pdfPartsRenaming.mjs";
import {
  PARA_ACOMODAR_ROOT,
  SIBELIUS_PELLEAS_WORK,
} from "./lib/sibeliusPelleasCatalog.mjs";

const SPLIT_SCRIPT =
  process.env.SPLIT_PARTS_SCRIPT ||
  "c:\\Users\\marti\\Downloads\\Cursor - Proyectos\\scripts\\split_and_rename_parts.py";

const dryRun = process.argv.includes("--dry-run");
const work = SIBELIUS_PELLEAS_WORK;
const workDir = join(PARA_ACOMODAR_ROOT, work.targetFolder);
if (!existsSync(workDir)) throw new Error(`No se encuentra: ${workDir}`);

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

for (const split of work.splits) {
  const pdfPath = join(workDir, split.pdf);
  if (!existsSync(pdfPath)) throw new Error(`Falta ${split.pdf}`);
  if (dryRun) {
    console.log(`  [SPLIT] ${split.pdf}`);
    for (const p of split.parts) console.log(`    ${p.instrument} ${p.start}-${p.end}`);
    continue;
  }
  const manifestPath = join(workDir, `${split.pdf}.manifest.json`);
  writeFileSync(manifestPath, JSON.stringify({ parts: split.parts }, null, 2));
  execSync(
    `python "${SPLIT_SCRIPT}" --work-dir "${workDir}" --input "${pdfPath}" --manifest "${manifestPath}" --split-only`,
    { stdio: "inherit" },
  );
  unlinkSync(pdfPath);
  unlinkSync(manifestPath);
  for (const p of split.parts) {
    const raw = [
      join(workDir, `${p.instrument} - raw split.pdf`),
      join(workDir, `${p.instrument}.pdf`),
    ].find((c) => existsSync(c));
    if (!raw) throw new Error(`Sin salida: ${p.instrument}`);
    renameSync(raw, join(workDir, targetName(p.instrument)));
    console.log(`  split ${p.instrument}`);
  }
}

for (const item of work.wholes) {
  const src = join(workDir, item.pdf);
  const dest = join(workDir, targetName(item.instrument));
  if (!existsSync(src)) {
    if (existsSync(dest)) {
      console.log(`  ok ${item.instrument}`);
      continue;
    }
    throw new Error(`Falta ${item.pdf}`);
  }
  if (dryRun) {
    console.log(`  [RENAME] ${item.instrument}`);
    continue;
  }
  if (existsSync(dest) && dest !== src) unlinkSync(dest);
  renameSync(src, dest);
  console.log(`  ${item.instrument}`);
}

console.log("Listo");
