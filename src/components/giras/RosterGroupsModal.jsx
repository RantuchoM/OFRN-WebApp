import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import {
  IconCheck,
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
  fetchGiraGrupos,
  setGiraGrupoMembers,
  updateGiraGrupo,
} from "../../services/giraGruposService";
import { integranteKey } from "../../utils/integranteIds";

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
  const [memberSearch, setMemberSearch] = useState("");

  const confirmados = useMemo(
    () =>
      (roster || []).filter(
        (m) =>
          !m.es_simulacion &&
          (m.estado_gira || "").toLowerCase() !== "ausente",
      ),
    [roster],
  );

  const filteredConfirmados = useMemo(() => {
    const q = memberSearch.trim().toLowerCase();
    if (!q) return confirmados;
    return confirmados.filter((m) => {
      const name = `${m.apellido || ""} ${m.nombre || ""}`.toLowerCase();
      return name.includes(q);
    });
  }, [confirmados, memberSearch]);

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
        setMemberIds(
          new Set(
            (g.giras_grupos_integrantes || []).map((r) =>
              String(r.id_integrante),
            ),
          ),
        );
      }
    } else {
      setSelectedGrupoId(null);
      setEditNombre("");
      setMemberIds(new Set());
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
    setMemberIds(
      new Set(
        (selectedGrupo.giras_grupos_integrantes || []).map((r) =>
          String(r.id_integrante),
        ),
      ),
    );
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
    if (
      !window.confirm(
        `¿Eliminar el grupo "${selectedGrupo.nombre}"? Se quitará de los eventos asignados.`,
      )
    ) {
      return;
    }
    setSaving(true);
    const { error } = await deleteGiraGrupo(supabase, selectedGrupo.id);
    setSaving(false);
    if (error) {
      toast.error("Error al eliminar: " + error.message);
      return;
    }
    toast.success("Grupo eliminado");
    setSelectedGrupoId(null);
    await notifyChanged();
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

  const selectAllFiltered = () => {
    setMemberIds((prev) => {
      const next = new Set(prev);
      filteredConfirmados.forEach((m) => next.add(String(m.id)));
      return next;
    });
  };

  const clearAll = () => setMemberIds(new Set());

  return createPortal(
    <div
      className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 z-[100]"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-3xl max-h-[90vh] rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95"
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

        <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-[220px_1fr] overflow-hidden">
          <aside className="border-b md:border-b-0 md:border-r border-slate-100 p-3 space-y-3 overflow-y-auto bg-slate-50/50">
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
                      disabled={saving}
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
                      disabled={saving}
                      className="px-3 py-1.5 border border-red-200 text-red-600 rounded-lg text-xs font-bold hover:bg-red-50 disabled:opacity-50 flex items-center gap-1"
                    >
                      <IconTrash size={12} />
                      Eliminar grupo
                    </button>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-3 space-y-2 flex-1 min-h-0 flex flex-col">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="text-[10px] font-bold uppercase text-slate-500">
                      Miembros ({memberIds.size}) — solo confirmados
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
                  <input
                    type="search"
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    placeholder="Buscar integrante..."
                    className="w-full text-xs border border-slate-200 rounded-lg px-3 py-1.5"
                  />
                  <div className="flex-1 min-h-[180px] max-h-[320px] overflow-y-auto border border-slate-100 rounded-lg divide-y divide-slate-50">
                    {filteredConfirmados.length === 0 ? (
                      <p className="p-3 text-xs text-slate-400 italic">
                        No hay integrantes confirmados para asignar.
                      </p>
                    ) : (
                      filteredConfirmados.map((m) => {
                        const key = String(m.id);
                        const checked = memberIds.has(key);
                        return (
                          <label
                            key={integranteKey(m)}
                            className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 cursor-pointer text-xs"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleMember(m.id)}
                              className="rounded text-indigo-600"
                            />
                            <span className="font-medium text-slate-700 truncate">
                              {m.apellido}, {m.nombre}
                            </span>
                          </label>
                        );
                      })
                    )}
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
