export const ENTRADAS_MAIL_TZ = "America/Argentina/Buenos_Aires";

export function esc(s: string | null | undefined) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function normalizeEntradasAppUrl(baseUrl: string): string {
  return String(baseUrl || "").replace(/\/$/, "");
}

export function linkEntradasCatalogoConcierto(appUrl: string, slugPublico: string): string {
  const base = normalizeEntradasAppUrl(appUrl);
  const slug = String(slugPublico || "").trim();
  if (!slug) return `${base}/entradas?view=catalogo`;
  return `${base}/entradas?view=catalogo&concierto=${encodeURIComponent(slug)}`;
}

export function linkEntradasMisReservas(appUrl: string): string {
  return `${normalizeEntradasAppUrl(appUrl)}/entradas?view=mis-reservas`;
}

export function subjectRecordatorio(conciertoNombre: string): string {
  const nombre = String(conciertoNombre || "Concierto").trim() || "Concierto";
  return `¡Te esperamos! Filarmónica de Río Negro - ${nombre}`;
}

export function formatFechaHoraEntradasMail(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: ENTRADAS_MAIL_TZ,
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

/** Cuerpo genérico para envío masivo por BCC (sin nombre ni código por persona). */
export function templateRecordatorio(d: {
  conciertoNombre: string;
  fechaTexto: string;
  lugar: string;
  linkConcierto: string;
  linkMisEntradas: string;
  esPrueba?: boolean;
}): string {
  const avisoPrueba = d.esPrueba
    ? `<p style="margin:0 0 12px;padding:8px 12px;background:#fef3c7;border-radius:6px;font-size:12px;color:#92400e;"><strong>Mail de prueba (admin).</strong></p>`
    : "";
  const titulo = subjectRecordatorio(d.conciertoNombre);
  return `<!DOCTYPE html><html><body style="font-family:Helvetica,Arial,sans-serif;color:#0f172a;line-height:1.5;">
  <div style="max-width:560px;margin:0 auto;border:2px solid #4f46e5;border-radius:12px;padding:24px;">
    <p style="margin:0 0 12px;font-size:18px;font-weight:700;color:#4f46e5;line-height:1.35;">${esc(titulo)}</p>
    ${avisoPrueba}
    <p>¡Hola!</p>
    <p>Te recordamos que tenés reserva para:</p>
    <p style="margin:16px 0;padding:12px;background:#f8fafc;border-radius:8px;">
      <strong>${esc(d.conciertoNombre)}</strong><br/>
      ${esc(d.fechaTexto)}<br/>
      ${d.lugar ? esc(d.lugar) : ""}
    </p>
    <p>Tu código de reserva y los QR están en <a href="${esc(d.linkMisEntradas)}" style="color:#4f46e5;font-weight:700;">Mis entradas</a> (iniciá sesión con el mismo mail con el que reservaste).</p>
    <p>Si sabés que no vas a poder asistir, cancelá tu reserva desde <a href="${esc(d.linkMisEntradas)}" style="color:#4f46e5;font-weight:700;">Mis entradas</a> para liberar el cupo y que otra persona pueda reservar.</p>
    <p>Presentate con tu QR o código al menos <strong>10 minutos antes</strong> del inicio.</p>
    <p style="margin-top:20px;"><a href="${esc(d.linkConcierto)}" style="color:#4f46e5;font-weight:700;">Ver detalle del concierto en la web</a></p>
    <p style="margin-top:8px;font-size:12px;word-break:break-all;"><a href="${esc(d.linkConcierto)}" style="color:#64748b;">${esc(d.linkConcierto)}</a></p>
    <p style="margin-top:24px;font-size:12px;color:#64748b;">Orquesta Filarmónica de Río Negro</p>
  </div></body></html>`;
}

export function templateEncuesta(d: {
  conciertoNombre: string;
  encuestaUrl: string;
  esPrueba?: boolean;
}): string {
  const avisoPrueba = d.esPrueba
    ? `<p style="margin:0 0 12px;padding:8px 12px;background:#fef3c7;border-radius:6px;font-size:12px;color:#92400e;"><strong>Mail de prueba (admin).</strong></p>`
    : "";
  return `<!DOCTYPE html><html><body style="font-family:Helvetica,Arial,sans-serif;color:#0f172a;line-height:1.5;">
  <div style="max-width:560px;margin:0 auto;border:2px solid #059669;border-radius:12px;padding:24px;">
    <p style="margin:0 0 8px;font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:#059669;font-weight:700;">Tu opinión · Encuesta anónima</p>
    ${avisoPrueba}
    <p>¡Hola!</p>
    <p>Gracias por asistir a <strong>${esc(d.conciertoNombre)}</strong>.</p>
    <p>Nos ayudaría mucho si completás esta encuesta breve y anónima sobre tu experiencia en la sala:</p>
    <p style="margin:20px 0;"><a href="${esc(d.encuestaUrl)}" style="display:inline-block;background:#059669;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:700;">Responder encuesta</a></p>
    <p style="font-size:12px;color:#64748b;">El enlace no identifica tu reserva; las respuestas son anónimas.</p>
    <p style="margin-top:24px;font-size:12px;color:#64748b;">Orquesta Filarmónica de Río Negro</p>
  </div></body></html>`;
}
