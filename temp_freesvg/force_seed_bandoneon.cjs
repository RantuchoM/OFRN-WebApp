/**
 * Generate + apply Bandoneón-only force seed SQL (id 22b).
 * Usage: node temp_freesvg/force_seed_bandoneon.cjs
 * Then: npx supabase db query --linked -f temp_freesvg/force_seed_bandoneon.sql
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const svgPath = path.join(root, "public", "stage-plot", "icons", "bandoneon.svg");
const outPath = path.join(__dirname, "force_seed_bandoneon.sql");

const svg = fs.readFileSync(svgPath, "utf8").trim();
if (!svg.includes("<svg")) throw new Error("Not SVG");
if (svg.length > 100000) throw new Error(`Too large: ${svg.length}`);
if (/<use\b/i.test(svg)) throw new Error("Contains <use>");
if (/currentColor/i.test(svg)) {
  console.warn("WARNING: currentColor present");
}

const tag = "svg_22b";
const sql = [
  "-- Force seed Bandoneón FreeSVG 50642 → instrumentos.id 22b",
  "UPDATE public.instrumentos",
  "SET stage_plot_type = 'bandoneon',",
  `    svg_icon = $${tag}$${svg}$${tag}$`,
  "WHERE id = '22b';",
  "",
  "SELECT id, instrumento, stage_plot_type, char_length(svg_icon) AS svg_len,",
  "  (svg_icon ILIKE '%currentColor%') AS has_current_color",
  "FROM public.instrumentos WHERE id = '22b';",
  "",
].join("\n");

fs.writeFileSync(outPath, sql, "utf8");
console.log(`Wrote ${outPath} (${sql.length} bytes, svg ${svg.length} chars)`);
