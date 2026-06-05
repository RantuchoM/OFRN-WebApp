/**
 * Combina conciertos y programas sin conciertos en una línea de tiempo ordenada por fecha.
 * Los avisos de programa sin conciertos se ordenan por fecha_desde y, a igual fecha,
 * aparecen antes que los conciertos del mismo día.
 */
export function buildMergedConciertosTimeline(
  conciertos = [],
  programasSinConciertos = [],
  {
    getConciertoSortKey = (c) => String(c?.fecha || ""),
    getProgramaSortKey = (p) => String(p?.fecha_desde || ""),
  } = {},
) {
  const entries = [
    ...conciertos.map((item) => ({
      kind: "concierto",
      sortKey: getConciertoSortKey(item),
      item,
    })),
    ...programasSinConciertos.map((item) => ({
      kind: "sin_conciertos",
      sortKey: getProgramaSortKey(item),
      item,
    })),
  ];

  entries.sort((a, b) => {
    const cmp = a.sortKey.localeCompare(b.sortKey);
    if (cmp !== 0) return cmp;
    if (a.kind === b.kind) return 0;
    return a.kind === "sin_conciertos" ? -1 : 1;
  });

  return entries;
}
