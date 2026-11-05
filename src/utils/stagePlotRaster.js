/**
 * Contrato de íconos raster del plano (PNG / WebP).
 * El binario no se guarda en `svg_icon`: solo se valida acá y se sube a Storage.
 *
 * - Fondo transparente: canal alpha (PNG color type 4/6, o indexed + tRNS;
 *   WebP VP8X con flag alpha, chunk ALPH, o VP8L con alpha_is_used).
 * - Lado largo ≥ 1024 px, para que zoom y PDF no se vean blandos.
 * - Máximo 1 MB. JPEG y GIF se rechazan.
 */

export const STAGE_PLOT_RASTER_MAX_BYTES = 1_048_576;
export const STAGE_PLOT_RASTER_MIN_LONG_SIDE = 1024;
export const STAGE_PLOT_RASTER_MAX_SIDE = 8192;
export const STAGE_PLOT_ICONS_BUCKET = "stage-plot-icons";

export const STAGE_PLOT_RASTER_HINT =
  "PNG o WebP con fondo transparente, lado largo de al menos 1024 px, máximo 1 MB. El plano muestra esta imagen tal cual (sin tinte). El SVG, si existe, queda de reserva.";

const PNG_SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];

/**
 * Path dentro del bucket, o null si la URL no es de stage-plot-icons.
 * @param {string|null|undefined} publicUrl
 * @returns {string|null}
 */
export function stagePlotRasterObjectPath(publicUrl) {
  if (!publicUrl || typeof publicUrl !== "string") return null;
  const marker = `/storage/v1/object/public/${STAGE_PLOT_ICONS_BUCKET}/`;
  const i = publicUrl.indexOf(marker);
  if (i < 0) return null;
  const rest = publicUrl.slice(i + marker.length).split("?")[0];
  if (!rest) return null;
  let path = rest;
  try {
    path = decodeURIComponent(rest);
  } catch {
    path = rest;
  }
  if (!path.startsWith("instrumentos/") && !path.startsWith("elementos/")) {
    return null;
  }
  return path;
}

/**
 * @param {File|Blob|null|undefined} file
 * @returns {"svg"|"raster"|"reject"}
 */
export function classifyStagePlotIconUpload(file) {
  const name = String(file?.name || "");
  const type = String(file?.type || "");
  if (type === "image/svg+xml" || /\.svg$/i.test(name)) return "svg";
  if (
    type === "image/png" ||
    type === "image/webp" ||
    /\.png$/i.test(name) ||
    /\.webp$/i.test(name)
  ) {
    return "raster";
  }
  return "reject";
}

/**
 * @param {Uint8Array} bytes
 * @returns {{ ok: true, mime: "image/png"|"image/webp", width: number, height: number } | { ok: false, error: string }}
 */
export function validateStagePlotRasterBytes(bytes) {
  if (!(bytes instanceof Uint8Array) || bytes.length === 0) {
    return { ok: false, error: "El archivo está vacío." };
  }
  if (bytes.length > STAGE_PLOT_RASTER_MAX_BYTES) {
    return {
      ok: false,
      error: "Archivo demasiado grande (máx. 1 MB).",
    };
  }
  if (isJpeg(bytes) || isGif(bytes)) {
    return {
      ok: false,
      error:
        "JPEG y GIF no sirven: hace falta PNG o WebP con fondo transparente.",
    };
  }

  const png = readPng(bytes);
  if (png) return finishRaster("image/png", png);
  const webp = readWebp(bytes);
  if (webp?.animated) {
    return {
      ok: false,
      error: "Los WebP animados no sirven como ícono del plano.",
    };
  }
  if (webp) return finishRaster("image/webp", webp);

  return {
    ok: false,
    error: "No es un PNG ni un WebP válido.",
  };
}

/**
 * @param {File|Blob} file
 * @returns {Promise<{ ok: true, mime: "image/png"|"image/webp", width: number, height: number } | { ok: false, error: string }>}
 */
export async function validateStagePlotRasterFile(file) {
  if (!file || typeof file.arrayBuffer !== "function") {
    return { ok: false, error: "No se pudo leer el archivo." };
  }
  if (file.size > STAGE_PLOT_RASTER_MAX_BYTES) {
    return { ok: false, error: "Archivo demasiado grande (máx. 1 MB)." };
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  return validateStagePlotRasterBytes(bytes);
}

/**
 * @param {"image/png"|"image/webp"} mime
 * @param {{ width: number, height: number, alpha: boolean }} info
 */
function finishRaster(mime, info) {
  if (!info.alpha) {
    return {
      ok: false,
      error:
        "El archivo no tiene fondo transparente (falta canal alpha). Exportá PNG o WebP con transparencia.",
    };
  }
  const longSide = Math.max(info.width, info.height);
  const shortSide = Math.min(info.width, info.height);
  if (!info.width || !info.height) {
    return { ok: false, error: "No se pudo leer el tamaño de la imagen." };
  }
  if (longSide < STAGE_PLOT_RASTER_MIN_LONG_SIDE) {
    return {
      ok: false,
      error: `El lado largo tiene que medir al menos ${STAGE_PLOT_RASTER_MIN_LONG_SIDE} px (ahora ${info.width}×${info.height}).`,
    };
  }
  if (
    longSide > STAGE_PLOT_RASTER_MAX_SIDE ||
    shortSide > STAGE_PLOT_RASTER_MAX_SIDE
  ) {
    return {
      ok: false,
      error: `La imagen es demasiado grande (máx. ${STAGE_PLOT_RASTER_MAX_SIDE} px de lado).`,
    };
  }
  return { ok: true, mime, width: info.width, height: info.height };
}

/** @param {Uint8Array} bytes */
function isJpeg(bytes) {
  return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
}

/** @param {Uint8Array} bytes */
function isGif(bytes) {
  return (
    bytes.length >= 6 &&
    bytes[0] === 0x47 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x38
  );
}

/**
 * @param {Uint8Array} bytes
 * @returns {{ width: number, height: number, alpha: boolean } | null}
 */
function readPng(bytes) {
  if (bytes.length < 8 + 8 + 13) return null;
  for (let i = 0; i < PNG_SIGNATURE.length; i += 1) {
    if (bytes[i] !== PNG_SIGNATURE[i]) return null;
  }
  const length = readU32BE(bytes, 8);
  const type = ascii(bytes, 12, 4);
  if (type !== "IHDR" || length !== 13) return null;
  const width = readU32BE(bytes, 16);
  const height = readU32BE(bytes, 20);
  const colorType = bytes[25];
  let alpha = colorType === 4 || colorType === 6;
  if (colorType === 3) alpha = pngHasTrns(bytes);
  if (colorType !== 0 && colorType !== 2 && colorType !== 3 && colorType !== 4 && colorType !== 6) {
    return null;
  }
  return { width, height, alpha };
}

/** @param {Uint8Array} bytes */
function pngHasTrns(bytes) {
  let offset = 8;
  while (offset + 8 <= bytes.length) {
    const length = readU32BE(bytes, offset);
    const type = ascii(bytes, offset + 4, 4);
    if (type === "tRNS") return true;
    if (type === "IEND") return false;
    const next = offset + 12 + length;
    if (next <= offset) return false;
    offset = next;
  }
  return false;
}

/**
 * @param {Uint8Array} bytes
 * @returns {{ width: number, height: number, alpha: boolean, animated?: boolean } | null}
 */
function readWebp(bytes) {
  if (bytes.length < 12) return null;
  if (ascii(bytes, 0, 4) !== "RIFF") return null;
  if (ascii(bytes, 8, 4) !== "WEBP") return null;

  /** @type {{ flags: number, width: number, height: number } | null} */
  let vp8x = null;
  /** @type {{ width: number, height: number, alpha: boolean } | null} */
  let vp8l = null;
  /** @type {{ width: number, height: number } | null} */
  let vp8 = null;
  let hasAlphChunk = false;

  let offset = 12;
  while (offset + 8 <= bytes.length) {
    const tag = ascii(bytes, offset, 4);
    const size = readU32LE(bytes, offset + 4);
    const dataStart = offset + 8;
    if (size < 0 || dataStart + size > bytes.length) break;
    if (tag === "VP8X" && size >= 10) {
      const flags = bytes[dataStart];
      const width =
        1 +
        (bytes[dataStart + 4] |
          (bytes[dataStart + 5] << 8) |
          (bytes[dataStart + 6] << 16));
      const height =
        1 +
        (bytes[dataStart + 7] |
          (bytes[dataStart + 8] << 8) |
          (bytes[dataStart + 9] << 16));
      vp8x = { flags, width, height };
    } else if (tag === "VP8L" && size >= 5) {
      vp8l = readVp8lHeader(bytes, dataStart);
    } else if (tag === "VP8 " && size >= 10) {
      vp8 = readVp8KeyframeSize(bytes, dataStart);
    } else if (tag === "ALPH") {
      hasAlphChunk = true;
    }
    const padded = size + (size & 1);
    const next = dataStart + padded;
    if (next <= offset) break;
    offset = next;
  }

  if (vp8x) {
    if ((vp8x.flags & 0x02) !== 0) {
      return { width: vp8x.width, height: vp8x.height, alpha: false, animated: true };
    }
    const alpha = (vp8x.flags & 0x10) !== 0 || hasAlphChunk;
    return { width: vp8x.width, height: vp8x.height, alpha };
  }
  if (vp8l) return vp8l;
  if (vp8) return { width: vp8.width, height: vp8.height, alpha: false };
  return null;
}

/**
 * Lossy VP8 keyframe: 3-byte tag, start code 9d 01 2a, then 14-bit width/height.
 * @param {Uint8Array} bytes
 * @param {number} offset
 */
function readVp8KeyframeSize(bytes, offset) {
  const keyframe = (bytes[offset] & 1) === 0;
  if (!keyframe) return null;
  if (
    bytes[offset + 3] !== 0x9d ||
    bytes[offset + 4] !== 0x01 ||
    bytes[offset + 5] !== 0x2a
  ) {
    return null;
  }
  const width = (bytes[offset + 6] | (bytes[offset + 7] << 8)) & 0x3fff;
  const height = (bytes[offset + 8] | (bytes[offset + 9] << 8)) & 0x3fff;
  if (!width || !height) return null;
  return { width, height };
}

/**
 * VP8L image header: 0x2f, 14 bits width-1, 14 bits height-1, 1 bit alpha.
 * @param {Uint8Array} bytes
 * @param {number} offset
 */
function readVp8lHeader(bytes, offset) {
  if (bytes[offset] !== 0x2f) return null;
  const b0 = bytes[offset + 1];
  const b1 = bytes[offset + 2];
  const b2 = bytes[offset + 3];
  const b3 = bytes[offset + 4];
  const width = (b0 | ((b1 & 0x3f) << 8)) + 1;
  const height = ((b1 >> 6) | (b2 << 2) | ((b3 & 0x0f) << 10)) + 1;
  const alpha = ((b3 >> 4) & 1) === 1;
  return { width, height, alpha };
}

/** @param {Uint8Array} bytes @param {number} offset */
function readU32BE(bytes, offset) {
  return (
    ((bytes[offset] << 24) |
      (bytes[offset + 1] << 16) |
      (bytes[offset + 2] << 8) |
      bytes[offset + 3]) >>>
    0
  );
}

/** @param {Uint8Array} bytes @param {number} offset */
function readU32LE(bytes, offset) {
  return (
    (bytes[offset] |
      (bytes[offset + 1] << 8) |
      (bytes[offset + 2] << 16) |
      (bytes[offset + 3] << 24)) >>>
    0
  );
}

/** @param {Uint8Array} bytes @param {number} offset @param {number} length */
function ascii(bytes, offset, length) {
  let out = "";
  for (let i = 0; i < length; i += 1) out += String.fromCharCode(bytes[offset + i] || 0);
  return out;
}
