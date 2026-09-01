import React from "react";
import { IconCheck, IconX } from "../../ui/Icons";
import TransporteOficialBadge from "./TransporteOficialBadge";

const EDIT_CATEGORIA_OPTIONS = [
  { key: "PASAJEROS", label: "Pasajeros", activeClass: "text-slate-800" },
  { key: "LOGISTICO", label: "Solo logístico", activeClass: "text-amber-700" },
  { key: "INTERNO", label: "Trasl. interno", activeClass: "text-violet-700" },
];

export default function TransportEditForm({
  editFormData,
  setEditFormData,
  catalog,
  choferOptions,
  defaultTransporteId,
  onSave,
  onCancel,
}) {
  return (
    <div className="flex-1 min-w-0 space-y-3" onClick={(e) => e.stopPropagation()}>
      <div className="grid grid-cols-1 sm:grid-cols-[10rem_1fr] gap-2 sm:gap-3">
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1 block">
            Vehículo
          </label>
          <select
            className="w-full border border-indigo-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-indigo-200 outline-none"
            value={editFormData.id_transporte || defaultTransporteId}
            onChange={(e) => {
              const id = e.target.value;
              const selected = catalog.find((c) => String(c.id) === String(id));
              setEditFormData({
                ...editFormData,
                id_transporte: id,
                es_oficial: !!selected?.es_oficial,
              });
            }}
          >
            {catalog.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
                {c.es_oficial ? " ★ oficial" : ""}
                {c.patente ? ` (${c.patente})` : ""}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1 block">
            Nombre del recorrido
          </label>
          <input
            type="text"
            value={editFormData.detalle}
            onChange={(e) =>
              setEditFormData({ ...editFormData, detalle: e.target.value })
            }
            className="w-full border border-indigo-200 rounded-lg px-3 py-2 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-200 outline-none"
            placeholder="Ej: Bus 1 — Ida a Córdoba"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1 block">
            Capacidad
          </label>
          <input
            type="number"
            min="0"
            value={editFormData.capacidad}
            onChange={(e) =>
              setEditFormData({ ...editFormData, capacidad: e.target.value })
            }
            className="w-full border border-indigo-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-200 outline-none"
            placeholder="Butacas"
          />
        </div>
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1 block">
            Costo
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={editFormData.costo}
            onChange={(e) =>
              setEditFormData({ ...editFormData, costo: e.target.value })
            }
            className="w-full border border-indigo-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-200 outline-none"
            placeholder="$"
          />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1 block">
            Chofer
          </label>
          <select
            className="w-full border border-indigo-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-indigo-200 outline-none"
            value={editFormData.id_chofer || ""}
            onChange={(e) =>
              setEditFormData({ ...editFormData, id_chofer: e.target.value })
            }
          >
            <option value="">Sin chofer</option>
            {choferOptions.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label} {c.dni ? `(${c.dni})` : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      <label className="flex items-center gap-2 cursor-pointer select-none">
        <input
          type="checkbox"
          className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
          checked={!!editFormData.es_oficial}
          onChange={(e) =>
            setEditFormData({ ...editFormData, es_oficial: e.target.checked })
          }
        />
        <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-600">
          Vehículo oficial
          <TransporteOficialBadge visible={!!editFormData.es_oficial} size={12} />
        </span>
      </label>

      <div>
        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5 block">
          Categoría
        </label>
        <div
          className="inline-flex w-full sm:w-auto rounded-lg border border-slate-200 bg-slate-100 p-0.5"
          role="group"
        >
          {EDIT_CATEGORIA_OPTIONS.map(({ key, label, activeClass }) => {
            const active = editFormData.categoria_logistica === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() =>
                  setEditFormData({ ...editFormData, categoria_logistica: key })
                }
                className={`flex-1 sm:flex-none px-3 py-1.5 rounded-md text-xs font-bold transition-all whitespace-nowrap ${
                  active
                    ? `bg-white shadow-sm ${activeClass}`
                    : "text-slate-400 hover:text-slate-600"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-2 pt-0.5">
        <button
          type="button"
          onClick={onSave}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-600 transition-colors"
        >
          <IconCheck size={14} />
          Guardar
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-xs font-bold hover:bg-slate-200 transition-colors"
        >
          <IconX size={14} />
          Cancelar
        </button>
      </div>
    </div>
  );
}
