import React, { useMemo, useState } from "react";
import { IconBus, IconClock, IconAlertTriangle, IconChevronDown, IconChevronUp, IconUsers, IconHistory, IconEye, IconEyeOff, IconCheck, IconMapPin } from "../../../components/ui/Icons";
import LocationBulkPanel from "./LocationBulkPanel"; 

const formatDateVisual = (dateStr) => {
    if (!dateStr) return "";
    const [y, m, d] = dateStr.split("-");
    return `${d}-${m}-${y}`;
};

const areDifferentDates = (visualDate, isoDate) => {
    if (!visualDate && !isoDate) return false;
    if (!visualDate || !isoDate) return true;
    const [d, m, y] = visualDate.split("-");
    const visualAsIso = `${y}-${m}-${d}`;
    return visualAsIso !== isoDate;
};

const areDifferentTimes = (shortTime, longTime) => {
    if (!shortTime && !longTime) return false;
    if (!shortTime || !longTime) return true;
    return shortTime.slice(0, 5) !== longTime.slice(0, 5);
};

const LocationGroupItem = ({ group, isSelected, onToggleSelect, locationConfig, showBackup }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const hasBackup = !!locationConfig?.fecha_ultima_exportacion;
    
    // Detectar cambios en SALIDA (Principal)
    const diffFechaSal = hasBackup && areDifferentDates(group.headerInfo?.fecha, locationConfig?.backup_fecha_salida);
    const diffHoraSal = hasBackup && areDifferentTimes(group.headerInfo?.hora, locationConfig?.backup_hora_salida);
    
    // Detectar cambios en LLEGADA (Secundario)
    const diffFechaLleg = hasBackup && areDifferentDates(group.headerInfo?.fecha_llegada, locationConfig?.backup_fecha_llegada);
    const diffHoraLleg = hasBackup && areDifferentTimes(group.headerInfo?.hora_llegada, locationConfig?.backup_hora_llegada);

    const isChanged = diffFechaSal || diffHoraSal || diffFechaLleg || diffHoraLleg;

    const containerClass = isChanged 
        ? 'border-amber-400 ring-1 ring-amber-200 bg-amber-50/30' 
        : (isSelected ? 'border-indigo-500 ring-1 ring-indigo-200 bg-indigo-50/10' : 'border-slate-200');
    
    const headerClass = isChanged 
        ? 'bg-amber-50 hover:bg-amber-100' 
        : 'bg-white hover:bg-slate-50';

    return (
        <div className={`border rounded-lg overflow-hidden shadow-sm transition-all ${containerClass}`}>
            <div className={`p-4 flex items-center gap-3 cursor-pointer transition-colors ${headerClass}`} onClick={() => setIsExpanded(!isExpanded)}>
                
                {/* CHECKBOX DE SELECCIÓN + BADGE */}
                <div className="relative flex items-center justify-center p-1 -ml-2 h-8 w-8">
                    <div onClick={(e) => { e.stopPropagation(); onToggleSelect(group.id); }} className="flex items-center justify-center hover:bg-black/5 rounded-full transition-colors h-8 w-8 cursor-pointer">
                        <input type="checkbox" checked={isSelected} onChange={() => {}} className={`w-4 h-4 rounded border-gray-300 focus:ring-indigo-500 cursor-pointer ${isSelected ? 'accent-indigo-600' : ''}`} />
                    </div>
                    {/* BADGE DE YA EXPORTADO */}
                    {hasBackup && (
                        <div className="absolute top-0 right-0" title="Localidad ya exportada previamente">
                            <div className="bg-green-100 text-green-600 rounded-full w-3 h-3 flex items-center justify-center border border-green-200 shadow-sm">
                                <IconCheck size={8} strokeWidth={4} />
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex-1 flex flex-col gap-2 overflow-hidden">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 overflow-hidden">
                            <h3 className="font-bold text-slate-800 text-base truncate flex items-center gap-2">
                                {group.name}
                                <span className="text-[10px] font-normal text-slate-500 bg-white border px-1.5 rounded-full flex items-center gap-1 shrink-0">
                                    <IconUsers size={10} /> {group.people.length}
                                </span>
                            </h3>
                            {isChanged && <span className="text-[9px] font-bold bg-amber-500 text-white px-2 py-0.5 rounded animate-pulse shadow-sm flex items-center gap-1"><IconAlertTriangle size={10} strokeWidth={3} /> MODIFICADO</span>}
                            {hasBackup && !isChanged && showBackup && <span className="text-[9px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded flex items-center gap-1"><IconCheck size={10} strokeWidth={3} /> SIN CAMBIOS</span>}
                        </div>
                        <div className="text-slate-400">{isExpanded ? <IconChevronUp size={20} /> : <IconChevronDown size={20} />}</div>
                    </div>

                    {/* DATOS LOGÍSTICOS (SALIDA Y LLEGADA) */}
                    <div className="flex flex-wrap items-center gap-4 text-xs">
                        {group.headerInfo ? (
                            <div className="flex flex-col sm:flex-row gap-2 w-full">
                                {/* Badge SALIDA */}
                                <div className="flex items-center gap-2 bg-white/60 px-2 py-1 rounded border border-slate-100 shadow-sm">
                                    <span className="text-[10px] font-bold uppercase tracking-wide text-indigo-700">Salida:</span>
                                    <span className={`flex items-center gap-1 ${diffHoraSal ? 'text-amber-700 font-bold bg-amber-100 px-1 rounded' : 'text-slate-700'}`}>
                                        <IconClock size={12}/> {group.headerInfo.hora} hs
                                    </span>
                                    <span className="text-slate-300">|</span>
                                    <span className={`${diffFechaSal ? 'text-amber-700 font-bold bg-amber-100 px-1 rounded' : 'text-slate-700'}`}>
                                        {group.headerInfo.fecha}
                                    </span>
                                    <span className="text-slate-300">|</span>
                                    <span className="flex items-center gap-1 text-slate-500 truncate max-w-[150px]" title={group.headerInfo.transporte}>
                                        <IconBus size={12}/> {group.headerInfo.transporte}
                                    </span>
                                </div>

                                {/* Badge LLEGADA */}
                                <div className="flex items-center gap-2 bg-white/60 px-2 py-1 rounded border border-slate-100 shadow-sm">
                                    <span className="text-[10px] font-bold uppercase tracking-wide text-indigo-700">Llegada:</span>
                                    {group.headerInfo.hora_llegada ? (
                                        <>
                                            <span className={`flex items-center gap-1 ${diffHoraLleg ? 'text-amber-700 font-bold bg-amber-100 px-1 rounded' : 'text-slate-700'}`}>
                                                <IconClock size={12}/> {group.headerInfo.hora_llegada} hs
                                            </span>
                                            <span className="text-slate-300">|</span>
                                            <span className={`${diffFechaLleg ? 'text-amber-700 font-bold bg-amber-100 px-1 rounded' : 'text-slate-700'}`}>
                                                {group.headerInfo.fecha_llegada}
                                            </span>
                                        </>
                                    ) : (
                                        <span className="text-slate-400 italic text-[10px]">Sin datos</span>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="text-xs text-slate-400 italic flex items-center gap-1"><IconAlertTriangle size={12} /> Sin regla logística definida</div>
                        )}
                    </div>

                    {/* BACKUP (Visible con Ojito) */}
                    {showBackup && hasBackup && (
                        <div className="flex items-center gap-2 animate-in slide-in-from-top-1 text-xs mt-1 bg-slate-50 p-2 rounded border border-slate-100">
                            <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500 flex items-center gap-1"><IconHistory size={10} /> Backup:</span>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                                <span>Sal: {formatDateVisual(locationConfig.backup_fecha_salida)} {locationConfig.backup_hora_salida?.slice(0,5)}</span>
                                <span>Lleg: {formatDateVisual(locationConfig.backup_fecha_llegada)} {locationConfig.backup_hora_llegada?.slice(0,5)}</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {isExpanded && (
                <div className="border-t border-slate-100 bg-white p-3">
                    <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                        {group.people.map(p => {
                            const isDifferent = group.headerInfo && p.travelData && (p.travelData.hora_salida?.slice(0,5) !== group.headerInfo.hora || !p.travelData.transporte_salida.includes(group.headerInfo.transporte.split(' ')[0]));
                            return (
                                <li key={p.id} className={`text-xs p-2 rounded flex items-center gap-2 border ${isDifferent ? 'bg-amber-50 border-amber-100 text-amber-900' : 'bg-slate-50 border-slate-100 text-slate-600'}`}>
                                    <div className={`w-1.5 h-1.5 rounded-full ${isDifferent ? 'bg-amber-500' : 'bg-indigo-400'}`}></div>
                                    <span className="truncate flex-1" title={`${p.apellido}, ${p.nombre}`}>{p.apellido}, {p.nombre}</span>
                                    {isDifferent && <span className="ml-auto text-[9px] font-bold bg-white px-1.5 py-0.5 rounded border border-amber-300 text-amber-600 cursor-help" title="Difiere de la regla grupal">DIF</span>}
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default function DestaquesLocationPanel({ roster, configs, globalConfig, existingViaticosIds, logisticsMap, routeRules, transportesList, onExportBatch, isExporting, exportStatus }) {
    const [selectedGroupIds, setSelectedGroupIds] = useState([]); 
    const [showBackup, setShowBackup] = useState(false);

    const transportMap = useMemo(() => { const map = {}; transportesList?.forEach(t => map[t.id] = t); return map; }, [transportesList]);

    // --- LOGICA DE AGRUPACIÓN (MODIFICADA PARA UNIR POR NOMBRE) ---
    const groupedData = useMemo(() => {
        const groups = {};
        
        roster.forEach(person => {
            if (person.estado_gira === 'ausente') return;
            if (existingViaticosIds.includes(person.id)) return;

            // --- FILTRO: Solo Estable + (Musico O Solista) ---
            if (person.condicion !== 'Estable') return;
            const normalize = (s) => (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            const role = normalize(person.rol_gira || person.rol);
            if (!role.includes("music") && !role.includes("solista")) return;
            // -------------------------------------------------

            // USAMOS EL NOMBRE COMO CLAVE (para unir duplicados de ID)
            const locNameRaw = person.localidades?.localidad || 'Sin Localidad';
            const locName = locNameRaw.trim(); 
            const currentLocId = person.id_localidad || 'unknown';

            // Función auxiliar para buscar regla por ID
            const getRuleForId = (lid) => routeRules?.find(r => r.alcance === 'Localidad' && String(r.id_localidad) === String(lid) && r.evento_subida);
            
            // Función auxiliar para construir el objeto headerInfo
            const buildHeaderInfo = (rule) => {
                if (!rule || !rule.evento_subida) return null;
                const evt = rule.evento_subida;
                const evtLlegada = rule.evento_bajada; 
                const bus = transportMap[rule.id_transporte_fisico];
                const tNombre = bus?.transportes?.nombre || bus?.nombre || "Transporte";
                const tDetalle = bus?.detalle ? ` - ${bus.detalle}` : ""; 
                return { 
                    hora: evt.hora_inicio ? evt.hora_inicio.slice(0,5) : "??:??", 
                    fecha: formatDateVisual(evt.fecha), 
                    hora_llegada: evtLlegada?.hora_inicio ? evtLlegada.hora_inicio.slice(0,5) : null,
                    fecha_llegada: evtLlegada?.fecha ? formatDateVisual(evtLlegada.fecha) : null,
                    transporte: `${tNombre}${tDetalle}`.trim() 
                };
            };

            // SI EL GRUPO (POR NOMBRE) NO EXISTE, LO CREAMOS
            if(!groups[locName]) {
                const locRule = getRuleForId(currentLocId);
                const headerInfo = buildHeaderInfo(locRule);
                
                // Guardamos el ID actual como "Representante" del grupo
                groups[locName] = { 
                    id: currentLocId, // Este ID se usará para buscar el Backup
                    name: locName, 
                    headerInfo, 
                    people: [] 
                };
            } else {
                // SI EL GRUPO YA EXISTE, VERIFICAMOS SI PODEMOS MEJORAR LA REGLA
                // Si el grupo actual NO tiene regla, pero la persona actual tiene un ID con regla,
                // actualizamos el grupo para usar el ID y la regla de esta persona.
                if (!groups[locName].headerInfo) {
                    const betterRule = getRuleForId(currentLocId);
                    if (betterRule) {
                        groups[locName].id = currentLocId; // Actualizamos ID representante
                        groups[locName].headerInfo = buildHeaderInfo(betterRule);
                    }
                }
            }
            
            // Agregar persona al grupo
            const travelData = logisticsMap?.[person.id];
            if (travelData) {
                const grp = groups[locName];
                // Parche visual de llegada si falta
                if (grp.headerInfo && !grp.headerInfo.hora_llegada && travelData.fecha_llegada) {
                    grp.headerInfo.fecha_llegada = formatDateVisual(travelData.fecha_llegada);
                    grp.headerInfo.hora_llegada = travelData.hora_llegada?.slice(0,5);
                }
                grp.people.push({ ...person, travelData });
            }
        });
        
        return Object.values(groups).sort((a,b) => b.people.length - a.people.length);
    }, [roster, logisticsMap, existingViaticosIds, routeRules, transportMap]);

    const handleToggleSelect = (id) => {
        setSelectedGroupIds(prev => {
            if (prev.includes(id)) return prev.filter(gId => gId !== id);
            return [...prev, id];
        });
    };

    const handleSelectAll = () => {
        if (selectedGroupIds.length === groupedData.length) {
            setSelectedGroupIds([]);
        } else {
            setSelectedGroupIds(groupedData.map(g => g.id));
        }
    };

    const handleBulkExport = (optionsFromChild) => {
        const finalFolderId = globalConfig?.link_drive || null;
        const { mergeLocations, ...cleanOptions } = optionsFromChild;

        if (mergeLocations) {
            const allPeople = [];
            const involvedLocationIds = [];
            selectedGroupIds.forEach(groupId => {
                const group = groupedData.find(g => g.id === groupId);
                if (group && group.people.length > 0) {
                    allPeople.push(...group.people);
                    involvedLocationIds.push(groupId);
                }
            });
            if (allPeople.length > 0) {
                onExportBatch(allPeople, finalFolderId, { ...cleanOptions, unifyFiles: true }, involvedLocationIds);
            }
        } else {
            selectedGroupIds.forEach(groupId => {
                 const group = groupedData.find(g => g.id === groupId);
                 if(group && group.people.length > 0) {
                     onExportBatch(group.people, finalFolderId, cleanOptions, groupId);
                 }
            });
        }
    };

    return (
        <div className="relative pb-20">
            <div className="flex justify-between items-center mb-4">
                <div className="text-xs text-slate-500">Mostrando <b>{groupedData.length}</b> localidades pendientes.</div>
                <div className="flex items-center gap-3">
                    <button onClick={() => setShowBackup(!showBackup)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${showBackup ? 'bg-amber-100 text-amber-800 border-amber-200 shadow-inner' : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-300 hover:text-indigo-600 shadow-sm'}`}>
                        <IconHistory size={14} /> Ver Última Export. {showBackup ? <IconEye size={14}/> : <IconEyeOff size={14}/>}
                    </button>
                    {groupedData.length > 0 && (<button onClick={handleSelectAll} className="text-xs text-indigo-600 font-medium hover:underline ml-2">{selectedGroupIds.length === groupedData.length ? 'Deseleccionar todos' : 'Seleccionar todos'}</button>)}
                </div>
            </div>

            <div className={`space-y-4 transition-all duration-300 ${selectedGroupIds.length > 0 ? 'pr-[340px]' : ''}`}>
                {groupedData.map(group => (
                    <LocationGroupItem 
                        key={group.id} group={group} 
                        isSelected={selectedGroupIds.includes(group.id)}
                        onToggleSelect={handleToggleSelect}
                        locationConfig={configs[group.id]}
                        showBackup={showBackup}
                    />
                ))}
                {groupedData.length === 0 && <div className="text-center text-slate-400 py-8 border-2 border-dashed border-slate-200 rounded-lg">No se detectaron pasajeros pendientes de destaque.</div>}
            </div>

            {selectedGroupIds.length > 0 && (
                <div className="fixed inset-y-0 right-0 w-80 bg-white shadow-2xl z-[60] flex flex-col animate-in slide-in-from-right duration-300 border-l border-slate-200">
                    <button onClick={() => setSelectedGroupIds([])} className="absolute top-2 right-2 z-[70] bg-white/80 hover:bg-slate-100 text-slate-400 hover:text-red-500 rounded-full p-1.5 transition-colors shadow-sm border border-slate-100"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
                    <div className="h-full w-full overflow-y-auto">
                        <LocationBulkPanel 
                            selectionSize={selectedGroupIds.length}
                            onClose={() => setSelectedGroupIds([])}
                            onExport={handleBulkExport} 
                            loading={isExporting}
                            isExporting={isExporting}
                            exportStatus={exportStatus}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}