/**
 * Divide PDFs IMSLP combinados, recorta portadas y renombra particellas Mendelssohn Sym.1.
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
  MENDELSSOHN_WORK,
  PARA_ACOMODAR_ROOT,
} from "./lib/mendelssohnCatalog.mjs";

const SPLIT_SCRIPT =
  process.env.SPLIT_PARTS_SCRIPT ||
  "c:\\Users\\marti\\Downloads\\Charbonnier\\scripts\\split_and_rename_parts.py";

const dryRun = process.argv.includes("--dry-run");

function resolveWorkDir() {
  const target = join(PARA_ACOMODAR_ROOT, MENDELSSOHN_WORK.targetFolder);
  if (existsSync(target)) return target;
  const src = join(PARA_ACOMODAR_ROOT, MENDELSSOHN_WORK.sourceFolder);
  if (existsSync(src)) {
    if (!dryRun) {
      renameFolderIfNeeded(
        PARA_ACOMODAR_ROOT,
        MENDELSSOHN_WORK.sourceFolder,
        MENDELSSOHN_WORK.targetFolder,
        false,
      );
      return target;
    }
    return src;
  }
  const hit = readdirSync(PARA_ACOMODAR_ROOT, { withFileTypes: true })
    .filter(
      (d) =>
        d.isDirectory() &&
        d.name.toLowerCase().includes("mendelssohn") &&
        d.name.toLowerCase().includes("sinfon"),
    )
    .map((d) => join(PARA_ACOMODAR_ROOT, d.name))[0];
  if (!hit) {
    const loose = readdirSync(PARA_ACOMODAR_ROOT, { withFileTypes: true })
      .filter(
        (d) => d.isDirectory() && d.name.toLowerCase().includes("mendelssohn"),
      )
      .map((d) => join(PARA_ACOMODAR_ROOT, d.name))[0];
    if (!loose) {
      throw new Error("No se encuentra carpeta Mendelssohn en Para acomodar");
    }
    return loose;
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
console.log(`Para acomodar / Mendelssohn: ${workDir}`);
console.log(dryRun ? "=== DRY RUN ===" : "=== APLICANDO ===");

const meta = {
  workNumber: MENDELSSOHN_WORK.workNumber,
  workTitle: MENDELSSOHN_WORK.titulo,
  composerTag: MENDELSSOHN_WORK.composerTag,
};

console.log("\n--- Dividir combinados ---");
for (const split of MENDELSSOHN_WORK.splits) runSplit(workDir, split);

console.log("\n--- Recortar portadas ---");
for (const crop of MENDELSSOHN_WORK.crops) runCrop(workDir, crop);

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
