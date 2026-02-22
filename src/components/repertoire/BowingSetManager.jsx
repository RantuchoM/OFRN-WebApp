import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  IconPlus,
  IconTrash,
  IconLink,
  IconX,
  IconLoader,
  IconAlertCircle,
} from "../ui/Icons";

const ModalPortal = ({ children }) =>
  createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      {children}
    </div>,
    document.body
  );

/**
 * Modal para crear un nuevo set de arcos.
 * - mode "edit": crea en obras_arcos (nombre, descripcion, link); id_obra viene de workId.
 * - mode "assign": solo pide nombre; onConfirm(nombre) → padre hace sync + insert y devuelve { newArcoId }.
 */
export const CreateBowingSetModal = ({
  onClose,
  onConfirm,
  mode = "edit",
  workId,
  defaultNombre = "",
}) => {
  const [nombre, setNombre] = useState(defaultNombre || `Arcos ${new Date().getFullYear()}`);
  const [descripcion, setDescripcion] = useState("");
  const [link, setLink] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nombre.trim()) {
      setError("El nombre es obligatorio.");
      return;
    }
    setError("");
    setSaving(true);
    try {
      if (mode === "assign") {
        const result = await onConfirm(nombre.trim());
        onClose(result?.newArcoId ?? null);
      } else {
        await onConfirm({ nombre: nombre.trim(), descripcion: descripcion.trim(), link: link.trim() });
        onClose(null);
      }
    } catch (err) {
      setError(err?.message || "Error al guardar.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalPortal>
      <div
        className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-slate-100 flex justify-between items-center">
          <h3 className="text-sm font-bold text-slate-800 uppercase">
            Nuevo set de arcos
          </h3>
          <button
            type="button"
            onClick={() => onClose()}
            className="p-1 text-slate-400 hover:text-slate-600 rounded"
          >
            <IconX size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
              Nombre
            </label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Ej: Arcos 2026"
              autoFocus
            />
          </div>
          {mode === "edit" && (
            <>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                  Descripción
                </label>
                <input
                  type="text"
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Opcional"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                  Link (Drive)
                </label>
                <input
                  type="text"
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="https://drive.google.com/..."
                />
              </div>
            </>
          )}
          {error && (
            <p className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => onClose()}
              className="px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-1.5 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1"
            >
              {saving ? (
                <>
                  <IconLoader size={14} className="animate-spin" /> Guardando...
                </>
              ) : (
                "Crear"
              )}
            </button>
          </div>
        </form>
      </div>
    </ModalPortal>
  );
};

/**
 * BowingSetManager
 * - mode="edit" (WorkForm): CRUD de obras_arcos para workId. Lista + "Nuevo set" con modal.
 * - mode="assign" (RepertoireManager): dropdown para elegir set + "Crear nuevo set..." que abre modal; onConfirmCreate(workId, workTitle, nombre) → padre devuelve { newArcoId }; onSelectChange(item, arcoId).
 */
export default function BowingSetManager({
  supabase,
  workId,
  workTitle = "",
  mode = "edit",
  // assign mode
  arcos = [],
  selectedArcoId,
  item, // repertorio_obra item for assign
  onSelectChange,
  onCreateAndAssign, // (workId, workTitle, nombre) => Promise<{ newArcoId }>
  onAfterCreateAndAssign, // opcional: llamado tras crear y asignar (para refetch)
  // edit mode: optional callback after list change
  onArcosChange,
}) {
  const [arcosList, setArcosList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const fetchArcos = React.useCallback(async (id) => {
    if (!id || !supabase) {
      setLoading(false);
      return;
    }
    setFetchError(null);
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("obras_arcos")
        .select("*")
        .eq("id_obra", id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const list = data || [];
      setArcosList(list);
      onArcosChange?.(list);
    } catch (err) {
      setFetchError(err?.message || "Error al cargar arcos");
      setArcosList([]);
    } finally {
      setLoading(false);
    }
  }, [supabase, onArcosChange]);

  useEffect(() => {
    if (mode !== "edit") return;
    if (!supabase || !workId) {
      setArcosList([]);
      setLoading(false);
      return;
    }
    fetchArcos(workId);
  }, [mode, workId, supabase, fetchArcos]);

  useEffect(() => {
    if (mode === "assign") {
      setArcosList(arcos || []);
    }
  }, [mode, arcos]);

  // En modo assign: si el padre no pasa arcos (o vienen vacíos), cargar desde BD
  useEffect(() => {
    if (mode !== "assign" || !workId || !supabase) return;
    const hasParentArcos = Array.isArray(arcos) && arcos.length > 0;
    if (hasParentArcos) return;
    fetchArcos(workId);
  }, [mode, workId, supabase, arcos?.length, fetchArcos]);

  const handleSaveArco = async (arco) => {
    if (!workId) return;
    const payload = { ...arco, id_obra: workId };
    delete payload.tempId;
    if (arco.id) {
      await supabase.from("obras_arcos").update(payload).eq("id", arco.id);
    } else {
      await supabase.from("obras_arcos").insert([payload]);
    }
    fetchArcos(workId);
  };

  const handleDeleteArco = async (id) => {
    if (!confirm("¿Eliminar este set de arcos?")) return;
    await supabase.from("obras_arcos").delete().eq("id", id);
    fetchArcos(workId);
  };

  const handleConfirmCreateEdit = async (payload) => {
    await handleSaveArco(payload);
  };

  const handleConfirmCreateAssign = async (nombre) => {
    if (!onCreateAndAssign) return {};
    return await onCreateAndAssign(workId, workTitle, nombre);
  };

  if (mode === "assign") {
    const fromProp = Array.isArray(arcos) && arcos.length > 0;
    const assignOptions = fromProp ? arcos : (arcosList || []);
    const selectedArco = assignOptions.find((a) => a.id == selectedArcoId);
    return (
      <div className="flex flex-row items-center gap-2 w-full max-w-[160px]">
        <div className="relative flex-1 min-w-0 group">
          {loading && assignOptions.length === 0 ? (
            <div className="flex items-center justify-center px-2 py-1 rounded-full border border-slate-200 text-[10px] text-slate-400">
              Cargando…
            </div>
          ) : (
            <>
          <div
            className={`flex items-center justify-between px-2 py-1 rounded-full border text-[10px] font-medium truncate transition-all ${
              selectedArcoId
                ? "bg-fixed-indigo-50 border-fixed-indigo-200 text-fixed-indigo-700 group-hover:border-fixed-indigo-300"
                : "bg-white border-slate-200 text-slate-400 border-dashed group-hover:border-fixed-indigo-300 group-hover:text-fixed-indigo-400"
            }`}
          >
            <span className="truncate w-full text-center">
              {selectedArco?.nombre || "+ Asignar Arcos"}
            </span>
          </div>
          <select
            value={selectedArcoId || ""}
            onChange={(e) => {
              const val = e.target.value;
              if (val === "NEW_SET_ACTION") {
                setShowCreateModal(true);
              } else {
                onSelectChange?.(item, val === "" ? null : val);
              }
            }}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            title={selectedArco?.nombre || "Seleccionar set de arcos"}
          >
            <option value="">-- Sin definir --</option>
            {assignOptions.map((arco) => (
              <option key={arco.id} value={arco.id}>
                {arco.nombre}
              </option>
            ))}
            <option disabled>──────────</option>
            <option value="NEW_SET_ACTION">+ Crear Nuevo Set...</option>
          </select>
          </>
          )}
        </div>
        {selectedArcoId && selectedArco?.link && (
          <a
            href={selectedArco.link}
            target="_blank"
            rel="noreferrer"
            className="shrink-0 w-6 h-6 flex items-center justify-center text-slate-400 hover:text-fixed-indigo-600 hover:bg-fixed-indigo-50 rounded-full transition-colors"
            title="Ver carpeta en Drive"
          >
            <IconLink size={14} />
          </a>
        )}
        {showCreateModal && (
          <CreateBowingSetModal
            mode="assign"
            defaultNombre={`Arcos ${new Date().getFullYear()}`}
            onClose={(newArcoId) => {
              setShowCreateModal(false);
              if (newArcoId && onSelectChange && item) {
                onSelectChange(item, newArcoId);
                onAfterCreateAndAssign?.();
              }
            }}
            onConfirm={handleConfirmCreateAssign}
          />
        )}
      </div>
    );
  }

  // --- mode="edit" ---
  return (
    <div className="border-t pt-6">
      <h3 className="text-sm font-bold uppercase text-slate-500 mb-3 flex items-center gap-2">
        Gestión de Arcos / Bowings
      </h3>
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
        {fetchError ? (
          <div className="flex items-center gap-2 text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-sm">
            <IconAlertCircle size={16} className="shrink-0" />
            <span>{fetchError}</span>
          </div>
        ) : loading ? (
          <div className="flex items-center gap-2 text-slate-500 text-sm">
            <IconLoader size={14} className="animate-spin shrink-0" /> Cargando...
          </div>
        ) : !workId ? (
          <p className="text-slate-400 text-sm">Guarda la obra primero para gestionar sets de arcos.</p>
        ) : (
          <>
            {arcosList.map((a) => (
              <div
                key={a.id}
                className="flex gap-2 items-center bg-white p-2 rounded-lg border border-slate-200 shadow-sm group"
              >
                <input
                  type="text"
                  className="input text-xs font-bold border-none flex-1"
                  defaultValue={a.nombre}
                  onBlur={(e) =>
                    handleSaveArco({ ...a, nombre: e.target.value })
                  }
                />
                <input
                  type="text"
                  className="input text-xs border-none flex-1 hidden sm:block"
                  defaultValue={a.descripcion}
                  onBlur={(e) =>
                    handleSaveArco({ ...a, descripcion: e.target.value })
                  }
                />
                <input
                  type="text"
                  className="input text-xs text-blue-600 border-none w-1/3 max-w-[180px]"
                  defaultValue={a.link}
                  onBlur={(e) =>
                    handleSaveArco({ ...a, link: e.target.value })
                  }
                />
                <a
                  href={a.link}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 p-1 text-slate-400 hover:text-indigo-600"
                  title="Abrir enlace"
                >
                  <IconLink size={14} />
                </a>
                <button
                  type="button"
                  onClick={() => handleDeleteArco(a.id)}
                  className="text-slate-300 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <IconTrash size={14} />
                </button>
              </div>
            ))}
            <div className="flex gap-2 items-center pt-2 border-t border-dashed border-slate-200">
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
              >
                <IconPlus size={14} /> Nuevo set de arcos
              </button>
            </div>
          </>
        )}
      </div>
      {showCreateModal && (
        <CreateBowingSetModal
          mode="edit"
          workId={workId}
          defaultNombre={`Arcos ${new Date().getFullYear()}`}
          onClose={() => setShowCreateModal(false)}
          onConfirm={handleConfirmCreateEdit}
        />
      )}
    </div>
  );
}
