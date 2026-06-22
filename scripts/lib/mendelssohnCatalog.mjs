/**
 * Mendelssohn — Sinfonía Nro 1 en Do Mayor, op.11 (IMSLP PMLP18966 / Breitkopf).
 * Drive: https://drive.google.com/open?id=1xDSqCR9Y7NPifvrD84ZpXMi_ns6YJFqR
 */
export const PARA_ACOMODAR_ROOT =
  process.env.PARA_ACOMODAR_ROOT ||
  "H:\\Mi unidad\\Archivo General OFRN\\Para acomodar";

export const MENDELSSOHN_DRIVE_FOLDER =
  "https://drive.google.com/open?id=1xDSqCR9Y7NPifvrD84ZpXMi_ns6YJFqR";

export const MENDELSSOHN_WORK = {
  sourceFolder: "Mendelssohn",
  targetFolder:
    "Mendelssohn-Bartholdy, F. - Sinfonía Nro 1 en Do Mayor, op.11",
  titulo: "Sinfonía Nro 1 en Do Mayor, op.11",
  workNumber: "op.11",
  composerTag: "Mendelssohn-Bartholdy, F",
  compositor: { apellido: "Mendelssohn-Bartholdy", nombre: "Félix" },
  /** Obra insertada en BD (2026-06-22). */
  obraId: 3535,
  action: "insert",
  driveFolderId: "1xDSqCR9Y7NPifvrD84ZpXMi_ns6YJFqR",
  anio: 1824,
  /**
   * PDFs IMSLP combinados (vientos) → particellas. Rangos verificados con OCR.
   */
  splits: [
    {
      pdf: "IMSLP35342-PMLP18966-Mendelssohn-Sym1.Flute.pdf",
      parts: [
        { instrument: "Flauta 1", start: 2, end: 6 },
        { instrument: "Flauta 2", start: 8, end: 10 },
      ],
    },
    {
      pdf: "IMSLP35344-PMLP18966-Mendelssohn-Sym1.Oboe.pdf",
      parts: [
        { instrument: "Oboe 1", start: 2, end: 5 },
        { instrument: "Oboe 2", start: 7, end: 8 },
      ],
    },
    {
      pdf: "IMSLP35341-PMLP18966-Mendelssohn-Sym1.Clarinet.pdf",
      parts: [
        { instrument: "Clarinete Bb 1", start: 2, end: 6 },
        { instrument: "Clarinete Bb 2", start: 8, end: 11 },
      ],
    },
    {
      pdf: "IMSLP35340-PMLP18966-Mendelssohn-Sym1.Bassoon.pdf",
      parts: [
        { instrument: "Fagot 1", start: 2, end: 6 },
        { instrument: "Fagot 2", start: 8, end: 9 },
      ],
    },
    {
      pdf: "IMSLP35343-PMLP18966-Mendelssohn-Sym1.Horn.pdf",
      parts: [
        { instrument: "Corno F 1", start: 2, end: 5 },
        { instrument: "Corno F 2", start: 7, end: 8 },
      ],
    },
    {
      pdf: "IMSLP35346-PMLP18966-Mendelssohn-Sym1.Trumpet.pdf",
      parts: [
        { instrument: "Trompeta 1", start: 2, end: 3 },
        { instrument: "Trompeta 2", start: 5, end: 6 },
      ],
    },
    {
      pdf: "IMSLP26264-PMLP18966-Mendelssohn_-_Symphony_No1_in_C_minor_Op11_(cello-part)a.pdf",
      parts: [
        { instrument: "Violoncello", start: 2, end: 11 },
        { instrument: "Contrabajo", start: 2, end: 11 },
      ],
    },
  ],
  crops: [
    {
      pdf: "IMSLP35345-PMLP18966-Mendelssohn-Sym1.Timpani.pdf",
      instrument: "Perc Timbal",
      start: 2,
      end: 3,
    },
    {
      pdf: "IMSLP35347-PMLP18966-Mendelssohn-Sym1.Viola.pdf",
      instrument: "Viola",
      start: 2,
      end: 8,
    },
    {
      pdf: "IMSLP20804-PMLP18966-Mendelssohn_Symphony_1_V1.pdf",
      instrument: "Violín 1",
      start: 2,
      end: 12,
    },
    {
      pdf: "IMSLP20805-PMLP18966-Mendelssohn_Symphony_1_V2.pdf",
      instrument: "Violín 2",
      start: 2,
      end: 11,
    },
    {
      pdf: "IMSLP20284-PMLP18966-Mendelssohn_-_011_-_Symphony_n.1_c_(score).pdf",
      instrument: "SCORE",
      start: 2,
      end: 64,
    },
  ],
};
