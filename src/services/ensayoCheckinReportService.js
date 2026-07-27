import { membershipActiveOnProgramDate } from "../utils/ensembleMembership";
import { googleMapsUrlForCoords, haversineMeters, resolveLocacionCoords } from "../utils/mapsCoords";

const ID_TIPO_ENSAYO = 13;

function normalizeEnsambleLabel(name) {
  return String(name ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/** Opciones de ensamble visibles en el picker de asistencia (sin CF* ni Producción). */
export function isEnsambleSelectableForCheckinReport(ensambleName) {
  const raw = String(ensambleName ?? "").trim();
  if (raw.toUpperCase().startsWith("CF")) return false;
  if (normalizeEnsambleLabel(raw) === "produccion") return false;
  return true;
}

const EVENT_SELECT = `
  id, fecha, hora_inicio, hora_fin, descripcion, id_locacion,
  eventos_ensambles ( id_ensamble, ensambles ( id, ensamble ) ),
  locaciones ( id, nombre, latitud, longitud, link_mapa, localidades ( localidad ) )
`;

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {{ desde: string, hasta: string, ensambleIds: number[] }} params
 */
export async function fetchEnsayoCheckinReportData(supabase, {
  desde,
  hasta,
  ensambleIds,
}) {
  if (!desde || !hasta || !ensambleIds?.length) {
    return { events: [], integrantes: [], checkins: [], ensambles: [] };
  }

  const { data: ensambles, error: ensErr } = await supabase
    .from("ensambles")
    .select("id, ensamble")
    .in("id", ensambleIds)
    .order("ensamble");
  if (ensErr) throw ensErr;

  const { data: eeRows, error: eeErr } = await supabase
    .from("eventos_ensambles")
    .select("id_evento, id_ensamble")
    .in("id_ensamble", ensambleIds);
  if (eeErr) throw eeErr;

  const eventIdsFromEns = [
    ...new Set((eeRows || []).map((r) => r.id_evento).filter(Boolean)),
  ];
  if (!eventIdsFromEns.length) {
    return {
      events: [],
      integrantes: [],
      checkins: [],
      ensambles: ensambles || [],
    };
  }

  const { data: events, error: evErr } = await supabase
    .from("eventos")
    .select(EVENT_SELECT)
    .in("id", eventIdsFromEns)
    .eq("id_tipo_evento", ID_TIPO_ENSAYO)
    .eq("is_deleted", false)
    .gte("fecha", desde)
    .lte("fecha", hasta)
    .order("fecha", { ascending: true })
    .order("hora_inicio", { ascending: true });
  if (evErr) throw evErr;

  const eventList = events || [];
  const eventIds = eventList.map((e) => e.id);

  let checkins = [];
  if (eventIds.length) {
    const { data: chk, error: chkErr } = await supabase
      .from("eventos_checkin_ensayo")
      .select(
        "id, id_evento, id_integrante, registrado_at, salida_at, latitud, longitud, precision_m, distancia_sede_m, modo, modo_salida, justificado, editado_por_admin, nota_justificacion, salida_latitud, salida_longitud, salida_precision_m, salida_distancia_sede_m",
      )
      .in("id_evento", eventIds);
    if (chkErr) throw chkErr;
    checkins = chk || [];
  }

  const { data: memberships, error: memErr } = await supabase
    .from("integrantes_ensambles")
    .select(
      "id_integrante, id_ensamble, fecha_desde, fecha_hasta, integrantes ( id, apellido, nombre, id_instr, instrumentos ( instrumento, id ) )",
    )
    .in("id_ensamble", ensambleIds);
  if (memErr) throw memErr;

  const integranteMap = new Map();
  for (const m of memberships || []) {
    const i = m.integrantes;
    if (!i?.id) continue;
    const id = Number(i.id);
    if (!integranteMap.has(id)) {
      integranteMap.set(id, {
        id,
        apellido: i.apellido,
        nombre: i.nombre,
        id_instr: i.id_instr,
        instrumento: i.instrumentos?.instrumento || "",
        ensambleIds: new Set(),
      });
    }
    integranteMap.get(id).ensambleIds.add(Number(m.id_ensamble));
  }

  const integrantes = [...integranteMap.values()]
    .filter((person) => {
      return eventList.some((evt) => {
        const ensIds = (evt.eventos_ensambles || []).map((ee) =>
          Number(ee.id_ensamble),
        );
        const inEns = ensIds.some((eid) => person.ensambleIds.has(eid));
        if (!inEns) return false;
        return ensIds.some((eid) => {
          if (!person.ensambleIds.has(eid)) return false;
          const mem = (memberships || []).find(
            (row) =>
              Number(row.id_integrante) === person.id &&
              Number(row.id_ensamble) === eid,
          );
          if (!mem) return false;
          return membershipActiveOnProgramDate(mem, evt.fecha);
        });
      });
    })
    .sort((a, b) => {
      const ia = Number(a.id_instr) || 999999;
      const ib = Number(b.id_instr) || 999999;
      if (ia !== ib) return ia - ib;
      return `${a.apellido} ${a.nombre}`.localeCompare(
        `${b.apellido} ${b.nombre}`,
        "es",
      );
    });

  return {
    events: eventList,
    integrantes,
    checkins,
    ensambles: ensambles || [],
  };
}

export function buildCheckinLookup(checkins) {
  const map = new Map();
  for (const c of checkins || []) {
    map.set(`${c.id_evento}-${c.id_integrante}`, c);
  }
  return map;
}

export function eventColumnLabel(evt) {
  const hi = evt.hora_inicio?.slice(0, 5) || "";
  const parts = evt.fecha?.split("-");
  const ddmm =
    parts?.length === 3 ? `${parts[2]}/${parts[1]}` : evt.fecha || "";
  return `${ddmm} ${hi}`.trim();
}

/** TZ institucional del check-in de ensayos (igual que RPCs `ensayo_hoy_ar`). */
export const ENSAYO_CHECKIN_TZ = "America/Argentina/Buenos_Aires";

/**
 * Formatea `registrado_at` / `salida_at` como HH:mm.
 * Supabase/PostgREST entrega timestamptz en UTC (`…+00:00`); la hora de pared
 * institucional coincide con esa cara UTC (no reaplicar UTC−3 en el cliente).
 */
export function formatRegistradoHora(iso) {
  if (!iso) return "";
  try {
    if (typeof iso === "string") {
      const m = iso.match(/T(\d{2}):(\d{2})/);
      if (m) return `${m[1]}:${m[2]}`;
    }
    const d = typeof iso === "number" ? new Date(iso) : iso instanceof Date ? iso : new Date(iso);
    if (!(d instanceof Date) || isNaN(d.getTime())) return "";
    return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
  } catch {
    return "";
  }
}

/**
 * Instant para admin upsert: la HH:mm cargada se persiste como cara UTC
 * (mismo criterio que `formatRegistradoHora`).
 */
export function buildRegistradoAtArgentina(fecha, timeHHmm) {
  const t = (timeHHmm || "00:00").slice(0, 5);
  if (!fecha) return null;
  return `${fecha}T${t}:00.000Z`;
}

/**
 * Ubicación GPS/QR real.
 * Llegada: pin si hay coords (aunque luego se edite la hora/salida por admin).
 * Salida: pin solo si hay coords propias de salida (no carga admin sin GPS).
 * @param {object | null | undefined} checkin
 * @param {'llegada'|'salida'} [kind='llegada']
 */
export function checkinHasMapLocation(checkin, kind = "llegada") {
  if (!checkin) return false;
  if (checkin.justificado) return false;

  if (kind === "salida") {
    if (checkin.modo_salida === "admin") return false;
    const lat = Number(checkin.salida_latitud);
    const lng = Number(checkin.salida_longitud);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
    if (Math.abs(lat) < 1e-5 && Math.abs(lng) < 1e-5) return false;
    return true;
  }

  const lat = Number(checkin.latitud);
  const lng = Number(checkin.longitud);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  if (Math.abs(lat) < 1e-5 && Math.abs(lng) < 1e-5) return false;
  return true;
}

/** @param {object | null | undefined} checkin @param {'llegada'|'salida'} [kind='llegada'] */
export function checkinGoogleMapsUrl(checkin, kind = "llegada") {
  if (!checkinHasMapLocation(checkin, kind)) return null;
  if (kind === "salida") {
    return googleMapsUrlForCoords(checkin.salida_latitud, checkin.salida_longitud);
  }
  return googleMapsUrlForCoords(checkin.latitud, checkin.longitud);
}

export function formatDistanciaSedeM(meters) {
  if (meters == null || !Number.isFinite(Number(meters))) return null;
  const n = Math.round(Number(meters));
  if (n < 1000) return `${n} m`;
  return `${(n / 1000).toFixed(1)} km`;
}

/**
 * Distancia a la sede del ensayo: usa valor guardado o estima con coords de locación.
 * @param {object | null | undefined} checkin
 * @param {{ locaciones?: { latitud?: number | null, longitud?: number | null } } | null | undefined} evt
 * @param {'llegada'|'salida'} [kind='llegada']
 */
export function resolveCheckinDistanciaSedeM(checkin, evt, kind = "llegada") {
  if (!checkinHasMapLocation(checkin, kind)) return null;
  const stored =
    kind === "salida" ? checkin.salida_distancia_sede_m : checkin.distancia_sede_m;
  if (stored != null && Number.isFinite(Number(stored))) {
    return Number(stored);
  }
  const locCoords = resolveLocacionCoords(evt?.locaciones);
  if (!locCoords) return null;
  const lat =
    kind === "salida" ? Number(checkin.salida_latitud) : Number(checkin.latitud);
  const lng =
    kind === "salida" ? Number(checkin.salida_longitud) : Number(checkin.longitud);
  const d = haversineMeters({ lat, lng }, locCoords);
  return Number.isFinite(d) ? d : null;
}

/**
 * @param {object | null | undefined} checkin
 * @param {object | null | undefined} evt
 * @param {'llegada'|'salida'} [kind='llegada']
 */
export function checkinMapPinTitle(checkin, evt, kind = "llegada") {
  if (!checkinHasMapLocation(checkin, kind)) return "";
  const lat =
    kind === "salida" ? Number(checkin.salida_latitud) : Number(checkin.latitud);
  const lng =
    kind === "salida" ? Number(checkin.salida_longitud) : Number(checkin.longitud);
  const precision =
    kind === "salida" ? checkin.salida_precision_m : checkin.precision_m;
  const modo = kind === "salida" ? checkin.modo_salida : checkin.modo;
  const label = kind === "salida" ? "Ubicación de salida" : "Ubicación del check-in";
  const parts = [`${label}: ${lat.toFixed(5)}, ${lng.toFixed(5)}`];
  if (precision != null) {
    parts.push(`precisión ±${Math.round(precision)} m`);
  }
  const dist = resolveCheckinDistanciaSedeM(checkin, evt, kind);
  const distLabel = formatDistanciaSedeM(dist);
  if (distLabel) {
    parts.push(`${distLabel} de la sede${evt?.locaciones?.nombre ? ` (${evt.locaciones.nombre})` : ""}`);
  } else if (evt?.locaciones?.nombre) {
    parts.push(`sede sin coordenadas (${evt.locaciones.nombre})`);
  }
  if (modo === "peer_pase") {
    parts.push("vía QR de compañero");
  }
  return `${parts.join(" · ")} — Abrir en Google Maps`;
}

/**
 * Bloques de matriz por ensamble (evita una sola tabla con todas las columnas mezcladas).
 * @returns {Array<{ ensamble: object, ensambleId: number, events: object[], integrantes: object[] }>}
 */
export function buildEnsambleMatrixSections(ensambles, events, integrantes) {
  const sections = [];
  for (const en of ensambles || []) {
    const ensambleId = Number(en.id);
    const sectionEvents = (events || []).filter((evt) =>
      (evt.eventos_ensambles || []).some(
        (ee) => Number(ee.id_ensamble) === ensambleId,
      ),
    );
    const sectionIntegrantes = (integrantes || []).filter((p) =>
      p.ensambleIds?.has?.(ensambleId),
    );
    if (!sectionEvents.length || !sectionIntegrantes.length) continue;
    sections.push({
      ensamble: en,
      ensambleId,
      events: sectionEvents,
      integrantes: sectionIntegrantes,
    });
  }
  return sections;
}
