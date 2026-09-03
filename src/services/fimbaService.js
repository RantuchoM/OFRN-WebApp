/**
 * FIMBA — servicios de datos y helpers de capacidad.
 * Capacidad:
 *   tope_personas = cantidad_planificada
 *   para_hotel_comida = tope_personas
 *   para_transporte = tope_personas + plazas_extra_materiales
 */

import { supabase } from "./supabase";
import {
  fetchGiraGrupos,
  setEventoGrupos,
  eventGrupoIdsFromEvent,
} from "./giraGruposService";
import { resolveGiraRosterForMatrix } from "./giraService";
import { fetchRosterForGira } from "../hooks/useGiraRoster";
import { calculateLogisticsSummary } from "../hooks/useLogistics";
import { fetchGiraSegmentosBundle } from "./giraSegmentosService";
import {
  sortFimbaAgendaRows,
  sortFimbaPropuestasByNombre,
} from "../utils/fimbaAgendaSort";
import { eventTypeIdForCategoria, sortEventsBySchedule } from "../utils/giraTransportUtils";
import {
  categoriesFromTiposEvento,
  normalizeCategoriasTiposEventos,
} from "../utils/fimbaEventCategories";
import {
  canonicalizeAgendaConsultaFilters,
  eventMatchesPropuestaRouteFilter,
  filtersFromAgendaConsultaRow,
} from "../utils/fimbaAgendaUrlParams";
import {
  buildAllVehicleBoardingSequences,
  buildArtistaTrasladoAgendaBlocks,
  buildFimbaRidesForVehicle,
  collectVehicleRideEndpointIds,
  extractOfrnRidesForVehicle,
  indexOfEvent,
  isFimbaRideAboardAtStop,
  isOpenFimbaRide,
  isVehicleBoardingSequenceEvent,
  listOfrnPeopleAboardAtStop,
  sumRidesOccupyingWindow,
} from "../utils/fimbaTransportBoarding";
import { normalize } from "../utils/giraUtils";
import {
  FIMBA_RIDER_BUCKET,
  normalizeFimbaRiderHtml,
} from "../utils/fimbaRider";
import { normalizeEventosInternasHtml } from "../utils/eventosInternas";
import {
  aggregateMealsPlans,
  computeArtistaMealsPlan,
} from "../utils/fimbaMealsStay";
import {
  computeStayOccupancy,
  FIMBA_HORA_CHECKIN,
  FIMBA_HORA_CHECKOUT,
  FIMBA_TIPO_EVENTO_CHECKIN,
  FIMBA_TIPO_EVENTO_CHECKOUT,
  isoDateOrNull,
  normalizeParticipanteStayAgainstGroup,
  normalizeParticipanteStayEventAgainstGroup,
  stayDateFromEventOrMirror,
} from "../utils/fimbaStay";
import {
  FIMBA_GENERO_DEFAULT as FIMBA_GENERO_DEFAULT_CANON,
  canonicalizeFimbaGenero,
} from "../utils/fimbaGenero";

/**
 * Tipos de alimentación de `fimba_participantes.tipo_alimentacion`
 * (CHECK en migración base). `otro` → detalle libre en `nota_alimentacion`.
 */
export const FIMBA_TIPOS_ALIMENTACION = [
  { value: "regular", label: "Regular" },
  { value: "vegetariano", label: "Vegetariano" },
  { value: "vegano", label: "Vegano" },
  { value: "celiaco", label: "Celíaco" },
  { value: "sin_tacc", label: "Sin TACC" },
  { value: "otro", label: "Otros..." },
];

/** Valor del select / DB para régimen no listado (texto en `nota_alimentacion`). */
export const FIMBA_ALIMENTACION_OTRO = "otro";

/** Presets del dropdown (sin la fila «Otros…»). */
export const FIMBA_ALIMENTACION_PRESETS = FIMBA_TIPOS_ALIMENTACION.filter(
  (t) => t.value !== FIMBA_ALIMENTACION_OTRO,
);

const ALIMENTACION_BY_VALUE = new Map(
  FIMBA_TIPOS_ALIMENTACION.map((t) => [t.value, t]),
);

/**
 * @param {string|null|undefined} tipo
 * @returns {{ value: string, label: string }|null}
 */
export function resolveFimbaTipoAlimentacion(tipo) {
  const v = String(tipo ?? "")
    .trim()
    .toLowerCase();
  if (!v) return null;
  return ALIMENTACION_BY_VALUE.get(v) || null;
}

/**
 * Etiqueta legible: preset, o texto libre de «Otros…» (`nota_alimentacion`).
 * @param {string|null|undefined} tipo
 * @param {string|null|undefined} nota
 */
export function labelFimbaAlimentacion(tipo, nota) {
  const t = String(tipo ?? "")
    .trim()
    .toLowerCase();
  const n = String(nota ?? "").trim();
  if (!t && !n) return "—";
  if (t === FIMBA_ALIMENTACION_OTRO || (!ALIMENTACION_BY_VALUE.has(t) && n)) {
    return n || "Otros...";
  }
  if (!ALIMENTACION_BY_VALUE.has(t) && t) {
    // Valor no reconocido: mostrar tal cual (modo custom defensivo).
    return t;
  }
  return ALIMENTACION_BY_VALUE.get(t || "regular")?.label || t || "—";
}

/** Género/sexo del participante (persona bajo el artista). */
export const FIMBA_GENEROS = [
  { value: "femenino", label: "Femenino" },
  { value: "masculino", label: "Masculino" },
  { value: "otro", label: "Otro" },
  { value: "sin_especificar", label: "Sin especificar" },
];

export const FIMBA_GENERO_DEFAULT = FIMBA_GENERO_DEFAULT_CANON;

/** Tipos de habitación FIMBA (cupo por habitación). */
export const FIMBA_TIPOS_HABITACION = [
  { value: "SGL", label: "Single", short: "SGL", capacidad: 1 },
  { value: "DBL", label: "Doble", short: "DBL", capacidad: 2 },
  { value: "TPL", label: "Triple", short: "TPL", capacidad: 3 },
  { value: "QAD", label: "Cuádruple", short: "QAD", capacidad: 4 },
];

export const FIMBA_TIPO_HABITACION_CAPACIDAD = Object.fromEntries(
  FIMBA_TIPOS_HABITACION.map((t) => [t.value, t.capacidad]),
);

/**
 * Capacidad de plazas por tipo de habitación (SGL=1 … QAD=4).
 * @param {string} tipo
 */
export function capacityForHabitacionTipo(tipo) {
  const cap = FIMBA_TIPO_HABITACION_CAPACIDAD[String(tipo || "").toUpperCase()];
  return cap != null ? cap : 0;
}

/**
 * Total de plazas de un borrador de cupos (inventario).
 * Fórmula: Σ count(tipo) × capacidad(tipo)  →  SGL×1 + DBL×2 + TPL×3 + QAD×4.
 * @param {{ SGL?: number, DBL?: number, TPL?: number, QAD?: number } | null} counts
 */
export function totalPlazasFromHabitacionCounts(counts) {
  let total = 0;
  for (const t of FIMBA_TIPOS_HABITACION) {
    total += Math.max(0, Number(counts?.[t.value]) || 0) * t.capacidad;
  }
  return total;
}

/**
 * Etiqueta legible del tipo (+ Matrimonial / Twin).
 * @param {{ tipo?: string, matrimonial?: boolean }} hab
 */
export function labelFimbaHabitacionTipo(hab) {
  const t = FIMBA_TIPOS_HABITACION.find(
    (x) => x.value === String(hab?.tipo || "").toUpperCase(),
  );
  const base = t?.label || hab?.tipo || "—";
  if (!t || t.capacidad <= 1) return base;
  return hab?.matrimonial ? `${base} · Matrimonial` : `${base} · Twin`;
}

/**
 * Cuenta habitaciones por tipo + plazas inventario / ocupadas.
 * @param {Array<{ tipo?: string, ocupantes?: unknown[] }>} habitaciones
 */
export function summarizeFimbaHabitaciones(habitaciones) {
  const byTipo = { SGL: 0, DBL: 0, TPL: 0, QAD: 0 };
  let slots = 0;
  let ocupadas = 0;
  for (const h of habitaciones || []) {
    const tipo = String(h?.tipo || "").toUpperCase();
    if (byTipo[tipo] != null) byTipo[tipo] += 1;
    slots += capacityForHabitacionTipo(tipo);
    ocupadas += Array.isArray(h?.ocupantes) ? h.ocupantes.length : 0;
  }
  return { byTipo, slots, ocupadas, libres: Math.max(0, slots - ocupadas) };
}

/**
 * Texto corto inventario: «3 DBL, 1 SGL».
 * @param {{ SGL?: number, DBL?: number, TPL?: number, QAD?: number } | null} byTipo
 */
export function formatFimbaHabitacionesCounts(byTipo) {
  const parts = [];
  for (const t of FIMBA_TIPOS_HABITACION) {
    const n = Number(byTipo?.[t.value]) || 0;
    if (n > 0) parts.push(`${n} ${t.short}`);
  }
  return parts.length ? parts.join(", ") : "Sin habitaciones";
}

export const FIMBA_PROPUESTA_ESTADOS = [
  { value: "borrador", label: "Borrador" },
  { value: "activa", label: "Activa" },
  { value: "cerrada", label: "Cerrada" },
  { value: "cancelada", label: "Cancelada" },
];

export const FIMBA_ARTISTA_COLORS = [
  "#d73289",
  "#00b1eb",
  "#94216D",
  "#2AC4EA",
  "#222222",
  "#e85d04",
  "#2a9d8f",
  "#6d597a",
];

/**
 * Catálogo OFRN de tipos de evento (`tipos_evento` + `categorias_tipos_eventos`).
 * FIMBA no inventa presets locales: misma FK que EventForm / UnifiedAgenda.
 */
/** Default evento genérico FIMBA (“Nuevo evento” en catálogo Logística). */
export const FIMBA_DEFAULT_TIPO_EVENTO = 16;
/** Traslado pasajeros (EventForm / flota); default en página Transportes. */
export const FIMBA_TIPO_EVENTO_TRASLADO = 11;
/**
 * Categoría «Transporte» en `categorias_tipos_eventos` (Traslado, Interno, Solista…).
 * Criterio principal para UI de flota; ver también OFRN_TRANSPORT_TIPO_IDS.
 */
export const OFRN_CATEGORIA_TRANSPORTE_ID = 6;
/** Categoría `categorias_tipos_eventos.nombre = 'Ensayos'` (tipos ensayo / prueba de sonido / etc.). */
export const OFRN_CATEGORIA_ENSAYOS_ID = 2;
/** Tipo Concierto canónico OFRN (`tipos_evento.id = 1`). */
export const ID_TIPO_CONCIERTO = 1;
/**
 * Tipos de transporte fuera de cat. 6 o usados por EventForm / agendaHelpers /
 * giraTransportUtils (p.ej. 12 = Traslado logístico bajo «Logística»).
 */
export const OFRN_TRANSPORT_TIPO_IDS = new Set([11, 12, 28, 31, 35]);

/**
 * ¿El tipo de evento OFRN implica lógica de vehículo / SIN SERVICIO?
 * Alineado con EventForm (11/12) + categoría Transporte (id 6) + ids internos.
 *
 * @param {number|string|null|undefined} tipoId
 * @param {{ id_categoria?: number|string|null, categorias_tipos_eventos?: { id?: number|string|null, nombre?: string|null }|null, nombre?: string|null }|null} [tipoMeta]
 */
export function actividadUsaTransporte(tipoId, tipoMeta = null) {
  const id = Number(tipoId);
  if (!Number.isFinite(id)) return false;
  if (OFRN_TRANSPORT_TIPO_IDS.has(id)) return true;
  const catId = Number(
    tipoMeta?.id_categoria ?? tipoMeta?.categorias_tipos_eventos?.id,
  );
  if (catId === OFRN_CATEGORIA_TRANSPORTE_ID) return true;
  const catNombre = String(
    tipoMeta?.categorias_tipos_eventos?.nombre || "",
  )
    .trim()
    .toLowerCase();
  if (catNombre === "transporte") return true;
  return false;
}

/**
 * Normaliza filas de `tipos_evento` (mismo shape que carga EventForm / UnifiedAgenda).
 * @param {Array} rows
 */
export function normalizeTiposEventoCatalog(rows) {
  return (rows || []).map((t) => ({
    id: Number(t.id),
    nombre: t.nombre || `Tipo ${t.id}`,
    color: t.color || "#94a3b8",
    id_categoria:
      t.id_categoria != null
        ? Number(t.id_categoria)
        : t.categorias_tipos_eventos?.id != null
          ? Number(t.categorias_tipos_eventos.id)
          : null,
    categorias_tipos_eventos: t.categorias_tipos_eventos || null,
    categoria_nombre: t.categorias_tipos_eventos?.nombre || null,
  }));
}

export {
  categoriesFromTiposEvento,
  mergeFimbaAgendaCategories,
  normalizeCategoriasTiposEventos,
} from "../utils/fimbaEventCategories";

/**
 * @param {{ cantidad_planificada?: number, plazas_extra_materiales?: number } | null} propuesta
 */
export function computeFimbaCapacity(propuesta) {
  const tope = Math.max(0, Number(propuesta?.cantidad_planificada) || 0);
  const extra = Math.max(0, Number(propuesta?.plazas_extra_materiales) || 0);
  return {
    tope_personas: tope,
    /** = plazas_extra_materiales (asientos de equipaje/materiales). */
    plazas_extra_materiales: extra,
    para_hotel_comida: tope,
    /** Tope transporte = personas planificadas + extras materiales. */
    para_transporte: tope + extra,
  };
}

/**
 * Mensaje ES hard-block al superar el tope de transporte del artista.
 * Fórmula: para_transporte = cantidad_planificada + plazas_extra_materiales.
 *
 * @param {{ cantidad_planificada?: number, plazas_extra_materiales?: number } | null} propuesta
 */
export function formatFimbaTopeTransporteError(propuesta) {
  const cap = computeFimbaCapacity(propuesta);
  const plan = cap.tope_personas;
  const extra = cap.plazas_extra_materiales;
  return `Supera el tope de transporte del artista (${cap.para_transporte} plazas: ${plan} planificadas + ${extra} equip.).`;
}

/**
 * Suma plazas de rides de un artista.
 * Con `eventId` + `sortedEvents`: solo rides **presentes en esa parada**
 * (no un ride abierto de otro día). Sin secuencia: rides abiertos (subida
 * sin bajada). Rides cerrados no cuentan fuera de la parada de bajada.
 *
 * @param {Array<{ id?: unknown, id_propuesta?: unknown, plazas?: number, id_evento_subida?: unknown, id_evento_bajada?: unknown, propuesta?: { id?: unknown }|null }>} rutas
 * @param {number|string} idPropuesta
 * @param {{ excludeRutaIds?: Array<number|string>, onlyOpen?: boolean, eventId?: unknown, sortedEvents?: Array<{ id?: unknown }> }} [opts]
 */
export function sumPropuestaRutasPlazas(rutas, idPropuesta, opts = {}) {
  if (idPropuesta == null || idPropuesta === "") return 0;
  const want = String(idPropuesta);
  const exclude = new Set((opts.excludeRutaIds || []).map(String));
  const onlyOpen = opts.onlyOpen !== false;
  const eventId = opts.eventId;
  const sortedEvents = opts.sortedEvents;
  const useStop =
    eventId != null &&
    eventId !== "" &&
    Array.isArray(sortedEvents) &&
    sortedEvents.length > 0;
  let sum = 0;
  for (const r of rutas || []) {
    const pid = r?.id_propuesta ?? r?.propuesta?.id;
    if (pid == null || String(pid) !== want) continue;
    if (r?.id != null && exclude.has(String(r.id))) continue;
    if (useStop) {
      if (!isFimbaRideAboardAtStop(r, eventId, sortedEvents)) continue;
    } else if (onlyOpen && !isOpenFimbaRide(r)) continue;
    sum += Math.max(0, Number(r.plazas) || 0);
  }
  return sum;
}

/**
 * Uso / restantes del tope transporte por artista respecto a sus rutas.
 * En una parada: Σ plazas ya a bordo **en ese evento** ≤ para_transporte.
 * Un ride abierto de un tramo posterior no bloquea subir ahora.
 *
 * @param {{ id?: unknown, cantidad_planificada?: number, plazas_extra_materiales?: number } | null} propuesta
 * @param {Array} rutas — `fimba_propuesta_rutas` (pueden ser de varias propuestas)
 * @param {{ excludeRutaIds?: Array<number|string>, id_propuesta?: unknown, onlyOpen?: boolean, eventId?: unknown, sortedEvents?: Array<{ id?: unknown }> }} [opts]
 */
export function computeArtistaTransporteUsage(propuesta, rutas, opts = {}) {
  const idProp = propuesta?.id ?? opts.id_propuesta;
  const cap = computeFimbaCapacity(propuesta);
  const used = sumPropuestaRutasPlazas(rutas, idProp, {
    excludeRutaIds: opts.excludeRutaIds,
    onlyOpen: opts.onlyOpen,
    eventId: opts.eventId,
    sortedEvents: opts.sortedEvents,
  });
  const remaining = Math.max(0, cap.para_transporte - used);
  return {
    id_propuesta: idProp ?? null,
    tope: cap.para_transporte,
    planificadas: cap.tope_personas,
    materiales: cap.plazas_extra_materiales,
    used,
    remaining,
  };
}

/**
 * Default de plazas al asignar artista: min(restantes del artista, libres del vehículo).
 * @param {{ remaining?: number, vehicleLibres?: number|null }} opts
 * @returns {number}
 */
export function defaultArtistaAssignPlazas(opts = {}) {
  let n = Math.max(0, Number(opts.remaining) || 0);
  if (opts.vehicleLibres != null && opts.vehicleLibres !== "") {
    const libres = Number(opts.vehicleLibres);
    if (Number.isFinite(libres)) n = Math.min(n, Math.max(0, libres));
  }
  return n;
}

/**
 * Cupo usable de una unidad al asignar plazas: libres de ventana si hay,
 * si no capacidad física (`capacidad_maxima`).
 * @param {{ libres?: number|null, capacidad?: number|null }|null} metrics
 * @param {{ capacidad_maxima?: number|null }|null} [gt]
 * @returns {number|null}
 */
export function cupoPlazasVehiculo(metrics, gt = null) {
  if (metrics?.libres != null && Number.isFinite(Number(metrics.libres))) {
    return Math.max(0, Number(metrics.libres));
  }
  if (metrics?.capacidad != null && Number.isFinite(Number(metrics.capacidad))) {
    return Math.max(0, Number(metrics.capacidad));
  }
  return capacidadGiraTransporte(gt);
}

/**
 * Reparte `remaining` plazas en orden (greedy) entre unidades.
 * Cada slot recibe min(resto, cupo) con cupo = libres ?? capacidad.
 * Caso típico: organismo 120 → 44 + 44 + 32 en tres buses.
 *
 * @param {number} remaining
 * @param {Array<{ id: string|number, libres?: number|null, capacidad?: number|null }>} slots
 * @returns {Record<string, number>}
 */
export function repartirPlazasEntreVehiculos(remaining, slots) {
  /** @type {Record<string, number>} */
  const out = {};
  let pool = Math.max(0, Number(remaining) || 0);
  for (const s of slots || []) {
    if (s?.id == null || s.id === "") continue;
    const sid = String(s.id);
    const cupo = cupoPlazasVehiculo(s);
    const n =
      cupo != null && Number.isFinite(cupo)
        ? Math.min(pool, Math.max(0, cupo))
        : pool;
    out[sid] = n;
    pool = Math.max(0, pool - n);
  }
  return out;
}

/**
 * Hard-block: ¿puedo asignar `plazas` dado `used` (ya contado sin esta fila)?
 * @returns {{ ok: true } | { ok: false, error: Error }}
 */
export function validateArtistaTransporteAssign(propuesta, usedPlazas, plazas) {
  const cap = computeFimbaCapacity(propuesta);
  const used = Math.max(0, Number(usedPlazas) || 0);
  const n = Math.max(0, Number(plazas) || 0);
  if (used + n > cap.para_transporte) {
    return { ok: false, error: new Error(formatFimbaTopeTransporteError(propuesta)) };
  }
  return { ok: true };
}

/**
 * Evento multi-vehículo: Σ plazas vs tope transporte de artistas taggeados.
 * @deprecated No usar para `fimba_evento_transportes.plazas` (reserva técnica anónima).
 * El headcount de artistas va por Sube (`fimba_propuesta_rutas`). Conservada por si
 * se reutiliza al validar Σ Sube vs tope. `saveFimbaEvento` ya no la llama.
 * Sin tags: no aplica (orquesta/flota libre de este check).
 *
 * @param {Array<{ cantidad_planificada?: number, plazas_extra_materiales?: number }>} propuestas
 * @param {number} totalPlazas
 * @returns {{ ok: true, tope: number } | { ok: false, tope: number, error: Error }}
 */
export function validateEventoTransportPlazasVsArtistas(propuestas, totalPlazas) {
  const props = propuestas || [];
  if (props.length === 0) return { ok: true, tope: null };
  const tope = props.reduce(
    (s, p) => s + computeFimbaCapacity(p).para_transporte,
    0,
  );
  const n = Math.max(0, Number(totalPlazas) || 0);
  if (n > tope) {
    if (props.length === 1) {
      return {
        ok: false,
        tope,
        error: new Error(formatFimbaTopeTransporteError(props[0])),
      };
    }
    return {
      ok: false,
      tope,
      error: new Error(
        `Supera el tope de transporte de los artistas seleccionados (${tope} plazas en total: personas planificadas + equip.).`,
      ),
    };
  }
  return { ok: true, tope };
}

export function countActiveParticipantes(participantes) {
  return (participantes || []).filter((p) => p.activo !== false).length;
}

/**
 * Cupos hotel/comida sin nominar: max(0, tope − nominados activos).
 * No incluye plazas_extra_materiales.
 */
export function computeFimbaSinNombre(propuesta, participantes) {
  const tope = computeFimbaCapacity(propuesta).para_hotel_comida;
  const nominados = countActiveParticipantes(participantes);
  return Math.max(0, tope - nominados);
}

function parseIsoDateLocal(iso) {
  const s = String(iso).slice(0, 10);
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

/**
 * Noches entre check-in y check-out (fechas ISO YYYY-MM-DD, timezone local).
 * @returns {number|null} null si faltan fechas
 */
export function nightsBetween(checkin, checkout) {
  if (!checkin || !checkout) return null;
  const a = parseIsoDateLocal(checkin);
  const b = parseIsoDateLocal(checkout);
  if (!a || !b) return null;
  const diff = Math.round((b - a) / 86400000);
  return Math.max(0, diff);
}

/** Default true (histórico): solo false excluye. */
export function propuestaRequiereHotel(propuestaOrRow) {
  const p = propuestaOrRow?.propuesta || propuestaOrRow;
  return p?.requiere_hotel !== false;
}

export function propuestaRequiereComidas(propuestaOrRow) {
  const p = propuestaOrRow?.propuesta || propuestaOrRow;
  return p?.requiere_comidas !== false;
}

export function filterHoteleriaRowsForHotel(rows) {
  return (rows || []).filter((r) => propuestaRequiereHotel(r));
}

export function filterHoteleriaRowsForComidas(rows) {
  return (rows || []).filter((r) => propuestaRequiereComidas(r));
}

export { resolveParticipanteStay } from "../utils/fimbaStay";

/**
 * @param {{ cantidad_planificada?: number } | null} propuesta
 * @param {Array<{ activo?: boolean }> | null} participantes
 */
export function computeHotelOccupancy(propuesta, participantes) {
  return computeStayOccupancy(propuesta, participantes);
}

/**
 * Resumen de alimentación por tipo (solo activos).
 */
export function summarizeAlimentacion(participantes) {
  const map = {};
  for (const p of participantes || []) {
    if (p.activo === false) continue;
    const key = p.tipo_alimentacion || "regular";
    map[key] = (map[key] || 0) + 1;
  }
  return map;
}

export function fimbaTokenUrl(kind, token, origin = typeof window !== "undefined" ? window.location.origin : "") {
  const base = String(origin || "").replace(/\/$/, "");
  const t = String(token || "").trim();
  if (!t) return "";
  // Consulta general de edición (no confusión con token edición de artista /fimba/e)
  if (kind === "c" || kind === "consulta_edicion" || kind === "edicion_consulta") {
    return `${base}/fimba/c/${t}`;
  }
  if (kind === "edicion") return `${base}/fimba/e/${t}`;
  return `${base}/fimba/a/${t}`;
}

const EDICION_SELECT =
  "id, nombre, anio, id_gira, token_consulta, created_at, updated_at, programas:id_gira ( id, nomenclador, nombre_gira, subtitulo )";

// ---------------------------------------------------------------------------
// Ediciones
// ---------------------------------------------------------------------------

export async function listFimbaEdiciones() {
  const { data, error } = await supabase
    .from("fimba_ediciones")
    .select(EDICION_SELECT)
    .order("anio", { ascending: false })
    .order("id", { ascending: false });
  if (error) return { ediciones: [], error };
  return { ediciones: data || [], error: null };
}

export async function getFimbaEdicionById(edicionId) {
  if (edicionId == null || edicionId === "") {
    return { edicion: null, error: new Error("id de edición requerido") };
  }
  const { data, error } = await supabase
    .from("fimba_ediciones")
    .select(EDICION_SELECT)
    .eq("id", edicionId)
    .maybeSingle();
  if (error) return { edicion: null, error };
  return { edicion: data, error: null };
}

export async function getFimbaEdicionByGiraId(giraId) {
  if (giraId == null || giraId === "") {
    return { edicion: null, error: null };
  }
  const { data, error } = await supabase
    .from("fimba_ediciones")
    .select(EDICION_SELECT)
    .eq("id_gira", giraId)
    .maybeSingle();
  if (error) return { edicion: null, error };
  return { edicion: data, error: null };
}

/**
 * Conciertos (id_tipo_evento = 1) con locación de la gira FIMBA enlazada a la edición.
 * Scope: solo eventos de `fimba_ediciones.id_gira`, no global OFRN.
 */
export async function listFimbaConcertVenues(edicionId) {
  if (edicionId == null || edicionId === "") {
    return { events: [], error: new Error("id de edición requerido") };
  }
  const { edicion, error: eEd } = await getFimbaEdicionById(edicionId);
  if (eEd) return { events: [], error: eEd };
  const idGira = edicion?.id_gira;
  if (idGira == null || idGira === "") {
    return { events: [], error: new Error("La edición no tiene gira enlazada") };
  }

  const { data, error } = await supabase
    .from("eventos")
    .select(
      `
        id,
        fecha,
        hora_inicio,
        hora_fin,
        descripcion,
        observaciones_aforo,
        id_tipo_evento,
        id_gira,
        id_locacion,
        id_repertorio,
        locaciones (
          id,
          nombre,
          direccion,
          capacidad,
          telefono,
          escenario_ancho_cm,
          escenario_profundo_cm,
          localidades ( localidad )
        ),
        programas ( id, nombre_gira, nomenclador, tipo ),
        programas_repertorios ( id, nombre ),
        eventos_grupos ( id_grupo, giras_grupos ( id, nombre, color ) ),
        eventos_fimba_propuestas (
          id_propuesta,
          fimba_propuestas ( id, nombre, color )
        )
      `,
    )
    .eq("id_gira", idGira)
    .eq("id_tipo_evento", 1)
    .not("id_locacion", "is", null)
    .order("fecha", { ascending: true })
    .order("hora_inicio", { ascending: true });

  if (error) return { events: [], error };
  return { events: data || [], edicion, error: null };
}

const FIMBA_VENUE_INFO_SELECT =
  "id, id_edicion, id_locacion, referente_nombre, referente_telefono, rider_disponible, sillas_disponibles, agua, observaciones, updated_at";

/**
 * Metadata operativa FIMBA por locación en una edición.
 * @param {number|string} edicionId
 */
export async function listFimbaVenueInfo(edicionId) {
  if (edicionId == null || edicionId === "") {
    return { venueInfo: [], error: new Error("id de edición requerido") };
  }
  const { data, error } = await supabase
    .from("fimba_venue_info")
    .select(FIMBA_VENUE_INFO_SELECT)
    .eq("id_edicion", edicionId);
  if (error) return { venueInfo: [], error };
  return { venueInfo: data || [], error: null };
}

/**
 * Upsert metadata FIMBA de venue (por edición + locación).
 * @param {number|string} edicionId
 * @param {number|string} idLocacion
 * @param {object} patch
 */
/**
 * Actualiza observaciones de aforo de un concierto (`eventos.observaciones_aforo`).
 * @param {number|string} eventoId
 * @param {string|null|undefined} text
 */
export async function updateEventoObservacionesAforo(eventoId, text) {
  if (eventoId == null || eventoId === "") {
    return { evento: null, error: new Error("id de evento requerido") };
  }
  const value = String(text ?? "").trim() || null;
  const { data, error } = await supabase
    .from("eventos")
    .update({
      observaciones_aforo: value,
      updated_at: new Date().toISOString(),
    })
    .eq("id", Number(eventoId))
    .select("id, observaciones_aforo")
    .single();
  if (error) return { evento: null, error };
  return { evento: data, error: null };
}

/** Select compartido planilla Backline / picker de ensayos. */
/** Estados de color Backline (planilla). */
export const FIMBA_BACKLINE_ESTADOS = [
  {
    value: "verde",
    label: "Verde",
    bg: "#22c55e",
    border: "#16a34a",
    fg: "#052e16",
  },
  {
    value: "celeste",
    label: "Celeste",
    bg: "#7dd3fc",
    border: "#0ea5e9",
    fg: "#0c4a6e",
  },
  {
    value: "amarillo",
    label: "Amarillo",
    bg: "#fde047",
    border: "#ca8a04",
    fg: "#422006",
  },
  {
    value: "naranja",
    label: "Naranja",
    bg: "#fb923c",
    border: "#ea580c",
    fg: "#431407",
  },
];

const BACKLINE_ESTADO_VALUES = new Set(
  FIMBA_BACKLINE_ESTADOS.map((e) => e.value),
);

/**
 * @param {unknown} raw
 * @returns {'verde'|'celeste'|'amarillo'|'naranja'|null}
 */
export function canonicalizeFimbaBacklineEstado(raw) {
  if (raw == null || raw === "") return null;
  const v = String(raw).trim().toLowerCase();
  return BACKLINE_ESTADO_VALUES.has(v) ? v : null;
}

export function resolveFimbaBacklineEstado(raw) {
  const value = canonicalizeFimbaBacklineEstado(raw);
  if (!value) return null;
  return FIMBA_BACKLINE_ESTADOS.find((e) => e.value === value) || null;
}

const FIMBA_BACKLINE_EVENT_SELECT = `
  id,
  fecha,
  hora_inicio,
  hora_fin,
  descripcion,
  backline_descripcion,
  backline_monto,
  backline_estado,
  planta_escenario_url,
  planta_escenario_nombre,
  backline_incluido,
  id_tipo_evento,
  id_gira,
  id_locacion,
  id_repertorio,
  tipos_evento (
    id,
    nombre,
    color,
    id_categoria,
    categorias_tipos_eventos ( id, nombre )
  ),
  locaciones (
    id,
    nombre,
    direccion,
    localidades ( localidad )
  ),
  programas ( id, nombre_gira, nomenclador, tipo ),
  programas_repertorios ( id, nombre ),
  eventos_grupos ( id_grupo, giras_grupos ( id, nombre, color ) ),
  eventos_fimba_propuestas (
    id_propuesta,
    fimba_propuestas ( id, nombre, color )
  ),
  stage_plot_eventos (
    id_stage_plot,
    stage_plots ( id, nombre )
  )
`;

/**
 * ¿La fila de Backline es un ensayo agregado manualmente (no concierto)?
 * Conciertos siempre van; ensayos solo vía `backline_incluido`.
 * @param {{ id_tipo_evento?: number|string|null }} evt
 */
export function isFimbaBacklineEnsayoRow(evt) {
  return Number(evt?.id_tipo_evento) !== ID_TIPO_CONCIERTO;
}

/**
 * Filas de la planilla Backline: conciertos (tipo 1) siempre + eventos con
 * `backline_incluido` (ensayos agregados a mano). Soft-delete excluido.
 * @param {number|string} edicionId
 */
export async function listFimbaBacklineConcerts(edicionId) {
  if (edicionId == null || edicionId === "") {
    return { events: [], error: new Error("id de edición requerido") };
  }
  const { edicion, error: eEd } = await getFimbaEdicionById(edicionId);
  if (eEd) return { events: [], error: eEd };
  const idGira = edicion?.id_gira;
  if (idGira == null || idGira === "") {
    return { events: [], error: new Error("La edición no tiene gira enlazada") };
  }

  const { data, error } = await supabase
    .from("eventos")
    .select(FIMBA_BACKLINE_EVENT_SELECT)
    .eq("id_gira", idGira)
    .or(`id_tipo_evento.eq.${ID_TIPO_CONCIERTO},backline_incluido.eq.true`)
    .or("is_deleted.is.null,is_deleted.eq.false")
    .order("fecha", { ascending: true })
    .order("hora_inicio", { ascending: true });

  if (error) return { events: [], error };
  return { events: data || [], edicion, error: null };
}

/**
 * Ensayos de la gira (categoría Ensayos) aún no incluidos en Backline.
 * @param {number|string} edicionId
 */
export async function listFimbaBacklineEnsayosDisponibles(edicionId) {
  if (edicionId == null || edicionId === "") {
    return { events: [], error: new Error("id de edición requerido") };
  }
  const { edicion, error: eEd } = await getFimbaEdicionById(edicionId);
  if (eEd) return { events: [], error: eEd };
  const idGira = edicion?.id_gira;
  if (idGira == null || idGira === "") {
    return { events: [], error: new Error("La edición no tiene gira enlazada") };
  }

  const { data, error } = await supabase
    .from("eventos")
    .select(
      FIMBA_BACKLINE_EVENT_SELECT.replace(
        "tipos_evento (",
        "tipos_evento!inner (",
      ),
    )
    .eq("id_gira", idGira)
    .eq("tipos_evento.id_categoria", OFRN_CATEGORIA_ENSAYOS_ID)
    .eq("backline_incluido", false)
    .neq("id_tipo_evento", ID_TIPO_CONCIERTO)
    .or("is_deleted.is.null,is_deleted.eq.false")
    .order("fecha", { ascending: true })
    .order("hora_inicio", { ascending: true });

  if (error) return { events: [], error };
  // Defensa: solo categoría Ensayos (por si el filtro join no excluye nulls)
  const events = (data || []).filter((ev) => {
    const cat = Number(
      ev?.tipos_evento?.id_categoria ??
        ev?.tipos_evento?.categorias_tipos_eventos?.id,
    );
    return cat === OFRN_CATEGORIA_ENSAYOS_ID;
  });
  return { events, edicion, error: null };
}

/**
 * Marca / desmarca ensayos en la planilla Backline (`backline_incluido`).
 * No borra el evento de agenda.
 * @param {Array<number|string>} eventoIds
 * @param {boolean} incluido
 */
export async function setEventosBacklineIncluido(eventoIds, incluido) {
  const ids = (eventoIds || [])
    .map((id) => Number(id))
    .filter((n) => Number.isFinite(n));
  if (ids.length === 0) {
    return { events: [], error: new Error("ids de evento requeridos") };
  }
  const { data, error } = await supabase
    .from("eventos")
    .update({
      backline_incluido: !!incluido,
      updated_at: new Date().toISOString(),
    })
    .in("id", ids)
    .select("id, backline_incluido");
  if (error) return { events: [], error };
  return { events: data || [], error: null };
}

/**
 * Patch campos Backline de un evento (concierto o ensayo incluido).
 * @param {number|string} eventoId
 * @param {{
 *   backline_descripcion?: string|null,
 *   backline_monto?: number|string|null,
 *   planta_escenario_url?: string|null,
 *   planta_escenario_nombre?: string|null,
 *   backline_estado?: string|null,
 *   backline_incluido?: boolean,
 * }} patch
 */
export async function updateEventoBackline(eventoId, patch = {}) {
  if (eventoId == null || eventoId === "") {
    return { evento: null, error: new Error("id de evento requerido") };
  }
  const body = { updated_at: new Date().toISOString() };
  if (patch.backline_descripcion !== undefined) {
    // HTML rich-text (FimbaEventDetalleEditor); vacío visual → null
    const raw =
      patch.backline_descripcion == null
        ? ""
        : String(patch.backline_descripcion);
    const plain = raw
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/<\/(p|div|li|h[1-6])>/gi, " ")
      .replace(/<[^>]*>?/gm, "")
      .replace(/\s+/g, " ")
      .trim();
    body.backline_descripcion = plain ? raw : null;
  }
  if (patch.backline_monto !== undefined) {
    body.backline_monto = parseFimbaMonto(patch.backline_monto);
  }
  if (patch.planta_escenario_url !== undefined) {
    const raw = String(patch.planta_escenario_url ?? "").trim();
    body.planta_escenario_url = raw || null;
    // Si se limpia la URL y no mandan nombre, limpiar nombre también.
    if (!raw && patch.planta_escenario_nombre === undefined) {
      body.planta_escenario_nombre = null;
    }
  }
  if (patch.planta_escenario_nombre !== undefined) {
    const n = String(patch.planta_escenario_nombre ?? "").trim();
    body.planta_escenario_nombre = n || null;
  }
  if (patch.backline_estado !== undefined) {
    body.backline_estado = canonicalizeFimbaBacklineEstado(patch.backline_estado);
  }
  if (patch.backline_incluido !== undefined) {
    body.backline_incluido = !!patch.backline_incluido;
  }
  if (Object.keys(body).length <= 1) {
    return { evento: null, error: new Error("Sin cambios") };
  }
  const { data, error } = await supabase
    .from("eventos")
    .update(body)
    .eq("id", Number(eventoId))
    .select(
      "id, backline_descripcion, backline_monto, planta_escenario_url, planta_escenario_nombre, backline_estado, backline_incluido",
    )
    .single();
  if (error) return { evento: null, error };
  return { evento: data, error: null };
}

export async function upsertFimbaVenueInfo(edicionId, idLocacion, patch) {
  if (edicionId == null || edicionId === "" || idLocacion == null || idLocacion === "") {
    return { venueInfo: null, error: new Error("edición y locación requeridas") };
  }
  const row = {
    id_edicion: Number(edicionId),
    id_locacion: Number(idLocacion),
    referente_nombre: patch.referente_nombre?.trim() || null,
    referente_telefono: patch.referente_telefono?.trim() || null,
    rider_disponible: patch.rider_disponible?.trim() || null,
    sillas_disponibles: patch.sillas_disponibles?.trim() || null,
    agua: patch.agua?.trim() || null,
    observaciones: patch.observaciones?.trim() || null,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase
    .from("fimba_venue_info")
    .upsert(row, { onConflict: "id_edicion,id_locacion" })
    .select(FIMBA_VENUE_INFO_SELECT)
    .single();
  return { venueInfo: data, error };
}

/**
 * Actualiza nombre/dirección/aforo de locación (catálogo compartido).
 * @param {number|string} idLocacion
 * @param {{ nombre?: string, direccion?: string, capacidad?: number|string|null }} patch
 */
export async function updateLocacionBasics(idLocacion, patch) {
  if (idLocacion == null || idLocacion === "") {
    return { locacion: null, error: new Error("id de locación requerido") };
  }
  const payload = {};
  if (patch.nombre != null) {
    const nombre = String(patch.nombre).trim();
    if (!nombre) return { locacion: null, error: new Error("El nombre es obligatorio") };
    payload.nombre = nombre;
  }
  if (patch.direccion != null) {
    payload.direccion = String(patch.direccion).trim() || null;
  }
  if (patch.capacidad !== undefined) {
    const raw = patch.capacidad;
    if (raw == null || String(raw).trim() === "") {
      payload.capacidad = null;
    } else {
      const n = Number(raw);
      if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) {
        return { locacion: null, error: new Error("El aforo debe ser un entero ≥ 0") };
      }
      payload.capacidad = n;
    }
  }
  if (Object.keys(payload).length === 0) {
    return { locacion: null, error: new Error("Sin cambios") };
  }
  const { data, error } = await supabase
    .from("locaciones")
    .update(payload)
    .eq("id", idLocacion)
    .select("id, nombre, direccion, capacidad")
    .single();
  return { locacion: data, error };
}

/**
 * Resuelve edición por token de consulta general (/fimba/c/:token).
 * @param {string} token
 */
export async function getFimbaEdicionByTokenConsulta(token) {
  const t = String(token || "").trim();
  if (!t) {
    return { edicion: null, error: new Error("token requerido") };
  }
  const { data, error } = await supabase
    .from("fimba_ediciones")
    .select(EDICION_SELECT)
    .eq("token_consulta", t)
    .maybeSingle();
  if (error) return { edicion: null, error };
  return { edicion: data, error: null };
}

const AGENDA_CONSULTA_SELECT =
  "id, id_edicion, token, propuestas, grupos, locaciones, include_tutti, origen, created_at, updated_at";

function agendaConsultaFingerprintEq(row, filters) {
  const a = filtersFromAgendaConsultaRow(row);
  return (
    a.propuestaIds.join(",") === filters.propuestaIds.join(",") &&
    a.grupoIds.join(",") === filters.grupoIds.join(",") &&
    a.locacionIds.join(",") === filters.locacionIds.join(",") &&
    a.includeTutti === filters.includeTutti &&
    a.origen === filters.origen
  );
}

/**
 * Token único de consulta de agenda (`fimba_agenda_consultas`).
 * @param {string} token
 */
export async function getFimbaAgendaConsultaByToken(token) {
  const t = String(token || "").trim();
  if (!t) {
    return { consulta: null, error: new Error("token requerido") };
  }
  const { data, error } = await supabase
    .from("fimba_agenda_consultas")
    .select(AGENDA_CONSULTA_SELECT)
    .eq("token", t)
    .maybeSingle();
  if (error) return { consulta: null, error };
  return { consulta: data, error: null };
}

/**
 * Reusa el token de la misma huella de filtros, o crea uno nuevo.
 * @param {number|string} edicionId
 * @param {{
 *   propuestaIds?: unknown,
 *   grupoIds?: unknown,
 *   locacionIds?: unknown,
 *   includeTutti?: boolean,
 *   origen?: string|null,
 * }} filters
 */
export async function upsertFimbaAgendaConsulta(edicionId, filters = {}) {
  const id = Number(edicionId);
  if (!Number.isFinite(id)) {
    return { consulta: null, error: new Error("id de edición requerido") };
  }
  const canon = canonicalizeAgendaConsultaFilters(filters);
  const { data: existingRows, error: findErr } = await supabase
    .from("fimba_agenda_consultas")
    .select(AGENDA_CONSULTA_SELECT)
    .eq("id_edicion", id)
    .eq("include_tutti", canon.includeTutti)
    .eq("origen", canon.origen);
  if (findErr) return { consulta: null, error: findErr };
  const match = (existingRows || []).find((row) =>
    agendaConsultaFingerprintEq(row, canon),
  );
  if (match) return { consulta: match, error: null };

  const { data, error } = await supabase
    .from("fimba_agenda_consultas")
    .insert({
      id_edicion: id,
      propuestas: canon.propuestaIds,
      grupos: canon.grupoIds,
      locaciones: canon.locacionIds,
      include_tutti: canon.includeTutti,
      origen: canon.origen,
    })
    .select(AGENDA_CONSULTA_SELECT)
    .single();
  if (error?.code === "23505") {
    const { data: retryRows, error: retryErr } = await supabase
      .from("fimba_agenda_consultas")
      .select(AGENDA_CONSULTA_SELECT)
      .eq("id_edicion", id)
      .eq("include_tutti", canon.includeTutti)
      .eq("origen", canon.origen);
    if (retryErr) return { consulta: null, error: retryErr };
    const retry = (retryRows || []).find((row) =>
      agendaConsultaFingerprintEq(row, canon),
    );
    if (retry) return { consulta: retry, error: null };
  }
  if (error) return { consulta: null, error };
  return { consulta: data, error: null };
}

/**
 * Regenera `token_consulta` de la edición (invalida el enlace anterior).
 * @param {number|string} edicionId
 */
export async function regenerateFimbaEdicionTokenConsulta(edicionId) {
  if (edicionId == null || edicionId === "") {
    return { edicion: null, error: new Error("id de edición requerido") };
  }
  const token_consulta = crypto.randomUUID();
  const { data, error } = await supabase
    .from("fimba_ediciones")
    .update({ token_consulta, updated_at: new Date().toISOString() })
    .eq("id", edicionId)
    .select(EDICION_SELECT)
    .single();
  return { edicion: data, error };
}

/**
 * @param {{ nombre: string, anio: number, id_gira: number|string }} payload
 */
export async function createFimbaEdicion(payload) {
  const row = {
    nombre: String(payload.nombre || "").trim(),
    anio: Number(payload.anio),
    id_gira: Number(payload.id_gira),
  };
  const { data, error } = await supabase
    .from("fimba_ediciones")
    .insert(row)
    .select(EDICION_SELECT)
    .single();
  return { edicion: data, error };
}

// ---------------------------------------------------------------------------
// Propuestas (Artistas)
// ---------------------------------------------------------------------------

const STAY_EVENT_EMBED =
  "id, fecha, hora_inicio, id_tipo_evento, descripcion, id_locacion, locaciones ( id, nombre )";

export { STAY_EVENT_EMBED as FIMBA_STAY_EVENT_EMBED };

const PROPUESTA_SELECT =
  `id, id_edicion, nombre, color, orden, cantidad_planificada, plazas_extra_materiales, checkin_at, checkout_at, id_evento_checkin, id_evento_checkout, checkin_early, checkout_late, requiere_hotel, requiere_comidas, id_hotel, observaciones_logisticas, rider, token_consulta, token_edicion, estado, created_at, updated_at, hoteles:id_hotel ( id, nombre ), evento_checkin:id_evento_checkin ( ${STAY_EVENT_EMBED} ), evento_checkout:id_evento_checkout ( ${STAY_EVENT_EMBED} )`;

/**
 * Find-or-create evento Check-in (22 @ 14:00) / Check-Out (23 @ 10:00) en la gira.
 * No reutiliza eventos OFRN a otras horas (p.ej. 12:00 de logística).
 * @param {number|string} idGira
 * @param {'checkin'|'checkout'} kind
 * @param {string} fechaIso YYYY-MM-DD
 * @returns {Promise<{ id: number|null, fecha: string|null, error: Error|null }>}
 */
export async function ensureFimbaStayEvent(idGira, kind, fechaIso) {
  const giraId = Number(idGira);
  const fecha = isoDateOrNull(fechaIso);
  if (!Number.isFinite(giraId) || !fecha) {
    return { id: null, fecha: null, error: null };
  }
  const isOut = kind === "checkout";
  const tipoId = isOut ? FIMBA_TIPO_EVENTO_CHECKOUT : FIMBA_TIPO_EVENTO_CHECKIN;
  const hora = isOut ? FIMBA_HORA_CHECKOUT : FIMBA_HORA_CHECKIN;
  const descripcion = isOut ? "Check-Out" : "Check-In";

  const { data: existing, error: findErr } = await supabase
    .from("eventos")
    .select("id, fecha")
    .eq("id_gira", giraId)
    .eq("id_tipo_evento", tipoId)
    .eq("fecha", fecha)
    .eq("hora_inicio", hora)
    .or("is_deleted.eq.false,is_deleted.is.null")
    .order("id", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (findErr) return { id: null, fecha: null, error: findErr };
  if (existing?.id != null) {
    return { id: Number(existing.id), fecha, error: null };
  }

  const { data: created, error: insErr } = await supabase
    .from("eventos")
    .insert({
      id_gira: giraId,
      id_tipo_evento: tipoId,
      fecha,
      hora_inicio: hora,
      hora_fin: null,
      descripcion,
      visible_agenda: true,
      audiencia_ofrn: "none",
      is_deleted: false,
    })
    .select("id, fecha")
    .single();
  if (insErr) return { id: null, fecha: null, error: insErr };
  return { id: Number(created.id), fecha, error: null };
}

/**
 * Lista eventos Check-in (22) o Check-Out (23) de la gira (no borrados).
 * @param {number|string} idGira
 * @param {'checkin'|'checkout'} kind
 */
export async function listFimbaStayEvents(idGira, kind) {
  const giraId = Number(idGira);
  if (!Number.isFinite(giraId)) return { eventos: [], error: null };
  const isOut = kind === "checkout";
  const tipoId = isOut ? FIMBA_TIPO_EVENTO_CHECKOUT : FIMBA_TIPO_EVENTO_CHECKIN;
  const { data, error } = await supabase
    .from("eventos")
    .select(STAY_EVENT_EMBED)
    .eq("id_gira", giraId)
    .eq("id_tipo_evento", tipoId)
    .or("is_deleted.eq.false,is_deleted.is.null")
    .order("fecha", { ascending: true })
    .order("hora_inicio", { ascending: true })
    .order("id", { ascending: true });
  if (error) return { eventos: [], error };
  return { eventos: data || [], error: null };
}

/**
 * Crea evento de estadía (tipo 22/23) con fecha/hora/locación opcionales.
 * Opcionalmente taguea la propuesta en `eventos_fimba_propuestas`.
 * @param {{
 *   id_gira: number|string,
 *   kind: 'checkin'|'checkout',
 *   fecha: string,
 *   hora_inicio?: string,
 *   id_locacion?: number|string|null,
 *   descripcion?: string,
 *   id_propuesta?: number|string|null,
 * }} payload
 */
export async function createFimbaStayEvent(payload) {
  const giraId = Number(payload?.id_gira);
  const fecha = isoDateOrNull(payload?.fecha);
  if (!Number.isFinite(giraId) || !fecha) {
    return {
      evento: null,
      error: new Error("id_gira y fecha son requeridos"),
    };
  }
  const isOut = payload.kind === "checkout";
  const tipoId = isOut ? FIMBA_TIPO_EVENTO_CHECKOUT : FIMBA_TIPO_EVENTO_CHECKIN;
  const defaultHora = isOut ? FIMBA_HORA_CHECKOUT : FIMBA_HORA_CHECKIN;
  let hora = String(payload.hora_inicio || defaultHora).trim();
  if (/^\d{2}:\d{2}$/.test(hora)) hora = `${hora}:00`;
  if (!/^\d{2}:\d{2}(:\d{2})?$/.test(hora)) hora = `${defaultHora}:00`;
  const descripcion =
    String(payload.descripcion || "").trim() ||
    (isOut ? "Check-Out" : "Check-In");
  const idLoc =
    payload.id_locacion != null && payload.id_locacion !== ""
      ? Number(payload.id_locacion)
      : null;

  const { data: created, error: insErr } = await supabase
    .from("eventos")
    .insert({
      id_gira: giraId,
      id_tipo_evento: tipoId,
      fecha,
      hora_inicio: hora.length === 5 ? `${hora}:00` : hora,
      hora_fin: null,
      descripcion,
      id_locacion: Number.isFinite(idLoc) ? idLoc : null,
      visible_agenda: true,
      audiencia_ofrn: "none",
      is_deleted: false,
    })
    .select(STAY_EVENT_EMBED)
    .single();
  if (insErr) return { evento: null, error: insErr };

  const propId =
    payload.id_propuesta != null && payload.id_propuesta !== ""
      ? Number(payload.id_propuesta)
      : null;
  if (Number.isFinite(propId) && created?.id != null) {
    const { error: tagErr } = await supabase
      .from("eventos_fimba_propuestas")
      .insert({ id_evento: created.id, id_propuesta: propId });
    if (tagErr) {
      // Evento ya creado; el tag es opcional — no fallar el alta.
      console.warn("createFimbaStayEvent: tag propuesta", tagErr);
    }
  }
  return { evento: created, error: null };
}

async function fetchStayEventById(eventId) {
  const id = Number(eventId);
  if (!Number.isFinite(id)) return { evento: null, error: null };
  const { data, error } = await supabase
    .from("eventos")
    .select(STAY_EVENT_EMBED)
    .eq("id", id)
    .maybeSingle();
  if (error) return { evento: null, error };
  return { evento: data, error: null };
}

async function resolveGiraIdForEdicion(edicionId) {
  const id = Number(edicionId);
  if (!Number.isFinite(id)) return { id_gira: null, error: null };
  const { data, error } = await supabase
    .from("fimba_ediciones")
    .select("id_gira")
    .eq("id", id)
    .maybeSingle();
  if (error) return { id_gira: null, error };
  return {
    id_gira: data?.id_gira != null ? Number(data.id_gira) : null,
    error: null,
  };
}

async function resolveGiraIdForPropuesta(propuestaId) {
  const id = Number(propuestaId);
  if (!Number.isFinite(id)) return { id_gira: null, id_edicion: null, error: null };
  const { data, error } = await supabase
    .from("fimba_propuestas")
    .select("id_edicion, fimba_ediciones:id_edicion ( id_gira )")
    .eq("id", id)
    .maybeSingle();
  if (error) return { id_gira: null, id_edicion: null, error };
  const idGira = data?.fimba_ediciones?.id_gira;
  return {
    id_gira: idGira != null ? Number(idGira) : null,
    id_edicion: data?.id_edicion != null ? Number(data.id_edicion) : null,
    error: null,
  };
}

/**
 * Resuelve FKs de estadía + fechas espejo a partir de fechas UI.
 * @returns {Promise<{ patch: object, error: Error|null }>}
 */
async function stayPatchFromDates(idGira, checkinAt, checkoutAt, { touchIn, touchOut }) {
  const patch = {};
  if (touchIn) {
    const fecha = isoDateOrNull(checkinAt);
    if (!fecha) {
      patch.checkin_at = null;
      patch.id_evento_checkin = null;
    } else {
      const ens = await ensureFimbaStayEvent(idGira, "checkin", fecha);
      if (ens.error) return { patch: {}, error: ens.error };
      patch.checkin_at = fecha;
      patch.id_evento_checkin = ens.id;
    }
  }
  if (touchOut) {
    const fecha = isoDateOrNull(checkoutAt);
    if (!fecha) {
      patch.checkout_at = null;
      patch.id_evento_checkout = null;
    } else {
      const ens = await ensureFimbaStayEvent(idGira, "checkout", fecha);
      if (ens.error) return { patch: {}, error: ens.error };
      patch.checkout_at = fecha;
      patch.id_evento_checkout = ens.id;
    }
  }
  return { patch, error: null };
}

/** Fechas efectivas del artista (propuesta) para normalizar overrides de persona. */
async function resolvePropuestaStayDates(propuestaId) {
  const id = Number(propuestaId);
  if (!Number.isFinite(id)) {
    return { checkin_at: null, checkout_at: null, error: null };
  }
  const { data, error } = await supabase
    .from("fimba_propuestas")
    .select(
      `checkin_at, checkout_at, id_evento_checkin, id_evento_checkout, evento_checkin:id_evento_checkin ( ${STAY_EVENT_EMBED} ), evento_checkout:id_evento_checkout ( ${STAY_EVENT_EMBED} )`,
    )
    .eq("id", id)
    .maybeSingle();
  if (error) return { checkin_at: null, checkout_at: null, error };
  return {
    checkin_at: stayDateFromEventOrMirror(data, "checkin"),
    checkout_at: stayDateFromEventOrMirror(data, "checkout"),
    error: null,
  };
}

async function resolvePropuestaStayEventIds(propuestaId) {
  const id = Number(propuestaId);
  if (!Number.isFinite(id)) {
    return {
      id_evento_checkin: null,
      id_evento_checkout: null,
      error: null,
    };
  }
  const { data, error } = await supabase
    .from("fimba_propuestas")
    .select("id_evento_checkin, id_evento_checkout")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    return {
      id_evento_checkin: null,
      id_evento_checkout: null,
      error,
    };
  }
  return {
    id_evento_checkin:
      data?.id_evento_checkin != null ? Number(data.id_evento_checkin) : null,
    id_evento_checkout:
      data?.id_evento_checkout != null ? Number(data.id_evento_checkout) : null,
    error: null,
  };
}

/**
 * Patch espejo + FK desde un evento existente (o null = heredar / limpiar).
 * @param {number|string|null|undefined} eventId
 * @param {'checkin'|'checkout'} kind
 * @param {number|null} groupEventId
 */
async function stayPatchFromEventId(eventId, kind, groupEventId) {
  const isOut = kind === "checkout";
  const fk = isOut ? "id_evento_checkout" : "id_evento_checkin";
  const mirror = isOut ? "checkout_at" : "checkin_at";
  if (eventId == null || eventId === "") {
    return { patch: { [fk]: null, [mirror]: null }, error: null };
  }
  const { evento, error } = await fetchStayEventById(eventId);
  if (error) return { patch: {}, error };
  if (!evento) {
    return {
      patch: {},
      error: new Error("Evento de estadía no encontrado"),
    };
  }
  const normalized = normalizeParticipanteStayEventAgainstGroup(
    evento.id,
    evento.fecha,
    groupEventId,
  );
  if (normalized.id == null) {
    return { patch: { [fk]: null, [mirror]: null }, error: null };
  }
  return {
    patch: {
      [fk]: normalized.id,
      [mirror]: normalized.fecha,
    },
    error: null,
  };
}

/**
 * Lista artistas (propuestas) de una edición.
 * **Display order:** alfabético por `nombre` (`es`, sensitivity base → id).
 * Columna `orden` se sigue asignando al crear (metadata / legado); **no** ordena planillas ni pickers.
 */
export async function listFimbaPropuestas(edicionId) {
  if (edicionId == null || edicionId === "") {
    return { propuestas: [], error: null };
  }
  const { data, error } = await supabase
    .from("fimba_propuestas")
    .select(PROPUESTA_SELECT)
    .eq("id_edicion", edicionId)
    .order("nombre", { ascending: true });
  if (error) return { propuestas: [], error };
  return { propuestas: sortFimbaPropuestasByNombre(data || []), error: null };
}

export async function getFimbaPropuestaById(propuestaId) {
  if (propuestaId == null || propuestaId === "") {
    return { propuesta: null, error: new Error("id de propuesta requerido") };
  }
  const { data, error } = await supabase
    .from("fimba_propuestas")
    .select(PROPUESTA_SELECT)
    .eq("id", propuestaId)
    .maybeSingle();
  if (error) return { propuesta: null, error };
  return { propuesta: data, error: null };
}

export async function getFimbaPropuestaByToken(token, kind = "consulta") {
  const t = String(token || "").trim();
  if (!t) return { propuesta: null, error: null };
  const col = kind === "edicion" ? "token_edicion" : "token_consulta";
  const { data, error } = await supabase
    .from("fimba_propuestas")
    .select(
      `${PROPUESTA_SELECT}, fimba_ediciones:id_edicion ( id, nombre, anio, id_gira )`,
    )
    .eq(col, t)
    .maybeSingle();
  if (error) return { propuesta: null, error };
  return { propuesta: data, error: null };
}

/**
 * @param {object} payload
 */
export async function createFimbaPropuesta(payload) {
  const maxOrden = await fetchNextPropuestaOrden(payload.id_edicion);
  const { id_gira: idGira, error: giraErr } = await resolveGiraIdForEdicion(
    payload.id_edicion,
  );
  if (giraErr) return { propuesta: null, error: giraErr };

  const stay = await stayPatchFromDates(
    idGira,
    payload.checkin_at,
    payload.checkout_at,
    { touchIn: true, touchOut: true },
  );
  if (stay.error) return { propuesta: null, error: stay.error };

  const row = {
    id_edicion: Number(payload.id_edicion),
    nombre: String(payload.nombre || "").trim(),
    color: payload.color || FIMBA_ARTISTA_COLORS[0],
    orden: payload.orden != null ? Number(payload.orden) : maxOrden,
    cantidad_planificada: clampPlanificada(payload.cantidad_planificada),
    plazas_extra_materiales: Math.max(0, Number(payload.plazas_extra_materiales) || 0),
    checkin_at: stay.patch.checkin_at ?? null,
    checkout_at: stay.patch.checkout_at ?? null,
    id_evento_checkin: stay.patch.id_evento_checkin ?? null,
    id_evento_checkout: stay.patch.id_evento_checkout ?? null,
    checkin_early: payload.checkin_early === true,
    checkout_late: payload.checkout_late === true,
    requiere_hotel: payload.requiere_hotel !== false,
    requiere_comidas: payload.requiere_comidas !== false,
    id_hotel:
      payload.id_hotel != null && payload.id_hotel !== ""
        ? Number(payload.id_hotel)
        : null,
    observaciones_logisticas: normalizeObservacionesLogisticas(
      payload.observaciones_logisticas,
    ),
    estado: payload.estado || "activa",
  };
  if (payload.rider !== undefined) {
    row.rider = normalizeFimbaRiderHtml(payload.rider);
  }
  const { data, error } = await supabase
    .from("fimba_propuestas")
    .insert(row)
    .select(PROPUESTA_SELECT)
    .single();
  return { propuesta: data, error };
}

export async function updateFimbaPropuesta(propuestaId, patch) {
  const row = {
    updated_at: new Date().toISOString(),
  };
  if (patch.nombre != null) row.nombre = String(patch.nombre).trim();
  if (patch.color != null) row.color = patch.color;
  if (patch.orden != null) row.orden = Number(patch.orden);
  if (patch.cantidad_planificada != null) {
    row.cantidad_planificada = clampPlanificada(patch.cantidad_planificada);
  }
  if (patch.plazas_extra_materiales != null) {
    row.plazas_extra_materiales = Math.max(0, Number(patch.plazas_extra_materiales) || 0);
  }
  if (patch.checkin_at !== undefined || patch.checkout_at !== undefined) {
    const { id_gira: idGira, error: giraErr } =
      await resolveGiraIdForPropuesta(propuestaId);
    if (giraErr) return { propuesta: null, error: giraErr };
    const stay = await stayPatchFromDates(
      idGira,
      patch.checkin_at,
      patch.checkout_at,
      {
        touchIn: patch.checkin_at !== undefined,
        touchOut: patch.checkout_at !== undefined,
      },
    );
    if (stay.error) return { propuesta: null, error: stay.error };
    Object.assign(row, stay.patch);
  }
  // Preferencia: FK explícita (picker) con espejo de fecha del evento.
  // No normaliza contra "grupo" (la propuesta ES el grupo).
  const touchEventIn =
    patch.id_evento_checkin !== undefined && patch.checkin_at === undefined;
  const touchEventOut =
    patch.id_evento_checkout !== undefined && patch.checkout_at === undefined;
  if (touchEventIn) {
    const linked = await stayPatchFromEventId(
      patch.id_evento_checkin,
      "checkin",
      null,
    );
    if (linked.error) return { propuesta: null, error: linked.error };
    Object.assign(row, linked.patch);
  }
  if (touchEventOut) {
    const linked = await stayPatchFromEventId(
      patch.id_evento_checkout,
      "checkout",
      null,
    );
    if (linked.error) return { propuesta: null, error: linked.error };
    Object.assign(row, linked.patch);
  }
  if (patch.checkin_early !== undefined) row.checkin_early = patch.checkin_early === true;
  if (patch.checkout_late !== undefined) row.checkout_late = patch.checkout_late === true;
  if (patch.requiere_hotel !== undefined) row.requiere_hotel = patch.requiere_hotel !== false;
  if (patch.requiere_comidas !== undefined) {
    row.requiere_comidas = patch.requiere_comidas !== false;
  }
  if (patch.id_hotel !== undefined) {
    row.id_hotel =
      patch.id_hotel != null && patch.id_hotel !== ""
        ? Number(patch.id_hotel)
        : null;
  }
  if (patch.observaciones_logisticas !== undefined) {
    row.observaciones_logisticas = normalizeObservacionesLogisticas(
      patch.observaciones_logisticas,
    );
  }
  if (patch.rider !== undefined) {
    row.rider = normalizeFimbaRiderHtml(patch.rider);
  }
  if (patch.estado != null) row.estado = patch.estado;

  const { data, error } = await supabase
    .from("fimba_propuestas")
    .update(row)
    .eq("id", propuestaId)
    .select(PROPUESTA_SELECT)
    .single();
  return { propuesta: data, error };
}

/** Máx. bytes cliente + bucket `fimba-riders`. */
export const FIMBA_RIDER_IMAGE_MAX_BYTES = 8 * 1024 * 1024;

const FIMBA_RIDER_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
]);

function riderImageExt(mime, fileName) {
  const fromMime = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/webp": "webp",
  }[String(mime || "").toLowerCase()];
  if (fromMime) return fromMime;
  const m = String(fileName || "")
    .toLowerCase()
    .match(/\.(jpe?g|png|gif|webp)$/);
  if (!m) return "jpg";
  return m[1] === "jpeg" ? "jpg" : m[1];
}

/**
 * Redimensiona a ≤1600px de ancho y JPEG 82% (sin deps). GIF se deja intacto.
 * @param {Blob|File} file
 * @returns {Promise<File>}
 */
function compressFimbaRiderImage(file) {
  return new Promise((resolve, reject) => {
    const mime = String(file.type || "").toLowerCase();
    if (mime === "image/gif") {
      resolve(file instanceof File ? file : new File([file], "imagen.gif", { type: "image/gif" }));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () =>
      reject(reader.error || new Error("No se pudo leer la imagen"));
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const MAX_W = 1600;
        const scale = img.width > MAX_W ? MAX_W / img.width : 1;
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("No se pudo comprimir la imagen"));
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("No se pudo comprimir la imagen"));
              return;
            }
            const name = String(file.name || "imagen").replace(/\.[^/.]+$/, ".jpg");
            resolve(
              new File([blob], name, {
                type: "image/jpeg",
                lastModified: Date.now(),
              }),
            );
          },
          "image/jpeg",
          0.82,
        );
      };
      img.onerror = () => reject(new Error("Imagen inválida"));
      img.src = String(reader.result || "");
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Sube una imagen de rider al bucket público `fimba-riders`.
 * Path: edicion/{id}/propuesta/{id}/{uuid}.{ext}
 * Gate de UI: canEditPropuestaMeta. URL pública durable (PDF/print).
 *
 * @param {{ edicionId: number|string, propuestaId: number|string, file: File|Blob }}
 * @returns {Promise<{ url: string|null, path: string|null, error: Error|null }>}
 */
export async function uploadFimbaRiderImage({ edicionId, propuestaId, file }) {
  if (!file || !(file instanceof Blob)) {
    return {
      url: null,
      path: null,
      error: new Error("No hay imagen para subir"),
    };
  }
  const mime = String(file.type || "").toLowerCase();
  if (mime && !mime.startsWith("image/")) {
    return {
      url: null,
      path: null,
      error: new Error("Solo se permiten imágenes (JPG, PNG, GIF o WebP)."),
    };
  }
  if (mime && mime !== "image/jpg" && !FIMBA_RIDER_IMAGE_TYPES.has(mime)) {
    return {
      url: null,
      path: null,
      error: new Error("Formato no soportado. Usá JPG, PNG, GIF o WebP."),
    };
  }
  if (file.size > FIMBA_RIDER_IMAGE_MAX_BYTES) {
    return {
      url: null,
      path: null,
      error: new Error("La imagen supera el máximo de 8 MB."),
    };
  }
  const ed = Number(edicionId);
  const pr = Number(propuestaId);
  if (!Number.isFinite(ed) || !Number.isFinite(pr) || ed <= 0 || pr <= 0) {
    return {
      url: null,
      path: null,
      error: new Error("Falta edición o artista para subir la imagen."),
    };
  }

  try {
    const compressed = await compressFimbaRiderImage(file);
    if (compressed.size > FIMBA_RIDER_IMAGE_MAX_BYTES) {
      return {
        url: null,
        path: null,
        error: new Error("La imagen comprimida sigue superando 8 MB."),
      };
    }
    const ext = riderImageExt(compressed.type, compressed.name);
    const id =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const path = `edicion/${ed}/propuesta/${pr}/${id}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from(FIMBA_RIDER_BUCKET)
      .upload(path, compressed, {
        contentType: compressed.type || "image/jpeg",
        cacheControl: "31536000",
        upsert: false,
      });
    if (uploadError) {
      return {
        url: null,
        path: null,
        error: new Error(uploadError.message || "No se pudo subir la imagen"),
      };
    }
    const { data } = supabase.storage.from(FIMBA_RIDER_BUCKET).getPublicUrl(path);
    const url = data?.publicUrl || null;
    if (!url) {
      return {
        url: null,
        path,
        error: new Error("No se obtuvo la URL pública de la imagen"),
      };
    }
    return { url, path, error: null };
  } catch (e) {
    return {
      url: null,
      path: null,
      error: e instanceof Error ? e : new Error(String(e?.message || e)),
    };
  }
}

/**
 * Regenera token_consulta y/o token_edicion (UUID generado en cliente; DB acepta cualquier uuid).
 * @param {number|string} propuestaId
 * @param {{ consulta?: boolean, edicion?: boolean }} which
 */
export async function regenerateFimbaTokens(propuestaId, which = { consulta: true, edicion: true }) {
  const row = { updated_at: new Date().toISOString() };
  if (which.consulta) row.token_consulta = crypto.randomUUID();
  if (which.edicion) row.token_edicion = crypto.randomUUID();
  const { data, error } = await supabase
    .from("fimba_propuestas")
    .update(row)
    .eq("id", propuestaId)
    .select(PROPUESTA_SELECT)
    .single();
  return { propuesta: data, error };
}

export async function deleteFimbaPropuesta(propuestaId) {
  const { error } = await supabase.from("fimba_propuestas").delete().eq("id", propuestaId);
  return { error };
}

async function fetchNextPropuestaOrden(edicionId) {
  const { data } = await supabase
    .from("fimba_propuestas")
    .select("orden")
    .eq("id_edicion", edicionId)
    .order("orden", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (Number(data?.orden) || 0) + 1;
}

function clampPlanificada(n) {
  const v = Math.round(Number(n) || 1);
  return Math.min(200, Math.max(1, v));
}

/** Texto libre; vacío → null en DB. */
function normalizeObservacionesLogisticas(value) {
  const t = String(value ?? "").trim();
  return t || null;
}

/**
 * Extrae ID de carpeta/archivo Drive desde URL o devuelve el string si parece un ID.
 * Mismo patrón que repertoireSelectionDriveService / manage-drive extractFileId.
 */
export function extractDriveFolderId(urlOrId) {
  if (urlOrId == null) return null;
  const s = String(urlOrId).trim();
  if (!s) return null;
  const match = s.match(/[-\w]{25,}/);
  return match ? match[0] : null;
}

/**
 * Normaliza carpeta de documentación: vacío → null; con ID → URL canónica de carpeta Drive.
 * Si no se puede extraer ID pero hay texto, se guarda el string limpio (enlace “Abrir en Drive” igual).
 */
export function normalizeCarpetaDocumentacion(value) {
  const t = String(value ?? "").trim();
  if (!t) return null;
  const id = extractDriveFolderId(t);
  if (id) return `https://drive.google.com/drive/folders/${id}`;
  return t;
}

/** URL lista para abrir la carpeta en el navegador (acepta URL o ID). */
export function buildDriveFolderOpenUrl(urlOrId) {
  const normalized = normalizeCarpetaDocumentacion(urlOrId);
  if (!normalized) return null;
  if (/^https?:\/\//i.test(normalized)) return normalized;
  const id = extractDriveFolderId(normalized);
  return id ? `https://drive.google.com/drive/folders/${id}` : null;
}

/**
 * Lista hijos (nivel 1) de una carpeta Drive vía edge function `manage-drive`
 * (action `list_folder_files`). Requiere secrets G_CLIENT_ID / G_CLIENT_SECRET / G_REFRESH_TOKEN
 * y que la cuenta del Archivo tenga acceso a la carpeta.
 *
 * @param {string} folderUrlOrId
 * @returns {Promise<{ files: Array<{ id, name, mimeType, webViewLink }>, error: Error|null }>}
 */
export async function listFimbaDriveFolderFiles(folderUrlOrId) {
  const folderUrl =
    normalizeCarpetaDocumentacion(folderUrlOrId) || String(folderUrlOrId || "").trim();
  if (!folderUrl) {
    return { files: [], error: new Error("No hay carpeta de documentación") };
  }
  try {
    const { data, error } = await supabase.functions.invoke("manage-drive", {
      body: { action: "list_folder_files", folderUrl },
    });
    if (error) {
      return {
        files: [],
        error: new Error(error.message || "No se pudo listar la carpeta en Drive"),
      };
    }
    if (data?.error) {
      return { files: [], error: new Error(String(data.error)) };
    }
    if (data?.success === false) {
      return {
        files: [],
        error: new Error(data?.message || data?.error || "Error al listar Drive"),
      };
    }
    const files = Array.isArray(data?.files) ? data.files : [];
    return { files, error: null };
  } catch (e) {
    return {
      files: [],
      error: e instanceof Error ? e : new Error(String(e?.message || e)),
    };
  }
}

/** Máx. bytes del archivo en cliente antes de base64 → edge `upload_file` (~límite body EF). */
export const FIMBA_DRIVE_UPLOAD_MAX_BYTES = 4 * 1024 * 1024;

const DRIVE_FOLDER_MIME = "application/vnd.google-apps.folder";

/** Tipos nativos de Google: no tienen binario `alt=media`; se exportan. */
const GOOGLE_NATIVE_EXPORT = {
  "application/vnd.google-apps.document": {
    exportMime: "application/pdf",
    ext: ".pdf",
  },
  "application/vnd.google-apps.spreadsheet": {
    exportMime:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ext: ".xlsx",
  },
  "application/vnd.google-apps.presentation": {
    exportMime:
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ext: ".pptx",
  },
  "application/vnd.google-apps.drawing": {
    exportMime: "application/pdf",
    ext: ".pdf",
  },
};

function ensureFileNameExtension(name, ext) {
  const base = String(name || "archivo").trim() || "archivo";
  if (!ext) return base;
  const lower = base.toLowerCase();
  if (lower.endsWith(ext.toLowerCase())) return base;
  return `${base}${ext}`;
}

function manageDrivePayload(data) {
  if (typeof data === "string") {
    try {
      return JSON.parse(data);
    } catch {
      return {};
    }
  }
  return data && typeof data === "object" ? data : {};
}

/**
 * Access token de la cuenta Archivo (edge `get_temp_token`) para fetch client→Drive.
 * @returns {Promise<{ accessToken: string|null, error: Error|null }>}
 */
export async function getFimbaDriveAccessToken() {
  try {
    const { data, error } = await supabase.functions.invoke("manage-drive", {
      body: { action: "get_temp_token" },
    });
    if (error) {
      return {
        accessToken: null,
        error: new Error(error.message || "No se pudo obtener token de Drive"),
      };
    }
    const payload = manageDrivePayload(data);
    if (payload?.error || payload?.success === false) {
      return {
        accessToken: null,
        error: new Error(
          String(payload.error || payload.message || "Token de Drive no disponible"),
        ),
      };
    }
    const accessToken = payload?.accessToken || null;
    if (!accessToken) {
      return {
        accessToken: null,
        error: new Error("Token de Drive vacío"),
      };
    }
    return { accessToken, error: null };
  } catch (e) {
    return {
      accessToken: null,
      error: e instanceof Error ? e : new Error(String(e?.message || e)),
    };
  }
}

/** Cache en memoria: id Drive → nombre de archivo (chips Backline planta). */
const fimbaDriveFileNameCache = new Map();

const DRIVE_URL_JUNK_SEGMENTS = new Set([
  "view",
  "edit",
  "preview",
  "open",
  "u",
  "file",
  "d",
  "folders",
  "drive",
  "document",
  "spreadsheets",
  "presentation",
]);

/**
 * Etiqueta legible sin API: query `name`/`title`, último segmento útil, o genérico.
 * @param {string|null|undefined} url
 * @returns {string}
 */
export function guessDriveLinkLabel(url) {
  const raw = String(url || "").trim();
  if (!raw) return "Planta Drive";
  try {
    const u = new URL(raw);
    // `usp` suele ser tracking; solo name/title.
    const fromQuery = u.searchParams.get("name") || u.searchParams.get("title");
    if (fromQuery && String(fromQuery).trim()) {
      try {
        return decodeURIComponent(String(fromQuery).trim());
      } catch {
        return String(fromQuery).trim();
      }
    }
    const host = u.hostname.replace(/^www\./, "").toLowerCase();
    const parts = u.pathname.split("/").filter(Boolean);
    for (let i = parts.length - 1; i >= 0; i -= 1) {
      const seg = parts[i];
      if (!seg || DRIVE_URL_JUNK_SEGMENTS.has(seg.toLowerCase())) continue;
      if (/^[-\w]{20,}$/.test(seg)) continue; // id Drive
      if (/^\d+$/.test(seg)) continue;
      try {
        return decodeURIComponent(seg.replace(/\+/g, " "));
      } catch {
        return seg;
      }
    }
    if (host === "docs.google.com") {
      if (u.pathname.includes("/spreadsheets/")) return "Hoja de cálculo";
      if (u.pathname.includes("/presentation/")) return "Presentación";
      if (u.pathname.includes("/document/")) return "Documento";
      return "Documento Google";
    }
    if (host === "drive.google.com") {
      if (u.pathname.includes("/folders/")) return "Carpeta Drive";
      return "Planta Drive";
    }
    return host || "Enlace externo";
  } catch {
    const seg = raw.split(/[/?#]/).filter(Boolean).pop();
    if (seg && !/^[-\w]{20,}$/.test(seg) && !DRIVE_URL_JUNK_SEGMENTS.has(seg)) {
      return seg;
    }
    return "Planta Drive";
  }
}

/**
 * Etiqueta del chip de planta: nombre persistido, o heurística desde URL.
 * @param {{ url?: string|null, nombre?: string|null }} opts
 * @returns {string}
 */
export function resolvePlantaEscenarioLabel({ url, nombre } = {}) {
  const n = String(nombre || "").trim();
  if (n) return n;
  return guessDriveLinkLabel(url);
}

/**
 * URL de embed/preview para iframe (archivo Drive o Docs). Carpetas → null.
 * @param {string|null|undefined} url
 * @returns {string|null}
 */
export function buildDriveFilePreviewUrl(url) {
  const raw = String(url || "").trim();
  if (!raw) return null;
  try {
    const u = new URL(raw);
    const host = u.hostname.replace(/^www\./, "").toLowerCase();

    const docsMatch = u.pathname.match(
      /\/(document|spreadsheets|presentation)\/d\/([-\w]{25,})/,
    );
    if (host === "docs.google.com" && docsMatch) {
      return `https://docs.google.com/${docsMatch[1]}/d/${docsMatch[2]}/preview`;
    }

    const fileMatch = u.pathname.match(/\/file\/d\/([-\w]{25,})/);
    if (host === "drive.google.com" && fileMatch) {
      return `https://drive.google.com/file/d/${fileMatch[1]}/preview`;
    }

    if (u.pathname.includes("/folders/")) return null;

    const idParam = u.searchParams.get("id");
    if (
      host === "drive.google.com" &&
      idParam &&
      /^[-\w]{25,}$/.test(idParam)
    ) {
      return `https://drive.google.com/file/d/${idParam}/preview`;
    }

    const id = extractDriveFolderId(raw);
    if (host === "drive.google.com" && id) {
      return `https://drive.google.com/file/d/${id}/preview`;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Nombre de archivo vía Drive API (cuenta Archivo). Cache por id.
 * @param {string|null|undefined} urlOrId
 * @returns {Promise<{ name: string|null, error: Error|null }>}
 */
export async function fetchFimbaDriveFileName(urlOrId) {
  const fileId = extractDriveFolderId(urlOrId);
  if (!fileId) {
    return { name: null, error: new Error("ID de Drive inválido") };
  }
  if (fimbaDriveFileNameCache.has(fileId)) {
    return { name: fimbaDriveFileNameCache.get(fileId), error: null };
  }
  const { accessToken, error: tokenErr } = await getFimbaDriveAccessToken();
  if (tokenErr || !accessToken) {
    return { name: null, error: tokenErr || new Error("Sin token") };
  }
  try {
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(
        fileId,
      )}?fields=name&supportsAllDrives=true`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (!res.ok) {
      return {
        name: null,
        error: new Error(`Drive respondió ${res.status} al leer el nombre`),
      };
    }
    const json = await res.json();
    const name = String(json?.name || "").trim() || null;
    if (name) fimbaDriveFileNameCache.set(fileId, name);
    return { name, error: null };
  } catch (e) {
    return {
      name: null,
      error: e instanceof Error ? e : new Error(String(e?.message || e)),
    };
  }
}

/**
 * Descarga un archivo de Drive al navegador (blob).
 * Usa `get_temp_token` + API Drive desde el cliente (mismo patrón particellas / hybrid-drive).
 * Carpetas: no aplica. Docs/Sheets nativos: export (PDF/xlsx/pptx).
 *
 * @param {{ id?: string, name?: string, mimeType?: string, webViewLink?: string }} file
 * @returns {Promise<{ blob: Blob|null, fileName: string|null, error: Error|null }>}
 */
export async function downloadFimbaDriveFile(file) {
  const mimeType = String(file?.mimeType || "");
  if (mimeType === DRIVE_FOLDER_MIME) {
    return {
      blob: null,
      fileName: null,
      error: new Error("Las carpetas no se pueden descargar; abrilas en Drive."),
    };
  }
  if (mimeType === "application/vnd.google-apps.shortcut") {
    return {
      blob: null,
      fileName: null,
      error: new Error("Los accesos directos no se descargan; abrilos en Drive."),
    };
  }

  const fileId = extractDriveFolderId(file?.id || file?.webViewLink);
  if (!fileId) {
    return {
      blob: null,
      fileName: null,
      error: new Error("ID de archivo inválido"),
    };
  }

  const { accessToken, error: tokenErr } = await getFimbaDriveAccessToken();
  if (tokenErr || !accessToken) {
    return { blob: null, fileName: null, error: tokenErr || new Error("Sin token") };
  }

  const exportSpec = GOOGLE_NATIVE_EXPORT[mimeType] || null;
  const isGoogleNative =
    mimeType.startsWith("application/vnd.google-apps.") && !exportSpec;

  if (isGoogleNative) {
    return {
      blob: null,
      fileName: null,
      error: new Error(
        "Este tipo de archivo de Google no se puede descargar desde FIMBA; abrilo en Drive.",
      ),
    };
  }

  const url = exportSpec
    ? `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(
        fileId,
      )}/export?mimeType=${encodeURIComponent(exportSpec.exportMime)}`
    : `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(
        fileId,
      )}?alt=media&supportsAllDrives=true`;

  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      if (res.status === 403 || res.status === 404) {
        return {
          blob: null,
          fileName: null,
          error: new Error(
            "Sin permiso para descargar (compartí con la cuenta del Archivo OFRN o abrí en Drive).",
          ),
        };
      }
      return {
        blob: null,
        fileName: null,
        error: new Error(`Drive respondió ${res.status} al descargar`),
      };
    }
    const blob = await res.blob();
    const baseName = String(file?.name || "archivo").trim() || "archivo";
    const fileName = exportSpec
      ? ensureFileNameExtension(baseName, exportSpec.ext)
      : baseName;
    return { blob, fileName, error: null };
  } catch (e) {
    return {
      blob: null,
      fileName: null,
      error: e instanceof Error ? e : new Error(String(e?.message || e)),
    };
  }
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error || new Error("No se pudo leer el archivo"));
    reader.readAsDataURL(file);
  });
}

/**
 * Sube un File del navegador a una carpeta Drive (edge `upload_file`).
 * Destino = carpeta actual del breadcrumb (o raíz de documentación).
 *
 * @param {string} folderUrlOrId
 * @param {File} file
 * @returns {Promise<{ fileId: string|null, webViewLink: string|null, error: Error|null }>}
 */
export async function uploadFimbaDriveFile(folderUrlOrId, file) {
  if (!file || !(file instanceof Blob)) {
    return {
      fileId: null,
      webViewLink: null,
      error: new Error("No hay archivo para subir"),
    };
  }
  if (file.size > FIMBA_DRIVE_UPLOAD_MAX_BYTES) {
    const mb = (FIMBA_DRIVE_UPLOAD_MAX_BYTES / (1024 * 1024)).toFixed(0);
    return {
      fileId: null,
      webViewLink: null,
      error: new Error(
        `El archivo supera el máximo de ${mb} MB para subida desde FIMBA. Subilo desde Drive.`,
      ),
    };
  }

  const folderUrl =
    normalizeCarpetaDocumentacion(folderUrlOrId) || String(folderUrlOrId || "").trim();
  const parentId = extractDriveFolderId(folderUrl);
  if (!parentId) {
    return {
      fileId: null,
      webViewLink: null,
      error: new Error("Carpeta de destino inválida"),
    };
  }

  try {
    const fileBase64 = await fileToBase64(file);
    const fileName = String(file.name || "archivo").trim() || "archivo";
    const mimeType = file.type || "application/octet-stream";

    const { data, error } = await supabase.functions.invoke("manage-drive", {
      body: {
        action: "upload_file",
        folderUrl,
        parentId,
        fileName,
        fileBase64,
        mimeType,
      },
    });

    if (error) {
      return {
        fileId: null,
        webViewLink: null,
        error: new Error(error.message || "No se pudo subir el archivo"),
      };
    }
    const payload = manageDrivePayload(data);
    if (payload?.error || payload?.success === false) {
      return {
        fileId: null,
        webViewLink: null,
        error: new Error(
          String(
            payload.error ||
              payload.message ||
              "Error al subir a Drive (permiso o tipo no admitido)",
          ),
        ),
      };
    }
    // La EF a veces devuelve success sin fileId si Google falló en silencio
    if (!payload?.fileId && !payload?.webViewLink) {
      return {
        fileId: null,
        webViewLink: null,
        error: new Error(
          "Drive no confirmó la subida. Verificá permisos de escritura de la cuenta Archivo.",
        ),
      };
    }
    return {
      fileId: payload.fileId || null,
      webViewLink: payload.webViewLink || null,
      error: null,
    };
  } catch (e) {
    return {
      fileId: null,
      webViewLink: null,
      error: e instanceof Error ? e : new Error(String(e?.message || e)),
    };
  }
}

/**
 * Renombra un archivo o carpeta en Drive (metadata `name`).
 * Usa `get_temp_token` + PATCH files (misma cuenta Archivo / OAuth que list/upload).
 * Requiere rol de escritor de esa cuenta sobre el ítem o la carpeta compartida.
 * Docs/Sheets nativos: solo cambia el título en Drive (no el binario).
 *
 * @param {string} fileIdOrUrl - ID o URL del archivo/carpeta
 * @param {string} newName
 * @returns {Promise<{ name: string|null, error: Error|null }>}
 */
export async function renameFimbaDriveFile(fileIdOrUrl, newName) {
  const fileId = extractDriveFolderId(fileIdOrUrl);
  if (!fileId) {
    return { name: null, error: new Error("ID de archivo inválido") };
  }
  // Drive no admite `/` en el nombre; el resto se deja (título de Docs nativos incluido).
  const name = String(newName ?? "")
    .trim()
    .replace(/\//g, "_")
    .replace(/[\u0000-\u001f]/g, "")
    .slice(0, 255);
  if (!name) {
    return { name: null, error: new Error("El nombre no puede estar vacío") };
  }

  const { accessToken, error: tokenErr } = await getFimbaDriveAccessToken();
  if (tokenErr || !accessToken) {
    return { name: null, error: tokenErr || new Error("Sin token") };
  }

  const url = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(
    fileId,
  )}?supportsAllDrives=true&fields=id,name`;

  try {
    const res = await fetch(url, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) {
      if (res.status === 403 || res.status === 404) {
        return {
          name: null,
          error: new Error(
            "Sin permiso para renombrar (la cuenta Archivo OFRN necesita acceso de editor en la carpeta compartida).",
          ),
        };
      }
      let detail = `Drive respondió ${res.status} al renombrar`;
      try {
        const errBody = await res.json();
        const msg = errBody?.error?.message;
        if (msg) detail = String(msg);
      } catch {
        /* ignore body parse */
      }
      return { name: null, error: new Error(detail) };
    }
    const data = await res.json().catch(() => ({}));
    return { name: data?.name || name, error: null };
  } catch (e) {
    return {
      name: null,
      error: e instanceof Error ? e : new Error(String(e?.message || e)),
    };
  }
}

// ---------------------------------------------------------------------------
// Participantes
// ---------------------------------------------------------------------------

const PARTICIPANTE_SELECT =
  `id, id_propuesta, nombre, apellido, documento, genero, tipo_alimentacion, nota_alimentacion, activo, id_integrante, checkin_at, checkout_at, id_evento_checkin, id_evento_checkout, created_at, updated_at, evento_checkin:id_evento_checkin ( ${STAY_EVENT_EMBED} ), evento_checkout:id_evento_checkout ( ${STAY_EVENT_EMBED} )`;

/** Acepta aliases OFRN (M/F/-) y textos (hombre/mujer) → valor canónico DB. */
function normalizeGenero(value) {
  return canonicalizeFimbaGenero(value);
}

export async function listFimbaParticipantes(propuestaId) {
  if (propuestaId == null || propuestaId === "") {
    return { participantes: [], error: null };
  }
  const { data, error } = await supabase
    .from("fimba_participantes")
    .select(PARTICIPANTE_SELECT)
    .eq("id_propuesta", propuestaId)
    .order("apellido", { ascending: true })
    .order("nombre", { ascending: true });
  if (error) return { participantes: [], error };
  return { participantes: data || [], error: null };
}

/**
 * @param {object} payload
 */
export async function createFimbaParticipante(payload) {
  const { id_gira: idGira, error: giraErr } = await resolveGiraIdForPropuesta(
    payload.id_propuesta,
  );
  if (giraErr) return { participante: null, error: giraErr };

  const groupStay = await resolvePropuestaStayDates(payload.id_propuesta);
  if (groupStay.error) return { participante: null, error: groupStay.error };

  /** Prefer explicit event FKs (picker); else date → ensure. */
  const hasEventIn = payload.id_evento_checkin !== undefined;
  const hasEventOut = payload.id_evento_checkout !== undefined;

  const row = {
    id_propuesta: Number(payload.id_propuesta),
    nombre: String(payload.nombre || "").trim(),
    apellido: String(payload.apellido || "").trim(),
    documento: normalizeDoc(payload.documento),
    genero: normalizeGenero(payload.genero),
    tipo_alimentacion: payload.tipo_alimentacion || "regular",
    nota_alimentacion: payload.nota_alimentacion
      ? String(payload.nota_alimentacion).trim()
      : null,
    activo: payload.activo !== false,
    id_integrante: payload.id_integrante != null ? Number(payload.id_integrante) : null,
    checkin_at: null,
    checkout_at: null,
    id_evento_checkin: null,
    id_evento_checkout: null,
  };

  if (hasEventIn || hasEventOut) {
    const groupIds = await resolvePropuestaStayEventIds(payload.id_propuesta);
    if (groupIds.error) return { participante: null, error: groupIds.error };
    if (hasEventIn) {
      const linked = await stayPatchFromEventId(
        payload.id_evento_checkin,
        "checkin",
        groupIds.id_evento_checkin,
      );
      if (linked.error) return { participante: null, error: linked.error };
      Object.assign(row, linked.patch);
    }
    if (hasEventOut) {
      const linked = await stayPatchFromEventId(
        payload.id_evento_checkout,
        "checkout",
        groupIds.id_evento_checkout,
      );
      if (linked.error) return { participante: null, error: linked.error };
      Object.assign(row, linked.patch);
    }
  } else {
    const normalized = normalizeParticipanteStayAgainstGroup(
      payload.checkin_at,
      payload.checkout_at,
      groupStay.checkin_at,
      groupStay.checkout_at,
    );
    const stay = await stayPatchFromDates(
      idGira,
      normalized.checkin_at,
      normalized.checkout_at,
      { touchIn: true, touchOut: true },
    );
    if (stay.error) return { participante: null, error: stay.error };
    Object.assign(row, stay.patch);
  }

  const { data, error } = await supabase
    .from("fimba_participantes")
    .insert(row)
    .select(PARTICIPANTE_SELECT)
    .single();
  return { participante: data, error };
}

export async function updateFimbaParticipante(participanteId, patch) {
  const row = { updated_at: new Date().toISOString() };
  if (patch.nombre != null) row.nombre = String(patch.nombre).trim();
  if (patch.apellido != null) row.apellido = String(patch.apellido).trim();
  if (patch.documento !== undefined) row.documento = normalizeDoc(patch.documento);
  if (patch.genero != null) row.genero = normalizeGenero(patch.genero);
  if (patch.tipo_alimentacion != null) row.tipo_alimentacion = patch.tipo_alimentacion;
  if (patch.nota_alimentacion !== undefined) {
    row.nota_alimentacion = patch.nota_alimentacion
      ? String(patch.nota_alimentacion).trim()
      : null;
  }
  if (patch.activo != null) row.activo = Boolean(patch.activo);
  if (patch.id_integrante !== undefined) {
    row.id_integrante =
      patch.id_integrante != null && patch.id_integrante !== ""
        ? Number(patch.id_integrante)
        : null;
  }

  const touchEventIn = patch.id_evento_checkin !== undefined;
  const touchEventOut = patch.id_evento_checkout !== undefined;
  const touchDateIn = patch.checkin_at !== undefined && !touchEventIn;
  const touchDateOut = patch.checkout_at !== undefined && !touchEventOut;

  if (touchEventIn || touchEventOut || touchDateIn || touchDateOut) {
    let idGira = null;
    let idPropuesta =
      patch.id_propuesta != null ? Number(patch.id_propuesta) : null;
    if (patch.id_propuesta != null) {
      const res = await resolveGiraIdForPropuesta(patch.id_propuesta);
      if (res.error) return { participante: null, error: res.error };
      idGira = res.id_gira;
    } else {
      const { data: cur, error: curErr } = await supabase
        .from("fimba_participantes")
        .select("id_propuesta")
        .eq("id", participanteId)
        .maybeSingle();
      if (curErr) return { participante: null, error: curErr };
      idPropuesta =
        cur?.id_propuesta != null ? Number(cur.id_propuesta) : null;
      const res = await resolveGiraIdForPropuesta(cur?.id_propuesta);
      if (res.error) return { participante: null, error: res.error };
      idGira = res.id_gira;
    }

    if (touchEventIn || touchEventOut) {
      const groupIds = await resolvePropuestaStayEventIds(idPropuesta);
      if (groupIds.error) return { participante: null, error: groupIds.error };
      if (touchEventIn) {
        const linked = await stayPatchFromEventId(
          patch.id_evento_checkin,
          "checkin",
          groupIds.id_evento_checkin,
        );
        if (linked.error) return { participante: null, error: linked.error };
        Object.assign(row, linked.patch);
      }
      if (touchEventOut) {
        const linked = await stayPatchFromEventId(
          patch.id_evento_checkout,
          "checkout",
          groupIds.id_evento_checkout,
        );
        if (linked.error) return { participante: null, error: linked.error };
        Object.assign(row, linked.patch);
      }
    }

    if (touchDateIn || touchDateOut) {
      const groupStay = await resolvePropuestaStayDates(idPropuesta);
      if (groupStay.error) return { participante: null, error: groupStay.error };

      let nextIn = patch.checkin_at;
      let nextOut = patch.checkout_at;
      const normalized = normalizeParticipanteStayAgainstGroup(
        touchDateIn ? patch.checkin_at : undefined,
        touchDateOut ? patch.checkout_at : undefined,
        groupStay.checkin_at,
        groupStay.checkout_at,
      );
      if (touchDateIn) nextIn = normalized.checkin_at;
      if (touchDateOut) nextOut = normalized.checkout_at;

      const stay = await stayPatchFromDates(idGira, nextIn, nextOut, {
        touchIn: touchDateIn,
        touchOut: touchDateOut,
      });
      if (stay.error) return { participante: null, error: stay.error };
      Object.assign(row, stay.patch);
    }
  }
  const { data, error } = await supabase
    .from("fimba_participantes")
    .update(row)
    .eq("id", participanteId)
    .select(PARTICIPANTE_SELECT)
    .single();
  return { participante: data, error };
}

export async function deleteFimbaParticipante(participanteId) {
  const { error } = await supabase
    .from("fimba_participantes")
    .delete()
    .eq("id", participanteId);
  return { error };
}

function normalizeDoc(doc) {
  if (doc == null) return null;
  const s = String(doc).trim();
  return s === "" ? null : s;
}

// ---------------------------------------------------------------------------
// Programas (para alta de edición)
// ---------------------------------------------------------------------------

/**
 * Lista giras OFRN para el alta de edición FIMBA.
 * Columnas alineadas al schema (`fecha_desde`/`fecha_hasta`, no fecha_inicio/fin).
 * Sin filtro: devuelve las más recientes (misma idea que searchProgramasForAssign).
 */
export async function searchProgramasForFimba(q, limit = 30) {
  let query = supabase
    .from("programas")
    .select(
      "id, nomenclador, nombre_gira, subtitulo, mes_letra, tipo, estado, fecha_desde, fecha_hasta",
    )
    .order("fecha_desde", { ascending: false })
    .limit(limit);
  const term = String(q || "").trim();
  if (term) {
    const safe = term.replace(/%/g, "").replace(/,/g, "");
    query = query.or(
      `nomenclador.ilike.%${safe}%,nombre_gira.ilike.%${safe}%,subtitulo.ilike.%${safe}%,mes_letra.ilike.%${safe}%`,
    );
  }
  const { data, error } = await query;
  if (error) return { programas: [], error };
  return { programas: data || [], error: null };
}

// ---------------------------------------------------------------------------
// Transporte FIMBA — mapa de modelo OFRN (no inventar tablas FIMBA de flota)
//
//   transportes              = catálogo reutilizable (identidad de flota en UI FIMBA)
//                              nombre: "Charter 1", "Furgón 1", "Camión …"; color, icon, patente
//   giras_transportes        = UNIDAD FÍSICA de la gira (vehículo): id_transporte + capacidad
//                              + patente + `detalle` (nota/ruta OFRN, NO el nombre de flota)
//   eventos.id_gira_transporte = parada / tramo OFRN que USA esa unidad
//   eventos FIMBA (planilla) = TRAYECTO = cada fila de la planilla (ventana A→B)
//   fimba_evento_transportes = plazas FIMBA del trayecto sobre unidad(es) giras_transportes
//
// Capacidad se calcula por unidad de flota (giras_transportes.id), no por trayecto.
// ---------------------------------------------------------------------------

const GIRA_TRANSPORTE_SELECT =
  "id, id_gira, id_transporte, detalle, capacidad_maxima, patente, categoria_logistica, transportes ( id, nombre, patente, icon, color )";

const FIMBA_EVENTO_TRANSPORTE_SELECT =
  "id, id_evento, id_gira_transporte, plazas, giras_transportes:id_gira_transporte ( id, id_gira, detalle, capacidad_maxima, patente, categoria_logistica, transportes ( id, nombre, patente, icon, color ) )";

/**
 * Nombre de vehículo para UI FIMBA: catálogo (`transportes.nombre`) + patente si hay.
 * No usar `giras_transportes.detalle` como nombre: en OFRN suele ser nota/ruta larga
 * (p.ej. "Salida Charter Viedma a SC Bariloche…"). Fallback a detalle solo si falta catálogo.
 * @param {{ detalle?: string, patente?: string, transportes?: { nombre?: string, patente?: string } | null } | null} gt
 */
export function labelGiraTransporte(gt) {
  if (!gt) return "Vehículo";
  const tipo = (gt.transportes?.nombre || "").trim();
  const detalle = (gt.detalle || "").trim();
  const patente = String(gt.patente || gt.transportes?.patente || "").trim();
  let label = tipo || detalle || "Vehículo";
  if (
    patente &&
    !label.toLowerCase().includes(patente.toLowerCase())
  ) {
    label = `${label} · ${patente}`;
  }
  return label;
}

/**
 * Nota / detalle OFRN de la unidad (`giras_transportes.detalle`), si aporta algo
 * distinto del nombre de catálogo mostrado.
 * @param {{ detalle?: string, transportes?: { nombre?: string } | null } | null} gt
 */
export function detalleGiraTransporte(gt) {
  const detalle = (gt?.detalle || "").trim();
  if (!detalle) return "";
  const tipo = (gt?.transportes?.nombre || "").trim();
  if (tipo && detalle.toLowerCase() === tipo.toLowerCase()) return "";
  return detalle;
}

/**
 * Capacidad máxima de la **unidad de flota** en la gira (`giras_transportes.capacidad_maxima`).
 * @param {{ capacidad_maxima?: number|null } | null} gt
 */
export function capacidadGiraTransporte(gt) {
  const n = Number(gt?.capacidad_maxima);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Vehículos (unidades físicas) de la gira OFRN = filas `giras_transportes`.
 * NO son trayectos: los trayectos FIMBA son `eventos` (+ `fimba_evento_transportes`).
 * Sin master `fimba_transportes`.
 *
 * @param {number|string} giraId — programas.id (= fimba_ediciones.id_gira)
 * @returns {{ vehiculos: Array, flota: Array, error: null|Error }}
 *   `flota` se mantiene como alias de `vehiculos` por compatibilidad.
 */
export async function listFimbaFlota(giraId) {
  if (giraId == null || giraId === "") {
    return { vehiculos: [], flota: [], error: null };
  }
  const { data, error } = await supabase
    .from("giras_transportes")
    .select(GIRA_TRANSPORTE_SELECT)
    .eq("id_gira", Number(giraId))
    .order("id", { ascending: true });
  if (error) return { vehiculos: [], flota: [], error };
  const rows = data || [];
  return { vehiculos: rows, flota: rows, error: null };
}

/** Alias semántico de listFimbaFlota. */
export async function listFimbaVehiculos(giraId) {
  return listFimbaFlota(giraId);
}

/**
 * Catálogo global OFRN de tipos/plantillas de vehículo (`transportes`).
 */
export async function listOfrnTransportesCatalog() {
  const { data, error } = await supabase
    .from("transportes")
    .select("id, nombre, patente, color, icon")
    .order("nombre", { ascending: true });
  if (error) return { catalog: [], error };
  return { catalog: data || [], error: null };
}

/**
 * Alta de **vehículo** (unidad de flota) en la gira — mismo write path que
 * `GirasTransportesManager.handleAddTransport`: insert en `giras_transportes`.
 * Opcionalmente crea entrada de catálogo en `transportes` si se pide un tipo nuevo.
 * No crea trayectos ni filas en `fimba_evento_transportes`.
 *
 * @param {{
 *   id_gira: number|string,
 *   id_transporte?: number|string|null,
 *   catalog_nombre?: string|null,
 *   detalle?: string|null, // nota/ruta OFRN; si vacío se usa el nombre de catálogo
 *   capacidad_maxima?: number|string|null,
 *   categoria_logistica?: string|null,
 * }} payload
 */
export async function addFimbaVehiculo(payload) {
  const giraId = Number(payload?.id_gira);
  if (!Number.isFinite(giraId)) {
    return { vehiculo: null, error: new Error("Gira inválida") };
  }

  let tipoId = payload?.id_transporte != null && payload.id_transporte !== ""
    ? Number(payload.id_transporte)
    : null;

  const catalogNombre = String(payload?.catalog_nombre || "").trim();
  let resolvedCatalogNombre = catalogNombre;
  if (!Number.isFinite(tipoId) && catalogNombre) {
    const { data: existing, error: findErr } = await supabase
      .from("transportes")
      .select("id, nombre")
      .ilike("nombre", catalogNombre)
      .limit(1)
      .maybeSingle();
    if (findErr) return { vehiculo: null, error: findErr };
    if (existing?.id) {
      tipoId = Number(existing.id);
      resolvedCatalogNombre = existing.nombre || catalogNombre;
    } else {
      const { data: created, error: createErr } = await supabase
        .from("transportes")
        .insert({ nombre: catalogNombre })
        .select("id, nombre")
        .single();
      if (createErr) return { vehiculo: null, error: createErr };
      tipoId = Number(created.id);
      resolvedCatalogNombre = created.nombre || catalogNombre;
    }
  }

  if (!Number.isFinite(tipoId)) {
    return {
      vehiculo: null,
      error: new Error("Seleccioná un tipo del catálogo o creá uno nuevo"),
    };
  }

  if (!resolvedCatalogNombre) {
    const { data: tipoRow } = await supabase
      .from("transportes")
      .select("nombre")
      .eq("id", tipoId)
      .maybeSingle();
    resolvedCatalogNombre = (tipoRow?.nombre || "").trim();
  }

  // detalle = nota/ruta OFRN; si no hay, reutiliza el nombre de catálogo (write path OFRN).
  const detalle =
    String(payload?.detalle || "").trim() ||
    resolvedCatalogNombre ||
    "Vehículo";

  const capRaw = payload?.capacidad_maxima;
  const cap =
    capRaw === "" || capRaw == null
      ? null
      : Number.parseInt(String(capRaw), 10);
  const capacidad_maxima = Number.isFinite(cap) && cap >= 0 ? cap : null;

  const cat = String(payload?.categoria_logistica || "PASAJEROS").toUpperCase();
  const categoria_logistica = ["PASAJEROS", "LOGISTICO", "INTERNO"].includes(cat)
    ? cat
    : "PASAJEROS";

  const { data, error } = await supabase
    .from("giras_transportes")
    .insert({
      id_gira: giraId,
      id_transporte: tipoId,
      detalle,
      capacidad_maxima,
      categoria_logistica,
      costo: 0,
    })
    .select(GIRA_TRANSPORTE_SELECT)
    .single();

  if (error) return { vehiculo: null, error };
  return { vehiculo: data, error: null };
}

/**
 * Actualiza un **vehículo** (`giras_transportes`) — mismo write path que
 * `GirasTransportesManager.saveTransportChanges`: detalle, capacidad, categoría,
 * tipo de catálogo (`id_transporte`). Si cambia la categoría, sincroniza
 * `eventos.id_tipo_evento` de las paradas OFRN de esa unidad.
 *
 * @param {number|string} giraTransporteId — `giras_transportes.id`
 * @param {{
 *   id_transporte?: number|string|null,
 *   detalle?: string|null,
 *   capacidad_maxima?: number|string|null,
 *   categoria_logistica?: string|null,
 * }} payload
 */
export async function updateFimbaVehiculo(giraTransporteId, payload = {}) {
  const id = Number(giraTransporteId);
  if (!Number.isFinite(id)) {
    return { vehiculo: null, error: new Error("Vehículo inválido") };
  }

  const { data: current, error: curErr } = await supabase
    .from("giras_transportes")
    .select("id, id_transporte, detalle, capacidad_maxima, categoria_logistica")
    .eq("id", id)
    .maybeSingle();
  if (curErr) return { vehiculo: null, error: curErr };
  if (!current) {
    return { vehiculo: null, error: new Error("Vehículo no encontrado") };
  }

  let tipoId =
    payload?.id_transporte != null && payload.id_transporte !== ""
      ? Number(payload.id_transporte)
      : current.id_transporte != null
        ? Number(current.id_transporte)
        : null;

  if (!Number.isFinite(tipoId)) {
    return {
      vehiculo: null,
      error: new Error("Seleccioná un tipo del catálogo"),
    };
  }

  const detalleRaw =
    payload?.detalle !== undefined
      ? String(payload.detalle || "").trim()
      : String(current.detalle || "").trim();

  let detalle = detalleRaw;
  if (!detalle) {
    const { data: tipoRow } = await supabase
      .from("transportes")
      .select("nombre")
      .eq("id", tipoId)
      .maybeSingle();
    detalle = (tipoRow?.nombre || "").trim() || "Vehículo";
  }

  const capRaw =
    payload?.capacidad_maxima !== undefined
      ? payload.capacidad_maxima
      : current.capacidad_maxima;
  const cap =
    capRaw === "" || capRaw == null
      ? null
      : Number.parseInt(String(capRaw), 10);
  const capacidad_maxima = Number.isFinite(cap) && cap >= 0 ? cap : null;

  const cat = String(
    payload?.categoria_logistica ?? current.categoria_logistica ?? "PASAJEROS",
  ).toUpperCase();
  const categoria_logistica = ["PASAJEROS", "LOGISTICO", "INTERNO"].includes(cat)
    ? cat
    : "PASAJEROS";

  const { data, error } = await supabase
    .from("giras_transportes")
    .update({
      id_transporte: tipoId,
      detalle,
      capacidad_maxima,
      categoria_logistica,
    })
    .eq("id", id)
    .select(GIRA_TRANSPORTE_SELECT)
    .single();

  if (error) return { vehiculo: null, error };

  // Mismo side-effect que OFRN: alinear id_tipo_evento de paradas de la unidad.
  if (
    categoria_logistica !==
    String(current.categoria_logistica || "PASAJEROS").toUpperCase()
  ) {
    const targetEventType = eventTypeIdForCategoria(categoria_logistica);
    const { error: eventsError } = await supabase
      .from("eventos")
      .update({ id_tipo_evento: targetEventType })
      .eq("id_gira_transporte", id);
    if (eventsError) return { vehiculo: data, error: eventsError };
  }

  return { vehiculo: data, error: null };
}

export async function listFimbaEventoTransportes(eventoId) {
  if (eventoId == null) return { rows: [], error: null };
  const { data, error } = await supabase
    .from("fimba_evento_transportes")
    .select(FIMBA_EVENTO_TRANSPORTE_SELECT)
    .eq("id_evento", eventoId);
  if (error) return { rows: [], error };
  return { rows: data || [], error: null };
}

/**
 * Encode actividad/Detalle + destino/vuelo en `eventos.descripcion`.
 * La parte libre (actividad) puede ser HTML rich-text (mismo campo OFRN EventForm).
 * Observaciones de equipaje viven en `eventos.observaciones_equipaje`
 * (no se reescriben aquí; se acepta `observaciones` solo por compat legacy).
 */
export function encodeFimbaTrasladoDescripcion({
  actividad,
  destino,
  vuelo,
  observaciones,
  /** @deprecated prefer `eventos.observaciones_equipaje` */
  includeObsInDescripcion = false,
}) {
  const parts = [];
  const act = String(actividad || "").trim();
  // Evitar persistir solo markup vacío (`<br>`, `<div><br></div>`, …)
  const actPlain = act
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/(p|div|li|h[1-6])>/gi, " ")
    .replace(/<[^>]*>?/gm, "")
    .replace(/\s+/g, " ")
    .trim();
  if (actPlain) parts.push(act);
  const dest = String(destino || "").trim();
  if (dest) parts.push(`Destino: ${dest}`);
  const vu = String(vuelo || "").trim();
  if (vu) parts.push(`Vuelo: ${vu}`);
  if (includeObsInDescripcion) {
    const obs = String(observaciones || "").trim();
    if (obs) parts.push(`Obs: ${obs}`);
  }
  return parts.join("\n");
}

/**
 * @param {string|null|undefined} text
 * @param {{ observaciones_equipaje?: string|null }} [cols] — columnas dedicadas ganan sobre `Obs:` legacy
 */
export function decodeFimbaTrasladoDescripcion(text, cols = {}) {
  const lines = String(text || "").split("\n");
  let destino = "";
  let vuelo = "";
  let observacionesLegacy = "";
  const actLines = [];
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (/^Destino:\s*/i.test(line)) {
      destino = line.replace(/^Destino:\s*/i, "").trim();
    } else if (/^Vuelo:\s*/i.test(line)) {
      vuelo = line.replace(/^Vuelo:\s*/i, "").trim();
    } else if (/^Obs:\s*/i.test(line)) {
      observacionesLegacy = line.replace(/^Obs:\s*/i, "").trim();
    } else if (line.trim() !== "") {
      actLines.push(line);
    }
  }
  const fromCol = String(cols.observaciones_equipaje ?? "").trim();
  const observaciones = fromCol || observacionesLegacy;
  return {
    actividad: actLines.join("\n").trim(),
    destino,
    vuelo,
    observaciones,
    observaciones_equipaje: observaciones,
  };
}

function normalizeTime(t) {
  if (t == null || t === "") return null;
  const s = String(t).trim();
  if (!s) return null;
  const m = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (!m) return s;
  return `${String(m[1]).padStart(2, "0")}:${m[2]}:${m[3] || "00"}`;
}

function timeToMinutes(t) {
  if (!t) return null;
  const s = String(t);
  const [h, m] = s.split(":");
  const hh = Number(h);
  const mm = Number(m);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
  return hh * 60 + mm;
}

/**
 * Solapamiento de ventana en la misma fecha.
 * - Con hora_fin: intervalo half-open [inicio, fin).
 * - Sin hora_fin (punto): solapa otro punto en el mismo minuto, o cae dentro de un intervalo.
 *   (Antes dos puntos al mismo inicio no solapaban → subconteo de plazas FIMBA.)
 */
export function eventWindowsOverlap(a, b) {
  if (!a?.fecha || !b?.fecha || a.fecha !== b.fecha) return false;
  const a0 = timeToMinutes(a.hora_inicio) ?? 0;
  const b0 = timeToMinutes(b.hora_inicio) ?? 0;
  const aFin = timeToMinutes(a.hora_fin);
  const bFin = timeToMinutes(b.hora_fin);
  const aEnd = aFin != null ? Math.max(a0, aFin) : a0;
  const bEnd = bFin != null ? Math.max(b0, bFin) : b0;
  const aPoint = aFin == null || aEnd === a0;
  const bPoint = bFin == null || bEnd === b0;
  if (aPoint && bPoint) return a0 === b0;
  if (aPoint) return a0 >= b0 && a0 < bEnd;
  if (bPoint) return b0 >= a0 && b0 < aEnd;
  return a0 < bEnd && b0 < aEnd;
}

/**
 * Plazas FIMBA ya asignadas a un vehículo en una ventana (misma gira / misma fecha+solape).
 * Solo suma filas `fimba_evento_transportes` de eventos solapados (no OFRN roster).
 * Para libres reales del modal usá `listVehiclesAvailability` (OFRN + FIMBA rides).
 *
 * @param {number|string} giraId
 * @param {number|string} idGiraTransporte
 * @param {{ fecha: string, hora_inicio?: string, hora_fin?: string }} window
 * @param {number|string|null} [excludeEventoId]
 */
export async function sumFimbaPlazasInWindow(
  giraId,
  idGiraTransporte,
  window,
  excludeEventoId = null,
) {
  if (giraId == null || idGiraTransporte == null || !window?.fecha) {
    return { plazas: 0, error: null };
  }
  const { data: eventos, error: e1 } = await supabase
    .from("eventos")
    .select("id, fecha, hora_inicio, hora_fin")
    .eq("id_gira", Number(giraId))
    .eq("fecha", window.fecha)
    .or("is_deleted.is.null,is_deleted.eq.false");
  if (e1) return { plazas: 0, error: e1 };

  const candidates = (eventos || []).filter((ev) => {
    if (excludeEventoId != null && Number(ev.id) === Number(excludeEventoId)) return false;
    return eventWindowsOverlap(ev, window);
  });
  if (candidates.length === 0) return { plazas: 0, error: null };

  const ids = candidates.map((e) => e.id);
  const { data: rows, error: e2 } = await supabase
    .from("fimba_evento_transportes")
    .select("plazas, id_evento")
    .eq("id_gira_transporte", Number(idGiraTransporte))
    .in("id_evento", ids);
  if (e2) return { plazas: 0, error: e2 };

  const plazas = (rows || []).reduce((acc, r) => acc + (Number(r.plazas) || 0), 0);
  return { plazas, error: null };
}

/**
 * Cuenta eventos OFRN de la gira que usan el vehículo en la ventana
 * (`eventos.id_gira_transporte`). No calcula plazas del roster.
 */
export async function countOfrnVehicleUsesInWindow(
  giraId,
  idGiraTransporte,
  window,
  excludeEventoId = null,
) {
  if (giraId == null || idGiraTransporte == null || !window?.fecha) {
    return { count: 0, error: null };
  }
  const { data: eventos, error } = await supabase
    .from("eventos")
    .select("id, fecha, hora_inicio, hora_fin, id_gira_transporte, descripcion")
    .eq("id_gira", Number(giraId))
    .eq("fecha", window.fecha)
    .eq("id_gira_transporte", Number(idGiraTransporte))
    .or("is_deleted.is.null,is_deleted.eq.false");
  if (error) return { count: 0, error };

  const count = (eventos || []).filter((ev) => {
    if (excludeEventoId != null && Number(ev.id) === Number(excludeEventoId)) {
      return false;
    }
    return eventWindowsOverlap(ev, window);
  }).length;
  return { count, error: null };
}

/**
 * Nota ES de métricas de ventana (libres = cap − OFRN a bordo − FIMBA a bordo).
 * @param {{ ocupadas_ofrn?: number, asignadas_fimba?: number, ofrn_eventos?: number, error?: Error|null }} m
 */
function noteVehicleWindowMetrics(m = {}) {
  const notes = [];
  notes.push(
    "Libres = capacidad − asientos OFRN a bordo − plazas FIMBA a bordo en la ventana (rides que solapan fecha/hora).",
  );
  const ofrnSeats = Number(m.ocupadas_ofrn) || 0;
  const fimbaSeats = Number(m.asignadas_fimba) || 0;
  if (ofrnSeats > 0 || fimbaSeats > 0) {
    notes.push(`Ocupadas en ventana: OFRN ${ofrnSeats} · FIMBA ${fimbaSeats}.`);
  }
  const ofrnEv = Number(m.ofrn_eventos) || 0;
  if (ofrnEv > 0) {
    notes.push(
      `${ofrnEv} parada${ofrnEv === 1 ? "" : "s"} OFRN (FK) solapa${ofrnEv === 1 ? "" : "n"} esta franja.`,
    );
  }
  if (m.error?.message) notes.push(m.error.message);
  return notes.join(" ");
}

/**
 * Ids de unidad usados por un evento (FIMBA multi + FK OFRN).
 * @param {object} ev
 * @returns {number[]}
 */
function eventFleetIds(ev) {
  const ids = [];
  for (const r of ev?.vehiculos || []) {
    const n = Number(r?.id_gira_transporte);
    if (Number.isFinite(n)) ids.push(n);
  }
  if (ev?.id_gira_transporte != null && ev.id_gira_transporte !== "") {
    const n = Number(ev.id_gira_transporte);
    if (Number.isFinite(n)) ids.push(n);
  }
  return [...new Set(ids)];
}

/**
 * Disponibilidad de toda la flota en una ventana (misma fecha + solape horarios).
 *
 * Fórmula (alineada a planilla Transportes / boarding):
 *   ocupadas_ofrn  = Σ asientos OFRN (1+plaza_extra) cuyo ride solapa la ventana
 *   ocupadas_fimba = Σ plazas FIMBA (explícitas + residual sintético de
 *                    fimba_evento_transportes) cuyo ride solapa la ventana
 *   libres         = max(0, capacidad − ocupadas_ofrn − ocupadas_fimba)
 *
 * Al editar, `excludeEventoId` omite plazas FIMBA que suben en ese evento
 * (para no bloquear re-guardar las mismas plazas).
 *
 * @param {number|string} giraId
 * @param {Array<object>} flota — filas `giras_transportes`
 * @param {{ fecha: string, hora_inicio?: string, hora_fin?: string }} window
 * @param {number|string|null} [excludeEventoId]
 * @param {{
 *   logisticsSummary?: Array<object>|null,
 *   propuestaRoutes?: Array<object>|null,
 *   includeOfrn?: boolean,
 * }} [opts]
 * @returns {Promise<{ byId: Record<string, {
 *   capacidad: number|null,
 *   asignadas_fimba: number,
 *   ocupadas_ofrn: number,
 *   libres: number|null,
 *   ofrn_eventos: number,
 *   label: string,
 *   note: string,
 *   error: null|Error
 * }>, error: null|Error }>}
 */
export async function listVehiclesAvailability(
  giraId,
  flota,
  window,
  excludeEventoId = null,
  opts = {},
) {
  const list = flota || [];
  const includeOfrn = opts.includeOfrn !== false;
  /** @type {Record<string, any>} */
  const byId = {};
  for (const gt of list) {
    if (gt?.id == null) continue;
    const capacidad = capacidadGiraTransporte(gt);
    byId[String(gt.id)] = {
      capacidad,
      asignadas_fimba: 0,
      ocupadas_ofrn: 0,
      libres: capacidad,
      ofrn_eventos: 0,
      label: labelGiraTransporte(gt),
      note: noteVehicleWindowMetrics({ ocupadas_ofrn: 0, asignadas_fimba: 0 }),
      error: null,
    };
  }

  if (giraId == null || !window?.fecha || list.length === 0) {
    return { byId, error: null };
  }

  const flotaIds = list
    .map((gt) => Number(gt.id))
    .filter((n) => Number.isFinite(n));

  const { data: eventos, error: e1 } = await supabase
    .from("eventos")
    .select(
      "id, fecha, hora_inicio, hora_fin, id_gira_transporte, id_tipo_evento, tipos_evento(id, nombre, id_categoria, categorias_tipos_eventos(id, nombre))",
    )
    .eq("id_gira", Number(giraId))
    .eq("fecha", window.fecha)
    .or("is_deleted.is.null,is_deleted.eq.false");
  if (e1) {
    for (const sid of Object.keys(byId)) {
      byId[sid] = {
        ...byId[sid],
        note: e1.message || "Error al calcular disponibilidad",
        error: e1,
      };
    }
    return { byId, error: e1 };
  }

  const dayEvents = eventos || [];
  const dayIds = dayEvents.map((e) => e.id);

  /** @type {Record<string, Array<{ id_gira_transporte: number, plazas: number }>>} */
  const vehiculosByEvent = {};
  if (dayIds.length > 0 && flotaIds.length > 0) {
    const { data: rows, error: e2 } = await supabase
      .from("fimba_evento_transportes")
      .select("plazas, id_evento, id_gira_transporte")
      .in("id_gira_transporte", flotaIds)
      .in("id_evento", dayIds);
    if (e2) {
      for (const sid of Object.keys(byId)) {
        byId[sid] = {
          ...byId[sid],
          note: e2.message || "Error al calcular plazas FIMBA",
          error: e2,
        };
      }
      return { byId, error: e2 };
    }
    for (const r of rows || []) {
      const eid = String(r.id_evento);
      if (!vehiculosByEvent[eid]) vehiculosByEvent[eid] = [];
      vehiculosByEvent[eid].push({
        id_gira_transporte: Number(r.id_gira_transporte),
        plazas: Math.max(0, Number(r.plazas) || 0),
      });
    }
  }

  const hydrated = dayEvents.map((ev) => ({
    ...ev,
    vehiculos: vehiculosByEvent[String(ev.id)] || [],
  }));
  /** @type {Record<string, object>} */
  const eventsById = Object.fromEntries(
    hydrated.map((ev) => [String(ev.id), ev]),
  );

  // OFRN logistics (roster a bordo). Cacheable vía opts.logisticsSummary.
  let logisticsSummary = opts.logisticsSummary;
  if (includeOfrn && logisticsSummary == null) {
    const pack = await loadFimbaTransportLogisticsSummary(giraId);
    logisticsSummary = pack.error ? [] : pack.summary || [];
  }
  logisticsSummary = logisticsSummary || [];

  // Rutas explícitas FIMBA de la flota (↑/↓ artistas).
  let propuestaRoutes = opts.propuestaRoutes;
  if (propuestaRoutes == null && flotaIds.length > 0) {
    const { data: rutas, error: eR } = await supabase
      .from("fimba_propuesta_rutas")
      .select(FIMBA_PROPUESTA_RUTA_SELECT)
      .in("id_gira_transporte", flotaIds);
    if (eR) {
      // No bloquea: seguimos con sintéticos de evento
      propuestaRoutes = [];
    } else {
      propuestaRoutes = (rutas || []).map((r) => ({
        ...r,
        propuesta: r.propuesta || null,
      }));
    }
  }
  propuestaRoutes = propuestaRoutes || [];

  const excludeSet =
    excludeEventoId != null && excludeEventoId !== ""
      ? new Set([String(excludeEventoId)])
      : null;

  const overlapping = hydrated.filter((ev) => {
    if (excludeSet && excludeSet.has(String(ev.id))) return false;
    return eventWindowsOverlap(ev, window);
  });

  /** @type {Record<string, number>} */
  const ofrnEvByVeh = {};
  for (const ev of overlapping) {
    if (ev.id_gira_transporte == null || ev.id_gira_transporte === "") continue;
    const key = String(ev.id_gira_transporte);
    ofrnEvByVeh[key] = (ofrnEvByVeh[key] || 0) + 1;
  }

  for (const gt of list) {
    if (gt?.id == null) continue;
    const sid = String(gt.id);
    const tid = Number(gt.id);
    const capacidad = capacidadGiraTransporte(gt);

    const ofrnRides = includeOfrn
      ? extractOfrnRidesForVehicle(logisticsSummary, tid)
      : [];
    const endpointIds = collectVehicleRideEndpointIds(
      propuestaRoutes,
      ofrnRides,
      tid,
    );
    const vehicleEvents = sortEventsBySchedule(
      hydrated.filter((ev) =>
        isVehicleBoardingSequenceEvent(ev, tid, eventFleetIds, endpointIds),
      ),
    );
    const fimbaRides = buildFimbaRidesForVehicle(
      vehicleEvents,
      tid,
      propuestaRoutes,
      computeFimbaCapacity,
    );

    const ocupadas_ofrn = sumRidesOccupyingWindow(
      ofrnRides,
      eventsById,
      window,
    );
    const ocupadas_fimba = sumRidesOccupyingWindow(
      fimbaRides,
      eventsById,
      window,
      { excludeBoardEventIds: excludeSet },
    );
    const ofrn_eventos = ofrnEvByVeh[sid] || 0;
    const libres =
      capacidad != null
        ? Math.max(0, capacidad - ocupadas_ofrn - ocupadas_fimba)
        : null;

    byId[sid] = {
      capacidad,
      asignadas_fimba: ocupadas_fimba,
      ocupadas_ofrn,
      libres,
      ofrn_eventos,
      label: labelGiraTransporte(gt),
      note: noteVehicleWindowMetrics({
        ocupadas_ofrn,
        asignadas_fimba: ocupadas_fimba,
        ofrn_eventos,
      }),
      error: null,
    };
  }

  return { byId, error: null };
}

/**
 * Métricas de capacidad por vehículo en la ventana (wrapper 1 unidad).
 * Libres = capacidad − OFRN a bordo − FIMBA a bordo (rides que solapan).
 *
 * @returns {Promise<{ capacidad: number|null, asignadas_fimba: number, ocupadas_ofrn: number, libres: number|null, ofrn_eventos: number, label?: string, note: string, error: null|Error }>}
 */
export async function computeFimbaVehicleWindowMetrics(
  giraId,
  gt,
  window,
  excludeEventoId = null,
  opts = {},
) {
  const capacidad = capacidadGiraTransporte(gt);
  if (!gt) {
    return {
      capacidad: null,
      asignadas_fimba: 0,
      ocupadas_ofrn: 0,
      libres: null,
      ofrn_eventos: 0,
      note: noteVehicleWindowMetrics(),
      error: null,
    };
  }
  const { byId, error } = await listVehiclesAvailability(
    giraId,
    [gt],
    window,
    excludeEventoId,
    opts,
  );
  const m = byId[String(gt.id)];
  if (!m) {
    return {
      capacidad,
      asignadas_fimba: 0,
      ocupadas_ofrn: 0,
      libres: capacidad,
      ofrn_eventos: 0,
      label: labelGiraTransporte(gt),
      note: noteVehicleWindowMetrics(),
      error: error || null,
    };
  }
  return { ...m, error: error || m.error || null };
}

/**
 * Hard-block: plazas pedidas por unidad ≤ asientos físicos (`capacidad_maxima`).
 * Independiente de solapes: no se puede pedir más plazas que la capacidad del bus.
 *
 * @param {Array<{ id_gira_transporte: number|string, plazas?: number }>} assignments
 * @param {Array<object>|Record<string, { capacidad?: number|null, label?: string, capacidad_maxima?: number|null }>} flotaOrById
 * @returns {{ ok: true } | { ok: false, error: Error }}
 */
export function validateEventoTransportPlazasVsCapacidad(
  assignments,
  flotaOrById = [],
) {
  /** @type {Record<string, { capacidad: number|null, label: string }>} */
  const byId = {};
  if (Array.isArray(flotaOrById)) {
    for (const gt of flotaOrById) {
      if (gt?.id == null) continue;
      byId[String(gt.id)] = {
        capacidad: capacidadGiraTransporte(gt),
        label: labelGiraTransporte(gt),
      };
    }
  } else {
    for (const [id, m] of Object.entries(flotaOrById || {})) {
      byId[String(id)] = {
        capacidad:
          m?.capacidad != null && Number.isFinite(Number(m.capacidad))
            ? Number(m.capacidad)
            : capacidadGiraTransporte(m),
        label: m?.label || labelGiraTransporte(m) || `Vehículo #${id}`,
      };
    }
  }

  for (const a of assignments || []) {
    const id = a?.id_gira_transporte;
    if (id == null || id === "") continue;
    const plazas = Math.max(0, Number(a.plazas) || 0);
    const m = byId[String(id)];
    const cap = m?.capacidad;
    if (cap == null || !Number.isFinite(Number(cap))) continue;
    if (plazas > Number(cap)) {
      const label = m.label || `Vehículo #${id}`;
      return {
        ok: false,
        error: new Error(
          `«${label}» admite ${cap} plazas; pedís ${plazas}.`,
        ),
      };
    }
  }
  return { ok: true };
}

/**
 * Hard-block: plazas pedidas por unidad ≤ libres de ventana
 * (capacidad − OFRN a bordo − FIMBA a bordo).
 * Si no hay métrica de libres para una unidad, no bloquea (capacidad desconocida).
 *
 * @param {Array<{ id_gira_transporte: number|string, plazas?: number }>} assignments
 * @param {Record<string, { libres?: number|null, capacidad?: number|null, label?: string }>} availabilityById
 * @returns {{ ok: true } | { ok: false, error: Error }}
 */
export function validateEventoTransportPlazasVsLibres(
  assignments,
  availabilityById = {},
) {
  for (const a of assignments || []) {
    const id = a?.id_gira_transporte;
    if (id == null || id === "") continue;
    const plazas = Math.max(0, Number(a.plazas) || 0);
    const m = availabilityById[String(id)];
    if (!m || m.libres == null || !Number.isFinite(Number(m.libres))) continue;
    const libres = Math.max(0, Number(m.libres));
    if (plazas > libres) {
      const label = m.label || `Vehículo #${id}`;
      const cap =
        m.capacidad != null && Number.isFinite(Number(m.capacidad))
          ? Number(m.capacidad)
          : null;
      return {
        ok: false,
        error: new Error(
          cap != null
            ? `«${label}» solo tiene ${libres} plazas libres de ${cap}; pedís ${plazas}.`
            : `«${label}» solo tiene ${libres} plazas libres; pedís ${plazas}.`,
        ),
      };
    }
  }
  return { ok: true };
}

/**
 * Catálogo compartido OFRN: `tipos_evento` + `categorias_tipos_eventos`.
 * Mismo select shape que EventForm / UnifiedAgenda / MusicianCalendar.
 * `categorias` alimenta el filtro FIMBA (alta en Datos impacta sin code).
 */
export async function listTiposEventoForFimba() {
  const [tiposRes, catsRes] = await Promise.all([
    supabase
      .from("tipos_evento")
      .select(
        "id, nombre, color, id_categoria, categorias_tipos_eventos ( id, nombre )",
      )
      .order("nombre", { ascending: true }),
    supabase
      .from("categorias_tipos_eventos")
      .select("id, nombre")
      .order("nombre", { ascending: true }),
  ]);
  const tipos = tiposRes.error
    ? []
    : normalizeTiposEventoCatalog(tiposRes.data);
  const categorias = catsRes.error
    ? categoriesFromTiposEvento(tipos)
    : normalizeCategoriasTiposEventos(catsRes.data);
  // El filtro de categoría es best-effort: si falla la tabla, se deriva de tipos.
  const error = tiposRes.error || null;
  return { tipos, categorias, error };
}

/**
 * ¿El evento convoca orquesta OFRN?
 * - `tutti` / `grupos` / NULL (histórico general)
 * - filas en `eventos_grupos` (aunque audiencia_ofrn vaya desfasada)
 * `none` = solo FIMBA / sin convocatoria OFRN.
 *
 * @param {{ audiencia_ofrn?: string|null, eventos_grupos?: Array<{ id_grupo?: number|string }>|null }} ev
 */
export function eventHasAudienciaOfrn(ev) {
  const ao = ev?.audiencia_ofrn;
  if (ao === "none") {
    // Desfase posible: grupos cargados pero flag no actualizado
    return eventGrupoIdsFromEvent(ev).length > 0;
  }
  if (ao === "tutti" || ao === "grupos") return true;
  if (ao == null || ao === "") {
    // Histórico pre-columna / general = tutti
    return true;
  }
  return false;
}

/**
 * Texto columna Artistas para convocatoria OFRN: `Orquesta 42` o `Orquesta`.
 * @param {number|string|null|undefined} paxCount
 */
export function formatOrquestaArtistasLabel(paxCount) {
  const n = Number(paxCount);
  if (Number.isFinite(n) && n > 0) return `Orquesta ${n}`;
  return "Orquesta";
}

/**
 * Ids de grupo de convocatoria del evento (raw `eventos_grupos` o `grupos` mapeados).
 * @param {object} ev
 * @returns {number[]}
 */
function ofrnEventGrupoIds(ev) {
  const fromRaw = eventGrupoIdsFromEvent(ev);
  if (fromRaw.length > 0) return fromRaw;
  return (ev?.grupos || [])
    .map((g) => Number(g?.id))
    .filter((id) => Number.isFinite(id));
}

/**
 * Construye mapa id_grupo → Set(id_integrante string) desde filas de `fetchGiraGrupos`.
 * @param {Array} giraGrupos
 * @returns {Map<number, Set<string>>}
 */
export function buildGrupoMembersByGrupoId(giraGrupos) {
  const map = new Map();
  for (const g of giraGrupos || []) {
    const gid = Number(g?.id);
    if (!Number.isFinite(gid)) continue;
    const set = new Set();
    for (const m of g.giras_grupos_integrantes || []) {
      if (m?.id_integrante != null && m.id_integrante !== "") {
        set.add(String(m.id_integrante));
      }
    }
    map.set(gid, set);
  }
  return map;
}

/**
 * Cuenta pax OFRN del evento:
 * - con `eventos_grupos` / audiencia grupos: |union miembros de grupos ∩ roster activo|
 * - tutti / general: tamaño del roster de la gira (ya excluye ausentes)
 * @returns {number|null} null si no hay contexto de roster
 */
export function countOfrnRosterPax(ev, rosterIds, grupoMembersByGrupoId) {
  if (!Array.isArray(rosterIds)) return null;
  const rosterSet = new Set(rosterIds.map((id) => String(id)));
  const gids = ofrnEventGrupoIds(ev);
  if (gids.length > 0) {
    if (!grupoMembersByGrupoId) return null;
    const members = new Set();
    for (const gid of gids) {
      const set = grupoMembersByGrupoId.get(Number(gid));
      if (!set) continue;
      for (const id of set) {
        if (rosterSet.has(String(id))) members.add(String(id));
      }
    }
    return members.size;
  }
  return rosterSet.size;
}

/**
 * Resuelve n y labels de orquesta / # PAX para planilla FIMBA.
 * Prioridad n (Artistas): roster real; fallback `eventos.audiencia` (stored pax).
 * # PAX: valor guardado si > 0; si vacío y hay n computado, mismo n.
 *
 * @param {object} ev — evento mapeado FIMBA
 * @param {{ rosterIds?: string[]|null, grupoMembersByGrupoId?: Map<number, Set<string>>|null }} ctx
 */
export function resolveFimbaOfrnPaxDisplay(ev, ctx = {}) {
  const storedPax = Math.max(0, Number(ev?.audiencia ?? ev?.pax) || 0);
  const hasConvocatoria = eventHasAudienciaOfrn(ev);
  let ofrnPax = null;
  if (hasConvocatoria) {
    ofrnPax = countOfrnRosterPax(
      ev,
      ctx.rosterIds ?? null,
      ctx.grupoMembersByGrupoId ?? null,
    );
  }
  const nForOrquesta =
    ofrnPax != null && ofrnPax > 0
      ? ofrnPax
      : storedPax > 0
        ? storedPax
        : ofrnPax === 0
          ? 0
          : null;
  const paxDisplay =
    storedPax > 0
      ? storedPax
      : ofrnPax != null && ofrnPax > 0
        ? ofrnPax
        : storedPax;

  let orquesta_label = null;
  if (hasConvocatoria) {
    orquesta_label = formatOrquestaArtistasLabel(nForOrquesta);
  } else if (ev?.es_ofrn && !ev?.es_fimba) {
    // Parada flota / pure OFRN sin audiencia: etiqueta base (+ pax guardado si hay)
    orquesta_label = formatOrquestaArtistasLabel(
      storedPax > 0 ? storedPax : null,
    );
  }

  return {
    ofrn_pax: ofrnPax,
    pax: paxDisplay,
    pax_stored: storedPax,
    orquesta_label,
  };
}

/**
 * Clasifica origen FIMBA / OFRN / ambos para planilla y filtros.
 * - FIMBA: tags artistas y/o asignaciones `fimba_evento_transportes`
 * - OFRN: audiencia orquesta (tutti / grupos / general histórico)
 *
 * @param {{ propuestas?: unknown[], vehiculos?: unknown[], audiencia_ofrn?: string|null, eventos_grupos?: unknown[] }} ev
 * @returns {{ es_fimba: boolean, es_ofrn: boolean, origen: 'fimba'|'ofrn'|'ambos' }}
 */
export function classifyFimbaEventOrigen(ev) {
  const es_fimba =
    (ev?.propuestas || []).length > 0 || (ev?.vehiculos || []).length > 0;
  // Paradas / tramos con unidad de flota cuentan como señal OFRN aunque
  // audiencia_ofrn sea none (stops logísticos de GirasTransportesManager).
  const hasOfrnUnit =
    ev?.id_gira_transporte != null && ev.id_gira_transporte !== "";
  const es_ofrn = eventHasAudienciaOfrn(ev) || Boolean(hasOfrnUnit);
  let origen = "fimba";
  if (es_fimba && es_ofrn) origen = "ambos";
  else if (es_ofrn && !es_fimba) origen = "ofrn";
  else if (es_fimba) origen = "fimba";
  else if (es_ofrn) origen = "ofrn";
  return { es_fimba, es_ofrn, origen };
}

/**
 * Grupos de convocatoria de la gira (incluye `giras_grupos_integrantes` para headcount).
 * @param {number|string} idGira
 */
export async function listFimbaGiraGrupos(idGira) {
  return fetchGiraGrupos(supabase, idGira);
}

/**
 * ¿El evento es relevante para la planilla de trayectos / transportes?
 * - Tipo catálogo transporte (`actividadUsaTransporte`)
 * - Parada / tramo OFRN con unidad (`eventos.id_gira_transporte`)
 *
 * Un Concierto (u otro no-transporte) con fila en `fimba_evento_transportes`
 * **no** entra solo por eso: esa asignación no implica parada de boarding.
 * Para ↑/↓ en un venue no-transporte usar `fimba_propuesta_rutas` (el endpoint
 * entra a la secuencia de boarding vía `isVehicleBoardingSequenceEvent`).
 *
 * @param {{ id_tipo_evento?: unknown, tipos_evento?: object|null, vehiculos?: unknown[], id_gira_transporte?: unknown }} ev
 */
export function isFimbaTrasladoEvent(ev) {
  if (!ev) return false;
  if (actividadUsaTransporte(ev.id_tipo_evento, ev.tipos_evento)) return true;
  if (ev.id_gira_transporte != null && ev.id_gira_transporte !== "") return true;
  return false;
}

/**
 * Ids de unidad `giras_transportes` usados por el evento (FIMBA multi + OFRN single).
 * @param {{ vehiculos?: Array<{ id_gira_transporte?: unknown }>, id_gira_transporte?: unknown }} ev
 * @returns {number[]}
 */
export function giraTransporteIdsFromEvent(ev) {
  const ids = new Set();
  for (const r of ev?.vehiculos || []) {
    const n = Number(r?.id_gira_transporte);
    if (Number.isFinite(n)) ids.add(n);
  }
  if (ev?.id_gira_transporte != null && ev.id_gira_transporte !== "") {
    const n = Number(ev.id_gira_transporte);
    if (Number.isFinite(n)) ids.add(n);
  }
  return [...ids];
}

/** Normaliza filtro de propuesta(s) en agenda (single legacy + array multi). */
function normalizeFimbaAgendaPropuestaFilter(opts = {}) {
  const ids = [];
  if (Array.isArray(opts.id_propuestas)) {
    for (const raw of opts.id_propuestas) {
      const n = Number(raw);
      if (Number.isFinite(n)) ids.push(n);
    }
  }
  if (opts.id_propuesta != null && opts.id_propuesta !== "") {
    const n = Number(opts.id_propuesta);
    if (Number.isFinite(n) && !ids.includes(n)) ids.push(n);
  }
  return ids;
}

function normalizeFimbaAgendaGrupoFilter(opts = {}) {
  const ids = [];
  if (Array.isArray(opts.id_grupos)) {
    for (const raw of opts.id_grupos) {
      const n = Number(raw);
      if (Number.isFinite(n)) ids.push(n);
    }
  }
  return ids;
}

function eventMatchesFimbaAgendaPropuestaFilter(
  ev,
  propuestaFilterIds,
  ctx = {},
) {
  if (!propuestaFilterIds?.length) return true;
  return eventMatchesPropuestaRouteFilter(
    ev,
    propuestaFilterIds,
    ctx.propuestaRoutes,
    ctx.sequencesByVehicle,
  );
}

function eventMatchesFimbaAgendaGrupoFilter(ev, grupoFilterIds) {
  if (!grupoFilterIds?.length) return true;
  if (!ev?.es_ofrn) return false;
  return (ev?.grupos || []).some((g) =>
    grupoFilterIds.includes(Number(g.id)),
  );
}

/**
 * Agenda unificada de la edición:
 * 1) Eventos FIMBA: tags `eventos_fimba_propuestas` y/o plazas en `fimba_evento_transportes`
 *    y/o check-in/out vinculados (`fimba_propuestas|participantes.id_evento_checkin|checkout`)
 * 2) Eventos orquesta OFRN de la misma gira (`audiencia_ofrn` tutti/grupos/null)
 *    — se omiten al filtrar solo por artista y cuando `include_ofrn` es false
 *      (planilla staff: off por defecto; se carga al marcar Tutti o un grupo);
 *      con `id_grupos` se incluyen (unión con tags)
 *
 * @param {number|string} edicionId
 * @param {{
 *   id_propuesta?: number|string|null,
 *   id_propuestas?: Array<number|string>,
 *   id_grupos?: Array<number|string>,
 *   id_tipo_evento?: number|string|null,
 *   solo_traslados?: boolean,
 *   include_ofrn?: boolean,
 *   edicion?: object|null,
 *   propuestas?: object[]|null,
 *   flota?: object[]|null,
 * }} [opts]
 */
export async function listFimbaAgenda(edicionId, opts = {}) {
  if (edicionId == null || edicionId === "") {
    return { eventos: [], error: null };
  }
  let edicion = opts.edicion ?? null;
  if (!edicion) {
    const { edicion: ed, error: eEd } = await getFimbaEdicionById(edicionId);
    if (eEd) return { eventos: [], error: eEd };
    edicion = ed;
  }
  if (!edicion) return { eventos: [], error: new Error("Edición no encontrada") };

  let propuestas = opts.propuestas ?? null;
  if (!propuestas) {
    const { propuestas: props, error: eProp } = await listFimbaPropuestas(edicionId);
    if (eProp) return { eventos: [], error: eProp };
    propuestas = props;
  }
  const propIds = (propuestas || []).map((p) => p.id);
  const propById = Object.fromEntries((propuestas || []).map((p) => [String(p.id), p]));
  const propuestaFilterIds = normalizeFimbaAgendaPropuestaFilter(opts);
  const grupoFilterIds = normalizeFimbaAgendaGrupoFilter(opts);
  const hasPropuestaFilter = propuestaFilterIds.length > 0;
  const hasGrupoFilter = grupoFilterIds.length > 0;
  const onlyEventIds = Array.isArray(opts.eventIds)
    ? [...new Set(opts.eventIds.map(Number).filter(Number.isFinite))]
    : null;
  const fetchByEventIds = Boolean(onlyEventIds?.length);

  /** Rutas de artista (filtro agenda / consulta): paradas reales, no bloques sintéticos. */
  let propuestaRoutesForFilter = [];
  if (!fetchByEventIds && hasPropuestaFilter) {
    const { rutas, error: eRutasFilter } = await listFimbaPropuestaRutas(
      edicionId,
    );
    if (eRutasFilter) return { eventos: [], error: eRutasFilter };
    propuestaRoutesForFilter = (rutas || []).filter((r) =>
      propuestaFilterIds.includes(Number(r.id_propuesta)),
    );
  }

  let eventIds;
  // Hoisted: used after the fetchByEventIds branch to seed tagsFull (line ~3208).
  let tags = [];
  /** id_evento → propuestas vía FK estadía (check-in/out); se fusiona con tags. */
  let stayPropuestasByEvent = {};
  if (fetchByEventIds) {
    eventIds = onlyEventIds;
  } else {
  let tagQuery = supabase
    .from("eventos_fimba_propuestas")
    .select("id_evento, id_propuesta");
  if (propIds.length > 0) {
    tagQuery = tagQuery.in("id_propuesta", propIds);
  } else {
    // sin artistas: solo se listarán eventos con asignaciones flota (más abajo)
    tagQuery = tagQuery.eq("id_propuesta", -1);
  }
  if (propuestaFilterIds.length === 1) {
    tagQuery = tagQuery.eq("id_propuesta", propuestaFilterIds[0]);
  } else if (propuestaFilterIds.length > 1) {
    tagQuery = tagQuery.in("id_propuesta", propuestaFilterIds);
  }
  const { data: tagsData, error: eTags } = await tagQuery;
  if (eTags) return { eventos: [], error: eTags };
  tags = tagsData || [];

  const taggedEventIds = [...new Set(tags.map((t) => t.id_evento))];

  // Eventos con filas de flota FIMBA solo sobre vehículos de esta gira OFRN
  // (sin tag aún = traslados edition-wide). Nunca flota FIMBA propia.
  let flotaEventIds = [];
  let fleetIds = [];
  if (!hasPropuestaFilter) {
    let flota = opts.flota ?? null;
    if (!flota) {
      const { flota: fleet, error: eFleet } = await listFimbaFlota(edicion.id_gira);
      if (eFleet) return { eventos: [], error: eFleet };
      flota = fleet;
    }
    fleetIds = (flota || []).map((f) => f.id);
    if (fleetIds.length > 0) {
      const { data: flotaRows, error: eFlota } = await supabase
        .from("fimba_evento_transportes")
        .select("id_evento")
        .in("id_gira_transporte", fleetIds);
      if (eFlota) return { eventos: [], error: eFlota };
      flotaEventIds = (flotaRows || []).map((r) => r.id_evento);
    }
  }

  // Orquesta OFRN: misma gira, convocatoria tutti/grupos/general (no `none`).
  // Por defecto se incluye en agenda y en trayectos; no al filtrar un artista.
  const includeOfrn =
    opts.include_ofrn != null
      ? Boolean(opts.include_ofrn)
      : !hasPropuestaFilter || hasGrupoFilter;

  let ofrnEventIds = [];
  if (includeOfrn) {
    const { data: ofrnRows, error: eOfrn } = await supabase
      .from("eventos")
      .select("id")
      .eq("id_gira", edicion.id_gira)
      .or("is_deleted.is.null,is_deleted.eq.false")
      .or(
        "audiencia_ofrn.eq.tutti,audiencia_ofrn.eq.grupos,audiencia_ofrn.is.null",
      );
    if (eOfrn) return { eventos: [], error: eOfrn };
    ofrnEventIds = (ofrnRows || []).map((r) => r.id);
  }

  // Paradas OFRN de flota de esta gira (aunque `audiencia_ofrn = none`):
  // solo en planilla de trayectos, para no perder stops logísticos.
  let ofrnStopIds = [];
  if (opts.solo_traslados && fleetIds.length > 0) {
    const { data: stopRows, error: eStops } = await supabase
      .from("eventos")
      .select("id")
      .eq("id_gira", edicion.id_gira)
      .or("is_deleted.is.null,is_deleted.eq.false")
      .in("id_gira_transporte", fleetIds);
    if (eStops) return { eventos: [], error: eStops };
    ofrnStopIds = (stopRows || []).map((r) => r.id);
  }

  /** Paradas de vehículos donde el artista sube/baja o está a bordo (sin filas sintéticas). */
  let routeVehicleEventIds = [];
  if (hasPropuestaFilter && propuestaRoutesForFilter.length > 0) {
    const vehicleIds = [
      ...new Set(
        propuestaRoutesForFilter
          .map((r) => Number(r.id_gira_transporte))
          .filter(Number.isFinite),
      ),
    ];
    for (const r of propuestaRoutesForFilter) {
      if (r.id_evento_subida != null && r.id_evento_subida !== "") {
        routeVehicleEventIds.push(r.id_evento_subida);
      }
      if (r.id_evento_bajada != null && r.id_evento_bajada !== "") {
        routeVehicleEventIds.push(r.id_evento_bajada);
      }
    }
    if (vehicleIds.length > 0) {
      const [ofrnStopsRes, fimbaAssignRes] = await Promise.all([
        supabase
          .from("eventos")
          .select("id")
          .eq("id_gira", edicion.id_gira)
          .or("is_deleted.is.null,is_deleted.eq.false")
          .in("id_gira_transporte", vehicleIds),
        supabase
          .from("fimba_evento_transportes")
          .select("id_evento")
          .in("id_gira_transporte", vehicleIds),
      ]);
      if (ofrnStopsRes.error) return { eventos: [], error: ofrnStopsRes.error };
      if (fimbaAssignRes.error) {
        return { eventos: [], error: fimbaAssignRes.error };
      }
      routeVehicleEventIds.push(
        ...(ofrnStopsRes.data || []).map((row) => row.id),
        ...(fimbaAssignRes.data || []).map((row) => row.id_evento),
      );
    }
  }

  // Check-in / Check-out (tipos 22/23): FKs en propuestas y participantes.
  // No requieren tag en eventos_fimba_propuestas; la asociación es la fuente de verdad.
  const stayScopePropIds = hasPropuestaFilter
    ? propuestaFilterIds
    : (propuestas || []).map((p) => Number(p.id)).filter(Number.isFinite);
  const stayEventIds = [];
  stayPropuestasByEvent = {};
  const addStayLink = (eventId, prop) => {
    const eid = Number(eventId);
    if (!Number.isFinite(eid) || !prop) return;
    stayEventIds.push(eid);
    const k = String(eid);
    if (!stayPropuestasByEvent[k]) stayPropuestasByEvent[k] = [];
    if (!stayPropuestasByEvent[k].some((x) => Number(x.id) === Number(prop.id))) {
      stayPropuestasByEvent[k].push(prop);
    }
  };
  for (const p of propuestas || []) {
    if (
      stayScopePropIds.length > 0 &&
      !stayScopePropIds.includes(Number(p.id))
    ) {
      continue;
    }
    if (p.id_evento_checkin != null) addStayLink(p.id_evento_checkin, p);
    if (p.id_evento_checkout != null) addStayLink(p.id_evento_checkout, p);
  }
  if (stayScopePropIds.length > 0) {
    const { data: stayParts, error: eStayParts } = await supabase
      .from("fimba_participantes")
      .select("id_propuesta, id_evento_checkin, id_evento_checkout")
      .in("id_propuesta", stayScopePropIds)
      .or(
        "id_evento_checkin.not.is.null,id_evento_checkout.not.is.null",
      );
    if (eStayParts) return { eventos: [], error: eStayParts };
    for (const part of stayParts || []) {
      const prop = propById[String(part.id_propuesta)];
      if (!prop) continue;
      if (part.id_evento_checkin != null) {
        addStayLink(part.id_evento_checkin, prop);
      }
      if (part.id_evento_checkout != null) {
        addStayLink(part.id_evento_checkout, prop);
      }
    }
  }

  eventIds = [
    ...new Set([
      ...taggedEventIds,
      ...flotaEventIds,
      ...ofrnEventIds,
      ...ofrnStopIds,
      ...routeVehicleEventIds,
      ...stayEventIds,
    ]),
  ];
  }
  if (eventIds.length === 0) return { eventos: [], error: null };

  const { data: eventosRaw, error: eEvt } = await supabase
    .from("eventos")
    .select(
      "id, id_gira, id_tipo_evento, id_locacion, fecha, hora_inicio, hora_fin, descripcion, audiencia, asientos_equipaje, observaciones_equipaje, observaciones_internas, observaciones_aforo, audiencia_ofrn, id_gira_transporte, visible_agenda, is_deleted, tipos_evento ( id, nombre, color, id_categoria, categorias_tipos_eventos ( id, nombre ) ), locaciones ( id, nombre, direccion, localidades ( id, localidad, id_region ) ), eventos_grupos ( id_grupo, giras_grupos ( id, nombre, color ) )",
    )
    .in("id", eventIds)
    .eq("id_gira", edicion.id_gira)
    .or("is_deleted.is.null,is_deleted.eq.false")
    .order("fecha", { ascending: true })
    .order("hora_inicio", { ascending: true });
  if (eEvt) return { eventos: [], error: eEvt };

  const { data: allAssign, error: eAsg } = await supabase
    .from("fimba_evento_transportes")
    .select(FIMBA_EVENTO_TRANSPORTE_SELECT)
    .in("id_evento", eventIds);
  if (eAsg) return { eventos: [], error: eAsg };

  const assignByEvent = {};
  for (const r of allAssign || []) {
    const k = String(r.id_evento);
    if (!assignByEvent[k]) assignByEvent[k] = [];
    assignByEvent[k].push(r);
  }

  // Con filtro por artista, rehidratar todos los tags de los eventos listados.
  // En fetch por id(s) explícito, siempre cargar tags de esos eventos.
  let tagsFull = fetchByEventIds ? [] : tags || [];
  if ((fetchByEventIds || hasPropuestaFilter) && eventIds.length > 0) {
    const { data: allTags, error: eAllTags } = await supabase
      .from("eventos_fimba_propuestas")
      .select("id_evento, id_propuesta")
      .in("id_evento", eventIds);
    if (eAllTags) return { eventos: [], error: eAllTags };
    tagsFull = allTags || [];
  }

  const tagsByEvent = {};
  for (const t of tagsFull) {
    const k = String(t.id_evento);
    if (!tagsByEvent[k]) tagsByEvent[k] = [];
    if (propById[String(t.id_propuesta)]) {
      tagsByEvent[k].push(propById[String(t.id_propuesta)]);
    }
  }
  for (const [eid, props] of Object.entries(stayPropuestasByEvent || {})) {
    if (!tagsByEvent[eid]) tagsByEvent[eid] = [];
    for (const prop of props) {
      if (!tagsByEvent[eid].some((x) => Number(x.id) === Number(prop.id))) {
        tagsByEvent[eid].push(prop);
      }
    }
  }

  let eventos = (eventosRaw || []).map((ev) => {
    const decoded = decodeFimbaTrasladoDescripcion(ev.descripcion, {
      observaciones_equipaje: ev.observaciones_equipaje,
    });
    const vehicles = assignByEvent[String(ev.id)] || [];
    const propuestasTagged = tagsByEvent[String(ev.id)] || [];
    const tipoId = Number(ev.id_tipo_evento);
    const tipoMeta = ev.tipos_evento || null;
    const usaTransporte = actividadUsaTransporte(tipoId, tipoMeta);
    const hasOfrnUnit =
      ev.id_gira_transporte != null && ev.id_gira_transporte !== "";
    const grupos = (ev.eventos_grupos || [])
      .map((eg) => eg.giras_grupos)
      .filter(Boolean);
    const locNombre = ev.locaciones?.nombre || null;
    const locCiudad = ev.locaciones?.localidades?.localidad || null;
    const asientosEquipaje = Math.max(
      0,
      Number(
        ev.asientos_equipaje != null && ev.asientos_equipaje !== ""
          ? ev.asientos_equipaje
          : ev.audiencia,
      ) || 0,
    );
    const mapped = {
      ...ev,
      ...decoded,
      // Destino de texto FIMBA gana; si vacío, locación OFRN
      destino: decoded.destino || locNombre || "",
      locacion_nombre: locNombre,
      locacion_ciudad: locCiudad,
      vehiculos: vehicles,
      propuestas: sortFimbaPropuestasByNombre(propuestasTagged),
      grupos,
      // SIN SERVICIO solo para trayectos FIMBA/transporte sin unidad ni OFRN stop
      sin_servicio:
        usaTransporte && vehicles.length === 0 && !hasOfrnUnit,
      /** @deprecated alias: asientos de equipaje (no headcount) */
      pax: asientosEquipaje,
      asientos_equipaje: asientosEquipaje,
      observaciones_equipaje: decoded.observaciones_equipaje || "",
      tipo_nombre: tipoMeta?.nombre || null,
      tipo_color: tipoMeta?.color || null,
      tipo_id_categoria:
        tipoMeta?.id_categoria != null
          ? Number(tipoMeta.id_categoria)
          : tipoMeta?.categorias_tipos_eventos?.id != null
            ? Number(tipoMeta.categorias_tipos_eventos.id)
            : null,
      categoria_nombre: tipoMeta?.categorias_tipos_eventos?.nombre || null,
      es_traslado: usaTransporte || hasOfrnUnit,
    };
    const origen = classifyFimbaEventOrigen(mapped);
    return { ...mapped, ...origen };
  });

  // Roster activo de la gira (excluye ausentes y pre-alta) + membresía de grupos para n de Orquesta.
  const needsOfrnPax = eventos.some(
    (ev) => eventHasAudienciaOfrn(ev) || (ev.es_ofrn && !ev.es_fimba),
  );
  let rosterIds = null;
  let grupoMembersByGrupoId = null;
  if (needsOfrnPax) {
    try {
      const [rosterDetail, { grupos: giraGrupos }] = await Promise.all([
        resolveGiraRosterForMatrix(supabase, edicion.id_gira),
        fetchGiraGrupos(supabase, edicion.id_gira),
      ]);
      // countedIds = convocatoria vigente (sin ausentes sin abono ni pre-alta)
      rosterIds = [...(rosterDetail?.countedIds || [])];
      grupoMembersByGrupoId = buildGrupoMembersByGrupoId(giraGrupos);
    } catch (err) {
      console.warn("[FIMBA] No se pudo calcular pax de orquesta:", err);
      rosterIds = null;
      grupoMembersByGrupoId = null;
    }
  }

  eventos = eventos.map((ev) => {
    const paxMeta = resolveFimbaOfrnPaxDisplay(ev, {
      rosterIds,
      grupoMembersByGrupoId,
    });
    return {
      ...ev,
      ...paxMeta,
    };
  });

  if (opts.solo_traslados) {
    eventos = eventos.filter(isFimbaTrasladoEvent);
  }
  if (opts.id_tipo_evento != null && opts.id_tipo_evento !== "") {
    const want = Number(opts.id_tipo_evento);
    eventos = eventos.filter((ev) => Number(ev.id_tipo_evento) === want);
  }

  let agendaPropuestaFilterCtx = {};
  if (hasPropuestaFilter && propuestaRoutesForFilter.length > 0) {
    let flotaForSeq = opts.flota ?? null;
    if (!flotaForSeq) {
      const { flota: fleet, error: eFleetSeq } = await listFimbaFlota(
        edicion.id_gira,
      );
      if (eFleetSeq) return { eventos: [], error: eFleetSeq };
      flotaForSeq = fleet;
    }
    agendaPropuestaFilterCtx = {
      propuestaRoutes: propuestaRoutesForFilter,
      sequencesByVehicle: buildAllVehicleBoardingSequences({
        vehiculos: flotaForSeq || [],
        eventos,
        capacityFn: computeFimbaCapacity,
        eventVehicleIds: giraTransporteIdsFromEvent,
        propuestaRoutes: propuestaRoutesForFilter,
      }),
    };
  }

  if (!fetchByEventIds && (hasPropuestaFilter || hasGrupoFilter)) {
    eventos = eventos.filter((ev) => {
      const matchesArtist = eventMatchesFimbaAgendaPropuestaFilter(
        ev,
        propuestaFilterIds,
        agendaPropuestaFilterCtx,
      );
      const matchesGrupo = eventMatchesFimbaAgendaGrupoFilter(
        ev,
        grupoFilterIds,
      );
      if (hasPropuestaFilter && hasGrupoFilter) {
        return matchesArtist || matchesGrupo;
      }
      if (hasPropuestaFilter) return matchesArtist;
      return matchesGrupo;
    });
  }

  // Contrato planilla: fecha → hora → detalle (es) → tipo → id.
  eventos = sortFimbaAgendaRows(eventos);

  return { eventos, error: null };
}

/**
 * Una fila de agenda unificada por id (misma forma que `listFimbaAgenda`).
 * Omite filtros de artista/grupo de `opts`; incluye OFRN por defecto.
 */
export async function getFimbaAgendaEvento(edicionId, eventoId, opts = {}) {
  const id = Number(eventoId);
  if (!Number.isFinite(id)) {
    return { evento: null, error: new Error("id de evento inválido") };
  }
  const { eventos, error } = await listFimbaAgenda(edicionId, {
    ...opts,
    eventIds: [id],
    include_ofrn: opts.include_ofrn != null ? opts.include_ofrn : true,
  });
  if (error) return { evento: null, error };
  return { evento: eventos?.[0] ?? null, error: null };
}

/**
 * Lista trayectos de transportes FIMBA + paradas/traslados OFRN de la gira.
 * Subconjunto de agenda (`solo_traslados`): tipo transporte, flota FIMBA o `id_gira_transporte`.
 * @param {number|string} edicionId
 * @param {{
 *   id_propuesta?: number|string|null,
 *   include_ofrn?: boolean,
 *   edicion?: object|null,
 *   propuestas?: object[]|null,
 *   flota?: object[]|null,
 * }} [opts]
 */
export async function listFimbaTraslados(edicionId, opts = {}) {
  return listFimbaAgenda(edicionId, { ...opts, solo_traslados: true });
}

/**
 * Resumen logístico OFRN (admision + rutas subida/bajada) para calcular
 * en tránsito en la planilla FIMBA Transportes.
 * Reutiliza `calculateLogisticsSummary` (misma regla que GirasTransportesManager).
 *
 * @param {number|string} giraId
 * @returns {Promise<{ summary: Array, error: Error|null }>}
 */
export async function loadFimbaTransportLogisticsSummary(giraId) {
  const id = Number(giraId);
  if (!Number.isFinite(id)) {
    return {
      summary: [],
      admissionRules: [],
      passengers: [],
      localities: [],
      regions: [],
      routeRules: [],
      error: new Error("id_gira requerido"),
    };
  }
  try {
    const gira = { id };
    const [
      rosterPack,
      admRes,
      routeRes,
      fleetRes,
      locsRes,
      regionsRes,
      eventsRes,
      segmentBundle,
    ] = await Promise.all([
      fetchRosterForGira(supabase, gira),
      supabase.from("giras_logistica_admision").select("*").eq("id_gira", id),
      supabase
        .from("giras_logistica_rutas")
        .select(
          `*, evento_subida:id_evento_subida(*, locaciones(*, localidades(*))), evento_bajada:id_evento_bajada(*, locaciones(*, localidades(*)))`,
        )
        .eq("id_gira", id),
      supabase
        .from("giras_transportes")
        .select(
          "*, transportes(nombre, patente, icon, documentacion), chofer:integrantes!giras_transportes_id_chofer_fkey(id, nombre, apellido)",
        )
        .eq("id_gira", id),
      supabase.from("localidades").select("id, localidad, id_region"),
      supabase.from("regiones").select("id, region"),
      supabase
        .from("eventos")
        .select(
          `id, fecha, hora_inicio, hora_fin, descripcion, id_gira_transporte, id_locacion, locaciones(*, localidades(*))`,
        )
        .eq("id_gira", id)
        .or("is_deleted.is.null,is_deleted.eq.false"),
      fetchGiraSegmentosBundle(supabase, id).catch(() => ({
        segments: [],
        cortesCount: 0,
      })),
    ]);

    const emptyPack = (error) => ({
      summary: [],
      admissionRules: [],
      passengers: [],
      localities: [],
      regions: [],
      routeRules: [],
      error,
    });

    if (admRes.error) return emptyPack(admRes.error);
    if (routeRes.error) return emptyPack(routeRes.error);
    if (fleetRes.error) return emptyPack(fleetRes.error);
    if (locsRes.error) return emptyPack(locsRes.error);
    if (eventsRes.error) return emptyPack(eventsRes.error);

    // Sin ausentes (mismo filtro maestro de logística OFRN)
    const roster = (rosterPack?.roster || []).filter(
      (p) => p?.estado_gira !== "ausente",
    );

    const summary = calculateLogisticsSummary(
      roster,
      [], // sin reglas hotel/comida: solo necesitamos transportes
      admRes.data || [],
      routeRes.data || [],
      fleetRes.data || [],
      [],
      locsRes.data || [],
      eventsRes.data || [],
      segmentBundle?.segments || [],
    );

    return {
      summary: summary || [],
      admissionRules: admRes.data || [],
      passengers: summary || [],
      localities: locsRes.data || [],
      regions: regionsRes.error ? [] : regionsRes.data || [],
      /** Reglas `giras_logistica_rutas` (chips Subidas/Bajadas Orquesta en planilla). */
      routeRules: routeRes.data || [],
      error: null,
    };
  } catch (err) {
    console.warn("[FIMBA] loadFimbaTransportLogisticsSummary:", err);
    return {
      summary: [],
      admissionRules: [],
      passengers: [],
      localities: [],
      regions: [],
      routeRules: [],
      error: err instanceof Error ? err : new Error(String(err?.message || err)),
    };
  }
}

// ---------------------------------------------------------------------------
// Rutas FIMBA por artista (subida/bajada con cantidad) — fimba_propuesta_rutas
// ---------------------------------------------------------------------------

const FIMBA_PROPUESTA_RUTA_SELECT =
  "id, id_propuesta, id_gira_transporte, plazas, asientos_equipaje, observaciones_equipaje, id_evento_subida, id_evento_bajada, created_at, updated_at, propuesta:id_propuesta ( id, nombre, color, cantidad_planificada, plazas_extra_materiales )";

/**
 * Lista rutas de artista (cantidad) de la edición: las que tocan flota de la gira.
 * @param {number|string} edicionId
 * @param {{
 *   id_propuesta?: number|string|null,
 *   id_gira_transporte?: number|string|null,
 *   id_evento?: number|string|null,
 *   type?: 'up'|'down'|null,
 *   edicion?: object|null,
 *   propuestas?: Array<{ id: number|string }>|null,
 *   propuestaIds?: Array<number|string>|null,
 * }} [opts]
 */
export async function listFimbaPropuestaRutas(edicionId, opts = {}) {
  const edId = Number(edicionId);
  if (!Number.isFinite(edId)) {
    return { rutas: [], error: new Error("id de edición requerido") };
  }

  let propIds = null;
  if (Array.isArray(opts.propuestaIds)) {
    propIds = opts.propuestaIds.map(Number).filter((id) => Number.isFinite(id));
  } else if (Array.isArray(opts.propuestas)) {
    propIds = opts.propuestas.map((p) => Number(p?.id)).filter((id) => Number.isFinite(id));
  }

  if (propIds == null) {
    const edicion = opts.edicion ?? null;
    if (!edicion) {
      const { edicion: ed, error: eEd } = await getFimbaEdicionById(edId);
      if (eEd) return { rutas: [], error: eEd };
      if (!ed?.id_gira) {
        return { rutas: [], error: new Error("Edición sin gira OFRN") };
      }
    } else if (!edicion.id_gira) {
      return { rutas: [], error: new Error("Edición sin gira OFRN") };
    }

    // Propuestas de la edición → filtrar rutas por id_propuesta
    const { data: props, error: eProp } = await supabase
      .from("fimba_propuestas")
      .select("id")
      .eq("id_edicion", edId);
    if (eProp) return { rutas: [], error: eProp };
    propIds = (props || []).map((p) => p.id);
  }

  if (opts.id_propuesta != null && opts.id_propuesta !== "") {
    const want = Number(opts.id_propuesta);
    propIds = propIds.filter((id) => Number(id) === want);
  }
  if (propIds.length === 0) return { rutas: [], error: null };

  let q = supabase
    .from("fimba_propuesta_rutas")
    .select(FIMBA_PROPUESTA_RUTA_SELECT)
    .in("id_propuesta", propIds);

  if (opts.id_gira_transporte != null && opts.id_gira_transporte !== "") {
    q = q.eq("id_gira_transporte", Number(opts.id_gira_transporte));
  }
  if (opts.id_evento != null && opts.id_evento !== "" && opts.type === "up") {
    q = q.eq("id_evento_subida", Number(opts.id_evento));
  } else if (
    opts.id_evento != null &&
    opts.id_evento !== "" &&
    opts.type === "down"
  ) {
    q = q.eq("id_evento_bajada", Number(opts.id_evento));
  } else if (opts.id_evento != null && opts.id_evento !== "") {
    const eid = Number(opts.id_evento);
    q = q.or(`id_evento_subida.eq.${eid},id_evento_bajada.eq.${eid}`);
  }

  const { data, error } = await q.order("id", { ascending: true });
  if (error) return { rutas: [], error };
  return {
    rutas: (data || []).map((r) => ({
      ...r,
      propuesta: r.propuesta || null,
    })),
    error: null,
  };
}

/**
 * Bloques de traslado (suben → bajan) para la agenda de un artista.
 * Usa `fimba_propuesta_rutas` + paradas de flota; no escribe en DB.
 *
 * @param {number|string} edicionId
 * @param {number|string} idPropuesta
 * @returns {Promise<{ blocks: object[], error: Error|null }>}
 */
export async function listFimbaArtistaTrasladoBlocks(edicionId, idPropuesta) {
  if (edicionId == null || edicionId === "") {
    return { blocks: [], error: null };
  }
  if (idPropuesta == null || idPropuesta === "") {
    return { blocks: [], error: null };
  }

  const { edicion, error: eEd } = await getFimbaEdicionById(edicionId);
  if (eEd) return { blocks: [], error: eEd };
  if (!edicion?.id_gira) return { blocks: [], error: null };

  const { rutas, error: eRutas } = await listFimbaPropuestaRutas(edicionId, {
    id_propuesta: idPropuesta,
  });
  if (eRutas) return { blocks: [], error: eRutas };

  const artistRoutes = (rutas || []).filter(
    (r) => Math.max(0, Number(r.plazas) || 0) > 0,
  );
  if (artistRoutes.length === 0) return { blocks: [], error: null };

  const eventIds = [
    ...new Set(
      artistRoutes.flatMap((r) =>
        [r.id_evento_subida, r.id_evento_bajada].filter(
          (id) => id != null && id !== "",
        ),
      ),
    ),
  ];
  if (eventIds.length === 0) return { blocks: [], error: null };

  const { data: stopEvents, error: eEv } = await supabase
    .from("eventos")
    .select(
      "id, id_gira, id_tipo_evento, id_locacion, fecha, hora_inicio, hora_fin, descripcion, audiencia, asientos_equipaje, observaciones_equipaje, observaciones_internas, audiencia_ofrn, id_gira_transporte, is_deleted, tipos_evento ( id, nombre, color, id_categoria, categorias_tipos_eventos ( id, nombre ) ), locaciones ( id, nombre, direccion, localidades ( id, localidad ) )",
    )
    .in("id", eventIds)
    .or("is_deleted.is.null,is_deleted.eq.false");
  if (eEv) return { blocks: [], error: eEv };

  const { flota, error: eFlota } = await listFimbaFlota(edicion.id_gira);
  if (eFlota) return { blocks: [], error: eFlota };

  const eventsById = new Map(
    (stopEvents || []).map((ev) => {
      const decoded = decodeFimbaTrasladoDescripcion(ev.descripcion, {
        observaciones_equipaje: ev.observaciones_equipaje,
      });
      return [
        String(ev.id),
        {
          ...ev,
          ...decoded,
          actividad: decoded.actividad || ev.descripcion || null,
          tipo_nombre: ev.tipos_evento?.nombre || null,
        },
      ];
    }),
  );
  const vehiculosById = new Map(
    (flota || []).map((gt) => [String(gt.id), gt]),
  );

  const blocks = buildArtistaTrasladoAgendaBlocks({
    idPropuesta,
    propuestaRoutes: artistRoutes,
    eventsById,
    vehiculosById,
    labelVehicle: labelGiraTransporte,
  });

  return { blocks, error: null };
}

/**
 * Bloques de traslado (suben→bajan) para todas las propuestas de la edición.
 * Reutiliza agenda/flota/rutas ya cargadas; solo pide paradas faltantes en batch.
 *
 * @param {{
 *   propuestas?: object[],
 *   propuestaRoutes?: object[],
 *   eventos?: object[],
 *   flota?: object[],
 * }} cache
 * @returns {Promise<{ blocks: object[], error: Error|null }>}
 */
export async function buildAllFimbaAgendaRideBlocks(cache = {}) {
  const propuestas = cache.propuestas || [];
  const propuestaRoutes = cache.propuestaRoutes || [];
  const eventos = cache.eventos || [];
  const flota = cache.flota || [];

  if (!propuestaRoutes.length || !propuestas.length) {
    return { blocks: [], error: null };
  }

  const eventsById = new Map(
    (eventos || []).map((ev) => [String(ev.id), ev]),
  );
  const missingIds = [];
  for (const r of propuestaRoutes) {
    if (Math.max(0, Number(r.plazas) || 0) <= 0) continue;
    for (const id of [r.id_evento_subida, r.id_evento_bajada]) {
      if (id != null && id !== "" && !eventsById.has(String(id))) {
        missingIds.push(id);
      }
    }
  }

  const uniqueMissing = [...new Set(missingIds)];
  if (uniqueMissing.length > 0) {
    const { data: stopEvents, error: eEv } = await supabase
      .from("eventos")
      .select(
        "id, id_gira, id_tipo_evento, id_locacion, fecha, hora_inicio, hora_fin, descripcion, audiencia, asientos_equipaje, observaciones_equipaje, observaciones_internas, audiencia_ofrn, id_gira_transporte, is_deleted, tipos_evento ( id, nombre, color, id_categoria, categorias_tipos_eventos ( id, nombre ) ), locaciones ( id, nombre, direccion, localidades ( id, localidad ) )",
      )
      .in("id", uniqueMissing)
      .or("is_deleted.is.null,is_deleted.eq.false");
    if (eEv) return { blocks: [], error: eEv };
    for (const ev of stopEvents || []) {
      const decoded = decodeFimbaTrasladoDescripcion(ev.descripcion, {
        observaciones_equipaje: ev.observaciones_equipaje,
      });
      eventsById.set(String(ev.id), {
        ...ev,
        ...decoded,
        actividad: decoded.actividad || ev.descripcion || null,
        tipo_nombre: ev.tipos_evento?.nombre || null,
      });
    }
  }

  const vehiculosById = new Map(
    (flota || []).map((gt) => [String(gt.id), gt]),
  );
  const blocks = [];
  for (const p of propuestas) {
    blocks.push(
      ...buildArtistaTrasladoAgendaBlocks({
        idPropuesta: p.id,
        propuestaRoutes,
        eventsById,
        vehiculosById,
        labelVehicle: labelGiraTransporte,
      }),
    );
  }
  return { blocks, error: null };
}

/**
 * Timeline mínima (fecha+hora) de los extremos de rutas + el evento actual.
 * Fallback cuando el caller no pasa `sortedEvents` de la unidad.
 *
 * @param {unknown} idEvento
 * @param {Array<{ id_evento_subida?: unknown, id_evento_bajada?: unknown }>} rutas
 * @param {Array<{ id?: unknown }>|null|undefined} sortedEvents
 */
async function resolveRutaStopTimeline(idEvento, rutas, sortedEvents) {
  if (Array.isArray(sortedEvents) && sortedEvents.length > 0) {
    return sortedEvents;
  }
  const ids = [idEvento];
  for (const r of rutas || []) {
    if (r?.id_evento_subida != null && r.id_evento_subida !== "") {
      ids.push(r.id_evento_subida);
    }
    if (r?.id_evento_bajada != null && r.id_evento_bajada !== "") {
      ids.push(r.id_evento_bajada);
    }
  }
  const unique = [...new Set(ids.filter((id) => id != null && id !== "").map(String))];
  if (!unique.length) return [];
  const { data, error } = await supabase
    .from("eventos")
    .select("id, fecha, hora_inicio, hora_fin")
    .in("id", unique)
    .or("is_deleted.is.null,is_deleted.eq.false");
  if (error) return [];
  return sortEventsBySchedule(data || []);
}

/**
 * Hard-block: Σ plazas de rutas del artista (excl. fila en edición) + nuevas ≤ para_transporte.
 * @param {number} idPropuesta
 * @param {number} plazas
 * @param {number|string|null|undefined} excludeRutaId
 */
async function assertPropuestaRutaWithinTransportCap(
  idPropuesta,
  plazas,
  excludeRutaId,
  opts = {},
) {
  let prop = opts.propuesta || null;
  if (!prop) {
    const { data, error: eProp } = await supabase
      .from("fimba_propuestas")
      .select("id, nombre, cantidad_planificada, plazas_extra_materiales")
      .eq("id", idPropuesta)
      .maybeSingle();
    if (eProp) return { error: eProp };
    prop = data;
  }
  if (!prop) {
    return { error: new Error("Artista (propuesta) no encontrado") };
  }
  let rutas = opts.rutas;
  if (!Array.isArray(rutas)) {
    const { data, error: eR } = await supabase
      .from("fimba_propuesta_rutas")
      .select("id, plazas, id_propuesta, id_evento_subida, id_evento_bajada")
      .eq("id_propuesta", idPropuesta);
    if (eR) return { error: eR };
    rutas = data || [];
  }
  const excludeRutaIds =
    excludeRutaId != null && excludeRutaId !== "" ? [excludeRutaId] : [];
  const used = sumPropuestaRutasPlazas(rutas || [], idPropuesta, {
    excludeRutaIds,
    eventId: opts.eventId,
    sortedEvents: opts.sortedEvents,
  });
  const check = validateArtistaTransporteAssign(prop, used, plazas);
  if (!check.ok) return { error: check.error };
  return { error: null };
}

/**
 * Alta o actualización de parada subida/bajada con plazas para un artista.
 *
 * Subida: nuevo ride (consume tope = plazas a bordo). Tras una bajada las
 * plazas se liberan y se puede volver a subir (otro ride) en la misma unidad.
 * Conflicto solo si ya hay un ride **a bordo en esta parada** (no un ride
 * abierto de un tramo posterior).
 *
 * Bajada: cierra el ride abierto (set `id_evento_bajada`). No crea un ride
 * nuevo ni consume tope: libera ocupación del bus y del artista. Sin subida
 * abierta → error (no está a bordo).
 *
 * @param {{
 *   id_propuesta: number|string,
 *   id_gira_transporte: number|string,
 *   plazas: number,
 *   type: 'up'|'down',
 *   id_evento: number|string,
 *   replaceConflict?: boolean,
 *   asientos_equipaje?: number|null,
 *   observaciones_equipaje?: string|null,
 *   skipCapAssert?: boolean,
 *   propuesta?: object|null,
 *   sortedEvents?: Array<{ id?: unknown }>|null,
 * }} payload
 */
export async function upsertFimbaPropuestaRutaStop(payload) {
  const idPropuesta = Number(payload.id_propuesta);
  const idGt = Number(payload.id_gira_transporte);
  const idEvento = Number(payload.id_evento);
  const plazas = Math.max(0, Number(payload.plazas) || 0);
  const type = payload.type === "down" ? "down" : "up";
  const field = type === "up" ? "id_evento_subida" : "id_evento_bajada";
  const skipCapAssert = Boolean(payload.skipCapAssert);
  const hasEquipajeSeats = Object.prototype.hasOwnProperty.call(
    payload,
    "asientos_equipaje",
  );
  const hasEquipajeObs = Object.prototype.hasOwnProperty.call(
    payload,
    "observaciones_equipaje",
  );
  const asientosEquipaje = hasEquipajeSeats
    ? Math.max(0, Number(payload.asientos_equipaje) || 0)
    : null;
  const observacionesEquipaje = hasEquipajeObs
    ? String(payload.observaciones_equipaje || "").trim() || null
    : undefined;

  const luggagePatch = {};
  if (hasEquipajeSeats) luggagePatch.asientos_equipaje = asientosEquipaje;
  if (hasEquipajeObs) {
    luggagePatch.observaciones_equipaje = observacionesEquipaje;
  }

  if (!Number.isFinite(idPropuesta) || !Number.isFinite(idGt) || !Number.isFinite(idEvento)) {
    return { ruta: null, error: new Error("propuesta, vehículo y evento son requeridos") };
  }
  if (plazas <= 0) {
    return { ruta: null, error: new Error("Indicá una cantidad de plazas > 0") };
  }

  const { data: existingRows, error: eList } = await supabase
    .from("fimba_propuesta_rutas")
    .select(FIMBA_PROPUESTA_RUTA_SELECT)
    .eq("id_propuesta", idPropuesta)
    .eq("id_gira_transporte", idGt)
    .order("id", { ascending: true });
  if (eList) return { ruta: null, error: eList };
  const list = existingRows || [];
  const timeline = await resolveRutaStopTimeline(
    idEvento,
    list,
    payload.sortedEvents,
  );
  const capOpts = {
    propuesta: payload.propuesta || null,
    eventId: idEvento,
    sortedEvents: timeline,
  };

  const assertCap = async (excludeId) => {
    if (skipCapAssert || type !== "up") return { error: null };
    return assertPropuestaRutaWithinTransportCap(
      idPropuesta,
      plazas,
      excludeId,
      capOpts,
    );
  };

  const same = list.find(
    (r) => r[field] != null && String(r[field]) === String(idEvento),
  );
  if (same) {
    const capCheck = await assertCap(same.id);
    if (capCheck.error) return { ruta: null, error: capCheck.error };
    const { data, error } = await supabase
      .from("fimba_propuesta_rutas")
      .update({
        plazas,
        ...luggagePatch,
        updated_at: new Date().toISOString(),
      })
      .eq("id", same.id)
      .select(FIMBA_PROPUESTA_RUTA_SELECT)
      .single();
    if (error) return { ruta: null, error };
    return { ruta: data, error: null };
  }

  const openRides = list.filter((r) => isOpenFimbaRide(r));
  const occupyingOpen = openRides.filter((r) =>
    isFimbaRideAboardAtStop(r, idEvento, timeline),
  );

  if (type === "down") {
    const openRide = occupyingOpen.length
      ? occupyingOpen[occupyingOpen.length - 1]
      : null;
    if (openRide) {
      // Cerrar el ride: plazas del ride (editable) + liberar ocupación.
      const { data, error } = await supabase
        .from("fimba_propuesta_rutas")
        .update({
          id_evento_bajada: idEvento,
          plazas,
          ...luggagePatch,
          updated_at: new Date().toISOString(),
        })
        .eq("id", openRide.id)
        .select(FIMBA_PROPUESTA_RUTA_SELECT)
        .single();
      if (error) return { ruta: null, error };
      return { ruta: data, error: null, completed: true };
    }
    return {
      ruta: null,
      error: new Error(
        "Este artista no está a bordo de este vehículo. Asigná primero una subida.",
      ),
    };
  }

  // type === up
  if (occupyingOpen.length) {
    const openRide = occupyingOpen[occupyingOpen.length - 1];
    if (!payload.replaceConflict) {
      return {
        ruta: null,
        conflict: openRide,
        error: new Error(
          "Este artista ya está a bordo de este vehículo (falta la bajada)",
        ),
      };
    }
    const capCheck = await assertCap(openRide.id);
    if (capCheck.error) return { ruta: null, error: capCheck.error };
    const { data, error } = await supabase
      .from("fimba_propuesta_rutas")
      .update({
        id_evento_subida: idEvento,
        plazas,
        ...luggagePatch,
        updated_at: new Date().toISOString(),
      })
      .eq("id", openRide.id)
      .select(FIMBA_PROPUESTA_RUTA_SELECT)
      .single();
    if (error) return { ruta: null, error };
    return { ruta: data, error: null, replaced: true };
  }

  // Completar fila huérfana (solo bajada, sin subida) si esa bajada es
  // esta parada o una posterior (tramo válido). Si la bajada es anterior,
  // no reutilizar: crear ride nuevo.
  const bajadaOnly = [...list]
    .reverse()
    .find(
      (r) =>
        (r.id_evento_subida == null || r.id_evento_subida === "") &&
        r.id_evento_bajada != null &&
        r.id_evento_bajada !== "",
    );
  const bajadaOnlyUsable = (() => {
    if (!bajadaOnly) return false;
    const downIdx = indexOfEvent(timeline, bajadaOnly.id_evento_bajada);
    const curIdx = indexOfEvent(timeline, idEvento);
    if (curIdx < 0 || downIdx < 0) return true;
    return downIdx >= curIdx;
  })();
  if (bajadaOnly && bajadaOnlyUsable) {
    const capCheck = await assertCap(bajadaOnly.id);
    if (capCheck.error) return { ruta: null, error: capCheck.error };
    const { data, error } = await supabase
      .from("fimba_propuesta_rutas")
      .update({
        id_evento_subida: idEvento,
        plazas,
        ...luggagePatch,
        updated_at: new Date().toISOString(),
      })
      .eq("id", bajadaOnly.id)
      .select(FIMBA_PROPUESTA_RUTA_SELECT)
      .single();
    if (error) return { ruta: null, error };
    return { ruta: data, error: null, completed: true };
  }

  const capCheck = await assertCap(null);
  if (capCheck.error) return { ruta: null, error: capCheck.error };

  const insertRow = {
    id_propuesta: idPropuesta,
    id_gira_transporte: idGt,
    plazas,
    asientos_equipaje: hasEquipajeSeats ? asientosEquipaje : 0,
    observaciones_equipaje: hasEquipajeObs ? observacionesEquipaje : null,
    id_evento_subida: idEvento,
    id_evento_bajada: null,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("fimba_propuesta_rutas")
    .insert(insertRow)
    .select(FIMBA_PROPUESTA_RUTA_SELECT)
    .single();
  if (error) return { ruta: null, error };
  return { ruta: data, error: null };
}

/**
 * «Bajar todo»: cierra todos los rides FIMBA abiertos a bordo de este vehículo
 * en esta parada (artistas + plazas de sus rides). La reserva técnica residual
 * se aligera sola en el modelo sintético (hop → siguiente parada).
 * OFRN: usar `alightAllOfrnAboardAtStop` (pestaña Orquesta / StopRules).
 *
 * @param {{
 *   edicionId: number|string,
 *   id_gira_transporte: number|string,
 *   id_evento: number|string,
 *   propuestas?: Array<{ id?: unknown }>|null,
 *   sortedEvents?: Array<{ id?: unknown }>|null,
 * }} opts
 */
export async function alightAllFimbaAboardAtStop(opts = {}) {
  const edicionId = opts.edicionId;
  const idGt = Number(opts.id_gira_transporte);
  const idEvento = Number(opts.id_evento);
  if (!edicionId || !Number.isFinite(idGt) || !Number.isFinite(idEvento)) {
    return {
      closed: 0,
      rutas: [],
      error: new Error("edición, vehículo y evento son requeridos"),
    };
  }

  const { rutas, error: eList } = await listFimbaPropuestaRutas(edicionId, {
    id_gira_transporte: idGt,
    propuestas: opts.propuestas || null,
  });
  if (eList) return { closed: 0, rutas: [], error: eList };

  const sorted = opts.sortedEvents || [];
  const targets = (rutas || []).filter((r) => {
    if (Number(r.id_gira_transporte) !== idGt) return false;
    if (!isOpenFimbaRide(r)) {
      // Ya bajó en este evento: nada que hacer
      return false;
    }
    return isFimbaRideAboardAtStop(r, idEvento, sorted);
  });

  const closed = [];
  const results = await Promise.all(
    targets.map((r) =>
      upsertFimbaPropuestaRutaStop({
        id_propuesta: r.id_propuesta,
        id_gira_transporte: idGt,
        plazas: Math.max(0, Number(r.plazas) || 0),
        type: "down",
        id_evento: idEvento,
        replaceConflict: true,
        asientos_equipaje: Math.max(0, Number(r.asientos_equipaje) || 0),
        observaciones_equipaje: r.observaciones_equipaje ?? null,
        skipCapAssert: true,
      }),
    ),
  );
  for (const res of results) {
    if (res.error) {
      return { closed: closed.length, rutas: closed, error: res.error };
    }
    if (res.ruta) closed.push(res.ruta);
  }

  return { closed: closed.length, rutas: closed, error: null };
}

/**
 * Cierra rides OFRN abiertos: fija `id_evento_bajada` en reglas Persona
 * (fuerza 5) para los integrantes indicados, o crea la regla si no existe.
 * Reutiliza la jerarquía de `giras_logistica_rutas` (no inventa matching).
 *
 * @param {{
 *   giraId: number|string,
 *   id_transporte_fisico: number|string,
 *   id_evento: number|string,
 *   integranteIds: Array<number|string>,
 * }} opts
 */
export async function alightOfrnPeopleAtStop(opts = {}) {
  const giraId = Number(opts.giraId);
  const tid = Number(opts.id_transporte_fisico);
  const idEvento = Number(opts.id_evento);
  const ids = [
    ...new Set(
      (opts.integranteIds || []).map(Number).filter(Number.isFinite),
    ),
  ];
  if (
    !Number.isFinite(giraId) ||
    !Number.isFinite(tid) ||
    !Number.isFinite(idEvento)
  ) {
    return {
      closed: 0,
      rules: [],
      error: new Error("gira, vehículo y evento son requeridos"),
    };
  }
  if (ids.length === 0) {
    return { closed: 0, rules: [], error: null };
  }

  const { data: existingAll, error: eList } = await supabase
    .from("giras_logistica_rutas")
    .select("*")
    .eq("id_gira", giraId)
    .eq("id_transporte_fisico", tid);
  if (eList) return { closed: 0, rules: [], error: eList };

  const closed = [];
  for (const integranteId of ids) {
    const personaRules = (existingAll || []).filter(
      (r) =>
        ["persona", "integrante"].includes(normalize(r.alcance)) &&
        String(r.id_integrante) === String(integranteId),
    );

    const alreadyHere = personaRules.find(
      (r) =>
        r.id_evento_bajada != null &&
        String(r.id_evento_bajada) === String(idEvento),
    );
    if (alreadyHere) {
      closed.push(alreadyHere);
      continue;
    }

    const openPersona = personaRules.find(
      (r) => r.id_evento_bajada == null || r.id_evento_bajada === "",
    );
    if (openPersona) {
      const { data, error } = await supabase
        .from("giras_logistica_rutas")
        .update({ id_evento_bajada: idEvento })
        .eq("id", openPersona.id)
        .select("*")
        .maybeSingle();
      if (error) return { closed: closed.length, rules: closed, error };
      if (data) {
        closed.push(data);
        openPersona.id_evento_bajada = idEvento;
      }
      continue;
    }

    const otherBajada = personaRules.find(
      (r) =>
        r.id_evento_bajada != null &&
        String(r.id_evento_bajada) !== String(idEvento),
    );
    if (otherBajada) {
      const { data, error } = await supabase
        .from("giras_logistica_rutas")
        .update({ id_evento_bajada: idEvento })
        .eq("id", otherBajada.id)
        .select("*")
        .maybeSingle();
      if (error) return { closed: closed.length, rules: closed, error };
      if (data) closed.push(data);
      continue;
    }

    const { data, error } = await supabase
      .from("giras_logistica_rutas")
      .insert([
        {
          id_gira: giraId,
          id_transporte_fisico: tid,
          alcance: "Persona",
          prioridad: 5,
          id_integrante: integranteId,
          id_evento_subida: null,
          id_evento_bajada: idEvento,
          target_ids: [],
        },
      ])
      .select("*")
      .maybeSingle();
    if (error) return { closed: closed.length, rules: closed, error };
    if (data) {
      closed.push(data);
      existingAll.push(data);
    }
  }

  return { closed: closed.length, rules: closed, error: null };
}

/**
 * «Bajar todo» OFRN: genera bajadas Persona para quienes están a bordo
 * (ride abierto) en este vehículo/parada.
 *
 * @param {{
 *   giraId: number|string,
 *   id_transporte_fisico: number|string,
 *   id_evento: number|string,
 *   passengers?: Array<object>,
 *   sortedEvents?: Array<{ id?: unknown }>,
 * }} opts
 */
export async function alightAllOfrnAboardAtStop(opts = {}) {
  const aboard = listOfrnPeopleAboardAtStop({
    passengers: opts.passengers || [],
    transportId: opts.id_transporte_fisico,
    eventId: opts.id_evento,
    sortedEvents: opts.sortedEvents || [],
  }).filter((row) => row.openRide && !row.alreadyAlightingHere);

  return alightOfrnPeopleAtStop({
    giraId: opts.giraId,
    id_transporte_fisico: opts.id_transporte_fisico,
    id_evento: opts.id_evento,
    integranteIds: aboard.map((r) => r.id),
  });
}

/**
 * @param {number|string} rutaId
 */
export async function deleteFimbaPropuestaRuta(rutaId) {
  const id = Number(rutaId);
  if (!Number.isFinite(id)) {
    return { error: new Error("id de ruta requerido") };
  }
  const { error } = await supabase
    .from("fimba_propuesta_rutas")
    .delete()
    .eq("id", id);
  return { error };
}

/**
 * Quita solo la parada de subida o bajada; borra la fila si queda sin extremos.
 * @param {number|string} rutaId
 * @param {'up'|'down'} type
 */
export async function clearFimbaPropuestaRutaStop(rutaId, type) {
  const id = Number(rutaId);
  if (!Number.isFinite(id)) {
    return { error: new Error("id de ruta requerido"), deleted: false, ruta: null };
  }
  const field = type === "down" ? "id_evento_bajada" : "id_evento_subida";
  const other = type === "down" ? "id_evento_subida" : "id_evento_bajada";

  const { data: row, error: e1 } = await supabase
    .from("fimba_propuesta_rutas")
    .select(FIMBA_PROPUESTA_RUTA_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (e1) return { error: e1, deleted: false, ruta: null };
  if (!row) return { error: null, deleted: false, ruta: null };

  if (row[other] == null) {
    const { error } = await deleteFimbaPropuestaRuta(id);
    return { error, deleted: !error, ruta: null, deletedId: id };
  }

  const { data, error } = await supabase
    .from("fimba_propuesta_rutas")
    .update({ [field]: null, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select(FIMBA_PROPUESTA_RUTA_SELECT)
    .single();
  return { error, deleted: false, ruta: data || null };
}

/**
 * Reemplaza tags artista ↔ evento.
 * @param {number|string} eventoId
 * @param {Array<number|string>} propuestaIds
 */
export async function setEventoFimbaPropuestas(eventoId, propuestaIds) {
  const id = Number(eventoId);
  const want = [...new Set((propuestaIds || []).map(Number).filter(Number.isFinite))];
  const { data: existing, error: e1 } = await supabase
    .from("eventos_fimba_propuestas")
    .select("id, id_propuesta")
    .eq("id_evento", id);
  if (e1) return { error: e1 };

  const have = new Set((existing || []).map((r) => Number(r.id_propuesta)));
  const wantSet = new Set(want);
  const toDelete = (existing || []).filter((r) => !wantSet.has(Number(r.id_propuesta)));
  const toInsert = want.filter((pid) => !have.has(pid));

  if (toDelete.length && toInsert.length) {
    const [delRes, insRes] = await Promise.all([
      supabase
        .from("eventos_fimba_propuestas")
        .delete()
        .in(
          "id",
          toDelete.map((r) => r.id),
        ),
      supabase.from("eventos_fimba_propuestas").insert(
        toInsert.map((id_propuesta) => ({ id_evento: id, id_propuesta })),
      ),
    ]);
    if (delRes.error) return { error: delRes.error };
    if (insRes.error) return { error: insRes.error };
    return { error: null };
  }
  if (toDelete.length) {
    const { error } = await supabase
      .from("eventos_fimba_propuestas")
      .delete()
      .in(
        "id",
        toDelete.map((r) => r.id),
      );
    if (error) return { error };
  }
  if (toInsert.length) {
    const { error } = await supabase.from("eventos_fimba_propuestas").insert(
      toInsert.map((id_propuesta) => ({ id_evento: id, id_propuesta })),
    );
    if (error) return { error };
  }
  return { error: null };
}

/**
 * Reemplaza asignaciones multi-vehículo (solo ids de giras_transportes existentes).
 * SIN SERVICIO ⇒ lista vacía.
 * @param {number|string} eventoId
 * @param {Array<{ id_gira_transporte: number|string, plazas?: number }>} assignments
 */
export async function setFimbaEventoTransportes(eventoId, assignments) {
  const id = Number(eventoId);
  const rows = (assignments || [])
    .map((a) => ({
      id_evento: id,
      id_gira_transporte: Number(a.id_gira_transporte),
      plazas: Math.max(0, Number(a.plazas) || 0),
    }))
    .filter((a) => Number.isFinite(a.id_gira_transporte));

  const { error: delErr } = await supabase
    .from("fimba_evento_transportes")
    .delete()
    .eq("id_evento", id);
  if (delErr) return { error: delErr };

  if (rows.length === 0) return { rows: [], error: null };

  const { data, error } = await supabase
    .from("fimba_evento_transportes")
    .insert(rows)
    .select(FIMBA_EVENTO_TRANSPORTE_SELECT);
  if (error) return { rows: [], error };
  return { rows: data || [], error: null };
}

/**
 * Actualiza (o crea) plazas técnicas de una unidad en un evento sin tocar
 * el resto de asignaciones `fimba_evento_transportes`.
 * `plazas = 0` elimina la fila de esa unidad.
 *
 * @param {number|string} eventoId
 * @param {number|string} idGiraTransporte
 * @param {number} plazas
 */
export async function upsertFimbaEventoTransportePlazas(
  eventoId,
  idGiraTransporte,
  plazas,
) {
  const idEv = Number(eventoId);
  const idGt = Number(idGiraTransporte);
  const n = Math.max(0, Number(plazas) || 0);
  if (!Number.isFinite(idEv) || !Number.isFinite(idGt)) {
    return {
      row: null,
      error: new Error("evento y vehículo son requeridos"),
    };
  }

  const { data: existing, error: eFind } = await supabase
    .from("fimba_evento_transportes")
    .select(FIMBA_EVENTO_TRANSPORTE_SELECT)
    .eq("id_evento", idEv)
    .eq("id_gira_transporte", idGt)
    .maybeSingle();
  if (eFind) return { row: null, error: eFind };

  if (n <= 0) {
    if (!existing) return { row: null, error: null, deleted: true };
    const { error } = await supabase
      .from("fimba_evento_transportes")
      .delete()
      .eq("id", existing.id);
    return { row: null, error, deleted: true };
  }

  if (existing) {
    const { data, error } = await supabase
      .from("fimba_evento_transportes")
      .update({ plazas: n })
      .eq("id", existing.id)
      .select(FIMBA_EVENTO_TRANSPORTE_SELECT)
      .single();
    if (error) return { row: null, error };
    return { row: data, error: null };
  }

  const { data, error } = await supabase
    .from("fimba_evento_transportes")
    .insert({
      id_evento: idEv,
      id_gira_transporte: idGt,
      plazas: n,
    })
    .select(FIMBA_EVENTO_TRANSPORTE_SELECT)
    .single();
  if (error) return { row: null, error };
  return { row: data, error: null, created: true };
}

/**
 * Crea o actualiza un evento de agenda FIMBA (traslado u otra actividad).
 * Siempre usa id_gira de la edición; audiencia_ofrn default 'none'.
 * Grupos OFRN: cuando audiencia_ofrn='grupos', reemplaza `eventos_grupos`
 * (misma semántica que UnifiedAgenda/EventForm vía setEventoGrupos).
 *
 * @param {object} payload
 * @param {number|string} payload.id_gira — de la edición (siempre)
 * @param {number|string} [payload.id] — si edita
 * @param {string} payload.fecha
 * @param {string} [payload.hora_inicio]
 * @param {string} [payload.hora_fin]
 * @param {string} [payload.actividad] — Detalle / título (HTML rich-text OK; parte libre de `eventos.descripcion`)
 * @param {string} [payload.detalle] — alias de `actividad`
 * @param {string} [payload.destino]
 * @param {string} [payload.vuelo]
 * @param {string} [payload.observaciones] — alias de observaciones_equipaje
 * @param {string} [payload.observaciones_equipaje]
 * @param {string|null} [payload.observaciones_internas] — HTML staff-only; omit to leave unchanged
 * @param {number} [payload.asientos_equipaje] — asientos de equipaje (no headcount)
 * @param {number} [payload.pax] — alias legacy de asientos_equipaje
 * @param {boolean} [payload.sin_servicio]
 * @param {boolean} [payload.usa_transporte] — fuerza UI de flota; default por id_tipo_evento
 * @param {Array<{ id_gira_transporte: number|string, plazas?: number }>} [payload.vehiculos]
 * @param {Array<number|string>} [payload.id_propuestas] — tags artistas
 * @param {Array<number|string>} [payload.id_grupos] — ids giras_grupos si audiencia grupos
 * @param {number} [payload.id_tipo_evento] — FK tipos_evento; default genérico (16) o traslado (11)
 * @param {'none'|'tutti'|'grupos'} [payload.audiencia_ofrn] — default 'none'
 * @param {number|string|null} [payload.id_locacion] — FK locaciones (parada / destino)
 * @param {Array} [payload.logisticsSummary] — cache OFRN (evita refetch en availability)
 * @param {Array} [payload.propuestaRoutes] — cache rutas FIMBA
 * @param {boolean} [payload.clientValidated] — UI ya validó cupos; salta recheck availability
 */
export async function saveFimbaEvento(payload) {
  const idGira = Number(payload.id_gira);
  if (!Number.isFinite(idGira)) {
    return { evento: null, error: new Error("id_gira requerido") };
  }
  if (!payload.fecha) {
    return { evento: null, error: new Error("Fecha requerida") };
  }

  const tipoId =
    payload.id_tipo_evento != null && payload.id_tipo_evento !== ""
      ? Number(payload.id_tipo_evento)
      : FIMBA_DEFAULT_TIPO_EVENTO;
  if (!Number.isFinite(tipoId)) {
    return { evento: null, error: new Error("Tipo de evento requerido (tipos_evento)") };
  }
  const usaTransporte =
    payload.usa_transporte != null
      ? Boolean(payload.usa_transporte)
      : actividadUsaTransporte(tipoId);

  const sinServicio = usaTransporte ? Boolean(payload.sin_servicio) : true;
  const vehiculos = sinServicio || !usaTransporte ? [] : payload.vehiculos || [];
  if (usaTransporte && !sinServicio && vehiculos.length === 0) {
    return {
      evento: null,
      error: new Error("Elegí al menos un vehículo de la flota OFRN, o marcá SIN SERVICIO"),
    };
  }

  let audienciaOfrn = ["none", "tutti", "grupos"].includes(payload.audiencia_ofrn)
    ? payload.audiencia_ofrn
    : "none";

  const rawGrupoIds = [
    ...new Set(
      (payload.id_grupos || payload.grupo_ids || [])
        .map(Number)
        .filter((id) => Number.isFinite(id) && id > 0),
    ),
  ];

  // Si el usuario eligió grupos reales, forzar modo grupos
  if (rawGrupoIds.length > 0 && audienciaOfrn === "none") {
    audienciaOfrn = "grupos";
  }
  if (audienciaOfrn === "grupos" && rawGrupoIds.length === 0) {
    return {
      evento: null,
      error: new Error("Seleccioná al menos un grupo OFRN de la gira"),
    };
  }
  const grupoIds = audienciaOfrn === "grupos" ? rawGrupoIds : [];

  const needFlota = vehiculos.length > 0;
  const needGrupos = grupoIds.length > 0;

  /** @type {Array<object>} */
  let flotaOwned = [];

  // Pre-checks independientes en paralelo (antes: 3–4 round-trips secuenciales)
  const preTasks = [];
  if (needFlota) {
    const ids = vehiculos.map((v) => Number(v.id_gira_transporte));
    preTasks.push(
      supabase
        .from("giras_transportes")
        .select(GIRA_TRANSPORTE_SELECT)
        .eq("id_gira", idGira)
        .in("id", ids)
        .then(({ data, error }) => ({ key: "flota", data, error, ids })),
    );
  }
  if (needGrupos) {
    preTasks.push(
      supabase
        .from("giras_grupos")
        .select("id")
        .eq("id_gira", idGira)
        .in("id", grupoIds)
        .then(({ data, error }) => ({ key: "grupos", data, error })),
    );
  }

  if (preTasks.length) {
    const settled = await Promise.all(preTasks);
    for (const t of settled) {
      if (t.error) return { evento: null, error: t.error };
      if (t.key === "flota") {
        flotaOwned = t.data || [];
        const ownedSet = new Set(flotaOwned.map((r) => Number(r.id)));
        const invalid = (t.ids || []).filter((id) => !ownedSet.has(id));
        if (invalid.length) {
          return {
            evento: null,
            error: new Error(
              "Uno o más vehículos no pertenecen a la flota de la gira OFRN. Configurá la flota en Logística → Transporte.",
            ),
          };
        }
        const checkCapAsientos = validateEventoTransportPlazasVsCapacidad(
          vehiculos,
          flotaOwned,
        );
        if (!checkCapAsientos.ok) {
          return { evento: null, error: checkCapAsientos.error };
        }
      }
      if (t.key === "grupos") {
        const ownedSet = new Set((t.data || []).map((r) => Number(r.id)));
        const invalid = grupoIds.filter((id) => !ownedSet.has(id));
        if (invalid.length) {
          return {
            evento: null,
            error: new Error(
              "Uno o más grupos no pertenecen a la gira OFRN de esta edición.",
            ),
          };
        }
      }
    }
  }

  // Hard-block libres: salta si la UI ya validó; si no, usa caches para no
  // recargar logistics OFRN + todas las rutas.
  if (
    !payload.clientValidated &&
    vehiculos.length > 0 &&
    payload.fecha &&
    flotaOwned.length > 0
  ) {
    const excludeId =
      payload.id != null && payload.id !== "" ? Number(payload.id) : null;
    const { byId, error: eAv } = await listVehiclesAvailability(
      idGira,
      flotaOwned,
      {
        fecha: payload.fecha,
        hora_inicio: payload.hora_inicio || null,
        hora_fin: payload.hora_fin || null,
      },
      Number.isFinite(excludeId) ? excludeId : null,
      {
        logisticsSummary:
          payload.logisticsSummary != null
            ? payload.logisticsSummary
            : undefined,
        propuestaRoutes:
          payload.propuestaRoutes != null ? payload.propuestaRoutes : undefined,
      },
    );
    if (eAv) return { evento: null, error: eAv };
    const checkLibres = validateEventoTransportPlazasVsLibres(vehiculos, byId);
    if (!checkLibres.ok) {
      return { evento: null, error: checkLibres.error };
    }
  }

  const asientosEquipaje = Math.max(
    0,
    Number(
      payload.asientos_equipaje != null && payload.asientos_equipaje !== ""
        ? payload.asientos_equipaje
        : payload.pax,
    ) || 0,
  );
  const observacionesEquipaje = String(
    payload.observaciones_equipaje ?? payload.observaciones ?? "",
  ).trim();

  // Transporte: destino no se persiste en el evento; se deriva del next stop.
  const descripcion = encodeFimbaTrasladoDescripcion({
    actividad: payload.actividad ?? payload.detalle,
    destino: usaTransporte ? "" : payload.destino,
    vuelo: payload.vuelo,
  });

  const row = {
    id_gira: idGira,
    fecha: payload.fecha,
    hora_inicio: normalizeTime(payload.hora_inicio),
    hora_fin: normalizeTime(payload.hora_fin),
    descripcion: descripcion || null,
    // audiencia ya no es tope de pasajeros FIMBA; se mantiene en sync legacy
    // con asientos_equipaje para lecturas viejas.
    audiencia: asientosEquipaje || null,
    asientos_equipaje: asientosEquipaje || null,
    observaciones_equipaje: observacionesEquipaje || null,
    audiencia_ofrn: audienciaOfrn,
    id_tipo_evento: tipoId,
    visible_agenda: payload.visible_agenda !== false,
    updated_at: new Date().toISOString(),
  };

  if (Object.prototype.hasOwnProperty.call(payload, "observaciones_internas")) {
    row.observaciones_internas = normalizeEventosInternasHtml(
      payload.observaciones_internas,
    );
  }

  if (Object.prototype.hasOwnProperty.call(payload, "observaciones_aforo")) {
    row.observaciones_aforo =
      String(payload.observaciones_aforo ?? "").trim() || null;
  }

  // Locación opcional (destino de planilla / parada). null limpia; omitir en payload no toca en edit.
  if (Object.prototype.hasOwnProperty.call(payload, "id_locacion")) {
    const locRaw = payload.id_locacion;
    if (locRaw == null || locRaw === "") {
      row.id_locacion = null;
    } else {
      const locN = Number(locRaw);
      row.id_locacion = Number.isFinite(locN) ? locN : null;
    }
  }

  // Multi-vehículo FIMBA → fimba_evento_transportes. En create dejamos
  // id_gira_transporte null; en edit no se toca para no romper paradas OFRN
  // que usan el FK single-vehicle de la gira.
  const isEdit = payload.id != null && payload.id !== "";
  if (!isEdit) {
    row.id_gira_transporte = null;
  }

  let evento;
  let error;
  if (isEdit) {
    ({ data: evento, error } = await supabase
      .from("eventos")
      .update(row)
      .eq("id", Number(payload.id))
      .select(
        "id, id_gira, id_tipo_evento, fecha, hora_inicio, hora_fin, descripcion, audiencia, asientos_equipaje, observaciones_equipaje, observaciones_internas, observaciones_aforo, audiencia_ofrn, id_gira_transporte",
      )
      .single());
  } else {
    ({ data: evento, error } = await supabase
      .from("eventos")
      .insert(row)
      .select(
        "id, id_gira, id_tipo_evento, fecha, hora_inicio, hora_fin, descripcion, audiencia, asientos_equipaje, observaciones_equipaje, observaciones_internas, observaciones_aforo, audiencia_ofrn, id_gira_transporte",
      )
      .single());
  }
  if (error) return { evento: null, error };

  // Tags / vehículos / grupos son independientes → paralelo
  const [tagRes, vehRes, gruposRes] = await Promise.all([
    setEventoFimbaPropuestas(evento.id, payload.id_propuestas || []),
    setFimbaEventoTransportes(evento.id, vehiculos),
    setEventoGrupos(supabase, evento.id, grupoIds),
  ]);
  if (tagRes.error) return { evento: null, error: tagRes.error };
  if (vehRes.error) return { evento: null, error: vehRes.error };
  if (gruposRes.error) return { evento: null, error: gruposRes.error };

  return { evento, error: null };
}

/**
 * Sufijo « - Copia» sobre Detalle / actividad (paridad OFRN). Respeta HTML.
 */
function actividadWithCopiaSuffix(actividad) {
  const raw = String(actividad || "").trim();
  if (!raw) return "Copia";
  const plain = raw
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/(p|div|li|h[1-6])>/gi, " ")
    .replace(/<[^>]*>?/gm, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (/-\s*Copia$/i.test(plain)) return raw;
  return `${raw} - Copia`;
}

/**
 * Duplica un evento FIMBA (shell + tags + flota/plazas + audiencia).
 * **No** copia `fimba_propuesta_rutas` ni reglas OFRN de boarding.
 * Añade « - Copia» al Detalle. `clientValidated: true` evita hard-block de
 * libres mientras el original sigue en la misma ventana.
 *
 * @param {object} source — fila mapeada de agenda/trayectos
 * @param {object} [opts]
 * @param {number|string} [opts.id_gira]
 * @param {number|string} [opts.lockPropuesta]
 * @param {boolean} [opts.appendCopia=true]
 * @param {boolean} [opts.usa_transporte]
 * @param {Array} [opts.logisticsSummary]
 * @param {Array} [opts.propuestaRoutes]
 * @returns {Promise<{ evento: object|null, error: Error|null }>}
 */
export async function duplicateFimbaEvento(source, opts = {}) {
  if (source == null || source.id == null) {
    return { evento: null, error: new Error("Evento origen requerido") };
  }
  if (source.es_ride_segment) {
    return {
      evento: null,
      error: new Error("No se puede duplicar un tramo sintético de a bordo"),
    };
  }
  const idGira = Number(source.id_gira ?? opts.id_gira);
  if (!Number.isFinite(idGira)) {
    return { evento: null, error: new Error("id_gira requerido") };
  }

  const propIds = [
    ...new Set(
      [
        ...(source.propuestas || []).map((p) => Number(p?.id ?? p)),
        opts.lockPropuesta != null && opts.lockPropuesta !== ""
          ? Number(opts.lockPropuesta)
          : null,
      ].filter((id) => Number.isFinite(id) && id > 0),
    ),
  ];

  const grupoIds = [
    ...new Set(
      eventGrupoIdsFromEvent(source)
        .map(Number)
        .filter((id) => Number.isFinite(id) && id > 0),
    ),
  ];

  let vehiculos = (source.vehiculos || [])
    .map((v) => ({
      id_gira_transporte: Number(v.id_gira_transporte),
      plazas: Math.max(0, Number(v.plazas) || 0),
    }))
    .filter(
      (v) =>
        Number.isFinite(v.id_gira_transporte) && v.id_gira_transporte > 0,
    );

  const ofrnUnitRaw = source.id_gira_transporte;
  const ofrnUnit =
    ofrnUnitRaw != null && ofrnUnitRaw !== ""
      ? Number(ofrnUnitRaw)
      : null;

  const tipoId =
    source.id_tipo_evento != null && source.id_tipo_evento !== ""
      ? Number(source.id_tipo_evento)
      : FIMBA_DEFAULT_TIPO_EVENTO;

  const usaTx =
    opts.usa_transporte != null
      ? Boolean(opts.usa_transporte)
      : actividadUsaTransporte(tipoId, source.tipos_evento);

  let sinServicio = Boolean(source.sin_servicio);
  if (
    usaTx &&
    vehiculos.length === 0 &&
    Number.isFinite(ofrnUnit) &&
    ofrnUnit > 0
  ) {
    vehiculos = [{ id_gira_transporte: ofrnUnit, plazas: 0 }];
    sinServicio = false;
  }
  if (usaTx && vehiculos.length === 0) {
    sinServicio = true;
  }

  const actividad =
    opts.appendCopia === false
      ? String(source.actividad || "")
      : actividadWithCopiaSuffix(source.actividad);

  let audienciaOfrn = ["none", "tutti", "grupos"].includes(source.audiencia_ofrn)
    ? source.audiencia_ofrn
    : "none";
  if (grupoIds.length > 0 && audienciaOfrn === "none") {
    audienciaOfrn = "grupos";
  }

  const { evento, error } = await saveFimbaEvento({
    id_gira: idGira,
    fecha: source.fecha,
    hora_inicio: source.hora_inicio || null,
    hora_fin: source.hora_fin || null,
    actividad,
    destino: source.destino || "",
    vuelo: source.vuelo || "",
    asientos_equipaje:
      source.asientos_equipaje != null && source.asientos_equipaje !== ""
        ? source.asientos_equipaje
        : source.pax,
    observaciones_equipaje:
      source.observaciones_equipaje || source.observaciones || "",
    observaciones_internas: normalizeEventosInternasHtml(
      source.observaciones_internas,
    ),
    observaciones_aforo:
      Number.isFinite(tipoId) && tipoId === 1
        ? String(source.observaciones_aforo ?? "").trim() || null
        : undefined,
    sin_servicio: usaTx ? sinServicio : true,
    usa_transporte: usaTx,
    vehiculos: sinServicio || !usaTx ? [] : vehiculos,
    id_propuestas: propIds,
    id_grupos: audienciaOfrn === "grupos" ? grupoIds : [],
    id_tipo_evento: Number.isFinite(tipoId) ? tipoId : FIMBA_DEFAULT_TIPO_EVENTO,
    audiencia_ofrn: audienciaOfrn,
    id_locacion:
      source.id_locacion != null && source.id_locacion !== ""
        ? source.id_locacion
        : null,
    visible_agenda: source.visible_agenda !== false,
    clientValidated: true,
    logisticsSummary: opts.logisticsSummary,
    propuestaRoutes: opts.propuestaRoutes,
  });

  if (error) return { evento: null, error };

  const propById = new Map(
    (source.propuestas || []).map((p) => [Number(p.id), p]),
  );
  const propuestasTagged = propIds.map((id) => propById.get(id) || { id });
  const gruposTagged = (source.grupos || []).filter((g) =>
    grupoIds.includes(Number(g.id)),
  );

  return {
    evento: {
      ...source,
      ...evento,
      id: evento.id,
      actividad,
      destino: source.destino || "",
      vuelo: source.vuelo || "",
      propuestas: propuestasTagged,
      grupos: gruposTagged,
      vehiculos: sinServicio || !usaTx
        ? []
        : vehiculos.map((v) => ({
            id_evento: evento.id,
            id_gira_transporte: v.id_gira_transporte,
            plazas: v.plazas,
          })),
      sin_servicio: usaTx ? sinServicio : true,
      asientos_equipaje: Math.max(
        0,
        Number(source.asientos_equipaje ?? source.pax) || 0,
      ),
      observaciones_equipaje:
        source.observaciones_equipaje || source.observaciones || "",
      audiencia_ofrn: audienciaOfrn,
      es_ride_segment: false,
      ride_kind: null,
    },
    error: null,
  };
}

/** Alias histórico del editor de transportes. */
export async function saveFimbaTraslado(payload) {
  return saveFimbaEvento({
    ...payload,
    id_tipo_evento: payload.id_tipo_evento ?? FIMBA_TIPO_EVENTO_TRASLADO,
    usa_transporte: true,
  });
}

/**
 * Patch liviano de planilla Transportes (modo edición / celdas inline).
 * Fecha / horas / descripcion (actividad, vuelo) + obs equipaje + `id_locacion`.
 * `stripDestino: true` limpia línea `Destino:` legacy (transporte derivado del next stop).
 * No toca flota, tags, grupos, `id_gira_transporte` ni rutas de boarding.
 */
export async function patchFimbaEventoPlanilla(eventoId, patch = {}) {
  const id = Number(eventoId);
  if (!Number.isFinite(id)) {
    return { evento: null, error: new Error("Evento inválido") };
  }
  const fecha = String(patch.fecha || "").trim();
  if (!fecha) {
    return { evento: null, error: new Error("Fecha requerida") };
  }

  const descripcion = encodeFimbaTrasladoDescripcion({
    actividad: patch.actividad,
    destino: patch.stripDestino ? "" : patch.destino,
    vuelo: patch.vuelo,
  });

  const row = {
    fecha,
    hora_inicio: normalizeTime(patch.hora_inicio),
    descripcion: descripcion || null,
    updated_at: new Date().toISOString(),
  };
  if (Object.prototype.hasOwnProperty.call(patch, "hora_fin")) {
    row.hora_fin = normalizeTime(patch.hora_fin);
  }

  if (
    Object.prototype.hasOwnProperty.call(patch, "observaciones") ||
    Object.prototype.hasOwnProperty.call(patch, "observaciones_equipaje")
  ) {
    row.observaciones_equipaje =
      String(
        patch.observaciones_equipaje ?? patch.observaciones ?? "",
      ).trim() || null;
  }
  if (Object.prototype.hasOwnProperty.call(patch, "asientos_equipaje")) {
    const n = Math.max(0, Number(patch.asientos_equipaje) || 0);
    row.asientos_equipaje = n || null;
    row.audiencia = n || null;
  }
  if (Object.prototype.hasOwnProperty.call(patch, "id_locacion")) {
    const locRaw = patch.id_locacion;
    if (locRaw == null || locRaw === "") {
      row.id_locacion = null;
    } else {
      const locN = Number(locRaw);
      row.id_locacion = Number.isFinite(locN) ? locN : null;
    }
  }

  const { data, error } = await supabase
    .from("eventos")
    .update(row)
    .eq("id", id)
    .select(
      "id, fecha, hora_inicio, hora_fin, descripcion, asientos_equipaje, observaciones_equipaje, audiencia, id_locacion, locaciones ( id, nombre, direccion, localidades ( id, localidad ) )",
    )
    .single();
  if (error) return { evento: null, error };

  const decoded = decodeFimbaTrasladoDescripcion(data.descripcion, {
    observaciones_equipaje: data.observaciones_equipaje,
  });
  const locNombre = data.locaciones?.nombre || null;
  return {
    evento: {
      ...data,
      ...decoded,
      locacion_nombre: locNombre,
      asientos_equipaje: Math.max(0, Number(data.asientos_equipaje) || 0),
      pax: Math.max(0, Number(data.asientos_equipaje ?? data.audiencia) || 0),
    },
    error: null,
  };
}

export async function deleteFimbaEvento(eventoId) {
  if (eventoId == null) return { error: new Error("id de evento requerido") };
  // CASCADE borra fimba_evento_transportes y eventos_fimba_propuestas
  const { error } = await supabase.from("eventos").delete().eq("id", Number(eventoId));
  return { error };
}

export async function deleteFimbaTraslado(eventoId) {
  return deleteFimbaEvento(eventoId);
}

// ---------------------------------------------------------------------------
// Hotelería / catálogo hoteles
// ---------------------------------------------------------------------------

/**
 * Catálogo compartido OFRN (`hoteles`) para selector FIMBA.
 */
export async function listHotelesCatalog(limit = 400) {
  const { data, error } = await supabase
    .from("hoteles")
    .select("id, nombre, localidades(localidad)")
    .order("nombre", { ascending: true })
    .limit(limit);
  if (error) return { hoteles: [], error };
  return { hoteles: data || [], error: null };
}

// ---------------------------------------------------------------------------
// Rooming / habitaciones (selects compartidos por hotelería batch)
// ---------------------------------------------------------------------------

const HABITACION_SELECT =
  "id, id_propuesta, tipo, matrimonial, orden, label, created_at, updated_at";

const OCUPANTE_SELECT =
  "id, id_habitacion, id_participante, orden, created_at, participante:id_participante ( id, id_propuesta, nombre, apellido, documento, genero, tipo_alimentacion, activo, checkin_at, checkout_at, id_evento_checkin, id_evento_checkout )";

function normalizeHabTipo(tipo) {
  const t = String(tipo || "").toUpperCase().trim();
  if (FIMBA_TIPO_HABITACION_CAPACIDAD[t] != null) return t;
  return null;
}

function assembleHabitacionRecords(habs, occs) {
  const byHab = new Map();
  for (const o of occs || []) {
    const list = byHab.get(o.id_habitacion) || [];
    list.push(o);
    byHab.set(o.id_habitacion, list);
  }
  return (habs || []).map((h) => {
    const ocupantes = byHab.get(h.id) || [];
    const capacidad = capacityForHabitacionTipo(h.tipo);
    return {
      ...h,
      matrimonial: h.tipo === "SGL" ? false : h.matrimonial === true,
      capacidad,
      ocupantes,
      plazas_ocupadas: ocupantes.length,
      plazas_libres: Math.max(0, capacidad - ocupantes.length),
    };
  });
}

/**
 * Participantes de varias propuestas en una sola query.
 * @param {Array<number|string>} propuestaIds
 */
export async function listFimbaParticipantesForPropuestas(propuestaIds) {
  const ids = [...new Set((propuestaIds || []).map(Number).filter(Boolean))];
  const byPropuesta = new Map();
  if (!ids.length) return { byPropuesta, error: null };
  const { data, error } = await supabase
    .from("fimba_participantes")
    .select(PARTICIPANTE_SELECT)
    .in("id_propuesta", ids)
    .order("apellido", { ascending: true })
    .order("nombre", { ascending: true });
  if (error) return { byPropuesta, error };
  for (const p of data || []) {
    const list = byPropuesta.get(p.id_propuesta) || [];
    list.push(p);
    byPropuesta.set(p.id_propuesta, list);
  }
  return { byPropuesta, error: null };
}

/**
 * Habitaciones + ocupantes de varias propuestas (2 queries batch).
 * @param {Array<number|string>} propuestaIds
 */
export async function listFimbaHabitacionesForPropuestas(propuestaIds) {
  const ids = [...new Set((propuestaIds || []).map(Number).filter(Boolean))];
  const byPropuesta = new Map();
  for (const id of ids) byPropuesta.set(id, []);
  if (!ids.length) return { byPropuesta, error: null };

  const { data: habs, error } = await supabase
    .from("fimba_propuestas_habitaciones")
    .select(HABITACION_SELECT)
    .in("id_propuesta", ids)
    .order("orden", { ascending: true })
    .order("id", { ascending: true });
  if (error) return { byPropuesta, error };
  if (!habs?.length) return { byPropuesta, error: null };

  const habIds = habs.map((h) => h.id);
  const { data: occs, error: eOcc } = await supabase
    .from("fimba_habitaciones_ocupantes")
    .select(OCUPANTE_SELECT)
    .in("id_habitacion", habIds)
    .order("orden", { ascending: true })
    .order("id", { ascending: true });
  if (eOcc) return { byPropuesta, error: eOcc };

  for (const h of assembleHabitacionRecords(habs, occs)) {
    const list = byPropuesta.get(h.id_propuesta) || [];
    list.push(h);
    byPropuesta.set(h.id_propuesta, list);
  }
  return { byPropuesta, error: null };
}

/**
 * Construye una fila de reporte hotelería (pura, sin I/O).
 */
export function buildFimbaHoteleriaRow(prop, participantes, habitaciones) {
  const checkinAt = stayDateFromEventOrMirror(prop, "checkin") ?? prop?.checkin_at;
  const checkoutAt =
    stayDateFromEventOrMirror(prop, "checkout") ?? prop?.checkout_at;
  const propStay = {
    ...prop,
    checkin_at: checkinAt,
    checkout_at: checkoutAt,
  };
  const occ = computeHotelOccupancy(propStay, participantes);
  const activos = (participantes || []).filter((p) => p.activo !== false);
  const sin_nombre = occ.por_confirmar;
  const requiereHotel = prop.requiere_hotel !== false;
  const requiereComidas = prop.requiere_comidas !== false;
  const camas_noche = requiereHotel ? occ.pax_noches || 0 : 0;
  const alimentacion = summarizeAlimentacion(participantes);
  const rooming = summarizeFimbaHabitaciones(habitaciones);
  const mealsStay = requiereComidas
    ? computeArtistaMealsPlan({
        id_propuesta: prop.id,
        artistaNombre: prop.nombre || "",
        checkin_at: checkinAt,
        checkout_at: checkoutAt,
        checkin_early: prop.checkin_early === true,
        checkout_late: prop.checkout_late === true,
        pax: occ.pax_planificada,
        participantes: activos,
      })
    : computeArtistaMealsPlan({
        id_propuesta: prop.id,
        artistaNombre: prop.nombre || "",
        checkin_at: null,
        checkout_at: null,
        pax: 0,
        participantes: [],
      });
  return {
    propuesta: propStay,
    hotel: prop.hoteles || null,
    checkin_at: checkinAt,
    checkout_at: checkoutAt,
    id_evento_checkin: prop.id_evento_checkin ?? null,
    id_evento_checkout: prop.id_evento_checkout ?? null,
    checkin_early: prop.checkin_early === true,
    checkout_late: prop.checkout_late === true,
    requiere_hotel: requiereHotel,
    requiere_comidas: requiereComidas,
    ...occ,
    sin_nombre,
    tope_personas: occ.pax_planificada,
    para_hotel_comida: occ.pax_planificada,
    total_pax_hotel: requiereHotel ? occ.pax_planificada : 0,
    camas_noche,
    alimentacion,
    meals_stay: mealsStay,
    comidas_totales: mealsStay.totals,
    personas: activos,
    participantes: activos,
    habitaciones: habitaciones || [],
    rooming,
    rooming_label: formatFimbaHabitacionesCounts(rooming.byTipo),
  };
}

function computeHoteleriaTotals(rows) {
  return (rows || []).reduce(
    (acc, b) => {
      if (b.requiere_hotel) {
        acc.pax += b.pax_planificada || 0;
        acc.nominados += b.nominados;
        acc.sin_nombre += b.sin_nombre;
        acc.camas_noche += b.camas_noche;
      }
      return acc;
    },
    { pax: 0, nominados: 0, sin_nombre: 0, camas_noche: 0 },
  );
}

/**
 * Reporte de hotelería por artista de una edición.
 * Pax hotel = cantidad_planificada (NO plazas_extra_materiales).
 * sin_nombre / por_confirmar = max(0, tope − nominados).
 * @param {number|string} edicionId
 * @param {{ id_propuesta?: number|string|null, edicion?: object|null, propuestas?: object[]|null }} [opts]
 */
export async function listFimbaHoteleria(edicionId, opts = {}) {
  if (edicionId == null || edicionId === "") {
    return { rows: [], blocks: [], totals: null, meals: null, edicion: null, error: null };
  }

  let edicion = opts.edicion ?? null;
  if (!edicion) {
    const { edicion: ed, error: eEd } = await getFimbaEdicionById(edicionId);
    if (eEd) return { rows: [], blocks: [], totals: null, meals: null, edicion: null, error: eEd };
    edicion = ed;
  }
  if (!edicion) {
    return {
      rows: [],
      blocks: [],
      totals: null,
      meals: null,
      edicion: null,
      error: new Error("Edición no encontrada"),
    };
  }

  let propuestas = opts.propuestas ?? null;
  if (!propuestas) {
    const { propuestas: props, error: eProp } = await listFimbaPropuestas(edicionId);
    if (eProp) return { rows: [], blocks: [], totals: null, meals: null, edicion, error: eProp };
    propuestas = props;
  }

  let props = sortFimbaPropuestasByNombre(propuestas || []);
  if (opts.id_propuesta != null && opts.id_propuesta !== "") {
    props = props.filter((p) => Number(p.id) === Number(opts.id_propuesta));
  }

  const propuestaIds = props.map((p) => p.id);
  const [{ byPropuesta: partsByProp, error: ePart }, { byPropuesta: habsByProp, error: eHab }] =
    await Promise.all([
      listFimbaParticipantesForPropuestas(propuestaIds),
      listFimbaHabitacionesForPropuestas(propuestaIds),
    ]);
  if (ePart) return { rows: [], blocks: [], totals: null, meals: null, edicion, error: ePart };
  if (eHab) return { rows: [], blocks: [], totals: null, meals: null, edicion, error: eHab };

  const rows = props.map((prop) =>
    buildFimbaHoteleriaRow(
      prop,
      partsByProp.get(prop.id) || [],
      habsByProp.get(prop.id) || [],
    ),
  );

  const mealsGeneral = aggregateMealsPlans(
    rows.filter((r) => r.requiere_comidas).map((r) => r.meals_stay),
  );

  return {
    rows,
    blocks: rows,
    totals: computeHoteleriaTotals(rows),
    meals: mealsGeneral,
    edicion,
    error: null,
  };
}

/**
 * Refresca una sola fila de hotelería (post-edición sin recargar toda la edición).
 * @param {number|string} propuestaId
 */
export async function getFimbaHoteleriaRow(propuestaId) {
  if (propuestaId == null || propuestaId === "") {
    return { row: null, error: new Error("Propuesta inválida") };
  }
  const { propuesta, error: eProp } = await getFimbaPropuestaById(propuestaId);
  if (eProp) return { row: null, error: eProp };
  if (!propuesta) return { row: null, error: new Error("Propuesta no encontrada") };

  const [{ participantes, error: ePart }, { habitaciones, error: eHab }] = await Promise.all([
    listFimbaParticipantes(propuestaId),
    listFimbaHabitaciones(propuestaId),
  ]);
  if (ePart) return { row: null, error: ePart };
  if (eHab) return { row: null, error: eHab };

  return {
    row: buildFimbaHoteleriaRow(propuesta, participantes, habitaciones),
    error: null,
  };
}

/** Alias de listFimbaHoteleria (shape con blocks/totals/edicion). */
export async function loadFimbaHoteleriaReport(edicionId, opts = {}) {
  return listFimbaHoteleria(edicionId, opts);
}

// ---------------------------------------------------------------------------
// Rooming / habitaciones por artista (propuesta)
// ---------------------------------------------------------------------------

/**
 * Lista habitaciones del artista con ocupantes (ordenados).
 * @param {number|string} propuestaId
 */
export async function listFimbaHabitaciones(propuestaId) {
  if (propuestaId == null || propuestaId === "") {
    return { habitaciones: [], error: null };
  }
  const { data: habs, error } = await supabase
    .from("fimba_propuestas_habitaciones")
    .select(HABITACION_SELECT)
    .eq("id_propuesta", propuestaId)
    .order("orden", { ascending: true })
    .order("id", { ascending: true });
  if (error) return { habitaciones: [], error };
  if (!habs?.length) return { habitaciones: [], error: null };

  const ids = habs.map((h) => h.id);
  const { data: occs, error: eOcc } = await supabase
    .from("fimba_habitaciones_ocupantes")
    .select(OCUPANTE_SELECT)
    .in("id_habitacion", ids)
    .order("orden", { ascending: true })
    .order("id", { ascending: true });
  if (eOcc) return { habitaciones: [], error: eOcc };

  return { habitaciones: assembleHabitacionRecords(habs, occs), error: null };
}

/**
 * Cuenta slots por tipo (sin cargar ocupantes).
 * @param {number|string} propuestaId
 */
export async function countFimbaHabitacionesByTipo(propuestaId) {
  const empty = { SGL: 0, DBL: 0, TPL: 0, QAD: 0 };
  if (propuestaId == null || propuestaId === "") {
    return { byTipo: empty, error: null };
  }
  const { data, error } = await supabase
    .from("fimba_propuestas_habitaciones")
    .select("tipo")
    .eq("id_propuesta", propuestaId);
  if (error) return { byTipo: empty, error };
  const byTipo = { ...empty };
  for (const row of data || []) {
    const t = normalizeHabTipo(row.tipo);
    if (t) byTipo[t] += 1;
  }
  return { byTipo, error: null };
}

/**
 * Materializa inventario desde cantidades por tipo.
 * - Añade habitaciones vacías si faltan.
 * - Quita primero habitaciones vacías (de mayor orden); no borra ocupadas.
 * - Si quedan más ocupadas que el target, las deja y devuelve `warning`.
 *
 * @param {number|string} propuestaId
 * @param {{ SGL?: number, DBL?: number, TPL?: number, QAD?: number }} counts
 * @param {{ default_matrimonial?: boolean }} [opts] — default twin (false) en multi
 */
export async function syncFimbaHabitacionesFromCounts(propuestaId, counts, opts = {}) {
  const pid = Number(propuestaId);
  if (!Number.isFinite(pid)) {
    return { habitaciones: [], warning: null, error: new Error("Propuesta inválida") };
  }

  const target = {};
  for (const t of FIMBA_TIPOS_HABITACION) {
    const n = Math.max(0, Math.min(200, Math.floor(Number(counts?.[t.value]) || 0)));
    target[t.value] = n;
  }

  const { habitaciones: existing, error: eList } = await listFimbaHabitaciones(pid);
  if (eList) return { habitaciones: [], warning: null, error: eList };

  const byTipo = { SGL: [], DBL: [], TPL: [], QAD: [] };
  for (const h of existing || []) {
    const t = normalizeHabTipo(h.tipo);
    if (t) byTipo[t].push(h);
  }

  const defaultMatri = opts.default_matrimonial === true;
  const toInsert = [];
  const toDelete = [];
  const warnings = [];

  for (const t of FIMBA_TIPOS_HABITACION) {
    const list = byTipo[t.value] || [];
    const want = target[t.value];
    if (list.length === want) continue;

    if (list.length < want) {
      const add = want - list.length;
      const maxOrden = list.reduce((m, h) => Math.max(m, Number(h.orden) || 0), 0);
      for (let i = 0; i < add; i += 1) {
        toInsert.push({
          id_propuesta: pid,
          tipo: t.value,
          matrimonial: t.value === "SGL" ? false : defaultMatri,
          orden: maxOrden + i + 1,
        });
      }
      continue;
    }

    // too many: prefer deleting empty rooms from the end
    const surplus = list.length - want;
    const empties = [...list]
      .filter((h) => !(h.ocupantes || []).length)
      .sort((a, b) => (Number(b.orden) || 0) - (Number(a.orden) || 0) || b.id - a.id);
    const drop = empties.slice(0, surplus);
    toDelete.push(...drop.map((h) => h.id));
    const stillOver = surplus - drop.length;
    if (stillOver > 0) {
      warnings.push(
        `${t.label}: quedan ${stillOver} habitación(es) con personas que no se pudieron quitar del inventario.`,
      );
    }
  }

  if (toDelete.length) {
    const { error: eDel } = await supabase
      .from("fimba_propuestas_habitaciones")
      .delete()
      .in("id", toDelete);
    if (eDel) return { habitaciones: [], warning: null, error: eDel };
  }

  if (toInsert.length) {
    const { error: eIns } = await supabase
      .from("fimba_propuestas_habitaciones")
      .insert(toInsert);
    if (eIns) return { habitaciones: [], warning: null, error: eIns };
  }

  const { habitaciones, error } = await listFimbaHabitaciones(pid);
  return {
    habitaciones,
    warning: warnings.length ? warnings.join(" ") : null,
    error,
  };
}

/**
 * Actualiza matrimonial / label / orden de un slot.
 * @param {number|string} habitacionId
 * @param {{ matrimonial?: boolean, label?: string|null, orden?: number, tipo?: string }} patch
 */
export async function updateFimbaHabitacion(habitacionId, patch) {
  const row = { updated_at: new Date().toISOString() };
  if (patch.matrimonial != null) row.matrimonial = Boolean(patch.matrimonial);
  if (patch.label !== undefined) {
    const s = patch.label == null ? null : String(patch.label).trim();
    row.label = s === "" ? null : s;
  }
  if (patch.orden != null) row.orden = Math.floor(Number(patch.orden)) || 0;
  if (patch.tipo != null) {
    const t = normalizeHabTipo(patch.tipo);
    if (!t) return { habitacion: null, error: new Error("Tipo de habitación inválido") };
    row.tipo = t;
    if (t === "SGL") row.matrimonial = false;
  }

  // Si bajan capacidad (raro vía tipo), recortar ocupantes excedentes
  if (row.tipo) {
    const cap = capacityForHabitacionTipo(row.tipo);
    const { data: occs } = await supabase
      .from("fimba_habitaciones_ocupantes")
      .select("id, orden")
      .eq("id_habitacion", habitacionId)
      .order("orden", { ascending: true })
      .order("id", { ascending: true });
    if ((occs || []).length > cap) {
      const dropIds = occs.slice(cap).map((o) => o.id);
      await supabase.from("fimba_habitaciones_ocupantes").delete().in("id", dropIds);
    }
  }

  const { data, error } = await supabase
    .from("fimba_propuestas_habitaciones")
    .update(row)
    .eq("id", habitacionId)
    .select(HABITACION_SELECT)
    .single();
  return { habitacion: data, error };
}

/**
 * Sustituye ocupantes de una habitación (ordered list de id_participante).
 * Valida capacidad, activos y misma propuesta. Quita al participante de otras habitaciones del mismo artista.
 *
 * @param {number|string} habitacionId
 * @param {Array<number|string>} participanteIds
 */
export async function setFimbaHabitacionOcupantes(habitacionId, participanteIds) {
  const hid = Number(habitacionId);
  if (!Number.isFinite(hid)) {
    return { habitacion: null, error: new Error("Habitación inválida") };
  }

  const { data: hab, error: eHab } = await supabase
    .from("fimba_propuestas_habitaciones")
    .select(HABITACION_SELECT)
    .eq("id", hid)
    .maybeSingle();
  if (eHab) return { habitacion: null, error: eHab };
  if (!hab) return { habitacion: null, error: new Error("Habitación no encontrada") };

  const cap = capacityForHabitacionTipo(hab.tipo);
  const rawIds = (participanteIds || [])
    .map((x) => Number(x))
    .filter((n) => Number.isFinite(n));
  // unique preserve order
  const seen = new Set();
  const ids = [];
  for (const id of rawIds) {
    if (seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }
  if (ids.length > cap) {
    return {
      habitacion: null,
      error: new Error(`Máximo ${cap} persona(s) en habitación ${hab.tipo}`),
    };
  }

  if (ids.length) {
    const { data: parts, error: eParts } = await supabase
      .from("fimba_participantes")
      .select("id, id_propuesta, activo")
      .in("id", ids);
    if (eParts) return { habitacion: null, error: eParts };
    const map = new Map((parts || []).map((p) => [p.id, p]));
    for (const id of ids) {
      const p = map.get(id);
      if (!p) {
        return { habitacion: null, error: new Error(`Participante ${id} no existe`) };
      }
      if (Number(p.id_propuesta) !== Number(hab.id_propuesta)) {
        return {
          habitacion: null,
          error: new Error("Solo participantes del mismo artista"),
        };
      }
      if (p.activo === false) {
        return {
          habitacion: null,
          error: new Error("No se puede asignar un participante inactivo"),
        };
      }
    }

    // Liberar estos participantes de otras habitaciones del artista (unique global)
    const { data: otherHabs } = await supabase
      .from("fimba_propuestas_habitaciones")
      .select("id")
      .eq("id_propuesta", hab.id_propuesta)
      .neq("id", hid);
    const otherIds = (otherHabs || []).map((h) => h.id);
    if (otherIds.length) {
      const { error: eClearOther } = await supabase
        .from("fimba_habitaciones_ocupantes")
        .delete()
        .in("id_habitacion", otherIds)
        .in("id_participante", ids);
      if (eClearOther) return { habitacion: null, error: eClearOther };
    }
  }

  const { error: eClear } = await supabase
    .from("fimba_habitaciones_ocupantes")
    .delete()
    .eq("id_habitacion", hid);
  if (eClear) return { habitacion: null, error: eClear };

  if (ids.length) {
    const rows = ids.map((id_participante, i) => ({
      id_habitacion: hid,
      id_participante,
      orden: i + 1,
    }));
    const { error: eIns } = await supabase
      .from("fimba_habitaciones_ocupantes")
      .insert(rows);
    if (eIns) return { habitacion: null, error: eIns };
  }

  const { habitaciones, error } = await listFimbaHabitaciones(hab.id_propuesta);
  if (error) return { habitacion: null, error };
  const habitacion = (habitaciones || []).find((h) => Number(h.id) === hid) || null;
  return { habitacion, habitaciones, error: null };
}

/**
 * Asigna/quita un participante en un slot de habitación (orden 1..cap).
 * Si habitacionId es null, desasigna de cualquier habitación de la propuesta.
 *
 * @param {number|string} participanteId
 * @param {number|string|null} habitacionId
 * @param {number} [orden]
 */
export async function assignFimbaParticipanteHabitacion(
  participanteId,
  habitacionId,
  orden = 1,
) {
  const partId = Number(participanteId);
  if (!Number.isFinite(partId)) {
    return { error: new Error("Participante inválido") };
  }

  // Siempre quitar asignación previa (unique)
  const { error: eDel } = await supabase
    .from("fimba_habitaciones_ocupantes")
    .delete()
    .eq("id_participante", partId);
  if (eDel) return { error: eDel };

  if (habitacionId == null || habitacionId === "") {
    return { error: null };
  }

  const hid = Number(habitacionId);
  const { data: hab, error: eHab } = await supabase
    .from("fimba_propuestas_habitaciones")
    .select(HABITACION_SELECT)
    .eq("id", hid)
    .maybeSingle();
  if (eHab) return { error: eHab };
  if (!hab) return { error: new Error("Habitación no encontrada") };

  const cap = capacityForHabitacionTipo(hab.tipo);
  const slot = Math.max(1, Math.min(cap, Math.floor(Number(orden) || 1)));

  const { data: existing } = await supabase
    .from("fimba_habitaciones_ocupantes")
    .select("id, id_participante, orden")
    .eq("id_habitacion", hid)
    .order("orden", { ascending: true });

  const used = (existing || []).filter((o) => Number(o.id_participante) !== partId);
  if (used.length >= cap) {
    return { error: new Error("Habitación llena") };
  }

  // If slot taken, append at end
  let finalOrden = slot;
  if (used.some((o) => Number(o.orden) === slot)) {
    finalOrden = Math.max(...used.map((o) => Number(o.orden) || 0), 0) + 1;
    if (finalOrden > cap) finalOrden = used.length + 1;
  }

  const { error: eIns } = await supabase.from("fimba_habitaciones_ocupantes").insert({
    id_habitacion: hid,
    id_participante: partId,
    orden: finalOrden,
  });
  return { error: eIns || null };
}

/**
 * Deep-link a la flota de la gira en OFRN (Logística → Transporte).
 * Vehículos en `giras_transportes` se editan también en FIMBA Transportes.
 */
export function ofrnGiraTransporteUrl(giraId, origin = typeof window !== "undefined" ? window.location.origin : "") {
  const base = String(origin || "").replace(/\/$/, "");
  if (giraId == null || giraId === "") return `${base}/?tab=giras`;
  return `${base}/?tab=giras&view=LOGISTICS&giraId=${giraId}&subTab=transporte`;
}

/**
 * Stub: disponibilidad multi-vehículo vs cupos OFRN (roster/paradas).
 * Plazas FIMBA en ventana se restan; uso OFRN por FK se anota en métricas.
 * @returns {{ available: null, note: string }}
 */
export function stubFimbaTransportAvailability() {
  return {
    available: null,
    note: "TODO: restar cupos OFRN del roster en frechas; hoy: plazas FIMBA + nota de eventos OFRN con el mismo vehículo.",
  };
}

// ---------------------------------------------------------------------------
// Usuarios FIMBA (edición) — mail + rol_fimba; sesión en localStorage.fimba_user
// ---------------------------------------------------------------------------

export const FIMBA_USUARIO_ROLES = [
  { value: "editor_general", label: "Editor general" },
  { value: "consulta", label: "Consulta" },
];

function normalizeFimbaMail(mail) {
  return String(mail || "")
    .trim()
    .toLowerCase();
}

/**
 * @param {number|string} edicionId
 */
export async function listFimbaUsuarios(edicionId) {
  if (edicionId == null || edicionId === "") {
    return { usuarios: [], error: new Error("id de edición requerido") };
  }
  const { data, error } = await supabase
    .from("fimba_usuarios")
    .select(
      "id, mail, clave_acceso, rol_fimba, id_edicion, nombre, activo, token_login, created_at, updated_at",
    )
    .eq("id_edicion", edicionId)
    .order("mail", { ascending: true });
  if (error) return { usuarios: [], error };
  return { usuarios: data || [], error: null };
}

/**
 * Filas activas de `fimba_usuarios` para un mail (override OFRN / login externo).
 * @param {string} mail
 */
export async function listFimbaUsuariosByMail(mail) {
  const m = normalizeFimbaMail(mail);
  if (!m) return { usuarios: [], error: null };
  const { data, error } = await supabase
    .from("fimba_usuarios")
    .select("id, mail, rol_fimba, id_edicion, nombre, activo")
    .ilike("mail", m)
    .eq("activo", true);
  if (error) return { usuarios: [], error };
  const usuarios = (data || []).filter((r) => normalizeFimbaMail(r.mail) === m);
  return { usuarios, error: null };
}

/**
 * Elige la fila FIMBA de un mail para la edición de ruta (o la única / primera).
 * @param {Array<{ rol_fimba?: string, id_edicion?: number|string }>|null|undefined} rows
 * @param {number|string|null|undefined} edicionId
 */
export function pickFimbaUsuarioForEdicion(rows, edicionId) {
  const list = Array.isArray(rows) ? rows : [];
  if (list.length === 0) return null;
  if (edicionId != null && edicionId !== "") {
    const hit = list.find((r) => String(r.id_edicion) === String(edicionId));
    return hit || null;
  }
  if (list.length === 1) return list[0];
  const consulta = list.find(
    (r) => String(r.rol_fimba || "").trim() === "consulta",
  );
  return consulta || list[0];
}

/**
 * Login FIMBA externo: mail + clave_acceso (activo).
 * Opcionalmente filtra por id_edicion si se conoce.
 * @param {{ mail: string, clave: string, id_edicion?: number|string|null }} params
 */
export async function loginFimbaUsuario({ mail, clave, id_edicion = null }) {
  const m = normalizeFimbaMail(mail);
  const claveIn = String(clave || "");
  if (!m || !claveIn) {
    return {
      user: null,
      error: new Error("Ingresá mail y contraseña"),
    };
  }

  let q = supabase
    .from("fimba_usuarios")
    .select(
      "id, mail, clave_acceso, rol_fimba, id_edicion, nombre, activo, token_login",
    )
    .ilike("mail", m)
    .eq("activo", true);

  if (id_edicion != null && id_edicion !== "") {
    q = q.eq("id_edicion", id_edicion);
  }

  const { data, error } = await q;
  if (error) return { user: null, error };

  const rows = (data || []).filter(
    (r) =>
      normalizeFimbaMail(r.mail) === m && String(r.clave_acceso || "") === claveIn,
  );

  if (rows.length === 0) {
    return {
      user: null,
      error: new Error("Mail o contraseña incorrectos, o el usuario está inactivo"),
    };
  }

  // Si hay varios (mismo mail en varias ediciones), preferir el primero estable por id.
  rows.sort((a, b) => Number(a.id) - Number(b.id));
  const row = rows[0];

  return {
    user: {
      id: Number(row.id),
      mail: normalizeFimbaMail(row.mail),
      nombre: row.nombre != null ? String(row.nombre) : null,
      rol_fimba: row.rol_fimba,
      id_edicion: Number(row.id_edicion),
    },
    error: null,
  };
}

/**
 * Login por token_login (magic link futuro).
 * @param {string} token
 */
export async function loginFimbaUsuarioByToken(token) {
  const t = String(token || "").trim();
  if (!t) {
    return { user: null, error: new Error("Token inválido") };
  }
  const { data, error } = await supabase
    .from("fimba_usuarios")
    .select("id, mail, rol_fimba, id_edicion, nombre, activo, token_login")
    .eq("token_login", t)
    .eq("activo", true)
    .maybeSingle();
  if (error) return { user: null, error };
  if (!data) {
    return { user: null, error: new Error("Enlace inválido o usuario inactivo") };
  }
  return {
    user: {
      id: Number(data.id),
      mail: normalizeFimbaMail(data.mail),
      nombre: data.nombre != null ? String(data.nombre) : null,
      rol_fimba: data.rol_fimba,
      id_edicion: Number(data.id_edicion),
    },
    error: null,
  };
}

/**
 * @param {{ mail: string, nombre?: string|null, rol_fimba?: string, id_edicion: number|string, clave_acceso?: string|null }} payload
 */
export async function createFimbaUsuario(payload) {
  const mail = normalizeFimbaMail(payload?.mail);
  const id_edicion = Number(payload?.id_edicion);
  const rol_fimba = String(payload?.rol_fimba || "editor_general").trim();
  const clave_acceso =
    payload?.clave_acceso != null && String(payload.clave_acceso).trim() !== ""
      ? String(payload.clave_acceso)
      : null;
  const nombre =
    payload?.nombre != null && String(payload.nombre).trim() !== ""
      ? String(payload.nombre).trim()
      : null;

  if (!mail) return { usuario: null, error: new Error("Mail obligatorio") };
  if (!Number.isFinite(id_edicion)) {
    return { usuario: null, error: new Error("Edición inválida") };
  }
  if (rol_fimba !== "editor_general" && rol_fimba !== "consulta") {
    return { usuario: null, error: new Error("Rol inválido") };
  }

  const row = {
    mail,
    id_edicion,
    rol_fimba,
    nombre,
    clave_acceso,
    activo: true,
  };

  const { data, error } = await supabase
    .from("fimba_usuarios")
    .insert(row)
    .select(
      "id, mail, clave_acceso, rol_fimba, id_edicion, nombre, activo, token_login, created_at, updated_at",
    )
    .single();

  if (error) return { usuario: null, error };
  return { usuario: data, error: null };
}

/**
 * @param {number|string} usuarioId
 * @param {object} patch
 */
export async function updateFimbaUsuario(usuarioId, patch = {}) {
  if (usuarioId == null || usuarioId === "") {
    return { usuario: null, error: new Error("id de usuario requerido") };
  }
  const body = { updated_at: new Date().toISOString() };
  if (patch.nombre !== undefined) {
    body.nombre =
      patch.nombre != null && String(patch.nombre).trim() !== ""
        ? String(patch.nombre).trim()
        : null;
  }
  if (patch.mail !== undefined) {
    const mail = normalizeFimbaMail(patch.mail);
    if (!mail) return { usuario: null, error: new Error("Mail obligatorio") };
    body.mail = mail;
  }
  if (patch.rol_fimba !== undefined) {
    const rol = String(patch.rol_fimba || "").trim();
    if (rol !== "editor_general" && rol !== "consulta") {
      return { usuario: null, error: new Error("Rol inválido") };
    }
    body.rol_fimba = rol;
  }
  if (patch.activo !== undefined) body.activo = Boolean(patch.activo);
  if (patch.clave_acceso !== undefined) {
    body.clave_acceso =
      patch.clave_acceso != null && String(patch.clave_acceso) !== ""
        ? String(patch.clave_acceso)
        : null;
  }

  const { data, error } = await supabase
    .from("fimba_usuarios")
    .update(body)
    .eq("id", usuarioId)
    .select(
      "id, mail, clave_acceso, rol_fimba, id_edicion, nombre, activo, token_login, created_at, updated_at",
    )
    .single();

  if (error) return { usuario: null, error };
  return { usuario: data, error: null };
}

/**
 * Soft-delete: marca `activo = false`.
 * @param {number|string} usuarioId
 */
export async function deactivateFimbaUsuario(usuarioId) {
  return updateFimbaUsuario(usuarioId, { activo: false });
}

/**
 * Regenera clave_acceso (y opcionalmente token_login).
 * @param {number|string} usuarioId
 * @param {string} newClave
 */
export async function regenerateFimbaUsuarioClave(usuarioId, newClave) {
  const clave = String(newClave || "").trim();
  if (!clave) {
    return { usuario: null, error: new Error("Clave requerida") };
  }
  return updateFimbaUsuario(usuarioId, { clave_acceso: clave });
}

/**
 * @param {number|string} usuarioId
 */
export async function regenerateFimbaUsuarioTokenLogin(usuarioId) {
  if (usuarioId == null || usuarioId === "") {
    return { usuario: null, error: new Error("id de usuario requerido") };
  }
  const token =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : null;
  if (!token) {
    return { usuario: null, error: new Error("No se pudo generar token") };
  }
  const { data, error } = await supabase
    .from("fimba_usuarios")
    .update({
      token_login: token,
      updated_at: new Date().toISOString(),
    })
    .eq("id", usuarioId)
    .select(
      "id, mail, rol_fimba, id_edicion, nombre, activo, token_login, created_at, updated_at",
    )
    .single();
  if (error) return { usuario: null, error };
  return { usuario: data, error: null };
}

// ---------------------------------------------------------------------------
// Contrataciones (planilla expedientes por edición)
// ---------------------------------------------------------------------------

export const FIMBA_TIPO_CONTRATACION_DEFAULT = "Expediente";

/**
 * Presets UI de «Último estado conocido» (colores solo frontend; DB = texto libre).
 * Match case-insensitive exacto del label para badge de color.
 */
export const FIMBA_ESTADO_CONOCIDO_PRESETS = [
  {
    value: "Factura presentada",
    label: "Factura presentada",
    bg: "#bfdbfe",
    color: "#1e3a8a",
  },
  {
    value: "Factura emitida",
    label: "Factura emitida",
    bg: "#e9d5ff",
    color: "#6b21a8",
  },
  {
    value: "Factura pedida",
    label: "Factura pedida",
    bg: "#fbcfe8",
    color: "#9d174d",
  },
  {
    value: "Pagado",
    label: "Pagado",
    bg: "#bbf7d0",
    color: "#14532d",
  },
];

const ESTADO_PRESET_BY_NORM = new Map(
  FIMBA_ESTADO_CONOCIDO_PRESETS.map((p) => [
    String(p.value).trim().toLowerCase(),
    p,
  ]),
);

/**
 * @param {string|null|undefined} estado
 * @returns {{ value: string, label: string, bg: string, color: string }|null}
 */
export function resolveFimbaEstadoConocidoPreset(estado) {
  if (estado == null || String(estado).trim() === "") return null;
  return ESTADO_PRESET_BY_NORM.get(String(estado).trim().toLowerCase()) || null;
}

/**
 * Label de actor para el log: OFRN staff (nombre/mail) o fimba_user (nombre/mail).
 * Prefer management OFRN sobre sesión FIMBA externa.
 * @param {{ ofrnUser?: object|null, fimbaUser?: object|null, isOfrnStaff?: boolean }} opts
 * @returns {{ label: string|null, created_by_integrante_id: number|null, created_by_fimba_usuario_id: number|null }}
 */
export function resolveFimbaEstadoActor(opts = {}) {
  const { ofrnUser = null, fimbaUser = null, isOfrnStaff = false } = opts;
  if (isOfrnStaff && ofrnUser) {
    const nombre = [ofrnUser.nombre, ofrnUser.apellido]
      .filter((x) => x != null && String(x).trim() !== "")
      .map((x) => String(x).trim())
      .join(" ");
    const mail = ofrnUser.mail != null ? String(ofrnUser.mail).trim() : "";
    const label = nombre || mail || `OFRN #${ofrnUser.id}`;
    const idRaw = Number(ofrnUser.id);
    return {
      label: label || null,
      created_by_integrante_id: Number.isFinite(idRaw) ? idRaw : null,
      created_by_fimba_usuario_id: null,
    };
  }
  if (fimbaUser) {
    const nombre =
      fimbaUser.nombre != null && String(fimbaUser.nombre).trim() !== ""
        ? String(fimbaUser.nombre).trim()
        : "";
    const mail =
      fimbaUser.mail != null && String(fimbaUser.mail).trim() !== ""
        ? String(fimbaUser.mail).trim()
        : "";
    const label = nombre || mail || `FIMBA #${fimbaUser.id}`;
    const idRaw = Number(fimbaUser.id);
    return {
      label: label || null,
      created_by_integrante_id: null,
      created_by_fimba_usuario_id: Number.isFinite(idRaw) ? idRaw : null,
    };
  }
  if (ofrnUser) {
    const nombre = [ofrnUser.nombre, ofrnUser.apellido]
      .filter((x) => x != null && String(x).trim() !== "")
      .map((x) => String(x).trim())
      .join(" ");
    const mail = ofrnUser.mail != null ? String(ofrnUser.mail).trim() : "";
    const label = nombre || mail || null;
    const idRaw = Number(ofrnUser.id);
    return {
      label,
      created_by_integrante_id: Number.isFinite(idRaw) ? idRaw : null,
      created_by_fimba_usuario_id: null,
    };
  }
  return {
    label: null,
    created_by_integrante_id: null,
    created_by_fimba_usuario_id: null,
  };
}

const CONTRATACION_SELECT =
  "id, id_edicion, orden, numero_expediente, id_propuesta, nombre, monto, tipo_contratacion, envio_firma_mfm_nota, nota_firmada, falta_documentacion, enviado_adm, ultimo_estado_conocido, carpeta_documentacion, created_at, updated_at, fimba_propuestas:id_propuesta ( id, nombre, color )";

const ESTADO_LOG_SELECT =
  "id, id_contratacion, estado, created_at, created_by_label, created_by_integrante_id, created_by_fimba_usuario_id";

async function fetchNextContratacionOrden(edicionId) {
  const { data, error } = await supabase
    .from("fimba_contrataciones")
    .select("orden")
    .eq("id_edicion", edicionId)
    .order("orden", { ascending: false })
    .limit(1);
  if (error || !data?.length) return 1;
  return (Number(data[0].orden) || 0) + 1;
}

/**
 * Normaliza monto opcional: vacío → null; coma decimal / miles es-AR / símbolo $.
 * @param {unknown} value
 * @returns {number|null}
 */
export function parseFimbaMonto(value) {
  if (value == null || value === "") return null;
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  let s = String(value).trim().replace(/\s/g, "").replace(/\$/g, "");
  if (!s) return null;
  // es-AR: 1.234,56 → 1234.56; también acepta 1234.56 / 1234,56
  if (s.includes(",") && s.includes(".")) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (s.includes(",")) {
    s = s.replace(",", ".");
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/**
 * Monto en ARS con locale es-AR (p. ej. $ 1.234,56). Vacío → "".
 * @param {unknown} value
 */
export function formatFimbaMonto(value) {
  const n = parseFimbaMonto(value);
  if (n == null) return "";
  try {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return String(n);
  }
}

/**
 * @param {number|string} edicionId
 */
export async function listFimbaContrataciones(edicionId) {
  if (edicionId == null || edicionId === "") {
    return { contrataciones: [], error: new Error("id de edición requerido") };
  }
  const { data, error } = await supabase
    .from("fimba_contrataciones")
    .select(CONTRATACION_SELECT)
    .eq("id_edicion", edicionId)
    .order("orden", { ascending: true })
    .order("id", { ascending: true });
  if (error) return { contrataciones: [], error };
  return { contrataciones: data || [], error: null };
}

/**
 * Contrataciones vinculadas a un artista (`id_propuesta`).
 * @param {number|string} propuestaId
 */
export async function listFimbaContratacionesByPropuesta(propuestaId) {
  if (propuestaId == null || propuestaId === "") {
    return { contrataciones: [], error: new Error("id de artista requerido") };
  }
  const { data, error } = await supabase
    .from("fimba_contrataciones")
    .select(CONTRATACION_SELECT)
    .eq("id_propuesta", propuestaId)
    .order("orden", { ascending: true })
    .order("id", { ascending: true });
  if (error) return { contrataciones: [], error };
  return { contrataciones: data || [], error: null };
}

/**
 * Historial de estados de una contratación (más reciente primero).
 * @param {number|string} contratacionId
 */
export async function listFimbaContratacionEstadoLog(contratacionId) {
  if (contratacionId == null || contratacionId === "") {
    return { entries: [], error: new Error("id de contratación requerido") };
  }
  const { data, error } = await supabase
    .from("fimba_contrataciones_estado_log")
    .select(ESTADO_LOG_SELECT)
    .eq("id_contratacion", contratacionId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });
  if (error) return { entries: [], error };
  return { entries: data || [], error: null };
}

/**
 * Inserta fila de log y denormaliza `ultimo_estado_conocido` en la contratación.
 * Si estado vacío → limpia denormalizado sin insertar log.
 * Si el texto no cambió respecto al actual → no inserta (idempotente).
 *
 * @param {number|string} contratacionId
 * @param {{
 *   estado: string|null,
 *   actor?: { label?: string|null, created_by_integrante_id?: number|null, created_by_fimba_usuario_id?: number|null },
 *   force?: boolean
 * }} opts
 */
export async function appendFimbaContratacionEstado(contratacionId, opts = {}) {
  if (contratacionId == null || contratacionId === "") {
    return {
      contratacion: null,
      entry: null,
      error: new Error("id de contratación requerido"),
    };
  }

  const estadoRaw = opts.estado;
  const estado =
    estadoRaw != null && String(estadoRaw).trim() !== ""
      ? String(estadoRaw).trim()
      : null;

  const { data: current, error: curErr } = await supabase
    .from("fimba_contrataciones")
    .select(CONTRATACION_SELECT)
    .eq("id", contratacionId)
    .maybeSingle();
  if (curErr) {
    return { contratacion: null, entry: null, error: curErr };
  }
  if (!current) {
    return {
      contratacion: null,
      entry: null,
      error: new Error("Contratación no encontrada"),
    };
  }

  const prev =
    current.ultimo_estado_conocido != null
      ? String(current.ultimo_estado_conocido).trim()
      : "";
  const next = estado || "";
  if (!opts.force && prev === next) {
    return { contratacion: current, entry: null, error: null };
  }

  let entry = null;
  if (estado) {
    const actor = opts.actor || {};
    const logRow = {
      id_contratacion: Number(contratacionId),
      estado,
      created_by_label:
        actor.label != null && String(actor.label).trim() !== ""
          ? String(actor.label).trim()
          : null,
      created_by_integrante_id:
        actor.created_by_integrante_id != null &&
        Number.isFinite(Number(actor.created_by_integrante_id))
          ? Number(actor.created_by_integrante_id)
          : null,
      created_by_fimba_usuario_id:
        actor.created_by_fimba_usuario_id != null &&
        Number.isFinite(Number(actor.created_by_fimba_usuario_id))
          ? Number(actor.created_by_fimba_usuario_id)
          : null,
    };
    const { data: inserted, error: logErr } = await supabase
      .from("fimba_contrataciones_estado_log")
      .insert(logRow)
      .select(ESTADO_LOG_SELECT)
      .single();
    if (logErr) {
      return { contratacion: null, entry: null, error: logErr };
    }
    entry = inserted;
  }

  const { data: updated, error: updErr } = await supabase
    .from("fimba_contrataciones")
    .update({
      ultimo_estado_conocido: estado,
      updated_at: new Date().toISOString(),
    })
    .eq("id", contratacionId)
    .select(CONTRATACION_SELECT)
    .single();
  if (updErr) {
    return { contratacion: null, entry, error: updErr };
  }
  return { contratacion: updated, entry, error: null };
}

/**
 * @param {object} payload
 * @param {{ actor?: object }} opts — si hay estado inicial, se loguea con actor
 */
export async function createFimbaContratacion(payload, opts = {}) {
  const id_edicion = Number(payload?.id_edicion);
  if (!Number.isFinite(id_edicion)) {
    return { contratacion: null, error: new Error("Edición inválida") };
  }

  const id_propuesta =
    payload?.id_propuesta != null && payload.id_propuesta !== ""
      ? Number(payload.id_propuesta)
      : null;
  const nombre =
    payload?.nombre != null && String(payload.nombre).trim() !== ""
      ? String(payload.nombre).trim()
      : null;
  const numero_expediente =
    payload?.numero_expediente != null &&
    String(payload.numero_expediente).trim() !== ""
      ? String(payload.numero_expediente).trim()
      : null;

  const orden =
    payload?.orden != null && Number.isFinite(Number(payload.orden))
      ? Number(payload.orden)
      : await fetchNextContratacionOrden(id_edicion);

  const initialEstado =
    payload?.ultimo_estado_conocido != null &&
    String(payload.ultimo_estado_conocido).trim() !== ""
      ? String(payload.ultimo_estado_conocido).trim()
      : null;

  const row = {
    id_edicion,
    orden,
    numero_expediente,
    id_propuesta: Number.isFinite(id_propuesta) ? id_propuesta : null,
    nombre,
    monto: parseFimbaMonto(payload?.monto),
    tipo_contratacion:
      payload?.tipo_contratacion != null &&
      String(payload.tipo_contratacion).trim() !== ""
        ? String(payload.tipo_contratacion).trim()
        : FIMBA_TIPO_CONTRATACION_DEFAULT,
    envio_firma_mfm_nota: payload?.envio_firma_mfm_nota === true,
    nota_firmada: payload?.nota_firmada === true,
    falta_documentacion: payload?.falta_documentacion === true,
    enviado_adm: payload?.enviado_adm === true,
    carpeta_documentacion: normalizeCarpetaDocumentacion(
      payload?.carpeta_documentacion,
    ),
    // Se setea vía append si hay valor; null al insertar y luego log.
    ultimo_estado_conocido: null,
  };

  const { data, error } = await supabase
    .from("fimba_contrataciones")
    .insert(row)
    .select(CONTRATACION_SELECT)
    .single();
  if (error) return { contratacion: null, error };

  if (initialEstado) {
    const { contratacion: withEstado, error: estErr } =
      await appendFimbaContratacionEstado(data.id, {
        estado: initialEstado,
        actor: opts.actor,
        force: true,
      });
    if (estErr) return { contratacion: data, error: estErr };
    return { contratacion: withEstado || data, error: null };
  }

  return { contratacion: data, error: null };
}

/**
 * Actualiza campos de la contratación.
 * Si `patch.ultimo_estado_conocido` está presente, usa append-only log
 * (no basta con overwrite). Pasar `opts.actor` con label/ids de sesión.
 *
 * @param {number|string} contratacionId
 * @param {object} patch
 * @param {{ actor?: object }} opts
 */
export async function updateFimbaContratacion(
  contratacionId,
  patch = {},
  opts = {},
) {
  if (contratacionId == null || contratacionId === "") {
    return { contratacion: null, error: new Error("id de contratación requerido") };
  }

  const hasEstado = Object.prototype.hasOwnProperty.call(
    patch,
    "ultimo_estado_conocido",
  );
  const estadoValue = hasEstado ? patch.ultimo_estado_conocido : undefined;

  // Campos no-estado
  const body = { updated_at: new Date().toISOString() };
  let hasFieldPatch = false;

  if (patch.orden !== undefined) {
    body.orden = Number(patch.orden) || 0;
    hasFieldPatch = true;
  }
  if (patch.numero_expediente !== undefined) {
    body.numero_expediente =
      patch.numero_expediente != null &&
      String(patch.numero_expediente).trim() !== ""
        ? String(patch.numero_expediente).trim()
        : null;
    hasFieldPatch = true;
  }
  if (patch.id_propuesta !== undefined) {
    const idp =
      patch.id_propuesta != null && patch.id_propuesta !== ""
        ? Number(patch.id_propuesta)
        : null;
    body.id_propuesta = Number.isFinite(idp) ? idp : null;
    hasFieldPatch = true;
  }
  if (patch.nombre !== undefined) {
    body.nombre =
      patch.nombre != null && String(patch.nombre).trim() !== ""
        ? String(patch.nombre).trim()
        : null;
    hasFieldPatch = true;
  }
  if (patch.monto !== undefined) {
    body.monto = parseFimbaMonto(patch.monto);
    hasFieldPatch = true;
  }
  if (patch.tipo_contratacion !== undefined) {
    body.tipo_contratacion =
      patch.tipo_contratacion != null &&
      String(patch.tipo_contratacion).trim() !== ""
        ? String(patch.tipo_contratacion).trim()
        : FIMBA_TIPO_CONTRATACION_DEFAULT;
    hasFieldPatch = true;
  }
  if (patch.envio_firma_mfm_nota !== undefined) {
    body.envio_firma_mfm_nota = Boolean(patch.envio_firma_mfm_nota);
    hasFieldPatch = true;
  }
  if (patch.nota_firmada !== undefined) {
    body.nota_firmada = Boolean(patch.nota_firmada);
    hasFieldPatch = true;
  }
  if (patch.falta_documentacion !== undefined) {
    body.falta_documentacion = Boolean(patch.falta_documentacion);
    hasFieldPatch = true;
  }
  if (patch.enviado_adm !== undefined) {
    body.enviado_adm = Boolean(patch.enviado_adm);
    hasFieldPatch = true;
  }
  if (patch.carpeta_documentacion !== undefined) {
    body.carpeta_documentacion = normalizeCarpetaDocumentacion(
      patch.carpeta_documentacion,
    );
    hasFieldPatch = true;
  }

  let contratacion = null;

  if (hasFieldPatch) {
    const { data, error } = await supabase
      .from("fimba_contrataciones")
      .update(body)
      .eq("id", contratacionId)
      .select(CONTRATACION_SELECT)
      .single();
    if (error) return { contratacion: null, error };
    contratacion = data;
  }

  if (hasEstado) {
    const { contratacion: withEstado, error: estErr } =
      await appendFimbaContratacionEstado(contratacionId, {
        estado: estadoValue,
        actor: opts.actor,
      });
    if (estErr) return { contratacion: contratacion, error: estErr };
    contratacion = withEstado || contratacion;
  }

  if (!contratacion) {
    // Solo pedían estado y era no-op, o vacío: re-fetch
    const { data, error } = await supabase
      .from("fimba_contrataciones")
      .select(CONTRATACION_SELECT)
      .eq("id", contratacionId)
      .maybeSingle();
    if (error) return { contratacion: null, error };
    contratacion = data;
  }

  return { contratacion, error: null };
}

/**
 * @param {number|string} contratacionId
 */
export async function deleteFimbaContratacion(contratacionId) {
  if (contratacionId == null || contratacionId === "") {
    return { error: new Error("id de contratación requerido") };
  }
  const { error } = await supabase
    .from("fimba_contrataciones")
    .delete()
    .eq("id", contratacionId);
  return { error: error || null };
}

/** Sheet canónico FIMBA Contrataciones (backup). */
export const FIMBA_CONTRATACIONES_SHEET_URL =
  "https://docs.google.com/spreadsheets/d/1rAd7j4phD6hx3jHujTUHM5KiBZNmfotz11tE3NHFox8/edit#gid=475656054";

/**
 * Estado del último backup a Google Sheets (fila singleton).
 */
export async function getFimbaContratacionesSheetSyncState() {
  const { data, error } = await supabase
    .from("fimba_contrataciones_sheet_sync")
    .select(
      "spreadsheet_id, spreadsheet_url, sheet_tab, id_edicion, last_synced_at, last_error, last_row_count, syncing_at, pending",
    )
    .eq("id", 1)
    .maybeSingle();
  if (error) return { state: null, error };
  return { state: data || null, error: null };
}

/**
 * Lee el body JSON de un FunctionsHttpError (supabase-js lo deja en error.context).
 * @param {unknown} fnError
 * @returns {Promise<object|string|null>}
 */
async function readFimbaEdgeFunctionErrorBody(fnError) {
  const res = fnError?.context;
  if (!res || typeof res.json !== "function") return null;
  try {
    return await res.json();
  } catch {
    try {
      if (typeof res.text === "function") {
        const t = await res.text();
        return t ? String(t) : null;
      }
    } catch {
      /* ignore */
    }
    return null;
  }
}

function messageFromEdgePayload(parsed, fallback) {
  if (parsed == null) return fallback;
  if (typeof parsed === "string" && parsed.trim()) return parsed.trim();
  if (typeof parsed === "object") {
    if (parsed.error != null && String(parsed.error).trim()) {
      return String(parsed.error).trim();
    }
    if (parsed.message != null && String(parsed.message).trim()) {
      return String(parsed.message).trim();
    }
  }
  return fallback;
}

/**
 * Dispara backup full-replace de contrataciones → Google Sheet.
 * Auth: `ofrnAuth` (staff localStorage), `fimbaAuth` (editor_general), o cron secret.
 *
 * @param {{
 *   edicionId: number|string,
 *   ofrnAuth?: { id: number, mail: string }|null,
 *   fimbaAuth?: { id: number, mail: string, id_edicion: number }|null,
 * }} opts
 */
export async function syncFimbaContratacionesSheet({
  edicionId,
  ofrnAuth = null,
  fimbaAuth = null,
} = {}) {
  if (edicionId == null || edicionId === "") {
    return {
      result: null,
      error: new Error("id de edición requerido"),
    };
  }
  const body = {
    force: true,
    edicionId: Number(edicionId),
  };
  if (ofrnAuth?.id != null && ofrnAuth?.mail) {
    body.ofrnAuth = {
      id: Number(ofrnAuth.id),
      mail: String(ofrnAuth.mail).trim().toLowerCase(),
    };
  }
  if (fimbaAuth?.id != null && fimbaAuth?.mail) {
    body.fimbaAuth = {
      id: Number(fimbaAuth.id),
      mail: String(fimbaAuth.mail).trim().toLowerCase(),
      id_edicion: Number(fimbaAuth.id_edicion ?? edicionId),
    };
  }
  try {
    const { data, error } = await supabase.functions.invoke(
      "sync-fimba-contrataciones-sheet",
      { body },
    );
    if (error) {
      const parsed = await readFimbaEdgeFunctionErrorBody(error);
      const msg = messageFromEdgePayload(
        parsed,
        error.message || "Error al invocar sync",
      );
      return { result: null, error: new Error(msg) };
    }
    if (data?.error) {
      return { result: null, error: new Error(String(data.error)) };
    }
    return { result: data || null, error: null };
  } catch (e) {
    return {
      result: null,
      error: e instanceof Error ? e : new Error(String(e?.message || e)),
    };
  }
}
