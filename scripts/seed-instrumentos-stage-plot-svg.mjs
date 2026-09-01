/**
 * Genera el bloque SQL de seed SVG para instrumentos a partir de public/stage-plot/icons.
 * Uso: node scripts/seed-instrumentos-stage-plot-svg.mjs
 * Escribe/actualiza supabase/migrations/20260827123803_instrumentos_stage_plot_svg.sql
 * (conserva el DDL de columnas; reemplaza el seed).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const iconsDir = path.join(root, "public", "stage-plot", "icons");
const migrationPath = path.join(
  root,
  "supabase",
  "migrations",
  "20260827123803_instrumentos_stage_plot_svg.sql",
);

/**
 * id instrumentos → tipo catálogo stage-plot + archivo SVG.
 * Variantes (06b/07b/08b) comparten silueta del instrumento base.
 * Sin fila de catálogo (sax, guitarra, prod., voces): no se precargan.
 */
export const INSTRUMENTO_STAGE_PLOT_SVG_SEED = [
  { id: "01", type: "violin", file: "violin.svg", note: "Violín" },
  { id: "02", type: "viola", file: "viola.svg", note: "Viola" },
  { id: "03", type: "cello", file: "cello.svg", note: "Violoncello" },
  { id: "04", type: "bass", file: "bass.svg", note: "Contrabajo" },
  { id: "05", type: "flute", file: "flute.svg", note: "Flauta" },
  { id: "06", type: "oboe", file: "oboe.svg", note: "Oboe" },
  { id: "06b", type: "oboe", file: "oboe.svg", note: "Corno Inglés → oboe" },
  { id: "07", type: "clarinet", file: "clarinet.svg", note: "Clarinete" },
  {
    id: "07b",
    type: "clarinet",
    file: "clarinet.svg",
    note: "Clarinete Bajo/Requinto → clarinet",
  },
  { id: "08", type: "bassoon", file: "bassoon.svg", note: "Fagot" },
  {
    id: "08b",
    type: "bassoon",
    file: "bassoon.svg",
    note: "Contrafagot → bassoon",
  },
  { id: "09", type: "horn", file: "french-horn.svg", note: "Corno" },
  { id: "10", type: "trumpet", file: "trumpet.svg", note: "Trompeta" },
  { id: "11", type: "trombone", file: "trombone.svg", note: "Trombón" },
  { id: "12", type: "tuba", file: "tuba.svg", note: "Tuba" },
  { id: "13", type: "perc", file: "drum.svg", note: "Percusión (genérico)" },
  { id: "14", type: "harp", file: "harp.svg", note: "Arpa" },
  { id: "15", type: "piano", file: "grand-piano.svg", note: "Piano" },
  { id: "17", type: "celesta", file: "keyboard.svg", note: "Celesta" },
  { id: "21", type: "guitar", file: "guitar.svg", note: "Guitarra" },
  { id: "22b", type: "bandoneon", file: "bandoneon.svg", note: "Bandoneón" },
  { id: "50", type: "conductor", file: "person.svg", note: "Director" },
];

const DDL = `-- SVG de silueta para plano de escenario (Escenario), editable desde Datos → Instrumentos.
-- Preferido sobre public/stage-plot/icons/{type}.svg cuando stage_plot_type coincide.

ALTER TABLE public.instrumentos
  ADD COLUMN IF NOT EXISTS svg_icon text,
  ADD COLUMN IF NOT EXISTS stage_plot_type text;

COMMENT ON COLUMN public.instrumentos.svg_icon IS
  'Markup SVG (texto) para silueta en plano de escenario. NULL = usar asset estático del catálogo.';

COMMENT ON COLUMN public.instrumentos.stage_plot_type IS
  'Tipo del catálogo stage-plot (ej. violin, flute). Enlaza la fila con el ícono del lienzo.';

ALTER TABLE public.instrumentos
  DROP CONSTRAINT IF EXISTS instrumentos_svg_icon_len_check;

ALTER TABLE public.instrumentos
  ADD CONSTRAINT instrumentos_svg_icon_len_check
  CHECK (svg_icon IS NULL OR char_length(svg_icon) <= 500000);

ALTER TABLE public.instrumentos
  DROP CONSTRAINT IF EXISTS instrumentos_stage_plot_type_check;

ALTER TABLE public.instrumentos
  ADD CONSTRAINT instrumentos_stage_plot_type_check
  CHECK (
    stage_plot_type IS NULL
    OR stage_plot_type ~ '^[a-z][a-z0-9_]{0,62}$'
  );

CREATE INDEX IF NOT EXISTS instrumentos_stage_plot_type_idx
  ON public.instrumentos (stage_plot_type)
  WHERE stage_plot_type IS NOT NULL;
`;

function buildSeedSql() {
  const lines = [
    "-- Seed: precarga SVG actuales de public/stage-plot/icons → instrumentos",
    "-- Regenerar: node scripts/seed-instrumentos-stage-plot-svg.mjs",
    "-- Solo escribe si svg_icon está vacío (no pisa ediciones manuales).",
    "",
  ];

  for (const row of INSTRUMENTO_STAGE_PLOT_SVG_SEED) {
    const filePath = path.join(iconsDir, row.file);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Missing icon file: ${row.file}`);
    }
    const svg = fs.readFileSync(filePath, "utf8").trim();
    if (!svg.includes("<svg")) {
      throw new Error(`Not an SVG: ${row.file}`);
    }
    const tag = `svg_${String(row.id).replace(/[^a-zA-Z0-9]/g, "_")}`;
    lines.push(`-- ${row.id} ${row.note} → ${row.type} (${row.file})`);
    lines.push(`UPDATE public.instrumentos`);
    lines.push(`SET stage_plot_type = '${row.type}',`);
    lines.push(`    svg_icon = $${tag}$${svg}$${tag}$`);
    lines.push(`WHERE id = '${row.id}'`);
    lines.push(`  AND (svg_icon IS NULL OR btrim(svg_icon) = '');`);
    lines.push("");
  }

  return lines.join("\n");
}

const sql = `${DDL.trim()}\n\n${buildSeedSql()}\n`;
fs.writeFileSync(migrationPath, sql, "utf8");
console.log(
  `Wrote ${migrationPath} (${fs.statSync(migrationPath).size} bytes, ${INSTRUMENTO_STAGE_PLOT_SVG_SEED.length} UPDATEs)`,
);
