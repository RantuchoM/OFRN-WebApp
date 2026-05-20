/**
 * Envía un mail de prueba (recordatorio o encuesta) al admin logueado.
 * No marca recordatorio_enviado_at ni encuesta_enviada_at.
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
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
/** Fallback si el concierto no tiene `encuesta_url` (encuesta en Linktree OFRN). */
const ENCUESTA_URL_DEFAULT = "https://linktr.ee/conciertos_ofrn";
const ENCUESTA_URL = Deno.env.get("ENTRADAS_ENCUESTA_URL") ?? ENCUESTA_URL_DEFAULT;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type MailTipo = "recordatorio" | "encuesta";

type PreviewPayload = {
  nombre?: string;
  slugPublico?: string;
  encuestaUrl?: string;
  fechaTexto?: string;
  lugar?: string;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Método no permitido" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    if (!GMAIL_USER || !GMAIL_PASS || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error("Config incompleta en el servidor de mails.");
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as {
      tipo?: MailTipo;
      conciertoId?: number;
      preview?: PreviewPayload;
      appUrl?: string;
    };

    const tipo = body?.tipo;
    if (tipo !== "recordatorio" && tipo !== "encuesta") {
      throw new Error("tipo inválido (recordatorio | encuesta).");
    }

    const supabaseUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: authErr,
    } = await supabaseUser.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Sesión inválida" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: perfil, error: perfilErr } = await supabaseUser
      .from("entrada_usuario")
      .select("rol, nombre, apellido, email")
      .eq("id", user.id)
      .maybeSingle();

    if (perfilErr) throw perfilErr;
    if (perfil?.rol !== "admin") {
      return new Response(JSON.stringify({ error: "Solo administradores pueden enviar mails de prueba." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const emailTo = String(perfil?.email || user.email || "").trim();
    if (!emailTo) {
      throw new Error("No hay email en tu perfil de Entradas para enviar la prueba.");
    }

    const conciertoId = Number(body?.conciertoId || 0);
    let conciertoNombre = String(body?.preview?.nombre || "").trim() || "Concierto (prueba)";
    let slugPublico = String(body?.preview?.slugPublico || "").trim();
    let encuestaUrl = String(body?.preview?.encuestaUrl || "").trim();
    let fechaTexto = String(body?.preview?.fechaTexto || "").trim();
    let lugar = String(body?.preview?.lugar || "").trim();

    if (conciertoId > 0) {
      const { data: concierto, error: cErr } = await supabaseUser
        .from("entrada_concierto")
        .select(`id, nombre, slug_publico, encuesta_url, ofrn_evento_id, ${ENTRADA_CONCIERTO_EVENTO_SELECT}`)
        .eq("id", conciertoId)
        .maybeSingle();

      if (cErr) throw cErr;
      if (!concierto) throw new Error("Concierto no encontrado.");

      conciertoNombre = String(concierto.nombre || conciertoNombre);
      slugPublico = String(concierto.slug_publico || slugPublico);
      if (!encuestaUrl) encuestaUrl = String(concierto.encuesta_url || "").trim();
      if (!fechaTexto) {
        fechaTexto = formatFechaHoraEntradasMail(fechaHoraDesdeEventoOfrn(concierto.evento));
      }
      if (!lugar) lugar = lugarNombreDesdeEventoOfrn(concierto.evento);
    }

    const appUrl = String(body?.appUrl || Deno.env.get("ENTRADAS_PUBLIC_URL") || "https://entradas.ofrn.gob.ar")
      .replace(/\/$/, "");
    const linkConcierto = slugPublico
      ? `${appUrl}/?concierto=${encodeURIComponent(slugPublico)}`
      : appUrl;
    const linkMisEntradas = `${appUrl}/?view=mis-reservas`;

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: GMAIL_USER, pass: GMAIL_PASS },
    });

    if (tipo === "recordatorio") {
      const html = templateRecordatorio({
        conciertoNombre,
        fechaTexto,
        lugar,
        linkConcierto,
        linkMisEntradas,
        esPrueba: true,
      });

      const info = await transporter.sendMail({
        from: `"Entradas OFRN" <${GMAIL_USER}>`,
        to: emailTo,
        subject: `[Prueba] Recordatorio · ${conciertoNombre}`,
        html,
      });

      return new Response(JSON.stringify({ success: true, id: info.messageId, to: emailTo }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const encuestaFinal = encuestaUrl || ENCUESTA_URL;
    if (!encuestaFinal.startsWith("http")) {
      throw new Error(
        "No hay URL de encuesta válida. Configurá ENTRADAS_ENCUESTA_URL en el servidor o un enlace en el concierto.",
      );
    }

    const html = templateEncuesta({
      conciertoNombre,
      encuestaUrl: encuestaFinal,
      esPrueba: true,
    });

    const info = await transporter.sendMail({
      from: `"Entradas OFRN" <${GMAIL_USER}>`,
      to: emailTo,
      subject: `[Prueba] Encuesta · ${conciertoNombre}`,
      html,
    });

    return new Response(
      JSON.stringify({
        success: true,
        id: info.messageId,
        to: emailTo,
        encuestaUrl: encuestaFinal,
        encuestaFallback: !encuestaUrl,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[entradas-send-test-mail] ERROR:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
