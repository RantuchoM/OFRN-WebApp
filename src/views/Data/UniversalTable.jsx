import React, { useState, useEffect, useMemo, useRef } from "react";
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
  IconX
} from "../../components/ui/Icons";

// --- SUB-COMPONENTE: SELECTOR BUSCABLE (COMBOBOX) ---
const SearchableSelect = ({ value, options, onChange, onBlur, className }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    // Si el valor es null/undefined, mostramos vacío. Si hay valor, buscamos label.
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
          onChange(null); // Permitir limpiar (NULL)
      } else {
          // Revertir
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
        className="w-full h-full bg-transparent border-none outline-none text-sm px-2 py-1.5 cursor-text placeholder:text-slate-300"
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
const EditableCell = ({ row, col, onSave }) => {
  const [value, setValue] = useState(row[col.key]);
  const [status, setStatus] = useState("idle"); 
  const inputRef = useRef(null);

  useEffect(() => {
    setValue(row[col.key]);
  }, [row, col.key]);

  const handleSave = async (newValue) => {
    const valToSave = newValue !== undefined ? newValue : value;
    
    if (valToSave === row[col.key]) {
      setStatus("idle");
      return;
    }

    setStatus("saving");
    const success = await onSave(row.id, col.key, valToSave);
    if (success) {
      setStatus("success");
      setTimeout(() => setStatus("idle"), 2000);
    } else {
      setStatus("error");
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      inputRef.current?.blur();
    }
  };

  const getStatusClass = () => {
    if (status === "editing") return "ring-2 ring-indigo-500 z-10 bg-white shadow-sm";
    if (status === "saving") return "bg-slate-100 text-slate-400";
    if (status === "success") return "bg-emerald-50 transition-colors duration-500";
    if (status === "error") return "bg-red-50 ring-2 ring-red-500 z-10";
    return "hover:bg-slate-50 focus-within:bg-white focus-within:ring-2 focus-within:ring-indigo-500 focus-within:z-10";
  };

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
        />
      </div>
    );
  }

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

  return (
    <input
      ref={inputRef}
      type="text"
      // Si es null, mostramos string vacío para que React no se queje
      value={value === null || value === undefined ? "" : value}
      onChange={(e) => setValue(e.target.value)}
      onFocus={() => setStatus("editing")}
      onBlur={() => handleSave()}
      onKeyDown={handleKeyDown}
      className={`w-full h-full px-2 py-1.5 bg-transparent border-none outline-none text-sm rounded transition-all ${getStatusClass()}`}
      placeholder={col.placeholder || "Empty"} // Placeholder opcional
    />
  );
};

// --- COMPONENTE PRINCIPAL ---
export default function UniversalTable({
  supabase,
  tableName,
  columns,
  defaultSort = "id",
  onDataChange,
}) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: defaultSort, direction: "asc" });
  const [filters, setFilters] = useState({});
  const [isSavingNew, setIsSavingNew] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const { data: rows, error } = await supabase.from(tableName).select("*");
    if (!error) setData(rows || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    setFilters({});
  }, [tableName]);

  // HELPER: Convertir "" a null para evitar errores de tipo en BD
  const sanitizeValue = (val) => {
    return val === "" ? null : val;
  };

  // 1. MANEJAR CAMBIOS (AutoSave para existentes, State para borradores)
  const handleAutoSave = async (id, key, value) => {
    const cleanValue = sanitizeValue(value);

    // A) Si es borrador (ID temporal), solo actualizamos el estado local
    if (id.toString().startsWith("temp-")) {
        setData((prev) =>
            prev.map((row) => (row.id === id ? { ...row, [key]: cleanValue } : row))
        );
        return true; 
    }

    // B) Si es fila real, actualizamos en BD
    try {
      const { error } = await supabase
        .from(tableName)
        .update({ [key]: cleanValue })
        .eq("id", id);

      if (error) throw error;

      setData((prev) =>
        prev.map((row) => (row.id === id ? { ...row, [key]: cleanValue } : row))
      );
      if (onDataChange) onDataChange();
      return true;
    } catch (err) {
      console.error("Error saving:", err);
      // No mostramos alert en autosave para no interrumpir el flujo, solo log
      return false;
    }
  };

  // 2. CREAR BORRADOR (Solo local)
  const handleCreate = () => {
    const tempId = `temp-${Date.now()}`;
    const newRow = { id: tempId };
    
    // Inicializamos columnas como NULL explícitamente (no string vacío)
    columns.forEach((col) => {
      newRow[col.key] = col.defaultValue !== undefined ? col.defaultValue : null; 
    });

    // Agregamos al inicio
    setData((prev) => [newRow, ...prev]);
  };

  // 3. GUARDAR BORRADOR EN BD (Insert final)
  const handleSaveNewRow = async (id) => {
    setIsSavingNew(true);
    try {
        const rowToSave = data.find(r => r.id === id);
        if(!rowToSave) return;

        // Construir payload limpio
        const payload = {};
        columns.forEach(col => {
            // Aseguramos que si es string vacío vaya como null
            const val = rowToSave[col.key];
            payload[col.key] = val === "" ? null : val;
        });

        // Insertar
        const { data: inserted, error } = await supabase
            .from(tableName)
            .insert([payload])
            .select()
            .single();

        if (error) throw error;

        // Reemplazamos el borrador por la fila real devuelta por Supabase
        setData(prev => prev.map(r => r.id === id ? inserted : r));
        
        if (onDataChange) onDataChange();

    } catch (err) {
        alert("Error al crear el registro: " + err.message);
    } finally {
        setIsSavingNew(false);
    }
  };

  // 4. ELIMINAR (Local o DB)
  const handleDelete = async (id) => {
    // A) Si es borrador, solo lo quitamos del estado
    if (id.toString().startsWith("temp-")) {
        setData((prev) => prev.filter((r) => r.id !== id));
        return;
    }

    // B) Si es real, pedimos confirmación
    if (!confirm("¿Eliminar este registro permanentemente?")) return;
    try {
      const { error } = await supabase.from(tableName).delete().eq("id", id);
      if (error) throw error;
      setData((prev) => prev.filter((r) => r.id !== id));
      if (onDataChange) onDataChange();
    } catch (err) {
      alert("Error al eliminar: " + err.message);
    }
  };

  const processedData = useMemo(() => {
    let result = [...data];

    // Filtrar
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

    // Ordenar
    if (sortConfig.key) {
      result.sort((a, b) => {
        // Los borradores siempre arriba
        if (String(a.id).startsWith("temp-") && !String(b.id).startsWith("temp-")) return -1;
        if (!String(a.id).startsWith("temp-") && String(b.id).startsWith("temp-")) return 1;

        const valA = a[sortConfig.key] ?? "";
        const valB = b[sortConfig.key] ?? "";
        const numA = parseFloat(valA);
        const numB = parseFloat(valB);
        let comparison = 0;
        if (!isNaN(numA) && !isNaN(numB)) {
            comparison = numA - numB;
        } else {
            comparison = String(valA).localeCompare(String(valB));
        }
        return sortConfig.direction === "asc" ? comparison : -comparison;
      });
    }
    return result;
  }, [data, filters, sortConfig, columns]);

  const handleHeaderClick = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-full overflow-hidden">
      {/* Header General */}
      <div className="px-4 py-3 border-b border-slate-200 bg-white flex justify-between items-center shrink-0 z-20">
        <div className="flex items-center gap-3">
          <h3 className="font-bold text-slate-800 uppercase text-sm tracking-wide flex items-center gap-2">
            {tableName}
            {loading && <IconLoader className="animate-spin text-indigo-500" size={14} />}
          </h3>
          <span className="text-xs text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100">
            {processedData.length} / {data.length} filas
          </span>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-sm active:scale-95"
        >
          <IconPlus size={14} />
          <span>Agregar</span>
        </button>
      </div>

      {/* Tabla */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
            {/* Títulos */}
            <tr>
              <th className="px-2 py-2 text-xs font-bold text-slate-400 uppercase w-10 text-center border-b border-slate-200">#</th>
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => handleHeaderClick(col.key)}
                  className="px-2 py-2 text-xs font-bold text-slate-600 uppercase border-b border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors select-none group"
                  style={{ minWidth: col.width || "120px" }}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span>{col.label}</span>
                    <span className={`text-slate-400 ${sortConfig.key === col.key ? "text-indigo-600" : "opacity-0 group-hover:opacity-50"}`}>
                      {sortConfig.key === col.key && sortConfig.direction === "desc" ? <IconSortDesc size={14} /> : <IconSortAsc size={14} />}
                    </span>
                  </div>
                </th>
              ))}
              <th className="px-2 py-2 w-16 text-center border-b border-slate-200 text-xs font-bold text-slate-400 uppercase">Acciones</th>
            </tr>
            {/* Filtros */}
            <tr className="bg-white">
              <th className="p-1 border-b border-slate-100 bg-slate-50/50"></th>
              {columns.map((col) => (
                <th key={`filter-${col.key}`} className="p-1 border-b border-slate-100 bg-slate-50/50">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Filtrar..."
                      value={filters[col.key] || ""}
                      onChange={(e) => handleFilterChange(col.key, e.target.value)}
                      className="w-full px-2 py-1 text-[11px] border border-slate-200 rounded bg-white focus:ring-1 focus:ring-indigo-500 outline-none placeholder:text-slate-300 font-normal"
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
                const isDraft = String(row.id).startsWith("temp-");
                return (
                  <tr key={row.id} className={`hover:bg-slate-50 group transition-colors ${isDraft ? 'bg-indigo-50/30' : ''}`}>
                    <td className="px-2 py-1 text-center text-[10px] text-slate-300 font-mono">
                        {isDraft ? <span className="text-indigo-400 font-bold">*</span> : row.id}
                    </td>
                    {columns.map((col) => (
                      <td key={`${row.id}-${col.key}`} className="px-1 py-1 align-top h-10">
                        <EditableCell row={row} col={col} onSave={handleAutoSave} />
                      </td>
                    ))}
                    <td className="px-2 py-1 text-center align-middle">
                      <div className="flex items-center justify-center gap-1">
                          {isDraft ? (
                              <>
                                <button 
                                    onClick={() => handleSaveNewRow(row.id)} 
                                    disabled={isSavingNew}
                                    className="p-1.5 text-emerald-600 hover:bg-emerald-100 rounded transition-colors" 
                                    title="Guardar nuevo registro"
                                >
                                    {isSavingNew ? <IconLoader className="animate-spin" size={14}/> : <IconCheck size={14} />}
                                </button>
                                <button 
                                    onClick={() => handleDelete(row.id)} 
                                    className="p-1.5 text-red-400 hover:bg-red-100 rounded transition-colors" 
                                    title="Cancelar"
                                >
                                    <IconX size={14} />
                                </button>
                              </>
                          ) : (
                              <button 
                                onClick={() => handleDelete(row.id)} 
                                className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors opacity-0 group-hover:opacity-100" 
                                title="Eliminar fila"
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
                <td colSpan={columns.length + 2} className="py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center gap-2"><IconAlertCircle size={24} className="opacity-20" /><p className="text-sm">No se encontraron datos</p></div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}