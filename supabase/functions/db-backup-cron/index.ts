/**
 * Backup diario → JSON por tabla en Storage (bucket ofrn-db-backups).
 */
import { createClient } from "npm:@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-db-backup-cron-secret",
};

const CRON_SECRET = Deno.env.get("DB_BACKUP_CRON_SECRET") ?? "";
const BUCKET = "ofrn-db-backups";
const PAGE_SIZE = 1000;

const DAILY_TABLES = [
  "horas_catedra",
  "integrantes",
  "integrantes_ensambles",
  "instrumentos",
  "ensambles",
];

const CRITICAL_TABLES = [
  ...DAILY_TABLES,
  "programas",
  "giras_integrantes",
  "giras_hospedajes",
  "giras_transportes",
  "giras_viaticos_detalle",
  "giras_fuentes",
  "eventos",
  "eventos_asistencia",
  "obras",
  "programas_repertorios",
  "repertorio_obras",
  "localidades",
  "locaciones",
  "hoteles",
  "feriados",
  "viaticos_valor_diario_vigencia",
  "destaques_config",
];

async function uploadJson(
  supabaseUrl: string,
  serviceKey: string,
  path: string,
  jsonText: string,
) {
  const res = await fetch(`${supabaseUrl}/storage/v1/object/${BUCKET}/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
      "Content-Type": "application/json",
      "x-upsert": "true",
    },
    body: jsonText,
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Storage ${path}: ${res.status} ${detail}`);
  }
}

async function fetchTableRows(supabase: ReturnType<typeof createClient>, table: string) {
  const rows: unknown[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    if (!data?.length) break;
    rows.push(...data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return rows;
}

async function runBackup(
  supabase: ReturnType<typeof createClient>,
  supabaseUrl: string,
  serviceKey: string,
  mode: "daily" | "critical",
  stamp: string,
  tableNames: string[],
) {
  const prefix = `${mode}/${stamp}`;
  const uploaded: Array<{ table: string; path: string; rows: number; bytes: number }> = [];
  let totalRows = 0;

  for (const tablename of tableNames) {
    const rows = await fetchTableRows(supabase, tablename);
    totalRows += rows.length;
    const jsonText = JSON.stringify({
      meta: {
        exported_at: new Date().toISOString(),
        table: tablename,
        row_count: rows.length,
        format: "json-table-v1",
      },
      rows,
    });
    const path = `${prefix}/${tablename}.json`;
    await uploadJson(supabaseUrl, serviceKey, path, jsonText);
    uploaded.push({
      table: tablename,
      path,
      rows: rows.length,
      bytes: new TextEncoder().encode(jsonText).byteLength,
    });
  }

  const manifestText = JSON.stringify({
    meta: {
      exported_at: new Date().toISOString(),
      stamp,
      mode,
      table_count: uploaded.length,
      row_count: totalRows,
    },
    files: uploaded,
  });
  await uploadJson(supabaseUrl, serviceKey, `${prefix}/manifest.json`, manifestText);
  console.log("[db-backup-cron] OK", { stamp, mode, tables: uploaded.length, rows: totalRows });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (CRON_SECRET) {
    const hdr = req.headers.get("x-db-backup-cron-secret") ?? "";
    if (hdr !== CRON_SECRET) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  let mode: "daily" | "critical" = "daily";
  let dryRun = false;
  try {
    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      if (body?.mode === "critical") mode = "critical";
      dryRun = body?.dryRun === true;
    }
  } catch {
    /* defaults */
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    return new Response(JSON.stringify({ error: "SUPABASE_URL / SERVICE_ROLE faltantes" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(supabaseUrl, serviceKey);
  const stamp = new Date().toISOString().slice(0, 10);
  const tableNames = mode === "daily" ? DAILY_TABLES : CRITICAL_TABLES;

  if (dryRun) {
    try {
      const counts: Record<string, number> = {};
      for (const t of tableNames) counts[t] = (await fetchTableRows(supabase, t)).length;
      return new Response(
        JSON.stringify({ success: true, dryRun: true, mode, rowCounts: counts }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    } catch (e) {
      return new Response(JSON.stringify({ error: (e as Error).message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  try {
    await runBackup(supabase, supabaseUrl, serviceKey, mode, stamp, tableNames);
    return new Response(
      JSON.stringify({
        success: true,
        stamp,
        mode,
        bucket: BUCKET,
        prefix: `${mode}/${stamp}`,
        message: "Backup completado en Storage → ofrn-db-backups.",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("[db-backup-cron] failed", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
