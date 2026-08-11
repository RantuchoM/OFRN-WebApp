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
import { eventTypeIdForCategoria } from "../utils/giraTransportUtils";

export const FIMBA_TIPOS_ALIMENTACION = [
  { value: "regular", label: "Regular" },
  { value: "vegetariano", label: "Vegetariano" },
  { value: "vegano", label: "Vegano" },
  { value: "celiaco", label: "Celíaco" },
  { value: "sin_tacc", label: "Sin TACC" },
  { value: "otro", label: "Otro" },
];

/** Género/sexo del participante (persona bajo el artista). */
export const FIMBA_GENEROS = [
  { value: "femenino", label: "Femenino" },
  { value: "masculino", label: "Masculino" },
  { value: "otro", label: "Otro" },
  { value: "sin_especificar", label: "Sin especificar" },
];

export const FIMBA_GENERO_DEFAULT = "sin_especificar";

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

/**
 * Categorías derivadas del catálogo de tipos (para filtro UI).
 * @param {Array} tipos — output de normalizeTiposEventoCatalog / listTiposEventoForFimba
 */
export function categoriesFromTiposEvento(tipos) {
  const map = new Map();
  for (const t of tipos || []) {
    const id = t.id_categoria;
    if (id == null || !Number.isFinite(Number(id))) continue;
    if (!map.has(Number(id))) {
      map.set(Number(id), {
        id: Number(id),
        nombre: t.categoria_nombre || t.categorias_tipos_eventos?.nombre || `Cat. ${id}`,
      });
    }
  }
  return [...map.values()].sort((a, b) =>
    a.nombre.localeCompare(b.nombre, "es"),
  );
}

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
 * Suma plazas de rides activos (`fimba_propuesta_rutas`) de un artista.
 * Un ride activo = fila con plazas > 0 (misma propuesta, cualquier vehículo).
 *
 * @param {Array<{ id?: unknown, id_propuesta?: unknown, plazas?: number, propuesta?: { id?: unknown }|null }>} rutas
 * @param {number|string} idPropuesta
 * @param {{ excludeRutaIds?: Array<number|string> }} [opts]
 */
export function sumPropuestaRutasPlazas(rutas, idPropuesta, opts = {}) {
  if (idPropuesta == null || idPropuesta === "") return 0;
  const want = String(idPropuesta);
  const exclude = new Set((opts.excludeRutaIds || []).map(String));
  let sum = 0;
  for (const r of rutas || []) {
    const pid = r?.id_propuesta ?? r?.propuesta?.id;
    if (pid == null || String(pid) !== want) continue;
    if (r?.id != null && exclude.has(String(r.id))) continue;
    sum += Math.max(0, Number(r.plazas) || 0);
  }
  return sum;
}

/**
 * Uso / restantes del tope transporte por artista respecto a sus rutas.
 * Σ plazas rutas activas ≤ para_transporte.
 *
 * @param {{ id?: unknown, cantidad_planificada?: number, plazas_extra_materiales?: number } | null} propuesta
 * @param {Array} rutas — `fimba_propuesta_rutas` (pueden ser de varias propuestas)
 * @param {{ excludeRutaIds?: Array<number|string>, id_propuesta?: unknown }} [opts]
 */
export function computeArtistaTransporteUsage(propuesta, rutas, opts = {}) {
  const idProp = propuesta?.id ?? opts.id_propuesta;
  const cap = computeFimbaCapacity(propuesta);
  const used = sumPropuestaRutasPlazas(rutas, idProp, opts);
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
 * Evento multi-vehículo: Σ plazas asignadas del evento ≤ Σ para_transporte de artistas taggeados.
 * Un solo campo `plazas` (sin split persona/material) → tope transporte total.
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

/**
 * @param {{ cantidad_planificada?: number } | null} propuesta
 * @param {Array<{ activo?: boolean }> | null} participantes
 */
export function computeHotelOccupancy(propuesta, participantes) {
  const pax = Math.max(0, Number(propuesta?.cantidad_planificada) || 0);
  const nominados = (participantes || []).filter((p) => p.activo !== false);
  const nominadosCount = nominados.length;
  const porConfirmar = Math.max(0, pax - nominadosCount);
  return {
    pax_planificada: pax,
    nominados: nominadosCount,
    por_confirmar: porConfirmar,
    noches: nightsBetween(propuesta?.checkin_at, propuesta?.checkout_at),
  };
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

const PROPUESTA_SELECT =
  "id, id_edicion, nombre, color, orden, cantidad_planificada, plazas_extra_materiales, checkin_at, checkout_at, checkin_early, checkout_late, id_hotel, observaciones_logisticas, token_consulta, token_edicion, estado, created_at, updated_at, hoteles:id_hotel ( id, nombre )";

export async function listFimbaPropuestas(edicionId) {
  if (edicionId == null || edicionId === "") {
    return { propuestas: [], error: null };
  }
  const { data, error } = await supabase
    .from("fimba_propuestas")
    .select(PROPUESTA_SELECT)
    .eq("id_edicion", edicionId)
    .order("orden", { ascending: true })
    .order("nombre", { ascending: true });
  if (error) return { propuestas: [], error };
  return { propuestas: data || [], error: null };
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
  const row = {
    id_edicion: Number(payload.id_edicion),
    nombre: String(payload.nombre || "").trim(),
    color: payload.color || FIMBA_ARTISTA_COLORS[0],
    orden: payload.orden != null ? Number(payload.orden) : maxOrden,
    cantidad_planificada: clampPlanificada(payload.cantidad_planificada),
    plazas_extra_materiales: Math.max(0, Number(payload.plazas_extra_materiales) || 0),
    checkin_at: payload.checkin_at || null,
    checkout_at: payload.checkout_at || null,
    checkin_early: payload.checkin_early === true,
    checkout_late: payload.checkout_late === true,
    id_hotel:
      payload.id_hotel != null && payload.id_hotel !== ""
        ? Number(payload.id_hotel)
        : null,
    observaciones_logisticas: normalizeObservacionesLogisticas(
      payload.observaciones_logisticas,
    ),
    estado: payload.estado || "activa",
  };
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
  if (patch.checkin_at !== undefined) row.checkin_at = patch.checkin_at || null;
  if (patch.checkout_at !== undefined) row.checkout_at = patch.checkout_at || null;
  if (patch.checkin_early !== undefined) row.checkin_early = patch.checkin_early === true;
  if (patch.checkout_late !== undefined) row.checkout_late = patch.checkout_late === true;
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
  if (patch.estado != null) row.estado = patch.estado;

  const { data, error } = await supabase
    .from("fimba_propuestas")
    .update(row)
    .eq("id", propuestaId)
    .select(PROPUESTA_SELECT)
    .single();
  return { propuesta: data, error };
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

// ---------------------------------------------------------------------------
// Participantes
// ---------------------------------------------------------------------------

const PARTICIPANTE_SELECT =
  "id, id_propuesta, nombre, apellido, documento, genero, tipo_alimentacion, nota_alimentacion, activo, id_integrante, created_at, updated_at";

function normalizeGenero(value) {
  const g = String(value || "").trim();
  if (FIMBA_GENEROS.some((x) => x.value === g)) return g;
  return FIMBA_GENERO_DEFAULT;
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
  };
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
 * Encode actividad + campos de planilla en `eventos.descripcion` (texto plano).
 */
export function encodeFimbaTrasladoDescripcion({ actividad, destino, vuelo, observaciones }) {
  const parts = [];
  const act = String(actividad || "").trim();
  if (act) parts.push(act);
  const dest = String(destino || "").trim();
  if (dest) parts.push(`Destino: ${dest}`);
  const vu = String(vuelo || "").trim();
  if (vu) parts.push(`Vuelo: ${vu}`);
  const obs = String(observaciones || "").trim();
  if (obs) parts.push(`Obs: ${obs}`);
  return parts.join("\n");
}

/**
 * @param {string|null|undefined} text
 */
export function decodeFimbaTrasladoDescripcion(text) {
  const lines = String(text || "").split("\n");
  let destino = "";
  let vuelo = "";
  let observaciones = "";
  const actLines = [];
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (/^Destino:\s*/i.test(line)) {
      destino = line.replace(/^Destino:\s*/i, "").trim();
    } else if (/^Vuelo:\s*/i.test(line)) {
      vuelo = line.replace(/^Vuelo:\s*/i, "").trim();
    } else if (/^Obs:\s*/i.test(line)) {
      observaciones = line.replace(/^Obs:\s*/i, "").trim();
    } else if (line.trim() !== "") {
      actLines.push(line);
    }
  }
  return {
    actividad: actLines.join("\n").trim(),
    destino,
    vuelo,
    observaciones,
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
 * Solapamiento de ventana en la misma fecha (hora_fin null ⇒ punto al inicio).
 */
export function eventWindowsOverlap(a, b) {
  if (!a?.fecha || !b?.fecha || a.fecha !== b.fecha) return false;
  const a0 = timeToMinutes(a.hora_inicio) ?? 0;
  const a1 = timeToMinutes(a.hora_fin) ?? a0;
  const b0 = timeToMinutes(b.hora_inicio) ?? 0;
  const b1 = timeToMinutes(b.hora_fin) ?? b0;
  const aEnd = Math.max(a0, a1);
  const bEnd = Math.max(b0, b1);
  return a0 < bEnd && b0 < aEnd;
}

/**
 * Plazas FIMBA ya asignadas a un vehículo en una ventana (misma gira / misma fecha+solape).
 * No incluye ocupación OFRN del roster (stub).
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
 * Nota ES de métricas de ventana (libres por solape FIMBA).
 * @param {{ ofrn_eventos?: number, error?: Error|null }} m
 */
function noteVehicleWindowMetrics(m = {}) {
  const notes = [];
  notes.push("Libres = capacidad − plazas FIMBA en eventos que solapan la ventana.");
  const ofrn = Number(m.ofrn_eventos) || 0;
  if (ofrn > 0) {
    notes.push(
      `OFRN: ${ofrn} evento${ofrn === 1 ? "" : "s"} de la gira ya usa${ofrn === 1 ? "" : "n"} este vehículo (FK) en la misma ventana.`,
    );
  }
  notes.push(
    "Cupos roster OFRN (en tránsito / plaza_extra) no se restan aquí; ver planilla Transportes.",
  );
  if (m.error?.message) notes.push(m.error.message);
  return notes.join(" ");
}

/**
 * Disponibilidad de toda la flota en una ventana (misma fecha + solape horarios).
 * Libres = max(0, capacidad_maxima − Σ plazas FIMBA en trayectos solapados).
 * Anota usos OFRN por FK `eventos.id_gira_transporte` (no resta asientos de roster).
 *
 * Preferir esto en el modal multi-vehículo (una query de eventos + una de plazas).
 *
 * @param {number|string} giraId
 * @param {Array<object>} flota — filas `giras_transportes`
 * @param {{ fecha: string, hora_inicio?: string, hora_fin?: string }} window
 * @param {number|string|null} [excludeEventoId] — al editar, no contar plazas de este evento
 * @returns {Promise<{ byId: Record<string, {
 *   capacidad: number|null,
 *   asignadas_fimba: number,
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
) {
  const list = flota || [];
  /** @type {Record<string, any>} */
  const byId = {};
  for (const gt of list) {
    if (gt?.id == null) continue;
    const capacidad = capacidadGiraTransporte(gt);
    byId[String(gt.id)] = {
      capacidad,
      asignadas_fimba: 0,
      libres: capacidad,
      ofrn_eventos: 0,
      label: labelGiraTransporte(gt),
      note: noteVehicleWindowMetrics({ ofrn_eventos: 0 }),
      error: null,
    };
  }

  if (giraId == null || !window?.fecha || list.length === 0) {
    return { byId, error: null };
  }

  const { data: eventos, error: e1 } = await supabase
    .from("eventos")
    .select("id, fecha, hora_inicio, hora_fin, id_gira_transporte")
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

  const overlapping = (eventos || []).filter((ev) => {
    if (excludeEventoId != null && Number(ev.id) === Number(excludeEventoId)) {
      return false;
    }
    return eventWindowsOverlap(ev, window);
  });

  const candidateIds = overlapping.map((e) => e.id);
  const flotaIds = list
    .map((gt) => Number(gt.id))
    .filter((n) => Number.isFinite(n));

  /** @type {Record<string, number>} */
  const fimbaByVeh = {};
  if (candidateIds.length > 0 && flotaIds.length > 0) {
    const { data: rows, error: e2 } = await supabase
      .from("fimba_evento_transportes")
      .select("plazas, id_evento, id_gira_transporte")
      .in("id_gira_transporte", flotaIds)
      .in("id_evento", candidateIds);
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
      const key = String(r.id_gira_transporte);
      fimbaByVeh[key] =
        (fimbaByVeh[key] || 0) + (Math.max(0, Number(r.plazas) || 0));
    }
  }

  /** @type {Record<string, number>} */
  const ofrnByVeh = {};
  for (const ev of overlapping) {
    if (ev.id_gira_transporte == null || ev.id_gira_transporte === "") continue;
    const key = String(ev.id_gira_transporte);
    ofrnByVeh[key] = (ofrnByVeh[key] || 0) + 1;
  }

  for (const gt of list) {
    if (gt?.id == null) continue;
    const sid = String(gt.id);
    const capacidad = capacidadGiraTransporte(gt);
    const asignadas_fimba = fimbaByVeh[sid] || 0;
    const ofrn_eventos = ofrnByVeh[sid] || 0;
    const libres =
      capacidad != null ? Math.max(0, capacidad - asignadas_fimba) : null;
    byId[sid] = {
      capacidad,
      asignadas_fimba,
      libres,
      ofrn_eventos,
      label: labelGiraTransporte(gt),
      note: noteVehicleWindowMetrics({ ofrn_eventos }),
      error: null,
    };
  }

  return { byId, error: null };
}

/**
 * Métricas de capacidad por vehículo en la ventana (wrapper 1 unidad).
 * Libres = capacidad OFRN − plazas FIMBA solapadas.
 * También anota si el vehículo ya figura en eventos OFRN (FK legacy) en la ventana.
 *
 * @returns {Promise<{ capacidad: number|null, asignadas_fimba: number, libres: number|null, ofrn_eventos: number, label?: string, note: string, error: null|Error }>}
 */
export async function computeFimbaVehicleWindowMetrics(
  giraId,
  gt,
  window,
  excludeEventoId = null,
) {
  const capacidad = capacidadGiraTransporte(gt);
  if (!gt) {
    return {
      capacidad: null,
      asignadas_fimba: 0,
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
  );
  const m = byId[String(gt.id)];
  if (!m) {
    return {
      capacidad,
      asignadas_fimba: 0,
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
 * Hard-block: plazas pedidas por unidad ≤ libres de ventana (capacidad − FIMBA solapada).
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
 * Catálogo compartido de tipos de evento OFRN (`tipos_evento` + categorías).
 * Mismo select shape que EventForm / UnifiedAgenda / MusicianCalendar.
 */
export async function listTiposEventoForFimba() {
  const { data, error } = await supabase
    .from("tipos_evento")
    .select(
      "id, nombre, color, id_categoria, categorias_tipos_eventos ( id, nombre )",
    )
    .order("nombre", { ascending: true });
  if (error) return { tipos: [], error };
  return { tipos: normalizeTiposEventoCatalog(data), error: null };
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
 * Grupos de convocatoria de la gira (sin miembros — UI de audiencia).
 * @param {number|string} idGira
 */
export async function listFimbaGiraGrupos(idGira) {
  if (idGira == null || idGira === "") return { grupos: [], error: null };
  const { data, error } = await supabase
    .from("giras_grupos")
    .select("id, id_gira, nombre, color, orden")
    .eq("id_gira", Number(idGira))
    .order("orden", { ascending: true })
    .order("nombre", { ascending: true });
  if (error) return { grupos: [], error };
  return { grupos: data || [], error: null };
}

/**
 * ¿El evento es relevante para la planilla de trayectos / transportes?
 * - Tipo catálogo transporte (`actividadUsaTransporte`)
 * - Asignaciones FIMBA multi-vehículo (`fimba_evento_transportes`)
 * - Parada / tramo OFRN con unidad (`eventos.id_gira_transporte`)
 *
 * @param {{ id_tipo_evento?: unknown, tipos_evento?: object|null, vehiculos?: unknown[], id_gira_transporte?: unknown }} ev
 */
export function isFimbaTrasladoEvent(ev) {
  if (!ev) return false;
  if (actividadUsaTransporte(ev.id_tipo_evento, ev.tipos_evento)) return true;
  if ((ev.vehiculos || []).length > 0) return true;
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

/**
 * Agenda unificada de la edición:
 * 1) Eventos FIMBA: tags `eventos_fimba_propuestas` y/o plazas en `fimba_evento_transportes`
 * 2) Eventos orquesta OFRN de la misma gira (`audiencia_ofrn` tutti/grupos/null)
 *    — se omiten al filtrar por artista; en trayectos (`solo_traslados`) se incluyen
 *      pero solo filas de transporte (tipo / flota FIMBA / `id_gira_transporte`)
 *
 * @param {number|string} edicionId
 * @param {{
 *   id_propuesta?: number|string|null,
 *   id_tipo_evento?: number|string|null,
 *   solo_traslados?: boolean,
 *   include_ofrn?: boolean,
 * }} [opts]
 */
export async function listFimbaAgenda(edicionId, opts = {}) {
  if (edicionId == null || edicionId === "") {
    return { eventos: [], error: null };
  }
  const { edicion, error: eEd } = await getFimbaEdicionById(edicionId);
  if (eEd) return { eventos: [], error: eEd };
  if (!edicion) return { eventos: [], error: new Error("Edición no encontrada") };

  const { propuestas, error: eProp } = await listFimbaPropuestas(edicionId);
  if (eProp) return { eventos: [], error: eProp };
  const propIds = (propuestas || []).map((p) => p.id);
  const propById = Object.fromEntries((propuestas || []).map((p) => [String(p.id), p]));

  let tagQuery = supabase
    .from("eventos_fimba_propuestas")
    .select("id_evento, id_propuesta");
  if (propIds.length > 0) {
    tagQuery = tagQuery.in("id_propuesta", propIds);
  } else {
    // sin artistas: solo se listarán eventos con asignaciones flota (más abajo)
    tagQuery = tagQuery.eq("id_propuesta", -1);
  }
  if (opts.id_propuesta != null && opts.id_propuesta !== "") {
    tagQuery = tagQuery.eq("id_propuesta", Number(opts.id_propuesta));
  }
  const { data: tags, error: eTags } = await tagQuery;
  if (eTags) return { eventos: [], error: eTags };

  const taggedEventIds = [...new Set((tags || []).map((t) => t.id_evento))];

  // Eventos con filas de flota FIMBA solo sobre vehículos de esta gira OFRN
  // (sin tag aún = traslados edition-wide). Nunca flota FIMBA propia.
  let flotaEventIds = [];
  let fleetIds = [];
  if (opts.id_propuesta == null || opts.id_propuesta === "") {
    const { flota, error: eFleet } = await listFimbaFlota(edicion.id_gira);
    if (eFleet) return { eventos: [], error: eFleet };
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
      : opts.id_propuesta == null || opts.id_propuesta === "";

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

  const eventIds = [
    ...new Set([
      ...taggedEventIds,
      ...flotaEventIds,
      ...ofrnEventIds,
      ...ofrnStopIds,
    ]),
  ];
  if (eventIds.length === 0) return { eventos: [], error: null };

  const { data: eventosRaw, error: eEvt } = await supabase
    .from("eventos")
    .select(
      "id, id_gira, id_tipo_evento, id_locacion, fecha, hora_inicio, hora_fin, descripcion, audiencia, audiencia_ofrn, id_gira_transporte, visible_agenda, is_deleted, tipos_evento ( id, nombre, color, id_categoria, categorias_tipos_eventos ( id, nombre ) ), locaciones ( id, nombre, direccion, localidades ( id, localidad, id_region ) ), eventos_grupos ( id_grupo, giras_grupos ( id, nombre, color ) )",
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

  // Con filtro por artista, rehidratar todos los tags de los eventos listados
  let tagsFull = tags || [];
  if (opts.id_propuesta != null && opts.id_propuesta !== "" && eventIds.length > 0) {
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

  let eventos = (eventosRaw || []).map((ev) => {
    const decoded = decodeFimbaTrasladoDescripcion(ev.descripcion);
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
    const mapped = {
      ...ev,
      ...decoded,
      // Destino de texto FIMBA gana; si vacío, locación OFRN
      destino: decoded.destino || locNombre || "",
      locacion_nombre: locNombre,
      locacion_ciudad: locCiudad,
      vehiculos: vehicles,
      propuestas: propuestasTagged,
      grupos,
      // SIN SERVICIO solo para trayectos FIMBA/transporte sin unidad ni OFRN stop
      sin_servicio:
        usaTransporte && vehicles.length === 0 && !hasOfrnUnit,
      pax: Number(ev.audiencia) || 0,
      tipo_nombre: tipoMeta?.nombre || null,
      tipo_color: tipoMeta?.color || null,
      tipo_id_categoria:
        tipoMeta?.id_categoria != null
          ? Number(tipoMeta.id_categoria)
          : tipoMeta?.categorias_tipos_eventos?.id != null
            ? Number(tipoMeta.categorias_tipos_eventos.id)
            : null,
      categoria_nombre: tipoMeta?.categorias_tipos_eventos?.nombre || null,
      es_traslado: usaTransporte || hasOfrnUnit || vehicles.length > 0,
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

  return { eventos, error: null };
}

/**
 * Lista trayectos de transportes FIMBA + paradas/traslados OFRN de la gira.
 * Subconjunto de agenda (`solo_traslados`): tipo transporte, flota FIMBA o `id_gira_transporte`.
 * @param {number|string} edicionId
 * @param {{ id_propuesta?: number|string|null, include_ofrn?: boolean }} [opts]
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

    if (admRes.error) {
      return {
        summary: [],
        admissionRules: [],
        passengers: [],
        localities: [],
        regions: [],
        error: admRes.error,
      };
    }
    if (routeRes.error) {
      return {
        summary: [],
        admissionRules: [],
        passengers: [],
        localities: [],
        regions: [],
        error: routeRes.error,
      };
    }
    if (fleetRes.error) {
      return {
        summary: [],
        admissionRules: [],
        passengers: [],
        localities: [],
        regions: [],
        error: fleetRes.error,
      };
    }
    if (locsRes.error) {
      return {
        summary: [],
        admissionRules: [],
        passengers: [],
        localities: [],
        regions: [],
        error: locsRes.error,
      };
    }
    if (eventsRes.error) {
      return {
        summary: [],
        admissionRules: [],
        passengers: [],
        localities: [],
        regions: [],
        error: eventsRes.error,
      };
    }

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
      error: err instanceof Error ? err : new Error(String(err?.message || err)),
    };
  }
}

// ---------------------------------------------------------------------------
// Rutas FIMBA por artista (subida/bajada con cantidad) — fimba_propuesta_rutas
// ---------------------------------------------------------------------------

const FIMBA_PROPUESTA_RUTA_SELECT =
  "id, id_propuesta, id_gira_transporte, plazas, id_evento_subida, id_evento_bajada, created_at, updated_at, propuesta:id_propuesta ( id, nombre, color, cantidad_planificada, plazas_extra_materiales )";

/**
 * Lista rutas de artista (cantidad) de la edición: las que tocan flota de la gira.
 * @param {number|string} edicionId
 * @param {{ id_gira_transporte?: number|string|null, id_evento?: number|string|null, type?: 'up'|'down'|null }} [opts]
 */
export async function listFimbaPropuestaRutas(edicionId, opts = {}) {
  const edId = Number(edicionId);
  if (!Number.isFinite(edId)) {
    return { rutas: [], error: new Error("id de edición requerido") };
  }
  const { edicion, error: eEd } = await getFimbaEdicionById(edId);
  if (eEd) return { rutas: [], error: eEd };
  if (!edicion?.id_gira) {
    return { rutas: [], error: new Error("Edición sin gira OFRN") };
  }

  // Propuestas de la edición → filtrar rutas por id_propuesta
  const { data: props, error: eProp } = await supabase
    .from("fimba_propuestas")
    .select("id")
    .eq("id_edicion", edId);
  if (eProp) return { rutas: [], error: eProp };
  const propIds = (props || []).map((p) => p.id);
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
 * Hard-block: Σ plazas de rutas del artista (excl. fila en edición) + nuevas ≤ para_transporte.
 * @param {number} idPropuesta
 * @param {number} plazas
 * @param {number|string|null|undefined} excludeRutaId
 */
async function assertPropuestaRutaWithinTransportCap(idPropuesta, plazas, excludeRutaId) {
  const { data: prop, error: eProp } = await supabase
    .from("fimba_propuestas")
    .select("id, nombre, cantidad_planificada, plazas_extra_materiales")
    .eq("id", idPropuesta)
    .maybeSingle();
  if (eProp) return { error: eProp };
  if (!prop) {
    return { error: new Error("Artista (propuesta) no encontrado") };
  }
  const { data: rutas, error: eR } = await supabase
    .from("fimba_propuesta_rutas")
    .select("id, plazas, id_propuesta")
    .eq("id_propuesta", idPropuesta);
  if (eR) return { error: eR };
  const excludeRutaIds =
    excludeRutaId != null && excludeRutaId !== "" ? [excludeRutaId] : [];
  const used = sumPropuestaRutasPlazas(rutas || [], idPropuesta, { excludeRutaIds });
  const check = validateArtistaTransporteAssign(prop, used, plazas);
  if (!check.ok) return { error: check.error };
  return { error: null };
}

/**
 * Alta o actualización de parada subida/bajada con plazas para un artista.
 * Si ya existe una regla de ese tipo (misma propuesta + vehículo + otro extremo
 * incompleto), actualiza; si hay conflicto con otra parada, puede reemplazar.
 * Hard-block si Σ plazas de rides del artista supera para_transporte
 * (cantidad_planificada + plazas_extra_materiales).
 *
 * @param {{
 *   id_propuesta: number|string,
 *   id_gira_transporte: number|string,
 *   plazas: number,
 *   type: 'up'|'down',
 *   id_evento: number|string,
 *   replaceConflict?: boolean,
 * }} payload
 */
export async function upsertFimbaPropuestaRutaStop(payload) {
  const idPropuesta = Number(payload.id_propuesta);
  const idGt = Number(payload.id_gira_transporte);
  const idEvento = Number(payload.id_evento);
  const plazas = Math.max(0, Number(payload.plazas) || 0);
  const type = payload.type === "down" ? "down" : "up";
  const field = type === "up" ? "id_evento_subida" : "id_evento_bajada";

  if (!Number.isFinite(idPropuesta) || !Number.isFinite(idGt) || !Number.isFinite(idEvento)) {
    return { ruta: null, error: new Error("propuesta, vehículo y evento son requeridos") };
  }
  if (plazas <= 0) {
    return { ruta: null, error: new Error("Indicá una cantidad de plazas > 0") };
  }

  // ¿Ya apunta a este mismo evento?
  const { data: same, error: eSame } = await supabase
    .from("fimba_propuesta_rutas")
    .select(FIMBA_PROPUESTA_RUTA_SELECT)
    .eq("id_propuesta", idPropuesta)
    .eq("id_gira_transporte", idGt)
    .eq(field, idEvento)
    .maybeSingle();
  if (eSame) return { ruta: null, error: eSame };

  if (same) {
    const capCheck = await assertPropuestaRutaWithinTransportCap(
      idPropuesta,
      plazas,
      same.id,
    );
    if (capCheck.error) return { ruta: null, error: capCheck.error };
    const { data, error } = await supabase
      .from("fimba_propuesta_rutas")
      .update({ plazas, updated_at: new Date().toISOString() })
      .eq("id", same.id)
      .select(FIMBA_PROPUESTA_RUTA_SELECT)
      .single();
    if (error) return { ruta: null, error };
    return { ruta: data, error: null };
  }

  // ¿Conflicto: misma propuesta+vehículo con otra subida/bajada en otro evento?
  const { data: others, error: eO } = await supabase
    .from("fimba_propuesta_rutas")
    .select("*")
    .eq("id_propuesta", idPropuesta)
    .eq("id_gira_transporte", idGt)
    .not(field, "is", null);
  if (eO) return { ruta: null, error: eO };

  const conflict = (others || []).find(
    (r) => r[field] != null && String(r[field]) !== String(idEvento),
  );
  if (conflict) {
    if (!payload.replaceConflict) {
      return {
        ruta: null,
        conflict: conflict,
        error: new Error(
          type === "up"
            ? "Este artista ya tiene subida en otra parada de este vehículo"
            : "Este artista ya tiene bajada en otra parada de este vehículo",
        ),
      };
    }
    const capCheck = await assertPropuestaRutaWithinTransportCap(
      idPropuesta,
      plazas,
      conflict.id,
    );
    if (capCheck.error) return { ruta: null, error: capCheck.error };
    const { data, error } = await supabase
      .from("fimba_propuesta_rutas")
      .update({
        [field]: idEvento,
        plazas,
        updated_at: new Date().toISOString(),
      })
      .eq("id", conflict.id)
      .select(FIMBA_PROPUESTA_RUTA_SELECT)
      .single();
    if (error) return { ruta: null, error };
    return { ruta: data, error: null, replaced: true };
  }

  // Completar una ruta incompleta (solo el otro extremo cargado)
  const otherField = type === "up" ? "id_evento_bajada" : "id_evento_subida";
  const { data: openRows, error: eOpen } = await supabase
    .from("fimba_propuesta_rutas")
    .select("*")
    .eq("id_propuesta", idPropuesta)
    .eq("id_gira_transporte", idGt)
    .is(field, null)
    .not(otherField, "is", null)
    .order("id", { ascending: false })
    .limit(1);
  if (eOpen) return { ruta: null, error: eOpen };

  if (openRows && openRows.length > 0) {
    const row = openRows[0];
    const capCheck = await assertPropuestaRutaWithinTransportCap(
      idPropuesta,
      plazas,
      row.id,
    );
    if (capCheck.error) return { ruta: null, error: capCheck.error };
    const { data, error } = await supabase
      .from("fimba_propuesta_rutas")
      .update({
        [field]: idEvento,
        plazas,
        updated_at: new Date().toISOString(),
      })
      .eq("id", row.id)
      .select(FIMBA_PROPUESTA_RUTA_SELECT)
      .single();
    if (error) return { ruta: null, error };
    return { ruta: data, error: null, completed: true };
  }

  const capCheck = await assertPropuestaRutaWithinTransportCap(
    idPropuesta,
    plazas,
    null,
  );
  if (capCheck.error) return { ruta: null, error: capCheck.error };

  const insertRow = {
    id_propuesta: idPropuesta,
    id_gira_transporte: idGt,
    plazas,
    id_evento_subida: type === "up" ? idEvento : null,
    id_evento_bajada: type === "down" ? idEvento : null,
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
    return { error: new Error("id de ruta requerido") };
  }
  const field = type === "down" ? "id_evento_bajada" : "id_evento_subida";
  const other = type === "down" ? "id_evento_subida" : "id_evento_bajada";

  const { data: row, error: e1 } = await supabase
    .from("fimba_propuesta_rutas")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (e1) return { error: e1 };
  if (!row) return { error: null };

  if (row[other] == null) {
    return deleteFimbaPropuestaRuta(id);
  }

  const { error } = await supabase
    .from("fimba_propuesta_rutas")
    .update({ [field]: null, updated_at: new Date().toISOString() })
    .eq("id", id);
  return { error };
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
 * @param {string} [payload.actividad]
 * @param {string} [payload.destino]
 * @param {string} [payload.vuelo]
 * @param {string} [payload.observaciones]
 * @param {number} [payload.pax] — # PAX (eventos.audiencia)
 * @param {boolean} [payload.sin_servicio]
 * @param {boolean} [payload.usa_transporte] — fuerza UI de flota; default por id_tipo_evento
 * @param {Array<{ id_gira_transporte: number|string, plazas?: number }>} [payload.vehiculos]
 * @param {Array<number|string>} [payload.id_propuestas] — tags artistas
 * @param {Array<number|string>} [payload.id_grupos] — ids giras_grupos si audiencia grupos
 * @param {number} [payload.id_tipo_evento] — FK tipos_evento; default genérico (16) o traslado (11)
 * @param {'none'|'tutti'|'grupos'} [payload.audiencia_ofrn] — default 'none'
 * @param {number|string|null} [payload.id_locacion] — FK locaciones (parada / destino)
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

  // Validar que los vehículos pertenecen a la gira (nunca inventar flota FIMBA)
  if (vehiculos.length > 0) {
    const ids = vehiculos.map((v) => Number(v.id_gira_transporte));
    const { data: owned, error: eOwn } = await supabase
      .from("giras_transportes")
      .select("id")
      .eq("id_gira", idGira)
      .in("id", ids);
    if (eOwn) return { evento: null, error: eOwn };
    const ownedSet = new Set((owned || []).map((r) => Number(r.id)));
    const invalid = ids.filter((id) => !ownedSet.has(id));
    if (invalid.length) {
      return {
        evento: null,
        error: new Error(
          "Uno o más vehículos no pertenecen a la flota de la gira OFRN. Configurá la flota en Logística → Transporte.",
        ),
      };
    }
  }

  // Hard-block: Σ plazas multi-vehículo del evento ≤ Σ para_transporte de artistas taggeados
  // (cantidad_planificada + plazas_extra_materiales por artista; un solo campo plazas → tope total)
  const propIdsForCap = [
    ...new Set(
      (payload.id_propuestas || [])
        .map(Number)
        .filter((id) => Number.isFinite(id) && id > 0),
    ),
  ];
  if (vehiculos.length > 0 && propIdsForCap.length > 0) {
    const totalPlazas = vehiculos.reduce(
      (s, v) => s + Math.max(0, Number(v.plazas) || 0),
      0,
    );
    const { data: propsCap, error: eCap } = await supabase
      .from("fimba_propuestas")
      .select("id, cantidad_planificada, plazas_extra_materiales")
      .in("id", propIdsForCap);
    if (eCap) return { evento: null, error: eCap };
    const checkCap = validateEventoTransportPlazasVsArtistas(
      propsCap || [],
      totalPlazas,
    );
    if (!checkCap.ok) {
      return { evento: null, error: checkCap.error };
    }
  }

  // Hard-block: plazas por unidad ≤ libres de ventana (capacidad − FIMBA solapada; excl. este evento)
  if (vehiculos.length > 0 && payload.fecha) {
    const vehIds = vehiculos
      .map((v) => Number(v.id_gira_transporte))
      .filter((n) => Number.isFinite(n));
    if (vehIds.length > 0) {
      const { data: flotaRows, error: eFlota } = await supabase
        .from("giras_transportes")
        .select(GIRA_TRANSPORTE_SELECT)
        .eq("id_gira", idGira)
        .in("id", vehIds);
      if (eFlota) return { evento: null, error: eFlota };
      const excludeId =
        payload.id != null && payload.id !== "" ? Number(payload.id) : null;
      const { byId, error: eAv } = await listVehiclesAvailability(
        idGira,
        flotaRows || [],
        {
          fecha: payload.fecha,
          hora_inicio: payload.hora_inicio || null,
          hora_fin: payload.hora_fin || null,
        },
        Number.isFinite(excludeId) ? excludeId : null,
      );
      if (eAv) return { evento: null, error: eAv };
      const checkLibres = validateEventoTransportPlazasVsLibres(vehiculos, byId);
      if (!checkLibres.ok) {
        return { evento: null, error: checkLibres.error };
      }
    }
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

  if (grupoIds.length > 0) {
    const { data: ownedG, error: eG } = await supabase
      .from("giras_grupos")
      .select("id")
      .eq("id_gira", idGira)
      .in("id", grupoIds);
    if (eG) return { evento: null, error: eG };
    const ownedSet = new Set((ownedG || []).map((r) => Number(r.id)));
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

  const descripcion = encodeFimbaTrasladoDescripcion({
    actividad: payload.actividad,
    destino: payload.destino,
    vuelo: payload.vuelo,
    observaciones: payload.observaciones,
  });

  const row = {
    id_gira: idGira,
    fecha: payload.fecha,
    hora_inicio: normalizeTime(payload.hora_inicio),
    hora_fin: normalizeTime(payload.hora_fin),
    descripcion: descripcion || null,
    audiencia: Math.max(0, Number(payload.pax) || 0),
    audiencia_ofrn: audienciaOfrn,
    id_tipo_evento: tipoId,
    visible_agenda: payload.visible_agenda !== false,
    updated_at: new Date().toISOString(),
  };

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
        "id, id_gira, id_tipo_evento, fecha, hora_inicio, hora_fin, descripcion, audiencia, audiencia_ofrn, id_gira_transporte",
      )
      .single());
  } else {
    ({ data: evento, error } = await supabase
      .from("eventos")
      .insert(row)
      .select(
        "id, id_gira, id_tipo_evento, fecha, hora_inicio, hora_fin, descripcion, audiencia, audiencia_ofrn, id_gira_transporte",
      )
      .single());
  }
  if (error) return { evento: null, error };

  const { error: tagErr } = await setEventoFimbaPropuestas(
    evento.id,
    payload.id_propuestas || [],
  );
  if (tagErr) return { evento: null, error: tagErr };

  const { error: vehErr } = await setFimbaEventoTransportes(evento.id, vehiculos);
  if (vehErr) return { evento: null, error: vehErr };

  // tutti/none → clean eventos_grupos; grupos → replace selected ids
  const { error: gruposErr } = await setEventoGrupos(supabase, evento.id, grupoIds);
  if (gruposErr) return { evento: null, error: gruposErr };

  return { evento, error: null };
}

/** Alias histórico del editor de transportes. */
export async function saveFimbaTraslado(payload) {
  return saveFimbaEvento({
    ...payload,
    id_tipo_evento: payload.id_tipo_evento ?? FIMBA_TIPO_EVENTO_TRASLADO,
    usa_transporte: true,
  });
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

/**
 * Reporte de hotelería por artista de una edición.
 * Pax hotel = cantidad_planificada (NO plazas_extra_materiales).
 * sin_nombre / por_confirmar = max(0, tope − nominados).
 * @param {number|string} edicionId
 * @param {{ id_propuesta?: number|string|null }} [opts]
 */
export async function listFimbaHoteleria(edicionId, opts = {}) {
  if (edicionId == null || edicionId === "") {
    return { rows: [], blocks: [], totals: null, edicion: null, error: null };
  }
  const { edicion, error: eEd } = await getFimbaEdicionById(edicionId);
  if (eEd) return { rows: [], blocks: [], totals: null, edicion: null, error: eEd };
  if (!edicion) {
    return {
      rows: [],
      blocks: [],
      totals: null,
      edicion: null,
      error: new Error("Edición no encontrada"),
    };
  }

  const { propuestas, error: eProp } = await listFimbaPropuestas(edicionId);
  if (eProp) return { rows: [], blocks: [], totals: null, edicion, error: eProp };

  let props = propuestas || [];
  if (opts.id_propuesta != null && opts.id_propuesta !== "") {
    props = props.filter((p) => Number(p.id) === Number(opts.id_propuesta));
  }

  const rows = [];
  for (const prop of props) {
    const { participantes, error: ePart } = await listFimbaParticipantes(prop.id);
    if (ePart) return { rows: [], blocks: [], totals: null, edicion, error: ePart };
    const { habitaciones, error: eHab } = await listFimbaHabitaciones(prop.id);
    if (eHab) return { rows: [], blocks: [], totals: null, edicion, error: eHab };
    const occ = computeHotelOccupancy(prop, participantes);
    const activos = (participantes || []).filter((p) => p.activo !== false);
    const sin_nombre = occ.por_confirmar;
    const camas_noche =
      occ.noches != null ? occ.pax_planificada * occ.noches : 0;
    const alimentacion = summarizeAlimentacion(participantes);
    const rooming = summarizeFimbaHabitaciones(habitaciones);
    rows.push({
      propuesta: prop,
      hotel: prop.hoteles || null,
      checkin_at: prop.checkin_at,
      checkout_at: prop.checkout_at,
      checkin_early: prop.checkin_early === true,
      checkout_late: prop.checkout_late === true,
      ...occ,
      sin_nombre,
      tope_personas: occ.pax_planificada,
      para_hotel_comida: occ.pax_planificada,
      total_pax_hotel: occ.pax_planificada,
      camas_noche,
      alimentacion,
      personas: activos,
      participantes: activos,
      habitaciones: habitaciones || [],
      rooming,
      rooming_label: formatFimbaHabitacionesCounts(rooming.byTipo),
    });
  }

  const totals = rows.reduce(
    (acc, b) => {
      acc.pax += b.total_pax_hotel;
      acc.nominados += b.nominados;
      acc.sin_nombre += b.sin_nombre;
      acc.camas_noche += b.camas_noche;
      return acc;
    },
    { pax: 0, nominados: 0, sin_nombre: 0, camas_noche: 0 },
  );

  return { rows, blocks: rows, totals, edicion, error: null };
}

/** Alias de listFimbaHoteleria (shape con blocks/totals/edicion). */
export async function loadFimbaHoteleriaReport(edicionId, opts = {}) {
  return listFimbaHoteleria(edicionId, opts);
}

// ---------------------------------------------------------------------------
// Rooming / habitaciones por artista (propuesta)
// ---------------------------------------------------------------------------

const HABITACION_SELECT =
  "id, id_propuesta, tipo, matrimonial, orden, label, created_at, updated_at";

const OCUPANTE_SELECT =
  "id, id_habitacion, id_participante, orden, created_at, participante:id_participante ( id, id_propuesta, nombre, apellido, documento, genero, tipo_alimentacion, activo )";

function normalizeHabTipo(tipo) {
  const t = String(tipo || "").toUpperCase().trim();
  if (FIMBA_TIPO_HABITACION_CAPACIDAD[t] != null) return t;
  return null;
}

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

  const byHab = new Map();
  for (const o of occs || []) {
    const list = byHab.get(o.id_habitacion) || [];
    list.push(o);
    byHab.set(o.id_habitacion, list);
  }

  const habitaciones = habs.map((h) => {
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

  return { habitaciones, error: null };
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
  "id, id_edicion, orden, numero_expediente, id_propuesta, nombre, monto, fecha_limite_resol, tipo_contratacion, envio_firma_mfm_nota, nota_firmada, falta_documentacion, enviado_adm, ultimo_estado_conocido, created_at, updated_at, fimba_propuestas:id_propuesta ( id, nombre, color )";

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
 * Normaliza monto opcional: vacío → null; coma decimal OK.
 * @param {unknown} value
 * @returns {number|null}
 */
export function parseFimbaMonto(value) {
  if (value == null || value === "") return null;
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  const s = String(value).trim().replace(/\s/g, "").replace(",", ".");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
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
    fecha_limite_resol: payload?.fecha_limite_resol || null,
    tipo_contratacion:
      payload?.tipo_contratacion != null &&
      String(payload.tipo_contratacion).trim() !== ""
        ? String(payload.tipo_contratacion).trim()
        : FIMBA_TIPO_CONTRATACION_DEFAULT,
    envio_firma_mfm_nota: payload?.envio_firma_mfm_nota === true,
    nota_firmada: payload?.nota_firmada === true,
    falta_documentacion: payload?.falta_documentacion === true,
    enviado_adm: payload?.enviado_adm === true,
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
  if (patch.fecha_limite_resol !== undefined) {
    body.fecha_limite_resol = patch.fecha_limite_resol || null;
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
