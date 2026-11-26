/**
 * Copia el alquiler Schott de Aranjuez a Para acomodar, con nombres canónicos.
 * No incluye «Cuerda sin recortar».
 */
import { copyFileSync, mkdirSync, readdirSync } from "fs";
import { join } from "path";
import {
  PARA_ACOMODAR_ROOT,
  PARTS,
  SOURCE_DIR,
  TARGET_FOLDER,
  partFilename,
} from "./lib/aranjuezCatalog.mjs";

const outDir = join(PARA_ACOMODAR_ROOT, TARGET_FOLDER);
mkdirSync(outDir, { recursive: true });

const onDisk = readdirSync(SOURCE_DIR);
function resolveSource(name) {
  if (onDisk.includes(name)) return join(SOURCE_DIR, name);
  const hit = onDisk.find((f) => f.normalize("NFC") === name.normalize("NFC"));
  if (hit) return join(SOURCE_DIR, hit);
  throw new Error(`No está el origen: ${name}`);
}

for (const part of PARTS) {
  const dst = join(outDir, partFilename(part.instrument));
  copyFileSync(resolveSource(part.file), dst);
  console.log(part.instrument);
}
