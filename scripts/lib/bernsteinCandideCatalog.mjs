/**
 * Bernstein — Obertura Candide (obra nueva).
 * PDFs ya por instrumento (pt/es, sin combinados IMSLP). Música en p.1.
 */
export const PARA_ACOMODAR_ROOT =
  process.env.PARA_ACOMODAR_ROOT ||
  "H:\\Mi unidad\\Archivo General OFRN\\Para acomodar";

export const PARA_ACOMODAR_FOLDER_ID = "10ap1aEjq3X9bFRB3z4DQ-F0fB7y3JutI";

export const DOWNLOADS_PARA_ACOMODAR =
  process.env.DOWNLOADS_PARA_ACOMODAR ||
  "c:\\Users\\marti\\Downloads\\Para acomodar";

export const BERNSTEIN_CANDIDE_WORK = {
  sourceMatch: /candide/i,
  targetFolder: "Bernstein, L. - Obertura Candide",
  titulo: "Obertura Candide",
  workNumber: null,
  composerTag: "Bernstein, L",
  compositor: { apellido: "Bernstein", nombre: "Leonard" },
  obraId: 3634,
  action: "insert",
  anio: 1956,
  splits: [],
  crops: [],
  driveFolderId:
    process.env.BERNSTEIN_CANDIDE_DRIVE_FOLDER_ID ||
    "1OzJiBhVGdhiFU6-AkBpYeLSsLb69jaj3",
  renames: [
    { re: "full score\\.pdf$", instrument: "SCORE" },
    { re: "(?<![ivx])i flauta\\.pdf$", instrument: "Flauta 1" },
    { re: "(?<![ivx])ii flauta\\.pdf$", instrument: "Flauta 2" },
    { re: "piccolo\\.pdf$", instrument: "Fl Piccolo" },
    { re: "(?<![ivx])i obo", instrument: "Oboe 1" },
    { re: "(?<![ivx])ii obo", instrument: "Oboe 2" },
    { re: "requinta\\.pdf$", instrument: "Clarinete Requinto" },
    { re: "(?<![ivx])i clarinete\\.pdf$", instrument: "Clarinete Bb 1" },
    { re: "(?<![ivx])ii clarinete\\.pdf$", instrument: "Clarinete Bb 2" },
    { re: "clarone\\.pdf$", instrument: "Clarinete Bajo" },
    { re: "(?<![ivx])i fagote\\.pdf$", instrument: "Fagot 1" },
    { re: "(?<![ivx])ii fagote\\.pdf$", instrument: "Fagot 2" },
    { re: "contrafagote\\.pdf$", instrument: "Contrafagot" },
    { re: "(?<![ivx])i trompa\\.pdf$", instrument: "Corno F 1" },
    { re: "(?<![ivx])ii trompa\\.pdf$", instrument: "Corno F 2" },
    { re: "(?<![ivx])iii trompa\\.pdf$", instrument: "Corno F 3" },
    { re: "(?<![ivx])iv trompa\\.pdf$", instrument: "Corno F 4" },
    { re: "(?<![ivx])i trompete\\.pdf$", instrument: "Trompeta 1" },
    { re: "(?<![ivx])ii trompete\\.pdf$", instrument: "Trompeta 2" },
    { re: "(?<![ivx])i trombone\\.pdf$", instrument: "Trombón 1" },
    { re: "(?<![ivx])ii trombone\\.pdf$", instrument: "Trombón 2" },
    { re: "(?<![ivx])iii trombone\\.pdf$", instrument: "Trombón 3" },
    { re: "tuba\\.pdf$", instrument: "Tuba" },
    { re: "timpani\\.pdf$", instrument: "Perc Timbal" },
    { re: "percuss", instrument: "Perc Percusión" },
    { re: "harpa\\.pdf$", instrument: "Arpa" },
    { re: "i violino\\.pdf$", instrument: "Violín 1" },
    { re: "ii violino\\.pdf$", instrument: "Violín 2" },
    { re: "viola\\.pdf$", instrument: "Viola" },
    { re: "cello\\.pdf$", instrument: "Violoncello" },
    { re: "baixo\\.pdf$", instrument: "Contrabajo" },
  ],
};

export function driveFolderUrl(id) {
  if (!id) return null;
  return `https://drive.google.com/open?id=${id}`;
}
