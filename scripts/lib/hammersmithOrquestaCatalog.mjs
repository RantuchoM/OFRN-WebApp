/**
 * Holst — Hammersmith, Op. 52.
 * Carpeta Archivo ORQUESTA (nombre «para orquesta»); el material es la
 * versión de banda militar (sax, corneta, barítono; sin cuerdas).
 * Drive: https://drive.google.com/open?id=19ByhBwuD4U28xRkh1_5RAde94GOakMan
 * Actualiza obra #3687 (banda); #3691 sigue como SCORE-only orquesta.
 */
export const HAMMERSMITH_ORQUESTA_ROOT =
  process.env.HAMMERSMITH_ORQUESTA_ROOT ||
  "H:\\Mi unidad\\Archivo General OFRN\\ORQUESTA\\Holst, G. - Hammersmith [para orquesta]";

export const HAMMERSMITH_ORQUESTA_DRIVE_FOLDER_ID =
  process.env.HAMMERSMITH_ORQUESTA_DRIVE_FOLDER_ID ||
  "19ByhBwuD4U28xRkh1_5RAde94GOakMan";

export const HAMMERSMITH_ORQUESTA_WORK = {
  targetFolder: "Holst, G. - Hammersmith [para orquesta]",
  /** Título corto en PDF */
  titulo: "Hammersmith",
  tituloDb:
    "<p>Hammersmith (Prelude and Scherzo), Op. 52</p><div>&nbsp; [versión banda]</div>",
  workNumber: "op.52",
  composerTag: "Holst, G",
  compositor: { apellido: "Holst", nombre: "Gustav" },
  obraId: 3687,
  action: "update",
  anio: 1930,
  duracion_segundos: 810,
  observaciones:
    "Archivo ORQUESTA — Holst, G. - Hammersmith [para orquesta]. Material = versión banda militar (Boosey-style; sax/corneta/barítono; sin cuerdas). Carpeta nombrada «para orquesta»; obra orquesta SCORE-only sigue en #3691.",
  driveFolderId: HAMMERSMITH_ORQUESTA_DRIVE_FOLDER_ID,
  renames: [
    // SCORE: archivo sin sufijo de instrumento (…Holst.pdf)
    { re: "holst\\.pdf$", instrument: "SCORE" },
    { re: "flute[_ ]*1\\.pdf$", instrument: "Flauta 1" },
    { re: "flute[_ ]*2\\.pdf$", instrument: "Flauta 2" },
    { re: "oboe[_ ]*1[._]?2|oboe[_ ]*1y2", instrument: "Oboe 1y2" },
    {
      re: "eb[_ ]*clarinet[_ ]*1[._]?2|eb[_ ]*clarinet[_ ]*1y2",
      instrument: "Clarinete Eb 1y2",
    },
    { re: "bb[_ ]*clarinet[_ ]*solo", instrument: "Clarinete Bb Solo" },
    { re: "bb[_ ]*clarinet[_ ]*1\\.pdf$", instrument: "Clarinete Bb 1" },
    { re: "bb[_ ]*clarinet[_ ]*2\\.pdf$", instrument: "Clarinete Bb 2" },
    { re: "bb[_ ]*clarinet[_ ]*3\\.pdf$", instrument: "Clarinete Bb 3" },
    { re: "bassoon[_ ]*1[._]?2|bassoon[_ ]*1y2", instrument: "Fagot 1y2" },
    { re: "alto[_ ]*sax", instrument: "Saxo Alto" },
    { re: "tenor[_ ]*sax", instrument: "Saxo Tenor" },
    {
      re: "horn[_ ]*(in[_ ]*)?f[_ ]*1[._]?2|horn[_ ]*1y2",
      instrument: "Corno F 1y2",
    },
    {
      re: "horn[_ ]*(in[_ ]*)?f[_ ]*3[._]?4|horn[_ ]*3y4",
      instrument: "Corno F 3y4",
    },
    { re: "bb[_ ]*cornet[_ ]*1", instrument: "Corneta Bb 1" },
    { re: "bb[_ ]*cornet[_ ]*2", instrument: "Corneta Bb 2" },
    {
      re: "bb[_ ]*trumpet[_ ]*1[._]?2|bb[_ ]*trumpet[_ ]*1y2",
      instrument: "Trompeta Bb 1y2",
    },
    {
      re: "trombone[_ ]*1[._]?2|trombone[_ ]*1y2",
      instrument: "Trombón 1y2",
    },
    { re: "trombone[_ ]*3", instrument: "Trombón 3" },
    { re: "baritone", instrument: "Barítono" },
    { re: "tuba\\.pdf$", instrument: "Tuba" },
    { re: "timpani", instrument: "Perc Timbal" },
    { re: "percussion[_ ]*1", instrument: "Perc Percusión 1" },
    { re: "percussion[_ ]*2", instrument: "Perc Percusión 2" },
  ],
};

export function driveFolderUrl(id) {
  if (!id) return null;
  return `https://drive.google.com/open?id=${id}`;
}
