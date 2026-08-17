/**
 * Recorta portada Kalmus (Bach SCORE) y renombra PDFs Haydn + Bach en Para acomodar.
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
import { canonicalPartFilename } from "./lib/pdfPartsRenaming.mjs";
import {
  HAYDN_BACH_WORKS,
  PARA_ACOMODAR_ROOT,
} from "./lib/haydnBachCatalog.mjs";

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

function resolveWorkDir(work) {
  const target = join(PARA_ACOMODAR_ROOT, work.targetFolder);
  if (existsSync(target)) return target;
  const src = join(PARA_ACOMODAR_ROOT, work.sourceFolder);
  if (existsSync(src)) return src;
  const needle = foldName(work.targetFolder).slice(0, 18);
  const hit = existsSync(PARA_ACOMODAR_ROOT)
    ? readdirSync(PARA_ACOMODAR_ROOT, { withFileTypes: true })
        .filter((d) => d.isDirectory() && foldName(d.name).includes(needle))
        .map((d) => join(PARA_ACOMODAR_ROOT, d.name))[0]
    : null;
  if (!hit) {
    throw new Error(`No se encuentra carpeta: ${work.targetFolder}`);
  }
  return hit;
}

function findLocalPdf(dir, wantedName) {
  if (!existsSync(dir)) return null;
  const pdfs = readdirSync(dir).filter((f) => /\.pdf$/i.test(f));
  const want = foldName(wantedName);
  const exact = pdfs.find((f) => foldName(f) === want);
  if (exact) return exact;
  const wantNoExt = want.replace(/\.pdf$/i, "");
  return (
    pdfs.find((f) => foldName(f).replace(/\.pdf$/i, "") === wantNoExt) || null
  );
}

function runCrop(workDir, crop) {
  const pdfName = findLocalPdf(workDir, crop.pdf);
  if (!pdfName) {
    const already = readdirSync(workDir).find((f) =>
      foldName(f).startsWith(foldName(`${crop.instrument} - `)),
    );
    if (already) {
      console.log(`  OK crop (ya canónico): ${already}`);
      return;
    }
    console.warn(`  Omitido crop (no existe): ${crop.pdf}`);
    return;
  }
  const pdfPath = join(workDir, pdfName);
  if (dryRun) {
    console.log(
      `  [CROP] ${pdfName} → ${crop.instrument} (${crop.start}-${crop.end})`,
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

function renameWorkPdfs(workDir, work) {
  const meta = {
    workNumber: work.workNumber,
    workTitle: work.titulo,
    composerTag: work.composerTag,
  };
  let renamed = 0;
  let missing = 0;
  for (const item of work.renames) {
    const targetName = canonicalPartFilename(
      item.instrument,
      meta.workNumber,
      meta.workTitle,
      meta.composerTag,
    );
    const dst = join(workDir, targetName);
    const found =
      findLocalPdf(workDir, item.pdf) ||
      findLocalPdf(workDir, `${item.instrument} - raw split.pdf`) ||
      findLocalPdf(workDir, targetName);
    if (!found) {
      if (existsSync(dst)) {
        console.log(`  OK: ${targetName}`);
        continue;
      }
      console.warn(`  Omitido (no existe): ${item.pdf}`);
      missing += 1;
      continue;
    }
    if (foldName(found) === foldName(targetName)) {
      console.log(`  OK: ${targetName}`);
      continue;
    }
    if (dryRun) {
      console.log(`  ${found} → ${targetName}`);
      renamed += 1;
      continue;
    }
    if (existsSync(dst) && foldName(found) !== foldName(targetName)) {
      console.warn(`  Colisión omitida: ${found} → ${targetName}`);
      continue;
    }
    renameSync(join(workDir, found), dst);
    console.log(`  ${found} → ${targetName}`);
    renamed += 1;
  }
  return { renamed, missing };
}

console.log(dryRun ? "=== DRY RUN ===" : "=== APLICANDO ===");

for (const work of HAYDN_BACH_WORKS) {
  const workDir = resolveWorkDir(work);
  console.log(`\n=== ${work.targetFolder} ===`);
  console.log(workDir);

  if (work.crops?.length) {
    console.log("--- Recortar portadas ---");
    for (const crop of work.crops) runCrop(workDir, crop);
  }

  cleanupArtifacts(workDir);

  console.log("--- Renombrar ---");
  const { renamed, missing } = renameWorkPdfs(workDir, work);
  const pdfs = readdirSync(workDir).filter((f) => /\.pdf$/i.test(f));
  console.log(
    `Listo. ${pdfs.length} PDFs | renames=${renamed} omitidos=${missing}`,
  );
}
