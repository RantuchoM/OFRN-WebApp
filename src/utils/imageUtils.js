import * as pdfjsLib from "pdfjs-dist";

if (typeof window !== "undefined") {
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
}

/**
 * Convierte la primera página de un PDF a data URL JPEG.
 * @param {string} pdfUrl - URL del PDF (si no se pasa getArrayBuffer)
 * @param {{ getArrayBuffer?: () => Promise<ArrayBuffer> }} [options] - lectura autenticada (p. ej. storage.download) evita CORS en buckets privados
 * @returns {Promise<string>} - data URL de la imagen
 */
export async function convertPdfToImage(pdfUrl, options = {}) {
  const loadingTask = options.getArrayBuffer
    ? pdfjsLib.getDocument({ data: await options.getArrayBuffer() })
    : pdfjsLib.getDocument(pdfUrl);
  const pdf = await loadingTask.promise;
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale: 2.0 });
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  canvas.height = viewport.height;
  canvas.width = viewport.width;
  await page.render({ canvasContext: context, viewport: viewport }).promise;
  return canvas.toDataURL("image/jpeg", 0.95);
}

/**
 * Recorta una imagen según el área crop y devuelve un File.
 * @param {HTMLImageElement} image - Elemento img
 * @param {object} crop - { x, y, width, height }
 * @param {boolean} [isPng=false]
 * @returns {Promise<File>}
 */
export async function getCroppedImg(image, crop, isPng = false) {
  const canvas = document.createElement("canvas");
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;
  canvas.width = crop.width;
  canvas.height = crop.height;
  const ctx = canvas.getContext("2d");
  if (!isPng) {
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.drawImage(
    image,
    crop.x * scaleX,
    crop.y * scaleY,
    crop.width * scaleX,
    crop.height * scaleY,
    0,
    0,
    crop.width,
    crop.height,
  );
  return new Promise((resolve) => {
    const type = isPng ? "image/png" : "image/jpeg";
    canvas.toBlob(
      (blob) => {
        resolve(
          new File([blob], `cropped_${Date.now()}.${isPng ? "png" : "jpg"}`, {
            type,
          }),
        );
      },
      type,
      0.95,
    );
  });
}

/**
 * Comprime una imagen redimensionando a ancho máximo 1200px y convirtiendo a JPEG.
 * @param {File} file - Archivo de imagen
 * @returns {Promise<File>}
 */
export function compressImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 1200;
        const scaleSize = MAX_WIDTH / img.width;
        const width = scaleSize < 1 ? MAX_WIDTH : img.width;
        const height = scaleSize < 1 ? img.height * scaleSize : img.height;
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            resolve(
              new File([blob], file.name.replace(/\.[^/.]+$/, ".jpg"), {
                type: "image/jpeg",
                lastModified: Date.now(),
              }),
            );
          },
          "image/jpeg",
          0.7,
        );
      };
      img.onerror = reject;
    };
    reader.onerror = reject;
  });
}
