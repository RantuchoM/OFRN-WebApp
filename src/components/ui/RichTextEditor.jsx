import "./quillEntradasRegister";
import imageCompression from "browser-image-compression";
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

import { QUILL_FONT_FAMILY_KEYS, QUILL_FONT_SIZES_PX } from "./quillEntradasRegister";
import { normalizeLegacyEntradasQuillHtml } from "./quillFontNormalize";

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("No se pudo leer el archivo."));
    reader.readAsDataURL(file);
  });
}

const DEFAULT_FORMATS = [
  "header",
  "font",
  "size",
  "bold",
  "italic",
  "underline",
  "strike",
  "color",
  "background",
  "script",
  "indent",
  "align",
  "list",
  "bullet",
  "blockquote",
  "link",
  "image",
];

export default function RichTextEditor({
  value,
  onChange,
  placeholder = "",
  className = "",
  modules: modulesProp,
  formats: formatsProp,
  /** Si true, se abre ya en modo edición (barra visible). Útil en formularios inline (p. ej. Editar concierto). */
  defaultOpen = false,
}) {
  const quillRef = useRef(null);
  const [isEditing, setIsEditing] = useState(Boolean(defaultOpen));

  const normalizedValue = useMemo(() => normalizeLegacyEntradasQuillHtml(value || ""), [value]);

  useLayoutEffect(() => {
    const ed = quillRef.current?.getEditor?.();
    if (!ed?.root) return;
    ed.root.classList.add("entradas-richtext", "max-w-none", "text-sm", "text-slate-700");
  }, [normalizedValue]);

  const imageHandler = useCallback(() => {
    const quill = quillRef.current?.getEditor?.();
    if (!quill) return;

    const url = window.prompt(
      "Pegá la URL pública de la imagen (https://…). Dejá vacío y aceptá para elegir un archivo de tu equipo. Cancelá para no insertar.",
    );
    if (url === null) return;

    const range = quill.getSelection(true);
    const index = range?.index ?? quill.getLength();

    const trimmed = String(url || "").trim();
    if (trimmed) {
      if (!/^https?:\/\//i.test(trimmed)) {
        window.alert("La URL debe empezar con http:// o https://.");
        return;
      }
      quill.insertEmbed(index, "image", trimmed);
      quill.setSelection(index + 1);
      return;
    }

    const input = document.createElement("input");
    input.setAttribute("type", "file");
    input.setAttribute("accept", "image/*");
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const compressed = await imageCompression(file, {
          maxSizeMB: 0.22,
          maxWidthOrHeight: 1400,
          useWebWorker: true,
        });
        const dataUrl = await readFileAsDataUrl(compressed);
        const q = quillRef.current?.getEditor?.();
        if (!q) return;
        const r = q.getSelection(true);
        const i = r?.index ?? q.getLength();
        q.insertEmbed(i, "image", dataUrl);
        q.setSelection(i + 1);
      } catch (err) {
        console.error(err);
        window.alert("No se pudo insertar la imagen. Probá otra más chica o usá una URL.");
      }
    };
    input.click();
  }, []);

  const memoModules = useMemo(() => {
    if (modulesProp) return modulesProp;
    return {
      toolbar: {
        container: [
          [{ header: [1, 2, 3, 4, false] }],
          [{ font: [false, ...QUILL_FONT_FAMILY_KEYS] }],
          [{ size: [false, ...QUILL_FONT_SIZES_PX] }],
          ["bold", "italic", "underline", "strike"],
          [{ color: [] }, { background: [] }],
          [{ script: "sub" }, { script: "super" }],
          [{ indent: "-1" }, { indent: "+1" }, { align: [] }],
          [{ list: "ordered" }, { list: "bullet" }],
          ["blockquote", "link", "image"],
          ["clean"],
        ],
        handlers: {
          image: imageHandler,
        },
      },
    };
  }, [modulesProp, imageHandler]);

  const memoFormats = useMemo(() => formatsProp || DEFAULT_FORMATS, [formatsProp]);

  useEffect(() => {
    if (!isEditing || !quillRef.current) return;
    const id = window.requestAnimationFrame(() => {
      try {
        const editor = quillRef.current?.getEditor?.();
        if (editor) editor.focus();
      } catch (e) {
        // noop
      }
    });
    return () => window.cancelAnimationFrame(id);
  }, [isEditing]);

  return (
    <div
      className={`rounded-lg bg-white shadow-sm rich-text-quill ${
        isEditing
          ? `border border-indigo-300 ${className}`
          : `border border-slate-200 cursor-text hover:border-indigo-300 transition-colors rich-text-quill--readonly ${className}`
      }`}
      onClick={!isEditing ? () => setIsEditing(true) : undefined}
      onKeyDown={
        !isEditing
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setIsEditing(true);
              }
            }
          : undefined
      }
      role={!isEditing ? "button" : undefined}
      tabIndex={!isEditing ? 0 : undefined}
    >
      <ReactQuill
        ref={quillRef}
        theme="snow"
        value={normalizedValue}
        onChange={onChange}
        placeholder={placeholder}
        modules={memoModules}
        formats={memoFormats}
        readOnly={!isEditing}
        className="bg-white"
      />
    </div>
  );
}
