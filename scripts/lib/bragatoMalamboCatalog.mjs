/**
 * José Bragato — Ritmos de Malambo (orquesta de cuerdas).
 * Fuente: C:\Users\marti\Downloads\Bragato.pdf (manuscrito escaneado, 35 pp.).
 */
export const PARA_ACOMODAR_ROOT =
  process.env.PARA_ACOMODAR_ROOT ||
  "H:\\Mi unidad\\Archivo General OFRN\\Para acomodar";

export const PARA_ACOMODAR_FOLDER_ID = "10ap1aEjq3X9bFRB3z4DQ-F0fB7y3JutI";

export const BRAGATO_SOURCE_PDF =
  process.env.BRAGATO_PDF || "C:\\Users\\marti\\Downloads\\Bragato.pdf";

export const BRAGATO_MALAMBO_WORK = {
  key: "bragatoMalambo",
  sourcePdf: BRAGATO_SOURCE_PDF,
  targetFolder: "Bragato, J. - Ritmos de Malambo",
  titulo: "<p>Ritmos de Malambo</p>",
  workTitle: "Ritmos de Malambo",
  workNumber: null,
  composerTag: "Bragato, J",
  compositor: { apellido: "Bragato", nombre: "José" },
  arranger: null,
  anio: 1983,
  duracion_segundos: null,
  observaciones:
    "Para acomodar — Bragato, J. - Ritmos de Malambo. Manuscrito orquesta de cuerdas (Bs. Aires, nov. 1983; 181 compases). PDF fuente Bragato.pdf (35 pp.): SCORE 1–15 + partes.",
  splits: [
    {
      pdf: "Bragato.pdf",
      parts: [
        { instrument: "SCORE", start: 1, end: 15 },
        { instrument: "Violín 1", start: 16, end: 19 },
        { instrument: "Violín 2", start: 20, end: 23 },
        { instrument: "Viola", start: 24, end: 27 },
        { instrument: "Violoncello", start: 28, end: 31 },
        { instrument: "Contrabajo", start: 32, end: 35 },
      ],
    },
  ],
};
