/**
 * Lote cámara / cuerdas (Para acomodar) — PDFs ya separados por instrumento.
 * Solo renombrado canónico (SCORE como whole; sin inspección página a página).
 */
export const PARA_ACOMODAR_ROOT =
  process.env.PARA_ACOMODAR_ROOT ||
  "H:\\Mi unidad\\Archivo General OFRN\\Para acomodar";

export const LOTE_CAMARA_CUERDAS = [
  {
    targetFolder: "Beethoven, L. - Quinteto de cuerdas en Do mayor, Op. 29",
    workNumber: "op.29",
    workTitle: "Quinteto de cuerdas",
    composerTag: "Beethoven, L",
    renames: [
      { pdf: "IMSLP17197-Violin1.pdf", instrument: "Violín 1" },
      { pdf: "IMSLP17198-Violin2.pdf", instrument: "Violín 2" },
      { pdf: "IMSLP17199-Viola1.pdf", instrument: "Viola 1" },
      { pdf: "IMSLP17200-Viola2.pdf", instrument: "Viola 2" },
      { pdf: "IMSLP17201-Cello.pdf", instrument: "Violoncello" },
    ],
  },
  {
    targetFolder: "Beethoven, L. - Trío de cuerdas en Re mayor, Op. 9 Nro. 2",
    workNumber: "op.9 nro.2",
    workTitle: "Trío de cuerdas",
    composerTag: "Beethoven, L",
    renames: [
      { pdf: "IMSLP475813-Violin.pdf", instrument: "Violín" },
      { pdf: "IMSLP475814-Viola.pdf", instrument: "Viola" },
      { pdf: "IMSLP475815-Cello.pdf", instrument: "Violoncello" },
    ],
  },
  {
    targetFolder: "Beethoven, L. - Cuarteto de cuerdas en Sol mayor, Op. 18 Nro. 2",
    workNumber: "op.18 nro.2",
    workTitle: "Cuarteto de cuerdas",
    composerTag: "Beethoven, L",
    renames: [
      { pdf: "IMSLP112705-Violin1.pdf", instrument: "Violín 1" },
      { pdf: "IMSLP112706-Violin2.pdf", instrument: "Violín 2" },
      { pdf: "IMSLP112707-Viola.pdf", instrument: "Viola" },
      { pdf: "IMSLP112708-Cello.pdf", instrument: "Violoncello" },
    ],
  },
  {
    targetFolder: "Mozart, W.A. - Cuarteto de cuerdas en Do mayor, K. 157",
    workNumber: "K.157",
    workTitle: "Cuarteto de cuerdas",
    composerTag: "Mozart, W.A",
    renames: [
      { pdf: "IMSLP01818-Violin1.pdf", instrument: "Violín 1" },
      { pdf: "IMSLP01819-Violin2.pdf", instrument: "Violín 2" },
      { pdf: "IMSLP01820-Viola.pdf", instrument: "Viola" },
      { pdf: "IMSLP01821-Cello.pdf", instrument: "Violoncello" },
    ],
  },
  {
    targetFolder: "Puccini, G. - Crisantemi, SC 65",
    workNumber: "SC 65",
    workTitle: "Crisantemi",
    composerTag: "Puccini, G",
    renames: [
      { pdf: "IMSLP1024327-SCORE.pdf", instrument: "SCORE" },
      { pdf: "IMSLP1024328-Violin1.pdf", instrument: "Violín 1" },
      { pdf: "IMSLP1024329-Violin2.pdf", instrument: "Violín 2" },
      { pdf: "IMSLP1024330-Viola.pdf", instrument: "Viola" },
      { pdf: "IMSLP1024331-Cello.pdf", instrument: "Violoncello" },
    ],
  },
  {
    targetFolder: "Grieg, E. - Suite Holberg, Op. 40 [cuerdas]",
    workNumber: "op.40",
    workTitle: "Suite Holberg",
    composerTag: "Grieg, E",
    renames: [
      { pdf: "IMSLP322046-SCORE.pdf", instrument: "SCORE" },
      { pdf: "IMSLP17680-Violin1.pdf", instrument: "Violín 1" },
      { pdf: "IMSLP17681-Violin2.pdf", instrument: "Violín 2" },
      { pdf: "IMSLP17682-Viola.pdf", instrument: "Viola" },
      { pdf: "IMSLP17683-Cello.pdf", instrument: "Violoncello" },
      { pdf: "IMSLP17684-Bass.pdf", instrument: "Contrabajo" },
    ],
  },
  {
    targetFolder: "Schoenberg, A. - Noche transfigurada, Op. 4 [cuerdas]",
    workNumber: "op.4",
    workTitle: "Noche transfigurada",
    composerTag: "Schoenberg, A",
    renames: [
      { pdf: "IMSLP892440-SCORE.pdf", instrument: "SCORE" },
      { pdf: "IMSLP48749-Violin1.pdf", instrument: "Violín 1" },
      { pdf: "IMSLP48750-Violin2.pdf", instrument: "Violín 2" },
      { pdf: "IMSLP48751-Viola1.pdf", instrument: "Viola 1" },
      { pdf: "IMSLP48752-Viola2.pdf", instrument: "Viola 2" },
      { pdf: "IMSLP27835-Cello.pdf", instrument: "Violoncello" },
      { pdf: "IMSLP48753-Bass.pdf", instrument: "Contrabajo" },
    ],
  },
  {
    targetFolder: "Williams, A. - Obertura de Concierto Nro. 1 en La menor, Op. 15",
    workNumber: "op.15",
    workTitle: "Obertura de Concierto Nro. 1",
    composerTag: "Williams, A",
    renames: [
      { pdf: "IMSLP826107-SCORE.pdf", instrument: "SCORE" },
      { pdf: "IMSLP826108-Piccolo.pdf", instrument: "Fl Piccolo" },
      { pdf: "IMSLP826109-Flute1.pdf", instrument: "Flauta 1" },
      { pdf: "IMSLP826110-Flute2.pdf", instrument: "Flauta 2" },
      { pdf: "IMSLP826111-Oboe1.pdf", instrument: "Oboe 1" },
      { pdf: "IMSLP826112-Oboe2.pdf", instrument: "Oboe 2" },
      { pdf: "IMSLP826113-Clarinet1.pdf", instrument: "Clarinete Bb 1" },
      { pdf: "IMSLP826114-Clarinet2.pdf", instrument: "Clarinete Bb 2" },
      { pdf: "IMSLP826115-Bassoon1.pdf", instrument: "Fagot 1" },
      { pdf: "IMSLP826116-Bassoon2.pdf", instrument: "Fagot 2" },
      { pdf: "IMSLP826117-Horn1.pdf", instrument: "Corno F 1" },
      { pdf: "IMSLP826118-Horn2.pdf", instrument: "Corno F 2" },
      { pdf: "IMSLP826119-Horn3.pdf", instrument: "Corno F 3" },
      { pdf: "IMSLP826120-Horn4.pdf", instrument: "Corno F 4" },
      { pdf: "IMSLP826121-Trumpet1.pdf", instrument: "Trompeta F 1" },
      { pdf: "IMSLP826122-Trumpet2.pdf", instrument: "Trompeta F 2" },
      { pdf: "IMSLP826123-Trombone1.pdf", instrument: "Trombón 1" },
      { pdf: "IMSLP826124-Trombone2.pdf", instrument: "Trombón 2" },
      { pdf: "IMSLP826125-Trombone3.pdf", instrument: "Trombón 3" },
      { pdf: "IMSLP826126-Tuba.pdf", instrument: "Tuba" },
      { pdf: "IMSLP826128-Timpani.pdf", instrument: "Perc Timbal" },
      { pdf: "IMSLP826127-Cymbals.pdf", instrument: "Perc Platillo" },
      { pdf: "IMSLP826129-Violin1.pdf", instrument: "Violín 1" },
      { pdf: "IMSLP826130-Violin2.pdf", instrument: "Violín 2" },
      { pdf: "IMSLP826131-Viola.pdf", instrument: "Viola" },
      { pdf: "IMSLP826132-Cello.pdf", instrument: "Violoncello" },
      { pdf: "IMSLP826133-Bass.pdf", instrument: "Contrabajo" },
    ],
  },
  {
    targetFolder: "Honegger, A. - Sinfonia Nro. 1, H. 75",
    workNumber: "H.75",
    workTitle: "Sinfonía Nro. 1",
    composerTag: "Honegger, A",
    renames: [
      { pdf: "IMSLP601166-SCORE.pdf", instrument: "SCORE" },
    ],
  },
  {
    targetFolder: "Reger, M. - Suite romantica, Op. 125",
    workNumber: "op.125",
    workTitle: "Suite romántica",
    composerTag: "Reger, M",
    renames: [
      { pdf: "IMSLP214845-SCORE.pdf", instrument: "SCORE" },
    ],
  },
  {
    targetFolder: "Schoenberg, A. - Variaciones para orquesta, Op. 31",
    workNumber: "op.31",
    workTitle: "Variaciones para orquesta",
    composerTag: "Schoenberg, A",
    renames: [
      { pdf: "IMSLP118325-SCORE.pdf", instrument: "SCORE" },
    ],
  },
  {
    targetFolder: "Holst, G. - Hammersmith, Op. 52 [orquesta SCORE]",
    workNumber: "op.52",
    workTitle: "Hammersmith",
    composerTag: "Holst, G",
    renames: [
      { pdf: "IMSLP736961-SCORE-orchestra.pdf", instrument: "SCORE" },
    ],
  },
  {
    targetFolder: "Beethoven-Khym - Sonata Op. 17, versión para quinteto",
    workNumber: "op.17",
    workTitle: "Sonata Op. 17 (quinteto)",
    composerTag: "Beethoven-Khym",
    renames: [
      { pdf: "IMSLP607394-SCORE.pdf", instrument: "SCORE" },
    ],
  },
];
