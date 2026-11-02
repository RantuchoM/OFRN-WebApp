/**
 * Copia PDFs (y audio) desde Archivo-para-organizar → Para acomodar y renombra
 * a nombres canónicos OFRN (sin split IMSLP; las partes ya vienen por instrumento).
 *
 *   node scripts/process-archivo-para-organizar-local.mjs [--dry-run] [--only=queen,hook,macondo]
 */
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
} from "fs";
import { join, normalize as pathNormalize } from "path";
import { fileURLToPath } from "url";
import {
  canonicalPartFilename,
  extractInstrumentFromExistingName,
  normalizeInstrumentLabel,
  renameAudioFilesInFolder,
} from "./lib/pdfPartsRenaming.mjs";
import {
  ARCHIVO_PARA_ORGANIZAR_WORKS,
  PARA_ACOMODAR_ROOT,
  SOURCE_ROOT,
} from "./lib/archivoParaOrganizarCatalog.mjs";

const dryRun = process.argv.includes("--dry-run");
const only = process.argv
  .filter((a) => a.startsWith("--only="))
  .flatMap((a) => a.slice("--only=".length).toLowerCase().split(","))
  .filter(Boolean);

function foldName(s) {
  return String(s || "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function matchesOnly(work) {
  if (!only.length) return true;
  const hay = `${work.key} ${work.targetFolder}`.toLowerCase();
  return only.some((o) => hay.includes(o));
}

/** Resuelve carpeta fuente aunque el encoding del nombre difiera. */
function resolveSourceDir(work) {
  const exact = join(SOURCE_ROOT, work.sourceRel);
  if (existsSync(exact)) return exact;

  const parts = work.sourceRel.split(/[/\\]/);
  let cur = SOURCE_ROOT;
  for (const part of parts) {
    if (!existsSync(cur)) return null;
    const want = foldName(part);
    const hit = readdirSync(cur, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .find((n) => {
        const f = foldName(n);
        return f === want || f.includes(want.slice(0, Math.min(18, want.length)));
      });
    if (!hit) return null;
    cur = join(cur, hit);
  }
  return existsSync(cur) ? cur : null;
}

function looksLikeInstrument(label) {
  const n = foldName(label);
  if (!n || n.length > 48) return false;
  if (/^(score|partitura|full score)$/.test(n)) return true;
  return /\b(flauta|flute|picc|oboe|clarinet|fagot|bassoon|corno|trompa|horn|trompeta|trumpet|trombon|tuba|arpa|harp|piano|perc|timb|violin|viola|cello|violon|contrabajo|saxo|sax|eufonio|bugle|bombo|redoblante|conga|fliscorno|requinto|score|baritono|euphonium)\b/.test(
    n,
  );
}

/** Quita marcas diacríticas / mojibake frecuente en File Stream (ó → o¦ü / o+mark). */
function sanitizeLabel(s) {
  return String(s || "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/¦/g, "")
    .replace(/o[^a-zA-Z0-9\s]*[uü]n/gi, "on") // Saxofo…n, Trombo…n, Percusio…n
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Inferencia robusta para nombres canónicos, "01. Obra - Flauta 1" y "Leon - 001 Picolo".
 */
export function inferInstrument(fileName) {
  const raw = String(fileName || "").replace(/\.pdf$/i, "");
  const base = sanitizeLabel(raw);
  if (/\bscore\b|partitura|full.?score/i.test(base)) return "SCORE";

  // "01. Macondo - Clarinete en Bb 1" → instrumento tras el primer " - "
  const numberedWork = base.match(/^\d+\s*[.)]\s*[^-]+-\s*(.+)$/i);
  if (numberedWork) {
    const n = normalizeInstrumentLabel(numberedWork[1]);
    if (looksLikeInstrument(n)) return n;
  }

  // "Leon - 001 Picolo" / "Leon - 027 Flisc Baritono 1"
  const leon = base.match(/^leon\s*-\s*\d+\s+(.+)$/i);
  if (leon) {
    let chunk = leon[1];
    if (/^picolo\b/i.test(chunk)) chunk = "Piccolo";
    if (/^clar\s+requinto\b/i.test(chunk)) chunk = "Clarinete Requinto";
    if (/^clarinetes?\s*(\d)\b/i.test(chunk))
      chunk = chunk.replace(/^clarinetes?\s*/i, "Clarinete Bb ");
    if (/^sax\s+soprano\b/i.test(chunk)) chunk = "Saxo Soprano";
    if (/^sax\s+alto\s*(\d)\b/i.test(chunk))
      chunk = chunk.replace(/^sax\s+alto/i, "Saxo Alto");
    if (/^sax\s+tenor\s*(\d)\b/i.test(chunk))
      chunk = chunk.replace(/^sax\s+tenor/i, "Saxo Tenor");
    if (/^sax\s+baritono\b/i.test(chunk)) chunk = "Saxo Barítono";
    if (/^flisc\s*baritono/i.test(chunk)) chunk = "Fliscorno Barítono";
    if (/^flisc/i.test(chunk)) chunk = chunk.replace(/^flisc/i, "Fliscorno");
    if (/^tubas?\b/i.test(chunk)) chunk = "Tuba";
    if (/^contrabajos?\b/i.test(chunk)) chunk = "Contrabajo";
    if (/^block\b/i.test(chunk)) chunk = `Perc ${chunk}`;
    if (/^esterilla\b/i.test(chunk)) chunk = `Perc ${chunk}`;
    if (/^redoblante\b/i.test(chunk)) chunk = "Perc Tambor";
    if (/^bombo\b/i.test(chunk)) chunk = "Perc Bombo";
    if (/^timbales\b/i.test(chunk)) chunk = "Perc Timbal";
    const n = normalizeInstrumentLabel(chunk);
    if (looksLikeInstrument(n) || looksLikeInstrument(chunk)) return n || chunk;
    return n || chunk;
  }

  // Canónico: "Flauta 1 - Título - Compositor"
  const fromExisting = extractInstrumentFromExistingName(raw);
  const existingSan = sanitizeLabel(fromExisting);
  if (looksLikeInstrument(existingSan) && !/^\d/.test(existingSan)) {
    const n = normalizeInstrumentLabel(existingSan);
    // Conservar "1 y 2" / "3 y 4" si normalize colapsó mal
    if (/\b1\s*y\s*2\b/i.test(existingSan) && !/1y2/i.test(n)) {
      const baseInst = n.replace(/\s*\d+$/, "").trim();
      if (/corno/i.test(baseInst)) return "Corno F 1y2";
      if (/trombon/i.test(baseInst)) return "Trombón 1y2";
      return `${baseInst} 1y2`;
    }
    if (/\b3\s*y\s*4\b/i.test(existingSan) && !/3y4/i.test(n)) {
      return "Corno F 3y4";
    }
    return n || existingSan;
  }

  // "La-pollera-colora-Flute-2"
  const hyphenChunks = base.split("-").map((s) => s.trim()).filter(Boolean);
  for (let i = hyphenChunks.length - 1; i >= 0; i--) {
    const chunk = hyphenChunks.slice(i).join(" ");
    const n = normalizeInstrumentLabel(chunk);
    if (looksLikeInstrument(n)) return n;
  }

  const fromFull = normalizeInstrumentLabel(base);
  if (looksLikeInstrument(fromFull)) return fromFull;

  // Violonchelos / plurales
  if (/\bviolonchelos?\b|\bcelli\b/i.test(base)) return "Violoncello";
  if (/\beufonio\b/i.test(base)) return normalizeInstrumentLabel(base) || "Eufonio";

  return fromFull || existingSan || "Parte";
}

function processWork(work) {
  const srcDir = resolveSourceDir(work);
  const dstDir = join(PARA_ACOMODAR_ROOT, work.targetFolder);
  console.log(`\n=== ${work.key}: ${work.targetFolder} ===`);
  if (!srcDir) {
    console.error(`  ERROR: no se encuentra fuente: ${work.sourceRel}`);
    return { ok: false, copied: 0, renamed: 0, skipped: 0 };
  }
  console.log(`  Fuente: ${srcDir}`);
  console.log(`  Destino: ${dstDir}`);

  if (!dryRun) mkdirSync(dstDir, { recursive: true });
  else console.log("  [MKDIR]", dstDir);

  const pdfs = readdirSync(srcDir).filter((f) => /\.pdf$/i.test(f));
  // No copiar "Archivos Varios" sueltos raros; solo PDFs de la carpeta raíz de la obra
  const usedTargets = new Set();
  let copied = 0;
  let renamed = 0;
  let skipped = 0;

  for (const file of pdfs.sort((a, b) => a.localeCompare(b, "es"))) {
    const instrument = inferInstrument(file);
    if (!looksLikeInstrument(instrument) && instrument !== "Parte") {
      console.warn(`  ¿Instrumento dudoso? ${file} → ${instrument}`);
    }
    let target = canonicalPartFilename(
      instrument,
      work.workNumber,
      work.titulo,
      work.composerTag,
    );
    let key = foldName(target);
    if (usedTargets.has(key)) {
      // Colisión: agregar sufijo del nombre original
      const altInst = `${instrument} (${file.replace(/\.pdf$/i, "").slice(0, 24)})`;
      target = canonicalPartFilename(
        normalizeInstrumentLabel(altInst) || altInst,
        work.workNumber,
        work.titulo,
        work.composerTag,
      );
      key = foldName(target);
      if (usedTargets.has(key)) {
        console.warn(`  skip-dup: ${file} → ${target}`);
        skipped += 1;
        continue;
      }
    }
    usedTargets.add(key);

    const dst = join(dstDir, target);
    if (existsSync(dst)) {
      console.log(`  OK: ${target}`);
      continue;
    }

    const src = join(srcDir, file);
    if (dryRun) {
      console.log(`  ${file} → ${target}`);
      copied += 1;
      renamed += 1;
      continue;
    }
    copyFileSync(src, dst);
    copied += 1;
    console.log(`  ${file} → ${target}`);
    renamed += 1;
  }

  // Audio en la misma carpeta
  const audioResults = renameAudioFilesInFolder(dstDir, { dryRun });
  const audioRenamed = audioResults.filter((r) => r.action === "rename").length;
  // Copiar audio fuente si destino vacío de audio
  const srcAudio = readdirSync(srcDir).filter((f) =>
    /\.(mp3|wav|m4a|flac)$/i.test(f),
  );
  for (const a of srcAudio) {
    const dstAudio = join(dstDir, a.startsWith("AUDIO") ? a : `AUDIO - ${a}`);
    if (existsSync(dstAudio)) continue;
    if (dryRun) {
      console.log(`  [audio] ${a}`);
      continue;
    }
    copyFileSync(join(srcDir, a), dstAudio);
  }
  if (!dryRun && srcAudio.length) {
    renameAudioFilesInFolder(dstDir, { dryRun: false });
  }

  const finalPdfs = existsSync(dstDir)
    ? readdirSync(dstDir).filter((f) => /\.pdf$/i.test(f)).length
    : 0;
  console.log(
    `  Listo: pdfs_destino=${finalPdfs} copiados=${copied} audio_renames=${audioRenamed} omitidos=${skipped}`,
  );
  return { ok: true, copied, renamed, skipped, pdfs: finalPdfs };
}

function main() {
  console.log(dryRun ? "=== DRY RUN ===" : "=== APLICANDO ===");
  console.log(`Fuente root: ${SOURCE_ROOT}`);
  console.log(`Destino: ${PARA_ACOMODAR_ROOT}`);

  let failed = 0;
  const summary = [];
  for (const work of ARCHIVO_PARA_ORGANIZAR_WORKS) {
    if (!matchesOnly(work)) continue;
    const r = processWork(work);
    if (!r.ok) failed += 1;
    summary.push({ key: work.key, ...r });
  }

  console.log("\n=== RESUMEN ===");
  for (const s of summary) {
    console.log(
      `  ${s.key}: ok=${s.ok} pdfs=${s.pdfs ?? 0} copied=${s.copied ?? 0}`,
    );
  }
  if (failed) {
    console.error(`\nFallaron ${failed} obras`);
    process.exitCode = 1;
  }
}

if (
  process.argv[1] &&
  pathNormalize(fileURLToPath(import.meta.url)) ===
    pathNormalize(process.argv[1])
) {
  main();
}
