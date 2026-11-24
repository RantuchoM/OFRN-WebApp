/**
 * Paganini — Concierto Violín Nro. 1 Op.6 (orquesta extendida, Re mayor).
 * Generoso/Kalmus A1874 completo: vientos Music Addict + cuerdas/fagot/perc Generoso.
 * Obra 3916 — convive con 3900 (set vientos incompleto) para que el director elija.
 */
export const PARA_ACOMODAR_ROOT =
  process.env.PARA_ACOMODAR_ROOT ||
  "H:\\Mi unidad\\Archivo General OFRN\\Para acomodar";

export const PARA_ACOMODAR_FOLDER_ID = "10ap1aEjq3X9bFRB3z4DQ-F0fB7y3JutI";

export function driveFolderUrl(id) {
  return id ? `https://drive.google.com/open?id=${id}` : "";
}

export const PAGANINI_OP6_EXTENDED_WORK = {
  obraId: 3916,
  targetFolder: "Paganini, N. - Concierto Violin Nro 1 Op.6 (orquesta extendida)",
  titulo:
    "<p>Concierto para Violín Nro. 1 en Re mayor, Op. 6 (orquesta extendida)</p>" +
    "<div>&nbsp; I. Allegro maestoso</div>" +
    "<div>&nbsp; II. Adagio</div>" +
    "<div>&nbsp; III. Rondo. Allegro spirituoso</div>",
  workTitleShort: "Concierto Violin Nro 1",
  workNumber: "op.6",
  composerTag: "Paganini, N",
  compositor: { apellido: "Paganini", nombre: "Niccolò" },
  compositorId: 890,
  anio: 1818,
  duracion_segundos: 2100,
  imslp:
    "https://imslp.org/wiki/Violin_Concerto_No.1,_Op.6_(Paganini,_Niccol%C3%B2)",
  driveFolderId: "1i39M9YvNhh81IWKTrvqnxXhx8aqtY1Gc",
  mergeRepertorioWithObraId: 3900,
  observacionesExtra:
    "Orquesta extendida Kalmus/Generoso (D major). Alternativa al set 3900 (solo vientos). Director elige.",
  /** Trombones: re-split correcto 1 / 2 / Bajo (el set 3900 juntó 2+Bajo). */
  splits: [
    {
      pdf: "IMSLP546091-PMLP30286-Paganini_-_Violin_Concerto_No1_Op6_D_major_13_Trombone1_(etc).pdf",
      parts: [
        { instrument: "Trombón 1", start: 1, end: 3 },
        { instrument: "Trombón 2", start: 4, end: 6 },
        { instrument: "Trombón Bajo", start: 7, end: 9 },
      ],
    },
  ],
  /** Ya canónicos (copiados de 3900) + Generoso nuevos a renombrar. */
  wholes: [
    {
      pdf: "SCORE - op.6. Concierto Violin Nro 1 - Paganini, N.pdf",
      instrument: "SCORE",
    },
    {
      pdf: "Violín Solo - op.6. Concierto Violin Nro 1 - Paganini, N.pdf",
      instrument: "Violín Solo",
    },
    {
      pdf: "Flauta 1 - op.6. Concierto Violin Nro 1 - Paganini, N.pdf",
      instrument: "Flauta 1",
    },
    {
      pdf: "Flauta 2 - op.6. Concierto Violin Nro 1 - Paganini, N.pdf",
      instrument: "Flauta 2",
    },
    {
      pdf: "Oboe 1 - op.6. Concierto Violin Nro 1 - Paganini, N.pdf",
      instrument: "Oboe 1",
    },
    {
      pdf: "Oboe 2 - op.6. Concierto Violin Nro 1 - Paganini, N.pdf",
      instrument: "Oboe 2",
    },
    {
      pdf: "Clarinete A 1 - op.6. Concierto Violin Nro 1 - Paganini, N.pdf",
      instrument: "Clarinete A 1",
    },
    {
      pdf: "Clarinete A 2 - op.6. Concierto Violin Nro 1 - Paganini, N.pdf",
      instrument: "Clarinete A 2",
    },
    {
      pdf: "IMSLP291650-PMLP30286-Paganini_-_Violin_Concerto_No1_Op6_D_major_7_Bassoon.pdf",
      instrument: "Fagot",
    },
    {
      pdf: "IMSLP291651-PMLP30286-Paganini_-_Violin_Concerto_No1_Op6_D_major_8_ContraBassoon.pdf",
      instrument: "Contrafagot",
    },
    {
      pdf: "Corno F 1 - op.6. Concierto Violin Nro 1 - Paganini, N.pdf",
      instrument: "Corno F 1",
    },
    {
      pdf: "Corno F 2 - op.6. Concierto Violin Nro 1 - Paganini, N.pdf",
      instrument: "Corno F 2",
    },
    {
      pdf: "Trompeta Bb 1 - op.6. Concierto Violin Nro 1 - Paganini, N.pdf",
      instrument: "Trompeta Bb 1",
    },
    {
      pdf: "Trompeta Bb 2 - op.6. Concierto Violin Nro 1 - Paganini, N.pdf",
      instrument: "Trompeta Bb 2",
    },
    {
      pdf: "IMSLP291659-PMLP30286-Paganini_-_Violin_Concerto_No1_Op6_D_major_16_Timpani.pdf",
      instrument: "Timbales",
    },
    {
      pdf: "IMSLP291660-PMLP30286-Paganini_-_Violin_Concerto_No1_Op6_D_major_17_BassDrum.pdf",
      instrument: "Bombo",
    },
    {
      pdf: "IMSLP291661-PMLP30286-Paganini_-_Violin_Concerto_No1_Op6_D_major_18_Cymbals.pdf",
      instrument: "Platillos",
    },
    {
      pdf: "IMSLP291662-PMLP30286-Paganini_-_Violin_Concerto_No1_Op6_D_major_19_Violin1.pdf",
      instrument: "Violín 1",
    },
    {
      pdf: "IMSLP291667-PMLP30286-Paganini_-_Violin_Concerto_No1_Op6_D_major_20_Violin2.pdf",
      instrument: "Violín 2",
    },
    {
      pdf: "IMSLP291663-PMLP30286-Paganini_-_Violin_Concerto_No1_Op6_D_major_21_Viola.pdf",
      instrument: "Viola",
    },
    {
      pdf: "IMSLP291665-PMLP30286-Paganini_-_Violin_Concerto_No1_Op6_D_major_22_Cello.pdf",
      instrument: "Violoncello",
    },
    {
      pdf: "IMSLP291666-PMLP30286-Paganini_-_Violin_Concerto_No1_Op6_D_major_23_Bass.pdf",
      instrument: "Contrabajo",
    },
  ],
  /** Quitar trombones viejos (rangos incorrectos) antes del split nuevo. */
  removePdfs: [
    "Trombón 1 - op.6. Concierto Violin Nro 1 - Paganini, N.pdf",
    "Trombón 2 - op.6. Concierto Violin Nro 1 - Paganini, N.pdf",
  ],
};
