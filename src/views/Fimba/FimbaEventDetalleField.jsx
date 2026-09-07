import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  IconBold,
  IconItalic,
  IconUnderline,
} from "../../components/ui/Icons";
import {
  hasHtmlMarkup,
  stripHtml,
} from "../../utils/eventDisplayUtils";
import { sanitizeFimbaRiderHtml } from "../../utils/fimbaRider";

/** True si el HTML de detalle no tiene texto visible (p. ej. `<br>`, `<div><br></div>`). */
export function isFimbaDetalleEmpty(html) {
  return !stripHtml(html);
}

function detalleTooltipPosition(rect) {
  const estH = 220;
  const preferBelow = rect.bottom + 8;
  const placeAbove =
    preferBelow + estH > window.innerHeight && rect.top > estH;
  const left = Math.min(
    Math.max(rect.left + rect.width / 2, 12),
    window.innerWidth - 12,
  );
  return {
    top: placeAbove ? Math.max(8, rect.top - 8) : preferBelow,
    left,
    placeAbove,
  };
}

/** Solo un tooltip Detalle abierto a la vez (módulo). */
let activeDetalleTooltipHide = null;

/**
 * Vista lectura de `eventos.descripcion` (parte actividad / Detalle FIMBA).
 * Misma columna OFRN que EventForm / EventQuickView.
 * `clamp` = max-height en planilla; tooltip portal (HTML sanitizado) solo si el
 * texto está truncado (`scrollHeight`/`scrollWidth` > client*).
 * Al scroll (capture) / Escape / blur / mouseleave se cierra — no se reposiciona
 * (evita tooltips stuck al scroll de `.fimba-agenda-scroll` sin mouseleave).
 */
export function FimbaEventDetallePreview({
  html,
  empty = "—",
  className = "",
  style,
  clamp = false,
}) {
  const triggerRef = useRef(null);
  const [tooltip, setTooltip] = useState(null);
  const [truncated, setTruncated] = useState(false);
  // Identidad estable para el registro global (un solo tooltip abierto).
  const hideRef = useRef(null);
  if (!hideRef.current) {
    hideRef.current = () => {
      setTooltip(null);
      if (activeDetalleTooltipHide === hideRef.current) {
        activeDetalleTooltipHide = null;
      }
    };
  }
  const hideTooltip = hideRef.current;

  const raw = html == null ? "" : String(html);
  const plain = stripHtml(raw);
  const isHtml = hasHtmlMarkup(raw);
  const safeHtml = isHtml ? sanitizeFimbaRiderHtml(raw) : null;

  const showTooltip = () => {
    if (!clamp || !truncated || !plain || !triggerRef.current) return;
    if (activeDetalleTooltipHide && activeDetalleTooltipHide !== hideTooltip) {
      activeDetalleTooltipHide();
    }
    activeDetalleTooltipHide = hideTooltip;
    setTooltip(
      detalleTooltipPosition(triggerRef.current.getBoundingClientRect()),
    );
  };

  // Medir overflow real del clamp (resize / cambio de contenido).
  useEffect(() => {
    if (!clamp || !plain) {
      setTruncated(false);
      return undefined;
    }
    const el = triggerRef.current;
    if (!el) {
      setTruncated(false);
      return undefined;
    }
    const measure = () => {
      // 1px de holgura por subpíxeles / zoom.
      const next =
        el.scrollHeight > el.clientHeight + 1 ||
        el.scrollWidth > el.clientWidth + 1;
      setTruncated((prev) => (prev === next ? prev : next));
    };
    measure();
    const raf = requestAnimationFrame(measure);
    const ro =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(measure)
        : null;
    ro?.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(raf);
      ro?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [clamp, plain, raw]);

  // Si deja de estar truncado, cerrar tooltip abierto.
  useEffect(() => {
    if (!truncated) hideTooltip();
  }, [truncated, hideTooltip]);

  // Cerrar al scroll anidado (agenda) / window, resize y Escape.
  useEffect(() => {
    if (!tooltip) return undefined;
    const close = hideTooltip;
    const onKeyDown = (e) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [tooltip, hideTooltip]);

  // Liberar slot global si el trigger se desmonta con tooltip abierto.
  useEffect(
    () => () => {
      if (activeDetalleTooltipHide === hideRef.current) {
        activeDetalleTooltipHide = null;
      }
    },
    [],
  );

  if (!plain) {
    return (
      <span className={className} style={style}>
        {empty}
      </span>
    );
  }

  const previewClass = [
    isHtml ? "fimba-detalle-preview" : null,
    clamp ? "fimba-detalle-preview--clamp" : null,
    className || null,
  ]
    .filter(Boolean)
    .join(" ");

  const tooltipInteractive = clamp && truncated;
  const previewProps = {
    ref: triggerRef,
    className: previewClass || undefined,
    style,
    ...(tooltipInteractive
      ? {
          onMouseEnter: showTooltip,
          onMouseLeave: hideTooltip,
          onFocus: showTooltip,
          onBlur: hideTooltip,
          tabIndex: 0,
          "aria-label": plain,
        }
      : {}),
  };

  const previewNode = isHtml ? (
    <span
      {...previewProps}
      dangerouslySetInnerHTML={{ __html: safeHtml }}
    />
  ) : (
    <span {...previewProps}>{raw}</span>
  );

  const tooltipNode =
    clamp && tooltip && typeof document !== "undefined"
      ? createPortal(
          <div
            className={`fimba-detalle-tooltip${
              tooltip.placeAbove ? " fimba-detalle-tooltip--above" : ""
            }`}
            style={{
              top: tooltip.top,
              left: tooltip.left,
              transform: tooltip.placeAbove
                ? "translate(-50%, -100%)"
                : "translate(-50%, 0)",
            }}
            role="tooltip"
          >
            {isHtml ? (
              <div
                className="fimba-detalle-tooltip-body fimba-detalle-preview"
                dangerouslySetInnerHTML={{ __html: safeHtml }}
              />
            ) : (
              <div className="fimba-detalle-tooltip-body fimba-detalle-tooltip-body--plain">
                {raw}
              </div>
            )}
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      {previewNode}
      {tooltipNode}
    </>
  );
}

/**
 * Editor rich-text Detalle (contentEditable + B/I/U), mismo patrón que
 * `EventForm` → `eventos.descripcion`. Skin FIMBA.
 * Preferir `FimbaRichTextEditor` (Quill) en Agenda row-edit / modal cuando se quiera
 * listas/links; este editor queda para celdas legacy compactas.
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
      `}</style>
    </div>
  );
}
