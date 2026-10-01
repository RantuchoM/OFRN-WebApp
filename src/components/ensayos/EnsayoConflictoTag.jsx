import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { IconAlertTriangle, IconX } from "../ui/Icons";
import ConflictoEnsayoActions, {
  ConflictoOverlapNames,
} from "../../views/Management/ConflictoEnsayoActions";
import {
  CONFLICTO_KIND,
  ENSAYO_CONFLICTO_COLOR,
} from "../../utils/serviciosEnsayosConflicto";

export default function EnsayoConflictoTag({
  impact,
  supabase,
  ensambles = [],
  canAct = false,
  onChanged,
  compact = false,
}) {
  const [open, setOpen] = useState(false);

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
    impact.conflictKind !== CONFLICTO_KIND.full ||
    impact.resolvedKind
  ) {
    return null;
  }

  const eventId = impact.eventId;
  const textClass = compact
    ? "text-[9px] px-1.5 py-0.5"
    : "text-[10px] px-1.5 py-0.5";

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        className={`inline-flex max-w-full items-center gap-1 rounded border font-bold uppercase tracking-tight ${textClass}`}
        style={{
          color: ENSAYO_CONFLICTO_COLOR,
          borderColor: `${ENSAYO_CONFLICTO_COLOR}55`,
          backgroundColor: `${ENSAYO_CONFLICTO_COLOR}18`,
        }}
        title="Ensayo en conflicto: solapa una gira a la que el ensamble está convocado"
      >
        <IconAlertTriangle size={compact ? 10 : 12} />
        <span className="truncate">Ensayo en conflicto</span>
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
                className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-2xl"
                onMouseDown={(e) => e.stopPropagation()}
              >
                <div className="flex items-start justify-between gap-3 border-b border-amber-100 bg-amber-50 px-4 py-3">
                  <div className="min-w-0">
                    <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                      <IconAlertTriangle
                        size={16}
                        className="shrink-0 text-amber-600"
                      />
                      Ensayo en conflicto
                    </h3>
                    <p className="mt-0.5 text-xs text-slate-500">
                      El ensamble está convocado a una gira cuyo calendario
                      solapa este ensayo.
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
                <div className="flex flex-col items-end gap-3 px-4 py-3">
                  <ConflictoOverlapNames
                    giras={impact.overlappingGiras}
                    people={impact.people}
                  />
                  {canAct && eventId != null ? (
                    <ConflictoEnsayoActions
                      eventId={eventId}
                      supabase={supabase}
                      ensambles={ensambles}
                      onChanged={(kind, extra) => {
                        setOpen(false);
                        onChanged?.(kind, extra);
                      }}
                    />
                  ) : (
                    <p className="w-full text-right text-[11px] text-slate-400">
                      Solo edición (coordinación o staff) puede resolverlo.
                    </p>
                  )}
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
