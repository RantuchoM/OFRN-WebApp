/**
 * Beethoven — Concierto triple Op. 56 (obra archivo 2458).
 * Corrige nomenclatura («Oboe»→Violín) y sync desde carpeta ORQUESTA.
 */
export const ARCHIVO_ORQUESTA_ROOT =
  process.env.ARCHIVO_ORQUESTA_ROOT ||
  "H:\\Mi unidad\\Archivo General OFRN\\ORQUESTA\\Beethoven, Ludwig van";

export const PARA_ACOMODAR_ROOT =
  process.env.PARA_ACOMODAR_ROOT ||
  "H:\\Mi unidad\\Archivo General OFRN\\Para acomodar";

export function driveFolderUrl(id) {
  return id ? `https://drive.google.com/open?id=${id}` : "";
}

export const BEETHOVEN_TRIPLE_WORK = {
  obraId: 2458,
  /** Carpeta actual en disco (pre-rename). */
  sourceFolder:
    "Beethoven, L.v. - Triple Concerto para Violín, Violoncello y Piano Op. 56",
  targetFolder: "Beethoven, L. - Concierto triple Op.56",
  titulo:
    "<p>Concierto triple en do mayor, Op. 56</p>" +
    "<div>&nbsp; I. Allegro</div>" +
    "<div>&nbsp; II. Largo</div>" +
    "<div>&nbsp; III. Rondo alla polacca</div>",
  workTitleShort: "Concierto triple",
  workNumber: "op.56",
  composerTag: "Beethoven, L",
  compositor: { apellido: "Beethoven", nombre: "Ludwig van" },
  anio: 1804,
  duracion_segundos: 2100,
  imslp:
    "https://imslp.org/wiki/Triple_Concerto,_Op.56_(Beethoven,_Ludwig_van)",
  driveFolderId: "1AX2rl3Bmdnx0fLwIc0vtbO8ck0Cx7U-Z",
  /** Solicitud temporada 2027 a fusionar → 2458 */
  mergeFromObraId: 3898,
  observacionesExtra:
    "Archivo canónico. Faltan particellas de solistas (Violín Solo, Violoncello Solo, Piano); SCORE sí está. Raw Ivdruiz #51158 en Para acomodar pendiente de split.",
  /** Rename map: nombre actual → instrumento canónico */
  renames: [
    { from: /^Clarinete 1\b/i, instrument: "Clarinete 1" },
    { from: /^Clarinete 2\b/i, instrument: "Clarinete 2" },
    { from: /^Contrabajo\b/i, instrument: "Contrabajo" },
    { from: /^Corno 1\b/i, instrument: "Corno 1" },
    { from: /^Corno 2\b/i, instrument: "Corno 2" },
    { from: /^Fagot 1\b/i, instrument: "Fagot 1" },
    { from: /^Fagot 2\b/i, instrument: "Fagot 2" },
    { from: /^Flauta\b/i, instrument: "Flauta" },
    { from: /^Oboe 1\b/i, instrument: "Oboe 1" },
    { from: /^Oboe 2\b/i, instrument: "Oboe 2" },
    { from: /^SCORE\b/i, instrument: "SCORE" },
    { from: /^Timbales\b/i, instrument: "Timbales" },
    { from: /^Trompeta 1\b/i, instrument: "Trompeta 1" },
    { from: /^Trompeta 2\b/i, instrument: "Trompeta 2" },
    { from: /^Viola\b/i, instrument: "Viola" },
    { from: /^Viol[ií]n 1\b/i, instrument: "Violín 1" },
    { from: /^Viol[ií]n 2\b/i, instrument: "Violín 2" },
    { from: /^Violoncello\b/i, instrument: "Violoncello" },
  ],
};
