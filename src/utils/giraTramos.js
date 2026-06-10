import {
  resolveLocalidadEfectivaViaticos,
  resolveLocalidadResidencia,
} from "./integranteDomicilioViaticos";
import { MEAL_SERVICE_ORDER } from "./mealLogistics";

const DEFAULT_DAY_START = "00:00:00";
const DEFAULT_DAY_END = "23:59:59";

export function sliceTime(value) {
  if (value == null || value === "") return null;
  const s = String(value);
  return s.length >= 5 ? s.slice(0, 5) : s;
}

/** YYYY-MM-DD → dd/mm */
export function formatIsoDateDDMM(isoDate) {
  if (!isoDate) return "";
  const s = String(isoDate).slice(0, 10);
  const parts = s.split("-");
  if (parts.length !== 3) return s;
  const [, month, day] = parts;
  return `${day}/${month}`;
}

export function formatIsoDateRangeDDMM(desde, hasta, separator = " – ") {
  const a = formatIsoDateDDMM(desde);
  const b = formatIsoDateDDMM(hasta);
  if (a && b) return `${a}${separator}${b}`;
  return a || b || "";
}

/** Date → dd/mm */
export function formatDateDDMM(date) {
  if (!date || Number.isNaN(date.getTime?.())) return "";
  return date.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
  });
}

export function formatTramoLabel(idx) {
  return `Tramo ${Number(idx) + 1}`;
}

export function formatTramoTitle(idx, fechaDesde, fechaHasta) {
  const range = formatIsoDateRangeDDMM(fechaDesde, fechaHasta);
  const prefix = formatTramoLabel(idx);
  return range ? `${prefix} (${range})` : prefix;
}

/** Instant comparable: YYYY-MM-DDTHH:MM */
export function toInstantKey(fecha, hora, { endOfDay = false } = {}) {
  if (!fecha) return null;
  const day = String(fecha).slice(0, 10);
  const t = sliceTime(hora) || (endOfDay ? "23:59" : "00:00");
  return `${day}T${t}`;
}

function compareInstantKeys(a, b) {
  if (a == null || b == null) return 0;
  return a.localeCompare(b);
}

/**
 * Especificaciones de segmentos a partir de fechas de gira y cortes ordenados.
 * N cortes → N+1 segmentos contiguos.
 */
export function buildSegmentSpecs(gira, cortes = []) {
  const fechaDesde = gira?.fecha_desde;
  const fechaHasta = gira?.fecha_hasta;
  if (!fechaDesde || !fechaHasta) return [];

  const sorted = [...(cortes || [])].sort(
    (a, b) => (a.orden ?? 0) - (b.orden ?? 0),
  );

  const count = sorted.length + 1;
  const specs = [];

  for (let i = 0; i < count; i++) {
    const prevCut = i > 0 ? sorted[i - 1] : null;
    const nextCut = i < sorted.length ? sorted[i] : null;

    specs.push({
      indice: i,
      fecha_desde: i === 0 ? fechaDesde : prevCut.fecha,
      fecha_hasta: i === count - 1 ? fechaHasta : nextCut.fecha,
      instant_desde: toInstantKey(
        i === 0 ? fechaDesde : prevCut.fecha,
        i === 0 ? DEFAULT_DAY_START : prevCut.hora,
      ),
      instant_hasta:
        i === count - 1
          ? toInstantKey(fechaHasta, DEFAULT_DAY_END, { endOfDay: true })
          : toInstantKey(nextCut.fecha, nextCut.hora),
      corte_entrada: prevCut,
      corte_salida: nextCut,
    });
  }

  return specs;
}

/** Enriquece specs con localidades por índice (map indice → id[]). */
export function buildSegments(gira, cortes = [], localidadesByIndice = {}) {
  return buildSegmentSpecs(gira, cortes).map((spec) => ({
    ...spec,
    localidadIds: (localidadesByIndice[spec.indice] || [])
      .map(Number)
      .filter(Boolean),
  }));
}

export function resolveActiveSegment(segments, fecha, hora = null) {
  if (!segments?.length || !fecha) return null;
  const instant = toInstantKey(fecha, hora ?? "12:00");
  if (!instant) return null;

  for (const seg of segments) {
    const start = seg.instant_desde;
    const end = seg.instant_hasta;
    if (!start || !end) continue;
    if (
      compareInstantKeys(instant, start) >= 0 &&
      compareInstantKeys(instant, end) < 0
    ) {
      return seg;
    }
  }

  const last = segments[segments.length - 1];
  if (
    last &&
    compareInstantKeys(instant, last.instant_desde) >= 0 &&
    compareInstantKeys(instant, last.instant_hasta) <= 0
  ) {
    return last;
  }

  return segments[0] ?? null;
}

export function resolveLocalidadIdsFromPerson(person) {
  const ids = collectPersonLocalidadIds(person);
  return ids[0] ?? null;
}

/** Integrante con domicilio en campos de primer nivel (roster + logística). */
export function normalizePersonForLocalCheck(person) {
  if (!person) return person;
  const nested = person.integrantes || person.integrante;
  if (!nested || nested === person) return person;
  return {
    ...nested,
    ...person,
    id_loc_viaticos: person.id_loc_viaticos ?? nested.id_loc_viaticos,
    id_localidad: person.id_localidad ?? nested.id_localidad,
    id_localidad_residencia:
      person.id_localidad_residencia ?? nested.id_localidad,
    id_domicilio_laboral:
      person.id_domicilio_laboral ?? nested.id_domicilio_laboral,
    viaticos: person.viaticos ?? nested.viaticos,
    residencia: person.residencia ?? nested.residencia,
    laboral: person.laboral ?? nested.laboral,
    localidades: person.localidades ?? nested.localidades,
    localidades_residencia:
      person.localidades_residencia ?? nested.localidades_residencia,
    _loc_viaticos: person._loc_viaticos ?? nested._loc_viaticos,
    _loc_residencia: person._loc_residencia ?? nested._loc_residencia,
  };
}

/**
 * Localidades de residencia y viáticos del integrante.
 * La localía del tramo usa ids de `localidades`; no comparar con `id_domicilio_laboral`
 * (FK a `locaciones`) ni con ids de locación — son espacios de nombres distintos.
 */
export function collectPersonLocalidadIds(person) {
  const set = new Set();
  const add = (value) => {
    if (value == null || value === "") return;
    const n = Number(value);
    if (!Number.isNaN(n) && n > 0) set.add(n);
  };

  const p = normalizePersonForLocalCheck(person);

  add(resolveLocalidadEfectivaViaticos(p)?.id);
  add(resolveLocalidadResidencia(p)?.id);
  add(p?.id_loc_viaticos);
  add(p?.id_localidad);
  add(p?.id_localidad_residencia);
  add(p?.localidades?.id);
  add(p?.localidades_residencia?.id);
  add(p?._loc_viaticos?.id);
  add(p?._loc_residencia?.id);

  return [...set];
}

function personMatchesLocalidadIds(person, localidadIds) {
  if (!localidadIds?.length) return false;
  const personIds = collectPersonLocalidadIds(person);
  if (!personIds.length) return false;
  const tramoIds = localidadIds.map((id) => Number(id)).filter((id) => id > 0);
  return personIds.some((pid) => tramoIds.includes(pid));
}

export function isLocalAt(person, instant, segments) {
  if (!segments?.length) return false;

  const { fecha, hora } = normalizeInstant(instant);
  const seg = resolveActiveSegment(segments, fecha, hora);
  if (!seg) {
    return segments.some((s) =>
      personMatchesLocalidadIds(person, s.localidadIds),
    );
  }
  return personMatchesLocalidadIds(person, seg.localidadIds);
}

function extractLocalidadIdsFromRow(row) {
  return (row?.giras_tramo_localidades || [])
    .map((l) => Number(l.id_localidad ?? l))
    .filter((id) => !Number.isNaN(id) && id > 0);
}

function namesFromSegmentRowLinks(row, locationsList = []) {
  const names = [];
  (row?.giras_tramo_localidades || []).forEach((link) => {
    const fromJoin = link?.localidades?.localidad;
    if (fromJoin) {
      names.push(fromJoin);
      return;
    }
    const id = Number(link?.id_localidad);
    if (!id) return;
    const fromList = locationsList.find((l) => Number(l.id) === id)?.localidad;
    if (fromList) names.push(fromList);
  });
  return [...new Set(names)];
}

/** Nombres de localía del tramo (join BD → catálogo → giras_localidades legacy). */
export function resolveTramoLocalidadLabels({
  segmentRow = null,
  segmentSpec = null,
  segmentRows = [],
  tramoIndice = null,
  locationsList = [],
  giraLocalidadIds = [],
} = {}) {
  const idx =
    tramoIndice != null && !Number.isNaN(Number(tramoIndice))
      ? Number(tramoIndice)
      : segmentRow?.indice != null
        ? Number(segmentRow.indice)
        : null;

  const candidates = [segmentRow];
  if (segmentRow?.id != null) {
    const linked = (segmentRows || []).find(
      (s) => Number(s.id) === Number(segmentRow.id),
    );
    if (linked && linked !== segmentRow) candidates.push(linked);
  }
  if (idx != null) {
    const byIdx = (segmentRows || []).find((s) => Number(s.indice) === idx);
    if (byIdx) candidates.push(byIdx);
  }

  for (const row of candidates) {
    const fromRow = namesFromSegmentRowLinks(row, locationsList);
    if (fromRow.length) return fromRow;
  }

  const ids = getTramoLocalidadIds(
    segmentRow,
    segmentSpec,
    segmentRows,
    tramoIndice,
  );
  if (ids.length) {
    return ids
      .map(
        (id) =>
          locationsList.find((l) => Number(l.id) === Number(id))?.localidad,
      )
      .filter(Boolean);
  }

  if (
    giraLocalidadIds?.length &&
    (!segmentRows?.length || segmentRows.length <= 1 || idx === 0)
  ) {
    return giraLocalidadIds
      .map(
        (id) =>
          locationsList.find((l) => Number(l.id) === Number(id))?.localidad,
      )
      .filter(Boolean);
  }

  return [];
}

/** Localidades del tramo: BD por id/índice primero, spec en memoria después. */
export function getTramoLocalidadIds(
  segmentRow,
  segmentSpec,
  segmentRows = [],
  tramoIndice = null,
) {
  const idx =
    tramoIndice != null
      ? Number(tramoIndice)
      : segmentRow?.indice != null
        ? Number(segmentRow.indice)
        : null;

  if (segmentRow?.id != null) {
    const direct = extractLocalidadIdsFromRow(segmentRow);
    if (direct.length) return direct;

    const linked = (segmentRows || []).find(
      (s) => Number(s.id) === Number(segmentRow.id),
    );
    const fromLinked = extractLocalidadIdsFromRow(linked);
    if (fromLinked.length) return fromLinked;
  }

  if (idx != null && !Number.isNaN(idx)) {
    const byIdx = (segmentRows || []).find((s) => Number(s.indice) === idx);
    const fromIdx = extractLocalidadIdsFromRow(byIdx);
    if (fromIdx.length) return fromIdx;
  }

  const fromSpec = segmentSpec?.localidadIds;
  if (fromSpec?.length) {
    return fromSpec
      .map((id) => Number(id))
      .filter((id) => !Number.isNaN(id) && id > 0);
  }

  return [];
}

/** ¿Reside en alguna localidad del listado del tramo? */
export function isLocalForTramoLocalidades(person, localidadIds) {
  return personMatchesLocalidadIds(person, localidadIds);
}

/**
 * Local en un tramo por índice (misma regla que columnas de Rooming).
 * Usa giras_tramo_localidades del tramo, no el instante del corte.
 */
export function isLocalForTramoIndex(
  person,
  segments,
  tramoIndice,
  segmentRows = [],
) {
  if (tramoIndice == null || Number.isNaN(Number(tramoIndice))) return false;
  const idx = Number(tramoIndice);
  const segmentSpec = segments?.find((s) => Number(s.indice) === idx);
  const segmentRow =
    segmentRows?.find((s) => Number(s.indice) === idx) ?? null;
  const localidadIds = getTramoLocalidadIds(
    segmentRow,
    segmentSpec,
    segmentRows,
    idx,
  );
  if (localidadIds.length) {
    return personMatchesLocalidadIds(person, localidadIds);
  }
  if (segmentSpec && segments?.length) {
    return isLocalAt(
      normalizePersonForLocalCheck(person),
      { fecha: segmentSpec.fecha_desde, hora: "12:00" },
      segments,
    );
  }
  return false;
}

/** Local en el tramo para pedido inicial (misma regla que Rooming por índice). */
export function isLocalInPedidoTramo(
  person,
  segmentSpec,
  _tramoLocalidadIds,
  segmentRow = null,
  segments = [],
  segmentRows = [],
  tramoIndice = null,
) {
  const idx =
    tramoIndice != null && !Number.isNaN(Number(tramoIndice))
      ? Number(tramoIndice)
      : segmentRow?.indice != null
        ? Number(segmentRow.indice)
        : segmentSpec?.indice != null
          ? Number(segmentSpec.indice)
          : null;
  if (idx != null && segments?.length) {
    return isLocalForTramoIndex(person, segments, idx, segmentRows);
  }
  return false;
}

/** ¿Reside en alguna localidad del tramo (por índice)? Para pedidos/reportes por tramo. */
export function isLocalInTramo(
  person,
  segments,
  tramoIndice,
  segmentRows = [],
) {
  return isLocalForTramoIndex(person, segments, tramoIndice, segmentRows);
}

/** ¿La noche (YYYY-MM-DD) cae dentro del tramo indicado? */
export function nightBelongsToTramo(fecha, segments, tramoIndice, segmentRow) {
  if (tramoIndice == null || Number.isNaN(Number(tramoIndice))) return true;
  const idx = Number(tramoIndice);
  const day = String(fecha).slice(0, 10);
  const instant = toInstantKey(day, "20:00");

  const spec = segments?.find((s) => Number(s.indice) === idx);
  if (spec?.instant_desde && spec?.instant_hasta) {
    const start = spec.instant_desde;
    const end = spec.instant_hasta;
    const isLast = idx === (segments?.length ?? 1) - 1;
    if (
      compareInstantKeys(instant, start) >= 0 &&
      (isLast
        ? compareInstantKeys(instant, end) <= 0
        : compareInstantKeys(instant, end) < 0)
    ) {
      return true;
    }
    return false;
  }

  const desde = segmentRow?.fecha_desde
    ? String(segmentRow.fecha_desde).slice(0, 10)
    : null;
  const hasta = segmentRow?.fecha_hasta
    ? String(segmentRow.fecha_hasta).slice(0, 10)
    : null;
  if (desde && hasta) {
    return day >= desde && day <= hasta;
  }

  return false;
}

/** Para badges: local en al menos un segmento. */
export function isLocalInAnySegment(person, segments) {
  if (!segments?.length) return false;
  return segments.some((s) =>
    personMatchesLocalidadIds(person, s.localidadIds),
  );
}

/** Equivalente a giras_localidades plano cuando hay un solo segmento. */
export function isLocalLegacy(person, tourLocSet) {
  const locId = resolveLocalidadIdsFromPerson(person);
  if (locId == null) return false;
  return tourLocSet.has(locId);
}

export function resolvePersonIsLocal(person, { segments, tourLocSet, cortesCount = 0 }) {
  if (cortesCount > 0 && segments?.length) {
    return isLocalInAnySegment(person, segments);
  }
  if (segments?.length === 1) {
    return isLocalAt(
      person,
      { fecha: segments[0].fecha_desde, hora: "12:00" },
      segments,
    );
  }
  return isLocalLegacy(person, tourLocSet ?? new Set());
}

function normalizeInstant(instant) {
  if (!instant) return { fecha: null, hora: null };
  if (typeof instant === "string") {
    const [fecha, timePart] = instant.split("T");
    return { fecha, hora: sliceTime(timePart) };
  }
  if (instant.fecha && instant.servicio) {
    return mealSlotToInstant(instant.fecha, instant.servicio);
  }
  return {
    fecha: instant.fecha || instant.date,
    hora: sliceTime(instant.hora || instant.time || "12:00"),
  };
}

/** Hora representativa por servicio de comida (matriz de comidas). */
export function mealSlotToInstant(fecha, servicio) {
  const order = MEAL_SERVICE_ORDER[servicio] ?? 1;
  const horaBySlot = ["08:00", "13:00", "17:00", "21:00"];
  return { fecha: String(fecha).slice(0, 10), hora: horaBySlot[order] ?? "12:00" };
}

export function isLocalAtMealSlot(person, fecha, servicio, segments, horaOverride) {
  const instant = horaOverride
    ? {
        fecha: String(fecha).slice(0, 10),
        hora: sliceTime(horaOverride) || "12:00",
      }
    : mealSlotToInstant(fecha, servicio);
  return isLocalAt(person, instant, segments);
}

/** Unión de localidades de todos los segmentos (sync giras_localidades). */
export function unionLocalidadIds(segments) {
  const set = new Set();
  (segments || []).forEach((s) => {
    (s.localidadIds || []).forEach((id) => set.add(Number(id)));
  });
  return Array.from(set);
}
