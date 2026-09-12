/**
 * Unzip + rename canónico Farías Nocturno → Para acomodar.
 * PDFs ya separados (Universal Edition); sin split/crop.
 *
 *   node scripts/process-farias-nocturno-local.mjs --dry-run
 *   node scripts/process-farias-nocturno-local.mjs
 */
import { execFileSync } from "child_process";
import { existsSync, mkdirSync, readdirSync, renameSync } from "fs";
import { join } from "path";
import { canonicalPartFilename } from "./lib/pdfPartsRenaming.mjs";
import {
  FARIAS_NOCTURNO_SOURCE_ZIP,
  FARIAS_NOCTURNO_WORK,
  PARA_ACOMODAR_ROOT,
} from "./lib/fariasNocturnoCatalog.mjs";

const dryRun = process.argv.includes("--dry-run");

function foldName(s) {
  return String(s || "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function unzipWithPython(zipPath, destDir) {
  const py = `
import zipfile, sys
from pathlib import Path
z, d = sys.argv[1], Path(sys.argv[2])
d.mkdir(parents=True, exist_ok=True)
with zipfile.ZipFile(z) as zf:
    zf.extractall(d)
`.trim();
  execFileSync("python", ["-c", py, zipPath, destDir], { stdio: "inherit" });
}

function listPdfsRecursive(dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, name.name);
    if (name.isDirectory()) out.push(...listPdfsRecursive(full));
    else if (/\.pdf$/i.test(name.name)) out.push({ dir, name: name.name, full });
  }
  return out;
}

function flattenExtractedPdfs(rootDir) {
  const files = listPdfsRecursive(rootDir);
  for (const f of files) {
    if (foldName(f.dir) === foldName(rootDir)) continue;
    const dest = join(rootDir, f.name);
    if (existsSync(dest)) continue;
    renameSync(f.full, dest);
    console.log(`  [FLAT] ${f.name}`);
  }
}

function findPdf(dir, wantedNames) {
  if (!existsSync(dir)) return null;
  const pdfs = readdirSync(dir).filter((f) => /\.pdf$/i.test(f));
  for (const wanted of wantedNames) {
    const want = foldName(wanted);
    const exact = pdfs.find((f) => foldName(f) === want);
    if (exact) return exact;
    const wantNoExt = want.replace(/\.pdf$/i, "");
    const hit = pdfs.find((f) => foldName(f).replace(/\.pdf$/i, "") === wantNoExt);
    if (hit) return hit;
  }
  return null;
}

const work = FARIAS_NOCTURNO_WORK;
const targetDir = join(PARA_ACOMODAR_ROOT, work.targetFolder);

console.log(`ZIP: ${FARIAS_NOCTURNO_SOURCE_ZIP}`);
console.log(`Destino: ${targetDir}`);
console.log(dryRun ? "=== DRY RUN ===" : "=== APLICANDO ===");

if (!existsSync(FARIAS_NOCTURNO_SOURCE_ZIP)) {
  throw new Error(`No se encuentra el ZIP: ${FARIAS_NOCTURNO_SOURCE_ZIP}`);
}

function canonicalName(instrument) {
  return canonicalPartFilename(
    instrument,
    work.workNumber,
    work.titulo,
    work.composerTag,
  );
}

const alreadyDone =
  existsSync(targetDir) &&
  work.renames.every((item) => existsSync(join(targetDir, canonicalName(item.instrument))));

if (alreadyDone) {
  console.log("\n--- Carpeta ya canónica; se omite unzip ---");
} else if (!dryRun) {
  mkdirSync(targetDir, { recursive: true });
  console.log("\n--- Extraer ZIP ---");
  unzipWithPython(FARIAS_NOCTURNO_SOURCE_ZIP, targetDir);
  flattenExtractedPdfs(targetDir);
} else {
  console.log("\n--- Extraer ZIP (preview) ---");
  console.log("  [UNZIP] → carpeta destino");
}

const meta = {
  workNumber: work.workNumber,
  workTitle: work.titulo,
  composerTag: work.composerTag,
};

console.log("\n--- Renombrar canónicamente ---");
let renamed = 0;
let missing = 0;
for (const item of work.renames) {
  const targetName = canonicalPartFilename(
    item.instrument,
    meta.workNumber,
    meta.workTitle,
    meta.composerTag,
  );
  const dst = join(targetDir, targetName);
  if (existsSync(dst)) {
    console.log(`  OK: ${targetName}`);
    continue;
  }
  const found = findPdf(targetDir, item.pdfs);
  if (!found) {
    console.warn(`  Omitido (no existe): ${item.pdfs[0]}`);
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
  if (existsSync(dst)) {
    console.warn(`  Colisión omitida: ${found} → ${targetName}`);
    continue;
  }
  renameSync(join(targetDir, found), dst);
  console.log(`  ${found} → ${targetName}`);
  renamed += 1;
}

const leftover = existsSync(targetDir)
  ? readdirSync(targetDir).filter(
      (f) => /\.pdf$/i.test(f) && !work.renames.some((item) => {
        const canonical = canonicalPartFilename(
          item.instrument,
          meta.workNumber,
          meta.workTitle,
          meta.composerTag,
        );
        return foldName(f) === foldName(canonical);
      }),
    )
  : [];
for (const extra of leftover) {
  console.warn(`  Sin mapa (queda como está): ${extra}`);
}

const pdfs = existsSync(targetDir)
  ? readdirSync(targetDir).filter((f) => /\.pdf$/i.test(f))
  : [];
console.log(
  `\nListo. ${pdfs.length} PDFs | renames=${renamed} omitidos=${missing}`,
);
console.log("Próximo: esperar sync Drive → node scripts/generate-farias-nocturno-sync.mjs");
