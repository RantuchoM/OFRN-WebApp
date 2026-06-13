/**
 * Renombra carpetas/PDFs en ARIAS (local sync). Sin S-N.
 */
import { existsSync, readdirSync } from "fs";
import { join } from "path";
import {
  renameFolderIfNeeded,
  renamePdfFilesInFolder,
} from "./lib/pdfPartsRenaming.mjs";
import { ARIAS_WORKS, LOCAL_ARIAS } from "./lib/ariasCatalog.mjs";

function findSourceDir(sourceFolder) {
  if (!existsSync(LOCAL_ARIAS)) return null;
  const exact = join(LOCAL_ARIAS, sourceFolder);
  if (existsSync(exact)) return exact;
  const dirs = readdirSync(LOCAL_ARIAS, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
  const norm = (s) => s.replace(/\s+/g, " ").trim().toLowerCase();
  const hit = dirs.find((d) => norm(d) === norm(sourceFolder));
  return hit ? join(LOCAL_ARIAS, hit) : null;
}

function resolveWorkDir(work) {
  const target = join(LOCAL_ARIAS, work.targetFolder);
  if (existsSync(target)) return target;
  const src = findSourceDir(work.sourceFolder);
  if (!src) return null;
  const srcName = src.split(/[/\\]/).pop();
  if (work.sourceFolder !== work.targetFolder) {
    renameFolderIfNeeded(LOCAL_ARIAS, srcName, work.targetFolder, false);
  }
  return join(LOCAL_ARIAS, work.targetFolder);
}

const dryRun = process.argv.includes("--dry-run");
console.log(`ARIAS local: ${LOCAL_ARIAS}`);
console.log(dryRun ? "=== DRY RUN ===" : "=== APLICANDO ===");

for (const work of ARIAS_WORKS) {
  const dir = dryRun ? findSourceDir(work.sourceFolder) : resolveWorkDir(work);
  if (!dir || !existsSync(dir)) {
    console.warn("Omitida (no existe):", work.sourceFolder);
    continue;
  }
  const renames = renamePdfFilesInFolder(
    dir,
    {
      workNumber: work.workNumber,
      workTitle: work.titulo,
      composerTag: work.composerTag,
    },
    { dryRun },
  );
  console.log(`\n${work.targetFolder} (${renames.length} PDFs)`);
  for (const r of renames) {
    if (r.action === "rename") console.log(`  ${r.from} → ${r.to}`);
    else if (r.action === "skip-collision") console.log(`  SKIP: ${r.file}`);
    else console.log(`  OK: ${r.file}`);
  }
}

console.log("\nListo.");
