/**
 * Ramírez / Zigarán — Suite Mujeres Argentinas (Para acomodar).
 * PDFs ya separados (cuarteto de cuerdas + SCORE). Sin split/crop IMSLP.
 * Parent Drive: https://drive.google.com/drive/folders/12GOBbDTk0ScrqVy_0VT72a0e7x242GOO
 *
 * Partituras Sibelius (2022–2023): compositor Ariel Ramírez (+ Félix Luna, letra);
 * Duerme Negrito = canción tradicional de cuna; arreglo cuerdas: Juan Cruz Zigarán.
 */
export const PARA_ACOMODAR_ROOT =
  process.env.PARA_ACOMODAR_ROOT ||
  "H:\\Mi unidad\\Archivo General OFRN\\Para acomodar";

export const SUITE_PARENT_FOLDER =
  "Ramírez-Zigarán - Suite mujeres argentinas";

export const SUITE_PARENT_DRIVE_ID = "12GOBbDTk0ScrqVy_0VT72a0e7x242GOO";

export const SUITE_LABEL = "Suite Mujeres Argentinas";

export const LEMA_INTEGRANTE_ID = 4340365;

/** Compositor existente id 198. Arreglador de los encargos (no Zigarán). */
export const LEMA = { apellido: "Lema", nombre: "Germán" };

export const FECHA_ESPERADA_ARREGLO = "2026-09-16";

/** Compositor existente id 277. */
export const RAMIREZ = { apellido: "Ramírez", nombre: "Ariel" };

/** Ya en BD (id 756, sin tilde en apellido). */
export const ZIGARAN = { apellido: "Zigaran", nombre: "Juan Cruz" };

/** Compositor existente id 338. */
export const TRADICIONAL = { apellido: "Tradicional", nombre: null };

/** Tag de carpeta/PDF: compositor-arreglador (mismo patrón que Hancock-Lema). */
export const COMPOSER_TAG_RAMIREZ_ZIGARAN = "Ramírez-Zigarán";

export function driveFolderUrl(id) {
  return id ? `https://drive.google.com/drive/folders/${id}` : "";
}

export function tituloDb(songTitle) {
  return `${songTitle}. <i>${SUITE_LABEL}</i>`;
}

export function tituloPlain(songTitle) {
  return `${songTitle}. ${SUITE_LABEL}`;
}

export function targetFolderName(work) {
  return `${COMPOSER_TAG_RAMIREZ_ZIGARAN} - ${tituloPlain(work.songTitle)}`;
}

export function inferInstrumentFromFilename(fileName) {
  const n = String(fileName || "").replace(/\.pdf$/i, "");
  if (/^\s*SCORE\b|\bscore\b|partitura/i.test(n)) return "SCORE";
  if (/violoncell|violonchel|\bcello\b|\bvc\b/i.test(n)) return "Violoncello";
  if (/viol[ií]n\s*(?:2|II)\b/i.test(n)) return "Violín 2";
  if (/viol[ií]n\s*(?:1|I)\b/i.test(n)) return "Violín 1";
  if (/\bviola\b/i.test(n)) return "Viola";
  return null;
}

/**
 * Brief del encargo suite #3570 (no se borra; se replica en encargos por canción).
 */
export const ENCARGO_OBS_BASE =
  "Encargo de arreglo (Lema, 16/09/2026). Agregar voz de contrabajo respetando lo ya escrito en la versión Zigarán (cuarteto). Brief suite #3570.";

export const ENCARGO_OBS_ALFONSINA =
  `${ENCARGO_OBS_BASE} Además: transportar la voz de soprano a flauta en Sol, respetando lo escrito; si el cambio de tonalidad se complica, avisar.`;

/**
 * @typedef {{
 *   key: string,
 *   sourceFolder: string,
 *   songTitle: string,
 *   compositors: Array<{ apellido: string, nombre?: string|null }>,
 *   arranger: { apellido: string, nombre?: string|null },
 *   composerTag: string,
 *   driveFolderId: string,
 *   anio: number|null,
 *   duracion_segundos: number,
 *   hasSopranoInScore?: boolean,
 * }} RamirezZigaranWork
 */

/** @type {RamirezZigaranWork[]} */
export const RAMIREZ_ZIGARAN_WORKS = [
  {
    key: "alfonsina",
    sourceFolder: "Alfonsina y el Mar",
    songTitle: "Alfonsina y el Mar",
    compositors: [RAMIREZ],
    arranger: ZIGARAN,
    composerTag: COMPOSER_TAG_RAMIREZ_ZIGARAN,
    driveFolderId: "1e0ZrqwhwT2qlwkMlEcdQzvAOn_yBshDz",
    anio: 1969,
    duracion_segundos: 211,
    hasSopranoInScore: true,
  },
  {
    key: "dorotea",
    sourceFolder: "Dorotea, La Cautiva",
    songTitle: "Dorotea, La Cautiva",
    compositors: [RAMIREZ],
    arranger: ZIGARAN,
    composerTag: COMPOSER_TAG_RAMIREZ_ZIGARAN,
    driveFolderId: "12lhZCnpICbqOqVv5kuGo5CJXNM_JDCR6",
    anio: 1969,
    duracion_segundos: 168,
  },
  {
    key: "duerme",
    sourceFolder: "Duerme Negrito",
    songTitle: "Duerme Negrito",
    compositors: [TRADICIONAL],
    arranger: ZIGARAN,
    composerTag: COMPOSER_TAG_RAMIREZ_ZIGARAN,
    driveFolderId: "1qImL_dIXmbThziw-QWw8bJHSfVxz-atB",
    anio: null,
    duracion_segundos: 131,
    hasSopranoInScore: true,
  },
  {
    key: "mariquita",
    sourceFolder: "En Casa de Mariquita",
    songTitle: "En Casa de Mariquita",
    compositors: [RAMIREZ],
    arranger: ZIGARAN,
    composerTag: COMPOSER_TAG_RAMIREZ_ZIGARAN,
    driveFolderId: "1XM6yuBOXwIU_0eLIzKeGfBoekU2Lp8DF",
    anio: 1969,
    duracion_segundos: 153,
  },
  {
    key: "gringa",
    sourceFolder: "Gringa Chaqueña",
    songTitle: "Gringa Chaqueña",
    compositors: [RAMIREZ],
    arranger: ZIGARAN,
    composerTag: COMPOSER_TAG_RAMIREZ_ZIGARAN,
    driveFolderId: "1hnZY9gmJw8Ri_63ibU3ItDbujpMzuDvh",
    anio: 1969,
    duracion_segundos: 231,
  },
  {
    key: "juana",
    sourceFolder: "Juana Azurduy",
    songTitle: "Juana Azurduy",
    compositors: [RAMIREZ],
    arranger: ZIGARAN,
    composerTag: COMPOSER_TAG_RAMIREZ_ZIGARAN,
    driveFolderId: "1qvJzlTRqTcHQmFZ_7CdLBqwG9epCIqHR",
    anio: 1969,
    duracion_segundos: 164,
    hasSopranoInScore: true,
  },
  {
    key: "cartas",
    sourceFolder: "Las Cartas de Guadalupe",
    songTitle: "Las Cartas de Guadalupe",
    compositors: [RAMIREZ],
    arranger: ZIGARAN,
    composerTag: COMPOSER_TAG_RAMIREZ_ZIGARAN,
    driveFolderId: "1myGKg4Mj608LiDOxD5bHzO3OfeEZYc3c",
    anio: 1969,
    duracion_segundos: 164,
  },
  {
    key: "manuela",
    sourceFolder: "Manuela, La Tucumana",
    songTitle: "Manuela, La Tucumana",
    compositors: [RAMIREZ],
    arranger: ZIGARAN,
    composerTag: COMPOSER_TAG_RAMIREZ_ZIGARAN,
    driveFolderId: "1Yap07db3fPuFW32G_Kk439jRLJduHWep",
    anio: 1969,
    duracion_segundos: 159,
  },
  {
    key: "rosarito",
    sourceFolder: "Rosarito Vera, Maestra",
    songTitle: "Rosarito Vera, Maestra",
    compositors: [RAMIREZ],
    arranger: ZIGARAN,
    composerTag: COMPOSER_TAG_RAMIREZ_ZIGARAN,
    driveFolderId: "1WE4K1nJJzGKaTrfyEiMX_9zvkNNkKhre",
    anio: 1969,
    duracion_segundos: 220,
  },
];
