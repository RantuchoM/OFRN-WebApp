import React, { useState, useEffect, useMemo, useRef } from "react";
import * as XLSX from "xlsx";
import ExcelJS from "exceljs";
import {
  format,
  differenceInYears,
  addDays,
  addHours,
  addMinutes,
} from "date-fns";
import { es } from "date-fns/locale";

import {
  IconTrash,
  IconTruck,
  IconPlus,
  IconMapPin,
  IconSearch,
  IconX,
  IconClock,
  IconChevronDown,
  IconEdit,
  IconSave,
  IconCheck,
  IconUpload,
  IconDownload,
  IconFileText,
  IconUsers,
  IconAlertTriangle,
  IconBus,
  IconCheckCircle,
  IconList,
} from "../../components/ui/Icons";
import DateInput from "../../components/ui/DateInput";
import TimeInput from "../../components/ui/TimeInput";
import SearchableSelect from "../../components/ui/SearchableSelect";
import CnrtExportModal from "./CnrtExportModal";
import ItineraryManagerModal from "./ItineraryManagerModal";
import BoardingManagerModal from "./BoardingManagerModal";
import StopRulesManager from "./StopRulesManager";
import TransportAdmissionModal from "./TransportAdmissionModal";
import DataIntegrityIndicator from "../../components/DataIntegrityIndicator";
import { useLogistics, matchesRule } from "../../hooks/useLogistics";

import { toast } from "sonner";

const TIPO_EVENTO_DEFAULT = 11;
const TIPO_EVENTO_ALT = 12;

// --- UTILIDADES ---
const formatDateSafe = (dateString) => {
  if (!dateString) return "-";
  try {
    const [year, month, day] = dateString.split("-");
    return `${day}/${month}`;
  } catch (e) {
    return dateString;
  }
};

const downloadStyledExcel = async (
  passengers,
  fileName = "Lista_Pasajeros.xlsx",
) => {
  if (!passengers || passengers.length === 0)
    return alert("No hay pasajeros para exportar.");
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Pasajeros");

  worksheet.columns = [
    { header: "APELLIDO", key: "apellido", width: 25 },
    { header: "NOMBRE", key: "nombre", width: 25 },
    { header: "DOC. TIPO", key: "tipo_documento", width: 12 },
    { header: "NÚMERO", key: "numero_documento", width: 18 },
    { header: "SEXO", key: "sexo", width: 10 },
    { header: "MENOR", key: "menor", width: 10 },
    { header: "BUTACA", key: "ocupa_butaca", width: 12 },
    { header: "NACIONALIDAD", key: "nacionalidad", width: 18 },
    { header: "FECHA NAC.", key: "fecha_nacimiento", width: 15 },
  ];

  worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  worksheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF2E7D32" },
  };
  worksheet.getRow(1).alignment = { horizontal: "center", vertical: "middle" };

  passengers.forEach((p) => {
    const birthDate = p.fecha_nac ? new Date(p.fecha_nac) : new Date();
    const age = differenceInYears(new Date(), birthDate);
    const isMinor = age < 18;
    let formattedDate = "";
    if (p.fecha_nac) {
      const d = new Date(p.fecha_nac);
      d.setMinutes(d.getMinutes() + d.getTimezoneOffset());
      formattedDate = format(d, "dd/MMM/yyyy", { locale: es }).toLowerCase();
    }
    worksheet.addRow({
      apellido: p.apellido?.toUpperCase() || "",
      nombre: p.nombre?.toUpperCase() || "",
      tipo_documento: "DNI",
      numero_documento: p.dni || "",
      sexo: p.genero || "",
      menor: isMinor ? 1 : 0,
      ocupa_butaca: isMinor ? "NO" : "SÍ",
      nacionalidad: p.nacionalidad || "Argentina",
      fecha_nacimiento: formattedDate,
    });
  });

  worksheet.eachRow((row) => {
    row.eachCell((cell) => {
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });
  });
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  window.URL.revokeObjectURL(url);
};

const generateStopsOnlyExcel = async (
  transportName,
  events,
  startId,
  endId,
) => {
  const sortedEvts = [...events].sort((a, b) =>
    (a.fecha + a.hora_inicio).localeCompare(b.fecha + b.hora_inicio),
  );
  const startIndex = sortedEvts.findIndex(
    (e) => String(e.id) === String(startId),
  );
  const endIndex = sortedEvts.findIndex((e) => String(e.id) === String(endId));
  const activeEvents = sortedEvts.slice(startIndex, endIndex + 1);

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Hoja de Paradas");

  worksheet.columns = [
    { header: "FECHA", key: "fecha", width: 25 },
    { header: "HORA", key: "hora", width: 12 },
    { header: "NOTA", key: "nota", width: 35 },
    { header: "LOCACIÓN", key: "locacion", width: 35 },
    { header: "DIRECCIÓN", key: "direccion", width: 35 },
    { header: "LOCALIDAD", key: "localidad", width: 25 },
  ];

  worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  worksheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF4F46E5" },
  };

  activeEvents.forEach((evt) => {
    let formattedDate = "-";
    if (evt.fecha) {
      const dateObj = new Date(evt.fecha + "T12:00:00");
      const dayName = format(dateObj, "EEEE", { locale: es });
      const dayNum = format(dateObj, "dd/MM");
      formattedDate = `${dayName.charAt(0).toUpperCase() + dayName.slice(1)}, ${dayNum}`;
    }

    worksheet.addRow({
      fecha: formattedDate,
      hora: evt.hora_inicio ? evt.hora_inicio.slice(0, 5) : "--:--",
      nota: (evt.descripcion || "").toUpperCase(),
      locacion: evt.locaciones?.nombre || "-",
      direccion: evt.locaciones?.direccion || "-",
      localidad: evt.locaciones?.localidades?.localidad || "-",
    });
  });

  worksheet.eachRow((row) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
      cell.alignment = { vertical: "middle", horizontal: "left" };
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `Cronograma_Paradas_${transportName}.xlsx`;
  anchor.click();
  window.URL.revokeObjectURL(url);
};

const generateRoadmapExcel = async (
  transportName,
  events,
  passengers,
  startId,
  endId,
  paxLocalities = {},
) => {
  if (!events || events.length === 0) return alert("No hay paradas definidas.");
  const sortedEvts = [...events].sort((a, b) =>
    (a.fecha + a.hora_inicio).localeCompare(b.fecha + b.hora_inicio),
  );
  const startIndex = startId
    ? sortedEvts.findIndex((e) => String(e.id) === String(startId))
    : 0;
  const endIndex = endId
    ? sortedEvts.findIndex((e) => String(e.id) === String(endId))
    : sortedEvts.length - 1;

  if (startIndex === -1 || endIndex === -1 || startIndex > endIndex)
    return alert("Rango de paradas inválido.");
  const activeEvents = sortedEvts.slice(startIndex, endIndex + 1);

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Hoja de Ruta");
  worksheet.columns = [
    { key: "col1", width: 30 },
    { key: "col2", width: 35 },
    { key: "col3", width: 20 },
  ];

  activeEvents.forEach((evt, idx) => {
    const stopNum = idx + 1;
    const timeStr = evt.hora_inicio ? evt.hora_inicio.slice(0, 5) : "--:--";
    const dateStr = formatDateSafe(evt.fecha);
    const nota = evt.descripcion || "";

    const headerText = `PARADA #${stopNum}      |      ${timeStr} hs      |      ${dateStr}${nota ? `      |      ${nota.toUpperCase()}` : ""}`;

    const locName = evt.locaciones?.nombre || "Sin Locación Asignada";
    const address = evt.locaciones?.direccion || "";
    const city = evt.locaciones?.localidades?.localidad || "";
    let fullPlace = locName;
    if (address || city)
      fullPlace += ` (${[address, city].filter(Boolean).join(" - ")})`;

    const headerRow = worksheet.addRow([headerText, "", ""]);
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 12 };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1565C0" },
    };
    headerRow.getCell(1).alignment = { vertical: "middle" };
    worksheet.mergeCells(`A${headerRow.number}:C${headerRow.number}`);

    const placeRow = worksheet.addRow(["LUGAR:", fullPlace, ""]);
    placeRow.font = { bold: true };
    placeRow.height = 30;
    placeRow.getCell(1).font = {
      bold: true,
      color: { argb: "FF555555" },
      size: 10,
    };
    placeRow.getCell(2).alignment = { vertical: "top", wrapText: true };
    worksheet.mergeCells(`B${placeRow.number}:C${placeRow.number}`);

    const ups = passengers.filter((p) =>
      p.logistics?.transports?.some(
        (t) => String(t.subidaId) === String(evt.id),
      ),
    );
    const downs = passengers.filter((p) =>
      p.logistics?.transports?.some(
        (t) => String(t.bajadaId) === String(evt.id),
      ),
    );
    ups.sort((a, b) => (a.apellido || "").localeCompare(b.apellido || ""));
    downs.sort((a, b) => (a.apellido || "").localeCompare(b.apellido || ""));

    if (ups.length > 0) {
      const subenHeader = worksheet.addRow([
        `SUBEN (${ups.length})`,
        "NOMBRE / RESIDENCIA",
        "DNI",
      ]);
      subenHeader.font = { bold: true, color: { argb: "FF2E7D32" } };
      subenHeader.getCell(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFEBF7ED" },
      };

      ups.forEach((p) => {
        const loc = p.localidades?.localidad || paxLocalities[p.id] || "";
        const nombreYResidencia = loc ? `${p.nombre} (${loc})` : p.nombre;
        worksheet.addRow([
          p.apellido?.toUpperCase(),
          nombreYResidencia,
          p.dni || "-",
        ]);
      });
    }

    if (downs.length > 0) {
      const bajanHeader = worksheet.addRow([
        `BAJAN (${downs.length})`,
        "NOMBRE / RESIDENCIA",
        "DNI",
      ]);
      bajanHeader.font = { bold: true, color: { argb: "FFC62828" } };
      bajanHeader.getCell(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFFEEBEB" },
      };

      downs.forEach((p) => {
        const loc = p.localidades?.localidad || paxLocalities[p.id] || "";
        const nombreYResidencia = loc ? `${p.nombre} (${loc})` : p.nombre;
        worksheet.addRow([
          p.apellido?.toUpperCase(),
          nombreYResidencia,
          p.dni || "-",
        ]);
      });
    }

    const paxOnBoard = passengers.filter((p) => {
      return p.logistics?.transports?.some((t) => {
        if (!t || !t.subidaId || !t.bajadaId) return false;
        const upIdx = sortedEvts.findIndex(
          (e) => String(e.id) === String(t.subidaId),
        );
        const downIdx = sortedEvts.findIndex(
          (e) => String(e.id) === String(t.bajadaId),
        );
        const currentIdx = sortedEvts.findIndex(
          (e) => String(e.id) === String(evt.id),
        );
        return upIdx <= currentIdx && downIdx > currentIdx;
      });
    }).length;

    const totalRow = worksheet.addRow([
      `TOTAL A BORDO AL SALIR: ${paxOnBoard}`,
      "",
      "",
    ]);
    totalRow.font = { bold: true };
    totalRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFEEEEEE" },
    };
    totalRow.getCell(1).alignment = { horizontal: "center" };
    worksheet.mergeCells(`A${totalRow.number}:C${totalRow.number}`);

    worksheet.addRow(["", "", ""]);
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `Hoja_Ruta_${transportName}.xlsx`;
  anchor.click();
};

const ShiftScheduleModal = ({
  isOpen,
  onClose,
  onApply,
  transportName,
  events = [],
}) => {
  const [shift, setShift] = useState({ days: 0, hours: 0, minutes: 0 });

  const sorted = useMemo(() => {
    return [...events].sort((a, b) =>
      (a.fecha + a.hora_inicio).localeCompare(b.fecha + b.hora_inicio),
    );
  }, [events]);

  if (!isOpen) return null;

  const first = sorted[0];
  const last = sorted[sorted.length - 1];

  const getPreview = (evt) => {
    if (!evt) return null;
    const current = new Date(`${evt.fecha}T${evt.hora_inicio || "00:00:00"}`);
    let next = addDays(current, shift.days);
    next = addHours(next, shift.hours);
    next = addMinutes(next, shift.minutes);
    return {
      old: `${format(current, "dd/MM")} ${format(current, "HH:mm")}`,
      new: `${format(next, "dd/MM")} ${format(next, "HH:mm")}`,
      label: evt.descripcion || "Sin descripción",
    };
  };

  const previewFirst = getPreview(first);
  const previewLast = getPreview(last);

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95">
        <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
          <h3 className="font-bold text-slate-700">
            Mover Horarios: {transportName}
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            <IconX size={20} />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-black text-slate-400 uppercase text-center">
                Días
              </label>
              <input
                type="number"
                className="border rounded p-2 text-center font-bold text-sm"
                value={shift.days}
                onChange={(e) =>
                  setShift({ ...shift, days: parseInt(e.target.value) || 0 })
                }
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-black text-slate-400 uppercase text-center">
                Horas
              </label>
              <input
                type="number"
                className="border rounded p-2 text-center font-bold text-sm"
                value={shift.hours}
                onChange={(e) =>
                  setShift({ ...shift, hours: parseInt(e.target.value) || 0 })
                }
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-black text-slate-400 uppercase text-center">
                Minutos
              </label>
              <input
                type="number"
                className="border rounded p-2 text-center font-bold text-sm"
                value={shift.minutes}
                onChange={(e) =>
                  setShift({ ...shift, minutes: parseInt(e.target.value) || 0 })
                }
              />
            </div>
          </div>
          {(shift.days !== 0 || shift.hours !== 0 || shift.minutes !== 0) && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-3">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-1">
                Previsualización de impacto
              </p>
              <div className="flex flex-col gap-2">
                {[
                  { title: "PRIMERA PARADA", data: previewFirst },
                  { title: "ÚLTIMA PARADA", data: previewLast },
                ].map(
                  (item, idx) =>
                    item.data && (
                      <div key={idx} className="flex flex-col">
                        <span className="text-[9px] font-bold text-indigo-500">
                          {item.title}
                        </span>
                        <p className="text-[10px] font-medium text-slate-600 truncate">
                          {item.data.label}
                        </p>
                        <div className="flex items-center gap-2 text-[11px]">
                          <span className="text-slate-400 line-through">
                            {item.data.old}
                          </span>
                          <span className="text-slate-400">→</span>
                          <span className="font-bold text-indigo-600 bg-indigo-50 px-1 rounded">
                            {item.data.new}
                          </span>
                        </div>
                      </div>
                    ),
                )}
              </div>
            </div>
          )}
        </div>
        <div className="p-4 bg-slate-50 border-t flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-slate-200 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-300"
          >
            Cancelar
          </button>
          <button
            onClick={() => onApply(shift)}
            className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 shadow-md"
          >
            Aplicar a todos
          </button>
        </div>
      </div>
    </div>
  );
};

export default function GirasTransportesManager({ supabase, gira }) {
  const {
    summary: rawSummary,
    routeRules,
    transportes: transportsList,
    loading: rosterLoading,
    refresh,
    roster,
  } = useLogistics(supabase, gira);

  // --- FILTRO MAESTRO DE PASAJEROS: Solo activos (ni ausentes ni bajas) ---
  const passengerList = useMemo(() => {
    return (rawSummary || []).filter(
      (p) => p.estado_gira !== "ausente" && p.estado_gira !== "baja",
    );
  }, [rawSummary]);

  const [shiftModal, setShiftModal] = useState({
    isOpen: false,
    transportId: null,
    transportName: "",
  });

  const [selectedEventIds, setSelectedEventIds] = useState(new Set());

  const clearSelection = () => setSelectedEventIds(new Set());

  const handleApplyShiftSchedule = async (offset) => {
    const tId = shiftModal.transportId;
    const allTransportEvents = transportEvents[tId] || [];

    const eventsToMove = allTransportEvents.filter((e) =>
      selectedEventIds.size > 0 ? selectedEventIds.has(e.id) : true,
    );

    if (eventsToMove.length === 0) return alert("No hay eventos seleccionados");

    setLoading(true);
    try {
      const updatePromises = eventsToMove.map((evt) => {
        const currentFullDate = new Date(
          `${evt.fecha}T${evt.hora_inicio || "00:00:00"}`,
        );

        let newDate = addDays(currentFullDate, offset.days);
        newDate = addHours(newDate, offset.hours);
        newDate = addMinutes(newDate, offset.minutes);

        return supabase
          .from("eventos")
          .update({
            fecha: format(newDate, "yyyy-MM-dd"),
            hora_inicio: format(newDate, "HH:mm:ss"),
          })
          .eq("id", evt.id);
      });

      await Promise.all(updatePromises);

      setShiftModal({ isOpen: false, transportId: null, transportName: "" });
      await fetchData();
      refresh();
    } catch (error) {
      console.error(error);
      alert("Error al mover los horarios");
    } finally {
      setLoading(false);
    }
  };

  const giraId = gira?.id;

  const [updatingFields, setUpdatingFields] = useState(new Set());
  const [successFields, setSuccessFields] = useState(new Set());
  const [errorFields, setErrorFields] = useState(new Set());

  const getInputClass = (id, field) => {
    const key = `${id}-${field}`;
    if (errorFields.has(key)) return "border-rose-500 bg-rose-50 text-rose-900";
    if (successFields.has(key))
      return "border-emerald-500 bg-emerald-50 text-emerald-900";
    if (updatingFields.has(key))
      return "border-amber-500 bg-amber-50 text-amber-900";
    return "border-transparent hover:border-slate-300 focus:border-indigo-500 bg-transparent";
  };
  const [transports, setTransports] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [locationsList, setLocationsList] = useState([]);
  const [regionsList, setRegionsList] = useState([]);
  const [localitiesList, setLocalitiesList] = useState([]);
  const [musiciansList, setMusiciansList] = useState([]);
  const [transportEvents, setTransportEvents] = useState({});
  const [paxLocalities, setPaxLocalities] = useState({});
  const [loading, setLoading] = useState(false);

  const [infoListModal, setInfoListModal] = useState({
    isOpen: false,
    title: "",
    list: [],
    transportId: null,
  });

  const [admissionModal, setAdmissionModal] = useState({
    isOpen: false,
    transportId: null,
  });

  const [stopsExportModal, setStopsExportModal] = useState({
    isOpen: false,
    transportId: null,
  });

  const InfoListModal = () => {
    if (!infoListModal.isOpen) return null;
    const isValidationMode = !!infoListModal.transportId;

    const renderContent = () => {
      if (isValidationMode && infoListModal.list.length > 0) {
        const grouped = {};
        infoListModal.list.forEach((p) => {
          const locName =
            paxLocalities[p.id] ||
            p.localidades?.localidad ||
            "Sin registro de localidad";
          if (!grouped[locName]) grouped[locName] = [];
          grouped[locName].push(p);
        });

        return (
          <div className="space-y-4">
            {Object.keys(grouped)
              .sort()
              .map((locName) => (
                <div key={locName}>
                  <h4 className="bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600 uppercase tracking-wider mb-1 rounded flex justify-between items-center">
                    <span>{locName}</span>
                    <span className="bg-white px-2 py-0.5 rounded text-slate-400 border text-[10px]">
                      {grouped[locName].length}
                    </span>
                  </h4>
                  <ul className="divide-y divide-slate-50">
                    {grouped[locName].map((p) => {
                      const trData = p.logistics?.transports?.find(
                        (t) =>
                          String(t.id) === String(infoListModal.transportId),
                      );
                      const missingUp = !trData?.subidaId;
                      const missingDown = !trData?.bajadaId;

                      return (
                        <li
                          key={p.id}
                          className="py-2 text-sm flex justify-between items-center pl-2 hover:bg-white"
                        >
                          <span className="font-medium text-slate-700">
                            {p.apellido}, {p.nombre}
                          </span>
                          <div className="flex gap-1 text-[10px] font-bold">
                            {missingUp && (
                              <span className="bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded border border-emerald-100 flex items-center gap-1">
                                <IconAlertTriangle size={10} /> Falta Subida
                              </span>
                            )}
                            {missingDown && (
                              <span className="bg-orange-50 text-orange-600 px-2 py-0.5 rounded border border-orange-100 flex items-center gap-1">
                                <IconAlertTriangle size={10} /> Falta Bajada
                              </span>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
          </div>
        );
      }

      return (
        <ul className="divide-y divide-slate-100">
          {infoListModal.list.map((p) => {
            const locNombre =
              paxLocalities[p.id] || p.localidades?.localidad || "Sin datos";

            return (
              <li key={p.id} className="py-3 text-sm flex flex-col gap-1">
                <div className="flex justify-between items-start">
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-700">
                      {p.apellido}, {p.nombre}
                    </span>
                    <span className="text-[10px] text-slate-400 uppercase font-medium">
                      {locNombre}
                    </span>
                  </div>
                  <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-black">
                    {p.logistics?.transports?.length} BUSES
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5 mt-1">
                  {p.logistics?.transports?.map((tr, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-1 px-2 py-0.5 bg-indigo-50 border border-indigo-100 rounded-md text-[9px] font-bold text-indigo-600 shadow-sm"
                    >
                      <IconBus size={10} />
                      <span>{tr.nombre}</span>
                      {tr.detalle && (
                        <span className="opacity-60 font-normal">
                          ({tr.detalle})
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </li>
            );
          })}
        </ul>
      );
    };

    return (
      <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col animate-in zoom-in-95">
          <div className="p-4 border-b flex justify-between items-center bg-slate-50 rounded-t-lg">
            <h3 className="font-bold text-slate-700">{infoListModal.title}</h3>
            <button
              onClick={() =>
                setInfoListModal({ ...infoListModal, isOpen: false })
              }
              className="text-slate-400 hover:text-slate-600"
            >
              <IconX size={20} />
            </button>
          </div>
          <div className="p-4 overflow-y-auto flex-1 bg-white/50">
            {infoListModal.list.length === 0 ? (
              <p className="text-center text-slate-500 italic">
                La lista está vacía.
              </p>
            ) : (
              renderContent()
            )}
          </div>
          <div className="p-3 border-t bg-slate-50 rounded-b-lg text-right">
            <button
              onClick={() =>
                setInfoListModal({ ...infoListModal, isOpen: false })
              }
              className="px-4 py-2 bg-slate-200 text-slate-700 rounded text-xs font-bold hover:bg-slate-300"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    );
  };

  const [newTransp, setNewTransp] = useState({
    id_transporte: "",
    detalle: "",
    costo: "",
    capacidad: "",
  });
  const [activeTransportId, setActiveTransportId] = useState(null);
  const [editingTransportId, setEditingTransportId] = useState(null);

  const [editFormData, setEditFormData] = useState({
    detalle: "",
    capacidad: "",
    costo: "",
    es_tipo_alternativo: false,
  });
  const [editingEventId, setEditingEventId] = useState(null);
  const [newEvent, setNewEvent] = useState({
    fecha: "",
    hora: "",
    id_locacion: null,
    descripcion: "",
    id_tipo_evento: String(TIPO_EVENTO_DEFAULT),
  });

  const [cnrtModal, setCnrtModal] = useState({
    isOpen: false,
    transportId: null,
  });
  const [roadmapModal, setRoadmapModal] = useState({
    isOpen: false,
    transportId: null,
  });
  const [boardingModal, setBoardingModal] = useState({
    isOpen: false,
    transportId: null,
  });
  const [itineraryModal, setItineraryModal] = useState({
    isOpen: false,
    transportId: null,
  });
  const [rulesModal, setRulesModal] = useState({
    isOpen: false,
    event: null,
    type: null,
    transportId: null,
  });
  const [passengersModal, setPassengersModal] = useState({
    isOpen: false,
    transportId: null,
  });
  const locationOptions = useMemo(
    () =>
      locationsList.map((l) => {
        const labelText =
          l.ciudad && l.ciudad !== "Sin ciudad"
            ? `${l.nombre} (${l.ciudad})`
            : l.nombre;

        return {
          id: l.id,
          label: labelText,
          subLabel: l.direccion || l.ciudad,
        };
      }),
    [locationsList],
  );

  const coverageStats = useMemo(() => {
    if (!passengerList || passengerList.length === 0)
      return { none: [], single: [], multiple: [] };

    const stats = { none: [], single: [], multiple: [] };
    passengerList.forEach((p) => {
      // Nota: El filtro de 'ausente' ya se hizo en el useMemo de passengerList
      const count = p.logistics?.transports?.length || 0;
      if (count === 0) stats.none.push(p);
      else if (count === 1) stats.single.push(p);
      else stats.multiple.push(p);
    });
    return stats;
  }, [passengerList]);

  useEffect(() => {
    if (giraId) fetchData();
  }, [giraId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [catData, locData, regData, cityData, musDataInfo] =
        await Promise.all([
          supabase.from("transportes").select("*").order("nombre"),
          supabase
            .from("locaciones")
            .select("id, nombre, direccion, localidades(localidad)")
            .order("nombre"),
          supabase.from("regiones").select("id, region"),
          supabase
            .from("localidades")
            .select("id, localidad, id_region")
            .order("localidad"),
          supabase
            .from("integrantes")
            .select(
              "id, nombre, apellido, dni, genero, fecha_nac, nacionalidad, id_localidad, localidades(localidad)",
            ),
        ]);

      setCatalog(catData.data || []);
      setRegionsList(regData.data || []);
      setLocalitiesList(cityData.data || []);
      setMusiciansList(musDataInfo.data || []);
      setPaxLocalities(
        (musDataInfo.data || []).reduce(
          (acc, m) => ({ ...acc, [m.id]: m.localidades?.localidad || "" }),
          {},
        ),
      );
      setLocationsList(
        (locData.data || []).map((l) => ({
          id: l.id,
          nombre: l.nombre,
          direccion: l.direccion,
          ciudad: l.localidades?.localidad || "Sin ciudad",
        })),
      );

      const { data: list } = await supabase
        .from("giras_transportes")
        .select(
          `id, detalle, costo, capacidad_maxima, id_transporte, es_tipo_alternativo, transportes ( nombre, patente)`,
        )
        .eq("id_gira", giraId)
        .order("id");

      setTransports(list || []);

      if (list && list.length > 0) {
        const tIds = list.map((t) => t.id);
        const { data: evts } = await supabase
          .from("eventos")
          .select(
            `id, fecha, hora_inicio, descripcion, id_tipo_evento, id_gira_transporte, id_locacion, locaciones(nombre, direccion, localidades(localidad))`,
          )
          .in("id_gira_transporte", tIds)
          .order("fecha", { ascending: true })
          .order("hora_inicio", { ascending: true });

        const map = {};
        evts?.forEach((e) => {
          if (!map[e.id_gira_transporte]) map[e.id_gira_transporte] = [];
          map[e.id_gira_transporte].push(e);
        });
        setTransportEvents(map);
        refresh();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateEvent = async (eventId, field, value) => {
    const key = `${eventId}-${field}`;

    const newEventsMap = { ...transportEvents };
    for (const tId in newEventsMap) {
      const idx = newEventsMap[tId].findIndex((e) => e.id === eventId);
      if (idx !== -1) {
        newEventsMap[tId][idx] = { ...newEventsMap[tId][idx], [field]: value };
        break;
      }
    }
    setTransportEvents(newEventsMap);

    setUpdatingFields((prev) => new Set(prev).add(key));
    setSuccessFields((prev) => {
      const n = new Set(prev);
      n.delete(key);
      return n;
    });
    setErrorFields((prev) => {
      const n = new Set(prev);
      n.delete(key);
      return n;
    });

    try {
      await supabase
        .from("eventos")
        .update({ [field]: value })
        .eq("id", eventId);

      setSuccessFields((prev) => new Set(prev).add(key));

      setTimeout(() => {
        setSuccessFields((prev) => {
          const n = new Set(prev);
          n.delete(key);
          return n;
        });
      }, 2000);
    } catch (e) {
      console.error(e);
      setErrorFields((prev) => {
        const n = new Set(prev);
        n.delete(key);
        return n;
      });
      fetchData();
    } finally {
      setUpdatingFields((prev) => {
        const n = new Set(prev);
        n.delete(key);
        return n;
      });
    }
  };

  const getEventRulesSummary = (eventId, type, transportId) => {
    if (!routeRules) return [];

    const relevantRules = routeRules.filter((r) => {
      if (String(r.id_transporte_fisico) !== String(transportId)) return false;
      if (type === "up") return String(r.id_evento_subida) === String(eventId);
      if (type === "down")
        return String(r.id_evento_bajada) === String(eventId);
      return false;
    });

    return relevantRules.map((r) => {
      const count = passengerList.filter((p) => {
        const matchesStop = matchesRule(r, p, localitiesList);
        const isAdmittedInBus = p.logistics?.transports?.some(
          (t) => String(t.id) === String(transportId),
        );
        return matchesStop && isAdmittedInBus;
      }).length;

      let label = "";
      const scope = r.alcance;
      if (scope === "General") label = "Todos";
      else if (scope === "Persona") {
        const p = roster?.find((mus) => mus.id === r.id_integrante);
        label = p ? `${p.apellido}` : "Individual";
      } else if (scope === "Region") {
        const reg = regionsList.find(
          (x) => String(x.id) === String(r.id_region),
        );
        label = reg ? reg.region : "Región";
      } else if (scope === "Localidad") {
        const loc = localitiesList.find(
          (x) => String(x.id) === String(r.id_localidad),
        );
        label = loc ? loc.localidad : "Loc";
      } else if (scope === "Categoria") {
        label = r.target_ids?.[0] || "Categoría";
      } else {
        label = scope;
      }

      return { label, count };
    });
  };

  const handleInsertItinerary = async (template, startDate, startTime) => {
    const tId = itineraryModal.transportId;
    if (!tId || !template || !startDate || !startTime) return;

    setLoading(true);
    try {
      const tramos = (template.plantillas_recorridos_tramos || []).sort(
        (a, b) => a.orden - b.orden,
      );
      let currentDateTime = new Date(`${startDate}T${startTime}`);
      const eventsToCreate = [];

      if (tramos.length > 0) {
        const primerTramo = tramos[0];
        eventsToCreate.push({
          fecha: format(currentDateTime, "yyyy-MM-dd"),
          hora: format(currentDateTime, "HH:mm:ss"),
          id_locacion: primerTramo.id_locacion_origen,
          descripcion: primerTramo.nota || "Inicio Recorrido",
          id_tipo_evento: primerTramo.id_tipo_evento || TIPO_EVENTO_DEFAULT,
          suben: primerTramo.ids_localidades_suben || [],
          subenInd: primerTramo.ids_integrantes_suben || [],

          bajan: [],
          bajanInd: [],
        });
      }

      tramos.forEach((tramo, index) => {
        currentDateTime = addMinutes(
          currentDateTime,
          tramo.duracion_minutos || 60,
        );
        const siguienteTramo = tramos[index + 1];

        eventsToCreate.push({
          fecha: format(currentDateTime, "yyyy-MM-dd"),
          hora: format(currentDateTime, "HH:mm:ss"),
          id_locacion: tramo.id_locacion_destino,
          descripcion: siguienteTramo
            ? siguienteTramo.nota || "Escala"
            : "Fin de Recorrido",
          id_tipo_evento: siguienteTramo
            ? siguienteTramo.id_tipo_evento || TIPO_EVENTO_DEFAULT
            : TIPO_EVENTO_DEFAULT,

          bajan: tramo.ids_localidades_bajan || [],
          bajanInd: tramo.ids_integrantes_bajan || [],

          suben: siguienteTramo
            ? siguienteTramo.ids_localidades_suben || []
            : [],
          subenInd: siguienteTramo
            ? siguienteTramo.ids_integrantes_suben || []
            : [],
        });
      });

      for (const evtData of eventsToCreate) {
        const { data: eventDB, error } = await supabase
          .from("eventos")
          .insert([
            {
              id_gira: giraId,
              id_gira_transporte: tId,
              id_locacion: evtData.id_locacion,
              fecha: evtData.fecha,
              hora_inicio: evtData.hora,
              descripcion: evtData.descripcion,
              id_tipo_evento: evtData.id_tipo_evento,
              convocados: [],
            },
          ])
          .select()
          .single();

        if (error) throw error;
        const eventId = eventDB.id;

        const routeRulesToInsert = [];

        const addRules = (ids, type, scope) => {
          if (!ids || ids.length === 0) return;
          ids.forEach((id) => {
            const rule = {
              id_gira: giraId,
              id_transporte_fisico: tId,
              alcance: scope,
              [scope === "Localidad" ? "id_localidad" : "id_integrante"]: id,
              prioridad: scope === "Persona" ? 5 : 3,
            };
            if (type === "subida") rule.id_evento_subida = eventId;
            else rule.id_evento_bajada = eventId;
            routeRulesToInsert.push(rule);
          });
        };

        addRules(evtData.suben, "subida", "Localidad");
        addRules(evtData.bajan, "bajada", "Localidad");

        addRules(evtData.subenInd, "subida", "Persona");
        addRules(evtData.bajanInd, "bajada", "Persona");

        if (routeRulesToInsert.length > 0) {
          await supabase
            .from("giras_logistica_rutas")
            .insert(routeRulesToInsert);
        }
      }

      fetchData();
      refresh();
      setItineraryModal({ isOpen: false, transportId: null });
    } catch (e) {
      console.error(e);
      alert("Error al insertar itinerario: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTransport = async () => {
    if (!newTransp.id_transporte) return alert("Selecciona tipo");
    await supabase.from("giras_transportes").insert([
      {
        id_gira: giraId,
        id_transporte: parseInt(newTransp.id_transporte),
        detalle: newTransp.detalle,
        costo: parseFloat(newTransp.costo) || 0,
        capacidad_maxima: newTransp.capacidad
          ? parseInt(newTransp.capacidad)
          : null,
      },
    ]);
    setNewTransp({ id_transporte: "", detalle: "", costo: "", capacidad: "" });
    fetchData();
  };

  const handleDeleteTransport = async (id) => {
    if (!confirm("Se borrará el transporte y SUS EVENTOS. ¿Seguro?")) return;
    await supabase.from("giras_transportes").delete().eq("id", id);
    fetchData();
  };

  const handleSaveEvent = async (transportId) => {
    if (!newEvent.fecha || !newEvent.hora || !newEvent.id_locacion)
      return alert("Fecha, hora y lugar obligatorios");

    setLoading(true);
    try {
      const payload = {
        id_gira: giraId,
        id_gira_transporte: transportId,
        fecha: newEvent.fecha,
        hora_inicio: newEvent.hora,
        id_locacion: newEvent.id_locacion,
        descripcion: newEvent.descripcion || "",
        id_tipo_evento: parseInt(newEvent.id_tipo_evento),
        convocados: [],
      };

      if (String(editingEventId).startsWith("new-")) {
        await supabase.from("eventos").insert([payload]);
      } else {
        await supabase.from("eventos").update(payload).eq("id", editingEventId);
      }

      setEditingEventId(null);
      setNewEvent({
        fecha: "",
        hora: "",
        id_locacion: null,
        descripcion: "",
        id_tipo_evento: String(TIPO_EVENTO_DEFAULT),
      });
      await fetchData();
      refresh();
    } catch (e) {
      alert("Error al guardar");
    } finally {
      setLoading(false);
    }
  };

  const startEditEvent = (evt) => {
    setEditingEventId(evt.id || "new");
    setNewEvent({
      fecha: evt.fecha || "",
      hora: evt.hora_inicio || "",
      id_locacion: evt.id_locacion || null,
      descripcion: evt.descripcion || "",
      id_tipo_evento: evt.id_tipo_evento
        ? evt.id_tipo_evento.toString()
        : String(TIPO_EVENTO_DEFAULT),
    });
  };

  const cancelEdit = () => {
    setEditingEventId(null);
    setNewEvent({
      fecha: "",
      hora: "",
      id_locacion: null,
      descripcion: "",
      id_tipo_evento: String(TIPO_EVENTO_DEFAULT),
    });
  };

  const handleDeleteEvent = async (eventId) => {
    const rulesAffectingUp = (routeRules || []).filter(
      (r) => String(r.id_evento_subida) === String(eventId),
    );
    const rulesAffectingDown = (routeRules || []).filter(
      (r) => String(r.id_evento_bajada) === String(eventId),
    );
    const totalAffected = rulesAffectingUp.length + rulesAffectingDown.length;

    if (totalAffected > 0) {
      const message =
        `⚠️ ADVERTENCIA DE INTEGRIDAD \n\n` +
        `Este evento se usa en ${totalAffected} reglas logísticas (subidas/bajadas).\n` +
        `Si continúas, esas reglas serán DESVINCULADAS automáticamente (se pondrán en blanco) para evitar errores.\n\n` +
        `¿Confirmas borrar el evento y limpiar las reglas asociadas?`;

      if (!confirm(message)) return;

      if (rulesAffectingUp.length > 0) {
        await supabase
          .from("giras_logistica_rutas")
          .update({ id_evento_subida: null })
          .eq("id_evento_subida", eventId);
      }
      if (rulesAffectingDown.length > 0) {
        await supabase
          .from("giras_logistica_rutas")
          .update({ id_evento_bajada: null })
          .eq("id_evento_bajada", eventId);
      }
    } else {
      if (!confirm("¿Borrar parada?")) return;
    }

    await supabase.from("eventos").delete().eq("id", eventId);
    if (editingEventId === eventId) cancelEdit();
    fetchData();
    refresh();
  };

  const handleSaveBoarding = async (personId, subidaId, bajadaId) => {
    if (!personId || !boardingModal.transportId) return;
    try {
      const { data: existingRules } = await supabase
        .from("giras_logistica_rutas")
        .select("id")
        .eq("id_transporte_fisico", boardingModal.transportId)
        .eq("alcance", "Persona")
        .eq("id_integrante", personId);

      const updates = {
        id_evento_subida: subidaId ? parseInt(subidaId) : null,
        id_evento_bajada: bajadaId ? parseInt(bajadaId) : null,
      };

      if (existingRules && existingRules.length > 0) {
        await supabase
          .from("giras_logistica_rutas")
          .update(updates)
          .eq("id", existingRules[0].id);
      } else {
        await supabase.from("giras_logistica_rutas").insert([
          {
            id_gira: giraId,
            id_transporte_fisico: boardingModal.transportId,
            alcance: "Persona",
            id_integrante: personId,
            prioridad: 5,
            ...updates,
          },
        ]);
      }
      await refresh();
    } catch (err) {
      console.error(err);
      alert("Error al guardar.");
    }
  };

  const handleDeleteBoardingRule = async (personId) => {
    if (!personId || !boardingModal.transportId) return;
    if (
      !confirm(
        "¿Eliminar la excepción personalizada y volver a la regla general?",
      )
    )
      return;

    try {
      await supabase
        .from("giras_logistica_rutas")
        .delete()
        .eq("id_transporte_fisico", boardingModal.transportId)
        .eq("alcance", "Persona")
        .eq("id_integrante", personId);

      await refresh();
    } catch (err) {
      console.error(err);
      alert("Error al eliminar regla.");
    }
  };

  const handleExportGlobal = () => {
    // passengerList ya está filtrado (sin ausentes)
    const travelingPax = passengerList.filter(
      (p) => p.logistics?.transports?.length > 0,
    );
    downloadStyledExcel(travelingPax, `Transporte_General_Gira${giraId}.xlsx`);
  };

  const handleExportOnlyStops = async (startId, endId) => {
    const tId = stopsExportModal.transportId;
    const tInfo = transports.find((t) => t.id === tId);
    const events = transportEvents[tId] || [];

    await generateStopsOnlyExcel(
      tInfo.detalle || tInfo.transportes?.nombre || "Transporte",
      events,
      startId,
      endId,
    );

    setStopsExportModal({ isOpen: false, transportId: null });
  };

  const handleExportCNRT = async (startId, endId, onlyStops = false) => {
    const currentTransportId = cnrtModal.transportId;
    if (!currentTransportId) return;

    const tInfo = transports.find((t) => t.id === currentTransportId);
    if (!tInfo) return;

    if (onlyStops === true) {
      await generateStopsOnlyExcel(
        tInfo.detalle || tInfo.transportes?.nombre || "Transporte",
        transportEvents[currentTransportId] || [],
        startId,
        endId,
      );
    } else {
      const events = transportEvents[currentTransportId] || [];
      const sortedEvts = [...events].sort((a, b) =>
        (a.fecha + a.hora_inicio).localeCompare(b.fecha + b.hora_inicio),
      );
      const startIndex = sortedEvts.findIndex(
        (e) => String(e.id) === String(startId),
      );
      const endIndex = sortedEvts.findIndex(
        (e) => String(e.id) === String(endId),
      );

      // passengerList ya está filtrado (sin ausentes)
      const tPax = passengerList.filter((p) => {
        const transportData = p.logistics?.transports?.find(
          (t) => String(t.id) === String(currentTransportId),
        );
        if (!transportData) return false;
        const pInIdx = sortedEvts.findIndex(
          (e) => String(e.id) === String(transportData.subidaId),
        );
        const pOutIdx = sortedEvts.findIndex(
          (e) => String(e.id) === String(transportData.bajadaId),
        );
        return pInIdx < endIndex && pOutIdx > startIndex;
      });

      await downloadStyledExcel(tPax, `CNRT_${tInfo.detalle}.xlsx`);
    }

    setCnrtModal({ isOpen: false, transportId: null });
  };

  const handleExportRoadmap = (startId, endId) => {
    const tId = roadmapModal.transportId;
    const tInfo = transports.find((t) => t.id === tId);
    // passengerList ya está filtrado (sin ausentes)
    const tPax = passengerList.filter((p) =>
      p.logistics?.transports?.some((t) => String(t.id) === String(tId)),
    );
    generateRoadmapExcel(
      tInfo?.detalle || "Transporte",
      transportEvents[tId] || [],
      tPax,
      startId,
      endId,
      paxLocalities,
    );
    setRoadmapModal({ isOpen: false, transportId: null });
  };

  const startEditingTransport = (e, t) => {
    e.stopPropagation();
    setEditingTransportId(t.id);
    setEditFormData({
      detalle: t.detalle || "",
      capacidad: t.capacidad_maxima || "",
      costo: t.costo || "",
      es_tipo_alternativo: t.es_tipo_alternativo || false,
    });
  };

  const cancelEditingTransport = (e) => {
    if (e) e.stopPropagation();
    setEditingTransportId(null);
  };

  const saveTransportChanges = async (e) => {
    e.stopPropagation();
    if (!editingTransportId) return;

    setLoading(true);
    const toastId = toast.loading("Guardando cambios...");

    try {
      const targetEventType = editFormData.es_tipo_alternativo ? 12 : 11;
      const typeName = editFormData.es_tipo_alternativo
        ? "Solo Logístico"
        : "de Pasajeros";

      const { error: transportError } = await supabase
        .from("giras_transportes")
        .update({
          detalle: editFormData.detalle,
          capacidad_maxima: editFormData.capacidad
            ? parseInt(editFormData.capacidad, 10)
            : null,
          costo: parseFloat(editFormData.costo) || 0,
          es_tipo_alternativo: editFormData.es_tipo_alternativo,
        })
        .eq("id", editingTransportId);

      if (transportError) throw transportError;

      const { error: eventsError, count } = await supabase
        .from("eventos")
        .update({ id_tipo_evento: targetEventType })
        .eq("id_gira_transporte", editingTransportId)
        .select("id", { count: "exact" });

      if (eventsError) throw eventsError;

      setEditingTransportId(null);
      await fetchData();
      setLoading(false);

      toast.success(
        <div className="flex flex-col gap-1">
          <span>Transporte actualizado.</span>
          <span className="text-xs opacity-90">
            Se actualizaron {count || 0} paradas al tipo <b>{typeName}</b>
          </span>
        </div>,
        { id: toastId },
      );
    } catch (error) {
      setLoading(false);
      toast.error("Error al actualizar transporte", { id: toastId });
    }
  };

  return (
    <div className="h-full overflow-y-auto p-4 bg-white rounded-lg shadow-sm border border-slate-200 max-w-6xl mx-auto">
      <div className="mb-6 grid grid-cols-3 gap-4 w-full">
        <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl flex items-center gap-3 shadow-sm">
          <div className="p-2.5 bg-emerald-100 rounded-xl text-emerald-600 shrink-0">
            <IconCheckCircle size={22} />
          </div>
          <div className="min-w-0">
            <div className="text-xl font-black text-emerald-700 leading-none">
              {coverageStats.single.length}
            </div>
            <div className="text-[10px] text-emerald-600 font-bold uppercase tracking-tight mt-1">
              Asignados
            </div>
          </div>
        </div>

        <div
          onClick={() =>
            setInfoListModal({
              isOpen: true,
              title: "Pasajeros en Múltiples Transportes",
              list: coverageStats.multiple,
            })
          }
          className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex items-center gap-3 shadow-sm cursor-pointer hover:bg-amber-100 hover:border-amber-200 transition-all group"
        >
          <div className="p-2.5 bg-amber-100 rounded-xl text-amber-600 shrink-0 group-hover:scale-110 transition-transform">
            <IconTruck size={22} />
          </div>
          <div className="min-w-0">
            <div className="text-xl font-black text-amber-700 leading-none">
              {coverageStats.multiple.length}
            </div>
            <div className="text-[10px] text-amber-600 font-bold uppercase tracking-tight mt-1 underline decoration-dashed underline-offset-4">
              Más de un Transporte
            </div>
          </div>
        </div>

        <div
          onClick={() =>
            setInfoListModal({
              isOpen: true,
              title: "Lista de Espera (Sin Transporte)",
              list: coverageStats.none,
            })
          }
          className="bg-rose-50 border border-rose-100 p-4 rounded-2xl flex items-center gap-3 shadow-sm cursor-pointer hover:bg-rose-100 hover:border-rose-200 transition-all group"
        >
          <div className="p-2.5 bg-rose-100 rounded-xl text-rose-600 shrink-0 group-hover:animate-bounce">
            <IconAlertTriangle size={22} />
          </div>
          <div className="min-w-0">
            <div className="text-xl font-black text-rose-700 leading-none">
              {coverageStats.none.length}
            </div>
            <div className="text-[10px] text-rose-600 font-bold uppercase tracking-tight mt-1 underline decoration-dashed underline-offset-4">
              Sin Transporte
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center mb-4 border-b pb-2">
        <h3 className="font-bold text-slate-700 flex items-center gap-2">
          <IconTruck className="text-indigo-600" /> Gestión de Transportes
        </h3>

        <div className="flex gap-2 items-center">
          <DataIntegrityIndicator passengers={passengerList} />
          <button
            onClick={handleExportGlobal}
            className="flex items-center gap-2 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded text-xs font-bold transition-colors shadow-sm"
          >
            <IconDownload size={14} /> Excel General
          </button>
          <button
            onClick={() =>
              setItineraryModal({ isOpen: true, transportId: null })
            }
            className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded text-xs font-bold hover:bg-indigo-100"
          >
            <IconMapPin size={14} /> Gestor de Itinerarios
          </button>
        </div>
      </div>

      <div className="flex gap-2 mb-6 items-end bg-slate-50 p-3 rounded-lg border border-slate-200">
        <div className="w-1/4">
          <label className="text-[10px] font-bold text-slate-500">TIPO</label>
          <select
            className="w-full text-xs border p-2 rounded"
            value={newTransp.id_transporte}
            onChange={(e) =>
              setNewTransp({ ...newTransp, id_transporte: e.target.value })
            }
          >
            <option value="">Seleccionar...</option>
            {catalog.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre} {c.patente ? `(${c.patente})` : ""}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label className="text-[10px] font-bold text-slate-500">
            DETALLE
          </label>
          <input
            type="text"
            className="w-full text-xs border p-2 rounded"
            placeholder="Ej: Interno 404"
            value={newTransp.detalle}
            onChange={(e) =>
              setNewTransp({ ...newTransp, detalle: e.target.value })
            }
          />
        </div>
        <div className="w-24">
          <label className="text-[10px] font-bold text-slate-500">
            CAPACIDAD
          </label>
          <input
            type="number"
            min="0"
            className="w-full text-xs border p-2 rounded"
            placeholder="Opcional"
            value={newTransp.capacidad}
            onChange={(e) =>
              setNewTransp({ ...newTransp, capacidad: e.target.value })
            }
          />
        </div>
        <button
          onClick={handleAddTransport}
          className="bg-indigo-600 text-white p-2 rounded hover:bg-indigo-700"
        >
          <IconPlus size={18} />
        </button>
      </div>

      <div className="space-y-4">
        {transports.map((t) => {
          const isExpanded = activeTransportId === t.id;
          const myEvents = transportEvents[t.id] || [];
          const isMediosPropios = String(t.id_transporte) === "9";

          const tPax = passengerList.filter((p) =>
            p.logistics?.transports?.some(
              (tr) => String(tr.id) === String(t.id),
            ),
          );
          const tPassengerCount = tPax.length;
          const tInstrumentSeats = tPax.filter(
            (p) => p.instrumentos?.plaza_extra,
          ).length;
          const totalOccupied = tPassengerCount + tInstrumentSeats;
          const maxCap = t.capacidad_maxima || 0;

          const isOverbooked = maxCap > 0 && totalOccupied > maxCap;
          const occupancyColor = isOverbooked
            ? "text-rose-600 bg-rose-50 border-rose-200"
            : "text-indigo-600 bg-indigo-50 border-indigo-100";

          const incompletePax = tPax.filter((p) => {
            const tr = p.logistics?.transports?.find(
              (x) => String(x.id) === String(t.id),
            );
            return tr && (!tr.subidaId || !tr.bajadaId);
          });

          const isEditing = editingTransportId === t.id;

          return (
            <div
              key={t.id}
              className={`group border rounded-2xl transition-all duration-300 ${isExpanded ? "border-indigo-300 shadow-xl ring-4 ring-indigo-50/50 bg-white" : "border-slate-200 bg-white hover:border-slate-300 shadow-sm"}`}
            >
              <div
                className="p-2 md:p-3 flex flex-col md:flex-row justify-between md:items-center gap-2 cursor-pointer"
                onClick={() =>
                  !isEditing && setActiveTransportId(isExpanded ? null : t.id)
                }
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div
                    className={`p-2 rounded-xl shrink-0 transition-colors ${isExpanded ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500 group-hover:bg-indigo-100"}`}
                  >
                    <IconTruck size={20} />
                  </div>

                  <div className="min-w-0 flex-1">
                    {isEditing ? (
                      <div
                        className="flex flex-wrap items-center gap-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <select
                          className="border border-indigo-300 rounded px-2 py-1 text-xs bg-white w-24"
                          value={editFormData.id_transporte || t.id_transporte}
                          onChange={(e) =>
                            setEditFormData({
                              ...editFormData,
                              id_transporte: e.target.value,
                            })
                          }
                        >
                          {catalog.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.nombre}
                            </option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={editFormData.detalle}
                          onChange={(e) =>
                            setEditFormData({
                              ...editFormData,
                              detalle: e.target.value,
                            })
                          }
                          className="border border-indigo-300 rounded px-2 py-1 text-xs font-bold w-32"
                        />
                        <input
                          type="number"
                          min="0"
                          placeholder="Cap."
                          value={editFormData.capacidad}
                          onChange={(e) =>
                            setEditFormData({
                              ...editFormData,
                              capacidad: e.target.value,
                            })
                          }
                          className="border border-indigo-300 rounded px-2 py-1 text-xs w-20"
                        />
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="Costo"
                          value={editFormData.costo}
                          onChange={(e) =>
                            setEditFormData({
                              ...editFormData,
                              costo: e.target.value,
                            })
                          }
                          className="border border-indigo-300 rounded px-2 py-1 text-xs w-24"
                        />
                        <label
                          className={`flex items-center gap-1.5 px-2 py-1 rounded border cursor-pointer select-none ${editFormData.es_tipo_alternativo ? "bg-amber-50 border-amber-200 text-amber-700" : "bg-slate-50 border-slate-200 text-slate-400"}`}
                        >
                          <input
                            type="checkbox"
                            className="hidden"
                            checked={editFormData.es_tipo_alternativo}
                            onChange={(e) =>
                              setEditFormData({
                                ...editFormData,
                                es_tipo_alternativo: e.target.checked,
                              })
                            }
                          />
                          {editFormData.es_tipo_alternativo ? (
                            <IconAlertTriangle size={14} />
                          ) : (
                            <IconBus size={14} />
                          )}
                          <span className="text-[9px] font-bold uppercase">
                            {editFormData.es_tipo_alternativo
                              ? "Solo logístico"
                              : "De pasajeros"}
                          </span>
                        </label>
                        <div className="flex gap-1">
                          <button
                            onClick={saveTransportChanges}
                            className="bg-emerald-500 text-white p-1 rounded"
                          >
                            <IconCheck size={14} />
                          </button>
                          <button
                            onClick={cancelEditingTransport}
                            className="bg-slate-200 text-slate-600 p-1 rounded"
                          >
                            <IconX size={14} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-1.5 flex-nowrap overflow-hidden">
                          <h4 className="font-black text-slate-800 uppercase tracking-tighter text-sm truncate shrink">
                            {t.detalle || "Sin detalle"}
                          </h4>
                          {t.transportes?.patente && (
                            <span className="bg-slate-800 text-white px-1.5 py-0.5 rounded text-[9px] font-mono tracking-tighter shrink-0">
                              {t.transportes.patente}
                            </span>
                          )}
                          <button
                            onClick={(e) => startEditingTransport(e, t)}
                            className="text-slate-300 hover:text-indigo-600 p-1 rounded-full"
                          >
                            <IconEdit size={12} />
                          </button>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest truncate">
                            {t.transportes?.nombre || "Bus"}
                          </span>
                          <span className="text-slate-200 shrink-0">|</span>
                          <span
                            className={`text-[12px] font-bold px-1.5 py-0.5 rounded-full border shrink-0 ${occupancyColor}`}
                          >
                            {tPassengerCount}{" "}
                            {tInstrumentSeats > 0
                              ? ` + ${tInstrumentSeats} ins = ${totalOccupied}`
                              : ""}{" "}
                            butacas {maxCap > 0 ? ` / ${maxCap}` : ""}
                          </span>
                          {t.es_tipo_alternativo && (
                            <span className="ml-1 text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold border border-amber-200">
                              Solo logístico
                            </span>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {!isEditing && (
                  <div
                    className="flex items-center gap-1 shrink-0 ml-auto md:ml-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {incompletePax.length > 0 && !isMediosPropios && (
                      <button
                        onClick={() =>
                          setInfoListModal({
                            isOpen: true,
                            title: `Incompletos: ${t.detalle}`,
                            list: incompletePax,
                            transportId: t.id,
                          })
                        }
                        className="flex items-center gap-1 px-2 py-1 bg-rose-50 text-rose-600 border border-rose-200 rounded-lg text-[9px] font-black animate-pulse mr-1"
                      >
                        <IconAlertTriangle size={10} /> {incompletePax.length}{" "}
                        PEND.
                      </button>
                    )}

                    <div className="flex items-center bg-slate-100/80 p-0.5 rounded-xl border border-slate-200 gap-0.5">
                      <button
                        onClick={() =>
                          setAdmissionModal({ isOpen: true, transportId: t.id })
                        }
                        className="p-1.5 bg-white text-indigo-600 rounded-lg hover:bg-indigo-600 hover:text-white transition-all"
                        title="Admisión"
                      >
                        <IconUsers size={16} />
                      </button>
                      <button
                        onClick={() =>
                          setBoardingModal({ isOpen: true, transportId: t.id })
                        }
                        className="p-1.5 bg-white text-amber-600 rounded-lg hover:bg-amber-600 hover:text-white transition-all"
                        title="Abordaje"
                      >
                        <IconCheckCircle size={16} />
                      </button>
                      <button
                        onClick={() =>
                          setItineraryModal({ isOpen: true, transportId: t.id })
                        }
                        className="p-1.5 bg-white text-fuchsia-600 rounded-lg hover:bg-fuchsia-600 hover:text-white transition-all"
                        title="Paradas"
                      >
                        <IconMapPin size={16} />
                      </button>

                      {/* NUEVO BOTÓN: CRONOGRAMA */}
                      <button
                        onClick={() =>
                          setStopsExportModal({
                            isOpen: true,
                            transportId: t.id,
                          })
                        }
                        className="p-1.5 bg-white text-emerald-600 rounded-lg hover:bg-emerald-600 hover:text-white transition-all border border-emerald-100 shadow-sm"
                        title="Cronograma de Paradas (Solo paradas)"
                      >
                        <IconList size={16} />
                      </button>

                      <button
                        onClick={() =>
                          setShiftModal({
                            isOpen: true,
                            transportId: t.id,
                            transportName: t.detalle,
                          })
                        }
                        className="p-1.5 bg-white text-slate-500 rounded-lg hover:bg-slate-800 hover:text-white transition-all"
                        title="Mover Horarios"
                      >
                        <IconClock size={16} />
                      </button>
                      <div className="w-px h-4 bg-slate-200 mx-0.5"></div>
                      <button
                        onClick={() =>
                          setRoadmapModal({ isOpen: true, transportId: t.id })
                        }
                        className="p-1.5 bg-white text-indigo-600 rounded-lg hover:bg-indigo-600 hover:text-white transition-all"
                        title="Hoja de Ruta"
                      >
                        <IconFileText size={16} />
                      </button>
                      <button
                        onClick={() =>
                          setCnrtModal({ isOpen: true, transportId: t.id })
                        }
                        className="px-2 py-1.5 bg-white text-indigo-700 text-[9px] font-black rounded-lg hover:bg-indigo-700 hover:text-white transition-all"
                      >
                        CNRT
                      </button>
                    </div>

                    <button
                      onClick={() => handleDeleteTransport(t.id)}
                      className="p-1.5 text-slate-300 hover:text-rose-600 ml-1"
                    >
                      <IconTrash size={16} />
                    </button>
                    <div
                      className={`ml-1 text-slate-300 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                    >
                      <IconChevronDown size={16} />
                    </div>
                  </div>
                )}
              </div>

              {isExpanded && (
                <div className="border-t border-slate-100 overflow-hidden rounded-b-2xl bg-slate-50/30">
                  <div className="overflow-x-auto">
                    <table
                      className="w-full text-sm text-left border-separate border-spacing-0"
                      style={{ tableLayout: "fixed" }}
                    >
                      <thead className="bg-slate-100/50 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b">
                        <tr>
                          <th className="p-3 w-10 text-center">
                            <input
                              type="checkbox"
                              className="rounded border-slate-300 text-indigo-600"
                              checked={
                                myEvents.length > 0 &&
                                myEvents.every((e) =>
                                  selectedEventIds.has(e.id),
                                )
                              }
                              onChange={(e) => {
                                const next = new Set(selectedEventIds);
                                myEvents.forEach((ev) =>
                                  e.target.checked
                                    ? next.add(ev.id)
                                    : next.delete(ev.id),
                                );
                                setSelectedEventIds(next);
                              }}
                            />
                          </th>
                          <th className="p-3 w-46">Horario / Fecha</th>
                          <th className="p-3 w-44">Locación (Destino)</th>
                          <th className="p-3">Nota</th>
                          <th className="p-3 w-20 text-center bg-emerald-50/50 text-emerald-600 border-l border-emerald-100">
                            Suben
                          </th>
                          <th className="p-3 w-20 text-center bg-rose-50/50 text-rose-600 border-l border-rose-100">
                            Bajan
                          </th>
                          <th className="p-3 w-10"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {myEvents.map((evt) => {
                          const upsSummary = getEventRulesSummary(
                            evt.id,
                            "up",
                            t.id,
                          );
                          const downsSummary = getEventRulesSummary(
                            evt.id,
                            "down",
                            t.id,
                          );
                          const totalUps = upsSummary.reduce(
                            (acc, curr) => acc + curr.count,
                            0,
                          );
                          const totalDowns = downsSummary.reduce(
                            (acc, curr) => acc + curr.count,
                            0,
                          );
                          const upAlert =
                            upsSummary.some((s) => s.count === 0) &&
                            !isMediosPropios;
                          const downAlert =
                            downsSummary.some((s) => s.count === 0) &&
                            !isMediosPropios;

                          return (
                            <tr
                              key={evt.id}
                              className="hover:bg-slate-50 group transition-colors"
                            >
                              <td className="p-2 text-center align-middle">
                                <input
                                  type="checkbox"
                                  className="rounded border-slate-300 text-indigo-600"
                                  checked={selectedEventIds.has(evt.id)}
                                  onChange={() => {
                                    const next = new Set(selectedEventIds);
                                    next.has(evt.id)
                                      ? next.delete(evt.id)
                                      : next.add(evt.id);
                                    setSelectedEventIds(next);
                                  }}
                                />
                              </td>
                              <td className="p-2 align-middle">
                                <div className="flex items-center gap-1">
                                  <DateInput
                                    value={evt.fecha}
                                    onChange={(v) =>
                                      handleUpdateEvent(evt.id, "fecha", v)
                                    }
                                    showDayName={false}
                                    className={`h-7 w-24 text-[11px] font-bold text-center border rounded ${getInputClass(evt.id, "fecha")}`}
                                  />
                                  <TimeInput
                                    value={evt.hora_inicio}
                                    onChange={(v) =>
                                      handleUpdateEvent(
                                        evt.id,
                                        "hora_inicio",
                                        v,
                                      )
                                    }
                                    className={`h-7 w-14 text-[11px] font-bold text-center border rounded ${getInputClass(evt.id, "hora_inicio")}`}
                                  />
                                </div>
                              </td>
                              <td
                                className="p-2 align-middle overflow-hidden"
                                style={{ width: "176px", maxWidth: "176px" }}
                              >
                                <SearchableSelect
                                  options={locationOptions}
                                  value={evt.id_locacion}
                                  onChange={(v) =>
                                    handleUpdateEvent(evt.id, "id_locacion", v)
                                  }
                                  className={`h-8 text-[11px] w-full rounded ${getInputClass(evt.id, "id_locacion")}`}
                                />
                              </td>
                              <td className="p-2 align-middle">
                                <textarea
                                  value={evt.descripcion || ""}
                                  onChange={(e) =>
                                    handleUpdateEvent(
                                      evt.id,
                                      "descripcion",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="Nota..."
                                  className={`w-full min-h-[32px] h-auto resize-none rounded px-2 py-1.5 text-xs outline-none border ${getInputClass(evt.id, "descripcion")}`}
                                  rows={1}
                                  onInput={(e) => {
                                    e.target.style.height = "auto";
                                    e.target.style.height =
                                      e.target.scrollHeight + "px";
                                  }}
                                />
                              </td>
                              <td
                                className={`p-2 border-l border-emerald-50/50 align-middle ${totalUps > 0 ? "bg-emerald-50/20" : ""}`}
                              >
                                <button
                                  onClick={() =>
                                    setRulesModal({
                                      isOpen: true,
                                      event: evt,
                                      type: "up",
                                      transportId: t.id,
                                    })
                                  }
                                  className={`w-full py-1 rounded-xl border text-[10px] font-black flex flex-col items-center gap-0.5 ${totalUps > 0 ? "bg-emerald-100 text-emerald-700 border-emerald-200" : upAlert ? "bg-orange-100 text-orange-700 border-orange-300 animate-pulse" : "bg-white text-slate-300 border-slate-100 hover:border-slate-300"}`}
                                >
                                  <div className="flex items-center gap-1 w-full justify-center">
                                    <IconUpload size={10} />{" "}
                                    {totalUps > 0
                                      ? totalUps
                                      : upAlert
                                        ? "0 ⚠️"
                                        : "+"}
                                  </div>
                                  {upsSummary.map((s, i) => (
                                    <span
                                      key={i}
                                      className="px-1 truncate w-full text-[9px] opacity-60"
                                    >
                                      {s.label} ({s.count})
                                    </span>
                                  ))}
                                </button>
                              </td>
                              <td
                                className={`p-2 border-l border-rose-50/50 align-middle ${totalDowns > 0 ? "bg-rose-50/30" : ""}`}
                              >
                                <button
                                  onClick={() =>
                                    setRulesModal({
                                      isOpen: true,
                                      event: evt,
                                      type: "down",
                                      transportId: t.id,
                                    })
                                  }
                                  className={`w-full py-1 rounded-xl border text-[10px] font-black flex flex-col items-center gap-0.5 ${totalDowns > 0 ? "bg-rose-100 text-rose-700 border-rose-200" : downAlert ? "bg-orange-100 text-orange-700 border-orange-300 animate-pulse" : "bg-white text-slate-300 border-slate-100 hover:border-slate-300"}`}
                                >
                                  <div className="flex items-center gap-1 w-full justify-center">
                                    <IconDownload size={10} />{" "}
                                    {totalDowns > 0
                                      ? totalDowns
                                      : downAlert
                                        ? "0 ⚠️"
                                        : "+"}
                                  </div>
                                  {downsSummary.map((s, i) => (
                                    <span
                                      key={i}
                                      className="px-1 truncate w-full text-[9px] opacity-60"
                                    >
                                      {s.label} ({s.count})
                                    </span>
                                  ))}
                                </button>
                              </td>
                              <td className="p-2 text-right align-middle">
                                <button
                                  onClick={() => handleDeleteEvent(evt.id)}
                                  className="text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
                                >
                                  <IconTrash size={14} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                        {/* --- BLOQUE CORREGIDO PARA AGREGAR PARADA --- */}
                        {editingEventId === `new-${t.id}` ? (
                          <tr className="bg-indigo-50/50 animate-in slide-in-from-top-1">
                            <td className="p-2 text-center align-middle">
                              <div className="w-4 h-4 mx-auto rounded border-2 border-indigo-300 border-t-transparent animate-spin" />
                            </td>
                            <td className="p-2 align-middle">
                              <div className="flex items-center gap-1">
                                <DateInput
                                  value={newEvent.fecha}
                                  onChange={(v) =>
                                    setNewEvent({ ...newEvent, fecha: v })
                                  }
                                  showDayName={false}
                                  className="h-7 w-24 text-[11px] font-bold text-center border-indigo-300 rounded"
                                />
                                <TimeInput
                                  value={newEvent.hora}
                                  onChange={(v) =>
                                    setNewEvent({ ...newEvent, hora: v })
                                  }
                                  className="h-7 w-14 text-[11px] font-bold text-center border-indigo-300 rounded"
                                />
                              </div>
                            </td>
                            <td className="p-2 align-middle">
                              <SearchableSelect
                                options={locationOptions}
                                value={newEvent.id_locacion}
                                onChange={(v) =>
                                  setNewEvent({ ...newEvent, id_locacion: v })
                                }
                                className="h-8 text-[11px] w-full rounded border-indigo-300"
                              />
                            </td>
                            <td className="p-2 align-middle">
                              <input
                                type="text"
                                value={newEvent.descripcion}
                                onChange={(e) =>
                                  setNewEvent({
                                    ...newEvent,
                                    descripcion: e.target.value,
                                  })
                                }
                                placeholder="Nota de la parada..."
                                className="w-full h-8 rounded px-2 text-xs border border-indigo-300 outline-none focus:ring-2 focus:ring-indigo-200"
                              />
                            </td>
                            <td
                              colSpan="2"
                              className="p-2 align-middle text-center"
                            >
                              <div className="flex gap-1 justify-center">
                                <button
                                  onClick={() => handleSaveEvent(t.id)}
                                  className="flex-1 bg-indigo-600 text-white py-1.5 rounded-lg text-[10px] font-black uppercase hover:bg-indigo-700 shadow-sm"
                                >
                                  Guardar
                                </button>
                                <button
                                  onClick={cancelEdit}
                                  className="px-3 bg-slate-200 text-slate-600 py-1.5 rounded-lg text-[10px] font-black uppercase hover:bg-slate-300"
                                >
                                  <IconX size={14} />
                                </button>
                              </div>
                            </td>
                            <td></td>
                          </tr>
                        ) : (
                          <tr>
                            <td colSpan="7" className="p-2 bg-slate-50/50">
                              <button
                                onClick={() => {
                                  setEditingEventId(`new-${t.id}`);
                                  setNewEvent({
                                    fecha:
                                      gira.fecha_inicio ||
                                      format(new Date(), "yyyy-MM-dd"),
                                    hora: "08:00:00",
                                    id_locacion: null,
                                    descripcion: "",
                                    id_tipo_evento: t.es_tipo_alternativo
                                      ? String(TIPO_EVENTO_ALT)
                                      : String(TIPO_EVENTO_DEFAULT),
                                  });
                                }}
                                className="w-full py-2 border-2 border-dashed border-slate-200 rounded-xl text-[10px] font-black text-slate-400 hover:border-indigo-300 hover:text-indigo-600 transition-all uppercase tracking-[0.2em] bg-white"
                              >
                                + Agregar parada
                              </button>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <InfoListModal />

      {admissionModal.isOpen && (
        <TransportAdmissionModal
          isOpen={admissionModal.isOpen}
          onClose={() =>
            setAdmissionModal({ isOpen: false, transportId: null })
          }
          transporte={transports.find(
            (t) => t.id === admissionModal.transportId,
          )}
          roster={roster}
          regions={regionsList}
          localities={localitiesList}
          supabase={supabase}
          giraId={giraId}
          onUpdate={refresh}
        />
      )}

      {cnrtModal.isOpen && (
        <CnrtExportModal
          transport={transports.find((t) => t.id === cnrtModal.transportId)}
          events={transportEvents[cnrtModal.transportId] || []}
          onClose={() => setCnrtModal({ isOpen: false, transportId: null })}
          onExport={(sid, eid, stops) => handleExportCNRT(sid, eid, stops)}
        />
      )}

      {/* NUEVO MODAL PARA CRONOGRAMA */}
      {stopsExportModal.isOpen && (
        <CnrtExportModal
          title="Exportar Solo Paradas"
          transport={transports.find(
            (t) => t.id === stopsExportModal.transportId,
          )}
          events={transportEvents[stopsExportModal.transportId] || []}
          onClose={() =>
            setStopsExportModal({ isOpen: false, transportId: null })
          }
          onExport={(sid, eid) => handleExportOnlyStops(sid, eid)}
        />
      )}

      {roadmapModal.isOpen && (
        <CnrtExportModal
          title="Exportar Hoja de Ruta"
          transport={transports.find((t) => t.id === roadmapModal.transportId)}
          events={transportEvents[roadmapModal.transportId] || []}
          onClose={() => setRoadmapModal({ isOpen: false, transportId: null })}
          onExport={handleExportRoadmap}
        />
      )}

      {itineraryModal.isOpen && (
        <ItineraryManagerModal
          supabase={supabase}
          isOpen={itineraryModal.isOpen}
          onClose={() =>
            setItineraryModal({ isOpen: false, transportId: null })
          }
          giraId={giraId}
          transportId={itineraryModal.transportId}
          transportName={
            transports.find((t) => t.id === itineraryModal.transportId)
              ?.detalle || "Transporte"
          }
          locations={locationsList}
          localities={localitiesList}
          roster={roster}
          onApplyItinerary={handleInsertItinerary}
        />
      )}

      {boardingModal.isOpen && (
        <BoardingManagerModal
          isOpen={boardingModal.isOpen}
          onClose={() => setBoardingModal({ isOpen: false, transportId: null })}
          transportId={boardingModal.transportId}
          passengers={passengerList}
          events={transportEvents[boardingModal.transportId] || []}
          onSaveBoarding={handleSaveBoarding}
          onDeleteBoarding={handleDeleteBoardingRule}
        />
      )}

      {rulesModal.isOpen && (
        <StopRulesManager
          isOpen={rulesModal.isOpen}
          onClose={() =>
            setRulesModal({
              isOpen: false,
              event: null,
              type: null,
              transportId: null,
            })
          }
          event={rulesModal.event}
          type={rulesModal.type}
          transportId={rulesModal.transportId}
          supabase={supabase}
          giraId={giraId}
          regions={regionsList}
          localities={localitiesList}
          musicians={roster}
          onRefresh={refresh}
        />
      )}

      <ShiftScheduleModal
        isOpen={shiftModal.isOpen}
        transportName={shiftModal.transportName}
        events={(transportEvents[shiftModal.transportId] || []).filter((e) =>
          selectedEventIds.size > 0 ? selectedEventIds.has(e.id) : true,
        )}
        onClose={() =>
          setShiftModal({ isOpen: false, transportId: null, transportName: "" })
        }
        onApply={(offset) => {
          handleApplyShiftSchedule(offset);
          clearSelection();
        }}
      />
    </div>
  );
}
