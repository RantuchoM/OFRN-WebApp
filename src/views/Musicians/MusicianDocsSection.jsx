import React from "react";
import DateInput from "../../components/ui/DateInput";
import { useMusicianFormContext } from "./MusicianFormContext";

/** Pestaña "Sistema": bio, foto popup, cargo, jornada, motivo, fechas alta/baja. */
export default function MusicianDocsSection() {
  const { formData, updateField, getInputStatusClass, labelClass, inputClass } = useMusicianFormContext();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-6">
        <div>
          <label className={labelClass}>Bio (Drive/Web)</label>
          <input type="text" className={inputClass} value={formData.link_bio || ""} onChange={(e) => updateField("link_bio", e.target.value)} />
        </div>
        <div>
          <label className={labelClass}>Foto Perfil (Popup)</label>
          <input type="text" className={inputClass} value={formData.link_foto_popup || ""} onChange={(e) => updateField("link_foto_popup", e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <label className={labelClass}>Cargo</label>
          <input type="text" className={getInputStatusClass("cargo")} value={formData.cargo || ""} onChange={(e) => updateField("cargo", e.target.value)} placeholder="Ej: Agente administrativo" />
        </div>
        <div>
          <label className={labelClass}>Jornada</label>
          <input type="text" className={getInputStatusClass("jornada")} value={formData.jornada || ""} onChange={(e) => updateField("jornada", e.target.value)} placeholder="Ej: Horas cátedra" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-1 gap-6 mb-6">
        <div>
          <label className={labelClass}>Motivo</label>
          <input type="text" className={getInputStatusClass("motivo")} value={formData.motivo || ""} onChange={(e) => updateField("motivo", e.target.value)} placeholder="Si necesita un motivo personalizado" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <DateInput label="Fecha Alta" value={formData.fecha_alta || ""} onChange={(val) => updateField("fecha_alta", val)} />
        </div>
        <div>
          <DateInput label="Fecha Baja" value={formData.fecha_baja || ""} onChange={(val) => updateField("fecha_baja", val)} />
        </div>
      </div>
    </div>
  );
}
