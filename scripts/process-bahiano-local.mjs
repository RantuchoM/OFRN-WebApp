/**
 * Unifica Partes + Scores + Audios Refe en 16 carpetas canónicas y renombra PDFs/audio.
 */
import {
  existsSync,
  mkdirSync,
  readdirSync,
  renameSync,
  rmdirSync,
  statSync,
} from "fs";
import { join } from "path";
import {
  canonicalAudioFilename,
  canonicalPartFilename,
  renameAudioFilesInFolder,
} from "./lib/pdfPartsRenaming.mjs";
import {
  BAHIANO_PARENT_FOLDER,
  BAHIANO_WORKS,
  COMPOSER_TAG,
  PARA_ACOMODAR_ROOT,
  canonicalAudioBase,
  inferInstrumentFromFilename,
  targetFolderName,
} from "./lib/bahianoCatalog.mjs";

const dryRun = process.argv.includes("--dry-run");

function foldName(s) {
  return String(s || "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function findDir(parent, wanted) {
  if (!parent || !existsSync(parent)) return null;
  const exact = join(parent, wanted);
  if (existsSync(exact)) return exact;
  const hit = readdirSync(parent, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .find((n) => foldName(n) === foldName(wanted) || foldName(n).startsWith(foldName(wanted).slice(0, 8)));
  return hit ? join(parent, hit) : null;
}

function findFile(dir, wanted) {
  if (!dir || !existsSync(dir)) return null;
  const exact = join(dir, wanted);
  if (existsSync(exact)) return exact;
  const want = foldName(wanted);
  const hit = readdirSync(dir).find((n) => foldName(n) === want);
  return hit ? join(dir, hit) : null;
}

function moveFile(src, dstDir, destName, dry) {
  if (!src || !existsSync(src)) return { action: "missing", destName };
  const dest = join(dstDir, destName);
  if (foldName(src) === foldName(dest)) return { action: "ok", destName };
  if (existsSync(dest)) {
    return { action: "skip-exists", destName };
  }
  if (dry) return { action: "move", from: src, to: dest };
  if (!existsSync(dstDir)) mkdirSync(dstDir, { recursive: true });
  renameSync(src, dest);
  return { action: "move", from: src, to: dest };
}

function removeEmptyDir(dir) {
  if (!dir || !existsSync(dir) || dryRun) return;
  try {
    const left = readdirSync(dir);
    if (left.length === 0) rmdirSync(dir);
  } catch {
    /* ignore */
  }
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
    let target = canonicalPartFilename(instrument, null, work.titulo, COMPOSER_TAG);
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
    if (existsSync(dst)) {
      results.push({ action: "skip-collision", file, target });
      continue;
    }
    if (!dry) renameSync(join(workDir, file), dst);
    results.push({ action: "rename", from: file, to: target });
  }
  return results;
}

const parent = findDir(PARA_ACOMODAR_ROOT, BAHIANO_PARENT_FOLDER);
if (!parent) {
  throw new Error(`No se encuentra ${BAHIANO_PARENT_FOLDER} en ${PARA_ACOMODAR_ROOT}`);
}

const partesRoot = findDir(parent, "Partes");
const scoresRoot = findDir(parent, "Scores");
const audiosRoot =
  findDir(parent, "Audios Refe") ||
  findDir(parent, "Audios") ||
  readdirSync(parent, { withFileTypes: true })
    .filter((d) => d.isDirectory() && /audio/i.test(d.name))
    .map((d) => join(parent, d.name))[0];

console.log(`Bahiano local: ${parent}`);
console.log(`  Partes: ${partesRoot || "(no)"}`);
console.log(`  Scores: ${scoresRoot || "(no)"}`);
console.log(`  Audios: ${audiosRoot || "(no)"}`);
console.log(dryRun ? "=== DRY RUN ===" : "=== APLICANDO ===");

for (const work of BAHIANO_WORKS) {
  const target = targetFolderName(work);
  const workDir = join(parent, target);
  console.log(`\n--- ${work.orden}. ${work.titulo} ---`);
  console.log(`  Carpeta: ${target}`);

  if (!dryRun && !existsSync(workDir)) mkdirSync(workDir, { recursive: true });

  const srcPartes = partesRoot ? findDir(partesRoot, work.partesFolder) : null;
  if (srcPartes) {
    const files = readdirSync(srcPartes).filter((f) => statSync(join(srcPartes, f)).isFile());
    for (const f of files) {
      if (/^desktop\.ini$/i.test(f) || /\.(mp3|wav|m4a)$/i.test(f)) continue;
      const r = moveFile(join(srcPartes, f), workDir, f, dryRun);
      if (r.action === "move") console.log(`  [PARTE] ${f}`);
      else if (r.action !== "ok" && r.action !== "skip-exists") {
        console.warn(`  ${r.action}: ${f}`);
      }
    }
    if (!dryRun) removeEmptyDir(srcPartes);
  } else {
    console.warn(`  Sin carpeta Partes: ${work.partesFolder}`);
  }

  if (scoresRoot) {
    const score = findFile(scoresRoot, work.scoreFile);
    if (score) {
      const r = moveFile(score, workDir, work.scoreFile, dryRun);
      if (r.action === "move") console.log(`  [SCORE] ${work.scoreFile}`);
      else if (r.action !== "ok" && r.action !== "skip-exists") {
        console.warn(`  SCORE ${r.action}: ${work.scoreFile}`);
      }
    } else {
      console.warn(`  Sin score: ${work.scoreFile}`);
    }
  }

  if (audiosRoot) {
    const audio = findFile(audiosRoot, work.audioFile);
    if (audio) {
      const wanted = canonicalAudioFilename(
        `${canonicalAudioBase(work)}.${work.audioFile.split(".").pop()}`,
      );
      const r = moveFile(audio, workDir, wanted || work.audioFile, dryRun);
      if (r.action === "move") console.log(`  [AUDIO] ${wanted || work.audioFile}`);
      else if (r.action !== "ok" && r.action !== "skip-exists") {
        console.warn(`  AUDIO ${r.action}: ${work.audioFile}`);
      }
    } else {
      console.warn(`  Sin audio: ${work.audioFile}`);
    }
  }

  if (!dryRun && existsSync(workDir)) {
    const pdfs = renamePdfs(workDir, work, false);
    for (const r of pdfs) {
      if (r.action === "rename") console.log(`  ${r.from} → ${r.to}`);
      else if (r.action === "skip-unknown") console.warn(`  PDF desconocido: ${r.file}`);
    }
    const audios = renameAudioFilesInFolder(workDir, { dryRun: false });
    for (const r of audios) {
      if (r.action === "rename") console.log(`  ${r.from} → ${r.to}`);
    }
    const left = readdirSync(workDir);
    console.log(`  Archivos: ${left.length}`);
  } else if (dryRun) {
    console.log("  (preview: se unifica + renombra al aplicar)");
  }
}

if (!dryRun) {
  if (partesRoot) {
    for (const d of readdirSync(partesRoot, { withFileTypes: true })) {
      if (d.isDirectory()) removeEmptyDir(join(partesRoot, d.name));
    }
    removeEmptyDir(partesRoot);
  }
  removeEmptyDir(scoresRoot);
  removeEmptyDir(audiosRoot);
}

console.log("\nListo.");
