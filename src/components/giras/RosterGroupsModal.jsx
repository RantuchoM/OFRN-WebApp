import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import {
  IconCheck,
  IconChevronDown,
  IconChevronUp,
  IconLoader,
  IconPlus,
  IconTrash,
  IconX,
  IconUsers,
} from "../ui/Icons";
import {
  GIRA_GRUPO_DEFAULT_COLORS,
  createGiraGrupo,
  deleteGiraGrupo,
  fetchEventosByGiraGrupo,
  fetchGiraGrupos,
  setGiraGrupoMembers,
  softDeleteEventos,
  updateGiraGrupo,
} from "../../services/giraGruposService";
import { integranteKey } from "../../utils/integranteIds";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

function getMemberNombre(m) {
  return `${m.apellido || ""}, ${m.nombre || ""}`.trim();
}

function getMemberInstrumento(m) {
  return m.instrumentos?.instrumento || m.id_instr || "-";
}

function getMemberLocalidad(m) {
  return (
    m._loc_residencia?.localidad ||
    m.residencia?.localidad ||
    m.localidades_residencia?.localidad ||
    "-"
  );
}

function getMemberEnsambles(m) {
  const names = (m.integrantes_ensambles || [])
    .map((ie) => ie.ensambles?.ensamble)
    .filter(Boolean);
  if (names.length === 0 && Array.isArray(m.ensambles)) {
    return m.ensambles.map((e) => e.ensamble || e).filter(Boolean).join(", ") || "-";
  }
  return names.length > 0 ? names.join(", ") : "-";
}

const MEMBER_COLUMNS = [
  { key: "nombre", label: "Nombre", getValue: getMemberNombre },
  { key: "instrumento", label: "Instrumento", getValue: getMemberInstrumento },
  { key: "localidad", label: "Localidad", getValue: getMemberLocalidad },
  { key: "ensambles", label: "Ensamble/s", getValue: getMemberEnsambles },
];

/**
 * Modal portal: CRUD de grupos de convocatoria de una gira + checklist de miembros.
 */
export default function RosterGroupsModal({
  isOpen,
  onClose,
  supabase,
  giraId,
  roster = [],
  onChanged,
}) {
  const [grupos, setGrupos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedGrupoId, setSelectedGrupoId] = useState(null);
  const [newNombre, setNewNombre] = useState("");
  const [editNombre, setEditNombre] = useState("");
  const [editColor, setEditColor] = useState(GIRA_GRUPO_DEFAULT_COLORS[0]);
  const [memberIds, setMemberIds] = useState(() => new Set());
  /** Snapshot de seleccionados para fijar arriba; se actualiza al cargar/cambiar grupo o al reordenar, no al tildar. */
  const [pinnedSelectedIds, setPinnedSelectedIds] = useState(() => new Set());
  const [columnFilters, setColumnFilters] = useState({
    nombre: "",
    instrumento: "",
    localidad: "",
    ensambles: "",
  });
  const [sortBy, setSortBy] = useState("nombre");
  const [sortDir, setSortDir] = useState("asc");
  /** Índice en el listado visible; ancla para Shift+click. */
  const lastClickedVisibleIndexRef = useRef(null);
  /** Shift sostenido (keydown/keyup): más fiable que event.shiftKey en el 2º handler. */
  const shiftKeyHeldRef = useRef(false);
  /** IDs del listado visible en orden de pantalla (evita closure stale en el rango). */
  const visibleMemberIdsRef = useRef([]);
  /** null | { loading, eventos, error } — panel de confirmación al eliminar grupo */
  const [deletePanel, setDeletePanel] = useState(null);

  const syncMembersFromGrupo = (g) => {
    const ids = new Set(
      (g?.giras_grupos_integrantes || []).map((r) => String(r.id_integrante)),
    );
    setMemberIds(ids);
    setPinnedSelectedIds(new Set(ids));
  };

  const confirmados = useMemo(
    () =>
      (roster || []).filter(
        (m) =>
          !m.es_simulacion &&
          (m.estado_gira || "").toLowerCase() !== "ausente",
      ),
    [roster],
  );

  const filteredSortedConfirmados = useMemo(() => {
    const filters = Object.fromEntries(
      Object.entries(columnFilters).map(([k, v]) => [
        k,
        String(v || "").trim().toLowerCase(),
      ]),
    );
    let rows = confirmados.filter((m) =>
      MEMBER_COLUMNS.every((col) => {
        const q = filters[col.key];
        if (!q) return true;
        return String(col.getValue(m) || "")
          .toLowerCase()
          .includes(q);
      }),
    );
    const col =
      MEMBER_COLUMNS.find((c) => c.key === sortBy) || MEMBER_COLUMNS[0];
    rows = [...rows].sort((a, b) => {
      const aPinned = pinnedSelectedIds.has(String(a.id)) ? 0 : 1;
      const bPinned = pinnedSelectedIds.has(String(b.id)) ? 0 : 1;
      if (aPinned !== bPinned) return aPinned - bPinned;
      const av = String(col.getValue(a) || "").toLowerCase();
      const bv = String(col.getValue(b) || "").toLowerCase();
      const cmp = av.localeCompare(bv, "es", { sensitivity: "base" });
      return sortDir === "asc" ? cmp : -cmp;
    });
    return rows;
  }, [confirmados, columnFilters, sortBy, sortDir, pinnedSelectedIds]);

  const visibleRowIdsKey = useMemo(
    () => filteredSortedConfirmados.map((m) => String(m.id)).join(","),
    [filteredSortedConfirmados],
  );

  visibleMemberIdsRef.current = filteredSortedConfirmados.map((m) =>
    String(m.id),
  );

  useEffect(() => {
    lastClickedVisibleIndexRef.current = null;
  }, [isOpen, selectedGrupoId, visibleRowIdsKey]);

  useEffect(() => {
    if (!isOpen) {
      shiftKeyHeldRef.current = false;
      return;
    }
    const onKeyDown = (e) => {
      if (e.key === "Shift") shiftKeyHeldRef.current = true;
    };
    const onKeyUp = (e) => {
      if (e.key === "Shift") shiftKeyHeldRef.current = false;
    };
    const clearShift = () => {
      shiftKeyHeldRef.current = false;
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") shiftKeyHeldRef.current = false;
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", clearShift);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", clearShift);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [isOpen]);

  const selectedGrupo = useMemo(
    () => grupos.find((g) => Number(g.id) === Number(selectedGrupoId)) || null,
    [grupos, selectedGrupoId],
  );

  const load = async () => {
    if (!supabase || !giraId) return;
    setLoading(true);
    const { grupos: data, error } = await fetchGiraGrupos(supabase, giraId);
    setLoading(false);
    if (error) {
      toast.error("Error cargando grupos: " + error.message);
      return;
    }
    setGrupos(data);
    if (data.length > 0) {
      const still =
        selectedGrupoId &&
        data.some((g) => Number(g.id) === Number(selectedGrupoId));
      const nextId = still ? selectedGrupoId : data[0].id;
      setSelectedGrupoId(nextId);
      const g = data.find((x) => Number(x.id) === Number(nextId));
      if (g) {
        setEditNombre(g.nombre || "");
        setEditColor(g.color || GIRA_GRUPO_DEFAULT_COLORS[0]);
        syncMembersFromGrupo(g);
      }
    } else {
      setSelectedGrupoId(null);
      setEditNombre("");
      setMemberIds(new Set());
      setPinnedSelectedIds(new Set());
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, giraId]);

  useEffect(() => {
    if (!selectedGrupo) return;
    setEditNombre(selectedGrupo.nombre || "");
    setEditColor(selectedGrupo.color || GIRA_GRUPO_DEFAULT_COLORS[0]);
    syncMembersFromGrupo(selectedGrupo);
    setDeletePanel(null);
  }, [selectedGrupoId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isOpen) return null;

  const notifyChanged = async () => {
    await load();
    onChanged?.();
  };

  const handleCreate = async () => {
    const nombre = newNombre.trim();
    if (!nombre) {
      toast.error("Ingresá un nombre de grupo");
      return;
    }
    setSaving(true);
    const color =
      GIRA_GRUPO_DEFAULT_COLORS[grupos.length % GIRA_GRUPO_DEFAULT_COLORS.length];
    const { data, error } = await createGiraGrupo(supabase, {
      idGira: giraId,
      nombre,
      color,
      orden: grupos.length,
    });
    setSaving(false);
    if (error) {
      toast.error("No se pudo crear: " + error.message);
      return;
    }
    setNewNombre("");
    toast.success("Grupo creado");
    setSelectedGrupoId(data.id);
    await notifyChanged();
  };

  const handleSaveMeta = async () => {
    if (!selectedGrupo) return;
    const nombre = editNombre.trim();
    if (!nombre) {
      toast.error("El nombre no puede estar vacío");
      return;
    }
    setSaving(true);
    const { error } = await updateGiraGrupo(supabase, selectedGrupo.id, {
      nombre,
      color: editColor,
    });
    setSaving(false);
    if (error) {
      toast.error("Error al guardar: " + error.message);
      return;
    }
    toast.success("Grupo actualizado");
    await notifyChanged();
  };

  const handleSaveMembers = async () => {
    if (!selectedGrupo) return;
    setSaving(true);
    const ids = [...memberIds]
      .map(Number)
      .filter((id) => confirmados.some((m) => Number(m.id) === id));
    const { error } = await setGiraGrupoMembers(
      supabase,
      selectedGrupo.id,
      ids,
    );
    setSaving(false);
    if (error) {
      toast.error("Error al guardar miembros: " + error.message);
      return;
    }
    toast.success("Miembros actualizados");
    await notifyChanged();
  };

  const handleDelete = async () => {
    if (!selectedGrupo) return;
    setDeletePanel({ loading: true, eventos: [], error: null });
    const { eventos, error } = await fetchEventosByGiraGrupo(
      supabase,
      selectedGrupo.id,
    );
    if (error) {
      setDeletePanel(null);
      toast.error("No se pudieron cargar eventos del grupo: " + error.message);
      return;
    }
    setDeletePanel({ loading: false, eventos, error: null });
  };

  const cancelDeletePanel = () => setDeletePanel(null);

  const finishDeleteGrupo = async ({ deleteEvents }) => {
    if (!selectedGrupo) return;
    setSaving(true);
    try {
      if (deleteEvents && deletePanel?.eventos?.length > 0) {
        const { error: evErr } = await softDeleteEventos(
          supabase,
          deletePanel.eventos.map((e) => e.id),
        );
        if (evErr) throw evErr;
      }
      const { error } = await deleteGiraGrupo(supabase, selectedGrupo.id);
      if (error) throw error;
      toast.success(
        deleteEvents && deletePanel?.eventos?.length > 0
          ? `Grupo eliminado y ${deletePanel.eventos.length} evento(s) a la papelera`
          : "Grupo eliminado (eventos conservados, desasociados)",
      );
      setDeletePanel(null);
      setSelectedGrupoId(null);
      await notifyChanged();
    } catch (err) {
      toast.error("Error al eliminar: " + (err.message || err));
    } finally {
      setSaving(false);
    }
  };

  const toggleMember = (id) => {
    const key = String(id);
    setMemberIds((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const isShiftHeld = (event) => {
    if (shiftKeyHeldRef.current) return true;
    if (!event) return false;
    if (event.shiftKey) return true;
    if (
      typeof event.getModifierState === "function" &&
      event.getModifierState("Shift")
    ) {
      return true;
    }
    const ne = event.nativeEvent;
    if (!ne) return false;
    if (ne.shiftKey) return true;
    return (
      typeof ne.getModifierState === "function" && ne.getModifierState("Shift")
    );
  };

  /**
   * Un solo camino por interacción: checkbox → onChange; fila → onClick.
   * Shift+click marca el rango inclusivo (ancla + destino + intermedios).
   */
  const handleVisibleMemberClick = (event, visibleIndex, id) => {
    const ids = visibleMemberIdsRef.current;
    const shiftHeld = isShiftHeld(event);

    if (
      shiftHeld &&
      lastClickedVisibleIndexRef.current != null &&
      ids.length > 0
    ) {
      const from = Math.min(lastClickedVisibleIndexRef.current, visibleIndex);
      const to = Math.max(lastClickedVisibleIndexRef.current, visibleIndex);
      setMemberIds((prev) => {
        const next = new Set(prev);
        for (let i = from; i <= to; i++) {
          const rowId = ids[i];
          if (rowId) next.add(rowId);
        }
        // Refuerzo de extremos por id (por si el índice y el id divergen).
        if (id != null) next.add(String(id));
        const anchorId = ids[lastClickedVisibleIndexRef.current];
        if (anchorId) next.add(anchorId);
        return next;
      });
      return;
    }

    toggleMember(id);
    lastClickedVisibleIndexRef.current = visibleIndex;
  };

  const selectAllFiltered = () => {
    lastClickedVisibleIndexRef.current = null;
    setMemberIds((prev) => {
      const next = new Set(prev);
      filteredSortedConfirmados.forEach((m) => next.add(String(m.id)));
      return next;
    });
  };

  const clearAll = () => {
    lastClickedVisibleIndexRef.current = null;
    setMemberIds(new Set());
  };

  const toggleSort = (key) => {
    setPinnedSelectedIds(new Set(memberIds));
    if (sortBy === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(key);
      setSortDir("asc");
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-[100]"
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:max-w-5xl h-[92vh] sm:h-auto sm:max-h-[90vh] rounded-t-2xl sm:rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom sm:zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
          <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
            <IconUsers size={16} />
            Grupos de convocatoria
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-700"
          >
            <IconX size={18} />
          </button>
        </div>

        <div className="flex-1 min-h-0 flex flex-col md:grid md:grid-cols-[200px_1fr] overflow-y-auto md:overflow-hidden">
          <aside className="border-b md:border-b-0 md:border-r border-slate-100 p-3 space-y-3 md:overflow-y-auto bg-slate-50/50 shrink-0 md:min-h-0">
            <div className="flex gap-1">
              <input
                type="text"
                value={newNombre}
                onChange={(e) => setNewNombre(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreate();
                }}
                placeholder="Nuevo grupo..."
                className="flex-1 min-w-0 text-xs border border-slate-200 rounded-lg px-2 py-1.5"
              />
              <button
                type="button"
                onClick={handleCreate}
                disabled={saving}
                className="shrink-0 px-2 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 disabled:opacity-50"
                title="Crear grupo"
              >
                <IconPlus size={14} />
              </button>
            </div>
            {loading ? (
              <div className="flex justify-center py-6 text-slate-400">
                <IconLoader className="animate-spin" size={18} />
              </div>
            ) : grupos.length === 0 ? (
              <p className="text-[11px] text-slate-400 italic px-1">
                Esta gira aún no tiene grupos. Son opcionales.
              </p>
            ) : (
              <ul className="space-y-1">
                {grupos.map((g) => {
                  const active = Number(g.id) === Number(selectedGrupoId);
                  const count = (g.giras_grupos_integrantes || []).length;
                  return (
                    <li key={g.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedGrupoId(g.id)}
                        className={`w-full text-left px-2 py-1.5 rounded-lg text-xs flex items-center gap-2 border transition-colors ${
                          active
                            ? "bg-white border-indigo-200 shadow-sm font-bold text-indigo-800"
                            : "border-transparent hover:bg-white text-slate-700"
                        }`}
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{
                            backgroundColor:
                              g.color || GIRA_GRUPO_DEFAULT_COLORS[0],
                          }}
                        />
                        <span className="truncate flex-1">{g.nombre}</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {count}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </aside>

          <section className="p-4 overflow-y-auto min-h-0 flex flex-col gap-4">
            {!selectedGrupo ? (
              <p className="text-sm text-slate-400 italic">
                Seleccioná o creá un grupo para editarlo.
              </p>
            ) : (
              <>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-slate-500">
                    Nombre
                  </label>
                  <div className="flex flex-wrap gap-2 items-center">
                    <input
                      type="text"
                      value={editNombre}
                      onChange={(e) => setEditNombre(e.target.value)}
                      className="flex-1 min-w-[10rem] text-sm border border-slate-200 rounded-lg px-3 py-2"
                    />
                    <div className="flex gap-1 flex-wrap">
                      {GIRA_GRUPO_DEFAULT_COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setEditColor(c)}
                          className={`w-6 h-6 rounded-full border-2 ${
                            editColor === c
                              ? "border-slate-800 scale-110"
                              : "border-white shadow"
                          }`}
                          style={{ backgroundColor: c }}
                          title={c}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={handleSaveMeta}
                      disabled={saving || !!deletePanel}
                      className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1"
                    >
                      {saving ? (
                        <IconLoader size={12} className="animate-spin" />
                      ) : (
                        <IconCheck size={12} />
                      )}
                      Guardar nombre/color
                    </button>
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={saving || !!deletePanel}
                      className="px-3 py-1.5 border border-red-200 text-red-600 rounded-lg text-xs font-bold hover:bg-red-50 disabled:opacity-50 flex items-center gap-1"
                    >
                      <IconTrash size={12} />
                      Eliminar grupo
                    </button>
                  </div>
                </div>

                {deletePanel && (
                  <div className="border border-amber-200 bg-amber-50/80 rounded-lg p-3 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-bold text-amber-900">
                          ¿Eliminar el grupo “{selectedGrupo.nombre}”?
                        </p>
                        <p className="text-[11px] text-amber-800/80 mt-0.5">
                          Al borrar el grupo se desasocian sus vínculos. Elegí qué
                          hacer con los eventos asignados.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={cancelDeletePanel}
                        disabled={saving}
                        className="p-1 rounded text-amber-700/70 hover:bg-amber-100"
                        aria-label="Cancelar"
                      >
                        <IconX size={14} />
                      </button>
                    </div>

                    {deletePanel.loading ? (
                      <div className="flex items-center gap-2 text-xs text-amber-800 py-2">
                        <IconLoader size={14} className="animate-spin" />
                        Buscando eventos asociados…
                      </div>
                    ) : deletePanel.eventos.length === 0 ? (
                      <p className="text-xs text-slate-600 italic">
                        Este grupo no tiene eventos asociados.
                      </p>
                    ) : (
                      <div className="space-y-1.5">
                        <p className="text-[10px] font-bold uppercase text-amber-900/70">
                          {deletePanel.eventos.length} evento
                          {deletePanel.eventos.length === 1 ? "" : "s"} asociado
                          {deletePanel.eventos.length === 1 ? "" : "s"}
                        </p>
                        <ul className="max-h-40 overflow-y-auto border border-amber-200/80 rounded-md bg-white divide-y divide-slate-100">
                          {deletePanel.eventos.map((ev) => {
                            let fechaLabel = ev.fecha || "";
                            try {
                              if (ev.fecha) {
                                fechaLabel = format(
                                  parseISO(ev.fecha),
                                  "EEE d MMM",
                                  { locale: es },
                                );
                              }
                            } catch {
                              /* keep raw */
                            }
                            const hora = (ev.hora_inicio || "").slice(0, 5);
                            const tipo = ev.tipos_evento?.nombre || "Evento";
                            const desc = (ev.descripcion || "")
                              .replace(/<[^>]+>/g, "")
                              .trim();
                            return (
                              <li
                                key={ev.id}
                                className="px-2.5 py-1.5 text-[11px] text-slate-700"
                              >
                                <span className="font-semibold text-slate-800">
                                  {fechaLabel}
                                  {hora ? ` · ${hora}` : ""}
                                </span>
                                <span className="text-slate-400"> · </span>
                                <span>{tipo}</span>
                                {desc ? (
                                  <span className="block truncate text-slate-500">
                                    {desc}
                                  </span>
                                ) : null}
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row flex-wrap gap-2 pt-1">
                      <button
                        type="button"
                        onClick={cancelDeletePanel}
                        disabled={saving || deletePanel.loading}
                        className="px-3 py-1.5 text-xs font-bold text-slate-600 border border-slate-200 rounded-lg hover:bg-white disabled:opacity-50"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          finishDeleteGrupo({ deleteEvents: false })
                        }
                        disabled={saving || deletePanel.loading}
                        className="px-3 py-1.5 text-xs font-bold text-indigo-700 bg-white border border-indigo-200 rounded-lg hover:bg-indigo-50 disabled:opacity-50"
                      >
                        {deletePanel.eventos.length > 0
                          ? "Conservar eventos (desasociar)"
                          : "Eliminar grupo"}
                      </button>
                      {deletePanel.eventos.length > 0 && (
                        <button
                          type="button"
                          onClick={() =>
                            finishDeleteGrupo({ deleteEvents: true })
                          }
                          disabled={saving || deletePanel.loading}
                          className="px-3 py-1.5 text-xs font-bold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-1"
                        >
                          {saving ? (
                            <IconLoader size={12} className="animate-spin" />
                          ) : (
                            <IconTrash size={12} />
                          )}
                          Eliminar también los eventos
                        </button>
                      )}
                    </div>
                  </div>
                )}

                <div className="border-t border-slate-100 pt-3 space-y-2 flex-1 min-h-0 flex flex-col">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="text-[10px] font-bold uppercase text-slate-500">
                      Miembros ({memberIds.size}) — {filteredSortedConfirmados.length}{" "}
                      visibles / solo confirmados
                    </label>
                    <div className="flex gap-2 text-[10px]">
                      <button
                        type="button"
                        onClick={selectAllFiltered}
                        className="font-bold text-indigo-600 hover:underline"
                      >
                        Marcar filtrados
                      </button>
                      <button
                        type="button"
                        onClick={clearAll}
                        className="font-bold text-slate-500 hover:underline"
                      >
                        Limpiar
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 min-h-[220px] max-h-[420px] overflow-auto border border-slate-100 rounded-lg">
                    <table className="w-full min-w-[640px] text-left border-collapse">
                      <thead className="sticky top-0 z-10 bg-slate-50">
                        <tr className="border-b border-slate-200">
                          <th className="w-8 px-2 py-1.5" />
                          {MEMBER_COLUMNS.map((col) => (
                            <th
                              key={`filter-${col.key}`}
                              className="px-1.5 py-1.5"
                            >
                              <input
                                type="search"
                                value={columnFilters[col.key]}
                                onChange={(e) =>
                                  setColumnFilters((prev) => ({
                                    ...prev,
                                    [col.key]: e.target.value,
                                  }))
                                }
                                placeholder={`Filtrar ${col.label.toLowerCase()}…`}
                                className="w-full text-[10px] border border-slate-200 rounded px-1.5 py-1 bg-white"
                              />
                            </th>
                          ))}
                        </tr>
                        <tr className="border-b border-slate-200 text-[10px] uppercase tracking-wide text-slate-500">
                          <th className="w-8 px-2 py-1.5" />
                          {MEMBER_COLUMNS.map((col) => {
                            const active = sortBy === col.key;
                            return (
                              <th key={`sort-${col.key}`} className="px-1.5 py-1">
                                <button
                                  type="button"
                                  onClick={() => toggleSort(col.key)}
                                  className={`inline-flex items-center gap-0.5 font-bold hover:text-indigo-700 ${
                                    active ? "text-indigo-700" : ""
                                  }`}
                                >
                                  {col.label}
                                  {active ? (
                                    sortDir === "asc" ? (
                                      <IconChevronUp size={12} />
                                    ) : (
                                      <IconChevronDown size={12} />
                                    )
                                  ) : (
                                    <IconChevronDown
                                      size={12}
                                      className="opacity-30"
                                    />
                                  )}
                                </button>
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody className="select-none">
                        {filteredSortedConfirmados.length === 0 ? (
                          <tr>
                            <td
                              colSpan={5}
                              className="p-3 text-xs text-slate-400 italic"
                            >
                              No hay integrantes confirmados para asignar.
                            </td>
                          </tr>
                        ) : (
                          filteredSortedConfirmados.map((m, visibleIndex) => {
                            const key = integranteKey(m.id);
                            const checked = memberIds.has(key);
                            return (
                              <tr
                                key={key}
                                onClick={(e) => {
                                  if (e.target.closest("input, button, a")) return;
                                  handleVisibleMemberClick(e, visibleIndex, m.id);
                                }}
                                className={`border-b border-slate-50 hover:bg-slate-50/80 text-xs cursor-pointer ${
                                  checked ? "bg-indigo-50/40" : ""
                                }`}
                              >
                                <td className="px-2 py-1.5 align-middle">
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onClick={(e) => e.stopPropagation()}
                                    onChange={(e) => {
                                      handleVisibleMemberClick(
                                        e,
                                        visibleIndex,
                                        m.id,
                                      );
                                    }}
                                    className="rounded text-indigo-600 cursor-pointer"
                                  />
                                </td>
                                <td className="px-1.5 py-1.5 font-medium text-slate-700 max-w-[12rem] truncate">
                                  {getMemberNombre(m)}
                                </td>
                                <td className="px-1.5 py-1.5 text-slate-600 max-w-[8rem] truncate">
                                  {getMemberInstrumento(m)}
                                </td>
                                <td className="px-1.5 py-1.5 text-slate-600 max-w-[8rem] truncate">
                                  {getMemberLocalidad(m)}
                                </td>
                                <td className="px-1.5 py-1.5 text-slate-600 max-w-[12rem] truncate">
                                  {getMemberEnsambles(m)}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                  <button
                    type="button"
                    onClick={handleSaveMembers}
                    disabled={saving}
                    className="self-start px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-1"
                  >
                    {saving ? (
                      <IconLoader size={12} className="animate-spin" />
                    ) : (
                      <IconCheck size={12} />
                    )}
                    Guardar miembros
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </div>,
    document.body,
  );
}
