import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { IconX, IconCheck, IconLoader, IconDrive, IconSearch, IconExternalLink } from "../ui/Icons";
import {
  listArchivoMiscFolders,
  loadArchivoSelectionFromDrive,
  matchSelectionItemsToWorkIds,
} from "../../services/repertoireSelectionDriveService";
import { normalizeForSearch } from "../../utils/sanitize";

export default function RepertoireSelectionDriveLoadModal({
  supabase,
  works,
  currentSelectionCount,
  onClose,
  onLoad,
}) {
  const [folders, setFolders] = useState([]);
  const [foldersLoading, setFoldersLoading] = useState(true);
  const [foldersError, setFoldersError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedFolderId, setSelectedFolderId] = useState(null);
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setFoldersLoading(true);
      setFoldersError("");
      try {
        const list = await listArchivoMiscFolders(supabase);
        if (!cancelled) setFolders(list);
      } catch (err) {
        if (!cancelled) {
          setFoldersError(err.message || "No se pudieron listar las carpetas de Drive.");
        }
      } finally {
        if (!cancelled) setFoldersLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const filteredFolders = useMemo(() => {
    const q = normalizeForSearch(search);
    if (!q) return folders;
    return folders.filter((f) => normalizeForSearch(f.name).includes(q));
  }, [folders, search]);

  const selectedFolder = folders.find((f) => f.id === selectedFolderId) || null;

  const loadPreview = async (folderId) => {
    setPreviewLoading(true);
    setPreview(null);
    try {
      const result = await loadArchivoSelectionFromDrive(supabase, folderId);
      const { orderedIds, unmatched } = matchSelectionItemsToWorkIds(result.items, works);
      setPreview({
        folderName: result.folderName,
        folderUrl: result.folderUrl,
        itemsTotal: result.itemsTotal,
        skippedNonMatchable: result.skippedNonMatchable,
        matchedCount: orderedIds.length,
        unmatched,
        orderedIds,
      });
    } catch (err) {
      toast.error(err.message || "No se pudo leer la carpeta de Drive.");
      setSelectedFolderId(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleSelectFolder = async (folder) => {
    setSelectedFolderId(folder.id);
    await loadPreview(folder.id);
  };

  const handleApply = async () => {
    if (!preview?.orderedIds?.length) {
      toast.error("No hay obras del archivo que coincidan con esa carpeta.");
      return;
    }

    if (currentSelectionCount > 0) {
      const ok = confirm(
        `¿Reemplazar la selección actual (${currentSelectionCount} obra(s)) por «${preview.folderName}»?`,
      );
      if (!ok) return;
    }

    setApplying(true);
    try {
      onLoad(preview.orderedIds, preview.folderName);
      const parts = [`${preview.matchedCount} obra(s) preseleccionada(s).`];
      if (preview.unmatched.length > 0) {
        parts.push(`${preview.unmatched.length} acceso(s) sin match en el archivo.`);
      }
      if (preview.skippedNonMatchable > 0) {
        parts.push(`${preview.skippedNonMatchable} elemento(s) ignorado(s) (no son carpetas ni accesos directos).`);
      }
      toast.success(parts.join(" "));
      onClose();
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[85] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
          <div>
            <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
              <IconDrive className="text-emerald-600" /> Preselección desde Drive
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Elegí una carpeta de Misceláneos para cargar obras al archivo
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-200 rounded"
          >
            <IconX size={20} />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4 min-h-0 flex-1 overflow-hidden">
          <div className="relative shrink-0">
            <IconSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar carpeta…"
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-300"
            />
          </div>

          {foldersLoading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500">
              <IconLoader size={18} className="animate-spin text-emerald-600" />
              Cargando carpetas de Misceláneos…
            </div>
          ) : foldersError ? (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {foldersError}
            </p>
          ) : filteredFolders.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">No hay carpetas que coincidan.</p>
          ) : (
            <div className="min-h-0 flex-1 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
              {filteredFolders.map((folder) => {
                const isSelected = selectedFolderId === folder.id;
                return (
                  <button
                    key={folder.id}
                    type="button"
                    onClick={() => handleSelectFolder(folder)}
                    className={`w-full text-left px-3 py-2.5 flex items-center gap-3 transition-colors ${
                      isSelected
                        ? "bg-emerald-50 border-l-4 border-l-emerald-500"
                        : "hover:bg-slate-50 border-l-4 border-l-transparent"
                    }`}
                  >
                    <IconDrive size={16} className={isSelected ? "text-emerald-600" : "text-slate-400"} />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-slate-800 truncate">{folder.name}</div>
                      {folder.modifiedTime && (
                        <div className="text-[10px] text-slate-400">
                          Modificada{" "}
                          {format(parseISO(folder.modifiedTime), "d MMM yyyy", { locale: es })}
                        </div>
                      )}
                    </div>
                    {isSelected && previewLoading && (
                      <IconLoader size={14} className="animate-spin text-emerald-600 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {selectedFolder && preview && !previewLoading && (
            <div className="shrink-0 rounded-lg border border-emerald-200 bg-emerald-50/60 px-3 py-2.5 text-xs text-emerald-900 space-y-1">
              <div className="font-bold flex items-center justify-between gap-2">
                <span>«{preview.folderName}»</span>
                {preview.folderUrl && (
                  <a
                    href={preview.folderUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-700 hover:text-emerald-900 flex items-center gap-1 shrink-0"
                  >
                    Abrir <IconExternalLink size={12} />
                  </a>
                )}
              </div>
              <p>
                {preview.matchedCount} de {preview.itemsTotal} acceso(s) coinciden con obras del archivo.
              </p>
              {preview.unmatched.length > 0 && (
                <p className="text-amber-800">
                  Sin match: {preview.unmatched.slice(0, 3).map((u) => u.shortcutName).join(", ")}
                  {preview.unmatched.length > 3 ? ` y ${preview.unmatched.length - 3} más` : ""}.
                </p>
              )}
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-lg"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={!preview?.orderedIds?.length || previewLoading || applying}
            className="px-4 py-2 text-sm font-bold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2"
          >
            {applying ? <IconLoader size={14} className="animate-spin" /> : <IconCheck size={14} />}
            Aplicar preselección
          </button>
        </div>
      </div>
    </div>
  );
}
