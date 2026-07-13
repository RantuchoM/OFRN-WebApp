import React, { useRef, useState } from "react";
import { toast } from "sonner";
import { useClickOutside } from "../../../hooks/useClickOutside";
import {
  IconTrash,
  IconMapPin,
  IconClock,
  IconChevronDown,
  IconLoader,
  IconDownload,
  IconFileText,
  IconUsers,
  IconCheckCircle,
  IconList,
  IconUpload,
  IconMoreVertical,
} from "../../ui/Icons";

export default function TransportCardActions({
  incompleteCount,
  isMediosPropios,
  isExpanded,
  exportingFirmas,
  onShowIncomplete,
  onAdmission,
  onBoarding,
  onItinerary,
  onStopsExport,
  onShift,
  onRoadmap,
  onCnrt,
  onExportFirmasPdf,
  onExportFirmasDocx,
  onExportFirmasDocxMerge,
  onDelete,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [awaitingNoteFile, setAwaitingNoteFile] = useState(false);
  const menuRef = useRef(null);
  const fileInputRef = useRef(null);
  useClickOutside(menuRef, () => setMenuOpen(false));

  const infoBtnClass =
    "flex items-center justify-center gap-1 px-1.5 py-1 sm:px-2.5 sm:py-1.5 rounded-lg text-[10px] font-bold transition-colors whitespace-nowrap";

  const showPending = incompleteCount > 0 && !isMediosPropios;

  const menuItems = [
    {
      key: "itinerary",
      label: "Plantilla de Itinerario",
      icon: IconMapPin,
      onClick: onItinerary,
    },
    {
      key: "stops",
      label: "Cronograma de paradas",
      icon: IconList,
      onClick: onStopsExport,
    },
    {
      key: "shift",
      label: "Mover horarios",
      icon: IconClock,
      onClick: onShift,
    },
    { key: "roadmap", label: "Hoja de ruta", icon: IconFileText, onClick: onRoadmap },
    { key: "cnrt", label: "Exportar CNRT", icon: IconDownload, onClick: onCnrt },
    {
      key: "firmas-pdf",
      label: "Cuadro de firmas (PDF)",
      icon: IconFileText,
      onClick: onExportFirmasPdf,
      disabled: exportingFirmas,
    },
    {
      key: "firmas-docx",
      label: "Cuadro de firmas (Word)",
      icon: IconFileText,
      onClick: onExportFirmasDocx,
      disabled: exportingFirmas,
    },
    {
      key: "firmas-merge",
      label: "Cuadro + nota Word",
      icon: IconUpload,
      onClick: () => {
        setAwaitingNoteFile(true);
        fileInputRef.current?.click();
      },
      disabled: exportingFirmas,
    },
  ];

  const handleMenuAction = (item) => {
    if (item.disabled) return;
    setMenuOpen(false);
    item.onClick?.();
  };

  const handleNoteFileChange = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !awaitingNoteFile) return;
    setAwaitingNoteFile(false);
    if (!/\.docx$/i.test(file.name)) {
      toast.error("Seleccioná un archivo .docx");
      return;
    }
    onExportFirmasDocxMerge?.(file);
  };

  return (
    <div
      className="flex flex-wrap items-center justify-end gap-1 sm:gap-1.5 shrink-0 w-full md:w-auto max-w-full"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-0.5 shadow-sm overflow-visible">
        <button
          type="button"
          onClick={onAdmission}
          className={`${infoBtnClass} text-indigo-600 hover:bg-indigo-50`}
          title="Admisión de pasajeros"
        >
          <IconUsers size={14} />
          <span className="hidden sm:inline">Admisión</span>
        </button>
        <div className="w-px h-4 bg-slate-200 shrink-0" />
        <div className="relative overflow-visible">
          {showPending && (
            <button
              type="button"
              onClick={onShowIncomplete}
              className="absolute -top-1.5 -right-1.5 z-10 flex items-center justify-center min-w-[1.125rem] h-[1.125rem] px-1 rounded-full bg-rose-500 text-white text-[8px] font-black leading-none shadow-md ring-2 ring-white animate-pulse"
              title={`${incompleteCount} pendiente${incompleteCount === 1 ? "" : "s"} de subida/bajada`}
            >
              {incompleteCount}
            </button>
          )}
          <button
            type="button"
            onClick={onBoarding}
            className={`${infoBtnClass} text-amber-600 hover:bg-amber-50`}
            title="Abordaje y subida/bajada"
          >
            <IconCheckCircle size={14} />
            <span className="hidden sm:inline">Abordaje</span>
          </button>
        </div>
      </div>

      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          className={`flex items-center gap-1 px-1.5 py-1 sm:px-2 sm:py-1.5 rounded-xl border text-[10px] font-bold transition-colors ${
            menuOpen
              ? "bg-slate-800 text-white border-slate-800"
              : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
          }`}
          title="Más acciones"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
        >
          {exportingFirmas ? (
            <IconLoader size={14} className="animate-spin" />
          ) : (
            <IconMoreVertical size={14} />
          )}
          <span className="hidden sm:inline">Acciones</span>
        </button>

        {menuOpen && (
          <div
            className="absolute right-0 top-[calc(100%+4px)] z-[140] min-w-[210px] rounded-xl border border-slate-200 bg-white shadow-2xl py-1 overflow-hidden"
            role="menu"
          >
            {menuItems.map((item) => {
              const ItemIcon = item.icon;
              return (
                <button
                  key={item.key}
                  type="button"
                  role="menuitem"
                  disabled={item.disabled}
                  onClick={() => handleMenuAction(item)}
                  className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 transition-colors ${
                    item.disabled
                      ? "text-slate-300 cursor-not-allowed"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <ItemIcon size={14} className="text-slate-400 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
            <div className="my-1 border-t border-slate-100" />
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setMenuOpen(false);
                onDelete?.();
              }}
              className="w-full text-left px-3 py-2 text-xs flex items-center gap-2 text-rose-600 hover:bg-rose-50 transition-colors"
            >
              <IconTrash size={14} className="shrink-0" />
              <span>Eliminar transporte</span>
            </button>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="hidden"
          onChange={handleNoteFileChange}
        />
      </div>

      <div
        className={`text-slate-300 transition-transform shrink-0 ${isExpanded ? "rotate-180" : ""}`}
      >
        <IconChevronDown size={16} />
      </div>
    </div>
  );
}
