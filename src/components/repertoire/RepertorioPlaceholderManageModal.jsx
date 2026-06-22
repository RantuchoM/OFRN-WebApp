import React, { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  IconLoader,
  IconPlus,
  IconTrash,
  IconX,
  IconCheck,
  IconSearch,
} from "../ui/Icons";
import OrganicoVientosAddField from "./OrganicoVientosAddField";
import RepertoireWorkPickerModal from "./RepertoireWorkPickerModal";
import { inputToSeconds, formatSecondsToTime } from "../../utils/time";
import {
  fetchPlaceholderOpciones,
  addPlaceholderOpcion,
  removePlaceholderOpcion,
  assignDefinitivePlaceholder,
} from "../../services/repertorioPlaceholderOpciones";

function secondsToMmSsDurationInput(seconds) {
  const n = Math.max(0, Math.floor(Number(seconds) || 0));
  if (n <= 0) return "";
  const m = Math.floor(n / 60);
  const s = n % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function getObraLabel(obra) {
  if (!obra) return "Obra";
  const comps =
    obra.obras_compositores
      ?.filter((oc) => oc.rol === "compositor" || !oc.rol)
      ?.map((oc) => oc.compositores?.apellido)
      .filter(Boolean)
      .join(" / ") || "";
  const titulo = String(obra.titulo || "").replace(/<[^>]*>?/gm, "").trim();
  return comps ? `${comps}: ${titulo}` : titulo;
}

export default function RepertorioPlaceholderManageModal({
  supabase,
  item,
  programId = null,
  isDefinitionMode,
  isEditor,
  initialTab = "datos",
  onClose,
  onSave,
  onDelete,
  onAssigned,
}) {
  const [tab, setTab] = useState(initialTab);
  const [draft, setDraft] = useState({
    titulo: "",
    instrumentacion: "",
    duracion: "",
    notas: "",
    excluir: false,
    estado_curaduria: "Propuesto",
    observacion_curaduria: "",
  });
  const [saving, setSaving] = useState(false);
  const [opciones, setOpciones] = useState([]);
  const [loadingOpciones, setLoadingOpciones] = useState(false);
  const [showWorkPicker, setShowWorkPicker] = useState(false);
  const [selectedAssignIds, setSelectedAssignIds] = useState(new Set());

  const loadOpciones = useCallback(async () => {
    if (!item?.id || !isEditor) return;
    setLoadingOpciones(true);
    try {
      const rows = await fetchPlaceholderOpciones(supabase, item.id);
      setOpciones(rows);
      setSelectedAssignIds(new Set(rows.map((o) => o.id_obra)));
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingOpciones(false);
    }
  }, [supabase, item?.id, isEditor]);

  useEffect(() => {
    if (!item) return;
    const durSec = item.duracion_segundos_concierto;
    setDraft({
      titulo: item.titulo_placeholder || "",
      instrumentacion: item.instrumentacion_placeholder || "",
      duracion:
        durSec != null && Number(durSec) > 0
          ? secondsToMmSsDurationInput(durSec)
          : "",
      notas: item.notas_especificas || "",
      excluir: !!item.excluir,
      estado_curaduria: item.estado_curaduria || "Propuesto",
      observacion_curaduria: item.observacion_curaduria || "",
    });
    setTab(initialTab);
    loadOpciones();
  }, [item, initialTab, loadOpciones]);

  if (!item) return null;

  const handleSave = async () => {
    const tituloTrim = String(draft.titulo || "").trim();
    if (!tituloTrim) {
      alert("El título es obligatorio.");
      return;
    }
    setSaving(true);
    const duracionSeg =
      String(draft.duracion || "").trim() === ""
        ? null
        : inputToSeconds(String(draft.duracion).trim());
    const result = await onSave({
      titulo_placeholder: tituloTrim,
      instrumentacion_placeholder:
        String(draft.instrumentacion || "").trim() || null,
      duracion_segundos_concierto: duracionSeg,
      notas_especificas: String(draft.notas || "").trim() || null,
      excluir: !!draft.excluir,
      estado_curaduria: draft.estado_curaduria,
      observacion_curaduria:
        String(draft.observacion_curaduria || "").trim() || null,
    });
    setSaving(false);
    if (result?.error) {
      alert(result.error);
      return;
    }
    onClose();
  };

  const handleDelete = async () => {
    if (
      !confirm(
        "¿Eliminar este slot a definir? Se borrarán también sus opciones.",
      )
    ) {
      return;
    }
    setSaving(true);
    await onDelete(item.id);
    setSaving(false);
    onClose();
  };

  const handleAddOpcion = async (obraId) => {
    setSaving(true);
    try {
      await addPlaceholderOpcion(supabase, item.id, obraId);
      await loadOpciones();
    } catch (e) {
      alert(e.message || "No se pudo agregar la opción.");
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveOpcion = async (opcionId) => {
    setSaving(true);
    try {
      await removePlaceholderOpcion(supabase, opcionId);
      await loadOpciones();
    } catch (e) {
      alert(e.message || "No se pudo quitar la opción.");
    } finally {
      setSaving(false);
    }
  };

  const handleAssign = async (obraIds) => {
    if (
      !confirm(
        obraIds.length === 1
          ? "¿Confirmar asignación definitiva de esta obra? El slot a definir será reemplazado."
          : `¿Confirmar asignación de ${obraIds.length} obras? El slot será reemplazado.`,
      )
    ) {
      return;
    }
    setSaving(true);
    try {
      const result = await assignDefinitivePlaceholder(supabase, item, obraIds);
      if (result?.error) {
        alert(result.error);
        return;
      }
      onAssigned?.();
      onClose();
    } catch (e) {
      alert(e.message || "Error en asignación definitiva.");
    } finally {
      setSaving(false);
    }
  };

  const toggleAssignId = (obraId) => {
    setSelectedAssignIds((prev) => {
      const next = new Set(prev);
      if (next.has(obraId)) next.delete(obraId);
      else next.add(obraId);
      return next;
    });
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-white w-full max-w-2xl rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 max-h-[92vh]"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="p-3 border-b flex justify-between items-center bg-violet-50 gap-2 shrink-0">
          <div className="min-w-0">
            <h3 className="font-bold text-violet-900 text-sm truncate">
              {item.titulo_placeholder || "Slot a definir"}
            </h3>
            <p className="text-[10px] text-violet-700 mt-0.5">
              Planificación sin obra en catálogo
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 shrink-0"
            aria-label="Cerrar"
          >
            <IconX size={20} />
          </button>
        </div>

        {isEditor && (
          <div className="flex border-b bg-slate-50 shrink-0">
            {[
              { id: "datos", label: "Datos del slot" },
              { id: "opciones", label: `Opciones (${opciones.length})` },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`flex-1 px-3 py-2 text-xs font-bold uppercase tracking-wide border-b-2 transition-colors ${
                  tab === t.id
                    ? "border-violet-600 text-violet-800 bg-white"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}

        <div className="p-4 space-y-3 overflow-y-auto flex-1 min-h-0">
          {(!isEditor || tab === "datos") && (
            <>
              {!isEditor ? (
                <p className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded p-2">
                  Solo lectura. Los editores del programa pueden modificar este
                  slot y sus opciones.
                </p>
              ) : null}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-500">
                  Título *
                </label>
                {isEditor ? (
                  <input
                    type="text"
                    className="w-full p-2 border border-violet-200 rounded text-sm outline-none focus:border-violet-400 bg-white"
                    value={draft.titulo}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, titulo: e.target.value }))
                    }
                  />
                ) : (
                  <p className="text-sm font-semibold text-slate-800">
                    {draft.titulo}
                  </p>
                )}
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-500">
                  Orgánico estimado
                </label>
                {isEditor ? (
                  <OrganicoVientosAddField
                    variant="inline"
                    allowSuffix
                    value={draft.instrumentacion}
                    onChange={(v) =>
                      setDraft((d) => ({ ...d, instrumentacion: v }))
                    }
                    className="w-full p-2 border border-violet-200 rounded text-sm font-mono text-left"
                  />
                ) : (
                  <p className="text-sm font-mono text-slate-600">
                    {draft.instrumentacion || "—"}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-slate-500">
                    Duración
                  </label>
                  {isEditor ? (
                    <input
                      type="text"
                      className="w-full p-2 border border-violet-200 rounded text-sm font-mono"
                      placeholder="mm:ss"
                      value={draft.duracion}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, duracion: e.target.value }))
                      }
                    />
                  ) : (
                    <p className="text-sm font-mono text-slate-600">
                      {draft.duracion
                        ? formatSecondsToTime(
                            inputToSeconds(draft.duracion.trim()),
                          )
                        : "—"}
                    </p>
                  )}
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-500">
                  Notas de programa
                </label>
                {isEditor ? (
                  <textarea
                    className="w-full p-2 border border-slate-200 rounded text-sm min-h-[3rem] resize-y"
                    value={draft.notas}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, notas: e.target.value }))
                    }
                  />
                ) : (
                  <p className="text-sm text-slate-600 whitespace-pre-wrap">
                    {draft.notas || "—"}
                  </p>
                )}
              </div>
              {isEditor && (
                <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    className="accent-red-600"
                    checked={draft.excluir}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, excluir: e.target.checked }))
                    }
                  />
                  Excluir de la programación
                </label>
              )}
              {isDefinitionMode && isEditor && (
                <div className="space-y-2 pt-2 border-t border-amber-100">
                  <label className="text-[10px] font-bold uppercase text-amber-800">
                    Curaduría
                  </label>
                  <select
                    value={draft.estado_curaduria}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        estado_curaduria: e.target.value,
                      }))
                    }
                    className="w-full text-sm px-2 py-1.5 rounded border border-amber-300 bg-amber-50"
                  >
                    <option value="Propuesto">Propuesto</option>
                    <option value="Aceptado">Aceptado</option>
                    <option value="Rechazado">Rechazado</option>
                  </select>
                  <input
                    type="text"
                    className="w-full text-sm px-2 py-1.5 rounded border border-slate-200"
                    placeholder="Observación de curaduría..."
                    value={draft.observacion_curaduria}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        observacion_curaduria: e.target.value,
                      }))
                    }
                  />
                </div>
              )}
            </>
          )}

          {isEditor && tab === "opciones" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase text-slate-500 flex items-center gap-1">
                  <IconSearch size={12} /> Explorar catálogo
                </label>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setShowWorkPicker(true)}
                  className="w-full py-2.5 rounded-lg border border-violet-200 bg-violet-50/50 text-violet-800 text-xs font-bold hover:bg-violet-100 flex items-center justify-center gap-2"
                >
                  <IconSearch size={14} />
                  Buscar obras (filtros y orgánico de la gira)
                </button>
                <p className="text-[10px] text-slate-400">
                  Las obras ya elegidas aparecen marcadas como «En opciones».
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="text-[10px] font-bold uppercase text-slate-500">
                  Obras opcionales ({opciones.length})
                </h4>
                {loadingOpciones ? (
                  <p className="text-xs text-slate-400">Cargando…</p>
                ) : opciones.length === 0 ? (
                  <p className="text-xs text-slate-400 italic border border-dashed border-violet-200 rounded p-3 text-center">
                    Sin opciones aún. Usá «Buscar obras» para agregar desde el
                    catálogo.
                  </p>
                ) : (
                  <ul className="space-y-1.5">
                    {opciones.map((op) => (
                      <li
                        key={op.id}
                        className="flex items-start gap-2 p-2 rounded border border-violet-100 bg-violet-50/40"
                      >
                        <input
                          type="checkbox"
                          className="mt-1 accent-violet-600"
                          checked={selectedAssignIds.has(op.id_obra)}
                          onChange={() => toggleAssignId(op.id_obra)}
                          title="Incluir en asignación definitiva"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-800 truncate">
                            {getObraLabel(op.obras)}
                          </p>
                          {op.obras?.instrumentacion && (
                            <p className="text-[10px] font-mono text-slate-500 truncate">
                              {op.obras.instrumentacion}
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => handleRemoveOpcion(op.id)}
                          className="shrink-0 p-1 text-slate-400 hover:text-red-600 rounded"
                          title="Quitar opción"
                        >
                          <IconTrash size={14} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {opciones.length > 0 && (
                <div className="pt-3 border-t border-violet-100 space-y-2">
                  <h4 className="text-[10px] font-bold uppercase text-violet-800">
                    Asignación definitiva
                  </h4>
                  <p className="text-[10px] text-slate-500">
                    Reemplaza este slot por la(s) obra(s) elegida(s). Se
                    eliminará el placeholder y sus opciones restantes.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={
                        saving || selectedAssignIds.size === 0
                      }
                      onClick={() =>
                        handleAssign([...selectedAssignIds])
                      }
                      className="px-3 py-1.5 rounded text-xs font-bold bg-emerald-700 text-white hover:bg-emerald-800 disabled:opacity-50 flex items-center gap-1"
                    >
                      <IconCheck size={12} />
                      Asignar seleccionadas ({selectedAssignIds.size})
                    </button>
                    <button
                      type="button"
                      disabled={saving || opciones.length === 0}
                      onClick={() =>
                        handleAssign(opciones.map((o) => o.id_obra))
                      }
                      className="px-3 py-1.5 rounded text-xs font-medium border border-emerald-300 text-emerald-800 hover:bg-emerald-50 disabled:opacity-50"
                    >
                      Asignar todas ({opciones.length})
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-3 border-t bg-slate-50 flex flex-wrap justify-between gap-2 shrink-0">
          {isEditor ? (
            <>
              <button
                type="button"
                onClick={handleDelete}
                disabled={saving}
                className="px-3 py-1.5 rounded text-xs font-medium text-red-600 hover:bg-red-50 border border-red-200 disabled:opacity-50 flex items-center gap-1"
              >
                <IconTrash size={12} /> Eliminar slot
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={saving}
                  className="px-3 py-1.5 rounded text-xs font-medium text-slate-600 hover:bg-white border border-slate-200"
                >
                  Cancelar
                </button>
                {(tab === "datos" || !isEditor) && (
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving || !draft.titulo.trim()}
                    className="px-3 py-1.5 rounded text-xs font-bold bg-violet-700 text-white hover:bg-violet-800 disabled:opacity-50 flex items-center gap-1"
                  >
                    {saving && (
                      <IconLoader size={12} className="animate-spin" />
                    )}
                    Guardar
                  </button>
                )}
              </div>
            </>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="ml-auto px-3 py-1.5 rounded text-xs font-medium text-slate-600 hover:bg-white border border-slate-200"
            >
              Cerrar
            </button>
          )}
        </div>
      </div>

      {showWorkPicker && (
        <RepertoireWorkPickerModal
          supabase={supabase}
          programId={programId}
          onClose={() => setShowWorkPicker(false)}
          mode="toggle"
          title="Agregar obras opcionales"
          accent="violet"
          showCreateRequest={false}
          selectedWorkIds={opciones.map((o) => o.id_obra)}
          onToggleWork={async (workId, willSelect) => {
            if (willSelect) {
              await handleAddOpcion(workId);
            } else {
              const op = opciones.find((o) => Number(o.id_obra) === Number(workId));
              if (op) await handleRemoveOpcion(op.id);
            }
          }}
        />
      )}
    </div>,
    document.body,
  );
}
