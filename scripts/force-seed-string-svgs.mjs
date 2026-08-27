/**
 * Force-update svg_icon + stage_plot_type for violin/viola/cello/bass on linked DB.
 * Usage: node scripts/force-seed-string-svgs.mjs
 * Then: npx supabase db query --linked -f temp_freesvg/force_seed_strings.sql
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const iconsDir = path.join(root, "public", "stage-plot", "icons");
const outPath = path.join(root, "temp_freesvg", "force_seed_strings.sql");

const ROWS = [
  { id: "01", type: "violin", file: "violin.svg", note: "Violín" },
  { id: "02", type: "viola", file: "viola.svg", note: "Viola" },
  { id: "03", type: "cello", file: "cello.svg", note: "Violoncello" },
  { id: "04", type: "bass", file: "bass.svg", note: "Contrabajo" },
  { id: "05", type: "flute", file: "flute.svg", note: "Flauta" },
  { id: "21", type: "guitar", file: "guitar.svg", note: "Guitarra" },
  { id: "22b", type: "bandoneon", file: "bandoneon.svg", note: "Bandoneón" },
];

const lines = [
  "-- Force seed FreeSVG string icons → instrumentos (overwrite svg_icon)",
  "-- Generated: node scripts/force-seed-string-svgs.mjs",
  "",
];

for (const row of ROWS) {
  const filePath = path.join(iconsDir, row.file);
  const svg = fs.readFileSync(filePath, "utf8").trim();
  if (!svg.includes("<svg")) throw new Error(`Not SVG: ${row.file}`);
  if (svg.length > 100000) throw new Error(`Too large: ${row.file}`);
  const tag = `svg_${String(row.id).replace(/[^a-zA-Z0-9]/g, "_")}`;
  lines.push(`-- ${row.id} ${row.note} → ${row.type} (${row.file}, ${svg.length} chars)`);
  lines.push(`UPDATE public.instrumentos`);
  lines.push(`SET stage_plot_type = '${row.type}',`);
  lines.push(`    svg_icon = $${tag}$${svg}$${tag}$`);
  lines.push(`WHERE id = '${row.id}';`);
  lines.push("");
}

lines.push("SELECT id, stage_plot_type, char_length(svg_icon) AS svg_len");
lines.push("FROM public.instrumentos");
lines.push("WHERE id IN ('01','02','03','04','05','21','22b')");
lines.push("ORDER BY id;");
lines.push("");

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, lines.join("\n"), "utf8");
console.log(`Wrote ${outPath} (${fs.statSync(outPath).size} bytes)`);
