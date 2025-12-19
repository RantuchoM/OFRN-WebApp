import React, { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import {
  IconPlus, IconTrash, IconLoader, IconCheck, IconSearch, IconBus,
} from "../../components/ui/Icons";
import DateInput from "../../components/ui/DateInput";
import TimeInput from "../../components/ui/TimeInput";
import { useLogistics, calculateLogisticsSummary } from "../../hooks/useLogistics"; // Importamos el helper

// --- HELPERS (Igual que antes) ---
const CATEGORIA_OPTIONS = [
  { val: "SOLISTAS", label: "Solistas" }, { val: "DIRECTORES", label: "Directores" },
  { val: "PRODUCCION", label: "Producción" }, { val: "LOCALES", label: "Locales" }, { val: "NO_LOCALES", label: "No Locales" },
];
const SERVICIOS_COMIDA = ["Desayuno", "Almuerzo", "Merienda", "Cena"];
const PROVEEDORES_COMIDA = ["-", "No lleva", "Hotel", "Colectivo", "Refrigerio", "Vianda"];

const getProviderColorClass = (provider) => {
  switch (provider) {
    case "Hotel": return "bg-indigo-100 text-indigo-700 border-indigo-200";
    case "Colectivo": return "bg-amber-100 text-amber-700 border-amber-200";
    case "Refrigerio": return "bg-cyan-100 text-cyan-700 border-cyan-200";
    case "Vianda": return "bg-emerald-100 text-emerald-700 border-emerald-200";
    case "No lleva": return "bg-slate-100 text-slate-400 border-slate-200 line-through decoration-slate-400 opacity-70";
    default: return "bg-white text-slate-600 border-slate-200";
  }
};

const getSourceBadge = (type) => {
  const config = {
    G: { color: "bg-slate-100 text-slate-500 border-slate-200", title: "General" },
    R: { color: "bg-blue-100 text-blue-600 border-blue-200", title: "Región" },
    L: { color: "bg-cyan-100 text-cyan-600 border-cyan-200", title: "Localidad" },
    C: { color: "bg-purple-100 text-purple-600 border-purple-200", title: "Categoría" },
    P: { color: "bg-amber-100 text-amber-600 border-amber-200", title: "Personal" },
    "-": { color: "hidden", title: "N/A" },
  }[type] || { color: "hidden", title: "" };
  return <span className={`text-[9px] font-bold px-1 rounded border cursor-help ${config.color}`} title={config.title}>{type}</span>;
};

// --- MULTI SELECT ---
const MultiSelectCell = ({ options, selectedIds, onChange, placeholder = "Seleccionar..." }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef(null);
  
  useEffect(() => {
    const handleClick = (e) => { if (isOpen && containerRef.current && !containerRef.current.contains(e.target) && !e.target.closest(".ms-portal-dropdown")) setIsOpen(false); };
    document.addEventListener("mousedown", handleClick); return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen]);

  const toggleSelection = (val) => {
    const current = Array.isArray(selectedIds) ? selectedIds : [];
    const newSelection = current.includes(val) ? current.filter((id) => id !== val) : [...current, val];
    onChange(newSelection);
  };
  const filteredOptions = options.filter((opt) => opt.label.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="relative w-full h-full min-h-[32px]" ref={containerRef}>
      <div onClick={() => setIsOpen(!isOpen)} className="w-full h-full min-h-[32px] px-2 py-1 bg-white cursor-pointer hover:bg-slate-50 flex flex-col justify-center gap-0.5 text-xs">
        {(!selectedIds || selectedIds.length === 0) && <span className="text-slate-400 italic">{placeholder}</span>}
        {(selectedIds || []).map(id => {
            const opt = options.find(o => o.val === id);
            return opt ? <div key={id} className="bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded text-[10px] text-indigo-700 truncate">{opt.label}</div> : null;
        })}
      </div>
      {isOpen && createPortal(
        <div className="fixed bg-white border border-slate-300 shadow-2xl rounded-lg p-2 z-[99999] ms-portal-dropdown flex flex-col" style={{ top: containerRef.current?.getBoundingClientRect().bottom, left: containerRef.current?.getBoundingClientRect().left, width: 250, maxHeight: 300 }}>
            <input autoFocus className="w-full text-xs border rounded p-1 mb-2" placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} />
            <div className="overflow-y-auto flex-1">
                {filteredOptions.map(opt => (
                    <div key={opt.val} onClick={() => toggleSelection(opt.val)} className={`p-1 cursor-pointer hover:bg-slate-100 flex gap-2 items-center text-xs ${selectedIds?.includes(opt.val) ? 'font-bold text-indigo-600' : ''}`}>
                        <div className={`w-3 h-3 border rounded flex items-center justify-center ${selectedIds?.includes(opt.val) ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'}`}>{selectedIds?.includes(opt.val) && <IconCheck size={8} className="text-white"/>}</div>
                        {opt.label}
                    </div>
                ))}
            </div>
        </div>, document.body
      )}
    </div>
  );
};

// --- COMPONENTE PRINCIPAL ---
export default function LogisticsManager({ supabase, gira }) {
  const { roster, logisticsRules, transportRules, loading, refresh } = useLogistics(supabase, gira);
  
  const [localRules, setLocalRules] = useState([]);
  const [savingRows, setSavingRows] = useState(new Set());
  const debounceRef = useRef({});
  const [catalogs, setCatalogs] = useState({ musicians: [], locations: [], regions: [] });

  // Sincronizar reglas del hook al estado local SOLO al cargar (para no pisar ediciones)
  useEffect(() => {
    if (logisticsRules.length > 0 && localRules.length === 0) {
        const mapped = logisticsRules.map(r => ({ ...r, ref_values: r.target_ids || [] }));
        setLocalRules(mapped);
    }
    // Si la longitud cambia (alguien agregó/borró), resincronizamos
    if (logisticsRules.length !== localRules.length && !savingRows.size) {
         const mapped = logisticsRules.map(r => ({ ...r, ref_values: r.target_ids || [] }));
         setLocalRules(mapped);
    }
  }, [logisticsRules]);

  // Cargar catálogos
  useEffect(() => {
    const fetchCatalogs = async () => {
        const [mus, loc, reg] = await Promise.all([
            supabase.from("integrantes").select("id, nombre, apellido").order("apellido"),
            supabase.from("localidades").select("id, localidad").order("localidad"),
            supabase.from("regiones").select("id, region").order("region")
        ]);
        setCatalogs({ musicians: mus.data || [], locations: loc.data || [], regions: reg.data || [] });
    };
    fetchCatalogs();
  }, []);

  // --- CÁLCULO DE RESUMEN INSTANTÁNEO ---
  // Usamos localRules para que el cuadro de abajo refleje lo que escribes al instante
  const summary = useMemo(() => {
      // Ordenamos localRules por prioridad antes de calcular (0 -> 4)
      const sortedLocal = [...localRules].sort((a,b) => (a.prioridad || 0) - (b.prioridad || 0));
      return calculateLogisticsSummary(roster, sortedLocal, transportRules);
  }, [roster, localRules, transportRules]);

  // --- CRUD ---
  const addEmptyRow = async () => {
    const newRowPayload = { id_gira: gira.id, alcance: "General", prioridad: 0, target_ids: [] };
    const { data, error } = await supabase.from("giras_logistica_reglas").insert([newRowPayload]).select().single();
    if (data) {
        setLocalRules(prev => [...prev, { ...data, ref_values: [] }]);
        refresh(); // Aquí sí refrescamos para obtener ID real y consistencia
    } else alert(error.message);
  };

  const deleteRow = async (index) => {
    const row = localRules[index];
    if (!confirm("¿Eliminar regla?")) return;
    setLocalRules(prev => prev.filter((_, i) => i !== index)); // UI inmediata
    await supabase.from("giras_logistica_reglas").delete().eq("id", row.id);
    refresh();
  };

  const updateRuleInDb = async (row) => {
    setSavingRows((prev) => new Set(prev).add(row.id));
    
    const payload = {
        alcance: row.alcance === "Categoria" ? "Instrumento" : row.alcance,
        prioridad: row.prioridad,
        target_ids: row.ref_values || [], // Array de IDs
        
        // Mapeo Legacy (solo el primer valor si existe, para compatibilidad)
        id_integrante: row.alcance === 'Persona' ? (row.ref_values?.[0] || null) : null,
        id_localidad: row.alcance === 'Localidad' ? (row.ref_values?.[0] || null) : null,
        id_region: row.alcance === 'Region' ? (row.ref_values?.[0] || null) : null,
        instrumento_familia: row.alcance === 'Categoria' ? (row.ref_values?.[0] || null) : null,

        // Campos Logísticos
        fecha_checkin: row.fecha_checkin || null,
        hora_checkin: row.hora_checkin || null,
        fecha_checkout: row.fecha_checkout || null,
        hora_checkout: row.hora_checkout || null,
        comida_inicio_fecha: row.comida_inicio_fecha || null,
        comida_inicio_servicio: row.comida_inicio_servicio || null,
        comida_fin_fecha: row.comida_fin_fecha || null,
        comida_fin_servicio: row.comida_fin_servicio || null,
        prov_desayuno: row.prov_desayuno || null,
        prov_almuerzo: row.prov_almuerzo || null,
        prov_merienda: row.prov_merienda || null,
        prov_cena: row.prov_cena || null,
    };

    const { error } = await supabase.from("giras_logistica_reglas").update(payload).eq("id", row.id);
    
    if (error) console.error("Error saving rule:", error);
    
    setSavingRows((prev) => { const next = new Set(prev); next.delete(row.id); return next; });
    // NO LLAMAMOS A refresh() AQUÍ PARA EVITAR SALTOS
  };

  const handleRowChange = (index, field, value) => {
    let updatedRow = null;
    setLocalRules((prev) => {
      const newRules = [...prev];
      const row = { ...newRules[index] };
      row[field] = value;
      
      if (field === "alcance") {
        row.ref_values = [];
        switch (value) {
          case "Persona": row.prioridad = 4; break;
          case "Categoria": row.prioridad = 3; break;
          case "Localidad": row.prioridad = 2; break;
          case "Region": row.prioridad = 1; break;
          default: row.prioridad = 0; break;
        }
      }
      newRules[index] = row;
      updatedRow = row;
      return newRules;
    });

    if (updatedRow) {
      const rowId = updatedRow.id;
      if (debounceRef.current[rowId]) clearTimeout(debounceRef.current[rowId]);
      setSavingRows((prev) => new Set(prev).add(rowId));
      debounceRef.current[rowId] = setTimeout(() => updateRuleInDb(updatedRow), 1500); // 1.5s delay
    }
  };

  // --- RENDER HELPERS ---
  const renderSelectionCell = (row, index) => {
    if (row.alcance === "General") return <div className="text-xs text-slate-400 italic px-2 py-2 flex items-center">Aplica a todos</div>;
    let options = [];
    if (row.alcance === "Persona") options = catalogs.musicians.map(m => ({ val: m.id, label: `${m.apellido}, ${m.nombre}` }));
    else if (row.alcance === "Localidad") options = catalogs.locations.map(l => ({ val: l.id, label: l.localidad }));
    else if (row.alcance === "Region") options = catalogs.regions.map(r => ({ val: r.id, label: r.region }));
    else if (row.alcance === "Categoria") options = CATEGORIA_OPTIONS;
    
    return <MultiSelectCell options={options} selectedIds={row.ref_values} onChange={(newIds) => handleRowChange(index, "ref_values", newIds)} />;
  };

  const ServiceSelect = ({ value, onChange }) => (
    <select className="w-full text-[10px] bg-transparent outline-none border-none p-0.5 cursor-pointer hover:bg-slate-100 rounded" value={value || ""} onChange={(e) => onChange(e.target.value)}>
      <option value="">--</option> {SERVICIOS_COMIDA.map((s) => <option key={s} value={s}>{s}</option>)}
    </select>
  );
  const ProviderSelect = ({ value, onChange }) => (
    <select className={`w-full text-[10px] bg-transparent outline-none border-none p-1 text-center cursor-pointer rounded ${getProviderColorClass(value)}`} value={value || ""} onChange={(e) => onChange(e.target.value)}>
      <option value="">-</option> {PROVEEDORES_COMIDA.map((p) => <option key={p} value={p}>{p}</option>)}
    </select>
  );
  const formatDate = (d) => d ? d.split("-").reverse().slice(0, 2).join("/") : "-";
  const EmptyCellAlert = ({ val, children }) => !val ? <div className="w-full h-full bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-300">-</div> : children;

  return (
    <div className="flex flex-col h-full bg-slate-50 animate-in fade-in relative">
      <div className="flex-1 overflow-auto p-4 space-y-8">
        
        {/* TABLA DE EDICIÓN */}
        <div>
          <div className="flex justify-between items-end mb-2">
            <h3 className="text-sm font-bold text-indigo-900 flex items-center gap-2">1. Definición de Reglas (Hotel & Comida)</h3>
            <div className="flex items-center gap-3">
                {loading && <IconLoader className="animate-spin text-indigo-600" />}
                <div className="text-[10px] text-slate-400 italic">Orden: General (0) → Particular (4)</div>
            </div>
          </div>
          <div className="bg-white border border-slate-300 rounded-lg shadow-sm overflow-x-auto pb-2">
            <table className="w-full text-left text-sm border-collapse min-w-[1400px]">
              <thead className="bg-slate-100 text-slate-600 uppercase font-bold text-[10px] border-b border-slate-300 sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="border-r border-slate-300 px-2 py-2 w-32 sticky left-0 z-20 bg-slate-100">Criterio</th>
                  <th className="border-r border-slate-300 px-2 py-2 w-64 sticky left-32 z-20 bg-slate-100 shadow-r">Selección</th>
                  <th className="border-r border-slate-300 px-2 py-2 w-32 bg-blue-50/50 text-blue-800 border-b-2 border-b-blue-200">Check-In</th>
                  <th className="border-r border-slate-300 px-2 py-2 w-24 bg-blue-50/50 text-blue-800 border-b-2 border-b-blue-200">Hora</th>
                  <th className="border-r border-slate-300 px-2 py-2 w-32 bg-amber-50/50 text-amber-800 border-b-2 border-b-amber-200">Check-Out</th>
                  <th className="border-r border-slate-300 px-2 py-2 w-24 bg-amber-50/50 text-amber-800 border-b-2 border-b-amber-200">Hora</th>
                  <th className="border-r border-slate-300 px-2 py-2 w-48 bg-emerald-50/50 text-emerald-800 border-b-2 border-b-emerald-200">Inicio Comidas</th>
                  <th className="border-r border-slate-300 px-2 py-2 w-48 bg-red-50/50 text-red-800 border-b-2 border-b-red-200">Fin Comidas</th>
                  <th className="border-r border-slate-300 px-2 py-2 w-28 bg-slate-50/50 text-center">Des</th>
                  <th className="border-r border-slate-300 px-2 py-2 w-28 bg-slate-50/50 text-center">Alm</th>
                  <th className="border-r border-slate-300 px-2 py-2 w-28 bg-slate-50/50 text-center">Mer</th>
                  <th className="border-r border-slate-300 px-2 py-2 w-28 bg-slate-50/50 text-center">Cen</th>
                  <th className="px-2 py-2 w-10 text-center sticky right-0 bg-slate-100 z-20"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {localRules.map((row, index) => (
                  <tr key={row.id} className="hover:bg-slate-50 group">
                    <td className="border-r border-slate-200 p-0 bg-white sticky left-0 z-10">
                      <select className="w-full h-full bg-transparent outline-none text-xs font-bold text-indigo-700 px-2 py-3 cursor-pointer" value={row.alcance} onChange={(e) => handleRowChange(index, "alcance", e.target.value)}>
                        <option value="General">General</option>
                        <option value="Region">Región</option>
                        <option value="Localidad">Localidad</option>
                        <option value="Categoria">Categoría</option>
                        <option value="Persona">Persona</option>
                      </select>
                    </td>
                    <td className="border-r border-slate-200 p-0 bg-white sticky left-32 z-10 shadow-lg shadow-black/5">
                      {renderSelectionCell(row, index)}
                    </td>
                    <td className="border-r border-slate-200 p-1"><DateInput value={row.fecha_checkin} onChange={(v) => handleRowChange(index, "fecha_checkin", v)} /></td>
                    <td className="border-r border-slate-200 p-1"><TimeInput value={row.hora_checkin} onChange={(v) => handleRowChange(index, "hora_checkin", v)} /></td>
                    <td className="border-r border-slate-200 p-1"><DateInput value={row.fecha_checkout} onChange={(v) => handleRowChange(index, "fecha_checkout", v)} /></td>
                    <td className="border-r border-slate-200 p-1"><TimeInput value={row.hora_checkout} onChange={(v) => handleRowChange(index, "hora_checkout", v)} /></td>
                    
                    <td className="border-r border-slate-200 p-1"><div className="flex gap-1"><div className="w-24"><DateInput value={row.comida_inicio_fecha} onChange={(v) => handleRowChange(index, "comida_inicio_fecha", v)} /></div><div className="flex-1"><ServiceSelect value={row.comida_inicio_servicio} onChange={(v) => handleRowChange(index, "comida_inicio_servicio", v)} /></div></div></td>
                    <td className="border-r border-slate-200 p-1"><div className="flex gap-1"><div className="w-24"><DateInput value={row.comida_fin_fecha} onChange={(v) => handleRowChange(index, "comida_fin_fecha", v)} /></div><div className="flex-1"><ServiceSelect value={row.comida_fin_servicio} onChange={(v) => handleRowChange(index, "comida_fin_servicio", v)} /></div></div></td>
                    
                    <td className="border-r border-slate-200 p-1"><ProviderSelect value={row.prov_desayuno} onChange={(v) => handleRowChange(index, "prov_desayuno", v)} /></td>
                    <td className="border-r border-slate-200 p-1"><ProviderSelect value={row.prov_almuerzo} onChange={(v) => handleRowChange(index, "prov_almuerzo", v)} /></td>
                    <td className="border-r border-slate-200 p-1"><ProviderSelect value={row.prov_merienda} onChange={(v) => handleRowChange(index, "prov_merienda", v)} /></td>
                    <td className="border-r border-slate-200 p-1"><ProviderSelect value={row.prov_cena} onChange={(v) => handleRowChange(index, "prov_cena", v)} /></td>
                    
                    <td className="p-2 text-center sticky right-0 bg-white z-10 border-l border-slate-100">
                      {savingRows.has(row.id) ? <IconLoader size={16} className="animate-spin text-indigo-500 mx-auto" /> : <button onClick={() => deleteRow(index)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><IconTrash size={16} /></button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button onClick={addEmptyRow} className="w-full py-3 bg-slate-50 hover:bg-slate-100 text-slate-500 text-xs font-bold uppercase tracking-wide flex items-center justify-center gap-2 border-t border-slate-200 transition-colors sticky left-0">
              <IconPlus size={14} /> Agregar Fila
            </button>
          </div>
        </div>

        {/* 2. RESUMEN CALCULADO */}
        <div className="pb-10">
          <div className="flex justify-between items-end mb-2">
            <h3 className="text-sm font-bold text-emerald-800 flex items-center gap-2">2. Resumen Calculado por Persona</h3>
            <div className="flex gap-2 text-[9px] bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-sm">
              <span className="font-bold text-slate-400 uppercase mr-1">Fuente:</span>
              {["G", "R", "L", "C", "P"].map((t) => <div key={t} className="flex items-center gap-1">{getSourceBadge(t)}</div>)}
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[1400px]">
              <thead className="bg-slate-50 text-slate-500 uppercase font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3 w-64 sticky left-0 bg-slate-50 z-10 border-r border-slate-200">Apellido, Nombre</th>
                  <th className="p-3 text-center border-r border-slate-100 w-48 bg-slate-50">Transporte (Info)</th>
                  <th className="p-3 text-center bg-blue-50/30 border-r border-slate-100">Check-In</th>
                  <th className="p-3 text-center bg-amber-50/30 border-r border-slate-200 border-r-2">Check-Out</th>
                  <th className="p-3 text-center bg-emerald-50/30 border-r border-slate-100 w-40">Inicio Comidas</th>
                  <th className="p-3 text-center bg-red-50/30 border-r border-slate-200 border-r-2 w-40">Fin Comidas</th>
                  <th className="p-3 text-center w-64">Proveedores (D / A / M / C)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {summary.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="p-3 sticky left-0 bg-white z-10 border-r border-slate-100">
                      <div className="font-bold">{item.apellido}, {item.nombre}</div>
                      <div className="flex gap-1 mt-0.5">
                        {item.is_local && <span className="text-[9px] text-orange-600 bg-orange-100 px-1 rounded border border-orange-200">LOCAL</span>}
                        <span className="text-[9px] text-slate-400 bg-slate-100 px-1 rounded">{item.rol_gira !== "musico" ? item.rol_gira.toUpperCase() : item.instrumentos?.instrumento}</span>
                      </div>
                    </td>
                    <td className="p-3 align-top border-r border-slate-100 bg-slate-50/10">
                        <div className="flex flex-col gap-1">
                            {item.logistics.transports && item.logistics.transports.length > 0 ? (
                                item.logistics.transports.map((t, i) => (
                                    <span key={i} className="text-[10px] bg-slate-100 border px-1.5 rounded flex items-center gap-1"><IconBus size={8}/> {t.nombre} {t.detalle && `(${t.detalle})`}</span>
                                ))
                            ) : <span className="text-slate-300 text-[9px] italic text-center block">-</span>}
                        </div>
                    </td>
                    <td className="p-3 text-center bg-blue-50/5 border-r border-slate-100">
                      <EmptyCellAlert val={item.logistics.checkin}>
                        <div className="flex items-center justify-center gap-2">
                          <span className="text-blue-700 font-bold">{formatDate(item.logistics.checkin)}</span>
                          {getSourceBadge(item.logistics.checkin_src)}
                          <span className="text-slate-400 font-normal ml-1 border-l border-slate-300 pl-2">{item.logistics.checkin_time?.slice(0, 5)}</span>
                        </div>
                      </EmptyCellAlert>
                    </td>
                    <td className="p-3 text-center bg-amber-50/5 border-r border-slate-200 border-r-2">
                      <EmptyCellAlert val={item.logistics.checkout}>
                        <div className="flex items-center justify-center gap-2">
                          <span className="text-amber-700 font-bold">{formatDate(item.logistics.checkout)}</span>
                          {getSourceBadge(item.logistics.checkout_src)}
                          <span className="text-slate-400 font-normal ml-1 border-l border-slate-300 pl-2">{item.logistics.checkout_time?.slice(0, 5)}</span>
                        </div>
                      </EmptyCellAlert>
                    </td>
                    <td className="p-3 text-center bg-emerald-50/5 border-r border-slate-100">
                      <EmptyCellAlert val={item.logistics.comida_inicio}>
                        <div className="flex flex-col items-center leading-tight">
                          <div className="flex gap-1 items-center"><span className="font-bold text-emerald-800">{formatDate(item.logistics.comida_inicio)}</span>{getSourceBadge(item.logistics.comida_inicio_src)}</div>
                          <span className="text-[9px] uppercase text-emerald-600 font-bold">{item.logistics.comida_inicio_svc}</span>
                        </div>
                      </EmptyCellAlert>
                    </td>
                    <td className="p-3 text-center bg-red-50/5 border-r border-slate-200 border-r-2">
                      <EmptyCellAlert val={item.logistics.comida_fin}>
                        <div className="flex flex-col items-center leading-tight">
                          <div className="flex gap-1 items-center"><span className="font-bold text-red-800">{formatDate(item.logistics.comida_fin)}</span>{getSourceBadge(item.logistics.comida_fin_src)}</div>
                          <span className="text-[9px] uppercase text-red-600 font-bold">{item.logistics.comida_fin_svc}</span>
                        </div>
                      </EmptyCellAlert>
                    </td>
                    <td className="p-2 text-[9px] align-middle">
                      <div className="grid grid-cols-4 gap-1">
                        <div className={`text-center border p-1 rounded ${getProviderColorClass(item.logistics.prov_des)}`}><div className="font-bold opacity-50 text-[7px] mb-0.5">DES</div>{item.logistics.prov_des || "-"}</div>
                        <div className={`text-center border p-1 rounded ${getProviderColorClass(item.logistics.prov_alm)}`}><div className="font-bold opacity-50 text-[7px] mb-0.5">ALM</div>{item.logistics.prov_alm || "-"}</div>
                        <div className={`text-center border p-1 rounded ${getProviderColorClass(item.logistics.prov_mer)}`}><div className="font-bold opacity-50 text-[7px] mb-0.5">MER</div>{item.logistics.prov_mer || "-"}</div>
                        <div className={`text-center border p-1 rounded ${getProviderColorClass(item.logistics.prov_cen)}`}><div className="font-bold opacity-50 text-[7px] mb-0.5">CEN</div>{item.logistics.prov_cen || "-"}</div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}