/**
 * Silva — Marcha de San Lorenzo [cuerdas] (Silva/Benielli, orq. cuerdas).
 * Drive: carpeta en Para acomodar (sync local).
 */
export const PARA_ACOMODAR_ROOT =
  process.env.PARA_ACOMODAR_ROOT ||
  "H:\\Mi unidad\\Archivo General OFRN\\Para acomodar";

export const PARA_ACOMODAR_DRIVE_ROOT =
  "https://drive.google.com/open?id=10ap1aEjq3X9bFRB3z4DQ-F0fB7y3JutI";

export const SAN_LORENZO_CUERDAS_WORK = {
  sourceFolder: "Marcha San Lorenzo (cuerdas)",
  targetFolder: "Silva, C.A. - Marcha de San Lorenzo [cuerdas]",
  titulo: "Marcha de San Lorenzo [cuerdas]",
  workNumber: null,
  composerTag: "Silva, C.A",
  compositor: { apellido: "Silva", nombre: "Cayetano Alberto" },
  /** Obra insertada en BD (2026-06-22). Distinta de id 2276 (vientos). */
  obraId: 3537,
  action: "insert",
  driveFolderId: "1jBCHMNcerv3K9aoq17q9V_ekoCxhFAry",
  anio: 1901,
  splits: [
    {
      pdf: "Compartir Marcha San Lorenzo (cuerdas).pdf",
      parts: [
        { instrument: "SCORE", start: 3, end: 5 },
        { instrument: "Violín 1", start: 7, end: 8 },
        { instrument: "Violín 2", start: 9, end: 10 },
        { instrument: "Viola", start: 11, end: 12 },
        { instrument: "Violoncello", start: 13, end: 14 },
      ],
    },
  ],
  crops: [],
};
