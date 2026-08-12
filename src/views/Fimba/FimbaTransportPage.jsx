import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  IconArrowLeft,
  IconPlus,
  IconEdit,
  IconTrash,
  IconLoader,
  IconBus,
  IconClock,
  IconX,
  IconFileExcel,
  IconPencil,
} from "../../components/ui/Icons";
import {
  addFimbaVehiculo,
  capacidadGiraTransporte,
  computeFimbaCapacity,
  decodeFimbaTrasladoDescripcion,
  deleteFimbaTraslado,
  detalleGiraTransporte,
  getFimbaEdicionById,
  giraTransporteIdsFromEvent,
  labelGiraTransporte,
  listFimbaFlota,
  listFimbaPropuestas,
  listFimbaPropuestaRutas,
  listFimbaTraslados,
  listOfrnTransportesCatalog,
  loadFimbaTransportLogisticsSummary,
  ofrnGiraTransporteUrl,
  patchFimbaEventoPlanilla,
  setFimbaEventoTransportes,
  updateFimbaVehiculo,
} from "../../services/fimbaService";
import {
  boardingMetricsForEventRow,
  buildAllVehicleBoardingSequences,
  defaultIntermediateStopSchedule,
  formatEventLocation,
  resolveStopArtistasLabels,
} from "../../utils/fimbaTransportBoarding";
import {
  exportFimbaTransporteTodosExcel,
  exportFimbaTransporteVehiculoExcel,
} from "../../utils/fimbaExport";
import { eventTypeIdForCategoria } from "../../utils/giraTransportUtils";
import FimbaDestinoStopModal from "./FimbaDestinoStopModal";
import FimbaEventoFormModal from "./FimbaEventoFormModal";
import FimbaStopRulesManager from "./FimbaStopRulesManager";
import { useFimbaAccess } from "../../context/FimbaAccessContext";

function sliceTime(t) {
  if (!t) return "—";
  return String(t).slice(0, 5);
}

function sliceTimeInput(t) {
  if (!t) return "";
  return String(t).slice(0, 5);
}

function formatFecha(f) {
  if (!f) return "—";
  const [y, m, d] = String(f).split("-");
  if (!d) return f;
  return `${d}/${m}/${y}`;
}

function statusMeta(status) {
  switch (status) {
    case "saving":
      return { cls: "fimba-sync-saving", title: "Guardando…", label: "Guardando" };
    case "dirty":
      return { cls: "fimba-sync-pending", title: "Cambios pendientes", label: "Pendiente" };
    case "saved":
      return { cls: "fimba-sync-saved", title: "Guardado", label: "Guardado" };
    case "error":
      return { cls: "fimba-sync-error", title: "Error al guardar", label: "Error" };
    default:
      return { cls: "fimba-sync-idle", title: "Sincronizado", label: "" };
  }
}

function SyncDot({ status, error, sticky = false }) {
  const meta = statusMeta(status);
  return (
    <td
      className={`fimba-sync-col ${meta.cls}${sticky ? " fimba-sticky-sync" : ""}`}
      title={error || meta.title}
    >
      <span className={`fimba-sync-dot ${meta.cls}`} aria-hidden />
    </td>
  );
}

const EVENT_PLANILLA_FIELDS = [
  "fecha",
  "hora_inicio",
  "hora_fin",
  "actividad",
  "destino",
  "vuelo",
  "observaciones",
];

function draftFromEvent(ev) {
  const decoded = decodeFimbaTrasladoDescripcion(ev?.descripcion);
  const vehId =
    (ev?.vehiculos || []).length === 1
      ? String(ev.vehiculos[0].id_gira_transporte)
      : "";
  return {
    fecha: ev?.fecha || "",
    hora_inicio: sliceTimeInput(ev?.hora_inicio),
    hora_fin: sliceTimeInput(ev?.hora_fin),
    actividad: decoded.actividad || ev?.actividad || "",
    destino: decoded.destino || "",
    vuelo: decoded.vuelo || "",
    observaciones: decoded.observaciones || ev?.observaciones || "",
    id_gira_transporte: vehId,
  };
}

function planillaFieldsEqual(a, b) {
  return EVENT_PLANILLA_FIELDS.every(
    (k) => String(a?.[k] ?? "") === String(b?.[k] ?? ""),
  );
}

/** Asignación inline segura: solo FIMBA puro con 0–1 unidad (no reescribe paradas OFRN). */
function canInlineAssignVehicle(ev) {
  if (!ev?.es_fimba || ev?.es_ofrn) return false;
  return (ev.vehiculos || []).length <= 1;
}

function draftFromVehiculo(gt) {
  const catRaw = String(gt?.categoria_logistica || "PASAJEROS").toUpperCase();
  return {
    id_transporte: gt?.id_transporte != null ? String(gt.id_transporte) : "",
    detalle: gt?.detalle || "",
    capacidad:
      gt?.capacidad_maxima != null && gt.capacidad_maxima !== ""
        ? String(gt.capacidad_maxima)
        : "",
    categoria_logistica: ["PASAJEROS", "LOGISTICO", "INTERNO"].includes(catRaw)
      ? catRaw
      : "PASAJEROS",
  };
}

function vehDraftsEqual(a, b) {
  return ["id_transporte", "detalle", "capacidad", "categoria_logistica"].every(
    (k) => String(a?.[k] ?? "") === String(b?.[k] ?? ""),
  );
}

function rowStatusClass(status) {
  if (status === "saving") return "fimba-row-saving";
  if (status === "saved") return "fimba-row-saved";
  if (status === "dirty") return "fimba-row-dirty";
  if (status === "error") return "fimba-row-error";
  return "";
}

const CATEGORIA_OPTS = [
  { value: "PASAJEROS", label: "Pasajeros" },
  { value: "LOGISTICO", label: "Logístico" },
  { value: "INTERNO", label: "Interno" },
];

const ORIGEN_FILTERS = [
  { value: "all", label: "Todos" },
  { value: "fimba", label: "Solo FIMBA" },
  { value: "ofrn", label: "Solo OFRN" },
];

/**
 * Transportes FIMBA:
 * - Vehículos = unidades de flota `giras_transportes` (misma gira OFRN)
 * - Trayectos = planilla FIMBA + paradas/traslados OFRN de la gira
 */
export default function FimbaTransportPage() {
  const { edicionId, artistaId } = useParams();
  const { readOnly } = useFimbaAccess();
  const [searchParams] = useSearchParams();
  const filterFromQuery = searchParams.get("artista") || artistaId || null;

  const [edicion, setEdicion] = useState(null);
  const [propuestas, setPropuestas] = useState([]);
  const [vehiculos, setVehiculos] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [eventos, setEventos] = useState([]);
  /** Resumen logístico OFRN (subida/bajada + plaza_extra) para en tránsito. */
  const [logisticsSummary, setLogisticsSummary] = useState([]);
  const [ofrnPassengers, setOfrnPassengers] = useState([]);
  const [ofrnAdmissionRules, setOfrnAdmissionRules] = useState([]);
  const [ofrnRegions, setOfrnRegions] = useState([]);
  const [ofrnLocalities, setOfrnLocalities] = useState([]);
  /** Rutas FIMBA artista (cantidad) — subida/bajada explícitas. */
  const [propuestaRoutes, setPropuestaRoutes] = useState([]);
  const [filtroArtista, setFiltroArtista] = useState(filterFromQuery || "");
  /** Default Todos: ver rutas FIMBA + OFRN de la gira. */
  const [filtroOrigen, setFiltroOrigen] = useState("all");
  /**
   * Multi-select de unidades `giras_transportes.id`.
   * Vacío = todos; con ids = filas que usan alguna de esas unidades
   * (FIMBA: `fimba_evento_transportes`; OFRN: `eventos.id_gira_transporte`).
   */
  const [selectedVehiculoIds, setSelectedVehiculoIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modal, setModal] = useState(null); // null | { mode, evento? }
  /**
   * Modal compacto Destino → crea parada siguiente (intermedia si hay next).
   * { ev, vehicleId, nextEv, schedule: { fecha, hora_inicio } }
   */
  const [destinoModal, setDestinoModal] = useState(null);
  /** Panel subidas/bajadas (FIMBA cantidades + OFRN StopRules). */
  const [stopRulesModal, setStopRulesModal] = useState(null); // null | { event, type, transportId }
  const [showAddVeh, setShowAddVeh] = useState(false);
  /** `giras_transportes.id` en edición inline, o null. */
  const [editingVehiculoId, setEditingVehiculoId] = useState(null);
  const [savingVeh, setSavingVeh] = useState(false);
  const [vehForm, setVehForm] = useState({
    id_transporte: "",
    nuevo_tipo: "",
    detalle: "",
    capacidad: "",
    categoria_logistica: "PASAJEROS",
  });
  const [exportingVehicleId, setExportingVehicleId] = useState(null);
  const [exportingAll, setExportingAll] = useState(false);
  const showVehForm = showAddVeh || editingVehiculoId != null;
  const isEditingVeh = editingVehiculoId != null;

  /** Modo planilla: celdas inline + semáforo (oculto en consulta / token RO). */
  const [editMode, setEditMode] = useState(false);
  const [eventDrafts, setEventDrafts] = useState({});
  const [eventRowStatus, setEventRowStatus] = useState({});
  const [eventRowErrors, setEventRowErrors] = useState({});
  const [vehDrafts, setVehDrafts] = useState({});
  const [vehRowStatus, setVehRowStatus] = useState({});
  const [vehRowErrors, setVehRowErrors] = useState({});
  const savingEventRef = useRef(new Set());
  const savingVehRowRef = useRef(new Set());
  const eventDraftsRef = useRef(eventDrafts);
  eventDraftsRef.current = eventDrafts;
  const vehDraftsRef = useRef(vehDrafts);
  vehDraftsRef.current = vehDrafts;
  const eventosRef = useRef(eventos);
  eventosRef.current = eventos;
  const vehiculosRef = useRef(vehiculos);
  vehiculosRef.current = vehiculos;

  const reload = async () => {
    setLoading(true);
    setError(null);
    const edRes = await getFimbaEdicionById(edicionId);
    if (edRes.error || !edRes.edicion) {
      setError(edRes.error?.message || "Edición no encontrada");
      setEdicion(null);
      setLoading(false);
      return;
    }
    const ed = edRes.edicion;
    const [propsRes, flotaRes, trasRes, catRes, logRes, rutasRes] =
      await Promise.all([
        listFimbaPropuestas(edicionId),
        listFimbaFlota(ed.id_gira),
        listFimbaTraslados(edicionId, {
          id_propuesta: filtroArtista || null,
        }),
        listOfrnTransportesCatalog(),
        loadFimbaTransportLogisticsSummary(ed.id_gira),
        listFimbaPropuestaRutas(edicionId),
      ]);
    const firstErr =
      propsRes.error ||
      flotaRes.error ||
      trasRes.error ||
      catRes.error ||
      logRes.error ||
      rutasRes.error;
    if (firstErr) {
      setError(firstErr.message || "Error al cargar");
    }
    setEdicion(ed);
    setPropuestas(propsRes.propuestas || []);
    setVehiculos(flotaRes.vehiculos || flotaRes.flota || []);
    setCatalog(catRes.catalog || []);
    setEventos(trasRes.eventos || []);
    setLogisticsSummary(logRes.summary || []);
    setOfrnPassengers(logRes.passengers || logRes.summary || []);
    setOfrnAdmissionRules(logRes.admissionRules || []);
    setOfrnRegions(logRes.regions || []);
    setOfrnLocalities(logRes.localities || []);
    setPropuestaRoutes(rutasRes.rutas || []);
    setLoading(false);
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [edicionId, filtroArtista]);

  // Con filtro por artista no hay orquesta pura; reset origen
  useEffect(() => {
    if (filtroArtista) setFiltroOrigen("all");
  }, [filtroArtista]);

  // Quitar filtros de vehículos que ya no están en flota
  useEffect(() => {
    setSelectedVehiculoIds((prev) => {
      if (prev.length === 0) return prev;
      const valid = new Set(vehiculos.map((v) => Number(v.id)));
      const next = prev.filter((id) => valid.has(Number(id)));
      if (next.length === prev.length) return prev;
      return next;
    });
  }, [vehiculos]);

  useEffect(() => {
    if (readOnly && editMode) setEditMode(false);
  }, [readOnly, editMode]);

  // Drafts al entrar en modo edición; filas nuevas se hidratan sin pisar dirty.
  useEffect(() => {
    if (!editMode) {
      setEventDrafts({});
      setEventRowStatus({});
      setEventRowErrors({});
      setVehDrafts({});
      setVehRowStatus({});
      setVehRowErrors({});
      eventDraftsRef.current = {};
      vehDraftsRef.current = {};
      return;
    }
    setEventDrafts((prev) => {
      const next = {};
      for (const ev of eventos || []) {
        const k = String(ev.id);
        next[k] = prev[k] ?? draftFromEvent(ev);
      }
      eventDraftsRef.current = next;
      return next;
    });
    setVehDrafts((prev) => {
      const next = {};
      for (const gt of vehiculos || []) {
        const k = String(gt.id);
        next[k] = prev[k] ?? draftFromVehiculo(gt);
      }
      vehDraftsRef.current = next;
      return next;
    });
  }, [editMode, eventos, vehiculos]);

  useEffect(() => {
    const ids = [
      ...Object.entries(eventRowStatus)
        .filter(([, s]) => s === "saved")
        .map(([id]) => ({ kind: "event", id })),
      ...Object.entries(vehRowStatus)
        .filter(([, s]) => s === "saved")
        .map(([id]) => ({ kind: "veh", id })),
    ];
    if (ids.length === 0) return undefined;
    const t = setTimeout(() => {
      setEventRowStatus((prev) => {
        const n = { ...prev };
        let changed = false;
        for (const { kind, id } of ids) {
          if (kind === "event" && n[id] === "saved") {
            n[id] = "idle";
            changed = true;
          }
        }
        return changed ? n : prev;
      });
      setVehRowStatus((prev) => {
        const n = { ...prev };
        let changed = false;
        for (const { kind, id } of ids) {
          if (kind === "veh" && n[id] === "saved") {
            n[id] = "idle";
            changed = true;
          }
        }
        return changed ? n : prev;
      });
    }, 2200);
    return () => clearTimeout(t);
  }, [eventRowStatus, vehRowStatus]);

  const allVehiculosSelected =
    vehiculos.length > 0 && selectedVehiculoIds.length === vehiculos.length;
  const vehiculoFilterActive =
    selectedVehiculoIds.length > 0 &&
    selectedVehiculoIds.length < vehiculos.length;

  const handleVehiculoToggle = (idGiraTransporte) => {
    const id = Number(idGiraTransporte);
    setSelectedVehiculoIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const eventosFiltrados = useMemo(() => {
    let list = eventos;
    if (filtroOrigen === "fimba") {
      list = list.filter((ev) => ev.es_fimba);
    } else if (filtroOrigen === "ofrn") {
      list = list.filter((ev) => ev.es_ofrn);
    }
    if (selectedVehiculoIds.length > 0) {
      const want = new Set(selectedVehiculoIds.map(Number));
      list = list.filter((ev) =>
        giraTransporteIdsFromEvent(ev).some((id) => want.has(Number(id))),
      );
    }
    return list;
  }, [eventos, filtroOrigen, selectedVehiculoIds]);

  /**
   * Secuencias subida/bajada por unidad (planilla completa de trayectos de la edición,
   * no el subconjunto filtrado: el orden y el en tránsito necesitan toda la secuencia).
   */
  const sequencesByVehicle = useMemo(
    () =>
      buildAllVehicleBoardingSequences({
        vehiculos,
        eventos,
        logisticsSummary,
        capacityFn: computeFimbaCapacity,
        eventVehicleIds: giraTransporteIdsFromEvent,
        propuestaRoutes,
      }),
    [vehiculos, eventos, logisticsSummary, propuestaRoutes],
  );

  /** Mapa id integrante OFRN → datos para export de abordaje. */
  const ofrnPassengerById = useMemo(() => {
    const map = new Map();
    const src = ofrnPassengers?.length ? ofrnPassengers : logisticsSummary;
    for (const p of src || []) {
      if (p?.id == null) continue;
      if (p.estado_gira === "ausente") continue;
      map.set(String(p.id), p);
      map.set(Number(p.id), p);
    }
    return map;
  }, [ofrnPassengers, logisticsSummary]);

  const edicionLabel = edicion?.nombre || `Edicion_${edicionId}`;

  const exportVehiculo = async (gt) => {
    setExportingVehicleId(gt.id);
    try {
      await exportFimbaTransporteVehiculoExcel({
        edicionNombre: edicionLabel,
        vehiculo: gt,
        sequence: sequencesByVehicle.get(Number(gt.id)),
        passengerById: ofrnPassengerById,
      });
    } catch (err) {
      console.error(err);
      setError(err?.message || "Error al exportar vehículo");
    } finally {
      setExportingVehicleId(null);
    }
  };

  const exportTodosTransportes = async () => {
    setExportingAll(true);
    try {
      await exportFimbaTransporteTodosExcel({
        edicionNombre: edicionLabel,
        vehiculos,
        sequencesByVehicle,
        passengerById: ofrnPassengerById,
      });
    } catch (err) {
      console.error(err);
      setError(err?.message || "Error al exportar transportes");
    } finally {
      setExportingAll(false);
    }
  };

  const openStopRules = (ev, type) => {
    const ids = giraTransporteIdsFromEvent(ev).map(Number);
    let transportId = ids[0] ?? null;
    if (selectedVehiculoIds.length === 1) {
      transportId = selectedVehiculoIds[0];
    } else if (
      selectedVehiculoIds.length > 0 &&
      selectedVehiculoIds.length < vehiculos.length
    ) {
      const hit = ids.find((id) =>
        selectedVehiculoIds.map(Number).includes(Number(id)),
      );
      if (hit != null) transportId = hit;
    }
    setStopRulesModal({
      event: ev,
      type,
      transportId: transportId != null ? Number(transportId) : null,
    });
  };

  const preferVehicleIdsForMetrics =
    selectedVehiculoIds.length > 0 &&
    selectedVehiculoIds.length < vehiculos.length
      ? selectedVehiculoIds
      : null;

  const handleDelete = async (ev) => {
    const label = ev.actividad || ev.tipo_nombre || "trayecto";
    const ofrnNote =
      ev.es_ofrn && !ev.es_fimba
        ? "\n\nEs una parada/traslado de orquesta OFRN: se eliminará de la agenda de la gira."
        : "";
    if (
      !window.confirm(
        `¿Eliminar «${label}» del ${formatFecha(ev.fecha)}?${ofrnNote}`,
      )
    ) {
      return;
    }
    const { error: err } = await deleteFimbaTraslado(ev.id);
    if (err) {
      setError(err.message || "No se pudo eliminar");
      return;
    }
    reload();
  };

  /**
   * Abre modal create pre-filled para insertar parada intermedia en la
   * secuencia del vehículo primary de la fila (entre esta y el next stop).
   */
  const openIntermediateStop = (ev, metrics) => {
    const vehicleId =
      metrics?.primary?.id_gira_transporte ??
      metrics?.perVehicle?.[0]?.id_gira_transporte ??
      giraTransporteIdsFromEvent(ev)[0] ??
      null;
    if (vehicleId == null || vehicleId === "") return;

    const nextEv = metrics?.next_event || null;
    const { fecha, hora_inicio } = defaultIntermediateStopSchedule(ev, nextEv);
    const gt =
      vehiculos.find((g) => Number(g.id) === Number(vehicleId)) || null;
    const tipoId = eventTypeIdForCategoria(gt?.categoria_logistica);

    setModal({
      mode: "create",
      defaultTipoId: tipoId,
      preselectPropuesta: null,
      evento: {
        // Draft de create (no es edit): fecha/hora entre paradas, mismo bus
        fecha: fecha || ev.fecha || "",
        hora_inicio: hora_inicio || null,
        hora_fin: null,
        actividad: "Parada intermedia",
        destino: "",
        observaciones: "",
        audiencia_ofrn: "none",
        id_tipo_evento: tipoId,
        sin_servicio: false,
        id_gira_transporte: Number(vehicleId),
        vehiculos: [
          {
            id_gira_transporte: Number(vehicleId),
            plazas: 0,
            giras_transportes: gt || undefined,
          },
        ],
      },
    });
  };

  /**
   * IconEdit junto a Destino: crea la parada destino (no edita el next existente).
   * Con next real → inserta en el medio; sin next → crea la cola del vehículo.
   */
  const openDestinoStop = (ev, metrics) => {
    const vehicleId =
      metrics?.primary?.id_gira_transporte ??
      metrics?.perVehicle?.[0]?.id_gira_transporte ??
      giraTransporteIdsFromEvent(ev)[0] ??
      null;
    if (vehicleId == null || vehicleId === "") return;

    const nextEv = metrics?.next_event || null;
    const schedule = defaultIntermediateStopSchedule(ev, nextEv);
    setDestinoModal({
      ev,
      vehicleId: Number(vehicleId),
      nextEv,
      schedule: {
        fecha: schedule.fecha || ev.fecha || "",
        hora_inicio: schedule.hora_inicio || null,
      },
    });
  };

  const toggleEditMode = () => {
    setEditMode((v) => {
      const next = !v;
      if (next) setEditingVehiculoId(null);
      return next;
    });
  };

  const setEventField = (eventoId, field, value) => {
    const key = String(eventoId);
    setEventDrafts((prev) => {
      const ev = (eventosRef.current || []).find((x) => String(x.id) === key);
      const nextDraft = {
        ...(prev[key] || draftFromEvent(ev || {})),
        [field]: value,
      };
      const n = { ...prev, [key]: nextDraft };
      eventDraftsRef.current = n;
      return n;
    });
    setEventRowStatus((prev) => ({
      ...prev,
      [key]: prev[key] === "saving" ? "saving" : "dirty",
    }));
    setEventRowErrors((prev) => {
      if (!prev[key]) return prev;
      const n = { ...prev };
      delete n[key];
      return n;
    });
  };

  const commitEvento = async (eventoId, draftOverride = null) => {
    const key = String(eventoId);
    if (savingEventRef.current.has(key)) return;
    const ev = (eventosRef.current || []).find((x) => String(x.id) === key);
    if (!ev) return;

    const draft = draftOverride || eventDraftsRef.current[key] || draftFromEvent(ev);
    const baseline = draftFromEvent(ev);
    const planillaChanged = !planillaFieldsEqual(draft, baseline);
    const vehChanged =
      canInlineAssignVehicle(ev) &&
      String(draft.id_gira_transporte ?? "") !==
        String(baseline.id_gira_transporte ?? "");

    if (!planillaChanged && !vehChanged) {
      setEventRowStatus((prev) => ({
        ...prev,
        [key]: prev[key] === "error" ? "error" : "idle",
      }));
      return;
    }

    if (!String(draft.fecha || "").trim()) {
      setEventRowStatus((prev) => ({ ...prev, [key]: "error" }));
      setEventRowErrors((prev) => ({ ...prev, [key]: "Fecha requerida" }));
      return;
    }

    savingEventRef.current.add(key);
    setEventRowStatus((prev) => ({ ...prev, [key]: "saving" }));
    setEventRowErrors((prev) => {
      const n = { ...prev };
      delete n[key];
      return n;
    });

    let merged = { ...ev };
    if (planillaChanged) {
      const { evento: patched, error: err } = await patchFimbaEventoPlanilla(
        ev.id,
        {
          fecha: draft.fecha,
          hora_inicio: draft.hora_inicio,
          hora_fin: draft.hora_fin,
          actividad: draft.actividad,
          destino: draft.destino,
          vuelo: draft.vuelo,
          observaciones: draft.observaciones,
        },
      );
      if (err) {
        savingEventRef.current.delete(key);
        setEventRowStatus((prev) => ({ ...prev, [key]: "error" }));
        setEventRowErrors((prev) => ({
          ...prev,
          [key]: err.message || "Error al guardar",
        }));
        return;
      }
      merged = {
        ...merged,
        fecha: patched.fecha,
        hora_inicio: patched.hora_inicio,
        hora_fin: patched.hora_fin,
        descripcion: patched.descripcion,
        actividad: patched.actividad,
        destino: patched.destino || merged.locacion_nombre || "",
        vuelo: patched.vuelo,
        observaciones: patched.observaciones,
      };
    }

    if (vehChanged) {
      const nextId = String(draft.id_gira_transporte || "").trim();
      const prevPlazas = Number(ev.vehiculos?.[0]?.plazas) || 0;
      const assignments = nextId
        ? [{ id_gira_transporte: Number(nextId), plazas: prevPlazas }]
        : [];
      const { rows, error: vehErr } = await setFimbaEventoTransportes(
        ev.id,
        assignments,
      );
      if (vehErr) {
        savingEventRef.current.delete(key);
        setEventRowStatus((prev) => ({ ...prev, [key]: "error" }));
        setEventRowErrors((prev) => ({
          ...prev,
          [key]: vehErr.message || "Error al asignar vehículo",
        }));
        return;
      }
      const nextVeh = rows || [];
      merged = {
        ...merged,
        vehiculos: nextVeh,
        sin_servicio: nextVeh.length === 0,
      };
    }

    savingEventRef.current.delete(key);
    const nextDraft = draftFromEvent(merged);
    setEventDrafts((prev) => {
      const n = { ...prev, [key]: nextDraft };
      eventDraftsRef.current = n;
      return n;
    });
    setEventRowStatus((prev) => ({ ...prev, [key]: "saved" }));
    setEventos((prev) => {
      const next = (prev || []).map((row) =>
        String(row.id) === key ? merged : row,
      );
      eventosRef.current = next;
      return next;
    });
  };

  const changeAndCommitEvento = (eventoId, field, value) => {
    const key = String(eventoId);
    const ev = (eventosRef.current || []).find((x) => String(x.id) === key);
    const nextDraft = {
      ...(eventDraftsRef.current[key] || draftFromEvent(ev || {})),
      [field]: value,
    };
    setEventDrafts((prev) => {
      const n = { ...prev, [key]: nextDraft };
      eventDraftsRef.current = n;
      return n;
    });
    setEventRowStatus((prev) => ({ ...prev, [key]: "dirty" }));
    setEventRowErrors((prev) => {
      if (!prev[key]) return prev;
      const n = { ...prev };
      delete n[key];
      return n;
    });
    commitEvento(eventoId, nextDraft);
  };

  const setVehField = (vehiculoId, field, value) => {
    const key = String(vehiculoId);
    setVehDrafts((prev) => {
      const gt = (vehiculosRef.current || []).find((x) => String(x.id) === key);
      const nextDraft = {
        ...(prev[key] || draftFromVehiculo(gt || {})),
        [field]: value,
      };
      const n = { ...prev, [key]: nextDraft };
      vehDraftsRef.current = n;
      return n;
    });
    setVehRowStatus((prev) => ({
      ...prev,
      [key]: prev[key] === "saving" ? "saving" : "dirty",
    }));
    setVehRowErrors((prev) => {
      if (!prev[key]) return prev;
      const n = { ...prev };
      delete n[key];
      return n;
    });
  };

  const commitVehiculoRow = async (vehiculoId, draftOverride = null) => {
    const key = String(vehiculoId);
    if (savingVehRowRef.current.has(key)) return;
    const gt = (vehiculosRef.current || []).find((x) => String(x.id) === key);
    if (!gt) return;

    const draft = draftOverride || vehDraftsRef.current[key] || draftFromVehiculo(gt);
    if (vehDraftsEqual(draft, draftFromVehiculo(gt))) {
      setVehRowStatus((prev) => ({
        ...prev,
        [key]: prev[key] === "error" ? "error" : "idle",
      }));
      return;
    }
    if (!draft.id_transporte) {
      setVehRowStatus((prev) => ({ ...prev, [key]: "error" }));
      setVehRowErrors((prev) => ({
        ...prev,
        [key]: "Seleccioná un tipo del catálogo",
      }));
      return;
    }

    savingVehRowRef.current.add(key);
    setVehRowStatus((prev) => ({ ...prev, [key]: "saving" }));
    setVehRowErrors((prev) => {
      const n = { ...prev };
      delete n[key];
      return n;
    });

    const { vehiculo, error: err } = await updateFimbaVehiculo(gt.id, {
      id_transporte: draft.id_transporte,
      detalle: draft.detalle,
      capacidad_maxima: draft.capacidad,
      categoria_logistica: draft.categoria_logistica,
    });
    savingVehRowRef.current.delete(key);
    if (err) {
      setVehRowStatus((prev) => ({ ...prev, [key]: "error" }));
      setVehRowErrors((prev) => ({
        ...prev,
        [key]: err.message || "No se pudo actualizar el vehículo",
      }));
      return;
    }

    const nextDraft = draftFromVehiculo(vehiculo);
    setVehDrafts((prev) => {
      const n = { ...prev, [key]: nextDraft };
      vehDraftsRef.current = n;
      return n;
    });
    setVehRowStatus((prev) => ({ ...prev, [key]: "saved" }));
    setVehiculos((prev) => {
      const next = (prev || []).map((v) =>
        Number(v.id) === Number(gt.id) ? vehiculo : v,
      );
      vehiculosRef.current = next;
      return next;
    });
    setEventos((prev) => {
      const next = (prev || []).map((ev) => ({
        ...ev,
        vehiculos: (ev.vehiculos || []).map((r) =>
          Number(r.id_gira_transporte) === Number(gt.id)
            ? { ...r, giras_transportes: vehiculo }
            : r,
        ),
      }));
      eventosRef.current = next;
      return next;
    });
  };

  const changeAndCommitVehiculo = (vehiculoId, field, value) => {
    const key = String(vehiculoId);
    const gt = (vehiculosRef.current || []).find((x) => String(x.id) === key);
    const nextDraft = {
      ...(vehDraftsRef.current[key] || draftFromVehiculo(gt || {})),
      [field]: value,
    };
    setVehDrafts((prev) => {
      const n = { ...prev, [key]: nextDraft };
      vehDraftsRef.current = n;
      return n;
    });
    setVehRowStatus((prev) => ({ ...prev, [key]: "dirty" }));
    setVehRowErrors((prev) => {
      if (!prev[key]) return prev;
      const n = { ...prev };
      delete n[key];
      return n;
    });
    commitVehiculoRow(vehiculoId, nextDraft);
  };

  const resetVehForm = () => {
    setVehForm({
      id_transporte: "",
      nuevo_tipo: "",
      detalle: "",
      capacidad: "",
      categoria_logistica: "PASAJEROS",
    });
  };

  const closeVehForm = () => {
    setShowAddVeh(false);
    setEditingVehiculoId(null);
    resetVehForm();
  };

  const startEditVehiculo = (gt) => {
    if (!gt?.id) return;
    setShowAddVeh(false);
    setError(null);
    const catRaw = String(gt.categoria_logistica || "PASAJEROS").toUpperCase();
    const categoria_logistica = ["PASAJEROS", "LOGISTICO", "INTERNO"].includes(
      catRaw,
    )
      ? catRaw
      : "PASAJEROS";
    setEditingVehiculoId(gt.id);
    setVehForm({
      id_transporte: gt.id_transporte != null ? String(gt.id_transporte) : "",
      nuevo_tipo: "",
      detalle: gt.detalle || "",
      capacidad:
        gt.capacidad_maxima != null && gt.capacidad_maxima !== ""
          ? String(gt.capacidad_maxima)
          : "",
      categoria_logistica,
    });
  };

  const handleSaveVehiculo = async (e) => {
    e?.preventDefault?.();
    if (!edicion?.id_gira) return;
    setSavingVeh(true);
    setError(null);

    if (editingVehiculoId != null) {
      if (!vehForm.id_transporte) {
        setSavingVeh(false);
        setError("Seleccioná un tipo del catálogo");
        return;
      }
      const { vehiculo, error: err } = await updateFimbaVehiculo(
        editingVehiculoId,
        {
          id_transporte: vehForm.id_transporte,
          detalle: vehForm.detalle,
          capacidad_maxima: vehForm.capacidad,
          categoria_logistica: vehForm.categoria_logistica,
        },
      );
      setSavingVeh(false);
      if (err) {
        setError(err.message || "No se pudo actualizar el vehículo");
        return;
      }
      if (vehiculo) {
        setVehiculos((prev) =>
          prev.map((v) =>
            Number(v.id) === Number(editingVehiculoId) ? vehiculo : v,
          ),
        );
      }
      closeVehForm();
      // Refrescar trayectos / labels / en tránsito (sin overlay de carga global)
      const giraId = edicion.id_gira;
      const [flotaRes, trasRes, logRes] = await Promise.all([
        listFimbaFlota(giraId),
        listFimbaTraslados(edicionId, {
          id_propuesta: filtroArtista || null,
        }),
        loadFimbaTransportLogisticsSummary(giraId),
      ]);
      if (!flotaRes.error) {
        setVehiculos(flotaRes.vehiculos || flotaRes.flota || []);
      }
      if (!trasRes.error) setEventos(trasRes.eventos || []);
      if (!logRes.error) {
        setLogisticsSummary(logRes.summary || []);
        setOfrnPassengers(logRes.passengers || logRes.summary || []);
        setOfrnAdmissionRules(logRes.admissionRules || []);
        setOfrnRegions(logRes.regions || []);
        setOfrnLocalities(logRes.localities || []);
      }
      return;
    }

    const useNuevoTipo = !vehForm.id_transporte && vehForm.nuevo_tipo.trim();
    const { vehiculo, error: err } = await addFimbaVehiculo({
      id_gira: edicion.id_gira,
      id_transporte: vehForm.id_transporte || null,
      catalog_nombre: useNuevoTipo ? vehForm.nuevo_tipo.trim() : null,
      detalle: vehForm.detalle,
      capacidad_maxima: vehForm.capacidad,
      categoria_logistica: vehForm.categoria_logistica,
    });
    setSavingVeh(false);
    if (err) {
      setError(err.message || "No se pudo agregar el vehículo");
      return;
    }
    if (vehiculo) {
      setVehiculos((prev) => [...prev, vehiculo]);
    }
    closeVehForm();
    // recargar catálogo por si se creó tipo nuevo
    const catRes = await listOfrnTransportesCatalog();
    if (!catRes.error) setCatalog(catRes.catalog || []);
  };

  const ofrnFleetHref = edicion ? ofrnGiraTransporteUrl(edicion.id_gira) : "#";
  const backHref = artistaId
    ? `/fimba/edicion/${edicionId}/artista/${artistaId}`
    : `/fimba/edicion/${edicionId}`;

  if (loading) {
    return (
      <div className="fimba-card fimba-muted" style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <IconLoader size={18} className="animate-spin" /> Cargando transportes…
      </div>
    );
  }

  if (!edicion) {
    return (
      <div>
        <div className="fimba-error">{error || "Edición no encontrada."}</div>
        <Link to="/fimba" className="fimba-btn fimba-btn-ghost" style={{ marginTop: 12, textDecoration: "none" }}>
          <IconArrowLeft size={14} /> Volver
        </Link>
      </div>
    );
  }

  return (
    <div className="fimba-transport-wide">
      <Link
        to={backHref}
        className="fimba-btn fimba-btn-ghost"
        style={{ textDecoration: "none", marginBottom: 12 }}
      >
        <IconArrowLeft size={14} /> {artistaId ? "Artista" : edicion.nombre}
      </Link>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "1rem",
          alignItems: "flex-start",
          marginBottom: "1.25rem",
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: "1.5rem", color: "var(--fimba-deep)" }}>
            Transportes
          </h1>
          <p className="fimba-muted" style={{ margin: "0.35rem 0 0" }}>
            Vehículos de la gira · trayectos FIMBA + paradas OFRN
            {" · "}
            <a href={ofrnFleetHref} style={{ color: "var(--fimba-cyan)", fontWeight: 600 }}>
              Ver en OFRN Logística
            </a>
          </p>
        </div>
        {!readOnly && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <button
              type="button"
              className={`fimba-btn ${editMode ? "fimba-btn-primary" : "fimba-btn-ghost"}`}
              onClick={toggleEditMode}
              title={
                editMode
                  ? "Salir del modo planilla"
                  : "Editar celdas como planilla"
              }
            >
              <IconPencil size={14} />
              {editMode ? "Salir de modo edición" : "Modo edición"}
            </button>
            <button
              type="button"
              className="fimba-btn fimba-btn-primary"
              onClick={() =>
                setModal({
                  mode: "create",
                  preselectPropuesta: filtroArtista || artistaId || null,
                })
              }
              title={
                vehiculos.length === 0
                  ? "Sin vehículos: solo podés marcar SIN SERVICIO"
                  : "Nuevo trayecto"
              }
            >
              <IconPlus size={16} /> Nuevo trayecto
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="fimba-error" style={{ marginBottom: "1rem" }}>
          {error}
        </div>
      )}

      {/* Vehículos = giras_transportes (unidades), no trayectos */}
      <section className="fimba-card" style={{ marginBottom: "1.25rem" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            marginBottom: 10,
            flexWrap: "wrap",
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: "1rem",
              color: "var(--fimba-deep)",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <IconBus size={16} /> Vehículos
          </h2>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span className="fimba-badge">
              {vehiculos.length} unidad{vehiculos.length === 1 ? "" : "es"}
            </span>
            <button
              type="button"
              className="fimba-btn fimba-btn-ghost"
              style={{ padding: "0.35rem 0.7rem", fontSize: "0.85rem" }}
              disabled={exportingAll || vehiculos.length === 0}
              onClick={exportTodosTransportes}
              title="Excel: resumen de flota + abordaje por vehículo"
            >
              {exportingAll ? (
                <IconLoader size={14} className="animate-spin" />
              ) : (
                <IconFileExcel size={14} />
              )}{" "}
              Exportar flota
            </button>
            {!readOnly && (
            <button
              type="button"
              className="fimba-btn fimba-btn-primary"
              style={{ padding: "0.35rem 0.7rem", fontSize: "0.85rem" }}
              onClick={() => {
                if (showVehForm) {
                  closeVehForm();
                } else {
                  setEditingVehiculoId(null);
                  resetVehForm();
                  setShowAddVeh(true);
                }
              }}
            >
              {showVehForm ? (
                <>
                  <IconX size={14} /> Cancelar
                </>
              ) : (
                <>
                  <IconPlus size={14} /> Agregar vehículo
                </>
              )}
            </button>
            )}
          </div>
        </div>
        <p className="fimba-muted" style={{ margin: "0 0 0.75rem", fontSize: "0.82rem" }}>
          Flota de la gira OFRN (
          <code style={{ fontSize: "0.78rem" }}>giras_transportes</code>
          ). El nombre es el del catálogo (
          <code style={{ fontSize: "0.78rem" }}>transportes.nombre</code>
          ) + patente; el detalle OFRN es nota/ruta, no el nombre. Pico en tránsito =
          máximo de plazas a bordo (orquesta con <code style={{ fontSize: "0.75rem" }}>plaza_extra</code> +
          FIMBA) tras cada parada, vs capacidad de la unidad.
        </p>

        {showVehForm && !readOnly && (
          <form
            onSubmit={handleSaveVehiculo}
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
              gap: 10,
              marginBottom: "1rem",
              padding: "0.85rem",
              background: isEditingVeh
                ? "rgba(148,33,109,0.06)"
                : "rgba(0,177,235,0.06)",
              border: "1px solid var(--fimba-border)",
              borderRadius: 10,
              alignItems: "end",
            }}
          >
            <div className="fimba-field" style={{ margin: 0 }}>
              <label className="fimba-label">Vehículo (catálogo)</label>
              <select
                className="fimba-select"
                value={vehForm.id_transporte}
                required={isEditingVeh}
                onChange={(e) =>
                  setVehForm((f) => ({
                    ...f,
                    id_transporte: e.target.value,
                    nuevo_tipo: e.target.value ? "" : f.nuevo_tipo,
                  }))
                }
              >
                <option value="">
                  {isEditingVeh ? "— Elegir —" : "— Elegir o crear —"}
                </option>
                {catalog.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                    {c.patente ? ` (${c.patente})` : ""}
                  </option>
                ))}
              </select>
            </div>
            {!isEditingVeh && !vehForm.id_transporte && (
              <div className="fimba-field" style={{ margin: 0 }}>
                <label className="fimba-label">Nuevo vehículo</label>
                <input
                  className="fimba-input"
                  placeholder="Ej. Charter 1, Furgón 1"
                  value={vehForm.nuevo_tipo}
                  onChange={(e) =>
                    setVehForm((f) => ({ ...f, nuevo_tipo: e.target.value }))
                  }
                />
              </div>
            )}
            <div className="fimba-field" style={{ margin: 0, minWidth: 180 }}>
              <label className="fimba-label">Nota / detalle OFRN</label>
              <input
                className="fimba-input"
                placeholder="Opcional (ruta, tramo…)"
                value={vehForm.detalle}
                onChange={(e) =>
                  setVehForm((f) => ({ ...f, detalle: e.target.value }))
                }
              />
            </div>
            <div className="fimba-field" style={{ margin: 0 }}>
              <label className="fimba-label">Plazas</label>
              <input
                className="fimba-input"
                type="number"
                min={0}
                placeholder="Capacidad"
                value={vehForm.capacidad}
                onChange={(e) =>
                  setVehForm((f) => ({ ...f, capacidad: e.target.value }))
                }
              />
            </div>
            <div className="fimba-field" style={{ margin: 0 }}>
              <label className="fimba-label">Categoría</label>
              <select
                className="fimba-select"
                value={vehForm.categoria_logistica}
                onChange={(e) =>
                  setVehForm((f) => ({
                    ...f,
                    categoria_logistica: e.target.value,
                  }))
                }
              >
                {CATEGORIA_OPTS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="fimba-btn fimba-btn-primary"
              disabled={savingVeh}
              style={{ height: 38 }}
            >
              {savingVeh ? (
                <>
                  <IconLoader size={14} className="animate-spin" /> Guardando…
                </>
              ) : isEditingVeh ? (
                <>
                  <IconEdit size={14} /> Guardar cambios
                </>
              ) : (
                <>
                  <IconPlus size={14} /> Guardar vehículo
                </>
              )}
            </button>
          </form>
        )}

        {vehiculos.length === 0 ? (
          <div
            style={{
              background: "#fff7ed",
              border: "1px solid #fed7aa",
              borderRadius: 10,
              padding: "0.85rem 1rem",
              fontSize: "0.9rem",
            }}
          >
            <strong style={{ color: "var(--fimba-deep)" }}>Sin vehículos en la gira.</strong>
            <p className="fimba-muted" style={{ margin: "0.35rem 0 0.75rem" }}>
              Agregá unidades acá (escribe en{" "}
              <code style={{ fontSize: "0.8rem" }}>giras_transportes</code>
              , el mismo master que OFRN) o en Logística → Transporte de la gira.
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                type="button"
                className="fimba-btn fimba-btn-primary"
                onClick={() => {
                  setEditingVehiculoId(null);
                  resetVehForm();
                  setShowAddVeh(true);
                }}
              >
                <IconPlus size={14} /> Agregar vehículo
              </button>
              <a
                href={ofrnFleetHref}
                className="fimba-btn fimba-btn-ghost"
                style={{ textDecoration: "none" }}
              >
                Ir a OFRN
              </a>
            </div>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className={`fimba-table${editMode ? " fimba-table-edit" : ""}`}>
              <thead>
                <tr>
                  {editMode && <th className="fimba-sync-col" title="Semáforo" />}
                  <th style={{ paddingLeft: editMode ? undefined : 0 }}>Vehículo</th>
                  <th>Nota / detalle OFRN</th>
                  <th>Categoría</th>
                  <th>Capacidad</th>
                  <th>Pico en tránsito</th>
                  <th>Libres (pico)</th>
                  <th style={{ width: 100 }}></th>
                </tr>
              </thead>
              <tbody>
                {vehiculos.map((gt) => {
                  const cap = capacidadGiraTransporte(gt);
                  const nota = detalleGiraTransporte(gt);
                  const seq = sequencesByVehicle.get(Number(gt.id));
                  const peak = seq?.peak_en_transito ?? 0;
                  const over = Boolean(seq?.overbook_peak);
                  const libresPeak =
                    cap != null ? Math.max(0, cap - peak) : null;
                  const rowEditing =
                    Number(editingVehiculoId) === Number(gt.id);
                  const isExporting =
                    Number(exportingVehicleId) === Number(gt.id);
                  const vehKey = String(gt.id);
                  const vehDraft = vehDrafts[vehKey] || draftFromVehiculo(gt);
                  const vehStatus = vehRowStatus[vehKey] || "idle";
                  const vehSaving = vehStatus === "saving";
                  return (
                    <tr
                      key={gt.id}
                      className={editMode ? rowStatusClass(vehStatus) : undefined}
                      style={
                        !editMode && rowEditing
                          ? { background: "rgba(148,33,109,0.06)" }
                          : undefined
                      }
                    >
                      {editMode && (
                        <SyncDot status={vehStatus} error={vehRowErrors[vehKey]} />
                      )}
                      <td style={{ paddingLeft: editMode ? undefined : 0, fontWeight: 600 }}>
                        {editMode ? (
                          <select
                            className="fimba-cell-input"
                            value={vehDraft.id_transporte}
                            disabled={vehSaving}
                            onChange={(e) =>
                              changeAndCommitVehiculo(
                                gt.id,
                                "id_transporte",
                                e.target.value,
                              )
                            }
                            title="Tipo de catálogo (nombre del vehículo)"
                          >
                            <option value="">— Elegir —</option>
                            {catalog.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.nombre}
                                {c.patente ? ` (${c.patente})` : ""}
                              </option>
                            ))}
                          </select>
                        ) : (
                          labelGiraTransporte(gt)
                        )}
                      </td>
                      <td
                        className="fimba-muted"
                        style={{ maxWidth: 280, fontSize: "0.85rem" }}
                        title={nota || undefined}
                      >
                        {editMode ? (
                          <input
                            className="fimba-cell-input"
                            value={vehDraft.detalle}
                            disabled={vehSaving}
                            placeholder="Ruta, tramo…"
                            onChange={(e) =>
                              setVehField(gt.id, "detalle", e.target.value)
                            }
                            onBlur={() => commitVehiculoRow(gt.id)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                commitVehiculoRow(gt.id);
                              }
                              if (e.key === "Escape") {
                                e.preventDefault();
                                setVehDrafts((prev) => {
                                  const n = {
                                    ...prev,
                                    [vehKey]: draftFromVehiculo(gt),
                                  };
                                  vehDraftsRef.current = n;
                                  return n;
                                });
                                setVehRowStatus((prev) => ({
                                  ...prev,
                                  [vehKey]: "idle",
                                }));
                                e.target.blur();
                              }
                            }}
                          />
                        ) : (
                          nota || "—"
                        )}
                      </td>
                      <td>
                        {editMode ? (
                          <select
                            className="fimba-cell-input"
                            value={vehDraft.categoria_logistica}
                            disabled={vehSaving}
                            onChange={(e) =>
                              changeAndCommitVehiculo(
                                gt.id,
                                "categoria_logistica",
                                e.target.value,
                              )
                            }
                          >
                            {CATEGORIA_OPTS.map((o) => (
                              <option key={o.value} value={o.value}>
                                {o.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="fimba-badge">
                            {gt.categoria_logistica || "PASAJEROS"}
                          </span>
                        )}
                      </td>
                      <td>
                        {editMode ? (
                          <input
                            className="fimba-cell-input fimba-cell-num"
                            type="number"
                            min={0}
                            value={vehDraft.capacidad}
                            disabled={vehSaving}
                            onChange={(e) =>
                              setVehField(gt.id, "capacidad", e.target.value)
                            }
                            onBlur={() => commitVehiculoRow(gt.id)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                commitVehiculoRow(gt.id);
                              }
                            }}
                          />
                        ) : cap != null ? (
                          `${cap}`
                        ) : (
                          "—"
                        )}
                      </td>
                      <td>
                        <span
                          style={{
                            fontWeight: 700,
                            color: over ? "#b91c1c" : undefined,
                          }}
                          title="Máximo de plazas a bordo en la secuencia de paradas"
                        >
                          {peak}
                          {cap != null ? ` / ${cap}` : ""}
                        </span>
                        {over ? (
                          <span
                            className="fimba-badge"
                            style={{
                              display: "block",
                              marginTop: 4,
                              width: "fit-content",
                              background: "#fee2e2",
                              color: "#991b1b",
                              fontSize: "0.7rem",
                            }}
                          >
                            Sobre cupo
                          </span>
                        ) : null}
                        {seq?.warn_negative ? (
                          <span
                            className="fimba-muted"
                            style={{
                              display: "block",
                              fontSize: "0.7rem",
                              color: "#b45309",
                            }}
                          >
                            Revisar bajadas (conteo &lt; 0)
                          </span>
                        ) : null}
                      </td>
                      <td>
                        {libresPeak != null ? libresPeak : "—"}
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                          <button
                            type="button"
                            className="fimba-btn fimba-btn-ghost"
                            title="Exportar abordaje y secuencia (Excel)"
                            aria-label={`Exportar ${labelGiraTransporte(gt)}`}
                            style={{ padding: "0.25rem 0.4rem" }}
                            disabled={isExporting}
                            onClick={() => exportVehiculo(gt)}
                          >
                            {isExporting ? (
                              <IconLoader size={15} className="animate-spin" />
                            ) : (
                              <IconFileExcel size={15} />
                            )}
                          </button>
                          {!readOnly && !editMode && (
                            <button
                              type="button"
                              className="fimba-btn fimba-btn-ghost"
                              title="Editar vehículo"
                              aria-label={`Editar ${labelGiraTransporte(gt)}`}
                              style={{
                                padding: "0.25rem 0.4rem",
                                color: rowEditing
                                  ? "var(--fimba-deep)"
                                  : undefined,
                              }}
                              onClick={() =>
                                rowEditing
                                  ? closeVehForm()
                                  : startEditVehiculo(gt)
                              }
                            >
                              <IconEdit size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Trayectos = planilla FIMBA + OFRN transporte */}
      <section>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            marginBottom: 10,
            flexWrap: "wrap",
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: "1.05rem",
              color: "var(--fimba-deep)",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <IconClock size={16} /> Trayectos
          </h2>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            {!filtroArtista && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                {ORIGEN_FILTERS.map((f) => {
                  const on = filtroOrigen === f.value;
                  return (
                    <button
                      key={f.value}
                      type="button"
                      className={`fimba-btn fimba-chip${on ? " fimba-chip-on" : ""}`}
                      onClick={() => setFiltroOrigen(f.value)}
                      style={{
                        padding: "0.3rem 0.65rem",
                        fontSize: "0.78rem",
                      }}
                    >
                      {f.label}
                    </button>
                  );
                })}
              </div>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <label className="fimba-label" style={{ margin: 0 }}>
                Artista
              </label>
              <select
                className="fimba-select"
                style={{ width: "auto", minWidth: 180 }}
                value={filtroArtista || ""}
                onChange={(e) => setFiltroArtista(e.target.value)}
              >
                <option value="">Toda la edición</option>
                {propuestas.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <p className="fimba-muted" style={{ margin: "0 0 0.75rem", fontSize: "0.82rem" }}>
          Cada fila es un trayecto o parada ordenado por fecha/hora. Subida/bajada y
          tránsito/cap siguen el criterio OFRN (reglas de ruta +{" "}
          <code style={{ fontSize: "0.75rem" }}>plaza_extra</code>) y plazas FIMBA.
          Tránsito = plazas a bordo al <em>salir</em> de la parada vs{" "}
          <code style={{ fontSize: "0.75rem" }}>capacidad_maxima</code> (libres al hover).
          Origen, fecha y horario quedan fijos al desplazar horizontalmente el resto de la
          planilla. Filtrá un vehículo para la secuencia de esa unidad. ↑/↓ = quién sube/baja.
          {editMode
            ? " Modo edición: fecha, horas, actividad, obs., locación texto y vehículo FIMBA (una unidad) se guardan solos."
            : ""}
        </p>

        {vehiculos.length > 0 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
              marginBottom: 12,
            }}
          >
            <span
              className="fimba-muted"
              style={{
                fontSize: "0.72rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              Vehículo
            </span>
            <button
              type="button"
              className="fimba-btn"
              onClick={() => setSelectedVehiculoIds([])}
              title="Todos los vehículos (sin filtro)"
              style={{
                background:
                  selectedVehiculoIds.length === 0 || allVehiculosSelected
                    ? "var(--fimba-deep)"
                    : "#fff",
                color:
                  selectedVehiculoIds.length === 0 || allVehiculosSelected
                    ? "#fff"
                    : "var(--fimba-text)",
                borderColor:
                  selectedVehiculoIds.length === 0 || allVehiculosSelected
                    ? "var(--fimba-deep)"
                    : "var(--fimba-border)",
                padding: "0.28rem 0.6rem",
                fontSize: "0.75rem",
              }}
            >
              Todos
            </button>
            {vehiculos.map((gt) => {
              const isActive =
                selectedVehiculoIds.length === 0 ||
                selectedVehiculoIds.includes(Number(gt.id));
              return (
                <button
                  key={gt.id}
                  type="button"
                  className="fimba-btn"
                  onClick={() => {
                    if (selectedVehiculoIds.length === 0) {
                      setSelectedVehiculoIds([Number(gt.id)]);
                      return;
                    }
                    if (allVehiculosSelected) {
                      setSelectedVehiculoIds([Number(gt.id)]);
                      return;
                    }
                    handleVehiculoToggle(gt.id);
                  }}
                  title={detalleGiraTransporte(gt) || labelGiraTransporte(gt)}
                  style={{
                    background: isActive ? "rgba(0,177,235,0.12)" : "#fff",
                    color: isActive ? "var(--fimba-deep)" : "var(--fimba-muted, #64748b)",
                    borderColor: isActive
                      ? "var(--fimba-cyan)"
                      : "var(--fimba-border)",
                    padding: "0.28rem 0.6rem",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    opacity: isActive ? 1 : 0.55,
                  }}
                >
                  {labelGiraTransporte(gt)}
                </button>
              );
            })}
          </div>
        )}

        {eventosFiltrados.length === 0 ? (
          <div className="fimba-card fimba-muted">
            No hay trayectos
            {filtroArtista ? " para este artista" : ""}
            {filtroOrigen === "fimba" ? " (origen FIMBA)" : ""}
            {filtroOrigen === "ofrn" ? " (origen OFRN)" : ""}
            {vehiculoFilterActive ? " con los vehículos seleccionados" : ""}
            .
            {eventos.length === 0
              ? vehiculos.length > 0
                ? " Creá el primero con «Nuevo trayecto»."
                : " Podés crear trayectos SIN SERVICIO o agregar vehículos arriba."
              : " Probá otro origen o vehículo."}
          </div>
        ) : (
          <div className="fimba-card fimba-planilla-card">
            <div className="fimba-planilla-scroll" role="region" aria-label="Planilla de trayectos (desplazá horizontalmente para ver todas las columnas)">
              <table
                className={`fimba-table fimba-planilla-table${editMode ? " fimba-table-edit" : ""}`}
              >
                <thead>
                  <tr>
                    {editMode && (
                      <th className="fimba-sync-col fimba-sticky-sync" title="Semáforo" />
                    )}
                    <th className="fimba-sticky-origen">Origen</th>
                    <th className="fimba-sticky-fecha">Fecha</th>
                    <th
                      className="fimba-sticky-hora"
                      title="Hora de comienzo · hora de fin (calculada en itálico si no está guardada)"
                    >
                      Com · Fin
                    </th>
                    <th>Actividad</th>
                    <th>Locación</th>
                    <th
                      title="Agregar parada intermedia entre esta fila y el Destino"
                      style={{ width: 36, textAlign: "center", padding: "0.4rem 0.15rem" }}
                    >
                      <span className="fimba-muted" style={{ fontSize: "0.7rem" }}>
                        +
                      </span>
                    </th>
                    <th
                      title="Locación (o destino) de la siguiente parada del mismo vehículo"
                    >
                      Destino
                    </th>
                    <th>Vehículo</th>
                    <th title="Movimiento en la parada (subida / bajada)">Mov.</th>
                    <th title="Plazas que suben − plazas que bajan">Δ</th>
                    <th title="Plazas a bordo al salir de la parada / capacidad de la unidad">
                      Tránsito/cap
                    </th>
                    <th title="Artistas FIMBA y orquesta presentes en la parada (con plazas)">
                      Artistas
                    </th>
                    <th className="fimba-planilla-actions" />
                  </tr>
                </thead>
                <tbody>
                  {eventosFiltrados.map((ev) => {
                    const ofrnVeh =
                      vehiculos.find(
                        (g) => Number(g.id) === Number(ev.id_gira_transporte),
                      ) || null;
                    const vehLabel =
                      (ev.vehiculos || []).length > 0
                        ? (ev.vehiculos || [])
                            .map((r) => {
                              const label = labelGiraTransporte(r.giras_transportes);
                              const pl = Number(r.plazas) || 0;
                              return pl ? `${label} (${pl})` : label;
                            })
                            .join(", ") || "—"
                        : ofrnVeh
                          ? labelGiraTransporte(ofrnVeh)
                          : ev.es_ofrn && !ev.es_fimba
                            ? "—"
                            : "SIN SERVICIO";
                    const metrics = boardingMetricsForEventRow(
                      ev,
                      sequencesByVehicle,
                      preferVehicleIdsForMetrics,
                    );
                    const stop = metrics.primary?.stop || null;
                    const multiVeh =
                      (metrics.perVehicle || []).filter((p) => p.stop).length > 1;
                    const labels = resolveStopArtistasLabels(
                      ev,
                      metrics,
                      computeFimbaCapacity,
                    );
                    const locacion = metrics.location || formatEventLocation(ev);
                    const destinoSiguiente =
                      metrics.destino_siguiente != null
                        ? metrics.destino_siguiente
                        : "—";
                    const horaFinDisp = metrics.hora_fin_display || {
                      value: ev.hora_fin ? String(ev.hora_fin).slice(0, 5) : null,
                      isCalculated: false,
                    };
                    const delta = stop?.delta;
                    const enTransito = stop?.en_transito;
                    const cap = stop?.capacidad;
                    const libres = stop?.libres;
                    const overbook = Boolean(stop?.overbook);
                    const rowClass =
                      ev.origen === "ofrn"
                        ? "fimba-row-ofrn"
                        : ev.origen === "ambos"
                          ? "fimba-row-ambos"
                          : "";
                    const canEditStops =
                      !readOnly &&
                      (giraTransporteIdsFromEvent(ev).length > 0 ||
                        vehiculos.length > 0);
                    const primaryVehicleId =
                      metrics.primary?.id_gira_transporte ??
                      metrics.perVehicle?.[0]?.id_gira_transporte ??
                      giraTransporteIdsFromEvent(ev)[0] ??
                      null;
                    const canAddIntermediate =
                      !readOnly &&
                      primaryVehicleId != null &&
                      primaryVehicleId !== "";
                    const nextEvForRow = metrics?.next_event || null;
                    const nextEvHasRealStop = Boolean(nextEvForRow);
                    const horaCom = sliceTime(ev.hora_inicio);
                    const libresTitle =
                      libres != null && cap != null
                        ? `Libres: ${libres} (cap ${cap})`
                        : cap != null
                          ? `Capacidad: ${cap}`
                          : undefined;
                    const evKey = String(ev.id);
                    const evDraft = eventDrafts[evKey] || draftFromEvent(ev);
                    const evStatus = eventRowStatus[evKey] || "idle";
                    const evSaving = evStatus === "saving";
                    const canAssignVeh = editMode && canInlineAssignVehicle(ev);
                    const evRowClass = [rowClass, editMode ? rowStatusClass(evStatus) : ""]
                      .filter(Boolean)
                      .join(" ");
                    return (
                      <tr key={ev.id} className={evRowClass}>
                        {editMode && (
                          <SyncDot
                            status={evStatus}
                            error={eventRowErrors[evKey]}
                            sticky
                          />
                        )}
                        <td className="fimba-sticky-origen">
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                            {ev.es_fimba && (
                              <span className="fimba-badge fimba-badge-fimba">
                                FIMBA
                              </span>
                            )}
                            {ev.es_ofrn && (
                              <span className="fimba-badge fimba-badge-ofrn">
                                OFRN
                              </span>
                            )}
                            {!ev.es_fimba && !ev.es_ofrn && (
                              <span
                                className="fimba-muted"
                                style={{ fontSize: "0.75rem" }}
                              >
                                —
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="fimba-sticky-fecha">
                          {editMode ? (
                            <input
                              className="fimba-cell-input"
                              type="date"
                              value={evDraft.fecha || ""}
                              disabled={evSaving}
                              onChange={(e) =>
                                changeAndCommitEvento(ev.id, "fecha", e.target.value)
                              }
                            />
                          ) : (
                            formatFecha(ev.fecha)
                          )}
                        </td>
                        <td className="fimba-sticky-hora">
                          {editMode ? (
                            <div className="fimba-hora-edit">
                              <input
                                className="fimba-cell-input"
                                type="time"
                                value={evDraft.hora_inicio || ""}
                                disabled={evSaving}
                                title="Hora de comienzo"
                                onChange={(e) =>
                                  setEventField(ev.id, "hora_inicio", e.target.value)
                                }
                                onBlur={() => commitEvento(ev.id)}
                              />
                              <input
                                className="fimba-cell-input"
                                type="time"
                                value={evDraft.hora_fin || ""}
                                disabled={evSaving}
                                title="Hora fin (vacío = calculada desde la siguiente parada)"
                                onChange={(e) =>
                                  setEventField(ev.id, "hora_fin", e.target.value)
                                }
                                onBlur={() => commitEvento(ev.id)}
                              />
                            </div>
                          ) : (
                            <>
                              <span title="Hora de comienzo">{horaCom}</span>
                              <span className="fimba-muted" style={{ margin: "0 0.2rem" }}>
                                ·
                              </span>
                              {horaFinDisp.value ? (
                                <span
                                  title={
                                    horaFinDisp.isCalculated
                                      ? "Calculada: hora com de la siguiente parada del mismo vehículo (sin hora fin guardada)"
                                      : "Hora fin guardada en el evento"
                                  }
                                  style={
                                    horaFinDisp.isCalculated
                                      ? {
                                          color: "#0e7490",
                                          fontStyle: "italic",
                                        }
                                      : undefined
                                  }
                                >
                                  {horaFinDisp.value}
                                </span>
                              ) : (
                                <span className="fimba-muted">—</span>
                              )}
                            </>
                          )}
                        </td>
                        <td className="fimba-planilla-wrap" style={{ fontWeight: 600 }}>
                          {editMode ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                              <input
                                className="fimba-cell-input"
                                value={evDraft.actividad}
                                disabled={evSaving}
                                placeholder="Actividad"
                                onChange={(e) =>
                                  setEventField(ev.id, "actividad", e.target.value)
                                }
                                onBlur={() => commitEvento(ev.id)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    commitEvento(ev.id);
                                  }
                                }}
                              />
                              <input
                                className="fimba-cell-input"
                                value={evDraft.observaciones}
                                disabled={evSaving}
                                placeholder="Obs."
                                title="Observaciones"
                                onChange={(e) =>
                                  setEventField(ev.id, "observaciones", e.target.value)
                                }
                                onBlur={() => commitEvento(ev.id)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    commitEvento(ev.id);
                                  }
                                }}
                              />
                            </div>
                          ) : (
                            <>
                              {ev.actividad || ev.tipo_nombre || "—"}
                              {ev.observaciones ? (
                                <span
                                  className="fimba-muted"
                                  style={{
                                    display: "block",
                                    fontSize: "0.75rem",
                                    fontWeight: 400,
                                  }}
                                >
                                  {ev.observaciones}
                                </span>
                              ) : null}
                              {!ev.actividad && ev.descripcion && !ev.tipo_nombre ? (
                                <span
                                  className="fimba-muted"
                                  style={{
                                    display: "block",
                                    fontSize: "0.75rem",
                                    fontWeight: 400,
                                  }}
                                >
                                  {String(ev.descripcion).slice(0, 80)}
                                </span>
                              ) : null}
                            </>
                          )}
                        </td>
                        <td
                          className="fimba-muted fimba-planilla-wrap"
                          style={{ fontSize: "0.85rem" }}
                          title={locacion}
                        >
                          {editMode ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                              {ev.locacion_nombre ? (
                                <span
                                  style={{ fontSize: "0.72rem", fontWeight: 600 }}
                                  title="Locación de catálogo (se edita en el modal)"
                                >
                                  {ev.locacion_nombre}
                                  {ev.locacion_ciudad ? ` (${ev.locacion_ciudad})` : ""}
                                </span>
                              ) : null}
                              <input
                                className="fimba-cell-input"
                                value={evDraft.destino}
                                disabled={evSaving}
                                placeholder={
                                  ev.locacion_nombre
                                    ? "Texto destino (opcional)"
                                    : "Locación / destino"
                                }
                                onChange={(e) =>
                                  setEventField(ev.id, "destino", e.target.value)
                                }
                                onBlur={() => commitEvento(ev.id)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    commitEvento(ev.id);
                                  }
                                }}
                              />
                              {ev.vuelo || evDraft.vuelo ? (
                                <input
                                  className="fimba-cell-input"
                                  value={evDraft.vuelo}
                                  disabled={evSaving}
                                  placeholder="Vuelo"
                                  title="Vuelo"
                                  onChange={(e) =>
                                    setEventField(ev.id, "vuelo", e.target.value)
                                  }
                                  onBlur={() => commitEvento(ev.id)}
                                />
                              ) : null}
                            </div>
                          ) : (
                            <>
                              {locacion}
                              {ev.vuelo ? (
                                <span
                                  style={{
                                    display: "block",
                                    fontSize: "0.72rem",
                                  }}
                                >
                                  Vuelo {ev.vuelo}
                                </span>
                              ) : null}
                            </>
                          )}
                        </td>
                        <td
                          style={{
                            textAlign: "center",
                            padding: "0.25rem 0.15rem",
                            width: 36,
                          }}
                        >
                          <button
                            type="button"
                            className="fimba-btn fimba-btn-ghost"
                            disabled={!canAddIntermediate}
                            title={
                              canAddIntermediate
                                ? "Agregar parada intermedia"
                                : "Asigná un vehículo a esta fila para agregar una parada intermedia"
                            }
                            aria-label="Agregar parada intermedia"
                            onClick={() => openIntermediateStop(ev, metrics)}
                            style={{
                              minWidth: 28,
                              padding: "0.2rem 0.3rem",
                              opacity: canAddIntermediate ? 1 : 0.35,
                              color: "var(--fimba-cyan, #0e7490)",
                            }}
                          >
                            <IconPlus size={14} />
                          </button>
                        </td>
                        <td
                          className="fimba-muted fimba-planilla-wrap"
                          style={{ fontSize: "0.85rem" }}
                          title={
                            destinoSiguiente !== "—"
                              ? `Siguiente parada del mismo vehículo: ${destinoSiguiente}`
                              : "Sin siguiente parada en este vehículo"
                          }
                        >
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.2rem",
                              maxWidth: "100%",
                            }}
                          >
                            <span
                              style={{
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {destinoSiguiente}
                            </span>
                            <button
                              type="button"
                              className="fimba-btn fimba-btn-ghost"
                              disabled={!canAddIntermediate}
                              title={
                                canAddIntermediate
                                  ? nextEvHasRealStop
                                    ? "Definir destino: crear parada intermedia (sin editar la siguiente existente)"
                                    : "Definir destino: crear siguiente parada en este vehículo"
                                  : "Asigná un vehículo a esta fila para definir el destino"
                              }
                              aria-label="Definir destino (crear parada)"
                              onClick={() => openDestinoStop(ev, metrics)}
                              style={{
                                minWidth: 24,
                                padding: "0.15rem 0.25rem",
                                flexShrink: 0,
                                opacity: canAddIntermediate ? 1 : 0.35,
                                color: "var(--fimba-deep, #94216d)",
                              }}
                            >
                              <IconEdit size={13} />
                            </button>
                          </span>
                        </td>
                        <td className="fimba-planilla-wrap" style={{ maxWidth: "10rem" }}>
                          {canAssignVeh ? (
                            <select
                              className="fimba-cell-input"
                              value={evDraft.id_gira_transporte}
                              disabled={evSaving}
                              title="Asignar un vehículo de la flota (FIMBA, una unidad)"
                              onChange={(e) =>
                                changeAndCommitEvento(
                                  ev.id,
                                  "id_gira_transporte",
                                  e.target.value,
                                )
                              }
                            >
                              <option value="">SIN SERVICIO</option>
                              {vehiculos.map((gtOpt) => (
                                <option key={gtOpt.id} value={String(gtOpt.id)}>
                                  {labelGiraTransporte(gtOpt)}
                                </option>
                              ))}
                            </select>
                          ) : vehLabel === "SIN SERVICIO" ? (
                            <span
                              className="fimba-badge"
                              style={{ background: "#fef3c7", color: "#92400e" }}
                            >
                              SIN SERVICIO
                            </span>
                          ) : (
                            vehLabel
                          )}
                        </td>
                        <td>
                          {stop ? (
                            <span
                              className="fimba-badge"
                              style={{
                                background:
                                  stop.movimiento === "subida"
                                    ? "#dcfce7"
                                    : stop.movimiento === "bajada"
                                      ? "#fee2e2"
                                      : stop.movimiento === "subida_bajada"
                                        ? "#e0e7ff"
                                        : "#f1f5f9",
                                color:
                                  stop.movimiento === "subida"
                                    ? "#166534"
                                    : stop.movimiento === "bajada"
                                      ? "#991b1b"
                                      : stop.movimiento === "subida_bajada"
                                        ? "#3730a3"
                                        : "#475569",
                              }}
                            >
                              {stop.movimiento_label}
                            </span>
                          ) : (
                            <span className="fimba-muted">—</span>
                          )}
                          {multiVeh ? (
                            <span
                              className="fimba-muted"
                              style={{
                                display: "block",
                                fontSize: "0.68rem",
                                marginTop: 2,
                              }}
                              title="Hay varios vehículos: se muestra el primero del filtro/fila"
                            >
                              multi-veh.
                            </span>
                          ) : null}
                        </td>
                        <td
                          style={{
                            fontWeight: 600,
                            color:
                              delta == null
                                ? undefined
                                : delta > 0
                                  ? "#166534"
                                  : delta < 0
                                    ? "#991b1b"
                                    : undefined,
                          }}
                        >
                          {delta == null
                            ? "—"
                            : delta > 0
                              ? `+${delta}`
                              : String(delta)}
                        </td>
                        <td
                          style={{
                            fontWeight: 700,
                            color: overbook
                              ? "#b91c1c"
                              : libres != null && libres === 0
                                ? "#b45309"
                                : undefined,
                          }}
                          title={libresTitle}
                        >
                          {enTransito == null ? "—" : enTransito}
                          {cap != null ? (
                            <span
                              className="fimba-muted"
                              style={{ fontWeight: 500, fontSize: "0.8rem" }}
                            >
                              {" "}
                              / {cap}
                            </span>
                          ) : null}
                          {overbook ? (
                            <span
                              style={{
                                display: "block",
                                fontSize: "0.68rem",
                                color: "#b91c1c",
                                fontWeight: 600,
                              }}
                            >
                              Sobre cupo
                            </span>
                          ) : null}
                        </td>
                        <td className="fimba-planilla-artistas">
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                            {labels.artista_labels.map((a) => (
                              <span
                                key={a.id}
                                className="fimba-badge"
                                style={{
                                  background: a.color
                                    ? `${a.color}22`
                                    : undefined,
                                  color: a.color || undefined,
                                }}
                                title={
                                  a.n > 0
                                    ? `${a.n} plazas presentes en esta parada / vehículo`
                                    : a.label
                                }
                              >
                                {a.label}
                              </span>
                            ))}
                            {labels.orquesta_label ? (
                              <span
                                className="fimba-muted"
                                style={{ fontSize: "0.8rem", fontWeight: 600 }}
                                title="Pasajeros OFRN presentes en el contexto de vehículo/parada (boarding)"
                              >
                                {labels.orquesta_label}
                              </span>
                            ) : null}
                            {labels.artista_labels.length === 0 &&
                            !labels.orquesta_label ? (
                              <span
                                className="fimba-muted"
                                style={{ fontSize: "0.8rem" }}
                              >
                                {ev.orquesta_label || "Edición"}
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td className="fimba-planilla-actions">
                          {canEditStops ? (
                            <>
                              <button
                                type="button"
                                className="fimba-btn fimba-btn-ghost"
                                onClick={() => openStopRules(ev, "up")}
                                title="Subidas (artistas + orquesta)"
                                style={{
                                  color: "#166534",
                                  fontWeight: 800,
                                  fontSize: "0.85rem",
                                  minWidth: 28,
                                }}
                              >
                                ↑
                              </button>
                              <button
                                type="button"
                                className="fimba-btn fimba-btn-ghost"
                                onClick={() => openStopRules(ev, "down")}
                                title="Bajadas (artistas + orquesta)"
                                style={{
                                  color: "#991b1b",
                                  fontWeight: 800,
                                  fontSize: "0.85rem",
                                  minWidth: 28,
                                }}
                              >
                                ↓
                              </button>
                            </>
                          ) : null}
                          {!readOnly && (
                            <>
                              <button
                                type="button"
                                className="fimba-btn fimba-btn-ghost"
                                onClick={() => setModal({ mode: "edit", evento: ev })}
                                title="Editar"
                              >
                                <IconEdit size={14} />
                              </button>
                              <button
                                type="button"
                                className="fimba-btn fimba-btn-danger"
                                style={{ marginLeft: 4 }}
                                onClick={() => handleDelete(ev)}
                                title="Eliminar"
                              >
                                <IconTrash size={14} />
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {!readOnly && modal &&
        createPortal(
          <FimbaEventoFormModal
            mode={modal.mode}
            evento={modal.evento}
            edicion={edicion}
            flota={vehiculos}
            propuestas={propuestas}
            preselectPropuesta={modal.preselectPropuesta}
            defaultTipoId={modal.defaultTipoId}
            forceTransporte
            onClose={() => setModal(null)}
            onSaved={() => {
              setModal(null);
              reload();
            }}
          />,
          document.body,
        )}

      {destinoModal &&
        edicion &&
        createPortal(
          <FimbaDestinoStopModal
            context={destinoModal}
            edicion={edicion}
            vehiculos={vehiculos}
            onClose={() => setDestinoModal(null)}
            onSaved={() => {
              setDestinoModal(null);
              reload();
            }}
          />,
          document.body,
        )}

      {stopRulesModal && edicion && (
        <FimbaStopRulesManager
          isOpen
          onClose={() => setStopRulesModal(null)}
          event={stopRulesModal.event}
          type={stopRulesModal.type}
          transportId={stopRulesModal.transportId}
          edicionId={edicion.id}
          giraId={edicion.id_gira}
          vehiculos={vehiculos}
          propuestas={propuestas}
          passengers={ofrnPassengers}
          admissionRules={ofrnAdmissionRules}
          regions={ofrnRegions}
          localities={ofrnLocalities}
          sequencesByVehicle={sequencesByVehicle}
          onRefresh={reload}
        />
      )}
    </div>
  );
}

/** Página de transportes anclada a un artista (misma UI con filtro inicial). */
export function FimbaArtistaTransportPage() {
  return <FimbaTransportPage />;
}
