const NETWORK_EDGE_PATTERNS = [
  /failed to send a request to the edge function/i,
  /relay error invoking the edge function/i,
  /edge function returned a non-2xx/i,
  /networkerror/i,
  /failed to fetch/i,
  /load failed/i,
  /network request failed/i,
  /\btimeout\b/i,
  /\baborted\b/i,
];

function rawAuthErrorMessage(errorOrMessage) {
  if (typeof errorOrMessage === "string") return errorOrMessage.trim();
  return String(errorOrMessage?.message || errorOrMessage || "").trim();
}

/**
 * Mensajes legibles para login OTP / magic link de Entradas y apps hermanas.
 * @param {"request"|"verify"} action
 */
export function formatEntradasAuthError(errorOrMessage, { action = "request" } = {}) {
  const raw = rawAuthErrorMessage(errorOrMessage);
  if (!raw) {
    return action === "verify"
      ? "No se pudo validar el código. Intentá de nuevo."
      : "No se pudo enviar el código. Intentá de nuevo.";
  }

  if (NETWORK_EDGE_PATTERNS.some((re) => re.test(raw))) {
    return action === "verify"
      ? "No pudimos conectar con el servidor para validar el código. Revisá tu conexión a internet e intentá de nuevo en unos segundos."
      : "No pudimos conectar con el servidor para enviar el código. Revisá tu conexión a internet e intentá de nuevo en unos segundos.";
  }

  if (/edge function|functionshttp|supabase functions/i.test(raw)) {
    return action === "verify"
      ? "Hubo un problema temporal al validar el código. Intentá de nuevo en unos segundos."
      : "Hubo un problema temporal al enviar el código. Intentá de nuevo en unos segundos.";
  }

  return raw;
}
