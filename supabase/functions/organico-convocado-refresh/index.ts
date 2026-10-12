/**
 * Recalcula programas.organico_convocado de giras vigentes o futuras.
 * Auth: x-db-backup-cron-secret (mismo vault que el resto de crons).
 * Una pasada diaria (07:00 ART). Recorre vigentes y futuros hasta ~90 s.
 * Body opcional: { "limit": 40 } para acotar la tanda.
 */
import { createClient } from "npm:@supabase/supabase-js@2";
// rosterRefresh.mjs es el bundle de src/services/organicoConvocadoService.js.
// Si cambia el cálculo del roster, regenerarlo antes de desplegar:
// npx esbuild src/services/organicoConvocadoService.js --bundle --platform=neutral --format=esm --outfile=supabase/functions/organico-convocado-refresh/rosterRefresh.mjs
import {
  listCurrentOrganicoProgramas,
  refreshOrganicoProgramas,
} from "./rosterRefresh.mjs";

const CRON_SECRET =
  Deno.env.get("DB_BACKUP_CRON_SECRET") ??
  Deno.env.get("HORAS_RECORDATORIO_CRON_SECRET") ??
  Deno.env.get("ENSAYO_DIARIO_CRON_SECRET") ??
  "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-db-backup-cron-secret",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (!CRON_SECRET) {
    return json({ ok: false, error: "Falta el secret del cron" }, 500);
  }

  const hdr = req.headers.get("x-db-backup-cron-secret") ?? "";
  if (hdr !== CRON_SECRET) {
    return json({ ok: false, error: "No autorizado" }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!supabaseUrl || !serviceKey) {
    return json({ ok: false, error: "Falta la service role" }, 500);
  }

  let limit = 0;
  try {
    const body = await req.json();
    const n = Number(body?.limit);
    if (Number.isFinite(n) && n > 0 && n <= 200) limit = n;
  } catch {
    // body vacío: toda la tanda vigente, cortada por tiempo
  }

  const supabase = createClient(supabaseUrl, serviceKey);
  const deadlineMs = Date.now() + 90_000;
  try {
    let rows = await listCurrentOrganicoProgramas(supabase);
    if (limit > 0) rows = rows.slice(0, limit);
    const result = await refreshOrganicoProgramas(supabase, rows, {
      deadlineMs,
    });
    return json({
      ok: true,
      ...result,
      stoppedEarly: result.updated.length + result.failed.length < rows.length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return json({ ok: false, error: message }, 500);
  }
});
