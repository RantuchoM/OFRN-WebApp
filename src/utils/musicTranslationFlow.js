/** Valores permitidos en `traduccion_segments.control_flujo` */
export const CONTROL_FLUJO_VALUES = [
  "none",
  "line",
  "paragraph",
  "semifrase",
  "cesura",
];

/** Orden del ciclo en UI (Enter / botón). */
export const CONTROL_FLUJO_CYCLE_ORDER = [
  "none",
  "line",
  "paragraph",
  "semifrase",
  "cesura",
];

/** @param {unknown} v */
export function normalizeControlFlujo(v) {
  const s = String(v ?? "none").toLowerCase();
  return CONTROL_FLUJO_VALUES.includes(s) ? s : "none";
}

/** @typedef {'none'|'line'|'paragraph'|'semifrase'|'cesura'} ControlFlujo */

/**
 * Cierra una “línea” lógica de estructura tras este segmento (nueva fila de columnas).
 */
export function controlFlujoBreaksLineAfter(flow) {
  const f = normalizeControlFlujo(flow);
  return f === "line" || f === "paragraph";
}

export function controlFlujoIsParagraph(flow) {
  return normalizeControlFlujo(flow) === "paragraph";
}

/** Símbolo decorativo inline (misma línea que el texto): solo apertura — | y “. */
export function controlFlujoInlineSuffix(flow) {
  const f = normalizeControlFlujo(flow);
  if (f === "semifrase") return "|";
  if (f === "cesura") return "\u201C"; // “
  return null;
}

/** Etiqueta en separador / PDF (misma convención que inline). */
export function controlFlujoButtonLabel(flow) {
  const f = normalizeControlFlujo(flow);
  switch (f) {
    case "line":
      return "↵";
    case "paragraph":
      return "¶";
    case "semifrase":
      return "|";
    case "cesura":
      return "\u201C";
    default:
      return "·";
  }
}

export function controlFlujoNext(flow) {
  const f = normalizeControlFlujo(flow);
  const i = CONTROL_FLUJO_CYCLE_ORDER.indexOf(f);
  const next =
    CONTROL_FLUJO_CYCLE_ORDER[(i < 0 ? 0 : i + 1) % CONTROL_FLUJO_CYCLE_ORDER.length];
  return next;
}

/**
 * Margen izquierdo de un fragmento respecto al anterior en vista estructura,
 * según cómo termina el texto ES del fragmento previo (misma palabra vs corte).
 *
 * @param {string} prevSegmentSpanish
 */
export function structureInterSegmentMarginClass(prevSegmentSpanish) {
  const t = String(prevSegmentSpanish ?? "").replace(/\s+$/u, "");
  // Espaciado casi nulo entre segmentos del mismo idioma en una misma línea.
  if (t.length === 0) return "ml-0.5";
  const last = t[t.length - 1];
  // Guion “alto” => se pega (misma palabra / corte duro)
  if (/[-\u00AD\u2010\u2011]/u.test(last)) return "ml-0";
  // Puntuación => un poquito más separado
  if (/[.!?,:;…¿¡。、]/.test(last)) return "ml-1";
  if (/[\)\]\}"\u201D\u2019'»›]/.test(last)) return "ml-1";
  return "ml-0.5";
}

/**
 * Recuadro tipo superíndice (vista estructura): compacto, arriba a la derecha del fragmento.
 * `none` = transparente hasta hover.
 */
export function controlFlujoStructureSuperscriptClasses(flow) {
  const f = normalizeControlFlujo(flow);
  const colored =
    "inline-flex min-h-[0.95rem] min-w-[0.95rem] items-center justify-center rounded border px-0.5 py-px text-[9px] font-black leading-none shadow-sm transition-[filter] hover:brightness-95 dark:hover:brightness-110";
  switch (f) {
    case "line":
      return `${colored} border-emerald-600 bg-emerald-200 text-emerald-950 dark:border-emerald-500 dark:bg-emerald-800/95 dark:text-emerald-50`;
    case "paragraph":
      return `${colored} border-sky-600 bg-sky-200 text-sky-950 dark:border-sky-500 dark:bg-sky-800/95 dark:text-sky-50`;
    case "cesura":
      return `${colored} border-amber-600 bg-amber-200 text-amber-950 dark:border-amber-500 dark:bg-amber-800/95 dark:text-amber-50`;
    case "semifrase":
      return `${colored} border-orange-600 bg-orange-200 text-orange-950 dark:border-orange-500 dark:bg-orange-800/95 dark:text-orange-50`;
    default:
      return "inline-flex min-h-[0.95rem] min-w-[0.95rem] items-center justify-center rounded border-0 bg-transparent px-0.5 py-px text-[9px] font-black leading-none text-transparent shadow-none transition-colors hover:bg-slate-200/40 hover:text-slate-500/70 dark:hover:bg-slate-800/50 dark:hover:text-slate-400/75";
  }
}

/**
 * Separador entre fragmentos: solo tipos que “cambian” flujo llevan color;
 * `none` queda transparente (sin violeta).
 */
export function controlFlujoSeparatorClasses(flow) {
  const f = normalizeControlFlujo(flow);
  const colored =
    "flex w-10 shrink-0 flex-col items-center justify-center self-stretch rounded-md border-2 px-0.5 text-center text-sm font-black shadow-sm transition-[filter] hover:brightness-95 dark:hover:brightness-110";
  switch (f) {
    case "line":
      return `${colored} border-emerald-600 bg-emerald-200 text-emerald-950 dark:border-emerald-500 dark:bg-emerald-800/95 dark:text-emerald-50`;
    case "paragraph":
      return `${colored} border-sky-600 bg-sky-200 text-sky-950 dark:border-sky-500 dark:bg-sky-800/95 dark:text-sky-50`;
    case "cesura":
      return `${colored} border-amber-600 bg-amber-200 text-amber-950 dark:border-amber-500 dark:bg-amber-800/95 dark:text-amber-50`;
    case "semifrase":
      return `${colored} border-orange-600 bg-orange-200 text-orange-950 dark:border-orange-500 dark:bg-orange-800/95 dark:text-orange-50`;
    default:
      return "flex w-10 shrink-0 flex-col items-center justify-center self-stretch rounded-md border-0 bg-transparent px-0.5 text-center text-sm font-black text-transparent shadow-none transition-colors hover:bg-slate-200/35 hover:text-slate-500/65 dark:hover:bg-slate-800/45 dark:hover:text-slate-400/70";
  }
}

/** Glifo de flujo en capa PDF: `none` transparente; resto como pastilla de color. */
export function controlFlujoPdfGlyphClasses(flow) {
  const f = normalizeControlFlujo(flow);
  if (f === "none") {
    return "absolute z-20 flex h-[1.375rem] min-w-[1.4rem] cursor-pointer items-center justify-center rounded border-0 bg-transparent p-0.5 text-[10px] font-bold leading-none text-transparent shadow-none transition-colors hover:bg-black/5 hover:text-slate-500/65 dark:hover:bg-white/5 dark:hover:text-slate-400/70";
  }
  const base =
    "absolute z-20 flex h-[1.375rem] min-w-[1.45rem] cursor-pointer items-center justify-center rounded border-2 px-0.5 text-[10px] font-black leading-none shadow-sm transition-[filter] hover:brightness-95 dark:hover:brightness-110";
  switch (f) {
    case "line":
      return `${base} border-emerald-600 bg-emerald-200 text-emerald-950 dark:border-emerald-500 dark:bg-emerald-800/95 dark:text-emerald-50`;
    case "paragraph":
      return `${base} border-sky-600 bg-sky-200 text-sky-950 dark:border-sky-500 dark:bg-sky-800/95 dark:text-sky-50`;
    case "cesura":
      return `${base} border-amber-600 bg-amber-200 text-amber-950 dark:border-amber-500 dark:bg-amber-800/95 dark:text-amber-50`;
    case "semifrase":
      return `${base} border-orange-600 bg-orange-200 text-orange-950 dark:border-orange-500 dark:bg-orange-800/95 dark:text-orange-50`;
    default:
      return "absolute z-20 flex h-[1.375rem] min-w-[1.4rem] cursor-pointer items-center justify-center rounded border-0 bg-transparent p-0.5 text-[10px] font-bold leading-none text-transparent shadow-none transition-colors hover:bg-black/5 hover:text-slate-500/65 dark:hover:bg-white/5 dark:hover:text-slate-400/70";
  }
}

/** Marca inline | o “ en PDF. */
export function controlFlujoPdfInlineSuffixClasses(flow) {
  const f = normalizeControlFlujo(flow);
  if (f === "semifrase")
    return "border border-orange-600 bg-orange-200 text-[10px] font-black text-orange-950 dark:border-orange-500 dark:bg-orange-800/95 dark:text-orange-50";
  if (f === "cesura")
    return "border border-amber-600 bg-amber-200 text-[10px] font-black text-amber-950 dark:border-amber-500 dark:bg-amber-800/95 dark:text-amber-50";
  return "";
}

/**
 * Prefijo de estrofa: texto antes del **primer punto** en `segment_name`.
 * Ej. `Chorus1.31` → `Chorus1`; `Verse 2.1` → `Verse 2` (el punto tras “2” corta → `Verse 2`).
 * Si no hay punto, se usa el nombre completo (trim).
 *
 * @param {string} segmentName
 */
export function segmentStanzaPrefix(segmentName) {
  const name = String(segmentName ?? "").trim();
  const dot = name.indexOf(".");
  if (dot === -1) return name || "—";
  return name.slice(0, dot) || "—";
}

/**
 * Título de sección legible: `Chorus1` → `CHORUS 1`, `Verse2` → `VERSE 2`.
 * Regex: parte alfabética + parte numérica opcional al final del prefijo.
 *
 * @param {string} prefix
 */
export function formatStanzaHeading(prefix) {
  const p = String(prefix ?? "").trim() || "—";
  const m1 = p.match(/^([A-Za-z_]+)\s*(\d+)$/i);
  if (m1) {
    return `${m1[1].toUpperCase().replace(/_/g, " ")} ${m1[2]}`;
  }
  const compact = p.replace(/\s+/g, "");
  const m2 = compact.match(/^([A-Za-z_]+)(\d+)$/);
  if (m2) {
    return `${m2[1].toUpperCase().replace(/_/g, " ")} ${m2[2]}`;
  }
  return p.toUpperCase().replace(/_/g, " ");
}

/**
 * @param {{ segment_name: string }[]} segmentsOrdered
 * @returns {{ prefix: string; segments: typeof segmentsOrdered }[]}
 */
export function groupSegmentsByStanzaPrefix(segmentsOrdered) {
  const groups = [];
  let curPrefix = null;
  let cur = [];
  for (const seg of segmentsOrdered) {
    const p = segmentStanzaPrefix(seg.segment_name);
    if (cur.length && p !== curPrefix) {
      groups.push({ prefix: curPrefix, segments: cur });
      cur = [];
    }
    curPrefix = p;
    cur.push(seg);
  }
  if (cur.length) groups.push({ prefix: curPrefix, segments: cur });
  return groups;
}

/**
 * Parte la lista en filas lógicas según `control_flujo` al final de cada segmento.
 * @param {object[]} segments
 * @param {Record<string, string>} flowById
 */
export function chunkSegmentsByControlFlow(segments, flowById) {
  const rows = [];
  let cur = [];
  for (const seg of segments) {
    cur.push(seg);
    const flow = flowById[seg.id] ?? "none";
    if (controlFlujoBreaksLineAfter(flow)) {
      rows.push(cur);
      cur = [];
    }
  }
  if (cur.length) rows.push(cur);
  return rows;
}
