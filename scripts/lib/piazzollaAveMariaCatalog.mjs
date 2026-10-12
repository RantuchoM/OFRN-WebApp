/**
 * Piazzolla — Ave Maria (arreglo Orchestra Amici della Sabina) desde Para acomodar.
 * El score trae Solo + cuerdas. La única parte solista impresa dice «Flauta» (en Do)
 * y está anotada a mano «Para tromba»; se archiva como Trompeta Solo.
 */
export const PARA_ACOMODAR_ROOT =
  process.env.PARA_ACOMODAR_ROOT ||
  "H:\\Mi unidad\\Archivo General OFRN\\Para acomodar";

export const PARA_ACOMODAR_FOLDER_ID = "10ap1aEjq3X9bFRB3z4DQ-F0fB7y3JutI";

export const ZIP_PATH =
  process.env.AVE_MARIA_ZIP || "c:\\Users\\marti\\Downloads\\avemaria.zip";

export const PIAZZOLLA_AVE_MARIA_WORK = {
  targetFolder: "Piazzolla, A. - Ave Maria",
  titulo: "<p>Ave Maria</p>",
  workTitle: "Ave Maria",
  workNumber: null,
  composerTag: "Piazzolla, A",
  compositor: { apellido: "Piazzolla", nombre: "Astor" },
  anio: 1984,
  duracion_segundos: null,
  observaciones:
    "Para acomodar — Piazzolla, A. - Ave Maria. Arreglo Orchestra Amici della Sabina (Moderato, negra = 84). Score en dos tamaños del mismo contenido. La parte solista impresa es flauta en Do, anotada a mano «Para tromba»; se carga como Trompeta Solo.",
  /**
   * El zip trae nombres en japonés (書き込みなし = sin anotaciones).
   * El match es sobre el nombre de entrada, sin depender del OCR.
   */
  fileMap: [
    { match: /score\s*large/i, instrument: "SCORE" },
    { match: /score\s*small/i, instrument: "SCORE 2" },
    { match: /1st/i, instrument: "Violín 1" },
    { match: /2nd/i, instrument: "Violín 2" },
    { match: /\bva\b/i, instrument: "Viola" },
    { match: /\bvc\b/i, instrument: "Violoncello" },
    { match: /\bcb\b/i, instrument: "Contrabajo" },
    { match: /\btp\b/i, instrument: "Trompeta Solo" },
  ],
};
