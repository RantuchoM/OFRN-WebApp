import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Calendar,
  dateFnsLocalizer,
  Views,
  Navigate,
} from "react-big-calendar";
import {
  format,
  parse,
  startOfWeek,
  getDay,
  parseISO,
} from "date-fns";
import { isSalidaHoyOFutura } from "./viajeSalidaTemporal";
import { es } from "date-fns/locale";
import { useSearchParams } from "react-router-dom";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { supabaseOficinaExterna as supabase } from "../../../services/supabase";
import {
  rbcEventStyleFromViajeResource,
  scrnTransporteAccentStyle,
  scrnTransporteColorFromEntity,
} from "./scrnTransporteColor";
import { cupoPasajerosViaje } from "./scrnPlazasCapacidad";
import SolicitudModal from "./SolicitudModal";
import ProponerNuevoViajeModal from "./ProponerNuevoViajeModal";
import EditarPerfilScrnModal from "./EditarPerfilScrnModal";
import AdminSCRNPanel from "./AdminSCRNPanel";
import MisReservas from "./MisReservas";
import MisEnvios from "./MisEnvios";
import EnviarPaqueteModal from "./EnviarPaqueteModal";
import ScrnNotificacionesDropdown from "./ScrnNotificacionesDropdown";
import ManagementSectionCard from "../../Management/ManagementSectionCard";
import {
  IconSearch,
  IconCar,
  IconSend,
  IconManagement,
  IconHome,
  IconSpiralNotebook,
  IconFilter,
  IconCalendar,
  IconList,
  IconClock,
  IconMapPin,
  IconPlus,
  IconUser,
  IconLogOut,
  IconChevronDown,
  IconX,
} from "../../../components/ui/Icons";
import "./scrnTransporteLayout.css";

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: (date) => startOfWeek(date, { weekStartsOn: 1 }),
  getDay,
  locales: { es },
});

function formatDateTime(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString("es-AR", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatDateShort(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString("es-AR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function plazasBadgeClass(n) {
  const libres = Math.max(Number(n) || 0, 0);
  if (libres <= 0) {
    return "border-red-200 bg-red-50 text-red-800";
  }
  if (libres <= 2) {
    return "border-amber-200 bg-amber-50 text-amber-900";
  }
  return "border-emerald-200 bg-emerald-50 text-emerald-900";
}

const EMPTY_FILTERS = {
  idTransporte: "",
  fechaDesde: "",
  fechaHasta: "",
  destino: "",
  minDisponibles: "",
};

const filterFieldClass =
  "w-full rounded-none border border-[#c5d0dc] bg-white px-3 py-2.5 text-sm text-slate-800 transition focus:border-[#0054a6] focus:outline-none focus:ring-1 focus:ring-[#0054a6]";
const filterLabelClass =
  "mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500";

/** prioridad si hubiera varias reservas en el mismo viaje */
const RANK_ESTADO_RESERVA = { aceptada: 3, pendiente: 2, cancelada: 1 };

function normalizarEstadoReservaScrn(estado) {
  const x = String(estado || "pendiente").toLowerCase();
  if (x === "aceptada") return "aceptada";
  if (x === "cancelada") return "cancelada";
  return "pendiente";
}

/** Sombra exterior para eventos del calendario según estado de la reserva del usuario */
function boxShadowReservaEnViaje(estado) {
  if (estado === "aceptada") {
    return "0 0 0 3px rgba(34, 197, 94, 0.95), 0 0 0 1px rgba(255,255,255,0.75) inset";
  }
  if (estado === "pendiente") {
    return "0 0 0 3px rgba(234, 179, 8, 0.95), 0 0 0 1px rgba(255,255,255,0.75) inset";
  }
  if (estado === "cancelada") {
    return "0 0 0 3px rgba(239, 68, 68, 0.95), 0 0 0 1px rgba(255,255,255,0.75) inset";
  }
  return null;
}

function labelEstadoReservaScrn(estado) {
  if (estado === "aceptada") return "Aceptada";
  if (estado === "pendiente") return "Pendiente";
  if (estado === "cancelada") return "Cancelada";
  return "";
}

function tituloSufijoCalendarioReserva(estado) {
  const l = labelEstadoReservaScrn(estado);
  return l ? ` · ${l}` : "";
}

function emojiVacantes(plazasDisponibles) {
  const libres = Math.max(Number(plazasDisponibles || 0), 0);
  if (libres <= 0) return "🔴";
  if (libres <= 2) return "🟡";
  return "🟢";
}

const VIEW_MODES = ["calendario", "agenda", "gestion"];
const USER_AREAS = ["inicio", "explorar", "viajes", "envios"];
const ADMIN_VIEWS = ["pendientes", "recorridos", "datos_generales"];
const PENDIENTE_SECCION = ["viajes", "pasajeros", "paquetes"];

function scrnPendienteBadgeClass(count, selected = false) {
  const n = Math.max(0, Number(count) || 0);
  if (n <= 0) {
    return selected
      ? "border border-white/40 bg-white/15 text-white"
      : "border border-slate-300 bg-slate-200 text-slate-600";
  }
  return selected
    ? "border border-amber-300 bg-amber-400 text-amber-950"
    : "border border-amber-600 bg-amber-500 text-white";
}

export default function TransporteSCRNMain({
  user,
  profile,
  onLogout,
  onProfileRefresh,
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const searchParamsRef = useRef(searchParams);
  searchParamsRef.current = searchParams;
  const isAdmin = Boolean(profile?.es_admin);
  const [viewMode, setViewMode] = useState("calendario");
  const [adminView, setAdminView] = useState("pendientes");
  const [adminPendienteSeccion, setAdminPendienteSeccion] = useState(null);
  const [pendienteCounts, setPendienteCounts] = useState({
    viajes: 0,
    pasajeros: 0,
    paquetes: 0,
  });
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [transportes, setTransportes] = useState([]);
  const [viajes, setViajes] = useState([]);
  const [localidades, setLocalidades] = useState([]);
  const [scrnPerfiles, setScrnPerfiles] = useState([]);
  const [tiposTransporte, setTiposTransporte] = useState([]);
  const [tiposEmojiMap, setTiposEmojiMap] = useState({});
  const [acceptedByViaje, setAcceptedByViaje] = useState({});
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  /** id_viaje → aceptada | pendiente | cancelada (reserva del usuario; si varias, gana la de mayor “peso”) */
  const [estadoMiReservaPorViajeId, setEstadoMiReservaPorViajeId] = useState({});
  const initialDataLoaded = useRef(false);
  const [selectedViaje, setSelectedViaje] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [proponerNuevoOpen, setProponerNuevoOpen] = useState(false);
  const [perfilEditOpen, setPerfilEditOpen] = useState(false);
  const [focusTransportRequest, setFocusTransportRequest] = useState(null);
  const [focusViajeRequest, setFocusViajeRequest] = useState(null);
  const [userArea, setUserArea] = useState("inicio");
  /** "menu" = elegir qué buscar; "paquetes" = viajes con bodega; "pasajeros" = viajes con plazas (Explorar). */
  const [explorarFase, setExplorarFase] = useState("menu");
  const [paqueteModalOpen, setPaqueteModalOpen] = useState(false);
  const [paqueteContextViaje, setPaqueteContextViaje] = useState(null);
  const [deepLinkNotice, setDeepLinkNotice] = useState("");
  const [agendaVerHistorial, setAgendaVerHistorial] = useState(false);
  const [gestionLandingOpen, setGestionLandingOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth >= 768 : true,
  );
  const urlActionControlRef = useRef(false);
  const ignoreUrlSolicitudRef = useRef(false);
  const ignoreUrlProponerRef = useRef(false);
  const pendingUrlSyncRef = useRef(null);
  const lastWrittenQueryRef = useRef("");
  const [filters, setFilters] = useState({ ...EMPTY_FILTERS });

  const refreshData = useCallback(async () => {
    if (!initialDataLoaded.current) {
      setLoading(true);
    }
    const [
      { data: transportesData },
      { data: viajesData },
      { data: localidadesData },
      { data: perfilesData },
    ] = await Promise.all([
      supabase
        .from("scrn_transportes")
        .select("*")
        .eq("activo", true)
        .order("nombre"),
      supabase
        .from("scrn_viajes")
        .select("*, scrn_transportes(*)")
        .order("fecha_salida", { ascending: true }),
      supabase.from("localidades").select("id, localidad").order("localidad"),
      supabase
        .from("scrn_perfiles")
        .select("id, nombre, apellido, dni, cargo")
        .order("apellido", { ascending: true })
        .order("nombre", { ascending: true }),
    ]);

    const viajeList = viajesData || [];
    const viajeIds = viajeList.map((item) => item.id);

    let acceptedMap = {};
    if (viajeIds.length > 0) {
      const { data: todasReservas } = await supabase
        .from("scrn_reservas")
        .select("id, id_viaje, estado")
        .in("id_viaje", viajeIds);

      const reservasList = todasReservas || [];
      const rids = reservasList.map((r) => r.id);
        const paxAceptByReserva = {};
        const paxTotalByReserva = {};
      if (rids.length > 0) {
        let paxRes = await supabase
          .from("scrn_reserva_pasajeros")
          .select("id_reserva, estado")
          .in("id_reserva", rids);
        let conEstadoPax = true;
        if (paxRes.error) {
          paxRes = await supabase
            .from("scrn_reserva_pasajeros")
            .select("id_reserva")
            .in("id_reserva", rids);
          conEstadoPax = false;
        }
        (paxRes.data || []).forEach((row) => {
          paxTotalByReserva[row.id_reserva] = (paxTotalByReserva[row.id_reserva] || 0) + 1;
          if (conEstadoPax && row.estado !== "aceptada") return;
          paxAceptByReserva[row.id_reserva] = (paxAceptByReserva[row.id_reserva] || 0) + 1;
        });
        const byViaje = {};
        if (conEstadoPax) {
          reservasList.forEach((r) => {
            const pax = paxAceptByReserva[r.id] || 0;
            const legacyTitular = paxTotalByReserva[r.id] ? 0 : r.estado === "aceptada" ? 1 : 0;
            byViaje[r.id_viaje] = (byViaje[r.id_viaje] || 0) + legacyTitular + pax;
          });
        } else {
          reservasList.forEach((r) => {
            if (r.estado !== "aceptada") return;
            const pax = paxAceptByReserva[r.id] || 0;
            const legacyTitular = paxTotalByReserva[r.id] ? 0 : 1;
            byViaje[r.id_viaje] = (byViaje[r.id_viaje] || 0) + legacyTitular + pax;
          });
        }
        acceptedMap = byViaje;
      }
    }

    const { data: tiposData, error: tiposError } = await supabase
      .from("scrn_tipos_transporte")
      .select("id, nombre, emoji")
      .order("nombre");
    const missingTiposTable =
      tiposError &&
      (tiposError.code === "42P01" ||
        tiposError.code === "PGRST205" ||
        /scrn_tipos_transporte/i.test(tiposError.message || ""));
    if (tiposError && !missingTiposTable) {
      console.error("Error cargando tipos de transporte:", tiposError);
    }

    let estadosPorViaje = {};
    if (user?.id) {
      const { data: reservasUsuario } = await supabase
        .from("scrn_reservas")
        .select("id_viaje, estado")
        .eq("id_usuario", user.id);
      (reservasUsuario || []).forEach((r) => {
        if (r.id_viaje == null) return;
        const e = normalizarEstadoReservaScrn(r.estado);
        const id = r.id_viaje;
        const cur = estadosPorViaje[id];
        if (!cur || RANK_ESTADO_RESERVA[e] > RANK_ESTADO_RESERVA[cur]) {
          estadosPorViaje[id] = e;
        }
      });
    }
    setEstadoMiReservaPorViajeId(estadosPorViaje);

    setTransportes(transportesData || []);
    setViajes(viajeList);
    setLocalidades(localidadesData || []);
    setScrnPerfiles(perfilesData || []);
    const tiposRows = tiposData || [];
    setTiposTransporte(tiposRows.map((item) => item.nombre).filter(Boolean));
    const emMap = {};
    tiposRows.forEach((row) => {
      const k = String(row?.nombre || "").trim().toLowerCase();
      if (!k) return;
      emMap[k] = String(row?.emoji || "").trim();
    });
    setTiposEmojiMap(emMap);
    setAcceptedByViaje(acceptedMap);
    setLoading(false);
    initialDataLoaded.current = true;
  }, [user?.id]);

  useEffect(() => {
    refreshData();
  }, [refreshData, reloadKey]);

  const viajesEnriched = useMemo(
    () =>
      viajes.map((item) => {
        const accepted = acceptedByViaje[item.id] || 0;
        const cupoPax = cupoPasajerosViaje(item, item.scrn_transportes);
        const chofer =
          item.id_chofer != null
            ? (scrnPerfiles || []).find((p) => String(p.id) === String(item.id_chofer)) || null
            : null;
        return {
          ...item,
          chofer,
          reservasAceptadas: accepted,
          plazasDisponibles: Math.max(cupoPax - accepted, 0),
        };
      }),
    [viajes, acceptedByViaje, scrnPerfiles],
  );

  const filteredViajes = useMemo(() => {
    return viajesEnriched.filter((item) => {
      const rawT = String(filters.idTransporte || "").trim();
      const transId = rawT ? Number(rawT) : null;
      const transMatch =
        !rawT || (Number.isFinite(transId) && Number(item.id_transporte) === transId);
      const destinoMatch =
        !filters.destino ||
        item.destino_final?.toLowerCase().includes(filters.destino.toLowerCase());
      const salidaDia = item.fecha_salida
        ? String(item.fecha_salida).slice(0, 10)
        : "";
      const matchDesde = !filters.fechaDesde || (salidaDia && salidaDia >= filters.fechaDesde);
      const matchHasta = !filters.fechaHasta || (salidaDia && salidaDia <= filters.fechaHasta);
      const fechaMatch = matchDesde && matchHasta;
      const minMatch =
        !filters.minDisponibles ||
        item.plazasDisponibles >= Number(filters.minDisponibles);
      return transMatch && destinoMatch && fechaMatch && minMatch;
    });
  }, [filters, viajesEnriched]);

  const viajesExplorarFiltrados = useMemo(() => {
    if (userArea !== "explorar" || explorarFase === "menu") return [];
    if (explorarFase === "paquetes")
      return filteredViajes.filter((v) => !v.paquetes_bodega_llena);
    if (explorarFase === "pasajeros")
      return filteredViajes.filter((v) => (v.plazasDisponibles || 0) > 0);
    return filteredViajes;
  }, [userArea, explorarFase, filteredViajes]);

  const agendaViajesDisplayed = useMemo(() => {
    if (agendaVerHistorial) return viajesExplorarFiltrados;
    return viajesExplorarFiltrados.filter((item) => isSalidaHoyOFutura(item.fecha_salida));
  }, [viajesExplorarFiltrados, agendaVerHistorial]);

  const calendarEvents = useMemo(
    () =>
      viajesExplorarFiltrados.map((item) => {
        const est = user?.id ? estadoMiReservaPorViajeId[item.id] : null;
        const tipoKey = String(item.scrn_transportes?.tipo || "").trim().toLowerCase();
        const tipoEmoji = tiposEmojiMap[tipoKey] || "";
        const vacEmoji = emojiVacantes(item.plazasDisponibles);
        const pref = [vacEmoji, tipoEmoji].filter(Boolean).join(" ");
        return {
          title: `${pref} ${item.motivo ? `${item.motivo}: ` : ""}${item.origen} -> ${item.destino_final} (${item.plazasDisponibles} libres)${est ? tituloSufijoCalendarioReserva(est) : ""}`
            .replace(/\s+/g, " ")
            .trim(),
          start: parseISO(item.fecha_salida),
          end: parseISO(item.fecha_llegada_estimada),
          resource: item,
        };
      }),
    [viajesExplorarFiltrados, user?.id, estadoMiReservaPorViajeId, tiposEmojiMap],
  );

  const availableTipos = useMemo(() => {
    if (tiposTransporte.length > 0) return tiposTransporte;
    const unique = new Set(
      transportes.map((item) => item.tipo).filter((item) => Boolean(item)),
    );
    return [...unique].sort((a, b) => a.localeCompare(b));
  }, [transportes, tiposTransporte]);

  const totalPendientes = useMemo(
    () => pendienteCounts.viajes + pendienteCounts.pasajeros + pendienteCounts.paquetes,
    [pendienteCounts],
  );

  const activeFilterCount = useMemo(
    () =>
      Object.values(filters).filter((v) => String(v || "").trim() !== "").length,
    [filters],
  );

  const clearFilters = useCallback(() => {
    setFilters({ ...EMPTY_FILTERS });
  }, []);

  const proximosViajesInicio = useMemo(() => {
    return [...viajesEnriched]
      .filter((v) => isSalidaHoyOFutura(v.fecha_salida))
      .sort((a, b) => String(a.fecha_salida || "").localeCompare(String(b.fecha_salida || "")))
      .slice(0, 3);
  }, [viajesEnriched]);

  const goHome = useCallback(() => {
    setUserArea("inicio");
    setExplorarFase("menu");
    if (viewMode === "gestion") setViewMode("calendario");
  }, [viewMode]);

  const goExplorar = useCallback(() => {
    setUserArea("explorar");
    setExplorarFase("menu");
    setViewMode("calendario");
  }, []);

  const goViajes = useCallback(() => {
    setUserArea("viajes");
    if (viewMode === "gestion") setViewMode("calendario");
  }, [viewMode]);

  const goEnvios = useCallback(() => {
    setUserArea("envios");
    if (viewMode === "gestion") setViewMode("calendario");
  }, [viewMode]);

  const refreshPendienteCounts = useCallback(async () => {
    if (!isAdmin) {
      setPendienteCounts({ viajes: 0, pasajeros: 0, paquetes: 0 });
      return;
    }
    const [nuevos, reservas, paqs] = await Promise.all([
      supabase
        .from("scrn_solicitudes_nuevo_viaje")
        .select("id", { count: "exact", head: true })
        .eq("estado", "pendiente"),
      supabase
        .from("scrn_reservas")
        .select("id", { count: "exact", head: true })
        .eq("estado", "pendiente"),
      supabase
        .from("scrn_solicitudes_paquete")
        .select("id", { count: "exact", head: true })
        .eq("estado", "pendiente"),
    ]);
    setPendienteCounts({
      viajes: nuevos.count ?? 0,
      pasajeros: reservas.count ?? 0,
      paquetes: paqs.error ? 0 : (paqs.count ?? 0),
    });
  }, [isAdmin, reloadKey]);

  useEffect(() => {
    void refreshPendienteCounts();
  }, [refreshPendienteCounts]);

  useEffect(() => {
    const qpView = (searchParams.get("view") || "").toLowerCase();
    let qpAd = (searchParams.get("adminView") || "").toLowerCase();
    if (qpAd === "solicitudes") qpAd = "pendientes";
    if (qpAd === "transportes") qpAd = "datos_generales";
    const nextView = VIEW_MODES.includes(qpView) ? qpView : "calendario";
    const safeView = !isAdmin && nextView === "gestion" ? "calendario" : nextView;
    if (safeView !== viewMode) setViewMode(safeView);

    const nextAdminView = ADMIN_VIEWS.includes(qpAd) ? qpAd : "pendientes";
    if (nextAdminView !== adminView) setAdminView(nextAdminView);

    if (isAdmin) {
      const pSecRaw = (searchParams.get("pSec") || "").toLowerCase();
      const nextPendienteSeccion = PENDIENTE_SECCION.includes(pSecRaw) ? pSecRaw : null;
      setAdminPendienteSeccion(nextPendienteSeccion);
    } else {
      setAdminPendienteSeccion(null);
    }

    const nextFilters = {
      idTransporte: searchParams.get("transporte") || "",
      fechaDesde: searchParams.get("fechaDesde") || "",
      fechaHasta: searchParams.get("fechaHasta") || "",
      destino: searchParams.get("destino") || "",
      minDisponibles: searchParams.get("minDisponibles") || "",
    };
    setFilters((prev) => {
      const same = Object.keys(nextFilters).every((k) => prev[k] === nextFilters[k]);
      return same ? prev : nextFilters;
    });
    const hasUrlFilters = Object.values(nextFilters).some((v) => String(v || "").trim());
    if (hasUrlFilters) setFiltersOpen(true);

    const qpArea = (searchParams.get("area") || "inicio").toLowerCase();
    const nextArea = USER_AREAS.includes(qpArea) ? qpArea : "inicio";
    setUserArea((prev) => (prev === nextArea ? prev : nextArea));

    const ex = (searchParams.get("ex") || "").toLowerCase();
    if (nextArea === "explorar") {
      if (ex === "paq") setExplorarFase("paquetes");
      else if (ex === "pax") setExplorarFase("pasajeros");
      else setExplorarFase("menu");
    } else {
      setExplorarFase("menu");
    }
  }, [searchParams, isAdmin]);

  useEffect(() => {
    const currentAction = (searchParamsRef.current.get("action") || "").toLowerCase();
    const currentViajeId = searchParamsRef.current.get("viajeId");
    const next = new URLSearchParams();
    next.set("view", viewMode);
    if (isAdmin && viewMode === "gestion") {
      next.set("adminView", adminView);
    }
    if (filters.idTransporte) next.set("transporte", String(filters.idTransporte));
    next.delete("tipo");
    if (filters.fechaDesde) next.set("fechaDesde", filters.fechaDesde);
    if (filters.fechaHasta) next.set("fechaHasta", filters.fechaHasta);
    if (filters.destino) next.set("destino", filters.destino);
    if (filters.minDisponibles) next.set("minDisponibles", filters.minDisponibles);
    if (userArea && userArea !== "inicio") {
      next.set("area", userArea);
    } else {
      next.delete("area");
    }

    if (isAdmin && viewMode === "gestion" && adminView === "pendientes" && adminPendienteSeccion) {
      next.set("pSec", adminPendienteSeccion);
    } else {
      next.delete("pSec");
    }

    if (userArea === "explorar" && explorarFase === "paquetes") {
      next.set("ex", "paq");
    } else if (userArea === "explorar" && explorarFase === "pasajeros") {
      next.set("ex", "pax");
    } else {
      next.delete("ex");
    }

    if (modalOpen && selectedViaje?.id) {
      next.set("action", "solicitar");
      next.set("viajeId", String(selectedViaje.id));
    } else if (proponerNuevoOpen) {
      next.set("action", "proponer");
    } else if (
      currentAction === "solicitar" &&
      currentViajeId &&
      !ignoreUrlSolicitudRef.current
    ) {
      // Conserva deep-link entrante hasta que el efecto lector lo consuma.
      next.set("action", "solicitar");
      next.set("viajeId", currentViajeId);
    } else if (currentAction === "proponer" && !ignoreUrlProponerRef.current) {
      next.set("action", "proponer");
    }

    const current = searchParamsRef.current.toString();
    const target = next.toString();
    if (current === target) {
      lastWrittenQueryRef.current = target;
      if (pendingUrlSyncRef.current) {
        window.clearTimeout(pendingUrlSyncRef.current);
        pendingUrlSyncRef.current = null;
      }
      return;
    }
    if (lastWrittenQueryRef.current === target && pendingUrlSyncRef.current) return;
    if (pendingUrlSyncRef.current) window.clearTimeout(pendingUrlSyncRef.current);
    pendingUrlSyncRef.current = window.setTimeout(() => {
      pendingUrlSyncRef.current = null;
      const latest = searchParamsRef.current.toString();
      if (latest === target) return;
      lastWrittenQueryRef.current = target;
      setSearchParams(next, { replace: true });
    }, 120);
  }, [
    viewMode,
    adminView,
    adminPendienteSeccion,
    userArea,
    filters,
    modalOpen,
    selectedViaje?.id,
    proponerNuevoOpen,
    isAdmin,
    explorarFase,
    setSearchParams,
  ]);

  useEffect(
    () => () => {
      if (pendingUrlSyncRef.current) {
        window.clearTimeout(pendingUrlSyncRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    if (loading) return;
    const action = (searchParams.get("action") || "").toLowerCase();
    const viajeIdParam = searchParams.get("viajeId");
    if (action === "solicitar" && viajeIdParam) {
      if (ignoreUrlSolicitudRef.current) return;
      const idNum = Number(viajeIdParam);
      const targetViaje = viajesEnriched.find((v) => Number(v.id) === idNum);
      if (targetViaje) {
        urlActionControlRef.current = true;
        if (!modalOpen || Number(selectedViaje?.id) !== Number(targetViaje.id)) {
          setSelectedViaje(targetViaje);
          setModalOpen(true);
        }
        if (proponerNuevoOpen) setProponerNuevoOpen(false);
        setDeepLinkNotice("");
      } else {
        setDeepLinkNotice("El enlace de solicitud apunta a un viaje que no está disponible.");
        const next = new URLSearchParams(searchParams);
        next.delete("action");
        next.delete("viajeId");
        setSearchParams(next, { replace: true });
      }
      return;
    }
    if (action === "proponer") {
      if (ignoreUrlProponerRef.current) {
        const next = new URLSearchParams(searchParams);
        next.delete("action");
        setSearchParams(next, { replace: true });
        return;
      }
      urlActionControlRef.current = true;
      if (!proponerNuevoOpen) setProponerNuevoOpen(true);
      if (modalOpen) {
        setModalOpen(false);
        setSelectedViaje(null);
      }
      return;
    }
    if (urlActionControlRef.current && modalOpen && action !== "solicitar") {
      setModalOpen(false);
      setSelectedViaje(null);
    }
    if (urlActionControlRef.current && proponerNuevoOpen && action !== "proponer") {
      setProponerNuevoOpen(false);
    }
    if (!action) {
      urlActionControlRef.current = false;
      ignoreUrlSolicitudRef.current = false;
      ignoreUrlProponerRef.current = false;
    }
  }, [
    searchParams,
    loading,
    viajesEnriched,
    modalOpen,
    selectedViaje?.id,
    proponerNuevoOpen,
    setSearchParams,
  ]);

  const openSolicitud = (viaje) => {
    urlActionControlRef.current = false;
    setSelectedViaje(viaje);
    setModalOpen(true);
    setDeepLinkNotice("");
  };

  const closeSolicitud = () => {
    urlActionControlRef.current = false;
    ignoreUrlSolicitudRef.current = true;
    setModalOpen(false);
    setSelectedViaje(null);
    setDeepLinkNotice("");
  };

  const openProponerNuevo = () => {
    urlActionControlRef.current = false;
    ignoreUrlProponerRef.current = false;
    setProponerNuevoOpen(true);
    setDeepLinkNotice("");
  };

  const closeProponerNuevo = () => {
    urlActionControlRef.current = false;
    ignoreUrlProponerRef.current = true;
    setProponerNuevoOpen(false);
  };

  const openAdminTransportEdit = (transporteId) => {
    if (!isAdmin || !transporteId) return;
    urlActionControlRef.current = false;
    ignoreUrlSolicitudRef.current = true;
    setModalOpen(false);
    setSelectedViaje(null);
    setGestionLandingOpen(false);
    setViewMode("gestion");
    setAdminView("datos_generales");
    setFocusTransportRequest({ id: Number(transporteId), at: Date.now() });
  };

  const openAdminViajeEdit = (viajeId) => {
    if (!isAdmin || !viajeId) return;
    urlActionControlRef.current = false;
    ignoreUrlSolicitudRef.current = true;
    setModalOpen(false);
    setSelectedViaje(null);
    setGestionLandingOpen(false);
    setViewMode("gestion");
    setAdminView("recorridos");
    setFocusViajeRequest({ id: Number(viajeId), at: Date.now() });
  };

  const afterReservation = () => {
    setReloadKey((prev) => prev + 1);
  };

  const openEnviarPaquete = (viajeRow) => {
    if (!viajeRow) return;
    urlActionControlRef.current = false;
    ignoreUrlSolicitudRef.current = true;
    setModalOpen(false);
    setSelectedViaje(null);
    setPaqueteContextViaje(viajeRow);
    setPaqueteModalOpen(true);
  };

  const closePaqueteModal = () => {
    setPaqueteModalOpen(false);
    setPaqueteContextViaje(null);
  };

  useEffect(() => {
    if (!isAdmin && viewMode === "gestion") {
      setViewMode("calendario");
    }
  }, [isAdmin, viewMode]);

  useEffect(() => {
    if (viewMode !== "agenda") setAgendaVerHistorial(false);
  }, [viewMode]);

  return (
    <div className="scrn-shell pb-[4.5rem] md:pb-0">
      <header className="scrn-header">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-3 py-3 sm:px-4 sm:py-3.5 md:flex-row md:items-center md:justify-between">
          <button
            type="button"
            onClick={goHome}
            className="flex min-w-0 items-center gap-2.5 text-left sm:gap-3"
          >
            <img
              src="/pictures/ofrn.jpg"
              alt="Logo OFRN"
              className="h-10 w-auto max-w-[140px] shrink-0 rounded-none border border-[#c5d0dc] bg-white object-contain p-0.5 sm:h-11 sm:max-w-[160px]"
            />
            <div className="min-w-0">
              <h1 className="truncate text-base font-black uppercase tracking-tight text-slate-900 sm:text-lg">
                Transporte SCRN
              </h1>
              <p className="truncate text-[11px] text-slate-500 sm:text-xs">
                {profile.nombre} {profile.apellido}
              </p>
            </div>
          </button>

          <div className="flex flex-wrap items-center gap-1.5 sm:justify-end sm:gap-2">
            <button
              type="button"
              onClick={goHome}
              className={`hidden items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold uppercase tracking-wide transition-colors md:inline-flex ${
                userArea === "inicio" && viewMode !== "gestion"
                  ? "bg-[#0054a6] text-white shadow-sm"
                  : "border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              <IconHome size={14} />
              Inicio
            </button>
            {isAdmin && (
              <button
                type="button"
                onClick={() => {
                  setGestionLandingOpen(false);
                  setAdminPendienteSeccion(null);
                  setAdminView("pendientes");
                  setViewMode("gestion");
                }}
                className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-xs font-bold uppercase tracking-wide transition-colors sm:px-3 ${
                  viewMode === "gestion" && adminView === "pendientes" && !gestionLandingOpen
                    ? "bg-[#0054a6] text-white shadow-sm"
                    : "border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                <IconSpiralNotebook size={15} />
                <span className="hidden sm:inline">Pendientes</span>
                <span
                  className={`min-w-6 rounded-full px-1.5 py-0.5 text-center text-[10px] font-extrabold ${scrnPendienteBadgeClass(
                    totalPendientes,
                    viewMode === "gestion" && adminView === "pendientes" && !gestionLandingOpen,
                  )}`}
                >
                  {totalPendientes}
                </span>
              </button>
            )}
            <ScrnNotificacionesDropdown user={user} reloadToken={reloadKey} />
            <button
              type="button"
              onClick={() => setPerfilEditOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 sm:px-3"
              title="Mi perfil"
            >
              <IconUser size={14} />
              <span className="hidden sm:inline">Perfil</span>
            </button>
            <button
              type="button"
              onClick={onLogout}
              className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-2.5 py-2 text-xs font-bold uppercase tracking-wide text-rose-700 hover:border-rose-300 hover:bg-rose-100 sm:px-3"
              title="Salir"
            >
              <IconLogOut size={14} />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>

        {isAdmin && viewMode === "gestion" && !gestionLandingOpen && (
          <div className="border-t border-slate-200/80 bg-slate-50/90">
            <div className="mx-auto max-w-7xl space-y-2 px-3 py-2.5 sm:px-4">
              <div className="md:hidden">
                <select
                  value={adminView}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === "pendientes") setAdminPendienteSeccion(null);
                    setAdminView(v);
                  }}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700"
                >
                  <option value="pendientes">Pendientes ({totalPendientes})</option>
                  <option value="recorridos">Recorridos</option>
                  <option value="datos_generales">Datos generales</option>
                </select>
              </div>
              <div className="hidden flex-wrap gap-2 md:flex">
                {[
                  { id: "pendientes", label: "Pendientes", badge: totalPendientes },
                  { id: "recorridos", label: "Recorridos" },
                  { id: "datos_generales", label: "Datos generales" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      if (tab.id === "pendientes") setAdminPendienteSeccion(null);
                      setAdminView(tab.id);
                    }}
                    className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold uppercase tracking-wide transition-colors ${
                      adminView === tab.id
                        ? "bg-[#0054a6] text-white shadow-sm"
                        : "border border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                    }`}
                  >
                    {tab.label}
                    {tab.badge != null && (
                      <span
                        className={`min-w-6 rounded-full px-1.5 py-0.5 text-center text-[10px] font-extrabold ${scrnPendienteBadgeClass(
                          tab.badge,
                          adminView === tab.id,
                        )}`}
                      >
                        {tab.badge}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </header>

      <main className="mx-auto max-w-7xl space-y-4 px-3 py-4 sm:px-4 sm:py-5">
        {deepLinkNotice && (
          <section className="rounded-2xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs leading-relaxed text-amber-900">
            {deepLinkNotice}
          </section>
        )}

        {isAdmin && viewMode === "gestion" && gestionLandingOpen && (
          <section className="mx-auto w-full max-w-5xl space-y-4">
            <div className="space-y-1">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#0054a6]">
                Administración
              </p>
              <h2 className="text-xl font-black tracking-tight text-slate-900 sm:text-2xl">
                Gestión
              </h2>
              <p className="max-w-2xl text-sm text-slate-600">
                Solicitudes pendientes, recorridos y datos maestros de la flota.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <ManagementSectionCard
                  square
                title="Pendientes"
                subtitle="Solicitudes y aprobaciones"
                icon={IconSpiralNotebook}
                badge={totalPendientes > 0 ? String(totalPendientes) : null}
                cardClasses="border-amber-100 hover:border-amber-300 hover:shadow-md focus-visible:ring-amber-300"
                iconClasses="bg-amber-50 text-amber-600 group-hover:bg-amber-500 group-hover:text-white"
                titleClasses="text-amber-900 group-hover:text-amber-700"
                onClick={() => {
                  setGestionLandingOpen(false);
                  setAdminPendienteSeccion(null);
                  setAdminView("pendientes");
                }}
              />
              <ManagementSectionCard
                  square
                title="Recorridos"
                subtitle="Alta, edición y historial"
                icon={IconCar}
                cardClasses="border-[#b8d0e8] hover:border-[#0054a6] hover:shadow-md focus-visible:ring-[#8fb4d9]"
                iconClasses="bg-[#e8f1fa] text-[#0054a6] group-hover:bg-[#0054a6] group-hover:text-white"
                titleClasses="text-[#001f40] group-hover:text-[#003d7a]"
                onClick={() => {
                  setGestionLandingOpen(false);
                  setAdminView("recorridos");
                }}
              />
              <ManagementSectionCard
                  square
                title="Datos Generales"
                subtitle="Transportes, localidades y usuarios"
                icon={IconManagement}
                cardClasses="border-sky-100 hover:border-sky-300 hover:shadow-md focus-visible:ring-sky-300"
                iconClasses="bg-sky-50 text-sky-700 group-hover:bg-sky-600 group-hover:text-white"
                titleClasses="text-sky-950 group-hover:text-sky-800"
                onClick={() => {
                  setGestionLandingOpen(false);
                  setAdminView("datos_generales");
                }}
              />
            </div>
          </section>
        )}

        {viewMode !== "gestion" && (
          <>
            {userArea === "inicio" && (
              <div className="mx-auto w-full max-w-5xl space-y-5">
                <section className="border border-[#c5d0dc] bg-white px-4 py-5 sm:px-6 sm:py-6">
                  <div className="border-l-4 border-[#0054a6] pl-3 space-y-1">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#0054a6]">
                      Oficina SCRN
                    </p>
                    <h2 className="text-xl font-black tracking-tight text-slate-900 sm:text-2xl">
                      Hola, {profile.nombre}
                    </h2>
                    <p className="max-w-2xl text-sm leading-relaxed text-slate-600">
                      Reservá plazas, enviá paquetes o proponé un recorrido. Tus pendientes y la
                      agenda de flota están en un solo lugar.
                    </p>
                  </div>
                </section>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {isAdmin && (
                    <ManagementSectionCard
                  square
                      title="Gestión"
                      subtitle="Administración SCRN"
                      icon={IconManagement}
                      badge={totalPendientes > 0 ? String(totalPendientes) : null}
                      cardClasses="border-sky-100 hover:border-sky-300 hover:shadow-md focus-visible:ring-sky-300"
                      iconClasses="bg-sky-50 text-sky-700 group-hover:bg-sky-600 group-hover:text-white"
                      titleClasses="text-sky-950 group-hover:text-sky-800"
                      onClick={() => {
                        setGestionLandingOpen(true);
                        setViewMode("gestion");
                      }}
                    />
                  )}
                  <ManagementSectionCard
                  square
                    title="Explorar"
                    subtitle="Plazas, paquetes o proponer"
                    icon={IconSearch}
                    cardClasses="border-[#b8d0e8] hover:border-[#0054a6] hover:shadow-md focus-visible:ring-[#8fb4d9]"
                    iconClasses="bg-[#e8f1fa] text-[#0054a6] group-hover:bg-[#0054a6] group-hover:text-white"
                    titleClasses="text-[#001f40] group-hover:text-[#003d7a]"
                    onClick={goExplorar}
                  />
                  <ManagementSectionCard
                  square
                    title="Mis viajes"
                    subtitle="Reservas y plazas"
                    icon={IconCar}
                    cardClasses="border-emerald-100 hover:border-emerald-300 hover:shadow-md focus-visible:ring-emerald-300"
                    iconClasses="bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white"
                    titleClasses="text-emerald-900 group-hover:text-emerald-700"
                    onClick={goViajes}
                  />
                  <ManagementSectionCard
                  square
                    title="Mis paquetes"
                    subtitle="Envíos en viajes"
                    icon={IconSend}
                    cardClasses="border-rose-100 hover:border-rose-300 hover:shadow-md focus-visible:ring-rose-300"
                    iconClasses="bg-rose-50 text-rose-600 group-hover:bg-rose-600 group-hover:text-white"
                    titleClasses="text-rose-900 group-hover:text-rose-700"
                    onClick={goEnvios}
                  />
                </div>

                {!loading && proximosViajesInicio.length > 0 && (
                  <section className="space-y-3">
                    <div className="flex items-end justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-extrabold uppercase tracking-wide text-slate-800">
                          Próximas salidas
                        </h3>
                        <p className="text-xs text-slate-500">Vista rápida de la agenda</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setUserArea("explorar");
                          setExplorarFase("pasajeros");
                          setViewMode("agenda");
                        }}
                        className="text-xs font-bold text-[#0054a6] hover:text-[#002b57]"
                      >
                        Ver todas
                      </button>
                    </div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                      {proximosViajesInicio.map((viaje) => (
                        <button
                          key={viaje.id}
                          type="button"
                          onClick={() => {
                            setUserArea("explorar");
                            setExplorarFase("pasajeros");
                            setViewMode("agenda");
                            openSolicitud(viaje);
                          }}
                          className="rounded-2xl border border-slate-200/90 bg-white p-3.5 text-left shadow-sm transition hover:border-[#0054a6] hover:shadow-md"
                          style={scrnTransporteAccentStyle(viaje.scrn_transportes)}
                        >
                          <p className="text-sm font-bold leading-snug text-slate-900">
                            {viaje.origen} → {viaje.destino_final}
                          </p>
                          <p className="mt-1.5 flex items-center gap-1 text-[11px] font-medium text-slate-500">
                            <IconClock size={12} />
                            {formatDateShort(viaje.fecha_salida)}
                          </p>
                          <p className="mt-2">
                            <span
                              className={`inline-flex rounded-lg border px-2 py-0.5 text-[11px] font-bold ${plazasBadgeClass(
                                viaje.plazasDisponibles,
                              )}`}
                            >
                              {viaje.plazasDisponibles} plazas
                            </span>
                          </p>
                        </button>
                      ))}
                    </div>
                  </section>
                )}
              </div>
            )}

            {userArea === "explorar" && viewMode !== "gestion" && explorarFase === "menu" && (
              <div className="mx-auto w-full max-w-5xl space-y-4">
                <div className="space-y-1">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#0054a6]">
                    Buscar
                  </p>
                  <h2 className="text-xl font-black tracking-tight text-slate-900">Explorar</h2>
                  <p className="text-sm text-slate-600">Elegí la acción y después el recorrido.</p>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <ManagementSectionCard
                  square
                    title="Enviar un paquete"
                    subtitle="Bodega disponible"
                    icon={IconSend}
                    cardClasses="border-rose-100 hover:border-rose-300 hover:shadow-md focus-visible:ring-rose-300"
                    iconClasses="bg-rose-50 text-rose-600 group-hover:bg-rose-600 group-hover:text-white"
                    titleClasses="text-rose-900 group-hover:text-rose-700"
                    onClick={() => {
                      setExplorarFase("paquetes");
                      setViewMode("calendario");
                    }}
                  />
                  <ManagementSectionCard
                  square
                    title="Sumarme a un viaje"
                    subtitle="Plazas libres"
                    icon={IconCar}
                    cardClasses="border-emerald-100 hover:border-emerald-300 hover:shadow-md focus-visible:ring-emerald-300"
                    iconClasses="bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white"
                    titleClasses="text-emerald-900 group-hover:text-emerald-700"
                    onClick={() => {
                      setExplorarFase("pasajeros");
                      setViewMode("calendario");
                    }}
                  />
                  <ManagementSectionCard
                  square
                    title="Proponer un viaje"
                    subtitle="Nuevo recorrido"
                    icon={IconPlus}
                    cardClasses="border-[#b8d0e8] hover:border-[#0054a6] hover:shadow-md focus-visible:ring-[#8fb4d9]"
                    iconClasses="bg-[#e8f1fa] text-[#0054a6] group-hover:bg-[#0054a6] group-hover:text-white"
                    titleClasses="text-[#001f40] group-hover:text-[#003d7a]"
                    onClick={openProponerNuevo}
                  />
                </div>
              </div>
            )}

            {userArea === "explorar" && viewMode !== "gestion" && explorarFase !== "menu" && (
              <div className="space-y-3">
                <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/90 bg-white/90 p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-3.5">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setExplorarFase("menu")}
                      className="inline-flex items-center gap-1 rounded-xl border border-[#8fb4d9] bg-[#e8f1fa] px-3 py-2 text-xs font-bold text-[#003d7a] hover:bg-[#d6e6f5]"
                    >
                      ← Opciones
                    </button>
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                        explorarFase === "paquetes"
                          ? "bg-rose-50 text-rose-800 border border-rose-200"
                          : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                      }`}
                    >
                      {explorarFase === "paquetes" ? (
                        <>
                          <IconSend size={12} /> Enviar paquete
                        </>
                      ) : (
                        <>
                          <IconCar size={12} /> Sumarme a un viaje
                        </>
                      )}
                    </span>
                    {!loading && (
                      <span className="text-[11px] font-semibold text-slate-500">
                        {viewMode === "agenda"
                          ? `${agendaViajesDisplayed.length} en lista`
                          : `${viajesExplorarFiltrados.length} en calendario`}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <div className="inline-flex rounded-xl border border-slate-200 bg-slate-100/80 p-0.5">
                      <button
                        type="button"
                        onClick={() => setViewMode("calendario")}
                        className={`inline-flex items-center gap-1.5 rounded-[0.65rem] px-3 py-1.5 text-xs font-bold transition-colors ${
                          viewMode === "calendario"
                            ? "bg-white text-slate-900 shadow-sm"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        <IconCalendar size={14} />
                        Calendario
                      </button>
                      <button
                        type="button"
                        onClick={() => setViewMode("agenda")}
                        className={`inline-flex items-center gap-1.5 rounded-[0.65rem] px-3 py-1.5 text-xs font-bold transition-colors ${
                          viewMode === "agenda"
                            ? "bg-white text-slate-900 shadow-sm"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        <IconList size={14} />
                        Agenda
                      </button>
                    </div>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => {
                          setGestionLandingOpen(true);
                          setViewMode("gestion");
                        }}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold uppercase tracking-wide text-slate-600 hover:bg-slate-50"
                      >
                        Gestión
                      </button>
                    )}
                  </div>
                </div>

                <section className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-3 py-2.5 sm:px-4">
                    <button
                      type="button"
                      onClick={() => setFiltersOpen((v) => !v)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100"
                    >
                      <IconFilter size={14} />
                      Filtros
                      {activeFilterCount > 0 && (
                        <span className="min-w-5 rounded-full bg-[#0054a6] px-1.5 py-0.5 text-center text-[10px] font-extrabold text-white">
                          {activeFilterCount}
                        </span>
                      )}
                      <IconChevronDown
                        size={14}
                        className={`transition-transform ${filtersOpen ? "rotate-180" : ""}`}
                      />
                    </button>
                    <div className="flex flex-wrap items-center gap-2">
                      {activeFilterCount > 0 && (
                        <button
                          type="button"
                          onClick={clearFilters}
                          className="inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                        >
                          <IconX size={12} />
                          Limpiar
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={loading}
                        onClick={openProponerNuevo}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold uppercase tracking-wide text-white hover:bg-slate-800 disabled:bg-slate-300"
                      >
                        <IconPlus size={14} />
                        <span className="hidden xs:inline sm:inline">Proponer</span>
                        <span className="sm:hidden">Nuevo</span>
                      </button>
                    </div>
                  </div>

                  {filtersOpen && (
                    <div className="grid grid-cols-1 gap-3 border-b border-slate-100 bg-slate-50/60 p-3 sm:grid-cols-2 sm:p-4 lg:grid-cols-3 xl:grid-cols-5">
                      <div className="min-w-0">
                        <label htmlFor="scr-veh" className={filterLabelClass}>
                          Vehículo
                        </label>
                        <select
                          id="scr-veh"
                          value={filters.idTransporte}
                          onChange={(event) =>
                            setFilters((prev) => ({
                              ...prev,
                              idTransporte: event.target.value,
                            }))
                          }
                          className={filterFieldClass}
                          title="Solo recorridos de este vehículo"
                        >
                          <option value="">Todos</option>
                          {transportes.map((t) => (
                            <option key={t.id} value={String(t.id)}>
                              {(t.nombre || "").trim() || `Vehículo #${t.id}`}
                              {(t.patente || "").trim()
                                ? ` · ${(t.patente || "").trim()}`
                                : ""}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="min-w-0">
                        <label htmlFor="scr-fecha-desde" className={filterLabelClass}>
                          Salida desde
                        </label>
                        <input
                          id="scr-fecha-desde"
                          type="date"
                          value={filters.fechaDesde}
                          onChange={(event) =>
                            setFilters((prev) => ({
                              ...prev,
                              fechaDesde: event.target.value,
                            }))
                          }
                          className={filterFieldClass}
                        />
                      </div>

                      <div className="min-w-0">
                        <label htmlFor="scr-fecha-hasta" className={filterLabelClass}>
                          Salida hasta
                        </label>
                        <input
                          id="scr-fecha-hasta"
                          type="date"
                          value={filters.fechaHasta}
                          onChange={(event) =>
                            setFilters((prev) => ({
                              ...prev,
                              fechaHasta: event.target.value,
                            }))
                          }
                          className={filterFieldClass}
                        />
                      </div>

                      <div className="min-w-0">
                        <label htmlFor="scr-destino" className={filterLabelClass}>
                          Destino
                        </label>
                        <input
                          id="scr-destino"
                          value={filters.destino}
                          onChange={(event) =>
                            setFilters((prev) => ({
                              ...prev,
                              destino: event.target.value,
                            }))
                          }
                          placeholder="Ej: Bariloche"
                          className={filterFieldClass}
                        />
                      </div>

                      <div className="min-w-0">
                        <label htmlFor="scr-plazas" className={filterLabelClass}>
                          Mín. plazas libres
                        </label>
                        <input
                          id="scr-plazas"
                          type="number"
                          min={0}
                          value={filters.minDisponibles}
                          onChange={(event) =>
                            setFilters((prev) => ({
                              ...prev,
                              minDisponibles: event.target.value,
                            }))
                          }
                          placeholder="0"
                          className={filterFieldClass}
                        />
                      </div>
                    </div>
                  )}
                </section>
              </div>
            )}

            {userArea === "explorar" && explorarFase !== "menu" && loading && (
              <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="h-4 w-40 animate-pulse rounded bg-slate-200" />
                <div className="h-24 animate-pulse rounded-xl bg-slate-100" />
                <div className="h-24 animate-pulse rounded-xl bg-slate-100" />
              </section>
            )}

            {userArea === "explorar" &&
              explorarFase !== "menu" &&
              !loading &&
              viewMode === "calendario" && (
                <section className="rounded-2xl border border-slate-200/90 bg-white p-2 shadow-sm sm:p-4">
                  <div className="h-[min(70vh,560px)] min-h-[420px] sm:h-[560px] md:h-[620px]">
                    <Calendar
                      className="scrn-rbc h-full"
                      localizer={localizer}
                      events={calendarEvents}
                      startAccessor="start"
                      endAccessor="end"
                      eventPropGetter={(event) => {
                        const v = event.resource;
                        const base = rbcEventStyleFromViajeResource(v);
                        const est = user?.id ? estadoMiReservaPorViajeId[v.id] : null;
                        const sh = est ? boxShadowReservaEnViaje(est) : null;
                        if (!sh) return base;
                        return {
                          ...base,
                          style: {
                            ...base.style,
                            boxShadow: sh,
                          },
                        };
                      }}
                      defaultView={Views.MONTH}
                      views={[Views.MONTH]}
                      date={calendarDate}
                      onNavigate={(nextDate, _view, action) => {
                        if (action === Navigate.NEXT || action === Navigate.PREVIOUS) {
                          setCalendarDate(nextDate);
                        }
                      }}
                      popup
                      messages={{
                        month: "Mes",
                        previous: "Ant.",
                        next: "Sig.",
                        today: "Hoy",
                        date: "Fecha",
                        time: "Hora",
                        event: "Viaje",
                        showMore: (total) => `+${total} más`,
                        noEventsInRange: "No hay viajes para este rango.",
                      }}
                      onSelectEvent={(event) =>
                        explorarFase === "paquetes"
                          ? openEnviarPaquete(event.resource)
                          : openSolicitud(event.resource)
                      }
                    />
                  </div>
                  <p className="mt-2 px-1 text-[11px] text-slate-500 sm:px-0">
                    Tocá un día con viajes para solicitar plaza o enviar paquete. El anillo de color
                    indica el estado de tu reserva.
                  </p>
                </section>
              )}

            {userArea === "explorar" &&
              explorarFase !== "menu" &&
              !loading &&
              viewMode === "agenda" && (
                <section className="space-y-3">
                  <div className="flex flex-col gap-2 rounded-2xl border border-slate-200/90 bg-white px-3 py-2.5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs leading-relaxed text-slate-600">
                      {agendaVerHistorial
                        ? "Incluye recorridos con salida pasada."
                        : "Solo salidas de hoy en adelante."}
                    </p>
                    <button
                      type="button"
                      onClick={() => setAgendaVerHistorial((v) => !v)}
                      className="shrink-0 self-start rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 sm:self-auto"
                    >
                      {agendaVerHistorial ? "Ocultar historial" : "Ver historial"}
                    </button>
                  </div>

                  {viajesExplorarFiltrados.length === 0 && (
                    <div className="space-y-3 rounded-2xl border border-dashed border-slate-300 bg-white/80 p-5 text-center sm:p-8">
                      <p className="text-sm font-semibold text-slate-700">
                        {explorarFase === "paquetes"
                          ? "No hay recorridos con bodega disponible con estos filtros."
                          : "No hay recorridos con plazas libres con estos filtros."}
                      </p>
                      <p className="text-xs text-slate-500">
                        Probá ampliar fechas o limpiar filtros.
                      </p>
                      <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                        {activeFilterCount > 0 && (
                          <button
                            type="button"
                            onClick={clearFilters}
                            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                          >
                            Limpiar filtros
                          </button>
                        )}
                        {explorarFase === "pasajeros" && (
                          <button
                            type="button"
                            disabled={loading}
                            onClick={openProponerNuevo}
                            className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold uppercase tracking-wide text-white hover:bg-slate-800 disabled:bg-slate-300"
                          >
                            Proponer un recorrido
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {viajesExplorarFiltrados.length > 0 &&
                    agendaViajesDisplayed.length === 0 &&
                    !agendaVerHistorial && (
                      <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm">
                        No hay recorridos próximos con estos filtros.
                        <button
                          type="button"
                          onClick={() => setAgendaVerHistorial(true)}
                          className="ml-1 text-xs font-bold text-[#0054a6] underline hover:text-[#002b57]"
                        >
                          Ver historial
                        </button>
                      </div>
                    )}

                  <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                    {agendaViajesDisplayed.map((viaje) => {
                      const estReserva = user?.id
                        ? estadoMiReservaPorViajeId[viaje.id]
                        : null;
                      const tengoReservaAqui = Boolean(estReserva);
                      const reservaActiva =
                        estReserva === "aceptada" || estReserva === "pendiente";
                      const articleRingClass =
                        estReserva === "aceptada"
                          ? "border-emerald-300 ring-2 ring-emerald-500/80 ring-offset-1"
                          : estReserva === "pendiente"
                            ? "border-amber-300 ring-2 ring-amber-400/80 ring-offset-1"
                            : estReserva === "cancelada"
                              ? "border-red-300 ring-2 ring-red-500/70 ring-offset-1"
                              : "border-slate-200/90";
                      const badgeReservaClass =
                        estReserva === "aceptada"
                          ? "text-emerald-900 bg-emerald-100 border border-emerald-200/90"
                          : estReserva === "pendiente"
                            ? "text-amber-900 bg-amber-100 border border-amber-200/90"
                            : estReserva === "cancelada"
                              ? "text-red-900 bg-red-100 border border-red-200/90"
                              : "";
                      return (
                        <article
                          key={viaje.id}
                          className={`flex flex-col rounded-2xl border bg-white p-4 shadow-sm transition hover:shadow-md ${articleRingClass}`}
                          style={scrnTransporteAccentStyle(viaje.scrn_transportes)}
                        >
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0 space-y-1">
                              <h3 className="text-base font-extrabold leading-snug text-slate-900">
                                <span className="inline-flex items-start gap-1.5">
                                  <IconMapPin
                                    size={16}
                                    className="mt-0.5 shrink-0 text-[#0054a6]"
                                  />
                                  <span>
                                    {viaje.origen}
                                    <span className="mx-1 font-semibold text-slate-400">→</span>
                                    {viaje.destino_final}
                                  </span>
                                </span>
                              </h3>
                              {viaje.motivo && (
                                <p className="line-clamp-2 pl-6 text-xs text-slate-600">
                                  {viaje.motivo}
                                </p>
                              )}
                            </div>
                            <div className="flex shrink-0 flex-wrap items-center gap-1.5 sm:justify-end">
                              {tengoReservaAqui && (
                                <span
                                  className={`rounded-full px-2 py-1 text-[11px] font-bold ${badgeReservaClass}`}
                                >
                                  {labelEstadoReservaScrn(estReserva)}
                                </span>
                              )}
                              {explorarFase === "pasajeros" && (
                                <span
                                  className={`rounded-full border px-2 py-1 text-[11px] font-bold ${plazasBadgeClass(
                                    viaje.plazasDisponibles,
                                  )}`}
                                >
                                  {viaje.plazasDisponibles} plazas
                                </span>
                              )}
                              {viaje.paquetes_bodega_llena ? (
                                <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-bold text-amber-900">
                                  Bodega llena
                                </span>
                              ) : explorarFase === "paquetes" ? (
                                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-900">
                                  Bodega libre
                                </span>
                              ) : null}
                            </div>
                          </div>

                          <div className="mt-3 grid grid-cols-1 gap-2 border-t border-slate-100 pt-3 text-xs text-slate-600 sm:grid-cols-2">
                            <div className="flex items-start gap-1.5">
                              <IconClock size={14} className="mt-0.5 shrink-0 text-slate-400" />
                              <div>
                                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                                  Salida
                                </p>
                                <p className="font-semibold text-slate-800">
                                  {formatDateTime(viaje.fecha_salida)}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-start gap-1.5">
                              <IconClock size={14} className="mt-0.5 shrink-0 text-slate-400" />
                              <div>
                                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                                  Llega a origen
                                </p>
                                <p className="font-semibold text-slate-800">
                                  {formatDateTime(viaje.fecha_llegada_estimada)}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-start gap-1.5 sm:col-span-2">
                              <IconCar size={14} className="mt-0.5 shrink-0 text-slate-400" />
                              <div className="min-w-0">
                                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                                  Transporte
                                </p>
                                <p className="inline-flex min-w-0 flex-wrap items-center gap-1.5 font-semibold text-slate-800">
                                  <span
                                    className="inline-block h-3 w-3 shrink-0 rounded border border-slate-300/90"
                                    style={{
                                      backgroundColor: scrnTransporteColorFromEntity(
                                        viaje.scrn_transportes,
                                      ),
                                    }}
                                    aria-hidden
                                  />
                                  <span className="truncate">
                                    {viaje.scrn_transportes?.nombre || "—"}
                                    {viaje.scrn_transportes?.tipo
                                      ? ` · ${viaje.scrn_transportes.tipo}`
                                      : ""}
                                  </span>
                                </p>
                              </div>
                            </div>
                            {viaje.chofer && (
                              <div className="flex items-start gap-1.5 sm:col-span-2">
                                <IconUser size={14} className="mt-0.5 shrink-0 text-slate-400" />
                                <div>
                                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                                    Chofer
                                  </p>
                                  <p className="font-semibold text-slate-800">
                                    {`${viaje.chofer.apellido || ""}, ${viaje.chofer.nombre || ""}`
                                      .replace(/^,\s*/, "")
                                      .trim() || "—"}
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="mt-auto flex flex-col gap-2 pt-4 sm:flex-row sm:justify-end">
                            {explorarFase === "paquetes" && (
                              <button
                                type="button"
                                onClick={() => openEnviarPaquete(viaje)}
                                disabled={Boolean(viaje.paquetes_bodega_llena)}
                                className="w-full rounded-xl border border-rose-300 bg-rose-50 px-3 py-2.5 text-xs font-bold uppercase tracking-wide text-rose-800 hover:bg-rose-100 disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 sm:w-auto sm:min-w-[10rem]"
                              >
                                Enviar paquete
                              </button>
                            )}
                            {explorarFase === "pasajeros" && (
                              <button
                                type="button"
                                onClick={() => openSolicitud(viaje)}
                                disabled={viaje.plazasDisponibles <= 0}
                                className={`w-full rounded-xl bg-[#0054a6] px-3 py-2.5 text-xs font-bold text-white hover:bg-[#003d7a] disabled:bg-slate-300 sm:w-auto sm:min-w-[10rem] ${
                                  reservaActiva
                                    ? "inline-flex flex-col items-center leading-tight sm:items-end"
                                    : "uppercase tracking-wide"
                                }`}
                              >
                                {reservaActiva ? (
                                  <>
                                    <span className="uppercase tracking-wide">Solicitar plaza</span>
                                    <span className="text-[10px] font-semibold normal-case text-white/90">
                                      para otra persona
                                    </span>
                                  </>
                                ) : (
                                  "Solicitar plaza"
                                )}
                              </button>
                            )}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>
              )}

            {userArea === "viajes" && (
              <MisReservas
                user={user}
                reloadKey={reloadKey}
                scrnPerfiles={scrnPerfiles}
                localidades={localidades}
                onGestionCambiada={() => {
                  setReloadKey((k) => k + 1);
                }}
              />
            )}

            {userArea === "envios" && (
              <MisEnvios
                user={user}
                reloadKey={reloadKey}
                onGestionCambiada={() => {
                  setReloadKey((k) => k + 1);
                }}
              />
            )}
          </>
        )}

        {isAdmin && viewMode === "gestion" && !gestionLandingOpen && (
          <>
            {loading && (
              <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="h-4 w-48 animate-pulse rounded bg-slate-200" />
                <div className="h-28 animate-pulse rounded-xl bg-slate-100" />
              </section>
            )}
            {!loading && (
              <AdminSCRNPanel
                isAdmin
                adminView={adminView}
                adminPendienteSeccion={adminPendienteSeccion}
                onPendienteSeccionChange={setAdminPendienteSeccion}
                pendienteCounts={pendienteCounts}
                transportes={transportes}
                viajes={viajes}
                scrnPerfiles={scrnPerfiles}
                localidades={localidades}
                tipoOptions={availableTipos}
                reloadToken={reloadKey}
                focusTransportRequest={focusTransportRequest}
                focusViajeRequest={focusViajeRequest}
                onDataChanged={() => {
                  setReloadKey((prev) => prev + 1);
                }}
              />
            )}
          </>
        )}
      </main>

      {/* Navegación inferior — móvil */}
      {viewMode !== "gestion" && (
        <nav
          className="scrn-bottom-nav fixed inset-x-0 bottom-0 z-40 px-1 pb-[max(0.35rem,env(safe-area-inset-bottom))] pt-0 md:hidden"
          aria-label="Navegación principal"
        >
          <div className="mx-auto grid max-w-lg grid-cols-4 gap-0.5">
            {[
              {
                id: "inicio",
                label: "Inicio",
                icon: IconHome,
                active: userArea === "inicio",
                onClick: goHome,
              },
              {
                id: "explorar",
                label: "Explorar",
                icon: IconSearch,
                active: userArea === "explorar",
                onClick: goExplorar,
              },
              {
                id: "viajes",
                label: "Viajes",
                icon: IconCar,
                active: userArea === "viajes",
                onClick: goViajes,
              },
              {
                id: "envios",
                label: "Paquetes",
                icon: IconSend,
                active: userArea === "envios",
                onClick: goEnvios,
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={item.onClick}
                  data-active={item.active ? "true" : "false"}
                  className={`flex flex-col items-center gap-0.5 rounded-none px-1 py-2 text-[10px] font-bold uppercase tracking-wide transition-colors ${
                    item.active
                      ? "bg-[#e8f1fa] text-[#003d7a]"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                  }`}
                >
                  <Icon size={18} />
                  {item.label}
                </button>
              );
            })}
          </div>
        </nav>
      )}

      <SolicitudModal
        isOpen={modalOpen}
        onClose={closeSolicitud}
        viaje={selectedViaje}
        user={user}
        profile={profile}
        localidades={localidades}
        scrnPerfiles={scrnPerfiles}
        onAdminEditTransporte={openAdminTransportEdit}
        onAdminEditViaje={openAdminViajeEdit}
        onEnviarPaquete={openEnviarPaquete}
        onSubmitted={afterReservation}
      />
      <EnviarPaqueteModal
        isOpen={paqueteModalOpen}
        onClose={closePaqueteModal}
        viaje={paqueteContextViaje}
        user={user}
        isAdmin={isAdmin}
        onSubmitted={() => {
          setReloadKey((k) => k + 1);
        }}
      />
      <ProponerNuevoViajeModal
        isOpen={proponerNuevoOpen}
        onClose={closeProponerNuevo}
        user={user}
        profile={profile}
        localidades={localidades}
        scrnPerfiles={scrnPerfiles}
        transportes={transportes}
        viajes={viajes}
        onSubmitted={() => {
          setReloadKey((k) => k + 1);
        }}
      />
      <EditarPerfilScrnModal
        isOpen={perfilEditOpen}
        onClose={() => setPerfilEditOpen(false)}
        user={user}
        profile={profile}
        onSaved={() => {
          onProfileRefresh?.();
        }}
      />
    </div>
  );
}

