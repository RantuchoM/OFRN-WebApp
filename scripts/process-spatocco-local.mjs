/**
 * Procesa particellas Spatocco — Para acomodar.
 * Como los PDFs de Spatocco ya son por instrumento (arreglos propios, no IMSLP),
 * el flujo es: rename de carpeta → recorte de portada (si aplica) → rename canónico.
 *
 * ANTES DE EJECUTAR:
 *   1. Inspeccionar PDFs en Drive: https://drive.google.com/drive/folders/1srUOi_8mV-l0jZrFUNne6qx2JzFmv2yJ
 *   2. Completar `splits` y `crops` en scripts/lib/spatoccoCatalog.mjs con los rangos reales.
 *   3. Completar `driveFolderId` para cada obra.
 *
 * Uso:
 *   node scripts/process-spatocco-local.mjs --dry-run
 *   node scripts/process-spatocco-local.mjs
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
  canonicalPartFilename,
  normalizeInstrumentLabel,
  renameFolderIfNeeded,
  renameAudioFilesInFolder,
} from "./lib/pdfPartsRenaming.mjs";
import {
  ALL_SPATOCCO_WORKS,
  PARA_ACOMODAR_ROOT,
} from "./lib/spatoccoCatalog.mjs";

const SPLIT_SCRIPT =
  process.env.SPLIT_PARTS_SCRIPT ||
  "c:\\Users\\marti\\Downloads\\Cursor - Proyectos\\scripts\\split_and_rename_parts.py";

const dryRun = process.argv.includes("--dry-run");
const SPATOCCO_INSTRUMENT_ALIASES = new Map([["voice", "Voz"]]);

function resolveWorkDir(work) {
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
    } else {
      console.log(`  [RENAME FOLDER] ${work.sourceFolder} → ${work.targetFolder}`);
    }
    return target;
  }
  console.warn(`  ⚠ Carpeta no encontrada localmente: ${work.sourceFolder}`);
  return null;
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

function renameSpatoccoPdfFilesInFolder(
  folderPath,
  { workNumber, workTitle, composerTag },
  { dryRun = false } = {},
) {
  const pdfs = readdirSync(folderPath)
    .filter((f) => /\.pdf$/i.test(f))
    .sort((a, b) => a.localeCompare(b, "es"));

  const used = new Map();
  const results = [];

  for (const file of pdfs) {
    const base = file.replace(/\.pdf$/i, "").trim();
    const segments = base.split(/\s+-\s+/).map((s) => s.trim()).filter(Boolean);
    const canonicalSuffix = ` - ${workTitle} - ${composerTag}`;
    const rawInstrument =
      / - raw split$/i.test(base) && segments.length >= 1
        ? segments[0]
        : base.endsWith(canonicalSuffix) && segments.length >= 1
          ? segments[0]
        : segments.length >= 2
          ? segments.slice(1).join(" - ")
          : base;
    const aliasKey = rawInstrument.toLowerCase();
    const instrument =
      SPATOCCO_INSTRUMENT_ALIASES.get(aliasKey) ||
      normalizeInstrumentLabel(rawInstrument);

    let target = canonicalPartFilename(
      instrument,
      workNumber,
      workTitle,
      composerTag,
    );

    if (used.has(target)) {
      const n = used.get(target) + 1;
      used.set(target, n);
      target = canonicalPartFilename(
        `${instrument} ${n}`,
        workNumber,
        workTitle,
        composerTag,
      );
    } else {
      used.set(target, 1);
    }

    const src = join(folderPath, file);
    const dst = join(folderPath, target);
    if (file === target) {
      results.push({ action: "ok", file: target });
      continue;
    }
    if (existsSync(dst)) {
      console.warn(`  Colisión omitida (destino existe): ${file} → ${target}`);
      results.push({ action: "skip-collision", file, target });
      continue;
    }
    if (!dryRun) renameSync(src, dst);
    results.push({ action: "rename", from: file, to: target });
  }

  return results;
}

function processWork(work) {
  console.log(`\n=== ${work.titulo} ===`);
  const workDir = resolveWorkDir(work);
  if (!workDir) return;

  const meta = {
    workNumber: work.workNumber,
    workTitle: work.titulo,
    composerTag: work.composerTag,
  };

  if (work.splits.length === 0 && work.crops.length === 0) {
    console.log("  ⚠ Sin splits/crops definidos. Completar spatoccoCatalog.mjs primero.");
    console.log("  Solo se aplicará rename canónico a PDFs existentes.");
  }

  if (work.splits.length > 0) {
    console.log("--- Dividir combinados ---");
    for (const split of work.splits) runSplit(workDir, split);
  }

  if (work.crops.length > 0) {
    console.log("--- Recortar portadas ---");
    for (const crop of work.crops) runCrop(workDir, crop);
  }

  if (!dryRun) {
    console.log("--- Renombrar canónicamente ---");
    const renames = renameSpatoccoPdfFilesInFolder(workDir, meta, { dryRun: false });
    for (const r of renames) {
      if (r.action === "rename") console.log(`  ${r.from} → ${r.to}`);
      else console.log(`  OK: ${r.file}`);
    }
    const audioRenames = renameAudioFilesInFolder(workDir, { dryRun: false });
    for (const r of audioRenames) {
      if (r.action === "rename") console.log(`  ${r.from} → ${r.to}`);
      else console.log(`  AUDIO OK: ${r.file}`);
    }
  } else {
    console.log("--- Renombrar (preview) ---");
    const renames = renameSpatoccoPdfFilesInFolder(workDir, meta, { dryRun: true });
    for (const r of renames) {
      if (r.action === "rename") console.log(`  ${r.from} → ${r.to}`);
    }
    const audioRenames = renameAudioFilesInFolder(workDir, { dryRun: true });
    for (const r of audioRenames) {
      if (r.action === "rename") console.log(`  ${r.from} → ${r.to}`);
    }
  }

  const pdfs = existsSync(workDir)
    ? readdirSync(workDir).filter((f) => /\.pdf$/i.test(f))
    : [];
  console.log(`  ${pdfs.length} PDFs en carpeta.`);
}

console.log(`Para acomodar / Arreglos Spatocco`);
console.log(dryRun ? "=== DRY RUN ===" : "=== APLICANDO ===");

for (const work of ALL_SPATOCCO_WORKS) {
  processWork(work);
}

console.log("\nFin. Próximo paso: node scripts/generate-spatocco-sync.mjs");
