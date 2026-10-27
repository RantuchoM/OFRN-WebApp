/**
 * Metadatos de seed para el lote en deuda (orquestales + cámara + SCORE-only + Hammersmith).
 * targetFolder = nombre en Para acomodar.
 */
export const PARA_ACOMODAR_ROOT =
  process.env.PARA_ACOMODAR_ROOT ||
  "H:\\Mi unidad\\Archivo General OFRN\\Para acomodar";

export const PARA_ACOMODAR_FOLDER_ID = "10ap1aEjq3X9bFRB3z4DQ-F0fB7y3JutI";

export function driveFolderUrl(folderId) {
  return `https://drive.google.com/drive/folders/${folderId}`;
}

/** Obras nuevas (no existen con observaciones Para acomodar). */
export const SEED_WORKS = [
  // --- Orquestales procesadas ---
  {
    targetFolder: "Onslow, G. - Quinteto Nro. 27 en Re mayor, Op. 68",
    titulo:
      "<p>Quinteto Nro. 27 en Re mayor, Op. 68</p><div>&nbsp; I. Allegro</div><div>&nbsp; II. Scherzo. Allegro</div><div>&nbsp; III. Andantino</div><div>&nbsp; IV. Finale. Allegro</div>",
    compositor: { apellido: "Onslow", nombre: "George" },
    anio: 1848,
  },
  {
    targetFolder: "Liszt, F. - Tasso. Lamento e Trionfo, S. 96",
    titulo: "<p>Tasso. Lamento e Trionfo, S. 96</p>",
    compositor: { apellido: "Liszt", nombre: "Franz" },
    anio: 1849,
    // Existe #3067 con otro link; observaciones distintas → obra Para acomodar nueva o skip.
    // Preferimos reutilizar título de programa con obs Para acomodar.
    skipIfExistingId: null,
  },
  {
    targetFolder: "Rimsky-Korsakov, N. - Sherezade, Op. 35",
    titulo:
      "<p>Sherezade, Op. 35</p><div>&nbsp; I. The Sea and Sinbad's Ship</div><div>&nbsp; II. The Kalendar Prince</div><div>&nbsp; III. The Young Prince and the Young Princess</div><div>&nbsp; IV. Festival at Baghdad. The Sea. The Ship Breaks against a Cliff Surmounted by a Bronze Horseman</div>",
    compositor: { apellido: "Rimsky-Korsakov", nombre: "Nikolai" },
    anio: 1888,
  },
  {
    targetFolder: "Chausson, E. - Sinfonia en Sib, Op. 20",
    titulo:
      "<p>Sinfonía en Sib mayor, Op. 20</p><div>&nbsp; I. Lent - Allegro vivo</div><div>&nbsp; II. Très lent</div><div>&nbsp; III. Animé</div>",
    compositor: { apellido: "Chausson", nombre: "Ernest" },
    anio: 1890,
  },
  {
    targetFolder: "Dvorak, A. - Obertura Carnival, Op. 92",
    titulo: "<p>Obertura Carnival, Op. 92</p>",
    compositor: { apellido: "Dvořák", nombre: "Antonín" },
    anio: 1891,
  },
  {
    targetFolder: "Stravinsky, I. - Sinfonia en Mib mayor, Op. 1",
    titulo:
      "<p>Sinfonía en Mib mayor, Op. 1</p><div>&nbsp; I. Andante - Allegro moderato</div><div>&nbsp; II. Scherzo. Allegretto</div><div>&nbsp; III. Largo</div><div>&nbsp; IV. Finale. Allegro molto</div>",
    compositor: { apellido: "Stravinsky", nombre: "Igor" },
    anio: 1907,
  },
  {
    targetFolder: "Borodin, A. - Danzas Polovtsianas (Principe Igor)",
    titulo: "<p>Danzas Polovtsianas (Príncipe Igor)</p>",
    compositor: { apellido: "Borodin", nombre: "Aleksandr" },
    anio: 1890,
  },
  {
    targetFolder: "Mahler, G. - Sinfonia Nro. 4",
    titulo:
      "<p>Sinfonía Nro. 4 en Sol mayor</p><div>&nbsp; I. Bedächtig. Nicht eilen</div><div>&nbsp; II. In gemächlicher Bewegung. Ohne Hast</div><div>&nbsp; III. Ruhevoll (Poco adagio)</div><div>&nbsp; IV. Sehr behaglich</div>",
    compositor: { apellido: "Mahler", nombre: "Gustav" },
    anio: 1901,
  },
  // --- Hammersmith banda ---
  {
    targetFolder: "Holst, G. - Hammersmith, Op. 52 [banda]",
    titulo:
      "<p>Hammersmith (Prelude and Scherzo), Op. 52</p><div>&nbsp; [versión banda]</div>",
    compositor: { apellido: "Holst", nombre: "Gustav" },
    anio: 1930,
  },
  // --- Williams (ya #2341; seed Para acomodar con obs nuevas) ---
  {
    targetFolder: "Williams, A. - Obertura de Concierto Nro. 1 en La menor, Op. 15",
    titulo: "<p>Obertura de Concierto Nro. 1 en La menor, Op. 15</p>",
    compositor: { apellido: "Williams", nombre: "Alberto" },
    anio: 1894,
  },
  // --- SCORE-only ---
  {
    targetFolder: "Honegger, A. - Sinfonia Nro. 1, H. 75",
    titulo:
      "<p>Sinfonía Nro. 1, H. 75</p><div>&nbsp; I. Allegro marcato</div><div>&nbsp; II. Adagio</div><div>&nbsp; III. Presto</div>",
    compositor: { apellido: "Honegger", nombre: "Arthur" },
    anio: 1930,
  },
  {
    targetFolder: "Reger, M. - Suite romantica, Op. 125",
    titulo: "<p>Suite romántica, Op. 125</p>",
    compositor: { apellido: "Reger", nombre: "Max" },
    anio: 1912,
  },
  {
    targetFolder: "Schoenberg, A. - Variaciones para orquesta, Op. 31",
    titulo: "<p>Variaciones para orquesta, Op. 31</p>",
    compositor: { apellido: "Schoenberg", nombre: "Arnold" },
    anio: 1928,
  },
  {
    targetFolder: "Holst, G. - Hammersmith, Op. 52 [orquesta SCORE]",
    titulo:
      "<p>Hammersmith (Prelude and Scherzo), Op. 52</p><div>&nbsp; [versión orquesta — solo SCORE]</div>",
    compositor: { apellido: "Holst", nombre: "Gustav" },
    anio: 1930,
  },
  {
    targetFolder: "Beethoven-Khym - Sonata Op. 17, versión para quinteto",
    titulo: "<p>Sonata Op. 17 (versión para quinteto)</p>",
    compositor: { apellido: "Beethoven", nombre: "Ludwig van" },
    anio: 1800,
  },
  // --- Cámara ya canónica ---
  {
    targetFolder: "Beethoven, L. - Quinteto de cuerdas en Do mayor, Op. 29",
    titulo:
      "<p>Quinteto de cuerdas en Do mayor, Op. 29</p><div>&nbsp; I. Allegro moderato</div><div>&nbsp; II. Adagio molto espressivo</div><div>&nbsp; III. Scherzo. Allegro</div><div>&nbsp; IV. Presto</div>",
    compositor: { apellido: "Beethoven", nombre: "Ludwig van" },
    anio: 1801,
  },
  {
    targetFolder: "Beethoven, L. - Trío de cuerdas en Re mayor, Op. 9 Nro. 2",
    titulo:
      "<p>Trío de cuerdas en Re mayor, Op. 9 Nro. 2</p><div>&nbsp; I. Allegretto</div><div>&nbsp; II. Andante quasi Allegretto</div><div>&nbsp; III. Menuetto. Allegro</div><div>&nbsp; IV. Rondo. Allegro</div>",
    compositor: { apellido: "Beethoven", nombre: "Ludwig van" },
    anio: 1798,
  },
  {
    targetFolder: "Beethoven, L. - Cuarteto de cuerdas en Sol mayor, Op. 18 Nro. 2",
    titulo:
      "<p>Cuarteto de cuerdas en Sol mayor, Op. 18 Nro. 2</p><div>&nbsp; I. Allegro</div><div>&nbsp; II. Adagio cantabile</div><div>&nbsp; III. Scherzo. Allegro</div><div>&nbsp; IV. Allegro molto, quasi Presto</div>",
    compositor: { apellido: "Beethoven", nombre: "Ludwig van" },
    anio: 1800,
  },
  {
    targetFolder: "Mozart, W.A. - Cuarteto de cuerdas en Do mayor, K. 157",
    titulo:
      "<p>Cuarteto de cuerdas en Do mayor, K. 157</p><div>&nbsp; I. Allegro</div><div>&nbsp; II. Andante</div><div>&nbsp; III. Presto</div>",
    compositor: { apellido: "Mozart", nombre: "Wolfgang Amadeus" },
    anio: 1772,
  },
  {
    targetFolder: "Puccini, G. - Crisantemi, SC 65",
    titulo: "<p>Crisantemi, SC 65</p>",
    compositor: { apellido: "Puccini", nombre: "Giacomo" },
    anio: 1890,
  },
  {
    targetFolder: "Grieg, E. - Suite Holberg, Op. 40 [cuerdas]",
    titulo:
      "<p>Suite Holberg, Op. 40</p><div>&nbsp; I. Praeludium</div><div>&nbsp; II. Sarabande</div><div>&nbsp; III. Gavotte</div><div>&nbsp; IV. Air</div><div>&nbsp; V. Rigaudon</div>",
    compositor: { apellido: "Grieg", nombre: "Edvard" },
    anio: 1885,
  },
  {
    targetFolder: "Schoenberg, A. - Noche transfigurada, Op. 4 [cuerdas]",
    titulo: "<p>Noche transfigurada, Op. 4</p>",
    compositor: { apellido: "Schoenberg", nombre: "Arnold" },
    anio: 1899,
  },
];
