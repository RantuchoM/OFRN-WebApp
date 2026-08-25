import React, { useCallback, useEffect, useState } from "react";
import LocationSelectWithCreate from "../../components/forms/LocationSelectWithCreate";
import { supabase } from "../../services/supabase";
import { saveFimbaEvento } from "../../services/fimbaService";
import { eventTypeIdForCategoria } from "../../utils/giraTransportUtils";

/**
 * Modal compacto: define el Destino calculado creando la parada siguiente
 * (intermedia si ya hay next real; nueva cola si no hay).
 */
export default function FimbaDestinoStopModal({
  context,
  edicion,
  vehiculos,
  onClose,
  onSaved,
}) {
  const schedule = context?.schedule || {};
  const vehicleId = context?.vehicleId;
  const nextEv = context?.nextEv || null;

  const [detalle, setDetalle] = useState("Parada intermedia");
  const [hora, setHora] = useState(() =>
    schedule.hora_inicio ? String(schedule.hora_inicio).slice(0, 5) : "",
  );
  const [idLocacion, setIdLocacion] = useState("");
  const [locationsList, setLocationsList] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const refreshLocations = useCallback(async () => {
    const { data, error: err } = await supabase
      .from("locaciones")
      .select("id, nombre, direccion, localidades(localidad)")
      .order("nombre");
    if (err) {
      console.error(err);
      return;
    }
    setLocationsList(
      (data || []).map((l) => ({
        id: l.id,
        nombre: l.nombre,
        direccion: l.direccion,
        ciudad: l.localidades?.localidad || "Sin ciudad",
      })),
    );
  }, []);

  useEffect(() => {
    refreshLocations();
  }, [refreshLocations]);

  const locationOptions = locationsList.map((l) => ({
    id: l.id,
    label: l.ciudad ? `${l.nombre} (${l.ciudad})` : l.nombre,
  }));

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    if (vehicleId == null || vehicleId === "") {
      setError("Esta fila no tiene vehículo asignado");
      return;
    }
    if (!edicion?.id_gira) {
      setError("Edición sin gira enlazada");
      return;
    }
    const fecha = schedule.fecha || context?.ev?.fecha || "";
    if (!fecha) {
      setError("Fecha no disponible para esta parada");
      return;
    }
    const horaVal = String(hora || "").trim().slice(0, 5);
    if (!horaVal) {
      setError("Indicá la hora de la parada");
      return;
    }
    const act = String(detalle || "").trim() || "Parada intermedia";
    const locLabel =
      locationOptions.find((o) => String(o.id) === String(idLocacion))?.label ||
      "";

    const gt =
      vehiculos.find((g) => Number(g.id) === Number(vehicleId)) || null;
    const tipoId = eventTypeIdForCategoria(gt?.categoria_logistica);

    setSaving(true);
    const { error: err } = await saveFimbaEvento({
      id_gira: edicion.id_gira,
      fecha,
      hora_inicio: horaVal,
      hora_fin: null,
      actividad: act,
      destino: locLabel || "",
      id_locacion: idLocacion || null,
      observaciones_equipaje: "",
      asientos_equipaje: 0,
      sin_servicio: false,
      usa_transporte: true,
      vehiculos: [
        {
          id_gira_transporte: Number(vehicleId),
          plazas: 0,
        },
      ],
      id_propuestas: [],
      id_tipo_evento: tipoId,
      audiencia_ofrn: "none",
    });
    setSaving(false);
    if (err) {
      setError(err.message || "No se pudo crear la parada");
      return;
    }
    onSaved?.();
  };

  const hint = nextEv
    ? "Se insertará una parada nueva entre esta fila y la siguiente del mismo vehículo. El Destino de esta fila pasará a ser la parada creada."
    : "Se creará la siguiente parada de este vehículo (hoy Destino no tenía fila real).";

  return (
    <div className="fimba-modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="fimba-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="fimba-destino-stop-title"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 420 }}
      >
        <h2 id="fimba-destino-stop-title">Definir destino</h2>
        <p className="fimba-muted" style={{ margin: "0 0 0.85rem", fontSize: "0.8rem" }}>
          {hint}
        </p>
        <form onSubmit={submit}>
          <div className="fimba-field">
            <label className="fimba-label" htmlFor="fimba-destino-detalle">
              Detalle
            </label>
            <input
              id="fimba-destino-detalle"
              className="fimba-input"
              type="text"
              value={detalle}
              onChange={(e) => setDetalle(e.target.value)}
              placeholder="Actividad / descripción de la parada"
              autoFocus
            />
          </div>

          <div className="fimba-field">
            <label className="fimba-label">Destino (locación)</label>
            <LocationSelectWithCreate
              supabase={supabase}
              options={locationOptions}
              value={idLocacion}
              onChange={(v) => setIdLocacion(v || "")}
              onRefresh={refreshLocations}
              placeholder="Buscar locación…"
            />
          </div>

          <div className="fimba-field">
            <label className="fimba-label" htmlFor="fimba-destino-hora">
              Hora
            </label>
            <input
              id="fimba-destino-hora"
              className="fimba-input"
              type="time"
              value={hora}
              onChange={(e) => setHora(e.target.value)}
              required
            />
            {schedule.fecha ? (
              <span className="fimba-muted" style={{ fontSize: "0.75rem" }}>
                Fecha de secuencia:{" "}
                {String(schedule.fecha)
                  .slice(0, 10)
                  .split("-")
                  .reverse()
                  .join("/")}
                {nextEv
                  ? " (punto medio con la siguiente, editable solo la hora)"
                  : " (actual + 30 min si no había next)"}
              </span>
            ) : null}
          </div>

          {error ? (
            <p className="fimba-error" style={{ margin: "0.5rem 0" }}>
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
            <button type="submit" className="fimba-btn fimba-btn-primary" disabled={saving}>
              {saving ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
