/**
 * Copia PDFs desde Downloads/Para acomodar hacia Drive File Stream y
 * los renombra con el manifiesto `work.renames`.
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync, renameSync } from "fs";
import { join } from "path";
import { canonicalPartFilename } from "./pdfPartsRenaming.mjs";

export function foldName(s) {
  return String(s || "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function canonicalNameForItem(work, item) {
  const base = canonicalPartFilename(
    item.instrument,
    work.workNumber,
    work.titulo,
    work.composerTag,
  );
  if (item.variant === "sin-arcos") {
    return base.replace(/\.pdf$/i, " (sin arcos).pdf");
  }
  return base;
}

export function findPdfDir(rootDir) {
  if (!existsSync(rootDir)) return null;
  const pdfsHere = readdirSync(rootDir).filter((f) => /\.pdf$/i.test(f));
  if (pdfsHere.length) return rootDir;
  for (const d of readdirSync(rootDir, { withFileTypes: true })) {
    if (!d.isDirectory()) continue;
    const hit = findPdfDir(join(rootDir, d.name));
    if (hit) return hit;
  }
  return null;
}

export function findSourceDir(downloadsRoot, sourceMatch) {
  if (!existsSync(downloadsRoot)) return null;
  const dirs = readdirSync(downloadsRoot, { withFileTypes: true }).filter((d) =>
    d.isDirectory(),
  );
  const hit = dirs.find((d) => sourceMatch.test(d.name));
  if (!hit) return null;
  return findPdfDir(join(downloadsRoot, hit.name));
}

export function findPdf(dir, item, used) {
  if (!existsSync(dir)) return null;
  const pdfs = readdirSync(dir).filter((f) => /\.pdf$/i.test(f));
  const re = new RegExp(item.re, "i");
  const hits = pdfs.filter((f) => {
    if (used.has(foldName(f))) return false;
    return re.test(foldName(f));
  });
  if (hits.length === 1) return hits[0];
  if (item.variant === "sin-arcos") {
    const bow = hits.filter((f) => /sem|serm|arcsdas/.test(foldName(f)));
    if (bow.length === 1) return bow[0];
  } else {
    const clean = hits.filter((f) => !/sem|serm|arcsdas/.test(foldName(f)));
    if (clean.length === 1) return clean[0];
  }
  return hits[0] || null;
}

export function processWork({
  work,
  sourceDir,
  targetDir,
  dryRun = false,
}) {
  console.log(`\n=== ${work.targetFolder} ===`);
  console.log(`Fuente: ${sourceDir}`);
  console.log(`Destino: ${targetDir}`);

  if (!sourceDir || !existsSync(sourceDir)) {
    throw new Error(`No se encuentra fuente para ${work.targetFolder}`);
  }

  if (!dryRun) mkdirSync(targetDir, { recursive: true });
  else console.log("  [MKDIR]", targetDir);

  const usedSrc = new Set();
  let copied = 0;
  let renamed = 0;
  let missing = 0;

  for (const item of work.renames) {
    const targetName = canonicalNameForItem(work, item);
    const dst = join(targetDir, targetName);
    if (existsSync(dst)) {
      console.log(`  OK: ${targetName}`);
      const already = readdirSync(sourceDir).find(
        (f) => foldName(f) === foldName(targetName),
      );
      if (already) usedSrc.add(foldName(already));
      continue;
    }

    const found = findPdf(sourceDir, item, usedSrc);
    if (!found) {
      console.warn(`  Omitido (${item.instrument}): /${item.re}/`);
      missing += 1;
      continue;
    }
    usedSrc.add(foldName(found));
    const src = join(sourceDir, found);
    if (dryRun) {
      console.log(`  ${found} → ${targetName}`);
      renamed += 1;
      continue;
    }
    copyFileSync(src, dst);
    copied += 1;
    console.log(`  ${found} → ${targetName}`);
    renamed += 1;
  }

  const leftover = existsSync(sourceDir)
    ? readdirSync(sourceDir).filter(
        (f) => /\.pdf$/i.test(f) && !usedSrc.has(foldName(f)),
      )
    : [];
  for (const extra of leftover) {
    console.warn(`  Sin mapa (no copiado): ${extra}`);
  }

  const pdfs = existsSync(targetDir)
    ? readdirSync(targetDir).filter((f) => /\.pdf$/i.test(f))
    : [];
  console.log(
    `Listo. ${pdfs.length} PDFs destino | copiados=${copied} omitidos=${missing}`,
  );
  return { pdfs: pdfs.length, copied, renamed, missing, leftover };
}

export function processWorkInPlace({ work, workDir, dryRun = false }) {
  console.log(`\n=== ${work.targetFolder} (in-place) ===`);
  const usedSrc = new Set();
  let renamed = 0;
  let missing = 0;
  for (const item of work.renames) {
    const targetName = canonicalNameForItem(work, item);
    const dst = join(workDir, targetName);
    if (existsSync(dst)) {
      console.log(`  OK: ${targetName}`);
      usedSrc.add(foldName(targetName));
      continue;
    }
    const found = findPdf(workDir, item, usedSrc);
    if (!found) {
      console.warn(`  Omitido (${item.instrument}): /${item.re}/`);
      missing += 1;
      continue;
    }
    usedSrc.add(foldName(found));
    if (foldName(found) === foldName(targetName)) {
      console.log(`  OK: ${targetName}`);
      continue;
    }
    if (dryRun) {
      console.log(`  ${found} → ${targetName}`);
      renamed += 1;
      continue;
    }
    renameSync(join(workDir, found), dst);
    console.log(`  ${found} → ${targetName}`);
    renamed += 1;
  }
  return { renamed, missing };
}
