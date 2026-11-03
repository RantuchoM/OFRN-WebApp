/**
 * Gira 2022 Marzo 9-12 (Ópera a la carta): copia obras numeradas de PARTICELLAS/SCORES a
 * carpetas canónicas en «Para acomodar» (con PDFs renombrados) y corrige nombres de Lin Calel.
 *
 *   node scripts/process-marzo2022-opera-local.mjs --dry-run
 *   node scripts/process-marzo2022-opera-local.mjs
 *
 * No mueve ni borra nada en la gira (se COPIA). Ignora PORTADA, audio, .sib, xlsx y «00»/«99».
 */
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  renameSync,
} from "fs";
import { join } from "path";
import {
  COPY_WORKS,
  GIRA_LOCAL_ROOT,
  LIN_CALEL_LOCAL_DIR,
  LIN_CALEL_WORK,
  PARA_ACOMODAR_ROOT,
  canonicalInstrumentFromSuffix,
  canonicalName,
  foldName,
  sourceSuffix,
} from "./lib/marzo2022OperaCatalog.mjs";

const dryRun = process.argv.includes("--dry-run");
const report = { copied: [], skipped: [], failed: [], renamed: [] };

function collectSources(work) {
  const re = new RegExp(`^${work.prefix}\\.`);
  const out = [];
  const partRoot = join(GIRA_LOCAL_ROOT, "PARTICELLAS");
  for (const d of readdirSync(partRoot, { withFileTypes: true })) {
    if (!d.isDirectory()) continue;
    for (const f of readdirSync(join(partRoot, d.name))) {
      if (re.test(f) && /\.pdf$/i.test(f))
        out.push({ folder: d.name, name: f, path: join(partRoot, d.name, f) });
    }
  }
  const scoreRoot = join(GIRA_LOCAL_ROOT, "SCORES");
  for (const f of readdirSync(scoreRoot)) {
    if (re.test(f) && /\.pdf$/i.test(f))
      out.push({ folder: "SCORES", name: f, path: join(scoreRoot, f), score: true });
  }
  return out;
}

for (const work of COPY_WORKS) {
  const dstDir = join(PARA_ACOMODAR_ROOT, work.targetFolder);
  if (!dryRun) mkdirSync(dstDir, { recursive: true });
  const used = new Map();
  for (const src of collectSources(work)) {
    let instrument;
    if (src.score) instrument = "SCORE";
    else {
      const suffix = sourceSuffix(src.name);
      const ov = (work.overrides || []).find(
        (o) => o.folder === src.folder && foldName(o.suffix) === foldName(suffix),
      );
      if (ov?.skip) {
        report.skipped.push({ work: work.prefix, file: `${src.folder}\\${src.name}`, why: "duplicado de otra hoja" });
        continue;
      }
      instrument = ov?.instrument || canonicalInstrumentFromSuffix(suffix);
    }
    if (!instrument) {
      report.failed.push({ work: work.prefix, file: `${src.folder}\\${src.name}`, why: "instrumento no reconocido" });
      continue;
    }
    const target = canonicalName(instrument, work.fileTitle, work.composerTag);
    if (used.has(target)) {
      report.skipped.push({
        work: work.prefix,
        file: `${src.folder}\\${src.name}`,
        why: `misma hoja ya copiada como «${target}» (de ${used.get(target)})`,
      });
      continue;
    }
    used.set(target, src.folder);
    const dst = join(dstDir, target);
    if (!dryRun && !existsSync(dst)) copyFileSync(src.path, dst);
    report.copied.push({ work: work.prefix, from: `${src.folder}\\${src.name}`, to: target });
  }
}

// Lin Calel: renombrar in situ
for (const r of LIN_CALEL_WORK.renames) {
  const a = join(LIN_CALEL_LOCAL_DIR, r.from);
  const b = join(LIN_CALEL_LOCAL_DIR, r.to);
  if (!existsSync(a)) {
    report.skipped.push({ work: "Lin Calel", file: r.from, why: existsSync(b) ? "ya renombrado" : "no existe" });
    continue;
  }
  if (existsSync(b)) {
    report.failed.push({ work: "Lin Calel", file: r.from, why: "destino existe" });
    continue;
  }
  if (!dryRun) renameSync(a, b);
  report.renamed.push(r);
}

const byWork = {};
for (const c of report.copied) byWork[c.work] = (byWork[c.work] || 0) + 1;
console.log(dryRun ? "[DRY-RUN]" : "[APLICADO]", "copiados por obra:", byWork);
for (const c of report.copied) console.log(`  ${c.work} | ${c.from}  →  ${c.to}`);
console.log("\nOmitidos:");
for (const s of report.skipped) console.log(`  ${s.work} | ${s.file} (${s.why})`);
console.log("\nFallidos:");
for (const f of report.failed) console.log(`  ${f.work} | ${f.file} (${f.why})`);
console.log("\nRenombres Lin Calel:", report.renamed.map((r) => `${r.from} → ${r.to}`));
