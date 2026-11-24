/**
 * Debussy — Preludio a la siesta de un fauno (obra 3897).
 * Reinisch / Dbmiller #853690–#853712.
 */
export const PARA_ACOMODAR_ROOT =
  process.env.PARA_ACOMODAR_ROOT ||
  "H:\\Mi unidad\\Archivo General OFRN\\Para acomodar";

export const PARA_ACOMODAR_FOLDER_ID = "10ap1aEjq3X9bFRB3z4DQ-F0fB7y3JutI";

export function driveFolderUrl(id) {
  return id ? `https://drive.google.com/open?id=${id}` : "";
}

export const DEBUSSY_FAUNO_WORK = {
  obraId: 3897,
  targetFolder: "Debussy, C. - Preludio a la siesta de un fauno",
  titulo: "<p>Preludio a la siesta de un fauno</p>",
  workTitleShort: "Preludio a la siesta de un fauno",
  workNumber: null,
  composerTag: "Debussy, C",
  compositor: { apellido: "Debussy", nombre: "Claude" },
  anio: 1894,
  duracion_segundos: 600,
  imslp:
    "https://imslp.org/wiki/Pr%C3%A9lude_%C3%A0_l%27apr%C3%A8s-midi_d%27un_faune_(Debussy,_Claude)",
  driveFolderId: null,
  splits: [],
  wholes: [
    {
      pdf: "IMSLP853690-PMLP06017-Debussy_-_Prélude_à_l'après-midi_d'un_faune_(Full_Score_ed_Reinisch).pdf",
      instrument: "SCORE",
    },
    {
      pdf: "IMSLP853691-PMLP06017-Debussy-Faune-ed-Reinisch-01-fl1.pdf",
      instrument: "Flauta 1",
    },
    {
      pdf: "IMSLP853692-PMLP06017-Debussy-Faune-ed-Reinisch-02-fl2.pdf",
      instrument: "Flauta 2",
    },
    {
      pdf: "IMSLP853693-PMLP06017-Debussy-Faune-ed-Reinisch-03-fl3.pdf",
      instrument: "Flauta 3",
    },
    {
      pdf: "IMSLP853694-PMLP06017-Debussy-Faune-ed-Reinisch-04-ob1.pdf",
      instrument: "Oboe 1",
    },
    {
      pdf: "IMSLP853695-PMLP06017-Debussy-Faune-ed-Reinisch-05-ob2.pdf",
      instrument: "Oboe 2",
    },
    {
      pdf: "IMSLP853696-PMLP06017-Debussy-Faune-ed-Reinisch-06-eh.pdf",
      instrument: "Corno Inglés",
    },
    {
      pdf: "IMSLP853697-PMLP06017-Debussy-Faune-ed-Reinisch-07-cl1.pdf",
      instrument: "Clarinete Bb 1",
    },
    {
      pdf: "IMSLP853698-PMLP06017-Debussy-Faune-ed-Reinisch-08-cl2.pdf",
      instrument: "Clarinete Bb 2",
    },
    {
      pdf: "IMSLP853699-PMLP06017-Debussy-Faune-ed-Reinisch-09-bn1.pdf",
      instrument: "Fagot 1",
    },
    {
      pdf: "IMSLP853700-PMLP06017-Debussy-Faune-ed-Reinisch-10-bn2.pdf",
      instrument: "Fagot 2",
    },
    {
      pdf: "IMSLP853701-PMLP06017-Debussy-Faune-ed-Reinisch-11-hn1.pdf",
      instrument: "Corno F 1",
    },
    {
      pdf: "IMSLP853702-PMLP06017-Debussy-Faune-ed-Reinisch-12-hn2.pdf",
      instrument: "Corno F 2",
    },
    {
      pdf: "IMSLP853703-PMLP06017-Debussy-Faune-ed-Reinisch-13-hn3.pdf",
      instrument: "Corno F 3",
    },
    {
      pdf: "IMSLP853704-PMLP06017-Debussy-Faune-ed-Reinisch-14-hn4.pdf",
      instrument: "Corno F 4",
    },
    {
      pdf: "IMSLP853705-PMLP06017-Debussy-Faune-ed-Reinisch-15-cymb.pdf",
      instrument: "Perc Platillo",
    },
    {
      pdf: "IMSLP853706-PMLP06017-Debussy-Faune-ed-Reinisch-16-hp1.pdf",
      instrument: "Arpa 1",
    },
    {
      pdf: "IMSLP853707-PMLP06017-Debussy-Faune-ed-Reinisch-17-hp2.pdf",
      instrument: "Arpa 2",
    },
    {
      pdf: "IMSLP853708-PMLP06017-Debussy-Faune-ed-Reinisch-18-vn1.pdf",
      instrument: "Violín 1",
    },
    {
      pdf: "IMSLP853709-PMLP06017-Debussy-Faune-ed-Reinisch-19-vn2.pdf",
      instrument: "Violín 2",
    },
    {
      pdf: "IMSLP853710-PMLP06017-Debussy-Faune-ed-Reinisch-20-va.pdf",
      instrument: "Viola",
    },
    {
      pdf: "IMSLP853711-PMLP06017-Debussy-Faune-ed-Reinisch-21-vc.pdf",
      instrument: "Violoncello",
    },
    {
      pdf: "IMSLP853712-PMLP06017-Debussy-Faune-ed-Reinisch-22-db.pdf",
      instrument: "Contrabajo",
    },
  ],
};
