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
  getFimbaEdicionById,
  giraTransporteIdsFromEvent,
  labelGiraTransporte,
  listFimbaAgenda,
  listFimbaFlota,
  listFimbaGiraGrupos,
  listFimbaPropuestaRutas,
  listFimbaPropuestas,
  buildAllFimbaAgendaRideBlocks,
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
  resolveEventAboardCount,
  TRANSPORT_DESTINO_SIN_SIGUIENTE,
} from "../../utils/fimbaTransportBoarding";
import {
  buildFimbaAgendaConsultaSharePath,
  buildFimbaAgendaSharePath,
  eventMatchesAgendaEntityFilter,
  hasAgendaEntityFilter,
  parseFimbaAgendaUrlSearchParams,
  resolveGrupoIdsFromNames,
} from "../../utils/fimbaAgendaUrlParams";
import { useFimbaAccess } from "../../context/FimbaAccessContext";
import { useFimbaConsultaEdicionSession } from "../../hooks/useFimbaConsultaEdicionSession";
import FimbaEventoFormModal from "./FimbaEventoFormModal";
import { FimbaEventDetallePreview } from "./FimbaEventDetalleField";

const FIMBA_AGENDA_SEARCH_DEBOUNCE_MS = 250;

/**
 * Input aislado (mismo patrón que UnifiedAgenda.AgendaSearchField):
 * texto local inmediato; filtro de planilla con debounce 250ms.
 */
function FimbaAgendaSearchField({ onQueryChange }) {
  const [localQuery, setLocalQuery] = useState("");
  const onQueryChangeRef = useRef(onQueryChange);
  const timerRef = useRef(null);

  useEffect(() => {
    onQueryChangeRef.current = onQueryChange;
  }, [onQueryChange]);

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
 * Agenda unificada FIMBA: planilla de eventos (traslados + actividades)
 * más convocatoria orquesta OFRN de la misma gira.
 */
export default function FimbaAgendaPage() {
  const { edicionId, artistaId } = useParams();
  const { readOnly } = useFimbaAccess();
  const consultaSession = useFimbaConsultaEdicionSession();
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
  const [allRideBlocks, setAllRideBlocks] = useState([]);
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
  /** Default: Solo FIMBA (no Todos). Con filtros de entidad → all. */
  const [filtroOrigen, setFiltroOrigen] = useState(() => {
    if (hasAgendaEntityFilter(urlFilters.propuestaIds, urlFilters.grupoIds)) {
      return "all";
    }
    return urlFilters.origen === "ofrn" ? "ofrn" : "fimba";
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
  const handleAgendaSearchQueryChange = useCallback((query) => {
    setAgendaSearchQuery(query);
  }, []);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [modal, setModal] = useState(null);

  const entityFilterActive = hasAgendaEntityFilter(
    selectedPropuestaIds,
    selectedGrupoIds,
  );
  const entityFilterActiveFlag =
    entityFilterActive &&
    (selectedPropuestaIds.length > 0 || selectedGrupoIds.length > 0);

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
          listFimbaAgenda(edicionId),
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
      const { blocks: rideBlocks, error: rideErr } =
        await buildAllFimbaAgendaRideBlocks({
          propuestas: props,
          propuestaRoutes: rutas,
          eventos: baseEventos,
          flota: fleet,
        });
      if (rideErr) {
        console.warn("[FIMBA] Ride segments no precargados:", rideErr);
      }
      setEdicion(ed);
      setPropuestas(props);
      setGiraGrupos(gruposRes.grupos || []);
      setFlota(fleet);
      setEventosBase(baseEventos);
      setAllRideBlocks(rideBlocks || []);
      setLogisticsSummary(logRes.error ? [] : logRes.summary || []);
      setPropuestaRoutes(rutas);
    } finally {
      setInitialLoading(false);
      setRefreshing(false);
    }
  }, [edicionId]);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    setSelectedPropuestaIds(urlFilters.propuestaIds);
    setSelectedGrupoIds(urlFilters.grupoIds);
    if (urlFilters.locacionIds.length > 0) {
      setSelectedLocacionIds(urlFilters.locacionIds);
    }
    if (hasAgendaEntityFilter(urlFilters.propuestaIds, urlFilters.grupoIds)) {
      setFiltroOrigen("all");
    } else if (urlFilters.origen) {
      setFiltroOrigen(urlFilters.origen);
    }
  }, [
    urlFilters.propuestaIds.join(","),
    urlFilters.grupoIds.join(","),
    urlFilters.locacionIds.join(","),
    urlFilters.origen,
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
      (incoming.locacionIds.length > 0 &&
        selectedLocacionIds.join(",") !== incoming.locacionIds.join(","));
    if (statePending) return;

    const path = buildFimbaAgendaSharePath(location.pathname, {
      propuestaIds: selectedPropuestaIds,
      grupoIds: selectedGrupoIds,
      locacionIds: selectedLocacionIds,
      origen: entityFilterActiveFlag ? "all" : filtroOrigen,
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
    selectedLocacionIds,
    filtroOrigen,
    entityFilterActiveFlag,
    location.pathname,
    location.search,
    setSearchParams,
  ]);

  // Con filtro por artista/grupo no hay chips de origen útil; forzar all
  useEffect(() => {
    if (entityFilterActive) setFiltroOrigen("all");
  }, [entityFilterActive]);

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
      const valid = new Set((giraGrupos || []).map((g) => Number(g.id)));
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
    () =>
      (giraGrupos || []).map((g) => ({
        value: g.id,
        label: g.nombre,
        color: g.color || null,
      })),
    [giraGrupos],
  );

  /**
   * Agenda base + ride segments de artistas filtrados (merge en memoria).
   * Sin filtro de artista no se insertan bloques «A bordo».
   */
  const eventos = useMemo(() => {
    if (selectedPropuestaIds.length === 0) return eventosBase;
    const want = new Set(selectedPropuestaIds.map(Number));
    const blocks = allRideBlocks.filter((b) =>
      want.has(Number(b.id_propuesta)),
    );
    if (blocks.length === 0) return eventosBase;
    return mergeAgendaWithTrasladoBlocks(eventosBase, blocks);
  }, [eventosBase, allRideBlocks, selectedPropuestaIds.join(",")]);

  const eventosFiltrados = useMemo(() => {
    let list = eventos;
    if (entityFilterActiveFlag) {
      list = list.filter((ev) =>
        eventMatchesAgendaEntityFilter(
          ev,
          selectedPropuestaIds,
          selectedGrupoIds,
        ),
      );
    }
    if (filtroOrigen === "fimba") {
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
    selectedCategoryIds,
    selectedLocacionIds,
    agendaSearchQuery,
    searchFilterActive,
    flotaById,
  ]);

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
    reload({ soft: true });
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
    });
    if (err || !copy?.id) {
      setError(err?.message || "No se pudo duplicar");
      return;
    }
    await reload({ soft: true });
    setModal({ mode: "edit", evento: copy });
  };

  /**
   * Vecino siguiente del mismo día en la planilla visible (sin ride segments).
   * Insertar entre esta fila y ese next = completar hasta→desde.
   */
  const nextSameDayNeighbor = (ev) => {
    const day = String(ev?.fecha || "").slice(0, 10);
    if (!day) return null;
    const list = eventosFiltrados.filter(
      (r) => !r.es_ride_segment && String(r.fecha || "").slice(0, 10) === day,
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
    const grupoNames =
      selectedGrupoIds.length > 0
        ? (giraGrupos || [])
            .filter((g) =>
              selectedGrupoIds.some((id) => String(id) === String(g.id)),
            )
            .map((g) => g.nombre)
        : [];
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
      filtroOrigen: entityFilterActiveFlag ? "all" : filtroOrigen,
      filtroArtistaNombres: artistaNombres,
      grupoNames,
      categoryNames,
      locationNames,
      searchQuery: searchFilterActive ? agendaSearchQuery : "",
    });
    const title =
      artistaNombres.length === 1
        ? `Agenda FIMBA — ${artistaNombres[0]}`
        : artistaNombres.length > 1 || grupoNames.length > 0
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
      origen: entityFilterActiveFlag ? "all" : filtroOrigen,
    };
    const consultaToken =
      consultaSession?.token || edicion?.token_consulta || null;
    const publicPath = consultaToken
      ? buildFimbaAgendaConsultaSharePath(consultaToken, filters)
      : null;
    const path =
      publicPath ||
      buildFimbaAgendaSharePath(`/fimba/edicion/${edicionId}/agenda`, filters);
    const url = `${window.location.origin}${path}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt("Copiá este enlace:", url);
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
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: 8,
            flex: 1,
            minWidth: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <FimbaAgendaSearchField onQueryChange={handleAgendaSearchQueryChange} />
            {!entityFilterActiveFlag && (
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
            {availableCategories.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 200 }}>
                <label className="fimba-label" style={{ margin: 0 }}>
                  Categoría
                </label>
                <div style={{ minWidth: 200, width: 220 }}>
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
              <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 200 }}>
                <label className="fimba-label" style={{ margin: 0 }}>
                  Locación
                </label>
                <div style={{ minWidth: 200, width: 220 }}>
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
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 200 }}>
                <label className="fimba-label" style={{ margin: 0 }}>
                  Artista
                </label>
                <div style={{ minWidth: 200, width: 220 }}>
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
              {grupoOptions.length > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 200 }}>
                  <label className="fimba-label" style={{ margin: 0 }}>
                    Grupos OFRN
                  </label>
                  <div style={{ minWidth: 160, width: 180 }}>
                    <MultiSelectDropdown
                      className="w-full"
                      label="Grupos OFRN"
                      placeholder="Todos"
                      options={grupoOptions}
                      value={selectedGrupoIds}
                      onChange={setSelectedGrupoIds}
                      compact
                      summaryMode="names"
                      summaryMaxNames={2}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <button
              type="button"
              className="fimba-btn fimba-btn-ghost"
              onClick={handleCopyShareLink}
              title="Copiar enlace público (consulta, sin login) con los filtros actuales"
            >
              <IconCopy size={14} /> Copiar enlace
            </button>
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
      </div>

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
            : " Probá otro origen, categoría, locación o búsqueda."}
        </div>
      ) : (
        <div className="fimba-card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table className="fimba-table">
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
                  const isRide = Boolean(ev.es_ride_segment);
                  const isTx =
                    Boolean(ev.es_traslado) ||
                    (ev.vehiculos || []).length > 0 ||
                    ev.id_gira_transporte != null ||
                    isRide;
                  const ofrnVeh =
                    flota.find((g) => Number(g.id) === Number(ev.id_gira_transporte)) ||
                    null;
                  const vehLabel = isRide
                    ? ev.vehicle_label ||
                      (ev.vehiculos || [])
                        .map((r) => {
                          const label = labelGiraTransporte(r.giras_transportes);
                          const pl = Number(r.plazas) || 0;
                          return pl ? `${label} (${pl})` : label;
                        })
                        .join(", ") ||
                      "—"
                    : (ev.vehiculos || []).length > 0
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
                  const origen = isRide
                    ? ev.route_snippet?.split(" → ")?.[0]?.trim() ||
                      formatAgendaOrigenLabel(ev, { skipDestinoFallback: true })
                    : formatAgendaOrigenLabel(ev, {
                        skipDestinoFallback: isTx,
                      });
                  const destino = isRide
                    ? ev.route_snippet?.includes(" → ")
                      ? ev.route_snippet.split(" → ").slice(1).join(" → ").trim()
                      : resolveAgendaDestinoLabel(ev, sequencesByVehicle, {
                          isTransport: true,
                        })
                    : resolveAgendaDestinoLabel(ev, sequencesByVehicle, {
                        isTransport: isTx,
                      });
                  const vuelo = ev.vuelo || "—";
                  const rowClass =
                    isRide
                      ? ""
                      : ev.origen === "ofrn"
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
                    <tr
                      key={ev.id}
                      className={rowClass}
                      style={
                        isRide
                          ? { background: "rgba(0, 177, 235, 0.06)" }
                          : undefined
                      }
                    >
                      <td style={{ paddingLeft: "1rem", whiteSpace: "nowrap" }}>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                          {isRide ? (
                            <span className="fimba-badge fimba-badge-fimba">A bordo</span>
                          ) : (
                            <>
                              {ev.es_fimba && (
                                <span className="fimba-badge fimba-badge-fimba">FIMBA</span>
                              )}
                              {ev.es_ofrn && (
                                <span className="fimba-badge fimba-badge-ofrn">OFRN</span>
                              )}
                              {!ev.es_fimba && !ev.es_ofrn && (
                                <span className="fimba-muted" style={{ fontSize: "0.75rem" }}>—</span>
                              )}
                            </>
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
                      <td className="fimba-muted" style={{ maxWidth: 140 }} title={origen}>
                        {origen}
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
                        {ev.es_ofrn && !isRide ? (
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
                          {isRide ? (
                            <span className="fimba-muted" style={{ fontSize: "0.8rem" }}>
                              Transportes
                            </span>
                          ) : (
                            <>
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
                            </>
                          )}
                        </div>
                      </td>
                      <td style={{ textAlign: "right", paddingRight: "0.75rem", whiteSpace: "nowrap" }}>
                        {!readOnly && !isRide && (
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
                        {isRide && (
                          <span
                            className="fimba-muted"
                            style={{ fontSize: "0.72rem" }}
                            title="Definido en Transportes (suben/bajan)"
                          >
                            —
                          </span>
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
            onClose={() => setModal(null)}
            onSaved={() => {
              setModal(null);
              reload({ soft: true });
            }}
          />,
          document.body,
        )}
    </div>
  );
}
