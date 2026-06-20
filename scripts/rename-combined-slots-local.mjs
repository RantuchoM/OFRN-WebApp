/**
 * Renombra sufijos combinados en PDFs ya canónicos: 1-2 → 1y2, 1-3 → 1y2y3.
 * Uso: node scripts/rename-combined-slots-local.mjs [carpeta-obra]
 */
import { existsSync, readdirSync, renameSync } from "fs";
import { join } from "path";
import { canonicalCombinedSuffix } from "./lib/pdfPartsRenaming.mjs";
import { FALLA_WORK, PARA_ACOMODAR_ROOT } from "./lib/fallaCatalog.mjs";

const dryRun = process.argv.includes("--dry-run");
const folderArg = process.argv.find((a) => !a.startsWith("-") && a.endsWith(".mjs") === false && !a.includes("node"));
const workDir =
  folderArg ||
  join(PARA_ACOMODAR_ROOT, FALLA_WORK.targetFolder);

if (!existsSync(workDir)) {
  console.error("No existe:", workDir);
  process.exit(1);
}

const COMBINED_IN_NAME =
  /^(.+?\s)(\d+(?:\s*-\s*\d+)+)(\s*-\s*(?:S-N|\d+\s+BIS)\.\s*.+\.pdf)$/i;

let renamed = 0;
for (const file of readdirSync(workDir).filter((f) => /\.pdf$/i.test(f))) {
  const m = file.match(COMBINED_IN_NAME);
  if (!m) continue;
  const suffix = canonicalCombinedSuffix(m[2].replace(/\s+/g, ""));
  if (suffix === m[2].replace(/\s+/g, "")) continue;
  const target = `${m[1]}${suffix}${m[3]}`;
  if (target === file) continue;
  console.log(dryRun ? `[RENAME] ${file} → ${target}` : `${file} → ${target}`);
  if (!dryRun) renameSync(join(workDir, file), join(workDir, target));
  renamed++;
}

console.log(`\nListo. ${renamed} archivo(s)${dryRun ? " (dry-run)" : ""}.`);
