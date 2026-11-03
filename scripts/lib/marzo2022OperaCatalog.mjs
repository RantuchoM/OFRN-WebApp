/**
 * Catálogo — Gira 2022 «01. MARZO 9-12. Regina-Cipolletti» (Ópera a la carta).
 *
 * Los PDFs viven en `PARTICELLAS/<instrumento>/NN. Compositor. Obra - Instrumento.pdf`
 * y `SCORES/NN. Obra.pdf`. El prefijo numérico identifica la obra.
 *
 * Obras NUEVAS (no existían en BD): 01b, 02, 04, 06, 09 (copia canónica a «Para acomodar»)
 * y Lin Calel (carpeta ya canónica dentro de la gira, link_drive = esa carpeta).
 *
 * Obras que YA existen en BD y ya tienen legacy de esta gira (no se duplican):
 *   01a Cavalleria Rusticana (3083), 03 Manon Lescaut Intermezzo (3558),
 *   05/07 Piedade (2217), 08 Tannhäuser Obertura (2333), 11 La Bohème (3510).
 * 00 = «ÓPERA A LA CARTA» (hoja completa por instrumento) y 99 = Archivadas: no son obras.
 */
export const GIRA_LOCAL_ROOT =
  "H:\\Mi unidad\\Partituras Giras 2022 - OFRN\\01. MARZO 9-12. Regina-Cipolletti";
export const PARA_ACOMODAR_ROOT =
  process.env.PARA_ACOMODAR_ROOT ||
  "H:\\Mi unidad\\Archivo General OFRN\\Para acomodar";
export const PARA_ACOMODAR_DRIVE_ROOT =
  "https://drive.google.com/open?id=10ap1aEjq3X9bFRB3z4DQ-F0fB7y3JutI";

export const LIN_CALEL_FOLDER_ID = "1WgW6oi126tWnRw5d-ab_KREpxBoiePeQ";
export const LIN_CALEL_LOCAL_DIR = `${GIRA_LOCAL_ROOT}\\D'Esposito-López Manzitti - Lin Calel - Dúo de amor`;

/** Metadatos legacy de la gira (igual que import_obras_repertorios_legacy_2022.sql). */
export const GIRA_LEGACY = {
  nombre_gira: "Marzo 9-12 - Alto Valle - Ópera a la carta",
  fecha_desde: "2022-03-09",
  fecha_hasta: "2022-03-12",
  tipo: "Sinfónico",
  zona: "Alto Valle",
  nomenclador: "Gira 1",
  mes_letra: "03a",
  ensambles: "Cuerdas;Maderas;Bronces;Percusión",
  fuente: "Giras 2022 Rep (Marzo 9-12, carga Drive manual)",
};

const PUCCINI = { apellido: "Puccini", nombre: "Giacomo" };
const MASSENET = { apellido: "Massenet", nombre: "Jules" };
const WAGNER = { apellido: "Wagner", nombre: "Richard" };
const DESPOSITO = { apellido: "D'Esposito", nombre: "Arnaldo" };
// Sin nombre de pila confirmado: se carga solo el apellido (no inventar).
const LOPEZ_MANZITTI = { apellido: "López Manzitti", nombre: null };

/**
 * Obras a copiar desde PARTICELLAS/SCORES a una carpeta canónica en Para acomodar.
 * `overrides`: {folder, suffix, instrument|skip} para casos donde el nombre de origen es ambiguo.
 */
export const COPY_WORKS = [
  {
    prefix: "01b",
    targetFolder: "Puccini, G. - Edgar. Preludio Acto III",
    fileTitle: "Edgar. Preludio Acto III",
    composerTag: "Puccini, G",
    titulo: "Preludio del Acto III ('Edgar')",
    comps: [PUCCINI],
    arr: null,
    overrides: [
      // «Vc y Cb» (carpeta Contrabajo) y «Violoncello» son el mismo PDF (211273 vs 211255 bytes).
      { folder: "Violoncello", suffix: "Violoncello", skip: true },
    ],
  },
  {
    prefix: "02",
    targetFolder: "Massenet, J. - Manon. Toi, vous!",
    fileTitle: "Manon. Toi, vous!",
    composerTag: "Massenet, J",
    titulo: "Toi! Vous! ('Manon')",
    comps: [MASSENET],
    arr: null,
    overrides: [
      // La hoja «Violoncello» figura en las carpetas Violoncello y Contrabajo (misma hoja).
      { folder: "Contrabajo", suffix: "Violoncello", instrument: "Violoncello y Contrabajo" },
      { folder: "Violoncello", suffix: "Violoncello", skip: true },
    ],
  },
  {
    prefix: "04",
    targetFolder: "Puccini, G. - Manon Lescaut. Donna non vidi mai",
    fileTitle: "Manon Lescaut. Donna non vidi mai",
    composerTag: "Puccini, G",
    titulo: "Donna non vidi mai ('Manon Lescaut')",
    comps: [PUCCINI],
    arr: null,
    overrides: [],
  },
  {
    prefix: "06",
    targetFolder: "Massenet, J. - Werther. Pourquoi me réveiller",
    fileTitle: "Werther. Pourquoi me réveiller",
    composerTag: "Massenet, J",
    titulo: "Pourquoi me réveiller ('Werther')",
    comps: [MASSENET],
    arr: null,
    overrides: [],
  },
  {
    prefix: "09",
    targetFolder: "Wagner, R. - Tannhäuser. Gepriesen sei die Stunde",
    fileTitle: "Tannhäuser. Gepriesen sei die Stunde",
    composerTag: "Wagner, R",
    titulo: "Gepriesen sei die Stunde ('Tannhäuser')",
    comps: [WAGNER],
    arr: null,
    overrides: [],
  },
];

/** Lin Calel: carpeta ya canónica en la gira; solo se corrigen 2 nombres. */
export const LIN_CALEL_WORK = {
  driveId: LIN_CALEL_FOLDER_ID,
  titulo: "Dúo de amor ('Lin Calel')",
  comps: [DESPOSITO],
  arr: LOPEZ_MANZITTI,
  obs:
    "Gira 2022 Marzo 9-12 (Ópera a la carta). Ópera Lin Calel de Arnaldo D'Esposito; edición/orquestación López Manzitti (arreglador según nombre de carpeta Drive).",
  renames: [
    {
      from: "Corno F 1 y 2 - Lin Calel - Dúo de amor - D'Esposito-López Manzitti.pdf",
      to: "Corno F 1y2 - Lin Calel - Dúo de amor - D'Esposito-López Manzitti.pdf",
    },
    {
      from: "Corno F 3 y 4 - Lin Calel - Dúo de amor - D'Esposito-López Manzitti.pdf",
      to: "Corno F 3y4 - Lin Calel - Dúo de amor - D'Esposito-López Manzitti.pdf",
    },
    {
      from: "Piccolo - Lin Calel - Dúo de amor - D'Esposito-López Manzitti.pdf",
      to: "Fl Piccolo - Lin Calel - Dúo de amor - D'Esposito-López Manzitti.pdf",
    },
  ],
};

export function foldName(s) {
  return String(s || "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/** Sufijo de instrumento del nombre de origen (después del último « - »). */
export function sourceSuffix(fileName) {
  const base = fileName.replace(/\.pdf$/i, "");
  const i = base.lastIndexOf(" - ");
  return (i >= 0 ? base.slice(i + 3) : base).trim();
}

/** Instrumento canónico OFRN a partir del sufijo de origen. */
export function canonicalInstrumentFromSuffix(suffixRaw) {
  const s = foldName(suffixRaw);
  const num = (re) => s.match(re);
  let m;
  if (s === "arpa") return "Arpa";
  if ((m = num(/^clarinete(?: bb)? (\d)$/))) return `Clarinete Bb ${m[1]}`;
  if (s === "clarinete i") return "Clarinete Bb 1";
  if (s === "clarinete ii") return "Clarinete Bb 2";
  if (s === "clarinetes" || s === "clarinete 1 y 2") return "Clarinete Bb 1y2";
  if (s === "clarinete bajo") return "Clarinete Bajo";
  if ((m = num(/^corno (\d) y (\d)$/))) return `Corno F ${m[1]}y${m[2]}`;
  if ((m = num(/^corno (\d)$/))) return `Corno F ${m[1]}`;
  if (s === "corno ingles") return "Corno Inglés";
  if ((m = num(/^fagot (\d) y (\d)$/))) return `Fagot ${m[1]}y${m[2]}`;
  if ((m = num(/^fagot (\d)$/))) return `Fagot ${m[1]}`;
  if ((m = num(/^flauta (\d) y (\d)$/))) return `Flauta ${m[1]}y${m[2]}`;
  if ((m = num(/^flauta (\d)$/))) return `Flauta ${m[1]}`;
  if (s === "piccolo") return "Fl Piccolo";
  if (s === "oboes") return "Oboe 1y2";
  if (s === "oboes y ci") return "Oboe 2 y Corno Inglés";
  if ((m = num(/^oboe (\d)$/))) return `Oboe ${m[1]}`;
  if (s === "percusion") return "Perc Percusión";
  if (s === "timbales") return "Perc Timbales";
  if (s === "marimba y percusion") return "Perc Marimba y Percusión";
  if ((m = num(/^trombon (\d) y (\d)$/))) return `Trombón ${m[1]}y${m[2]}`;
  if ((m = num(/^trombon (\d)$/))) return `Trombón ${m[1]}`;
  if ((m = num(/^trompeta (\d) y (\d)$/))) return `Trompeta ${m[1]}y${m[2]}`;
  if ((m = num(/^trompeta (\d)$/))) return `Trompeta ${m[1]}`;
  if (s === "tuba") return "Tuba";
  if (s === "vc y cb") return "Violoncello y Contrabajo";
  if (s === "violoncello") return "Violoncello";
  if (s === "contrabajo") return "Contrabajo";
  if (s === "viola") return "Viola";
  if ((m = num(/^violin (\d)$/))) return `Violín ${m[1]}`;
  return null;
}

export function canonicalName(instrument, fileTitle, composerTag) {
  return `${instrument} - ${fileTitle} - ${composerTag}.pdf`;
}
