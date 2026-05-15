/**
 * Normaliza clases `ql-font-*` de contenido guardado con la convención antigua
 * (valores con guiones: `ofrn-serif` → clase `ql-font-ofrn-serif`), que Quill 1.3 /
 * Parchment no resuelve bien en `ClassAttributor.keys()` y provoca pérdida de
 * fuente al editar. Ver comentario en `quillEntradasRegister.js`.
 */
const LEGACY_QL_FONT_CLASS = [
  ["ql-font-ofrn-humanist", "ql-font-ofrnhumanist"],
  ["ql-font-ofrn-system", "ql-font-ofrnsystem"],
  ["ql-font-ofrn-serif", "ql-font-ofrnserif"],
  ["ql-font-ofrn-times", "ql-font-ofrntimes"],
  ["ql-font-ofrn-sans", "ql-font-ofrnsans"],
  ["ql-font-ofrn-mono", "ql-font-ofrnmono"],
];

export function normalizeLegacyEntradasQuillHtml(html) {
  if (html == null || typeof html !== "string") return html;
  let out = html;
  for (const [from, to] of LEGACY_QL_FONT_CLASS) {
    out = out.split(from).join(to);
  }
  return out;
}
