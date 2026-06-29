import {
  isCfEnsambleLabel,
  isProduccionParticipanteLabel,
} from "./participantesSort";

export const CONVOCATORIA_ENSAMBLE_VIEW_MODES = [
  "ensambles",
  "cameratas",
  "regiones",
];

const SIN_REGION_KEY = "__none__";
export const SIN_REGION_LABEL = "Sin región asignada";

function normalizeEnsambleLabel(name) {
  return String(name ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/** Jazz Band por nombre de ensamble (misma regla que ensayos report). */
export function isJazzBandEnsambleLabel(name) {
  return normalizeEnsambleLabel(name) === "jazz band";
}

/** Camerata: prefijo CF o Jazz Band. */
export function isCamerataEnsambleRow(row) {
  const name = row?.ensamble ?? "";
  return isCfEnsambleLabel(name) || isJazzBandEnsambleLabel(name);
}

/** Ensambles regionales en convocatorias (excluye camerata y Prod.). */
export function isRegionalConvocatoriaEnsamble(row) {
  const name = row?.ensamble ?? "";
  if (isProduccionParticipanteLabel(name)) return false;
  if (isCamerataEnsambleRow(row)) return false;
  return true;
}

/**
 * @param {Array<{ id, ensamble }>} ensambles
 * @param {'ensambles' | 'cameratas' | 'regiones'} mode
 */
export function filterEnsamblesForConvocatoriaView(ensambles, mode) {
  const list = ensambles || [];
  if (mode === "cameratas") {
    return list.filter(isCamerataEnsambleRow);
  }
  if (mode === "ensambles" || mode === "regiones") {
    return list.filter(isRegionalConvocatoriaEnsamble);
  }
  return list;
}

function resolveRegionFromEnsamble(row) {
  const loc = row?.localidades;
  const regionId = loc?.id_region ?? loc?.regiones?.id ?? null;
  const regionName = loc?.regiones?.region ?? SIN_REGION_LABEL;
  const key = regionId != null ? String(regionId) : SIN_REGION_KEY;
  return { key, id: regionId, name: regionName };
}

/**
 * Agrupa ensambles regionales por región (localidad del ensamble → región).
 * @returns {Array<{ key: string, id: number|null, name: string, ensambles: object[] }>}
 */
export function groupRegionalEnsamblesByRegion(ensambles) {
  const regional = filterEnsamblesForConvocatoriaView(ensambles, "regiones");
  const byRegion = new Map();

  for (const en of regional) {
    const { key, id, name } = resolveRegionFromEnsamble(en);
    if (!byRegion.has(key)) {
      byRegion.set(key, { key, id, name, ensambles: [] });
    }
    byRegion.get(key).ensambles.push(en);
  }

  const groups = Array.from(byRegion.values()).map((g) => ({
    ...g,
    ensambles: [...g.ensambles].sort((a, b) =>
      String(a.ensamble || "").localeCompare(String(b.ensamble || ""), "es"),
    ),
  }));

  const withRegion = groups
    .filter((g) => g.key !== SIN_REGION_KEY)
    .sort((a, b) => a.name.localeCompare(b.name, "es"));
  const sinRegion = groups.filter((g) => g.key === SIN_REGION_KEY);

  return [...withRegion, ...sinRegion];
}

export const CONVOCATORIA_VIEW_SECTION_TITLES = {
  ensambles: "Ensambles e integrantes",
  cameratas: "Cameratas e integrantes",
  regiones: "Regiones e integrantes",
};
