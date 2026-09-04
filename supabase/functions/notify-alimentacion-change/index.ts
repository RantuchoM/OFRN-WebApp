import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import nodemailer from "npm:nodemailer@6.9.7";

const GMAIL_USER = Deno.env.get("GMAIL_USER");
const GMAIL_PASS = Deno.env.get("GMAIL_PASS");
const TO_EMAIL = "filarmonica.scrn@gmail.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function esc(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const raw = await req.json();
    const payload = typeof raw?.body === "object" ? raw.body : raw;
    const nombre = String(payload?.nombre || "").trim();
    const apellido = String(payload?.apellido || "").trim();
    const display =
      [nombre, apellido].filter(Boolean).join(" ") || "Integrante";
    const anterior = String(payload?.alimentacion_anterior || payload?.anterior || "").trim() ||
      "(sin dato)";
    const nueva = String(payload?.alimentacion_nueva || payload?.nueva || "").trim() ||
      "(sin dato)";
    const mail = String(payload?.mail || "").trim();
    const id = payload?.id != null ? String(payload.id) : "";

    if (!GMAIL_USER || !GMAIL_PASS) {
      throw new Error("Falta configurar credenciales de Gmail en Secrets.");
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Helvetica, Arial, sans-serif; color: #333; line-height: 1.6; font-size: 14px; }
          .box { border-left: 4px solid #d97706; background-color: #fffbeb; padding: 15px; margin: 20px 0; border-radius: 4px; }
          .diet { font-weight: bold; color: #111; }
        </style>
      </head>
      <body>
        <p>Hola producción,</p>
        <p>Un integrante actualizó su tipo de alimentación desde Mi Perfil.</p>
        <div class="box">
          <h3 style="margin-top:0; color:#111;">${esc(display)}</h3>
          ${id ? `<p style="margin:0 0 8px 0; color:#555; font-size:13px;">ID: ${esc(id)}${mail ? ` · ${esc(mail)}` : ""}</p>` : ""}
          <ul style="list-style-type: none; padding-left: 0; margin: 0;">
            <li>• Anterior: <span class="diet">${esc(anterior)}</span></li>
            <li>• Nueva: <span class="diet">${esc(nueva)}</span></li>
          </ul>
        </div>
        <p style="color: #666; font-size: 12px;">Orquesta Filarmónica de Río Negro – Sistema de Gestión</p>
      </body>
      </html>
    `;

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: GMAIL_USER, pass: GMAIL_PASS },
    });

    const info = await transporter.sendMail({
      from: `"Filarmónica SCRN" <${GMAIL_USER}>`,
      replyTo: "filarmonica.scrn@gmail.com",
      to: TO_EMAIL,
      subject: `Cambio de alimentación | ${display}`,
      html,
    });

    return new Response(JSON.stringify({ success: true, id: info.messageId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[notify-alimentacion-change]", message);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
