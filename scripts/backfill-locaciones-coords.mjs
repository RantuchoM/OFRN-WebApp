/**
 * Completa latitud/longitud en locaciones a partir de link_mapa (Google Maps).
 *
 * Resuelve links largos y cortos (maps.app.goo.gl, goo.gl) siguiendo redirects.
 *
 * Uso:
 *   node scripts/backfill-locaciones-coords.mjs              # solo filas sin coords
 *   node scripts/backfill-locaciones-coords.mjs --dry-run    # no escribe en BD
 *   node scripts/backfill-locaciones-coords.mjs --force      # sobrescribe coords existentes
 *   node scripts/backfill-locaciones-coords.mjs --id=42      # una locación
 *
 * Variables de entorno (archivo .env en la raíz del proyecto):
 *   VITE_SUPABASE_URL  o  SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY  (service role; necesario para UPDATE masivo)
 */
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { resolveGoogleMapsLinkCoords } from "../src/utils/mapsCoords.js";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const force = args.includes("--force");
const idArg = args.find((a) => a.startsWith("--id="));
const onlyId = idArg ? Number(idArg.split("=")[1]) : null;

const supabaseUrl =
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!supabaseUrl || !serviceKey) {
  console.error(
    "Faltan SUPABASE_URL (o VITE_SUPABASE_URL) y SUPABASE_SERVICE_ROLE_KEY en .env",
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function hasCoords(row) {
  const lat = Number(row.latitud);
  const lng = Number(row.longitud);
  return Number.isFinite(lat) && Number.isFinite(lng);
}

async function main() {
  let query = supabase
    .from("locaciones")
    .select("id, nombre, link_mapa, latitud, longitud")
    .not("link_mapa", "is", null)
    .order("id");

  if (onlyId != null && Number.isFinite(onlyId)) {
    query = supabase
      .from("locaciones")
      .select("id, nombre, link_mapa, latitud, longitud")
      .eq("id", onlyId);
  }

  const { data: rows, error } = await query;
  if (error) {
    console.error("Error al leer locaciones:", error.message);
    process.exit(1);
  }

  const candidates = (rows || []).filter((r) => {
    if (!r.link_mapa?.trim()) return false;
    if (force) return true;
    return !hasCoords(r);
  });

  console.log(
    `Locaciones con link_mapa: ${rows?.length ?? 0} | A procesar: ${candidates.length}${dryRun ? " (dry-run)" : ""}`,
  );

  let ok = 0;
  let skip = 0;
  let fail = 0;

  for (const row of candidates) {
    const label = `#${row.id} ${row.nombre}`;
    process.stdout.write(`${label} … `);

    const coords = await resolveGoogleMapsLinkCoords(row.link_mapa);
    await sleep(400);

    if (!coords) {
      console.log("sin coords (link no resuelto)");
      fail += 1;
      continue;
    }

    if (!force && hasCoords(row)) {
      const same =
        Math.abs(Number(row.latitud) - coords.lat) < 1e-6 &&
        Math.abs(Number(row.longitud) - coords.lng) < 1e-6;
      if (same) {
        console.log("ya OK");
        skip += 1;
        continue;
      }
    }

    console.log(
      `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)} ← ${coords.resolvedFrom.slice(0, 72)}${coords.resolvedFrom.length > 72 ? "…" : ""}`,
    );

    if (dryRun) {
      ok += 1;
      continue;
    }

    const { error: upErr } = await supabase
      .from("locaciones")
      .update({ latitud: coords.lat, longitud: coords.lng })
      .eq("id", row.id);

    if (upErr) {
      console.error(`  ERROR al guardar: ${upErr.message}`);
      fail += 1;
    } else {
      ok += 1;
    }
  }

  console.log("\n---");
  console.log(`Actualizadas: ${ok} | Omitidas: ${skip} | Fallidas: ${fail}`);
  if (dryRun) console.log("(dry-run: no se escribió en la base)");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
