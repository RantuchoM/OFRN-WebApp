/**
 * Copia el zip de folklore a CUERDAS con nombres canónicos.
 * Si Llega A Ser Tucumana [cuerdas] va a su carpeta; no pisa el arreglo de percusión.
 *
 *   node scripts/process-cuerdas-folklore-lote-local.mjs [--dry-run]
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, copyFileSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { canonicalPartFilename } from "./lib/pdfPartsRenaming.mjs";
import {
  CUERDAS_FOLKLORE_WORKS,
  CUERDAS_ROOT,
  CUERDAS_ZIP,
} from "./lib/cuerdasFolkloreLoteCatalog.mjs";

const dryRun = process.argv.includes("--dry-run");
const root = dirname(fileURLToPath(import.meta.url));

function extractTo() {
  const py = String.raw`
import json, sys, zipfile, os, re, unicodedata, io
from pathlib import Path
outer = zipfile.ZipFile(sys.argv[1])
dest = Path(sys.argv[2])
dest.mkdir(parents=True, exist_ok=True)
def fold(s):
    s = unicodedata.normalize("NFD", s)
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return s.lower()
def instrument(name):
    n = fold(os.path.basename(name))
    if "score" in n:
        return "SCORE"
    if re.search(r"violin\s*(ii|2)\b", n):
        return "Violín 2"
    if re.search(r"violin\s*(i|1)\b", n):
        return "Violín 1"
    if "viola" in n:
        return "Viola"
    if "violoncello" in n or re.search(r"\bcello\b", n):
        return "Violoncello"
    if "contrabajo" in n or "double bass" in n:
        return "Contrabajo"
    return None
def work_key(name):
    n = fold(name)
    if "abuelita" in n: return "abuelita"
    if "pastorcita" in n: return "pastorcita"
    if "nochera" in n: return "nochera"
    if "tucumana" in n: return "tucumana"
    return None
manifest = []
for info in outer.infolist():
    key = work_key(info.filename)
    inner = zipfile.ZipFile(io.BytesIO(outer.read(info)))
    for e in inner.infolist():
        base = os.path.basename(e.filename.replace("\\", "/"))
        if not base or e.is_dir() or not base.lower().endswith(".pdf"):
            continue
        inst = instrument(base)
        raw = inner.read(e)
        slot = dest / f"{key}__{inst or 'unknown'}.pdf"
        slot.write_bytes(raw)
        manifest.append({"work": key, "instrument": inst, "source": base, "path": str(slot), "bytes": len(raw)})
print(json.dumps(manifest, ensure_ascii=False))
`;
  const staging = join(root, ".tmp-cuerdas-folklore");
  mkdirSync(staging, { recursive: true });
  const res = spawnSync("python", ["-c", py, CUERDAS_ZIP, staging], {
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
  });
  if (res.status !== 0) {
    console.error(res.stderr || res.stdout);
    process.exit(res.status || 1);
  }
  const start = res.stdout.lastIndexOf("[");
  return { staging, manifest: JSON.parse(res.stdout.slice(start)) };
}

function place(src, dest) {
  if (existsSync(dest)) {
    const same = statSync(src).size === statSync(dest).size;
    console.log(`  ${same ? "ya está" : "DISTINTO, no pisa"}: ${dest}`);
    return same ? "exists" : "conflict";
  }
  console.log(`  ${dryRun ? "dry" : "copia"}: ${dest}`);
  if (!dryRun) {
    mkdirSync(dirname(dest), { recursive: true });
    copyFileSync(src, dest);
  }
  return "copied";
}

if (!existsSync(CUERDAS_ZIP)) {
  console.error("No está el zip:", CUERDAS_ZIP);
  process.exit(1);
}

const { manifest } = extractTo();
console.log(`Extraídos ${manifest.length} PDF`);

for (const work of CUERDAS_FOLKLORE_WORKS) {
  const folder = join(CUERDAS_ROOT, work.targetFolder);
  console.log(`\n=== ${work.targetFolder} ===`);
  if (!dryRun) mkdirSync(folder, { recursive: true });
  const rows = manifest.filter((m) => m.work === work.key);
  for (const row of rows) {
    if (!row.instrument) {
      console.warn("  Sin instrumento:", row.source);
      continue;
    }
    if (row.instrument === "SCORE" && !work.includeScore) {
      console.warn("  Score inesperado:", row.source);
      continue;
    }
    const name = canonicalPartFilename(
      row.instrument,
      null,
      work.workTitle,
      work.composerTag,
    );
    place(row.path, join(folder, name));
  }
}
