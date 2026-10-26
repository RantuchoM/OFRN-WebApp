/**
 * Downloads/ES → Para acomodar: split + rename canónico (gira 129).
 *
 *   node scripts/process-es129-local.mjs --dry-run
 *   node scripts/process-es129-local.mjs
 *   node scripts/process-es129-local.mjs --only=retablo
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
import { join } from "path";
import {
  ALL_PROCESSABLE_WORKS,
  ES_DOWNLOADS,
  PARA_ACOMODAR_ROOT,
} from "./lib/es129Catalog.mjs";
import { renamePdfFilesInFolder } from "./lib/pdfPartsRenaming.mjs";

const SPLIT_SCRIPT =
  process.env.SPLIT_PARTS_SCRIPT ||
  "C:\\Users\\marti\\Downloads\\Cursor - Proyectos\\scripts\\split_and_rename_parts.py";

const dryRun = process.argv.includes("--dry-run");
const onlyArg = process.argv.find((a) => a.startsWith("--only="));
const onlyKey = onlyArg ? onlyArg.slice("--only=".length) : null;

function findSourcePdf(work) {
  const files = readdirSync(ES_DOWNLOADS).filter((f) => /\.pdf$/i.test(f));
  const hits = files.filter((f) => work.sourceMatch.test(f));
  if (!hits.length) return null;
  // Preferir el PDF sin sufijo " (1)"
  const preferred = hits.find((f) => !/\(\s*1\s*\)/.test(f));
  return preferred || hits[0];
}

function runSplit(workDir, pdfName, parts) {
  const pdfPath = join(workDir, pdfName);
  if (!existsSync(pdfPath)) {
    console.warn(`  Omitido (no existe): ${pdfName}`);
    return;
  }
  if (dryRun) {
    console.log(
      `  [SPLIT] ${pdfName} → ${parts.map((p) => `${p.instrument} (${p.start}-${p.end})`).join(", ")}`,
    );
    return;
  }
  const manifestPath = join(workDir, `${pdfName}.manifest.json`);
  writeFileSync(manifestPath, JSON.stringify({ parts }, null, 2), "utf8");
  execSync(
    `python "${SPLIT_SCRIPT}" --work-dir "${workDir}" --input "${pdfPath}" --manifest "${manifestPath}" --split-only`,
    { stdio: "inherit" },
  );
  unlinkSync(pdfPath);
  unlinkSync(manifestPath);
}

function cleanupArtifacts(workDir) {
  if (!existsSync(workDir)) return;
  for (const f of readdirSync(workDir)) {
    if (/\.manifest(\.template)?\.json$/i.test(f) || /\.zip$/i.test(f)) {
      if (!dryRun) unlinkSync(join(workDir, f));
    }
  }
}

function processWork(work) {
  console.log(`\n=== ${work.targetFolder} ===`);
  const srcName = findSourcePdf(work);
  if (!srcName) {
    throw new Error(`No hay PDF fuente para ${work.key} en ${ES_DOWNLOADS}`);
  }
  console.log(`Fuente: ${srcName}`);

  const targetDir = join(PARA_ACOMODAR_ROOT, work.targetFolder);
  const existingPdfs = existsSync(targetDir)
    ? readdirSync(targetDir).filter((f) => /\.pdf$/i.test(f))
    : [];

  // Si ya hay partes canónicas (más de 1 PDF o un PDF que no es el fuente), no re-split
  const alreadyProcessed =
    existingPdfs.length > 0 &&
    !existingPdfs.every((f) => f === srcName || work.sourceMatch.test(f));

  if (alreadyProcessed) {
    console.log(`  Carpeta ya procesada (${existingPdfs.length} PDFs). Solo rename.`);
  } else {
    if (!dryRun) mkdirSync(targetDir, { recursive: true });
    else console.log(`  [MKDIR] ${targetDir}`);

    const destPdf = join(targetDir, srcName);
    if (!existsSync(destPdf) && existingPdfs.length === 0) {
      if (dryRun) console.log(`  [COPY] ${srcName}`);
      else copyFileSync(join(ES_DOWNLOADS, srcName), destPdf);
    }

    for (const split of work.splits) {
      const pdfName =
        existsSync(join(targetDir, srcName)) || dryRun
          ? srcName
          : existingPdfs[0];
      if (!pdfName) continue;
      runSplit(targetDir, pdfName, split.parts);
    }
  }

  cleanupArtifacts(targetDir);

  const meta = {
    workNumber: work.workNumber,
    workTitle: work.workTitle,
    composerTag: work.composerTag,
  };
  if (existsSync(targetDir)) {
    console.log(dryRun ? "  --- Renombrar (preview) ---" : "  --- Renombrar ---");
    const renames = renamePdfFilesInFolder(targetDir, meta, { dryRun });
    for (const r of renames) {
      if (r.action === "rename") console.log(`  ${r.from} → ${r.to}`);
      else console.log(`  OK: ${r.file}`);
    }
  } else if (dryRun) {
    console.log("  --- Renombrar (preview omitido: carpeta aún no creada) ---");
    for (const split of work.splits) {
      for (const p of split.parts) {
        console.log(`  → ${p.instrument}`);
      }
    }
  }

  const pdfs = existsSync(targetDir)
    ? readdirSync(targetDir).filter((f) => /\.pdf$/i.test(f))
    : [];
  console.log(`  Listo: ${pdfs.length} PDFs`);
  return pdfs.length;
}

if (!existsSync(ES_DOWNLOADS)) {
  throw new Error(`No existe ${ES_DOWNLOADS}`);
}
if (!existsSync(PARA_ACOMODAR_ROOT)) {
  throw new Error(`No existe ${PARA_ACOMODAR_ROOT}`);
}
if (!existsSync(SPLIT_SCRIPT)) {
  throw new Error(`No existe split script: ${SPLIT_SCRIPT}`);
}

console.log(dryRun ? "=== DRY RUN ===" : "=== APLICANDO ===");
console.log(`Downloads: ${ES_DOWNLOADS}`);
console.log(`Para acomodar: ${PARA_ACOMODAR_ROOT}`);

// Sin --only: solo obras de programa (tienen orden). ARCHIVE_ONLY requiere --only=<key>.
const toRun = onlyKey
  ? ALL_PROCESSABLE_WORKS.filter((w) => w.key === onlyKey)
  : ALL_PROCESSABLE_WORKS.filter((w) => w.orden != null);
if (!toRun.length) {
  throw new Error(
    onlyKey
      ? `--only=${onlyKey} no coincide`
      : "No hay obras para procesar",
  );
}

let total = 0;
for (const work of toRun) {
  total += processWork(work);
}
console.log(`\nTotal PDFs en carpetas procesadas: ${total}`);
