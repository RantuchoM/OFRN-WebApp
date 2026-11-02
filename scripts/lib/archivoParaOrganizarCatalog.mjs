/**
 * Lote desde `H:\Mi unidad\Archivo - para organizar` → Para acomodar.
 * Solo obras NO duplicadas en Archivo General OFRN / BD (verificado 2026-10-30).
 *
 * SKIP (ya en archivo/BD): Falla Homenajes (#3529, 31 PDFs), Back to the Future,
 * Avatar banda, Indiana Jones, Take Five, Chicago, Sabre Dance, Jurassic Park
 * (Williams/Lema/Sweeney), Misión Imposible Lema (#3603), Across the Stars, Huayno.
 *
 * Runner: scripts/process-archivo-para-organizar-local.mjs
 * Seed: scripts/generate-archivo-para-organizar-sync.mjs
 */
export const PARA_ACOMODAR_ROOT =
  process.env.PARA_ACOMODAR_ROOT ||
  "H:\\Mi unidad\\Archivo General OFRN\\Para acomodar";

export const PARA_ACOMODAR_FOLDER_ID = "10ap1aEjq3X9bFRB3z4DQ-F0fB7y3JutI";

export const SOURCE_ROOT =
  process.env.ARCHIVO_PARA_ORGANIZAR_ROOT ||
  "H:\\Mi unidad\\Archivo - para organizar";

export function driveFolderUrl(id) {
  return id ? `https://drive.google.com/open?id=${id}` : "";
}

/** Título corto para nombre de archivo (sin HTML). */
const short = (s) => s;

export const ARCHIVO_PARA_ORGANIZAR_WORKS = [
  // ——— Hay que completar / Queen ———
  {
    key: "queen-ribero",
    sourceRel: "Queen-Ribero, G. - Compilado Queen",
    targetFolder: "Queen-Ribero, G. - Compilado Queen",
    titulo: "Compilado Queen",
    tituloHtml: "<p>Compilado Queen</p>",
    workNumber: null,
    composerTag: "Ribero, G",
    compositors: [{ apellido: "Queen", nombre: null }],
    arranger: { apellido: "Ribero", nombre: "G." },
    observaciones:
      "Para acomodar — desde Archivo-para-organizar. Arreglo Ribero. Sin SCORE en el set original.",
  },
  {
    key: "hook-neverland",
    sourceRel:
      "Hay que completar\\Williams, J - Hook, The Flight to Neverland (faltan algunas partes)",
    targetFolder: "Williams, J. - Hook, The Flight to Neverland",
    titulo: short("Hook, The Flight to Neverland"),
    tituloHtml: "<p>Hook — The Flight to Neverland</p>",
    workNumber: null,
    composerTag: "Williams, J",
    compositors: [{ apellido: "Williams", nombre: "John" }],
    arranger: null,
    observaciones:
      "Para acomodar — Archivo-para-organizar/Hay que completar. Revisar sillas (p.ej. Trombón 1).",
  },
  {
    key: "jurassic-mundo-perdido",
    sourceRel: "Hay que completar\\Williams, J. - Jurassic Park, El Mundo Perdido",
    targetFolder: "Williams, J. - Jurassic Park, El Mundo Perdido",
    titulo: short("Jurassic Park, El Mundo Perdido"),
    tituloHtml: "<p>Jurassic Park — El Mundo Perdido</p>",
    workNumber: null,
    composerTag: "Williams, J",
    compositors: [{ apellido: "Williams", nombre: "John" }],
    arranger: null,
    observaciones:
      "Para acomodar — distinto de Jurassic Park (#2344/#3604). Sin SCORE en el set original.",
  },
  {
    key: "jurassic-highlights",
    sourceRel:
      "Hay que completar\\Williams-Custer - Jurassic Park, Highlights (falta Vc)",
    targetFolder: "Williams-Custer - Jurassic Park, Highlights",
    titulo: short("Jurassic Park, Highlights"),
    tituloHtml: "<p>Jurassic Park, Highlights</p>",
    workNumber: null,
    composerTag: "Williams-Custer",
    compositors: [{ apellido: "Williams", nombre: "John" }],
    arranger: { apellido: "Custer", nombre: null },
    observaciones:
      "Para acomodar — arr. Custer. Falta Violoncello en el set original.",
  },
  {
    key: "mision-imposible-custer",
    sourceRel:
      "Hay que completar\\Películas\\Schifrin-Custer - Misión Imposible (sin Score)",
    targetFolder: "Schifrin-Custer - Misión Imposible",
    titulo: short("Misión Imposible"),
    tituloHtml: "<p>Misión Imposible</p>",
    workNumber: null,
    composerTag: "Schifrin-Custer",
    compositors: [{ apellido: "Schifrin", nombre: "Lalo" }],
    arranger: { apellido: "Custer", nombre: null },
    observaciones:
      "Para acomodar — arr. Custer. Distinto de Schifrin-Lema (#3603). Sin SCORE.",
  },

  // ——— GEREZ banda / ensamble ———
  {
    key: "macondo",
    sourceRel: "GEREZ\\Ensamble\\Macondo",
    targetFolder: "Trad.-Gerez - Macondo [banda]",
    titulo: short("Macondo [banda]"),
    tituloHtml: "<p>Macondo</p><div>&nbsp; [versión banda]</div>",
    workNumber: null,
    composerTag: "Trad.-Gerez",
    compositors: [{ apellido: "Tradicional", nombre: null }],
    arranger: { apellido: "Gerez", nombre: null },
    tagBanda: true,
    observaciones:
      "Para acomodar — GEREZ/Ensamble. Organico de banda (sax/eufonio; sin Vl/Va).",
  },
  {
    key: "leon-bambuco",
    sourceRel: "GEREZ\\Ensamble\\Leon Bambuco",
    targetFolder: "Leon - Bambuco [banda]",
    titulo: short("Bambuco [banda]"),
    tituloHtml: "<p>Bambuco</p><div>&nbsp; [versión banda]</div>",
    workNumber: null,
    composerTag: "Leon",
    compositors: [{ apellido: "Leon", nombre: null }],
    arranger: null,
    tagBanda: true,
    observaciones: "Para acomodar — GEREZ/Ensamble Leon Bambuco. Banda.",
  },
  {
    key: "rozo-obertura",
    sourceRel:
      "GEREZ\\Ensamble\\Rozo Contreras, J. - Suite Sinfónica Colombiana\\01. Obertura",
    targetFolder: "Rozo Contreras, J. - Suite Sinfónica Colombiana - Obertura [banda]",
    titulo: short("Suite Sinfónica Colombiana - Obertura [banda]"),
    tituloHtml:
      "<p>Suite Sinfónica Colombiana</p><div>&nbsp; I. Obertura</div><div>&nbsp; [versión banda]</div>",
    workNumber: null,
    composerTag: "Rozo Contreras, J",
    compositors: [{ apellido: "Rozo Contreras", nombre: "José" }],
    arranger: null,
    tagBanda: true,
    observaciones: "Para acomodar — GEREZ/Ensamble. Mov. Obertura, banda.",
  },
  {
    key: "rozo-intermezzo",
    sourceRel:
      "GEREZ\\Ensamble\\Rozo Contreras, J. - Suite Sinfónica Colombiana\\02. Intermezzo",
    targetFolder:
      "Rozo Contreras, J. - Suite Sinfónica Colombiana - Intermezzo [banda]",
    titulo: short("Suite Sinfónica Colombiana - Intermezzo [banda]"),
    tituloHtml:
      "<p>Suite Sinfónica Colombiana</p><div>&nbsp; II. Intermezzo</div><div>&nbsp; [versión banda]</div>",
    workNumber: null,
    composerTag: "Rozo Contreras, J",
    compositors: [{ apellido: "Rozo Contreras", nombre: "José" }],
    arranger: null,
    tagBanda: true,
    observaciones: "Para acomodar — GEREZ/Ensamble. Mov. Intermezzo, banda.",
  },
  {
    key: "maculele",
    sourceRel:
      "GEREZ\\Ensamble\\Fortaleza-Rodriguez. Arr. Ferreira, M. - Maculelê",
    targetFolder: "Fortaleza-Rodriguez-Ferreira - Maculelê [banda]",
    titulo: short("Maculelê [banda]"),
    tituloHtml: "<p>Maculelê</p><div>&nbsp; [versión banda]</div>",
    workNumber: null,
    composerTag: "Fortaleza-Rodriguez-Ferreira",
    compositors: [{ apellido: "Fortaleza", nombre: null }],
    arranger: { apellido: "Ferreira", nombre: "M." },
    tagBanda: true,
    observaciones: "Para acomodar — GEREZ/Ensamble. Arr. Ferreira.",
  },
  {
    key: "pollera",
    sourceRel: "GEREZ\\Ensamble\\La-Pollera-colora",
    targetFolder: "Trad. - La Pollera Colora [banda]",
    titulo: short("La Pollera Colora [banda]"),
    tituloHtml: "<p>La Pollera Colora</p><div>&nbsp; [versión banda]</div>",
    workNumber: null,
    composerTag: "Trad",
    compositors: [{ apellido: "Tradicional", nombre: null }],
    arranger: null,
    tagBanda: true,
    observaciones:
      "Para acomodar — GEREZ/Ensamble. Set parcial de banda; se carga igual.",
  },

  // ——— Concerto competition ———
  {
    key: "vieuxtemps-m1",
    sourceRel:
      "CONCERTO COMPETITION 2024\\Hugo Debrun - Combinación de 2 Conciertos Franceses\\Vieuxtemps, H (SOLO 1ER MOVIMIENTO)",
    targetFolder: "Vieuxtemps, H. - Concierto para Violín Nro. 5 (I)",
    titulo: short("Concierto para Violín Nro. 5 (I)"),
    tituloHtml:
      "<p>Concierto para Violín Nro. 5 en La menor, Op. 37</p><div>&nbsp; I. Allegro non troppo</div>",
    workNumber: "op.37",
    composerTag: "Vieuxtemps, H",
    compositors: [{ apellido: "Vieuxtemps", nombre: "Henri" }],
    arranger: null,
    observaciones:
      "Para acomodar — Concerto Competition 2024 (solo 1er movimiento).",
  },
  {
    key: "saint-saens-m23",
    sourceRel:
      "CONCERTO COMPETITION 2024\\Hugo Debrun - Combinación de 2 Conciertos Franceses\\Saint-Säens - (SOLO 2DO Y 3ER MOVIMIENTO)",
    targetFolder: "Saint-Saëns, C. - Concierto para Violín Nro. 3 (II-III)",
    titulo: short("Concierto para Violín Nro. 3 (II-III)"),
    tituloHtml:
      "<p>Concierto para Violín Nro. 3 en Si menor, Op. 61</p><div>&nbsp; II. Andantino quasi allegretto</div><div>&nbsp; III. Molto allegro e maestoso</div>",
    workNumber: "op.61",
    composerTag: "Saint-Saëns, C",
    compositors: [{ apellido: "Saint-Saëns", nombre: "Camille" }],
    arranger: null,
    observaciones:
      "Para acomodar — Concerto Competition 2024 (solo 2º y 3º movimiento).",
  },

  // ——— Archivo viejo (no duplicados) ———
  {
    key: "phantom-menace",
    sourceRel: "Archivo viejo\\Phanton Menace",
    targetFolder: "Williams, J. - The Phantom Menace",
    titulo: short("The Phantom Menace"),
    tituloHtml: "<p>The Phantom Menace (Suite)</p>",
    workNumber: null,
    composerTag: "Williams, J",
    compositors: [{ apellido: "Williams", nombre: "John" }],
    arranger: null,
    observaciones: "Para acomodar — Archivo viejo/Phanton Menace.",
  },
  {
    key: "hirdaith",
    sourceRel: "Archivo viejo\\Macdonald Hector HIRDAITH",
    targetFolder: "Macdonald, H. - Hirdaith",
    titulo: short("Hirdaith"),
    tituloHtml: "<p>Hirdaith</p>",
    workNumber: null,
    composerTag: "Macdonald, H",
    compositors: [{ apellido: "Macdonald", nombre: "Hector" }],
    arranger: null,
    observaciones: "Para acomodar — Archivo viejo.",
  },
  {
    key: "strauss-don-juan",
    sourceRel: "Archivo viejo\\Strauss Don Juan",
    targetFolder: "Strauss, R. - Don Juan",
    titulo: short("Don Juan"),
    tituloHtml: "<p>Don Juan, Op. 20</p>",
    workNumber: "op.20",
    composerTag: "Strauss, R",
    compositors: [{ apellido: "Strauss", nombre: "Richard" }],
    arranger: null,
    observaciones: "Para acomodar — Archivo viejo.",
  },
  {
    key: "carmina-fortuna",
    sourceRel: "Archivo viejo\\Carmina Burana (O Fortuna)",
    targetFolder: "Orff, C. - O Fortuna (Carmina Burana)",
    titulo: short("O Fortuna (Carmina Burana)"),
    tituloHtml: "<p>O Fortuna (Carmina Burana)</p>",
    workNumber: null,
    composerTag: "Orff, C",
    compositors: [{ apellido: "Orff", nombre: "Carl" }],
    arranger: null,
    observaciones: "Para acomodar — Archivo viejo (solo O Fortuna).",
  },
  {
    key: "espel-otra-latitud",
    sourceRel: "Archivo viejo\\Guillo Espel\\05 Otra Latitud Guillo Espel",
    targetFolder: "Espel, G. - Otra Latitud",
    titulo: short("Otra Latitud"),
    tituloHtml: "<p>Otra Latitud</p>",
    workNumber: null,
    composerTag: "Espel, G",
    compositors: [{ apellido: "Espel", nombre: "Guillo" }],
    arranger: null,
    observaciones: "Para acomodar — Archivo viejo/Guillo Espel.",
  },
  {
    key: "espel-vidala",
    sourceRel: "Archivo viejo\\Guillo Espel\\04 Vidala del Martirio Guillo Espel",
    targetFolder: "Espel, G. - Vidala del Martirio",
    titulo: short("Vidala del Martirio"),
    tituloHtml: "<p>Vidala del Martirio</p>",
    workNumber: null,
    composerTag: "Espel, G",
    compositors: [{ apellido: "Espel", nombre: "Guillo" }],
    arranger: null,
    observaciones: "Para acomodar — Archivo viejo/Guillo Espel.",
  },
  {
    key: "espel-salir",
    sourceRel: "Archivo viejo\\Guillo Espel\\03 Salir al Ruedo Guillo Espel",
    targetFolder: "Espel, G. - Salir al Ruedo",
    titulo: short("Salir al Ruedo"),
    tituloHtml: "<p>Salir al Ruedo</p>",
    workNumber: null,
    composerTag: "Espel, G",
    compositors: [{ apellido: "Espel", nombre: "Guillo" }],
    arranger: null,
    observaciones: "Para acomodar — Archivo viejo/Guillo Espel.",
  },
  {
    key: "espel-fabi",
    sourceRel: "Archivo viejo\\Guillo Espel\\02 Fabi Guillo Espel",
    targetFolder: "Espel, G. - Fabi",
    titulo: short("Fabi"),
    tituloHtml: "<p>Fabi</p>",
    workNumber: null,
    composerTag: "Espel, G",
    compositors: [{ apellido: "Espel", nombre: "Guillo" }],
    arranger: null,
    observaciones: "Para acomodar — Archivo viejo/Guillo Espel.",
  },
  {
    key: "retamosa-anos",
    sourceRel:
      "Archivo viejo\\Jorge Retamosa\\Años de Soledad 2232-4331-Timp-Perc-String",
    targetFolder: "Retamosa, J. - Años de Soledad",
    titulo: short("Años de Soledad"),
    tituloHtml: "<p>Años de Soledad</p>",
    workNumber: null,
    composerTag: "Retamosa, J",
    compositors: [{ apellido: "Retamosa", nombre: "Jorge" }],
    arranger: null,
    observaciones:
      "Para acomodar — distinto de Piazzolla Años de Soledad (#2140).",
  },
  {
    key: "retamosa-dia",
    sourceRel:
      "Archivo viejo\\Jorge Retamosa\\El dia que me quieras 2222-4331-Timp-Perc-String",
    targetFolder: "Retamosa, J. - El día que me quieras",
    titulo: short("El día que me quieras"),
    tituloHtml: "<p>El día que me quieras</p>",
    workNumber: null,
    composerTag: "Retamosa, J",
    compositors: [{ apellido: "Retamosa", nombre: "Jorge" }],
    arranger: null,
    observaciones:
      "Para acomodar — orquesta Retamosa (distinto de Gardel/Lema bronces/maderas).",
  },
  {
    key: "retamosa-reminiscencia",
    sourceRel:
      "Archivo viejo\\Jorge Retamosa\\Reminiscencia 2232-4231-Timp-Perc-String",
    targetFolder: "Retamosa, J. - Reminiscencia",
    titulo: short("Reminiscencia"),
    tituloHtml: "<p>Reminiscencia</p>",
    workNumber: null,
    composerTag: "Retamosa, J",
    compositors: [{ apellido: "Retamosa", nombre: "Jorge" }],
    arranger: null,
    observaciones: "Para acomodar — Archivo viejo/Retamosa.",
  },
  {
    key: "retamosa-toda",
    sourceRel:
      "Archivo viejo\\Jorge Retamosa\\Toda Mi Vida 3222-4331-Timp-Perc-String",
    targetFolder: "Retamosa, J. - Toda Mi Vida",
    titulo: short("Toda Mi Vida"),
    tituloHtml: "<p>Toda Mi Vida</p>",
    workNumber: null,
    composerTag: "Retamosa, J",
    compositors: [{ apellido: "Retamosa", nombre: "Jorge" }],
    arranger: null,
    observaciones: "Para acomodar — Archivo viejo/Retamosa.",
  },
  {
    key: "retamosa-concertango-1",
    sourceRel:
      "Archivo viejo\\Jorge Retamosa\\Concertango\\Concertango 1 Movimiento 3232-4231-Timp-Perc-String",
    targetFolder: "Retamosa, J. - Concertango (I)",
    titulo: short("Concertango (I)"),
    tituloHtml: "<p>Concertango</p><div>&nbsp; I</div>",
    workNumber: null,
    composerTag: "Retamosa, J",
    compositors: [{ apellido: "Retamosa", nombre: "Jorge" }],
    arranger: null,
    observaciones: "Para acomodar — Concertango 1er movimiento.",
  },
  {
    key: "retamosa-concertango-3",
    sourceRel:
      "Archivo viejo\\Jorge Retamosa\\Concertango\\Concertango 3 Movimiento 2232-4231-Timp-Perc-String",
    targetFolder: "Retamosa, J. - Concertango (III)",
    titulo: short("Concertango (III)"),
    tituloHtml: "<p>Concertango</p><div>&nbsp; III</div>",
    workNumber: null,
    composerTag: "Retamosa, J",
    compositors: [{ apellido: "Retamosa", nombre: "Jorge" }],
    arranger: null,
    observaciones: "Para acomodar — Concertango 3er movimiento.",
  },
  {
    key: "nicoletti-qhapaq",
    sourceRel:
      "Archivo viejo\\Obras Pablo Nicoletti Instumentos Autóctonos\\Qhapaqkunap (3433-4331-per+2-pf-str)",
    targetFolder: "Nicoletti, J.P. - Qhapaqkunap",
    titulo: short("Qhapaqkunap"),
    tituloHtml: "<p>Qhapaqkunap</p>",
    workNumber: null,
    composerTag: "Nicoletti, J.P",
    compositors: [{ apellido: "Nicoletti", nombre: "Juan Pablo" }],
    arranger: null,
    observaciones:
      "Para acomodar — Archivo viejo (preferir sobre copia REVISAR/OIANT).",
  },
  {
    key: "nicoletti-bishmaia",
    sourceRel:
      "Archivo viejo\\Obras Pablo Nicoletti Instumentos Autóctonos\\Bishmaia Hanacpachapi (3332-4331-tmp+2-str)",
    targetFolder: "Nicoletti, J.P. - Bishmaia Hanacpachapi",
    titulo: short("Bishmaia Hanacpachapi"),
    tituloHtml: "<p>Bishmaia Hanacpachapi</p>",
    workNumber: null,
    composerTag: "Nicoletti, J.P",
    compositors: [{ apellido: "Nicoletti", nombre: "Juan Pablo" }],
    arranger: null,
    observaciones: "Para acomodar — Archivo viejo/Nicoletti.",
  },
  {
    key: "nicoletti-lonquen",
    sourceRel:
      "Archivo viejo\\Obras Pablo Nicoletti Instumentos Autóctonos\\Lonquen (3222-4231-Perc x 3- String)",
    targetFolder: "Nicoletti, J.P. - Lonquen",
    titulo: short("Lonquen"),
    tituloHtml: "<p>Lonquen</p>",
    workNumber: null,
    composerTag: "Nicoletti, J.P",
    compositors: [{ apellido: "Nicoletti", nombre: "Juan Pablo" }],
    arranger: null,
    observaciones: "Para acomodar — Archivo viejo/Nicoletti.",
  },
  {
    key: "secreto-cancha",
    sourceRel: "Archivo viejo\\El Secreto\\La Cancha",
    targetFolder: "El Secreto - La Cancha",
    titulo: short("La Cancha"),
    tituloHtml: "<p>La Cancha</p><div>&nbsp; (El Secreto)</div>",
    workNumber: null,
    composerTag: "El Secreto",
    compositors: [{ apellido: "El Secreto", nombre: null }],
    arranger: null,
    observaciones: "Para acomodar — Archivo viejo/El Secreto.",
  },
  {
    key: "secreto-duda",
    sourceRel: "Archivo viejo\\El Secreto\\La Duda",
    targetFolder: "El Secreto - La Duda",
    titulo: short("La Duda"),
    tituloHtml: "<p>La Duda</p><div>&nbsp; (El Secreto)</div>",
    workNumber: null,
    composerTag: "El Secreto",
    compositors: [{ apellido: "El Secreto", nombre: null }],
    arranger: null,
    observaciones: "Para acomodar — Archivo viejo/El Secreto.",
  },
  {
    key: "secreto-retiro",
    sourceRel: "Archivo viejo\\El Secreto\\Retiro Obelisco",
    targetFolder: "El Secreto - Retiro Obelisco",
    titulo: short("Retiro Obelisco"),
    tituloHtml: "<p>Retiro Obelisco</p><div>&nbsp; (El Secreto)</div>",
    workNumber: null,
    composerTag: "El Secreto",
    compositors: [{ apellido: "El Secreto", nombre: null }],
    arranger: null,
    observaciones: "Para acomodar — Archivo viejo/El Secreto.",
  },
  {
    key: "vientosdeagua",
    sourceRel: "Archivo viejo\\Vientosdeagua",
    targetFolder: "Vientos de Agua",
    titulo: short("Vientos de Agua"),
    tituloHtml: "<p>Vientos de Agua</p>",
    workNumber: null,
    composerTag: "Vientos de Agua",
    compositors: [{ apellido: "Vientos de Agua", nombre: null }],
    arranger: null,
    observaciones: "Para acomodar — Archivo viejo.",
  },
];
