/**
 * Lote orquestal (Para acomodar): divide / recorta / renombra PDFs IMSLP a nombres
 * canónicos en español, según scripts/lib/loteOrquestalesCatalog.mjs (rangos por OCR).
 *
 * Uso:
 *   node scripts/process-lote-orquestales-local.mjs [--dry-run] [--only=carnival,borodin]
 *
 * - Rangos contiguos → split_and_rename_parts.py --manifest --split-only (igual que Beni Mora).
 * - Partes no contiguas (`pages: [..]`) → scripts/lib/extract_pdf_pages.py.
 * - PDF completo de una sola parte → renombre directo (sin reescribir).
 * - `altSubdir` → la parte va a una subcarpeta (versión alternativa) de la carpeta de la obra.
 * Las carpetas de obra NO se renombran.
 */
import { execFileSync } from "child_process";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { canonicalPartFilename } from "./lib/pdfPartsRenaming.mjs";
import {
  LOTE_ORQUESTALES,
  PARA_ACOMODAR_ROOT,
} from "./lib/loteOrquestalesCatalog.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const SPLIT_SCRIPT =
  process.env.SPLIT_PARTS_SCRIPT ||
  "c:\\Users\\marti\\Downloads\\Cursor - Proyectos\\scripts\\split_and_rename_parts.py";
const PDF_TOOL = join(HERE, "lib", "extract_pdf_pages.py");

const dryRun = process.argv.includes("--dry-run");
const only = process.argv
  .filter((a) => a.startsWith("--only="))
  .flatMap((a) => a.slice("--only=".length).toLowerCase().split(","))
  .filter(Boolean);

const PY_ENV = { ...process.env, PYTHONIOENCODING: "utf-8" };

function pageCount(pdfPath) {
  let lastErr;
  for (let attempt = 1; attempt <= 6; attempt++) {
    try {
      return parseInt(
        execFileSync("python", [PDF_TOOL, "count", pdfPath], {
          env: PY_ENV,
          encoding: "utf8",
        }).trim(),
        10,
      );
    } catch (err) {
      lastErr = err;
      // Drive File Stream a veces oculta el archivo un instante tras un rename.
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 800 * attempt);
    }
  }
  throw lastErr;
}

/** Igual que safe_name() de split_and_rename_parts.py. */
function rawSplitName(instrument) {
  const base = `${instrument} - raw split.pdf`
    .replace(/[<>:"/\\|?*]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\.+|\.+$/g, "");
  return base;
}

function matchesOnly(work) {
  if (!only.length) return true;
  const f = work.targetFolder.toLowerCase();
  return only.some((o) => f.includes(o));
}

function partRangeLabel(p) {
  return p.pages ? `pp.${p.pages.join(",")}` : `${p.start}-${p.end}`;
}

function validateFile(file, n) {
  for (const p of file.parts) {
    const pages = p.pages ?? [p.start, p.end];
    for (const x of pages) {
      if (!Number.isInteger(x) || x < 1 || x > n) {
        throw new Error(`${file.pdf}: ${p.instrument} fuera de rango (${partRangeLabel(p)}; n=${n})`);
      }
    }
    if (!p.pages && p.end < p.start) {
      throw new Error(`${file.pdf}: ${p.instrument} rango invertido ${partRangeLabel(p)}`);
    }
  }
}

function coverage(file, n) {
  const used = new Set();
  for (const p of file.parts) {
    if (p.pages) p.pages.forEach((x) => used.add(x));
    else for (let i = p.start; i <= p.end; i++) used.add(i);
  }
  const skipped = [];
  for (let i = 1; i <= n; i++) if (!used.has(i)) skipped.push(i);
  return skipped;
}

function processWork(work) {
  const workDir = join(PARA_ACOMODAR_ROOT, work.targetFolder);
  console.log(`\n=== ${work.targetFolder} ===`);
  if (!existsSync(workDir)) {
    console.error(`  ERROR: no existe carpeta ${workDir}`);
    return { ok: false };
  }
  const meta = [work.workNumber, work.workTitle, work.composerTag];
  const targetName = (instrument) =>
    canonicalPartFilename(instrument, ...meta);
  const dirFor = (p) =>
    p.altSubdir ? join(workDir, p.altSubdir) : workDir;

  for (const file of work.files) {
    const src = join(workDir, file.pdf);
    if (!existsSync(src)) {
      console.warn(`  Omitido (no existe): ${file.pdf}`);
      continue;
    }
    const n = pageCount(src);
    validateFile(file, n);
    const skipped = coverage(file, n);
    console.log(
      `  ${file.pdf} (${n} p.)${skipped.length ? ` — páginas omitidas: ${skipped.join(",")}` : ""}`,
    );

    const contiguous = file.parts.filter((p) => !p.pages);
    const scattered = file.parts.filter((p) => p.pages);
    const planned = file.parts.map((p) => ({
      part: p,
      dest: join(dirFor(p), targetName(p.instrument)),
    }));
    for (const { dest } of planned) {
      if (existsSync(dest)) {
        throw new Error(`Destino ya existe: ${dest}`);
      }
    }

    // Archivo completo → renombre directo
    if (
      file.parts.length === 1 &&
      !file.parts[0].pages &&
      file.parts[0].start === 1 &&
      file.parts[0].end === n
    ) {
      const { part, dest } = planned[0];
      console.log(`    [RENAME] ${part.instrument} → ${dest.replace(workDir, ".")}`);
      if (!dryRun) {
        mkdirSync(dirname(dest), { recursive: true });
        renameSync(src, dest);
      }
      continue;
    }

    for (const { part, dest } of planned) {
      console.log(
        `    [${part.pages ? "PAGES" : "SPLIT"}] ${part.instrument} ${partRangeLabel(part)} → ${dest.replace(workDir, ".")}`,
      );
    }
    if (dryRun) continue;

    if (contiguous.length) {
      const manifestPath = join(workDir, `${file.pdf}.manifest.json`);
      writeFileSync(
        manifestPath,
        JSON.stringify({ parts: contiguous.map(({ instrument, start, end }) => ({ instrument, start, end })) }, null, 2),
        "utf8",
      );
      try {
        execFileSync(
          "python",
          [
            SPLIT_SCRIPT,
            "--work-dir",
            workDir,
            "--input",
            src,
            "--manifest",
            manifestPath,
            "--split-only",
          ],
          { stdio: "inherit", env: PY_ENV },
        );
      } finally {
        if (existsSync(manifestPath)) unlinkSync(manifestPath);
      }
      for (const p of contiguous) {
        const raw = join(workDir, rawSplitName(p.instrument));
        if (!existsSync(raw)) throw new Error(`Falta salida del split: ${raw}`);
        const dest = join(dirFor(p), targetName(p.instrument));
        mkdirSync(dirname(dest), { recursive: true });
        renameSync(raw, dest);
      }
    }
    for (const p of scattered) {
      const dest = join(dirFor(p), targetName(p.instrument));
      mkdirSync(dirname(dest), { recursive: true });
      execFileSync(
        "python",
        [PDF_TOOL, "extract", src, dest, p.pages.join(",")],
        { env: PY_ENV },
      );
    }
    for (const { dest } of planned) {
      if (!existsSync(dest)) throw new Error(`No se generó: ${dest}`);
    }
    unlinkSync(src);
  }

  if (!dryRun) {
    const pdfs = readdirSync(workDir).filter((f) => /\.pdf$/i.test(f));
    const left = pdfs.filter((f) => /^IMSLP/i.test(f) || /raw split/i.test(f));
    console.log(`  PDFs en carpeta: ${pdfs.length}`);
    if (left.length) console.warn(`  ATENCIÓN restos sin procesar: ${left.join(", ")}`);
  }
  return { ok: true };
}

console.log(dryRun ? "=== DRY RUN ===" : "=== APLICANDO ===");
let failed = 0;
for (const work of LOTE_ORQUESTALES) {
  if (!matchesOnly(work)) continue;
  try {
    const r = processWork(work);
    if (!r.ok) failed++;
  } catch (err) {
    failed++;
    console.error(`  ERROR en ${work.targetFolder}: ${err.message}`);
  }
}
console.log(failed ? `\nTerminó con ${failed} error(es).` : "\nListo.");
process.exitCode = failed ? 1 : 0;
