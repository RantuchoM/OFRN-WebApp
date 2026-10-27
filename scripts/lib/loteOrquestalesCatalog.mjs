/**
 * Lote orquestal (Para acomodar) — rangos por encabezado OCR (Tesseract, banda superior
 * de cada página; pypdfium2 + pytesseract) de los PDFs IMSLP descargados.
 *
 * Convenciones:
 * - 1y2 (nunca 1-2). Misma silla en distinta transposición = PDFs separados (Clarinete C/Bb…).
 * - SCORE completo salvo portada clara en p.1 (se omite).
 * - Portadas IMSLP de grupo (p.1 "VIOLIN I", contraportada, etc.) se omiten.
 * - `pages: [..]` = partes intercaladas (no contiguas).
 * - Una misma hoja para dos sillas (Cello/Bajo, Platillo/Bombo, Oboe 2/Ob EH…) = dos PDFs
 *   con las mismas páginas.
 * - `altSubdir`: edición alternativa (misma silla); va a subcarpeta, sin competir con la principal.
 * - workNumber: "op.X" (vacío si no hay catálogo, p.ej. Mahler/Borodin). composerTag "Apellido, I".
 *
 * Runner: scripts/process-lote-orquestales-local.mjs
 */
export const PARA_ACOMODAR_ROOT =
  process.env.PARA_ACOMODAR_ROOT ||
  "H:\\Mi unidad\\Archivo General OFRN\\Para acomodar";

/** Atajo: PDF completo = una sola parte (renombre directo, sin reescribir). */
const whole = (pdf, instrument, end) => ({
  pdf,
  parts: [{ instrument, start: 1, end }],
});

export const ONSLOW_QUINTETO = {
  targetFolder: "Onslow, G. - Quinteto Nro. 27 en Re mayor, Op. 68",
  workNumber: "op.68",
  workTitle: "Quinteto Nro. 27 en Re mayor",
  composerTag: "Onslow, G",
  notes:
    "Merton CompleteParts (35 p.): p.1 portada IMSLP y p.35 contraportada omitidas. Violoncello 2 y Contrabajo son alternativos (misma voz grave).",
  files: [
    {
      pdf: "IMSLP81221-CompleteParts.pdf",
      parts: [
        { instrument: "Violín 1", start: 2, end: 8 },
        { instrument: "Violín 2", start: 9, end: 14 },
        { instrument: "Viola", start: 15, end: 20 },
        { instrument: "Violoncello 1", start: 21, end: 26 },
        { instrument: "Violoncello 2", start: 27, end: 30 },
        { instrument: "Contrabajo", start: 31, end: 34 },
      ],
    },
  ],
};

export const LISZT_TASSO = {
  targetFolder: "Liszt, F. - Tasso. Lamento e Trionfo, S. 96",
  workNumber: "S.96",
  workTitle: "Tasso. Lamento e Trionfo",
  composerTag: "Liszt, F",
  notes:
    "SCORE sin p.1 (portada de la serie Breitkopf). Violín 1 sin p.1 (portada IMSLP). Trompetas III/IV intercaladas (7,9 / 8,10).",
  files: [
    {
      pdf: "IMSLP112758-SCORE.pdf",
      parts: [{ instrument: "SCORE", start: 2, end: 82 }],
    },
    {
      pdf: "IMSLP707752-Flute.pdf",
      parts: [
        { instrument: "Fl Piccolo", start: 1, end: 3 },
        { instrument: "Flauta 1", start: 4, end: 7 },
        { instrument: "Flauta 2", start: 8, end: 11 },
      ],
    },
    {
      pdf: "IMSLP707753-Oboe.pdf",
      parts: [
        { instrument: "Oboe 1", start: 1, end: 4 },
        { instrument: "Oboe 2", start: 5, end: 8 },
      ],
    },
    {
      pdf: "IMSLP707754-Clarinet.pdf",
      parts: [
        { instrument: "Clarinete Bb 1", start: 1, end: 4 },
        { instrument: "Clarinete Bb 2", start: 5, end: 8 },
        { instrument: "Clarinete Bajo", start: 9, end: 10 },
      ],
    },
    {
      pdf: "IMSLP707755-Bassoon.pdf",
      parts: [
        { instrument: "Fagot 1", start: 1, end: 4 },
        { instrument: "Fagot 2", start: 5, end: 8 },
      ],
    },
    {
      pdf: "IMSLP707756-Horn.pdf",
      parts: [
        { instrument: "Corno F 1", start: 1, end: 4 },
        { instrument: "Corno F 2", start: 5, end: 8 },
        { instrument: "Corno F 3", start: 9, end: 11 },
        { instrument: "Corno F 4", start: 12, end: 14 },
      ],
    },
    {
      pdf: "IMSLP707757-Trumpet.pdf",
      parts: [
        { instrument: "Trompeta Bb 1", start: 1, end: 3 },
        { instrument: "Trompeta Bb 2", start: 4, end: 6 },
        { instrument: "Trompeta C 3", pages: [7, 9] },
        { instrument: "Trompeta C 4", pages: [8, 10] },
      ],
    },
    {
      pdf: "IMSLP707758-TromboneTuba.pdf",
      parts: [
        { instrument: "Trombón 1", start: 1, end: 2 },
        { instrument: "Trombón 2", start: 3, end: 4 },
        { instrument: "Trombón Bajo", start: 5, end: 7 },
        { instrument: "Tuba", start: 8, end: 9 },
      ],
    },
    whole("IMSLP707759-Timpani.pdf", "Perc Timbal", 2),
    {
      pdf: "IMSLP707760-Perc.pdf",
      parts: [
        { instrument: "Perc Bombo", start: 1, end: 1 },
        { instrument: "Perc Platillo", start: 2, end: 2 },
        { instrument: "Perc Tambor", start: 3, end: 3 },
        { instrument: "Perc Triángulo", start: 4, end: 4 },
      ],
    },
    whole("IMSLP707761-Harp.pdf", "Arpa", 3),
    {
      pdf: "IMSLP707762-Violin1.pdf",
      parts: [{ instrument: "Violín 1", start: 2, end: 7 }],
    },
    whole("IMSLP707763-Violin2.pdf", "Violín 2", 6),
    whole("IMSLP707764-Viola.pdf", "Viola", 6),
    whole("IMSLP707765-Cello.pdf", "Violoncello", 6),
    whole("IMSLP707766-Bass.pdf", "Contrabajo", 4),
  ],
};

export const SHEREZADE = {
  targetFolder: "Rimsky-Korsakov, N. - Sherezade, Op. 35",
  workNumber: "op.35",
  workTitle: "Sherezade",
  composerTag: "Rimsky-Korsakov, N",
  notes:
    "Orchestra Parts Project (Belaieff/Kalmus). Clarinete/Trompeta con tonalidades A/Bb mezcladas por movimiento → sin letra de tonalidad. Oboe 2 y Ob EH comparten hoja (Oboe II et Corno inglese). Piatti et Cassa (+Tam-tam) → Platillo y Bombo con las mismas páginas. IMSLP40976 (Trombone 1/2 en clave de Fa) = edición alternativa de las mismas sillas que IMSLP40977 → subcarpeta.",
  files: [
    whole("IMSLP40967-Piccolo.pdf", "Fl Piccolo", 8),
    {
      pdf: "IMSLP40968-Flute.pdf",
      parts: [
        { instrument: "Flauta 1", start: 1, end: 13 },
        { instrument: "Flauta 2", start: 14, end: 24 },
      ],
    },
    {
      pdf: "IMSLP40969-OboeEH.pdf",
      parts: [
        { instrument: "Oboe 1", start: 1, end: 12 },
        { instrument: "Oboe 2", start: 13, end: 23 },
        { instrument: "Ob EH", start: 13, end: 23 },
      ],
    },
    {
      pdf: "IMSLP20092-Clarinet.pdf",
      parts: [
        { instrument: "Clarinete 1", start: 1, end: 13 },
        { instrument: "Clarinete 2", start: 14, end: 24 },
      ],
    },
    {
      pdf: "IMSLP40971-Bassoon.pdf",
      parts: [
        { instrument: "Fagot 1", start: 1, end: 9 },
        { instrument: "Fagot 2", start: 10, end: 18 },
      ],
    },
    {
      pdf: "IMSLP40972-Horn12.pdf",
      parts: [
        { instrument: "Corno F 1", start: 1, end: 8 },
        { instrument: "Corno F 2", start: 9, end: 15 },
      ],
    },
    {
      pdf: "IMSLP40973-Horn34.pdf",
      parts: [
        { instrument: "Corno F 3", start: 1, end: 7 },
        { instrument: "Corno F 4", start: 8, end: 14 },
      ],
    },
    {
      pdf: "IMSLP40974-Trumpet.pdf",
      parts: [
        { instrument: "Trompeta 1", start: 1, end: 6 },
        { instrument: "Trompeta 2", start: 7, end: 12 },
      ],
    },
    {
      pdf: "IMSLP40976-Trombone12.pdf",
      parts: [
        { instrument: "Trombón 1", start: 1, end: 5, altSubdir: "Versión alternativa" },
        { instrument: "Trombón 2", start: 6, end: 10, altSubdir: "Versión alternativa" },
      ],
    },
    {
      pdf: "IMSLP40977-TromboneTuba.pdf",
      parts: [
        { instrument: "Trombón 1", start: 1, end: 5 },
        { instrument: "Trombón 2", start: 6, end: 10 },
        { instrument: "Trombón 3", start: 11, end: 15 },
        { instrument: "Tuba", start: 16, end: 20 },
      ],
    },
    whole("IMSLP40978-Timpani.pdf", "Perc Timbal", 5),
    {
      pdf: "IMSLP19963-Perc.pdf",
      parts: [
        { instrument: "Perc Triángulo", start: 1, end: 4 },
        { instrument: "Perc Pandereta", start: 5, end: 7 },
        { instrument: "Perc Tambor", start: 8, end: 10 },
        { instrument: "Perc Platillo", start: 11, end: 14 },
        { instrument: "Perc Bombo", start: 11, end: 14 },
      ],
    },
    whole("IMSLP40979-Harp.pdf", "Arpa", 8),
    whole("IMSLP40980-Violin1.pdf", "Violín 1", 20),
    whole("IMSLP40981-Violin2.pdf", "Violín 2", 18),
    whole("IMSLP40982-Viola.pdf", "Viola", 17),
    whole("IMSLP27339-Cello.pdf", "Violoncello", 19),
    whole("IMSLP40983-Bass.pdf", "Contrabajo", 11),
  ],
};

export const CHAUSSON_SINFONIA = {
  targetFolder: "Chausson, E. - Sinfonia en Sib, Op. 20",
  workNumber: "op.20",
  workTitle: "Sinfonía en Sib",
  composerTag: "Chausson, E",
  notes:
    "SCORE sin p.1 (portada ornamental Hamelle). Partes 1y2 / 3y4 en una misma hoja (Flûtes 1er et 2e…).",
  files: [
    {
      pdf: "IMSLP82933-SCORE.pdf",
      parts: [{ instrument: "SCORE", start: 2, end: 118 }],
    },
    {
      pdf: "IMSLP37754-Flute.pdf",
      parts: [
        { instrument: "Flauta 1y2", start: 1, end: 24 },
        { instrument: "Flauta 3", start: 25, end: 32 },
      ],
    },
    {
      pdf: "IMSLP37755-OboeEH.pdf",
      parts: [
        { instrument: "Oboe 1y2", start: 1, end: 22 },
        { instrument: "Ob EH", start: 23, end: 30 },
      ],
    },
    {
      pdf: "IMSLP37756-Clarinet.pdf",
      parts: [
        { instrument: "Clarinete Bb 1y2", start: 1, end: 27 },
        { instrument: "Clarinete Bajo", start: 28, end: 34 },
      ],
    },
    {
      pdf: "IMSLP37757-Bassoon.pdf",
      parts: [
        { instrument: "Fagot 1y2", start: 1, end: 20 },
        { instrument: "Fagot 3", start: 21, end: 28 },
      ],
    },
    {
      pdf: "IMSLP37758-Horn.pdf",
      parts: [
        { instrument: "Corno F 1y2", start: 1, end: 16 },
        { instrument: "Corno F 3y4", start: 17, end: 32 },
      ],
    },
    {
      pdf: "IMSLP37759-Trumpet.pdf",
      parts: [
        { instrument: "Trompeta 1y2", start: 1, end: 12 },
        { instrument: "Trompeta 3y4", start: 13, end: 22 },
      ],
    },
    {
      pdf: "IMSLP37760-TromboneTuba.pdf",
      parts: [
        { instrument: "Trombón 1y2", start: 1, end: 12 },
        { instrument: "Trombón 3", start: 13, end: 18 },
        { instrument: "Tuba", start: 19, end: 24 },
      ],
    },
    whole("IMSLP37761-Timpani.pdf", "Perc Timbal", 6),
    {
      pdf: "IMSLP37762-Harp.pdf",
      parts: [
        { instrument: "Arpa 1", start: 1, end: 8 },
        { instrument: "Arpa 2", start: 9, end: 15 },
      ],
    },
    whole("IMSLP37763-Violin1.pdf", "Violín 1", 16),
    whole("IMSLP37764-Violin2.pdf", "Violín 2", 16),
    whole("IMSLP37765-Viola.pdf", "Viola", 19),
    whole("IMSLP26551-Cello.pdf", "Violoncello", 18),
    whole("IMSLP37766-Bass.pdf", "Contrabajo", 12),
  ],
};

export const DVORAK_CARNIVAL = {
  targetFolder: "Dvorak, A. - Obertura Carnival, Op. 92",
  workNumber: "op.92",
  workTitle: "Obertura Carnival",
  composerTag: "Dvorak, A",
  notes:
    "Sin SCORE en la carpeta. Clarinetes en La, trompetas en Re, trompas en Mi (impresas así). Tamburino = pandereta.",
  files: [
    {
      pdf: "IMSLP40991-Flute.pdf",
      parts: [
        { instrument: "Flauta 1", start: 1, end: 4 },
        { instrument: "Flauta 2", start: 5, end: 8 },
        { instrument: "Fl Piccolo", start: 9, end: 11 },
      ],
    },
    {
      pdf: "IMSLP40992-OboeEH.pdf",
      parts: [
        { instrument: "Oboe 1", start: 1, end: 3 },
        { instrument: "Oboe 2", start: 4, end: 6 },
        { instrument: "Ob EH", start: 7, end: 7 },
      ],
    },
    {
      pdf: "IMSLP20040-Clarinet.pdf",
      parts: [
        { instrument: "Clarinete A 1", start: 1, end: 3 },
        { instrument: "Clarinete A 2", start: 4, end: 6 },
      ],
    },
    {
      pdf: "IMSLP40993-Bassoon.pdf",
      parts: [
        { instrument: "Fagot 1", start: 1, end: 3 },
        { instrument: "Fagot 2", start: 4, end: 6 },
      ],
    },
    {
      pdf: "IMSLP40994-Horn.pdf",
      parts: [
        { instrument: "Corno E 1", start: 1, end: 3 },
        { instrument: "Corno E 2", start: 4, end: 5 },
        { instrument: "Corno E 3", start: 6, end: 7 },
        { instrument: "Corno E 4", start: 8, end: 9 },
      ],
    },
    {
      pdf: "IMSLP40995-Trumpet.pdf",
      parts: [
        { instrument: "Trompeta D 1", start: 1, end: 2 },
        { instrument: "Trompeta D 2", start: 3, end: 4 },
      ],
    },
    {
      pdf: "IMSLP40996-TromboneTuba.pdf",
      parts: [
        { instrument: "Trombón 1", start: 1, end: 2 },
        { instrument: "Trombón 2", start: 3, end: 4 },
        { instrument: "Trombón Bajo", start: 5, end: 6 },
        { instrument: "Tuba", start: 7, end: 8 },
      ],
    },
    {
      pdf: "IMSLP19953-Perc.pdf",
      parts: [
        { instrument: "Perc Timbal", start: 1, end: 2 },
        { instrument: "Perc Triángulo", start: 3, end: 4 },
        { instrument: "Perc Platillo", start: 5, end: 6 },
        { instrument: "Perc Pandereta", start: 7, end: 8 },
      ],
    },
    whole("IMSLP40997-Harp.pdf", "Arpa", 2),
    whole("IMSLP40998-Violin1.pdf", "Violín 1", 7),
    whole("IMSLP40999-Violin2.pdf", "Violín 2", 7),
    whole("IMSLP41000-Viola.pdf", "Viola", 7),
    whole("IMSLP26991-Cello.pdf", "Violoncello", 7),
    whole("IMSLP41001-Bass.pdf", "Contrabajo", 4),
  ],
};

export const STRAVINSKY_SINFONIA = {
  targetFolder: "Stravinsky, I. - Sinfonia en Mib mayor, Op. 1",
  workNumber: "op.1",
  workTitle: "Sinfonía en Mib mayor",
  composerTag: "Stravinsky, I",
  notes:
    "SCORE completo (empieza en música). Flauta 3 y Fl Piccolo comparten hoja (Flauto III e Piccolo). Grand-Cassa e Piatti → Bombo y Platillo con las mismas páginas.",
  files: [
    whole("IMSLP525027-SCORE.pdf", "SCORE", 160),
    {
      pdf: "IMSLP525028-Flute.pdf",
      parts: [
        { instrument: "Flauta 1", start: 1, end: 16 },
        { instrument: "Flauta 2", start: 17, end: 31 },
        { instrument: "Flauta 3", start: 32, end: 40 },
        { instrument: "Fl Piccolo", start: 32, end: 40 },
      ],
    },
    {
      pdf: "IMSLP525029-Oboe.pdf",
      parts: [
        { instrument: "Oboe 1", start: 1, end: 14 },
        { instrument: "Oboe 2", start: 15, end: 27 },
      ],
    },
    {
      pdf: "IMSLP525030-Clarinet.pdf",
      parts: [
        { instrument: "Clarinete Bb 1", start: 1, end: 17 },
        { instrument: "Clarinete Bb 2", start: 18, end: 34 },
        { instrument: "Clarinete Bb 3", start: 35, end: 43 },
      ],
    },
    {
      pdf: "IMSLP525031-Bassoon.pdf",
      parts: [
        { instrument: "Fagot 1", start: 1, end: 13 },
        { instrument: "Fagot 2", start: 14, end: 26 },
      ],
    },
    {
      pdf: "IMSLP525032-Horn.pdf",
      parts: [
        { instrument: "Corno F 1", start: 1, end: 12 },
        { instrument: "Corno F 2", start: 13, end: 22 },
        { instrument: "Corno F 3", start: 23, end: 32 },
        { instrument: "Corno F 4", start: 33, end: 42 },
      ],
    },
    {
      pdf: "IMSLP525033-Trumpet.pdf",
      parts: [
        { instrument: "Trompeta Bb 1", start: 1, end: 9 },
        { instrument: "Trompeta Bb 2", start: 10, end: 17 },
        { instrument: "Trompeta Bb 3", start: 18, end: 22 },
      ],
    },
    {
      pdf: "IMSLP525034-Trombone.pdf",
      parts: [
        { instrument: "Trombón 1", start: 1, end: 7 },
        { instrument: "Trombón 2", start: 8, end: 14 },
        { instrument: "Trombón 3", start: 15, end: 21 },
      ],
    },
    whole("IMSLP525035-Tuba.pdf", "Tuba", 7),
    whole("IMSLP525036-Timpani.pdf", "Perc Timbal", 4),
    {
      pdf: "IMSLP525037-Perc.pdf",
      parts: [
        { instrument: "Perc Triángulo", start: 1, end: 2 },
        { instrument: "Perc Bombo", start: 3, end: 5 },
        { instrument: "Perc Platillo", start: 3, end: 5 },
      ],
    },
    whole("IMSLP525038-Violin1.pdf", "Violín 1", 19),
    whole("IMSLP525039-Violin2.pdf", "Violín 2", 18),
    whole("IMSLP525040-Viola.pdf", "Viola", 23),
    whole("IMSLP525041-Cello.pdf", "Violoncello", 19),
    whole("IMSLP525042-Bass.pdf", "Contrabajo", 13),
  ],
};

export const BORODIN_POLOVTSIANAS = {
  targetFolder: "Borodin, A. - Danzas Polovtsianas (Principe Igor)",
  workNumber: "",
  workTitle: "Danzas Polovtsianas",
  composerTag: "Borodin, A",
  notes:
    "Orchestra Parts Project, Príncipe Igor Nos. 8 y 17. SIN SCORE en la carpeta. Trombones/Tuba/Corno inglés solo en No. 17. Cello+Bajo comparten hoja (V-Celli e C-Bassi). Piatti e Cassa → Platillo y Bombo con las mismas páginas. Tamburo = tambor, Tamburino = pandereta, Campanelli = glockenspiel.",
  files: [
    whole("IMSLP40897-Piccolo.pdf", "Fl Piccolo", 7),
    {
      pdf: "IMSLP40898-Flute.pdf",
      parts: [
        { instrument: "Flauta 1", start: 1, end: 7 },
        { instrument: "Flauta 2", start: 8, end: 14 },
      ],
    },
    {
      pdf: "IMSLP526694-Oboe12.pdf",
      parts: [
        { instrument: "Oboe 1", start: 1, end: 8 },
        { instrument: "Oboe 2", start: 9, end: 15 },
      ],
    },
    whole("IMSLP526695-EnglishHorn.pdf", "Ob EH", 2),
    {
      pdf: "IMSLP20006-Clarinet.pdf",
      parts: [
        { instrument: "Clarinete Bb 1", start: 1, end: 8 },
        { instrument: "Clarinete Bb 2", start: 9, end: 17 },
      ],
    },
    {
      pdf: "IMSLP40900-Bassoon.pdf",
      parts: [
        { instrument: "Fagot 1", start: 1, end: 8 },
        { instrument: "Fagot 2", start: 9, end: 16 },
      ],
    },
    {
      pdf: "IMSLP40901-Horn.pdf",
      parts: [
        { instrument: "Corno F 1", start: 1, end: 5 },
        { instrument: "Corno F 2", start: 6, end: 10 },
        { instrument: "Corno F 3", start: 11, end: 15 },
        { instrument: "Corno F 4", start: 16, end: 20 },
      ],
    },
    {
      pdf: "IMSLP40902-Trumpet.pdf",
      parts: [
        { instrument: "Trompeta Bb 1", start: 1, end: 2 },
        { instrument: "Trompeta Bb 2", start: 3, end: 4 },
      ],
    },
    {
      pdf: "IMSLP526696-Trombones.pdf",
      parts: [
        { instrument: "Trombón 1", start: 1, end: 2 },
        { instrument: "Trombón 2", start: 3, end: 4 },
        { instrument: "Trombón 3", start: 5, end: 6 },
      ],
    },
    whole("IMSLP526697-Tuba.pdf", "Tuba", 2),
    whole("IMSLP40904-Timpani.pdf", "Perc Timbal", 4),
    {
      pdf: "IMSLP19916-Perc.pdf",
      parts: [
        { instrument: "Perc Triángulo", start: 1, end: 3 },
        { instrument: "Perc Glockenspiel", start: 4, end: 4 },
        { instrument: "Perc Tambor", start: 5, end: 8 },
        { instrument: "Perc Pandereta", start: 9, end: 11 },
        { instrument: "Perc Platillo", start: 12, end: 13 },
        { instrument: "Perc Bombo", start: 12, end: 13 },
      ],
    },
    whole("IMSLP40905-Harp.pdf", "Arpa", 3),
    whole("IMSLP40906-Violin1.pdf", "Violín 1", 8),
    whole("IMSLP40907-Violin2.pdf", "Violín 2", 8),
    whole("IMSLP40908-Viola.pdf", "Viola", 8),
    {
      pdf: "IMSLP26974-CelloBass.pdf",
      parts: [
        { instrument: "Violoncello", start: 1, end: 14 },
        { instrument: "Contrabajo", start: 1, end: 14 },
      ],
    },
  ],
};

/** Un PDF → varias sillas con todas las páginas (dobles: Oboe 3/Ob EH, etc.). */
const wholeAs = (pdf, end, instruments) => ({
  pdf,
  parts: instruments.map((instrument) => ({ instrument, start: 1, end })),
});

export const MAHLER_SINFONIA_4 = {
  targetFolder: "Mahler, G. - Sinfonia Nro. 4",
  workNumber: "",
  workTitle: "Sinfonía Nro. 4",
  composerTag: "Mahler, G",
  notes:
    "Partes IMSLP961510+ = un PDF por silla (sin portadas). Doble: Oboe 3/Ob EH, Clarinete 3/Clarinete Bajo, Fagot 3/Contrafagot (misma hoja, dos PDFs). Flauta 3 y 4 llevan Piccolo impreso. IMSLP961513 (Flauta 4) trae encabezado erróneo «Symphony No. 2 in C Minor» (música de la 4). SCORE sin p.1 (portada «in full score»). Soprano (mvt 4, reducción) sin p.1 (portada) → Voz. Trompetas en Fa.",
  files: [
    {
      pdf: "IMSLP70999-SCORE.pdf",
      parts: [{ instrument: "SCORE", start: 2, end: 127 }],
    },
    whole("IMSLP961510-Flute1.pdf", "Flauta 1", 10),
    whole("IMSLP961511-Flute2.pdf", "Flauta 2", 10),
    whole("IMSLP961512-Flute3.pdf", "Flauta 3", 6),
    whole("IMSLP961513-Flute4.pdf", "Flauta 4", 6),
    whole("IMSLP961514-Oboe1.pdf", "Oboe 1", 7),
    whole("IMSLP961515-Oboe2.pdf", "Oboe 2", 5),
    wholeAs("IMSLP961516-Oboe3EH.pdf", 5, ["Oboe 3", "Ob EH"]),
    whole("IMSLP961517-Clarinet1.pdf", "Clarinete 1", 11),
    whole("IMSLP961518-Clarinet2.pdf", "Clarinete 2", 8),
    wholeAs("IMSLP961519-Clarinet3.pdf", 6, ["Clarinete 3", "Clarinete Bajo"]),
    whole("IMSLP961520-Bassoon1.pdf", "Fagot 1", 7),
    whole("IMSLP961521-Bassoon2.pdf", "Fagot 2", 6),
    wholeAs("IMSLP961522-Bassoon3.pdf", 6, ["Fagot 3", "Contrafagot"]),
    whole("IMSLP961523-Horn1.pdf", "Corno F 1", 8),
    whole("IMSLP961524-Horn2.pdf", "Corno F 2", 6),
    whole("IMSLP961525-Horn3.pdf", "Corno F 3", 6),
    whole("IMSLP961526-Horn4.pdf", "Corno F 4", 6),
    whole("IMSLP961527-Trumpet1.pdf", "Trompeta F 1", 4),
    whole("IMSLP961528-Trumpet2.pdf", "Trompeta F 2", 4),
    whole("IMSLP961529-Trumpet3.pdf", "Trompeta F 3", 3),
    whole("IMSLP961530-Timpani.pdf", "Perc Timbal", 4),
    whole("IMSLP961531-BassDrum.pdf", "Perc Bombo", 2),
    whole("IMSLP961532-Cymbals.pdf", "Perc Platillo", 3),
    whole("IMSLP961533-Triangle.pdf", "Perc Triángulo", 3),
    whole("IMSLP961534-TamTam.pdf", "Perc Gong", 1),
    whole("IMSLP961535-SleighBells.pdf", "Perc Cascabeles", 2),
    whole("IMSLP961536-Glockenspiel.pdf", "Perc Glockenspiel", 2),
    whole("IMSLP43523-Harp.pdf", "Arpa", 10),
    whole("IMSLP43524-Violin1.pdf", "Violín 1", 16),
    whole("IMSLP43525-Violin2.pdf", "Violín 2", 12),
    whole("IMSLP43526-Viola.pdf", "Viola", 12),
    whole("IMSLP26425-Cello.pdf", "Violoncello", 15),
    whole("IMSLP43527-Bass.pdf", "Contrabajo", 10),
    {
      pdf: "IMSLP37185-Soprano-VocalScore-mvt4.pdf",
      parts: [{ instrument: "Voz", start: 2, end: 14 }],
    },
  ],
};

export const LOTE_ORQUESTALES = [
  ONSLOW_QUINTETO,
  LISZT_TASSO,
  SHEREZADE,
  CHAUSSON_SINFONIA,
  DVORAK_CARNIVAL,
  STRAVINSKY_SINFONIA,
  MAHLER_SINFONIA_4,
  BORODIN_POLOVTSIANAS,
];
