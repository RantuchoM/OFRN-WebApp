/**
 * Genera texturas de piso tileable (PNG) para el plano de escenario.
 * Uso: node scripts/generate-stage-plot-floors.mjs
 *
 * Procedural OFRN (sin stock copyrighted). Salida: public/stage-plot/floors/
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "..", "public", "stage-plot", "floors");
const SIZE = 128;

function clamp(v, a = 0, b = 255) {
  return Math.max(a, Math.min(b, v | 0));
}

function hash(x, y, seed = 0) {
  let n = (x * 374761393 + y * 668265263 + seed * 982451653) | 0;
  n = (n ^ (n >>> 13)) * 1274126177;
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

function smoothNoise(x, y, seed) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = x - x0;
  const fy = y - y0;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const n00 = hash(x0, y0, seed);
  const n10 = hash(x0 + 1, y0, seed);
  const n01 = hash(x0, y0 + 1, seed);
  const n11 = hash(x0 + 1, y0 + 1, seed);
  const a = n00 + (n10 - n00) * sx;
  const b = n01 + (n11 - n01) * sx;
  return a + (b - a) * sy;
}

function fbm(x, y, seed, oct = 4) {
  let a = 0;
  let amp = 0.5;
  let f = 1;
  for (let i = 0; i < oct; i++) {
    a += amp * smoothNoise(x * f, y * f, seed + i * 17);
    f *= 2;
    amp *= 0.5;
  }
  return a;
}

async function writeRgb(name, fn) {
  const pixels = Buffer.alloc(SIZE * SIZE * 3);
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const [r, g, b] = fn(x, y);
      const i = (y * SIZE + x) * 3;
      pixels[i] = clamp(r);
      pixels[i + 1] = clamp(g);
      pixels[i + 2] = clamp(b);
    }
  }
  const dest = path.join(OUT, name);
  await sharp(pixels, {
    raw: { width: SIZE, height: SIZE, channels: 3 },
  })
    .png({ compressionLevel: 9 })
    .toFile(dest);
  const st = fs.statSync(dest);
  console.log("OK", path.relative(path.join(__dirname, ".."), dest), `${st.size} B`);
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });

  await writeRgb("negro.png", (x, y) => {
    const n = fbm(x / 32, y / 32, 11) * 18;
    const v = 18 + n;
    return [v, v + 1, v + 2];
  });

  await writeRgb("gris.png", (x, y) => {
    const n = fbm(x / 24, y / 24, 22) * 22;
    const v = 148 + n;
    return [v, v, v + 2];
  });

  await writeRgb("madera_clara.png", (x, y) => {
    const plankH = 16;
    const py = ((y % plankH) + plankH) % plankH;
    const plankId = Math.floor(y / plankH);
    const gx = Math.sin((x / SIZE) * Math.PI * 2) * 0.5 + 0.5;
    const grain =
      fbm(gx * 8 + plankId * 0.3, y / 40, 33 + plankId) * 28;
    const groove = py < 1 || py > plankH - 2 ? -22 : 0;
    const shade = (plankId % 2) * 6;
    const baseR = 210;
    const baseG = 178;
    const baseB = 130;
    return [
      baseR + grain - shade + groove,
      baseG + grain * 0.85 - shade + groove,
      baseB + grain * 0.55 - shade * 0.5 + groove,
    ];
  });

  await writeRgb("madera_oscura.png", (x, y) => {
    const plankH = 16;
    const py = ((y % plankH) + plankH) % plankH;
    const plankId = Math.floor(y / plankH);
    const gx = Math.sin((x / SIZE) * Math.PI * 2) * 0.5 + 0.5;
    const grain =
      fbm(gx * 8 + plankId * 0.4, y / 36, 44 + plankId) * 22;
    const groove = py < 1 || py > plankH - 2 ? -18 : 0;
    const shade = (plankId % 2) * 5;
    const baseR = 92;
    const baseG = 58;
    const baseB = 36;
    return [
      baseR + grain - shade + groove,
      baseG + grain * 0.7 - shade + groove,
      baseB + grain * 0.45 - shade * 0.4 + groove,
    ];
  });

  await writeRgb("ceramico.png", (x, y) => {
    const tile = 32;
    const gx = x % tile;
    const gy = y % tile;
    const grout =
      gx < 2 || gy < 2 || gx > tile - 3 || gy > tile - 3;
    if (grout) return [190, 186, 178];
    const tid = Math.floor(x / tile) + Math.floor(y / tile) * 7;
    const n = fbm(x / 18, y / 18, 55 + tid) * 14;
    const base = 232 + (tid % 3) * 3;
    return [base + n, base - 2 + n, base - 8 + n * 0.6];
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
