/**
 * Cron mensual: el día 1 (ART) avisa a producción que cargue los cambios de horas.
 * Destino: filarmonica.scrn@gmail.com
 * Pantalla: /?tab=musicos&vista=horas
 *
 * Auth: x-horas-recordatorio-cron-secret | x-db-backup-cron-secret
 * Body opcional: { "force": true, "to": "ofrn.archivo@gmail.com" }
 *   force envía aunque no sea día 1. to solo se acepta junto con force
 *   y únicamente para ofrn.archivo@gmail.com (vista previa).
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import nodemailer from "npm:nodemailer@6.9.7";

const GMAIL_USER = Deno.env.get("GMAIL_USER");
const GMAIL_PASS = Deno.env.get("GMAIL_PASS");
const CRON_SECRET =
  Deno.env.get("HORAS_RECORDATORIO_CRON_SECRET") ??
  Deno.env.get("DB_BACKUP_CRON_SECRET") ??
  Deno.env.get("ENSAYO_DIARIO_CRON_SECRET") ??
  Deno.env.get("ENSAYO_SALIDA_CRON_SECRET") ??
  "";
const APP_BASE = (
  Deno.env.get("APP_BASE_URL") ||
  Deno.env.get("FRONTEND_URL") ||
  "https://ofrn-web-app.vercel.app"
).replace(/\/$/, "");
const TO_EMAIL = "filarmonica.scrn@gmail.com";
const HORAS_PATH = "/?tab=musicos&vista=horas";

const MESES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-horas-recordatorio-cron-secret, x-db-backup-cron-secret",
};

function artParts(now = new Date()) {
  const t = new Date(now.getTime() - 3 * 60 * 60 * 1000);
  return {
    year: t.getUTCFullYear(),
    month: t.getUTCMonth() + 1,
    day: t.getUTCDate(),
  };
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (!CRON_SECRET) {
    return json({ ok: false, error: "Falta el secret del cron" }, 500);
  }

  const hdr =
    req.headers.get("x-horas-recordatorio-cron-secret") ??
    req.headers.get("x-db-backup-cron-secret") ??
    "";
  if (hdr !== CRON_SECRET) {
    return json({ error: "No autorizado" }, 401);
  }

  let force = false;
  let toOverride = "";
  if (req.method !== "GET") {
    try {
      const raw = await req.json();
      force = raw?.force === true;
      toOverride = String(raw?.to || "").trim().toLowerCase();
    } catch {
      force = false;
    }
  }

  const { year, month, day } = artParts();
  if (day !== 1 && !force) {
    return json({ ok: true, omitido: "no es dia 1", dia: day });
  }

  if (!GMAIL_USER || !GMAIL_PASS) {
    return json({ ok: false, error: "GMAIL_USER/GMAIL_PASS no configurados" }, 500);
  }

  const PREVIEW_TO = "ofrn.archivo@gmail.com";
  let to = TO_EMAIL;
  if (toOverride) {
    if (!force || toOverride !== PREVIEW_TO) {
      return json({ ok: false, error: "Destino de prueba no permitido" }, 400);
    }
    to = PREVIEW_TO;
  }

  const mes = MESES[month - 1] ?? String(month);
  const link = `${APP_BASE}${HORAS_PATH}`;
  const subject = `Recordatorio: actualizar cambios de horas · ${mes} ${year}`;
  const html = `<!DOCTYPE html>
<html>
<body style="font-family:Helvetica,Arial,sans-serif;color:#333;line-height:1.55;font-size:14px;">
  <p>Hola,</p>
  <p>Hoy es el primer día de <strong>${mes} ${year}</strong>. Recordá cargar en la app los cambios de horas cátedra que correspondan a este mes.</p>
  <p><a href="${link}" style="display:inline-block;padding:10px 16px;background:#b45309;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold;">Actualizar horas</a></p>
  <p style="font-size:12px;color:#666;">${link}</p>
  <p style="color:#666;font-size:12px;">Orquesta Filarmónica de Río Negro – Sistema de Gestión</p>
</body>
</html>`;

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: GMAIL_USER, pass: GMAIL_PASS },
    });
    const info = await transporter.sendMail({
      from: `"Filarmónica SCRN" <${GMAIL_USER}>`,
      replyTo: TO_EMAIL,
      to,
      subject,
      html,
    });
    return json({ ok: true, to, mes, year, id: info.messageId });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[horas-recordatorio-mensual]", message);
    return json({ ok: false, error: message }, 500);
  }
});
