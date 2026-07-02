import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import {
  driveImageDisplayUrl,
  driveImageFallbackSrcList,
  extractGoogleDriveFileId,
  normalizeDriveImageUrlForStorage,
} from "../../utils/entradasDriveImage";
import { FULL_CROP, isFullCrop } from "../../utils/quillImageCrop";
import { IconCheckCircle, IconImage, IconLoader, IconX } from "./Icons";
import RichTextImageCropPicker from "./RichTextImageCropPicker";

function resolveStorageUrl(rawUrl) {
  const trimmed = String(rawUrl || "").trim();
  if (!trimmed) return "";
  if (extractGoogleDriveFileId(trimmed)) return normalizeDriveImageUrlForStorage(trimmed);
  return trimmed;
}

function resolvePreviewCandidates(rawUrl) {
  const trimmed = String(rawUrl || "").trim();
  if (!trimmed) return [];
  const primary = driveImageDisplayUrl(trimmed) || trimmed;
  const fallbacks = driveImageFallbackSrcList(trimmed).filter((u) => u !== primary);
  return [primary, ...fallbacks];
}

export default function RichTextImageUrlModal({
  isOpen,
  onClose,
  onInsert,
  mode = "insert",
  initialUrl = "",
  initialCrop = FULL_CROP,
  initialCropEnabled = false,
  editIndex = null,
}) {
  const [url, setUrl] = useState("");
  const [previewSrc, setPreviewSrc] = useState("");
  const [previewStatus, setPreviewStatus] = useState("idle");
  const [previewMessage, setPreviewMessage] = useState("");
  const [naturalAspect, setNaturalAspect] = useState(1);
  const [crop, setCrop] = useState(FULL_CROP);
  const [cropEnabled, setCropEnabled] = useState(false);
  const probeTokenRef = useRef(0);

  const trimmed = url.trim();
  const isDrive = Boolean(extractGoogleDriveFileId(trimmed));
  const candidates = useMemo(() => resolvePreviewCandidates(trimmed), [trimmed]);
  const isEdit = mode === "edit";

  const resetPreview = useCallback(() => {
    setPreviewSrc("");
    setPreviewStatus("idle");
    setPreviewMessage("");
    setNaturalAspect(1);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setUrl("");
      setCrop(FULL_CROP);
      setCropEnabled(false);
      resetPreview();
      return;
    }

    setUrl(initialUrl || "");
    setCrop(initialCrop || FULL_CROP);
    setCropEnabled(Boolean(initialCropEnabled));
  }, [isOpen, initialUrl, initialCrop, initialCropEnabled, resetPreview]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const token = ++probeTokenRef.current;
    resetPreview();

    if (!trimmed) {
      setPreviewMessage("Pegá la URL pública de la imagen. Google Drive y enlaces directos https son válidos.");
      return undefined;
    }

    if (!/^https?:\/\//i.test(trimmed)) {
      setPreviewStatus("error");
      setPreviewMessage("La URL debe empezar con http:// o https://.");
      return undefined;
    }

    if (candidates.length === 0) {
      setPreviewStatus("error");
      setPreviewMessage("No se pudo interpretar la URL como imagen.");
      return undefined;
    }

    setPreviewStatus("loading");
    setPreviewMessage(
      isDrive
        ? "Comprobando imagen en Google Drive. El archivo debe estar compartido como «Cualquier persona con el enlace»."
        : "Comprobando que la URL apunte a una imagen pública…",
    );

    const tryCandidate = (index) => {
      if (probeTokenRef.current !== token) return;
      const next = candidates[index];
      if (!next) {
        setPreviewStatus("error");
        setPreviewSrc("");
        setPreviewMessage(
          isDrive
            ? "No se pudo cargar la imagen. Verificá que el archivo en Google Drive esté compartido como «Cualquier persona con el enlace» y que sea una imagen (JPG, PNG, WebP, etc.)."
            : "No se pudo cargar la imagen desde esa URL. Comprobá que el enlace sea directo a un archivo de imagen accesible sin login.",
        );
        return;
      }

      const img = new Image();
      img.referrerPolicy = "no-referrer";
      img.onload = () => {
        if (probeTokenRef.current !== token) return;
        const aspect = img.naturalWidth > 0 ? img.naturalWidth / img.naturalHeight : 1;
        setNaturalAspect(aspect);
        setPreviewSrc(next);
        setPreviewStatus("ok");
      };
      img.onerror = () => {
        if (probeTokenRef.current !== token) return;
        tryCandidate(index + 1);
      };
      img.src = next;
    };

    const timer = window.setTimeout(() => tryCandidate(0), 350);
    return () => window.clearTimeout(timer);
  }, [trimmed, candidates, isDrive, isOpen, resetPreview]);

  useEffect(() => {
    if (previewStatus !== "ok") return;
    setPreviewMessage(
      cropEnabled
        ? "Ajustá el recorte. Podés volver a editarlo con doble clic sobre la imagen en el texto."
        : isDrive
          ? "La imagen de Google Drive se ve correctamente. Activá «Recortar» si querés mostrar solo una franja."
          : "La imagen se ve correctamente. Activá «Recortar» si querés mostrar solo una franja.",
    );
  }, [cropEnabled, previewStatus, isDrive]);

  const handleInsert = () => {
    if (previewStatus !== "ok") return;
    const storageUrl = resolveStorageUrl(trimmed);
    const displayUrl = driveImageDisplayUrl(storageUrl) || previewSrc || storageUrl;
    const useCrop = cropEnabled && !isFullCrop(crop);

    onClose?.();
    window.requestAnimationFrame(() => {
      onInsert?.({
        storageUrl,
        displayUrl,
        crop: useCrop ? crop : null,
        naturalAspect,
        cropEnabled: useCrop,
        editIndex: isEdit ? editIndex : null,
      });
    });
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200 p-3 sm:p-4">
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[min(90vh,44rem)] overflow-y-auto p-5 sm:p-6 border border-slate-100"
        role="dialog"
        aria-modal="true"
        aria-labelledby="richtext-image-modal-title"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="p-2.5 bg-indigo-100 text-indigo-600 rounded-full shrink-0">
              <IconImage size={22} />
            </div>
            <div className="min-w-0">
              <h3 id="richtext-image-modal-title" className="text-base sm:text-lg font-bold text-slate-800">
                {isEdit ? "Editar imagen" : "Insertar imagen por URL"}
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Solo enlaces públicos. Para Google Drive, usá «Compartir → Cualquier persona con el enlace».
                {isEdit ? " Hacé doble clic en una imagen del texto para volver a abrir este panel." : null}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors shrink-0"
            aria-label="Cerrar"
          >
            <IconX size={20} />
          </button>
        </div>

        <label className="block mt-5 text-xs font-bold uppercase tracking-wide text-slate-500" htmlFor="richtext-image-url">
          URL de la imagen
        </label>
        <input
          id="richtext-image-url"
          type="url"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="https://drive.google.com/file/d/…/view"
          className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          autoFocus
        />

        <div
          className={`mt-4 rounded-lg border px-3 py-2.5 text-sm leading-relaxed ${
            previewStatus === "ok"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : previewStatus === "error"
                ? "border-red-200 bg-red-50 text-red-800"
                : previewStatus === "loading"
                  ? "border-indigo-200 bg-indigo-50 text-indigo-800"
                  : "border-slate-200 bg-slate-50 text-slate-600"
          }`}
        >
          <div className="flex items-start gap-2">
            {previewStatus === "loading" ? (
              <span className="mt-0.5 shrink-0 animate-spin text-indigo-600">
                <IconLoader size={16} />
              </span>
            ) : null}
            {previewStatus === "ok" ? (
              <span className="mt-0.5 shrink-0 text-emerald-600">
                <IconCheckCircle size={16} />
              </span>
            ) : null}
            <p>{previewMessage}</p>
          </div>
        </div>

        {previewStatus === "ok" && previewSrc ? (
          <>
            {!cropEnabled ? (
              <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 min-h-[8rem] flex items-center justify-center overflow-hidden p-3">
                <img
                  src={previewSrc}
                  alt="Vista previa"
                  className="max-h-56 w-full object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
            ) : null}

            <RichTextImageCropPicker
              src={previewSrc}
              crop={crop}
              onCropChange={setCrop}
              cropEnabled={cropEnabled}
              onCropEnabledChange={setCropEnabled}
            />
          </>
        ) : (
          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 min-h-[10rem] flex items-center justify-center overflow-hidden p-3">
            <div className="text-center text-slate-400 px-4">
              <IconImage size={32} className="mx-auto opacity-40" />
              <p className="text-xs mt-2">La vista previa aparecerá cuando la URL sea válida y la imagen cargue.</p>
            </div>
          </div>
        )}

        <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleInsert}
            disabled={previewStatus !== "ok"}
            className="w-full sm:w-auto px-4 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg shadow-md transition-all active:scale-[0.98]"
          >
            {isEdit ? "Guardar imagen" : "Insertar imagen"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
