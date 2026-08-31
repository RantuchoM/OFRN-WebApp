import React, { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import {
  IconSearch,
  IconPlus,
  IconTrash,
  IconLoader,
  IconChevronDown,
  IconSortAsc,
  IconSortDesc,
  IconAlertCircle,
  IconCheck,
  IconX,
  IconAlertTriangle,
  IconPencil,
  IconMerge,
} from "../../components/ui/Icons";
import UniversalExporter from "../../components/ui/UniversalExporter";
import { useConfirmDialog } from "../../hooks/useConfirmDialog";
import {
  sanitizeStagePlotSvgMarkup,
  stagePlotSvgToDataUrl,
  STAGE_PLOT_SVG_MAX_CHARS,
  formatStagePlotSvgMaxChars,
} from "../../utils/stagePlotSvgSanitize";
import { reloadStagePlotInstrumentIcons } from "../../services/stagePlotInstrumentIconsService";
import { mergeLocaciones } from "../../services/mergeLocaciones";
import { normalizeForSearch } from "../../utils/sanitize";

const COL_WIDTH_STORAGE_PREFIX = "ofrn:universal-table:col-widths:";
const DEFAULT_COL_WIDTH_BY_TYPE = {
  text: 168,
  select: 148,
  int8: 112,
  int: 100,
  number: 100,
  float: 108,
  checkbox: 72,
  color: 96,
  date: 128,
  svg: 80,
};
const MIN_COL_WIDTH = 72;
const ID_COL_WIDTH = 88;
const ACTIONS_COL_WIDTH = 88;

const defaultWidthForCol = (col) => {
  if (typeof col.width === "number" && col.width > 0) return col.width;
  return DEFAULT_COL_WIDTH_BY_TYPE[col.type] || 148;
};

const loadStoredColWidths = (tableName, columns) => {
  try {
    const raw = localStorage.getItem(`${COL_WIDTH_STORAGE_PREFIX}${tableName}`);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    const allowed = new Set(columns.map((c) => c.key));
    const out = {};
    Object.entries(parsed).forEach(([k, v]) => {
      if (allowed.has(k) && Number.isFinite(Number(v))) {
        out[k] = Math.max(MIN_COL_WIDTH, Number(v));
      }
    });
    return out;
  } catch {
    return {};
  }
};

const toDateInputValue = (v) => {
  if (v == null || v === "") return "";
  const s = String(v);
  return s.length >= 10 ? s.slice(0, 10) : s;
};

const normalizeIconValue = (v) => {
  const raw = String(v || "").trim();
  if (!raw) return "";
  return raw.toLowerCase().replace(/^icon/, "");
};

const resolveSelectOption = (value, options) => {
  if (value === null || value === undefined || value === "") return null;
  const raw = String(value);
  return (
    options?.find((o) => String(o.value) === raw) ||
    options?.find(
      (o) =>
        normalizeIconValue(o.value) === normalizeIconValue(raw),
    ) ||
    null
  );
};

const labelForSelectValue = (value, options) => {
  const opt = resolveSelectOption(value, options);
  if (opt) return opt.label;
  return value == null || value === "" ? "" : String(value);
};

/** Campo SVG: file input + textarea + preview (Datos → Instrumentos). */
function SvgIconField({ value, onChange, fieldClass }) {
  const [error, setError] = useState("");
  const preview = useMemo(() => {
    const r = sanitizeStagePlotSvgMarkup(value || "");
    if (!r.ok || !r.svg) return null;
    return stagePlotSvgToDataUrl(r.svg, "#1e293b");
  }, [value]);

  const applyRaw = (raw) => {
    const r = sanitizeStagePlotSvgMarkup(raw);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    setError("");
    onChange(r.svg || "");
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer min-h-[44px]">
          Subir SVG
          <input
            type="file"
            accept=".svg,image/svg+xml"
            className="sr-only"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              if (
                !/\.svg$/i.test(file.name || "") &&
                file.type &&
                file.type !== "image/svg+xml"
              ) {
                setError("Solo se aceptan archivos SVG (no PNG/JPG).");
                return;
              }
              if (file.size > STAGE_PLOT_SVG_MAX_CHARS) {
                setError(
                  `Archivo demasiado grande (máx. ${formatStagePlotSvgMaxChars()} caracteres).`,
                );
                return;
              }
              try {
                applyRaw(await file.text());
              } catch {
                setError("No se pudo leer el archivo.");
              }
            }}
          />
        </label>
        {value ? (
          <button
            type="button"
            className="px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 min-h-[44px]"
            onClick={() => {
              setError("");
              onChange("");
            }}
          >
            Quitar
          </button>
        ) : null}
      </div>
      <textarea
        className={`${fieldClass} font-mono text-[11px] min-h-[96px]`}
        value={value ?? ""}
        placeholder="<svg …>…</svg>"
        onChange={(e) => applyRaw(e.target.value)}
        spellCheck={false}
      />
      {error ? (
        <p className="text-xs text-red-600">{error}</p>
      ) : (
        <p className="text-[10px] text-slate-400">
          Máx. {formatStagePlotSvgMaxChars()} caracteres. Solo SVG (no PNG). Sin
          script / eventos. Se conservan los colores del SVG; usá currentColor
          solo si querés una silueta mono tintable.
        </p>
      )}
      {preview ? (
        <div className="flex items-center gap-3 p-2 rounded-lg border border-slate-100 bg-slate-50">
          <img
            src={preview}
            alt="Vista previa SVG"
            className="h-12 w-12 object-contain"
          />
          <span className="text-[10px] text-slate-500">Vista previa</span>
        </div>
      ) : null}
    </div>
  );
}

function RowEditModal({
  isOpen,
  onClose,
  tableName,
  row,
  rowId,
  columns,
  isDraft,
  onFieldSave,
  onSaveNewRow,
  getDraftSnapshotFromForm,
  isSavingNew,
}) {
  const [form, setForm] = useState({});
  const [applying, setApplying] = useState(false);
  const modalWasOpenRef = useRef(false);

  useEffect(() => {
    if (!isOpen) {
      modalWasOpenRef.current = false;
      return;
    }
    if (!row) return;
    if (modalWasOpenRef.current) return;
    modalWasOpenRef.current = true;

    const next = {};
    columns.forEach((col) => {
      if (col.key === "id" && isDraft) {
        next[col.key] = row._manual_id ?? "";
        return;
      }
      const v = row[col.key];
      if (col.type === "checkbox") {
        next[col.key] = !!v;
      } else if (col.type === "date") {
        next[col.key] = toDateInputValue(v);
      } else if (v === null || v === undefined) {
        next[col.key] = "";
      } else {
        next[col.key] = v;
      }
    });
    setForm(next);
  }, [isOpen, row, columns, isDraft]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  const applyFormToRow = async () => {
    if (!row) return;
    for (const col of columns) {
      if (col.key === "id" && !isDraft) continue;

      let newVal = form[col.key];
      const oldVal =
        col.key === "id" && isDraft ? row._manual_id : row[col.key];

      if (col.type === "checkbox") {
        if (!!newVal === !!oldVal) continue;
        await onFieldSave(rowId, col.key, newVal);
        continue;
      }

      if (col.type === "date") {
        const nv = newVal === "" ? null : newVal;
        const ov = toDateInputValue(oldVal);
        if (String(nv ?? "") === String(ov ?? "")) continue;
        await onFieldSave(rowId, col.key, nv);
        continue;
      }

      if (col.type === "number" || col.type === "int") {
        const nv =
          newVal === "" || newVal === null || newVal === undefined
            ? null
            : Number(newVal);
        const ov =
          oldVal === "" || oldVal === null || oldVal === undefined
            ? null
            : Number(oldVal);
        if (nv === ov || (Number.isNaN(nv) && Number.isNaN(ov))) continue;
        await onFieldSave(rowId, col.key, Number.isNaN(nv) ? newVal : nv);
        continue;
      }

      if (col.type === "svg") {
        const prepared = sanitizeStagePlotSvgMarkup(newVal || "");
        if (!prepared.ok) {
          window.alert(prepared.error);
          continue;
        }
        const nv = prepared.svg || null;
        const ov =
          oldVal === "" || oldVal === undefined || oldVal === null
            ? null
            : String(oldVal);
        if (String(nv ?? "") === String(ov ?? "")) continue;
        await onFieldSave(rowId, col.key, nv);
        continue;
      }

      const nv = newVal === "" ? null : newVal;
      const ov = oldVal === "" || oldVal === undefined ? null : oldVal;
      if (String(nv ?? "") === String(ov ?? "")) continue;

      await onFieldSave(rowId, col.key, nv);
    }
  };

  const handleApply = async () => {
    setApplying(true);
    try {
      await applyFormToRow();
      onClose();
    } finally {
      setApplying(false);
    }
  };

  const handleApplyAndInsert = async () => {
    setApplying(true);
    try {
      await applyFormToRow();
      const snapshot = getDraftSnapshotFromForm(row, form);
      const ok = await onSaveNewRow(row.id, snapshot);
      if (ok) onClose();
    } finally {
      setApplying(false);
    }
  };

  if (!isOpen || !row) return null;

  const fieldClass =
    "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 min-h-[44px]";

  const modal = (
    <div
      className="fixed inset-0 z-[240] flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="row-edit-modal-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-[1px]"
        aria-label="Cerrar"
        onClick={onClose}
      />
      <div className="relative w-full sm:max-w-md max-h-[92vh] flex flex-col rounded-t-2xl sm:rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-100 shrink-0">
          <h2
            id="row-edit-modal-title"
            className="text-sm font-bold text-slate-800 uppercase tracking-wide truncate"
          >
            Editar · {tableName}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 shrink-0"
            aria-label="Cerrar"
          >
            <IconX size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {columns.map((col) => {
            const readOnlyId = !isDraft && col.key === "id";
            const v = form[col.key];

            return (
              <div key={col.key} className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-600">
                  {col.label}
                </label>
                {readOnlyId && (
                  <input
                    readOnly
                    className={`${fieldClass} bg-slate-50 text-slate-500`}
                    value={v ?? ""}
                  />
                )}
                {!readOnlyId && col.type === "checkbox" && (
                  <label className="inline-flex items-center gap-2 min-h-[44px]">
                    <input
                      type="checkbox"
                      checked={!!v}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, [col.key]: e.target.checked }))
                      }
                      className="h-5 w-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm text-slate-600">Activado</span>
                  </label>
                )}
                {!readOnlyId && col.type === "select" && (
                  <select
                    className={fieldClass}
                    value={(() => {
                      if (v === null || v === undefined) return "";
                      const raw = String(v);
                      const exact = col.options?.find(
                        (o) => String(o.value) === raw,
                      );
                      if (exact) return raw;
                      const byIconAlias = col.options?.find(
                        (o) =>
                          normalizeIconValue(o.value) === normalizeIconValue(raw),
                      );
                      return byIconAlias ? String(byIconAlias.value) : raw;
                    })()}
                    onChange={(e) => {
                      const raw = e.target.value;
                      const opt = col.options?.find(
                        (o) => String(o.value) === raw,
                      );
                      setForm((f) => ({
                        ...f,
                        [col.key]: opt ? opt.value : raw === "" ? null : raw,
                      }));
                    }}
                  >
                    <option value="">—</option>
                    {(col.options || []).map((opt) => (
                      <option key={String(opt.value)} value={String(opt.value)}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                )}
                {!readOnlyId && col.type === "color" && (
                  <div className="flex items-center gap-2 min-h-[44px]">
                    <input
                      type="color"
                      className="h-11 w-14 p-0 border border-slate-200 rounded-lg cursor-pointer shrink-0"
                      value={v || "#ffffff"}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, [col.key]: e.target.value }))
                      }
                    />
                    <span className="text-xs font-mono text-slate-500 uppercase truncate">
                      {v || ""}
                    </span>
                  </div>
                )}
                {!readOnlyId && col.type === "date" && (
                  <input
                    type="date"
                    className={fieldClass}
                    value={v ?? ""}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, [col.key]: e.target.value }))
                    }
                  />
                )}
                {!readOnlyId &&
                  (col.type === "number" || col.type === "int" || col.type === "int8") && (
                    <input
                      type={col.type === "number" || col.type === "int" ? "number" : "text"}
                      inputMode={col.type === "int8" ? "numeric" : undefined}
                      className={fieldClass}
                      value={v ?? ""}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, [col.key]: e.target.value }))
                      }
                      placeholder={col.placeholder || ""}
                    />
                  )}
                {!readOnlyId && col.type === "svg" && (
                  <SvgIconField
                    value={v ?? ""}
                    fieldClass={fieldClass}
                    onChange={(next) =>
                      setForm((f) => ({ ...f, [col.key]: next }))
                    }
                  />
                )}
                {!readOnlyId &&
                  !["checkbox", "select", "color", "date", "number", "int", "int8", "svg"].includes(
                    col.type,
                  ) && (
                    <input
                      type="text"
                      className={fieldClass}
                      value={v ?? ""}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, [col.key]: e.target.value }))
                      }
                      placeholder={col.placeholder || ""}
                    />
                  )}
              </div>
            );
          })}
        </div>
        <div className="flex flex-col-reverse sm:flex-row gap-2 p-4 border-t border-slate-100 bg-slate-50 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:flex-1 px-4 py-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 min-h-[44px]"
          >
            Cancelar
          </button>
          {isDraft ? (
            <>
              <button
                type="button"
                onClick={handleApply}
                disabled={applying || isSavingNew}
                className="w-full sm:flex-1 px-4 py-3 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 min-h-[44px]"
              >
                {applying ? "Guardando…" : "Aplicar cambios"}
              </button>
              <button
                type="button"
                onClick={handleApplyAndInsert}
                disabled={applying || isSavingNew}
                className="w-full sm:flex-1 px-4 py-3 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 disabled:opacity-50 min-h-[44px]"
              >
                {isSavingNew || applying ? (
                  <span className="inline-flex items-center justify-center gap-2">
                    <IconLoader className="animate-spin" size={16} />
                    Guardando…
                  </span>
                ) : (
                  "Guardar en base de datos"
                )}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleApply}
              disabled={applying}
              className="w-full sm:flex-1 px-4 py-3 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 min-h-[44px]"
            >
              {applying ? "Guardando…" : "Guardar cambios"}
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}

// --- SUB-COMPONENTE: SELECTOR BUSCABLE (Sin cambios) ---
const SearchableSelect = ({ value, options, onChange, onBlur, className }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (value === null || value === undefined) {
      setSearchTerm("");
      return;
    }
    const selected =
      options.find((opt) => String(opt.value) === String(value)) ||
      options.find(
        (opt) =>
          normalizeIconValue(opt.value) === normalizeIconValue(String(value)),
      );
    setSearchTerm(selected ? selected.label : "");
  }, [value, options]);

  const filteredOptions = useMemo(() => {
    if (!searchTerm) return options;
    return options.filter(opt => 
      opt.label.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [options, searchTerm]);

  const handleSelect = (option) => {
    setSearchTerm(option.label);
    setIsOpen(false);
    onChange(option.value);
  };

  const handleKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIsOpen(true);
      setHighlightedIndex(prev => (prev < filteredOptions.length - 1 ? prev + 1 : prev));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex(prev => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (isOpen && filteredOptions[highlightedIndex]) {
        handleSelect(filteredOptions[highlightedIndex]);
      } else {
        e.target.blur();
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
      const selected = options.find(opt => String(opt.value) === String(value));
      setSearchTerm(selected ? selected.label : "");
      e.target.blur();
    } else if (e.key === "Tab") {
        setIsOpen(false);
    }
  };

  const handleBlur = (e) => {
    if (containerRef.current && containerRef.current.contains(e.relatedTarget)) {
      return;
    }
    setIsOpen(false);
    const match = options.find(opt => opt.label.toLowerCase() === searchTerm.toLowerCase());
    if (match) {
      onChange(match.value);
    } else {
      if (searchTerm === "") {
          onChange(null);
      } else {
          const selected = options.find(opt => String(opt.value) === String(value));
          setSearchTerm(selected ? selected.label : "");
          if(onBlur) onBlur(); 
      }
    }
  };

  return (
    <div className={`relative w-full h-full ${className}`} ref={containerRef}>
      <input
        ref={inputRef}
        type="text"
        value={searchTerm}
        onChange={(e) => {
          setSearchTerm(e.target.value);
          setIsOpen(true);
          setHighlightedIndex(0);
        }}
        onFocus={() => {
            setIsOpen(true);
            inputRef.current?.select();
        }}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className="w-full h-full min-h-[44px] md:min-h-0 bg-transparent border-none outline-none text-sm px-2 py-2 md:py-1.5 cursor-text placeholder:text-slate-300"
        placeholder="Seleccionar..."
      />
      
      <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
        <IconChevronDown size={12} />
      </div>

      {isOpen && filteredOptions.length > 0 && (
        <ul className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-48 overflow-y-auto divide-y divide-slate-50 animate-in fade-in zoom-in-95 duration-100">
          {filteredOptions.map((opt, idx) => (
            <li
              key={opt.value}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleSelect(opt)}
              className={`px-3 py-2 text-sm cursor-pointer transition-colors flex justify-between items-center ${
                idx === highlightedIndex ? "bg-indigo-50 text-indigo-700" : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              <span>{opt.label}</span>
              {String(opt.value) === String(value) && <IconCheck size={12} className="text-indigo-600"/>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

// --- Modal: unificar locaciones duplicadas ---
const MergeLocationPick = ({
  label,
  placeholder,
  options,
  value,
  onChange,
  colorClass,
  iconColorClass,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapperRef = useRef(null);
  const selected = options.find((o) => String(o.id) === String(value));

  useEffect(() => {
    const onDoc = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    if (selected) setQuery(selected.label);
    else if (!value) setQuery("");
  }, [selected, value]);

  const filtered = options.filter((item) =>
    normalizeForSearch(item.label).includes(normalizeForSearch(query)),
  );

  return (
    <div className="relative" ref={wrapperRef}>
      <label className={`text-[10px] font-bold uppercase mb-1 block ${colorClass}`}>
        {label}
      </label>
      <div className="relative">
        <input
          type="text"
          className={`w-full p-2.5 pr-8 border rounded-lg text-sm outline-none focus:ring-2 transition-shadow min-h-[44px] ${
            isOpen ? "ring-2 ring-violet-400 border-violet-300" : "border-slate-200"
          }`}
          placeholder={placeholder}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            if (value) onChange("");
          }}
          onFocus={() => setIsOpen(true)}
        />
        <div
          className={`absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none ${iconColorClass}`}
        >
          {isOpen ? <IconSearch size={14} /> : <IconChevronDown size={14} />}
        </div>
      </div>
      {isOpen && (
        <div className="absolute top-full left-0 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-52 overflow-y-auto z-[110]">
          {filtered.length > 0 ? (
            filtered.map((opt) => (
              <button
                type="button"
                key={opt.id}
                onClick={() => {
                  onChange(String(opt.id));
                  setIsOpen(false);
                  setQuery(opt.label);
                }}
                className="w-full text-left p-2.5 text-sm hover:bg-slate-50 cursor-pointer border-b border-slate-50 last:border-0 text-slate-700"
              >
                <span className="font-semibold">{opt.nombre || opt.label}</span>
                {opt.localidad ? (
                  <span className="text-slate-400 text-xs ml-1">· {opt.localidad}</span>
                ) : null}
                <span className="text-slate-300 text-[10px] font-mono ml-1">#{opt.id}</span>
              </button>
            ))
          ) : (
            <div className="p-3 text-xs text-slate-400 text-center italic">
              Sin coincidencias
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const MergeLocationsModal = ({
  isOpen,
  onClose,
  locations,
  localidadOptions,
  supabase,
  onMergeSuccess,
}) => {
  const { confirm, dialog } = useConfirmDialog();
  const [sourceId, setSourceId] = useState("");
  const [targetId, setTargetId] = useState("");
  const [merging, setMerging] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setSourceId("");
      setTargetId("");
      setMerging(false);
    }
  }, [isOpen]);

  const options = useMemo(() => {
    const locLabel = (id) => {
      const opt = localidadOptions?.find((o) => String(o.value) === String(id));
      return opt?.label || "";
    };
    return [...locations]
      .filter((l) => l?.id != null && !String(l.id).startsWith("temp-"))
      .map((l) => {
        const localidad = locLabel(l.id_localidad);
        const nombre = l.nombre || "(sin nombre)";
        return {
          id: l.id,
          nombre,
          localidad,
          label: `${nombre}${localidad ? ` · ${localidad}` : ""} (#${l.id})`,
        };
      })
      .sort((a, b) => a.label.localeCompare(b.label, "es"));
  }, [locations, localidadOptions]);

  if (!isOpen) return null;

  const handleMerge = async () => {
    if (!sourceId || !targetId) {
      alert("Seleccioná ambas locaciones.");
      return;
    }
    if (String(sourceId) === String(targetId)) {
      alert("No podés fusionar una locación consigo misma.");
      return;
    }

    if (
      !(await confirm({
        title: "Unificar locaciones",
        message:
          "ESTA ACCIÓN ES IRREVERSIBLE.\n\nSe eliminará la locación duplicada y todas las referencias (eventos, comidas, plantillas, domicilio laboral, FIMBA venue info, hotel espejo) pasarán a la locación destino.\n\n¿Continuar?",
        destructive: true,
      }))
    ) {
      return;
    }

    setMerging(true);
    try {
      const result = await mergeLocaciones(supabase, sourceId, targetId);
      if (!result.ok) {
        alert("Error al unificar: " + result.error);
        return;
      }
      alert("Unificación completada.\n\n" + result.summary);
      onMergeSuccess?.();
      onClose();
    } finally {
      setMerging(false);
    }
  };

  const modal = (
    <>
      {dialog}
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <button
          type="button"
          className="absolute inset-0"
          aria-label="Cerrar"
          onClick={onClose}
        />
        <div className="relative bg-white w-full max-w-md rounded-xl shadow-2xl p-6 border border-slate-200 flex flex-col max-h-[90vh]">
          <div className="flex justify-between items-center mb-4 shrink-0">
            <h3 className="font-black text-slate-800 text-lg uppercase flex items-center gap-2">
              <IconMerge className="text-violet-600" size={20} /> Unificar
              locaciones
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1"
            >
              <IconX size={20} />
            </button>
          </div>

          <div className="space-y-4 bg-violet-50 p-4 rounded-xl border border-violet-100 overflow-visible">
            <p className="text-xs text-violet-900 mb-2 flex gap-2">
              <IconAlertTriangle size={16} className="shrink-0" />
              Elegí el duplicado (se borra) y el destino (se conserva). Las keys
              en eventos, hoteles, plantillas, comidas, domicilio laboral y
              FIMBA se remapean.
            </p>

            <MergeLocationPick
              label="1. Eliminar (duplicado)"
              placeholder="Buscar duplicado..."
              options={options.filter((c) => String(c.id) !== String(targetId))}
              value={sourceId}
              onChange={setSourceId}
              colorClass="text-red-600"
              iconColorClass="text-red-500"
            />

            <div className="flex justify-center text-slate-300 font-bold text-xs py-1">
              ↓ SE FUSIONA EN ↓
            </div>

            <MergeLocationPick
              label="2. Mantener (correcta)"
              placeholder="Buscar destino..."
              options={options.filter((c) => String(c.id) !== String(sourceId))}
              value={targetId}
              onChange={setTargetId}
              colorClass="text-emerald-700"
              iconColorClass="text-emerald-500"
            />
          </div>

          <div className="flex justify-end gap-2 mt-6 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-500 hover:bg-slate-100 rounded-lg font-bold min-h-[44px]"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleMerge}
              disabled={merging || !sourceId || !targetId}
              className="px-4 py-2 text-sm bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50 font-bold shadow-sm flex items-center gap-2 min-h-[44px]"
            >
              {merging ? (
                <IconLoader className="animate-spin" size={14} />
              ) : (
                <IconCheck size={14} />
              )}
              {merging ? "Unificando…" : "Confirmar unificación"}
            </button>
          </div>
        </div>
      </div>
    </>
  );

  return createPortal(modal, document.body);
};

// --- SUB-COMPONENTE: CELDA EDITABLE ---
const EditableCell = ({ row, col, rowId, onSave, onOpenRowModal }) => {
  const isDraft = String(row.id).startsWith("temp-");
  const initialValue = (col.key === 'id' && isDraft) ? (row._manual_id || "") : row[col.key];

  const [value, setValue] = useState(initialValue);
  const [status, setStatus] = useState("idle"); 
  const [editBox, setEditBox] = useState(null);
  const inputRef = useRef(null);

  const textStr =
    value === null || value === undefined ? "" : String(value);
  const isEditingText =
    status === "editing" &&
    !["checkbox", "select", "color", "svg"].includes(col.type) &&
    !(col.key === "id" && !isDraft);

  useEffect(() => {
    const nextVal = (col.key === 'id' && isDraft) ? (row._manual_id || "") : row[col.key];
    setValue(nextVal);
  }, [row, col.key, isDraft]);

  useEffect(() => {
    if (!isEditingText) {
      setEditBox(null);
      return;
    }
    const sync = () => {
      const wrap = inputRef.current?.parentElement;
      if (!wrap) return;
      const r = wrap.getBoundingClientRect();
      const minW = Math.max(r.width, 220);
      const contentW = Math.min(
        window.innerWidth - 24,
        Math.max(minW, textStr.length * 8 + 40),
      );
      let left = r.left;
      if (left + contentW > window.innerWidth - 12) {
        left = Math.max(12, window.innerWidth - 12 - contentW);
      }
      setEditBox({
        top: r.top,
        left,
        width: contentW,
        height: Math.max(r.height, 40),
      });
    };
    sync();
    window.addEventListener("scroll", sync, true);
    window.addEventListener("resize", sync);
    return () => {
      window.removeEventListener("scroll", sync, true);
      window.removeEventListener("resize", sync);
    };
  }, [isEditingText, textStr]);

  if (col.key === 'id' && !isDraft) {
      return (
        <div className="flex items-center gap-1 min-w-0 max-w-full">
          <span
            className="px-2 py-1.5 text-xs font-mono text-slate-400 min-w-0 flex-1 truncate"
            title={value != null ? String(value) : ""}
          >
            {value}
          </span>
          {onOpenRowModal && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenRowModal(row);
              }}
              className="shrink-0 p-1.5 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
              title="Editar en formulario"
              aria-label="Editar fila en formulario"
            >
              <IconPencil size={16} />
            </button>
          )}
        </div>
      );
  }

  const handleSave = async (newValue) => {
    const valToSave = newValue !== undefined ? newValue : value;
    
    if (isDraft) {
        const targetKey = col.key === 'id' ? '_manual_id' : col.key;
        onSave(rowId, targetKey, valToSave);
        return;
    }

    if (valToSave === row[col.key]) {
      setStatus("idle");
      return;
    }

    // --- CAMBIO: Estado SAVING (Amarillo) ---
    setStatus("saving");
    const success = await onSave(rowId, col.key, valToSave);
    if (success) {
      // --- CAMBIO: Estado SUCCESS (Verde) ---
      setStatus("success");
      setTimeout(() => setStatus("idle"), 2000);
    } else {
      // --- CAMBIO: Estado ERROR (Rojo) ---
      setStatus("error");
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      inputRef.current?.blur();
    }
  };

  // --- CAMBIO: Clases visuales según estado ---
  const getStatusClass = () => {
    if (status === "editing") return "ring-2 ring-indigo-500 z-10 bg-white shadow-sm";
    
    // GUARDANDO: Amarillo suave
    if (status === "saving") return "bg-amber-100 text-amber-800 ring-1 ring-amber-300 transition-colors";
    
    // ÉXITO: Verde suave que se desvanece
    if (status === "success") return "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-300 transition-colors duration-1000";
    
    // ERROR: Rojo fuerte
    if (status === "error") return "bg-red-50 text-red-800 ring-2 ring-red-500 z-10";
    
    return "hover:bg-slate-50 focus-within:bg-white focus-within:ring-2 focus-within:ring-indigo-500 focus-within:z-10";
  };

  // 1. CHECKBOX
  if (col.type === "checkbox") {
    return (
      <div className={`flex items-center justify-center min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0 h-full p-1 rounded transition-colors ${getStatusClass()}`}>
        <input
          type="checkbox"
          checked={!!value}
          onChange={(e) => {
            const val = e.target.checked;
            setValue(val);
            handleSave(val);
          }}
          className="h-5 w-5 md:h-4 md:w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
        />
      </div>
    );
  }

  // 2. SELECT
  if (col.type === "select") {
    return (
      <div className={`h-full w-full rounded transition-all ${getStatusClass()}`} onFocus={() => setStatus("editing")} onBlur={() => setStatus("idle")}>
        <SearchableSelect
          value={value}
          options={col.options}
          onChange={(val) => {
            setValue(val);
            handleSave(val);
          }}
          onBlur={() => handleSave()}
          className="w-full h-full"
        />
      </div>
    );
  }

  // 3. COLOR
  if (col.type === "color") {
    return (
      <div className={`flex items-center gap-2 h-full p-1 rounded ${getStatusClass()}`}>
        <input
          type="color"
          value={value || "#ffffff"}
          onChange={(e) => setValue(e.target.value)}
          onBlur={() => handleSave()}
          className="h-6 w-8 p-0 border-0 rounded cursor-pointer shrink-0"
        />
        <span className="text-xs font-mono text-slate-500 uppercase">{value}</span>
      </div>
    );
  }

  // 3b. SVG — indicador; editar en modal de fila
  if (col.type === "svg") {
    const has = !!(value && String(value).trim());
    return (
      <button
        type="button"
        onClick={() => onOpenRowModal?.(row)}
        className={`w-full h-full min-h-[44px] md:min-h-0 px-2 text-left text-[11px] rounded ${getStatusClass()} ${
          has ? "text-emerald-700 font-semibold" : "text-slate-400"
        }`}
        title="Editar SVG en el formulario"
      >
        {has ? "SVG ✓" : "—"}
      </button>
    );
  }

  // 4. TEXTO — al editar, el mismo input pasa a fixed y se ensancha
  const beginTextEdit = () => {
    const wrap = inputRef.current?.parentElement;
    if (wrap) {
      const r = wrap.getBoundingClientRect();
      const minW = Math.max(r.width, 220);
      const contentW = Math.min(
        window.innerWidth - 24,
        Math.max(minW, textStr.length * 8 + 40),
      );
      let left = r.left;
      if (left + contentW > window.innerWidth - 12) {
        left = Math.max(12, window.innerWidth - 12 - contentW);
      }
      setEditBox({
        top: r.top,
        left,
        width: contentW,
        height: Math.max(r.height, 40),
      });
    }
    setStatus("editing");
  };

  return (
    <div className="relative w-full h-full min-h-[44px] md:min-h-[2.25rem]">
      <input
        ref={inputRef}
        type="text"
        value={textStr}
        onChange={(e) => {
          setValue(e.target.value);
          if (isDraft) {
            const targetKey = col.key === "id" ? "_manual_id" : col.key;
            onSave(rowId, targetKey, e.target.value);
          }
        }}
        onFocus={beginTextEdit}
        onBlur={() => handleSave()}
        onKeyDown={handleKeyDown}
        title={textStr || undefined}
        placeholder={col.placeholder || "Empty"}
        className={`border-none outline-none text-sm rounded ${
          isEditingText && editBox
            ? "fixed z-[120] px-2.5 py-2 shadow-xl ring-2 ring-indigo-500 bg-white text-slate-800"
            : `w-full h-full min-h-[44px] md:min-h-0 px-2 py-2 md:py-1.5 bg-transparent truncate ${getStatusClass()}`
        }`}
        style={
          isEditingText && editBox
            ? {
                top: editBox.top,
                left: editBox.left,
                width: editBox.width,
                minHeight: editBox.height,
              }
            : undefined
        }
      />
    </div>
  );
};

// --- COMPONENTE PRINCIPAL ---
export default function UniversalTable({
  supabase,
  tableName,
  columns,
  defaultSort,
  primaryKey = "id",
  onDataChange,
  onDirtyChange,
  warningMessage // <--- NUEVA PROP RECIBIDA
}) {
  const { confirm, dialog } = useConfirmDialog();
  const sortDefault = defaultSort ?? primaryKey;
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: sortDefault, direction: "asc" });
  const [filters, setFilters] = useState({});
  const [isSavingNew, setIsSavingNew] = useState(false);
  const [modalRowId, setModalRowId] = useState(null);
  const [mergeOpen, setMergeOpen] = useState(false);
  const [columnWidths, setColumnWidths] = useState(() =>
    loadStoredColWidths(tableName, columns),
  );
  const resizeRef = useRef(null);

  const allowMergeLocaciones = tableName === "locaciones";
  const localidadOptions = useMemo(
    () => columns.find((c) => c.key === "id_localidad")?.options || [],
    [columns],
  );

  useEffect(() => {
    setColumnWidths(loadStoredColWidths(tableName, columns));
  }, [tableName, columns]);

  useEffect(() => {
    try {
      localStorage.setItem(
        `${COL_WIDTH_STORAGE_PREFIX}${tableName}`,
        JSON.stringify(columnWidths),
      );
    } catch {
      /* ignore quota */
    }
  }, [columnWidths, tableName]);

  const getColWidth = (col) =>
    columnWidths[col.key] ?? defaultWidthForCol(col);

  const startResize = (e, colKey) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startW = columnWidths[colKey] ?? defaultWidthForCol(
      columns.find((c) => c.key === colKey) || { type: "text" },
    );
    resizeRef.current = { colKey, startX, startW };

    const onMove = (ev) => {
      if (!resizeRef.current) return;
      const delta = ev.clientX - resizeRef.current.startX;
      const next = Math.max(MIN_COL_WIDTH, resizeRef.current.startW + delta);
      setColumnWidths((prev) => ({
        ...prev,
        [resizeRef.current.colKey]: next,
      }));
    };
    const onUp = () => {
      resizeRef.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const tablePixelWidth = useMemo(() => {
    const colsW = columns.reduce(
      (sum, col) => sum + (columnWidths[col.key] ?? defaultWidthForCol(col)),
      0,
    );
    const hasId = columns.some((c) => c.key === "id");
    return colsW + (hasId ? 0 : ID_COL_WIDTH) + ACTIONS_COL_WIDTH;
  }, [columns, columnWidths]);

  const getRowId = (row) =>
    (row?.id != null && String(row.id).startsWith("temp-")) ? row.id : (row?.[primaryKey] ?? row?.id);

  const fetchData = async () => {
    setLoading(true);
    const { data: rows, error } = await supabase.from(tableName).select("*").order(primaryKey, { ascending: true });
    if (!error) setData(rows || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    setFilters({});
    setSortConfig((prev) => ({ ...prev, key: sortDefault }));
  }, [tableName, primaryKey]);

  const editingRow = useMemo(() => {
    if (modalRowId == null) return null;
    return (
      data.find((r) => {
        const rid =
          r?.id != null && String(r.id).startsWith("temp-")
            ? r.id
            : (r?.[primaryKey] ?? r?.id);
        return String(rid) === String(modalRowId);
      }) ?? null
    );
  }, [modalRowId, data, primaryKey]);

  useEffect(() => {
    if (modalRowId != null && editingRow == null) {
      setModalRowId(null);
    }
  }, [modalRowId, editingRow]);

  const openRowEditor = (r) => setModalRowId(getRowId(r));

  useEffect(() => {
    const hasDrafts = data.some(row => String(row.id).startsWith("temp-"));
    if (onDirtyChange) onDirtyChange(hasDrafts);
    
    const handleBeforeUnload = (e) => {
      if (hasDrafts) {
        e.preventDefault();
        e.returnValue = ''; 
        return '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [data, onDirtyChange]);

  const sanitizeValue = (val) => {
    return val === "" ? null : val;
  };

  const handleAutoSave = async (id, key, value) => {
    let cleanValue = sanitizeValue(value);
    const colDef = columns.find((c) => c.key === key);
    if (colDef?.type === "svg") {
      const prepared = sanitizeStagePlotSvgMarkup(cleanValue || "");
      if (!prepared.ok) {
        console.error(prepared.error);
        return false;
      }
      cleanValue = prepared.svg || null;
    }

    if (String(id).startsWith("temp-")) {
        setData((prev) =>
            prev.map((row) => (row.id === id ? { ...row, [key]: cleanValue } : row))
        );
        return true; 
    }

    if (key === 'id') return false; 

    try {
      const { error } = await supabase
        .from(tableName)
        .update({ [key]: cleanValue })
        .eq(primaryKey, id);

      if (error) throw error;

      setData((prev) =>
        prev.map((row) => (getRowId(row) === id ? { ...row, [key]: cleanValue } : row))
      );
      if (key === "svg_icon" || key === "stage_plot_type" || key === "stage_plot_width_cm" || key === "stage_plot_height_cm") {
        reloadStagePlotInstrumentIcons().catch(() => {});
      }
      if (onDataChange) onDataChange();
      return true;
    } catch (err) {
      console.error("Error saving:", err);
      return false;
    }
  };

  const handleCreate = () => {
    const tempId = `temp-${Date.now()}`;
    const newRow = { id: tempId, _manual_id: "" };
    if (primaryKey !== "id") {
      newRow[primaryKey] = null;
    }

    columns.forEach((col) => {
      if (col.key !== "id" && col.key !== primaryKey) {
        if (col.defaultValue !== undefined) {
          newRow[col.key] = col.defaultValue;
        } else if (col.type === "checkbox") {
          newRow[col.key] = false;
        } else {
          newRow[col.key] = null;
        }
      }
    });

    setData((prev) => [newRow, ...prev]);
  };

  const getDraftSnapshotFromForm = (baseRow, formState) => {
    const out = { ...baseRow };
    columns.forEach((col) => {
      if (col.key === "id") {
        out._manual_id =
          formState[col.key] === "" ? "" : formState[col.key];
        return;
      }
      const v = formState[col.key];
      if (col.type === "checkbox") {
        out[col.key] = !!v;
        return;
      }
      if (col.type === "date") {
        out[col.key] = v === "" ? null : v;
        return;
      }
      if (col.type === "number" || col.type === "int") {
        out[col.key] =
          v === "" || v === null || v === undefined ? null : Number(v);
        return;
      }
      if (col.type === "int8") {
        out[col.key] =
          v === "" || v === null || v === undefined ? null : v;
        return;
      }
      out[col.key] = v === "" ? null : v;
    });
    return out;
  };

  const handleSaveNewRow = async (tempId, rowSnapshot) => {
    setIsSavingNew(true);
    try {
        const rowToSave = rowSnapshot ?? data.find(r => r.id === tempId);
        if(!rowToSave) return false;

        const payload = {};
        const hasIdCol = columns.some(c => c.key === "id");

        columns.forEach(col => {
            if (col.key === "id") {
                payload.id = rowToSave._manual_id || null;
            } else {
                const val = rowToSave[col.key];
                payload[col.key] = val === "" ? null : val;
            }
        });

        const pkRequired = primaryKey !== "id" ? payload[primaryKey] : (hasIdCol ? payload.id : true);
        if (!pkRequired) {
            alert(`El campo ${primaryKey} es obligatorio.`);
            return false;
        }

        const { data: inserted, error } = await supabase
            .from(tableName)
            .insert([payload])
            .select()
            .single();

        if (error) throw error;

        setData(prev => prev.map(r => r.id === tempId ? inserted : r));
        if (onDataChange) onDataChange();
        return true;

    } catch (err) {
        alert("Error al crear: " + err.message);
        return false;
    } finally {
        setIsSavingNew(false);
    }
  };

  const handleDelete = async (id) => {
    if (String(id).startsWith("temp-")) {
        setData((prev) => prev.filter((r) => r.id !== id));
        return;
    }
    if (!(await confirm({
      title: "Eliminar registro",
      message: "¿Eliminar este registro permanentemente?",
      destructive: true,
    }))) return;
    try {
      const { error } = await supabase.from(tableName).delete().eq(primaryKey, id);
      if (error) throw error;
      setData((prev) => prev.filter((r) => getRowId(r) !== id));
      if (onDataChange) onDataChange();
    } catch (err) {
      alert("Error al eliminar: " + err.message);
    }
  };

  const processedData = useMemo(() => {
    let result = [...data];

    Object.keys(filters).forEach((key) => {
      const filterVal = filters[key].toLowerCase();
      if (filterVal) {
        result = result.filter((row) => {
          const cellVal = String(row[key] || "").toLowerCase();
          const colDef = columns.find(c => c.key === key);
          if (colDef?.type === 'select') {
             const option =
               colDef.options?.find(opt => String(opt.value) === String(row[key])) ||
               colDef.options?.find(
                 (opt) =>
                   normalizeIconValue(opt.value) === normalizeIconValue(String(row[key])),
               );
             const label = option ? option.label.toLowerCase() : "";
             return cellVal.includes(filterVal) || label.includes(filterVal);
          }
          return cellVal.includes(filterVal);
        });
      }
    });

    if (sortConfig.key) {
      result.sort((a, b) => {
        const isDraftA = String(a?.id).startsWith("temp-");
        const isDraftB = String(b?.id).startsWith("temp-");
        if (isDraftA && !isDraftB) return -1;
        if (!isDraftA && isDraftB) return 1;

        const valA = a[sortConfig.key] ?? "";
        const valB = b[sortConfig.key] ?? "";
        const sortCol = columns.find((c) => c.key === sortConfig.key);

        const numA = parseFloat(valA);
        const numB = parseFloat(valB);
        let comparison = 0;

        if (sortCol?.type === "select") {
          comparison = labelForSelectValue(valA, sortCol.options).localeCompare(
            labelForSelectValue(valB, sortCol.options),
          );
        } else if (
          !isNaN(numA) &&
          !isNaN(numB) &&
          String(numA) === String(valA) &&
          String(numB) === String(valB)
        ) {
          comparison = numA - numB;
        } else {
          comparison = String(valA).localeCompare(String(valB));
        }
        return sortConfig.direction === "asc" ? comparison : -comparison;
      });
    }
    return result;
  }, [data, filters, sortConfig, columns]);

  const exportData = useMemo(() => {
    return processedData.map((row) => {
      const out = { ...row };
      columns.forEach((col) => {
        if (col.type === "select") {
          out[col.key] = labelForSelectValue(row[col.key], col.options);
        }
      });
      return out;
    });
  }, [processedData, columns]);

  const exportColumns = useMemo(
    () =>
      (columns || []).map((col) => ({
        header: col.label || col.key,
        key: col.key,
        width: col.width,
        type:
          col.type === "number"
            ? "number"
            : col.type === "date"
            ? "date"
            : "text",
      })),
    [columns]
  );

  const handleHeaderClick = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const hasExplicitId = columns.some(c => c.key === 'id');

  const tableColSpanEmpty =
    columns.length + (hasExplicitId ? 1 : 2);

  return (
    <>
    {dialog}
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-full min-h-0 overflow-hidden">
      {/* Header */}
      <div className="px-2 py-2 sm:px-3 sm:py-2.5 md:px-4 md:py-3 border-b border-slate-200 bg-white flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-start md:items-center shrink-0 z-20">
        <div className="flex flex-col gap-1 min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 md:gap-3">
                <h3 className="font-bold text-slate-800 uppercase text-xs md:text-sm tracking-wide flex items-center gap-2 truncate">
                    {tableName}
                    {loading && <IconLoader className="animate-spin text-indigo-500 shrink-0" size={14} />}
                </h3>
                <span className="text-[10px] md:text-xs text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100 shrink-0">
                    {processedData.length} / {data.length} filas
                </span>
            </div>
            {/* --- CAMBIO: RENDERIZADO DEL AVISO --- */}
            {warningMessage && (
                <div className="flex items-start gap-2 text-[10px] md:text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded-md animate-in fade-in slide-in-from-top-1 max-w-full md:max-w-xl">
                    <IconAlertTriangle size={14} className="shrink-0 mt-0.5" />
                    <span className="min-w-0">{warningMessage}</span>
                </div>
            )}
        </div>
        <div className="flex items-center justify-end gap-2 shrink-0 w-full sm:w-auto flex-wrap">
          {allowMergeLocaciones && (
            <button
              type="button"
              onClick={() => setMergeOpen(true)}
              className="flex items-center justify-center gap-1.5 min-h-[44px] md:min-h-0 px-3 py-2 md:py-1.5 bg-violet-50 text-violet-800 border border-violet-200 rounded-lg text-xs font-bold hover:bg-violet-100 transition-all shadow-sm"
              title="Combinar locaciones duplicadas y remapear referencias"
            >
              <IconMerge size={14} className="shrink-0" />
              <span className="hidden sm:inline">Unificar locaciones</span>
              <span className="sm:hidden">Unificar</span>
            </button>
          )}
          <UniversalExporter
            data={exportData}
            columns={exportColumns}
            fileName={tableName}
            orientation="l"
          />
          <button
            onClick={handleCreate}
            type="button"
            className="flex items-center justify-center gap-1.5 min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0 px-3 py-2 md:py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-sm active:scale-95"
          >
            <IconPlus size={14} className="shrink-0" />
            <span className="hidden sm:inline">Agregar</span>
          </button>
        </div>
      </div>

      {/* Tabla: scroll horizontal táctil sin romper el layout del dashboard */}
      <div className="flex-1 min-h-0 overflow-x-auto overflow-y-auto overscroll-x-contain [-webkit-overflow-scrolling:touch]">
        <table
          className="text-left border-collapse table-fixed"
          style={{ width: tablePixelWidth, minWidth: tablePixelWidth }}
        >
          <colgroup>
            {!hasExplicitId && <col style={{ width: ID_COL_WIDTH }} />}
            {columns.map((col) => (
              <col key={`col-${col.key}`} style={{ width: getColWidth(col) }} />
            ))}
            <col style={{ width: ACTIONS_COL_WIDTH }} />
          </colgroup>
          <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
            <tr>
              {!hasExplicitId && (
                  <th className="px-2 py-2 text-xs font-bold text-slate-400 uppercase text-center border-b border-slate-200">#</th>
              )}
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => handleHeaderClick(col.key)}
                  className="relative px-2 py-2 text-xs font-bold text-slate-600 uppercase border-b border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors select-none group align-bottom"
                  style={{ width: getColWidth(col) }}
                >
                  <div className="flex items-center justify-between gap-1 pr-2 min-w-0">
                    <span className="truncate">{col.label}</span>
                    <span className={`shrink-0 text-slate-400 ${sortConfig.key === col.key ? "text-indigo-600" : "opacity-0 group-hover:opacity-50"}`}>
                      {sortConfig.key === col.key && sortConfig.direction === "desc" ? <IconSortDesc size={14} /> : <IconSortAsc size={14} />}
                    </span>
                  </div>
                  <span
                    role="separator"
                    aria-orientation="vertical"
                    aria-label={`Redimensionar columna ${col.label}`}
                    onMouseDown={(e) => startResize(e, col.key)}
                    onClick={(e) => e.stopPropagation()}
                    className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-indigo-400/50 active:bg-indigo-500/60 z-20"
                  />
                </th>
              ))}
              <th className="px-2 py-2 text-center border-b border-slate-200 text-xs font-bold text-slate-400 uppercase">Acciones</th>
            </tr>
            {/* Filtros */}
            <tr className="bg-white">
               {!hasExplicitId && <th className="p-1 border-b border-slate-100 bg-slate-50/50"></th>}
              {columns.map((col) => (
                <th key={`filter-${col.key}`} className="p-1 border-b border-slate-100 bg-slate-50/50 align-top overflow-hidden">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Filtrar..."
                      value={filters[col.key] || ""}
                      onChange={(e) => handleFilterChange(col.key, e.target.value)}
                      className="w-full min-h-[40px] md:min-h-0 px-2 py-2 md:py-1 text-[11px] border border-slate-200 rounded bg-white focus:ring-1 focus:ring-indigo-500 outline-none placeholder:text-slate-300 font-normal"
                    />
                    {filters[col.key] && (
                        <button onClick={() => handleFilterChange(col.key, "")} className="absolute right-1 top-1/2 -translate-y-1/2 text-slate-300 hover:text-red-400"><IconSearch size={10} className="rotate-45" /></button>
                    )}
                  </div>
                </th>
              ))}
              <th className="p-1 border-b border-slate-100 bg-slate-50/50"></th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 bg-white">
            {processedData.map((row) => {
                const isDraft = String(row?.id).startsWith("temp-");
                const rowId = getRowId(row);
                const rowClass = isDraft 
                    ? "bg-amber-50 hover:bg-amber-100 border-l-4 border-l-amber-400 transition-colors" 
                    : "hover:bg-slate-50 group transition-colors border-l-4 border-l-transparent";

                return (
                  <tr key={rowId} className={rowClass}>
                    {/* ID Auto-generado visual (solo si no es explícito) */}
                    {!hasExplicitId && (
                        <td className="px-1 py-1 text-center align-middle overflow-hidden">
                          <div className="flex items-center justify-center gap-0.5 min-w-0">
                            <span className="text-[10px] text-slate-300 font-mono tabular-nums truncate max-w-[5rem]">
                              {isDraft ? (
                                <span className="text-amber-600 font-bold">*</span>
                              ) : (
                                String(rowId ?? "")
                              )}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openRowEditor(row);
                              }}
                              className="shrink-0 p-1.5 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                              title="Editar en formulario"
                              aria-label="Editar fila en formulario"
                            >
                              <IconPencil size={14} />
                            </button>
                          </div>
                        </td>
                    )}
                    
                    {columns.map((col) => (
                      <td
                        key={`${rowId}-${col.key}`}
                        className="px-1 py-1 align-top min-h-[44px] md:h-10 overflow-visible relative"
                        style={{ width: getColWidth(col), maxWidth: getColWidth(col) }}
                      >
                        <EditableCell
                          row={row}
                          col={col}
                          rowId={rowId}
                          onSave={handleAutoSave}
                          onOpenRowModal={openRowEditor}
                        />
                      </td>
                    ))}
                    
                    <td className="px-2 py-1 text-center align-middle overflow-hidden">
                      <div className="flex items-center justify-center gap-1">
                          {isDraft ? (
                              <>
                                <button 
                                    type="button"
                                    onClick={() => handleSaveNewRow(row.id)} 
                                    disabled={isSavingNew}
                                    className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0 p-2 md:p-1.5 bg-white border border-amber-200 text-emerald-600 hover:bg-emerald-50 hover:border-emerald-300 rounded shadow-sm transition-all" 
                                    title="Guardar"
                                >
                                    {isSavingNew ? <IconLoader className="animate-spin" size={14}/> : <IconCheck size={14} />}
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => handleDelete(row.id)} 
                                    className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0 p-2 md:p-1.5 bg-white border border-amber-200 text-red-400 hover:bg-red-50 hover:border-red-300 rounded shadow-sm transition-all" 
                                    title="Descartar"
                                >
                                    <IconX size={14} />
                                </button>
                              </>
                          ) : (
                              <button 
                                type="button"
                                onClick={() => handleDelete(rowId)} 
                                className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0 p-2 md:p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors opacity-100 md:opacity-0 md:group-hover:opacity-100" 
                                title="Eliminar"
                              >
                                <IconTrash size={14} />
                              </button>
                          )}
                      </div>
                    </td>
                  </tr>
                );
            })}
            {!loading && processedData.length === 0 && (
              <tr>
                <td colSpan={tableColSpanEmpty} className="py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center gap-2"><IconAlertCircle size={24} className="opacity-20" /><p className="text-sm">No se encontraron datos</p></div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <RowEditModal
        isOpen={modalRowId != null && editingRow != null}
        onClose={() => setModalRowId(null)}
        tableName={tableName}
        row={editingRow}
        rowId={modalRowId}
        columns={columns}
        isDraft={
          editingRow != null && String(editingRow.id).startsWith("temp-")
        }
        onFieldSave={handleAutoSave}
        onSaveNewRow={handleSaveNewRow}
        getDraftSnapshotFromForm={getDraftSnapshotFromForm}
        isSavingNew={isSavingNew}
      />

      {allowMergeLocaciones && (
        <MergeLocationsModal
          isOpen={mergeOpen}
          onClose={() => setMergeOpen(false)}
          locations={data}
          localidadOptions={localidadOptions}
          supabase={supabase}
          onMergeSuccess={() => {
            fetchData();
            if (onDataChange) onDataChange();
          }}
        />
      )}
    </div>
    </>
  );
}