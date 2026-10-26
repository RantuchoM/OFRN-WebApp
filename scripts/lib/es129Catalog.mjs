/**
 * Gira 129 — Música Argentina y Latinoamericana (ES 04/26).
 * Fuente local: C:\Users\marti\Downloads\ES
 *
 * Orden de programa (repertorio):
 * 1 Miniatura 3 Williams (nueva)
 * 2 Niebla Williams (ya en archivo 3232 — no reprocesar PDF)
 * 3 Ave Maria Barbieri (nueva)
 * 4 Minué Esnaola (nueva)
 * 5 Andante App. Soro (nueva, piano; pendiente arr. cuarteto)
 * 6 Danza Cubana 2 Cervantes (nueva)
 * 7 Retablo Revueltas (nueva)
 * 8 Oblivion Piazzolla/Kremer (nueva)
 * 9 Fiesta Criolla Gómez Carrillo (ya en archivo 2925 — sin PDF)
 */
export const PARA_ACOMODAR_ROOT =
  process.env.PARA_ACOMODAR_ROOT ||
  "H:\\Mi unidad\\Archivo General OFRN\\Para acomodar";

export const PARA_ACOMODAR_FOLDER_ID = "10ap1aEjq3X9bFRB3z4DQ-F0fB7y3JutI";

export const ES_DOWNLOADS =
  process.env.ES_DOWNLOADS || "C:\\Users\\marti\\Downloads\\ES";

export const GIRA_129 = {
  id_programa: 129,
  id_repertorio: 99,
  bloque: "Repertorio",
};

/** Ya en archivo: solo vincular a repertorio. */
export const EXISTING_WORKS = [
  {
    orden: 2,
    obraId: 3232,
    label: "Niebla en la Pampa (Williams)",
    duracion_segundos: 180,
  },
  {
    orden: 9,
    obraId: 2925,
    label: "Fiesta Criolla (Gómez Carrillo)",
    duracion_segundos: 900,
  },
];

/**
 * Obras nuevas a partir de PDFs en Downloads/ES.
 * `sourceMatch` matchea el nombre del PDF fuente (fold/normalizado en el process).
 */
export const NEW_WORKS = [
  {
    key: "miniatura3",
    orden: 1,
    sourceMatch: /miniatura\s*3/i,
    targetFolder: "Williams, A. - Miniatura Op. 31 Nº 3",
    titulo: "<p>Miniatura Op. 31 Nº 3</p>",
    workTitle: "Miniatura Op. 31 Nº 3",
    workNumber: "op.31 Nº 3",
    composerTag: "Williams, A",
    compositor: { apellido: "Williams", nombre: "Alberto" },
    arranger: null,
    anio: 1892,
    duracion_segundos: 180,
    observaciones:
      "Para acomodar — Williams, A. - Miniatura Op. 31 Nº 3. Orquesta de cuerdas (1892). Edición Instituto de Investigación en Etnomusicología © 2016.",
    splits: [
      {
        // se rellena con el nombre real del PDF copiado
        pdfKey: "source",
        parts: [
          { instrument: "SCORE", start: 2, end: 4 },
          { instrument: "Violín 1", start: 6, end: 6 },
          { instrument: "Violín 2", start: 8, end: 8 },
          { instrument: "Viola", start: 10, end: 10 },
          { instrument: "Violoncello", start: 12, end: 12 },
          { instrument: "Contrabajo", start: 14, end: 14 },
        ],
      },
    ],
  },
  {
    key: "aveMariaBarbieri",
    orden: 3,
    sourceMatch: /barbieri.*ave\s*maria|ave\s*maria.*barbieri/i,
    targetFolder: "Barbieri, A.M. - Ave Maria",
    titulo: "<p>Ave Maria</p>",
    workTitle: "Ave Maria",
    workNumber: null,
    composerTag: "Barbieri, A.M",
    compositor: { apellido: "Barbieri", nombre: "Antonio María" },
    arranger: null,
    anio: null,
    duracion_segundos: 240,
    observaciones:
      "Para acomodar — Barbieri, A.M. - Ave Maria. Coro mixto SATB a cappella. Edición Rodrigo Ruelas Villela 2017 (IMSLP).",
    splits: [
      {
        pdfKey: "source",
        parts: [{ instrument: "SCORE", start: 1, end: 2 }],
      },
    ],
  },
  {
    key: "minueEsnaola",
    orden: 4,
    sourceMatch: /esnaola/i,
    targetFolder: "Esnaola, J.P. - Minué en Fa mayor",
    titulo: "<p>Minué en Fa mayor</p>",
    workTitle: "Minué en Fa mayor",
    workNumber: null,
    composerTag: "Esnaola, J.P",
    compositor: { apellido: "Esnaola", nombre: "Juan Pedro" },
    arranger: null,
    anio: null,
    duracion_segundos: 180,
    observaciones:
      "Para acomodar — Esnaola, J.P. - Minué en Fa mayor. Orquesta de cuerdas.",
    splits: [
      {
        pdfKey: "source",
        parts: [
          { instrument: "SCORE", start: 1, end: 2 },
          { instrument: "Violín 1", start: 3, end: 3 },
          { instrument: "Violín 2", start: 4, end: 4 },
          { instrument: "Viola", start: 5, end: 5 },
          { instrument: "Violoncello", start: 6, end: 6 },
          { instrument: "Contrabajo", start: 7, end: 7 },
        ],
      },
    ],
  },
  {
    key: "andanteSoro",
    orden: 5,
    sourceMatch: /soro|andante\s*app/i,
    targetFolder: "Soro, E. - Andante Appassionato, Op. 2",
    titulo: "<p>Andante Appassionato, Op. 2</p>",
    workTitle: "Andante Appassionato, Op. 2",
    workNumber: "op.2",
    composerTag: "Soro, E",
    compositor: { apellido: "Soro", nombre: "Enrique" },
    arranger: null,
    anio: null,
    duracion_segundos: 390,
    observaciones:
      "Para acomodar — Soro, E. - Andante Appassionato, Op. 2. Partitura de piano (fuente). Pendiente arreglo para cuarteto de cuerdas.",
    splits: [
      {
        pdfKey: "source",
        parts: [{ instrument: "Piano", start: 1, end: 7 }],
      },
    ],
  },
  {
    key: "danzaCubana",
    orden: 6,
    sourceMatch: /cervantes|danza\s*cubana/i,
    targetFolder: "Cervantes, I. - Danza Cubana Nro. 2",
    titulo: "<p>Danza Cubana Nro. 2</p>",
    workTitle: "Danza Cubana Nro. 2",
    workNumber: null,
    composerTag: "Cervantes, I",
    compositor: { apellido: "Cervantes", nombre: "Ignacio" },
    arranger: { apellido: "Montgomery", nombre: "Lourdes" },
    anio: null,
    duracion_segundos: 180,
    observaciones:
      "Para acomodar — Cervantes, I. - Danza Cubana Nro. 2. Arr. orquesta de cuerdas Lourdes Montgomery. Solo partes (sin SCORE).",
    splits: [
      {
        pdfKey: "source",
        parts: [
          { instrument: "Violín 1", start: 1, end: 1 },
          { instrument: "Violín 2", start: 2, end: 2 },
          { instrument: "Viola", start: 3, end: 3 },
          { instrument: "Violoncello", start: 4, end: 4 },
          { instrument: "Contrabajo", start: 5, end: 5 },
        ],
      },
    ],
  },
  {
    key: "retablo",
    orden: 7,
    sourceMatch: /revueltas|retablo/i,
    targetFolder: "Revueltas, S. - Retablo",
    titulo: "<p>Retablo</p>",
    workTitle: "Retablo",
    workNumber: null,
    composerTag: "Revueltas, S",
    compositor: { apellido: "Revueltas", nombre: "Silvestre" },
    arranger: { apellido: "Aponte Cupido", nombre: "Gerardo" },
    anio: null,
    duracion_segundos: 480,
    observaciones:
      "Para acomodar — Revueltas, S. - Retablo. Texto Xavier Villaurrutia. Adaptación para quinteto de cuerdas y voz: Gerardo Aponte Cupido. La voz figura en el SCORE (no hay particella vocal separada).",
    splits: [
      {
        pdfKey: "source",
        parts: [
          { instrument: "SCORE", start: 1, end: 15 },
          { instrument: "Violín 1", start: 16, end: 20 },
          { instrument: "Violín 2", start: 21, end: 25 },
          { instrument: "Viola", start: 26, end: 30 },
          { instrument: "Violoncello", start: 31, end: 36 },
          { instrument: "Contrabajo", start: 37, end: 41 },
        ],
      },
    ],
  },
  {
    key: "oblivionKremer",
    orden: 8,
    sourceMatch: /oblivion.*kremer|kremer.*oblivion|piazzolla.*oblivion/i,
    targetFolder: "Piazzolla, A. - Oblivion [arr. Kremer]",
    titulo: "<p>Oblivion</p>",
    workTitle: "Oblivion",
    workNumber: null,
    composerTag: "Piazzolla, A",
    compositor: { apellido: "Piazzolla", nombre: "Astor" },
    arranger: { apellido: "Kremer", nombre: "Gidon" },
    anio: null,
    duracion_segundos: 180,
    observaciones:
      "Para acomodar — Piazzolla, A. - Oblivion [arr. Kremer]. SCORE de cuerdas con línea solista + particella Violín Solo manuscrita (arr. Gidon Kremer). Sin partes de orquesta separadas en el PDF fuente.",
    splits: [
      {
        pdfKey: "source",
        parts: [
          { instrument: "SCORE", start: 1, end: 6 },
          { instrument: "Violín Solo", start: 7, end: 8 },
        ],
      },
    ],
  },
];

/**
 * Fuentes ES cargadas a archivo sin entrar al repertorio de la gira 129.
 */
export const ARCHIVE_ONLY_WORKS = [
  {
    key: "alberdiMinues",
    sourceMatch: /alberdi/i,
    targetFolder: "Alberdi, J.B. - Tres Minués [cuarteto]",
    titulo: "<p>Tres Minués</p>",
    workTitle: "Tres Minués",
    workNumber: null,
    composerTag: "Alberdi, J.B",
    compositor: { apellido: "Alberdi", nombre: "Juan Bautista" },
    arranger: { apellido: "Garberi", nombre: "Eliel" },
    anio: null,
    duracion_segundos: null,
    observaciones:
      "Para acomodar — Alberdi, J.B. - Tres Minués [cuarteto]. Arreglo para cuarteto de cuerdas por Eliel N. Garberi © 2010. Portada (p.1) excluida.",
    splits: [
      {
        pdfKey: "source",
        parts: [
          { instrument: "SCORE", start: 2, end: 4 },
          { instrument: "Violín 1", start: 5, end: 7 },
          { instrument: "Violín 2", start: 8, end: 10 },
          { instrument: "Viola", start: 11, end: 13 },
          { instrument: "Violoncello", start: 14, end: 16 },
        ],
      },
    ],
  },
];

export const ALL_PROCESSABLE_WORKS = [...NEW_WORKS, ...ARCHIVE_ONLY_WORKS];
