import React from "react";
import { createPortal } from "react-dom";
import {
  IconCheck,
  IconLoader,
  IconUserPlus,
  IconX,
} from "../ui/Icons";
import SearchableSelect from "../ui/SearchableSelect";
import DateInput from "../ui/DateInput";

function stripHtml(html) {
  return (html || "").replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
}

export default function ArregloQuickEncargoModal({
  isOpen,
  onClose,
  quickDraft,
  onFieldChange,
  compositoresOptions,
  integrantesArregladorOptions,
  solicitanteLabel,
  onSave,
  onOpenNewComposer,
  saving,
}) {
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-3">
      <div
        className="bg-white rounded-t-2xl sm:rounded-xl shadow-2xl w-full max-w-lg border border-slate-200 flex flex-col max-h-[92vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="arreglo-quick-title"
      >
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-slate-200 shrink-0">
          <h3 id="arreglo-quick-title" className="text-sm font-bold text-slate-800">
            Encargar arreglo
          </h3>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg disabled:opacity-40"
            aria-label="Cerrar"
          >
            <IconX size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
          <div>
            <label className="text-[10px] font-bold uppercase text-slate-500 mb-1 block">
              Fecha estimada
            </label>
            <DateInput
              label=""
              value={quickDraft.fecha_esperada || ""}
              onChange={(v) => onFieldChange("fecha_esperada", v)}
              className="border rounded-lg text-sm w-full"
            />
            {solicitanteLabel ? (
              <p className="text-[10px] text-violet-600 mt-1">Solicitado por {solicitanteLabel}</p>
            ) : null}
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase text-slate-500 mb-1 block">
              Compositor
            </label>
            <div className="flex items-center gap-1">
              <div className="flex-1 min-w-0">
                <SearchableSelect
                  options={compositoresOptions}
                  value={quickDraft.compositorId}
                  onChange={(id) => onFieldChange("compositorId", id)}
                  placeholder="Buscar compositor..."
                  className="text-sm"
                  dropdownMinWidth={260}
                />
              </div>
              <button
                type="button"
                onClick={onOpenNewComposer}
                className="inline-flex items-center justify-center px-2.5 py-2 rounded-lg border border-slate-300 bg-white text-slate-600 hover:border-indigo-500 hover:bg-indigo-50 shrink-0"
                title="Crear nuevo compositor"
              >
                <IconUserPlus size={18} />
              </button>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase text-slate-500 mb-1 block">
              Título de la obra
            </label>
            <input
              type="text"
              value={quickDraft.titulo}
              onChange={(e) => onFieldChange("titulo", e.target.value)}
              placeholder="Título de la obra"
              className="w-full text-sm font-semibold border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase text-slate-500 mb-1 block">
              Arreglador
            </label>
            <SearchableSelect
              options={integrantesArregladorOptions}
              value={quickDraft.id_integrante_arreglador}
              onChange={(id) => onFieldChange("id_integrante_arreglador", id)}
              placeholder="Seleccionar arreglador..."
              isMulti={false}
              className="text-sm"
              dropdownMinWidth={260}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500 mb-1 block">
                Orgánico
              </label>
              <input
                type="text"
                value={quickDraft.instrumentacion}
                onChange={(e) => onFieldChange("instrumentacion", e.target.value)}
                placeholder="Orgánico"
                className="w-full text-sm border border-slate-300 rounded-lg px-2 py-2"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500 mb-1 block">
                Dificultad
              </label>
              <input
                type="text"
                value={quickDraft.dificultad}
                onChange={(e) => onFieldChange("dificultad", e.target.value)}
                placeholder="Dificultad"
                className="w-full text-sm border border-slate-300 rounded-lg px-2 py-2"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase text-slate-500 mb-1 block">
              Observación del pedido
            </label>
            <textarea
              rows={3}
              value={quickDraft.observaciones}
              onChange={(e) => onFieldChange("observaciones", e.target.value)}
              placeholder="Observación del pedido…"
              className="w-full text-sm border border-amber-200 bg-amber-50/40 rounded-lg px-3 py-2 resize-y"
            />
          </div>
        </div>

        <div className="shrink-0 px-4 py-3 border-t border-slate-200 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex-1 text-sm font-bold px-3 py-2.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving || !quickDraft.compositorId || !stripHtml(quickDraft.titulo)}
            className="flex-1 text-sm font-bold px-3 py-2.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-1"
          >
            {saving ? <IconLoader size={14} className="animate-spin" /> : <IconCheck size={14} />}
            Asignar
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
