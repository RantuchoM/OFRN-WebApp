/**
 * Fripp — Larks' Tongues in Aspic [The LCG]
 * Arr. Cucchiarelli&Guevara. PDFs ya separados (sin split/crop IMSLP).
 * Fuente local: c:\Users\marti\Downloads\LARKS scores
 */
export const PARA_ACOMODAR_ROOT =
  process.env.PARA_ACOMODAR_ROOT ||
  "H:\\Mi unidad\\Archivo General OFRN\\Para acomodar";

export const PARA_ACOMODAR_FOLDER_ID = "10ap1aEjq3X9bFRB3z4DQ-F0fB7y3JutI";

export const LARKS_SOURCE_DEFAULT =
  process.env.LARKS_SOURCE || "c:\\Users\\marti\\Downloads\\LARKS scores";

export const LARKS_ARRANGER = {
  apellido: "Cucchiarelli&Guevara",
  nombre: null,
};

export const LARKS_WORK = {
  sourceFolder: "LARKS scores",
  targetFolder: "Fripp, R. - Larks' Tongues in Aspic [The LCG]",
  titulo: "Larks' Tongues in Aspic [The LCG]",
  workNumber: null,
  composerTag: "Fripp, R",
  compositor: { apellido: "Fripp", nombre: "Robert" },
  arranger: LARKS_ARRANGER,
  action: "insert",
  /** Carpeta Para acomodar (Drive File Stream). */
  driveFolderId:
    process.env.LARKS_DRIVE_FOLDER_ID || "1DKNjjnw51jgx9TcWWskunnBlucqwqQqP",
  /** Álbum King Crimson, 1973. */
  anio: 1973,
  splits: [],
  crops: [],
  /**
   * PDFs ya por instrumento (1–3 pp., sin portada IMSLP).
   * Combinados en la misma hoja: cornos 1y2 / 3y4.
   */
  renames: [
    { pdf: "Larks-Arr. CC - Acoustic Guitar I.pdf", instrument: "Guitarra 1" },
    { pdf: "Larks-Arr. CC - Acoustic Guitar II.pdf", instrument: "Guitarra 2" },
    { pdf: "Larks-Arr. CC - Acoustic Guitar III.pdf", instrument: "Guitarra 3" },
    { pdf: "Larks-Arr. CC - Acoustic Guitar IV.pdf", instrument: "Guitarra 4" },
    { pdf: "Larks-Arr. CC - Acoustic Guitar V.pdf", instrument: "Guitarra 5" },
    { pdf: "Larks-Arr. CC - Bassoon I.pdf", instrument: "Fagot 1" },
    { pdf: "Larks-Arr. CC - Bassoon II.pdf", instrument: "Fagot 2" },
    { pdf: "Larks-Arr. CC - Clarinet in Bb I.pdf", instrument: "Clarinete Bb 1" },
    { pdf: "Larks-Arr. CC - Clarinet in Bb II.pdf", instrument: "Clarinete Bb 2" },
    {
      pdf: "Larks-Arr. CC - Clarinete bajo en Sib.pdf",
      instrument: "Clarinete Bajo",
    },
    { pdf: "Larks-Arr. CC - Contrabajo.pdf", instrument: "Contrabajo" },
    { pdf: "Larks-Arr. CC - Flute I.pdf", instrument: "Flauta 1" },
    { pdf: "Larks-Arr. CC - Flute II.pdf", instrument: "Flauta 2" },
    { pdf: "Larks-Arr. CC - Oboe I.pdf", instrument: "Oboe 1" },
    { pdf: "Larks-Arr. CC - Oboe II.pdf", instrument: "Oboe 2" },
    { pdf: "Larks-Arr. CC - SCORE.pdf", instrument: "SCORE" },
    { pdf: "Larks-Arr. CC - Snare Drum.pdf", instrument: "Perc Tambor" },
    {
      pdf: "Larks-Arr. CC - Tam-tam, Cymbals, Bass Drum.pdf",
      instrument: "Perc Percusión",
    },
    { pdf: "Larks-Arr. CC - Timbales.pdf", instrument: "Perc Timbal" },
    { pdf: "Larks-Arr. CC - Trombon II.pdf", instrument: "Trombón 2" },
    { pdf: "Larks-Arr. CC - Trombón bajo.pdf", instrument: "Trombón Bajo" },
    { pdf: "Larks-Arr. CC - Trombón I.pdf", instrument: "Trombón 1" },
    { pdf: "Larks-Arr. CC - Trompa en Fa 1&2 .pdf", instrument: "Corno F 1y2" },
    { pdf: "Larks-Arr. CC - Trompa en Fa 3&4.pdf", instrument: "Corno F 3y4" },
    { pdf: "Larks-Arr. CC - Trumpet in Bb I.pdf", instrument: "Trompeta 1" },
    { pdf: "Larks-Arr. CC - Trumpet in Bb II.pdf", instrument: "Trompeta 2" },
    { pdf: "Larks-Arr. CC - Tuba en Fa.pdf", instrument: "Tuba" },
    { pdf: "Larks-Arr. CC - Viola.pdf", instrument: "Viola" },
    { pdf: "Larks-Arr. CC - Violonchelo.pdf", instrument: "Violoncello" },
    { pdf: "Larks-Arr. CC - Violín I.pdf", instrument: "Violín 1" },
    { pdf: "Larks-Arr. CC - Violín II.pdf", instrument: "Violín 2" },
  ],
};

export function driveFolderUrl(id) {
  if (!id) return null;
  return `https://drive.google.com/open?id=${id}`;
}
