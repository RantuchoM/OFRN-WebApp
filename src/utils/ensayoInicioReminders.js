/**
 * Tags y textos de recordatorios locales de inicio (llegada) de ensayo.
 */
import {
  ensayoBannerTitle,
  ensayoBannerSubtitle,
  ENSAYO_CHECKIN_PRE_MINUTES,
} from "./ensayoCheckinBanner";

/**
 * @param {number|string} eventoId
 * @param {'pre_inicio'} [tipo='pre_inicio']
 */
export function localInicioNotificationTag(eventoId, tipo = "pre_inicio") {
  return tipo === "pre_inicio"
    ? `ensayo-inicio-pre-${eventoId}`
    : `ensayo-inicio-${tipo}-${eventoId}`;
}

/**
 * @param {object} evt
 * @param {'pre_inicio'} [tipo='pre_inicio']
 */
export function buildInicioReminderBodies(evt, tipo = "pre_inicio") {
  const name = ensayoBannerTitle(evt);
  const sub = ensayoBannerSubtitle(evt);
  const label = [name, sub].filter(Boolean).join(" · ");
  const hi = evt?.hora_inicio?.slice(0, 5) || "";
  if (tipo === "pre_inicio") {
    return {
      title: "Ensayo en breve · marcá el ingreso",
      body: hi
        ? `En ~${ENSAYO_CHECKIN_PRE_MINUTES} min empieza «${label}» (${hi}). Abrí la app y registrá la llegada.`
        : `En ~${ENSAYO_CHECKIN_PRE_MINUTES} min empieza «${label}». Abrí la app y registrá la llegada.`,
    };
  }
  return {
    title: "Ensayo · marcá el ingreso",
    body: `Recordá registrar la llegada a «${label}».`,
  };
}
