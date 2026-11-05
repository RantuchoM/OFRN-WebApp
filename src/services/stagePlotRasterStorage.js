import { supabase } from "./supabase";
import {
  STAGE_PLOT_ICONS_BUCKET,
  stagePlotRasterObjectPath,
  validateStagePlotRasterFile,
} from "../utils/stagePlotRaster";

export { STAGE_PLOT_ICONS_BUCKET, stagePlotRasterObjectPath };

/**
 * @param {unknown} ownerId
 */
function safeOwnerId(ownerId) {
  const raw = String(ownerId ?? "").trim();
  const safe = raw.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80);
  return safe || "item";
}

/**
 * @param {"instrumentos"|"elementos"} scope
 * @param {unknown} ownerId
 * @param {"image/png"|"image/webp"} mime
 */
function buildObjectPath(scope, ownerId, mime) {
  const ext = mime === "image/webp" ? "webp" : "png";
  const id =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${scope}/${safeOwnerId(ownerId)}/${id}.${ext}`;
}

/**
 * Sube un PNG/WebP ya validado. No toca la fila de la base.
 * @param {File|Blob} file
 * @param {{ scope: "instrumentos"|"elementos", ownerId: unknown }} opts
 * @returns {Promise<{ url: string, path: string, mime: string, width: number, height: number }>}
 */
export async function uploadStagePlotRasterFile(file, opts) {
  const scope = opts?.scope;
  if (scope !== "instrumentos" && scope !== "elementos") {
    throw new Error("Destino de ícono inválido.");
  }
  const checked = await validateStagePlotRasterFile(file);
  if (!checked.ok) throw new Error(checked.error);

  const path = buildObjectPath(scope, opts.ownerId, checked.mime);
  const { error } = await supabase.storage
    .from(STAGE_PLOT_ICONS_BUCKET)
    .upload(path, file, {
      contentType: checked.mime,
      upsert: false,
      cacheControl: "31536000",
    });
  if (error) throw new Error(error.message || "No se pudo subir el ícono.");

  const { data } = supabase.storage.from(STAGE_PLOT_ICONS_BUCKET).getPublicUrl(path);
  const url = data?.publicUrl;
  if (!url) {
    await removeStagePlotRasterByPath(path);
    throw new Error("Storage no devolvió la URL pública.");
  }
  return {
    url,
    path,
    mime: checked.mime,
    width: checked.width,
    height: checked.height,
  };
}

/**
 * @param {string|null|undefined} path
 */
export async function removeStagePlotRasterByPath(path) {
  if (!path) return;
  const { error } = await supabase.storage
    .from(STAGE_PLOT_ICONS_BUCKET)
    .remove([path]);
  if (error) {
    console.warn("[stage-plot-icons] no se pudo borrar", path, error.message);
  }
}

/**
 * Borra el objeto si la URL es de este bucket. Ignora URLs ajenas.
 * @param {string|null|undefined} publicUrl
 */
export async function removeStagePlotRasterByUrl(publicUrl) {
  const path = stagePlotRasterObjectPath(publicUrl);
  if (!path) return;
  await removeStagePlotRasterByPath(path);
}
