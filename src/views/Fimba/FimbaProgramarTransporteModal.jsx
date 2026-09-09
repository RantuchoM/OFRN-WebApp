import React, { useEffect, useMemo, useState } from "react";
import LocationSelectWithCreate from "../../components/forms/LocationSelectWithCreate";
import {
  IconArrowLeft,
  IconArrowRight,
  IconBus,
  IconCheck,
  IconClock,
  IconLoader,
  IconMapPin,
  IconX,
} from "../../components/ui/Icons";
import { supabase } from "../../services/supabase";
import { computeFimbaCapacity } from "../../services/fimbaService";
import {
  buildProgrammedTripOptionalLegDefaults,
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

function emptyOptionalLeg() {
  return { enabled: false, idLocacion: "", fecha: "", hora: "" };
}

/**
 * Wizard «Programar transporte»: form + ranking de vehículos + confirmación
 * guiada (piernas opcionales anterior/siguiente) antes de crear 2–4 paradas.
 *
 * `initialSeed` (Agenda → ancla en evento): prefills salida/llegada/pasajero
 * sin crear nada al abrir.
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
  initialSeed = null,
}) {
  const seed = initialSeed && typeof initialSeed === "object" ? initialSeed : null;
  const [fechaSalida, setFechaSalida] = useState(
    () => seed?.fechaSalida || todayISO(),
  );
  const [horaSalida, setHoraSalida] = useState(
    () => seed?.horaSalida || "10:00",
  );
  const [fechaLlegada, setFechaLlegada] = useState(
    () => seed?.fechaLlegada || todayISO(),
  );
  const [horaLlegada, setHoraLlegada] = useState(
    () => seed?.horaLlegada || "12:00",
  );
  const [idLocSalida, setIdLocSalida] = useState(
    () => (seed?.idLocSalida != null ? String(seed.idLocSalida) : ""),
  );
  const [idLocLlegada, setIdLocLlegada] = useState(
    () => (seed?.idLocLlegada != null ? String(seed.idLocLlegada) : ""),
  );
  /** `p:ID` artista FIMBA · `g:ID` grupo OFRN */
  const [passengerKey, setPassengerKey] = useState(
    () => seed?.passengerKey || "",
  );
  const [cantidad, setCantidad] = useState("1");
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [legAnterior, setLegAnterior] = useState(emptyOptionalLeg);
  const [legSiguiente, setLegSiguiente] = useState(emptyOptionalLeg);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Headcount al abrir con seed de artista (sin esperar onChange del select).
  useEffect(() => {
    if (!seed?.passengerKey) return;
    const kind = String(seed.passengerKey).startsWith("g:")
      ? "grupo"
      : "propuesta";
    const id = Number(String(seed.passengerKey).slice(2));
    if (!Number.isFinite(id)) return;
    const entity =
      kind === "grupo"
        ? (giraGrupos || []).find((g) => Number(g.id) === id)
        : (propuestas || []).find((p) => Number(p.id) === id);
    if (!entity) return;
    setCantidad(String(resolvePassengerHeadcount(kind, entity)));
    // Solo al montar con seed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setFechaLlegada((prev) => {
      if (!fechaSalida) return prev;
      if (!prev || prev < fechaSalida) return fechaSalida;
      return prev;
    });
  }, [fechaSalida]);

  // Si cambia el viaje principal, invalidar selección de vehículo / piernas.
  useEffect(() => {
    setSelectedOffer(null);
    setLegAnterior(emptyOptionalLeg());
    setLegSiguiente(emptyOptionalLeg());
    setError(null);
  }, [
    fechaSalida,
    horaSalida,
    fechaLlegada,
    horaLlegada,
    idLocSalida,
    idLocLlegada,
    passengerKey,
    cantidad,
  ]);

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

  const plannedStopCount =
    2 + (legAnterior.enabled ? 1 : 0) + (legSiguiente.enabled ? 1 : 0);

  const handleSelectVehicle = (offer) => {
    if (!formReady || !offer?.vehicleId || saving) return;
    setError(null);
    const defaults = buildProgrammedTripOptionalLegDefaults({
      fechaSalida,
      horaSalida,
      fechaLlegada,
      horaLlegada,
      idLocSalida,
      origen: offer.origen || null,
      siguiente: offer.siguiente || null,
    });
    setSelectedOffer(offer);
    // Defaults editables al habilitar; piernas off hasta que el usuario las active.
    setLegAnterior({
      enabled: false,
      idLocacion: defaults.anterior.idLocacion,
      fecha: defaults.anterior.fecha,
      hora: defaults.anterior.hora,
    });
    setLegSiguiente({
      enabled: false,
      idLocacion: defaults.siguiente.idLocacion,
      fecha: defaults.siguiente.fecha,
      hora: defaults.siguiente.hora,
    });
  };

  const toggleLegAnterior = (enabled) => {
    if (!enabled) {
      setLegAnterior((prev) => ({ ...prev, enabled: false }));
      return;
    }
    const defaults = buildProgrammedTripOptionalLegDefaults({
      fechaSalida,
      horaSalida,
      fechaLlegada,
      horaLlegada,
      idLocSalida,
      origen: selectedOffer?.origen || null,
      siguiente: selectedOffer?.siguiente || null,
    });
    setLegAnterior((prev) => ({
      enabled: true,
      idLocacion: prev.idLocacion || defaults.anterior.idLocacion,
      fecha: prev.fecha || defaults.anterior.fecha,
      hora: prev.hora || defaults.anterior.hora,
    }));
  };

  const toggleLegSiguiente = (enabled) => {
    if (!enabled) {
      setLegSiguiente((prev) => ({ ...prev, enabled: false }));
      return;
    }
    const defaults = buildProgrammedTripOptionalLegDefaults({
      fechaSalida,
      horaSalida,
      fechaLlegada,
      horaLlegada,
      idLocSalida,
      origen: selectedOffer?.origen || null,
      siguiente: selectedOffer?.siguiente || null,
    });
    setLegSiguiente((prev) => ({
      enabled: true,
      idLocacion: prev.idLocacion || defaults.siguiente.idLocacion,
      fecha: prev.fecha || defaults.siguiente.fecha,
      hora: prev.hora || defaults.siguiente.hora,
    }));
  };

  const handleConfirm = async () => {
    if (!formReady || !selectedOffer?.vehicleId || saving) return;
    if (legAnterior.enabled) {
      if (!legAnterior.idLocacion || !legAnterior.fecha || !legAnterior.hora) {
        setError(
          "Movimiento anterior: completá locación, fecha y hora, o desmarcalo",
        );
        return;
      }
    }
    if (legSiguiente.enabled) {
      if (
        !legSiguiente.idLocacion ||
        !legSiguiente.fecha ||
        !legSiguiente.hora
      ) {
        setError(
          "Movimiento siguiente: completá locación, fecha y hora, o desmarcalo",
        );
        return;
      }
    }

    setError(null);
    setSaving(true);
    const result = await createProgrammedTransportJourney({
      idGira: edicion?.id_gira,
      vehicleId: selectedOffer.vehicleId,
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
      movimientoAnterior: legAnterior,
      movimientoSiguiente: legSiguiente,
    });
    setSaving(false);
    if (result.error) {
      setError(result.error.message || "No se pudo programar el transporte");
      if (result.eventos?.length) {
        onSaved?.({
          ...result,
          partial: true,
        });
      }
      return;
    }
    onSaved?.({ ...result, partial: false });
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
          {seed?.anchorEventId != null ? (
            <>
              Prefill desde Agenda: llegada a la locación del evento (por
              defecto 30′ antes del inicio). Completá la salida si falta,
              elegí vehículo y confirmá — nada se crea al abrir.
            </>
          ) : (
            <>
              Indicá salida y llegada; elegí un vehículo. Al seleccionarlo podés
              sumar un movimiento anterior y/o siguiente (hasta 4 paradas). Nada
              se crea hasta confirmar.
            </>
          )}
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
                disabled={saving}
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
                disabled={saving}
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
                disabled={saving}
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
                disabled={saving}
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
                disabled={saving}
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
                disabled={saving}
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
                maxHeight: selectedOffer ? 160 : 280,
                overflowY: "auto",
              }}
            >
              {ranked.map((offer, idx) => {
                const isSelected =
                  selectedOffer &&
                  Number(selectedOffer.vehicleId) === Number(offer.vehicleId);
                return (
                  <li key={offer.vehicleId}>
                    <button
                      type="button"
                      className="fimba-btn"
                      disabled={saving}
                      onClick={() => handleSelectVehicle(offer)}
                      aria-pressed={isSelected}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        padding: "0.65rem 0.75rem",
                        background: isSelected
                          ? "rgba(148, 33, 109, 0.1)"
                          : idx === 0
                            ? "rgba(148, 33, 109, 0.06)"
                            : "#fff",
                        borderColor: isSelected
                          ? "var(--fimba-deep)"
                          : idx === 0
                            ? "var(--fimba-deep)"
                            : "var(--fimba-border)",
                        borderWidth: isSelected ? 2 : 1,
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
                          {isSelected ? "✓ " : idx === 0 ? "★ " : ""}
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
                );
              })}
            </ul>
          )}
        </div>

        {selectedOffer ? (
          <div
            style={{
              marginTop: "1rem",
              padding: "0.85rem",
              border: "1px solid var(--fimba-border)",
              borderRadius: 8,
              background: "rgba(148, 33, 109, 0.03)",
              display: "flex",
              flexDirection: "column",
              gap: "0.75rem",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <strong
                style={{
                  fontSize: "0.85rem",
                  color: "var(--fimba-deep)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <IconBus size={14} /> {selectedOffer.label}
              </strong>
              <span className="fimba-muted" style={{ fontSize: "0.75rem" }}>
                Se crearán {plannedStopCount} parada
                {plannedStopCount === 1 ? "" : "s"} al confirmar
              </span>
            </div>

            <p
              className="fimba-muted"
              style={{ margin: 0, fontSize: "0.75rem", lineHeight: 1.4 }}
            >
              Viaje principal (siempre): salida → llegada con subida/bajada.
              Opcional: reposicionar el vehículo antes y/o después.
            </p>

            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: "0.85rem",
                fontWeight: 600,
                color: "var(--fimba-text)",
                cursor: saving ? "default" : "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={legAnterior.enabled}
                disabled={saving}
                onChange={(e) => toggleLegAnterior(e.target.checked)}
              />
              <IconArrowLeft size={14} />
              Movimiento anterior
              <span
                className="fimba-muted"
                style={{ fontWeight: 400, fontSize: "0.72rem" }}
              >
                ¿de dónde sale y a qué hora?
              </span>
            </label>
            {legAnterior.enabled ? (
              <div className="fimba-prog-trip-row">
                <div className="fimba-field fimba-prog-loc">
                  <label className="fimba-label">
                    <IconMapPin
                      size={12}
                      style={{ display: "inline", marginRight: 4 }}
                    />
                    Locación de origen
                  </label>
                  <LocationSelectWithCreate
                    supabase={supabase}
                    options={locationOptions}
                    value={legAnterior.idLocacion}
                    onChange={(v) =>
                      setLegAnterior((prev) => ({
                        ...prev,
                        idLocacion: v || "",
                      }))
                    }
                    onRefresh={onRefreshLocations}
                    placeholder="¿De dónde sale el vehículo?"
                  />
                </div>
                <div className="fimba-field fimba-prog-fecha">
                  <label className="fimba-label" htmlFor="fimba-prog-ant-fecha">
                    Fecha
                  </label>
                  <input
                    id="fimba-prog-ant-fecha"
                    className="fimba-input"
                    type="date"
                    value={legAnterior.fecha}
                    onChange={(e) =>
                      setLegAnterior((prev) => ({
                        ...prev,
                        fecha: e.target.value,
                      }))
                    }
                    disabled={saving}
                  />
                </div>
                <div className="fimba-field fimba-prog-hora">
                  <label className="fimba-label" htmlFor="fimba-prog-ant-hora">
                    <IconClock
                      size={12}
                      style={{ display: "inline", marginRight: 4 }}
                    />
                    Hora
                  </label>
                  <input
                    id="fimba-prog-ant-hora"
                    className="fimba-input"
                    type="time"
                    value={legAnterior.hora}
                    onChange={(e) =>
                      setLegAnterior((prev) => ({
                        ...prev,
                        hora: e.target.value,
                      }))
                    }
                    disabled={saving}
                  />
                </div>
              </div>
            ) : null}

            <div
              style={{
                padding: "0.5rem 0.65rem",
                borderRadius: 6,
                background: "#fff",
                border: "1px dashed var(--fimba-border)",
                fontSize: "0.78rem",
                color: "var(--fimba-text)",
              }}
            >
              <strong>Viaje principal</strong>
              <div className="fimba-muted" style={{ marginTop: 4 }}>
                Salida {horaSalida} → Llegada {horaLlegada} · ↑/↓ del
                artista/grupo
              </div>
            </div>

            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: "0.85rem",
                fontWeight: 600,
                color: "var(--fimba-text)",
                cursor: saving ? "default" : "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={legSiguiente.enabled}
                disabled={saving}
                onChange={(e) => toggleLegSiguiente(e.target.checked)}
              />
              <IconArrowRight size={14} />
              Movimiento siguiente
              <span
                className="fimba-muted"
                style={{ fontWeight: 400, fontSize: "0.72rem" }}
              >
                ¿a dónde vuelve y a qué hora llega?
              </span>
            </label>
            {legSiguiente.enabled ? (
              <div className="fimba-prog-trip-row">
                <div className="fimba-field fimba-prog-loc">
                  <label className="fimba-label">
                    <IconMapPin
                      size={12}
                      style={{ display: "inline", marginRight: 4 }}
                    />
                    Locación de destino
                  </label>
                  <LocationSelectWithCreate
                    supabase={supabase}
                    options={locationOptions}
                    value={legSiguiente.idLocacion}
                    onChange={(v) =>
                      setLegSiguiente((prev) => ({
                        ...prev,
                        idLocacion: v || "",
                      }))
                    }
                    onRefresh={onRefreshLocations}
                    placeholder="¿A dónde vuelve / continúa?"
                  />
                </div>
                <div className="fimba-field fimba-prog-fecha">
                  <label className="fimba-label" htmlFor="fimba-prog-sig-fecha">
                    Fecha
                  </label>
                  <input
                    id="fimba-prog-sig-fecha"
                    className="fimba-input"
                    type="date"
                    value={legSiguiente.fecha}
                    min={fechaLlegada || undefined}
                    onChange={(e) =>
                      setLegSiguiente((prev) => ({
                        ...prev,
                        fecha: e.target.value,
                      }))
                    }
                    disabled={saving}
                  />
                </div>
                <div className="fimba-field fimba-prog-hora">
                  <label className="fimba-label" htmlFor="fimba-prog-sig-hora">
                    <IconClock
                      size={12}
                      style={{ display: "inline", marginRight: 4 }}
                    />
                    Hora llegada
                  </label>
                  <input
                    id="fimba-prog-sig-hora"
                    className="fimba-input"
                    type="time"
                    value={legSiguiente.hora}
                    onChange={(e) =>
                      setLegSiguiente((prev) => ({
                        ...prev,
                        hora: e.target.value,
                      }))
                    }
                    disabled={saving}
                  />
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

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
            <IconLoader size={14} className="animate-spin" /> Creando{" "}
            {plannedStopCount} parada{plannedStopCount === 1 ? "" : "s"}…
          </p>
        ) : null}

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
            marginTop: "1rem",
            flexWrap: "wrap",
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
          {selectedOffer ? (
            <button
              type="button"
              className="fimba-btn fimba-btn-primary"
              onClick={handleConfirm}
              disabled={saving || !formReady}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <IconCheck size={14} />
              Confirmar ({plannedStopCount})
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
