/**
 * Kalinnikov — Serenata para Cuerdas en sol menor (obra 3893, temporada 2027 P5).
 * Edición H. Sawano (IMSLP #46737 score + #46739–#46743 partes), CC BY 3.0.
 * Typeset Finale: página 1 ya es música (sin crop de portada).
 */
export const PARA_ACOMODAR_ROOT =
  process.env.PARA_ACOMODAR_ROOT ||
  "H:\\Mi unidad\\Archivo General OFRN\\Para acomodar";

export const PARA_ACOMODAR_FOLDER_ID = "10ap1aEjq3X9bFRB3z4DQ-F0fB7y3JutI";

export function driveFolderUrl(id) {
  return id ? `https://drive.google.com/open?id=${id}` : "";
}

export const KALINNIKOV_SERENATA_WORK = {
  obraId: 3893,
  targetFolder: "Kalinnikov, V. - Serenata para Cuerdas en sol menor",
  /** Título de programa (HTML). Un solo Andantino — sin lista romana. */
  titulo: "<p>Serenata para Cuerdas en sol menor</p>",
  workTitleShort: "Serenata para Cuerdas en sol menor",
  workNumber: null,
  composerTag: "Kalinnikov, V",
  compositor: { apellido: "Kalinnikov", nombre: "Vasili" },
  anio: 1891,
  duracion_segundos: 540,
  imslp: "https://imslp.org/wiki/Serenade_for_Strings_(Kalinnikov,_Vasily)",
  driveFolderId: process.env.KALINNIKOV_SERENATA_DRIVE_FOLDER_ID || null,
  /** Cada PDF IMSLP = una silla (wholes). */
  wholes: [
    { pdf: "IMSLP46737-SCORE.pdf", instrument: "SCORE" },
    { pdf: "IMSLP46739-Violin1.pdf", instrument: "Violín 1" },
    { pdf: "IMSLP46740-Violin2.pdf", instrument: "Violín 2" },
    { pdf: "IMSLP46741-Viola.pdf", instrument: "Viola" },
    { pdf: "IMSLP46742-Cello.pdf", instrument: "Violoncello" },
    { pdf: "IMSLP46743-Bass.pdf", instrument: "Contrabajo" },
  ],
};
