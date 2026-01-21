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
  IconMessageSquare,
  IconBell,
  IconCopy,
  IconBulb,
  IconDrive, // Asegúrate de tener este importado si lo usas abajo
  IconBookOpen, // <--- AGREGADO: Asegúrate de tener este ícono en Icons.jsx
  IconEdit,
  IconAlertTriangle,
  IconArrowRight,
  IconUser,
} from "./components/ui/Icons";
import ProfileEditModal from "./components/users/ProfileEditModal"; // Ajusta ruta si lo guardaste en otro lado

// --- MODAL CALENDARIO (Mantenido igual) ---
const CalendarSelectionModal = ({ isOpen, onClose, userId, isAdmin }) => {
  if (!isOpen || !userId) return null;

  // URLs de las dos funciones Edge
  const USER_BASE_URL =
    "webcal://muxrbuivopnawnxlcjxq.supabase.co/functions/v1/calendar-export";
  const ADMIN_BASE_URL =
    "webcal://muxrbuivopnawnxlcjxq.supabase.co/functions/v1/ics-export-admin";

  // Estado para manejar pestañas si es admin
  const [activeTab, setActiveTab] = useState("PERSONAL"); // 'PERSONAL' | 'ADMIN'

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

  const handleSubscribe = (
    platform,
    category,
    mode,
    isAdminContext = false,
  ) => {
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
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-slate-200 transition-colors"
          >
            <IconX size={20} />
          </button>
        </div>

        {/* PESTAÑAS (SOLO SI ES ADMIN) */}
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
          {/* --- VISTA PERSONAL --- */}
          {(!isAdmin || activeTab === "PERSONAL") && (
            <div className="space-y-6">
              <p className="text-xs text-slate-500 bg-indigo-50 border border-indigo-100 p-3 rounded-lg">
                Sincroniza tus <strong>eventos asignados</strong>. Puedes
                suscribirte a todo o filtrar por categoría.
              </p>

              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="px-3 py-2 text-[10px] font-black uppercase tracking-widest bg-indigo-50 text-indigo-600 border-b border-slate-100">
                  Mi Agenda
                </div>
                <div className="p-3 grid grid-cols-1 gap-2">
                  {/* Fila Musical */}
                  <div className="flex items-center justify-between group">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                      <IconMusic size={14} className="text-slate-400" />
                      <div>
                        Musical
                        <span className="block text-[9px] text-slate-400 font-normal">
                          Ensayos y Conciertos
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() =>
                          handleSubscribe("GOOGLE", "musical", null)
                        }
                        title="Google Calendar"
                        className="p-1 hover:text-blue-600"
                      >
                        <IconCalendar size={14} />
                      </button>
                      <button
                        onClick={() => handleSubscribe("IOS", "musical", null)}
                        title="Apple / Outlook"
                        className="p-1 hover:text-slate-900"
                      >
                        <IconDownload size={14} />
                      </button>
                      <button
                        onClick={() => handleSubscribe("COPY", "musical", null)}
                        title="Copiar Enlace"
                        className="p-1 hover:text-indigo-600"
                      >
                        <IconCopy size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="h-px bg-slate-50"></div>

                  {/* Fila Logística / Otros */}
                  <div className="flex items-center justify-between group">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                      <IconLayoutDashboard
                        size={14}
                        className="text-slate-400"
                      />
                      <div>
                        Logística / Otros
                        <span className="block text-[9px] text-slate-400 font-normal">
                          Giras, Trámites, Comidas
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleSubscribe("GOOGLE", "otros", null)}
                        title="Google Calendar"
                        className="p-1 hover:text-blue-600"
                      >
                        <IconCalendar size={14} />
                      </button>
                      <button
                        onClick={() => handleSubscribe("IOS", "otros", null)}
                        title="Apple / Outlook"
                        className="p-1 hover:text-slate-900"
                      >
                        <IconDownload size={14} />
                      </button>
                      <button
                        onClick={() => handleSubscribe("COPY", "otros", null)}
                        title="Copiar Enlace"
                        className="p-1 hover:text-indigo-600"
                      >
                        <IconCopy size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="h-px bg-slate-50"></div>

                  {/* Fila Agenda Completa */}
                  <div className="flex items-center justify-between group">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                      <IconCalendar size={14} className="text-slate-400" />
                      <div>
                        Agenda Completa
                        <span className="block text-[9px] text-slate-400 font-normal">
                          Todos los eventos unificados
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleSubscribe("GOOGLE", "full", null)}
                        title="Google Calendar"
                        className="p-1 hover:text-blue-600"
                      >
                        <IconCalendar size={14} />
                      </button>
                      <button
                        onClick={() => handleSubscribe("IOS", "full", null)}
                        title="Apple / Outlook"
                        className="p-1 hover:text-slate-900"
                      >
                        <IconDownload size={14} />
                      </button>
                      <button
                        onClick={() => handleSubscribe("COPY", "full", null)}
                        title="Copiar Enlace"
                        className="p-1 hover:text-indigo-600"
                      >
                        <IconCopy size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* --- VISTA ADMIN (MASTER) --- */}
          {isAdmin && activeTab === "ADMIN" && (
            <div className="space-y-6">
              <p className="text-xs text-slate-500 bg-blue-50 border border-blue-100 p-3 rounded-lg">
                Estos calendarios incluyen{" "}
                <strong>toda la actividad vigente</strong> de cada organismo,
                sin filtrar por personal asignado.
              </p>

              {/* Mapeamos los 3 organismos */}
              {[
                {
                  label: "Sinfónico",
                  type: "Sinfónico",
                  color: "text-indigo-600",
                  bg: "bg-indigo-50",
                },
                {
                  label: "Cámara / Ensamble",
                  type: "Ensamble",
                  color: "text-emerald-600",
                  bg: "bg-emerald-50",
                },
                {
                  label: "Jazz Band",
                  type: "Jazz Band",
                  color: "text-amber-600",
                  bg: "bg-amber-50",
                },
              ].map((org) => (
                <div
                  key={org.type}
                  className="border border-slate-200 rounded-lg overflow-hidden"
                >
                  <div
                    className={`px-3 py-2 text-[10px] font-black uppercase tracking-widest ${org.bg} ${org.color} border-b border-slate-100`}
                  >
                    {org.label}
                  </div>
                  <div className="p-3 grid grid-cols-1 gap-2">
                    {/* Fila Musical */}
                    <div className="flex items-center justify-between group">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                        <IconMusic size={14} className="text-slate-400" />{" "}
                        Musical
                      </div>
                      <div className="flex gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() =>
                            handleSubscribe("GOOGLE", org.type, "musical", true)
                          }
                          title="Google"
                          className="p-1 hover:text-blue-600"
                        >
                          <IconCalendar size={14} />
                        </button>
                        <button
                          onClick={() =>
                            handleSubscribe("IOS", org.type, "musical", true)
                          }
                          title="Apple/Outlook"
                          className="p-1 hover:text-slate-900"
                        >
                          <IconDownload size={14} />
                        </button>
                        <button
                          onClick={() =>
                            handleSubscribe("COPY", org.type, "musical", true)
                          }
                          title="Copiar"
                          className="p-1 hover:text-indigo-600"
                        >
                          <IconCopy size={14} />
                        </button>
                      </div>
                    </div>
                    {/* Fila Logística */}
                    <div className="flex items-center justify-between group border-t border-slate-50 pt-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                        <IconSettingsWheel
                          size={14}
                          className="text-slate-400"
                        />{" "}
                        Logística
                      </div>
                      <div className="flex gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() =>
                            handleSubscribe(
                              "GOOGLE",
                              org.type,
                              "logistics",
                              true,
                            )
                          }
                          title="Google"
                          className="p-1 hover:text-blue-600"
                        >
                          <IconCalendar size={14} />
                        </button>
                        <button
                          onClick={() =>
                            handleSubscribe("IOS", org.type, "logistics", true)
                          }
                          title="Apple/Outlook"
                          className="p-1 hover:text-slate-900"
                        >
                          <IconDownload size={14} />
                        </button>
                        <button
                          onClick={() =>
                            handleSubscribe("COPY", org.type, "logistics", true)
                          }
                          title="Copiar"
                          className="p-1 hover:text-indigo-600"
                        >
                          <IconCopy size={14} />
                        </button>
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
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [calendarModalOpen, setCalendarModalOpen] = useState(false);
  const [globalCommentsOpen, setGlobalCommentsOpen] = useState(false);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
  const isSidebarExpanded = !sidebarCollapsed || isSidebarHovered;

  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [userData, setUserData] = useState(null); // <--- AÑADIR ESTA LÍNEA
  const [userAvatar, setUserAvatar] = useState(null);
  const [userColor, setUserColor] = useState("#64748b");

  // --- NUEVOS ESTADOS PARA DOCUMENTACIÓN PENDIENTE ---
  const [pendingFields, setPendingFields] = useState([]);

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

  // --- LÓGICA UNIFICADA: CARGAR AVATAR, COLOR Y PENDIENTES ---
  const refreshMusicianData = async () => {
    if (!user?.id) return;

    const { data, error } = await supabase
      .from("integrantes")
      .select(
        "avatar_url, avatar_color, domicilio, link_dni_img, link_cuil, link_cbu_img, last_verified_at",
      ) // <--- Agregué last_verified_at
      .eq("id", user.id)
      .single();

    if (data) {
      setUserData(data); // <--- AÑADIR ESTA LÍNEA
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
  const { toggleVisibility, showTriggers } = useManual();
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
  const [initialGiraView, setInitialGiraView] = useState(
    searchParams.get("view"),
  );
  const [initialGiraSubTab, setInitialGiraSubTab] = useState(
    searchParams.get("subTab"),
  );

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    const newMode = tabToMode[tabParam] || defaultMode;
    if (newMode !== mode) setMode(newMode);
    if (newMode === "GIRAS") {
      setActiveGiraId(searchParams.get("giraId"));
      setInitialGiraView(searchParams.get("view") || null);
      setInitialGiraSubTab(searchParams.get("subTab") || null);
    } else {
      setActiveGiraId(null);
    }
  }, [searchParams, defaultMode]);

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
      else newParams.delete("view");
      if (subTabParam) newParams.set("subTab", subTabParam);
      else newParams.delete("subTab");
    } else {
      newParams.delete("giraId");
      newParams.delete("view");
      newParams.delete("subTab");
    }
    setSearchParams(newParams);
    setMobileMenuOpen(false);
  };

  const handleGlobalNavigation = (targetGiraId, targetView) => {
    updateView("GIRAS", targetGiraId, targetView);
    setGlobalCommentsOpen(false);
  };

  useEffect(() => {
    if (!user || isGuestRole) return;
    const fetchCommentCounts = async () => {
      try {
        const { data: comments } = await supabase
          .from("sistema_comentarios")
          .select("created_at, id_autor, etiquetados, entidad_tipo, entidad_id")
          .eq("resuelto", false)
          .eq("deleted", false);
        const { data: readings } = await supabase
          .from("comentarios_lecturas")
          .select("entidad_tipo, entidad_id, last_read_at")
          .eq("user_id", user.id);
        const readMap = {};
        readings?.forEach(
          (r) =>
            (readMap[`${r.entidad_tipo}_${r.entidad_id}`] = new Date(
              r.last_read_at,
            )),
        );
        const unread = new Set();
        const mentioned = new Set();
        comments?.forEach((c) => {
          if (c.id_autor === user.id) return;
          const key = `${c.entidad_tipo}_${c.entidad_id}`;
          if (new Date(c.created_at) > (readMap[key] || new Date(0))) {
            unread.add(key);
            if (c.etiquetados?.includes(user.id)) mentioned.add(key);
          }
        });
        setCommentCounts({ total: unread.size, mentioned: mentioned.size });
      } catch (err) {
        console.error(err);
      }
    };
    fetchCommentCounts();
    const ch = supabase
      .channel("global-badge")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sistema_comentarios" },
        fetchCommentCounts,
      )
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [user, isGuestRole]);

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

  // --- REGENERACIÓN DE mobileNavItems (LA PARTE QUE FALTABA) ---
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

  const renderContent = () => {
    const commonProps = { supabase };
    switch (mode) {
      case "DASHBOARD":
        return <DashboardGeneral {...commonProps} onViewChange={updateView} />;
      case "GIRAS":
        return (
          <GirasView
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
        return (
          <GlobalCommentsViewer
            {...commonProps}
            onNavigate={handleGlobalNavigation}
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
    if (mode === "GIRAS" && activeGiraId) {
      const view = searchParams.get("view") || "resumen";
      const subTab = searchParams.get("subTab");
      return subTab ? `gira_${view}_${subTab}` : `gira_${view}`;
    }
    if (mode === "GIRAS" && !activeGiraId) return "giras_listado";
    const modeMap = {
      DASHBOARD: "dashboard_general",
      FULL_AGENDA: "agenda_general",
      ENSAMBLES: "ensambles_general",
      MUSICIANS: "musicos_general",
      USERS: "usuarios_admin",
    };
    return modeMap[mode] || "app_intro_general";
  })();
  // 1. Lógica de cálculo (dentro del componente)
  const currentYear = new Date().getFullYear();
  const lastVerifiedYear = userData?.last_verified_at
    ? new Date(userData.last_verified_at).getFullYear()
    : null;
  const needsVerification = userData && lastVerifiedYear !== currentYear;
  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans text-slate-900">
      {/* SIDEBAR */}
      <aside
        className={`hidden md:flex bg-slate-900 text-slate-300 flex-col shadow-xl z-20 transition-all duration-300 ease-in-out ${isSidebarExpanded ? "w-64" : "w-20"}`}
        onMouseEnter={() => setIsSidebarHovered(true)}
        onMouseLeave={() => setIsSidebarHovered(false)}
      >
        <div
          className={`p-4 border-b border-slate-800 flex items-center ${!isSidebarExpanded ? "justify-center" : "justify-between"} gap-3`}
        >
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center text-white font-bold text-xl shrink-0">
              O
            </div>
            {isSidebarExpanded && (
              <h1 className="font-bold text-white text-lg tracking-tight">
                OF<span className="text-indigo-400">RN</span>
              </h1>
            )}
          </div>
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="text-slate-500 hover:text-white p-1 rounded hover:bg-slate-800"
          >
            {sidebarCollapsed ? (
              <IconChevronRight size={20} />
            ) : (
              <IconChevronLeft size={20} />
            )}
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
          {visibleMenuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => updateView(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${mode === item.id ? "bg-indigo-600 text-white shadow-lg shadow-indigo-900/50" : "hover:bg-slate-800 hover:text-white"} ${!isSidebarExpanded ? "justify-center" : ""}`}
              title={!isSidebarExpanded ? item.label : ""}
            >
              {item.icon}{" "}
              {isSidebarExpanded && (
                <span className="text-sm truncate">{item.label}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-800">
          <button
            onClick={logout}
            className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-slate-400 hover:bg-rose-900/30 hover:text-rose-400 transition-colors ${!isSidebarExpanded ? "justify-center" : ""}`}
            title="Cerrar Sesión"
          >
            <IconLogOut size={20} />{" "}
            {isSidebarExpanded && <span>Cerrar Sesión</span>}
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <div className="flex-1 flex flex-col h-full relative overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-8 shadow-sm z-40 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 -ml-2 text-slate-500 hover:text-indigo-600 rounded-full transition-colors mr-1"
            >
              <IconMenu size={24} />
            </button>
            <h2 className="text-xl font-bold text-slate-800 hidden sm:block">
              {allMenuItems.find((m) => m.id === mode)?.label || "Panel"}
            </h2>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center bg-white border border-slate-200 rounded-full shadow-sm p-1">
              <button
                onClick={toggleVisibility}
                className={`p-1.5 rounded-full transition-colors ${!showTriggers ? "text-slate-400 hover:bg-slate-100" : "text-sky-600 bg-sky-50"}`}
              >
                {showTriggers ? (
                  <IconEye size={18} />
                ) : (
                  <IconEyeOff size={18} />
                )}
              </button>
              {showTriggers && (
                <>
                  <div className="w-px h-5 bg-slate-200 mx-1"></div>
                  <ManualTrigger
                    section={activeManualSection}
                    size="md"
                    className="border-0 bg-transparent text-sky-500 !p-1.5 shadow-none"
                  />
                </>
              )}
            </div>

            <button
              onClick={() => setCalendarModalOpen(true)}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-full border border-indigo-200 shadow-sm transition-colors hover:bg-indigo-100 font-bold text-xs"
            >
              <IconCalendar size={16} /> Sincronizar
            </button>
            <div className="hidden sm:block">
              <NewsModal supabase={supabase} />
            </div>

            {isManagement && (
              <button
                onClick={() => setGlobalCommentsOpen(true)}
                className="hidden sm:flex p-2 rounded-full text-slate-400 hover:text-amber-600 relative group"
              >
                <IconMessageSquare size={22} />
                {commentCounts.total > 0 && (
                  <span className="absolute top-0 right-0 h-4 w-4 rounded-full bg-indigo-500 text-[9px] font-bold text-white flex items-center justify-center ring-2 ring-white">
                    {commentCounts.total}
                  </span>
                )}
              </button>
            )}

            <div className="h-8 w-px bg-slate-200 hidden sm:block"></div>
            {needsVerification && (
              <div className="bg-orange-600 text-white px-4 py-2 flex items-center justify-center gap-3 shadow-lg animate-in slide-in-from-top duration-500 sticky top-0 z-[100]">
                <IconAlertTriangle size={18} className="animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest">
                  Atención: Debes verificar y confirmar tus datos para el ciclo{" "}
                  {currentYear}
                </span>
                <button
                  onClick={() => setProfileModalOpen(true)}
                  className="bg-white text-orange-600 px-3 py-1 rounded-full text-[9px] font-black uppercase hover:bg-orange-50 transition-colors shadow-sm"
                >
                  Verificar Ahora
                </button>
              </div>
            )}
            <button
              onClick={() => setProfileModalOpen(true)}
              // Añadimos 'pl-2' para dar espacio si aparece el icono
              className="flex items-center gap-3 hover:bg-slate-50 p-1.5 pl-2 rounded-lg transition-colors group text-right"
              title="Editar Perfil"
            >
              {/* --- NUEVO: ALERTA PENDIENTES --- */}
              {pendingFields.length > 0 && (
                // Usamos animate-pulse para el parpadeo.
                // El title muestra qué falta al pasar el mouse.
                <div
                  className="text-orange-500 animate-pulse hidden sm:block bg-orange-100 rounded-full p-1"
                  title={`⚠️ Documentación pendiente: ${pendingFields.join(", ")}.\nHaz clic para completar.`}
                >
                  <IconAlertTriangle size={18} />
                </div>
              )}
              {/* -------------------------------- */}

              <div className="flex flex-col items-end hidden sm:flex">
                <span className="text-sm font-bold text-slate-700 leading-tight group-hover:text-indigo-700">
                  {user.nombre} {user.apellido}
                </span>
                <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">
                  {userRole.replace("_", " ")}
                </span>
              </div>
              <div
                className="w-10 h-10 rounded-full border-2 border-white shadow-sm flex items-center justify-center overflow-hidden relative"
                style={{
                  backgroundColor: userAvatar ? "transparent" : userColor,
                }}
              >
                {/* --- OPCIONAL: Poner un puntito naranja también sobre el avatar en móvil --- */}
                {pendingFields.length > 0 && (
                  <span className="sm:hidden absolute top-0 right-0 block h-2.5 w-2.5 rounded-full ring-2 ring-white bg-orange-500 animate-pulse" />
                )}
                {/* -------------------------------------------------------------------------- */}

                {userAvatar ? (
                  <img
                    src={userAvatar}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <IconUser size={24} className="text-white" />
                )}
              </div>
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-hidden relative bg-slate-50">
          {renderContent()}
        </main>

        {/* MOBILE FOOTER - USANDO mobileNavItems DEFINIDO ARRIBA */}
        <div className="md:hidden h-16 bg-white border-t border-slate-200 flex items-center justify-around z-30 shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          {mobileNavItems.map((item) => (
            <button
              key={item.id}
              onClick={item.action || (() => updateView(item.id))}
              className={`flex flex-col items-center justify-center w-full h-full gap-1 ${mode === item.id ? "text-indigo-600" : "text-slate-400"}`}
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
        onUpdate={refreshMusicianData}
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
