/** Zonas que el formulario de gira ya ofrece. Se puede usar cualquier otro texto. */
export const ZONA_PRESETS = ["Andina", "Atlántica", "Valle"];

export function normalizeZonaKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function zonasMatch(a, b) {
  const ka = normalizeZonaKey(a);
  const kb = normalizeZonaKey(b);
  return ka !== "" && ka === kb;
}

/** Preset canónico, o la grafía ya usada en `knownZonas`, o el texto recortado. */
export function canonicalZona(value, knownZonas = []) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const key = normalizeZonaKey(raw);
  const preset = ZONA_PRESETS.find((z) => normalizeZonaKey(z) === key);
  if (preset) return preset;
  const known = (knownZonas || []).find((z) => normalizeZonaKey(z) === key);
  return known || raw;
}
