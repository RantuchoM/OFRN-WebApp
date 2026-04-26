import jsQR from "jsqr";

/**
 * Decodifica el primer QR legible en una imagen (foto/archivo).
 * Mismo enfoque que captura nativa `input capture=environment` en Mi Perfil.
 */
export async function decodeQrFromImageFile(file) {
  if (!file || !file.type?.startsWith("image/")) return null;
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("No se pudo cargar la imagen"));
      img.src = url;
    });
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    if (!w || !h) return null;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0);
    const imageData = ctx.getImageData(0, 0, w, h);
    const result = jsQR(imageData.data, w, h, { inversionAttempts: "attemptBoth" });
    return result?.data ?? null;
  } finally {
    URL.revokeObjectURL(url);
  }
}
