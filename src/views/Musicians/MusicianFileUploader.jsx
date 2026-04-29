import React, { useState } from "react";
import {
  IconScissor,
  IconTrash,
  IconUpload,
  IconLoader,
  IconClipboard,
  IconEye,
} from "../../components/ui/Icons";
import { useMusicianFormContext } from "./MusicianFormContext";

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
  const status = fieldStatuses[field];
  const isPdf = value && value.toLowerCase().includes(".pdf");
  const bucket = field === "firma" ? "firmas" : "musician-docs";

  const openFileInNewTab = async () => {
    if (!value) return;

    const newTab = window.open("about:blank", "_blank");
    if (!newTab) return;
    newTab.opener = null;

    const cleanUrl = String(value).split("#")[0];
    const publicMarker = "/storage/v1/object/public/";
    const markerIndex = cleanUrl.indexOf(publicMarker);

    if (markerIndex === -1 || !supabase) {
      newTab.location.href = value;
      return;
    }

    try {
      const storagePath = decodeURIComponent(
        cleanUrl.slice(markerIndex + publicMarker.length),
      );
      const firstSlash = storagePath.indexOf("/");
      if (firstSlash === -1) {
        newTab.location.href = value;
        return;
      }

      const urlBucket = storagePath.slice(0, firstSlash);
      const objectPath = storagePath.slice(firstSlash + 1);

      const { data, error } = await supabase.storage
        .from(urlBucket)
        .createSignedUrl(objectPath, 60 * 10);

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
              <div className="w-full h-full bg-slate-100 overflow-hidden relative">
                <iframe
                  src={`${value}#toolbar=0&navpanes=0&scrollbar=0`}
                  className="w-full h-full pointer-events-none"
                  frameBorder="0"
                />
                <div className="absolute top-2 left-2 bg-emerald-500 text-white text-[8px] px-1.5 py-0.5 rounded font-bold shadow-sm z-10">
                  PDF
                </div>
              </div>
            ) : (
              <img
                src={value}
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
