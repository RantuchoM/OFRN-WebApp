import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { IconLoader, IconPlus, IconTrash, IconX } from "../ui/Icons";
import {
  CANONICAL_MEAL_TYPE_IDS,
  MEAL_CATEGORY_ID,
  MEAL_SERVICES,
  defaultMealTypeColor,
  fetchMealEventTypes,
  formatMealServiceLabel,
  getMealServiceStyle,
  isCanonicalMealTypeId,
  mealBaseFromTypeName,
} from "../../utils/mealLogistics";
import { useConfirmDialog } from "../../hooks/useConfirmDialog";

/**
 * Modal de catálogo de tipos de comida (categoria 4).
 * Crea nombres reales "{base} {detalle}" y permite renombrar (no canónicos).
 */
export default function MealTypesEditorModal({
  supabase,
  open,
  onClose,
  onChanged,
}) {
  const { confirm, dialog } = useConfirmDialog();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [types, setTypes] = useState([]);
  const [base, setBase] = useState("Almuerzo");
  const [detalle, setDetalle] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editNombre, setEditNombre] = useState("");

  const previewName = useMemo(
    () => formatMealServiceLabel(base, detalle),
    [base, detalle],
  );

  const load = async () => {
    setLoading(true);
    try {
      const list = await fetchMealEventTypes(supabase);
      setTypes(list);
    } catch (e) {
      console.error(e);
      toast.error("No se pudieron cargar los tipos de comida");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const grouped = useMemo(() => {
    const map = Object.fromEntries(MEAL_SERVICES.map((s) => [s, []]));
    const other = [];
    for (const t of types) {
      const svc = t.servicio || mealBaseFromTypeName(t.nombre);
      if (svc && map[svc]) map[svc].push(t);
      else other.push(t);
    }
    return { map, other };
  }, [types]);

  const handleCreate = async () => {
    const nombre = previewName.trim();
    if (!nombre) return;
    if (!mealBaseFromTypeName(nombre)) {
      toast.error("El nombre debe empezar por Desayuno, Almuerzo, Merienda o Cena");
      return;
    }
    const exists = types.some(
      (t) => String(t.nombre).toLowerCase() === nombre.toLowerCase(),
    );
    if (exists) {
      toast.info("Ese tipo ya existe");
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase
        .from("tipos_evento")
        .insert([
          {
            nombre,
            color: defaultMealTypeColor(base),
            id_categoria: MEAL_CATEGORY_ID,
          },
        ])
        .select("id, nombre, color, id_categoria")
        .single();
      if (error) throw error;
      toast.success(`Tipo «${nombre}» creado`);
      setDetalle("");
      await load();
      onChanged?.(data);
    } catch (e) {
      console.error(e);
      toast.error(e.message || "No se pudo crear el tipo");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (t) => {
    if (isCanonicalMealTypeId(t.id)) {
      toast.info("Los tipos canónicos (Desayuno/Almuerzo/Merienda/Cena) no se renombran");
      return;
    }
    setEditingId(t.id);
    setEditNombre(t.nombre || "");
  };

  const saveEdit = async () => {
    if (editingId == null) return;
    const nombre = String(editNombre || "").trim();
    if (!nombre) {
      toast.error("El nombre no puede estar vacío");
      return;
    }
    if (!mealBaseFromTypeName(nombre)) {
      toast.error("El nombre debe empezar por Desayuno, Almuerzo, Merienda o Cena");
      return;
    }
    const idToUpdate = editingId;
    setSaving(true);
    try {
      const baseFromName = mealBaseFromTypeName(nombre);
      const { error } = await supabase
        .from("tipos_evento")
        .update({
          nombre,
          color: defaultMealTypeColor(baseFromName),
          id_categoria: MEAL_CATEGORY_ID,
        })
        .eq("id", idToUpdate);
      if (error) throw error;
      toast.success("Tipo actualizado");
      setEditingId(null);
      setEditNombre("");
      await load();
      onChanged?.({ id: idToUpdate, nombre });
    } catch (e) {
      console.error(e);
      toast.error(e.message || "No se pudo actualizar");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (t) => {
    if (isCanonicalMealTypeId(t.id)) {
      toast.info("No se pueden eliminar los tipos canónicos");
      return;
    }
    const { count } = await supabase
      .from("eventos")
      .select("id", { count: "exact", head: true })
      .eq("id_tipo_evento", t.id)
      .eq("is_deleted", false);

    if (count > 0) {
      toast.error(
        `Hay ${count} comida(s) con este tipo. Reasignalas antes de borrar.`,
      );
      return;
    }

    const ok = await confirm({
      title: "Eliminar tipo de comida",
      message: `¿Eliminar «${t.nombre}» del catálogo?`,
      confirmText: "Eliminar",
    });
    if (!ok) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("tipos_evento")
        .delete()
        .eq("id", t.id);
      if (error) throw error;
      toast.success("Tipo eliminado");
      await load();
      onChanged?.({ deleted: t.id });
    } catch (e) {
      console.error(e);
      toast.error(e.message || "No se pudo eliminar");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center p-3">
      {dialog}
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col border border-slate-200">
        <div className="shrink-0 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black text-slate-800">
              Tipos de comida
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Se agrupan en D/A/M/C por la primera palabra del nombre.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700"
          >
            <IconX size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2">
            <div className="text-[10px] font-bold uppercase text-slate-500">
              Nuevo tipo
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[9px] font-bold text-slate-500 uppercase">
                  Base
                </label>
                <select
                  value={base}
                  onChange={(e) => setBase(e.target.value)}
                  className="w-full mt-0.5 border border-slate-300 rounded px-2 py-1.5 text-xs bg-white"
                >
                  {MEAL_SERVICES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[9px] font-bold text-slate-500 uppercase">
                  Detalle
                </label>
                <input
                  type="text"
                  value={detalle}
                  onChange={(e) => setDetalle(e.target.value)}
                  placeholder="a bordo, (Vianda)…"
                  className="w-full mt-0.5 border border-slate-300 rounded px-2 py-1.5 text-xs"
                />
              </div>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span
                className={`text-[11px] font-bold uppercase px-2 py-0.5 rounded border ${
                  getMealServiceStyle(base).tag
                }`}
              >
                {previewName || "—"}
              </span>
              <button
                type="button"
                disabled={saving || !detalle.trim()}
                onClick={handleCreate}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-bold rounded bg-indigo-600 text-white disabled:opacity-50"
              >
                {saving ? (
                  <IconLoader size={12} className="animate-spin" />
                ) : (
                  <IconPlus size={12} />
                )}
                Crear tipo
              </button>
            </div>
            {!detalle.trim() && (
              <p className="text-[10px] text-slate-400">
                Escribí un detalle para crear un subtipo (los 4 canónicos ya
                existen: ids{" "}
                {Object.values(CANONICAL_MEAL_TYPE_IDS).join(", ")}).
              </p>
            )}
          </div>

          {loading ? (
            <div className="py-8 flex justify-center text-slate-400">
              <IconLoader className="animate-spin" size={20} />
            </div>
          ) : (
            <div className="space-y-3">
              {MEAL_SERVICES.map((svc) => {
                const list = grouped.map[svc] || [];
                if (list.length === 0) return null;
                return (
                  <div key={svc}>
                    <div
                      className={`text-[10px] font-black uppercase mb-1.5 px-1 ${
                        getMealServiceStyle(svc).date
                      }`}
                    >
                      {svc}
                    </div>
                    <ul className="space-y-1">
                      {list.map((t) => {
                        const isCanon = isCanonicalMealTypeId(t.id);
                        const isEditing = String(editingId) === String(t.id);
                        return (
                          <li
                            key={t.id}
                            className="flex items-center gap-2 border border-slate-200 rounded-lg px-2 py-1.5 bg-white"
                          >
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0 border border-black/5"
                              style={{
                                backgroundColor: defaultMealTypeColor(
                                  t.servicio ||
                                    mealBaseFromTypeName(t.nombre) ||
                                    svc,
                                ),
                              }}
                              title={
                                t.servicio ||
                                mealBaseFromTypeName(t.nombre) ||
                                svc
                              }
                            />
                            {isEditing ? (
                              <input
                                autoFocus
                                value={editNombre}
                                onChange={(e) => setEditNombre(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") saveEdit();
                                  if (e.key === "Escape") {
                                    setEditingId(null);
                                    setEditNombre("");
                                  }
                                }}
                                className="flex-1 text-xs border border-indigo-300 rounded px-1.5 py-0.5"
                              />
                            ) : (
                              <span className="flex-1 text-left text-xs font-medium text-slate-700 truncate">
                                {t.nombre}
                                {isCanon && (
                                  <span className="ml-1 text-[9px] text-slate-400 uppercase">
                                    base
                                  </span>
                                )}
                              </span>
                            )}
                            {isEditing ? (
                              <>
                                <button
                                  type="button"
                                  onClick={saveEdit}
                                  disabled={saving}
                                  className="text-[10px] font-bold text-indigo-600 px-1 shrink-0"
                                >
                                  Guardar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingId(null);
                                    setEditNombre("");
                                  }}
                                  className="text-[10px] font-bold text-slate-400 px-1 shrink-0"
                                >
                                  Cancelar
                                </button>
                              </>
                            ) : !isCanon ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => startEdit(t)}
                                  className="text-[10px] font-bold text-indigo-600 px-1 shrink-0"
                                >
                                  Editar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDelete(t)}
                                  className="p-1 text-slate-300 hover:text-red-500 shrink-0"
                                  title="Eliminar"
                                >
                                  <IconTrash size={14} />
                                </button>
                              </>
                            ) : null}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
              {grouped.other.length > 0 && (
                <div>
                  <div className="text-[10px] font-black uppercase mb-1.5 px-1 text-slate-500">
                    Sin agrupar (revisar nombre)
                  </div>
                  <ul className="space-y-1">
                    {grouped.other.map((t) => {
                      const isCanon = isCanonicalMealTypeId(t.id);
                      const isEditing = String(editingId) === String(t.id);
                      return (
                        <li
                          key={t.id}
                          className="flex items-center gap-2 border border-amber-200 bg-amber-50/50 rounded-lg px-2 py-1.5 text-xs"
                        >
                          {isEditing ? (
                            <input
                              autoFocus
                              value={editNombre}
                              onChange={(e) => setEditNombre(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") saveEdit();
                                if (e.key === "Escape") {
                                  setEditingId(null);
                                  setEditNombre("");
                                }
                              }}
                              className="flex-1 text-xs border border-indigo-300 rounded px-1.5 py-0.5 bg-white"
                            />
                          ) : (
                            <span className="flex-1 truncate font-medium text-slate-700">
                              {t.nombre}
                            </span>
                          )}
                          {isEditing ? (
                            <>
                              <button
                                type="button"
                                onClick={saveEdit}
                                disabled={saving}
                                className="text-[10px] font-bold text-indigo-600 px-1 shrink-0"
                              >
                                Guardar
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingId(null);
                                  setEditNombre("");
                                }}
                                className="text-[10px] font-bold text-slate-400 px-1 shrink-0"
                              >
                                Cancelar
                              </button>
                            </>
                          ) : !isCanon ? (
                            <>
                              <button
                                type="button"
                                onClick={() => startEdit(t)}
                                className="text-[10px] font-bold text-indigo-600 px-1 shrink-0"
                              >
                                Editar
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(t)}
                                className="p-1 text-slate-300 hover:text-red-500 shrink-0"
                                title="Eliminar"
                              >
                                <IconTrash size={14} />
                              </button>
                            </>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="shrink-0 px-4 py-2 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-bold text-slate-600"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
