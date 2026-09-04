/**
 * Nombre de escenario (seating e informes de seating):
 * usa preferencia si existe; si no, el nombre/apellido legal.
 * Transporte y documentos oficiales siguen usando `nombre` / `apellido`.
 */

export const SEATING_INTEGRANTES_EMBED =
  "nombre, apellido, nombre_preferencia, apellido_preferencia, instrumentos(instrumento)";

export const SEATING_INTEGRANTES_EMBED_MIN =
  "nombre, apellido, nombre_preferencia, apellido_preferencia";

function trimText(value) {
  return String(value ?? "").trim();
}

export function seatingNombre(person) {
  const pref = trimText(person?.nombre_preferencia);
  if (pref) return pref;
  if (person?.nombre_legal != null) return trimText(person.nombre_legal);
  return trimText(person?.nombre);
}

export function seatingApellido(person) {
  const pref = trimText(person?.apellido_preferencia);
  if (pref) return pref;
  if (person?.apellido_legal != null) return trimText(person.apellido_legal);
  return trimText(person?.apellido);
}

export function seatingApellidoNombre(person) {
  const apellido = seatingApellido(person);
  const nombre = seatingNombre(person);
  if (apellido && nombre) return `${apellido}, ${nombre}`;
  return apellido || nombre || "";
}

export function seatingApellidoInicial(person) {
  const apellido = seatingApellido(person);
  const nombre = seatingNombre(person);
  const inicial = nombre ? `${nombre.charAt(0)}.` : "";
  if (apellido && inicial) return `${apellido}, ${inicial}`;
  return apellido || inicial || "";
}

export function legalNombre(person) {
  if (person?.nombre_legal != null) return trimText(person.nombre_legal);
  return trimText(person?.nombre);
}

export function legalApellido(person) {
  if (person?.apellido_legal != null) return trimText(person.apellido_legal);
  return trimText(person?.apellido);
}

export function legalApellidoNombre(person) {
  const apellido = legalApellido(person);
  const nombre = legalNombre(person);
  if (apellido && nombre) return `${apellido}, ${nombre}`;
  return apellido || nombre || "";
}

/**
 * Copia el integrante sobreescribiendo nombre/apellido con los de seating.
 * Conserva los legales en `nombre_legal` / `apellido_legal`.
 */
export function applySeatingDisplayNames(person) {
  if (!person || typeof person !== "object") return person;
  const nombre = seatingNombre(person);
  const apellido = seatingApellido(person);
  const nombreLegal = legalNombre(person);
  const apellidoLegal = legalApellido(person);
  return {
    ...person,
    nombre_legal: nombreLegal,
    apellido_legal: apellidoLegal,
    nombre,
    apellido,
    nombre_completo: [apellido, nombre].filter(Boolean).join(", "),
  };
}

export function mapRosterForSeating(roster) {
  return (roster || []).map(applySeatingDisplayNames);
}

export function applySeatingNamesOnItem(item) {
  if (!item || typeof item !== "object") return item;
  if (!item.integrantes) return item;
  return { ...item, integrantes: applySeatingDisplayNames(item.integrantes) };
}

export function mapSeatingItemsWithDisplayNames(items) {
  return (items || []).map(applySeatingNamesOnItem);
}

export function mapSeatingContainersWithDisplayNames(containers) {
  return (containers || []).map((container) => {
    if (!container || typeof container !== "object") return container;
    const next = { ...container };
    if (Array.isArray(container.items)) {
      next.items = mapSeatingItemsWithDisplayNames(container.items);
    }
    if (Array.isArray(container.validItems)) {
      next.validItems = mapSeatingItemsWithDisplayNames(container.validItems);
    }
    return next;
  });
}
