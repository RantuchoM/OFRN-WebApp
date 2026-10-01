import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { IconLoader, IconUsers, IconX } from "../ui/Icons";
import { seatingApellidoNombre } from "../../utils/integranteDisplayName";
import { integranteKey } from "../../utils/integranteIds";
import {
  CONFLICTO_KIND,
  overlappingGirasFromPeople,
} from "../../utils/serviciosEnsayosConflicto";
import {
  asisteIgualIdsFromCustomRows,
  fetchEnsayoAsisteIgualIds,
  setEnsayoTuttiNAsisteIgual,
} from "../../utils/serviciosConflictoActions";

function personLabel(person) {
  const fromSeating = seatingApellidoNombre(person.integrante);
  return fromSeating || person.name || `Integrante ${person.id}`;
}

function reasonsFor(person) {
  const list = person.giras?.length
    ? person.giras
    : overlappingGirasFromPeople([person]);
  return list.map((g) => g.label).filter(Boolean);
}

function persistedAsisteIgualIds(impact) {
  if (impact?.asisteIgualIds instanceof Set) {
    return new Set(impact.asisteIgualIds);
  }
  if (Array.isArray(impact?.asisteIgualIds)) {
    return new Set(impact.asisteIgualIds.map(String).filter(Boolean));
  }
  return asisteIgualIdsFromCustomRows(impact?.eventCustom);
}

export default function EnsayoTuttiMinusTag({
  impact,
  compact = false,
  supabase = null,
  canAct = false,
  eventId: eventIdProp,
}) {
  const [open, setOpen] = useState(false);
  const people = impact?.people || impact?.pullouts || [];
  const n = people.length;
  const eventId = eventIdProp ?? impact?.eventId;
  const [checked, setChecked] = useState(() => persistedAsisteIgualIds(impact));
  const [busyId, setBusyId] = useState(null);
  const [loadingIds, setLoadingIds] = useState(false);

  const persistedSeed = useMemo(
    () => persistedAsisteIgualIds(impact),
    [impact],
  );

  useEffect(() => {
    if (!open) return undefined;
    setChecked(new Set(persistedSeed));
    if (!supabase || eventId == null) return undefined;
    let cancelled = false;
    setLoadingIds(true);
    fetchEnsayoAsisteIgualIds(supabase, eventId)
      .then((ids) => {
        if (!cancelled) setChecked(ids);
      })
      .catch((err) => {
        if (!cancelled) {
          toast.error(err.message || "No se pudo leer quién asiste igual");
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingIds(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, persistedSeed, supabase, eventId]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (
    !impact ||
    impact.conflictKind !== CONFLICTO_KIND.partial ||
    impact.resolvedKind ||
    n < 1
  ) {
    return null;
  }

  const textClass = compact
    ? "text-[9px] px-1.5 py-0.5"
    : "text-[10px] px-1.5 py-0.5";

  const persistable = Boolean(canAct && supabase && eventId != null);

  const toggle = async (id) => {
    if (!persistable || busyId) return;
    const nextAsiste = !checked.has(id);
    setChecked((prev) => {
      const next = new Set(prev);
      if (nextAsiste) next.add(id);
      else next.delete(id);
      return next;
    });
    setBusyId(id);
    try {
      await setEnsayoTuttiNAsisteIgual(supabase, eventId, id, nextAsiste);
    } catch (err) {
      setChecked((prev) => {
        const next = new Set(prev);
        if (nextAsiste) next.delete(id);
        else next.add(id);
        return next;
      });
      toast.error(err.message || "No se pudo guardar");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        className={`inline-flex max-w-full items-center gap-1 rounded border border-sky-200 bg-sky-50 font-bold text-sky-800 ${textClass}`}
        title="Tutti menos integrantes convocados a otra gira (el ensamble no está convocado como grupo)"
      >
        <IconUsers size={compact ? 10 : 12} />
        <span className="truncate">Tutti - {n}</span>
      </button>

      {open
        ? createPortal(
            <div
              className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
              onMouseDown={(e) => {
                if (e.target === e.currentTarget) setOpen(false);
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
                onMouseDown={(e) => e.stopPropagation()}
              >
                <div className="flex items-start justify-between gap-3 border-b border-sky-100 bg-sky-50 px-4 py-3">
                  <div className="min-w-0">
                    <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                      <IconUsers size={16} className="shrink-0 text-sky-700" />
                      Tutti - {n}
                    </h3>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Integrantes de este ensamble que están en el roster de
                      otra gira (el ensamble como grupo no está convocado).
                      Tildá si asiste igual al ensayo a pesar de estar
                      convocado a la gira.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="rounded-md p-1 text-slate-400 hover:bg-white hover:text-slate-700"
                    aria-label="Cerrar"
                  >
                    <IconX size={18} />
                  </button>
                </div>
                {loadingIds ? (
                  <div className="flex items-center justify-center gap-2 px-4 py-6 text-xs text-slate-500">
                    <IconLoader size={16} className="animate-spin" />
                    Cargando…
                  </div>
                ) : (
                  <ul className="min-h-0 flex-1 overflow-y-auto p-2">
                    {people.map((person) => {
                      const id =
                        integranteKey(person.id) || String(person.id);
                      const why = reasonsFor(person).join(" · ");
                      const saving = busyId === id;
                      return (
                        <li
                          key={id}
                          className="flex items-start gap-2 border-b border-slate-100 px-2 py-2 last:border-b-0"
                        >
                          <input
                            type="checkbox"
                            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-sky-700 focus:ring-sky-500 disabled:opacity-50"
                            checked={checked.has(id)}
                            disabled={!persistable || saving}
                            onChange={() => void toggle(id)}
                            aria-label={`${personLabel(person)}: asiste igual al ensayo`}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 text-sm font-medium text-slate-800">
                              {personLabel(person)}
                              {saving ? (
                                <IconLoader
                                  size={12}
                                  className="animate-spin text-sky-600"
                                />
                              ) : null}
                            </div>
                            {why ? (
                              <div className="text-[11px] text-slate-500">
                                {why}
                              </div>
                            ) : null}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
