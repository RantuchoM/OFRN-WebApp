/**
 * Importa historial legacy (Sheets → CSV) a obras_repertorios_legacy.
 * Matchea obras por folder id de Drive (extractDriveFileId vs obras.link_drive).
 *
 * Uso:
 *   node scripts/import-obras-repertorios-legacy.mjs path/al/archivo.csv
 *   node scripts/import-obras-repertorios-legacy.mjs path/al/archivo.csv --dry-run
 *   node scripts/import-obras-repertorios-legacy.mjs path/al/archivo.csv --fuente="Sheet Cuyo 2015-2019"
 *
 * Env (.env):
 *   VITE_SUPABASE_URL o SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY (recomendado) o VITE_SUPABASE_ANON_KEY
 *
 * CSV UTF-8, separador `,`, fechas YYYY-MM-DD.
 * Columnas: link_drive,nombre_gira,fecha_desde,fecha_hasta,tipo,zona,nomenclador,mes_letra,ensambles
 * Opcionales ignoradas al insertar: compositor,titulo,fuente (fuente también vía --fuente)
 */
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const csvArg = args.find((a) => !a.startsWith("--"));
const fuenteFlag = args.find((a) => a.startsWith("--fuente="));
const fuenteDefault = fuenteFlag
  ? fuenteFlag.slice("--fuente=".length).replace(/^["']|["']$/g, "")
  : null;

if (!csvArg) {
  console.error(
    "Uso: node scripts/import-obras-repertorios-legacy.mjs <archivo.csv> [--dry-run] [--fuente=...]",
  );
  process.exit(1);
}

const csvPath = path.resolve(csvArg);
if (!fs.existsSync(csvPath)) {
  console.error(`No existe: ${csvPath}`);
  process.exit(1);
}

const supabaseUrl =
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
const serviceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  "";

if (!supabaseUrl || !serviceKey) {
  console.error(
    "Faltan SUPABASE_URL (o VITE_SUPABASE_URL) y SUPABASE_SERVICE_ROLE_KEY (o anon) en .env",
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function extractDriveFileId(url) {
  if (!url) return null;
  const raw = String(url).trim();
  if (/^[-\w]{25,}$/.test(raw)) return raw;
  const match = raw.match(/[-\w]{25,}/);
  return match ? match[0] : null;
}

/** CSV mínimo con soporte de comillas. */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;
  const src = String(text).replace(/^\uFEFF/, "");
  for (let i = 0; i < src.length; i += 1) {
    const ch = src[i];
    const next = src[i + 1];
    if (inQuotes) {
      if (ch === '"' && next === '"') {
        cell += '"';
        i += 1;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cell += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      continue;
    }
    if (ch === ",") {
      row.push(cell);
      cell = "";
      continue;
    }
    if (ch === "\n" || (ch === "\r" && next === "\n")) {
      row.push(cell);
      cell = "";
      if (row.some((c) => String(c).trim() !== "")) rows.push(row);
      row = [];
      if (ch === "\r") i += 1;
      continue;
    }
    if (ch === "\r") {
      row.push(cell);
      cell = "";
      if (row.some((c) => String(c).trim() !== "")) rows.push(row);
      row = [];
      continue;
    }
    cell += ch;
  }
  row.push(cell);
  if (row.some((c) => String(c).trim() !== "")) rows.push(row);
  return rows;
}

function normalizeHeader(h) {
  return String(h || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

const VALID_TIPOS = new Set([
  "Sinfónico",
  "Camerata Filarmónica",
  "Ensamble",
  "Jazz Band",
  "Comisión",
]);

function parseDate(value) {
  const s = String(value || "").trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (m) {
    const dd = m[1].padStart(2, "0");
    const mm = m[2].padStart(2, "0");
    return `${m[3]}-${mm}-${dd}`;
  }
  return null;
}

const raw = fs.readFileSync(csvPath, "utf8");
const table = parseCsv(raw);
if (table.length < 2) {
  console.error("CSV vacío o sin filas de datos.");
  process.exit(1);
}

const headers = table[0].map(normalizeHeader);
const idx = (name) => headers.indexOf(normalizeHeader(name));
const col = {
  link_drive: idx("link_drive"),
  nombre_gira: idx("nombre_gira"),
  fecha_desde: idx("fecha_desde"),
  fecha_hasta: idx("fecha_hasta"),
  tipo: idx("tipo"),
  zona: idx("zona"),
  nomenclador: idx("nomenclador"),
  mes_letra: idx("mes_letra"),
  ensambles: idx("ensambles"),
  fuente: idx("fuente"),
};

if (col.link_drive < 0 || col.nombre_gira < 0 || col.fecha_desde < 0) {
  console.error(
    "Faltan columnas obligatorias: link_drive, nombre_gira, fecha_desde",
  );
  process.exit(1);
}

const { data: obras, error: obrasErr } = await supabase
  .from("obras")
  .select("id, link_drive")
  .not("link_drive", "is", null);
if (obrasErr) {
  console.error("Error leyendo obras:", obrasErr.message);
  process.exit(1);
}

const driveToObraId = new Map();
for (const obra of obras || []) {
  const id = extractDriveFileId(obra.link_drive);
  if (id && !driveToObraId.has(id)) driveToObraId.set(id, obra.id);
}

const toInsert = [];
const unmatched = [];
const invalid = [];

for (let r = 1; r < table.length; r += 1) {
  const row = table[r];
  const get = (key) => {
    const i = col[key];
    return i >= 0 ? String(row[i] ?? "").trim() : "";
  };
  const linkDrive = get("link_drive");
  const nombreGira = get("nombre_gira");
  const fechaDesde = parseDate(get("fecha_desde"));
  const fechaHasta = parseDate(get("fecha_hasta"));
  const tipo = get("tipo");
  const folderId = extractDriveFileId(linkDrive);

  if (!nombreGira || !fechaDesde) {
    invalid.push({ row: r + 1, reason: "nombre_gira/fecha_desde", linkDrive });
    continue;
  }
  if (!folderId) {
    unmatched.push({ row: r + 1, linkDrive, nombreGira, reason: "sin_folder_id" });
    continue;
  }
  if (tipo && !VALID_TIPOS.has(tipo)) {
    invalid.push({ row: r + 1, reason: `tipo inválido: ${tipo}`, linkDrive });
    continue;
  }

  const idObra = driveToObraId.get(folderId) || null;
  if (!idObra) {
    unmatched.push({
      row: r + 1,
      linkDrive,
      folderId,
      nombreGira,
      reason: "sin_match_obra",
    });
  }

  toInsert.push({
    id_obra: idObra,
    drive_folder_id: folderId,
    link_drive: linkDrive || null,
    nombre_gira: nombreGira,
    fecha_desde: fechaDesde,
    fecha_hasta: fechaHasta,
    tipo: tipo || null,
    zona: get("zona") || null,
    nomenclador: get("nomenclador") || null,
    mes_letra: get("mes_letra") || null,
    ensambles: get("ensambles") || null,
    fuente: get("fuente") || fuenteDefault || path.basename(csvPath),
  });
}

const matched = toInsert.filter((r) => r.id_obra != null).length;
console.log(
  JSON.stringify(
    {
      csv: csvPath,
      dryRun,
      totalRows: table.length - 1,
      toInsert: toInsert.length,
      matchedObra: matched,
      unmatched: unmatched.length,
      invalid: invalid.length,
      sampleUnmatched: unmatched.slice(0, 10),
      sampleInvalid: invalid.slice(0, 10),
    },
    null,
    2,
  ),
);

if (dryRun) {
  console.log("Dry-run: no se insertó nada.");
  process.exit(0);
}

if (toInsert.length === 0) {
  console.log("Nada para insertar.");
  process.exit(0);
}

const chunkSize = 200;
let inserted = 0;
for (let i = 0; i < toInsert.length; i += chunkSize) {
  const chunk = toInsert.slice(i, i + chunkSize);
  const { error } = await supabase.from("obras_repertorios_legacy").insert(chunk);
  if (error) {
    console.error(`Error insertando chunk ${i}:`, error.message);
    process.exit(1);
  }
  inserted += chunk.length;
}

console.log(`Insertadas ${inserted} filas en obras_repertorios_legacy.`);
