/**
 * Puccini — Un bel di vedremo [recorte Eguiarte]
 * Variante distinta de obra 3199 ([aria]).
 * Drive: https://drive.google.com/open?id=1NGTb2jX5gGZ09qzikVJsD39Pln4q_qFy
 *
 * Sin splits/crops: cada PDF ya es una particella; solo renombrado canónico.
 * Nota: el archivo nombrado "Fagot I" es en realidad FAGOT II (texto OCR/PDF).
 * Fagot 1 no está en el set (el .lnk apunta a otro volumen y es inválido).
 */
export const LOCAL_ARIAS =
  process.env.ARIAS_ROOT ||
  "H:\\Mi unidad\\Archivo General OFRN\\ARIAS";

export const UNBELDI_EGUIARTE_DRIVE_FOLDER_ID = "1NGTb2jX5gGZ09qzikVJsD39Pln4q_qFy";

export const UNBELDI_EGUIARTE_WORK = {
  sourceFolder: "Puccini, G. - Un bel di vedremo [recorte Eguiarte]",
  targetFolder: "Puccini, G. - Un bel di vedremo [recorte Eguiarte]",
  /** Título de archivo canónico (sin HTML). */
  titulo: "Un bel di vedremo [recorte Eguiarte]",
  /** Título BD alineado a 3199 + sufijo de versión. */
  tituloDb:
    "Un bel di vedremo. <i>'Madama Butterfly'</i> [recorte Eguiarte]",
  workNumber: null,
  composerTag: "Puccini, G",
  compositor: { apellido: "Puccini", nombre: "Giacomo" },
  action: "insert",
  anio: 1904,
  duracion_segundos: 300,
  driveFolderId: UNBELDI_EGUIARTE_DRIVE_FOLDER_ID,
  observaciones:
    "ARIAS — Puccini, G. - Un bel di vedremo [recorte Eguiarte]. Recorte CORCUDEC/Eguiarte; versión distinta de obra 3199 ([aria]). Falta Fagot 1 en el set.",
  /**
   * Mapa exacto filename actual → etiqueta de instrumento canónica
   * (misma convención que [aria]: Clarinete/Corno sin afinación, Perc Timp).
   */
  renameMap: {
    "Puccini- Butterfly-Un bel di vedremo-Piccolo P.pdf": "Fl Piccolo",
    "Puccini- Butterfly-Un bel di vedremo-Flauta I P.pdf": "Flauta 1",
    "Puccini- Butterfly-Un bel di vedremo-Flauta II P.pdf": "Flauta 2",
    "Puccini- Butterfly-Un bel di vedremo-Oboe I P.pdf": "Oboe 1",
    "Puccini-Butterfly-Un bel di vedremo-Oboe II P.pdf": "Oboe 2",
    "Puccini- Butterfly- vedremo-Corno Ingles P.pdf": "Ob EH",
    "Puccini-Butterfly-Un bel di vedremo-Clarinete I P.pdf": "Clarinete 1",
    "Puccini-Butterfly-Un bel di vedremo-Clarinete II P.pdf": "Clarinete 2",
    "Puccini- Butterfly- vedremo-Clarinete bajo P.pdf": "Clarinete Bajo",
    // Contenido PDF: FAGOT II (mal nombrado en origen)
    "Puccini- Butterfly-Un bel di vedremo-Fagot I P.pdf": "Fagot 2",
    "Puccini- Butterfly-Un bel di vedremo-Corno I P.pdf": "Corno 1",
    "Puccini- Butterfly-Un bel di vedremo-Corno II P.pdf": "Corno 2",
    "Puccini- Butterfly-Un bel di vedremo-Corno III P.pdf": "Corno 3",
    "Puccini- Butterfly-Un bel di vedremo-Corno IV P.pdf": "Corno 4",
    "Puccini- Butterfly-Un bel di vedremo-Trompeta I P.pdf": "Trompeta 1",
    "Puccini-Butterfly-Un bel di vedremo-Trompeta II P.pdf": "Trompeta 2",
    "Puccini-Butterfly-Un bel di vedremo-Trompeta III P.pdf": "Trompeta 3",
    "Puccini- Butterfly- vedremo-Trombon I P.pdf": "Trombón 1",
    "Puccini- Butterfly- vedremo-Trombon II P.pdf": "Trombón 2",
    "Puccini-Butterfly-Un bel di vedremo-Trombon III P.pdf": "Trombón 3",
    "Puccini-Madame Butterfly-Trombon bajo P.pdf": "Trombón Bajo",
    "Puccini-Butterfly-Un bel di vedremo-Timbales P.pdf": "Perc Timp",
    "Puccini- Butterfly-Un bel di vedremo-Cassa  P.pdf": "Perc 1",
    "Puccini-Butterfly-Un bel di vedremo-Arpa P.pdf": "Arpa",
    "Puccini-Butterfly-Un bel di vedremo-Violin I P.pdf": "Violín 1",
    "Puccini-Butterfly-Un bel di vedremo-Violin II P.pdf": "Violín 2",
    "Puccini- Butterfly-Un bel di vedremo-Viola P.pdf": "Viola",
    "Puccini-Butterfly- un bel di vedremo Cello P.pdf": "Violoncello",
    "Puccini- Butterfly-Un bel di vedremo-bajo P.pdf": "Contrabajo",
    // 14p — score principal
    "Puccini- Butterfly-Un bel di vedremo-Full score P.pdf": "SCORE",
    // 13p — otra copia del score
    "Puccini-Butterfly-Un bel di vedremo-Full score P.pdf": "SCORE 2",
  },
  /** Atajo roto (apunta a Fagot I en volumen E: inexistente). */
  deleteFiles: ["Puccini- Butterfly-Un bel di vedremo-Fagot II P.lnk"],
};

export function driveFolderUrl(id = UNBELDI_EGUIARTE_DRIVE_FOLDER_ID) {
  return `https://drive.google.com/open?id=${id}`;
}
