/**
 * Divide PDFs combinados, recorta portada del score y renombra
 * particellas Charbonnier — Voces latinoamericanas (Para acomodar).
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
  CHARBONNIER_VOCES_WORK,
  PARA_ACOMODAR_ROOT,
} from "./lib/charbonnierVocesCatalog.mjs";

const SPLIT_SCRIPT =
  process.env.SPLIT_PARTS_SCRIPT ||
  "c:\\Users\\marti\\Downloads\\Cursor - Proyectos\\scripts\\split_and_rename_parts.py";

const dryRun = process.argv.includes("--dry-run");
const work = CHARBONNIER_VOCES_WORK;

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
    }
    return dryRun ? src : target;
  }
  const hit = readdirSync(PARA_ACOMODAR_ROOT, { withFileTypes: true })
    .filter(
      (d) =>
        d.isDirectory() &&
        /charbon+ier/i.test(d.name) &&
        /voces/i.test(d.name),
    )
    .map((d) => join(PARA_ACOMODAR_ROOT, d.name))[0];
  if (!hit) {
    throw new Error(
      "No se encuentra carpeta Charbonnier Voces en Para acomodar",
    );
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
console.log(`Para acomodar / Charbonnier Voces: ${workDir}`);
console.log(dryRun ? "=== DRY RUN ===" : "=== APLICANDO ===");

const meta = {
  workNumber: work.workNumber,
  workTitle: work.titulo,
  composerTag: work.composerTag,
};

console.log("\n--- Dividir partes combinadas ---");
for (const split of work.splits) runSplit(workDir, split);

console.log("\n--- Recortar score ---");
for (const crop of work.crops) runCrop(workDir, crop);

cleanupArtifacts(workDir);

console.log(dryRun ? "\n--- Renombrar (preview) ---" : "\n--- Renombrar canónicamente ---");
const renames = renamePdfFilesInFolder(workDir, meta, { dryRun });
for (const r of renames) {
  if (r.action === "rename") console.log(`  ${r.from} → ${r.to}`);
  else if (r.action === "ok") console.log(`  OK: ${r.file}`);
  else console.log(`  ${r.action}: ${r.file}`);
}

const pdfs = readdirSync(workDir).filter((f) => /\.pdf$/i.test(f));
console.log(`\nListo. ${pdfs.length} PDFs en carpeta.`);
if (pdfs.length) {
  for (const f of pdfs.sort((a, b) => a.localeCompare(b, "es"))) {
    console.log(`  - ${f}`);
  }
}
