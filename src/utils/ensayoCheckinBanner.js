import { format } from "date-fns";
import { timeStringToMinutes } from "./dates";
import { membershipActiveOnProgramDate } from "./ensembleMembership";

export const ENSAYO_CHECKIN_PRE_MINUTES = 15;
/** Tras registrar salida, el QR de préstamo GPS sigue disponible este margen. */
export const ENSAYO_QR_AFTER_EXIT_GRACE_MINUTES = 10;
/** Recordatorio de cierre: minutos antes de `hora_fin` si aún no hay salida. */
export const ENSAYO_SALIDA_PRE_MINUTES = 10;
/** Aviso de cierre pendiente: minutos después de `hora_fin` (0 = justo a `hora_fin`). */
export const ENSAYO_SALIDA_POST_MINUTES = 0;
const ID_TIPO_ENSAYO_ENSAMBLE = 13;

/**
 * Interpreta `registrado_at` / `salida_at` (cara UTC = hora de pared) como Date local.
 */
export function parseEnsayoParedLocal(iso) {
  if (!iso) return null;
  const s = String(iso);
  const day = s.slice(0, 10);
  const m = s.match(/T(\d{2}):(\d{2})(?::(\d{2}))?/);
  if (day && m) {
    const [y, mo, d] = day.split("-").map(Number);
    return new Date(
      y,
      mo - 1,
      d,
      Number(m[1]),
      Number(m[2]),
      Number(m[3] || 0),
    );
  }
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Ofrecer QR de ubicación: ingreso con GPS, y aún sin salida
 * (o dentro del margen post-salida).
 */
export function puedeOfrecerPaseGps(estado, now = new Date()) {
  if (!estado?.registrado_at || estado.modo !== "gps") return false;
  if (!estado.salida_at) return true;
  const salida = parseEnsayoParedLocal(estado.salida_at);
  if (!salida) return false;
  return (
    now.getTime() <
    salida.getTime() + ENSAYO_QR_AFTER_EXIT_GRACE_MINUTES * 60 * 1000
  );
}

/**
 * ¿El integrante está convocado a este ensayo de ensamble (tipo 13)?
 * Membresía activa en la fecha del evento, o custom adicional/invitado; ausente excluye.
 * Fail-closed: sin ensambles del evento y sin custom de inclusión → false.
 *
 * @param {object} evt
 * @param {{ tipo?: string } | null | undefined} customRow
 * @param {Array<{ id_ensamble: number, fecha_desde?: string, fecha_hasta?: string }>|null|undefined} integrantesEnsambles
 */
export function isIntegranteConvocadoAEnsayo(
  evt,
  customRow,
  integrantesEnsambles,
) {
  if (Number(evt?.id_tipo_evento) !== ID_TIPO_ENSAYO_ENSAMBLE) return false;
  const tipo = customRow?.tipo;
  if (tipo === "ausente") return false;
  if (tipo === "adicional" || tipo === "invitado") return true;
  const eventEnsIds = new Set(
    (evt.eventos_ensambles || [])
      .map((ee) => Number(ee.id_ensamble ?? ee.ensambles?.id))
      .filter((n) => !Number.isNaN(n)),
  );
  if (!eventEnsIds.size) return false;
  const fecha = evt.fecha;
  return (integrantesEnsambles || []).some(
    (ie) =>
      eventEnsIds.has(Number(ie.id_ensamble)) &&
      membershipActiveOnProgramDate(ie, fecha),
  );
}

function todayStr(now = new Date()) {
  return format(now, "yyyy-MM-dd");
}

/**
 * @param {object} evt
 * @returns {number} epoch ms del inicio del ensayo (fecha local + hora_inicio)
 */
export function ensayoStartMs(evt) {
  if (!evt?.fecha || !evt?.hora_inicio) return NaN;
  const [y, m, d] = String(evt.fecha).split("-").map(Number);
  const hi = timeStringToMinutes(evt.hora_inicio);
  return new Date(y, m - 1, d, Math.floor(hi / 60), hi % 60, 0, 0).getTime();
}

export function ensayoEndMs(evt) {
  if (!evt?.fecha) return NaN;
  const [y, m, d] = String(evt.fecha).split("-").map(Number);
  const hf = timeStringToMinutes(evt.hora_fin || evt.hora_inicio);
  return new Date(y, m - 1, d, Math.floor(hf / 60), hf % 60, 0, 0).getTime();
}

/**
 * Urgencia de marcación de salida mientras fase = activo (llegada sí, salida no).
 * @returns {'none'|'activo'|'pre_cierre'|'post_hora'|'post_aviso'}
 * - pre_cierre: desde T−10 hasta `hora_fin` (no incluido)
 * - post_hora: entre `hora_fin` y hora_fin+POST (si POST>0)
 * - post_aviso: desde hora_fin+POST (con POST=0 = justo a `hora_fin`)
 */
export function resolveSalidaUrgency(evt, estado, now = new Date()) {
  if (!estado?.registrado_at || estado?.salida_at || estado?.justificado) {
    return "none";
  }
  const end = ensayoEndMs(evt);
  if (!Number.isFinite(end)) return "activo";
  const t = now.getTime();
  const preFrom = end - ENSAYO_SALIDA_PRE_MINUTES * 60 * 1000;
  const postFrom = end + ENSAYO_SALIDA_POST_MINUTES * 60 * 1000;
  if (t >= postFrom) return "post_aviso";
  if (t >= end) return "post_hora";
  if (t >= preFrom) return "pre_cierre";
  return "activo";
}

/**
 * @returns {'idle'|'ingreso'|'activo'|'done'}
 */
export function resolveEnsayoBannerPhase(evt, estado, now = new Date()) {
  if (!evt || evt.fecha !== todayStr(now)) return "idle";
  const start = ensayoStartMs(evt);
  if (!Number.isFinite(start)) return "idle";
  const windowOpen = start - ENSAYO_CHECKIN_PRE_MINUTES * 60 * 1000;
  const t = now.getTime();
  const yaIngreso = !!estado?.registrado_at;
  const yaSalida = !!estado?.salida_at;

  if (yaIngreso && yaSalida) return "done";
  if (yaIngreso && !yaSalida) return "activo";
  // Ingreso disponible desde T-15 hasta el fin del día del ensayo
  // (permite marcar tarde / reintentar tras borrar un registro).
  if (!yaIngreso && t >= windowOpen) return "ingreso";
  return "idle";
}

/**
 * Prioridad: activo (llegada sin salida) > ingreso en ventana > ninguno.
 */
export function pickEnsayoBannerTarget(events, getEstado, now = new Date()) {
  const today = todayStr(now);
  const ensayos = (events || []).filter(
    (e) =>
      Number(e.id_tipo_evento) === ID_TIPO_ENSAYO_ENSAMBLE &&
      e.fecha === today &&
      e.id &&
      !e.is_deleted,
  );
  if (!ensayos.length) return null;

  const scored = ensayos.map((evt) => {
    const estado = getEstado?.(evt.id) || null;
    const phase = resolveEnsayoBannerPhase(evt, estado, now);
    const start = ensayoStartMs(evt);
    return { evt, estado, phase, start };
  });

  const activos = scored.filter((s) => s.phase === "activo");
  if (activos.length) {
    activos.sort((a, b) => a.start - b.start);
    return activos[0];
  }

  const ingresos = scored.filter((s) => s.phase === "ingreso");
  if (ingresos.length) {
    ingresos.sort((a, b) => a.start - b.start);
    return ingresos[0];
  }

  return null;
}

export function formatElapsedHms(ms) {
  if (!Number.isFinite(ms) || ms < 0) ms = 0;
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/**
 * Título legible del ensayo para el banner.
 * Preferencia: descripción → tipo + ensambles → tipo · hora.
 */
export function ensayoBannerLabel(evt) {
  if (!evt) return "Ensayo";
  const hi = evt.hora_inicio?.slice(0, 5) || "";
  const hf = evt.hora_fin?.slice(0, 5) || "";
  const horario = hi && hf && hf !== hi ? `${hi}–${hf}` : hi;
  const ens = (evt.eventos_ensambles || [])
    .map((ee) => ee.ensambles?.ensamble || ee.ensamble)
    .filter(Boolean);
  const tipo = evt.tipos_evento?.nombre || "Ensayo de ensamble";
  const desc = String(evt.descripcion || "").trim();

  if (desc) {
    const bits = [desc];
    if (ens.length) bits.push(ens.join(", "));
    if (horario) bits.push(horario);
    return bits.join(" · ");
  }

  const bits = [tipo];
  if (ens.length) bits.push(ens.join(", "));
  if (horario) bits.push(horario);
  return bits.join(" · ");
}

/** Nombre corto del evento (solo descripción o tipo). */
export function ensayoBannerTitle(evt) {
  if (!evt) return "Ensayo";
  const desc = String(evt.descripcion || "").trim();
  if (desc) return desc;
  return evt.tipos_evento?.nombre || "Ensayo de ensamble";
}

/** Subtítulo: ensambles + horario. */
export function ensayoBannerSubtitle(evt) {
  if (!evt) return "";
  const hi = evt.hora_inicio?.slice(0, 5) || "";
  const hf = evt.hora_fin?.slice(0, 5) || "";
  const horario = hi && hf && hf !== hi ? `${hi}–${hf}` : hi;
  const ens = (evt.eventos_ensambles || [])
    .map((ee) => ee.ensambles?.ensamble || ee.ensamble)
    .filter(Boolean);
  const bits = [];
  if (ens.length) bits.push(ens.join(", "));
  if (horario) bits.push(horario);
  return bits.join(" · ");
}
