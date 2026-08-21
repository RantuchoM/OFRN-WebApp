/**
 * Regenera iconos PWA cuadrados (any + maskable) desde el lockup original.
 * Uso: node scripts/generate-pwa-icons.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const source = path.join(__dirname, "assets/ofrn-pwa-icon-source.jpg");
const BLACK = { r: 0, g: 0, b: 0, alpha: 1 };

async function squareIcon(size, padRatio) {
  const inner = Math.max(1, Math.round(size * (1 - 2 * padRatio)));
  const logo = await sharp(source)
    .resize(inner, inner, { fit: "contain", background: BLACK })
    .png()
    .toBuffer();

  return sharp({
    create: { width: size, height: size, channels: 3, background: BLACK },
  })
    .composite([{ input: logo, gravity: "centre" }])
    .png();
}

async function writePng(pipeline, dest) {
  await pipeline.toFile(dest);
  const meta = await sharp(dest).metadata();
  if (meta.width !== meta.height) {
    throw new Error(`${dest} no es cuadrado: ${meta.width}x${meta.height}`);
  }
  console.log("OK", path.relative(root, dest), `${meta.width}x${meta.height}`);
}

if (!fs.existsSync(source)) {
  console.error("Falta el original:", source);
  process.exit(1);
}

const anyPad = 0.06;
const maskablePad = 0.16;

await writePng(
  await squareIcon(192, anyPad),
  path.join(root, "public/pwa-192x192.png"),
);
await writePng(
  await squareIcon(512, anyPad),
  path.join(root, "public/pwa-512x512.png"),
);
await writePng(
  await squareIcon(512, maskablePad),
  path.join(root, "public/pwa-512x512-maskable.png"),
);
await writePng(
  await squareIcon(180, anyPad),
  path.join(root, "public/apple-touch-icon.png"),
);
