import React, {
  Fragment,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { parseISO, startOfDay } from "date-fns";
import {
  fetchAsistenciaMatrixBaseData,
  resolveGiraRosterIds,
  TIPOS_PROGRAMA_ASISTENCIA_MATRIZ,
} from "../../services/giraService";
import {
  buildAsistenciaMatrixRowGroups,
  downloadAsistenciaMatrixExcel,
  downloadAsistenciaMatrixPdf,
} from "../../utils/asistenciaMatrixExport";
import { IconDownload } from "../../components/ui/Icons";

function startOfToday() {
  return startOfDay(new Date());
}

function filterProgramasForMatrix(programas, { selectedTypes, showPastInYear }) {
  const today = startOfToday();
  const currentYear = today.getFullYear();
  return programas.filter((p) => {
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
    if (showPastInYear && fd < today && fd.getFullYear() === currentYear)
      return true;
    return false;
  });
}

function sortIntegrantesByInstrument(integrantes) {
  return [...integrantes].sort((a, b) => {
    const ia = Number(a.id_instr) || 999999;
    const ib = Number(b.id_instr) || 999999;
    if (ia !== ib) return ia - ib;
    const na = `${a.apellido || ""} ${a.nombre || ""}`.trim();
    const nb = `${b.apellido || ""} ${b.nombre || ""}`.trim();
    return na.localeCompare(nb, "es");
  });
}

/** Tooltip en portal (fixed) para no quedar recortado por overflow del scroll del panel. */
function ProgramaHeaderTooltip({
  label,
  nombreGira,
  subtitulo,
  giraId,
  onRepertoire,
  scrollContainerRef,
}) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);
  const popRef = useRef(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  const updatePos = useCallback(() => {
    if (!btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    const maxW = 320;
    const left = Math.min(
      Math.max(r.left + r.width / 2, maxW / 2 + 8),
      window.innerWidth - maxW / 2 - 8,
    );
    setPos({ top: r.bottom + 8, left });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    updatePos();
  }, [open, updatePos]);

  useEffect(() => {
    if (!open) return;
    const onResize = () => updatePos();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [open, updatePos]);

  useEffect(() => {
    if (!open) return;
    const el = scrollContainerRef?.current;
    const close = () => setOpen(false);
    el?.addEventListener("scroll", close, { passive: true });
    window.addEventListener("scroll", close, { passive: true, capture: true });
    return () => {
      el?.removeEventListener("scroll", close);
      window.removeEventListener("scroll", close, { capture: true });
    };
  }, [open, scrollContainerRef]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (btnRef.current?.contains(e.target)) return;
      if (popRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        ref={btnRef}
        onClick={() => setOpen((o) => !o)}
        className="max-w-[5rem] whitespace-normal break-words text-left text-[10px] font-semibold leading-tight text-slate-700 underline decoration-slate-300 decoration-dotted underline-offset-2 hover:text-indigo-700 dark:text-slate-200 dark:hover:text-indigo-300"
      >
        {label}
      </button>
      {open &&
        createPortal(
          <div
            ref={popRef}
            style={{
              position: "fixed",
              top: pos.top,
              left: pos.left,
              transform: "translateX(-50%)",
              zIndex: 99999,
            }}
            className="w-max max-w-sm rounded-lg border border-slate-200 bg-white p-2.5 text-left text-xs shadow-2xl dark:border-slate-600 dark:bg-slate-800"
          >
            <div className="font-semibold text-slate-800 dark:text-slate-100">
              {nombreGira || "—"}
            </div>
            {subtitulo ? (
              <div className="mt-0.5 text-slate-600 dark:text-slate-300">
                {subtitulo}
              </div>
            ) : null}
            <button
              type="button"
              className="mt-2 text-indigo-600 underline hover:text-indigo-800 dark:text-indigo-400"
              onClick={() => {
                onRepertoire(giraId);
                setOpen(false);
              }}
            >
              Ir al repertorio
            </button>
          </div>,
          document.body,
        )}
    </>
  );
}

export default function AsistenciaMatrixReport({ supabase }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [programas, setProgramas] = useState([]);
  const [integrantes, setIntegrantes] = useState([]);
  const [ensambles, setEnsambles] = useState([]);
  const [memberships, setMemberships] = useState([]);

  const [selectedTypes, setSelectedTypes] = useState(() => new Set(["Sinfónico"]));
  const [showPastInYear, setShowPastInYear] = useState(false);
  const [selectedIntegranteIds, setSelectedIntegranteIds] = useState(
    () => new Set(),
  );
  const [openEnsambles, setOpenEnsambles] = useState(() => new Set());

  const [rosterByGiraId, setRosterByGiraId] = useState({});
  const [rosterLoading, setRosterLoading] = useState(false);

  const ensambleCheckboxRefs = useRef({});
  const tableScrollRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      const { programas: p, integrantes: i, ensambles: e, memberships: m, error } =
        await fetchAsistenciaMatrixBaseData(supabase);
      if (cancelled) return;
      if (error) {
        setLoadError(error.message || "Error al cargar datos");
        setLoading(false);
        return;
      }
      setProgramas(p);
      setIntegrantes(i);
      setEnsambles(e);
      setMemberships(m);
      setSelectedIntegranteIds(new Set());
      setOpenEnsambles(new Set());
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const membershipsByEnsamble = useMemo(() => {
    const map = new Map();
    for (const row of memberships) {
      const eid = Number(row.id_ensamble);
      const iid = Number(row.id_integrante);
      if (!map.has(eid)) map.set(eid, []);
      map.get(eid).push(iid);
    }
    return map;
  }, [memberships]);

  const integranteById = useMemo(() => {
    const m = new Map();
    for (const it of integrantes) m.set(Number(it.id), it);
    return m;
  }, [integrantes]);

  const integrantesInMatrix = useMemo(() => {
    const ids = new Set(memberships.map((x) => Number(x.id_integrante)));
    return sortIntegrantesByInstrument(
      integrantes.filter((it) => ids.has(Number(it.id))),
    );
  }, [integrantes, memberships]);

  const filteredProgramas = useMemo(
    () =>
      filterProgramasForMatrix(programas, {
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
      const entries = await Promise.all(
        giras.map(async (g) => {
          const ids = await resolveGiraRosterIds(supabase, g.id);
          return [g.id, new Set(ids.map(Number))];
        }),
      );
      if (cancelled) return;
      setRosterByGiraId(Object.fromEntries(entries));
      setRosterLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [filteredProgramas, supabase, selectedIntegranteIds]);

  const visibleRows = useMemo(
    () =>
      integrantesInMatrix.filter((it) =>
        selectedIntegranteIds.has(Number(it.id)),
      ),
    [integrantesInMatrix, selectedIntegranteIds],
  );

  const rowGroups = useMemo(
    () =>
      buildAsistenciaMatrixRowGroups(
        visibleRows,
        ensambles,
        membershipsByEnsamble,
        selectedIntegranteIds,
      ),
    [visibleRows, ensambles, membershipsByEnsamble, selectedIntegranteIds],
  );

  const toggleType = useCallback((tipo) => {
    setSelectedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(tipo)) next.delete(tipo);
      else next.add(tipo);
      return next;
    });
  }, []);

  const toggleIntegrante = useCallback((id) => {
    const n = Number(id);
    setSelectedIntegranteIds((prev) => {
      const next = new Set(prev);
      if (next.has(n)) next.delete(n);
      else next.add(n);
      return next;
    });
  }, []);

  const toggleEnsambleMembers = useCallback((_ensambleId, memberIds) => {
    setSelectedIntegranteIds((prev) => {
      const allSelected = memberIds.every((id) => prev.has(id));
      const next = new Set(prev);
      if (allSelected) {
        memberIds.forEach((id) => next.delete(id));
      } else {
        memberIds.forEach((id) => next.add(id));
      }
      return next;
    });
  }, []);

  const toggleEnsambleOpen = useCallback((id) => {
    setOpenEnsambles((prev) => {
      const next = new Set(prev);
      const n = Number(id);
      if (next.has(n)) next.delete(n);
      else next.add(n);
      return next;
    });
  }, []);

  useEffect(() => {
    for (const en of ensambles) {
      const eid = Number(en.id);
      const memberIds = membershipsByEnsamble.get(eid) || [];
      const ref = ensambleCheckboxRefs.current[eid];
      if (!ref) continue;
      const selected = memberIds.filter((id) =>
        selectedIntegranteIds.has(id),
      );
      ref.indeterminate =
        selected.length > 0 && selected.length < memberIds.length;
    }
  }, [ensambles, membershipsByEnsamble, selectedIntegranteIds]);

  const headerLabel = useCallback((g) => {
    const n = (g.nomenclador || "").trim();
    const m = (g.mes_letra || "").trim();
    if (n && m) return `${n} ${m}`;
    return n || m || `#${g.id}`;
  }, []);

  const goToRepertoire = (giraId) => {
    navigate(`/?tab=giras&view=REPERTOIRE&giraId=${giraId}`);
  };

  const allMatrixIntegranteIds = useMemo(
    () => integrantesInMatrix.map((it) => Number(it.id)),
    [integrantesInMatrix],
  );

  const selectAllIntegrantes = useCallback(() => {
    setSelectedIntegranteIds(new Set(allMatrixIntegranteIds));
  }, [allMatrixIntegranteIds]);

  const clearAllIntegrantes = useCallback(() => {
    setSelectedIntegranteIds(new Set());
  }, []);

  const exportDisabled =
    rosterLoading ||
    filteredProgramas.length === 0 ||
    visibleRows.length === 0;

  const handleExportExcel = useCallback(async () => {
    if (exportDisabled) return;
    await downloadAsistenciaMatrixExcel({
      visibleRows,
      filteredProgramas,
      rosterByGiraId,
      headerLabel,
      ensambles,
      membershipsByEnsamble,
      selectedIntegranteIds,
    });
  }, [
    exportDisabled,
    visibleRows,
    filteredProgramas,
    rosterByGiraId,
    headerLabel,
    ensambles,
    membershipsByEnsamble,
    selectedIntegranteIds,
  ]);

  const handleExportPdf = useCallback(() => {
    if (exportDisabled) return;
    downloadAsistenciaMatrixPdf({
      visibleRows,
      filteredProgramas,
      rosterByGiraId,
      headerLabel,
      ensambles,
      membershipsByEnsamble,
      selectedIntegranteIds,
    });
  }, [
    exportDisabled,
    visibleRows,
    filteredProgramas,
    rosterByGiraId,
    headerLabel,
    ensambles,
    membershipsByEnsamble,
    selectedIntegranteIds,
  ]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-slate-500 dark:text-slate-400">
        Cargando matriz de asistencia…
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="p-8 text-center text-red-600 dark:text-red-400">
        {loadError}
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-slate-50 dark:bg-slate-950">
      <header className="shrink-0 border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
        <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100">
          Matriz de asistencia (músicos vs. programas)
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Participación por programa según nómina resuelta (fuentes y ausentes).
        </p>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden p-3 lg:flex-row">
        <aside className="flex w-full shrink-0 flex-col gap-3 overflow-auto rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900 lg:max-w-sm">
          <div>
            <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Tipo de programa
            </h2>
            <div className="flex flex-col gap-1.5">
              {TIPOS_PROGRAMA_ASISTENCIA_MATRIZ.map((tipo) => (
                <label
                  key={tipo}
                  className="flex cursor-pointer items-center gap-2 text-sm text-slate-700 dark:text-slate-300"
                >
                  <input
                    type="checkbox"
                    checked={selectedTypes.has(tipo)}
                    onChange={() => toggleType(tipo)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  {tipo}
                </label>
              ))}
            </div>
          </div>

          <label className="flex cursor-pointer items-center gap-2 border-t border-slate-100 pt-2 text-sm text-slate-700 dark:border-slate-800 dark:text-slate-300">
            <input
              type="checkbox"
              checked={showPastInYear}
              onChange={(e) => setShowPastInYear(e.target.checked)}
              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            Mostrar programas anteriores del año (mismo año calendario)
          </label>

          <div className="border-t border-slate-100 pt-2 dark:border-slate-800">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Ensambles e integrantes
              </h2>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={selectAllIntegrantes}
                  className="rounded border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  Todos
                </button>
                <button
                  type="button"
                  onClick={clearAllIntegrantes}
                  className="rounded border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  Ninguno
                </button>
              </div>
            </div>
            <div className="max-h-[40vh] space-y-1 overflow-y-auto pr-1 lg:max-h-none">
              {ensambles.map((en) => {
                const eid = Number(en.id);
                const memberIds = membershipsByEnsamble.get(eid) || [];
                if (memberIds.length === 0) return null;
                const open = openEnsambles.has(eid);
                const allOn = memberIds.every((id) =>
                  selectedIntegranteIds.has(id),
                );
                return (
                  <div key={eid} className="rounded border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-1 bg-slate-50 px-2 py-1.5 dark:bg-slate-800/80">
                      <button
                        type="button"
                        onClick={() => toggleEnsambleOpen(eid)}
                        className="w-5 shrink-0 text-slate-500"
                        aria-expanded={open}
                      >
                        {open ? "▼" : "▶"}
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
                      <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                        {en.ensamble || `Ensamble ${eid}`}
                      </span>
                    </div>
                    {open && (
                      <div className="space-y-0.5 border-t border-slate-100 py-1 pl-7 dark:border-slate-800">
                        {memberIds.map((iid) => {
                          const p = integranteById.get(iid);
                          if (!p) return null;
                          const label = `${p.nombre || ""} ${p.apellido || ""}`.trim();
                          return (
                            <label
                              key={`${eid}-${iid}`}
                              className="flex cursor-pointer items-center gap-2 py-0.5 text-sm text-slate-600 dark:text-slate-400"
                            >
                              <input
                                type="checkbox"
                                checked={selectedIntegranteIds.has(iid)}
                                onChange={() => toggleIntegrante(iid)}
                                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                              />
                              {label}
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </aside>

        <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-3 py-2 dark:border-slate-800">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {filteredProgramas.length} programa(s) · {visibleRows.length}{" "}
              músico(s)
              {rosterLoading ? " · calculando nóminas…" : ""}
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                disabled={exportDisabled}
                onClick={handleExportPdf}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                title="Descargar PDF"
              >
                <IconDownload size={14} />
                PDF
              </button>
              <button
                type="button"
                disabled={exportDisabled}
                onClick={handleExportExcel}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                title="Descargar Excel"
              >
                <IconDownload size={14} />
                Excel
              </button>
            </div>
          </div>
          <div ref={tableScrollRef} className="min-h-0 flex-1 overflow-auto">
            <table className="min-w-max border-collapse text-sm">
              <thead>
                <tr>
                  <th
                    className="sticky left-0 top-0 z-30 min-w-[10rem] border-b border-r border-slate-200 bg-slate-100 px-2 py-2 text-left text-xs font-bold uppercase tracking-wide text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                    scope="col"
                  >
                    Integrante
                  </th>
                  {filteredProgramas.map((g) => (
                    <th
                      key={g.id}
                      scope="col"
                      className="sticky top-0 z-20 min-w-[3.25rem] border-b border-slate-200 bg-slate-100 px-1 py-2 text-center align-bottom dark:border-slate-700 dark:bg-slate-800"
                    >
                      <div className="flex h-full flex-col items-center justify-end">
                        <ProgramaHeaderTooltip
                          label={headerLabel(g)}
                          nombreGira={g.nombre_gira}
                          subtitulo={g.subtitulo}
                          giraId={g.id}
                          onRepertoire={goToRepertoire}
                          scrollContainerRef={tableScrollRef}
                        />
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rowGroups.map((grp) => (
                  <Fragment key={grp.key}>
                    <tr className="bg-slate-200/90 dark:bg-slate-800/95">
                      <td
                        colSpan={1 + filteredProgramas.length}
                        className="border-b border-slate-300 px-2 py-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-800 dark:border-slate-600 dark:text-slate-100"
                      >
                        {grp.label}
                      </td>
                    </tr>
                    {grp.rows.map((row) => {
                      const iid = Number(row.id);
                      const inst = row.instrumentos;
                      const instLabel =
                        inst?.instrumento ||
                        inst?.abreviatura ||
                        (row.id_instr ? `#${row.id_instr}` : "—");
                      const ensLabels = ensambles
                        .filter((en) =>
                          (
                            membershipsByEnsamble.get(Number(en.id)) || []
                          ).includes(iid),
                        )
                        .map((en) => en.ensamble)
                        .filter(Boolean);
                      const subLine = [instLabel, ensLabels.join(", ")]
                        .filter(Boolean)
                        .join(" · ");

                      return (
                        <tr
                          key={`${grp.key}-${iid}`}
                          className="border-b border-slate-100 dark:border-slate-800"
                        >
                          <th
                            scope="row"
                            className="sticky left-0 z-10 border-r border-slate-200 bg-white px-2 py-1.5 text-left align-top dark:border-slate-700 dark:bg-slate-900"
                          >
                            <div className="font-medium text-slate-800 dark:text-slate-100">
                              {`${row.nombre || ""} ${row.apellido || ""}`.trim()}
                            </div>
                            <div className="text-[10px] leading-snug text-slate-500 dark:text-slate-400">
                              {subLine}
                            </div>
                          </th>
                          {filteredProgramas.map((g) => {
                            const set = rosterByGiraId[g.id];
                            const active = set && set.has(iid);
                            return (
                              <td
                                key={`${iid}-${g.id}`}
                                className="border-l border-slate-100 px-1 py-1 text-center align-middle dark:border-slate-800"
                              >
                                {active ? (
                                  <span
                                    className="text-base font-bold text-slate-800 dark:text-slate-200"
                                    title="Convocado / activo en nómina"
                                  >
                                    X
                                  </span>
                                ) : (
                                  <span className="text-slate-300 dark:text-slate-600">
                                    ·
                                  </span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </Fragment>
                ))}
              </tbody>
            </table>
            {visibleRows.length === 0 && (
              <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
                No hay músicos seleccionados o no hay membresías de ensamble.
              </div>
            )}
            {filteredProgramas.length === 0 && (
              <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
                No hay programas que cumplan los filtros de tipo y fecha.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
