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
  IconPrinter,
} from "../../components/ui/Icons";
import MultiSelectDropdown from "../../components/ui/MultiSelectDropdown";
import {
  categoriesFromTiposEvento,
  mergeFimbaAgendaCategories,
  listTiposEventoForFimba,
  deleteFimbaEvento,
  duplicateFimbaEvento,
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
} from "../../services/fimbaService";
import { normalizeForSearch } from "../../utils/sanitize";
import { stripHtml } from "../../utils/eventDisplayUtils";
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
} from "../../utils/fimbaTransportBoarding";
import {
  FIMBA_AGENDA_TUTTI_VALUE,
  buildFimbaAgendaConsultaSharePath,
  buildFimbaAgendaSharePath,
  eventMatchesAgendaEntityFilter,
  hasAgendaEntityFilter,
  hasOfrnConvocatoriaFilter,
  isFimbaAgendaTuttiValue,
  parseFimbaAgendaUrlSearchParams,
  resolveGrupoIdsFromNames,
} from "../../utils/fimbaAgendaUrlParams";
import { useFimbaAccess } from "../../context/FimbaAccessContext";
import FimbaEventoFormModal from "./FimbaEventoFormModal";
import { FimbaEventDetallePreview } from "./FimbaEventDetalleField";

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
  const { readOnly, agendaOnly, source } = useFimbaAccess();
  const canCopyConsultaLink =
    source === "ofrn" || source === "fimba_editor";
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const urlFilters = useMemo(
    () =>
      parseFimbaAgendaUrlSearchParams(searchParams, {
        routeArtistaId: artistaId,
      }),
    [searchParams, artistaId],
  );

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
    () => urlFilters.propuestaIds,
  );
  const [selectedGrupoIds, setSelectedGrupoIds] = useState(
    () => urlFilters.grupoIds,
  );
  /** Opt-in convocatoria Tutti (off por defecto). */
  const [includeTutti, setIncludeTutti] = useState(
    () => Boolean(urlFilters.includeTutti),
  );
  /**
   * Default: Solo FIMBA. Grupo/Tutti incluyen orquesta → all.
   * Artista solo no fuerza all (evita volcar toda la convocatoria OFRN).
   */
  const [filtroOrigen, setFiltroOrigen] = useState(() => {
    if (hasOfrnConvocatoriaFilter(urlFilters.grupoIds, urlFilters.includeTutti)) {
      return "all";
    }
    return urlFilters.origen || "fimba";
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
    () => urlFilters.locacionIds,
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
    setSelectedPropuestaIds(urlFilters.propuestaIds);
    setSelectedGrupoIds(urlFilters.grupoIds);
    setIncludeTutti(Boolean(urlFilters.includeTutti));
    setSelectedLocacionIds(urlFilters.locacionIds);
    if (hasOfrnConvocatoriaFilter(urlFilters.grupoIds, urlFilters.includeTutti)) {
      setFiltroOrigen("all");
    } else {
      setFiltroOrigen(urlFilters.origen || "fimba");
    }
  }, [
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

  // Quitar de la selección ids que ya no existen en la agenda cargada
  useEffect(() => {
    setSelectedCategoryIds((prev) => {
      if (prev.length === 0) return prev;
      const valid = new Set(availableCategories.map((c) => c.id));
      const next = prev.filter((id) => valid.has(Number(id)));
      if (next.length === prev.length) return prev;
      return next;
    });
  }, [availableCategories]);

  useEffect(() => {
    setSelectedLocacionIds((prev) => {
      if (prev.length === 0) return prev;
      const valid = new Set(availableLocaciones.map((l) => l.id));
      const next = prev.filter((id) => valid.has(Number(id)));
      if (next.length === prev.length) return prev;
      return next;
    });
  }, [availableLocaciones]);

  useEffect(() => {
    setSelectedGrupoIds((prev) => {
      if (prev.length === 0) return prev;
      // No vaciar ids de la URL antes de que llegue el catálogo de la gira.
      if (!giraGrupos?.length) return prev;
      const valid = new Set(giraGrupos.map((g) => Number(g.id)));
      const next = prev.filter((id) => valid.has(Number(id)));
      if (next.length === prev.length) return prev;
      return next;
    });
  }, [giraGrupos]);

  useEffect(() => {
    setSelectedPropuestaIds((prev) => {
      if (prev.length === 0) return prev;
      const valid = new Set((propuestas || []).map((p) => Number(p.id)));
      const next = prev.filter((id) => valid.has(Number(id)));
      if (next.length === prev.length) return prev;
      return next;
    });
  }, [propuestas]);

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
    setFiltroOrigen("fimba");
    setSelectedCategoryIds([]);
    setSelectedLocacionIds([]);
    setSelectedPropuestaIds([]);
    setSelectedGrupoIds([]);
    setIncludeTutti(false);
    setAgendaSearchQuery("");
    setSearchResetSignal((n) => n + 1);
  }, []);

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
    const filters = {
      propuestaIds: selectedPropuestaIds,
      grupoIds: selectedGrupoIds,
      locacionIds: selectedLocacionIds,
      includeTutti,
      origen: ofrnIncludeActive ? "all" : filtroOrigen,
    };
    const consultaToken =
      edicion?.token_consulta || null;
    const publicPath = consultaToken
      ? buildFimbaAgendaConsultaSharePath(consultaToken, filters)
      : null;
    if (!publicPath) {
      window.alert("No hay token de consulta para esta edición.");
      return;
    }
    const url = `${window.location.origin}${publicPath}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopyLinkOk(true);
      window.setTimeout(() => setCopyLinkOk(false), 2500);
    } catch {
      window.prompt("Copiá este enlace de consulta (solo lectura, solo agenda):", url);
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
            Planilla unificada · FIMBA + orquesta OFRN (misma gira)
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
                title="Enlace público solo lectura: abre la agenda filtrada sin login"
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
      </div>

      {hasNonDefaultFilters && (
        <div
          className="fimba-agenda-active-filters"
          role="status"
          aria-live="polite"
        >
          <div className="fimba-agenda-active-filters-main">
            <span className="fimba-agenda-active-filters-label">Filtros activos</span>
            <div className="fimba-agenda-active-filters-chips">
              {activeFilterLabels.map((label) => (
                <span key={label} className="fimba-badge fimba-agenda-filter-chip">
                  {label}
                </span>
              ))}
            </div>
            <span className="fimba-muted fimba-agenda-active-filters-count">
              {eventosFiltrados.length} de {eventos.length} eventos
            </span>
          </div>
          {!ofrnIncludeActive && filtroOrigen === "fimba" && (
            <p className="fimba-muted fimba-agenda-active-filters-hint">
              La planilla muestra la agenda FIMBA. Marcá Tutti o un grupo OFRN
              para cargar la convocatoria de orquesta.
            </p>
          )}
          <div className="fimba-agenda-active-filters-actions">
            {canCopyConsultaLink && entityFilterActiveFlag && (
              <button
                type="button"
                className="fimba-btn fimba-btn-ghost fimba-agenda-copy-link"
                onClick={handleCopyShareLink}
                title="Enlace público solo lectura con artistas/grupos filtrados (sin login)"
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
            : " Probá Tutti o un grupo OFRN, otro origen, categoría, locación o búsqueda."}
        </div>
      ) : (
        <div className="fimba-card fimba-agenda-card">
          <div className="fimba-agenda-scroll">
            <table className="fimba-table fimba-agenda-table">
              <thead>
                <tr>
                  <th style={{ paddingLeft: "1rem" }}>Evento</th>
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
                {eventosFiltrados.map((ev) => {
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
                    <tr key={ev.id} className={rowClass}>
                      <td style={{ paddingLeft: "1rem", whiteSpace: "nowrap" }}>
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
                      <td style={{ whiteSpace: "nowrap" }}>{formatFecha(ev.fecha)}</td>
                      <td>{sliceTime(ev.hora_inicio)}</td>
                      <td>{sliceTime(ev.hora_fin)}</td>
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
                        <FimbaEventDetallePreview html={ev.actividad} />
                        {ev.observaciones ? (
                          <span className="fimba-muted" style={{ display: "block", fontSize: "0.75rem", fontWeight: 400 }}>
                            {ev.observaciones}
                          </span>
                        ) : null}
                      </td>
                      <td className="fimba-muted" style={{ maxWidth: 140 }}>
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
                      </td>
                      <td
                        className="fimba-muted"
                        style={{ maxWidth: 140 }}
                        title={
                          isTx && destino !== "—"
                            ? destino === TRANSPORT_DESTINO_SIN_SIGUIENTE
                              ? "Sin siguiente parada en la secuencia del vehículo"
                              : `Siguiente parada del mismo vehículo: ${destino}`
                            : undefined
                        }
                      >
                        {destino}
                      </td>
                      <td className="fimba-muted" style={{ maxWidth: 100 }}>
                        {vuelo}
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
                      <td style={{ textAlign: "right", paddingRight: "0.75rem", whiteSpace: "nowrap" }}>
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
                              className="fimba-btn fimba-btn-ghost"
                              style={{ marginLeft: 4, color: "var(--fimba-cyan, #0e7490)" }}
                              onClick={() => openIntermediateEvent(ev)}
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
                              title="Duplicar"
                            >
                              <IconCopy size={14} />
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
    </div>
  );
}
