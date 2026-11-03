/**
 * Aplica las decisiones exportadas desde Downloads/legacy_match_ambiguos.html
 * a la tabla obras_repertorios_legacy (idempotente).
 *
 * Uso:
 *   node scripts/_tmp_apply_legacy_ambiguos.mjs <decisiones.json> --dry-run
 *   node scripts/_tmp_apply_legacy_ambiguos.mjs <decisiones.json>
 *   node scripts/_tmp_apply_legacy_ambiguos.mjs <decisiones.json> --fuente="Giras 2022 ambiguos manual"
 *
 * - Solo procesa decisiones con accion === "match" e id_obra_elegida (las "sin_match" se ignoran).
 * - Verifica que la obra exista; link_drive / drive_folder_id salen de obras.link_drive.
 * - Idempotente: no inserta si ya existe (id_obra, nombre_gira, fecha_desde, fuente).
 * - Env (.env): SUPABASE_URL | VITE_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY (o VITE_SUPABASE_ANON_KEY;
 *   la política RLS actual permite a authenticated/anon según migraciones; con anon puede fallar).
 */
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const file = args.find((a) => !a.startsWith("--"));
const fuenteFlag = args.find((a) => a.startsWith("--fuente="));
const FUENTE = fuenteFlag
  ? fuenteFlag.slice("--fuente=".length).replace(/^["']|["']$/g, "")
  : "Giras 2022 Rep keyword-match (ambiguos resueltos manualmente)";

if (!file) {
  console.error("Uso: node scripts/_tmp_apply_legacy_ambiguos.mjs <decisiones.json> [--dry-run] [--fuente=...]");
  process.exit(1);
}
const filePath = path.resolve(file);
if (!fs.existsSync(filePath)) {
  console.error(`No existe: ${filePath}`);
  process.exit(1);
}

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
if (!url || !key) {
  console.error("Faltan SUPABASE_URL (o VITE_SUPABASE_URL) y SUPABASE_SERVICE_ROLE_KEY en .env");
  process.exit(1);
}
const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

const parsed = JSON.parse(fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, ""));
const decisiones = Array.isArray(parsed) ? parsed : parsed.decisiones || [];

const matches = decisiones.filter((d) => d.accion === "match" && Number(d.id_obra_elegida) > 0);
const skipped = decisiones.length - matches.length;
const faltaMeta = matches.filter((d) => !d.nombre_gira || !d.fecha_desde);
const validos = matches.filter((d) => d.nombre_gira && d.fecha_desde);

const driveId = (u) => (String(u || "").match(/(?:id=|folders\/|\/d\/)([A-Za-z0-9_-]{20,})/) || [])[1] || null;

const ids = [...new Set(validos.map((d) => Number(d.id_obra_elegida)))];
const { data: obras, error: obrasErr } = ids.length
  ? await supabase.from("obras").select("id, titulo, link_drive").in("id", ids)
  : { data: [], error: null };
if (obrasErr) {
  console.error("Error leyendo obras:", obrasErr.message);
  process.exit(1);
}
const obraById = new Map((obras || []).map((o) => [o.id, o]));

const toInsert = [];
const obraInexistente = [];
const seen = new Set();
for (const d of validos) {
  const id = Number(d.id_obra_elegida);
  const obra = obraById.get(id);
  if (!obra) {
    obraInexistente.push({ id, titulo: d.titulo });
    continue;
  }
  const k = `${id}|${d.nombre_gira}|${d.fecha_desde}`;
  if (seen.has(k)) continue;
  seen.add(k);
  toInsert.push({
    id_obra: id,
    drive_folder_id: driveId(obra.link_drive),
    link_drive: obra.link_drive || null,
    nombre_gira: d.nombre_gira,
    fecha_desde: d.fecha_desde,
    fecha_hasta: d.fecha_hasta || null,
    tipo: d.tipo || null,
    zona: d.zona || null,
    nomenclador: d.nomenclador || null,
    mes_letra: d.mes_letra || null,
    ensambles: d.ensambles || null,
    fuente: FUENTE,
  });
}

// Idempotencia: filtrar los que ya existen
const nuevos = [];
let yaExistian = 0;
for (const r of toInsert) {
  const { data: ex, error } = await supabase
    .from("obras_repertorios_legacy")
    .select("id")
    .eq("id_obra", r.id_obra)
    .eq("nombre_gira", r.nombre_gira)
    .eq("fecha_desde", r.fecha_desde)
    .eq("fuente", r.fuente)
    .limit(1);
  if (error) {
    console.error("Error verificando existentes:", error.message);
    process.exit(1);
  }
  if (ex && ex.length) yaExistian += 1;
  else nuevos.push(r);
}

console.log(
  JSON.stringify(
    {
      archivo: filePath,
      dryRun,
      fuente: FUENTE,
      decisiones: decisiones.length,
      ignoradas_sin_match_o_invalidas: skipped,
      sin_metadata_gira: faltaMeta.length,
      obra_inexistente: obraInexistente,
      ya_existian: yaExistian,
      a_insertar: nuevos.length,
    },
    null,
    2,
  ),
);

if (dryRun) {
  console.log("Dry-run: no se insertó nada.");
  process.exit(0);
}
if (!nuevos.length) {
  console.log("Nada para insertar.");
  process.exit(0);
}
const { error } = await supabase.from("obras_repertorios_legacy").insert(nuevos);
if (error) {
  console.error("Error insertando:", error.message);
  process.exit(1);
}
console.log(`Insertadas ${nuevos.length} filas en obras_repertorios_legacy.`);
