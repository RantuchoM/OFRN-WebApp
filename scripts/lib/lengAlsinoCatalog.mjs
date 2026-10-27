/**
 * Alfonso Leng — La muerte de Alsino (poema sinfónico, 1920–21).
 * Fuente: Downloads/Leng-La muerte de Alsino.rar (partes ya separadas + full score).
 * Sin nº de catálogo; sin split/crop IMSLP.
 */
export const PARA_ACOMODAR_ROOT =
  process.env.PARA_ACOMODAR_ROOT ||
  "H:\\Mi unidad\\Archivo General OFRN\\Para acomodar";

export const PARA_ACOMODAR_FOLDER_ID = "10ap1aEjq3X9bFRB3z4DQ-F0fB7y3JutI";

export const LENG_ALSINO_SOURCE_DIR =
  process.env.LENG_ALSINO_SOURCE ||
  "c:\\Users\\marti\\Downloads\\Leng-La muerte de Alsino";

export const LENG_ALSINO_WORK = {
  sourceMatch: /leng.*alsino|muerte\s+de\s+alsino/i,
  targetFolder: "Leng, A. - La muerte de Alsino",
  /** Nombre corto en PDF / carpeta */
  titulo: "La muerte de Alsino",
  /** Título de programa (HTML) */
  tituloDb: "<p>Poema sinfónico La muerte de Alsino</p>",
  workNumber: null,
  composerTag: "Leng, A",
  compositor: { apellido: "Leng", nombre: "Alfonso" },
  arranger: null,
  action: "insert",
  obraId: 3703,
  anio: 1920,
  /** ~15:30 según Cayambis / grabaciones */
  duracion_segundos: 930,
  observaciones:
    "Para acomodar — Leng, A. - La muerte de Alsino. Poema sinfónico (1920–21; estreno Santiago 1922). Partes ya separadas (sin split IMSLP). Trombón bajo o Tuba → Tuba.",
  driveFolderId:
    process.env.LENG_ALSINO_DRIVE_FOLDER_ID ||
    "1-egbR4saDe6Lj7eQYyGZzBcPc4Kks-rV",
  splits: [],
  crops: [],
  renames: [
    { re: "full\\s*score|partitura\\s*general", instrument: "SCORE" },
    { re: "piccolo", instrument: "Fl Piccolo" },
    { re: "flauta\\s*1\\s*y\\s*2|flauta\\s*1y2", instrument: "Flauta 1y2" },
    { re: "flauta\\s*3", instrument: "Flauta 3" },
    { re: "oboe\\s*1\\s*y\\s*2|oboe\\s*1y2", instrument: "Oboe 1y2" },
    { re: "corno\\s*ingles", instrument: "Ob EH" },
    {
      re: "clarinete\\s*(bajo|bass).*bb|clarinete\\s*bajo",
      instrument: "Clarinete Bajo",
    },
    {
      re: "clarinete\\s*(en\\s*)?(bb|sib)\\s*1\\s*y\\s*2|clarinete\\s*(en\\s*)?(bb|sib)\\s*1y2",
      instrument: "Clarinete Bb 1y2",
    },
    { re: "fagot\\s*1\\s*y\\s*2|fagot\\s*1y2", instrument: "Fagot 1y2" },
    {
      re: "corno\\s*(en\\s*)?f\\s*1\\s*y\\s*2|corno\\s*(en\\s*)?f\\s*1y2",
      instrument: "Corno F 1y2",
    },
    {
      re: "corno\\s*(en\\s*)?f\\s*3\\s*y\\s*4|corno\\s*(en\\s*)?f\\s*3y4",
      instrument: "Corno F 3y4",
    },
    {
      re: "trompeta\\s*(en\\s*)?c\\s*1\\s*y\\s*2|trompeta\\s*(en\\s*)?c\\s*1y2",
      instrument: "Trompeta C 1y2",
    },
    { re: "trompeta\\s*(en\\s*)?c\\s*3", instrument: "Trompeta C 3" },
    {
      re: "trombon\\s*1\\s*y\\s*2|trombon\\s*1y2",
      instrument: "Trombón 1y2",
    },
    { re: "trombon\\s*3", instrument: "Trombón 3" },
    {
      re: "trombon\\s*bajo|tuba",
      instrument: "Tuba",
    },
    { re: "timbal", instrument: "Perc Timbal" },
    { re: "gran\\s*cassa|bombo", instrument: "Perc Bombo" },
    { re: "platillos?", instrument: "Perc Platillo" },
    { re: "tamtam|tam[- ]?tam|gong", instrument: "Perc Gong" },
    { re: "\\barpa\\b", instrument: "Arpa" },
    { re: "violin\\s*i\\b|violin\\s*1", instrument: "Violín 1" },
    { re: "violin\\s*ii\\b|violin\\s*2", instrument: "Violín 2" },
    { re: "\\bviola\\b", instrument: "Viola" },
    { re: "cello|violonchelo|violoncello", instrument: "Violoncello" },
    { re: "contrabajo", instrument: "Contrabajo" },
  ],
};

export function driveFolderUrl(id) {
  if (!id) return null;
  return `https://drive.google.com/open?id=${id}`;
}
