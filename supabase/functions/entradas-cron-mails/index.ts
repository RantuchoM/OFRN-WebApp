/**
 * Cron: recordatorios pre-concierto y encuesta post-ingreso.
 * Invocar con service role (verify_jwt = false + secret header opcional).
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import nodemailer from "npm:nodemailer@6.9.7";
import {
  ENTRADA_CONCIERTO_EVENTO_SELECT,
  fechaHoraDesdeEventoOfrn,
  lugarNombreDesdeEventoOfrn,
} from "./entradasConciertoEvento.ts";
import {
  formatFechaHoraEntradasMail,
  templateEncuesta,
  templateRecordatorio,
} from "./entradasCronMailTemplates.ts";

const GMAIL_USER = Deno.env.get("GMAIL_USER");
const GMAIL_PASS = Deno.env.get("GMAIL_PASS");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const CRON_SECRET = Deno.env.get("ENTRADAS_CRON_SECRET") ?? "";
/** Fallback si el concierto no tiene `encuesta_url` (encuesta en Linktree OFRN). */
const ENCUESTA_URL_DEFAULT = "https://linktr.ee/conciertos_ofrn";
const ENCUESTA_URL = Deno.env.get("ENTRADAS_ENCUESTA_URL") ?? ENCUESTA_URL_DEFAULT;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-entradas-cron-secret",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (CRON_SECRET) {
    const hdr = req.headers.get("x-entradas-cron-secret") ?? "";
    if (hdr !== CRON_SECRET) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  if (!GMAIL_USER || !GMAIL_PASS || !SUPABASE_URL || !SERVICE_ROLE) {
    return new Response(JSON.stringify({ error: "Config incompleta" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: GMAIL_USER, pass: GMAIL_PASS },
  });

  const nowIso = new Date().toISOString();
  const out = { recordatorios: 0, encuestas: 0, errores: [] as string[] };

  const { data: recordatorioRows, error: recErr } = await supabase
    .from("entrada_concierto")
    .select(
      `id, nombre, slug_publico, limite_recordatorio_at, recordatorio_enviado_at, ofrn_evento_id, ${ENTRADA_CONCIERTO_EVENTO_SELECT}`,
    )
    .eq("activo", true)
    .is("recordatorio_enviado_at", null)
    .lte("limite_recordatorio_at", nowIso);

  if (recErr) {
    out.errores.push(`recordatorio query: ${recErr.message}`);
  } else {
    for (const concierto of recordatorioRows || []) {
      const { data: reservas, error: rErr } = await supabase
        .from("entrada_reserva")
        .select(
          "codigo_reserva, usuario:entrada_usuario!entrada_reserva_usuario_id_fkey(nombre, apellido, email)",
        )
        .eq("concierto_id", concierto.id)
        .eq("estado", "activa");

      if (rErr) {
        out.errores.push(`reservas ${concierto.id}: ${rErr.message}`);
        continue;
      }

      const baseUrl = Deno.env.get("ENTRADAS_PUBLIC_URL") ?? "https://entradas.ofrn.gob.ar";
      const linkConcierto = `${baseUrl.replace(/\/$/, "")}/?concierto=${encodeURIComponent(concierto.slug_publico || "")}`;
      const fechaTexto = formatFechaHoraEntradasMail(fechaHoraDesdeEventoOfrn(concierto.evento));

      for (const row of reservas || []) {
        const email = String(row?.usuario?.email || "").trim();
        if (!email) continue;
        const nombre = [row?.usuario?.nombre, row?.usuario?.apellido]
          .filter(Boolean)
          .join(" ")
          .trim() || "Público";
        try {
          await transporter.sendMail({
            from: `"Entradas OFRN" <${GMAIL_USER}>`,
            to: email,
            subject: `Recordatorio · ${concierto.nombre || "Concierto OFRN"}`,
            html: templateRecordatorio({
              nombre,
              conciertoNombre: String(concierto.nombre || "Concierto"),
              fechaTexto,
              lugar: lugarNombreDesdeEventoOfrn(concierto.evento),
              codigo: String(row.codigo_reserva || ""),
              linkConcierto,
            }),
          });
          out.recordatorios += 1;
        } catch (e) {
          out.errores.push(`mail rec ${email}: ${e instanceof Error ? e.message : String(e)}`);
        }
      }

      await supabase
        .from("entrada_concierto")
        .update({ recordatorio_enviado_at: nowIso })
        .eq("id", concierto.id);
    }
  }

  const { data: encuestaRows, error: encErr } = await supabase
    .from("entrada_concierto")
    .select("id, nombre, limite_encuesta_at, encuesta_enviada_at, encuesta_url")
    .eq("activo", true)
    .is("encuesta_enviada_at", null)
    .lte("limite_encuesta_at", nowIso);

  if (encErr) {
    out.errores.push(`encuesta query: ${encErr.message}`);
  } else {
    for (const concierto of encuestaRows || []) {
      const encuestaUrl = String(concierto.encuesta_url || "").trim() || ENCUESTA_URL;
      if (!encuestaUrl.startsWith("http")) {
        out.errores.push(
          `encuesta concierto ${concierto.id}: sin URL válida (cargar enlace en admin del concierto)`,
        );
        continue;
      }

      const { data: reservas, error: rErr } = await supabase
        .from("entrada_reserva")
        .select(
          "id, usuario:entrada_usuario!entrada_reserva_usuario_id_fkey(nombre, apellido, email), entrada_reserva_entrada(estado_ingreso)",
        )
        .eq("concierto_id", concierto.id)
        .eq("estado", "activa");

      if (rErr) {
        out.errores.push(`encuesta reservas ${concierto.id}: ${rErr.message}`);
        continue;
      }

      const enviados = new Set<string>();
      for (const row of reservas || []) {
        const entradas = Array.isArray(row.entrada_reserva_entrada)
          ? row.entrada_reserva_entrada
          : [];
        const ingreso = entradas.some((e) => e?.estado_ingreso === "ingresada");
        if (!ingreso) continue;

        const email = String(row?.usuario?.email || "").trim().toLowerCase();
        if (!email || enviados.has(email)) continue;
        enviados.add(email);

        const nombre = [row?.usuario?.nombre, row?.usuario?.apellido]
          .filter(Boolean)
          .join(" ")
          .trim() || "Público";
        try {
          await transporter.sendMail({
            from: `"Entradas OFRN" <${GMAIL_USER}>`,
            to: email,
            subject: `Encuesta · ${concierto.nombre || "Concierto OFRN"}`,
            html: templateEncuesta({
              nombre,
              conciertoNombre: String(concierto.nombre || "Concierto"),
              encuestaUrl,
            }),
          });
          out.encuestas += 1;
        } catch (e) {
          out.errores.push(`mail enc ${email}: ${e instanceof Error ? e.message : String(e)}`);
        }
      }

      await supabase
        .from("entrada_concierto")
        .update({ encuesta_enviada_at: nowIso })
        .eq("id", concierto.id);
    }
  }

  return new Response(JSON.stringify({ ok: true, ...out }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
