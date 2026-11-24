/**
 * Schubert — Rosamunda D.797, Entreacto Nro. 3 (obra 3902, temporada 2027).
 * Partes typeset Erfastee (#444964–#444972); vientos/cornos en un PDF 1y2 (misma hoja).
 */
export const PARA_ACOMODAR_ROOT =
  process.env.PARA_ACOMODAR_ROOT ||
  "H:\\Mi unidad\\Archivo General OFRN\\Para acomodar";

export const PARA_ACOMODAR_FOLDER_ID = "10ap1aEjq3X9bFRB3z4DQ-F0fB7y3JutI";

export function driveFolderUrl(id) {
  return id ? `https://drive.google.com/open?id=${id}` : "";
}

export const SCHUBERT_ROSAMUNDA_E3_WORK = {
  obraId: 3902,
  targetFolder: "Schubert, F. - Rosamunda D.797 Entreacto Nro 3",
  titulo: "<p>Rosamunda, D. 797 — Entreacto Nro. 3</p>",
  workTitleShort: "Rosamunda Entreacto Nro 3",
  workNumber: "D.797",
  composerTag: "Schubert, F",
  compositor: { apellido: "Schubert", nombre: "Franz" },
  anio: 1823,
  duracion_segundos: 420,
  imslp: "https://imslp.org/wiki/Rosamunde,_D.797_(Schubert,_Franz)",
  driveFolderId: null,
  splits: [],
  wholes: [
    {
      pdf: "IMSLP444964-PMLP06226-Entr'acte_no_3_-_Flauti.pdf",
      instrument: "Flauta 1y2",
    },
    {
      pdf: "IMSLP444965-PMLP06226-Entr'acte_no_3_-_Oboi.pdf",
      instrument: "Oboe 1y2",
    },
    {
      pdf: "IMSLP444966-PMLP06226-Entr'acte_no_3_-_Clarinetti_in_B.pdf",
      instrument: "Clarinete Bb 1y2",
    },
    {
      pdf: "IMSLP444967-PMLP06226-Entr'acte_no_3_-_Fagotti.pdf",
      instrument: "Fagot 1y2",
    },
    {
      pdf: "IMSLP444968-PMLP06226-Entr'acte_no_3_-_Corni_in_B.pdf",
      instrument: "Corno Bb 1y2",
    },
    {
      pdf: "IMSLP444969-PMLP06226-Entr'acte_no_3_-_Violino_I.pdf",
      instrument: "Violín 1",
    },
    {
      pdf: "IMSLP444970-PMLP06226-Entr'acte_no_3_-_Violino_II.pdf",
      instrument: "Violín 2",
    },
    {
      pdf: "IMSLP444971-PMLP06226-Entr'acte_no_3_-_Viola.pdf",
      instrument: "Viola",
    },
    {
      pdf: "IMSLP444972-PMLP06226-Entr'acte_no_3_-_Violoncello_e_Basso.pdf",
      instrument: "Violoncello y Contrabajo",
    },
  ],
};
