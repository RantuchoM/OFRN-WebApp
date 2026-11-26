/**
 * Rodrigo — Concierto de Aranjuez. Alquiler Schott / Barry Editorial.
 * No está en un programa: solo archivo. Sin número de catálogo.
 * Cuerdas: la copia con márgenes recortados (no «Cuerda sin recortar»).
 */
import { canonicalPartFilename } from "./pdfPartsRenaming.mjs";

export const PARA_ACOMODAR_ROOT =
  process.env.PARA_ACOMODAR_ROOT ||
  "H:\\Mi unidad\\Archivo General OFRN\\Para acomodar";

export const PARA_ACOMODAR_FOLDER_ID = "10ap1aEjq3X9bFRB3z4DQ-F0fB7y3JutI";

export const ORQUESTA_ROOT = "H:\\Mi unidad\\Archivo General OFRN\\ORQUESTA";

export const SOURCE_DIR =
  "c:\\Proyectos\\OFRN-WebApp\\.tmp_schott\\Alquiler Schott Music";

export const COMPOSITOR_ID = 869;
export const WORK_TITLE = "Concierto de Aranjuez";
export const COMPOSER_TAG = "Rodrigo, J";
export const TARGET_FOLDER = "Rodrigo, J. - Concierto de Aranjuez";

export const TITULO_HTML =
  "<p>Concierto de Aranjuez</p>" +
  "<div>&nbsp; I. Allegro con spirito</div>" +
  "<div>&nbsp; II. Adagio</div>" +
  "<div>&nbsp; III. Allegro gentile</div>";

export const ANIO = 1939;

/** John Williams, Philharmonia, Louis Frémaux, Sony 1984: 6:06 + 10:26 + 5:05. */
export const DURACION_SEGUNDOS = 6 * 60 + 6 + 10 * 60 + 26 + 5 * 60 + 5;

/** John Williams y Daniel Barenboim, Waldbühne 1998, concierto completo. */
export const LINK_YOUTUBE = "https://www.youtube.com/watch?v=Zy8QKwTeMGo";

/**
 * Orgánico real (la reducción de piano no cuenta).
 * Flauta 2 dobla piccolo; Oboe 2 dobla corno inglés.
 */
export const INSTRUMENTACION = "Gtr - 2(Picc).2(E.H.).2.2 - 2.2.0.0 - Str";

export const OBSERVACIONES =
  "Alquiler Schott / Barry Editorial. No programada. Cuerdas con márgenes recortados (no se archivó «Cuerda sin recortar»). Reducción de piano incluida, fuera del orgánico.";

/** Archivo de origen → instrumento canónico. */
export const PARTS = [
  { file: "00-Aranjuez.Score.pdf", instrument: "SCORE" },
  { file: "01-Aranjuez.Flauta1.pdf", instrument: "Flauta 1" },
  { file: "02-Aranjuez.Flauta2-Picc.pdf", instrument: "Flauta 2", nota: "Picc" },
  { file: "03-Aranjuez.Oboe1.pdf", instrument: "Oboe 1" },
  { file: "04-Aranjuez.Oboe2-Eh.pdf", instrument: "Oboe 2", nota: "E.H." },
  { file: "05-Aranjuez.Clarinete1.pdf", instrument: "Clarinete 1" },
  { file: "06-Aranjuez.Clarinete2.pdf", instrument: "Clarinete 2" },
  { file: "07-Aranjuez.Fagot1.pdf", instrument: "Fagot 1" },
  { file: "08-Aranjuez.Fagot2.pdf", instrument: "Fagot 2" },
  { file: "09-Aranjuez.Corno1.pdf", instrument: "Corno 1" },
  { file: "10-Aranjuez.Corno2.pdf", instrument: "Corno 2" },
  { file: "11-Aranjuez.Trompeta1.pdf", instrument: "Trompeta 1" },
  { file: "12-Aranjuez.Trompeta2.pdf", instrument: "Trompeta 2" },
  { file: "13-Aranjuez.Violín1.pdf", instrument: "Violín 1" },
  { file: "14-Aranjuez.Violín2.pdf", instrument: "Violín 2" },
  { file: "15-Aranjuez.Viola.pdf", instrument: "Viola" },
  { file: "16-Aranjuez.Cello.pdf", instrument: "Violoncello" },
  { file: "17-Aranjuez.Bass.pdf", instrument: "Contrabajo" },
  { file: "Guitarra solista.pdf", instrument: "Guitarra", solista: true },
  { file: "Aranjuez.Piano reducción.pdf", instrument: "Piano" },
];

export function partFilename(instrument) {
  return canonicalPartFilename(instrument, null, WORK_TITLE, COMPOSER_TAG);
}

export function driveFolderUrl(folderId) {
  return folderId ? `https://drive.google.com/open?id=${folderId}` : "";
}
