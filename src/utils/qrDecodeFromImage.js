import jsQR from "jsqr";

const INVERSIONS = ["attemptBoth", "invertFirst", "onlyInvert", "dontInvert"];

const SCALES_DEFAULT = [900, 1200, 650, 1400, 500, 1600, 400, 2000, 300];
const SCALES_ROTATED = [900, 1200, 650, 500];

/**
 * Pasa la imagen a un canvas con el lado máximo limitado.
 */
function drawBitmapScaled(bitmap, maxSide) {
  const sw = bitmap.width;
  const sh = bitmap.height;
  if (!sw || !sh) return null;
  const scale = Math.min(1, maxSide / Math.max(sw, sh));
  const dw = Math.max(1, Math.round(sw * scale));
  const dh = Math.max(1, Math.round(sh * scale));
  const canvas = document.createElement("canvas");
  canvas.width = dw;
  canvas.height = dh;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, dw, dh);
  return ctx.getImageData(0, 0, dw, dh);
}

function decodeImageDataOnce(imageData) {
  for (const inversionAttempts of INVERSIONS) {
    const result = jsQR(
      imageData.data,
      imageData.width,
      imageData.height,
      { inversionAttempts },
    );
    if (result?.data) return result.data;
  }
  return null;
}

function tryDecodeWithScales(bitmap, maxSides) {
  for (const maxSide of maxSides) {
    const imageData = drawBitmapScaled(bitmap, maxSide);
    if (!imageData) continue;
    const text = decodeImageDataOnce(imageData);
    if (text) return text;
  }
  return null;
}

/** Rota 90° en sentido horario. */
function rotateBitmap90Cw(bitmap) {
  const w = bitmap.width;
  const h = bitmap.height;
  const canvas = document.createElement("canvas");
  canvas.width = h;
  canvas.height = w;
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.resolve(null);
  ctx.translate(h, 0);
  ctx.rotate(Math.PI / 2);
  ctx.drawImage(bitmap, 0, 0);
  return createImageBitmap(canvas);
}

/**
 * Decodifica el primer QR legible en una imagen (foto/archivo).
 * Normaliza EXIF, reescala y reintenta (fotos de celular: tamaño/rotación).
 */
export async function decodeQrFromImageFile(file) {
  if (!file) return null;
  const t = file.type || "";
  if (!t.startsWith("image/") && !/jpeg|jpg|png|webp|heic|heif/i.test(t) && t !== "") {
    return null;
  }

  let root;
  let rootIsCopy = false;

  try {
    try {
      root = await createImageBitmap(file, { imageOrientation: "from-image" });
      rootIsCopy = true;
    } catch {
      root = null;
    }

    if (!root) {
      const url = URL.createObjectURL(file);
      try {
        const img = new Image();
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = () => reject(new Error("imagen"));
          img.src = url;
        });
        root = await createImageBitmap(img);
        rootIsCopy = true;
      } catch {
        return null;
      } finally {
        URL.revokeObjectURL(url);
      }
    }

    if (!root?.width) return null;

    let text = tryDecodeWithScales(root, SCALES_DEFAULT);
    if (text) return text;

    let oriented = root;
    for (let r = 0; r < 3; r++) {
      const next = await rotateBitmap90Cw(oriented);
      if (!next) break;
      if (oriented !== root) {
        try {
          oriented.close();
        } catch {
          /* ignore */
        }
      }
      oriented = next;
      text = tryDecodeWithScales(oriented, SCALES_ROTATED);
      if (text) {
        if (oriented !== root) {
          try {
            oriented.close();
          } catch {
            /* ignore */
          }
        }
        return text;
      }
    }
    if (oriented !== root) {
      try {
        oriented.close();
      } catch {
        /* ignore */
      }
    }

    return null;
  } finally {
    if (rootIsCopy && root) {
      try {
        root.close();
      } catch {
        /* ignore */
      }
    }
  }
}
