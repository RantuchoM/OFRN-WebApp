import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  IconX,
  IconUpload,
  IconDownload,
  IconUsers,
  IconTrash,
} from "../../components/ui/Icons";
import {
  actividadUsaTransporte,
  mergeFimbaAgendaCategories,
  capacidadGiraTransporte,
  computeFimbaCapacity,
  decodeFimbaTrasladoDescripcion,
  FIMBA_DEFAULT_TIPO_EVENTO,
  FIMBA_TIPO_EVENTO_TRASLADO,
  labelGiraTransporte,
  detalleGiraTransporte,
  listFimbaGiraGrupos,
  listTiposEventoForFimba,
  listVehiclesAvailability,
  saveFimbaEvento,
  validateEventoTransportPlazasVsCapacidad,
  validateEventoTransportPlazasVsLibres,
} from "../../services/fimbaService";
import { eventGrupoIdsFromEvent } from "../../services/giraGruposService";
import { uploadEventoInternasImage } from "../../services/eventosInternasService";
import {
  summarizeOfrnStopRules,
  boardingMetricsForEventRow,
  isVehiclePauseBetweenStops,
  TRANSPORT_DESTINO_SIN_SIGUIENTE,
  TRANSPORT_DESTINO_SIN_LOCACION,
  formatEventLocation,
  formatNextStopDestino,
} from "../../utils/fimbaTransportBoarding";
import {
  buildDestinoStopSchedule,
  createDestinoStopEvent,
  inheritStopTagsFromEvent,
} from "../../utils/fimbaDestinoStopCreate";
import LocationSelectWithCreate from "../../components/forms/LocationSelectWithCreate";
import {
  isEventosInternasEmpty,
  normalizeEventosInternasHtml,
  sanitizeEventosInternasHtml,
} from "../../utils/eventosInternas";
import { supabase } from "../../services/supabase";
import { useFimbaAccess } from "../../context/FimbaAccessContext";
import StopRulesManager from "../Giras/StopRulesManager";
import FimbaEventDetalleEditor, {
  isFimbaDetalleEmpty,
} from "./FimbaEventDetalleField";
import FimbaEventoArtistasBoardingTable from "./FimbaEventoArtistasBoardingTable";
import FimbaRichTextEditor from "./FimbaRichTextEditor";
import { sortFimbaPropuestasByNombre } from "../../utils/fimbaAgendaSort";
import {
  clearUnsavedWork,
  markUnsavedWork,
} from "../../utils/unsavedWork";

/** Dirty-compare: HTML vacío (`<br>`, etc.) ≡ string vacío. */
function detalleDirtyKey(html) {
  return isFimbaDetalleEmpty(html) ? "" : String(html || "");
}

function internasDirtyKey(html) {
  return isEventosInternasEmpty(html) ? "" : String(html || "");
}

function sliceTime(t) {
  if (!t) return "";
  const s = String(t).slice(0, 5);
  return s === "—" ? "" : s;
}

function initialIdLocacion(evento) {
  const raw = evento?.id_locacion ?? evento?.locaciones?.id ?? null;
  if (raw == null || raw === "") return "";
  return String(raw);
}

/** Solo la línea `Destino:` de descripcion (sin fallback a locación catálogo). */
function legacyDestinoFromEvento(evento) {
  if (!evento) return "";
  const decoded = decodeFimbaTrasladoDescripcion(evento.descripcion, {
    observaciones_equipaje: evento.observaciones_equipaje,
  });
  return decoded.destino || "";
}

const LEGACY_DESTINO_BOX_STYLE = {
  marginTop: "0.5rem",
  padding: "0.65rem 0.75rem",
  borderRadius: 8,
  border: "1px solid #e2e8f0",
  background: "#f1f5f9",
};

/**
 * Ordena la flota por mejor ajuste a `need` plazas (capacidad total).
 * Fits (cap ≥ need): leftover asc, luego cap asc. No-fits: cap desc.
 * Si need ≤ 0, conserva el orden recibido.
 */
function sortFlotaByBestFit(flota, need) {
  const list = [...(flota || [])];
  const n = Number(need);
  if (!Number.isFinite(n) || n <= 0) return list;

  const capOf = (gt) => {
    const c = capacidadGiraTransporte(gt);
    return c != null && Number.isFinite(Number(c)) ? Number(c) : null;
  };

  return list.sort((a, b) => {
    const ca = capOf(a);
    const cb = capOf(b);
    const fitA = ca != null && ca >= n;
    const fitB = cb != null && cb >= n;
    if (fitA !== fitB) return fitA ? -1 : 1;
    if (fitA) {
      const leftoverDiff = ca - n - (cb - n);
      if (leftoverDiff !== 0) return leftoverDiff;
      if (ca !== cb) return ca - cb;
    } else {
      if (ca == null && cb != null) return 1;
      if (cb == null && ca != null) return -1;
      if (ca != null && cb != null && ca !== cb) return cb - ca;
    }
    return String(a.id).localeCompare(String(b.id), undefined, { numeric: true });
  });
}

function sortedIdsKey(ids) {
  return [...(ids || [])].map(String).sort().join("\0");
}

function plazasSnapshot(plazasByVeh, selectedVehIds) {
  return [...(selectedVehIds || [])]
    .map(String)
    .sort()
    .map((id) => `${id}:${Math.max(0, Number(plazasByVeh?.[id]) || 0)}`)
    .join("|");
}

/** Default asientos equipaje = Σ plazas_extra_materiales de artistas taggeados. */
function equipajeDefaultFromArtistas(propuestas, selectedIds) {
  const props = (propuestas || []).filter((p) =>
    (selectedIds || []).some((id) => String(id) === String(p.id)),
  );
  if (props.length === 0) return 0;
  return props.reduce(
    (s, p) => s + Math.max(0, Number(p.plazas_extra_materiales) || 0),
    0,
  );
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
 * Sección Orquesta OFRN en el editor de evento de transporte.
 * Abre StopRulesManager embebido (mismas reglas `giras_logistica_rutas`).
 */
function FimbaEventoOfrnBoardingSection({
  isEdit,
  sinServicio,
  evento,
  edicion,
  selectedVehIds = [],
  flota = [],
  ofrnPassengers = [],
  ofrnAdmissionRules = [],
  ofrnRegions = [],
  ofrnLocalities = [],
  ofrnRouteRules = [],
  sequencesByVehicle = null,
  ofrnBoardPanel,
  setOfrnBoardPanel,
  ofrnBoardVehicleId,
  setOfrnBoardVehicleId,
  onBoardingRefresh,
}) {
  const giraId = edicion?.id_gira;
  const vehiculos = useMemo(
    () =>
      (flota || []).filter((v) =>
        (selectedVehIds || []).some((id) => String(id) === String(v.id)),
      ),
    [flota, selectedVehIds],
  );

  useEffect(() => {
    if (!selectedVehIds?.length) {
      setOfrnBoardVehicleId("");
      return;
    }
    if (
      !ofrnBoardVehicleId ||
      !selectedVehIds.some((id) => String(id) === String(ofrnBoardVehicleId))
    ) {
      setOfrnBoardVehicleId(String(selectedVehIds[0]));
    }
  }, [selectedVehIds, ofrnBoardVehicleId, setOfrnBoardVehicleId]);

  const canManage =
    Boolean(isEdit && !sinServicio && selectedVehIds.length > 0 && giraId != null);

  const upSummary = useMemo(
    () =>
      summarizeOfrnStopRules({
        eventId: evento?.id,
        type: "up",
        transportId: ofrnBoardVehicleId || selectedVehIds[0],
        routeRules: ofrnRouteRules,
        passengers: ofrnPassengers,
        localities: ofrnLocalities,
        regions: ofrnRegions,
      }),
    [
      evento?.id,
      ofrnBoardVehicleId,
      selectedVehIds,
      ofrnRouteRules,
      ofrnPassengers,
      ofrnLocalities,
      ofrnRegions,
    ],
  );

  const downSummary = useMemo(
    () =>
      summarizeOfrnStopRules({
        eventId: evento?.id,
        type: "down",
        transportId: ofrnBoardVehicleId || selectedVehIds[0],
        routeRules: ofrnRouteRules,
        passengers: ofrnPassengers,
        localities: ofrnLocalities,
        regions: ofrnRegions,
      }),
    [
      evento?.id,
      ofrnBoardVehicleId,
      selectedVehIds,
      ofrnRouteRules,
      ofrnPassengers,
      ofrnLocalities,
      ofrnRegions,
    ],
  );

  const openPanel = (type) => {
    if (!canManage) return;
    setOfrnBoardPanel((prev) => (prev === type ? null : type));
  };

  return (
    <div
      className="fimba-field"
      style={{
        marginTop: 12,
        padding: "0.75rem 0.85rem",
        borderRadius: 10,
        border: "1px solid #e2e8f0",
        background: "#f8fafc",
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          marginBottom: 6,
        }}
      >
        <label
          className="fimba-label"
          style={{ margin: 0, display: "flex", alignItems: "center", gap: 6 }}
        >
          <IconUsers size={14} /> Orquesta OFRN
        </label>
        {vehiculos.length > 1 ? (
          <select
            className="fimba-input"
            style={{
              width: "auto",
              minWidth: 140,
              fontSize: "0.78rem",
              padding: "0.25rem 0.4rem",
            }}
            value={ofrnBoardVehicleId}
            onChange={(e) => setOfrnBoardVehicleId(e.target.value)}
            disabled={!canManage}
          >
            {vehiculos.map((v) => (
              <option key={v.id} value={String(v.id)}>
                {labelGiraTransporte(v)}
              </option>
            ))}
          </select>
        ) : null}
      </div>
      <p className="fimba-muted" style={{ margin: "0 0 0.55rem", fontSize: "0.75rem" }}>
        Subí o bajá integrantes de la gira en este vehículo (mismas reglas que
        Logística OFRN: persona, categoría, localidad, región).
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
        <button
          type="button"
          className={`fimba-btn${ofrnBoardPanel === "up" ? "" : " fimba-btn-ghost"}`}
          style={
            ofrnBoardPanel === "up"
              ? { background: "#059669", borderColor: "#059669", color: "#fff" }
              : undefined
          }
          disabled={!canManage}
          title={
            !isEdit
              ? "Guardá el evento para gestionar orquesta"
              : !canManage
                ? "Elegí un vehículo de la flota"
                : "Gestionar subidas de orquesta"
          }
          onClick={() => openPanel("up")}
        >
          <IconUpload size={14} className="inline mr-1" /> Subir orquesta
        </button>
        <button
          type="button"
          className={`fimba-btn${ofrnBoardPanel === "down" ? "" : " fimba-btn-ghost"}`}
          style={
            ofrnBoardPanel === "down"
              ? { background: "#e11d48", borderColor: "#e11d48", color: "#fff" }
              : undefined
          }
          disabled={!canManage}
          title={
            !isEdit
              ? "Guardá el evento para gestionar orquesta"
              : !canManage
                ? "Elegí un vehículo de la flota"
                : "Gestionar bajadas de orquesta"
          }
          onClick={() => openPanel("down")}
        >
          <IconDownload size={14} className="inline mr-1" /> Bajar orquesta
        </button>
      </div>
      {(upSummary.length > 0 || downSummary.length > 0) && !ofrnBoardPanel ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 4,
            fontSize: "0.72rem",
            color: "#475569",
          }}
        >
          {upSummary.length > 0 ? (
            <div>
              <span style={{ fontWeight: 700, color: "#166534" }}>Suben: </span>
              {upSummary.map((s) => `${s.label} ${s.plazas}`).join(" · ")}
            </div>
          ) : null}
          {downSummary.length > 0 ? (
            <div>
              <span style={{ fontWeight: 700, color: "#9f1239" }}>Bajan: </span>
              {downSummary.map((s) => `${s.label} ${s.plazas}`).join(" · ")}
            </div>
          ) : null}
        </div>
      ) : null}
      {!canManage && giraId == null ? (
        <p className="fimba-muted" style={{ margin: 0, fontSize: "0.72rem" }}>
          Esta edición no tiene gira OFRN vinculada.
        </p>
      ) : null}
      {ofrnBoardPanel && canManage && ofrnBoardVehicleId ? (
        <div style={{ marginTop: 10 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 6,
            }}
          >
            <span
              style={{
                fontSize: "0.8rem",
                fontWeight: 700,
                color: ofrnBoardPanel === "up" ? "#166534" : "#9f1239",
              }}
            >
              {ofrnBoardPanel === "up"
                ? "Reglas de subida · Orquesta"
                : "Reglas de bajada · Orquesta"}
            </span>
            <button
              type="button"
              className="fimba-btn fimba-btn-ghost"
              style={{ padding: "0.2rem 0.45rem", fontSize: "0.72rem" }}
              onClick={() => setOfrnBoardPanel(null)}
            >
              Cerrar panel
            </button>
          </div>
          <StopRulesManager
            isOpen
            embedded
            onClose={() => setOfrnBoardPanel(null)}
            event={evento}
            type={ofrnBoardPanel}
            transportId={Number(ofrnBoardVehicleId)}
            supabase={supabase}
            giraId={Number(giraId)}
            regions={ofrnRegions}
            localities={ofrnLocalities}
            passengers={ofrnPassengers}
            admissionRules={ofrnAdmissionRules}
            sortedEvents={
              (sequencesByVehicle?.get?.(Number(ofrnBoardVehicleId)) ||
                sequencesByVehicle?.get?.(String(ofrnBoardVehicleId)))
                ?.sortedEvents || []
            }
            onRefresh={() => {
              onBoardingRefresh?.("ofrn");
            }}
          />
        </div>
      ) : null}
    </div>
  );
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
  /** Resumen logístico OFRN ya cargado (Transportes); evita re-fetch en cada cambio de hora. */
  logisticsSummary = null,
  /** Rutas FIMBA explícitas ya cargadas. */
  propuestaRoutes = null,
  /** Datos OFRN opcionales para embeber StopRules (Orquesta). */
  ofrnPassengers = [],
  ofrnAdmissionRules = [],
  ofrnRegions = [],
  ofrnLocalities = [],
  ofrnRouteRules = [],
  sequencesByVehicle = null,
  onClose,
  onSaved,
  /** Refresh de planilla tras mutar boarding embebido. */
  onBoardingRefresh = null,
  /** Tras crear parada destino inline: abrir editor del evento nuevo. */
  onOpenEventoEdit = null,
  /** Al abrir desde celda Artistas: scroll a tags artistas / audiencia OFRN. */
  focusTags = false,
}) {
  const isEdit = mode === "edit";
  const { canEditPropuestaMeta, readOnly } = useFimbaAccess();
  const canEditObservacionesInternas = Boolean(canEditPropuestaMeta);
  const lockedPropId =
    lockPropuesta != null && lockPropuesta !== "" ? String(lockPropuesta) : null;

  const draftInternasKeyRef = useRef(
    `draft-${
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
    }`,
  );
  const tagsSectionRef = useRef(null);
  const internasStorageKey =
    isEdit && evento?.id != null && evento.id !== ""
      ? evento.id
      : draftInternasKeyRef.current;

  const uploadInternasImage = useCallback(
    (file) =>
      uploadEventoInternasImage({
        eventoId: internasStorageKey,
        file,
      }),
    [internasStorageKey],
  );

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
  const [catalogCategorias, setCatalogCategorias] = useState([]);
  const [tiposLoading, setTiposLoading] = useState(true);
  const [tiposError, setTiposError] = useState(null);
  const [categoriaFiltro, setCategoriaFiltro] = useState("");
  const [tipoId, setTipoId] = useState(initialTipo);
  const [usaTransporte, setUsaTransporte] = useState(
    () =>
      forceTransporte ||
      actividadUsaTransporte(initialTipo, evento?.tipos_evento) ||
      (isEdit &&
        ((evento?.vehiculos || []).length > 0 ||
          Boolean(evento?.sin_servicio && evento?.es_traslado))),
  );
  const [fecha, setFecha] = useState(evento?.fecha || "");
  const [horaCom, setHoraCom] = useState(sliceTime(evento?.hora_inicio));
  const [horaFin, setHoraFin] = useState(sliceTime(evento?.hora_fin));
  const [actividad, setActividad] = useState(evento?.actividad || "");
  const [destino, setDestino] = useState(() => legacyDestinoFromEvento(evento));
  const [idLocacion, setIdLocacion] = useState(() => initialIdLocacion(evento));
  const [vuelo, setVuelo] = useState(evento?.vuelo || "");
  const [observacionesEquipaje, setObservacionesEquipaje] = useState(
    () =>
      evento?.observaciones_equipaje ||
      evento?.observaciones ||
      "",
  );
  const [observacionesInternas, setObservacionesInternas] = useState(
    () => evento?.observaciones_internas || "",
  );
  const [observacionesAforo, setObservacionesAforo] = useState(
    () => evento?.observaciones_aforo || "",
  );
  const [asientosEquipaje, setAsientosEquipaje] = useState(() =>
    isEdit
      ? Math.max(
          0,
          Number(
            evento?.asientos_equipaje != null && evento.asientos_equipaje !== ""
              ? evento.asientos_equipaje
              : evento?.pax,
          ) || 0,
        )
      : 0,
  );
  /** Valor guardado > 0 o edición manual: no pisar con el default de artistas. */
  const [equipajeTouched, setEquipajeTouched] = useState(
    () =>
      isEdit &&
      Math.max(
        0,
        Number(
          evento?.asientos_equipaje != null && evento.asientos_equipaje !== ""
            ? evento.asientos_equipaje
            : evento?.pax,
        ) || 0,
      ) > 0,
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
  /** Reserva técnica editada a mano (dirty tracking del input). */
  const plazasTouchedRef = useRef(new Set());
  const [selectedProps, setSelectedProps] = useState(defaultProps);
  const [tagFilter, setTagFilter] = useState("");
  const [audienciaOfrn, setAudienciaOfrn] = useState(() => initialAudienciaOfrn(evento));
  const [giraGrupos, setGiraGrupos] = useState([]);
  const [gruposLoading, setGruposLoading] = useState(false);
  const [selectedGrupoIds, setSelectedGrupoIds] = useState(defaultGrupoIds);
  const [metrics, setMetrics] = useState({});
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  /** Panel StopRules OFRN embebido: null | 'up' | 'down'. */
  const [ofrnBoardPanel, setOfrnBoardPanel] = useState(null);
  const [ofrnBoardVehicleId, setOfrnBoardVehicleId] = useState(() =>
    draftVehIds.length ? String(draftVehIds[0]) : "",
  );

  /** Snapshot al abrir: dirty = borrador del formulario vs este baseline. */
  const initialForm = useMemo(() => {
    const initEq = isEdit
      ? Math.max(
          0,
          Number(
            evento?.asientos_equipaje != null && evento.asientos_equipaje !== ""
              ? evento.asientos_equipaje
              : evento?.pax,
          ) || 0,
        )
      : 0;
    let initSin;
    if (isEdit) {
      initSin =
        Boolean(evento?.sin_servicio) ||
        ((evento?.vehiculos || []).length === 0 &&
          (evento?.id_gira_transporte == null ||
            evento.id_gira_transporte === ""));
    } else if (draftVehIds.length > 0) {
      initSin = false;
    } else if (evento?.sin_servicio != null) {
      initSin = Boolean(evento.sin_servicio);
    } else {
      initSin = flota.length === 0;
    }
    const plazasMap = {};
    for (const r of evento?.vehiculos || []) {
      if (r?.id_gira_transporte == null) continue;
      plazasMap[String(r.id_gira_transporte)] = Number(r.plazas) || 0;
    }
    if (
      Object.keys(plazasMap).length === 0 &&
      evento?.id_gira_transporte != null &&
      evento.id_gira_transporte !== ""
    ) {
      plazasMap[String(evento.id_gira_transporte)] = 0;
    }
    return {
      tipoId: Number(initialTipo) || 0,
      fecha: evento?.fecha || "",
      horaCom: sliceTime(evento?.hora_inicio),
      horaFin: sliceTime(evento?.hora_fin),
      actividad: detalleDirtyKey(evento?.actividad || ""),
      destino: legacyDestinoFromEvento(evento),
      idLocacion: initialIdLocacion(evento),
      vuelo: evento?.vuelo || "",
      observacionesEquipaje:
        evento?.observaciones_equipaje || evento?.observaciones || "",
      observacionesInternas: internasDirtyKey(
        evento?.observaciones_internas || "",
      ),
      observacionesAforo: String(evento?.observaciones_aforo || "").trim(),
      asientosEquipaje: initEq,
      sinServicio: initSin,
      selectedVehIdsKey: sortedIdsKey(draftVehIds),
      plazasKey: plazasSnapshot(plazasMap, draftVehIds),
      selectedPropsKey: sortedIdsKey(defaultProps),
      audienciaOfrn: initialAudienciaOfrn(evento),
      selectedGrupoIdsKey: sortedIdsKey(defaultGrupoIds),
      usaTransporte:
        forceTransporte ||
        actividadUsaTransporte(initialTipo, evento?.tipos_evento) ||
        (isEdit &&
          ((evento?.vehiculos || []).length > 0 ||
            Boolean(evento?.sin_servicio && evento?.es_traslado))),
    };
    // Solo al montar el modal (props de apertura).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isDirty = useMemo(() => {
    if (Number(tipoId) !== Number(initialForm.tipoId)) return true;
    if ((fecha || "") !== (initialForm.fecha || "")) return true;
    if ((horaCom || "") !== (initialForm.horaCom || "")) return true;
    if (
      !usaTransporte &&
      (horaFin || "") !== (initialForm.horaFin || "")
    ) {
      return true;
    }
    if (detalleDirtyKey(actividad) !== (initialForm.actividad || "")) {
      return true;
    }
    if ((destino || "") !== (initialForm.destino || "")) return true;
    if ((idLocacion || "") !== (initialForm.idLocacion || "")) return true;
    if ((vuelo || "") !== (initialForm.vuelo || "")) return true;
    if (
      String(observacionesEquipaje || "").trim() !==
      String(initialForm.observacionesEquipaje || "").trim()
    ) {
      return true;
    }
    if (
      canEditObservacionesInternas &&
      internasDirtyKey(observacionesInternas) !==
        (initialForm.observacionesInternas || "")
    ) {
      return true;
    }
    if (
      Number(tipoId) === 1 &&
      String(observacionesAforo || "").trim() !==
        String(initialForm.observacionesAforo || "").trim()
    ) {
      return true;
    }
    // Default auto de equipaje (sin touch) no cuenta como dirty.
    if (
      equipajeTouched &&
      (Number(asientosEquipaje) || 0) !==
        (Number(initialForm.asientosEquipaje) || 0)
    ) {
      return true;
    }
    if (Boolean(sinServicio) !== Boolean(initialForm.sinServicio)) return true;
    if (Boolean(usaTransporte) !== Boolean(initialForm.usaTransporte)) {
      return true;
    }
    if (sortedIdsKey(selectedVehIds) !== initialForm.selectedVehIdsKey) {
      return true;
    }
    if (plazasSnapshot(plazasByVeh, selectedVehIds) !== initialForm.plazasKey) {
      return true;
    }
    if (sortedIdsKey(selectedProps) !== initialForm.selectedPropsKey) {
      return true;
    }
    if ((audienciaOfrn || "none") !== (initialForm.audienciaOfrn || "none")) {
      return true;
    }
    if (sortedIdsKey(selectedGrupoIds) !== initialForm.selectedGrupoIdsKey) {
      return true;
    }
    return false;
  }, [
    initialForm,
    tipoId,
    fecha,
    horaCom,
    horaFin,
    actividad,
    destino,
    idLocacion,
    vuelo,
    observacionesEquipaje,
    observacionesInternas,
    observacionesAforo,
    canEditObservacionesInternas,
    equipajeTouched,
    asientosEquipaje,
    sinServicio,
    usaTransporte,
    selectedVehIds,
    plazasByVeh,
    selectedProps,
    audienciaOfrn,
    selectedGrupoIds,
  ]);

  const requestClose = useCallback(() => {
    if (isDirty) {
      const ok = window.confirm(
        "Hay cambios sin guardar. ¿Descartar cambios?",
      );
      if (!ok) return;
    }
    onClose?.();
  }, [isDirty, onClose]);

  /** Evita que un deploy PWA recargue mientras hay edición dirty en el modal. */
  useEffect(() => {
    const token = "fimba-evento-form";
    if (isDirty) markUnsavedWork(token);
    else clearUnsavedWork(token);
    return () => clearUnsavedWork(token);
  }, [isDirty]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopPropagation();
      requestClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [requestClose]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setTiposLoading(true);
      const { tipos: list, categorias: cats, error: err } = await listTiposEventoForFimba();
      if (cancelled) return;
      if (err) {
        setTiposError(err.message || "No se pudo cargar tipos de evento");
        setTipos(list || []);
        setCatalogCategorias(cats || []);
      } else {
        setTipos(list || []);
        setCatalogCategorias(cats || []);
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

  // Default asientos equipaje = Σ plazas_extra de artistas. En edit, solo si guardado es 0.
  useEffect(() => {
    if (equipajeTouched) return;
    setAsientosEquipaje(equipajeDefaultFromArtistas(propuestas, selectedProps));
  }, [selectedProps, propuestas, equipajeTouched]);

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

  const categorias = useMemo(
    () =>
      mergeFimbaAgendaCategories({
        dbCategorias: catalogCategorias,
        catalogTipos: tipos,
      }),
    [catalogCategorias, tipos],
  );

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

  const transportDestinoMetrics = useMemo(() => {
    if (!usaTransporte || !isEdit || !evento?.id || !sequencesByVehicle) {
      return null;
    }
    return boardingMetricsForEventRow(evento, sequencesByVehicle, null);
  }, [usaTransporte, isEdit, evento, sequencesByVehicle]);

  const transportDestinoLabel = useMemo(() => {
    if (!transportDestinoMetrics) return TRANSPORT_DESTINO_SIN_SIGUIENTE;
    const label = transportDestinoMetrics.destino_siguiente;
    if (label != null && label !== "—") return label;
    return TRANSPORT_DESTINO_SIN_SIGUIENTE;
  }, [transportDestinoMetrics]);

  /** Vehículo del form (o del evento) — no depender solo de metrics.primary. */
  const transportDestinoVehicleId = useMemo(() => {
    if (!sinServicio) {
      const fromForm = selectedVehIds
        .map((id) => Number(id))
        .find((n) => Number.isFinite(n));
      if (fromForm != null) return fromForm;
    }
    const fromMetrics =
      transportDestinoMetrics?.primary?.id_gira_transporte ??
      transportDestinoMetrics?.perVehicle?.[0]?.id_gira_transporte ??
      null;
    if (fromMetrics != null && fromMetrics !== "") return Number(fromMetrics);
    for (const r of evento?.vehiculos || []) {
      const n = Number(r?.id_gira_transporte);
      if (Number.isFinite(n)) return n;
    }
    if (evento?.id_gira_transporte != null && evento.id_gira_transporte !== "") {
      const n = Number(evento.id_gira_transporte);
      if (Number.isFinite(n)) return n;
    }
    return null;
  }, [
    sinServicio,
    selectedVehIds,
    transportDestinoMetrics,
    evento,
  ]);

  const destinoActionBlockedReason = useMemo(() => {
    if (!usaTransporte) return null;
    if (!isEdit || evento?.id == null || evento.id === "") {
      return "Guardá el evento para crear la siguiente parada.";
    }
    if (sinServicio || transportDestinoVehicleId == null) {
      return "Asigná un vehículo (desmarcá SIN SERVICIO) para crear la siguiente parada.";
    }
    return null;
  }, [
    usaTransporte,
    isEdit,
    evento,
    sinServicio,
    transportDestinoVehicleId,
  ]);

  const transportNextEvent =
    transportDestinoMetrics?.next_event_raw ||
    transportDestinoMetrics?.next_event ||
    null;
  const transportPauseAfter = Boolean(
    usaTransporte &&
      isEdit &&
      isVehiclePauseBetweenStops(evento, transportNextEvent),
  );

  const destinoStopSchedule = useMemo(() => {
    if (!usaTransporte || !isEdit || !evento) return null;
    return buildDestinoStopSchedule(evento, transportNextEvent, horaFin || null);
  }, [usaTransporte, isEdit, evento, transportNextEvent, horaFin]);

  const canQuickCreateDestinoStop = Boolean(
    usaTransporte &&
      isEdit &&
      !readOnly &&
      evento?.id != null &&
      evento.id !== "" &&
      transportDestinoVehicleId != null &&
      !sinServicio,
  );

  const [quickCreateHora, setQuickCreateHora] = useState("");
  const [quickCreateLocacion, setQuickCreateLocacion] = useState("");
  const [quickCreateSaving, setQuickCreateSaving] = useState(false);
  const [quickCreateError, setQuickCreateError] = useState(null);
  const [quickCreateSuccessId, setQuickCreateSuccessId] = useState(null);
  const [locationsList, setLocationsList] = useState([]);

  const refreshLocations = useCallback(async () => {
    const { data, error: err } = await supabase
      .from("locaciones")
      .select("id, nombre, direccion, localidades(localidad)")
      .order("nombre");
    if (err) {
      console.error(err);
      return;
    }
    setLocationsList(
      (data || []).map((l) => ({
        id: l.id,
        nombre: l.nombre,
        direccion: l.direccion,
        ciudad: l.localidades?.localidad || "Sin ciudad",
      })),
    );
  }, []);

  useEffect(() => {
    refreshLocations();
  }, [refreshLocations]);

  useEffect(() => {
    setQuickCreateSuccessId(null);
    setQuickCreateError(null);
    setQuickCreateLocacion("");
  }, [evento?.id]);

  useEffect(() => {
    if (quickCreateSuccessId) return;
    if (destinoStopSchedule?.hora_inicio) {
      setQuickCreateHora(String(destinoStopSchedule.hora_inicio).slice(0, 5));
    }
  }, [destinoStopSchedule?.hora_inicio, quickCreateSuccessId]);

  const locationOptions = useMemo(
    () =>
      locationsList.map((l) => ({
        id: l.id,
        label: l.ciudad ? `${l.nombre} (${l.ciudad})` : l.nombre,
      })),
    [locationsList],
  );

  const locacionDisplayLabel = useMemo(() => {
    if (idLocacion && locationOptions.length) {
      const opt = locationOptions.find((o) => String(o.id) === String(idLocacion));
      if (opt?.label) return opt.label;
    }
    const fromEvent = formatEventLocation(evento);
    return fromEvent !== "—" ? fromEvent : "—";
  }, [idLocacion, locationOptions, evento]);

  const legacyDestinoText = useMemo(
    () => String(destino || "").trim(),
    [destino],
  );

  const clearLegacyDestino = useCallback(() => {
    setDestino("");
  }, []);

  const showLegacyDestinoBox = Boolean(legacyDestinoText);

  const submitQuickCreateDestinoStop = async () => {
    if (!canQuickCreateDestinoStop || quickCreateSaving) return;
    if (!String(quickCreateHora || "").trim()) {
      setQuickCreateError("Indicá la hora de la nueva parada");
      return;
    }
    setQuickCreateError(null);
    setQuickCreateSaving(true);

    const tags = inheritStopTagsFromEvent(evento);
    const { evento: created, error: err } = await createDestinoStopEvent({
      currentEv: evento,
      vehicleId: transportDestinoVehicleId,
      nextEv: transportNextEvent,
      fecha: destinoStopSchedule?.fecha || fecha || evento?.fecha || "",
      horaInicio: quickCreateHora,
      idLocacion: quickCreateLocacion,
      actividad: "Parada intermedia",
      idGira: edicion?.id_gira,
      vehiculos: flota,
      ...tags,
    });

    setQuickCreateSaving(false);
    if (err) {
      setQuickCreateError(err.message || "No se pudo crear la parada");
      return;
    }

    setQuickCreateSuccessId(created?.id ?? null);
    setHoraFin(String(quickCreateHora || "").slice(0, 5));
    onBoardingRefresh?.("eventos");
  };

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

  /** Chip cloud no-transporte: orden alfabético + filtro por nombre. */
  const filteredPropuestasChips = useMemo(() => {
    const sorted = sortFimbaPropuestasByNombre(propuestas);
    const q = tagFilter.trim().toLocaleLowerCase("es");
    if (!q) return sorted;
    return sorted.filter((p) =>
      String(p.nombre || "").toLocaleLowerCase("es").includes(q),
    );
  }, [propuestas, tagFilter]);

  const totalPlazasAsignadas = useMemo(
    () =>
      selectedVehIds.reduce(
        (s, id) => s + Math.max(0, Number(plazasByVeh[id]) || 0),
        0,
      ),
    [selectedVehIds, plazasByVeh],
  );

  /** Sube nombrados en este evento (cualquier vehículo del form). */
  const hasNamedSubeOnEvent = useMemo(() => {
    if (!isEdit || evento?.id == null) return false;
    const eid = String(evento.id);
    return (propuestaRoutes || []).some((r) => {
      if (r?.id_evento_subida == null) return false;
      if (String(r.id_evento_subida) !== eid) return false;
      return Math.max(0, Number(r.plazas) || 0) > 0;
    });
  }, [isEdit, evento?.id, propuestaRoutes]);

  const warnAnonymousReservaWithoutSube =
    !sinServicio &&
    selectedProps.length > 0 &&
    selectedVehIds.length > 0 &&
    totalPlazasAsignadas > 0 &&
    !hasNamedSubeOnEvent;

  const warnArtistasNeedSube =
    !sinServicio &&
    selectedProps.length > 0 &&
    selectedVehIds.length > 0 &&
    totalPlazasAsignadas === 0 &&
    !hasNamedSubeOnEvent;

  useEffect(() => {
    if (!focusTags) return undefined;
    const t = setTimeout(() => {
      tagsSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 80);
    return () => clearTimeout(t);
  }, [focusTags]);

  // Libres de toda la flota en la ventana (OFRN a bordo + FIMBA a bordo).
  // Debounce horas: no disparar availability en cada tecla.
  useEffect(() => {
    if (!usaTransporte || sinServicio || !fecha || flota.length === 0) {
      setMetrics({});
      setMetricsLoading(false);
      return undefined;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      setMetricsLoading(true);
      const window = {
        fecha,
        hora_inicio: horaCom || null,
        hora_fin: usaTransporte
          ? transportPauseAfter
            ? null
            : sliceTime(transportNextEvent?.hora_inicio) || null
          : horaFin || null,
      };
      const { byId } = await listVehiclesAvailability(
        edicion.id_gira,
        flota,
        window,
        isEdit ? evento?.id : null,
        {
          logisticsSummary:
            logisticsSummary != null ? logisticsSummary : undefined,
          propuestaRoutes:
            propuestaRoutes != null ? propuestaRoutes : undefined,
        },
      );
      if (cancelled) return;
      if (transportPauseAfter) {
        const pauseVehicleIds = new Set(
          [
            transportDestinoVehicleId,
            ...(evento?.vehiculos || []).map((r) =>
              Number(r?.id_gira_transporte),
            ),
            evento?.id_gira_transporte != null
              ? Number(evento.id_gira_transporte)
              : null,
          ].filter(Number.isFinite),
        );
        const patched = { ...(byId || {}) };
        pauseVehicleIds.forEach((tid) => {
          const sid = String(tid);
          const current = patched[sid];
          if (!current) return;
          patched[sid] = {
            ...current,
            ocupadas_ofrn: 0,
            asignadas_fimba: 0,
            libres: current.capacidad,
            ofrn_eventos: 0,
            note:
              "Pausa: el siguiente evento del mismo vehículo repite la locación, así que esta franja cuenta como 100% libre.",
          };
        });
        setMetrics(patched);
      } else {
        setMetrics(byId || {});
      }
      setMetricsLoading(false);
    }, 280);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [
    usaTransporte,
    sinServicio,
    fecha,
    horaCom,
    horaFin,
    transportNextEvent?.hora_inicio,
    transportPauseAfter,
    transportDestinoVehicleId,
    evento?.vehiculos,
    evento?.id_gira_transporte,
    flota,
    edicion.id_gira,
    isEdit,
    evento?.id,
    logisticsSummary,
    propuestaRoutes,
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

  const plazasACubrir = artistasCapTope != null ? artistasCapTope : 0;

  /** Flota ordenada: mejor ajuste a plazasACubrir (mismo need que Repartir). */
  const flotaOrdenada = useMemo(
    () => sortFlotaByBestFit(flota, plazasACubrir),
    [flota, plazasACubrir],
  );

  const toggleVeh = (id) => {
    const sid = String(id);
    setSelectedVehIds((prev) =>
      prev.includes(sid) ? prev.filter((x) => x !== sid) : [...prev, sid],
    );
  };

  const setPlazasVehiculo = (id, raw) => {
    const sid = String(id);
    plazasTouchedRef.current.add(sid);
    setPlazasByVeh((prev) => ({ ...prev, [sid]: raw }));
    const n = Number(raw);
    if (Number.isFinite(n) && n > 0) {
      setSelectedVehIds((prev) => (prev.includes(sid) ? prev : [...prev, sid]));
    }
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
    e?.preventDefault?.();
    setSaving(true);
    setError(null);
    if (!tipoId) {
      setError("Elegí un tipo de evento del catálogo OFRN");
      setSaving(false);
      return;
    }
    if (isFimbaDetalleEmpty(actividad)) {
      setError("El detalle del evento es obligatorio");
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
    // Hard-block: reserva técnica por unidad ≤ asientos / libres de ventana.
    // No se valida vs tope artista: la reserva es anónima (staff/TBD); el
    // headcount de artistas va por Sube (`fimba_propuesta_rutas`).
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
      hora_fin: usaTransporte ? null : horaFin || null,
      actividad,
      destino: usaTransporte ? "" : destino,
      id_locacion: idLocacion || null,
      vuelo,
      asientos_equipaje: Number(asientosEquipaje) || 0,
      observaciones_equipaje: observacionesEquipaje,
      observaciones_internas: canEditObservacionesInternas
        ? normalizeEventosInternasHtml(observacionesInternas)
        : undefined,
      observaciones_aforo:
        Number(tipoId) === 1
          ? String(observacionesAforo || "").trim() || null
          : undefined,
      sin_servicio: usaTransporte ? sinServicio : true,
      usa_transporte: usaTransporte,
      vehiculos,
      id_propuestas: propIds,
      id_grupos: idGrupos,
      id_tipo_evento: Number(tipoId),
      audiencia_ofrn: ao,
      // UI ya validó cupos; evita re-fetch logistics/rutas en el save.
      clientValidated: true,
      logisticsSummary: logisticsSummary ?? undefined,
      propuestaRoutes: propuestaRoutes ?? undefined,
    };
    const { evento: saved, error: err } = await saveFimbaEvento(payload);
    setSaving(false);
    if (err) {
      setError(err.message || "No se pudo guardar");
      return;
    }
    onSaved?.({
      id: saved?.id,
      mode: isEdit ? "edit" : "create",
    });
  };

  const title = isEdit
    ? usaTransporte || forceTransporte
      ? "Editar evento"
      : "Editar actividad"
    : forceTransporte
      ? "Nuevo traslado"
      : "Nuevo evento";

  return (
    <div
      className="fimba-modal-backdrop"
      onClick={requestClose}
      role="presentation"
      data-unsaved-work={isDirty ? "true" : undefined}
    >
      <div
        className="fimba-modal"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: usaTransporte ? 760 : 560 }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 12,
            marginBottom: 4,
          }}
        >
          <h2 style={{ margin: 0 }}>{title}</h2>
          <button
            type="button"
            className="fimba-btn fimba-btn-ghost"
            style={{ padding: 4, flexShrink: 0 }}
            onClick={requestClose}
            aria-label="Cerrar"
            title="Cerrar"
          >
            <IconX size={18} />
          </button>
        </div>
        <div
          onKeyDown={(e) => {
            // Enter en inputs (Sube/Baja, equipaje, etc.) no debe disparar Guardar
            // ni cerrar el modal vía onSaved. Textarea / botón / Detalle rich usan Enter.
            if (e.key !== "Enter") return;
            const tag = e.target?.tagName;
            if (
              tag === "TEXTAREA" ||
              tag === "BUTTON" ||
              e.target?.isContentEditable
            ) {
              return;
            }
            e.preventDefault();
          }}
        >
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
              {usaTransporte ? (
                <>
                  <input
                    className="fimba-input"
                    type="time"
                    value={sliceTime(transportNextEvent?.hora_inicio) || ""}
                    disabled
                    readOnly
                    title="Hora com del siguiente evento de este vehículo"
                  />
                  <p
                    className="fimba-muted"
                    style={{
                      margin: "0.25rem 0 0",
                      fontSize: "0.72rem",
                      fontStyle: sliceTime(transportNextEvent?.hora_inicio)
                        ? "italic"
                        : undefined,
                    }}
                  >
                    {sliceTime(transportNextEvent?.hora_inicio)
                      ? "Derivada del siguiente evento de este vehículo (cian en la planilla)."
                      : "Sin siguiente evento con hora en este vehículo — no se inventa un fin."}
                  </p>
                </>
              ) : (
                <input
                  className="fimba-input"
                  type="time"
                  value={horaFin}
                  onChange={(e) => setHoraFin(e.target.value)}
                />
              )}
            </div>
          </div>
          <div className="fimba-field">
            <label className="fimba-label">
              {usaTransporte ? "Locación (parada actual)" : "Locación"}
            </label>
            {readOnly ? (
              <span
                className="fimba-input"
                style={{
                  display: "inline-block",
                  background: "#f8fafc",
                  width: "100%",
                }}
              >
                {locacionDisplayLabel}
              </span>
            ) : (
              <LocationSelectWithCreate
                supabase={supabase}
                options={locationOptions}
                value={idLocacion}
                onChange={(v) => setIdLocacion(v || "")}
                onRefresh={refreshLocations}
                placeholder="Buscar locación…"
              />
            )}
            {usaTransporte ? (
              <p
                className="fimba-muted"
                style={{ margin: "0.25rem 0 0", fontSize: "0.72rem" }}
              >
                Origen de esta parada en la planilla (`eventos.id_locacion`). El
                destino (siguiente parada) se define abajo.
              </p>
            ) : null}
            {showLegacyDestinoBox ? (
              <div style={LEGACY_DESTINO_BOX_STYLE}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                    marginBottom: "0.35rem",
                  }}
                >
                  <label className="fimba-label" style={{ margin: 0 }}>
                    Destino / locación (legacy — migración)
                  </label>
                  {!readOnly && legacyDestinoText ? (
                    <button
                      type="button"
                      className="fimba-btn fimba-btn-ghost"
                      style={{
                        padding: "0.2rem 0.4rem",
                        flexShrink: 0,
                        color: "#94a3b8",
                      }}
                      onClick={clearLegacyDestino}
                      title="Quitar texto legacy"
                      aria-label="Quitar texto legacy de destino"
                    >
                      <IconTrash size={14} />
                    </button>
                  ) : null}
                </div>
                {readOnly || usaTransporte ? (
                  <span
                    className="fimba-input"
                    style={{
                      display: "inline-block",
                      background: "#e2e8f0",
                      width: "100%",
                      color: "#475569",
                    }}
                  >
                    {legacyDestinoText || "—"}
                  </span>
                ) : (
                  <input
                    className="fimba-input"
                    value={destino}
                    onChange={(e) => setDestino(e.target.value)}
                    placeholder="Texto legacy en descripción"
                    style={{ background: "#fff" }}
                  />
                )}
                <p
                  className="fimba-muted"
                  style={{ margin: "0.35rem 0 0", fontSize: "0.72rem" }}
                >
                  {usaTransporte
                    ? "Texto antiguo en descripción. Elegí una locación de catálogo arriba; podés quitarlo con el tachito o al guardar se limpia la línea Destino."
                    : "Campo en desuso: preferí Locación de catálogo. Conservalo solo para corregir datos viejos."}
                </p>
              </div>
            ) : null}
          </div>
          {usaTransporte ? (
            <div
              className="fimba-field"
              style={{
                marginTop: "0.35rem",
                padding: "0.85rem 1rem",
                borderRadius: 8,
                border: "1px solid #e2e8f0",
                background: "#fafbff",
              }}
            >
              <label className="fimba-label" style={{ marginBottom: "0.5rem" }}>
                Siguiente evento calculado
              </label>
              {isEdit ? (
                transportNextEvent ? (
                  <div
                    className="fimba-muted"
                    style={{ fontSize: "0.82rem", lineHeight: 1.45, marginBottom: "0.65rem" }}
                  >
                    <div>
                      <strong
                        style={{
                          color: "#334155",
                          fontWeight: 600,
                          fontStyle:
                            formatNextStopDestino(transportNextEvent) ===
                            TRANSPORT_DESTINO_SIN_LOCACION
                              ? "italic"
                              : undefined,
                        }}
                      >
                        {formatNextStopDestino(transportNextEvent)}
                      </strong>
                    </div>
                    {transportNextEvent.hora_inicio ? (
                      <div>
                        Hora com:{" "}
                        <span style={{ color: "#334155" }}>
                          {sliceTime(transportNextEvent.hora_inicio)}
                        </span>
                      </div>
                    ) : null}
                    {String(
                      transportNextEvent.actividad ||
                        transportNextEvent.tipo_nombre ||
                        "",
                    ).trim() ? (
                      <div>
                        Actividad:{" "}
                        <span style={{ color: "#334155" }}>
                          {String(
                            transportNextEvent.actividad ||
                              transportNextEvent.tipo_nombre ||
                              "",
                          ).trim()}
                        </span>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <p
                    className="fimba-muted"
                    style={{ fontSize: "0.82rem", margin: "0 0 0.65rem", fontStyle: "italic" }}
                  >
                    {TRANSPORT_DESTINO_SIN_SIGUIENTE}
                  </p>
                )
              ) : (
                <p
                  className="fimba-muted"
                  style={{ fontSize: "0.82rem", margin: "0 0 0.65rem", fontStyle: "italic" }}
                >
                  Guardá el evento para ver la siguiente parada del vehículo.
                </p>
              )}
              <p
                className="fimba-muted"
                style={{ fontSize: "0.78rem", margin: "0 0 0.75rem", color: "#64748b" }}
              >
                ¿No es aquí donde quieres ir?
              </p>
              {quickCreateSuccessId ? (
                <div
                  style={{
                    padding: "0.65rem 0.75rem",
                    borderRadius: 6,
                    background: "#ecfdf5",
                    border: "1px solid #a7f3d0",
                    fontSize: "0.82rem",
                  }}
                >
                  <p style={{ margin: "0 0 0.5rem", color: "#065f46" }}>
                    Parada creada correctamente. La Hora Fin de este tramo quedó en{" "}
                    {sliceTime(quickCreateHora) || "—"}.
                  </p>
                  {typeof onOpenEventoEdit === "function" ? (
                    <button
                      type="button"
                      className="fimba-btn fimba-btn-ghost"
                      style={{ fontSize: "0.78rem", padding: "0.25rem 0.5rem" }}
                      onClick={() => onOpenEventoEdit(quickCreateSuccessId)}
                    >
                      Ir a evento para ver sus detalles
                    </button>
                  ) : null}
                </div>
              ) : canQuickCreateDestinoStop ? (
                <div>
                  <div className="fimba-grid-2" style={{ gap: "0.65rem" }}>
                    <div className="fimba-field" style={{ marginBottom: 0 }}>
                      <label className="fimba-label" htmlFor="fimba-quick-destino-hora">
                        Hora
                      </label>
                      <input
                        id="fimba-quick-destino-hora"
                        className="fimba-input"
                        type="time"
                        value={quickCreateHora}
                        onChange={(e) => setQuickCreateHora(e.target.value)}
                        required
                      />
                    </div>
                    <div className="fimba-field" style={{ marginBottom: 0 }}>
                      <label className="fimba-label">Locación</label>
                      <LocationSelectWithCreate
                        supabase={supabase}
                        options={locationOptions}
                        value={quickCreateLocacion}
                        onChange={(v) => setQuickCreateLocacion(v || "")}
                        onRefresh={refreshLocations}
                        placeholder="Buscar locación…"
                      />
                    </div>
                  </div>
                  <p
                    className="fimba-muted"
                    style={{ margin: "0.35rem 0 0.65rem", fontSize: "0.72rem" }}
                  >
                    Crear evento rápido: Hora Fin actual → inicio de la nueva
                    parada; locación → `id_locacion` de la parada creada.
                  </p>
                  {quickCreateError ? (
                    <p className="fimba-error" style={{ margin: "0 0 0.5rem" }}>
                      {quickCreateError}
                    </p>
                  ) : null}
                  <button
                    type="button"
                    className="fimba-btn fimba-btn-primary"
                    disabled={quickCreateSaving}
                    style={{ fontSize: "0.82rem" }}
                    onClick={submitQuickCreateDestinoStop}
                  >
                    {quickCreateSaving ? "Guardando…" : "Guardar evento"}
                  </button>
                </div>
              ) : (
                <p className="fimba-muted" style={{ margin: 0, fontSize: "0.72rem" }}>
                  {readOnly
                    ? "Modo consulta: solo lectura."
                    : destinoActionBlockedReason ||
                      "Guardá el evento y asigná un vehículo para crear la parada intermedia."}
                </p>
              )}
            </div>
          ) : null}
          <div className="fimba-field">
            <FimbaEventDetalleEditor
              value={actividad}
              onChange={setActividad}
              placeholder="Ej. Check-in hotel / Show noche 1"
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
          <div className="fimba-grid-2">
            <div className="fimba-field">
              <label className="fimba-label">Asientos Equipaje</label>
              <input
                className="fimba-input"
                type="number"
                min={0}
                value={asientosEquipaje}
                onChange={(e) => {
                  setEquipajeTouched(true);
                  setAsientosEquipaje(e.target.value);
                }}
              />
              <p className="fimba-muted" style={{ margin: "0.25rem 0 0", fontSize: "0.75rem" }}>
                Solo equipaje (no es headcount). Default = Σ plazas extra de artistas
                taggeados. Pasajeros = reglas de subida/bajada + tags.
              </p>
            </div>
            <div className="fimba-field">
              <label className="fimba-label">Observaciones Equipaje</label>
              <input
                className="fimba-input"
                value={observacionesEquipaje}
                onChange={(e) => setObservacionesEquipaje(e.target.value)}
              />
            </div>
          </div>

          {Number(tipoId) === 1 && (
            <div className="fimba-field">
              <label className="fimba-label">Observaciones aforo</label>
              <textarea
                className="fimba-input"
                rows={3}
                value={observacionesAforo}
                onChange={(e) => setObservacionesAforo(e.target.value)}
                placeholder="Notas de aforo de este espectáculo…"
                style={{ resize: "vertical" }}
              />
              <p
                className="fimba-muted"
                style={{ margin: "0.25rem 0 0", fontSize: "0.72rem" }}
              >
                Por concierto (no por sala). Distinto del aforo numérico de la
                locación.
              </p>
            </div>
          )}

          {canEditObservacionesInternas && (
            <div className="fimba-field">
              <label className="fimba-label">Observaciones internas</label>
              <FimbaRichTextEditor
                value={observacionesInternas}
                onChange={setObservacionesInternas}
                uploadFile={uploadInternasImage}
                placeholder="Notas solo para staff…"
                emptyLabel="Sin observaciones internas"
                sanitizeHtml={sanitizeEventosInternasHtml}
                isEmptyHtml={isEventosInternasEmpty}
              />
              <p
                className="fimba-muted"
                style={{ margin: "0.25rem 0 0", fontSize: "0.72rem" }}
              >
                Solo staff (editor general / OFRN). No sale en consulta, tokens ni
                exports públicos.
              </p>
            </div>
          )}

          <div ref={tagsSectionRef} id="fimba-evento-tags">
          {usaTransporte ? (
            <>
            <FimbaEventoArtistasBoardingTable
              propuestas={propuestas}
              selectedPropIds={selectedProps}
              onChangeSelected={setSelectedProps}
              lockedPropId={lockedPropId}
              event={evento}
              edicionId={edicion?.id}
              selectedVehIds={selectedVehIds}
              flota={flota}
              sequencesByVehicle={sequencesByVehicle}
              propuestaRoutes={propuestaRoutes}
              canEditBoarding={
                Boolean(isEdit && !sinServicio && selectedVehIds.length > 0)
              }
              onBoardingRefresh={onBoardingRefresh}
            />
              <FimbaEventoOfrnBoardingSection
                isEdit={isEdit}
                sinServicio={sinServicio}
                evento={evento}
                edicion={edicion}
                selectedVehIds={selectedVehIds}
                flota={flota}
                ofrnPassengers={ofrnPassengers}
                ofrnAdmissionRules={ofrnAdmissionRules}
                ofrnRegions={ofrnRegions}
                ofrnLocalities={ofrnLocalities}
                ofrnRouteRules={ofrnRouteRules}
                sequencesByVehicle={sequencesByVehicle}
                ofrnBoardPanel={ofrnBoardPanel}
                setOfrnBoardPanel={setOfrnBoardPanel}
                ofrnBoardVehicleId={ofrnBoardVehicleId}
                setOfrnBoardVehicleId={setOfrnBoardVehicleId}
                onBoardingRefresh={onBoardingRefresh}
              />
            </>
          ) : (
            <div className="fimba-field">
              <label className="fimba-label">Artistas (tag)</label>
              {propuestas.length === 0 ? (
                <p className="fimba-muted" style={{ margin: 0, fontSize: "0.85rem" }}>
                  Sin artistas en la edición. Podés guardar igual (evento de edición).
                </p>
              ) : (
                <>
                  <input
                    type="search"
                    className="fimba-input"
                    value={tagFilter}
                    onChange={(e) => setTagFilter(e.target.value)}
                    placeholder="Filtrar artistas…"
                    aria-label="Filtrar artistas"
                    style={{
                      width: "100%",
                      marginBottom: 8,
                      padding: "0.4rem 0.65rem",
                      fontSize: "0.8rem",
                    }}
                  />
                  {filteredPropuestasChips.length === 0 ? (
                    <p
                      className="fimba-muted"
                      style={{ margin: 0, fontSize: "0.85rem" }}
                    >
                      Ningún artista coincide con el filtro.
                    </p>
                  ) : (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {filteredPropuestasChips.map((p) => {
                        const on = selectedProps.includes(String(p.id));
                        const locked =
                          lockedPropId && String(p.id) === lockedPropId;
                        return (
                          <button
                            key={p.id}
                            type="button"
                            className={`fimba-btn fimba-chip${on ? " fimba-chip-on" : ""}`}
                            onClick={() => toggleProp(p.id)}
                            disabled={locked}
                            title={
                              locked ? "Artista de esta vista (fijo)" : undefined
                            }
                            style={{
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
                </>
              )}
              {lockedPropId && (
                <p
                  className="fimba-muted"
                  style={{ margin: "0.35rem 0 0", fontSize: "0.72rem" }}
                >
                  Este evento queda etiquetado al artista de la ficha (tag obligatorio).
                </p>
              )}
            </div>
          )}

          <div className="fimba-field">
            <label className="fimba-label">Audiencia OFRN</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
              {[
                { value: "none", label: "Ninguna" },
                { value: "tutti", label: "Tutti" },
                { value: "grupos", label: "Grupos" },
              ].map((opt) => {
                const on = audienciaOfrn === opt.value;
                const ofrnShape = opt.value !== "none";
                return (
                  <button
                    key={opt.value}
                    type="button"
                    className={`fimba-btn fimba-chip${on ? " fimba-chip-on" : ""}${ofrnShape ? " fimba-chip-ofrn" : ""}`}
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
                          className={`fimba-btn fimba-chip fimba-chip-ofrn${on ? " fimba-chip-on" : ""}`}
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
                              borderRadius: 2,
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
                    Flota — reserva técnica por vehículo
                  </label>
                  <p
                    className="fimba-muted"
                    style={{ margin: "0 0 0.5rem", fontSize: "0.78rem" }}
                  >
                    Marcá uno o más buses. La columna <strong>Reserva técnica</strong>{" "}
                    es cupo <em>anónimo</em> (staff / TBD / holgura) —{" "}
                    <strong>no</strong> son personas nombradas. Para artistas usá{" "}
                    <strong>Sube</strong> en la tabla de arriba. El número entre
                    paréntesis en «Disponibles» es la <strong>capacidad</strong> del
                    vehículo.
                  </p>
                  {warnArtistasNeedSube ? (
                    <p
                      style={{
                        margin: "0 0 0.5rem",
                        fontSize: "0.78rem",
                        color: "#b45309",
                        fontWeight: 600,
                      }}
                    >
                      Hay artistas taggeados (tope {artistasCapTope}) sin reglas{" "}
                      <strong>Sube</strong>. Asigná Sube por artista en la tabla de
                      arriba; la reserva técnica no cuenta como pasajeros nombrados.
                    </p>
                  ) : null}
                  {warnAnonymousReservaWithoutSube ? (
                    <p
                      style={{
                        margin: "0 0 0.5rem",
                        fontSize: "0.78rem",
                        color: "#b45309",
                        fontWeight: 600,
                      }}
                    >
                      Hay reserva técnica ({totalPlazasAsignadas}) y artistas taggeados,
                      pero ningún <strong>Sube</strong> nombrado. Esa reserva saldrá
                      como «Reserva del evento» anónima — usá Sube para atribuir
                      artistas.
                    </p>
                  ) : null}
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
                      {flotaCapTotal > 0 ? ` · ${flotaCapTotal} asientos de flota` : ""}
                      {" · "}
                      {flotaOrdenada
                        .map((gt) => {
                          const cap = capacidadGiraTransporte(gt);
                          return `${labelGiraTransporte(gt)}${
                            cap != null ? ` (cap ${cap})` : ""
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
                      {plazasACubrir > 0 ? (
                        <p
                          className="fimba-muted"
                          style={{ margin: "0 0 0.35rem", fontSize: "0.72rem" }}
                        >
                          Orden flota: mejor ajuste a tope artistas {plazasACubrir}{" "}
                          (referencia; el headcount va por Sube)
                        </p>
                      ) : null}
                      <table className="fimba-table" style={{ fontSize: "0.82rem" }}>
                        <thead>
                          <tr>
                            <th style={{ width: 36 }} />
                            <th>Vehículo</th>
                            <th style={{ width: 56, textAlign: "right" }}>Cap.</th>
                            <th
                              style={{ width: 56, textAlign: "right" }}
                              title="Asientos OFRN a bordo en la ventana (1 + plaza_extra)"
                            >
                              OFRN
                            </th>
                            <th
                              style={{ width: 56, textAlign: "right" }}
                              title="Plazas FIMBA a bordo en la ventana (reserva técnica + ↑ artistas)"
                            >
                              FIMBA
                            </th>
                            <th style={{ width: 64, textAlign: "right" }}>Libres</th>
                            <th
                              style={{ width: 110, textAlign: "right" }}
                              title="Cupo anónimo (staff/TBD). No son artistas — usá Sube."
                            >
                              Reserva técnica
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {flotaOrdenada.map((gt) => {
                            const sid = String(gt.id);
                            const on = selectedVehIds.includes(sid);
                            const cap = capacidadGiraTransporte(gt);
                            const m = metrics[sid];
                            const nota = detalleGiraTransporte(gt);
                            const libres =
                              m?.libres != null && Number.isFinite(Number(m.libres))
                                ? Number(m.libres)
                                : null;
                            const ocupOfrn = Math.max(
                              0,
                              Number(m?.ocupadas_ofrn) || 0,
                            );
                            const ocupFimba = Math.max(
                              0,
                              Number(m?.asignadas_fimba) || 0,
                            );
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
                                      title={m.note || undefined}
                                    >
                                      {ocupOfrn + ocupFimba > 0
                                        ? `Ocupadas: OFRN ${ocupOfrn} · FIMBA ${ocupFimba}`
                                        : "Sin ocupación en la ventana"}
                                      {m.ofrn_eventos > 0
                                        ? ` · ${m.ofrn_eventos} parada${m.ofrn_eventos === 1 ? "" : "s"} OFRN`
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
                                    color: ocupOfrn > 0 ? "#0f766e" : undefined,
                                  }}
                                >
                                  {metricsLoading
                                    ? "…"
                                    : fecha
                                      ? ocupOfrn
                                      : "—"}
                                </td>
                                <td
                                  style={{
                                    textAlign: "right",
                                    fontVariantNumeric: "tabular-nums",
                                    color: ocupFimba > 0 ? "#9d174d" : undefined,
                                  }}
                                >
                                  {metricsLoading
                                    ? "…"
                                    : fecha
                                      ? ocupFimba
                                      : "—"}
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
                                    aria-label={`Reserva técnica en ${labelGiraTransporte(gt)}`}
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
                        Reserva técnica
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
                          {" (vía Sube)"}
                        </>
                      ) : (
                        <span className="fimba-muted">
                          {" "}
                          · sin artistas taggeados
                        </span>
                      )}
                      {Number(asientosEquipaje) > 0 ? (
                        <span className="fimba-muted">
                          {" "}
                          · equipaje {Number(asientosEquipaje) || 0} asiento
                          {Number(asientosEquipaje) === 1 ? "" : "s"}
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                  <p className="fimba-muted" style={{ margin: "0.5rem 0 0", fontSize: "0.72rem" }}>
                    Capacidad = asientos de la unidad. OFRN / FIMBA = asientos ya a
                    bordo cuyo ride solapa la fecha/hora (orquesta + Sube artistas +
                    reserva técnica residual). Libres = capacidad − OFRN − FIMBA. Al
                    editar este trayecto no se cuentan su propia reserva guardada. Al
                    guardar se bloquea si la reserva supera asientos o libres.
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
            <button
              type="button"
              className="fimba-btn fimba-btn-ghost"
              onClick={requestClose}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="fimba-btn fimba-btn-primary"
              disabled={saving || tiposLoading || !tipoId}
              onClick={submit}
            >
              {saving ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
