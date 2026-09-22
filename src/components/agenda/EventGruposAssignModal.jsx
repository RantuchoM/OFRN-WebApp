import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { IconCheck, IconLoader, IconTag, IconX } from "../ui/Icons";
import {
  eventGrupoIdsFromEvent,
  setEventoGrupos,
} from "../../services/giraGruposService";

function grupoIdsKey(ids) {
  return [...new Set((ids || []).map(Number).filter(Number.isFinite))]
    .sort((a, b) => a - b)
    .join(",");
}

function eventListFingerprint(eventList) {
  return eventList.map((e) => String(e?.id ?? "")).join("|");
}

function initialGrupoIdsForEvents(eventList) {
  if (!eventList.length) return [];
  const first = eventGrupoIdsFromEvent(eventList[0]);
  const key = grupoIdsKey(first);
  const allSame = eventList.every(
    (e) => grupoIdsKey(eventGrupoIdsFromEvent(e)) === key,
  );
  return allSame ? first : [];
}

function eventPlainLabel(evt) {
  return (
    evt?.descripcion?.replace(/<[^>]+>/g, "").trim() ||
    evt?.tipos_evento?.nombre ||
    "Evento"
  );
}

/**
 * Modal portal: checklist de grupos de convocatoria para uno o varios eventos.
 */
export default function EventGruposAssignModal({
  isOpen,
  evt,
  events = null,
  grupoOptions = [],
  supabase,
  onClose,
  onSaved,
}) {
  const [selected, setSelected] = useState([]);
  const [saving, setSaving] = useState(false);
  const eventList = useMemo(
    () =>
      (Array.isArray(events) && events.length > 0
        ? events
        : evt
          ? [evt]
          : []
      ).filter(Boolean),
    [events, evt],
  );
  const fingerprint = eventListFingerprint(eventList);

  useEffect(() => {
    if (!isOpen || eventList.length === 0) return;
    setSelected(initialGrupoIdsForEvents(eventList));
    // fingerprint cubre identidad; eventList cambia de referencia cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, fingerprint]);

  if (!isOpen || eventList.length === 0) return null;

  const isBulk = eventList.length > 1;
  const mixedTags =
    isBulk &&
    !eventList.every(
      (e) =>
        grupoIdsKey(eventGrupoIdsFromEvent(e)) ===
        grupoIdsKey(eventGrupoIdsFromEvent(eventList[0])),
    );
  const selectedSet = new Set(selected.map(Number));
  const primary = eventList[0];

  const toggleGrupo = (id) => {
    const n = Number(id);
    setSelected((prev) => {
      const has = prev.some((x) => Number(x) === n);
      return has
        ? prev.filter((x) => Number(x) !== n)
        : [...prev.map(Number), n];
    });
  };

  const handleSave = async () => {
    if (!supabase || eventList.length === 0) return;
    setSaving(true);
    try {
      const ids = [];
      for (const row of eventList) {
        if (!row?.id) continue;
        const { error } = await setEventoGrupos(supabase, row.id, selected);
        if (error) throw error;
        ids.push(row.id);
      }
      toast.success(
        ids.length > 1
          ? `Grupos actualizados en ${ids.length} eventos`
          : "Grupos actualizados",
      );
      onSaved?.(ids, selected);
      onClose?.();
    } catch (err) {
      toast.error("No se pudieron guardar los grupos: " + (err?.message || err));
    } finally {
      setSaving(false);
    }
  };

  const label = isBulk
    ? `${eventList.length} eventos`
    : eventPlainLabel(primary);

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in duration-200">
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-md border border-slate-100 overflow-hidden max-h-[min(90vh,32rem)] flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="event-grupos-assign-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 p-4 border-b border-slate-100 bg-slate-50 shrink-0">
          <div className="min-w-0">
            <h3
              id="event-grupos-assign-title"
              className="text-sm font-bold text-slate-800 flex items-center gap-2"
            >
              <IconTag size={16} className="text-indigo-600 shrink-0" />
              Grupos de convocatoria
            </h3>
            <p className="text-xs text-slate-500 mt-1 truncate" title={label}>
              {label}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors shrink-0"
            aria-label="Cerrar"
          >
            <IconX size={18} />
          </button>
        </div>

        <div className="p-3 flex justify-between items-center border-b border-slate-100 shrink-0">
          <button
            type="button"
            disabled={saving || grupoOptions.length === 0}
            onClick={() =>
              setSelected(grupoOptions.map((o) => Number(o.value ?? o.id)))
            }
            className="text-[10px] font-bold text-indigo-600 hover:underline disabled:opacity-40"
          >
            Seleccionar todos
          </button>
          <button
            type="button"
            disabled={saving || selected.length === 0}
            onClick={() => setSelected([])}
            className="text-[10px] font-bold text-slate-500 hover:underline disabled:opacity-40"
          >
            Limpiar
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-2 space-y-1">
          {grupoOptions.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-6 italic">
              No hay grupos en esta gira.
            </p>
          ) : (
            grupoOptions.map((opt) => {
              const id = Number(opt.value ?? opt.id);
              const isOn = selectedSet.has(id);
              const color = opt.color || "#6366f1";
              return (
                <label
                  key={id}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer border transition-colors select-none ${
                    isOn
                      ? "bg-indigo-50 border-indigo-200"
                      : "bg-white border-transparent hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={isOn}
                    disabled={saving}
                    onChange={() => toggleGrupo(id)}
                  />
                  <span
                    className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-colors ${
                      isOn
                        ? "bg-indigo-600 border-indigo-600"
                        : "bg-white border-slate-300"
                    }`}
                    aria-hidden
                  >
                    {isOn && (
                      <IconCheck size={12} className="text-white" />
                    )}
                  </span>
                  <span
                    className="w-2.5 h-2.5 rounded-full border border-slate-200 shrink-0 shadow-sm"
                    style={{ backgroundColor: color }}
                    aria-hidden
                  />
                  <span
                    className={`text-sm font-bold truncate ${
                      isOn ? "text-indigo-800" : "text-slate-700"
                    }`}
                  >
                    {opt.label || opt.nombre}
                  </span>
                </label>
              );
            })
          )}
        </div>

        <p className="px-4 py-2 text-[10px] text-slate-400 border-t border-slate-100 shrink-0">
          {mixedTags
            ? "Los eventos tienen tags distintos. Guardar reemplaza la etiqueta en todos."
            : "Vacío = visible para todo el roster. Con grupos = solo esos miembros (editores ven todos)."}
        </p>

        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 shadow-md"
          >
            {saving && <IconLoader size={14} className="animate-spin" />}
            Guardar
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
