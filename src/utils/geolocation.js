/**
 * @param {{ timeout?: number, enableHighAccuracy?: boolean }} [opts]
 * @returns {Promise<{ lat: number, lng: number, accuracy: number | null }>}
 */
export function requestPosition(opts = {}) {
  const {
    timeout = 15000,
    enableHighAccuracy = true,
    maximumAge = 0,
  } = opts;

  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(
        Object.assign(new Error("Geolocalización no disponible en este dispositivo"), {
          code: "unsupported",
        }),
      );
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy ?? null,
        });
      },
      (err) => {
        const code =
          err.code === 1
            ? "denied"
            : err.code === 2
              ? "unavailable"
              : err.code === 3
                ? "timeout"
                : "error";
        reject(
          Object.assign(new Error(err.message || "No se pudo obtener ubicación"), {
            code,
          }),
        );
      },
      { timeout, enableHighAccuracy, maximumAge },
    );
  });
}

export function isAndroidDevice() {
  if (typeof navigator === "undefined") return false;
  return /android/i.test(navigator.userAgent);
}

/** Ayuda cuando Android bloquea el popup de permisos por superposiciones de otras apps. */
export function geolocationAndroidOverlayHint() {
  return (
    "Si aparece «Este sitio no puede solicitarte permiso»: cerrá burbujas flotantes " +
    "(WhatsApp, Messenger, etc.), filtros de pantalla o grabadores, y en Ajustes → " +
    "Apps → [app] desactivá «Mostrar sobre otras apps». Volvé a la PWA e intentá de nuevo."
  );
}

/** @param {Error & { code?: string }} err */
export function geolocationErrorMessage(err) {
  switch (err?.code) {
    case "denied":
      if (isAndroidDevice()) {
        return (
          "Android no mostró el permiso de ubicación (denegado o bloqueado). " +
          "Revisá Ajustes → Ubicación y permisos del navegador para este sitio."
        );
      }
      return "Permiso de ubicación denegado. Activá la ubicación para este sitio en Ajustes del celular.";
    case "timeout":
      return "Tiempo agotado al obtener GPS. Probá de nuevo o pedí QR a un compañero.";
    case "unavailable":
      return "Ubicación no disponible. Probá de nuevo o usá el QR de un compañero.";
    case "unsupported":
      return "Este navegador no soporta geolocalización. Abrí la app en Safari o Chrome.";
    default:
      return err?.message || "Error al obtener ubicación";
  }
}
