import React, { useState, useEffect, useMemo, useRef } from "react";
import { 
    IconMapPin, 
    IconUsers, 
    IconFileText, 
    IconBus,
    IconAlertCircle,
    IconChevronDown,
    IconChevronRight,
    IconCheck,
    IconDownload,
    IconX,
    IconInfo,
    IconAlertTriangle,
    IconLoader
} from "../../../components/ui/Icons";
import { differenceInCalendarDays, parseISO, isValid } from "date-fns";
import DateInput from "../../../components/ui/DateInput";
import TimeInput from "../../../components/ui/TimeInput";

// AGREGADAS PROPS: isExporting, exportStatus
export default function DestaquesLocationPanel({ roster, configs, onSaveConfig, onExportBatch, existingViaticosIds, isExporting, exportStatus }) {
  const [inputs, setInputs] = useState({});
  const [expandedGroups, setExpandedGroups] = useState(new Set());
  const [selectedLocations, setSelectedLocations] = useState(new Set());
  
  const [isExportPanelOpen, setIsExportPanelOpen] = useState(false);
  const [exportOptions, setExportOptions] = useState({
      generatePdf: true,
      docType: 'none',
      includeExisting: false
  });

  const saveTimeoutsRef = useRef({});

  // 1. Agrupar Músicos
  const groupedData = useMemo(() => {
    const groups = {};
    const viaticosSet = new Set(existingViaticosIds.map(String));

    roster.forEach((p) => {
      let locId = 'unknown';
      let locName = 'Desconocida';

      if (p.localidad_viaticos && p.localidad_viaticos.id) {
          locId = p.localidad_viaticos.id;
          locName = p.localidad_viaticos.localidad;
      } else if (p.localidades && p.localidades.id) {
          locId = p.localidades.id;
          locName = p.localidades.localidad;
      }

      if (!groups[locId]) {
        groups[locId] = { id: locId, name: locName, count: 0, people: [] };
      }
      
      const hasViatico = viaticosSet.has(String(p.id));
      groups[locId].people.push({ ...p, hasViatico });
      groups[locId].count++;
    });
    
    return Object.values(groups).sort((a, b) => {
        if (a.id === 'unknown') return 1;
        if (b.id === 'unknown') return -1;
        return a.name.localeCompare(b.name);
    });
  }, [roster, existingViaticosIds]);

  // 2. Inicializar inputs
  useEffect(() => {
    const initialInputs = {};
    groupedData.forEach(g => {
        const conf = configs[g.id] || {};
        initialInputs[g.id] = {
            fecha_salida: conf.fecha_salida || "",
            hora_salida: conf.hora_salida || "",
            fecha_llegada: conf.fecha_llegada || "",
            hora_llegada: conf.hora_llegada || "",
            dias_computables: conf.dias_computables || 0,
            porcentaje_liquidacion: conf.porcentaje_liquidacion || 100,
            patente: conf.patente || "" 
        };
    });
    setInputs(prev => {
        const next = { ...prev };
        Object.keys(initialInputs).forEach(k => {
            if (!next[k]) next[k] = initialInputs[k];
        });
        return next;
    });
  }, [configs, groupedData]);

  // Helper días
  const calculateDays = (salida, llegada) => {
    if (!salida || !llegada) return 0;
    const d1 = parseISO(salida);
    const d2 = parseISO(llegada);
    if (!isValid(d1) || !isValid(d2)) return 0;
    const diff = differenceInCalendarDays(d2, d1);
    return Math.max(0, diff + 1);
  };

  // 3. Manejo de cambios y AUTO-GUARDADO
  const handleInputChange = (locId, field, value) => {
    if (locId === 'unknown') return;

    setInputs(prev => {
        const current = { ...prev[locId] };
        current[field] = value;
        
        if (field === 'fecha_salida' || field === 'fecha_llegada') {
            const dias = calculateDays(
                field === 'fecha_salida' ? value : current.fecha_salida,
                field === 'fecha_llegada' ? value : current.fecha_llegada
            );
            current.dias_computables = dias;
        }
        
        if (saveTimeoutsRef.current[locId]) {
            clearTimeout(saveTimeoutsRef.current[locId]);
        }
        saveTimeoutsRef.current[locId] = setTimeout(() => {
            onSaveConfig(locId, current);
        }, 1000); 

        return { ...prev, [locId]: current };
    });
  };

  // Selección
  const toggleSelect = (id) => {
      if (id === 'unknown') return;
      const newSet = new Set(selectedLocations);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      setSelectedLocations(newSet);
  };

  const selectAll = () => {
      const validGroups = groupedData.filter(g => g.id !== 'unknown');
      if (selectedLocations.size === validGroups.length) setSelectedLocations(new Set());
      else setSelectedLocations(new Set(validGroups.map(g => g.id)));
  };

  const toggleExpand = (id) => {
      const newSet = new Set(expandedGroups);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      setExpandedGroups(newSet);
  };

  // CÁLCULOS
  const exportSummary = useMemo(() => {
      const groups = groupedData.filter(g => selectedLocations.has(g.id));
      let totalPeople = 0;
      let peopleWithDoc = 0;

      groups.forEach(g => {
          const eligible = exportOptions.includeExisting 
              ? g.people 
              : g.people.filter(p => !p.hasViatico);
          
          totalPeople += eligible.length;
          peopleWithDoc += eligible.filter(p => !!p.documentacion).length;
      });

      return { totalPeople, peopleWithDoc, locCount: groups.length };
  }, [selectedLocations, groupedData, exportOptions.includeExisting]);

  // EJECUTAR EXPORTACIÓN
  const handleRunExport = async () => {
      // Llamamos al padre. NO cerramos el panel aquí.
      // El padre actualizará isExporting a true, lo que cambiará la vista del modal.
      await onExportBatch(Array.from(selectedLocations), groupedData, inputs, exportOptions);
      
      // Solo cerramos si terminó
      setIsExportPanelOpen(false);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 relative">
      
      {/* HEADER */}
      <div className="bg-indigo-50/50 px-6 py-4 border-b border-indigo-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
            <div className="bg-white p-2 rounded-full text-indigo-600 shadow-sm border border-indigo-100">
                <IconBus size={20} />
            </div>
            <div>
                <h3 className="font-bold text-indigo-900 text-base">Destaques Masivos por Localidad</h3>
                <p className="text-xs text-indigo-600/80">Gestión agrupada para músicos externos. Edita y se guarda automáticamente.</p>
            </div>
        </div>

        <div className="flex items-center gap-2">
            {selectedLocations.size > 0 ? (
                <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2">
                    <span className="text-xs font-bold text-indigo-700 bg-indigo-100 px-2 py-1 rounded-md">
                        {selectedLocations.size} loc. seleccionadas
                    </span>
                    <button 
                        onClick={() => setIsExportPanelOpen(true)}
                        disabled={isExporting} // Bloquear si ya está exportando
                        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-md hover:shadow-lg active:scale-95 disabled:opacity-50"
                    >
                        <IconDownload size={16} /> Configurar Exportación
                    </button>
                </div>
            ) : (
                <div className="text-xs text-slate-400 italic">Selecciona localidades para exportar</div>
            )}
        </div>
      </div>

      {/* PANEL FLOTANTE (MODAL) */}
      {isExportPanelOpen && (
          <div className="absolute inset-x-0 top-0 z-50 bg-white border-b-2 border-indigo-500 shadow-2xl p-6 animate-in slide-in-from-top-5 duration-300 min-h-[300px]">
              
              {/* ESTADO 1: PROCESANDO EXPORTACIÓN */}
              {isExporting ? (
                  <div className="flex flex-col items-center justify-center h-full py-8 space-y-6">
                      <div className="relative">
                          <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                          <div className="absolute inset-0 flex items-center justify-center">
                              <IconDownload className="text-indigo-600 animate-pulse" size={24}/>
                          </div>
                      </div>
                      
                      <div className="text-center max-w-lg">
                          <h4 className="text-xl font-bold text-slate-800 mb-2">Generando Archivos...</h4>
                          <p className="text-sm text-slate-500 mb-6">Por favor, no cierres esta ventana ni recargues la página.</p>
                          
                          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex items-center gap-3 text-left">
                              <IconLoader className="animate-spin text-indigo-500 shrink-0" size={20}/>
                              <div>
                                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Estado Actual</div>
                                  <div className="text-sm font-medium text-slate-800 truncate w-full">
                                      {exportStatus || "Iniciando..."}
                                  </div>
                              </div>
                          </div>
                      </div>
                  </div>
              ) : (
                  /* ESTADO 2: CONFIGURACIÓN */
                  <>
                    <div className="flex justify-between items-start mb-6">
                        <h4 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <IconFileText className="text-indigo-600"/> Configuración de Exportación
                        </h4>
                        <button onClick={() => setIsExportPanelOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded-full">
                            <IconX size={20}/>
                        </button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* OPCIONES */}
                        <div className="space-y-4">
                            
                            <label className="flex items-start gap-3 p-3 border border-amber-200 bg-amber-50/50 rounded-lg cursor-pointer hover:bg-amber-50 transition-colors">
                                <input 
                                    type="checkbox" 
                                    checked={exportOptions.includeExisting}
                                    onChange={(e) => setExportOptions({...exportOptions, includeExisting: e.target.checked})}
                                    className="mt-1 w-4 h-4 text-amber-600 rounded focus:ring-amber-500"
                                />
                                <div>
                                    <div className="font-bold text-sm text-slate-800">Incluir músicos que ya tienen viático</div>
                                    <div className="text-xs text-slate-500 leading-snug mt-0.5">
                                        Si se marca, se generarán archivos para TODOS los integrantes, duplicando si ya existen en la tabla principal.
                                    </div>
                                </div>
                            </label>

                            <label className="flex items-center gap-3 p-3 border rounded-lg hover:bg-slate-50 cursor-pointer transition-colors">
                                <input 
                                    type="checkbox" 
                                    checked={exportOptions.generatePdf}
                                    onChange={(e) => setExportOptions({...exportOptions, generatePdf: e.target.checked})}
                                    className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                                />
                                <div>
                                    <div className="font-bold text-sm text-slate-700">Generar PDF de Destaque</div>
                                    <div className="text-xs text-slate-500">Crea el archivo PDF con los horarios configurados.</div>
                                </div>
                            </label>

                            <div className="p-3 border rounded-lg bg-slate-50/30">
                                <div className="font-bold text-sm text-slate-700 mb-2">Documentación Adjunta:</div>
                                <div className="space-y-2">
                                    {['none', 'doc', 'docred'].map(opt => (
                                        <label key={opt} className="flex items-center gap-2 cursor-pointer">
                                            <input 
                                                type="radio" 
                                                name="docType" 
                                                value={opt}
                                                checked={exportOptions.docType === opt}
                                                onChange={(e) => setExportOptions({...exportOptions, docType: e.target.value})}
                                                className="text-indigo-600 focus:ring-indigo-500"
                                            />
                                            <span className="text-sm text-slate-600">
                                                {opt === 'none' && "No incluir documentación"}
                                                {opt === 'doc' && "Documentación Completa"}
                                                {opt === 'docred' && "Documentación Reducida"}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* RESUMEN */}
                        <div className="flex flex-col h-full justify-between bg-slate-50 p-4 rounded-xl border border-slate-200">
                            <div>
                                <div className="flex items-center gap-2 font-bold text-slate-700 mb-4 border-b border-slate-200 pb-2">
                                    <IconInfo size={18} className="text-indigo-500"/> Resumen
                                </div>
                                <ul className="space-y-3 text-sm text-slate-600">
                                    <li className="flex justify-between">
                                        <span>Localidades:</span>
                                        <span className="font-bold">{exportSummary.locCount}</span>
                                    </li>
                                    <li className="flex justify-between">
                                        <span>Personas Total:</span>
                                        <span className="font-bold text-indigo-700">{exportSummary.totalPeople}</span>
                                    </li>
                                    {exportOptions.generatePdf && (
                                        <li className="flex justify-between text-indigo-600">
                                            <span>PDFs a generar:</span>
                                            <span className="font-bold">~{exportSummary.totalPeople}</span>
                                        </li>
                                    )}
                                    {exportOptions.docType !== 'none' && (
                                        <li className="flex justify-between text-emerald-600">
                                            <span>Documentos a copiar:</span>
                                            <span className="font-bold">~{exportSummary.peopleWithDoc}</span>
                                        </li>
                                    )}
                                </ul>
                                
                                {exportSummary.totalPeople === 0 && (
                                    <div className="mt-4 p-2 bg-red-50 text-red-600 text-xs rounded border border-red-100 flex gap-2">
                                        <IconAlertTriangle size={16}/>
                                        No hay personas. Marca "Incluir músicos que ya tienen viático".
                                    </div>
                                )}
                            </div>

                            <div className="mt-6">
                                <button 
                                    onClick={handleRunExport}
                                    disabled={exportSummary.totalPeople === 0 || (!exportOptions.generatePdf && exportOptions.docType === 'none')}
                                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-lg text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <IconDownload size={18}/> Iniciar Exportación
                                </button>
                            </div>
                        </div>
                    </div>
                  </>
              )}
          </div>
      )}

      {/* TABLA DE DATOS (Blur cuando modal abierto) */}
      <div className={`overflow-x-auto transition-all duration-300 ${isExportPanelOpen ? 'blur-[2px] pointer-events-none opacity-60' : ''}`}>
        <table className="w-full text-sm text-left border-collapse">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200 font-bold">
                <tr>
                    <th className="px-3 py-3 w-8 text-center">
                        <input type="checkbox" onChange={selectAll} checked={selectedLocations.size > 0 && groupedData.filter(g=>g.id!=='unknown').length === selectedLocations.size} className="rounded text-indigo-600 cursor-pointer" />
                    </th>
                    <th className="px-2 py-3 w-8"></th>
                    <th className="px-4 py-3 min-w-[200px]">Localidad</th>
                    <th className="px-2 py-3 text-center min-w-[200px]">Salida (D/H)</th>
                    <th className="px-2 py-3 text-center min-w-[200px]">Llegada (D/H)</th>
                    <th className="px-2 py-3 text-center w-20">Días</th>
                    <th className="px-2 py-3 text-center w-20">% Liq.</th>
                    <th className="px-4 py-3 text-right">Estado</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
                {groupedData.map(group => {
                    const data = inputs[group.id] || {};
                    const isExpanded = expandedGroups.has(group.id);
                    const isSelected = selectedLocations.has(group.id);
                    const isUnknown = group.id === 'unknown';
                    
                    return (
                        <React.Fragment key={group.id}>
                            <tr className={`transition-colors group/row ${isSelected ? 'bg-indigo-50/40' : 'hover:bg-slate-50 bg-white'} ${isUnknown ? 'opacity-60 bg-slate-50' : ''}`}>
                                <td className="px-3 py-3 text-center">
                                    <input 
                                        type="checkbox" 
                                        checked={isSelected} 
                                        onChange={() => toggleSelect(group.id)} 
                                        disabled={isUnknown}
                                        className="rounded text-indigo-600 cursor-pointer disabled:opacity-50" 
                                    />
                                </td>
                                <td className="px-2 py-3 text-center cursor-pointer" onClick={() => toggleExpand(group.id)}>
                                    <button className="text-slate-400 hover:text-indigo-600 transition-colors">
                                        {isExpanded ? <IconChevronDown size={16}/> : <IconChevronRight size={16}/>}
                                    </button>
                                </td>
                                <td className="px-4 py-3">
                                    <div className="font-bold text-slate-700 flex items-center gap-2">
                                        <IconMapPin size={14} className={isUnknown ? "text-red-400" : "text-slate-400"}/>
                                        {group.name}
                                    </div>
                                    <div className="flex items-center gap-1 text-xs text-slate-400 mt-1 pl-5">
                                        <IconUsers size={12}/> 
                                        <span className="font-medium">{group.count}</span> integrantes
                                    </div>
                                    {isUnknown && <div className="text-[10px] text-red-500 pl-5 mt-1 font-bold">Sin localidad asignada</div>}
                                </td>
                                
                                {/* SALIDA */}
                                <td className="px-2 py-3">
                                    <div className="flex gap-2 items-center justify-center">
                                        <DateInput 
                                            value={data.fecha_salida} 
                                            onChange={(v) => handleInputChange(group.id, 'fecha_salida', v)}
                                            className="w-28 bg-transparent border border-slate-200 hover:border-indigo-400 focus:border-indigo-500 rounded text-xs text-center p-1"
                                        />
                                        <TimeInput 
                                            value={data.hora_salida} 
                                            onChange={(v) => handleInputChange(group.id, 'hora_salida', v)}
                                            className="w-16 bg-transparent border border-slate-200 hover:border-indigo-400 focus:border-indigo-500 rounded text-xs text-center p-1"
                                        />
                                    </div>
                                </td>

                                {/* LLEGADA */}
                                <td className="px-2 py-3">
                                    <div className="flex gap-2 items-center justify-center">
                                        <DateInput 
                                            value={data.fecha_llegada} 
                                            onChange={(v) => handleInputChange(group.id, 'fecha_llegada', v)}
                                            className="w-28 bg-transparent border border-slate-200 hover:border-indigo-400 focus:border-indigo-500 rounded text-xs text-center p-1"
                                        />
                                        <TimeInput 
                                            value={data.hora_llegada} 
                                            onChange={(v) => handleInputChange(group.id, 'hora_llegada', v)}
                                            className="w-16 bg-transparent border border-slate-200 hover:border-indigo-400 focus:border-indigo-500 rounded text-xs text-center p-1"
                                        />
                                    </div>
                                </td>

                                {/* DÍAS */}
                                <td className="px-2 py-3 text-center">
                                    <input 
                                        type="number" 
                                        disabled={isUnknown}
                                        className="w-12 p-1.5 border border-indigo-200 bg-indigo-50 rounded text-center text-indigo-700 font-bold outline-none focus:ring-1 focus:ring-indigo-500 text-xs"
                                        value={data.dias_computables || 0}
                                        onChange={(e) => handleInputChange(group.id, 'dias_computables', e.target.value)}
                                    />
                                </td>

                                {/* PORCENTAJE */}
                                <td className="px-2 py-3 text-center">
                                    <select 
                                        disabled={isUnknown}
                                        className="w-16 p-1 border border-slate-200 rounded text-xs text-center outline-none focus:border-indigo-500 bg-transparent"
                                        value={data.porcentaje_liquidacion || 100}
                                        onChange={(e) => handleInputChange(group.id, 'porcentaje_liquidacion', e.target.value)}
                                    >
                                        <option value="100">100%</option>
                                        <option value="80">80%</option>
                                        <option value="0">0%</option>
                                    </select>
                                </td>

                                {/* ESTADO */}
                                <td className="px-4 py-3 text-right">
                                    <div className="flex items-center justify-end">
                                        {!isUnknown && <IconCheck size={14} className="text-green-500 opacity-50"/>}
                                    </div>
                                </td>
                            </tr>
                            
                            {/* DETALLE EXPANDIDO */}
                            {isExpanded && (
                                <tr className="bg-slate-50/50">
                                    <td colSpan="8" className="px-12 py-4 border-b border-slate-100 shadow-inner">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                            {group.people.map(p => (
                                                <div key={p.id} className={`flex items-center gap-2 p-2 rounded border ${p.hasViatico ? 'bg-amber-50 border-amber-200 opacity-60' : 'bg-white border-slate-200'}`}>
                                                    <div className={`w-2 h-2 rounded-full ${p.hasViatico ? 'bg-amber-400' : 'bg-green-400'}`}></div>
                                                    <div className="overflow-hidden">
                                                        <div className="text-xs font-bold text-slate-700 truncate">{p.apellido}, {p.nombre}</div>
                                                        <div className="text-[10px] text-slate-400 truncate">{p.rol_gira || p.rol}</div>
                                                    </div>
                                                    {p.hasViatico && (
                                                        <div className="ml-auto text-[9px] font-bold text-amber-600 uppercase bg-amber-100 px-1 rounded">Ya en tabla</div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </React.Fragment>
                    );
                })}
            </tbody>
        </table>
        {groupedData.length === 0 && (
            <div className="p-8 text-center text-slate-400 flex flex-col items-center gap-2">
                <IconAlertCircle size={24}/>
                <span>No se encontró información de localidades en el padrón.</span>
            </div>
        )}
      </div>
    </div>
  );
}