/**
 * Shostakovich — Sinfonía de cámara, Op. 110a (arreglo Barshai del cuarteto n.º 8).
 * Obra ya cargada: 3894. Un PDF por cuerda + SCORE. Sin portada que recortar.
 */
import { canonicalPartFilename } from "./pdfPartsRenaming.mjs";

export const PARA_ACOMODAR_ROOT =
  process.env.PARA_ACOMODAR_ROOT ||
  "H:\\Mi unidad\\Archivo General OFRN\\Para acomodar";

export const PARA_ACOMODAR_FOLDER_ID = "10ap1aEjq3X9bFRB3z4DQ-F0fB7y3JutI";

export const CUERDAS_ROOT = "H:\\Mi unidad\\Archivo General OFRN\\CUERDAS";

export const OBRA_ID = 3894;
export const COMPOSITOR_ID = 307;
export const ARREGLADOR_ID = 891;

export const WORK_TITLE = "Sinfonía de cámara";
export const WORK_NUMBER = "op.110a";
export const COMPOSER_TAG = "Shostakovich, D";

export const TARGET_FOLDER = "Shostakovich, D. - Sinfonía de cámara, Op. 110a";

/** Título de programa. Movimientos del cuarteto n.º 8 / op. 110a. */
export const TITULO_HTML =
  "<p>Sinfonía de cámara en do menor, Op. 110a</p>" +
  "<div>&nbsp; I. Largo</div>" +
  "<div>&nbsp; II. Allegro molto</div>" +
  "<div>&nbsp; III. Allegretto</div>" +
  "<div>&nbsp; IV. Largo</div>" +
  "<div>&nbsp; V. Largo</div>";

/** Norwegian Chamber Orchestra, Terje Tønnesen. Video oficial, obra completa, 24:17. */
export const DURACION_SEGUNDOS = 24 * 60 + 17;
export const LINK_YOUTUBE = "https://www.youtube.com/watch?v=KFb81Ug_I70";
export const ANIO = 1960;

export function partFilename(instrument) {
  return canonicalPartFilename(instrument, WORK_NUMBER, WORK_TITLE, COMPOSER_TAG);
}

/** Nombre de origen (adjunto) → instrumento canónico. */
export const SOURCE_PARTS = [
  { match: /Viol_n_1/i, instrument: "Violín 1" },
  { match: /Viol_n_2/i, instrument: "Violín 2" },
  { match: /Violas_/i, instrument: "Viola" },
  { match: /Violoncello/i, instrument: "Violoncello" },
  { match: /Contrabajos/i, instrument: "Contrabajo" },
  { match: /Shostakovich\.pdf$/i, instrument: "SCORE" },
];

export function driveFolderUrl(folderId) {
  return folderId ? `https://drive.google.com/open?id=${folderId}` : "";
}
