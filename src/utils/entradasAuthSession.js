/** Normaliza la respuesta de entradas-auth-email (token_hash y/o password broker). */
export function pickEntradasAuthSessionFields(payload) {
  const nested = payload?.data;
  const data = nested && typeof nested === "object" && (nested.token_hash || nested.password || nested.email)
    ? nested
    : payload;
  const tokenHash = String(
    data?.token_hash || data?.tokenHash || data?.hashed_token || "",
  ).trim();
  return {
    email: String(data?.email || "").trim(),
    token_hash: tokenHash,
    password: String(data?.password || "").trim(),
    purpose: String(data?.purpose || "access") === "reset" ? "reset" : "access",
  };
}
