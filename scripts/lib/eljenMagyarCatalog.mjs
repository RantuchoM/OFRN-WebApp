/**
 * Johann Strauss Jr. — Éljen a Magyar!, Op. 332 (Para acomodar / Nueva).
 * Edición Doblinger (Nischkauer), Diletto musicale 1049. Set incompleto:
 * SCORE + cuerdas + Schlagzeug (caja, bombo y platillos). Sin vientos, metales ni timbales.
 * bajo.pdf es el mismo Kontrabass que cuerdas.pdf p.8 (copia sin marcas de atril).
 */
export const PARA_ACOMODAR_ROOT =
  process.env.PARA_ACOMODAR_ROOT ||
  "H:\\Mi unidad\\Archivo General OFRN\\Para acomodar";

export const PARA_ACOMODAR_FOLDER_ID = "10ap1aEjq3X9bFRB3z4DQ-F0fB7y3JutI";

export const ELJEN_MAGYAR_WORK = {
  sourceFolder: "Nueva",
  targetFolder: "Strauss Jr., J. - Éljen a Magyar!, Op. 332",
  /** Título de programa. IMSLP: Key E minor, Op. 332, Movements «1 polka» (sin lista). */
  titulo:
    "<p>Éljen a Magyar! Polka schnell en mi menor, Op. 332</p>",
  workNumber: "op.332",
  workTitle: "Éljen a Magyar!",
  composerTag: "Strauss Jr., J",
  compositor: { apellido: "Strauss", nombre: "Johann Jr." },
  obraId: 3890,
  anio: 1869,
  /** IMSLP Average Duration 2,5 min. */
  duracionSegundos: 150,
  driveFolderId:
    process.env.ELJEN_MAGYAR_DRIVE_FOLDER_ID ||
    "1RvVVg82fu1UnZND27PujLCxp2QDMm-ZW",
  splits: [
    {
      pdf: "cuerdas.pdf",
      parts: [
        { instrument: "Violín 1", start: 1, end: 2 },
        { instrument: "Violín 2", start: 3, end: 4 },
        { instrument: "Viola", start: 5, end: 6 },
        { instrument: "Violoncello", start: 7, end: 7 },
        { instrument: "Contrabajo", start: 8, end: 8 },
      ],
    },
  ],
  crops: [
    { pdf: "Score.pdf", instrument: "SCORE", start: 1, end: 18 },
    { pdf: "percusion-1.pdf", instrument: "Percusión", start: 1, end: 2 },
  ],
  /** Misma parte que cuerdas p.8; se descarta para no crear un Contrabajo 2. */
  dropDuplicates: ["bajo.pdf"],
};

export function driveFolderUrl(folderId) {
  return folderId ? `https://drive.google.com/open?id=${folderId}` : "";
}
