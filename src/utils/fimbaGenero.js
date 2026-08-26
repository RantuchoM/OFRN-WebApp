/**
 * Género FIMBA (`fimba_participantes.genero`) ↔ sexo hotelero (Hombre/Mujer).
 *
 * Valores canónicos en DB: femenino | masculino | otro | sin_especificar.
 * OFRN integrantes usa M | F | - — se aceptan como alias al normalizar/mapear.
 * Nunca se asume masculino ante valor vacío o ambiguo.
 */

export const FIMBA_GENERO_VALUES = [
  "femenino",
  "masculino",
  "otro",
  "sin_especificar",
];

export const FIMBA_GENERO_DEFAULT = "sin_especificar";

const FEM_ALIASES = new Set([
  "femenino",
  "femenina",
  "f",
  "female",
  "mujer",
  "mujeres",
  "fem",
]);

const MASC_ALIASES = new Set([
  "masculino",
  "masculina",
  "m",
  "male",
  "hombre",
  "hombres",
  "varon",
  "varón",
  "varones",
  "masc",
  "h",
]);

const OTRO_ALIASES = new Set([
  "otro",
  "otra",
  "other",
  "x",
  "nb",
  "no_binario",
  "no-binario",
  "nobinario",
]);

const SIN_ALIASES = new Set([
  "",
  "-",
  "—",
  "n/a",
  "na",
  "ns",
  "s/d",
  "sd",
  "sin_especificar",
  "sin especificar",
  "sinespecificar",
  "desconocido",
  "unknown",
  "null",
  "undefined",
]);

/**
 * Normaliza cualquier input a un valor canónico de DB.
 * @param {unknown} value
 * @returns {"femenino"|"masculino"|"otro"|"sin_especificar"}
 */
export function canonicalizeFimbaGenero(value) {
  const raw = String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
  if (SIN_ALIASES.has(raw)) return FIMBA_GENERO_DEFAULT;
  if (FEM_ALIASES.has(raw)) return "femenino";
  if (MASC_ALIASES.has(raw)) return "masculino";
  if (OTRO_ALIASES.has(raw)) return "otro";
  if (FIMBA_GENERO_VALUES.includes(raw)) return raw;
  return FIMBA_GENERO_DEFAULT;
}

/**
 * Sexo binario para pedido hotel / rooming.
 * @returns {"F"|"M"|null} null = otro / sin especificar / vacío (no asumir hombre)
 */
export function mapFimbaGeneroToSex(value) {
  const c = canonicalizeFimbaGenero(value);
  if (c === "femenino") return "F";
  if (c === "masculino") return "M";
  return null;
}

/** Etiqueta de planilla / ficha (Femenino, Masculino, …). */
export function labelFimbaGenero(value) {
  const c = canonicalizeFimbaGenero(value);
  if (c === "femenino") return "Femenino";
  if (c === "masculino") return "Masculino";
  if (c === "otro") return "Otro";
  return "Sin especificar";
}

/**
 * Etiqueta para reportes de hotelería (pedido / detalle / Excel plazas).
 * Alinea el vocabulario del hotel (hombre/mujer) con el valor almacenado.
 */
export function labelFimbaGeneroHotel(value) {
  const sex = mapFimbaGeneroToSex(value);
  if (sex === "F") return "Mujer";
  if (sex === "M") return "Hombre";
  if (canonicalizeFimbaGenero(value) === "otro") return "Otro";
  return "Sin género";
}
