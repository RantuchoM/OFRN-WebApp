// src/views/Giras/GirasView.jsx
import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  IconPlus,
  IconMap,
  IconEdit,
  IconTrash,
  IconUsers,
  IconLoader,
  IconMapPin,
  IconCalendar,
  IconMusic,
  IconFilter,
  IconDrive,
  IconHotel,
  IconMoreVertical,
  IconList,
  IconMessageCircle,
  IconLayers,
  IconTruck,
  IconColumns,
  IconUtensils,   // <--- NUEVO
  IconArrowLeft,  // <--- NUEVO
} from "../../components/ui/Icons";
import { useAuth } from "../../context/AuthContext";
import GiraForm from "./GiraForm";
import GiraRoster from "./GiraRoster";
import GiraAgenda from "./GiraAgenda";
import ProgramRepertoire from "./ProgramRepertoire";
import ProgramHoteleria from "./RoomingManager";
import LogisticsDashboard from "./LogisticsDashboard";
import GirasTransportesManager from "./GirasTransportesManager"; // <--- IMPORTAR ESTO
import AgendaGeneral from "./AgendaGeneral";
import MusicianCalendar from "./MusicianCalendar";
import WeeklyCalendar from "./WeeklyCalendar";
import MealsAttendancePersonal from "./MealsAttendancePersonal"; // <--- IMPORTACIÓN NUEVA

import CommentsManager from "../../components/comments/CommentsManager";
import CommentButton from "../../components/comments/CommentButton";
import GlobalCommentsViewer from "../../components/comments/GlobalCommentsViewer";

import RepertoireManager from "../../components/repertoire/RepertoireManager";
import DateInput from "../../components/ui/DateInput";

const ActionMenu = ({ onAction, isOpen, setIsOpen, hasDrive, canEdit }) => {
  const menuRef = useRef(null);
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, setIsOpen]);

  const handleItemClick = (e, action) => {
    e.preventDefault();
    e.stopPropagation();
    onAction(e, action);
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className={`p-2 rounded-full transition-colors ${
          isOpen
            ? "bg-indigo-100 text-indigo-700"
            : "text-slate-400 hover:text-indigo-600 hover:bg-slate-50"
        }`}
      >
        <IconMoreVertical size={20} />
      </button>
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100 origin-top-right">
          <div className="p-1 space-y-0.5">
            {/* NUEVA OPCIÓN PARA TODOS (Util si un admin quiere ver su propia asistencia o para personal) */}
            <button
              type="button"
              onMouseDown={(e) => handleItemClick(e, "meals_personal")}
              className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 rounded-lg flex items-center gap-2"
            >
              <IconUtensils size={16} /> Mis Comidas
            </button>
            <div className="h-px bg-slate-100 my-1"></div>

            {hasDrive && (
              <button
                type="button"
                onMouseDown={(e) => handleItemClick(e, "drive")}
                className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg flex items-center gap-2"
              >
                <IconDrive size={16} /> Abrir Drive
              </button>
            )}
            <button
              type="button"
              onMouseDown={(e) => handleItemClick(e, "agenda")}
              className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg flex items-center gap-2"
            >
              <IconCalendar size={16} /> Agenda
            </button>
            <button
              type="button"
              onMouseDown={(e) => handleItemClick(e, "repertoire")}
              className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg flex items-center gap-2"
            >
              <IconMusic size={16} /> Repertorio
            </button>

            {canEdit && (
              <>
                <div className="h-px bg-slate-100 my-1"></div>
                <button
                  type="button"
                  onMouseDown={(e) => handleItemClick(e, "comments")}
                  className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg flex items-center gap-2"
                >
                  <IconMessageCircle size={16} /> Comentarios
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => handleItemClick(e, "global_comments")}
                  className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg flex items-center gap-2"
                >
                  <IconLayers size={16} /> Gestor Pendientes
                </button>

                <div className="h-px bg-slate-100 my-1"></div>
                <button
                  type="button"
                  onMouseDown={(e) => handleItemClick(e, "hotel")}
                  className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg flex items-center gap-2"
                >
                  <IconHotel size={16} /> Hotelería
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => handleItemClick(e, "logistics")}
                  className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg flex items-center gap-2"
                >
                  <IconTruck size={16} /> Logística
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => handleItemClick(e, "roster")}
                  className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg flex items-center gap-2"
                >
                  <IconUsers size={16} /> Personal
                </button>

                <div className="h-px bg-slate-100 my-1"></div>
                <button
                  type="button"
                  onMouseDown={(e) => handleItemClick(e, "edit")}
                  className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 rounded-lg flex items-center gap-2"
                >
                  <IconEdit size={16} /> Editar Datos
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => handleItemClick(e, "delete")}
                  className="w-full text-left px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-2"
                >
                  <IconTrash size={16} /> Eliminar
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default function GirasView({ supabase }) {
  const { user, isEditor } = useAuth();
  const [view, setView] = useState({ mode: "LIST", data: null });
  const [giras, setGiras] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [commentsState, setCommentsState] = useState(null);
  const [globalCommentsGiraId, setGlobalCommentsGiraId] = useState(null);

  const [showRepertoireInCards, setShowRepertoireInCards] = useState(false);

  const [openMenuId, setOpenMenuId] = useState(null);
  const [showFiltersMobile, setShowFiltersMobile] = useState(false);

  const [filterType, setFilterType] = useState(
    new Set(["Sinfónico", "Camerata Filarmónica", "Ensamble"])
  );
  const PROGRAM_TYPES = ["Sinfónico", "Camerata Filarmónica", "Ensamble"];

  const today = new Date().toISOString().split("T")[0];
  const [filterDateStart, setFilterDateStart] = useState(today);
  const [filterDateEnd, setFilterDateEnd] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({
    nombre_gira: "",
    fecha_desde: "",
    fecha_hasta: "",
    tipo: "Sinfónico",
    zona: "",
  });
  
  const [selectedLocations, setSelectedLocations] = useState(new Set());
  const [selectedSources, setSelectedSources] = useState([]); 
  const [selectedStaff, setSelectedStaff] = useState([]); 

  const [locationsList, setLocationsList] = useState([]);
  const [ensemblesList, setEnsemblesList] = useState([]);
  const [allIntegrantes, setAllIntegrantes] = useState([]); 

  // Helper para saber si es usuario personal
  const isPersonal = user?.rol_sistema === "consulta_personal" || user?.rol_sistema === "personal";

  useEffect(() => {
    fetchGiras();
    fetchLocationsList();
    fetchEnsemblesList();
    fetchIntegrantesList();
  }, [user.id]);

  const fetchGiras = async () => {
    setLoading(true);
    try {
      const userRole = user?.rol_sistema || "";
      const isPersonalRole =
        userRole === "consulta_personal" || userRole === "personal";
      let myEnsembles = new Set();
      let myFamily = null;
      if (isPersonalRole) {
        const { data: me } = await supabase
          .from("integrantes")
          .select(
            "*, instrumentos(familia), integrantes_ensambles(id_ensamble)"
          )
          .eq("id", user.id)
          .single();
        if (me) {
          myFamily = me.instrumentos?.familia;
          me.integrantes_ensambles?.forEach((ie) =>
            myEnsembles.add(ie.id_ensamble)
          );
        }
      }
      const { data, error } = await supabase
        .from("programas")
        .select(
          `*, 
           giras_localidades(id_localidad, localidades(localidad)), 
           giras_fuentes(*), 
           eventos (id, fecha, hora_inicio, locaciones(nombre), tipos_evento(nombre)), 
           giras_integrantes (id_integrante, estado, rol, integrantes (nombre, apellido)), 
           programas_repertorios (id, nombre, orden, repertorio_obras (id, orden, obras (id, titulo, duracion_segundos, estado, compositores (apellido, nombre), obras_compositores (rol, compositores(apellido, nombre)))))`
        )
        .order("fecha_desde", { ascending: true });
      if (error) throw error;
      let result = data || [];
      if (isPersonalRole) {
        result = result.filter((gira) => {
          const overrides = gira.giras_integrantes || [];
          const sources = gira.giras_fuentes || [];
          const myOverride = overrides.find((o) => o.id_integrante === user.id);

          if (myOverride && myOverride.estado === "ausente") return false; 
          if (myOverride) return true; 

          const isIncluded = sources.some(
            (s) =>
              (s.tipo === "ENSAMBLE" && myEnsembles.has(s.valor_id)) ||
              (s.tipo === "FAMILIA" && s.valor_texto === myFamily)
          );

          if (isIncluded) {
            const excludedEnsembles = sources
              .filter((s) => s.tipo === "EXCL_ENSAMBLE")
              .map((s) => s.valor_id);

            const isExcludedByEnsemble = excludedEnsembles.some((exclId) =>
              myEnsembles.has(exclId)
            );

            if (isExcludedByEnsemble) {
              return false; 
            }
            return true; 
          }
          return false;
        });
      }
      setGiras(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchLocationsList = async () => {
    const { data } = await supabase.from("localidades").select("id, localidad").order("localidad");
    if (data) setLocationsList(data);
  };

  const fetchEnsemblesList = async () => {
    const { data } = await supabase.from("ensambles").select("id, ensamble");
    if (data) setEnsemblesList(data.map((e) => ({ value: e.id, label: e.ensamble })));
  };

  const fetchIntegrantesList = async () => {
    const { data } = await supabase.from("integrantes").select("id, nombre, apellido").order("apellido");
    if (data) {
        setAllIntegrantes(data.map(i => ({ value: i.id, label: `${i.apellido}, ${i.nombre}` })));
    }
  };

  const handleSave = async () => {
    if (!formData.nombre_gira) return alert("Nombre obligatorio");
    setLoading(true);
    try {
      let targetId = editingId;
      if (editingId) {
        await supabase.from("programas").update(formData).eq("id", editingId);
      } else {
        const { data } = await supabase.from("programas").insert([formData]).select();
        if (data && data.length > 0) targetId = data[0].id;
      }
      
      if (targetId) {
        await supabase.from("giras_localidades").delete().eq("id_gira", targetId);
        const locPayload = Array.from(selectedLocations).map((lid) => ({ id_gira: targetId, id_localidad: lid }));
        if (locPayload.length > 0) await supabase.from("giras_localidades").insert(locPayload);

        await supabase.from("giras_fuentes").delete().eq("id_gira", targetId);
        const srcPayload = selectedSources.map(s => ({
            id_gira: targetId,
            tipo: s.tipo,
            valor_id: s.valor_id || null,
            valor_texto: s.valor_texto || null
        }));
        if(srcPayload.length > 0) await supabase.from("giras_fuentes").insert(srcPayload);

        await supabase.from("giras_integrantes").delete().eq("id_gira", targetId).in("rol", ['director', 'solista']);
        const staffPayload = selectedStaff.map(s => ({
            id_gira: targetId,
            id_integrante: s.id_integrante,
            rol: s.rol,
            estado: 'confirmado'
        }));
        if(staffPayload.length > 0) await supabase.from("giras_integrantes").insert(staffPayload);

        await supabase.functions.invoke("manage-drive", {
          body: { action: "sync_program", programId: targetId },
        });
      }
      await fetchGiras();
      closeForm();
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (e, id) => {
    if (e) e.stopPropagation();
    if (!confirm("¿Eliminar?")) return;
    setLoading(true);
    await supabase.functions.invoke("manage-drive", {
      body: { action: "delete_program", programId: id },
    });
    await supabase.from("programas").delete().eq("id", id);
    await fetchGiras();
    setLoading(false);
  };

  const startEdit = async (gira) => {
    setEditingId(gira.id);
    setFormData({
      nombre_gira: gira.nombre_gira,
      fecha_desde: gira.fecha_desde || "",
      fecha_hasta: gira.fecha_hasta || "",
      tipo: gira.tipo || "Sinfónico",
      zona: gira.zona || "",
    });
    
    const { data } = await supabase.from("giras_localidades").select("id_localidad").eq("id_gira", gira.id);
    setSelectedLocations(data ? new Set(data.map((d) => d.id_localidad)) : new Set());

    const fuentes = (gira.giras_fuentes || []).map(f => {
        let label = f.valor_texto;
        if(f.tipo.includes('ENSAMBLE')) {
             const found = ensemblesList.find(e => e.value === f.valor_id);
             label = found ? found.label : `Ensamble ${f.valor_id}`;
        }
        return {
            tipo: f.tipo,
            valor_id: f.valor_id,
            valor_texto: f.valor_texto,
            label: label
        };
    });
    setSelectedSources(fuentes);

    const staff = (gira.giras_integrantes || [])
        .filter(i => ['director', 'solista'].includes(i.rol))
        .map(i => ({
            id_integrante: i.id_integrante,
            rol: i.rol,
            label: i.integrantes ? `${i.integrantes.apellido}, ${i.integrantes.nombre}` : 'Desconocido'
        }));
    setSelectedStaff(staff);
    setIsAdding(false);
  };

  const closeForm = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData({ nombre_gira: "", fecha_desde: "", fecha_hasta: "", tipo: "Sinfónico", zona: "" });
    setSelectedLocations(new Set());
    setSelectedSources([]);
    setSelectedStaff([]);
  };

  const handleMenuAction = (e, action, gira) => {
    e.stopPropagation();
    setOpenMenuId(null);
    switch (action) {
      case "meals_personal":
        setView({ mode: "MEALS_PERSONAL", data: gira });
        break;
      case "comments":
        setCommentsState({ type: "GIRA", id: gira.id, title: gira.nombre_gira });
        break;
      case "global_comments":
        setGlobalCommentsGiraId(gira.id);
        break;
      case "repertoire":
        setView({ mode: "REPERTOIRE", data: gira });
        break;
      case "agenda":
        setView({ mode: "AGENDA", data: gira });
        break;
      case "hotel":
        setView({ mode: "HOTEL", data: gira });
        break;
      case "roster":
        setView({ mode: "ROSTER", data: gira });
        break;
      case "logistics":
        setView({ mode: "LOGISTICS", data: gira });
        break;
      case "drive":
        if (gira.google_drive_folder_id)
          window.open(`https://drive.google.com/drive/folders/${gira.google_drive_folder_id}`, "_blank");
        else alert("Sin carpeta");
        break;
      case "edit":
        startEdit(gira);
        break;
      case "delete":
        handleDelete(null, gira.id);
        break;
    }
  };

  const handleCommentNavigation = (type, entityId) => {
    const currentGira = giras.find((g) => g.id === globalCommentsGiraId);
    if (!currentGira) return;
    setGlobalCommentsGiraId(null);
    if (type === "EVENTO") setView({ mode: "AGENDA", data: currentGira });
    else if (type === "OBRA") setView({ mode: "REPERTOIRE", data: currentGira });
    else if (type === "HABITACION") setView({ mode: "HOTEL", data: currentGira });
  };

  const filteredGiras = useMemo(() => {
    return giras.filter((g) => {
      if (filterType.size > 0 && !filterType.has(g.tipo)) return false;
      if (filterDateStart && g.fecha_hasta < filterDateStart) return false;
      if (filterDateEnd && g.fecha_desde > filterDateEnd) return false;
      return true;
    });
  }, [giras, filterType, filterDateStart, filterDateEnd]);

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    const [y, m, d] = dateString.split("-");
    return `${d}/${m}`;
  };

  // ... (Funciones de UI auxiliares: getPersonnelDisplay, getConcertList, etc. Se mantienen igual)
  const getPersonnelDisplay = (gira) => {
      const roster = gira.giras_integrantes || [];
      const directors = roster.filter((r) => r.rol === "director" && r.estado === "confirmado");
      const soloists = roster.filter((r) => r.rol === "solista" && r.estado === "confirmado");
      const formatName = (p) => `${p.integrantes?.apellido || ""}, ${p.integrantes?.nombre || ""}`;
      const cleanNames = (arr) => arr.map(formatName).filter((n) => n.trim() !== ",");
      const directorNames = cleanNames(directors);
      const soloistNames = cleanNames(soloists);
      let output = [];
      if (directorNames.length > 0) output.push(<span key="dir" className="font-semibold text-indigo-700">Dir: {directorNames.join(" | ")}</span>);
      if (soloistNames.length > 0) output.push(<span key="sol" className="font-semibold text-fuchsia-700">Solista/s: {soloistNames.join(" | ")}</span>);
      return output.length > 0 ? output : null;
  };

  const getConcertList = (gira) => {
      const concerts = (gira.eventos || []).filter((e) => e.tipos_evento?.nombre?.toLowerCase().includes("concierto") || e.tipos_evento?.nombre?.toLowerCase().includes("función")).sort((a, b) => (a.fecha + a.hora_inicio).localeCompare(b.fecha + b.hora_inicio));
      if (concerts.length === 0) return null;
      return (<div className="text-xs space-y-1"><ul className="pl-1 space-y-0.5">{concerts.slice(0, 3).map((c, idx) => (<li key={idx} className="text-slate-500 truncate max-w-full flex items-center gap-1"><span className="font-mono text-[10px] mr-1 bg-slate-100 px-1 rounded">{formatDate(c.fecha)} - {c.hora_inicio.slice(0, 5)}</span>{c.locaciones?.nombre}</li>))}{concerts.length > 3 && (<li className="text-slate-400 italic text-[10px] pt-1">y {concerts.length - 3} evento(s) más.</li>)}</ul></div>);
  };

  const getSourcesDisplay = (gira) => {
      const sources = gira.giras_fuentes || [];
      const ensembleMap = new Map(ensemblesList.map((e) => [e.value, e.label]));
      const inclusions = [];
      const exclusions = [];
      sources.forEach((s) => {
          let label = "";
          if (s.tipo === "ENSAMBLE") { label = ensembleMap.get(s.valor_id) || `Ensamble ID:${s.valor_id}`; inclusions.push(<span key={s.id} className="text-emerald-700 font-medium">{label}</span>); }
          else if (s.tipo === "FAMILIA") { label = s.valor_texto; inclusions.push(<span key={s.id} className="text-indigo-700 font-medium">{label}</span>); }
          else if (s.tipo === "EXCL_ENSAMBLE") { label = ensembleMap.get(s.valor_id) || `Ensamble ID:${s.valor_id}`; exclusions.push(<span key={s.id} className="text-red-700 font-medium">{label}</span>); }
      });
      if (inclusions.length === 0 && exclusions.length === 0) return null;
      return (<div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs ml-2 pl-2 border-l border-slate-200 shrink-0">{inclusions.length > 0 && <>{inclusions.map((item, index) => (<React.Fragment key={index}>{item}{index < inclusions.length - 1 && <span className="text-slate-300">|</span>}</React.Fragment>))}</>}{exclusions.length > 0 && <>{inclusions.length > 0 && <span className="text-slate-300">|</span>}<span className="font-bold text-red-600 shrink-0"></span>{exclusions.map((item, index) => (<React.Fragment key={index}>{item}{index < exclusions.length - 1 && <span className="text-slate-300">|</span>}</React.Fragment>))}</>}</div>);
  };

  const toggleFilterType = (type) => {
    setFilterType((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(type)) newSet.delete(type); else newSet.add(type);
      return newSet;
    });
  };

  const renderTypeFilterChips = (isMobile = false) => (
    <div className={`flex flex-wrap gap-2 ${isMobile ? "pt-2" : ""}`}>
      {PROGRAM_TYPES.map((type) => (
        <button key={type} onClick={() => toggleFilterType(type)} className={`px-3 py-1 rounded-full text-xs font-bold transition-all border ${filterType.has(type) ? "bg-indigo-600 text-white border-indigo-700" : "bg-white text-slate-500 border-slate-300 hover:bg-slate-50"}`}>{type}</button>
      ))}
    </div>
  );

  const renderDateInputs = (isMobile = false) => (
    <div className="flex items-center gap-2">
      <div className={`${isMobile ? "w-full" : "w-32"}`}><DateInput label={null} value={filterDateStart} onChange={setFilterDateStart} placeholder="Desde" className="w-full" /></div>
      <span className="text-slate-400 text-xs">-</span>
      <div className={`${isMobile ? "w-full" : "w-32"}`}><DateInput label={null} value={filterDateEnd} onChange={setFilterDateEnd} placeholder="Hasta" className="w-full" /></div>
    </div>
  );

  const allCalendarEvents = useMemo(() => {
    return giras.flatMap((gira) => {
      if (!gira.eventos) return [];
      return gira.eventos.map((evento) => {
        const startStr = `${evento.fecha}T${evento.hora_inicio}`;
        const startDate = new Date(startStr);
        const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000);
        const typeName = (evento.tipos_evento?.nombre || "Evento").toUpperCase();
        return {
          id: evento.id, title: gira.nombre_gira, subtitle: evento.locaciones?.nombre || "", start: startStr, end: endDate.toISOString(), programLabel: typeName, programType: gira.tipo, programName: gira.nombre_gira, location: evento.locaciones?.nombre || "Sin lugar", giraId: gira.id, eventType: evento.tipos_evento?.nombre || "",
        };
      });
    });
  }, [giras]);

  const handleUpdateCalendarEvent = async (eventData) => {
    setLoading(true);
    try {
      const { error } = await supabase.from("eventos").update({ fecha: eventData.start.split("T")[0], hora_inicio: eventData.start.split("T")[1] }).eq("id", eventData.id);
      if (error) throw error;
      await fetchGiras();
    } catch (err) { alert("Error al actualizar: " + err.message); } finally { setLoading(false); }
  };

  // ... dentro de GirasView, antes del return

const tourNavItems = [
  { mode: "LOGISTICS", label: "Logística", icon: IconTruck },
  { mode: "AGENDA", label: "Agenda", icon: IconCalendar },
  { mode: "REPERTOIRE", label: "Repertorio", icon: IconMusic },
  { mode: "ROSTER", label: "Personal", icon: IconUsers },
  { mode: "HOTEL", label: "Rooming", icon: IconHotel },
  // Puedes agregar o quitar según necesites
];

// Helper para saber si estamos dentro de una gira específica
const isDetailView = ["AGENDA", "REPERTOIRE", "ROSTER", "HOTEL", "LOGISTICS", "MEALS_PERSONAL"].includes(view.mode) && view.data;

  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
      <div className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm shrink-0">
        
        {/* CASO 1: VISTA DE DETALLE DE GIRA (NAVEGACIÓN INTERNA) */}
        {isDetailView ? (
          <div className="px-4 py-2 flex flex-col sm:flex-row items-center justify-between gap-3">
            
            {/* Lado Izquierdo: Volver + Título de la Gira */}
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button 
                onClick={() => setView({ mode: "LIST", data: null })}
                className="p-2 rounded-full hover:bg-slate-100 text-slate-500 transition-colors"
                title="Volver al listado"
              >
                <IconArrowLeft size={20} />
              </button>
              
              <div className="flex flex-col overflow-hidden">
                <h2 className="text-lg font-bold text-slate-800 truncate leading-tight">
                  {view.data.nombre_gira}
                </h2>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                   <span className="font-medium bg-indigo-50 text-indigo-700 px-1.5 rounded">{view.data.tipo}</span>
                   <span className="truncate">{view.data.zona}</span>
                </div>
              </div>
            </div>

            {/* Lado Derecho: MENÚ DE NAVEGACIÓN (La parte nueva) */}
            <div className="flex items-center bg-slate-100 p-1 rounded-lg overflow-x-auto max-w-full no-scrollbar">
              {tourNavItems.map((item) => {
                const isActive = view.mode === item.mode;
                return (
                  <button
                    key={item.mode}
                    onClick={() => setView({ ...view, mode: item.mode })}
                    className={`
                      flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all whitespace-nowrap
                      ${isActive 
                        ? "bg-white text-indigo-600 shadow-sm" 
                        : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                      }
                    `}
                  >
                    <item.icon size={16} strokeWidth={isActive ? 2.5 : 2} />
                    {/* Ocultamos el texto en móviles muy pequeños si es necesario, o lo dejamos siempre visible */}
                    <span className="hidden md:inline">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          /* CASO 2: VISTA PRINCIPAL (LISTA, CALENDARIO, ETC.) - ESTO ES LO QUE YA TENÍAS */
          <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                {view.mode === "CALENDAR" ? <IconCalendar className="text-indigo-600" /> : view.mode === "WEEKLY" ? <IconColumns className="text-indigo-600" /> : view.mode === "FULL_AGENDA" ? <IconMusic className="text-indigo-600" /> : <IconMap className="text-indigo-600" />}
                <span className="hidden sm:inline">{view.mode === "CALENDAR" ? "Calendario Mensual" : view.mode === "WEEKLY" ? "Vista Semanal" : view.mode === "FULL_AGENDA" ? "Agenda Completa" : "Programas"}</span>
              </h2>

              <div className="flex bg-slate-100 p-0.5 rounded-lg ml-2">
                <button onClick={() => setView({ mode: "LIST", data: null })} className={`p-1.5 rounded-md transition-all ${["LIST"].includes(view.mode) ? "bg-white shadow-sm text-indigo-600" : "text-slate-400 hover:text-slate-600"}`} title="Lista"><IconList size={18} /></button>
                <button onClick={() => setView({ mode: "CALENDAR", data: null })} className={`p-1.5 rounded-md transition-all ${view.mode === "CALENDAR" ? "bg-white shadow-sm text-indigo-600" : "text-slate-400 hover:text-slate-600"}`} title="Mes"><IconCalendar size={18} /></button>
                <button onClick={() => setView({ mode: "WEEKLY", data: null })} className={`p-1.5 rounded-md transition-all ${view.mode === "WEEKLY" ? "bg-white shadow-sm text-indigo-600" : "text-slate-400 hover:text-slate-600"}`} title="Semana"><IconColumns size={18} /></button>
                <button onClick={() => setView({ mode: "FULL_AGENDA", data: null })} className={`p-1.5 rounded-md transition-all ${view.mode === "FULL_AGENDA" ? "bg-white shadow-sm text-indigo-600" : "text-slate-400 hover:text-slate-600"}`} title="Agenda"><IconMusic size={18} /></button>
              </div>
            </div>

            {view.mode === "LIST" && (
              <div className="flex items-center gap-2 ml-auto">
                 {/* ... Tus filtros existentes ... */}
                 <button onClick={() => setShowRepertoireInCards(!showRepertoireInCards)} className={`hidden md:flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border ${showRepertoireInCards ? "bg-indigo-100 text-indigo-700 border-indigo-200" : "bg-white text-slate-500 border-slate-200 hover:text-indigo-600"}`}><IconMusic size={14} /><span>{showRepertoireInCards ? "Ocultar Obras" : "Ver Obras"}</span></button>
                 <button className="md:hidden p-2 text-slate-500" onClick={() => setShowFiltersMobile(!showFiltersMobile)}><IconFilter size={20} /></button>
                 <div className="hidden md:flex items-center gap-4">{renderDateInputs()}{renderTypeFilterChips()}</div>
              </div>
            )}
          </div>
        )}

        {/* Mantenemos el filtro móvil solo si estamos en modo LISTA */}
        {showFiltersMobile && view.mode === "LIST" && (
          <div className="md:hidden px-4 pb-3 flex flex-col gap-2">
            {/* ... Tus filtros móviles existentes ... */}
             <button onClick={() => setShowRepertoireInCards(!showRepertoireInCards)} className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-bold transition-colors border ${showRepertoireInCards ? "bg-indigo-100 text-indigo-700 border-indigo-200" : "bg-white text-slate-500 border-slate-200"}`}><IconMusic size={16} /><span>{showRepertoireInCards ? "Ocultar Repertorio" : "Ver Repertorio"}</span></button>
             <div className="flex gap-2">{renderDateInputs(true)}</div>{renderTypeFilterChips(true)}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden relative">
        {view.mode === "FULL_AGENDA" && <AgendaGeneral supabase={supabase} />}
        {view.mode === "CALENDAR" && <MusicianCalendar supabase={supabase} />}
        {view.mode === "WEEKLY" && <WeeklyCalendar rawEvents={allCalendarEvents} tours={giras} updateEventInSupabase={handleUpdateCalendarEvent} />}
        
        {view.mode === "AGENDA" && <GiraAgenda supabase={supabase} gira={view.data} onBack={() => setView({ mode: "LIST", data: null })} />}
        {view.mode === "REPERTOIRE" && <ProgramRepertoire supabase={supabase} program={view.data} onBack={() => setView({ mode: "LIST", data: null })} />}
        {view.mode === "ROSTER" && <GiraRoster supabase={supabase} gira={view.data} onBack={() => setView({ mode: "LIST", data: null })} />}
        {view.mode === "HOTEL" && <ProgramHoteleria supabase={supabase} program={view.data} onBack={() => setView({ mode: "LIST", data: null })} />}
        {view.mode === "LOGISTICS" && <LogisticsDashboard supabase={supabase} gira={view.data} onBack={() => setView({ mode: "LIST", data: null })} />}

        {/* --- NUEVA VISTA DE ASISTENCIA PERSONAL --- */}
        {view.mode === "MEALS_PERSONAL" && (
            <div className="h-full flex flex-col bg-slate-50">
                <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-2 shrink-0">
                    <button onClick={() => setView({ mode: "LIST", data: null })} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
                        <IconArrowLeft size={20}/>
                    </button>
                    <h2 className="text-lg font-bold text-slate-800">
                        Mi Asistencia - <span className="text-slate-500 text-sm font-normal">{view.data.nombre_gira}</span>
                    </h2>
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                    <MealsAttendancePersonal supabase={supabase} gira={view.data} userId={user.id} />
                </div>
            </div>
        )}

        {view.mode === "LIST" && (
          <div className="p-4 space-y-4">
            {isEditor && !isAdding && !editingId && (
              <button onClick={() => { setIsAdding(true); setFormData({ nombre_gira: "", fecha_desde: "", fecha_hasta: "", tipo: "Sinfónico", zona: "" }); setSelectedLocations(new Set()); setSelectedSources([]); setSelectedStaff([]); }} className="w-full py-3 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 hover:border-indigo-500 hover:bg-indigo-50 flex justify-center gap-2 font-medium"><IconPlus size={20} /> Crear Nuevo Programa</button>
            )}

            {(isAdding || editingId) && (
              <GiraForm supabase={supabase} giraId={editingId} formData={formData} setFormData={setFormData} onCancel={closeForm} onSave={handleSave} onRefresh={async () => { await fetchGiras(); closeForm(); }} loading={loading} isNew={isAdding} locationsList={locationsList} selectedLocations={selectedLocations} setSelectedLocations={setSelectedLocations} ensemblesList={ensemblesList} allIntegrantes={allIntegrantes} selectedSources={selectedSources} setSelectedSources={setSelectedSources} selectedStaff={selectedStaff} setSelectedStaff={setSelectedStaff} />
            )}

            {filteredGiras.length === 0 && !loading && (<div className="text-center py-10 text-slate-400">No se encontraron programas.</div>)}

            {filteredGiras.map((gira) => {
              if (editingId === gira.id) return null;
              const personnelDisplay = getPersonnelDisplay(gira);
              const concertList = getConcertList(gira);
              const locs = gira.giras_localidades?.map((l) => l.localidades?.localidad).join(", ");

              return (
                <div key={gira.id} className={`bg-white rounded-xl border border-slate-200 shadow-sm p-4 relative border-l-0 ${openMenuId === gira.id ? "z-50" : "z-0"}`}>
                  <div className={`absolute left-0 top-0 bottom-0 w-1.5 rounded-l-xl ${gira.tipo === "Sinfónico" ? "bg-indigo-500" : gira.tipo === "Ensamble" ? "bg-emerald-500" : "bg-fuchsia-500"}`}></div>

                  <div className="pl-2 flex flex-col gap-2">
                    <div className="flex justify-between items-start">
                      <div className="cursor-pointer flex-1" onClick={() => setView({ mode: "REPERTOIRE", data: gira })}>
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-sm font-bold text-slate-800">{gira.nomenclador || gira.tipo}</span>
                            {gira.zona && <span className="text-xs font-medium text-slate-500">| {gira.zona}</span>}
                          </div>
                          <span className="text-lg font-bold text-slate-800 truncate">{gira.nombre_gira}</span>
                          {getSourcesDisplay(gira)}
                        </div>

                        {personnelDisplay ? (<div className="flex flex-wrap items-center gap-3 text-xs">{personnelDisplay.map((item, index) => (<React.Fragment key={index}>{item}{index < personnelDisplay.length - 1 && <span className="text-slate-400">|</span>}</React.Fragment>))}</div>) : (<span className="text-xs text-slate-400 italic">Sin personal clave asignado</span>)}
                      </div>
                      
                      {/* BOTONES DE ACCIÓN */}
                      <div className="flex items-center gap-2">
                        {/* --- BOTÓN FLOTANTE PARA PERSONAL (Músicos) --- */}
                        {isPersonal && (
                            <button 
                                onClick={(e) => { e.stopPropagation(); setView({ mode: "MEALS_PERSONAL", data: gira }); }}
                                className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 p-2 rounded-lg flex items-center gap-1 text-xs font-bold transition-colors shadow-sm"
                            >
                                <IconUtensils size={16}/> 
                                <span className="hidden sm:inline">Asistencia</span>
                            </button>
                        )}

                        <CommentButton supabase={supabase} entityType="GIRA" entityId={gira.id} onClick={() => setCommentsState({ type: "GIRA", id: gira.id, title: gira.nombre_gira })} />
                        <ActionMenu onAction={(e, act) => handleMenuAction(e, act, gira)} isOpen={openMenuId === gira.id} setIsOpen={(v) => setOpenMenuId(v ? gira.id : null)} hasDrive={!!gira.google_drive_folder_id} canEdit={isEditor} />
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-slate-500 pt-1 border-t border-slate-100">
                      <div className="flex items-center gap-1"><IconCalendar size={14} /> {formatDate(gira.fecha_desde)} - {formatDate(gira.fecha_hasta)}</div>
                      <div className="flex items-center gap-1 truncate"><IconMapPin size={14} /> {locs || "Sin localía"}</div>
                    </div>

                    {concertList && <div className="mt-3 border-t border-slate-100 pt-2">{concertList}</div>}
                    {showRepertoireInCards && <div className="mt-3 animate-in slide-in-from-top-2 border-t border-slate-100 pt-2"><RepertoireManager supabase={supabase} programId={gira.id} /></div>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {globalCommentsGiraId && <GlobalCommentsViewer supabase={supabase} giraId={globalCommentsGiraId} onClose={() => setGlobalCommentsGiraId(null)} onNavigate={handleCommentNavigation} />}
      {commentsState && (<div className="fixed inset-0 z-50 flex justify-end bg-black/20 backdrop-blur-[1px]" onClick={() => setCommentsState(null)}><div onClick={(e) => e.stopPropagation()} className="h-full"><CommentsManager supabase={supabase} entityType={commentsState.type} entityId={commentsState.id} title={commentsState.title} onClose={() => setCommentsState(null)} /></div></div>)}
    </div>
  );
}