/**
 * Falla — Danza Española Nro 1 ('La Vida Breve') desde Para acomodar.
 * Drive: https://drive.google.com/open?id=16TvE6QokADJSSk9gpZXpP1D8GcrngIQS
 */
export const PARA_ACOMODAR_ROOT =
  process.env.PARA_ACOMODAR_ROOT ||
  "H:\\Mi unidad\\Archivo General OFRN\\Para acomodar";

export const FALLA_DRIVE_FOLDER =
  "https://drive.google.com/open?id=16TvE6QokADJSSk9gpZXpP1D8GcrngIQS";

export const FALLA_WORK = {
  sourceFolder: "Falla",
  targetFolder: "Falla, M. - Danza Española Nro 1 ('La Vida Breve')",
  titulo: "Danza Española Nro 1 ('La Vida Breve')",
  tituloDb: "<p>Danza Española Nro 1. 'La Vida Breve'</p>",
  workNumber: null,
  composerTag: "Falla, M",
  compositor: { apellido: "Falla", nombre: "Manuel de" },
  /** Obra existente en BD (título HTML). El usuario indicó id 32; en prod es 3532. */
  obraId: 3532,
  driveFolderId: "16TvE6QokADJSSk9gpZXpP1D8GcrngIQS",
  action: "update",
  anio: 1905,
  /**
   * PDFs IMSLP combinados → particellas (sin portadas IMSLP).
   * Rangos verificados con OCR sobre escaneos PMLP04190.
   */
  splits: [
    {
      pdf: "IMSLP19675-PMLP04190-Falla_VidaDance_Fls.pdf",
      parts: [
        { instrument: "Flauta 1", start: 2, end: 4 },
        { instrument: "Flauta 2", start: 5, end: 6 },
        { instrument: "Fl Piccolo", start: 7, end: 11 },
      ],
    },
    {
      pdf: "IMSLP19676-PMLP04190-Falla_VidaDance_Obs.pdf",
      parts: [
        { instrument: "Oboe 1", start: 2, end: 3 },
        { instrument: "Oboe 2", start: 4, end: 5 },
        { instrument: "Ob EH", start: 7, end: 10 },
      ],
    },
    {
      pdf: "IMSLP19677-PMLP04190-Falla_VidaDance_Cls.pdf",
      parts: [
        { instrument: "Clarinete A 1", start: 2, end: 3 },
        { instrument: "Clarinete A 2", start: 4, end: 6 },
        { instrument: "Clarinete Bajo", start: 8, end: 10 },
      ],
    },
    {
      pdf: "IMSLP19678-PMLP04190-Falla_VidaDance_Bsns.pdf",
      parts: [{ instrument: "Fagot 1y2", start: 2, end: 5 }],
    },
    {
      pdf: "IMSLP19679-PMLP04190-Falla_VidaDance_Hns.pdf",
      parts: [
        { instrument: "Corno F 1y2", start: 2, end: 5 },
        { instrument: "Corno F 3y4", start: 7, end: 11 },
      ],
    },
    {
      pdf: "IMSLP19680-PMLP04190-Falla_VidaDance_Tpts.pdf",
      parts: [{ instrument: "Trompeta 1y2", start: 2, end: 6 }],
    },
    {
      pdf: "IMSLP19681-PMLP04190-Falla_VidaDance_LowBrs.pdf",
      parts: [
        { instrument: "Trombón 1y2y3", start: 2, end: 6 },
        { instrument: "Tuba", start: 8, end: 9 },
      ],
    },
    {
      pdf: "IMSLP55836-PMLP04190-Falla-VidaBrvDnz1.TimpPerc.pdf",
      parts: [
        { instrument: "Perc Timbal", start: 2, end: 4 },
        { instrument: "Perc Glockenspiel", start: 6, end: 6 },
        { instrument: "Perc Percusión", start: 8, end: 11 },
      ],
    },
  ],
  /** PDFs ya por instrumento: solo quitar portada IMSLP. */
  crops: [
    {
      pdf: "IMSLP55837-PMLP04190-Falla-VidaBrvDnz1.Harp.pdf",
      instrument: "Arpa",
      start: 2,
      end: 11,
    },
    {
      pdf: "IMSLP55838-PMLP04190-Falla-VidaBrvDnz1.Celesta.pdf",
      instrument: "Celesta",
      start: 2,
      end: 2,
    },
    {
      pdf: "IMSLP55839-PMLP04190-Falla-VidaBrvDnz1.Violin1.pdf",
      instrument: "Violín 1",
      start: 2,
      end: 4,
    },
    {
      pdf: "IMSLP55840-PMLP04190-Falla-VidaBrvDnz1.Violin2.pdf",
      instrument: "Violín 2",
      start: 2,
      end: 4,
    },
    {
      pdf: "IMSLP55841-PMLP04190-Falla-VidaBrvDnz1.Viola.pdf",
      instrument: "Viola",
      start: 2,
      end: 5,
    },
    {
      pdf: "IMSLP55842-PMLP04190-Falla-VidaBrvDnz1.Bass.pdf",
      instrument: "Contrabajo",
      start: 2,
      end: 4,
    },
    {
      pdf: "IMSLP27895-PMLP04190-Falla_La_Vida_Breve,_Dance_cello.pdf",
      instrument: "Violoncello",
      start: 2,
      end: 5,
    },
    {
      pdf: "IMSLP88784-PMLP04190-Lavidabreve.pdf",
      instrument: "SCORE",
      start: 2,
      end: 37,
    },
  ],
};
