/**
 * Mendelssohn — Sinfonía para Cuerdas Nro 1 en Do Mayor, MWV N 1 (IMSLP PMLP207269).
 * Drive: https://drive.google.com/open?id=1tF11J6HKBGtdFjeUZL47n7ppL_f4WBRS
 */
export const PARA_ACOMODAR_ROOT =
  process.env.PARA_ACOMODAR_ROOT ||
  "H:\\Mi unidad\\Archivo General OFRN\\Para acomodar";

export const MENDELSSOHN_STRING_SYM1_DRIVE_FOLDER =
  "https://drive.google.com/open?id=1tF11J6HKBGtdFjeUZL47n7ppL_f4WBRS";

export const MENDELSSOHN_STRING_SYM1_WORK = {
  sourceFolder: "Nueva carpeta",
  targetFolder:
    "Mendelssohn-Bartholdy, F. - Sinfonía para Cuerdas Nro 1 en Do Mayor, MWV N 1",
  titulo: "Sinfonía para Cuerdas Nro 1 en Do Mayor, MWV N 1",
  workNumber: "MWV N 1",
  composerTag: "Mendelssohn-Bartholdy, F",
  compositor: { apellido: "Mendelssohn-Bartholdy", nombre: "Félix" },
  /** Obra insertada en BD (2026-06-22). */
  obraId: 3536,
  action: "insert",
  driveFolderId: "1tF11J6HKBGtdFjeUZL47n7ppL_f4WBRS",
  anio: 1821,
  /** Solo renombrado canónico (PDFs ya separados por instrumento). */
  renames: [
    {
      pdf: "IMSLP101016-PMLP207269-Mendelssohn,_Felix_-_Sinfonia_for_String_no._01_in_C_major_MWV_N_1.pdf",
      instrument: "SCORE",
    },
    {
      pdf: "IMSLP101942-PMLP207269-Mendelssohn_Streichersinfonie1_Violine_I.pdf",
      instrument: "Violín 1",
    },
    {
      pdf: "IMSLP101943-PMLP207269-Mendelssohn_Streichersinfonie1_Violine_II.pdf",
      instrument: "Violín 2",
    },
    {
      pdf: "IMSLP101944-PMLP207269-Mendelssohn_Streichersinfonie1_Viola.pdf",
      instrument: "Viola",
    },
    {
      pdf: "IMSLP101945-PMLP207269-Mendelssohn_Streichersinfonie1_Violoncello.pdf",
      instrument: "Violoncello",
    },
    {
      pdf: "IMSLP101946-PMLP207269-Mendelssohn_Streichersinfonie1_Contrabass.pdf",
      instrument: "Contrabajo",
    },
  ],
};
