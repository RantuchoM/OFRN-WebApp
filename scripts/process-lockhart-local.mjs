/**
 * Lockhart — Montevideana Nro. 1 + Homenaje a Astor Piazzolla.
 * Merge de scores/piano/bandoneón (3 movs → 1 PDF) + rename canónico.
 */
import { execFileSync } from "child_process";
import { existsSync, readdirSync, unlinkSync } from "fs";
import { basename, dirname, join } from "path";
import { fileURLToPath } from "url";
import {
  canonicalPartFilename,
  renameFolderIfNeeded,
  renamePdfFilesInFolder,
} from "./lib/pdfPartsRenaming.mjs";
import {
  HOMENAJE_PIAZZOLLA_WORK,
  MONTEVIDEANA_WORK,
  PARA_ACOMODAR_ROOT,
} from "./lib/lockhartCatalog.mjs";

const dryRun = process.argv.includes("--dry-run");
const only = process.argv.find((a) => a.startsWith("--only="))?.slice(7);

const __dirname = dirname(fileURLToPath(import.meta.url));
const MERGE_HELPER = join(__dirname, "lib", "merge_pdfs.py");

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
      return target;
    }
    return src;
  }
  throw new Error(`No se encuentra carpeta: ${work.sourceFolder}`);
}

function runMerges(workDir, work) {
  const merges = work.merges || [];
  if (!merges.length) return;

  for (const merge of merges) {
    const paths = merge.pdfs.map((p) => join(workDir, p));
    const missing = paths.filter((p) => !existsSync(p));
    if (missing.length) {
      console.warn(
        `  Omitido merge ${merge.instrument}: faltan ${missing.map((m) => basename(m)).join(", ")}`,
      );
      continue;
    }
    const outName = canonicalPartFilename(
      merge.instrument,
      work.workNumber,
      work.titulo,
      work.composerTag,
    );
    const outPath = join(workDir, outName);
    if (dryRun) {
      console.log(
        `  [MERGE] ${merge.instrument}: ${merge.pdfs.join(" + ")} → ${outName}`,
      );
      continue;
    }
    console.log(`  [MERGE] ${merge.instrument}…`);
    execFileSync("python", [MERGE_HELPER, outPath, ...paths], {
      stdio: "inherit",
    });
    for (const p of paths) unlinkSync(p);
  }
}

function processWork(work) {
  const workDir = resolveWorkDir(work);
  console.log(`\n=== ${work.titulo} ===`);
  console.log(`Dir: ${workDir}`);
  console.log(dryRun ? "=== DRY RUN ===" : "=== APLICANDO ===");

  if ((work.merges || []).length) {
    console.log("\n--- Unificar movimientos ---");
    runMerges(workDir, work);
  }

  const meta = {
    workNumber: work.workNumber,
    workTitle: work.titulo,
    composerTag: work.composerTag,
  };

  console.log("\n--- Renombrar canónicamente ---");
  const renames = renamePdfFilesInFolder(workDir, meta, { dryRun });
  for (const r of renames) {
    if (r.action === "rename") console.log(`  ${r.from} → ${r.to}`);
    else if (r.action === "ok") console.log(`  OK: ${r.file}`);
    else console.log(`  ${r.action}: ${r.file}`);
  }

  const pdfs = existsSync(workDir)
    ? readdirSync(workDir).filter((f) => /\.pdf$/i.test(f))
    : [];
  console.log(`\nListo. ${pdfs.length} PDFs.`);
  return pdfs;
}

const works = [MONTEVIDEANA_WORK, HOMENAJE_PIAZZOLLA_WORK].filter((w) => {
  if (!only) return true;
  const key = only.toLowerCase();
  return (
    w.sourceFolder.toLowerCase().includes(key) ||
    w.titulo.toLowerCase().includes(key) ||
    w.targetFolder.toLowerCase().includes(key)
  );
});

if (!works.length) {
  console.error(`No hay obras que coincidan con --only=${only}`);
  process.exit(1);
}

for (const w of works) processWork(w);
