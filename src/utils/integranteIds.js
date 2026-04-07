/**
 * integrantes.id es bigint en Postgres; en el cliente puede llegar como number o string.
 * Unificar para comparar filas, flags y claves de Set/Map.
 */
export function integranteKey(id) {
  if (id == null || id === "") return "";
  return String(id);
}

/**
 * Valor para .eq() / insert en columnas bigint: number si es entero seguro, si no string.
 */
export function integranteIdForDb(id) {
  if (id == null || id === "") return null;
  if (typeof id === "bigint") return id.toString();
  const s = String(id).trim();
  if (!/^-?\d+$/.test(s)) return null;
  const n = Number(s);
  if (Number.isSafeInteger(n)) return n;
  return s;
}

/** 23503 = foreign_key_violation (p. ej. id_integrante inexistente). */
export function isForeignKeyViolation(err) {
  return err?.code === "23503";
}
