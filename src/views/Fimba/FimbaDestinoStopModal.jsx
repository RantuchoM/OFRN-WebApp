import React, { useCallback, useEffect, useState } from "react";
import LocationSelectWithCreate from "../../components/forms/LocationSelectWithCreate";
import { supabase } from "../../services/supabase";
import {
  decodeFimbaTrasladoDescripcion,
  patchFimbaEventoPlanilla,
  saveFimbaEvento,
} from "../../services/fimbaService";
import { eventTypeIdForCategoria } from "../../utils/giraTransportUtils";

/**
 * Modal compacto: «Elegir destino creando evento».
 * Crea la parada siguiente (intermedia si ya hay next; cola si no) con:
 * - hora_inicio = Hora Fin del tramo actual (prefill desde context.schedule)
 * - id_locacion = lugar elegido (lugar de salida de la nueva parada)
 * Y fija `hora_fin` en la parada actual = esa misma hora (tramo explícito).
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
  const currentEv = context?.ev || null;

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

  // Sync hora if parent re-opens with a different Hora Fin prefill
  useEffect(() => {
    if (schedule.hora_inicio) {
      setHora(String(schedule.hora_inicio).slice(0, 5));
    }
  }, [schedule.hora_inicio]);

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
    if (currentEv?.id == null || currentEv.id === "") {
      setError("Guardá el evento actual antes de crear el destino");
      return;
    }
    const fecha = schedule.fecha || currentEv?.fecha || "";
    if (!fecha) {
      setError("Fecha no disponible para esta parada");
      return;
    }
    const horaVal = String(hora || "").trim().slice(0, 5);
    if (!horaVal) {
      setError("Indicá la hora inicio de la nueva parada (Hora Fin del tramo actual)");
      return;
    }
    if (!idLocacion) {
      setError("Elegí el destino (locación de salida de la nueva parada)");
      return;
    }
    const act = String(detalle || "").trim() || "Parada intermedia";

    const gt =
      vehiculos.find((g) => Number(g.id) === Number(vehicleId)) || null;
    const tipoId = eventTypeIdForCategoria(gt?.categoria_logistica);

    // Gap-fill: fin de la nueva parada = inicio del next previo (si había)
    const nextHoraFin = nextEv?.hora_inicio
      ? String(nextEv.hora_inicio).slice(0, 5)
      : null;

    setSaving(true);

    const { error: createErr } = await saveFimbaEvento({
      id_gira: edicion.id_gira,
      fecha,
      // Hora Fin del actual → hora_inicio de la parada creada
      hora_inicio: horaVal,
      hora_fin: nextHoraFin,
      actividad: act,
      // Destino elegido → lugar de salida (id_locacion) de la nueva parada
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

    if (createErr) {
      setSaving(false);
      setError(createErr.message || "No se pudo crear la parada");
      return;
    }

    // Explicitar tramo: hora_fin del actual = hora_inicio de la parada creada
    const decoded = decodeFimbaTrasladoDescripcion(currentEv.descripcion, {
      observaciones_equipaje: currentEv.observaciones_equipaje,
    });
    const { error: patchErr } = await patchFimbaEventoPlanilla(currentEv.id, {
      fecha: currentEv.fecha,
      hora_inicio: currentEv.hora_inicio,
      hora_fin: horaVal,
      actividad: decoded.actividad || currentEv.actividad || "",
      vuelo: decoded.vuelo || currentEv.vuelo || "",
      stripDestino: true,
    });
    if (patchErr) {
      setSaving(false);
      setError(
        patchErr.message ||
          "Parada creada, pero no se pudo fijar la hora fin del tramo anterior",
      );
      return;
    }

    setSaving(false);
    onSaved?.();
  };

  const hint = nextEv
    ? "Se insertará una parada entre esta fila y la siguiente del mismo vehículo. La Hora Fin de esta fila quedará en la hora inicio de la parada creada."
    : "Se creará la siguiente parada de este vehículo. La Hora Fin de esta fila quedará en la hora inicio de la parada creada.";

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
        <h2 id="fimba-destino-stop-title">Elegir destino creando evento</h2>
        <p className="fimba-muted" style={{ margin: "0 0 0.85rem", fontSize: "0.8rem" }}>
          {hint}
        </p>
        <form onSubmit={submit}>
          <div className="fimba-field">
            <label className="fimba-label">Destino (lugar de salida)</label>
            <LocationSelectWithCreate
              supabase={supabase}
              options={locationOptions}
              value={idLocacion}
              onChange={(v) => setIdLocacion(v || "")}
              onRefresh={refreshLocations}
              placeholder="Buscar locación…"
            />
            <p
              className="fimba-muted"
              style={{ margin: "0.25rem 0 0", fontSize: "0.72rem" }}
            >
              Locación de la nueva parada (`id_locacion`). No se guarda texto
              Destino: en el evento actual.
            </p>
          </div>

          <div className="fimba-field">
            <label className="fimba-label" htmlFor="fimba-destino-hora">
              Hora inicio (desde Hora Fin)
            </label>
            <input
              id="fimba-destino-hora"
              className="fimba-input"
              type="time"
              value={hora}
              onChange={(e) => setHora(e.target.value)}
              required
            />
            <span className="fimba-muted" style={{ fontSize: "0.75rem" }}>
              Prefill = Hora Fin del tramo actual
              {schedule.fecha
                ? ` · fecha ${String(schedule.fecha)
                    .slice(0, 10)
                    .split("-")
                    .reverse()
                    .join("/")}`
                : ""}
              {nextEv
                ? " (editable; si no había Hora Fin, se usó la hora com del next o midpoint)"
                : " (editable; sin Hora Fin ni next → actual + 30 min)"}
            </span>
          </div>

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
            />
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
              {saving ? "Guardando…" : "Crear evento destino"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
