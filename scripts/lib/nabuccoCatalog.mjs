/**
 * Verdi — Coro de los Esclavos ('Nabucco') / Va pensiero (IMSLP Feduol).
 * Drive: https://drive.google.com/drive/folders/1JDPuJjP9-36lQ5RTOJSVq9dzFmMUCKqV
 *
 * Los PDFs ya estaban renombrados con el mapa IMSLP invertido (vientos ciclados).
 * Rangos verificados con OCR (Tesseract eng+spa) sobre encabezados de página.
 */
export const LOCAL_ARIAS =
  process.env.ARIAS_ROOT ||
  "H:\\Mi unidad\\Archivo General OFRN\\ARIAS";

export const NABUCCO_DRIVE_FOLDER =
  "https://drive.google.com/drive/folders/1JDPuJjP9-36lQ5RTOJSVq9dzFmMUCKqV";

export const NABUCCO_WORK = {
  targetFolder: "Verdi, G. - Coro de los Esclavos ('Nabucco')",
  titulo: "Coro de los Esclavos ('Nabucco')",
  workNumber: "15 BIS",
  composerTag: "Verdi, G",
  compositor: { apellido: "Verdi", nombre: "Giuseppe" },
  /** Copia Oficial en Archivo (misma carpeta Drive ARIAS). */
  obraId: 3548,
  driveFolderId: "1JDPuJjP9-36lQ5RTOJSVq9dzFmMUCKqV",
  anio: 1842,
  /**
   * Fuentes = nombres actuales (mal asignados). Tras split se borran.
   * Contienen varias partes ya sin portada IMSLP (edición typeset Feduol).
   */
  splits: [
    {
      pdf: "Oboe 1-2 - 15 BIS. Coro de los Esclavos ('Nabucco') - Verdi, G.pdf",
      parts: [
        { instrument: "Fl Piccolo", start: 1, end: 1 },
        { instrument: "Flauta", start: 2, end: 3 },
      ],
    },
    {
      pdf: "Clarinete A 1-2 - 15 BIS. Coro de los Esclavos ('Nabucco') - Verdi, G.pdf",
      parts: [
        { instrument: "Oboe 1", start: 1, end: 2 },
        { instrument: "Oboe 2", start: 3, end: 3 },
      ],
    },
    {
      pdf: "Fagot 1-2 - 15 BIS. Coro de los Esclavos ('Nabucco') - Verdi, G.pdf",
      parts: [
        { instrument: "Clarinete A 1", start: 1, end: 2 },
        { instrument: "Clarinete A 2", start: 3, end: 4 },
      ],
    },
    {
      pdf: "Corno F 1-2 - 15 BIS. Coro de los Esclavos ('Nabucco') - Verdi, G.pdf",
      parts: [
        { instrument: "Fagot 1", start: 1, end: 2 },
        { instrument: "Fagot 2", start: 3, end: 4 },
      ],
    },
    {
      pdf: "Corno F 3-4 - 15 BIS. Coro de los Esclavos ('Nabucco') - Verdi, G.pdf",
      parts: [
        { instrument: "Corno F 1", start: 1, end: 1 },
        { instrument: "Corno F 2", start: 2, end: 2 },
        { instrument: "Corno F 3", start: 3, end: 4 },
        { instrument: "Corno F 4", start: 5, end: 6 },
      ],
    },
    {
      pdf: "Trompeta 1-2 - 15 BIS. Coro de los Esclavos ('Nabucco') - Verdi, G.pdf",
      parts: [
        { instrument: "Trompeta 1", start: 1, end: 1 },
        { instrument: "Trompeta 2", start: 2, end: 2 },
      ],
    },
    {
      pdf: "Trombón 1-3 - 15 BIS. Coro de los Esclavos ('Nabucco') - Verdi, G.pdf",
      parts: [
        { instrument: "Trombón 1", start: 1, end: 1 },
        { instrument: "Trombón 2", start: 2, end: 2 },
        { instrument: "Trombón 3", start: 3, end: 3 },
      ],
    },
  ],
  /** Portada tipográfica del SCORE (p1). */
  crops: [
    {
      pdf: "SCORE - 15 BIS. Coro de los Esclavos ('Nabucco') - Verdi, G.pdf",
      instrument: "SCORE",
      start: 2,
      end: 22,
    },
  ],
};
