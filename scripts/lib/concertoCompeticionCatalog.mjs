/**
 * Concerto Competition 2026/27 — ediciones IMSLP con score y partes del mismo set.
 * Para acomodar. link_drive = carpeta original (no copiar_carpeta_a_archivo).
 */
export const PARA_ACOMODAR_ROOT =
  process.env.PARA_ACOMODAR_ROOT ||
  "H:\\Mi unidad\\Archivo General OFRN\\Para acomodar";

export const CONCERTO_COMPETICION_WORKS = [
  {
    key: "mendelssohn-vn-op64",
    targetFolder: "Mendelssohn, F. - Concierto para Violín en Mi menor, Op. 64",
    titulo: "Concierto para Violín en Mi menor",
    workNumber: "op.64",
    composerTag: "Mendelssohn, F",
    compositor: { apellido: "Mendelssohn-Bartholdy", nombre: "Félix" },
    anio: 1844,
    observaciones:
      "Para acomodar. Orquesta: Breitkopf/Kalmus A1706 (Rietz). Violín solo: Carl Fischer 1917, Leopold Auer, IMSLP #49678 (otra edición; el set Kalmus no trae solo).",
    imslp: "https://imslp.org/wiki/Violin_Concerto,_Op.64_(Mendelssohn,_Felix)",
    edition:
      "Orquesta: Breitkopf und Härtel ca.1890, reimpresión Kalmus A1706 (Rietz). Score #761698 (1008) + partes #35479–35486 / #20825–20826 / #26275 (suma 122171). El set Kalmus no trae violín solo. Solo: Carl Fischer 1917, ed. Leopold Auer, placa 19692, #49678 (115611), Public Domain, 14 pp.; título y música en la misma página, sin recorte.",
    splits: [
      {
        pdf: "PMLP4931-MEND_VnConcOp64(Breitkopf)_FS(PM)-ForIMSLP.pdf",
        parts: [{ instrument: "SCORE", start: 3, end: 57 }],
      },
      {
        pdf: "PMLP04931-Mendelssohn-VnConc.Flute.pdf",
        parts: [
          { instrument: "Flauta 1", start: 1, end: 4 },
          { instrument: "Flauta 2", start: 5, end: 7 },
        ],
      },
      {
        pdf: "PMLP04931-Mendelssohn-VnConc.Oboe.pdf",
        parts: [
          { instrument: "Oboe 1", start: 1, end: 4 },
          { instrument: "Oboe 2", start: 5, end: 6 },
        ],
      },
      {
        pdf: "PMLP04931-Mendelssohn-VnConc.Clarinet.pdf",
        parts: [
          { instrument: "Clarinete A 1", start: 1, end: 4 },
          { instrument: "Clarinete A 2", start: 5, end: 8 },
        ],
      },
      {
        pdf: "PMLP04931-Mendelssohn-VnConc.Bassoon.pdf",
        parts: [
          { instrument: "Fagot 1", start: 1, end: 4 },
          { instrument: "Fagot 2", start: 5, end: 8 },
        ],
      },
      {
        pdf: "PMLP04931-Mendelssohn-VnConc.Horn.pdf",
        parts: [
          { instrument: "Corno E 1", start: 1, end: 3 },
          { instrument: "Corno E 2", start: 4, end: 6 },
        ],
      },
      {
        pdf: "PMLP04931-Mendelssohn-VnConc.Trumpet.pdf",
        parts: [
          { instrument: "Trompeta E 1", start: 1, end: 2 },
          { instrument: "Trompeta E 2", start: 3, end: 4 },
        ],
      },
    ],
    renames: [
      { pdf: "PMLP04931-Mendelssohn-VnConc.Timpani.pdf", instrument: "Perc Timbal" },
      { pdf: "PMLP04931-Mendelssohn-VnConc.Viola.pdf", instrument: "Viola" },
      { pdf: "PMLP04931-Mendelssohn_Violin_Concerto_V1.pdf", instrument: "Violín 1" },
      { pdf: "PMLP04931-Mendelssohn_Violin_Concerto_V2.pdf", instrument: "Violín 2" },
      {
        pdf: "PMLP04931-Mendelssohn_-_Violin_Concerto_in_E_minor_(cello-part)a.pdf",
        instrument: "Violoncello y Contrabajo",
      },
      {
        pdf: "PMLP04931-Mendelssohn_-_Violin_Concerto_in_E_Minor_(Auer)_Op64_violin.pdf",
        instrument: "Violín Solo",
      },
    ],
  },
  {
    key: "wieniawski-vn2-op22",
    targetFolder: "Wieniawski, H. - Concierto para Violín Nro 2, Op. 22",
    titulo: "Concierto para Violín Nro 2 en Re menor",
    workNumber: "op.22",
    composerTag: "Wieniawski, H",
    compositor: { apellido: "Wieniawski", nombre: "Henryk" },
    anio: 1862,
    observaciones:
      "Para acomodar. Karol Jaworski 2021, CC BY-SA 4.0. Incluye violín solo de la misma edición.",
    imslp: "https://imslp.org/wiki/Violin_Concerto_No.2,_Op.22_(Wieniawski,_Henryk)",
    edition:
      "Karol Jaworski 2021, CC BY-SA 4.0. Score #673402 (9565) + partes #673405–673417 (suma 35059). Vientos y trombones van 1y2 / 1y2y3 en la misma hoja.",
    splits: [
      {
        pdf: "PMLP10223-Wieniawski-Concerto_No.2_Full_Score.pdf",
        parts: [{ instrument: "SCORE", start: 3, end: 83 }],
      },
      {
        pdf: "PMLP10223-Wieniawski-Concerto_No.2_Violin-solo.pdf",
        parts: [{ instrument: "Violín Solo", start: 3, end: 19 }],
      },
      {
        pdf: "PMLP10223-Wieniawski-Concerto_No.2_TrumpetsBbD.pdf",
        // Dos PDFs, dos sillas: Trompeta 1 y 2. Re y Sib son links de la misma parte, no cuatro slots.
        parts: [
          { instrument: "Trompeta D 1y2", start: 1, end: 4 },
          { instrument: "Trompeta Bb 1y2", start: 5, end: 8 },
        ],
      },
    ],
    renames: [
      { pdf: "PMLP10223-Wieniawski-Concerto_No.2_Flutes.pdf", instrument: "Flauta 1y2" },
      { pdf: "PMLP10223-Wieniawski-Concerto_No.2_Oboes.pdf", instrument: "Oboe 1y2" },
      { pdf: "PMLP10223-Wieniawski-Concerto_No.2_ClarinetsBb.pdf", instrument: "Clarinete Bb 1y2" },
      { pdf: "PMLP10223-Wieniawski-Concerto_No.2_Bassoons.pdf", instrument: "Fagot 1y2" },
      { pdf: "PMLP10223-Wieniawski-Concerto_No.2_HornF.pdf", instrument: "Corno F 1y2" },
      { pdf: "PMLP10223-Wieniawski-Concerto_No.2_Trombones.pdf", instrument: "Trombón 1y2y3" },
      { pdf: "PMLP10223-Wieniawski-Concerto_No.2_Timpani_in_D,_A.pdf", instrument: "Perc Timbal" },
      { pdf: "PMLP10223-Wieniawski-Concerto_No.2_Violin_I.pdf", instrument: "Violín 1" },
      { pdf: "PMLP10223-Wieniawski-Concerto_No.2_Violin_II.pdf", instrument: "Violín 2" },
      { pdf: "PMLP10223-Wieniawski-Concerto_No.2_Viola.pdf", instrument: "Viola" },
      {
        pdf: "PMLP10223-Wieniawski-Concerto_No.2_Violoncello,_Double_Bass.pdf",
        instrument: "Violoncello y Contrabajo",
      },
    ],
  },
  {
    key: "mozart-oboe-k314",
    targetFolder: "Mozart, W.A. - Concierto para Oboe en Do Mayor, K. 314",
    titulo: "Concierto para Oboe en Do Mayor",
    workNumber: "K. 314",
    composerTag: "Mozart, W.A",
    compositor: { apellido: "Mozart", nombre: "Wolfgang Amadeus" },
    anio: 1777,
    observaciones:
      "Para acomodar. Alexander Gagarinov, CC BY-NC 3.0. Incluye oboe solo de la misma edición.",
    imslp: "https://imslp.org/wiki/Oboe_Concerto_in_C_major,_K.314/271k_(Mozart,_Wolfgang_Amadeus)",
    edition:
      "Alexander Gagarinov, CC BY-NC 3.0. Score #90786 (36732) + partes orquesta #90788–90793 y oboes separados #93744–93745 (suma partes 63998, sin contar el PDF combinado Oboe 1/2 que no se bajó). Título y música comparten la página 1: no se recorta.",
    splits: [],
    renames: [
      { pdf: "PMLP76266-Mozart_Oboe_Concerto_Partitura.pdf", instrument: "SCORE" },
      {
        pdf: "PMLP76266-Mozart_Oboe_Concerto_Partitura_-_Oboe_Solo_-_2011-01-20_2114.pdf",
        instrument: "Oboe Solo",
      },
      { pdf: "PMLP76266-Mozart_Oboe_Concerto_Partitura_-_Oboe_1.pdf", instrument: "Oboe 1" },
      { pdf: "PMLP76266-Mozart_Oboe_Concerto_Partitura_-_Oboe_2.pdf", instrument: "Oboe 2" },
      {
        pdf: "PMLP76266-Mozart_Oboe_Concerto_Partitura_-_Horn_in_\u0421,F_1,2_-_2011-01-20_2114.pdf",
        instrument: "Corno 1y2",
      },
      {
        pdf: "PMLP76266-Mozart_Oboe_Concerto_Partitura_-_Violin_I_-_2011-01-20_2114.pdf",
        instrument: "Violín 1",
      },
      {
        pdf: "PMLP76266-Mozart_Oboe_Concerto_Partitura_-_Violin_II_-_2011-01-20_2114.pdf",
        instrument: "Violín 2",
      },
      {
        pdf: "PMLP76266-Mozart_Oboe_Concerto_Partitura_-_Viola_-_2011-01-20_2114.pdf",
        instrument: "Viola",
      },
      {
        pdf: "PMLP76266-Mozart_Oboe_Concerto_Partitura_-_Violoncello_e_Basso_-_2011-01-20_2114.pdf",
        instrument: "Violoncello y Contrabajo",
      },
    ],
  },
  {
    key: "casadesus-va-cm",
    targetFolder: "Casadesus, H. - Concierto para Viola en Do menor",
    titulo: "Concierto para Viola en Do menor",
    workNumber: null,
    composerTag: "Casadesus, H",
    compositor: { apellido: "Bach", nombre: "Johann Christian" },
    arranger: { apellido: "Casadesus", nombre: "Henri" },
    anio: 1947,
    observaciones:
      "Para acomodar. Orquesta: Salabert 1947 (IMSLP-EU, Non-PD US). Viola solo: Senart/Peters IMSLP #29902, otra edición.",
    imslp: "https://imslp.org/wiki/Viola_Concerto_in_the_Style_of_J.C._Bach_(Casadesus,_Henri)",
    edition:
      "Salabert 1947 (Non-PD US, servido por IMSLP-EU). Score #1043637 (691) + partes #1043626–1043636. La página 1 de cada PDF es la primera hoja de esa parte (título + música): se conserva entera. Solo de viola: Senart/Peters #29902 (116292), otra edición; también se conserva su página 1.",
    splits: [
      {
        pdf: "PMLP67403-casadesus-viola-concerto-score.pdf",
        parts: [{ instrument: "SCORE", start: 1, end: 57 }],
      },
      {
        pdf: "PMLP67403-casadesus-viola-concerto-01-fl1-fl2.pdf",
        parts: [{ instrument: "Flauta 1y2", start: 1, end: 7 }],
      },
      {
        pdf: "PMLP67403-casadesus-viola-concerto-02-ob.pdf",
        parts: [{ instrument: "Oboe", start: 1, end: 7 }],
      },
      {
        pdf: "PMLP67403-casadesus-viola-concerto-03-bn1-bn2.pdf",
        parts: [{ instrument: "Fagot 1y2", start: 1, end: 7 }],
      },
      {
        pdf: "PMLP67403-casadesus-viola-concerto-04-hn1-hn2.pdf",
        parts: [{ instrument: "Corno F 1y2", start: 1, end: 7 }],
      },
      {
        pdf: "PMLP67403-casadesus-viola-concerto-05-tpt1-tpt2.pdf",
        parts: [{ instrument: "Trompeta 1y2", start: 1, end: 2 }],
      },
      {
        pdf: "PMLP67403-casadesus-viola-concerto-06-timp.pdf",
        parts: [{ instrument: "Perc Timbal", start: 1, end: 2 }],
      },
      {
        pdf: "PMLP67403-casadesus-viola-concerto-07-vn1.pdf",
        parts: [{ instrument: "Violín 1", start: 1, end: 6 }],
      },
      {
        pdf: "PMLP67403-casadesus-viola-concerto-08-vn2.pdf",
        parts: [{ instrument: "Violín 2", start: 1, end: 6 }],
      },
      {
        pdf: "PMLP67403-casadesus-viola-concerto-09-va.pdf",
        parts: [{ instrument: "Viola", start: 1, end: 5 }],
      },
      {
        pdf: "PMLP67403-casadesus-viola-concerto-10-vc.pdf",
        parts: [{ instrument: "Violoncello", start: 1, end: 6 }],
      },
      {
        pdf: "PMLP67403-casadesus-viola-concerto-11-db.pdf",
        parts: [{ instrument: "Contrabajo", start: 1, end: 5 }],
      },
      {
        pdf: "PMLP54159-JC_Bach_Viola_Concerto_Cadasesus_Part.pdf",
        parts: [{ instrument: "Viola Solo", start: 1, end: 7 }],
      },
    ],
    renames: [],
  },
];
