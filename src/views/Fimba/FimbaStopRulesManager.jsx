/**
 * FIMBA — Gestionar subidas / bajadas por parada.
 * - Artistas/grupos: reglas persistidas en `fimba_propuesta_rutas` (cantidad editable)
 * - Reserva técnica: `fimba_evento_transportes.plazas` (visible + editable en subida)
 * - Orquesta OFRN: embebe StopRulesManager (`giras_logistica_rutas`)
 */
import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  IconX,
  IconPlus,
  IconTrash,
  IconMapPin,
  IconClock,
  IconUsers,
  IconLoader,
  IconCheck,
  IconArrowDown,
} from "../../components/ui/Icons";
import {
  alightAllFimbaAboardAtStop,
  capacidadGiraTransporte,
  clearFimbaPropuestaRutaStop,
  computeArtistaTransporteUsage,
  defaultArtistaAssignPlazas,
  labelGiraTransporte,
  listFimbaEventoTransportes,
  listFimbaPropuestaRutas,
  upsertFimbaEventoTransportePlazas,
  upsertFimbaPropuestaRutaStop,
  validateArtistaTransporteAssign,
} from "../../services/fimbaService";
import {
  buildFimbaBajadaArtistOptions,
  FIMBA_RESERVA_EVENTO_LABEL,
  formatEventLocation,
  isOffTrayectoRideEndpoint,
  isTransportTipoEvent,
  listFimbaAboardAtStop,
} from "../../utils/fimbaTransportBoarding";
import StopRulesManager from "../Giras/StopRulesManager";
import { supabase } from "../../services/supabase";

export default function FimbaStopRulesManager({
  isOpen,
  onClose,
  event,
  type, // "up" | "down"
  transportId,
  edicionId,
  giraId,
  vehiculos = [],
  propuestas = [],
  passengers = [],
  admissionRules = [],
  regions = [],
  localities = [],
  sequencesByVehicle = null,
  /** Tab inicial al abrir: `artistas` | `orquesta`. */
  initialTab = "artistas",
  /**
   * Tras mutación: `scope` = `rutas` (default) | `reserva` | `ofrn`.
   * La planilla hace refresh quirúrgico (sin spinner full-page).
   */
  onRefresh,
  /** Sin portal/backdrop: embeber en el editor de evento. */
  embedded = false,
}) {
  const [tab, setTab] = useState(
    initialTab === "orquesta" ? "orquesta" : "artistas",
  ); // artistas | orquesta
  const [rutas, setRutas] = useState([]);
  /** Todas las rutas de la edición (para tope transporte por artista). */
  const [allRutas, setAllRutas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [propuestaId, setPropuestaId] = useState("");
  const [plazas, setPlazas] = useState("");
  const [asientosEquipaje, setAsientosEquipaje] = useState("");
  const [obsEquipaje, setObsEquipaje] = useState("");
  const [esChofer, setEsChofer] = useState(false);
  const [vehicleId, setVehicleId] = useState(
    transportId != null ? String(transportId) : "",
  );
  const [saving, setSaving] = useState(false);
  /** id → 'saving'|'saved'|'error' para semáforo de cantidad en regla. */
  const [ruleSync, setRuleSync] = useState({});
  /** id de regla en borrado (gray/pulse hasta finish). */
  const [deletingRutaId, setDeletingRutaId] = useState(null);
  /** id_propuesta en quick-bajada desde lista A bordo. */
  const [quickAlightBusyId, setQuickAlightBusyId] = useState(null);
  /** Plazas técnicas del evento×vehículo (`fimba_evento_transportes`). */
  const [reservaPlazas, setReservaPlazas] = useState("");
  const [reservaSync, setReservaSync] = useState("idle");
  const [residualAlight, setResidualAlight] = useState(0);
  const [bajarTodoBusy, setBajarTodoBusy] = useState(false);

  const title = type === "up" ? "Gestionar Subidas" : "Gestionar Bajadas";
  const colorClass = type === "up" ? "text-emerald-700" : "text-rose-700";
  const bgClass = type === "up" ? "bg-emerald-50" : "bg-rose-50";
  const isBajada = type === "down";

  useEffect(() => {
    if (!isOpen) return;
    setTab(initialTab === "orquesta" ? "orquesta" : "artistas");
  }, [isOpen, initialTab, event?.id, type]);

  useEffect(() => {
    if (isOpen && transportId != null) {
      setVehicleId(String(transportId));
    } else if (isOpen && (vehiculos || []).length === 1 && !vehicleId) {
      setVehicleId(String(vehiculos[0].id));
    }
  }, [isOpen, transportId, vehiculos, vehicleId]);

  const reloadRutas = async () => {
    const [stopRes, allRes] = await Promise.all([
      listFimbaPropuestaRutas(edicionId, {
        id_gira_transporte: vehicleId || null,
        id_evento: event?.id,
        type,
        propuestas,
      }),
      listFimbaPropuestaRutas(edicionId, { propuestas }),
    ]);
    if (stopRes.error) setError(stopRes.error.message);
    setRutas(stopRes.rutas || []);
    setAllRutas(allRes.rutas || []);
    return { stopRutas: stopRes.rutas || [], all: allRes.rutas || [] };
  };

  const reloadReserva = async () => {
    if (!event?.id || !vehicleId) {
      setReservaPlazas("");
      setResidualAlight(0);
      return;
    }
    const { rows, error: eRows } = await listFimbaEventoTransportes(event.id);
    if (eRows) {
      setError(eRows.message || "No se pudo cargar la reserva del evento");
      return;
    }
    const row =
      (rows || []).find(
        (r) => String(r.id_gira_transporte) === String(vehicleId),
      ) || null;
    const assigned = Math.max(0, Number(row?.plazas) || 0);
    setReservaPlazas(assigned > 0 ? String(assigned) : "");

    // Residual que baja aquí (trayecto anterior → esta parada)
    if (isBajada && sequencesByVehicle) {
      const seq =
        sequencesByVehicle.get?.(Number(vehicleId)) ||
        sequencesByVehicle.get?.(String(vehicleId)) ||
        null;
      const stop = seq?.byEventId?.[String(event.id)] || null;
      const alightFimba = Math.max(0, Number(stop?.alight_fimba) || 0);
      const explicitDown = (await listFimbaPropuestaRutas(edicionId, {
        id_gira_transporte: vehicleId,
        id_evento: event.id,
        type: "down",
      })).rutas || [];
      const explicitSum = explicitDown.reduce(
        (s, r) => s + Math.max(0, Number(r.plazas) || 0),
        0,
      );
      setResidualAlight(Math.max(0, alightFimba - explicitSum));
    } else {
      setResidualAlight(0);
    }
  };

  useEffect(() => {
    if (!isOpen || !edicionId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      await reloadRutas();
      if (!cancelled) await reloadReserva();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, edicionId, vehicleId, event?.id, type]);

  const activeVehicle = useMemo(
    () =>
      (vehiculos || []).find((v) => String(v.id) === String(vehicleId)) || null,
    [vehiculos, vehicleId],
  );

  const vehicleLibres = useMemo(() => {
    return capacidadGiraTransporte(activeVehicle);
  }, [activeVehicle]);

  const sortedEvents = useMemo(() => {
    if (!vehicleId || !sequencesByVehicle) return [];
    const seq =
      sequencesByVehicle.get?.(Number(vehicleId)) ||
      sequencesByVehicle.get?.(String(vehicleId)) ||
      null;
    return seq?.sortedEvents || [];
  }, [sequencesByVehicle, vehicleId]);

  const bajadaOptions = useMemo(
    () =>
      buildFimbaBajadaArtistOptions({
        propuestas,
        rutas: allRutas,
        idGiraTransporte: vehicleId || null,
        eventId: event?.id,
        sortedEvents,
        currentEvent: event ?? null,
      }),
    [propuestas, allRutas, vehicleId, event?.id, sortedEvents, event],
  );

  const bajadaByPropuesta = useMemo(() => {
    const map = new Map();
    for (const opt of bajadaOptions) {
      map.set(String(opt.id_propuesta), opt);
    }
    return map;
  }, [bajadaOptions]);

  const aboardFimba = useMemo(() => {
    if (!isBajada || !event?.id || !vehicleId) return [];
    return listFimbaAboardAtStop({
      propuestas,
      rutas: allRutas,
      idGiraTransporte: vehicleId,
      eventId: event.id,
      sortedEvents,
      currentEvent: event ?? null,
    });
  }, [
    isBajada,
    event,
    vehicleId,
    propuestas,
    allRutas,
    sortedEvents,
  ]);

  const aboardFimbaOpen = useMemo(
    () => aboardFimba.filter((r) => r.canAlightHere),
    [aboardFimba],
  );

  const aboardFimbaCapacitySeats = useMemo(
    () =>
      aboardFimba.reduce((s, r) => s + (Number(r.capacityPlazas) || 0), 0),
    [aboardFimba],
  );

  /** Si ya hay definición en esta parada+vehículo del artista, se edita esa fila. */
  const existingRutaForSelection = useMemo(() => {
    if (!propuestaId || !vehicleId) return null;
    return (
      (rutas || []).find(
        (r) =>
          String(r.id_propuesta) === String(propuestaId) &&
          String(r.id_gira_transporte) === String(vehicleId),
      ) || null
    );
  }, [rutas, propuestaId, vehicleId]);

  const usageForSelection = useMemo(() => {
    if (!propuestaId) return null;
    const p = (propuestas || []).find((x) => String(x.id) === String(propuestaId));
    if (!p) return null;
    const excludeRutaIds = existingRutaForSelection?.id
      ? [existingRutaForSelection.id]
      : [];
    return computeArtistaTransporteUsage(p, allRutas, {
      excludeRutaIds,
      eventId: event?.id,
      sortedEvents,
    });
  }, [propuestaId, propuestas, allRutas, existingRutaForSelection, event?.id, sortedEvents]);

  const explicitPlazasAtStop = useMemo(
    () =>
      (rutas || []).reduce((s, r) => s + Math.max(0, Number(r.plazas) || 0), 0),
    [rutas],
  );

  const reservaNum = Math.max(0, Number(reservaPlazas) || 0);
  const residualUp = !isBajada
    ? Math.max(0, reservaNum - explicitPlazasAtStop)
    : 0;

  const canEditReserva =
    !isBajada && Boolean(event?.id) && Boolean(vehicleId) && isTransportTipoEvent(event);

  const defaultPlazasForPropuesta = (pid) => {
    if (isBajada) {
      const opt = bajadaByPropuesta.get(String(pid));
      const aboard = Math.max(0, Number(opt?.plazasAboard) || 0);
      if (aboard > 0) return aboard;
      const existing =
        (rutas || []).find(
          (r) =>
            String(r.id_propuesta) === String(pid) &&
            String(r.id_gira_transporte) === String(vehicleId),
        ) || null;
      return Math.max(1, Number(existing?.plazas) || 1);
    }
    const p = (propuestas || []).find((x) => String(x.id) === String(pid));
    if (!p) return 1;
    const existing =
      (rutas || []).find(
        (r) =>
          String(r.id_propuesta) === String(pid) &&
          String(r.id_gira_transporte) === String(vehicleId),
      ) || null;
    const usage = computeArtistaTransporteUsage(p, allRutas, {
      excludeRutaIds: existing?.id ? [existing.id] : [],
      eventId: event?.id,
      sortedEvents,
    });
    const n = defaultArtistaAssignPlazas({
      remaining: usage.remaining,
      vehicleLibres,
    });
    if (n <= 0 && existing && Number(existing.plazas) > 0) {
      return Math.max(0, Number(existing.plazas) || 0);
    }
    return n;
  };

  const handlePropuestaChange = (id) => {
    setPropuestaId(id);
    if (id) {
      setPlazas(String(defaultPlazasForPropuesta(id)));
      const existing =
        (rutas || []).find(
          (r) =>
            String(r.id_propuesta) === String(id) &&
            String(r.id_gira_transporte) === String(vehicleId),
        ) || null;
      setAsientosEquipaje(
        existing?.asientos_equipaje != null
          ? String(existing.asientos_equipaje)
          : "",
      );
      setObsEquipaje(existing?.observaciones_equipaje || "");
      setEsChofer(Boolean(existing?.es_chofer));
    } else {
      setPlazas("");
      setAsientosEquipaje("");
      setObsEquipaje("");
      setEsChofer(false);
    }
  };

  useEffect(() => {
    if (!propuestaId || !isOpen) return;
    setPlazas(String(defaultPlazasForPropuesta(propuestaId)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicleId, allRutas, vehicleLibres, sortedEvents, event?.id]);

  const luggagePayloadFromForm = () => ({
    asientos_equipaje: Math.max(0, Number(asientosEquipaje) || 0),
    observaciones_equipaje: String(obsEquipaje || "").trim() || null,
  });

  const persistRutaPlazas = async (ruta, nextPlazas) => {
    const n = Math.max(0, Number(nextPlazas) || 0);
    if (n <= 0) {
      setError("Cantidad de plazas > 0");
      return;
    }
    if (!isBajada) {
      const full =
        (propuestas || []).find(
          (x) => String(x.id) === String(ruta.id_propuesta),
        ) || ruta.propuesta;
      if (full) {
        const usage = computeArtistaTransporteUsage(full, allRutas, {
          excludeRutaIds: [ruta.id],
          eventId: event?.id,
          sortedEvents,
        });
        const check = validateArtistaTransporteAssign(full, usage.used, n);
        if (!check.ok) {
          setError(check.error.message);
          setRuleSync((s) => ({ ...s, [ruta.id]: "error" }));
          return;
        }
      }
    }
    setRuleSync((s) => ({ ...s, [ruta.id]: "saving" }));
    setError(null);
    const res = await upsertFimbaPropuestaRutaStop({
      id_propuesta: ruta.id_propuesta,
      id_gira_transporte: ruta.id_gira_transporte || vehicleId,
      plazas: n,
      type,
      id_evento: event.id,
      replaceConflict: true,
      asientos_equipaje: Math.max(0, Number(ruta.asientos_equipaje) || 0),
      observaciones_equipaje: ruta.observaciones_equipaje ?? null,
      es_chofer: Boolean(ruta.es_chofer),
      sortedEvents,
    });
    if (res.error) {
      setError(res.error.message || "No se pudo actualizar la regla");
      setRuleSync((s) => ({ ...s, [ruta.id]: "error" }));
      return;
    }
    setRuleSync((s) => ({ ...s, [ruta.id]: "saved" }));
    await reloadRutas();
    onRefresh?.("rutas");
  };

  const persistRutaLuggage = async (ruta, patch) => {
    setRuleSync((s) => ({ ...s, [ruta.id]: "saving" }));
    setError(null);
    const res = await upsertFimbaPropuestaRutaStop({
      id_propuesta: ruta.id_propuesta,
      id_gira_transporte: ruta.id_gira_transporte || vehicleId,
      plazas: Math.max(0, Number(ruta.plazas) || 0),
      type,
      id_evento: event.id,
      replaceConflict: true,
      asientos_equipaje:
        patch.asientos_equipaje != null
          ? Math.max(0, Number(patch.asientos_equipaje) || 0)
          : Math.max(0, Number(ruta.asientos_equipaje) || 0),
      observaciones_equipaje:
        patch.observaciones_equipaje !== undefined
          ? patch.observaciones_equipaje
          : ruta.observaciones_equipaje ?? null,
      es_chofer: Boolean(ruta.es_chofer),
      sortedEvents,
    });
    if (res.error) {
      setError(res.error.message || "No se pudo actualizar equipaje");
      setRuleSync((s) => ({ ...s, [ruta.id]: "error" }));
      return;
    }
    setRuleSync((s) => ({ ...s, [ruta.id]: "saved" }));
    await reloadRutas();
    onRefresh?.("rutas");
  };

  const persistRutaChofer = async (ruta, nextChofer) => {
    if (isBajada) return;
    const next = Boolean(nextChofer);
    if (Boolean(ruta.es_chofer) === next) return;
    setRuleSync((s) => ({ ...s, [ruta.id]: "saving" }));
    setError(null);
    const res = await upsertFimbaPropuestaRutaStop({
      id_propuesta: ruta.id_propuesta,
      id_gira_transporte: ruta.id_gira_transporte || vehicleId,
      plazas: Math.max(0, Number(ruta.plazas) || 0),
      type: "up",
      id_evento: event.id,
      replaceConflict: true,
      asientos_equipaje: Math.max(0, Number(ruta.asientos_equipaje) || 0),
      observaciones_equipaje: ruta.observaciones_equipaje ?? null,
      es_chofer: next,
      sortedEvents,
    });
    if (res.error) {
      setError(res.error.message || "No se pudo actualizar chofer");
      setRuleSync((s) => ({ ...s, [ruta.id]: "error" }));
      return;
    }
    setRuleSync((s) => ({ ...s, [ruta.id]: "saved" }));
    await reloadRutas();
    onRefresh?.("rutas");
  };

  const handleAdd = async () => {
    if (!propuestaId) {
      setError("Elegí un grupo / artista");
      return;
    }
    if (!vehicleId) {
      setError("Elegí un vehículo");
      return;
    }
    const n = Math.max(0, Number(plazas) || 0);
    if (n <= 0) {
      setError("Cantidad de plazas > 0");
      return;
    }
    if (isBajada) {
      const opt = bajadaByPropuesta.get(String(propuestaId));
      if (!opt?.aboard && !existingRutaForSelection) {
        setError(
          opt?.reason
            ? `No se puede bajar: ${opt.reason}.`
            : "Este artista no está a bordo de este vehículo.",
        );
        return;
      }
    } else {
      const p = (propuestas || []).find((x) => String(x.id) === String(propuestaId));
      if (p && usageForSelection) {
        const check = validateArtistaTransporteAssign(
          p,
          usageForSelection.used,
          n,
        );
        if (!check.ok) {
          setError(check.error.message);
          return;
        }
      }
    }
    setSaving(true);
    setError(null);
    const luggage = luggagePayloadFromForm();
    let res = await upsertFimbaPropuestaRutaStop({
      id_propuesta: propuestaId,
      id_gira_transporte: vehicleId,
      plazas: n,
      type,
      id_evento: event.id,
      replaceConflict: false,
      sortedEvents,
      es_chofer: !isBajada ? Boolean(esChofer) : undefined,
      ...luggage,
    });
    if (res.conflict) {
      const ok = window.confirm(
        `${res.error?.message || "Conflicto"}.\n\n¿Reemplazar la parada anterior?`,
      );
      if (ok) {
        res = await upsertFimbaPropuestaRutaStop({
          id_propuesta: propuestaId,
          id_gira_transporte: vehicleId,
          plazas: n,
          type,
          id_evento: event.id,
          replaceConflict: true,
          sortedEvents,
          es_chofer: !isBajada ? Boolean(esChofer) : undefined,
          ...luggage,
        });
      } else {
        setSaving(false);
        return;
      }
    }
    setSaving(false);
    if (res.error) {
      setError(res.error.message || "No se pudo guardar");
      return;
    }
    setPropuestaId("");
    setPlazas("");
    setAsientosEquipaje("");
    setObsEquipaje("");
    setEsChofer(false);
    await reloadRutas();
    await reloadReserva();
    onRefresh?.("rutas");
  };

  const handleDelete = async (ruta) => {
    if (!window.confirm("¿Quitar esta regla de parada?")) return;
    setDeletingRutaId(ruta.id);
    setError(null);
    try {
      const { error: err } = await clearFimbaPropuestaRutaStop(ruta.id, type);
      if (err) {
        setError(err.message || "No se pudo eliminar");
        return;
      }
      await reloadRutas();
      await reloadReserva();
      onRefresh?.("rutas");
    } finally {
      setDeletingRutaId(null);
    }
  };

  const handleQuickAlight = async (row) => {
    if (!vehicleId || !event?.id || !row?.id_propuesta) return;
    if (!row.canAlightHere) return;
    setQuickAlightBusyId(String(row.id_propuesta));
    setError(null);
    try {
      const n = Math.max(1, Number(row.plazasAboard) || 1);
      const res = await upsertFimbaPropuestaRutaStop({
        id_propuesta: row.id_propuesta,
        id_gira_transporte: vehicleId,
        plazas: n,
        type: "down",
        id_evento: event.id,
        replaceConflict: true,
        sortedEvents,
        es_chofer: Boolean(row.es_chofer || row.ruta?.es_chofer),
        asientos_equipaje: Math.max(
          0,
          Number(row.ruta?.asientos_equipaje) || 0,
        ),
        observaciones_equipaje: row.ruta?.observaciones_equipaje ?? null,
      });
      if (res.error) {
        setError(res.error.message || "No se pudo bajar");
        return;
      }
      await reloadRutas();
      await reloadReserva();
      onRefresh?.("rutas");
    } finally {
      setQuickAlightBusyId(null);
    }
  };

  const handleBajarTodo = async () => {
    if (!vehicleId || !event?.id) return;
    const aboardCount = bajadaOptions.filter((o) => o.aboard).length;
    if (aboardCount <= 0 && residualAlight <= 0) {
      setError("No hay artistas a bordo ni residual técnico bajando aquí.");
      return;
    }
    const ok = window.confirm(
      `¿Bajar todo lo que está a bordo de este vehículo en esta parada?\n\n` +
        `Se cerrarán ${aboardCount} ride(s) FIMBA abiertos` +
        (residualAlight > 0
          ? ` (la reserva residual ${residualAlight} ya figura bajando aquí).`
          : ".") +
        `\nOrquesta OFRN: usá la pestaña Orquesta → Bajar todo.`,
    );
    if (!ok) return;
    setBajarTodoBusy(true);
    setError(null);
    const res = await alightAllFimbaAboardAtStop({
      edicionId,
      id_gira_transporte: vehicleId,
      id_evento: event.id,
      propuestas,
      sortedEvents,
    });
    setBajarTodoBusy(false);
    if (res.error) {
      setError(res.error.message || "No se pudo bajar todo");
      return;
    }
    await reloadRutas();
    await reloadReserva();
    onRefresh?.("rutas");
  };

  const handleSaveReserva = async () => {
    if (!canEditReserva) return;
    const n = Math.max(0, Number(reservaPlazas) || 0);
    if (n > 0 && n < explicitPlazasAtStop) {
      setError(
        `La reserva (${n}) no puede ser menor que las plazas de artistas ya asignadas (${explicitPlazasAtStop}).`,
      );
      setReservaSync("error");
      return;
    }
    setReservaSync("saving");
    setError(null);
    const { error: err } = await upsertFimbaEventoTransportePlazas(
      event.id,
      vehicleId,
      n,
    );
    if (err) {
      setError(err.message || "No se pudo guardar la reserva");
      setReservaSync("error");
      return;
    }
    setReservaSync("saved");
    await reloadReserva();
    onRefresh?.("reserva");
  };

  if (!isOpen || !event) return null;

  const location = formatEventLocation(event);
  const hora = event.hora_inicio ? String(event.hora_inicio).slice(0, 5) : "—";
  const offTrayectoEndpoint = isOffTrayectoRideEndpoint(event);

  const syncDot = (status) => {
    if (status === "saving") {
      return <IconLoader size={12} className="animate-spin text-slate-400" />;
    }
    if (status === "saved") {
      return <IconCheck size={12} className="text-emerald-600" />;
    }
    if (status === "error") {
      return <span className="text-[10px] font-bold text-rose-600">!</span>;
    }
    return null;
  };

  const panelInner = (
          <div className={embedded ? "space-y-4" : "flex-1 overflow-y-auto p-4 space-y-4"}>
            {error && (
              <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded px-2 py-1.5">
                {error}
              </div>
            )}

            {offTrayectoEndpoint ? (
              <div
                className="text-xs rounded px-2.5 py-2 border"
                style={{
                  borderColor: "#f59e0b",
                  background: "rgba(245, 158, 11, 0.1)",
                  color: "#92400e",
                }}
              >
                <strong>Parada fuera de planilla de trayectos.</strong> Este
                evento ({event.tipo_nombre || "Concierto/Ensayo/…"}) no es una
                fila de Transportes, pero la {isBajada ? "bajada" : "subida"}{" "}
                cuenta en la secuencia. Para corregir: usá el ícono basura de la
                regla abajo (quita este extremo) o reasigná la{" "}
                {isBajada ? "bajada" : "subida"} a una parada Traslado.
              </div>
            ) : null}

            {tab === "artistas" && (
              <>
                {isBajada && (
                  <div className="rounded-lg border border-rose-200 bg-rose-50/60 p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div>
                        <h4 className="text-xs font-bold text-rose-800 uppercase tracking-wider m-0 flex items-center gap-1.5">
                          <IconUsers size={14} /> A bordo
                        </h4>
                        <p className="text-[11px] text-rose-700/80 m-0 mt-0.5">
                          {aboardFimba.length === 0
                            ? "Nadie a bordo de este vehículo en esta parada."
                            : `${aboardFimba.length} grupo${aboardFimba.length === 1 ? "" : "s"} · ${aboardFimbaCapacitySeats} plaza${aboardFimbaCapacitySeats === 1 ? "" : "s"} a cupo` +
                              (aboardFimba.some((r) => r.es_chofer)
                                ? " (choferes no suman cupo)"
                                : "")}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleBajarTodo}
                        disabled={
                          bajarTodoBusy ||
                          saving ||
                          loading ||
                          deletingRutaId != null ||
                          !vehicleId ||
                          (aboardFimbaOpen.length === 0 &&
                            residualAlight <= 0)
                        }
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold text-white bg-rose-700 hover:bg-rose-800 disabled:opacity-50 shadow-sm"
                        title="Cierra todos los rides FIMBA abiertos a bordo en esta parada"
                      >
                        {bajarTodoBusy ? (
                          <IconLoader size={14} className="animate-spin" />
                        ) : (
                          <IconArrowDown size={14} />
                        )}
                        Bajar todo
                      </button>
                    </div>
                    {aboardFimba.length > 0 && (
                      <ul className="max-h-44 overflow-y-auto divide-y divide-rose-100 bg-white/80 rounded border border-rose-100 m-0 p-0 list-none">
                        {aboardFimba.map((row) => (
                          <li
                            key={String(row.id_propuesta)}
                            className="flex items-center justify-between gap-2 px-2 py-1.5 text-xs"
                          >
                            <span className="text-slate-700 truncate min-w-0">
                              {row.label}
                              <span className="text-slate-400 ml-1">
                                · {row.plazasAboard} plaza
                                {row.plazasAboard === 1 ? "" : "s"}
                              </span>
                              {row.es_chofer ? (
                                <span className="ml-1 inline-flex items-center px-1 py-0 rounded text-[9px] font-bold uppercase tracking-wide text-slate-600 bg-slate-200">
                                  Chofer
                                </span>
                              ) : null}
                              {row.alreadyAlightingHere ? (
                                <span className="ml-1 text-[10px] font-semibold text-rose-600">
                                  (ya baja aquí)
                                </span>
                              ) : !row.openRide ? (
                                <span className="ml-1 text-[10px] font-semibold text-amber-700">
                                  (baja más adelante)
                                </span>
                              ) : null}
                            </span>
                            {row.canAlightHere ? (
                              <button
                                type="button"
                                disabled={
                                  quickAlightBusyId ===
                                    String(row.id_propuesta) ||
                                  loading ||
                                  bajarTodoBusy
                                }
                                onClick={() => handleQuickAlight(row)}
                                className="shrink-0 px-2 py-0.5 rounded text-[10px] font-bold text-rose-700 bg-rose-100 hover:bg-rose-200 disabled:opacity-50"
                              >
                                {quickAlightBusyId ===
                                String(row.id_propuesta)
                                  ? "…"
                                  : "Bajar"}
                              </button>
                            ) : (
                              <span className="text-[10px] text-slate-400 shrink-0">
                                OK
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                {(vehiculos || []).length > 1 && (
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-1">
                      VEHÍCULO
                    </label>
                    <select
                      className="w-full text-xs border rounded p-2 outline-none focus:border-pink-500"
                      value={vehicleId}
                      onChange={(e) => setVehicleId(e.target.value)}
                    >
                      <option value="">— Elegir —</option>
                      {(vehiculos || []).map((v) => (
                        <option key={v.id} value={v.id}>
                          {labelGiraTransporte(v)}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Reglas activas
                  </h4>
                  {loading ? (
                    <div className="flex items-center gap-2 text-sm text-slate-500 py-4 justify-center">
                      <IconLoader size={16} className="animate-spin" /> Cargando…
                    </div>
                  ) : rutas.length === 0 &&
                    residualUp <= 0 &&
                    residualAlight <= 0 &&
                    reservaNum <= 0 ? (
                    <div className="text-center p-6 border-2 border-dashed border-slate-200 rounded-lg">
                      <span className="text-sm text-slate-400">
                        {isBajada
                          ? "Nadie baja en esta parada aún."
                          : "Ninguna regla de grupo/artista en esta parada aún."}
                      </span>
                    </div>
                  ) : (
                    <ul className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
                      {rutas.map((r) => {
                        const p = r.propuesta || {};
                        const name = p.nombre || `Artista #${r.id_propuesta}`;
                        const full =
                          (propuestas || []).find(
                            (x) => String(x.id) === String(r.id_propuesta),
                          ) || p;
                        const usage = computeArtistaTransporteUsage(
                          full,
                          allRutas,
                          {
                            excludeRutaIds: [r.id],
                            eventId: event?.id,
                            sortedEvents,
                          },
                        );
                        const sync = ruleSync[r.id];
                        const isDeleting = deletingRutaId === r.id;
                        const rowBusy =
                          saving ||
                          isDeleting ||
                          deletingRutaId != null;
                        return (
                          <li
                            key={r.id}
                            className={`px-3 py-2 flex flex-col gap-1.5 bg-white hover:bg-slate-50${
                              isDeleting ? " fimba-row-deleting" : ""
                            }`}
                            aria-busy={isDeleting}
                          >
                            <div className="flex justify-between items-center gap-2">
                              <div className="min-w-0 flex-1">
                                <div className="text-xs font-semibold text-slate-700 truncate flex items-center gap-1.5">
                                  <span className="truncate">{name}</span>
                                  {r.es_chofer ? (
                                    <span
                                      className="shrink-0 inline-flex items-center px-1 py-0 rounded text-[9px] font-bold uppercase tracking-wide text-slate-600 bg-slate-200"
                                      title="No consume cupo del vehículo"
                                    >
                                      Chofer
                                    </span>
                                  ) : null}
                                  {isDeleting ? (
                                    <IconLoader
                                      size={12}
                                      className="animate-spin text-slate-400 shrink-0"
                                    />
                                  ) : null}
                                </div>
                                <div className="text-[10px] text-slate-400">
                                  {type === "up" ? "Sube" : "Baja"}
                                  {r.id_evento_subida && r.id_evento_bajada
                                    ? " · trayecto completo"
                                    : " · extremo pendiente"}
                                  {r.es_chofer ? (
                                    <span className="ml-1">
                                      · sin cupo
                                    </span>
                                  ) : null}
                                  {isBajada ? (
                                    <span className="ml-1">
                                      · libera plazas del ride
                                    </span>
                                  ) : usage.tope > 0 ? (
                                    <span className="ml-1">
                                      · disp.{" "}
                                      {Math.max(0, usage.tope - usage.used)}/
                                      {usage.tope}
                                    </span>
                                  ) : null}
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                {syncDot(sync)}
                                <span className="text-[10px] text-slate-400">
                                  <IconUsers size={12} className="inline" />
                                </span>
                                <input
                                  type="number"
                                  min={1}
                                  className="w-14 text-xs border rounded px-1.5 py-1 text-center outline-none focus:border-pink-500 bg-white"
                                  defaultValue={r.plazas}
                                  key={`${r.id}-${r.plazas}`}
                                  disabled={rowBusy}
                                  onBlur={(e) => {
                                    const next = Math.max(
                                      0,
                                      Number(e.target.value) || 0,
                                    );
                                    if (next === Number(r.plazas)) return;
                                    persistRutaPlazas(r, next);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.currentTarget.blur();
                                    }
                                  }}
                                  aria-label={`Plazas de ${name}`}
                                />
                                <button
                                  type="button"
                                  onClick={() => handleDelete(r)}
                                  disabled={rowBusy}
                                  className="text-slate-300 hover:text-red-500 p-1 disabled:opacity-40"
                                  title="Quitar regla"
                                >
                                  <IconTrash size={14} />
                                </button>
                              </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 pl-0.5">
                              {!isBajada ? (
                                <label className="inline-flex items-center gap-1.5 text-[10px] text-slate-600 cursor-pointer select-none mr-1">
                                  <input
                                    type="checkbox"
                                    className="rounded border-slate-300 text-pink-700 focus:ring-pink-500"
                                    checked={Boolean(r.es_chofer)}
                                    disabled={rowBusy}
                                    onChange={(e) =>
                                      persistRutaChofer(r, e.target.checked)
                                    }
                                  />
                                  <span>
                                    <span className="font-semibold">
                                      Es chofer
                                    </span>
                                    <span className="text-slate-400">
                                      {" "}
                                      en esta subida
                                    </span>
                                  </span>
                                </label>
                              ) : null}
                              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">
                                As. equipaje
                              </label>
                              <input
                                type="number"
                                min={0}
                                className="w-14 text-[11px] border rounded px-1.5 py-0.5 text-center outline-none focus:border-pink-500 bg-white"
                                defaultValue={r.asientos_equipaje || 0}
                                key={`${r.id}-eq-${r.asientos_equipaje}`}
                                disabled={rowBusy}
                                onBlur={(e) => {
                                  const next = Math.max(
                                    0,
                                    Number(e.target.value) || 0,
                                  );
                                  if (
                                    next ===
                                    Math.max(0, Number(r.asientos_equipaje) || 0)
                                  ) {
                                    return;
                                  }
                                  persistRutaLuggage(r, {
                                    asientos_equipaje: next,
                                  });
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") e.currentTarget.blur();
                                }}
                                aria-label={`Asientos equipaje de ${name}`}
                              />
                              <input
                                type="text"
                                className="flex-1 min-w-[8rem] text-[11px] border rounded px-1.5 py-0.5 outline-none focus:border-pink-500 bg-white"
                                defaultValue={r.observaciones_equipaje || ""}
                                key={`${r.id}-obs-${r.observaciones_equipaje || ""}`}
                                disabled={rowBusy}
                                placeholder="Obs. equipaje"
                                onBlur={(e) => {
                                  const next = e.target.value.trim();
                                  const prev = String(
                                    r.observaciones_equipaje || "",
                                  ).trim();
                                  if (next === prev) return;
                                  persistRutaLuggage(r, {
                                    observaciones_equipaje: next || null,
                                  });
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") e.currentTarget.blur();
                                }}
                                aria-label={`Observaciones equipaje de ${name}`}
                              />
                            </div>
                          </li>
                        );
                      })}

                      {/* Reserva técnica / residual visible */}
                      {(residualUp > 0 ||
                        residualAlight > 0 ||
                        reservaNum > 0) && (
                        <li className="px-3 py-2 flex justify-between items-start gap-2 bg-amber-50/60">
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-semibold text-amber-900 truncate">
                              {FIMBA_RESERVA_EVENTO_LABEL}
                            </div>
                            <div className="text-[10px] text-amber-800/80">
                              {isBajada
                                ? residualAlight > 0
                                  ? `Baja aquí · reserva técnica sin artista (${residualAlight})`
                                  : "Sin residual técnico bajando aquí"
                                : residualUp > 0
                                  ? `Sin artista nombrado: ${residualUp} plaza${residualUp === 1 ? "" : "s"} (reserva − Sube)`
                                  : "Reserva técnica anónima (staff/TBD). Artistas → Sube."}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {syncDot(reservaSync)}
                            {canEditReserva ? (
                              <input
                                type="number"
                                min={0}
                                className="w-14 text-xs border border-amber-200 rounded px-1.5 py-1 text-center outline-none focus:border-pink-500 bg-white"
                                value={reservaPlazas}
                                disabled={saving}
                                onChange={(e) => {
                                  setReservaPlazas(e.target.value);
                                  setReservaSync("dirty");
                                }}
                                onBlur={handleSaveReserva}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") e.currentTarget.blur();
                                }}
                                aria-label={FIMBA_RESERVA_EVENTO_LABEL}
                                title="Reserva técnica (fimba_evento_transportes.plazas). No son artistas nombrados."
                              />
                            ) : (
                              <span className="text-[10px] font-bold flex items-center gap-1 px-2 py-0.5 rounded-full text-amber-800 bg-amber-100">
                                <IconUsers size={12} />{" "}
                                {isBajada ? residualAlight : residualUp || reservaNum}
                              </span>
                            )}
                          </div>
                        </li>
                      )}
                    </ul>
                  )}
                </div>

                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3">
                  <h4 className="text-xs font-bold text-pink-900 uppercase tracking-wider">
                    {isBajada
                      ? "Bajar grupo / artista"
                      : "Agregar regla (grupo + cantidad)"}
                  </h4>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="text-[10px] font-bold text-slate-400 block mb-1">
                        GRUPO / ARTISTA
                      </label>
                      <select
                        className="w-full text-xs border rounded p-2 outline-none focus:border-pink-500 bg-white"
                        value={propuestaId}
                        onChange={(e) => handlePropuestaChange(e.target.value)}
                      >
                        <option value="">— Seleccionar —</option>
                        {isBajada
                          ? [...bajadaOptions]
                              .sort((a, b) => Number(b.aboard) - Number(a.aboard))
                              .map((opt) => (
                                <option
                                  key={opt.id_propuesta}
                                  value={opt.id_propuesta}
                                  disabled={!opt.aboard}
                                >
                                  {opt.propuesta?.nombre ||
                                    `Artista #${opt.id_propuesta}`}
                                  {opt.aboard
                                    ? ` (a bordo ${opt.plazasAboard})`
                                    : ` (${opt.reason})`}
                                </option>
                              ))
                          : (propuestas || []).map((p) => {
                              const usage = computeArtistaTransporteUsage(
                                p,
                                allRutas,
                                {
                                  eventId: event?.id,
                                  sortedEvents,
                                },
                              );
                              return (
                                <option key={p.id} value={p.id}>
                                  {p.nombre}
                                  {usage.tope
                                    ? ` (disp. ${usage.remaining}/${usage.tope})`
                                    : ""}
                                </option>
                              );
                            })}
                      </select>
                    </div>
                    <div style={{ width: 88 }}>
                      <label className="text-[10px] font-bold text-slate-400 block mb-1">
                        CANTIDAD
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={
                          isBajada
                            ? Math.max(
                                1,
                                bajadaByPropuesta.get(String(propuestaId))
                                  ?.plazasAboard || 500,
                              )
                            : usageForSelection
                              ? Math.max(1, usageForSelection.remaining)
                              : 500
                        }
                        className="w-full text-xs border rounded p-2 outline-none focus:border-pink-500 bg-white"
                        value={plazas}
                        onChange={(e) => setPlazas(e.target.value)}
                        placeholder="n"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div style={{ width: 100 }}>
                      <label className="text-[10px] font-bold text-slate-400 block mb-1">
                        ASIENTOS EQUIP.
                      </label>
                      <input
                        type="number"
                        min={0}
                        className="w-full text-xs border rounded p-2 outline-none focus:border-pink-500 bg-white"
                        value={asientosEquipaje}
                        onChange={(e) => setAsientosEquipaje(e.target.value)}
                        placeholder="0"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-[10px] font-bold text-slate-400 block mb-1">
                        OBS. EQUIPAJE
                      </label>
                      <input
                        type="text"
                        className="w-full text-xs border rounded p-2 outline-none focus:border-pink-500 bg-white"
                        value={obsEquipaje}
                        onChange={(e) => setObsEquipaje(e.target.value)}
                        placeholder="Notas de equipaje"
                      />
                    </div>
                  </div>
                  {!isBajada && (
                    <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        className="rounded border-slate-300 text-pink-700 focus:ring-pink-500"
                        checked={esChofer}
                        onChange={(e) => setEsChofer(e.target.checked)}
                      />
                      <span>
                        <span className="font-semibold">Es chofer</span>
                        <span className="text-slate-500">
                          {" "}
                          — en esta subida/trayecto (no consume cupo; no es un
                          rol permanente del artista)
                        </span>
                      </span>
                    </label>
                  )}
                  {isBajada ? (
                    propuestaId && bajadaByPropuesta.get(String(propuestaId)) ? (
                      <p
                        className={`text-[10px] m-0 ${
                          bajadaByPropuesta.get(String(propuestaId))?.aboard
                            ? "text-slate-600"
                            : "text-rose-600 font-semibold"
                        }`}
                      >
                        {bajadaByPropuesta.get(String(propuestaId))?.aboard ? (
                          <>
                            A bordo:{" "}
                            {
                              bajadaByPropuesta.get(String(propuestaId))
                                .plazasAboard
                            }{" "}
                            plaza
                            {bajadaByPropuesta.get(String(propuestaId))
                              .plazasAboard === 1
                              ? ""
                              : "s"}
                            . La bajada las libera en este vehículo.
                          </>
                        ) : (
                          <>
                            No está a bordo:{" "}
                            {bajadaByPropuesta.get(String(propuestaId))?.reason}.
                          </>
                        )}
                      </p>
                    ) : (
                      <p className="text-[10px] text-slate-500 m-0">
                        Elegí un grupo que ya haya subido a este vehículo.
                      </p>
                    )
                  ) : usageForSelection ? (
                    <p
                      className={`text-[10px] m-0 ${
                        usageForSelection.remaining <= 0
                          ? "text-rose-600 font-semibold"
                          : "text-slate-600"
                      }`}
                    >
                      disponibles: {usageForSelection.remaining} de{" "}
                      {usageForSelection.tope}
                      {vehicleLibres != null ? (
                        <span className="text-slate-400">
                          {" "}
                          · cap. vehículo {vehicleLibres}
                        </span>
                      ) : null}
                    </p>
                  ) : (
                    <p className="text-[10px] text-slate-500 m-0">
                      Cada asignación crea/actualiza una regla persistida
                      (artista + cantidad). Cambiar la cantidad en la lista
                      también guarda la regla.
                    </p>
                  )}
                  {canEditReserva && reservaNum <= 0 ? (
                    <div className="flex items-center gap-2 pt-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                        Reserva técnica
                      </label>
                      <input
                        type="number"
                        min={0}
                        className="w-14 text-xs border rounded px-1.5 py-1 text-center outline-none focus:border-pink-500 bg-white"
                        value={reservaPlazas}
                        disabled={saving}
                        onChange={(e) => {
                          setReservaPlazas(e.target.value);
                          setReservaSync("dirty");
                        }}
                        onBlur={handleSaveReserva}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") e.currentTarget.blur();
                        }}
                        aria-label="Reserva técnica del evento"
                        title="Cupo anónimo (staff/TBD). 0 = no ocupa asientos. Artistas nombrados van en Sube."
                      />
                      <span className="text-[10px] text-slate-400">
                        (opcional, no bloquea Sube)
                      </span>
                    </div>
                  ) : null}
                  <button
                    type="button"
                    onClick={handleAdd}
                    disabled={
                      saving ||
                      loading ||
                      !vehicleId ||
                      (isBajada
                        ? Boolean(propuestaId) &&
                          !bajadaByPropuesta.get(String(propuestaId))?.aboard &&
                          !existingRutaForSelection
                        : usageForSelection != null &&
                          usageForSelection.remaining <= 0 &&
                          !existingRutaForSelection)
                    }
                    className={`w-full py-2 rounded text-xs font-bold text-white shadow-sm flex justify-center items-center gap-2 disabled:opacity-60 ${
                      type === "up"
                        ? "bg-emerald-600 hover:bg-emerald-700"
                        : "bg-rose-600 hover:bg-rose-700"
                    }`}
                  >
                    {saving ? (
                      <IconLoader size={14} className="animate-spin" />
                    ) : (
                      <IconPlus size={14} />
                    )}{" "}
                    {existingRutaForSelection
                      ? "Actualizar regla"
                      : "Agregar regla"}
                  </button>
                </div>
              </>
            )}

            {tab === "orquesta" && (
              <div className="space-y-3">
                <p className="text-sm text-slate-600 m-0">
                  Las subidas y bajadas de orquesta usan las mismas reglas
                  OFRN (
                  <code className="text-[11px]">giras_logistica_rutas</code>
                  ): por persona, categoría, localidad o región. En bajadas
                  ves quién está a bordo (conteo = asientos reales) y podés
                  usar <strong>Bajar todo</strong> o bajar uno a uno.
                </p>

                {(vehiculos || []).length > 1 && (
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-1">
                      VEHÍCULO
                    </label>
                    <select
                      className="w-full text-xs border rounded p-2 outline-none focus:border-pink-500"
                      value={vehicleId}
                      onChange={(e) => setVehicleId(e.target.value)}
                    >
                      <option value="">— Elegir —</option>
                      {(vehiculos || []).map((v) => (
                        <option key={v.id} value={v.id}>
                          {labelGiraTransporte(v)}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {giraId == null ? (
                  <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                    Esta edición no tiene gira OFRN vinculada; no se pueden
                    gestionar reglas de orquesta.
                  </p>
                ) : !vehicleId ? (
                  <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                    Elegí un vehículo para cargar las reglas de orquesta de
                    esa unidad.
                  </p>
                ) : (
                  <StopRulesManager
                    isOpen
                    embedded
                    onClose={onClose}
                    event={event}
                    type={type}
                    transportId={Number(vehicleId)}
                    supabase={supabase}
                    giraId={Number(giraId)}
                    regions={regions}
                    localities={localities}
                    passengers={passengers}
                    admissionRules={admissionRules}
                    sortedEvents={sortedEvents}
                    onRefresh={() => {
                      onRefresh?.("ofrn");
                    }}
                  />
                )}

                <p className="text-[10px] text-slate-400 m-0">
                  IDs de integrantes son numéricos. Tras editar, la planilla
                  refresca la logística OFRN y muestra chips por regla (no solo
                  «Orquesta n»).
                </p>
              </div>
            )}
          </div>
  );

  const tabsBar = (
    <div className={`${embedded ? "pt-1" : "px-4 pt-3"} flex gap-2 border-b border-slate-100`}>
      <button
        type="button"
        className={`px-3 py-1.5 text-xs font-bold rounded-t ${
          tab === "artistas"
            ? "bg-slate-100 text-slate-800"
            : "text-slate-500 hover:text-slate-700"
        }`}
        onClick={() => setTab("artistas")}
      >
        Artistas FIMBA
      </button>
      <button
        type="button"
        className={`px-3 py-1.5 text-xs font-bold rounded-t ${
          tab === "orquesta"
            ? "bg-slate-100 text-slate-800"
            : "text-slate-500 hover:text-slate-700"
        }`}
        onClick={() => setTab("orquesta")}
      >
        Orquesta OFRN
      </button>
    </div>
  );

  if (embedded) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        <div className={`px-3 py-2 border-b ${bgClass}`}>
          <div className={`text-sm font-bold ${colorClass} flex items-center gap-1.5`}>
            <IconMapPin size={16} /> {title}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {location}
            {activeVehicle ? ` · ${labelGiraTransporte(activeVehicle)}` : ""}
          </div>
        </div>
        {tabsBar}
        <div className="p-3">{panelInner}</div>
      </div>
    );
  }

  const body = (
    <>
      <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh] animate-in zoom-in-95">
          <div
            className={`p-4 border-b rounded-t-xl flex justify-between items-start ${bgClass}`}
          >
            <div>
              <h3
                className={`text-lg font-bold ${colorClass} flex items-center gap-2`}
              >
                <IconMapPin size={20} /> {title}
              </h3>
              <div className="mt-1 text-sm font-medium text-slate-600">
                {location}
              </div>
              <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                <IconClock size={12} /> {hora} hs
                {activeVehicle ? (
                  <span className="ml-2 font-semibold text-slate-600">
                    · {labelGiraTransporte(activeVehicle)}
                  </span>
                ) : null}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1 hover:bg-white/50 rounded-full transition-colors"
            >
              <IconX size={20} className="text-slate-500" />
            </button>
          </div>

          {tabsBar}

          {panelInner}
        </div>
      </div>
    </>
  );

  return createPortal(body, document.body);
}
