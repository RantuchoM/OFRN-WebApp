/**
 * Envío de mail: mismas credenciales y patrón que `mails_produccion`
 * (GMAIL_USER, GMAIL_PASS, transporter Gmail, from/replyTo).
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Buffer } from "node:buffer";
import nodemailer from "npm:nodemailer@6.9.7";

const GMAIL_USER = Deno.env.get("GMAIL_USER");
const GMAIL_PASS = Deno.env.get("GMAIL_PASS");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function esc(s: string | null | undefined) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** URL de imagen QR legible en la mayoría de clientes de correo (mismo criterio que integraciones comunes). */
function qrImageUrl(data: string, size = 180) {
  const q = encodeURIComponent(data);
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${q}`;
}

/**
 * Misma línea estética que `mails_produccion` (OFRN / Filarmónica SCRN):
 * - Helvetica, caja con borde #4f46e5
 * - firma administración
 */
function templateEntradasReservaConfirmada(d: {
  nombre: string;
  codigo: string;
  conciertoNombre: string;
  fechaTexto: string;
  cantidad: number;
  linkConcierto: string;
  qrReservaToken: string;
  qrEntradaTokens: string[];
}): string {
  const entradasList = d.qrEntradaTokens
    .map(
      (t, i) => `
        <tr>
          <td style="padding:12px 8px;vertical-align:top;border-bottom:1px solid #e5e7eb;">
            <div style="font-size:12px;font-weight:700;color:#4b5563;margin-bottom:6px;">Entrada ${i + 1} de ${d.qrEntradaTokens.length}</div>
            <img src="${esc(qrImageUrl(t, 160))}" width="160" height="160" alt="QR entrada ${i + 1}" style="display:block;border:1px solid #e5e7eb;border-radius:8px;" />
            <p style="font-size:10px;word-break:break-all;color:#64748b;margin:8px 0 0 0;font-family:monospace;">${esc(t)}</p>
          </td>
        </tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; line-height: 1.6; font-size: 14px; }
    .box { border-left: 4px solid #4f46e5; background-color: #f9fafb; padding: 18px 20px; margin: 20px 0; border-radius: 6px; }
    .muted { color: #64748b; font-size: 12px; }
    a { color: #4f46e5; font-weight: 600; }
  </style>
</head>
<body>
  <p>Hola <strong>${esc(d.nombre)}</strong>,</p>
  <p>Tu reserva de entradas gratuitas quedó <strong>confirmada</strong>.</p>

  <div class="box">
    <h2 style="margin:0 0 12px 0;color:#111;font-size:18px;">${esc(d.conciertoNombre)}</h2>
    <p style="margin:0 0 6px 0;"><strong>Código de reserva:</strong> <span style="font-family:monospace;font-size:15px;">${esc(d.codigo)}</span></p>
    <p style="margin:0 0 6px 0;"><strong>Fecha y hora:</strong> ${esc(d.fechaTexto)}</p>
    <p style="margin:0;"><strong>Cantidad de entradas:</strong> ${d.cantidad}</p>
  </div>

  <p>Adjuntamos un <strong>PDF</strong> con el mismo resumen, el detalle del concierto y los códigos QR para descargar o imprimir. Podés mostrar en puerta <strong>este correo</strong>, el PDF o los códigos QR de abajo. Cada QR individual sirve para un ingreso; el QR de reserva completa agrupa a todas las entradas pendientes.</p>

  <div class="box" style="background:#f5f3ff;border-left-color:#6366f1;">
    <p style="margin:0 0 10px 0;font-weight:700;color:#1e1b4b;">QR de reserva (toda la fila / grupo)</p>
    <img src="${esc(qrImageUrl(d.qrReservaToken, 200))}" width="200" height="200" alt="QR reserva" style="display:block;border:1px solid #e5e7eb;border-radius:8px;" />
    <p class="muted" style="word-break:break-all;font-family:monospace;">${esc(d.qrReservaToken)}</p>
  </div>

  <p><strong>Entradas individuales (ingreso separado):</strong></p>
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">${entradasList}</table>

  <p>Link al concierto en la web: <a href="${esc(d.linkConcierto)}">${esc(d.linkConcierto)}</a></p>

  <p class="muted" style="margin-top:24px;">Si no solicitaste esta reserva, podés ignorar este mensaje o contactar a la administración de la orquesta.</p>

  <p style="color: #555; font-size: 13px; border-top: 1px solid #eee; padding-top: 15px; margin-top: 28px;">
    <strong>Orquesta Filarmónica de Río Negro</strong><br />
    Sistema de Entradas
  </p>
</body>
</html>`;
}

function templateEntradasReservaCancelada(d: {
  nombre: string;
  codigo: string;
  conciertoNombre: string;
  fechaTexto: string;
  cantidad: number;
  linkConcierto: string;
}): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; line-height: 1.6; font-size: 14px; }
    .box { border-left: 4px solid #b91c1c; background-color: #fef2f2; padding: 18px 20px; margin: 20px 0; border-radius: 6px; }
    .muted { color: #64748b; font-size: 12px; }
    a { color: #4f46e5; font-weight: 600; }
  </style>
</head>
<body>
  <p>Hola <strong>${esc(d.nombre)}</strong>,</p>
  <p>Tu reserva de entradas fue <strong>cancelada</strong> correctamente.</p>

  <div class="box">
    <h2 style="margin:0 0 12px 0;color:#7f1d1d;font-size:18px;">${esc(d.conciertoNombre)}</h2>
    <p style="margin:0 0 6px 0;"><strong>Código de reserva anulado:</strong> <span style="font-family:monospace;font-size:15px;">${esc(d.codigo)}</span></p>
    <p style="margin:0 0 6px 0;"><strong>Fecha y hora del evento:</strong> ${esc(d.fechaTexto)}</p>
    <p style="margin:0;"><strong>Entradas liberadas:</strong> ${d.cantidad}</p>
  </div>

  <p class="muted">Los códigos QR de esta reserva <strong>ya no son válidos</strong> para ingresar.</p>
  <p>Podés volver a reservar en la web si aún hay cupo: <a href="${esc(d.linkConcierto)}">${esc(d.linkConcierto)}</a></p>

  <p style="color: #555; font-size: 13px; border-top: 1px solid #eee; padding-top: 15px; margin-top: 28px;">
    <strong>Orquesta Filarmónica de Río Negro</strong><br />
    Sistema de Entradas
  </p>
</body>
</html>`;
}

async function loadReservaForUser(
  supabaseUser: ReturnType<typeof createClient>,
  reservaId: number,
  userId: string,
) {
  const { data: reserva, error: reservaError } = await supabaseUser
    .from("entrada_reserva")
    .select(
      "id, usuario_id, estado, codigo_reserva, cantidad_solicitada, concierto:entrada_concierto(nombre, fecha_hora, slug_publico)",
    )
    .eq("id", reservaId)
    .maybeSingle();
  if (reservaError) throw new Error(reservaError.message);
  if (!reserva) throw new Error("Reserva no encontrada.");
  if (reserva.usuario_id !== userId) {
    return { error: 403 as const, message: "No autorizado." };
  }
  return { reserva: reserva as {
    id: number;
    usuario_id: string;
    estado: string;
    codigo_reserva: string;
    cantidad_solicitada: number;
    concierto: { nombre?: string; fecha_hora?: string; slug_publico?: string } | null;
  } };
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
      throw new Error("Falta configurar credenciales de Gmail en Secrets.");
    }
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error("Falta SUPABASE_URL o SUPABASE_ANON_KEY en el entorno de la función.");
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as {
      action?: "confirmacion" | "cancelacion";
      reservaId?: number;
      qrReservaToken?: string;
      qrEntradaTokens?: string[];
      pdfBase64?: string;
      appUrl?: string;
    };

    const action = body?.action ?? "confirmacion";
    const reservaId = Number(body?.reservaId || 0);
    const qrReservaToken = String(body?.qrReservaToken || "").trim();
    const qrEntradaTokens = Array.isArray(body?.qrEntradaTokens) ? body.qrEntradaTokens : [];
    const pdfBase64 = String(body?.pdfBase64 || "").replace(/\s/g, "");
    const appUrl = String(body?.appUrl || "").replace(/\/$/, "");

    if (!reservaId) {
      throw new Error("Payload inválido: falta reservaId.");
    }
    if (action === "confirmacion" && !qrReservaToken) {
      throw new Error("Payload inválido: para confirmación se requiere qrReservaToken.");
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

    const loaded = await loadReservaForUser(supabaseUser, reservaId, user.id);
    if ("error" in loaded) {
      return new Response(JSON.stringify({ error: loaded.message }), {
        status: loaded.error,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { reserva } = loaded;

    if (action === "cancelacion" && reserva.estado !== "cancelada") {
      throw new Error("La reserva no está cancelada; cancelá primero en la app para recibir el mail de confirmación.");
    }
    if (action === "confirmacion" && reserva.estado !== "activa") {
      throw new Error("Solo se puede reenviar confirmación de reservas activas.");
    }

    // Cargar email del perfil entradas (mismo criterio que el resto del módulo)
    const { data: perfil } = await supabaseUser.from("entrada_usuario").select("nombre, apellido, email").eq("id", user.id).maybeSingle();
    const emailTo = (perfil?.email || user.email || "").trim();
    if (!emailTo) {
      throw new Error("No hay email de destino para el usuario.");
    }

    const concierto = reserva.concierto;
    const conciertoNombre = concierto?.nombre || "Concierto";
    const slug = concierto?.slug_publico || "";
    const fechaHora = concierto?.fecha_hora;
    const fechaTexto = fechaHora
      ? new Date(fechaHora).toLocaleString("es-AR", { dateStyle: "long", timeStyle: "short" })
      : "—";
    const linkConcierto = `${appUrl}/entradas?view=catalogo&concierto=${encodeURIComponent(slug)}`;

    const nombreSaludo = [perfil?.nombre, perfil?.apellido].filter(Boolean).join(" ").trim() || "Usuario";
    const html = action === "cancelacion"
      ? templateEntradasReservaCancelada({
        nombre: nombreSaludo,
        codigo: reserva.codigo_reserva,
        conciertoNombre,
        fechaTexto,
        cantidad: Number(reserva.cantidad_solicitada) || 0,
        linkConcierto,
      })
      : templateEntradasReservaConfirmada({
        nombre: nombreSaludo,
        codigo: reserva.codigo_reserva,
        conciertoNombre,
        fechaTexto,
        cantidad: Number(reserva.cantidad_solicitada) || 0,
        linkConcierto,
        qrReservaToken,
        qrEntradaTokens,
      });

    const subject = action === "cancelacion"
      ? `Entradas OFRN | Reserva cancelada ${reserva.codigo_reserva}`
      : `Entradas OFRN | Reserva ${reserva.codigo_reserva}`;

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: GMAIL_USER, pass: GMAIL_PASS },
    });

    const pdfAttachment =
      action === "confirmacion" && pdfBase64.length > 0
        ? (() => {
            try {
              const raw = atob(pdfBase64);
              const buf = new Uint8Array(raw.length);
              for (let i = 0; i < raw.length; i++) buf[i] = raw.charCodeAt(i);
              return [
                {
                  filename: `entradas-OFRN-${(reserva.codigo_reserva || "reserva").replace(/[^a-zA-Z0-9-]+/g, "_")}.pdf`,
                  content: Buffer.from(buf),
                  contentType: "application/pdf",
                },
              ];
            } catch (e) {
              console.warn("[entradas-send-reserva-email] adjunto PDF omitido:", e);
              return [] as { filename: string; content: Buffer; contentType: string }[];
            }
          })()
        : undefined;

    const info = await transporter.sendMail({
      from: `"Filarmónica SCRN" <${GMAIL_USER}>`,
      replyTo: "filarmonica.scrn@gmail.com",
      to: emailTo,
      subject,
      html,
      ...(pdfAttachment && pdfAttachment.length > 0 ? { attachments: pdfAttachment } : {}),
    });

    console.log(
      `[entradas-send-reserva-email] OK action=${action} messageId=${info.messageId} to=${emailTo} reservaId=${reservaId}`,
    );

    return new Response(JSON.stringify({ success: true, id: info.messageId }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[entradas-send-reserva-email] ERROR:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
