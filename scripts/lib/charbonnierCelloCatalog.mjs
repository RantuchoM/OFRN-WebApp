/**
 * Charbonnier — Concierto para cello y orquesta estreno / Nro. 1 (obra 3401).
 * Drive: https://drive.google.com/drive/folders/1vFvK6DAgrMKYjd90F7sPlGoz3uR621_m
 *
 * 3 PDFs de particellas (1 por movimiento) → split por instrumento → merge I+II+III.
 * SCORE ya unificado. Audios de ensayo sin extensión → AUDIO - …
 */
export const PARA_ACOMODAR_ROOT =
  process.env.PARA_ACOMODAR_ROOT ||
  "H:\\Mi unidad\\Archivo General OFRN\\Para acomodar";

export const CHARBONNIER_CELLO_DRIVE =
  "https://drive.google.com/drive/folders/1vFvK6DAgrMKYjd90F7sPlGoz3uR621_m";

export const CHARBONNIER_CELLO_WORK = {
  sourceFolder: "Charbonnier, M. - Concierto para cello y orquesta estreno",
  targetFolder: "Charbonnier, M. - Concierto para cello y orquesta estreno",
  titulo: "Concierto para Violoncello y orquesta Nro. 1",
  tituloDb:
    "<p>Concierto para Violoncello y orquesta Nro. 1</p><div>&nbsp; I. Allegro</div><div>&nbsp; II. Adagietto</div><div>&nbsp; III. Prestissimo</div>",
  workNumber: null,
  composerTag: "Charbonnier, M",
  compositor: { apellido: "Charbonnier", nombre: "Mauricio" },
  obraId: 3401,
  driveFolderId: "1vFvK6DAgrMKYjd90F7sPlGoz3uR621_m",
  action: "update",
  anio: null,
  scorePdf: "Concierto para Violoncello y orquesta full score - Mauricio Charbonnier .pdf",
  /**
   * Audios de ensayo (sin extensión en Drive). Orden I–III.
   * Se renombran a AUDIO - … al procesar.
   */
  audioSources: [
    {
      from: "Concierto para Violoncello y orquesta  N° 1 Primer movimiento Allegro",
      label: "I. Allegro",
    },
    {
      from: "Concierto para violoncello segundo movimiento Adagietto",
      label: "II. Adagietto",
    },
    {
      from: "Concierto para violoncello tercer movimiento Prestissimo",
      label: "III. Prestissimo",
    },
  ],
  /** Split por movimiento; instrument = etiqueta OFRN canónica. */
  splits: [
    {
      pdf: "Particellas Primer movimiento .pdf",
      mov: 1,
      parts: [
        { instrument: "Fagot 2", start: 2, end: 4 },
        { instrument: "Trompeta 2", start: 5, end: 7 },
        { instrument: "Clarinete Bb 1", start: 8, end: 10 },
        { instrument: "Clarinete Bb 2", start: 11, end: 13 },
        { instrument: "Oboe 2", start: 14, end: 16 },
        { instrument: "Trompeta 1", start: 17, end: 19 },
        { instrument: "Trombón 2", start: 20, end: 22 },
        { instrument: "Oboe 1", start: 23, end: 25 },
        { instrument: "Perc Timbal", start: 26, end: 28 },
        { instrument: "Violoncello Solo", start: 29, end: 32 },
        { instrument: "Viola", start: 33, end: 36 },
        { instrument: "Trombón 1", start: 37, end: 39 },
        { instrument: "Flauta 2", start: 40, end: 42 },
        { instrument: "Corno F 2", start: 43, end: 45 },
        { instrument: "Tuba", start: 46, end: 48 },
        { instrument: "Violín 2", start: 49, end: 52 },
        { instrument: "Violoncello", start: 53, end: 56 },
        { instrument: "Contrabajo", start: 57, end: 60 },
        { instrument: "Perc Platillo", start: 61, end: 63 },
        { instrument: "Flauta 1", start: 64, end: 66 },
        { instrument: "Fagot 1", start: 67, end: 69 },
        { instrument: "Corno F 1", start: 70, end: 72 },
        { instrument: "Violín 1", start: 73, end: 77 },
      ],
    },
    {
      pdf: "Particellas Segundo Movimiento.pdf",
      mov: 2,
      parts: [
        { instrument: "Trompeta 1", start: 1, end: 3 },
        { instrument: "Fagot 2", start: 4, end: 6 },
        { instrument: "Oboe 2", start: 7, end: 9 },
        { instrument: "Fagot 1", start: 10, end: 12 },
        { instrument: "Corno F 2", start: 13, end: 15 },
        { instrument: "Violín 1", start: 16, end: 18 },
        { instrument: "Flauta 1", start: 19, end: 21 },
        { instrument: "Viola", start: 22, end: 24 },
        { instrument: "Tuba", start: 25, end: 27 },
        { instrument: "Oboe 1", start: 28, end: 30 },
        { instrument: "Trombón 2", start: 31, end: 33 },
        { instrument: "Flauta 2", start: 34, end: 36 },
        { instrument: "Trombón 1", start: 37, end: 39 },
        { instrument: "Clarinete Bb 1", start: 40, end: 42 },
        { instrument: "Trompeta 2", start: 43, end: 45 },
        { instrument: "Corno F 1", start: 46, end: 48 },
        { instrument: "Clarinete Bb 2", start: 49, end: 51 },
        { instrument: "Contrabajo", start: 52, end: 55 },
        { instrument: "Violoncello Solo", start: 56, end: 59 },
        { instrument: "Violín 2", start: 60, end: 62 },
        { instrument: "Violoncello", start: 63, end: 66 },
      ],
    },
    {
      pdf: "Particellas Tercer movimiento .pdf",
      mov: 3,
      parts: [
        { instrument: "Viola", start: 1, end: 4 },
        { instrument: "Trombón 1", start: 5, end: 7 },
        { instrument: "Tuba", start: 8, end: 10 },
        { instrument: "Clarinete Bb 1", start: 11, end: 13 },
        { instrument: "Clarinete Bb 2", start: 14, end: 16 },
        { instrument: "Trompeta 2", start: 17, end: 19 },
        { instrument: "Perc Timbal", start: 20, end: 22 },
        { instrument: "Oboe 2", start: 23, end: 25 },
        { instrument: "Oboe 1", start: 26, end: 28 },
        { instrument: "Trompeta 1", start: 29, end: 31 },
        { instrument: "Violín 1", start: 32, end: 35 },
        { instrument: "Violoncello", start: 36, end: 39 },
        { instrument: "Flauta 2", start: 40, end: 42 },
        { instrument: "Fagot 1", start: 43, end: 46 },
        { instrument: "Corno F 1", start: 47, end: 49 },
        { instrument: "Perc Platillo", start: 50, end: 52 },
        { instrument: "Flauta 1", start: 53, end: 55 },
        { instrument: "Fagot 2", start: 56, end: 58 },
        { instrument: "Trombón 2", start: 59, end: 61 },
        { instrument: "Contrabajo", start: 62, end: 65 },
        { instrument: "Violoncello Solo", start: 66, end: 69 },
        { instrument: "Violín 2", start: 70, end: 73 },
        { instrument: "Corno F 2", start: 74, end: 76 },
      ],
    },
  ],
  crops: [],
  merges: [],
};
