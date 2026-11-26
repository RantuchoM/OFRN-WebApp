/**
 * Händel — And the Glory of the Lord, recorte del Messiah (cuerdas y órgano).
 * Obra ya cargada: 3904. Fuente: CUERDAS\Händel, G.F. - Messiah (obra 3643).
 * En esa edición el coro es [3] Chorus (La mayor, 3/4, cierra en Adagio).
 */
import { canonicalPartFilename } from "./pdfPartsRenaming.mjs";

export const PARA_ACOMODAR_ROOT =
  process.env.PARA_ACOMODAR_ROOT ||
  "H:\\Mi unidad\\Archivo General OFRN\\Para acomodar";

export const PARA_ACOMODAR_FOLDER_ID = "10ap1aEjq3X9bFRB3z4DQ-F0fB7y3JutI";

export const CUERDAS_ROOT = "H:\\Mi unidad\\Archivo General OFRN\\CUERDAS";

export const SOURCE_DIR =
  "H:\\Mi unidad\\Archivo General OFRN\\CUERDAS\\Händel, G.F. - Messiah";

export const OBRA_ID = 3904;
export const WORK_TITLE = "And the Glory of the Lord";
export const WORK_NUMBER = "HWV 56";
export const COMPOSER_TAG = "Händel, G.F";
export const TARGET_FOLDER = "Händel, G.F. - And the Glory of the Lord";

export const TITULO_HTML = "<p>And the Glory of the Lord (Messiah)</p>";

/** Marriner, Academy of St Martin in the Fields, Decca 1976: este coro, 2:57. */
export const DURACION_SEGUNDOS = 2 * 60 + 57;
export const ANIO = 1741;

export const OBSERVACIONES =
  "Temporada 2027 P17 · Recorte del coro (en la parte, [3] Chorus) desde Händel, G.F. - Messiah, cuerdas y órgano (obra 3643). La página de cuerdas incluye el final del aria anterior. Sin partes de coro en ese set.";

/** Páginas 1-based. El coro termina en la última; si la siguiente pieza empieza ahí, la página entra igual. */
export const CROPS = [
  { file: "Violín 1 - Messiah [cuerdas y órgano] - Händel, G.F.pdf", instrument: "Violín 1", pages: [3] },
  { file: "Violín 2 - Messiah [cuerdas y órgano] - Händel, G.F.pdf", instrument: "Violín 2", pages: [3] },
  { file: "Viola - Messiah [cuerdas y órgano] - Händel, G.F.pdf", instrument: "Viola", pages: [3] },
  {
    file: "Violoncello y Contrabajo - Messiah [cuerdas y órgano] - Händel, G.F.pdf",
    instrument: "Violoncello y Contrabajo",
    pages: [3, 4],
  },
  { file: "Órgano - Messiah [cuerdas y órgano] - Händel, G.F.pdf", instrument: "Órgano", pages: [2, 3] },
];

export function partFilename(instrument) {
  return canonicalPartFilename(instrument, WORK_NUMBER, WORK_TITLE, COMPOSER_TAG);
}

export function driveFolderUrl(folderId) {
  return folderId ? `https://drive.google.com/open?id=${folderId}` : "";
}
