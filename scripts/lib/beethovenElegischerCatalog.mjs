/**
 * Beethoven — Elegischer Gesang, Op. 118 (obra 3907, temporada 2027 P17).
 * Edición Breitkopf / Kalmus A2562 (IMSLP #808025–#808036), M.kowalski49.
 */
export const PARA_ACOMODAR_ROOT =
  process.env.PARA_ACOMODAR_ROOT ||
  "H:\\Mi unidad\\Archivo General OFRN\\Para acomodar";

export const PARA_ACOMODAR_FOLDER_ID = "10ap1aEjq3X9bFRB3z4DQ-F0fB7y3JutI";

export function driveFolderUrl(id) {
  return id ? `https://drive.google.com/open?id=${id}` : "";
}

export const BEETHOVEN_ELEGISCHER_WORK = {
  obraId: 3907,
  targetFolder: "Beethoven, L. - Elegischer Gesang, Op. 118",
  titulo: "<p>Elegischer Gesang en Mi mayor, Op. 118</p>",
  workTitleShort: "Elegischer Gesang",
  workNumber: "op.118",
  composerTag: "Beethoven, L",
  compositor: { apellido: "Beethoven", nombre: "Ludwig van" },
  anio: 1814,
  duracion_segundos: 240,
  imslp: "https://imslp.org/wiki/Elegischer_Gesang,_Op.118_(Beethoven,_Ludwig_van)",
  driveFolderId: null,
  wholes: [
    { pdf: "IMSLP808025-SCORE.pdf", instrument: "SCORE" },
    { pdf: "IMSLP808026-Violin1.pdf", instrument: "Violín 1" },
    { pdf: "IMSLP808027-Violin2.pdf", instrument: "Violín 2" },
    { pdf: "IMSLP808028-Viola.pdf", instrument: "Viola" },
    { pdf: "IMSLP808029-Cello.pdf", instrument: "Violoncello" },
    { pdf: "IMSLP808033-Soprano.pdf", instrument: "Cantante Soprano" },
    { pdf: "IMSLP808034-Alto.pdf", instrument: "Cantante Mezzo" },
    { pdf: "IMSLP808035-Tenor.pdf", instrument: "Cantante Tenor" },
    { pdf: "IMSLP808036-Bass.pdf", instrument: "Cantante Baritono" },
  ],
};
