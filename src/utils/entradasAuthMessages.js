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

  if (NETWORK_EDGE_PATTERNS.some((re) => re.test(raw))) {
    return action === "verify"
      ? "No pudimos conectar con el servidor para validar el acceso. Revisá tu conexión a internet e intentá de nuevo en unos segundos."
      : "No pudimos conectar con el servidor para enviar el enlace. Revisá tu conexión a internet e intentá de nuevo en unos segundos.";
  }

  if (/edge function|functionshttp|supabase functions/i.test(raw)) {
    return action === "verify"
      ? "Hubo un problema temporal al validar el acceso. Intentá de nuevo en unos segundos."
      : "Hubo un problema temporal al enviar el enlace. Intentá de nuevo en unos segundos.";
  }

  return raw;
}
