import React from "react";
import "react-quill/dist/quill.snow.css";

import { normalizeLegacyEntradasQuillHtml } from "./quillFontNormalize";

/**
 * Muestra HTML generado por Quill con las mismas reglas que el cuerpo del editor
 * (`.ql-snow .ql-editor` de quill.snow.css + `.entradas-richtext`).
 */
export default function EntradasRichTextHtml({
  html,
  className = "",
  /** Clases en el nodo interno (además de ql-editor entradas-richtext …). */
  innerClassName = "",
}) {
  const raw = normalizeLegacyEntradasQuillHtml(String(html || "").trim());
  if (!raw) return null;

  return (
    <div className={className}>
      <div className="ql-snow">
        <div
          className={`ql-editor entradas-richtext max-w-none text-sm text-slate-700 ${innerClassName}`.trim()}
          dangerouslySetInnerHTML={{ __html: raw }}
        />
      </div>
    </div>
  );
}
