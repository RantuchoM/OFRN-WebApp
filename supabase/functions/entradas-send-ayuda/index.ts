/**
 * Formulario público de ayuda en /entradas.
 * - send: persiste consulta + mail staff + acuse
 * - check_reservas: avisa si el mail ya tiene reservas activas
 * - reenviar_entradas: reenvía confirmación con QR a ese mail
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
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
const RESEND_COOLDOWN_MS = 90_000;
const recentByKey = new Map<string, number>();
const resendByKey = new Map<string, number>();

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
  for (const [key, at] of resendByKey) {
    if (now - at > RESEND_COOLDOWN_MS * 2) resendByKey.delete(key);
  }
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function clientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || req.headers.get("x-real-ip")
    || "unknown"
  );
}

function qrImageUrl(token: string, size = 180): string {
  const q = encodeURIComponent(String(token || "").trim());
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${q}`;
}

function formatFechaAr(fecha: string | null | undefined, hora: string | null | undefined): string {
  if (!fecha) return "";
  try {
    const time = String(hora || "00:00:00").slice(0, 5);
    const d = new Date(`${String(fecha).slice(0, 10)}T${time}:00-03:00`);
    if (Number.isNaN(d.getTime())) return String(fecha);
    return new Intl.DateTimeFormat("es-AR", {
      dateStyle: "full",
      timeStyle: "short",
      timeZone: "America/Argentina/Buenos_Aires",
    }).format(d);
  } catch {
    return String(fecha);
  }
}

type ReservaRow = {
  id: number;
  codigo_reserva: string;
  cantidad_solicitada: number;
  concierto_id: number;
  qr_reserva_token: string | null;
  email_beneficiario: string | null;
  usuario_id: string | null;
  estado: string;
  concierto?: {
    id: number;
    nombre: string | null;
    activo: boolean | null;
    ofrn_evento_id: number | null;
    evento?: {
      fecha?: string | null;
      hora_inicio?: string | null;
    } | null;
  } | null;
  usuario?: { email?: string | null } | null;
  entradas?: Array<{ id: number; orden: number; qr_entrada_token: string | null }>;
};

async function fetchReservasActivasPorEmail(
  admin: SupabaseClient,
  email: string,
): Promise<ReservaRow[]> {
  const select = `
    id, codigo_reserva, cantidad_solicitada, concierto_id, qr_reserva_token,
    email_beneficiario, usuario_id, estado,
    concierto:entrada_concierto(
      id, nombre, activo, ofrn_evento_id,
      evento:eventos!entrada_concierto_ofrn_evento_id_fkey(fecha, hora_inicio)
    ),
    entradas:entrada_reserva_entrada(id, orden, qr_entrada_token)
  `;

  const { data: userRow } = await admin
    .from("entrada_usuario")
    .select("id")
    .eq("email", email)
    .maybeSingle();
  const userId = userRow?.id ? String(userRow.id) : null;

  const byId = new Map<number, ReservaRow>();

  if (userId) {
    const { data, error } = await admin
      .from("entrada_reserva")
      .select(select)
      .eq("estado", "activa")
      .eq("usuario_id", userId)
      .order("id", { ascending: false });
    if (error) throw new Error(error.message);
    for (const r of (data || []) as ReservaRow[]) {
      if (r?.id) byId.set(Number(r.id), r);
    }
  }

  const { data: byBene, error: errBene } = await admin
    .from("entrada_reserva")
    .select(select)
    .eq("estado", "activa")
    .ilike("email_beneficiario", email)
    .order("id", { ascending: false });
  if (errBene) throw new Error(errBene.message);
  for (const r of (byBene || []) as ReservaRow[]) {
    if (r?.id) byId.set(Number(r.id), r);
  }

  return [...byId.values()];
}

function reservaAunVigente(row: ReservaRow, inicioDiaMs: number): boolean {
  const fecha = row.concierto?.evento?.fecha;
  if (!fecha) return Boolean(row.concierto?.activo !== false);
  const t = new Date(`${String(fecha).slice(0, 10)}T12:00:00-03:00`).getTime();
  if (Number.isNaN(t)) return true;
  return t >= inicioDiaMs;
}

function mapReservaPublica(row: ReservaRow) {
  const fechaLabel = formatFechaAr(row.concierto?.evento?.fecha, row.concierto?.evento?.hora_inicio);
  const nombre = String(row.concierto?.nombre || "Concierto").trim();
  const cantidad = Number(row.cantidad_solicitada) || 0;
  return {
    id: Number(row.id),
    codigo: String(row.codigo_reserva || ""),
    cantidad,
    conciertoId: Number(row.concierto_id),
    label: fechaLabel ? `${nombre} — ${fechaLabel}` : nombre,
    cantidadLabel: `${cantidad} entrada${cantidad === 1 ? "" : "s"}`,
  };
}

async function handleCheckReservas(admin: SupabaseClient, email: string) {
  if (!isValidEmail(email)) {
    return jsonResponse({ error: "Ingresá un mail válido." }, 400);
  }
  const inicioDia = new Date();
  inicioDia.setHours(0, 0, 0, 0);
  // Argentina-ish: use UTC-3 noon boundary via local day is fine for filtering past shows
  const inicioDiaMs = Date.now() - 12 * 60 * 60 * 1000; // generous: keep today+
  void inicioDia;

  const rows = await fetchReservasActivasPorEmail(admin, email);
  const vigentes = rows.filter((r) => reservaAunVigente(r, inicioDiaMs - 24 * 60 * 60 * 1000));
  return jsonResponse({
    success: true,
    reservas: vigentes.map(mapReservaPublica),
  });
}

async function handleReenviarEntradas(
  admin: SupabaseClient,
  email: string,
  reservaId: number,
  ip: string,
) {
  if (!isValidEmail(email)) {
    return jsonResponse({ error: "Ingresá un mail válido." }, 400);
  }
  if (!Number.isFinite(reservaId) || reservaId <= 0) {
    return jsonResponse({ error: "Reserva inválida." }, 400);
  }
  if (!GMAIL_USER || !GMAIL_PASS) {
    throw new Error("Falta ENTRADAS_GMAIL_USER/ENTRADAS_GMAIL_PASS o GMAIL_USER/GMAIL_PASS.");
  }

  const now = Date.now();
  pruneCooldown(now);
  const rateKey = `resend|${email}|${reservaId}|${ip}`;
  const last = resendByKey.get(rateKey) || 0;
  if (now - last < RESEND_COOLDOWN_MS) {
    return jsonResponse({ error: "Esperá un momento antes de reenviar de nuevo." }, 429);
  }

  const rows = await fetchReservasActivasPorEmail(admin, email);
  const row = rows.find((r) => Number(r.id) === reservaId);
  if (!row) {
    return jsonResponse({ error: "No encontramos una reserva activa con ese mail." }, 404);
  }

  let qrReserva = String(row.qr_reserva_token || row.codigo_reserva || "").trim();
  let entradaTokens = [...(row.entradas || [])]
    .sort((a, b) => (a.orden || 0) - (b.orden || 0))
    .map((e) => String(e.qr_entrada_token || "").trim())
    .filter(Boolean);

  if (!qrReserva || entradaTokens.length !== Number(row.cantidad_solicitada)) {
    const { data: ensured, error: ensErr } = await admin.rpc("entrada_asegurar_qr_tokens", {
      p_reserva_id: reservaId,
    });
    if (ensErr) throw new Error(ensErr.message);
    if (ensured?.ok) {
      qrReserva = String(ensured.qr_reserva_token || qrReserva).trim();
      const byId = new Map(
        (ensured.entradas || []).map((e: { id: number; qr_entrada_token?: string }) => [
          Number(e.id),
          e,
        ]),
      );
      entradaTokens = [...(row.entradas || [])]
        .sort((a, b) => (a.orden || 0) - (b.orden || 0))
        .map((e) => {
          const patch = byId.get(Number(e.id)) as { qr_entrada_token?: string } | undefined;
          return String(patch?.qr_entrada_token || e.qr_entrada_token || "").trim();
        })
        .filter(Boolean);
    }
  }

  const pub = mapReservaPublica(row);
  const linkMis = `${PUBLIC_BASE}/entradas?view=mis-reservas`;
  const qrBlocks = [
    `<p style="font-weight:700;margin:16px 0 8px;">QR de la reserva</p>
     <img src="${escHtml(qrImageUrl(qrReserva, 200))}" width="200" height="200" alt="QR reserva" style="display:block;border:1px solid #e5e7eb;border-radius:8px;" />`,
    ...entradaTokens.map(
      (tok, i) =>
        `<p style="font-weight:700;margin:16px 0 8px;">Entrada ${i + 1}</p>
         <img src="${escHtml(qrImageUrl(tok, 160))}" width="160" height="160" alt="QR entrada ${i + 1}" style="display:block;border:1px solid #e5e7eb;border-radius:8px;" />`,
    ),
  ].join("");

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8" /></head>
<body style="font-family: Helvetica, Arial, sans-serif; color: #334155; line-height: 1.55; font-size: 15px;">
  <p>Hola,</p>
  <p>Pediste reenviar tus entradas desde la ayuda de <strong>Entradas OFRN</strong>.</p>
  <p><strong>${escHtml(pub.label)}</strong><br />
  Código <strong>${escHtml(pub.codigo)}</strong> · ${escHtml(pub.cantidadLabel)}</p>
  ${qrBlocks}
  <p style="margin-top:20px;">
    <a href="${escHtml(linkMis)}" style="display:inline-block;background:#1ebbf0;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:700;">
      Gestionar mis entradas
    </a>
  </p>
  <div style="margin:18px 0;padding:14px 16px;background:#fffbeb;border-left:4px solid #ca8a04;border-radius:8px;color:#422006;">
    <p style="margin:0;font-weight:700;">Revisá Spam / Correo no deseado</p>
    <p style="margin:8px 0 0;">Si este mail llegó ahí, marcalo como «No es spam» para que los próximos te lleguen bien.</p>
  </div>
  <p style="color:#64748b;font-size:13px;">Orquesta Filarmónica de Río Negro — Entradas</p>
</body></html>`;

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: GMAIL_USER, pass: GMAIL_PASS },
  });
  await transporter.sendMail({
    from: `"Entradas OFRN" <${GMAIL_USER}>`,
    to: email,
    subject: `Tus entradas OFRN — ${pub.codigo || "reserva"}`,
    text: [
      "Reenvío de tus entradas OFRN.",
      pub.label,
      `Código: ${pub.codigo}`,
      pub.cantidadLabel,
      `Gestionar: ${linkMis}`,
      "",
      "Revisá también Spam / Correo no deseado.",
    ].join("\n"),
    html,
  });

  resendByKey.set(rateKey, now);
  return jsonResponse({ success: true });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Método no permitido" }, 405);
  }

  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Falta SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.");
    }

    const body = await req.json();
    if (String(body?.website || "").trim()) {
      return jsonResponse({ success: true });
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const action = String(body?.action || "send").trim();
    const email = normalizeEmail(body?.email);
    const ip = clientIp(req);

    if (action === "check_reservas") {
      return await handleCheckReservas(admin, email);
    }
    if (action === "reenviar_entradas") {
      const reservaId = Number(body?.reservaId ?? body?.reserva_id);
      return await handleReenviarEntradas(admin, email, reservaId, ip);
    }

    if (!GMAIL_USER || !GMAIL_PASS) {
      throw new Error("Falta ENTRADAS_GMAIL_USER/ENTRADAS_GMAIL_PASS o GMAIL_USER/GMAIL_PASS.");
    }

    const nombre = String(body?.nombre || "").trim();
    const telefono = String(body?.telefono || "").trim();
    const cantidadRaw = String(body?.cantidad || "").trim();
    const funcion = String(body?.funcion || "").trim();
    const comentarios = String(body?.comentarios || "").trim();
    const conciertoIdRaw = body?.concierto_id ?? body?.conciertoId;
    const conciertoIdNum = Number(conciertoIdRaw);
    const conciertoId =
      Number.isFinite(conciertoIdNum) && conciertoIdNum > 0 ? conciertoIdNum : null;

    if (!nombre || nombre.length < 2) {
      return jsonResponse({ error: "Completá tu nombre completo." }, 400);
    }
    if (!isValidEmail(email)) {
      return jsonResponse({ error: "Ingresá un mail válido." }, 400);
    }

    let cantidad: number | null = null;
    if (cantidadRaw) {
      const n = Number(cantidadRaw);
      if (!Number.isFinite(n) || n < 1 || n > 4 || Math.round(n) !== n) {
        return jsonResponse({ error: "La cantidad de entradas debe ser entre 1 y 4." }, 400);
      }
      cantidad = n;
    }

    const now = Date.now();
    pruneCooldown(now);
    const rateKey = `${email}|${ip}`;
    const last = recentByKey.get(rateKey) || 0;
    if (now - last < COOLDOWN_MS) {
      return jsonResponse({ error: "Esperá un minuto antes de enviar otra consulta." }, 429);
    }

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

    const ackSubject = "Recibimos tu consulta de Entradas OFRN";
    const ackText = [
      `Hola ${nombre},`,
      "",
      "Recibimos tu consulta sobre entradas. El equipo te va a responder a este mismo correo.",
      "",
      "Importante: revisá también las carpetas Spam o Correo no deseado. A veces nuestros mails (códigos, confirmaciones o las entradas en PDF) llegan ahí.",
      "",
      "Si encontrás un mensaje nuestro en Spam, marcalo como «No es spam» / «Confiar» para que los siguientes te lleguen a la bandeja de entrada.",
      "",
      cantidad != null || funcion
        ? [
          "Resumen de lo que nos enviaste:",
          cantidad != null ? `- Cantidad: ${cantidad}` : null,
          funcion ? `- Función: ${funcion}` : null,
        ].filter(Boolean).join("\n")
        : "",
      "",
      "Orquesta Filarmónica de Río Negro — Entradas",
    ].filter((line, i, arr) => !(line === "" && arr[i - 1] === "")).join("\n");

    const ackHtml = `<!DOCTYPE html>
<html><head><meta charset="utf-8" /></head>
<body style="font-family: Helvetica, Arial, sans-serif; color: #334155; line-height: 1.55; font-size: 15px;">
  <p>Hola <strong>${escHtml(nombre)}</strong>,</p>
  <p>Recibimos tu consulta sobre entradas. El equipo te va a responder a <strong>este mismo correo</strong>.</p>
  <div style="margin:18px 0;padding:14px 16px;background:#fffbeb;border-left:4px solid #ca8a04;border-radius:8px;color:#422006;">
    <p style="margin:0 0 8px 0;font-weight:700;">Revisá Spam / Correo no deseado</p>
    <p style="margin:0;">A veces nuestros mails (códigos de acceso, confirmaciones o las entradas en PDF) llegan a <strong>Spam</strong> o <strong>Correo no deseado</strong>. Si ves uno nuestro ahí, marcalo como «No es spam» / «Confiar» para que los próximos te lleguen bien.</p>
  </div>
  ${
    cantidad != null || funcion
      ? `<p style="font-size:13px;color:#64748b;"><strong>Resumen:</strong>${
        cantidad != null ? ` ${escHtml(String(cantidad))} entrada${cantidad === 1 ? "" : "s"}` : ""
      }${funcion ? ` · ${escHtml(funcion)}` : ""}</p>`
      : ""
  }
  <p style="color:#64748b;font-size:13px;border-top:1px solid #e2e8f0;padding-top:14px;margin-top:24px;">
    <strong>Orquesta Filarmónica de Río Negro</strong><br />Sistema de Entradas
  </p>
</body></html>`;

    try {
      await transporter.sendMail({
        from: `"Entradas OFRN" <${GMAIL_USER}>`,
        to: email,
        replyTo: AYUDA_TO,
        subject: ackSubject,
        text: ackText,
        html: ackHtml,
      });
    } catch (ackErr) {
      console.error(
        "[entradas-send-ayuda] acuse al consultante falló:",
        ackErr instanceof Error ? ackErr.message : String(ackErr),
      );
    }

    recentByKey.set(rateKey, now);

    return jsonResponse({ success: true, id: consultaId });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[entradas-send-ayuda] ERROR:", message);
    return jsonResponse({ error: message }, 500);
  }
});
