import React, { useState } from "react";
import { toast } from "sonner";
import LocationSelectWithCreate from "../forms/LocationSelectWithCreate";
import { IconEdit, IconLoader } from "../ui/Icons";

export default function GestionConciertoLocacionCell({
  supabase,
  eventId,
  idLocacion,
  locacion = "-",
  localidad = "-",
  locacionesOptions = [],
  onRefreshLocations,
  onUpdated,
  editable = true,
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const locacionLabel = String(locacion || "").trim() || "-";
  const localidadLabel = String(localidad || "").trim();

  const handleChange = async (newId) => {
    if (!eventId || saving) return;
    if (String(newId ?? "") === String(idLocacion ?? "")) {
      setEditing(false);
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("eventos")
        .update({ id_locacion: newId || null })
        .eq("id", eventId);
      if (error) throw error;
      toast.success("Locación actualizada");
      setEditing(false);
      onUpdated?.();
    } catch (err) {
      console.error(err);
      toast.error("No se pudo actualizar la locación");
    } finally {
      setSaving(false);
    }
  };

  if (editing && editable) {
    return (
      <div className="relative min-w-[220px]">
        {saving ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-white/70">
            <IconLoader className="animate-spin text-indigo-600" size={16} />
          </div>
        ) : null}
        <LocationSelectWithCreate
          supabase={supabase}
          options={locacionesOptions}
          value={idLocacion}
          onChange={handleChange}
          onRefresh={onRefreshLocations}
          placeholder="Buscar locación..."
          className="text-xs"
        />
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="mt-1 text-[10px] font-bold text-slate-500 hover:text-slate-700"
        >
          Cancelar
        </button>
      </div>
    );
  }

  return (
    <div className="group flex items-start gap-1">
      <div className="min-w-0 flex-1 leading-tight">
        <div className="text-sm text-slate-700">{locacionLabel}</div>
        {localidadLabel && localidadLabel !== "-" ? (
          <div className="text-[11px] italic text-slate-500">{localidadLabel}</div>
        ) : null}
      </div>
      {editable ? (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="shrink-0 rounded p-0.5 text-slate-400 opacity-0 transition-all hover:bg-indigo-50 hover:text-indigo-600 group-hover:opacity-100"
          title="Cambiar locación"
        >
          <IconEdit size={13} />
        </button>
      ) : null}
    </div>
  );
}
