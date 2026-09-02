import React, { useEffect, useRef } from "react";
import {
  IconBold,
  IconItalic,
  IconUnderline,
} from "../../components/ui/Icons";
import {
  hasHtmlMarkup,
  stripHtml,
} from "../../utils/eventDisplayUtils";

/** True si el HTML de detalle no tiene texto visible (p. ej. `<br>`, `<div><br></div>`). */
export function isFimbaDetalleEmpty(html) {
  return !stripHtml(html);
}

/**
 * Vista lectura de `eventos.descripcion` (parte actividad / Detalle FIMBA).
 * Misma columna OFRN que EventForm / EventQuickView.
 */
export function FimbaEventDetallePreview({
  html,
  empty = "—",
  className = "",
  style,
}) {
  const raw = html == null ? "" : String(html);
  const plain = stripHtml(raw);
  if (!plain) {
    return (
      <span className={className} style={style}>
        {empty}
      </span>
    );
  }
  if (hasHtmlMarkup(raw)) {
    return (
      <span
        className={`fimba-detalle-preview ${className}`.trim()}
        style={style}
        dangerouslySetInnerHTML={{ __html: raw }}
      />
    );
  }
  return (
    <span className={className} style={style}>
      {plain}
    </span>
  );
}

/**
 * Editor rich-text Detalle (contentEditable + B/I/U), mismo patrón que
 * `EventForm` → `eventos.descripcion`. Skin FIMBA.
 * `compact` = toolbar/editor más chicos (modales / celdas legacy).
 */
export default function FimbaEventDetalleEditor({
  value = "",
  onChange,
  onBlur,
  placeholder = "Ej. Check-in hotel / Show noche 1",
  id = "fimba-event-detalle",
  label = "Detalle",
  ariaLabel,
  helperText = (
    <>
      Texto libre con formato (negrita / cursiva / subrayado). Se guarda en{" "}
      <code style={{ fontSize: "0.68rem" }}>eventos.descripcion</code>{" "}
      (mismo campo que OFRN).
    </>
  ),
  compact = false,
}) {
  const editorRef = useRef(null);

  const handleExecCommand = (command) => {
    if (!editorRef.current) return;
    document.execCommand(command, false, null);
    editorRef.current.focus();
    onChange?.(editorRef.current.innerHTML);
  };

  useEffect(() => {
    if (!editorRef.current) return;
    const next = value || "";
    if (editorRef.current.innerHTML === next) return;
    if (document.activeElement === editorRef.current) return;
    editorRef.current.innerHTML = next;
  }, [value]);

  const toolbar = (
    <div
      style={{
        display: "flex",
        gap: 2,
        padding: 2,
        borderRadius: 6,
        border: "1px solid #e2e8f0",
        background: "#f8fafc",
        flexShrink: 0,
      }}
    >
      {[
        { cmd: "bold", Icon: IconBold, title: "Negrita" },
        { cmd: "italic", Icon: IconItalic, title: "Cursiva" },
        { cmd: "underline", Icon: IconUnderline, title: "Subrayado" },
      ].map(({ cmd, Icon, title }) => (
        <button
          key={cmd}
          type="button"
          title={title}
          aria-label={title}
          className="fimba-btn fimba-btn-ghost"
          style={{ padding: compact ? 3 : 4, lineHeight: 0 }}
          onMouseDown={(e) => {
            e.preventDefault();
            handleExecCommand(cmd);
          }}
        >
          <Icon size={compact ? 12 : 14} />
        </button>
      ))}
    </div>
  );

  return (
    <div style={compact ? { minWidth: "10rem", maxWidth: "18rem" } : undefined}>
      {(label || toolbar) && (
        <div
          style={{
            display: "flex",
            justifyContent: label ? "space-between" : "flex-end",
            alignItems: "flex-end",
            marginBottom: compact ? 2 : 4,
            gap: 8,
          }}
        >
          {label ? (
            <label className="fimba-label" htmlFor={id} style={{ marginBottom: 0 }}>
              {label}
            </label>
          ) : null}
          {toolbar}
        </div>
      )}
      <div
        className="fimba-input"
        style={{
          padding: 0,
          overflow: "hidden",
          display: "block",
        }}
      >
        <div
          ref={editorRef}
          id={id}
          role="textbox"
          aria-multiline="true"
          aria-label={ariaLabel || (typeof label === "string" ? label : "Detalle")}
          contentEditable
          suppressContentEditableWarning
          data-placeholder={placeholder}
          className="fimba-detalle-editor"
          style={{
            padding: compact ? "0.4rem 0.5rem" : "0.55rem 0.75rem",
            minHeight: compact ? 56 : 80,
            maxHeight: compact ? 120 : 150,
            overflowY: "auto",
            outline: "none",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            fontSize: compact ? "0.78rem" : "0.9rem",
            lineHeight: 1.45,
            background: "#fff",
          }}
          onInput={(e) => {
            onChange?.(e.currentTarget.innerHTML);
          }}
          onBlur={() => {
            onBlur?.(editorRef.current?.innerHTML ?? value ?? "");
          }}
          onFocus={() => {
            if (
              editorRef.current &&
              !editorRef.current.innerHTML &&
              value
            ) {
              editorRef.current.innerHTML = value;
            }
          }}
        />
      </div>
      {helperText ? (
        <p
          className="fimba-muted"
          style={{ margin: "0.25rem 0 0", fontSize: "0.72rem" }}
        >
          {helperText}
        </p>
      ) : null}
      <style>{`
        .fimba-detalle-editor:empty:before {
          content: attr(data-placeholder);
          color: #94a3b8;
          pointer-events: none;
        }
        .fimba-detalle-preview b,
        .fimba-detalle-preview strong { font-weight: 700; }
        .fimba-detalle-preview i,
        .fimba-detalle-preview em { font-style: italic; }
        .fimba-detalle-preview u { text-decoration: underline; }
      `}</style>
    </div>
  );
}
