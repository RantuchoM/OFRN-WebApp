import React, { useState, useEffect, useCallback, useRef } from "react";
import { IconX } from "../../components/ui/Icons";
import GiraTramosEditor from "./GiraTramosEditor";

/**
 * Modal para editar localías y cortes de todos los tramos (desde logística).
 */
export default function GiraTramosEditModal({
  supabase,
  gira,
  isOpen,
  onClose,
  onSaved,
}) {
  const [locationsList, setLocationsList] = useState([]);
  const [selectedLocations, setSelectedLocations] = useState(new Set());
  const dirtyRef = useRef(false);
  const saveFlushRef = useRef(null);

  const loadLocations = useCallback(async () => {
    if (!supabase || !gira?.id) return;
    const [{ data: locs }, { data: giraLocs }] = await Promise.all([
      supabase.from("localidades").select("id, localidad").order("localidad"),
      supabase
        .from("giras_localidades")
        .select("id_localidad")
        .eq("id_gira", gira.id),
    ]);
    setLocationsList(locs || []);
    setSelectedLocations(
      new Set((giraLocs || []).map((r) => Number(r.id_localidad))),
    );
  }, [supabase, gira?.id]);

  useEffect(() => {
    if (isOpen) loadLocations();
  }, [isOpen, loadLocations]);

  const markDirty = useCallback(() => {
    dirtyRef.current = true;
  }, []);

  const handleEditorRefresh = useCallback(() => {
    loadLocations();
    markDirty();
  }, [loadLocations, markDirty]);

  const handleClose = useCallback(async () => {
    await saveFlushRef.current?.();
    if (dirtyRef.current) {
      dirtyRef.current = false;
      onSaved?.();
    }
    onClose();
  }, [onClose, onSaved]);

  if (!isOpen || !gira?.id) return null;

  const formData = {
    fecha_desde: gira.fecha_desde,
    fecha_hasta: gira.fecha_hasta,
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 backdrop-blur-sm p-4 animate-in fade-in"
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-slate-100 shrink-0">
          <div>
            <h3 className="text-lg font-bold text-indigo-900">
              Tramos, localías y cortes
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Los cambios recalculan localía por tramo en logística, rooming y
              comidas.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-700 p-1 shrink-0"
            title="Cerrar"
          >
            <IconX size={20} />
          </button>
        </div>

        <div className="px-5 py-4 overflow-y-auto flex-1 min-h-0">
          {!formData.fecha_desde || !formData.fecha_hasta ? (
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
              La gira necesita fechas de inicio y fin para definir tramos y
              cortes.
            </p>
          ) : (
            <GiraTramosEditor
              supabase={supabase}
              giraId={gira.id}
              formData={formData}
              locationsList={locationsList}
              setSelectedLocations={setSelectedLocations}
              onRefresh={handleEditorRefresh}
              onDirty={markDirty}
              saveFlushRef={saveFlushRef}
              embedded
            />
          )}
        </div>

        <div className="flex justify-end px-5 py-3 border-t border-slate-100 bg-slate-50 shrink-0">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700"
          >
            Listo
          </button>
        </div>
      </div>
    </div>
  );
}
