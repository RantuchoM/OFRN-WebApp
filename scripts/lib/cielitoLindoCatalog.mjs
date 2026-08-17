/**
 * Mendoza y Cortés — Payán — Cielito Lindo ('Orquesta y Voz')
 * Para acomodar: https://drive.google.com/open?id=1a0uX_4JhNVCMUkwCE8W7ypgMtogHmY1f
 *
 * Obra distinta de #3491 (ARIAS, solo orquesta, tag Medoza y Cortés, Q).
 */
export const PARA_ACOMODAR_ROOT =
  process.env.PARA_ACOMODAR_ROOT ||
  "H:\\Mi unidad\\Archivo General OFRN\\Para acomodar";

export const PARA_ACOMODAR_FOLDER_ID = "10ap1aEjq3X9bFRB3z4DQ-F0fB7y3JutI";

export const COMPOSER_TAG = "Mendoza y Cortés-Payán";

export const CIELITO_LINDO_WORK = {
  key: "cielito-lindo-orquesta-voz",
  sourceFolder: "Mendoza y Cortés-Payán - Cielito Lindo [Orquesta y Voz]",
  targetFolder: "Mendoza y Cortés-Payán - Cielito Lindo ('Orquesta y Voz')",
  titulo: "Cielito Lindo ('Orquesta y Voz')",
  workNumber: null,
  composerTag: COMPOSER_TAG,
  compositor: { apellido: "Mendoza y Cortés", nombre: "Quirino" },
  arranger: { apellido: "Payán", nombre: "Oliverio" },
  action: "insert",
  driveFolderId: "1a0uX_4JhNVCMUkwCE8W7ypgMtogHmY1f",
  anio: 1882,
  solistaInstruments: ["Voz"],
  observaciones:
    "Para acomodar — Mendoza y Cortés-Payán - Cielito Lindo ('Orquesta y Voz'). Arr. Oliverio Payán. Voz tenor solista.",
  splits: [
    {
      pdf: "Cielito Lindo Set of Parts.pdf",
      parts: [
        { instrument: "Flauta", start: 1, end: 2 },
        { instrument: "Oboe", start: 3, end: 4 },
        { instrument: "Clarinete Bb", start: 5, end: 6 },
        { instrument: "Fagot", start: 7, end: 9 },
        { instrument: "Corno F", start: 10, end: 11 },
        { instrument: "Trompeta", start: 12, end: 13 },
        { instrument: "Perc Percusión", start: 14, end: 14 },
        { instrument: "Perc Tambor", start: 15, end: 15 },
        { instrument: "Arpa", start: 16, end: 18 },
        { instrument: "Perc Triángulo", start: 19, end: 19 },
        { instrument: "Voz", start: 20, end: 21 },
        { instrument: "Violín 1", start: 22, end: 24 },
        { instrument: "Violín 2", start: 25, end: 27 },
        { instrument: "Viola", start: 28, end: 30 },
        { instrument: "Violoncello", start: 31, end: 32 },
        { instrument: "Perc Timbal", start: 33, end: 34 },
        { instrument: "Contrabajo", start: 35, end: 37 },
      ],
    },
  ],
  crops: [
    {
      pdf: "Score Cielito Lindo.pdf",
      instrument: "SCORE",
      start: 2,
      end: 27,
    },
  ],
};

export function driveFolderUrl(id) {
  if (!id) return "";
  return `https://drive.google.com/open?id=${id}`;
}
