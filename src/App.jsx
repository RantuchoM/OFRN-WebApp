import React, { useState, useEffect } from "react";
import {
  Routes,
  Route,
  useSearchParams,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { supabase } from "./services/supabase";

// Vistas
import LoginView from "./views/LoginView/LoginView";
import GirasView from "./views/Giras/GirasView";
import EnsemblesView from "./views/Ensembles/EnsemblesView";
import MusiciansView from "./views/Musicians/MusiciansView";
import LocationsView from "./views/Locations/LocationsView";
import RepertoireView from "./views/Repertoire/RepertoireView";
import DataView from "./views/Data/DataView";
import UsersManager from "./views/Users/UsersManager";
import AgendaGeneral from "./views/Giras/AgendaGeneral";
import GlobalCommentsViewer from "./components/comments/GlobalCommentsViewer";
import EnsembleCoordinatorView from "./views/Ensembles/EnsembleCoordinatorView";
import MyPartsViewer from "./views/Giras/MyPartsViewer";
import MealsAttendancePersonal from "./views/Giras/MealsAttendancePersonal";
import PublicLinkHandler from "./views/Public/PublicLinkHandler";
import DashboardGeneral from "./views/Dashboard/DashboardGeneral";
import NewsModal from "./components/news/NewsModal";
import NewsManager from "./components/news/NewsManager";
import FeedbackWidget from "./components/ui/FeedbackWidget";
import FeedbackAdmin from "./views/Feedback/FeedbackAdmin"; // <--- NUEVO IMPORT
import { ManualProvider } from "./context/ManualContext";
import ManualIndex from "./views/Manual/ManualIndex";
import ManualAdmin from "./views/Manual/ManualAdmin";
import ManualTrigger from "./components/manual/ManualTrigger";
import { useManual } from "./context/ManualContext";
import { IconEye, IconEyeOff } from "./components/ui/Icons";
import {
  IconLayoutDashboard,
  IconDownload,
  IconSettingsWheel,
  IconMap,
  IconMusic,
  IconUsers,
  IconMapPin,
  IconFileText,
  IconDatabase,
  IconSettings,
  IconLogOut,
  IconCalendar,
  IconMessageCircle,
  IconMenu,
  IconX,
  IconCheck,
  IconUtensils,
  IconChevronLeft,
  IconChevronRight,
  IconSpiralNotebook,
  IconList,
  IconAlertCircle,
  IconBell,
  IconCopy,
  IconBulb,
  IconDrive, // Asegúrate de tener este importado si lo usas abajo
  IconBookOpen, // <--- AGREGADO: Asegúrate de tener este ícono en Icons.jsx
  IconEdit,
} from "./components/ui/Icons";

// --- MODAL CALENDARIO (Mantenido igual) ---
const CalendarSelectionModal = ({ isOpen, onClose, userId, isAdmin }) => {
  if (!isOpen || !userId) return null;

  // URLs de las dos funciones Edge
  const USER_BASE_URL = "webcal://muxrbuivopnawnxlcjxq.supabase.co/functions/v1/calendar-export";
  const ADMIN_BASE_URL = "webcal://muxrbuivopnawnxlcjxq.supabase.co/functions/v1/ics-export-admin";

  // Estado para manejar pestañas si es admin
  const [activeTab, setActiveTab] = useState('PERSONAL'); // 'PERSONAL' | 'ADMIN'

  // --- LÓGICA DE USUARIO (PERSONAL) ---
  const getUserLinks = (mode) => {
    let url = `${USER_BASE_URL}?uid=${userId}`;
    if (mode === "musical") url += "&mode=musical";
    else if (mode === "otros") url += "&mode=otros";

    return formatLinks(url);
  };

  // --- LÓGICA DE ADMIN (MASTER) ---
  const getAdminLinks = (type, mode) => {
    // type: 'Sinfónico' | 'Ensamble' | 'Jazz Band'
    // mode: 'musical' | 'logistics' | 'full'
    let url = `${ADMIN_BASE_URL}?type=${encodeURIComponent(type)}&mode=${mode}`;
    return formatLinks(url);
  };

  // Helper común para formatear los 3 tipos de enlace
  const formatLinks = (webcalUrl) => {
    const httpsLink = webcalUrl.replace(/^webcal:/, "https:");
    const googleMagicLink = `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(webcalUrl)}`;
    return { webcalLink: webcalUrl, googleMagicLink, httpsLink };
  };

  const handleSubscribe = (platform, category, mode, isAdminContext = false) => {
    let links;
    if (isAdminContext) {
        links = getAdminLinks(category, mode); // category es el 'type' (Sinfónico, etc)
    } else {
        links = getUserLinks(category); // category es el 'mode' (musical/otros)
    }

    const { webcalLink, googleMagicLink, httpsLink } = links;

    if (platform === "GOOGLE") {
      window.open(googleMagicLink, "_blank");
    } else if (platform === "IOS") {
      window.location.href = webcalLink;
    } else if (platform === "COPY") {
      navigator.clipboard.writeText(httpsLink).then(() => {
        alert("🔗 Enlace copiado al portapapeles.");
      });
    }
  };

  // --- RENDERIZADO ---

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* HEADER */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <IconCalendar size={20} className="text-indigo-600" /> 
            Sincronizar Calendario
          </h3>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-200 transition-colors">
            <IconX size={20} />
          </button>
        </div>

        {/* PESTAÑAS (SOLO SI ES ADMIN) */}
        {isAdmin && (
            <div className="flex border-b border-slate-100 shrink-0">
                <button 
                    onClick={() => setActiveTab('PERSONAL')}
                    className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider text-center transition-colors ${activeTab === 'PERSONAL' ? 'bg-white text-indigo-600 border-b-2 border-indigo-600' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                >
                    Mi Agenda
                </button>
                <button 
                    onClick={() => setActiveTab('ADMIN')}
                    className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider text-center transition-colors ${activeTab === 'ADMIN' ? 'bg-white text-indigo-600 border-b-2 border-indigo-600' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                >
                    Master (Admin)
                </button>
            </div>
        )}

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
            
            {/* --- VISTA PERSONAL --- */}
            {(!isAdmin || activeTab === 'PERSONAL') && (
                <>
                    {/* Sección Musical */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-indigo-700 font-bold text-sm uppercase tracking-wider">
                                <IconMusic size={18} /> Solo Musical
                            </div>
                            <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-bold">
                                Ensayos y Conciertos
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 mb-2">Ideal para no saturar tu agenda personal. Solo eventos artísticos asignados a ti.</p>
                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => handleSubscribe("GOOGLE", "musical", null)} className="btn-calendar-google">Google Calendar</button>
                            <button onClick={() => handleSubscribe("IOS", "musical", null)} className="btn-calendar-ios">iPhone / Mac</button>
                        </div>
                        <button onClick={() => handleSubscribe("COPY", "musical", null)} className="btn-calendar-copy">
                            <IconCopy size={10} /> Copiar enlace manual
                        </button>
                    </div>

                    <div className="h-px bg-slate-100"></div>

                    {/* Sección Logística */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-slate-700 font-bold text-sm uppercase tracking-wider">
                                <IconLayoutDashboard size={18} /> Otros Eventos
                            </div>
                            <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold">Logística y Giras</span>
                        </div>
                        <p className="text-xs text-slate-500 mb-2">Incluye hitos de gira, logística de transporte, comidas y trámites asignados.</p>
                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => handleSubscribe("GOOGLE", "otros", null)} className="btn-calendar-google">Google Calendar</button>
                            <button onClick={() => handleSubscribe("IOS", "otros", null)} className="btn-calendar-ios">iPhone / Mac</button>
                        </div>
                        <button onClick={() => handleSubscribe("COPY", "otros", null)} className="btn-calendar-copy">
                            <IconCopy size={10} /> Copiar enlace manual
                        </button>
                    </div>

                    {/* Full */}
                    <div className="text-center pt-2 border-t border-slate-50 mt-4">
                        <button onClick={() => handleSubscribe("COPY", "full", null)} className="text-xs text-slate-300 hover:text-indigo-600 flex items-center justify-center gap-1 mx-auto transition-colors">
                            <IconCopy size={12} /> Copiar enlace de Agenda Completa
                        </button>
                    </div>
                </>
            )}

            {/* --- VISTA ADMIN (MASTER) --- */}
            {isAdmin && activeTab === 'ADMIN' && (
                <div className="space-y-6">
                    <p className="text-xs text-slate-500 bg-blue-50 border border-blue-100 p-3 rounded-lg">
                        Estos calendarios incluyen <strong>toda la actividad vigente</strong> de cada organismo, sin filtrar por personal asignado.
                    </p>

                    {/* Mapeamos los 3 organismos */}
                    {[
                        { label: "Sinfónico", type: "Sinfónico", color: "text-indigo-600", bg: "bg-indigo-50" },
                        { label: "Cámara / Ensamble", type: "Ensamble", color: "text-emerald-600", bg: "bg-emerald-50" },
                        { label: "Jazz Band", type: "Jazz Band", color: "text-amber-600", bg: "bg-amber-50" }
                    ].map((org) => (
                        <div key={org.type} className="border border-slate-200 rounded-lg overflow-hidden">
                            <div className={`px-3 py-2 text-[10px] font-black uppercase tracking-widest ${org.bg} ${org.color} border-b border-slate-100`}>
                                {org.label}
                            </div>
                            <div className="p-3 grid grid-cols-1 gap-2">
                                {/* Fila Musical */}
                                <div className="flex items-center justify-between group">
                                    <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                                        <IconMusic size={14} className="text-slate-400" /> Musical
                                    </div>
                                    <div className="flex gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => handleSubscribe("GOOGLE", org.type, "musical", true)} title="Google" className="p-1 hover:text-blue-600"><IconCalendar size={14}/></button>
                                        <button onClick={() => handleSubscribe("IOS", org.type, "musical", true)} title="Apple/Outlook" className="p-1 hover:text-slate-900"><IconDownload size={14}/></button>
                                        <button onClick={() => handleSubscribe("COPY", org.type, "musical", true)} title="Copiar" className="p-1 hover:text-indigo-600"><IconCopy size={14}/></button>
                                    </div>
                                </div>
                                {/* Fila Logística */}
                                <div className="flex items-center justify-between group border-t border-slate-50 pt-2">
                                    <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                                        <IconSettingsWheel size={14} className="text-slate-400" /> Logística
                                    </div>
                                    <div className="flex gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => handleSubscribe("GOOGLE", org.type, "logistics", true)} title="Google" className="p-1 hover:text-blue-600"><IconCalendar size={14}/></button>
                                        <button onClick={() => handleSubscribe("IOS", org.type, "logistics", true)} title="Apple/Outlook" className="p-1 hover:text-slate-900"><IconDownload size={14}/></button>
                                        <button onClick={() => handleSubscribe("COPY", org.type, "logistics", true)} title="Copiar" className="p-1 hover:text-indigo-600"><IconCopy size={14}/></button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

        </div>
      </div>

      {/* Estilos inline para botones repetitivos (puedes moverlos a CSS) */}
      <style>{`
        .btn-calendar-google { @apply flex items-center justify-center gap-2 p-3 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-all font-bold text-xs shadow-sm hover:shadow; }
        .btn-calendar-ios { @apply flex items-center justify-center gap-2 p-3 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300 transition-all font-bold text-xs shadow-sm hover:shadow; }
        .btn-calendar-copy { @apply text-[10px] text-slate-400 hover:text-indigo-600 flex items-center justify-center gap-1 mx-auto transition-colors group mt-2; }
      `}</style>
    </div>
  );
};
// --- APP PROTEGIDA ---
const ProtectedApp = () => {
  const { user, logout } = useAuth();
  // USAR HOOKS DE ROUTER
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [calendarModalOpen, setCalendarModalOpen] = useState(false);
  const [globalCommentsOpen, setGlobalCommentsOpen] = useState(false);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
  const isSidebarExpanded = !sidebarCollapsed || isSidebarHovered;

  const [isEnsembleCoordinator, setIsEnsembleCoordinator] = useState(false);
  const [catalogoInstrumentos, setCatalogoInstrumentos] = useState([]);
  const { toggleVisibility, showTriggers } = useManual();
  // --- NUEVO ESTADO DE CONTADORES ---
  const [commentCounts, setCommentCounts] = useState({
    total: 0,
    mentioned: 0,
  });

  // --- ESCALADO DE UI ---
  const [uiScale, setUiScale] = useState(() => {
    const saved = localStorage.getItem("app_ui_scale");
    return saved ? parseInt(saved, 10) : 100;
  });

  useEffect(() => {
    document.documentElement.style.fontSize = `${uiScale}%`;
    localStorage.setItem("app_ui_scale", uiScale);
  }, [uiScale]);

  const userRole = user?.rol_sistema || "";
  const isManagement = ["admin", "editor", "coord_general"].includes(userRole);
  const isDirector = userRole === "director";
  const isPersonal = [
    "musico",
    "archivista",
    "personal",
    "consulta_personal",
  ].includes(userRole);
  const isGuestRole =
    userRole === "invitado" || userRole === "consulta_personal";

  // Mapeo inverso de Tab a Modo (para inicialización)
  const tabToMode = {
    dashboard: "DASHBOARD",
    giras: "GIRAS",
    agenda: "FULL_AGENDA",
    repertorio: "REPERTOIRE",
    ensambles: "ENSAMBLES",
    musicos: "MUSICIANS",
    usuarios: "USERS",
    datos: "DATA",
    locaciones: "LOCATIONS",
    coordinacion: "COORDINACION",
    news_manager: "NEWS_MANAGER",
    avisos: "COMMENTS",
    comidas: "MY_MEALS",
    feedback: "FEEDBACK_ADMIN", // <--- NUEVO
    manual: "MANUAL_INDEX", // <--- NUEVO
    manual_admin: "MANUAL_ADMIN", // <--- NUEVO
  };

  // Mapeo de Modo a Tab (para actualización)
  const modeToTab = {
    DASHBOARD: "dashboard",
    GIRAS: "giras",
    FULL_AGENDA: "agenda",
    REPERTOIRE: "repertorio",
    ENSAMBLES: "ensambles",
    MUSICIANS: "musicos",
    USERS: "usuarios",
    DATA: "datos",
    LOCATIONS: "locaciones",
    COORDINACION: "coordinacion",
    COMMENTS: "avisos",
    MY_MEALS: "comidas",
    NEWS_MANAGER: "news_manager",
    FEEDBACK_ADMIN: "feedback", // <--- NUEVO
    MANUAL_INDEX: "manual", // <--- NUEVO
    MANUAL_ADMIN: "manual_admin", // <--- NUEVO
  };

  // ESTADO DERIVADO DE URL (Single Source of Truth)
  const currentTab = searchParams.get("tab");
  const defaultMode = isPersonal ? "FULL_AGENDA" : "GIRAS";
  const [mode, setMode] = useState(tabToMode[currentTab] || defaultMode);

  const [activeGiraId, setActiveGiraId] = useState(searchParams.get("giraId"));
  const [initialGiraView, setInitialGiraView] = useState(
    searchParams.get("view")
  );
  const [initialGiraSubTab, setInitialGiraSubTab] = useState(
    searchParams.get("subTab")
  );

  // --- EFECTO PARA SINCRONIZAR URL -> ESTADO LOCAL ---
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    const giraIdParam = searchParams.get("giraId");
    const viewParam = searchParams.get("view");
    const subTabParam = searchParams.get("subTab");

    const newMode = tabToMode[tabParam] || defaultMode;

    // Solo actualizamos si hay cambios reales para evitar re-renders
    if (newMode !== mode) setMode(newMode);

    if (newMode === "GIRAS") {
      setActiveGiraId(giraIdParam);
      setInitialGiraView(viewParam || null);
      setInitialGiraSubTab(subTabParam || null);
    } else {
      setActiveGiraId(null);
    }
  }, [searchParams, defaultMode]); // Dependencia clave: searchParams

  // --- LÓGICA DE ACTUALIZACIÓN DE VISTA (Estado -> URL) ---
  const updateView = (
    newMode,
    giraId = null,
    viewParam = null,
    subTabParam = null
  ) => {
    const newParams = new URLSearchParams(searchParams);

    // 1. Establecer el Tab Principal
    const targetTab = modeToTab[newMode];
    if (targetTab) {
      newParams.set("tab", targetTab);
    } else {
      newParams.delete("tab");
    }

    // 2. Manejo de Parámetros de Gira
    if (newMode === "GIRAS" && giraId) {
      newParams.set("giraId", giraId);
      if (viewParam) newParams.set("view", viewParam);
      else newParams.delete("view");

      if (subTabParam) newParams.set("subTab", subTabParam);
      else newParams.delete("subTab");
    } else {
      // Limpiar parámetros específicos de gira si cambiamos de módulo
      newParams.delete("giraId");
      newParams.delete("view");
      newParams.delete("subTab");
    }

    // 3. Actualizar URL (React Router se encargará del resto)
    setSearchParams(newParams);
    setMobileMenuOpen(false);
  };

  const handleGlobalNavigation = (targetGiraId, targetView) => {
    updateView("GIRAS", targetGiraId, targetView);
    setGlobalCommentsOpen(false);
  };

  // --- LÓGICA DE CONTADORES (Mantenida) ---
  useEffect(() => {
    if (!user || isGuestRole) return;

    const fetchCommentCounts = async () => {
      try {
        const { data: comments, error } = await supabase
          .from("sistema_comentarios")
          .select("created_at, id_autor, etiquetados, entidad_tipo, entidad_id")
          .eq("resuelto", false)
          .eq("deleted", false);

        if (error) throw error;

        const { data: readings } = await supabase
          .from("comentarios_lecturas")
          .select("entidad_tipo, entidad_id, last_read_at")
          .eq("user_id", user.id);

        const readMap = {};
        readings?.forEach((r) => {
          readMap[`${r.entidad_tipo}_${r.entidad_id}`] = new Date(
            r.last_read_at
          );
        });

        const uniqueUnreadThreads = new Set();
        const uniqueMentionedThreads = new Set();

        comments.forEach((c) => {
          if (c.id_autor === user.id) return;
          const key = `${c.entidad_tipo}_${c.entidad_id}`;
          const lastRead = readMap[key] || new Date(0);
          const commentDate = new Date(c.created_at);

          if (commentDate > lastRead) {
            uniqueUnreadThreads.add(key);
            if (c.etiquetados && c.etiquetados.includes(user.id)) {
              uniqueMentionedThreads.add(key);
            }
          }
        });

        setCommentCounts({
          total: uniqueUnreadThreads.size,
          mentioned: uniqueMentionedThreads.size,
        });
      } catch (err) {
        console.error("Error fetching comment counts:", err);
      }
    };

    fetchCommentCounts();
    const channel = supabase
      .channel("global-badge")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sistema_comentarios" },
        fetchCommentCounts
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [user, isGuestRole]);

  // --- PERMISOS ---
  useEffect(() => {
    const checkPermissions = async () => {
      if (!user) return;
      if (userRole !== "invitado") {
        const { data } = await supabase
          .from("instrumentos")
          .select("*")
          .order("id");
        if (data) setCatalogoInstrumentos(data);
      }
      if (["admin", "editor", "produccion_general"].includes(userRole)) {
        setIsEnsembleCoordinator(true);
      } else {
        const { count, error } = await supabase
          .from("ensambles_coordinadores")
          .select("id", { count: "exact", head: true })
          .eq("id_integrante", user.id);
        if (!error && count > 0) setIsEnsembleCoordinator(true);
      }
    };
    checkPermissions();
  }, [user, userRole]);

  // Redirección forzada para roles limitados
  useEffect(() => {
    if (isPersonal && !isEnsembleCoordinator) {
      const allowedModes = [
        "FULL_AGENDA",
        "GIRAS",
        "AGENDA",
        "MY_MEALS",
        "COMMENTS",
        "MY_PARTS",
      ];
      if (!allowedModes.includes(mode)) {
        // Usar updateView en lugar de setMode directo para mantener consistencia URL
        updateView("FULL_AGENDA");
      }
    }
  }, [mode, isPersonal, isEnsembleCoordinator]);

  const allMenuItems = [
    {
      id: "DASHBOARD",
      label: "Dashboard",
      icon: <IconSpiralNotebook size={20} />,
      show: isManagement || isDirector,
    },
    {
      id: "FULL_AGENDA",
      label: "Agenda General",
      icon: <IconCalendar size={20} />,
      show: userRole !== "invitado",
    },
    { id: "GIRAS", label: "Giras", icon: <IconMap size={20} />, show: true },
    {
      id: "ENSAMBLES",
      label: "Ensambles",
      icon: <IconMusic size={20} />,
      show: isManagement,
    },
    {
      id: "COORDINACION",
      label: "Coordinación",
      icon: <IconList size={20} />,
      show: isEnsembleCoordinator,
    },
    {
      id: "REPERTOIRE",
      label: "Repertorio",
      icon: <IconFileText size={20} />,
      show:
        userRole !== "invitado" && (!isPersonal || userRole === "archivista"),
    },
    {
      id: "MUSICIANS",
      label: "Músicos",
      icon: <IconUsers size={20} />,
      show: isManagement || isDirector,
    },
    {
      id: "DATA",
      label: "Datos",
      icon: <IconDatabase size={20} />,
      show: isManagement,
    },
    {
      id: "NEWS_MANAGER",
      label: "Comunicación",
      icon: <IconBell size={20} />,
      show: isManagement,
    },
    {
      id: "MANUAL_INDEX",
      label: "Manual de Usuario",
      icon: <IconBookOpen size={20} />,
      show: userRole !== "invitado", // Visible para todos los usuarios reales
    },
    {
      id: "MANUAL_ADMIN",
      label: "Editor Manual",
      icon: <IconEdit size={20} />,
      show: isManagement, // Solo admins/editores pueden editar el manual
    },
    {
      id: "USERS",
      label: "Usuarios",
      icon: <IconSettings size={20} />,
      show: userRole === "admin",
    },
    {
      id: "FEEDBACK_ADMIN",
      label: "Feedback",
      icon: <IconBulb size={20} />,
      show: userRole === "admin", // <--- VISIBLE SOLO PARA ADMIN
    },
  ];
  const visibleMenuItems = allMenuItems.filter((i) => i.show);

  // --- RENDERIZADO CONDICIONAL ---
  const renderContent = () => {
    // Clave para forzar re-render limpio cuando cambiamos de módulo
    const commonProps = { supabase };

    switch (mode) {
      case "DASHBOARD":
        return <DashboardGeneral {...commonProps} onViewChange={updateView} />;
      case "GIRAS":
        return (
          <GirasView
            // Usamos key para forzar remontaje si cambia la gira activa radicalmente
            key={activeGiraId ? `gira-${activeGiraId}` : "giras-list"}
            initialGiraId={activeGiraId}
            initialTab={initialGiraView}
            initialSubTab={initialGiraSubTab}
            updateView={updateView}
            supabase={supabase}
          />
        );
      case "NEWS_MANAGER":
        return <NewsManager {...commonProps} />;
      case "FULL_AGENDA":
        return <AgendaGeneral onViewChange={updateView} {...commonProps} />;
      case "ENSAMBLES":
        return <EnsemblesView {...commonProps} />;
      case "COORDINACION":
        return <EnsembleCoordinatorView {...commonProps} />;
      case "MUSICIANS":
        return (
          <MusiciansView
            {...commonProps}
            catalogoInstrumentos={catalogoInstrumentos}
          />
        );
      case "LOCATIONS":
        return <LocationsView {...commonProps} />;
      case "REPERTOIRE":
        return (
          <RepertoireView
            {...commonProps}
            catalogoInstrumentos={catalogoInstrumentos}
          />
        );
      case "DATA":
        return <DataView {...commonProps} />;
      case "USERS":
        return <UsersManager {...commonProps} />;
      case "COMMENTS":
        return <GlobalCommentsViewer {...commonProps} />;
      case "MY_PARTS":
        return <MyPartsViewer {...commonProps} />;
      case "MY_MEALS":
        return <MealsAttendancePersonal {...commonProps} />;
      case "FEEDBACK_ADMIN":
        return <FeedbackAdmin {...commonProps} />; // <--- RENDERIZADO DE VISTA ADMIN
      case "MANUAL_INDEX":
        return <ManualIndex {...commonProps} />;
      case "MANUAL_ADMIN":
        return <ManualAdmin {...commonProps} />;
      default:
        return <div className="p-10 text-center">Vista no encontrada</div>;
    }
  };

  const mobileNavItems = [
    ...(userRole !== "invitado"
      ? [
          {
            id: "FULL_AGENDA",
            icon: <IconCalendar size={24} />,
            label: "Agenda",
          },
        ]
      : []),
    { id: "GIRAS", icon: <IconMap size={24} />, label: "Giras" },
    { id: "COMMENTS", icon: <IconMessageCircle size={24} />, label: "Avisos" },
    {
      id: "MENU",
      icon: <IconMenu size={24} />,
      label: "Menú",
      action: () => setMobileMenuOpen(true),
    },
  ];
  const getCurrentManualSection = () => {
    // Caso A: Estamos dentro de una Gira específica
    if (mode === "GIRAS" && activeGiraId) {
      const view = searchParams.get("view") || "resumen"; // Vista (Logística, Pasajes, etc.)
      const subTab = searchParams.get("subTab"); // Sub-pestaña si existe

      // Retorna algo como: 'gira_logistica', 'gira_logistica_aereos', 'gira_resumen'
      if (subTab) return `gira_${view}_${subTab}`;
      return `gira_${view}`;
    }

    // Caso B: Estamos en un módulo principal
    // Retorna: 'dashboard_general', 'giras_listado', 'musicos_general', etc.
    if (mode === "GIRAS" && !activeGiraId) return "giras_listado";

    // Mapeo directo del modo a una clave
    const modeMap = {
      DASHBOARD: "dashboard_general",
      FULL_AGENDA: "agenda_general",
      ENSAMBLES: "ensambles_general",
      MUSICIANS: "musicos_general",
      USERS: "usuarios_admin",
      // Agrega los que faltan...
    };

    return modeMap[mode] || "app_intro_general";
  };

  const activeManualSection = getCurrentManualSection();
  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans text-slate-900">
      {/* SIDEBAR */}
      <aside
        className={`hidden md:flex bg-slate-900 text-slate-300 flex-col shadow-xl z-20 transition-all duration-300 ease-in-out ${
          isSidebarExpanded ? "w-64" : "w-20"
        }`}
        onMouseEnter={() => setIsSidebarHovered(true)}
        onMouseLeave={() => setIsSidebarHovered(false)}
      >
        <div
          className={`p-4 border-b border-slate-800 flex items-center ${
            !isSidebarExpanded ? "justify-center" : "justify-between"
          } gap-3`}
        >
          {isSidebarExpanded && (
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-indigo-500/30 shrink-0">
                O
              </div>
              <div className="whitespace-nowrap">
                <h1 className="font-bold text-white text-lg tracking-tight">
                  OF<span className="text-indigo-400">RN</span>
                </h1>
              </div>
            </div>
          )}
          {!isSidebarExpanded && (
            <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-indigo-500/30 shrink-0">
              O
            </div>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="text-slate-500 hover:text-white transition-colors p-1 rounded hover:bg-slate-800"
          >
            {sidebarCollapsed ? (
              <IconChevronRight size={20} />
            ) : (
              <IconChevronLeft size={20} />
            )}
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-6 px-3 space-y-1">
          {visibleMenuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => updateView(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group relative ${
                mode === item.id
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-900/50 font-medium"
                  : "hover:bg-slate-800 hover:text-white"
              } ${!isSidebarExpanded ? "justify-center" : ""}`}
              title={!isSidebarExpanded ? item.label : ""}
            >
              <span
                className={`transition-transform duration-200 shrink-0 ${
                  mode === item.id ? "scale-110" : "group-hover:scale-110"
                }`}
              >
                {item.icon}
              </span>
              {isSidebarExpanded && (
                <span className="whitespace-nowrap overflow-hidden text-ellipsis">
                  {item.label}
                </span>
              )}
              {mode === item.id && isSidebarExpanded && (
                <div className="ml-auto w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
              )}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-800">
          <button
            onClick={logout}
            className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-slate-400 hover:bg-rose-900/30 hover:text-rose-400 transition-colors ${
              !isSidebarExpanded ? "justify-center" : ""
            }`}
            title="Cerrar Sesión"
          >
            <IconLogOut size={20} />{" "}
            {isSidebarExpanded && <span>Cerrar Sesión</span>}
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col h-full relative overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-8 shadow-sm z-100 shrink-0">
          
          {/* ZONA IZQUIERDA: HAMBURGUESA + TÍTULO */}
          <div className="flex items-center gap-2">
            
            {/* --- NUEVO: BOTÓN HAMBURGUESA (Solo Móvil) --- */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 -ml-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-full transition-colors mr-1"
              title="Abrir Menú"
            >
              <IconMenu size={24} />
            </button>
            {/* --------------------------------------------- */}

            <div className="md:hidden w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold mr-2">
              O
            </div>
            
            {/* Título de la sección actual (Visible en escritorio, opcional en móvil) */}
            <h2 className="text-xl font-bold text-slate-800 hidden sm:block">
              {allMenuItems.find((m) => m.id === mode)?.label || "Panel"}
            </h2>
          </div>
          <div className="flex items-center gap-4">
            {/* --- ZONA DE CONTROL DE MANUAL (CÁPSULA UNIFICADA) --- */}
            <div className="flex items-center ml-4 bg-white border border-slate-200 rounded-full shadow-sm p-1 transition-all duration-200 hover:shadow-md hover:border-slate-300">
              {/* 1. Toggle de Visibilidad (Interruptor) */}
              <button
                onClick={toggleVisibility}
                className={`p-1.5 rounded-full transition-all duration-200 flex items-center justify-center ${
                  !showTriggers
                    ? "text-slate-400 hover:text-slate-600 hover:bg-slate-100" // Estado Apagado
                    : "text-sky-600 bg-sky-50 hover:bg-sky-100 ring-1 ring-sky-100" // Estado Prendido (Activo)
                }`}
                title={
                  showTriggers
                    ? "Ocultar ayudas visuales"
                    : "Mostrar ayudas visuales"
                }
              >
                {showTriggers ? (
                  <IconEye size={18} />
                ) : (
                  <IconEyeOff size={18} />
                )}
              </button>

              {/* 2. El Trigger Contextual (Solo si está activo) */}
              {showTriggers && (
                <>
                  {/* Separador Vertical (El "Pegamento" visual) */}
                  <div className="w-px h-5 bg-slate-200 mx-1"></div>

                  {/* El Librito */}
                  <ManualTrigger
                    section={activeManualSection}
                    size="md"
                    className="border-0 bg-sky hover:bg-sky-100 text-sky-500 hover:text-sky-600 shadow-none !p-1.5"
                  />
                </>
              )}
            </div>
            <button
              onClick={() => setCalendarModalOpen(true)}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-full transition-colors border border-indigo-200 shadow-sm group"
              title="Sincronizar con Google Calendar"
            >
              <IconCalendar
                size={16}
                className="group-hover:scale-110 transition-transform"
              />{" "}
              <span className="text-xs font-bold">Sincronizar</span>
            </button>
            <div className="hidden sm:block">
              <NewsModal supabase={supabase} />
            </div>

            {/* --- BOTÓN DE ALERTAS MEJORADO --- */}
            {isManagement && (
              <button
                onClick={() => setGlobalCommentsOpen(true)}
                className="hidden sm:flex p-2 rounded-full text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors relative group"
                title="Gestor de Pendientes"
              >
                <IconAlertCircle
                  size={22}
                  className="group-hover:scale-110 transition-transform"
                />

                {/* Badge ROJO: Total Pendientes */}
                {commentCounts.total > 0 && (
                  <span className="absolute top-0 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-500 text-[9px] font-bold text-white ring-2 ring-white">
                    {commentCounts.total > 9 ? "9+" : commentCounts.total}
                  </span>
                )}

                {/* Badge VIOLETA: Menciones (abajo) */}
                {commentCounts.mentioned > 0 && (
                  <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[9px] font-bold text-white ring-2 ring-white animate-pulse">
                    {`@${
                      commentCounts.mentioned > 9
                        ? "9+"
                        : commentCounts.mentioned
                    }`}
                  </span>
                )}
              </button>
            )}

            <div className="h-8 w-px bg-slate-200 hidden sm:block"></div>
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-end">
                <span className="text-sm font-bold text-slate-700 leading-tight">
                  {user.nombre} {user.apellido}
                </span>
                <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider bg-indigo-50 px-1.5 rounded">
                  {userRole.replace("_", " ")}
                </span>
              </div>
              <div className="w-10 h-10 bg-slate-100 rounded-full border-2 border-white shadow-sm flex items-center justify-center text-slate-400 overflow-hidden">
                <svg
                  className="w-6 h-6"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-hidden relative bg-slate-50">
          {renderContent()}
        </main>

        <div className="md:hidden h-16 bg-white border-t border-slate-200 flex items-center justify-around px-2 z-30 shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          {mobileNavItems.map((item) => (
            <button
              key={item.id}
              onClick={item.action || (() => updateView(item.id))}
              className={`flex flex-col items-center justify-center w-full h-full gap-1 ${
                mode === item.id ? "text-indigo-600" : "text-slate-400"
              }`}
            >
              {item.icon}
              <span className="text-[9px] font-bold">{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {globalCommentsOpen && (
        <GlobalCommentsViewer
          supabase={supabase}
          giraId={null}
          onClose={() => {
            setGlobalCommentsOpen(false);
            // Forzamos refresh al cerrar para actualizar badges si resolvimos algo
            supabase
              .from("sistema_comentarios")
              .select("id")
              .limit(1)
              .then(() => {});
          }}
          onNavigate={handleGlobalNavigation}
          onCountsChange={setCommentCounts} // Actualización en tiempo real desde el modal
        />
      )}

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Fondo oscuro con blur */}
          <div 
            className="absolute inset-0 bg-slate-900/95 backdrop-blur-sm animate-in fade-in"
            onClick={() => setMobileMenuOpen(false)}
          />
          
          {/* Panel Lateral */}
          <div className="relative w-72 bg-slate-900 h-full shadow-2xl flex flex-col animate-in slide-in-from-left duration-300">
            <div className="p-6 flex justify-between items-center border-b border-slate-800">
              <h2 className="text-white text-2xl font-bold">Menú</h2>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 bg-white/10 rounded-full text-white hover:bg-white/20 transition-colors"
              >
                <IconX size={24} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {visibleMenuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => updateView(item.id)}
                  className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl text-lg font-medium transition-all ${
                    mode === item.id
                      ? "bg-indigo-600 text-white shadow-lg"
                      : "text-slate-300 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  {item.icon}
                  {item.label}
                </button>
              ))}
              
              <div className="h-px bg-slate-800 my-4"></div>

              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setCalendarModalOpen(true);
                }}
                className="w-full flex items-center gap-4 px-4 py-3 rounded-xl text-lg font-medium text-emerald-400 hover:bg-emerald-500/10 transition-colors"
              >
                <IconCalendar size={24} /> Sincronizar Calendario
              </button>
              {isManagement && (
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setGlobalCommentsOpen(true);
                  }}
                  className="w-full flex items-center gap-4 px-4 py-3 rounded-xl text-lg font-medium text-amber-400 hover:bg-amber-500/10 transition-colors"
                >
                  <IconAlertCircle size={24} /> Pendientes Globales
                </button>
              )}
            </div>

            {/* --- CONTROL DE ESCALA DE UI (SLIDER) --- */}
            <div className="p-4 border-t border-slate-800 bg-slate-900/50">
                <div className="flex justify-between text-xs font-bold text-slate-400 uppercase mb-3">
                    <span>Tamaño de Texto / Interfaz</span>
                    <span className="text-indigo-400">{uiScale}%</span>
                </div>
                <input 
                    type="range" 
                    min="80" 
                    max="115" 
                    step="5"
                    value={uiScale} 
                    onChange={(e) => setUiScale(Number(e.target.value))}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
                <div className="flex justify-between text-[10px] text-slate-500 mt-2 font-medium">
                    <span>Compacto</span>
                    <span>Normal</span>
                    <span>Grande</span>
                </div>
            </div>

            <div className="p-4 border-t border-slate-800">
              <button
                onClick={logout}
                className="w-full py-3 bg-rose-600/90 hover:bg-rose-600 rounded-xl text-white font-bold flex items-center justify-center gap-2 transition-colors"
              >
                <IconLogOut size={20} /> Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      )}

      <CalendarSelectionModal
        isOpen={calendarModalOpen}
        onClose={() => setCalendarModalOpen(false)}
        userId={user?.id}
        isAdmin={isManagement}
      />

      {/* WIDGET DE FEEDBACK */}
      <FeedbackWidget supabase={supabase} userEmail={user?.email} />
    </div>
  );
};
const AppContent = () => {
  const { user, loading } = useAuth();
  if (loading) return <div>Cargando...</div>;
  if (!user) return <LoginView />;
  return <ProtectedApp />;
};
const ProtectedManualAdmin = ({ supabase }) => {
  const { user, loading } = useAuth();
  if (loading)
    return (
      <div className="flex h-screen items-center justify-center">
        Cargando...
      </div>
    );
  if (!user) return <LoginView />;
  // Opcional: Verificar rol aquí si quieres doble seguridad
  // if (user.rol_sistema !== 'admin') return <div>Acceso denegado</div>;

  return <ManualAdmin supabase={supabase} />;
};
export default function App() {
  return (
    <AuthProvider>
      <ManualProvider>
        {" "}
        {/* <--- AQUÍ ENVUELVES TODO EL SISTEMA */}
        <Routes>
          <Route path="/share/:token" element={<PublicLinkHandler />} />
          <Route path="/*" element={<AppContent />} />
        </Routes>
      </ManualProvider>
    </AuthProvider>
  );
}