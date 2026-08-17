/**
 * Haydn — Concierto para Trompeta en Mib M, Hob.VIIe1
 * Bach — Suite Orquestal no. 2 en Si menor, BWV 1067
 * Para acomodar (sin copiar_carpeta_a_archivo).
 */
export const PARA_ACOMODAR_ROOT =
  process.env.PARA_ACOMODAR_ROOT ||
  "H:\\Mi unidad\\Archivo General OFRN\\Para acomodar";

export const PARA_ACOMODAR_FOLDER_ID = "10ap1aEjq3X9bFRB3z4DQ-F0fB7y3JutI";

export const HAYDN_TRUMPET_WORK = {
  key: "haydn-trumpet",
  sourceFolder: "Haydn, J. - Concierto para Trompeta en Mib M. Hob.VIIe1",
  targetFolder: "Haydn, J. - Concierto para Trompeta en Mib M. Hob.VIIe1",
  titulo: "Concierto para Trompeta en Mib M",
  workNumber: "Hob.VIIe1",
  composerTag: "Haydn, J",
  compositor: { apellido: "Haydn", nombre: "Franz Joseph" },
  arranger: { apellido: "Rondeau", nombre: "Michel" },
  action: "insert",
  driveFolderId: process.env.HAYDN_TRUMPET_DRIVE_FOLDER_ID || "1MDj3YECQ8VAMOW0b-IUw-oJIBnxQp4r3",
  anio: 1796,
  splits: [],
  crops: [],
  /** Ed. Rondeau (WIMA). No hay PDF de trompeta solo (sí en .MUS del zip). */
  observaciones:
    "Para acomodar — Haydn, J. - Concierto para Trompeta en Mib M. Hob.VIIe1. Ed. Michel Rondeau. Falta particella de trompeta solo (está en score y en .MUS del zip IMSLP).",
  renames: [
    {
      pdf: "IMSLP258254-PMLP08143-IMSLP226836-WIMA.703e-H_Sco.pdf",
      instrument: "SCORE",
    },
    {
      pdf: "IMSLP258236-PMLP08143-IMSLP226867-WIMA.141d-H_Fl1.pdf",
      instrument: "Flauta 1",
    },
    {
      pdf: "IMSLP258237-PMLP08143-IMSLP226868-WIMA.3235-H_Fl2.pdf",
      instrument: "Flauta 2",
    },
    {
      pdf: "IMSLP258238-PMLP08143-IMSLP226869-WIMA.2b1f-H_Ob1.pdf",
      instrument: "Oboe 1",
    },
    {
      pdf: "IMSLP258239-PMLP08143-IMSLP226870-WIMA.e965-H_Ob2.pdf",
      instrument: "Oboe 2",
    },
    {
      pdf: "IMSLP258240-PMLP08143-IMSLP226871-WIMA.5785-H_Bsn1.pdf",
      instrument: "Fagot 1",
    },
    {
      pdf: "IMSLP258241-PMLP08143-IMSLP226872-WIMA.e1a5-H_Bsn2.pdf",
      instrument: "Fagot 2",
    },
    {
      pdf: "IMSLP258242-PMLP08143-IMSLP226873-WIMA.62c2-H_Hn1.pdf",
      instrument: "Corno F 1",
    },
    {
      pdf: "IMSLP258243-PMLP08143-IMSLP226874-WIMA.4898-H_Hn2.pdf",
      instrument: "Corno F 2",
    },
    {
      pdf: "IMSLP258245-PMLP08143-IMSLP226876-WIMA.e70d-H_Trp1.pdf",
      instrument: "Trompeta 1",
    },
    {
      pdf: "IMSLP258246-PMLP08143-IMSLP226877-WIMA.85ef-H_Trp2.pdf",
      instrument: "Trompeta 2",
    },
    {
      pdf: "IMSLP258247-PMLP08143-IMSLP226878-WIMA.edb1-H_Tim.pdf",
      instrument: "Perc Timbal",
    },
    {
      pdf: "IMSLP258248-PMLP08143-IMSLP226879-WIMA.10e8-H_Vl1.pdf",
      instrument: "Violín 1",
    },
    {
      pdf: "IMSLP258249-PMLP08143-IMSLP226880-WIMA.509f-H_Vl2.pdf",
      instrument: "Violín 2",
    },
    {
      pdf: "IMSLP258250-PMLP08143-IMSLP226881-WIMA.4750-H_Vla.pdf",
      instrument: "Viola",
    },
    {
      pdf: "IMSLP258251-PMLP08143-IMSLP226882-WIMA.f6eb-H_Vc.pdf",
      instrument: "Violoncello",
    },
    {
      pdf: "IMSLP258252-PMLP08143-IMSLP226883-WIMA.5bb8-H_Db.pdf",
      instrument: "Contrabajo",
    },
  ],
};

export const BACH_SUITE2_WORK = {
  key: "bach-suite2",
  sourceFolder: "Bach, J.S. - Suite Orquestal no. 2 en Si menor, BWV 1067",
  targetFolder: "Bach, J.S. - Suite Orquestal no. 2 en Si menor, BWV 1067",
  titulo: "Suite Orquestal no. 2 en Si menor",
  workNumber: "BWV 1067",
  composerTag: "Bach, J.S",
  compositor: { apellido: "Bach", nombre: "Johann Sebastian" },
  arranger: null,
  action: "insert",
  driveFolderId: process.env.BACH_SUITE2_DRIVE_FOLDER_ID || "1Zikakmr-j9RzTHWsp9nDP8-7szJrf5NG",
  anio: 1738,
  splits: [],
  crops: [
    {
      pdf: "IMSLP744083-PMLP99998-Bach_Orchestral_Suite_No.2_in_B_minor,_BWV_1067_-_Conductor_Score.pdf",
      instrument: "SCORE",
      start: 2,
      end: 26,
    },
  ],
  observaciones:
    "Para acomodar — Bach, J.S. - Suite Orquestal no. 2 en Si menor, BWV 1067. Flauta solista; continuo de teclado mapeado a Piano.",
  /** Flauta = traverso solista. Keyboard/Cembalo → Piano. */
  solistaInstruments: ["Flauta"],
  renames: [
    {
      pdf: "IMSLP46924-PMLP99998-Bach-BWV1067.Flute.pdf",
      instrument: "Flauta",
    },
    {
      pdf: "IMSLP46926-PMLP99998-Bach-BWV1067.Violin1.pdf",
      instrument: "Violín 1",
    },
    {
      pdf: "IMSLP46927-PMLP99998-Bach-BWV1067.Violin2.pdf",
      instrument: "Violín 2",
    },
    {
      pdf: "IMSLP46928-PMLP99998-Bach-BWV1067.Viola.pdf",
      instrument: "Viola",
    },
    {
      pdf: "IMSLP46929-PMLP99998-Bach-BWV1067.Cello.pdf",
      instrument: "Violoncello",
    },
    {
      pdf: "IMSLP46925-PMLP99998-Bach-BWV1067.Keyboard.pdf",
      instrument: "Piano",
    },
    {
      pdf: "IMSLP744083-PMLP99998-Bach_Orchestral_Suite_No.2_in_B_minor,_BWV_1067_-_Conductor_Score.pdf",
      instrument: "SCORE",
    },
  ],
};

export const HAYDN_BACH_WORKS = [HAYDN_TRUMPET_WORK, BACH_SUITE2_WORK];

export function driveFolderUrl(id) {
  if (!id) return "";
  return `https://drive.google.com/open?id=${id}`;
}
