/**
 * Reemplaza las particellas de Weber fagot op.75 (obra 2337) por Breitkopf O.B. 4867.
 * Escribe en la carpeta de archivo ya vinculada. No copia a Para acomodar.
 */
import { execSync } from "child_process";
import { copyFileSync, existsSync, readdirSync, unlinkSync, writeFileSync } from "fs";
import { join } from "path";
import { renamePdfFilesInFolder } from "./lib/pdfPartsRenaming.mjs";
import {
  WEBER_FAGOT_DIR,
  WEBER_FAGOT_DOWNLOADS,
  WEBER_FAGOT_SCORE_SOURCE,
  WEBER_FAGOT_WORK,
} from "./lib/weberFagotCatalog.mjs";

const SPLIT_SCRIPT =
  process.env.SPLIT_PARTS_SCRIPT ||
  "c:\\Users\\marti\\Downloads\\Cursor - Proyectos\\scripts\\split_and_rename_parts.py";

const dryRun = process.argv.includes("--dry-run");

function sourcePath(split) {
  if (split.source === "score") return WEBER_FAGOT_SCORE_SOURCE;
  return join(WEBER_FAGOT_DOWNLOADS, split.pdf);
}

function clearOldPdfs(workDir) {
  const pdfs = readdirSync(workDir).filter((f) => /\.pdf$/i.test(f));
  for (const name of pdfs) {
    if (dryRun) {
      console.log(`  [DEL] ${name}`);
      continue;
    }
    unlinkSync(join(workDir, name));
  }
  console.log(`${dryRun ? "Borraría" : "Borrados"} ${pdfs.length} PDF viejos`);
}

function runSplit(workDir, split) {
  const src = sourcePath(split);
  if (!existsSync(src)) throw new Error(`No está el PDF fuente: ${src}`);
  const localName = split.pdf;
  const pdfPath = join(workDir, localName);
  if (!dryRun) copyFileSync(src, pdfPath);
  const manifest = { parts: split.parts };
  const manifestPath = join(workDir, `${localName}.manifest.json`);
  if (dryRun) {
    console.log(
      `  [SPLIT] ${localName} → ${split.parts.map((p) => `${p.instrument} (${p.start}-${p.end})`).join(", ")}`,
    );
    return;
  }
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf8");
  execSync(
    `python "${SPLIT_SCRIPT}" --work-dir "${workDir}" --input "${pdfPath}" --manifest "${manifestPath}" --split-only`,
    { stdio: "inherit" },
  );
  unlinkSync(pdfPath);
  unlinkSync(manifestPath);
}

if (!existsSync(WEBER_FAGOT_DIR)) {
  throw new Error(`No se encuentra la carpeta de la obra: ${WEBER_FAGOT_DIR}`);
}

console.log(`Weber op.75: ${WEBER_FAGOT_DIR}`);
console.log(dryRun ? "=== DRY RUN ===" : "=== APLICANDO ===");
clearOldPdfs(WEBER_FAGOT_DIR);
for (const split of WEBER_FAGOT_WORK.splits) runSplit(WEBER_FAGOT_DIR, split);

const meta = {
  workNumber: WEBER_FAGOT_WORK.workNumber,
  workTitle: WEBER_FAGOT_WORK.titulo,
  composerTag: WEBER_FAGOT_WORK.composerTag,
};
console.log("\n--- Renombrar canónicamente ---");
const renames = renamePdfFilesInFolder(WEBER_FAGOT_DIR, meta, { dryRun });
for (const r of renames) {
  if (r.action === "rename") console.log(`  ${r.from} → ${r.to}`);
  else console.log(`  OK: ${r.file || r.from}`);
}

if (!dryRun) {
  const pdfs = readdirSync(WEBER_FAGOT_DIR).filter((f) => /\.pdf$/i.test(f));
  console.log(`\nListo. ${pdfs.length} PDFs en carpeta.`);
  for (const name of pdfs.sort((a, b) => a.localeCompare(b, "es"))) {
    console.log(`  ${name}`);
  }
}
