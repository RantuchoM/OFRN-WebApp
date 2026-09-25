/**
 * Split/crop/rename de las ediciones IMSLP del Concerto Competition
 * en Para acomodar (File Stream = Drive).
 */
import { execSync } from "child_process";
import { existsSync, readdirSync, renameSync, unlinkSync, writeFileSync } from "fs";
import { join } from "path";
import { canonicalPartFilename } from "./lib/pdfPartsRenaming.mjs";
import {
  CONCERTO_COMPETICION_WORKS,
  PARA_ACOMODAR_ROOT,
} from "./lib/concertoCompeticionCatalog.mjs";

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

function findLocalPdf(dir, wantedName) {
  const pdfs = readdirSync(dir).filter((f) => /\.pdf$/i.test(f));
  const want = foldName(wantedName);
  return pdfs.find((f) => foldName(f) === want) || null;
}

function runSplit(workDir, split) {
  const pdfName = findLocalPdf(workDir, split.pdf);
  if (!pdfName) {
    const already = split.parts.every((part) =>
      readdirSync(workDir).some((f) =>
        foldName(f).startsWith(foldName(`${part.instrument} - `)),
      ),
    );
    if (already) {
      console.log(`  OK split (ya canónico): ${split.pdf}`);
      return;
    }
    console.warn(`  Omitido split (no existe): ${split.pdf}`);
    return;
  }
  if (dryRun) {
    console.log(
      `  [SPLIT] ${pdfName} → ${split.parts
        .map((p) => `${p.instrument} (${p.start}-${p.end})`)
        .join(", ")}`,
    );
    return;
  }
  const pdfPath = join(workDir, pdfName);
  const manifestPath = join(workDir, `${pdfName}.manifest.json`);
  writeFileSync(
    manifestPath,
    JSON.stringify({ parts: split.parts }, null, 2),
    "utf8",
  );
  execSync(
    `python "${SPLIT_SCRIPT}" --work-dir "${workDir}" --input "${pdfPath}" --manifest "${manifestPath}" --split-only`,
    { stdio: "inherit" },
  );
  unlinkSync(pdfPath);
  unlinkSync(manifestPath);
}

function renameRawSplits(workDir, work) {
  const meta = {
    workNumber: work.workNumber,
    workTitle: work.titulo,
    composerTag: work.composerTag,
  };
  for (const file of readdirSync(workDir)) {
    if (!/ - raw split\.pdf$/i.test(file)) continue;
    const instrument = file.replace(/ - raw split\.pdf$/i, "").trim();
    const target = canonicalPartFilename(
      instrument,
      meta.workNumber,
      meta.workTitle,
      meta.composerTag,
    );
    if (dryRun) {
      console.log(`  [RENAME split] ${file} → ${target}`);
      continue;
    }
    const dst = join(workDir, target);
    if (existsSync(dst)) {
      console.warn(`  Colisión: ${file} → ${target}`);
      continue;
    }
    renameSync(join(workDir, file), dst);
    console.log(`  ${file} → ${target}`);
  }
}

function renameWholes(workDir, work) {
  for (const item of work.renames || []) {
    const target = canonicalPartFilename(
      item.instrument,
      work.workNumber,
      work.titulo,
      work.composerTag,
    );
    const found = findLocalPdf(workDir, item.pdf) || findLocalPdf(workDir, target);
    if (!found) {
      console.warn(`  Omitido rename (no existe): ${item.pdf}`);
      continue;
    }
    if (foldName(found) === foldName(target)) {
      console.log(`  OK: ${target}`);
      continue;
    }
    if (dryRun) {
      console.log(`  [RENAME] ${found} → ${target}`);
      continue;
    }
    const dst = join(workDir, target);
    if (existsSync(dst)) {
      console.warn(`  Colisión: ${found} → ${target}`);
      continue;
    }
    renameSync(join(workDir, found), dst);
    console.log(`  ${found} → ${target}`);
  }
}

console.log(dryRun ? "=== DRY RUN ===" : "=== APLICANDO ===");

for (const work of CONCERTO_COMPETICION_WORKS) {
  const workDir = join(PARA_ACOMODAR_ROOT, work.targetFolder);
  console.log(`\n=== ${work.targetFolder} ===`);
  if (!existsSync(workDir)) {
    console.warn(`  No existe carpeta: ${workDir}`);
    continue;
  }
  for (const split of work.splits || []) runSplit(workDir, split);
  renameRawSplits(workDir, work);
  renameWholes(workDir, work);
  const pdfs = readdirSync(workDir).filter((f) => /\.pdf$/i.test(f));
  console.log(`  ${pdfs.length} PDFs`);
}
