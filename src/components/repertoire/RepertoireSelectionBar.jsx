import React, { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  IconList,
  IconFileText,
  IconTrash,
  IconChevronDown,
  IconChevronUp,
  IconDrive,
  IconHelpCircle,
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

const EMPTY_SELECTION_HELP =
  "Sin obras seleccionadas. Podés cargar una lista desde Drive o marcar obras en la tabla.";

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
  variant = "bar",
  mobileExtraActions = null,
}) {
  const [expanded, setExpanded] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showTagsModal, setShowTagsModal] = useState(false);
  const [showProgramModal, setShowProgramModal] = useState(false);
  const [showDriveLoadModal, setShowDriveLoadModal] = useState(false);
  const [driveLoading, setDriveLoading] = useState(false);
  const mobileMenuRef = useRef(null);

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

  useEffect(() => {
    if (variant !== "mobile-menu") return undefined;
    const handleClickOutside = (event) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target)) {
        setShowMobileMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [variant]);

  const openAndCloseMenu = (callback) => {
    callback();
    setShowMobileMenu(false);
  };

  if (variant === "mobile-menu") {
    return (
      <>
        <div className="relative shrink-0" ref={mobileMenuRef}>
          <button
            type="button"
            onClick={() => setShowMobileMenu((v) => !v)}
            className={`inline-flex h-9 items-center gap-1.5 rounded-lg border px-2 text-xs font-bold ${
              showMobileMenu || hasSelection
                ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                : "border-slate-300 bg-white text-slate-600"
            }`}
            aria-expanded={showMobileMenu}
            aria-label="Acciones de selección"
          >
            <IconList size={16} />
            {hasSelection && (
              <span className="rounded-full bg-indigo-600 px-1.5 py-0.5 text-[9px] leading-none text-white">
                {orderedIds.length}
              </span>
            )}
            <IconChevronDown size={12} className={showMobileMenu ? "rotate-180" : ""} />
          </button>

          {showMobileMenu && (
            <div className="absolute right-0 top-full z-50 mt-1 w-72 max-w-[calc(100vw-1rem)] rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
              <div className="mb-2 flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-[10px] font-black uppercase text-slate-500">
                  Selección
                </span>
                <span className="text-[10px] font-bold text-indigo-700">
                  {orderedIds.length} obra{orderedIds.length === 1 ? "" : "s"}
                </span>
              </div>

              <div className="space-y-1">
                {mobileExtraActions}

                <button
                  type="button"
                  onClick={() => openAndCloseMenu(() => setShowDriveLoadModal(true))}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs font-bold text-emerald-800 hover:bg-emerald-50"
                >
                  <IconDrive size={14} /> Preselección desde Drive
                </button>

                {hasSelection ? (
                  <>
                    <input
                      type="text"
                      value={selectionName}
                      onChange={(e) => onSelectionNameChange(e.target.value)}
                      placeholder="Nombre de la selección"
                      className="mb-1 w-full rounded-lg border border-indigo-100 bg-indigo-50/40 px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-indigo-200"
                    />
                    <button
                      type="button"
                      onClick={() => openAndCloseMenu(() => setShowOrderModal(true))}
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs font-bold text-indigo-700 hover:bg-indigo-50"
                    >
                      <IconList size={14} /> Editar orden
                    </button>
                    <button
                      type="button"
                      onClick={() => openAndCloseMenu(() => setShowTagsModal(true))}
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs font-bold text-violet-800 hover:bg-violet-50"
                    >
                      <IconTag size={14} /> Tags
                    </button>
                    <button
                      type="button"
                      onClick={() => openAndCloseMenu(() => setShowProgramModal(true))}
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs font-bold text-sky-800 hover:bg-sky-50"
                    >
                      <IconCalendarPlus size={14} /> Programa
                    </button>
                    <button
                      type="button"
                      onClick={() => openAndCloseMenu(handleExportPdf)}
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs font-bold text-indigo-700 hover:bg-indigo-50"
                    >
                      <IconFileText size={14} /> PDF
                    </button>
                    <button
                      type="button"
                      onClick={() => openAndCloseMenu(handleSyncDrive)}
                      disabled={driveLoading}
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs font-bold text-emerald-800 hover:bg-emerald-50 disabled:opacity-50"
                    >
                      {driveLoading ? (
                        <IconLoader size={14} className="animate-spin" />
                      ) : (
                        <IconDrive size={14} />
                      )}
                      Sincronizar Drive
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        openAndCloseMenu(() => {
                          if (confirm("¿Vaciar toda la selección?")) onClear();
                        })
                      }
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs font-bold text-rose-700 hover:bg-rose-50"
                    >
                      <IconTrash size={14} /> Vaciar selección
                    </button>
                  </>
                ) : (
                  <div className="flex items-start gap-2 rounded-lg bg-slate-50 px-2 py-2 text-[11px] leading-snug text-slate-500">
                    <IconHelpCircle size={14} className="mt-0.5 shrink-0 text-indigo-500" />
                    <span>{EMPTY_SELECTION_HELP}</span>
                  </div>
                )}
              </div>
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
            <div className="flex flex-wrap items-center justify-end gap-2 w-full">
              <button
                type="button"
                onClick={() => setShowDriveLoadModal(true)}
                className="text-xs font-bold px-3 py-1.5 rounded-lg border border-emerald-400 bg-white text-emerald-800 hover:bg-emerald-50 flex items-center gap-1.5 shadow-sm"
              >
                <IconDrive size={14} /> Preselección desde Drive
              </button>
              <span
                className="relative inline-flex group"
                tabIndex={0}
                aria-label={EMPTY_SELECTION_HELP}
                title={EMPTY_SELECTION_HELP}
              >
                <IconHelpCircle
                  size={16}
                  className="text-indigo-500 hover:text-indigo-700 cursor-help"
                />
                <span className="pointer-events-none invisible absolute right-0 top-full z-[110] mt-2 w-64 rounded-lg border border-indigo-100 bg-white px-3 py-2 text-left text-[11px] font-medium leading-snug text-slate-700 shadow-xl opacity-0 transition-opacity group-hover:visible group-hover:opacity-100 group-focus:visible group-focus:opacity-100">
                  {EMPTY_SELECTION_HELP}
                </span>
              </span>
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
