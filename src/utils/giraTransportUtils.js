import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  IconBus,
  IconBusGrande,
  IconTruck,
  IconCar,
  IconVan,
  IconPlane,
  IconCalculator,
} from "../components/ui/Icons";
import { parseSupabasePublicStorageUrl } from "./supabaseStorage";

/** Categoría de uso del transporte → id_tipo_evento de las paradas en `eventos`. */
export const CATEGORIAS_TRANSPORTE = {
  PASAJEROS: 11,
  LOGISTICO: 12,
  INTERNO: 35,
};

export const TRANSPORT_ICON_MAP = {
  IconBus,
  IconBusGrande,
  IconTruck,
  IconCar,
  IconVan,
  IconPlane,
  IconCalculator,
  Bus: IconBus,
  BusGrande: IconBusGrande,
  Truck: IconTruck,
  Car: IconCar,
  Van: IconVan,
  Plane: IconPlane,
  Calculator: IconCalculator,
};

export function eventTypeIdForCategoria(categoria) {
  const c = String(categoria || "PASAJEROS").toUpperCase();
  if (c === "LOGISTICO") return CATEGORIAS_TRANSPORTE.LOGISTICO;
  if (c === "INTERNO") return CATEGORIAS_TRANSPORTE.INTERNO;
  return CATEGORIAS_TRANSPORTE.PASAJEROS;
}

export const formatDateSafe = (dateString) => {
  if (!dateString) return "-";
  try {
    const [, month, day] = dateString.split("-");
    return `${day}/${month}`;
  } catch {
    return dateString;
  }
};

export const sortEventsBySchedule = (events) =>
  [...(events || [])].sort((a, b) =>
    `${a.fecha || ""}${a.hora_inicio || ""}`.localeCompare(
      `${b.fecha || ""}${b.hora_inicio || ""}`,
    ),
  );

export const formatEventScheduleLabel = (evt, { withWeekday = false } = {}) => {
  if (!evt?.fecha) return null;
  const date = formatDateSafe(evt.fecha);
  const time = evt.hora_inicio ? String(evt.hora_inicio).slice(0, 5) : "";
  const dateTime = time ? `${date} ${time}` : date;
  if (!withWeekday) return dateTime;
  try {
    const dateObj = new Date(`${evt.fecha}T12:00:00`);
    const weekday = format(dateObj, "EEEE", { locale: es });
    const label = weekday.charAt(0).toLowerCase() + weekday.slice(1);
    return `${label}, ${dateTime}`;
  } catch {
    return dateTime;
  }
};

export const getTransportScheduleBounds = (events) => {
  const sorted = sortEventsBySchedule(events);
  if (!sorted.length) return null;
  const first = formatEventScheduleLabel(sorted[0], { withWeekday: true });
  const last = formatEventScheduleLabel(sorted[sorted.length - 1]);
  if (!first) return null;
  return {
    first,
    last,
    range: last && last !== first ? `${first} — ${last}` : first,
    stopCount: sorted.length,
  };
};

export const getChoferDocumentationStatus = (chofer) => {
  if (!chofer) return null;
  const hasCarnet = Boolean(String(chofer.link_carnet || "").trim());
  const hasDni = Boolean(String(chofer.link_dni_img || "").trim());
  if (hasCarnet && hasDni) return "complete";
  return "incomplete";
};

export const extractStoragePathFromUrl = (url) => {
  if (!url) return null;
  const parsed = parseSupabasePublicStorageUrl(url);
  if (!parsed?.path) return null;
  return { bucket: parsed.bucket, path: parsed.path.split("?")[0] };
};
