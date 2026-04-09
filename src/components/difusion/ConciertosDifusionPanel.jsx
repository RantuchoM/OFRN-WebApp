import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  IconEdit,
  IconCheck,
  IconX,
  IconLoader,
  IconHistory,
  IconArrowRight,
} from "../ui/Icons";
import ConfirmModal from "../ui/ConfirmModal";
import MassiveEditModal from "./MassiveEditModal";
import { toast } from "sonner";

export const DIFUSION_ESTADOS = [
  { value: "en_proceso", label: "En proceso" },
  { value: "listo", label: "Listo" },
  { value: "compartido", label: "Compartido" },
];

function estadoBadgeClass(estado) {
  switch (estado) {
    case "listo":
      return "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200";
    case "compartido":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200";
    case "en_proceso":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200";
    default:
      return "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400";
  }
}

function labelEstado(estado) {
  if (estado == null || estado === "") return null;
  return DIFUSION_ESTADOS.find((e) => e.value === estado)?.label ?? estado;
}

function locacionLabel(ev) {
  const n = ev.locaciones?.nombre?.trim() || "";
  const loc = ev.locaciones?.localidades?.localidad?.trim();
  if (n && loc) return `${n} (${loc})`;
  if (n) return n;
  if (loc) return loc;
  return "—";
}

/** Normaliza hora para comparar/guardar (HH:MM o null) */
function normalizeHoraVal(horaInicio) {
  if (horaInicio == null || horaInicio === "") return null;
  const s = String(horaInicio);
  return s.length >= 5 ? s.slice(0, 5) : s;
}

/** Fecha YYYY-MM-DD */
function normalizeFechaVal(fecha) {
  if (!fecha) return null;
  return String(fecha).slice(0, 10);
}

export function buildConciertoSnapshot(ev) {
  return {
    fecha_snapshot: normalizeFechaVal(ev.fecha),
    hora_snapshot: normalizeHoraVal(ev.hora_inicio),
    locacion_snapshot: locacionLabel(ev),
  };
}

const MESES_CORTO = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
];

/** Ej. 20/feb/2026 */
function formatFechaDifusionLinea(fechaIso) {
  if (!fechaIso) return "—";
  const d = new Date(`${String(fechaIso).slice(0, 10)}T12:00:00`);
  if (Number.isNaN(d.getTime())) return "—";
  const day = d.getDate();
  const m = MESES_CORTO[d.getMonth()];
  const y = d.getFullYear();
  return `${day}/${m}/${y}`;
}

/** Ej. Viernes */
function formatDiaSemanaLinea(fechaIso) {
  if (!fechaIso) return "";
  const d = new Date(`${String(fechaIso).slice(0, 10)}T12:00:00`);
  if (Number.isNaN(d.getTime())) return "";
  const w = d.toLocaleDateString("es-AR", { weekday: "long" });
  return w.charAt(0).toUpperCase() + w.slice(1);
}

function tooltipUltimoRegistro(lastLog) {
  if (!lastLog) return "";
  const f = lastLog.fecha_snapshot
    ? formatFechaDifusionLinea(lastLog.fecha_snapshot)
    : "—";
  const h = lastLog.hora_snapshot || "—";
  const l = lastLog.locacion_snapshot || "—";
  const est = labelEstado(lastLog.estado);
  const estPart = est ? ` · Estado: ${est}` : "";
  return `Último registro guardado: ${f} · ${h} · ${l}${estPart}`;
}

function SnapshotWarn({ warn, tooltip, children }) {
  if (!warn) return children;
  return (
    <span
      className="text-orange-600 dark:text-orange-400 font-medium cursor-help border-b border-dotted border-orange-400"
      title={tooltip}
    >
      {children}
    </span>
  );
}

function HistoryModal({ isOpen, onClose, logs, editorMap }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[105] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col border border-slate-100 dark:border-slate-700">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center shrink-0">
          <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <IconHistory size={18} />
            Historial de difusión
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            <IconX size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {!logs?.length ? (
            <p className="text-sm text-slate-500 text-center py-8">
              No hay registros previos.
            </p>
          ) : (
            logs.map((log) => {
              const ed = log.id_editor != null ? editorMap[log.id_editor] : null;
              return (
                <div
                  key={log.id}
                  className="p-3 rounded-lg border border-slate-100 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/50 text-sm"
                >
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${estadoBadgeClass(log.estado)}`}
                    >
                      {labelEstado(log.estado) ?? "—"}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {new Date(log.created_at).toLocaleString("es-AR", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  {(log.fecha_snapshot ||
                    log.hora_snapshot ||
                    log.locacion_snapshot) && (
                    <div className="text-[10px] text-slate-500 mb-1 space-y-0.5">
                      <p>
                        Concierto al guardar:{" "}
                        {log.fecha_snapshot
                          ? formatFechaDifusionLinea(log.fecha_snapshot)
                          : "—"}{" "}
                        · {log.hora_snapshot || "—"} ·{" "}
                        {log.locacion_snapshot || "—"}
                      </p>
                      {log.fecha_snapshot && (
                        <p className="text-slate-400">
                          {formatDiaSemanaLinea(log.fecha_snapshot)}
                        </p>
                      )}
                    </div>
                  )}
                  {log.observaciones ? (
                    <p className="text-slate-700 dark:text-slate-200 whitespace-pre-wrap">
                      {log.observaciones}
                    </p>
                  ) : (
                    <p className="text-slate-400 italic text-xs">Sin observaciones</p>
                  )}
                  <p className="text-[10px] text-slate-500 mt-2">
                    {ed
                      ? `${ed.nombre} ${ed.apellido}`
                      : log.id_editor
                        ? `Editor #${log.id_editor}`
                        : "—"}
                  </p>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Panel de seguimiento de difusión por concierto (eventos id_tipo_evento = 1).
 * @param {object} props
 * @param {import("@supabase/supabase-js").SupabaseClient} props.supabase
 * @param {object} props.user - integrante actual
 * @param {boolean} props.canEdit
 * @param {string|number|null} [props.idGiraFilter] - si está, solo eventos de esa gira/programa
 * @param {string|null} [props.programTipoFilter] - filtro por programas.tipo (vista general)
 * @param {string|null} [props.dateFrom]
 * @param {string|null} [props.dateTo]
 * @param {boolean} [props.showGiraShortcut] - botón a vista Difusión de la gira
 * @param {(giraId: string|number) => void} [props.onNavigateToGiraDifusion]
 */
export default function ConciertosDifusionPanel({
  supabase,
  user,
  canEdit,
  idGiraFilter = null,
  programTipoFilter = null,
  dateFrom = null,
  dateTo = null,
  showGiraShortcut = true,
  onNavigateToGiraDifusion,
}) {
  const [events, setEvents] = useState([]);
  const [logsByEvent, setLogsByEvent] = useState({});
  const [allLogsByEvent, setAllLogsByEvent] = useState({});
  const [editorMap, setEditorMap] = useState({});
  const [loading, setLoading] = useState(true);

  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState({ estado: "", observaciones: "" });
  const [savingId, setSavingId] = useState(null);
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false);

  const [selected, setSelected] = useState(new Set());
  const [massiveOpen, setMassiveOpen] = useState(false);

  const [historyEventId, setHistoryEventId] = useState(null);

  const latestFor = useCallback(
    (eventId) => {
      const list = logsByEvent[eventId];
      return list && list[0] ? list[0] : null;
    },
    [logsByEvent],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let programIdsFilter = null;
      if (programTipoFilter) {
        const { data: progs, error: pe } = await supabase
          .from("programas")
          .select("id")
          .eq("tipo", programTipoFilter);
        if (pe) throw pe;
        programIdsFilter = (progs || []).map((p) => p.id);
        if (programIdsFilter.length === 0) {
          setEvents([]);
          setLogsByEvent({});
          setAllLogsByEvent({});
          setLoading(false);
          return;
        }
      }

      let q = supabase
        .from("eventos")
        .select(
          `id, fecha, hora_inicio, is_deleted, id_gira, id_tipo_evento,
           locaciones ( id, nombre, localidades ( localidad ) ),
           programas ( id, nombre_gira, tipo, nomenclador, mes_letra )`,
        )
        .eq("id_tipo_evento", 1)
        .order("fecha", { ascending: true });

      if (idGiraFilter != null && idGiraFilter !== "")
        q = q.eq("id_gira", idGiraFilter);
      if (programIdsFilter) q = q.in("id_gira", programIdsFilter);
      if (dateFrom) q = q.gte("fecha", dateFrom);
      if (dateTo) q = q.lte("fecha", dateTo);

      const { data: evs, error: evErr } = await q;
      if (evErr) throw evErr;
      const list = evs || [];
      setEvents(list);

      const ids = list.map((e) => e.id);
      if (ids.length === 0) {
        setLogsByEvent({});
        setAllLogsByEvent({});
        return;
      }

      const { data: logs, error: logErr } = await supabase
        .from("conciertos_difusion_logs")
        .select(
          "id, id_evento, estado, observaciones, id_editor, created_at, fecha_snapshot, hora_snapshot, locacion_snapshot",
        )
        .in("id_evento", ids)
        .order("created_at", { ascending: false });

      if (logErr) throw logErr;

      const byEvent = {};
      const fullByEvent = {};
      for (const row of logs || []) {
        if (!fullByEvent[row.id_evento]) fullByEvent[row.id_evento] = [];
        fullByEvent[row.id_evento].push(row);
        if (!byEvent[row.id_evento]) byEvent[row.id_evento] = [];
        byEvent[row.id_evento].push(row);
      }
      setLogsByEvent(byEvent);
      setAllLogsByEvent(fullByEvent);

      const editorIds = [
        ...new Set((logs || []).map((l) => l.id_editor).filter(Boolean)),
      ];
      if (editorIds.length > 0) {
        const { data: ints } = await supabase
          .from("integrantes")
          .select("id, nombre, apellido")
          .in("id", editorIds);
        const m = {};
        (ints || []).forEach((i) => {
          m[i.id] = i;
        });
        setEditorMap((prev) => ({ ...prev, ...m }));
      }
    } catch (e) {
      console.error(e);
      toast.error(e.message || "Error al cargar difusión de conciertos");
    } finally {
      setLoading(false);
    }
  }, [
    supabase,
    idGiraFilter,
    programTipoFilter,
    dateFrom,
    dateTo,
  ]);

  useEffect(() => {
    load();
  }, [load]);

  const visibleIds = useMemo(() => events.map((e) => e.id), [events]);

  const toggleSelectAll = () => {
    if (selected.size === visibleIds.length && visibleIds.length > 0) {
      setSelected(new Set());
    } else {
      setSelected(new Set(visibleIds));
    }
  };

  const toggleOne = (id) => {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const startEdit = (ev) => {
    const last = latestFor(ev.id);
    setEditingId(ev.id);
    setDraft({
      estado: last?.estado ?? "",
      observaciones: last?.observaciones || "",
    });
  };

  const isDirty =
    editingId != null &&
    (() => {
      const ev = events.find((e) => e.id === editingId);
      if (!ev) return false;
      const last = latestFor(ev.id);
      const lastEstado = last?.estado ?? "";
      return (
        draft.estado !== lastEstado ||
        (draft.observaciones || "") !== (last?.observaciones || "")
      );
    })();

  const requestCloseEdit = () => {
    if (isDirty) setConfirmDiscardOpen(true);
    else {
      setEditingId(null);
      setDraft({ estado: "", observaciones: "" });
    }
  };

  const saveEdit = async (eventId) => {
    if (!user?.id) {
      toast.error("No se pudo determinar el editor.");
      return;
    }
    const ev = events.find((e) => e.id === eventId);
    const snap = ev ? buildConciertoSnapshot(ev) : {};
    setSavingId(eventId);
    try {
      const { error } = await supabase.from("conciertos_difusion_logs").insert({
        id_evento: eventId,
        estado: draft.estado || null,
        observaciones: draft.observaciones?.trim() || null,
        id_editor: user.id,
        ...snap,
      });
      if (error) throw error;
      toast.success("Estado guardado");
      setEditingId(null);
      setDraft({ estado: "", observaciones: "" });
      await load();
    } catch (e) {
      console.error(e);
      toast.error(e.message || "Error al guardar");
    } finally {
      setSavingId(null);
    }
  };

  const applyMassive = async ({ estado, observaciones }) => {
    if (!user?.id) {
      toast.error("No se pudo determinar el editor.");
      throw new Error("Sin usuario editor");
    }
    try {
      const rows = [...selected].map((id_evento) => {
        const ev = events.find((e) => e.id === id_evento);
        const snap = ev ? buildConciertoSnapshot(ev) : {};
        return {
          id_evento,
          estado: estado || null,
          observaciones,
          id_editor: user.id,
          ...snap,
        };
      });
      const { error } = await supabase
        .from("conciertos_difusion_logs")
        .insert(rows);
      if (error) throw error;
      toast.success(`Actualizados ${rows.length} concierto(s)`);
      setSelected(new Set());
      await load();
    } catch (e) {
      console.error(e);
      toast.error(e.message || "Error en edición masiva");
      throw e;
    }
  };

  const historyLogs = historyEventId
    ? allLogsByEvent[historyEventId] || []
    : [];

  return (
    <div className="space-y-4">
      {canEdit && selected.size > 0 && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setMassiveOpen(true)}
            className="text-xs font-bold px-3 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
          >
            Edición masiva ({selected.size})
          </button>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm">
        <table className="w-full text-sm min-w-[1000px]">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/80 text-left text-[10px] font-black uppercase tracking-wider text-slate-500">
              {canEdit && (
                <th className="p-2 w-9">
                  <input
                    type="checkbox"
                    checked={
                      visibleIds.length > 0 &&
                      selected.size === visibleIds.length
                    }
                    onChange={toggleSelectAll}
                    className="rounded border-slate-300"
                  />
                </th>
              )}
              <th className="p-2 w-[100px]">Fecha</th>
              <th className="p-2 w-[72px]">Hora</th>
              <th className="p-2 min-w-[140px]">Locación</th>
              <th className="p-2 min-w-[120px]">Programa</th>
              <th className="p-2 w-[110px]">Estado</th>
              <th className="p-2 min-w-[140px]">Observaciones</th>
              <th className="p-2 w-[120px] text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={canEdit ? 8 : 7}
                  className="p-12 text-center text-slate-400"
                >
                  <IconLoader className="animate-spin inline mr-2" size={18} />
                  Cargando…
                </td>
              </tr>
            ) : events.length === 0 ? (
              <tr>
                <td
                  colSpan={canEdit ? 8 : 7}
                  className="p-10 text-center text-slate-500"
                >
                  No hay conciertos con los filtros actuales.
                </td>
              </tr>
            ) : (
              events.map((ev) => {
                const last = latestFor(ev.id);
                const estado = last?.estado ?? null;
                const obs = last?.observaciones || "";
                const deleted = !!ev.is_deleted;
                const tituloPrograma =
                  ev.programas?.nombre_gira || `Programa #${ev.id_gira}`;
                const nomen = ev.programas?.nomenclador?.trim();
                const mesLetra = ev.programas?.mes_letra?.trim();
                const isEditing = editingId === ev.id;

                const curFecha = normalizeFechaVal(ev.fecha);
                const curHora = normalizeHoraVal(ev.hora_inicio);
                const curLoc = locacionLabel(ev);
                const snapTip = tooltipUltimoRegistro(last);
                const warnF =
                  last?.fecha_snapshot != null &&
                  curFecha !== normalizeFechaVal(last.fecha_snapshot);
                const warnH =
                  last?.hora_snapshot != null &&
                  (curHora || null) !==
                    normalizeHoraVal(last.hora_snapshot);
                const warnL =
                  last?.locacion_snapshot != null &&
                  curLoc !== (last.locacion_snapshot || "");

                const strikeCls = deleted ? "opacity-50 line-through" : "";
                return (
                  <tr
                    key={ev.id}
                    className="border-t border-slate-100 dark:border-slate-800"
                  >
                    {canEdit && (
                      <td className={`p-2 align-top ${deleted ? "opacity-50" : ""}`}>
                        <input
                          type="checkbox"
                          checked={selected.has(ev.id)}
                          onChange={() => toggleOne(ev.id)}
                          disabled={isEditing}
                          className="rounded border-slate-300"
                        />
                      </td>
                    )}
                    <td className={`p-2 align-top text-xs ${strikeCls}`}>
                      <SnapshotWarn warn={warnF} tooltip={snapTip}>
                        <div className="leading-tight">
                          <div className="font-medium">
                            {ev.fecha
                              ? formatFechaDifusionLinea(ev.fecha)
                              : "—"}
                          </div>
                          {ev.fecha && (
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 font-normal">
                              {formatDiaSemanaLinea(ev.fecha)}
                            </div>
                          )}
                        </div>
                      </SnapshotWarn>
                    </td>
                    <td className={`p-2 align-top text-xs whitespace-nowrap ${strikeCls}`}>
                      <SnapshotWarn warn={warnH} tooltip={snapTip}>
                        {curHora || "—"}
                      </SnapshotWarn>
                    </td>
                    <td className={`p-2 align-top text-xs break-words ${strikeCls}`}>
                      <SnapshotWarn warn={warnL} tooltip={snapTip}>
                        {curLoc}
                      </SnapshotWarn>
                    </td>
                    <td className={`p-2 align-top text-xs ${strikeCls}`}>
                      <div className="font-semibold text-slate-800 dark:text-slate-100 leading-snug">
                        {tituloPrograma}
                      </div>
                      {(nomen || mesLetra) && (
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 font-normal mt-0.5 leading-snug">
                          {nomen && <span>{nomen}</span>}
                          {nomen && mesLetra && <span> · </span>}
                          {mesLetra && <span>{mesLetra}</span>}
                        </div>
                      )}
                    </td>
                    <td className={`p-2 align-top ${strikeCls}`}>
                      {isEditing ? (
                        <select
                          className="text-xs p-1.5 border border-slate-200 rounded-lg bg-white dark:bg-slate-800 w-full max-w-[130px]"
                          value={draft.estado}
                          onChange={(e) =>
                            setDraft((d) => ({ ...d, estado: e.target.value }))
                          }
                        >
                          <option value="">—</option>
                          {DIFUSION_ESTADOS.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      ) : labelEstado(estado) ? (
                        <span
                          className={`inline-flex text-[10px] font-bold uppercase px-2 py-1 rounded-full ${estadoBadgeClass(estado)}`}
                        >
                          {labelEstado(estado)}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-sm font-medium">—</span>
                      )}
                    </td>
                    <td className={`p-2 align-top max-w-[220px] ${strikeCls}`}>
                      {isEditing ? (
                        <textarea
                          className="w-full text-xs p-2 border border-slate-200 rounded-lg bg-white dark:bg-slate-800 min-h-[56px]"
                          value={draft.observaciones}
                          onChange={(e) =>
                            setDraft((d) => ({
                              ...d,
                              observaciones: e.target.value,
                            }))
                          }
                          placeholder="Observaciones…"
                        />
                      ) : (
                        <span className="text-slate-600 dark:text-slate-300 whitespace-pre-wrap break-words">
                          {obs || (
                            <span className="text-slate-400 italic">—</span>
                          )}
                        </span>
                      )}
                    </td>
                    <td className={`p-2 align-top text-right ${deleted ? "opacity-50" : ""}`}>
                      <div className="flex flex-wrap justify-end gap-0.5">
                        <button
                          type="button"
                          onClick={() => setHistoryEventId(ev.id)}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 rounded"
                          title="Ver historial"
                        >
                          <IconHistory size={16} />
                        </button>
                        {canEdit &&
                          (isEditing ? (
                            <>
                              <button
                                type="button"
                                onClick={() => saveEdit(ev.id)}
                                disabled={savingId === ev.id}
                                className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                                title="Guardar"
                              >
                                {savingId === ev.id ? (
                                  <IconLoader className="animate-spin" size={16} />
                                ) : (
                                  <IconCheck size={16} />
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={requestCloseEdit}
                                className="p-1.5 text-slate-400 hover:text-rose-600 rounded"
                                title="Cancelar"
                              >
                                <IconX size={16} />
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => startEdit(ev)}
                              className="p-1.5 text-slate-500 hover:text-indigo-600 rounded"
                              title="Editar"
                            >
                              <IconEdit size={16} />
                            </button>
                          ))}
                        {showGiraShortcut &&
                          onNavigateToGiraDifusion &&
                          ev.id_gira && (
                            <button
                              type="button"
                              onClick={() =>
                                onNavigateToGiraDifusion(ev.id_gira)
                              }
                              className="p-1.5 text-slate-500 hover:text-indigo-600 rounded"
                              title="Abrir difusión de la gira"
                            >
                              <IconArrowRight size={16} />
                            </button>
                          )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <ConfirmModal
        isOpen={confirmDiscardOpen}
        onClose={() => setConfirmDiscardOpen(false)}
        onConfirm={() => {
          setEditingId(null);
          setDraft({ estado: "", observaciones: "" });
        }}
        title="¿Descartar cambios?"
        message="Tenés cambios sin guardar en este concierto."
        confirmText="Descartar"
        cancelText="Seguir editando"
      />

      <HistoryModal
        isOpen={historyEventId != null}
        onClose={() => setHistoryEventId(null)}
        logs={historyLogs}
        editorMap={editorMap}
      />

      <MassiveEditModal
        isOpen={massiveOpen}
        onClose={() => setMassiveOpen(false)}
        count={selected.size}
        onApply={applyMassive}
      />
    </div>
  );
}
