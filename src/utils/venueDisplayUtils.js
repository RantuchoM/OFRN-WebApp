import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

export function formatVenueStageDims(loc) {
  const w = Number(loc?.escenario_ancho_cm);
  const d = Number(loc?.escenario_profundo_cm);
  if (Number.isFinite(w) && w > 0 && Number.isFinite(d) && d > 0) {
    return `${Math.round(w)} × ${Math.round(d)} cm`;
  }
  return null;
}

export function formatVenueEventDate(fechaRaw) {
  if (!fechaRaw) return "";
  try {
    const d = parseISO(fechaRaw);
    const s = format(d, "EEEE, dd/MM/yyyy", { locale: es });
    return s.charAt(0).toUpperCase() + s.slice(1);
  } catch {
    return fechaRaw;
  }
}

/** Short date for venue badge: `dd/MM/yyyy`. */
export function formatVenueShortDate(fechaRaw) {
  if (!fechaRaw) return "";
  try {
    return format(parseISO(fechaRaw), "dd/MM/yyyy");
  } catch {
    return String(fechaRaw);
  }
}

/**
 * First–last concert dates for badge, e.g. `18/09/2026 - 19/09/2026`.
 * Same date twice → single date. Empty events → "".
 */
export function formatVenueShowsDateRange(events) {
  const dates = (events || [])
    .map((e) => e?.fecha)
    .filter(Boolean)
    .slice()
    .sort();
  if (dates.length === 0) return "";
  const first = formatVenueShortDate(dates[0]);
  const last = formatVenueShortDate(dates[dates.length - 1]);
  if (!first) return "";
  if (!last || first === last) return first;
  return `${first} - ${last}`;
}

export function extractEventGrupos(evt) {
  return (evt.eventos_grupos || [])
    .map((eg) => eg.giras_grupos)
    .filter(Boolean);
}

export function extractEventArtistas(evt) {
  return (evt.eventos_fimba_propuestas || [])
    .map((row) => row.fimba_propuestas)
    .filter(Boolean)
    .sort((a, b) =>
      String(a.nombre || "").localeCompare(String(b.nombre || ""), "es", {
        sensitivity: "base",
      }),
    );
}

export function groupEventsByLocacion(events) {
  const byLoc = new Map();
  (events || []).forEach((evt) => {
    const loc = evt.locaciones;
    const locId = loc?.id ?? evt.id_locacion ?? null;
    if (locId == null) return;
    if (!byLoc.has(locId)) {
      byLoc.set(locId, { locacion: loc, events: [] });
    }
    byLoc.get(locId).events.push(evt);
  });
  return Array.from(byLoc.values()).sort((a, b) => {
    const nameA = a.locacion?.nombre || "";
    const nameB = b.locacion?.nombre || "";
    return nameA.localeCompare(nameB, "es");
  });
}
