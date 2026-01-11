import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  IconCalculator, IconPlus, IconUserPlus, IconSearch, IconCheck, IconChevronDown,
  IconChevronRight, IconBriefcase, IconEye, IconEyeOff, IconArrowLeft, IconDrive,
  IconBus, IconInfo,
} from "../../../components/ui/Icons";
import { useLogistics } from "../../../hooks/useLogistics"; 
import ViaticosForm from "./ViaticosForm";
import ViaticosBulkEditPanel from "./ViaticosBulkEditPanel";
import { exportViaticosToPDFForm } from "../../../utils/pdfFormExporter";
import RendicionForm from "./RendicionForm";
import DestaquesLocationPanel from "./DestaquesLocationPanel";
import ViaticosTable from "./ViaticosTable";

// --- UTILIDADES ---
const calculateDaysDiff = (dSal, hSal, dLleg, hLleg) => {
  if (!dSal || !dLleg) return 0;
  const start = new Date(dSal + "T00:00:00");
  const end = new Date(dLleg + "T00:00:00");
  const diffTime = end.getTime() - start.getTime();
  const diffDays = Math.round(diffTime / (1000 * 3600 * 24));
  
  if (diffDays < 0) return 0;
  if (diffDays === 0) return 0.5;

  const getDepartureFactor = (timeStr) => {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(":").map(Number);
    const minutes = h * 60 + m;
    if (minutes <= 900) return 1.0; 
    if (minutes <= 1260) return 0.75; 
    return 0.0;
  };
  const getArrivalFactor = (timeStr) => {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(":").map(Number);
    const minutes = h * 60 + m;
    if (minutes <= 180) return 0.0; 
    if (minutes <= 899) return 0.75; 
    return 1.0;
  };
  return Math.max(0, diffDays - 1) + getDepartureFactor(hSal || "12:00") + getArrivalFactor(hLleg || "12:00");
};

const round2 = (num) => Math.round((num + Number.EPSILON) * 100) / 100;

const getAutoDatosLaborales = (persona) => {
  if (!persona) return { cargo: "", jornada: "" };
  const nombreCompleto = `${persona.apellido || ""} ${persona.nombre || ""}`.toUpperCase();
  const esEstable = persona.condicion === "Estable";
  let cargo = "Externo";
  if (nombreCompleto.includes("FRAILE")) cargo = "Subsecretario de la Orquesta Filarmónica de Río Negro";
  else if (nombreCompleto.includes("SPELZINI")) cargo = "Director de la Orquesta Filarmónica de Río Negro";
  else if (esEstable) cargo = "Agente administrativo";
  let jornada = "";
  if (nombreCompleto.includes("FRAILE") || nombreCompleto.includes("SPELZINI")) jornada = "8 A 14";
  else if (esEstable) jornada = "Horas Cátedra";
  return { cargo, jornada };
};

// --- COMPONENTE BUSCADOR ---
const MemberSearchSelect = ({ options = [], value, onChange, placeholder }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState("");
    const wrapperRef = useRef(null);
    const inputRef = useRef(null);
  
    useEffect(() => {
      function handleClickOutside(event) {
        if (wrapperRef.current && !wrapperRef.current.contains(event.target))
          setIsOpen(false);
      }
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);
  
    useEffect(() => {
      if (isOpen) {
        setSearch("");
        setTimeout(() => inputRef.current?.focus(), 50);
      }
    }, [isOpen]);
  
    const filteredOptions = useMemo(() => {
      if (!options) return [];
      if (!search) return options;
      return options.filter((opt) => opt.label.toLowerCase().includes(search.toLowerCase()));
    }, [options, search]);
  
    const selectedLabel = options?.find((o) => o.value === value)?.label || "";
  
    return (
      <div className="relative w-full" ref={wrapperRef}>
        <div onClick={() => setIsOpen(!isOpen)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white flex items-center justify-between cursor-pointer hover:border-indigo-400 shadow-sm select-none">
          <span className={value ? "text-slate-700 font-medium" : "text-slate-400"}>{value ? selectedLabel : placeholder}</span>
          <IconChevronDown size={16} className="text-slate-400" />
        </div>
        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-[100] overflow-hidden animate-in zoom-in-95 flex flex-col max-h-60">
            <div className="p-2 border-b bg-slate-50 relative shrink-0">
              <IconSearch size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input ref={inputRef} type="text" className="w-full pl-8 pr-2 py-1.5 text-sm border rounded-md focus:ring-2 focus:ring-indigo-500/50 outline-none" placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} onClick={(e) => e.stopPropagation()} />
            </div>
            <div className="overflow-y-auto">
              {filteredOptions.length === 0 ? <div className="p-3 text-xs text-slate-400 text-center italic">Sin resultados</div> : filteredOptions.map((opt, i) => (
                  <div key={`${opt.value}-${i}`} onClick={() => { onChange(opt.value); setIsOpen(false); }} className={`px-3 py-2 text-sm cursor-pointer hover:bg-indigo-50 flex justify-between ${value === opt.value ? "bg-indigo-50 text-indigo-700 font-bold" : "text-slate-700"}`}>
                    <div className="flex flex-col"><span>{opt.label}</span>{opt.subLabel && <span className="text-[10px] text-slate-400">{opt.subLabel}</span>}</div>
                    {value === opt.value && <IconCheck size={14} />}
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    );
};

// --- COMPONENTE PRINCIPAL ---
export default function ViaticosManager({ supabase, giraId }) {
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState({ valor_diario_base: 0, factor_temporada: 0.5, motivo: "", lugar_comision: "", link_drive: "" });
  const saveTimeoutRef = useRef(null);
  const pendingUpdatesRef = useRef({});
  
  const [giraData, setGiraData] = useState(null);
  const giraObj = useMemo(() => giraData || { id: giraId }, [giraData, giraId]);
  
  // HOOK COMPLETO
  const { summary, roster, routeRules, transportes, loading: rosterLoading } = useLogistics(supabase, giraObj);

  const [viaticosRows, setViaticosRows] = useState([]);
  const [selection, setSelection] = useState(new Set());
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedToAdd, setSelectedToAdd] = useState(null);

  // Estados visuales
  const [showDatos, setShowDatos] = useState(true); 
  const [showAnticipo, setShowAnticipo] = useState(true); 
  const [showTransport, setShowTransport] = useState(false);
  const [showExpenses, setShowExpenses] = useState(true);
  const [showRendiciones, setShowRendiciones] = useState(false);

  // Estados async/feedback
  const [updatingFields, setUpdatingFields] = useState(new Set()); 
  const [successFields, setSuccessFields] = useState(new Set());   
  const [deletingRows, setDeletingRows] = useState(new Set()); 
  const [notification, setNotification] = useState(null);

  const [previewRow, setPreviewRow] = useState(null);
  const [previewMode, setPreviewMode] = useState("viatico"); 
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState("");
  const [batchValues, setBatchValues] = useState({ 
    fecha_salida: "", hora_salida: "", fecha_llegada: "", hora_llegada: "",
    dias_computables: "", porcentaje: "", es_temporada_alta: "",
    cargo: "", jornada_laboral: "", gastos_movilidad: "", gasto_combustible: "",
    gasto_otros: "", gastos_capacit: "", gastos_movil_otros: "", gasto_alojamiento: "",
    check_aereo: "", check_terrestre: "", check_patente_oficial: "", patente_oficial: "",
    check_patente_particular: "", patente_particular: "", check_otros: "", transporte_otros: "",
  });

  const [destaquesConfigs, setDestaquesConfigs] = useState({});
  const [showIndividualPanel, setShowIndividualPanel] = useState(true);
  const [showMassivePanel, setShowMassivePanel] = useState(true);

  // --- EFECTOS DE CARGA ---
  useEffect(() => {
    if (giraId) {
      supabase.from("programas").select("*").eq("id", giraId).single()
        .then(({ data }) => { if (data) setGiraData(data); });
      fetchViaticosData();
    }
  }, [giraId]);

  const fetchViaticosData = async () => {
    if(viaticosRows.length === 0) setLoading(true);
    try {
      const { data: conf } = await supabase.from("giras_viaticos_config").select("*").eq("id_gira", giraId).single();
      if (conf) setConfig(conf);
      else {
          const { data: newConf } = await supabase.from("giras_viaticos_config").insert([{id_gira: giraId, valor_diario_base: 0}]).select().single();
          if(newConf) setConfig(newConf);
      }
      
      let { data: detalles, error } = await supabase
        .from("giras_viaticos_detalle")
        .select(`*, integrantes:id_integrante(id, nombre, apellido, dni, firma, id_instr)`)
        .eq("id_gira", giraId) 
        .order("id");
      
      if(error || !detalles) {
          const res = await supabase.from("giras_viaticos_detalle").select("*").eq("id_gira", giraId).order("id");
          detalles = res.data;
      }
      
      setViaticosRows(detalles || []);
      
      const { data: locConfigs } = await supabase.from("giras_destaques_config").select("*").eq("id_gira", giraId);
      const locMap = {};
      locConfigs?.forEach(c => { locMap[c.id_localidad] = c; });
      setDestaquesConfigs(locMap);

    } catch (error) { 
        console.error("Critical error fetching viaticos:", error); 
    } finally { setLoading(false); }
  };

  // --- MAPA DE LOGÍSTICA CALCULADA ---
  const logisticsMap = useMemo(() => {
    if (!summary) return {};
    const map = {};

    summary.forEach(person => {
        const transports = person.logistics?.transports || [];
        if (transports.length === 0) return;

        let minSalida = null;
        let maxLlegada = null;

        transports.forEach(t => {
            // Nombre formateado: "Bus 1 - Interno 404"
            let nombreFinal = t.nombre || "Transporte";
            if (t.detalle && t.detalle.trim() !== "") {
                nombreFinal = `${nombreFinal} - ${t.detalle}`;
            }

            if (t.subidaData) {
                const dateTimeStr = `${t.subidaData.fecha}T${t.subidaData.hora || '00:00'}`;
                const dateObj = new Date(dateTimeStr);
                
                if (!minSalida || dateObj < minSalida.dt) {
                    minSalida = {
                        dt: dateObj,
                        fecha: t.subidaData.fecha, 
                        hora: t.subidaData.hora ? t.subidaData.hora.slice(0, 5) : "00:00", 
                        lugar: t.subidaData.nombre_localidad || "Origen",
                        transporte: nombreFinal 
                    };
                }
            }

            if (t.bajadaData) {
                const dateTimeStr = `${t.bajadaData.fecha}T${t.bajadaData.hora || '00:00'}`;
                const dateObj = new Date(dateTimeStr);

                if (!maxLlegada || dateObj > maxLlegada.dt) {
                    maxLlegada = {
                        dt: dateObj,
                        fecha: t.bajadaData.fecha,
                        hora: t.bajadaData.hora ? t.bajadaData.hora.slice(0, 5) : "00:00", 
                        lugar: t.bajadaData.nombre_localidad || "Destino",
                        transporte: nombreFinal 
                    };
                }
            }
        });

        if (minSalida || maxLlegada) {
            map[person.id] = {
                fecha_salida: minSalida?.fecha,
                hora_salida: minSalida?.hora,
                transporte_salida: minSalida?.transporte,
                lugar_salida: minSalida?.lugar,
                fecha_llegada: maxLlegada?.fecha,
                hora_llegada: maxLlegada?.hora,
                transporte_llegada: maxLlegada?.transporte,
                lugar_llegada: maxLlegada?.lugar
            };
        }
    });

    return map;
  }, [summary]);

  function calculateRow(row, currentConfig) {
    const base = parseFloat(currentConfig?.valor_diario_base || 0);
    const dias = parseFloat(row.dias_computables || 0);
    const pct = parseFloat(row.porcentaje || 100) / 100;
    const basePorcentaje = round2(base * pct);
    const factorTemp = row.es_temporada_alta ? parseFloat(currentConfig?.factor_temporada || 0.5) : 0;
    const valorDiarioCalc = round2(basePorcentaje * (1 + factorTemp));
    const subtotal = round2(dias * valorDiarioCalc);
    const gastos = (parseFloat(row.gastos_movilidad||0) + parseFloat(row.gasto_combustible||0) + parseFloat(row.gasto_otros||0) + parseFloat(row.gastos_capacit||0) + parseFloat(row.gastos_movil_otros||0) + parseFloat(row.gasto_alojamiento||0) + parseFloat(row.gasto_pasajes||0) + parseFloat(row.transporte_otros||0));
    return { valorDiarioCalc, subtotal, totalFinal: round2(subtotal + gastos) };
  }

  // --- FILAS ACTIVAS (CON DETECTION DE BAJA CORREGIDA) ---
  const activeRows = useMemo(() => {
    return viaticosRows.map((row) => {
        // 1. Buscamos a la persona en el Roster actual
        const enRoster = (roster || []).find((p) => String(p.id) === String(row.id_integrante));
        
        // 2. Definimos si es una "Baja" para efectos de viáticos
        // CORRECCIÓN: Usamos 'estado_gira' que es la propiedad correcta en useGiraRoster
        const esBajaLogica = !enRoster || enRoster.estado_gira === 'ausente';

        // Recuperación robusta de datos (Si no está en el roster, usamos el backup de la fila)
        let persona = enRoster;
        const rawIntegrantes = row.integrantes;
        
        if (!persona && rawIntegrantes) {
            persona = Array.isArray(rawIntegrantes) ? rawIntegrantes[0] : rawIntegrantes;
        }

        const { valorDiarioCalc, subtotal, totalFinal } = calculateRow(row, config);
        
        return {
          ...row,
          nombre: persona?.nombre || "Desconocido",
          apellido: persona?.apellido || `(ID: ${row.id_integrante})`,
          rol_roster: persona?.rol_gira || persona?.rol || "",
          cargo: row.cargo || persona?.rol_gira || "Músico",
          firma: persona ? persona.firma : null,
          ciudad_origen: persona?.localidades?.localidad || "",
          
          // FLAG CRÍTICO
          noEstaEnRoster: esBajaLogica, 
          
          valorDiarioCalc, subtotal, totalFinal
        };
      }).sort((a, b) => (a.apellido || "").localeCompare(b.apellido || ""));
  }, [viaticosRows, roster, config]);

  // --- OTRAS FUNCIONES ---
  const candidateOptions = useMemo(() => {
    if (!roster || roster.length === 0) return [];
    const existingIds = new Set(viaticosRows.map((r) => String(r.id_integrante)));
    const seen = new Set();
    const opts = [];
    roster.forEach((p) => {
      const idStr = String(p.id);
      if (!existingIds.has(idStr) && !seen.has(idStr)) {
        seen.add(idStr);
        opts.push({ value: p.id, label: `${p.apellido || ""}, ${p.nombre || ""}`, subLabel: p.rol_gira || p.rol || "Sin Rol" });
      }
    });
    return opts.sort((a, b) => a.label.localeCompare(b.label));
  }, [roster, viaticosRows]);

  const updateRow = async (id, field, value) => {
    const fieldKey = `${id}-${field}`;
    setUpdatingFields((prev) => new Set(prev).add(fieldKey));
    if (successFields.has(fieldKey)) {
        setSuccessFields((prev) => { const next = new Set(prev); next.delete(fieldKey); return next; });
    }

    const currentRow = viaticosRows.find((r) => r.id === id);
    if (!currentRow) return;

    const updatedRow = { ...currentRow, [field]: value };
    if (["fecha_salida", "hora_salida", "fecha_llegada", "hora_llegada"].includes(field)) {
      updatedRow.dias_computables = calculateDaysDiff(updatedRow.fecha_salida, updatedRow.hora_salida, updatedRow.fecha_llegada, updatedRow.hora_llegada);
    }
    setViaticosRows((prev) => prev.map((r) => (r.id === id ? updatedRow : r)));

    try {
        const payload = { [field]: value };
        if (updatedRow.dias_computables !== currentRow.dias_computables) {
             payload.dias_computables = updatedRow.dias_computables;
        }
        await supabase.from("giras_viaticos_detalle").update(payload).eq("id", id);
        setSuccessFields((prev) => new Set(prev).add(fieldKey));
        setTimeout(() => {
            setSuccessFields((prev) => { const next = new Set(prev); next.delete(fieldKey); return next; });
        }, 2000);
    } catch (err) { 
        console.error(err); 
        alert("Error al guardar cambio.");
        fetchViaticosData();
    } finally {
        setUpdatingFields((prev) => { const next = new Set(prev); next.delete(fieldKey); return next; });
    }
  };

  const handleDeleteRow = async (id) => {
    if (!confirm(`¿Eliminar de la lista de viáticos?`)) return;
    setDeletingRows(prev => new Set(prev).add(id));
    try { 
        await supabase.from('giras_viaticos_detalle').delete().eq('id', id);
        setViaticosRows(prev => prev.filter(r => r.id !== id));
    } catch (err) { console.error(err); } 
    finally { setDeletingRows(prev => { const next = new Set(prev); next.delete(id); return next; }); }
  };

  const handleApplyBatch = async () => { 
    setLoading(true); 
    try { 
      const updates = {}; 
      Object.keys(batchValues).forEach((key) => { 
        if (batchValues[key] !== "" && batchValues[key] !== null && batchValues[key] !== false) { 
           updates[key] = batchValues[key]; 
        } 
      }); 
      if (Object.keys(updates).length === 0) { alert("No has ingresado ningún valor para aplicar."); setLoading(false); return; } 
      const selectedIds = Array.from(selection); 
      const promises = selectedIds.map(async (integranteId) => { 
         const row = viaticosRows.find(r => r.id_integrante === integranteId); 
         if (!row) return; 
         const newRowData = { ...row, ...updates }; 
         if (updates.fecha_salida || updates.hora_salida || updates.fecha_llegada || updates.hora_llegada) { 
            newRowData.dias_computables = calculateDaysDiff(newRowData.fecha_salida, newRowData.hora_salida, newRowData.fecha_llegada, newRowData.hora_llegada); 
            updates.dias_computables = newRowData.dias_computables; 
         } 
         await supabase.from("giras_viaticos_detalle").update(updates).eq("id", row.id); 
      }); 
      await Promise.all(promises); 
      await fetchViaticosData(); 
      setSelection(new Set()); 
      alert("Cambios masivos aplicados correctamente."); 
    } catch (err) { console.error(err); alert("Error: " + err.message); } finally { setLoading(false); } 
  };

  const handleAddPerson = async () => { 
    if (!selectedToAdd) return; 
    setLoading(true); 
    const persona = roster.find((p) => p.id === selectedToAdd); 
    if (!persona) { alert("Error: No se encontró la persona."); setLoading(false); return; } 
    const { cargo, jornada } = getAutoDatosLaborales(persona); 
    try { 
      const { data, error } = await supabase.from("giras_viaticos_detalle").insert([{ id_gira: giraId, id_integrante: selectedToAdd, dias_computables: 0, porcentaje: 100, cargo, jornada_laboral: jornada }]).select(); 
      if (error) throw error; 
      setViaticosRows((prev) => [...prev, ...data]); 
      setSelectedToAdd(null); 
    } catch (err) { alert("Error: " + err.message); } finally { setLoading(false); } 
  };

  const handleAddProduction = async () => { 
    setLoading(true); 
    try { 
      if (!roster || roster.length === 0) { alert("Roster vacío."); setLoading(false); return; } 
      const existingIds = new Set(viaticosRows.map((r) => String(r.id_integrante))); 
      const toAdd = []; 
      const seen = new Set(); 
      const normalize = (s) => (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); 
      
      roster.forEach((p) => { 
        const idStr = String(p.id); 
        const roleGira = normalize(p.rol_gira); 
        const roleBase = normalize(p.rol); 
        const isProd = roleGira.includes("prod") || roleGira.includes("staff") || roleGira.includes("tecnic") || roleGira.includes("logist") || roleGira.includes("coord") || roleBase.includes("prod") || roleBase.includes("staff") || roleBase.includes("tecnic") || roleGira.includes("chofer") || roleGira.includes("director");
        if (isProd && !existingIds.has(idStr) && !seen.has(idStr)) { 
          seen.add(idStr); 
          const { cargo, jornada } = getAutoDatosLaborales(p); 
          toAdd.push({ id_gira: giraId, id_integrante: p.id, dias_computables: 0, porcentaje: 100, cargo: cargo !== "Externo" ? cargo : "Producción / Staff", jornada_laboral: jornada }); 
        } 
      }); 
      
      if (toAdd.length === 0) { alert("No se encontraron nuevos integrantes de Producción/Staff."); setLoading(false); return; } 
      const { data, error } = await supabase.from("giras_viaticos_detalle").insert(toAdd).select(); 
      if (error) throw error; 
      setViaticosRows((prev) => [...prev, ...data]); 
      setIsAddOpen(false); 
      alert(`Se agregaron ${toAdd.length} integrantes.`); 
    } catch (err) { alert("Error: " + err.message); } finally { setLoading(false); } 
  };

  const toggleSelection = (id) => { const newSet = new Set(selection); if (newSet.has(id)) newSet.delete(id); else newSet.add(id); setSelection(newSet); };
  const selectAll = () => { if (selection.size === activeRows.length) setSelection(new Set()); else setSelection(new Set(activeRows.map((r) => r.id_integrante))); };
  
  const updateConfig = (key, val) => {
    setConfig((prev) => ({ ...prev, [key]: val }));
    pendingUpdatesRef.current = { ...pendingUpdatesRef.current, [key]: val };
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      const changesToSave = pendingUpdatesRef.current;
      pendingUpdatesRef.current = {};
      try { await supabase.from("giras_viaticos_config").update(changesToSave).eq("id_gira", giraId); } catch (err) { console.error("Error guardando config:", err); }
    }, 1000);
  };

  const handleExportToDrive = async (options) => { alert("Función de exportación pendiente."); };
  const handleSaveLocationConfig = async () => {};
  const handleExportLocationBatch = async () => {};

  if (previewRow) { return ( <div className="h-full bg-white p-4 overflow-auto animate-in fade-in duration-200"><div className="max-w-[1100px] mx-auto"><div className="flex justify-between mb-4"><button onClick={() => setPreviewRow(null)} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 font-bold"><IconArrowLeft size={16} /> Volver a la lista</button><div className="text-sm font-bold text-slate-400 uppercase">VISTA PREVIA DE PANTALLA</div></div>{previewMode === "rendicion" ? (<RendicionForm data={previewRow} configData={config} />) : (<ViaticosForm onBack={() => setPreviewRow(null)} initialData={previewRow} configData={config} hideAmounts={previewMode === "destaque"} hideToolbar={true} />)}</div></div> ); }

  return (
    <div className="flex flex-col h-full bg-slate-50 relative overflow-y-auto">
      {/* 1. SECCIÓN: VIÁTICOS INDIVIDUALES */}
      <div className="bg-white border-b border-slate-200 shadow-sm mb-4">
        <div className="px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => setShowIndividualPanel(!showIndividualPanel)}>
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><IconCalculator className="text-indigo-600" /> Viáticos Individuales</h2>
            <button className="text-slate-400">{showIndividualPanel ? <IconChevronDown size={20}/> : <IconChevronRight size={20}/>}</button>
        </div>
        {showIndividualPanel && (
            <div className="animate-in slide-in-from-top-2 duration-200">
                <div className="px-6 pb-4 flex flex-col gap-4">
                    {/* Toolbar */}
                    <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex gap-2 flex-wrap">
                            <button onClick={() => setShowDatos(!showDatos)} className={`p-2 rounded-lg border flex items-center gap-2 text-xs font-bold ${showDatos ? "bg-indigo-100 text-indigo-700 border-indigo-200" : "bg-white text-slate-400 border-slate-200"}`}>Datos {showDatos ? <IconEye size={14} /> : <IconEyeOff size={14} />}</button>
                            <button onClick={() => setShowAnticipo(!showAnticipo)} className={`p-2 rounded-lg border flex items-center gap-2 text-xs font-bold ${showAnticipo ? "bg-indigo-100 text-indigo-700 border-indigo-200" : "bg-white text-slate-400 border-slate-200"}`}>Anticipo {showAnticipo ? <IconEye size={14} /> : <IconEyeOff size={14} />}</button>
                            <button onClick={() => setShowTransport(!showTransport)} className={`p-2 rounded-lg border flex items-center gap-2 text-xs font-bold ${showTransport ? "bg-indigo-100 text-indigo-700 border-indigo-200" : "bg-white text-slate-400 border-slate-200"}`}>Transp. {showTransport ? <IconEye size={14} /> : <IconEyeOff size={14} />}</button>
                            <button onClick={() => setShowExpenses(!showExpenses)} className={`p-2 rounded-lg border flex items-center gap-2 text-xs font-bold ${showExpenses ? "bg-indigo-100 text-indigo-700 border-indigo-200" : "bg-white text-slate-400 border-slate-200"}`}>Gastos {showExpenses ? <IconEye size={14} /> : <IconEyeOff size={14} />}</button>
                            <button onClick={() => setShowRendiciones(!showRendiciones)} className={`p-2 rounded-lg border flex items-center gap-2 text-xs font-bold ${showRendiciones ? "bg-green-100 text-green-700 border-green-200" : "bg-white text-slate-400 border-slate-200"}`}>Rendic. {showRendiciones ? <IconEye size={14} /> : <IconEyeOff size={14} />}</button>
                            
                            {config.link_drive && (<button onClick={() => window.open(`https://drive.google.com/drive/folders/${config.link_drive}`, "_blank")} className="p-2 rounded-lg border border-green-200 bg-green-50 text-green-700 hover:bg-green-100 transition-colors flex items-center justify-center" title="Abrir carpeta de Drive"><IconDrive size={18} /></button>)}
                            
                            <div className="w-px h-8 bg-slate-200 mx-2"></div>
                            
                            <button onClick={handleAddProduction} disabled={loading || rosterLoading} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors shadow-sm disabled:opacity-50"><IconBriefcase size={16} /> {rosterLoading ? "..." : "+ Producción"}</button>
                            
                            <div className="relative">
                                <button onClick={() => setIsAddOpen(!isAddOpen)} disabled={rosterLoading} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-all disabled:opacity-50 ${isAddOpen ? "bg-slate-200 text-slate-800" : "bg-slate-800 text-white hover:bg-slate-700"}`}><IconUserPlus size={16} /> {rosterLoading ? "..." : (isAddOpen ? "Cerrar" : "Agregar...")}</button>
                                {isAddOpen && (
                                <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 p-4 z-50 animate-in zoom-in-95 origin-top-right">
                                    <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">Agregar Individual</h4>
                                    <MemberSearchSelect options={candidateOptions} value={selectedToAdd} onChange={setSelectedToAdd} placeholder="Buscar..." />
                                    <button onClick={handleAddPerson} disabled={!selectedToAdd || loading} className="mt-3 w-full bg-indigo-600 text-white py-2 rounded-lg text-sm font-bold flex justify-center items-center gap-2 disabled:bg-slate-300"><IconPlus size={16} /> Agregar</button>
                                </div>
                                )}
                            </div>
                        </div>
                    </div>
                    {/* Configuración */}
                    <div className="flex items-center gap-4 text-sm bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <div className="flex items-center gap-2 border-r border-slate-200 pr-4">
                        <div className="bg-white px-2 py-1 rounded border border-indigo-100 flex items-center gap-1 shadow-sm"><span className="text-xs font-bold text-indigo-700">BASE:</span><span className="text-indigo-700 font-bold">$</span><input type="number" className="bg-transparent w-20 font-bold text-indigo-700 outline-none" value={config.valor_diario_base || 0} onChange={(e) => updateConfig("valor_diario_base", e.target.value)} /></div>
                        <div className="bg-white px-2 py-1 rounded border border-amber-100 flex items-center gap-1 shadow-sm"><span className="text-xs font-bold text-amber-700">TEMP (+%):</span><input type="number" step="0.1" className="bg-transparent w-10 font-bold text-amber-700 outline-none" value={config.factor_temporada || 0} onChange={(e) => updateConfig("factor_temporada", e.target.value)} /></div>
                      </div>
                      <div className="flex flex-1 gap-2">
                        <div className="flex-1 bg-white px-2 py-1 rounded border border-slate-200 flex items-center gap-2 shadow-sm focus-within:border-indigo-400 transition-colors"><span className="text-[10px] font-bold text-slate-400 uppercase">Motivo:</span><input type="text" className="bg-transparent w-full text-sm outline-none text-slate-700 font-medium" placeholder="Ej: Gira Patagónica" value={config.motivo || ""} onChange={(e) => updateConfig("motivo", e.target.value)} /></div>
                        <div className="flex-1 bg-white px-2 py-1 rounded border border-slate-200 flex items-center gap-2 shadow-sm focus-within:border-indigo-400 transition-colors"><span className="text-[10px] font-bold text-slate-400 uppercase">Lugar:</span><input type="text" className="bg-transparent w-full text-sm outline-none text-slate-700 font-medium" placeholder="Ej: Bariloche" value={config.lugar_comision || ""} onChange={(e) => updateConfig("lugar_comision", e.target.value)} /></div>
                      </div>
                    </div>
                    {/* Tabla Individual */}
                    <ViaticosTable 
                        rows={activeRows} selection={selection} onSelectAll={selectAll} onToggleSelection={toggleSelection}
                        onUpdateRow={updateRow} onDeleteRow={handleDeleteRow}
                        showDatos={showDatos} showAnticipo={showAnticipo} showTransport={showTransport} showExpenses={showExpenses} showRendiciones={showRendiciones}
                        config={config}
                        updatingFields={updatingFields}
                        deletingRows={deletingRows}
                        successFields={successFields}
                        logisticsMap={logisticsMap} 
                        routeRules={routeRules} // Pasar reglas para DestaquesLocationPanel
                        transportesList={transportes} // Pasar lista de buses
                    />
                    {/* Bulk Panel */}
                    {selection.size > 0 && (<ViaticosBulkEditPanel selectionSize={selection.size} onClose={() => setSelection(new Set())} values={batchValues} setValues={setBatchValues} onApply={handleApplyBatch} loading={loading} onExport={handleExportToDrive} isExporting={isExporting} exportStatus={exportStatus} />)}
                </div>
            </div>
        )}
      </div>
      
      {/* 2. SECCIÓN: DESTAQUES MASIVOS */}
      <div className="bg-white border-b border-slate-200 shadow-sm mb-12">
        <div className="px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => setShowMassivePanel(!showMassivePanel)}>
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><IconBus className="text-indigo-600" /> Destaques Masivos</h2>
            <button className="text-slate-400">{showMassivePanel ? <IconChevronDown size={20}/> : <IconChevronRight size={20}/>}</button>
        </div>
        {showMassivePanel && (
            <div className="px-6 pb-8 animate-in slide-in-from-top-2 duration-200">
                <DestaquesLocationPanel 
                  roster={roster || []} 
                  configs={destaquesConfigs} 
                  onSaveConfig={handleSaveLocationConfig} 
                  onExportBatch={handleExportLocationBatch} 
                  existingViaticosIds={viaticosRows.map(r => r.id_integrante)} 
                  isExporting={isExporting} 
                  exportStatus={exportStatus}
                  logisticsMap={logisticsMap} 
                  routeRules={routeRules}
                  transportesList={transportes}
                />
            </div>
        )}
      </div>

      {/* NOTIFICACIÓN FLOTANTE (Toast) */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-[100] animate-in slide-in-from-bottom-4 fade-in duration-300">
          <div className="bg-slate-800 text-white px-4 py-3 rounded-lg shadow-xl flex items-center gap-3">
            <div className="bg-green-500 rounded-full p-1 text-slate-900">
              <IconCheck size={14} strokeWidth={3} />
            </div>
            <span className="font-medium text-sm">{notification}</span>
          </div>
        </div>
      )}

    </div>
  );
}