/**
 * Copia fuentes a Para acomodar y renombra canónicamente.
 * Disney replace: `node scripts/process-walsh-disney-local.mjs --disney-only --replace`
 */
import { execSync } from "child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "fs";
import { join } from "path";
import { canonicalPartFilename } from "./lib/pdfPartsRenaming.mjs";
import {
  DISNEY_FAVORITES_SOURCE_DEFAULT,
  DISNEY_FAVORITES_WORK,
  PARA_ACOMODAR_ROOT,
  WALSH_DISNEY_SOURCE_DEFAULT,
  WALSH_DISNEY_WORKS,
} from "./lib/walshDisneyCatalog.mjs";

const SPLIT_SCRIPT =
  process.env.SPLIT_PARTS_SCRIPT ||
  "c:\\Users\\marti\\Downloads\\Cursor - Proyectos\\scripts\\split_and_rename_parts.py";

const dryRun = process.argv.includes("--dry-run");
const replaceFiles = process.argv.includes("--replace");
const disneyOnly = process.argv.includes("--disney-only");

function foldName(s) {
  return String(s || "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
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

function findSourcePdf(dir, work, wantedName) {
  const exact = findLocalPdf(dir, wantedName);
  if (exact) return exact;
  const item = (work.renames || []).find(
    (r) => foldName(r.pdf) === foldName(wantedName),
  );
  if (!item || !existsSync(dir)) return null;
  const files = readdirSync(dir).filter((f) => /\.pdf$/i.test(f));
  const inst = foldName(item.instrument);
  const aliases = [inst];
  if (inst === "corno f") aliases.push("trompa", "horn");
  if (inst === "clarinete bb") aliases.push("clarinete", "clarinet");
  if (inst === "score") aliases.push("full score", "fullscore", "partitura");
  return (
    files.find((f) => {
      const n = foldName(f);
      return aliases.some(
        (a) =>
          n === `${a}.pdf` ||
          n.startsWith(`${a} `) ||
          n.includes(` - ${a}`) ||
          n.endsWith(` ${a}.pdf`),
      );
    }) || null
  );
}

function resolveSourceDir(work) {
  if (work?.key === DISNEY_FAVORITES_WORK.key) {
    if (existsSync(DISNEY_FAVORITES_SOURCE_DEFAULT)) {
      return DISNEY_FAVORITES_SOURCE_DEFAULT;
    }
  }
  if (existsSync(WALSH_DISNEY_SOURCE_DEFAULT)) return WALSH_DISNEY_SOURCE_DEFAULT;
  throw new Error(`No se encuentra la fuente: ${WALSH_DISNEY_SOURCE_DEFAULT}`);
}

function copyExtras(sourceDir, targetDir, work) {
  for (const extra of work.sourceExtras || []) {
    const src = join(sourceDir, extra);
    if (!existsSync(src)) {
      console.warn(`  Extra ausente: ${extra}`);
      continue;
    }
    const rename = (work.extraRenames || []).find(
      (r) => foldName(r.from) === foldName(extra),
    );
    const destName = rename?.to || extra;
    const dst = join(targetDir, destName);
    if (existsSync(dst) && !replaceFiles) {
      console.log(`  OK extra: ${destName}`);
      continue;
    }
    if (dryRun) {
      console.log(`  [COPY extra] ${extra} → ${destName}`);
      continue;
    }
    copyFileSync(src, dst);
    console.log(`  Extra: ${destName}`);
  }
}

function copyWorkFiles(sourceDir, targetDir, work) {
  if (!existsSync(targetDir)) {
    if (dryRun) console.log(`  [MKDIR] ${targetDir}`);
    else mkdirSync(targetDir, { recursive: true });
  }
  for (const pdf of work.sourcePdfs || []) {
    const srcName = findSourcePdf(sourceDir, work, pdf);
    if (!srcName) {
      console.warn(`  Fuente ausente: ${pdf}`);
      continue;
    }
    const rename = (work.renames || []).find(
      (r) => foldName(r.pdf) === foldName(pdf),
    );
    const destName =
      replaceFiles && rename
        ? canonicalPartFilename(
            rename.instrument,
            work.workNumber,
            work.titulo,
            work.composerTag,
          )
        : srcName;
    const dst = join(targetDir, destName);
    if (existsSync(dst) && !replaceFiles) {
      console.log(`  OK (ya copiado): ${destName}`);
      continue;
    }
    if (dryRun) {
      console.log(`  [COPY] ${srcName} → ${destName}`);
      continue;
    }
    copyFileSync(join(sourceDir, srcName), dst);
    console.log(`  Copiado: ${destName}`);
  }
}

function runCrop(workDir, crop) {
  const pdfName = findLocalPdf(workDir, crop.pdf);
  if (!pdfName) {
    const already = readdirSync(workDir).find(
      (f) =>
        foldName(f).startsWith(foldName(`${crop.instrument} - `)) ||
        foldName(f) === foldName(`${crop.instrument} - raw split.pdf`),
    );
    if (already) {
      console.log(`  OK crop (ya extraído): ${already}`);
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
    parts: [{ instrument: crop.instrument, start: crop.start, end: crop.end }],
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
  if (!existsSync(workDir)) return;
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
      if (!replaceFiles) {
        console.warn(`  Colisión omitida: ${found} → ${targetName}`);
        continue;
      }
      unlinkSync(dst);
    }
    renameSync(join(workDir, found), dst);
    console.log(`  ${found} → ${targetName}`);
    renamed += 1;
  }
  return { renamed, missing };
}

const works = disneyOnly
  ? WALSH_DISNEY_WORKS.filter((w) => w.key === DISNEY_FAVORITES_WORK.key)
  : WALSH_DISNEY_WORKS;

console.log(dryRun ? "=== DRY RUN ===" : replaceFiles ? "=== REEMPLAZAR ===" : "=== APLICANDO ===");
if (disneyOnly) console.log("Modo: solo Disney Favorites");

for (const work of works) {
  const sourceDir = resolveSourceDir(work);
  const targetDir = join(PARA_ACOMODAR_ROOT, work.targetFolder);
  console.log(`\n=== ${work.targetFolder} ===`);
  console.log(`Fuente: ${sourceDir}`);
  console.log(`Destino: ${targetDir}`);

  console.log("--- Copiar ---");
  copyWorkFiles(sourceDir, targetDir, work);
  copyExtras(sourceDir, targetDir, work);

  if (work.crops?.length) {
    console.log("--- Extraer SCORE ---");
    for (const crop of work.crops) runCrop(targetDir, crop);
  }

  cleanupArtifacts(targetDir);

  console.log("--- Renombrar ---");
  const { renamed, missing } = renameWorkPdfs(targetDir, work);
  const pdfs = existsSync(targetDir)
    ? readdirSync(targetDir).filter((f) => /\.pdf$/i.test(f))
    : [];
  console.log(
    `Listo. ${pdfs.length} PDFs | renames=${renamed} omitidos=${missing}`,
  );
}
