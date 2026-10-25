import React, { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import {
  IconAlertTriangle,
  IconLoader,
  IconPlus,
  IconTrash,
  IconX,
} from "../ui/Icons";
import {
  deleteGiraDemoraLocalidad,
  upsertGiraDemoraLocalidad,
} from "../../services/giraProyeccionService";

function minutesToHm(totalMin) {
  const n = Math.max(0, Math.round(Number(totalMin) || 0));
  return { h: Math.floor(n / 60), m: n % 60 };
}

function hmToMinutes(h, m) {
  const hh = Math.max(0, Math.floor(Number(h) || 0));
  const mm = Math.min(59, Math.max(0, Math.floor(Number(m) || 0)));
  return hh * 60 + mm;
}

function demoraRowKey(d) {
  return `${d.id_localidad_origen}|${d.id_localidad_destino}`;
}

/**
 * Modal z-[100]: elegir una localidad y ver/editar/agregar demoras desde/hacia ella.
 */
export default function DemorasLocalidadModal({
  open,
  onClose,
  localidades = [],
  demoras = [],
  onDemorasChange,
  missingPairs = [],
  locsSinConexion = [],
  locNameById,
}) {
  const [focusLocId, setFocusLocId] = useState("");
  const [newDestino, setNewDestino] = useState("");
  const [newH, setNewH] = useState(0);
  const [newM, setNewM] = useState(0);
  const [adding, setAdding] = useState(false);
  const [busyKey, setBusyKey] = useState(null);

  const focusId = Number(focusLocId) || null;

  const rowsForFocus = useMemo(() => {
    if (!focusId) return [];
    return demoras
      .filter(
        (d) =>
          Number(d.id_localidad_origen) === focusId ||
          Number(d.id_localidad_destino) === focusId,
      )
      .map((d) => {
        const fromFocus = Number(d.id_localidad_origen) === focusId;
        return {
          ...d,
          peerId: fromFocus
            ? Number(d.id_localidad_destino)
            : Number(d.id_localidad_origen),
          peerNombre: fromFocus ? d.destino_nombre : d.origen_nombre,
          sentido: fromFocus ? "salida" : "llegada",
        };
      })
      .sort((a, b) =>
        String(a.peerNombre || "").localeCompare(String(b.peerNombre || ""), "es"),
      );
  }, [demoras, focusId]);

  const otherLocs = useMemo(() => {
    if (!focusId) return localidades;
    return localidades.filter((l) => Number(l.id) !== focusId);
  }, [localidades, focusId]);

  const enrich = (row) => ({
    ...row,
    origen_nombre:
      locNameById?.get?.(Number(row.id_localidad_origen)) ||
      row.origen_nombre ||
      `loc ${row.id_localidad_origen}`,
    destino_nombre:
      locNameById?.get?.(Number(row.id_localidad_destino)) ||
      row.destino_nombre ||
      `loc ${row.id_localidad_destino}`,
  });

  const patchMinutos = async (row, minutos) => {
    const key = demoraRowKey(row);
    setBusyKey(key);
    try {
      const saved = await upsertGiraDemoraLocalidad({
        id_localidad_origen: row.id_localidad_origen,
        id_localidad_destino: row.id_localidad_destino,
        minutos,
      });
      const enriched = enrich(saved);
      onDemorasChange?.((prev) =>
        prev.map((d) =>
          demoraRowKey(d) === demoraRowKey(enriched) ? enriched : d,
        ),
      );
      toast.success("Demora actualizada");
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "No se pudo guardar demora");
    } finally {
      setBusyKey(null);
    }
  };

  const onAdd = async () => {
    if (!focusId) {
      toast.error("Elegí una localidad");
      return;
    }
    const d = Number(newDestino);
    if (!d) {
      toast.error("Elegí destino / origen de conexión");
      return;
    }
    if (d === focusId) {
      toast.error("La otra localidad debe ser distinta");
      return;
    }
    const exists = demoras.some(
      (r) =>
        Number(r.id_localidad_origen) === focusId &&
        Number(r.id_localidad_destino) === d,
    );
    if (exists) {
      toast.error("Ese tramo ya existe (desde esta localidad)");
      return;
    }
    setAdding(true);
    try {
      const saved = await upsertGiraDemoraLocalidad({
        id_localidad_origen: focusId,
        id_localidad_destino: d,
        minutos: hmToMinutes(newH, newM),
      });
      const enriched = enrich(saved);
      onDemorasChange?.((prev) =>
        [...prev, enriched].sort((a, b) =>
          `${a.origen_nombre}|${a.destino_nombre}`.localeCompare(
            `${b.origen_nombre}|${b.destino_nombre}`,
            "es",
          ),
        ),
      );
      setNewDestino("");
      setNewH(0);
      setNewM(0);
      toast.success("Tramo agregado");
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "No se pudo agregar");
    } finally {
      setAdding(false);
    }
  };

  const onDelete = async (row) => {
    const key = demoraRowKey(row);
    setBusyKey(key);
    try {
      await deleteGiraDemoraLocalidad(
        row.id_localidad_origen,
        row.id_localidad_destino,
      );
      onDemorasChange?.((prev) =>
        prev.filter((d) => demoraRowKey(d) !== demoraRowKey(row)),
      );
      toast.success("Tramo eliminado");
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "No se pudo eliminar");
    } finally {
      setBusyKey(null);
    }
  };

  const onQuickAddMissing = async (pair) => {
    setFocusLocId(String(pair.id_localidad_origen));
    setNewDestino(String(pair.id_localidad_destino));
  };

  if (!open) return null;

  const hasAlerts = missingPairs.length > 0 || locsSinConexion.length > 0;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/50 p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Demoras localidad"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div className="my-4 w-full max-w-3xl rounded-xl bg-white shadow-2xl sm:my-8">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Demoras localidad → localidad
            </h2>
            <p className="text-[11px] text-slate-500">
              Elegí una localidad y editá todas sus conexiones (impacta PCV).
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50"
            aria-label="Cerrar"
          >
            <IconX size={16} />
          </button>
        </div>

        {hasAlerts ? (
          <div className="mx-4 mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-950">
            <div className="mb-1 flex items-center gap-1.5 font-bold">
              <IconAlertTriangle size={14} className="text-amber-700" />
              Conexiones faltantes para la temporada
            </div>
            {locsSinConexion.length > 0 ? (
              <p className="mb-1">
                Localidades de giras sin ningún tramo de demora:{" "}
                <span className="font-semibold">
                  {locsSinConexion.map((l) => l.localidad).join(", ")}
                </span>
              </p>
            ) : null}
            {missingPairs.length > 0 ? (
              <ul className="mt-1 max-h-28 space-y-0.5 overflow-y-auto">
                {missingPairs.map((p) => (
                  <li
                    key={`${p.id_localidad_origen}-${p.id_localidad_destino}`}
                    className="flex flex-wrap items-center gap-2"
                  >
                    <span>
                      {p.origen_nombre} ↔ {p.destino_nombre}
                    </span>
                    <button
                      type="button"
                      onClick={() => onQuickAddMissing(p)}
                      className="rounded border border-amber-300 bg-white px-1.5 py-0.5 text-[10px] font-bold text-amber-900 hover:bg-amber-100"
                    >
                      Completar
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}

        <div className="space-y-3 px-4 py-3">
          <label className="block text-[10px] font-bold uppercase text-slate-500">
            Localidad
            <select
              value={focusLocId}
              onChange={(e) => setFocusLocId(e.target.value)}
              className="mt-1 block w-full rounded border border-slate-300 bg-white px-2 py-2 text-sm text-slate-800"
            >
              <option value="">— Elegí localidad —</option>
              {localidades.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.localidad}
                </option>
              ))}
            </select>
          </label>

          {focusId ? (
            <>
              <div className="flex flex-wrap items-end gap-2 rounded-lg border border-slate-100 bg-slate-50/80 p-2">
                <label className="text-[10px] font-medium text-slate-600">
                  Conectar con
                  <select
                    value={newDestino}
                    onChange={(e) => setNewDestino(e.target.value)}
                    className="mt-0.5 block min-w-[10rem] rounded border border-slate-200 bg-white px-2 py-1 text-xs"
                  >
                    <option value="">—</option>
                    {otherLocs.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.localidad}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-[10px] font-medium text-slate-600">
                  Duración
                  <div className="mt-0.5 inline-flex items-center gap-1">
                    <input
                      type="number"
                      min="0"
                      value={newH}
                      onChange={(e) => setNewH(e.target.value)}
                      className="w-14 rounded border border-slate-200 bg-white px-1 py-1 text-right text-xs"
                    />
                    <span className="text-slate-500">h</span>
                    <input
                      type="number"
                      min="0"
                      max="59"
                      value={newM}
                      onChange={(e) => setNewM(e.target.value)}
                      className="w-12 rounded border border-slate-200 bg-white px-1 py-1 text-right text-xs"
                    />
                    <span className="text-slate-500">min</span>
                  </div>
                </label>
                <button
                  type="button"
                  disabled={adding}
                  onClick={onAdd}
                  className="inline-flex items-center gap-1 rounded-md border border-orange-200 bg-orange-50 px-2.5 py-1.5 text-[11px] font-bold text-orange-900 hover:bg-orange-100 disabled:opacity-50"
                >
                  {adding ? (
                    <IconLoader size={13} className="animate-spin" />
                  ) : (
                    <IconPlus size={13} />
                  )}
                  Agregar
                </button>
              </div>

              <div className="max-h-[min(50vh,24rem)] overflow-auto rounded-lg border border-slate-200">
                <table className="min-w-full text-left text-[11px]">
                  <thead className="sticky top-0 bg-slate-50 text-[10px] uppercase text-slate-500">
                    <tr>
                      <th className="px-2 py-1.5">Conexión</th>
                      <th className="px-2 py-1.5">Sentido</th>
                      <th className="px-2 py-1.5">Duración</th>
                      <th className="w-8 px-2 py-1.5" />
                    </tr>
                  </thead>
                  <tbody>
                    {rowsForFocus.map((d) => {
                      const { h, m } = minutesToHm(d.minutos);
                      const key = demoraRowKey(d);
                      const busy = busyKey === key;
                      return (
                        <tr key={key} className="border-t border-slate-100">
                          <td className="px-2 py-1 font-medium text-slate-800">
                            {d.peerNombre}
                          </td>
                          <td className="px-2 py-1 text-slate-500">
                            {d.sentido === "salida"
                              ? "Desde aquí →"
                              : "→ Hacia aquí"}
                          </td>
                          <td className="px-2 py-1">
                            <div className="inline-flex items-center gap-1">
                              <input
                                type="number"
                                min="0"
                                disabled={busy}
                                defaultValue={h}
                                key={`${key}-h-${d.minutos}`}
                                onBlur={(e) =>
                                  patchMinutos(
                                    d,
                                    hmToMinutes(e.target.value, m),
                                  )
                                }
                                className="w-14 rounded border border-slate-200 px-1 py-0.5 text-right disabled:opacity-50"
                              />
                              <span className="text-slate-500">h</span>
                              <input
                                type="number"
                                min="0"
                                max="59"
                                disabled={busy}
                                defaultValue={m}
                                key={`${key}-m-${d.minutos}`}
                                onBlur={(e) =>
                                  patchMinutos(
                                    d,
                                    hmToMinutes(h, e.target.value),
                                  )
                                }
                                className="w-12 rounded border border-slate-200 px-1 py-0.5 text-right disabled:opacity-50"
                              />
                              <span className="text-slate-500">min</span>
                            </div>
                          </td>
                          <td className="px-2 py-1">
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => onDelete(d)}
                              className="rounded border border-slate-200 p-1 text-slate-400 hover:border-rose-200 hover:text-rose-600 disabled:opacity-40"
                              title="Eliminar"
                            >
                              <IconTrash size={12} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {!rowsForFocus.length && (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-3 py-4 text-center text-slate-500"
                        >
                          Sin tramos para esta localidad. Agregá una conexión.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <p className="py-6 text-center text-xs text-slate-400">
              Seleccioná una localidad para ver y editar sus demoras.
            </p>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
