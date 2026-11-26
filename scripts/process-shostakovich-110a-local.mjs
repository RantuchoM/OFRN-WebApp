/**
 * Copia los PDF de la Sinfonía de cámara op. 110a a Para acomodar, ya renombrados.
 * Uso: node scripts/process-shostakovich-110a-local.mjs "<carpeta con los PDF>"
 */
import { copyFileSync, mkdirSync, readdirSync } from "fs";
import { join } from "path";
import {
  PARA_ACOMODAR_ROOT,
  SOURCE_PARTS,
  TARGET_FOLDER,
  partFilename,
} from "./lib/shostakovich110aCatalog.mjs";

const sourceDir = process.argv[2];
if (!sourceDir) {
  console.error("Falta la carpeta de origen.");
  process.exit(1);
}

const destDir = join(PARA_ACOMODAR_ROOT, TARGET_FOLDER);
mkdirSync(destDir, { recursive: true });

const files = readdirSync(sourceDir).filter((f) => /\.pdf$/i.test(f));
const used = new Set();

for (const file of files) {
  const rule = SOURCE_PARTS.find((r) => r.match.test(file));
  if (!rule) {
    console.warn("  Sin regla:", file);
    continue;
  }
  if (used.has(rule.instrument)) {
    console.warn("  Duplicado:", file);
    continue;
  }
  used.add(rule.instrument);
  const target = partFilename(rule.instrument);
  copyFileSync(join(sourceDir, file), join(destDir, target));
  console.log(`${file}\n  → ${target}`);
}

const missing = SOURCE_PARTS.filter((r) => !used.has(r.instrument)).map(
  (r) => r.instrument,
);
if (missing.length) {
  console.error("Faltan:", missing.join(", "));
  process.exit(1);
}
console.log(`\n${used.size} PDF en ${destDir}`);
