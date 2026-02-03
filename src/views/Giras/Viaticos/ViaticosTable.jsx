import React, { useState, useEffect } from "react";
import {
  IconTrash,
  IconAlertTriangle,
  IconCheck,
  IconHistory,
} from "../../../components/ui/Icons";
import "./ViaticosSheet.css";

// --- HELPERS DE FORMATO ---
const formatDateShort = (dateStr) => {
  if (!dateStr) return "-";
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}`;
};

const formatTimeShort = (timeStr) => {
  if (!timeStr) return "-";
  return timeStr.slice(0, 5);
};

const formatTimestamp = (isoStr) => {
  if (!isoStr) return "-";
  const date = new Date(isoStr);
  return `${date.getDate()}/${date.getMonth() + 1} ${date.getHours()}:${String(date.getMinutes()).padStart(2, "0")}`;
};

const formatTransportName = (name) => {
  if (!name) return null;
  return name.length > 15 ? name.slice(0, 15) + "..." : name;
};

// Helper para detectar cambios (Backup vs Actual)
const isDiff = (valA, valB) => {
  const a = valA || "";
  const b = valB || "";
  const cleanA = a.length > 5 ? a.slice(0, 5) : a;
  const cleanB = b.length > 5 ? b.slice(0, 5) : b;
  return cleanA !== cleanB;
};

// --- COMPONENTE INPUT MONEDA INTELIGENTE (DISPLAY VS EDIT) ---
const CurrencyInput = ({ value, onCommit, className, placeholder, readOnly = false }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [localValue, setLocalValue] = useState("");

    // Formateador visual
    const formatDisplay = (val) => {
        if (val === null || val === undefined || val === "" || val === 0 || val === "0") return "";
        return Number(val).toLocaleString("es-AR");
    };

    const handleFocus = (e) => {
        if (readOnly) return;
        setIsEditing(true);
        // Al editar, mostramos el valor limpio. Si es 0, lo dejamos vacío para escribir fácil
        const rawVal = (value === 0 || value === "0" || value === null) ? "" : String(value);
        setLocalValue(rawVal);
        e.target.select(); // Seleccionar todo el texto
    };

    const handleBlur = () => {
        setIsEditing(false);
        // Si el usuario borró todo (""), asumimos 0 (null equivalent)
        const finalVal = localValue === "" ? 0 : parseFloat(localValue);
        
        if (isNaN(finalVal)) {
            onCommit(0); // Fallback seguridad
        } else if (finalVal !== parseFloat(value || 0)) {
            onCommit(finalVal);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') e.target.blur();
    };

    if (readOnly) {
        return (
            <div className={`${className} cursor-default`}>
                {formatDisplay(value) || "0"}
            </div>
        );
    }

    return (
        <input
            type={isEditing ? "number" : "text"} // Number en móvil, text para display
            className={className}
            value={isEditing ? localValue : formatDisplay(value)}
            onChange={(e) => setLocalValue(e.target.value)}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            placeholder={placeholder || "0"}
        />
    );
};

// --- CONFIGURACIÓN DE COLUMNAS FINANCIERAS ---
const FINANCIAL_COLS = [
  { label: "Movilidad", exp: "gastos_movilidad", ren: "rendicion_transporte_otros" },
  { label: "Combustible", exp: "gasto_combustible", ren: "rendicion_gasto_combustible" },
  { label: "Alojamiento", exp: "gasto_alojamiento", ren: "rendicion_gasto_alojamiento" },
  
  { label: "Capacit.", exp: "gastos_capacit", ren: "rendicion_gastos_capacit" },
  { label: "Mov. Otros", exp: "gastos_movil_otros", ren: "rendicion_gastos_movil_otros" },
  { label: "Otros", exp: "gasto_otros", ren: "rendicion_gasto_otros" },
];

export default function ViaticosTable({
  rows,
  selection,
  onSelectAll,
  onToggleSelection,
  onUpdateRow,
  onDeleteRow,
  showDatos = true,
  showAnticipo = true,
  showTransport,
  showExpenses, 
  showRendiciones, 
  updatingFields = new Set(),
  deletingRows = new Set(),
  errorFields = new Set(),
  successFields = new Set(),
  logisticsMap = {},
}) {
  const [showBackup, setShowBackup] = useState(false);

  const cellClass = "px-2 py-2 border-b border-slate-100";

  // --- GESTIÓN DE COLORES DE ESTADO (PRIORIDAD AL FEEDBACK BD) ---
  const getInputClass = (rowId, fieldName, defaultBgClass = "bg-transparent", defaultTextClass = "text-slate-700") => {
    const key = `${rowId}-${fieldName}`;
    
    // 1. Estados de Base de Datos (Prioridad Alta)
    if (updatingFields.has(key)) 
        return `bg-yellow-100 text-yellow-900 border-yellow-300 ring-1 ring-yellow-300 transition-colors duration-200`;
    
    if (errorFields.has(key)) 
        return `bg-red-100 text-red-900 border-red-300 ring-1 ring-red-300 font-bold transition-colors duration-200`;
    
    if (successFields.has(key)) 
        return `bg-green-200 text-green-900 border-green-400 ring-1 ring-green-400 font-medium transition-colors duration-1000`; 

    // 2. Estados de Diseño
    return `${defaultBgClass} ${defaultTextClass} border-transparent hover:border-slate-300 focus:border-indigo-500 transition-colors duration-300`;
  };

  // --- CÁLCULOS GLOBALES ---
  const totalAnticipo = rows.reduce((acc, r) => acc + (parseFloat(r.subtotal) || 0), 0);
  const totalGastos = rows.reduce((acc, r) => {
    let sum = 0;
    FINANCIAL_COLS.forEach(col => {
       sum += parseFloat(r[col.exp] || 0);
    });
    return acc + sum;
  }, 0);
  const granTotal = totalAnticipo + totalGastos;

  // --- COMPONENTE DE CELDA APILADA (GASTO / RENDICION / DIFERENCIA) ---
  const StackedFinancialCell = ({ row, colDef, isReadOnly = false, forceValue = null }) => {
    const fieldExp = colDef.exp;
    const fieldRen = colDef.ren;
    
    const estVal = forceValue !== null ? forceValue : row[fieldExp]; 
    const renVal = row[fieldRen]; 
    
    const numEst = parseFloat(estVal || 0);
    const numRen = parseFloat(renVal || 0);
    const diff = numEst - numRen;
    
    return (
      <div className="flex flex-col gap-1 justify-center h-full py-1">
        {/* FILA GASTO (NARANJA) */}
        {showExpenses && (
          <div className="relative">
             <CurrencyInput
                readOnly={isReadOnly}
                value={estVal}
                onCommit={(val) => !isReadOnly && onUpdateRow(row.id, fieldExp, val)}
                className={`w-full text-right text-xs font-bold outline-none border-b rounded-sm px-1 py-0.5 ${getInputClass(row.id, fieldExp, "bg-orange-50", "text-orange-900")}`}
                placeholder="0"
             />
          </div>
        )}
        
        {/* FILA RENDICIÓN (VERDE) */}
        {showRendiciones && (
          <div className="relative">
             <CurrencyInput
                value={renVal}
                onCommit={(val) => onUpdateRow(row.id, fieldRen, val)}
                className={`w-full text-right text-xs font-bold outline-none border-b rounded-sm px-1 py-0.5 ${getInputClass(row.id, fieldRen, "bg-emerald-50", "text-emerald-900")}`}
                placeholder="0"
             />
          </div>
        )}

        {/* FILA DIFERENCIA (CLARA Y VISIBLE) */}
        {showExpenses && showRendiciones && (
            <div className={`text-right text-xs border border-slate-200 bg-white px-1 rounded-sm shadow-sm ${diff < 0 ? 'text-red-600 font-black' : 'text-slate-500 font-bold'}`}>
                {diff !== 0 ? diff.toLocaleString("es-AR") : "-"}
            </div>
        )}
      </div>
    );
  };

  // --- CELDA DE TOTAL FINAL (3 FILAS) ---
  const TotalFinalCell = ({ row }) => {
      let totalEst = parseFloat(row.subtotal || 0);
      let totalRen = parseFloat(row.rendicion_viaticos || 0);
      
      FINANCIAL_COLS.forEach(c => {
          totalEst += parseFloat(row[c.exp] || 0);
          totalRen += parseFloat(row[c.ren] || 0);
      });
      
      const diff = totalEst - totalRen;

      return (
        <div className="flex flex-col gap-1 justify-center h-full py-1 px-1">
            {/* Total Estimado */}
            {showExpenses && (
                <div className="text-right text-xs font-bold px-1 py-0.5 bg-orange-100 text-orange-900 rounded-sm">
                    ${totalEst.toLocaleString("es-AR")}
                </div>
            )}
            {/* Total Rendido */}
            {showRendiciones && (
                <div className="text-right text-xs font-bold px-1 py-0.5 bg-emerald-100 text-emerald-900 rounded-sm">
                    ${totalRen.toLocaleString("es-AR")}
                </div>
            )}
            {/* Diferencia Final */}
            {showExpenses && showRendiciones && (
                <div className={`text-right text-xs border border-slate-300 bg-white px-1 rounded-sm font-black ${diff < 0 ? 'text-red-600' : 'text-slate-800'}`}>
                    ${diff.toLocaleString("es-AR")}
                </div>
            )}
        </div>
      );
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden flex flex-col h-full">
      {/* HEADER DE TOTALES */}
      <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 flex justify-between items-center sticky top-0 z-50">
        <div className="text-xs text-slate-500 font-medium flex items-center gap-4">
          <span>{rows.length} registros</span>
          <span className="text-slate-300">|</span>
          <span>Anticipo: <b>${totalAnticipo.toLocaleString("es-AR")}</b></span>
          <span>Gastos: <b>${totalGastos.toLocaleString("es-AR")}</b></span>
          <span className="text-slate-300">|</span>
          <span className="text-indigo-600">Total Est: <b>${granTotal.toLocaleString("es-AR")}</b></span>
        </div>
        <button
          onClick={() => setShowBackup(!showBackup)}
          className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold uppercase transition-colors ${showBackup ? "bg-amber-100 text-amber-800 border border-amber-200" : "bg-white text-slate-400 border border-slate-200 hover:text-slate-600"}`}
        >
          <IconHistory size={12} /> Backup {showBackup ? <IconCheck size={12} /> : null}
        </button>
      </div>

      <div className="relative overflow-x-auto min-h-[300px] flex-1">
        <div className="inline-block min-w-full align-middle">
          <table className="w-full text-sm text-left border-separate border-spacing-0">
            <thead className="text-slate-500 font-bold uppercase text-[10px]">
              <tr>
                {/* COLUMNAS FIJAS */}
                <th className="px-3 py-3 w-10 text-center sticky top-0 left-0 z-40 bg-slate-50 border-b border-r border-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                  <input
                    type="checkbox"
                    onChange={onSelectAll}
                    checked={selection.size === rows.length && rows.length > 0}
                    className="rounded text-indigo-600"
                  />
                </th>
                <th className="px-3 py-3 w-48 sticky top-0 left-[40px] z-40 bg-slate-50 border-b border-r border-slate-200 shadow-[4px_0_8px_-2px_rgba(0,0,0,0.1)]">
                  Integrante
                </th>

                {showDatos && (
                  <>
                    <th className="px-2 py-3 w-32 sticky top-0 z-30 bg-slate-50 border-b border-slate-200">Cargo</th>
                    <th className="px-2 py-3 w-24 sticky top-0 z-30 bg-slate-50 border-b border-slate-200">Jornada</th>
                  </>
                )}

                {/* LOGÍSTICA (Violeta Tenue) */}
                <th className="px-2 py-3 text-center min-w-[120px] sticky top-0 z-30 bg-indigo-50/5 text-slate-600 border-b border-r border-slate-200">Salida</th>
                <th className="px-2 py-3 text-center min-w-[120px] sticky top-0 z-30 bg-indigo-50/5 text-slate-600 border-b border-r border-slate-200">Llegada</th>
                <th className="px-1 py-3 text-center w-10 sticky top-0 z-30 bg-indigo-50/5 text-slate-600 border-b border-r border-slate-200">Días</th>

                {/* BACKUP */}
                {showBackup && (
                  <>
                    <th className="px-2 py-3 text-center min-w-[100px] sticky top-0 z-30 bg-amber-50 text-amber-800 border-b border-r border-amber-100">Salida (Bk)</th>
                    <th className="px-2 py-3 text-center min-w-[100px] sticky top-0 z-30 bg-amber-50 text-amber-800 border-b border-r border-amber-100">Llegada (Bk)</th>
                    <th className="px-2 py-3 text-center w-10 sticky top-0 z-30 bg-amber-50 text-amber-800 border-b border-r border-amber-100">Días</th>
                  </>
                )}

                {/* ANTICIPO Y VIÁTICOS */}
                {showAnticipo && (
                  <>
                    <th className="px-1 py-3 text-center w-12 sticky top-0 z-30 bg-slate-50 border-b border-slate-200">%</th>
                    <th className="px-2 py-3 text-right text-indigo-800 font-bold w-28 border-r border-indigo-100 sticky top-0 z-30 bg-indigo-50 border-b border-slate-200">
                        Viático
                    </th>
                  </>
                )}

                {/* TRANSPORTE */}
                {showTransport && (
                  <>
                    <th className="px-2 py-3 text-center text-blue-700 w-24 sticky top-0 z-30 bg-blue-50 border-b border-blue-100">Medios</th>
                    <th className="px-2 py-3 text-blue-700 w-32 sticky top-0 z-30 bg-blue-50 border-b border-blue-100">Oficial</th>
                    <th className="px-2 py-3 text-blue-700 w-32 sticky top-0 z-30 bg-blue-50 border-b border-blue-100 border-r border-blue-200">Particular</th>
                  </>
                )}

                {/* GASTOS Y RENDICIONES APILADOS */}
                {(showExpenses || showRendiciones) && FINANCIAL_COLS.map((col, idx) => (
                    <th key={idx} className={`px-2 py-3 text-right min-w-[100px] sticky top-0 z-30 border-b 
                        ${showExpenses && showRendiciones ? "bg-slate-100 text-slate-700 border-slate-200" : 
                          showExpenses ? "bg-orange-50 text-orange-800 border-orange-100" : 
                          "bg-emerald-50 text-emerald-800 border-emerald-100"}`}>
                        {col.label}
                    </th>
                ))}

                {/* TOTAL FINAL A LA DERECHA */}
                {(showExpenses || showRendiciones) && (
                    <th className="px-2 py-3 text-right w-28 sticky top-0 z-30 bg-slate-800 text-white border-b border-slate-900 shadow-md">
                        TOTAL FINAL
                    </th>
                )}

                <th className="px-2 py-3 w-10 sticky top-0 z-30 bg-slate-50 border-b border-slate-200"></th>
              </tr>
            </thead>
            
            <tbody className="text-xs">
              {rows.map((row) => {
                const isSelected = selection.has(row.id_integrante);
                const isDeleting = deletingRows.has(row.id);
                const logData = logisticsMap?.[String(row.id_integrante)] || {};
                
                // --- LÓGICA DE ALERTAS LOGÍSTICAS (RESTAURADA) ---
                const currentFechaSalida = row.fecha_salida;
                const currentHoraSalida = row.hora_salida;
                const currentFechaLlegada = row.fecha_llegada;
                const currentHoraLlegada = row.hora_llegada;
                const currentDias = row.dias_computables;

                const diffSalida = isDiff(currentFechaSalida, row.backup_fecha_salida) || isDiff(currentHoraSalida, row.backup_hora_salida);
                const diffLlegada = isDiff(currentFechaLlegada, row.backup_fecha_llegada) || isDiff(currentHoraLlegada, row.backup_hora_llegada);
                const diffDias = String(currentDias) !== String(row.backup_dias_computables || currentDias);

                const hasBackup = !!row.fecha_ultima_exportacion;
                const highlightSalida = hasBackup && diffSalida;
                const highlightLlegada = hasBackup && diffLlegada;
                const highlightDias = hasBackup && diffDias;
                // ------------------------------------------------

                const transportNameSalida = logData?.transporte_salida;
                const transportNameLlegada = logData?.transporte_llegada;

                let rowBgClass = "bg-white group-hover:bg-slate-50";
                if (row.noEstaEnRoster) rowBgClass = "bg-orange-100 hover:bg-orange-200";
                else if (isSelected) rowBgClass = "bg-indigo-50";
                if (isDeleting) rowBgClass += " opacity-50 pointer-events-none grayscale";
                const stickyBgClass = row.noEstaEnRoster ? "bg-orange-100" : isSelected ? "bg-indigo-50" : "bg-white";

                return (
                  <tr key={row.id_integrante} className={`transition-colors group ${rowBgClass}`}>
                    
                    {/* CHECKBOX */}
                    <td className={`px-3 py-2 text-center border-b border-r border-slate-100 sticky left-0 z-20 ${stickyBgClass}`}>
                      <input type="checkbox" checked={isSelected} onChange={() => onToggleSelection(row.id_integrante)} className="rounded text-indigo-600" />
                    </td>

                    {/* NOMBRE */}
                    <td className={`px-3 py-2 font-medium text-slate-700 border-b border-r border-slate-200 sticky left-[40px] z-20 shadow-sm ${stickyBgClass}`}>
                      <div className="flex items-center gap-2">
                        <span className="truncate max-w-[150px]">{row.apellido}, {row.nombre}</span>
                        {row.noEstaEnRoster && <span className="text-orange-600"><IconAlertTriangle size={10} /></span>}
                      </div>
                      <div className="text-[9px] text-slate-400 truncate">{row.rol_roster}</div>
                    </td>

                    {/* DATOS (Usando BlurInput interno simple si fuera necesario, pero aquí el principal es CurrencyInput. Para texto simple mantenemos el input normal con onBlur si lo prefieres, o un TextBlurInput) */}
                    {showDatos && (
                      <>
                        <td className={cellClass}>
                          <input 
                            type="text"
                            defaultValue={row.cargo || ""} 
                            onBlur={(e) => { if(e.target.value !== (row.cargo || "")) onUpdateRow(row.id, "cargo", e.target.value) }} 
                            className={`w-full bg-transparent outline-none text-slate-600 border-b border-transparent focus:border-indigo-500 ${getInputClass(row.id, "cargo")}`}
                          />
                        </td>
                        <td className={cellClass}>
                          <input 
                            type="text"
                            defaultValue={row.jornada_laboral || ""} 
                            onBlur={(e) => { if(e.target.value !== (row.jornada_laboral || "")) onUpdateRow(row.id, "jornada_laboral", e.target.value) }} 
                            placeholder="-"
                            className={`w-full bg-transparent outline-none text-slate-600 border-b border-transparent focus:border-indigo-500 ${getInputClass(row.id, "jornada_laboral")}`}
                          />
                        </td>
                      </>
                    )}

                    {/* LOGÍSTICA (ESTÉTICA VIOLETA TENUE) */}
                    <td className={`px-2 py-2 text-center border-b border-r border-slate-200 relative ${highlightSalida ? "bg-amber-100 text-amber-900" : "text-slate-600 bg-indigo-50/5"}`}>
                        <div className="flex flex-col items-center">
                            <span className="font-bold text-[10px] flex items-center gap-1">
                                {formatDateShort(currentFechaSalida)} <span className="opacity-40">|</span> {formatTimeShort(currentHoraSalida)}
                            </span>
                            {transportNameSalida && <span className="mt-0.5 text-[8px] bg-white/70 text-slate-500 px-1.5 rounded-full border border-black/5 truncate max-w-[100px]">{formatTransportName(transportNameSalida)}</span>}
                            {highlightSalida && <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" title="Cambió desde la última exportación" />}
                        </div>
                    </td>
                    <td className={`px-2 py-2 text-center border-b border-r border-slate-200 relative ${highlightLlegada ? "bg-amber-100 text-amber-900" : "text-slate-600 bg-indigo-50/5"}`}>
                        <div className="flex flex-col items-center">
                            <span className="font-bold text-[10px] flex items-center gap-1">
                                {formatDateShort(currentFechaLlegada)} <span className="opacity-40">|</span> {formatTimeShort(currentHoraLlegada)}
                            </span>
                            {transportNameLlegada && <span className="mt-0.5 text-[8px] bg-white/70 text-slate-500 px-1.5 rounded-full border border-black/5 truncate max-w-[100px]">{formatTransportName(transportNameLlegada)}</span>}
                            {highlightLlegada && <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" title="Cambió desde la última exportación" />}
                        </div>
                    </td>
                    <td className={`px-1 py-2 text-center font-bold border-b border-r border-slate-200 ${highlightDias ? "text-amber-700 bg-amber-100" : "text-slate-700 bg-indigo-50/5"}`}>
                        {currentDias}
                    </td>

                    {/* BACKUP */}
                    {showBackup && (
                        <>
                            <td className="px-2 py-2 text-center border-b bg-amber-50 text-slate-500 text-[10px] select-none">
                                {row.backup_fecha_salida ? `${formatDateShort(row.backup_fecha_salida)} ${formatTimeShort(row.backup_hora_salida)}` : "-"}
                            </td>
                            <td className="px-2 py-2 text-center border-b bg-amber-50 text-slate-500 text-[10px] select-none">
                                {row.backup_fecha_llegada ? `${formatDateShort(row.backup_fecha_llegada)} ${formatTimeShort(row.backup_hora_llegada)}` : "-"}
                            </td>
                            <td className="px-2 py-2 text-center border-b border-r bg-amber-50 text-slate-500 font-bold">
                                {row.backup_dias_computables ?? "-"}
                            </td>
                        </>
                    )}

                    {/* ANTICIPO Y VIÁTICOS */}
                    {showAnticipo && (
                      <>
                        <td className="px-1 py-2 text-center border-b border-slate-100">
                          <select className="bg-transparent text-xs outline-none font-bold" value={row.porcentaje ?? 100} onChange={(e) => onUpdateRow(row.id, "porcentaje", e.target.value)}>
                            <option value="100">100%</option>
                            <option value="80">80%</option>
                            <option value="0">0%</option>
                          </select>
                        </td>
                        
                        {/* CELDA VIÁTICO (UNIFICADA ESTILO GASTOS) */}
                        <td className={`px-2 py-1 border-r border-b border-indigo-100 ${showExpenses && showRendiciones ? "bg-slate-50/30" : showExpenses ? "bg-orange-50/10" : "bg-emerald-50/10"}`}>
                            <StackedFinancialCell 
                                row={row} 
                                colDef={{ exp: "subtotal", ren: "rendicion_viaticos" }} 
                                isReadOnly={true}
                                forceValue={row.subtotal} // Usar el calculado
                            />
                        </td>
                      </>
                    )}

                    {/* TRANSPORTE */}
                    {showTransport && (
                        <>
                            <td className="px-2 py-2 border-b border-slate-100 text-center">
                                <div className="flex flex-col gap-1 text-[9px]">
                                    <label><input type="checkbox" checked={row.check_aereo || false} onChange={e => onUpdateRow(row.id, "check_aereo", e.target.checked)}/> Aéreo</label>
                                    <label><input type="checkbox" checked={row.check_terrestre || false} onChange={e => onUpdateRow(row.id, "check_terrestre", e.target.checked)}/> Terr.</label>
                                </div>
                            </td>
                            <td className="px-2 py-2 border-b border-slate-100">
                                <div className="flex flex-col gap-1 text-[9px]">
                                    <label className="font-bold text-slate-500"><input type="checkbox" checked={row.check_patente_oficial} onChange={e => onUpdateRow(row.id, "check_patente_oficial", e.target.checked)}/> OFICIAL</label>
                                    <div className="bg-slate-100 px-1 rounded text-center font-mono">{logData?.patente || "-"}</div>
                                </div>
                            </td>
                            <td className="px-2 py-2 border-b border-r border-slate-200">
                                <div className="flex flex-col gap-1 text-[9px]">
                                    <label className="text-slate-500"><input type="checkbox" checked={row.check_patente_particular} onChange={e => onUpdateRow(row.id, "check_patente_particular", e.target.checked)}/> Part.</label>
                                    <input 
                                        type="text" 
                                        placeholder="Patente" 
                                        defaultValue={row.patente_particular || ""} 
                                        onBlur={e => { if(e.target.value !== (row.patente_particular || "")) onUpdateRow(row.id, "patente_particular", e.target.value) }} 
                                        className={`bg-slate-50 rounded px-1 w-full ${getInputClass(row.id, "patente_particular")}`}
                                    />
                                </div>
                            </td>
                        </>
                    )}

                    {/* GASTOS Y RENDICIONES APILADOS */}
                    {(showExpenses || showRendiciones) && FINANCIAL_COLS.map((col, idx) => (
                        <td key={idx} className={`px-1 py-1 border-b border-slate-100 ${
                            showExpenses && showRendiciones ? "bg-slate-50/30" : 
                            showExpenses ? "bg-orange-50/10" : "bg-emerald-50/10"
                        }`}>
                            <StackedFinancialCell row={row} colDef={col} />
                        </td>
                    ))}

                    {/* TOTAL FINAL */}
                    {(showExpenses || showRendiciones) && (
                        <td className="px-1 py-1 border-b border-slate-200 bg-slate-50 border-l">
                            <TotalFinalCell row={row} />
                        </td>
                    )}

                    <td className="px-2 py-2 text-center border-b border-slate-100">
                      <button onClick={() => onDeleteRow(row.id)} disabled={isDeleting} className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-full transition-colors disabled:opacity-50">
                        <IconTrash size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}