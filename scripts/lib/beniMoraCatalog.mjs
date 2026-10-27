/**
 * Holst — Beni Mora, Op. 29 Nro. 1 (Para acomodar).
 * Rangos por encabezado visual (header crops). SCORE: portada p.1 + música;
 * no se inspecciona página a página (no hay otras partes mezcladas).
 */
export const PARA_ACOMODAR_ROOT =
  process.env.PARA_ACOMODAR_ROOT ||
  "H:\\Mi unidad\\Archivo General OFRN\\Para acomodar";

export const PARA_ACOMODAR_FOLDER_ID = "10ap1aEjq3X9bFRB3z4DQ-F0fB7y3JutI";

export const BENI_MORA_WORK = {
  sourceFolder: "Holst, G. - Beni Mora, Op. 29 Nro. 1",
  targetFolder: "Holst, G. - Beni Mora, Op. 29 Nro. 1",
  titulo:
    "<p>Beni Mora (Suite oriental en mi menor), Op. 29 Nro. 1</p><div>&nbsp; I. First Dance</div><div>&nbsp; II. Second Dance</div><div>&nbsp; III. Finale. In the Street of the Ouled Naïls</div>",
  workNumber: "op.29 nro.1",
  composerTag: "Holst, G",
  compositor: { apellido: "Holst", nombre: "Gustav" },
  obraId: 3677,
  anio: 1910,
  driveFolderId:
    process.env.BENI_MORA_DRIVE_FOLDER_ID ||
    "175I0QA_nwzGtHCgghTQjVpz9Vglpi7HP",
  splits: [
    {
      pdf: "IMSLP701096-Flute.pdf",
      parts: [
        { instrument: "Flauta 1", start: 2, end: 6 },
        { instrument: "Flauta 2", start: 7, end: 10 },
        { instrument: "Fl Piccolo", start: 11, end: 13 },
      ],
    },
    {
      pdf: "IMSLP701097-OboeEH.pdf",
      parts: [
        { instrument: "Oboe 1", start: 1, end: 4 },
        { instrument: "Oboe 2", start: 5, end: 8 },
        { instrument: "Ob EH", start: 9, end: 12 },
      ],
    },
    {
      pdf: "IMSLP701098-Clarinet.pdf",
      parts: [
        { instrument: "Clarinete A 1", start: 1, end: 4 },
        { instrument: "Clarinete A 2", start: 5, end: 7 },
      ],
    },
    {
      pdf: "IMSLP701100-Horn.pdf",
      parts: [
        { instrument: "Corno F 1y2", start: 1, end: 6 },
        { instrument: "Corno F 3y4", start: 7, end: 11 },
      ],
    },
    {
      pdf: "IMSLP701101-Trumpet.pdf",
      parts: [
        { instrument: "Trompeta A 1y2", start: 1, end: 3 },
        { instrument: "Trompeta A 3", start: 4, end: 5 },
      ],
    },
    {
      pdf: "IMSLP701102-TromboneTuba.pdf",
      parts: [
        { instrument: "Trombón 1y2", start: 1, end: 4 },
        { instrument: "Trombón 3", start: 5, end: 6 },
        { instrument: "Tuba", start: 7, end: 8 },
      ],
    },
  ],
  crops: [
    {
      pdf: "IMSLP701095-SCORE.pdf",
      instrument: "SCORE",
      start: 2,
      end: 48,
    },
    {
      pdf: "IMSLP701099-Bassoon.pdf",
      instrument: "Fagot 1y2",
      start: 1,
      end: 6,
    },
    {
      pdf: "IMSLP701103-Timpani.pdf",
      instrument: "Perc Timbal",
      start: 1,
      end: 4,
    },
    {
      pdf: "IMSLP701104-Perc.pdf",
      instrument: "Perc Percusión",
      start: 1,
      end: 5,
    },
    {
      pdf: "IMSLP701105-Harp.pdf",
      instrument: "Arpa",
      start: 1,
      end: 9,
    },
    {
      pdf: "IMSLP701106-Violin1.pdf",
      instrument: "Violín 1",
      start: 1,
      end: 6,
    },
    {
      pdf: "IMSLP701107-Violin2.pdf",
      instrument: "Violín 2",
      start: 1,
      end: 4,
    },
    {
      pdf: "IMSLP701108-Viola.pdf",
      instrument: "Viola",
      start: 1,
      end: 7,
    },
    {
      pdf: "IMSLP701109-Cello.pdf",
      instrument: "Violoncello",
      start: 1,
      end: 4,
    },
    {
      pdf: "IMSLP701110-Bass.pdf",
      instrument: "Contrabajo",
      start: 1,
      end: 3,
    },
  ],
};

export function driveFolderUrl(folderId) {
  return folderId ? `https://drive.google.com/open?id=${folderId}` : "";
}
