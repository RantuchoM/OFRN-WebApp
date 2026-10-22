/**
 * Formulario público de ayuda en /entradas.
 * Envía a filarmonica.scrn+entradas@gmail.com con Reply-To = mail del consultante.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import nodemailer from "npm:nodemailer@6.9.7";

const GMAIL_USER = Deno.env.get("ENTRADAS_GMAIL_USER") || Deno.env.get("GMAIL_USER") || "";
const GMAIL_PASS = Deno.env.get("ENTRADAS_GMAIL_PASS") || Deno.env.get("GMAIL_PASS") || "";
const AYUDA_TO =
  Deno.env.get("ENTRADAS_AYUDA_TO") || "filarmonica.scrn+entradas@gmail.com";

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

    const body = await req.json();
    // Honeypot: bots rellenan "website"
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

    let cantidad = "";
    if (cantidadRaw) {
      const n = Number(cantidadRaw);
      if (!Number.isFinite(n) || n < 1 || n > 4 || Math.round(n) !== n) {
        return new Response(JSON.stringify({ error: "La cantidad de entradas debe ser entre 1 y 4." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      cantidad = String(n);
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

    const subject = "Consulta sobre entradas";
    const textLines = [
      "Consulta desde el formulario de ayuda de Entradas OFRN.",
      "",
      `Nombre completo: ${nombre}`,
      `Mail: ${email}`,
      `Teléfono: ${telefono || "—"}`,
      `Cantidad de entradas: ${cantidad || "—"}`,
      `Función: ${funcion || "—"}`,
      `Otros comentarios:`,
      comentarios || "—",
      "",
      `IP: ${ip}`,
    ];
    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8" /></head>
<body style="font-family: Helvetica, Arial, sans-serif; color: #334155; line-height: 1.5;">
  <p>Consulta desde el formulario de ayuda de <strong>Entradas OFRN</strong>.</p>
  <table style="border-collapse:collapse;width:100%;max-width:520px;">
    <tr><td style="padding:6px 0;font-weight:700;">Nombre completo</td><td style="padding:6px 0;">${escHtml(nombre)}</td></tr>
    <tr><td style="padding:6px 0;font-weight:700;">Mail</td><td style="padding:6px 0;"><a href="mailto:${escHtml(email)}">${escHtml(email)}</a></td></tr>
    <tr><td style="padding:6px 0;font-weight:700;">Teléfono</td><td style="padding:6px 0;">${escHtml(telefono || "—")}</td></tr>
    <tr><td style="padding:6px 0;font-weight:700;">Cantidad de entradas</td><td style="padding:6px 0;">${escHtml(cantidad || "—")}</td></tr>
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

    return new Response(JSON.stringify({ success: true }), {
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
