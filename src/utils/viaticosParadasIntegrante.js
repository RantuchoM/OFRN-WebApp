/** Paradas (eventos) entre subida y bajada del integrante en cada transporte asignado. */

const sliceTime = (value) => {
  if (!value) return null;
  return String(value).slice(0, 5);
};

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

export function scheduleFromParadaRange(allEvents, inicioId, finId) {
  const sorted = sortEventosCronologico(allEvents);
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
 * Cortes: índices en `paradas` después de los cuales termina un tramo (0-based en paradas.length-1).
 * Ej. paradas [A,B,C,D], cortes [1,2] → tramos [A-B], [C], [D] — mejor: cortes son índices de última parada de cada tramo excepto el final.
 * Usamos: splitAfterIndices = [0, 2] significa tramo1 paradas[0..0], tramo2 [1..2], tramo3 [3..end]
 */
export function buildTramosFromParadas(paradas, splitAfterIndices) {
  if (!paradas?.length) return [];
  const cuts = [...splitAfterIndices].sort((a, b) => a - b);
  const validCuts = cuts.filter(
    (i) => i >= 0 && i < paradas.length - 1,
  );
  const boundaries = [-1, ...validCuts, paradas.length - 1];
  const tramos = [];

  for (let t = 0; t < boundaries.length - 1; t++) {
    const from = boundaries[t] + 1;
    const to = boundaries[t + 1];
    if (from > to) continue;
    const slice = paradas.slice(from, to + 1);
    if (slice.length === 0) continue;
    tramos.push({
      tramo_orden: t + 1,
      id_evento_parada_inicio: slice[0].id,
      id_evento_parada_fin: slice[slice.length - 1].id,
      id_gira_transporte: slice[0]._idGiraTransporte ?? null,
      etiqueta_tramo: `Tramo ${t + 1}`,
      paradas: slice,
    });
  }

  return tramos;
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
