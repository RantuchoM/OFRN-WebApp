/**
 * Renombra carpetas + PDFs de Suite Mujeres Argentinas en Para acomodar.
 * Copias ya hechas — no split/crop IMSLP; no copiar_carpeta_a_archivo.
 */
import { existsSync, readdirSync, renameSync } from "fs";
import { join } from "path";
import {
  canonicalPartFilename,
  renameAudioFilesInFolder,
  renameFolderIfNeeded,
} from "./lib/pdfPartsRenaming.mjs";
import {
  PARA_ACOMODAR_ROOT,
  RAMIREZ_ZIGARAN_WORKS,
  SUITE_PARENT_FOLDER,
  inferInstrumentFromFilename,
  targetFolderName,
  tituloPlain,
} from "./lib/ramirezZigaranCatalog.mjs";

const dryRun = process.argv.includes("--dry-run");

function foldName(s) {
  return String(s || "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function suiteRoot() {
  const exact = join(PARA_ACOMODAR_ROOT, SUITE_PARENT_FOLDER);
  if (existsSync(exact)) return exact;
  if (!existsSync(PARA_ACOMODAR_ROOT)) {
    throw new Error(`No existe Para acomodar: ${PARA_ACOMODAR_ROOT}`);
  }
  const hit = readdirSync(PARA_ACOMODAR_ROOT, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .find((n) => /ramirez/i.test(foldName(n)) && /zigar/i.test(foldName(n)));
  if (!hit) {
    throw new Error(
      `No se encuentra carpeta suite en Para acomodar: ${SUITE_PARENT_FOLDER}`,
    );
  }
  return join(PARA_ACOMODAR_ROOT, hit);
}

function findWorkDir(parent, work) {
  const target = targetFolderName(work);
  const targetPath = join(parent, target);
  if (existsSync(targetPath)) return { dir: targetPath, name: target, already: true };

  const dirs = readdirSync(parent, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
  const want = foldName(work.sourceFolder);
  const legacyNames = [
    `Ramírez, A. - ${tituloPlain(work.songTitle)}`,
    `Tradicional - ${tituloPlain(work.songTitle)}`,
    work.sourceFolder,
  ].map(foldName);
  const hit =
    dirs.find((n) => legacyNames.includes(foldName(n))) ||
    dirs.find((n) => foldName(n) === want) ||
    dirs.find((n) => foldName(n).includes(want)) ||
    dirs.find((n) => want.includes(foldName(n)));
  if (!hit) return null;
  return { dir: join(parent, hit), name: hit, already: false };
}

function renamePdfs(workDir, work, dry) {
  const pdfs = readdirSync(workDir).filter((f) => /\.pdf$/i.test(f));
  const results = [];
  const used = new Set();

  for (const file of pdfs.sort((a, b) => a.localeCompare(b, "es"))) {
    const instrument = inferInstrumentFromFilename(file);
    if (!instrument) {
      results.push({ action: "skip-unknown", file });
      continue;
    }
    let target = canonicalPartFilename(
      instrument,
      null,
      tituloPlain(work.songTitle),
      work.composerTag,
    );
    if (used.has(foldName(target))) {
      results.push({ action: "skip-dup", file, target });
      continue;
    }
    used.add(foldName(target));

    if (foldName(file) === foldName(target)) {
      results.push({ action: "ok", file: target });
      continue;
    }
    const dst = join(workDir, target);
    if (existsSync(dst) && foldName(file) !== foldName(target)) {
      results.push({ action: "skip-collision", file, target });
      continue;
    }
    if (dry) {
      results.push({ action: "rename", from: file, to: target });
    } else {
      renameSync(join(workDir, file), dst);
      results.push({ action: "rename", from: file, to: target });
    }
  }
  return results;
}

let parent = suiteRoot();
const parentDir = PARA_ACOMODAR_ROOT;
const parentName = parent.split(/[/\\]/).pop();
if (parentName.normalize("NFC") !== SUITE_PARENT_FOLDER.normalize("NFC")) {
  const dest = join(parentDir, SUITE_PARENT_FOLDER);
  if (dryRun) {
    console.log(`[PARENT] ${parentName} → ${SUITE_PARENT_FOLDER}`);
  } else if (!existsSync(dest)) {
    renameSync(parent, dest);
    parent = dest;
    console.log(`[PARENT] ${parentName} → ${SUITE_PARENT_FOLDER}`);
  }
}
console.log(`Suite local: ${parent}`);
console.log(dryRun ? "=== DRY RUN ===" : "=== APLICANDO ===");

let foldersRenamed = 0;
let pdfsRenamed = 0;
let audiosRenamed = 0;
let skipped = 0;

for (const work of RAMIREZ_ZIGARAN_WORKS) {
  const found = findWorkDir(parent, work);
  const target = targetFolderName(work);
  console.log(`\n--- ${work.songTitle} ---`);
  if (!found) {
    console.warn(`  Omitida (no existe carpeta): ${work.sourceFolder}`);
    skipped += 1;
    continue;
  }

  let workDir = found.dir;
  if (!found.already && found.name !== target) {
    if (dryRun) {
      console.log(`  [FOLDER] ${found.name} → ${target}`);
      foldersRenamed += 1;
    } else {
      const result = renameFolderIfNeeded(parent, found.name, target, false);
      if (result) {
        console.log(`  [FOLDER] ${result.from} → ${result.to}`);
        foldersRenamed += 1;
      }
      workDir = join(parent, target);
    }
  } else {
    console.log(`  OK carpeta: ${target}`);
  }

  const dirForPdfs = dryRun && !found.already ? found.dir : workDir;
  if (!existsSync(dirForPdfs)) {
    console.warn(`  Sin dir local aún: ${dirForPdfs}`);
    continue;
  }

  const renames = renamePdfs(dirForPdfs, work, dryRun);
  for (const r of renames) {
    if (r.action === "rename") {
      console.log(`  ${r.from} → ${r.to}`);
      pdfsRenamed += 1;
    } else if (r.action === "ok") {
      console.log(`  OK: ${r.file}`);
    } else if (r.action === "skip-unknown") {
      console.warn(`  Sin instrumento: ${r.file}`);
      skipped += 1;
    } else {
      console.warn(`  ${r.action}: ${r.file}${r.target ? ` → ${r.target}` : ""}`);
      skipped += 1;
    }
  }

  const audioRenames = renameAudioFilesInFolder(dirForPdfs, { dryRun });
  for (const r of audioRenames) {
    if (r.action === "rename") {
      console.log(`  [AUDIO] ${r.from} → ${r.to}`);
      audiosRenamed += 1;
    } else if (r.action === "ok") {
      console.log(`  OK audio: ${r.file}`);
    } else {
      console.warn(`  [AUDIO] ${r.action}: ${r.file}${r.target ? ` → ${r.target}` : ""}`);
      skipped += 1;
    }
  }
}

console.log(
  `\nListo. Carpetas: ${foldersRenamed}, PDFs: ${pdfsRenamed}, audio: ${audiosRenamed}, omitidos: ${skipped}`,
);
