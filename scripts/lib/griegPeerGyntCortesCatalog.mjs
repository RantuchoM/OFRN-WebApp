/**
 * Recortes de Peer Gynt Suite 1 (obra 3497) para el Programa 6.
 * Página entera aunque el movimiento empiece o termine a mitad:
 * de la página donde arranca hasta la página donde cierra.
 *
 * Fuente: ORQUESTA\Grieg, Edvard\Grieg, E. - Peer Gynt (Suite 1)
 * Edición Peters (cuerdas y vientos) + páginas Siemens de corno (los 4 en la misma hoja).
 */
export const SUITE1_DIR =
  "H:\\Mi unidad\\Archivo General OFRN\\ORQUESTA\\Grieg, Edvard\\Grieg, E. - Peer Gynt (Suite 1)";

export const PARA_ACOMODAR_ROOT =
  process.env.PARA_ACOMODAR_ROOT ||
  "H:\\Mi unidad\\Archivo General OFRN\\Para acomodar";

export const PARA_ACOMODAR_FOLDER_ID = "10ap1aEjq3X9bFRB3z4DQ-F0fB7y3JutI";

const SRC = " - S-N. Peer Gynt (Suite 1) - Grieg, E.pdf";

/** @type {{ file: string, pages: number[], instrument: string }[]} */
export const MANANA_PARTS = [
  { file: `Violín 1${SRC}`, pages: [1, 2], instrument: "Violín 1" },
  { file: `Violín 2${SRC}`, pages: [1, 2], instrument: "Violín 2" },
  { file: `Viola${SRC}`, pages: [1, 2], instrument: "Viola" },
  { file: `Violoncello${SRC}`, pages: [1], instrument: "Violoncello" },
  { file: `Contrabajo${SRC}`, pages: [1, 2], instrument: "Contrabajo" },
  { file: `Flauta${SRC}`, pages: [1], instrument: "Flauta" },
  { file: `Flauta 2${SRC}`, pages: [1], instrument: "Flauta 2" },
  { file: `Oboe 1${SRC}`, pages: [1], instrument: "Oboe 1" },
  { file: `Oboe 2${SRC}`, pages: [1], instrument: "Oboe 2" },
  { file: `Clarinete Bb${SRC}`, pages: [1], instrument: "Clarinete Bb" },
  { file: `Clarinete Bb 2${SRC}`, pages: [1], instrument: "Clarinete Bb 2" },
  { file: `Fagot${SRC}`, pages: [1], instrument: "Fagot" },
  { file: `Fagot 2${SRC}`, pages: [1], instrument: "Fagot 2" },
  { file: `Perc Timbal${SRC}`, pages: [1], instrument: "Perc Timbal" },
  { file: `Trompeta${SRC}`, pages: [1], instrument: "Trompeta" },
  { file: `Trompeta 2${SRC}`, pages: [1], instrument: "Trompeta 2" },
];

/** Páginas 1 y 2 del PDF de cornos Siemens: I+II y III+IV en la misma hoja. */
export const MANANA_HORN_PAGES = [
  `Corno F${SRC}`,
  `Corno F 2${SRC}`,
];

/** @type {{ file: string, pages: number[], instrument: string }[]} */
export const ASE_PARTS = [
  { file: `Violín 1${SRC}`, pages: [3, 4], instrument: "Violín 1" },
  { file: `Violín 2${SRC}`, pages: [3, 4], instrument: "Violín 2" },
  { file: `Viola${SRC}`, pages: [3, 4], instrument: "Viola" },
  { file: `Violoncello${SRC}`, pages: [2], instrument: "Violoncello" },
  { file: `Contrabajo${SRC}`, pages: [2], instrument: "Contrabajo" },
];

export const GRIEG_CORTES = [
  {
    obraId: 3917,
    key: "manana",
    targetFolder: "Grieg, E. - La mañana (Peer Gynt)",
    titulo:
      "<p>La mañana. Allegretto pastorale (Peer Gynt, Suite n.º 1, Op. 46)</p>",
    workTitle: "La mañana",
    fileCount: 17,
    partCount: 20,
  },
  {
    obraId: 3918,
    key: "ase",
    targetFolder: "Grieg, E. - La muerte de Åse (Peer Gynt)",
    titulo:
      "<p>La muerte de Åse. Andante doloroso (Peer Gynt, Suite n.º 1, Op. 46)</p>",
    workTitle: "La muerte de Åse",
    fileCount: 5,
    partCount: 5,
  },
];

export const GRIEG_COMPOSITOR = { apellido: "Grieg", nombre: "Edvard" };
export const PROGRAMA6_ID = 207;
export const PROGRAMA6_REPERTORIO_ID = 172;
export const SUITE1_OBRA_ID = 3497;

export function driveFolderUrl(folderId) {
  return folderId ? `https://drive.google.com/open?id=${folderId}` : "";
}
