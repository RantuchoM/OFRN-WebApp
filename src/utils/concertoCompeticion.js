/** Concerto Competition: escala, electorado, horarios de Argentina y llamadas al cliente. */

import { fetchRosterForGira } from "../hooks/useGiraRoster";

export const AR_TZ = "America/Argentina/Buenos_Aires";

/** Bloque de `programas_repertorios` que esta pantalla reconcilia en la gira. */
export const CONCERTO_BLOCK_NAME = "Concerto Competition";

const REPERTOIRE_ROW_SELECT =
  "id, id_obra, orden, id_repertorio, obras(id, titulo, instrumentacion, link_drive, obras_particellas(nombre_archivo, nota_organico, instrumentos(instrumento, abreviatura)))";

export function plainWorkTitle(value) {
  return String(value || "")
    .replace(/<[^>]*>?/gm, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export const SCORE_SCALE = [
  { value: 10, label: "10", descripcion: "Interpretación excepcional." },
  {
    value: 9.5,
    label: "9,5",
    descripcion: "Sobresaliente, con detalles menores por ajustar.",
  },
  {
    value: 9,
    label: "9",
    descripcion: "Muy sólida y musicalmente convincente.",
  },
  {
    value: 8.5,
    label: "8,5",
    descripcion: "Muy buena, con algunos aspectos mejorables.",
  },
  {
    value: 8,
    label: "8",
    descripcion: "Buena, con fortalezas claras y aspectos a trabajar.",
  },
  {
    value: 7.5,
    label: "7,5",
    descripcion: "Correcta, aunque con varios aspectos por desarrollar.",
  },
  {
    value: 7,
    label: "7",
    descripcion: "Aceptable, con aspectos importantes por mejorar.",
  },
];

export const SCALE_INTRO = [
  "La votación valora la interpretación de cada participante. No es un orden de mérito ni una clasificación.",
  "Cada músico asigna de 7 a 10, considerando musicalidad y expresividad, solidez técnica, interpretación y estilo, presencia solista.",
];

export const SCALE_FOOT =
  "La puntuación se refiere solo a la interpretación escuchada en esta instancia.";

export const WINDOW_COPY = {
  pending: "La votación todavía no abre.",
  closed: "La votación está cerrada.",
  undefined: "Falta que definan la ventana de votación.",
};

export function isConcertoStaff(roles) {
  return (
    Array.isArray(roles) &&
    (roles.includes("admin") || roles.includes("editor"))
  );
}

export function isEstableReal(integrante) {
  if (!integrante) return false;
  if (integrante.es_simulacion === true) return false;
  const condicion = String(integrante.condicion || "").trim().toLowerCase();
  return condicion === "estable";
}

export function estadoCuentaComoElector(estado) {
  return String(estado || "").trim().toLowerCase() !== "ausente";
}

export function formatPersona(persona) {
  const nombre = String(persona?.nombre || "").trim();
  const apellido = String(persona?.apellido || "").trim();
  return [nombre, apellido].filter(Boolean).join(" ");
}

export function formatPersonaLista(persona) {
  const apellido = String(persona?.apellido || "").trim();
  const nombre = String(persona?.nombre || "").trim();
  if (apellido && nombre) return `${apellido}, ${nombre}`;
  return apellido || nombre || `Integrante ${persona?.id ?? ""}`;
}

export function formatParticipanteNombres(integrantes) {
  const names = (integrantes || []).map(formatPersona).filter(Boolean);
  if (names.length === 0) return "";
  if (names.length === 1) return names[0];
  return `${names[0]} y ${names[1]}`;
}

/**
 * Nota de la fila del bloque: nombres como en la tabla y, si hay, la observación.
 * Sin integrantes no inventa un nombre. Sin observación no agrega una línea vacía.
 */
export function formatConcertoRepertoireNote(integrantes, observaciones) {
  const nombres = formatParticipanteNombres(integrantes);
  const texto = String(observaciones ?? "").trim();
  if (!nombres) return texto || null;
  if (!texto) return nombres;
  return `${nombres}\n${texto}`;
}

export function formatPuntaje(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "";
  return n.toLocaleString("es-AR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

export function formatCantidadBoletas(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "";
  return n === 1 ? "1 boleta" : `${n} boletas`;
}

export function formatGiraLabel(gira) {
  if (!gira) return "Sin gira";
  const name = String(gira.nombre_gira || "").trim() || `Programa ${gira.id}`;
  const nom = String(gira.nomenclador || "").trim();
  return nom ? `${nom}. ${name}` : name;
}

function formatDiaMes(value) {
  if (!value) return "";
  const raw = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const [, month, day] = raw.split("-");
    return `${day}/${month}`;
  }
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: AR_TZ,
    day: "2-digit",
    month: "2-digit",
  }).format(date);
}

/** Rango corto de la gira (`programas.fecha_desde` / `fecha_hasta`). Vacío si no hay gira. */
export function formatGiraRango(gira) {
  if (!gira) return "";
  const desde = formatDiaMes(gira.fecha_desde);
  const hasta = formatDiaMes(gira.fecha_hasta);
  if (desde && hasta) return `${desde} - ${hasta}`;
  return desde || hasta || "";
}

export function lineaPrincipalParticipante(participante) {
  const nombre = formatParticipanteNombres(participante?.integrantes) || "Sin nombre";
  const titulo = plainWorkTitle(participante?.repertorio_obra?.obras?.titulo);
  return titulo ? `${nombre} - ${titulo}` : nombre;
}

export function isAllowedScore(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return false;
  return SCORE_SCALE.some((item) => Math.abs(item.value - n) < 0.001);
}

export function participanteIncluye(participante, userId) {
  if (userId == null) return false;
  return (participante?.integrantes || []).some(
    (persona) => String(persona.id) === String(userId),
  );
}

export function boletaCompleta(participantes, scores) {
  if (!participantes?.length) return false;
  return participantes.every((participante) =>
    isAllowedScore(scores?.[String(participante.id)]),
  );
}

export function editionVisibleNow(edicion, now = new Date()) {
  if (!edicion?.visible_desde || !edicion?.visible_hasta) return false;
  const from = new Date(edicion.visible_desde).getTime();
  const to = new Date(edicion.visible_hasta).getTime();
  const t = now.getTime();
  if (!Number.isFinite(from) || !Number.isFinite(to)) return false;
  return t >= from && t <= to;
}

export function pickDefaultEdition(ediciones, now = new Date()) {
  if (!ediciones?.length) return null;
  const visible = ediciones.filter((edicion) => editionVisibleNow(edicion, now));
  const pool = visible.length ? visible : ediciones;
  return [...pool].sort((a, b) => {
    const ta = new Date(a.visible_hasta || 0).getTime();
    const tb = new Date(b.visible_hasta || 0).getTime();
    if (tb !== ta) return tb - ta;
    return Number(b.id) - Number(a.id);
  })[0];
}

export function windowState(instancia, now = new Date()) {
  if (!instancia?.abre_en || !instancia?.cierra_en) return "undefined";
  const abre = new Date(instancia.abre_en).getTime();
  const cierra = new Date(instancia.cierra_en).getTime();
  if (!Number.isFinite(abre) || !Number.isFinite(cierra)) return "undefined";
  const t = now.getTime();
  if (t < abre) return "pending";
  if (t > cierra) return "closed";
  return "open";
}

export function toDatetimeLocalAR(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: AR_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type) => parts.find((part) => part.type === type)?.value || "";
  const hour = get("hour") === "24" ? "00" : get("hour");
  return `${get("year")}-${get("month")}-${get("day")}T${hour}:${get("minute")}`;
}

/** Interpreta el valor de datetime-local como hora de Argentina y devuelve timestamptz con offset -03. */
export function fromDatetimeLocalAR(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const withSeconds = raw.length === 16 ? `${raw}:00` : raw;
  const iso = `${withSeconds}-03:00`;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return iso;
}

export function formatDateTimeAR(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: AR_TZ,
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

export function nextOrden(rows) {
  const max = (rows || []).reduce(
    (current, row) => Math.max(current, Number(row?.orden) || 0),
    0,
  );
  return max + 1;
}

function unwrapRpcJson(data) {
  if (typeof data === "string") {
    try {
      return JSON.parse(data);
    } catch {
      return data;
    }
  }
  return data;
}

export function rowsFromRpc(data) {
  const value = unwrapRpcJson(data);
  if (Array.isArray(value)) return value;
  return [];
}

export function rpcFailure(data, error) {
  if (error) return error.message || "No se pudo completar la operación.";
  const value = unwrapRpcJson(data);
  if (
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    value.ok === false
  ) {
    return value.error || "La operación no se pudo completar.";
  }
  return "";
}

export function friendlySchemaError(error) {
  const msg = error?.message || "No se pudo cargar Concerto.";
  if (
    /concerto_/i.test(msg) &&
    /schema cache|does not exist|Could not find|relation/i.test(msg)
  ) {
    return "Concerto todavía no está disponible en la base. Cuando la migración esté aplicada, recargá esta pantalla.";
  }
  return msg;
}

function sortByOrden(rows) {
  return [...(rows || [])].sort((a, b) => {
    const oa = Number(a.orden) || 0;
    const ob = Number(b.orden) || 0;
    if (oa !== ob) return oa - ob;
    return Number(a.id) - Number(b.id);
  });
}

async function selectIn(supabase, table, columns, column, ids, orderColumn) {
  if (!ids?.length) return { data: [], error: null };
  let query = supabase.from(table).select(columns).in(column, ids);
  if (orderColumn) query = query.order(orderColumn, { ascending: true });
  return query;
}

/** Hasta dos integrantes por participante, en el mismo orden que la tabla (id de integrante). */
async function integrantesPorParticipante(supabase, participanteIds) {
  const { data: links, error: linkError } = await selectIn(
    supabase,
    "concerto_participante_integrantes",
    "id_participante, id_integrante",
    "id_participante",
    participanteIds,
    "id_integrante",
  );
  if (linkError) return { map: new Map(), error: linkError };

  const integranteIds = [
    ...new Set((links || []).map((link) => link.id_integrante).filter((id) => id != null)),
  ];
  const { data: personas, error: personasError } = await selectIn(
    supabase,
    "integrantes",
    "id, nombre, apellido",
    "id",
    integranteIds,
  );
  if (personasError) return { map: new Map(), error: personasError };

  const personasById = new Map((personas || []).map((persona) => [String(persona.id), persona]));
  const map = new Map();
  for (const link of links || []) {
    const key = String(link.id_participante);
    if (!map.has(key)) map.set(key, []);
    const list = map.get(key);
    if (list.length >= 2) continue;
    const persona = personasById.get(String(link.id_integrante));
    list.push(
      persona || {
        id: link.id_integrante,
        nombre: "",
        apellido: "",
      },
    );
  }
  return { map, error: null };
}

/**
 * Girás en las que esta persona está convocada según fetchRosterForGira
 * y no figura ausente. No recalcula ensambles ni exclusiones.
 */
export async function girasElectorado(supabase, userId, giraIds) {
  const ids = [
    ...new Set(
      (giraIds || [])
        .filter((id) => id != null)
        .map((id) => Number(id))
        .filter((id) => Number.isFinite(id)),
    ),
  ];
  if (!ids.length || !Number.isFinite(Number(userId))) {
    return { giras: new Set(), error: null };
  }
  const { data: programas, error } = await supabase
    .from("programas")
    .select("id, fecha_desde, fecha_hasta")
    .in("id", ids);
  if (error) return { giras: new Set(), error };

  const giras = new Set();
  try {
    await Promise.all(
      (programas || []).map(async (gira) => {
        const { roster } = await fetchRosterForGira(supabase, gira, { lite: true });
        const row = (roster || []).find((person) => String(person.id) === String(userId));
        if (row && estadoCuentaComoElector(row.estado_gira)) giras.add(String(gira.id));
      }),
    );
  } catch (err) {
    return { giras: new Set(), error: err };
  }
  return { giras, error: null };
}

export async function musicianCanSeeConcerto(supabase, userId) {
  const id = Number(userId);
  if (!Number.isFinite(id)) return false;

  const { data: me, error: meError } = await supabase
    .from("integrantes")
    .select("id, condicion, es_simulacion")
    .eq("id", id)
    .maybeSingle();
  if (meError || !isEstableReal(me)) return false;

  const { data: ediciones, error: edError } = await supabase
    .from("concerto_ediciones")
    .select("id, visible_desde, visible_hasta");
  if (edError || !ediciones?.length) return false;

  const visibleIds = ediciones
    .filter((edicion) => editionVisibleNow(edicion))
    .map((edicion) => edicion.id);
  if (!visibleIds.length) return false;

  const { data: instancias, error: instError } = await supabase
    .from("concerto_instancias")
    .select("id, id_edicion, id_gira")
    .in("id_edicion", visibleIds)
    .not("id_gira", "is", null);
  if (instError || !instancias?.length) return false;

  const giraIds = [...new Set(instancias.map((instancia) => instancia.id_gira))];
  const { giras, error: rosterError } = await girasElectorado(supabase, id, giraIds);
  if (rosterError) return false;
  return instancias.some(
    (instancia) => instancia.id_gira != null && giras.has(String(instancia.id_gira)),
  );
}

export async function fetchEdiciones(supabase) {
  return supabase
    .from("concerto_ediciones")
    .select("id, nombre, visible_desde, visible_hasta")
    .order("id", { ascending: false });
}

export async function fetchEditionChoices(supabase, userId, isStaff) {
  const { data, error } = await fetchEdiciones(supabase);
  if (error) return { ediciones: [], error };
  const all = data || [];
  if (isStaff) return { ediciones: all, error: null };

  const visible = all.filter((edicion) => editionVisibleNow(edicion));
  if (!visible.length) return { ediciones: [], error: null };

  const { data: instancias, error: instError } = await supabase
    .from("concerto_instancias")
    .select("id, id_edicion, id_gira")
    .in(
      "id_edicion",
      visible.map((edicion) => edicion.id),
    )
    .not("id_gira", "is", null);
  if (instError) return { ediciones: [], error: instError };
  if (!instancias?.length) return { ediciones: [], error: null };

  const id = Number(userId);
  const { data: me, error: meError } = await supabase
    .from("integrantes")
    .select("id, condicion, es_simulacion")
    .eq("id", id)
    .maybeSingle();
  if (meError) return { ediciones: [], error: meError };
  if (!isEstableReal(me)) return { ediciones: [], error: null };

  const giraIds = [...new Set(instancias.map((instancia) => instancia.id_gira))];
  const { giras: girasOk, error: rosterError } = await girasElectorado(supabase, id, giraIds);
  if (rosterError) return { ediciones: [], error: rosterError };
  const allowed = new Set(
    instancias
      .filter(
        (instancia) =>
          instancia.id_gira != null && girasOk.has(String(instancia.id_gira)),
      )
      .map((instancia) => String(instancia.id_edicion)),
  );
  return {
    ediciones: visible.filter((edicion) => allowed.has(String(edicion.id))),
    error: null,
  };
}

export async function fetchEditionBundle(supabase, edicionId, userId) {
  const { data: instanciasRaw, error: instError } = await supabase
    .from("concerto_instancias")
    .select("id, id_edicion, id_gira, titulo, abre_en, cierra_en, orden")
    .eq("id_edicion", edicionId)
    .order("orden", { ascending: true });
  if (instError) return { instancias: [], error: instError };

  const instancias = sortByOrden(instanciasRaw || []);
  const instanciaIds = instancias.map((instancia) => instancia.id);
  const { data: participantesRaw, error: partError } = await selectIn(
    supabase,
    "concerto_participantes",
    "id, id_instancia, observaciones, orden, id_repertorio_obra",
    "id_instancia",
    instanciaIds,
    "orden",
  );
  if (partError) return { instancias: [], error: partError };

  const participantes = sortByOrden(participantesRaw || []);
  const rowIds = participantes
    .map((participante) => participante.id_repertorio_obra)
    .filter((id) => id != null);
  const { data: repertoireRows, error: repertoireError } = await selectIn(
    supabase,
    "repertorio_obras",
    REPERTOIRE_ROW_SELECT,
    "id",
    rowIds,
  );
  if (repertoireError) return { instancias: [], error: repertoireError };
  const repertoireById = new Map(
    (repertoireRows || []).map((row) => [String(row.id), row]),
  );
  const participanteIds = participantes.map((participante) => participante.id);
  const { map: linksByParticipante, error: linkError } = await integrantesPorParticipante(
    supabase,
    participanteIds,
  );
  if (linkError) return { instancias: [], error: linkError };

  const giraIds = [
    ...new Set(instancias.map((instancia) => instancia.id_gira).filter((id) => id != null)),
  ];
  const { data: giras, error: girasError } = await selectIn(
    supabase,
    "programas",
    "id, nombre_gira, nomenclador, fecha_desde, fecha_hasta",
    "id",
    giraIds,
  );
  if (girasError) return { instancias: [], error: girasError };

  const id = Number(userId);
  let me = null;
  let girasOk = new Set();
  if (Number.isFinite(id)) {
    const { data: meRow, error: meError } = await supabase
      .from("integrantes")
      .select("id, condicion, es_simulacion")
      .eq("id", id)
      .maybeSingle();
    if (meError) return { instancias: [], error: meError };
    me = meRow;
    if (isEstableReal(me) && giraIds.length) {
      const electorado = await girasElectorado(supabase, id, giraIds);
      if (electorado.error) return { instancias: [], error: electorado.error };
      girasOk = electorado.giras;
    }
  }
  const girasById = new Map((giras || []).map((gira) => [String(gira.id), gira]));
  const participantesByInstancia = new Map();
  for (const participante of participantes) {
    const key = String(participante.id_instancia);
    if (!participantesByInstancia.has(key)) participantesByInstancia.set(key, []);
    participantesByInstancia.get(key).push({
      ...participante,
      integrantes: linksByParticipante.get(String(participante.id)) || [],
      repertorio_obra:
        participante.id_repertorio_obra != null
          ? repertoireById.get(String(participante.id_repertorio_obra)) || null
          : null,
    });
  }

  return {
    instancias: instancias.map((instancia) => ({
      ...instancia,
      gira: instancia.id_gira != null ? girasById.get(String(instancia.id_gira)) || null : null,
      participantes: participantesByInstancia.get(String(instancia.id)) || [],
      esElectorado:
        isEstableReal(me) &&
        instancia.id_gira != null &&
        girasOk.has(String(instancia.id_gira)),
    })),
    error: null,
  };
}

export async function fetchProgramasOptions(supabase) {
  const { data, error } = await supabase
    .from("programas")
    .select("id, nombre_gira, nomenclador, fecha_desde")
    .order("fecha_desde", { ascending: false })
    .limit(500);
  if (error) return { options: [], error };
  return {
    options: (data || []).map((gira) => ({
      id: gira.id,
      label: formatGiraLabel(gira),
      subLabel: gira.fecha_desde || "",
    })),
    error: null,
  };
}

export async function fetchIntegrantesOptions(supabase) {
  const { data, error } = await supabase
    .from("integrantes")
    .select("id, nombre, apellido, es_simulacion")
    .or("es_simulacion.is.null,es_simulacion.eq.false")
    .order("apellido", { ascending: true })
    .order("nombre", { ascending: true });
  if (error) return { options: [], error };
  return {
    options: (data || [])
      .filter((persona) => persona.es_simulacion !== true)
      .map((persona) => ({
        id: persona.id,
        label: formatPersonaLista(persona),
      })),
    error: null,
  };
}

export async function fetchPromedios(supabase, viewerId, instanciaId) {
  const { data, error } = await supabase.rpc("concerto_promedios", {
    p_id_viewer: Number(viewerId),
    p_id_instancia: instanciaId,
  });
  const failure = rpcFailure(data, error);
  return { rows: failure ? [] : rowsFromRpc(data), error: failure || null };
}

export async function fetchBoleta(supabase, votanteId, instanciaId) {
  const { data, error } = await supabase.rpc("concerto_mi_boleta", {
    p_id_votante: Number(votanteId),
    p_id_instancia: instanciaId,
  });
  const failure = rpcFailure(data, error);
  const scores = {};
  if (!failure) {
    for (const row of rowsFromRpc(data)) {
      if (row?.id_participante == null || row.puntaje == null) continue;
      const puntaje = Number(row.puntaje);
      if (Number.isFinite(puntaje)) scores[String(row.id_participante)] = puntaje;
    }
  }
  return { scores, error: failure || null };
}

export async function guardarBoleta(supabase, votanteId, instanciaId, puntajes) {
  const { data, error } = await supabase.rpc("concerto_guardar_boleta", {
    p_id_votante: Number(votanteId),
    p_id_instancia: instanciaId,
    p_puntajes: puntajes.map((item) => ({
      id_participante: Number(item.id_participante),
      puntaje: Number(item.puntaje),
    })),
  });
  const failure = rpcFailure(data, error);
  return { error: failure || null };
}

export async function guardarPuntaje(supabase, votanteId, instanciaId, participanteId, puntaje) {
  return guardarBoleta(supabase, votanteId, instanciaId, [
    { id_participante: participanteId, puntaje },
  ]);
}

export async function borrarPuntaje(supabase, votanteId, instanciaId, participanteId) {
  const { data, error } = await supabase.rpc("concerto_borrar_puntaje", {
    p_id_votante: Number(votanteId),
    p_id_instancia: instanciaId,
    p_id_participante: Number(participanteId),
  });
  const failure = rpcFailure(data, error);
  return { error: failure || null };
}

export async function createEdicion(supabase, { nombre, visibleDesde, visibleHasta }) {
  const { data, error } = await supabase
    .from("concerto_ediciones")
    .insert({
      nombre,
      visible_desde: visibleDesde,
      visible_hasta: visibleHasta,
    })
    .select("id")
    .single();
  return { id: data?.id ?? null, error };
}

export async function updateEdicion(supabase, id, { nombre, visibleDesde, visibleHasta }) {
  const { error } = await supabase
    .from("concerto_ediciones")
    .update({
      nombre,
      visible_desde: visibleDesde,
      visible_hasta: visibleHasta,
    })
    .eq("id", id);
  return { error };
}

export async function createInstancia(supabase, { idEdicion, idGira, titulo, orden }) {
  const { data, error } = await supabase
    .from("concerto_instancias")
    .insert({
      id_edicion: idEdicion,
      id_gira: idGira,
      titulo,
      orden,
    })
    .select("id")
    .single();
  return { id: data?.id ?? null, error };
}

export async function updateInstancia(supabase, id, { titulo, abreEn, cierraEn }) {
  const { error } = await supabase
    .from("concerto_instancias")
    .update({
      titulo,
      abre_en: abreEn,
      cierra_en: cierraEn,
    })
    .eq("id", id);
  return { error };
}

export async function deleteInstancia(supabase, instancia) {
  for (const participante of instancia.participantes || []) {
    if (!participante.id_repertorio_obra) continue;
    const { error } = await unlinkParticipanteObra(supabase, {
      participante,
      idGira: instancia.id_gira,
    });
    if (error) return { error };
  }
  const ids = (instancia.participantes || []).map((participante) => participante.id);
  if (ids.length) {
    const { error: linkError } = await supabase
      .from("concerto_participante_integrantes")
      .delete()
      .in("id_participante", ids);
    if (linkError) return { error: linkError };
    const { error: partError } = await supabase
      .from("concerto_participantes")
      .delete()
      .eq("id_instancia", instancia.id);
    if (partError) return { error: partError };
  }
  const { error } = await supabase
    .from("concerto_instancias")
    .delete()
    .eq("id", instancia.id);
  return { error };
}

export async function saveParticipante(
  supabase,
  { id, idInstancia, observaciones, orden, integranteIds },
) {
  let participanteId = id;
  let created = false;
  const nota = String(observaciones || "");
  if (!participanteId) {
    const { data, error } = await supabase
      .from("concerto_participantes")
      .insert({
        id_instancia: idInstancia,
        observaciones: nota,
        orden,
      })
      .select("id")
      .single();
    if (error) return { error };
    participanteId = data.id;
    created = true;
  } else {
    const { error } = await supabase
      .from("concerto_participantes")
      .update({ observaciones: nota })
      .eq("id", participanteId);
    if (error) return { error };
    const { error: deleteError } = await supabase
      .from("concerto_participante_integrantes")
      .delete()
      .eq("id_participante", participanteId);
    if (deleteError) return { error: deleteError };
  }

  if (integranteIds.length) {
    const { error } = await supabase.from("concerto_participante_integrantes").insert(
      integranteIds.map((idIntegrante) => ({
        id_participante: participanteId,
        id_integrante: Number(idIntegrante),
      })),
    );
    if (error) {
      if (created) {
        await supabase.from("concerto_participantes").delete().eq("id", participanteId);
      }
      return { error };
    }
  }
  const synced = await syncRepertoireNoteForParticipante(supabase, participanteId);
  if (synced.error) return { error: synced.error, id: participanteId };
  return { error: null, id: participanteId };
}

export async function deleteParticipante(supabase, participante, idGira) {
  if (participante?.id_repertorio_obra) {
    const { error } = await unlinkParticipanteObra(supabase, { participante, idGira });
    if (error) return { error };
  }
  const participanteId = participante?.id ?? participante;
  const { error: linkError } = await supabase
    .from("concerto_participante_integrantes")
    .delete()
    .eq("id_participante", participanteId);
  if (linkError) return { error: linkError };
  const { error } = await supabase
    .from("concerto_participantes")
    .delete()
    .eq("id", participanteId);
  return { error };
}

export async function saveObservaciones(supabase, participanteId, observaciones) {
  const { error } = await supabase
    .from("concerto_participantes")
    .update({ observaciones: String(observaciones || "") })
    .eq("id", participanteId);
  if (error) return { error };
  return syncRepertoireNoteForParticipante(supabase, participanteId);
}

/** Escribe solo `notas_especificas` de la fila vinculada. No reordena el bloque ni toca Drive. */
async function syncRepertoireNoteForParticipante(supabase, participanteId) {
  const { data, error } = await supabase
    .from("concerto_participantes")
    .select("id, observaciones, id_repertorio_obra")
    .eq("id", participanteId)
    .maybeSingle();
  if (error) return { error };
  if (!data?.id_repertorio_obra) return { error: null };

  const { map, error: namesError } = await integrantesPorParticipante(supabase, [data.id]);
  if (namesError) return { error: namesError };
  const { error: writeError } = await supabase
    .from("repertorio_obras")
    .update({
      notas_especificas: formatConcertoRepertoireNote(
        map.get(String(data.id)) || [],
        data.observaciones,
      ),
    })
    .eq("id", data.id_repertorio_obra);
  return { error: writeError };
}

export async function linkParticipanteObra(supabase, { participante, idGira, idObra }) {
  if (idGira == null) {
    return {
      error: {
        message: "Esta instancia no tiene gira. Asigná una gira para vincular la obra.",
      },
    };
  }
  const block = await ensureConcertoBlock(supabase, idGira);
  if (block.error || !block.id) {
    return { error: block.error || { message: "No se pudo preparar el bloque de repertorio." } };
  }

  const previousObraId = participante?.repertorio_obra?.id_obra ?? null;
  let rowId = participante?.id_repertorio_obra ?? null;
  if (rowId && previousObraId && String(previousObraId) !== String(idObra)) {
    await invokeDrive(supabase, {
      action: "delete_work_shortcuts",
      programId: idGira,
      obraId: previousObraId,
    });
  }

  if (rowId) {
    const { error } = await supabase
      .from("repertorio_obras")
      .update({ id_repertorio: block.id, id_obra: idObra })
      .eq("id", rowId);
    if (error) return { error };
  } else {
    const { data, error } = await supabase
      .from("repertorio_obras")
      .insert({
        id_repertorio: block.id,
        id_obra: idObra,
        orden: Number(participante?.orden) || 0,
      })
      .select("id")
      .single();
    if (error) return { error };
    rowId = data.id;
    const { error: fkError } = await supabase
      .from("concerto_participantes")
      .update({ id_repertorio_obra: rowId })
      .eq("id", participante.id);
    if (fkError) {
      await supabase.from("repertorio_obras").delete().eq("id", rowId);
      return { error: fkError };
    }
  }

  return reconcileConcertoBlock(supabase, idGira);
}

export async function unlinkParticipanteObra(supabase, { participante, idGira }) {
  const rowId = participante?.id_repertorio_obra;
  if (!rowId) return { error: null };
  const { data: row, error: readError } = await supabase
    .from("repertorio_obras")
    .select("id, id_obra")
    .eq("id", rowId)
    .maybeSingle();
  if (readError) return { error: readError };
  if (row) {
    const { error } = await deleteRepertoireRows(supabase, idGira, [row]);
    if (error) return { error };
  }
  if (idGira == null) return { error: null };
  return reconcileConcertoBlock(supabase, idGira);
}

export async function moveParticipante(supabase, { participante, origenGiraId, destino, orden }) {
  const idObra = participante?.repertorio_obra?.id_obra ?? null;
  const rowId = participante?.id_repertorio_obra ?? null;
  const destinoGiraId = destino?.id_gira ?? null;

  if (rowId && idObra && destinoGiraId != null) {
    const block = await ensureConcertoBlock(supabase, destinoGiraId);
    if (block.error || !block.id) {
      return { error: block.error || { message: "No se pudo preparar el bloque de destino." } };
    }
    if (origenGiraId != null && String(origenGiraId) !== String(destinoGiraId)) {
      await invokeDrive(supabase, {
        action: "delete_work_shortcuts",
        programId: origenGiraId,
        obraId: idObra,
      });
    }
    const { error } = await supabase
      .from("repertorio_obras")
      .update({ id_repertorio: block.id, orden })
      .eq("id", rowId);
    if (error) return { error };
  } else if (rowId) {
    const { error } = await deleteRepertoireRows(supabase, origenGiraId, [
      { id: rowId, id_obra: idObra },
    ]);
    if (error) return { error };
  }

  const { error } = await supabase
    .from("concerto_participantes")
    .update({
      id_instancia: destino.id,
      orden,
      id_repertorio_obra: rowId && idObra && destinoGiraId != null ? rowId : null,
    })
    .eq("id", participante.id);
  if (error) return { error };

  if (origenGiraId != null && String(origenGiraId) !== String(destinoGiraId ?? "")) {
    const source = await reconcileConcertoBlock(supabase, origenGiraId);
    if (source.error) return source;
  }
  if (destinoGiraId != null) return reconcileConcertoBlock(supabase, destinoGiraId);
  return { error: null };
}

export async function reorderParticipante(supabase, participantes, participanteId, direction, idGira) {
  const list = sortByOrden(participantes);
  const index = list.findIndex((item) => String(item.id) === String(participanteId));
  const target = index + direction;
  if (index < 0 || target < 0 || target >= list.length) return { error: null };
  const next = [...list];
  const [item] = next.splice(index, 1);
  next.splice(target, 0, item);
  for (let i = 0; i < next.length; i += 1) {
    const orden = i + 1;
    if (Number(next[i].orden) === orden) continue;
    const { error } = await supabase
      .from("concerto_participantes")
      .update({ orden })
      .eq("id", next[i].id);
    if (error) return { error };
  }
  if (idGira == null) return { error: null };
  return reconcileConcertoBlock(supabase, idGira);
}

async function invokeDrive(supabase, body) {
  try {
    const { error } = await supabase.functions.invoke("manage-drive", { body });
    if (error) console.error("manage-drive", error);
  } catch (err) {
    console.error("manage-drive", err);
  }
}

async function deleteRepertoireRows(supabase, idGira, rows) {
  const pending = (rows || []).filter((row) => row?.id != null);
  for (const row of pending) {
    if (idGira == null || row.id_obra == null) continue;
    await invokeDrive(supabase, {
      action: "delete_work_shortcuts",
      programId: idGira,
      obraId: row.id_obra,
    });
  }
  const ids = pending.map((row) => row.id);
  if (!ids.length) return { error: null };
  const { error } = await supabase.from("repertorio_obras").delete().in("id", ids);
  return { error };
}

async function ensureConcertoBlock(supabase, idGira) {
  const { data, error } = await supabase
    .from("programas_repertorios")
    .select("id")
    .eq("id_programa", idGira)
    .eq("nombre", CONCERTO_BLOCK_NAME)
    .order("id", { ascending: true })
    .limit(1);
  if (error) return { id: null, error };
  if (data?.[0]?.id) return { id: data[0].id, error: null };

  const { data: existing, error: listError } = await supabase
    .from("programas_repertorios")
    .select("orden")
    .eq("id_programa", idGira);
  if (listError) return { id: null, error: listError };
  const orden =
    (existing || []).reduce((max, row) => Math.max(max, Number(row.orden) || 0), 0) + 1;
  const { data: created, error: insertError } = await supabase
    .from("programas_repertorios")
    .insert({ id_programa: idGira, nombre: CONCERTO_BLOCK_NAME, orden })
    .select("id")
    .single();
  return { id: created?.id ?? null, error: insertError };
}

/**
 * El bloque «Concerto Competition» de la gira queda igual a las obras vinculadas
 * de las instancias de esa gira. Si no queda ninguna, el bloque vacío se conserva:
 * el repertorio, al borrar la última obra, también deja el bloque.
 * Cada fila vinculada recibe en `notas_especificas` la proyección del participante.
 * No toca filas de otros bloques.
 */
export async function reconcileConcertoBlock(supabase, idGira) {
  if (idGira == null) return { error: null };

  const { data: instancias, error: instError } = await supabase
    .from("concerto_instancias")
    .select("id, orden")
    .eq("id_gira", idGira);
  if (instError) return { error: instError };

  const instanciaIds = (instancias || []).map((instancia) => instancia.id);
  const { data: participantes, error: partError } = await selectIn(
    supabase,
    "concerto_participantes",
    "id, id_instancia, observaciones, orden, id_repertorio_obra",
    "id_instancia",
    instanciaIds,
  );
  if (partError) return { error: partError };

  const instOrden = new Map(
    (instancias || []).map((instancia) => [String(instancia.id), Number(instancia.orden) || 0]),
  );
  const linked = (participantes || [])
    .filter((participante) => participante.id_repertorio_obra != null)
    .sort((a, b) => {
      const ia = instOrden.get(String(a.id_instancia)) || 0;
      const ib = instOrden.get(String(b.id_instancia)) || 0;
      if (ia !== ib) return ia - ib;
      const oa = Number(a.orden) || 0;
      const ob = Number(b.orden) || 0;
      if (oa !== ob) return oa - ob;
      return Number(a.id) - Number(b.id);
    });

  const { data: blocks, error: blockError } = await supabase
    .from("programas_repertorios")
    .select("id")
    .eq("id_programa", idGira)
    .eq("nombre", CONCERTO_BLOCK_NAME)
    .order("id", { ascending: true })
    .limit(1);
  if (blockError) return { error: blockError };
  let blockId = blocks?.[0]?.id ?? null;

  if (!linked.length) {
    if (!blockId) return { error: null };
    const cleared = await deleteUnlinkedBlockRows(supabase, idGira, blockId);
    if (cleared.error) return cleared;
    await invokeDrive(supabase, {
      action: "sync_repertoire_shortcuts",
      programId: idGira,
    });
    return { error: null };
  }

  if (!blockId) {
    const created = await ensureConcertoBlock(supabase, idGira);
    if (created.error || !created.id) return { error: created.error };
    blockId = created.id;
  }

  const { map: integrantesMap, error: namesError } = await integrantesPorParticipante(
    supabase,
    linked.map((participante) => participante.id),
  );
  if (namesError) return { error: namesError };

  for (let i = 0; i < linked.length; i += 1) {
    const participante = linked[i];
    const { error } = await supabase
      .from("repertorio_obras")
      .update({
        id_repertorio: blockId,
        orden: i + 1,
        notas_especificas: formatConcertoRepertoireNote(
          integrantesMap.get(String(participante.id)) || [],
          participante.observaciones,
        ),
      })
      .eq("id", participante.id_repertorio_obra);
    if (error) return { error };
  }

  const cleared = await deleteUnlinkedBlockRows(supabase, idGira, blockId);
  if (cleared.error) return cleared;
  await invokeDrive(supabase, {
    action: "sync_repertoire_shortcuts",
    programId: idGira,
  });
  return { error: null };
}

async function deleteUnlinkedBlockRows(supabase, idGira, blockId) {
  const { data: rows, error } = await supabase
    .from("repertorio_obras")
    .select("id, id_obra")
    .eq("id_repertorio", blockId);
  if (error) return { error };
  if (!rows?.length) return { error: null };
  const { data: owners, error: ownerError } = await supabase
    .from("concerto_participantes")
    .select("id_repertorio_obra")
    .in(
      "id_repertorio_obra",
      rows.map((row) => row.id),
    );
  if (ownerError) return { error: ownerError };
  const owned = new Set((owners || []).map((row) => String(row.id_repertorio_obra)));
  const extras = rows.filter((row) => !owned.has(String(row.id)));
  return deleteRepertoireRows(supabase, idGira, extras);
}
