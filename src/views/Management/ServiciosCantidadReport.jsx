import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { parseISO, startOfDay } from "date-fns";
import {
  TIPOS_PROGRAMA_ASISTENCIA_MATRIZ,
} from "../../services/giraService";
import {
  buildServiciosComputeContext,
  downloadServiciosCantidadExcel,
  fetchServiciosCantidadBaseData,
  resolveRostersForPrograms,
} from "../../services/serviciosCantidadService";
import {
  buildAsistenciaMatrixRowGroups,
} from "../../utils/asistenciaMatrixExport";
import {
  CONVOCATORIA_ENSAMBLE_VIEW_MODES,
  CONVOCATORIA_VIEW_SECTION_TITLES,
  SIN_REGION_LABEL,
  filterEnsamblesForConvocatoriaView,
  groupRegionalEnsamblesByRegion,
} from "../../utils/convocatoriaEnsambleViews";
import {
  buildMatrixIntegranteInstrumentDisplay,
  compareInstrumentIds,
} from "../../utils/giraUtils";
import { integranteKey } from "../../utils/integranteIds";
import {
  SERVICIO_COLUMN_DEFS,
  accumulateServiciosForIntegrante,
  bucketTotal,
  formatServicioNumber,
  formatServicioParts,
  sumBuckets,
} from "../../utils/serviciosCantidad";
import {
  IconChevronDown,
  IconDownload,
  IconHistory,
} from "../../components/ui/Icons";

function createEmptySelectionByMode() {
  return {
    ensambles: new Set(),
    cameratas: new Set(),
    regiones: new Set(),
  };
}

function filterProgramasForServicios(programas, { selectedTypes, showPastInYear }) {
  const today = startOfDay(new Date());
  const currentYear = today.getFullYear();
  return (programas || []).filter((p) => {
    const tipo = p.tipo;
    if (!tipo || !selectedTypes.has(tipo)) return false;
    if (!p.fecha_desde) return false;
    let fd;
    try {
      fd = startOfDay(parseISO(p.fecha_desde));
    } catch {
      return false;
    }
    if (fd >= today) return true;
    if (showPastInYear && fd < today && fd.getFullYear() === currentYear) {
      return true;
    }
    return false;
  });
}

function sortIntegrantesByInstrument(integrantes) {
  return [...integrantes].sort((a, b) => {
    const cmp = compareInstrumentIds(a.id_instr, b.id_instr);
    if (cmp !== 0) return cmp;
    const na = `${a.apellido || ""} ${a.nombre || ""}`.trim();
    const nb = `${b.apellido || ""} ${b.nombre || ""}`.trim();
    return na.localeCompare(nb, "es");
  });
}

function ServicioCellValue({ bucket }) {
  const parts = formatServicioParts(bucket);
  return (
    <span className="inline-flex items-baseline justify-end gap-0 tabular-nums">
      {parts.map((p, i) => (
        <span
          key={`${p.tone}-${i}`}
          className={
            p.tone === "reemplazo"
              ? "font-semibold text-sky-600"
              : p.tone === "licencia"
                ? "font-semibold text-amber-600"
                : p.text === "—"
                  ? "text-slate-300"
                  : "text-slate-800"
          }
        >
          {p.text}
        </span>
      ))}
    </span>
  );
}

/**
 * Gestión → Servicios: cantidad de servicios por integrante.
 * Filtros alineados a Convocatorias.
 */
export default function ServiciosCantidadReport({ supabase }) {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [programas, setProgramas] = useState([]);
  const [integrantes, setIntegrantes] = useState([]);
  const [ensambles, setEnsambles] = useState([]);
  const [memberships, setMemberships] = useState([]);
  const [membershipsTree, setMembershipsTree] = useState([]);
  const [instrumentCatalog, setInstrumentCatalog] = useState([]);
  const [giraInstrumentOverrideMap, setGiraInstrumentOverrideMap] = useState(
    () => new Map(),
  );
  const [events, setEvents] = useState([]);
  const [customRows, setCustomRows] = useState([]);
  const [grupoMemberRows, setGrupoMemberRows] = useState([]);

  const [selectedTypes, setSelectedTypes] = useState(
    () => new Set(["Sinfónico", "Camerata Filarmónica"]),
  );
  const [showPastInYear, setShowPastInYear] = useState(true);
  const [groupByEnsambles, setGroupByEnsambles] = useState(false);
  const [selectedIntegranteIdsByMode, setSelectedIntegranteIdsByMode] =
    useState(createEmptySelectionByMode);
  const [openEnsambles, setOpenEnsambles] = useState(() => new Set());
  const [ensambleViewMode, setEnsambleViewMode] = useState("ensambles");
  const [openRegions, setOpenRegions] = useState(() => new Set());

  const [rosterByGiraId, setRosterByGiraId] = useState({});
  const [rosterLoading, setRosterLoading] = useState(false);

  const ensambleCheckboxRefs = useRef({});
  const regionCheckboxRefs = useRef({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      const res = await fetchServiciosCantidadBaseData(supabase);
      if (cancelled) return;
      if (res.error) {
        setLoadError(res.error.message || "Error al cargar datos");
        setLoading(false);
        return;
      }
      setProgramas(res.programas || []);
      setIntegrantes(res.integrantes || []);
      setEnsambles(res.ensambles || []);
      setMemberships(res.memberships || []);
      setMembershipsTree(res.membershipsTree || res.memberships || []);
      setInstrumentCatalog(res.instrumentCatalog || []);
      setGiraInstrumentOverrideMap(res.giraInstrumentOverrideMap || new Map());
      setEvents(res.events || []);
      setCustomRows(res.customRows || []);
      setGrupoMemberRows(res.grupoMemberRows || []);
      setSelectedIntegranteIdsByMode(createEmptySelectionByMode());
      setOpenEnsambles(new Set());
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const membershipsByEnsamble = useMemo(() => {
    const map = new Map();
    for (const row of membershipsTree) {
      const eid = Number(row.id_ensamble);
      const iid = integranteKey(row.id_integrante);
      if (!iid) continue;
      if (!map.has(eid)) map.set(eid, []);
      map.get(eid).push(iid);
    }
    return map;
  }, [membershipsTree]);

  const visibleEnsamblesForView = useMemo(
    () => filterEnsamblesForConvocatoriaView(ensambles, ensambleViewMode),
    [ensambles, ensambleViewMode],
  );

  const regionGroups = useMemo(() => {
    if (ensambleViewMode !== "regiones") return [];
    return groupRegionalEnsamblesByRegion(ensambles)
      .map((group) => ({
        ...group,
        ensambles: group.ensambles.filter((en) => {
          const memberIds = membershipsByEnsamble.get(Number(en.id)) || [];
          return memberIds.length > 0;
        }),
      }))
      .filter((group) => group.ensambles.length > 0);
  }, [ensambles, ensambleViewMode, membershipsByEnsamble]);

  const visibleIntegranteIdsForView = useMemo(() => {
    const ids = new Set();
    for (const en of visibleEnsamblesForView) {
      const memberIds = membershipsByEnsamble.get(Number(en.id)) || [];
      memberIds.forEach((id) => ids.add(id));
    }
    return ids;
  }, [visibleEnsamblesForView, membershipsByEnsamble]);

  const selectedIntegranteIds = useMemo(
    () => selectedIntegranteIdsByMode[ensambleViewMode] ?? new Set(),
    [selectedIntegranteIdsByMode, ensambleViewMode],
  );

  const ensamblesForGrouping = useMemo(
    () => filterEnsamblesForConvocatoriaView(ensambles, "ensambles"),
    [ensambles],
  );

  const integranteById = useMemo(() => {
    const m = new Map();
    for (const it of integrantes) m.set(integranteKey(it.id), it);
    return m;
  }, [integrantes]);

  const integrantesInMatrix = useMemo(() => {
    const ids = new Set(
      membershipsTree.map((x) => integranteKey(x.id_integrante)).filter(Boolean),
    );
    return sortIntegrantesByInstrument(
      integrantes.filter((it) => ids.has(integranteKey(it.id))),
    );
  }, [integrantes, membershipsTree]);

  const filteredProgramas = useMemo(
    () =>
      filterProgramasForServicios(programas, {
        selectedTypes,
        showPastInYear,
      }),
    [programas, selectedTypes, showPastInYear],
  );

  useEffect(() => {
    let cancelled = false;
    const giras = filteredProgramas;
    if (!giras.length || !supabase) {
      setRosterByGiraId({});
      setRosterLoading(false);
      return;
    }
    if (selectedIntegranteIds.size === 0) {
      setRosterByGiraId({});
      setRosterLoading(false);
      return;
    }
    (async () => {
      setRosterLoading(true);
      const map = await resolveRostersForPrograms(supabase, giras);
      if (cancelled) return;
      setRosterByGiraId(map);
      setRosterLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [filteredProgramas, supabase, selectedIntegranteIds]);

  const visibleRows = useMemo(
    () =>
      integrantesInMatrix.filter((it) =>
        selectedIntegranteIds.has(integranteKey(it.id)),
      ),
    [integrantesInMatrix, selectedIntegranteIds],
  );

  const visibleRowsEnriched = useMemo(
    () =>
      visibleRows.map((row) =>
        buildMatrixIntegranteInstrumentDisplay(
          row,
          filteredProgramas,
          rosterByGiraId,
          giraInstrumentOverrideMap,
          instrumentCatalog,
        ),
      ),
    [
      visibleRows,
      filteredProgramas,
      rosterByGiraId,
      giraInstrumentOverrideMap,
      instrumentCatalog,
    ],
  );

  const computeCtx = useMemo(
    () =>
      buildServiciosComputeContext({
        rosterByGiraId,
        memberships,
        customRows,
        grupoMemberRows,
        programas,
        filteredProgramas,
        showPastInYear,
      }),
    [
      rosterByGiraId,
      memberships,
      customRows,
      grupoMemberRows,
      programas,
      filteredProgramas,
      showPastInYear,
    ],
  );

  const bucketsByIntegranteId = useMemo(() => {
    const out = {};
    if (rosterLoading) return out;
    for (const row of visibleRowsEnriched) {
      const iid = integranteKey(row.id);
      out[iid] = accumulateServiciosForIntegrante(iid, events, computeCtx);
    }
    return out;
  }, [visibleRowsEnriched, events, computeCtx, rosterLoading]);

  const rowGroups = useMemo(() => {
    if (ensambleViewMode === "cameratas") {
      if (visibleRowsEnriched.length === 0) return [];
      return [
        {
          key: "cameratas",
          label: null,
          rows: visibleRowsEnriched,
        },
      ];
    }
    return buildAsistenciaMatrixRowGroups(
      visibleRowsEnriched,
      ensamblesForGrouping,
      membershipsByEnsamble,
      selectedIntegranteIds,
    );
  }, [
    ensambleViewMode,
    visibleRowsEnriched,
    ensamblesForGrouping,
    membershipsByEnsamble,
    selectedIntegranteIds,
  ]);

  const columnTotals = useMemo(() => {
    const list = visibleRowsEnriched.map(
      (r) => bucketsByIntegranteId[integranteKey(r.id)],
    );
    return sumBuckets(list);
  }, [visibleRowsEnriched, bucketsByIntegranteId]);

  const toggleType = useCallback((tipo) => {
    setSelectedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(tipo)) next.delete(tipo);
      else next.add(tipo);
      return next;
    });
  }, []);

  const patchSelectionForMode = useCallback(
    (updater) => {
      setSelectedIntegranteIdsByMode((prev) => {
        const current = new Set(prev[ensambleViewMode] || []);
        const next = updater(current);
        return { ...prev, [ensambleViewMode]: next };
      });
    },
    [ensambleViewMode],
  );

  const toggleIntegrante = useCallback(
    (id) => {
      const n = integranteKey(id);
      if (!n) return;
      patchSelectionForMode((prev) => {
        const next = new Set(prev);
        if (next.has(n)) next.delete(n);
        else next.add(n);
        return next;
      });
    },
    [patchSelectionForMode],
  );

  const toggleEnsambleMembers = useCallback(
    (_ensambleId, memberIds) => {
      patchSelectionForMode((prev) => {
        const allSelected = memberIds.every((id) => prev.has(id));
        const next = new Set(prev);
        if (allSelected) memberIds.forEach((id) => next.delete(id));
        else memberIds.forEach((id) => next.add(id));
        return next;
      });
    },
    [patchSelectionForMode],
  );

  const toggleEnsambleOpen = useCallback((id) => {
    setOpenEnsambles((prev) => {
      const next = new Set(prev);
      const n = Number(id);
      if (next.has(n)) next.delete(n);
      else next.add(n);
      return next;
    });
  }, []);

  const toggleRegionOpen = useCallback((key) => {
    setOpenRegions((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  useEffect(() => {
    const ensList =
      ensambleViewMode === "regiones"
        ? regionGroups.flatMap((g) => g.ensambles)
        : visibleEnsamblesForView;
    for (const en of ensList) {
      const eid = Number(en.id);
      const memberIds = membershipsByEnsamble.get(eid) || [];
      const ref = ensambleCheckboxRefs.current[eid];
      if (!ref) continue;
      const selected = memberIds.filter((id) => selectedIntegranteIds.has(id));
      ref.indeterminate =
        selected.length > 0 && selected.length < memberIds.length;
    }
  }, [
    ensambleViewMode,
    regionGroups,
    visibleEnsamblesForView,
    membershipsByEnsamble,
    selectedIntegranteIds,
  ]);

  useEffect(() => {
    if (ensambleViewMode !== "regiones") return;
    for (const group of regionGroups) {
      const allMemberIds = [];
      for (const en of group.ensambles) {
        const memberIds = membershipsByEnsamble.get(Number(en.id)) || [];
        allMemberIds.push(...memberIds);
      }
      const ref = regionCheckboxRefs.current[group.key];
      if (!ref || allMemberIds.length === 0) continue;
      const selected = allMemberIds.filter((id) =>
        selectedIntegranteIds.has(id),
      );
      ref.indeterminate =
        selected.length > 0 && selected.length < allMemberIds.length;
    }
  }, [
    ensambleViewMode,
    regionGroups,
    membershipsByEnsamble,
    selectedIntegranteIds,
  ]);

  const selectAllIntegrantes = useCallback(() => {
    setSelectedIntegranteIdsByMode((prev) => ({
      ...prev,
      [ensambleViewMode]: new Set(visibleIntegranteIdsForView),
    }));
  }, [ensambleViewMode, visibleIntegranteIdsForView]);

  const clearAllIntegrantes = useCallback(() => {
    setSelectedIntegranteIdsByMode((prev) => ({
      ...prev,
      [ensambleViewMode]: new Set(),
    }));
  }, [ensambleViewMode]);

  const renderEnsambleNode = (en, { nested = false } = {}) => {
    const eid = Number(en.id);
    const memberIds = membershipsByEnsamble.get(eid) || [];
    if (memberIds.length === 0) return null;
    const open = openEnsambles.has(eid);
    const allOn = memberIds.every((id) => selectedIntegranteIds.has(id));
    const selectedCount = memberIds.filter((id) =>
      selectedIntegranteIds.has(id),
    ).length;
    return (
      <div
        key={eid}
        className={`overflow-hidden rounded-lg border border-slate-100 ${
          nested ? "ml-2" : ""
        }`}
      >
        <div className="flex items-center gap-1 bg-slate-50/80 px-1.5 py-1">
          <button
            type="button"
            onClick={() => toggleEnsambleOpen(eid)}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-white hover:text-slate-600"
            aria-expanded={open}
          >
            <IconChevronDown
              size={14}
              className={`shrink-0 transition-transform duration-200 ${
                open ? "rotate-0" : "-rotate-90"
              }`}
            />
          </button>
          <input
            ref={(el) => {
              ensambleCheckboxRefs.current[eid] = el;
            }}
            type="checkbox"
            checked={allOn}
            onChange={() => toggleEnsambleMembers(eid, memberIds)}
            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
          />
          <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800">
            {en.ensamble || `Ensamble ${eid}`}
          </span>
          <span className="shrink-0 pr-1 text-[10px] tabular-nums text-slate-400">
            {selectedCount}/{memberIds.length}
          </span>
        </div>
        {open && (
          <div className="space-y-0.5 border-t border-slate-100 py-1 pl-3">
            {memberIds.map((iid) => {
              const p = integranteById.get(iid);
              if (!p) return null;
              const label = `${p.nombre || ""} ${p.apellido || ""}`.trim();
              return (
                <label
                  key={`${eid}-${iid}`}
                  className="flex cursor-pointer items-center gap-2.5 rounded-md py-1 pl-6 pr-2 text-sm text-slate-600 transition-colors hover:bg-slate-50"
                >
                  <input
                    type="checkbox"
                    checked={selectedIntegranteIds.has(iid)}
                    onChange={() => toggleIntegrante(iid)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="truncate leading-tight">{label}</span>
                </label>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const exportDisabled =
    rosterLoading || visibleRows.length === 0 || loading;

  const handleExportExcel = useCallback(async () => {
    if (exportDisabled) return;
    await downloadServiciosCantidadExcel({
      visibleRows: visibleRowsEnriched,
      bucketsByIntegranteId,
      rowGroups: groupByEnsambles ? rowGroups : null,
      groupByEnsambles,
      fileName: "cantidad_servicios",
    });
  }, [
    exportDisabled,
    visibleRowsEnriched,
    bucketsByIntegranteId,
    groupByEnsambles,
    rowGroups,
  ]);

  const renderDataRow = (row, key) => {
    const iid = integranteKey(row.id);
    const buckets = bucketsByIntegranteId[iid] || {};
    const name = `${row.apellido || ""}, ${row.nombre || ""}`.trim();
    return (
      <tr key={key} className="border-b border-slate-100 hover:bg-slate-50/80">
        <td className="sticky left-0 z-[1] min-w-[10rem] max-w-[14rem] bg-white px-2 py-1.5 shadow-[2px_0_0_0_rgba(226,232,240,1)]">
          <div className="truncate text-sm font-medium text-slate-800">
            {name || `Integrante ${row.id}`}
          </div>
          <div className="truncate text-[10px] text-slate-400">
            {row.instrumentDisplay ||
              row.instrumentos?.instrumento ||
              row.instrumentos?.abreviatura ||
              "—"}
          </div>
        </td>
        {SERVICIO_COLUMN_DEFS.map((col) => (
          <td
            key={col.key}
            className={`px-2 py-1.5 text-right text-xs ${
              col.key === "total"
                ? "bg-slate-50 font-semibold"
                : "text-slate-700"
            }`}
            title={col.title}
          >
            <ServicioCellValue bucket={buckets[col.key]} />
          </td>
        ))}
      </tr>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-sm text-slate-500">
        Cargando cantidad de servicios…
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-sm text-red-600">
        {loadError}
      </div>
    );
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-hidden lg:flex-row">
      {/* Panel filtros */}
      <aside className="flex max-h-[42vh] w-full shrink-0 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white lg:max-h-none lg:w-72">
        <div className="border-b border-slate-100 px-3 py-2">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-600">
              Integrantes
            </h3>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={selectAllIntegrantes}
                className="rounded px-1.5 py-0.5 text-[10px] font-bold text-indigo-600 hover:bg-indigo-50"
              >
                Todos
              </button>
              <button
                type="button"
                onClick={clearAllIntegrantes}
                className="rounded px-1.5 py-0.5 text-[10px] font-bold text-slate-500 hover:bg-slate-50"
              >
                Ninguno
              </button>
            </div>
          </div>
          <div
            className="mb-2 inline-flex w-full rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-[10px] font-bold"
            role="tablist"
            aria-label="Vista de ensambles"
          >
            {CONVOCATORIA_ENSAMBLE_VIEW_MODES.map((mode) => (
              <button
                key={mode}
                type="button"
                role="tab"
                aria-selected={ensambleViewMode === mode}
                onClick={() => setEnsambleViewMode(mode)}
                className={`flex-1 rounded-md px-1.5 py-1 capitalize transition-colors ${
                  ensambleViewMode === mode
                    ? "bg-white text-indigo-700 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {mode === "ensambles"
                  ? "Ensambles"
                  : mode === "cameratas"
                    ? "Cameratas"
                    : "Regiones"}
              </button>
            ))}
          </div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            {CONVOCATORIA_VIEW_SECTION_TITLES[ensambleViewMode]}
          </p>
        </div>
        <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto p-2">
          {ensambleViewMode === "regiones"
            ? regionGroups.map((group) => {
                const open = openRegions.has(group.key);
                const allMemberIds = [];
                for (const en of group.ensambles) {
                  allMemberIds.push(
                    ...(membershipsByEnsamble.get(Number(en.id)) || []),
                  );
                }
                const allOn =
                  allMemberIds.length > 0 &&
                  allMemberIds.every((id) => selectedIntegranteIds.has(id));
                const selectedCount = allMemberIds.filter((id) =>
                  selectedIntegranteIds.has(id),
                ).length;
                const regionLabel = group.name || SIN_REGION_LABEL;
                return (
                  <div
                    key={group.key}
                    className="overflow-hidden rounded-lg border border-slate-100"
                  >
                    <div className="flex items-center gap-1 bg-slate-100/80 px-1.5 py-1">
                      <button
                        type="button"
                        onClick={() => toggleRegionOpen(group.key)}
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-white"
                        aria-expanded={open}
                        aria-label={
                          open
                            ? `Contraer ${regionLabel}`
                            : `Expandir ${regionLabel}`
                        }
                      >
                        <IconChevronDown
                          size={14}
                          className={`transition-transform ${
                            open ? "rotate-0" : "-rotate-90"
                          }`}
                        />
                      </button>
                      <input
                        ref={(el) => {
                          regionCheckboxRefs.current[group.key] = el;
                        }}
                        type="checkbox"
                        checked={allOn}
                        onChange={() =>
                          toggleEnsambleMembers(group.key, allMemberIds)
                        }
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-700">
                        {regionLabel}
                      </span>
                      <span className="shrink-0 pr-1 text-[10px] tabular-nums text-slate-400">
                        {selectedCount}/{allMemberIds.length}
                      </span>
                    </div>
                    {open && (
                      <div className="space-y-1.5 border-t border-slate-100 p-1.5">
                        {group.ensambles.map((en) =>
                          renderEnsambleNode(en, { nested: true }),
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            : visibleEnsamblesForView.map((en) => renderEnsambleNode(en))}
        </div>
      </aside>

      {/* Matriz */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-3 py-2">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
            {TIPOS_PROGRAMA_ASISTENCIA_MATRIZ.map((tipo) => {
              const on = selectedTypes.has(tipo);
              return (
                <button
                  key={tipo}
                  type="button"
                  onClick={() => toggleType(tipo)}
                  className={`rounded-full border px-2 py-0.5 text-[11px] font-bold transition-colors ${
                    on
                      ? "border-indigo-300 bg-indigo-50 text-indigo-800"
                      : "border-slate-200 bg-white text-slate-400 hover:border-slate-300"
                  }`}
                >
                  {tipo}
                </button>
              );
            })}
          </div>
          <label className="inline-flex cursor-pointer items-center gap-1.5 text-[11px] font-medium text-slate-600">
            <input
              type="checkbox"
              checked={groupByEnsambles}
              onChange={(e) => setGroupByEnsambles(e.target.checked)}
              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            Agrupar
          </label>
          <button
            type="button"
            onClick={() => setShowPastInYear((v) => !v)}
            className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-bold transition-colors ${
              showPastInYear
                ? "border-amber-300 bg-amber-50 text-amber-800"
                : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
            }`}
            title="Incluir programas y eventos del año en curso (pasados y futuros)"
          >
            <IconHistory size={14} />
            Año actual
          </button>
          <button
            type="button"
            disabled={exportDisabled}
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-bold text-slate-600 transition-colors hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <IconDownload size={14} />
            Excel
          </button>
        </div>

        <div className="flex items-center justify-between gap-2 border-b border-slate-50 px-3 py-1.5 text-[11px] text-slate-500">
          <span>
            {visibleRows.length} integrante(s)
            {rosterLoading ? " · calculando…" : ""}
            {" · "}
            total filas:{" "}
            <span className="font-semibold text-slate-700">
              {formatServicioNumber(bucketTotal(columnTotals.total))}
            </span>
          </span>
          <span className="text-[10px] text-slate-400">
            R celeste · L ámbar (reemplazo / licencia)
          </span>
        </div>

        <div className="min-h-0 flex-1 overflow-auto">
          {selectedIntegranteIds.size === 0 ? (
            <div className="flex h-full items-center justify-center p-8 text-sm text-slate-400">
              Seleccioná integrantes en el panel izquierdo.
            </div>
          ) : (
            <table className="w-full min-w-[640px] border-collapse text-left">
              <thead className="sticky top-0 z-[2]">
                <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                  <th className="sticky left-0 z-[3] min-w-[10rem] bg-slate-50 px-2 py-2 shadow-[2px_0_0_0_rgba(226,232,240,1)]">
                    Integrante
                  </th>
                  {SERVICIO_COLUMN_DEFS.map((col) => (
                    <th
                      key={col.key}
                      className={`whitespace-nowrap px-2 py-2 text-right ${
                        col.key === "total" ? "bg-slate-100" : ""
                      }`}
                      title={col.title}
                    >
                      {col.shortLabel}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(groupByEnsambles
                  ? rowGroups.length
                    ? rowGroups
                    : [
                        {
                          key: "all",
                          label: null,
                          rows: visibleRowsEnriched,
                        },
                      ]
                  : [
                      {
                        key: "flat",
                        label: null,
                        rows: visibleRowsEnriched,
                      },
                    ]
                ).flatMap((group) => {
                  const rows = [];
                  if (group.label) {
                    rows.push(
                      <tr
                        key={`h-${group.key}`}
                        className="border-b border-slate-100 bg-slate-100/70"
                      >
                        <td
                          colSpan={1 + SERVICIO_COLUMN_DEFS.length}
                          className="px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-slate-600"
                        >
                          {group.label}
                        </td>
                      </tr>,
                    );
                  }
                  for (const row of group.rows || []) {
                    rows.push(renderDataRow(row, `${group.key}-${row.id}`));
                  }
                  return rows;
                })}
              </tbody>
              {visibleRowsEnriched.length > 0 && (
                <tfoot className="sticky bottom-0 z-[2]">
                  <tr className="border-t border-slate-200 bg-slate-100 text-xs font-bold">
                    <td className="sticky left-0 z-[3] bg-slate-100 px-2 py-1.5 shadow-[2px_0_0_0_rgba(203,213,225,1)]">
                      Totales
                    </td>
                    {SERVICIO_COLUMN_DEFS.map((col) => (
                      <td
                        key={col.key}
                        className="px-2 py-1.5 text-right"
                      >
                        <ServicioCellValue bucket={columnTotals[col.key]} />
                      </td>
                    ))}
                  </tr>
                </tfoot>
              )}
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
