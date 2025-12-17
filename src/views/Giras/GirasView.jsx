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
  IconUtensils,
  IconArrowLeft,
  IconEye,
  IconSettingsWheel,
  IconInfo,
  IconCalculator,
  IconMegaphone,
  IconFileText,
  IconChevronDown,
  IconColumns,
} from "../../components/ui/Icons";
import { useAuth } from "../../context/AuthContext";
import GiraForm from "./GiraForm";
import GiraRoster from "./GiraRoster";
import GiraAgenda from "./GiraAgenda";
import ProgramRepertoire from "./ProgramRepertoire";
import LogisticsDashboard from "./LogisticsDashboard"; // Ahora este maneja todo Logística
import AgendaGeneral from "./AgendaGeneral";
import MusicianCalendar from "./MusicianCalendar";
import WeeklyCalendar from "./WeeklyCalendar";
import MealsAttendancePersonal from "./MealsAttendancePersonal";
import ProgramSeating from "./ProgramSeating";

import CommentsManager from "../../components/comments/CommentsManager";
import CommentButton from "../../components/comments/CommentButton";
import GlobalCommentsViewer from "../../components/comments/GlobalCommentsViewer";

import RepertoireManager from "../../components/repertoire/RepertoireManager";
import DateInput from "../../components/ui/DateInput";
import GiraDifusion from "./GiraDifusion";
import InstrumentationManager from "../../components/roster/InstrumentationManager";

// --- COMPONENTE DE MENÚ ACTUALIZADO ---
const GiraActionMenu = ({
  gira,
  onViewChange,
  isEditor,
  isPersonal,
  onEdit,
  onDelete,
  onGlobalComments,
  isOpen,
  onToggle,
  onClose,
}) => {
  const [expandedCategory, setExpandedCategory] = useState(null);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        onClose();
        setExpandedCategory(null);
      }
    };
    if (isOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) setExpandedCategory(null);
  }, [isOpen]);

  const toggleCategory = (key) => {
    setExpandedCategory(expandedCategory === key ? null : key);
  };

  const SubMenuItem = ({ icon: Icon, label, onClick, className = "" }) => (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClose();
        onClick();
      }}
      className={`w-full text-left px-4 py-3 md:py-2 text-sm md:text-xs hover:bg-slate-50 flex items-center gap-3 md:gap-2 text-slate-600 border-l-2 border-transparent hover:border-indigo-500 pl-6 ${className}`}
    >
      <Icon size={16} className="text-slate-400 shrink-0" />
      <span>{label}</span>
    </button>
  );

  const CategoryItem = ({ label, icon: Icon, categoryKey, children }) => {
    const isExpanded = expandedCategory === categoryKey;

    return (
      <div className="border-b border-slate-50 last:border-0">
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleCategory(categoryKey);
          }}
          className={`w-full text-left px-4 py-3 text-sm font-medium flex items-center justify-between gap-2 transition-colors ${
            isExpanded
              ? "bg-slate-50 text-indigo-700"
              : "text-slate-700 hover:bg-slate-50"
          }`}
        >
          <div className="flex items-center gap-2">
            <Icon
              size={16}
              className={isExpanded ? "text-indigo-600" : "text-slate-400"}
            />
            <span>{label}</span>
          </div>
          <IconChevronDown
            size={14}
            className={`text-slate-300 transition-transform duration-200 ${
              isExpanded ? "rotate-180" : ""
            }`}
          />
        </button>

        {isExpanded && (
          <div className="bg-slate-50/50 py-1 animate-in slide-in-from-top-1">
            {children}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        className={`p-3 md:p-2 rounded-lg transition-colors ${
          isOpen
            ? "bg-slate-100 text-indigo-600"
            : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
        }`}
        title="Más opciones"
      >
        <IconMoreVertical size={20} />
      </button>

      {isOpen && (
        <div
          className="absolute right-0 top-full mt-1 w-64 md:w-56 bg-white rounded-xl shadow-2xl border border-slate-200 z-[1000] overflow-hidden animate-in fade-in zoom-in-95 origin-top-right"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="max-h-[60vh] overflow-y-auto">
            {/* 1. REPERTORIO */}
            <CategoryItem
              label="Repertorio"
              icon={IconMusic}
              categoryKey="repertorio"
            >
              <SubMenuItem
                icon={IconMusic}
                label="Repertorio General"
                onClick={() => onViewChange("REPERTOIRE")}
              />
              <SubMenuItem
                icon={IconLayers}
                label="Seating / Disposición"
                onClick={() => onViewChange("REPERTOIRE", "seating")}
              />
              <SubMenuItem
                icon={IconFileText}
                label="Mis Partes"
                onClick={() => onViewChange("REPERTOIRE", "my_parts")}
              />
            </CategoryItem>

            {/* 2. AGENDA */}
            <CategoryItem
              icon={IconCalendar}
              label="Agenda"
              categoryKey="agenda"
            >
              <SubMenuItem
                icon={IconCalendar}
                label="Agenda Detallada"
                onClick={() => onViewChange("AGENDA")}
              />
            </CategoryItem>
            {/* 3. LOGÍSTICA (UNIFICADA EN UN DASHBOARD) */}
            <CategoryItem
              label="Logística"
              icon={IconSettingsWheel}
              categoryKey="logistica"
            >
              {/* Tab: Reglas */}
              <SubMenuItem
                icon={IconSettingsWheel}
                label="Reglas"
                onClick={() => onViewChange("LOGISTICS", "coverage")}
              />

              {/* Tab: Transporte */}
              <SubMenuItem
                icon={IconMap}
                label="Transporte"
                onClick={() => onViewChange("LOGISTICS", "transporte")}
              />

              {isEditor && (
                <>
                  {/* Tab: Rooming */}
                  <SubMenuItem
                    icon={IconHotel}
                    label="Rooming"
                    onClick={() => onViewChange("LOGISTICS", "rooming")}
                  />
                  {/* Tab: Viáticos */}
                  <SubMenuItem
                    icon={IconCalculator}
                    label="Viáticos"
                    onClick={() => onViewChange("LOGISTICS", "viaticos")}
                  />
                  {/* Tab: Comidas */}
                  <SubMenuItem
                    icon={IconUtensils}
                    label="Comidas"
                    onClick={() => onViewChange("LOGISTICS", "meals")}
                  />
                </>
              )}

              {/* Mis Comidas (Vista Personal Separada) */}
              {isPersonal && !isEditor && (
                <SubMenuItem
                  icon={IconUtensils}
                  label="Mis Comidas"
                  onClick={() => onViewChange("MEALS_PERSONAL")}
                />
              )}
            </CategoryItem>

            {/* 4. PERSONAL */}
            {isEditor && (
              <CategoryItem
                label="Personal"
                icon={IconUsers}
                categoryKey="personal"
              >
                <SubMenuItem
                  icon={IconUsers}
                  label="Gestión de Roster"
                  onClick={() => onViewChange("ROSTER")}
                />
              </CategoryItem>
            )}

            {/* 5. DIFUSIÓN */}
            {isEditor && (
              <CategoryItem
                label="Difusión"
                icon={IconMegaphone}
                categoryKey="difusion"
              >
                <SubMenuItem
                  icon={IconMegaphone}
                  label="Material de Prensa"
                  onClick={() => onViewChange("DIFUSION")}
                />
              </CategoryItem>
            )}

            {/* 6. EDICIÓN */}
            {isEditor && (
              <CategoryItem
                label="Edición"
                icon={IconEdit}
                categoryKey="edicion"
              >
                <SubMenuItem
                  icon={IconMessageCircle}
                  label="Gestión de Pendientes"
                  onClick={onGlobalComments}
                />
                <SubMenuItem
                  icon={IconEdit}
                  label="Editar Programa"
                  onClick={onEdit}
                />
                <SubMenuItem
                  icon={IconTrash}
                  label="Eliminar Programa"
                  onClick={onDelete}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                />
              </CategoryItem>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default function GirasView({ supabase }) {
  const { user, isEditor } = useAuth();

  // Estado de la vista: mode (pantalla), data (gira), tab (pestaña interna)
  const [view, setView] = useState({ mode: "LIST", data: null, tab: null });

  const [giras, setGiras] = useState([]);
  const [loading, setLoading] = useState(false);

  const [commentsState, setCommentsState] = useState(null);
  const [globalCommentsGiraId, setGlobalCommentsGiraId] = useState(null);

  const [showRepertoireInCards, setShowRepertoireInCards] = useState(false);
  const [showFiltersMobile, setShowFiltersMobile] = useState(false);

  const [activeMenuId, setActiveMenuId] = useState(null);

  const [filterType, setFilterType] = useState(
    new Set(["Sinfónico", "Camerata Filarmónica", "Ensamble", "Jazz Band"])
  );
  const PROGRAM_TYPES = [
    "Sinfónico",
    "Camerata Filarmónica",
    "Ensamble",
    "Jazz Band",
  ];

  const today = new Date().toISOString().split("T")[0];
  const [filterDateStart, setFilterDateStart] = useState(today);
  const [filterDateEnd, setFilterDateEnd] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({
    nombre_gira: "",
    subtitulo: "",
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

  const isPersonal =
    user?.rol_sistema === "consulta_personal" ||
    user?.rol_sistema === "personal";

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
           eventos (id, fecha, hora_inicio, locaciones(nombre, localidades(localidad)), tipos_evento(nombre)), 
           giras_integrantes (id_integrante, estado, rol, integrantes (nombre, apellido))`
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
            if (excludedEnsembles.some((exclId) => myEnsembles.has(exclId)))
              return false;
            return true;
          }
          return false;
        });
      }
      setGiras(result);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLocationsList = async () => {
    const { data } = await supabase
      .from("localidades")
      .select("id, localidad")
      .order("localidad");
    if (data) setLocationsList(data);
  };

  const fetchEnsemblesList = async () => {
    const { data } = await supabase.from("ensambles").select("id, ensamble");
    if (data)
      setEnsemblesList(data.map((e) => ({ value: e.id, label: e.ensamble })));
  };

  const fetchIntegrantesList = async () => {
    const { data } = await supabase
      .from("integrantes")
      .select("id, nombre, apellido")
      .order("apellido");
    if (data) {
      setAllIntegrantes(
        data.map((i) => ({ value: i.id, label: `${i.apellido}, ${i.nombre}` }))
      );
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
        const { data } = await supabase
          .from("programas")
          .insert([formData])
          .select();
        if (data && data.length > 0) targetId = data[0].id;
      }

      if (targetId) {
        await supabase
          .from("giras_localidades")
          .delete()
          .eq("id_gira", targetId);
        const locPayload = Array.from(selectedLocations).map((lid) => ({
          id_gira: targetId,
          id_localidad: lid,
        }));
        if (locPayload.length > 0)
          await supabase.from("giras_localidades").insert(locPayload);

        await supabase.from("giras_fuentes").delete().eq("id_gira", targetId);
        const srcPayload = selectedSources.map((s) => ({
          id_gira: targetId,
          tipo: s.tipo,
          valor_id: s.valor_id || null,
          valor_texto: s.valor_texto || null,
        }));
        if (srcPayload.length > 0)
          await supabase.from("giras_fuentes").insert(srcPayload);

        await supabase
          .from("giras_integrantes")
          .delete()
          .eq("id_gira", targetId)
          .in("rol", ["director", "solista"]);
        const staffPayload = selectedStaff.map((s) => ({
          id_gira: targetId,
          id_integrante: s.id_integrante,
          rol: s.rol,
          estado: "confirmado",
        }));
        if (staffPayload.length > 0)
          await supabase.from("giras_integrantes").insert(staffPayload);

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
      subtitulo: gira.subtitulo || "",
      fecha_desde: gira.fecha_desde || "",
      fecha_hasta: gira.fecha_hasta || "",
      tipo: gira.tipo || "Sinfónico",
      zona: gira.zona || "",
    });
    const { data } = await supabase
      .from("giras_localidades")
      .select("id_localidad")
      .eq("id_gira", gira.id);
    setSelectedLocations(
      data ? new Set(data.map((d) => d.id_localidad)) : new Set()
    );
    const fuentes = (gira.giras_fuentes || []).map((f) => {
      let label = f.valor_texto;
      if (f.tipo.includes("ENSAMBLE")) {
        const found = ensemblesList.find((e) => e.value === f.valor_id);
        label = found ? found.label : `Ensamble ${f.valor_id}`;
      }
      return {
        tipo: f.tipo,
        valor_id: f.valor_id,
        valor_texto: f.valor_texto,
        label: label,
      };
    });
    setSelectedSources(fuentes);
    const staff = (gira.giras_integrantes || [])
      .filter((i) => ["director", "solista"].includes(i.rol))
      .map((i) => ({
        id_integrante: i.id_integrante,
        rol: i.rol,
        label: i.integrantes
          ? `${i.integrantes.apellido}, ${i.integrantes.nombre}`
          : "Desconocido",
      }));
    setSelectedStaff(staff);
    setIsAdding(false);
  };

  const closeForm = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData({
      nombre_gira: "",
      subtitulo: "",
      fecha_desde: "",
      fecha_hasta: "",
      tipo: "Sinfónico",
      zona: "",
    });
    setSelectedLocations(new Set());
    setSelectedSources([]);
    setSelectedStaff([]);
  };

  const handleCommentNavigation = (type, entityId) => {
    const currentGira = giras.find((g) => g.id === globalCommentsGiraId);
    if (!currentGira) return;
    setGlobalCommentsGiraId(null);
    if (type === "EVENTO") setView({ mode: "AGENDA", data: currentGira });
    else if (type === "OBRA")
      setView({ mode: "REPERTOIRE", data: currentGira });
    else if (type === "HABITACION")
      setView({ mode: "LOGISTICS", data: currentGira, tab: "rooming" });
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

  const getPersonnelDisplay = (gira) => {
    const roster = gira.giras_integrantes || [];
    const directors = roster.filter(
      (r) => r.rol === "director" && r.estado === "confirmado"
    );
    const soloists = roster.filter(
      (r) => r.rol === "solista" && r.estado === "confirmado"
    );
    const formatName = (p) =>
      `${p.integrantes?.apellido || ""}, ${p.integrantes?.nombre || ""}`;
    const cleanNames = (arr) =>
      arr.map(formatName).filter((n) => n.trim() !== ",");
    const directorNames = cleanNames(directors);
    const soloistNames = cleanNames(soloists);
    let output = [];
    if (directorNames.length > 0)
      output.push(
        <span key="dir" className="font-semibold text-indigo-700">
          Dir: {directorNames.join(" | ")}
        </span>
      );
    if (soloistNames.length > 0)
      output.push(
        <span key="sol" className="font-semibold text-fuchsia-700">
          Solista/s: {soloistNames.join(" | ")}
        </span>
      );
    return output.length > 0 ? output : null;
  };

  const getConcertList = (gira) => {
    const concerts = (gira.eventos || [])
      .filter(
        (e) =>
          e.tipos_evento?.nombre?.toLowerCase().includes("concierto") ||
          e.tipos_evento?.nombre?.toLowerCase().includes("función")
      )
      .sort((a, b) =>
        (a.fecha + a.hora_inicio).localeCompare(b.fecha + b.hora_inicio)
      );
    if (concerts.length === 0) return null;
    return (
      <div className="text-xs space-y-1">
        <ul className="pl-1 space-y-0.5">
          {concerts.slice(0, 3).map((c, idx) => (
            <li
              key={idx}
              className="text-slate-500 truncate max-w-full flex items-center gap-1"
            >
              <span className="font-mono text-[10px] mr-1 bg-slate-100 px-1 rounded">
                {formatDate(c.fecha)} - {c.hora_inicio.slice(0, 5)}
              </span>
              {`${c.locaciones?.nombre || ""} | ${
                c.locaciones?.localidades?.localidad || ""
              }`}
            </li>
          ))}
          {concerts.length > 3 && (
            <li className="text-slate-400 italic text-[10px] pt-1">
              y {concerts.length - 3} evento(s) más.
            </li>
          )}
        </ul>
      </div>
    );
  };

  const getSourcesDisplay = (gira) => {
    const sources = gira.giras_fuentes || [];
    const ensembleMap = new Map(ensemblesList.map((e) => [e.value, e.label]));
    const inclusions = [];
    const exclusions = [];
    sources.forEach((s) => {
      let label = "";
      if (s.tipo === "ENSAMBLE") {
        label = ensembleMap.get(s.valor_id) || `Ensamble ID:${s.valor_id}`;
        inclusions.push(
          <span key={s.id} className="text-emerald-700 font-medium">
            {label}
          </span>
        );
      } else if (s.tipo === "FAMILIA") {
        label = s.valor_texto;
        inclusions.push(
          <span key={s.id} className="text-indigo-700 font-medium">
            {label}
          </span>
        );
      } else if (s.tipo === "EXCL_ENSAMBLE") {
        label = ensembleMap.get(s.valor_id) || `Ensamble ID:${s.valor_id}`;
        exclusions.push(
          <span key={s.id} className="text-red-700 font-medium">
            {label}
          </span>
        );
      }
    });
    if (inclusions.length === 0 && exclusions.length === 0) return null;
    return (
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs ml-2 pl-2 border-l border-slate-200 shrink-0">
        {inclusions.length > 0 && (
          <>
            {inclusions.map((item, index) => (
              <React.Fragment key={index}>
                {item}
                {index < inclusions.length - 1 && (
                  <span className="text-slate-300">|</span>
                )}
              </React.Fragment>
            ))}
          </>
        )}
        {exclusions.length > 0 && (
          <>
            {inclusions.length > 0 && <span className="text-slate-300">|</span>}
            <span className="font-bold text-red-600 shrink-0"></span>
            {exclusions.map((item, index) => (
              <React.Fragment key={index}>
                {item}
                {index < exclusions.length - 1 && (
                  <span className="text-slate-300">|</span>
                )}
              </React.Fragment>
            ))}
          </>
        )}
      </div>
    );
  };

  const toggleFilterType = (type) => {
    setFilterType((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(type)) newSet.delete(type);
      else newSet.add(type);
      return newSet;
    });
  };

  const renderTypeFilterChips = (isMobile = false) => (
    <div className={`flex flex-wrap gap-2 ${isMobile ? "pt-2" : ""}`}>
      {PROGRAM_TYPES.map((type) => (
        <button
          key={type}
          onClick={() => toggleFilterType(type)}
          className={`px-3 py-1 rounded-full text-xs font-bold transition-all border ${
            filterType.has(type)
              ? "bg-indigo-600 text-white border-indigo-700"
              : "bg-white text-slate-500 border-slate-300 hover:bg-slate-50"
          }`}
        >
          {type}
        </button>
      ))}
    </div>
  );

  const renderDateInputs = (isMobile = false) => (
    <div className="flex items-center gap-2">
      <div className={`${isMobile ? "w-full" : "w-32"}`}>
        <DateInput
          label={null}
          value={filterDateStart}
          onChange={setFilterDateStart}
          placeholder="Desde"
          className="w-full"
        />
      </div>
      <span className="text-slate-400 text-xs">-</span>
      <div className={`${isMobile ? "w-full" : "w-32"}`}>
        <DateInput
          label={null}
          value={filterDateEnd}
          onChange={setFilterDateEnd}
          placeholder="Hasta"
          className="w-full"
        />
      </div>
    </div>
  );

  const allCalendarEvents = useMemo(() => {
    return giras.flatMap((gira) => {
      if (!gira.eventos) return [];
      return gira.eventos.map((evento) => {
        const startStr = `${evento.fecha}T${evento.hora_inicio}`;
        const startDate = new Date(startStr);
        const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000);
        return {
          id: evento.id,
          title: gira.nombre_gira,
          subtitle: evento.locaciones?.nombre || "",
          start: startStr,
          end: endDate.toISOString(),
          programLabel: (evento.tipos_evento?.nombre || "Evento").toUpperCase(),
          programType: gira.tipo,
          programName: gira.nombre_gira,
          location: evento.locaciones?.nombre || "Sin lugar",
          giraId: gira.id,
          eventType: evento.tipos_evento?.nombre || "",
        };
      });
    });
  }, [giras]);

  const handleUpdateCalendarEvent = async (eventData) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("eventos")
        .update({
          fecha: eventData.start.split("T")[0],
          hora_inicio: eventData.start.split("T")[1],
        })
        .eq("id", eventData.id);
      if (error) throw error;
      await fetchGiras();
    } catch (err) {
      alert("Error al actualizar: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const tourNavItems = [
    { mode: "LOGISTICS", label: "Logística", icon: IconSettingsWheel },
    { mode: "AGENDA", label: "Agenda", icon: IconCalendar },
    { mode: "REPERTOIRE", label: "Repertorio", icon: IconMusic },
    { mode: "ROSTER", label: "Personal", icon: IconUsers },
    { mode: "DIFUSION", label: "Difusión", icon: IconMegaphone },
  ];

  const isDetailView =
    [
      "AGENDA",
      "REPERTOIRE",
      "ROSTER",
      "LOGISTICS",
      "MEALS_PERSONAL",
      "SEATING",
      "DIFUSION",
    ].includes(view.mode) && view.data;

  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
      <div className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm shrink-0">
        {isDetailView ? (
          <div className="px-4 py-2 flex flex-col sm:flex-row items-center justify-between gap-3 print:hidden">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                onClick={() => setView({ mode: "LIST", data: null })}
                className="p-2 rounded-full hover:bg-slate-100 text-slate-500 transition-colors"
                title="Volver al listado"
              >
                <IconArrowLeft size={20} />
              </button>
              <div className="flex flex-col overflow-hidden">
                <h2 className="text-m font-bold text-slate-800 truncate leading-tight">{`${view.data.mes_letra} | ${view.data.nomenclador}. ${view.data.nombre_gira}`}</h2>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="font-medium bg-indigo-50 text-indigo-700 px-1.5 rounded">
                    {view.data.tipo}
                  </span>
                  <span className="truncate">{view.data.zona}</span>
                </div>
              </div>
            </div>
            {(isEditor || isPersonal) && (
              <div className="flex items-center bg-slate-100 p-1 rounded-lg overflow-x-auto max-w-full no-scrollbar">
                {tourNavItems
                  .filter(
                    (item) =>
                      isEditor ||
                      item.mode === "AGENDA" ||
                      item.mode === "REPERTOIRE"
                  )
                  .map((item) => {
                    const isActive = view.mode === item.mode;
                    return (
                      <button
                        key={item.mode}
                        onClick={() => setView({ ...view, mode: item.mode })}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all whitespace-nowrap ${
                          isActive
                            ? "bg-white text-indigo-600 shadow-sm"
                            : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                        }`}
                      >
                        <item.icon size={16} strokeWidth={isActive ? 2.5 : 2} />
                        <span className="hidden md:inline">{item.label}</span>
                      </button>
                    );
                  })}
              </div>
            )}
          </div>
        ) : (
          <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                {view.mode === "CALENDAR" ? (
                  <IconCalendar className="text-indigo-600" />
                ) : view.mode === "WEEKLY" ? (
                  <IconColumns className="text-indigo-600" />
                ) : view.mode === "FULL_AGENDA" ? (
                  <IconMusic className="text-indigo-600" />
                ) : (
                  <IconMap className="text-indigo-600" />
                )}
                <span className="hidden sm:inline">
                  {view.mode === "CALENDAR"
                    ? "Calendario Mensual"
                    : view.mode === "WEEKLY"
                    ? "Vista Semanal"
                    : view.mode === "FULL_AGENDA"
                    ? "Agenda Completa"
                    : "Programas"}
                </span>
              </h2>
              <div className="flex bg-slate-100 p-0.5 rounded-lg ml-2">
                <button
                  onClick={() => setView({ mode: "LIST", data: null })}
                  className={`p-1.5 rounded-md transition-all ${
                    ["LIST"].includes(view.mode)
                      ? "bg-white shadow-sm text-indigo-600"
                      : "text-slate-400 hover:text-slate-600"
                  }`}
                  title="Lista"
                >
                  <IconList size={18} />
                </button>
                <button
                  onClick={() => setView({ mode: "CALENDAR", data: null })}
                  className={`p-1.5 rounded-md transition-all ${
                    view.mode === "CALENDAR"
                      ? "bg-white shadow-sm text-indigo-600"
                      : "text-slate-400 hover:text-slate-600"
                  }`}
                  title="Mes"
                >
                  <IconCalendar size={18} />
                </button>
                <button
                  onClick={() => setView({ mode: "WEEKLY", data: null })}
                  className={`p-1.5 rounded-md transition-all ${
                    view.mode === "WEEKLY"
                      ? "bg-white shadow-sm text-indigo-600"
                      : "text-slate-400 hover:text-slate-600"
                  }`}
                  title="Semana"
                >
                  <IconColumns size={18} />
                </button>
                <button
                  onClick={() => setView({ mode: "FULL_AGENDA", data: null })}
                  className={`p-1.5 rounded-md transition-all ${
                    view.mode === "FULL_AGENDA"
                      ? "bg-white shadow-sm text-indigo-600"
                      : "text-slate-400 hover:text-slate-600"
                  }`}
                  title="Agenda"
                >
                  <IconInfo size={24} />
                </button>
              </div>
            </div>
            {view.mode === "LIST" && (
              <div className="p-2 md:p-4 space-y-3 md:space-y-0 md:flex md:items-center md:gap-4 pb-20 md:pb-4">
                {" "}
                <button
                  onClick={() =>
                    setShowRepertoireInCards(!showRepertoireInCards)
                  }
                  className={`hidden md:flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border ${
                    showRepertoireInCards
                      ? "bg-indigo-100 text-indigo-700 border-indigo-200"
                      : "bg-white text-slate-500 border-slate-200 hover:text-indigo-600"
                  }`}
                >
                  <IconEye size={16} />
                  <span>
                    {showRepertoireInCards ? "Ocultar Obras" : "Ver Obras"}
                  </span>
                </button>
                <button
                  className="md:hidden p-2 text-slate-500"
                  onClick={() => setShowFiltersMobile(!showFiltersMobile)}
                >
                  <IconFilter size={20} />
                </button>
                <div className="hidden md:flex items-center gap-4">
                  {renderDateInputs()}
                  {renderTypeFilterChips()}
                </div>
              </div>
            )}
          </div>
        )}
        {showFiltersMobile && view.mode === "LIST" && (
          <div className="md:hidden px-4 pb-3 flex flex-col gap-2">
            <button
              onClick={() => setShowRepertoireInCards(!showRepertoireInCards)}
              className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-bold transition-colors border ${
                showRepertoireInCards
                  ? "bg-indigo-100 text-indigo-700 border-indigo-200"
                  : "bg-white text-slate-500 border-slate-200"
              }`}
            >
              <IconMusic size={16} />
              <span>
                {showRepertoireInCards
                  ? "Ocultar Repertorio"
                  : "Ver Repertorio"}
              </span>
            </button>
            <div className="flex gap-2">{renderDateInputs(true)}</div>
            {renderTypeFilterChips(true)}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden relative">
        {view.mode === "FULL_AGENDA" && <AgendaGeneral supabase={supabase} />}
        {view.mode === "CALENDAR" && <MusicianCalendar supabase={supabase} />}
        {view.mode === "WEEKLY" && (
          <WeeklyCalendar
            rawEvents={allCalendarEvents}
            tours={giras}
            updateEventInSupabase={handleUpdateCalendarEvent}
          />
        )}
        {view.mode === "AGENDA" && (
          <GiraAgenda
            supabase={supabase}
            gira={view.data}
            onBack={() => setView({ mode: "LIST", data: null })}
          />
        )}
        {view.mode === "REPERTOIRE" && (
          <ProgramRepertoire
            supabase={supabase}
            program={view.data}
            initialTab={view.tab}
            onBack={() => setView({ mode: "LIST", data: null })}
          />
        )}
        {view.mode === "SEATING" && (
          <ProgramSeating
            supabase={supabase}
            program={view.data}
            onBack={() => setView({ mode: "LIST", data: null })}
          />
        )}
        {view.mode === "ROSTER" && (
          <GiraRoster
            supabase={supabase}
            gira={view.data}
            onBack={() => setView({ mode: "LIST", data: null })}
          />
        )}
        {view.mode === "DIFUSION" && (
          <GiraDifusion
            supabase={supabase}
            gira={view.data}
            onBack={() => setView({ mode: "LIST", data: null })}
          />
        )}

        {/* --- UNIFICADO: TODO LOGÍSTICA EN UN DASHBOARD --- */}
        {view.mode === "LOGISTICS" && (
          <LogisticsDashboard
            supabase={supabase}
            gira={view.data}
            initialTab={view.tab} // Pasar la pestaña clickeada
            onBack={() => setView({ mode: "LIST", data: null })}
          />
        )}

        {/* --- VISTA PERSONAL SE MANTIENE SEPARADA --- */}
        {view.mode === "MEALS_PERSONAL" && (
          <div className="h-full flex flex-col bg-slate-50">
            <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-2 shrink-0">
              <button
                onClick={() => setView({ mode: "LIST", data: null })}
                className="p-2 hover:bg-slate-100 rounded-full text-slate-500"
              >
                <IconArrowLeft size={20} />
              </button>
              <h2 className="text-lg font-bold text-slate-800">
                Mi Asistencia -{" "}
                <span className="text-slate-500 text-sm font-normal">
                  {view.data.nombre_gira}
                </span>
              </h2>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <MealsAttendancePersonal
                supabase={supabase}
                gira={view.data}
                userId={user.id}
              />
            </div>
          </div>
        )}

        {view.mode === "LIST" && (
          <div className="p-4 space-y-4">
            {isEditor && !editingId && (
              <>
                {!isAdding && (
                  <button
                    onClick={() => {
                      setIsAdding(true);
                      setFormData({
                        nombre_gira: "",
                        subtitulo: "",
                        fecha_desde: "",
                        fecha_hasta: "",
                        tipo: "Sinfónico",
                        zona: "",
                      });
                      setSelectedLocations(new Set());
                      setSelectedSources([]);
                      setSelectedStaff([]);
                    }}
                    className="w-full py-3 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 hover:border-indigo-500 hover:bg-indigo-50 flex justify-center gap-2 font-medium"
                  >
                    <IconPlus size={20} /> Crear Nuevo Programa
                  </button>
                )}
                {isAdding && (
                  <GiraForm
                    supabase={supabase}
                    giraId={null}
                    formData={formData}
                    setFormData={setFormData}
                    onCancel={closeForm}
                    onSave={handleSave}
                    onRefresh={async () => {
                      await fetchGiras();
                      closeForm();
                    }}
                    loading={loading}
                    isNew={true}
                    locationsList={locationsList}
                    selectedLocations={selectedLocations}
                    setSelectedLocations={setSelectedLocations}
                    ensemblesList={ensemblesList}
                    allIntegrantes={allIntegrantes}
                    selectedSources={selectedSources}
                    setSelectedSources={setSelectedSources}
                    selectedStaff={selectedStaff}
                    setSelectedStaff={setSelectedStaff}
                  />
                )}
              </>
            )}
            {filteredGiras.length === 0 && !loading && !isAdding && (
              <div className="text-center py-10 text-slate-400">
                No se encontraron programas.
              </div>
            )}
            {filteredGiras.map((gira) => {
              if (editingId === gira.id) {
                return (
                  <GiraForm
                    key={gira.id}
                    supabase={supabase}
                    giraId={gira.id}
                    formData={formData}
                    setFormData={setFormData}
                    onCancel={closeForm}
                    onSave={handleSave}
                    onRefresh={async () => {
                      await fetchGiras();
                      closeForm();
                    }}
                    loading={loading}
                    isNew={false}
                    locationsList={locationsList}
                    selectedLocations={selectedLocations}
                    setSelectedLocations={setSelectedLocations}
                    ensemblesList={ensemblesList}
                    allIntegrantes={allIntegrantes}
                    selectedSources={selectedSources}
                    setSelectedSources={setSelectedSources}
                    selectedStaff={selectedStaff}
                    setSelectedStaff={setSelectedStaff}
                  />
                );
              }
              const locs = gira.giras_localidades
                ?.map((l) => l.localidades?.localidad)
                .join(", ");
              const isMenuOpen = activeMenuId === gira.id;
              return (
                <div
                  key={gira.id}
                  className={`bg-white rounded-xl border border-slate-200 shadow-sm p-3 md:p-4 relative border-l-0 overflow-visible transition-all ${
                    isMenuOpen ? "z-50" : "z-0"
                  }`}
                >
                  <div
                    className={`absolute left-0 top-0 bottom-0 w-1.5 rounded-l-xl ${
                      gira.tipo === "Sinfónico"
                        ? "bg-indigo-500"
                        : gira.tipo === "Ensamble"
                        ? "bg-emerald-500"
                        : gira.tipo === "Jazz Band"
                        ? "bg-amber-500"
                        : "bg-fuchsia-500"
                    }`}
                  ></div>
                  <div className="pl-2 flex flex-col gap-2">
                    <div className="flex justify-between items-start gap-2">
                      <div
                        className="cursor-pointer flex-1 min-w-0"
                        onClick={() =>
                          setView({ mode: "REPERTOIRE", data: gira })
                        }
                      >
                        <div className="flex flex-col gap-1 mb-2">
                          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                            <span className="font-bold text-slate-700 bg-slate-100 px-1.5 rounded whitespace-nowrap">
                              {`${gira.mes_letra} | ${gira.nomenclador}` ||
                                gira.tipo}
                            </span>
                            {gira.zona && (
                              <span className="font-medium whitespace-nowrap">
                                | {gira.zona}
                              </span>
                            )}
                            <div className="flex items-center gap-1 whitespace-nowrap">
                              <IconCalendar size={12} />
                              {formatDate(gira.fecha_desde)} -{" "}
                              {formatDate(gira.fecha_hasta)}
                            </div>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-base font-bold text-slate-800 truncate w-full block">
                              {gira.nombre_gira}
                            </span>
                            <span className="text-xs italic text-slate-600 truncate w-full block h-4">
                              {gira.subtitulo || " "}
                            </span>
                            <div className="flex items-center gap-1 text-xs text-slate-500 mt-1 truncate">
                              <IconMapPin size={12} className="shrink-0" />
                              <span className="truncate">
                                {locs || "Sin localía"}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 mt-1">
                          {getPersonnelDisplay(gira)}
                          <div className="max-w-full overflow-hidden text-ellipsis whitespace-nowrap">
                            {getSourcesDisplay(gira)}
                          </div>
                          <div className="w-full md:w-auto md:ml-2 md:pl-2 md:border-l border-slate-200 mt-1 md:mt-0">
                            <InstrumentationManager
                              supabase={supabase}
                              gira={gira}
                            />
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 md:gap-2 shrink-0 relative z-10">
                        {gira.google_drive_folder_id && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(
                                `https://drive.google.com/drive/folders/${gira.google_drive_folder_id}`,
                                "_blank"
                              );
                            }}
                            className="p-2 rounded-lg text-slate-400 hover:text-green-600 hover:bg-green-50 transition-colors hidden sm:block"
                            title="Abrir Drive"
                          >
                            <IconDrive size={20} />
                          </button>
                        )}
                        <CommentButton
                          supabase={supabase}
                          entityType="GIRA"
                          entityId={gira.id}
                          onClick={() =>
                            setCommentsState({
                              type: "GIRA",
                              id: gira.id,
                              title: gira.nombre_gira,
                            })
                          }
                        />
                        <GiraActionMenu
                          gira={gira}
                          onViewChange={(mode, tab) =>
                            setView({ mode, data: gira, tab })
                          }
                          isEditor={isEditor}
                          isPersonal={isPersonal}
                          onEdit={() => startEdit(gira)}
                          onDelete={(e) => handleDelete(e, gira.id)}
                          onGlobalComments={() =>
                            setGlobalCommentsGiraId(gira.id)
                          }
                          isOpen={isMenuOpen}
                          onToggle={() =>
                            setActiveMenuId(isMenuOpen ? null : gira.id)
                          }
                          onClose={() => setActiveMenuId(null)}
                        />
                      </div>
                    </div>
                    {getConcertList(gira) && (
                      <div className="mt-2 border-t border-slate-100 pt-2">
                        {getConcertList(gira)}
                      </div>
                    )}
                    {showRepertoireInCards && (
                      <div className="mt-3 animate-in slide-in-from-top-2 border-t border-slate-100 pt-2">
                        <RepertoireManager
                          supabase={supabase}
                          programId={gira.id}
                        />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {globalCommentsGiraId && (
        <GlobalCommentsViewer
          supabase={supabase}
          giraId={globalCommentsGiraId}
          onClose={() => setGlobalCommentsGiraId(null)}
          onNavigate={handleCommentNavigation}
        />
      )}
      {commentsState && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/20 backdrop-blur-[1px]"
          onClick={() => setCommentsState(null)}
        >
          <div onClick={(e) => e.stopPropagation()} className="h-full">
            <CommentsManager
              supabase={supabase}
              entityType={commentsState.type}
              entityId={commentsState.id}
              title={commentsState.title}
              onClose={() => setCommentsState(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
