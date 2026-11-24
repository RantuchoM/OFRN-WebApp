/**
 * Sibelius — Pelléas et Mélisande, suite Op. 46 (obra 3899).
 * SCORE Daphnis #15908 + Orchestra Parts Project Horndude #49766–75 / Vc #27844.
 */
export const PARA_ACOMODAR_ROOT =
  process.env.PARA_ACOMODAR_ROOT ||
  "H:\\Mi unidad\\Archivo General OFRN\\Para acomodar";

export const PARA_ACOMODAR_FOLDER_ID = "10ap1aEjq3X9bFRB3z4DQ-F0fB7y3JutI";

export function driveFolderUrl(id) {
  return id ? `https://drive.google.com/open?id=${id}` : "";
}

export const SIBELIUS_PELLEAS_WORK = {
  obraId: 3899,
  targetFolder: "Sibelius, J. - Pelleas et Melisande Op.46",
  titulo:
    "<p>Pelléas et Mélisande, suite, Op. 46</p>" +
    "<div>&nbsp; I. At the Castle Gate</div>" +
    "<div>&nbsp; II. Melisande</div>" +
    "<div>&nbsp; III. At the Seashore</div>" +
    "<div>&nbsp; IV. Spring in the Park</div>" +
    "<div>&nbsp; V. The three blind Sisters</div>" +
    "<div>&nbsp; VI. Pastorale</div>" +
    "<div>&nbsp; VII. Melisande at the Spinning-Wheel</div>" +
    "<div>&nbsp; VIII. Entr'acte</div>" +
    "<div>&nbsp; IX. The Death of Melisande</div>",
  workTitleShort: "Pelleas et Melisande",
  workNumber: "op.46",
  composerTag: "Sibelius, J",
  compositor: { apellido: "Sibelius", nombre: "Jean" },
  anio: 1905,
  duracion_segundos: 1620,
  imslp:
    "https://imslp.org/wiki/Pell%C3%A9as_et_M%C3%A9lisande,_suite,_Op.46_(Sibelius,_Jean)",
  driveFolderId: "1ZG0K4TWdLi72nGqVbNFJie2850TCUEXk",
  splits: [
    {
      pdf: "IMSLP49768-PMLP38361-Sibelius-Pelleas.Clarinet.pdf",
      parts: [
        { instrument: "Clarinete Bb 1", start: 1, end: 5 },
        { instrument: "Clarinete Bb 2", start: 6, end: 10 },
      ],
    },
    {
      pdf: "IMSLP49769-PMLP38361-Sibelius-Pelleas.Bassoon.pdf",
      parts: [
        { instrument: "Fagot 1", start: 1, end: 3 },
        { instrument: "Fagot 2", start: 4, end: 6 },
      ],
    },
    {
      pdf: "IMSLP49770-PMLP38361-Sibelius-Pelleas.Horn.pdf",
      parts: [
        { instrument: "Corno F 1", start: 1, end: 2 },
        { instrument: "Corno F 2", start: 3, end: 5 },
      ],
    },
  ],
  wholes: [
    {
      pdf: "IMSLP15908-Sibelius_-_Pelleas_Melisande_Op.46_orch_score.pdf",
      instrument: "SCORE",
    },
    {
      pdf: "IMSLP49766-PMLP38361-Sibelius-Pelleas.Flute.pdf",
      instrument: "Flauta",
    },
    {
      pdf: "IMSLP49767-PMLP38361-Sibelius-Pelleas.Oboe.pdf",
      instrument: "Oboe",
    },
    {
      pdf: "IMSLP49771-PMLP38361-Sibelius-Pelleas.Percussion.pdf",
      instrument: "Percusión",
    },
    {
      pdf: "IMSLP49772-PMLP38361-Sibelius-Pelleas.Violin1.pdf",
      instrument: "Violín 1",
    },
    {
      pdf: "IMSLP49773-PMLP38361-Sibelius-Pelleas.Violin2.pdf",
      instrument: "Violín 2",
    },
    {
      pdf: "IMSLP49774-PMLP38361-Sibelius-Pelleas.Viola.pdf",
      instrument: "Viola",
    },
    {
      pdf: "IMSLP27844-PMLP38361-Sibelius_Pelleas_and_Melisande,_Op.46_cello.pdf",
      instrument: "Violoncello",
    },
    {
      pdf: "IMSLP49775-PMLP38361-Sibelius-Pelleas.Bass.pdf",
      instrument: "Contrabajo",
    },
  ],
};
