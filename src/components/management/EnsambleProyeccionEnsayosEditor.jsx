import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { IconLoader, IconPlus, IconTrash } from "../ui/Icons";
import {
  deleteEnsambleProyeccionEnsayo,
  fetchEnsambleProyeccionEnsayos,
  upsertEnsambleProyeccionEnsayo,
} from "../../services/ensambleProyeccionEnsayosService";
import { DOW_LABEL } from "../../utils/ensambleProyeccionEnsayos";

const DOW_OPTIONS = [1, 2, 3, 4, 5, 6, 7];

/**
 * CRUD de plantilla semanal de ensayos para un ensamble.
 */
export default function EnsambleProyeccionEnsayosEditor({
  ensambleId,
  locaciones = [],
  onSlotsChange,
}) {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [draft, setDraft] = useState({
    iso_dow: 1,
    hora_inicio: "09:00",
    hora_fin: "12:00",
    id_locacion: "",
    titulo: "",
  });

  const load = async (id) => {
    if (!id) {
      setSlots([]);
      onSlotsChange?.([]);
      return;
    }
    setLoading(true);
    try {
      const rows = await fetchEnsambleProyeccionEnsayos(id);
      setSlots(rows);
      onSlotsChange?.(rows);
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "No se pudo cargar la plantilla");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(ensambleId);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload on ensamble change
  }, [ensambleId]);

  const saveSlot = async (payload) => {
    const key = payload.id || "new";
    setBusyId(key);
    try {
      const saved = await upsertEnsambleProyeccionEnsayo({
        ...payload,
        id_ensamble: ensambleId,
      });
      const next = payload.id
        ? slots.map((s) => (Number(s.id) === Number(saved.id) ? saved : s))
        : [...slots, saved].sort(
            (a, b) =>
              a.isoDow - b.isoDow ||
              String(a.hora_inicio).localeCompare(String(b.hora_inicio)),
          );
      setSlots(next);
      onSlotsChange?.(next);
      toast.success(payload.id ? "Slot actualizado" : "Slot agregado");
      return saved;
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "No se pudo guardar");
      return null;
    } finally {
      setBusyId(null);
    }
  };

  const onAdd = async () => {
    const saved = await saveSlot({
      iso_dow: Number(draft.iso_dow),
      hora_inicio: draft.hora_inicio,
      hora_fin: draft.hora_fin,
      id_locacion: draft.id_locacion || null,
      titulo: draft.titulo || null,
    });
    if (saved) {
      setDraft((d) => ({
        ...d,
        titulo: "",
      }));
    }
  };

  const onDelete = async (slot) => {
    setBusyId(slot.id);
    try {
      await deleteEnsambleProyeccionEnsayo(slot.id, { hard: true });
      const next = slots.filter((s) => Number(s.id) !== Number(slot.id));
      setSlots(next);
      onSlotsChange?.(next);
      toast.success("Slot eliminado");
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "No se pudo eliminar");
    } finally {
      setBusyId(null);
    }
  };

  if (!ensambleId) return null;

  return (
    <section className="space-y-2">
      <h4 className="rounded bg-violet-50 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-violet-900">
        Plantilla semanal de ensayos
      </h4>
      <p className="px-1 text-[10px] text-slate-500">
        Se proyecta lunes 01/02/2027 → lunes 13/12/2027. Valor: ≥2 h → 1; &gt;30
        min → 0,5.
      </p>

      <div className="flex flex-wrap items-end gap-2 rounded-lg border border-slate-100 bg-slate-50/80 p-2">
        <label className="text-[10px] font-medium text-slate-600">
          Día
          <select
            value={draft.iso_dow}
            onChange={(e) =>
              setDraft((d) => ({ ...d, iso_dow: e.target.value }))
            }
            className="mt-0.5 block rounded border border-slate-200 bg-white px-2 py-1 text-xs"
          >
            {DOW_OPTIONS.map((d) => (
              <option key={d} value={d}>
                {DOW_LABEL[d]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-[10px] font-medium text-slate-600">
          Inicio
          <input
            type="time"
            value={draft.hora_inicio}
            onChange={(e) =>
              setDraft((d) => ({ ...d, hora_inicio: e.target.value }))
            }
            className="mt-0.5 block rounded border border-slate-200 bg-white px-2 py-1 text-xs"
          />
        </label>
        <label className="text-[10px] font-medium text-slate-600">
          Fin
          <input
            type="time"
            value={draft.hora_fin}
            onChange={(e) =>
              setDraft((d) => ({ ...d, hora_fin: e.target.value }))
            }
            className="mt-0.5 block rounded border border-slate-200 bg-white px-2 py-1 text-xs"
          />
        </label>
        <label className="text-[10px] font-medium text-slate-600">
          Locación
          <select
            value={draft.id_locacion}
            onChange={(e) =>
              setDraft((d) => ({ ...d, id_locacion: e.target.value }))
            }
            className="mt-0.5 block min-w-[12rem] max-w-[16rem] rounded border border-slate-200 bg-white px-2 py-1 text-xs"
          >
            <option value="">—</option>
            {locaciones.map((l) => (
              <option key={l.id} value={l.id}>
                {l.nombre}
                {l.localidades?.localidad
                  ? ` (${l.localidades.localidad})`
                  : ""}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          disabled={busyId === "new"}
          onClick={onAdd}
          className="inline-flex items-center gap-1 rounded-md border border-violet-200 bg-violet-50 px-2.5 py-1.5 text-[11px] font-bold text-violet-900 hover:bg-violet-100 disabled:opacity-50"
        >
          {busyId === "new" ? (
            <IconLoader size={13} className="animate-spin" />
          ) : (
            <IconPlus size={13} />
          )}
          Agregar
        </button>
      </div>

      {loading ? (
        <p className="flex items-center gap-1 px-1 text-slate-400">
          <IconLoader size={12} className="animate-spin" /> Cargando plantilla…
        </p>
      ) : (
        <div className="overflow-x-auto rounded border border-slate-200">
          <table className="min-w-full text-left text-[11px]">
            <thead className="bg-slate-50 text-[10px] uppercase text-slate-500">
              <tr>
                <th className="px-2 py-1.5">Día</th>
                <th className="px-2 py-1.5">Horario</th>
                <th className="px-2 py-1.5">Locación</th>
                <th className="px-2 py-1.5">Valor</th>
                <th className="w-8 px-2 py-1.5" />
              </tr>
            </thead>
            <tbody>
              {slots.map((s) => (
                <tr key={s.id} className="border-t border-slate-100">
                  <td className="px-2 py-1">
                    <select
                      disabled={busyId === s.id}
                      value={s.isoDow}
                      onChange={(e) =>
                        saveSlot({
                          id: s.id,
                          iso_dow: Number(e.target.value),
                          hora_inicio: s.hora_inicio,
                          hora_fin: s.hora_fin,
                          id_locacion: s.id_locacion,
                          titulo: s.titulo,
                        })
                      }
                      className="rounded border border-slate-200 bg-white px-1 py-0.5 text-xs"
                    >
                      {DOW_OPTIONS.map((d) => (
                        <option key={d} value={d}>
                          {DOW_LABEL[d]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-1">
                    <div className="inline-flex items-center gap-1">
                      <input
                        type="time"
                        disabled={busyId === s.id}
                        defaultValue={s.hora_inicio}
                        key={`${s.id}-hi-${s.hora_inicio}`}
                        onBlur={(e) => {
                          if (e.target.value === s.hora_inicio) return;
                          saveSlot({
                            id: s.id,
                            iso_dow: s.isoDow,
                            hora_inicio: e.target.value,
                            hora_fin: s.hora_fin,
                            id_locacion: s.id_locacion,
                            titulo: s.titulo,
                          });
                        }}
                        className="rounded border border-slate-200 px-1 py-0.5 text-xs"
                      />
                      <span className="text-slate-400">–</span>
                      <input
                        type="time"
                        disabled={busyId === s.id}
                        defaultValue={s.hora_fin}
                        key={`${s.id}-hf-${s.hora_fin}`}
                        onBlur={(e) => {
                          if (e.target.value === s.hora_fin) return;
                          saveSlot({
                            id: s.id,
                            iso_dow: s.isoDow,
                            hora_inicio: s.hora_inicio,
                            hora_fin: e.target.value,
                            id_locacion: s.id_locacion,
                            titulo: s.titulo,
                          });
                        }}
                        className="rounded border border-slate-200 px-1 py-0.5 text-xs"
                      />
                    </div>
                  </td>
                  <td className="px-2 py-1">
                    <select
                      disabled={busyId === s.id}
                      value={s.id_locacion ?? ""}
                      onChange={(e) =>
                        saveSlot({
                          id: s.id,
                          iso_dow: s.isoDow,
                          hora_inicio: s.hora_inicio,
                          hora_fin: s.hora_fin,
                          id_locacion: e.target.value || null,
                          titulo: s.titulo,
                        })
                      }
                      className="min-w-[12rem] max-w-[18rem] rounded border border-slate-200 bg-white px-1 py-0.5 text-xs"
                    >
                      <option value="">—</option>
                      {locaciones.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.nombre}
                          {l.localidades?.localidad
                            ? ` (${l.localidades.localidad})`
                            : ""}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-1 font-bold tabular-nums text-violet-900">
                    {String(s.value).replace(".", ",")}
                  </td>
                  <td className="px-2 py-1">
                    <button
                      type="button"
                      disabled={busyId === s.id}
                      onClick={() => onDelete(s)}
                      className="rounded border border-slate-200 p-1 text-slate-400 hover:border-rose-200 hover:text-rose-600 disabled:opacity-40"
                      title="Eliminar"
                    >
                      <IconTrash size={12} />
                    </button>
                  </td>
                </tr>
              ))}
              {!slots.length && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-3 py-3 text-center text-slate-400"
                  >
                    Sin slots. Agregá la plantilla semanal de este ensamble.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
