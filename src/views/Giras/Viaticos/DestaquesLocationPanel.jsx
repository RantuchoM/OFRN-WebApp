import React, { useMemo, useState } from "react";
import { 
    IconBus, IconClock, IconAlertTriangle, IconChevronDown, IconChevronUp, 
    IconUsers, IconHistory, IconEye, IconEyeOff, IconCheck, IconSettings, 
    IconX, IconCalculator, IconCar
} from "../../../components/ui/Icons";
import LocationBulkPanel from "./LocationBulkPanel"; 

// --- UTILIDADES ---
const formatDateVisual = (dateStr) => {
    if (!dateStr) return "-";
    const [y, m, d] = dateStr.split("-");
    return `${d}-${m}-${y}`;
};

const formatCurrency = (val) => {
    if (val === null || val === undefined || val === "") return "$ 0";
    return "$ " + Number(val).toLocaleString("es-AR");
};

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
    return (Math.max(0, diffDays - 1) + getDepartureFactor(hSal || "12:00") + getArrivalFactor(hLleg || "12:00"));
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

// --- CONFIGURACIÓN DE COLUMNAS ---
const MASSIVE_COLS = [
    { label: "Movilidad", exp: "gastos_movilidad", ren: "rendicion_transporte_otros" },
    { label: "Combustible", exp: "gasto_combustible", ren: "rendicion_gasto_combustible" },
    { label: "Alojamiento", exp: "gasto_alojamiento", ren: "rendicion_gasto_alojamiento" },
    { label: "Capacit.", exp: "gastos_capacit", ren: "rendicion_gastos_capacit" },
    { label: "Mov. Otros", exp: "gastos_movil_otros", ren: "rendicion_gastos_movil_otros" },
    { label: "Otros", exp: "gasto_otros", ren: "rendicion_gasto_otros" },
];

// --- COMPONENTE: INPUT MONEDA ---
const CurrencyInput = ({ value, onCommit, className, placeholder, readOnly = false }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [localValue, setLocalValue] = useState("");

    const handleFocus = (e) => {
        if (readOnly) return;
        setIsEditing(true);
        const rawVal = (value === 0 || value === "0" || value === null) ? "" : String(value);
        setLocalValue(rawVal);
        e.target.select();
    };

    const handleBlur = () => {
        setIsEditing(false);
        const finalVal = localValue === "" ? 0 : parseFloat(localValue);
        if (isNaN(finalVal)) {
            onCommit(0);
        } else if (finalVal !== parseFloat(value || 0)) {
            onCommit(finalVal);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') e.target.blur();
    };

    if (readOnly) {
        return <div className={`${className} cursor-default truncate flex items-center justify-end`}>{formatCurrency(value)}</div>;
    }

    return (
        <input
            type={isEditing ? "number" : "text"}
            className={className}
            value={isEditing ? localValue : formatCurrency(value)}
            onChange={(e) => setLocalValue(e.target.value)}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            placeholder={placeholder || "$ 0"}
        />
    );
};

const getInputClass = (locationId, field, feedback, baseClass = "") => {
    const key = `${locationId}-${field}`;
    if (feedback?.locUpdatingFields?.has(key)) return `bg-amber-100 text-amber-900 border-amber-300 ${baseClass}`;
    if (feedback?.locErrorFields?.has(key)) return `bg-red-100 text-red-900 border-red-300 font-bold ${baseClass}`;
    if (feedback?.locSuccessFields?.has(key)) return `bg-green-200 text-green-900 border-green-400 font-medium ${baseClass}`;
    return `${baseClass} hover:border-slate-300 focus:border-indigo-500`;
};

// --- COMPONENTE: CONFIGURACIÓN VIÁT/REND (HORIZONTAL) ---
const LiveMassiveValuesForm = ({ locationId, config = {}, globalConfig, logisticsInfo, onUpdate, feedback, onClose }) => {
    
    const safeConfig = config || {};

    const handleCommit = (field, value) => {
        onUpdate(locationId, { [field]: value });
    };

    // --- CÁLCULOS DETALLADOS DE VIÁTICO ---
    const dias = logisticsInfo?.dias || safeConfig.backup_dias_computables || 0;
    const base = parseFloat(globalConfig?.valor_diario_base || 0);
    const factorTempConfig = parseFloat(globalConfig?.factor_temporada || 0);
    const hasSeasonality = factorTempConfig > 0;
    const factorTemp = 1 + factorTempConfig; 
    
    const porcentajeGlobal = globalConfig?.porcentaje_destaques !== undefined ? parseFloat(globalConfig.porcentaje_destaques) : 100;
    
    const valDiarioFull = base * factorTemp; 
    const valDiarioAplicado = Math.round(valDiarioFull * (porcentajeGlobal / 100));
    
    const anticipoViaticoTotal = Math.round(valDiarioAplicado * dias);

    let totalGastosEst = 0;
    let totalGastosRen = 0;
    MASSIVE_COLS.forEach(col => {
        totalGastosEst += parseFloat(safeConfig[col.exp] || 0);
        totalGastosRen += parseFloat(safeConfig[col.ren] || 0);
    });

    const granTotalEst = totalGastosEst + anticipoViaticoTotal;
    const granTotalRen = totalGastosRen + (safeConfig.rendicion_viatico_monto || 0);
    const diffFinal = granTotalEst - granTotalRen;

    const StackedCell = ({ expKey, renKey, isReadOnlyExp = false, forceExpValue = null }) => {
        const estVal = forceExpValue !== null ? forceExpValue : safeConfig[expKey];
        const renVal = safeConfig[renKey];
        const diff = (parseFloat(estVal || 0) - parseFloat(renVal || 0));

        return (
            <div className="flex flex-col gap-1 justify-center h-full py-1 min-w-[90px]">
                <CurrencyInput 
                    value={estVal}
                    readOnly={isReadOnlyExp}
                    onCommit={(val) => !isReadOnlyExp && handleCommit(expKey, val)}
                    className={`w-full text-right text-xs font-bold outline-none border-b rounded-sm px-1 py-0.5 transition-colors ${getInputClass(locationId, expKey, feedback, "bg-orange-50 text-orange-900")}`}
                />
                <CurrencyInput 
                    value={renVal}
                    onCommit={(val) => handleCommit(renKey, val)}
                    className={`w-full text-right text-xs font-bold outline-none border-b rounded-sm px-1 py-0.5 transition-colors ${getInputClass(locationId, renKey, feedback, "bg-emerald-50 text-emerald-900")}`}
                />
                <div className={`text-right text-[10px] border border-slate-200 bg-white px-1 rounded-sm shadow-sm ${diff < 0 ? 'text-red-600 font-black' : 'text-slate-500 font-bold'}`}>
                    {diff !== 0 ? formatCurrency(diff) : "-"}
                </div>
            </div>
        );
    };

    return (
        <div className="bg-slate-50 border-t border-b border-slate-200 p-3 animate-in slide-in-from-top-2 shadow-inner relative rounded-b-lg">
            <button onClick={onClose} className="absolute top-2 right-2 p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-full transition-colors" title="Cerrar">
                <IconX size={16} />
            </button>

            {/* HEADER LOGÍSTICO */}
            <div className="flex flex-wrap items-center gap-4 mb-3 text-xs">
                <div className="flex items-center gap-2 text-indigo-800 mr-2">
                    <IconSettings size={16} />
                    <h4 className="text-sm font-bold uppercase tracking-wide">Configuración</h4>
                </div>
                
                <div className="flex items-center gap-4 bg-white p-2 rounded border border-slate-200 shadow-sm">
                    <div className="flex flex-col border-r border-slate-100 pr-3 mr-1">
                        <span className="text-[9px] text-slate-400 font-bold uppercase">Logística</span>
                        <div className="flex gap-2">
                            <span className="font-medium text-slate-700">{logisticsInfo?.fechaSalida || '-'}</span>
                            <span className="text-slate-300">|</span>
                            <span className="font-medium text-slate-700">{logisticsInfo?.fechaLlegada || '-'}</span>
                        </div>
                    </div>
                    
                    <div className="flex flex-col border-r border-slate-100 pr-3 mr-1">
                        <span className="text-[9px] text-slate-400 font-bold uppercase">Días</span>
                        <span className="font-bold text-indigo-600 text-lg leading-none">{dias}</span>
                    </div>

                    <div className="flex gap-4 items-center border-r border-slate-100 pr-3 mr-1">
                        <div className="flex flex-col items-center">
                            <span className="text-[8px] text-slate-400 font-bold uppercase">Base</span>
                            <span className="font-medium text-slate-600">${base}</span>
                        </div>
                        <div className="flex flex-col items-center">
                            <span className="text-[8px] text-slate-400 font-bold uppercase">Temp (+30%)</span>
                            {hasSeasonality ? 
                                <IconCheck size={12} className="text-emerald-500" strokeWidth={4}/> : 
                                <span className="text-slate-300 font-bold text-[10px]">-</span>
                            }
                        </div>
                        <div className="flex flex-col items-center">
                            <span className="text-[8px] text-slate-400 font-bold uppercase">% Liq</span>
                            <span className="font-bold text-indigo-600">{porcentajeGlobal}%</span>
                        </div>
                        <div className="flex flex-col items-center bg-orange-50 px-2 py-0.5 rounded border border-orange-100">
                            <span className="text-[8px] text-orange-400 font-bold uppercase">Valor Diario</span>
                            <span className="font-bold text-orange-700">{formatCurrency(valDiarioAplicado)}</span>
                        </div>
                    </div>

                    <div className="flex flex-col">
                        <span className="text-[9px] text-slate-400 font-bold uppercase">Total Anticipo</span>
                        <span className="font-bold text-slate-800 text-lg leading-none">{formatCurrency(anticipoViaticoTotal)}</span>
                    </div>
                </div>
            </div>

            {/* FILA DE LOGÍSTICA FÍSICA */}
            <div className="mb-3 bg-white p-2 rounded border border-slate-200 shadow-sm flex flex-wrap items-center gap-4 text-xs">
                <div className="font-bold text-indigo-800 uppercase text-[10px] flex items-center gap-1">
                    <IconBus size={12} /> Logística Física:
                </div>
                
                <div className="flex items-center gap-2 border-r border-slate-100 pr-3">
                    <label className="flex items-center gap-1 cursor-pointer">
                        <input type="checkbox" checked={safeConfig.check_aereo || false} onChange={e => handleCommit('check_aereo', e.target.checked)} className="rounded text-indigo-600"/>
                        Aéreo
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer">
                        <input type="checkbox" checked={safeConfig.check_terrestre || false} onChange={e => handleCommit('check_terrestre', e.target.checked)} className="rounded text-indigo-600"/>
                        Terr.
                    </label>
                </div>

                <div className="flex items-center gap-2 border-r border-slate-100 pr-3">
                    <label className="flex items-center gap-1 cursor-pointer font-bold text-slate-600">
                        <input type="checkbox" checked={safeConfig.check_patente_oficial || false} onChange={e => handleCommit('check_patente_oficial', e.target.checked)} className="rounded text-indigo-600"/>
                        OFICIAL
                    </label>
                    <input 
                        type="text" 
                        placeholder="Patente"
                        defaultValue={safeConfig.patente_oficial || ''}
                        onBlur={e => { if(e.target.value !== (safeConfig.patente_oficial || "")) handleCommit('patente_oficial', e.target.value) }}
                        className={`bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 w-20 outline-none uppercase text-xs focus:ring-1 focus:ring-indigo-500 ${getInputClass(locationId, 'patente_oficial', feedback)}`}
                    />
                </div>

                <div className="flex items-center gap-2 border-r border-slate-100 pr-3">
                    <label className="flex items-center gap-1 cursor-pointer text-slate-600">
                        <input type="checkbox" checked={safeConfig.check_patente_particular || false} onChange={e => handleCommit('check_patente_particular', e.target.checked)} className="rounded text-indigo-600"/>
                        Particular
                    </label>
                    <input 
                        type="text" 
                        placeholder="Patente"
                        defaultValue={safeConfig.patente_particular || ''}
                        onBlur={e => { if(e.target.value !== (safeConfig.patente_particular || "")) handleCommit('patente_particular', e.target.value) }}
                        className={`bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 w-20 outline-none uppercase text-xs focus:ring-1 focus:ring-indigo-500 ${getInputClass(locationId, 'patente_particular', feedback)}`}
                    />
                </div>

                <div className="flex items-center gap-2 flex-1">
                    <label className="flex items-center gap-1 cursor-pointer text-slate-600">
                        <input type="checkbox" checked={safeConfig.check_otros || false} onChange={e => handleCommit('check_otros', e.target.checked)} className="rounded text-indigo-600"/>
                        Otros
                    </label>
                    <input 
                        type="text" 
                        defaultValue={safeConfig.transporte_otros || ''}
                        onBlur={e => { if(e.target.value !== (safeConfig.transporte_otros || "")) handleCommit('transporte_otros', e.target.value) }}
                        placeholder="Detalle (Combi, etc)"
                        className={`bg-white border border-slate-200 rounded px-2 py-0.5 text-xs w-full outline-none focus:ring-1 focus:ring-indigo-500 ${getInputClass(locationId, 'transporte_otros', feedback)}`}
                    />
                </div>
            </div>

            {/* TABLA HORIZONTAL */}
            <div className="overflow-x-auto border border-slate-200 rounded-lg bg-white">
                <table className="w-full text-xs border-separate border-spacing-0">
                    <thead>
                        <tr className="bg-slate-100 text-[10px] uppercase text-slate-500">
                            <th className="px-2 py-2 text-right font-bold w-28 border-b border-r border-slate-200 bg-indigo-50 text-indigo-800">
                                Viático Personal
                            </th>
                            {MASSIVE_COLS.map((col, i) => (
                                <th key={i} className="px-2 py-2 text-right font-medium min-w-[100px] border-b border-slate-200">
                                    {col.label}
                                </th>
                            ))}
                            <th className="px-2 py-2 text-right font-bold w-28 bg-slate-800 text-white border-b border-slate-900">
                                TOTAL FINAL
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr className="bg-white">
                            <td className="px-2 py-1 border-r border-slate-100 bg-indigo-50/10">
                                <StackedCell 
                                    expKey="viatico_calculado_dummy" 
                                    renKey="rendicion_viatico_monto"
                                    isReadOnlyExp={true}
                                    forceExpValue={anticipoViaticoTotal}
                                />
                            </td>
                            {MASSIVE_COLS.map((col, i) => (
                                <td key={i} className="px-2 py-1 border-r border-slate-100 last:border-r-0">
                                    <StackedCell expKey={col.exp} renKey={col.ren} />
                                </td>
                            ))}
                            <td className="px-2 py-1 bg-slate-50 border-l border-slate-200">
                                <div className="flex flex-col gap-1 justify-center h-full py-1">
                                    <div className="text-right text-xs font-bold px-1 py-0.5 bg-orange-100 text-orange-900 rounded-sm">
                                        {formatCurrency(granTotalEst)}
                                    </div>
                                    <div className="text-right text-xs font-bold px-1 py-0.5 bg-emerald-100 text-emerald-900 rounded-sm">
                                        {formatCurrency(granTotalRen)}
                                    </div>
                                    <div className={`text-right text-xs border border-slate-300 bg-white px-1 rounded-sm font-black ${diffFinal < 0 ? 'text-red-600' : 'text-slate-800'}`}>
                                        {formatCurrency(diffFinal)}
                                    </div>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// --- COMPONENTE: LOCATION GROUP ITEM ---
const LocationGroupItem = ({ group, isSelected, onToggleSelect, locationConfig, showBackup, onUpdateConfig, feedback, globalConfig }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isConfigOpen, setIsConfigOpen] = useState(false);

    const hasBackup = !!locationConfig?.fecha_ultima_exportacion;
    const exportedIds = locationConfig?.ids_exportados_viatico || [];
    
    const diffFechaSal = hasBackup && areDifferentDates(group.headerInfo?.fecha, locationConfig?.backup_fecha_salida);
    const diffHoraSal = hasBackup && areDifferentTimes(group.headerInfo?.hora, locationConfig?.backup_hora_salida);
    const diffFechaLleg = hasBackup && areDifferentDates(group.headerInfo?.fecha_llegada, locationConfig?.backup_fecha_llegada);
    const diffHoraLleg = hasBackup && areDifferentTimes(group.headerInfo?.hora_llegada, locationConfig?.backup_hora_llegada);
    const isChanged = diffFechaSal || diffHoraSal || diffFechaLleg || diffHoraLleg;

    // --- CAMBIO DE COLOR DE ALERTA: CYAN (INFO/UPDATED) ---
    const containerClass = isChanged 
        ? 'border-cyan-400 ring-1 ring-cyan-200 bg-cyan-50/30' 
        : (isSelected ? 'border-indigo-500 ring-1 ring-indigo-200 bg-indigo-50/10' : 'border-slate-200');
    
    const personWithTravel = group.people.find(p => p.travelData);
    const calculatedDays = personWithTravel ? calculateDaysDiff(
        personWithTravel.travelData.fecha_salida, 
        personWithTravel.travelData.hora_salida, 
        personWithTravel.travelData.fecha_llegada, 
        personWithTravel.travelData.hora_llegada
    ) : 0;

    const logisticsInfo = {
        fechaSalida: group.headerInfo?.fecha,
        horaSalida: group.headerInfo?.hora,
        fechaLlegada: group.headerInfo?.fecha_llegada,
        horaLlegada: group.headerInfo?.hora_llegada,
        dias: calculatedDays || locationConfig?.backup_dias_computables || 0
    };

    const countIndividuals = group.people.filter(p => p.hasIndividual).length;
    const countExported = group.people.filter(p => !p.hasIndividual && exportedIds.includes(Number(p.id))).length;
    const countPending = group.people.length - countIndividuals - countExported;

    return (
        <div className={`border rounded-lg overflow-hidden shadow-sm transition-all ${containerClass}`}>
            <div className={`p-3 flex items-center gap-3 cursor-pointer transition-colors ${isChanged ? 'bg-cyan-50 hover:bg-cyan-100' : 'bg-white hover:bg-slate-50'}`} onClick={() => setIsExpanded(!isExpanded)}>
                
                {/* CHECKBOX SIEMPRE ACTIVO */}
                <div className="relative flex items-center justify-center -ml-1 h-6 w-6">
                    <div onClick={(e) => { e.stopPropagation(); onToggleSelect(group.id); }} className="flex items-center justify-center hover:bg-black/5 rounded-full transition-colors h-6 w-6 cursor-pointer">
                        <input type="checkbox" checked={isSelected} onChange={() => {}} className={`w-4 h-4 rounded border-gray-300 focus:ring-indigo-500 cursor-pointer ${isSelected ? 'accent-indigo-600' : ''}`} />
                    </div>
                    {countPending === 0 && countExported > 0 && !isSelected && (
                        <div className="absolute -top-1 -right-1 text-green-500 bg-white rounded-full"><IconCheck size={12} strokeWidth={4} /></div>
                    )}
                </div>

                <div className="flex-1 flex flex-col gap-1 overflow-hidden">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 overflow-hidden">
                            <h3 className="font-bold text-slate-800 text-sm truncate flex items-center gap-2">
                                {group.name}
                                <span className="text-[9px] font-normal text-slate-500 bg-white border px-1.5 rounded-full flex items-center gap-1 shrink-0">
                                    <IconUsers size={9} /> {group.people.length}
                                </span>
                            </h3>
                            {isChanged && <span className="text-[8px] font-bold bg-cyan-500 text-white px-1.5 py-0.5 rounded animate-pulse">MODIFICADO</span>}
                        </div>
                        
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={(e) => { e.stopPropagation(); setIsConfigOpen(!isConfigOpen); setIsExpanded(true); }}
                                className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-bold border transition-all ${isConfigOpen 
                                    ? 'bg-indigo-100 text-indigo-700 border-indigo-200' 
                                    : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-300 hover:text-indigo-600'}`}
                            >
                                <IconSettings size={12} /> Config. Viát/Rend
                            </button>
                            <div className="text-slate-300">{isExpanded ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}</div>
                        </div>
                    </div>

                    {/* DATOS LOGÍSTICOS VISIBLES (CON LLEGADA) */}
                    {group.headerInfo ? (
                        <div className="flex flex-wrap items-center gap-2 text-[10px] mt-1">
                            <div className="flex items-center gap-1 bg-indigo-50/30 px-2 py-0.5 rounded text-indigo-900 border border-indigo-100">
                                <span className="font-bold uppercase tracking-wide">Salida:</span>
                                <span>{group.headerInfo.hora}hs</span>
                                <span className="opacity-50">|</span>
                                <span>{group.headerInfo.fecha}</span>
                            </div>
                            
                            {group.headerInfo.hora_llegada && (
                                <div className="flex items-center gap-1 bg-indigo-50/30 px-2 py-0.5 rounded text-indigo-900 border border-indigo-100">
                                    <span className="font-bold uppercase tracking-wide">Llegada:</span>
                                    <span>{group.headerInfo.hora_llegada}hs</span>
                                    {group.headerInfo.fecha_llegada && (
                                        <>
                                            <span className="opacity-50">|</span>
                                            <span>{group.headerInfo.fecha_llegada}</span>
                                        </>
                                    )}
                                </div>
                            )}

                            <div className="flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded text-slate-700 border border-slate-200 font-bold">
                                <IconClock size={10} />
                                <span>{logisticsInfo.dias} Días</span>
                            </div>

                            <div className="text-slate-400 flex items-center gap-1 truncate max-w-[150px]">
                                <IconBus size={10} /> {group.headerInfo.transporte}
                            </div>
                        </div>
                    ) : (
                        <div className="text-[10px] text-slate-400 italic">Sin logística definida</div>
                    )}
                </div>
            </div>

            {isConfigOpen && (
                <LiveMassiveValuesForm 
                    locationId={group.id}
                    config={locationConfig} 
                    globalConfig={globalConfig}
                    logisticsInfo={logisticsInfo}
                    onUpdate={onUpdateConfig}
                    feedback={feedback}
                    onClose={() => setIsConfigOpen(false)} 
                />
            )}

            {isExpanded && (
                <div className="border-t border-slate-100 bg-white p-2">
                    <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1.5">
                        {group.people.map(p => {
                            const isIndividual = p.hasIndividual;
                            const isExported = !isIndividual && exportedIds.includes(Number(p.id));

                            let cardClass = 'bg-slate-50 border-slate-100 text-slate-600';
                            
                            if (isIndividual) {
                                cardClass = 'bg-orange-50/70 border-orange-100 text-orange-800/70'; 
                            } else if (isExported) {
                                cardClass = 'bg-green-50/70 border-green-100 text-green-700'; 
                            } 

                            return (
                                <li key={p.id} className={`text-[10px] px-1.5 py-1 rounded border flex items-center gap-1.5 relative overflow-hidden ${cardClass}`}>
                                    <div className={`w-1 h-1 rounded-full shrink-0 bg-indigo-300`}></div>
                                    <span className="truncate flex-1 font-medium" title={`${p.apellido}, ${p.nombre}`}>{p.apellido}, {p.nombre?.charAt(0)}.</span>
                                    
                                    {isIndividual && <span className="text-[8px] font-bold text-orange-600">IND</span>}
                                    {isExported && <span className="text-green-600"><IconCheck size={10} strokeWidth={4} /></span>}
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default function DestaquesLocationPanel({ 
    roster, 
    configs, 
    onSaveLocationConfig, 
    onUpdateGlobalConfig, 
    feedback,
    existingViaticosIds, 
    logisticsMap, 
    routeRules, 
    transportesList, 
    onExportBatch, 
    isExporting, 
    exportStatus,
    globalConfig 
}) {
   const [selectedGroupIds, setSelectedGroupIds] = useState([]); 
    const [showBackup, setShowBackup] = useState(false);

    // Protección de Arrays
    const transportMap = useMemo(() => { 
        const map = {}; 
        (transportesList || []).forEach(t => map[t.id] = t); 
        return map; 
    }, [transportesList]);

    const groupedData = useMemo(() => {
        const groups = {};
        (roster || []).forEach(person => {
            if (person.estado_gira === 'ausente') return;
            const hasIndividual = existingViaticosIds.includes(person.id);
            if (person.condicion !== 'Estable') return;
            const normalize = (s) => (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            const role = normalize(person.rol_gira || person.rol);
            if (!role.includes("music") && !role.includes("solista")) return;

            const locNameRaw = person.localidades?.localidad || 'Sin Localidad';
            const locName = locNameRaw.trim(); 
            const currentLocId = person.id_localidad || 'unknown';

            // ... (Lógica de agrupación idéntica a la anterior) ...
            const getRuleForId = (lid) => routeRules?.find(r => r.alcance === 'Localidad' && String(r.id_localidad) === String(lid) && r.evento_subida);
            
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

            if(!groups[locName]) {
                const locRule = getRuleForId(currentLocId);
                const headerInfo = buildHeaderInfo(locRule);
                groups[locName] = { 
                    id: currentLocId, 
                    name: locName, 
                    headerInfo, 
                    people: [] 
                };
            } else {
                if (!groups[locName].headerInfo) {
                    const betterRule = getRuleForId(currentLocId);
                    if (betterRule) {
                        groups[locName].id = currentLocId;
                        groups[locName].headerInfo = buildHeaderInfo(betterRule);
                    }
                }
            }
            
            const travelData = logisticsMap?.[person.id];
            if (travelData) {
                const grp = groups[locName];
                if (grp.headerInfo && !grp.headerInfo.hora_llegada && travelData.fecha_llegada) {
                    grp.headerInfo.fecha_llegada = formatDateVisual(travelData.fecha_llegada);
                    grp.headerInfo.hora_llegada = travelData.hora_llegada?.slice(0,5);
                }
                grp.people.push({ ...person, travelData, hasIndividual });
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
            const validGroups = groupedData.filter(g => {
                const exportedIds = configs[g.id]?.ids_exportados_viatico || [];
                return g.people.some(p => !p.hasIndividual && !exportedIds.includes(Number(p.id)));
            }).map(g => g.id);
            setSelectedGroupIds(validGroups);
        }
    };

    // --- CÁLCULO DE ESTADÍSTICAS PARA EL PANEL BULK (CORREGIDO) ---
    const selectionStats = useMemo(() => {
        let totalPeople = 0;
        let pendingPeople = 0;
        
        selectedGroupIds.forEach(groupId => {
            const group = groupedData.find(g => g.id === groupId);
            if (group) {
                const exportedIds = configs[groupId]?.ids_exportados_viatico || [];
                // Solo consideramos "validos" a los que no tienen viático individual
                const validInGroup = group.people.filter(p => !p.hasIndividual);
                
                totalPeople += validInGroup.length;
                pendingPeople += validInGroup.filter(p => !exportedIds.includes(Number(p.id))).length;
            }
        });

        return { totalPeople, pendingPeople, groupCount: selectedGroupIds.length };
    }, [selectedGroupIds, groupedData, configs]);

    const handleBulkExport = (optionsFromChild) => {
        const { unificationMode, exportScope, ...cleanOptions } = optionsFromChild;
        const peopleToExport = [];
        const locationIds = [];

        selectedGroupIds.forEach(groupId => {
            const group = groupedData.find(g => g.id === groupId);
            if (group) {
                const exportedIds = configs[groupId]?.ids_exportados_viatico || [];
                
                // LÓGICA DE FILTRADO SEGÚN ALCANCE
                let validPeople = group.people.filter(p => !p.hasIndividual); // Base: no individuales
                
                if (exportScope === 'pending') {
                    validPeople = validPeople.filter(p => !exportedIds.includes(Number(p.id)));
                }
                // Si es 'all', usamos todos los validPeople (re-exportar)

                if (validPeople.length > 0) {
                    validPeople.forEach(p => {
                        peopleToExport.push({ 
                            ...p, 
                            _massConfigId: groupId,
                            _groupName: group.name, // NOMBRE DEL GRUPO IMPORTANTE
                            travelData: p.travelData 
                        });
                    });
                    locationIds.push(groupId);
                }
            }
        });

        if (peopleToExport.length === 0) {
            alert("No hay personas para exportar con el criterio seleccionado.");
            return;
        }
        
        // Pasamos el modo de unificación
        onExportBatch(peopleToExport, null, { ...cleanOptions, unificationMode }, locationIds);
    };

    const currentGlobalPct = globalConfig?.porcentaje_destaques !== undefined ? parseFloat(globalConfig.porcentaje_destaques) : 100;

    return (
        <div className="relative pb-20">
            {/* HEADER CON SELECTOR GLOBAL */}
            <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-3 bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                <div className="text-xs text-slate-500">
                    Mostrando <b>{groupedData.length}</b> localidades. 
                </div>
                
                <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Porcentaje Global:</span>
                    <div className="flex bg-slate-100 rounded p-1 gap-1">
                        {[100, 80, 0].map(pct => (
                            <button
                                key={pct}
                                onClick={() => onUpdateGlobalConfig('porcentaje_destaques', pct)}
                                className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                                    currentGlobalPct === pct 
                                    ? 'bg-indigo-600 text-white shadow-sm' 
                                    : 'text-slate-500 hover:bg-white hover:text-slate-700'
                                }`}
                            >
                                {pct}%
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button onClick={() => setShowBackup(!showBackup)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${showBackup ? 'bg-cyan-100 text-cyan-800 border-cyan-200 shadow-inner' : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-300 hover:text-indigo-600 shadow-sm'}`}>
                        <IconHistory size={14} /> Historial {showBackup ? <IconEye size={14}/> : <IconEyeOff size={14}/>}
                    </button>
                    {groupedData.length > 0 && (<button onClick={handleSelectAll} className="text-xs text-indigo-600 font-medium hover:underline ml-2">{selectedGroupIds.length > 0 ? 'Deseleccionar' : 'Sel. Pendientes'}</button>)}
                </div>
            </div>

            <div className={`space-y-3 transition-all duration-300 ${selectedGroupIds.length > 0 ? 'pr-[340px]' : ''}`}>
                {groupedData.map(group => (
                    <LocationGroupItem 
                        key={group.id} 
                        group={group} 
                        isSelected={selectedGroupIds.includes(group.id)}
                        onToggleSelect={handleToggleSelect}
                        locationConfig={configs[group.id]}
                        showBackup={showBackup}
                        onUpdateConfig={onSaveLocationConfig}
                        feedback={feedback}
                        globalConfig={globalConfig}
                    />
                ))}
            </div>

            {selectedGroupIds.length > 0 && (
                <div className="fixed inset-y-0 right-0 w-80 bg-white shadow-2xl z-[60] flex flex-col animate-in slide-in-from-right duration-300 border-l border-slate-200">
                    <button onClick={() => setSelectedGroupIds([])} className="absolute top-2 right-2 z-[70] bg-white/80 hover:bg-slate-100 text-slate-400 hover:text-red-500 rounded-full p-1.5 transition-colors shadow-sm border border-slate-100"><IconX size={16} /></button>
                    <div className="h-full w-full overflow-y-auto">
                        <LocationBulkPanel 
                            selectionStats={selectionStats} // <--- PASAMOS LAS STATS AQUÍ
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