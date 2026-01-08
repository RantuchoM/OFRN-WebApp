import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  IconUtensils,
  IconLoader,
  IconTrash,
  IconEye,
  IconEyeOff,
  IconCalendar,
  IconX,
  IconInfo,
  IconEdit, // Nuevo icono para edición masiva
  IconCheck, // Nuevo icono para aplicar
} from "../../components/ui/Icons";
import TimeInput from "../../components/ui/TimeInput";

// --- CONSTANTES ---
const SERVICE_IDS = { Desayuno: 7, Almuerzo: 8, Merienda: 9, Cena: 10 };
const ID_TO_SERVICE = { 7: "Desayuno", 8: "Almuerzo", 9: "Merienda", 10: "Cena" };
const SERVICIOS = ["Desayuno", "Almuerzo", "Merienda", "Cena"];
const SERVICE_VALS = { Desayuno: 0, Almuerzo: 1, Merienda: 2, Cena: 3 };

// --- HELPERS PARA ETIQUETAS ---
const getGroupLabelShort = (id) => {
    switch (id) {
        case "GRP:TUTTI": return "Tutti";
        case "GRP:NO_LOCALES": return "solo alojados";
        case "GRP:LOCALES": return "Locales";
        case "GRP:PRODUCCION": return "Producción";
        case "GRP:SOLISTAS": return "Solistas";
        case "GRP:DIRECTORES": return "Directores";
        default: return id;
    }
};

// --- COMPONENTE: SELECT DE UBICACIÓN BUSCABLE ---
const GridLocationSelect = ({ value, onChange, options, disabled, placeholder = "- Lugar -" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (isOpen && containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && inputRef.current) inputRef.current.focus();
  }, [isOpen]);

  const selectedOption = options.find(o => String(o.id) === String(value));
  const filteredOptions = options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className={`relative w-full ${disabled ? 'opacity-50 pointer-events-none' : ''}`} ref={containerRef}>
      <div 
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full text-xs border rounded p-1 flex items-center justify-between cursor-pointer bg-white min-h-[26px] ${isOpen ? 'border-indigo-500 ring-1 ring-indigo-200' : 'border-slate-300 hover:border-indigo-400'}`}
      >
        <div className="truncate flex-1">
           {selectedOption ? <span className="text-slate-700 font-medium">{selectedOption.label}</span> : <span className="text-slate-400 italic">{placeholder}</span>}
        </div>
        {value && !disabled && (
            <div onClick={(e) => { e.stopPropagation(); onChange(""); }} className="text-slate-300 hover:text-red-400 p-0.5"><IconX size={10} /></div>
        )}
      </div>
      {isOpen && (
        <div className="absolute top-full left-0 w-[220px] bg-white border border-slate-300 shadow-xl rounded-lg z-[999] mt-1 overflow-hidden flex flex-col">
            <div className="p-2 border-b border-slate-100 bg-slate-50">
                <input ref={inputRef} type="text" className="w-full text-xs p-1 border border-slate-200 rounded focus:outline-none focus:border-indigo-500" placeholder="Buscar ubicación..." value={search} onChange={(e) => setSearch(e.target.value)} onClick={(e) => e.stopPropagation()} />
            </div>
            <div className="max-h-48 overflow-y-auto">
                {filteredOptions.length > 0 ? (
                    filteredOptions.map(opt => (
                        <div key={opt.id} onClick={() => { onChange(opt.id); setIsOpen(false); setSearch(""); }} className={`px-3 py-2 text-xs cursor-pointer border-b border-slate-50 last:border-0 hover:bg-indigo-50 hover:text-indigo-700 ${String(value) === String(opt.id) ? 'bg-indigo-50 font-bold text-indigo-700' : 'text-slate-600'}`}>
                            {opt.label}
                        </div>
                    ))
                ) : <div className="p-3 text-center text-xs text-slate-400 italic">No se encontraron resultados</div>}
            </div>
        </div>
      )}
    </div>
  );
};

// --- MULTI SELECT DE GRUPOS ---
const MultiGroupSelect = ({ value = [], onChange, catalogs, disabled, showAlert }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (isOpen && containerRef.current && !containerRef.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen]);

  const groups = [
    { id: "GRP:TUTTI", label: "Todos (Tutti)" },
    { id: "GRP:NO_LOCALES", label: "No Locales" },
    { id: "GRP:LOCALES", label: "Locales" },
    { id: "GRP:PRODUCCION", label: "Producción" },
    { id: "GRP:SOLISTAS", label: "Solistas" },
    { id: "GRP:DIRECTORES", label: "Directores" },
  ];

  const toggleOption = (id) => {
    if (disabled) return;
    let created = [...(value || [])];
    if (id === "GRP:TUTTI") created = ["GRP:TUTTI"];
    else {
      if (created.includes("GRP:TUTTI")) created = [];
      if (created.includes(id)) created = created.filter((x) => x !== id);
      else created.push(id);
    }
    onChange(created);
  };

  return (
    <div className={`relative w-full ${disabled ? 'opacity-50 pointer-events-none' : ''}`} ref={containerRef}>
      <div onClick={() => !disabled && setIsOpen(!isOpen)} className={`min-h-[28px] w-full border rounded px-2 py-1 bg-white cursor-pointer flex flex-wrap gap-1 items-center transition-all ${showAlert ? "border-orange-400 ring-1 ring-orange-200" : "border-slate-300 hover:border-indigo-400"}`} title={showAlert ? "Debes definir para quién es esta comida" : ""}>
        {!value.length && <span className={`text-[10px] ${showAlert ? "text-orange-500 font-bold" : "text-slate-400 italic"}`}>{showAlert ? "⚠️ Definir..." : "Seleccionar..."}</span>}
        {value.map((id) => {
          let label = id;
          if (id.startsWith("GRP:")) label = groups.find((g) => g.id === id)?.label;
          else if (id.startsWith("LOC:")) label = catalogs.localidades.find((l) => `LOC:${l.id}` === id)?.localidad || id;
          else if (id.startsWith("FAM:")) label = id.replace("FAM:", "");
          return <span key={id} className="text-[9px] bg-indigo-50 text-indigo-700 border border-indigo-100 px-1 rounded truncate max-w-[100px]">{label}</span>;
        })}
      </div>
      {isOpen && (
        <div className="absolute top-full left-0 w-[250px] bg-white border border-slate-300 shadow-xl rounded-lg z-[999] mt-1 max-h-60 overflow-y-auto p-2 space-y-2">
            <div><h4 className="text-[9px] font-bold text-slate-400 uppercase">Grupos</h4><div className="grid grid-cols-1 gap-1">{groups.map(g => <div key={g.id} onClick={() => toggleOption(g.id)} className={`text-[10px] p-1 rounded cursor-pointer border ${value.includes(g.id) ? "bg-indigo-100 border-indigo-300 text-indigo-800" : "bg-slate-50 border-slate-100"}`}>{g.label}</div>)}</div></div>
            <div><h4 className="text-[9px] font-bold text-slate-400 uppercase">Origen</h4><div className="grid grid-cols-2 gap-1">{catalogs.localidades.map(l => <div key={l.id} onClick={() => toggleOption(`LOC:${l.id}`)} className={`text-[10px] p-1 rounded cursor-pointer border truncate ${value.includes(`LOC:${l.id}`) ? "bg-purple-100 border-purple-300" : "bg-slate-50 border-slate-100"}`}>{l.localidad}</div>)}</div></div>
            <div><h4 className="text-[9px] font-bold text-slate-400 uppercase">Familias</h4><div className="grid grid-cols-2 gap-1">{catalogs.familias.map(f => <div key={f} onClick={() => toggleOption(`FAM:${f}`)} className={`text-[10px] p-1 rounded cursor-pointer border truncate ${value.includes(`FAM:${f}`) ? "bg-amber-100 border-amber-300" : "bg-slate-50 border-slate-100"}`}>{f}</div>)}</div></div>
        </div>
      )}
    </div>
  );
};

// --- PANEL DE EDICIÓN MASIVA ---
const BulkEditPanel = ({ selectedCount, onApply, onCancel, catalogs }) => {
    const [values, setValues] = useState({
        hora_inicio: "",
        hora_fin: "",
        id_locacion: "",
        convocados: []
    });

    const handleApply = () => {
        // Filtrar solo los valores que se han modificado (no vacíos)
        const changes = {};
        if (values.hora_inicio) changes.hora_inicio = values.hora_inicio;
        if (values.hora_fin) changes.hora_fin = values.hora_fin;
        if (values.id_locacion) changes.id_locacion = values.id_locacion;
        if (values.convocados.length > 0) changes.convocados = values.convocados;
        
        onApply(changes);
    };

    return (
        <div className="bg-indigo-50 border-b border-indigo-100 p-3 flex items-center justify-between animate-in slide-in-from-top-2">
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                    <span className="bg-indigo-600 text-white text-xs font-bold px-2 py-1 rounded-full">{selectedCount}</span>
                    <span className="text-xs font-bold text-indigo-900 uppercase">Seleccionados</span>
                </div>
                <div className="h-6 w-px bg-indigo-200"></div>
                
                {/* Campos de Edición Masiva */}
                <div className="flex items-center gap-2">
                    <div className="w-20"><TimeInput value={values.hora_inicio} onChange={(v) => setValues({...values, hora_inicio: v})} placeholder="Inicio..." /></div>
                    <div className="w-20"><TimeInput value={values.hora_fin} onChange={(v) => setValues({...values, hora_fin: v})} placeholder="Fin..." /></div>
                    <div className="w-40"><GridLocationSelect value={values.id_locacion} onChange={(v) => setValues({...values, id_locacion: v})} options={catalogs.locaciones} placeholder="Lugar..." /></div>
                    <div className="w-48"><MultiGroupSelect value={values.convocados} onChange={(v) => setValues({...values, convocados: v})} catalogs={catalogs} placeholder="Convocados..." /></div>
                </div>
            </div>

            <div className="flex gap-2">
                <button onClick={onCancel} className="text-slate-500 hover:text-slate-700 text-xs font-bold px-3 py-1.5">Cancelar</button>
                <button onClick={handleApply} className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3 py-1.5 rounded flex items-center gap-1 shadow-sm">
                    <IconCheck size={14}/> Aplicar Cambios
                </button>
            </div>
        </div>
    );
};

export default function MealsManager({ supabase, gira, roster }) {
  const [loading, setLoading] = useState(false);
  const [dbMeals, setDbMeals] = useState([]);
  const [grid, setGrid] = useState([]);
  const [catalogs, setCatalogs] = useState({ locaciones: [], localidades: [], ensambles: [], familias: [] });
  const [savingRows, setSavingRows] = useState(new Set());
  const [showHelp, setShowHelp] = useState(false);
  const debounceRef = useRef({});

  // Estados para selección masiva
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [lastSelectedRowId, setLastSelectedRowId] = useState(null);

  useEffect(() => {
    if (gira?.id) fetchAllData();
  }, [gira?.id]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const { data: locs } = await supabase.from("locaciones").select("id, nombre, localidades(localidad)").order("nombre");
      const { data: locsGeo } = await supabase.from("localidades").select("id, localidad").order("localidad");
      const { data: ens } = await supabase.from("ensambles").select("id, ensamble").order("ensamble");
      const fams = [...new Set(roster.map((m) => m.instrumentos?.familia).filter(Boolean))];

      const formattedLocs = (locs || []).map(l => ({
          id: l.id,
          label: `${l.nombre}${l.localidades?.localidad ? ` (${l.localidades.localidad})` : ''}`
      }));

      setCatalogs({ locaciones: formattedLocs, localidades: locsGeo || [], ensambles: ens || [], familias: fams });
      await refreshGridData();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const refreshGridData = async () => {
    const { data: meals } = await supabase.from("eventos").select("*").eq("id_gira", gira.id).in("id_tipo_evento", [7, 8, 9, 10]);
    const { data: rules } = await supabase.from("giras_logistica_reglas").select("*").eq("id_gira", gira.id);
    calculateGrid(meals || [], rules || []);
    setDbMeals(meals || []); 
  };

  const calculateGrid = (mealsData, rulesData) => {
    if (!rulesData.length && !mealsData.length) { setGrid([]); return; }

    const normalizedMeals = mealsData.map(m => ({
        ...m,
        servicio: ID_TO_SERVICE[m.id_tipo_evento] || 'Desconocido',
        hora_inicio: m.hora_inicio ? m.hora_inicio.slice(0, 5) : "",
        hora_fin: m.hora_fin ? m.hora_fin.slice(0, 5) : ""
    })).filter(m => SERVICIOS.includes(m.servicio));

    const toIntKey = (dateStr, serviceStr) => {
      if (!dateStr) return null;
      const cleanDate = dateStr.replaceAll("-", "");
      const svcVal = SERVICE_VALS[serviceStr] ?? 0;
      return parseInt(`${cleanDate}${svcVal}`);
    };

    const addDaysToDateStr = (dateStr, days) => {
      const [y, m, d] = dateStr.split("-").map(Number);
      const dateObj = new Date(y, m - 1, d);
      dateObj.setDate(dateObj.getDate() + days);
      return dateObj.toISOString().split('T')[0];
    };

    let minKey = Infinity;
    let maxKey = -Infinity;

    rulesData.forEach((r) => {
      if (r.comida_inicio_fecha) { const val = toIntKey(r.comida_inicio_fecha, r.comida_inicio_servicio || "Desayuno"); if (val && val < minKey) minKey = val; }
      if (r.comida_fin_fecha) { const val = toIntKey(r.comida_fin_fecha, r.comida_fin_servicio || "Cena"); if (val && val > maxKey) maxKey = val; }
    });

    normalizedMeals.forEach((m) => {
      const val = toIntKey(m.fecha, m.servicio);
      if (val) { if (val < minKey) minKey = val; if (val > maxKey) maxKey = val; }
    });

    if (minKey === Infinity) { setGrid([]); return; }
    if (maxKey === -Infinity) maxKey = minKey;

    const newGrid = [];
    const minKeyStr = String(minKey);
    let currentDateStr = `${minKeyStr.substring(0, 4)}-${minKeyStr.substring(4, 6)}-${minKeyStr.substring(6, 8)}`;
    const maxKeyStr = String(maxKey);
    const endDateStr = `${maxKeyStr.substring(0, 4)}-${maxKeyStr.substring(4, 6)}-${maxKeyStr.substring(6, 8)}`;
    
    let loopGuard = 0;
    while (currentDateStr <= endDateStr && loopGuard < 365) {
      SERVICIOS.forEach((svc) => {
        const currentKey = toIntKey(currentDateStr, svc);
        if (currentKey >= minKey && currentKey <= maxKey) {
          const existing = normalizedMeals.find((m) => m.fecha === currentDateStr && m.servicio === svc);
          newGrid.push(existing ? { ...existing, isTemp: false, dirty: false } : {
              id: `temp-${currentDateStr}-${svc}`, fecha: currentDateStr, servicio: svc,
              hora_inicio: "", hora_fin: "", descripcion: "", id_locacion: "", convocados: [], visible_agenda: true,
              isTemp: true, dirty: false,
            });
        }
      });
      currentDateStr = addDaysToDateStr(currentDateStr, 1);
      loopGuard++;
    }
    setGrid(newGrid);
  };

  const generateDescription = (service, convocadosArray) => {
    if (!convocadosArray || convocadosArray.length === 0) return "";
    const labels = convocadosArray.map(id => getGroupLabelShort(id));
    const joined = labels.join(" + ");
    return `${service} ${joined}`;
  };

  const handleGridChange = (index, field, value) => {
    let updatedRow = null;
    setGrid((prev) => {
      const copy = [...prev];
      let row = { ...copy[index], [field]: value, dirty: true };

      if (field === 'convocados') {
          const autoDesc = generateDescription(row.servicio, value);
          const currentDesc = row.descripcion || "";
          const isSystemGenerated = currentDesc.startsWith(row.servicio) || currentDesc === "";
          
          if (isSystemGenerated) {
              row.descripcion = autoDesc;
          }
      }
      
      if (field === 'id_locacion') {
          const descEmpty = !row.descripcion || row.descripcion.trim() === "";
          if (descEmpty) {
            const locName = catalogs.locaciones.find(l => String(l.id) === String(value))?.label;
            if (locName) {
                const simpleName = locName.split('(')[0].trim();
                row.descripcion = `${row.servicio} en ${simpleName}`;
            }
          }
      }

      copy[index] = row;
      updatedRow = row;
      return copy;
    });

    if (updatedRow) {
      const rowId = updatedRow.id;
      if (debounceRef.current[rowId]) clearTimeout(debounceRef.current[rowId]);
      debounceRef.current[rowId] = setTimeout(() => { saveRow(updatedRow); }, 1000);
    }
  };

  // --- NUEVA FUNCIÓN: APLICAR CAMBIOS MASIVOS ---
  const handleBulkApply = async (changes) => {
      if (Object.keys(changes).length === 0) return;

      const selectedIds = Array.from(selectedRows);
      // Aplicar cambios visualmente primero
      setGrid(prev => prev.map(row => {
          if (selectedIds.includes(row.id)) {
              let newRow = { ...row, ...changes, dirty: true };
              
              // Recalcular descripción si cambiaron convocados
              if (changes.convocados) {
                  const autoDesc = generateDescription(newRow.servicio, changes.convocados);
                  const currentDesc = newRow.descripcion || "";
                  const isSystemGenerated = currentDesc.startsWith(newRow.servicio) || currentDesc === "";
                  if (isSystemGenerated) newRow.descripcion = autoDesc;
              }
              // Recalcular descripción si cambió locación
              if (changes.id_locacion) {
                  const descEmpty = !newRow.descripcion || newRow.descripcion.trim() === "";
                  if (descEmpty) {
                      const locName = catalogs.locaciones.find(l => String(l.id) === String(changes.id_locacion))?.label;
                      if (locName) {
                          const simpleName = locName.split('(')[0].trim();
                          newRow.descripcion = `${newRow.servicio} en ${simpleName}`;
                      }
                  }
              }
              return newRow;
          }
          return row;
      }));

      // Guardar cada fila seleccionada (usando la función saveRow existente)
      // Nota: Esto disparará múltiples llamadas. Para optimizar se podría hacer un batch upsert en backend,
      // pero reutilizamos saveRow para consistencia rápida.
      const rowsToSave = grid.filter(r => selectedIds.includes(r.id)).map(r => ({ ...r, ...changes })); // Usamos los datos nuevos
      
      // Limpiamos selección para feedback visual
      setSelectedRows(new Set());

      // Procesar guardado en serie o paralelo
      for (const row of rowsToSave) {
          // Recalcular lógica de descripción para el objeto que se va a guardar
          let rowToSave = { ...row };
          if (changes.convocados) rowToSave.descripcion = generateDescription(rowToSave.servicio, changes.convocados);
          
          await saveRow(rowToSave); 
      }
  };

  const saveRow = async (row) => {
    setSavingRows(prev => new Set(prev).add(row.id));
    const payload = {
      id_gira: gira.id, fecha: row.fecha, id_tipo_evento: SERVICE_IDS[row.servicio],
      hora_inicio: row.hora_inicio || null, hora_fin: row.hora_fin || row.hora_inicio || null,
      descripcion: row.descripcion || null, id_locacion: row.id_locacion || null,
      convocados: row.convocados || [], visible_agenda: row.visible_agenda
    };

    try {
      let resultData;
      if (row.isTemp) {
        const { data, error } = await supabase.from("eventos").insert([payload]).select().single();
        if (error) throw error;
        resultData = data;
      } else {
        const { data, error } = await supabase.from("eventos").update(payload).eq("id", row.id).select().single();
        if (error) throw error;
        resultData = data;
      }

      const savedMeal = {
        ...resultData, servicio: ID_TO_SERVICE[resultData.id_tipo_evento],
        hora_inicio: resultData.hora_inicio ? resultData.hora_inicio.slice(0,5) : "",
        hora_fin: resultData.hora_fin ? resultData.hora_fin.slice(0,5) : ""
      };

      if (row.isTemp) setDbMeals(prev => [...prev, savedMeal]);
      else setDbMeals(prev => prev.map(m => m.id === row.id ? savedMeal : m));

      setGrid((prev) => prev.map((r) => r.id === row.id ? { ...r, id: savedMeal.id, isTemp: false, dirty: false } : r));

    } catch (error) {
      console.error("Error auto-saving:", error);
    } finally {
      setSavingRows(prev => { const next = new Set(prev); next.delete(row.id); return next; });
    }
  };

  const deleteRow = async (row) => {
    if (row.isTemp) return;
    if (!confirm("¿Borrar este evento?")) return;
    setSavingRows(prev => new Set(prev).add(row.id));
    await supabase.from("eventos").delete().eq("id", row.id);
    setSavingRows(prev => { const next = new Set(prev); next.delete(row.id); return next; });
    refreshGridData();
  };

  // --- SELECCIÓN ---
  const toggleSelectRow = (id, event) => {
      // Shift Click Logic
      if (event.shiftKey && lastSelectedRowId) {
          const allIds = grid.map(r => r.id);
          const startIdx = allIds.indexOf(lastSelectedRowId);
          const endIdx = allIds.indexOf(id);
          
          if (startIdx !== -1 && endIdx !== -1) {
              const low = Math.min(startIdx, endIdx);
              const high = Math.max(startIdx, endIdx);
              const newSet = new Set(selectedRows);
              for (let i = low; i <= high; i++) newSet.add(allIds[i]);
              setSelectedRows(newSet);
          }
      } else {
          // Normal Toggle
          const newSet = new Set(selectedRows);
          if (newSet.has(id)) newSet.delete(id);
          else {
              newSet.add(id);
              setLastSelectedRowId(id);
          }
          setSelectedRows(newSet);
      }
  };

  const selectAll = () => {
      if (selectedRows.size === grid.length) setSelectedRows(new Set());
      else setSelectedRows(new Set(grid.map(r => r.id)));
  };

  const groupedRows = useMemo(() => {
    const groups = {};
    grid.forEach((row, idx) => {
      if (!groups[row.fecha]) groups[row.fecha] = [];
      groups[row.fecha].push({ ...row, originalIndex: idx });
    });
    return groups;
  }, [grid]);

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="bg-white p-4 border-b border-slate-200 shadow-sm flex justify-between items-center shrink-0 z-20 relative">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
             <IconUtensils className="text-orange-500" /> 
             <h2 className="text-lg font-bold text-slate-800">Matriz de Comidas</h2>
          </div>

          <div className="relative group">
              <button 
                onClick={() => setShowHelp(!showHelp)}
                className="text-slate-400 hover:text-indigo-600 transition-colors"
              >
                  <IconInfo size={18} />
              </button>
              
              <div className={`absolute top-full left-0 mt-2 w-72 bg-white border border-slate-200 shadow-xl rounded-lg p-3 text-xs text-slate-600 z-50 transition-all origin-top-left ${showHelp ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}>
                  <h4 className="font-bold text-slate-800 mb-2 uppercase text-[10px]">Guía Rápida</h4>
                  <ul className="space-y-1.5 list-disc pl-3">
                      <li>Usa los <strong>checkboxes</strong> de la izquierda para edición masiva.</li>
                      <li><strong>Shift + Click</strong> para seleccionar rangos de comidas.</li>
                      <li>Los eventos grises son <strong>borradores</strong> (no existen en BD).</li>
                      <li>Los cambios se guardan <strong>automáticamente</strong> al editar celdas individuales.</li>
                  </ul>
                  <div className="mt-2 pt-2 border-t border-slate-100 text-[10px] text-slate-400 text-right italic">
                      Clic afuera para cerrar
                  </div>
              </div>
              {showHelp && <div className="fixed inset-0 z-40" onClick={() => setShowHelp(false)}></div>}
          </div>
        </div>
        {loading && <IconLoader className="animate-spin text-orange-500" />}
      </div>

      {/* PANEL DE EDICIÓN MASIVA (VISIBLE SI HAY SELECCIÓN) */}
      {selectedRows.size > 0 && (
          <BulkEditPanel 
              selectedCount={selectedRows.size} 
              onCancel={() => setSelectedRows(new Set())}
              onApply={handleBulkApply}
              catalogs={catalogs}
          />
      )}

      <div className="flex-1 p-4 overflow-hidden flex flex-col">
        <div className="bg-white border border-slate-300 rounded-lg shadow-sm flex-1 overflow-hidden flex flex-col relative">
          
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left text-sm min-w-[1100px] border-collapse relative">
              <thead className="bg-slate-100 text-slate-500 uppercase font-bold text-[10px] z-40 sticky top-0 shadow-sm">
                <tr>
                  {/* HEADER CHECKBOX */}
                  <th className="px-2 py-3 w-8 border-b border-r border-slate-200 bg-slate-100 sticky top-0 left-0 z-50 text-center">
                      <input type="checkbox" onChange={selectAll} checked={selectedRows.size === grid.length && grid.length > 0} className="rounded text-indigo-600 focus:ring-indigo-500"/>
                  </th>
                  <th className="px-3 py-3 w-32 border-b border-r border-slate-200 bg-slate-100 sticky top-0 left-8 z-50">Día</th>
                  <th className="px-3 py-3 w-24 border-b border-slate-200 bg-slate-100 sticky top-0 z-40">Servicio</th>
                  <th className="px-3 py-3 w-24 border-b border-slate-200 bg-slate-100 sticky top-0 z-40">Inicio</th>
                  <th className="px-3 py-3 w-24 border-b border-slate-200 bg-slate-100 sticky top-0 z-40">Fin</th>
                  <th className="px-3 py-3 w-56 border-b border-slate-200 bg-slate-100 sticky top-0 z-40">Lugar</th>
                  <th className="px-3 py-3 min-w-[200px] border-b border-slate-200 bg-slate-100 sticky top-0 z-40">Descripción</th>
                  <th className="px-3 py-3 min-w-[250px] border-b border-slate-200 bg-slate-100 sticky top-0 z-40">Convocados</th>
                  <th className="px-3 py-3 w-12 text-center border-b border-slate-200 bg-slate-100 sticky top-0 z-40">Vis.</th>
                  <th className="px-3 py-3 w-16 text-center border-b border-l border-slate-200 bg-slate-100 sticky top-0 right-0 z-50"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {Object.keys(groupedRows).sort().map((dateKey) => {
                    const rows = groupedRows[dateKey];
                    const formattedDate = dateKey.split("-").reverse().slice(0, 2).join("/");

                    return rows.map((row, i) => {
                      const isSaving = savingRows.has(row.id);
                      const isTemp = row.isTemp;
                      const isSelected = selectedRows.has(row.id);
                      const showConvokedAlert = !isTemp && (!row.convocados || row.convocados.length === 0);
                      
                      const rowClass = isSelected 
                        ? "bg-indigo-50" 
                        : isTemp 
                            ? "bg-slate-300 text-slate-500 font-normal grayscale transition-colors hover:bg-slate-200 hover:grayscale-0" 
                            : "hover:bg-slate-50 transition-colors"; 
                      
                      const disableInputs = isSaving;

                      return (
                        <tr key={row.id} className={`group ${rowClass}`}>
                          
                          {/* CHECKBOX CELL */}
                          <td className={`px-2 py-1 text-center border-b border-r border-slate-200 sticky left-0 z-30 ${isSelected ? 'bg-indigo-50' : 'bg-white'}`}>
                              <input 
                                type="checkbox" 
                                checked={isSelected} 
                                onChange={(e) => toggleSelectRow(row.id, e.nativeEvent)}
                                className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                              />
                          </td>

                          {i === 0 && (
                            <td rowSpan={rows.length} className="px-3 py-3 font-bold text-slate-700 border-r border-slate-200 bg-white sticky left-8 align-top z-30 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                              <div className="flex items-center gap-2"><IconCalendar size={14} className="text-slate-300"/>{formattedDate}</div>
                            </td>
                          )}
                          <td className="px-3 py-2">
                            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${isTemp ? 'bg-slate-200 text-slate-500' : row.servicio === "Almuerzo" ? "bg-amber-100 text-amber-700" : row.servicio === "Cena" ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-500"}`}>{row.servicio}</span>
                          </td>
                          <td className="px-1 py-1"><div className="w-24"><TimeInput value={row.hora_inicio || ""} onChange={(val) => handleGridChange(row.originalIndex, "hora_inicio", val)} disabled={disableInputs}/></div></td>
                          <td className="px-1 py-1"><div className="w-24"><TimeInput value={row.hora_fin || ""} onChange={(val) => handleGridChange(row.originalIndex, "hora_fin", val)} disabled={disableInputs}/></div></td>
                          <td className="px-1 py-1"><GridLocationSelect value={row.id_locacion || ""} onChange={(val) => handleGridChange(row.originalIndex, "id_locacion", val)} options={catalogs.locaciones} disabled={disableInputs}/></td>
                          <td className="px-1 py-1"><input type="text" placeholder="Descripción..." value={row.descripcion || ""} onChange={(e) => handleGridChange(row.originalIndex, "descripcion", e.target.value)} disabled={disableInputs} className={`w-full text-xs border rounded p-1 focus:border-indigo-500 focus:outline-none ${isTemp ? 'bg-transparent' : 'bg-white'}`}/></td>
                          <td className="px-1 py-1"><MultiGroupSelect value={row.convocados} onChange={(val) => handleGridChange(row.originalIndex, "convocados", val)} catalogs={catalogs} disabled={disableInputs} showAlert={showConvokedAlert}/></td>
                          <td className="px-1 py-1 text-center"><button onClick={() => handleGridChange(row.originalIndex, "visible_agenda", !row.visible_agenda)} disabled={disableInputs} className={`text-slate-400 hover:text-indigo-600 ${!row.visible_agenda ? "text-red-300" : ""}`} title={row.visible_agenda ? "Visible en Agenda" : "Oculto en Agenda"}>{row.visible_agenda ? <IconEye size={14} /> : <IconEyeOff size={14} />}</button></td>
                          <td className="px-2 py-1 text-center sticky right-0 bg-white group-hover:bg-slate-50 border-l border-slate-100 z-30 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                            {isSaving ? <IconLoader className="animate-spin text-indigo-500 mx-auto" size={16} /> : <div className="flex gap-2 justify-center opacity-0 group-hover:opacity-100 transition-opacity">{!row.isTemp && <button onClick={() => deleteRow(row)} className="text-slate-300 hover:text-red-500 p-1"><IconTrash size={14} /></button>}</div>}
                          </td>
                        </tr>
                      );
                    });
                })}
                {!grid.length && !loading && <tr><td colSpan="10" className="p-8 text-center text-slate-400 italic">No hay rango definido. Configura las fechas en la pestaña Logística.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}