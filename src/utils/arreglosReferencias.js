function stripHtml(html) {
  return (html || "").replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
}

export function resolveReferenciaOpenUrl(ref) {
  const link = (ref?.link || "").trim();
  if (link) return link;
  const drive = (ref?.obra_ref?.link_drive || "").trim();
  if (drive) return drive;
  return null;
}

export function isYoutubeUrl(url) {
  const value = (url || "").trim();
  if (!value) return false;
  try {
    const host = new URL(value).hostname.replace(/^www\./, "").toLowerCase();
    return (
      host === "youtube.com" ||
      host === "youtu.be" ||
      host === "m.youtube.com" ||
      host === "music.youtube.com"
    );
  } catch {
    return false;
  }
}

export function isDriveUrl(url) {
  const value = (url || "").trim();
  if (!value) return false;
  try {
    const host = new URL(value).hostname.replace(/^www\./, "").toLowerCase();
    return host === "drive.google.com" || host === "docs.google.com";
  } catch {
    return false;
  }
}

/** obra | youtube | drive | external | none */
export function getReferenciaLinkKind(ref) {
  const url = (ref?.link || "").trim();
  if (url) {
    if (isYoutubeUrl(url)) return "youtube";
    if (isDriveUrl(url)) return "drive";
    return "external";
  }
  if (ref?.obra_ref) {
    const drive = (ref.obra_ref?.link_drive || "").trim();
    if (drive) return "drive";
    return "obra";
  }
  return "none";
}

export function getReferenciaOpenKind(ref, openUrl) {
  if (!openUrl) return "none";
  if (isYoutubeUrl(openUrl)) return "youtube";
  if (isDriveUrl(openUrl)) return "drive";
  if (ref?.obra_ref && !(ref?.link || "").trim()) return "drive";
  return "external";
}

export function getReferenciaLinkLabel(kind) {
  switch (kind) {
    case "obra":
      return "Obra del archivo";
    case "youtube":
      return "YouTube";
    case "drive":
      return "Google Drive";
    case "external":
      return "Enlace externo";
    default:
      return "Sin enlace";
  }
}

export function buildReferenciaObraOrigenTitulo(sourceWorkId, sourceTitulo) {
  const plain = stripHtml(sourceTitulo);
  if (plain) {
    const clipped = plain.length > 72 ? `${plain.slice(0, 72)}…` : plain;
    return `Obra original · ${clipped}`;
  }
  return `Obra original (#${sourceWorkId})`;
}

/** Inserta la obra fuente como primera referencia del nuevo encargo de arreglo. */
export async function seedArregloReferenciaObraOrigen(
  supabase,
  newObraId,
  sourceWorkId,
  sourceTitulo,
) {
  if (!supabase || !newObraId || !sourceWorkId) return { ok: false, skipped: true };

  const { error } = await supabase.from("arreglos_referencias").insert([
    {
      id_obra: newObraId,
      titulo: buildReferenciaObraOrigenTitulo(sourceWorkId, sourceTitulo),
      id_obra_referencia: sourceWorkId,
      link: null,
      orden: 0,
    },
  ]);

  if (error) {
    console.warn("seedArregloReferenciaObraOrigen:", error.message);
    return { ok: false, error };
  }
  return { ok: true };
}
