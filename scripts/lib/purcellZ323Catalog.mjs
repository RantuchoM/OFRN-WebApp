/**
 * Purcell — Come, ye sons of art, Z.323. Obra ya cargada: 3906.
 * Score completo de Calebe Barros (IMSLP #709134). La ficha no tiene
 * particellas de esta edición: las de Martin Straeten son solo la Sinfonia.
 */
import { canonicalPartFilename } from "./pdfPartsRenaming.mjs";

export const PARA_ACOMODAR_ROOT =
  process.env.PARA_ACOMODAR_ROOT ||
  "H:\\Mi unidad\\Archivo General OFRN\\Para acomodar";

export const PARA_ACOMODAR_FOLDER_ID = "10ap1aEjq3X9bFRB3z4DQ-F0fB7y3JutI";

export const ORQUESTA_ROOT = "H:\\Mi unidad\\Archivo General OFRN\\ORQUESTA";

export const OBRA_ID = 3906;
export const COMPOSITOR_ID = 273;

export const WORK_TITLE = "Come, ye sons of art";
export const WORK_NUMBER = "Z.323";
export const COMPOSER_TAG = "Purcell, H";

export const TARGET_FOLDER = "Purcell, H. - Come, ye sons of art, Z.323";

/** Movimientos de la ficha IMSLP, sin traducir. */
export const TITULO_HTML =
  "<p>Oda Come, ye sons of art, Z.323</p>" +
  "<div>&nbsp; I. Symphony</div>" +
  "<div>&nbsp; II. Come, ye sons of art</div>" +
  "<div>&nbsp; III. Sound the Trumpet</div>" +
  "<div>&nbsp; IV. Come, ye sons of art (reprise)</div>" +
  "<div>&nbsp; V. Strike the Viol</div>" +
  "<div>&nbsp; VI. The Day, that such a blessing</div>" +
  "<div>&nbsp; VII. Bid the virtues</div>" +
  "<div>&nbsp; VIII. These are the Sacred charms</div>" +
  "<div>&nbsp; IX. See Nature rejoicing</div>";

/**
 * Orgánico de la partitura (2 oboes, 2 trompetas, timbal, continuo, cuerdas, coro).
 * El trigger lo deja vacío si solo hay SCORE: el seed lo escribe después del INSERT.
 */
export const INSTRUMENTACION = "0.2.0.0 - 0.2.0.0 - Timp - Key - Str + Coro";

/** Croatian Baroque Ensemble, canal propio, Z.323 completo, 26:01. Zagreb, 2015. */
export const DURACION_SEGUNDOS = 26 * 60 + 1;
export const LINK_YOUTUBE = "https://www.youtube.com/watch?v=euKk6rMHVKg";
export const ANIO = 1694;

export const OBSERVACIONES =
  "Temporada 2027 P17 · Score completo, edición Calebe Barros (2021, CC BY-SA). IMSLP no tiene particellas de esta edición.";

export function partFilename(instrument) {
  return canonicalPartFilename(instrument, WORK_NUMBER, WORK_TITLE, COMPOSER_TAG);
}

export function driveFolderUrl(folderId) {
  return folderId ? `https://drive.google.com/open?id=${folderId}` : "";
}
