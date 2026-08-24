const NETWORK_EDGE_PATTERNS = [
  /failed to send a request to the edge function/i,
  /relay error invoking the edge function/i,
  /edge function returned a non-2xx/i,
  /networkerror/i,
  /failed to fetch/i,
  /couldn'?t fetch/i,
  /could not fetch/i,
  /load failed/i,
  /network request failed/i,
  /network connection was lost/i,
  /internet connection appears to be offline/i,
  /err_internet_disconnected/i,
  /err_network_changed/i,
  /err_connection/i,
  /\btimeout\b/i,
  /\baborted\b/i,
  /fetch failed/i,
  /network error/i,
  /sin señal/i,
  /sin conexi[oó]n/i,
];

function rawAuthErrorMessage(errorOrMessage) {
  if (typeof errorOrMessage === "string") return errorOrMessage.trim();
  if (!errorOrMessage) return "";
  const parts = [
    errorOrMessage.message,
    errorOrMessage.details,
    errorOrMessage.hint,
    errorOrMessage.name,
    typeof errorOrMessage.toString === "function" && errorOrMessage.toString !== Object.prototype.toString
      ? String(errorOrMessage)
      : "",
  ]
    .map((p) => String(p || "").trim())
    .filter(Boolean);
  return parts.join(" ").trim() || String(errorOrMessage).trim();
}

/** Errores de red / timeout (RPC, REST o edge). */
export function isEntradasNetworkError(errorOrMessage) {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return true;
  if (errorOrMessage?.name === "TypeError" && /fetch|network|load/i.test(rawAuthErrorMessage(errorOrMessage))) {
    return true;
  }
  const raw = rawAuthErrorMessage(errorOrMessage);
  if (!raw) return false;
  return NETWORK_EDGE_PATTERNS.some((re) => re.test(raw));
}

/**
 * Mensaje en español para fallos de red (nunca devolver TypeError / Failed to fetch crudo).
 * @param {"snapshot"|"snapshot_cached"|"ingreso"|"auth_request"|"auth_verify"|"generic"} context
 */
export function formatEntradasNetworkError(errorOrMessage, { context = "generic" } = {}) {
  const msgs = {
    snapshot: "Sin conexión: no se pudo actualizar el roster. Revisá la señal e intentá de nuevo.",
    snapshot_cached: "Sin conexión: se usa el roster guardado en este dispositivo.",
    ingreso: "Sin conexión. El ingreso puede quedar pendiente de sincronizar; reintentá cuando haya señal.",
    auth_verify:
      "No pudimos conectar con el servidor para validar el acceso. Revisá tu conexión a internet e intentá de nuevo en unos segundos.",
    auth_request:
      "No pudimos conectar con el servidor para enviar el enlace. Revisá tu conexión a internet e intentá de nuevo en unos segundos.",
    generic: MSG_RED_GENERICA,
  };

  if (
    context === "snapshot"
    || context === "snapshot_cached"
    || context === "ingreso"
  ) {
    return msgs[context];
  }

  if (!isEntradasNetworkError(errorOrMessage)) {
    const raw = rawAuthErrorMessage(errorOrMessage);
    if (/typeerror|failed to fetch|couldn'?t fetch|networkerror|load failed/i.test(raw)) {
      return msgs.generic;
    }
    return raw || msgs.generic;
  }

  return msgs[context] || msgs.generic;
}

/**
 * Mensajes legibles para login OTP / magic link / contraseña de Entradas y apps hermanas.
 * @param {"request"|"verify"|"password"} action
 */
export function formatEntradasAuthError(errorOrMessage, { action = "request" } = {}) {
  const raw = rawAuthErrorMessage(errorOrMessage);
  if (action === "password") {
    if (/invalid login credentials|invalid_credentials|email not confirmed/i.test(raw)) {
      return "Mail o contraseña incorrectos. Si tenés usuario OFRN, usá esa misma clave. Si no, pedí un enlace de acceso.";
    }
    if (!raw) return "No se pudo entrar con esa contraseña. Intentá de nuevo.";
  }
  if (!raw) {
    return action === "verify"
      ? "No se pudo validar el acceso. Intentá de nuevo."
      : "No se pudo enviar el enlace. Intentá de nuevo.";
  }

  if (isEntradasNetworkError(errorOrMessage)) {
    return formatEntradasNetworkError(errorOrMessage, {
      context: action === "verify" ? "auth_verify" : "auth_request",
    });
  }

  if (/edge function|functionshttp|supabase functions/i.test(raw)) {
    return action === "verify"
      ? "Hubo un problema temporal al validar el acceso. Intentá de nuevo en unos segundos."
      : "Hubo un problema temporal al enviar el enlace. Intentá de nuevo en unos segundos.";
  }

  return raw;
}
