/**
 * Prokofiev — Romeo y Julieta Suites n°1 (op.64a) y n°2 (op.64b).
 * PDFs ya por instrumento. Cuerdas: versión con arcos = canónica;
 * SEM ARCADAS se guarda como extra `(sin arcos)` (no crea particella).
 */
export const PARA_ACOMODAR_ROOT =
  process.env.PARA_ACOMODAR_ROOT ||
  "H:\\Mi unidad\\Archivo General OFRN\\Para acomodar";

export const PARA_ACOMODAR_FOLDER_ID = "10ap1aEjq3X9bFRB3z4DQ-F0fB7y3JutI";

export const DOWNLOADS_PARA_ACOMODAR =
  process.env.DOWNLOADS_PARA_ACOMODAR ||
  "c:\\Users\\marti\\Downloads\\Para acomodar";

const COMPOSITOR = { apellido: "Prokofiev", nombre: "Sergei" };

function suiteRenames(suiteRe, extras = []) {
  const s = suiteRe;
  return [
    { re: `${s}.*partitura\\.pdf$`, instrument: "SCORE" },
    { re: `${s}.*flauta 1\\.pdf$`, instrument: "Flauta 1" },
    { re: `${s}.*flauta 2\\.pdf$`, instrument: "Flauta 2" },
    { re: `${s}.*flautim\\.pdf$`, instrument: "Fl Piccolo" },
    { re: `${s}.*oboe.? 1\\.pdf$`, instrument: "Oboe 1" },
    { re: `${s}.*oboe.? 2\\.pdf$`, instrument: "Oboe 2" },
    { re: `${s}.*corne[- ]?ingl`, instrument: "Ob EH" },
    { re: `${s}.*clarient[ae] 1\\.pdf$|${s}.*clarinet[ae] 1\\.pdf$`, instrument: "Clarinete Bb 1" },
    { re: `${s}.*clarinet[ae] 2\\.pdf$`, instrument: "Clarinete Bb 2" },
    { re: `${s}.*clarone\\.pdf$`, instrument: "Clarinete Bajo" },
    { re: `${s}.*fagote 1\\.pdf$`, instrument: "Fagot 1" },
    { re: `${s}.*fagote 2\\.pdf$`, instrument: "Fagot 2" },
    { re: `${s}.*contrafagote\\.pdf$`, instrument: "Contrafagot" },
    { re: `${s}.*saxofone tenor\\.pdf$`, instrument: "Saxo Tenor" },
    { re: `${s}.*trompa 1\\.pdf$`, instrument: "Corno F 1" },
    { re: `${s}.*trompa 2\\.pdf$`, instrument: "Corno F 2" },
    { re: `${s}.*trompa 3\\.pdf$`, instrument: "Corno F 3" },
    { re: `${s}.*trompa 4\\.pdf$`, instrument: "Corno F 4" },
    { re: `${s}.*trompete 1\\.pdf$`, instrument: "Trompeta 1" },
    { re: `${s}.*trompete 2\\.pdf$`, instrument: "Trompeta 2" },
    { re: `${s}.*cornett?o|${s}.*corneto`, instrument: "Trompeta Corneta" },
    { re: `${s}.*trombone 1\\.pdf$`, instrument: "Trombón 1" },
    { re: `${s}.*trombone 2\\.pdf$`, instrument: "Trombón 2" },
    { re: `${s}.*trombone 3\\.pdf$`, instrument: "Trombón 3" },
    { re: `${s}.*tuba\\.pdf$`, instrument: "Tuba" },
    { re: `${s}.*ti.?mpanos\\.pdf$`, instrument: "Perc Timbal" },
    { re: `${s}.*harpa\\.pdf$`, instrument: "Arpa" },
    { re: `${s}.*violino 1\\.pdf$`, instrument: "Violín 1" },
    { re: `${s}.*violino 2\\.pdf$`, instrument: "Violín 2" },
    { re: `${s}.*viola\\.pdf$`, instrument: "Viola" },
    { re: `${s}.*violoncelo\\.pdf$`, instrument: "Violoncello" },
    { re: `${s}.*contrabaixo\\.pdf$`, instrument: "Contrabajo" },
    {
      re: `${s}.*violino 1.*(sem|serm|arcsdas)`,
      instrument: "Violín 1",
      variant: "sin-arcos",
    },
    {
      re: `${s}.*violino 2.*(sem|serm|arcsdas)`,
      instrument: "Violín 2",
      variant: "sin-arcos",
    },
    {
      re: `${s}.*viola.*(sem|serm|arcsdas)`,
      instrument: "Viola",
      variant: "sin-arcos",
    },
    {
      re: `${s}.*violoncelo.*(sem|serm|arcsdas)`,
      instrument: "Violoncello",
      variant: "sin-arcos",
    },
    {
      re: `${s}.*contrabaixo.*(sem|serm|arcsdas)`,
      instrument: "Contrabajo",
      variant: "sin-arcos",
    },
    ...extras,
  ];
}

export const PROKOFIEV_ROMEO_SUITE1_WORK = {
  sourceMatch: /64a|suite n.?\s*1/i,
  targetFolder: "Prokofiev, S. - Romeo y Julieta Suite n°1",
  titulo: "Romeo y Julieta Suite n°1",
  workNumber: "op.64a",
  composerTag: "Prokofiev, S",
  compositor: COMPOSITOR,
  action: "insert",
  anio: 1936,
  splits: [],
  crops: [],
  obraId: 3635,
  driveFolderId:
    process.env.PROKOFIEV_ROMEO1_DRIVE_FOLDER_ID ||
    "1Jnq3qC2d88V_A4xirKwBc5o74biC-UwL",
  renames: suiteRenames("suite 1", [
    { re: "suite 1.*bombo", instrument: "Perc Bombo" },
    { re: "suite 1.*pratos", instrument: "Perc Platillo" },
    { re: "suite 1.*tamburo militar", instrument: "Perc Tambor" },
    { re: "suite 1.*tria.?ngulo\\.pdf$", instrument: "Perc Triángulo" },
    { re: "suite 1.*xilofone", instrument: "Perc Xilófono" },
    { re: "suite 1.*piano\\.pdf$", instrument: "Piano" },
  ]),
};

export const PROKOFIEV_ROMEO_SUITE2_WORK = {
  sourceMatch: /64b|suite n.?\s*2/i,
  targetFolder: "Prokofiev, S. - Romeo y Julieta Suite n°2",
  titulo: "Romeo y Julieta Suite n°2",
  workNumber: "op.64b",
  composerTag: "Prokofiev, S",
  compositor: COMPOSITOR,
  action: "insert",
  anio: 1936,
  splits: [],
  crops: [],
  obraId: 3636,
  driveFolderId:
    process.env.PROKOFIEV_ROMEO2_DRIVE_FOLDER_ID ||
    "1RkiXvhzCtAEwDYFCXSL8r_HkLrNCiGQ_",
  renames: suiteRenames("suite (?:n.?\\s*)?2", [
    {
      re: "suite.*2.*campanelli.*tamburino|suite.*2.*tamburino.*piatti",
      instrument: "Perc Percusión 1",
    },
    {
      re: "suite.*2.*tria.?ngulo.*gran cassa|suite.*2.*maracas",
      instrument: "Perc Percusión 2",
    },
    { re: "suite.*2.*tamburo militar", instrument: "Perc Tambor" },
    {
      re: "suite.*2.*piano e celesta\\.pdf$",
      instrument: "Piano",
      alsoInstruments: ["Celesta"],
    },
  ]),
};

export const PROKOFIEV_ROMEO_WORKS = [
  PROKOFIEV_ROMEO_SUITE1_WORK,
  PROKOFIEV_ROMEO_SUITE2_WORK,
];

export function driveFolderUrl(id) {
  if (!id) return null;
  return `https://drive.google.com/open?id=${id}`;
}
