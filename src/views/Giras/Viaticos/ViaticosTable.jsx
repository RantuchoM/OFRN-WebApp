import React, { useState } from "react";
import {
  IconTrash,
  IconAlertTriangle,
  IconCheck,
  IconClock,
  IconBus,
  IconEye,
  IconEyeOff,
  IconHistory,
  IconCar,
  IconFileText,
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
  config,
  updatingFields = new Set(),
  deletingRows = new Set(),
  errorFields = new Set(),
  successFields = new Set(),
  logisticsMap = {},
}) {
  const [showBackup, setShowBackup] = useState(false);

  const cellClass = "px-2 py-2 border-b border-slate-100";

  const getInputClass = (rowId, fieldName, baseClass = "") => {
    const key = `${rowId}-${fieldName}`;

    // Prioridad 1: Guardando (Amarillo)
    if (updatingFields.has(key))
      return `transition-colors duration-200 bg-amber-100 text-amber-900 border-amber-300 ${baseClass.replace("bg-transparent", "")}`;

    // Prioridad 2: Error (Rojo) - NUEVO
    if (errorFields.has(key))
      return `transition-colors duration-200 bg-rose-100 text-rose-900 border-rose-300 font-bold ${baseClass.replace("bg-transparent", "")}`;

    // Prioridad 3: Éxito (Verde)
    if (successFields.has(key))
      return `transition-colors duration-1000 bg-green-100 text-green-900 border-green-300 font-medium ${baseClass.replace("bg-transparent", "")}`;

    // Estado Normal
    return `${baseClass} transition-colors duration-500`;
  };

  const totalAnticipo = rows.reduce((acc, r) => acc + (r.subtotal || 0), 0);
  const totalGastos = rows.reduce((acc, r) => {
    const g =
      parseFloat(r.gastos_movilidad || 0) +
      parseFloat(r.gasto_combustible || 0) +
      parseFloat(r.gasto_otros || 0) +
      parseFloat(r.gastos_capacit || 0) +
      parseFloat(r.gastos_movil_otros || 0) +
      parseFloat(r.gasto_alojamiento || 0) +
      parseFloat(r.gasto_pasajes || 0) +
      parseFloat(r.transporte_otros || 0);
    return acc + g;
  }, 0);
  const granTotal = totalAnticipo + totalGastos;

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden flex flex-col h-full">
      <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 flex justify-between items-center sticky top-0 z-50">
        <div className="text-xs text-slate-500 font-medium flex items-center gap-4">
          <span>{rows.length} registros</span>
          <span className="text-slate-300">|</span>
          <span>
            Anticipo: <b>${totalAnticipo.toLocaleString("es-AR")}</b>
          </span>
          <span>
            Gastos: <b>${totalGastos.toLocaleString("es-AR")}</b>
          </span>
          <span className="text-slate-300">|</span>
          <span className="text-indigo-600">
            Final: <b>${granTotal.toLocaleString("es-AR")}</b>
          </span>
        </div>
        <button
          onClick={() => setShowBackup(!showBackup)}
          className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold uppercase transition-colors ${showBackup ? "bg-amber-100 text-amber-800 border border-amber-200" : "bg-white text-slate-400 border border-slate-200 hover:text-slate-600"}`}
          title="Comparar con última exportación"
        >
          <IconHistory size={12} /> Backup{" "}
          {showBackup ? <IconEye size={12} /> : <IconEyeOff size={12} />}
        </button>
      </div>

      <div className="relative overflow-x-auto min-h-[300px] flex-1">
        <div className="inline-block min-w-full align-middle">
          <table className="w-full text-sm text-left border-separate border-spacing-0">
            <thead className="text-slate-500 font-bold uppercase text-[10px]">
              <tr>
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
                    <th className="px-2 py-3 w-32 sticky top-0 z-30 bg-slate-50 border-b border-slate-200">
                      Cargo/Función
                    </th>
                    <th className="px-2 py-3 w-24 sticky top-0 z-30 bg-slate-50 border-b border-slate-200">
                      Jornada
                    </th>
                  </>
                )}
                <th className="px-2 py-3 text-center min-w-[120px] sticky top-0 z-30 bg-indigo-50/50 text-indigo-900 border-b border-r border-slate-200">
                  Salida (Auto)
                </th>
                <th className="px-2 py-3 text-center min-w-[120px] sticky top-0 z-30 bg-indigo-50/50 text-indigo-900 border-b border-r border-slate-200">
                  Llegada (Auto)
                </th>
                <th className="px-1 py-3 text-center w-12 sticky top-0 z-30 bg-indigo-50/50 text-indigo-900 border-b border-r border-slate-200">
                  Días
                </th>
                {showBackup && (
                  <>
                    <th className="px-2 py-3 text-center min-w-[100px] sticky top-0 z-30 bg-amber-50 text-amber-800 border-b border-r border-amber-100 border-l-2 border-l-amber-200">
                      Salida (Backup)
                    </th>
                    <th className="px-2 py-3 text-center min-w-[100px] sticky top-0 z-30 bg-amber-50 text-amber-800 border-b border-r border-amber-100">
                      Llegada (Backup)
                    </th>
                    <th className="px-2 py-3 text-center w-12 sticky top-0 z-30 bg-amber-50 text-amber-800 border-b border-r border-amber-100">
                      Días
                    </th>
                    <th className="px-2 py-3 text-center min-w-[80px] sticky top-0 z-30 bg-amber-50 text-amber-800 border-b border-r border-amber-100">
                      Fecha
                    </th>
                  </>
                )}
                {showAnticipo && (
                  <>
                    <th className="px-1 py-3 text-center w-16 sticky top-0 z-30 bg-slate-50 border-b border-slate-200">
                      %
                    </th>
                    {/* COLUMNA TEMP ELIMINADA */}
                    <th className="px-2 py-3 text-right text-slate-600 w-24 sticky top-0 z-30 bg-slate-100 border-b border-slate-200">
                      $ Diario
                    </th>
                    <th className="px-2 py-3 text-right text-indigo-800 font-bold w-24 border-r border-indigo-100 sticky top-0 z-30 bg-indigo-50 border-b border-slate-200">
                      Subtotal
                    </th>
                  </>
                )}
                {showTransport && (
                  <>
                    <th className="px-2 py-3 text-center text-blue-700 w-24 sticky top-0 z-30 bg-blue-50 border-b border-blue-100 border-r border-blue-200">
                      Medios
                    </th>
                    <th className="px-2 py-3 text-blue-700 w-32 sticky top-0 z-30 bg-blue-50 border-b border-blue-100 border-r border-blue-200">
                      Oficial
                    </th>
                    <th className="px-2 py-3 text-blue-700 w-32 sticky top-0 z-30 bg-blue-50 border-b border-blue-100 border-r border-blue-200">
                      Particular
                    </th>
                    <th className="px-2 py-3 text-blue-700 w-32 border-r border-blue-100 sticky top-0 z-30 bg-blue-50 border-b border-blue-100">
                      Otros
                    </th>
                  </>
                )}
                {/* Sección Gastos - Forzamos 140px mínimo por columna */}
                {showExpenses && (
                  <>
                    <th className="px-2 py-3 text-right text-slate-500 min-w-[80px] sticky top-0 z-30 bg-orange-50 border-b border-orange-100">
                      Movilidad
                    </th>
                    <th className="px-2 py-3 text-right text-slate-500 min-w-[80px] sticky top-0 z-30 bg-orange-50 border-b border-orange-100">
                      Combustible
                    </th>
                    <th className="px-2 py-3 text-right text-slate-500 min-w-[80px] sticky top-0 z-30 bg-orange-50 border-b border-orange-100">
                      Otros
                    </th>
                    <th className="px-2 py-3 text-right text-slate-500 min-w-[80px] sticky top-0 z-30 bg-orange-50 border-b border-orange-100">
                      Capacit.
                    </th>
                    <th className="px-2 py-3 text-right text-slate-500 min-w-[80px] sticky top-0 z-30 bg-orange-50 border-b border-orange-100">
                      M. Otros
                    </th>
                    <th className="px-2 py-3 text-right text-slate-500 min-w-[80px] border-r sticky top-0 z-30 bg-orange-50 border-b border-orange-100">
                      Alojamiento
                    </th>
                  </>
                )}
                {/* Sección Rendiciones - Forzamos 140px mínimo */}
                {showRendiciones && (
                  <>
                    <th className="px-2 py-3 text-green-700 min-w-[80px] border-l border-green-100 sticky top-0 z-30 bg-green-50 border-b border-green-100">
                      R. Viát.
                    </th>
                    <th className="px-2 py-3 text-green-700 min-w-[80px] sticky top-0 z-30 bg-green-50 border-b border-green-100">
                      R. Aloj.
                    </th>
                    <th className="px-2 py-3 text-green-700 min-w-[80px] sticky top-0 z-30 bg-green-50 border-b border-green-100">
                      R. Pasajes
                    </th>
                    <th className="px-2 py-3 text-green-700 min-w-[80px] sticky top-0 z-30 bg-green-50 border-b border-green-100">
                      R. Comb.
                    </th>
                    <th className="px-2 py-3 text-green-700 min-w-[80px] sticky top-0 z-30 bg-green-50 border-b border-green-100">
                      R. Mov.Otr
                    </th>
                    <th className="px-2 py-3 text-green-700 min-w-[80px] sticky top-0 z-30 bg-green-50 border-b border-green-100">
                      R. Capac.
                    </th>
                    <th className="px-2 py-3 text-green-700 min-w-[80px] border-r border-green-100 sticky top-0 z-30 bg-green-50 border-b border-green-100">
                      R. Otros T.
                    </th>
                  </>
                )}{" "}
                <th className="px-2 py-3 w-10 text-center sticky top-0 z-30 bg-slate-50 border-b border-slate-200"></th>
              </tr>
            </thead>
            <tbody className="text-xs">
              {rows.map((row) => {
                const isSelected = selection.has(row.id_integrante);
                const isDeleting = deletingRows.has(row.id);

                const logData = logisticsMap?.[String(row.id_integrante)] || {};
                const currentFechaSalida = row.fecha_salida;
                const currentHoraSalida = row.hora_salida;
                const currentFechaLlegada = row.fecha_llegada;
                const currentHoraLlegada = row.hora_llegada;
                const currentDias = row.dias_computables;

                const transportNameSalida = logData?.transporte_salida;
                const transportNameLlegada = logData?.transporte_llegada;

                const diffSalida =
                  isDiff(currentFechaSalida, row.backup_fecha_salida) ||
                  isDiff(currentHoraSalida, row.backup_hora_salida);
                const diffLlegada =
                  isDiff(currentFechaLlegada, row.backup_fecha_llegada) ||
                  isDiff(currentHoraLlegada, row.backup_hora_llegada);
                const diffDias =
                  String(currentDias) !==
                  String(row.backup_dias_computables || currentDias);

                const hasBackup = !!row.fecha_ultima_exportacion;
                const highlightSalida = hasBackup && diffSalida;
                const highlightLlegada = hasBackup && diffLlegada;
                const highlightDias = hasBackup && diffDias;

                let rowBgClass = "bg-white group-hover:bg-slate-50";
                if (row.noEstaEnRoster)
                  rowBgClass = "bg-orange-100 hover:bg-orange-200";
                else if (isSelected) rowBgClass = "bg-indigo-50";
                if (isDeleting)
                  rowBgClass += " opacity-50 pointer-events-none grayscale";
                const stickyBgClass = row.noEstaEnRoster
                  ? "bg-orange-100"
                  : isSelected
                    ? "bg-indigo-50"
                    : "bg-white";

                return (
                  <tr
                    key={row.id_integrante}
                    className={`transition-colors group ${rowBgClass}`}
                  >
                    {/* CHECKBOX + BADGE EXPORTADO */}
                    <td
                      className={`px-3 py-2 text-center border-b border-r border-slate-100 sticky left-0 z-20 ${stickyBgClass} relative`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onToggleSelection(row.id_integrante)}
                        className="rounded text-indigo-600"
                      />
                      {hasBackup && (
                        <div
                          className="absolute top-0.5 right-0.5"
                          title={`Ya exportado: ${formatTimestamp(row.fecha_ultima_exportacion)}`}
                        >
                          <div className="bg-green-100 text-green-600 rounded-full w-3 h-3 flex items-center justify-center border border-green-200 shadow-sm cursor-help">
                            <IconCheck size={8} strokeWidth={4} />
                          </div>
                        </div>
                      )}
                    </td>

                    <td
                      className={`px-3 py-2 font-medium text-slate-700 border-b border-r border-slate-200 sticky left-[40px] z-20 shadow-[4px_0_8px_-2px_rgba(0,0,0,0.05)] ${stickyBgClass}`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="truncate max-w-[150px]">
                          {row.apellido}, {row.nombre}
                        </span>
                        {row.noEstaEnRoster && (
                          <span className="text-[9px] text-orange-600 bg-white px-1 rounded border border-orange-200 flex items-center gap-1 cursor-help">
                            <IconAlertTriangle size={10} />
                          </span>
                        )}
                      </div>
                      <div className="text-[9px] text-slate-400 truncate">
                        {row.rol_roster}{" "}
                        {row.ciudad_origen ? `- ${row.ciudad_origen}` : ""}
                      </div>
                    </td>

                    {showDatos && (
                      <>
                        <td className={cellClass}>
                          <input
                            type="text"
                            className={getInputClass(
                              row.id,
                              "cargo",
                              "w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 outline-none text-slate-600",
                            )}
                            value={row.cargo || ""}
                            onChange={(e) =>
                              onUpdateRow(row.id, "cargo", e.target.value)
                            }
                          />
                        </td>
                        <td className={cellClass}>
                          <input
                            type="text"
                            className={getInputClass(
                              row.id,
                              "jornada_laboral",
                              "w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 outline-none text-slate-600",
                            )}
                            placeholder="-"
                            value={row.jornada_laboral || ""}
                            onChange={(e) =>
                              onUpdateRow(
                                row.id,
                                "jornada_laboral",
                                e.target.value,
                              )
                            }
                          />
                        </td>
                      </>
                    )}

                    <td
                      className={`px-2 py-2 text-center border-b border-r border-slate-200 relative ${highlightSalida ? "bg-amber-100 text-amber-900" : "text-slate-700 bg-indigo-50/20"}`}
                    >
                      <div className="flex flex-col items-center justify-center">
                        <span className="font-bold text-[11px] flex items-center gap-1">
                          {formatDateShort(currentFechaSalida)}{" "}
                          <span className="opacity-40">|</span>{" "}
                          {formatTimeShort(currentHoraSalida)}
                        </span>
                        {transportNameSalida && (
                          <span
                            className="mt-0.5 text-[8px] bg-white/70 text-slate-500 px-1.5 rounded-full border border-black/5 truncate max-w-[100px]"
                            title={transportNameSalida}
                          >
                            {formatTransportName(transportNameSalida)}
                          </span>
                        )}
                        {highlightSalida && (
                          <div
                            className="absolute top-1 right-1 w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"
                            title="Cambió desde la última exportación"
                          ></div>
                        )}
                      </div>
                    </td>
                    <td
                      className={`px-2 py-2 text-center border-b border-r border-slate-200 relative ${highlightLlegada ? "bg-amber-100 text-amber-900" : "text-slate-700 bg-indigo-50/20"}`}
                    >
                      <div className="flex flex-col items-center justify-center">
                        <span className="font-bold text-[11px] flex items-center gap-1">
                          {formatDateShort(currentFechaLlegada)}{" "}
                          <span className="opacity-40">|</span>{" "}
                          {formatTimeShort(currentHoraLlegada)}
                        </span>
                        {transportNameLlegada && (
                          <span
                            className="mt-0.5 text-[8px] bg-white/70 text-slate-500 px-1.5 rounded-full border border-black/5 truncate max-w-[100px]"
                            title={transportNameLlegada}
                          >
                            {formatTransportName(transportNameLlegada)}
                          </span>
                        )}
                        {highlightLlegada && (
                          <div
                            className="absolute top-1 right-1 w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"
                            title="Cambió desde la última exportación"
                          ></div>
                        )}
                      </div>
                    </td>
                    <td
                      className={`px-1 py-2 text-center font-bold border-b border-r border-slate-200 ${highlightDias ? "text-amber-700 bg-amber-100" : "text-indigo-700 bg-indigo-50/20"}`}
                    >
                      {currentDias}
                    </td>

                    {showBackup && (
                      <>
                        <td className="px-2 py-2 text-center border-b border-r bg-slate-50 border-l-2 border-l-amber-200 text-slate-500 select-none">
                          {row.backup_fecha_salida ? (
                            <div className="flex flex-col text-[10px]">
                              <span>
                                {formatDateShort(row.backup_fecha_salida)}
                              </span>
                              <span>
                                {formatTimeShort(row.backup_hora_salida)}
                              </span>
                            </div>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="px-2 py-2 text-center border-b border-r bg-slate-50 text-slate-500 select-none">
                          {row.backup_fecha_llegada ? (
                            <div className="flex flex-col text-[10px]">
                              <span>
                                {formatDateShort(row.backup_fecha_llegada)}
                              </span>
                              <span>
                                {formatTimeShort(row.backup_hora_llegada)}
                              </span>
                            </div>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="px-2 py-2 text-center border-b border-r bg-slate-50 text-slate-500 font-medium">
                          {row.backup_dias_computables ?? "-"}
                        </td>
                        <td className="px-2 py-2 text-center border-b border-r bg-slate-50 text-[9px] text-slate-400 leading-tight">
                          {formatTimestamp(row.fecha_ultima_exportacion)}
                        </td>
                      </>
                    )}

                    {showAnticipo && (
                      <>
                        {/* LÍNEA 223 aprox. */}
                        <td className="px-1 py-2 text-center border-b border-slate-100">
                          <select
                            className={`bg-transparent text-xs text-center outline-none ${getInputClass(row.id, "porcentaje")}`}
                            // CAMBIO AQUÍ: Usar ?? en lugar de ||
                            value={row.porcentaje ?? 100}
                            onChange={(e) =>
                              onUpdateRow(row.id, "porcentaje", e.target.value)
                            }
                          >
                            <option value="100">100%</option>
                            <option value="80">80%</option>
                            <option value="0">0%</option>
                          </select>
                        </td>
                        {/* CELDA TEMP ELIMINADA */}
                        <td className="px-2 py-2 text-right font-mono text-slate-500 border-b border-slate-100">
                          ${row.valorDiarioCalc?.toLocaleString()}
                        </td>
                        <td className="px-2 py-2 text-right font-mono font-bold text-indigo-700 bg-indigo-50/30 border-r border-b border-indigo-100">
                          ${row.subtotal?.toLocaleString()}
                        </td>
                      </>
                    )}

                    {showTransport && (
                      <>
                        <td className="px-2 py-2 text-center border-b border-r border-slate-100">
                          <div className="flex flex-col gap-1 items-start text-[9px] text-slate-600">
                            <label className="flex items-center gap-1 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={row.check_aereo || false}
                                onChange={(e) =>
                                  onUpdateRow(
                                    row.id,
                                    "check_aereo",
                                    e.target.checked,
                                  )
                                }
                                className="rounded-sm"
                              />{" "}
                              Aéreo
                            </label>
                            <label className="flex items-center gap-1 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={row.check_terrestre || false}
                                onChange={(e) =>
                                  onUpdateRow(
                                    row.id,
                                    "check_terrestre",
                                    e.target.checked,
                                  )
                                }
                                className="rounded-sm"
                              />{" "}
                              Terr.
                            </label>
                          </div>
                        </td>
                        <td className={cellClass + " border-r bg-slate-50/50"}>
                          <div className="flex flex-col gap-1">
                            <label className="flex items-center gap-1 text-[9px] text-slate-500 font-bold">
                              <input
                                type="checkbox"
                                checked={row.check_patente_oficial || false}
                                onChange={(e) =>
                                  onUpdateRow(
                                    row.id,
                                    "check_patente_oficial",
                                    e.target.checked,
                                  )
                                }
                                className="rounded-sm"
                              />{" "}
                              OFICIAL
                            </label>
                            <div className="text-[10px] font-black text-indigo-600 bg-white border border-indigo-100 rounded px-1.5 py-0.5 shadow-sm font-mono tracking-tighter">
                              {logData?.patente || ""}
                            </div>
                          </div>
                        </td>
                        <td className={cellClass + " border-r"}>
                          <div className="flex flex-col gap-1">
                            <label className="flex items-center gap-1 text-[9px] text-slate-500">
                              <input
                                type="checkbox"
                                checked={row.check_patente_particular || false}
                                onChange={(e) =>
                                  onUpdateRow(
                                    row.id,
                                    "check_patente_particular",
                                    e.target.checked,
                                  )
                                }
                                className="rounded-sm"
                              />{" "}
                              Part.
                            </label>
                            <input
                              type="text"
                              placeholder="Patente"
                              value={row.patente_particular || ""}
                              onChange={(e) =>
                                onUpdateRow(
                                  row.id,
                                  "patente_particular",
                                  e.target.value,
                                )
                              }
                              className={getInputClass(
                                row.id,
                                "patente_particular",
                                "w-full text-[9px] bg-white border border-slate-200 rounded px-1",
                              )}
                            />
                          </div>
                        </td>
                        <td className={cellClass + " border-r"}>
                          <div className="flex flex-col gap-1">
                            <label className="flex items-center gap-1 text-[9px] text-slate-500">
                              <input
                                type="checkbox"
                                checked={row.check_otros || false}
                                onChange={(e) =>
                                  onUpdateRow(
                                    row.id,
                                    "check_otros",
                                    e.target.checked,
                                  )
                                }
                                className="rounded-sm"
                              />{" "}
                              Otro
                            </label>
                            <input
                              type="text"
                              placeholder="Detalle"
                              value={row.transporte_otros || ""}
                              onChange={(e) =>
                                onUpdateRow(
                                  row.id,
                                  "transporte_otros",
                                  e.target.value,
                                )
                              }
                              className={getInputClass(
                                row.id,
                                "transporte_otros",
                                "w-full text-[9px] bg-white border border-slate-200 rounded px-1",
                              )}
                            />
                            <input
                              type="number"
                              placeholder="$ Pasaje"
                              className="w-full text-right bg-transparent border-b border-blue-100 focus:border-blue-500 outline-none text-[9px]"
                              value={row.gasto_pasajes || ""}
                              onChange={(e) =>
                                onUpdateRow(
                                  row.id,
                                  "gasto_pasajes",
                                  e.target.value,
                                )
                              }
                            />
                          </div>
                        </td>
                      </>
                    )}
                    {showExpenses && (
                      <>
                        {[
                          "gastos_movilidad",
                          "gasto_combustible",
                          "gasto_otros",
                          "gastos_capacit",
                          "gastos_movil_otros",
                          "gasto_alojamiento",
                        ].map((field) => (
                          <td
                            key={field}
                            className="px-2 py-2 border-b border-r bg-orange-50/10"
                          >
                            <div className="currency-container">
                              <span className="currency-prefix">$</span>
                              <input
                                type="text"
                                // Mostramos el valor con puntos de miles
                                value={
                                  row[field]
                                    ? Number(row[field]).toLocaleString("es-AR")
                                    : ""
                                }
                                onChange={(e) => {
                                  // 1. Limpiamos puntos de miles
                                  const rawValue = e.target.value.replace(
                                    /\./g,
                                    "",
                                  );

                                  // 2. Lógica corregida: Si está vacío, enviamos "0", si no, el valor.
                                  const valueToSend =
                                    rawValue === "" ? "0" : rawValue;

                                  if (!isNaN(valueToSend)) {
                                    onUpdateRow(row.id, field, valueToSend);
                                  }
                                }}
                                className={getInputClass(
                                  row.id,
                                  field,
                                  "bg-transparent outline-none border-b border-transparent hover:border-slate-300 text-slate-700",
                                )}
                                placeholder="0"
                              />
                            </div>
                          </td>
                        ))}
                      </>
                    )}
                    {showRendiciones && (
                      <>
                        {[
                          "rendicion_viaticos",
                          "rendicion_gasto_alojamiento",
                          "rendicion_gasto_pasajes",
                          "rendicion_gasto_combustible",
                          "rendicion_gastos_movil_otros",
                          "rendicion_gastos_capacit",
                          "rendicion_transporte_otros",
                        ].map((field) => (
                          <td
                            key={field}
                            className="px-1 py-2 bg-green-50/20 border-b border-green-100"
                          >
                            <div className="currency-container">
                              <span className="currency-prefix text-green-600">
                                $
                              </span>
                              <input
                                type="text"
                                // Mostramos el valor con puntos de miles
                                value={
                                  row[field]
                                    ? Number(row[field]).toLocaleString("es-AR")
                                    : ""
                                }
                                onChange={(e) => {
                                  // 1. Limpiamos puntos de miles
                                  const rawValue = e.target.value.replace(
                                    /\./g,
                                    "",
                                  );

                                  // 2. Lógica corregida: Si está vacío, enviamos "0", si no, el valor.
                                  const valueToSend =
                                    rawValue === "" ? "0" : rawValue;

                                  if (!isNaN(valueToSend)) {
                                    onUpdateRow(row.id, field, valueToSend);
                                  }
                                }}
                                className="bg-transparent outline-none text-green-700"
                                placeholder="0"
                              />
                            </div>
                          </td>
                        ))}
                      </>
                    )}
                    <td className="px-2 py-2 text-center border-b border-slate-100">
                      <button
                        onClick={() => onDeleteRow(row.id)}
                        disabled={isDeleting}
                        className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-full transition-colors disabled:opacity-50"
                        title="Eliminar fila"
                      >
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
