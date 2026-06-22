import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { IconFileText, IconFirma, IconLoader, IconUpload } from "./Icons";

const FORMAT_OPTIONS = [
  {
    id: "pdf",
    label: "PDF",
    hint: "A4 aplanado",
    icon: IconFirma,
  },
  {
    id: "docx",
    label: "Word en blanco",
    hint: "Solo cuadro de firmas",
    icon: IconFileText,
  },
  {
    id: "docx-merge",
    label: "Word + nota",
    hint: "Subir .docx y agregar firmas al final",
    icon: IconUpload,
    pickFile: true,
  },
];

export default function CuadroFirmasExportButton({
  onExport,
  disabled = false,
  loading = false,
  label = "Cuadro de firmas",
  compact = false,
  menuPlacement = "bottom",
  className = "",
  title = "Exportar cuadro de firmas en PDF o Word",
}) {
  const [open, setOpen] = useState(false);
  const [awaitingNoteFile, setAwaitingNoteFile] = useState(false);
  const btnRef = useRef(null);
  const menuRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDocClick = (event) => {
      if (
        btnRef.current?.contains(event.target) ||
        menuRef.current?.contains(event.target)
      ) {
        return;
      }
      setOpen(false);
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const handlePick = (option) => {
    if (option.pickFile) {
      setAwaitingNoteFile(true);
      setOpen(false);
      fileInputRef.current?.click();
      return;
    }
    setOpen(false);
    if (typeof onExport === "function") onExport(option.id);
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !awaitingNoteFile) return;
    if (!/\.docx$/i.test(file.name)) {
      alert("Seleccioná un archivo Word (.docx).");
      setAwaitingNoteFile(false);
      return;
    }
    if (typeof onExport === "function") {
      onExport({
        format: "docx",
        hostDocxFile: file,
      });
    }
    setAwaitingNoteFile(false);
  };

  const rect = btnRef.current?.getBoundingClientRect();
  const menuWidth = compact ? 188 : 210;
  const menuStyle = rect
    ? {
        position: "fixed",
        left: Math.max(
          8,
          Math.min(
            rect.left + rect.width / 2 - menuWidth / 2,
            window.innerWidth - menuWidth - 8,
          ),
        ),
        top: menuPlacement === "top" ? rect.top - 8 : rect.bottom + 6,
        width: menuWidth,
        zIndex: 110,
        transform: menuPlacement === "top" ? "translateY(-100%)" : undefined,
      }
    : { display: "none" };

  const baseBtnClass = compact
    ? "p-1.5 bg-white text-violet-600 rounded-lg hover:bg-violet-600 hover:text-white transition-all border border-violet-100 shadow-sm disabled:opacity-60"
    : "w-full py-2.5 bg-white border border-slate-300 text-slate-700 font-bold rounded-lg hover:bg-slate-50 hover:border-indigo-300 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-sm";

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="hidden"
        onChange={handleFileChange}
      />
      <button
        ref={btnRef}
        type="button"
        onClick={() => {
          if (!disabled && !loading) setOpen((value) => !value);
        }}
        disabled={disabled || loading}
        title={title}
        className={`${baseBtnClass} ${className}`.trim()}
      >
        {loading ? (
          <>
            <IconLoader size={compact ? 16 : 18} className="animate-spin" />
            {!compact ? "Generando..." : null}
          </>
        ) : (
          <>
            <IconFirma size={compact ? 16 : 18} />
            {!compact ? label : null}
          </>
        )}
      </button>

      {open &&
        createPortal(
          <div
            ref={menuRef}
            style={menuStyle}
            className="rounded-lg border border-slate-200 bg-white p-1 shadow-lg"
            role="menu"
            aria-label="Formato de cuadro de firmas"
          >
            {FORMAT_OPTIONS.map((option) => {
              const OptionIcon = option.icon;
              return (
                <button
                  key={option.id}
                  type="button"
                  role="menuitem"
                  onClick={() => handlePick(option)}
                  className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-800"
                >
                  <OptionIcon size={16} className="shrink-0 text-indigo-600" />
                  <span className="flex min-w-0 flex-col">
                    <span className="font-bold leading-tight">{option.label}</span>
                    <span className="text-[10px] text-slate-500">{option.hint}</span>
                  </span>
                </button>
              );
            })}
          </div>,
          document.body,
        )}
    </>
  );
}
