/**
 * Formulario público de ayuda en /entradas.
 * Persiste en entrada_ayuda_consulta y avisa a staff con enlace a Terceros.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import nodemailer from "npm:nodemailer@6.9.7";

const GMAIL_USER = Deno.env.get("ENTRADAS_GMAIL_USER") || Deno.env.get("GMAIL_USER") || "";
const GMAIL_PASS = Deno.env.get("ENTRADAS_GMAIL_PASS") || Deno.env.get("GMAIL_PASS") || "";
const AYUDA_TO =
  Deno.env.get("ENTRADAS_AYUDA_TO") || "filarmonica.scrn+entradas@gmail.com";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const PUBLIC_BASE = (Deno.env.get("ENTRADAS_PUBLIC_URL") ?? "https://ofrn-web-app.vercel.app").replace(
  /\/$/,
  "",
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const COOLDOWN_MS = 60_000;
const recentByKey = new Map<string, number>();

function normalizeEmail(value: unknown): string {
  return String(value || "").trim().toLowerCase();
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function escHtml(s: string): string {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function pruneCooldown(now: number) {
  for (const [key, at] of recentByKey) {
    if (now - at > COOLDOWN_MS * 2) recentByKey.delete(key);
  }
}

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
    if (!GMAIL_USER || !GMAIL_PASS) {
      throw new Error("Falta ENTRADAS_GMAIL_USER/ENTRADAS_GMAIL_PASS o GMAIL_USER/GMAIL_PASS.");
    }
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Falta SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.");
    }

    const body = await req.json();
    if (String(body?.website || "").trim()) {
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const nombre = String(body?.nombre || "").trim();
    const email = normalizeEmail(body?.email);
    const telefono = String(body?.telefono || "").trim();
    const cantidadRaw = String(body?.cantidad || "").trim();
    const funcion = String(body?.funcion || "").trim();
    const comentarios = String(body?.comentarios || "").trim();
    const conciertoIdRaw = body?.concierto_id ?? body?.conciertoId;
    const conciertoIdNum = Number(conciertoIdRaw);
    const conciertoId =
      Number.isFinite(conciertoIdNum) && conciertoIdNum > 0 ? conciertoIdNum : null;

    if (!nombre || nombre.length < 2) {
      return new Response(JSON.stringify({ error: "Completá tu nombre completo." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!isValidEmail(email)) {
      return new Response(JSON.stringify({ error: "Ingresá un mail válido." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let cantidad: number | null = null;
    if (cantidadRaw) {
      const n = Number(cantidadRaw);
      if (!Number.isFinite(n) || n < 1 || n > 4 || Math.round(n) !== n) {
        return new Response(JSON.stringify({ error: "La cantidad de entradas debe ser entre 1 y 4." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      cantidad = n;
    }

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      || req.headers.get("x-real-ip")
      || "unknown";
    const now = Date.now();
    pruneCooldown(now);
    const rateKey = `${email}|${ip}`;
    const last = recentByKey.get(rateKey) || 0;
    if (now - last < COOLDOWN_MS) {
      return new Response(
        JSON.stringify({ error: "Esperá un minuto antes de enviar otra consulta." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: inserted, error: insertErr } = await admin
      .from("entrada_ayuda_consulta")
      .insert({
        nombre,
        email,
        telefono: telefono || null,
        cantidad,
        concierto_id: conciertoId,
        funcion_label: funcion || null,
        comentarios: comentarios || null,
        estado: "pendiente",
      })
      .select("id")
      .single();
    if (insertErr) {
      throw new Error(`No se pudo guardar la consulta: ${insertErr.message}`);
    }
    const consultaId = inserted?.id;
    if (!consultaId) throw new Error("No se obtuvo id de consulta.");

    const staffUrl =
      `${PUBLIC_BASE}/entradas?view=entradas-terceros&ayuda=${encodeURIComponent(consultaId)}`;

    const subject = `Consulta sobre entradas — ${nombre}`;
    const cantidadTxt = cantidad != null ? String(cantidad) : "—";
    const textLines = [
      "Consulta desde el formulario de ayuda de Entradas OFRN.",
      "",
      `Abrir en Entradas (Terceros): ${staffUrl}`,
      "",
      `Nombre completo: ${nombre}`,
      `Mail: ${email}`,
      `Teléfono: ${telefono || "—"}`,
      `Cantidad de entradas: ${cantidadTxt}`,
      `Función: ${funcion || "—"}`,
      `Otros comentarios:`,
      comentarios || "—",
      "",
      `ID consulta: ${consultaId}`,
      `IP: ${ip}`,
    ];
    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8" /></head>
<body style="font-family: Helvetica, Arial, sans-serif; color: #334155; line-height: 1.5;">
  <p>Consulta desde el formulario de ayuda de <strong>Entradas OFRN</strong>.</p>
  <p style="margin: 18px 0;">
    <a href="${escHtml(staffUrl)}"
       style="display:inline-block;background:#1ebbf0;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:700;font-size:14px;">
      Reservar en Entradas
    </a>
  </p>
  <p style="font-size:12px;color:#64748b;">Si ya fue resuelta, al abrir el enlace lo vas a ver marcado.</p>
  <table style="border-collapse:collapse;width:100%;max-width:520px;">
    <tr><td style="padding:6px 0;font-weight:700;">Nombre completo</td><td style="padding:6px 0;">${escHtml(nombre)}</td></tr>
    <tr><td style="padding:6px 0;font-weight:700;">Mail</td><td style="padding:6px 0;"><a href="mailto:${escHtml(email)}">${escHtml(email)}</a></td></tr>
    <tr><td style="padding:6px 0;font-weight:700;">Teléfono</td><td style="padding:6px 0;">${escHtml(telefono || "—")}</td></tr>
    <tr><td style="padding:6px 0;font-weight:700;">Cantidad de entradas</td><td style="padding:6px 0;">${escHtml(cantidadTxt)}</td></tr>
    <tr><td style="padding:6px 0;font-weight:700;">Función</td><td style="padding:6px 0;">${escHtml(funcion || "—")}</td></tr>
    <tr><td style="padding:6px 0;font-weight:700;vertical-align:top;">Otros comentarios</td><td style="padding:6px 0;white-space:pre-wrap;">${escHtml(comentarios || "—")}</td></tr>
  </table>
  <p style="font-size:12px;color:#64748b;margin-top:16px;">Respondé a este mail para contestar al consultante (Reply-To).</p>
</body></html>`;

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: GMAIL_USER, pass: GMAIL_PASS },
    });

    await transporter.sendMail({
      from: `"Entradas OFRN" <${GMAIL_USER}>`,
      to: AYUDA_TO,
      replyTo: email,
      subject,
      text: textLines.join("\n"),
      html,
    });

    recentByKey.set(rateKey, now);

    return new Response(JSON.stringify({ success: true, id: consultaId }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[entradas-send-ayuda] ERROR:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
