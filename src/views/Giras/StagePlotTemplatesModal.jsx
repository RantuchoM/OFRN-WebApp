import React, { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import {
  IconCheck,
  IconEdit,
  IconLayers,
  IconLoader,
  IconPlus,
  IconTrash,
  IconUpload,
  IconUsers,
  IconX,
} from "../../components/ui/Icons";
import {
  createStagePlotTemplate,
  deleteStagePlotTemplate,
  listStagePlotTemplates,
  updateStagePlotTemplate,
} from "../../services/stagePlotTemplatesService";
import { countStagePlotMusicians } from "../../utils/stagePlotPayload";

/**
 * Gestión de plantillas globales de Escenario.
 * Aplicar reemplaza la disposición del lienzo activo (no crea lienzo nuevo).
 */
export default function StagePlotTemplatesModal({
  open,
  onClose,
  supabase,
  currentPayload,
  canEdit = true,
  onApplyTemplate,
  zIndex = 100,
  confirm,
}) {
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");

  const currentMusicos = countStagePlotMusicians(currentPayload);

  const reload = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    try {
      const { data, error } = await listStagePlotTemplates(supabase);
      if (error) throw error;
      setTemplates(data || []);
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "No se pudieron cargar las plantillas");
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    if (!open) return undefined;
    setNewName("");
    setEditingId(null);
    setEditName("");
    reload();
    return undefined;
  }, [open, reload]);

  const handleCreate = async () => {
    if (!canEdit) return;
    const name = newName.trim();
    if (!name) {
      toast.error("Indicá un nombre para la plantilla");
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await createStagePlotTemplate(supabase, {
        nombre: name,
        payload: currentPayload,
      });
      if (error) throw error;
      setTemplates((prev) => [data, ...prev.filter((t) => t.id !== data.id)]);
      setNewName("");
      toast.success(`Plantilla «${data.nombre}» guardada`);
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "No se pudo guardar");
    } finally {
      setBusy(false);
    }
  };

  const handleRename = async (template) => {
    if (!canEdit || !template) return;
    const name = editName.trim();
    if (!name) {
      toast.error("El nombre no puede quedar vacío");
      return;
    }
    if (name === template.nombre) {
      setEditingId(null);
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await updateStagePlotTemplate(
        supabase,
        template.id,
        { nombre: name },
      );
      if (error) throw error;
      setTemplates((prev) =>
        prev.map((t) => (t.id === data.id ? data : t)),
      );
      setEditingId(null);
      toast.success("Nombre actualizado");
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "No se pudo renombrar");
    } finally {
      setBusy(false);
    }
  };

  const handleOverwrite = async (template) => {
    if (!canEdit || !template) return;
    const ok = confirm
      ? await confirm({
          title: "Reemplazar plantilla",
          message: `¿Guardar el escenario actual sobre «${template.nombre}»? Se reemplaza el contenido de la plantilla.`,
          confirmText: "Reemplazar",
          cancelText: "Cancelar",
          destructive: true,
          overlayClassName: zIndex >= 10000 ? "z-[10000]" : undefined,
        })
      : window.confirm(
          `¿Guardar el escenario actual sobre «${template.nombre}»?`,
        );
    if (!ok) return;
    setBusy(true);
    try {
      const { data, error } = await updateStagePlotTemplate(
        supabase,
        template.id,
        {
          payload: currentPayload,
          nombre: template.nombre,
        },
      );
      if (error) throw error;
      setTemplates((prev) => {
        const rest = prev.filter((t) => t.id !== data.id);
        return [data, ...rest];
      });
      toast.success(`Plantilla «${data.nombre}» actualizada`);
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "No se pudo actualizar");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (template) => {
    if (!canEdit || !template) return;
    const ok = confirm
      ? await confirm({
          title: "Eliminar plantilla",
          message: `¿Eliminar «${template.nombre}»? No se puede deshacer.`,
          confirmText: "Eliminar",
          cancelText: "Cancelar",
          destructive: true,
          overlayClassName: zIndex >= 10000 ? "z-[10000]" : undefined,
        })
      : window.confirm(`¿Eliminar «${template.nombre}»?`);
    if (!ok) return;
    setBusy(true);
    try {
      const { error } = await deleteStagePlotTemplate(supabase, template.id);
      if (error) throw error;
      setTemplates((prev) => prev.filter((t) => t.id !== template.id));
      if (editingId === template.id) setEditingId(null);
      toast.success("Plantilla eliminada");
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "No se pudo eliminar");
    } finally {
      setBusy(false);
    }
  };

  const handleApply = async (template) => {
    if (!canEdit || !template) return;
    const ok = confirm
      ? await confirm({
          title: "Aplicar plantilla",
          message: `¿Reemplazar la disposición actual con «${template.nombre}» (${template.musicos_count} músicos)? Se puede deshacer con Ctrl+Z.`,
          confirmText: "Aplicar",
          cancelText: "Cancelar",
          destructive: true,
          overlayClassName: zIndex >= 10000 ? "z-[10000]" : undefined,
        })
      : window.confirm(
          `¿Reemplazar la disposición actual con «${template.nombre}»?`,
        );
    if (!ok) return;
    try {
      onApplyTemplate?.(template);
      toast.success(`Plantilla «${template.nombre}» aplicada`);
      onClose?.();
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "No se pudo aplicar");
    }
  };

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center bg-slate-900/50 p-4"
      style={{ zIndex }}
      role="dialog"
      aria-modal="true"
      aria-label="Plantillas de escenario"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div className="flex max-h-[min(90vh,640px)] w-full max-w-lg flex-col overflow-hidden rounded-xl bg-white shadow-xl">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-4 py-3">
          <div className="min-w-0">
            <h2 className="flex items-center gap-1.5 text-base font-bold text-slate-800">
              <IconLayers size={18} className="text-indigo-600" />
              Plantillas de escenario
            </h2>
            <p className="mt-0.5 text-[11px] text-slate-500">
              Globales · el escenario actual tiene{" "}
              <span className="font-semibold tabular-nums text-slate-700">
                {currentMusicos}
              </span>{" "}
              músico{currentMusicos === 1 ? "" : "s"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:bg-slate-100"
            aria-label="Cerrar"
          >
            <IconX size={18} />
          </button>
        </div>

        {canEdit && (
          <div className="shrink-0 space-y-2 border-b border-slate-100 bg-slate-50 px-4 py-3">
            <p className="text-[11px] font-medium text-slate-600">
              Guardar escenario actual como plantilla nueva
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleCreate();
                  }
                }}
                placeholder="Nombre de la plantilla"
                className="min-w-0 flex-1 rounded border border-slate-200 bg-white px-2.5 py-1.5 text-sm"
                disabled={busy}
              />
              <button
                type="button"
                disabled={busy || !newName.trim()}
                onClick={handleCreate}
                className="inline-flex shrink-0 items-center gap-1 rounded border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100 disabled:opacity-50"
              >
                {busy ? (
                  <IconLoader size={14} className="animate-spin" />
                ) : (
                  <IconPlus size={14} />
                )}
                Crear
              </button>
            </div>
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500">
              <IconLoader size={16} className="animate-spin" />
              Cargando…
            </div>
          ) : templates.length === 0 ? (
            <p className="px-1 py-8 text-center text-xs text-slate-400">
              Todavía no hay plantillas. Guardá el escenario actual para
              empezar.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {templates.map((t) => {
                const isEditing = editingId === t.id;
                return (
                  <li
                    key={t.id}
                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-2"
                  >
                    <div className="flex items-start gap-2">
                      <div className="min-w-0 flex-1">
                        {isEditing ? (
                          <div className="flex gap-1">
                            <input
                              type="text"
                              value={editName}
                              autoFocus
                              onChange={(e) => setEditName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  handleRename(t);
                                }
                                if (e.key === "Escape") {
                                  e.preventDefault();
                                  setEditingId(null);
                                }
                              }}
                              className="min-w-0 flex-1 rounded border border-indigo-200 px-2 py-1 text-sm font-medium"
                              disabled={busy}
                            />
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => handleRename(t)}
                              className="rounded border border-indigo-200 bg-indigo-50 p-1 text-indigo-700 hover:bg-indigo-100 disabled:opacity-50"
                              title="Confirmar nombre"
                            >
                              <IconCheck size={14} />
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => setEditingId(null)}
                              className="rounded border border-slate-200 p-1 text-slate-500 hover:bg-slate-50"
                              title="Cancelar"
                            >
                              <IconX size={14} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <p className="truncate text-sm font-semibold text-slate-800">
                              {t.nombre}
                            </p>
                            {canEdit && (
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => {
                                  setEditingId(t.id);
                                  setEditName(t.nombre);
                                }}
                                className="shrink-0 rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                                title="Renombrar"
                              >
                                <IconEdit size={12} />
                              </button>
                            )}
                          </div>
                        )}
                        <p className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-500">
                          <IconUsers size={12} className="text-slate-400" />
                          <span className="tabular-nums font-medium text-slate-700">
                            {t.musicos_count}
                          </span>{" "}
                          músico{t.musicos_count === 1 ? "" : "s"}
                        </p>
                      </div>
                    </div>
                    {canEdit && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => handleApply(t)}
                          className="inline-flex items-center gap-1 rounded border border-indigo-200 bg-indigo-50 px-2 py-1 text-[11px] font-bold text-indigo-700 hover:bg-indigo-100 disabled:opacity-50"
                          title="Reemplaza la disposición del lienzo activo"
                        >
                          <IconUpload size={12} />
                          Aplicar
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => handleOverwrite(t)}
                          className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                          title="Guarda el escenario actual sobre esta plantilla"
                        >
                          <IconLayers size={12} />
                          Guardar encima
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => handleDelete(t)}
                          className="inline-flex items-center gap-1 rounded border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] font-medium text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                        >
                          <IconTrash size={12} />
                          Eliminar
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
