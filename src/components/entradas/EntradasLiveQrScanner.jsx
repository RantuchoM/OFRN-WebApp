import React, { useCallback, useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { IconCamera, IconX } from "../ui/Icons";

const SCAN_MAX_SIDE = 900;

/**
 * Visor de cámara en vivo para leer QRs en recepción.
 * Si no hay permiso o soporte, el padre puede usar onFallbackPhoto (input capture).
 */
export default function EntradasLiveQrScanner({
  open,
  isDark = false,
  onClose,
  onScan,
  onFallbackPhoto,
}) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const [status, setStatus] = useState("starting");
  const [errorMsg, setErrorMsg] = useState("");

  const stopCamera = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const scanLoop = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < video.HAVE_ENOUGH_DATA) {
      rafRef.current = requestAnimationFrame(scanLoop);
      return;
    }

    const vw = video.videoWidth;
    const vh = video.videoHeight;
    if (!vw || !vh) {
      rafRef.current = requestAnimationFrame(scanLoop);
      return;
    }

    const scale = Math.min(1, SCAN_MAX_SIDE / Math.max(vw, vh));
    const dw = Math.max(1, Math.round(vw * scale));
    const dh = Math.max(1, Math.round(vh * scale));
    canvas.width = dw;
    canvas.height = dh;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) {
      rafRef.current = requestAnimationFrame(scanLoop);
      return;
    }

    ctx.drawImage(video, 0, 0, dw, dh);
    const imageData = ctx.getImageData(0, 0, dw, dh);
    const result = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: "attemptBoth",
    });

    if (result?.data?.trim()) {
      stopCamera();
      onScan(result.data.trim());
      return;
    }

    rafRef.current = requestAnimationFrame(scanLoop);
  }, [onScan, stopCamera]);

  useEffect(() => {
    if (!open) {
      stopCamera();
      setStatus("starting");
      setErrorMsg("");
      return undefined;
    }

    let cancelled = false;

    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus("unsupported");
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) return;

        video.srcObject = stream;
        await video.play();
        setStatus("scanning");
        rafRef.current = requestAnimationFrame(scanLoop);
      } catch (err) {
        if (cancelled) return;
        const name = err?.name || "";
        if (name === "NotAllowedError" || name === "PermissionDeniedError") {
          setStatus("denied");
          setErrorMsg("No tenemos permiso para usar la cámara en vivo.");
        } else if (name === "NotFoundError" || name === "DevicesNotFoundError") {
          setStatus("error");
          setErrorMsg("No hay cámara disponible en este dispositivo.");
        } else {
          setStatus("error");
          setErrorMsg("No se pudo abrir la cámara en vivo.");
        }
      }
    })();

    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [open, scanLoop, stopCamera]);

  const handleFallback = () => {
    stopCamera();
    onClose?.();
    onFallbackPhoto?.();
  };

  if (!open) return null;

  const showVideo = status === "starting" || status === "scanning";
  const needsFallback = status === "denied" || status === "error" || status === "unsupported";

  return (
    <div
      className="fixed inset-0 z-[110] flex flex-col bg-black"
      role="dialog"
      aria-modal="true"
      aria-labelledby="entradas-live-qr-titulo"
    >
      <canvas ref={canvasRef} className="hidden" aria-hidden="true" />

      <div className="relative flex min-h-0 flex-1 flex-col">
        {showVideo && (
          <video
            ref={videoRef}
            className="absolute inset-0 h-full w-full object-cover"
            playsInline
            muted
            autoPlay
          />
        )}

        {status === "starting" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80">
            <p className="text-sm font-medium text-white/90">Abriendo cámara…</p>
          </div>
        )}

        {status === "scanning" && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="relative h-[min(62vw,16rem)] w-[min(62vw,16rem)] rounded-2xl border-2 border-white/70 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]">
              <span className="absolute -left-0.5 -top-0.5 h-6 w-6 border-l-4 border-t-4 border-emerald-400 rounded-tl-lg" />
              <span className="absolute -right-0.5 -top-0.5 h-6 w-6 border-r-4 border-t-4 border-emerald-400 rounded-tr-lg" />
              <span className="absolute -bottom-0.5 -left-0.5 h-6 w-6 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg" />
              <span className="absolute -bottom-0.5 -right-0.5 h-6 w-6 border-b-4 border-r-4 border-emerald-400 rounded-br-lg" />
            </div>
          </div>
        )}

        {needsFallback && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-slate-950/95 px-6 text-center">
            <p className={`text-sm font-medium ${isDark ? "text-slate-200" : "text-slate-100"}`}>
              {status === "unsupported"
                ? "Este navegador no permite cámara en vivo."
                : errorMsg}
            </p>
            <p className="text-xs text-slate-400 max-w-xs">
              Podés tomar una foto del QR y el sistema la leerá igual que antes.
            </p>
          </div>
        )}

        <div className="relative z-10 flex items-center justify-between gap-3 px-4 py-3 bg-gradient-to-b from-black/70 to-transparent">
          <h2 id="entradas-live-qr-titulo" className="text-sm font-bold text-white">
            Escanear QR
          </h2>
          <button
            type="button"
            className="rounded-lg p-2 text-white/90 hover:bg-white/10"
            aria-label="Cerrar"
            onClick={() => {
              stopCamera();
              onClose?.();
            }}
          >
            <IconX size={22} />
          </button>
        </div>

        {status === "scanning" && (
          <p className="relative z-10 mt-auto px-4 pb-2 text-center text-xs text-white/80">
            Apuntá al código QR. El ingreso se registra al detectarlo.
          </p>
        )}
      </div>

      <div
        className={`relative z-10 shrink-0 border-t px-4 py-4 ${
          isDark ? "border-slate-700 bg-slate-900" : "border-slate-800 bg-slate-900"
        }`}
      >
        {needsFallback ? (
          <button
            type="button"
            onClick={handleFallback}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-500"
          >
            <IconCamera size={18} />
            Tomar foto del QR
          </button>
        ) : (
          <button
            type="button"
            onClick={handleFallback}
            className="w-full rounded-xl border border-slate-600 px-4 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-800"
          >
            Usar foto en su lugar
          </button>
        )}
      </div>
    </div>
  );
}
