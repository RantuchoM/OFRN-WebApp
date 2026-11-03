import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import EntradasAyudaWhatsAppBtn from "./EntradasAyudaWhatsAppBtn";
import {
  descartarEntradaAyudaConsulta,
  listEntradasAyudaConsultas,
} from "../../services/entradaService";
import {
  findAyudaDuplicateGroups,
  indexAyudaDuplicateGroupSize,
  normalizeAyudaEmail,
} from "../../utils/entradasAyudaCupo";
import { normalizePhoneForWhatsApp } from "../../utils/entradasWhatsApp";

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
 * Pendientes (lote) y resueltas (histórico, más recientes primero).
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
  onPendientesChange,
  onRowsLoaded,
  reservasVigentesPorEmail = null,
  conciertoDeConsulta,
  refreshKey = 0,
  loteBusy = false,
  filtroEstado: filtroEstadoControlled = null,
  onFiltroEstadoChange = null,
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

  const esPendientes = filtroEstado === "pendiente";
  const esResueltas = filtroEstado === "resuelta";

  const load = useCallback(async () => {
    setLoading(true);
    try {
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
        onPendientesChange?.(list.length);
        onRowsLoaded?.(list);
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
        onPendientesChange?.(0);
        onRowsLoaded?.([]);
      }
    } finally {
      setLoading(false);
    }
  }, [filtroEstado, onPendientesChange, onRowsLoaded]);

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
          onPendientesChange?.(list.length);
          onRowsLoaded?.(list);
        }
      } catch {
        /* badge no crítico */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [filtroEstado, refreshKey, onPendientesChange, onRowsLoaded]);

  const selectedRows = useMemo(
    () => rows.filter((r) => selectedIds.has(String(r.id))),
    [rows, selectedIds],
  );
  const allSelected = rows.length > 0 && selectedRows.length === rows.length;
  const someSelected = selectedRows.length > 0;
  const duplicateGroupSizeById = useMemo(
    () => (esPendientes ? indexAyudaDuplicateGroupSize(rows) : new Map()),
    [rows, esPendientes],
  );
  const duplicateGroups = useMemo(
    () => (esPendientes ? findAyudaDuplicateGroups(rows) : []),
    [rows, esPendientes],
  );
  const duplicatePeople = duplicateGroups.length;
  const duplicateExtraCount = duplicateGroups.reduce((n, g) => n + Math.max(0, g.length - 1), 0);

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
    setSelectedIds(new Set(rows.map((r) => String(r.id))));
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

  const tabBtn = (key, label) => {
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
      </button>
    );
  };

  return (
    <div className={`${ui.inset} min-w-0 space-y-3 p-3 sm:p-4`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className={ui.sectionTitle}>Consultas de ayuda</h3>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loteBusy || busyId != null}
          className={`${ui.btnGhost} text-xs px-2 py-1`}
        >
          Actualizar
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabBtn("pendiente", "Pendientes")}
        {tabBtn("resuelta", "Resueltas")}
      </div>

      <p className={`text-sm ${ui.textMuted}`}>
        {esResueltas
          ? "Consultas ya resueltas, de la más reciente a la más antigua. Abrí una para reenviar mail o WhatsApp."
          : "Llegan del botón «¿Necesitás ayuda?». Tildá varias para aceptarlas juntas, o abrí una sola."}
      </p>

      {esPendientes && !loading && rows.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {onResolverQueEntren ? (
            <button
              type="button"
              disabled={loteBusy || busyId != null}
              className={`${ui.btnPrimary} !w-full px-3 py-2 text-xs sm:!w-auto`}
              onClick={() => onResolverQueEntren(rows)}
            >
              Resolver las que entren en cupo ({rows.length} pendiente{rows.length === 1 ? "" : "s"})
            </button>
          ) : null}
          {duplicatePeople > 0 && onUnificarDuplicados ? (
            <button
              type="button"
              disabled={loteBusy || busyId != null}
              className={`${ui.btnSecondary || ui.btnGhost} !w-full border border-violet-300 bg-violet-50 px-3 py-2 text-xs text-violet-900 sm:!w-auto`}
              onClick={() => onUnificarDuplicados(rows)}
            >
              Unificar duplicados ({duplicatePeople} persona{duplicatePeople === 1 ? "" : "s"}, {duplicateExtraCount} copia{duplicateExtraCount === 1 ? "" : "s"})
            </button>
          ) : null}
        </div>
      ) : null}

      {esPendientes && !loading && duplicatePeople > 0 ? (
        <div
          className={`rounded-lg border px-3 py-2 text-xs ${
            isDark
              ? "border-violet-800 bg-violet-950/40 text-violet-100"
              : "border-violet-200 bg-violet-50 text-violet-950"
          }`}
        >
          Mismo mail = misma persona. Al unificar se emite <strong>una sola reserva</strong> (cantidad = la mayor pedida) y se
          {" "}descartan las consultas duplicadas.
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
              onClick={() => onAceptarLote?.(selectedRows)}
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
      ) : rows.length === 0 ? (
        <p className={`text-sm ${ui.textMuted}`}>
          {esResueltas ? "No hay consultas resueltas." : "No hay consultas pendientes."}
        </p>
      ) : (
        <>
          {esPendientes ? (
            <label className={`inline-flex items-center gap-2 text-sm cursor-pointer ${ui.textSoft}`}>
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleAll}
                disabled={loteBusy}
              />
              Seleccionar todas ({rows.length})
            </label>
          ) : null}
          <ul className="m-0 min-w-0 list-none space-y-3 p-0">
            {rows.map((row) => {
              const active = String(activeAyudaId || "") === String(row.id);
              const checked = selectedIds.has(String(row.id));
              const dupSize = duplicateGroupSizeById.get(String(row.id)) || 0;
              const emailKey = normalizeAyudaEmail(row.email);
              const vigentes = Array.isArray(reservasVigentesPorEmail?.[emailKey])
                ? reservasVigentesPorEmail[emailKey]
                : [];
              const vigentePreferida = (() => {
                if (!vigentes.length) return null;
                if (row.concierto_id != null) {
                  const match = vigentes.find(
                    (r) => Number(r.conciertoId) === Number(row.concierto_id),
                  );
                  if (match) return match;
                }
                return vigentes[0];
              })();

              return (
                <li
                  key={row.id}
                  className={`min-w-0 rounded-lg border p-3 ${
                    active
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
                      {esPendientes ? (
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
                          {esResueltas ? (
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
                          {esPendientes && vigentePreferida ? (
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
                              reservaId={row.reserva_id}
                              concierto={conciertoDeConsulta?.(row.concierto_id)}
                              cantidad={row.cantidad}
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
                          {esResueltas && row.reserva_id ? ` · reserva #${row.reserva_id}` : ""}
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
                      {esPendientes && vigentePreferida && onVincularVigente ? (
                        <button
                          type="button"
                          className={`${ui.btnPrimary} col-span-2 !w-full whitespace-normal px-3 py-2 text-center text-xs leading-tight`}
                          disabled={loteBusy || busyId != null}
                          title={vigentePreferida.label || vigentePreferida.codigo || "Entrada vigente"}
                          onClick={() => onVincularVigente(row, vigentePreferida)}
                        >
                          Usar entrada vigente
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className={`${
                          esPendientes && vigentePreferida ? ui.btnGhost : ui.btnPrimary
                        } ${esResueltas ? "col-span-2" : ""} !w-full whitespace-normal px-3 py-2 text-center text-xs leading-tight`}
                        disabled={loteBusy}
                        onClick={() => onOpenConsulta?.(row)}
                      >
                        Abrir
                      </button>
                      {esPendientes ? (
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
