/**
 * Massenet — Méditation de Thaïs.
 * Drive: https://drive.google.com/open?id=11dToRcA16WjUXoyGZBOOXRsIkhdh6kSC
 * PDFs ya con nombres canónicos (sin split/crop).
 */
export const PARA_ACOMODAR_ROOT =
  process.env.PARA_ACOMODAR_ROOT ||
  "H:\\Mi unidad\\Archivo General OFRN\\Para acomodar";

export const MASSENET_MEDITATION_DRIVE_FOLDER =
  "https://drive.google.com/open?id=11dToRcA16WjUXoyGZBOOXRsIkhdh6kSC";

export const MASSENET_MEDITATION_WORK = {
  sourceFolder: "Massenet, J. - Méditation de Thaïs",
  targetFolder: "Massenet, J. - Méditation de Thaïs",
  titulo: "Méditation de Thaïs",
  workNumber: null,
  composerTag: "Massenet, J",
  compositor: { apellido: "Massenet", nombre: "Jules" },
  /** Obra insertada en BD (2026-08-03). */
  obraId: 3559,
  action: "insert",
  driveFolderId: "11dToRcA16WjUXoyGZBOOXRsIkhdh6kSC",
  /** Estreno Thaïs (ópera), 1894. */
  anio: 1894,
  splits: [],
  crops: [],
};
