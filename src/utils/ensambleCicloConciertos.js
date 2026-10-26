/**
 * Conciertos de programas tipo Ensamble (ciclos): conteo + prestaciones
 * (concierto = 1, didáctico = 0,5) y etiqueta PDF/UI.
 */

export function countCicloConciertos(eventos) {
  let regular = 0;
  let didactic = 0;
  let weighted = 0;
  for (const ev of eventos || []) {
    if (ev?.es_didactico) {
      didactic += 1;
      weighted += 0.5;
    } else {
      regular += 1;
      weighted += 1;
    }
  }
  return {
    regular,
    didactic,
    weighted: Math.round(weighted * 100) / 100,
    totalCount: regular + didactic,
  };
}

function defaultFmtQty(n) {
  const v = Math.round(Number(n) * 100) / 100;
  if (!Number.isFinite(v)) return "0";
  return String(v).replace(".", ",");
}

/**
 * Ej.: 10 (6 + 8 did.) = prestaciones (conciertos + didácticos en cantidad).
 */
export function formatConciertosEnsambleLabel(
  { regular = 0, didactic = 0, weighted } = {},
  fmtQty = defaultFmtQty,
) {
  const reg = Number(regular) || 0;
  const did = Number(didactic) || 0;
  const w =
    weighted != null && Number.isFinite(Number(weighted))
      ? Number(weighted)
      : reg + did * 0.5;
  if (reg + did === 0) return "0";
  return `${fmtQty(w)} (${reg} + ${did} did.)`;
}

/**
 * Programas tipo Ensamble vinculados al ensamble (vía giras_fuentes ENSAMBLE).
 */
export function ciclosForEnsamble(ciclos, ensambleId) {
  const eid = Number(ensambleId);
  if (!Number.isFinite(eid) || eid <= 0) return [];
  return (ciclos || [])
    .filter((c) => (c.ensambleIds || []).includes(eid))
    .map((c) => {
      const counts = countCicloConciertos(c.eventos || []);
      return {
        id: c.id,
        nombre: c.nombre_gira || `Programa ${c.id}`,
        subtitulo: c.subtitulo || "",
        desde: c.fecha_desde || "",
        hasta: c.fecha_hasta || "",
        ...counts,
        label: formatConciertosEnsambleLabel(counts),
      };
    })
    .sort((a, b) => String(a.desde).localeCompare(String(b.desde)));
}

/**
 * Partes de Ens. netos para UI (colorear `-m`) y PDF/Excel (texto plano).
 */
export function ensNetosParts(brutos, conflicto, netos, fmtQty = defaultFmtQty) {
  const fmt = fmtQty || defaultFmtQty;
  const b = Number(brutos) || 0;
  const c = Number(conflicto) || 0;
  const n =
    netos != null && Number.isFinite(Number(netos))
      ? Number(netos)
      : Math.max(0, Math.round((b - c) * 100) / 100);
  return {
    brutos: fmt(b),
    conflicto: fmt(c),
    netos: fmt(n),
    hasConflict: c > 0,
  };
}

/**
 * Ens. netos: `88 - 22 = 66` si hay conflicto; si conflicto = 0, solo `88`.
 * ASCII `-` (Helvetica PDF).
 */
export function formatEnsNetosLabel(brutos, conflicto, netos, fmtQty) {
  const p = ensNetosParts(brutos, conflicto, netos, fmtQty);
  if (!p.hasConflict) return p.netos;
  return `${p.brutos} - ${p.conflicto} = ${p.netos}`;
}

export function aggregateCicloStats(programRows) {
  let programas = 0;
  let regular = 0;
  let didactic = 0;
  let weighted = 0;
  for (const row of programRows || []) {
    programas += 1;
    regular += Number(row.regular) || 0;
    didactic += Number(row.didactic) || 0;
    weighted += Number(row.weighted) || 0;
  }
  const stats = {
    programasEnsamble: programas,
    conciertosEnsamble: Math.round(weighted * 100) / 100,
    conciertosEnsambleReg: regular,
    conciertosEnsambleDid: didactic,
  };
  return {
    ...stats,
    conciertosEnsambleLabel: formatConciertosEnsambleLabel({
      regular,
      didactic,
      weighted: stats.conciertosEnsamble,
    }),
  };
}
