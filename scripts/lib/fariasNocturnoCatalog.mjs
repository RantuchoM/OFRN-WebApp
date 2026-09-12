/**
 * Farías, M. — Nocturno (obra 3344, placeholders de seating ya creados).
 * Fuente: ZIP generalypartesnocturnoparaorquesta.zip (Universal Edition UES 100 845).
 * PDFs ya por instrumento (música en p.1, sin portada IMSLP) → solo unzip + rename.
 *
 * IMPORTANTE: no borrar/recrear obras_particellas. El seating de gira 17
 * (Del Silencio al Horizonte / Sinf 15/26) apunta a esos ids.
 * Orgánico ZIP vs placeholders NO coincide (ver generate-farias-nocturno-sync.mjs).
 */
export const PARA_ACOMODAR_ROOT =
  process.env.PARA_ACOMODAR_ROOT ||
  "H:\\Mi unidad\\Archivo General OFRN\\Para acomodar";

export const PARA_ACOMODAR_FOLDER_ID = "10ap1aEjq3X9bFRB3z4DQ-F0fB7y3JutI";

export const FARIAS_NOCTURNO_SOURCE_ZIP =
  process.env.FARIAS_NOCTURNO_ZIP ||
  "c:\\Users\\marti\\Downloads\\generalypartesnocturnoparaorquesta.zip";

export const FARIAS_NOCTURNO_WORK = {
  sourceFolder: "generalypartesnocturnoparaorquesta",
  targetFolder: "Farías, M. - Nocturno",
  titulo: "Nocturno",
  tituloDb: "<p>Nocturno [en proceso de reducción]</p>",
  workNumber: null,
  composerTag: "Farías, M",
  compositor: { apellido: "Farías", nombre: "Miguel" },
  obraId: 3344,
  driveFolderId:
    process.env.FARIAS_NOCTURNO_DRIVE_FOLDER_ID ||
    "1hOAb6DNAuGMMr9XkuTP-6QvR9n536DRj",
  action: "update",
  anio: 2026,
  splits: [],
  crops: [],
  /**
   * ZIP → etiqueta canónica. Perc Timbal se nombra Perc Timp para casar
   * el placeholder existente (id 14994) sin tocar seating.
   */
  renames: [
    { pdfs: ["00 - Nocturno Rev2026- General.pdf"], instrument: "SCORE" },
    { pdfs: ["01 - Flauta 1.pdf"], instrument: "Flauta 1" },
    { pdfs: ["02 - Flauta 2.pdf"], instrument: "Flauta 2" },
    { pdfs: ["03 - Oboe 1.pdf"], instrument: "Oboe 1" },
    { pdfs: ["04 - Oboe 2.pdf"], instrument: "Oboe 2" },
    { pdfs: ["05 - Clarinete en Sib 1.pdf"], instrument: "Clarinete Bb 1" },
    { pdfs: ["06 - Clarinete en Sib 2.pdf"], instrument: "Clarinete Bb 2" },
    { pdfs: ["07 - Fagot 1.pdf"], instrument: "Fagot 1" },
    { pdfs: ["08 - Fagot 2.pdf"], instrument: "Fagot 2" },
    { pdfs: ["09 - Corno en Fa 1.pdf"], instrument: "Corno F 1" },
    { pdfs: ["10 - Corno en Fa 2.pdf"], instrument: "Corno F 2" },
    { pdfs: ["11 - Corno en Fa 3.pdf"], instrument: "Corno F 3" },
    { pdfs: ["12 - Corno en Fa 4.pdf"], instrument: "Corno F 4" },
    { pdfs: ["13 - Trompeta en Sib 1.pdf"], instrument: "Trompeta 1" },
    { pdfs: ["14 - Trompeta en Sib 2.pdf"], instrument: "Trompeta 2" },
    {
      pdfs: ["15 - Trombón 1.pdf", "15 - Trombo_n 1.pdf"],
      instrument: "Trombón 1",
    },
    {
      pdfs: ["16 - Trombón 2.pdf", "16 - Trombo_n 2.pdf"],
      instrument: "Trombón 2",
    },
    { pdfs: ["17 - Timbales.pdf"], instrument: "Perc Timp" },
    {
      pdfs: ["18 - Percusión 1.pdf", "18 - Percusio_n 1.pdf"],
      instrument: "Perc Percusión 1",
    },
    {
      pdfs: ["19 - Percusión 2.pdf", "19 - Percusio_n 2.pdf"],
      instrument: "Perc Percusión 2",
    },
    {
      pdfs: ["20 - Violín I.pdf", "20 - Violi_n I.pdf"],
      instrument: "Violín 1",
    },
    {
      pdfs: ["21 - Violín II.pdf", "21 - Violi_n II.pdf"],
      instrument: "Violín 2",
    },
    { pdfs: ["22 - Viola.pdf"], instrument: "Viola" },
    { pdfs: ["23 - Violonchelo.pdf"], instrument: "Violoncello" },
    { pdfs: ["24 - Contrabajo.pdf"], instrument: "Contrabajo" },
  ],
};

export function driveFolderUrl(id) {
  if (!id) return null;
  return `https://drive.google.com/open?id=${id}`;
}
