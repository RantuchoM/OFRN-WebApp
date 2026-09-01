/**
 * Charbonnier cello concerto — split 3 movs → merge por instrumento → rename.
 */
import { execFileSync, execSync } from "child_process";
import {
  existsSync,
  readdirSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "fs";
import { basename, dirname, join } from "path";
import { fileURLToPath } from "url";
import {
  canonicalPartFilename,
  renameFolderIfNeeded,
  safeFileName,
} from "./lib/pdfPartsRenaming.mjs";
import {
  CHARBONNIER_CELLO_WORK,
  PARA_ACOMODAR_ROOT,
} from "./lib/charbonnierCelloCatalog.mjs";

const SPLIT_SCRIPT =
  process.env.SPLIT_PARTS_SCRIPT ||
  "c:\\Users\\marti\\Downloads\\Cursor - Proyectos\\scripts\\split_and_rename_parts.py";

const MERGE_HELPER = join(
  dirname(fileURLToPath(import.meta.url)),
  "lib",
  "merge_pdfs.py",
);

const dryRun = process.argv.includes("--dry-run");
const work = CHARBONNIER_CELLO_WORK;

function resolveWorkDir() {
  const target = join(PARA_ACOMODAR_ROOT, work.targetFolder);
  if (existsSync(target)) return target;
  const src = join(PARA_ACOMODAR_ROOT, work.sourceFolder);
  if (existsSync(src)) {
    if (!dryRun && work.sourceFolder !== work.targetFolder) {
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

function runSplit(workDir, split) {
  const pdfPath = join(workDir, split.pdf);
  if (!existsSync(pdfPath)) {
    console.warn(`  Omitido (no existe): ${split.pdf}`);
    return [];
  }
  const outFiles = [];
  if (dryRun) {
    for (const p of split.parts) {
      console.log(
        `  [SPLIT mov${split.mov}] ${p.instrument} (${p.start}-${p.end})`,
      );
    }
    return outFiles;
  }

  const manifest = { parts: split.parts };
  const manifestPath = join(workDir, `${split.pdf}.manifest.json`);
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf8");
  execSync(
    `python "${SPLIT_SCRIPT}" --work-dir "${workDir}" --input "${pdfPath}" --manifest "${manifestPath}" --split-only`,
    { stdio: "inherit" },
  );
  unlinkSync(pdfPath);
  unlinkSync(manifestPath);

  // El splitter escribe "{instrument} - raw split.pdf"
  for (const p of split.parts) {
    const rawName = `${p.instrument} - raw split.pdf`;
    const hitPath = join(workDir, rawName);
    let srcPath = existsSync(hitPath) ? hitPath : null;
    if (!srcPath) {
      const found = readdirSync(workDir).find(
        (f) =>
          /\.pdf$/i.test(f) &&
          f.toLowerCase().includes("raw split") &&
          f.toLowerCase().startsWith(p.instrument.toLowerCase()),
      );
      if (found) srcPath = join(workDir, found);
    }
    if (!srcPath) {
      console.warn(`  No hallado split: ${p.instrument} (mov${split.mov})`);
      continue;
    }
    const tmp = join(
      workDir,
      `_tmp_m${split.mov}_${safeFileName(p.instrument)}.pdf`,
    );
    renameSync(srcPath, tmp);
    outFiles.push({ instrument: p.instrument, mov: split.mov, path: tmp });
  }
  return outFiles;
}

function mergeByInstrument(workDir, tmpParts) {
  const byInst = new Map();
  for (const t of tmpParts) {
    if (!byInst.has(t.instrument)) byInst.set(t.instrument, []);
    byInst.get(t.instrument).push(t);
  }

  const meta = {
    workNumber: work.workNumber,
    workTitle: work.titulo,
    composerTag: work.composerTag,
  };

  for (const [instrument, list] of [...byInst.entries()].sort((a, b) =>
    a[0].localeCompare(b[0], "es"),
  )) {
    list.sort((a, b) => a.mov - b.mov);
    const paths = list.map((x) => x.path).filter((p) => existsSync(p));
    if (!paths.length) continue;
    const outName = canonicalPartFilename(
      instrument,
      meta.workNumber,
      meta.workTitle,
      meta.composerTag,
    );
    const outPath = join(workDir, outName);
    if (dryRun) {
      console.log(
        `  [MERGE] ${instrument}: movs ${list.map((x) => x.mov).join("+")} → ${outName}`,
      );
      continue;
    }
    if (paths.length === 1) {
      renameSync(paths[0], outPath);
      console.log(`  [KEEP] ${instrument} (1 mov) → ${outName}`);
      continue;
    }
    console.log(`  [MERGE] ${instrument} (${paths.length} movs)…`);
    execFileSync("python", [MERGE_HELPER, outPath, ...paths], {
      stdio: "inherit",
    });
    for (const p of paths) unlinkSync(p);
  }
}

function renameScore(workDir) {
  const src = join(workDir, work.scorePdf);
  if (!existsSync(src)) {
    console.warn(`  SCORE fuente no encontrada: ${work.scorePdf}`);
    return;
  }
  const dest = canonicalPartFilename(
    "SCORE",
    work.workNumber,
    work.titulo,
    work.composerTag,
  );
  if (dryRun) {
    console.log(`  [SCORE] ${work.scorePdf} → ${dest}`);
    return;
  }
  const dst = join(workDir, dest);
  if (basename(src) !== dest) renameSync(src, dst);
  console.log(`  SCORE → ${dest}`);
}

function detectAudioExt(filePath) {
  try {
    const out = execFileSync(
      "python",
      [
        "-c",
        `import sys; b=open(sys.argv[1],'rb').read(16); print(b[:12])`,
        filePath,
      ],
      { encoding: "utf8", timeout: 15000 },
    );
    const s = String(out);
    if (/ftyp|isom|mp4|M4A/i.test(s)) return ".m4a";
    if (s.includes("ID3") || /\\xff\\xfb|\\xff\\xf3/.test(s)) return ".mp3";
    if (s.includes("RIFF") || s.includes("WAVE")) return ".wav";
    if (s.includes("OggS")) return ".ogg";
  } catch {
    /* ignore */
  }
  return ".wav";
}

function renameAudios(workDir) {
  for (const a of work.audioSources || []) {
    const src = join(workDir, a.from);
    if (!existsSync(src)) {
      console.warn(`  Audio no encontrado: ${a.from}`);
      continue;
    }
    const ext = dryRun ? ".wav" : detectAudioExt(src);
    const base = `AUDIO - ${work.titulo} - ${a.label} - ${work.composerTag}${ext}`;
    const destName = safeFileName(base);
    if (dryRun) {
      console.log(`  [AUDIO] ${a.from} → ${destName}`);
      continue;
    }
    const dst = join(workDir, destName);
    renameSync(src, dst);
    console.log(`  AUDIO → ${destName}`);
  }
}

const workDir = resolveWorkDir();
console.log(`Para acomodar / Charbonnier cello: ${workDir}`);
console.log(dryRun ? "=== DRY RUN ===" : "=== APLICANDO ===");

console.log("\n--- Split por movimiento ---");
const allTmp = [];
for (const split of work.splits) {
  allTmp.push(...runSplit(workDir, split));
}

console.log("\n--- Merge I+II+III por instrumento ---");
mergeByInstrument(workDir, allTmp);

console.log("\n--- SCORE ---");
renameScore(workDir);

console.log("\n--- Audios ---");
renameAudios(workDir);

if (!dryRun) {
  // Limpieza de leftovers tmp
  for (const f of readdirSync(workDir)) {
    if (/^_tmp_m\d+_/.test(f) || /\.manifest\.json$/i.test(f)) {
      unlinkSync(join(workDir, f));
    }
  }
}

const pdfs = readdirSync(workDir).filter((f) => /\.pdf$/i.test(f));
const audios = readdirSync(workDir).filter((f) =>
  /\.(mp3|wav|m4a|ogg|flac)$/i.test(f),
);
console.log(`\nListo. ${pdfs.length} PDFs, ${audios.length} audios.`);
