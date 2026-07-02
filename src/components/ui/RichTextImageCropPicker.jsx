import React, { useCallback, useEffect, useRef, useState } from "react";

import {
  CROP_STRIP_PRESETS,
  clampCrop,
  isFullCrop,
} from "../../utils/quillImageCrop";

function pointerToCrop(clientX, clientY, rect) {
  const x = (clientX - rect.left) / rect.width;
  const y = (clientY - rect.top) / rect.height;
  return {
    x: Math.max(0, Math.min(1, x)),
    y: Math.max(0, Math.min(1, y)),
  };
}

export default function RichTextImageCropPicker({
  src,
  crop,
  onCropChange,
  cropEnabled,
  onCropEnabledChange,
}) {
  const frameRef = useRef(null);
  const dragRef = useRef(null);
  const onPointerMoveRef = useRef(null);
  const finishDragRef = useRef(null);

  const [frameSize, setFrameSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = frameRef.current;
    if (!el) return undefined;

    const update = () => {
      const rect = el.getBoundingClientRect();
      setFrameSize({ w: rect.width, h: rect.height });
    };
    update();

    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : null;
    ro?.observe(el);
    window.addEventListener("resize", update);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [src]);

  onPointerMoveRef.current = (event) => {
    const drag = dragRef.current;
    const frame = frameRef.current;
    if (!drag || !frame) return;

    const rect = frame.getBoundingClientRect();
    const point = pointerToCrop(event.clientX, event.clientY, rect);
    const current = clampCrop(crop);

    if (drag.mode === "move") {
      onCropChange(
        clampCrop({
          x: point.x - drag.offsetX,
          y: point.y - drag.offsetY,
          w: current.w,
          h: current.h,
        }),
      );
      return;
    }

    if (drag.mode === "resize") {
      onCropChange(
        clampCrop({
          x: current.x,
          y: current.y,
          w: Math.max(0.05, point.x - current.x),
          h: Math.max(0.05, point.y - current.y),
        }),
      );
    }
  };

  finishDragRef.current = () => {
    dragRef.current = null;
    window.removeEventListener("pointermove", onPointerMoveRef.current);
    window.removeEventListener("pointerup", finishDragRef.current);
  };

  const startDrag = useCallback(
    (event, mode) => {
      if (!cropEnabled) return;
      event.preventDefault();
      event.stopPropagation();

      const frame = frameRef.current;
      if (!frame) return;
      const rect = frame.getBoundingClientRect();
      const point = pointerToCrop(event.clientX, event.clientY, rect);
      const current = clampCrop(crop);

      dragRef.current = {
        mode,
        offsetX: point.x - current.x,
        offsetY: point.y - current.y,
      };

      window.addEventListener("pointermove", onPointerMoveRef.current);
      window.addEventListener("pointerup", finishDragRef.current);
    },
    [crop, cropEnabled, onCropChange],
  );

  useEffect(
    () => () => {
      finishDragRef.current?.();
    },
    [],
  );

  const current = clampCrop(crop);
  const boxStyle =
    frameSize.w > 0
      ? {
          left: `${current.x * 100}%`,
          top: `${current.y * 100}%`,
          width: `${current.w * 100}%`,
          height: `${current.h * 100}%`,
          boxShadow: "0 0 0 9999px rgba(15, 23, 42, 0.45)",
        }
      : null;

  return (
    <div className="mt-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer">
          <input
            type="checkbox"
            checked={cropEnabled}
            onChange={(event) => onCropEnabledChange(event.target.checked)}
            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
          />
          Recortar imagen (mostrar solo una franja)
        </label>
        {cropEnabled && !isFullCrop(current) ? (
          <span className="text-xs text-slate-500">
            Arrastrá el recuadro o la esquina inferior derecha
          </span>
        ) : null}
      </div>

      {cropEnabled ? (
        <div className="flex flex-wrap gap-2">
          {CROP_STRIP_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => onCropChange({ ...preset.crop })}
              className="px-2.5 py-1 text-xs font-semibold rounded-full border border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:text-indigo-700 transition-colors"
            >
              {preset.label}
            </button>
          ))}
        </div>
      ) : null}

      <div
        ref={frameRef}
        className={`relative rounded-lg border border-slate-200 bg-slate-100 overflow-hidden select-none ${
          cropEnabled ? "touch-none" : ""
        }`}
        style={{ minHeight: "10rem", maxHeight: "18rem" }}
      >
        {src ? (
          <img
            src={src}
            alt="Recorte"
            className="block w-full h-auto max-h-72 object-contain pointer-events-none"
            referrerPolicy="no-referrer"
            draggable={false}
          />
        ) : null}

        {cropEnabled && boxStyle ? (
          <div
            className="absolute border-2 border-white cursor-move z-10"
            style={boxStyle}
            onPointerDown={(event) => startDrag(event, "move")}
          >
            <div
              className="absolute right-0 bottom-0 w-4 h-4 translate-x-1/2 translate-y-1/2 rounded-sm bg-white border-2 border-indigo-600 cursor-se-resize z-20"
              onPointerDown={(event) => startDrag(event, "resize")}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
