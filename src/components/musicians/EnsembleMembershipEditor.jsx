import React, { useMemo, useState } from "react";
import SearchableSelect from "../ui/SearchableSelect";
import { IconLayers, IconTrash } from "../ui/Icons";

/**
 * Lista de tramos de membresía a ensambles (fecha_desde / fecha_hasta opcional).
 */
export default function EnsembleMembershipEditor({
  rows,
  ensemblesOptions,
  defaultFechaDesde,
  onAddEnsemble,
  onUpdateRow,
  onCloseRow,
}) {
  const [pendingEnsId, setPendingEnsId] = useState(null);

  const optionsForSearch = useMemo(
    () =>
      (ensemblesOptions || []).map((o) => ({
        id: o.value,
        label: o.label,
      })),
    [ensemblesOptions],
  );

  const labelById = useMemo(() => {
    const m = new Map();
    for (const o of ensemblesOptions || []) {
      m.set(Number(o.value), o.label);
    }
    return m;
  }, [ensemblesOptions]);

  const sortedRows = useMemo(() => {
    return [...(rows || [])].sort((a, b) => {
      const la = labelById.get(Number(a.id_ensamble)) || "";
      const lb = labelById.get(Number(b.id_ensamble)) || "";
      const c = la.localeCompare(lb, "es");
      if (c !== 0) return c;
      const da = String(a.fecha_desde || "");
      const db = String(b.fecha_desde || "");
      return da.localeCompare(db);
    });
  }, [rows, labelById]);

  return (
    <div className="space-y-3">
      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 block ml-1">
        Ensambles (desde / hasta)
      </label>

      <div className="rounded-xl border border-slate-200 bg-slate-50/60 divide-y divide-slate-100 overflow-hidden">
        {sortedRows.length === 0 ? (
          <div className="p-3 text-xs text-slate-400 text-center">
            Sin ensambles asignados.
          </div>
        ) : (
          sortedRows.map((row) => {
            const label =
              labelById.get(Number(row.id_ensamble)) ||
              `Ensamble #${row.id_ensamble}`;
            const desde =
              row.fecha_desde?.slice?.(0, 10) ||
              String(row.fecha_desde || "").slice(0, 10);
            const hasta =
              row.fecha_hasta == null
                ? ""
                : row.fecha_hasta?.slice?.(0, 10) ||
                  String(row.fecha_hasta).slice(0, 10);
            const abierto = row.fecha_hasta == null || hasta === "";
            return (
              <div
                key={row.id}
                className="flex flex-col sm:flex-row sm:items-end gap-2 p-2.5 bg-white"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] uppercase font-bold text-slate-400 mb-0.5">
                    Ensamble
                  </div>
                  <div className="text-sm font-semibold text-slate-800 truncate flex items-center gap-2">
                    <IconLayers size={14} className="text-indigo-400 shrink-0" />
                    {label}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 items-end">
                  <div>
                    <div className="text-[9px] uppercase font-bold text-slate-400 mb-0.5">
                      Desde
                    </div>
                    <input
                      type="date"
                      className="border border-slate-200 rounded-lg px-2 py-1 text-xs"
                      value={desde || ""}
                      onChange={(e) =>
                        onUpdateRow(row.id, {
                          fecha_desde: e.target.value || null,
                        })
                      }
                    />
                  </div>
                  <div>
                    <div className="text-[9px] uppercase font-bold text-slate-400 mb-0.5">
                      Hasta
                    </div>
                    <input
                      type="date"
                      className="border border-slate-200 rounded-lg px-2 py-1 text-xs"
                      value={hasta}
                      placeholder="—"
                      onChange={(e) =>
                        onUpdateRow(row.id, {
                          fecha_hasta: e.target.value ? e.target.value : null,
                        })
                      }
                    />
                  </div>
                  <button
                    type="button"
                    title={
                      abierto
                        ? "Cerrar membresía (hasta hoy)"
                        : "Eliminar este tramo"
                    }
                    onClick={() => onCloseRow(row)}
                    className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-colors"
                  >
                    <IconTrash size={16} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="relative z-20">
        <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">
          Agregar ensamble (nuevo tramo)
        </label>
        <SearchableSelect
          options={optionsForSearch}
          value={pendingEnsId}
          onChange={(val) => {
            setPendingEnsId(val);
            if (val != null && val !== "") {
              onAddEnsemble(val);
              setPendingEnsId(null);
            }
          }}
          placeholder="Buscar ensamble..."
        />
        <p className="text-[10px] text-slate-400 mt-1">
          Alta por defecto:{" "}
          <span className="font-medium text-slate-600">
            {defaultFechaDesde || "fecha de alta / hoy"}
          </span>
          .
        </p>
      </div>
    </div>
  );
}
