import React from "react";
import { IconCloud, IconDownload, IconLoader, IconMonitor, IconUpload } from "../ui/Icons";

const GroupBadge = ({ icon: Icon, label, className, busy = false }) => (
  <span
    className={`inline-flex items-center justify-center px-2 border-r border-slate-200 shrink-0 ${className}`}
    title={label}
    aria-hidden="true"
  >
    {busy ? <IconLoader size={14} className="animate-spin" /> : <Icon size={16} />}
  </span>
);

const ActionButton = ({ onClick, disabled, title, children, className = "" }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    title={title}
    className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-black whitespace-nowrap transition disabled:opacity-50 ${className}`}
  >
    {children}
  </button>
);

const Divider = () => <div className="w-px bg-slate-200 self-stretch shrink-0" />;

export default function ManualStorageToolbar({
  onOpenSaved,
  isGuest = true,
  onLogin,
  onImport,
  onExport,
  importInput = null,
  isCloudSaving = false,
}) {
  const handleOpen = () => {
    if (isGuest) {
      onLogin?.();
      return;
    }
    onOpenSaved?.();
  };

  return (
    <div className="inline-flex items-center gap-2 shrink-0">
      <div
        className="inline-flex items-stretch rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden"
        title={
          isGuest
            ? "Iniciá sesión para guardado automático en la nube"
            : "Guardado automático en la nube"
        }
      >
        <GroupBadge
          icon={IconCloud}
          label="Nube"
          className="bg-indigo-50 text-indigo-600"
          busy={isCloudSaving}
        />
        <ActionButton
          onClick={handleOpen}
          title={isGuest ? "Iniciá sesión para abrir guardados" : "Abrir guardados en la nube"}
          className="text-indigo-700 hover:bg-indigo-50 active:bg-indigo-100"
        >
          Abrir
        </ActionButton>
      </div>

      <div
        className="inline-flex items-stretch rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden"
        title="Importar y exportar en esta computadora"
      >
        <GroupBadge icon={IconMonitor} label="Computadora" className="bg-slate-100 text-slate-600" />
        <ActionButton
          onClick={onImport}
          title="Importar CSV desde esta computadora"
          className="text-slate-700 hover:bg-slate-50 active:bg-slate-50"
        >
          <IconUpload size={14} className="text-slate-500" />
          Importar
        </ActionButton>
        <Divider />
        <ActionButton
          onClick={onExport}
          title="Exportar CSV a esta computadora"
          className="text-slate-700 hover:bg-slate-50 active:bg-slate-50"
        >
          <IconDownload size={14} className="text-slate-500" />
          Exportar
        </ActionButton>
      </div>

      {importInput}
    </div>
  );
}
