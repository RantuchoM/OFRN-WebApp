/**
 * Catálogo LEMA — Acomodar: renombrado de carpetas + sync BD (link_drive directo, sin renombrar PDFs).
 */
export const LEMA_ROOT =
  "https://drive.google.com/drive/folders/10JQJW7YX7UNmWciqgJ-EiqaldM_e0Tvi";

export const LOCAL_LEMA =
  process.env.LEMA_ROOT ||
  "H:\\Mi unidad\\Archivo - para organizar\\LEMA - Acomodar";

export const LEMA_ARRANGER = { apellido: "Lema", nombre: "Germán" };

/** @typedef {'insert'|'update'} LemaAction */

/**
 * @type {Array<{
 *   sourceFolder: string,
 *   targetFolder: string,
 *   titulo: string,
 *   compositors: Array<{ apellido: string, nombre?: string|null }>,
 *   action: LemaAction,
 *   obraId?: number,
 *   driveFolderId: string,
 * }>}
 */
export const LEMA_WORKS = [
  {
    sourceFolder: "Capó-Lema - Piel Canela [cuerdas] [en D]",
    targetFolder: "Capó-Lema - Piel Canela [cuerdas] [en D]",
    titulo: "Piel Canela [cuerdas] [en D]",
    compositors: [{ apellido: "Capó", nombre: "Bobby" }],
    action: "update",
    obraId: 1357,
    driveFolderId: "17J2eSnHKkGv3sqWKgxXnHiKDBF_BwMJY",
  },
  {
    sourceFolder: "Capó-Lema - Piel Canela [cuerdas] [en E]",
    targetFolder: "Capó-Lema - Piel Canela [cuerdas] [en E]",
    titulo: "Piel Canela [cuerdas] [en E]",
    compositors: [{ apellido: "Capó", nombre: "Bobby" }],
    action: "update",
    obraId: 1356,
    driveFolderId: "1lr8DDKOMrxxIJRcO3B0WAXicumpDAzwo",
  },
  {
    sourceFolder: "Marinero de Luces",
    targetFolder: "Perales-Lema - Marinero de Luces",
    titulo: "Marinero de Luces",
    compositors: [{ apellido: "Perales", nombre: "José Luis" }],
    action: "insert",
    driveFolderId: "1cilWDoOp9a4z7aPA5SXQts2USuazfal0",
  },
  {
    sourceFolder: "Sauce",
    targetFolder: "Tux-Lema - Sauce",
    titulo: "Sauce",
    compositors: [{ apellido: "Yupanqui", nombre: "Atahualpa" }],
    action: "insert",
    driveFolderId: "1eQ75gtxxfNzXX-VHZOWWTMQBDtEW97IA",
  },
  {
    sourceFolder: "Cautiverio",
    targetFolder: "Tux-Lema - Cautiverio",
    titulo: "Cautiverio",
    compositors: [{ apellido: "Yupanqui", nombre: "Atahualpa" }],
    action: "insert",
    driveFolderId: "1jt42P-I3nAY8P4BEBWJHCk5QbL3R5Slh",
  },
  {
    sourceFolder: "Como La Cigarra",
    targetFolder: "Walsh-Lema - Como La Cigarra",
    titulo: "Como la Cigarra [cuerdas]",
    compositors: [{ apellido: "Walsh", nombre: "María Elena" }],
    action: "update",
    obraId: 1627,
    driveFolderId: "1jh_KBXotR4zAT4HZgk_CMYGvB8RaCrfo",
  },
  {
    sourceFolder: "Sujeto Atravesado",
    targetFolder: "Tux-Lema - Sujeto Atravesado",
    titulo: "Sujeto Atravesado",
    compositors: [{ apellido: "Yupanqui", nombre: "Atahualpa" }],
    action: "insert",
    driveFolderId: "1uEb8y-p7OSd_ZJvpskWVSUpcnwpq9cOh",
  },
  {
    sourceFolder: "Si Llega A Ser Tucumana",
    targetFolder: "Leguizamón-Lema - Si Llega A Ser Tucumana",
    titulo: "Si Llega A Ser Tucumana",
    compositors: [{ apellido: "Leguizamon", nombre: 'Gustavo "Cuchi"' }],
    action: "update",
    obraId: 1432,
    driveFolderId: "1YHbkF0eajhuEZI2QaIpWtuMwDQyTlfzV",
  },
  {
    sourceFolder: "El Cosechero percus",
    targetFolder: "Ayala-Lema - El Cosechero [percus]",
    titulo: "El Cosechero [percus]",
    compositors: [{ apellido: "Ayala", nombre: "Ramón" }],
    action: "insert",
    driveFolderId: "1gaasJo8YQDXeWExOWRouTTtBJUbwMvnc",
  },
  {
    sourceFolder: "Rebotar",
    targetFolder: "Vrule-Lema - Rebotar",
    titulo: "Rebotar",
    compositors: [{ apellido: "Virus", nombre: null }],
    action: "insert",
    driveFolderId: "1n3itTVIaBT9zP2bkPDrnfT4xFPhxU7ke",
  },
  {
    sourceFolder: "No Sé Tú",
    targetFolder: "Manzanero-Lema - No Sé Tú",
    titulo: "No Sé Tú",
    compositors: [{ apellido: "Manzanero", nombre: "Armando" }],
    action: "insert",
    driveFolderId: "1P0xjj29VCTMRDCNVXn-7sGhLKrPNKPSL",
  },
  {
    sourceFolder: "Lo Que Me Hiciste Hacer",
    targetFolder: "Vrule-Lema - Lo Que Me Hiciste Hacer",
    titulo: "Lo Que Me Hiciste Hacer",
    compositors: [{ apellido: "Virus", nombre: null }],
    action: "insert",
    driveFolderId: "1pEpTvsZ2THCFXAYgF6OPkjxlgS3ipjvs",
  },
  {
    sourceFolder: "Break #1",
    targetFolder: "Roussillo-Lema - Break #1",
    titulo: "Break #1",
    compositors: [{ apellido: "Roussillo", nombre: null }],
    action: "insert",
    driveFolderId: "1HmXpmSMzSphwNjZqGwc_OEf7ZlccF057",
  },
  {
    sourceFolder: "Tiempo Compartido",
    targetFolder: "Cárdenas-Lema - Tiempo Compartido",
    titulo: "Tiempo Compartido [TR 2025]",
    compositors: [{ apellido: "Cárdenas", nombre: "Agustín" }],
    action: "update",
    obraId: 1368,
    driveFolderId: "12lMctmgKEGdXSgbdjaJgNZMzisnc7SEe",
  },
  {
    sourceFolder: "Mi Nave",
    targetFolder: "Cárdenas-Lema - Mi Nave",
    titulo: "Mi Nave",
    compositors: [{ apellido: "Cárdenas", nombre: "Agustín" }],
    action: "insert",
    driveFolderId: "16wW9BtXBDWBQ6LFRdzJVvijfM1U5sEGH",
  },
  {
    sourceFolder: "Lema, G. - Medley Soda Stereo",
    targetFolder: "Lema, G. - Medley Soda Stereo",
    titulo: "Medley Soda Stereo",
    compositors: [{ apellido: "Soda Stereo", nombre: null }],
    action: "update",
    obraId: 1578,
    driveFolderId: "1LZP35H0csA3hORLCvd9r8xxJR-Z1KZ78",
  },
  {
    sourceFolder: "Medley Cuarteto",
    targetFolder: "Varios-Lema - Medley Cuarteto",
    titulo: "Medley Cuarteto",
    compositors: [{ apellido: "Varios", nombre: null }],
    action: "insert",
    driveFolderId: "1Ub97Rgzz2zCwxbNLxAwLvjRBTOIER997",
  },
];

export function driveFolderUrl(folderId) {
  return `https://drive.google.com/drive/folders/${folderId}`;
}
