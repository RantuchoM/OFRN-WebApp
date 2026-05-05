import React, { useState, useEffect } from "react";
import {
  IconScissor,
  IconTrash,
  IconUpload,
  IconLoader,
  IconClipboard,
  IconEye,
} from "../../components/ui/Icons";
import { useMusicianFormContext } from "./MusicianFormContext";
import { parseSupabasePublicStorageUrl } from "../../utils/supabaseStorage";

/**
 * Uploader con drag & drop para documentos del músico (DNI, CUIL, CBU, firma, etc.).
 * Usa MusicianFormContext para fieldStatuses, uploadToSupabase, deleteOldFile, handleStartCrop, updateField, handleClipboardClick.
 */
export default function MusicianFileUploader({ label, field, value }) {
  const {
    fieldStatuses,
    uploadToSupabase,
    deleteOldFile,
    handleStartCrop,
    updateField,
    handleClipboardClick,
    loading,
    uploadingField,
    supabase,
  } = useMusicianFormContext();

  const [isDragging, setIsDragging] = useState(false);
  const [previewSrc, setPreviewSrc] = useState(null);
  const status = fieldStatuses[field];
  const cleanValue = value ? String(value).split("#")[0] : "";
  const isPdf = value && /\.pdf(\?|$)/i.test(cleanValue);
  const bucket = field === "firma" ? "firmas" : "musician-docs";

  useEffect(() => {
    let cancelled = false;
    if (!value) {
      setPreviewSrc(null);
      return;
    }
    setPreviewSrc(value);
    if (!supabase) return;
    const parsed = parseSupabasePublicStorageUrl(value);
    if (!parsed) return;
    const pathOnly = parsed.path.split("?")[0];
    (async () => {
      const { data, error } = await supabase.storage
        .from(parsed.bucket)
        .createSignedUrl(pathOnly, 60 * 60);
      if (!cancelled && data?.signedUrl && !error) setPreviewSrc(data.signedUrl);
    })();
    return () => {
      cancelled = true;
    };
  }, [value, supabase]);

  const displaySrc = previewSrc || value;

  const openFileInNewTab = async () => {
    if (!value) return;

    const newTab = window.open("about:blank", "_blank");
    if (!newTab) return;
    newTab.opener = null;

    const cleanUrl = String(value).split("#")[0];
    const parsed = parseSupabasePublicStorageUrl(cleanUrl);

    if (!parsed || !supabase) {
      newTab.location.href = value;
      return;
    }

    try {
      const { data, error } = await supabase.storage
        .from(parsed.bucket)
        .createSignedUrl(parsed.path.split("?")[0], 60 * 10);

      if (error || !data?.signedUrl) {
        newTab.location.href = value;
        return;
      }

      newTab.location.href = data.signedUrl;
    } catch {
      newTab.location.href = value;
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setIsDragging(true);
    else if (e.type === "dragleave") setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      uploadToSupabase(e.dataTransfer.files[0], field, value);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <label className="text-[9px] font-black uppercase text-slate-400 ml-1 tracking-tighter">
        {label}
      </label>
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        className={`relative h-40 rounded-3xl border-2 transition-all overflow-hidden group ${isDragging ? "border-indigo-500 bg-indigo-50/50 scale-[1.02] shadow-lg" : ""} ${status === "saving" ? "border-orange-400 ring-4 ring-orange-50" : status === "saved" ? "border-emerald-400 ring-4 ring-emerald-50" : value ? "border-emerald-100 bg-white" : "border-dashed border-slate-200 bg-slate-50 hover:border-indigo-300"}`}
      >
        {value ? (
          <>
            {isPdf ? (
              <div className="w-full h-full bg-slate-100 overflow-hidden relative min-h-[120px]">
                <object
                  data={`${displaySrc}#toolbar=0&navpanes=0`}
                  type="application/pdf"
                  className="w-full h-full pointer-events-none absolute inset-0"
                  aria-label={label}
                >
                  <div className="flex items-center justify-center h-full text-[10px] text-slate-500 p-2 text-center">
                    Vista PDF limitada en este navegador. Usa el botón ver para abrir el archivo.
                  </div>
                </object>
                <div className="absolute top-2 left-2 bg-emerald-500 text-white text-[8px] px-1.5 py-0.5 rounded font-bold shadow-sm z-10">
                  PDF
                </div>
              </div>
            ) : (
              <img
                src={displaySrc || value}
                className="w-full h-full object-contain p-2"
                alt={label}
              />
            )}
            <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-3 z-20">
              <button
                type="button"
                onClick={() => handleStartCrop(field, value)}
                className="p-3 bg-white rounded-xl text-orange-500 shadow-xl hover:scale-110"
                title="Recortar"
              >
                <IconScissor size={20} />
              </button>
              <button
                type="button"
                onClick={openFileInNewTab}
                className="p-3 bg-white rounded-xl text-indigo-600 shadow-xl hover:scale-110"
              >
                <IconEye size={20} />
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (confirm("¿Eliminar?")) {
                    await deleteOldFile(value, bucket);
                    updateField(field, "");
                  }
                }}
                className="p-3 bg-white rounded-xl text-red-500 shadow-xl hover:scale-110"
              >
                <IconTrash size={20} />
              </button>
            </div>
          </>
        ) : (
          <div className="w-full h-full flex flex-col p-4 justify-center">
            <div className="flex-1 flex flex-col items-center justify-center text-slate-300 mb-2 pointer-events-none">
              {uploadingField === field || loading ? (
                <IconLoader className="animate-spin" size={24} />
              ) : (
                <IconUpload
                  size={24}
                  className={
                    isDragging ? "text-indigo-500 animate-bounce" : ""
                  }
                />
              )}
              {isDragging && (
                <span className="text-[8px] font-black mt-2 text-indigo-500 uppercase">
                  Soltar Aquí
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => handleClipboardClick(field, value)}
                className="bg-indigo-600 text-white py-2 rounded-xl text-[8px] font-black tracking-widest hover:bg-indigo-700 active:scale-95"
              >
                <IconClipboard size={12} className="inline mr-1" /> PEGAR
              </button>
              <label className="bg-white border border-slate-200 text-slate-500 py-2 rounded-xl text-[8px] font-black text-center cursor-pointer uppercase hover:bg-slate-50 active:scale-95">
                Subir{" "}
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) =>
                    uploadToSupabase(e.target.files[0], field, value)
                  }
                />
              </label>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
