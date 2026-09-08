import {
  matchesMultiTokenSearch,
  scoreMultiTokenSearch,
} from "./sanitize";

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
 * Partes de búsqueda de un artista + nómina (para score/rank).
 * @param {string|null|undefined} artistNombre
 * @param {Array<object>|null|undefined} participantes
 * @returns {string[]}
 */
export function fimbaArtistaPersonSearchParts(artistNombre, participantes) {
  const parts = [artistNombre];
  for (const p of participantes || []) {
    parts.push(...participanteSearchParts(p));
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
  return matchesMultiTokenSearch(
    fimbaArtistaPersonSearchParts(artistNombre, participantes),
    query,
  );
}

/**
 * Score de relevancia (mayor = mejor; -1 = no match). Usa ranking de `sanitize`.
 * @param {string|null|undefined} artistNombre
 * @param {Array<object>|null|undefined} participantes
 * @param {string} query
 * @returns {number}
 */
export function scoreFimbaArtistaPersonSearch(
  artistNombre,
  participantes,
  query,
) {
  return scoreMultiTokenSearch(
    fimbaArtistaPersonSearchParts(artistNombre, participantes),
    query,
  );
}
