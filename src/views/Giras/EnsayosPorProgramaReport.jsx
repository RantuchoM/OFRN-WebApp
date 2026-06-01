import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { fetchAsistenciaMatrixBaseData } from "../../services/giraService";
import {
  TIPOS_PROGRAMA_ENSAYOS_REPORTE,
  createDefaultSelectedProgramTypes,
  filterProgramasForEnsayosReport,
  filterProgramasWithEnsembleConvocados,
  fetchRehearsalEventsForEnsayosReport,
  buildEnsayosPorProgramaCounts,
  getEnsayoCellCount,
  computeEnsayoRowTotal,
  computeEnsayoColumnTotal,
  programRowLabel,
  formatProgramaFechas,
  downloadEnsayosPorProgramaExcel,
  downloadEnsayosPorProgramaPdf,
  getDefaultSelectedEnsembleIds,
} from "../../utils/ensayosPorProgramaReport";
import { IconDownload } from "../../components/ui/Icons";
import {
  getProgramTypeColor,
  PROGRAM_TYPES,
} from "../../utils/giraUtils";

/**
 * Matriz ensayos: filas = programas, columnas = ensambles.
 *
 * @param {'management'|'coordination'} variant
 * @param {Array<{id, ensamble}>} [lockedEnsembles] — en coordinación, columnas fijas
 * @param {boolean} [compact] — layout para modal
 */
export default function EnsayosPorProgramaReport({
  supabase,
  variant = "management",
  lockedEnsembles = null,
  compact = false,
}) {
  const isCoordination = variant === "coordination";

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [programas, setProgramas] = useState([]);
  const [ensambles, setEnsambles] = useState([]);
  const [memberships, setMemberships] = useState([]);
  const [events, setEvents] = useState([]);
  const [convokedProgramas, setConvokedProgramas] = useState([]);
  const [rosterLoading, setRosterLoading] = useState(false);

  const [selectedTypes, setSelectedTypes] = useState(
    createDefaultSelectedProgramTypes,
  );
  const [showPastInYear, setShowPastInYear] = useState(false);
  const [selectedEnsembleIds, setSelectedEnsembleIds] = useState(() => new Set());
  const ensambleCheckboxRefs = useRef({});
  const tableScrollRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      const [baseRes, eventsRes] = await Promise.all([
        fetchAsistenciaMatrixBaseData(supabase),
        fetchRehearsalEventsForEnsayosReport(supabase),
      ]);
      if (cancelled) return;
      if (baseRes.error || eventsRes.error) {
        setLoadError(
          baseRes.error?.message ||
            eventsRes.error?.message ||
            "Error al cargar datos",
        );
        setLoading(false);
        return;
      }
      setProgramas(baseRes.programas);
      setEnsambles(baseRes.ensambles);
      setMemberships(baseRes.memberships || []);
      setEvents(eventsRes.events);
      setConvokedProgramas([]);
      if (!isCoordination) {
        setSelectedEnsembleIds(
          new Set(getDefaultSelectedEnsembleIds(baseRes.ensambles)),
        );
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase, isCoordination]);

  useEffect(() => {
    if (!isCoordination || !lockedEnsembles?.length) return;
    setSelectedEnsembleIds(
      new Set(lockedEnsembles.map((e) => Number(e.id))),
    );
  }, [isCoordination, lockedEnsembles]);

  const filteredProgramas = useMemo(
    () =>
      filterProgramasForEnsayosReport(programas, {
        selectedTypes,
        showPastInYear,
      }),
    [programas, selectedTypes, showPastInYear],
  );

  const visibleEnsembleIds = useMemo(() => {
    const source = isCoordination && lockedEnsembles?.length
      ? lockedEnsembles
      : ensambles;
    return source
      .filter((e) => selectedEnsembleIds.has(Number(e.id)))
      .map((e) => Number(e.id));
  }, [
    ensambles,
    lockedEnsembles,
    isCoordination,
    selectedEnsembleIds,
  ]);

  useEffect(() => {
    let cancelled = false;
    if (!supabase || filteredProgramas.length === 0 || visibleEnsembleIds.length === 0) {
      setConvokedProgramas([]);
      setRosterLoading(false);
      return;
    }
    (async () => {
      setRosterLoading(true);
      const list = await filterProgramasWithEnsembleConvocados(
        supabase,
        filteredProgramas,
        visibleEnsembleIds,
        memberships,
      );
      if (cancelled) return;
      setConvokedProgramas(list);
      setRosterLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase, filteredProgramas, visibleEnsembleIds, memberships]);

  const visibleEnsembles = useMemo(() => {
    const source = isCoordination && lockedEnsembles?.length
      ? lockedEnsembles
      : ensambles;
    return source.filter((e) => selectedEnsembleIds.has(Number(e.id)));
  }, [
    ensambles,
    lockedEnsembles,
    isCoordination,
    selectedEnsembleIds,
  ]);

  const counts = useMemo(
    () =>
      buildEnsayosPorProgramaCounts(events, {
        programIds: convokedProgramas.map((p) => p.id),
        ensembleIds: visibleEnsembles.map((e) => e.id),
      }),
    [events, convokedProgramas, visibleEnsembles],
  );

  const toggleType = useCallback((tipo) => {
    setSelectedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(tipo)) next.delete(tipo);
      else next.add(tipo);
      return next;
    });
  }, []);

  const toggleEnsamble = useCallback((id) => {
    const n = Number(id);
    setSelectedEnsembleIds((prev) => {
      const next = new Set(prev);
      if (next.has(n)) next.delete(n);
      else next.add(n);
      return next;
    });
  }, []);

  const selectAllEnsembles = useCallback(() => {
    setSelectedEnsembleIds(new Set(ensambles.map((e) => Number(e.id))));
  }, [ensambles]);

  const clearAllEnsembles = useCallback(() => {
    setSelectedEnsembleIds(new Set());
  }, []);

  useEffect(() => {
    if (isCoordination) return;
    for (const en of ensambles) {
      const eid = Number(en.id);
      const ref = ensambleCheckboxRefs.current[eid];
      if (!ref) continue;
      ref.indeterminate = false;
    }
  }, [ensambles, isCoordination]);

  const exportDisabled =
    rosterLoading ||
    convokedProgramas.length === 0 ||
    visibleEnsembles.length === 0;

  const exportParams = useMemo(
    () => ({
      filteredProgramas: convokedProgramas,
      visibleEnsembles,
      counts,
      reportTitle: isCoordination
        ? "Ensayos por programa (Coordinación)"
        : "Ensayos por programa (Gestión)",
    }),
    [convokedProgramas, visibleEnsembles, counts, isCoordination],
  );

  const handleExportExcel = useCallback(async () => {
    if (exportDisabled) return;
    await downloadEnsayosPorProgramaExcel(exportParams);
  }, [exportDisabled, exportParams]);

  const handleExportPdf = useCallback(() => {
    if (exportDisabled) return;
    downloadEnsayosPorProgramaPdf(exportParams);
  }, [exportDisabled, exportParams]);

  const ensembleIds = useMemo(
    () => visibleEnsembles.map((e) => Number(e.id)),
    [visibleEnsembles],
  );

  const grandTotal = useMemo(
    () =>
      convokedProgramas.reduce(
        (acc, p) => acc + computeEnsayoRowTotal(counts, p.id, ensembleIds),
        0,
      ),
    [convokedProgramas, counts, ensembleIds],
  );

  if (loading) {
    return (
      <div
        className={`flex items-center justify-center text-slate-500 dark:text-slate-400 ${
          compact ? "min-h-[12rem] p-6" : "h-full"
        }`}
      >
        Cargando reporte de ensayos…
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="p-6 text-center text-red-600 dark:text-red-400">
        {loadError}
      </div>
    );
  }

  return (
    <div
      className={`flex min-h-0 flex-col bg-slate-50 dark:bg-slate-950 ${
        compact ? "h-full max-h-full" : "h-full"
      }`}
    >
      {!compact && (
        <header className="shrink-0 border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
          <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100">
            Ensayos por programa
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Cantidad de ensayos de ensamble por programa y ensamble. Solo se
            listan programas con al menos un integrante convocado del ensamble
            seleccionado.
          </p>
        </header>
      )}

      <div
        className={`flex min-h-0 flex-1 flex-col gap-3 overflow-hidden p-3 ${
          compact ? "" : "lg:flex-row"
        }`}
      >
        <aside
          className={`flex shrink-0 flex-col gap-3 overflow-auto rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900 ${
            compact ? "max-h-[28vh]" : "w-full lg:max-w-xs"
          }`}
        >
          <div>
            <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
              Tipo de programa
            </h2>
            <div className="flex flex-wrap items-center gap-1">
              {TIPOS_PROGRAMA_ENSAYOS_REPORTE.map((tipo) => {
                const isActive = selectedTypes.has(tipo);
                const colorClasses = getProgramTypeColor(tipo);
                const label = PROGRAM_TYPES[tipo]?.label || tipo;
                return (
                  <button
                    key={tipo}
                    type="button"
                    onClick={() => toggleType(tipo)}
                    aria-pressed={isActive}
                    title={tipo}
                    className={`rounded border px-2 py-0.5 text-[10px] font-black uppercase tracking-tight transition-all ${colorClasses} ${
                      isActive
                        ? "ring-2 ring-offset-1 ring-slate-400/40"
                        : "opacity-40 hover:opacity-70"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <label className="flex cursor-pointer items-center gap-2 border-t border-slate-100 pt-2 text-sm text-slate-700 dark:border-slate-800 dark:text-slate-300">
            <input
              type="checkbox"
              checked={showPastInYear}
              onChange={(e) => setShowPastInYear(e.target.checked)}
              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            Mostrar programas anteriores del año
          </label>

          {!isCoordination && (
            <div className="border-t border-slate-100 pt-2 dark:border-slate-800">
              <div className="mb-2 flex items-center justify-between gap-2">
                <h2 className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Ensambles (columnas)
                </h2>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={selectAllEnsembles}
                    className="rounded border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Todos
                  </button>
                  <button
                    type="button"
                    onClick={clearAllEnsembles}
                    className="rounded border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Ninguno
                  </button>
                </div>
              </div>
              <div className="max-h-[30vh] space-y-1 overflow-y-auto pr-1">
                {ensambles.map((en) => {
                  const eid = Number(en.id);
                  return (
                    <label
                      key={eid}
                      className="flex cursor-pointer items-center gap-2 text-sm text-slate-700 dark:text-slate-300"
                    >
                      <input
                        ref={(el) => {
                          ensambleCheckboxRefs.current[eid] = el;
                        }}
                        type="checkbox"
                        checked={selectedEnsembleIds.has(eid)}
                        onChange={() => toggleEnsamble(eid)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="truncate">{en.ensamble}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {isCoordination && lockedEnsembles?.length > 0 && (
            <div className="border-t border-slate-100 pt-2 dark:border-slate-800">
              <h2 className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-500">
                Ensambles (filtro actual)
              </h2>
              <div className="flex flex-wrap gap-1">
                {lockedEnsembles.map((e) => (
                  <span
                    key={e.id}
                    className="rounded border border-indigo-100 bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-800"
                  >
                    {e.ensamble}
                  </span>
                ))}
              </div>
            </div>
          )}
        </aside>

        <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-3 py-2 dark:border-slate-800">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {convokedProgramas.length} programa(s) convocado(s) ·{" "}
              {visibleEnsembles.length} ensamble(s) · {grandTotal} ensayo(s)
              {rosterLoading ? " · verificando convocatorias…" : ""}
            </span>
            <div className="flex gap-1.5">
              <button
                type="button"
                disabled={exportDisabled}
                onClick={handleExportPdf}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <IconDownload size={14} />
                PDF
              </button>
              <button
                type="button"
                disabled={exportDisabled}
                onClick={handleExportExcel}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <IconDownload size={14} />
                Excel
              </button>
            </div>
          </div>

          <div ref={tableScrollRef} className="min-h-0 flex-1 overflow-auto">
            {rosterLoading ? (
              <div className="flex h-full min-h-[8rem] items-center justify-center p-6 text-center text-sm text-slate-500">
                Calculando programas con integrantes convocados…
              </div>
            ) : exportDisabled ? (
              <div className="flex h-full min-h-[8rem] items-center justify-center p-6 text-center text-sm text-slate-500">
                {visibleEnsembles.length === 0
                  ? "Seleccioná al menos un ensamble para ver el reporte."
                  : "No hay programas con integrantes convocados de los ensambles seleccionados."}
              </div>
            ) : (
              <table className="min-w-max border-collapse text-sm">
                <thead>
                  <tr>
                    <th
                      className="sticky left-0 top-0 z-30 min-w-[11rem] border-b border-r border-slate-200 bg-slate-100 px-2 py-2 text-left text-xs font-bold uppercase tracking-wide text-slate-600 dark:bg-slate-800"
                      scope="col"
                    >
                      Programa
                    </th>
                    {visibleEnsembles.map((en) => (
                      <th
                        key={en.id}
                        scope="col"
                        className="sticky top-0 z-20 min-w-[3.5rem] max-w-[6rem] border-b border-slate-200 bg-slate-100 px-1 py-2 text-center align-bottom dark:bg-slate-800"
                      >
                        <span
                          className="inline-block max-w-[5.5rem] text-[10px] font-semibold leading-tight text-slate-700 dark:text-slate-200"
                          title={en.ensamble}
                        >
                          {en.ensamble}
                        </span>
                      </th>
                    ))}
                    <th
                      scope="col"
                      className="sticky top-0 z-20 min-w-[2.5rem] border-b border-l-2 border-l-slate-400 bg-slate-200 px-1 py-2 text-center text-[10px] font-bold uppercase text-slate-700 dark:bg-slate-700"
                    >
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {convokedProgramas.map((p) => {
                    const fechasLabel = formatProgramaFechas(p);
                    const rowTotal = computeEnsayoRowTotal(
                      counts,
                      p.id,
                      ensembleIds,
                    );
                    return (
                      <tr
                        key={p.id}
                        className="border-b border-slate-100 dark:border-slate-800"
                      >
                        <th
                          scope="row"
                          className="sticky left-0 z-10 border-r border-slate-200 bg-white px-2 py-1.5 text-left align-top dark:bg-slate-900"
                        >
                          <div className="text-xs font-medium text-slate-800 dark:text-slate-100">
                            {programRowLabel(p)}
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5">
                            {p.tipo ? (
                              <span
                                className={`inline-block rounded border px-1.5 py-px text-[9px] font-bold uppercase tracking-wide ${getProgramTypeColor(p.tipo)}`}
                              >
                                {PROGRAM_TYPES[p.tipo]?.label || p.tipo}
                              </span>
                            ) : null}
                            {fechasLabel ? (
                              <span className="text-[10px] tabular-nums text-slate-500 dark:text-slate-400">
                                {fechasLabel}
                              </span>
                            ) : null}
                          </div>
                        </th>
                        {visibleEnsembles.map((en) => {
                          const n = getEnsayoCellCount(
                            counts,
                            p.id,
                            en.id,
                          );
                          return (
                            <td
                              key={`${p.id}-${en.id}`}
                              className={`px-1 py-1.5 text-center text-xs tabular-nums ${
                                n > 0
                                  ? "font-semibold text-indigo-800 dark:text-indigo-200"
                                  : "text-slate-300"
                              }`}
                            >
                              {n > 0 ? n : "—"}
                            </td>
                          );
                        })}
                        <td className="border-l-2 border-l-slate-300 bg-slate-50 px-1 py-1.5 text-center text-xs font-bold tabular-nums text-slate-800 dark:bg-slate-800/50">
                          {rowTotal > 0 ? rowTotal : "—"}
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="bg-slate-100 font-bold dark:bg-slate-800">
                    <th
                      scope="row"
                      className="sticky left-0 z-10 border-r border-slate-200 bg-slate-100 px-2 py-1.5 text-left text-xs uppercase dark:bg-slate-800"
                    >
                      Total
                    </th>
                    {visibleEnsembles.map((en) => {
                      const colTotal = computeEnsayoColumnTotal(
                        counts,
                        en.id,
                        convokedProgramas,
                      );
                      return (
                        <td
                          key={`tot-${en.id}`}
                          className="px-1 py-1.5 text-center text-xs tabular-nums"
                        >
                          {colTotal > 0 ? colTotal : "—"}
                        </td>
                      );
                    })}
                    <td className="border-l-2 border-l-slate-400 px-1 py-1.5 text-center text-xs tabular-nums text-indigo-900">
                      {grandTotal > 0 ? grandTotal : "—"}
                    </td>
                  </tr>
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
