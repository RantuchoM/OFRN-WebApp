/** Beethoven op.103 y Weill op.12 (Para acomodar, temporada 2027). */
export const PARA_ACOMODAR_ROOT =
  process.env.PARA_ACOMODAR_ROOT ||
  "H:\\Mi unidad\\Archivo General OFRN\\Para acomodar";

export const PARA_ACOMODAR_FOLDER_ID = "10ap1aEjq3X9bFRB3z4DQ-F0fB7y3JutI";

export const BEETHOVEN_OCTET_WORK = {
  targetFolder: "Beethoven, L. - Octeto, Op. 103",
  titulo:
    "<p>Octeto en Mib mayor, Op. 103</p><div>&nbsp; I. Allegro</div><div>&nbsp; II. Andante</div><div>&nbsp; III. Minuet - Trio</div><div>&nbsp; IV. Finale. Presto</div>",
  workNumber: "op.103",
  composerTag: "Beethoven, L",
  compositor: { apellido: "Beethoven", nombre: "Ludwig van" },
  anio: 1792,
  duracion_segundos: null,
  observaciones:
    "Para acomodar — Beethoven, L. - Octeto, Op. 103. Partes Breitkopf (Beethoven Werke) IMSLP PMLP27872. Portada suelta del Oboe 1 recortada.",
};

export const WEILL_VIOLIN_WORK = {
  targetFolder: "Weill, K. - Concierto para Violín, Op. 12",
  titulo: "<p>Concierto para Violín, Op. 12</p>",
  workNumber: "op.12",
  composerTag: "Weill, K",
  compositor: { apellido: "Weill", nombre: "Kurt" },
  anio: 1924,
  duracion_segundos: 1980,
  observaciones:
    "Para acomodar — Weill, K. - Concierto para Violín, Op. 12. Universal Edition U.E. 8340 (IMSLP PMLP659197). Flauta 2 incluye los cambios a piccolo. Clarinetes en Sib y en La van en la misma parte. Batería: xilófono, triángulo, platillos, tambor y gran cassa.",
};
