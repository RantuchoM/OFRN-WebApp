/**
 * Split/crop/rename Kalinnikov Sinfonía Nro. 2 en Para acomodar.
 */
import { execSync } from "child_process";
import { existsSync, readdirSync, unlinkSync, writeFileSync } from "fs";
import { join } from "path";
import { renamePdfFilesInFolder } from "./lib/pdfPartsRenaming.mjs";
import {
  KALINNIKOV_SYM2_WORK,
  PARA_ACOMODAR_ROOT,
} from "./lib/kalinnikovSym2Catalog.mjs";

const SPLIT_SCRIPT =
  process.env.SPLIT_PARTS_SCRIPT ||
  "c:\\Users\\marti\\Downloads\\Cursor - Proyectos\\scripts\\split_and_rename_parts.py";

const dryRun = process.argv.includes("--dry-run");
const workDir = join(PARA_ACOMODAR_ROOT, KALINNIKOV_SYM2_WORK.targetFolder);
if (!existsSync(workDir)) throw new Error(`No se encuentra: ${workDir}`);

function runSplit(pdf, parts) {
  const pdfPath = join(workDir, pdf);
  if (!existsSync(pdfPath)) {
    console.warn(`  Omitido: ${pdf}`);
    return;
  }
  if (dryRun) {
    console.log(
      `  [SPLIT] ${pdf} → ${parts.map((p) => `${p.instrument} (${p.start}-${p.end})`).join(", ")}`,
    );
    return;
  }
  const manifestPath = join(workDir, `${pdf}.manifest.json`);
  writeFileSync(manifestPath, JSON.stringify({ parts }, null, 2), "utf8");
  execSync(
    `python "${SPLIT_SCRIPT}" --work-dir "${workDir}" --input "${pdfPath}" --manifest "${manifestPath}" --split-only`,
    { stdio: "inherit" },
  );
  unlinkSync(pdfPath);
  unlinkSync(manifestPath);
}

console.log(dryRun ? "=== DRY RUN ===" : "=== APLICANDO ===");
console.log(workDir);

console.log("\n--- Splits ---");
for (const s of KALINNIKOV_SYM2_WORK.splits) runSplit(s.pdf, s.parts);

console.log("\n--- Crops ---");
for (const c of KALINNIKOV_SYM2_WORK.crops) {
  runSplit(c.pdf, [{ instrument: c.instrument, start: c.start, end: c.end }]);
}

if (!dryRun) {
  for (const f of readdirSync(workDir)) {
    if (/\.manifest\.template\.json$/i.test(f) || /^IMSLP/i.test(f)) {
      try {
        unlinkSync(join(workDir, f));
        console.log(`  cleaned ${f}`);
      } catch {
        /* ignore */
      }
    }
  }
  console.log("\n--- Rename ---");
  const renames = renamePdfFilesInFolder(
    workDir,
    {
      workNumber: KALINNIKOV_SYM2_WORK.workNumber,
      workTitle: KALINNIKOV_SYM2_WORK.workTitleShort,
      composerTag: KALINNIKOV_SYM2_WORK.composerTag,
    },
    { dryRun: false },
  );
  for (const r of renames) console.log(`  ${r.from || r.file} → ${r.to || r.action}`);
}

console.log("\nListo");
