/**
 * Split clarinete/corno + rename Wagner Idilio de Sigfrido.
 */
import { execSync } from "child_process";
import { copyFileSync, existsSync, renameSync, unlinkSync, writeFileSync } from "fs";
import { join } from "path";
import { canonicalPartFilename } from "./lib/pdfPartsRenaming.mjs";
import {
  PARA_ACOMODAR_ROOT,
  WAGNER_IDILIO_WORK,
} from "./lib/wagnerIdilioCatalog.mjs";

const SPLIT_SCRIPT =
  process.env.SPLIT_PARTS_SCRIPT ||
  "c:\\Users\\marti\\Downloads\\Cursor - Proyectos\\scripts\\split_and_rename_parts.py";

const dryRun = process.argv.includes("--dry-run");
const workDir = join(PARA_ACOMODAR_ROOT, WAGNER_IDILIO_WORK.targetFolder);
if (!existsSync(workDir)) throw new Error(`No se encuentra: ${workDir}`);

function targetName(instrument) {
  return canonicalPartFilename(
    instrument,
    WAGNER_IDILIO_WORK.workNumber,
    WAGNER_IDILIO_WORK.workTitleShort,
    WAGNER_IDILIO_WORK.composerTag,
  );
}

console.log(dryRun ? "=== DRY RUN ===" : "=== APLICANDO ===");

for (const split of WAGNER_IDILIO_WORK.splits) {
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
    const rawCandidates = [
      join(workDir, `${p.instrument} - raw split.pdf`),
      join(workDir, `${p.instrument}.pdf`),
    ];
    const raw = rawCandidates.find((c) => existsSync(c));
    const dest = join(workDir, targetName(p.instrument));
    if (!raw) throw new Error(`Sin salida de split: ${p.instrument}`);
    renameSync(raw, dest);
    console.log(`  split ${p.instrument}`);
  }
}

for (const item of WAGNER_IDILIO_WORK.wholes) {
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
