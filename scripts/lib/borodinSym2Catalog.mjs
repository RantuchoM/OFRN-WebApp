/**
 * Borodin — Sinfonía Nro. 2 en si menor (obra 3891, temporada 2027 P1).
 * Score + partes separadas Lancec (#601709, #601785–#601813).
 */
export const PARA_ACOMODAR_ROOT =
  process.env.PARA_ACOMODAR_ROOT ||
  "H:\\Mi unidad\\Archivo General OFRN\\Para acomodar";

export const PARA_ACOMODAR_FOLDER_ID = "10ap1aEjq3X9bFRB3z4DQ-F0fB7y3JutI";

export function driveFolderUrl(id) {
  return id ? `https://drive.google.com/open?id=${id}` : "";
}

export const BORODIN_SYM2_WORK = {
  obraId: 3891,
  targetFolder: "Borodin, A. - Sinfonia Nro 2 en si menor",
  titulo:
    "<p>Sinfonía Nro. 2 en si menor</p>" +
    "<div>&nbsp; I. Allegro</div>" +
    "<div>&nbsp; II. Scherzo. Prestissimo - Allegretto</div>" +
    "<div>&nbsp; III. Andante</div>" +
    "<div>&nbsp; IV. Finale. Allegro</div>",
  workTitleShort: "Sinfonia Nro 2 en si menor",
  workNumber: null,
  composerTag: "Borodin, A",
  compositor: { apellido: "Borodin", nombre: "Aleksandr" },
  anio: 1876,
  duracion_segundos: 1800,
  imslp: "https://imslp.org/wiki/Symphony_No.2_(Borodin,_Aleksandr)",
  driveFolderId: null,
  splits: [],
  wholes: [
    {
      pdf: "IMSLP601709-PMLP9176-IMSLP20050-PMLP09176-Borodin-Sym2FullScoreBarNumbers.pdf",
      instrument: "SCORE",
    },
    {
      pdf: "IMSLP601787-PMLP9176-IMSLP38176-PMLP09176-Borodin-Sym2.Piccolo.pdf",
      instrument: "Fl Piccolo",
    },
    {
      pdf: "IMSLP601785-PMLP9176-IMSLP38176-PMLP09176-Borodin-Sym2.Flute-1.pdf",
      instrument: "Flauta 1",
    },
    {
      pdf: "IMSLP601786-PMLP9176-IMSLP38176-PMLP09176-Borodin-Sym2.Flute-2.pdf",
      instrument: "Flauta 2",
    },
    {
      pdf: "IMSLP601788-PMLP9176-IMSLP38177-PMLP09176-Borodin-Sym2.Oboe_1.pdf",
      instrument: "Oboe 1",
    },
    {
      pdf: "IMSLP601789-PMLP9176-IMSLP38177-PMLP09176-Borodin-Sym2.Oboe_2.pdf",
      instrument: "Oboe 2",
    },
    {
      pdf: "IMSLP601790-PMLP9176-IMSLP20007-PMLP09176-Borodin_Sym2_Clar_1.pdf",
      instrument: "Clarinete A 1",
    },
    {
      pdf: "IMSLP601791-PMLP9176-IMSLP20007-PMLP09176-Borodin_Sym2_Clar_2.pdf",
      instrument: "Clarinete A 2",
    },
    {
      pdf: "IMSLP601792-PMLP9176-IMSLP38178-PMLP09176-Borodin-Sym2.Bassoon_1.pdf",
      instrument: "Fagot 1",
    },
    {
      pdf: "IMSLP601793-PMLP9176-IMSLP38178-PMLP09176-Borodin-Sym2.Bassoon_2.pdf",
      instrument: "Fagot 2",
    },
    {
      pdf: "IMSLP601794-PMLP9176-IMSLP38179-PMLP09176-Borodin-Sym2.Horn_1.pdf",
      instrument: "Corno F 1",
    },
    {
      pdf: "IMSLP601795-PMLP9176-IMSLP38179-PMLP09176-Borodin-Sym2.Horn_2.pdf",
      instrument: "Corno F 2",
    },
    {
      pdf: "IMSLP601796-PMLP9176-IMSLP38179-PMLP09176-Borodin-Sym2.Horn_3.pdf",
      instrument: "Corno F 3",
    },
    {
      pdf: "IMSLP601797-PMLP9176-IMSLP38179-PMLP09176-Borodin-Sym2.Horn_4.pdf",
      instrument: "Corno F 4",
    },
    {
      pdf: "IMSLP601798-PMLP9176-Borodin-Symphony-No-2-Trumpet-1-in-Bb.pdf",
      instrument: "Trompeta Bb 1",
    },
    {
      pdf: "IMSLP601799-PMLP9176-Borodin-Symphony-No-2-Trumpet-2-in-Bb.pdf",
      instrument: "Trompeta Bb 2",
    },
    {
      pdf: "IMSLP601800-PMLP9176-IMSLP38181-PMLP09176-Borodin-Sym2.Trombone_1.pdf",
      instrument: "Trombón 1",
    },
    {
      pdf: "IMSLP601801-PMLP9176-IMSLP38181-PMLP09176-Borodin-Sym2.Trombone_2.pdf",
      instrument: "Trombón 2",
    },
    {
      pdf: "IMSLP601802-PMLP9176-IMSLP38181-PMLP09176-Borodin-Sym2.Trombone_3.pdf",
      instrument: "Trombón 3",
    },
    {
      pdf: "IMSLP601803-PMLP9176-IMSLP38181-PMLP09176-Borodin-Sym2.Tuba.pdf",
      instrument: "Tuba",
    },
    {
      pdf: "IMSLP601804-PMLP9176-IMSLP19914-PMLP09176-Borodin_Sym2_Timpani.pdf",
      instrument: "Timpani",
    },
    {
      pdf: "IMSLP601805-PMLP9176-IMSLP38181-PMLP09176-Borodin-Sym2.Bass_Drum_and_Cymbals.pdf",
      instrument: "Perc Bombo y Platillos",
    },
    {
      pdf: "IMSLP601806-PMLP9176-IMSLP38181-PMLP09176-Borodin-Sym2.Tambourine.pdf",
      instrument: "Perc Tambourine",
    },
    {
      pdf: "IMSLP601807-PMLP9176-IMSLP38181-PMLP09176-Borodin-Sym2.Triangle.pdf",
      instrument: "Perc Triángulo",
    },
    {
      pdf: "IMSLP601808-PMLP9176-IMSLP38182-PMLP09176-Borodin-Sym2.Harp.pdf",
      instrument: "Arpa",
    },
    {
      pdf: "IMSLP601809-PMLP9176-IMSLP38185-PMLP09176-Borodin-Sym2.Violin-1.pdf",
      instrument: "Violín 1",
    },
    {
      pdf: "IMSLP601810-PMLP9176-IMSLP38176-PMLP09176-Borodin-Sym2.Violin-2.pdf",
      instrument: "Violín 2",
    },
    {
      pdf: "IMSLP601811-PMLP9176-IMSLP38185-PMLP09176-Borodin-Sym2.Viola.pdf",
      instrument: "Viola",
    },
    {
      pdf: "IMSLP601812-PMLP9176-IMSLP26975-PMLP09176-Borodin_-_Symphony_No2_cello-part_a.pdf",
      instrument: "Violoncello",
    },
    {
      pdf: "IMSLP601813-PMLP9176-IMSLP38186-PMLP09176-Borodin-Sym2.Bass.pdf",
      instrument: "Contrabajo",
    },
  ],
};
