/**
 * Ponce — Chapultepec (edición typeset Pablo Borzone, IMSLP PMLP1044388).
 * https://imslp.org/wiki/Chapultepec_(Ponce,_Manuel)
 * Domino público en CA/EU (life+70); WorkNonPD-US. Servido por IMSLP-EU.
 */
export const PARA_ACOMODAR_ROOT =
  process.env.PARA_ACOMODAR_ROOT ||
  "H:\\Mi unidad\\Archivo General OFRN\\Para acomodar";

export const PARA_ACOMODAR_FOLDER_ID = "10ap1aEjq3X9bFRB3z4DQ-F0fB7y3JutI";

export function driveFolderUrl(id) {
  return `https://drive.google.com/open?id=${id}`;
}

export const PONCE_CHAPULTEPEC_WORK = {
  sourceFolder: "Ponce, M. - Chapultepec",
  targetFolder: "Ponce, M. - Chapultepec",
  /** Título de programa (HTML) desde movimientos de la partitura Borzone. */
  titulo:
    "<p>Chapultepec</p><div>&nbsp; I. Primavera</div><div>&nbsp; II. Nocturno</div><div>&nbsp; III. Canto y Danza</div>",
  /** Nombre corto para PDFs / carpeta. */
  workTitleShort: "Chapultepec",
  workNumber: null,
  composerTag: "Ponce, M",
  compositor: { apellido: "Ponce", nombre: "Manuel María" },
  anio: 1934,
  /** IMSLP Avg. Duration 17 minutes. */
  duracion_segundos: 1020,
  imslp: "https://imslp.org/wiki/Chapultepec_(Ponce,_Manuel)",
  driveFolderId:
    process.env.PONCE_CHAPULTEPEC_DRIVE_FOLDER_ID ||
    "1nAXirz9B8gcIe49xJ0xAzSBJKfxpEPd7",
  /** Gira 201 — Apertura de temporada: Mahler y Wagner, bloque Repertorio. */
  giraId: 201,
  repertorioId: 170,
  ordenEnGira: 3,
  splits: [
    {
      pdf: "IMSLP651128-Flauta_I-II_Piccolo.pdf",
      parts: [
        { instrument: "Flauta 1", start: 1, end: 6 },
        { instrument: "Flauta 2", start: 7, end: 11 },
        { instrument: "Fl Piccolo", start: 12, end: 14 },
      ],
    },
    {
      pdf: "IMSLP651129-Oboe_I-II.pdf",
      parts: [
        { instrument: "Oboe 1", start: 2, end: 8 },
        { instrument: "Oboe 2", start: 9, end: 13 },
      ],
    },
    {
      pdf: "IMSLP651130-Clarinete_Sib_I-II_ClBajo.pdf",
      parts: [
        { instrument: "Clarinete Bb 1", start: 1, end: 7 },
        { instrument: "Clarinete Bb 2", start: 8, end: 12 },
        { instrument: "Clarinete Bajo", start: 13, end: 14 },
      ],
    },
    {
      pdf: "IMSLP651131-Fagot_I-II.pdf",
      parts: [
        { instrument: "Fagot 1", start: 1, end: 5 },
        { instrument: "Fagot 2", start: 6, end: 10 },
      ],
    },
    {
      pdf: "IMSLP651132-Corno_Fa_I-IV.pdf",
      parts: [
        { instrument: "Corno F 1", start: 1, end: 5 },
        { instrument: "Corno F 2", start: 6, end: 10 },
        { instrument: "Corno F 3", start: 11, end: 15 },
        { instrument: "Corno F 4", start: 16, end: 19 },
      ],
    },
    {
      pdf: "IMSLP651133-Trompeta_Do_I-III.pdf",
      parts: [
        { instrument: "Trompeta C 1", start: 1, end: 3 },
        { instrument: "Trompeta C 2", start: 4, end: 6 },
        { instrument: "Trompeta C 3", start: 7, end: 8 },
      ],
    },
    {
      pdf: "IMSLP651134-Trombon_I-III_Tuba.pdf",
      parts: [
        { instrument: "Trombón 1", start: 1, end: 3 },
        { instrument: "Trombón 2", start: 4, end: 6 },
        { instrument: "Trombón 3", start: 7, end: 9 },
        { instrument: "Tuba", start: 10, end: 12 },
      ],
    },
  ],
  crops: [
    {
      pdf: "IMSLP651143-Partitura.pdf",
      instrument: "SCORE",
      start: 1,
      end: 91,
    },
    {
      pdf: "IMSLP651135-Timbales.pdf",
      instrument: "Perc Timbal",
      start: 2,
      end: 5,
    },
    {
      pdf: "IMSLP651136-Percusion.pdf",
      instrument: "Perc Percusión",
      start: 1,
      end: 8,
    },
    {
      pdf: "IMSLP651137-Celesta.pdf",
      instrument: "Celesta",
      start: 1,
      end: 2,
    },
    {
      pdf: "IMSLP651138-Violin_I.pdf",
      instrument: "Violín 1",
      start: 1,
      end: 10,
    },
    {
      pdf: "IMSLP651139-Violin_II.pdf",
      instrument: "Violín 2",
      start: 2,
      end: 10,
    },
    {
      pdf: "IMSLP651140-Viola.pdf",
      instrument: "Viola",
      start: 2,
      end: 10,
    },
    {
      pdf: "IMSLP651141-Violonchelo.pdf",
      instrument: "Violoncello",
      start: 1,
      end: 9,
    },
    {
      pdf: "IMSLP651142-Contrabajo.pdf",
      instrument: "Contrabajo",
      start: 1,
      end: 6,
    },
  ],
};
