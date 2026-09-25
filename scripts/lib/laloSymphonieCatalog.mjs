/**
 * Lalo — Sinfonía española, Op. 21 (Para acomodar).
 * Score Eulenburg/Kalmus cat. 267 (#111388, 16853 descargas).
 * Partes Breitkopf placa Orch.B. 2836, reimpresión Kalmus (sin score de esa placa).
 * Violín solo Durand placa D.S. & Cie. 2051 (#239340, 41164 descargas), otra edición.
 * Los escaneos Kalmus/Sibley empiezan en música: no hay portada IMSLP que recortar.
 */
export const PARA_ACOMODAR_ROOT =
  process.env.PARA_ACOMODAR_ROOT ||
  "H:\\Mi unidad\\Archivo General OFRN\\Para acomodar";

export const PARA_ACOMODAR_FOLDER_ID = "10ap1aEjq3X9bFRB3z4DQ-F0fB7y3JutI";

export const LALO_SYMPHONIE_WORK = {
  sourceFolder: "Lalo, E. - Sinfonía española, Op. 21",
  targetFolder: "Lalo, E. - Sinfonía española, Op. 21",
  titulo: "Sinfonía española",
  workNumber: "op.21",
  composerTag: "Lalo, E",
  compositor: { apellido: "Lalo", nombre: "Édouard" },
  anio: 1874,
  driveFolderId:
    process.env.LALO_SYMPHONIE_DRIVE_FOLDER_ID ||
    "1ctPxdJcuRxwuO75GZgExyQUWHWa3fBM3",
  /**
   * Rangos por encabezado OCR (Tesseract, banda superior).
   * 1y2 = las dos partes en la misma hoja.
   */
  splits: [
    {
      pdf: "IMSLP43358-PMLP22520-Lalo-SymphEsp.Flute.pdf",
      parts: [
        { instrument: "Flauta 1y2", start: 1, end: 9 },
        { instrument: "Fl Piccolo", start: 10, end: 12 },
      ],
    },
    {
      pdf: "IMSLP43362-PMLP22520-Lalo-SymphEsp.Horn.pdf",
      parts: [
        { instrument: "Corno F 1y2", start: 1, end: 5 },
        { instrument: "Corno F 3y4", start: 6, end: 10 },
      ],
    },
    {
      pdf: "IMSLP43364-PMLP22520-Lalo-SymphEsp.Trombone.pdf",
      parts: [
        { instrument: "Trombón 1y2", start: 1, end: 4 },
        { instrument: "Trombón Bajo", start: 5, end: 8 },
      ],
    },
    {
      pdf: "IMSLP43365-PMLP22520-Lalo-SymphEsp.TimpPerc.pdf",
      parts: [
        { instrument: "Perc Timbal", start: 1, end: 7 },
        { instrument: "Perc Triángulo y Tambor", start: 8, end: 11 },
      ],
    },
    {
      pdf: "IMSLP43367-PMLP22520-Lalo-SymphEsp.Violin.pdf",
      parts: [
        { instrument: "Violín 1", start: 1, end: 11 },
        { instrument: "Violín 2", start: 12, end: 21 },
      ],
    },
  ],
  /** Un instrumento (o 1y2 en la misma hoja). Página 1 ya es música. */
  crops: [
    {
      pdf: "IMSLP111388-score.pdf",
      instrument: "SCORE",
      start: 1,
      end: 160,
    },
    {
      pdf: "IMSLP239340-SIBLEY1802.20687.5fe0-39087009423098violin.pdf",
      instrument: "Violín Solo",
      start: 1,
      end: 21,
    },
    {
      pdf: "IMSLP43359-PMLP22520-Lalo-SymphEsp.Oboe.pdf",
      instrument: "Oboe 1y2",
      start: 1,
      end: 8,
    },
    {
      pdf: "IMSLP43360-PMLP22520-Lalo-SymphEsp.Clarinet.pdf",
      instrument: "Clarinete Bb 1y2",
      start: 1,
      end: 9,
    },
    {
      pdf: "IMSLP43361-PMLP22520-Lalo-SymphEsp.Bassoon.pdf",
      instrument: "Fagot 1y2",
      start: 1,
      end: 8,
    },
    {
      pdf: "IMSLP43363-PMLP22520-Lalo-SymphEsp.Trumpet.pdf",
      instrument: "Trompeta D 1y2",
      start: 1,
      end: 4,
    },
    {
      pdf: "IMSLP43366-PMLP22520-Lalo-SymphEsp.Harp.pdf",
      instrument: "Arpa",
      start: 1,
      end: 4,
    },
    {
      pdf: "IMSLP43368-PMLP22520-Lalo-SymphEsp.Viola.pdf",
      instrument: "Viola",
      start: 1,
      end: 10,
    },
    {
      pdf: "IMSLP26566-PMLP22520-Lalo_-_Symphonie_Espagnole_in_D_minor_(cello-part)a.pdf",
      instrument: "Violoncello",
      start: 1,
      end: 10,
    },
    {
      pdf: "IMSLP43369-PMLP22520-Lalo-SymphEsp.Bass.pdf",
      instrument: "Contrabajo",
      start: 1,
      end: 9,
    },
  ],
};

export function driveFolderUrl(folderId) {
  return folderId ? `https://drive.google.com/open?id=${folderId}` : "";
}
