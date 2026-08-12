/**
 * Recorta Dies irae (III. Sequenz / 1. Dies irae → Tuba mirum) y renombra
 * particellas Mozart K. 626 en Para acomodar.
 */
import { execSync } from "child_process";
import {
  existsSync,
  readdirSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "fs";
import { join } from "path";
import {
  renameFolderIfNeeded,
  renamePdfFilesInFolder,
} from "./lib/pdfPartsRenaming.mjs";
import {
  MOZART_DIES_IRAE_WORK,
  PARA_ACOMODAR_ROOT,
} from "./lib/mozartDiesIraeCatalog.mjs";

const SPLIT_SCRIPT =
  process.env.SPLIT_PARTS_SCRIPT ||
  "c:\\Users\\marti\\Downloads\\Cursor - Proyectos\\scripts\\split_and_rename_parts.py";

const dryRun = process.argv.includes("--dry-run");
const work = MOZART_DIES_IRAE_WORK;

function fold(s) {
  return String(s || "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();
}

function resolveWorkDir() {
  const target = join(PARA_ACOMODAR_ROOT, work.targetFolder);
  if (existsSync(target)) return target;
  const src = join(PARA_ACOMODAR_ROOT, work.sourceFolder);
  if (existsSync(src)) {
    if (!dryRun) {
      renameFolderIfNeeded(
        PARA_ACOMODAR_ROOT,
        work.sourceFolder,
        work.targetFolder,
        false,
      );
      return target;
    }
    return src;
  }
  const hit = readdirSync(PARA_ACOMODAR_ROOT, { withFileTypes: true })
    .filter((d) => d.isDirectory() && /dies/i.test(d.name))
    .map((d) => join(PARA_ACOMODAR_ROOT, d.name))[0];
  if (!hit) {
    throw new Error(
      "No se encuentra carpeta Mozart Dies Irae en Para acomodar",
    );
  }
  if (!dryRun && fold(hit.split(/[/\\]/).pop()) !== fold(work.targetFolder)) {
    renameFolderIfNeeded(
      PARA_ACOMODAR_ROOT,
      hit.split(/[/\\]/).pop(),
      work.targetFolder,
      false,
    );
    return target;
  }
  return hit;
}

function findPdfForInstrument(workDir, instrument) {
  const pdfs = readdirSync(workDir).filter((f) => /\.pdf$/i.test(f));
  const needle = fold(instrument);
  const exact = pdfs.find((f) => fold(f.split(" - ")[0]) === needle);
  if (exact) return exact;
  return pdfs.find((f) => fold(f).startsWith(needle));
}

function runCrop(workDir, crop) {
  const pdfName = findPdfForInstrument(workDir, crop.instrument);
  if (!pdfName) {
    console.warn(`  Omitido (no existe PDF): ${crop.instrument}`);
    return;
  }
  const pdfPath = join(workDir, pdfName);
  const keep = crop.end - crop.start + 1;
  if (dryRun) {
    console.log(
      `  [CROP] ${pdfName} → ${crop.instrument} (${crop.start}-${crop.end}/${crop.origPages} → ${keep} p.)`,
    );
    return;
  }
  const manifest = {
    parts: [
      { instrument: crop.instrument, start: crop.start, end: crop.end },
    ],
  };
  const manifestPath = join(workDir, `${pdfName}.manifest.json`);
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf8");
  execSync(
    `python "${SPLIT_SCRIPT}" --work-dir "${workDir}" --input "${pdfPath}" --manifest "${manifestPath}" --split-only`,
    { stdio: "inherit" },
  );
  unlinkSync(pdfPath);
  unlinkSync(manifestPath);
}

function cleanupArtifacts(workDir) {
  for (const f of readdirSync(workDir)) {
    if (
      /\.manifest\.template\.json$/i.test(f) ||
      /\.manifest\.json$/i.test(f) ||
      /\.zip$/i.test(f)
    ) {
      if (!dryRun) unlinkSync(join(workDir, f));
      else console.log(`  [DEL] ${f}`);
    }
  }
}

const workDir = resolveWorkDir();
console.log(`Para acomodar / Mozart Dies Irae: ${workDir}`);
console.log(dryRun ? "=== DRY RUN ===" : "=== APLICANDO ===");

const meta = {
  workNumber: work.filenameWorkNumber,
  workTitle: work.titulo,
  composerTag: work.composerTag,
};

console.log("\n--- Recortar Dies irae ---");
for (const crop of work.crops) runCrop(workDir, crop);

cleanupArtifacts(workDir);

console.log(
  dryRun ? "\n--- Renombrar (preview) ---" : "\n--- Renombrar canónicamente ---",
);
const renames = renamePdfFilesInFolder(workDir, meta, { dryRun });
for (const r of renames) {
  if (r.action === "rename") console.log(`  ${r.from} → ${r.to}`);
  else if (r.action === "ok") console.log(`  OK: ${r.file}`);
  else console.log(`  ${r.action}: ${r.file || r.from}`);
}

const extras = readdirSync(workDir).filter((f) => !/\.pdf$/i.test(f));
for (const f of extras) {
  console.log(`  (no PDF) ${f}`);
}

const pdfs = readdirSync(workDir).filter((f) => /\.pdf$/i.test(f));
console.log(`\nListo. ${pdfs.length} PDFs en carpeta.`);
for (const f of pdfs.sort((a, b) => a.localeCompare(b, "es"))) {
  console.log(`  - ${f}`);
}
