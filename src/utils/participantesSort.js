/** Producción / Prod. siempre al final en listados de participantes. */
export function isProduccionParticipanteLabel(name) {
  const n = String(name || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  return n === "produccion" || n === "prod" || n === "prod.";
}

/** Ensambles Camerata Filarmónica (prefijo CF) al inicio. */
export function isCfEnsambleLabel(name) {
  return String(name || "")
    .trim()
    .toUpperCase()
    .startsWith("CF");
}

export function compareParticipanteLabel(a, b, { cfFirst = false } = {}) {
  const aProd = isProduccionParticipanteLabel(a);
  const bProd = isProduccionParticipanteLabel(b);
  if (aProd !== bProd) return aProd ? 1 : -1;

  if (cfFirst) {
    const aCf = isCfEnsambleLabel(a);
    const bCf = isCfEnsambleLabel(b);
    if (aCf !== bCf) return aCf ? -1 : 1;
  }

  return String(a).localeCompare(String(b), "es");
}

export function sortFamiliasParticipantes(familias = []) {
  return [...familias].sort((a, b) => compareParticipanteLabel(a, b));
}

export function sortEnsamblesParticipantes(ensambles = []) {
  const cmp = (a, b) =>
    compareParticipanteLabel(a.nombre, b.nombre, { cfFirst: true });

  const included = ensambles.filter((ens) => !ens.excluido).sort(cmp);
  const excluded = ensambles.filter((ens) => ens.excluido).sort(cmp);
  return [...included, ...excluded];
}
