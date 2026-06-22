/**
 * Divide PDF combinado y renombra — Marcha de San Lorenzo [cuerdas].
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
  PARA_ACOMODAR_ROOT,
  SAN_LORENZO_CUERDAS_WORK,
} from "./lib/sanLorenzoCuerdasCatalog.mjs";

const SPLIT_SCRIPT =
  process.env.SPLIT_PARTS_SCRIPT ||
  "c:\\Users\\marti\\Downloads\\Charbonnier\\scripts\\split_and_rename_parts.py";

const dryRun = process.argv.includes("--dry-run");

function resolveWorkDir() {
  const target = join(PARA_ACOMODAR_ROOT, SAN_LORENZO_CUERDAS_WORK.targetFolder);
  if (existsSync(target)) return target;
  const src = join(PARA_ACOMODAR_ROOT, SAN_LORENZO_CUERDAS_WORK.sourceFolder);
  if (existsSync(src)) {
    if (!dryRun) {
      renameFolderIfNeeded(
        PARA_ACOMODAR_ROOT,
        SAN_LORENZO_CUERDAS_WORK.sourceFolder,
        SAN_LORENZO_CUERDAS_WORK.targetFolder,
        false,
      );
      return target;
    }
    return src;
  }
  throw new Error("No se encuentra carpeta Marcha San Lorenzo (cuerdas)");
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

function cleanupArtifacts(workDir) {
  if (!existsSync(workDir)) return;
  for (const f of readdirSync(workDir)) {
    if (/\.manifest\.(template\.)?json$/i.test(f) || /\.zip$/i.test(f)) {
      if (!dryRun) unlinkSync(join(workDir, f));
    }
  }
}

const workDir = resolveWorkDir();
console.log(`Para acomodar / San Lorenzo [cuerdas]: ${workDir}`);
console.log(dryRun ? "=== DRY RUN ===" : "=== APLICANDO ===");

const meta = {
  workNumber: SAN_LORENZO_CUERDAS_WORK.workNumber,
  workTitle: SAN_LORENZO_CUERDAS_WORK.titulo,
  composerTag: SAN_LORENZO_CUERDAS_WORK.composerTag,
};

console.log("\n--- Dividir PDF combinado ---");
for (const split of SAN_LORENZO_CUERDAS_WORK.splits) runSplit(workDir, split);

cleanupArtifacts(workDir);

if (existsSync(workDir)) {
  if (!dryRun) {
    console.log("\n--- Renombrar canónicamente ---");
    const renames = renamePdfFilesInFolder(workDir, meta, { dryRun: false });
    for (const r of renames) {
      if (r.action === "rename") console.log(`  ${r.from} → ${r.to}`);
      else console.log(`  OK: ${r.file}`);
    }
  } else {
    renamePdfFilesInFolder(workDir, meta, { dryRun: true }).forEach((r) => {
      if (r.action === "rename") console.log(`  ${r.from} → ${r.to}`);
    });
  }
  const pdfs = readdirSync(workDir).filter((f) => /\.pdf$/i.test(f));
  console.log(`\nListo. ${pdfs.length} PDFs en carpeta.`);
}
