/**
 * Downloads/Bragato.pdf → Para acomodar (split + rename).
 *
 *   node scripts/process-bragato-malambo-local.mjs --dry-run
 *   node scripts/process-bragato-malambo-local.mjs
 */
import { execSync } from "child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  unlinkSync,
  writeFileSync,
} from "fs";
import { basename, join } from "path";
import {
  BRAGATO_MALAMBO_WORK,
  PARA_ACOMODAR_ROOT,
} from "./lib/bragatoMalamboCatalog.mjs";
import { renamePdfFilesInFolder } from "./lib/pdfPartsRenaming.mjs";

const SPLIT_SCRIPT =
  process.env.SPLIT_PARTS_SCRIPT ||
  "C:\\Users\\marti\\Downloads\\Cursor - Proyectos\\scripts\\split_and_rename_parts.py";

const dryRun = process.argv.includes("--dry-run");
const work = BRAGATO_MALAMBO_WORK;

if (!existsSync(work.sourcePdf)) throw new Error(`No existe ${work.sourcePdf}`);
if (!existsSync(PARA_ACOMODAR_ROOT)) {
  throw new Error(`No existe ${PARA_ACOMODAR_ROOT}`);
}
if (!existsSync(SPLIT_SCRIPT)) throw new Error(`No existe ${SPLIT_SCRIPT}`);

const targetDir = join(PARA_ACOMODAR_ROOT, work.targetFolder);
const srcName = basename(work.sourcePdf);

console.log(dryRun ? "=== DRY RUN ===" : "=== APLICANDO ===");
console.log(`Fuente: ${work.sourcePdf}`);
console.log(`Destino: ${targetDir}`);

const existing = existsSync(targetDir)
  ? readdirSync(targetDir).filter((f) => /\.pdf$/i.test(f))
  : [];
const already =
  existing.length > 1 ||
  (existing.length === 1 && !/^Bragato\.pdf$/i.test(existing[0]));

if (already) {
  console.log(`Carpeta ya procesada (${existing.length} PDFs). Solo rename.`);
} else {
  if (!dryRun) mkdirSync(targetDir, { recursive: true });
  else console.log(`[MKDIR] ${targetDir}`);

  const dest = join(targetDir, srcName);
  if (!existsSync(dest)) {
    if (dryRun) console.log(`[COPY] ${srcName}`);
    else copyFileSync(work.sourcePdf, dest);
  }

  for (const split of work.splits) {
    const pdfPath = join(targetDir, split.pdf);
    if (dryRun) {
      console.log(
        `[SPLIT] ${split.pdf} → ${split.parts.map((p) => `${p.instrument} (${p.start}-${p.end})`).join(", ")}`,
      );
      continue;
    }
    if (!existsSync(pdfPath)) {
      console.warn(`Omitido: ${split.pdf}`);
      continue;
    }
    const manifestPath = join(targetDir, `${split.pdf}.manifest.json`);
    writeFileSync(
      manifestPath,
      JSON.stringify({ parts: split.parts }, null, 2),
      "utf8",
    );
    execSync(
      `python "${SPLIT_SCRIPT}" --work-dir "${targetDir}" --input "${pdfPath}" --manifest "${manifestPath}" --split-only`,
      { stdio: "inherit" },
    );
    unlinkSync(pdfPath);
    unlinkSync(manifestPath);
  }
}

if (existsSync(targetDir)) {
  for (const f of readdirSync(targetDir)) {
    if (/\.manifest(\.template)?\.json$/i.test(f) || /\.zip$/i.test(f)) {
      if (!dryRun) unlinkSync(join(targetDir, f));
    }
  }
  const meta = {
    workNumber: work.workNumber,
    workTitle: work.workTitle,
    composerTag: work.composerTag,
  };
  const renames = renamePdfFilesInFolder(targetDir, meta, { dryRun });
  for (const r of renames) {
    if (r.action === "rename") console.log(`${r.from} → ${r.to}`);
    else console.log(`OK: ${r.file}`);
  }
  const pdfs = readdirSync(targetDir).filter((f) => /\.pdf$/i.test(f));
  console.log(`Listo: ${pdfs.length} PDFs`);
}
