/**
 * Renombra particellas canónicas — 4 obras gira 305 (Garcia / cuerdas).
 * Sin split/crop: cada PDF ya es una particella. MIDI sin tocar.
 */
import { existsSync, readdirSync, renameSync } from "fs";
import { join } from "path";
import { canonicalPartFilename } from "./lib/pdfPartsRenaming.mjs";
import {
  CORO_UNRN_GARCIA_WORKS,
  PARA_ACOMODAR_ROOT,
} from "./lib/coroUnrnGarciaCatalog.mjs";

const dryRun = process.argv.includes("--dry-run");
const only = process.argv.find((a) => a.startsWith("--only="))?.slice(7);

console.log(dryRun ? "=== DRY RUN ===" : "=== APLICANDO ===");
console.log(`Root: ${PARA_ACOMODAR_ROOT}`);

const works = only
  ? CORO_UNRN_GARCIA_WORKS.filter(
      (w) =>
        String(w.obraId) === only ||
        w.titulo.toLowerCase().includes(only.toLowerCase()) ||
        w.targetFolder.toLowerCase().includes(only.toLowerCase()),
    )
  : CORO_UNRN_GARCIA_WORKS;

if (!works.length) {
  console.error("Ninguna obra coincide con --only=", only);
  process.exit(1);
}

for (const work of works) {
  const workDir = join(PARA_ACOMODAR_ROOT, work.targetFolder);
  console.log(`\n--- ${work.titulo} (obra ${work.obraId}) ---`);
  if (!existsSync(workDir)) {
    console.error("  No existe carpeta:", workDir);
    continue;
  }

  const onDisk = new Set(readdirSync(workDir));
  const usedTargets = new Set();
  let renamed = 0;
  let ok = 0;
  let missing = 0;

  for (const [from, instrument] of Object.entries(work.renameMap)) {
    if (!onDisk.has(from)) {
      // Idempotente: ya renombrado a canónico
      const already = canonicalPartFilename(
        instrument,
        work.workNumber,
        work.titulo,
        work.composerTag,
      );
      if (onDisk.has(already)) {
        console.log(`  OK (ya): ${already}`);
        usedTargets.add(already.toLowerCase());
        ok++;
        continue;
      }
      console.warn(`  FALTA origen: ${from}`);
      missing++;
      continue;
    }

    let target = canonicalPartFilename(
      instrument,
      work.workNumber,
      work.titulo,
      work.composerTag,
    );
    if (usedTargets.has(target.toLowerCase())) {
      target = canonicalPartFilename(
        `${instrument} bis`,
        work.workNumber,
        work.titulo,
        work.composerTag,
      );
    }
    usedTargets.add(target.toLowerCase());

    if (from === target) {
      console.log(`  OK: ${target}`);
      ok++;
      continue;
    }
    const dst = join(workDir, target);
    if (existsSync(dst) && from !== target) {
      console.warn(`  SKIP colisión: ${from} → ${target}`);
      continue;
    }
    console.log(`  ${from}`);
    console.log(`    → ${target}`);
    if (!dryRun) renameSync(join(workDir, from), dst);
    renamed++;
  }

  const canonicalNames = new Set(
    Object.values(work.renameMap).map((inst) =>
      canonicalPartFilename(
        inst,
        work.workNumber,
        work.titulo,
        work.composerTag,
      ),
    ),
  );
  const stillOld = readdirSync(workDir).filter(
    (f) => /\.pdf$/i.test(f) && !canonicalNames.has(f),
  );
  if (stillOld.length) {
    console.log("  Quedan sin renombrar:");
    stillOld.forEach((f) => console.log("   ", f));
  }
  const pdfCount = readdirSync(workDir).filter((f) => /\.pdf$/i.test(f)).length;
  console.log(
    `  Resumen: rename=${renamed}, ok=${ok}, missing=${missing}, pdfs=${pdfCount}`,
  );
}

console.log("\nListo.");
