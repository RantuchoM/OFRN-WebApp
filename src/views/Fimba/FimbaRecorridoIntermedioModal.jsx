import React, { useState } from "react";
import LocationSelectWithCreate from "../../components/forms/LocationSelectWithCreate";
import { IconLoader, IconMapPin, IconX } from "../../components/ui/Icons";
import { supabase } from "../../services/supabase";
import {
  createRecorridoIntermedioStops,
  eventLocacionId,
} from "../../utils/fimbaDestinoStopCreate";
import { formatEventLocation } from "../../utils/fimbaTransportBoarding";

/**
 * Modal: planificar un recorrido ida-vuelta durante una pausa de vehículo.
 * 3 filas: locación actual (salida) → waypoint → retorno a locación actual.
 * Fechas fijas al día del último evento antes de la pausa; horas vacías a completar.
 */
export default function FimbaRecorridoIntermedioModal({
  context,
  edicion,
  vehiculos,
  locationOptions = [],
  onRefreshLocations,
  onClose,
  onSaved,
}) {
  const prevEv = context?.prevEv || null;
  const nextEv = context?.nextEv || null;
  const vehicleId = context?.vehicleId;
  const idPropuestasTags = context?.idPropuestasTags || [];

  const fechaBase =
    String(prevEv?.fecha || "").slice(0, 10) ||
    String(nextEv?.fecha || "").slice(0, 10) ||
    "";
  const idLocActual = eventLocacionId(prevEv);
  const locActualLabel = formatEventLocation(prevEv) || "(Sin locación)";

  const [horaSalida, setHoraSalida] = useState("");
  const [horaWaypoint, setHoraWaypoint] = useState("");
  const [horaRetorno, setHoraRetorno] = useState("");
  const [idLocWaypoint, setIdLocWaypoint] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const formatFechaLabel = (f) => {
    if (!f) return "—";
    const [y, m, d] = String(f).split("-");
    if (!d) return f;
    return `${d}/${m}/${y}`;
  };

  const submit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!idLocActual) {
      setError("La locación actual de la pausa no está definida");
      return;
    }
    if (!idLocWaypoint) {
      setError("Elegí la locación intermedia (waypoint)");
      return;
    }
    if (!horaSalida || !horaWaypoint || !horaRetorno) {
      setError("Completá las tres horas del recorrido");
      return;
    }
    if (!fechaBase) {
      setError("Fecha no disponible para el recorrido");
      return;
    }
    if (vehicleId == null || vehicleId === "") {
      setError("Esta pausa no tiene vehículo asignado");
      return;
    }
    if (!edicion?.id_gira) {
      setError("Edición sin gira enlazada");
      return;
    }
    if (!prevEv?.id) {
      setError("No se encontró el evento previo a la pausa");
      return;
    }

    const toMs = (hora) => {
      const [y, m, d] = fechaBase.split("-").map(Number);
      const [hh, mm] = String(hora).slice(0, 5).split(":").map(Number);
      return new Date(y, m - 1, d, hh || 0, mm || 0, 0, 0).getTime();
    };
    const t1 = toMs(horaSalida);
    const t2 = toMs(horaWaypoint);
    const t3 = toMs(horaRetorno);
    if (!(t1 < t2 && t2 < t3)) {
      setError("Las horas deben ir en orden: salida < intermedia < retorno");
      return;
    }

    setSaving(true);
    try {
      const { eventos, error: err } = await createRecorridoIntermedioStops({
        prevEv,
        nextEv,
        vehicleId: Number(vehicleId),
        idGira: edicion.id_gira,
        vehiculos,
        idPropuestasTags,
        fecha: fechaBase,
        horaSalida,
        horaWaypoint,
        horaRetorno,
        idLocacionActual: idLocActual,
        idLocacionWaypoint: idLocWaypoint,
      });
      if (err) {
        setError(err.message || "No se pudo crear el recorrido intermedio");
        return;
      }
      onSaved?.(eventos);
    } finally {
      setSaving(false);
    }
  };

  const locLocked = (
    <div
      className="fimba-input"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.35rem",
        background: "rgba(14,116,144,0.06)",
        color: "var(--fimba-deep, #0f172a)",
        minHeight: 36,
        cursor: "default",
      }}
      title={locActualLabel}
    >
      <IconMapPin size={14} style={{ flexShrink: 0, color: "#0e7490" }} />
      <span
        style={{
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          fontSize: "0.85rem",
        }}
      >
        {locActualLabel}
      </span>
    </div>
  );

  const fechaLocked = (
    <input
      className="fimba-input"
      type="date"
      value={fechaBase}
      readOnly
      disabled
      title="Misma fecha del último evento antes de la pausa"
    />
  );

  return (
    <div className="fimba-modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="fimba-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="fimba-recorrido-intermedio-title"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 640 }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: "0.75rem",
            marginBottom: "0.35rem",
          }}
        >
          <h2
            id="fimba-recorrido-intermedio-title"
            style={{ margin: 0, fontSize: "1.05rem" }}
          >
            Crear recorrido intermedio
          </h2>
          <button
            type="button"
            className="fimba-btn fimba-btn-ghost"
            onClick={onClose}
            aria-label="Cerrar"
            disabled={saving}
            style={{ padding: "0.25rem 0.4rem" }}
          >
            <IconX size={16} />
          </button>
        </div>

        <p
          className="fimba-muted"
          style={{ margin: "0 0 0.85rem", fontSize: "0.8rem" }}
        >
          Salí de la locación actual, pasá por un punto intermedio y volvé.
          Fechas fijas al día de la pausa; completá las horas y el waypoint.
        </p>

        <form onSubmit={submit}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1.6fr) minmax(7rem, 0.7fr) minmax(5.5rem, 0.55fr)",
              gap: "0.5rem 0.65rem",
              alignItems: "end",
            }}
          >
            <span className="fimba-label" style={{ margin: 0 }}>
              Locación
            </span>
            <span className="fimba-label" style={{ margin: 0 }}>
              Fecha
            </span>
            <span className="fimba-label" style={{ margin: 0 }}>
              Hora
            </span>

            {/* Row 1 — salida */}
            <div className="fimba-field" style={{ margin: 0 }}>
              {locLocked}
            </div>
            <div className="fimba-field" style={{ margin: 0 }}>
              {fechaLocked}
            </div>
            <div className="fimba-field" style={{ margin: 0 }}>
              <input
                className="fimba-input"
                type="time"
                value={horaSalida}
                onChange={(e) => setHoraSalida(e.target.value)}
                required
                aria-label="Hora de salida"
                disabled={saving}
              />
            </div>

            {/* Row 2 — waypoint */}
            <div className="fimba-field" style={{ margin: 0 }}>
              <LocationSelectWithCreate
                supabase={supabase}
                options={locationOptions}
                value={idLocWaypoint}
                onChange={(v) => setIdLocWaypoint(v || "")}
                onRefresh={onRefreshLocations}
                placeholder="Waypoint…"
              />
            </div>
            <div className="fimba-field" style={{ margin: 0 }}>
              {fechaLocked}
            </div>
            <div className="fimba-field" style={{ margin: 0 }}>
              <input
                className="fimba-input"
                type="time"
                value={horaWaypoint}
                onChange={(e) => setHoraWaypoint(e.target.value)}
                required
                aria-label="Hora en waypoint"
                disabled={saving}
              />
            </div>

            {/* Row 3 — retorno */}
            <div className="fimba-field" style={{ margin: 0 }}>
              {locLocked}
            </div>
            <div className="fimba-field" style={{ margin: 0 }}>
              {fechaLocked}
            </div>
            <div className="fimba-field" style={{ margin: 0 }}>
              <input
                className="fimba-input"
                type="time"
                value={horaRetorno}
                onChange={(e) => setHoraRetorno(e.target.value)}
                required
                aria-label="Hora de retorno"
                disabled={saving}
              />
            </div>
          </div>

          <p
            className="fimba-muted"
            style={{ margin: "0.65rem 0 0", fontSize: "0.72rem" }}
          >
            Pausado en {locActualLabel}
            {fechaBase ? ` · ${formatFechaLabel(fechaBase)}` : ""}
            {nextEv?.hora_inicio
              ? ` · siguiente evento ${String(nextEv.hora_inicio).slice(0, 5)}`
              : ""}
          </p>

          {error ? (
            <p className="fimba-error" style={{ margin: "0.5rem 0 0" }}>
              {error}
            </p>
          ) : null}

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "0.5rem",
              marginTop: "1rem",
            }}
          >
            <button
              type="button"
              className="fimba-btn fimba-btn-ghost"
              onClick={onClose}
              disabled={saving}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="fimba-btn fimba-btn-primary"
              disabled={saving}
              style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              {saving ? (
                <>
                  <IconLoader size={14} className="animate-spin" />
                  Creando…
                </>
              ) : (
                "Crear recorrido"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
