/**
 * Divide Set of Parts + recorta portada del score; renombra Cielito Lindo (Orquesta y Voz).
 */
import { execSync } from "child_process";
import {
  existsSync,
  readdirSync,
  unlinkSync,
  writeFileSync,
} from "fs";
import { join } from "path";
import {
  renameFolderIfNeeded,
  renamePdfFilesInFolder,
} from "./lib/pdfPartsRenaming.mjs";
import {
  CIELITO_LINDO_WORK,
  PARA_ACOMODAR_ROOT,
} from "./lib/cielitoLindoCatalog.mjs";

const SPLIT_SCRIPT =
  process.env.SPLIT_PARTS_SCRIPT ||
  "c:\\Users\\marti\\Downloads\\Cursor - Proyectos\\scripts\\split_and_rename_parts.py";

const dryRun = process.argv.includes("--dry-run");

function foldName(s) {
  return String(s || "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function resolveWorkDir() {
  const target = join(PARA_ACOMODAR_ROOT, CIELITO_LINDO_WORK.targetFolder);
  if (existsSync(target)) return target;
  const src = join(PARA_ACOMODAR_ROOT, CIELITO_LINDO_WORK.sourceFolder);
  if (existsSync(src)) {
    if (!dryRun) {
      renameFolderIfNeeded(
        PARA_ACOMODAR_ROOT,
        CIELITO_LINDO_WORK.sourceFolder,
        CIELITO_LINDO_WORK.targetFolder,
        false,
      );
    }
    return target;
  }
  const needle = foldName("cielito lindo");
  const hit = readdirSync(PARA_ACOMODAR_ROOT, { withFileTypes: true })
    .filter((d) => d.isDirectory() && foldName(d.name).includes(needle))
    .map((d) => join(PARA_ACOMODAR_ROOT, d.name))[0];
  if (!hit) {
    throw new Error("No se encuentra carpeta Cielito Lindo en Para acomodar");
  }
  return hit;
}

function runSplit(workDir, split) {
  const pdfPath = join(workDir, split.pdf);
  if (!existsSync(pdfPath)) {
    console.warn(`  Omitido (no existe): ${split.pdf}`);
    return;
  }
  const manifest = { parts: split.parts };
  const manifestPath = join(workDir, `${split.pdf}.manifest.json`);
  if (dryRun) {
    console.log(
      `  [SPLIT] ${split.pdf} → ${split.parts.map((p) => `${p.instrument} (${p.start}-${p.end})`).join(", ")}`,
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

function runCrop(workDir, crop) {
  runSplit(workDir, {
    pdf: crop.pdf,
    parts: [{ instrument: crop.instrument, start: crop.start, end: crop.end }],
  });
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
console.log(`Para acomodar / Cielito Lindo: ${workDir}`);
console.log(dryRun ? "=== DRY RUN ===" : "=== APLICANDO ===");

const meta = {
  workNumber: CIELITO_LINDO_WORK.workNumber,
  workTitle: CIELITO_LINDO_WORK.titulo,
  composerTag: CIELITO_LINDO_WORK.composerTag,
};

console.log("\n--- Dividir combinados ---");
for (const split of CIELITO_LINDO_WORK.splits) runSplit(workDir, split);

console.log("\n--- Recortar portadas ---");
for (const crop of CIELITO_LINDO_WORK.crops) runCrop(workDir, crop);

cleanupArtifacts(workDir);

if (!dryRun) {
  console.log("\n--- Renombrar canónicamente ---");
  const renames = renamePdfFilesInFolder(workDir, meta, { dryRun: false });
  for (const r of renames) {
    if (r.action === "rename") console.log(`  ${r.from} → ${r.to}`);
    else console.log(`  OK: ${r.file}`);
  }
} else {
  console.log("\n--- Renombrar (preview) ---");
  const renames = renamePdfFilesInFolder(workDir, meta, { dryRun: true });
  for (const r of renames) {
    if (r.action === "rename") console.log(`  ${r.from} → ${r.to}`);
  }
}

const pdfs = readdirSync(workDir).filter((f) => /\.pdf$/i.test(f));
console.log(`\nListo. ${pdfs.length} PDFs en carpeta.`);
