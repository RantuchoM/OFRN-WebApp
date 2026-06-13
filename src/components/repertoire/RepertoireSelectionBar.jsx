import React, { useState } from "react";
import { toast } from "sonner";
import {
  IconList,
  IconFileText,
  IconTrash,
  IconChevronDown,
  IconChevronUp,
  IconDrive,
  IconLoader,
  IconTag,
  IconCalendarPlus,
} from "../ui/Icons";
import RepertoireSelectionOrderModal from "./RepertoireSelectionOrderModal";
import RepertoireSelectionTagsModal from "./RepertoireSelectionTagsModal";
import RepertoireSelectionProgramModal from "./RepertoireSelectionProgramModal";
import RepertoireSelectionDriveLoadModal from "./RepertoireSelectionDriveLoadModal";
import { exportRepertoireSelectionPdf } from "../../utils/repertoireSelectionPdf";
import { getRepertoireSelectionPdfTitle, getRepertoireSelectionPdfFileName } from "../../utils/repertoireSelectionStorage";
import { syncArchivoSelectionToDrive } from "../../services/repertoireSelectionDriveService";

const stripHtml = (html) =>
  String(html || "")
    .replace(/<[^>]*>/g, "")
    .trim();

export default function RepertoireSelectionBar({
  supabase,
  orderedIds,
  selectedWorks,
  selectionName,
  onSelectionNameChange,
  worksById,
  works,
  availableTags,
  onUpdateOrder,
  onClear,
  onRemove,
  onRefreshWorks,
  onLoadFromDrive,
}) {
  const [expanded, setExpanded] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showTagsModal, setShowTagsModal] = useState(false);
  const [showProgramModal, setShowProgramModal] = useState(false);
  const [showDriveLoadModal, setShowDriveLoadModal] = useState(false);
  const [driveLoading, setDriveLoading] = useState(false);

  const hasSelection = orderedIds.length > 0;

  const pdfTitle = getRepertoireSelectionPdfTitle(selectionName);

  const handleExportPdf = () => {
    if (selectedWorks.length === 0) {
      alert("No hay obras válidas en la selección para exportar.");
      return;
    }
    exportRepertoireSelectionPdf(selectedWorks, {
      title: pdfTitle,
      fileName: getRepertoireSelectionPdfFileName(selectionName),
    });
  };

  const handleSyncDrive = async () => {
    const name = String(selectionName || "").trim();
    if (!name) {
      toast.error("Indicá un nombre para la selección antes de sincronizar con Drive.");
      return;
    }
    if (selectedWorks.length === 0) {
      toast.error("No hay obras válidas en la selección.");
      return;
    }

    setDriveLoading(true);
    try {
      const result = await syncArchivoSelectionToDrive(supabase, {
        selectionName: name,
        works: selectedWorks,
      });

      const parts = [`${result.shortcutsTotal} acceso(s) directo(s) en «${result.folderName}».`];
      if (result.skippedNoDrive > 0) {
        parts.push(`${result.skippedNoDrive} obra(s) sin link de Drive omitida(s).`);
      }

      toast.success(parts.join(" "), {
        action: result.folderUrl
          ? {
              label: "Abrir carpeta",
              onClick: () => window.open(result.folderUrl, "_blank", "noopener,noreferrer"),
            }
          : undefined,
      });
    } catch (err) {
      toast.error(err.message || "No se pudo sincronizar con Drive.");
    } finally {
      setDriveLoading(false);
    }
  };

  return (
    <>
      <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3 shrink-0 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {hasSelection ? (
            <>
              <div className="flex flex-wrap items-center gap-3 min-w-0 flex-1">
                <button
                  type="button"
                  onClick={() => setExpanded((v) => !v)}
                  className="flex items-center gap-2 text-sm font-bold text-indigo-800 hover:text-indigo-900 shrink-0"
                >
                  <IconList size={18} className="text-indigo-600" />
                  Selección ({orderedIds.length})
                  {expanded ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
                </button>
                <input
                  type="text"
                  value={selectionName}
                  onChange={(e) => onSelectionNameChange(e.target.value)}
                  placeholder="Nombre de la selección"
                  className="min-w-[180px] flex-1 max-w-md text-xs px-2.5 py-1.5 border border-indigo-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  title="Nombre usado en el PDF y en la carpeta de Drive"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowDriveLoadModal(true)}
                  className="text-xs font-bold px-3 py-1.5 rounded-lg border border-emerald-400 bg-white text-emerald-800 hover:bg-emerald-50 flex items-center gap-1.5"
                  title="Cargar obras desde una carpeta existente en Misceláneos"
                >
                  <IconDrive size={14} /> Preselección desde Drive
                </button>
                <button
                  type="button"
                  onClick={() => setShowOrderModal(true)}
                  className="text-xs font-bold px-3 py-1.5 rounded-lg border border-indigo-300 bg-white text-indigo-700 hover:bg-indigo-100"
                >
                  Editar orden
                </button>
                <button
                  type="button"
                  onClick={() => setShowTagsModal(true)}
                  className="text-xs font-bold px-3 py-1.5 rounded-lg border border-violet-300 bg-violet-50 text-violet-800 hover:bg-violet-100 flex items-center gap-1.5"
                  title="Agregar o quitar tags en todas las obras"
                >
                  <IconTag size={14} /> Tags
                </button>
                <button
                  type="button"
                  onClick={() => setShowProgramModal(true)}
                  className="text-xs font-bold px-3 py-1.5 rounded-lg border border-sky-300 bg-sky-50 text-sky-800 hover:bg-sky-100 flex items-center gap-1.5"
                  title="Cargar obras a un bloque de repertorio"
                >
                  <IconCalendarPlus size={14} /> Programa
                </button>
                <button
                  type="button"
                  onClick={handleExportPdf}
                  className="text-xs font-bold px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 flex items-center gap-1.5 shadow-sm"
                >
                  <IconFileText size={14} /> PDF
                </button>
                <button
                  type="button"
                  onClick={handleSyncDrive}
                  disabled={driveLoading}
                  className="text-xs font-bold px-3 py-1.5 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 flex items-center gap-1.5 disabled:opacity-50"
                  title="Crear accesos directos numerados en Misceláneos (Drive)"
                >
                  {driveLoading ? (
                    <IconLoader size={14} className="animate-spin" />
                  ) : (
                    <IconDrive size={14} />
                  )}
                  Drive
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm("¿Vaciar toda la selección?")) onClear();
                  }}
                  className="text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 flex items-center gap-1"
                  title="Vaciar selección"
                >
                  <IconTrash size={14} />
                </button>
              </div>
            </>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3 w-full">
              <p className="text-xs text-indigo-700/80">
                Sin obras seleccionadas. Podés cargar una lista desde Drive o marcar obras en la tabla.
              </p>
              <button
                type="button"
                onClick={() => setShowDriveLoadModal(true)}
                className="text-xs font-bold px-3 py-1.5 rounded-lg border border-emerald-400 bg-white text-emerald-800 hover:bg-emerald-50 flex items-center gap-1.5 shadow-sm"
              >
                <IconDrive size={14} /> Preselección desde Drive
              </button>
            </div>
          )}
        </div>

        {hasSelection && expanded && (
          <div className="mt-3 pt-3 border-t border-indigo-200/80 max-h-40 overflow-y-auto space-y-1">
            {selectedWorks.map((work, index) => (
              <div
                key={work.id}
                className="flex items-center gap-2 text-xs bg-white/80 rounded-lg px-2 py-1.5 border border-indigo-100"
              >
                <span className="font-bold text-indigo-600 w-5 shrink-0">{index + 1}.</span>
                <span className="truncate text-slate-700 font-medium max-w-[35%]">
                  {work.compositor_full || "-"}
                </span>
                <span className="truncate text-slate-600 flex-1">{stripHtml(work.titulo)}</span>
                <button
                  type="button"
                  onClick={() => onRemove(work.id)}
                  className="text-slate-400 hover:text-red-600 shrink-0"
                  title="Quitar"
                >
                  ×
                </button>
              </div>
            ))}
            {selectedWorks.length < orderedIds.length && (
              <p className="text-[10px] text-amber-700 italic px-1">
                Algunas obras guardadas ya no están en el archivo cargado.
              </p>
            )}
          </div>
        )}
      </div>

      {showOrderModal && (
        <RepertoireSelectionOrderModal
          worksById={worksById}
          orderedIds={orderedIds}
          onClose={() => setShowOrderModal(false)}
          onSave={(ids) => {
            onUpdateOrder(ids);
            setShowOrderModal(false);
          }}
        />
      )}

      {showTagsModal && (
        <RepertoireSelectionTagsModal
          supabase={supabase}
          workIds={selectedWorks.map((w) => w.id)}
          workCount={selectedWorks.length}
          availableTags={availableTags}
          onClose={() => setShowTagsModal(false)}
          onApplied={onRefreshWorks}
        />
      )}

      {showProgramModal && (
        <RepertoireSelectionProgramModal
          supabase={supabase}
          workIds={selectedWorks.map((w) => w.id)}
          workCount={selectedWorks.length}
          onClose={() => setShowProgramModal(false)}
        />
      )}

      {showDriveLoadModal && (
        <RepertoireSelectionDriveLoadModal
          supabase={supabase}
          works={works}
          currentSelectionCount={orderedIds.length}
          onClose={() => setShowDriveLoadModal(false)}
          onLoad={onLoadFromDrive}
        />
      )}
    </>
  );
}
