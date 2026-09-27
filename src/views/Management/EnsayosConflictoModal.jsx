import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  IconAlertTriangle,
  IconLoader,
  IconX,
} from "../../components/ui/Icons";
import { formatDdMmYyyy, formatDdMmYyyyWeekday } from "../../utils/dates";
import { stripHtml } from "../../utils/eventDisplayUtils";
import { formatEventDurationLabel } from "../../utils/serviciosCantidad";
import {
  applySessionResolvedToGroups,
  partitionConflictoEnsayos,
  resolvedConflictoHeading,
} from "../../utils/serviciosEnsayosConflicto";
import ConflictoEnsayoActions, {
  ConflictoEnsayoLayout,
} from "./ConflictoEnsayoActions";

function ensayoTitle(ensayo) {
  const tipo = stripHtml(ensayo.tipoNombre) || "Ensayo de ensamble";
  const desc = stripHtml(ensayo.descripcion);
  if (desc && desc.toLowerCase() !== tipo.toLowerCase()) return desc;
  return tipo;
}

function horaLabel(ensayo) {
  if (!ensayo.horaInicio) return "";
  const a = String(ensayo.horaInicio).slice(0, 5);
  const b = ensayo.horaFin ? String(ensayo.horaFin).slice(0, 5) : "";
  return b ? `${a}-${b}` : a;
}

function durationLabel(ensayo) {
  if (!ensayo.horaInicio || !ensayo.horaFin) return "";
  const label = formatEventDurationLabel({
    hora_inicio: ensayo.horaInicio,
    hora_fin: ensayo.horaFin,
  });
  return label && label !== "—" ? label : "";
}

function ConflictoPeopleModal({ ensayo, ensambleName, onClose }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="conflicto-people-title"
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 bg-amber-50 px-4 py-3">
          <div className="min-w-0">
            <h3
              id="conflicto-people-title"
              className="text-sm font-bold text-slate-900"
            >
              {ensayo.count} convocado{ensayo.count === 1 ? "" : "s"} a gira
            </h3>
            <p className="truncate text-xs text-slate-500">
              {ensambleName}
              {" · "}
              {formatDdMmYyyy(ensayo.fecha) || ensayo.fecha}
              {horaLabel(ensayo) ? ` · ${horaLabel(ensayo)}` : ""}
            </p>
            <p className="truncate text-xs text-slate-600">
              {ensayoTitle(ensayo)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-md p-1 text-slate-400 hover:bg-white hover:text-slate-700"
            aria-label="Cerrar"
          >
            <IconX size={20} />
          </button>
        </div>
        <ul className="min-h-0 flex-1 overflow-y-auto p-2">
          {ensayo.people.map((person) => (
            <li
              key={person.id}
              className="border-b border-slate-100 px-2 py-2 last:border-b-0"
            >
              <div className="text-sm font-semibold text-slate-800">
                {person.name}
              </div>
              <ul className="mt-0.5 space-y-0.5">
                {person.giras.map((g) => (
                  <li
                    key={g.program?.id}
                    className="text-xs text-slate-600"
                  >
                    {g.label}
                    {g.mark === "reemplazo" ? " (R)" : ""}
                    {g.mark === "licencia" ? " (L)" : ""}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </div>
    </div>,
    document.body,
  );
}

function EnsayoLeft({ ensayo }) {
  const dur = durationLabel(ensayo);
  return (
    <div className="min-w-[12.5rem]">
      <div className="text-sm font-medium text-slate-800">
        <span className="whitespace-nowrap">
          {formatDdMmYyyyWeekday(ensayo.fecha) || ensayo.fecha}
        </span>
        {horaLabel(ensayo) ? (
          <span className="ml-1.5 whitespace-nowrap text-xs font-normal text-slate-500">
            {horaLabel(ensayo)}
          </span>
        ) : null}
      </div>
      <div className="text-xs text-slate-600">{ensayoTitle(ensayo)}</div>
      {dur ? <div className="text-[10px] text-slate-400">{dur}</div> : null}
    </div>
  );
}

function ConflictoEnsayoListItem({
  ensayo,
  supabase,
  ensambles,
  onOpenPeople,
  onChanged,
}) {
  return (
    <li
      className={`border-t border-slate-100 px-3 py-2 ${
        ensayo.resolvedKind ? "bg-slate-50/80" : ""
      }`}
    >
      <ConflictoEnsayoLayout
        giras={ensayo.overlappingGiras}
        people={ensayo.people}
        resolvedKind={ensayo.resolvedKind}
        countButton={
          <button
            type="button"
            onClick={onOpenPeople}
            className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-bold tabular-nums text-amber-900 hover:border-amber-300 hover:bg-amber-100"
            title="Ver quién está convocado a gira"
          >
            <IconAlertTriangle size={12} />
            {ensayo.count}
          </button>
        }
        actions={
          <ConflictoEnsayoActions
            eventId={ensayo.eventId}
            supabase={supabase}
            ensambles={ensambles}
            onChanged={onChanged}
          />
        }
      >
        <EnsayoLeft ensayo={ensayo} />
      </ConflictoEnsayoLayout>
    </li>
  );
}

export default function EnsayosConflictoModal({
  groups,
  loading,
  error,
  fechaDesde,
  fechaHasta,
  supabase,
  ensambles,
  sessionByEventId,
  onSessionResolved,
  onChanged,
  onClose,
}) {
  const [openEnsayo, setOpenEnsayo] = useState(null);
  const displayGroups = useMemo(
    () => applySessionResolvedToGroups(groups, sessionByEventId),
    [groups, sessionByEventId],
  );
  const { pendingCount, resolvedCount } = useMemo(() => {
    let pending = 0;
    let resolved = 0;
    for (const group of displayGroups) {
      const parts = partitionConflictoEnsayos(group.ensayos);
      pending += parts.pending.length;
      resolved += parts.resolved.length;
    }
    return { pendingCount: pending, resolvedCount: resolved };
  }, [displayGroups]);

  const handleRowChanged = (group, ensayo, kind) => {
    onSessionResolved?.({
      eventId: ensayo.eventId,
      ensambleId: group.ensambleId,
      ensambleName: group.ensambleName,
      kind,
      ensayo: { ...ensayo, resolvedKind: kind },
    });
    onChanged?.(kind);
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape" && !openEnsayo) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, openEnsayo]);

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !openEnsayo) onClose();
      }}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ensayos-conflicto-title"
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 bg-amber-50 px-4 py-3">
          <div className="min-w-0">
            <h3
              id="ensayos-conflicto-title"
              className="flex items-center gap-2 text-base font-bold text-slate-900"
            >
              <IconAlertTriangle size={18} className="text-amber-600" />
              Ensayos en conflicto
            </h3>
            <p className="text-xs text-slate-500">
              Ensayos de ensamble con al menos un miembro convocado a una gira
              cuyo calendario solapa esa fecha.
              {fechaDesde && fechaHasta
                ? ` ${formatDdMmYyyy(fechaDesde)} - ${formatDdMmYyyy(fechaHasta)}.`
                : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-md p-1 text-slate-400 hover:bg-white hover:text-slate-700"
            aria-label="Cerrar"
          >
            <IconX size={20} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {loading && displayGroups.length === 0 ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
              <IconLoader size={18} className="animate-spin text-amber-600" />
              Buscando conflictos…
            </div>
          ) : error ? (
            <p className="px-2 py-8 text-center text-sm text-red-600">
              {error.message || "No se pudieron cargar los ensayos."}
            </p>
          ) : displayGroups.length === 0 ? (
            <p className="px-2 py-8 text-center text-sm text-slate-400">
              No hay ensayos de ensamble en conflicto en este rango.
            </p>
          ) : (
            <div className="space-y-3">
              <p className="text-[11px] text-slate-400">
                {pendingCount} ensayo{pendingCount === 1 ? "" : "s"} en{" "}
                {displayGroups.length} ensamble
                {displayGroups.length === 1 ? "" : "s"}.
                {resolvedCount
                  ? ` ${resolvedCount} resuelto${resolvedCount === 1 ? "" : "s"}.`
                  : ""}
              </p>
              {displayGroups.map((group) => {
                const { pending, resolved } = partitionConflictoEnsayos(
                  group.ensayos,
                );
                return (
                  <section
                    key={group.ensambleId}
                    className="overflow-hidden rounded-lg border border-slate-200"
                  >
                    <h4 className="bg-slate-50 px-3 py-1.5 text-sm font-bold text-slate-800">
                      {group.ensambleName}
                      <span className="ml-2 text-[11px] font-medium text-slate-400">
                        {pending.length}
                      </span>
                    </h4>
                    <ul>
                      {pending.map((ensayo) => (
                        <ConflictoEnsayoListItem
                          key={`${group.ensambleId}-${ensayo.eventId}`}
                          ensayo={ensayo}
                          supabase={supabase}
                          ensambles={ensambles}
                          onOpenPeople={() =>
                            setOpenEnsayo({
                              ensayo,
                              ensambleName: group.ensambleName,
                            })
                          }
                          onChanged={(kind) =>
                            handleRowChanged(group, ensayo, kind)
                          }
                        />
                      ))}
                    </ul>
                    {resolved.length ? (
                      <>
                        <h5 className="border-t border-emerald-100 bg-emerald-50/70 px-3 py-1.5 text-xs font-bold text-emerald-800">
                          {resolvedConflictoHeading(resolved)}
                        </h5>
                        <ul>
                          {resolved.map((ensayo) => (
                            <ConflictoEnsayoListItem
                              key={`${group.ensambleId}-r-${ensayo.eventId}`}
                              ensayo={ensayo}
                              supabase={supabase}
                              ensambles={ensambles}
                              onOpenPeople={() =>
                                setOpenEnsayo({
                                  ensayo,
                                  ensambleName: group.ensambleName,
                                })
                              }
                            />
                          ))}
                        </ul>
                      </>
                    ) : null}
                  </section>
                );
              })}
            </div>
          )}
        </div>
      </div>
      {openEnsayo ? (
        <ConflictoPeopleModal
          ensayo={openEnsayo.ensayo}
          ensambleName={openEnsayo.ensambleName}
          onClose={() => setOpenEnsayo(null)}
        />
      ) : null}
    </div>,
    document.body,
  );
}
