/**
 * Holst — Hammersmith, Op. 52 (versión banda Boosey Q.M.B. 225).
 * SCORE: whole (sin inspección por instrumento). Rangos por OCR de encabezados.
 */
export const PARA_ACOMODAR_ROOT =
  process.env.PARA_ACOMODAR_ROOT ||
  "H:\\Mi unidad\\Archivo General OFRN\\Para acomodar";

export const HAMMERSMITH_BANDA_WORK = {
  sourceFolder: "Holst, G. - Hammersmith, Op. 52 [banda]",
  targetFolder: "Holst, G. - Hammersmith, Op. 52 [banda]",
  titulo:
    "<p>Hammersmith (Prelude and Scherzo), Op. 52</p><div>&nbsp; [versión banda]</div>",
  workNumber: "op.52",
  composerTag: "Holst, G",
  compositor: { apellido: "Holst", nombre: "Gustav" },
  anio: 1930,
  driveFolderId: process.env.HAMMERSMITH_BANDA_DRIVE_FOLDER_ID || "",
  splits: [
    {
      pdf: "IMSLP496680-Clarinet.pdf",
      parts: [
        { instrument: "Clarinete Eb 1y2", start: 1, end: 4 },
        { instrument: "Clarinete Bb Solo", start: 5, end: 8 },
        { instrument: "Clarinete Bb 1", start: 10, end: 12 },
        { instrument: "Clarinete Bb 2", start: 13, end: 15 },
        { instrument: "Clarinete Bb 3", start: 16, end: 19 },
      ],
    },
    {
      pdf: "IMSLP496682-Sax.pdf",
      parts: [
        { instrument: "Saxo Alto", start: 1, end: 3 },
        { instrument: "Saxo Tenor", start: 4, end: 6 },
      ],
    },
    {
      pdf: "IMSLP496683-Horn.pdf",
      parts: [
        { instrument: "Corno F 1y2", start: 1, end: 4 },
        { instrument: "Corno F 3y4", start: 5, end: 7 },
      ],
    },
    {
      pdf: "IMSLP496684-CornetTrumpet.pdf",
      parts: [
        { instrument: "Corneta Bb Solo", start: 1, end: 3 },
        { instrument: "Corneta Bb 2", start: 4, end: 5 },
        { instrument: "Trompeta Bb 1y2", start: 6, end: 7 },
      ],
    },
    {
      pdf: "IMSLP496685-Trombone.pdf",
      parts: [
        { instrument: "Trombón 1", start: 1, end: 2 },
        { instrument: "Trombón 2", start: 3, end: 4 },
        { instrument: "Trombón 3", start: 5, end: 6 },
      ],
    },
    {
      pdf: "IMSLP496686-Baritone.pdf",
      parts: [
        { instrument: "Barítono", start: 1, end: 3 },
        { instrument: "Barítono BC", start: 4, end: 6 },
      ],
    },
  ],
  crops: [
    {
      pdf: "IMSLP495694-SCORE.pdf",
      instrument: "SCORE",
      start: 1,
      end: 48,
    },
    {
      pdf: "IMSLP496678-Flute.pdf",
      instrument: "Flauta 1y2",
      start: 1,
      end: 7,
    },
    {
      pdf: "IMSLP496679-Oboe.pdf",
      instrument: "Oboe 1y2",
      start: 1,
      end: 3,
    },
    {
      pdf: "IMSLP496681-Bassoon.pdf",
      instrument: "Fagot 1y2",
      start: 1,
      end: 3,
    },
    {
      pdf: "IMSLP496687-Tuba.pdf",
      instrument: "Tuba",
      start: 1,
      end: 4,
    },
    {
      pdf: "IMSLP496688-Perc.pdf",
      instrument: "Perc Percusión",
      start: 1,
      end: 3,
    },
  ],
};

export function driveFolderUrl(folderId) {
  return folderId ? `https://drive.google.com/open?id=${folderId}` : "";
}
