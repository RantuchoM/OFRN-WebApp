/**
 * Split + rename Paganini Concierto Op.6 (Generoso D major).
 */
import { execSync } from "child_process";
import { existsSync, renameSync, unlinkSync, writeFileSync } from "fs";
import { join } from "path";
import { canonicalPartFilename } from "./lib/pdfPartsRenaming.mjs";
import {
  PAGANINI_OP6_WORK,
  PARA_ACOMODAR_ROOT,
} from "./lib/paganiniOp6Catalog.mjs";

const SPLIT_SCRIPT =
  process.env.SPLIT_PARTS_SCRIPT ||
  "c:\\Users\\marti\\Downloads\\Cursor - Proyectos\\scripts\\split_and_rename_parts.py";

const dryRun = process.argv.includes("--dry-run");
const workDir = join(PARA_ACOMODAR_ROOT, PAGANINI_OP6_WORK.targetFolder);
if (!existsSync(workDir)) throw new Error(`No se encuentra: ${workDir}`);

function targetName(instrument) {
  return canonicalPartFilename(
    instrument,
    PAGANINI_OP6_WORK.workNumber,
    PAGANINI_OP6_WORK.workTitleShort,
    PAGANINI_OP6_WORK.composerTag,
  );
}

console.log(dryRun ? "=== DRY RUN ===" : "=== APLICANDO ===");

for (const split of PAGANINI_OP6_WORK.splits) {
  const pdfPath = join(workDir, split.pdf);
  if (!existsSync(pdfPath)) throw new Error(`Falta ${split.pdf}`);
  if (dryRun) {
    console.log(`  [SPLIT] ${split.pdf}`);
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

for (const item of PAGANINI_OP6_WORK.wholes) {
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
  renameSync(src, dest);
  console.log(`  ${item.instrument}`);
}

console.log("Listo");
