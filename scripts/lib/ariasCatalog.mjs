/**
 * Catálogo de obras ARIAS: renombrado + sync BD sin copias al Archivo.
 */
export const ARIAS_ROOT =
  "https://drive.google.com/open?id=1fGoEkW1s1oc5zwYA72xwC99GUviEdr3o";

export const LOCAL_ARIAS =
  process.env.ARIAS_ROOT ||
  "H:\\Mi unidad\\Archivo General OFRN\\ARIAS";

/** Copias duplicadas en Archivo (copiar_carpeta_a_archivo) a eliminar. */
export const ARCHIVO_COPIES_TO_DELETE = [
  { obraId: 3491, folderId: "1tQJypuhjLfgYiZ0uDBo12SV4d03T8YM-" },
  { obraId: 3492, folderId: "1iKa4QiNnw_4G1kVswTYM7vndmXmt2T47" },
  { obraId: 3493, folderId: "1SObCovl0erN5DVrwt_oIwJd8o3kKUQup" },
  { obraId: 3495, folderId: "1YzjjV51Dd7vZ-Lhyfs0MFFyXJ-s8VlY1" },
  { obraId: 3496, folderId: "1rW9Z4FeD2T-z6eTxvJSDh27fRS0scPQP" },
];

export const PARA_ACOMODAR_FOLDER_LINKS = {
  3490: "https://drive.google.com/drive/folders/1KsJXE8example",
  3494: "https://drive.google.com/drive/folders/1320-8NjiLCLkLoMaSuZR4Su-XQC6R_US",
  3497: "https://drive.google.com/drive/folders/1igMJPTxpRWAgv-wTuin3yXdw3In9R87K",
  3498: "https://drive.google.com/drive/folders/13wx5S99W5CoJLaxjHBBYJxk71BRNAZsR",
};

export const ARIAS_WORKS = [
  {
    sourceFolder: "02 - Mozart, W.A. - La ci darem la mano",
    targetFolder: "Mozart, W.A. - La ci darem la mano",
    titulo: "La ci darem la mano",
    workNumber: "02",
    composerTag: "Mozart, W.A",
    compositor: { apellido: "Mozart", nombre: "Wolfgang Amadeus" },
    action: "insert",
    anio: 1787,
  },
  {
    sourceFolder: "03 - E lucevan le stelle, 'Tosca' - Puccini",
    targetFolder: "Puccini, G. - E lucevan le stelle ('Tosca')",
    titulo: "E lucevan le stelle ('Tosca')",
    workNumber: "03",
    composerTag: "Puccini, G",
    compositor: { apellido: "Puccini", nombre: "Giacomo" },
    action: "insert",
    anio: 1900,
  },
  {
    sourceFolder: "04 - La vendetta, 'Las Bodas de Fígaro' - Mozart, W.A",
    targetFolder: "Mozart, W.A. - La vendetta ('Le nozze di Figaro')",
    titulo: "La vendetta ('Le nozze di Figaro')",
    workNumber: "04",
    composerTag: "Mozart, W.A",
    compositor: { apellido: "Mozart", nombre: "Wolfgang Amadeus" },
    action: "insert",
    anio: 1786,
  },
  {
    sourceFolder: "06 - Mozart, W.A. - Porgi Amor 'Las Bodas de Fígaro'",
    targetFolder: "Mozart, W.A. - Porgi amor ('Le nozze di Figaro')",
    titulo: "Porgi amor ('Le nozze di Figaro')",
    workNumber: "06",
    composerTag: "Mozart, W.A",
    compositor: { apellido: "Mozart", nombre: "Wolfgang Amadeus" },
    action: "insert",
    anio: 1786,
  },
  {
    sourceFolder: "07 - O soave fanciulla, 'La Boheme' - Puccini",
    targetFolder: "Puccini, G. - O soave fanciulla ('La Bohème')",
    titulo: "O soave fanciulla ('La Bohème')",
    workNumber: "07",
    composerTag: "Puccini, G",
    compositor: { apellido: "Puccini", nombre: "Giacomo" },
    action: "insert",
    anio: 1896,
  },
  {
    sourceFolder: "09 - Mozart, W.A. - Crudel perche finora, 'Las Bodas de Fígaro'",
    targetFolder: "Mozart, W.A. - Crudel! perchè finora ('Le nozze di Figaro')",
    titulo: "Crudel! perchè finora ('Le nozze di Figaro')",
    workNumber: "09",
    composerTag: "Mozart, W.A",
    compositor: { apellido: "Mozart", nombre: "Wolfgang Amadeus" },
    action: "insert",
    anio: 1786,
  },
  {
    sourceFolder: "10 - Puccini, G. - Nessun Dorma, 'Turandot'",
    targetFolder: "Puccini, G. - Nessun dorma ('Turandot')",
    titulo: "Nessun dorma ('Turandot')",
    workNumber: "10",
    composerTag: "Puccini, G",
    compositor: { apellido: "Puccini", nombre: "Giacomo" },
    action: "insert",
    anio: 1926,
  },
  {
    sourceFolder: "11 - Je veux Vivre, 'Romeo y Julieta' - Gounod, C",
    targetFolder: "Gounod, C. - Je veux vivre ('Roméo et Juliette')",
    titulo: "Je veux vivre ('Roméo et Juliette')",
    workNumber: "11",
    composerTag: "Gounod, C",
    compositor: { apellido: "Gounod", nombre: "Charles" },
    action: "update",
    obraId: 3493,
    anio: 1867,
    driveUrlOverride:
      "https://drive.google.com/drive/folders/1a_UH2yvl4xPRI1iLuce0M5h2_EyzfltC",
  },
  {
    sourceFolder: "12  - Largo al Factotum, 'El barbero de Sevilla' - Rossini, G",
    targetFolder: "Rossini, G. - Largo al factotum ('Il barbiere di Siviglia')",
    titulo: "Largo al factotum ('Il barbiere di Siviglia')",
    workNumber: "12",
    composerTag: "Rossini, G",
    compositor: { apellido: "Rossini", nombre: "Gioachino" },
    action: "insert",
    anio: 1816,
  },
  {
    sourceFolder: "15 BIS - Verdi, G. - Coro de los Esclavos 'Nabucco'",
    targetFolder: "Verdi, G. - Coro de los Esclavos ('Nabucco')",
    titulo: "Coro de los Esclavos ('Nabucco')",
    workNumber: "15 BIS",
    composerTag: "Verdi, G",
    compositor: { apellido: "Verdi", nombre: "Giuseppe" },
    action: "insert",
    anio: 1842,
  },
  {
    sourceFolder: "Medoza y Cortés, Q. - Cielito Lindo",
    targetFolder: "Medoza y Cortés, Q. - Cielito Lindo",
    titulo: "Cielito Lindo",
    workNumber: null,
    composerTag: "Medoza y Cortés, Q",
    compositor: { apellido: "Medoza y Cortés", nombre: "Quintín" },
    action: "update",
    obraId: 3491,
  },
  {
    sourceFolder: "Puccini, G. - Quando m'en vo (Vals de Musetta, 'La Bohème')",
    targetFolder: "Puccini, G. - Quando m'en vo (Vals de Musetta, 'La Bohème')",
    titulo: "Quando m'en vo (Vals de Musetta, 'La Bohème')",
    workNumber: null,
    composerTag: "Puccini, G",
    compositor: { apellido: "Puccini", nombre: "Giacomo" },
    action: "update",
    obraId: 3495,
    anio: 1896,
  },
  {
    sourceFolder: "Verdi, G. - Il Trovatore, Coro de gitanos",
    targetFolder: "Verdi, G. - Il Trovatore, Coro de gitanos",
    titulo: "Il Trovatore, Coro de gitanos",
    workNumber: null,
    composerTag: "Verdi, G",
    compositor: { apellido: "Verdi", nombre: "Giuseppe" },
    action: "update",
    obraId: 3492,
    anio: 1853,
  },
  {
    sourceFolder: "Verdi, G. - Sí, vendetta ('Rigoletto')",
    targetFolder: "Verdi, G. - Sí, vendetta ('Rigoletto')",
    titulo: "Sí, vendetta ('Rigoletto')",
    workNumber: "04",
    composerTag: "Verdi, G",
    compositor: { apellido: "Verdi", nombre: "Giuseppe" },
    action: "update",
    obraId: 3496,
    anio: 1851,
  },
];
