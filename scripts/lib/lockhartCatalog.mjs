/**
 * Beatriz Lockhart — Montevideana Nro. 1 + Homenaje a Astor Piazzolla
 * desde Para acomodar (sin split IMSLP; merge de movimientos en Piazzolla).
 */
export const PARA_ACOMODAR_ROOT =
  process.env.PARA_ACOMODAR_ROOT ||
  "H:\\Mi unidad\\Archivo General OFRN\\Para acomodar";

export const PARA_ACOMODAR_DRIVE_ROOT =
  "https://drive.google.com/open?id=10ap1aEjq3X9bFRB3z4DQ-F0fB7y3JutI";

export const LOCKHART = { apellido: "Lockhart", nombre: "Beatriz" };
export const COMPOSER_TAG = "Lockhart, B";

/** Montevideana Nro. 1 — partes ya separadas + SCORE + Bandoneón extra. */
export const MONTEVIDEANA_WORK = {
  sourceFolder: "Montevideana",
  targetFolder: "Lockhart, B. - Montevideana Nro. 1",
  titulo: "Montevideana Nro. 1",
  tituloDb: "<p>Montevideana Nro. 1</p>",
  workNumber: null,
  composerTag: COMPOSER_TAG,
  compositor: LOCKHART,
  /** Insertada 2026-08-31. */
  obraId: 3623,
  driveFolderId: "1BUABC_jXBeDL-G7Z-IU4twxqEFY-icOi",
  action: "insert",
  anio: null,
  splits: [],
  crops: [],
  merges: [],
};

/**
 * Tres tangos (1994): Sureño / El Emigrante / Adiós Maestro.
 * Unificar SCORE, Piano y Bandoneón (un PDF por instrumento con los 3 movs).
 * Cuerdas ya vienen unificadas.
 */
export const HOMENAJE_PIAZZOLLA_WORK = {
  sourceFolder: "Homenaje a Piazzolla",
  targetFolder: "Lockhart, B. - Homenaje a Astor Piazzolla",
  titulo: "Homenaje a Astor Piazzolla",
  tituloDb:
    "<p>Homenaje a Astor Piazzolla</p><div>&nbsp; I. Sureño</div><div>&nbsp; II. El Emigrante</div><div>&nbsp; III. Adiós Maestro</div>",
  workNumber: null,
  composerTag: COMPOSER_TAG,
  compositor: LOCKHART,
  /** Insertada 2026-08-31. */
  obraId: 3624,
  driveFolderId: "1swxlkCS4aYRbyshXQQrYqmldHdheL2Kj",
  action: "insert",
  anio: 1994,
  splits: [],
  crops: [],
  /** Concatenar PDFs en orden de movimiento → un archivo con etiqueta de instrumento. */
  merges: [
    {
      instrument: "SCORE",
      pdfs: [
        "Homenaje ASTOR PIAZZOLA  I.pdf",
        "Homenaje  A PIAZZOLA II-.pdf",
        "A PIAZZOLA  homenaje III.pdf",
      ],
    },
    {
      instrument: "Piano",
      pdfs: ["Piano 1.pdf", "Piano 2.pdf", "Piano 3.pdf"],
    },
    {
      instrument: "Bandoneón",
      pdfs: ["Band 1.pdf", "Band 2.pdf", "Band 3.pdf"],
    },
  ],
};

export const LOCKHART_WORKS = [MONTEVIDEANA_WORK, HOMENAJE_PIAZZOLLA_WORK];
