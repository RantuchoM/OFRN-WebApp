import { matchesMultiTokenSearch } from "./sanitize";

/**
 * Fragments de un participante (y vínculo OFRN si viene embebido) para búsqueda.
 * @param {object|null|undefined} p
 * @returns {string[]}
 */
export function participanteSearchParts(p) {
  if (!p) return [];
  const apellido = p.apellido || "";
  const nombre = p.nombre || "";
  const parts = [
    nombre,
    apellido,
    [apellido, nombre].filter(Boolean).join(" "),
    [nombre, apellido].filter(Boolean).join(" "),
  ];
  // Join opcional si algún fetch embebe el integrante OFRN
  const linked = p.integrante || p.integrantes || null;
  if (linked) {
    parts.push(
      linked.nombre,
      linked.apellido,
      [linked.apellido, linked.nombre].filter(Boolean).join(" "),
      [linked.nombre, linked.apellido].filter(Boolean).join(" "),
    );
  }
  return parts;
}

/**
 * Match artista/propuesta por nombre o por nombres de su nómina.
 * Tokens AND, sin tildes/mayúsculas (`normalizeForSearch`).
 *
 * @param {string|null|undefined} artistNombre
 * @param {Array<object>|null|undefined} participantes
 * @param {string} query
 * @returns {boolean}
 */
export function matchesFimbaArtistaPersonSearch(
  artistNombre,
  participantes,
  query,
) {
  const parts = [artistNombre];
  for (const p of participantes || []) {
    parts.push(...participanteSearchParts(p));
  }
  return matchesMultiTokenSearch(parts, query);
}
