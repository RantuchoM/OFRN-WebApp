/** QR + ingresos manuales (sin entrada / sin QR) para admin y recepción. */
export function adminConciertoAttendanceTotals({ ingresadas = 0, sinEntrada = 0 } = {}) {
  const qr = Math.max(0, Number(ingresadas) || 0);
  const manual = Math.max(0, Number(sinEntrada) || 0);
  return { ingresadas: qr, sinEntrada: manual, totalPersonas: qr + manual };
}

/** Texto corto de recepcionista: "Marko S." */
export function formatEntradasRecepcionistaCorto(nombre) {
  const t = String(nombre || "").trim();
  return t || "";
}

/**
 * Ej.: "QR ya utilizado a las 20:33. Recepcionado por Ana Pérez"
 */
export function formatRecepcionQrYaUtilizadoBanner({ at, porNombre } = {}) {
  let hhmm = "";
  if (at) {
    const d = new Date(at);
    if (!Number.isNaN(d.getTime())) {
      hhmm = d.toLocaleTimeString("es-AR", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
    }
  }
  const quien = String(porNombre || "").trim();
  if (hhmm && quien) return `QR ya utilizado a las ${hhmm}. Recepcionado por ${quien}`;
  if (hhmm) return `QR ya utilizado a las ${hhmm}.`;
  if (quien) return `QR ya utilizado. Recepcionado por ${quien}`;
  return "QR ya utilizado.";
}

/** Ej.: "Ingresó el 22/05/2026, 20:33 (Marko S.)" */
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
