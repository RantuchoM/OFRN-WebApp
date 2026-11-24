import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import DateInput from "../ui/DateInput";
import { IconEdit } from "../ui/Icons";
import {
  FACTOR_TEMPORADA_ALTA,
  resolveTemporadaModo,
  suggestTemporadaFranja,
  temporadaConfigFromModo,
} from "../../utils/viaticosTemporadaAlta";

const toIsoDay = (value) => {
  if (value == null || value === "") return "";
  return String(value).slice(0, 10);
};

const fmtShort = (iso) => {
  const day = toIsoDay(iso);
  if (!day || day.length < 10) return "—";
  const [, m, d] = day.split("-");
  return `${d}/${m}`;
};

/**
 * Control de temporada alta: off / completa / parcial (+ fechas).
 * También muestra aviso si lugar + fechas tocan destinos oficiales (no auto-aplica).
 *
 * @param {{
 *   factorTemporada?: number,
 *   temporadaAlta?: boolean,
 *   temporadaDesde?: string|null,
 *   temporadaHasta?: string|null,
 *   lugarTexto?: string,
 *   viajeDesde?: string,
 *   viajeHasta?: string,
 *   onChange: (patch: { factor_temporada?: number, temporada_alta?: boolean, temporada_desde?: string|null, temporada_hasta?: string|null }) => void,
 *   variant?: 'chip' | 'form' | 'scrn',
 *   showAviso?: boolean,
 *   className?: string,
 * }} props
 */
export default function TemporadaAltaFranjaControl({
  factorTemporada,
  temporadaAlta,
  temporadaDesde = null,
  temporadaHasta = null,
  lugarTexto = "",
  viajeDesde = "",
  viajeHasta = "",
  onChange,
  variant = "form",
  showAviso = true,
  className = "",
}) {
  const [editingParcial, setEditingParcial] = useState(false);
  const editBtnRef = useRef(null);
  const popoverRef = useRef(null);
  const [popoverPos, setPopoverPos] = useState({ top: 0, left: 0 });

  const modo = resolveTemporadaModo({
    factorTemporada,
    temporadaAlta,
    temporadaDesde,
    temporadaHasta,
  });

  const suggestion = useMemo(
    () =>
      suggestTemporadaFranja({
        fechaDesde: viajeDesde,
        fechaHasta: viajeHasta || viajeDesde,
        lugarTexto,
      }),
    [viajeDesde, viajeHasta, lugarTexto],
  );

  const avisoVisible =
    showAviso &&
    suggestion.aplica &&
    modo === "off";

  useEffect(() => {
    if (modo !== "parcial") setEditingParcial(false);
  }, [modo]);

  useEffect(() => {
    if (!editingParcial || !editBtnRef.current) return;
    const rect = editBtnRef.current.getBoundingClientRect();
    setPopoverPos({
      top: rect.bottom + 6,
      left: Math.max(8, Math.min(rect.left, window.innerWidth - 320)),
    });
  }, [editingParcial]);

  useEffect(() => {
    if (!editingParcial) return;
    const onDown = (e) => {
      if (
        popoverRef.current?.contains(e.target) ||
        editBtnRef.current?.contains(e.target)
      ) {
        return;
      }
      setEditingParcial(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setEditingParcial(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [editingParcial]);

  const applyModo = (nextModo) => {
    const patch = temporadaConfigFromModo(nextModo, {
      sugeridoDesde: suggestion.sugeridoDesde || viajeDesde,
      sugeridoHasta: suggestion.sugeridoHasta || viajeHasta || viajeDesde,
      viajeDesde,
      viajeHasta: viajeHasta || viajeDesde,
    });
    onChange?.(patch);
    if (nextModo === "parcial") setEditingParcial(true);
  };

  const setParcialFecha = (key, value) => {
    const nextDesde =
      key === "temporada_desde"
        ? value || null
        : temporadaDesde || suggestion.sugeridoDesde || viajeDesde || null;
    const nextHasta =
      key === "temporada_hasta"
        ? value || null
        : temporadaHasta || suggestion.sugeridoHasta || viajeHasta || nextDesde;
    onChange?.({
      factor_temporada: FACTOR_TEMPORADA_ALTA,
      temporada_alta: true,
      temporada_desde: nextDesde,
      temporada_hasta: nextHasta,
    });
  };

  const rangoLabel = `${fmtShort(temporadaDesde)}–${fmtShort(temporadaHasta)}`;

  const modoButtons = (
    <div className="flex items-center gap-0.5 rounded border border-amber-100 bg-white p-0.5 shadow-sm shrink-0">
      {[
        { id: "off", label: "Off" },
        { id: "completa", label: "Comp." },
        { id: "parcial", label: "Parc." },
      ].map((opt) => {
        const active = modo === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            title={
              opt.id === "off"
                ? "Sin temporada alta"
                : opt.id === "completa"
                  ? "Temporada alta en todo el viático (+30%)"
                  : "Temporada alta solo en una franja de fechas"
            }
            onClick={() => applyModo(opt.id)}
            className={`px-1.5 py-0.5 text-[10px] font-bold rounded transition-colors ${
              active
                ? "bg-amber-500 text-white"
                : "text-amber-800 hover:bg-amber-50"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
      <span className="pl-1 pr-1.5 text-[10px] font-bold text-amber-700 whitespace-nowrap">
        TEMP 30%
      </span>
    </div>
  );

  const fechasEditor = (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-[9px] font-bold uppercase text-slate-400">
        Desde
      </span>
      <DateInput
        value={temporadaDesde || ""}
        onChange={(v) => setParcialFecha("temporada_desde", v || null)}
        className="border border-amber-200 bg-white text-xs focus-within:ring-2 focus-within:ring-amber-400"
      />
      <span className="text-[9px] font-bold uppercase text-slate-400">
        Hasta
      </span>
      <DateInput
        value={temporadaHasta || ""}
        onChange={(v) => setParcialFecha("temporada_hasta", v || null)}
        className="border border-amber-200 bg-white text-xs focus-within:ring-2 focus-within:ring-amber-400"
      />
    </div>
  );

  const chipParcialSummary =
    modo === "parcial" ? (
      <div className="flex items-center gap-1 min-w-0">
        <span
          className="text-[10px] font-bold text-amber-800 tabular-nums whitespace-nowrap"
          title={`Temporada parcial ${rangoLabel}`}
        >
          {rangoLabel}
        </span>
        <button
          ref={editBtnRef}
          type="button"
          title="Editar franja de temporada"
          onClick={() => setEditingParcial((v) => !v)}
          className={`p-0.5 rounded border transition-colors shrink-0 ${
            editingParcial
              ? "border-amber-400 bg-amber-100 text-amber-800"
              : "border-amber-200 bg-white text-amber-700 hover:bg-amber-50"
          }`}
        >
          <IconEdit size={12} />
        </button>
      </div>
    ) : null;

  const aviso = avisoVisible ? (
    <div className="flex flex-wrap items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5 text-[11px] text-amber-900">
      <span className="leading-snug">
        Posible temporada alta por destino
        {suggestion.destinos.length
          ? ` (${suggestion.destinos
              .map((d) =>
                d === "el_bolson"
                  ? "El Bolsón"
                  : d === "las_grutas"
                    ? "Las Grutas"
                    : d === "el_condor"
                      ? "El Cóndor"
                      : d === "playas_doradas"
                        ? "Playas Doradas"
                        : "Bariloche",
              )
              .join(", ")})`
          : ""}
        {suggestion.sugeridoDesde
          ? ` · ${fmtShort(suggestion.sugeridoDesde)} → ${fmtShort(suggestion.sugeridoHasta)}`
          : ""}
        .
      </span>
      <button
        type="button"
        className="shrink-0 rounded bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-white hover:bg-amber-600"
        onClick={() => applyModo("completa")}
      >
        Completa
      </button>
      <button
        type="button"
        className="shrink-0 rounded border border-amber-400 bg-white px-2 py-0.5 text-[10px] font-bold text-amber-800 hover:bg-amber-100"
        onClick={() => applyModo("parcial")}
      >
        Parcial
      </button>
    </div>
  ) : null;

  if (variant === "chip") {
    return (
      <div className={`flex flex-col gap-1 min-w-0 ${className}`}>
        <div className="flex flex-wrap items-center gap-1.5">
          {modoButtons}
          {chipParcialSummary}
        </div>
        {aviso}
        {editingParcial && modo === "parcial"
          ? createPortal(
              <div
                ref={popoverRef}
                style={{ top: popoverPos.top, left: popoverPos.left }}
                className="fixed z-[110] rounded-lg border border-amber-200 bg-white p-2 shadow-lg"
              >
                <div className="mb-1.5 text-[9px] font-bold uppercase tracking-wide text-amber-700">
                  Franja temporada (+30%)
                </div>
                {fechasEditor}
                <div className="mt-2 flex justify-end">
                  <button
                    type="button"
                    className="rounded bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-white hover:bg-amber-600"
                    onClick={() => setEditingParcial(false)}
                  >
                    Listo
                  </button>
                </div>
              </div>,
              document.body,
            )
          : null}
      </div>
    );
  }

  if (variant === "scrn") {
    return (
      <div className={`space-y-1.5 ${className}`}>
        <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
          Temporada alta (+30%)
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {modoButtons}
          {modo === "parcial" ? (
            <span className="text-[10px] font-bold text-amber-800 tabular-nums">
              {rangoLabel}
            </span>
          ) : null}
        </div>
        {modo === "parcial" ? fechasEditor : null}
        {aviso}
      </div>
    );
  }

  // form (manual / rendiciones)
  return (
    <label className={`flex h-full min-w-0 flex-col text-xs font-bold text-slate-600 ${className}`}>
      <span className="flex min-h-8 items-end">Temporada alta</span>
      <div className="mt-1 flex min-h-[38px] flex-1 flex-col justify-center gap-1">
        <div className="flex flex-wrap items-center gap-1.5">
          {modoButtons}
          {modo === "parcial" ? (
            <span className="text-[10px] font-bold text-amber-800 tabular-nums">
              {rangoLabel}
            </span>
          ) : null}
        </div>
        {modo === "parcial" ? fechasEditor : null}
        {aviso}
      </div>
    </label>
  );
}
