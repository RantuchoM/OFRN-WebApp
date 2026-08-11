/**
 * Charbonnier — Voces latinoamericanas (obra 3201) desde Para acomodar.
 * Drive: https://drive.google.com/open?id=1O1SbcEF6V0g9F4hxdwC-Lsns9IcFJjL3
 *
 * Fuentes: score (19 p.) + partes combinadas (39 p.). Portadas p.1 sin música.
 */
export const PARA_ACOMODAR_ROOT =
  process.env.PARA_ACOMODAR_ROOT ||
  "H:\\Mi unidad\\Archivo General OFRN\\Para acomodar";

export const CHARBONNIER_VOCES_DRIVE_FOLDER =
  "https://drive.google.com/open?id=1O1SbcEF6V0g9F4hxdwC-Lsns9IcFJjL3";

export const CHARBONNIER_VOCES_WORK = {
  sourceFolder: "Charbonnnier, M. - Voces latinoamericanas",
  targetFolder: "Charbonnier, M. - Voces latinoamericanas",
  titulo: "Voces latinoamericanas",
  workNumber: null,
  composerTag: "Charbonnier, M",
  compositor: { apellido: "Charbonnier", nombre: "Mauricio" },
  obraId: 3201,
  driveFolderId: "1O1SbcEF6V0g9F4hxdwC-Lsns9IcFJjL3",
  action: "update",
  /** PDF de partes individuales combinadas (sin portada). */
  splits: [
    {
      pdf: "Voces latinoamericanas .pdf",
      parts: [
        { instrument: "Clarinete Bb 1", start: 2, end: 3 },
        { instrument: "Oboe 1", start: 4, end: 5 },
        { instrument: "Fagot 1", start: 6, end: 7 },
        { instrument: "Violín 2", start: 8, end: 10 },
        { instrument: "Oboe 2", start: 11, end: 12 },
        { instrument: "Fagot 2", start: 13, end: 14 },
        { instrument: "Soprano", start: 15, end: 17 },
        { instrument: "Flauta 2", start: 18, end: 19 },
        { instrument: "Corno F 1", start: 20, end: 21 },
        { instrument: "Corno F 2", start: 22, end: 23 },
        { instrument: "Clarinete Bb 2", start: 24, end: 25 },
        { instrument: "Contrabajo", start: 26, end: 28 },
        { instrument: "Viola", start: 29, end: 31 },
        { instrument: "Flauta 1", start: 32, end: 33 },
        { instrument: "Violoncello", start: 34, end: 36 },
        { instrument: "Violín 1", start: 37, end: 39 },
      ],
    },
  ],
  /** Score trasponiendo: p.1 portada, p.2–19 música. */
  crops: [
    {
      pdf: "Voces latinoamericanas  (1).pdf",
      instrument: "SCORE",
      start: 2,
      end: 19,
    },
  ],
};
