/**
 * IDs y URLs de imagen en Google Drive (portadas Entradas).
 * Mismos patrones que Noticias / VideoPlayer del proyecto.
 */

export function extractGoogleDriveFileId(url) {
  const raw = String(url || "").trim();
  if (!raw) return null;

  const patterns = [
    /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/i,
    /drive\.google\.com\/file\/u\/\d+\/d\/([a-zA-Z0-9_-]+)/i,
    /drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/i,
    /drive\.google\.com\/uc\?(?:[^#]*&)?id=([a-zA-Z0-9_-]+)/i,
    /drive\.google\.com\/thumbnail\?id=([a-zA-Z0-9_-]+)/i,
    /lh3\.googleusercontent\.com\/d\/([a-zA-Z0-9_-]+)/i,
  ];

  for (const pattern of patterns) {
    const match = raw.match(pattern);
    if (match?.[1]) return match[1];
  }

  if (raw.includes("drive.google.com")) {
    const q = raw.match(/[?&]id=([a-zA-Z0-9_-]+)/i);
    if (q?.[1]) return q[1];
  }

  return null;
}

/** URL para <img>: lh3 suele ser más fiable que thumbnail de Drive. */
export function driveImageDisplayUrl(url) {
  const raw = String(url || "").trim();
  if (!raw) return "";
  const id = extractGoogleDriveFileId(raw);
  if (id) return `https://lh3.googleusercontent.com/d/${id}`;
  return raw.startsWith("http") ? raw : "";
}

/** Alternativas si falla la carga principal. */
export function driveImageFallbackSrcList(url) {
  const id = extractGoogleDriveFileId(url);
  if (!id) return [];
  return [
    `https://drive.google.com/thumbnail?id=${id}&sz=w1600`,
    `https://drive.google.com/uc?export=view&id=${id}`,
  ];
}

/** Al guardar: enlace canónico (no thumbnail) para reutilizar al editar. */
export function normalizeDriveImageUrlForStorage(url) {
  const raw = String(url || "").trim();
  if (!raw) return "";
  const id = extractGoogleDriveFileId(raw);
  if (id) return `https://drive.google.com/file/d/${id}/view`;
  return raw;
}
