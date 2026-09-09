/**
 * Walsh — Manuelita, la tortuga (cuarteto de maderas)
 * Varios — Disney Favorites (quinteto de vientos, arr. Adrian Wagner)
 * Fuente: zip local (Manuelita) / Drive Wood (Disney) → Para acomodar
 * (`link_drive` directo, sin copiar_carpeta_a_archivo).
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

/** Fuente de reemplazo 2026-09-09 (MuseScore Wood, arr. Adrian Wagner). */
export const DISNEY_FAVORITES_SOURCE_DRIVE_ID = "15THu20HyU9Vl2RAcDeFLIXG_fWcxKSF_";
export const DISNEY_FAVORITES_SOURCE_DEFAULT =
  process.env.DISNEY_FAVORITES_SOURCE ||
  "C:\\Users\\marti\\Downloads\\disney_favorites_wood_new";

export const DISNEY_FAVORITES_WORK = {
  key: "disney-favorites-quintet",
  sourceFolder: "disney_favorites_wood_new",
  targetFolder: "Varios - Disney Favorites [quinteto de vientos]",
  titulo: "Disney Favorites [quinteto de vientos]",
  workNumber: null,
  composerTag: "Varios",
  compositor: { apellido: "Varios", nombre: null },
  arranger: { apellido: "Wagner", nombre: "Adrian" },
  action: "update",
  obraId: 3630,
  driveFolderId:
    process.env.DISNEY_FAVORITES_DRIVE_FOLDER_ID ||
    "1vBQIAqhX9LWzajNuH7EaB0tA31oQ5m9I",
  sourceDriveFolderId:
    process.env.DISNEY_FAVORITES_SOURCE_DRIVE_ID ||
    DISNEY_FAVORITES_SOURCE_DRIVE_ID,
  anio: null,
  splits: [],
  /** Partes ya vienen sueltas (Fl, Ob, Cl Sib, Trompa Fa, Fg + Full Score). */
  crops: [],
  observaciones:
    "Para acomodar — Varios - Disney Favorites [quinteto de vientos]. Quinteto de vientos arr. Adrian Wagner (Flauta, Oboe, Clarinete Bb, Corno F, Fagot). MuseScore Wood + MusicXML.",
  durationQueryHint: "Disney Favorites woodwind quintet medley Adrian Wagner",
  sourcePdfs: [
    "Disney_Favorites_Wood - Clarinete en Sib.pdf",
    "Disney_Favorites_Wood - Fagot.pdf",
    "Disney_Favorites_Wood - Flauta.pdf",
    "Disney_Favorites_Wood - Full Score.pdf",
    "Disney_Favorites_Wood - Oboe.pdf",
    "Disney_Favorites_Wood - Trompa en Fa.pdf",
  ],
  sourceExtras: ["Disney_Favorites_Wood.musicxml"],
  renames: [
    {
      pdf: "Disney_Favorites_Wood - Clarinete en Sib.pdf",
      instrument: "Clarinete Bb",
    },
    {
      pdf: "Disney_Favorites_Wood - Trompa en Fa.pdf",
      instrument: "Corno F",
    },
    {
      pdf: "Disney_Favorites_Wood - Fagot.pdf",
      instrument: "Fagot",
    },
    {
      pdf: "Disney_Favorites_Wood - Flauta.pdf",
      instrument: "Flauta",
    },
    {
      pdf: "Disney_Favorites_Wood - Oboe.pdf",
      instrument: "Oboe",
    },
    {
      pdf: "Disney_Favorites_Wood - Full Score.pdf",
      instrument: "SCORE",
    },
  ],
  extraRenames: [
    {
      from: "Disney_Favorites_Wood.musicxml",
      to: "Disney Favorites [quinteto de vientos] - Varios.musicxml",
    },
  ],
};

export const WALSH_DISNEY_WORKS = [MANUELITA_WORK, DISNEY_FAVORITES_WORK];

export function driveFolderUrl(id) {
  if (!id) return "";
  return `https://drive.google.com/open?id=${id}`;
}
