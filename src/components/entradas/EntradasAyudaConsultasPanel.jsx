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
    <div className={`${ui.inset} p-4 space-y-3`}>
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
              className={`${ui.btnPrimary} w-full sm:w-auto px-3 py-2 text-xs`}
              onClick={() => onResolverQueEntren(rows)}
            >
              Resolver las que entren en cupo ({rows.length} pendiente{rows.length === 1 ? "" : "s"})
            </button>
          ) : null}
          {duplicatePeople > 0 && onUnificarDuplicados ? (
            <button
              type="button"
              disabled={loteBusy || busyId != null}
              className={`${ui.btnSecondary || ui.btnGhost} w-full sm:w-auto px-3 py-2 text-xs border border-violet-300 text-violet-900 bg-violet-50`}
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
          className={`sticky top-0 z-10 flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2 ${
            isDark
              ? "border-sky-800 bg-sky-950/80"
              : "border-sky-200 bg-sky-50"
          }`}
        >
          <span className={`text-sm font-semibold ${ui.textStrong}`}>
            {selectedRows.length} seleccionada{selectedRows.length === 1 ? "" : "s"}
          </span>
          <button
            type="button"
            disabled={loteBusy || busyId != null}
            className={`${ui.btnPrimary} w-auto px-3 py-1.5 text-xs`}
            onClick={() => onAceptarLote?.(selectedRows)}
          >
            Aceptar {selectedRows.length}
          </button>
          <button
            type="button"
            disabled={loteBusy || busyId != null}
            className={`${ui.btnGhost} px-2 py-1.5 text-xs`}
            onClick={() => void descartarSeleccionadas()}
          >
            Descartar {selectedRows.length}
          </button>
          <button
            type="button"
            disabled={loteBusy}
            className={`${ui.btnGhost} px-2 py-1.5 text-xs`}
            onClick={() => setSelectedIds(new Set())}
          >
            Limpiar
          </button>
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
          <ul className="space-y-2 list-none p-0 m-0">
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
                  className={`rounded-lg border p-3 space-y-2 ${
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
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <label className="flex items-start gap-2 min-w-0 cursor-pointer flex-1">
                      <input
                        type="checkbox"
                        className="mt-1 shrink-0"
                        checked={checked}
                        disabled={loteBusy}
                        onChange={() => toggleOne(row.id)}
                      />
                      <div className="min-w-0 space-y-0.5">
                        <p className={`font-bold text-sm ${ui.textStrong} flex flex-wrap items-center gap-2`}>
                          <span>{row.nombre}</span>
                          {dupSize > 1 ? (
                            <span
                              className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
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
                              className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                                isDark
                                  ? "bg-amber-800 text-amber-100"
                                  : "bg-amber-200 text-amber-950"
                              }`}
                            >
                              Ya tiene entrada
                            </span>
                          ) : null}
                        </p>
                        <p className={`text-xs break-all ${ui.textMuted}`}>{row.email}</p>
                        {row.telefono && normalizePhoneForWhatsApp(row.telefono) ? (
                          <p className={`text-xs flex flex-wrap items-center gap-1 ${ui.textMuted}`}>
                            <span>{row.telefono}</span>
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
                                  ? "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-bold text-emerald-300 hover:bg-emerald-950/60"
                                  : "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-bold text-emerald-700 hover:bg-emerald-50"
                              }
                            />
                          </p>
                        ) : null}
                        <p className={`text-xs ${ui.textSoft}`}>
                          {row.cantidad
                            ? `${row.cantidad} entrada${Number(row.cantidad) === 1 ? "" : "s"}`
                            : "Sin cantidad"}
                          {row.funcion_label ? ` · ${row.funcion_label}` : ""}
                        </p>
                        <p className={`text-[11px] ${ui.textMuted}`}>{formatWhen(row.created_at)}</p>
                      </div>
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {vigentePreferida && onVincularVigente ? (
                        <button
                          type="button"
                          className={`${ui.btnPrimary} w-auto px-3 py-1.5 text-xs`}
                          disabled={loteBusy || busyId != null}
                          title={vigentePreferida.label || vigentePreferida.codigo || "Entrada vigente"}
                          onClick={() => onVincularVigente(row, vigentePreferida)}
                        >
                          Usar entrada vigente
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className={`${vigentePreferida ? ui.btnGhost : ui.btnPrimary} w-auto px-3 py-1.5 text-xs`}
                        disabled={loteBusy}
                        onClick={() => onOpenConsulta?.(row)}
                      >
                        Abrir
                      </button>
                      <button
                        type="button"
                        disabled={loteBusy || busyId === row.id}
                        className={`${ui.btnGhost} px-2 py-1.5 text-xs`}
                        onClick={() => void descartar(row.id)}
                      >
                        Descartar
                      </button>
                    </div>
                  </div>
                  {row.comentarios ? (
                    <p className={`text-xs leading-relaxed pl-6 ${ui.textBody}`}>{row.comentarios}</p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
