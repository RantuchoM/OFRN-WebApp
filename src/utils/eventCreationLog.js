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

export function formatDateTimeEs(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return String(iso);
    return d.toLocaleString("es-AR", {
      dateStyle: "short",
      timeStyle: "short",
    });
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
