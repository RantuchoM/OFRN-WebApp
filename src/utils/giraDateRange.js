/** Fecha local YYYY-MM-DD */
export function toLocalDateString(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** 31/12 del año en curso (zona local). */
export function endOfCurrentYearLocal(d = new Date()) {
  return `${d.getFullYear()}-12-31`;
}

function maxDateString(a, b) {
  if (!a) return b || null;
  if (!b) return a;
  return a > b ? a : b;
}

/** Normaliza a YYYY-MM-DD para comparación lexicográfica segura. */
export function normalizeIsoDate(value) {
  if (value == null || value === "") return null;
  const s = String(value);
  return s.length >= 10 ? s.slice(0, 10) : s;
}

/** id en BD para tipo "Concierto" (GiraForm). */
export const CONCERT_EVENT_TYPE_ID = 1;

/** Evento de concierto / función (misma heurística que GiraCard). */
export function isConcertEvent(evento) {
  if (!evento?.fecha || evento.is_deleted) return false;
  if (Number(evento.id_tipo_evento) === 1) return true;
  const name = (evento.tipos_evento?.nombre || "").toLowerCase();
  return name.includes("concierto") || name.includes("función");
}

/** Fechas ISO de conciertos del programa, ordenadas. */
export function getConcertDatesFromProgram(program) {
  return (program?.eventos || [])
    .filter(isConcertEvent)
    .map((e) => e.fecha)
    .filter(Boolean)
    .sort();
}

/**
 * Fechas efectivas para ordenar y filtrar en listados.
 * Con conciertos futuros: ancla al próximo concierto; al pasar conciertos intermedios,
 * la tarjeta "salta" al siguiente (sin duplicar). Sin conciertos: fecha_desde / fecha_hasta.
 */
export function getProgramListDates(
  program,
  referenceDate = toLocalDateString(),
) {
  const concertDates = getConcertDatesFromProgram(program);
  const progDesde = program?.fecha_desde || null;
  const progHasta = program?.fecha_hasta || null;

  if (concertDates.length === 0) {
    return {
      sortDate: progDesde,
      rangeStart: progDesde,
      rangeEnd: progHasta,
    };
  }

  const upcoming = concertDates.filter((d) => d >= referenceDate);
  const lastConcert = concertDates[concertDates.length - 1];
  const firstConcert = concertDates[0];

  if (upcoming.length > 0) {
    return {
      sortDate: upcoming[0],
      rangeStart: upcoming[0],
      rangeEnd: maxDateString(lastConcert, progHasta),
    };
  }

  return {
    sortDate: progDesde || lastConcert,
    rangeStart: progDesde || firstConcert,
    rangeEnd: progHasta || lastConcert,
  };
}

export function compareProgramsForList(a, b, referenceDate = toLocalDateString()) {
  const da = getProgramListDates(a, referenceDate).sortDate || "";
  const db = getProgramListDates(b, referenceDate).sortDate || "";
  if (da !== db) return da.localeCompare(db);
  return String(a?.nombre_gira || "").localeCompare(
    String(b?.nombre_gira || ""),
    "es",
  );
}

/**
 * Solapan [rangeStart, rangeEnd] por fecha_desde / fecha_hasta del programa.
 */
export function applyProgramOverlapDateFilter(query, rangeStart, rangeEnd) {
  let q = query;
  if (rangeEnd) {
    q = q.lte("fecha_desde", rangeEnd);
  }
  if (rangeStart) {
    q = q.or(`fecha_hasta.gte.${rangeStart},fecha_hasta.is.null`);
  }
  return q;
}

/**
 * Programas con al menos un concierto (id_tipo_evento) en el rango.
 * Requiere `eventos!inner` en el select.
 */
export function applyConcertDateOverlapFilter(
  query,
  rangeStart,
  rangeEnd,
  concertTypeId = CONCERT_EVENT_TYPE_ID,
) {
  let q = query.eq("eventos.id_tipo_evento", concertTypeId);
  if (rangeStart) {
    q = q.gte("eventos.fecha", rangeStart);
  }
  if (rangeEnd) {
    q = q.lte("eventos.fecha", rangeEnd);
  }
  return q;
}

/** Une listas de programas por id; combina eventos sin duplicar. */
export function mergeProgramsById(programLists) {
  const map = new Map();
  for (const list of programLists) {
    for (const program of list || []) {
      if (program?.id == null) continue;
      const prev = map.get(program.id);
      if (!prev) {
        map.set(program.id, program);
        continue;
      }
      const eventosById = new Map();
      [...(prev.eventos || []), ...(program.eventos || [])].forEach((e) => {
        if (e?.id != null) eventosById.set(e.id, e);
      });
      map.set(program.id, {
        ...prev,
        ...program,
        eventos:
          eventosById.size > 0
            ? [...eventosById.values()]
            : prev.eventos || program.eventos,
      });
    }
  }
  return [...map.values()];
}

/**
 * Solapamiento inclusivo entre el rango del programa y [rangeStart, rangeEnd].
 * Por defecto usa fechas efectivas (conciertos si existen). Con `calendarOnly: true`
 * usa solo fecha_desde / fecha_hasta (p. ej. filtro de Programas en Coordinación).
 */
export function programOverlapsDateRange(
  program,
  rangeStart,
  rangeEnd,
  referenceDate = toLocalDateString(),
  { calendarOnly = false } = {},
) {
  if (!program) return false;

  let desde;
  let hasta;
  if (calendarOnly) {
    desde = normalizeIsoDate(program.fecha_desde);
    hasta = normalizeIsoDate(program.fecha_hasta);
  } else {
    const { rangeStart: effDesde, rangeEnd: effHasta } = getProgramListDates(
      program,
      referenceDate,
    );
    desde = normalizeIsoDate(effDesde || program.fecha_desde);
    hasta = normalizeIsoDate(effHasta || program.fecha_hasta);
  }

  const filterStart = normalizeIsoDate(rangeStart);
  const filterEnd = normalizeIsoDate(rangeEnd);

  if (filterEnd && desde && desde > filterEnd) return false;
  if (filterStart && hasta && hasta < filterStart) return false;
  return true;
}
