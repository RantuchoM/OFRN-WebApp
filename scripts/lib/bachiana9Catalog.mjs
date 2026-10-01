/**
 * Villa-Lobos — Bachiana brasileira Nro. 9, W449 (obra 3654).
 * Partes de cuerdas IMSLP #569700–#569705 (PMLP898487).
 * Viola y contrabajo traen portada de título en la página 1 (sin música).
 * SCORE, violines y violonchelo empiezan en música: no se recortan.
 */
export const PARA_ACOMODAR_ROOT =
  process.env.PARA_ACOMODAR_ROOT ||
  "H:\\Mi unidad\\Archivo General OFRN\\Para acomodar";

export const PARA_ACOMODAR_FOLDER_ID = "10ap1aEjq3X9bFRB3z4DQ-F0fB7y3JutI";

export const BACHIANA9_WORK = {
  sourceFolder: "Villa-Lobos, H. - Bachiana brasilera N9",
  targetFolder: "Villa-Lobos, H. - Bachiana brasileira Nro. 9",
  titulo: "Bachiana brasileira Nro. 9",
  tituloDb:
    "<p>Bachiana brasileira Nro. 9, W449</p><div>&nbsp; I. Prelúdio (Vagaroso e Místico)</div><div>&nbsp; II. Fuga (Pouco apressado)</div>",
  workNumber: "W449",
  composerTag: "Villa-Lobos, H",
  compositor: { apellido: "Villa-Lobos", nombre: "Heitor" },
  compositorId: 348,
  obraId: 3654,
  driveFolderId: "13yY39hrqFNPyECR3J2oQ2y_twyhsK-pe",
  anio: 1945,
  imslp:
    "https://imslp.org/wiki/Bachianas_brasileiras_No.9,_W449_(Villa-Lobos,_Heitor)",
  crops: [
    {
      fileId: 569703,
      instrument: "Viola",
      start: 2,
      end: 5,
    },
    {
      fileId: 569705,
      instrument: "Contrabajo",
      start: 2,
      end: 4,
    },
  ],
  wholes: [
    { fileId: 569700, instrument: "SCORE" },
    { fileId: 569701, instrument: "Violín 1" },
    { fileId: 569702, instrument: "Violín 2" },
    { fileId: 569704, instrument: "Violoncello" },
  ],
};

export function driveFolderUrl(id) {
  return id ? `https://drive.google.com/open?id=${id}` : "";
}
