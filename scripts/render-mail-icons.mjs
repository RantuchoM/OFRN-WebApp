import sharp from "sharp";
import fs from "fs";
import path from "path";

const outDir = "public/mail";
fs.mkdirSync(outDir, { recursive: true });

const calendar = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`;

const bass = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="110 240 490 630" fill="#64748b"><path d="M190.85 451.25c11.66 14.72 32.32 24.49 55.84 24.49 36.4 0 65.89-23.37 65.89-52.21 0-28.84-29.49-52.21-65.89-52.21-20.31 4.15-28.59 9-33.14-2.91 17.98-54.33 46.92-66.71 96.55-66.71 65.91 0 96.97 59.9 96.97 142.97-18.23 190.63-205.95 286.75-246.57 316.19 5.69 13.1 5.4 12.63 5.4 12.01 189.78-86.2 330.69-204.43 330.69-320.74 0-92.42-58.58-175.59-187.72-172.8-77.58 0-170.32 86.2-118 171.93z m328.1 89.88c0-17.85-14.47-32.32-32.32-32.32-17.85 0-32.32 14.47-32.32 32.32 0 17.85 14.47 32.32 32.32 32.32 17.85 0 32.32-14.47 32.32-32.32zm0 136.75c0-17.85-14.47-32.32-32.32-32.32-17.85 0-32.32 14.47-32.32 32.32 0 17.85 14.47 32.32 32.32 32.32 17.85 0 32.32-14.47 32.32-32.32z"/></svg>`;

const utensils = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg>`;

async function svgToPng(svg, name) {
  const buf = await sharp(Buffer.from(svg))
    .resize(64, 64, {
      fit: "contain",
      background: { r: 255, g: 255, b: 255, alpha: 0 },
    })
    .png()
    .toBuffer();
  fs.writeFileSync(path.join(outDir, name), buf);
  console.log(name, buf.length);
}

await svgToPng(calendar, "icon-agenda.png");
await svgToPng(bass, "icon-repertorio.png");
await svgToPng(utensils, "icon-comidas.png");

const strip = `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="56" viewBox="0 0 480 56">
  <rect x="0" y="0" width="480" height="56" rx="10" fill="#f1f5f9"/>
  <g transform="translate(28,18)">
    <g stroke="#64748b" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <rect x="0" y="2" width="16" height="16" rx="2"/>
      <line x1="11" y1="0" x2="11" y2="4"/><line x1="5" y1="0" x2="5" y2="4"/><line x1="0" y1="7" x2="16" y2="7"/>
    </g>
    <text x="22" y="15" font-family="Helvetica,Arial,sans-serif" font-size="13" fill="#64748b">Agenda</text>
  </g>
  <rect x="150" y="6" width="140" height="44" rx="8" fill="#ffffff"/>
  <g transform="translate(168,16)">
    <g transform="translate(0,-4) scale(0.028)">
      <path fill="#4f46e5" d="M190.85 451.25c11.66 14.72 32.32 24.49 55.84 24.49 36.4 0 65.89-23.37 65.89-52.21 0-28.84-29.49-52.21-65.89-52.21-20.31 4.15-28.59 9-33.14-2.91 17.98-54.33 46.92-66.71 96.55-66.71 65.91 0 96.97 59.9 96.97 142.97-18.23 190.63-205.95 286.75-246.57 316.19 5.69 13.1 5.4 12.63 5.4 12.01 189.78-86.2 330.69-204.43 330.69-320.74 0-92.42-58.58-175.59-187.72-172.8-77.58 0-170.32 86.2-118 171.93z m328.1 89.88c0-17.85-14.47-32.32-32.32-32.32-17.85 0-32.32 14.47-32.32 32.32 0 17.85 14.47 32.32 32.32 32.32 17.85 0 32.32-14.47 32.32-32.32zm0 136.75c0-17.85-14.47-32.32-32.32-32.32-17.85 0-32.32 14.47-32.32 32.32 0 17.85 14.47 32.32 32.32 32.32 17.85 0 32.32-14.47 32.32-32.32z"/>
    </g>
    <text x="28" y="16" font-family="Helvetica,Arial,sans-serif" font-size="13" font-weight="700" fill="#4f46e5">Repertorio</text>
  </g>
  <g transform="translate(318,18)">
    <g stroke="#64748b" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M2 0v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V0"/><path d="M6 0v18"/><path d="M18 13V0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/>
    </g>
    <text x="26" y="15" font-family="Helvetica,Arial,sans-serif" font-size="13" fill="#64748b">Mis Comidas</text>
  </g>
</svg>`;

const stripBuf = await sharp(Buffer.from(strip)).png().toBuffer();
fs.writeFileSync(path.join(outDir, "giras-tabs.png"), stripBuf);
console.log("giras-tabs.png", stripBuf.length);
