import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  addMonths,
  addYears,
  endOfMonth,
  endOfYear,
  format,
  parseISO,
  startOfMonth,
  startOfYear,
  subDays,
  subMonths,
  subYears,
} from "date-fns";
import { es } from "date-fns/locale";
import { IconCalendar, IconX } from "./Icons";
import DateInput from "./DateInput";
import { formatDdMmYy, formatDisplayDate } from "../../utils/dates";

const WEEKDAYS = ["Do", "Lu", "Ma", "Mi", "Ju", "Vi", "Sa"];

function toIso(d) {
  if (!d || Number.isNaN(d.getTime())) return "";
  return format(d, "yyyy-MM-dd");
}

function parseIso(value) {
  if (!value) return null;
  try {
    const d = parseISO(String(value).slice(0, 10));
    return Number.isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

function buildPresets(today = new Date()) {
  const yearEnd = endOfYear(today);
  return [
    {
      id: "from_today",
      label: "Desde hoy",
      range: () => ({
        start: toIso(today),
        end: toIso(yearEnd),
      }),
    },
    {
      id: "week_ago",
      label: "Desde una semana atrás",
      range: () => ({
        start: toIso(subDays(today, 7)),
        end: toIso(yearEnd),
      }),
    },
    {
      id: "two_weeks_ago",
      label: "Desde dos semanas atrás",
      range: () => ({
        start: toIso(subDays(today, 14)),
        end: toIso(yearEnd),
      }),
    },
    {
      id: "this_month",
      label: "Este mes",
      range: () => ({
        start: toIso(startOfMonth(today)),
        end: toIso(endOfMonth(today)),
      }),
    },
    {
      id: "last_month",
      label: "Mes pasado",
      range: () => {
        const prev = subMonths(today, 1);
        return {
          start: toIso(startOfMonth(prev)),
          end: toIso(endOfMonth(prev)),
        };
      },
    },
    {
      id: "this_year",
      label: "Este año",
      range: () => ({
        start: toIso(startOfYear(today)),
        end: toIso(endOfYear(today)),
      }),
    },
    {
      id: "last_year",
      label: "Año pasado",
      range: () => {
        const prev = subYears(today, 1);
        return {
          start: toIso(startOfYear(prev)),
          end: toIso(endOfYear(prev)),
        };
      },
    },
    {
      id: "next_year",
      label: "Próximo año",
      range: () => {
        const next = addYears(today, 1);
        return {
          start: toIso(startOfYear(next)),
          end: toIso(endOfYear(next)),
        };
      },
    },
    {
      id: "custom",
      label: "Rango personalizado",
      range: null,
    },
  ];
}

function RangeMonth({
  viewDate,
  onPrev,
  onNext,
  showPrev,
  showNext,
  draftStart,
  draftEnd,
  onPickDay,
}) {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const first = new Date(year, month, 1);
  const startPad = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const startIso = draftStart || "";
  const endIso = draftEnd || "";
  const lo = startIso && endIso && startIso > endIso ? endIso : startIso;
  const hi = startIso && endIso && startIso > endIso ? startIso : endIso;

  return (
    <div className="min-w-[220px]">
      <div className="mb-2 flex items-center justify-between gap-1">
        {showPrev ? (
          <button
            type="button"
            onClick={onPrev}
            className="rounded p-1 text-slate-600 hover:bg-slate-100"
            aria-label="Mes anterior"
          >
            ‹
          </button>
        ) : (
          <span className="w-7" />
        )}
        <span className="text-sm font-semibold capitalize text-slate-700">
          {format(viewDate, "MMMM yyyy", { locale: es })}
        </span>
        {showNext ? (
          <button
            type="button"
            onClick={onNext}
            className="rounded p-1 text-slate-600 hover:bg-slate-100"
            aria-label="Mes siguiente"
          >
            ›
          </button>
        ) : (
          <span className="w-7" />
        )}
      </div>
      <div className="grid grid-cols-7 gap-0.5 text-center text-[11px]">
        {WEEKDAYS.map((d) => (
          <div key={d} className="py-0.5 font-medium text-slate-400">
            {d}
          </div>
        ))}
        {cells.map((d, i) => {
          if (d == null) return <div key={`e-${i}`} />;
          const iso = toIso(new Date(year, month, d));
          const inRange = lo && hi && iso >= lo && iso <= hi;
          const isEdge = iso === lo || iso === hi;
          return (
            <button
              key={iso}
              type="button"
              onClick={() => onPickDay(iso)}
              className={`rounded py-1 transition-colors ${
                isEdge
                  ? "bg-indigo-600 font-bold text-white hover:bg-indigo-700"
                  : inRange
                    ? "bg-indigo-100 text-indigo-800 hover:bg-indigo-200"
                    : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              {d}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Selector de rango de fechas (dos meses + presets).
 * Trigger compacto: resumen del rango + botón "+".
 */
export default function DateRangePicker({
  start = "",
  end = "",
  onChange,
  className = "",
}) {
  const [open, setOpen] = useState(false);
  const [draftStart, setDraftStart] = useState(start || "");
  const [draftEnd, setDraftEnd] = useState(end || "");
  const [picking, setPicking] = useState("start");
  const [activePreset, setActivePreset] = useState("custom");
  const [leftMonth, setLeftMonth] = useState(() =>
    startOfMonth(parseIso(start) || new Date()),
  );
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const [panelPos, setPanelPos] = useState({ top: 0, left: 0 });

  const presets = useMemo(() => buildPresets(new Date()), [open]);

  useEffect(() => {
    if (!open) return;
    setDraftStart(start || "");
    setDraftEnd(end || "");
    setPicking("start");
    const anchor = parseIso(start) || new Date();
    setLeftMonth(startOfMonth(anchor));

    const matched = presets.find((p) => {
      if (!p.range) return false;
      const r = p.range();
      return r.start === (start || "") && r.end === (end || "");
    });
    setActivePreset(matched?.id || "custom");
  }, [open, start, end, presets]);

  useEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const width = Math.min(720, window.innerWidth - 16);
    const estimatedHeight = 440;
    let left = rect.left;
    if (left + width > window.innerWidth - 8) {
      left = Math.max(8, window.innerWidth - width - 8);
    }
    let top = rect.bottom + 6;
    if (top + estimatedHeight > window.innerHeight - 8) {
      top = Math.max(8, rect.top - estimatedHeight - 6);
    }
    setPanelPos({ top, left, width });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      const inTrigger = triggerRef.current?.contains(e.target);
      const inPanel = panelRef.current?.contains(e.target);
      // DateInput abre su propio portal (z alto); no cerrar el rango por eso.
      const inNestedDateModal = Boolean(
        e.target?.closest?.('[aria-label="Seleccionar fecha"]'),
      );
      if (!inTrigger && !inPanel && !inNestedDateModal) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const rightMonth = addMonths(leftMonth, 1);

  const applyPreset = (preset) => {
    setActivePreset(preset.id);
    if (!preset.range) {
      setPicking("start");
      return;
    }
    const r = preset.range();
    setDraftStart(r.start);
    setDraftEnd(r.end);
    setLeftMonth(startOfMonth(parseIso(r.start) || new Date()));
    setPicking("start");
  };

  const onPickDay = (iso) => {
    setActivePreset("custom");
    if (picking === "start" || !draftStart) {
      setDraftStart(iso);
      setDraftEnd("");
      setPicking("end");
      return;
    }
    if (iso < draftStart) {
      setDraftEnd(draftStart);
      setDraftStart(iso);
    } else {
      setDraftEnd(iso);
    }
    setPicking("start");
  };

  const handleApply = () => {
    let s = draftStart || "";
    let e = draftEnd || "";
    if (s && e && s > e) {
      const tmp = s;
      s = e;
      e = tmp;
    }
    onChange?.({ start: s, end: e });
    setOpen(false);
  };

  const labelStart = formatDdMmYy(start) || "Desde";
  const labelEnd = formatDdMmYy(end) || "Hasta";
  const fullTitle = [
    formatDisplayDate(start) || "Desde",
    formatDisplayDate(end) || "Hasta",
  ].join(" – ");

  return (
    <div className={`relative inline-flex ${className}`} ref={triggerRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex h-8 max-w-full items-center gap-1 rounded-md border bg-white px-1.5 text-left text-[10px] font-semibold leading-none tabular-nums transition-colors md:h-7 ${
          open
            ? "border-indigo-400 text-indigo-700"
            : "border-slate-200 text-slate-700 hover:border-indigo-300"
        }`}
        title={fullTitle}
        aria-label="Abrir selector de rango"
        aria-expanded={open}
      >
        <IconCalendar size={12} className="shrink-0 text-indigo-500" />
        <span className="whitespace-nowrap">
          {labelStart}
          <span className="mx-0.5 text-slate-300">–</span>
          {labelEnd}
        </span>
      </button>

      {open &&
        createPortal(
          <div
            ref={panelRef}
            className="fixed z-[100] max-h-[min(90vh,40rem)] overflow-y-auto rounded-xl border border-slate-200 bg-white p-3 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
            style={{
              top: panelPos.top,
              left: panelPos.left,
              width: panelPos.width || undefined,
              maxWidth: "calc(100vw - 1rem)",
            }}
            role="dialog"
            aria-label="Selector de rango de fechas"
          >
            <div className="mb-3 flex items-start justify-between gap-2">
              <div className="flex flex-wrap items-end gap-2">
                <div className="min-w-[9.5rem]">
                  <DateInput
                    label="Desde"
                    value={draftStart}
                    onChange={(v) => {
                      setDraftStart(v);
                      setActivePreset("custom");
                    }}
                    className="h-9 text-xs"
                  />
                </div>
                <div className="min-w-[9.5rem]">
                  <DateInput
                    label="Hasta"
                    value={draftEnd}
                    onChange={(v) => {
                      setDraftEnd(v);
                      setActivePreset("custom");
                    }}
                    className="h-9 text-xs"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label="Cerrar"
              >
                <IconX size={16} />
              </button>
            </div>

            <div className="flex flex-col gap-3 lg:flex-row">
              <div className="flex flex-col gap-4 sm:flex-row sm:gap-6">
                <RangeMonth
                  viewDate={leftMonth}
                  onPrev={() => setLeftMonth((m) => subMonths(m, 1))}
                  onNext={() => setLeftMonth((m) => addMonths(m, 1))}
                  showPrev
                  showNext={false}
                  draftStart={draftStart}
                  draftEnd={draftEnd}
                  onPickDay={onPickDay}
                />
                <RangeMonth
                  viewDate={rightMonth}
                  onPrev={() => setLeftMonth((m) => subMonths(m, 1))}
                  onNext={() => setLeftMonth((m) => addMonths(m, 1))}
                  showPrev={false}
                  showNext
                  draftStart={draftStart}
                  draftEnd={draftEnd}
                  onPickDay={onPickDay}
                />
              </div>

              <div className="flex w-full shrink-0 flex-col gap-1 border-t border-slate-100 pt-2 lg:w-44 lg:border-l lg:border-t-0 lg:pl-3 lg:pt-0">
                {presets.map((preset) => {
                  const active = activePreset === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => applyPreset(preset)}
                      className={`rounded-md px-2.5 py-1.5 text-left text-xs font-semibold transition-colors ${
                        active
                          ? "bg-indigo-600 text-white"
                          : "text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2 border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg border border-indigo-200 px-3 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleApply}
                disabled={!draftStart}
                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                Aplicar
              </button>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
