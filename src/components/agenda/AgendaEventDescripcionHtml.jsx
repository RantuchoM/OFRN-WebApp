import React, { useEffect, useMemo, useRef, useState } from "react";
import EventDescripcionImagesButton from "./EventDescripcionImagesButton";
import { highlightHtmlSearch } from "../../utils/agendaHelpers";
import {
  extractEventDescripcionImageSrcs,
  stripHtmlImageTags,
} from "../../utils/eventDescripcionHtml";

/**
 * Descripción de evento en lista OFRN Agenda: HTML sin &lt;img&gt; inline +
 * chip conteo → modal si hay imágenes (Quill / pegado).
 * En viewport móvil (&lt; md) el texto se clampa ~3 líneas; tap expande/colapsa
 * (no abre edición). Chip de imágenes sigue abriendo la galería.
 */
export default function AgendaEventDescripcionHtml({
  html,
  query = "",
  className = "",
  htmlClassName = "",
}) {
  const raw = html == null ? "" : String(html);
  const textRef = useRef(null);
  const [expanded, setExpanded] = useState(false);
  const [truncated, setTruncated] = useState(false);

  const imageSrcs = useMemo(
    () => extractEventDescripcionImageSrcs(raw),
    [raw],
  );
  const displayHtml = useMemo(() => {
    if (!raw) return "";
    return highlightHtmlSearch(stripHtmlImageTags(raw), query);
  }, [raw, query]);

  useEffect(() => {
    setExpanded(false);
  }, [raw]);

  useEffect(() => {
    if (expanded) {
      setTruncated(true);
      return undefined;
    }
    const el = textRef.current;
    if (!el) {
      setTruncated(false);
      return undefined;
    }
    const measure = () => {
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
  }, [raw, displayHtml, expanded]);

  if (!raw) return null;

  const hasDisplayMarkup = Boolean(
    String(displayHtml)
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .trim(),
  );

  const canToggle = truncated || expanded;

  const toggleExpand = (e) => {
    if (!canToggle) return;
    e.preventDefault();
    e.stopPropagation();
    setExpanded((v) => !v);
  };

  return (
    <span
      className={
        className ||
        "inline-flex items-start gap-1.5 w-full min-w-0 max-w-full align-top"
      }
      onClick={(e) => {
        // Evita que un click en la descripción abra edición en filas padre.
        e.stopPropagation();
      }}
    >
      {hasDisplayMarkup ? (
        <span
          ref={textRef}
          role={canToggle ? "button" : undefined}
          tabIndex={canToggle ? 0 : undefined}
          aria-expanded={canToggle ? expanded : undefined}
          title={
            canToggle
              ? expanded
                ? "Tocá para contraer"
                : "Tocá para ver el texto completo"
              : undefined
          }
          className={[
            htmlClassName || undefined,
            "min-w-0 flex-1",
            expanded ? null : "line-clamp-3 md:line-clamp-none",
            canToggle ? "cursor-pointer" : null,
          ]
            .filter(Boolean)
            .join(" ")}
          dangerouslySetInnerHTML={{ __html: displayHtml }}
          onClick={toggleExpand}
          onKeyDown={
            canToggle
              ? (e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    toggleExpand(e);
                  }
                }
              : undefined
          }
        />
      ) : null}
      <EventDescripcionImagesButton srcs={imageSrcs} />
    </span>
  );
}
