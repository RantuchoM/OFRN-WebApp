import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { IconDrive, IconLoader, IconPlus, IconX } from "../ui/Icons";
import SearchableSelect from "../ui/SearchableSelect";

function stripHtml(html) {
  return (html || "").replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      const base64 = result.includes(",") ? result.split(",")[1] : result;
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error || new Error("No se pudo leer el archivo"));
    reader.readAsDataURL(file);
  });
}

/**
 * mode: "entregar" (ticket pendiente) | "carga_propia" (elige obra + entrega)
 */
export default function ArregloAjusteEntregarModal({
  isOpen,
  onClose,
  mode = "entregar",
  ajuste = null,
  obra = null,
  obrasOptions = [],
  saving,
  onSubmit,
}) {
  const [obraId, setObraId] = useState(obra?.id || null);
  const [folderLinksText, setFolderLinksText] = useState("");
  const [fileLinksText, setFileLinksText] = useState("");
  const [files, setFiles] = useState([]);
  const [observacion, setObservacion] = useState("");
  const [localError, setLocalError] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setObraId(obra?.id || ajuste?.id_obra || null);
    setFolderLinksText("");
    setFileLinksText("");
    setFiles([]);
    setObservacion(ajuste?.brief || "");
    setLocalError("");
  }, [isOpen, obra?.id, ajuste?.id, ajuste?.id_obra, ajuste?.brief]);

  if (!isOpen) return null;

  const titulo =
    stripHtml(obra?.titulo || ajuste?.obra_titulo || "") ||
    (obra?.id || ajuste?.id_obra ? `Obra #${obra?.id || ajuste?.id_obra}` : "Ajuste");

  const parseLinks = (text) =>
    String(text || "")
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean);

  const handleFilesChange = (e) => {
    const list = Array.from(e.target.files || []);
    setFiles((prev) => [...prev, ...list]);
    e.target.value = "";
  };

  const removeFile = (idx) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    setLocalError("");
    const link_carpetas = parseLinks(folderLinksText);
    const link_archivos = parseLinks(fileLinksText);
    if (link_carpetas.length === 0 && link_archivos.length === 0 && files.length === 0) {
      setLocalError("Agregá al menos una carpeta, un link de PDF o un archivo.");
      return;
    }
    const targetObraId = mode === "carga_propia" ? obraId : obra?.id || ajuste?.id_obra;
    if (!targetObraId) {
      setLocalError("Seleccioná la obra madre.");
      return;
    }

    let archivos = [];
    try {
      archivos = await Promise.all(
        files.map(async (f) => ({
          name: f.name,
          mimeType: f.type || "application/pdf",
          base64: await fileToBase64(f),
        })),
      );
    } catch (err) {
      setLocalError(err?.message || "Error leyendo PDFs");
      return;
    }

    onSubmit?.({
      id_ajuste: ajuste?.id || null,
      id_obra: targetObraId,
      link_carpetas,
      link_archivos,
      archivos,
      observacion: observacion.trim(),
      origen: mode === "carga_propia" ? "carga_propia" : undefined,
    });
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-3">
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl shadow-2xl w-full max-w-lg border border-slate-200 flex flex-col max-h-[92vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ajuste-entregar-title"
      >
        <div className="flex items-start justify-between gap-2 px-4 py-3 border-b border-slate-200 shrink-0">
          <div className="min-w-0">
            <h3 id="ajuste-entregar-title" className="text-sm font-bold text-slate-800">
              {mode === "carga_propia" ? "Cargar ajuste" : "Entregar ajuste"}
            </h3>
            <p className="text-xs text-slate-500 truncate mt-0.5" title={titulo}>
              {titulo}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg disabled:opacity-40"
            aria-label="Cerrar"
          >
            <IconX size={18} />
          </button>
        </div>

        <div className="px-4 py-3 space-y-3 overflow-y-auto">
          <p className="text-[11px] text-slate-600 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-2">
            Los archivos se agregan como <strong>partes nuevas</strong> con sufijo{" "}
            <code className="text-[10px]">[versión mm-yyyy]</code>. No se reemplazan las anteriores.
          </p>

          {mode === "carga_propia" && (
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500 mb-1 block">
                Obra madre
              </label>
              <SearchableSelect
                options={obrasOptions}
                value={obraId}
                onChange={setObraId}
                placeholder="Buscar obra Entregado/Oficial…"
                disabled={saving}
              />
            </div>
          )}

          {ajuste?.brief ? (
            <div className="text-[11px] text-slate-600 bg-slate-50 rounded-lg px-2.5 py-2 border border-slate-100">
              <span className="font-bold text-slate-500 uppercase text-[9px]">Brief: </span>
              {ajuste.brief}
            </div>
          ) : null}

          <div>
            <label className="text-[10px] font-bold uppercase text-slate-500 mb-1 block">
              Links de carpetas Drive (uno por línea)
            </label>
            <textarea
              value={folderLinksText}
              onChange={(e) => setFolderLinksText(e.target.value)}
              rows={2}
              disabled={saving}
              placeholder="https://drive.google.com/drive/folders/…"
              className="w-full text-sm border border-slate-300 rounded-lg px-2.5 py-2 font-mono text-xs"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase text-slate-500 mb-1 block">
              Links de PDF Drive (uno por línea)
            </label>
            <textarea
              value={fileLinksText}
              onChange={(e) => setFileLinksText(e.target.value)}
              rows={2}
              disabled={saving}
              placeholder="https://drive.google.com/file/d/…"
              className="w-full text-sm border border-slate-300 rounded-lg px-2.5 py-2 font-mono text-xs"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase text-slate-500 mb-1 block">
              Subir PDFs
            </label>
            <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-slate-300 text-sm text-slate-600 hover:bg-slate-50 cursor-pointer">
              <IconPlus size={14} />
              Elegir archivos
              <input
                type="file"
                accept="application/pdf,.pdf"
                multiple
                className="hidden"
                disabled={saving}
                onChange={handleFilesChange}
              />
            </label>
            {files.length > 0 && (
              <ul className="mt-2 space-y-1">
                {files.map((f, idx) => (
                  <li
                    key={`${f.name}-${idx}`}
                    className="flex items-center justify-between gap-2 text-[11px] text-slate-700 bg-slate-50 rounded px-2 py-1"
                  >
                    <span className="truncate">{f.name}</span>
                    <button
                      type="button"
                      onClick={() => removeFile(idx)}
                      disabled={saving}
                      className="text-rose-600 hover:underline shrink-0"
                    >
                      Quitar
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase text-slate-500 mb-1 block">
              Nota (opcional)
            </label>
            <textarea
              value={observacion}
              onChange={(e) => setObservacion(e.target.value)}
              rows={2}
              disabled={saving}
              className="w-full text-sm border border-slate-300 rounded-lg px-2.5 py-2"
            />
          </div>

          {(obra?.link_drive || ajuste?.link_drive) && (
            <a
              href={obra?.link_drive || ajuste?.link_drive}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] text-green-700 hover:underline"
            >
              <IconDrive size={12} /> Abrir carpeta de la obra
            </a>
          )}

          {localError ? (
            <p className="text-[11px] text-rose-700 bg-rose-50 border border-rose-100 rounded px-2 py-1.5">
              {localError}
            </p>
          ) : null}
        </div>

        <div className="px-4 py-3 border-t border-slate-200 flex justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-3 py-2 text-sm rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-3 py-2 text-sm rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-700 disabled:opacity-40 inline-flex items-center gap-2"
          >
            {saving ? <IconLoader size={14} className="animate-spin" /> : null}
            Entregar y cerrar
          </button>
        </div>
      </form>
    </div>,
    document.body,
  );
}
