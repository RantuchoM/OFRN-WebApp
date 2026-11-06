/**
 * Workbox prueba la denylist contra `pathname + search`, no contra el path solo.
 * Un `$` al final deja pasar `/refrescar.html?next=` y `/refrescar.html?tab=…`:
 * el SW responde con el shell y la app pierde la pantalla.
 * `(?:\?|$)` cubre el archivo pelado y el mismo archivo con query.
 */
export const PWA_NAVIGATE_FALLBACK_DENYLIST = [
  /^\/manifest\.webmanifest(?:\?|$)/,
  /^\/version\.json(?:\?|$)/,
  /^\/ffmpeg\//,
  /^\/assets\//,
  /^\/sw\.js(?:\?|$)/,
  /^\/workbox-/,
  /^\/refrescar\.html(?:\?|$)/,
  /\.[a-zA-Z0-9]+(?:\?|$)/,
];

/** true si la navegación debe ir a la red y no al shell precacheado. */
export function isNavigationDenylisted(pathnameAndSearch = "") {
  const value = String(pathnameAndSearch || "");
  return PWA_NAVIGATE_FALLBACK_DENYLIST.some((pattern) => pattern.test(value));
}
