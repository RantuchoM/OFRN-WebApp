/**
 * Tabla Tag | Sube | Baja en el editor de evento de transporte.
 * Tag = eventos_fimba_propuestas; Sube/Baja = fimba_propuesta_rutas (inline).
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  IconLoader,
  IconTrash,
  IconCheck,
  IconArrowDown,
  IconUsers,
  IconX,
} from "../../components/ui/Icons";
import SearchableSelect from "../../components/ui/SearchableSelect";
import {
  alightAllFimbaAboardAtStop,
  capacidadGiraTransporte,
  clearFimbaPropuestaRutaStop,
  computeArtistaTransporteUsage,
  defaultArtistaAssignPlazas,
  labelGiraTransporte,
  listFimbaPropuestaRutas,
  upsertFimbaPropuestaRutaStop,
  validateArtistaTransporteAssign,
} from "../../services/fimbaService";
import { buildFimbaBajadaArtistOptions } from "../../utils/fimbaTransportBoarding";

function syncDot(status) {
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
}

function rutaTouchesEvent(r, eventId) {
  if (eventId == null || eventId === "") return false;
  const eid = String(eventId);
  return (
    (r.id_evento_subida != null && String(r.id_evento_subida) === eid) ||
    (r.id_evento_bajada != null && String(r.id_evento_bajada) === eid)
  );
}

function filterEventRutas(rutas, eventId, vehicleId) {
  return (rutas || []).filter((r) => {
    if (!rutaTouchesEvent(r, eventId)) return false;
    if (vehicleId && String(r.id_gira_transporte) !== String(vehicleId)) {
      return false;
    }
    return true;
  });
}

/**
 * Controles inline de una celda Sube o Baja (plazas + equipaje + clear).
 */
function StopCell({
  type,
  ruta,
  propuesta,
  vehicleId,
  eventId,
  allRutas,
  vehicleLibres,
  bajadaOpt,
  disabled,
  disabledReason,
  onPersist,
  onClear,
  syncStatus,
}) {
  const isUp = type === "up";
  const canCreate =
    !disabled &&
    !ruta &&
    (isUp || Boolean(bajadaOpt?.aboard));

  const defaultPlazas = () => {
    if (!isUp) {
      const aboard = Math.max(0, Number(bajadaOpt?.plazasAboard) || 0);
      if (aboard > 0) return aboard;
      return Math.max(1, Number(ruta?.plazas) || 1);
    }
    if (!propuesta) return 1;
    const usage = computeArtistaTransporteUsage(propuesta, allRutas, {
      excludeRutaIds: ruta?.id ? [ruta.id] : [],
    });
    const n = defaultArtistaAssignPlazas({
      remaining: usage.remaining,
      vehicleLibres,
    });
    if (n <= 0 && ruta && Number(ruta.plazas) > 0) {
      return Math.max(0, Number(ruta.plazas) || 0);
    }
    return Math.max(1, n);
  };

  const [draftPlazas, setDraftPlazas] = useState(() =>
    ruta ? String(ruta.plazas || "") : "",
  );
  const [draftEq, setDraftEq] = useState(() =>
    ruta?.asientos_equipaje != null ? String(ruta.asientos_equipaje) : "",
  );
  const [draftObs, setDraftObs] = useState(
    () => ruta?.observaciones_equipaje || "",
  );

  useEffect(() => {
    if (ruta) {
      setDraftPlazas(String(ruta.plazas || ""));
      setDraftEq(
        ruta.asientos_equipaje != null ? String(ruta.asientos_equipaje) : "",
      );
      setDraftObs(ruta.observaciones_equipaje || "");
    } else {
      setDraftPlazas("");
      setDraftEq("");
      setDraftObs("");
    }
  }, [ruta?.id, ruta?.plazas, ruta?.asientos_equipaje, ruta?.observaciones_equipaje]);

  if (disabled) {
    return (
      <span className="fimba-muted" style={{ fontSize: "0.72rem" }}>
        {disabledReason || "—"}
      </span>
    );
  }

  if (!vehicleId) {
    return (
      <span className="fimba-muted" style={{ fontSize: "0.72rem" }}>
        Elegí vehículo
      </span>
    );
  }

  if (!ruta && !canCreate) {
    return (
      <span
        className="fimba-muted"
        style={{ fontSize: "0.72rem" }}
        title={bajadaOpt?.reason || undefined}
      >
        {bajadaOpt?.reason ? `No a bordo (${bajadaOpt.reason})` : "—"}
      </span>
    );
  }

  const saveCreate = async () => {
    const n = Math.max(0, Number(draftPlazas) || defaultPlazas());
    if (n <= 0) return;
    await onPersist({
      plazas: n,
      asientos_equipaje: Math.max(0, Number(draftEq) || 0),
      observaciones_equipaje: String(draftObs || "").trim() || null,
      create: true,
    });
  };

  const savePlazas = async () => {
    if (!ruta) return;
    const n = Math.max(0, Number(draftPlazas) || 0);
    if (n <= 0 || n === Number(ruta.plazas)) return;
    await onPersist({
      plazas: n,
      asientos_equipaje: Math.max(0, Number(ruta.asientos_equipaje) || 0),
      observaciones_equipaje: ruta.observaciones_equipaje ?? null,
    });
  };

  const saveLuggage = async (patch) => {
    if (!ruta) return;
    await onPersist({
      plazas: Math.max(0, Number(ruta.plazas) || 0),
      asientos_equipaje:
        patch.asientos_equipaje != null
          ? Math.max(0, Number(patch.asientos_equipaje) || 0)
          : Math.max(0, Number(ruta.asientos_equipaje) || 0),
      observaciones_equipaje:
        patch.observaciones_equipaje !== undefined
          ? patch.observaciones_equipaje
          : ruta.observaciones_equipaje ?? null,
    });
  };

  const accent = isUp ? "#059669" : "#e11d48";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
        {syncDot(syncStatus)}
        <IconUsers size={12} style={{ color: accent, flexShrink: 0 }} />
        <input
          type="number"
          min={1}
          className="fimba-input"
          style={{
            width: 52,
            padding: "0.25rem 0.35rem",
            fontSize: "0.75rem",
            textAlign: "center",
          }}
          placeholder={String(defaultPlazas())}
          value={draftPlazas}
          onChange={(e) => setDraftPlazas(e.target.value)}
          onBlur={() => {
            if (ruta) savePlazas();
          }}
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            e.preventDefault();
            e.currentTarget.blur();
          }}
          aria-label={isUp ? "Plazas subida" : "Plazas bajada"}
        />
        {!ruta ? (
          <button
            type="button"
            className="fimba-btn fimba-chip"
            style={{
              padding: "0.2rem 0.45rem",
              fontSize: "0.7rem",
              background: accent,
              borderColor: accent,
              color: "#fff",
            }}
            onClick={saveCreate}
            title={isUp ? "Crear subida" : "Crear bajada"}
          >
            {isUp ? "Sube" : "Baja"}
          </button>
        ) : (
          <button
            type="button"
            className="fimba-btn fimba-btn-ghost"
            style={{ padding: 2, color: "#94a3b8" }}
            onClick={onClear}
            title="Quitar regla"
          >
            <IconTrash size={14} />
          </button>
        )}
      </div>
      {(ruta || draftPlazas) && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, alignItems: "center" }}>
          <input
            type="number"
            min={0}
            className="fimba-input"
            style={{
              width: 44,
              padding: "0.15rem 0.3rem",
              fontSize: "0.68rem",
              textAlign: "center",
            }}
            placeholder="Eq."
            title="Asientos equipaje"
            value={draftEq}
            onChange={(e) => setDraftEq(e.target.value)}
            onBlur={() => {
              if (!ruta) return;
              const next = Math.max(0, Number(draftEq) || 0);
              if (next === Math.max(0, Number(ruta.asientos_equipaje) || 0)) return;
              saveLuggage({ asientos_equipaje: next });
            }}
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              e.preventDefault();
              e.currentTarget.blur();
            }}
          />
          <input
            type="text"
            className="fimba-input"
            style={{
              flex: 1,
              minWidth: 64,
              padding: "0.15rem 0.35rem",
              fontSize: "0.68rem",
            }}
            placeholder="Obs. eq."
            value={draftObs}
            onChange={(e) => setDraftObs(e.target.value)}
            onBlur={() => {
              if (!ruta) return;
              const next = String(draftObs || "").trim();
              const prev = String(ruta.observaciones_equipaje || "").trim();
              if (next === prev) return;
              saveLuggage({ observaciones_equipaje: next || null });
            }}
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              e.preventDefault();
              e.currentTarget.blur();
            }}
          />
        </div>
      )}
    </div>
  );
}

export default function FimbaEventoArtistasBoardingTable({
  propuestas = [],
  selectedPropIds = [],
  onChangeSelected,
  lockedPropId = null,
  event = null,
  edicionId = null,
  selectedVehIds = [],
  flota = [],
  sequencesByVehicle = null,
  /** Rutas ya cargadas en Transportes — evita refetch al abrir / tras blur. */
  propuestaRoutes = null,
  canEditBoarding = false,
  onBoardingRefresh = null,
}) {
  const vehiculos = useMemo(
    () =>
      (flota || []).filter((v) =>
        (selectedVehIds || []).some((id) => String(id) === String(v.id)),
      ),
    [flota, selectedVehIds],
  );

  const [vehicleId, setVehicleId] = useState(() =>
    selectedVehIds?.length ? String(selectedVehIds[0]) : "",
  );
  const [eventRutas, setEventRutas] = useState([]);
  const [allRutas, setAllRutas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [cellSync, setCellSync] = useState({});
  const [bajarTodoBusy, setBajarTodoBusy] = useState(false);
  const [tagFilter, setTagFilter] = useState("");
  const seededEventIdRef = useRef(null);

  useEffect(() => {
    if (selectedVehIds?.length === 1) {
      setVehicleId(String(selectedVehIds[0]));
    } else if (
      selectedVehIds?.length > 1 &&
      vehicleId &&
      !selectedVehIds.some((id) => String(id) === String(vehicleId))
    ) {
      setVehicleId(String(selectedVehIds[0]));
    } else if (!vehicleId && selectedVehIds?.length) {
      setVehicleId(String(selectedVehIds[0]));
    }
  }, [selectedVehIds, vehicleId]);

  const applyFromRoutes = useCallback((rutas) => {
    setAllRutas(rutas || []);
  }, []);

  const mergeRuta = useCallback((ruta) => {
    if (!ruta) return;
    setAllRutas((prev) => {
      const idx = prev.findIndex((r) => String(r.id) === String(ruta.id));
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...prev[idx], ...ruta };
        return next;
      }
      return [...prev, ruta];
    });
  }, []);

  const removeRutaById = useCallback((rutaId) => {
    if (rutaId == null) return;
    setAllRutas((prev) => prev.filter((r) => String(r.id) !== String(rutaId)));
  }, []);

  const notifyPlanilla = useCallback(() => {
    onBoardingRefresh?.("rutas");
  }, [onBoardingRefresh]);

  // Seed once per evento (cache del padre). Parches locales + refresh
  // de planilla en background; no re-hidratar desde el padre tras cada blur
  // (evita pisar mutaciones optimistas).
  useEffect(() => {
    if (!edicionId || !canEditBoarding || !event?.id) {
      setEventRutas([]);
      setAllRutas([]);
      seededEventIdRef.current = null;
      return undefined;
    }
    if (seededEventIdRef.current === String(event.id)) {
      return undefined;
    }
    if (propuestaRoutes != null) {
      applyFromRoutes(propuestaRoutes);
      seededEventIdRef.current = String(event.id);
      setLoading(false);
      return undefined;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const allRes = await listFimbaPropuestaRutas(edicionId, { propuestas });
      if (cancelled) return;
      if (allRes.error) setError(allRes.error.message);
      applyFromRoutes(allRes.rutas || []);
      seededEventIdRef.current = String(event.id);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [edicionId, canEditBoarding, event?.id, propuestaRoutes, applyFromRoutes]);

  useEffect(() => {
    setEventRutas(filterEventRutas(allRutas, event?.id, vehicleId));
  }, [allRutas, event?.id, vehicleId]);

  const activeVehicle = useMemo(
    () =>
      (vehiculos || []).find((v) => String(v.id) === String(vehicleId)) || null,
    [vehiculos, vehicleId],
  );
  const vehicleLibres = useMemo(
    () => capacidadGiraTransporte(activeVehicle),
    [activeVehicle],
  );

  const sortedEvents = useMemo(() => {
    if (!vehicleId || !sequencesByVehicle) return [];
    const seq =
      sequencesByVehicle.get?.(Number(vehicleId)) ||
      sequencesByVehicle.get?.(String(vehicleId)) ||
      null;
    return seq?.sortedEvents || [];
  }, [sequencesByVehicle, vehicleId]);

  const bajadaByPropuesta = useMemo(() => {
    const opts = buildFimbaBajadaArtistOptions({
      propuestas,
      rutas: allRutas,
      idGiraTransporte: vehicleId || null,
      eventId: event?.id,
      sortedEvents,
    });
    const map = new Map();
    for (const opt of opts) {
      map.set(String(opt.id_propuesta), opt);
    }
    return map;
  }, [propuestas, allRutas, vehicleId, event?.id, sortedEvents]);

  const taggedPropuestas = useMemo(() => {
    const ids = (selectedPropIds || []).map(String);
    return ids
      .map((id) => (propuestas || []).find((p) => String(p.id) === id))
      .filter(Boolean)
      .sort((a, b) =>
        String(a.nombre || "").localeCompare(String(b.nombre || ""), "es", {
          sensitivity: "base",
        }),
      );
  }, [selectedPropIds, propuestas]);

  const filteredTaggedPropuestas = useMemo(() => {
    const q = tagFilter.trim().toLocaleLowerCase("es");
    if (!q) return taggedPropuestas;
    return taggedPropuestas.filter((p) =>
      String(p.nombre || "").toLocaleLowerCase("es").includes(q),
    );
  }, [taggedPropuestas, tagFilter]);

  const availableToAdd = useMemo(() => {
    const have = new Set((selectedPropIds || []).map(String));
    return (propuestas || [])
      .filter((p) => !have.has(String(p.id)))
      .sort((a, b) =>
        String(a.nombre || "").localeCompare(String(b.nombre || ""), "es", {
          sensitivity: "base",
        }),
      );
  }, [propuestas, selectedPropIds]);

  const addOptions = useMemo(
    () =>
      availableToAdd.map((p) => ({
        id: String(p.id),
        label: p.nombre || `Artista #${p.id}`,
        color: p.color || undefined,
      })),
    [availableToAdd],
  );

  const rutaFor = (propId, type) => {
    const field = type === "up" ? "id_evento_subida" : "id_evento_bajada";
    return (
      (eventRutas || []).find(
        (r) =>
          String(r.id_propuesta) === String(propId) &&
          String(r.id_gira_transporte) === String(vehicleId) &&
          r[field] != null &&
          String(r[field]) === String(event?.id),
      ) || null
    );
  };

  const syncKey = (propId, type) => `${propId}:${type}:${vehicleId}`;

  const persistStop = async (propId, type, payload) => {
    const key = syncKey(propId, type);
    const p = (propuestas || []).find((x) => String(x.id) === String(propId));
    if (type === "up" && p) {
      const existing = rutaFor(propId, "up");
      const usage = computeArtistaTransporteUsage(p, allRutas, {
        excludeRutaIds: existing?.id ? [existing.id] : [],
      });
      const check = validateArtistaTransporteAssign(
        p,
        usage.used,
        payload.plazas,
      );
      if (!check.ok) {
        setError(check.error.message);
        setCellSync((s) => ({ ...s, [key]: "error" }));
        return;
      }
    }
    setCellSync((s) => ({ ...s, [key]: "saving" }));
    setError(null);
    const upsertPayload = {
      id_propuesta: propId,
      id_gira_transporte: vehicleId,
      plazas: payload.plazas,
      type,
      id_evento: event.id,
      replaceConflict: Boolean(payload.create) ? false : true,
      asientos_equipaje: payload.asientos_equipaje,
      observaciones_equipaje: payload.observaciones_equipaje,
      skipCapAssert: true,
      propuesta: p || null,
    };
    let res = await upsertFimbaPropuestaRutaStop(upsertPayload);
    if (res.conflict) {
      const ok = window.confirm(
        `${res.error?.message || "Conflicto"}.\n\n¿Reemplazar la parada anterior?`,
      );
      if (!ok) {
        setCellSync((s) => ({ ...s, [key]: "idle" }));
        return;
      }
      res = await upsertFimbaPropuestaRutaStop({
        ...upsertPayload,
        replaceConflict: true,
      });
    }
    if (res.error) {
      setError(res.error.message || "No se pudo guardar la regla");
      setCellSync((s) => ({ ...s, [key]: "error" }));
      return;
    }
    mergeRuta(res.ruta);
    setCellSync((s) => ({ ...s, [key]: "saved" }));
    notifyPlanilla();
  };

  const clearStop = async (propId, type) => {
    const ruta = rutaFor(propId, type);
    if (!ruta) return;
    if (!window.confirm("¿Quitar esta regla de parada?")) return;
    const key = syncKey(propId, type);
    setCellSync((s) => ({ ...s, [key]: "saving" }));
    const clearRes = await clearFimbaPropuestaRutaStop(ruta.id, type);
    if (clearRes.error) {
      setError(clearRes.error.message || "No se pudo quitar");
      setCellSync((s) => ({ ...s, [key]: "error" }));
      return;
    }
    if (clearRes.deleted || clearRes.deletedId != null) {
      removeRutaById(clearRes.deletedId ?? ruta.id);
    } else if (clearRes.ruta) {
      mergeRuta(clearRes.ruta);
    } else {
      removeRutaById(ruta.id);
    }
    setCellSync((s) => ({ ...s, [key]: "saved" }));
    notifyPlanilla();
  };

  const clearAllRulesForPropAtEvent = async (propId) => {
    if (!event?.id || !edicionId) return { error: null, cleared: 0 };
    const local = (allRutas || []).filter(
      (r) =>
        String(r.id_propuesta) === String(propId) &&
        rutaTouchesEvent(r, event.id),
    );
    let rutas = local;
    if (rutas.length === 0) {
      const { rutas: listed, error: eList } = await listFimbaPropuestaRutas(
        edicionId,
        {
          id_propuesta: propId,
          id_evento: event.id,
          propuestas,
        },
      );
      if (eList) return { error: eList, cleared: 0 };
      rutas = listed || [];
    }
    let cleared = 0;
    for (const r of rutas || []) {
      const clears = [];
      if (
        r.id_evento_subida != null &&
        String(r.id_evento_subida) === String(event.id)
      ) {
        clears.push("up");
      }
      if (
        r.id_evento_bajada != null &&
        String(r.id_evento_bajada) === String(event.id)
      ) {
        clears.push("down");
      }
      for (const t of clears) {
        const clearRes = await clearFimbaPropuestaRutaStop(r.id, t);
        if (clearRes.error) return { error: clearRes.error, cleared };
        if (clearRes.deleted || clearRes.deletedId != null) {
          removeRutaById(clearRes.deletedId ?? r.id);
        } else if (clearRes.ruta) {
          mergeRuta(clearRes.ruta);
        }
        cleared += 1;
      }
    }
    return { error: null, cleared };
  };

  const removeTag = async (propId) => {
    const sid = String(propId);
    if (lockedPropId && sid === lockedPropId) return;

    let hasRules = false;
    if (canEditBoarding && event?.id) {
      hasRules = (allRutas || []).some(
        (r) =>
          String(r.id_propuesta) === sid && rutaTouchesEvent(r, event.id),
      );
      if (!hasRules) {
        const { rutas } = await listFimbaPropuestaRutas(edicionId, {
          id_propuesta: propId,
          id_evento: event.id,
          propuestas,
        });
        hasRules = (rutas || []).length > 0;
      }
    }

    if (hasRules) {
      const ok = window.confirm(
        "Este artista tiene reglas Sube/Baja en este evento.\n\n¿Quitar el tag y limpiar esas reglas?",
      );
      if (!ok) return;
      const { error: err } = await clearAllRulesForPropAtEvent(propId);
      if (err) {
        setError(err.message || "No se pudieron limpiar las reglas");
        return;
      }
      notifyPlanilla();
    }

    onChangeSelected((selectedPropIds || []).filter((id) => String(id) !== sid));
  };

  const addTag = (id) => {
    if (id == null || id === "") return;
    const sid = String(id);
    if ((selectedPropIds || []).some((x) => String(x) === sid)) return;
    onChangeSelected([...(selectedPropIds || []), sid]);
  };

  const handleBajarTodo = async () => {
    if (!vehicleId || !event?.id) return;
    const aboardCount = [...bajadaByPropuesta.values()].filter(
      (o) => o.aboard,
    ).length;
    if (aboardCount <= 0) {
      setError("No hay artistas a bordo en este vehículo.");
      return;
    }
    const ok = window.confirm(
      `¿Bajar todo lo a bordo de este vehículo en esta parada?\n\n` +
        `Se cerrarán ${aboardCount} ride(s) FIMBA abiertos.\n` +
        `Orquesta OFRN: Gestionar bajadas → pestaña Orquesta → Bajar todo.`,
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
    for (const r of res.rutas || []) mergeRuta(r);
    notifyPlanilla();
  };

  const boardingDisabledReason = !canEditBoarding
    ? "Guardá el trayecto para editar Sube/Baja"
    : null;

  return (
    <div className="fimba-field">
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 8,
          marginBottom: 8,
        }}
      >
        <label className="fimba-label" style={{ margin: 0 }}>
          Artistas · Sube / Baja
        </label>
        {canEditBoarding && vehiculos.length > 1 && (
          <select
            className="fimba-select"
            style={{ maxWidth: 200, fontSize: "0.8rem", padding: "0.3rem 0.5rem" }}
            value={vehicleId}
            onChange={(e) => setVehicleId(e.target.value)}
          >
            {vehiculos.map((v) => (
              <option key={v.id} value={v.id}>
                {labelGiraTransporte(v)}
              </option>
            ))}
          </select>
        )}
        {canEditBoarding && vehicleId && (
          <button
            type="button"
            className="fimba-btn"
            style={{
              marginLeft: "auto",
              padding: "0.3rem 0.65rem",
              fontSize: "0.75rem",
              background: "#be123c",
              borderColor: "#be123c",
              color: "#fff",
            }}
            onClick={handleBajarTodo}
            disabled={bajarTodoBusy || loading}
            title="Cierra todos los rides FIMBA abiertos a bordo"
          >
            {bajarTodoBusy ? (
              <IconLoader size={14} className="animate-spin" />
            ) : (
              <IconArrowDown size={14} />
            )}{" "}
            Bajar todo
          </button>
        )}
      </div>

      {propuestas.length === 0 ? (
        <p className="fimba-muted" style={{ margin: 0, fontSize: "0.85rem" }}>
          Sin artistas en la edición. Podés guardar igual (evento de edición).
        </p>
      ) : (
        <>
          {error && (
            <div className="fimba-error" style={{ marginBottom: 8, fontSize: "0.8rem" }}>
              {error}
            </div>
          )}
          {loading && canEditBoarding ? (
            <p className="fimba-muted" style={{ fontSize: "0.8rem" }}>
              <IconLoader size={14} className="animate-spin" style={{ display: "inline" }} />{" "}
              Cargando reglas…
            </p>
          ) : null}

          {taggedPropuestas.length > 0 && (
            <input
              type="search"
              className="fimba-input"
              value={tagFilter}
              onChange={(e) => setTagFilter(e.target.value)}
              placeholder="Filtrar artistas…"
              aria-label="Filtrar artistas taggeados"
              style={{
                width: "100%",
                marginBottom: 8,
                padding: "0.4rem 0.65rem",
                fontSize: "0.8rem",
              }}
            />
          )}

          <div style={{ overflowX: "auto" }}>
            <table
              className="fimba-table"
              style={{ width: "100%", minWidth: 420, fontSize: "0.8rem" }}
            >
              <thead>
                <tr>
                  <th style={{ width: "32%" }}>Tag</th>
                  <th style={{ width: "34%", color: "#059669" }}>Sube</th>
                  <th style={{ width: "34%", color: "#e11d48" }}>Baja</th>
                </tr>
              </thead>
              <tbody>
                {taggedPropuestas.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="fimba-muted" style={{ textAlign: "center" }}>
                      Ningún artista taggeado. Agregá uno abajo.
                    </td>
                  </tr>
                ) : filteredTaggedPropuestas.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="fimba-muted" style={{ textAlign: "center" }}>
                      Ningún artista coincide con el filtro.
                    </td>
                  </tr>
                ) : (
                  filteredTaggedPropuestas.map((p) => {
                    const locked =
                      lockedPropId && String(p.id) === String(lockedPropId);
                    const upRuta = canEditBoarding ? rutaFor(p.id, "up") : null;
                    const downRuta = canEditBoarding
                      ? rutaFor(p.id, "down")
                      : null;
                    const bajadaOpt = bajadaByPropuesta.get(String(p.id));
                    return (
                      <tr key={p.id}>
                        <td style={{ verticalAlign: "top" }}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                              minWidth: 0,
                            }}
                          >
                            <span
                              style={{
                                display: "inline-block",
                                maxWidth: "100%",
                                padding: "0.2rem 0.5rem",
                                borderRadius: 4,
                                background: p.color || "#d73289",
                                color: "#fff",
                                fontSize: "0.75rem",
                                fontWeight: 600,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                              title={p.nombre}
                            >
                              {p.nombre}
                              {locked ? " · fijo" : ""}
                            </span>
                            {!locked && (
                              <button
                                type="button"
                                className="fimba-btn fimba-btn-ghost"
                                style={{ padding: 2, flexShrink: 0 }}
                                onClick={() => removeTag(p.id)}
                                title="Quitar tag"
                              >
                                <IconX size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                        <td style={{ verticalAlign: "top" }}>
                          <StopCell
                            type="up"
                            ruta={upRuta}
                            propuesta={p}
                            vehicleId={vehicleId}
                            eventId={event?.id}
                            allRutas={allRutas}
                            vehicleLibres={vehicleLibres}
                            disabled={!canEditBoarding}
                            disabledReason={boardingDisabledReason}
                            syncStatus={cellSync[syncKey(p.id, "up")]}
                            onPersist={(payload) =>
                              persistStop(p.id, "up", payload)
                            }
                            onClear={() => clearStop(p.id, "up")}
                          />
                        </td>
                        <td style={{ verticalAlign: "top" }}>
                          <StopCell
                            type="down"
                            ruta={downRuta}
                            propuesta={p}
                            vehicleId={vehicleId}
                            eventId={event?.id}
                            allRutas={allRutas}
                            vehicleLibres={vehicleLibres}
                            bajadaOpt={bajadaOpt}
                            disabled={!canEditBoarding}
                            disabledReason={boardingDisabledReason}
                            syncStatus={cellSync[syncKey(p.id, "down")]}
                            onPersist={(payload) =>
                              persistStop(p.id, "down", payload)
                            }
                            onClear={() => clearStop(p.id, "down")}
                          />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {availableToAdd.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <SearchableSelect
                options={addOptions}
                value={null}
                onChange={addTag}
                placeholder="Buscar artista…"
                dropdownMinWidth={280}
              />
            </div>
          )}

          {lockedPropId && (
            <p
              className="fimba-muted"
              style={{ margin: "0.35rem 0 0", fontSize: "0.72rem" }}
            >
              Este evento queda etiquetado al artista de la ficha (tag obligatorio).
            </p>
          )}
          {!canEditBoarding && (
            <p
              className="fimba-muted"
              style={{ margin: "0.35rem 0 0", fontSize: "0.72rem" }}
            >
              Podés encolar tags ahora; Sube/Baja se editan después de guardar el
              trayecto (y con al menos un vehículo).
            </p>
          )}
          {canEditBoarding && (
            <p
              className="fimba-muted"
              style={{ margin: "0.35rem 0 0", fontSize: "0.72rem" }}
            >
              Mismas reglas que «Gestionar subidas/bajadas» en la planilla
              (artista + plazas + equipaje). La reserva técnica son las plazas del
              vehículo arriba.
              {vehiculos.length > 1
                ? " Cambiá el vehículo del selector para editar otra unidad."
                : ""}
            </p>
          )}
        </>
      )}
    </div>
  );
}
