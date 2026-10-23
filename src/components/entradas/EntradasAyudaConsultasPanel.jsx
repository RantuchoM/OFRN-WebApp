import React, { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  descartarEntradaAyudaConsulta,
  listEntradasAyudaConsultas,
} from "../../services/entradaService";

function formatWhen(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(d);
}

/**
 * Cola de consultas del formulario público (vista Terceros).
 */
export default function EntradasAyudaConsultasPanel({
  ui,
  isDark,
  activeAyudaId,
  onOpenConsulta,
  refreshKey = 0,
}) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listEntradasAyudaConsultas("pendiente");
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      toast.error(e?.message || "No se pudieron cargar las consultas de ayuda.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  const descartar = async (id) => {
    if (!window.confirm("¿Descartar esta consulta sin crear reserva?")) return;
    setBusyId(id);
    try {
      await descartarEntradaAyudaConsulta(id);
      toast.success("Consulta descartada.");
      await load();
    } catch (e) {
      toast.error(e?.message || "No se pudo descartar.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className={`${ui.inset} p-4 space-y-3`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className={ui.sectionTitle}>Consultas de ayuda</h3>
        <button type="button" onClick={() => void load()} className={`${ui.btnGhost} text-xs px-2 py-1`}>
          Actualizar
        </button>
      </div>
      <p className={`text-sm ${ui.textMuted}`}>
        Llegan del botón «¿Necesitás ayuda?». Abrí una para precargar el formulario de terceros.
      </p>
      {loading ? (
        <p className={`text-sm ${ui.textMuted}`}>Cargando…</p>
      ) : rows.length === 0 ? (
        <p className={`text-sm ${ui.textMuted}`}>No hay consultas pendientes.</p>
      ) : (
        <ul className="space-y-2 list-none p-0 m-0">
          {rows.map((row) => {
            const active = String(activeAyudaId || "") === String(row.id);
            return (
              <li
                key={row.id}
                className={`rounded-lg border p-3 space-y-2 ${
                  active
                    ? isDark
                      ? "border-[#1ebbf0] bg-slate-900/80"
                      : "border-[#1ebbf0] bg-sky-50"
                    : isDark
                      ? "border-slate-600 bg-slate-900/40"
                      : "border-slate-200 bg-white"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 space-y-0.5">
                    <p className={`font-bold text-sm ${ui.textStrong}`}>{row.nombre}</p>
                    <p className={`text-xs break-all ${ui.textMuted}`}>{row.email}</p>
                    <p className={`text-xs ${ui.textSoft}`}>
                      {row.cantidad ? `${row.cantidad} entrada${Number(row.cantidad) === 1 ? "" : "s"}` : "Sin cantidad"}
                      {row.funcion_label ? ` · ${row.funcion_label}` : ""}
                    </p>
                    <p className={`text-[11px] ${ui.textMuted}`}>{formatWhen(row.created_at)}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className={`${ui.btnPrimary} w-auto px-3 py-1.5 text-xs`}
                      onClick={() => onOpenConsulta?.(row)}
                    >
                      Abrir
                    </button>
                    <button
                      type="button"
                      disabled={busyId === row.id}
                      className={`${ui.btnGhost} px-2 py-1.5 text-xs`}
                      onClick={() => void descartar(row.id)}
                    >
                      Descartar
                    </button>
                  </div>
                </div>
                {row.comentarios ? (
                  <p className={`text-xs leading-relaxed ${ui.textBody}`}>{row.comentarios}</p>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
