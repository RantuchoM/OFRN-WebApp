/**
 * Convierte el fondo blanco de crack-*.png en transparencia (canal alpha).
 * Uso: node scripts/transparent-crack-pngs.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dir = path.join(__dirname, "../src/components/easter-egg/glass-patterns");

/** Blanco casi puro → transparente; transición suave en bordes antialiasing. */
const HARD = 248;
const SOFT = 28;

function alphaForPixel(r, g, b, a) {
  const lum = (r + g + b) / 3;
  if (lum >= HARD) return 0;
  if (lum <= HARD - SOFT) return a;
  const t = (HARD - lum) / SOFT;
  return Math.round(a * t);
}

async function processFile(filePath) {
  const { data, info } = await sharp(filePath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  for (let i = 0; i < data.length; i += 4) {
    data[i + 3] = alphaForPixel(data[i], data[i + 1], data[i + 2], data[i + 3]);
  }

  await sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png()
    .toFile(filePath);

  return path.basename(filePath);
}

const files = fs
  .readdirSync(dir)
  .filter((f) => /^crack-\d+\.png$/i.test(f))
  .sort();

if (files.length === 0) {
  console.error("No se encontraron crack-*.png en", dir);
  process.exit(1);
}

for (const file of files) {
  const name = await processFile(path.join(dir, file));
  console.log("OK", name);
}
