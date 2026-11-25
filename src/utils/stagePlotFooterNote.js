/**
 * Nota al pie del lienzo de escenario (HTML mínimo Quill).
 * Persistido en `payload.stage.footerNote`.
 */

const ALLOWED_TAGS = new Set([
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "ul",
  "ol",
  "li",
]);

/**
 * @param {unknown} html
 * @returns {boolean}
 */
export function isStagePlotFooterNoteEmpty(html) {
  const text = String(html || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&#160;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  return !text;
}

/**
 * Sanitiza HTML de la nota: solo p/br/strong/b/em/i/u/ul/ol/li.
 * Sin atributos, scripts ni imágenes.
 * @param {unknown} html
 * @returns {string}
 */
export function sanitizeStagePlotFooterNoteHtml(html) {
  const raw = String(html || "");
  if (!raw.trim()) return "";

  if (typeof document !== "undefined" && typeof DOMParser !== "undefined") {
    try {
      const doc = new DOMParser().parseFromString(
        `<div id="root">${raw}</div>`,
        "text/html",
      );
      const root = doc.getElementById("root");
      if (!root) return "";
      walkSanitize(root);
      const out = root.innerHTML.trim();
      return isStagePlotFooterNoteEmpty(out) ? "" : out;
    } catch {
      /* fall through */
    }
  }

  return sanitizeFooterNoteHtmlRegex(raw);
}

/**
 * @param {Element} node
 */
function walkSanitize(node) {
  const children = Array.from(node.childNodes);
  for (const child of children) {
    if (child.nodeType === 3) continue; // text
    if (child.nodeType !== 1) {
      child.remove();
      continue;
    }
    const el = /** @type {Element} */ (child);
    const tag = el.tagName.toLowerCase();
    if (!ALLOWED_TAGS.has(tag)) {
      // Unwrap: keep children, drop the tag.
      while (el.firstChild) {
        node.insertBefore(el.firstChild, el);
      }
      el.remove();
      continue;
    }
    // Strip all attributes.
    while (el.attributes.length > 0) {
      el.removeAttribute(el.attributes[0].name);
    }
    walkSanitize(el);
  }
}

/**
 * Fallback sin DOMParser.
 * @param {string} html
 */
function sanitizeFooterNoteHtmlRegex(html) {
  let s = String(html || "");
  s = s.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "");
  s = s.replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "");
  s = s.replace(/<\/?(?!\/?(?:p|br|strong|b|em|i|u|ul|ol|li)\b)[a-z][^>]*>/gi, "");
  s = s.replace(/<(p|br|strong|b|em|i|u|ul|ol|li)\b[^>]*\/?>/gi, (_, tag) => {
    const t = String(tag).toLowerCase();
    return t === "br" ? "<br>" : `<${t}>`;
  });
  s = s.replace(/\son\w+\s*=\s*(['"]).*?\1/gi, "");
  s = s.replace(/javascript\s*:/gi, "");
  const out = s.trim();
  return isStagePlotFooterNoteEmpty(out) ? "" : out;
}

/**
 * @param {unknown} value
 * @returns {string}
 */
export function normalizeStagePlotFooterNote(value) {
  if (value == null) return "";
  if (typeof value !== "string") return "";
  return sanitizeStagePlotFooterNoteHtml(value);
}

/**
 * @typedef {{ text: string, bold?: boolean, italic?: boolean }} FooterNoteRun
 * @typedef {{
 *   type: 'p' | 'ul' | 'ol',
 *   runs?: FooterNoteRun[],
 *   items?: FooterNoteRun[][],
 * }} FooterNoteBlock
 */

/**
 * Parsea HTML sanitizado a bloques para PDF/canvas.
 * @param {unknown} html
 * @returns {FooterNoteBlock[]}
 */
export function parseStagePlotFooterNoteBlocks(html) {
  const clean = sanitizeStagePlotFooterNoteHtml(html);
  if (!clean) return [];

  if (typeof document === "undefined" || typeof DOMParser === "undefined") {
    const plain = clean
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .trim();
    if (!plain) return [];
    return plain.split(/\n+/).map((line) => ({
      type: "p",
      runs: [{ text: line }],
    }));
  }

  const doc = new DOMParser().parseFromString(
    `<div id="root">${clean}</div>`,
    "text/html",
  );
  const root = doc.getElementById("root");
  if (!root) return [];

  /** @type {FooterNoteBlock[]} */
  const blocks = [];

  const pushParagraphFrom = (el) => {
    const runs = collectRuns(el);
    if (!runs.length || runs.every((r) => !r.text.trim())) return;
    blocks.push({ type: "p", runs });
  };

  for (const child of Array.from(root.childNodes)) {
    if (child.nodeType === 3) {
      const t = (child.textContent || "").replace(/\s+/g, " ").trim();
      if (t) blocks.push({ type: "p", runs: [{ text: t }] });
      continue;
    }
    if (child.nodeType !== 1) continue;
    const el = /** @type {Element} */ (child);
    const tag = el.tagName.toLowerCase();
    if (tag === "ul" || tag === "ol") {
      const items = [];
      for (const li of Array.from(el.children)) {
        if (li.tagName.toLowerCase() !== "li") continue;
        const runs = collectRuns(li);
        if (runs.length) items.push(runs);
      }
      if (items.length) blocks.push({ type: tag, items });
    } else if (tag === "br") {
      blocks.push({ type: "p", runs: [{ text: "" }] });
    } else {
      pushParagraphFrom(el);
    }
  }

  return blocks;
}

/**
 * @param {Element} el
 * @returns {FooterNoteRun[]}
 */
function collectRuns(el) {
  /** @type {FooterNoteRun[]} */
  const runs = [];

  /**
   * @param {Node} node
   * @param {{ bold: boolean, italic: boolean }} style
   */
  const walk = (node, style) => {
    if (node.nodeType === 3) {
      const raw = node.textContent || "";
      // Preserve single spaces; collapse runs of whitespace except intentional.
      const text = raw.replace(/\u00a0/g, " ").replace(/\s+/g, " ");
      if (!text) return;
      // Skip pure leading/trailing glue from block wrappers when empty-ish.
      const last = runs[runs.length - 1];
      if (last && last.bold === style.bold && last.italic === style.italic) {
        last.text += text;
      } else {
        runs.push({ text, bold: style.bold, italic: style.italic });
      }
      return;
    }
    if (node.nodeType !== 1) return;
    const tag = /** @type {Element} */ (node).tagName.toLowerCase();
    if (tag === "br") {
      runs.push({ text: "\n", bold: style.bold, italic: style.italic });
      return;
    }
    const next = {
      bold: style.bold || tag === "strong" || tag === "b",
      italic: style.italic || tag === "em" || tag === "i",
    };
    for (const c of Array.from(node.childNodes)) walk(c, next);
  };

  walk(el, { bold: false, italic: false });
  return runs
    .map((r) => ({
      ...r,
      text: r.text === "\n" ? "\n" : r.text,
    }))
    .filter((r) => r.text === "\n" || r.text.length > 0);
}

/**
 * Texto plano (p. ej. previews / logs).
 * @param {unknown} html
 * @returns {string}
 */
export function stagePlotFooterNotePlainText(html) {
  const blocks = parseStagePlotFooterNoteBlocks(html);
  const lines = [];
  for (const b of blocks) {
    if (b.type === "p") {
      lines.push(runsToPlain(b.runs || []));
    } else if (b.type === "ul" || b.type === "ol") {
      (b.items || []).forEach((item, i) => {
        const bullet = b.type === "ol" ? `${i + 1}. ` : "• ";
        lines.push(bullet + runsToPlain(item));
      });
    }
  }
  return lines.join("\n").trim();
}

/**
 * @param {FooterNoteRun[]} runs
 */
function runsToPlain(runs) {
  return runs.map((r) => r.text).join("").replace(/\n+/g, " ").trim();
}
