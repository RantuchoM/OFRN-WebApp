import React from "react";
import DateInput from "../../../components/ui/DateInput";
import TimeInput from "../../../components/ui/TimeInput";

/** Parte un valor `YYYY-MM-DDTHH:mm` (hora local) en fecha y hora. */
export function splitLocalDateTime(value) {
  if (!value) return { date: "", time: "" };
  const s = String(value).trim();
  const local = s.match(/^(\d{4}-\d{2}-\d{2})(?:T(\d{2}:\d{2}))?/);
  const hasZone = /[zZ]$|[+-]\d{2}:?\d{2}$/.test(s);
  if (local && !hasZone) {
    return { date: local[1], time: local[2] || "" };
  }
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return { date: "", time: "" };
  const pad = (n) => String(n).padStart(2, "0");
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

/** Arma `YYYY-MM-DDTHH:mm`. Sin hora deja el sufijo `T` para que la validación lo rechace. */
export function joinLocalDateTime(date, time) {
  const d = String(date || "").slice(0, 10);
  const t = String(time || "").slice(0, 5);
  if (!d) return "";
  if (!t) return `${d}T`;
  return `${d}T${t}`;
}

/**
 * Fecha + hora con DateInput/TimeInput (limpiar y aceptar en el selector).
 * El valor sigue siendo el string de datetime-local que ya guardan los formularios SCRN.
 */
export default function ScrnDateTimeField({ id, value, onChange, required = false }) {
  const { date, time } = splitLocalDateTime(value);
  const complete = Boolean(date && time && time.length === 5);

  return (
    <div className="flex items-center gap-2">
      <div className="min-w-0 flex-1">
        <DateInput
          value={date}
          onChange={(nextDate) => onChange(joinLocalDateTime(nextDate, time))}
          confirmPicker
          showDayName={false}
          className="!h-10 !py-1.5 !pl-8 border border-slate-300 bg-white rounded-lg text-sm"
        />
      </div>
      <div className="w-[7.25rem] shrink-0">
        <TimeInput
          value={time}
          onChange={(nextTime) => onChange(joinLocalDateTime(date, nextTime || ""))}
          allowEmpty
          showClear
          className="h-10 border border-slate-300 rounded-lg bg-white px-2 py-1.5 text-sm"
        />
      </div>
      <button
        type="button"
        onClick={() => onChange("")}
        className="h-10 shrink-0 rounded-lg border border-slate-200 px-2 text-[11px] font-bold uppercase text-slate-600 hover:bg-slate-50"
        title="Limpiar fecha y hora"
      >
        Limpiar
      </button>
      {required ? (
        <input
          id={id}
          tabIndex={-1}
          aria-hidden="true"
          required
          value={complete ? value : ""}
          onChange={() => {}}
          className="sr-only"
        />
      ) : null}
    </div>
  );
}
