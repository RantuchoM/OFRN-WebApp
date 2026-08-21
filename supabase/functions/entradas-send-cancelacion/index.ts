/**
 * Envío masivo de aviso de cancelación tras suspender un programa (admin).
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import nodemailer from "npm:nodemailer@6.9.7";
import {
  formatFechaHoraEntradasMail,
  linkEntradasMisReservas,
  subjectCancelacion,
  templateCancelacionConcierto,
} from "../entradas-cron-mails/entradasCronMailTemplates.ts";
import { sendEntradasMailBcc } from "../entradas-cron-mails/entradasMailBcc.ts";

const GMAIL_USER = Deno.env.get("GMAIL_USER");
const GMAIL_PASS = Deno.env.get("GMAIL_PASS");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type NotificarConcierto = {
  concierto_id?: number;
  concierto_nombre?: string;
  fecha_hora?: string;
  lugar_nombre?: string;
  emails?: string[];
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

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Sesión inválida" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: perfil, error: perfilErr } = await supabase
      .from("entrada_usuario")
      .select("rol")
      .eq("id", user.id)
      .maybeSingle();

    if (perfilErr) throw perfilErr;
    if (perfil?.rol !== "admin") {
      return new Response(JSON.stringify({ error: "Sin permisos admin" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as {
      programaNombre?: string;
      appUrl?: string;
      notificar?: NotificarConcierto[];
    };

    const programaNombre = String(body?.programaNombre || "").trim();
    const baseUrl = String(
      body?.appUrl || Deno.env.get("ENTRADAS_PUBLIC_URL") || "https://ofrn-web-app.vercel.app",
    ).replace(/\/$/, "");
    const linkMisEntradas = linkEntradasMisReservas(baseUrl);
    const conciertos = Array.isArray(body?.notificar) ? body.notificar : [];

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: GMAIL_USER, pass: GMAIL_PASS },
    });

    let destinatarios = 0;
    let envios_smtp = 0;
    const errores: string[] = [];

    for (const row of conciertos) {
      const emails = Array.isArray(row.emails) ? row.emails : [];
      const bcc = emails.map((e) => String(e || "").trim()).filter(Boolean);
      if (!bcc.length) continue;

      const conciertoNombre = String(row.concierto_nombre || "Concierto").trim() || "Concierto";
      const fechaTexto = formatFechaHoraEntradasMail(row.fecha_hora);
      const lugar = String(row.lugar_nombre || "").trim();

      try {
        const sent = await sendEntradasMailBcc(transporter, {
          gmailUser: GMAIL_USER!,
          subject: subjectCancelacion(conciertoNombre),
          html: templateCancelacionConcierto({
            conciertoNombre,
            programaNombre: programaNombre || undefined,
            fechaTexto,
            lugar,
            linkMisEntradas,
          }),
          bcc,
        });
        destinatarios += sent.destinatarios;
        envios_smtp += sent.envios;
      } catch (e) {
        errores.push(
          `concierto ${row.concierto_id ?? "?"}: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        destinatarios,
        envios_smtp,
        errores,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[entradas-send-cancelacion] ERROR:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
