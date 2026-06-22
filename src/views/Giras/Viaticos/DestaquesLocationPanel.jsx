import React, { useEffect, useImperativeHandle, useMemo, useRef, useState, forwardRef } from "react";
import { 
    IconBus, IconClock, IconAlertTriangle, IconChevronDown, IconChevronUp, 
    IconUsers, IconCheck, IconSettings, 
    IconX, IconCalculator, IconCar, IconMap
} from "../../../components/ui/Icons";
import LocationBulkPanel from "./LocationBulkPanel";
import DestaquesRecorridosModal from "./DestaquesRecorridosModal";
import {
    formatRecorridosSummary,
    parseLugarComisionStored,
} from "../../../utils/destaquesLugarComisionRecorridos";
import {
    DESTAQUES_GENERAL_CONFIG_KEY,
    hasOwnDestaqueValue,
    resolveDestaqueField,
    resolveDestaqueLogisticsField,
} from "../../../utils/destaquesConfigMerge";
import { resolveLocalidadEfectivaViaticos } from "../../../utils/integranteDomicilioViaticos";
import {
    headerInfoToTravelSchedule,
    mergeTravelDataForViaticosPapeles,
} from "../../../utils/viaticosLogisticsSchedule";
import { calculateDaysDiff } from "../../../utils/viaticosDiasComputables";
import DiasComputablesHelp from "./DiasComputablesHelp";
import {
    CUADRO_FIRMAS_ENCARGADO_INTEGRANTE_ID,
    exportDestaquesCuadroFirmasDocx,
    exportDestaquesCuadroFirmasPdf,
    fetchEncargadoCuadroFirmas,
    toCuadroFirmasPerson,
} from "../../../utils/destaquesCuadroFirmasPdf";

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

const parseVisualDateToIso = (visual) => {
    if (!visual) return null;
    const [d, m, y] = visual.split("-");
    if (!d || !m || !y) return null;
    return `${y}-${m}-${d}`;
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

const normalizeScope = (value) =>
  String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

const isStablePerson = (person) =>
  String(person?.condicion || "").trim().toLowerCase() === "estable";

const withStableExportFallbacks = (person) => {
  if (!isStablePerson(person)) return person;

  const cargo = String(person?.cargo || "").trim();
  const jornadaRaw = person?.jornada_laboral ?? person?.jornada ?? "";
  const jornada = String(jornadaRaw || "").trim();

  return {
    ...person,
    cargo: cargo || "Agente administrativo",
    jornada_laboral: jornada || "Horas cátedra",
    jornada: jornada || "Horas cátedra",
  };
};

/** Localidad que es sede de la gira (giras_localidades). */
const isGiraSedeLocalidad = (locId, sedeIdSet) =>
  locId != null &&
  locId !== "unknown" &&
  sedeIdSet?.has?.(String(locId));

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
const CurrencyInput = ({
    value,
    onCommit,
    className,
    placeholder,
    readOnly = false,
    inheritOnClear = false,
    isFallback = false,
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [localValue, setLocalValue] = useState("");

    const handleFocus = (e) => {
        if (readOnly) return;
        setIsEditing(true);
        const rawVal =
            value === 0 || value === "0" || value == null || value === ""
                ? ""
                : String(value);
        setLocalValue(rawVal);
        e.target.select();
    };

    const handleBlur = () => {
        setIsEditing(false);
        if (localValue === "") {
            if (inheritOnClear) {
                if (value != null && value !== "") onCommit(null);
            } else {
                const prev = parseFloat(value || 0);
                if (prev !== 0) onCommit(0);
            }
            return;
        }
        const finalVal = parseFloat(localValue);
        if (isNaN(finalVal)) {
            onCommit(inheritOnClear ? null : 0);
        } else if (finalVal !== parseFloat(value ?? 0)) {
            onCommit(finalVal);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') e.target.blur();
    };

    const fallbackClass = isFallback
        ? "bg-cyan-50 text-cyan-900 border-cyan-300 ring-1 ring-cyan-100"
        : "";

    if (readOnly) {
        return (
            <div
                className={`${className} ${fallbackClass} cursor-default truncate flex items-center justify-end`}
            >
                {formatCurrency(value)}
            </div>
        );
    }

    return (
        <input
            type={isEditing ? "number" : "text"}
            className={`${fallbackClass} ${className}`}
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
const LiveMassiveValuesForm = ({
    locationId,
    config = {},
    destaquesGeneralConfig = null,
    globalConfig,
    logisticsInfo,
    onUpdate,
    feedback,
    onClose,
    isGeneralMode = false,
}) => {
    const localConfig = config || {};
    const isGeneral = isGeneralMode || locationId === DESTAQUES_GENERAL_CONFIG_KEY;

    const resolve = (field) =>
        isGeneral
            ? (localConfig[field] ?? 0)
            : resolveDestaqueField(localConfig, destaquesGeneralConfig, field);

    const isFallbackField = (field) =>
        !isGeneral && !hasOwnDestaqueValue(localConfig, field);

    const resolveLogistics = (field) =>
        isGeneral
            ? (localConfig[field] ?? (field.startsWith("check_") ? false : ""))
            : resolveDestaqueLogisticsField(
                  localConfig,
                  destaquesGeneralConfig,
                  field,
              );

    const isLogisticsFallback = (field) => isFallbackField(field);

    const handleCommit = (field, value) => {
        onUpdate(locationId, { [field]: value });
    };

    const handleLogisticsTextBlur = (field, rawValue) => {
        const v = String(rawValue ?? "").trim();
        const displayed = String(resolveLogistics(field) ?? "");
        if (!isGeneral && v === "") {
            // En localidad: vacío explícito (override), no herencia.
            if (displayed !== "" || hasOwnDestaqueValue(localConfig, field)) {
                handleCommit(field, "");
            }
            return;
        }
        if (v !== displayed) handleCommit(field, v);
    };

    const handleLogisticsCheckChange = (field, checked) => {
        handleCommit(field, checked);
    };

    const handleLogisticsCheckReset = (field, e) => {
        if (isGeneral) return;
        e.preventDefault();
        handleCommit(field, null);
    };

    const logisticsFallbackClass = (field) =>
        isLogisticsFallback(field)
            ? "ring-1 ring-cyan-200 bg-cyan-50/80"
            : "";

    // --- CÁLCULOS DETALLADOS DE VIÁTICO ---
    const dias = isGeneral ? 0 : (logisticsInfo?.dias || localConfig.backup_dias_computables || 0);
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
        totalGastosEst += parseFloat(resolve(col.exp) || 0);
        totalGastosRen += parseFloat(resolve(col.ren) || 0);
    });

    const granTotalEst = totalGastosEst + (isGeneral ? 0 : anticipoViaticoTotal);
    const granTotalRen = totalGastosRen + parseFloat(resolve("rendicion_viatico_monto") || 0);
    const diffFinal = granTotalEst - granTotalRen;

    const StackedCell = ({ expKey, renKey, isReadOnlyExp = false, forceExpValue = null }) => {
        const estVal = forceExpValue !== null ? forceExpValue : resolve(expKey);
        const renVal = resolve(renKey);
        const estFallback = !isReadOnlyExp && isFallbackField(expKey);
        const renFallback = isFallbackField(renKey);
        const diff = (parseFloat(estVal || 0) - parseFloat(renVal || 0));

        return (
            <div className="flex flex-col gap-1 justify-center h-full py-1 min-w-[90px]">
                <CurrencyInput 
                    value={estVal}
                    readOnly={isReadOnlyExp}
                    inheritOnClear={!isGeneral && !isReadOnlyExp}
                    isFallback={estFallback}
                    onCommit={(val) => !isReadOnlyExp && handleCommit(expKey, val)}
                    className={`w-full text-right text-xs font-bold outline-none border-b rounded-sm px-1 py-0.5 transition-colors ${getInputClass(locationId, expKey, feedback, "bg-orange-50 text-orange-900")}`}
                />
                <CurrencyInput 
                    value={renVal}
                    inheritOnClear={!isGeneral}
                    isFallback={renFallback}
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
                <div
                    className={`flex items-center gap-2 mr-2 ${isGeneral ? "text-slate-800" : "text-indigo-800"}`}
                >
                    <IconSettings size={16} />
                    <h4 className="text-sm font-bold uppercase tracking-wide">
                        {isGeneral ? "Config. general (todas las localidades)" : "Configuración"}
                    </h4>
                </div>
                {!isGeneral && (
                    <p className="text-[10px] text-cyan-800 bg-cyan-50 border border-cyan-200 rounded px-2 py-1 max-w-lg">
                        Celeste = heredado del general. Editá para valor propio; borrá para dejar vacío;
                        doble clic para volver al general.
                    </p>
                )}
                {isGeneral && (
                    <p className="text-[10px] text-slate-600 max-w-xl">
                        Valores por defecto de gastos, rendiciones y logística física para todas las
                        localidades al exportar.
                    </p>
                )}
                {!isGeneral && (
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
                        {!isGeneral ? (
                            <DiasComputablesHelp
                                dias={dias}
                                fechaSalida={logisticsInfo?.fechaSalidaIso}
                                horaSalida={logisticsInfo?.horaSalidaIso}
                                fechaLlegada={logisticsInfo?.fechaLlegadaIso}
                                horaLlegada={logisticsInfo?.horaLlegadaIso}
                                valueClassName="font-bold text-indigo-600 text-lg leading-none"
                                iconSize={14}
                            />
                        ) : (
                            <span className="font-bold text-indigo-600 text-lg leading-none">
                                {dias}
                            </span>
                        )}
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
                )}
            </div>

            {/* FILA DE LOGÍSTICA FÍSICA */}
            <div className="mb-3 bg-white p-2 rounded border border-slate-200 shadow-sm flex flex-wrap items-center gap-4 text-xs">
                <div className="font-bold text-indigo-800 uppercase text-[10px] flex items-center gap-1">
                    <IconBus size={12} /> Logística Física:
                </div>

                <div className="flex items-center gap-2 border-r border-slate-100 pr-3">
                    <label
                        className={`flex items-center gap-1 cursor-pointer rounded px-1 ${logisticsFallbackClass("check_aereo")}`}
                        title={!isGeneral ? "Doble clic para volver al valor general" : undefined}
                    >
                        <input
                            type="checkbox"
                            checked={!!resolveLogistics("check_aereo")}
                            onChange={(e) =>
                                handleLogisticsCheckChange("check_aereo", e.target.checked)
                            }
                            onDoubleClick={(e) =>
                                handleLogisticsCheckReset("check_aereo", e)
                            }
                            className="rounded text-indigo-600"
                        />
                        Aéreo
                    </label>
                    <label
                        className={`flex items-center gap-1 cursor-pointer rounded px-1 ${logisticsFallbackClass("check_terrestre")}`}
                        title={!isGeneral ? "Doble clic para volver al valor general" : undefined}
                    >
                        <input
                            type="checkbox"
                            checked={!!resolveLogistics("check_terrestre")}
                            onChange={(e) =>
                                handleLogisticsCheckChange("check_terrestre", e.target.checked)
                            }
                            onDoubleClick={(e) =>
                                handleLogisticsCheckReset("check_terrestre", e)
                            }
                            className="rounded text-indigo-600"
                        />
                        Terr.
                    </label>
                </div>

                <div className="flex items-center gap-2 border-r border-slate-100 pr-3">
                    <label
                        className={`flex items-center gap-1 cursor-pointer font-bold text-slate-600 rounded px-1 ${logisticsFallbackClass("check_patente_oficial")}`}
                        title={!isGeneral ? "Doble clic para volver al valor general" : undefined}
                    >
                        <input
                            type="checkbox"
                            checked={!!resolveLogistics("check_patente_oficial")}
                            onChange={(e) =>
                                handleLogisticsCheckChange(
                                    "check_patente_oficial",
                                    e.target.checked,
                                )
                            }
                            onDoubleClick={(e) =>
                                handleLogisticsCheckReset("check_patente_oficial", e)
                            }
                            className="rounded text-indigo-600"
                        />
                        OFICIAL
                    </label>
                    <input
                        key={`${locationId}-patente_oficial-${String(resolveLogistics("patente_oficial") || "")}-${hasOwnDestaqueValue(localConfig, "patente_oficial")}`}
                        type="text"
                        placeholder="Patente"
                        defaultValue={String(resolveLogistics("patente_oficial") || "")}
                        onBlur={(e) =>
                            handleLogisticsTextBlur("patente_oficial", e.target.value)
                        }
                        onDoubleClick={(e) => {
                            if (isGeneral) return;
                            e.preventDefault();
                            handleCommit("patente_oficial", null);
                        }}
                        title={!isGeneral ? "Doble clic para volver al valor general" : undefined}
                        className={`border border-slate-200 rounded px-1.5 py-0.5 w-20 outline-none uppercase text-xs focus:ring-1 focus:ring-indigo-500 ${logisticsFallbackClass("patente_oficial")} ${getInputClass(locationId, "patente_oficial", feedback, "bg-slate-50")}`}
                    />
                </div>

                <div className="flex items-center gap-2 border-r border-slate-100 pr-3">
                    <label
                        className={`flex items-center gap-1 cursor-pointer text-slate-600 rounded px-1 ${logisticsFallbackClass("check_patente_particular")}`}
                        title={!isGeneral ? "Doble clic para volver al valor general" : undefined}
                    >
                        <input
                            type="checkbox"
                            checked={!!resolveLogistics("check_patente_particular")}
                            onChange={(e) =>
                                handleLogisticsCheckChange(
                                    "check_patente_particular",
                                    e.target.checked,
                                )
                            }
                            onDoubleClick={(e) =>
                                handleLogisticsCheckReset("check_patente_particular", e)
                            }
                            className="rounded text-indigo-600"
                        />
                        Particular
                    </label>
                    <input
                        key={`${locationId}-patente_particular-${String(resolveLogistics("patente_particular") || "")}-${hasOwnDestaqueValue(localConfig, "patente_particular")}`}
                        type="text"
                        placeholder="Patente"
                        defaultValue={String(resolveLogistics("patente_particular") || "")}
                        onBlur={(e) =>
                            handleLogisticsTextBlur("patente_particular", e.target.value)
                        }
                        onDoubleClick={(e) => {
                            if (isGeneral) return;
                            e.preventDefault();
                            handleCommit("patente_particular", null);
                        }}
                        title={!isGeneral ? "Doble clic para volver al valor general" : undefined}
                        className={`border border-slate-200 rounded px-1.5 py-0.5 w-20 outline-none uppercase text-xs focus:ring-1 focus:ring-indigo-500 ${logisticsFallbackClass("patente_particular")} ${getInputClass(locationId, "patente_particular", feedback, "bg-slate-50")}`}
                    />
                </div>

                <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                    <label
                        className={`flex items-center gap-1 cursor-pointer text-slate-600 rounded px-1 shrink-0 ${logisticsFallbackClass("check_otros")}`}
                        title={!isGeneral ? "Doble clic para volver al valor general" : undefined}
                    >
                        <input
                            type="checkbox"
                            checked={!!resolveLogistics("check_otros")}
                            onChange={(e) =>
                                handleLogisticsCheckChange("check_otros", e.target.checked)
                            }
                            onDoubleClick={(e) =>
                                handleLogisticsCheckReset("check_otros", e)
                            }
                            className="rounded text-indigo-600"
                        />
                        Otros
                    </label>
                    <input
                        key={`${locationId}-transporte_otros-${String(resolveLogistics("transporte_otros") || "")}-${hasOwnDestaqueValue(localConfig, "transporte_otros")}`}
                        type="text"
                        defaultValue={String(resolveLogistics("transporte_otros") || "")}
                        onBlur={(e) =>
                            handleLogisticsTextBlur("transporte_otros", e.target.value)
                        }
                        onDoubleClick={(e) => {
                            if (isGeneral) return;
                            e.preventDefault();
                            handleCommit("transporte_otros", null);
                        }}
                        placeholder="Detalle (Combi, etc)"
                        title={!isGeneral ? "Doble clic para volver al valor general" : undefined}
                        className={`border border-slate-200 rounded px-2 py-0.5 text-xs w-full outline-none focus:ring-1 focus:ring-indigo-500 ${logisticsFallbackClass("transporte_otros")} ${getInputClass(locationId, "transporte_otros", feedback, "bg-white")}`}
                    />
                </div>
            </div>

            {/* TABLA HORIZONTAL */}
            <div className="overflow-x-auto border border-slate-200 rounded-lg bg-white">
                <table className="w-full text-xs border-separate border-spacing-0">
                    <thead>
                        <tr className="bg-slate-100 text-[10px] uppercase text-slate-500">
                            {!isGeneral ? (
                            <th className="px-2 py-2 text-right font-bold w-28 border-b border-r border-slate-200 bg-indigo-50 text-indigo-800">
                                Viático Personal
                            </th>
                            ) : (
                            <th className="px-2 py-2 text-right font-bold w-28 border-b border-r border-slate-200 bg-indigo-50 text-indigo-800">
                                Rend. Viático
                            </th>
                            )}
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
                                {isGeneral ? (
                                    <CurrencyInput
                                        value={resolve("rendicion_viatico_monto")}
                                        onCommit={(val) => handleCommit("rendicion_viatico_monto", val)}
                                        className={`w-full text-right text-xs font-bold outline-none border-b rounded-sm px-1 py-0.5 transition-colors ${getInputClass(locationId, "rendicion_viatico_monto", feedback, "bg-emerald-50 text-emerald-900")}`}
                                    />
                                ) : (
                                <StackedCell 
                                    expKey="viatico_calculado_dummy" 
                                    renKey="rendicion_viatico_monto"
                                    isReadOnlyExp={true}
                                    forceExpValue={anticipoViaticoTotal}
                                />
                                )}
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
const LocationGroupItem = ({ group, isSelected, onToggleSelect, locationConfig, destaquesGeneralConfig, showBackup, onUpdateConfig, feedback, globalConfig, isGiraSede = false }) => {
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
    
    const hInfo = group.headerInfo;
    const salidaIso = hInfo?.fecha ? parseVisualDateToIso(hInfo.fecha) : null;
    const llegadaIso = hInfo?.fecha_llegada ? parseVisualDateToIso(hInfo.fecha_llegada) : null;
    const calculatedDays = hInfo
        ? calculateDaysDiff(
            salidaIso,
            hInfo.hora,
            llegadaIso,
            hInfo.hora_llegada
          )
        : 0;

    const logisticsInfo = {
        fechaSalida: group.headerInfo?.fecha,
        horaSalida: group.headerInfo?.hora,
        fechaLlegada: group.headerInfo?.fecha_llegada,
        horaLlegada: group.headerInfo?.hora_llegada,
        fechaSalidaIso: salidaIso,
        horaSalidaIso: hInfo?.hora,
        fechaLlegadaIso: llegadaIso,
        horaLlegadaIso: hInfo?.hora_llegada,
        dias: calculatedDays || locationConfig?.backup_dias_computables || 0,
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
                            {isGiraSede && (
                                <span className="text-[8px] font-bold bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded shrink-0">Sede local</span>
                            )}
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

                            <div className="flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded text-slate-700 border border-slate-200 font-bold text-[10px]">
                                <IconClock size={10} />
                                <DiasComputablesHelp
                                    dias={logisticsInfo.dias}
                                    fechaSalida={salidaIso}
                                    horaSalida={hInfo?.hora}
                                    fechaLlegada={llegadaIso}
                                    horaLlegada={hInfo?.hora_llegada}
                                    valueClassName="text-slate-700"
                                    iconSize={12}
                                />
                                <span>días</span>
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
                    destaquesGeneralConfig={destaquesGeneralConfig}
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

const DestaquesLocationPanel = forwardRef(function DestaquesLocationPanel({ 
    supabase,
    roster, 
    configs,
    destaquesGeneralConfig,
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
    exportDetail,
    globalConfig,
    giraLabel = "",
    showBackup = false,
    onSelectionToolbarChange,
    exportFailureLog = [],
    onClearExportFailureLog,
    giraSedeLocalidadIds = [],
}, ref) {
   const [selectedGroupIds, setSelectedGroupIds] = useState([]);
    const [isExportingFirmas, setIsExportingFirmas] = useState(false);
    const [showGeneralDestaquesConfig, setShowGeneralDestaquesConfig] = useState(false);
    const [showRecorridosModal, setShowRecorridosModal] = useState(false);
    /** null = mostrar valor guardado; string = edición manual (reemplaza recorridos al guardar). */
    const [manualLugarComision, setManualLugarComision] = useState(null);

    // Protección de Arrays
    const transportMap = useMemo(() => { 
        const map = {}; 
        (transportesList || []).forEach(t => map[t.id] = t); 
        return map; 
    }, [transportesList]);

    const giraSedeSet = useMemo(
        () => new Set((giraSedeLocalidadIds || []).map((id) => String(id))),
        [giraSedeLocalidadIds],
    );

    const groupedData = useMemo(() => {
        const groups = {};
        (roster || []).forEach(person => {
            if (person.estado_gira === 'ausente') return;
            const hasIndividual = existingViaticosIds.includes(person.id);
            if (person.condicion !== 'Estable') return;
            const normalize = (s) => (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            const role = normalize(person.rol_gira || person.rol);
            if (!role.includes("music") && !role.includes("solista")) return;

            const locEfectiva = resolveLocalidadEfectivaViaticos(person);
            const locName = (locEfectiva.nombre || "Sin Localidad").trim();
            const currentLocId = locEfectiva.id ?? "unknown";

            // Buscamos reglas por Localidad y, si no hay match directo, también por Región.
            // Prioridad: Localidad > Región > General.
            const currentRegionId =
              locEfectiva.regionId ??
              person.id_region ??
              null;
            const findBestRouteRule = (lid, rid, eventField) => {
                const rules = Array.isArray(routeRules) ? routeRules : [];
                let best = null;
                let bestScore = -1;

                rules.forEach((r) => {
                    if (!r?.[eventField]) return;
                    const scope = normalizeScope(r.alcance);
                    const byLocalidad =
                      String(r.id_localidad || "") === String(lid) ||
                      (Array.isArray(r.target_localities) &&
                        r.target_localities.some((x) => String(x) === String(lid)));
                    const byRegion =
                      String(r.id_region || "") === String(rid) ||
                      (Array.isArray(r.target_regions) &&
                        r.target_regions.some((x) => String(x) === String(rid)));

                    let score = 0;
                    if (scope === "localidad" && byLocalidad) score = 3;
                    else if (scope === "region" && byRegion) score = 2;
                    else if (scope === "general") score = 1;
                    else if (byLocalidad) score = 3;
                    else if (byRegion) score = 2;

                    if (score > bestScore) {
                        best = r;
                        bestScore = score;
                    }
                });

                return best;
            };
            
            const buildHeaderInfo = (ruleSubida, ruleBajada = null) => {
                const subidaRule = ruleSubida || null;
                const bajadaRule = ruleBajada || ruleSubida || null;
                if (!subidaRule?.evento_subida && !bajadaRule?.evento_bajada) return null;
                const evt = subidaRule?.evento_subida || null;
                const evtLlegada = bajadaRule?.evento_bajada || null;
                const bus = transportMap[subidaRule?.id_transporte_fisico || bajadaRule?.id_transporte_fisico];
                const tNombre = bus?.transportes?.nombre || bus?.nombre || "Transporte";
                const tDetalle = bus?.detalle ? ` - ${bus.detalle}` : ""; 
                return { 
                    hora: evt?.hora_inicio ? evt.hora_inicio.slice(0,5) : null, 
                    fecha: evt?.fecha ? formatDateVisual(evt.fecha) : null, 
                    fecha_iso: evt?.fecha || null,
                    hora_llegada: evtLlegada?.hora_inicio ? evtLlegada.hora_inicio.slice(0,5) : null,
                    fecha_llegada: evtLlegada?.fecha ? formatDateVisual(evtLlegada.fecha) : null,
                    fecha_llegada_iso: evtLlegada?.fecha || null,
                    transporte: `${tNombre}${tDetalle}`.trim() 
                };
            };

            if(!groups[locName]) {
                const bestSubidaRule = findBestRouteRule(currentLocId, currentRegionId, "evento_subida");
                const bestBajadaRule = findBestRouteRule(currentLocId, currentRegionId, "evento_bajada");
                const headerInfo = buildHeaderInfo(bestSubidaRule, bestBajadaRule);
                groups[locName] = { 
                    id: currentLocId, 
                    name: locName, 
                    headerInfo, 
                    people: [] 
                };
            } else {
                if (!groups[locName].headerInfo) {
                    const betterSubidaRule = findBestRouteRule(currentLocId, currentRegionId, "evento_subida");
                    const betterBajadaRule = findBestRouteRule(currentLocId, currentRegionId, "evento_bajada");
                    if (betterSubidaRule || betterBajadaRule) {
                        groups[locName].id = currentLocId;
                        groups[locName].headerInfo = buildHeaderInfo(betterSubidaRule, betterBajadaRule);
                    }
                }
            }
            
            const baseTravel = logisticsMap?.[person.id] || {};
            const grp = groups[locName];
            if (!grp) return;

            const localityTravel = grp.headerInfo
                ? headerInfoToTravelSchedule(grp.headerInfo)
                : null;
            let travelData = mergeTravelDataForViaticosPapeles(
                baseTravel,
                localityTravel,
                person,
            );

            if (grp.headerInfo && !grp.headerInfo.hora_llegada && travelData.fecha_llegada) {
                grp.headerInfo.fecha_llegada = formatDateVisual(travelData.fecha_llegada);
                grp.headerInfo.hora_llegada = travelData.hora_llegada?.slice(0, 5);
            }

            if (travelData.fecha_salida || travelData.fecha_llegada) {
                grp.people.push({ ...person, travelData, hasIndividual });
            }
        });
        return Object.values(groups).sort((a, b) => {
            const aLocal = isGiraSedeLocalidad(a.id, giraSedeSet) ? 1 : 0;
            const bLocal = isGiraSedeLocalidad(b.id, giraSedeSet) ? 1 : 0;
            if (aLocal !== bLocal) return aLocal - bLocal;
            return b.people.length - a.people.length;
        });
    }, [roster, logisticsMap, existingViaticosIds, routeRules, transportMap, giraSedeSet]);

    const handleToggleSelect = (id) => {
        setSelectedGroupIds(prev => {
            if (prev.includes(id)) return prev.filter(gId => gId !== id);
            return [...prev, id];
        });
    };

    const allLocationIds = useMemo(() => groupedData.map((g) => g.id), [groupedData]);
    const nonLocalLocationIds = useMemo(
        () => allLocationIds.filter((id) => !isGiraSedeLocalidad(id, giraSedeSet)),
        [allLocationIds, giraSedeSet],
    );
    const allLocationsSelected =
        allLocationIds.length > 0 &&
        allLocationIds.every((id) => selectedGroupIds.includes(id));
    const allNonLocalSelected =
        nonLocalLocationIds.length > 0 &&
        nonLocalLocationIds.every((id) => selectedGroupIds.includes(id));
    const masterCheckboxRef = useRef(null);

    useEffect(() => {
        const el = masterCheckboxRef.current;
        if (!el) return;
        const n = allLocationIds.filter((id) => selectedGroupIds.includes(id)).length;
        el.indeterminate = n > 0 && n < allLocationIds.length;
    }, [allLocationIds, selectedGroupIds]);

    const handleToggleAllLocations = () => {
        if (allLocationsSelected) {
            setSelectedGroupIds([]);
            return;
        }
        if (!allNonLocalSelected) {
            setSelectedGroupIds(
                nonLocalLocationIds.length > 0
                    ? [...nonLocalLocationIds]
                    : [...allLocationIds],
            );
            return;
        }
        setSelectedGroupIds([...allLocationIds]);
    };

    const handleSelectPendingClick = () => {
        if (selectedGroupIds.length > 0) {
            setSelectedGroupIds([]);
            return;
        }
        const pendingIds = groupedData
            .filter((g) => {
                const exportedIds = configs[g.id]?.ids_exportados_viatico || [];
                return g.people.some(
                    (p) =>
                        !p.hasIndividual &&
                        !exportedIds.includes(Number(p.id)),
                );
            })
            .map((g) => g.id);
        setSelectedGroupIds(pendingIds);
    };

    useImperativeHandle(ref, () => ({
        togglePendingSelection: handleSelectPendingClick,
    }));

    useEffect(() => {
        if (typeof onSelectionToolbarChange !== "function") return;
        onSelectionToolbarChange({
            canSelect: groupedData.length > 0,
            label:
                selectedGroupIds.length > 0
                    ? "Deseleccionar todo"
                    : "Sel. pendientes",
        });
    }, [
        groupedData.length,
        selectedGroupIds.length,
        onSelectionToolbarChange,
    ]);

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

    const collectPeopleForExport = (exportScope) => {
        const peopleToExport = [];
        const locationIds = [];

        selectedGroupIds.forEach((groupId) => {
            const group = groupedData.find((g) => g.id === groupId);
            if (!group) return;
            const massConfig = configs[groupId] || {};
            const salidaIso = group.headerInfo?.fecha
                ? parseVisualDateToIso(group.headerInfo.fecha)
                : null;
            const llegadaIso = group.headerInfo?.fecha_llegada
                ? parseVisualDateToIso(group.headerInfo.fecha_llegada)
                : null;
            const localityDaysFromHeader = group.headerInfo
                ? calculateDaysDiff(
                      salidaIso,
                      group.headerInfo.hora,
                      llegadaIso,
                      group.headerInfo.hora_llegada,
                  )
                : 0;
            const localityDays =
                localityDaysFromHeader || massConfig.backup_dias_computables || 0;

            const exportedIds = configs[groupId]?.ids_exportados_viatico || [];
            let validPeople = group.people.filter((p) => !p.hasIndividual);

            if (exportScope === "pending") {
                validPeople = validPeople.filter(
                    (p) => !exportedIds.includes(Number(p.id)),
                );
            }

            if (validPeople.length === 0) return;

            validPeople.forEach((p) => {
                const travelFromHeader = group.headerInfo
                    ? headerInfoToTravelSchedule(group.headerInfo)
                    : null;

                peopleToExport.push(
                    withStableExportFallbacks({
                        ...p,
                        _massConfigId: groupId,
                        _groupName: group.name,
                        _diasComputablesLocalidad: localityDays,
                        travelData: mergeTravelDataForViaticosPapeles(
                            p.travelData,
                            travelFromHeader,
                            p,
                        ),
                    }),
                );
            });
            locationIds.push(groupId);
        });

        return { peopleToExport, locationIds };
    };

    const handleBulkExport = (optionsFromChild) => {
        const { unificationMode, exportScope, ...cleanOptions } = optionsFromChild;
        const { peopleToExport, locationIds } = collectPeopleForExport(exportScope);

        if (peopleToExport.length === 0) {
            alert("No hay personas para exportar con el criterio seleccionado.");
            return;
        }

        onExportBatch(
            peopleToExport,
            null,
            { ...cleanOptions, unificationMode, localityNameById },
            locationIds,
        );
    };

    const resolveEncargadoCuadroFirmas = async () => {
        const fromRoster = (roster || []).find(
            (p) => Number(p.id) === CUADRO_FIRMAS_ENCARGADO_INTEGRANTE_ID,
        );
        if (fromRoster) return toCuadroFirmasPerson(fromRoster);
        return fetchEncargadoCuadroFirmas(supabase);
    };

    const handleExportCuadroFirmas = async (exportScope, format = "pdf") => {
        const { peopleToExport } = collectPeopleForExport(exportScope);
        const encargado = await resolveEncargadoCuadroFirmas();

        if (peopleToExport.length === 0 && !encargado) {
            alert("No hay personas para el cuadro de firmas con el criterio seleccionado.");
            return;
        }

        setIsExportingFirmas(true);
        try {
            const exporter =
                format === "docx"
                    ? exportDestaquesCuadroFirmasDocx
                    : exportDestaquesCuadroFirmasPdf;
            await exporter({
                people: peopleToExport,
                encargado,
                giraLabel,
                supabase,
            });
        } catch (err) {
            console.error("Cuadro de firmas:", err);
            alert(err?.message || "No se pudo generar el cuadro de firmas.");
        } finally {
            setIsExportingFirmas(false);
        }
    };

    const currentGlobalPct = globalConfig?.porcentaje_destaques !== undefined ? parseFloat(globalConfig.porcentaje_destaques) : 100;

    const localitiesForRecorridos = useMemo(() => {
        const byId = new Map();
        const add = (id, name) => {
            if (id == null || id === "unknown") return;
            const numId = Number(id);
            if (Number.isNaN(numId)) return;
            const label = String(name || "").trim() || `#${numId}`;
            if (!byId.has(numId)) byId.set(numId, { id: numId, name: label });
        };
        (groupedData || []).forEach((g) => add(g.id, g.name));
        (roster || []).forEach((person) => {
            const loc = resolveLocalidadEfectivaViaticos(person);
            add(loc.id, loc.nombre);
        });
        return [...byId.values()].sort((a, b) =>
            a.name.localeCompare(b.name, "es"),
        );
    }, [groupedData, roster]);

    const localityNameById = useMemo(() => {
        const m = {};
        localitiesForRecorridos.forEach((loc) => {
            m[loc.id] = loc.name;
            m[String(loc.id)] = loc.name;
        });
        return m;
    }, [localitiesForRecorridos]);

    const lugarComisionStored = globalConfig?.lugar_comision_destaques_exportacion ?? "";
    const lugarComisionParsed = useMemo(
        () => parseLugarComisionStored(lugarComisionStored),
        [lugarComisionStored],
    );
    const lugarComisionEsRecorridos = lugarComisionParsed.tipo === "recorridos";
    const lugarComisionDisplay = lugarComisionEsRecorridos
        ? formatRecorridosSummary(lugarComisionParsed, localityNameById)
        : lugarComisionStored;

    const lugarComisionInputValue =
        manualLugarComision !== null
            ? manualLugarComision
            : lugarComisionEsRecorridos
              ? lugarComisionDisplay
              : lugarComisionStored;

    const lugarComisionViendoRecorridos =
        lugarComisionEsRecorridos && manualLugarComision === null;

    useEffect(() => {
        setManualLugarComision(null);
    }, [lugarComisionStored]);

    return (
        <div className="relative pb-20">
            {/* HEADER CON SELECTOR GLOBAL */}
            <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-3 bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                <div className="text-xs text-slate-500">
                    Mostrando <b>{groupedData.length}</b> localidades. 
                </div>
                
                <div className="flex flex-wrap items-center gap-3">
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
                    <div className="flex items-center gap-2 min-w-0 flex-1 max-w-md">
                        <span className="text-xs font-bold text-slate-700 uppercase tracking-wide shrink-0">Motivo:</span>
                        <input
                            type="text"
                            className="flex-1 min-w-0 bg-white border border-slate-200 rounded px-2 py-1 text-xs"
                            placeholder="Para el PDF (fallback: motivo general)"
                            value={globalConfig?.motivo_destaques_exportacion || ""}
                            onChange={(e) => onUpdateGlobalConfig('motivo_destaques_exportacion', e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-2 min-w-0 flex-1 max-w-lg">
                        <span className="text-xs font-bold text-slate-700 uppercase tracking-wide shrink-0">Lugar Comisión:</span>
                        <input
                            type="text"
                            className={`flex-1 min-w-0 border rounded px-2 py-1 text-xs ${
                                lugarComisionViendoRecorridos
                                    ? "bg-cyan-50/80 border-cyan-200 text-cyan-950"
                                    : "bg-white border-slate-200"
                            }`}
                            placeholder={
                                lugarComisionViendoRecorridos
                                    ? "Clic para escribir texto fijo (reemplaza recorridos)"
                                    : "Texto fijo para todos o recorridos (botón mapa)"
                            }
                            value={lugarComisionInputValue}
                            onFocus={() => {
                                if (lugarComisionViendoRecorridos) {
                                    setManualLugarComision("");
                                }
                            }}
                            onChange={(e) => {
                                const v = e.target.value;
                                setManualLugarComision(v);
                                onUpdateGlobalConfig(
                                    "lugar_comision_destaques_exportacion",
                                    v,
                                );
                            }}
                            onBlur={() => setManualLugarComision(null)}
                            title={
                                lugarComisionViendoRecorridos
                                    ? "Recorridos activos. Escribí aquí para usar el mismo texto en todos los PDF (sin recorridos)."
                                    : "Texto fijo en el PDF para todos los destaques"
                            }
                        />
                        <button
                            type="button"
                            onClick={() => setShowRecorridosModal(true)}
                            className="shrink-0 flex items-center gap-1 px-2 py-1 rounded border border-indigo-200 bg-indigo-50 text-indigo-800 text-[10px] font-bold hover:bg-indigo-100"
                            title="Configurar recorridos de localidades"
                        >
                            <IconMap size={14} />
                            Recorridos
                        </button>
                    </div>
                </div>
            </div>

            {exportFailureLog.length > 0 && (
                <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50/90 p-3 text-xs shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                        <p className="font-bold text-amber-900">
                            Registro de exportación: no se pudo completar algo para estas personas
                        </p>
                        {typeof onClearExportFailureLog === "function" && (
                            <button
                                type="button"
                                onClick={onClearExportFailureLog}
                                className="shrink-0 rounded border border-amber-300 bg-white px-2 py-0.5 text-[10px] font-bold text-amber-900 hover:bg-amber-100"
                            >
                                Limpiar registro
                            </button>
                        )}
                    </div>
                    <ul className="max-h-40 space-y-1.5 overflow-y-auto font-mono text-[11px] text-amber-950">
                        {exportFailureLog.map((row, i) => (
                            <li
                                key={`${row.ts}-${row.personId}-${i}`}
                                className="border-b border-amber-100/80 pb-1 last:border-0"
                            >
                                <span className="text-amber-700/90">
                                    {row.ts
                                        ? new Date(row.ts).toLocaleString("es-AR")
                                        : "—"}
                                </span>
                                {" · "}
                                <span className="font-semibold">{row.personLabel}</span>
                                {" · "}
                                <span>{row.item}</span>
                                {row.message ? (
                                    <span className="block text-amber-800/90 mt-0.5">
                                        {row.message}
                                    </span>
                                ) : null}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <div className="mb-4 border border-slate-300 rounded-lg overflow-hidden shadow-sm bg-white">
                <button
                    type="button"
                    onClick={() => setShowGeneralDestaquesConfig((v) => !v)}
                    className="w-full px-4 py-3 flex items-center justify-between gap-2 bg-slate-800 hover:bg-slate-900 transition-colors text-left text-white"
                >
                    <span className="text-sm font-bold flex items-center gap-2">
                        <IconSettings size={16} className="shrink-0 text-white" aria-hidden />
                        Configuración general de localidades (gastos, rendiciones y logística física)
                    </span>
                    {showGeneralDestaquesConfig ? (
                        <IconChevronUp size={18} className="shrink-0 text-white" aria-hidden />
                    ) : (
                        <IconChevronDown size={18} className="shrink-0 text-white" aria-hidden />
                    )}
                </button>
                {showGeneralDestaquesConfig && (
                    <LiveMassiveValuesForm
                        locationId={DESTAQUES_GENERAL_CONFIG_KEY}
                        config={destaquesGeneralConfig || {}}
                        destaquesGeneralConfig={null}
                        globalConfig={globalConfig}
                        logisticsInfo={null}
                        onUpdate={onSaveLocationConfig}
                        feedback={feedback}
                        onClose={() => setShowGeneralDestaquesConfig(false)}
                        isGeneralMode
                    />
                )}
            </div>

            {groupedData.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 mb-2 px-2 py-2 bg-slate-50 border border-slate-200 rounded-lg">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 select-none">
                        <input
                            ref={masterCheckboxRef}
                            type="checkbox"
                            checked={allLocationsSelected}
                            onChange={handleToggleAllLocations}
                            className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                            title="1.er clic: solo localidades de gira (no sedes locales). 2.º clic: incluye sedes locales. 3.er clic: deselecciona todo."
                        />
                        Todas las localidades
                    </label>
                </div>
            )}

            <div className={`space-y-3 transition-all duration-300 ${selectedGroupIds.length > 0 ? 'pr-[340px]' : ''}`}>
                {groupedData.map(group => (
                    <LocationGroupItem 
                        key={group.id} 
                        group={group} 
                        isSelected={selectedGroupIds.includes(group.id)}
                        onToggleSelect={handleToggleSelect}
                        locationConfig={configs[group.id]}
                        destaquesGeneralConfig={destaquesGeneralConfig}
                        showBackup={showBackup}
                        onUpdateConfig={onSaveLocationConfig}
                        feedback={feedback}
                        globalConfig={globalConfig}
                        isGiraSede={isGiraSedeLocalidad(group.id, giraSedeSet)}
                    />
                ))}
            </div>

            {selectedGroupIds.length > 0 && (
                <div className="fixed inset-y-0 right-0 w-80 bg-white shadow-2xl z-[60] flex flex-col animate-in slide-in-from-right duration-300 border-l border-slate-200">
                    <button onClick={() => setSelectedGroupIds([])} className="absolute top-2 right-2 z-[70] bg-white/80 hover:bg-slate-100 text-slate-400 hover:text-red-500 rounded-full p-1.5 transition-colors shadow-sm border border-slate-100"><IconX size={16} /></button>
                    <div className="h-full w-full overflow-y-auto">
                        <LocationBulkPanel 
                            selectionStats={selectionStats}
                            porcentajeDestaques={globalConfig?.porcentaje_destaques}
                            onClose={() => setSelectedGroupIds([])}
                            onExport={handleBulkExport}
                            onExportCuadroFirmas={handleExportCuadroFirmas}
                            loading={isExporting}
                            isExporting={isExporting}
                            isExportingFirmas={isExportingFirmas}
                            exportStatus={exportStatus}
                            exportDetail={exportDetail}
                        />
                    </div>
                </div>
            )}

            <DestaquesRecorridosModal
                isOpen={showRecorridosModal}
                onClose={() => setShowRecorridosModal(false)}
                storedValue={lugarComisionStored}
                localities={localitiesForRecorridos}
                onSave={(val) => onUpdateGlobalConfig("lugar_comision_destaques_exportacion", val)}
            />
        </div>
    );
});

export default DestaquesLocationPanel;