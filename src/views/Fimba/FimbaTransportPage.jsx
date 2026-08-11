import React, { useEffect, useMemo, useState } from "react";
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
} from "../../components/ui/Icons";
import {
  addFimbaVehiculo,
  capacidadGiraTransporte,
  computeFimbaCapacity,
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
  updateFimbaVehiculo,
} from "../../services/fimbaService";
import {
  boardingMetricsForEventRow,
  buildAllVehicleBoardingSequences,
  defaultIntermediateStopSchedule,
  formatEventLocation,
  resolveStopArtistasLabels,
} from "../../utils/fimbaTransportBoarding";
import { eventTypeIdForCategoria } from "../../utils/giraTransportUtils";
import FimbaDestinoStopModal from "./FimbaDestinoStopModal";
import FimbaEventoFormModal from "./FimbaEventoFormModal";
import FimbaStopRulesManager from "./FimbaStopRulesManager";

function sliceTime(t) {
  if (!t) return "—";
  return String(t).slice(0, 5);
}

function formatFecha(f) {
  if (!f) return "—";
  const [y, m, d] = String(f).split("-");
  if (!d) return f;
  return `${d}/${m}/${y}`;
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
  const showVehForm = showAddVeh || editingVehiculoId != null;
  const isEditingVeh = editingVehiculoId != null;

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
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className="fimba-badge">
              {vehiculos.length} unidad{vehiculos.length === 1 ? "" : "es"}
            </span>
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

        {showVehForm && (
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
            <table className="fimba-table">
              <thead>
                <tr>
                  <th style={{ paddingLeft: 0 }}>Vehículo</th>
                  <th>Nota / detalle OFRN</th>
                  <th>Categoría</th>
                  <th>Capacidad</th>
                  <th>Pico en tránsito</th>
                  <th>Libres (pico)</th>
                  <th style={{ width: 72 }}></th>
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
                  return (
                    <tr
                      key={gt.id}
                      style={
                        rowEditing
                          ? { background: "rgba(148,33,109,0.06)" }
                          : undefined
                      }
                    >
                      <td style={{ paddingLeft: 0, fontWeight: 600 }}>
                        {labelGiraTransporte(gt)}
                      </td>
                      <td
                        className="fimba-muted"
                        style={{ maxWidth: 280, fontSize: "0.85rem" }}
                        title={nota || undefined}
                      >
                        {nota || "—"}
                      </td>
                      <td>
                        <span className="fimba-badge">
                          {gt.categoria_logistica || "PASAJEROS"}
                        </span>
                      </td>
                      <td>{cap != null ? `${cap}` : "—"}</td>
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
              <table className="fimba-table fimba-planilla-table">
                <thead>
                  <tr>
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
                      giraTransporteIdsFromEvent(ev).length > 0 ||
                      vehiculos.length > 0;
                    const primaryVehicleId =
                      metrics.primary?.id_gira_transporte ??
                      metrics.perVehicle?.[0]?.id_gira_transporte ??
                      giraTransporteIdsFromEvent(ev)[0] ??
                      null;
                    const canAddIntermediate =
                      primaryVehicleId != null && primaryVehicleId !== "";
                    const nextEvForRow = metrics?.next_event || null;
                    const nextEvHasRealStop = Boolean(nextEvForRow);
                    const horaCom = sliceTime(ev.hora_inicio);
                    const libresTitle =
                      libres != null && cap != null
                        ? `Libres: ${libres} (cap ${cap})`
                        : cap != null
                          ? `Capacidad: ${cap}`
                          : undefined;
                    return (
                      <tr key={ev.id} className={rowClass}>
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
                          {formatFecha(ev.fecha)}
                        </td>
                        <td className="fimba-sticky-hora">
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
                        </td>
                        <td className="fimba-planilla-wrap" style={{ fontWeight: 600 }}>
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
                        </td>
                        <td
                          className="fimba-muted fimba-planilla-wrap"
                          style={{ fontSize: "0.85rem" }}
                          title={locacion}
                        >
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
                          {vehLabel === "SIN SERVICIO" ? (
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

      {modal &&
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
