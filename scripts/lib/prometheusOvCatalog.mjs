/**
 * Beethoven — Obertura Las Criaturas de Prometeo, Op. 43 (Para acomodar).
 * Score: Werke Serie 3 No.25 plate B.25 (#395333).
 * Partes: Breitkopf Orchester-Bibliothek Orch.B. 4482 (Kalmus reprint).
 * Clarinete/Corno/Trompeta: original en Do + alternativa Sib/Fa (misma silla).
 */
export const PARA_ACOMODAR_ROOT =
  process.env.PARA_ACOMODAR_ROOT ||
  "H:\\Mi unidad\\Archivo General OFRN\\Para acomodar";

export const PARA_ACOMODAR_FOLDER_ID = "10ap1aEjq3X9bFRB3z4DQ-F0fB7y3JutI";

export const PROMETHEUS_OV_WORK = {
  sourceFolder: "Beethoven, L. - Obertura. Las Criaturas de Prometeo, Op. 43",
  targetFolder: "Beethoven, L. - Obertura. Las Criaturas de Prometeo, Op. 43",
  titulo: "<p>Obertura Las Criaturas de Prometeo, Op. 43</p>",
  workNumber: "op.43",
  workTitleShort: "Obertura. Las Criaturas de Prometeo",
  composerTag: "Beethoven, L",
  compositor: { apellido: "Beethoven", nombre: "Ludwig van" },
  obraId: 3678,
  anio: 1801,
  driveFolderId:
    process.env.PROMETHEUS_OV_DRIVE_FOLDER_ID ||
    "1bQTBvmzcugtZ2YE8HM-LToKO0nLWnH85",
  splits: [
    {
      pdf: "IMSLP48657-Flute.pdf",
      parts: [
        { instrument: "Flauta 1", start: 1, end: 2 },
        { instrument: "Flauta 2", start: 3, end: 4 },
      ],
    },
    {
      pdf: "IMSLP48658-Oboe.pdf",
      parts: [
        { instrument: "Oboe 1", start: 1, end: 2 },
        { instrument: "Oboe 2", start: 3, end: 4 },
      ],
    },
    {
      pdf: "IMSLP48659-Clarinet.pdf",
      parts: [
        { instrument: "Clarinete C 1", start: 1, end: 2 },
        { instrument: "Clarinete Bb 1", start: 3, end: 4 },
        { instrument: "Clarinete C 2", start: 5, end: 6 },
        { instrument: "Clarinete Bb 2", start: 7, end: 8 },
      ],
    },
    {
      pdf: "IMSLP48660-Bassoon.pdf",
      parts: [
        { instrument: "Fagot 1", start: 1, end: 2 },
        { instrument: "Fagot 2", start: 3, end: 4 },
      ],
    },
    {
      pdf: "IMSLP48661-Horn.pdf",
      parts: [
        { instrument: "Corno C 1", start: 1, end: 1 },
        { instrument: "Corno F 1", start: 2, end: 3 },
        { instrument: "Corno C 2", start: 4, end: 4 },
        { instrument: "Corno F 2", start: 5, end: 6 },
      ],
    },
    {
      pdf: "IMSLP48662-Trumpet.pdf",
      parts: [
        { instrument: "Trompeta C 1", start: 1, end: 1 },
        { instrument: "Trompeta Bb 1", start: 2, end: 2 },
        { instrument: "Trompeta C 2", start: 3, end: 3 },
        { instrument: "Trompeta Bb 2", start: 4, end: 4 },
      ],
    },
    {
      pdf: "IMSLP26222-CelloBass.pdf",
      parts: [
        { instrument: "Violoncello", start: 1, end: 2 },
        { instrument: "Contrabajo", start: 1, end: 2 },
      ],
    },
  ],
  crops: [
    {
      pdf: "IMSLP395333-SCORE.pdf",
      instrument: "SCORE",
      start: 1,
      end: 30,
    },
    {
      pdf: "IMSLP48663-Timpani.pdf",
      instrument: "Perc Timbal",
      start: 1,
      end: 1,
    },
    {
      pdf: "IMSLP20068-Violin1.pdf",
      instrument: "Violín 1",
      start: 2,
      end: 4,
    },
    {
      pdf: "IMSLP20069-Violin2.pdf",
      instrument: "Violín 2",
      start: 2,
      end: 3,
    },
    {
      pdf: "IMSLP48665-Viola.pdf",
      instrument: "Viola",
      start: 1,
      end: 2,
    },
  ],
};

export function driveFolderUrl(folderId) {
  return `https://drive.google.com/drive/folders/${folderId}`;
}
