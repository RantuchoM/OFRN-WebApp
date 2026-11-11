import React, { useEffect, useRef, useState } from "react";
import { IconLoader } from "../../components/ui/Icons";
import { renderStagePlotToCanvas } from "../../utils/stagePlotPdf";

/** Debounce corto para que los deslizantes de opacidad se sientan en vivo. */
const PREVIEW_DEBOUNCE_MS = 50;

/**
 * Preview raster del escenario (mismas guías/opacidades que PDF/JPG).
 * Solo lectura: no monta Konva ni el editor.
 */
export default function StagePlotLivePreview({
  payload,
  /** Tope de px del lado largo del lienzo interno (preview; export usa 1600). */
  maxStagePx = 960,
  className = "",
  /** Altura mínima del contenedor (desktop más alto). */
  minHeightClass = "min-h-[220px]",
  /**
   * Cambio de lienzo / planta: fuerza spinner (p. ej. `activeId`).
   * Ajustes de opacidad no deben cambiar esta key.
   */
  contentKey = null,
}) {
  const imgRef = useRef(null);
  const genRef = useRef(0);
  const hasImageRef = useRef(false);
  const contentKeyRef = useRef(contentKey);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!payload) return undefined;
    let cancelled = false;
    const gen = ++genRef.current;
    const switchedLienzo = contentKeyRef.current !== contentKey;
    if (switchedLienzo) {
      contentKeyRef.current = contentKey;
      hasImageRef.current = false;
      setReady(false);
      setBusy(true);
    }

    const timer = window.setTimeout(() => {
      (async () => {
        // Spinner completo en primer render o al cambiar de lienzo.
        if (!hasImageRef.current) setBusy(true);
        setError(null);
        try {
          const canvas = await renderStagePlotToCanvas(payload, {
            maxStagePx,
            maxScale: 2,
            includeChrome: false,
          });
          if (cancelled || gen !== genRef.current) return;
          const dataUrl = canvas.toDataURL("image/png");
          if (imgRef.current) {
            imgRef.current.src = dataUrl;
          }
          hasImageRef.current = true;
          setReady(true);
        } catch (err) {
          if (cancelled || gen !== genRef.current) return;
          console.error(err);
          setError(err?.message || "No se pudo renderizar el escenario");
        } finally {
          if (!cancelled && gen === genRef.current) setBusy(false);
        }
      })();
    }, PREVIEW_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [payload, maxStagePx, contentKey]);

  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-100 ${minHeightClass} ${className}`}
      aria-label="Vista previa del escenario"
    >
      <img
        ref={imgRef}
        alt="Vista previa del plano de escenario"
        className={`max-h-full max-w-full object-contain transition-opacity duration-150 ${
          ready ? "opacity-100" : "opacity-0"
        }`}
        draggable={false}
      />
      {busy && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-100/80"
          role="status"
          aria-live="polite"
          aria-label="Cargando escenario"
        >
          <IconLoader className="animate-spin text-indigo-500" size={28} />
          <span className="text-[11px] font-medium text-slate-500">
            Cargando escenario…
          </span>
        </div>
      )}
      {error && !busy && (
        <p className="absolute inset-x-3 bottom-3 rounded bg-white/90 px-2 py-1.5 text-center text-[11px] text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
