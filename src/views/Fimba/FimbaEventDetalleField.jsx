import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import EventDescripcionImagesButton from "../../components/agenda/EventDescripcionImagesButton";
import {
  IconBold,
  IconItalic,
  IconUnderline,
} from "../../components/ui/Icons";
import {
  extractEventDescripcionImageSrcs,
  sanitizeEventDescripcionHtml,
} from "../../utils/eventDescripcionHtml";
import {
  hasHtmlMarkup,
  stripHtml,
} from "../../utils/eventDisplayUtils";

/** True si el HTML de detalle no tiene texto visible ni imágenes allowlisted. */
export function isFimbaDetalleEmpty(html) {
  if (extractEventDescripcionImageSrcs(html).length > 0) return false;
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
 * texto está truncado (`scrollHeight`/`scrollWidth` > client*) — desktop hover.
 * En móvil (coarse pointer / &lt; md): tap en texto truncado → expand/collapse;
 * no abre edición (stopPropagation). Chip imágenes → modal galería.
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
  const [expanded, setExpanded] = useState(false);
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
  const imageSrcs = useMemo(
    () => extractEventDescripcionImageSrcs(raw),
    [raw],
  );
  const plain = stripHtml(raw);
  const isHtml = hasHtmlMarkup(raw);
  // Lista/tooltip: sin <img> (galería aparte); allowlist https/data/blob.
  const safeHtml = isHtml
    ? sanitizeEventDescripcionHtml(raw, { keepImages: false })
    : null;
  const hasText = Boolean(plain);
  const hasImages = imageSrcs.length > 0;

  useEffect(() => {
    setExpanded(false);
  }, [raw]);

  const showTooltip = () => {
    if (!clamp || expanded || !truncated || !hasText || !triggerRef.current) {
      return;
    }
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
    if (!clamp || !hasText || expanded) {
      if (!clamp || !hasText) setTruncated(false);
      else if (expanded) setTruncated(true);
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
  }, [clamp, hasText, raw, expanded]);

  // Si deja de estar truncado, cerrar tooltip abierto.
  useEffect(() => {
    if (!truncated || expanded) hideTooltip();
  }, [truncated, expanded, hideTooltip]);

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

  if (!hasText && !hasImages) {
    return (
      <span className={className} style={style}>
        {empty}
      </span>
    );
  }

  const isClamped = clamp && !expanded;
  const canExpand = clamp && hasText && (truncated || expanded);
  const previewClass = [
    isHtml ? "fimba-detalle-preview" : null,
    isClamped ? "fimba-detalle-preview--clamp" : null,
    expanded ? "fimba-detalle-preview--expanded" : null,
    canExpand ? "fimba-detalle-preview--expandable" : null,
    className || null,
  ]
    .filter(Boolean)
    .join(" ");

  const tooltipInteractive = clamp && !expanded && truncated && hasText;

  const stopRowActivate = (e) => {
    e.stopPropagation();
  };

  const toggleExpand = (e) => {
    if (!canExpand) return;
    e.preventDefault();
    e.stopPropagation();
    hideTooltip();
    setExpanded((v) => !v);
  };

  const previewProps = {
    ref: triggerRef,
    className: previewClass || undefined,
    style: hasText ? style : undefined,
    onClick: canExpand ? toggleExpand : stopRowActivate,
    ...(tooltipInteractive
      ? {
          onMouseEnter: showTooltip,
          onMouseLeave: hideTooltip,
          onFocus: showTooltip,
          onBlur: hideTooltip,
          tabIndex: 0,
          "aria-label": plain,
        }
      : canExpand
        ? {
            role: "button",
            tabIndex: 0,
            "aria-expanded": expanded,
            "aria-label": expanded
              ? "Contraer detalle"
              : "Expandir detalle completo",
            onKeyDown: (e) => {
              if (e.key === "Enter" || e.key === " ") toggleExpand(e);
            },
          }
        : {}),
  };

  const previewNode = hasText ? (
    isHtml ? (
      <span
        {...previewProps}
        dangerouslySetInnerHTML={{ __html: safeHtml }}
      />
    ) : (
      <span {...previewProps}>{raw}</span>
    )
  ) : null;

  const imagesBtn = hasImages ? (
    <EventDescripcionImagesButton srcs={imageSrcs} />
  ) : null;

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
      <span
        className="fimba-detalle-preview-row"
        style={!hasText && hasImages ? style : undefined}
        onClick={stopRowActivate}
        onDoubleClick={stopRowActivate}
      >
        {previewNode}
        {imagesBtn}
      </span>
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
