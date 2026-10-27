/**
 * Beethoven — Cuarteto Op. 130 (completo) + Cavatina (mov. V, recorte).
 * Edición Gory (IMSLP #22856 score, #29072–75 partes): más descargas + set completo.
 */
export const PARA_ACOMODAR_ROOT =
  process.env.PARA_ACOMODAR_ROOT ||
  "H:\\Mi unidad\\Archivo General OFRN\\Para acomodar";

export const PARA_ACOMODAR_FOLDER_ID = "10ap1aEjq3X9bFRB3z4DQ-F0fB7y3JutI";

export function driveFolderUrl(folderId) {
  return `https://drive.google.com/drive/folders/${folderId}`;
}

export const OP130_COMPLETE = {
  targetFolder:
    "Beethoven, L. - Cuarteto de cuerdas Nro. 13 en Sib mayor, Op. 130",
  workNumber: "op.130",
  workTitle: "Cuarteto de cuerdas Nro. 13",
  composerTag: "Beethoven, L",
  compositor: { apellido: "Beethoven", nombre: "Ludwig van" },
  anio: 1825,
  titulo:
    "<p>Cuarteto de cuerdas Nro. 13 en Sib mayor, Op. 130</p>" +
    "<div>&nbsp; I. Adagio ma non troppo - Allegro</div>" +
    "<div>&nbsp; II. Presto</div>" +
    "<div>&nbsp; III. Andante con moto ma non troppo</div>" +
    "<div>&nbsp; IV. Alla danza tedesca. Allegro assai</div>" +
    "<div>&nbsp; V. Cavatina. Adagio molto espressivo</div>" +
    "<div>&nbsp; VI. Finale. Allegro</div>",
  /** Renames IMSLP → canónico (cuarteto completo). */
  renames: [
    { pdf: "IMSLP22856-SCORE.pdf", instrument: "SCORE" },
    { pdf: "IMSLP29072-Violin1.pdf", instrument: "Violín 1" },
    { pdf: "IMSLP29073-Violin2.pdf", instrument: "Violín 2" },
    { pdf: "IMSLP29074-Viola.pdf", instrument: "Viola" },
    { pdf: "IMSLP29075-Cello.pdf", instrument: "Violoncello" },
  ],
  /** Duración típica con finale Allegro (~46–50'). */
  duracion_segundos: 48 * 60,
};

/**
 * Cavatina = mov. V (no el Finale). Rangos 1-based inclusivos
 * desde encabezado «Cavatina» hasta página anterior a «Finale».
 */
export const OP130_CAVATINA = {
  targetFolder: "Beethoven, L. - Cavatina (Cuarteto Op. 130)",
  workNumber: "op.130",
  workTitle: "Cavatina",
  composerTag: "Beethoven, L",
  compositor: { apellido: "Beethoven", nombre: "Ludwig van" },
  anio: 1825,
  titulo:
    "<p>Cavatina. Adagio molto espressivo (del Cuarteto de cuerdas Op. 130)</p>",
  duracion_segundos: 7 * 60,
  /** Origen: PDF canónico del cuarteto completo → páginas a extraer. */
  cropsFromComplete: [
    {
      sourceInstrument: "SCORE",
      instrument: "SCORE",
      start: 45,
      end: 47,
    },
    {
      sourceInstrument: "Violín 1",
      instrument: "Violín 1",
      start: 17,
      end: 17,
    },
    {
      sourceInstrument: "Violín 2",
      instrument: "Violín 2",
      start: 17,
      end: 17,
    },
    {
      sourceInstrument: "Viola",
      instrument: "Viola",
      start: 16,
      end: 17,
    },
    {
      sourceInstrument: "Violoncello",
      instrument: "Violoncello",
      start: 16,
      end: 16,
    },
  ],
};
