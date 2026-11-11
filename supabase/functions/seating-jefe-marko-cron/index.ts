/**
 * Cron: resume a Marko lotes de jefe de fila sin notificar ~1h.
 * Auth: x-db-backup-cron-secret (o SEATING_JEFE_MARKO_CRON_SECRET).
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const CRON_SECRET =
  Deno.env.get("SEATING_JEFE_MARKO_CRON_SECRET") ??
  Deno.env.get("DB_BACKUP_CRON_SECRET") ??
  "";
const MARKO_TO = "marko.scrn@gmail.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-db-backup-cron-secret, x-seating-jefe-marko-cron-secret",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (CRON_SECRET) {
    const hdr =
      req.headers.get("x-seating-jefe-marko-cron-secret") ??
      req.headers.get("x-db-backup-cron-secret") ??
      "";
    if (hdr !== CRON_SECRET) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  if (!SUPABASE_URL || !SERVICE_ROLE) {
    return new Response(JSON.stringify({ error: "Config incompleta" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
  const out = { claimed: 0, sent: 0, failed: 0, errores: [] as string[] };

  const { data: claimed, error: claimErr } = await supabase.rpc(
    "claim_seating_jefe_marko_pendiente_due",
    { p_max: 20, p_idle_minutes: 60 },
  );

  if (claimErr) {
    out.errores.push(`claim: ${claimErr.message}`);
    return new Response(JSON.stringify(out), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const rows = Array.isArray(claimed) ? claimed : [];
  out.claimed = rows.length;

  for (const row of rows) {
    try {
      const programaId = row.id_programa;
      const { data: prog, error: progErr } = await supabase
        .from("programas")
        .select("id, nombre_gira, nomenclador, fecha_desde, fecha_hasta, zona")
        .eq("id", programaId)
        .maybeSingle();
      if (progErr) throw new Error(progErr.message);

      const novedades = Array.isArray(row.novedades) ? row.novedades : [];
      if (!novedades.length) continue;

      const actor = String(row.actor_nombre || "jefe/a de fila").trim();
      const reason = novedades
        .map((n: any) => {
          const tag = n?.tipo === "atril" ? "atril/silla" : "particella";
          return `- [${tag}] ${n?.musico || "?"} | ${n?.obra || "?"}: ${n?.cambio || ""}`;
        })
        .join("\n");

      const nPart = novedades.filter((n: any) => n?.tipo !== "atril").length;
      const nAtril = novedades.filter((n: any) => n?.tipo === "atril").length;
      const gira = prog?.nombre_gira || prog?.nomenclador || `Gira ${programaId}`;

      const { data: mailRes, error: mailErr } = await supabase.functions.invoke(
        "mails_produccion",
        {
          body: {
            action: "enviar_mail",
            templateId: "convocatoria_gira",
            email: MARKO_TO,
            nombre: "Marko",
            gira,
            detalle: {
              variant: "SEATING_CAMBIO_JEFE_RESUMEN",
              actor_jefe: actor,
              reason,
              novedades_resumen: novedades,
              nomenclador: prog?.nomenclador || gira,
              fecha_desde: prog?.fecha_desde || "",
              fecha_hasta: prog?.fecha_hasta || "",
              zona: prog?.zona || "",
              vars: {
                actor_jefe: actor,
                cantidad: String(novedades.length),
                cantidad_particella: String(nPart),
                cantidad_atril: String(nAtril),
                bloque: row.bloque_nombre || "",
              },
            },
          },
        },
      );

      if (mailErr) {
        out.failed += 1;
        out.errores.push(`mail row ${row.id}: ${mailErr.message}`);
        // Liberar claim para reintento
        await supabase
          .from("seating_jefe_marko_pendiente")
          .update({ notified_at: null, notified_via: null })
          .eq("id", row.id);
        continue;
      }
      if (mailRes && mailRes.success === false) {
        out.failed += 1;
        out.errores.push(`mail row ${row.id}: ${JSON.stringify(mailRes)}`);
        await supabase
          .from("seating_jefe_marko_pendiente")
          .update({ notified_at: null, notified_via: null })
          .eq("id", row.id);
        continue;
      }
      out.sent += 1;
    } catch (err) {
      out.failed += 1;
      out.errores.push(
        `row ${row?.id}: ${err instanceof Error ? err.message : String(err)}`,
      );
      if (row?.id != null) {
        await supabase
          .from("seating_jefe_marko_pendiente")
          .update({ notified_at: null, notified_via: null })
          .eq("id", row.id);
      }
    }
  }

  return new Response(JSON.stringify(out), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
