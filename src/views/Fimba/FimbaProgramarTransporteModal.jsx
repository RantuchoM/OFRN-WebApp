import React, { useEffect, useMemo, useState } from "react";
import LocationSelectWithCreate from "../../components/forms/LocationSelectWithCreate";
import {
  IconBus,
  IconLoader,
  IconMapPin,
  IconX,
} from "../../components/ui/Icons";
import { supabase } from "../../services/supabase";
import { computeFimbaCapacity } from "../../services/fimbaService";
import {
  createProgrammedTransportJourney,
  rankVehiclesForProgrammedTrip,
} from "../../utils/fimbaProgramarTransporte";

function todayISO() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Headcount artista = cantidad_planificada; grupo OFRN = |integrantes|. */
function resolvePassengerHeadcount(kind, entity) {
  if (kind === "propuesta") {
    const n = computeFimbaCapacity(entity).tope_personas;
    return Math.max(1, n || 1);
  }
  if (kind === "grupo") {
    const n = (entity?.giras_grupos_integrantes || []).length;
    return Math.max(1, n || 1);
  }
  return 1;
}

/** Label dropdown: `Nombre · N`. */
function formatPassengerOptionLabel(name, headcount) {
  const base = String(name || "").trim() || "Sin nombre";
  const n = Math.max(0, Number(headcount) || 0);
  if (n > 0) return `${base} · ${n}`;
  return base;
}

/**
 * Wizard «Programar transporte»: form + ranking de vehículos + creación
 * de par de paradas (desde / hasta) con boarding.
 */
export default function FimbaProgramarTransporteModal({
  edicion,
  vehiculos = [],
  propuestas = [],
  giraGrupos = [],
  sequencesByVehicle,
  locationOptions = [],
  onRefreshLocations,
  onClose,
  onSaved,
}) {
  const [fechaSalida, setFechaSalida] = useState(todayISO);
  const [horaSalida, setHoraSalida] = useState("10:00");
  const [fechaLlegada, setFechaLlegada] = useState(todayISO);
  const [horaLlegada, setHoraLlegada] = useState("12:00");
  const [idLocSalida, setIdLocSalida] = useState("");
  const [idLocLlegada, setIdLocLlegada] = useState("");
  /** `p:ID` artista FIMBA · `g:ID` grupo OFRN */
  const [passengerKey, setPassengerKey] = useState("");
  const [cantidad, setCantidad] = useState("1");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setFechaLlegada((prev) => {
      if (!fechaSalida) return prev;
      if (!prev || prev < fechaSalida) return fechaSalida;
      return prev;
    });
  }, [fechaSalida]);

  const passengerOptions = useMemo(() => {
    const props = (propuestas || []).map((p) => {
      const name = p.nombre || `Artista #${p.id}`;
      const headcount = resolvePassengerHeadcount("propuesta", p);
      return {
        key: `p:${p.id}`,
        kind: "propuesta",
        id: p.id,
        name,
        headcount,
        label: formatPassengerOptionLabel(name, headcount),
        group: "Artistas FIMBA",
      };
    });
    const grupos = (giraGrupos || []).map((g) => {
      const name = g.nombre || `Grupo #${g.id}`;
      const headcount = resolvePassengerHeadcount("grupo", g);
      return {
        key: `g:${g.id}`,
        kind: "grupo",
        id: g.id,
        name,
        headcount,
        label: formatPassengerOptionLabel(name, headcount),
        group: "Grupos OFRN",
      };
    });
    return [...props, ...grupos];
  }, [propuestas, giraGrupos]);

  const selectedPassenger = useMemo(
    () => passengerOptions.find((o) => o.key === passengerKey) || null,
    [passengerOptions, passengerKey],
  );

  const handlePassengerChange = (key) => {
    setPassengerKey(key);
    if (!key) {
      setCantidad("1");
      return;
    }
    const opt = passengerOptions.find((o) => o.key === key);
    setCantidad(String(opt?.headcount || 1));
  };

  const ranked = useMemo(() => {
    if (!fechaSalida || !horaSalida || !fechaLlegada || !horaLlegada) return [];
    return rankVehiclesForProgrammedTrip({
      vehiculos,
      sequencesByVehicle,
      fechaSalida,
      horaSalida,
      fechaLlegada,
      horaLlegada,
      idLocSalida,
      idLocLlegada,
      cantidad: Math.max(1, Number(cantidad) || 1),
    });
  }, [
    vehiculos,
    sequencesByVehicle,
    fechaSalida,
    horaSalida,
    fechaLlegada,
    horaLlegada,
    idLocSalida,
    idLocLlegada,
    cantidad,
  ]);

  const formReady =
    Boolean(idLocSalida) &&
    Boolean(idLocLlegada) &&
    Boolean(fechaSalida) &&
    Boolean(horaSalida) &&
    Boolean(fechaLlegada) &&
    Boolean(horaLlegada) &&
    Boolean(selectedPassenger) &&
    Math.max(1, Number(cantidad) || 0) > 0;

  const handleSelectVehicle = async (offer) => {
    if (!formReady || !offer?.vehicleId || saving) return;
    setError(null);
    setSaving(true);
    const { desde, hasta, error: err } = await createProgrammedTransportJourney({
      idGira: edicion?.id_gira,
      vehicleId: offer.vehicleId,
      vehiculos,
      fechaSalida,
      horaSalida,
      idLocSalida,
      fechaLlegada,
      horaLlegada,
      idLocLlegada,
      passenger: {
        kind: selectedPassenger.kind,
        id: selectedPassenger.id,
        cantidad: Math.max(1, Number(cantidad) || 1),
        label: selectedPassenger.name,
      },
      giraGrupos,
    });
    setSaving(false);
    if (err) {
      setError(err.message || "No se pudo programar el transporte");
      if (desde?.id || hasta?.id) {
        onSaved?.({ desde, hasta, partial: true });
      }
      return;
    }
    onSaved?.({ desde, hasta, partial: false });
  };

  return (
    <div
      className="fimba-modal-backdrop"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="fimba-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="fimba-programar-transporte-title"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 720, width: "min(720px, 96vw)" }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
            marginBottom: "0.75rem",
          }}
        >
          <h2
            id="fimba-programar-transporte-title"
            style={{
              margin: 0,
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: "1.05rem",
              color: "var(--fimba-deep)",
            }}
          >
            <IconBus size={18} /> Programar transporte
          </h2>
          <button
            type="button"
            className="fimba-btn fimba-btn-ghost"
            onClick={onClose}
            aria-label="Cerrar"
            style={{ padding: "0.25rem 0.4rem" }}
          >
            <IconX size={16} />
          </button>
        </div>

        <p
          className="fimba-muted"
          style={{ margin: "0 0 0.85rem", fontSize: "0.8rem" }}
        >
          Indicá salida y llegada; elegí el vehículo más óptimo según su agenda.
          Se crean dos paradas (desde / hasta) con subida y bajada del
          artista/grupo.
        </p>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem",
          }}
        >
          <div className="fimba-prog-trip-row">
            <div className="fimba-field fimba-prog-loc">
              <label className="fimba-label">
                <IconMapPin size={12} style={{ display: "inline", marginRight: 4 }} />
                Locación de salida
              </label>
              <LocationSelectWithCreate
                supabase={supabase}
                options={locationOptions}
                value={idLocSalida}
                onChange={(v) => setIdLocSalida(v || "")}
                onRefresh={onRefreshLocations}
                placeholder="Buscar locación de salida…"
              />
            </div>
            <div className="fimba-field fimba-prog-fecha">
              <label className="fimba-label" htmlFor="fimba-prog-fecha-sal">
                Fecha salida
              </label>
              <input
                id="fimba-prog-fecha-sal"
                className="fimba-input"
                type="date"
                value={fechaSalida}
                onChange={(e) => setFechaSalida(e.target.value)}
              />
            </div>
            <div className="fimba-field fimba-prog-hora">
              <label className="fimba-label" htmlFor="fimba-prog-hora-sal">
                Hora salida
              </label>
              <input
                id="fimba-prog-hora-sal"
                className="fimba-input"
                type="time"
                value={horaSalida}
                onChange={(e) => setHoraSalida(e.target.value)}
              />
            </div>
          </div>

          <div className="fimba-prog-trip-row">
            <div className="fimba-field fimba-prog-loc">
              <label className="fimba-label">
                <IconMapPin size={12} style={{ display: "inline", marginRight: 4 }} />
                Locación de llegada
              </label>
              <LocationSelectWithCreate
                supabase={supabase}
                options={locationOptions}
                value={idLocLlegada}
                onChange={(v) => setIdLocLlegada(v || "")}
                onRefresh={onRefreshLocations}
                placeholder="Buscar locación de llegada…"
              />
            </div>
            <div className="fimba-field fimba-prog-fecha">
              <label className="fimba-label" htmlFor="fimba-prog-fecha-lleg">
                Fecha llegada
              </label>
              <input
                id="fimba-prog-fecha-lleg"
                className="fimba-input"
                type="date"
                value={fechaLlegada}
                min={fechaSalida || undefined}
                onChange={(e) => setFechaLlegada(e.target.value)}
              />
            </div>
            <div className="fimba-field fimba-prog-hora">
              <label className="fimba-label" htmlFor="fimba-prog-hora-lleg">
                Hora llegada
              </label>
              <input
                id="fimba-prog-hora-lleg"
                className="fimba-input"
                type="time"
                value={horaLlegada}
                onChange={(e) => setHoraLlegada(e.target.value)}
              />
            </div>
          </div>

          <div className="fimba-grid-2">
            <div className="fimba-field" style={{ marginBottom: 0 }}>
              <label className="fimba-label" htmlFor="fimba-prog-pax">
                Artista FIMBA / grupo OFRN
              </label>
              <select
                id="fimba-prog-pax"
                className="fimba-select"
                value={passengerKey}
                onChange={(e) => handlePassengerChange(e.target.value)}
              >
                <option value="">Seleccionar…</option>
                {passengerOptions.some((o) => o.kind === "propuesta") && (
                  <optgroup label="Artistas FIMBA">
                    {passengerOptions
                      .filter((o) => o.kind === "propuesta")
                      .map((o) => (
                        <option key={o.key} value={o.key}>
                          {o.label}
                        </option>
                      ))}
                  </optgroup>
                )}
                {passengerOptions.some((o) => o.kind === "grupo") && (
                  <optgroup label="Grupos OFRN">
                    {passengerOptions
                      .filter((o) => o.kind === "grupo")
                      .map((o) => (
                        <option key={o.key} value={o.key}>
                          {o.label}
                        </option>
                      ))}
                  </optgroup>
                )}
              </select>
            </div>
            <div className="fimba-field" style={{ marginBottom: 0 }}>
              <label className="fimba-label" htmlFor="fimba-prog-cant">
                Cantidad
              </label>
              <input
                id="fimba-prog-cant"
                className="fimba-input"
                type="number"
                min={1}
                step={1}
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value)}
              />
              {selectedPassenger?.kind === "grupo" ? (
                <span
                  className="fimba-muted"
                  style={{ fontSize: "0.7rem", display: "block", marginTop: 4 }}
                >
                  Grupo OFRN: sube/baja a los miembros vía regla Orquesta
                  (alcance Grupo). La cantidad es referencia; las plazas reales
                  salen del roster del grupo.
                </span>
              ) : null}
            </div>
          </div>
        </div>

        {error ? (
          <p className="fimba-error" style={{ margin: "0.75rem 0 0" }}>
            {error}
          </p>
        ) : null}

        <div style={{ marginTop: "1rem" }}>
          <h3
            style={{
              margin: "0 0 0.5rem",
              fontSize: "0.85rem",
              color: "var(--fimba-deep)",
            }}
          >
            Vehículos disponibles (óptimo primero)
          </h3>
          {!formReady ? (
            <p className="fimba-muted" style={{ fontSize: "0.8rem", margin: 0 }}>
              Completá locaciones, horarios y pasajero para ver ofertas.
            </p>
          ) : ranked.length === 0 ? (
            <p className="fimba-muted" style={{ fontSize: "0.8rem", margin: 0 }}>
              No hay vehículos en la flota.
            </p>
          ) : (
            <ul
              style={{
                listStyle: "none",
                margin: 0,
                padding: 0,
                display: "flex",
                flexDirection: "column",
                gap: 8,
                maxHeight: 280,
                overflowY: "auto",
              }}
            >
              {ranked.map((offer, idx) => (
                <li key={offer.vehicleId}>
                  <button
                    type="button"
                    className="fimba-btn"
                    disabled={saving}
                    onClick={() => handleSelectVehicle(offer)}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "0.65rem 0.75rem",
                      background: idx === 0 ? "rgba(148, 33, 109, 0.06)" : "#fff",
                      borderColor:
                        idx === 0
                          ? "var(--fimba-deep)"
                          : "var(--fimba-border)",
                      display: "flex",
                      flexDirection: "column",
                      gap: 4,
                      alignItems: "stretch",
                    }}
                  >
                    <span
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 8,
                        fontWeight: 700,
                        color: "var(--fimba-text)",
                      }}
                    >
                      <span>
                        {idx === 0 ? "★ " : ""}
                        {offer.label}
                      </span>
                      <span
                        className="fimba-muted"
                        style={{ fontWeight: 500, fontSize: "0.75rem" }}
                      >
                        {offer.libresEstimados != null
                          ? `${offer.libresEstimados} libres`
                          : "sin cap."}
                        {offer.gapCovers ? " · hueco OK" : ""}
                      </span>
                    </span>
                    <span
                      className="fimba-muted"
                      style={{ fontSize: "0.75rem", lineHeight: 1.35 }}
                    >
                      <strong style={{ color: "var(--fimba-text)" }}>
                        Origen:
                      </strong>{" "}
                      {offer.origenLabel || "Sin parada previa (agenda libre)"}
                      <br />
                      <strong style={{ color: "var(--fimba-text)" }}>
                        Siguiente destino:
                      </strong>{" "}
                      {offer.siguienteLabel ||
                        "Sin parada posterior (cola libre)"}
                    </span>
                    {offer.reasons?.length ? (
                      <span
                        className="fimba-muted"
                        style={{ fontSize: "0.68rem" }}
                      >
                        {offer.reasons.slice(0, 3).join(" · ")}
                      </span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {saving ? (
          <p
            className="fimba-muted"
            style={{
              margin: "0.75rem 0 0",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: "0.8rem",
            }}
          >
            <IconLoader size={14} className="animate-spin" /> Creando paradas…
          </p>
        ) : null}

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
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
        </div>
      </div>
    </div>
  );
}
