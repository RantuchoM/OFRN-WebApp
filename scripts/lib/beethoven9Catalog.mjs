/**
 * Beethoven — Sinfonía Nro. 9, Op. 125 (obra 3901, temporada 2027).
 * Score CCARH + Ottaviano vientos/metales/timp/perc (#965934–#965954)
 * + Feduol cuerdas (#862950–#862954) + coro #463296.
 */
export const PARA_ACOMODAR_ROOT =
  process.env.PARA_ACOMODAR_ROOT ||
  "H:\\Mi unidad\\Archivo General OFRN\\Para acomodar";

export const PARA_ACOMODAR_FOLDER_ID = "10ap1aEjq3X9bFRB3z4DQ-F0fB7y3JutI";

export function driveFolderUrl(id) {
  return id ? `https://drive.google.com/open?id=${id}` : "";
}

export const BEETHOVEN_9_WORK = {
  obraId: 3901,
  targetFolder: "Beethoven, L. - Sinfonia Nro 9 Op.125",
  titulo:
    "<p>Sinfonía Nro. 9 en re menor, Op. 125</p>" +
    "<div>&nbsp; I. Allegro ma non troppo, un poco maestoso</div>" +
    "<div>&nbsp; II. Molto vivace</div>" +
    "<div>&nbsp; III. Adagio molto e cantabile</div>" +
    "<div>&nbsp; IV. Presto - Allegro assai</div>",
  workTitleShort: "Sinfonia Nro 9",
  workNumber: "op.125",
  composerTag: "Beethoven, L",
  compositor: { apellido: "Beethoven", nombre: "Ludwig van" },
  anio: 1824,
  duracion_segundos: 4200,
  imslp:
    "https://imslp.org/wiki/Symphony_No.9,_Op.125_(Beethoven,_Ludwig_van)",
  driveFolderId: "1tEW3ilWi9T07uLfBW5ckwG88hXKQcL9e",
  splits: [],
  /** PDFs Feduol combinados a eliminar tras renombrar Ottaviano (no entrar al seed). */
  removePdfs: [
    "IMSLP862943-PMLP1607-beethoven_9_fl1-2-picc.pdf",
    "IMSLP862944-PMLP1607-beethoven_9_ob1-2.pdf",
    "IMSLP862945-PMLP1607-beethoven_9_cl1-2.pdf",
    "IMSLP862946-PMLP1607-beethoven_9_bn1-2-cbn.pdf",
    "IMSLP862947-PMLP1607-beethoven_9_hn1-2-3-4.pdf",
    "IMSLP862948-PMLP1607-beethoven_9_tpt1-2.pdf",
    "IMSLP862949-PMLP1607-beethoven_9_tbn1-2-3.pdf",
  ],
  wholes: [
    {
      pdf: "SCORE - Sinfonia Nro 9 Op.125 - Beethoven, L.pdf",
      instrument: "SCORE",
    },
    {
      pdf: "IMSLP965934-PMLP1607-Beethoven-Op125.Piccolo.pdf",
      instrument: "Fl Piccolo",
    },
    {
      pdf: "IMSLP965935-PMLP1607-Beethoven-Op125.Flute1.pdf",
      instrument: "Flauta 1",
    },
    {
      pdf: "IMSLP965936-PMLP1607-Beethoven-Op125.Flute2.pdf",
      instrument: "Flauta 2",
    },
    {
      pdf: "IMSLP965937-PMLP1607-Beethoven-Op125.Oboe1.pdf",
      instrument: "Oboe 1",
    },
    {
      pdf: "IMSLP965938-PMLP1607-Beethoven-Op125.Oboe2.pdf",
      instrument: "Oboe 2",
    },
    {
      pdf: "IMSLP965939-PMLP1607-Beethoven-Op125.Clarinet1.pdf",
      instrument: "Clarinete 1",
    },
    {
      pdf: "IMSLP965940-PMLP1607-Beethoven-Op125.Clarinet2.pdf",
      instrument: "Clarinete 2",
    },
    {
      pdf: "IMSLP965941-PMLP1607-Beethoven-Op125.Bassoon1.pdf",
      instrument: "Fagot 1",
    },
    {
      pdf: "IMSLP965942-PMLP1607-Beethoven-Op125.Bassoon2.pdf",
      instrument: "Fagot 2",
    },
    {
      pdf: "IMSLP965943-PMLP1607-Beethoven-Op125.Contrabassoon.pdf",
      instrument: "Contrafagot",
    },
    {
      pdf: "IMSLP965944-PMLP1607-Beethoven-Op125.Horn1.pdf",
      instrument: "Corno 1",
    },
    {
      pdf: "IMSLP965945-PMLP1607-Beethoven-Op125.Horn2.pdf",
      instrument: "Corno 2",
    },
    {
      pdf: "IMSLP965946-PMLP1607-Beethoven-Op125.Horn3.pdf",
      instrument: "Corno 3",
    },
    {
      pdf: "IMSLP965947-PMLP1607-Beethoven-Op125.Horn4.pdf",
      instrument: "Corno 4",
    },
    {
      pdf: "IMSLP965948-PMLP1607-Beethoven-Op125.Trumpet1.pdf",
      instrument: "Trompeta 1",
    },
    {
      pdf: "IMSLP965949-PMLP1607-Beethoven-Op125.Trumpet2.pdf",
      instrument: "Trompeta 2",
    },
    {
      pdf: "IMSLP965950-PMLP1607-Beethoven-Op125.Trombone1.pdf",
      instrument: "Trombón 1",
    },
    {
      pdf: "IMSLP965951-PMLP1607-Beethoven-Op125.Trombone2.pdf",
      instrument: "Trombón 2",
    },
    {
      pdf: "IMSLP965952-PMLP1607-Beethoven-Op125.Trombone3.pdf",
      instrument: "Trombón 3",
    },
    {
      pdf: "IMSLP965953-PMLP1607-Beethoven-Op125.Timpani.pdf",
      instrument: "Timbales",
    },
    {
      pdf: "IMSLP965954-PMLP1607-Beethoven-Op125.Percussion.pdf",
      instrument: "Percusión",
    },
    {
      pdf: "IMSLP862950-PMLP1607-beethoven_9_vn1.pdf",
      instrument: "Violín 1",
    },
    {
      pdf: "IMSLP862951-PMLP1607-beethoven_9_vn2.pdf",
      instrument: "Violín 2",
    },
    {
      pdf: "IMSLP862952-PMLP1607-beethoven_9_va.pdf",
      instrument: "Viola",
    },
    {
      pdf: "IMSLP862953-PMLP1607-beethoven_9_vc.pdf",
      instrument: "Violoncello",
    },
    {
      pdf: "IMSLP862954-PMLP1607-beethoven_9_db.pdf",
      instrument: "Contrabajo",
    },
    {
      pdf: "IMSLP463296-PMLP1607-Beethoven_coro_nona.pdf",
      instrument: "Coro",
    },
  ],
};
