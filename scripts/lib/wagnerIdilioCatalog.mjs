/**
 * Wagner — Idilio de Sigfrido, WWV 103 (obra 3913, temporada 2027 P12).
 * Breitkopf Orch.-B. 4945 / Kalmus (IMSLP #66079 score + #64776–#64786 partes).
 * Clarinete y Corno: PDF combinado 1+2 (split 1y2).
 */
export const PARA_ACOMODAR_ROOT =
  process.env.PARA_ACOMODAR_ROOT ||
  "H:\\Mi unidad\\Archivo General OFRN\\Para acomodar";

export const PARA_ACOMODAR_FOLDER_ID = "10ap1aEjq3X9bFRB3z4DQ-F0fB7y3JutI";

export function driveFolderUrl(id) {
  return id ? `https://drive.google.com/open?id=${id}` : "";
}

export const WAGNER_IDILIO_WORK = {
  obraId: 3913,
  targetFolder: "Wagner, R. - Idilio de Sigfrido, WWV 103",
  titulo: "<p>Idilio de Sigfrido, WWV 103</p>",
  workTitleShort: "Idilio de Sigfrido",
  workNumber: "WWV 103",
  composerTag: "Wagner, R",
  compositor: { apellido: "Wagner", nombre: "Richard" },
  anio: 1870,
  duracion_segundos: 1080,
  imslp: "https://imslp.org/wiki/Siegfried-Idyll,_WWV_103_(Wagner,_Richard)",
  driveFolderId: null,
  splits: [
    {
      pdf: "IMSLP64778-Clarinet.pdf",
      parts: [
        { instrument: "Clarinete Bb 1", start: 1, end: 2 },
        { instrument: "Clarinete Bb 2", start: 3, end: 4 },
      ],
    },
    {
      pdf: "IMSLP64780-Horn.pdf",
      parts: [
        { instrument: "Corno F 1", start: 1, end: 2 },
        { instrument: "Corno F 2", start: 3, end: 4 },
      ],
    },
  ],
  wholes: [
    { pdf: "IMSLP66079-SCORE.pdf", instrument: "SCORE" },
    { pdf: "IMSLP64776-Flute.pdf", instrument: "Flauta" },
    { pdf: "IMSLP64777-Oboe.pdf", instrument: "Oboe" },
    { pdf: "IMSLP64779-Bassoon.pdf", instrument: "Fagot" },
    { pdf: "IMSLP64781-Trumpet.pdf", instrument: "Trompeta C" },
    { pdf: "IMSLP64782-Violin1.pdf", instrument: "Violín 1" },
    { pdf: "IMSLP64783-Violin2.pdf", instrument: "Violín 2" },
    { pdf: "IMSLP64784-Viola.pdf", instrument: "Viola" },
    { pdf: "IMSLP64785-Cello.pdf", instrument: "Violoncello" },
    { pdf: "IMSLP64786-Bass.pdf", instrument: "Contrabajo" },
  ],
};
