import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useLayoutEffect,
} from "react";
import {
  IconPlus,
  IconLoader,
  IconArrowLeft,
  IconDrive,
  IconUsers,
  IconCalendar,
  IconMusic,
  IconSettingsWheel,
  IconSettings,
  IconMegaphone,
  IconUtensils,
  IconLayoutDashboard,
  IconEdit,
  IconTrash,
} from "../../components/ui/Icons";
import { useAuth } from "../../context/AuthContext";
import { useSearchParams } from "react-router-dom";
import { useGiraRoster, fetchRosterForGira } from "../../hooks/useGiraRoster";
import { useLogistics } from "../../hooks/useLogistics";
import ManualTrigger from "../../components/manual/ManualTrigger";

// Sub-vistas
import GiraForm from "./GiraForm";
import GiraRoster from "./GiraRoster";
import GiraAgenda from "./GiraAgenda";
import ProgramRepertoire from "./ProgramRepertoire";
import LogisticsDashboard from "./LogisticsDashboard";
import AgendaGeneral from "./AgendaGeneral";
import MusicianCalendar from "./MusicianCalendar";
import WeeklyCalendar from "./WeeklyCalendar";
import MealsAttendancePersonal from "./MealsAttendancePersonal";
import ProgramSeating from "./ProgramSeating";
import CommentsManager from "../../components/comments/CommentsManager";
import GlobalCommentsViewer from "../../components/comments/GlobalCommentsViewer";
import CommentButton from "../../components/comments/CommentButton";
import GiraDifusion from "./GiraDifusion";
import SectionStatusControl from "../../components/giras/SectionStatusControl";
import { deleteGira } from "../../services/giraActions";
import { toast } from "sonner";

// Componentes Modularizados
import GirasListControls from "./GirasListControls";
import GiraCard from "./GiraCard";
import {
  MoveGiraModal,
  DuplicateGiraModal,
} from "../../components/giras/GiraManipulationModals";
import { moveGira, duplicateGira } from "../../services/giraActions";
import { addDays, differenceInCalendarDays, format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

export default function GirasView({ supabase, trigger = 0 }) {
  const { user, isEditor, isManagement, isPersonal, isGuest, isDifusion, role } =
    useAuth();
  const userRole = role ?? "";
  const [statsRefreshTrigger, setStatsRefreshTrigger] = useState(0);

  const handleChildDataChange = () => {
    setStatsRefreshTrigger((prev) => prev + 1);
  };

  const [coordinatedEnsembles, setCoordinatedEnsembles] = useState(new Set());
  const [searchParams, setSearchParams] = useSearchParams();

  const mode = searchParams.get("view") || "LIST";
  const giraId = searchParams.get("giraId");
  const currentTab = searchParams.get("subTab");

  const [giras, setGiras] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionGira, setActionGira] = useState(null);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showDupModal, setShowDupModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const selectedGira = useMemo(() => {
    if (!giraId || giras.length === 0) return null;
    return giras.find((g) => g.id.toString() === giraId);
  }, [giras, giraId]);

  const getActiveSection = () => {
    if (!selectedGira) return null;
    if (mode === "AGENDA") return { key: "AGENDA", label: "Agenda General" };
    if (mode === "ROSTER") return { key: "ROSTER", label: "Nómina / Staff" };
    if (mode === "REPERTOIRE")
      return { key: "REPERTOIRE", label: "Repertorio" };
    if (mode === "LOGISTICS") {
      const subTab = currentTab || "coverage";
      if (subTab === "rooming")
        return { key: "ROOMING", label: "Rooming List" };
      if (subTab === "transporte")
        return { key: "TRANSPORTE", label: "Transporte" };
      if (subTab === "viaticos") return { key: "VIATICOS", label: "Viáticos" };
      if (subTab === "meals")
        return { key: "MEALS_AGENDA", label: "Agenda de Comidas" };
      if (subTab === "attendance")
        return { key: "MEALS_ATTENDANCE", label: "Control de Asistencia" };
      if (subTab === "report")
        return { key: "MEALS_REPORT", label: "Reportes de Alimentación" };
      return { key: "LOGISTICA_GRAL", label: "Reglas Generales" };
    }
    return null;
  };

  const activeSection = getActiveSection();
  const { summary: enrichedRosterData, loading: logisticsLoading } =
    useLogistics(supabase, selectedGira, statsRefreshTrigger);

  useEffect(() => {
    if (selectedGira) {
      sessionStorage.setItem("last_active_gira_id", selectedGira.id);
    }
  }, [selectedGira]);

  const updateView = (newMode, newGiraId = null, newSubTab = null) => {
    if (mode === "LIST" && newMode !== "LIST" && scrollContainerRef.current) {
      sessionStorage.setItem(
        "giras_list_scroll",
        scrollContainerRef.current.scrollTop,
      );
    }

    const params = { tab: "giras" };
    if (newMode && newMode !== "LIST") {
      params.view = newMode;
      const gId =
        newGiraId || giraId || (selectedGira ? selectedGira.id : null);
      if (gId) params.giraId = gId;
      if (newSubTab) params.subTab = newSubTab;
    }
    setSearchParams(params);
  };
  const isCoordinator = !isEditor && coordinatedEnsembles.size > 0;
  const [commentsState, setCommentsState] = useState(null);
  const [globalCommentsGiraId, setGlobalCommentsGiraId] = useState(null);
  const [showRepertoireInCards, setShowRepertoireInCards] = useState(false);
  const [showFiltersMobile, setShowFiltersMobile] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState(null);
  // Por defecto "Comisión" solo activo para editores y admins; el resto lo puede activar manualmente
  const [filterType, setFilterType] = useState(
    () =>
      new Set([
        "Sinfónico",
        "Camerata Filarmónica",
        "Ensamble",
        "Jazz Band",
        // "Comisión" se añade en useEffect solo si isEditor
      ]),
  );
  const PROGRAM_TYPES = [
    "Sinfónico",
    "Camerata Filarmónica",
    "Ensamble",
    "Jazz Band",
    "Comisión",
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
    token_publico: "",
    nomenclador: "",
    estado: "Borrador",
    notificaciones_habilitadas: true, // default true
  });
  const [selectedLocations, setSelectedLocations] = useState(new Set());
  const [selectedSources, setSelectedSources] = useState([]);
  const [selectedStaff, setSelectedStaff] = useState([]);
  const [locationsList, setLocationsList] = useState([]);
  const [ensemblesList, setEnsemblesList] = useState([]);
  const [allIntegrantes, setAllIntegrantes] = useState([]);

  const [highlightedGiraId, setHighlightedGiraId] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    if (!params.get("giraId")) {
      const stored = sessionStorage.getItem("last_active_gira_id");
      if (stored) return stored;
    }
    return null;
  });

  useEffect(() => {
    if (highlightedGiraId) {
      sessionStorage.removeItem("last_active_gira_id");
      const timer = setTimeout(() => {
        setHighlightedGiraId(null);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [highlightedGiraId]);

  const scrollContainerRef = useRef(null);

  useEffect(() => {
    if (!giraId && !loading && scrollContainerRef.current) {
      const savedPosition = sessionStorage.getItem("giras_list_scroll");
      if (savedPosition) {
        requestAnimationFrame(() => {
          if (scrollContainerRef.current)
            scrollContainerRef.current.scrollTop = parseInt(savedPosition, 10);
        });
      } else if (highlightedGiraId) {
        setTimeout(() => {
          const element = document.getElementById(
            `gira-card-${highlightedGiraId}`,
          );
          if (element) {
            element.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        }, 150);
      }
    }
  }, [loading, giraId, highlightedGiraId]);

  useEffect(() => {
    const fetchCoordinations = async () => {
      if (!user) return;
      const { data, error } = await supabase
        .from("ensambles_coordinadores")
        .select("id_ensamble")
        .eq("id_integrante", user.id);
      if (data && !error) {
        const ids = new Set(data.map((item) => item.id_ensamble));
        setCoordinatedEnsembles(ids);
      }
    };
    fetchCoordinations();
  }, [user, supabase]);

  // Forzar filterStatus según rol al cargar/recargar (isCoord prima sobre isPersonal)
  useEffect(() => {
    if (!user) return;

    const isCoord = !isEditor && coordinatedEnsembles.size > 0;

    if (isCoord) {
      setFilterStatus(new Set(["Vigente", "Borrador"]));
    } else if (isPersonal) {
      setFilterStatus(new Set(["Vigente"]));
    } else if (isEditor || isManagement) {
      setFilterStatus(new Set(["Vigente", "Borrador", "Pausada"]));
    }
  }, [user, isEditor, isManagement, isPersonal, coordinatedEnsembles.size]);

  // Filtro "Comisión" por defecto solo para editores y admins
  useEffect(() => {
    if (!user) return;
    if (isEditor) {
      setFilterType((prev) =>
        prev.has("Comisión") ? prev : new Set([...prev, "Comisión"])
      );
    } else {
      setFilterType((prev) => {
        if (!prev.has("Comisión")) return prev;
        const next = new Set(prev);
        next.delete("Comisión");
        return next;
      });
    }
  }, [user, isEditor]);

  useEffect(() => {
    fetchGiras();
    fetchLocationsList();
    fetchEnsemblesList();
    fetchIntegrantesList();
  }, [user.id, coordinatedEnsembles.size]);

  // --- FUNCIÓN FETCHGIRAS CORREGIDA PARA INVITADOS ---
  const fetchGiras = async () => {
    setLoading(true);
    try {
      if (isGuest) {
        // Lógica de Invitado: Usar RPC para saltar bloqueo RLS
        const tokenToUse = user.token_original;

        if (tokenToUse) {
          // 1. Llamar al RPC actualizado que busca en giras_accesos
          const { data: giraBaseData, error } = await supabase.rpc(
            "get_gira_by_public_token",
            { token_input: tokenToUse },
          );

          if (error) throw error;

          if (!giraBaseData || giraBaseData.length === 0) {
            console.warn("No se encontró gira para el token:", tokenToUse);
            setGiras([]);
            return;
          }

          const targetGira = giraBaseData[0];

          // 2. Traer manualmente los datos relacionales (ya que el RPC devuelve solo la tabla base)
          // Esto funciona porque habilitamos RLS "public" para estas tablas en el paso SQL anterior
          const [eventosRes, locsRes, fuentesRes] = await Promise.all([
            supabase
              .from("eventos")
              .select(
                "id, fecha, hora_inicio, locaciones(nombre, localidades(localidad)), tipos_evento(nombre)",
              )
              .eq("id_gira", targetGira.id),
            supabase
              .from("giras_localidades")
              .select("id_localidad, localidades(localidad)")
              .eq("id_gira", targetGira.id),
            supabase
              .from("giras_fuentes")
              .select("*")
              .eq("id_gira", targetGira.id),
          ]);

          // 3. Construir el objeto completo
          const fullGira = {
            ...targetGira,
            eventos: eventosRes.data || [],
            giras_localidades: locsRes.data || [],
            giras_fuentes: fuentesRes.data || [],
            giras_integrantes: [], // Privacidad: Invitado no ve lista completa
          };

          setGiras([fullGira]);
        } else {
          console.error("Usuario invitado sin token original");
        }
      } else {
        // --- LÓGICA NORMAL (Usuarios Autenticados) ---
        // Con rol difusión ve TODOS los programas (en el detalle solo podrá abrir pestaña Difusión)
        const isPersonalRoleForDB =
          (userRole === "consulta_personal" || userRole === "personal") &&
          user.id !== "guest-general" &&
          !isDifusion;
        let myEnsembles = new Set();
        let myFamily = null;
        if (isPersonalRoleForDB) {
          const { data: me } = await supabase
            .from("integrantes")
            .select(
              "*, instrumentos(familia), integrantes_ensambles(id_ensamble)",
            )
            .eq("id", user.id)
            .single();
          if (me) {
            myFamily = me.instrumentos?.familia;
            me.integrantes_ensambles?.forEach((ie) =>
              myEnsembles.add(ie.id_ensamble),
            );
          }
        }
        const { data, error } = await supabase
          .from("programas")
          .select(
            `
            *,
            giras_localidades(id_localidad, localidades(localidad)), 

            giras_integrantes(
              id_integrante, rol, estado, 
              integrantes(
                id, nombre, apellido, 
                id_localidad,        
                instrumentos(familia)  
              )
            ),

            eventos(
              *, 
              tipos_evento(*), 
              locaciones(*, localidades(localidad)),
              eventos_asistencia(*) 
            ),
            giras_fuentes(*)
          `,
          )
          .order("fecha_desde", { ascending: true });
        if (error) throw error;
        let result = data || [];
        if (isPersonalRoleForDB) {
          result = result.filter((gira) => {
            const overrides = gira.giras_integrantes || [];
            const sources = gira.giras_fuentes || [];
            const myOverride = overrides.find(
              (o) => o.id_integrante === user.id,
            );
            if (myOverride && myOverride.estado === "ausente") return false;
            if (myOverride) return true;
            const isIncluded = sources.some(
              (s) =>
                (s.tipo === "ENSAMBLE" &&
                  (myEnsembles.has(s.valor_id) ||
                    coordinatedEnsembles.has(s.valor_id))) ||
                (s.tipo === "FAMILIA" && s.valor_texto === myFamily),
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
      }
    } catch (err) {
      console.error("Error fetching giras:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isGuest && user?.active_gira_id) {
      const needsFiltering =
        giras.length > 0 && giras.some((g) => g.id !== user.active_gira_id);
      if (needsFiltering)
        setGiras((prev) => prev.filter((g) => g.id === user.active_gira_id));

      const GUEST_ALLOWED_VIEWS = [
        "AGENDA",
        "REPERTOIRE",
        "MEALS_PERSONAL",
        "SEATING",
      ];
      const currentView = searchParams.get("view");
      const currentGiraId = searchParams.get("giraId");
      const isViewAllowed = GUEST_ALLOWED_VIEWS.includes(currentView);
      const isGiraCorrect = currentGiraId === String(user.active_gira_id);
      if (!isViewAllowed || !isGiraCorrect) {
        setSearchParams(
          { tab: "giras", view: "AGENDA", giraId: user.active_gira_id },
          { replace: true },
        );
      }
    }
  }, [isGuest, user, giras, searchParams, setSearchParams]);

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
      .select("id, nombre, apellido, id_localidad, instrumentos(familia)")
      .order("apellido");
    if (data)
      setAllIntegrantes(
        data.map((i) => ({ value: i.id, label: `${i.apellido}, ${i.nombre}` })),
      );
  };

  const loadGiraIntoForm = async (gira) => {
    setEditingId(gira.id);
    setFormData({
      nombre_gira: gira.nombre_gira,
      subtitulo: gira.subtitulo || "",
      fecha_desde: gira.fecha_desde || "",
      fecha_hasta: gira.fecha_hasta || "",
      tipo: gira.tipo || "Sinfónico",
      zona: gira.zona || "",
      token_publico: gira.token_publico || "",
      nomenclador: gira.nomenclador || "",
      estado: gira.estado || "Borrador",
      notificaciones_habilitadas: gira.notificaciones_habilitadas !== false, // default true
    });
    const { data } = await supabase
      .from("giras_localidades")
      .select("id_localidad")
      .eq("id_gira", gira.id);
    setSelectedLocations(
      data ? new Set(data.map((d) => d.id_localidad)) : new Set(),
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
  };

  useEffect(() => {
    if (mode === "EDICION" && selectedGira && ensemblesList.length > 0) {
      loadGiraIntoForm(selectedGira);
    }
  }, [mode, selectedGira, ensemblesList.length]);

  const handleOpenMove = (gira) => {
    setActionGira(gira);
    setShowMoveModal(true);
  };
  const handleOpenDup = (gira) => {
    setActionGira(gira);
    setShowDupModal(true);
  };

  const onConfirmMove = async (newDate, notify = false) => {
    setActionLoading(true);
    const res = await moveGira(actionGira.id, newDate, notify);
    setActionLoading(false);
    if (res.success) {
      setShowMoveModal(false);
      fetchGiras();
      if (notify) {
        try {
          const { roster } = await fetchRosterForGira(supabase, actionGira);
          const conMail = roster.filter((m) => m.estado_gira !== "ausente" && m.mail);
          const bcc = conMail.map((m) => m.mail);
          if (bcc.length > 0) {
            const fmtLargo = (s) => (s ? format(parseISO(s), "EEEE, dd/MM/yyyy", { locale: es }) : "");
            const fechasViejas =
              [actionGira.fecha_desde, actionGira.fecha_hasta]
                .filter(Boolean)
                .map(fmtLargo)
                .join(" – ") || "";
            const daysSpan = actionGira.fecha_desde && actionGira.fecha_hasta
              ? differenceInCalendarDays(parseISO(actionGira.fecha_hasta), parseISO(actionGira.fecha_desde))
              : 0;
            const newEnd = newDate ? addDays(parseISO(newDate), daysSpan) : null;
            const fechasNuevas =
              newDate && newEnd
                ? [format(parseISO(newDate), "EEEE, dd/MM/yyyy", { locale: es }), format(newEnd, "EEEE, dd/MM/yyyy", { locale: es })].join(" – ")
                : newDate ? format(parseISO(newDate), "EEEE, dd/MM/yyyy", { locale: es }) : "";
            const { data: eventosGira } = await supabase
              .from("eventos")
              .select("fecha, hora_inicio, locaciones(nombre, localidades(localidad))")
              .eq("id_gira", actionGira.id)
              .order("fecha", { ascending: true })
              .order("hora_inicio", { ascending: true });
            const fmtEvento = (e) => {
              const dia = e.fecha ? format(parseISO(e.fecha), "EEEE d 'de' MMMM", { locale: es }) : "—";
              const hora = e.hora_inicio ? `${e.hora_inicio.slice(0, 5)} hs` : "—";
              const loc = e.locaciones?.nombre || "—";
              const ciudad = e.locaciones?.localidades?.localidad || "—";
              return `${dia}, ${hora}, ${loc}, ${ciudad}`;
            };
            const conciertos = (eventosGira || []).map(fmtEvento);
            const linkGira = `${window.location.origin}${window.location.pathname}?tab=giras&view=AGENDA&giraId=${actionGira.id}`;
            const { error } = await supabase.functions.invoke("mails_produccion", {
              body: {
                action: "enviar_mail",
                templateId: "cambio_fechas_gira",
                bcc,
                nombre: "",
                gira: actionGira.nombre_gira || "Gira OFRN",
                detalle: {
                  fechas_viejas: fechasViejas,
                  fechas_nuevas: fechasNuevas,
                  zona: actionGira.zona || "",
                  conciertos,
                  link_gira: linkGira,
                },
              },
            });
            if (error) throw error;
            toast.success(`Gira trasladada. Notificación enviada a ${bcc.length} músico(s).`);
          } else {
            toast.success("Gira trasladada correctamente");
          }
        } catch (err) {
          console.error("Error enviando notificación de traslado:", err);
          toast.warning("Gira trasladada, pero no se pudo enviar el email a los músicos.");
        }
      } else {
        toast.success("Gira trasladada correctamente");
      }
    } else {
      toast.error("Error al mover la gira");
    }
  };

  const onConfirmDup = async (newDate, newName) => {
    setActionLoading(true);
    const res = await duplicateGira(actionGira.id, newDate, newName);
    setActionLoading(false);
    if (res.success) {
      setShowDupModal(false);
      fetchGiras();
    } else if (res.error === "DUPLICATE_NAME") {
      toast.error(
        `El nombre "${newName}" ya existe. Modifica el nombre en el formulario (ej: agrega un número o año).`,
      );
    } else {
      toast.error("Ocurrió un error inesperado al duplicar la gira.");
    }
  };

  const handleGiraUpdate = async () => {
    if (!selectedGira) return;
    const { data } = await supabase
      .from("programas")
      .select("*")
      .eq("id", selectedGira.id)
      .single();
    if (data) {
      setGiras((prev) =>
        prev.map((g) => (g.id === data.id ? { ...g, ...data } : g)),
      );
    }
  };

  const handleGlobalSync = async () => {
    if (
      !confirm(
        "¿Recalcular nomencladores y carpetas de Drive para TODAS las giras vigentes?",
      )
    )
      return;
    const btn = document.getElementById("btn-sync-global");
    if (btn) {
      btn.disabled = true;
      btn.classList.add("opacity-50", "cursor-wait");
    }
    try {
      const { error } = await supabase.functions.invoke("manage-drive", {
        body: { action: "sync_program" },
      });
      if (error) throw error;
      toast.success("Sincronización completada.");
      await fetchGiras();
    } catch (err) {
      console.error(err);
      toast.error("Error al sincronizar: " + err.message);
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.classList.remove("opacity-50", "cursor-wait");
      }
    }
  };

  const handleSave = async () => {
    if (!formData.nombre_gira?.trim()) {
      toast.error("El nombre de la gira es obligatorio");
      return;
    }

    setLoading(true);

    // 1. Limpieza rigurosa del payload para evitar errores de tipo en la DB
    const payload = {
      nombre_gira: formData.nombre_gira.trim(),
      subtitulo: formData.subtitulo?.trim() || null,
      fecha_desde: formData.fecha_desde || null,
      fecha_hasta: formData.fecha_hasta || null,
      tipo: formData.tipo || "Sinfónico",
      zona: formData.zona?.trim() || null,
      token_publico: formData.token_publico || null,
      estado: formData.estado || "Borrador",
      nomenclador: formData.nomenclador || null,
      notificaciones_habilitadas: formData.notificaciones_habilitadas !== false, // default true
    };

    // Ajuste de seguridad para coordinadores
    if (isCoordinator) {
      payload.tipo = "Ensamble";
    }

    try {
      let targetId = editingId;

      if (editingId) {
        // ACTUALIZACIÓN
        const { error: updateError } = await supabase
          .from("programas")
          .update(payload)
          .eq("id", editingId);
        if (updateError) throw updateError;
      } else {
        // CREACIÓN NUEVA
        const { data: newData, error: insertError } = await supabase
          .from("programas")
          .insert([payload])
          .select()
          .single(); // Usamos single para obtener el ID directamente

        if (insertError) throw insertError;
        targetId = newData.id;
      }

      // 2. Gestión de Relaciones (solo si tenemos un ID válido)
      if (targetId) {
        // --- CORRECCIÓN: CREACIÓN AUTOMÁTICA DE BLOQUE REPERTORIO ---
        // Solo si es una creación nueva (!editingId)
        if (!editingId) {
          const { error: blockError } = await supabase
            .from("programas_repertorios") // <--- NOMBRE DE TABLA CORRECTO
            .insert([
              {
                id_programa: targetId, // <--- CAMPO CORRECTO (no id_gira)
                nombre: "Repertorio", // <--- CAMPO CORRECTO (no titulo)
                orden: 0,
              },
            ]);

          if (blockError)
            console.warn("Error creando bloque por defecto:", blockError);
        }
        // Localidades
        await supabase
          .from("giras_localidades")
          .delete()
          .eq("id_gira", targetId);
        if (selectedLocations.size > 0) {
          const locPayload = Array.from(selectedLocations).map((lid) => ({
            id_gira: targetId,
            id_localidad: lid,
          }));
          const { error: locError } = await supabase
            .from("giras_localidades")
            .insert(locPayload);
          if (locError) console.error("Error en localidades:", locError);
        }

        // Fuentes (Ensambles/Familias)
        await supabase.from("giras_fuentes").delete().eq("id_gira", targetId);
        if (selectedSources.length > 0) {
          const srcPayload = selectedSources.map((s) => ({
            id_gira: targetId,
            tipo: s.tipo,
            valor_id: s.valor_id || null,
            valor_texto: s.valor_texto || null,
          }));
          const { error: srcError } = await supabase
            .from("giras_fuentes")
            .insert(srcPayload);
          if (srcError) console.error("Error en fuentes:", srcError);
        }

        // Staff Artístico
        await supabase
          .from("giras_integrantes")
          .delete()
          .eq("id_gira", targetId)
          .in("rol", ["director", "solista"]);

        if (selectedStaff.length > 0) {
          const staffPayload = selectedStaff.map((s) => ({
            id_gira: targetId,
            id_integrante: s.id_integrante,
            rol: s.rol,
            estado: "confirmado",
          }));
          const { error: staffError } = await supabase
            .from("giras_integrantes")
            .insert(staffPayload);
          if (staffError) console.error("Error en staff:", staffError);
        }

        // 3. Sincronización con Google Drive (Edge Function)
        // Usamos 'manage-drive' que es el estándar en tu proyecto según otros archivos
        try {
          await supabase.functions.invoke("manage-drive", {
            body: { action: "sync_program", programId: targetId },
          });
        } catch (driveErr) {
          console.warn("Error (no crítico) sincronizando Drive:", driveErr);
        }
      }

      // Finalización
      await fetchGiras();
      closeForm();
      toast.success(editingId ? "Gira actualizada con éxito" : "Gira creada con éxito");
    } catch (err) {
      console.error("Error detallado al guardar gira:", err);
      toast.error(`Error al guardar: ${err.message || "Error desconocido"}`);
    } finally {
      setLoading(false);
    }
  };
  const handleDelete = async (e, id) => {
    if (e) e.stopPropagation();
    if (!confirm("¿Eliminar?")) return;
    setLoading(true);
    await supabase.functions.invoke("drive-manager", {
      body: { action: "delete_program", programId: id },
    });
    await supabase.from("programas").delete().eq("id", id);
    await fetchGiras();
    setLoading(false);
  };
  const handleDeleteGira = async (gira) => {
    // Verificar condiciones para mostrar checkbox
    const puedeMostrarCheckbox = gira.notificacion_inicial_enviada === true;
    const puedeNotificar =
      puedeMostrarCheckbox && gira.notificaciones_habilitadas !== false;

    // Componente del toast con estado para el checkbox
    const DeleteConfirmToast = ({ onConfirm, onCancel }) => {
      const [shouldNotify, setShouldNotify] = useState(puedeNotificar);

      return (
        <div className="bg-white border border-slate-200 rounded-lg shadow-xl p-4 min-w-[320px] max-w-md">
          <div className="flex items-start gap-3 mb-4">
            <div className="p-2 bg-red-50 rounded-lg">
              <IconTrash size={20} className="text-red-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-slate-800 mb-1">
                ¿Confirmas la eliminación?
              </h3>
              <p className="text-sm text-slate-600">
                Se eliminará la gira <strong>"{gira.nombre_gira}"</strong>
              </p>
            </div>
          </div>

          {puedeMostrarCheckbox && (
            <label
              className={`flex items-center gap-2 mb-4 p-2 rounded ${
                puedeNotificar
                  ? "hover:bg-slate-50 cursor-pointer"
                  : "opacity-60 cursor-not-allowed"
              }`}
            >
              <input
                type="checkbox"
                checked={shouldNotify}
                disabled={!puedeNotificar}
                onChange={(e) => {
                  if (puedeNotificar) {
                    setShouldNotify(e.target.checked);
                  }
                }}
                className="rounded text-indigo-600 accent-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <span className="text-sm text-slate-700">
                Notificar esta cancelación a los músicos confirmados
                {!puedeNotificar && (
                  <span className="text-xs text-slate-400 ml-1">
                    (notificaciones desactivadas)
                  </span>
                )}
              </span>
            </label>
          )}

          <div className="flex gap-2 justify-end">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={() => onConfirm(shouldNotify)}
              className="px-4 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors flex items-center gap-2"
            >
              <IconTrash size={16} />
              Confirmar
            </button>
          </div>
        </div>
      );
    };

    const toastId = toast.custom(
      (t) => (
        <DeleteConfirmToast
          onConfirm={async (shouldNotify) => {
            toast.dismiss(t);
            const loadingToastId = toast.loading(
              "Procesando eliminación y notificaciones...",
            );
            setActionLoading(true);

            try {
              // 1) Obtener roster de confirmados
              const { roster } = await fetchRosterForGira(supabase, gira);
              const confirmadosConMail = roster.filter(
                (m) => m.estado_gira === "confirmado" && m.mail,
              );
              const emails = confirmadosConMail.map((m) => m.mail);
              const primerNombre =
                confirmadosConMail[0]?.nombre_completo || "Participante";

              // 2) Enviar mail de cancelación si está marcado y hay destinatarios
              if (shouldNotify && emails.length > 0) {
                const { data: mailData, error: mailError } =
                  await supabase.functions.invoke("mails_produccion", {
                    body: {
                      action: "enviar_mail",
                      templateId: "convocatoria_gira",
                      bcc: emails,
                      nombre: primerNombre,
                      gira: gira.nombre_gira,
                      detalle: {
                        variant: "GIRA_ELIMINADA",
                        nomenclador: gira.nomenclador || gira.nombre_gira,
                        fecha_desde: gira.fecha_desde || "",
                        fecha_hasta: gira.fecha_hasta || "",
                        zona: gira.zona || "",
                        reason:
                          "La gira ha sido cancelada definitivamente y eliminada del cronograma.",
                      },
                    },
                  });

                if (mailError || mailData?.error) {
                  const msg =
                    mailError?.message || mailData?.error || "Error desconocido";
                  toast.error(
                    `No se pudo enviar el correo: ${msg}. La gira no se eliminará.`,
                    { id: loadingToastId },
                  );
                  setActionLoading(false);
                  return;
                }
              }

              // 3) Eliminar la gira
              const res = await deleteGira(gira.id);
              if (res.success) {
                toast.success(
                  `Gira "${gira.nombre_gira}" eliminada correctamente${
                    shouldNotify && emails.length > 0
                      ? ` y ${emails.length} músico(s) notificado(s)`
                      : ""
                  }.`,
                  { id: loadingToastId },
                );
                fetchGiras();
              } else {
                toast.error(`Error al eliminar: ${res.error}`, {
                  id: loadingToastId,
                });
              }
            } catch (err) {
              console.error("Error eliminando gira:", err);
              toast.error(
                `Error inesperado: ${err.message || "Error desconocido"}`,
                { id: loadingToastId },
              );
            } finally {
              setActionLoading(false);
            }
          }}
          onCancel={() => toast.dismiss(t)}
        />
      ),
      {
        duration: Infinity, // Toast persistente hasta que el usuario interactúe
      },
    );
  };
  const startEdit = async (gira) => {
    loadGiraIntoForm(gira);
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
    if (type === "EVENTO") updateView("AGENDA", currentGira.id);
    else if (type === "OBRA") updateView("REPERTOIRE", currentGira.id);
    else if (type === "HABITACION")
      updateView("LOGISTICS", currentGira.id, "rooming");
  };

  const [filterStatus, setFilterStatus] = useState(() => {
    // Músico de fila: solo Vigente
    if (isPersonal) return new Set(["Vigente"]);
    // Admin/editor/management: Vigente + Borrador + Pausada. Coordinadores se ajustan en useEffect.
    return new Set(["Vigente", "Borrador", "Pausada"]);
  });
  // -----------------------------------------------
  const [resolvedRoster, setResolvedRoster] = useState(null);
  const handleRosterResolved = (rosterData) => setResolvedRoster(rosterData);
  const enrichedRoster = useMemo(
    () => (!enrichedRosterData ? [] : enrichedRosterData),
    [enrichedRosterData],
  );
  const toggleFilterStatus = (status) =>
    setFilterStatus((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(status)) newSet.delete(status);
      else newSet.add(status);
      return newSet;
    });

  const filteredGiras = useMemo(() => {
    return giras.filter((g) => {
      if (filterType.size > 0 && !filterType.has(g.tipo)) return false;
      if (filterDateStart && g.fecha_hasta < filterDateStart) return false;
      if (filterDateEnd && g.fecha_desde > filterDateEnd) return false;
      const estadoGira = g.estado || "Borrador";
      if (filterStatus.size > 0 && !filterStatus.has(estadoGira)) return false;
      return true;
    });
  }, [giras, filterType, filterDateStart, filterDateEnd, filterStatus]);

  const toggleFilterType = (type) =>
    setFilterType((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(type)) newSet.delete(type);
      else newSet.add(type);
      return newSet;
    });

  const allCalendarEvents = useMemo(() => {
    return giras.flatMap((gira) => {
      if (!gira.eventos) return [];

      return gira.eventos
        .map((evento) => {
          // 1. Validación: Si faltan datos, no procesamos
          if (!evento.fecha || !evento.hora_inicio) return null;

          const startStr = `${evento.fecha}T${evento.hora_inicio}`;
          const startDate = new Date(startStr);

          // 2. Validación: Si la fecha generada es inválida
          if (isNaN(startDate.getTime())) return null;

          const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000);

          return {
            id: evento.id,
            title: gira.nombre_gira,
            subtitle: evento.locaciones?.nombre || "",
            start: startStr,
            end: endDate.toISOString(), // Ahora es seguro llamarlo
            programLabel: (
              evento.tipos_evento?.nombre || "Evento"
            ).toUpperCase(),
            programType: gira.tipo,
            programName: gira.nombre_gira,
            location: evento.locaciones?.nombre || "Sin lugar",
            giraId: gira.id,
            eventType: evento.tipos_evento?.nombre || "",
          };
        })
        .filter(Boolean); // 3. Filtramos los nulos (eventos inválidos)
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
      toast.error("Error al actualizar: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const canEditGira = (gira) => {
    if (isEditor) return true;
    if (gira.tipo !== "Ensamble") return false;
    const fuentes = gira.giras_fuentes || [];
    return fuentes.some(
      (f) => f.tipo === "ENSAMBLE" && coordinatedEnsembles.has(f.valor_id),
    );
  };

  const canCreate = isEditor || coordinatedEnsembles.size > 0;
  const isDetailView =
    [
      "AGENDA",
      "REPERTOIRE",
      "ROSTER",
      "LOGISTICS",
      "MEALS_PERSONAL",

      "DIFUSION",
      "EDICION",
    ].includes(mode) && selectedGira;

  const tourNavItems = [
    { mode: "AGENDA", label: "Agenda", icon: IconCalendar },
    { mode: "REPERTOIRE", label: "Repertorio", icon: IconMusic },
    { mode: "MEALS_PERSONAL", label: "Mis Comidas", icon: IconUtensils },
    { mode: "LOGISTICS", label: "Logística", icon: IconSettingsWheel },
    { mode: "ROSTER", label: "Personal", icon: IconUsers },
    { mode: "DIFUSION", label: "Difusión", icon: IconMegaphone },
    { mode: "EDICION", label: "Edición", icon: IconEdit },
  ];

  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
      <div className="bg-white border-b border-slate-200 sticky top-0 shadow-sm shrink-0 z-40">
        {isDetailView ? (
          <div className="px-4 py-2 flex flex-col sm:flex-row items-center justify-between gap-3 print:hidden">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                onClick={() => updateView("LIST")}
                className={`p-2 rounded-full hover:bg-slate-100 text-slate-500 transition-colors ${
                  isGuest ? "invisible" : ""
                }`}
                title="Volver al listado"
              >
                {" "}
                <IconArrowLeft size={20} />{" "}
              </button>
              <div className="flex flex-col overflow-hidden">
                <h2 className="text-m font-bold text-slate-800 truncate leading-tight">{`${selectedGira.mes_letra} | ${selectedGira.nomenclador}. ${selectedGira.nombre_gira}`}</h2>
                <div className="flex items-center gap-2">
                  {isGuest && !user.isGeneral && (
                    <div className="hidden sm:flex animate-in fade-in items-center gap-1 bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full text-[10px] font-bold border border-indigo-200 whitespace-nowrap">
                      <IconUsers size={12} />
                      {user.nombre} {user.apellido}
                    </div>
                  )}
                  <span className="font-medium bg-indigo-50 text-indigo-700 px-1.5 rounded text-xs">
                    {selectedGira.tipo}
                  </span>
                  <span className="truncate text-xs text-slate-500">
                    {selectedGira.zona}
                  </span>
                </div>
              </div>
            </div>

            {isEditor && (
              <div className="hidden md:flex items-center gap-2">
                <SectionStatusControl
                  supabase={supabase}
                  giraId={selectedGira.id}
                  sectionKey={activeSection?.key || "GENERAL"}
                  sectionLabel={activeSection?.label || "Estado General"}
                  currentUserId={user.id}
                  onUpdate={fetchGiras}
                  roster={enrichedRoster}
                />
                <CommentButton
                  supabase={supabase}
                  entityType="GIRA"
                  entityId={String(selectedGira.id)}
                  onClick={() => {
                    console.log(
                      "Abriendo comentarios para Gira ID:",
                      selectedGira.id,
                    );
                    setCommentsState({
                      type: "GIRA",
                      id: String(selectedGira.id),
                      title: selectedGira.nombre_gira,
                    });
                  }}
                  className="hover:bg-indigo-50"
                />
              </div>
            )}
            {(isEditor || isPersonal || isGuest || isDifusion) && ( // <--- AGREGAR isDifusion aquí
              <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg overflow-x-auto max-w-full no-scrollbar">
                {tourNavItems
                  .filter((item) => {
                    // RESTRICCIÓN PARA ROL DIFUSIÓN: Solo ve la tab de Difusión
                    if (isDifusion) return item.mode === "DIFUSION";

                    if (item.mode === "MEALS_PERSONAL")
                      return isGuest && !user.isGeneral;

                    if (item.mode === "EDICION")
                      return canEditGira(selectedGira);

                    if (isEditor || canEditGira(selectedGira)) return true;

                    return ["AGENDA", "REPERTOIRE", "SEATING"].includes(
                      item.mode,
                    );
                  })
                  .map((item) => {
                    const isActive = mode === item.mode;
                    return (
                      <button
                        key={item.mode}
                        onClick={() => updateView(item.mode, selectedGira.id)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all whitespace-nowrap ${
                          isActive
                            ? "bg-white text-indigo-600 shadow-sm"
                            : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                        }`}
                        title={item.label}
                      >
                        <item.icon size={16} strokeWidth={isActive ? 2.5 : 2} />
                        <span
                          className={`${isActive ? "inline" : "hidden 2xl:inline"}`}
                        >
                          {item.label}
                        </span>
                      </button>
                    );
                  })}
              </div>
            )}
          </div>
        ) : (
          <div className="px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="w-full sm:w-auto">
              <GirasListControls
                mode={mode}
                updateView={updateView}
                showRepertoireInCards={showRepertoireInCards}
                setShowRepertoireInCards={setShowRepertoireInCards}
                showFiltersMobile={showFiltersMobile}
                setShowFiltersMobile={setShowFiltersMobile}
                filterDateStart={filterDateStart}
                setFilterDateStart={setFilterDateStart}
                filterDateEnd={filterDateEnd}
                setFilterDateEnd={setFilterDateEnd}
                filterType={filterType}
                toggleFilterType={toggleFilterType}
                PROGRAM_TYPES={PROGRAM_TYPES}
                filterStatus={filterStatus}
                toggleFilterStatus={toggleFilterStatus}
              />
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden sm:block">
                <button
                  id="btn-sync-global"
                  onClick={handleGlobalSync}
                  className="bg-indigo-50 hover:bg-indigo-100 text-indigo-600 p-2 rounded-full transition-colors flex items-center justify-center border border-indigo-200"
                  title="Actualizar nomencladores y carpetas en Drive"
                >
                  {" "}
                  <IconDrive size={20} />{" "}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div
        ref={scrollContainerRef}
        // Cambiamos 'overflow-x-hidden' por 'overflow-x-auto' y agregamos bg-slate-50
        className="flex-1 overflow-y-auto overflow-x-auto relative bg-slate-50 print:overflow-visible print:h-auto"
      >
        {mode === "FULL_AGENDA" && <AgendaGeneral supabase={supabase} />}
        {mode === "CALENDAR" && <MusicianCalendar supabase={supabase} />}
        {mode === "WEEKLY" && (
          <WeeklyCalendar
            rawEvents={allCalendarEvents}
            tours={giras}
            updateEventInSupabase={handleUpdateCalendarEvent}
          />
        )}
        {mode === "AGENDA" && selectedGira && (
          <GiraAgenda
            supabase={supabase}
            gira={selectedGira}
            onBack={() => updateView("LIST")}
          />
        )}
        {mode === "REPERTOIRE" && selectedGira && (
          <ProgramRepertoire
            supabase={supabase}
            program={selectedGira}
            initialTab={currentTab}
            onBack={() => updateView("LIST")}
          />
        )}
        {mode === "SEATING" && selectedGira && (
          <ProgramSeating
            supabase={supabase}
            program={selectedGira}
            onBack={() => updateView("LIST")}
          />
        )}
        {mode === "ROSTER" && selectedGira && (
          <GiraRoster
            supabase={supabase}
            gira={selectedGira}
            onBack={() => updateView("LIST")}
            onDataChange={handleChildDataChange}
            onNotificacionInicialSent={() => fetchGiras()}
          />
        )}
        {mode === "DIFUSION" && selectedGira && (
          <GiraDifusion
            supabase={supabase}
            gira={selectedGira}
            onBack={() => updateView("LIST")}
          />
        )}
        {mode === "LOGISTICS" && selectedGira && !isGuest && (
          <LogisticsDashboard
            supabase={supabase}
            gira={selectedGira}
            initialTab={currentTab}
            onBack={() => updateView("LIST")}
            onDataChange={handleChildDataChange}
          />
        )}
        {mode === "MEALS_PERSONAL" && selectedGira && (
          <div className="h-full flex flex-col bg-slate-50">
            <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-2 shrink-0">
              <button
                onClick={() => updateView("LIST")}
                className="p-2 hover:bg-slate-100 rounded-full text-slate-500"
              >
                <IconArrowLeft size={20} />
              </button>
              {<ManualTrigger section="mis_comidas" size="sm" />}
              <h2 className="text-lg font-bold text-slate-800">
                Mi Asistencia -{" "}
                <span className="text-slate-500 text-sm font-normal">
                  {selectedGira.nombre_gira}
                </span>
              </h2>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <MealsAttendancePersonal
                supabase={supabase}
                gira={selectedGira}
                userId={user.id}
              />
            </div>
          </div>
        )}
        {mode === "EDICION" && selectedGira && (
          <div className="h-full overflow-y-auto bg-slate-50 p-6">
            <GiraForm
              supabase={supabase}
              giraId={selectedGira.id}
              formData={formData}
              setFormData={setFormData}
              onCancel={() => updateView("AGENDA")}
              onSave={handleSave}
              onRefresh={handleGiraUpdate}
              loading={loading}
              isNew={false}
              enableAutoSave={true}
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
          </div>
        )}
        {loading && !selectedGira && mode !== "LIST" && mode !== "CALENDAR" && (
          <div className="flex h-full items-center justify-center text-slate-400">
            <IconLoader className="animate-spin mr-2" /> Cargando programa...
          </div>
        )}

        {mode === "LIST" && (
          <div className="p-4 space-y-4">
            {canCreate && !editingId && (
              <>
                {!isAdding && (
                  <button
                    onClick={() => {
                      setIsAdding(true);

                      // 1. PRE-SELECCIONAR ENSAMBLES SI ES COORDINADOR
                      let initialSources = [];
                      if (isCoordinator) {
                        initialSources = Array.from(coordinatedEnsembles).map(
                          (id) => {
                            const ens = ensemblesList.find(
                              (e) => e.value === id,
                            );
                            return {
                              tipo: "ENSAMBLE",
                              valor_id: id,
                              label: ens ? ens.label : "Mi Ensamble",
                            };
                          },
                        );
                      }

                      setFormData({
                        nombre_gira: "",
                        subtitulo: "",
                        fecha_desde: "",
                        fecha_hasta: "",
                        // 2. FORZAR TIPO
                        tipo: isCoordinator
                          ? "Ensamble"
                          : isEditor
                            ? "Sinfónico"
                            : "Ensamble",
                        zona: "",
                        token_publico: "",
                      });

                      setSelectedLocations(new Set());
                      setSelectedSources(initialSources); // <--- APLICAR PRE-SELECCIÓN
                      setSelectedStaff([]);
                    }}
                    className="w-full py-3 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 hover:border-indigo-500 hover:bg-indigo-50 flex justify-center gap-2 font-medium"
                  >
                    <IconPlus size={20} />
                    {/* 3. TEXTO DINÁMICO */}
                    {isCoordinator
                      ? "Nuevo Programa de Ensamble"
                      : "Crear Nuevo Programa"}
                  </button>
                )}
                {isAdding && (
                  <GiraForm
                    supabase={supabase}
                    giraId={null}
                    formData={formData}
                    setFormData={setFormData}
                    // ... (props existentes) ...
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
                    // --- NUEVAS PROPS PARA VALIDACIÓN ---
                    isCoordinator={isCoordinator}
                    coordinatedEnsembles={coordinatedEnsembles}
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
                    // ... (props existentes) ...
                    formData={formData}
                    setFormData={setFormData}
                    onCancel={closeForm}
                    onSave={handleSave}
                    onRefresh={async () => {
                      await fetchGiras();
                    }}
                    loading={loading}
                    isNew={false}
                    enableAutoSave={true}
                    locationsList={locationsList}
                    selectedLocations={selectedLocations}
                    setSelectedLocations={setSelectedLocations}
                    ensemblesList={ensemblesList}
                    allIntegrantes={allIntegrantes}
                    selectedSources={selectedSources}
                    setSelectedSources={setSelectedSources}
                    selectedStaff={selectedStaff}
                    setSelectedStaff={setSelectedStaff}
                    isCoordinator={isCoordinator}
                    coordinatedEnsembles={coordinatedEnsembles}
                  />
                );
              }
              const userCanEditThis = canEditGira(gira);
              const isHighlighted =
                highlightedGiraId &&
                String(gira.id) === String(highlightedGiraId);

              return (
                <GiraCard
                  key={gira.id}
                  gira={gira}
                  updateView={updateView}
                  isEditor={userCanEditThis}
                  isPersonal={isPersonal}
                  userRole={userRole}
                  startEdit={startEdit}
                  handleDelete={handleDelete}
                  setGlobalCommentsGiraId={setGlobalCommentsGiraId}
                  setCommentsState={setCommentsState}
                  activeMenuId={activeMenuId}
                  setActiveMenuId={setActiveMenuId}
                  showRepertoireInCards={showRepertoireInCards}
                  ensemblesList={ensemblesList}
                  onMove={handleOpenMove}
                  onDuplicate={handleOpenDup}
                  supabase={supabase}
                  onDelete={() => handleDeleteGira(gira)}
                  isHighlighted={isHighlighted}
                />
              );
            })}
          </div>
        )}
      </div>
      <MoveGiraModal
        isOpen={showMoveModal}
        onClose={() => setShowMoveModal(false)}
        onConfirm={onConfirmMove}
        gira={actionGira}
        loading={actionLoading}
      />
      <DuplicateGiraModal
        isOpen={showDupModal}
        onClose={() => setShowDupModal(false)}
        onConfirm={onConfirmDup}
        gira={actionGira}
        loading={actionLoading}
      />
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
