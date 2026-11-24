/**
 * Paganini — Concierto Violín Nro. 1 Op.6 en Re (obra 3900).
 * Generoso / Music Addict D major (#546085–#546091, score #669646).
 * Sin partes de cuerda orquestal en este set (solo vientos/metales + solo + score).
 */
export const PARA_ACOMODAR_ROOT =
  process.env.PARA_ACOMODAR_ROOT ||
  "H:\\Mi unidad\\Archivo General OFRN\\Para acomodar";

export const PARA_ACOMODAR_FOLDER_ID = "10ap1aEjq3X9bFRB3z4DQ-F0fB7y3JutI";

export function driveFolderUrl(id) {
  return id ? `https://drive.google.com/open?id=${id}` : "";
}

export const PAGANINI_OP6_WORK = {
  obraId: 3900,
  targetFolder: "Paganini, N. - Concierto Violin Nro 1 Op.6",
  titulo:
    "<p>Concierto para Violín Nro. 1 en Re mayor, Op. 6</p>" +
    "<div>&nbsp; I. Allegro maestoso</div>" +
    "<div>&nbsp; II. Adagio</div>" +
    "<div>&nbsp; III. Rondo. Allegro spirituoso</div>",
  workTitleShort: "Concierto Violin Nro 1",
  workNumber: "op.6",
  composerTag: "Paganini, N",
  compositor: { apellido: "Paganini", nombre: "Niccolò" },
  anio: 1818,
  duracion_segundos: 2100,
  imslp:
    "https://imslp.org/wiki/Violin_Concerto_No.1,_Op.6_(Paganini,_Niccol%C3%B2)",
  driveFolderId: null,
  splits: [
    {
      pdf: "IMSLP546086-PMLP30286-Paganini_-_Violin_Concerto_No1_Op6_D_major_1_Flute1_(etc).pdf",
      parts: [
        { instrument: "Flauta 1", start: 1, end: 4 },
        { instrument: "Flauta 2", start: 5, end: 8 },
      ],
    },
    {
      pdf: "IMSLP546087-PMLP30286-Paganini_-_Violin_Concerto_No1_Op6_D_major_3_Oboe1_(etc).pdf",
      parts: [
        { instrument: "Oboe 1", start: 1, end: 4 },
        { instrument: "Oboe 2", start: 5, end: 8 },
      ],
    },
    {
      pdf: "IMSLP546088-PMLP30286-Paganini_-_Violin_Concerto_No1_Op6_D_major_5_Clarinet1A_(etc).pdf",
      parts: [
        { instrument: "Clarinete A 1", start: 1, end: 6 },
        { instrument: "Clarinete A 2", start: 7, end: 12 },
      ],
    },
    {
      pdf: "IMSLP546089-PMLP30286-Paganini_-_Violin_Concerto_No1_Op6_D_major_9_Horn1D_(etc).pdf",
      parts: [
        { instrument: "Corno F 1", start: 1, end: 4 },
        { instrument: "Corno F 2", start: 5, end: 8 },
      ],
    },
    {
      pdf: "IMSLP546090-PMLP30286-Paganini_-_Violin_Concerto_No1_Op6_D_major_11_Trumpet1D_(etc).pdf",
      parts: [
        { instrument: "Trompeta Bb 1", start: 1, end: 3 },
        { instrument: "Trompeta Bb 2", start: 4, end: 6 },
      ],
    },
    {
      pdf: "IMSLP546091-PMLP30286-Paganini_-_Violin_Concerto_No1_Op6_D_major_13_Trombone1_(etc).pdf",
      parts: [
        { instrument: "Trombón 1", start: 1, end: 4 },
        { instrument: "Trombón 2", start: 5, end: 9 },
      ],
    },
  ],
  wholes: [
    {
      pdf: "IMSLP669646-PMLP30286-Paganini-Op6fsBHrK.pdf",
      instrument: "SCORE",
    },
    {
      pdf: "IMSLP546085-PMLP30286-Paganini_-_Concerto_No.1_in_D_major,_op6vp..pdf",
      instrument: "Violín Solo",
    },
  ],
};
