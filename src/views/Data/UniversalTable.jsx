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
} from "../../components/ui/Icons";
import UniversalExporter from "../../components/ui/UniversalExporter";

const toDateInputValue = (v) => {
  if (v == null || v === "") return "";
  const s = String(v);
  return s.length >= 10 ? s.slice(0, 10) : s;
};

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
                    value={v === null || v === undefined ? "" : String(v)}
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
                {!readOnlyId &&
                  !["checkbox", "select", "color", "date", "number", "int", "int8"].includes(
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
    const selected = options.find(opt => String(opt.value) === String(value));
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

// --- SUB-COMPONENTE: CELDA EDITABLE ---
const EditableCell = ({ row, col, rowId, onSave, onOpenRowModal }) => {
  const isDraft = String(row.id).startsWith("temp-");
  const initialValue = (col.key === 'id' && isDraft) ? (row._manual_id || "") : row[col.key];

  const [value, setValue] = useState(initialValue);
  const [status, setStatus] = useState("idle"); 
  const inputRef = useRef(null);

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

  useEffect(() => {
    const nextVal = (col.key === 'id' && isDraft) ? (row._manual_id || "") : row[col.key];
    setValue(nextVal);
  }, [row, col.key, isDraft]);

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

  // 4. TEXTO
  return (
    <input
      ref={inputRef}
      type="text"
      value={value === null || value === undefined ? "" : value}
      onChange={(e) => {
          setValue(e.target.value);
          if(isDraft) {
             const targetKey = col.key === 'id' ? '_manual_id' : col.key;
             onSave(rowId, targetKey, e.target.value); 
          }
      }}
      onFocus={() => setStatus("editing")}
      onBlur={() => handleSave()}
      onKeyDown={handleKeyDown}
      className={`w-full h-full min-h-[44px] md:min-h-0 px-2 py-2 md:py-1.5 bg-transparent border-none outline-none text-sm rounded transition-all ${getStatusClass()}`}
      placeholder={col.placeholder || "Empty"}
    />
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
  const sortDefault = defaultSort ?? primaryKey;
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: sortDefault, direction: "asc" });
  const [filters, setFilters] = useState({});
  const [isSavingNew, setIsSavingNew] = useState(false);
  const [modalRowId, setModalRowId] = useState(null);

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
    const cleanValue = sanitizeValue(value);

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
    if (!confirm("¿Eliminar este registro permanentemente?")) return;
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
             const option = colDef.options?.find(opt => String(opt.value) === String(row[key]));
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
        
        const numA = parseFloat(valA);
        const numB = parseFloat(valB);
        let comparison = 0;
        
        if (!isNaN(numA) && !isNaN(numB) && String(numA) === String(valA) && String(numB) === String(valB)) {
            comparison = numA - numB;
        } else {
            comparison = String(valA).localeCompare(String(valB));
        }
        return sortConfig.direction === "asc" ? comparison : -comparison;
      });
    }
    return result;
  }, [data, filters, sortConfig, columns]);

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
        <div className="flex items-center justify-end gap-2 shrink-0 w-full sm:w-auto">
          <UniversalExporter
            data={processedData}
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
        <table className="w-max max-w-full text-left border-collapse table-auto">
          <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
            <tr>
              {!hasExplicitId && (
                  <th className="px-2 py-2 text-xs font-bold text-slate-400 uppercase text-center border-b border-slate-200 w-auto">#</th>
              )}
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => handleHeaderClick(col.key)}
                  className="px-2 py-2 text-xs font-bold text-slate-600 uppercase border-b border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors select-none group align-bottom"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span>{col.label}</span>
                    <span className={`text-slate-400 ${sortConfig.key === col.key ? "text-indigo-600" : "opacity-0 group-hover:opacity-50"}`}>
                      {sortConfig.key === col.key && sortConfig.direction === "desc" ? <IconSortDesc size={14} /> : <IconSortAsc size={14} />}
                    </span>
                  </div>
                </th>
              ))}
              <th className="px-2 py-2 text-center border-b border-slate-200 text-xs font-bold text-slate-400 uppercase w-auto">Acciones</th>
            </tr>
            {/* Filtros */}
            <tr className="bg-white">
               {!hasExplicitId && <th className="p-1 border-b border-slate-100 bg-slate-50/50"></th>}
              {columns.map((col) => (
                <th key={`filter-${col.key}`} className="p-1 border-b border-slate-100 bg-slate-50/50 align-top">
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
                        <td className="px-1 py-1 text-center align-middle">
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
                        className="px-1 py-1 align-top min-h-[44px] md:h-10"
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
                    
                    <td className="px-2 py-1 text-center align-middle w-auto">
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
    </div>
  );
}