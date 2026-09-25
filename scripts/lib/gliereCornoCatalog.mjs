/**
 * Glière — Concierto para corno, Op. 91 (obra 3649).
 * Edición vinculada: manuscrito IMSLP #903959–#903985 (Geniusboy98).
 * No trae score ni corno solo. Página 1 de cada escaneo ya es música.
 * Mitteldorf/Maximov queda en la subcarpeta «Versión alternativa», sin filas.
 * El usuario declaró la obra de dominio público en esta jurisdicción.
 */
export const GLIERE_CORNO_DOWNLOADS =
  process.env.GLIERE_CORNO_DOWNLOADS ||
  "C:\\Users\\marti\\Downloads\\gliere-op91";

export const PARA_ACOMODAR_ROOT =
  process.env.PARA_ACOMODAR_ROOT ||
  "H:\\Mi unidad\\Archivo General OFRN\\Para acomodar";

export const ALTERNATE_FOLDER_NAME = "Versión alternativa";

export const GLIERE_CORNO_WORK = {
  obraId: 3649,
  targetFolder: "Glière, R. - Concierto para Corno en Si bemol mayor, Op. 91",
  titulo: "Concierto para Corno en Si bemol mayor",
  workNumber: "op.91",
  composerTag: "Glière, R",
  compositor: { apellido: "Glière", nombre: "Reinhold" },
  anio: 1951,
  imslp: "https://imslp.org/wiki/Horn_Concerto,_Op.91_(Glière,_Reinhold)",
  /** Partes que se mueven fuera de la carpeta vinculada. No entran al seed. */
  alternativa: [
    "SCORE",
    "Corno Solo",
    "Flauta 1y2",
    "Flauta 3",
    "Oboe 1y2",
    "Clarinete Bb 1y2",
    "Fagot 1y2",
    "Corno F 1y2",
    "Corno F 3",
    "Trompeta Bb 1y2",
    "Trombón 1y2",
    "Arpa",
    "Violín 1",
    "Violín 2",
    "Viola",
    "Violoncello",
    "Contrabajo",
    "Perc Timbal",
    "Perc Pandereta",
  ],
  /** Manuscrito. Cada PDF es una silla, salvo percusión compartida. */
  wholes: [
    { pdf: "IMSLP903959-PMLP361830-01-flute1.pdf", instrument: "Flauta 1" },
    { pdf: "IMSLP903960-PMLP361830-02-flute2.pdf", instrument: "Flauta 2" },
    { pdf: "IMSLP903961-PMLP361830-03-flute3.pdf", instrument: "Flauta 3" },
    { pdf: "IMSLP903962-PMLP361830-04-oboe1.pdf", instrument: "Oboe 1" },
    { pdf: "IMSLP903963-PMLP361830-05-oboe2.pdf", instrument: "Oboe 2" },
    { pdf: "IMSLP903964-PMLP361830-06-clarinet1.pdf", instrument: "Clarinete Bb 1" },
    { pdf: "IMSLP903965-PMLP361830-07-clarinet2.pdf", instrument: "Clarinete Bb 2" },
    { pdf: "IMSLP903966-PMLP361830-08-bassoon1.pdf", instrument: "Fagot 1" },
    { pdf: "IMSLP903967-PMLP361830-09-bassoon2.pdf", instrument: "Fagot 2" },
    { pdf: "IMSLP903968-PMLP361830-10-horn1.pdf", instrument: "Corno F 1" },
    { pdf: "IMSLP903969-PMLP361830-11-horn2.pdf", instrument: "Corno F 2" },
    { pdf: "IMSLP903970-PMLP361830-12-horn3.pdf", instrument: "Corno F 3" },
    { pdf: "IMSLP903971-PMLP361830-13-trumpet1.pdf", instrument: "Trompeta Bb 1" },
    { pdf: "IMSLP903972-PMLP361830-14-trumpet2.pdf", instrument: "Trompeta Bb 2" },
    { pdf: "IMSLP903973-PMLP361830-15-trombone1.pdf", instrument: "Trombón 1" },
    { pdf: "IMSLP903974-PMLP361830-16-trombone2.pdf", instrument: "Trombón 2" },
    { pdf: "IMSLP903975-PMLP361830-17-trombone3.pdf", instrument: "Trombón 3" },
    { pdf: "IMSLP903976-PMLP361830-18-tuba.pdf", instrument: "Tuba" },
    { pdf: "IMSLP903977-PMLP361830-19-timpani.pdf", instrument: "Perc Timbal" },
    { pdf: "IMSLP903978-PMLP361830-20-triangle-SD.pdf", instrument: "Perc Triángulo y Tambor" },
    { pdf: "IMSLP903979-PMLP361830-21-cymbals-BD.pdf", instrument: "Perc Platillos y Bombo" },
    { pdf: "IMSLP903980-PMLP361830-22-harp.pdf", instrument: "Arpa" },
    { pdf: "IMSLP903981-PMLP361830-23-vi.pdf", instrument: "Violín 1" },
    { pdf: "IMSLP903982-PMLP361830-24-vii.pdf", instrument: "Violín 2" },
    { pdf: "IMSLP903983-PMLP361830-25-va.pdf", instrument: "Viola" },
    { pdf: "IMSLP903984-PMLP361830-26-vc.pdf", instrument: "Violoncello" },
    { pdf: "IMSLP903985-PMLP361830-27-cb.pdf", instrument: "Contrabajo" },
  ],
};
