/**
 * Weber — Concierto para fagot, Op. 75 (obra 2337, ya en archivo).
 * Score de Descargas = IMSLP #799584, Breitkopf & Härtel, placa O.B. 4867.
 * Partes de la misma placa (M.kowalski49): solo #799585 y orquesta #799586–799595.
 * No es 1y2: cada par viene seguido en el PDF (I y después II). Se parte.
 * Portada tipográfica suelta (y la hoja en blanco del score) se recorta;
 * la primera hoja grabada, con título y música, se conserva.
 */
export const WEBER_FAGOT_DRIVE_FOLDER_ID = "1gIwdo0CbGNe-vBT3p8OdmPnCPaX2lwU1";

export const WEBER_FAGOT_DIR =
  "H:\\Mi unidad\\Archivo General OFRN\\ORQUESTA\\Weber, Carl Maria\\Weber, C.M. - Concierto para Fagot en Fa mayor, Op. 75";

export const WEBER_FAGOT_DOWNLOADS =
  process.env.WEBER_FAGOT_DOWNLOADS ||
  "C:\\Users\\marti\\Downloads\\weber-op75-breitkopf";

export const WEBER_FAGOT_SCORE_SOURCE =
  process.env.WEBER_FAGOT_SCORE ||
  "C:\\Users\\marti\\Downloads\\IMSLP799584-PMLP47593-00._WEBER_-_CONCERTO_FOR_BASSOON,_OP._75_(J.127)_-_Conductor_Score.pdf";

export const WEBER_FAGOT_WORK = {
  obraId: 2337,
  titulo: "Concierto para Fagot en Fa mayor",
  workNumber: "op.75",
  composerTag: "Weber, C.M",
  plate: "O.B. 4867",
  imslpWork:
    "https://imslp.org/wiki/Bassoon_Concerto_in_F_major,_Op.75_(Weber,_Carl_Maria_von)",
  driveFolderId: WEBER_FAGOT_DRIVE_FOLDER_ID,
  splits: [
    {
      pdf: "IMSLP799584-score.pdf",
      source: "score",
      parts: [{ instrument: "SCORE", start: 3, end: 36 }],
    },
    {
      pdf: "Fagot Solo [IMSLP799585].pdf",
      parts: [{ instrument: "Fagot Solo", start: 1, end: 8 }],
    },
    {
      pdf: "Fagot 1-2 [IMSLP799588].pdf",
      parts: [
        { instrument: "Fagot 1", start: 1, end: 3 },
        { instrument: "Fagot 2", start: 4, end: 6 },
      ],
    },
    {
      pdf: "Flauta 1-2 [IMSLP799586].pdf",
      parts: [
        { instrument: "Flauta 1", start: 1, end: 4 },
        { instrument: "Flauta 2", start: 5, end: 8 },
      ],
    },
    {
      pdf: "Oboe 1-2 [IMSLP799587].pdf",
      parts: [
        { instrument: "Oboe 1", start: 1, end: 3 },
        { instrument: "Oboe 2", start: 4, end: 6 },
      ],
    },
    {
      pdf: "Corno 1-2 [IMSLP799589].pdf",
      parts: [
        { instrument: "Corno F 1", start: 1, end: 3 },
        { instrument: "Corno F 2", start: 4, end: 6 },
      ],
    },
    {
      pdf: "Trompeta 1-2 [IMSLP799590].pdf",
      parts: [
        { instrument: "Trompeta 1", start: 2, end: 3 },
        { instrument: "Trompeta 2", start: 5, end: 6 },
      ],
    },
    {
      pdf: "Timpani [IMSLP799591].pdf",
      parts: [{ instrument: "Perc Timbal", start: 2, end: 3 }],
    },
    {
      pdf: "Violin I [IMSLP799592].pdf",
      parts: [{ instrument: "Violín 1", start: 1, end: 8 }],
    },
    {
      pdf: "Violin II [IMSLP799593].pdf",
      parts: [{ instrument: "Violín 2", start: 1, end: 8 }],
    },
    {
      pdf: "Viola [IMSLP799594].pdf",
      parts: [{ instrument: "Viola", start: 1, end: 8 }],
    },
    {
      pdf: "Cellos-Basses [IMSLP799595].pdf",
      parts: [{ instrument: "Violoncello y Contrabajo", start: 1, end: 8 }],
    },
  ],
};
