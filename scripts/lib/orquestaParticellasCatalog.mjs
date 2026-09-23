/**
 * Orquesta particellas (Drive) → Para acomodar.
 * Origen: https://drive.google.com/drive/folders/1HuUgZRVJQ72YhztEDyZNcq_U6ws--J-C
 * Suite Rutter se omite a pedido del usuario.
 *
 * PDFs ya por instrumento (música en p.1, sin portada IMSLP) → solo copia + rename.
 * Messiah: Violoncello/Contrabajo en la misma hoja (no split).
 */
export const PARA_ACOMODAR_ROOT =
  process.env.PARA_ACOMODAR_ROOT ||
  "H:\\Mi unidad\\Archivo General OFRN\\Para acomodar";

export const PARA_ACOMODAR_FOLDER_ID = "10ap1aEjq3X9bFRB3z4DQ-F0fB7y3JutI";

export const SOURCE_PARENT_FOLDER_ID = "1HuUgZRVJQ72YhztEDyZNcq_U6ws--J-C";

export const GIRA_130 = {
  id_programa: 130,
  id_repertorio: 100,
  nombre_gira: "Navidad Coral",
  bloque: "Repertorio",
};

export function driveFolderUrl(id) {
  return `https://drive.google.com/open?id=${id}`;
}

const PART = { apellido: "Pärt", nombre: "Arvo" };
const HANDEL = { apellido: "Händel", nombre: "Georg Friedrich" };

export const CHRISTMAS_LULLABY_WORK = {
  key: "christmas-lullaby",
  sourceFolder: "Christmas Lullaby Arvo Pärt",
  sourceFolderId: "1ty9kawXplUVU5TjFrv-gLRRNJ8a0AgEF",
  targetFolder: "Pärt, A. - Christmas Lullaby",
  titulo: "Christmas Lullaby",
  workNumber: null,
  composerTag: "Pärt, A",
  compositor: PART,
  action: "insert",
  obraId: 3640,
  driveFolderId: "13TrnpJsujmtxEdUedg0Zf74RVSs3l8E1",
  anio: 2002,
  splits: [],
  crops: [],
  durationQueryHint: "Arvo Part Christmas Lullaby Weihnachtliches Wiegenlied",
  observaciones:
    "Para acomodar — Pärt, A. - Christmas Lullaby. Copia canónica desde Orquesta particellas (Drive 1ty9kawXplUVU5TjFrv-gLRRNJ8a0AgEF). Cuerdas; sin SCORE.",
  renames: [
    { re: "contrabajo", instrument: "Contrabajo" },
    { re: "viola(?!n)", instrument: "Viola" },
    { re: "violonchelo|violoncello", instrument: "Violoncello" },
    { re: "viol[ií]n[_ ]?2|violin 2", instrument: "Violín 2" },
    { re: "viol[ií]n[_ ]?1|violin 1", instrument: "Violín 1" },
  ],
};

export const ESTONIAN_LULLABY_WORK = {
  key: "estonian-lullaby",
  sourceFolder: "Estonian Lullaby",
  sourceFolderId: "1KoYSLdTjpYRlTBYl-xklOhfwoAczD2zY",
  targetFolder: "Pärt, A. - Estonian Lullaby",
  titulo: "Estonian Lullaby",
  workNumber: null,
  composerTag: "Pärt, A",
  compositor: PART,
  action: "insert",
  obraId: 3641,
  driveFolderId: "13OrYDRW4L6-ii-X7GuJgxkCCiaai47Wi",
  anio: 2002,
  splits: [],
  crops: [],
  durationQueryHint: "Arvo Part Estonian Lullaby Eesti hallilaul",
  observaciones:
    "Para acomodar — Pärt, A. - Estonian Lullaby (Eesti hällilaul). Copia canónica desde Orquesta particellas (Drive 1KoYSLdTjpYRlTBYl-xklOhfwoAczD2zY). Cuerdas; falta Violín 2 y SCORE.",
  renames: [
    { re: "contrabajo", instrument: "Contrabajo" },
    { re: "viola(?!n)", instrument: "Viola" },
    { re: "violonchelo|violoncello", instrument: "Violoncello" },
    { re: "viol[ií]n[_ ]?1|violin 1", instrument: "Violín 1" },
  ],
};

export const MESSIAH_WORK = {
  key: "handel-messiah",
  sourceFolder: "Messiah",
  sourceFolderId: "1rs2kfMOFheiDgqQwOCDQpRAPpKs28ql_",
  targetFolder: "Händel, G.F. - Messiah",
  titulo: "Messiah [cuerdas y órgano]",
  workNumber: null,
  composerTag: "Händel, G.F",
  compositor: HANDEL,
  action: "insert",
  obraId: 3643,
  driveFolderId: "1WolhjGr3Aw0NsHMLVISjYUOidMkPMIjy",
  anio: 1741,
  splits: [],
  crops: [],
  skipYoutubeDuration: true,
  durationQueryHint: "Handel Messiah Sinfony Grave",
  observaciones:
    "Para acomodar — Händel, G.F. - Messiah. Copia canónica desde Orquesta particellas (Drive 1rs2kfMOFheiDgqQwOCDQpRAPpKs28ql_). Cuerdas + órgano (Der Messias, edición alemana). Violoncello y Contrabajo en la misma hoja. Sin vientos ni coro.",
  combinedCelloBass: true,
  renames: [
    {
      re: "cellos?-?basses|violoncello y contrabajo",
      instrument: "Violoncello y Contrabajo",
    },
    { re: "^[oó]rgano\\b", instrument: "Órgano" },
    { re: "viola(?!n)", instrument: "Viola" },
    { re: "viol[ií]n\\s*ii|violin ii|viol[ií]n 2", instrument: "Violín 2" },
    { re: "violin i\\b|viol[ií]n 1", instrument: "Violín 1" },
  ],
};

export const VATER_UNSER_WORK = {
  key: "vater-unser",
  sourceFolder: "Vater unser",
  sourceFolderId: "1waMy70xbGjxts1GWndboLn205N8_ggTm",
  targetFolder: "Pärt, A. - Vater unser",
  titulo: "Vater unser",
  workNumber: null,
  composerTag: "Pärt, A",
  compositor: PART,
  action: "insert",
  obraId: 3642,
  driveFolderId: "1xWff483Dvqt1DGC6c9zrsxvgYsfyh1-p",
  anio: 2005,
  splits: [],
  crops: [],
  durationQueryHint: "Arvo Part Vater unser",
  observaciones:
    "Para acomodar — Pärt, A. - Vater unser. Copia canónica desde Orquesta particellas (Drive 1waMy70xbGjxts1GWndboLn205N8_ggTm). SCORE + piano + cuerdas (Violín 1 = part 'Violín'; Violín 2 = part 'Violín (1)').",
  renames: [
    { re: "full score \\(1\\)\\.pdf$|full score \\(1\\)$", instrument: "SCORE" },
    { re: "piano", instrument: "Piano" },
    { re: "contrabajo", instrument: "Contrabajo" },
    { re: "violas?", instrument: "Viola" },
    { re: "violonchelo|violoncello", instrument: "Violoncello" },
    { re: "viol[ií]n[_ ]?\\(1\\)|viol[ií]n_\\(1\\)", instrument: "Violín 2" },
    { re: "viol[ií]n", instrument: "Violín 1" },
  ],
};

/** Suite Rutter: no procesar. */
export const SKIPPED_RUTTER = {
  sourceFolder: "Suite Rutter",
  sourceFolderId: "1sr9DU3sMzQjC0opQWtcFTEn7L5QU-WzD",
};

export const ORQUESTA_PARTICELLAS_WORKS = [
  CHRISTMAS_LULLABY_WORK,
  ESTONIAN_LULLABY_WORK,
  VATER_UNSER_WORK,
  MESSIAH_WORK,
];
