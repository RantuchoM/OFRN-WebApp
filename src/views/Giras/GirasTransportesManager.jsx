import React, { useState, useEffect, useMemo } from "react";
import * as XLSX from "xlsx";
import ExcelJS from "exceljs";
import { format, differenceInYears, addMinutes } from "date-fns";
import { es } from "date-fns/locale";

import {
  IconTrash,
  IconTruck,
  IconPlus,
  IconMapPin,
  IconSearch,
  IconX,
  IconEdit,
  IconSave,
  IconUpload,
  IconDownload,
  IconFileText,
  IconUsers,
  IconAlertTriangle,
  IconCheckCircle,
} from "../../components/ui/Icons";
import DateInput from "../../components/ui/DateInput";
import TimeInput from "../../components/ui/TimeInput";
import SearchableSelect from "../../components/ui/SearchableSelect";
import CnrtExportModal from "./CnrtExportModal";
import ItineraryManagerModal from "./ItineraryManagerModal";
import BoardingManagerModal from "./BoardingManagerModal";
import StopRulesManager from "./StopRulesManager";
import TransportPassengersModal from "./TransportPassengersModal";
import { useLogistics } from "../../hooks/useLogistics";

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
  fileName = "Lista_Pasajeros.xlsx"
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

const generateRoadmapExcel = async (
  transportName,
  events,
  passengers,
  startId,
  endId,
  paxLocalities = {}
) => {
  if (!events || events.length === 0) return alert("No hay paradas definidas.");
  const sortedEvts = [...events].sort((a, b) =>
    (a.fecha + a.hora_inicio).localeCompare(b.fecha + b.hora_inicio)
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
    { key: "col2", width: 30 },
    { key: "col3", width: 30 },
  ];

  activeEvents.forEach((evt, idx) => {
    const stopNum = idx + 1;
    const timeStr = evt.hora_inicio ? evt.hora_inicio.slice(0, 5) : "--:--";
    const dateStr = formatDateSafe(evt.fecha);
    const locName = evt.locaciones?.nombre || "Sin Locación Asignada";
    const address = evt.locaciones?.direccion || "";
    const city = evt.locaciones?.localidades?.localidad || "";
    const extraDesc =
      evt.descripcion && evt.descripcion !== locName ? evt.descripcion : "";
    let fullPlace = locName;
    const details = [];
    if (address) details.push(address);
    if (city) details.push(city);
    if (details.length > 0) fullPlace += ` (${details.join(" - ")})`;
    if (extraDesc) fullPlace += `\nNota: ${extraDesc}`;

    // 1. HEADER DE LA PARADA
    const headerRow = worksheet.addRow([
      `PARADA #${stopNum}   |   ${timeStr} hs   |   ${dateStr}`,
      "",
      "",
    ]);
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 12 };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1565C0" },
    };
    headerRow.getCell(1).alignment = { vertical: "middle" };
    worksheet.mergeCells(`A${headerRow.number}:C${headerRow.number}`);

    // 2. DETALLE DEL LUGAR
    const placeRow = worksheet.addRow(["LUGAR:", fullPlace, ""]);
    placeRow.font = { bold: true };
    placeRow.height = 30;
    placeRow.getCell(1).font = {
      bold: true,
      color: { argb: "FF555555" },
      size: 10,
    };
    placeRow.getCell(1).alignment = { vertical: "top" };
    placeRow.getCell(2).alignment = { vertical: "top", wrapText: true };
    worksheet.mergeCells(`B${placeRow.number}:C${placeRow.number}`);

    // Filtros de Pasajeros
    const ups = passengers.filter((p) =>
      p.logistics?.transports?.some(
        (t) => String(t.subidaId) === String(evt.id)
      )
    );
    const downs = passengers.filter((p) =>
      p.logistics?.transports?.some(
        (t) => String(t.bajadaId) === String(evt.id)
      )
    );
    ups.sort((a, b) => (a.apellido || "").localeCompare(b.apellido || ""));
    downs.sort((a, b) => (a.apellido || "").localeCompare(b.apellido || ""));

    // Cálculo de total a bordo
    const paxOnBoard = passengers.filter((p) => {
      return p.logistics?.transports?.some((t) => {
        if (!t || !t.subidaId || !t.bajadaId) return false;
        const upIdx = sortedEvts.findIndex(
          (e) => String(e.id) === String(t.subidaId)
        );
        const downIdx = sortedEvts.findIndex(
          (e) => String(e.id) === String(t.bajadaId)
        );
        const currentIdx = sortedEvts.findIndex(
          (e) => String(e.id) === String(evt.id)
        );
        return upIdx <= currentIdx && downIdx > currentIdx;
      });
    }).length;

    // 3. SECCIÓN SUBEN (Condicional)
    if (ups.length > 0) {
      const subenHeader = worksheet.addRow([
        `SUBEN (${ups.length})`,
        "NOMBRE",
        "LOCALIDAD",
      ]);
      subenHeader.font = { bold: true, color: { argb: "FF2E7D32" } }; // Verde
      subenHeader.getCell(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFEBQEFA" },
      };

      ups.forEach((p) => {
        const loc = paxLocalities[p.id] || "-";
        worksheet.addRow([p.apellido?.toUpperCase(), p.nombre, loc]);
      });
    }

    // 4. SECCIÓN BAJAN (Condicional)
    if (downs.length > 0) {
      const bajanHeader = worksheet.addRow([
        `BAJAN (${downs.length})`,
        "NOMBRE",
        "LOCALIDAD",
      ]);
      bajanHeader.font = { bold: true, color: { argb: "FFC62828" } }; // Rojo

      downs.forEach((p) => {
        const loc = paxLocalities[p.id] || "-";
        worksheet.addRow([p.apellido?.toUpperCase(), p.nombre, loc]);
      });
    }

    // 5. TOTAL A BORDO
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

    // Espacio separador
    worksheet.addRow(["", "", ""]);
  });

  // Bordes finales
  worksheet.eachRow((row) => {
    row.eachCell((cell) => {
      if (!cell.border) {
        cell.border = {
          top: { style: "thin", color: { argb: "FFDDDDDD" } },
          bottom: { style: "thin", color: { argb: "FFDDDDDD" } },
        };
      }
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `Hoja_Ruta_Detallada_${transportName}.xlsx`;
  anchor.click();
  window.URL.revokeObjectURL(url);
};

// --- COMPONENTE INTERNO: INDICADOR DE INTEGRIDAD ---
const DataIntegrityIndicator = ({ passengers }) => {
  const issues = useMemo(() => {
    const list = [];
    passengers?.forEach((p) => {
      const missing = [];
      if (!p.dni) missing.push("DNI");
      if (!p.fecha_nac) missing.push("Fecha Nac.");
      if (!p.genero) missing.push("Género");

      if (missing.length > 0) {
        list.push({ id: p.id, name: `${p.apellido}, ${p.nombre}`, missing });
      }
    });
    return list;
  }, [passengers]);

  if (issues.length === 0) {
    return (
      <div className="flex items-center gap-1.5 text-emerald-600 px-3 py-1.5 bg-emerald-50 rounded border border-emerald-100 transition-all select-none">
        <IconCheckCircle size={14} />
        <span className="text-xs font-bold">Datos completos</span>
      </div>
    );
  }

  return (
    <div className="group relative flex items-center gap-2 cursor-help select-none mr-2">
      {/* Animación de ping rojo */}
      <span className="flex h-3 w-3 relative">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
      </span>

      <span className="text-xs font-bold text-red-600 animate-pulse">
        Faltan datos ({issues.length})
      </span>

      {/* Tooltip personalizado */}
      <div className="absolute top-full right-0 mt-2 w-64 bg-white border border-red-200 shadow-xl rounded-lg p-0 z-50 hidden group-hover:flex flex-col max-h-60">
        <div className="bg-red-50 p-2 border-b border-red-100 rounded-t-lg">
          <p className="text-[10px] font-bold text-red-800 uppercase tracking-wider">
            Datos Personales Faltantes
          </p>
        </div>
        <div className="overflow-y-auto p-2">
          <ul className="space-y-2">
            {issues.map((issue) => (
              <li
                key={issue.id}
                className="flex flex-col border-b border-slate-50 last:border-0 pb-1"
              >
                <span className="text-xs font-semibold text-slate-700">
                  {issue.name}
                </span>
                <span className="text-[10px] text-red-500 flex gap-1 items-center">
                  <IconAlertTriangle size={8} /> {issue.missing.join(", ")}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

// =================================================================================================
// COMPONENTE PRINCIPAL
// =================================================================================================

export default function GirasTransportesManager({ supabase, gira }) {
  const {
    summary: rawSummary,
    transportRules,
    loading: rosterLoading,
    refresh,
    roster,
  } = useLogistics(supabase, gira);

  const passengerList = rawSummary || [];
  const giraId = gira?.id;

  // Estados
  const [transports, setTransports] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [locationsList, setLocationsList] = useState([]);
  const [regionsList, setRegionsList] = useState([]);
  const [localitiesList, setLocalitiesList] = useState([]);
  const [musiciansList, setMusiciansList] = useState([]);
  const [transportEvents, setTransportEvents] = useState({});
  const [paxLocalities, setPaxLocalities] = useState({});
  const [loading, setLoading] = useState(false);

  // Modal simple
  const [infoListModal, setInfoListModal] = useState({
    isOpen: false,
    title: "",
    list: [],
  });

  const InfoListModal = () => {
    if (!infoListModal.isOpen) return null;
    return (
      <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[80vh] flex flex-col">
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
          <div className="p-4 overflow-y-auto flex-1">
            {infoListModal.list.length === 0 ? (
              <p className="text-center text-slate-500 italic">
                La lista está vacía.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {infoListModal.list.map((p) => (
                  <li
                    key={p.id}
                    className="py-2 text-sm flex justify-between items-center"
                  >
                    <span className="font-medium text-slate-700">
                      {p.apellido}, {p.nombre}
                    </span>
                    {p.logistics?.transports?.length > 0 && (
                      <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                        x{p.logistics.transports.length} Buses
                      </span>
                    )}
                  </li>
                ))}
              </ul>
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
  });
  const [editingEventId, setEditingEventId] = useState(null);
  const [newEvent, setNewEvent] = useState({
    fecha: "",
    hora: "",
    id_locacion: null,
    descripcion: "",
    id_tipo_evento: "11",
  });

  // Modales
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
        // Formatear etiqueta: Nombre (Localidad)
        const labelText =
          l.ciudad && l.ciudad !== "Sin ciudad"
            ? `${l.nombre} (${l.ciudad})`
            : l.nombre;

        return {
          id: l.id,
          label: labelText,
          subLabel: l.direccion || l.ciudad, // Muestra dirección o ciudad como dato secundario
        };
      }),
    [locationsList]
  );

  // --- DASHBOARD DE COBERTURA ---
  const coverageStats = useMemo(() => {
    if (!passengerList || passengerList.length === 0)
      return { none: [], single: [], multiple: [] };

    const stats = { none: [], single: [], multiple: [] };
    passengerList.forEach((p) => {
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
            .select("id, localidad")
            .order("localidad"),
          // [UPDATED] Traer id_localidad explícitamente para asegurar mapeo
          supabase
            .from("integrantes")
            .select(
              "id, nombre, apellido, dni, genero, fecha_nac, nacionalidad, id_localidad, localidades(localidad)"
            ),
        ]);

      setCatalog(catData.data || []);
      setRegionsList(regData.data || []);
      setLocalitiesList(cityData.data || []);
      setMusiciansList(musDataInfo.data || []);
      setPaxLocalities(
        (musDataInfo.data || []).reduce(
          (acc, m) => ({ ...acc, [m.id]: m.localidades?.localidad || "" }),
          {}
        )
      );
      setLocationsList(
        (locData.data || []).map((l) => ({
          id: l.id,
          nombre: l.nombre,
          direccion: l.direccion,
          ciudad: l.localidades?.localidad || "Sin ciudad",
        }))
      );

      const { data: list } = await supabase
        .from("giras_transportes")
        .select(
          `id, detalle, costo, capacidad_maxima, id_transporte, transportes ( nombre )`
        )
        .eq("id_gira", giraId)
        .order("id");

      setTransports(list || []);

      if (list && list.length > 0) {
        const tIds = list.map((t) => t.id);
        const { data: evts } = await supabase
          .from("eventos")
          .select(
            `id, fecha, hora_inicio, descripcion, id_tipo_evento, id_gira_transporte, id_locacion, locaciones(nombre, direccion, localidades(localidad))`
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
    const newEventsMap = { ...transportEvents };
    for (const tId in newEventsMap) {
      const idx = newEventsMap[tId].findIndex((e) => e.id === eventId);
      if (idx !== -1) {
        newEventsMap[tId][idx] = { ...newEventsMap[tId][idx], [field]: value };
        break;
      }
    }
    setTransportEvents(newEventsMap);
    try {
      await supabase
        .from("eventos")
        .update({ [field]: value })
        .eq("id", eventId);
    } catch (e) {
      fetchData();
    }
  };

  const getEventRulesSummary = (eventId, type, transportId) => {
    if (!transportRules) return [];
    const relevantRules = transportRules.filter((r) => {
      if (r.id_gira_transporte !== transportId) return false;
      if (type === "up") return String(r.id_evento_subida) === String(eventId);
      if (type === "down")
        return String(r.id_evento_bajada) === String(eventId);
      return false;
    });

    if (relevantRules.length === 0) return [];

    const mapIds = (ids, list, keyField = "id", labelField = "nombre") => {
      return ids
        .map((id) => {
          const item = list.find((x) => String(x[keyField]) === String(id));
          return item ? item[labelField] || item.localidad || item.region : "?";
        })
        .join(", ");
    };

    const summaryParts = relevantRules.map((r) => {
      const scope = r.alcance;
      if (scope === "General") return "Todos";
      if (scope === "Persona") {
        const p = roster?.find((mus) => mus.id === r.id_integrante);
        return p ? `${p.nombre} ${p.apellido}` : "Individual";
      }
      if (
        r.target_ids &&
        Array.isArray(r.target_ids) &&
        r.target_ids.length > 0
      ) {
        if (scope === "Region")
          return mapIds(r.target_ids, regionsList, "id", "region");
        if (scope === "Localidad")
          return mapIds(r.target_ids, localitiesList, "id", "localidad");
        return r.target_ids.join(", ");
      }
      if (scope === "Region" && r.id_region) {
        const reg = regionsList.find(
          (x) => String(x.id) === String(r.id_region)
        );
        return reg ? reg.region : "Región";
      }
      if (scope === "Localidad" && r.id_localidad) {
        const loc = localitiesList.find(
          (x) => String(x.id) === String(r.id_localidad)
        );
        return loc ? loc.localidad : "Loc";
      }
      return scope;
    });
    return [...new Set(summaryParts)].filter(Boolean);
  };
  const handleInsertItinerary = async (template, startDate, startTime) => {
    const tId = itineraryModal.transportId;
    if (!tId || !template || !startDate || !startTime) return;

    setLoading(true);
    try {
      // 1. PREPARACIÓN DE DATOS Y LÓGICA (ALGORITMO N+1)
      const tramos = (template.plantillas_recorridos_tramos || []).sort(
        (a, b) => a.orden - b.orden
      );

      let currentDateTime = new Date(`${startDate}T${startTime}`);
      const eventsToCreate = [];

      // A) Crear el PRIMER evento (Origen del primer tramo) - Solo suben
      if (tramos.length > 0) {
        const primerTramo = tramos[0];
        eventsToCreate.push({
          fecha: format(currentDateTime, "yyyy-MM-dd"),
          hora: format(currentDateTime, "HH:mm:ss"),
          id_locacion: primerTramo.id_locacion_origen,
          descripcion: primerTramo.nota || "Inicio Recorrido",
          id_tipo_evento: primerTramo.id_tipo_evento || 11,
          // Acciones lógicas:
          suben: primerTramo.ids_localidades_suben || [],
          bajan: [], // Nadie baja en el inicio
        });
      }

      // B) Recorrer tramos para crear los DESTINOS
      tramos.forEach((tramo, index) => {
        // Sumamos el tiempo de viaje
        currentDateTime = addMinutes(
          currentDateTime,
          tramo.duracion_minutos || 60
        );

        const siguienteTramo = tramos[index + 1];

        eventsToCreate.push({
          fecha: format(currentDateTime, "yyyy-MM-dd"),
          hora: format(currentDateTime, "HH:mm:ss"),
          id_locacion: tramo.id_locacion_destino, // Llegamos al destino de este tramo

          // Nota/Tipo: Si hay siguiente tramo, usamos sus datos (es una escala). Si no, es Fin.
          descripcion: siguienteTramo
            ? siguienteTramo.nota || "Escala"
            : "Fin de Recorrido",
          id_tipo_evento: siguienteTramo
            ? siguienteTramo.id_tipo_evento || 11
            : 11,

          // Acciones lógicas:
          // Bajan: Los que venían en ESTE tramo
          bajan: tramo.ids_localidades_bajan || [],
          // Suben: Los que van a viajar en el SIGUIENTE tramo
          suben: siguienteTramo
            ? siguienteTramo.ids_localidades_suben || []
            : [],
        });
      });

      // 2. EJECUCIÓN EN BASE DE DATOS (INSERTAR EVENTOS Y REGLAS)
      for (const evtData of eventsToCreate) {
        // Insertar el Evento
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
        const rulesToInsert = [];

        // Función auxiliar para generar reglas (Mantiene tu lógica de exclusión de producción)
        const generateRules = (locIds, type) => {
          // type: 'subida' o 'bajada'
          if (!locIds || locIds.length === 0) return;

          locIds.forEach((locId) => {
            // 1. Regla Inclusiva (Localidad)
            const rule = {
              id_gira_transporte: tId,
              alcance: "Localidad",
              id_localidad: locId,
              solo_logistica: true,
            };
            if (type === "subida") rule.id_evento_subida = eventId;
            else rule.id_evento_bajada = eventId;

            rulesToInsert.push(rule);

            // 2. Regla Exclusiva (Producción fuera)
            const prodMembers = roster?.filter((r) => {
              const rLoc = r.id_localidad || r.localidades?.id;
              const role = (r.rol || r.rol_gira || "").toLowerCase();
              return String(rLoc) === String(locId) && role === "produccion";
            });

            if (prodMembers && prodMembers.length > 0) {
              prodMembers.forEach((pm) => {
                const exclusionRule = {
                  id_gira_transporte: tId,
                  alcance: "Persona",
                  id_integrante: pm.id,
                  solo_logistica: true,
                  es_exclusion: true,
                };
                if (type === "subida") exclusionRule.id_evento_subida = eventId;
                else exclusionRule.id_evento_bajada = eventId;

                rulesToInsert.push(exclusionRule);
              });
            }
          });
        };

        // Generar reglas para este evento
        generateRules(evtData.suben, "subida");
        generateRules(evtData.bajan, "bajada");

        // Insertar reglas en lote
        if (rulesToInsert.length > 0) {
          await supabase
            .from("giras_logistica_reglas_transportes")
            .insert(rulesToInsert);
        }
      }

      fetchData();
      refresh();
      setItineraryModal({ isOpen: false, transportId: null }); // Cerrar modal al terminar
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
    let desc = newEvent.descripcion;
    if (!desc) {
      const loc = locationsList.find((l) => l.id === newEvent.id_locacion);
      desc = loc ? `${loc.nombre} (${loc.ciudad})` : "Parada de transporte";
    }
    const payload = {
      id_gira: giraId,
      id_gira_transporte: transportId,
      fecha: newEvent.fecha,
      hora_inicio: newEvent.hora,
      id_locacion: newEvent.id_locacion,
      descripcion: desc,
      id_tipo_evento: parseInt(newEvent.id_tipo_evento),
      convocados: [],
    };

    if (editingEventId && editingEventId !== "new") {
      await supabase.from("eventos").update(payload).eq("id", editingEventId);
    } else {
      await supabase.from("eventos").insert([payload]);
    }
    setNewEvent({
      fecha: "",
      hora: "",
      id_locacion: null,
      descripcion: "",
      id_tipo_evento: "11",
    });
    setEditingEventId(null);
    fetchData();
  };

  const startEditEvent = (evt) => {
    setEditingEventId(evt.id || "new");
    setNewEvent({
      fecha: evt.fecha || "",
      hora: evt.hora_inicio || "",
      id_locacion: evt.id_locacion || null,
      descripcion: evt.descripcion || "",
      id_tipo_evento: evt.id_tipo_evento ? evt.id_tipo_evento.toString() : "11",
    });
  };

  const cancelEdit = () => {
    setEditingEventId(null);
    setNewEvent({
      fecha: "",
      hora: "",
      id_locacion: null,
      descripcion: "",
      id_tipo_evento: "11",
    });
  };

  const handleDeleteEvent = async (eventId) => {
    const rulesAffectingUp = (transportRules || []).filter(
      (r) => String(r.id_evento_subida) === String(eventId)
    );
    const rulesAffectingDown = (transportRules || []).filter(
      (r) => String(r.id_evento_bajada) === String(eventId)
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
          .from("giras_logistica_reglas_transportes")
          .update({ id_evento_subida: null })
          .eq("id_evento_subida", eventId);
      }
      if (rulesAffectingDown.length > 0) {
        await supabase
          .from("giras_logistica_reglas_transportes")
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
        .from("giras_logistica_reglas_transportes")
        .select("id")
        .eq("id_gira_transporte", boardingModal.transportId)
        .eq("alcance", "Persona")
        .eq("id_integrante", personId)
        .eq("solo_logistica", true);

      const updates = {
        id_evento_subida: subidaId ? parseInt(subidaId) : null,
        id_evento_bajada: bajadaId ? parseInt(bajadaId) : null,
      };

      if (existingRules && existingRules.length > 0) {
        await supabase
          .from("giras_logistica_reglas_transportes")
          .update(updates)
          .eq("id", existingRules[0].id);
      } else {
        await supabase.from("giras_logistica_reglas_transportes").insert([
          {
            id_gira_transporte: boardingModal.transportId,
            alcance: "Persona",
            id_integrante: personId,
            solo_logistica: true,
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
        "¿Eliminar la excepción personalizada y volver a la regla general?"
      )
    )
      return;

    try {
      await supabase
        .from("giras_logistica_reglas_transportes")
        .delete()
        .eq("id_gira_transporte", boardingModal.transportId)
        .eq("alcance", "Persona")
        .eq("id_integrante", personId)
        .eq("solo_logistica", true);

      await refresh();
    } catch (err) {
      console.error(err);
      alert("Error al eliminar regla.");
    }
  };

  const handleExportGlobal = () => {
    const travelingPax = passengerList.filter(
      (p) => p.logistics?.transports?.length > 0
    );
    downloadStyledExcel(travelingPax, `Transporte_General_Gira${giraId}.xlsx`);
  };

  const handleExportCNRT = (startId, endId) => {
    const tId = cnrtModal.transportId;
    const tInfo = transports.find((t) => t.id === tId);
    if (!tInfo) return;
    const events = transportEvents[tId] || [];
    const sortedEvts = [...events].sort((a, b) =>
      (a.fecha + a.hora_inicio).localeCompare(b.fecha + b.hora_inicio)
    );
    const startIndex = sortedEvts.findIndex(
      (e) => String(e.id) === String(startId)
    );
    const endIndex = sortedEvts.findIndex(
      (e) => String(e.id) === String(endId)
    );

    if (startIndex === -1 || endIndex === -1 || startIndex >= endIndex)
      return alert("Rango inválido");

    const tPax = passengerList.filter((p) => {
      const transportData = p.logistics?.transports?.find((t) => t.id === tId);
      if (!transportData) return false;
      const pInIdx = sortedEvts.findIndex(
        (e) => String(e.id) === String(transportData.subidaId)
      );
      const pOutIdx = sortedEvts.findIndex(
        (e) => String(e.id) === String(transportData.bajadaId)
      );
      return pInIdx < endIndex && pOutIdx > startIndex;
    });

    downloadStyledExcel(tPax, `CNRT_${tInfo.detalle}.xlsx`);
    setCnrtModal({ isOpen: false, transportId: null });
  };

  const handleExportRoadmap = (startId, endId) => {
    const tId = roadmapModal.transportId;
    const tInfo = transports.find((t) => t.id === tId);
    const tPax = passengerList.filter((p) =>
      p.logistics?.transports?.some((t) => t.id === tId)
    );
    generateRoadmapExcel(
      tInfo?.detalle || "Transporte",
      transportEvents[tId] || [],
      tPax,
      startId,
      endId,
      paxLocalities
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
    try {
      await supabase
        .from("giras_transportes")
        .update({
          detalle: editFormData.detalle,
          capacidad_maxima: editFormData.capacidad
            ? parseInt(editFormData.capacidad)
            : null,
          costo: parseFloat(editFormData.costo) || 0,
        })
        .eq("id", editingTransportId);
      setEditingTransportId(null);
      await fetchData();
    } catch (error) {
      console.error(error);
      alert("Error al actualizar transporte");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto p-4 bg-white rounded-lg shadow-sm border border-slate-200 max-w-6xl mx-auto">
      {/* 1. DASHBOARD DE COBERTURA */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        {/* ASIGNADOS OK */}
        <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-lg flex items-center gap-3">
          <div className="p-2 bg-emerald-100 rounded-full text-emerald-600">
            <IconCheckCircle size={20} />
          </div>
          <div>
            <div className="text-xl font-bold text-emerald-700">
              {coverageStats.single.length}
            </div>
            <div className="text-xs text-emerald-600 font-medium">
              Asignados (1 transporte)
            </div>
          </div>
        </div>

        {/* MULTI-TRANSPORTE */}
        <div
          onClick={() =>
            setInfoListModal({
              isOpen: true,
              title: "Pasajeros en Múltiples Transportes",
              list: coverageStats.multiple,
            })
          }
          className="bg-amber-50 border border-amber-100 p-3 rounded-lg flex items-center gap-3 cursor-pointer hover:bg-amber-100 transition-colors"
        >
          <div className="p-2 bg-amber-100 rounded-full text-amber-600">
            <IconTruck size={20} />
          </div>
          <div>
            <div className="text-xl font-bold text-amber-700">
              {coverageStats.multiple.length}
            </div>
            <div className="text-xs text-amber-600 font-medium underline decoration-dashed underline-offset-2">
              Multi-transporte (Ver)
            </div>
          </div>
        </div>

        {/* SIN TRANSPORTE */}
        <div
          onClick={() =>
            setInfoListModal({
              isOpen: true,
              title: "Lista de Espera (Sin Transporte)",
              list: coverageStats.none,
            })
          }
          className="bg-rose-50 border border-rose-100 p-3 rounded-lg flex items-center gap-3 cursor-pointer hover:bg-rose-100 transition-colors"
        >
          <div className="p-2 bg-rose-100 rounded-full text-rose-600">
            <IconAlertTriangle size={20} />
          </div>
          <div>
            <div className="text-xl font-bold text-rose-700">
              {coverageStats.none.length}
            </div>
            <div className="text-xs text-rose-600 font-medium underline decoration-dashed underline-offset-2">
              Sin transporte (Ver)
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center mb-4 border-b pb-2">
        <h3 className="font-bold text-slate-700 flex items-center gap-2">
          <IconTruck className="text-indigo-600" /> Gestión de Transportes
        </h3>
        <div className="flex gap-2 items-center">
          {/* NUEVO: INDICADOR DE INTEGRIDAD DE DATOS */}
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

      {/* FORMULARIO DE AGREGAR TRANSPORTE */}
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
                {c.nombre}
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

      {/* LISTA DE TRANSPORTES */}
      <div className="space-y-4">
        {transports.map((t) => {
          const isExpanded = activeTransportId === t.id;
          const myEvents = transportEvents[t.id] || [];

          // 1. Filtrar pasajeros
          const tPassengers = passengerList.filter((p) =>
            p.logistics?.transports?.some((tr) => tr.id === t.id)
          );

          const tPassengerCount = tPassengers.length;

          // 2. Calcular Plazas de Instrumentos
          const tInstrumentSeats = tPassengers.filter(
            (p) => p.instrumentos?.plaza_extra
          ).length;

          const totalOccupied = tPassengerCount + tInstrumentSeats; // Pax + Instrumentos

          const maxCap = t.capacidad_maxima || 0;

          // 3. Lógica de Colores basada en ocupación TOTAL
          const isOverbooked = maxCap > 0 && totalOccupied > maxCap;
          const occupancyColor = isOverbooked
            ? "text-red-600 bg-red-50 border-red-200"
            : maxCap > 0 && totalOccupied === maxCap
            ? "text-amber-600 bg-amber-50 border-amber-200"
            : "text-indigo-600";

          const incompletePax = tPassengers.filter((p) => {
            const tr = p.logistics?.transports?.find((x) => x.id === t.id);
            return tr && (!tr.subidaId || !tr.bajadaId);
          });
          const isEditing = editingTransportId === t.id;

          return (
            <div
              key={t.id}
              className={`border rounded-lg transition-all ${
                isExpanded
                  ? "border-indigo-300 shadow-md bg-white"
                  : "border-slate-200 bg-white"
              }`}
            >
              {/* HEADER DE LA TARJETA */}
              <div
                className="p-3 flex justify-between items-center cursor-pointer hover:bg-slate-50"
                onClick={() =>
                  !isEditing && setActiveTransportId(isExpanded ? null : t.id)
                }
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className="p-2 rounded-full bg-slate-100 text-slate-500">
                    <IconTruck size={20} />
                  </div>
                  {isEditing ? (
                    <div
                      className="flex gap-2 items-center flex-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex flex-col">
                        <label className="text-[9px] font-bold text-slate-400">
                          DETALLE
                        </label>
                        <input
                          className="border border-indigo-300 rounded px-2 py-1 text-sm w-48 outline-none"
                          value={editFormData.detalle}
                          onChange={(e) =>
                            setEditFormData({
                              ...editFormData,
                              detalle: e.target.value,
                            })
                          }
                          autoFocus
                        />
                      </div>
                      <div className="flex flex-col w-24">
                        <label className="text-[9px] font-bold text-slate-400">
                          CAPACIDAD
                        </label>
                        <input
                          type="number"
                          className="border border-indigo-300 rounded px-2 py-1 text-sm w-full outline-none"
                          value={editFormData.capacidad}
                          onChange={(e) =>
                            setEditFormData({
                              ...editFormData,
                              capacidad: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="flex gap-1 mt-4">
                        <button
                          onClick={saveTransportChanges}
                          className="bg-indigo-600 text-white p-1 rounded hover:bg-indigo-700"
                        >
                          <IconSave size={16} />
                        </button>
                        <button
                          onClick={cancelEditingTransport}
                          className="bg-slate-200 text-slate-600 p-1 rounded hover:bg-slate-300"
                        >
                          <IconX size={16} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="font-bold text-slate-800 flex items-center gap-2">
                        {t.detalle || "Sin detalle"}
                        <button
                          onClick={(e) => startEditingTransport(e, t)}
                          className="text-slate-300 hover:text-indigo-600"
                        >
                          <IconEdit size={14} />
                        </button>
                      </div>
                      <div className="text-xs text-slate-500 uppercase flex items-center gap-2 mt-1">
                        <span>{t.transportes?.nombre}</span>
                        <span className="text-slate-300">|</span>
                        <span
                          className={`font-bold px-2 py-0.5 rounded border ${occupancyColor} flex items-center gap-1`}
                        >
                          {isOverbooked && <IconAlertTriangle size={12} />}

                          {/* VISUALIZACIÓN: Pax (+Instr) / Capacidad */}
                          <span>{tPassengerCount}</span>
                          {tInstrumentSeats > 0 && (
                            <span className="opacity-80 text-[10px]">
                              + {tInstrumentSeats} instr.
                            </span>
                          )}

                          {maxCap > 0 ? (
                            <span className="opacity-60">/ {maxCap}</span>
                          ) : (
                            <span className="opacity-60"></span>
                          )}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {!isEditing && (
                  <div className="flex gap-2 items-center">
                    {incompletePax.length > 0 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setInfoListModal({
                            isOpen: true,
                            title: `Pasajeros sin parada en ${
                              t.detalle || "Transporte"
                            }`,
                            list: incompletePax,
                          });
                        }}
                        className="flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 border border-amber-300 rounded text-[10px] font-bold hover:bg-amber-200 animate-pulse"
                        title="Ver lista de pasajeros sin parada definida"
                      >
                        <IconAlertTriangle size={12} /> {incompletePax.length}{" "}
                        Sin asignar
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setPassengersModal({ isOpen: true, transportId: t.id });
                      }}
                      className="flex items-center gap-2 px-3 py-1 bg-indigo-600 text-white rounded text-xs font-bold hover:bg-indigo-700 shadow-sm"
                    >
                      <IconUsers size={14} /> Pasajeros
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setItineraryModal({ isOpen: true, transportId: t.id });
                      }}
                      className="text-xs bg-indigo-50 text-indigo-600 px-2 py-1 rounded font-bold border border-indigo-100 hover:bg-indigo-100"
                    >
                      + Itinerario
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setBoardingModal({ isOpen: true, transportId: t.id });
                      }}
                      className="px-2 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded text-[10px] font-bold hover:bg-amber-100"
                      title="Gestor de Abordaje"
                    >
                      <IconUsers size={14} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setRoadmapModal({ isOpen: true, transportId: t.id });
                      }}
                      className="px-2 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded text-[10px] font-bold hover:bg-blue-100"
                      title="Hoja de Ruta"
                    >
                      <IconFileText size={14} /> Hoja Ruta
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setCnrtModal({ isOpen: true, transportId: t.id });
                      }}
                      className="px-2 py-1 bg-slate-50 text-slate-600 border border-slate-200 rounded text-[10px] font-bold hover:bg-slate-100"
                      title="Lista CNRT"
                    >
                      CNRT
                    </button>
                    {isExpanded && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTransport(t.id);
                        }}
                        className="text-red-400 hover:text-red-600 p-2"
                      >
                        <IconTrash size={16} />
                      </button>
                    )}
                    <div
                      className={`transform transition-transform ${
                        isExpanded ? "rotate-180" : ""
                      } text-slate-400`}
                    >
                      ▼
                    </div>
                  </div>
                )}
              </div>

              {isExpanded && (
                <div className="p-0 overflow-x-auto">
                  <table className="w-full min-w-[1000px] text-xs text-left border-t border-slate-200">
                    <thead className="bg-slate-50 text-slate-500 font-semibold border-b">
                      <tr>
                        <th className="p-2 w-32">Fecha</th>
                        <th className="p-2 w-24">Hora</th>
                        <th className="p-2 min-w-[200px]">
                          Locación (Destino)
                        </th>
                        <th className="p-2 min-w-[150px]">Nota</th>
                        <th className="p-2 w-24">Visibilidad</th>
                        <th className="p-2 w-28 text-center bg-emerald-50 text-emerald-700 border-l border-emerald-100">
                          Suben
                        </th>
                        <th className="p-2 w-28 text-center bg-rose-50 text-rose-700 border-l border-rose-100">
                          Bajan
                        </th>
                        <th className="p-2 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {myEvents.map((evt) => {
                        const upsCount = (passengerList || []).filter((p) =>
                          p.logistics?.transports?.some(
                            (tr) => String(tr.subidaId) === String(evt.id)
                          )
                        ).length;
                        const downsCount = (passengerList || []).filter((p) =>
                          p.logistics?.transports?.some(
                            (tr) => String(tr.bajadaId) === String(evt.id)
                          )
                        ).length;
                        const upsSummary = getEventRulesSummary(
                          evt.id,
                          "up",
                          t.id
                        );
                        const downsSummary = getEventRulesSummary(
                          evt.id,
                          "down",
                          t.id
                        );

                        return (
                          <tr key={evt.id} className="hover:bg-slate-50 group">
                            <td className="p-1">
                              <DateInput
                                value={evt.fecha}
                                onChange={(v) =>
                                  handleUpdateEvent(evt.id, "fecha", v)
                                }
                                className="h-8 border-transparent hover:border-slate-300 bg-transparent"
                              />
                            </td>
                            <td className="p-1">
                              <TimeInput
                                value={evt.hora_inicio}
                                onChange={(v) =>
                                  handleUpdateEvent(evt.id, "hora_inicio", v)
                                }
                                className="h-8 border-transparent hover:border-slate-300 bg-transparent"
                              />
                            </td>
                            <td className="p-1 relative">
                              <SearchableSelect
                                options={locationOptions}
                                value={evt.id_locacion}
                                onChange={(v) =>
                                  handleUpdateEvent(evt.id, "id_locacion", v)
                                }
                                className="h-8"
                                placeholder="Sin locación..."
                              />
                            </td>
                            <td className="p-1">
                              <input
                                type="text"
                                className="w-full h-8 px-2 border border-transparent hover:border-slate-300 rounded bg-transparent"
                                value={evt.descripcion || ""}
                                onChange={(e) =>
                                  handleUpdateEvent(
                                    evt.id,
                                    "descripcion",
                                    e.target.value
                                  )
                                }
                                placeholder="-"
                              />
                            </td>
                            <td className="p-1">
                              <select
                                className="w-full h-8 border-transparent hover:border-slate-300 rounded bg-transparent text-xs outline-none"
                                value={evt.id_tipo_evento}
                                onChange={(e) =>
                                  handleUpdateEvent(
                                    evt.id,
                                    "id_tipo_evento",
                                    e.target.value
                                  )
                                }
                              >
                                <option value="11">Público</option>
                                <option value="12">Interno</option>
                              </select>
                            </td>
                            <td className="p-1 text-center border-l border-emerald-50 align-top">
                              <button
                                onClick={() =>
                                  setRulesModal({
                                    isOpen: true,
                                    event: evt,
                                    type: "up",
                                    transportId: t.id,
                                  })
                                }
                                className={`w-full py-1 px-1 h-auto rounded text-[10px] font-bold flex flex-col items-center justify-center gap-1 min-h-[32px] ${
                                  upsCount > 0
                                    ? "bg-emerald-100 text-emerald-700"
                                    : "bg-slate-100 text-slate-400"
                                }`}
                              >
                                <div className="flex items-center gap-1 border-b border-black/5 pb-0.5 w-full justify-center">
                                  <IconUpload size={10} />{" "}
                                  <span>
                                    {upsCount > 0 ? `${upsCount} Pax` : "+"}
                                  </span>
                                </div>
                                {upsSummary && upsSummary.length > 0 && (
                                  <div className="flex flex-col gap-0.5 w-full text-center">
                                    {upsSummary.map((line, idx) => (
                                      <span
                                        key={idx}
                                        className="text-[9px] font-normal leading-tight break-words opacity-90"
                                      >
                                        {line}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </button>
                            </td>
                            <td className="p-1 text-center border-l border-rose-50 align-top">
                              <button
                                onClick={() =>
                                  setRulesModal({
                                    isOpen: true,
                                    event: evt,
                                    type: "down",
                                    transportId: t.id,
                                  })
                                }
                                className={`w-full py-1 px-1 h-auto rounded text-[10px] font-bold flex flex-col items-center justify-center gap-1 min-h-[32px] ${
                                  downsCount > 0
                                    ? "bg-rose-100 text-rose-700"
                                    : "bg-slate-100 text-slate-400"
                                }`}
                              >
                                <div className="flex items-center gap-1 border-b border-black/5 pb-0.5 w-full justify-center">
                                  <IconDownload size={10} />{" "}
                                  <span>
                                    {downsCount > 0 ? `${downsCount} Pax` : "+"}
                                  </span>
                                </div>
                                {downsSummary && downsSummary.length > 0 && (
                                  <div className="flex flex-col gap-0.5 w-full text-center">
                                    {downsSummary.map((line, idx) => (
                                      <span
                                        key={idx}
                                        className="text-[9px] font-normal leading-tight break-words opacity-90"
                                      >
                                        {line}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </button>
                            </td>
                            <td className="p-1 text-center align-middle">
                              <button
                                onClick={() => handleDeleteEvent(evt.id)}
                                className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100"
                              >
                                <IconTrash size={14} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {editingEventId ? (
                        <tr className="bg-amber-50">
                          <td className="p-1">
                            <DateInput
                              value={newEvent.fecha}
                              onChange={(v) =>
                                setNewEvent({ ...newEvent, fecha: v })
                              }
                              className="h-8 border-amber-300 bg-white"
                            />
                          </td>
                          <td className="p-1">
                            <TimeInput
                              value={newEvent.hora}
                              onChange={(v) =>
                                setNewEvent({ ...newEvent, hora: v })
                              }
                              className="h-8 border-amber-300 bg-white"
                            />
                          </td>
                          <td className="p-1">
                            <SearchableSelect
                              options={locationOptions}
                              value={newEvent.id_locacion}
                              onChange={(v) =>
                                setNewEvent({ ...newEvent, id_locacion: v })
                              }
                              className="h-8 border-amber-300 bg-white"
                              placeholder="Nuevo lugar..."
                            />
                          </td>
                          <td className="p-1">
                            <input
                              type="text"
                              className="w-full h-8 px-2 border border-amber-300 rounded bg-white"
                              value={newEvent.descripcion}
                              onChange={(e) =>
                                setNewEvent({
                                  ...newEvent,
                                  descripcion: e.target.value,
                                })
                              }
                            />
                          </td>
                          <td colSpan="4" className="p-1 text-right">
                            <div className="flex gap-1 justify-end">
                              <button
                                onClick={cancelEdit}
                                className="text-[10px] px-2 py-1 bg-slate-200 rounded"
                              >
                                Cancelar
                              </button>
                              <button
                                onClick={() => handleSaveEvent(t.id)}
                                className="text-[10px] px-3 py-1 bg-amber-500 text-white rounded font-bold"
                              >
                                Guardar
                              </button>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        <tr>
                          <td
                            colSpan="9"
                            className="p-2 text-center border-t border-slate-100"
                          >
                            <button
                              onClick={() =>
                                startEditEvent({
                                  id: null,
                                  fecha: "",
                                  hora_inicio: "",
                                  id_tipo_evento: 11,
                                  descripcion: "",
                                  id_locacion: null,
                                })
                              }
                              className="text-xs text-indigo-500 font-bold hover:text-indigo-700 flex items-center justify-center gap-1 w-full"
                            >
                              <IconPlus size={12} /> Agregar Parada Manualmente
                            </button>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <InfoListModal />
      {passengersModal.isOpen && (
        <TransportPassengersModal
          isOpen={passengersModal.isOpen}
          onClose={() =>
            setPassengersModal({ isOpen: false, transportId: null })
          }
          transport={transports.find(
            (t) => t.id === passengersModal.transportId
          )}
          transportRules={transportRules}
          roster={roster}
          regions={regionsList}
          localities={localitiesList}
          supabase={supabase}
          onRefresh={refresh}
        />
      )}
      {cnrtModal.isOpen && (
        <CnrtExportModal
          transport={transports.find((t) => t.id === cnrtModal.transportId)}
          events={transportEvents[cnrtModal.transportId] || []}
          onClose={() => setCnrtModal({ isOpen: false, transportId: null })}
          onExport={handleExportCNRT}
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
          locations={locationsList}
          localities={localitiesList}
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
          musicians={musiciansList}
          onRefresh={fetchData}
        />
      )}
    </div>
  );
}
