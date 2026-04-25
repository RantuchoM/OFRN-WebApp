/**
 * Ventana de ocupación del transporte: desde la salida hasta el instante más
 * tardío entre “Llega a Origen” (liberación) y retorno opcional (p. ej. solo vuelta).
 */
export function viajeOcupacionInicio(v) {
  if (!v?.fecha_salida) return null;
  return new Date(v.fecha_salida);
}

export function viajeOcupacionFin(v) {
  if (!v?.fecha_salida) return null;
  const t0 = new Date(v.fecha_salida);
  const t1 = v.fecha_llegada_estimada ? new Date(v.fecha_llegada_estimada) : t0;
  const t2 = v.fecha_retorno ? new Date(v.fecha_retorno) : t1;
  return new Date(Math.max(t0.getTime(), t1.getTime(), t2.getTime()));
}

function intervalsOverlap(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}

/**
 * @param {number} idTransporte
 * @param {Date} propStart
 * @param {Date} propEnd
 * @param {Array<{ id?: number, id_transporte: number, fecha_salida: string, fecha_llegada_estimada?: string, fecha_retorno?: string, origen?: string, destino_final?: string, motivo?: string }>} viajes
 * @param {{ excludeViajeId?: number }} [opts]
 */
export function findConflictingViajesForTransporte(
  idTransporte,
  propStart,
  propEnd,
  viajes,
  opts = {},
) {
  if (!idTransporte || !propStart || !propEnd || !viajes?.length) return [];
  const n = Number(idTransporte);
  return viajes
    .filter((v) => Number(v.id_transporte) === n)
    .filter((v) => (opts.excludeViajeId == null ? true : v.id !== opts.excludeViajeId))
    .filter((v) => {
      const s = viajeOcupacionInicio(v);
      const e = viajeOcupacionFin(v);
      if (!s || !e) return false;
      return intervalsOverlap(propStart, propEnd, s, e);
    })
    .map((v) => ({
      ...v,
      _occInicio: viajeOcupacionInicio(v),
      _occFin: viajeOcupacionFin(v),
    }));
}

/** De salida hasta el máximo entre “Llega a Origen” y retorno opcional. */
export function propuestaOcupacionWindowFromForm(fechaSalida, fechaLlegada, fechaRetorno) {
  if (!fechaSalida || !fechaLlegada) return null;
  const t0 = new Date(fechaSalida);
  const t1 = new Date(fechaLlegada);
  const t2 = fechaRetorno ? new Date(fechaRetorno) : t1;
  return {
    start: t0,
    end: new Date(Math.max(t0.getTime(), t1.getTime(), t2.getTime())),
  };
}

/**
 * @param {Array<ReturnType<typeof findConflictingViajesForTransporte> extends (infer R) ? R[number] : never>} conflicts
 * @param {(d: Date) => string} formatFn
 */
export function buildTransporteOcupadoAlerta(conflicts, formatFn) {
  if (!conflicts.length) return "";
  const intro =
    "Ese transporte ya está asignado a otro recorrido en el intervalo que elegiste (desde la salida hasta que vuelve al origen o el retorno opcional, lo que ocurra más tarde).";
  const lines = conflicts.map((c, i) => {
    const fin = c._occFin
      ? `Se desocupa aprox. el: ${formatFn(c._occFin)}.`
      : "";
    const donde = [c.origen, c.destino_final].filter(Boolean).join(" → ");
    const ruta = donde ? `Dónde / recorrido en conflicto: ${donde}.` : "";
    const tit = c.motivo?.trim() ? `Viaje: “${c.motivo.trim()}”.` : "";
    const prefix = conflicts.length > 1 ? `Conflicto ${i + 1}:` : null;
    return [prefix, tit, ruta, fin].filter(Boolean).join(" ");
  });
  return `${intro}\n\n${lines.join("\n\n")}`;
}
