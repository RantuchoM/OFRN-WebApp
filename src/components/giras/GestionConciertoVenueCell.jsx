import React, { useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { IconEdit, IconLoader, IconX } from "../ui/Icons";
import {
  VENUE_STATUS_OPTIONS,
  getVenueStatusById,
} from "../../utils/venueUtils";

export default function GestionConciertoVenueCell({
  supabase,
  eventId,
  idEstadoVenue,
  estadoNombre = "-",
  estadoColor = "",
  userId = null,
  onUpdated,
  editable = true,
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [statusId, setStatusId] = useState(idEstadoVenue ?? null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const status = getVenueStatusById(idEstadoVenue);
  const displayNombre = status?.nombre || (estadoNombre !== "-" ? estadoNombre : null);
  const displayColor = status?.color || estadoColor;

  const openModal = () => {
    setStatusId(idEstadoVenue ?? null);
    setNote("");
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!eventId) return;
    const prevStatus = idEstadoVenue ?? null;
    const newStatus = statusId ?? null;
    if (prevStatus !== newStatus && newStatus != null && !note.trim()) {
      toast.error("Agrega una nota para el cambio de estado.");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("eventos")
        .update({ id_estado_venue: newStatus })
        .eq("id", eventId);
      if (error) throw error;

      if (prevStatus !== newStatus && newStatus != null) {
        const { error: logError } = await supabase.from("eventos_venue_log").insert({
          id_evento: eventId,
          id_estado_venue: newStatus,
          nota: note.trim() || null,
          id_integrante: userId || null,
        });
        if (logError) throw logError;
      }

      toast.success("Estado del venue actualizado");
      setModalOpen(false);
      onUpdated?.();
    } catch (err) {
      console.error(err);
      toast.error("No se pudo actualizar el estado del venue");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="group flex items-center gap-1">
        {displayNombre ? (
          <span
            className="inline-flex items-center gap-2 rounded-full px-2 py-1 text-[11px] font-semibold"
            style={{
              backgroundColor: `${displayColor}20`,
              color: "#0f172a",
            }}
          >
            <span
              className="inline-block h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: displayColor }}
            />
            <span>{displayNombre}</span>
          </span>
        ) : (
          <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-500">
            Sin estado
          </span>
        )}
        {editable ? (
          <button
            type="button"
            onClick={openModal}
            className="shrink-0 rounded p-0.5 text-slate-400 opacity-0 transition-all hover:bg-indigo-50 hover:text-indigo-600 group-hover:opacity-100"
            title="Cambiar estado del venue"
          >
            <IconEdit size={13} />
          </button>
        ) : null}
      </div>

      {modalOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[130] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
            onClick={() => !saving && setModalOpen(false)}
          >
            <div
              className="flex w-full max-w-sm flex-col overflow-hidden rounded-xl bg-white shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-3">
                <h3 className="text-sm font-bold text-slate-800">Estado del venue</h3>
                <button
                  type="button"
                  onClick={() => !saving && setModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600"
                >
                  <IconX size={18} />
                </button>
              </div>
              <div className="space-y-3 p-4">
                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase text-slate-500">
                    Estado
                  </label>
                  <select
                    value={statusId ?? ""}
                    onChange={(e) =>
                      setStatusId(e.target.value ? Number(e.target.value) : null)
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Sin estado</option>
                    {VENUE_STATUS_OPTIONS.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase text-slate-500">
                    Nota (obligatoria si cambia estado)
                  </label>
                  <textarea
                    rows={3}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="w-full resize-none rounded-lg border border-slate-300 p-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder='Ej: "Enviado mail a la sala"...'
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 border-t border-slate-100 px-4 py-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  disabled={saving}
                  className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {saving ? <IconLoader className="animate-spin" size={14} /> : null}
                  Guardar
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
