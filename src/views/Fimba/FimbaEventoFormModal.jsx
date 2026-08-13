import React, { useEffect, useMemo, useState } from "react";
import {
  actividadUsaTransporte,
  categoriesFromTiposEvento,
  capacidadGiraTransporte,
  computeFimbaCapacity,
  cupoPlazasVehiculo,
  defaultArtistaAssignPlazas,
  FIMBA_DEFAULT_TIPO_EVENTO,
  FIMBA_TIPO_EVENTO_TRASLADO,
  labelGiraTransporte,
  detalleGiraTransporte,
  listFimbaGiraGrupos,
  listTiposEventoForFimba,
  listVehiclesAvailability,
  repartirPlazasEntreVehiculos,
  saveFimbaEvento,
  validateEventoTransportPlazasVsArtistas,
  validateEventoTransportPlazasVsCapacidad,
  validateEventoTransportPlazasVsLibres,
} from "../../services/fimbaService";
import { eventGrupoIdsFromEvent } from "../../services/giraGruposService";

function sliceTime(t) {
  if (!t) return "";
  const s = String(t).slice(0, 5);
  return s === "—" ? "" : s;
}

/** Default # PAX = Σ capacidad de artistas taggeados (transporte o hotel/comida). */
function paxDefaultFromArtistas(propuestas, selectedIds, usaTransporte) {
  const props = (propuestas || []).filter((p) =>
    (selectedIds || []).some((id) => String(id) === String(p.id)),
  );
  if (props.length === 0) return 0;
  return props.reduce((s, p) => {
    const cap = computeFimbaCapacity(p);
    return s + (usaTransporte ? cap.para_transporte : cap.para_hotel_comida);
  }, 0);
}

function initialAudienciaOfrn(evento) {
  const ao = evento?.audiencia_ofrn;
  const grupoIds = eventGrupoIdsFromEvent(evento);
  if (grupoIds.length > 0 || ao === "grupos") return "grupos";
  if (ao === "tutti") return "tutti";
  if (ao === "none") return "none";
  // Histórico / sin valor en eventos FIMBA-only
  if (!evento) return "none";
  if (ao == null || ao === "") return "tutti";
  return "none";
}

/**
 * Modal unificado de agenda FIMBA.
 * Tipos/colores/FK = catálogo OFRN `tipos_evento` (mismo que EventForm).
 * Audiencia OFRN: None | Tutti | multi-select de `giras_grupos` reales.
 * Portal: el padre monta con createPortal(..., document.body).
 */
export default function FimbaEventoFormModal({
  mode,
  evento,
  edicion,
  flota,
  propuestas,
  preselectPropuesta,
  /** Si viene, este artista queda siempre taggeado (no se puede desmarcar). */
  lockPropuesta = null,
  defaultTipoId = null,
  forceTransporte = false,
  onClose,
  onSaved,
}) {
  const isEdit = mode === "edit";
  const lockedPropId =
    lockPropuesta != null && lockPropuesta !== "" ? String(lockPropuesta) : null;

  const defaultProps = useMemo(() => {
    let ids = [];
    if (isEdit) ids = (evento?.propuestas || []).map((p) => String(p.id));
    else if (preselectPropuesta) ids = [String(preselectPropuesta)];
    if (lockedPropId && !ids.includes(lockedPropId)) ids = [...ids, lockedPropId];
    return ids;
  }, [isEdit, evento, preselectPropuesta, lockedPropId]);

  const defaultGrupoIds = useMemo(() => {
    if (!isEdit) return [];
    return eventGrupoIdsFromEvent(evento).map(String);
  }, [isEdit, evento]);

  const initialTipo = useMemo(() => {
    if (isEdit && evento?.id_tipo_evento != null) return Number(evento.id_tipo_evento);
    // Create draft (p.ej. parada intermedia): honor explicit draft tipo
    if (
      !isEdit &&
      evento?.id_tipo_evento != null &&
      evento.id_tipo_evento !== ""
    ) {
      return Number(evento.id_tipo_evento);
    }
    // forceTransporte sin draft: siempre traslado (11), no el genérico de agenda (16)
    if (forceTransporte) {
      if (defaultTipoId != null && defaultTipoId !== "") {
        return Number(defaultTipoId) || FIMBA_TIPO_EVENTO_TRASLADO;
      }
      return FIMBA_TIPO_EVENTO_TRASLADO;
    }
    return Number(defaultTipoId) || FIMBA_DEFAULT_TIPO_EVENTO;
  }, [isEdit, evento, defaultTipoId, forceTransporte]);

  const draftVehIds = useMemo(() => {
    const fromRows = (evento?.vehiculos || [])
      .map((r) => Number(r?.id_gira_transporte))
      .filter((n) => Number.isFinite(n));
    if (fromRows.length) return fromRows.map(String);
    if (evento?.id_gira_transporte != null && evento.id_gira_transporte !== "") {
      const n = Number(evento.id_gira_transporte);
      if (Number.isFinite(n)) return [String(n)];
    }
    return [];
  }, [evento]);

  const [tipos, setTipos] = useState([]);
  const [tiposLoading, setTiposLoading] = useState(true);
  const [tiposError, setTiposError] = useState(null);
  const [categoriaFiltro, setCategoriaFiltro] = useState("");
  const [tipoId, setTipoId] = useState(initialTipo);
  const [usaTransporte, setUsaTransporte] = useState(
    forceTransporte || actividadUsaTransporte(initialTipo, evento?.tipos_evento),
  );
  const [fecha, setFecha] = useState(evento?.fecha || "");
  const [horaCom, setHoraCom] = useState(sliceTime(evento?.hora_inicio));
  const [horaFin, setHoraFin] = useState(sliceTime(evento?.hora_fin));
  const [actividad, setActividad] = useState(evento?.actividad || "");
  const [destino, setDestino] = useState(evento?.destino || "");
  const [vuelo, setVuelo] = useState(evento?.vuelo || "");
  const [observaciones, setObservaciones] = useState(evento?.observaciones || "");
  const [pax, setPax] = useState(() => (isEdit ? Number(evento?.pax) || 0 : 0));
  /** Valor guardado > 0 o edición manual: no pisar con el default de artistas. */
  const [paxTouched, setPaxTouched] = useState(
    () => isEdit && Number(evento?.pax) > 0,
  );
  const [sinServicio, setSinServicio] = useState(() => {
    if (isEdit) {
      return (
        Boolean(evento?.sin_servicio) ||
        ((evento?.vehiculos || []).length === 0 &&
          (evento?.id_gira_transporte == null || evento.id_gira_transporte === ""))
      );
    }
    // Create: draft vehicle ids → servicio asignado; si no hay flota, SIN SERVICIO
    if (draftVehIds.length > 0) return false;
    if (evento?.sin_servicio != null) return Boolean(evento.sin_servicio);
    return flota.length === 0;
  });
  const [selectedVehIds, setSelectedVehIds] = useState(() => draftVehIds);
  const [plazasByVeh, setPlazasByVeh] = useState(() => {
    const map = {};
    for (const r of evento?.vehiculos || []) {
      if (r?.id_gira_transporte == null) continue;
      map[String(r.id_gira_transporte)] = Number(r.plazas) || 0;
    }
    if (
      Object.keys(map).length === 0 &&
      evento?.id_gira_transporte != null &&
      evento.id_gira_transporte !== ""
    ) {
      map[String(evento.id_gira_transporte)] = 0;
    }
    return map;
  });
  const [selectedProps, setSelectedProps] = useState(defaultProps);
  const [audienciaOfrn, setAudienciaOfrn] = useState(() => initialAudienciaOfrn(evento));
  const [giraGrupos, setGiraGrupos] = useState([]);
  const [gruposLoading, setGruposLoading] = useState(false);
  const [selectedGrupoIds, setSelectedGrupoIds] = useState(defaultGrupoIds);
  const [metrics, setMetrics] = useState({});
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setTiposLoading(true);
      const { tipos: list, error: err } = await listTiposEventoForFimba();
      if (cancelled) return;
      if (err) {
        setTiposError(err.message || "No se pudo cargar tipos de evento");
        setTipos([]);
      } else {
        setTipos(list || []);
        setTiposError(null);
        // Si el default no está en catálogo (id huérfano), mantener valor en select vía opción fallback.
      }
      setTiposLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Grupos de convocatoria de la gira (audencia OFRN multi-select)
  useEffect(() => {
    let cancelled = false;
    const idGira = edicion?.id_gira;
    if (idGira == null || idGira === "") {
      setGiraGrupos([]);
      return undefined;
    }
    (async () => {
      setGruposLoading(true);
      const { grupos, error: err } = await listFimbaGiraGrupos(idGira);
      if (cancelled) return;
      setGiraGrupos(err ? [] : grupos || []);
      setGruposLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [edicion?.id_gira]);

  // Default # PAX = Σ artistas taggeados. En edit, solo si audiencia guardada es 0.
  useEffect(() => {
    if (paxTouched) return;
    setPax(paxDefaultFromArtistas(propuestas, selectedProps, usaTransporte));
  }, [selectedProps, propuestas, usaTransporte, paxTouched]);

  // Al cargar catálogo: sync flota + defaults de transporte
  useEffect(() => {
    if (!tipos.length) return;
    if (forceTransporte) {
      if (!isEdit) {
        const fromDraft =
          evento?.id_tipo_evento != null && evento.id_tipo_evento !== ""
            ? Number(evento.id_tipo_evento)
            : null;
        const fromProp =
          defaultTipoId != null && defaultTipoId !== ""
            ? Number(defaultTipoId)
            : null;
        setTipoId(
          (Number.isFinite(fromDraft) && fromDraft) ||
            (Number.isFinite(fromProp) && fromProp) ||
            FIMBA_TIPO_EVENTO_TRASLADO,
        );
      }
      setUsaTransporte(true);
      return;
    }
    if (!isEdit) {
      const meta = tipos.find((t) => Number(t.id) === Number(tipoId));
      setUsaTransporte(actividadUsaTransporte(tipoId, meta));
    } else {
      const meta =
        tipos.find((t) => Number(t.id) === Number(tipoId)) || evento?.tipos_evento;
      setUsaTransporte(
        actividadUsaTransporte(tipoId, meta) ||
          (evento?.vehiculos || []).length > 0 ||
          Boolean(evento?.sin_servicio && evento?.es_traslado),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipos, forceTransporte]);

  const categorias = useMemo(() => categoriesFromTiposEvento(tipos), [tipos]);

  const tiposFiltrados = useMemo(() => {
    let list = tipos;
    if (forceTransporte) {
      list = tipos.filter((t) => actividadUsaTransporte(t.id, t));
    } else if (categoriaFiltro) {
      list = tipos.filter((t) => String(t.id_categoria) === String(categoriaFiltro));
    }
    // Asegurar que el tipo actual esté en la lista (edición con filtro)
    if (tipoId && !list.some((t) => Number(t.id) === Number(tipoId))) {
      const current = tipos.find((t) => Number(t.id) === Number(tipoId));
      if (current) list = [current, ...list];
    }
    return list;
  }, [tipos, categoriaFiltro, forceTransporte, tipoId]);

  const tipoSeleccionado = useMemo(
    () => tipos.find((t) => Number(t.id) === Number(tipoId)) || null,
    [tipos, tipoId],
  );

  const applyTipoChange = (rawId) => {
    const id = Number(rawId);
    setTipoId(id);
    const meta = tipos.find((t) => Number(t.id) === id) || null;
    const isTx = forceTransporte || actividadUsaTransporte(id, meta);
    if (!forceTransporte) {
      setUsaTransporte(isTx);
      if (isTx) {
        if (flota.length === 0) setSinServicio(true);
      } else {
        setSinServicio(true);
        setSelectedVehIds([]);
      }
    }
    // Sugerir título de actividad con el nombre del tipo si el campo está vacío
    if (!actividad.trim() && meta?.nombre) {
      setActividad(meta.nombre);
    }
  };


  /** Tope transporte de artistas taggeados (Σ para_transporte). */
  const artistasCapTope = useMemo(() => {
    const props = (propuestas || []).filter((p) =>
      selectedProps.some((id) => String(id) === String(p.id)),
    );
    if (props.length === 0) return null;
    return props.reduce(
      (s, p) => s + computeFimbaCapacity(p).para_transporte,
      0,
    );
  }, [propuestas, selectedProps]);

  const totalPlazasAsignadas = useMemo(
    () =>
      selectedVehIds.reduce(
        (s, id) => s + Math.max(0, Number(plazasByVeh[id]) || 0),
        0,
      ),
    [selectedVehIds, plazasByVeh],
  );

  const artistasCapRemaining =
    artistasCapTope != null
      ? Math.max(0, artistasCapTope - totalPlazasAsignadas)
      : null;

  useEffect(() => {
    setPlazasByVeh((prev) => {
      const next = { ...prev };
      let changed = false;
      // Disponibles del tope artistas, contando solo lo ya defaultado en este pass
      let poolRemaining =
        artistasCapTope != null
          ? Math.max(
              0,
              artistasCapTope -
                selectedVehIds.reduce((s, id) => {
                  if (prev[id] != null && prev[id] !== "") {
                    return s + Math.max(0, Number(prev[id]) || 0);
                  }
                  return s;
                }, 0),
            )
          : null;
      for (const id of selectedVehIds) {
        if (next[id] != null && next[id] !== "") continue;
        const gt = flota.find((f) => String(f.id) === String(id));
        const vehLibres = cupoPlazasVehiculo(metrics[id], gt);
        let remainingForSlot =
          poolRemaining != null
            ? poolRemaining
            : Math.max(0, Number(pax) || 0);
        const def = defaultArtistaAssignPlazas({
          remaining: remainingForSlot > 0 ? remainingForSlot : Number(pax) || 0,
          vehicleLibres: vehLibres,
        });
        next[id] = def;
        changed = true;
        if (poolRemaining != null) {
          poolRemaining = Math.max(0, poolRemaining - def);
        }
      }
      return changed ? next : prev;
    });
  }, [selectedVehIds, pax, artistasCapTope, metrics, flota]);

  // Libres de toda la flota en la ventana (no solo los ya seleccionados)
  useEffect(() => {
    if (!usaTransporte || sinServicio || !fecha || flota.length === 0) {
      setMetrics({});
      setMetricsLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setMetricsLoading(true);
      const window = {
        fecha,
        hora_inicio: horaCom || null,
        hora_fin: horaFin || null,
      };
      const { byId } = await listVehiclesAvailability(
        edicion.id_gira,
        flota,
        window,
        isEdit ? evento?.id : null,
      );
      if (cancelled) return;
      setMetrics(byId || {});
      setMetricsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [
    usaTransporte,
    sinServicio,
    fecha,
    horaCom,
    horaFin,
    flota,
    edicion.id_gira,
    isEdit,
    evento?.id,
  ]);

  const flotaCapTotal = useMemo(
    () =>
      (flota || []).reduce(
        (s, gt) => s + (capacidadGiraTransporte(gt) || 0),
        0,
      ),
    [flota],
  );

  const plazasSplitParts = useMemo(
    () =>
      selectedVehIds.map((id) => Math.max(0, Number(plazasByVeh[id]) || 0)),
    [selectedVehIds, plazasByVeh],
  );

  const plazasACubrir =
    artistasCapTope != null
      ? artistasCapTope
      : Math.max(0, Number(pax) || 0);

  const toggleVeh = (id) => {
    const sid = String(id);
    setSelectedVehIds((prev) =>
      prev.includes(sid) ? prev.filter((x) => x !== sid) : [...prev, sid],
    );
  };

  const setPlazasVehiculo = (id, raw) => {
    const sid = String(id);
    setPlazasByVeh((prev) => ({ ...prev, [sid]: raw }));
    const n = Number(raw);
    if (Number.isFinite(n) && n > 0) {
      setSelectedVehIds((prev) => (prev.includes(sid) ? prev : [...prev, sid]));
    }
  };

  /** Reparte tope artista (o # PAX) entre los buses marcados; si no hay ninguno, toda la flota. */
  const repartirPlazas = () => {
    const ids =
      selectedVehIds.length > 0
        ? selectedVehIds
        : (flota || []).map((gt) => String(gt.id));
    if (ids.length === 0) return;
    if (selectedVehIds.length === 0) setSelectedVehIds(ids);
    const slots = ids.map((id) => {
      const gt = flota.find((f) => String(f.id) === String(id));
      const m = metrics[id] || {};
      return {
        id,
        libres: m.libres,
        capacidad: m.capacidad ?? capacidadGiraTransporte(gt),
      };
    });
    const split = repartirPlazasEntreVehiculos(plazasACubrir, slots);
    setPlazasByVeh((prev) => ({ ...prev, ...split }));
  };

  const toggleProp = (id) => {
    const sid = String(id);
    if (lockedPropId && sid === lockedPropId) return;
    setSelectedProps((prev) =>
      prev.includes(sid) ? prev.filter((x) => x !== sid) : [...prev, sid],
    );
  };

  const toggleGrupo = (id) => {
    const sid = String(id);
    setSelectedGrupoIds((prev) => {
      const next = prev.includes(sid) ? prev.filter((x) => x !== sid) : [...prev, sid];
      if (next.length > 0) setAudienciaOfrn("grupos");
      return next;
    });
  };

  const setAudienciaMode = (mode) => {
    setAudienciaOfrn(mode);
    if (mode !== "grupos") setSelectedGrupoIds([]);
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    if (!tipoId) {
      setError("Elegí un tipo de evento del catálogo OFRN");
      setSaving(false);
      return;
    }
    let ao = audienciaOfrn || "none";
    const idGrupos =
      ao === "grupos" ? selectedGrupoIds.map(Number).filter((n) => Number.isFinite(n)) : [];
    if (ao === "grupos" && idGrupos.length === 0) {
      setError("Seleccioná uno o más grupos OFRN de la gira");
      setSaving(false);
      return;
    }
    const vehiculos =
      !usaTransporte || sinServicio
        ? []
        : selectedVehIds.map((id) => ({
            id_gira_transporte: Number(id),
            plazas: Math.max(0, Number(plazasByVeh[id]) || 0),
          }));
    let propIds = selectedProps.map(Number).filter((n) => Number.isFinite(n));
    if (lockedPropId) {
      const lockedNum = Number(lockedPropId);
      if (Number.isFinite(lockedNum) && !propIds.includes(lockedNum)) {
        propIds = [...propIds, lockedNum];
      }
    }
    // Hard-block: Σ plazas vehículos ≤ Σ para_transporte de artistas taggeados
    if (vehiculos.length > 0 && propIds.length > 0) {
      const propsTagged = (propuestas || []).filter((p) =>
        propIds.some((id) => String(id) === String(p.id)),
      );
      const totalPl = vehiculos.reduce(
        (s, v) => s + Math.max(0, Number(v.plazas) || 0),
        0,
      );
      const capCheck = validateEventoTransportPlazasVsArtistas(
        propsTagged,
        totalPl,
      );
      if (!capCheck.ok) {
        setError(capCheck.error.message);
        setSaving(false);
        return;
      }
    }
    // Hard-block: plazas por unidad ≤ asientos del vehículo
    if (vehiculos.length > 0) {
      const capCheckSeats = validateEventoTransportPlazasVsCapacidad(
        vehiculos,
        flota,
      );
      if (!capCheckSeats.ok) {
        setError(capCheckSeats.error.message);
        setSaving(false);
        return;
      }
    }
    // Hard-block: plazas por unidad ≤ libres de ventana
    if (vehiculos.length > 0) {
      const libresCheck = validateEventoTransportPlazasVsLibres(
        vehiculos,
        metrics,
      );
      if (!libresCheck.ok) {
        setError(libresCheck.error.message);
        setSaving(false);
        return;
      }
    }
    const payload = {
      id: isEdit ? evento.id : undefined,
      id_gira: edicion.id_gira,
      fecha,
      hora_inicio: horaCom || null,
      hora_fin: horaFin || null,
      actividad,
      destino,
      vuelo,
      observaciones,
      pax: Number(pax) || 0,
      sin_servicio: usaTransporte ? sinServicio : true,
      usa_transporte: usaTransporte,
      vehiculos,
      id_propuestas: propIds,
      id_grupos: idGrupos,
      id_tipo_evento: Number(tipoId),
      audiencia_ofrn: ao,
    };
    const { error: err } = await saveFimbaEvento(payload);
    setSaving(false);
    if (err) {
      setError(err.message || "No se pudo guardar");
      return;
    }
    onSaved?.();
  };

  const title = isEdit
    ? usaTransporte || forceTransporte
      ? "Editar evento"
      : "Editar actividad"
    : forceTransporte
      ? "Nuevo traslado"
      : "Nuevo evento";

  return (
    <div className="fimba-modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="fimba-modal"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: usaTransporte ? 680 : 560 }}
      >
        <h2>{title}</h2>
        <form onSubmit={submit}>
          {!forceTransporte && (
            <div className="fimba-field">
              <label className="fimba-label">Categoría (filtro)</label>
              <select
                className="fimba-select"
                value={categoriaFiltro}
                onChange={(e) => setCategoriaFiltro(e.target.value)}
                disabled={tiposLoading}
              >
                <option value="">Todas</option>
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="fimba-field">
            <label className="fimba-label">Tipo de evento</label>
            {tiposLoading ? (
              <p className="fimba-muted" style={{ margin: 0, fontSize: "0.85rem" }}>
                Cargando catálogo OFRN…
              </p>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {tipoSeleccionado?.color && (
                  <span
                    aria-hidden
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: 3,
                      background: tipoSeleccionado.color,
                      flexShrink: 0,
                    }}
                  />
                )}
                <select
                  className="fimba-select"
                  value={tipoId || ""}
                  onChange={(e) => applyTipoChange(e.target.value)}
                  required
                  disabled={forceTransporte && tiposFiltrados.length <= 1}
                  style={{ flex: 1 }}
                >
                  {tiposFiltrados.length === 0 && (
                    <option value={tipoId || ""}>
                      {tipoSeleccionado?.nombre || `Tipo #${tipoId || "—"}`}
                    </option>
                  )}
                  {tiposFiltrados.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nombre}
                      {t.categoria_nombre ? ` · ${t.categoria_nombre}` : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {tiposError && (
              <p className="fimba-error" style={{ margin: "0.35rem 0 0", fontSize: "0.8rem" }}>
                {tiposError}
              </p>
            )}
            <p className="fimba-muted" style={{ margin: "0.25rem 0 0", fontSize: "0.72rem" }}>
              Catálogo compartido con OFRN (`tipos_evento` / `id_tipo_evento`).
            </p>
          </div>

          <div className="fimba-field">
            <label className="fimba-label">Fecha</label>
            <input
              className="fimba-input"
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              required
            />
          </div>
          <div className="fimba-grid-2">
            <div className="fimba-field">
              <label className="fimba-label">Hora com</label>
              <input
                className="fimba-input"
                type="time"
                value={horaCom}
                onChange={(e) => setHoraCom(e.target.value)}
              />
            </div>
            <div className="fimba-field">
              <label className="fimba-label">Hora fin</label>
              <input
                className="fimba-input"
                type="time"
                value={horaFin}
                onChange={(e) => setHoraFin(e.target.value)}
              />
              <p
                className="fimba-muted"
                style={{ margin: "0.25rem 0 0", fontSize: "0.72rem" }}
              >
                Si queda vacía, en Transportes se muestra (en cyan) la hora com
                de la siguiente parada del mismo vehículo.
              </p>
            </div>
          </div>
          <div className="fimba-field">
            <label className="fimba-label">Actividad</label>
            <input
              className="fimba-input"
              value={actividad}
              onChange={(e) => setActividad(e.target.value)}
              placeholder="Ej. Check-in hotel / Show noche 1"
              required
            />
          </div>
          <div className="fimba-grid-2">
            <div className="fimba-field">
              <label className="fimba-label">Destino / locación (opc.)</label>
              <input
                className="fimba-input"
                value={destino}
                onChange={(e) => setDestino(e.target.value)}
              />
            </div>
            <div className="fimba-field">
              <label className="fimba-label">Vuelo / nota (opc.)</label>
              <input
                className="fimba-input"
                value={vuelo}
                onChange={(e) => setVuelo(e.target.value)}
                placeholder="AR 1234"
              />
            </div>
          </div>
          <div className="fimba-grid-2">
            <div className="fimba-field">
              <label className="fimba-label"># PAX</label>
              <input
                className="fimba-input"
                type="number"
                min={0}
                value={pax}
                onChange={(e) => {
                  setPaxTouched(true);
                  setPax(e.target.value);
                }}
              />
              <p className="fimba-muted" style={{ margin: "0.25rem 0 0", fontSize: "0.75rem" }}>
                {usaTransporte
                  ? "Default = Σ artistas taggeados (planificada + extra equip.)"
                  : "Default = Σ artistas taggeados (cantidad planificada, hotel/comida)"}
              </p>
            </div>
            <div className="fimba-field">
              <label className="fimba-label">Observaciones</label>
              <input
                className="fimba-input"
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
              />
            </div>
          </div>

          <div className="fimba-field">
            <label className="fimba-label">Artistas (tag)</label>
            {propuestas.length === 0 ? (
              <p className="fimba-muted" style={{ margin: 0, fontSize: "0.85rem" }}>
                Sin artistas en la edición. Podés guardar igual (evento de edición).
              </p>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {propuestas.map((p) => {
                  const on = selectedProps.includes(String(p.id));
                  const locked = lockedPropId && String(p.id) === lockedPropId;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      className={`fimba-btn fimba-chip${on ? " fimba-chip-on" : ""}`}
                      onClick={() => toggleProp(p.id)}
                      disabled={locked}
                      title={locked ? "Artista de esta vista (fijo)" : undefined}
                      style={{
                        // Artist color when selected; base chip classes guarantee contrast otherwise
                        ...(on
                          ? {
                              background: p.color || "#d73289",
                              borderColor: p.color || "#d73289",
                              color: "#ffffff",
                            }
                          : {
                              borderColor: p.color || "#e2e8f0",
                            }),
                        padding: "0.35rem 0.65rem",
                        fontSize: "0.8rem",
                        opacity: locked ? 0.95 : undefined,
                        cursor: locked ? "default" : undefined,
                      }}
                    >
                      {p.nombre}
                      {locked ? " · fijo" : ""}
                    </button>
                  );
                })}
              </div>
            )}
            {lockedPropId && (
              <p className="fimba-muted" style={{ margin: "0.35rem 0 0", fontSize: "0.72rem" }}>
                Este evento queda etiquetado al artista de la ficha (tag obligatorio).
              </p>
            )}
          </div>

          <div className="fimba-field">
            <label className="fimba-label">Audiencia OFRN</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
              {[
                { value: "none", label: "Ninguna" },
                { value: "tutti", label: "Tutti" },
                { value: "grupos", label: "Grupos" },
              ].map((opt) => {
                const on = audienciaOfrn === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    className={`fimba-btn fimba-chip${on ? " fimba-chip-on" : ""}`}
                    onClick={() => setAudienciaMode(opt.value)}
                    style={{ padding: "0.35rem 0.7rem", fontSize: "0.8rem" }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
            {audienciaOfrn === "grupos" && (
              <div>
                {gruposLoading ? (
                  <p className="fimba-muted" style={{ margin: 0, fontSize: "0.85rem" }}>
                    Cargando grupos de la gira…
                  </p>
                ) : giraGrupos.length === 0 ? (
                  <p className="fimba-muted" style={{ margin: 0, fontSize: "0.85rem" }}>
                    Esta gira no tiene grupos de convocatoria. Creálos en roster OFRN
                    (Grupos) o elegí Tutti / Ninguna.
                  </p>
                ) : (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {giraGrupos.map((g) => {
                      const on = selectedGrupoIds.includes(String(g.id));
                      const color = g.color || "#6366f1";
                      return (
                        <button
                          key={g.id}
                          type="button"
                          className={`fimba-btn fimba-chip${on ? " fimba-chip-on" : ""}`}
                          onClick={() => toggleGrupo(g.id)}
                          style={{
                            background: on ? color : "#ffffff",
                            color: on ? "#ffffff" : "#222222",
                            borderColor: color,
                            padding: "0.35rem 0.65rem",
                            fontSize: "0.8rem",
                          }}
                        >
                          <span
                            aria-hidden
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: 999,
                              background: on ? "rgba(255,255,255,0.9)" : color,
                              display: "inline-block",
                            }}
                          />
                          {g.nombre}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
            <p className="fimba-muted" style={{ margin: "0.35rem 0 0", fontSize: "0.72rem" }}>
              {audienciaOfrn === "none" && "Solo FIMBA — no convoca roster OFRN."}
              {audienciaOfrn === "tutti" && "Convoca toda la gira (evento general OFRN)."}
              {audienciaOfrn === "grupos" &&
                "Persistido en eventos.audiencia_ofrn=grupos + filas eventos_grupos."}
            </p>
          </div>

          {!forceTransporte && (
            <div className="fimba-field">
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: "0.9rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={usaTransporte}
                  onChange={(e) => {
                    setUsaTransporte(e.target.checked);
                    if (!e.target.checked) {
                      setSinServicio(true);
                      setSelectedVehIds([]);
                    } else if (flota.length === 0) {
                      setSinServicio(true);
                    }
                  }}
                />
                Asignar vehículo(s) al trayecto
              </label>
              {tipoSeleccionado && actividadUsaTransporte(tipoId, tipoSeleccionado) && (
                <p className="fimba-muted" style={{ margin: "0.25rem 0 0", fontSize: "0.72rem" }}>
                  Tipo de categoría Transporte / traslado OFRN — flota disponible abajo.
                </p>
              )}
            </div>
          )}

          {usaTransporte && (
            <>
              <div className="fimba-field">
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: "0.9rem",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={sinServicio}
                    onChange={(e) => {
                      setSinServicio(e.target.checked);
                      if (e.target.checked) setSelectedVehIds([]);
                    }}
                  />
                  SIN SERVICIO (sin vehículo)
                </label>
              </div>

              {!sinServicio && (
                <div className="fimba-field">
                  <label className="fimba-label">
                    Flota — plazas por vehículo
                  </label>
                  <p
                    className="fimba-muted"
                    style={{ margin: "0 0 0.5rem", fontSize: "0.78rem" }}
                  >
                    Marcá uno o más buses y asigná <strong>n / m / p</strong> plazas
                    en cada uno (ej. organismo de 120 → 44 + 44 + 32). No hace falta
                    un solo vehículo.
                  </p>
                  {flota.length > 0 ? (
                    <div
                      style={{
                        marginBottom: 8,
                        padding: "0.45rem 0.65rem",
                        borderRadius: 8,
                        background: "rgba(0,177,235,0.07)",
                        border: "1px solid rgba(0,177,235,0.22)",
                        fontSize: "0.8rem",
                      }}
                    >
                      <strong style={{ color: "var(--fimba-cyan, #00b1eb)" }}>
                        Disponibles
                      </strong>
                      {": "}
                      {flota.length} vehículo{flota.length === 1 ? "" : "s"}
                      {flotaCapTotal > 0 ? ` · ${flotaCapTotal} plazas de flota` : ""}
                      {" · "}
                      {(flota || [])
                        .map((gt) => {
                          const cap = capacidadGiraTransporte(gt);
                          return `${labelGiraTransporte(gt)}${
                            cap != null ? ` (${cap})` : ""
                          }`;
                        })
                        .join(" · ")}
                    </div>
                  ) : null}
                  {!fecha ? (
                    <p className="fimba-muted" style={{ margin: "0 0 0.5rem", fontSize: "0.8rem" }}>
                      Indicá la fecha (y preferible hora) para ver plazas libres en la ventana.
                      La capacidad de cada unidad se muestra igual.
                    </p>
                  ) : null}
                  {flota.length === 0 ? (
                    <div className="fimba-error">
                      No hay vehículos en la gira. Agregalos en Transportes → Vehículos
                      (o en OFRN Logística).
                    </div>
                  ) : (
                    <div style={{ overflowX: "auto" }}>
                      <table className="fimba-table" style={{ fontSize: "0.82rem" }}>
                        <thead>
                          <tr>
                            <th style={{ width: 36 }} />
                            <th>Vehículo</th>
                            <th style={{ width: 72, textAlign: "right" }}>Cap.</th>
                            <th style={{ width: 80, textAlign: "right" }}>Libres</th>
                            <th style={{ width: 96, textAlign: "right" }}>Plazas</th>
                          </tr>
                        </thead>
                        <tbody>
                          {flota.map((gt) => {
                            const sid = String(gt.id);
                            const on = selectedVehIds.includes(sid);
                            const cap = capacidadGiraTransporte(gt);
                            const m = metrics[sid];
                            const nota = detalleGiraTransporte(gt);
                            const libres =
                              m?.libres != null && Number.isFinite(Number(m.libres))
                                ? Number(m.libres)
                                : null;
                            const plazasN = Math.max(
                              0,
                              Number(plazasByVeh[sid]) || 0,
                            );
                            const overCap =
                              on && cap != null && plazasN > cap;
                            const overLibres =
                              on && libres != null && plazasN > libres;
                            const rowBad = overCap || overLibres;
                            return (
                              <tr
                                key={gt.id}
                                style={{
                                  background: on
                                    ? rowBad
                                      ? "rgba(220,38,38,0.05)"
                                      : "rgba(0,177,235,0.06)"
                                    : undefined,
                                }}
                              >
                                <td>
                                  <input
                                    type="checkbox"
                                    checked={on}
                                    onChange={() => toggleVeh(gt.id)}
                                    aria-label={`Usar ${labelGiraTransporte(gt)}`}
                                  />
                                </td>
                                <td>
                                  <div style={{ fontWeight: 600 }}>
                                    {labelGiraTransporte(gt)}
                                  </div>
                                  {nota ? (
                                    <div
                                      className="fimba-muted"
                                      style={{ fontSize: "0.7rem", lineHeight: 1.3 }}
                                    >
                                      {nota}
                                    </div>
                                  ) : null}
                                  {m && !metricsLoading && fecha ? (
                                    <div
                                      className="fimba-muted"
                                      style={{ fontSize: "0.68rem" }}
                                    >
                                      {m.asignadas_fimba > 0
                                        ? `Ocupadas FIMBA: ${m.asignadas_fimba}`
                                        : "Sin FIMBA solapada"}
                                      {m.ofrn_eventos > 0
                                        ? ` · OFRN (${m.ofrn_eventos})`
                                        : ""}
                                    </div>
                                  ) : null}
                                </td>
                                <td
                                  style={{
                                    textAlign: "right",
                                    fontVariantNumeric: "tabular-nums",
                                    fontWeight: 600,
                                  }}
                                >
                                  {cap != null ? cap : "—"}
                                </td>
                                <td
                                  style={{
                                    textAlign: "right",
                                    fontVariantNumeric: "tabular-nums",
                                    color:
                                      libres === 0
                                        ? "#b45309"
                                        : overLibres
                                          ? "#dc2626"
                                          : undefined,
                                    fontWeight: overLibres ? 700 : undefined,
                                  }}
                                >
                                  {!fecha
                                    ? "—"
                                    : metricsLoading
                                      ? "…"
                                      : libres != null
                                        ? libres
                                        : cap != null
                                          ? cap
                                          : "—"}
                                </td>
                                <td style={{ textAlign: "right" }}>
                                  <input
                                    className="fimba-input"
                                    type="number"
                                    min={0}
                                    max={
                                      libres != null
                                        ? libres
                                        : cap != null
                                          ? cap
                                          : undefined
                                    }
                                    value={
                                      on || plazasByVeh[sid] != null
                                        ? (plazasByVeh[sid] ?? 0)
                                        : ""
                                    }
                                    placeholder="0"
                                    onChange={(e) =>
                                      setPlazasVehiculo(sid, e.target.value)
                                    }
                                    style={{
                                      width: 72,
                                      textAlign: "right",
                                      marginLeft: "auto",
                                      borderColor: rowBad
                                        ? "#dc2626"
                                        : undefined,
                                    }}
                                    aria-label={`Plazas en ${labelGiraTransporte(gt)}`}
                                  />
                                  {rowBad ? (
                                    <div
                                      style={{
                                        fontSize: "0.68rem",
                                        color: "#dc2626",
                                        fontWeight: 600,
                                        marginTop: 2,
                                      }}
                                    >
                                      {overCap
                                        ? `Máx. ${cap} asientos`
                                        : `Máx. ${libres} libres`}
                                    </div>
                                  ) : null}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {flota.length > 0 ? (
                    <div
                      style={{
                        marginTop: 8,
                        display: "flex",
                        flexWrap: "wrap",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <button
                        type="button"
                        className="fimba-btn fimba-btn-ghost"
                        onClick={repartirPlazas}
                        disabled={plazasACubrir <= 0}
                        title="Reparte el tope del artista (o # PAX) entre los vehículos marcados, sin superar capacidad/libres"
                      >
                        Repartir {plazasACubrir > 0 ? plazasACubrir : ""} plazas
                      </button>
                      <span className="fimba-muted" style={{ fontSize: "0.72rem" }}>
                        {artistasCapTope != null
                          ? "Usa el tope de transporte de los artistas taggeados."
                          : "# PAX como cantidad a cubrir (sin artista no hay tope duro)."}
                      </span>
                    </div>
                  ) : null}
                  {selectedVehIds.length > 0 ? (
                    <div
                      style={{
                        marginTop: 10,
                        padding: "0.55rem 0.7rem",
                        borderRadius: 8,
                        background: "rgba(215,50,137,0.06)",
                        border: "1px solid rgba(215,50,137,0.2)",
                        fontSize: "0.82rem",
                      }}
                    >
                      <strong style={{ color: "var(--fimba-deep, #8b1e5b)" }}>
                        Asignación
                      </strong>
                      {": "}
                      {plazasSplitParts.join(" + ")} = {totalPlazasAsignadas}
                      {" · "}
                      {selectedVehIds.length} vehículo
                      {selectedVehIds.length === 1 ? "" : "s"}
                      {artistasCapTope != null ? (
                        <>
                          {" · Tope artista"}
                          {selectedProps.length > 1 ? "s" : ""}: {artistasCapTope}
                          {artistasCapRemaining != null
                            ? ` · quedan ${artistasCapRemaining}`
                            : ""}
                          {totalPlazasAsignadas > artistasCapTope ? (
                            <span style={{ color: "#dc2626", fontWeight: 600 }}>
                              {" "}
                              (supera tope)
                            </span>
                          ) : null}
                        </>
                      ) : Number(pax) > 0 ? (
                        <>
                          {" · # PAX "}
                          {Number(pax) || 0}
                          {totalPlazasAsignadas !== Number(pax) ? (
                            <span className="fimba-muted">
                              {" "}
                              (distinto de # PAX; no bloquea)
                            </span>
                          ) : null}
                        </>
                      ) : (
                        <span className="fimba-muted">
                          {" "}
                          · sin artistas taggeados (no hay tope de cupo transport)
                        </span>
                      )}
                    </div>
                  ) : null}
                  <p className="fimba-muted" style={{ margin: "0.5rem 0 0", fontSize: "0.72rem" }}>
                    Capacidad = asientos de la unidad. Libres = capacidad − plazas FIMBA
                    en eventos que solapan fecha/hora (no resta el en tránsito OFRN;
                    eso se ve en la planilla Transportes). Al guardar se bloquea si
                    superás asientos, libres o el tope del artista.
                  </p>
                </div>
              )}
            </>
          )}

          {error && (
            <div className="fimba-error" style={{ marginBottom: 12 }}>
              {error}
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button type="button" className="fimba-btn fimba-btn-ghost" onClick={onClose}>
              Cancelar
            </button>
            <button
              type="submit"
              className="fimba-btn fimba-btn-primary"
              disabled={saving || tiposLoading || !tipoId}
            >
              {saving ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
