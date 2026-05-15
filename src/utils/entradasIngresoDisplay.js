/** Texto corto de recepcionista: "Marko S." */
export function formatEntradasRecepcionistaCorto(nombre) {
  const t = String(nombre || "").trim();
  return t || "";
}

/**
 * Ej.: "Ingresó el 22/05/2026, 20:33 (Marko S.)"
 */
export function formatEntradasIngresoConRecepcionista(at, porNombre) {
  if (!at) return "";
  const when = new Date(at).toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const quien = formatEntradasRecepcionistaCorto(porNombre);
  return quien ? `Ingresó el ${when} (${quien})` : `Ingresó el ${when}`;
}
