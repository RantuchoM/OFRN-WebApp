/** Paradas (eventos) entre subida y bajada del integrante en cada transporte asignado. */

const sliceTime = (value) => {
  if (!value) return null;
  return String(value).slice(0, 5);
};

/** Clave fecha+hora para detectar paradas paralelas (mismo instante, otro transporte). */
export function paradaScheduleKey(evt) {
  if (!evt) return "";
  const hora = sliceTime(evt.hora_inicio || evt.hora) || "";
  return `${evt.fecha || ""}T${hora}`;
}

export function sameParadaSchedule(a, b) {
  if (!a || !b) return false;
  const ka = paradaScheduleKey(a);
  const kb = paradaScheduleKey(b);
  return Boolean(ka) && ka === kb;
}

/** Siguiente parada en la lista cuyo fecha/hora difiere de la de referencia. */
export function nextParadaWithDistinctSchedule(paradas, fromIdx, referenceEvt) {
  if (!referenceEvt || !paradas?.length || fromIdx == null) return null;
  for (let i = fromIdx + 1; i < paradas.length; i++) {
    const candidate = paradas[i];
    if (!sameParadaSchedule(candidate, referenceEvt)) {
      return { evt: candidate, idx: i };
    }
  }
  return null;
}

export function sortEventosCronologico(eventos) {
  return [...(eventos || [])].sort((a, b) =>
    `${a.fecha || ""}${a.hora_inicio || ""}`.localeCompare(
      `${b.fecha || ""}${b.hora_inicio || ""}`,
    ),
  );
}

/** Nombre visible del recorrido (giras_transportes.detalle o tipo de transporte). */
export function resolveNombreRecorrido(transport) {
  if (!transport) return "Recorrido";
  const detalle = String(transport.detalle || "").trim();
  if (detalle) return detalle;
  return transport.nombre || transport.transportes?.nombre || "Recorrido";
}

export function formatParadaLabel(evt, { includeRecorrido = false } = {}) {
  if (!evt) return "—";
  const loc = evt.locaciones?.nombre || evt.descripcion || "Parada";
  const ciudad = evt.locaciones?.localidades?.localidad;
  const hora = sliceTime(evt.hora_inicio) || "--:--";
  const [y, m, d] = (evt.fecha || "").split("-");
  const fecha = d && m ? `${d}/${m}` : evt.fecha || "";
  const base = `${fecha} ${hora} · ${loc}${ciudad ? ` (${ciudad})` : ""}`;
  if (includeRecorrido && evt._recorridoNombre) {
    return `${base} — ${evt._recorridoNombre}`;
  }
  return base;
}

/** Agrupa paradas por nombre de recorrido (orden cronológico dentro de cada grupo). */
export function groupParadasByRecorrido(paradas) {
  const groups = [];
  const indexByRecorrido = new Map();

  (paradas || []).forEach((evt) => {
    const key = evt._recorridoNombre || "Recorrido";
    if (!indexByRecorrido.has(key)) {
      indexByRecorrido.set(key, groups.length);
      groups.push({ recorridoNombre: key, paradas: [] });
    }
    groups[indexByRecorrido.get(key)].paradas.push(evt);
  });

  return groups;
}

/**
 * Paradas en las que participa el integrante (entre su subida y bajada por transporte).
 */
export function getParadasParticipacionIntegrante(
  integranteId,
  summary,
  allEvents,
) {
  const person = (summary || []).find(
    (p) => String(p.id) === String(integranteId),
  );
  if (!person) return [];

  const transports = person.logistics?.transports || [];
  const byId = new Map();

  transports.forEach((t) => {
    const subidaId = t.subidaId;
    const bajadaId = t.bajadaId;
    if (!subidaId || !bajadaId) return;

    const transportEvents = sortEventosCronologico(
      (allEvents || []).filter(
        (e) => String(e.id_gira_transporte) === String(t.id),
      ),
    );

    const startIdx = transportEvents.findIndex(
      (e) => String(e.id) === String(subidaId),
    );
    const endIdx = transportEvents.findIndex(
      (e) => String(e.id) === String(bajadaId),
    );
    if (startIdx === -1 || endIdx === -1 || startIdx > endIdx) return;

    const recorridoNombre = resolveNombreRecorrido(t);

    transportEvents.slice(startIdx, endIdx + 1).forEach((evt) => {
      byId.set(String(evt.id), {
        ...evt,
        _recorridoNombre: recorridoNombre,
        _idGiraTransporte: t.id,
        /** @deprecated use _recorridoNombre */
        _transportNombre: recorridoNombre,
      });
    });
  });

  return sortEventosCronologico(Array.from(byId.values()));
}

function eventoToSchedulePoint(evt) {
  if (!evt) return null;
  return {
    fecha_salida: evt.fecha || null,
    hora_salida: sliceTime(evt.hora_inicio || evt.hora),
    fecha_llegada: evt.fecha || null,
    hora_llegada: sliceTime(evt.hora_inicio || evt.hora),
    transporte_salida: evt.locaciones?.nombre || null,
    transporte_llegada: evt.locaciones?.nombre || null,
    lugar_salida: evt.locaciones?.localidades?.localidad || null,
    lugar_llegada: evt.locaciones?.localidades?.localidad || null,
  };
}

function scheduleFromSortedPool(sorted, inicioId, finId) {
  const startIdx = sorted.findIndex(
    (e) => String(e.id) === String(inicioId),
  );
  const endIdx = sorted.findIndex((e) => String(e.id) === String(finId));
  if (startIdx === -1 || endIdx === -1 || startIdx > endIdx) return null;

  const start = sorted[startIdx];
  const end = sorted[endIdx];

  return {
    fecha_salida: start.fecha || null,
    hora_salida: sliceTime(start.hora_inicio || start.hora),
    fecha_llegada: end.fecha || null,
    hora_llegada: sliceTime(end.hora_inicio || end.hora),
    transporte_salida: start.locaciones?.nombre || null,
    transporte_llegada: end.locaciones?.nombre || null,
    lugar_salida: start.locaciones?.localidades?.localidad || null,
    lugar_llegada: end.locaciones?.localidades?.localidad || null,
  };
}

/**
 * Horario de un tramo según paradas de inicio/fin.
 * @param {object[]} allEvents — eventos de la gira
 * @param {object} [options.paradasContext] — paradas del integrante (orden del desdoble)
 */
export function scheduleFromParadaRange(allEvents, inicioId, finId, options = {}) {
  const { paradasContext } = options;
  if (!inicioId || !finId) return null;

  if (String(inicioId) === String(finId)) {
    const pool = sortEventosCronologico(
      paradasContext?.length ? paradasContext : allEvents || [],
    );
    const evt = pool.find((e) => String(e.id) === String(inicioId));
    return eventoToSchedulePoint(evt);
  }

  if (paradasContext?.length) {
    const paradasSorted = sortEventosCronologico(paradasContext);
    const inParadas = scheduleFromSortedPool(
      paradasSorted,
      inicioId,
      finId,
    );
    if (inParadas) return inParadas;
  }

  const sorted = sortEventosCronologico(allEvents || []);
  const startEvent = sorted.find((e) => String(e.id) === String(inicioId));
  const endEvent = sorted.find((e) => String(e.id) === String(finId));
  if (!startEvent || !endEvent) return null;

  const transportId = startEvent.id_gira_transporte;
  if (
    transportId &&
    String(transportId) === String(endEvent.id_gira_transporte)
  ) {
    const transportPool = sorted.filter(
      (e) => String(e.id_gira_transporte) === String(transportId),
    );
    const inTransport = scheduleFromSortedPool(
      transportPool,
      inicioId,
      finId,
    );
    if (inTransport) return inTransport;
  }

  return {
    fecha_salida: startEvent.fecha || null,
    hora_salida: sliceTime(startEvent.hora_inicio || startEvent.hora),
    fecha_llegada: endEvent.fecha || null,
    hora_llegada: sliceTime(endEvent.hora_inicio || endEvent.hora),
    transporte_salida: startEvent.locaciones?.nombre || null,
    transporte_llegada: endEvent.locaciones?.nombre || null,
    lugar_salida: startEvent.locaciones?.localidades?.localidad || null,
    lugar_llegada: endEvent.locaciones?.localidades?.localidad || null,
  };
}

/** Horario a partir del slice de paradas del tramo (coherente con el desdoble). */
export function scheduleFromTramoParadas(paradasSlice, allEvents) {
  if (!paradasSlice?.length) return null;
  const inicioId = paradasSlice[0].id;
  const finId = paradasSlice[paradasSlice.length - 1].id;
  return scheduleFromParadaRange(allEvents, inicioId, finId, {
    paradasContext: paradasSlice,
  });
}

function pushTramoFromSlice(paradas, slice, tramoOrden) {
  if (!slice.length) return null;
  return {
    tramo_orden: tramoOrden,
    id_evento_parada_inicio: slice[0].id,
    id_evento_parada_fin: slice[slice.length - 1].id,
    id_gira_transporte: slice[0]._idGiraTransporte ?? null,
    etiqueta_tramo: `Tramo ${tramoOrden}`,
    paradas: slice,
  };
}

/**
 * Corrige inicio/fin de un tramo si repite la parada de fin del tramo anterior.
 * Devuelve ids listos para schedule/BD.
 */
export function resolveTramoParadaIdsForSchedule(
  row,
  paradasIntegrante,
  prevTramoRow = null,
) {
  let inicioId = row?.id_evento_parada_inicio;
  let finId = row?.id_evento_parada_fin;
  if (!inicioId || !finId || !paradasIntegrante?.length) {
    return { inicioId, finId };
  }

  const paradas = sortEventosCronologico(paradasIntegrante);
  const indexById = new Map(
    paradas.map((p, idx) => [String(p.id), idx]),
  );

  if (prevTramoRow?.id_evento_parada_fin) {
    const prevFinId = String(prevTramoRow.id_evento_parada_fin);
    const prevFinIdx = indexById.get(prevFinId);
    const prevFinEvt =
      prevFinIdx != null ? paradas[prevFinIdx] : paradas.find((p) => String(p.id) === prevFinId);

    const inicioIdxRaw = indexById.get(String(inicioId));
    const inicioEvt =
      inicioIdxRaw != null ? paradas[inicioIdxRaw] : paradas.find((p) => String(p.id) === String(inicioId));

    const mustAdvanceInicio =
      String(inicioId) === prevFinId ||
      (prevFinEvt && inicioEvt && sameParadaSchedule(inicioEvt, prevFinEvt));

    if (mustAdvanceInicio && prevFinEvt != null) {
      const searchFrom =
        prevFinIdx != null
          ? prevFinIdx
          : inicioIdxRaw != null
            ? inicioIdxRaw
            : -1;
      const distinct = nextParadaWithDistinctSchedule(
        paradas,
        searchFrom,
        prevFinEvt,
      );
      if (distinct) inicioId = distinct.evt.id;
    }
  }

  let inicioIdx = indexById.get(String(inicioId));
  let finIdx = indexById.get(String(finId));
  if (inicioIdx != null && finIdx != null && inicioIdx > finIdx) {
    finId = inicioId;
    finIdx = inicioIdx;
  }

  return { inicioId, finId };
}

/**
 * Asegura que el fin de un tramo y el inicio del siguiente sean paradas distintas y consecutivas.
 */
export function ensureConsecutiveTramoParadas(paradas, tramos) {
  if (!paradas?.length || !tramos?.length) return tramos || [];

  const orderedParadas = sortEventosCronologico(paradas);
  const indexById = new Map(
    orderedParadas.map((p, idx) => [String(p.id), idx]),
  );

  const normalized = [];

  for (let i = 0; i < tramos.length; i++) {
    const tramo = tramos[i];
    let inicioIdx = indexById.get(String(tramo.id_evento_parada_inicio));
    let finIdx = indexById.get(String(tramo.id_evento_parada_fin));

    if (inicioIdx == null || finIdx == null) continue;

    if (i > 0) {
      const prev = normalized[normalized.length - 1];
      const prevFinIdx = indexById.get(String(prev.id_evento_parada_fin));
      const prevFinEvt =
        prevFinIdx != null ? orderedParadas[prevFinIdx] : null;
      const inicioEvt = orderedParadas[inicioIdx];
      const sharesBoundaryParada =
        String(tramo.id_evento_parada_inicio) ===
          String(prev.id_evento_parada_fin) ||
        (prevFinIdx != null && inicioIdx <= prevFinIdx) ||
        (prevFinEvt &&
          inicioEvt &&
          sameParadaSchedule(inicioEvt, prevFinEvt));

      if (sharesBoundaryParada && prevFinIdx != null && prevFinEvt) {
        let candidateIdx =
          inicioIdx <= prevFinIdx ? prevFinIdx + 1 : inicioIdx;
        while (
          candidateIdx < orderedParadas.length &&
          sameParadaSchedule(orderedParadas[candidateIdx], prevFinEvt)
        ) {
          candidateIdx += 1;
        }
        if (candidateIdx < orderedParadas.length) {
          inicioIdx = candidateIdx;
        }
      }
    }

    if (inicioIdx > finIdx) {
      const originalFinIdx = indexById.get(String(tramo.id_evento_parada_fin));
      finIdx =
        originalFinIdx != null && originalFinIdx >= inicioIdx
          ? originalFinIdx
          : inicioIdx;
    }

    if (inicioIdx > finIdx) continue;

    const slice = orderedParadas.slice(inicioIdx, finIdx + 1);
    const built = pushTramoFromSlice(orderedParadas, slice, normalized.length + 1);
    if (built) normalized.push(built);
  }

  return normalized.length > 0 ? normalized : tramos;
}

/**
 * Cortes: índices en `paradas` después de los cuales termina un tramo.
 * Ej. [A,B,C,D] con cortes [1,2] → [A,B], [C], [D]: fin e inicio de tramos vecinos son paradas consecutivas.
 */
export function buildTramosFromParadas(paradas, splitAfterIndices) {
  if (!paradas?.length) return [];
  const validCuts = [
    ...new Set(
      [...(splitAfterIndices || [])]
        .sort((a, b) => a - b)
        .filter((i) => i >= 0 && i < paradas.length - 1),
    ),
  ];

  const tramos = [];
  let startIdx = 0;

  validCuts.forEach((cutIdx) => {
    if (cutIdx < startIdx) return;
    const slice = paradas.slice(startIdx, cutIdx + 1);
    const built = pushTramoFromSlice(paradas, slice, tramos.length + 1);
    if (built) tramos.push(built);
    startIdx = cutIdx + 1;
  });

  if (startIdx <= paradas.length - 1) {
    const slice = paradas.slice(startIdx);
    const built = pushTramoFromSlice(paradas, slice, tramos.length + 1);
    if (built) tramos.push(built);
  }

  return ensureConsecutiveTramoParadas(
    sortEventosCronologico(paradas),
    tramos,
  );
}

/** Filas de tramo del mismo integrante en la gira (ordenadas por tramo_orden). */
export function getTramoGroupRows(allRows, row) {
  if (!row?.id_integrante || !Array.isArray(allRows)) return [];
  return allRows
    .filter(
      (r) =>
        String(r.id_integrante) === String(row.id_integrante) &&
        isTramoViaticoRow(r),
    )
    .sort((a, b) => (a.tramo_orden || 1) - (b.tramo_orden || 1));
}

export function canMergeTramoGroup(allRows, row) {
  return getTramoGroupRows(allRows, row).length >= 2;
}

/** Índices válidos para cortar (entre paradas, no al final). */
export function isTramoViaticoRow(row) {
  return (
    row?.id_evento_parada_inicio != null ||
    row?.id_evento_parada_fin != null ||
    Boolean(String(row?.etiqueta_tramo || "").trim())
  );
}

/** "Tramo 1 · Recorrido X" → etiqueta corta + nombre de recorrido. */
export function parseEtiquetaTramo(row) {
  const raw =
    String(row?.etiqueta_tramo || "").trim() ||
    (row?.tramo_orden ? `Tramo ${row.tramo_orden}` : "");
  if (!raw) return null;
  const sep = raw.includes("·") ? "·" : raw.includes(" - ") ? " - " : null;
  if (!sep) return { tramoLabel: raw, recorridoNombre: null };
  const parts = raw.split(sep).map((s) => s.trim());
  return {
    tramoLabel: parts[0] || raw,
    recorridoNombre: parts.slice(1).filter(Boolean).join(" · ") || null,
  };
}

export function defaultSplitAfterIndices(paradas, numTramos) {
  if (!paradas?.length || numTramos < 2) return [];
  const n = paradas.length;
  if (numTramos === 2) {
    const mid = Math.floor((n - 1) / 2);
    return mid >= 0 && mid < n - 1 ? [mid] : [];
  }
  if (numTramos === 3 && n >= 3) {
    const a = Math.floor((n - 1) / 3);
    const b = Math.floor((2 * (n - 1)) / 3);
    const cuts = [...new Set([a, b])].filter((i) => i >= 0 && i < n - 1);
    return cuts.length >= 1 ? cuts : [Math.floor((n - 1) / 2)];
  }
  return [];
}
