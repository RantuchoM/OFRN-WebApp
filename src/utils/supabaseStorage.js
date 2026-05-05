/**
 * Interpreta URLs de objeto Storage (public / sign / authenticated).
 * Quita query (?token=…) antes de parsear para poder re-firmar vistas previas.
 * @returns {{ bucket: string, path: string } | null}
 */
export function parseSupabasePublicStorageUrl(url) {
  if (!url || typeof url !== "string") return null;
  const clean = url.split("#")[0].split("?")[0];

  const markers = [
    "/storage/v1/object/public/",
    "/storage/v1/object/sign/",
    "/storage/v1/object/authenticated/",
  ];

  for (const marker of markers) {
    const i = clean.indexOf(marker);
    if (i === -1) continue;
    let rest = clean.slice(i + marker.length);
    try {
      rest = decodeURIComponent(rest);
    } catch {
      /* mantener rest si hay secuencias inválidas */
    }
    const slash = rest.indexOf("/");
    if (slash === -1) return null;
    const bucket = rest.slice(0, slash);
    const path = rest.slice(slash + 1);
    if (!bucket || !path) return null;
    return { bucket, path };
  }

  return null;
}
