import React, { useState } from "react";
import { toast } from "sonner";
import DateInput from "../../components/ui/DateInput";
import { BajaDateField, BajaDateModal } from "../../components/ui/BajaDateControls";
import { useMusicianFormContext } from "./MusicianFormContext";
import { toIsoDateString } from "../../utils/ensembleMembership";

/** Pestaña "Sistema": bio, foto popup, cargo, jornada, motivo, fechas alta/baja. */
export default function MusicianDocsSection() {
  const {
    formData,
    updateField,
    ensembleMembershipRows,
    handleCloseOpenMemberships,
    getInputStatusClass,
    labelClass,
    inputClass,
  } = useMusicianFormContext();
  const [bajaModalOpen, setBajaModalOpen] = useState(false);
  const [bajaBusy, setBajaBusy] = useState(false);
  const [closeEnsembles, setCloseEnsembles] = useState(true);

  const openMembershipCount = (ensembleMembershipRows || []).filter(
    (row) => row.fecha_hasta == null || row.fecha_hasta === "",
  ).length;

  const musicianLabel = [formData.apellido, formData.nombre]
    .filter(Boolean)
    .join(", ");

  const applyFechaBaja = (iso) => {
    const alta = toIsoDateString(formData.fecha_alta);
    if (iso != null && alta && iso < alta) {
      toast.error("La fecha de baja no puede ser anterior a la fecha de alta.");
      return false;
    }
    updateField("fecha_baja", iso || "");
    return true;
  };

  const confirmBaja = async (fecha) => {
    if (!fecha) return;
    const alta = toIsoDateString(formData.fecha_alta);
    if (alta && fecha < alta) {
      toast.error("La fecha de baja no puede ser anterior a la fecha de alta.");
      return;
    }

    setBajaBusy(true);
    try {
      if (closeEnsembles) {
        const membershipsClosed = await handleCloseOpenMemberships(fecha);
        if (!membershipsClosed) return;
      }
      if (applyFechaBaja(fecha)) setBajaModalOpen(false);
    } finally {
      setBajaBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <BajaDateModal
        isOpen={bajaModalOpen}
        subjectLabel={musicianLabel || undefined}
        description="Elegí la fecha de baja del integrante:"
        busy={bajaBusy}
        onClose={() => setBajaModalOpen(false)}
        onConfirm={confirmBaja}
      >
        {openMembershipCount > 0 ? (
          <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-lg border border-indigo-100 bg-indigo-50/60 p-3">
            <input
              type="checkbox"
              checked={closeEnsembles}
              onChange={(event) => setCloseEnsembles(event.target.checked)}
              disabled={bajaBusy}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-sm text-slate-700">
              Dar de baja también sus{" "}
              <strong>
                {openMembershipCount}{" "}
                {openMembershipCount === 1 ? "ensamble asociado" : "ensambles asociados"}
              </strong>{" "}
              con la misma fecha.
            </span>
          </label>
        ) : null}
      </BajaDateModal>

      <div className="grid grid-cols-2 gap-6">
        <div>
          <label className={labelClass}>Bio (Drive/Web)</label>
          <input
            type="text"
            className={inputClass}
            value={formData.link_bio || ""}
            onChange={(e) => updateField("link_bio", e.target.value)}
          />
        </div>
        <div>
          <label className={labelClass}>Foto Perfil (Popup)</label>
          <input
            type="text"
            className={inputClass}
            value={formData.link_foto_popup || ""}
            onChange={(e) => updateField("link_foto_popup", e.target.value)}
          />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <label className={labelClass}>Cargo</label>
          <input
            type="text"
            className={getInputStatusClass("cargo")}
            value={formData.cargo || ""}
            onChange={(e) => updateField("cargo", e.target.value)}
            placeholder="Ej: Agente administrativo"
          />
        </div>
        <div>
          <label className={labelClass}>Jornada</label>
          <input
            type="text"
            className={getInputStatusClass("jornada")}
            value={formData.jornada || ""}
            onChange={(e) => updateField("jornada", e.target.value)}
            placeholder="Ej: Horas cátedra"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-1 gap-6 mb-6">
        <div>
          <label className={labelClass}>Motivo</label>
          <input
            type="text"
            className={getInputStatusClass("motivo")}
            value={formData.motivo || ""}
            onChange={(e) => updateField("motivo", e.target.value)}
            placeholder="Si necesita un motivo personalizado"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <DateInput
            label="Fecha Alta"
            value={formData.fecha_alta || ""}
            onChange={(val) => updateField("fecha_alta", val)}
          />
        </div>
        <div>
          <BajaDateField
            label="Fecha Baja"
            value={formData.fecha_baja || null}
            wrapperClassName="w-full"
            onOpenBajaModal={() => {
              setCloseEnsembles(true);
              setBajaModalOpen(true);
            }}
            onChange={(iso) => applyFechaBaja(iso)}
          />
        </div>
      </div>
    </div>
  );
}
