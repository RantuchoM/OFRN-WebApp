import React, { useState, useEffect, useMemo, useRef } from "react";
import * as XLSX from "xlsx";
import ExcelJS from "exceljs";
import { format, differenceInYears, addMinutes } from "date-fns";
import { es } from "date-fns/locale";

import {
  IconTrash,
  IconTruck,
  IconPlus,
  IconLoader,
  IconMapPin,
  IconCalendar,
  IconClock,
  IconEye,
  IconEyeOff,
  IconSearch,
  IconX,
  IconEdit,
  IconSave,
  IconUpload,
  IconDownload,
  IconFileText,
  IconUsers,
  IconArrowRight,
  IconAlertTriangle,
  IconCheckCircle
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

    const headerRow = worksheet.addRow([
      `PARADA #${stopNum}  |  ${timeStr} hs  |  ${dateStr}`,
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

    const subenHeader = worksheet.addRow([
      `SUBEN (${ups.length})`,
      "NOMBRE",
      "LOCALIDAD",
    ]);
    subenHeader.font = { bold: true, color: { argb: "FF2E7D32" } };
    subenHeader.getCell(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFEBQEFA" },
    };
    if (ups.length > 0) {
      ups.forEach((p) => {
        const loc = paxLocalities[p.id] || "-";
        worksheet.addRow([p.apellido?.toUpperCase(), p.nombre, loc]);
      });
    } else {
      worksheet.addRow(["-", "-", "-"]).font = {
        italic: true,
        color: { argb: "FF999999" },
      };
    }

    const bajanHeader = worksheet.addRow([
      `BAJAN (${downs.length})`,
      "NOMBRE",
      "LOCALIDAD",
    ]);
    bajanHeader.font = { bold: true, color: { argb: "FFC62828" } };
    if (downs.length > 0) {
      downs.forEach((p) => {
        const loc = paxLocalities[p.id] || "-";
        worksheet.addRow([p.apellido?.toUpperCase(), p.nombre, loc]);
      });
    } else {
      worksheet.addRow(["-", "-", "-"]).font = {
        italic: true,
        color: { argb: "FF999999" },
      };
    }

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

// =================================================================================================
// COMPONENTE PRINCIPAL
// =================================================================================================

export default function GirasTransportesManager({ supabase, gira }) {
  const {
    summary: rawSummary,
    transportRules, 
    loading: rosterLoading,
    refresh,
    roster // Importamos roster base para saber el total real
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

  const [newTransp, setNewTransp] = useState({
    id_transporte: "",
    detalle: "",
    costo: "",
  });
  const [activeTransportId, setActiveTransportId] = useState(null);
  const [editingEventId, setEditingEventId] = useState(null);
  const [newEvent, setNewEvent] = useState({
    fecha: "",
    hora: "",
    id_locacion: null,
    descripcion: "",
    id_tipo_evento: "11",
  });

  // Modales
  const [cnrtModal, setCnrtModal] = useState({ isOpen: false, transportId: null });
  const [roadmapModal, setRoadmapModal] = useState({ isOpen: false, transportId: null });
  const [boardingModal, setBoardingModal] = useState({ isOpen: false, transportId: null });
  const [itineraryModal, setItineraryModal] = useState({ isOpen: false, transportId: null });
  const [rulesModal, setRulesModal] = useState({ isOpen: false, event: null, type: null, transportId: null });
  const [passengersModal, setPassengersModal] = useState({ isOpen: false, transportId: null }); // <--- NUEVO ESTADO

  const locationOptions = useMemo(
    () =>
      locationsList.map((l) => ({
        id: l.id,
        label: l.nombre,
        subLabel: l.ciudad,
      })),
    [locationsList]
  );

  // --- DASHBOARD DE COBERTURA ---
  const coverageStats = useMemo(() => {
    if (!passengerList || passengerList.length === 0) return { none: [], single: [], multiple: [] };
    
    const stats = { none: [], single: [], multiple: [] };
    passengerList.forEach(p => {
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
          supabase.from("locaciones").select("id, nombre, direccion, localidades(localidad)").order("nombre"),
          supabase.from("regiones").select("id, region"),
          supabase.from("localidades").select("id, localidad").order("localidad"),
          supabase.from("integrantes").select("id, nombre, apellido, dni, genero, fecha_nac, nacionalidad, localidades(localidad)"),
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
      
      const { data: list } = await supabase.from("giras_transportes").select(`id, detalle, costo, id_transporte, transportes ( nombre )`).eq("id_gira", giraId).order("id");
      setTransports(list || []);

      if (list && list.length > 0) {
        const tIds = list.map((t) => t.id);
        const { data: evts } = await supabase.from("eventos").select(`id, fecha, hora_inicio, descripcion, id_tipo_evento, id_gira_transporte, id_locacion, locaciones(nombre, direccion, localidades(localidad))`).in("id_gira_transporte", tIds).order("fecha", { ascending: true }).order("hora_inicio", { ascending: true });
        
        const map = {};
        evts?.forEach((e) => {
          if (!map[e.id_gira_transporte]) map[e.id_gira_transporte] = [];
          map[e.id_gira_transporte].push(e);
        });
        setTransportEvents(map);
        refresh();
      }
    } catch(e) { console.error(e); } finally { setLoading(false); }
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
      await supabase.from("eventos").update({ [field]: value }).eq("id", eventId);
    } catch (e) { fetchData(); }
  };

  // --- NUEVA LÓGICA DE RESUMEN DE REGLAS ---
  const getEventRulesSummary = (eventId, type, transportId) => {
    if (!transportRules) return null;

    const relevantRules = transportRules.filter((r) => {
      if (r.id_gira_transporte !== transportId) return false;
      if (type === "up") return String(r.id_evento_subida) === String(eventId);
      if (type === "down") return String(r.id_evento_bajada) === String(eventId);
      return false;
    });

    if (relevantRules.length === 0) return null;

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
      if (scope === "Persona") return "Individuales";

      if (r.target_ids && Array.isArray(r.target_ids) && r.target_ids.length > 0) {
        if (scope === "Region") return mapIds(r.target_ids, regionsList, "id", "region");
        if (scope === "Localidad") return mapIds(r.target_ids, localitiesList, "id", "localidad");
        if (scope === "Instrumento") return r.target_ids.join(", ");
        return r.target_ids.join(", ");
      }

      if (scope === "Region" && r.id_region) {
        const reg = regionsList.find((x) => String(x.id) === String(r.id_region));
        return reg ? reg.region : "Región";
      }
      if (scope === "Localidad" && r.id_localidad) {
        const loc = localitiesList.find((x) => String(x.id) === String(r.id_localidad));
        return loc ? loc.localidad : "Loc";
      }
      if (scope === "Instrumento") return r.instrumento_familia;

      return scope;
    });

    return [...new Set(summaryParts)].filter(Boolean).join(" + ");
  };

  // --- LÓGICA DE INSERCIÓN DE ITINERARIO (MODIFICADA) ---
  const handleInsertItinerary = async (template, startDate, startTime) => {
    const tId = itineraryModal.transportId;
    if (!tId || !template || !startDate || !startTime) return;

    setLoading(true);
    try {
      let currentDateTime = new Date(`${startDate}T${startTime}`);
      const tramos = (template.plantillas_recorridos_tramos || []).sort((a, b) => a.orden - b.orden);
      const rulesToInsert = [];

      for (let i = 0; i < tramos.length; i++) {
        const tramo = tramos[i];
        const eventPayload = {
          id_gira: giraId,
          id_gira_transporte: tId,
          id_locacion: tramo.id_locacion_origen,
          fecha: format(currentDateTime, "yyyy-MM-dd"),
          hora_inicio: format(currentDateTime, "HH:mm:ss"),
          descripcion: tramo.nota || "Salida",
          id_tipo_evento: tramo.id_tipo_evento || 11,
          convocados: [],
        };

        const { data: evtData, error } = await supabase.from("eventos").insert([eventPayload]).select().single();
        if (error) throw error;
        const eventId = evtData.id;

        if (tramo.ids_localidades_suben && tramo.ids_localidades_suben.length > 0) {
          tramo.ids_localidades_suben.forEach((locId) => {
            rulesToInsert.push({ 
                id_gira_transporte: tId, 
                alcance: "Localidad", 
                id_localidad: locId, 
                id_evento_subida: eventId,
                solo_logistica: true // <--- AHORA ES SOLO REGLA LOGÍSTICA
            });
          });
        }
        if (tramo.ids_localidades_bajan && tramo.ids_localidades_bajan.length > 0) {
          tramo.ids_localidades_bajan.forEach((locId) => {
            rulesToInsert.push({ 
                id_gira_transporte: tId, 
                alcance: "Localidad", 
                id_localidad: locId, 
                id_evento_bajada: eventId,
                solo_logistica: true // <--- AHORA ES SOLO REGLA LOGÍSTICA
            });
          });
        }
        currentDateTime = addMinutes(currentDateTime, tramo.duracion_minutos || 60);
      }

      const lastTramo = tramos[tramos.length - 1];
      if (lastTramo) {
        await supabase.from("eventos").insert([{
          id_gira: giraId, id_gira_transporte: tId, id_locacion: lastTramo.id_locacion_destino,
          fecha: format(currentDateTime, "yyyy-MM-dd"), hora_inicio: format(currentDateTime, "HH:mm:ss"),
          descripcion: "Llegada", id_tipo_evento: 11,
        }]);
      }

      if (rulesToInsert.length > 0) {
        await supabase.from("giras_logistica_reglas_transportes").insert(rulesToInsert);
      }

      fetchData();
      refresh(); 
    } catch (e) {
      console.error(e);
      alert("Error al insertar itinerario: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTransport = async () => {
    if (!newTransp.id_transporte) return alert("Selecciona tipo");
    await supabase.from("giras_transportes").insert([{
      id_gira: giraId,
      id_transporte: parseInt(newTransp.id_transporte),
      detalle: newTransp.detalle,
      costo: parseFloat(newTransp.costo) || 0,
    }]);
    setNewTransp({ id_transporte: "", detalle: "", costo: "" });
    fetchData();
  };

  const handleDeleteTransport = async (id) => {
    if (!confirm("Se borrará el transporte y SUS EVENTOS. ¿Seguro?")) return;
    await supabase.from("giras_transportes").delete().eq("id", id);
    fetchData();
  };

  const handleSaveEvent = async (transportId) => {
    if (!newEvent.fecha || !newEvent.hora || !newEvent.id_locacion) return alert("Fecha, hora y lugar obligatorios");
    let desc = newEvent.descripcion;
    if (!desc) {
      const loc = locationsList.find((l) => l.id === newEvent.id_locacion);
      desc = loc ? `${loc.nombre} (${loc.ciudad})` : "Parada de transporte";
    }
    const payload = {
      id_gira: giraId, id_gira_transporte: transportId, fecha: newEvent.fecha, hora_inicio: newEvent.hora,
      id_locacion: newEvent.id_locacion, descripcion: desc, id_tipo_evento: parseInt(newEvent.id_tipo_evento), convocados: [],
    };

    if (editingEventId && editingEventId !== "new") {
      await supabase.from("eventos").update(payload).eq("id", editingEventId);
    } else {
      await supabase.from("eventos").insert([payload]);
    }
    setNewEvent({ fecha: "", hora: "", id_locacion: null, descripcion: "", id_tipo_evento: "11" });
    setEditingEventId(null);
    fetchData();
  };

  const startEditEvent = (evt) => {
    setEditingEventId(evt.id || "new");
    setNewEvent({
      fecha: evt.fecha || "", hora: evt.hora_inicio || "", id_locacion: evt.id_locacion || null,
      descripcion: evt.descripcion || "", id_tipo_evento: evt.id_tipo_evento ? evt.id_tipo_evento.toString() : "11",
    });
  };

  const cancelEdit = () => {
    setEditingEventId(null);
    setNewEvent({ fecha: "", hora: "", id_locacion: null, descripcion: "", id_tipo_evento: "11" });
  };

  const handleDeleteEvent = async (eventId) => {
    if (!confirm("¿Borrar parada?")) return;
    await supabase.from("eventos").delete().eq("id", eventId);
    if (editingEventId === eventId) cancelEdit();
    fetchData();
  };

  const handleSaveBoarding = async (personId, subidaId, bajadaId) => {
    if (!personId || !boardingModal.transportId) return;
    try {
      // Buscar regla existente que sea SOLO LOGÍSTICA para no pisar acceso
      const { data: existingRules } = await supabase.from("giras_logistica_reglas_transportes").select("id")
        .eq("id_gira_transporte", boardingModal.transportId)
        .eq("alcance", "Persona")
        .eq("id_integrante", personId)
        .eq("solo_logistica", true);

      const updates = { id_evento_subida: subidaId ? parseInt(subidaId) : null, id_evento_bajada: bajadaId ? parseInt(bajadaId) : null };

      if (existingRules && existingRules.length > 0) {
        await supabase.from("giras_logistica_reglas_transportes").update(updates).eq("id", existingRules[0].id);
      } else {
        await supabase.from("giras_logistica_reglas_transportes").insert([{
          id_gira_transporte: boardingModal.transportId, 
          alcance: "Persona", 
          id_integrante: personId, 
          solo_logistica: true, // <--- Nueva regla individual es logística
          ...updates,
        }]);
      }
      await refresh();
    } catch (err) { console.error(err); alert("Error al guardar."); }
  };

  const handleExportGlobal = () => {
    const travelingPax = passengerList.filter((p) => p.logistics?.transports?.length > 0);
    downloadStyledExcel(travelingPax, `Transporte_General_Gira${giraId}.xlsx`);
  };

  const handleExportCNRT = (startId, endId) => {
    const tId = cnrtModal.transportId;
    const tInfo = transports.find((t) => t.id === tId);
    if (!tInfo) return;
    const events = transportEvents[tId] || [];
    const sortedEvts = [...events].sort((a, b) => (a.fecha + a.hora_inicio).localeCompare(b.fecha + b.hora_inicio));
    const startIndex = sortedEvts.findIndex((e) => String(e.id) === String(startId));
    const endIndex = sortedEvts.findIndex((e) => String(e.id) === String(endId));

    if (startIndex === -1 || endIndex === -1 || startIndex >= endIndex) return alert("Rango inválido");

    const tPax = passengerList.filter((p) => {
      const transportData = p.logistics?.transports?.find((t) => t.id === tId);
      if (!transportData) return false;
      const pInIdx = sortedEvts.findIndex((e) => String(e.id) === String(transportData.subidaId));
      const pOutIdx = sortedEvts.findIndex((e) => String(e.id) === String(transportData.bajadaId));
      return pInIdx < endIndex && pOutIdx > startIndex;
    });

    downloadStyledExcel(tPax, `CNRT_${tInfo.detalle}.xlsx`);
    setCnrtModal({ isOpen: false, transportId: null });
  };

  const handleExportRoadmap = (startId, endId) => {
    const tId = roadmapModal.transportId;
    const tInfo = transports.find((t) => t.id === tId);
    const tPax = passengerList.filter((p) => p.logistics?.transports?.some((t) => t.id === tId));
    generateRoadmapExcel(tInfo?.detalle || "Transporte", transportEvents[tId] || [], tPax, startId, endId, paxLocalities);
    setRoadmapModal({ isOpen: false, transportId: null });
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow-sm border border-slate-200 max-w-6xl mx-auto">
      
      {/* 1. DASHBOARD DE COBERTURA */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-lg flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-full text-emerald-600"><IconCheckCircle size={20}/></div>
            <div>
                <div className="text-xl font-bold text-emerald-700">{coverageStats.single.length}</div>
                <div className="text-xs text-emerald-600 font-medium">Asignados (1 transporte)</div>
            </div>
        </div>
        <div className="bg-amber-50 border border-amber-100 p-3 rounded-lg flex items-center gap-3 relative group cursor-help">
            <div className="p-2 bg-amber-100 rounded-full text-amber-600"><IconTruck size={20}/></div>
            <div>
                <div className="text-xl font-bold text-amber-700">{coverageStats.multiple.length}</div>
                <div className="text-xs text-amber-600 font-medium">Multi-transporte</div>
            </div>
            {/* Tooltip Multi */}
            {coverageStats.multiple.length > 0 && (
                <div className="absolute top-full left-0 mt-2 w-64 bg-white border border-slate-200 shadow-xl rounded-lg p-2 z-50 hidden group-hover:block max-h-48 overflow-y-auto">
                    <div className="text-[10px] font-bold text-slate-400 mb-1 uppercase">En múltiples buses</div>
                    {coverageStats.multiple.map(p => (
                        <div key={p.id} className="text-xs text-slate-600 py-0.5 border-b border-slate-50 last:border-0 flex justify-between">
                            <span>{p.apellido}, {p.nombre}</span>
                            <span className="font-bold text-amber-600">x{p.logistics.transports.length}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
        <div className="bg-rose-50 border border-rose-100 p-3 rounded-lg flex items-center gap-3 relative group cursor-help">
            <div className="p-2 bg-rose-100 rounded-full text-rose-600"><IconAlertTriangle size={20}/></div>
            <div>
                <div className="text-xl font-bold text-rose-700">{coverageStats.none.length}</div>
                <div className="text-xs text-rose-600 font-medium">Sin transporte</div>
            </div>
            {/* Tooltip con nombres de olvidados */}
            {coverageStats.none.length > 0 && (
                <div className="absolute top-full right-0 mt-2 w-64 bg-white border border-slate-200 shadow-xl rounded-lg p-2 z-50 hidden group-hover:block max-h-48 overflow-y-auto">
                    <div className="text-[10px] font-bold text-slate-400 mb-1 uppercase">Lista de espera</div>
                    {coverageStats.none.map(p => (
                        <div key={p.id} className="text-xs text-slate-600 py-0.5 border-b border-slate-50 last:border-0">
                            {p.apellido}, {p.nombre}
                        </div>
                    ))}
                </div>
            )}
        </div>
      </div>

      <div className="flex justify-between items-center mb-4 border-b pb-2">
        <h3 className="font-bold text-slate-700 flex items-center gap-2">
          <IconTruck className="text-indigo-600" /> Gestión de Transportes
        </h3>
        <div className="flex gap-2 items-center">
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
            onChange={(e) => setNewTransp({ ...newTransp, id_transporte: e.target.value })}
          >
            <option value="">Seleccionar...</option>
            {catalog.map((c) => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label className="text-[10px] font-bold text-slate-500">DETALLE</label>
          <input
            type="text" className="w-full text-xs border p-2 rounded" placeholder="Ej: Interno 404"
            value={newTransp.detalle} onChange={(e) => setNewTransp({ ...newTransp, detalle: e.target.value })}
          />
        </div>
        <button onClick={handleAddTransport} className="bg-indigo-600 text-white p-2 rounded hover:bg-indigo-700">
          <IconPlus size={18} />
        </button>
      </div>

      <div className="space-y-4">
        {transports.map((t) => {
            const isExpanded = activeTransportId === t.id;
            const myEvents = transportEvents[t.id] || [];
            const tPassengerCount = passengerList.filter(p => p.logistics?.transports?.some(tr => tr.id === t.id)).length;

          return (
            <div key={t.id} className={`border rounded-lg transition-all ${isExpanded ? "border-indigo-300 shadow-md bg-white" : "border-slate-200 bg-white"}`}>
              <div className="p-3 flex justify-between items-center cursor-pointer hover:bg-slate-50" onClick={() => setActiveTransportId(isExpanded ? null : t.id)}>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-slate-100 text-slate-500"><IconTruck size={20} /></div>
                  <div>
                    <div className="font-bold text-slate-800">{t.detalle || "Sin detalle"}</div>
                    <div className="text-xs text-slate-500 uppercase flex items-center gap-2">
                        <span>{t.transportes?.nombre}</span>
                        <span className="text-slate-300">|</span>
                        <span className="font-bold text-indigo-600">{tPassengerCount} Pasajeros</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-2">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setPassengersModal({ isOpen: true, transportId: t.id });
                        }}
                        className="flex items-center gap-2 px-3 py-1 bg-indigo-600 text-white rounded text-xs font-bold hover:bg-indigo-700 shadow-sm"
                    >
                        <IconUsers size={14} /> Gestionar Pasajeros
                    </button>

                    <button
                        onClick={(e) => { e.stopPropagation(); setItineraryModal({ isOpen: true, transportId: t.id }); }}
                        className="text-xs bg-indigo-50 text-indigo-600 px-2 py-1 rounded font-bold border border-indigo-100 hover:bg-indigo-100"
                    >
                        + Itinerario
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setBoardingModal({ isOpen: true, transportId: t.id }); }}
                      className="px-2 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded text-[10px] font-bold hover:bg-amber-100 flex items-center gap-1"
                    >
                      <IconUsers size={14} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setRoadmapModal({ isOpen: true, transportId: t.id }); }}
                      className="px-2 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded text-[10px] font-bold hover:bg-blue-100 flex items-center gap-1"
                    >
                      <IconFileText size={14} /> Hoja Ruta
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setCnrtModal({ isOpen: true, transportId: t.id }); }}
                      className="px-2 py-1 bg-slate-50 text-slate-600 border border-slate-200 rounded text-[10px] font-bold hover:bg-slate-100 flex items-center gap-1"
                    >
                      CNRT
                    </button>
                    {isExpanded && (
                      <button onClick={(e) => { e.stopPropagation(); handleDeleteTransport(t.id); }} className="text-red-400 hover:text-red-600 p-2">
                        <IconTrash size={16} />
                      </button>
                    )}
                    <div className={`transform transition-transform ${isExpanded ? "rotate-180" : ""} text-slate-400`}>▼</div>
                </div>
              </div>

              {isExpanded && (
                  <div className="p-0 overflow-x-auto">
                    <table className="w-full text-xs text-left border-t border-slate-200">
                    <thead className="bg-slate-50 text-slate-500 font-semibold border-b">
                      <tr>
                        <th className="p-2 w-24">Fecha</th>
                        <th className="p-2 w-20">Hora</th>
                        <th className="p-2 min-w-[200px]">Locación (Destino)</th>
                        <th className="p-2 min-w-[150px]">Nota</th>
                        <th className="p-2 w-24">Visibilidad</th>
                        <th className="p-2 w-24 text-center bg-emerald-50 text-emerald-700 border-l border-emerald-100">Suben</th>
                        <th className="p-2 w-24 text-center bg-rose-50 text-rose-700 border-l border-rose-100">Bajan</th>
                        <th className="p-2 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {myEvents.map((evt) => {
                        const upsCount = (passengerList || []).filter((p) => p.logistics?.transports?.some((tr) => String(tr.subidaId) === String(evt.id))).length;
                        const downsCount = (passengerList || []).filter((p) => p.logistics?.transports?.some((tr) => String(tr.bajadaId) === String(evt.id))).length;
                        const upsSummary = getEventRulesSummary(evt.id, 'up', t.id);
                        const downsSummary = getEventRulesSummary(evt.id, 'down', t.id);

                        return (
                          <tr key={evt.id} className="hover:bg-slate-50 group">
                            <td className="p-1">
                              <DateInput value={evt.fecha} onChange={(v) => handleUpdateEvent(evt.id, "fecha", v)} className="h-8 border-transparent hover:border-slate-300 bg-transparent" />
                            </td>
                            <td className="p-1">
                              <TimeInput value={evt.hora_inicio} onChange={(v) => handleUpdateEvent(evt.id, "hora_inicio", v)} className="h-8 border-transparent hover:border-slate-300 bg-transparent" />
                            </td>
                            <td className="p-1 relative">
                              <SearchableSelect options={locationOptions} value={evt.id_locacion} onChange={(v) => handleUpdateEvent(evt.id, "id_locacion", v)} className="h-8" placeholder="Sin locación..." />
                            </td>
                            <td className="p-1">
                              <input type="text" className="w-full h-8 px-2 border border-transparent hover:border-slate-300 rounded bg-transparent" value={evt.descripcion || ""} onChange={(e) => handleUpdateEvent(evt.id, "descripcion", e.target.value)} placeholder="-" />
                            </td>
                            <td className="p-1">
                              <select className="w-full h-8 border-transparent hover:border-slate-300 rounded bg-transparent text-xs outline-none" value={evt.id_tipo_evento} onChange={(e) => handleUpdateEvent(evt.id, "id_tipo_evento", e.target.value)}>
                                <option value="11">Público</option>
                                <option value="12">Interno</option>
                              </select>
                            </td>
                            <td className="p-1 text-center border-l border-emerald-50">
                              <button onClick={() => setRulesModal({ isOpen: true, event: evt, type: "up", transportId: t.id })} className={`w-full py-1 h-auto rounded text-[10px] font-bold flex flex-col items-center justify-center gap-0.5 min-h-[28px] ${upsCount > 0 ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"}`}>
                                <div className="flex items-center gap-1">
                                    <IconUpload size={10} /> <span>{upsCount > 0 ? `${upsCount} Pax` : "+"}</span>
                                </div>
                                {upsSummary && (<span className="text-[9px] font-normal opacity-80 max-w-[90%] truncate leading-none pb-0.5">{upsSummary}</span>)}
                              </button>
                            </td>
                            <td className="p-1 text-center border-l border-rose-50">
                              <button onClick={() => setRulesModal({ isOpen: true, event: evt, type: "down", transportId: t.id })} className={`w-full py-1 h-auto rounded text-[10px] font-bold flex flex-col items-center justify-center gap-0.5 min-h-[28px] ${downsCount > 0 ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-400"}`}>
                                <div className="flex items-center gap-1">
                                    <IconDownload size={10} /> <span>{downsCount > 0 ? `${downsCount} Pax` : "+"}</span>
                                </div>
                                {downsSummary && (<span className="text-[9px] font-normal opacity-80 max-w-[90%] truncate leading-none pb-0.5">{downsSummary}</span>)}
                              </button>
                            </td>
                            <td className="p-1 text-center">
                              <button onClick={() => handleDeleteEvent(evt.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100"><IconTrash size={14} /></button>
                            </td>
                          </tr>
                        );
                      })}
                      {editingEventId ? (
                        <tr className="bg-amber-50">
                          <td className="p-1"><DateInput value={newEvent.fecha} onChange={(v) => setNewEvent({ ...newEvent, fecha: v })} className="h-8 border-amber-300 bg-white" /></td>
                          <td className="p-1"><TimeInput value={newEvent.hora} onChange={(v) => setNewEvent({ ...newEvent, hora: v })} className="h-8 border-amber-300 bg-white" /></td>
                          <td className="p-1"><SearchableSelect options={locationOptions} value={newEvent.id_locacion} onChange={(v) => setNewEvent({ ...newEvent, id_locacion: v })} className="h-8 border-amber-300 bg-white" placeholder="Nuevo lugar..." /></td>
                          <td className="p-1"><input type="text" className="w-full h-8 px-2 border border-amber-300 rounded bg-white" value={newEvent.descripcion} onChange={(e) => setNewEvent({ ...newEvent, descripcion: e.target.value })} /></td>
                          <td colSpan="4" className="p-1 text-right">
                            <div className="flex gap-1 justify-end">
                              <button onClick={cancelEdit} className="text-[10px] px-2 py-1 bg-slate-200 rounded">Cancelar</button>
                              <button onClick={() => handleSaveEvent(t.id)} className="text-[10px] px-3 py-1 bg-amber-500 text-white rounded font-bold">Guardar</button>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        <tr>
                          <td colSpan="9" className="p-2 text-center border-t border-slate-100">
                            <button onClick={() => startEditEvent({ id: null, fecha: "", hora_inicio: "", id_tipo_evento: 11, descripcion: "", id_locacion: null })} className="text-xs text-indigo-500 font-bold hover:text-indigo-700 flex items-center justify-center gap-1 w-full">
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

      {passengersModal.isOpen && (
        <TransportPassengersModal
            isOpen={passengersModal.isOpen}
            onClose={() => setPassengersModal({ isOpen: false, transportId: null })}
            transport={transports.find(t => t.id === passengersModal.transportId)}
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
          onClose={() => setItineraryModal({ isOpen: false, transportId: null })}
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
        />
      )}
      {rulesModal.isOpen && (
        <StopRulesManager
          isOpen={rulesModal.isOpen}
          onClose={() => setRulesModal({ isOpen: false, event: null, type: null, transportId: null })}
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