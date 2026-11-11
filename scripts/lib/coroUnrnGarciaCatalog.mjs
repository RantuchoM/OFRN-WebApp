/**
 * Gira 305 «Con el coro UNRN» — 4 arreglos de cuerdas (Aníbal Garcia).
 * Carpetas en Para acomodar; PDFs ya separados (sin split/crop).
 * Obras BD: 3886–3889 (estado Solicitud → Oficial tras seed).
 */
export const PARA_ACOMODAR_ROOT =
  process.env.PARA_ACOMODAR_ROOT ||
  "H:\\Mi unidad\\Archivo General OFRN\\Para acomodar";

export const PARA_ACOMODAR_FOLDER_ID = "10ap1aEjq3X9bFRB3z4DQ-F0fB7y3JutI";

export function driveFolderUrl(id) {
  return `https://drive.google.com/open?id=${id}`;
}

export const GARCIA_ARRANGER = { apellido: "Garcia", nombre: "Anibal" };

/**
 * @typedef {{
 *   targetFolder: string,
 *   titulo: string,
 *   workNumber: null,
 *   composerTag: string,
 *   compositor: { apellido: string, nombre: string },
 *   arranger: { apellido: string, nombre: string },
 *   obraId: number,
 *   driveFolderId: string,
 *   giraId: number,
 *   reorder?: number,
 *   observaciones: string,
 *   renameMap: Record<string, string>,
 * }} CoroUnrnWork
 */

/** @type {CoroUnrnWork[]} */
export const CORO_UNRN_GARCIA_WORKS = [
  {
    targetFolder: "Aristimuño-Garcia - Tu Nombre y el Mio",
    titulo: "Tu Nombre y el Mio",
    workNumber: null,
    composerTag: "Aristimuño-Garcia",
    compositor: { apellido: "Aristimuño", nombre: "Lisandro" },
    arranger: GARCIA_ARRANGER,
    obraId: 3886,
    driveFolderId: "1enRX6JyN6R884RNFShwWiddqSsNtVNRS",
    giraId: 305,
    observaciones:
      "Para acomodar — Aristimuño-Garcia - Tu Nombre y el Mio. Arreglo cuerdas Aníbal Garcia (gira 305).",
    renameMap: {
      "1 TU NOMBR FULL CUERDAS.pdf": "SCORE",
      "2 TU NOMBRE V I.pdf": "Violín 1",
      "3 TU NOMBRE V II.pdf": "Violín 2",
      "4 TU NOMBRE VIa.pdf": "Viola",
      "5 TU NOMBRE VCello.pdf": "Violoncello",
      "6 TU NOMBRE CBajo.pdf": "Contrabajo",
    },
  },
  {
    targetFolder: "Páez-Garcia - Mariposa Technicolor",
    titulo: "Mariposa Technicolor",
    workNumber: null,
    composerTag: "Páez-Garcia",
    compositor: { apellido: "Páez", nombre: "Fito" },
    arranger: GARCIA_ARRANGER,
    obraId: 3887,
    driveFolderId: "1ljR-adf_oRttAjOfdeMGYLlgwP3KBGWX",
    giraId: 305,
    observaciones:
      "Para acomodar — Páez-Garcia - Mariposa Technicolor. Arreglo cuerdas Aníbal Garcia (gira 305).",
    renameMap: {
      "11 MARIPOSA FULL CUERDAS.pdf": "SCORE",
      "12 MARIPOSA V I.pdf": "Violín 1",
      "13 MARIPOSA V II.pdf": "Violín 2",
      "14 MARIPOSA Vla.pdf": "Viola",
      "15 MARIPOSA Cell.pdf": "Violoncello",
      "16 MARIPOSA CBass.pdf": "Contrabajo",
    },
  },
  {
    targetFolder: "Dei-Garcia - Libros Sapiensales",
    titulo: "Libros Sapiensales",
    workNumber: null,
    composerTag: "Dei-Garcia",
    compositor: { apellido: "Dei", nombre: "Vox" },
    arranger: GARCIA_ARRANGER,
    obraId: 3888,
    driveFolderId: "1ntN3NsjbJrbrzpFi6q6FMpCsPxy0ObTd",
    giraId: 305,
    observaciones:
      "Para acomodar — Dei-Garcia - Libros Sapiensales. Arreglo cuerdas Aníbal Garcia (gira 305).",
    renameMap: {
      "11 LIBROS FULL INSTRU.pdf": "SCORE",
      "12 LIBROS V I.pdf": "Violín 1",
      "13 LIBROS V II.pdf": "Violín 2",
      "14 LIBROS Vla.pdf": "Viola",
      "15 LIBROS Cell.pdf": "Violoncello",
      "16 LIBROS CBass.pdf": "Contrabajo",
    },
  },
  {
    targetFolder: "Giran-Garcia - Desarma y Sangra",
    titulo: "Desarma y Sangra",
    workNumber: null,
    composerTag: "Giran-Garcia",
    compositor: { apellido: "Giran", nombre: "Seru" },
    arranger: GARCIA_ARRANGER,
    obraId: 3889,
    driveFolderId: "16VcTd9ZaXVu5zEecGvcTuV-x_OmMib2Z",
    giraId: 305,
    observaciones:
      "Para acomodar — Giran-Garcia - Desarma y Sangra. Arreglo cuerdas Aníbal Garcia (gira 305).",
    renameMap: {
      "11 DESARYSAN FULL CUERDAS.pdf": "SCORE",
      "12 DESARYSAN V I.pdf": "Violín 1",
      "13 DESARYSAN V II.pdf": "Violín 2",
      "14 DESARYSAN Vla.pdf": "Viola",
      "15 DESARYSAN VCello.pdf": "Violoncello",
      "16 DESARYSAN CBass.pdf": "Contrabajo",
    },
  },
];
