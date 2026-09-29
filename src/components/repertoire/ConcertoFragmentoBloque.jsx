import React, { useState } from "react";
import { IconChevronDown, IconChevronUp, IconTrophy } from "../ui/Icons";

const panelClass =
  "min-w-0 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-950";

function Lineas({ solista, orquesta }) {
  return (
    <div className="space-y-1">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wide text-indigo-700">Con orquesta</p>
        <p className="break-words text-[11px] leading-snug">{orquesta || "—"}</p>
      </div>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wide text-indigo-700">Solista</p>
        <p className="break-words text-[11px] leading-snug">{solista || "—"}</p>
      </div>
    </div>
  );
}

/** Bloque de solo lectura del concurso, aparte de la nota del repertorio. */
export default function ConcertoFragmentoBloque({ entrada }) {
  const [open, setOpen] = useState(false);
  if (!entrada) return null;
  const nombre = entrada.nombre || "Sin nombre";
  return (
    <div className="mb-1 min-w-0">
      <div className={`${panelClass} hidden px-2 py-1.5 md:block`}>
        <p className="mb-1 flex items-start gap-1 text-[11px] font-semibold">
          <IconTrophy size={12} className="mt-0.5 shrink-0 text-indigo-600" />
          <span className="min-w-0 break-words">{nombre}</span>
        </p>
        <Lineas solista={entrada.solista} orquesta={entrada.orquesta} />
      </div>
      <div className={`${panelClass} md:hidden`}>
        <button
          type="button"
          aria-expanded={open}
          aria-label={`Fragmentos de ${nombre}`}
          onClick={() => setOpen((value) => !value)}
          className="flex w-full min-w-0 items-start gap-1 px-2 py-1.5 text-left"
        >
          <IconTrophy size={12} className="mt-0.5 shrink-0 text-indigo-600" />
          <span className="min-w-0 flex-1 break-words text-[11px] font-semibold">{nombre}</span>
          {open ? (
            <IconChevronUp size={14} className="shrink-0 text-indigo-500" />
          ) : (
            <IconChevronDown size={14} className="shrink-0 text-indigo-500" />
          )}
        </button>
        {open ? (
          <div className="border-t border-indigo-200 px-2 py-1.5">
            <Lineas solista={entrada.solista} orquesta={entrada.orquesta} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
