import React, { useState } from "react";
import { toast } from "sonner";
import { IconX, IconCheck, IconLoader, IconTag } from "../ui/Icons";
import TagMultiSelect from "../filters/TagMultiSelect";
import {
  bulkAddTagsToWorks,
  bulkRemoveTagsFromWorks,
} from "../../services/repertoireSelectionBulkService";

export default function RepertoireSelectionTagsModal({
  supabase,
  workIds,
  workCount,
  availableTags,
  onClose,
  onApplied,
}) {
  const [mode, setMode] = useState("add");
  const [selectedTagIds, setSelectedTagIds] = useState(new Set());
  const [loading, setLoading] = useState(false);

  const handleApply = async () => {
    const tagIds = [...selectedTagIds];
    if (tagIds.length === 0) {
      toast.error("Seleccioná al menos un tag.");
      return;
    }

    setLoading(true);
    try {
      if (mode === "add") {
        const { inserted } = await bulkAddTagsToWorks(supabase, workIds, tagIds);
        toast.success(
          inserted > 0
            ? `Tag(s) agregado(s) en ${workCount} obra(s) (${inserted} vínculo(s) nuevos).`
            : "Las obras ya tenían esos tags.",
        );
      } else {
        const { removed } = await bulkRemoveTagsFromWorks(supabase, workIds, tagIds);
        toast.success(
          removed > 0
            ? `Tag(s) quitado(s) (${removed} vínculo(s) eliminados).`
            : "Ninguna obra tenía esos tags.",
        );
      }
      await onApplied?.(workIds);
      onClose();
    } catch (err) {
      toast.error(err.message || "No se pudieron actualizar los tags.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[85] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white w-full max-w-md rounded-xl shadow-2xl overflow-hidden flex flex-col">
        <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div>
            <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
              <IconTag className="text-indigo-600" /> Tags en la selección
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {workCount} obra{workCount === 1 ? "" : "s"} en la selección
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

        <div className="p-5 space-y-4">
          <div className="flex rounded-lg border border-slate-200 overflow-hidden">
            <button
              type="button"
              onClick={() => setMode("add")}
              className={`flex-1 px-3 py-2 text-xs font-bold ${
                mode === "add"
                  ? "bg-indigo-600 text-white"
                  : "bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              Agregar tags
            </button>
            <button
              type="button"
              onClick={() => setMode("remove")}
              className={`flex-1 px-3 py-2 text-xs font-bold border-l border-slate-200 ${
                mode === "remove"
                  ? "bg-rose-600 text-white"
                  : "bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              Quitar tags
            </button>
          </div>

          <p className="text-xs text-slate-500">
            {mode === "add"
              ? "Los tags elegidos se suman a las obras que aún no los tengan."
              : "Los tags elegidos se quitan de todas las obras de la selección."}
          </p>

          <TagMultiSelect
            tags={availableTags}
            selectedIds={selectedTagIds}
            onChange={setSelectedTagIds}
          />
        </div>

        <div className="flex gap-2 justify-end px-5 py-4 border-t border-slate-100 bg-white">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-500 hover:bg-slate-100 rounded-lg font-medium"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={loading || selectedTagIds.size === 0}
            className={`px-4 py-2 text-sm text-white rounded-lg font-bold shadow-sm flex items-center gap-2 disabled:opacity-50 ${
              mode === "add"
                ? "bg-indigo-600 hover:bg-indigo-700"
                : "bg-rose-600 hover:bg-rose-700"
            }`}
          >
            {loading ? (
              <IconLoader size={14} className="animate-spin" />
            ) : (
              <IconCheck size={14} />
            )}
            {mode === "add" ? "Agregar" : "Quitar"}
          </button>
        </div>
      </div>
    </div>
  );
}
