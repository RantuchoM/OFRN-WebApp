/**
 * Fase 1 (solo lectura): inventario recursivo de `H:\Mi unidad\Archivo - para organizar`.
 * Salida: JSON (default %TEMP%\ofrn_inv\inventory.json).
 *
 *   node scripts/_tmp_inventory_para_organizar.mjs [out.json]
 *
 * Unidad = carpeta con PDFs (u otros archivos de partitura) directos, archivo comprimido o PDF suelto en raíz.
 */
import fs from "fs";
import os from "os";
import path from "path";
import { execFileSync } from "child_process";

const ROOT = process.env.ARCHIVO_PARA_ORGANIZAR_ROOT || "H:\\Mi unidad\\Archivo - para organizar";
const OUT = process.argv[2] || path.join(os.tmpdir(), "ofrn_inv", "inventory.json");
fs.mkdirSync(path.dirname(OUT), { recursive: true });

const SRC_EXT = new Set([".mus", ".sib", ".musx", ".mscz", ".mxl", ".musicxml", ".xml", ".mid", ".midi", ".ptb", ".gp5", ".gpx", ".enc", ".fin"]);
const AUDIO_EXT = new Set([".mp3", ".wav", ".m4a", ".flac", ".ogg"]);
const ARCH_EXT = new Set([".zip", ".rar", ".7z", ".tar", ".gz", ".tgz"]);
const IGNORE = new Set(["desktop.ini", "thumbs.db", ".ds_store"]);

function listDir(p) {
  try {
    return fs.readdirSync(p, { withFileTypes: true });
  } catch (e) {
    return [];
  }
}
function statSize(p) {
  try {
    return fs.statSync(p).size;
  } catch {
    return 0;
  }
}

const units = [];
const archives = [];

function walk(dir, rel) {
  const ents = listDir(dir).filter((e) => !IGNORE.has(e.name.toLowerCase()));
  const files = ents.filter((e) => e.isFile());
  const dirs = ents.filter((e) => e.isDirectory());
  const pdfs = files.filter((f) => /\.pdf$/i.test(f.name));
  const src = files.filter((f) => SRC_EXT.has(path.extname(f.name).toLowerCase()));
  const audio = files.filter((f) => AUDIO_EXT.has(path.extname(f.name).toLowerCase()));
  const arch = files.filter((f) => ARCH_EXT.has(path.extname(f.name).toLowerCase()));
  const lnk = files.filter((f) => /\.lnk$/i.test(f.name));
  const other = files.filter((f) => !pdfs.includes(f) && !src.includes(f) && !audio.includes(f) && !arch.includes(f) && !lnk.includes(f));

  for (const a of arch) {
    const full = path.join(dir, a.name);
    archives.push({ path: full, rel: path.join(rel, a.name), name: a.name, size: statSize(full), parentRel: rel });
  }

  const hasPayload = pdfs.length > 0 || src.length > 0 || audio.length > 0;
  const childRelIdx = [];
  // Recursar primero para saber si es contenedor
  const before = units.length;
  for (const d of dirs) walk(path.join(dir, d.name), path.join(rel, d.name));
  const childUnits = units.slice(before).filter((u) => u.parentRel === rel);
  const descendantPdfs = units.slice(before).reduce((s, u) => s + (u.pdfDirect || 0), 0);

  if (hasPayload) {
    units.push({
      type: "folder",
      path: dir,
      rel,
      parentRel: path.dirname(rel) === "." ? "" : path.dirname(rel),
      name: path.basename(dir),
      pdfDirect: pdfs.length,
      srcDirect: src.length,
      audioDirect: audio.length,
      otherDirect: other.length,
      archDirect: arch.length,
      childUnits: childUnits.length,
      descendantPdfs,
      sampleFiles: pdfs.slice(0, 6).map((f) => f.name),
      pdfNames: pdfs.map((f) => f.name),
      sampleSrc: src.slice(0, 3).map((f) => f.name),
    });
  }
}

const rootEnts = listDir(ROOT).filter((e) => !IGNORE.has(e.name.toLowerCase()));
const looseRoot = [];
for (const e of rootEnts) {
  const full = path.join(ROOT, e.name);
  if (e.isDirectory()) walk(full, e.name);
  else if (e.isFile()) {
    const ext = path.extname(e.name).toLowerCase();
    if (ARCH_EXT.has(ext)) archives.push({ path: full, rel: e.name, name: e.name, size: statSize(full), parentRel: "" });
    else if (ext === ".pdf") looseRoot.push({ type: "pdf-suelto", path: full, rel: e.name, parentRel: "", name: e.name, size: statSize(full), pdfDirect: 1 });
    else looseRoot.push({ type: "otro-suelto", path: full, rel: e.name, parentRel: "", name: e.name, size: statSize(full), pdfDirect: 0, ext });
  }
}

// Inspección de archivos comprimidos (solo listado; no extrae)
function listArchive(p) {
  try {
    const out = execFileSync("tar", ["-tf", p], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024, timeout: 120000, stdio: ["ignore", "pipe", "pipe"] });
    const names = out.split(/\r?\n/).filter(Boolean);
    return { ok: true, entries: names };
  } catch (e) {
    return { ok: false, error: String(e.message || e).split("\n")[0].slice(0, 160) };
  }
}
for (const a of archives) {
  const r = listArchive(a.path);
  a.listed = r.ok;
  a.error = r.error || null;
  if (r.ok) {
    const e = r.entries;
    a.entryCount = e.length;
    a.pdfCount = e.filter((n) => /\.pdf$/i.test(n)).length;
    a.srcCount = e.filter((n) => SRC_EXT.has(path.extname(n).toLowerCase())).length;
    a.audioCount = e.filter((n) => AUDIO_EXT.has(path.extname(n).toLowerCase())).length;
    a.sampleEntries = e.filter((n) => /\.pdf$/i.test(n)).slice(0, 5);
    a.pdfEntries = e.filter((n) => /\.pdf$/i.test(n));
    const tops = new Set(e.map((n) => n.split("/")[0]).filter(Boolean));
    a.topLevel = [...tops].slice(0, 8);
  }
}

const data = { root: ROOT, scannedAt: new Date().toISOString(), units, looseRoot, archives };
fs.writeFileSync(OUT, JSON.stringify(data, null, 1), "utf8");
console.log("units", units.length, "loose", looseRoot.length, "archives", archives.length, "->", OUT);
const unlisted = archives.filter((a) => !a.listed);
console.log("archives not listable:", unlisted.length);
