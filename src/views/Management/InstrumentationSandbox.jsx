import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import { IconLoader } from "../../components/ui/Icons";
import { useRosterDropdownData } from "../../hooks/useRosterDropdownData";
import {
  fetchAsistenciaMatrixBaseData,
  resolveGiraRosterForMatrix,
} from "../../services/giraService";
import {
  getOrCreateActiveSandbox,
  fetchSandboxGiraDrafts,
  buildSandboxDraftMap,
  applyGiraDraftWithNotifications,
  applyAllSandboxDrafts,
  discardAllSandboxDrafts,
  countAllAddedMusiciansForDrafts,
  computeAddedMusiciansForDraft,
  describeSandboxLoadError,
} from "../../services/instrumentacionSandboxService";
import {
  buildEnsambleServiceHistogram,
  buildSandboxRosterByGiraIdBatch,
  buildIntegrantesLabelMap,
  buildEnsambleLabelMap,
  collectEnsambleIdsFromSources,
  computeAllSandboxProgramMetrics,
  computeSandboxProgramMetric,
  fetchMissingEnsambleLabels,
  filterProgramsForHistogramByYear,
  resolveSandboxHistogramYear,
  resolveSandboxGiraMatrixEntry,
} from "../../utils/instrumentacionSandbox";
import SandboxProgramList from "../../components/instrumentation/SandboxProgramList";
import SandboxEnsambleHistogram from "../../components/instrumentation/SandboxEnsambleHistogram";
import SandboxApplyModal from "../../components/instrumentation/SandboxApplyModal";
import ConfirmModal from "../../components/ui/ConfirmModal";

export default function InstrumentationSandbox({
  supabase,
  dateFrom,
  dateTo,
  selectedType,
}) {
  const [loading, setLoading] = useState(true);
  const [histLoading, setHistLoading] = useState(false);
  const [sandbox, setSandbox] = useState(null);
  const [drafts, setDrafts] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [ensambleLabels, setEnsambleLabels] = useState({});
  const [matrixBase, setMatrixBase] = useState(null);
  const [baselineRosterByGiraId, setBaselineRosterByGiraId] = useState({});
  const [draftRosterByGiraId, setDraftRosterByGiraId] = useState({});
  const [programMetrics, setProgramMetrics] = useState({});
  const [loadError, setLoadError] = useState(null);
  const [sandboxReady, setSandboxReady] = useState(false);
  const [applyModal, setApplyModal] = useState(null);
  const [applyBusy, setApplyBusy] = useState(false);
  const [discardAllOpen, setDiscardAllOpen] = useState(false);
  const [discardBusy, setDiscardBusy] = useState(false);
  const [refreshingGiraIds, setRefreshingGiraIds] = useState(() => new Set());
  const sandboxWarnedRef = useRef(false);
  const auxRef = useRef(null);
  const programsRef = useRef([]);
  const ensambleLabelsRef = useRef({});
  const draftsRef = useRef([]);
  const sandboxRef = useRef(null);

  const { ensemblesList, familiesList } = useRosterDropdownData(supabase);

  useEffect(() => {
    programsRef.current = programs;
  }, [programs]);

  useEffect(() => {
    draftsRef.current = drafts;
  }, [drafts]);

  useEffect(() => {
    sandboxRef.current = sandbox;
  }, [sandbox]);

  useEffect(() => {
    ensambleLabelsRef.current = ensambleLabels;
  }, [ensambleLabels]);

  useEffect(() => {
    setEnsambleLabels((prev) => buildEnsambleLabelMap(ensemblesList, prev));
  }, [ensemblesList]);

  const draftsByGiraId = useMemo(() => {
    const map = {};
    for (const d of drafts) {
      map[Number(d.id_gira)] = d;
    }
    return map;
  }, [drafts]);

  const draftGiraCount = useMemo(() => {
    const fromMetrics = Object.values(programMetrics).filter(
      (m) => m?.hasPendingChanges,
    ).length;
    if (Object.keys(programMetrics).length > 0) return fromMetrics;
    return drafts.length;
  }, [programMetrics, drafts.length]);

  const histogramYear = useMemo(
    () => resolveSandboxHistogramYear(dateFrom, dateTo),
    [dateFrom, dateTo],
  );

  const histogramPrograms = useMemo(() => {
    if (!matrixBase?.programas) return [];
    return filterProgramsForHistogramByYear(matrixBase.programas, histogramYear);
  }, [matrixBase, histogramYear]);

  const histogram = useMemo(() => {
    if (!matrixBase?.ensambles?.length) {
      return { columns: [], rows: [], columnTotals: {} };
    }
    return buildEnsambleServiceHistogram(
      matrixBase.ensambles,
      matrixBase.memberships,
      histogramPrograms,
      draftRosterByGiraId,
      baselineRosterByGiraId,
      buildIntegrantesLabelMap(matrixBase.integrantes),
    );
  }, [
    matrixBase,
    histogramPrograms,
    draftRosterByGiraId,
    baselineRosterByGiraId,
  ]);

  const loadPrograms = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    let draftMap = new Map();
    try {
      try {
        const sb = await getOrCreateActiveSandbox(supabase, {
          fecha_desde: dateFrom || null,
          fecha_hasta: dateTo || null,
          tipo_programa: selectedType || null,
        });
        setSandbox(sb);
        setSandboxReady(true);
        const draftRows = await fetchSandboxGiraDrafts(supabase, sb.id);
        setDrafts(draftRows);
        draftMap = buildSandboxDraftMap(draftRows);
      } catch (sandboxErr) {
        console.error("InstrumentationSandbox sandbox:", sandboxErr);
        setSandbox(null);
        setSandboxReady(false);
        setDrafts([]);
        if (!sandboxWarnedRef.current) {
          sandboxWarnedRef.current = true;
          const { message } = describeSandboxLoadError(sandboxErr);
          toast.error(
            `No se pudo cargar el escenario sandbox: ${message} Los programas se muestran igual; el borrador no se guardará.`,
            { duration: 10000 },
          );
        }
      }

      const { data: catalogRows } = await supabase
        .from("instrumentos")
        .select("id, instrumento, familia, plaza_extra, rol_gira_default")
        .order("instrumento");

      let programQuery = supabase
        .from("programas")
        .select(
          "id, nombre_gira, nomenclador, mes_letra, fecha_desde, fecha_hasta, tipo, zona, organico_revisado, organico_comentario, notificaciones_habilitadas, notificacion_inicial_enviada",
        )
        .order("fecha_desde", { ascending: true });

      if (selectedType) programQuery = programQuery.eq("tipo", selectedType);
      if (dateFrom) {
        programQuery = programQuery.or(
          `fecha_hasta.gte.${dateFrom},fecha_desde.gte.${dateFrom}`,
        );
      }
      if (dateTo) {
        programQuery = programQuery.or(
          `fecha_desde.lte.${dateTo},fecha_hasta.lte.${dateTo}`,
        );
      }

      const { data: programRows, error: progError } = await programQuery;
      if (progError) throw progError;
      const basePrograms = programRows || [];

      const programIds = basePrograms.map((p) => p.id);
      let blocksByProgram = {};
      if (programIds.length > 0) {
        const { data: blocks } = await supabase
          .from("programas_repertorios")
          .select(
            `id, id_programa, orden, nombre,
             repertorio_obras (
               id, id_obra, orden, excluir, titulo_placeholder, instrumentacion_placeholder,
               tiene_asignaciones_multiples,
               obras (
                 id, titulo, instrumentacion, estado,
                 obras_compositores ( rol, compositores ( apellido, nombre ) )
               )
             )`,
          )
          .in("id_programa", programIds);
        (blocks || []).forEach((b) => {
          const pid = b.id_programa;
          if (!blocksByProgram[pid]) blocksByProgram[pid] = [];
          blocksByProgram[pid].push({
            ...b,
            repertorio_obras: (b.repertorio_obras || []).sort(
              (a, b2) => (a.orden || 0) - (b2.orden || 0),
            ),
          });
        });
      }

      const obraIdSet = new Set();
      Object.values(blocksByProgram).forEach((blocks) => {
        blocks.forEach((b) => {
          (b.repertorio_obras || []).forEach((ro) => {
            if (ro?.obras?.id) obraIdSet.add(ro.obras.id);
          });
        });
      });

      let allParticellas = [];
      const obraIds = [...obraIdSet];
      const particellasByObra = {};
      if (obraIds.length > 0) {
        const chunkSize = 80;
        const chunks = [];
        for (let i = 0; i < obraIds.length; i += chunkSize) {
          chunks.push(obraIds.slice(i, i + chunkSize));
        }
        const particellaResults = await Promise.all(
          chunks.map((chunk) =>
              supabase
                .from("obras_particellas")
                .select(
                  "id, id_obra, nombre_archivo, id_instrumento, instrumentos(id, instrumento, abreviatura)",
                )
                .in("id_obra", chunk),
          ),
        );
        particellaResults.forEach(({ data }) => {
          if (data) allParticellas = [...allParticellas, ...data];
        });
        allParticellas.forEach((part) => {
          const oid = part.id_obra;
          if (!particellasByObra[oid]) particellasByObra[oid] = [];
          particellasByObra[oid].push(part);
        });
      }

      const assignsByProgram = {};
      const containersByProgram = {};
      if (programIds.length > 0) {
        const [{ data: assigns }, { data: conts }] = await Promise.all([
          supabase
            .from("seating_asignaciones")
            .select("*")
            .in("id_programa", programIds),
          supabase
            .from("seating_contenedores")
            .select("id, id_programa, nombre, orden")
            .in("id_programa", programIds),
        ]);
        (assigns || []).forEach((row) => {
          if (!assignsByProgram[row.id_programa]) {
            assignsByProgram[row.id_programa] = [];
          }
          assignsByProgram[row.id_programa].push(row);
        });
        (conts || []).forEach((c) => {
          if (!containersByProgram[c.id_programa]) {
            containersByProgram[c.id_programa] = [];
          }
          containersByProgram[c.id_programa].push(c);
        });
      }

      const rosterOptions = {
        instrumentCatalog: catalogRows || [],
        lite: true,
      };

      const aux = {
        rosterOptions,
        blocksByProgram,
        assignsByProgram,
        containersByProgram,
        particellasByObra,
        allParticellas,
      };
      auxRef.current = aux;

      const metrics = await computeAllSandboxProgramMetrics(
        supabase,
        basePrograms,
        draftMap,
        aux,
      );

      const enriched = basePrograms.map((p) => ({
        ...p,
        instrumentationRequired: metrics[p.id]?.required,
      }));

      enriched.sort(
        (a, b) =>
          String(a.fecha_desde).localeCompare(String(b.fecha_desde)) ||
          Number(a.id) - Number(b.id),
      );

      const allEnsIds = collectEnsambleIdsFromSources(
        ...Object.values(metrics).flatMap((m) => [
          m.prodSources || [],
          m.draftSources || [],
        ]),
      );
      if (allEnsIds.size > 0) {
        const merged = await fetchMissingEnsambleLabels(
          supabase,
          [...allEnsIds],
          buildEnsambleLabelMap(ensemblesList, ensambleLabelsRef.current),
        );
        setEnsambleLabels(merged);
      }

      setProgramMetrics(metrics);
      setPrograms(enriched);
      if (enriched.length === 0 && basePrograms.length === 0) {
        setLoadError("empty_filter");
      }
    } catch (e) {
      console.error("InstrumentationSandbox loadPrograms:", e);
      setLoadError("fetch");
      toast.error("Error al cargar programas para el sandbox.");
    } finally {
      setLoading(false);
    }
  }, [supabase, selectedType, dateFrom, dateTo, ensemblesList]);

  const loadHistogramRosters = useCallback(async () => {
    if (!matrixBase?.programas?.length) return;
    setHistLoading(true);
    try {
      const progs = filterProgramsForHistogramByYear(
        matrixBase.programas,
        resolveSandboxHistogramYear(dateFrom, dateTo),
      );
      let draftMap = buildSandboxDraftMap(draftsRef.current);
      const sb = sandboxRef.current;
      if (sb?.id && draftMap.size === 0) {
        const draftRows = await fetchSandboxGiraDrafts(supabase, sb.id);
        draftMap = buildSandboxDraftMap(draftRows);
      }
      const { baseline, draft } = await buildSandboxRosterByGiraIdBatch(
        supabase,
        progs,
        draftMap,
      );
      setBaselineRosterByGiraId(baseline);
      setDraftRosterByGiraId(draft);
    } catch (e) {
      console.error("InstrumentationSandbox histogram:", e);
    } finally {
      setHistLoading(false);
    }
  }, [supabase, matrixBase, dateFrom, dateTo]);

  useEffect(() => {
    loadPrograms();
  }, [loadPrograms]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const base = await fetchAsistenciaMatrixBaseData(supabase);
      if (!cancelled) setMatrixBase(base);
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const refreshGiraMetrics = useCallback(
    async (giraId, draftRow) => {
      const aux = auxRef.current;
      const program = programsRef.current.find(
        (p) => Number(p.id) === Number(giraId),
      );
      if (!aux || !program) return;

      const gid = Number(giraId);
      setRefreshingGiraIds((prev) => new Set(prev).add(gid));

      const override = draftRow
        ? {
            fuentes: draftRow.fuentes || [],
            integrantes: draftRow.integrantes || [],
          }
        : null;

      try {
        const metric = await computeSandboxProgramMetric(
          supabase,
          program,
          override,
          aux,
        );
        setProgramMetrics((prev) => ({ ...prev, [program.id]: metric }));

        const ensIds = collectEnsambleIdsFromSources(
          metric.prodSources,
          metric.draftSources,
        );
        if (ensIds.size > 0) {
          const merged = await fetchMissingEnsambleLabels(
            supabase,
            [...ensIds],
            buildEnsambleLabelMap(
              ensemblesList,
              ensambleLabelsRef.current,
            ),
          );
          setEnsambleLabels(merged);
        }

        const histProgs = filterProgramsForHistogramByYear(
          matrixBase?.programas || [],
          histogramYear,
        );
        if (!histProgs.some((h) => Number(h.id) === gid)) return;

        if (!draftRow) {
          setDraftRosterByGiraId((prev) => {
            const base = baselineRosterByGiraId[gid];
            if (!base) return prev;
            return { ...prev, [gid]: base };
          });
          return;
        }

        const entry = await resolveSandboxGiraMatrixEntry(
          supabase,
          gid,
          override,
          resolveGiraRosterForMatrix,
        );
        setDraftRosterByGiraId((prev) => ({ ...prev, [gid]: entry }));
      } catch (e) {
        console.error("InstrumentationSandbox refreshGiraMetrics:", e);
      } finally {
        setRefreshingGiraIds((prev) => {
          const next = new Set(prev);
          next.delete(gid);
          return next;
        });
      }
    },
    [
      supabase,
      matrixBase,
      histogramYear,
      baselineRosterByGiraId,
      ensemblesList,
    ],
  );

  useEffect(() => {
    if (!matrixBase?.programas?.length) return;
    loadHistogramRosters();
  }, [matrixBase, dateFrom, dateTo, sandboxReady, loadHistogramRosters]);

  const handleDraftSaved = useCallback(
    async (row) => {
      setDrafts((prev) => {
        const idx = prev.findIndex(
          (d) => Number(d.id_gira) === Number(row.id_gira),
        );
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = row;
          return next;
        }
        return [...prev, row];
      });
      await refreshGiraMetrics(row.id_gira, row);
    },
    [refreshGiraMetrics],
  );

  const handleDiscarded = useCallback(
    async (giraId) => {
      setDrafts((prev) =>
        prev.filter((d) => Number(d.id_gira) !== Number(giraId)),
      );
      await refreshGiraMetrics(giraId, null);
    },
    [refreshGiraMetrics],
  );

  const handleOrganicoSave = useCallback((programId, payload) => {
    setPrograms((prev) =>
      prev.map((p) =>
        Number(p.id) === Number(programId) ? { ...p, ...payload } : p,
      ),
    );
  }, []);

  const programLabel = (p) =>
    [p?.mes_letra, p?.nomenclador].filter(Boolean).join(" | ") ||
    p?.nombre_gira ||
    `Gira ${p?.id}`;

  const handleRequestApply = useCallback(
    async (program) => {
      if (!sandbox?.id || !draftsByGiraId[program.id]) {
        toast.error("No hay borrador guardado para esta gira.");
        return;
      }
      const draft = draftsByGiraId[program.id];
      let addedCount = 0;
      try {
        const added = await computeAddedMusiciansForDraft(supabase, program, {
          fuentes: draft.fuentes || [],
          integrantes: draft.integrantes || [],
        });
        addedCount = added.length;
      } catch (e) {
        console.error(e);
      }
      setApplyModal({
        mode: "one",
        program,
        giraCount: 1,
        addedMusiciansCount: addedCount,
        giraLabels: [programLabel(program)],
      });
    },
    [sandbox?.id, draftsByGiraId, supabase],
  );

  const handleRequestApplyAll = useCallback(async () => {
    if (!sandbox?.id || draftGiraCount === 0) {
      toast.error("No hay borradores pendientes en el escenario.");
      return;
    }
    try {
      const { draftCount, addedCount, drafts: draftRows } =
        await countAllAddedMusiciansForDrafts(
          supabase,
          sandbox.id,
          programs,
        );
      const labels = draftRows.map((d) => {
        const p = programs.find((x) => Number(x.id) === Number(d.id_gira));
        return p ? programLabel(p) : `Gira ${d.id_gira}`;
      });
      setApplyModal({
        mode: "all",
        giraCount: draftCount,
        addedMusiciansCount: addedCount,
        giraLabels: labels,
      });
    } catch (e) {
      console.error(e);
      toast.error("No se pudo preparar la aplicación masiva.");
    }
  }, [sandbox?.id, draftGiraCount, supabase, programs]);

  const handleConfirmApply = useCallback(
    async ({ motivo, notify }) => {
      if (!sandbox?.id || !applyModal) return;
      setApplyBusy(true);
      try {
        if (applyModal.mode === "one" && applyModal.program) {
          const result = await applyGiraDraftWithNotifications(
            supabase,
            sandbox.id,
            applyModal.program,
            { motivo, notify },
          );
          toast.success(
            `Gira aplicada. ${result.addedCount} alta(s); ${result.notified} mail(s) enviado(s).`,
          );
        } else {
          const result = await applyAllSandboxDrafts(
            supabase,
            sandbox.id,
            programs,
            { motivo, notify },
          );
          toast.success(
            `${result.appliedCount} gira(s) aplicadas. ${result.addedCount} alta(s); ${result.notified} mail(s) enviado(s).`,
          );
        }
        setApplyModal(null);
        loadPrograms();
        loadHistogramRosters();
      } catch (e) {
        console.error(e);
        toast.error(e?.message || "Error al aplicar borrador.");
      } finally {
        setApplyBusy(false);
      }
    },
    [sandbox?.id, applyModal, supabase, programs, loadPrograms, loadHistogramRosters],
  );

  const handleConfirmDiscardAll = useCallback(async () => {
    if (!sandbox?.id || draftGiraCount === 0) return;
    setDiscardBusy(true);
    const giraIds = drafts.map((d) => Number(d.id_gira));
    try {
      await discardAllSandboxDrafts(supabase, sandbox.id);
      setDrafts([]);
      await Promise.all(giraIds.map((gid) => refreshGiraMetrics(gid, null)));
      await loadHistogramRosters();
      toast.success(
        `${giraIds.length} borrador${giraIds.length === 1 ? "" : "es"} descartado${giraIds.length === 1 ? "" : "s"}.`,
      );
    } catch (e) {
      console.error(e);
      toast.error("No se pudieron descartar los borradores.");
      throw e;
    } finally {
      setDiscardBusy(false);
    }
  }, [
    sandbox?.id,
    draftGiraCount,
    drafts,
    supabase,
    refreshGiraMetrics,
    loadHistogramRosters,
  ]);

  return (
    <div className="flex flex-col gap-2 h-full min-h-0">
      <div className="shrink-0 flex flex-wrap items-center gap-2 px-2 text-[10px] text-violet-800 bg-violet-50 border border-violet-200 rounded-lg py-1.5">
        <span className="font-bold uppercase tracking-wide">Sandbox</span>
        <span className="text-violet-600">
          Violeta = afectado por borrador · {draftGiraCount} borrador
          {draftGiraCount === 1 ? "" : "es"} en escenario
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          <button
            type="button"
            disabled={
              !sandboxReady || draftGiraCount === 0 || discardBusy || applyBusy
            }
            onClick={() => setDiscardAllOpen(true)}
            className="px-2.5 py-1 text-[10px] font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md disabled:opacity-40"
          >
            Descartar cambios
          </button>
          <button
            type="button"
            disabled={!sandboxReady || draftGiraCount === 0 || applyBusy || discardBusy}
            onClick={handleRequestApplyAll}
            className="px-2.5 py-1 text-[10px] font-bold text-white bg-violet-600 hover:bg-violet-700 rounded-md disabled:opacity-40"
          >
            Aplicar todos los cambios
          </button>
        </div>
        {(loading || histLoading) && (
          <IconLoader size={12} className="animate-spin text-violet-400" />
        )}
      </div>

      <div className="grid grid-cols-[3fr_2fr] gap-2 flex-1 min-h-0 max-h-[calc(100vh-14rem)]">
        <section className="flex flex-col min-h-0 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <header className="shrink-0 px-2 py-1.5 border-b border-slate-100 text-[10px] font-bold text-slate-600 uppercase">
            Instrumentación · fila por fila
          </header>
          <div className="flex-1 overflow-y-auto min-h-0">
            {loading ? (
              <div className="flex items-center justify-center h-24 text-xs text-slate-400">
                <IconLoader className="animate-spin mr-1" size={14} />
                Cargando programas…
              </div>
            ) : loadError === "fetch" ? (
              <div className="p-3 text-xs text-red-600">
                Error al cargar programas. Revisá la consola o intentá de nuevo.
              </div>
            ) : (
              <SandboxProgramList
                programs={programs}
                ensambleLabels={ensambleLabels}
                programMetrics={programMetrics}
                draftsByGiraId={draftsByGiraId}
                supabase={supabase}
                sandboxId={sandboxReady ? sandbox?.id : null}
                sandboxDisabled={!sandboxReady}
                ensemblesList={ensemblesList}
                familiesList={familiesList}
                integrantesList={matrixBase?.integrantes || []}
                onDraftSaved={handleDraftSaved}
                onRequestApply={handleRequestApply}
                onDiscarded={handleDiscarded}
                onOrganicoSave={handleOrganicoSave}
                refreshingGiraIds={refreshingGiraIds}
                emptyHint={
                  loadError === "empty_filter"
                    ? `No hay programas «${selectedType || "—"}» en el rango de fechas. El histograma incluye también Camerata Filarmónica.`
                    : undefined
                }
              />
            )}
          </div>
        </section>

        <section className="flex flex-col min-h-0 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <header className="shrink-0 px-2 py-1.5 border-b border-slate-100 text-[10px] font-bold text-slate-600 uppercase">
            Servicios por ensamble (Sinf + CF) - año {histogramYear}
          </header>
          <div className="flex-1 overflow-hidden min-h-0">
            <SandboxEnsambleHistogram
              histogram={histogram}
              loading={histLoading && !histogram?.rows?.length}
            />
          </div>
        </section>
      </div>

      <SandboxApplyModal
        open={!!applyModal}
        mode={applyModal?.mode}
        giraLabels={applyModal?.giraLabels}
        addedMusiciansCount={applyModal?.addedMusiciansCount ?? 0}
        giraCount={applyModal?.giraCount ?? 0}
        busy={applyBusy}
        onConfirm={handleConfirmApply}
        onCancel={() => !applyBusy && setApplyModal(null)}
      />

      <ConfirmModal
        isOpen={discardAllOpen}
        onClose={() => !discardBusy && setDiscardAllOpen(false)}
        onConfirm={handleConfirmDiscardAll}
        title={`Descartar todos los borradores (${draftGiraCount})`}
        message={`Se eliminarán ${draftGiraCount} borrador${draftGiraCount === 1 ? "" : "es"} del escenario sandbox. La convocatoria en producción no se modifica.`}
        confirmText="Descartar todos"
        cancelText="Cancelar"
        confirmClassName="px-4 py-2.5 sm:py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-md transition-all active:scale-[0.98]"
        confirmLoading={discardBusy}
        loadingText="Descartando…"
      />
    </div>
  );
}
