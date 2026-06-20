/**
 * Envío de mail: mismas credenciales y patrón que `mails_produccion`
 * (GMAIL_USER, GMAIL_PASS, transporter Gmail, from/replyTo).
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Buffer } from "node:buffer";
import nodemailer from "npm:nodemailer@6.9.7";
import {
  ENTRADA_CONCIERTO_EVENTO_SELECT,
  fechaHoraDesdeEventoOfrn,
} from "./entradasConciertoEvento.ts";

const GMAIL_USER = Deno.env.get("GMAIL_USER");
const GMAIL_PASS = Deno.env.get("GMAIL_PASS");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/** Misma redacción que `src/utils/entradasReservaCopy.js` (HTML con <strong>). */
const NOTA_ASISTENCIA_HTML =
  "Les solicitamos presentarse con la entrada <strong>10 minutos antes del inicio del concierto</strong>. Luego de ese horario, los lugares no ocupados podrán ser cedidos a asistentes que no cuenten con entrada previa.";

/** Zona horaria de cartel de conciertos (Edge corre en UTC; sin esto el mail muestra UTC). */
const OFRN_CONCIERTO_TZ = "America/Argentina/Buenos_Aires";

function formatConciertoFechaHoraMail(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  const tz = OFRN_CONCIERTO_TZ;
  const weekday = (
    new Intl.DateTimeFormat("es-AR", { timeZone: tz, weekday: "long" }).formatToParts(date).find((p) => p.type === "weekday")?.value || ""
  ).toUpperCase();
  const datePart = new Intl.DateTimeFormat("es-AR", {
    timeZone: tz,
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
  const timePart = new Intl.DateTimeFormat("es-AR", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
  return `${weekday}, ${datePart} · ${timePart}`;
}

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
  programaNombre?: string;
  /** HTML de confianza (contenido Quill desde BD). */
  programaDetalleHtml?: string;
}): string {
  const programaDetalle = String(d.programaDetalleHtml || "").trim();
  const programaNombre = String(d.programaNombre || "").trim();
  const programaBlock = programaDetalle
    ? `<div style="margin:18px 0;padding:16px 18px;background:#ffffff;border:1px solid #e2e8f0;border-radius:10px;">
    <p style="margin:0 0 8px;font-size:11px;font-weight:800;letter-spacing:0.07em;color:#64748b;text-transform:uppercase;">Programa</p>
    <h3 style="margin:0 0 12px;font-size:17px;color:#0f172a;">${esc(programaNombre || "Programa")}</h3>
    <div class="entradas-mail-rich" style="font-size:14px;line-height:1.55;color:#334155;">${programaDetalle}</div>
  </div>`
    : "";

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
    .entradas-mail-rich p { margin: 0.45em 0; }
    .entradas-mail-rich ul, .entradas-mail-rich ol { margin: 0.35em 0; padding-left: 1.25em; }
    .entradas-mail-rich ul { list-style: disc; }
    .entradas-mail-rich ol { list-style: decimal; }
    .entradas-mail-rich li { margin: 0.2em 0; }
    .entradas-mail-rich strong, .entradas-mail-rich b { font-weight: 700; color: #0f172a; }
    .entradas-mail-rich em { font-style: italic; }
    .entradas-mail-rich h1 { font-size: 1.25em; margin: 0.5em 0 0.35em; font-weight: 700; }
    .entradas-mail-rich h2 { font-size: 1.12em; margin: 0.45em 0 0.3em; font-weight: 700; }
    .entradas-mail-rich h3 { font-size: 1.05em; margin: 0.4em 0 0.25em; font-weight: 700; }
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

  ${programaBlock}

  <div style="margin:16px 0;padding:14px 16px;background:#fffbeb;border-left:4px solid #ca8a04;border-radius:8px;font-size:14px;line-height:1.55;color:#422006;">
    ${NOTA_ASISTENCIA_HTML}
  </div>

  <p>Adjuntamos un <strong>PDF</strong> con el mismo resumen, el detalle del programa (si aplica), los códigos QR y la misma nota sobre la puntualidad. Podés mostrar en puerta <strong>este correo</strong>, el PDF o los códigos QR de abajo. Cada QR individual sirve para un ingreso; el QR de reserva completa agrupa a todas las entradas pendientes.</p>

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

function templateEntradasReservaConfirmadaAdminTercero(d: {
  nombreAdmin: string;
  beneficiarioLabel: string;
  codigo: string;
  conciertoNombre: string;
  fechaTexto: string;
  cantidad: number;
  linkConcierto: string;
  qrReservaToken: string;
  qrEntradaTokens: string[];
  programaNombre?: string;
  programaDetalleHtml?: string;
}): string {
  const inner = templateEntradasReservaConfirmada({
    nombre: d.nombreAdmin,
    codigo: d.codigo,
    conciertoNombre: d.conciertoNombre,
    fechaTexto: d.fechaTexto,
    cantidad: d.cantidad,
    linkConcierto: d.linkConcierto,
    qrReservaToken: d.qrReservaToken,
    qrEntradaTokens: d.qrEntradaTokens,
    programaNombre: d.programaNombre,
    programaDetalleHtml: d.programaDetalleHtml,
  });
  return inner.replace(
    "<p>Tu reserva de entradas gratuitas quedó <strong>confirmada</strong>.</p>",
    `<p>Registraste una reserva de entradas para <strong>${esc(d.beneficiarioLabel)}</strong>. Quedó <strong>confirmada</strong>.</p>`,
  );
}

async function loadReservaForAuthorizedUser(
  supabaseUser: ReturnType<typeof createClient>,
  reservaId: number,
  userId: string,
) {
  const { data: reserva, error: reservaError } = await supabaseUser
    .from("entrada_reserva")
    .select(
      `id, usuario_id, reservada_por, email_beneficiario, beneficiario_referencia, estado, codigo_reserva, cantidad_solicitada,
      concierto:entrada_concierto(nombre, slug_publico, detalle_richtext, ofrn_evento_id, entrada_programa(nombre, detalle_richtext), ${ENTRADA_CONCIERTO_EVENTO_SELECT})`,
    )
    .eq("id", reservaId)
    .maybeSingle();
  if (reservaError) throw new Error(reservaError.message);
  if (!reserva) throw new Error("Reserva no encontrada.");

  const isOwner = reserva.usuario_id === userId;
  const isCreator = reserva.reservada_por === userId;
  if (!isOwner && !isCreator) {
    const { data: perfilCaller } = await supabaseUser
      .from("entrada_usuario")
      .select("rol")
      .eq("id", userId)
      .maybeSingle();
    if (perfilCaller?.rol !== "admin") {
      return { error: 403 as const, message: "No autorizado." };
    }
  }

  return { reserva: reserva as {
    id: number;
    usuario_id: string;
    reservada_por: string | null;
    email_beneficiario: string | null;
    beneficiario_referencia: string | null;
    estado: string;
    codigo_reserva: string;
    cantidad_solicitada: number;
    concierto: {
      nombre?: string;
      slug_publico?: string;
      detalle_richtext?: string;
      ofrn_evento_id?: number;
      evento?: { fecha?: string; hora_inicio?: string; locaciones?: { nombre?: string } };
      entrada_programa?: { nombre?: string; detalle_richtext?: string } | null;
    } | null;
  } };
}

async function perfilEntradasPorId(
  supabaseUser: ReturnType<typeof createClient>,
  id: string | null | undefined,
) {
  if (!id) return null;
  const { data } = await supabaseUser
    .from("entrada_usuario")
    .select("nombre, apellido, email")
    .eq("id", id)
    .maybeSingle();
  return data;
}

function nombreCompleto(perfil: { nombre?: string; apellido?: string } | null | undefined, fallback = "Usuario") {
  const n = [perfil?.nombre, perfil?.apellido].filter(Boolean).join(" ").trim();
  return n || fallback;
}

function beneficiarioLabelFromReserva(
  reserva: {
    email_beneficiario?: string | null;
    beneficiario_referencia?: string | null;
  },
  titularPerfil: { nombre?: string; apellido?: string; email?: string } | null,
) {
  if (titularPerfil && reserva.email_beneficiario == null) {
    const n = nombreCompleto(titularPerfil, "");
    if (n) return n;
  }
  if (reserva.beneficiario_referencia) return String(reserva.beneficiario_referencia);
  if (reserva.email_beneficiario) return reserva.email_beneficiario;
  return "beneficiario/a";
}

async function buildMailRecipients(
  supabaseUser: ReturnType<typeof createClient>,
  reserva: {
    usuario_id: string;
    reservada_por: string | null;
    email_beneficiario: string | null;
  },
  callerId: string,
) {
  type Recipient = { email: string; rol: "titular" | "admin_creador" | "beneficiario_pendiente" };
  const out: Recipient[] = [];
  const seen = new Set<string>();

  const push = (email: string | null | undefined, rol: Recipient["rol"]) => {
    const e = String(email || "").trim().toLowerCase();
    if (!e || seen.has(e)) return;
    seen.add(e);
    out.push({ email: e, rol });
  };

  if (reserva.reservada_por) {
    const adminPerfil = await perfilEntradasPorId(supabaseUser, reserva.reservada_por);
    push(adminPerfil?.email, "admin_creador");

    if (reserva.email_beneficiario) {
      push(reserva.email_beneficiario, "beneficiario_pendiente");
    } else if (reserva.usuario_id !== reserva.reservada_por) {
      const titular = await perfilEntradasPorId(supabaseUser, reserva.usuario_id);
      push(titular?.email, "titular");
    }
  } else {
    const titular = await perfilEntradasPorId(supabaseUser, reserva.usuario_id);
    push(titular?.email, "titular");
  }

  if (!out.length) {
    const caller = await perfilEntradasPorId(supabaseUser, callerId);
    push(caller?.email, "titular");
  }

  return out;
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

    const loaded = await loadReservaForAuthorizedUser(supabaseUser, reservaId, user.id);
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

    const concierto = reserva.concierto;
    const conciertoNombre = concierto?.nombre || "Concierto";
    const slug = concierto?.slug_publico || "";
    const fechaHora = fechaHoraDesdeEventoOfrn(concierto?.evento);
    const fechaTexto = formatConciertoFechaHoraMail(fechaHora);
    const linkConcierto = `${appUrl}/entradas?view=catalogo&concierto=${encodeURIComponent(slug)}`;

    const ep = concierto?.entrada_programa;
    const programaNombre = ep?.nombre ? String(ep.nombre) : "";
    const programaDetalleHtml = ep?.detalle_richtext ? String(ep.detalle_richtext) : "";

    const titularPerfil = await perfilEntradasPorId(supabaseUser, reserva.usuario_id);
    const adminPerfil = reserva.reservada_por
      ? await perfilEntradasPorId(supabaseUser, reserva.reservada_por)
      : null;
    const beneficiarioLabel = beneficiarioLabelFromReserva(reserva, titularPerfil);

    const recipients = await buildMailRecipients(supabaseUser, reserva, user.id);
    if (!recipients.length) {
      throw new Error("No hay email de destino para enviar.");
    }

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

    const messageIds: string[] = [];

    for (const recipient of recipients) {
      let nombreSaludo = "Usuario";
      let html: string;

      if (action === "cancelacion") {
        if (recipient.rol === "admin_creador") {
          nombreSaludo = nombreCompleto(adminPerfil);
          html = templateEntradasReservaCancelada({
            nombre: nombreSaludo,
            codigo: reserva.codigo_reserva,
            conciertoNombre,
            fechaTexto,
            cantidad: Number(reserva.cantidad_solicitada) || 0,
            linkConcierto,
          }).replace(
            "<p>Tu reserva de entradas fue <strong>cancelada</strong> correctamente.</p>",
            `<p>La reserva de entradas que registraste para <strong>${esc(beneficiarioLabel)}</strong> fue <strong>cancelada</strong> correctamente.</p>`,
          );
        } else {
          nombreSaludo = recipient.rol === "beneficiario_pendiente"
            ? beneficiarioLabel
            : nombreCompleto(titularPerfil);
          html = templateEntradasReservaCancelada({
            nombre: nombreSaludo,
            codigo: reserva.codigo_reserva,
            conciertoNombre,
            fechaTexto,
            cantidad: Number(reserva.cantidad_solicitada) || 0,
            linkConcierto,
          });
        }
      } else if (recipient.rol === "admin_creador" && reserva.reservada_por) {
        nombreSaludo = nombreCompleto(adminPerfil);
        html = templateEntradasReservaConfirmadaAdminTercero({
          nombreAdmin: nombreSaludo,
          beneficiarioLabel,
          codigo: reserva.codigo_reserva,
          conciertoNombre,
          fechaTexto,
          cantidad: Number(reserva.cantidad_solicitada) || 0,
          linkConcierto,
          qrReservaToken,
          qrEntradaTokens,
          programaNombre,
          programaDetalleHtml,
        });
      } else {
        nombreSaludo = recipient.rol === "beneficiario_pendiente"
          ? beneficiarioLabel
          : nombreCompleto(titularPerfil);
        html = templateEntradasReservaConfirmada({
          nombre: nombreSaludo,
          codigo: reserva.codigo_reserva,
          conciertoNombre,
          fechaTexto,
          cantidad: Number(reserva.cantidad_solicitada) || 0,
          linkConcierto,
          qrReservaToken,
          qrEntradaTokens,
          programaNombre,
          programaDetalleHtml,
        });
      }

      const attachPdf = recipient.rol !== "admin_creador" || !reserva.reservada_por
        ? pdfAttachment
        : pdfAttachment;

      const info = await transporter.sendMail({
        from: `"Filarmónica SCRN" <${GMAIL_USER}>`,
        replyTo: "filarmonica.scrn@gmail.com",
        to: recipient.email,
        subject,
        html,
        ...(attachPdf && attachPdf.length > 0 ? { attachments: attachPdf } : {}),
      });

      messageIds.push(info.messageId);
      console.log(
        `[entradas-send-reserva-email] OK action=${action} messageId=${info.messageId} to=${recipient.email} rol=${recipient.rol} reservaId=${reservaId}`,
      );
    }

    return new Response(JSON.stringify({ success: true, ids: messageIds }), {
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
