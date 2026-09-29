/**
 * Villa-Lobos — Cuarteto de Cuerdas Nro. 1, W099 (obra 3650).
 * Partes typeset CC BY 4.0 (Mvrasaki), IMSLP #608902–#608905.
 * SCORE Southern 1953, IMSLP #327723 (Complete Score). El usuario
 * declaró la obra de dominio público en esta jurisdicción (IMSLP la
 * marca Non-PD US y EU). Página 1 del score ya es música (p. impresas 2–26).
 */
export const VILLA_LOBOS_SQ1_DOWNLOADS =
  process.env.VILLA_LOBOS_SQ1_DOWNLOADS ||
  "C:\\Users\\marti\\Downloads\\villa-lobos-sq1";

export const PARA_ACOMODAR_ROOT =
  process.env.PARA_ACOMODAR_ROOT ||
  "H:\\Mi unidad\\Archivo General OFRN\\Para acomodar";

export const PARA_ACOMODAR_FOLDER_ID = "10ap1aEjq3X9bFRB3z4DQ-F0fB7y3JutI";

export const VILLA_LOBOS_SQ1_WORK = {
  obraId: 3650,
  targetFolder: "Villa-Lobos, H. - Cuarteto de Cuerdas Nro. 1, W099",
  titulo: "Cuarteto de Cuerdas Nro. 1",
  tituloDb:
    "<p>Cuarteto de Cuerdas Nro. 1, W099</p><div>&nbsp; I. Cantilena - Andante</div><div>&nbsp; II. Brincadeira - Allegretto Scherzando</div><div>&nbsp; III. Canto Lirico - Moderato</div><div>&nbsp; IV. Canconeta - Andantino quasi Allegretto</div><div>&nbsp; V. Melancolia - Lento</div><div>&nbsp; VI. Saltando como um Saci - Allegro</div>",
  workNumber: "W099",
  composerTag: "Villa-Lobos, H",
  compositor: { apellido: "Villa-Lobos", nombre: "Heitor" },
  compositorId: 348,
  anio: 1946,
  duracionSegundos: 1173,
  driveFolderId: "1pUC6CMKciSljRmidPe1iGTMxLUNknvlT",
  imslp: "https://imslp.org/wiki/String_Quartet_No.1,_W099_(Villa-Lobos,_Heitor)",
  wholes: [
    { id: 327723, instrument: "SCORE" },
    { id: 608902, instrument: "Violín 1" },
    { id: 608903, instrument: "Violín 2" },
    { id: 608904, instrument: "Viola" },
    { id: 608905, instrument: "Violoncello" },
  ],
};

export function driveFolderUrl(id) {
  return id ? `https://drive.google.com/open?id=${id}` : "";
}
