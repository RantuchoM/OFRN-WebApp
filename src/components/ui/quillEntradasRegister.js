/**
 * Debe importarse antes que `react-quill` para registrar formatos en la misma
 * instancia de Quill que usa el editor.
 *
 * Claves de fuente **sin guiones** (p. ej. `ofrnserif`, clase `ql-font-ofrnserif`):
 * Quill/Parchment resuelve `ClassAttributor.keys()` quitando el último segmento
 * del nombre de clase (`ql-font-ofrn-serif` → `ql-font-ofrn`, no registrado) y
 * el modelo pierde la fuente al optimizar. Con un solo segmento tras `ql-font-`,
 * la clave queda en `ql-font` y coincide con el registro.
 */
import Quill from "quill";

export const QUILL_FONT_SIZES_PX = [
  "8px",
  "9px",
  "10px",
  "11px",
  "12px",
  "13px",
  "14px",
  "15px",
  "16px",
  "18px",
  "20px",
  "22px",
  "24px",
  "28px",
  "32px",
  "36px",
  "40px",
  "48px",
  "56px",
  "64px",
];

/** Valores whitelist = último segmento de `ql-font-<valor>` (sin guiones extra). */
export const QUILL_FONT_FAMILY_KEYS = [
  "ofrnsystem",
  "ofrnserif",
  "ofrntimes",
  "ofrnsans",
  "ofrnmono",
  "ofrnhumanist",
];

const SizeStyle = Quill.import("attributors/style/size");
SizeStyle.whitelist = [...QUILL_FONT_SIZES_PX];
Quill.register(SizeStyle, true);

const FontClass = Quill.import("formats/font");
const FontStyle = Quill.import("attributors/style/font");

FontClass.whitelist = [...QUILL_FONT_FAMILY_KEYS, "serif", "monospace"];
FontStyle.whitelist = [];

Quill.register(FontClass, true);
