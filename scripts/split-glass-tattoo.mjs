import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcPath = path.join(
  __dirname,
  "../src/components/easter-egg/glass-patterns/broken-glass-tattoo.svg",
);
const outDir = path.join(__dirname, "../src/components/easter-egg/glass-patterns");

const src = fs.readFileSync(srcPath, "utf8");
const m = src.match(/<path d="([^"]+)"/);
if (!m) throw new Error("path not found");
const d = m[1];

const W = 1269;
const H = 1596;
/** La lámina del tattoo es 3 columnas × 2 filas (no 2×3). */
const cols = 3;
const rows = 2;
const vw = W / cols;
const vh = H / rows;

let i = 0;
for (let row = 0; row < rows; row += 1) {
  for (let col = 0; col < cols; col += 1) {
    i += 1;
    const x = col * vw;
    const y = row * vh;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${vw} ${vh}" fill="none" aria-hidden="true"><path d="${d}" fill="#0f172a" fill-rule="evenodd"/></svg>`;
    fs.writeFileSync(path.join(outDir, `tattoo-${i}.svg`), svg);
  }
}

console.log(`Created ${i} SVGs (${cols}×${rows}, ${vw.toFixed(1)}×${vh.toFixed(1)} per cell)`);
