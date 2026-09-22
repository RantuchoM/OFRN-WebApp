/**
 * Rossini / Bergler — El Barbero de Sevilla (obra 3258, quinteto de bronces).
 * 5 PDFs = 5 placeholders existentes. UPDATE in-place (sin DELETE/INSERT).
 */
export const PARA_ACOMODAR_ROOT =
  process.env.PARA_ACOMODAR_ROOT ||
  "H:\\Mi unidad\\Archivo General OFRN\\Para acomodar";

export const PARA_ACOMODAR_FOLDER_ID = "10ap1aEjq3X9bFRB3z4DQ-F0fB7y3JutI";

export const DOWNLOADS_PARA_ACOMODAR =
  process.env.DOWNLOADS_PARA_ACOMODAR ||
  "c:\\Users\\marti\\Downloads\\Para acomodar";

export const ROSSINI_BARBERO_WORK = {
  sourceMatch: /barbero|barber of seville/i,
  targetFolder: "Rossini, G. - El Barbero de Sevilla",
  titulo: "El Barbero de Sevilla.",
  workNumber: null,
  composerTag: "Rossini, G",
  compositor: { apellido: "Rossini", nombre: "Gioacchino" },
  arranger: { apellido: "Bergler", nombre: "Geoffrey" },
  obraId: 3258,
  action: "update",
  anio: 1816,
  splits: [],
  crops: [],
  driveFolderId:
    process.env.ROSSINI_BARBERO_DRIVE_FOLDER_ID ||
    "1bEAh_wFysB1DExeWP38CF2CimZiagNxk",
  /** Placeholders: Corno, Trombón, Trompeta 1, Trompeta 2, Tuba. */
  renames: [
    { re: "hrn\\.pdf$", instrument: "Corno" },
    { re: "tbn\\.pdf$", instrument: "Trombón" },
    { re: "tpt1\\.pdf$", instrument: "Trompeta 1" },
    { re: "tpt2\\.pdf$", instrument: "Trompeta 2" },
    { re: "tba\\.pdf$", instrument: "Tuba" },
  ],
};

export function driveFolderUrl(id) {
  if (!id) return null;
  return `https://drive.google.com/open?id=${id}`;
}
