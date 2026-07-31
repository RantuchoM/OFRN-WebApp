// Fuente de verdad ÚNICA (lado frontend) de los IDs de carpetas raíz de Drive.
//
// Estos IDs DEBEN coincidir con las constantes homónimas de la Edge Function
// `supabase/functions/manage-drive/index.ts`. Al correr en runtimes distintos
// (navegador vs Deno) no pueden compartir un módulo, por eso se replican aquí
// de forma explícita y centralizada en vez de estar dispersos por componentes.

/** Carpeta general de Viáticos (padre de las carpetas por gira). `GIRAS_ROOT_ID` en la EF. */
export const VIATICOS_ROOT_FOLDER_ID = "1PRWEbGKUBxfhF9HIf2DgpOWKDRwslsCc";

/** Carpeta raíz de los sets unificados de particellas. `PARTICELLA_SETS_ROOT_ID` en la EF. */
export const PARTICELLA_SETS_ROOT_ID = "1BK8yhY1dvAZRrDwEDXg3VR3QlnmdOH4u";

/** Carpeta «Para acomodar» (staging antes del archivo oficial). `PARA_ACOMODAR_FOLDER_ID` en la EF. */
export const PARA_ACOMODAR_DRIVE_FOLDER_ID = "10ap1aEjq3X9bFRB3z4DQ-F0fB7y3JutI";

/** Carpeta del Archivo de obras. `ARCHIVO_OBRAS_FOLDER_ID` en la EF. */
export const ARCHIVO_OBRAS_DRIVE_FOLDER_ID = "10JQJW7YX7UNmWciqgJ-EiqaldM_e0Tvi";

/** Construye la URL pública de una carpeta de Drive a partir de su ID. */
export const driveFolderUrl = (folderId) =>
  folderId ? `https://drive.google.com/drive/folders/${folderId}` : "";

/** URL de la carpeta general de Viáticos. */
export const VIATICOS_ROOT_FOLDER_URL = driveFolderUrl(VIATICOS_ROOT_FOLDER_ID);

/** URL pública de la carpeta de sets de particellas. */
export const PARTICELLA_SETS_ROOT_URL = driveFolderUrl(PARTICELLA_SETS_ROOT_ID);
