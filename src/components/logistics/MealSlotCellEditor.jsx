import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { IconX, IconLinkOff, IconEdit } from "../ui/Icons";
import {
  MEAL_SLOT_SERVICES,
  canonicalizeMealSlotService,
  getMealServiceStyle,
} from "../../utils/mealLogistics";
import { useConfirmDialog } from "../../hooks/useConfirmDialog";

const MESES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

function toIso(y, m, d) {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function sliceIso(value) {
  const s = value ? String(value).slice(0, 10) : "";
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : "";
}

function formatSlotDate(dateStr) {
  if (!dateStr) return "";
  const date = new Date(`${dateStr}T00:00:00`);
  const dayName = date.toLocaleDateString("es-ES", { weekday: "short" });
  const [, month, day] = dateStr.split("-");
  const year = dateStr.slice(2, 4);
  return `${dayName} ${day}/${month}/${year}`;
}

function inGiraRange(iso, from, to) {
  if (!from && !to) return false;
  if (from && iso < from) return false;
  if (to && iso > to) return false;
  return true;
}

function SlotCalendar({ value, highlightFrom, highlightTo, onSelect }) {
  const from = sliceIso(highlightFrom);
  const to = sliceIso(highlightTo);
  const seed =
    sliceIso(value) || from || to || new Date().toISOString().slice(0, 10);
  const [sy, sm] = seed.split("-").map(Number);
  const [year, setYear] = useState(sy);
  const [month, setMonth] = useState(sm);

  useEffect(() => {
    const next = sliceIso(value) || from;
    if (!next) return;
    const [yy, mm] = next.split("-").map(Number);
    if (yy && mm) {
      setYear(yy);
      setMonth(mm);
    }
  }, [value, from]);

  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  const startPad = firstDay.getDay();
  const daysInMonth = lastDay.getDate();
  const selectedParts = sliceIso(value) ? sliceIso(value).split("-").map(Number) : null;

  const cells = [];
  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="min-w-[220px]">
      <div className="flex items-center justify-between gap-2 mb-2">
        <button
          type="button"
          onClick={() => {
            if (month === 1) {
              setMonth(12);
              setYear((y) => y - 1);
            } else {
              setMonth((m) => m - 1);
            }
          }}
          className="p-1 rounded hover:bg-slate-100 text-slate-600"
          aria-label="Mes anterior"
        >
          ‹
        </button>
        <span className="text-sm font-semibold text-slate-700">
          {MESES[month - 1]} {year}
        </span>
        <button
          type="button"
          onClick={() => {
            if (month === 12) {
              setMonth(1);
              setYear((y) => y + 1);
            } else {
              setMonth((m) => m + 1);
            }
          }}
          className="p-1 rounded hover:bg-slate-100 text-slate-600"
          aria-label="Mes siguiente"
        >
          ›
        </button>
      </div>
      <div className="grid grid-cols-7 gap-0.5 text-center text-[11px]">
        {["D", "L", "M", "X", "J", "V", "S"].map((d) => (
          <div key={d} className="text-slate-400 font-medium py-0.5">
            {d}
          </div>
        ))}
        {cells.map((d, i) => {
          if (d === null) return <div key={`e-${i}`} />;
          const iso = toIso(year, month, d);
          const inGira = inGiraRange(iso, from, to);
          const isSelected =
            selectedParts &&
            selectedParts[0] === year &&
            selectedParts[1] === month &&
            selectedParts[2] === d;
          return (
            <button
              key={d}
              type="button"
              onClick={() => onSelect(iso)}
              className={`py-1 rounded ${
                isSelected
                  ? "bg-emerald-600 text-white hover:bg-emerald-700"
                  : inGira
                    ? "text-slate-800 hover:bg-emerald-100 font-semibold"
                    : "text-slate-400 hover:bg-slate-100"
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
 * Editor de hito de comida: slot (tipo base + día), no un evento de agenda.
 */
export default function MealSlotCellEditor({
  rule,
  which = "inicio",
  gira,
  supabase,
  onRefresh,
  labelDefault,
}) {
  const { confirm, dialog } = useConfirmDialog();
  const [isOpen, setIsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const dateField =
    which === "fin" ? "comida_fin_fecha" : "comida_inicio_fecha";
  const svcField =
    which === "fin" ? "comida_fin_servicio" : "comida_inicio_servicio";
  const fecha = sliceIso(rule?.[dateField]);
  const servicio = canonicalizeMealSlotService(rule?.[svcField]);
  const [draftFecha, setDraftFecha] = useState(fecha);
  const [draftServicio, setDraftServicio] = useState(servicio || "");

  const giraFrom = sliceIso(gira?.fecha_desde);
  const giraTo = sliceIso(gira?.fecha_hasta);

  useEffect(() => {
    if (!isOpen) return;
    setDraftFecha(fecha);
    setDraftServicio(servicio || "");
  }, [isOpen, fecha, servicio]);

  const hasSlot = Boolean(fecha);

  const persist = async (nextFecha, nextServicio) => {
    if (!rule?.id) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("giras_logistica_reglas")
        .update({
          [dateField]: nextFecha || null,
          [svcField]: nextServicio || null,
        })
        .eq("id", rule.id);
      if (error) throw error;
      setIsOpen(false);
      onRefresh?.();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const tryCommit = (nextFecha, nextServicio) => {
    if (!nextFecha || !nextServicio) return;
    persist(nextFecha, nextServicio);
  };

  const handleUnlink = async (e) => {
    e.stopPropagation();
    if (
      !(await confirm({
        title: "Quitar slot",
        message: "¿Quitar este inicio/fin de comidas de la regla?",
        destructive: true,
        confirmText: "Quitar",
      }))
    )
      return;
    persist(null, null);
  };

  const title = labelDefault || (which === "fin" ? "Fin" : "Inicio");

  if (hasSlot) {
    const theme = getMealServiceStyle(servicio || "Almuerzo");
    return (
      <div
        className={`group relative border-2 rounded-lg px-2 py-2.5 flex flex-col items-center justify-center text-center shadow-sm w-full min-h-[56px] ${theme.card}`}
      >
        {dialog}
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="w-full flex flex-col items-center justify-center gap-1 min-h-[40px]"
          title="Cambiar slot"
        >
          <span
            className={`text-[11px] font-black uppercase tracking-wide px-2 py-0.5 rounded-md border ${theme.tag}`}
          >
            {saving ? "Guardando..." : servicio || title}
          </span>
          <div className={`text-[11px] font-bold leading-tight ${theme.date}`}>
            {formatSlotDate(fecha)}
          </div>
        </button>
        <div className="absolute top-1 right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="p-0.5 hover:bg-slate-100 rounded text-slate-600 transition-colors"
            title="Cambiar slot"
          >
            <IconEdit size={11} />
          </button>
          <button
            type="button"
            onClick={handleUnlink}
            disabled={saving}
            className="p-0.5 hover:bg-red-50 rounded text-red-500 transition-colors"
            title="Quitar"
          >
            <IconLinkOff
              size={11}
              className={saving ? "animate-spin" : ""}
            />
          </button>
        </div>
        {isOpen &&
          createPortal(
            <SlotPickerModal
              title={title}
              draftFecha={draftFecha}
              draftServicio={draftServicio}
              highlightFrom={giraFrom}
              highlightTo={giraTo}
              rangeHint={
                giraFrom && giraTo
                  ? `Gira ${formatSlotDate(giraFrom)} – ${formatSlotDate(giraTo)}`
                  : ""
              }
              saving={saving}
              onClose={() => setIsOpen(false)}
              onServicio={(svc) => {
                setDraftServicio(svc);
                tryCommit(draftFecha, svc);
              }}
              onFecha={(iso) => {
                setDraftFecha(iso);
                tryCommit(iso, draftServicio);
              }}
            />,
            document.body,
          )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 w-full overflow-hidden">
      {dialog}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        disabled={saving}
        className={`w-full min-h-[56px] px-2 py-2 border border-dashed border-slate-300 rounded-lg text-[12px] font-black uppercase tracking-wide flex items-center justify-center text-center transition-all ${saving ? "opacity-50" : "hover:border-emerald-400 hover:text-emerald-700 bg-slate-50/20"}`}
      >
        {saving ? "Guardando..." : "Elegir slot"}
      </button>
      {isOpen &&
        createPortal(
          <SlotPickerModal
            title={title}
            draftFecha={draftFecha}
            draftServicio={draftServicio}
            highlightFrom={giraFrom}
            highlightTo={giraTo}
            rangeHint={
              giraFrom && giraTo
                ? `Gira ${formatSlotDate(giraFrom)} – ${formatSlotDate(giraTo)}`
                : ""
            }
            saving={saving}
            onClose={() => setIsOpen(false)}
            onServicio={(svc) => {
              setDraftServicio(svc);
              tryCommit(draftFecha, svc);
            }}
            onFecha={(iso) => {
              setDraftFecha(iso);
              tryCommit(iso, draftServicio);
            }}
          />,
          document.body,
        )}
    </div>
  );
}

function SlotPickerModal({
  title,
  draftFecha,
  draftServicio,
  highlightFrom,
  highlightTo,
  rangeHint,
  saving,
  onClose,
  onServicio,
  onFecha,
}) {
  const hint =
    rangeHint ||
    (highlightFrom && highlightTo
      ? `${formatSlotDate(highlightFrom)} – ${formatSlotDate(highlightTo)}`
      : "Días de la gira");

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 bg-emerald-50 border-b flex justify-between items-center">
          <h4 className="text-xs font-black uppercase text-slate-700">
            {title}
          </h4>
          <button type="button" onClick={onClose} aria-label="Cerrar">
            <IconX size={18} />
          </button>
        </div>
        <div className="p-4 space-y-4">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
            Tipo de comida
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            {MEAL_SLOT_SERVICES.map((svc) => {
              const theme = getMealServiceStyle(svc);
              const active = draftServicio === svc;
              return (
                <button
                  key={svc}
                  type="button"
                  disabled={saving}
                  onClick={() => onServicio(svc)}
                  className={`px-2 py-2 rounded-lg border text-[11px] font-black uppercase tracking-wide ${
                    active
                      ? `${theme.tag} ring-2 ring-emerald-500`
                      : "bg-white text-slate-600 border-slate-200 hover:border-emerald-300"
                  }`}
                >
                  {svc}
                </button>
              );
            })}
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
            Día · {hint}
          </p>
          <SlotCalendar
            value={draftFecha}
            highlightFrom={highlightFrom}
            highlightTo={highlightTo}
            onSelect={onFecha}
          />
          {(!draftFecha || !draftServicio) && (
            <p className="text-[10px] text-slate-500">
              Elegí tipo y día. Se guarda al completar ambos.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
