import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  IconArrowLeft,
  IconPlus,
  IconEdit,
  IconTrash,
  IconCopy,
  IconLoader,
  IconBus,
  IconClock,
  IconX,
  IconFileExcel,
  IconPencil,
  IconUpload,
  IconDownload,
  IconEye,
  IconCalendarPlus,
  IconPause,
} from "../../components/ui/Icons";
import MultiSelectDropdown from "../../components/ui/MultiSelectDropdown";
import {
  addFimbaVehiculo,
  capacidadGiraTransporte,
  clearFimbaPropuestaRutaStop,
  computeFimbaCapacity,
  decodeFimbaTrasladoDescripcion,
  deleteFimbaTraslado,
  detalleGiraTransporte,
  duplicateFimbaEvento,
  getFimbaEdicionById,
  giraTransporteIdsFromEvent,
  isFimbaTrasladoEvent,
  labelGiraTransporte,
  listFimbaAgenda,
  listFimbaFlota,
  listFimbaGiraGrupos,
  listFimbaParticipantesForPropuestas,
  listFimbaPropuestas,
  listFimbaPropuestaRutas,
  listFimbaTraslados,
  listOfrnTransportesCatalog,
  listTiposEventoForFimba,
  loadFimbaTransportLogisticsSummary,
  mergeFimbaAgendaCategories,
  OFRN_CATEGORIA_TRANSPORTE_ID,
  ofrnGiraTransporteUrl,
  patchFimbaEventoPlanilla,
  setFimbaEventoTransportes,
  updateFimbaVehiculo,
} from "../../services/fimbaService";
import {
  boardingMetricsForEventRow,
  buildAllVehicleBoardingSequences,
  defaultIntermediateStopSchedule,
  formatBoardChipLabel,
  formatEventLocation,
  isVehiclePauseBetweenStops,
  previousAssignedStopInVehicleSequence,
  resolveStopBoardAlightChips,
  TRANSPORT_DESTINO_SIN_SIGUIENTE,
  TRANSPORT_DESTINO_SIN_LOCACION,
} from "../../utils/fimbaTransportBoarding";
import {
  buildDestinoStopSchedule,
  createDestinoStopEvent,
  offsetEventDateTime,
} from "../../utils/fimbaDestinoStopCreate";
import { eventMatchesOtrosEventosContext } from "../../utils/fimbaAgendaUrlParams";
import {
  sortFimbaAgendaRows,
  sortFimbaPropuestasByNombre,
} from "../../utils/fimbaAgendaSort";
import {
  exportFimbaTransporteTodosExcel,
  exportFimbaTransporteVehiculoExcel,
} from "../../utils/fimbaExport";
import FimbaTransportReportsMenu from "./FimbaTransportReportsMenu";
import LocationSelectWithCreate from "../../components/forms/LocationSelectWithCreate";
import FimbaDestinoStopModal from "./FimbaDestinoStopModal";
import FimbaEventoFormModal from "./FimbaEventoFormModal";
import FimbaProgramarTransporteModal from "./FimbaProgramarTransporteModal";
import FimbaRecorridoIntermedioModal from "./FimbaRecorridoIntermedioModal";
import { FimbaEventDetallePreview } from "./FimbaEventDetalleField";
import FimbaStopRulesManager from "./FimbaStopRulesManager";
import { useFimbaAccess } from "../../context/FimbaAccessContext";
import { supabase } from "../../services/supabase";
import { hasHtmlMarkup, stripHtml } from "../../utils/eventDisplayUtils";

/** Índice id_propuesta → participantes activos (batch, sin hotelería). */
function participantesMapFromBatch(byPropuesta) {
  const map = new Map();
  if (!byPropuesta) return map;
  const entries =
    byPropuesta instanceof Map
      ? byPropuesta.entries()
      : Object.entries(byPropuesta);
  for (const [id, list] of entries) {
    if (id == null) continue;
    const active = (list || []).filter((p) => p.activo !== false);
    map.set(String(id), active);
    map.set(Number(id), active);
  }
  return map;
}

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
  "actividad",
  "vuelo",
  "observaciones",
  "id_locacion",
];

/** Celdas con edición inline por doble clic (fuera de modo planilla). */
const INLINE_CELL_FIELDS = new Set([
  "fecha",
  "hora",
  "actividad",
  "locacion",
  "vuelo",
]);

function eventLocacionId(ev) {
  const raw = ev?.id_locacion ?? ev?.locaciones?.id ?? null;
  return raw != null && raw !== "" ? String(raw) : "";
}

function draftFromEvent(ev) {
  const decoded = decodeFimbaTrasladoDescripcion(ev?.descripcion, {
    observaciones_equipaje: ev?.observaciones_equipaje,
  });
  const vehId =
    (ev?.vehiculos || []).length === 1
      ? String(ev.vehiculos[0].id_gira_transporte)
      : "";
  return {
    fecha: ev?.fecha || "",
    hora_inicio: sliceTimeInput(ev?.hora_inicio),
    hora_fin: sliceTimeInput(ev?.hora_fin),
    actividad: decoded.actividad || ev?.actividad || "",
    vuelo: decoded.vuelo || "",
    observaciones:
      ev?.observaciones_equipaje ||
      decoded.observaciones ||
      ev?.observaciones ||
      "",
    id_locacion: eventLocacionId(ev),
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

/**
 * Celda Subidas / Bajadas (paridad visual con GirasTransportesManager: conteo + chips).
 * Click abre FimbaStopRulesManager; X en chip FIMBA quita la asignación.
 */
function PlanillaBoardCell({
  direction,
  chips = [],
  total = 0,
  canEdit,
  onOpen,
  onRemoveChip,
  removing = false,
}) {
  const isUp = direction === "up";
  const Icon = isUp ? IconUpload : IconDownload;
  const hasPeople = total > 0 || chips.length > 0;
  const tone = isUp
    ? {
        border: hasPeople ? "#86efac" : "#e2e8f0",
        bg: hasPeople ? "rgba(220, 252, 231, 0.45)" : "#fff",
        head: "#166534",
      }
    : {
        border: hasPeople ? "#fda4af" : "#e2e8f0",
        bg: hasPeople ? "rgba(255, 228, 230, 0.45)" : "#fff",
        head: "#9f1239",
      };

  return (
    <div
      className="fimba-planilla-board-cell"
      role={canEdit ? "button" : undefined}
      tabIndex={canEdit ? 0 : undefined}
      onClick={canEdit ? onOpen : undefined}
      onKeyDown={
        canEdit
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onOpen?.();
              }
            }
          : undefined
      }
      title={
        canEdit
          ? isUp
            ? "Gestionar subidas"
            : "Gestionar bajadas"
          : undefined
      }
      style={{
        borderColor: tone.border,
        background: tone.bg,
        cursor: canEdit ? "pointer" : "default",
      }}
    >
      <div
        className="fimba-planilla-board-head"
        style={{ color: tone.head }}
      >
        <Icon size={11} />
        <span>{total}</span>
        {canEdit ? (
          <span className="fimba-planilla-board-add" title="Asignar">
            <IconPlus size={11} />
          </span>
        ) : null}
      </div>
      {chips.length > 0 ? (
        <div className="fimba-planilla-board-chips">
          {chips.map((chip) => {
            const chipColor =
              chip.kind === "ofrn"
                ? "#475569"
                : chip.kind === "synthetic"
                  ? "#64748b"
                  : chip.color || "var(--fimba-deep, #94216d)";
            return (
              <span
                key={chip.key}
                className={`fimba-planilla-board-chip${chip.kind === "ofrn" ? " fimba-planilla-board-chip-ofrn" : ""}`}
                title={
                  chip.title ||
                  (chip.kind === "ofrn"
                    ? "Orquesta OFRN — clic para reglas de ruta"
                    : chip.kind === "synthetic"
                      ? `${chip.label}: ${chip.plazas} plaza${chip.plazas === 1 ? "" : "s"} (reserva técnica anónima)`
                      : `${chip.label}: ${chip.plazas} plaza${chip.plazas === 1 ? "" : "s"}`)
                }
                onClick={
                  canEdit && (chip.kind === "ofrn" || chip.kind === "synthetic")
                    ? (e) => {
                        e.stopPropagation();
                        onOpen?.({
                          initialTab:
                            chip.kind === "ofrn" ? "orquesta" : "artistas",
                        });
                      }
                    : undefined
                }
                style={{
                  background:
                    chip.kind === "fimba" && chip.color
                      ? `${chip.color}22`
                      : chip.kind === "ofrn"
                        ? "#f1f5f9"
                        : "#f8fafc",
                  color: chipColor,
                  borderColor:
                    chip.kind === "fimba" && chip.color
                      ? `${chip.color}55`
                      : "#e2e8f0",
                  cursor:
                    canEdit && (chip.kind === "ofrn" || chip.kind === "synthetic")
                      ? "pointer"
                      : undefined,
                }}
              >
                <span className="fimba-planilla-board-chip-label">
                  {formatBoardChipLabel(chip.label, chip.plazas)}
                </span>
                {canEdit && chip.removable ? (
                  <button
                    type="button"
                    className="fimba-planilla-board-chip-x"
                    disabled={removing}
                    title="Quitar de esta parada"
                    aria-label={`Quitar ${chip.label}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveChip?.(chip);
                    }}
                  >
                    <IconX size={10} />
                  </button>
                ) : null}
              </span>
            );
          })}
        </div>
      ) : canEdit ? (
        <span className="fimba-muted fimba-planilla-board-empty">
          {isUp ? "Asignar subida" : "Asignar bajada"}
        </span>
      ) : (
        <span className="fimba-muted fimba-planilla-board-empty">—</span>
      )}
    </div>
  );
}

/**
 * Celda Tránsito/cap con tooltip de quién está a bordo al salir.
 * Portal z-[110] para no quedar clipado por scroll de planilla.
 */
function PlanillaTransitoCell({
  enTransito,
  cap,
  libres,
  overbook,
  aBordo = null,
}) {
  const ref = useRef(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  const lines = aBordo?.lines || [];
  const titleText =
    aBordo?.titleText ||
    (libres != null && cap != null
      ? `Libres: ${libres} (cap ${cap})`
      : cap != null
        ? `Capacidad: ${cap}`
        : undefined);

  const place = () => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const preferBelow = r.bottom + 8;
    const top =
      preferBelow + 160 > window.innerHeight
        ? Math.max(8, r.top - 8)
        : preferBelow;
    const left = Math.min(
      Math.max(8, r.left + r.width / 2),
      window.innerWidth - 8,
    );
    setPos({
      top,
      left,
      placeAbove: preferBelow + 160 > window.innerHeight,
    });
  };

  const show = () => {
    place();
    setOpen(true);
  };
  const hide = () => setOpen(false);

  return (
    <td
      ref={ref}
      className="fimba-planilla-transito"
      style={{
        fontWeight: 700,
        color: overbook
          ? "#b91c1c"
          : libres != null && libres === 0
            ? "#b45309"
            : undefined,
        cursor: lines.length || enTransito > 0 ? "help" : undefined,
      }}
      title={titleText}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
      tabIndex={0}
      aria-label={
        enTransito == null
          ? "Sin tránsito"
          : `Tránsito ${enTransito}${cap != null ? ` de ${cap}` : ""}. ${titleText || ""}`
      }
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
      {open &&
        createPortal(
          <div
            className={`fimba-transito-tooltip${pos.placeAbove ? " fimba-transito-tooltip-above" : ""}`}
            style={{
              top: pos.top,
              left: pos.left,
              transform: pos.placeAbove
                ? "translate(-50%, -100%)"
                : "translate(-50%, 0)",
            }}
            role="tooltip"
          >
            <div className="fimba-transito-tooltip-title">
              A bordo al salir
              {enTransito != null ? ` · ${enTransito}` : ""}
              {cap != null ? ` / ${cap}` : ""}
            </div>
            {lines.length === 0 ? (
              <div className="fimba-transito-tooltip-empty">
                Sin pasajeros a bordo
              </div>
            ) : (
              <ul className="fimba-transito-tooltip-list">
                {lines.map((l) => (
                  <li key={l.key}>
                    <span
                      className="fimba-transito-tooltip-dot"
                      style={{
                        background:
                          l.kind === "ofrn"
                            ? "#64748b"
                            : l.kind === "reserva"
                              ? "#d97706"
                              : l.color || "var(--fimba-deep, #94216d)",
                      }}
                    />
                    <span className="fimba-transito-tooltip-label">
                      {l.label}
                    </span>
                    <span className="fimba-transito-tooltip-n">{l.plazas}</span>
                  </li>
                ))}
              </ul>
            )}
            {libres != null && (
              <div className="fimba-transito-tooltip-foot">
                Libres: {libres}
              </div>
            )}
          </div>,
          document.body,
        )}
    </td>
  );
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
  /** Reglas `giras_logistica_rutas` para chips Subidas/Bajadas Orquesta. */
  const [ofrnRouteRules, setOfrnRouteRules] = useState([]);
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
  /** Panel «Ver otros eventos» (contexto agenda no-transporte). */
  const [showOtrosEventos, setShowOtrosEventos] = useState(false);
  const [otrosCategoryIds, setOtrosCategoryIds] = useState([]);
  const [otrosPropuestaIds, setOtrosPropuestaIds] = useState([]);
  const [otrosGrupoIds, setOtrosGrupoIds] = useState([]);
  const [contextEventos, setContextEventos] = useState([]);
  const [giraGrupos, setGiraGrupos] = useState([]);
  const [dbCategorias, setDbCategorias] = useState([]);
  const [catalogTipos, setCatalogTipos] = useState([]);
  const [showProgramar, setShowProgramar] = useState(false);
  /** Resalta filas recién creadas (Programar / +). */
  const [highlightEventIds, setHighlightEventIds] = useState([]);
  /** id de la fila origen mientras «+» crea la parada intermedia (null = idle). */
  const [creatingIntermediateFromId, setCreatingIntermediateFromId] =
    useState(null);
  /** Spinner full-page solo en la primera carga de la edición. */
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState(null);
  const hasLoadedOnce = useRef(false);
  const loadedEdicionId = useRef(null);
  const [modal, setModal] = useState(null); // null | { mode, evento? }
  /**
   * Modal compacto Destino → crea parada siguiente (intermedia si hay next).
   * { ev, vehicleId, nextEv, schedule: { fecha, hora_inicio } }
   */
  const [destinoModal, setDestinoModal] = useState(null);
  /**
   * Modal recorrido ida-vuelta durante pausa.
   * { prevEv, nextEv, vehicleId, idPropuestasTags }
   */
  const [recorridoModal, setRecorridoModal] = useState(null);
  /** Panel subidas/bajadas (FIMBA cantidades + OFRN StopRules). */
  const [stopRulesModal, setStopRulesModal] = useState(null); // null | { event, type, transportId, initialTab? }
  const [removingBoardKey, setRemovingBoardKey] = useState(null);
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
  /** Participantes por propuesta (CNRT / hoja de ruta FIMBA). */
  const [participantesByPropuesta, setParticipantesByPropuesta] = useState(
    () => new Map(),
  );
  const showVehForm = showAddVeh || editingVehiculoId != null;
  const isEditingVeh = editingVehiculoId != null;

  /** Modo planilla: celdas inline + semáforo (oculto en consulta / token RO). */
  const [editMode, setEditMode] = useState(false);
  /**
   * Edición puntual fuera de modo planilla: `{ eventId, field }`
   * field = fecha | hora | actividad | locacion | vuelo
   */
  const [editingCell, setEditingCell] = useState(null);
  const [locationOptions, setLocationOptions] = useState([]);
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
  const propuestasRef = useRef(propuestas);
  propuestasRef.current = propuestas;
  const edicionRef = useRef(edicion);
  const rutasRefreshTimerRef = useRef(null);
  edicionRef.current = edicion;

  const refreshLocations = useCallback(async () => {
    const { data, error: err } = await supabase
      .from("locaciones")
      .select("id, nombre, direccion, localidades(localidad)")
      .order("nombre");
    if (err) {
      console.error(err);
      return;
    }
    setLocationOptions(
      (data || []).map((l) => ({
        id: l.id,
        label: l.localidades?.localidad
          ? `${l.nombre} (${l.localidades.localidad})`
          : l.nombre,
        nombre: l.nombre,
        ciudad: l.localidades?.localidad || null,
      })),
    );
  }, []);

  useEffect(() => {
    refreshLocations();
  }, [refreshLocations]);

  useEffect(() => {
    if (!editingCell) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") {
        setEditingCell(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editingCell]);

  /**
   * Carga / refresh quirúrgico.
   * @param {{
   *   silent?: boolean,
   *   eventos?: boolean,
   *   rutas?: boolean,
   *   logistics?: boolean,
   *   flota?: boolean,
   *   participantes?: boolean,
   *   catalog?: boolean,
   *   all?: boolean,
   * }} [opts]
   * - Primera visita: spinner full-page.
   * - silent / post-edit: lista visible; solo patch de slices pedidos.
   */
  const load = useCallback(
    async (opts = {}) => {
      const {
        silent = false,
        all = false,
        eventos: wantEventos = false,
        rutas: wantRutas = false,
        logistics: wantLogistics = false,
        flota: wantFlota = false,
        participantes: wantParticipantes = false,
        catalog: wantCatalog = false,
      } = opts;

      if (loadedEdicionId.current !== edicionId) {
        hasLoadedOnce.current = false;
        loadedEdicionId.current = edicionId;
      }
      const isFirst = !hasLoadedOnce.current;
      const hasExplicitSlices =
        wantEventos ||
        wantRutas ||
        wantLogistics ||
        wantFlota ||
        wantParticipantes ||
        wantCatalog ||
        all;
      // Sin slices explícitos = carga completa (filtro artista / mount).
      const fetchAll = isFirst || all || !hasExplicitSlices;
      const doEventos = fetchAll || wantEventos;
      const doRutas = fetchAll || wantRutas;
      const doLogistics = fetchAll || wantLogistics;
      const doFlota = fetchAll || wantFlota;
      const doParticipantes = fetchAll || wantParticipantes;
      const doCatalog = fetchAll || wantCatalog;

      if (isFirst && !silent) setInitialLoading(true);
      setError(null);

      // —— Primera carga / full: edicion + propuestas + catálogo en paralelo ——
      let ed = edicionRef.current;
      let props = propuestasRef.current || [];
      if (fetchAll || !ed || !props.length) {
        const [edRes, propsRes, catRes] = await Promise.all([
          getFimbaEdicionById(edicionId),
          listFimbaPropuestas(edicionId),
          doCatalog
            ? listOfrnTransportesCatalog()
            : Promise.resolve({ catalog: null, error: null }),
        ]);
        if (edRes.error || !edRes.edicion) {
          setError(edRes.error?.message || "Edición no encontrada");
          setEdicion(null);
          setInitialLoading(false);
          return;
        }
        ed = edRes.edicion;
        props = propsRes.propuestas || [];
        setEdicion(ed);
        edicionRef.current = ed;
        setPropuestas(props);
        propuestasRef.current = props;
        if (propsRes.error) setError(propsRes.error.message || "Error al cargar");
        if (doCatalog && !catRes.error) setCatalog(catRes.catalog || []);
        else if (doCatalog && catRes.error) {
          setError(catRes.error.message || "Error al cargar catálogo");
        }
        // Grupos OFRN + categorías (Ver otros eventos / Programar)
        const [gruposRes, tiposRes] = await Promise.all([
          listFimbaGiraGrupos(ed.id_gira),
          listTiposEventoForFimba(),
        ]);
        if (!gruposRes.error) setGiraGrupos(gruposRes.grupos || []);
        if (!tiposRes.error) {
          setCatalogTipos(tiposRes.tipos || []);
          setDbCategorias(tiposRes.categorias || []);
        }
      } else if (doCatalog) {
        const catRes = await listOfrnTransportesCatalog();
        if (!catRes.error) setCatalog(catRes.catalog || []);
      }

      const giraId = ed.id_gira;
      const propIds = (props || []).map((p) => p.id);
      let fleet = vehiculosRef.current || [];

      // Flota primero si hace falta (trayectos la reutilizan; no espera a logistics).
      if (doFlota) {
        const flotaRes = await listFimbaFlota(giraId);
        if (flotaRes.error) {
          setError(flotaRes.error.message || "Error al cargar flota");
        } else {
          fleet = flotaRes.vehiculos || flotaRes.flota || [];
          setVehiculos(fleet);
          vehiculosRef.current = fleet;
        }
      }

      const tasks = [];
      if (doLogistics) {
        tasks.push(
          loadFimbaTransportLogisticsSummary(giraId).then((res) => ({
            key: "logistics",
            res,
          })),
        );
      }
      if (doRutas) {
        tasks.push(
          listFimbaPropuestaRutas(edicionId, {
            edicion: ed,
            propuestas: props,
          }).then((res) => ({ key: "rutas", res })),
        );
      }
      if (doEventos) {
        tasks.push(
          listFimbaTraslados(edicionId, {
            id_propuesta: filtroArtista || null,
            edicion: ed,
            propuestas: props,
            flota: fleet,
          }).then((res) => ({ key: "eventos", res })),
        );
      }

      const settled = await Promise.all(tasks);
      let firstErr = null;
      for (const { key, res } of settled) {
        if (res?.error && !firstErr) firstErr = res.error;
        if (key === "logistics" && !res.error) {
          setLogisticsSummary(res.summary || []);
          setOfrnPassengers(res.passengers || res.summary || []);
          setOfrnAdmissionRules(res.admissionRules || []);
          setOfrnRegions(res.regions || []);
          setOfrnLocalities(res.localities || []);
          setOfrnRouteRules(res.routeRules || []);
        }
        if (key === "rutas" && !res.error) {
          setPropuestaRoutes(res.rutas || []);
        }
        if (key === "eventos" && !res.error) {
          setEventos(res.eventos || []);
          eventosRef.current = res.eventos || [];
        }
      }

      if (firstErr) setError(firstErr.message || "Error al cargar");
      hasLoadedOnce.current = true;
      setInitialLoading(false);

      // CNRT / hoja de ruta: no bloquea planilla ni spinner.
      if (doParticipantes) {
        listFimbaParticipantesForPropuestas(propIds).then((res) => {
          if (!res.error) {
            setParticipantesByPropuesta(
              participantesMapFromBatch(res.byPropuesta),
            );
          }
        });
      }
    },
    [edicionId, filtroArtista],
  );

  /** Alias soft: no blankea la planilla. */
  const softRefresh = useCallback(
    (slices = {}) => load({ silent: true, ...slices }),
    [load],
  );

  /** Coalesce rapid Sube/Baja / luggage writes → one rutas fetch. */
  const softRefreshRutasDebounced = useCallback(() => {
    if (rutasRefreshTimerRef.current) {
      clearTimeout(rutasRefreshTimerRef.current);
    }
    rutasRefreshTimerRef.current = setTimeout(() => {
      rutasRefreshTimerRef.current = null;
      softRefresh({ rutas: true });
    }, 400);
  }, [softRefresh]);

  useEffect(
    () => () => {
      if (rutasRefreshTimerRef.current) {
        clearTimeout(rutasRefreshTimerRef.current);
      }
    },
    [],
  );

  const handleBoardingRefresh = useCallback(
    (scope) => {
      if (scope === "ofrn") {
        softRefresh({ logistics: true });
      } else if (scope === "reserva" || scope === "eventos") {
        softRefresh({ eventos: true, rutas: scope === "reserva" });
      } else {
        softRefreshRutasDebounced();
      }
    },
    [softRefresh, softRefreshRutasDebounced],
  );

  useEffect(() => {
    load({
      silent: hasLoadedOnce.current && loadedEdicionId.current === edicionId,
    });
  }, [load, edicionId]);

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

  const otrosEventosActive =
    otrosCategoryIds.length > 0 ||
    otrosPropuestaIds.length > 0 ||
    otrosGrupoIds.length > 0;

  /** Carga agenda no-transporte cuando «Ver otros eventos» tiene filtros. */
  useEffect(() => {
    if (!otrosEventosActive || !edicionId) {
      setContextEventos([]);
      return undefined;
    }
    let cancelled = false;
    (async () => {
      const needOfrn =
        otrosGrupoIds.length > 0 || filtroOrigen === "all" || filtroOrigen === "ofrn";
      const { eventos: agenda, error: err } = await listFimbaAgenda(edicionId, {
        include_ofrn: needOfrn,
        edicion: edicionRef.current,
        propuestas: propuestasRef.current,
        flota: vehiculosRef.current,
      });
      if (cancelled) return;
      if (err) {
        console.error(err);
        setContextEventos([]);
        return;
      }
      setContextEventos((agenda || []).filter((ev) => !isFimbaTrasladoEvent(ev)));
    })();
    return () => {
      cancelled = true;
    };
  }, [
    otrosEventosActive,
    edicionId,
    otrosGrupoIds.length,
    filtroOrigen,
    // Re-sync when trayectos refresh (same edition)
    eventos,
  ]);

  useEffect(() => {
    if (highlightEventIds.length === 0) return undefined;
    const t = setTimeout(() => setHighlightEventIds([]), 6000);
    return () => clearTimeout(t);
  }, [highlightEventIds]);

  const otrosCategoryOptions = useMemo(() => {
    const merged = mergeFimbaAgendaCategories({
      dbCategorias,
      catalogTipos,
      rowDerived: [],
    });
    return merged
      .filter((c) => Number(c.id) !== OFRN_CATEGORIA_TRANSPORTE_ID)
      .map((c) => ({ value: c.id, label: c.nombre }));
  }, [dbCategorias, catalogTipos]);

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

    let context = [];
    if (otrosEventosActive) {
      const transportIds = new Set(
        (eventos || []).map((e) => Number(e.id)).filter(Number.isFinite),
      );
      context = (contextEventos || [])
        .filter((ev) => !transportIds.has(Number(ev.id)))
        .filter((ev) =>
          eventMatchesOtrosEventosContext(ev, {
            categoryIds: otrosCategoryIds,
            propuestaIds: otrosPropuestaIds,
            grupoIds: otrosGrupoIds,
          }),
        )
        .filter((ev) => {
          if (filtroOrigen === "fimba") return ev.es_fimba;
          if (filtroOrigen === "ofrn") return ev.es_ofrn;
          return true;
        })
        .map((ev) => ({ ...ev, es_contexto_agenda: true }));
    }

    return sortFimbaAgendaRows([...list, ...context]);
  }, [
    eventos,
    filtroOrigen,
    selectedVehiculoIds,
    otrosEventosActive,
    contextEventos,
    otrosCategoryIds,
    otrosPropuestaIds,
    otrosGrupoIds,
  ]);

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

  const openStopRules = (ev, type, opts = {}) => {
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
    if (opts.transportId != null && opts.transportId !== "") {
      transportId = Number(opts.transportId);
    }
    setStopRulesModal({
      event: ev,
      type,
      transportId: transportId != null ? Number(transportId) : null,
      initialTab: opts.initialTab === "orquesta" ? "orquesta" : "artistas",
    });
  };

  const handleRemoveBoardChip = async (chip, type) => {
    if (!chip?.removable || chip.rutaId == null) return;
    if (!window.confirm("¿Quitar esta definición de parada?")) return;
    const key = `${type}-${chip.rutaId}`;
    setRemovingBoardKey(key);
    const { error: err } = await clearFimbaPropuestaRutaStop(chip.rutaId, type);
    setRemovingBoardKey(null);
    if (err) {
      setError(err.message || "No se pudo quitar la asignación");
      return;
    }
    softRefresh({ rutas: true });
  };

  const preferVehicleIdsForMetrics =
    selectedVehiculoIds.length > 0 &&
    selectedVehiculoIds.length < vehiculos.length
      ? selectedVehiculoIds
      : null;

  const handleDelete = async (ev) => {
    const label = stripHtml(ev.actividad) || ev.tipo_nombre || "trayecto";
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
    softRefresh({ eventos: true, rutas: true });
  };

  const handleDuplicate = async (ev) => {
    const label = stripHtml(ev.actividad) || ev.tipo_nombre || "trayecto";
    if (
      !window.confirm(
        `¿Duplicar «${label}» del ${formatFecha(ev.fecha)}?\n\nSe copia tipo, horarios, detalle, locación, equipaje, tags y flota. No se copian subidas/bajadas de artistas.`,
      )
    ) {
      return;
    }
    setError(null);
    const { evento: copy, error: err } = await duplicateFimbaEvento(ev, {
      id_gira: edicion?.id_gira ?? ev.id_gira,
      usa_transporte: true,
      logisticsSummary,
      propuestaRoutes,
    });
    if (err || !copy?.id) {
      setError(err?.message || "No se pudo duplicar");
      return;
    }
    await softRefresh({ eventos: true, rutas: true });
    setModal({ mode: "edit", evento: copy });
  };

  /**
   * «+»: crea parada intermedia en la secuencia del vehículo (hueco midpoint)
   * y abre edición inline de locación de inmediato.
   */
  const openIntermediateStop = async (ev, metrics) => {
    if (readOnly || creatingIntermediateFromId != null) return;
    const vehicleId =
      metrics?.primary?.id_gira_transporte ??
      metrics?.perVehicle?.[0]?.id_gira_transporte ??
      giraTransporteIdsFromEvent(ev)[0] ??
      null;
    if (vehicleId == null || vehicleId === "") return;
    if (!edicion?.id_gira) {
      setError("Edición sin gira enlazada");
      return;
    }

    const nextEv = metrics?.next_event_raw || metrics?.next_event || null;
    const sched = defaultIntermediateStopSchedule(ev, nextEv);
    setCreatingIntermediateFromId(String(ev.id));
    setError(null);
    try {
      const { evento: created, error: err } = await createDestinoStopEvent({
        currentEv: ev,
        vehicleId: Number(vehicleId),
        nextEv,
        fecha: sched.fecha || ev.fecha || "",
        horaInicio: sched.hora_inicio || "",
        idLocacion: null,
        allowEmptyLocacion: true,
        actividad: "Parada intermedia",
        idGira: edicion.id_gira,
        vehiculos,
        idPropuestasTags: filtroArtista ? [filtroArtista] : [],
      });
      if (err || !created?.id) {
        setError(err?.message || "No se pudo crear la parada intermedia");
        return;
      }
      await softRefresh({ eventos: true, rutas: true });
      const refreshed =
        (eventosRef.current || []).find(
          (x) => String(x.id) === String(created.id),
        ) || created;
      setHighlightEventIds([refreshed.id]);
      // Inline edit locación (mismo patrón que beginCellEdit; definido más abajo)
      const key = String(refreshed.id);
      setEventDrafts((prev) => {
        if (prev[key]) return prev;
        const n = { ...prev, [key]: draftFromEvent(refreshed) };
        eventDraftsRef.current = n;
        return n;
      });
      setEditingCell({ eventId: key, field: "locacion" });
    } finally {
      setCreatingIntermediateFromId(null);
    }
  };

  /**
   * «+» en divisor de pausa: crea parada intermedia a ±1 h del ancla
   * (top = 1 h después del prev; bottom = 1 h antes del next).
   */
  const createPauseOffsetStop = async ({
    actionKey,
    prevEv,
    nextEv,
    vehicleId,
    deltaMinutes,
  }) => {
    if (readOnly || creatingIntermediateFromId != null) return;
    if (!prevEv?.id || vehicleId == null || vehicleId === "") return;
    if (!edicion?.id_gira) {
      setError("Edición sin gira enlazada");
      return;
    }

    const anchorEv = deltaMinutes >= 0 ? prevEv : nextEv;
    if (!anchorEv) {
      setError("No hay evento ancla para la pausa");
      return;
    }
    const sched = offsetEventDateTime(
      anchorEv.fecha,
      anchorEv.hora_inicio,
      deltaMinutes,
    );
    if (!sched.hora_inicio) {
      setError("No se pudo calcular la hora de la nueva parada");
      return;
    }

    setCreatingIntermediateFromId(actionKey);
    setError(null);
    try {
      const { evento: created, error: err } = await createDestinoStopEvent({
        currentEv: prevEv,
        vehicleId: Number(vehicleId),
        nextEv: nextEv || null,
        fecha: sched.fecha || prevEv.fecha || "",
        horaInicio: sched.hora_inicio,
        idLocacion: null,
        allowEmptyLocacion: true,
        actividad: "Parada intermedia",
        idGira: edicion.id_gira,
        vehiculos,
        idPropuestasTags: filtroArtista ? [filtroArtista] : [],
      });
      if (err || !created?.id) {
        setError(err?.message || "No se pudo crear la parada intermedia");
        return;
      }
      await softRefresh({ eventos: true, rutas: true });
      const refreshed =
        (eventosRef.current || []).find(
          (x) => String(x.id) === String(created.id),
        ) || created;
      setHighlightEventIds([refreshed.id]);
      const key = String(refreshed.id);
      setEventDrafts((prev) => {
        if (prev[key]) return prev;
        const n = { ...prev, [key]: draftFromEvent(refreshed) };
        eventDraftsRef.current = n;
        return n;
      });
      setEditingCell({ eventId: key, field: "locacion" });
    } finally {
      setCreatingIntermediateFromId(null);
    }
  };

  const openRecorridoIntermedio = ({ prevEv, nextEv, vehicleId }) => {
    if (readOnly || !prevEv?.id || vehicleId == null || vehicleId === "") return;
    setRecorridoModal({
      prevEv,
      nextEv: nextEv || null,
      vehicleId: Number(vehicleId),
      idPropuestasTags: filtroArtista ? [filtroArtista] : [],
    });
  };

  /**
   * Destino → crea la parada siguiente (intermedia si hay next; cola si no).
   * Prefill: hora com del next asignado, o form, o midpoint/+30m.
   * No se guarda hora_fin en el evento actual.
   */
  const openDestinoStop = (ev, metrics, opts = {}) => {
    const vehicleId =
      opts.vehicleId ??
      metrics?.primary?.id_gira_transporte ??
      metrics?.perVehicle?.[0]?.id_gira_transporte ??
      giraTransporteIdsFromEvent(ev)[0] ??
      null;
    if (vehicleId == null || vehicleId === "") return;

    const nextEv = metrics?.next_event_raw || metrics?.next_event || null;
    const evForFin =
      opts.horaFinFromForm !== undefined
        ? { ...ev, hora_fin: opts.horaFinFromForm || null }
        : ev;
    const schedule = buildDestinoStopSchedule(
      evForFin,
      nextEv,
      opts.horaFinFromForm,
    );
    setDestinoModal({
      ev: evForFin,
      vehicleId: Number(vehicleId),
      nextEv,
      schedule: {
        fecha: schedule.fecha || ev.fecha || "",
        hora_inicio: schedule.hora_inicio || null,
      },
    });
  };

  const handleOpenEventoEdit = useCallback(
    async (eventoId) => {
      if (eventoId == null || eventoId === "") return;
      await softRefresh({ eventos: true });
      const ev = (eventosRef.current || []).find(
        (x) => String(x.id) === String(eventoId),
      );
      if (ev) {
        setModal({ mode: "edit", evento: ev });
      }
    },
    [softRefresh],
  );

  const toggleEditMode = () => {
    setEditMode((v) => {
      const next = !v;
      if (next) setEditingVehiculoId(null);
      setEditingCell(null);
      return next;
    });
  };

  const beginCellEdit = (ev, field) => {
    if (readOnly || !INLINE_CELL_FIELDS.has(field)) return;
    // Filas de «Ver otros eventos» solo se editan vía modal (lápiz).
    if (ev?.es_contexto_agenda) return;
    const key = String(ev.id);
    setEventDrafts((prev) => {
      if (prev[key]) return prev;
      const n = { ...prev, [key]: draftFromEvent(ev) };
      eventDraftsRef.current = n;
      return n;
    });
    setEditingCell({ eventId: key, field });
  };

  const endCellEdit = (eventoId, field) => {
    setEditingCell((cur) => {
      if (!cur) return null;
      if (String(cur.eventId) !== String(eventoId)) return cur;
      if (field && cur.field !== field) return cur;
      return null;
    });
  };

  const isCellEditing = (eventoId, field) => {
    // Locación usa LocationSelectWithCreate (pesado): solo la celda activa.
    // Contexto agenda: nunca inline (solo modal).
    const inTransportList = (eventosRef.current || []).some(
      (e) => String(e.id) === String(eventoId),
    );
    if (!inTransportList) return false;
    if (editMode && field !== "locacion") return true;
    return (
      editingCell != null &&
      String(editingCell.eventId) === String(eventoId) &&
      editingCell.field === field
    );
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
          actividad: draft.actividad,
          vuelo: draft.vuelo,
          observaciones: draft.observaciones,
          id_locacion: draft.id_locacion,
          stripDestino: true,
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
        destino: "",
        vuelo: patched.vuelo,
        observaciones: patched.observaciones,
        id_locacion: patched.id_locacion ?? null,
        locaciones: patched.locaciones ?? null,
        locacion_nombre:
          patched.locacion_nombre || patched.locaciones?.nombre || null,
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
      // Capacidad / labels: flota + trayectos (sin logistics OFRN ni spinner)
      await softRefresh({ flota: true, eventos: true });
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

  if (initialLoading) {
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
                          <FimbaTransportReportsMenu
                            vehiculo={gt}
                            sequence={sequencesByVehicle.get(Number(gt.id))}
                            edicionNombre={edicionLabel}
                            ofrnPassengerById={ofrnPassengerById}
                            participantesByPropuesta={participantesByPropuesta}
                            disabled={isExporting}
                          />
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
            {!readOnly && (
              <button
                type="button"
                className="fimba-btn"
                onClick={() => setShowProgramar(true)}
                title="Programar un viaje: salida + llegada + vehículo óptimo"
                style={{
                  padding: "0.35rem 0.7rem",
                  fontSize: "0.78rem",
                  fontWeight: 700,
                  background: "var(--fimba-deep)",
                  color: "#fff",
                  borderColor: "var(--fimba-deep)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <IconCalendarPlus size={14} /> Programar transporte
              </button>
            )}
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
            <button
              type="button"
              className={`fimba-btn fimba-chip${
                showOtrosEventos || otrosEventosActive ? " fimba-chip-on" : ""
              }`}
              onClick={() => setShowOtrosEventos((v) => !v)}
              title="Intercalar conciertos, ensayos u otros eventos de agenda"
              style={{
                padding: "0.3rem 0.65rem",
                fontSize: "0.78rem",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <IconEye size={13} /> Ver otros eventos
              {otrosEventosActive ? ` (${otrosCategoryIds.length + otrosPropuestaIds.length + otrosGrupoIds.length})` : ""}
            </button>
          </div>
        </div>
        {(showOtrosEventos || otrosEventosActive) && (
          <div
            className="fimba-otros-eventos-panel"
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 12,
              alignItems: "flex-end",
              marginBottom: 12,
              padding: "0.65rem 0.75rem",
              background: "rgba(148, 33, 109, 0.04)",
              border: "1px solid var(--fimba-border)",
              borderRadius: 8,
            }}
          >
            <div style={{ minWidth: 180, maxWidth: 240, flex: "1 1 180px" }}>
              <label className="fimba-label">Categoría</label>
              <MultiSelectDropdown
                className="w-full"
                label="Categoría"
                placeholder="Conciertos, ensayos…"
                options={otrosCategoryOptions}
                value={otrosCategoryIds}
                onChange={setOtrosCategoryIds}
                compact
                summaryMode="names"
                summaryMaxNames={2}
              />
            </div>
            <div style={{ minWidth: 180, maxWidth: 240, flex: "1 1 180px" }}>
              <label className="fimba-label">Artistas FIMBA</label>
              <MultiSelectDropdown
                className="w-full"
                label="Artistas"
                placeholder="Ninguno"
                options={sortFimbaPropuestasByNombre(propuestas).map((p) => ({
                  value: p.id,
                  label: p.nombre,
                }))}
                value={otrosPropuestaIds}
                onChange={setOtrosPropuestaIds}
                compact
                summaryMode="names"
                summaryMaxNames={2}
              />
            </div>
            <div style={{ minWidth: 160, maxWidth: 220, flex: "1 1 160px" }}>
              <label className="fimba-label">Grupos OFRN</label>
              <MultiSelectDropdown
                className="w-full"
                label="Grupos OFRN"
                placeholder="Ninguno"
                options={(giraGrupos || []).map((g) => ({
                  value: g.id,
                  label: g.nombre,
                }))}
                value={otrosGrupoIds}
                onChange={setOtrosGrupoIds}
                compact
                summaryMode="names"
                summaryMaxNames={2}
              />
            </div>
            {otrosEventosActive && (
              <button
                type="button"
                className="fimba-btn fimba-btn-ghost"
                onClick={() => {
                  setOtrosCategoryIds([]);
                  setOtrosPropuestaIds([]);
                  setOtrosGrupoIds([]);
                }}
                style={{ padding: "0.3rem 0.55rem", fontSize: "0.75rem" }}
              >
                <IconX size={12} /> Limpiar
              </button>
            )}
            <p
              className="fimba-muted"
              style={{
                margin: 0,
                flex: "1 1 100%",
                fontSize: "0.72rem",
              }}
            >
              Los eventos de agenda (no transporte) que coincidan se intercalan
              por fecha/hora. Filas de contexto no tienen Subidas/Bajadas.
            </p>
          </div>
        )}
        <p className="fimba-muted" style={{ margin: "0 0 0.75rem", fontSize: "0.82rem" }}>
          Cada fila es un trayecto o parada ordenado por fecha/hora. Subida/bajada y
          tránsito/cap siguen el criterio OFRN (reglas de ruta +{" "}
          <code style={{ fontSize: "0.75rem" }}>plaza_extra</code>) y plazas FIMBA.
          Tránsito = plazas a bordo al <em>salir</em> de la parada vs{" "}
          <code style={{ fontSize: "0.75rem" }}>capacidad_maxima</code> (libres al hover).
          Origen, fecha y horario quedan fijos al desplazar horizontalmente el resto de la
          planilla. Filtrá un vehículo para la secuencia de esa unidad. Columna{" "}
          <strong>Artistas</strong>: tags del evento (como Agenda). Columnas{" "}
          <strong>Subidas</strong> / <strong>Bajadas</strong>: quién sube/baja en la
          parada (plazas FIMBA + reglas OFRN); clic para asignar, × para quitar.
          {editMode
            ? " Modo edición: fecha, horas, detalle, vuelo y vehículo FIMBA (una unidad) se guardan solos; locación = clic → buscar/crear."
            : readOnly
              ? ""
              : " Doble clic en fecha, horario, detalle, locación o vuelo para editar en la celda; el lápiz abre el formulario completo."}
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
                      title="Hora de comienzo · hora de fin = hora com del siguiente evento de este vehículo (cian itálico). Sin siguiente con hora → —"
                    >
                      Com · Fin
                    </th>
                    <th>Detalle</th>
                    <th>Locación</th>
                    <th
                      title="Insertar evento intermedio (completa hasta→desde entre esta parada y la siguiente)"
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
                    <th title="Línea Vuelo: en eventos.descripcion (misma fuente que Agenda)">
                      Vuelo
                    </th>
                    <th>Vehículo</th>
                    <th
                      title="Artistas taggeados en el evento (misma fuente que Agenda)"
                    >
                      Artistas
                    </th>
                    <th
                      className="fimba-planilla-board-th fimba-planilla-board-th-up"
                      title="Quién sube en esta parada (artistas FIMBA + orquesta)"
                    >
                      Subidas
                    </th>
                    <th
                      className="fimba-planilla-board-th fimba-planilla-board-th-down"
                      title="Quién baja en esta parada (artistas FIMBA + orquesta)"
                    >
                      Bajadas
                    </th>
                    <th title="Plazas a bordo al salir de la parada / capacidad de la unidad">
                      Tránsito/cap
                    </th>
                    <th className="fimba-planilla-actions" />
                  </tr>
                </thead>
                <tbody>
                  {eventosFiltrados.map((ev) => {
                    const isContext = Boolean(ev.es_contexto_agenda);
                    const ofrnVeh =
                      vehiculos.find(
                        (g) => Number(g.id) === Number(ev.id_gira_transporte),
                      ) || null;
                    const vehLabel =
                      isContext
                        ? "—"
                        : (ev.vehiculos || []).length > 0
                        ? (ev.vehiculos || [])
                            .map((r) => {
                              const label = labelGiraTransporte(r.giras_transportes);
                              const pl = Math.max(0, Number(r.plazas) || 0);
                              // Reserva técnica: solo mostrar si > 0 (0 = sin cupo anónimo)
                              return pl > 0 ? `${label} (reserva ${pl})` : label;
                            })
                            .join(", ") || "—"
                        : ofrnVeh
                          ? labelGiraTransporte(ofrnVeh)
                          : ev.es_ofrn && !ev.es_fimba
                            ? "—"
                            : "SIN SERVICIO";
                    const metrics = isContext
                      ? {
                          primary: null,
                          perVehicle: [],
                          location: formatEventLocation(ev),
                          destino_siguiente: null,
                          hora_fin_display: {
                            value: ev.hora_fin
                              ? String(ev.hora_fin).slice(0, 5)
                              : null,
                            isCalculated: false,
                          },
                          next_event: null,
                        }
                      : boardingMetricsForEventRow(
                          ev,
                          sequencesByVehicle,
                          preferVehicleIdsForMetrics,
                        );
                    const stop = metrics.primary?.stop || null;
                    const multiVeh =
                      (metrics.perVehicle || []).filter((p) => p.stop).length > 1;
                    const locacion = metrics.location || formatEventLocation(ev);
                    const destinoSiguiente = isContext
                      ? "—"
                      : metrics.destino_siguiente != null &&
                          metrics.destino_siguiente !== "—"
                        ? metrics.destino_siguiente
                        : TRANSPORT_DESTINO_SIN_SIGUIENTE;
                    const horaFinDisp = metrics.hora_fin_display || {
                      value: null,
                      isCalculated: false,
                    };
                    const enTransito = stop?.en_transito;
                    const cap = stop?.capacidad;
                    const libres = stop?.libres;
                    const overbook = Boolean(stop?.overbook);
                    const rowClass =
                      isContext
                        ? "fimba-row-contexto"
                        : ev.origen === "ofrn"
                        ? "fimba-row-ofrn"
                        : ev.origen === "ambos"
                          ? "fimba-row-ambos"
                          : "";
                    const canEditStops =
                      !readOnly &&
                      !isContext &&
                      (giraTransporteIdsFromEvent(ev).length > 0 ||
                        vehiculos.length > 0);
                    const primaryVehicleId =
                      metrics.primary?.id_gira_transporte ??
                      metrics.perVehicle?.[0]?.id_gira_transporte ??
                      giraTransporteIdsFromEvent(ev)[0] ??
                      null;
                    const upsBoard = isContext
                      ? { chips: [], total: 0 }
                      : resolveStopBoardAlightChips({
                      eventId: ev.id,
                      idGiraTransporte: primaryVehicleId,
                      type: "up",
                      propuestaRoutes,
                      propuestas,
                      stop,
                      ofrnRouteRules,
                      ofrnPassengers,
                      ofrnLocalities,
                      ofrnRegions,
                    });
                    const downsBoard = isContext
                      ? { chips: [], total: 0 }
                      : resolveStopBoardAlightChips({
                      eventId: ev.id,
                      idGiraTransporte: primaryVehicleId,
                      type: "down",
                      propuestaRoutes,
                      propuestas,
                      stop,
                      ofrnRouteRules,
                      ofrnPassengers,
                      ofrnLocalities,
                      ofrnRegions,
                    });
                    const isCreatingIntermediateHere =
                      creatingIntermediateFromId != null &&
                      creatingIntermediateFromId === String(ev.id);
                    const canAddIntermediate =
                      !readOnly &&
                      !isContext &&
                      creatingIntermediateFromId == null &&
                      primaryVehicleId != null &&
                      primaryVehicleId !== "";
                    const nextEvForRow =
                      metrics?.next_event_raw || metrics?.next_event || null;
                    const pauseAfterRow = Boolean(metrics?.pause_after);
                    const pausePrevEv =
                      !isContext &&
                      (() => {
                        const vid = Number(primaryVehicleId);
                        if (!Number.isFinite(vid)) return null;
                        const seq = sequencesByVehicle.get(vid);
                        return previousAssignedStopInVehicleSequence(
                          seq,
                          ev.id,
                          vid,
                        );
                      })();
                    const pauseBeforeRow =
                      Boolean(pausePrevEv) &&
                      (() => {
                        const vid = Number(primaryVehicleId);
                        if (!Number.isFinite(vid)) return false;
                        // 1) Direct location key match (same locación → vehicle staying put)
                        if (isVehiclePauseBetweenStops(pausePrevEv, ev)) {
                          return true;
                        }
                        // 2) Fallback: compute pause_after for prevEv via boardingMetrics.
                        //    Keeps the divider aligned with the same "next assigned stop"
                        //    logic used by destino/hora fin, even if sortedEvents contains
                        //    hidden endpoint rows between the two visible stops.
                        const prevMetrics = boardingMetricsForEventRow(
                          pausePrevEv,
                          sequencesByVehicle,
                          [vid],
                        );
                        return Boolean(prevMetrics?.pause_after);
                      })();
                    const pauseActionKeyTop = pausePrevEv
                      ? `pause-top:${pausePrevEv.id}`
                      : null;
                    const pauseActionKeyBottom = `pause-bottom:${ev.id}`;
                    const isCreatingPauseTop =
                      creatingIntermediateFromId != null &&
                      creatingIntermediateFromId === pauseActionKeyTop;
                    const isCreatingPauseBottom =
                      creatingIntermediateFromId != null &&
                      creatingIntermediateFromId === pauseActionKeyBottom;
                    const canPauseCreate =
                      !readOnly &&
                      pauseBeforeRow &&
                      pausePrevEv &&
                      primaryVehicleId != null &&
                      primaryVehicleId !== "" &&
                      creatingIntermediateFromId == null;
                    const nextEvHasRealStop = Boolean(nextEvForRow);
                    const horaCom = sliceTime(ev.hora_inicio);
                    const aBordo = stop?.a_bordo || null;
                    const evKey = String(ev.id);
                    const evDraft = eventDrafts[evKey] || draftFromEvent(ev);
                    const evStatus = eventRowStatus[evKey] || "idle";
                    const evSaving = evStatus === "saving";
                    const canAssignVeh =
                      editMode && !isContext && canInlineAssignVehicle(ev);
                    const isHighlighted = highlightEventIds.some(
                      (id) => String(id) === String(ev.id),
                    );
                    const evRowClass = [
                      rowClass,
                      editMode ? rowStatusClass(evStatus) : "",
                      isHighlighted ? "fimba-row-highlight" : "",
                    ]
                      .filter(Boolean)
                      .join(" ");
                    const openBoard = (type, openOpts = {}) =>
                      openStopRules(ev, type, {
                        transportId: primaryVehicleId,
                        ...openOpts,
                      });
                    return (
                      <React.Fragment key={ev.id}>
                        {pauseBeforeRow && (
                          <tr className="fimba-pause-divider-row">
                            <td colSpan={100}>
                              <button
                                type="button"
                                className="fimba-btn fimba-btn-ghost fimba-pause-divider-add fimba-pause-divider-add--top"
                                disabled={
                                  !canPauseCreate && !isCreatingPauseTop
                                }
                                title="Crear parada después de esta"
                                aria-label="Crear parada después de esta"
                                aria-busy={isCreatingPauseTop}
                                onClick={() =>
                                  createPauseOffsetStop({
                                    actionKey: pauseActionKeyTop,
                                    prevEv: pausePrevEv,
                                    nextEv: ev,
                                    vehicleId: primaryVehicleId,
                                    deltaMinutes: 60,
                                  })
                                }
                                style={{
                                  opacity:
                                    canPauseCreate || isCreatingPauseTop
                                      ? 1
                                      : 0.35,
                                }}
                              >
                                {isCreatingPauseTop ? (
                                  <IconLoader
                                    size={11}
                                    className="animate-spin"
                                  />
                                ) : (
                                  <IconPlus size={11} />
                                )}
                              </button>
                              <button
                                type="button"
                                className="fimba-btn fimba-btn-ghost fimba-pause-divider-add fimba-pause-divider-add--bottom"
                                disabled={
                                  !canPauseCreate && !isCreatingPauseBottom
                                }
                                title="Crear parada después de esta"
                                aria-label="Crear parada después de esta (antes del siguiente)"
                                aria-busy={isCreatingPauseBottom}
                                onClick={() =>
                                  createPauseOffsetStop({
                                    actionKey: pauseActionKeyBottom,
                                    prevEv: pausePrevEv,
                                    nextEv: ev,
                                    vehicleId: primaryVehicleId,
                                    deltaMinutes: -60,
                                  })
                                }
                                style={{
                                  opacity:
                                    canPauseCreate || isCreatingPauseBottom
                                      ? 1
                                      : 0.35,
                                }}
                              >
                                {isCreatingPauseBottom ? (
                                  <IconLoader
                                    size={11}
                                    className="animate-spin"
                                  />
                                ) : (
                                  <IconPlus size={11} />
                                )}
                              </button>
                              <div className="fimba-pause-divider-inner">
                                <div
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    flexWrap: "wrap",
                                    gap: "0.45rem 0.75rem",
                                    color: "#0e7490",
                                    fontSize: "0.78rem",
                                    fontWeight: 600,
                                    letterSpacing: "0.02em",
                                    opacity: 0.9,
                                  }}
                                >
                                  <span
                                    style={{
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: "0.4rem",
                                    }}
                                  >
                                    <IconPause size={13} />
                                    Pausa · vehículo libre
                                  </span>
                                  {!readOnly ? (
                                    <button
                                      type="button"
                                      className="fimba-btn fimba-btn-ghost"
                                      disabled={!canPauseCreate}
                                      onClick={() =>
                                        openRecorridoIntermedio({
                                          prevEv: pausePrevEv,
                                          nextEv: ev,
                                          vehicleId: primaryVehicleId,
                                        })
                                      }
                                      style={{
                                        padding: "0.1rem 0.35rem",
                                        fontSize: "0.75rem",
                                        fontWeight: 600,
                                        color: "#0e7490",
                                        textDecoration: "underline",
                                        textUnderlineOffset: 2,
                                        opacity: canPauseCreate ? 1 : 0.4,
                                      }}
                                    >
                                      Crear recorrido intermedio
                                    </button>
                                  ) : null}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      <tr
                        className={evRowClass}
                        title={
                          isContext
                            ? "Evento de agenda (contexto). Sin subidas/bajadas de transporte."
                            : readOnly
                            ? undefined
                            : "Doble clic en fecha / horario / detalle / locación / vuelo · lápiz = formulario completo"
                        }
                      >
                        {editMode && (
                          <SyncDot
                            status={evStatus}
                            error={eventRowErrors[evKey]}
                            sticky
                          />
                        )}
                        <td className="fimba-sticky-origen">
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                            {isContext && (
                              <span className="fimba-badge fimba-badge-contexto">
                                {ev.tipo_nombre ||
                                  ev.categoria_nombre ||
                                  "Agenda"}
                              </span>
                            )}
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
                            {!isContext && !ev.es_fimba && !ev.es_ofrn && (
                              <span
                                className="fimba-muted"
                                style={{ fontSize: "0.75rem" }}
                              >
                                —
                              </span>
                            )}
                          </div>
                        </td>
                        <td
                          className="fimba-sticky-fecha"
                          onDoubleClick={
                            readOnly
                              ? undefined
                              : (e) => {
                                  e.stopPropagation();
                                  if (!isCellEditing(ev.id, "fecha")) {
                                    beginCellEdit(ev, "fecha");
                                  }
                                }
                          }
                          title={
                            readOnly
                              ? undefined
                              : "Doble clic para cambiar la fecha"
                          }
                          style={
                            !readOnly && !isCellEditing(ev.id, "fecha")
                              ? { cursor: "pointer" }
                              : undefined
                          }
                        >
                          {isCellEditing(ev.id, "fecha") ? (
                            <input
                              className="fimba-cell-input fimba-cell-date"
                              type="date"
                              autoFocus={!editMode}
                              value={evDraft.fecha || ""}
                              disabled={evSaving}
                              onChange={(e) => {
                                changeAndCommitEvento(
                                  ev.id,
                                  "fecha",
                                  e.target.value,
                                );
                                if (!editMode) endCellEdit(ev.id, "fecha");
                              }}
                              onBlur={() => {
                                if (!editMode) endCellEdit(ev.id, "fecha");
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  endCellEdit(ev.id, "fecha");
                                }
                              }}
                            />
                          ) : (
                            formatFecha(ev.fecha)
                          )}
                        </td>
                        <td
                          className="fimba-sticky-hora"
                          onDoubleClick={
                            readOnly
                              ? undefined
                              : (e) => {
                                  e.stopPropagation();
                                  if (!isCellEditing(ev.id, "hora")) {
                                    beginCellEdit(ev, "hora");
                                  }
                                }
                          }
                          title={
                            readOnly
                              ? undefined
                              : "Doble clic para editar hora de comienzo (la fin es la del siguiente evento)"
                          }
                          style={
                            !readOnly && !isCellEditing(ev.id, "hora")
                              ? { cursor: "pointer" }
                              : undefined
                          }
                        >
                          {isCellEditing(ev.id, "hora") ? (
                            <div
                              className="fimba-hora-edit"
                              onBlur={(e) => {
                                if (e.currentTarget.contains(e.relatedTarget)) {
                                  return;
                                }
                                commitEvento(ev.id);
                                if (!editMode) endCellEdit(ev.id, "hora");
                              }}
                            >
                              <input
                                className="fimba-cell-input"
                                type="time"
                                autoFocus={!editMode}
                                value={evDraft.hora_inicio || ""}
                                disabled={evSaving}
                                title="Hora de comienzo"
                                onChange={(e) =>
                                  setEventField(
                                    ev.id,
                                    "hora_inicio",
                                    e.target.value,
                                  )
                                }
                              />
                              <input
                                className="fimba-cell-input"
                                type="time"
                                value={horaFinDisp.value || ""}
                                disabled
                                title={
                                  horaFinDisp.isCalculated
                                    ? "Hora com del siguiente evento de este vehículo (no se guarda en este evento)"
                                    : "Sin siguiente evento con hora en este vehículo"
                                }
                                readOnly
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
                                      ? "Hora com del siguiente evento asignado a este vehículo"
                                      : "Sin siguiente evento con hora en la agenda de este vehículo"
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
                                <span
                                  className="fimba-muted"
                                  title={
                                    pauseAfterRow
                                      ? "Pausa: la siguiente parada del mismo vehículo repite la locación"
                                      : undefined
                                  }
                                >
                                  —
                                </span>
                              )}
                            </>
                          )}
                        </td>
                        <td
                          className="fimba-planilla-wrap"
                          onDoubleClick={
                            readOnly
                              ? undefined
                              : (e) => {
                                  e.stopPropagation();
                                  if (
                                    !hasHtmlMarkup(evDraft.actividad) &&
                                    !isCellEditing(ev.id, "actividad")
                                  ) {
                                    beginCellEdit(ev, "actividad");
                                  }
                                }
                          }
                          title={
                            readOnly
                              ? undefined
                              : hasHtmlMarkup(ev.actividad)
                                ? "Detalle con formato: editar en el lápiz (formulario)"
                                : "Doble clic para editar detalle / obs."
                          }
                          style={{
                            fontWeight: 600,
                            ...(!readOnly &&
                            !isCellEditing(ev.id, "actividad") &&
                            !hasHtmlMarkup(ev.actividad)
                              ? { cursor: "pointer" }
                              : {}),
                          }}
                        >
                          {isCellEditing(ev.id, "actividad") ? (
                            <div
                              style={{ display: "flex", flexDirection: "column", gap: 4 }}
                              onBlur={(e) => {
                                if (e.currentTarget.contains(e.relatedTarget)) {
                                  return;
                                }
                                commitEvento(ev.id);
                                if (!editMode) endCellEdit(ev.id, "actividad");
                              }}
                            >
                              {hasHtmlMarkup(evDraft.actividad) ? (
                                <>
                                  <FimbaEventDetallePreview html={evDraft.actividad} />
                                  <span
                                    className="fimba-muted"
                                    style={{ fontSize: "0.68rem", fontWeight: 400 }}
                                  >
                                    Con formato: editar en el modal del evento
                                  </span>
                                </>
                              ) : (
                                <input
                                  className="fimba-cell-input"
                                  autoFocus={!editMode}
                                  value={evDraft.actividad}
                                  disabled={evSaving}
                                  placeholder="Detalle"
                                  onChange={(e) =>
                                    setEventField(ev.id, "actividad", e.target.value)
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault();
                                      commitEvento(ev.id);
                                      if (!editMode) endCellEdit(ev.id, "actividad");
                                    }
                                  }}
                                />
                              )}
                              <input
                                className="fimba-cell-input"
                                value={evDraft.observaciones}
                                disabled={evSaving}
                                placeholder="Obs. equipaje"
                                title="Observaciones Equipaje"
                                onChange={(e) =>
                                  setEventField(ev.id, "observaciones", e.target.value)
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    commitEvento(ev.id);
                                    if (!editMode) endCellEdit(ev.id, "actividad");
                                  }
                                }}
                              />
                            </div>
                          ) : (
                            <>
                              <FimbaEventDetallePreview
                                html={ev.actividad}
                                empty={ev.tipo_nombre || "—"}
                              />
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
                          className="fimba-muted fimba-planilla-wrap fimba-planilla-loc-cell"
                          style={{
                            fontSize: "0.85rem",
                            ...(!readOnly && !isCellEditing(ev.id, "locacion")
                              ? { cursor: "pointer" }
                              : {}),
                          }}
                          title={
                            readOnly
                              ? locacion
                              : isCellEditing(ev.id, "locacion")
                                ? "Buscar o crear locación"
                                : editMode
                                  ? "Clic para cambiar locación (buscar / crear)"
                                  : "Doble clic para cambiar locación (buscar / crear)"
                          }
                          onClick={
                            readOnly || !editMode
                              ? undefined
                              : (e) => {
                                  if (isCellEditing(ev.id, "locacion")) return;
                                  if (
                                    e.target.closest(
                                      "button, a, input, select, textarea, label",
                                    )
                                  ) {
                                    return;
                                  }
                                  beginCellEdit(ev, "locacion");
                                }
                          }
                          onDoubleClick={
                            readOnly
                              ? undefined
                              : (e) => {
                                  e.stopPropagation();
                                  if (!isCellEditing(ev.id, "locacion")) {
                                    beginCellEdit(ev, "locacion");
                                  }
                                }
                          }
                        >
                          {isCellEditing(ev.id, "locacion") ? (
                            <div
                              className="fimba-planilla-loc-edit"
                              onDoubleClick={(e) => e.stopPropagation()}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <LocationSelectWithCreate
                                supabase={supabase}
                                options={locationOptions}
                                value={evDraft.id_locacion || ""}
                                onChange={(id) => {
                                  const next =
                                    id != null && id !== "" ? String(id) : "";
                                  changeAndCommitEvento(
                                    ev.id,
                                    "id_locacion",
                                    next,
                                  );
                                  endCellEdit(ev.id, "locacion");
                                }}
                                onRefresh={refreshLocations}
                                placeholder="Buscar locación…"
                                className="fimba-planilla-loc-select"
                              />
                            </div>
                          ) : (
                            locacion
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
                            disabled={
                              !canAddIntermediate && !isCreatingIntermediateHere
                            }
                            title={
                              isCreatingIntermediateHere
                                ? "Creando parada intermedia…"
                                : canAddIntermediate
                                  ? nextEvHasRealStop
                                    ? "Insertar evento intermedio (hasta→desde entre esta parada y la siguiente)"
                                    : "Insertar evento después de esta parada (desde = hora fin)"
                                  : creatingIntermediateFromId != null
                                    ? "Creando otra parada…"
                                    : "Asigná un vehículo a esta fila para insertar un evento intermedio"
                            }
                            aria-label={
                              isCreatingIntermediateHere
                                ? "Creando parada intermedia"
                                : "Insertar evento intermedio"
                            }
                            aria-busy={isCreatingIntermediateHere}
                            onClick={() => openIntermediateStop(ev, metrics)}
                            onDoubleClick={(e) => e.stopPropagation()}
                            style={{
                              minWidth: 28,
                              padding: "0.2rem 0.3rem",
                              opacity:
                                canAddIntermediate || isCreatingIntermediateHere
                                  ? 1
                                  : 0.35,
                              color: "var(--fimba-cyan, #0e7490)",
                            }}
                          >
                            {isCreatingIntermediateHere ? (
                              <IconLoader size={14} className="animate-spin" />
                            ) : (
                              <IconPlus size={14} />
                            )}
                          </button>
                        </td>
                        <td
                          className="fimba-muted fimba-planilla-wrap"
                          style={{
                            fontSize: "0.85rem",
                            ...(!readOnly && canAddIntermediate
                              ? { cursor: "pointer" }
                              : {}),
                          }}
                          title={
                            destinoSiguiente === TRANSPORT_DESTINO_SIN_SIGUIENTE
                              ? "Sin siguiente parada en este vehículo"
                              : destinoSiguiente === TRANSPORT_DESTINO_SIN_LOCACION
                                ? "La siguiente parada no tiene locación de catálogo"
                                : `Siguiente parada del mismo vehículo: ${destinoSiguiente}`
                          }
                          onDoubleClick={
                            readOnly || !canAddIntermediate
                              ? undefined
                              : (e) => {
                                  e.stopPropagation();
                                  openDestinoStop(ev, metrics);
                                }
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
                                fontStyle:
                                  destinoSiguiente ===
                                    TRANSPORT_DESTINO_SIN_SIGUIENTE ||
                                  destinoSiguiente ===
                                    TRANSPORT_DESTINO_SIN_LOCACION
                                    ? "italic"
                                    : undefined,
                              }}
                            >
                              {destinoSiguiente}
                            </span>
                            {canAddIntermediate ? (
                              <button
                                type="button"
                                className="fimba-btn fimba-btn-ghost"
                                title={
                                  nextEvHasRealStop
                                    ? "Elegir destino creando evento intermedio"
                                    : "Elegir destino creando la siguiente parada"
                                }
                                aria-label="Elegir destino creando evento"
                                onClick={() => openDestinoStop(ev, metrics)}
                                onDoubleClick={(e) => e.stopPropagation()}
                                style={{
                                  minWidth: 24,
                                  padding: "0.15rem 0.25rem",
                                  flexShrink: 0,
                                  color: "var(--fimba-deep, #94216d)",
                                }}
                              >
                                <IconEdit size={13} />
                              </button>
                            ) : null}
                            {pauseAfterRow ? (
                              <span
                                className="fimba-badge"
                                style={{
                                  background: "rgba(14,116,144,0.10)",
                                  color: "#0e7490",
                                  fontSize: "0.68rem",
                                }}
                                title="Pausa: mismo vehículo, siguiente evento consecutivo en la misma locación"
                              >
                                Pausa
                              </span>
                            ) : null}
                          </span>
                        </td>
                        <td
                          className="fimba-muted fimba-planilla-wrap"
                          style={{
                            fontSize: "0.85rem",
                            maxWidth: "8rem",
                            ...(!readOnly && !isCellEditing(ev.id, "vuelo")
                              ? { cursor: "pointer" }
                              : {}),
                          }}
                          title={
                            readOnly
                              ? ev.vuelo || undefined
                              : "Doble clic para editar vuelo"
                          }
                          onDoubleClick={
                            readOnly
                              ? undefined
                              : (e) => {
                                  e.stopPropagation();
                                  if (!isCellEditing(ev.id, "vuelo")) {
                                    beginCellEdit(ev, "vuelo");
                                  }
                                }
                          }
                        >
                          {isCellEditing(ev.id, "vuelo") ? (
                            <input
                              className="fimba-cell-input"
                              autoFocus={!editMode}
                              value={evDraft.vuelo}
                              disabled={evSaving}
                              placeholder="Vuelo"
                              title="Vuelo / nota (línea Vuelo: en descripcion)"
                              onChange={(e) =>
                                setEventField(ev.id, "vuelo", e.target.value)
                              }
                              onBlur={() => {
                                commitEvento(ev.id);
                                if (!editMode) endCellEdit(ev.id, "vuelo");
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  commitEvento(ev.id);
                                  if (!editMode) endCellEdit(ev.id, "vuelo");
                                }
                              }}
                              onDoubleClick={(e) => e.stopPropagation()}
                            />
                          ) : (
                            ev.vuelo || "—"
                          )}
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
                        <td className="fimba-planilla-wrap" style={{ maxWidth: "11rem" }}>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                            {sortFimbaPropuestasByNombre(ev.propuestas || []).map((p) => (
                              <span
                                key={p.id}
                                className="fimba-badge"
                                style={{
                                  background: p.color ? `${p.color}22` : undefined,
                                  color: p.color || undefined,
                                }}
                              >
                                {p.nombre}
                              </span>
                            ))}
                            {ev.orquesta_label ? (
                              <span
                                className="fimba-muted"
                                style={{ fontSize: "0.8rem" }}
                              >
                                {ev.orquesta_label}
                              </span>
                            ) : null}
                            {(ev.propuestas || []).length === 0 && !ev.orquesta_label ? (
                              <span
                                className="fimba-muted"
                                style={{ fontSize: "0.8rem" }}
                              >
                                Edición
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td className="fimba-planilla-board">
                          {isContext ? (
                            <span className="fimba-muted" style={{ fontSize: "0.8rem" }}>
                              —
                            </span>
                          ) : (
                            <>
                              <PlanillaBoardCell
                                direction="up"
                                chips={upsBoard.chips}
                                total={upsBoard.total}
                                canEdit={canEditStops}
                                removing={
                                  removingBoardKey != null &&
                                  removingBoardKey.startsWith("up-")
                                }
                                onOpen={(opts) => openBoard("up", opts)}
                                onRemoveChip={(chip) =>
                                  handleRemoveBoardChip(chip, "up")
                                }
                              />
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
                            </>
                          )}
                        </td>
                        <td className="fimba-planilla-board">
                          {isContext ? (
                            <span className="fimba-muted" style={{ fontSize: "0.8rem" }}>
                              —
                            </span>
                          ) : (
                            <PlanillaBoardCell
                              direction="down"
                              chips={downsBoard.chips}
                              total={downsBoard.total}
                              canEdit={canEditStops}
                              removing={
                                removingBoardKey != null &&
                                removingBoardKey.startsWith("down-")
                              }
                              onOpen={(opts) => openBoard("down", opts)}
                              onRemoveChip={(chip) =>
                                handleRemoveBoardChip(chip, "down")
                              }
                            />
                          )}
                        </td>
                        {isContext ? (
                          <td className="fimba-muted" style={{ fontSize: "0.85rem" }}>
                            —
                          </td>
                        ) : (
                          <PlanillaTransitoCell
                            enTransito={enTransito}
                            cap={cap}
                            libres={libres}
                            overbook={overbook}
                            aBordo={aBordo}
                          />
                        )}
                        <td className="fimba-planilla-actions">
                          {!readOnly && (
                            <>
                              <button
                                type="button"
                                className="fimba-btn fimba-btn-ghost"
                                onClick={() =>
                                  setModal({
                                    mode: "edit",
                                    evento: ev,
                                    forceTransporte: !isContext,
                                  })
                                }
                                onDoubleClick={(e) => e.stopPropagation()}
                                title="Editar"
                              >
                                <IconEdit size={14} />
                              </button>
                              {!isContext && (
                                <button
                                  type="button"
                                  className="fimba-btn fimba-btn-ghost"
                                  style={{ marginLeft: 4 }}
                                  onClick={() => handleDuplicate(ev)}
                                  onDoubleClick={(e) => e.stopPropagation()}
                                  title="Duplicar"
                                >
                                  <IconCopy size={14} />
                                </button>
                              )}
                              <button
                                type="button"
                                className="fimba-btn fimba-btn-danger"
                                style={{ marginLeft: 4 }}
                                onClick={() => handleDelete(ev)}
                                onDoubleClick={(e) => e.stopPropagation()}
                                title="Eliminar"
                              >
                                <IconTrash size={14} />
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                      </React.Fragment>
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
            forceTransporte={modal.forceTransporte !== false}
            logisticsSummary={logisticsSummary}
            propuestaRoutes={propuestaRoutes}
            ofrnPassengers={ofrnPassengers}
            ofrnAdmissionRules={ofrnAdmissionRules}
            ofrnRegions={ofrnRegions}
            ofrnLocalities={ofrnLocalities}
            ofrnRouteRules={ofrnRouteRules}
            sequencesByVehicle={sequencesByVehicle}
            onClose={() => setModal(null)}
            onSaved={() => {
              setModal(null);
              // Guardar evento no toca fimba_propuesta_rutas.
              softRefresh({ eventos: true });
            }}
            onDuplicate={
              modal.mode === "edit" && modal.evento
                ? () => handleDuplicate(modal.evento)
                : undefined
            }
            // Solo refresca planilla; NO cerrar el modal ni tocar modal.evento
            onBoardingRefresh={handleBoardingRefresh}
            onOpenEventoEdit={handleOpenEventoEdit}
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
              softRefresh({ eventos: true });
            }}
          />,
          document.body,
        )}

      {recorridoModal &&
        edicion &&
        createPortal(
          <FimbaRecorridoIntermedioModal
            context={recorridoModal}
            edicion={edicion}
            vehiculos={vehiculos}
            locationOptions={locationOptions}
            onRefreshLocations={refreshLocations}
            onClose={() => setRecorridoModal(null)}
            onSaved={async (eventos) => {
              setRecorridoModal(null);
              await softRefresh({ eventos: true, rutas: true });
              const ids = (eventos || []).map((e) => e.id).filter(Boolean);
              if (ids.length) setHighlightEventIds(ids);
            }}
          />,
          document.body,
        )}

      {showProgramar &&
        edicion &&
        createPortal(
          <FimbaProgramarTransporteModal
            edicion={edicion}
            vehiculos={vehiculos}
            propuestas={propuestas}
            giraGrupos={giraGrupos}
            sequencesByVehicle={sequencesByVehicle}
            locationOptions={locationOptions}
            onRefreshLocations={refreshLocations}
            onClose={() => setShowProgramar(false)}
            onSaved={async ({ desde, hasta }) => {
              setShowProgramar(false);
              await softRefresh({ eventos: true, rutas: true, logistics: true });
              const ids = [desde?.id, hasta?.id].filter((id) => id != null);
              setHighlightEventIds(ids);
              if (desde?.id) {
                const row =
                  (eventosRef.current || []).find(
                    (x) => String(x.id) === String(desde.id),
                  ) || desde;
                const key = String(row.id);
                setEventDrafts((prev) => {
                  if (prev[key]) return prev;
                  const n = { ...prev, [key]: draftFromEvent(row) };
                  eventDraftsRef.current = n;
                  return n;
                });
                setEditingCell({ eventId: key, field: "actividad" });
              }
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
          initialTab={stopRulesModal.initialTab || "artistas"}
          edicionId={edicion.id}
          giraId={edicion.id_gira}
          vehiculos={vehiculos}
          propuestas={propuestas}
          passengers={ofrnPassengers}
          admissionRules={ofrnAdmissionRules}
          regions={ofrnRegions}
          localities={ofrnLocalities}
          sequencesByVehicle={sequencesByVehicle}
          onRefresh={handleBoardingRefresh}
        />
      )}
    </div>
  );
}

/** Página de transportes anclada a un artista (misma UI con filtro inicial). */
export function FimbaArtistaTransportPage() {
  return <FimbaTransportPage />;
}
