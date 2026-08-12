/**
 * Mozart — Dies Irae. Requiem, K. 626 (fragmento III. Sequenz / 1. Dies irae).
 * Drive: https://drive.google.com/drive/folders/1tRERQ7Sb-QFYGmBcmu51T04ZSBOkpJLG
 *
 * PDFs ya canónicos por instrumento (ed. Robbins Landon / Breitkopf).
 * Crops: desde encabezado «III. Sequenz / 1. Dies irae» hasta (no incl.) Tuba mirum.
 * Título de archivo: «Dies Irae. Requiem, K. 626» (Requiem sin tilde).
 */
export const PARA_ACOMODAR_ROOT =
  process.env.PARA_ACOMODAR_ROOT ||
  "H:\\Mi unidad\\Archivo General OFRN\\Para acomodar";

export const MOZART_DIES_IRAE_DRIVE_FOLDER =
  "https://drive.google.com/drive/folders/1tRERQ7Sb-QFYGmBcmu51T04ZSBOkpJLG";

export const MOZART_DIES_IRAE_WORK = {
  sourceFolder: "Mozart, W. - Dies Irae. Réquiem, K. 626",
  targetFolder: "Mozart, W. - Dies Irae. Requiem, K. 626",
  /** Título de archivo y carpeta (Requiem sin tilde). */
  titulo: "Dies Irae. Requiem, K. 626",
  /** Título BD: se actualiza quitando la tilde de Réquiem. */
  tituloDb: "<i>Dies Irae.</i> Requiem, K. 626",
  workNumber: "K. 626",
  /** El nº de catálogo va en el título; no usar «K. 626. Dies Irae…». */
  filenameWorkNumber: null,
  composerTag: "Mozart, W.A",
  compositor: { apellido: "Mozart", nombre: "Wolfgang Amadeus" },
  obraId: 3563,
  driveFolderId: "1tRERQ7Sb-QFYGmBcmu51T04ZSBOkpJLG",
  action: "update",
  anio: 1791,
  /** ~1:45–2:00 del movimiento (no el Réquiem entero). */
  duracionSegundos: 120,
  splits: [],
  /**
   * Rangos 1-based sobre el PDF original completo.
   * pdf se resuelve por prefijo de instrumento (antes del primer « - »).
   */
  crops: [
    { instrument: "Clarinete 1y2", start: 5, end: 6, origPages: 20 },
    { instrument: "Contrabajo", start: 4, end: 5, origPages: 18 },
    { instrument: "Coro", start: 15, end: 21, origPages: 83 },
    { instrument: "Fagot 1", start: 3, end: 3, origPages: 10 },
    { instrument: "Fagot 2", start: 3, end: 4, origPages: 10 },
    { instrument: "Perc Timbal", start: 1, end: 1, origPages: 3 },
    { instrument: "SCORE", start: 27, end: 41, origPages: 176 },
    { instrument: "Trombón 1", start: 3, end: 3, origPages: 14 },
    { instrument: "Trombón 2", start: 2, end: 2, origPages: 6 },
    { instrument: "Trombón 3", start: 2, end: 2, origPages: 6 },
    { instrument: "Trompeta 1", start: 1, end: 1, origPages: 3 },
    { instrument: "Trompeta 2", start: 1, end: 1, origPages: 3 },
    { instrument: "Viola", start: 3, end: 3, origPages: 14 },
    { instrument: "Violoncello", start: 4, end: 5, origPages: 17 },
    { instrument: "Violín 1", start: 4, end: 5, origPages: 18 },
    { instrument: "Violín 2", start: 6, end: 7, origPages: 20 },
    { instrument: "Órgano", start: 10, end: 12, origPages: 40 },
  ],
};
