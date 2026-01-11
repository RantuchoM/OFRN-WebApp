import React, { useMemo, useState } from "react";
import { IconBus, IconCheck, IconAlertTriangle, IconClock, IconChevronDown, IconChevronUp, IconUsers } from "../../../components/ui/Icons";

const formatDateVisual = (dateStr) => {
    if (!dateStr) return "";
    const [y, m, d] = dateStr.split("-");
    return `${d}-${m}-${y}`;
};

// Sub-componente para manejar el estado de colapso individualmente
const LocationGroupItem = ({ group }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm transition-all hover:shadow-md">
            {/* ENCABEZADO (DATOS DE LA LOCALIDAD) */}
            <div 
                className="p-4 flex items-center justify-between cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex flex-col gap-1">
                    <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                        {group.name}
                        <span className="text-[10px] font-normal text-slate-500 bg-white border px-1.5 rounded-full flex items-center gap-1">
                            <IconUsers size={10} /> {group.people.length}
                        </span>
                    </h3>
                    
                    {/* DATOS LOGÍSTICOS DEL GRUPO */}
                    {group.headerInfo ? (
                        <div className="text-xs text-indigo-700 font-medium flex items-center gap-2">
                            <span className="bg-indigo-100 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide">Salida Oficial</span>
                            <span className="flex items-center gap-1"><IconClock size={12}/> {group.headerInfo.hora} hs</span>
                            <span className="text-indigo-300">|</span>
                            <span>{group.headerInfo.fecha}</span>
                            <span className="text-indigo-300">|</span>
                            <span className="flex items-center gap-1"><IconBus size={12}/> {group.headerInfo.transporte}</span>
                        </div>
                    ) : (
                        <div className="text-xs text-slate-400 italic flex items-center gap-1">
                            <IconAlertTriangle size={12} /> Sin regla logística definida para la localidad
                        </div>
                    )}
                </div>

                <div className="text-slate-400">
                    {isExpanded ? <IconChevronUp size={20} /> : <IconChevronDown size={20} />}
                </div>
            </div>

            {/* LISTA DE PERSONAS (DESPLEGABLE) */}
            {isExpanded && (
                <div className="border-t border-slate-100 bg-white p-3">
                    <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                        {group.people.map(p => {
                            // Detectar si difiere de la regla oficial (Excepción)
                            const isDifferent = group.headerInfo && p.travelData && (
                                p.travelData.hora_salida?.slice(0,5) !== group.headerInfo.hora ||
                                !p.travelData.transporte_salida.includes(group.headerInfo.transporte.split(' ')[0])
                            );

                            return (
                                <li key={p.id} className={`text-xs p-2 rounded flex items-center gap-2 ${isDifferent ? 'bg-amber-50 border border-amber-100 text-amber-800' : 'text-slate-600 hover:bg-slate-50'}`}>
                                    <div className={`w-1.5 h-1.5 rounded-full ${isDifferent ? 'bg-amber-500' : 'bg-indigo-400'}`}></div>
                                    <span className="truncate" title={`${p.apellido}, ${p.nombre}`}>
                                        {p.apellido}, {p.nombre}
                                    </span>
                                    {isDifferent && (
                                        <span className="ml-auto text-[9px] font-bold bg-white px-1 rounded border border-amber-200" title="Logística Diferente">DIF</span>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                    {group.people.length === 0 && <div className="text-xs text-slate-300 italic text-center">Sin pasajeros asignados.</div>}
                </div>
            )}
        </div>
    );
};

export default function DestaquesLocationPanel({ 
    roster, 
    configs, 
    existingViaticosIds,
    logisticsMap,
    routeRules, 
    transportesList 
}) {
    
    // Mapa auxiliar de transportes por ID
    const transportMap = useMemo(() => {
        const map = {};
        transportesList?.forEach(t => map[t.id] = t);
        return map;
    }, [transportesList]);

    const groupedData = useMemo(() => {
        const groups = {};
        
        roster.forEach(person => {
            const locId = person.id_localidad || person.localidades?.id || 'unknown';
            const locName = person.localidades?.localidad || 'Sin Localidad';
            
            if(!groups[locId]) {
                // Buscamos regla de localidad en routeRules
                const locRule = routeRules?.find(r => 
                    r.alcance === 'Localidad' && 
                    String(r.id_localidad) === String(locId) && 
                    r.evento_subida // Usamos la subida como referencia principal
                );

                let headerInfo = null;
                if (locRule && locRule.evento_subida) {
                    const evt = locRule.evento_subida;
                    const bus = transportMap[locRule.id_transporte_fisico];
                    // Construcción robusta del nombre
                    const tNombre = bus?.nombre || "Transporte";
                    const tDetalle = bus?.detalle ? `(${bus.detalle})` : "";
                    const busName = `${tNombre} ${tDetalle}`.trim();

                    headerInfo = {
                        hora: evt.hora_inicio ? evt.hora_inicio.slice(0,5) : "??:??",
                        fecha: formatDateVisual(evt.fecha),
                        transporte: busName
                    };
                }

                groups[locId] = { 
                    id: locId, 
                    name: locName, 
                    headerInfo, 
                    people: [] 
                };
            }
            
            const travelData = logisticsMap?.[person.id];
            const isTravelling = !!travelData;
            const hasViatico = existingViaticosIds.includes(person.id);
            
            if (isTravelling || hasViatico) {
                groups[locId].people.push({
                    ...person,
                    travelData,
                    hasViatico
                });
            }
        });

        return Object.values(groups).sort((a,b) => b.people.length - a.people.length);
    }, [roster, logisticsMap, existingViaticosIds, routeRules, transportMap]);

    return (
        <div className="space-y-4">
            {groupedData.map(group => (
                <LocationGroupItem key={group.id} group={group} />
            ))}
            
            {groupedData.length === 0 && (
                <div className="text-center text-slate-400 py-8 border-2 border-dashed border-slate-200 rounded-lg">
                    No se detectaron pasajeros viajando en la logística actual.
                </div>
            )}
        </div>
    );
}