import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import {
  IconCheck,
  IconChevronDown,
  IconDownload,
  IconExternalLink,
  IconEye,
  IconEyeOff,
  IconFilter,
  IconLoader,
  IconRefresh,
  IconSearch,
} from "../../components/ui/Icons";
import { getFixedMenuPosition } from "../../utils/fixedMenuPosition";
import {
  SEGUIMIENTO_COLOR_OPTIONS,
  SEGUIMIENTO_FINANCIAL_COLS,
  downloadViaticosSeguimientoExcel,
  fetchViaticosSeguimientoRows,
  formatMontoArs,
  formatDevReintLabel,
  patchViaticoSeguimiento,
} from "../../services/viaticosSeguimientoService";

const YEAR_NOW = new Date().getFullYear();
const YEAR_OPTIONS = [YEAR_NOW, YEAR_NOW - 1, YEAR_NOW - 2];

/** Desglose: Viático + mismos conceptos que ViaticosTable. */
const DETAIL_COLS = [
  {
    key: "viatico",
    label: "Viático",
    exp: "anticipoViatico",
    ren: "rendicion_viaticos",
  },
  ...SEGUIMIENTO_FINANCIAL_COLS.map((c) => ({
    key: c.exp,
    label: c.label,
    exp: c.exp,
    ren: c.ren,
  })),
];

function formatMoneyPlain(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n === 0) return "—";
  return n.toLocaleString("es-AR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function DetailMoneyCell({ row, col, showAnticipo, showRendicion }) {
  const est = Number(row[col.exp]) || 0;
  const ren = Number(row[col.ren]) || 0;
  const diff = est - ren;
  return (
    <div className="flex flex-col gap-0.5 justify-center py-0.5">
      {showAnticipo && (
        <div className="rounded-sm bg-orange-50 px-1 py-0.5 text-right text-[11px] font-bold tabular-nums text-orange-900">
          {formatMoneyPlain(est)}
        </div>
      )}
      {showRendicion && (
        <div className="rounded-sm bg-emerald-50 px-1 py-0.5 text-right text-[11px] font-bold tabular-nums text-emerald-900">
          {formatMoneyPlain(ren)}
        </div>
      )}
      {showAnticipo && showRendicion && (
        <div
          className={`rounded-sm border border-slate-200 bg-white px-1 text-right text-[10px] font-bold tabular-nums ${
            diff < 0 ? "text-rose-600" : "text-slate-500"
          }`}
        >
          {diff !== 0 ? formatMoneyPlain(diff) : "—"}
        </div>
      )}
    </div>
  );
}

function EyeToggle({ active, onClick, activeClass, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={active ? `Ocultar detalle de ${label}` : `Ver detalle de ${label}`}
      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-bold ${
        active
          ? activeClass
          : "border-slate-200 bg-white text-slate-400 hover:text-slate-600"
      }`}
    >
      {label}{" "}
      {active ? <IconEye size={14} /> : <IconEyeOff size={14} />}
    </button>
  );
}

const EMPTY_VALUE = "__empty__";

function rowBgClass(color) {
  if (color === "amarillo") return "bg-yellow-200/90";
  if (color === "verde") return "bg-green-200/90";
  if (color === "celeste") return "bg-sky-200/90";
  if (color === "rojo") return "bg-red-200/90";
  return "bg-white";
}

/** Reintegro = rojo; Devolución = celeste (invertidos respecto al diseño inicial). */
const DEV_TEXT_CLASS = "text-sky-700";
const REINT_TEXT_CLASS = "text-rose-700";

const COLOR_SWATCH_CLASS = {
  amarillo: "bg-yellow-300 border-yellow-500",
  verde: "bg-green-400 border-green-600",
  celeste: "bg-sky-300 border-sky-500",
  rojo: "bg-red-400 border-red-600",
};

const COLOR_TRIGGER_CLASS = {
  amarillo: "border-yellow-400 bg-yellow-100 text-yellow-950",
  verde: "border-green-400 bg-green-100 text-green-950",
  celeste: "border-sky-400 bg-sky-100 text-sky-950",
  rojo: "border-red-400 bg-red-100 text-red-950",
};

function ColorSwatch({ color, className = "h-3.5 w-3.5" }) {
  return (
    <span
      aria-hidden
      className={`inline-block shrink-0 rounded-sm border ${className} ${
        color && COLOR_SWATCH_CLASS[color]
          ? COLOR_SWATCH_CLASS[color]
          : "border-dashed border-slate-300 bg-white"
      }`}
    />
  );
}

/** "Lunes, 01 de enero" (sin año). */
function formatFechaLarga(fechaIso) {
  if (!fechaIso) return "";
  try {
    const d = parseISO(String(fechaIso).slice(0, 10));
    if (Number.isNaN(d.getTime())) return String(fechaIso);
    const datePart = format(d, "EEEE, dd 'de' MMMM", { locale: es });
    return datePart.charAt(0).toUpperCase() + datePart.slice(1);
  } catch {
    return String(fechaIso);
  }
}

function LegCell({ fecha, hora, evento }) {
  const dateLine = formatFechaLarga(fecha);
  const timePart = hora ? String(hora).slice(0, 5) : "";
  const eventName = String(evento || "").trim();
  const eventLine = [timePart, eventName].filter(Boolean).join(" · ");
  if (!dateLine && !eventLine) return "—";
  return (
    <div className="flex flex-col gap-0.5 leading-snug text-slate-700">
      {dateLine && <span className="font-medium text-slate-800">{dateLine}</span>}
      {eventLine && (
        <span className="text-[10px] font-normal text-slate-500">{eventLine}</span>
      )}
    </div>
  );
}

function giraViaticosUrl(giraId) {
  if (giraId == null) return null;
  return `/?tab=giras&view=LOGISTICS&giraId=${giraId}&subTab=viaticos`;
}

function ProgramaCell({ row }) {
  const top = row.programaTop || "";
  const zona = row.programaZona || "";
  const href = giraViaticosUrl(row.id_gira);
  const main = top || row.programaLabel || "—";
  if ((!top && !zona && !row.programaLabel) || main === "—") {
    return "—";
  }
  return (
    <div className="flex w-[6.5rem] max-w-[6.5rem] items-start gap-0.5">
      <div
        className="min-w-0 flex-1 leading-tight text-slate-700"
        title={[main, zona].filter(Boolean).join(" · ")}
      >
        <div className="break-words font-medium text-slate-800">{main}</div>
        {zona ? (
          <div className="break-words text-[10px] font-normal text-slate-500">
            {zona}
          </div>
        ) : null}
      </div>
      {href && (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          title="Abrir gira en Viáticos"
          className="shrink-0 rounded p-0.5 text-slate-400 transition-colors hover:bg-indigo-50 hover:text-indigo-600"
          onClick={(e) => e.stopPropagation()}
        >
          <IconExternalLink size={12} />
        </a>
      )}
    </div>
  );
}

function ColorSelect({ value, disabled, onChange }) {
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState(null);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const current = value || null;
  const currentLabel =
    SEGUIMIENTO_COLOR_OPTIONS.find((opt) => (opt.value || null) === current)
      ?.label || "Sin marca";

  const updateMenuPosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    setMenuStyle(
      getFixedMenuPosition(rect, {
        width: Math.max(rect.width, 168),
        estimatedHeight: 220,
        measuredHeight: menuRef.current?.offsetHeight,
        gap: 4,
      }),
    );
  }, []);

  useLayoutEffect(() => {
    if (!open) {
      setMenuStyle(null);
      return undefined;
    }
    updateMenuPosition();
    const frame = requestAnimationFrame(updateMenuPosition);
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [open, updateMenuPosition]);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (buttonRef.current?.contains(e.target)) return;
      if (menuRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const pick = (next) => {
    onChange(next);
    setOpen(false);
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Color de fila"
        title="Marca de color"
        className={`inline-flex w-full min-w-[7.5rem] items-center gap-1.5 rounded-md border px-1.5 py-1 text-left text-[11px] font-semibold outline-none transition-colors disabled:opacity-60 ${
          current && COLOR_TRIGGER_CLASS[current]
            ? COLOR_TRIGGER_CLASS[current]
            : "border-slate-200 bg-white/90 text-slate-500"
        }`}
      >
        <ColorSwatch color={current} />
        <span className="min-w-0 flex-1 truncate">{currentLabel}</span>
        <IconChevronDown
          size={12}
          className={`shrink-0 opacity-70 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      {open &&
        menuStyle &&
        createPortal(
          <div
            ref={menuRef}
            role="listbox"
            aria-label="Marca de color"
            style={{
              top: menuStyle.top,
              left: menuStyle.left,
              width: menuStyle.width,
              maxHeight: menuStyle.maxHeight,
            }}
            className="fixed z-[100] space-y-1 overflow-y-auto rounded-lg border border-slate-200 bg-white p-1.5 shadow-xl"
          >
            {SEGUIMIENTO_COLOR_OPTIONS.map((opt) => {
              const optValue = opt.value || null;
              const selected = optValue === current;
              const tint = optValue
                ? COLOR_TRIGGER_CLASS[optValue]
                : "border-slate-200 bg-white text-slate-600";
              return (
                <button
                  key={String(opt.value)}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => pick(optValue)}
                  className={`flex w-full items-center gap-2 rounded-md border px-2 py-1.5 text-left text-[11px] font-semibold ${tint} ${
                    selected ? "ring-2 ring-slate-400 ring-offset-1" : ""
                  }`}
                >
                  <ColorSwatch
                    color={optValue}
                    className="h-5 w-5 rounded"
                  />
                  <span className="min-w-0 flex-1">{opt.label}</span>
                  {selected ? (
                    <IconCheck size={12} className="shrink-0 opacity-80" />
                  ) : null}
                </button>
              );
            })}
          </div>,
          document.body,
        )}
    </>
  );
}

function personaNameKey(row) {
  return (
    [row.apellido, row.nombre].filter(Boolean).join(", ").trim() || EMPTY_VALUE
  );
}

function legKey(fecha, hora, evento) {
  const f = fecha ? String(fecha).slice(0, 10) : "";
  const h = hora ? String(hora).slice(0, 5) : "";
  const e = String(evento || "").trim();
  const key = [f, h, e].filter(Boolean).join("|");
  return key || EMPTY_VALUE;
}

function legLabel(fecha, hora, evento) {
  const dateLine = formatFechaLarga(fecha) || "(sin fecha)";
  const timePart = hora ? String(hora).slice(0, 5) : "";
  const eventName = String(evento || "").trim();
  const rest = [timePart, eventName].filter(Boolean).join(" · ");
  return rest ? `${dateLine} · ${rest}` : dateLine;
}

function colorLabel(value) {
  if (value === "amarillo") return "Amarillo";
  if (value === "verde") return "Verde";
  if (value === "celeste") return "Celeste";
  if (value === "rojo") return "Rojo";
  return "(sin marca)";
}

const COLUMN_DEFS = [
  {
    key: "persona",
    label: "Persona / Tramo / Rol",
    getValue: personaNameKey,
    getLabel: (row) => {
      const name = personaNameKey(row);
      return name === EMPTY_VALUE ? "(sin nombre)" : name;
    },
  },
  {
    key: "salida",
    label: "Salida",
    getValue: (row) => legKey(row.fecha_salida, row.hora_salida, row.vehiculo),
    getLabel: (row) =>
      legLabel(row.fecha_salida, row.hora_salida, row.vehiculo),
  },
  {
    key: "regreso",
    label: "Regreso",
    getValue: (row) =>
      legKey(row.fecha_llegada, row.hora_llegada, row.vehiculo),
    getLabel: (row) =>
      legLabel(row.fecha_llegada, row.hora_llegada, row.vehiculo),
  },
  {
    key: "programa",
    label: "Programa",
    narrow: true,
    getValue: (row) => row.programaLabel || EMPTY_VALUE,
    getLabel: (row) => row.programaLabel || "(sin programa)",
  },
  {
    key: "anticipo",
    label: "Anticipo",
    align: "right",
    getValue: (row) =>
      Number.isFinite(Number(row.anticipo))
        ? String(roundMoneyKey(row.anticipo))
        : EMPTY_VALUE,
    getLabel: (row) =>
      Number.isFinite(Number(row.anticipo))
        ? formatMontoArs(row.anticipo)
        : "(sin anticipo)",
  },
  {
    key: "dev_reint",
    label: "Dev/Reint",
    align: "right",
    getValue: (row) => {
      if ((Number(row.reintegro) || 0) > 0) return `reint:${roundMoneyKey(row.reintegro)}`;
      if ((Number(row.devolucion) || 0) > 0) return `dev:${roundMoneyKey(row.devolucion)}`;
      return EMPTY_VALUE;
    },
    getLabel: (row) => formatDevReintLabel(row),
  },
  {
    key: "rendicion",
    label: "Rendición",
    align: "right",
    getValue: (row) =>
      Number.isFinite(Number(row.rendicion))
        ? String(roundMoneyKey(row.rendicion))
        : EMPTY_VALUE,
    getLabel: (row) =>
      Number.isFinite(Number(row.rendicion))
        ? formatMontoArs(row.rendicion)
        : "(sin rendición)",
  },
  {
    key: "color",
    label: "Color",
    getValue: (row) => row.seguimiento_color || EMPTY_VALUE,
    getLabel: (row) => colorLabel(row.seguimiento_color),
    staticOptions: [
      { value: EMPTY_VALUE, label: "(sin marca)", swatch: null },
      { value: "amarillo", label: "Amarillo", swatch: "amarillo" },
      { value: "verde", label: "Verde", swatch: "verde" },
      { value: "celeste", label: "Celeste", swatch: "celeste" },
      { value: "rojo", label: "Rojo", swatch: "rojo" },
    ],
  },
];

function roundMoneyKey(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function buildUniqueOptions(rows, col) {
  const map = new Map();
  for (const opt of col.staticOptions || []) {
    map.set(opt.value, opt.label);
  }
  for (const row of rows) {
    const value = col.getValue(row);
    if (!map.has(value)) {
      map.set(value, col.getLabel(row));
    }
  }
  return [...map.entries()]
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) =>
      String(a.label).localeCompare(String(b.label), "es", {
        numeric: true,
        sensitivity: "base",
      }),
    );
}

function ColumnValueFilter({ label, options, selected, onChange, compact }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const rootRef = useRef(null);
  const active = selected.size > 0;

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const visibleOptions = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return options;
    return options.filter((opt) =>
      String(opt.label).toLowerCase().includes(needle),
    );
  }, [options, q]);

  const toggle = (value) => {
    const next = new Set(selected);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    onChange(next);
  };

  return (
    <div ref={rootRef} className="relative mt-1 normal-case tracking-normal">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center justify-between gap-1 rounded border px-1.5 py-1 text-[10px] font-semibold ${
          compact ? "w-auto max-w-full" : "w-full min-w-0"
        } ${
          active
            ? "border-emerald-300 bg-emerald-50 text-emerald-800"
            : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
        }`}
        aria-expanded={open}
        aria-label={`Filtrar ${label}`}
      >
        <span className="inline-flex min-w-0 items-center gap-1">
          <IconFilter size={11} className="shrink-0" />
          <span className="truncate">
            {active ? `${selected.size}` : "Todos"}
          </span>
        </span>
      </button>

      {open && (
        <div className="absolute left-0 z-30 mt-1 w-[min(18rem,70vw)] rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar valor…"
            className="mb-2 w-full rounded border border-slate-200 px-2 py-1 text-[11px] outline-none focus:border-emerald-300"
          />
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <button
              type="button"
              className="text-[10px] font-bold text-slate-500 hover:text-slate-800"
              onClick={() => onChange(new Set())}
            >
              Limpiar
            </button>
            <button
              type="button"
              className="text-[10px] font-bold text-emerald-700 hover:text-emerald-900"
              onClick={() =>
                onChange(new Set(options.map((o) => o.value)))
              }
            >
              Todos
            </button>
          </div>
          <div className="max-h-48 space-y-0.5 overflow-y-auto">
            {visibleOptions.length === 0 ? (
              <p className="px-1 py-2 text-[11px] text-slate-400">Sin valores</p>
            ) : (
              visibleOptions.map((opt) => {
                const checked = selected.has(opt.value);
                return (
                  <label
                    key={opt.value}
                    className="flex cursor-pointer items-start gap-2 rounded px-1 py-1 hover:bg-slate-50"
                  >
                    <input
                      type="checkbox"
                      className="mt-0.5"
                      checked={checked}
                      onChange={() => toggle(opt.value)}
                    />
                    <span className="inline-flex min-w-0 flex-1 items-start gap-1.5 break-words text-[11px] leading-snug text-slate-700">
                      {"swatch" in opt ? (
                        <ColorSwatch
                          color={opt.swatch}
                          className="mt-0.5 h-3 w-3"
                        />
                      ) : null}
                      <span className="min-w-0 flex-1">{opt.label}</span>
                    </span>
                  </label>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ViaticosSeguimientoReport({ supabase }) {
  const [year, setYear] = useState(YEAR_NOW);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [columnFilters, setColumnFilters] = useState(() =>
    Object.fromEntries(COLUMN_DEFS.map((c) => [c.key, new Set()])),
  );
  const [savingIds, setSavingIds] = useState(() => new Set());
  const [exporting, setExporting] = useState(false);
  const [showAnticipoDetalle, setShowAnticipoDetalle] = useState(false);
  const [showRendicionDetalle, setShowRendicionDetalle] = useState(false);

  const showDetalle =
    showAnticipoDetalle || showRendicionDetalle;

  const detailHeaderClass =
    showAnticipoDetalle && showRendicionDetalle
      ? "bg-slate-100 text-slate-700 border-slate-200"
      : showAnticipoDetalle
        ? "bg-orange-50 text-orange-800 border-orange-100"
        : "bg-emerald-50 text-emerald-800 border-emerald-100";

  const colSpanEmpty =
    COLUMN_DEFS.length + (showDetalle ? DETAIL_COLS.length : 0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { rows: next } = await fetchViaticosSeguimientoRows(supabase, {
        year,
      });
      setRows(next);
      setColumnFilters(
        Object.fromEntries(COLUMN_DEFS.map((c) => [c.key, new Set()])),
      );
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "No se pudo cargar el seguimiento de viáticos");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [supabase, year]);

  useEffect(() => {
    load();
  }, [load]);

  const filterOptionsByCol = useMemo(() => {
    const out = {};
    for (const col of COLUMN_DEFS) {
      out[col.key] = buildUniqueOptions(rows, col);
    }
    return out;
  }, [rows]);

  const hasColumnFilters = useMemo(
    () => COLUMN_DEFS.some((col) => columnFilters[col.key]?.size > 0),
    [columnFilters],
  );

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      for (const col of COLUMN_DEFS) {
        const selected = columnFilters[col.key];
        if (selected?.size > 0 && !selected.has(col.getValue(row))) {
          return false;
        }
      }
      if (!q) return true;
      const haystack = [
        row.personaCell,
        row.programaLabel,
        row.salidaCell,
        row.regresoCell,
        row.seguimiento_color,
        row.vehiculo,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [rows, query, columnFilters]);

  const totals = useMemo(() => {
    return filteredRows.reduce(
      (acc, row) => {
        acc.anticipo += Number.isFinite(Number(row.anticipo))
          ? Number(row.anticipo)
          : 0;
        acc.rendicion += Number.isFinite(Number(row.rendicion))
          ? Number(row.rendicion)
          : 0;
        acc.devolucion += Number.isFinite(Number(row.devolucion))
          ? Number(row.devolucion)
          : 0;
        acc.reintegro += Number.isFinite(Number(row.reintegro))
          ? Number(row.reintegro)
          : 0;
        return acc;
      },
      { anticipo: 0, rendicion: 0, devolucion: 0, reintegro: 0 },
    );
  }, [filteredRows]);

  const setColFilter = useCallback((key, nextSet) => {
    setColumnFilters((prev) => ({ ...prev, [key]: nextSet }));
  }, []);

  const clearAllFilters = () => {
    setQuery("");
    setColumnFilters(
      Object.fromEntries(COLUMN_DEFS.map((c) => [c.key, new Set()])),
    );
  };

  const patchRow = useCallback(
    async (id, patch) => {
      setRows((prev) =>
        prev.map((row) => (row.id === id ? { ...row, ...patch } : row)),
      );
      setSavingIds((prev) => new Set(prev).add(id));
      try {
        await patchViaticoSeguimiento(supabase, id, patch);
      } catch (err) {
        console.error(err);
        toast.error(err?.message || "No se pudo guardar el seguimiento");
        await load();
      } finally {
        setSavingIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    },
    [supabase, load],
  );

  const handleExport = async () => {
    setExporting(true);
    try {
      await downloadViaticosSeguimientoExcel({
        rows: filteredRows,
        year,
        fileName: `Seguimiento_viaticos_${year}`,
      });
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "No se pudo exportar");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold text-slate-800">
            Seguimiento viáticos {year}
          </h3>
          <p className="text-[11px] text-slate-500">
            Viáticos individuales · {filteredRows.length} filas
            {filteredRows.length !== rows.length
              ? ` (de ${rows.length})`
              : ""}{" "}
            · Ant. {formatMontoArs(totals.anticipo)} · Rend.{" "}
            {formatMontoArs(totals.rendicion)}
            {totals.devolucion > 0 ? (
              <span className={DEV_TEXT_CLASS}>
                {` · Dev ${formatMontoArs(totals.devolucion)}`}
              </span>
            ) : null}
            {totals.reintegro > 0 ? (
              <span className={REINT_TEXT_CLASS}>
                {` · Reint ${formatMontoArs(totals.reintegro)}`}
              </span>
            ) : null}
          </p>
        </div>

        <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600">
          Año
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="rounded border border-slate-200 bg-white px-2 py-1.5 text-xs font-bold text-slate-800"
          >
            {YEAR_OPTIONS.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>

        <div className="relative min-w-[12rem] flex-1 sm:max-w-xs">
          <IconSearch
            size={14}
            className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar nombre o programa…"
            className="w-full rounded border border-slate-200 bg-white py-1.5 pl-7 pr-2 text-xs text-slate-800 outline-none focus:border-emerald-300"
          />
        </div>

        {(hasColumnFilters || query.trim()) && (
          <button
            type="button"
            onClick={clearAllFilters}
            className="rounded border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100"
          >
            Limpiar filtros
          </button>
        )}

        <EyeToggle
          label="Anticipo"
          active={showAnticipoDetalle}
          onClick={() => setShowAnticipoDetalle((v) => !v)}
          activeClass="border-orange-200 bg-orange-100 text-orange-700"
        />
        <EyeToggle
          label="Rendición"
          active={showRendicionDetalle}
          onClick={() => setShowRendicionDetalle((v) => !v)}
          activeClass="border-emerald-200 bg-emerald-100 text-emerald-700"
        />

        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-600 hover:border-slate-300 disabled:opacity-50"
        >
          <IconRefresh size={14} className={loading ? "animate-spin" : ""} />
          Actualizar
        </button>

        <button
          type="button"
          onClick={handleExport}
          disabled={exporting || loading || filteredRows.length === 0}
          className="inline-flex items-center gap-1 rounded border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100 disabled:opacity-50"
        >
          {exporting ? (
            <IconLoader size={14} className="animate-spin" />
          ) : (
            <IconDownload size={14} />
          )}
          Excel
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        {loading && rows.length === 0 ? (
          <div className="flex h-40 items-center justify-center gap-2 text-sm text-slate-500">
            <IconLoader size={18} className="animate-spin" />
            Cargando viáticos…
          </div>
        ) : rows.length === 0 ? (
          <div className="flex h-40 items-center justify-center px-4 text-center text-sm text-slate-500">
            No hay viáticos individuales para {year}.
          </div>
        ) : (
          <table className="min-w-full border-collapse text-left text-xs">
            <thead className="sticky top-0 z-10 bg-slate-100 text-[10px] uppercase tracking-wide text-slate-600">
              <tr>
                {COLUMN_DEFS.map((col) => (
                  <React.Fragment key={col.key}>
                    <th
                      className={`border border-slate-200 px-2 py-2 align-top font-bold ${
                        col.align === "right" ? "text-right" : ""
                      } ${
                        col.narrow
                          ? "w-[6.5rem] max-w-[6.5rem] px-1"
                          : ""
                      }`}
                    >
                      {col.label}
                      <ColumnValueFilter
                        label={col.label}
                        options={filterOptionsByCol[col.key] || []}
                        selected={columnFilters[col.key] || new Set()}
                        onChange={(next) => setColFilter(col.key, next)}
                        compact={Boolean(col.narrow)}
                      />
                    </th>
                    {col.key === "anticipo" &&
                      showDetalle &&
                      DETAIL_COLS.map((d) => (
                        <th
                          key={`detail-h-${d.key}`}
                          className={`border px-2 py-2 text-right align-top font-bold ${detailHeaderClass}`}
                        >
                          {d.label}
                          {showAnticipoDetalle && showRendicionDetalle && (
                            <div className="mt-0.5 flex flex-col gap-0.5 normal-case tracking-normal text-[8px] font-semibold">
                              <span className="text-orange-700">Ant.</span>
                              <span className="text-emerald-700">Rend.</span>
                              <span className="text-slate-500">Diff</span>
                            </div>
                          )}
                        </th>
                      ))}
                  </React.Fragment>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={colSpanEmpty}
                    className="border border-slate-200 px-4 py-10 text-center text-sm text-slate-500"
                  >
                    Ninguna fila coincide con los filtros
                    {query.trim() ? " o la búsqueda" : ""}.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => {
                  const saving = savingIds.has(row.id);
                  return (
                    <tr
                      key={row.id}
                      className={`${rowBgClass(row.seguimiento_color)} align-top`}
                    >
                      <td className="border border-slate-200 px-2 py-1.5 text-center leading-snug text-slate-800">
                        {row.apellido || row.nombre ? (
                          <div className="flex flex-col items-center gap-0.5">
                            <span className="font-medium">
                              {[row.apellido, row.nombre]
                                .filter(Boolean)
                                .join(", ")}
                            </span>
                            {(row.tramoLabel || row.rolLabel) && (
                              <span className="text-[10px] font-normal text-slate-500">
                                {[row.tramoLabel, row.rolLabel]
                                  .filter(Boolean)
                                  .join(" / ")}
                              </span>
                            )}
                          </div>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="border border-slate-200 px-2 py-1.5">
                        <LegCell
                          fecha={row.fecha_salida}
                          hora={row.hora_salida}
                          evento={row.vehiculo}
                        />
                      </td>
                      <td className="border border-slate-200 px-2 py-1.5">
                        <LegCell
                          fecha={row.fecha_llegada}
                          hora={row.hora_llegada}
                          evento={row.vehiculo}
                        />
                      </td>
                      <td className="w-[6.5rem] max-w-[6.5rem] border border-slate-200 px-1 py-1.5 align-top">
                        <ProgramaCell row={row} />
                      </td>
                      <td className="border border-slate-200 px-2 py-1.5 text-right font-semibold tabular-nums text-slate-800">
                        {formatMontoArs(row.anticipo)}
                      </td>
                      {showDetalle &&
                        DETAIL_COLS.map((d) => (
                          <td
                            key={`${row.id}-${d.key}`}
                            className={`border px-1.5 py-1 ${
                              showAnticipoDetalle && showRendicionDetalle
                                ? "border-slate-200 bg-slate-50/40"
                                : showAnticipoDetalle
                                  ? "border-orange-100 bg-orange-50/20"
                                  : "border-emerald-100 bg-emerald-50/20"
                            }`}
                          >
                            <DetailMoneyCell
                              row={row}
                              col={d}
                              showAnticipo={showAnticipoDetalle}
                              showRendicion={showRendicionDetalle}
                            />
                          </td>
                        ))}
                      <td className="border border-slate-200 px-2 py-1.5 text-right font-semibold tabular-nums">
                        {(Number(row.reintegro) || 0) > 0 ? (
                          <span className={REINT_TEXT_CLASS}>
                            Reint {formatMontoArs(row.reintegro)}
                          </span>
                        ) : (Number(row.devolucion) || 0) > 0 ? (
                          <span className={DEV_TEXT_CLASS}>
                            Dev {formatMontoArs(row.devolucion)}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="border border-slate-200 px-2 py-1.5 text-right font-semibold tabular-nums text-emerald-800">
                        {formatMontoArs(row.rendicion)}
                      </td>
                      <td className="border border-slate-200 px-2 py-1.5">
                        <ColorSelect
                          value={row.seguimiento_color}
                          disabled={saving}
                          onChange={(next) =>
                            patchRow(row.id, { seguimiento_color: next })
                          }
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
