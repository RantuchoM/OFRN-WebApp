/**
 * Spatocco, P. — Arreglos para OFRN (tango).
 * Origen (arreglista): https://drive.google.com/drive/folders/1srUOi_8mV-l0jZrFUNne6qx2JzFmv2yJ
 * Staging local: Para acomodar (rename/split).
 * link_drive oficial: copia en Archivo OFRN (`copiar_carpeta_a_archivo` → ARCHIVO_OBRAS_FOLDER_ID).
 *
 * Tres arreglos orquestales de Popi Spatocco sobre obras de Astor Piazzolla.
 *
 * | Obra | id | Archivo folder id |
 * |------|----|-------------------|
 * | Chiquilín de Bachín | 3626 | 16SIQQGrWBA1romVpwwUqfAvxZfb6tAZJ |
 * | La Arenosa | 3627 | 1d62ohtPW8h9zGzKQw3w8A4nAbNXmwm4l |
 * | Sus ojos se cerraron | 3628 | 1foFCLsF2kHKAH2okWQ0mFt4qjE7b7dZE |
 *
 * NOTA sobre PDFs: no son IMSLP. Los PDFs ya arrancan con música en p.1, así que
 * no se detectaron portadas separables en esta sesión. Solo "Glockenspiel, Drum Set"
 * (Chiquilín) se duplica a dos salidas nominales para asociar ambas particellas.
 */

export const PARA_ACOMODAR_ROOT =
  process.env.PARA_ACOMODAR_ROOT ||
  "H:\\Mi unidad\\Archivo General OFRN\\Para acomodar";

/** Carpeta raíz de los arreglos Spatocco en Drive (origen arreglista). */
export const SPATOCCO_DRIVE_ROOT_ID = "1srUOi_8mV-l0jZrFUNne6qx2JzFmv2yJ";

// ---------------------------------------------------------------------------
// 1. Chiquilín de Bachín
// ---------------------------------------------------------------------------
export const CHIQUILIN_WORK = {
  sourceFolder: "Chiquilin de Bachín",
  targetFolder: "Piazzolla, A. - Chiquilín de Bachín (arr. Spatocco)",
  titulo: "Chiquilín de Bachín",
  workNumber: null,
  composerTag: "Piazzolla, A",
  compositor: { apellido: "Piazzolla", nombre: "Astor" },
  arreglador: { apellido: "Spatocco", nombre: "Popi" },
  obraId: 3626,
  /** Carpeta origen Spatocco (pre-Archivo). */
  sourceDriveFolderId: "1Oj7_9zqhsD21WIU96cHEw9vfHpMZVo01",
  /** Carpeta en Archivo OFRN — `link_drive` / particellas. */
  driveFolderId: "16SIQQGrWBA1romVpwwUqfAvxZfb6tAZJ",
  splits: [
    {
      pdf: "Chiquilin de Bachin - Glockenspiel, Drum Set.pdf",
      parts: [
        { instrument: "Perc Glockenspiel", start: 1, end: 2 },
        { instrument: "Perc Batería", start: 1, end: 2 },
      ],
    },
  ],
  crops: [],
};

// ---------------------------------------------------------------------------
// 2. La Arenosa
// ---------------------------------------------------------------------------
export const LA_ARENOSA_WORK = {
  sourceFolder: "La Arenosa",
  targetFolder: "Piazzolla, A. - La Arenosa (arr. Spatocco)",
  titulo: "La Arenosa",
  workNumber: null,
  composerTag: "Piazzolla, A",
  compositor: { apellido: "Piazzolla", nombre: "Astor" },
  arreglador: { apellido: "Spatocco", nombre: "Popi" },
  obraId: 3627,
  sourceDriveFolderId: "1FZShxSuESaGGLk9b8vWuU6X42rgWo8yy",
  driveFolderId: "1d62ohtPW8h9zGzKQw3w8A4nAbNXmwm4l",
  splits: [],
  crops: [],
};

// ---------------------------------------------------------------------------
// 3. Sus ojos se cerraron
// ---------------------------------------------------------------------------
export const SUS_OJOS_WORK = {
  sourceFolder: "Sus ojos se cerraron",
  targetFolder: "Piazzolla, A. - Sus ojos se cerraron (arr. Spatocco)",
  titulo: "Sus ojos se cerraron",
  workNumber: null,
  composerTag: "Piazzolla, A",
  compositor: { apellido: "Piazzolla", nombre: "Astor" },
  arreglador: { apellido: "Spatocco", nombre: "Popi" },
  obraId: 3628,
  sourceDriveFolderId: "1M7e2g1rNSdQYD0K__BQE--8rDmz_eIcD",
  driveFolderId: "1foFCLsF2kHKAH2okWQ0mFt4qjE7b7dZE",
  splits: [],
  crops: [],
};

export const ALL_SPATOCCO_WORKS = [CHIQUILIN_WORK, LA_ARENOSA_WORK, SUS_OJOS_WORK];
