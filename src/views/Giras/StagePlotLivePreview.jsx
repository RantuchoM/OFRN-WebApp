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
}) {
  const imgRef = useRef(null);
  const genRef = useRef(0);
  const hasImageRef = useRef(false);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!payload) return undefined;
    let cancelled = false;
    const gen = ++genRef.current;

    const timer = window.setTimeout(() => {
      (async () => {
        // Solo spinner a pantalla completa en el primer render.
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
  }, [payload, maxStagePx]);

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
        <div className="absolute inset-0 flex items-center justify-center bg-slate-100/70">
          <IconLoader className="animate-spin text-indigo-500" size={28} />
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
