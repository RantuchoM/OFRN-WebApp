import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useViaticosManualAuth } from "../../context/ViaticosManualAuthContext";
import {
  deleteAllRendicionesGuardadas,
  deleteAllViaticosGuardados,
  deleteRendicionGuardada,
  deleteViaticoGuardado,
  listRendicionesGuardadas,
  listViaticosGuardados,
  resolveRecordLabels,
} from "../../services/viaticosManualService";
import {
  formatSavedDate,
  VIATICO_ORIGEN_SESSION_KEY,
  writeViaticoToStorage,
} from "../../utils/viaticosManualStorage";
import ManualOpenChoiceModal from "./ManualOpenChoiceModal";
import ManualDeleteConfirmDialog from "./ManualDeleteConfirmDialog";

const computeDefaultAnt = (b) => {
  const toNumber = (v) => {
    if (v === null || v === undefined || v === "") return 0;
    const n = parseFloat(String(v).replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  };
  const dias = toNumber(b?.dias_computables);
  const vd = toNumber(b?.valorDiarioCalc || b?.valor_diario_base);
  return {
    rendicion_viaticos: dias * vd,
    rendicion_gasto_alojamiento: toNumber(b?.gasto_alojamiento),
    rendicion_transporte_otros: toNumber(b?.gasto_pasajes || b?.gastos_movilidad),
    rendicion_gasto_combustible: toNumber(b?.gasto_combustible),
    rendicion_gastos_movil_otros: toNumber(b?.gastos_movil_otros),
    rendicion_gastos_capacit: toNumber(b?.gastos_capacit),
    rendicion_gasto_ceremonial: toNumber(b?.gasto_ceremonial),
    rendicion_gasto_otros: toNumber(b?.gasto_otros),
  };
};

export default function ManualSavedPanel() {
  const navigate = useNavigate();
  const { savedPanelOpen, closeSavedPanel, loadSavedViatico, loadSavedRendicion } =
    useViaticosManualAuth();
  const [tab, setTab] = useState("viaticos");
  const [viaticos, setViaticos] = useState([]);
  const [rendiciones, setRendiciones] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [openChoice, setOpenChoice] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [v, r] = await Promise.all([listViaticosGuardados(), listRendicionesGuardadas()]);
      setViaticos(v);
      setRendiciones(r);
    } catch (e) {
      setError(e?.message || "No se pudieron cargar los guardados.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (savedPanelOpen) refresh();
  }, [savedPanelOpen, refresh]);

  if (!savedPanelOpen) return null;

  const recordType = tab === "viaticos" ? "viatico" : "rendicion";

  const handleDeleteRequest = (item) => {
    const { displayName, descriptiveLabel } = resolveRecordLabels(item, recordType);
    const noun = tab === "viaticos" ? "viático" : "rendición";
    setDeleteConfirm({
      item,
      title: `Eliminar ${noun}`,
      message: descriptiveLabel
        ? `¿Eliminar «${displayName}» (${descriptiveLabel})? Esta acción no se puede deshacer.`
        : `¿Eliminar «${displayName}»? Esta acción no se puede deshacer.`,
    });
  };

  const handleDeleteAllRequest = () => {
    const label = tab === "viaticos" ? "todos tus viáticos guardados" : "todas tus rendiciones guardadas";
    setDeleteConfirm({
      deleteAll: true,
      title: "Eliminar todos",
      message: `¿Eliminar ${label}? Se borrarán permanentemente tus registros en la nube. Esta acción no se puede deshacer.`,
    });
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    setError("");
    try {
      if (deleteConfirm.deleteAll) {
        if (tab === "viaticos") await deleteAllViaticosGuardados();
        else await deleteAllRendicionesGuardadas();
      } else if (tab === "viaticos") {
        await deleteViaticoGuardado(deleteConfirm.item.id);
      } else {
        await deleteRendicionGuardada(deleteConfirm.item.id);
      }
      setDeleteConfirm(null);
      await refresh();
    } catch (e) {
      setError(e?.message || "No se pudo eliminar.");
      throw e;
    } finally {
      setDeleting(false);
    }
  };

  const handleOpenItem = (item) => {
    const { displayName } = resolveRecordLabels(item, recordType);
    setOpenChoice({
      item,
      type: recordType,
      label: displayName,
    });
  };

  const applyOpenChoice = (mode) => {
    if (!openChoice) return;
    const payload = { record: openChoice.item, mode };
    if (openChoice.type === "viatico") {
      loadSavedViatico?.(payload);
    } else {
      loadSavedRendicion?.(payload);
    }
    setOpenChoice(null);
    closeSavedPanel();
  };

  const handleUseForRendicion = (record) => {
    const datos = record?.datos || {};
    const ant = computeDefaultAnt(datos);
    writeViaticoToStorage({ ...datos, manual_rendicion: { ant, rend: { ...ant } } });
    try {
      sessionStorage.setItem(VIATICO_ORIGEN_SESSION_KEY, record.id);
    } catch {
      /* ignore */
    }
    closeSavedPanel();
    navigate("/rendiciones-manual");
  };

  const items = tab === "viaticos" ? viaticos : rendiciones;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
        <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-2xl flex flex-col max-h-[85vh]">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-800">Mis guardados</h2>
              <p className="text-xs text-slate-500">Viáticos y rendiciones en la nube</p>
            </div>
            <button
              type="button"
              onClick={closeSavedPanel}
              className="text-slate-400 hover:text-slate-600 text-2xl leading-none"
              aria-label="Cerrar"
            >
              ×
            </button>
          </div>

          <div className="px-5 pt-3 flex gap-2">
            <button
              type="button"
              onClick={() => setTab("viaticos")}
              className={`px-3 py-1.5 text-xs font-black rounded-lg transition ${
                tab === "viaticos"
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Viáticos ({viaticos.length})
            </button>
            <button
              type="button"
              onClick={() => setTab("rendiciones")}
              className={`px-3 py-1.5 text-xs font-black rounded-lg transition ${
                tab === "rendiciones"
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Rendiciones ({rendiciones.length})
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2">
            {loading && <p className="text-sm text-slate-500">Cargando…</p>}
            {error && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                {error}
              </div>
            )}
            {!loading && items.length === 0 && (
              <p className="text-sm text-slate-500 py-6 text-center">
                No tenés {tab === "viaticos" ? "viáticos" : "rendiciones"} guardados.
              </p>
            )}
            {items.map((item) => {
              const { displayName, descriptiveLabel } = resolveRecordLabels(item, recordType);
              return (
                <div
                  key={item.id}
                  className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 space-y-2"
                >
                  <div>
                    <p className="text-sm font-bold text-slate-800">{displayName}</p>
                    {descriptiveLabel ? (
                      <p className="text-xs text-indigo-700 mt-0.5">{descriptiveLabel}</p>
                    ) : null}
                    <p className="text-[11px] text-slate-500 mt-1">
                      {formatSavedDate(item.updated_at || item.created_at)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenItem(item)}
                      className="px-2.5 py-1 text-xs font-black bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                    >
                      Abrir
                    </button>
                    {tab === "viaticos" && (
                      <button
                        type="button"
                        onClick={() => handleUseForRendicion(item)}
                        className="px-2.5 py-1 text-xs font-black bg-white border border-indigo-200 text-indigo-700 rounded-lg hover:bg-indigo-50"
                      >
                        Usar para rendición
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDeleteRequest(item)}
                      className="px-2.5 py-1 text-xs font-black text-rose-700 bg-rose-50 rounded-lg hover:bg-rose-100"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {items.length > 0 && (
            <div className="px-5 py-3 border-t border-slate-100">
              <button
                type="button"
                onClick={handleDeleteAllRequest}
                className="w-full px-3 py-2 text-xs font-black text-rose-700 bg-rose-50 rounded-lg hover:bg-rose-100"
              >
                Eliminar todos
              </button>
            </div>
          )}
        </div>
      </div>

      <ManualOpenChoiceModal
        open={Boolean(openChoice)}
        label={openChoice?.label || ""}
        type={openChoice?.type || "viatico"}
        onClose={() => setOpenChoice(null)}
        onEditOriginal={() => applyOpenChoice("edit")}
        onDuplicate={() => applyOpenChoice("duplicate")}
      />

      <ManualDeleteConfirmDialog
        isOpen={Boolean(deleteConfirm)}
        onClose={() => !deleting && setDeleteConfirm(null)}
        onConfirm={handleConfirmDelete}
        title={deleteConfirm?.title || "Eliminar"}
        message={deleteConfirm?.message || ""}
        confirmLoading={deleting}
      />
    </>
  );
}
