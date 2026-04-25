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
import { supabase } from "../../../services/supabase";
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
} from "../../../components/ui/Icons";

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: (date) => startOfWeek(date, { weekStartsOn: 1 }),
  getDay,
  locales: { es },
});

function formatDateTime(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString("es-AR", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

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

/** Badge de cantidad: gris si 0, naranja/ámbar si hay pendientes. `selected` = sobre fondo indigo (pestaña activa). */
function scrnPendienteBadgeClass(count, selected = false) {
  const n = Math.max(0, Number(count) || 0);
  if (n <= 0) {
    return selected
      ? "border border-white/30 bg-white/20 text-white"
      : "border border-slate-300 bg-slate-200 text-slate-600";
  }
  return selected
    ? "border border-amber-400/90 bg-amber-300 text-amber-950"
    : "border border-amber-600 bg-amber-500 text-white shadow-sm";
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
  const urlActionControlRef = useRef(false);
  const ignoreUrlSolicitudRef = useRef(false);
  const ignoreUrlProponerRef = useRef(false);
  const pendingUrlSyncRef = useRef(null);
  const lastWrittenQueryRef = useRef("");
  const [filters, setFilters] = useState({
    idTransporte: "",
    fechaDesde: "",
    fechaHasta: "",
    destino: "",
    minDisponibles: "",
  });

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
        .select("id, nombre, apellido")
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
    <div className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-3">
            <img
              src="/pictures/ofrn.jpg"
              alt="Logo OFRN"
              className="h-12 w-auto max-w-[180px] rounded-lg object-contain border border-slate-200 bg-white p-1"
            />
            <div>
              <h1 className="text-xl font-black text-slate-800">
                Sistema de Transporte SCRN
              </h1>
              <p className="text-xs text-slate-500">
                Bienvenido/a {profile.nombre} {profile.apellido}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setUserArea("inicio");
                setExplorarFase("menu");
                if (viewMode === "gestion") setViewMode("calendario");
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-colors ${
                userArea === "inicio" && viewMode !== "gestion"
                  ? "bg-indigo-600 text-white shadow-sm"
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
                className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-colors border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
              >
                <IconSpiralNotebook size={15} />
                <span className="hidden sm:inline">Pendientes</span>
                <span
                  className={`min-w-6 rounded-full px-1.5 py-0.5 text-center text-[10px] font-extrabold ${scrnPendienteBadgeClass(
                    totalPendientes,
                    false,
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
              className="px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            >
              Mi Perfil
            </button>
            <button
              type="button"
              onClick={onLogout}
              className="px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide border border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100 hover:border-rose-400"
            >
              Salir
            </button>
          </div>
        </div>
        {isAdmin && viewMode === "gestion" && !gestionLandingOpen && (
          <div className="border-t border-slate-200 bg-slate-50/80">
            <div className="max-w-7xl mx-auto px-4 py-2.5 space-y-2">
              <div className="md:hidden">
                <select
                  value={adminView}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === "pendientes") setAdminPendienteSeccion(null);
                    setAdminView(v);
                  }}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
                >
                  <option value="pendientes">Pendientes ({totalPendientes})</option>
                  <option value="recorridos">Recorridos</option>
                  <option value="datos_generales">Datos generales</option>
                </select>
              </div>
              <div className="hidden md:flex flex-wrap gap-2">
                {[
                  { id: "pendientes", label: "Pendientes", badge: totalPendientes },
                  { id: "recorridos", label: "Recorridos" },
                  { id: "datos_generales", label: "Datos generales" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      if (tab.id === "pendientes") {
                        setAdminPendienteSeccion(null);
                      }
                      setAdminView(tab.id);
                    }}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-colors ${
                      adminView === tab.id
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "bg-white text-slate-700 border border-slate-200 hover:border-slate-300"
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

      <main className="max-w-7xl mx-auto px-4 py-5 space-y-4">
        {deepLinkNotice && (
          <section className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            {deepLinkNotice}
          </section>
        )}
        {isAdmin && viewMode === "gestion" && gestionLandingOpen && (
          <section className="mx-auto w-full max-w-5xl space-y-3">
            <div>
              <h2 className="text-lg font-bold text-slate-800">Gestión</h2>
              <p className="text-sm text-slate-500 mt-0.5">
                Elegí una sección para administrar solicitudes, recorridos y datos generales.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <ManagementSectionCard
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
                title="Recorridos"
                subtitle="Alta, edición y historial"
                icon={IconCar}
                cardClasses="border-indigo-100 hover:border-indigo-300 hover:shadow-md focus-visible:ring-indigo-300"
                iconClasses="bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white"
                titleClasses="text-indigo-900 group-hover:text-indigo-700"
                onClick={() => {
                  setGestionLandingOpen(false);
                  setAdminView("recorridos");
                }}
              />
              <ManagementSectionCard
                title="Datos Generales"
                subtitle="Transportes, localidades y usuarios"
                icon={IconManagement}
                cardClasses="border-violet-100 hover:border-violet-300 hover:shadow-md focus-visible:ring-violet-300"
                iconClasses="bg-violet-50 text-violet-600 group-hover:bg-violet-600 group-hover:text-white"
                titleClasses="text-violet-900 group-hover:text-violet-700"
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
          <div className="mx-auto w-full max-w-5xl space-y-4">
            <div>
              <h2 className="text-lg font-bold text-slate-800">Inicio</h2>
              <p className="text-sm text-slate-500 mt-0.5 max-w-2xl">
                Acceso rápido a Explorar, tus viajes, tus envíos y (si tenés permisos) la gestión
                de transporte.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {isAdmin && (
                <ManagementSectionCard
                  title="Gestión"
                  subtitle="Administración SCRN"
                  icon={IconManagement}
                  cardClasses="border-violet-100 hover:border-violet-300 hover:shadow-md focus-visible:ring-violet-300"
                  iconClasses="bg-violet-50 text-violet-600 group-hover:bg-violet-600 group-hover:text-white"
                  titleClasses="text-violet-900 group-hover:text-violet-700"
                  onClick={() => {
                    setGestionLandingOpen(true);
                    setViewMode("gestion");
                  }}
                />
              )}
              <ManagementSectionCard
                title="Explorar"
                subtitle="Plazas, enviar paquetes o proponer un recorrido"
                icon={IconSearch}
                cardClasses="border-indigo-100 hover:border-indigo-300 hover:shadow-md focus-visible:ring-indigo-300"
                iconClasses="bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white"
                titleClasses="text-indigo-900 group-hover:text-indigo-700"
                onClick={() => {
                  setUserArea("explorar");
                  setExplorarFase("menu");
                  setViewMode("calendario");
                }}
              />
              <ManagementSectionCard
                title="Mis viajes"
                subtitle="Tus reservas y plazas"
                icon={IconCar}
                cardClasses="border-emerald-100 hover:border-emerald-300 hover:shadow-md focus-visible:ring-emerald-300"
                iconClasses="bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white"
                titleClasses="text-emerald-900 group-hover:text-emerald-700"
                onClick={() => {
                  setUserArea("viajes");
                }}
              />
              <ManagementSectionCard
                title="Mis paquetes"
                subtitle="Envíos en viajes existentes"
                icon={IconSend}
                cardClasses="border-rose-100 hover:border-rose-300 hover:shadow-md focus-visible:ring-rose-300"
                iconClasses="bg-rose-50 text-rose-600 group-hover:bg-rose-600 group-hover:text-white"
                titleClasses="text-rose-900 group-hover:text-rose-700"
                onClick={() => {
                  setUserArea("envios");
                }}
              />
            </div>
          </div>
        )}

        {userArea === "explorar" && viewMode !== "gestion" && explorarFase === "menu" && (
          <div className="mx-auto w-full max-w-5xl space-y-3">
            <h2 className="text-lg font-bold text-slate-800">Explorar</h2>
            <p className="text-sm text-slate-500">Elegí qué querés hacer.</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <ManagementSectionCard
                title="Enviar un paquete"
                subtitle="Recorridos con bodega disponible"
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
                title="Sumarme a un viaje"
                subtitle="Recorridos con plazas libres"
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
                title="Proponer un viaje"
                subtitle="Nuevo recorrido"
                icon={IconSearch}
                cardClasses="border-indigo-100 hover:border-indigo-300 hover:shadow-md focus-visible:ring-indigo-300"
                iconClasses="bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white"
                titleClasses="text-indigo-900 group-hover:text-indigo-700"
                onClick={openProponerNuevo}
              />
            </div>
          </div>
        )}

        {userArea === "explorar" && viewMode !== "gestion" && explorarFase !== "menu" && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setExplorarFase("menu")}
              className="px-3 py-1.5 rounded-lg text-xs font-bold text-indigo-700 border border-indigo-200 bg-indigo-50 hover:bg-indigo-100"
            >
              Elegir otra opción
            </button>
            <span className="text-xs text-slate-500 hidden sm:inline">
              {explorarFase === "paquetes" ? "Modo: enviar paquete" : "Modo: sumarme a un viaje"}
            </span>
            <div className="w-full sm:w-auto sm:ml-auto flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setViewMode("calendario")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-colors ${
                viewMode === "calendario"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              Calendario
            </button>
            <button
              type="button"
              onClick={() => setViewMode("agenda")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-colors ${
                viewMode === "agenda"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              Agenda
            </button>
            {isAdmin && (
              <button
                type="button"
                onClick={() => {
                  setGestionLandingOpen(true);
                  setViewMode("gestion");
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide border border-slate-200 bg-white text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50"
              >
                Gestión
              </button>
            )}
            </div>
          </div>
        )}

        {userArea === "explorar" && explorarFase !== "menu" && (
        <section className="bg-white rounded-2xl border border-slate-200 p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
          <select
            value={filters.idTransporte}
            onChange={(event) =>
              setFilters((prev) => ({ ...prev, idTransporte: event.target.value }))
            }
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm min-w-0"
            title="Solo recorridos asignados a este vehículo"
          >
            <option value="">Vehículo (todos)</option>
            {transportes.map((t) => (
              <option key={t.id} value={String(t.id)}>
                {(t.nombre || "").trim() || `Vehículo #${t.id}`}
                {(t.patente || "").trim() ? ` · ${(t.patente || "").trim()}` : ""}
              </option>
            ))}
          </select>

          <div>
            <label
              htmlFor="scr-fecha-desde"
              className="block text-[10px] font-bold uppercase text-slate-500 mb-0.5"
            >
              Fecha salida desde
            </label>
            <input
              id="scr-fecha-desde"
              type="date"
              value={filters.fechaDesde}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, fechaDesde: event.target.value }))
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label
              htmlFor="scr-fecha-hasta"
              className="block text-[10px] font-bold uppercase text-slate-500 mb-0.5"
            >
              Fecha salida hasta
            </label>
            <input
              id="scr-fecha-hasta"
              type="date"
              value={filters.fechaHasta}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, fechaHasta: event.target.value }))
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <input
            value={filters.destino}
            onChange={(event) =>
              setFilters((prev) => ({ ...prev, destino: event.target.value }))
            }
            placeholder="Filtrar por destino"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />

          <input
            type="number"
            min={0}
            value={filters.minDisponibles}
            onChange={(event) =>
              setFilters((prev) => ({
                ...prev,
                minDisponibles: event.target.value,
              }))
            }
            placeholder="Al menos X plazas libres"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </section>
        )}

        {userArea === "explorar" && explorarFase !== "menu" && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={loading}
            onClick={openProponerNuevo}
            className="px-3 py-2 rounded-lg border border-slate-800 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-300 disabled:border-slate-300 text-white text-xs font-bold uppercase tracking-wide"
          >
            Proponer un recorrido nuevo
          </button>
        </div>
        )}

        {userArea === "explorar" && explorarFase !== "menu" && loading && (
          <section className="bg-white rounded-2xl border border-slate-200 p-4 text-sm text-slate-500">
            Cargando viajes y disponibilidad...
          </section>
        )}

        {userArea === "explorar" && explorarFase !== "menu" && !loading && viewMode === "calendario" && (
          <section className="bg-white rounded-2xl border border-slate-200 p-4">
            <div className="h-[520px]">
              <Calendar
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
                messages={{
                  month: "Mes",
                  previous: "Anterior",
                  next: "Siguiente",
                  today: "Hoy",
                  date: "Fecha",
                  time: "Hora",
                  event: "Viaje",
                  noEventsInRange: "No hay viajes para este rango.",
                }}
                onSelectEvent={(event) =>
                  explorarFase === "paquetes"
                    ? openEnviarPaquete(event.resource)
                    : openSolicitud(event.resource)
                }
              />
            </div>
          </section>
        )}

        {userArea === "explorar" && explorarFase !== "menu" && !loading && viewMode === "agenda" && (
          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
              <p className="text-xs text-slate-600">
                {agendaVerHistorial
                  ? "Mostrando todos los recorridos que cumplen los filtros (incluye fechas pasadas)."
                  : "Solo recorridos con salida hoy o posteriores."}
              </p>
              <button
                type="button"
                onClick={() => setAgendaVerHistorial((v) => !v)}
                className="shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                {agendaVerHistorial ? "Ocultar historial" : "Ver historial"}
              </button>
            </div>

            {viajesExplorarFiltrados.length === 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 p-4 text-sm text-slate-500 space-y-2">
                <p>
                  {explorarFase === "paquetes"
                    ? "No hay recorridos con bodega de paquetería disponible que coincidan con los filtros."
                    : "No hay recorridos con plazas libres que coincidan con los filtros."}
                </p>
                {explorarFase === "pasajeros" && (
                  <div className="pt-1">
                    <p className="text-xs text-slate-600 mb-2">Podés proponer un recorrido nuevo y lo evaluamos.</p>
                    <button
                      type="button"
                      disabled={loading}
                      onClick={openProponerNuevo}
                      className="px-3 py-2 rounded-lg border border-slate-800 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-300 text-white text-xs font-bold uppercase tracking-wide"
                    >
                      Proponer un recorrido nuevo
                    </button>
                  </div>
                )}
              </div>
            )}

            {viajesExplorarFiltrados.length > 0 && agendaViajesDisplayed.length === 0 && !agendaVerHistorial && (
              <div className="bg-white rounded-2xl border border-slate-200 p-4 text-sm text-slate-600">
                No hay recorridos próximos con estos filtros (las fechas de salida son anteriores a hoy).
                <button
                  type="button"
                  onClick={() => setAgendaVerHistorial(true)}
                  className="ml-2 text-xs font-bold text-indigo-700 underline hover:text-indigo-900"
                >
                  Ver historial
                </button>
              </div>
            )}

            {agendaViajesDisplayed.map((viaje) => {
              const estReserva = user?.id ? estadoMiReservaPorViajeId[viaje.id] : null;
              const tengoReservaAqui = Boolean(estReserva);
              const reservaActiva =
                estReserva === "aceptada" || estReserva === "pendiente";
              const articleRingClass =
                estReserva === "aceptada"
                  ? "border-emerald-300 ring-2 ring-emerald-500/90 ring-offset-1 shadow-sm"
                  : estReserva === "pendiente"
                    ? "border-amber-300 ring-2 ring-amber-400/90 ring-offset-1 shadow-sm"
                    : estReserva === "cancelada"
                      ? "border-red-300 ring-2 ring-red-500/85 ring-offset-1 shadow-sm"
                      : "border-slate-200";
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
                className={`bg-white rounded-2xl border p-4 md:p-5 space-y-2 pl-2 ${articleRingClass}`}
                style={scrnTransporteAccentStyle(viaje.scrn_transportes)}
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <h3 className="text-sm md:text-base font-extrabold text-slate-800">
                    {viaje.origen} - {viaje.destino_final}
                  </h3>
                  <div className="flex flex-wrap items-center justify-end gap-1.5">
                    {tengoReservaAqui && (
                      <span
                        className={`text-xs font-bold px-2 py-1 rounded-full ${badgeReservaClass}`}
                      >
                        {labelEstadoReservaScrn(estReserva)}
                      </span>
                    )}
                    <span className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-100 px-2 py-1 rounded-full">
                      {viaje.plazasDisponibles} plazas disponibles
                    </span>
                  </div>
                </div>
                {viaje.motivo && (
                  <div className="text-xs text-slate-600">
                    <span className="font-bold">Motivo:</span> {viaje.motivo}
                  </div>
                )}
                {viaje.paquetes_bodega_llena ? (
                  <div className="text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200/90 rounded-lg px-2 py-1 inline-block">
                    Bodega de paquetería: llena
                  </div>
                ) : null}
                <div className="grid md:grid-cols-3 gap-2 text-xs text-slate-600">
                  <span>Salida: {formatDateTime(viaje.fecha_salida)}</span>
                  <span>Llega a origen: {formatDateTime(viaje.fecha_llegada_estimada)}</span>
                  <span className="inline-flex items-center gap-1.5 flex-wrap min-w-0">
                    <span>Transporte:</span>
                    <span
                      className="inline-block h-3.5 w-3.5 rounded border border-slate-300/90 shrink-0"
                      style={{ backgroundColor: scrnTransporteColorFromEntity(viaje.scrn_transportes) }}
                      title={viaje.scrn_transportes?.nombre || ""}
                      aria-hidden
                    />
                    <span>
                      {viaje.scrn_transportes?.nombre || "-"} ({viaje.scrn_transportes?.tipo || "-"})
                    </span>
                  </span>
                </div>
                {viaje.chofer && (
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <div>
                      <span className="font-bold text-slate-700">Chofer: </span>
                      {`${viaje.chofer.apellido || ""}, ${viaje.chofer.nombre || ""}`
                        .replace(/^,\s*/, "")
                        .trim() || "—"}
                    </div>
                  </div>
                )}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-2">
                  {explorarFase === "paquetes" && (
                  <button
                    type="button"
                    onClick={() => openEnviarPaquete(viaje)}
                    disabled={Boolean(viaje.paquetes_bodega_llena)}
                    className="px-3 py-1.5 rounded-lg border border-slate-500 bg-white hover:bg-slate-50 disabled:bg-slate-200 disabled:text-slate-500 disabled:border-slate-300 text-slate-800 text-xs font-bold uppercase tracking-wide w-full sm:w-auto"
                  >
                    Enviar un paquete
                  </button>
                  )}
                  {explorarFase === "pasajeros" && (
                  <button
                    type="button"
                    onClick={() => openSolicitud(viaje)}
                    disabled={viaje.plazasDisponibles <= 0}
                    className={`px-3 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 disabled:bg-slate-300 text-white text-xs font-bold w-full sm:w-auto ${
                      reservaActiva
                        ? "inline-flex flex-col items-end leading-tight"
                        : "uppercase tracking-wide"
                    }`}
                  >
                    {reservaActiva ? (
                      <>
                        <span className="uppercase tracking-wide">Solicitar plaza</span>
                        <span className="text-[10px] font-semibold text-white/95 normal-case">
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
              <section className="bg-white rounded-2xl border border-slate-200 p-4 text-sm text-slate-500">
                Cargando viajes y disponibilidad...
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
