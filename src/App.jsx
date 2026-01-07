import React, { useState, useEffect } from "react";
import { Routes, Route } from "react-router-dom";
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
import LogisticsDashboard from "./views/Giras/LogisticsDashboard";
import GlobalCommentsViewer from "./components/comments/GlobalCommentsViewer";
import EnsembleCoordinatorView from "./views/Ensembles/EnsembleCoordinatorView";
import MyPartsViewer from "./views/Giras/MyPartsViewer";
import MealsAttendancePersonal from "./views/Giras/MealsAttendancePersonal";
import PublicLinkHandler from "./views/Public/PublicLinkHandler";
import DashboardGeneral from "./views/Dashboard/DashboardGeneral";
import NewsModal from "./components/news/NewsModal";
import NewsManager from "./components/news/NewsManager";
import {
  IconLayoutDashboard,
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
} from "./components/ui/Icons";

// --- MODAL CALENDARIO (ACTUALIZADO) ---
const CalendarSelectionModal = ({ isOpen, onClose, userId }) => {
  if (!isOpen || !userId) return null;

  const BASE_URL =
    "webcal://muxrbuivopnawnxlcjxq.supabase.co/functions/v1/calendar-export";

  const getLinks = (mode) => {
    let url = `${BASE_URL}?uid=${userId}`;
    if (mode === "musical") url += "&mode=musical";
    else if (mode === "otros") url += "&mode=otros";

    const httpsLink = url;
    const webcalLink = url.replace(/^https:/, "webcal:");
    const googleMagicLink = `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(
      webcalLink
    )}`;

    return { httpsLink, webcalLink, googleMagicLink };
  };

  const handleSubscribe = (platform, mode) => {
    const { webcalLink, googleMagicLink, httpsLink } = getLinks(mode);

    if (platform === "GOOGLE") {
      window.open(googleMagicLink, "_blank");
    } else if (platform === "IOS") {
      window.location.href = webcalLink;
    } else if (platform === "COPY") {
      navigator.clipboard.writeText(httpsLink).then(() => {
        alert(
          "🔗 Enlace copiado. Pégalo manualmente en la sección 'Agregar por URL' de tu calendario."
        );
      });
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <IconCalendar size={20} className="text-indigo-600" /> Sincronizar
            Calendario
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-slate-200 transition-colors"
          >
            <IconX size={20} />
          </button>
        </div>
        <div className="p-6 space-y-8">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-indigo-700 font-bold text-sm uppercase tracking-wider">
                <IconMusic size={18} /> Solo Musical
              </div>
              <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-bold">
                Ensayos y Conciertos
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-2">
              Ideal para no saturar tu agenda personal. Solo eventos artísticos.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleSubscribe("GOOGLE", "musical")}
                className="flex items-center justify-center gap-2 p-3 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-all font-bold text-xs shadow-sm hover:shadow"
              >
                Google Calendar
              </button>
              <button
                onClick={() => handleSubscribe("IOS", "musical")}
                className="flex items-center justify-center gap-2 p-3 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300 transition-all font-bold text-xs shadow-sm hover:shadow"
              >
                iPhone / Mac
              </button>
            </div>
            <div className="text-center">
              <button
                onClick={() => handleSubscribe("COPY", "musical")}
                className="text-[10px] text-slate-400 hover:text-indigo-600 flex items-center justify-center gap-1 mx-auto transition-colors group"
              >
                <IconCopy size={10} className="group-hover:scale-110" /> Copiar
                enlace manual (Musical)
              </button>
            </div>
          </div>
          <div className="h-px bg-slate-100"></div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-700 font-bold text-sm uppercase tracking-wider">
                <IconLayoutDashboard size={18} /> Otros Eventos
              </div>
              <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold">
                Logística y Giras
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-2">
              Incluye hitos de gira, logística de transporte, comidas y
              trámites.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleSubscribe("GOOGLE", "otros")}
                className="flex items-center justify-center gap-2 p-3 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-all font-bold text-xs shadow-sm hover:shadow"
              >
                Google Calendar
              </button>
              <button
                onClick={() => handleSubscribe("IOS", "otros")}
                className="flex items-center justify-center gap-2 p-3 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300 transition-all font-bold text-xs shadow-sm hover:shadow"
              >
                iPhone / Mac
              </button>
            </div>
            <div className="text-center">
              <button
                onClick={() => handleSubscribe("COPY", "otros")}
                className="text-[10px] text-slate-400 hover:text-slate-600 flex items-center justify-center gap-1 mx-auto transition-colors group"
              >
                <IconCopy size={10} className="group-hover:scale-110" /> Copiar
                enlace manual (Otros)
              </button>
            </div>
          </div>
          <div className="text-center pt-2 border-t border-slate-50 mt-4">
            <button
              onClick={() => handleSubscribe("COPY", "full")}
              className="text-xs text-slate-300 hover:text-indigo-600 flex items-center justify-center gap-1 mx-auto transition-colors"
            >
              <IconCopy size={12} /> Copiar enlace de Agenda Completa (Todo
              unificado)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- APP PROTEGIDA ---
const ProtectedApp = () => {
  const { user, logout } = useAuth();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [calendarModalOpen, setCalendarModalOpen] = useState(false);
  const [globalCommentsOpen, setGlobalCommentsOpen] = useState(false);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
  const isSidebarExpanded = !sidebarCollapsed || isSidebarHovered;

  const [isEnsembleCoordinator, setIsEnsembleCoordinator] = useState(false);
  const [catalogoInstrumentos, setCatalogoInstrumentos] = useState([]);

  // --- NUEVO ESTADO DE CONTADORES ---
  const [commentCounts, setCommentCounts] = useState({
    total: 0,
    mentioned: 0,
  });

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

  const [mode, setMode] = useState(isPersonal ? "FULL_AGENDA" : "GIRAS");
  const [activeGiraId, setActiveGiraId] = useState(null);
  const [initialGiraView, setInitialGiraView] = useState(null);
  const [initialGiraSubTab, setInitialGiraSubTab] = useState(null);

  // --- LÓGICA DE CONTADORES CORREGIDA ---
  useEffect(() => {
    if (!user || isGuestRole) return;

    const fetchCommentCounts = async () => {
      try {
        // 1. Obtener comentarios pendientes (no resueltos ni borrados)
        // Necesitamos 'created_at' y 'id_autor' para comparar fechas y propiedad
        const { data: comments, error } = await supabase
          .from("sistema_comentarios")
          .select("created_at, id_autor, etiquetados, entidad_tipo, entidad_id")
          .eq("resuelto", false)
          .eq("deleted", false);

        if (error) throw error;

        // 2. Obtener registro de lecturas del usuario actual
        const { data: readings } = await supabase
          .from("comentarios_lecturas")
          .select("entidad_tipo, entidad_id, last_read_at")
          .eq("user_id", user.id);

        // Mapa rápido: "TIPO_ID" -> Fecha de última lectura
        const readMap = {};
        readings?.forEach((r) => {
          readMap[`${r.entidad_tipo}_${r.entidad_id}`] = new Date(
            r.last_read_at
          );
        });

        // 3. Calcular hilos realmente NO LEÍDOS
        const uniqueUnreadThreads = new Set();
        const uniqueMentionedThreads = new Set();

        comments.forEach((c) => {
          // Si el comentario es mío, no cuenta como no leído
          if (c.id_autor === user.id) return;

          const key = `${c.entidad_tipo}_${c.entidad_id}`;
          const lastRead = readMap[key] || new Date(0); // Si no hay lectura previa, asumimos fecha 0 (todo es nuevo)
          const commentDate = new Date(c.created_at);

          // Solo sumamos si el mensaje es POSTERIOR a mi última lectura
          if (commentDate > lastRead) {
            uniqueUnreadThreads.add(key);

            // Verificamos si en este mensaje no leído estoy etiquetado
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

    // Suscripción para actualizaciones en tiempo real
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
  // Resto de efectos y lógica (sin cambios)
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
      if (!allowedModes.includes(mode)) setMode("FULL_AGENDA");
    }
  }, [mode, isPersonal, isEnsembleCoordinator]);

  const syncStateWithUrl = () => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get("tab");
    const giraIdParam = params.get("giraId");
    const viewParam = params.get("view");
    const subTabParam = params.get("subTab");

    if (tabParam) {
      const modeMap = {
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
      };
      const newMode = modeMap[tabParam.toLowerCase()];
      if (newMode) {
        setMode(newMode);
        if (newMode === "GIRAS") {
          setActiveGiraId(giraIdParam);
          setInitialGiraView(viewParam || null);
          setInitialGiraSubTab(subTabParam || null);
        }
      }
    }
  };

  useEffect(() => {
    syncStateWithUrl();
    window.addEventListener("popstate", syncStateWithUrl);
    return () => window.removeEventListener("popstate", syncStateWithUrl);
  }, []);

  useEffect(() => {
    if (!user) return;
    const params = new URLSearchParams(window.location.search);
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
    };

    if (modeToTab[mode]) params.set("tab", modeToTab[mode]);

    if (mode === "GIRAS" && activeGiraId) {
      params.set("giraId", activeGiraId);
      if (initialGiraView) params.set("view", initialGiraView);
      else params.delete("view");
      if (initialGiraSubTab) params.set("subTab", initialGiraSubTab);
      else params.delete("subTab");
    } else {
      params.delete("giraId");
      params.delete("view");
      params.delete("subTab");
    }

    const newUrl = `${window.location.pathname}?${params.toString()}`;
    if (window.location.search !== `?${params.toString()}`) {
      window.history.pushState(null, "", newUrl);
    }
  }, [mode, activeGiraId, initialGiraView, initialGiraSubTab, user]);

  const updateView = (
    newMode,
    giraId = null,
    viewParam = null,
    subTabParam = null
  ) => {
    if (newMode === "GIRAS" && !giraId) {
      setActiveGiraId(null);
      setInitialGiraView(null);
      setInitialGiraSubTab(null);
    } else if (newMode === "GIRAS") {
      setActiveGiraId(giraId);
    }
    setMode(newMode);
    if (newMode !== "GIRAS") setActiveGiraId(null);
    if (giraId && newMode === "GIRAS") {
      setInitialGiraView(viewParam || null);
      setInitialGiraSubTab(subTabParam || null);
    }
    setMobileMenuOpen(false);
  };

  const handleGlobalNavigation = (targetGiraId, targetView) => {
    updateView("GIRAS", targetGiraId, targetView);
    setGlobalCommentsOpen(false);
  };

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
      id: "USERS",
      label: "Usuarios",
      icon: <IconSettings size={20} />,
      show: userRole === "admin",
    },
  ];
  const visibleMenuItems = allMenuItems.filter((i) => i.show);

  const renderContent = () => {
    switch (mode) {
      case "DASHBOARD":
        return (
          <DashboardGeneral supabase={supabase} onViewChange={updateView} />
        );
      case "GIRAS":
        return (
          <GirasView
            key={activeGiraId ? `gira-${activeGiraId}` : "giras-list-general"}
            initialGiraId={activeGiraId}
            initialTab={initialGiraView}
            initialSubTab={initialGiraSubTab}
            updateView={updateView}
            supabase={supabase}
          />
        );
      case "NEWS_MANAGER":
        return <NewsManager supabase={supabase} />;
      case "FULL_AGENDA":
        return <AgendaGeneral onViewChange={updateView} supabase={supabase} />;
      case "ENSAMBLES":
        return <EnsemblesView supabase={supabase} />;
      case "COORDINACION":
        return <EnsembleCoordinatorView supabase={supabase} />;
      case "MUSICIANS":
        return (
          <MusiciansView
            supabase={supabase}
            catalogoInstrumentos={catalogoInstrumentos}
          />
        );
      case "LOCATIONS":
        return <LocationsView supabase={supabase} />;
      case "REPERTOIRE":
        return (
          <RepertoireView
            supabase={supabase}
            catalogoInstrumentos={catalogoInstrumentos}
          />
        );
      case "DATA":
        return <DataView supabase={supabase} />;
      case "USERS":
        return <UsersManager supabase={supabase} />;
      case "COMMENTS":
        return <GlobalCommentsViewer supabase={supabase} />;
      case "MY_PARTS":
        return <MyPartsViewer supabase={supabase} />;
      case "MY_MEALS":
        return <MealsAttendancePersonal supabase={supabase} />;
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
          <div className="flex items-center gap-2">
            <div className="md:hidden w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold mr-2">
              O
            </div>
            <h2 className="text-xl font-bold text-slate-800 hidden sm:block">
              {allMenuItems.find((m) => m.id === mode)?.label || "Panel"}
            </h2>
          </div>
          <div className="flex items-center gap-4">
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
            {!isGuestRole && (
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
        <div className="fixed inset-0 z-50 bg-slate-900/95 backdrop-blur-sm md:hidden flex flex-col p-6 animate-in fade-in slide-in-from-bottom-10 duration-200">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-white text-2xl font-bold">Menú</h2>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="p-2 bg-white/10 rounded-full text-white"
            >
              <IconX size={24} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto space-y-2">
            {visibleMenuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => updateView(item.id)}
                className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-lg font-medium transition-all ${
                  mode === item.id
                    ? "bg-indigo-600 text-white shadow-lg"
                    : "bg-white/5 text-slate-300"
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                setCalendarModalOpen(true);
              }}
              className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-lg font-medium bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 mt-4"
            >
              <IconCalendar size={24} /> Sincronizar Calendario
            </button>
            {!isGuestRole && (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setGlobalCommentsOpen(true);
                }}
                className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-lg font-medium bg-amber-600/20 text-amber-400 border border-amber-500/30 mt-2"
              >
                <IconAlertCircle size={24} /> Pendientes Globales
              </button>
            )}
          </div>
          <button
            onClick={logout}
            className="mt-6 w-full py-4 bg-rose-600 rounded-xl text-white font-bold flex items-center justify-center gap-2"
          >
            <IconLogOut size={20} /> Cerrar Sesión
          </button>
        </div>
      )}

      <CalendarSelectionModal
        isOpen={calendarModalOpen}
        onClose={() => setCalendarModalOpen(false)}
        userId={user?.id}
      />
    </div>
  );
};
const AppContent = () => {
  const { user, loading } = useAuth();
  if (loading) return <div>Cargando...</div>;
  if (!user) return <LoginView />;
  return <ProtectedApp />;
};

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/share/:token" element={<PublicLinkHandler />} />
        <Route path="/*" element={<AppContent />} />
      </Routes>
    </AuthProvider>
  );
}
