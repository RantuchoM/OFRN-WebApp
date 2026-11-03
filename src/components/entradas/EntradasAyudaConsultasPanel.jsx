import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import EntradasAyudaWhatsAppBtn from "./EntradasAyudaWhatsAppBtn";
import {
  descartarEntradaAyudaConsulta,
  listEntradasAyudaConsultas,
} from "../../services/entradaService";
import {
  classifyAyudaPendientesPorRubro,
  esPedidoAyudaGestion,
  findAyudaDuplicateGroups,
  indexAyudaDuplicateGroupSize,
  normalizeAyudaEmail,
} from "../../utils/entradasAyudaCupo";
import { normalizePhoneForWhatsApp } from "../../utils/entradasWhatsApp";

const PENDIENTE_RUBROS = [
  { key: "generales", label: "Generales" },
  { key: "duplicadas", label: "Duplicadas" },
  { key: "con_entradas", label: "Con entradas" },
  { key: "pedidos", label: "Pedidos" },
];

function formatWhen(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(d);
}

/**
 * Cola de consultas del formulario público (vista Terceros).
 * Pendientes (por rubro) y resueltas (histórico, más recientes primero).
 */
export default function EntradasAyudaConsultasPanel({
  ui,
  isDark,
  activeAyudaId,
  onOpenConsulta,
  onAceptarLote,
  onResolverQueEntren,
  onUnificarDuplicados,
  onVincularVigente,
  onAceptarPedido = null,
  onResolverConEntradas = null,
  onPendientesChange,
  onRowsLoaded,
  reservasVigentesPorEmail = null,
  conciertoDeConsulta,
  refreshKey = 0,
  loteBusy = false,
  filtroEstado: filtroEstadoControlled = null,
  onFiltroEstadoChange = null,
  localResueltas = null,
  onClearLocalResueltas = null,
}) {
  const [filtroInterno, setFiltroInterno] = useState("pendiente");
  const filtroEstado = filtroEstadoControlled ?? filtroInterno;
  const setFiltroEstado = (next) => {
    if (onFiltroEstadoChange) onFiltroEstadoChange(next);
    else setFiltroInterno(next);
  };

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [pendienteRubro, setPendienteRubro] = useState("generales");
  const [pendientesTotal, setPendientesTotal] = useState(0);

  const esPendientes = filtroEstado === "pendiente";
  const esResueltas = filtroEstado === "resuelta";

  // Refs: el padre a veces pasa lambdas inline; no deben rearmar `load` ni disparar fetch en bucle.
  const onPendientesChangeRef = useRef(onPendientesChange);
  const onRowsLoadedRef = useRef(onRowsLoaded);
  const onClearLocalResueltasRef = useRef(onClearLocalResueltas);
  useEffect(() => {
    onPendientesChangeRef.current = onPendientesChange;
    onRowsLoadedRef.current = onRowsLoaded;
    onClearLocalResueltasRef.current = onClearLocalResueltas;
  }, [onPendientesChange, onRowsLoaded, onClearLocalResueltas]);

  const load = useCallback(async ({ clearLocal = false } = {}) => {
    setLoading(true);
    try {
      if (clearLocal) onClearLocalResueltasRef.current?.();
      const data = await listEntradasAyudaConsultas(filtroEstado);
      let list = Array.isArray(data) ? data : [];
      if (filtroEstado === "resuelta") {
        list = [...list].sort((a, b) => {
          const ta = new Date(a.resolved_at || a.created_at || 0).getTime();
          const tb = new Date(b.resolved_at || b.created_at || 0).getTime();
          return tb - ta;
        });
      }
      setRows(list);
      if (filtroEstado === "pendiente") {
        setPendientesTotal(list.length);
        onPendientesChangeRef.current?.(list.length);
        onRowsLoadedRef.current?.(list);
      }
      setSelectedIds((prev) => {
        const next = new Set();
        const ids = new Set(list.map((r) => String(r.id)));
        for (const id of prev) {
          if (ids.has(id)) next.add(id);
        }
        return next;
      });
    } catch (e) {
      toast.error(e?.message || "No se pudieron cargar las consultas de ayuda.");
      setRows([]);
      if (filtroEstado === "pendiente") {
        setPendientesTotal(0);
        onPendientesChangeRef.current?.(0);
        onRowsLoadedRef.current?.([]);
      }
    } finally {
      setLoading(false);
    }
  }, [filtroEstado]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  useEffect(() => {
    if (filtroEstado === "pendiente") return undefined;
    let cancelled = false;
    (async () => {
      try {
        const data = await listEntradasAyudaConsultas("pendiente");
        if (!cancelled) {
          const list = Array.isArray(data) ? data : [];
          setPendientesTotal(list.length);
          onPendientesChangeRef.current?.(list.length);
          onRowsLoadedRef.current?.(list);
        }
      } catch {
        /* badge no crítico */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [filtroEstado, refreshKey]);

  const rowsWithLocal = useMemo(() => {
    if (!esPendientes) return rows;
    const map = localResueltas && typeof localResueltas === "object" ? localResueltas : {};
    const keys = Object.keys(map);
    if (!keys.length) return rows;
    const byId = new Map(rows.map((r) => [String(r.id), r]));
    const out = rows.map((row) => {
      const patch = map[String(row.id)];
      if (!patch) return row;
      return {
        ...row,
        ...patch,
        _row: undefined,
        estado: patch.estado || "resuelta",
        _localResuelta: true,
      };
    });
    for (const id of keys) {
      if (byId.has(id)) continue;
      const patch = map[id];
      const base = patch?._row && typeof patch._row === "object" ? patch._row : { id };
      out.push({
        ...base,
        ...patch,
        id: base.id ?? id,
        _row: undefined,
        estado: patch.estado || "resuelta",
        _localResuelta: true,
      });
    }
    return out;
  }, [esPendientes, rows, localResueltas]);

  const rubros = useMemo(() => {
    if (!esPendientes) {
      return {
        duplicadas: [],
        conEntradas: [],
        generales: [],
        pedidos: [],
        duplicadasPersonas: 0,
        duplicadasCopias: 0,
        conEntradasPersonas: 0,
        generalesPersonas: 0,
        pedidosCount: 0,
      };
    }
    // Clasificar solo las aún pendientes reales; las locales resueltas se anexan al rubro activo.
    const pendingOnly = rowsWithLocal.filter((r) => !r._localResuelta);
    return classifyAyudaPendientesPorRubro(pendingOnly, reservasVigentesPorEmail || {});
  }, [esPendientes, rowsWithLocal, reservasVigentesPorEmail]);

  const localResueltasRows = useMemo(
    () => (esPendientes ? rowsWithLocal.filter((r) => r._localResuelta) : []),
    [esPendientes, rowsWithLocal],
  );

  const rubroCounts = useMemo(
    () => ({
      duplicadas: rubros.duplicadas.length,
      con_entradas: rubros.conEntradas.length,
      generales: rubros.generales.length,
      pedidos: rubros.pedidos.length,
    }),
    [rubros],
  );

  useEffect(() => {
    if (!esPendientes || loading) return;
    const current = rubroCounts[pendienteRubro] || 0;
    if (current > 0) return;
    const firstNonEmpty = PENDIENTE_RUBROS.find((r) => (rubroCounts[r.key] || 0) > 0);
    if (firstNonEmpty && firstNonEmpty.key !== pendienteRubro) {
      setPendienteRubro(firstNonEmpty.key);
    }
  }, [esPendientes, loading, pendienteRubro, rubroCounts]);

  const visibleRows = useMemo(() => {
    if (!esPendientes) return rows;
    let base;
    if (pendienteRubro === "duplicadas") base = rubros.duplicadas;
    else if (pendienteRubro === "con_entradas") base = rubros.conEntradas;
    else if (pendienteRubro === "pedidos") base = rubros.pedidos;
    else base = rubros.generales;
    const baseIds = new Set(base.map((r) => String(r.id)));
    const localsHere = localResueltasRows.filter((r) => {
      const keep = r._pendienteRubro || "generales";
      return keep === pendienteRubro && !baseIds.has(String(r.id));
    });
    return [...base, ...localsHere];
  }, [esPendientes, pendienteRubro, rows, rubros, localResueltasRows]);

  const actionableVisibleRows = useMemo(
    () => visibleRows.filter((r) => !r._localResuelta && !esPedidoAyudaGestion(r)),
    [visibleRows],
  );

  const selectedRows = useMemo(
    () => actionableVisibleRows.filter((r) => selectedIds.has(String(r.id))),
    [actionableVisibleRows, selectedIds],
  );
  const allSelected =
    actionableVisibleRows.length > 0 && selectedRows.length === actionableVisibleRows.length;
  const someSelected = selectedRows.length > 0;
  const duplicateGroupSizeById = useMemo(
    () => (esPendientes ? indexAyudaDuplicateGroupSize(rowsWithLocal) : new Map()),
    [rowsWithLocal, esPendientes],
  );
  const duplicateGroups = useMemo(
    () => (esPendientes ? findAyudaDuplicateGroups(rubros.duplicadas) : []),
    [rubros.duplicadas, esPendientes],
  );
  const duplicatePeople = rubros.duplicadasPersonas || duplicateGroups.length;
  const duplicateExtraCount = rubros.duplicadasCopias
    || duplicateGroups.reduce((n, g) => n + Math.max(0, g.length - 1), 0);

  const toggleOne = (id) => {
    const key = String(id);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(new Set(actionableVisibleRows.map((r) => String(r.id))));
  };

  const descartar = async (id) => {
    if (!window.confirm("¿Descartar esta consulta sin crear reserva?")) return;
    setBusyId(id);
    try {
      await descartarEntradaAyudaConsulta(id);
      toast.success("Consulta descartada.");
      await load();
    } catch (e) {
      toast.error(e?.message || "No se pudo descartar.");
    } finally {
      setBusyId(null);
    }
  };

  const descartarSeleccionadas = async () => {
    if (!selectedRows.length) return;
    if (
      !window.confirm(
        `¿Descartar ${selectedRows.length} consulta${selectedRows.length === 1 ? "" : "s"} sin crear reserva?`,
      )
    ) {
      return;
    }
    setBusyId("lote");
    let ok = 0;
    let fail = 0;
    for (const row of selectedRows) {
      try {
        await descartarEntradaAyudaConsulta(row.id);
        ok += 1;
      } catch {
        fail += 1;
      }
    }
    setBusyId(null);
    setSelectedIds(new Set());
    if (ok) toast.success(`${ok} consulta${ok === 1 ? "" : "s"} descartada${ok === 1 ? "" : "s"}.`);
    if (fail) toast.error(`${fail} no se pudieron descartar.`);
    await load();
  };

  const tabBtn = (key, label, count = null) => {
    const active = filtroEstado === key;
    return (
      <button
        type="button"
        onClick={() => {
          setSelectedIds(new Set());
          setFiltroEstado(key);
        }}
        className={
          active
            ? `${ui.navActive} px-3 py-1.5 text-xs`
            : `${ui.navIdle} px-3 py-1.5 text-xs`
        }
      >
        {label}
        {count != null ? ` (${count})` : ""}
      </button>
    );
  };

  const rubroTabBtn = (key, label, count) => {
    const active = pendienteRubro === key;
    return (
      <button
        type="button"
        onClick={() => {
          setSelectedIds(new Set());
          setPendienteRubro(key);
        }}
        className={
          active
            ? `${ui.navActive} px-2.5 py-1 text-[11px] sm:text-xs`
            : `${ui.navIdle} px-2.5 py-1 text-[11px] sm:text-xs`
        }
      >
        {label} ({count})
      </button>
    );
  };

  const emptyPendienteMsg = (() => {
    if (pendienteRubro === "duplicadas") return "No hay consultas duplicadas.";
    if (pendienteRubro === "con_entradas") return "No hay consultas con entrada vigente.";
    if (pendienteRubro === "pedidos") return "No hay pedidos de cancelación o cambio de función.";
    return "No hay consultas generales pendientes.";
  })();

  return (
    <div className={`${ui.inset} min-w-0 space-y-3 p-3 sm:p-4`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className={ui.sectionTitle}>Consultas de ayuda</h3>
        <button
          type="button"
          onClick={() => void load({ clearLocal: true })}
          disabled={loteBusy || busyId != null}
          className={`${ui.btnGhost} text-xs px-2 py-1`}
        >
          Actualizar
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabBtn("pendiente", "Pendientes", pendientesTotal)}
        {tabBtn("resuelta", "Resueltas")}
      </div>

      {esPendientes ? (
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          {PENDIENTE_RUBROS.map((r) => rubroTabBtn(r.key, r.label, rubroCounts[r.key] || 0))}
        </div>
      ) : null}

      <p className={`text-sm ${ui.textMuted}`}>
        {esResueltas
          ? "Consultas ya resueltas, de la más reciente a la más antigua. Abrí una para reenviar mail o WhatsApp."
          : pendienteRubro === "duplicadas"
            ? "Mismo mail = misma persona. Unificá o aceptá el lote: se emite una sola reserva y se descartan las copias."
            : pendienteRubro === "con_entradas"
              ? "Ya tienen reserva vigente. Vinculá la consulta a esa entrada sin emitir otra."
              : pendienteRubro === "pedidos"
                ? "Pidieron cancelar o cambiar de función. Aceptá el pedido para aplicarlo, o descartalo."
                : "Sin duplicados ni entrada vigente. Tildá varias para aceptarlas juntas, o resolvé las que entren en cupo."}
      </p>

      {esPendientes && !loading && visibleRows.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {pendienteRubro === "generales" && onResolverQueEntren ? (
            <button
              type="button"
              disabled={loteBusy || busyId != null}
              className={`${ui.btnPrimary} !w-full px-3 py-2 text-xs sm:!w-auto`}
              onClick={() => onResolverQueEntren(actionableVisibleRows, "generales")}
            >
              Resolver las que entren en cupo ({actionableVisibleRows.length})
            </button>
          ) : null}
          {pendienteRubro === "duplicadas" && duplicatePeople > 0 && onUnificarDuplicados ? (
            <button
              type="button"
              disabled={loteBusy || busyId != null}
              className={`${ui.btnSecondary || ui.btnGhost} !w-full border border-violet-300 bg-violet-50 px-3 py-2 text-xs text-violet-900 sm:!w-auto`}
              onClick={() => onUnificarDuplicados(actionableVisibleRows, "duplicadas")}
            >
              Unificar duplicados ({duplicatePeople} persona{duplicatePeople === 1 ? "" : "s"}, {duplicateExtraCount} copia{duplicateExtraCount === 1 ? "" : "s"})
            </button>
          ) : null}
          {pendienteRubro === "con_entradas" && onResolverConEntradas ? (
            <button
              type="button"
              disabled={loteBusy || busyId != null || !actionableVisibleRows.length}
              className={`${ui.btnPrimary} !w-full px-3 py-2 text-xs sm:!w-auto`}
              onClick={() => onResolverConEntradas(actionableVisibleRows)}
            >
              Vincular todas a entrada vigente ({actionableVisibleRows.length})
            </button>
          ) : null}
        </div>
      ) : null}

      {esPendientes && pendienteRubro === "duplicadas" && !loading && duplicatePeople > 0 ? (
        <div
          className={`rounded-lg border px-3 py-2 text-xs ${
            isDark
              ? "border-violet-800 bg-violet-950/40 text-violet-100"
              : "border-violet-200 bg-violet-50 text-violet-950"
          }`}
        >
          Al unificar se emite <strong>una sola reserva</strong> (cantidad = la mayor pedida) y se descartan las consultas duplicadas.
        </div>
      ) : null}

      {esPendientes && someSelected && (
        <div
          className={`sticky top-0 z-10 flex flex-col gap-2 rounded-lg border px-3 py-2 sm:flex-row sm:flex-wrap sm:items-center ${
            isDark
              ? "border-sky-800 bg-sky-950/80"
              : "border-sky-200 bg-sky-50"
          }`}
        >
          <span className={`text-sm font-semibold ${ui.textStrong}`}>
            {selectedRows.length} seleccionada{selectedRows.length === 1 ? "" : "s"}
          </span>
          <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap">
            <button
              type="button"
              disabled={loteBusy || busyId != null}
              className={`${ui.btnPrimary} col-span-2 !w-full px-3 py-2 text-xs sm:col-auto sm:!w-auto sm:py-1.5`}
              onClick={() => onAceptarLote?.(selectedRows, null, pendienteRubro)}
            >
              Aceptar {selectedRows.length}
            </button>
            <button
              type="button"
              disabled={loteBusy || busyId != null}
              className={`${ui.btnGhost} inline-flex !w-full items-center justify-center px-2 py-2 text-xs sm:!w-auto sm:py-1.5`}
              onClick={() => void descartarSeleccionadas()}
            >
              Descartar {selectedRows.length}
            </button>
            <button
              type="button"
              disabled={loteBusy}
              className={`${ui.btnGhost} inline-flex !w-full items-center justify-center px-2 py-2 text-xs sm:!w-auto sm:py-1.5`}
              onClick={() => setSelectedIds(new Set())}
            >
              Limpiar
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p className={`text-sm ${ui.textMuted}`}>Cargando…</p>
      ) : esResueltas && rows.length === 0 ? (
        <p className={`text-sm ${ui.textMuted}`}>No hay consultas resueltas.</p>
      ) : esPendientes && rows.length === 0 ? (
        <p className={`text-sm ${ui.textMuted}`}>No hay consultas pendientes.</p>
      ) : esPendientes && visibleRows.length === 0 ? (
        <p className={`text-sm ${ui.textMuted}`}>{emptyPendienteMsg}</p>
      ) : (
        <>
          {esPendientes && actionableVisibleRows.length > 0 ? (
            <label className={`inline-flex items-center gap-2 text-sm cursor-pointer ${ui.textSoft}`}>
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleAll}
                disabled={loteBusy}
              />
              Seleccionar todas ({actionableVisibleRows.length})
            </label>
          ) : null}
          <ul className="m-0 min-w-0 list-none space-y-3 p-0">
            {visibleRows.map((row) => {
              const localResuelta = Boolean(row._localResuelta);
              const active = String(activeAyudaId || "") === String(row.id);
              const checked = selectedIds.has(String(row.id));
              const dupSize = duplicateGroupSizeById.get(String(row.id)) || 0;
              const emailKey = normalizeAyudaEmail(row.email);
              const vigentes = Array.isArray(reservasVigentesPorEmail?.[emailKey])
                ? reservasVigentesPorEmail[emailKey]
                : [];
              const vigentePreferida = (() => {
                if (localResuelta) return null;
                if (!vigentes.length) return null;
                if (row.concierto_id != null) {
                  const match = vigentes.find(
                    (r) => Number(r.conciertoId) === Number(row.concierto_id),
                  );
                  if (match) return match;
                }
                return vigentes[0];
              })();
              const pedidoGestion = esPedidoAyudaGestion(row);
              const waReservaId = row.reserva_id || row.reserva_pedido_id || vigentePreferida?.id || null;
              const waConciertoId = vigentePreferida?.conciertoId ?? row.concierto_id;

              return (
                <li
                  key={row.id}
                  className={`min-w-0 rounded-lg border p-3 ${
                    localResuelta
                      ? isDark
                        ? "border-emerald-800 bg-emerald-950/30 opacity-90"
                        : "border-emerald-200 bg-emerald-50/80 opacity-95"
                      : active
                        ? isDark
                          ? "border-[#1ebbf0] bg-slate-900/80"
                          : "border-[#1ebbf0] bg-sky-50"
                        : dupSize > 1
                          ? isDark
                            ? "border-violet-700 bg-violet-950/30"
                            : "border-violet-200 bg-violet-50/80"
                          : isDark
                            ? "border-slate-600 bg-slate-900/40"
                            : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="flex w-full min-w-0 flex-col gap-3 lg:flex-row lg:items-start">
                    <div className="flex w-full min-w-0 items-start gap-2.5 lg:flex-1">
                      {esPendientes && !localResuelta && !pedidoGestion ? (
                        <input
                          type="checkbox"
                          className="mt-0.5 h-4 w-4 shrink-0"
                          checked={checked}
                          disabled={loteBusy}
                          onChange={() => toggleOne(row.id)}
                          aria-label={`Seleccionar ${row.nombre || row.email}`}
                        />
                      ) : null}
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className={`break-words text-sm font-bold ${ui.textStrong}`}>{row.nombre}</span>
                          {esResueltas || localResuelta ? (
                            <span
                              className={`inline-flex shrink-0 whitespace-nowrap rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                                isDark
                                  ? "bg-emerald-800 text-emerald-100"
                                  : "bg-emerald-200 text-emerald-900"
                              }`}
                            >
                              Resuelta
                            </span>
                          ) : null}
                          {esResueltas && row.resolved_by_label ? (
                            <span
                              className={`inline-flex shrink-0 whitespace-nowrap rounded-full px-1.5 py-0.5 text-[10px] font-bold tracking-wide ${
                                isDark
                                  ? "bg-slate-700 text-slate-100"
                                  : "bg-slate-200 text-slate-800"
                              }`}
                              title="Quién resolvió la consulta"
                            >
                              Por {row.resolved_by_label}
                            </span>
                          ) : null}
                          {dupSize > 1 ? (
                            <span
                              className={`inline-flex shrink-0 whitespace-nowrap rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                                isDark
                                  ? "bg-violet-800 text-violet-100"
                                  : "bg-violet-200 text-violet-900"
                              }`}
                            >
                              Duplicada · {dupSize}
                            </span>
                          ) : null}
                          {pedidoGestion && !localResuelta && !esResueltas ? (
                            <span
                              className={`inline-flex shrink-0 whitespace-nowrap rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                                row.pedido === "cancelar"
                                  ? isDark
                                    ? "bg-rose-800 text-rose-100"
                                    : "bg-rose-200 text-rose-950"
                                  : isDark
                                    ? "bg-sky-800 text-sky-100"
                                    : "bg-sky-200 text-sky-950"
                              }`}
                            >
                              {row.pedido === "cancelar" ? "Pide cancelar" : "Pide cambiar"}
                            </span>
                          ) : null}
                          {esPendientes && vigentePreferida && !pedidoGestion ? (
                            <span
                              className={`inline-flex shrink-0 whitespace-nowrap rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                                isDark
                                  ? "bg-amber-800 text-amber-100"
                                  : "bg-amber-200 text-amber-950"
                              }`}
                            >
                              Ya tiene entrada
                            </span>
                          ) : null}
                        </div>
                        <p className={`break-words text-xs ${ui.textMuted}`}>{row.email}</p>
                        {row.telefono && normalizePhoneForWhatsApp(row.telefono) ? (
                          <p className={`flex flex-wrap items-center gap-x-2 gap-y-1 text-xs ${ui.textMuted}`}>
                            <span className="break-words">{row.telefono}</span>
                            <EntradasAyudaWhatsAppBtn
                              telefono={row.telefono}
                              nombre={row.nombre}
                              reservaId={waReservaId}
                              concierto={conciertoDeConsulta?.(waConciertoId)}
                              cantidad={vigentePreferida?.cantidad ?? row.cantidad}
                              iconSize={14}
                              isDark={isDark}
                              className={
                                isDark
                                  ? "inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-bold text-emerald-300 hover:bg-emerald-950/60"
                                  : "inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-bold text-emerald-700 hover:bg-emerald-50"
                              }
                            />
                          </p>
                        ) : null}
                        <p className={`text-xs ${ui.textSoft}`}>
                          {row.cantidad
                            ? `${row.cantidad} entrada${Number(row.cantidad) === 1 ? "" : "s"}`
                            : "Sin cantidad"}
                          {(esResueltas || localResuelta) && row.reserva_id
                            ? ` · reserva #${row.reserva_id}`
                            : ""}
                        </p>
                        {row.funcion_label ? (
                          <p className={`break-words text-xs leading-snug ${ui.textSoft}`}>{row.funcion_label}</p>
                        ) : null}
                        <p className={`text-[11px] ${ui.textMuted}`}>
                          {esResueltas
                            ? `Resuelta ${formatWhen(row.resolved_at || row.created_at)}${
                              row.resolved_by_label ? ` · ${row.resolved_by_label}` : ""
                            }`
                            : formatWhen(row.created_at)}
                        </p>
                        {row.comentarios ? (
                          <p className={`w-full min-w-0 whitespace-pre-wrap break-words pt-1 text-xs leading-relaxed ${ui.textBody}`}>
                            {row.comentarios}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <div className="grid w-full grid-cols-2 gap-2 lg:w-44 lg:shrink-0 lg:grid-cols-1">
                      {esPendientes && !localResuelta && pedidoGestion && onAceptarPedido ? (
                        <button
                          type="button"
                          className={`${ui.btnPrimary} col-span-2 !w-full whitespace-normal px-3 py-2 text-center text-xs leading-tight`}
                          disabled={loteBusy || busyId != null}
                          onClick={() => onAceptarPedido(row)}
                        >
                          {row.pedido === "cancelar" ? "Aceptar cancelación" : "Aceptar cambio"}
                        </button>
                      ) : null}
                      {esPendientes && !localResuelta && !pedidoGestion && vigentePreferida && onVincularVigente ? (
                        <button
                          type="button"
                          className={`${ui.btnPrimary} col-span-2 !w-full whitespace-normal px-3 py-2 text-center text-xs leading-tight`}
                          disabled={loteBusy || busyId != null}
                          title={vigentePreferida.label || vigentePreferida.codigo || "Entrada vigente"}
                          onClick={() => onVincularVigente(row, vigentePreferida, pendienteRubro)}
                        >
                          Usar entrada vigente
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className={`${
                          esPendientes && vigentePreferida && !localResuelta ? ui.btnGhost : ui.btnPrimary
                        } ${esResueltas || localResuelta ? "col-span-2" : ""} !w-full whitespace-normal px-3 py-2 text-center text-xs leading-tight`}
                        disabled={loteBusy}
                        onClick={() => onOpenConsulta?.(row)}
                      >
                        Abrir
                      </button>
                      {esPendientes && !localResuelta ? (
                        <button
                          type="button"
                          disabled={loteBusy || busyId === row.id}
                          className={`${ui.btnGhost} inline-flex !w-full items-center justify-center whitespace-normal px-2 py-2 text-center text-xs leading-tight`}
                          onClick={() => void descartar(row.id)}
                        >
                          Descartar
                        </button>
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
