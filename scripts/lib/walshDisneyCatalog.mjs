/**
 * Walsh — Manuelita, la tortuga (cuarteto de maderas)
 * Varios — Disney Favorites (quinteto de vientos)
 * Fuente: zip local → Para acomodar (sin copiar_carpeta_a_archivo).
 */
export const PARA_ACOMODAR_ROOT =
  process.env.PARA_ACOMODAR_ROOT ||
  "H:\\Mi unidad\\Archivo General OFRN\\Para acomodar";

export const PARA_ACOMODAR_FOLDER_ID = "10ap1aEjq3X9bFRB3z4DQ-F0fB7y3JutI";

export const WALSH_DISNEY_SOURCE_DEFAULT =
  process.env.WALSH_DISNEY_SOURCE ||
  "c:\\Users\\marti\\Downloads\\manuelita_extract_tmp";

export const GIRA_170 = {
  id_programa: 170,
  id_repertorio: 147,
  nombre_gira: "Agasajo Maestros Jardin 27",
};

export const MANUELITA_WORK = {
  key: "manuelita-cuarteto",
  sourceFolder: "manuelita_extract_tmp",
  targetFolder: "Walsh, M.E. - Manuelita, la tortuga",
  titulo: "Manuelita, la tortuga",
  workNumber: null,
  composerTag: "Walsh, M.E",
  compositor: { apellido: "Walsh", nombre: "María Elena" },
  arranger: null,
  action: "insert",
  driveFolderId:
    process.env.MANUELITA_DRIVE_FOLDER_ID || "1-8whIq8YVQr--4E51o2Dft6Orm7QfQc5",
  anio: 1962,
  splits: [],
  crops: [],
  observaciones:
    "Para acomodar — Walsh, M.E. - Manuelita, la tortuga. Cuarteto de maderas (Flauta 1, Oboe, Clarinete Bb, Fagot). Sibelius.",
  durationQueryHint: "Maria Elena Walsh Manuelita la tortuga",
  sourcePdfs: [
    "Manuelita, la tortuga _ Maria Elena Walsh vs - Clarinete en Sib.pdf",
    "Manuelita, la tortuga _ Maria Elena Walsh vs - Fagot.pdf",
    "Manuelita, la tortuga _ Maria Elena Walsh vs - Flauta 1.pdf",
    "Manuelita, la tortuga _ Maria Elena Walsh vs - Oboe.pdf",
    "Manuelita, la tortuga _ Maria Elena Walsh vs - Partitura completa.pdf",
  ],
  renames: [
    {
      pdf: "Manuelita, la tortuga _ Maria Elena Walsh vs - Clarinete en Sib.pdf",
      instrument: "Clarinete Bb",
    },
    {
      pdf: "Manuelita, la tortuga _ Maria Elena Walsh vs - Fagot.pdf",
      instrument: "Fagot",
    },
    {
      pdf: "Manuelita, la tortuga _ Maria Elena Walsh vs - Flauta 1.pdf",
      instrument: "Flauta 1",
    },
    {
      pdf: "Manuelita, la tortuga _ Maria Elena Walsh vs - Oboe.pdf",
      instrument: "Oboe",
    },
    {
      pdf: "Manuelita, la tortuga _ Maria Elena Walsh vs - Partitura completa.pdf",
      instrument: "SCORE",
    },
  ],
};

export const DISNEY_FAVORITES_WORK = {
  key: "disney-favorites-quintet",
  sourceFolder: "manuelita_extract_tmp",
  targetFolder: "Varios - Disney Favorites [quinteto de vientos]",
  titulo: "Disney Favorites [quinteto de vientos]",
  workNumber: null,
  composerTag: "Varios",
  compositor: { apellido: "Varios", nombre: null },
  arranger: null,
  action: "insert",
  driveFolderId:
    process.env.DISNEY_FAVORITES_DRIVE_FOLDER_ID ||
    "1vBQIAqhX9LWzajNuH7EaB0tA31oQ5m9I",
  anio: null,
  splits: [],
  /** Partitura+partes combinada: extraer SCORE (pp. 1–13); las partes ya vienen sueltas. */
  crops: [
    {
      pdf: "disney-Partitura_y_Partes.pdf",
      instrument: "SCORE",
      start: 1,
      end: 13,
    },
  ],
  observaciones:
    "Para acomodar — Varios - Disney Favorites [quinteto de vientos]. Medley MuseScore (Flauta, Oboe, Clarinete Bb, Corno F, Fagot).",
  durationQueryHint: "Disney Favorites woodwind quintet medley",
  sourcePdfs: [
    "disney-Clarinete_en_Sib,_Bb_Clarinet_2.pdf",
    "disney-Corno_en_Fa,_Horn_in_F.pdf",
    "disney-Fagot,_Bassoon.pdf",
    "disney-Flauta,_Flute.pdf",
    "disney-Oboe.pdf",
    "disney-Partitura_y_Partes.pdf",
  ],
  renames: [
    {
      pdf: "disney-Clarinete_en_Sib,_Bb_Clarinet_2.pdf",
      instrument: "Clarinete Bb",
    },
    {
      pdf: "disney-Corno_en_Fa,_Horn_in_F.pdf",
      instrument: "Corno F",
    },
    {
      pdf: "disney-Fagot,_Bassoon.pdf",
      instrument: "Fagot",
    },
    {
      pdf: "disney-Flauta,_Flute.pdf",
      instrument: "Flauta",
    },
    {
      pdf: "disney-Oboe.pdf",
      instrument: "Oboe",
    },
    {
      pdf: "SCORE - raw split.pdf",
      instrument: "SCORE",
    },
  ],
};

export const WALSH_DISNEY_WORKS = [MANUELITA_WORK, DISNEY_FAVORITES_WORK];

export function driveFolderUrl(id) {
  if (!id) return "";
  return `https://drive.google.com/open?id=${id}`;
}
