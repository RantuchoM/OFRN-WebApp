/** Lee y limpia ?magic= del query string. */
export function readMagicTokenFromSearch() {
  const params = new URLSearchParams(window.location.search);
  const token = String(params.get("magic") || "").trim();
  return /^[a-f0-9]{64}$/i.test(token) ? token.toLowerCase() : null;
}

export function readPasswordResetFlagFromSearch() {
  const params = new URLSearchParams(window.location.search);
  return params.get("reset") === "1";
}

export function clearMagicTokenFromUrl() {
  const params = new URLSearchParams(window.location.search);
  if (!params.has("magic") && !params.has("reset")) return;
  params.delete("magic");
  params.delete("reset");
  const qs = params.toString();
  const next = `${window.location.pathname}${qs ? `?${qs}` : ""}${window.location.hash}`;
  window.history.replaceState(null, "", next);
}
