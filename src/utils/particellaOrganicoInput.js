/** Plantilla visual del orgánico estándar de vientos (maderas - metales). */
export const ORGANICO_VIENTOS_PLACEHOLDER = "2.2.3.2 - 4.3.1.2";

export const ORGANICO_VIENTOS_DIGIT_COUNT = 8;

export const WIND_INSTRUMENT_SLOTS = [
  { id_instrumento: "05", instrumento_base: "Flauta" },
  { id_instrumento: "06", instrumento_base: "Oboe" },
  { id_instrumento: "07", instrumento_base: "Clarinete" },
  { id_instrumento: "08", instrumento_base: "Fagot" },
  { id_instrumento: "09", instrumento_base: "Corno" },
  { id_instrumento: "10", instrumento_base: "Trompeta" },
  { id_instrumento: "11", instrumento_base: "Trombón" },
  { id_instrumento: "12", instrumento_base: "Tuba" },
];

/** Extrae hasta 8 dígitos (ignora puntos, guiones y espacios). */
export function extractOrganicoVientosDigits(raw) {
  return String(raw ?? "")
    .replace(/\D/g, "")
    .slice(0, ORGANICO_VIENTOS_DIGIT_COUNT);
}

/** Formatea dígitos sueltos a `2.2.3.2 - 4.3.1.2` mientras se escribe. */
export function formatOrganicoVientosDigits(digits) {
  const d = extractOrganicoVientosDigits(digits);
  if (!d) return "";

  const parts = d.split("");
  if (parts.length <= 4) return parts.join(".");

  const wood = parts.slice(0, 4).join(".");
  const brass = parts.slice(4).join(".");
  return `${wood} - ${brass}`;
}

/** Normaliza cualquier entrada del usuario al formato visual estándar. */
export function formatOrganicoVientosInput(raw) {
  return formatOrganicoVientosDigits(extractOrganicoVientosDigits(raw));
}

/**
 * Parsea un orgánico de vientos tipo `2.2.3.2 - 4.3.1.2` (o `22324312`) en definiciones de particella.
 * @returns {{ ok: true, definitions: Array<{ id_instrumento: string, nombre_archivo: string, instrumento_base: string }> } | { ok: false, error: string }}
 */
export function parseOrganicoVientosInput(raw) {
  const digits = extractOrganicoVientosDigits(raw);
  if (!digits) {
    return { ok: false, error: "Ingresá un orgánico de vientos." };
  }

  if (digits.length !== ORGANICO_VIENTOS_DIGIT_COUNT) {
    return {
      ok: false,
      error: "Completá los 8 dígitos (4 maderas + 4 metales).",
    };
  }

  const numbers = digits.split("").map((d) => parseInt(d, 10));

  if (numbers.some((n) => Number.isNaN(n) || n < 0 || n > 9)) {
    return { ok: false, error: "Cada valor debe ser un dígito entre 0 y 9." };
  }

  if (numbers.every((n) => n === 0)) {
    return {
      ok: false,
      error: "Al menos un instrumento debe ser mayor a 0.",
    };
  }

  const definitions = [];
  WIND_INSTRUMENT_SLOTS.forEach((slot, idx) => {
    const count = numbers[idx];
    if (count <= 0) return;
    if (count === 1) {
      definitions.push({
        id_instrumento: slot.id_instrumento,
        nombre_archivo: slot.instrumento_base,
        instrumento_base: slot.instrumento_base,
      });
      return;
    }
    for (let i = 1; i <= count; i++) {
      definitions.push({
        id_instrumento: slot.id_instrumento,
        nombre_archivo: `${slot.instrumento_base} ${i}`,
        instrumento_base: slot.instrumento_base,
      });
    }
  });

  return { ok: true, definitions };
}
