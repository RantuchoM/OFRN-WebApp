import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useParams, useSearchParams, useLocation } from "react-router-dom";
import {
  IconArrowLeft,
  IconPlus,
  IconEdit,
  IconTrash,
  IconCopy,
  IconLoader,
  IconClock,
  IconSearch,
  IconX,
  IconCheck,
  IconPrinter,
  IconLayers,
  IconFileText,
} from "../../components/ui/Icons";
import MultiSelectDropdown from "../../components/ui/MultiSelectDropdown";
import LocationSelectWithCreate from "../../components/forms/LocationSelectWithCreate";
import FimbaEventArtistasTagsCell from "./FimbaEventArtistasTagsCell";
import {
  categoriesFromTiposEvento,
  mergeFimbaAgendaCategories,
  listTiposEventoForFimba,
  deleteFimbaEvento,
  duplicateFimbaEvento,
  eventUsesDerivedHoraFin,
  FIMBA_DEFAULT_TIPO_EVENTO,
  getFimbaAgendaEvento,
  getFimbaEdicionById,
  giraTransporteIdsFromEvent,
  labelGiraTransporte,
  listFimbaAgenda,
  listFimbaFlota,
  listFimbaGiraGrupos,
  listFimbaPropuestaRutas,
  listFimbaPropuestas,
  loadFimbaTransportLogisticsSummary,
  computeFimbaCapacity,
  patchFimbaEventoPlanilla,
  upsertFimbaAgendaConsulta,
} from "../../services/fimbaService";
import { supabase } from "../../services/supabase";
import { normalizeForSearch } from "../../utils/sanitize";
import { hasHtmlMarkup, stripHtml } from "../../utils/eventDisplayUtils";
import { formatFechaLargaEs, formatWeekdayFullLocal } from "../../utils/dates";
import {
  sortFimbaAgendaRows,
  sortFimbaPropuestasByNombre,
} from "../../utils/fimbaAgendaSort";
import {
  buildFimbaAgendaPdfSubTitle,
  exportFimbaAgendaToPDF,
} from "../../utils/fimbaAgendaPdf";
import {
  buildAllVehicleBoardingSequences,
  defaultGapFillEventSchedule,
  formatAgendaOrigenLabel,
  resolveAgendaDestinoLabel,
  resolveLegacyDestinoFromDescripcion,
  resolveEventAboardCount,
  TRANSPORT_DESTINO_SIN_SIGUIENTE,
  TRANSPORT_DESTINO_SIN_LOCACION,
} from "../../utils/fimbaTransportBoarding";
import {
  FIMBA_AGENDA_TUTTI_VALUE,
  buildFimbaAgendaConsultaLegacySharePath,
  buildFimbaAgendaConsultaSharePath,
  buildFimbaAgendaSharePath,
  canonicalizeAgendaConsultaFilters,
  eventMatchesAgendaEntityFilter,
  hasAgendaEntityFilter,
  hasOfrnConvocatoriaFilter,
  isFimbaAgendaTuttiValue,
  parseFimbaAgendaUrlSearchParams,
  retainSelectedFilterIds,
  resolveGrupoIdsFromNames,
} from "../../utils/fimbaAgendaUrlParams";
import {
  agendaRowEditFieldsEqual,
  draftFromEvent,
} from "../../utils/fimbaPlanillaRowEdit";
import { useFimbaAccess } from "../../context/FimbaAccessContext";
import { useFimbaConsultaEdicionSession } from "../../hooks/useFimbaConsultaEdicionSession";
import {
  shouldShowAgendaBacklineIcon,
  shouldShowAgendaRiderIcon,
} from "../../utils/fimbaAgendaConsulta";
import FimbaEventoFormModal from "./FimbaEventoFormModal";
import FimbaBulkEditModal from "./FimbaBulkEditModal";
import { FimbaEventDetallePreview } from "./FimbaEventDetalleField";
import FimbaBacklineConsultaModal from "./FimbaBacklineConsultaModal";
import FimbaRiderConsultaModal from "./FimbaRiderConsultaModal";

const FIMBA_AGENDA_SEARCH_DEBOUNCE_MS = 250;

/**
 * Input aislado (mismo patrón que UnifiedAgenda.AgendaSearchField):
 * texto local inmediato; filtro de planilla con debounce 250ms.
 */
function FimbaAgendaSearchField({ onQueryChange, resetSignal = 0 }) {
  const [localQuery, setLocalQuery] = useState("");
  const onQueryChangeRef = useRef(onQueryChange);
  const timerRef = useRef(null);

  useEffect(() => {
    onQueryChangeRef.current = onQueryChange;
  }, [onQueryChange]);

  useEffect(() => {
    setLocalQuery("");
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, [resetSignal]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const commitQuery = useCallback((value, { immediate = false } = {}) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (immediate) {
      onQueryChangeRef.current(value);
      return;
    }
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      onQueryChangeRef.current(value);
    }, FIMBA_AGENDA_SEARCH_DEBOUNCE_MS);
  }, []);

  const handleChange = (e) => {
    const next = e.target.value;
    setLocalQuery(next);
    commitQuery(next);
  };

  const handleClear = () => {
    setLocalQuery("");
    commitQuery("", { immediate: true });
  };

  const isActive = Boolean(localQuery.trim());

  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        flexShrink: 0,
        border: `1px solid ${isActive ? "var(--fimba-accent, #d73289)" : "var(--fimba-border, #e2e8f0)"}`,
        borderRadius: 999,
        background: "var(--fimba-surface, #fff)",
        boxShadow: isActive
          ? "0 0 0 1px rgba(215, 50, 137, 0.22)"
          : "0 1px 2px rgba(15, 23, 42, 0.04)",
      }}
    >
      <span
        className="fimba-muted"
        style={{
          position: "absolute",
          left: 10,
          pointerEvents: "none",
          display: "flex",
          alignItems: "center",
        }}
        aria-hidden
      >
        <IconSearch size={14} />
      </span>
      <input
        type="search"
        value={localQuery}
        onChange={handleChange}
        placeholder="Buscar..."
        title="Buscar en tipo, detalle, locación, destino, artistas y vehículos"
        aria-label="Buscar en tipo, detalle, locación, destino, artistas y vehículos"
        className="fimba-input"
        style={{
          width: "10.5rem",
          minWidth: "7.5rem",
          maxWidth: "14rem",
          border: 0,
          borderRadius: 999,
          background: "transparent",
          padding: "0.4rem 1.75rem 0.4rem 2rem",
          fontSize: "0.78rem",
          fontWeight: 500,
          outline: "none",
          boxShadow: "none",
        }}
      />
      {isActive && (
        <button
          type="button"
          onClick={handleClear}
          className="fimba-btn fimba-btn-ghost"
          title="Limpiar búsqueda"
          aria-label="Limpiar búsqueda"
          style={{
            position: "absolute",
            right: 4,
            padding: 4,
            minWidth: 0,
            borderRadius: 999,
          }}
        >
          <IconX size={12} />
        </button>
      )}
    </div>
  );
}

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

/** Vista: weekday completo (Lunes) overhang arriba + DD/MM/YYYY alineado con hora. */
function FechaCellLabel({ fecha }) {
  if (!fecha) return "—";
  const weekday = formatWeekdayFullLocal(fecha);
  return (
    <div className="fimba-fecha-stack">
      {weekday ? <span className="fimba-fecha-weekday">{weekday}</span> : null}
      <span className="fimba-fecha-value">{formatFecha(fecha)}</span>
    </div>
  );
}

const ORIGEN_FILTERS = [
  { value: "all", label: "Todos" },
  { value: "fimba", label: "Solo FIMBA" },
  { value: "ofrn", label: "Solo OFRN" },
];

/** id_categoria OFRN de una fila de agenda unificada. */
function eventCategoriaId(ev) {
  const raw =
    ev?.tipo_id_categoria ??
    ev?.tipos_evento?.id_categoria ??
    ev?.tipos_evento?.categorias_tipos_eventos?.id ??
    null;
  const id = raw != null ? Number(raw) : NaN;
  return Number.isFinite(id) ? id : null;
}

/**
 * Categorías presentes en filas de agenda (`categorias_tipos_eventos`).
 * Mismo criterio de join que UnifiedAgenda / categoriesFromTiposEvento.
 */
function categoriasFromAgendaRows(eventos) {
  const pseudoTipos = (eventos || []).map((ev) => ({
    id_categoria: eventCategoriaId(ev),
    categoria_nombre:
      ev.categoria_nombre ||
      ev.tipos_evento?.categorias_tipos_eventos?.nombre ||
      null,
    categorias_tipos_eventos: ev.tipos_evento?.categorias_tipos_eventos || null,
  }));
  return categoriesFromTiposEvento(pseudoTipos);
}

/** id_locacion numérico de una fila de agenda unificada FIMBA. */
function eventLocacionId(ev) {
  const raw = ev?.id_locacion ?? ev?.locaciones?.id ?? null;
  const id = raw != null ? Number(raw) : NaN;
  return Number.isFinite(id) ? id : null;
}

/**
 * Locaciones distintas presentes en filas cargadas (id + nombre [· ciudad]).
 * Solo filas con `id_locacion` (el destino texto libre se cubre por búsqueda).
 */
function locacionesFromAgendaRows(eventos) {
  const map = new Map();
  for (const ev of eventos || []) {
    const id = eventLocacionId(ev);
    if (id == null || map.has(id)) continue;
    const nombre =
      ev.locacion_nombre ||
      ev.locaciones?.nombre ||
      `Locación #${id}`;
    const ciudad =
      ev.locacion_ciudad ||
      ev.locaciones?.localidades?.localidad ||
      null;
    map.set(id, {
      id,
      nombre: ciudad ? `${nombre} · ${ciudad}` : nombre,
    });
  }
  return [...map.values()].sort((a, b) =>
    a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" }),
  );
}

/** Fragmentos buscables de una fila FIMBA (tipo / actividad / lugar / gente / flota). */
function getFimbaAgendaSearchParts(ev, flotaById = null) {
  if (!ev) return [];
  const vehFromAssign = (ev.vehiculos || []).map((r) =>
    labelGiraTransporte(r.giras_transportes),
  );
  let vehOfrn = null;
  if (ev.id_gira_transporte != null && flotaById) {
    const gt = flotaById.get(Number(ev.id_gira_transporte));
    if (gt) vehOfrn = labelGiraTransporte(gt);
  }
  return [
    stripHtml(ev.actividad),
    ev.tipo_nombre,
    ev.tipos_evento?.nombre,
    ev.categoria_nombre,
    ev.locacion_nombre,
    ev.locacion_ciudad,
    ev.locaciones?.nombre,
    ev.locaciones?.direccion,
    ev.locaciones?.localidades?.localidad,
    ev.destino,
    ev.vuelo,
    ev.observaciones,
    ev.orquesta_label,
    ...(ev.propuestas || []).map((p) => p.nombre),
    ...(ev.grupos || []).map((g) => g.nombre),
    ...vehFromAssign,
    vehOfrn,
  ].filter((part) => part != null && String(part).trim() !== "");
}

function eventMatchesFimbaAgendaSearch(ev, query, flotaById = null) {
  const q = normalizeForSearch(query);
  if (!q) return true;
  if (!ev) return false;
  const haystack = normalizeForSearch(
    getFimbaAgendaSearchParts(ev, flotaById).join(" "),
  );
  return haystack.includes(q);
}

/**
 * Agenda unificada FIMBA: planilla de eventos (traslados + actividades).
 * La convocatoria orquesta OFRN se carga al marcar Tutti o un grupo (opt-in).
 */
export default function FimbaAgendaPage() {
  const { edicionId, artistaId } = useParams();
  const { readOnly, agendaOnly, source, canSeeContrataciones } =
    useFimbaAccess();
  const consultaSession = useFimbaConsultaEdicionSession();
  const queryLocked = Boolean(agendaOnly);
  const canCopyConsultaLink =
    source === "ofrn" || source === "fimba_editor";
  /** Misma base que Contrataciones: OFRN management / editor_general (no consulta ni tokens). */
  const canSeeAgendaLogisticaConsulta = Boolean(canSeeContrataciones);
  const [backlineConsultaEvento, setBacklineConsultaEvento] = useState(null);
  const [riderConsultaEvento, setRiderConsultaEvento] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const urlFilters = useMemo(
    () =>
      parseFimbaAgendaUrlSearchParams(searchParams, {
        routeArtistaId: artistaId,
      }),
    [searchParams, artistaId],
  );
  const lockedFilters = useMemo(() => {
    if (!queryLocked) return null;
    if (
      consultaSession?.agenda_query_locked ||
      consultaSession?.consulta_kind === "agenda_share"
    ) {
      return canonicalizeAgendaConsultaFilters({
        propuestaIds: consultaSession.propuestaIds,
        grupoIds: consultaSession.grupoIds,
        locacionIds: consultaSession.locacionIds,
        includeTutti: consultaSession.includeTutti,
        origen: consultaSession.origen,
      });
    }
    return canonicalizeAgendaConsultaFilters({
      propuestaIds: urlFilters.propuestaIds,
      grupoIds: urlFilters.grupoIds,
      locacionIds: urlFilters.locacionIds,
      includeTutti: urlFilters.includeTutti,
      origen: urlFilters.origen,
    });
  }, [
    queryLocked,
    consultaSession,
    urlFilters.propuestaIds.join(","),
    urlFilters.grupoIds.join(","),
    urlFilters.locacionIds.join(","),
    urlFilters.includeTutti,
    urlFilters.origen,
  ]);
  const seedFilters = lockedFilters || urlFilters;

  const [edicion, setEdicion] = useState(null);
  const [propuestas, setPropuestas] = useState([]);
  const [giraGrupos, setGiraGrupos] = useState([]);
  const [flota, setFlota] = useState([]);
  const [eventosBase, setEventosBase] = useState([]);
  /** Catálogo vivo: `categorias_tipos_eventos` + `tipos_evento` (filtro no depende de filas). */
  const [catalogTipos, setCatalogTipos] = useState([]);
  const [dbCategorias, setDbCategorias] = useState([]);
  const [logisticsSummary, setLogisticsSummary] = useState([]);
  const [propuestaRoutes, setPropuestaRoutes] = useState([]);
  const [selectedPropuestaIds, setSelectedPropuestaIds] = useState(
    () => seedFilters.propuestaIds,
  );
  const [selectedGrupoIds, setSelectedGrupoIds] = useState(
    () => seedFilters.grupoIds,
  );
  /** Opt-in convocatoria Tutti (off por defecto). */
  const [includeTutti, setIncludeTutti] = useState(
    () => Boolean(seedFilters.includeTutti),
  );
  /**
   * Default: Solo FIMBA. Grupo/Tutti incluyen orquesta → all.
   * Artista solo no fuerza all (evita volcar toda la convocatoria OFRN).
   */
  const [filtroOrigen, setFiltroOrigen] = useState(() => {
    if (hasOfrnConvocatoriaFilter(seedFilters.grupoIds, seedFilters.includeTutti)) {
      return "all";
    }
    return seedFilters.origen || "fimba";
  });
  /**
   * Multi-select de categorías (`id_categoria` / categorias_tipos_eventos),
   * semántica UnifiedAgenda: array vacío = todas visibles; con ids = solo esas.
   * Sin persistencia de preferencias en agenda FIMBA.
   */
  const [selectedCategoryIds, setSelectedCategoryIds] = useState([]);
  /**
   * Multi-select de locaciones (`id_locacion`): vacío = todas; con ids = solo esas.
   * Filas sin locación quedan ocultas si el filtro está activo.
   */
  const [selectedLocacionIds, setSelectedLocacionIds] = useState(
    () => seedFilters.locacionIds,
  );
  /** Query de búsqueda debounced (vía FimbaAgendaSearchField). */
  const [agendaSearchQuery, setAgendaSearchQuery] = useState("");
  const [searchResetSignal, setSearchResetSignal] = useState(0);
  const handleAgendaSearchQueryChange = useCallback((query) => {
    setAgendaSearchQuery(query);
  }, []);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [modal, setModal] = useState(null);
  const [copyLinkOk, setCopyLinkOk] = useState(false);
  /** Multi-select de filas visibles (ids) para «Editar en lote». */
  const [selectedEventIds, setSelectedEventIds] = useState(() => new Set());
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  /** Edición de fila completa (doble clic) — paridad Transportes fuera de modo planilla. */
  const [editingRowId, setEditingRowId] = useState(null);
  const [rowEditFocusField, setRowEditFocusField] = useState(null);
  const [eventDrafts, setEventDrafts] = useState({});
  const [eventRowStatus, setEventRowStatus] = useState({});
  const [eventRowErrors, setEventRowErrors] = useState({});
  const [locacionCatalogOptions, setLocacionCatalogOptions] = useState([]);
  const savingEventRef = useRef(new Set());
  const eventDraftsRef = useRef(eventDrafts);
  eventDraftsRef.current = eventDrafts;
  const eventosRef = useRef(eventosBase);
  eventosRef.current = eventosBase;

  const ofrnIncludeActive = hasOfrnConvocatoriaFilter(
    selectedGrupoIds,
    includeTutti,
  );
  const entityFilterActive = hasAgendaEntityFilter(
    selectedPropuestaIds,
    selectedGrupoIds,
    includeTutti,
  );
  const entityFilterActiveFlag =
    entityFilterActive &&
    (selectedPropuestaIds.length > 0 || ofrnIncludeActive);
  /** Cargar filas orquesta OFRN solo con opt-in (grupo/Tutti) o chip Todos/OFRN. */
  const fetchOfrnEvents =
    ofrnIncludeActive || filtroOrigen === "all" || filtroOrigen === "ofrn";
  const fetchOfrnEventsRef = useRef(fetchOfrnEvents);
  fetchOfrnEventsRef.current = fetchOfrnEvents;

  const reload = useCallback(async ({ soft = false } = {}) => {
    if (soft) setRefreshing(true);
    else setInitialLoading(true);
    setError(null);
    try {
      const edRes = await getFimbaEdicionById(edicionId);
      if (edRes.error || !edRes.edicion) {
        setError(edRes.error?.message || "Edición no encontrada");
        setEdicion(null);
        return;
      }
      const ed = edRes.edicion;
      const [propsRes, gruposRes, flotaRes, agendaRes, logRes, rutasRes] =
        await Promise.all([
          listFimbaPropuestas(edicionId),
          listFimbaGiraGrupos(ed.id_gira),
          listFimbaFlota(ed.id_gira),
          listFimbaAgenda(edicionId, {
            include_ofrn: fetchOfrnEventsRef.current,
          }),
          loadFimbaTransportLogisticsSummary(ed.id_gira),
          listFimbaPropuestaRutas(edicionId),
        ]);
      if (propsRes.error || flotaRes.error || agendaRes.error) {
        setError(
          (propsRes.error || flotaRes.error || agendaRes.error).message ||
            "Error al cargar",
        );
      }
      const props = propsRes.propuestas || [];
      const fleet = flotaRes.flota || [];
      const baseEventos = agendaRes.eventos || [];
      const rutas = rutasRes.error ? [] : rutasRes.rutas || [];
      setEdicion(ed);
      setPropuestas(props);
      setGiraGrupos(gruposRes.grupos || []);
      setFlota(fleet);
      setEventosBase(baseEventos);
      setLogisticsSummary(logRes.error ? [] : logRes.summary || []);
      setPropuestaRoutes(rutas);
    } finally {
      setInitialLoading(false);
      setRefreshing(false);
    }
  }, [edicionId]);

  const reloadAgendaSlices = useCallback(
    async ({ eventos = false, logistics = false, rutas = false } = {}) => {
      if (!eventos && !logistics && !rutas) return;
      setRefreshing(true);
      setError(null);
      try {
        const tasks = [];
        if (logistics && edicion?.id_gira) {
          tasks.push(
            loadFimbaTransportLogisticsSummary(edicion.id_gira).then((res) => ({
              key: "logistics",
              data: res.error ? [] : res.summary || [],
              error: res.error,
            })),
          );
        }
        if (rutas) {
          tasks.push(
            listFimbaPropuestaRutas(edicionId).then((res) => ({
              key: "rutas",
              data: res.error ? [] : res.rutas || [],
              error: res.error,
            })),
          );
        }
        if (eventos) {
          tasks.push(
            listFimbaAgenda(edicionId, { include_ofrn: fetchOfrnEvents }).then(
              (res) => ({
                key: "eventos",
                data: res.eventos || [],
                error: res.error,
              }),
            ),
          );
        }
        const results = await Promise.all(tasks);
        for (const r of results) {
          if (r.error) {
            setError(r.error.message || "Error al actualizar");
          }
          if (r.key === "logistics") setLogisticsSummary(r.data);
          if (r.key === "rutas") setPropuestaRoutes(r.data);
          if (r.key === "eventos") setEventosBase(r.data);
        }
      } finally {
        setRefreshing(false);
      }
    },
    [edicionId, edicion?.id_gira, fetchOfrnEvents],
  );

  const upsertAgendaEvento = useCallback(
    async (eventoId) => {
      const id = Number(eventoId);
      if (!Number.isFinite(id)) return null;
      const { evento, error: err } = await getFimbaAgendaEvento(
        edicionId,
        id,
        { edicion, propuestas, flota },
      );
      if (err) {
        setError(err.message || "No se pudo actualizar la fila");
        return null;
      }
      if (!evento) return null;
      setEventosBase((prev) => {
        const idx = prev.findIndex((ev) => String(ev.id) === String(id));
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = evento;
          return next;
        }
        return sortFimbaAgendaRows([...prev, evento]);
      });
      return evento;
    },
    [edicionId, edicion, propuestas, flota],
  );

  const removeAgendaEvento = useCallback((eventoId) => {
    setEventosBase((prev) =>
      prev.filter((ev) => String(ev.id) !== String(eventoId)),
    );
  }, []);

  const handleBoardingRefresh = useCallback(
    (scope) => {
      if (scope === "ofrn") {
        reloadAgendaSlices({ logistics: true });
      } else if (scope === "reserva" || scope === "eventos") {
        reloadAgendaSlices({ eventos: true, rutas: scope === "reserva" });
      } else {
        reloadAgendaSlices({ rutas: true });
      }
    },
    [reloadAgendaSlices],
  );

  const refreshLocacionCatalog = useCallback(async () => {
    const { data, error: err } = await supabase
      .from("locaciones")
      .select("id, nombre, direccion, localidades(localidad)")
      .order("nombre");
    if (err) {
      console.error(err);
      return;
    }
    setLocacionCatalogOptions(
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
    if (!readOnly) refreshLocacionCatalog();
  }, [readOnly, refreshLocacionCatalog]);

  useEffect(() => {
    if (readOnly && editingRowId != null) {
      setEditingRowId(null);
      setRowEditFocusField(null);
    }
  }, [readOnly, editingRowId]);

  const cancelRowEdit = useCallback((eventoId) => {
    const key = String(eventoId ?? editingRowId ?? "");
    if (!key) {
      setEditingRowId(null);
      setRowEditFocusField(null);
      return;
    }
    const ev = (eventosRef.current || []).find((x) => String(x.id) === key);
    if (ev) {
      setEventDrafts((prev) => {
        const n = { ...prev, [key]: draftFromEvent(ev) };
        eventDraftsRef.current = n;
        return n;
      });
    } else {
      setEventDrafts((prev) => {
        if (!prev[key]) return prev;
        const n = { ...prev };
        delete n[key];
        eventDraftsRef.current = n;
        return n;
      });
    }
    setEventRowStatus((prev) => ({ ...prev, [key]: "idle" }));
    setEventRowErrors((prev) => {
      if (!prev[key]) return prev;
      const n = { ...prev };
      delete n[key];
      return n;
    });
    setEditingRowId(null);
    setRowEditFocusField(null);
  }, [editingRowId]);

  useEffect(() => {
    if (editingRowId == null) return undefined;
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      cancelRowEdit(editingRowId);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editingRowId, cancelRowEdit]);

  const beginRowEdit = useCallback(
    (ev, focusField = null) => {
      if (readOnly || !ev?.id) return;
      const key = String(ev.id);
      if (editingRowId != null && editingRowId !== key) {
        cancelRowEdit(editingRowId);
      }
      setEventDrafts((prev) => {
        const n = { ...prev, [key]: draftFromEvent(ev) };
        eventDraftsRef.current = n;
        return n;
      });
      setEventRowStatus((prev) => ({ ...prev, [key]: "idle" }));
      setEditingRowId(key);
      setRowEditFocusField(focusField || "fecha");
    },
    [readOnly, editingRowId, cancelRowEdit],
  );

  const isRowEditing = useCallback(
    (eventoId) =>
      editingRowId != null && String(editingRowId) === String(eventoId),
    [editingRowId],
  );

  const setEventField = useCallback((eventoId, field, value) => {
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
  }, []);

  const commitEvento = useCallback(async (eventoId) => {
    const key = String(eventoId);
    if (savingEventRef.current.has(key)) return false;
    const ev = (eventosRef.current || []).find((x) => String(x.id) === key);
    if (!ev) return false;

    const draft = eventDraftsRef.current[key] || draftFromEvent(ev);
    const baseline = draftFromEvent(ev);
    if (agendaRowEditFieldsEqual(draft, baseline)) {
      setEventRowStatus((prev) => ({
        ...prev,
        [key]: prev[key] === "error" ? "error" : "idle",
      }));
      return true;
    }

    if (!String(draft.fecha || "").trim()) {
      setEventRowStatus((prev) => ({ ...prev, [key]: "error" }));
      setEventRowErrors((prev) => ({ ...prev, [key]: "Fecha requerida" }));
      return false;
    }

    savingEventRef.current.add(key);
    setEventRowStatus((prev) => ({ ...prev, [key]: "saving" }));
    setEventRowErrors((prev) => {
      const n = { ...prev };
      delete n[key];
      return n;
    });

    const derivedFin = eventUsesDerivedHoraFin(ev);
    const patch = {
      fecha: draft.fecha,
      hora_inicio: draft.hora_inicio,
      actividad: draft.actividad,
      vuelo: draft.vuelo,
      observaciones: draft.observaciones,
      id_locacion: draft.id_locacion,
      destino: draft.destino,
      stripDestino: false,
    };
    if (!derivedFin) {
      patch.hora_fin = draft.hora_fin;
    }

    const { evento: patched, error: err } = await patchFimbaEventoPlanilla(
      ev.id,
      patch,
    );
    if (err) {
      savingEventRef.current.delete(key);
      setEventRowStatus((prev) => ({ ...prev, [key]: "error" }));
      setEventRowErrors((prev) => ({
        ...prev,
        [key]: err.message || "Error al guardar",
      }));
      return false;
    }

    const merged = {
      ...ev,
      fecha: patched.fecha,
      hora_inicio: patched.hora_inicio,
      hora_fin: patched.hora_fin,
      descripcion: patched.descripcion,
      actividad: patched.actividad,
      destino: patched.destino ?? draft.destino ?? "",
      vuelo: patched.vuelo,
      observaciones: patched.observaciones,
      observaciones_equipaje:
        patched.observaciones_equipaje ?? patched.observaciones ?? null,
      id_locacion: patched.id_locacion ?? null,
      locaciones: patched.locaciones ?? null,
      locacion_nombre:
        patched.locacion_nombre || patched.locaciones?.nombre || null,
      locacion_ciudad:
        patched.locaciones?.localidades?.localidad ||
        ev.locacion_ciudad ||
        null,
    };

    savingEventRef.current.delete(key);
    const nextDraft = draftFromEvent(merged);
    setEventDrafts((prev) => {
      const n = { ...prev, [key]: nextDraft };
      eventDraftsRef.current = n;
      return n;
    });
    setEventRowStatus((prev) => ({ ...prev, [key]: "saved" }));
    setEventosBase((prev) => {
      const next = (prev || []).map((row) =>
        String(row.id) === key ? merged : row,
      );
      eventosRef.current = next;
      return next;
    });
    return true;
  }, []);

  const confirmRowEdit = useCallback(
    async (eventoId) => {
      const ok = await commitEvento(eventoId);
      if (ok) {
        setEditingRowId(null);
        setRowEditFocusField(null);
      }
    },
    [commitEvento],
  );

  useEffect(() => {
    reload();
  }, [reload]);

  const ofrnSliceReadyRef = useRef(false);
  useEffect(() => {
    if (!edicion) return;
    if (!ofrnSliceReadyRef.current) {
      ofrnSliceReadyRef.current = true;
      return;
    }
    reloadAgendaSlices({ eventos: true });
  }, [fetchOfrnEvents, edicion, reloadAgendaSlices]);

  useEffect(() => {
    const seed = lockedFilters || urlFilters;
    setSelectedPropuestaIds(seed.propuestaIds);
    setSelectedGrupoIds(seed.grupoIds);
    setIncludeTutti(Boolean(seed.includeTutti));
    setSelectedLocacionIds(seed.locacionIds);
    if (hasOfrnConvocatoriaFilter(seed.grupoIds, seed.includeTutti)) {
      setFiltroOrigen("all");
    } else {
      setFiltroOrigen(seed.origen || "fimba");
    }
    if (queryLocked) {
      setSelectedCategoryIds([]);
      setAgendaSearchQuery("");
      setSearchResetSignal((n) => n + 1);
    }
  }, [
    queryLocked,
    lockedFilters,
    urlFilters.propuestaIds.join(","),
    urlFilters.grupoIds.join(","),
    urlFilters.locacionIds.join(","),
    urlFilters.origen,
    urlFilters.includeTutti,
  ]);

  useEffect(() => {
    let cancelled = false;
    listTiposEventoForFimba().then((res) => {
      if (cancelled) return;
      setCatalogTipos(res.tipos || []);
      setDbCategorias(res.categorias || []);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!urlFilters.grupoNames?.length || !giraGrupos.length) return;
    const resolved = resolveGrupoIdsFromNames(
      urlFilters.grupoNames,
      giraGrupos,
    );
    if (!resolved.length) return;
    setSelectedGrupoIds((prev) => {
      const next = [...new Set([...prev, ...resolved])];
      if (
        next.length === prev.length &&
        next.every((id, i) => Number(id) === Number(prev[i]))
      ) {
        return prev;
      }
      return next;
    });
  }, [urlFilters.grupoNames.join(","), giraGrupos]);

  useEffect(() => {
    if (queryLocked) return;
    const incoming = parseFimbaAgendaUrlSearchParams(searchParams, {
      routeArtistaId: artistaId,
    });
    const statePending =
      (incoming.propuestaIds.length > 0 &&
        selectedPropuestaIds.join(",") !== incoming.propuestaIds.join(",")) ||
      (incoming.grupoIds.length > 0 &&
        selectedGrupoIds.join(",") !== incoming.grupoIds.join(",")) ||
      (incoming.includeTutti && !includeTutti) ||
      (incoming.locacionIds.length > 0 &&
        selectedLocacionIds.join(",") !== incoming.locacionIds.join(","));
    if (statePending) return;

    const path = buildFimbaAgendaSharePath(location.pathname, {
      propuestaIds: selectedPropuestaIds,
      grupoIds: selectedGrupoIds,
      locacionIds: selectedLocacionIds,
      includeTutti,
      origen: ofrnIncludeActive ? "all" : filtroOrigen,
    });
    const want = path.includes("?") ? path.slice(path.indexOf("?")) : "";
    const have = location.search || "";
    if (want !== have) {
      setSearchParams(new URLSearchParams(want.replace(/^\?/, "")), {
        replace: true,
      });
    }
  }, [
    queryLocked,
    artistaId,
    searchParams,
    selectedPropuestaIds,
    selectedGrupoIds,
    includeTutti,
    selectedLocacionIds,
    filtroOrigen,
    ofrnIncludeActive,
    location.pathname,
    location.search,
    setSearchParams,
  ]);

  // Grupo/Tutti incluyen orquesta; artista solo no fuerza Todos.
  useEffect(() => {
    if (ofrnIncludeActive) setFiltroOrigen("all");
  }, [ofrnIncludeActive]);

  const availableCategories = useMemo(
    () =>
      mergeFimbaAgendaCategories({
        dbCategorias,
        catalogTipos,
        rowDerived: categoriasFromAgendaRows(eventosBase),
      }),
    [dbCategorias, catalogTipos, eventosBase],
  );

  const availableLocaciones = useMemo(
    () => locacionesFromAgendaRows(eventosBase),
    [eventosBase],
  );

  const flotaById = useMemo(() => {
    const map = new Map();
    for (const g of flota || []) {
      map.set(Number(g.id), g);
    }
    return map;
  }, [flota]);

  /** Secuencias de abordaje (misma fuente que Transportes → Tránsito/cap). */
  const sequencesByVehicle = useMemo(
    () =>
      buildAllVehicleBoardingSequences({
        vehiculos: flota,
        eventos: eventosBase,
        logisticsSummary,
        capacityFn: computeFimbaCapacity,
        eventVehicleIds: giraTransporteIdsFromEvent,
        propuestaRoutes,
      }),
    [flota, eventosBase, logisticsSummary, propuestaRoutes],
  );

  const categoryOptions = useMemo(
    () =>
      availableCategories.map((c) => ({
        value: c.id,
        label: c.nombre,
      })),
    [availableCategories],
  );

  const locationOptions = useMemo(
    () =>
      availableLocaciones.map((l) => ({
        value: l.id,
        label: l.nombre,
      })),
    [availableLocaciones],
  );

  useEffect(() => {
    if (queryLocked) return;
    setSelectedCategoryIds((prev) =>
      retainSelectedFilterIds(
        prev,
        availableCategories.map((c) => c.id),
      ),
    );
  }, [queryLocked, availableCategories]);

  useEffect(() => {
    if (queryLocked) return;
    setSelectedLocacionIds((prev) =>
      retainSelectedFilterIds(
        prev,
        availableLocaciones.map((l) => l.id),
      ),
    );
  }, [queryLocked, availableLocaciones]);

  useEffect(() => {
    if (queryLocked) return;
    setSelectedGrupoIds((prev) =>
      retainSelectedFilterIds(
        prev,
        (giraGrupos || []).map((g) => g.id),
      ),
    );
  }, [queryLocked, giraGrupos]);

  useEffect(() => {
    if (queryLocked) return;
    setSelectedPropuestaIds((prev) =>
      retainSelectedFilterIds(
        prev,
        (propuestas || []).map((p) => p.id),
      ),
    );
  }, [queryLocked, propuestas]);

  const categoryFilterActive =
    selectedCategoryIds.length > 0 &&
    selectedCategoryIds.length < availableCategories.length;

  const locationFilterActive =
    selectedLocacionIds.length > 0 &&
    selectedLocacionIds.length < availableLocaciones.length;

  const searchFilterActive = Boolean(normalizeForSearch(agendaSearchQuery));

  /** Artistas del select: siempre alfabético (no `orden` de planilla). */
  const propuestasParaFiltro = useMemo(
    () => sortFimbaPropuestasByNombre(propuestas),
    [propuestas],
  );

  const grupoOptions = useMemo(
    () => [
      {
        value: FIMBA_AGENDA_TUTTI_VALUE,
        label: "Tutti",
        color: "#00B1EB",
      },
      ...(giraGrupos || []).map((g) => ({
        value: g.id,
        label: g.nombre,
        color: g.color || null,
      })),
    ],
    [giraGrupos],
  );

  const selectedGrupoFilterValues = useMemo(
    () => [
      ...(includeTutti ? [FIMBA_AGENDA_TUTTI_VALUE] : []),
      ...selectedGrupoIds,
    ],
    [includeTutti, selectedGrupoIds],
  );

  const handleGrupoFilterChange = useCallback((next) => {
    const list = Array.isArray(next) ? next : [];
    setIncludeTutti(list.some((v) => isFimbaAgendaTuttiValue(v)));
    setSelectedGrupoIds(
      list
        .filter((v) => !isFimbaAgendaTuttiValue(v))
        .map((id) => Number(id))
        .filter(Number.isFinite),
    );
  }, []);

  const entityFilterCtx = useMemo(
    () => ({ propuestaRoutes, sequencesByVehicle, includeTutti }),
    [propuestaRoutes, sequencesByVehicle, includeTutti],
  );

  const eventos = eventosBase;

  const eventosFiltrados = useMemo(() => {
    let list = eventos;
    if (entityFilterActiveFlag) {
      list = list.filter((ev) =>
        eventMatchesAgendaEntityFilter(
          ev,
          selectedPropuestaIds,
          selectedGrupoIds,
          entityFilterCtx,
        ),
      );
    }
    if (!ofrnIncludeActive && filtroOrigen === "fimba") {
      list = list.filter((ev) => ev.es_fimba);
    } else if (filtroOrigen === "ofrn") {
      list = list.filter((ev) => ev.es_ofrn);
    }
    // UnifiedAgenda: length > 0 acota por id_categoria; vacío = sin filtro
    if (selectedCategoryIds.length > 0) {
      const want = new Set(selectedCategoryIds.map(Number));
      list = list.filter((ev) => {
        const catId = eventCategoriaId(ev);
        // Sin categoría conocida: no ocultar (igual que UnifiedAgenda)
        if (catId == null) return true;
        return want.has(catId);
      });
    }
    // Locación: length > 0 acota por id_locacion; vacío = sin filtro
    if (selectedLocacionIds.length > 0) {
      const want = new Set(selectedLocacionIds.map(Number));
      list = list.filter((ev) => {
        const locId = eventLocacionId(ev);
        if (locId == null) return false;
        return want.has(locId);
      });
    }
    if (searchFilterActive) {
      list = list.filter((ev) =>
        eventMatchesFimbaAgendaSearch(ev, agendaSearchQuery, flotaById),
      );
    }
    // Reordenar tras filtrar: fecha → hora → detalle (es) → tipo → id.
    // Evita orden “pegado” al subset / reload por artista / rides mergeados.
    return sortFimbaAgendaRows(list);
  }, [
    eventos,
    entityFilterActiveFlag,
    selectedPropuestaIds,
    selectedGrupoIds,
    filtroOrigen,
    ofrnIncludeActive,
    selectedCategoryIds,
    selectedLocacionIds,
    agendaSearchQuery,
    searchFilterActive,
    flotaById,
    entityFilterCtx,
  ]);

  const visibleEventIds = useMemo(
    () => eventosFiltrados.map((ev) => String(ev.id)),
    [eventosFiltrados],
  );

  // Descartar ids que ya no están en la vista filtrada.
  useEffect(() => {
    setSelectedEventIds((prev) => {
      if (!prev.size) return prev;
      const visible = new Set(visibleEventIds);
      let changed = false;
      const next = new Set();
      for (const id of prev) {
        if (visible.has(id)) next.add(id);
        else changed = true;
      }
      return changed ? next : prev;
    });
  }, [visibleEventIds]);

  const allVisibleSelected =
    visibleEventIds.length > 0 &&
    visibleEventIds.every((id) => selectedEventIds.has(id));
  const someVisibleSelected =
    visibleEventIds.some((id) => selectedEventIds.has(id)) &&
    !allVisibleSelected;

  const selectedEvents = useMemo(
    () =>
      eventosFiltrados.filter((ev) => selectedEventIds.has(String(ev.id))),
    [eventosFiltrados, selectedEventIds],
  );

  const toggleSelectEvent = useCallback((eventoId) => {
    const key = String(eventoId);
    setSelectedEventIds((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const toggleSelectAllVisible = useCallback(() => {
    setSelectedEventIds((prev) => {
      const allOn =
        visibleEventIds.length > 0 &&
        visibleEventIds.every((id) => prev.has(id));
      if (allOn) return new Set();
      return new Set(visibleEventIds);
    });
  }, [visibleEventIds]);

  const clearSelection = useCallback(() => {
    setSelectedEventIds(new Set());
  }, []);

  const origenFilterActive =
    !ofrnIncludeActive && filtroOrigen !== "fimba";

  const hasNonDefaultFilters =
    origenFilterActive ||
    entityFilterActiveFlag ||
    categoryFilterActive ||
    locationFilterActive ||
    selectedPropuestaIds.length > 0 ||
    selectedGrupoIds.length > 0 ||
    includeTutti ||
    searchFilterActive;

  const activeFilterLabels = useMemo(() => {
    const parts = [];
    if (origenFilterActive) {
      parts.push(
        filtroOrigen === "ofrn"
          ? "Solo OFRN"
          : filtroOrigen === "all"
            ? "Todos"
            : "Solo FIMBA",
      );
    }
    if (selectedPropuestaIds.length > 0) {
      const names = propuestasParaFiltro
        .filter((p) =>
          selectedPropuestaIds.some((id) => String(id) === String(p.id)),
        )
        .map((p) => p.nombre);
      if (names.length) parts.push(`Artista: ${names.join(", ")}`);
    }
    if (includeTutti || selectedGrupoIds.length > 0) {
      const names = [
        ...(includeTutti ? ["Tutti"] : []),
        ...(giraGrupos || [])
          .filter((g) =>
            selectedGrupoIds.some((id) => String(id) === String(g.id)),
          )
          .map((g) => g.nombre),
      ];
      if (names.length) parts.push(`Grupo: ${names.join(", ")}`);
    }
    if (categoryFilterActive) {
      const names = availableCategories
        .filter((c) =>
          selectedCategoryIds.some((id) => Number(id) === Number(c.id)),
        )
        .map((c) => c.nombre);
      if (names.length) parts.push(`Categoría: ${names.join(", ")}`);
    }
    if (locationFilterActive) {
      const names = availableLocaciones
        .filter((l) =>
          selectedLocacionIds.some((id) => Number(id) === Number(l.id)),
        )
        .map((l) => l.nombre);
      if (names.length) parts.push(`Locación: ${names.join(", ")}`);
    }
    if (searchFilterActive) {
      parts.push(`Búsqueda: «${agendaSearchQuery.trim()}»`);
    }
    return parts;
  }, [
    origenFilterActive,
    filtroOrigen,
    selectedPropuestaIds,
    selectedGrupoIds,
    includeTutti,
    categoryFilterActive,
    locationFilterActive,
    searchFilterActive,
    agendaSearchQuery,
    propuestasParaFiltro,
    giraGrupos,
    availableCategories,
    availableLocaciones,
    selectedCategoryIds,
    selectedLocacionIds,
  ]);

  const handleClearAllFilters = useCallback(() => {
    if (queryLocked) return;
    setFiltroOrigen("fimba");
    setSelectedCategoryIds([]);
    setSelectedLocacionIds([]);
    setSelectedPropuestaIds([]);
    setSelectedGrupoIds([]);
    setIncludeTutti(false);
    setAgendaSearchQuery("");
    setSearchResetSignal((n) => n + 1);
  }, [queryLocked]);

  const handleDelete = async (ev) => {
    const label = stripHtml(ev.actividad) || ev.tipo_nombre || "evento";
    const ofrnNote =
      ev.es_ofrn && !ev.es_fimba
        ? "\n\nEs un evento de orquesta OFRN: se eliminará de la agenda de la gira."
        : "";
    if (
      !window.confirm(
        `¿Eliminar «${label}» del ${formatFecha(ev.fecha)}?${ofrnNote}`,
      )
    ) {
      return;
    }
    const { error: err } = await deleteFimbaEvento(ev.id);
    if (err) {
      setError(err.message || "No se pudo eliminar");
      return;
    }
    removeAgendaEvento(ev.id);
  };

  const handleDuplicate = async (ev) => {
    const label = stripHtml(ev.actividad) || ev.tipo_nombre || "evento";
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
      logisticsSummary,
      propuestaRoutes,
    });
    if (err || !copy?.id) {
      setError(err?.message || "No se pudo duplicar");
      return;
    }
    const fullRow = await upsertAgendaEvento(copy.id);
    setModal({ mode: "edit", evento: fullRow || copy });
  };

  /**
   * Vecino siguiente del mismo día en la planilla visible (sin ride segments).
   * Insertar entre esta fila y ese next = completar hasta→desde.
   */
  const nextSameDayNeighbor = (ev) => {
    const day = String(ev?.fecha || "").slice(0, 10);
    if (!day) return null;
    const list = eventosFiltrados.filter(
      (r) => String(r.fecha || "").slice(0, 10) === day,
    );
    const idx = list.findIndex((r) => String(r.id) === String(ev.id));
    if (idx < 0) return null;
    return list[idx + 1] || null;
  };

  const openIntermediateEvent = (ev) => {
    const nextEv = nextSameDayNeighbor(ev);
    const { fecha, hora_inicio, hora_fin } = defaultGapFillEventSchedule(
      ev,
      nextEv,
    );
    setModal({
      mode: "create",
      preselectPropuesta: selectedPropuestaIds[0] || artistaId || null,
      evento: {
        fecha: fecha || ev.fecha || "",
        hora_inicio: hora_inicio || null,
        hora_fin: hora_fin || null,
        actividad: "",
        destino: "",
        observaciones_equipaje: "",
        asientos_equipaje: 0,
        audiencia_ofrn: "none",
      },
    });
  };

  const handleExportPdf = () => {
    if (eventosFiltrados.length === 0) return;
    const artistaNombres =
      selectedPropuestaIds.length > 0
        ? propuestasParaFiltro
            .filter((p) =>
              selectedPropuestaIds.some(
                (id) => String(id) === String(p.id),
              ),
            )
            .map((p) => p.nombre)
        : [];
    const grupoNames = [
      ...(includeTutti ? ["Tutti"] : []),
      ...(selectedGrupoIds.length > 0
        ? (giraGrupos || [])
            .filter((g) =>
              selectedGrupoIds.some((id) => String(id) === String(g.id)),
            )
            .map((g) => g.nombre)
        : []),
    ];
    const categoryNames =
      categoryFilterActive
        ? availableCategories
            .filter((c) =>
              selectedCategoryIds.some((id) => Number(id) === Number(c.id)),
            )
            .map((c) => c.nombre)
        : [];
    const locationNames =
      locationFilterActive
        ? availableLocaciones
            .filter((l) =>
              selectedLocacionIds.some((id) => Number(id) === Number(l.id)),
            )
            .map((l) => l.nombre)
        : [];
    const subTitle = buildFimbaAgendaPdfSubTitle({
      edicionNombre: edicion?.nombre,
      filtroOrigen: ofrnIncludeActive ? "all" : filtroOrigen,
      filtroArtistaNombres: artistaNombres,
      grupoNames,
      categoryNames,
      locationNames,
      searchQuery: searchFilterActive ? agendaSearchQuery : "",
    });
    const title =
      artistaNombres.length === 1
        ? `Agenda FIMBA — ${artistaNombres[0]}`
        : artistaNombres.length > 1 || grupoNames.length > 0 || includeTutti
          ? `Agenda FIMBA — ${edicion?.nombre || "Edición"} (filtros)`
          : `Agenda FIMBA — ${edicion?.nombre || "Edición"}`;
    exportFimbaAgendaToPDF(eventosFiltrados, {
      title,
      subTitle,
      flotaById,
    });
  };

  const handleCopyShareLink = async () => {
    const filters = canonicalizeAgendaConsultaFilters({
      propuestaIds: selectedPropuestaIds,
      grupoIds: selectedGrupoIds,
      locacionIds: selectedLocacionIds,
      includeTutti,
      origen: ofrnIncludeActive ? "all" : filtroOrigen,
    });
    const { consulta, error: shareErr } = await upsertFimbaAgendaConsulta(
      edicionId,
      filters,
    );
    const uniquePath = consulta?.token
      ? buildFimbaAgendaConsultaSharePath(consulta.token)
      : null;
    const legacyPath = edicion?.token_consulta
      ? buildFimbaAgendaConsultaLegacySharePath(edicion.token_consulta, filters)
      : null;
    const publicPath = uniquePath || legacyPath;
    if (!publicPath) {
      window.alert(
        shareErr?.message ||
          "No se pudo generar el enlace de consulta.",
      );
      return;
    }
    const url = `${window.location.origin}${publicPath}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopyLinkOk(true);
      window.setTimeout(() => setCopyLinkOk(false), 2500);
    } catch {
      window.prompt("Copiá este enlace de consulta (vista fija, solo agenda):", url);
    }
  };
  const backHref = artistaId
    ? `/fimba/edicion/${edicionId}/artista/${artistaId}`
    : `/fimba/edicion/${edicionId}`;

  if (initialLoading) {
    return (
      <div className="fimba-card fimba-muted" style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <IconLoader size={18} className="animate-spin" /> Cargando agenda…
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
      {!agendaOnly && (
        <Link
          to={backHref}
          className="fimba-btn fimba-btn-ghost"
          style={{ textDecoration: "none", marginBottom: 12 }}
        >
          <IconArrowLeft size={14} /> {artistaId ? "Artista" : edicion.nombre}
        </Link>
      )}

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
            Agenda
          </h1>
          <p className="fimba-muted" style={{ margin: "0.35rem 0 0" }}>
            {queryLocked
              ? "Consulta fija · la vista no se puede cambiar desde este enlace"
              : "Planilla unificada · FIMBA + orquesta OFRN (misma gira)"}
          </p>
        </div>
        {!readOnly && (
          <button
            type="button"
            className="fimba-btn fimba-btn-primary"
            onClick={() =>
              setModal({
                mode: "create",
                preselectPropuesta: selectedPropuestaIds[0] || artistaId || null,
              })
            }
          >
            <IconPlus size={16} /> Nuevo evento
          </button>
        )}
      </div>

      {error && (
        <div className="fimba-error" style={{ marginBottom: "1rem" }}>
          {error}
        </div>
      )}

      <div className="fimba-agenda-toolbar">
        <div className="fimba-agenda-toolbar-head">
          <h2 style={{ margin: 0, fontSize: "1.05rem", color: "var(--fimba-deep)", display: "flex", alignItems: "center", gap: 6 }}>
            <IconClock size={16} /> Planilla
            {refreshing && (
              <span
                className="fimba-muted"
                style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: "0.75rem", fontWeight: 500 }}
                aria-live="polite"
              >
                <IconLoader size={12} className="animate-spin" /> Actualizando…
              </span>
            )}
          </h2>
          <div className="fimba-agenda-actions-row">
            {canCopyConsultaLink && (
              <button
                type="button"
                className="fimba-btn fimba-btn-ghost"
                onClick={handleCopyShareLink}
                title="Enlace público con token único: agenda filtrada fija, sin login"
              >
                <IconCopy size={14} />{" "}
                {copyLinkOk ? "Enlace copiado" : "Copiar enlace de consulta"}
              </button>
            )}
            <button
              type="button"
              className="fimba-btn fimba-btn-ghost"
              onClick={handleExportPdf}
              disabled={refreshing || eventosFiltrados.length === 0}
              title="Descargar PDF de la vista filtrada actual"
            >
              <IconPrinter size={14} /> Descargar PDF
            </button>
          </div>
        </div>
        {!readOnly && selectedEventIds.size > 0 && (
          <div
            className="fimba-bulk-toolbar fimba-no-print"
            role="status"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
              marginTop: 8,
              padding: "0.45rem 0.65rem",
              background: "rgba(215, 50, 137, 0.08)",
              border: "1px solid rgba(215, 50, 137, 0.28)",
              borderRadius: 8,
            }}
          >
            <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--fimba-deep)" }}>
              {selectedEventIds.size} seleccionado
              {selectedEventIds.size === 1 ? "" : "s"}
            </span>
            <button
              type="button"
              className="fimba-btn fimba-btn-primary"
              onClick={() => setBulkEditOpen(true)}
              style={{
                padding: "0.3rem 0.65rem",
                fontSize: "0.78rem",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <IconEdit size={14} /> Editar en lote
            </button>
            <button
              type="button"
              className="fimba-btn fimba-btn-ghost"
              onClick={clearSelection}
              style={{ padding: "0.3rem 0.55rem", fontSize: "0.75rem" }}
            >
              <IconX size={12} /> Limpiar selección
            </button>
          </div>
        )}
        {!queryLocked && (
        <div className="fimba-agenda-filters-row">
          <FimbaAgendaSearchField
            onQueryChange={handleAgendaSearchQueryChange}
            resetSignal={searchResetSignal}
          />
          {!ofrnIncludeActive && (
            <div className="fimba-agenda-origen-chips">
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
          {availableCategories.length > 0 && (
            <div className="fimba-agenda-filter-item">
              <label className="fimba-label">Categoría</label>
              <div className="fimba-agenda-filter-dropdown">
                <MultiSelectDropdown
                  className="w-full"
                  label="Categoría"
                  placeholder="Todas las categorías"
                  options={categoryOptions}
                  value={selectedCategoryIds}
                  onChange={setSelectedCategoryIds}
                  compact
                  summaryMode="names"
                  summaryMaxNames={2}
                />
              </div>
            </div>
          )}
          {availableLocaciones.length > 0 && (
            <div className="fimba-agenda-filter-item">
              <label className="fimba-label">Locación</label>
              <div className="fimba-agenda-filter-dropdown">
                <MultiSelectDropdown
                  className="w-full"
                  label="Locación"
                  placeholder="Todas las locaciones"
                  options={locationOptions}
                  value={selectedLocacionIds}
                  onChange={setSelectedLocacionIds}
                  compact
                  summaryMode="names"
                  summaryMaxNames={2}
                />
              </div>
            </div>
          )}
          <div className="fimba-agenda-filter-item">
            <label className="fimba-label">Artista</label>
            <div className="fimba-agenda-filter-dropdown">
              <MultiSelectDropdown
                className="w-full"
                label="Artista"
                placeholder="Toda la edición"
                options={propuestasParaFiltro.map((p) => ({
                  value: p.id,
                  label: p.nombre,
                }))}
                value={selectedPropuestaIds}
                onChange={setSelectedPropuestaIds}
                compact
                summaryMode="names"
                summaryMaxNames={2}
              />
            </div>
          </div>
          <div className="fimba-agenda-filter-item">
            <label
              className="fimba-label"
              title="Desactivado = solo agenda FIMBA. Tutti o un grupo carga la convocatoria OFRN."
            >
              Grupos OFRN
            </label>
            <div className="fimba-agenda-filter-dropdown fimba-agenda-filter-dropdown--grupos">
              <MultiSelectDropdown
                className="w-full"
                label="Grupos OFRN"
                placeholder="Ninguno"
                options={grupoOptions}
                value={selectedGrupoFilterValues}
                onChange={handleGrupoFilterChange}
                compact
                summaryMode="names"
                summaryMaxNames={2}
              />
            </div>
          </div>
        </div>
        )}
      </div>

      {(hasNonDefaultFilters || queryLocked) && (
        <div
          className="fimba-agenda-active-filters"
          role="status"
          aria-live="polite"
        >
          <div className="fimba-agenda-active-filters-main">
            <span className="fimba-agenda-active-filters-label">
              {queryLocked ? "Consulta fija" : "Filtros activos"}
            </span>
            <div className="fimba-agenda-active-filters-chips">
              {activeFilterLabels.map((label) => (
                <span key={label} className="fimba-badge fimba-agenda-filter-chip">
                  {label}
                </span>
              ))}
            </div>
            <span className="fimba-muted fimba-agenda-active-filters-count">
              {queryLocked
                ? `${eventosFiltrados.length} eventos`
                : `${eventosFiltrados.length} de ${eventos.length} eventos`}
            </span>
            {!queryLocked &&
              !ofrnIncludeActive &&
              filtroOrigen === "fimba" &&
              selectedPropuestaIds.length === 0 && (
                <span className="fimba-muted fimba-agenda-active-filters-hint">
                  Marcá Tutti o un grupo OFRN para la convocatoria.
                </span>
              )}
          </div>
          {!queryLocked && (
          <div className="fimba-agenda-active-filters-actions">
            {canCopyConsultaLink && entityFilterActiveFlag && (
              <button
                type="button"
                className="fimba-btn fimba-btn-ghost fimba-agenda-copy-link"
                onClick={handleCopyShareLink}
                title="Enlace público con token único: misma vista fija, sin login"
              >
                <IconCopy size={14} />{" "}
                {copyLinkOk ? "Enlace copiado" : "Copiar enlace de consulta"}
              </button>
            )}
            <button
              type="button"
              className="fimba-btn fimba-btn-ghost fimba-agenda-clear-filters"
              onClick={handleClearAllFilters}
            >
              <IconX size={14} /> Limpiar filtros
            </button>
          </div>
          )}
        </div>
      )}

      {eventosFiltrados.length === 0 ? (
        <div className="fimba-card fimba-muted">
          No hay eventos
          {entityFilterActiveFlag
            ? " con los artistas/grupos seleccionados"
            : " cargados"}
          {filtroOrigen === "fimba" ? " (origen FIMBA)" : ""}
          {filtroOrigen === "ofrn" ? " (origen OFRN)" : ""}
          {categoryFilterActive ? " con las categorías seleccionadas" : ""}
          {locationFilterActive ? " en las locaciones seleccionadas" : ""}
          {searchFilterActive ? " que coincidan con la búsqueda" : ""}.
          {eventosBase.length === 0
            ? readOnly
              ? "."
              : " Creá el primero con «Nuevo evento»."
            : queryLocked
              ? ""
              : " Probá Tutti o un grupo OFRN, otro origen, categoría, locación o búsqueda."}
        </div>
      ) : (
        <div className="fimba-card fimba-agenda-card">
          <div className="fimba-agenda-scroll">
            <table className="fimba-table fimba-agenda-table">
              <thead>
                <tr>
                  {!readOnly && (
                    <th
                      className="fimba-bulk-check-col"
                      style={{
                        width: 36,
                        paddingLeft: "0.65rem",
                        paddingRight: "0.25rem",
                        textAlign: "center",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={allVisibleSelected}
                        ref={(el) => {
                          if (el) el.indeterminate = someVisibleSelected;
                        }}
                        onChange={toggleSelectAllVisible}
                        title="Seleccionar todos los visibles"
                        aria-label="Seleccionar todos los eventos visibles"
                      />
                    </th>
                  )}
                  <th style={{ paddingLeft: readOnly ? "1rem" : "0.5rem" }}>
                    Evento
                  </th>
                  <th>Fecha</th>
                  <th>Hora com</th>
                  <th>Hora fin</th>
                  <th>Tipo</th>
                  <th>Detalle</th>
                  <th>Origen</th>
                  <th>Destino</th>
                  <th>Vuelo</th>
                  <th>Vehículo</th>
                  <th
                    title="Personas a bordo en el/los vehículo(s) al salir de esta parada (OFRN + FIMBA). No es el campo de asientos de equipaje del modal."
                  >
                    As. Equipaje
                  </th>
                  <th>OFRN</th>
                  <th>Artistas</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {eventosFiltrados.map((ev, idx) => {
                  const dayKey = String(ev.fecha || "").slice(0, 10);
                  const prevDayKey =
                    idx > 0
                      ? String(eventosFiltrados[idx - 1]?.fecha || "").slice(0, 10)
                      : "";
                  const showDayDivider = idx > 0 && dayKey !== prevDayKey;
                  const isTx =
                    Boolean(ev.es_traslado) ||
                    (ev.vehiculos || []).length > 0 ||
                    ev.id_gira_transporte != null;
                  const ofrnVeh =
                    flota.find((g) => Number(g.id) === Number(ev.id_gira_transporte)) ||
                    null;
                  const vehLabel =
                    (ev.vehiculos || []).length > 0
                      ? (ev.vehiculos || [])
                          .map((r) => {
                            const label = labelGiraTransporte(r.giras_transportes);
                            const pl = Math.max(0, Number(r.plazas) || 0);
                            return `${label} (${pl})`;
                          })
                          .join(", ") || "—"
                      : ofrnVeh
                        ? labelGiraTransporte(ofrnVeh)
                        : !isTx
                          ? "—"
                          : ev.es_ofrn && !ev.es_fimba
                            ? "—"
                            : "SIN SERVICIO";
                  const origen = formatAgendaOrigenLabel(ev, {
                    skipDestinoFallback: true,
                  });
                  const legacyDestinoOrigen = resolveLegacyDestinoFromDescripcion(ev);
                  const destino = resolveAgendaDestinoLabel(ev, sequencesByVehicle, {
                    isTransport: isTx,
                  });
                  const vuelo = ev.vuelo || "—";
                  const rowEditing = isRowEditing(ev.id);
                  const evKey = String(ev.id);
                  const evDraft = eventDrafts[evKey] || draftFromEvent(ev);
                  const evStatus = eventRowStatus[evKey] || "idle";
                  const evSaving = evStatus === "saving";
                  const derivedHoraFin = eventUsesDerivedHoraFin(ev);
                  const rowClass =
                    ev.origen === "ofrn"
                      ? "fimba-row-ofrn"
                      : ev.origen === "ambos"
                        ? "fimba-row-ambos"
                        : "";
                  const aoLabel =
                    ev.audiencia_ofrn === "grupos" || (ev.grupos || []).length > 0
                      ? "Grupos"
                      : ev.audiencia_ofrn === "tutti" || (ev.es_ofrn && !ev.audiencia_ofrn)
                        ? "Tutti"
                        : ev.es_ofrn
                          ? "OFRN"
                          : "—";
                  return (
                    <React.Fragment key={ev.id}>
                      {showDayDivider && (
                        <tr className="fimba-day-divider-row">
                          <td colSpan={100}>
                            <div className="fimba-day-divider-inner">
                              <span className="fimba-day-divider-label">
                                {formatFechaLargaEs(dayKey)}
                              </span>
                            </div>
                          </td>
                        </tr>
                      )}
                    <tr
                      className={rowClass}
                      onDoubleClick={
                        readOnly
                          ? undefined
                          : (e) => {
                              if (
                                e.target.closest(
                                  "button, a, input, select, textarea, label, .fimba-bulk-check-col, .fimba-agenda-actions",
                                )
                              ) {
                                return;
                              }
                              beginRowEdit(ev);
                            }
                      }
                      title={
                        readOnly
                          ? undefined
                          : rowEditing
                            ? "Editando fila · tilde confirma · Esc / X cancela"
                            : "Doble clic en la fila para editar · lápiz = formulario completo"
                      }
                      style={
                        rowEditing
                          ? { background: "rgba(148,33,109,0.06)" }
                          : undefined
                      }
                    >
                      {!readOnly && (
                        <td
                          className="fimba-bulk-check-col"
                          style={{
                            paddingLeft: "0.65rem",
                            paddingRight: "0.25rem",
                            textAlign: "center",
                            verticalAlign: "middle",
                          }}
                          onClick={(e) => e.stopPropagation()}
                          onDoubleClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={selectedEventIds.has(String(ev.id))}
                            onChange={() => toggleSelectEvent(ev.id)}
                            aria-label={`Seleccionar evento ${ev.id}`}
                          />
                        </td>
                      )}
                      <td style={{ paddingLeft: readOnly ? "1rem" : "0.5rem", whiteSpace: "nowrap" }}>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                          {ev.es_fimba && (
                            <span className="fimba-badge fimba-badge-fimba">FIMBA</span>
                          )}
                          {ev.es_ofrn && (
                            <span className="fimba-badge fimba-badge-ofrn">OFRN</span>
                          )}
                          {!ev.es_fimba && !ev.es_ofrn && (
                            <span className="fimba-muted" style={{ fontSize: "0.75rem" }}>
                              —
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ whiteSpace: "nowrap" }}>
                        {rowEditing ? (
                          <input
                            className="fimba-cell-input fimba-cell-date"
                            type="date"
                            autoFocus={rowEditFocusField === "fecha"}
                            value={evDraft.fecha || ""}
                            disabled={evSaving}
                            onChange={(e) =>
                              setEventField(ev.id, "fecha", e.target.value)
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                confirmRowEdit(ev.id);
                              }
                            }}
                            onDoubleClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <FechaCellLabel fecha={ev.fecha} />
                        )}
                      </td>
                      <td>
                        {rowEditing ? (
                          <input
                            className="fimba-cell-input"
                            type="time"
                            autoFocus={rowEditFocusField === "hora"}
                            value={evDraft.hora_inicio || ""}
                            disabled={evSaving}
                            title="Hora de comienzo"
                            onChange={(e) =>
                              setEventField(ev.id, "hora_inicio", e.target.value)
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                confirmRowEdit(ev.id);
                              }
                            }}
                            onDoubleClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          sliceTime(ev.hora_inicio)
                        )}
                      </td>
                      <td>
                        {rowEditing ? (
                          <input
                            className="fimba-cell-input"
                            type="time"
                            value={evDraft.hora_fin || ""}
                            disabled={evSaving || derivedHoraFin}
                            title={
                              derivedHoraFin
                                ? "Hora fin derivada del siguiente evento de transporte (editar en modal / Transportes)"
                                : "Hora de fin"
                            }
                            onChange={(e) =>
                              setEventField(ev.id, "hora_fin", e.target.value)
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                confirmRowEdit(ev.id);
                              }
                            }}
                            onDoubleClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          sliceTime(ev.hora_fin)
                        )}
                      </td>
                      <td>
                        <span
                          className="fimba-badge"
                          style={
                            ev.tipo_color
                              ? {
                                  background: `${ev.tipo_color}22`,
                                  color: ev.tipo_color,
                                  borderColor: `${ev.tipo_color}44`,
                                }
                              : undefined
                          }
                          title={
                            ev.categoria_nombre
                              ? `${ev.tipo_nombre || ""} · ${ev.categoria_nombre}`
                              : ev.tipo_nombre || undefined
                          }
                        >
                          {ev.tipo_nombre || "—"}
                        </span>
                        {ev.categoria_nombre && (
                          <span
                            className="fimba-muted"
                            style={{ display: "block", fontSize: "0.68rem", marginTop: 2 }}
                          >
                            {ev.categoria_nombre}
                          </span>
                        )}
                      </td>
                      <td style={{ fontWeight: 600, maxWidth: 180 }}>
                        {rowEditing ? (
                          <div
                            style={{ display: "flex", flexDirection: "column", gap: 4 }}
                            onDoubleClick={(e) => e.stopPropagation()}
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
                                autoFocus={rowEditFocusField === "actividad"}
                                value={evDraft.actividad}
                                disabled={evSaving}
                                placeholder="Detalle"
                                onChange={(e) =>
                                  setEventField(ev.id, "actividad", e.target.value)
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    confirmRowEdit(ev.id);
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
                                  confirmRowEdit(ev.id);
                                }
                              }}
                            />
                          </div>
                        ) : (
                          <>
                            <FimbaEventDetallePreview html={ev.actividad} />
                            {ev.observaciones ? (
                              <span className="fimba-muted" style={{ display: "block", fontSize: "0.75rem", fontWeight: 400 }}>
                                {ev.observaciones}
                              </span>
                            ) : null}
                          </>
                        )}
                      </td>
                      <td className="fimba-muted" style={{ maxWidth: 140 }}>
                        {rowEditing ? (
                          <div
                            className="fimba-planilla-loc-edit"
                            onDoubleClick={(e) => e.stopPropagation()}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <LocationSelectWithCreate
                              supabase={supabase}
                              options={locacionCatalogOptions}
                              value={evDraft.id_locacion || ""}
                              onChange={(id) => {
                                const next =
                                  id != null && id !== "" ? String(id) : "";
                                setEventField(ev.id, "id_locacion", next);
                              }}
                              onRefresh={refreshLocacionCatalog}
                              placeholder="Buscar locación…"
                              className="fimba-planilla-loc-select"
                            />
                          </div>
                        ) : (
                          <>
                            <div title={origen}>{origen}</div>
                            {legacyDestinoOrigen ? (
                              <span
                                style={{
                                  display: "inline-block",
                                  marginTop: 4,
                                  padding: "2px 6px",
                                  borderRadius: 4,
                                  fontSize: "0.68rem",
                                  background: "#e2e8f0",
                                  color: "#64748b",
                                  maxWidth: "100%",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                                title={`Legacy — Destino: ${legacyDestinoOrigen}`}
                              >
                                {legacyDestinoOrigen}
                              </span>
                            ) : null}
                          </>
                        )}
                      </td>
                      <td
                        className="fimba-muted"
                        style={{
                          maxWidth: 140,
                          fontStyle:
                            destino === TRANSPORT_DESTINO_SIN_SIGUIENTE ||
                            destino === TRANSPORT_DESTINO_SIN_LOCACION
                              ? "italic"
                              : undefined,
                        }}
                        title={
                          isTx && destino !== "—"
                            ? destino === TRANSPORT_DESTINO_SIN_SIGUIENTE
                              ? "Sin siguiente parada en la secuencia del vehículo"
                              : destino === TRANSPORT_DESTINO_SIN_LOCACION
                                ? "La siguiente parada no tiene locación de catálogo"
                                : `Siguiente parada del mismo vehículo: ${destino}`
                            : undefined
                        }
                      >
                        {destino}
                      </td>
                      <td className="fimba-muted" style={{ maxWidth: 100 }}>
                        {rowEditing ? (
                          <input
                            className="fimba-cell-input"
                            autoFocus={rowEditFocusField === "vuelo"}
                            value={evDraft.vuelo}
                            disabled={evSaving}
                            placeholder="Vuelo"
                            title="Vuelo / nota (línea Vuelo: en descripcion)"
                            onChange={(e) =>
                              setEventField(ev.id, "vuelo", e.target.value)
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                confirmRowEdit(ev.id);
                              }
                            }}
                            onDoubleClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          vuelo
                        )}
                      </td>
                      <td style={{ maxWidth: 220 }}>
                        {vehLabel === "SIN SERVICIO" ? (
                          <span className="fimba-badge" style={{ background: "#fef3c7", color: "#92400e" }}>
                            SIN SERVICIO
                          </span>
                        ) : (
                          vehLabel
                        )}
                      </td>
                      <td
                        title={
                          isTx
                            ? "A bordo al salir (misma métrica que Tránsito/cap en Transportes)"
                            : "Solo aplica a eventos con transporte"
                        }
                        style={{
                          fontVariantNumeric: "tabular-nums",
                          fontWeight: isTx ? 600 : undefined,
                        }}
                      >
                        {(() => {
                          if (!isTx) return "—";
                          const n = resolveEventAboardCount(
                            ev,
                            sequencesByVehicle,
                            null,
                          );
                          return n != null ? n : "—";
                        })()}
                      </td>
                      <td>
                        {ev.es_ofrn ? (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                            {(ev.grupos || []).length > 0 ? (
                              (ev.grupos || []).map((g) => (
                                <span
                                  key={g.id}
                                  className="fimba-badge fimba-badge-ofrn-grupo"
                                  style={{
                                    background: g.color ? `${g.color}22` : "#e0f2fe",
                                    color: g.color || "#0369a1",
                                    border: `1px solid ${g.color || "#7dd3fc"}44`,
                                  }}
                                >
                                  {g.nombre}
                                </span>
                              ))
                            ) : (
                              <span
                                className="fimba-badge fimba-badge-ofrn-grupo"
                                style={{
                                  background: "#e0f2fe",
                                  color: "#0369a1",
                                  border: "1px solid #7dd3fc44",
                                }}
                              >
                                {aoLabel}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="fimba-muted" style={{ fontSize: "0.8rem" }}>
                            —
                          </span>
                        )}
                      </td>
                      <td>
                        <FimbaEventArtistasTagsCell
                          ev={ev}
                          canEdit={!readOnly}
                          propuestas={propuestas}
                          giraGrupos={giraGrupos}
                          edicion={edicion}
                          onSaved={async (id) => {
                            if (id != null) await upsertAgendaEvento(id);
                            else await reloadAgendaSlices({ eventos: true });
                          }}
                        />
                      </td>
                      <td
                        className="fimba-agenda-actions"
                        style={{ textAlign: "right", paddingRight: "0.75rem", whiteSpace: "nowrap" }}
                      >
                        {!readOnly && rowEditing ? (
                          <>
                            <button
                              type="button"
                              className="fimba-btn fimba-btn-ghost"
                              onClick={() => confirmRowEdit(ev.id)}
                              onDoubleClick={(e) => e.stopPropagation()}
                              disabled={evSaving}
                              title={
                                eventRowErrors[evKey]
                                  ? eventRowErrors[evKey]
                                  : "Confirmar cambios"
                              }
                              aria-label="Confirmar cambios de la fila"
                              style={{ color: "#166534" }}
                            >
                              {evSaving ? (
                                <IconLoader size={14} className="animate-spin" />
                              ) : (
                                <IconCheck size={14} />
                              )}
                            </button>
                            <button
                              type="button"
                              className="fimba-btn fimba-btn-ghost"
                              style={{ marginLeft: 4 }}
                              onClick={() => cancelRowEdit(ev.id)}
                              onDoubleClick={(e) => e.stopPropagation()}
                              disabled={evSaving}
                              title="Cancelar (Esc)"
                              aria-label="Cancelar edición de la fila"
                            >
                              <IconX size={14} />
                            </button>
                          </>
                        ) : (
                          <>
                            {shouldShowAgendaBacklineIcon(
                              ev,
                              canSeeAgendaLogisticaConsulta,
                            ) && (
                              <button
                                type="button"
                                className="fimba-btn fimba-btn-ghost"
                                onClick={() => setBacklineConsultaEvento(ev)}
                                onDoubleClick={(e) => e.stopPropagation()}
                                title="Ver Backline"
                                aria-label="Ver Backline"
                              >
                                <IconLayers size={14} />
                              </button>
                            )}
                            {shouldShowAgendaRiderIcon(
                              ev,
                              canSeeAgendaLogisticaConsulta,
                            ) && (
                              <button
                                type="button"
                                className="fimba-btn fimba-btn-ghost"
                                style={{ marginLeft: 4 }}
                                onClick={() => setRiderConsultaEvento(ev)}
                                onDoubleClick={(e) => e.stopPropagation()}
                                title="Ver Rider"
                                aria-label="Ver Rider"
                              >
                                <IconFileText size={14} />
                              </button>
                            )}
                            {!readOnly && (
                              <>
                                <button
                                  type="button"
                                  className="fimba-btn fimba-btn-ghost"
                                  style={{ marginLeft: 4 }}
                                  onClick={() => setModal({ mode: "edit", evento: ev })}
                                  onDoubleClick={(e) => e.stopPropagation()}
                                  title="Editar"
                                >
                                  <IconEdit size={14} />
                                </button>
                                <button
                                  type="button"
                                  className="fimba-btn fimba-btn-ghost"
                                  style={{ marginLeft: 4, color: "var(--fimba-cyan, #0e7490)" }}
                                  onClick={() => openIntermediateEvent(ev)}
                                  onDoubleClick={(e) => e.stopPropagation()}
                                  title={
                                    nextSameDayNeighbor(ev)
                                      ? "Insertar evento intermedio (completa hasta→desde con el siguiente del día)"
                                      : "Insertar evento después de este (desde = hora fin)"
                                  }
                                  aria-label="Insertar evento intermedio"
                                >
                                  <IconPlus size={14} />
                                </button>
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

      {!readOnly && bulkEditOpen && (
        <FimbaBulkEditModal
          variant="agenda"
          events={selectedEvents}
          propuestas={propuestas}
          giraGrupos={giraGrupos}
          onClose={() => setBulkEditOpen(false)}
          onApplied={async () => {
            setBulkEditOpen(false);
            clearSelection();
            await reloadAgendaSlices({ eventos: true });
          }}
        />
      )}

      {!readOnly && modal &&
        createPortal(
          <FimbaEventoFormModal
            mode={modal.mode}
            evento={modal.evento}
            edicion={edicion}
            flota={flota}
            propuestas={propuestas}
            preselectPropuesta={modal.preselectPropuesta}
            defaultTipoId={FIMBA_DEFAULT_TIPO_EVENTO}
            forceTransporte={false}
            focusTags={Boolean(modal.focusTags)}
            logisticsSummary={logisticsSummary}
            propuestaRoutes={propuestaRoutes}
            sequencesByVehicle={sequencesByVehicle}
            onClose={() => setModal(null)}
            onBoardingRefresh={handleBoardingRefresh}
            onSaved={async ({ id } = {}) => {
              setModal(null);
              if (id != null) {
                await upsertAgendaEvento(id);
              } else {
                await reloadAgendaSlices({ eventos: true });
              }
            }}
          />,
          document.body,
        )}

      <FimbaBacklineConsultaModal
        open={!!backlineConsultaEvento}
        evento={backlineConsultaEvento}
        onClose={() => setBacklineConsultaEvento(null)}
      />
      <FimbaRiderConsultaModal
        open={!!riderConsultaEvento}
        evento={riderConsultaEvento}
        onClose={() => setRiderConsultaEvento(null)}
      />
    </div>
  );
}
