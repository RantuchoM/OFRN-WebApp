import React, { useEffect, useMemo, useState } from "react";
import DateInput from "../ui/DateInput";
import ConfirmDialog from "../ui/ConfirmDialog";
import { IconEdit, IconLoader, IconTrash, IconX } from "../ui/Icons";
import {
  deleteValorDiarioVigencia,
  insertValorDiarioVigencia,
  updateValorDiarioVigencia,
} from "../../services/viaticosValorDiarioService";

const fmtMoney = (val) => {
  const n = Number(val);
  const safe = Number.isFinite(n) ? n : 0;
  return safe.toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
};

const fmtDate = (iso) => {
  if (!iso) return "—";
  const [y, m, d] = String(iso).split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
};

const emptyEditDraft = () => ({
  vigencia_desde: "",
  monto: "",
  nota: "",
});

export default function ValorDiarioVigenciaAdminModal({
  open,
  onClose,
  vigencias = [],
  onSaved,
  client,
  fechaReferencia = "",
}) {
  const [vigenciaDesde, setVigenciaDesde] = useState("");
  const [monto, setMonto] = useState("");
  const [nota, setNota] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState(emptyEditDraft());
  const [deleteTarget, setDeleteTarget] = useState(null);

  const nextDesdeSugerida = useMemo(() => fechaReferencia || "", [fechaReferencia]);

  useEffect(() => {
    if (!open) return;
    setVigenciaDesde(nextDesdeSugerida || "");
    setMonto("");
    setNota("");
    setError("");
    setEditingId(null);
    setEditDraft(emptyEditDraft());
    setDeleteTarget(null);
  }, [open, nextDesdeSugerida]);

  if (!open) return null;

  const startEdit = (row) => {
    setEditingId(row.id);
    setEditDraft({
      vigencia_desde: row.vigencia_desde || "",
      monto: String(row.monto ?? ""),
      nota: row.nota || "",
    });
    setError("");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft(emptyEditDraft());
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await insertValorDiarioVigencia(
        {
          vigencia_desde: vigenciaDesde,
          monto,
          nota,
        },
        client,
      );
      await onSaved?.();
      onClose();
    } catch (err) {
      setError(err?.message || "No se pudo guardar la nueva vigencia.");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    setSaving(true);
    setError("");
    try {
      await updateValorDiarioVigencia(
        {
          id: editingId,
          vigencia_desde: editDraft.vigencia_desde,
          monto: editDraft.monto,
          nota: editDraft.nota,
        },
        client,
      );
      await onSaved?.();
      cancelEdit();
    } catch (err) {
      setError(err?.message || "No se pudo actualizar la vigencia.");
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget?.id) return;
    setSaving(true);
    setError("");
    try {
      await deleteValorDiarioVigencia(deleteTarget.id, client);
      await onSaved?.();
      if (editingId === deleteTarget.id) cancelEdit();
      setDeleteTarget(null);
    } catch (err) {
      setError(err?.message || "No se pudo eliminar la vigencia.");
      throw err;
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <div className="w-full max-w-3xl max-h-[90vh] overflow-hidden bg-white border border-slate-200 rounded-2xl shadow-2xl flex flex-col">
          <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-black text-slate-800">
                Valor diario — histórico y vigencias
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Cada franja aplica desde su fecha de inicio hasta que entra una nueva.
                Podés editar o eliminar tramos anteriores si te equivocaste.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="text-slate-400 hover:text-slate-600 disabled:opacity-40"
              aria-label="Cerrar"
            >
              <IconX size={20} />
            </button>
          </div>

          <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-600 text-xs">
                  <tr>
                    <th className="text-left px-3 py-2 font-black">Desde</th>
                    <th className="text-left px-3 py-2 font-black">Hasta</th>
                    <th className="text-right px-3 py-2 font-black">Monto</th>
                    <th className="text-left px-3 py-2 font-black">Nota</th>
                    <th className="text-right px-3 py-2 font-black">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {vigencias.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-6 text-center text-slate-400 text-xs">
                        Todavía no hay vigencias cargadas.
                      </td>
                    </tr>
                  ) : (
                    vigencias.map((row) => {
                      const isEditing = editingId === row.id;
                      return (
                        <tr
                          key={row.id}
                          className={!row.vigencia_hasta ? "bg-indigo-50/50" : ""}
                        >
                          <td className="px-3 py-2 font-medium text-slate-800">
                            {isEditing ? (
                              <DateInput
                                value={editDraft.vigencia_desde}
                                onChange={(v) =>
                                  setEditDraft((prev) => ({
                                    ...prev,
                                    vigencia_desde: v || "",
                                  }))
                                }
                                showDayName={false}
                                className="!py-1 !pl-7 !pr-2 !rounded-lg text-xs"
                              />
                            ) : (
                              fmtDate(row.vigencia_desde)
                            )}
                          </td>
                          <td className="px-3 py-2 text-slate-600">
                            {row.vigencia_hasta ? fmtDate(row.vigencia_hasta) : "Vigente"}
                          </td>
                          <td className="px-3 py-2 text-right font-black text-slate-800">
                            {isEditing ? (
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={editDraft.monto}
                                onChange={(e) =>
                                  setEditDraft((prev) => ({
                                    ...prev,
                                    monto: e.target.value,
                                  }))
                                }
                                className="w-full max-w-[120px] ml-auto border border-slate-300 rounded-lg px-2 py-1 text-sm text-right outline-none focus:ring-2 focus:ring-indigo-500/30"
                              />
                            ) : (
                              fmtMoney(row.monto)
                            )}
                          </td>
                          <td className="px-3 py-2 text-slate-500 text-xs">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editDraft.nota}
                                onChange={(e) =>
                                  setEditDraft((prev) => ({
                                    ...prev,
                                    nota: e.target.value,
                                  }))
                                }
                                className="w-full border border-slate-300 rounded-lg px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-indigo-500/30"
                                placeholder="Nota opcional"
                              />
                            ) : (
                              row.nota || "—"
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex items-center justify-end gap-1">
                              {isEditing ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={handleSaveEdit}
                                    disabled={
                                      saving ||
                                      !editDraft.vigencia_desde ||
                                      !editDraft.monto
                                    }
                                    className="px-2 py-1 text-[11px] font-black text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50"
                                  >
                                    Guardar
                                  </button>
                                  <button
                                    type="button"
                                    onClick={cancelEdit}
                                    disabled={saving}
                                    className="px-2 py-1 text-[11px] font-bold text-slate-600 hover:bg-slate-100 rounded-lg disabled:opacity-50"
                                  >
                                    Cancelar
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => startEdit(row)}
                                    disabled={saving || editingId != null}
                                    title="Editar franja"
                                    className="p-1.5 text-slate-500 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg disabled:opacity-40"
                                  >
                                    <IconEdit size={14} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setDeleteTarget(row)}
                                    disabled={saving || editingId != null}
                                    title="Eliminar franja"
                                    className="p-1.5 text-slate-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg disabled:opacity-40"
                                  >
                                    <IconTrash size={14} />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <form
              onSubmit={handleSubmit}
              className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-4 space-y-3"
            >
              <div className="text-xs font-black uppercase tracking-wider text-indigo-700">
                Nueva franja
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <label className="text-xs font-bold text-slate-600">
                  Vigente desde
                  <div className="mt-1">
                    <DateInput
                      value={vigenciaDesde}
                      onChange={setVigenciaDesde}
                      showDayName={false}
                      className="!py-1.5 !pl-8 !pr-2 !rounded-lg text-xs"
                    />
                  </div>
                </label>
                <label className="text-xs font-bold text-slate-600">
                  Monto
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={monto}
                    onChange={(e) => setMonto(e.target.value)}
                    className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/30"
                    placeholder="Ej: 85000"
                  />
                </label>
                <label className="text-xs font-bold text-slate-600 sm:col-span-1">
                  Nota (opcional)
                  <input
                    type="text"
                    value={nota}
                    onChange={(e) => setNota(e.target.value)}
                    className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/30"
                    placeholder="Resolución, referencia…"
                  />
                </label>
              </div>
              <p className="text-[11px] text-slate-500">
                La franja anterior abierta se cerrará el día anterior a la fecha indicada.
              </p>
              {error ? (
                <p className="text-xs text-rose-700 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2">
                  {error}
                </p>
              ) : null}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={saving}
                  className="px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving || !vigenciaDesde || !monto || editingId != null}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition disabled:opacity-50"
                >
                  {saving ? <IconLoader size={14} className="animate-spin" /> : null}
                  {saving ? "Guardando…" : "Agregar vigencia"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => {
          if (!saving) setDeleteTarget(null);
        }}
        onConfirm={handleConfirmDelete}
        title="Eliminar franja de vigencia"
        message={
          deleteTarget
            ? `¿Eliminar la franja desde ${fmtDate(deleteTarget.vigencia_desde)} (${fmtMoney(deleteTarget.monto)})? Las fechas de las franjas restantes se reajustarán automáticamente.`
            : ""
        }
        confirmText="Eliminar"
        confirmClassName="px-4 py-2.5 sm:py-2 text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-md hover:shadow-lg transition-all active:scale-[0.98]"
        confirmLoading={saving}
        loadingText="Eliminando…"
        overlayClassName="z-[110]"
      />
    </>
  );
}
