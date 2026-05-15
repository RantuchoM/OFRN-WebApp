/** Lee y limpia ?magic= del query string. */
export function readMagicTokenFromSearch() {
  const params = new URLSearchParams(window.location.search);
  const token = String(params.get("magic") || "").trim();
  return /^[a-f0-9]{64}$/i.test(token) ? token.toLowerCase() : null;
}

export function clearMagicTokenFromUrl() {
  const params = new URLSearchParams(window.location.search);
  if (!params.has("magic")) return;
  params.delete("magic");
  const qs = params.toString();
  const next = `${window.location.pathname}${qs ? `?${qs}` : ""}${window.location.hash}`;
  window.history.replaceState(null, "", next);
}
