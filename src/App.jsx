import React, { useState, useEffect, useMemo } from "react";
import {
  Routes,
  Route,
  useSearchParams,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { supabase } from "./services/supabase";
import ReloadPrompt from "./components/ui/ReloadPrompt";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
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
import FeedbackAdmin from "./views/Feedback/FeedbackAdmin";
import { ManualProvider } from "./context/ManualContext";
import ManualIndex from "./views/Manual/ManualIndex";
import ManualAdmin from "./views/Manual/ManualAdmin";
import ManualTrigger from "./components/manual/ManualTrigger";
import { useManual } from "./context/ManualContext";
import NotificationsListener from "./components/ui/NotificationsListener";
import { Toaster } from "sonner";
import ThemeController from "./components/ui/ThemeController";
import AIAssistant from "./components/ui/AIAssistant";
import { CommandPaletteProvider } from "./context/CommandPaletteContext";
import CommandBarTrigger from "./components/ui/CommandBarTrigger";
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
  IconMessageSquare,
  IconBell,
  IconCopy,
  IconBulb,
  IconDrive,
  IconBookOpen,
  IconEdit,
  IconAlertTriangle,
  IconArrowRight,
  IconUser,
  IconEye,
  IconEyeOff,
} from "./components/ui/Icons";
import ProfileEditModal from "./components/users/ProfileEditModal";
import SearchableSelect from "./components/ui/SearchableSelect";

// --- HELPER DE NORMALIZACIÓN ---
const normalizeId = (id) => {
  if (id === null || id === undefined) return "";
  return String(id).trim();
};
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // Los datos se consideran "frescos" por 5 minutos
      refetchOnWindowFocus: false, // Evita recargas molestas al cambiar de ventana
    },
  },
});
// --- MODAL CALENDARIO ---
const CalendarSelectionModal = ({ isOpen, onClose, userId, isAdmin }) => {
  if (!isOpen || !userId) return null;

  const USER_BASE_URL =
    "webcal://muxrbuivopnawnxlcjxq.supabase.co/functions/v1/calendar-export";
  const ADMIN_BASE_URL =
    "webcal://muxrbuivopnawnxlcjxq.supabase.co/functions/v1/ics-export-admin";

  const [activeTab, setActiveTab] = useState("PERSONAL");

  const formatLinks = (webcalUrl) => {
    const httpsLink = webcalUrl.replace(/^webcal:/, "https:");
    const googleMagicLink = `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(webcalUrl)}`;
    return { webcalLink: webcalUrl, googleMagicLink, httpsLink };
  };

  const getUserLinks = (mode) => {
    let url = `${USER_BASE_URL}?uid=${userId}`;
    if (mode === "musical") url += "&mode=musical";
    else if (mode === "otros") url += "&mode=otros";
    return formatLinks(url);
  };

  const getAdminLinks = (type, mode) => {
    let url = `${ADMIN_BASE_URL}?type=${encodeURIComponent(type)}&mode=${mode}`;
    return formatLinks(url);
  };

  const handleSubscribe = (
    platform,
    category,
    mode,
    isAdminContext = false,
  ) => {
    let links = isAdminContext
      ? getAdminLinks(category, mode)
      : getUserLinks(category);
    const { webcalLink, googleMagicLink, httpsLink } = links;

    if (platform === "GOOGLE") window.open(googleMagicLink, "_blank");
    else if (platform === "IOS") window.location.href = webcalLink;
    else if (platform === "COPY") {
      navigator.clipboard.writeText(httpsLink).then(() => {
        alert("🔗 Enlace copiado al portapapeles.");
      });
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <IconCalendar size={20} className="text-indigo-600" />
            Sincronizar Calendario
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-slate-200 transition-colors"
          >
            <IconX size={20} />
          </button>
        </div>

        {isAdmin && (
          <div className="flex border-b border-slate-100 shrink-0">
            <button
              onClick={() => setActiveTab("PERSONAL")}
              className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider text-center transition-colors ${activeTab === "PERSONAL" ? "bg-white text-indigo-600 border-b-2 border-indigo-600" : "bg-slate-50 text-slate-400 hover:bg-slate-100"}`}
            >
              Mi Agenda
            </button>
            <button
              onClick={() => setActiveTab("ADMIN")}
              className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider text-center transition-colors ${activeTab === "ADMIN" ? "bg-white text-indigo-600 border-b-2 border-indigo-600" : "bg-slate-50 text-slate-400 hover:bg-slate-100"}`}
            >
              Master (Admin)
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {(!isAdmin || activeTab === "PERSONAL") && (
            <div className="space-y-6">
              <p className="text-xs text-slate-500 bg-indigo-50 border border-indigo-100 p-3 rounded-lg">
                Sincroniza tus <strong>eventos asignados</strong>.
              </p>
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="px-3 py-2 text-[10px] font-black uppercase tracking-widest bg-indigo-50 text-indigo-600 border-b border-slate-100">
                  Mi Agenda
                </div>
                <div className="p-3 grid grid-cols-1 gap-2">
                  {["musical", "otros", "full"].map((cat) => (
                    <div
                      key={cat}
                      className="flex items-center justify-between group py-1"
                    >
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase">
                        {cat === "musical" ? (
                          <IconMusic size={14} />
                        ) : (
                          <IconCalendar size={14} />
                        )}
                        {cat}
                      </div>
                      <div className="flex gap-2 opacity-60 group-hover:opacity-100">
                        <button
                          onClick={() => handleSubscribe("GOOGLE", cat, null)}
                          className="p-1 hover:text-blue-600"
                        >
                          <IconCalendar size={14} />
                        </button>
                        <button
                          onClick={() => handleSubscribe("IOS", cat, null)}
                          className="p-1 hover:text-slate-900"
                        >
                          <IconDownload size={14} />
                        </button>
                        <button
                          onClick={() => handleSubscribe("COPY", cat, null)}
                          className="p-1 hover:text-indigo-600"
                        >
                          <IconCopy size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {isAdmin && activeTab === "ADMIN" && (
            <div className="space-y-6">
              {["Sinfónico", "Ensamble", "Jazz Band"].map((type) => (
                <div
                  key={type}
                  className="border border-slate-200 rounded-lg overflow-hidden"
                >
                  <div className="px-3 py-2 text-[10px] font-black uppercase tracking-widest bg-slate-50 text-slate-600 border-b">
                    {type}
                  </div>
                  <div className="p-3 space-y-2">
                    {["musical", "logistics"].map((mode) => (
                      <div
                        key={mode}
                        className="flex items-center justify-between group"
                      >
                        <span className="text-xs font-bold text-slate-700 capitalize">
                          {mode}
                        </span>
                        <div className="flex gap-2 opacity-60 group-hover:opacity-100">
                          <button
                            onClick={() =>
                              handleSubscribe("GOOGLE", type, mode, true)
                            }
                            className="p-1 hover:text-blue-600"
                          >
                            <IconCalendar size={14} />
                          </button>
                          <button
                            onClick={() =>
                              handleSubscribe("IOS", type, mode, true)
                            }
                            className="p-1 hover:text-slate-900"
                          >
                            <IconDownload size={14} />
                          </button>
                          <button
                            onClick={() =>
                              handleSubscribe("COPY", type, mode, true)
                            }
                            className="p-1 hover:text-indigo-600"
                          >
                            <IconCopy size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// --- APP PROTEGIDA ---
const ProtectedApp = () => {
  const {
    user,
    logout,
    impersonate,
    stopImpersonating,
    isImpersonating,
    isActuallyAdmin,
    isManagement,
    isAdmin,
    isEditor,
    isPersonal,
    isGuest,
    realUser,
  } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [orchestraList, setOrchestraList] = useState([]);

  useEffect(() => {
    if (isActuallyAdmin) {
      supabase
        .from("integrantes")
        .select("id, nombre, apellido, rol_sistema")
        .order("apellido")
        .then(({ data }) => setOrchestraList(data || []));
    }
  }, [isActuallyAdmin]);

  // Estados unificados de UI
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [calendarModalOpen, setCalendarModalOpen] = useState(false);
  
  // Estado para el modal global de comentarios
  const [globalCommentsOpen, setGlobalCommentsOpen] = useState(false);

  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [userData, setUserData] = useState(null);
  const [userAvatar, setUserAvatar] = useState(null);
  const [userColor, setUserColor] = useState("#64748b");
  const [pendingFields, setPendingFields] = useState([]);

  const { toggleVisibility, showTriggers } = useManual();

  // Estado para badges de comentarios
  const [commentCounts, setCommentCounts] = useState({
    total: 0,
    mentioned: 0,
  });

  const [uiScale, setUiScale] = useState(() =>
    parseInt(localStorage.getItem("app_ui_scale") || "100", 10),
  );

  useEffect(() => {
    document.documentElement.style.fontSize = `${uiScale}%`;
    localStorage.setItem("app_ui_scale", uiScale);
  }, [uiScale]);

  // Lógica para obtener conteo de comentarios no leídos en segundo plano
  useEffect(() => {
    if (!user) return;
    const fetchCommentCounts = async () => {
      const { data: comments } = await supabase
        .from("sistema_comentarios")
        .select(
          "id, created_at, entidad_tipo, entidad_id, etiquetados, id_autor",
        )
        .eq("resuelto", false)
        .eq("deleted", false);

      if (!comments) return;

      const { data: reads } = await supabase
        .from("comentarios_lecturas")
        .select("*")
        .eq("user_id", user.id);

      const readMap = {};
      reads?.forEach((r) => {
        const key = `${r.entidad_tipo}_${normalizeId(r.entidad_id)}`;
        readMap[key] = r.last_read_at;
      });

      let total = 0;
      let mentioned = 0;

      comments.forEach((c) => {
        // NOTA: Se eliminó el filtro c.id_autor === user.id para que cuenten los propios si no están leídos

        const key = `${c.entidad_tipo}_${normalizeId(c.entidad_id)}`;
        const lastRead = readMap[key] ? new Date(readMap[key]) : new Date(0);

        const isUnread = new Date(c.created_at) > lastRead;

        if (isUnread) {
          total++;
          if (c.etiquetados && c.etiquetados.includes(user.id)) {
            mentioned++;
          }
        }
      });
      setCommentCounts({ total, mentioned });
    };

    fetchCommentCounts();
    const interval = setInterval(fetchCommentCounts, 60000);
    return () => clearInterval(interval);
  }, [user]);

  const userRole = user?.rol_sistema || "";
  const isDirector = userRole === "director";

  const isGuestRole =
    userRole === "invitado" || userRole === "consulta_personal";

  const refreshMusicianData = async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from("integrantes")
      .select(
        "avatar_url, avatar_color, domicilio, link_dni_img, link_cuil, link_cbu_img, last_verified_at",
      )
      .eq("id", user.id)
      .single();

    if (data) {
      setUserData(data);
      if (data.avatar_url) setUserAvatar(data.avatar_url);
      if (data.avatar_color) setUserColor(data.avatar_color);
      if (userRole !== "invitado") {
        const missing = [];
        if (!data.domicilio) missing.push("Domicilio");
        if (!data.link_dni_img) missing.push("DNI");
        if (!data.link_cuil) missing.push("CUIL");
        if (!data.link_cbu_img) missing.push("CBU");
        setPendingFields(missing);
      }
    }
  };

  useEffect(() => {
    refreshMusicianData();
  }, [user, userRole]);

  const [isEnsembleCoordinator, setIsEnsembleCoordinator] = useState(false);
  const [catalogoInstrumentos, setCatalogoInstrumentos] = useState([]);

  useEffect(() => {
    if (!user) return;
    if (userRole !== "invitado") {
      supabase
        .from("instrumentos")
        .select("*")
        .order("id")
        .then(({ data }) => data && setCatalogoInstrumentos(data));
    }
    if (["admin", "editor", "produccion_general"].includes(userRole))
      setIsEnsembleCoordinator(true);
    else
      supabase
        .from("ensambles_coordinadores")
        .select("id", { count: "exact", head: true })
        .eq("id_integrante", user.id)
        .then(({ count }) => count > 0 && setIsEnsembleCoordinator(true));
  }, [user, userRole]);

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
    feedback: "FEEDBACK_ADMIN",
    manual: "MANUAL_INDEX",
    manual_admin: "MANUAL_ADMIN",
  };
  const modeToTab = Object.fromEntries(
    Object.entries(tabToMode).map(([k, v]) => [v, k]),
  );

  const currentTab = searchParams.get("tab");
  const defaultMode = isPersonal ? "FULL_AGENDA" : "GIRAS";
  const [mode, setMode] = useState(tabToMode[currentTab] || defaultMode);
  const [activeGiraId, setActiveGiraId] = useState(searchParams.get("giraId"));

  // =========================================================================
  // FIX CRÍTICO DE NAVEGACIÓN (ESTO FALTABA)
  // Extraemos los valores como strings para usarlos en el useEffect.
  // =========================================================================
  const currentTabParam = searchParams.get("tab");
  const currentGiraIdParam = searchParams.get("giraId");

  useEffect(() => {
    const newMode = tabToMode[currentTabParam] || defaultMode;
    setMode(newMode);
    
    if (newMode === "GIRAS") {
      setActiveGiraId(currentGiraIdParam);
    } else {
      setActiveGiraId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTabParam, currentGiraIdParam, defaultMode]); // <--- Dependencias primitivas (strings)

  const updateView = (
    newMode,
    giraId = null,
    viewParam = null,
    subTabParam = null,
  ) => {
    const newParams = new URLSearchParams(searchParams);
    const targetTab = modeToTab[newMode];
    if (targetTab) newParams.set("tab", targetTab);
    else newParams.delete("tab");

    if (newMode === "GIRAS" && giraId) {
      newParams.set("giraId", giraId);
      if (viewParam) newParams.set("view", viewParam);
      if (subTabParam) newParams.set("subTab", subTabParam);
    } else {
      ["giraId", "view", "subTab"].forEach((p) => newParams.delete(p));
    }
    setSearchParams(newParams);
    setIsMobileMenuOpen(false);
  };

  const handleMobileNavigate = (id) => {
    updateView(id);
    setIsMobileMenuOpen(false);
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
      id: "MANUAL_INDEX",
      label: "Manual de Usuario",
      icon: <IconBookOpen size={20} />,
      show: userRole !== "invitado",
    },
    {
      id: "MANUAL_ADMIN",
      label: "Editor Manual",
      icon: <IconEdit size={20} />,
      show: isManagement,
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
      show: userRole === "admin",
    },
  ];
  const visibleMenuItems = allMenuItems.filter((i) => i.show);

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
    {
      id: "COMMENTS",
      icon: <IconMessageCircle size={24} />,
      label: "Avisos",
      action: () => setGlobalCommentsOpen(true),
    },
    {
      id: "MENU",
      icon: <IconMenu size={24} />,
      label: "Menú",
      action: () => setIsMobileMenuOpen(true),
    },
  ];

  const renderContent = () => {
    const commonProps = { supabase };
    switch (mode) {
      case "DASHBOARD":
        return <DashboardGeneral {...commonProps} onViewChange={updateView} />;
      case "GIRAS":
        return (
          <GirasView
            initialGiraId={activeGiraId}
            updateView={updateView}
            {...commonProps}
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
        return (
          <GlobalCommentsViewer
            {...commonProps}
            onNavigate={(gid, v) => updateView("GIRAS", gid, v)}
            onCountsChange={setCommentCounts}
          />
        );
      case "MY_MEALS":
        return <MealsAttendancePersonal {...commonProps} />;
      case "FEEDBACK_ADMIN":
        return <FeedbackAdmin {...commonProps} />;
      case "MANUAL_INDEX":
        return <ManualIndex {...commonProps} />;
      case "MANUAL_ADMIN":
        return <ManualAdmin {...commonProps} />;
      default:
        return <div className="p-10 text-center">Vista no encontrada</div>;
    }
  };

  const activeManualSection = (() => {
    if (mode === "GIRAS" && activeGiraId)
      return `gira_${searchParams.get("view") || "resumen"}`;
    if (mode === "GIRAS" && !activeGiraId) return "giras_listado";
    return tabToMode[currentTab]?.toLowerCase() || "app_intro_general";
  })();

  const needsVerification =
    userData &&
    new Date(userData.last_verified_at).getFullYear() !==
      new Date().getFullYear();

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans text-slate-900">
      <NotificationsListener supabase={supabase} />
      <Toaster position="top-right" richColors />

      {/* OVERLAY MÓVIL */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">
              O
            </div>
            <h1 className="font-bold text-slate-800 text-lg">OFRN</h1>
          </div>
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="lg:hidden p-1 text-slate-400"
          >
            <IconX size={20} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {visibleMenuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleMobileNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${mode === item.id ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200" : "text-slate-600 hover:bg-slate-100"}`}
            >
              {item.icon}{" "}
              <span className="text-sm font-medium">{item.label}</span>
            </button>
          ))}
        </nav>

        {/* AJUSTES DE INTERFAZ */}
        <div className="p-4 bg-slate-50 border-t border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
              Interfaz
            </span>
            <span className="text-[10px] font-bold text-indigo-600">
              {uiScale}%
            </span>
          </div>
          <input
            type="range"
            min="80"
            max="140"
            step="5"
            value={uiScale}
            onChange={(e) => setUiScale(parseInt(e.target.value))}
            className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
          />
        </div>

        <div className="p-4 border-t border-slate-100">
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-colors"
          >
            <IconLogOut size={20} />{" "}
            <span className="text-sm font-medium">Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <div className="flex-1 flex flex-col h-full relative overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-8 shrink-0 z-30 gap-4">
          
          {/* 1. SECCIÓN IZQUIERDA (Logo/Título/Suplantación) */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 -ml-2 text-slate-600 lg:hidden"
            >
              <IconMenu size={24} />
            </button>
            {isActuallyAdmin && (
              <div className="hidden lg:flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                {isImpersonating && (
                  <div className="bg-amber-500 text-white px-4 py-2 flex items-center justify-between text-xs font-bold animate-in slide-in-from-top duration-300 z-[100] fixed top-16 left-0 right-0 justify-center">
                    <div className="flex items-center gap-2">
                      <IconEye size={16} />
                      VIENDO COMO:{" "}
                      <span className="uppercase">
                        {user.nombre} {user.apellido}
                      </span>
                    </div>
                    <button
                      onClick={stopImpersonating}
                      className="ml-4 bg-white text-amber-600 px-2 py-0.5 rounded-full text-[10px] hover:bg-amber-50"
                    >
                      SALIR
                    </button>
                  </div>
                )}
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter shrink-0">
                  Ver como:
                </span>
                <SearchableSelect
                  className="min-w-[200px] !border-0 !bg-transparent !py-0"
                  placeholder="Buscar integrante..."
                  options={orchestraList.map((u) => ({
                    id: u.id,
                    label: `${u.apellido}, ${u.nombre}`,
                    subLabel: u.rol_sistema,
                  }))}
                  value={isImpersonating ? user.id : ""}
                  onChange={(id) => {
                    if (!id) stopImpersonating();
                    else {
                      const target = orchestraList.find((u) => u.id === id);
                      if (target) impersonate(target);
                    }
                  }}
                />
              </div>
            )}
            <h2 className="text-xl font-bold text-slate-800 hidden md:block whitespace-nowrap">
              {allMenuItems.find((m) => m.id === mode)?.label || "Panel"}
            </h2>
          </div>

          {/* 2. SECCIÓN CENTRAL (BARRA DE COMANDOS) */}
         {/* 2. SECCIÓN CENTRAL (BARRA DE COMANDOS) */}
          <div className="flex-1 hidden md:flex justify-center max-w-xl mx-auto px-4">
             {/* Ya no necesita props, funciona solo */}
             <CommandBarTrigger className="w-full shadow-none bg-slate-50 border-slate-200 focus-within:ring-2 focus-within:ring-indigo-100 focus-within:border-indigo-400" />
          </div>
          {/* 3. SECCIÓN DERECHA (Acciones/Perfil) */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="flex items-center bg-slate-50 border border-slate-200 rounded-full p-1">
              <button
                onClick={toggleVisibility}
                className={`p-1.5 rounded-full transition-colors ${!showTriggers ? "text-slate-400" : "text-sky-600 bg-white shadow-sm"}`}
              >
                {showTriggers ? (
                  <IconEye size={18} />
                ) : (
                  <IconEyeOff size={18} />
                )}
              </button>
              {showTriggers && (
                <ManualTrigger
                  section={activeManualSection}
                  size="md"
                  className="border-0 bg-transparent text-sky-500 !p-1.5 shadow-none"
                />
              )}
            </div>

            <NewsModal supabase={supabase} />

            {isManagement && (
              <button
                onClick={() => setGlobalCommentsOpen(true)}
                className={`relative p-2 rounded-full transition-all duration-200 ${
                  globalCommentsOpen
                    ? "bg-indigo-50 text-indigo-600"
                    : "text-slate-500 hover:text-indigo-600 hover:bg-slate-100"
                }`}
                title="Avisos y Pendientes"
              >
                <IconMessageSquare size={22} />
                {commentCounts.total > 0 && (
                  <span className="absolute top-0 right-0 transform translate-x-1 -translate-y-1 h-4 min-w-[16px] px-1 bg-indigo-500 text-white text-[9px] font-bold flex items-center justify-center rounded-full shadow-sm border border-white z-10">
                    {commentCounts.total > 9 ? "9+" : commentCounts.total}
                  </span>
                )}
                {commentCounts.mentioned > 0 && (
                  <span className="absolute bottom-0 right-0 transform translate-x-1 translate-y-1 h-4 min-w-[16px] px-1 bg-red-500 text-white text-[9px] font-bold flex items-center justify-center rounded-full shadow-sm border border-white animate-pulse z-20">
                    @{commentCounts.mentioned}
                  </span>
                )}
              </button>
            )}

            <button
              onClick={() => setCalendarModalOpen(true)}
              className="hidden xl:flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-full border border-indigo-100 font-bold text-xs hover:bg-indigo-100"
            >
              <IconCalendar size={14} />
              <span className="hidden 2xl:inline">Sincronizar</span>
            </button>

            <button
              onClick={() => setProfileModalOpen(true)}
              className="flex items-center gap-2 group ml-1"
            >
              {pendingFields.length > 0 && (
                <IconAlertTriangle
                  size={18}
                  className="text-orange-500 animate-pulse hidden sm:block"
                />
              )}
              <div
                className="w-9 h-9 rounded-full border-2 border-white shadow-sm flex items-center justify-center overflow-hidden ring-2 ring-transparent group-hover:ring-indigo-100 transition-all"
                style={{
                  backgroundColor: userAvatar ? "transparent" : userColor,
                }}
              >
                {userAvatar ? (
                  <img
                    src={userAvatar}
                    className="w-full h-full object-cover"
                    alt="Perfil"
                  />
                ) : (
                  <IconUser size={20} className="text-white" />
                )}
              </div>
            </button>
          </div>
        </header>
        {needsVerification && (
          <div className="bg-orange-500 text-white px-4 py-2 flex items-center justify-center gap-3 text-[10px] font-black uppercase tracking-widest shrink-0">
            <IconAlertTriangle size={16} /> Verificar datos anuales
            <button
              onClick={() => setProfileModalOpen(true)}
              className="bg-white text-orange-600 px-3 py-0.5 rounded-full"
            >
              Verificar ahora
            </button>
          </div>
        )}

        <main className="flex-1 overflow-hidden relative bg-slate-50">
          {renderContent()}
          {/* MODAL GLOBAL DE COMENTARIOS */}
          {globalCommentsOpen && (
            <GlobalCommentsViewer
              supabase={supabase}
              onClose={() => setGlobalCommentsOpen(false)}
              onNavigate={(gid, v) => {
                setGlobalCommentsOpen(false);
                updateView("GIRAS", gid, v);
              }}
              onCountsChange={setCommentCounts}
            />
          )}
        </main>

        {/* BOTTOM NAV MÓVIL */}
        <div className="lg:hidden h-16 bg-white border-t border-slate-200 flex items-center justify-around z-30 shrink-0">
          {mobileNavItems.map((item) => (
            <button
              key={item.id}
              onClick={item.action || (() => updateView(item.id))}
              className={`flex flex-col items-center justify-center flex-1 h-full gap-1 ${mode === item.id ? "text-indigo-600" : "text-slate-400"}`}
            >
              {item.icon}{" "}
              <span className="text-[9px] font-bold">{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      <ProfileEditModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        user={user}
        supabase={supabase}
      />
      <CalendarSelectionModal
        isOpen={calendarModalOpen}
        onClose={() => setCalendarModalOpen(false)}
        userId={user?.id}
        isAdmin={isManagement}
      />
      <FeedbackWidget supabase={supabase} userEmail={user?.email} />
    </div>
  );
};

const AppContent = () => {
  const { user, loading } = useAuth();
  if (loading)
    return (
      <div className="h-screen flex items-center justify-center font-bold text-slate-400 animate-pulse">
        Cargando Sistema...
      </div>
    );
  return user ? <ProtectedApp /> : <LoginView />;
};

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeController />
        <ManualProvider>
          <CommandPaletteProvider>
            <Routes>
              <Route path="/share/:token" element={<PublicLinkHandler />} />
              <Route path="/*" element={<AppContent />} />
            </Routes>
          </CommandPaletteProvider>
          <ReloadPrompt />
        </ManualProvider>
        <Toaster position="top-right" richColors expand={true} closeButton />
      </AuthProvider>
    </QueryClientProvider>
  );
}