import React from "react";
import {
  IconTrash,
  IconInfo,
  IconLoader,
  IconAlertTriangle,
} from "../../../components/ui/Icons";
import DateInput from "../../../components/ui/DateInput";
import TimeInput from "../../../components/ui/TimeInput";

const round2 = (num) => Math.round((num + Number.EPSILON) * 100) / 100;

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
  successFields = new Set(),
  logisticsMap = {},
}) {
  const cellClass = "px-2 py-2 border-b border-slate-100";

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const [y, m, d] = dateStr.split("-");
    return `${d}-${m}-${y}`;
  };

  const getInputClass = (rowId, fieldName, baseClass = "") => {
    const key = `${rowId}-${fieldName}`;
    if (updatingFields.has(key)) {
      return `${baseClass} transition-colors duration-200 bg-amber-100 text-amber-900 border-amber-300`;
    }
    if (successFields.has(key)) {
      return `${baseClass} transition-colors duration-1000 bg-green-100 text-green-900 border-green-300 font-medium`;
    }
    return `${baseClass} transition-colors duration-500`;
  };

  return (
    <div className="relative overflow-x-auto min-h-[300px]">
      <div className="inline-block min-w-full align-middle">
        <table className="w-full text-sm text-left border-separate border-spacing-0">
          <thead className="text-slate-500 font-bold uppercase text-[10px]">
            <tr>
              <th className="px-3 py-3 w-10 text-center sticky top-0 left-0 z-50 bg-slate-50 border-b border-r border-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                <input
                  type="checkbox"
                  onChange={onSelectAll}
                  checked={selection.size === rows.length && rows.length > 0}
                  className="rounded text-indigo-600"
                />
              </th>
              <th className="px-3 py-3 w-48 sticky top-0 left-[40px] z-50 bg-slate-50 border-b border-r border-slate-200 shadow-[4px_0_8px_-2px_rgba(0,0,0,0.1)]">
                Integrante
              </th>

              {showDatos && (
                <>
                  <th className="px-2 py-3 w-32 sticky top-0 z-40 bg-slate-50 border-b border-slate-200">
                    Cargo/Función
                  </th>
                  <th className="px-2 py-3 w-24 sticky top-0 z-40 bg-slate-50 border-b border-slate-200">
                    Jornada
                  </th>
                </>
              )}

              {showAnticipo && (
                <>
                  <th className="px-2 py-3 bg-slate-50 border-l min-w-[220px] sticky top-0 z-40 border-b border-slate-200">
                    Salida (Manual)
                  </th>
                  <th className="px-2 py-3 bg-blue-50/50 text-blue-700 text-center min-w-[140px] sticky top-0 z-40 border-b border-blue-100 border-r border-slate-200">
                    Salida (Calc)
                  </th>
                  <th className="px-2 py-3 bg-slate-50 min-w-[220px] sticky top-0 z-40 border-b border-slate-200">
                    Llegada (Manual)
                  </th>
                  <th className="px-2 py-3 bg-blue-50/50 text-blue-700 text-center min-w-[140px] sticky top-0 z-40 border-b border-blue-100 border-r border-slate-200">
                    Llegada (Calc)
                  </th>
                  <th className="px-1 py-3 text-center w-12 sticky top-0 z-40 bg-slate-50 border-b border-slate-200">
                    Días
                  </th>
                  <th className="px-1 py-3 text-center w-16 sticky top-0 z-40 bg-slate-50 border-b border-slate-200">
                    %
                  </th>
                  <th className="px-1 py-3 text-center text-amber-700 w-10 sticky top-0 z-40 bg-amber-50 border-b border-amber-100">
                    Temp
                  </th>
                  <th className="px-2 py-3 text-right text-slate-600 w-32 sticky top-0 z-40 bg-slate-100 border-b border-slate-200">
                    $ Diario
                  </th>
                  <th className="px-2 py-3 text-right text-indigo-800 font-bold w-32 border-r border-indigo-100 sticky top-0 z-40 bg-indigo-50 border-b border-slate-200">
                    Subtotal
                  </th>
                </>
              )}

              {showTransport && (
                <>
                  <th className="px-2 py-3 text-center text-blue-700 w-20 sticky top-0 z-40 bg-blue-50 border-b border-blue-100">
                    Medios
                  </th>
                  <th className="px-2 py-3 text-blue-700 w-32 sticky top-0 z-40 bg-blue-50 border-b border-blue-100">
                    Oficial
                  </th>
                  <th className="px-2 py-3 text-blue-700 w-32 sticky top-0 z-40 bg-blue-50 border-b border-blue-100">
                    Particular
                  </th>
                  <th className="px-2 py-3 text-blue-700 w-32 border-r border-blue-100 sticky top-0 z-40 bg-blue-50 border-b border-blue-100">
                    Otros
                  </th>
                </>
              )}
              {showExpenses && (
                <>
                  <th className="px-2 py-3 text-right text-slate-400 font-normal w-24 sticky top-0 z-40 bg-slate-50 border-b border-slate-200">
                    Mov.
                  </th>
                  <th className="px-2 py-3 text-right text-slate-400 font-normal w-24 sticky top-0 z-40 bg-slate-50 border-b border-slate-200">
                    Comb.
                  </th>
                  <th className="px-2 py-3 text-right text-slate-400 font-normal w-24 sticky top-0 z-40 bg-slate-50 border-b border-slate-200">
                    Otros
                  </th>
                  <th className="px-2 py-3 text-right text-slate-400 font-normal w-24 sticky top-0 z-40 bg-slate-50 border-b border-slate-200">
                    Capac.
                  </th>
                  <th className="px-2 py-3 text-right text-slate-400 font-normal w-24 sticky top-0 z-40 bg-slate-50 border-b border-slate-200">
                    M.Otr
                  </th>
                  <th className="px-2 py-3 text-right text-slate-400 font-normal border-r w-24 sticky top-0 z-40 bg-slate-50 border-b border-slate-200">
                    Aloj.
                  </th>
                </>
              )}
              <th className="px-3 py-3 text-right text-white w-36 sticky top-0 z-40 bg-slate-800 border-b border-slate-900">
                Total Final
              </th>
              {showRendiciones && (
                <>
                  <th className="px-2 py-3 text-green-700 w-24 border-l border-green-100 sticky top-0 z-40 bg-green-50 border-b border-green-100">
                    R. Viát.
                  </th>
                  <th className="px-2 py-3 text-green-700 w-24 sticky top-0 z-40 bg-green-50 border-b border-green-100">
                    R. Aloj.
                  </th>
                  <th className="px-2 py-3 text-green-700 w-24 sticky top-0 z-40 bg-green-50 border-b border-green-100">
                    R. Pasajes
                  </th>
                  <th className="px-2 py-3 text-green-700 w-24 sticky top-0 z-40 bg-green-50 border-b border-green-100">
                    R. Comb.
                  </th>
                  <th className="px-2 py-3 text-green-700 w-24 sticky top-0 z-40 bg-green-50 border-b border-green-100">
                    R. Mov.Otr
                  </th>
                  <th className="px-2 py-3 text-green-700 w-24 sticky top-0 z-40 bg-green-50 border-b border-green-100">
                    R. Capac.
                  </th>
                  <th className="px-2 py-3 text-green-700 w-24 border-r border-green-100 sticky top-0 z-40 bg-green-50 border-b border-green-100">
                    R. Otros T.
                  </th>
                </>
              )}
              <th className="px-2 py-3 w-16 text-center sticky top-0 z-40 bg-slate-50 border-b border-slate-200"></th>
            </tr>
          </thead>
          <tbody className="text-xs">
            {rows.map((row) => {
              const isSelected = selection.has(row.id_integrante);
              const isDeleting = deletingRows.has(row.id);
              const logData = logisticsMap?.[String(row.id_integrante)] || {};
              const diffSalida =
                logData.hora_salida && logData.hora_salida !== row.hora_salida;
              const diffLlegada =
                logData.hora_llegada &&
                logData.hora_llegada !== row.hora_llegada;

              // --- LOGICA DE ESTILOS CORREGIDA ---
              let rowBgClass = "bg-white group-hover:bg-slate-50";

              if (row.noEstaEnRoster) {
                rowBgClass = "bg-orange-100 hover:bg-orange-200";
              } else if (isSelected) {
                rowBgClass = "bg-indigo-50";
              }

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
                  {/* CHECKBOX */}
                  <td
                    className={`px-3 py-2 text-center border-b border-r border-slate-100 sticky left-0 z-30 ${stickyBgClass}`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggleSelection(row.id_integrante)}
                      className="rounded text-indigo-600"
                    />
                  </td>

                  {/* INTEGRANTE */}
                  <td
                    className={`px-3 py-2 font-medium text-slate-700 border-b border-r border-slate-200 sticky left-[40px] z-30 shadow-[4px_0_8px_-2px_rgba(0,0,0,0.05)] ${stickyBgClass}`}
                  >
                    <div className="flex items-center gap-2">
                      <span>
                        {row.apellido}, {row.nombre}
                      </span>
                      {/* INDICADOR DE BAJA */}
                      {row.noEstaEnRoster && (
                        <span
                          className="text-[9px] text-orange-600 bg-white px-1 rounded border border-orange-200 flex items-center gap-1 cursor-help"
                          title="Esta persona fue eliminada del Roster de la gira pero aún tiene viáticos cargados."
                        >
                          <IconAlertTriangle size={10} /> Baja
                        </span>
                      )}
                    </div>
                    <div className="text-[9px] text-slate-400">
                      {row.rol_roster} -{" "}
                      <span className="text-slate-500 font-bold">
                        {row.ciudad_origen}
                      </span>
                    </div>
                  </td>

                  {/* DATOS MANUALES */}
                  {showDatos && (
                    <>
                      <td className={cellClass}>
                        <input
                          type="text"
                          className={getInputClass(
                            row.id,
                            "cargo",
                            "w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 outline-none text-slate-600"
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
                            "w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 outline-none text-slate-600"
                          )}
                          placeholder="-"
                          value={row.jornada_laboral || ""}
                          onChange={(e) =>
                            onUpdateRow(
                              row.id,
                              "jornada_laboral",
                              e.target.value
                            )
                          }
                        />
                      </td>
                    </>
                  )}

                  {/* ANTICIPO */}
                  {showAnticipo && (
                    <>
                      {/* Salida Manual */}
                      <td
                        className={`px-1 py-2 border-b border-l border-slate-100 ${getInputClass(
                          row.id,
                          "fecha_salida",
                          stickyBgClass
                        ).replace("w-full", "")}`}
                      >
                        <div className="flex gap-1 items-center justify-center w-full">
                          <DateInput
                            value={row.fecha_salida}
                            onChange={(val) =>
                              onUpdateRow(row.id, "fecha_salida", val)
                            }
                            className="w-20 bg-transparent text-[10px] font-medium text-slate-700 text-center px-0 border-b border-transparent hover:border-slate-300"
                          />
                          <TimeInput
                            value={row.hora_salida}
                            onChange={(val) =>
                              onUpdateRow(row.id, "hora_salida", val)
                            }
                            className="w-[45px] bg-transparent text-[10px] text-slate-500 text-center px-0 border-b border-transparent hover:border-slate-300"
                          />

                          {logData.fecha_salida &&
                            (logData.fecha_salida !== row.fecha_salida ||
                              logData.hora_salida !== row.hora_salida) && (
                              <div
                                className="p-1 cursor-pointer hover:bg-indigo-100 rounded-full group/tooltip relative z-20"
                                onClick={() => {
                                  onUpdateRow(
                                    row.id,
                                    "fecha_salida",
                                    logData.fecha_salida
                                  );
                                  onUpdateRow(
                                    row.id,
                                    "hora_salida",
                                    logData.hora_salida
                                  );
                                }}
                              >
                                <div className="bg-indigo-600 text-white rounded-full w-4 h-4 flex items-center justify-center text-[8px] font-bold">
                                  L
                                </div>
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-slate-800 text-white text-[9px] rounded hidden group-hover/tooltip:block whitespace-nowrap shadow-xl">
                                  <div className="font-bold text-indigo-300">
                                    Sugerencia Logística:
                                  </div>
                                  <div>
                                    {formatDate(logData.fecha_salida)} -{" "}
                                    {logData.hora_salida}
                                  </div>
                                  <div className="italic text-slate-400">
                                    {logData.transporte_salida}
                                  </div>
                                </div>
                              </div>
                            )}
                        </div>
                      </td>

                      {/* Salida Calc */}
                      <td className="px-2 py-2 border-b border-r border-slate-200 bg-blue-50/20 text-center">
                        {logData.fecha_salida ? (
                          <div className="flex flex-col">
                            <div
                              className={`text-[10px] ${
                                diffSalida
                                  ? "text-blue-600 font-bold"
                                  : "text-slate-500"
                              }`}
                            >
                              <span>{formatDate(logData.fecha_salida)}</span>{" "}
                              <span className="ml-1">
                                {logData.hora_salida || "--:--"}
                              </span>
                            </div>
                            <div
                              className="text-[8px] text-slate-400 truncate max-w-[120px] mx-auto"
                              title={logData.transporte_salida}
                            >
                              {logData.transporte_salida}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-300 text-[9px]">-</span>
                        )}
                      </td>

                      {/* Llegada Manual */}
                      <td
                        className={`px-1 py-2 border-b border-slate-100 ${getInputClass(
                          row.id,
                          "fecha_llegada",
                          stickyBgClass
                        ).replace("w-full", "")}`}
                      >
                        <div className="flex gap-1 items-center justify-center w-full">
                          <DateInput
                            value={row.fecha_llegada}
                            onChange={(val) =>
                              onUpdateRow(row.id, "fecha_llegada", val)
                            }
                            className="w-20 bg-transparent text-[10px] font-medium text-slate-700 text-center px-0 border-b border-transparent hover:border-slate-300"
                          />
                          <TimeInput
                            value={row.hora_llegada}
                            onChange={(val) =>
                              onUpdateRow(row.id, "hora_llegada", val)
                            }
                            className="w-[45px] bg-transparent text-[10px] text-slate-500 text-center px-0 border-b border-transparent hover:border-slate-300"
                          />

                          {logData.fecha_llegada &&
                            (logData.fecha_llegada !== row.fecha_llegada ||
                              logData.hora_llegada !== row.hora_llegada) && (
                              <div
                                className="p-1 cursor-pointer hover:bg-indigo-100 rounded-full group/tooltip relative z-20"
                                onClick={() => {
                                  onUpdateRow(
                                    row.id,
                                    "fecha_llegada",
                                    logData.fecha_llegada
                                  );
                                  onUpdateRow(
                                    row.id,
                                    "hora_llegada",
                                    logData.hora_llegada
                                  );
                                }}
                              >
                                <div className="bg-indigo-600 text-white rounded-full w-4 h-4 flex items-center justify-center text-[8px] font-bold">
                                  L
                                </div>
                                <div className="absolute bottom-full right-0 mb-1 px-2 py-1 bg-slate-800 text-white text-[9px] rounded hidden group-hover/tooltip:block whitespace-nowrap shadow-xl">
                                  <div className="font-bold text-indigo-300">
                                    Sugerencia Logística:
                                  </div>
                                  <div>
                                    {formatDate(logData.fecha_llegada)} -{" "}
                                    {logData.hora_llegada}
                                  </div>
                                  <div className="italic text-slate-400">
                                    {logData.transporte_llegada}
                                  </div>
                                </div>
                              </div>
                            )}
                        </div>
                      </td>

                      {/* Llegada Calc */}
                      <td className="px-2 py-2 border-b border-r border-slate-200 bg-blue-50/20 text-center">
                        {logData.fecha_llegada ? (
                          <div className="flex flex-col">
                            <div
                              className={`text-[10px] ${
                                diffLlegada
                                  ? "text-blue-600 font-bold"
                                  : "text-slate-500"
                              }`}
                            >
                              <span>{formatDate(logData.fecha_llegada)}</span>{" "}
                              <span className="ml-1">
                                {logData.hora_llegada || "--:--"}
                              </span>
                            </div>
                            <div
                              className="text-[8px] text-slate-400 truncate max-w-[120px] mx-auto"
                              title={logData.transporte_llegada}
                            >
                              {logData.transporte_llegada}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-300 text-[9px]">-</span>
                        )}
                      </td>

                      <td className="px-1 py-2 text-center font-mono font-bold text-slate-700 bg-slate-50 border-b border-slate-200">
                        {row.dias_computables}
                      </td>
                      <td className="px-1 py-2 text-center border-b border-slate-100">
                        <select
                          className={`bg-transparent text-xs text-center outline-none ${getInputClass(
                            row.id,
                            "porcentaje"
                          )}`}
                          value={row.porcentaje || 100}
                          onChange={(e) =>
                            onUpdateRow(row.id, "porcentaje", e.target.value)
                          }
                        >
                          <option value="100">100%</option>
                          <option value="80">80%</option>
                          <option value="0">0%</option>
                        </select>
                      </td>
                      <td className="px-1 py-2 text-center border-b border-slate-100">
                        <input
                          type="checkbox"
                          checked={row.es_temporada_alta || false}
                          onChange={(e) =>
                            onUpdateRow(
                              row.id,
                              "es_temporada_alta",
                              e.target.checked
                            )
                          }
                          className="rounded text-amber-600"
                        />
                      </td>
                      <td className="px-2 py-2 text-right font-mono text-slate-500 border-b border-slate-100">
                        ${row.valorDiarioCalc}
                      </td>
                      <td className="px-2 py-2 text-right font-mono font-bold text-indigo-700 bg-indigo-50/30 border-r border-b border-indigo-100">
                        ${row.subtotal}
                      </td>
                    </>
                  )}

                  {/* Resto de columnas (Transporte, Gastos, Rendiciones) */}
                  {showTransport && (
                    <>
                      <td className="px-2 py-2 text-center border-l border-b border-slate-100">
                        <div className="flex flex-col gap-1 items-start text-[10px] text-slate-600">
                          <label>
                            <input
                              type="checkbox"
                              checked={row.check_aereo || false}
                              onChange={(e) =>
                                onUpdateRow(
                                  row.id,
                                  "check_aereo",
                                  e.target.checked
                                )
                              }
                            />{" "}
                            Aéreo
                          </label>
                          <label>
                            <input
                              type="checkbox"
                              checked={row.check_terrestre || false}
                              onChange={(e) =>
                                onUpdateRow(
                                  row.id,
                                  "check_terrestre",
                                  e.target.checked
                                )
                              }
                            />{" "}
                            Terrestre
                          </label>
                        </div>
                      </td>
                      <td className={cellClass}>
                        <div className="flex flex-col gap-1">
                          <label className="flex items-center gap-1 text-[10px] text-slate-600">
                            <input
                              type="checkbox"
                              checked={row.check_patente_oficial || false}
                              onChange={(e) =>
                                onUpdateRow(
                                  row.id,
                                  "check_patente_oficial",
                                  e.target.checked
                                )
                              }
                            />{" "}
                            Oficial
                          </label>
                          <input
                            type="text"
                            placeholder="Patente"
                            value={row.patente_oficial || ""}
                            onChange={(e) =>
                              onUpdateRow(
                                row.id,
                                "patente_oficial",
                                e.target.value
                              )
                            }
                            className={getInputClass(
                              row.id,
                              "patente_oficial",
                              "w-full text-[10px] bg-white border border-slate-200 rounded px-1 py-0.5"
                            )}
                          />
                        </div>
                      </td>
                      <td className={cellClass}>
                        <div className="flex flex-col gap-1">
                          <label className="flex items-center gap-1 text-[10px] text-slate-600">
                            <input
                              type="checkbox"
                              checked={row.check_patente_particular || false}
                              onChange={(e) =>
                                onUpdateRow(
                                  row.id,
                                  "check_patente_particular",
                                  e.target.checked
                                )
                              }
                            />{" "}
                            Partic.
                          </label>
                          <input
                            type="text"
                            placeholder="Patente"
                            value={row.patente_particular || ""}
                            onChange={(e) =>
                              onUpdateRow(
                                row.id,
                                "patente_particular",
                                e.target.value
                              )
                            }
                            className={getInputClass(
                              row.id,
                              "patente_particular",
                              "w-full text-[10px] bg-white border border-slate-200 rounded px-1 py-0.5"
                            )}
                          />
                        </div>
                      </td>
                      <td className="px-2 py-2 border-b border-r border-slate-200">
                        <div className="flex flex-col gap-1">
                          <label className="flex items-center gap-1 text-[10px] text-slate-600">
                            <input
                              type="checkbox"
                              checked={row.check_otros || false}
                              onChange={(e) =>
                                onUpdateRow(
                                  row.id,
                                  "check_otros",
                                  e.target.checked
                                )
                              }
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
                                e.target.value
                              )
                            }
                            className={getInputClass(
                              row.id,
                              "transporte_otros",
                              "w-full text-[10px] bg-white border border-slate-200 rounded px-1 py-0.5"
                            )}
                          />
                        </div>
                      </td>
                    </>
                  )}

                  {showExpenses && (
                    <>
                      <td className={cellClass}>
                        <input
                          type="number"
                          value={row.gastos_movilidad || ""}
                          onChange={(e) =>
                            onUpdateRow(
                              row.id,
                              "gastos_movilidad",
                              e.target.value
                            )
                          }
                          className={getInputClass(
                            row.id,
                            "gastos_movilidad",
                            "w-full text-right bg-transparent outline-none border-b border-transparent hover:border-slate-300"
                          )}
                          placeholder="-"
                        />
                      </td>
                      <td className={cellClass}>
                        <input
                          type="number"
                          value={row.gasto_combustible || ""}
                          onChange={(e) =>
                            onUpdateRow(
                              row.id,
                              "gasto_combustible",
                              e.target.value
                            )
                          }
                          className={getInputClass(
                            row.id,
                            "gasto_combustible",
                            "w-full text-right bg-transparent outline-none border-b border-transparent hover:border-slate-300"
                          )}
                          placeholder="-"
                        />
                      </td>
                      <td className={cellClass}>
                        <input
                          type="number"
                          value={row.gasto_otros || ""}
                          onChange={(e) =>
                            onUpdateRow(row.id, "gasto_otros", e.target.value)
                          }
                          className={getInputClass(
                            row.id,
                            "gasto_otros",
                            "w-full text-right bg-transparent outline-none border-b border-transparent hover:border-slate-300"
                          )}
                          placeholder="-"
                        />
                      </td>
                      <td className={cellClass}>
                        <input
                          type="number"
                          value={row.gastos_capacit || ""}
                          onChange={(e) =>
                            onUpdateRow(
                              row.id,
                              "gastos_capacit",
                              e.target.value
                            )
                          }
                          className={getInputClass(
                            row.id,
                            "gastos_capacit",
                            "w-full text-right bg-transparent outline-none border-b border-transparent hover:border-slate-300"
                          )}
                          placeholder="-"
                        />
                      </td>
                      <td className={cellClass}>
                        <input
                          type="number"
                          value={row.gastos_movil_otros || ""}
                          onChange={(e) =>
                            onUpdateRow(
                              row.id,
                              "gastos_movil_otros",
                              e.target.value
                            )
                          }
                          className={getInputClass(
                            row.id,
                            "gastos_movil_otros",
                            "w-full text-right bg-transparent outline-none border-b border-transparent hover:border-slate-300"
                          )}
                          placeholder="-"
                        />
                      </td>
                      <td className={cellClass}>
                        <input
                          type="number"
                          value={row.gasto_alojamiento || ""}
                          onChange={(e) =>
                            onUpdateRow(
                              row.id,
                              "gasto_alojamiento",
                              e.target.value
                            )
                          }
                          className={getInputClass(
                            row.id,
                            "gasto_alojamiento",
                            "w-full text-right bg-transparent outline-none border-b border-transparent hover:border-slate-300"
                          )}
                          placeholder="-"
                        />
                      </td>
                    </>
                  )}

                  <td className="px-3 py-2 text-right font-bold text-slate-900 bg-slate-50 border-b border-l border-slate-200">
                    ${row.totalFinal}
                  </td>

                  {showRendiciones && (
                    <>
                      <td className="px-1 py-2 bg-green-50/20 border-b border-l border-green-100">
                        <input
                          type="number"
                          value={row.rendicion_viaticos || ""}
                          onChange={(e) =>
                            onUpdateRow(
                              row.id,
                              "rendicion_viaticos",
                              e.target.value
                            )
                          }
                          className={getInputClass(
                            row.id,
                            "rendicion_viaticos",
                            "w-full text-right bg-transparent outline-none text-green-700"
                          )}
                        />
                      </td>
                      <td className="px-1 py-2 bg-green-50/20 border-b border-green-100">
                        <input
                          type="number"
                          value={row.rendicion_gasto_alojamiento || ""}
                          onChange={(e) =>
                            onUpdateRow(
                              row.id,
                              "rendicion_gasto_alojamiento",
                              e.target.value
                            )
                          }
                          className={getInputClass(
                            row.id,
                            "rendicion_gasto_alojamiento",
                            "w-full text-right bg-transparent outline-none text-green-700"
                          )}
                        />
                      </td>
                      <td className="px-1 py-2 bg-green-50/20 border-b border-green-100">
                        <input
                          type="number"
                          value={row.rendicion_gasto_pasajes || ""}
                          onChange={(e) =>
                            onUpdateRow(
                              row.id,
                              "rendicion_gasto_pasajes",
                              e.target.value
                            )
                          }
                          className={getInputClass(
                            row.id,
                            "rendicion_gasto_pasajes",
                            "w-full text-right bg-transparent outline-none text-green-700"
                          )}
                        />
                      </td>
                      <td className="px-1 py-2 bg-green-50/20 border-b border-green-100">
                        <input
                          type="number"
                          value={row.rendicion_gasto_combustible || ""}
                          onChange={(e) =>
                            onUpdateRow(
                              row.id,
                              "rendicion_gasto_combustible",
                              e.target.value
                            )
                          }
                          className={getInputClass(
                            row.id,
                            "rendicion_gasto_combustible",
                            "w-full text-right bg-transparent outline-none text-green-700"
                          )}
                        />
                      </td>
                      <td className="px-1 py-2 bg-green-50/20 border-b border-green-100">
                        <input
                          type="number"
                          value={row.rendicion_gastos_movil_otros || ""}
                          onChange={(e) =>
                            onUpdateRow(
                              row.id,
                              "rendicion_gastos_movil_otros",
                              e.target.value
                            )
                          }
                          className={getInputClass(
                            row.id,
                            "rendicion_gastos_movil_otros",
                            "w-full text-right bg-transparent outline-none text-green-700"
                          )}
                        />
                      </td>
                      <td className="px-1 py-2 bg-green-50/20 border-b border-green-100">
                        <input
                          type="number"
                          value={row.rendicion_gastos_capacit || ""}
                          onChange={(e) =>
                            onUpdateRow(
                              row.id,
                              "rendicion_gastos_capacit",
                              e.target.value
                            )
                          }
                          className={getInputClass(
                            row.id,
                            "rendicion_gastos_capacit",
                            "w-full text-right bg-transparent outline-none text-green-700"
                          )}
                        />
                      </td>
                      <td className="px-1 py-2 bg-green-50/20 border-b border-r border-green-100">
                        <input
                          type="number"
                          value={row.rendicion_transporte_otros || ""}
                          onChange={(e) =>
                            onUpdateRow(
                              row.id,
                              "rendicion_transporte_otros",
                              e.target.value
                            )
                          }
                          className={getInputClass(
                            row.id,
                            "rendicion_transporte_otros",
                            "w-full text-right bg-transparent outline-none text-green-700"
                          )}
                        />
                      </td>
                    </>
                  )}

                  <td className="px-2 py-2 text-center border-b border-slate-100">
                    <button
                      onClick={() => onDeleteRow(row.id)}
                      disabled={isDeleting}
                      className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-full transition-colors disabled:opacity-50"
                      title="Eliminar fila"
                    >
                      {isDeleting ? (
                        <IconLoader
                          className="animate-spin text-rose-500"
                          size={16}
                        />
                      ) : (
                        <IconTrash size={16} />
                      )}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
