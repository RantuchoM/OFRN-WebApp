/**
 * Kalinnikov — Sinfonía Nro. 2 en La mayor (obra 3895, temporada 2027).
 * Score Music Addict #505497 + partes Geniusboy98 Kalmus A4236 (#684943–#684956).
 * Splits por portadas internas SYMPHONIE (OCR encabezado).
 */
export const PARA_ACOMODAR_ROOT =
  process.env.PARA_ACOMODAR_ROOT ||
  "H:\\Mi unidad\\Archivo General OFRN\\Para acomodar";

export const PARA_ACOMODAR_FOLDER_ID = "10ap1aEjq3X9bFRB3z4DQ-F0fB7y3JutI";

export function driveFolderUrl(id) {
  return id ? `https://drive.google.com/open?id=${id}` : "";
}

export const KALINNIKOV_SYM2_WORK = {
  obraId: 3895,
  targetFolder: "Kalinnikov, V. - Sinfonia Nro. 2 en La mayor",
  titulo:
    "<p>Sinfonía Nro. 2 en La mayor</p>" +
    "<div>&nbsp; I. Moderato - Allegro non troppo</div>" +
    "<div>&nbsp; II. Andante cantabile</div>" +
    "<div>&nbsp; III. Allegro scherzando</div>" +
    "<div>&nbsp; IV. Andante cantabile - Allegro vivo</div>",
  workTitleShort: "Sinfonia Nro. 2 en La mayor",
  workNumber: null,
  composerTag: "Kalinnikov, V",
  compositor: { apellido: "Kalinnikov", nombre: "Vasili" },
  anio: 1897,
  duracion_segundos: 2400,
  imslp:
    "https://imslp.org/wiki/Symphony_No.2_in_A_major_(Kalinnikov,_Vasily)",
  driveFolderId: null,
  splits: [
    {
      pdf: "IMSLP684943-Flute.pdf",
      parts: [
        { instrument: "Fl Piccolo", start: 1, end: 5 },
        { instrument: "Flauta 1", start: 6, end: 21 },
        { instrument: "Flauta 2", start: 22, end: 31 },
      ],
    },
    {
      pdf: "IMSLP684944-Oboe.pdf",
      parts: [
        { instrument: "Oboe 1", start: 1, end: 15 },
        { instrument: "Oboe 2", start: 16, end: 27 },
      ],
    },
    {
      pdf: "IMSLP684945-Clarinet.pdf",
      parts: [
        { instrument: "Clarinete A 1", start: 1, end: 18 },
        { instrument: "Clarinete A 2", start: 19, end: 31 },
      ],
    },
    {
      pdf: "IMSLP684946-Bassoon.pdf",
      parts: [
        { instrument: "Fagot 1", start: 1, end: 16 },
        { instrument: "Fagot 2", start: 17, end: 31 },
      ],
    },
    {
      pdf: "IMSLP684947-Horn.pdf",
      parts: [
        { instrument: "Corno F 1", start: 1, end: 13 },
        { instrument: "Corno F 2", start: 14, end: 26 },
        { instrument: "Corno F 3", start: 27, end: 37 },
        { instrument: "Corno F 4", start: 38, end: 48 },
      ],
    },
    {
      pdf: "IMSLP684948-Trumpet.pdf",
      parts: [
        { instrument: "Trompeta D 1", start: 1, end: 7 },
        { instrument: "Trompeta D 2", start: 8, end: 14 },
      ],
    },
    {
      pdf: "IMSLP684949-TromboneTuba.pdf",
      parts: [
        { instrument: "Trombón 1", start: 1, end: 6 },
        { instrument: "Trombón 2", start: 7, end: 12 },
        { instrument: "Trombón 3", start: 13, end: 18 },
        { instrument: "Tuba", start: 19, end: 23 },
      ],
    },
  ],
  crops: [
    { pdf: "IMSLP505497-SCORE.pdf", instrument: "SCORE", start: 1, end: 212 },
    { pdf: "IMSLP684950-Timpani.pdf", instrument: "Perc Timbal", start: 1, end: 8 },
    { pdf: "IMSLP684951-Harp.pdf", instrument: "Arpa", start: 1, end: 2 },
    { pdf: "IMSLP684952-Violin1.pdf", instrument: "Violín 1", start: 1, end: 23 },
    { pdf: "IMSLP684953-Violin2.pdf", instrument: "Violín 2", start: 1, end: 22 },
    { pdf: "IMSLP684954-Viola.pdf", instrument: "Viola", start: 1, end: 21 },
    { pdf: "IMSLP684955-Cello.pdf", instrument: "Violoncello", start: 1, end: 19 },
    { pdf: "IMSLP684956-Bass.pdf", instrument: "Contrabajo", start: 1, end: 19 },
  ],
};
