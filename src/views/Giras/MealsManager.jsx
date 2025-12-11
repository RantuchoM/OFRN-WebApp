import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  IconUtensils,
  IconSave,
  IconLoader,
  IconCheck,
  IconTrash,
  IconEye,
  IconEyeOff,
  IconCalendar,
} from "../../components/ui/Icons";
import TimeInput from "../../components/ui/TimeInput";

// --- CONSTANTES ---
const SERVICE_IDS = { Desayuno: 7, Almuerzo: 8, Merienda: 9, Cena: 10 };
const ID_TO_SERVICE = { 7: "Desayuno", 8: "Almuerzo", 9: "Merienda", 10: "Cena" };
const SERVICIOS = ["Desayuno", "Almuerzo", "Merienda", "Cena"];
const SERVICE_VALS = { Desayuno: 0, Almuerzo: 1, Merienda: 2, Cena: 3 };

// --- MULTI SELECT (Mismo componente) ---
const MultiGroupSelect = ({ value = [], onChange, catalogs, roster, disabled }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (isOpen && containerRef.current && !containerRef.current.contains(e.target))
        setIsOpen(false);
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
    const current = value || [];
    let created = [...current];
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
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className="min-h-[28px] w-full border border-slate-300 rounded px-2 py-1 bg-white cursor-pointer hover:border-indigo-400 flex flex-wrap gap-1 items-center"
      >
        {!value.length && (
          <span className="text-[10px] text-slate-400">Seleccionar...</span>
        )}
        {value.map((id) => {
          let label = id;
          if (id.startsWith("GRP:")) label = groups.find((g) => g.id === id)?.label;
          else if (id.startsWith("LOC:")) label = catalogs.localidades.find((l) => `LOC:${l.id}` === id)?.localidad || id;
          else if (id.startsWith("ENS:")) label = catalogs.ensambles.find((e) => `ENS:${e.id}` === id)?.nombre || id;
          else if (id.startsWith("FAM:")) label = id.replace("FAM:", "");
          return (
            <span key={id} className="text-[9px] bg-indigo-50 text-indigo-700 border border-indigo-100 px-1 rounded truncate max-w-[100px]">
              {label}
            </span>
          );
        })}
      </div>
      {isOpen && (
        <div className="absolute top-full left-0 w-[250px] bg-white border border-slate-300 shadow-xl rounded-lg z-[999] mt-1 max-h-60 overflow-y-auto p-2 space-y-2">
            {/* Opciones simplificadas para brevedad */}
            <div><h4 className="text-[9px] font-bold text-slate-400 uppercase">Grupos</h4><div className="grid grid-cols-1 gap-1">{groups.map(g => <div key={g.id} onClick={() => toggleOption(g.id)} className={`text-[10px] p-1 rounded cursor-pointer border ${value.includes(g.id) ? "bg-indigo-100 border-indigo-300 text-indigo-800" : "bg-slate-50 border-slate-100"}`}>{g.label}</div>)}</div></div>
            <div><h4 className="text-[9px] font-bold text-slate-400 uppercase">Origen</h4><div className="grid grid-cols-2 gap-1">{catalogs.localidades.map(l => <div key={l.id} onClick={() => toggleOption(`LOC:${l.id}`)} className={`text-[10px] p-1 rounded cursor-pointer border truncate ${value.includes(`LOC:${l.id}`) ? "bg-purple-100 border-purple-300" : "bg-slate-50 border-slate-100"}`}>{l.localidad}</div>)}</div></div>
            <div><h4 className="text-[9px] font-bold text-slate-400 uppercase">Familias</h4><div className="grid grid-cols-2 gap-1">{catalogs.familias.map(f => <div key={f} onClick={() => toggleOption(`FAM:${f}`)} className={`text-[10px] p-1 rounded cursor-pointer border truncate ${value.includes(`FAM:${f}`) ? "bg-amber-100 border-amber-300" : "bg-slate-50 border-slate-100"}`}>{f}</div>)}</div></div>
        </div>
      )}
    </div>
  );
};

export default function MealsManager({ supabase, gira, roster }) {
  const [loading, setLoading] = useState(false);
  const [dbMeals, setDbMeals] = useState([]);
  const [grid, setGrid] = useState([]);
  const [catalogs, setCatalogs] = useState({ locaciones: [], localidades: [], ensambles: [], familias: [] });
  
  // Estados para Auto-Guardado
  const [savingRows, setSavingRows] = useState(new Set());
  const debounceRef = useRef({});

  useEffect(() => {
    if (gira?.id) fetchAllData();
  }, [gira?.id]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const { data: locs } = await supabase.from("locaciones").select("id, nombre").order("nombre");
      const { data: locsGeo } = await supabase.from("localidades").select("id, localidad").order("localidad");
      const { data: ens } = await supabase.from("ensambles").select("id, ensamble").order("ensamble");
      const fams = [...new Set(roster.map((m) => m.instrumentos?.familia).filter(Boolean))];

      setCatalogs({ locaciones: locs || [], localidades: locsGeo || [], ensambles: ens || [], familias: fams });
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
          if (existing) {
            newGrid.push({ ...existing, isTemp: false, dirty: false });
          } else {
            newGrid.push({
              id: `temp-${currentDateStr}-${svc}`,
              fecha: currentDateStr,
              servicio: svc,
              hora_inicio: "", hora_fin: "", descripcion: "", id_locacion: "", convocados: [], visible_agenda: true,
              isTemp: true, dirty: false,
            });
          }
        }
      });
      currentDateStr = addDaysToDateStr(currentDateStr, 1);
      loopGuard++;
    }
    setGrid(newGrid);
  };

  // --- MANEJO DE CAMBIOS Y AUTO-GUARDADO ---
  const handleGridChange = (index, field, value) => {
    // 1. Actualizar estado local (Reactividad inmediata)
    let updatedRow = null;
    setGrid((prev) => {
      const copy = [...prev];
      const row = { ...copy[index], [field]: value, dirty: true };
      copy[index] = row;
      updatedRow = row;
      return copy;
    });

    // 2. Programar Auto-Guardado (Debounce)
    if (updatedRow) {
      const rowId = updatedRow.id;
      // Limpiar timeout anterior si existe
      if (debounceRef.current[rowId]) clearTimeout(debounceRef.current[rowId]);
      
      // Configurar nuevo timeout
      debounceRef.current[rowId] = setTimeout(() => {
        saveRow(updatedRow); // Guardar la versión más reciente capturada en la clausura
      }, 1000); // 1 segundo de espera
    }
  };

  const saveRow = async (row) => {
    // Evitar guardar si no hay cambios reales (salvo que sea forzado)
    // Pero si es Temp, siempre intentamos guardar para crear el ID
    setSavingRows(prev => new Set(prev).add(row.id));

    const payload = {
      id_gira: gira.id,
      fecha: row.fecha,
      id_tipo_evento: SERVICE_IDS[row.servicio],
      hora_inicio: row.hora_inicio || null,
      hora_fin: row.hora_fin || row.hora_inicio || null,
      descripcion: row.descripcion || null,
      id_locacion: row.id_locacion || null,
      convocados: row.convocados || [], 
      visible_agenda: row.visible_agenda
    };

    try {
      let resultData;

      if (row.isTemp) {
        // INSERT
        const { data, error } = await supabase.from("eventos").insert([payload]).select().single();
        if (error) throw error;
        resultData = data;
      } else {
        // UPDATE
        // Nota: Usamos row.id que viene del parámetro, que puede ser 'temp-...' si hubo race condition,
        // pero idealmente 'row' es el objeto actual. Si es isTemp=false, tiene ID numérico.
        const { data, error } = await supabase.from("eventos").update(payload).eq("id", row.id).select().single();
        if (error) throw error;
        resultData = data;
      }

      // Procesar dato guardado
      const savedMeal = {
        ...resultData,
        servicio: ID_TO_SERVICE[resultData.id_tipo_evento],
        hora_inicio: resultData.hora_inicio ? resultData.hora_inicio.slice(0,5) : "",
        hora_fin: resultData.hora_fin ? resultData.hora_fin.slice(0,5) : ""
      };

      // Actualizar DB local
      if (row.isTemp) {
        setDbMeals(prev => [...prev, savedMeal]);
      } else {
        setDbMeals(prev => prev.map(m => m.id === row.id ? savedMeal : m));
      }

      // Actualizar Grid: Importante reemplazar el ID temporal por el real
      setGrid((prev) =>
        prev.map((r) => {
            // Si era temp, el ID era 'temp-...', ahora es savedMeal.id
            // Si era update, el ID es el mismo
            if (r.id === row.id) {
                // Mantenemos los datos del usuario si ha seguido escribiendo (optimista),
                // pero actualizamos ID y status.
                // Riesgo: Si el usuario escribió algo MUY rápido mientras guardaba, 'r' tiene lo nuevo.
                // 'savedMeal' tiene lo que se guardó.
                // Preservamos 'r' excepto ID y flags.
                return { ...r, id: savedMeal.id, isTemp: false, dirty: false };
            }
            return r;
        })
      );

    } catch (error) {
      console.error("Error auto-saving:", error);
      // Opcional: Mostrar toast de error
    } finally {
      setSavingRows(prev => {
          const next = new Set(prev);
          next.delete(row.id);
          return next;
      });
    }
  };

  const deleteRow = async (row) => {
    if (row.isTemp) return;
    if (!confirm("¿Borrar este evento?")) return;
    
    setSavingRows(prev => new Set(prev).add(row.id));
    await supabase.from("eventos").delete().eq("id", row.id);
    setSavingRows(prev => { const next = new Set(prev); next.delete(row.id); return next; });
    refreshGridData(); // Regenerar grid para que vuelva a aparecer como temp vacío
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
      <div className="bg-white p-4 border-b border-slate-200 shadow-sm flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <IconUtensils className="text-orange-500" /> Matriz de Comidas
          </h2>
          <p className="text-xs text-slate-400">
            Los cambios se guardan automáticamente.
          </p>
        </div>
        {loading && <IconLoader className="animate-spin text-orange-500" />}
      </div>

      <div className="flex-1 overflow-auto p-4">
        <div className="bg-white border border-slate-300 rounded-lg shadow-sm overflow-hidden">
          <table className="w-full text-left text-sm min-w-[1100px]">
            <thead className="bg-slate-100 text-slate-500 uppercase font-bold text-[10px] border-b border-slate-300 sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-3 py-3 w-32 border-r border-slate-200 bg-slate-100 sticky left-0 z-20">Día</th>
                <th className="px-3 py-3 w-24">Servicio</th>
                <th className="px-3 py-3 w-24">Inicio</th>
                <th className="px-3 py-3 w-24">Fin</th>
                <th className="px-3 py-3 w-48">Lugar</th>
                <th className="px-3 py-3 min-w-[200px]">Descripción</th>
                <th className="px-3 py-3 min-w-[250px]">Convocados</th>
                <th className="px-3 py-3 w-12 text-center">Vis.</th>
                <th className="px-3 py-3 w-16 text-center sticky right-0 bg-slate-100"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {Object.keys(groupedRows).sort().map((dateKey) => {
                  const rows = groupedRows[dateKey];
                  const formattedDate = dateKey.split("-").reverse().slice(0, 2).join("/");

                  return rows.map((row, i) => {
                    // Estado visual: Si es temp, se ve gris. Si se está guardando, bloqueamos inputs si es Temp (para evitar duplicados por race condition)
                    const isSaving = savingRows.has(row.id);
                    const isTemp = row.isTemp;
                    const rowClass = isTemp 
                        ? "bg-slate-50/80 grayscale text-slate-500" // Grisáceo si está vacío
                        : "hover:bg-slate-50"; 
                    
                    // Bloquear inputs SOLO si se está creando (insertando) para evitar conflictos de ID
                    const disableInputs = isSaving && isTemp;

                    return (
                      <tr key={row.id} className={`group transition-all duration-300 ${rowClass}`}>
                        {i === 0 && (
                          <td rowSpan={rows.length} className="px-3 py-3 font-bold text-slate-700 border-r border-slate-200 bg-white sticky left-0 align-top z-10">
                            <div className="flex items-center gap-2">
                              <IconCalendar size={14} className="text-slate-300"/>
                              {formattedDate}
                            </div>
                          </td>
                        )}

                        <td className="px-3 py-2">
                          <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                              row.servicio === "Almuerzo" ? "bg-amber-100 text-amber-700" : 
                              row.servicio === "Cena" ? "bg-indigo-100 text-indigo-700" : 
                              "bg-slate-100 text-slate-500"
                            }`}>
                            {row.servicio}
                          </span>
                        </td>
                        
                        <td className="px-1 py-1">
                            <div className="w-24">
                                <TimeInput 
                                    value={row.hora_inicio || ""}
                                    onChange={(val) => handleGridChange(row.originalIndex, "hora_inicio", val)}
                                    disabled={disableInputs}
                                />
                            </div>
                        </td>

                        <td className="px-1 py-1">
                            <div className="w-24">
                                <TimeInput 
                                    value={row.hora_fin || ""}
                                    onChange={(val) => handleGridChange(row.originalIndex, "hora_fin", val)}
                                    disabled={disableInputs}
                                />
                            </div>
                        </td>

                        <td className="px-1 py-1">
                          <select value={row.id_locacion || ""}
                            onChange={(e) => handleGridChange(row.originalIndex, "id_locacion", e.target.value)}
                            disabled={disableInputs}
                            className={`w-full text-xs border rounded p-1 focus:border-indigo-500 focus:outline-none ${isTemp ? 'bg-transparent' : ''}`}
                          >
                            <option value="">- Lugar -</option>
                            {catalogs.locaciones.map((l) => (
                              <option key={l.id} value={l.id}>{l.nombre}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-1 py-1">
                          <input type="text" placeholder="Descripción..." value={row.descripcion || ""}
                            onChange={(e) => handleGridChange(row.originalIndex, "descripcion", e.target.value)}
                            disabled={disableInputs}
                            className={`w-full text-xs border rounded p-1 focus:border-indigo-500 focus:outline-none ${isTemp ? 'bg-transparent' : ''}`}
                          />
                        </td>
                        <td className="px-1 py-1">
                          <MultiGroupSelect value={row.convocados}
                            onChange={(val) => handleGridChange(row.originalIndex, "convocados", val)}
                            catalogs={catalogs} roster={roster}
                            disabled={disableInputs}
                          />
                        </td>
                        <td className="px-1 py-1 text-center">
                          <button onClick={() => handleGridChange(row.originalIndex, "visible_agenda", !row.visible_agenda)}
                            disabled={disableInputs}
                            className={`text-slate-400 hover:text-indigo-600 ${!row.visible_agenda ? "text-red-300" : ""}`}
                          >
                            {row.visible_agenda ? <IconEye size={14} /> : <IconEyeOff size={14} />}
                          </button>
                        </td>
                        <td className="px-2 py-1 text-center sticky right-0 bg-white group-hover:bg-slate-50 border-l border-slate-100">
                          {isSaving ? (
                            <IconLoader className="animate-spin text-indigo-500 mx-auto" size={16} />
                          ) : (
                            <div className="flex gap-2 justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              {!row.isTemp && (
                                <button onClick={() => deleteRow(row)} className="text-slate-300 hover:text-red-500 p-1">
                                  <IconTrash size={14} />
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  });
              })}
              {!grid.length && !loading && (
                <tr>
                  <td colSpan="9" className="p-8 text-center text-slate-400 italic">
                    No hay rango definido. Configura las fechas en la pestaña Logística.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}