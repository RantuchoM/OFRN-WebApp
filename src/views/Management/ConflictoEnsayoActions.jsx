import React, { useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import ConfirmModal from "../../components/ui/ConfirmModal";
import {
  IconCalendar,
  IconCheck,
  IconLoader,
  IconTrash,
} from "../../components/ui/Icons";
import IndependentRehearsalForm from "../Ensembles/IndependentRehearsalForm";
import {
  fetchEnsayoForAgendaEdit,
  markEnsayoPeseConflicto,
  softDeleteEnsayoEvento,
} from "../../utils/serviciosConflictoActions";
import {
  CONFLICTO_RESOLVED_KIND,
  CONFLICTO_RESOLVED_LABEL,
  overlappingGirasFromPeople,
} from "../../utils/serviciosEnsayosConflicto";

const RESOLVED_CHIP = {
  [CONFLICTO_RESOLVED_KIND.kept]: {
    icon: IconCheck,
    className:
      "border-emerald-200 bg-emerald-50 text-emerald-800",
  },
  [CONFLICTO_RESOLVED_KIND.deleted]: {
    icon: IconTrash,
    className: "border-red-200 bg-red-50 text-red-800",
  },
  [CONFLICTO_RESOLVED_KIND.rescheduled]: {
    icon: IconCalendar,
    className: "border-indigo-200 bg-indigo-50 text-indigo-800",
  },
};

/** Nombres de gira/programa: compactos, secundarios, arriba a la derecha. */
export function ConflictoOverlapNames({ giras, people }) {
  const list = giras?.length ? giras : overlappingGirasFromPeople(people);
  if (!list.length) return null;
  const all = list.map((g) => g.label).filter(Boolean).join(" · ");
  return (
    <div className="max-w-[14rem] text-right" title={all}>
      {list.map((g, i) => (
        <div
          key={g.id != null ? `g-${g.id}` : `g-${g.label}`}
          className={
            i === 0
              ? "truncate text-[10px] font-medium leading-tight text-slate-500"
              : "truncate text-[10px] leading-tight text-slate-400"
          }
        >
          {g.label}
        </div>
      ))}
    </div>
  );
}

export function ConflictoResolvedChip({ kind }) {
  const meta = RESOLVED_CHIP[kind];
  const label = CONFLICTO_RESOLVED_LABEL[kind];
  if (!meta || !label) return null;
  const Icon = meta.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-1 text-[10px] font-bold ${meta.className}`}
    >
      <Icon size={12} />
      {label}
    </span>
  );
}

/** Izquierda = fecha/tipo; derecha = nombres + botones/badge. */
export function ConflictoEnsayoLayout({
  children,
  giras,
  people,
  resolvedKind,
  countButton,
  actions,
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0 flex-1">{children}</div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <ConflictoOverlapNames giras={giras} people={people} />
        <div className="flex flex-wrap items-center justify-end gap-1">
          {resolvedKind ? (
            <ConflictoResolvedChip kind={resolvedKind} />
          ) : (
            actions
          )}
          {countButton}
        </div>
      </div>
    </div>
  );
}

const ACTION_KIND = {
  delete: CONFLICTO_RESOLVED_KIND.deleted,
  kept: CONFLICTO_RESOLVED_KIND.kept,
};

export default function ConflictoEnsayoActions({
  eventId,
  supabase,
  ensambles = [],
  onChanged,
}) {
  const [busy, setBusy] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmKept, setConfirmKept] = useState(false);
  const [editEvent, setEditEvent] = useState(null);

  const run = async (key, fn, okMsg) => {
    setBusy(key);
    try {
      await fn();
      toast.success(okMsg);
      onChanged?.(ACTION_KIND[key] || key);
    } catch (err) {
      toast.error(err.message || "No se pudo guardar");
    } finally {
      setBusy(null);
    }
  };

  const openReschedule = async () => {
    setBusy("edit");
    try {
      const full = await fetchEnsayoForAgendaEdit(supabase, eventId);
      if (!full) {
        toast.error("No se encontró el ensayo");
        return;
      }
      setEditEvent(full);
    } catch (err) {
      toast.error(err.message || "No se pudo abrir el ensayo");
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <span className="inline-flex flex-wrap items-center justify-end gap-1">
      <button
        type="button"
        disabled={!!busy}
        onClick={() => setConfirmDelete(true)}
        className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-1.5 py-1 text-[10px] font-bold text-red-800 hover:bg-red-100 disabled:opacity-50"
        title="No se ensayó: pasa a papelera (is_deleted)"
      >
        {busy === "delete" ? (
          <IconLoader size={12} className="animate-spin" />
        ) : (
          <IconTrash size={12} />
        )}
        No se ensayó
      </button>
      <button
        type="button"
        disabled={!!busy}
        onClick={() => setConfirmKept(true)}
        className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-1.5 py-1 text-[10px] font-bold text-emerald-800 hover:bg-emerald-100 disabled:opacity-50"
        title="Se ensayó igual: queda marcado como resuelto"
      >
        {busy === "kept" ? (
          <IconLoader size={12} className="animate-spin" />
        ) : (
          <IconCheck size={12} />
        )}
        Se ensayó igual
      </button>
      <button
        type="button"
        disabled={!!busy}
        onClick={() => void openReschedule()}
        className="inline-flex items-center gap-1 rounded-md border border-indigo-200 bg-indigo-50 px-1.5 py-1 text-[10px] font-bold text-indigo-800 hover:bg-indigo-100 disabled:opacity-50"
        title="Se ensayó otro día: fecha, horario y locación"
      >
        {busy === "edit" ? (
          <IconLoader size={12} className="animate-spin" />
        ) : (
          <IconCalendar size={12} />
        )}
        Otro día
      </button>
      </span>

      <ConfirmModal
        isOpen={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        overlayClassName="z-[110]"
        title="No se ensayó"
        message="¿Marcar este ensayo como eliminado? Usa la misma papelera que Agenda (is_deleted). Queda resuelto en esta pantalla hasta recargar; se elimina en 24 horas."
        confirmText="Eliminar ensayo"
        confirmClassName="px-4 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg"
        onConfirm={() =>
          run("delete", () => softDeleteEnsayoEvento(supabase, eventId), "Ensayo pasado a papelera")
        }
      />
      <ConfirmModal
        isOpen={confirmKept}
        onClose={() => setConfirmKept(false)}
        overlayClassName="z-[110]"
        title="Se ensayó igual"
        message="El ensayo queda en agenda y se marca como resuelto (Se ensayó igual)."
        confirmText="Se ensayó igual"
        onConfirm={() =>
          run(
            "kept",
            () => markEnsayoPeseConflicto(supabase, eventId),
            "Marcado: se ensayó igual",
          )
        }
      />

      {editEvent
        ? createPortal(
            <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4">
              <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto">
                <IndependentRehearsalForm
                  supabase={supabase}
                  initialData={editEvent}
                  myEnsembles={ensambles}
                  confirmOverlayZ="z-[120]"
                  onSuccess={() => {
                    setEditEvent(null);
                    onChanged?.(CONFLICTO_RESOLVED_KIND.rescheduled);
                  }}
                  onCancel={() => setEditEvent(null)}
                />
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
