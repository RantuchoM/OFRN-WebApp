/**
 * Bach — Nun danket alle Gott, BWV 192 (obra 3909).
 * M.kowalski49 #731194–#731200.
 */
export const PARA_ACOMODAR_ROOT =
  process.env.PARA_ACOMODAR_ROOT ||
  "H:\\Mi unidad\\Archivo General OFRN\\Para acomodar";

export const PARA_ACOMODAR_FOLDER_ID = "10ap1aEjq3X9bFRB3z4DQ-F0fB7y3JutI";

export function driveFolderUrl(id) {
  return id ? `https://drive.google.com/open?id=${id}` : "";
}

export const NUN_DANKET_BWV192_WORK = {
  obraId: 3909,
  targetFolder: "Bach, J.S. - Nun danket alle Gott BWV 192",
  titulo:
    "<p>Nun danket alle Gott, BWV 192</p>" +
    "<div>&nbsp; I. Chor</div>" +
    "<div>&nbsp; II. Aria (Duett)</div>" +
    "<div>&nbsp; III. Chor</div>",
  workTitleShort: "Nun danket alle Gott",
  workNumber: "BWV 192",
  composerTag: "Bach, J.S",
  compositor: { apellido: "Bach", nombre: "Johann Sebastian" },
  anio: 1730,
  duracion_segundos: 900,
  imslp:
    "https://imslp.org/wiki/Nun_danket_alle_Gott,_BWV_192_(Bach,_Johann_Sebastian)",
  driveFolderId: null,
  splits: [
    {
      pdf: "IMSLP731195-PMLP150103-Bach_Nun_danket_alle_Gott,_BWV_192_-_Flute_1-2.pdf",
      parts: [
        { instrument: "Flauta 1", start: 1, end: 7 },
        { instrument: "Flauta 2", start: 8, end: 12 },
      ],
    },
    {
      pdf: "IMSLP731196-PMLP150103-Bach_Nun_danket_alle_Gott,_BWV_192_-_Oboe_1-2.pdf",
      parts: [
        { instrument: "Oboe 1", start: 1, end: 6 },
        { instrument: "Oboe 2", start: 7, end: 11 },
      ],
    },
  ],
  wholes: [
    {
      pdf: "IMSLP731194-PMLP150103-Bach_Nun_danket_alle_Gott,_BWV_192_-_Conductor_Score.pdf",
      instrument: "SCORE",
    },
    {
      pdf: "IMSLP731197-PMLP150103-Bach_Nun_danket_alle_Gott,_BWV_192_-_Violins_I.pdf",
      instrument: "Violín 1",
    },
    {
      pdf: "IMSLP731198-PMLP150103-Bach_Nun_danket_alle_Gott,_BWV_192_-_Violins_II.pdf",
      instrument: "Violín 2",
    },
    {
      pdf: "IMSLP731199-PMLP150103-Bach_Nun_danket_alle_Gott,_BWV_192_-_Violas.pdf",
      instrument: "Viola",
    },
    {
      pdf: "IMSLP731200-PMLP150103-Bach_Nun_danket_alle_Gott,_BWV_192_-_Cellos,_Basses.pdf",
      instrument: "Violoncello y Contrabajo",
    },
  ],
};
