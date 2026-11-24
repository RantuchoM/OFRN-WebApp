/**
 * Mozart — Sinfonía Nro. 40 en sol menor, K.550 (obra 3896).
 * Horndude77 con clarinetes (#51204–#51211) + Vc/Cb #36332/#36333.
 */
export const PARA_ACOMODAR_ROOT =
  process.env.PARA_ACOMODAR_ROOT ||
  "H:\\Mi unidad\\Archivo General OFRN\\Para acomodar";

export const PARA_ACOMODAR_FOLDER_ID = "10ap1aEjq3X9bFRB3z4DQ-F0fB7y3JutI";

export function driveFolderUrl(id) {
  return id ? `https://drive.google.com/open?id=${id}` : "";
}

export const MOZART_40_WORK = {
  obraId: 3896,
  targetFolder: "Mozart, W.A. - Sinfonia Nro 40 K.550",
  titulo:
    "<p>Sinfonía Nro. 40 en sol menor, K. 550</p>" +
    "<div>&nbsp; I. Allegro molto</div>" +
    "<div>&nbsp; II. Andante</div>" +
    "<div>&nbsp; III. Menuetto. Allegretto</div>" +
    "<div>&nbsp; IV. Allegro assai</div>",
  workTitleShort: "Sinfonia Nro 40",
  workNumber: "K.550",
  composerTag: "Mozart, W.A",
  compositor: { apellido: "Mozart", nombre: "Wolfgang Amadeus" },
  anio: 1788,
  duracion_segundos: 1560,
  imslp:
    "https://imslp.org/wiki/Symphony_No.40_in_G_minor,_K.550_(Mozart,_Wolfgang_Amadeus)",
  driveFolderId: null,
  splits: [
    {
      pdf: "IMSLP51205-PMLP01572-Mozart-K550.Oboe.pdf",
      parts: [
        { instrument: "Oboe 1", start: 1, end: 6 },
        { instrument: "Oboe 2", start: 7, end: 10 },
      ],
    },
    {
      pdf: "IMSLP51206-PMLP01572-Mozart-K550.Clarinet.pdf",
      parts: [
        { instrument: "Clarinete Bb 1", start: 1, end: 5 },
        { instrument: "Clarinete Bb 2", start: 6, end: 10 },
      ],
    },
    {
      pdf: "IMSLP51207-PMLP01572-Mozart-K550.Bassoon.pdf",
      parts: [
        { instrument: "Fagot 1", start: 1, end: 5 },
        { instrument: "Fagot 2", start: 6, end: 10 },
      ],
    },
    {
      pdf: "IMSLP51208-PMLP01572-Mozart-K550.Horn.pdf",
      parts: [
        { instrument: "Corno F 1", start: 1, end: 3 },
        { instrument: "Corno F 2", start: 4, end: 7 },
      ],
    },
  ],
  wholes: [
    {
      pdf: "IMSLP51204-PMLP01572-Mozart-K550.Flute.pdf",
      instrument: "Flauta",
    },
    {
      pdf: "IMSLP51209-PMLP01572-Mozart-K550.Violin1.pdf",
      instrument: "Violín 1",
    },
    {
      pdf: "IMSLP51210-PMLP01572-Mozart-K550.Violin2.pdf",
      instrument: "Violín 2",
    },
    {
      pdf: "IMSLP51211-PMLP01572-Mozart-K550.Viola.pdf",
      instrument: "Viola",
    },
    {
      pdf: "IMSLP36332-PMLP01572-Mozart_Symphony_40_K550_Vc.pdf",
      instrument: "Violoncello",
    },
    {
      pdf: "IMSLP36333-PMLP01572-Mozart_Symphony_40_K550_Cb.pdf",
      instrument: "Contrabajo",
    },
  ],
};
