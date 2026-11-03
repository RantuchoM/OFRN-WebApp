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
 * Soporta selección múltiple para aceptar o descartar en lote.
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
}) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [selectedIds, setSelectedIds] = useState(() => new Set());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listEntradasAyudaConsultas("pendiente");
      const list = Array.isArray(data) ? data : [];
      setRows(list);
      onPendientesChange?.(list.length);
      onRowsLoaded?.(list);
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
      onPendientesChange?.(0);
      onRowsLoaded?.([]);
    } finally {
      setLoading(false);
    }
  }, [onPendientesChange, onRowsLoaded]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  const selectedRows = useMemo(
    () => rows.filter((r) => selectedIds.has(String(r.id))),
    [rows, selectedIds],
  );
  const allSelected = rows.length > 0 && selectedRows.length === rows.length;
  const someSelected = selectedRows.length > 0;
  const duplicateGroupSizeById = useMemo(() => indexAyudaDuplicateGroupSize(rows), [rows]);
  const duplicateGroups = useMemo(() => findAyudaDuplicateGroups(rows), [rows]);
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
      <p className={`text-sm ${ui.textMuted}`}>
        Llegan del botón «¿Necesitás ayuda?». Tildá varias para aceptarlas juntas, o abrí una sola.
      </p>

      {!loading && rows.length > 0 ? (
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

      {!loading && duplicatePeople > 0 ? (
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

      {someSelected && (
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
        <p className={`text-sm ${ui.textMuted}`}>No hay consultas pendientes.</p>
      ) : (
        <>
          <label className={`inline-flex items-center gap-2 text-sm cursor-pointer ${ui.textSoft}`}>
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleAll}
              disabled={loteBusy}
            />
            Seleccionar todas ({rows.length})
          </label>
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
                  <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start">
                    <label className="flex min-w-0 w-full flex-1 cursor-pointer items-start gap-2.5">
                      <input
                        type="checkbox"
                        className="mt-0.5 h-4 w-4 shrink-0"
                        checked={checked}
                        disabled={loteBusy}
                        onChange={() => toggleOne(row.id)}
                      />
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className={`break-words text-sm font-bold ${ui.textStrong}`}>{row.nombre}</span>
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
                          {vigentePreferida ? (
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
                        </p>
                        {row.funcion_label ? (
                          <p className={`break-words text-xs leading-snug ${ui.textSoft}`}>{row.funcion_label}</p>
                        ) : null}
                        <p className={`text-[11px] ${ui.textMuted}`}>{formatWhen(row.created_at)}</p>
                        {row.comentarios ? (
                          <p className={`break-words pt-1 text-xs leading-relaxed ${ui.textBody}`}>{row.comentarios}</p>
                        ) : null}
                      </div>
                    </label>
                    <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-44 sm:shrink-0 sm:flex-col">
                      {vigentePreferida && onVincularVigente ? (
                        <button
                          type="button"
                          className={`${ui.btnPrimary} col-span-2 !w-full whitespace-normal px-3 py-2 text-center text-xs leading-tight sm:col-span-1`}
                          disabled={loteBusy || busyId != null}
                          title={vigentePreferida.label || vigentePreferida.codigo || "Entrada vigente"}
                          onClick={() => onVincularVigente(row, vigentePreferida)}
                        >
                          Usar entrada vigente
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className={`${vigentePreferida ? ui.btnGhost : ui.btnPrimary} !w-full whitespace-normal px-3 py-2 text-center text-xs leading-tight`}
                        disabled={loteBusy}
                        onClick={() => onOpenConsulta?.(row)}
                      >
                        Abrir
                      </button>
                      <button
                        type="button"
                        disabled={loteBusy || busyId === row.id}
                        className={`${ui.btnGhost} inline-flex !w-full items-center justify-center whitespace-normal px-2 py-2 text-center text-xs leading-tight`}
                        onClick={() => void descartar(row.id)}
                      >
                        Descartar
                      </button>
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
