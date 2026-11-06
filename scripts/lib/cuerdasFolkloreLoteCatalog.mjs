/**
 * Lote CUERDAS — folklore en cuarteto / cuerdas (zip partiturasparasubiralarchivo).
 * Destino: Archivo General OFRN\CUERDAS (no Para acomodar).
 *
 * Abuelita Lorenza: compositor Edmundo Nicolás "Pimpe" González (Catamarca).
 * Arreglador: Chazarreta, L. (id 698). Carpeta y PDF: `González, E.`.
 * Pastorcita de Antinaco: compositor Tradicional (id 338), arreglador Chazarreta, L.
 * Una persona no puede tener dos roles en la misma obra (`obras_compositores` es único por persona).
 * La Nochera: música Ernesto Cabezas, arr. Esteban D´Antona (id 75, apóstrofo U+00B4).
 * Poesía de Jaime Dávalos va en observaciones (no hay rol letrista).
 * Si Llega A Ser Tucumana [cuerdas] es otro arreglo de Germán Lema (obra distinta de 1432).
 * La 1432 conserva vibráfono, marimba y bajo en `Leguizamón-Lema - Si llega a ser tucumana`.
 */
export const CUERDAS_ROOT =
  process.env.CUERDAS_ROOT ||
  "H:\\Mi unidad\\Archivo General OFRN\\CUERDAS";

export const CUERDAS_ZIP =
  process.env.CUERDAS_FOLKLORE_ZIP ||
  "C:\\Users\\marti\\Downloads\\partiturasparasubiralarchivo.zip";

/** Carpeta ya existente (no renombrar). */
export const TUCUMANA_FOLDER = "Leguizamón-Lema - Si llega a ser tucumana";
export const TUCUMANA_CUERDAS_FOLDER =
  "Leguizamón-Lema - Si Llega A Ser Tucumana [cuerdas]";
export const TUCUMANA_OBRA_ID = 1432;
/** Carpeta viva en CUERDAS. El id viejo 1YHbkF0eajhuEZI2QaIpWtuMwDQyTlfzV ya no lista archivos. */
export const TUCUMANA_DRIVE_FOLDER_ID = "1jccTRWVayHLcq2-mQ4kUij3dlcpyiJfg";

export const CHAZARRETA = { apellido: "Chazarreta", nombre: "L." };
export const LEMA = { apellido: "Lema", nombre: "Germán" };
export const LEGUIZAMON = { apellido: "Leguizamon", nombre: 'Gustavo "Cuchi"' };
export const TRADICIONAL = { apellido: "Tradicional", nombre: null };
export const PIMPE_GONZALEZ = {
  apellido: "González",
  nombre: 'Edmundo Nicolás "Pimpe"',
};
/** Apellido exacto en BD: D + U+00B4 + Antona. */
export const DANTONA = { apellido: "D\u00B4Antona", nombre: "Esteban" };

export const CUERDAS_FOLKLORE_WORKS = [
  {
    key: "abuelita",
    zipHint: "abuelita",
    targetFolder: "González, E. - Abuelita Lorenza",
    workTitle: "Abuelita Lorenza",
    titulo: "<p>Abuelita Lorenza (Chacarera doble)</p>",
    composerTag: "González, E",
    compositors: [PIMPE_GONZALEZ],
    arranger: CHAZARRETA,
    observaciones:
      "CUERDAS — González, E. - Abuelita Lorenza. Chacarera doble de Edmundo Nicolás \"Pimpe\" González (Catamarca). Arreglo para cuarteto (Vln 1, Vln 2, Vla, Vc) de Luis Chazarreta.",
  },
  {
    key: "pastorcita",
    zipHint: "pastorcita",
    targetFolder: "Chazarreta, L. - Pastorcita de Antinaco",
    workTitle: "Pastorcita de Antinaco",
    titulo: "<p>Pastorcita de Antinaco (Carnavalito)</p>",
    composerTag: "Chazarreta, L",
    compositors: [TRADICIONAL],
    arranger: CHAZARRETA,
    observaciones:
      "CUERDAS — Chazarreta, L. - Pastorcita de Antinaco. Cuarteto (Vln 1, Vln 2, Vla, Vc). Carnavalito tradicional; el zip acredita Arr. Luis Chazarreta.",
  },
  {
    key: "nochera",
    zipHint: "nochera",
    targetFolder: "Cabezas, E. - La Nochera",
    workTitle: "La Nochera",
    titulo: "<p>La Nochera (Zamba)</p>",
    composerTag: "Cabezas, E",
    compositors: [{ apellido: "Cabezas", nombre: "Ernesto" }],
    arranger: DANTONA,
    observaciones:
      "CUERDAS — Cabezas, E. - La Nochera. Zamba. Música: Ernesto Cabezas. Poesía: Jaime Dávalos. Arr. Esteban D´Antona. Cuarteto (Vln 1, Vln 2, Vla, Vc).",
  },
  {
    key: "tucumana",
    zipHint: "tucumana",
    targetFolder: TUCUMANA_CUERDAS_FOLDER,
    workTitle: "Si Llega A Ser Tucumana",
    titulo: "Si Llega A Ser Tucumana [cuerdas]",
    composerTag: "Leguizamón-Lema",
    includeScore: true,
    compositors: [LEGUIZAMON],
    arranger: LEMA,
    observaciones:
      "CUERDAS — Leguizamón-Lema - Si Llega A Ser Tucumana [cuerdas]. Arreglo de cuerdas de Germán Lema (Vln 1, Vln 2, Vla, Vc, Cb). Distinto del arreglo con vibráfono, marimba y bajo eléctrico (obra 1432).",
  },
];

/** El arreglo de percusión/teclado (obra 1432) no incluye estas partes. */
export const TUCUMANA_CUERDAS_PARTS = [
  "Violín 1",
  "Violín 2",
  "Viola",
  "Violoncello",
  "Contrabajo",
  "SCORE Cuerdas",
];
