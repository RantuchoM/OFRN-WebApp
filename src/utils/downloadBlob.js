/**
 * Descarga de archivos en el navegador.
 *
 * `file-saver` no guarda en el celular: no inserta el `<a>` en el DOM y
 * dispara el click en un `setTimeout`. En iPhone/iPad el atributo `download`
 * de un blob tampoco baja el archivo; hay que usar la hoja de compartir,
 * en el mismo toque del usuario.
 */

export const XLSX_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/**
 * @param {{ userAgent?: string, platform?: string, maxTouchPoints?: number, canShareFiles?: boolean }} env
 */
export function prefersIosShareSheet(env = {}) {
  const ua = env.userAgent || "";
  const platform = env.platform || "";
  const points = Number(env.maxTouchPoints) || 0;
  const iOS =
    /iPad|iPhone|iPod/.test(ua) || (platform === "MacIntel" && points > 1);
  return iOS && env.canShareFiles === true;
}

function readNavigatorEnv() {
  if (typeof navigator === "undefined") {
    return {
      userAgent: "",
      platform: "",
      maxTouchPoints: 0,
      canShareFiles: false,
    };
  }
  return {
    userAgent: navigator.userAgent || "",
    platform: navigator.platform || "",
    maxTouchPoints: navigator.maxTouchPoints || 0,
    canShareFiles: false,
  };
}

export function canShareFiles(file) {
  if (typeof navigator === "undefined") return false;
  if (typeof navigator.share !== "function") return false;
  if (typeof navigator.canShare !== "function") return false;
  try {
    return navigator.canShare({ files: [file] });
  } catch {
    return false;
  }
}

function triggerAnchorDownload(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.rel = "noopener";
  a.style.position = "fixed";
  a.style.left = "-9999px";
  a.style.top = "0";
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    a.remove();
    URL.revokeObjectURL(url);
  }, 60_000);
}

/**
 * @param {Blob} blob
 * @param {string} fileName
 * @returns {Promise<"shared"|"downloaded"|"cancelled"|"needs-gesture">}
 */
export async function saveBlobFile(blob, fileName) {
  const type = blob.type || "application/octet-stream";
  const file = new File([blob], fileName, { type });
  const env = readNavigatorEnv();
  env.canShareFiles = canShareFiles(file);

  if (prefersIosShareSheet(env)) {
    try {
      await navigator.share({ files: [file], title: fileName });
      return "shared";
    } catch (err) {
      if (err?.name === "AbortError") return "cancelled";
      return "needs-gesture";
    }
  }

  if (typeof document === "undefined") {
    throw new Error("No se pudo iniciar la descarga");
  }
  triggerAnchorDownload(blob, fileName);
  return "downloaded";
}
