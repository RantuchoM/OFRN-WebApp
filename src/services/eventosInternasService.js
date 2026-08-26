import { supabase } from "./supabase";
import {
  EVENTOS_INTERNAS_BUCKET,
  normalizeEventosInternasStorageKey,
} from "../utils/eventosInternas";

/** Máx. bytes cliente + bucket `eventos-internas` (mismo tope que rider). */
export const EVENTOS_INTERNAS_IMAGE_MAX_BYTES = 8 * 1024 * 1024;

const IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
]);

function imageExt(mime, fileName) {
  const fromMime = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/webp": "webp",
  }[String(mime || "").toLowerCase()];
  if (fromMime) return fromMime;
  const m = String(fileName || "")
    .toLowerCase()
    .match(/\.(jpe?g|png|gif|webp)$/);
  if (!m) return "jpg";
  return m[1] === "jpeg" ? "jpg" : m[1];
}

/**
 * Redimensiona a ≤1600px de ancho y JPEG 82% (sin deps). GIF se deja intacto.
 * @param {Blob|File} file
 * @returns {Promise<File>}
 */
function compressImage(file) {
  return new Promise((resolve, reject) => {
    const mime = String(file.type || "").toLowerCase();
    if (mime === "image/gif") {
      resolve(file instanceof File ? file : new File([file], "imagen.gif", { type: "image/gif" }));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () =>
      reject(reader.error || new Error("No se pudo leer la imagen"));
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const MAX_W = 1600;
        const scale = img.width > MAX_W ? MAX_W / img.width : 1;
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("No se pudo comprimir la imagen"));
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("No se pudo comprimir la imagen"));
              return;
            }
            const name = String(file.name || "imagen").replace(/\.[^/.]+$/, ".jpg");
            resolve(
              new File([blob], name, {
                type: "image/jpeg",
                lastModified: Date.now(),
              }),
            );
          },
          "image/jpeg",
          0.82,
        );
      };
      img.onerror = () => reject(new Error("Imagen inválida"));
      img.src = String(reader.result || "");
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Sube imagen de observaciones internas al bucket público `eventos-internas`.
 * Path: eventos/{id|draft-uuid}/{uuid}.{ext}
 *
 * @param {{ eventoId: number|string, file: File|Blob }}
 * @returns {Promise<{ url: string|null, path: string|null, error: Error|null }>}
 */
export async function uploadEventoInternasImage({ eventoId, file }) {
  if (!file || !(file instanceof Blob)) {
    return {
      url: null,
      path: null,
      error: new Error("No hay imagen para subir"),
    };
  }
  const mime = String(file.type || "").toLowerCase();
  if (mime && !mime.startsWith("image/")) {
    return {
      url: null,
      path: null,
      error: new Error("Solo se permiten imágenes (JPG, PNG, GIF o WebP)."),
    };
  }
  if (mime && mime !== "image/jpg" && !IMAGE_TYPES.has(mime)) {
    return {
      url: null,
      path: null,
      error: new Error("Formato no soportado. Usá JPG, PNG, GIF o WebP."),
    };
  }
  if (file.size > EVENTOS_INTERNAS_IMAGE_MAX_BYTES) {
    return {
      url: null,
      path: null,
      error: new Error("La imagen supera el máximo de 8 MB."),
    };
  }
  const key = normalizeEventosInternasStorageKey(eventoId);
  if (!key) {
    return {
      url: null,
      path: null,
      error: new Error("Falta el evento para subir la imagen."),
    };
  }

  try {
    const compressed = await compressImage(file);
    if (compressed.size > EVENTOS_INTERNAS_IMAGE_MAX_BYTES) {
      return {
        url: null,
        path: null,
        error: new Error("La imagen comprimida sigue superando 8 MB."),
      };
    }
    const ext = imageExt(compressed.type, compressed.name);
    const id =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const path = `eventos/${key}/${id}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from(EVENTOS_INTERNAS_BUCKET)
      .upload(path, compressed, {
        contentType: compressed.type || "image/jpeg",
        cacheControl: "31536000",
        upsert: false,
      });
    if (uploadError) {
      return {
        url: null,
        path: null,
        error: new Error(uploadError.message || "No se pudo subir la imagen"),
      };
    }
    const { data } = supabase.storage
      .from(EVENTOS_INTERNAS_BUCKET)
      .getPublicUrl(path);
    const url = data?.publicUrl || null;
    if (!url) {
      return {
        url: null,
        path,
        error: new Error("No se obtuvo la URL pública de la imagen"),
      };
    }
    return { url, path, error: null };
  } catch (e) {
    return {
      url: null,
      path: null,
      error: e instanceof Error ? e : new Error(String(e?.message || e)),
    };
  }
}
