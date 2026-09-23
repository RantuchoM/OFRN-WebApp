/** Origen del alta de un concierto (`eventos.creation_source`). */
export const EVENT_CREATION_SOURCES = {
  AGENDA: "agenda",
  GIRA_FORM: "gira_form",
  TRANSPOSITION: "transposition",
  SCRIPT: "script",
  FIMBA: "fimba",
};

export const EVENT_CREATION_SOURCE_LABELS = {
  agenda: "Agenda",
  gira_form: "Formulario de gira",
  transposition: "Trasposición",
  script: "Script",
  fimba: "FIMBA",
};

/** Categoría Conciertos en `categorias_tipos_eventos`. */
export const ID_CATEGORIA_CONCIERTOS = 1;
/** Categoría Ensayos — ya tiene logs de fecha/hora. */
export const ID_CATEGORIA_ENSAYOS = 2;

export function resolveLoggedIntegranteId(userOrId) {
  const raw =
    userOrId != null && typeof userOrId === "object" ? userOrId.id : userOrId;
  if (raw == null || raw === "" || raw === "guest-general") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export function concertCreationFields(userOrId, source) {
  return {
    created_by: resolveLoggedIntegranteId(userOrId),
    creation_source: source || null,
  };
}

export function withConcertCreationMeta(payload, userOrId, source, eventHint) {
  if (!payload) return payload;
  const probe = eventHint ? { ...payload, ...eventHint } : payload;
  if (!isConcertHistoryEvent(probe)) return payload;
  return { ...payload, ...concertCreationFields(userOrId, source) };
}

function eventCategoriaId(evt) {
  const raw =
    evt?.tipos_evento?.categorias_tipos_eventos?.id ??
    evt?.tipos_evento?.id_categoria ??
    evt?.tipo_id_categoria ??
    evt?.id_categoria;
  const id = Number(raw);
  return Number.isFinite(id) ? id : null;
}

/** Concierto / función / categoría Conciertos. */
export function isConcertHistoryEvent(evt) {
  if (!evt) return false;
  if (Number(evt.id_tipo_evento) === 1) return true;
  if (eventCategoriaId(evt) === ID_CATEGORIA_CONCIERTOS) return true;
  const name = String(evt.tipos_evento?.nombre || evt.tipo_nombre || "")
    .trim()
    .toLowerCase();
  return name.includes("concierto") || name.includes("función");
}

export function isEnsayoHistoryEvent(evt) {
  if (!evt) return false;
  if (Number(evt.id_tipo_evento) === 13) return true;
  return eventCategoriaId(evt) === ID_CATEGORIA_ENSAYOS;
}

/**
 * Historial visible en agenda: conciertos (prominente) y ensayos (logs de
 * fecha/hora). No en comidas ni traslados.
 */
export function shouldShowAgendaEventHistory(
  evt,
  { isMeal = false, isTransport = false } = {},
) {
  if (!evt || evt.isProgramMarker || evt.is_deleted) return false;
  if (isMeal || isTransport) return false;
  return isConcertHistoryEvent(evt) || isEnsayoHistoryEvent(evt);
}

export function formatPersonNombre(person) {
  if (!person) return "";
  return [person.nombre, person.apellido].filter(Boolean).join(" ").trim();
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

const ISO_DATE_PREFIX_RE = /^(\d{4})-(\d{2})-(\d{2})/;
const ISO_TIME_RE = /^(\d{1,2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?$/;

/** YYYY-MM-DD → dd/mm/yyyy (sin timezone; no parsear como Date UTC). */
export function formatLogDate(value) {
  if (value == null || value === "") return "";
  const s = String(value).trim();
  const m = s.match(ISO_DATE_PREFIX_RE);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  return s;
}

/** 20:00:00 → 20:00 */
export function formatLogTime(value) {
  if (value == null || value === "") return "";
  const s = String(value).trim();
  const m = s.match(ISO_TIME_RE);
  if (m) return `${pad2(Number(m[1]))}:${m[2]}`;
  return s;
}

/** Valor de `eventos_logs` según campo (fecha ISO, hora o nombre de locación). */
export function formatLogFieldValue(campo, value) {
  if (value == null || value === "") return "";
  if (campo === "fecha") return formatLogDate(value);
  if (campo === "hora_inicio" || campo === "hora_fin") return formatLogTime(value);
  if (campo === "locacion" || campo === "id_locacion") return String(value).trim();
  const s = String(value).trim();
  if (ISO_DATE_PREFIX_RE.test(s)) return formatLogDate(s);
  if (ISO_TIME_RE.test(s)) return formatLogTime(s);
  return s;
}

export function normalizeLogDate(value) {
  if (value == null || value === "") return "";
  const s = String(value).trim();
  const iso = s.match(ISO_DATE_PREFIX_RE);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const dmy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmy) return `${dmy[3]}-${pad2(Number(dmy[2]))}-${pad2(Number(dmy[1]))}`;
  return s;
}

export function normalizeLogTime(value) {
  return formatLogTime(value);
}

export function snapshotCampoKey(campo) {
  if (campo === "id_locacion") return "locacion";
  return campo;
}

const SNAPSHOT_KEYS = ["fecha", "hora_inicio", "hora_fin", "locacion"];
const CHANGE_FIELD_ORDER = {
  fecha: 0,
  hora_inicio: 1,
  hora_fin: 2,
  locacion: 3,
  id_locacion: 3,
};

export function eventScheduleSnapshot(event) {
  if (!event) {
    return { fecha: null, hora_inicio: null, hora_fin: null, locacion: null };
  }
  const loc =
    event.locaciones?.nombre ||
    event.locacion_nombre ||
    (typeof event.locacion === "string" ? event.locacion : "") ||
    "";
  return {
    fecha: event.fecha ?? null,
    hora_inicio: event.hora_inicio ?? null,
    hora_fin: event.hora_fin ?? null,
    locacion: loc || null,
  };
}

export function groupEventChangeLogs(logs) {
  const groups = [];
  const index = new Map();
  for (const log of logs || []) {
    const key = `${log.created_at ?? ""}|${log.created_by ?? ""}`;
    let group = index.get(key);
    if (!group) {
      group = {
        key,
        created_at: log.created_at,
        created_by: log.created_by,
        integrantes: log.integrantes,
        logs: [],
      };
      index.set(key, group);
      groups.push(group);
    } else if (!group.integrantes && log.integrantes) {
      group.integrantes = log.integrantes;
    }
    group.logs.push(log);
  }
  for (const group of groups) {
    group.logs.sort(
      (a, b) =>
        (CHANGE_FIELD_ORDER[a.campo] ?? 9) - (CHANGE_FIELD_ORDER[b.campo] ?? 9),
    );
  }
  return groups;
}

/**
 * Reconstruye el programa (fecha + hora + locación) antes/después de cada
 * grupo de logs, yendo desde el estado actual hacia atrás.
 */
export function buildScheduleChangeGroups(changeLogs, event) {
  const groups = groupEventChangeLogs(changeLogs);
  let snapshot = eventScheduleSnapshot(event);
  return groups.map((group) => {
    const after = { ...snapshot };
    const before = { ...snapshot };
    const changed = {
      fecha: false,
      hora_inicio: false,
      hora_fin: false,
      locacion: false,
    };
    for (const log of group.logs) {
      const key = snapshotCampoKey(log.campo);
      if (!SNAPSHOT_KEYS.includes(key)) continue;
      changed[key] = true;
      after[key] = log.valor_nuevo ?? after[key];
      before[key] = log.valor_anterior ?? null;
    }
    snapshot = { ...before };
    return { ...group, before, after, changed };
  });
}

/**
 * Timestamp → «dd/mm/yyyy, hora local».
 * Fecha ISO suelta (YYYY-MM-DD) → dd/mm/yyyy, sin hora.
 */
export function formatDateTimeEs(iso) {
  if (!iso) return "";
  try {
    const raw = String(iso).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return formatLogDate(raw);
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return raw;
    const date = `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
    const time = d.toLocaleTimeString("es-AR", {
      hour: "numeric",
      minute: "2-digit",
    });
    return time ? `${date}, ${time}` : date;
  } catch {
    return String(iso);
  }
}

export function creationSourceLabel(source) {
  if (!source) return "";
  return EVENT_CREATION_SOURCE_LABELS[source] || String(source);
}

/**
 * Línea de UI: «Creado el … por … · fuente».
 * Conciertos viejos: fecha desde created_at; quién/fuente vacíos si no hay dato.
 */
export function formatConcertCreatedLine(event) {
  if (!event) return "";
  const dateStr = formatDateTimeEs(event.created_at);
  const name = formatPersonNombre(
    event.creador || event.created_by_integrante || event.integrantes,
  );
  const source = creationSourceLabel(event.creation_source);
  if (!dateStr && !name && !source) return "";
  let line = dateStr ? `Creado el ${dateStr}` : "Creado";
  if (name) line += ` por ${name}`;
  if (source) line += ` · ${source}`;
  return line;
}
