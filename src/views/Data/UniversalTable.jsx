import React, { useState, useEffect, useRef } from "react";
import {
  IconEdit,
  IconCheck,
  IconX,
  IconTrash,
  IconPlus,
  IconChevronDown,
  IconSearch,
} from "../../components/ui/Icons";

// --- COMPONENTE SMART SELECT (Combobox con autocompletado) ---
const SmartSelect = ({ value, options = [], onChange, placeholder = "Seleccionar...", autoFocus = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Sincronizar el término de búsqueda con el valor actual (ID -> Label)
  useEffect(() => {
    const selectedOption = options.find((opt) => String(opt.value) === String(value));
    if (selectedOption) {
      setSearchTerm(selectedOption.label);
    } else {
      setSearchTerm("");
    }
  }, [value, options]);

  // Filtrar opciones basado en lo que escribe el usuario
  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Manejar clics fuera para cerrar
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        // Si lo que escribió no coincide exactamente, revertimos al valor original visualmente
        const selectedOption = options.find((opt) => String(opt.value) === String(value));
        setSearchTerm(selectedOption ? selectedOption.label : "");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [value, options, searchTerm]);

  const handleSelect = (option) => {
    onChange(option.value);
    setSearchTerm(option.label);
    setIsOpen(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIsOpen(true);
      setHighlightedIndex((prev) =>
        prev < filteredOptions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === "Enter") {
      // Si el menú está abierto, seleccionamos la opción resaltada
      if (isOpen && filteredOptions.length > 0) {
        e.preventDefault();
        e.stopPropagation(); // Evita que se guarde el formulario padre
        handleSelect(filteredOptions[highlightedIndex]);
      }
      // Si está cerrado, dejamos pasar el evento para que el padre (la tabla) guarde
    } else if (e.key === "Escape") {
      setIsOpen(false);
    } else if (e.key === "Tab") {
      setIsOpen(false);
    }
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          autoFocus={autoFocus}
          placeholder={placeholder}
          onClick={() => {
             setIsOpen(true);
             // Seleccionar todo el texto al hacer click para facilitar el reemplazo
             inputRef.current?.select(); 
          }}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
            setHighlightedIndex(0);
            // Si el usuario borra todo, enviamos null o vacío
            if (e.target.value === "") onChange(null);
          }}
          onKeyDown={handleKeyDown}
          className="w-full p-1.5 pr-8 border border-indigo-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow"
        />
        <div 
          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 cursor-pointer"
          onClick={() => {
            setIsOpen(!isOpen);
            if(!isOpen) inputRef.current?.focus();
          }}
        >
          <IconChevronDown size={14} />
        </div>
      </div>

      {isOpen && filteredOptions.length > 0 && (
        <ul className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-48 overflow-y-auto">
          {filteredOptions.map((opt, index) => (
            <li
              key={opt.value}
              onClick={() => handleSelect(opt)}
              className={`px-3 py-2 text-sm cursor-pointer transition-colors ${
                index === highlightedIndex
                  ? "bg-indigo-50 text-indigo-700 font-medium"
                  : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              {opt.label}
            </li>
          ))}
        </ul>
      )}
      {isOpen && filteredOptions.length === 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg p-2 text-xs text-slate-400 text-center">
          Sin resultados
        </div>
      )}
    </div>
  );
};

// --- COMPONENTE PRINCIPAL DE TABLA ---
export default function UniversalTable({
  supabase,
  tableName,
  columns,
  defaultSort = "id",
  onDataChange,
}) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  // Estado de Edición
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [isCreating, setIsCreating] = useState(false);

  // Cargar datos
  const fetchData = async () => {
    setLoading(true);
    const { data: rows, error } = await supabase
      .from(tableName)
      .select("*")
      .order(defaultSort, { ascending: true });

    if (!error) setData(rows || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    // Resetear edición al cambiar de tabla
    handleCancel(); 
  }, [tableName]);

  // Manejadores
  const handleEditClick = (row) => {
    setEditingId(row.id);
    setEditForm(row);
    setIsCreating(false);
  };

  const handleCreateClick = () => {
    const newRow = {};
    columns.forEach((col) => {
      if (col.key !== "id") newRow[col.key] = col.defaultValue || "";
    });
    setEditForm(newRow);
    setEditingId("NEW_TEMP");
    setIsCreating(true);
  };

  const handleChange = (key, value) => {
    setEditForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditForm({});
    setIsCreating(false);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const payload = { ...editForm };
      if (isCreating) delete payload.id;

      const { error } = await supabase.from(tableName).upsert(payload).select();

      if (error) throw error;

      await fetchData();
      if (onDataChange) onDataChange();
      handleCancel();
    } catch (error) {
      alert("Error al guardar: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("¿Seguro que deseas eliminar este registro?")) return;
    setLoading(true);
    try {
      const { error } = await supabase.from(tableName).delete().eq("id", id);
      if (error) throw error;
      await fetchData();
      if (onDataChange) onDataChange();
    } catch (error) {
      alert("Error al eliminar: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Manejador global de teclas en la fila (Enter para guardar, Esc para cancelar)
  const handleRowKeyDown = (e) => {
    if (e.key === "Enter") {
       // Solo guardamos si no se previno el default (el SmartSelect previene el default si está seleccionando)
       if (!e.defaultPrevented) {
          handleSave();
       }
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  // Renderizado de celdas
  const renderCell = (row, col, isFirstEditable) => {
    const isEditing =
      editingId === row.id ||
      (isCreating && editingId === "NEW_TEMP" && row.id === "NEW_TEMP");
    
    const value = isEditing ? editForm[col.key] : row[col.key];

    // --- MODO EDICIÓN ---
    if (isEditing && col.editable !== false) {
      // 1. SELECT INTELIGENTE (Combobox)
      if (col.type === "select") {
        return (
          <SmartSelect
            value={value}
            options={col.options}
            onChange={(val) => handleChange(col.key, val)}
            autoFocus={isFirstEditable} // AutoFocus inteligente
          />
        );
      }

      // 2. INPUT DE COLOR
      if (col.type === "color") {
        return (
          <div className="flex items-center gap-2 bg-white rounded border border-indigo-200 p-1">
            <input
              type="color"
              value={value || "#ffffff"}
              onChange={(e) => handleChange(col.key, e.target.value)}
              className="h-6 w-8 p-0 border-0 rounded cursor-pointer shrink-0"
              autoFocus={isFirstEditable}
            />
            <input
              type="text"
              value={value || ""}
              onChange={(e) => handleChange(col.key, e.target.value)}
              className="w-20 p-0 text-xs border-0 focus:ring-0 font-mono uppercase"
              maxLength={7}
            />
          </div>
        );
      }

      // 3. INPUT DE TEXTO ESTÁNDAR
      return (
        <input
          type="text"
          value={value || ""}
          onChange={(e) => handleChange(col.key, e.target.value)}
          autoFocus={isFirstEditable}
          className="w-full p-1.5 border border-indigo-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
        />
      );
    }

    // --- MODO LECTURA ---
    if (col.type === "select") {
      const option = col.options?.find(
        (opt) => String(opt.value) === String(value)
      );
      return (
        <span className="text-slate-700 font-medium">
          {option ? option.label : <span className="text-slate-300 italic">Sin asignar</span>}
        </span>
      );
    }

    if (col.type === "color") {
      return (
        <div className="flex items-center gap-2">
          <div
            className="w-5 h-5 rounded-full border border-black/10 shadow-sm"
            style={{ backgroundColor: value }}
          ></div>
          <span className="text-xs font-mono text-slate-500 uppercase">{value}</span>
        </div>
      );
    }

    return <span className="text-slate-700">{value}</span>;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-full overflow-hidden">
      {/* Header Tabla */}
      <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-2">
           <h3 className="font-bold text-slate-800 uppercase text-sm tracking-wide">
             {tableName}
           </h3>
           <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
             {data.length} registros
           </span>
        </div>
        <button
          onClick={handleCreateClick}
          disabled={loading || editingId !== null}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow active:scale-95"
        >
          <IconPlus size={16} /> Nuevo
        </button>
      </div>

      {/* Tabla Scrollable */}
      <div className="flex-1 overflow-auto bg-slate-50/50">
        <table className="w-full text-left border-collapse">
          <thead className="bg-white sticky top-0 z-10 shadow-sm">
            <tr>
              <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase w-16 text-center tracking-wider">
                ID
              </th>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider"
                >
                  {col.label}
                </th>
              ))}
              <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase w-24 text-right tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {/* Fila temporal de creación */}
            {isCreating && (
              <tr 
                className="bg-indigo-50/50 animate-in fade-in duration-200"
                onKeyDown={handleRowKeyDown}
              >
                <td className="px-4 py-3 text-center text-xs text-indigo-400 font-mono font-bold">
                  NEW
                </td>
                {columns.map((col, idx) => (
                  <td key={col.key} className="px-4 py-2 align-middle">
                    {/* El primer campo editable recibe el foco automático */}
                    {renderCell({ id: "NEW_TEMP" }, col, idx === 0)}
                  </td>
                ))}
                <td className="px-4 py-2 align-middle">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={handleSave}
                      className="p-2 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition-colors shadow-sm"
                      title="Guardar (Enter)"
                    >
                      <IconCheck size={18} />
                    </button>
                    <button
                      onClick={handleCancel}
                      className="p-2 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
                      title="Cancelar (Esc)"
                    >
                      <IconX size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            )}

            {data.map((row) => {
               const isEditingThis = editingId === row.id;
               return (
                <tr
                  key={row.id}
                  onKeyDown={isEditingThis ? handleRowKeyDown : undefined}
                  className={`group transition-colors border-l-4 ${
                    isEditingThis
                      ? "bg-indigo-50/30 border-l-indigo-500"
                      : "hover:bg-slate-50 border-l-transparent"
                  }`}
                >
                  <td className="px-4 py-3 text-center text-xs text-slate-400 font-mono">
                    {row.id}
                  </td>
                  {columns.map((col, idx) => (
                    <td key={col.key} className="px-4 py-3 text-sm align-middle">
                      {renderCell(row, col, isEditingThis && idx === 0)}
                    </td>
                  ))}
                  <td className="px-4 py-3 align-middle">
                    <div className="flex justify-end gap-2">
                      {isEditingThis ? (
                        <>
                          <button
                            onClick={handleSave}
                            className="p-1.5 bg-emerald-100 text-emerald-700 rounded-md hover:bg-emerald-200 transition-colors"
                            title="Guardar"
                          >
                            <IconCheck size={16} />
                          </button>
                          <button
                            onClick={handleCancel}
                            className="p-1.5 bg-white border border-slate-200 text-slate-600 rounded-md hover:bg-slate-100 transition-colors"
                            title="Cancelar"
                          >
                            <IconX size={16} />
                          </button>
                        </>
                      ) : (
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <button
                            onClick={() => handleEditClick(row)}
                            className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                            title="Editar"
                          >
                            <IconEdit size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(row.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                            title="Eliminar"
                          >
                            <IconTrash size={16} />
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {data.length === 0 && !loading && !isCreating && (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-2">
            <IconSearch size={32} className="opacity-20" />
            <p className="text-sm">No hay datos registrados</p>
          </div>
        )}
      </div>
    </div>
  );
}