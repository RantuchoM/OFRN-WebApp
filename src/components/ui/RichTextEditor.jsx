import React, { useEffect, useMemo, useRef, useState } from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

const DEFAULT_MODULES = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    [{ size: ["small", false, "large", "huge"] }],
    ["bold", "italic", "underline", "strike"],
    [{ color: [] }, { background: [] }],
    [{ indent: "-1" }, { indent: "+1" }],
    [{ list: "ordered" }, { list: "bullet" }],
    ["link"],
    ["clean"],
  ],
};

const DEFAULT_FORMATS = [
  "header",
  "size",
  "bold",
  "italic",
  "underline",
  "strike",
  "color",
  "background",
  "indent",
  "list",
  "bullet",
  "link",
];

export default function RichTextEditor({
  value,
  onChange,
  placeholder = "",
  className = "",
  modules,
  formats,
}) {
  const memoModules = useMemo(() => modules || DEFAULT_MODULES, [modules]);
  const memoFormats = useMemo(() => formats || DEFAULT_FORMATS, [formats]);

  const [isEditing, setIsEditing] = useState(false);
  const quillRef = useRef(null);

  useEffect(() => {
    if (isEditing && quillRef.current) {
      // Damos un pequeño delay para asegurar que Quill haya montado
      const id = setTimeout(() => {
        try {
          const editor = quillRef.current.getEditor
            ? quillRef.current.getEditor()
            : null;
          if (editor) editor.focus();
        } catch (e) {
          // noop
        }
      }, 0);
      return () => clearTimeout(id);
    }
  }, [isEditing]);

  if (!isEditing) {
    return (
      <div
        className={`rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 min-h-[52px] cursor-text hover:border-fixed-indigo-300 transition-colors ${className}`}
        onClick={() => setIsEditing(true)}
      >
        {value ? (
          <div
            className="prose prose-sm prose-slate max-w-none"
            dangerouslySetInnerHTML={{ __html: value }}
          />
        ) : (
          <span className="text-slate-400 italic">{placeholder || "Click para editar..."}</span>
        )}
      </div>
    );
  }

  return (
    <div
      className={`rounded-lg border border-fixed-indigo-300 bg-white shadow-sm ${className}`}
    >
      <ReactQuill
        ref={quillRef}
        theme="snow"
        value={value || ""}
        onChange={onChange}
        placeholder={placeholder}
        modules={memoModules}
        formats={memoFormats}
      />
    </div>
  );
}

