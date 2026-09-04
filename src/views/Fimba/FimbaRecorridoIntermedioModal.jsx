import React, { useMemo, useState } from "react";
import LocationSelectWithCreate from "../../components/forms/LocationSelectWithCreate";
import {
  IconDownload,
  IconLoader,
  IconMapPin,
  IconPlus,
  IconTag,
  IconUpload,
  IconX,
} from "../../components/ui/Icons";
import { computeFimbaCapacity } from "../../services/fimbaService";
import { supabase } from "../../services/supabase";
import {
  createRecorridoIntermedioStops,
  eventLocacionId,
  normalizeBoardingPassenger,
} from "../../utils/fimbaDestinoStopCreate";
import { formatEventLocation } from "../../utils/fimbaTransportBoarding";
import FimbaEventArtistasTagsPicker from "./FimbaEventArtistasTagsPicker";

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

function formatPassengerOptionLabel(name, headcount) {
  const base = String(name || "").trim() || "Sin nombre";
  const n = Math.max(0, Number(headcount) || 0);
  if (n > 0) return `${base} · ${n}`;
  return base;
}

function emptyBoard() {
  return { key: "", cantidad: "1" };
}

function boardFromUi(ui) {
  if (!ui?.key) return null;
  const [kindLetter, idStr] = String(ui.key).split(":");
  const kind = kindLetter === "g" ? "grupo" : "propuesta";
  return normalizeBoardingPassenger({
    kind,
    id: idStr,
    cantidad: ui.cantidad,
  });
}

/**
 * Celda compacta: select artista/grupo + plazas.
 * Colores = planilla Transportes (`.fimba-planilla-board-*`: verde ↑ / rosa ↓).
 */
function BoardingCompactCell({
  value,
  onChange,
  passengerOptions,
  disabled,
  ariaLabel,
  hint,
  direction,
}) {
  const isUp = direction === "up";
  const hasPeople = Boolean(value?.key);
  const Icon = isUp ? IconUpload : IconDownload;
  const emptyLabel = isUp ? "Asignar subida" : "Asignar bajada";
  const tone = isUp
    ? {
        border: hasPeople ? "#86efac" : "#e2e8f0",
        bg: hasPeople ? "rgba(220, 252, 231, 0.45)" : "#fff",
        head: "#166534",
      }
    : {
        border: hasPeople ? "#fda4af" : "#e2e8f0",
        bg: hasPeople ? "rgba(255, 228, 230, 0.45)" : "#fff",
        head: "#9f1239",
      };

  return (
    <div
      className="fimba-field fimba-planilla-board-cell"
      style={{
        margin: 0,
        borderColor: tone.border,
        background: tone.bg,
      }}
      title={hint || undefined}
    >
      <div
        className="fimba-planilla-board-head"
        style={{ color: tone.head }}
      >
        <Icon size={11} />
      </div>
      <select
        className="fimba-select"
        value={value?.key || ""}
        disabled={disabled}
        aria-label={ariaLabel}
        onChange={(e) => {
          const key = e.target.value;
          if (!key) {
            onChange(emptyBoard());
            return;
          }
          const opt = passengerOptions.find((o) => o.key === key);
          onChange({
            key,
            cantidad: String(opt?.headcount || value?.cantidad || 1),
          });
        }}
        style={{
          fontSize: "0.78rem",
          minHeight: 32,
          padding: "0.2rem 0.35rem",
          color: hasPeople ? undefined : tone.head,
        }}
      >
        <option value="">{emptyLabel}</option>
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
      {value?.key ? (
        <input
          className="fimba-input"
          type="number"
          min={1}
          step={1}
          value={value.cantidad}
          disabled={disabled}
          aria-label={`${ariaLabel} · plazas`}
          onChange={(e) =>
            onChange({ ...value, cantidad: e.target.value })
          }
          style={{
            fontSize: "0.78rem",
            minHeight: 28,
            padding: "0.15rem 0.35rem",
            width: "100%",
          }}
        />
      ) : null}
    </div>
  );
}

/**
 * Modal: planificar un recorrido ida-vuelta durante una pausa de vehículo.
 * Columnas: Detalle | Locación | Fecha | Hora | Subida | Bajada
 * + tags artistas/grupos compartidos para las 3 paradas.
 *
 * Boarding sugerido (flexible por fila):
 * - Ida: ↑ Salida · ↓ Llegada
 * - Vuelta: ↑ Llegada · ↓ Retorno
 */
export default function FimbaRecorridoIntermedioModal({
  context,
  edicion,
  vehiculos,
  propuestas = [],
  giraGrupos = [],
  locationOptions = [],
  onRefreshLocations,
  onClose,
  onSaved,
}) {
  const prevEv = context?.prevEv || null;
  const nextEv = context?.nextEv || null;
  const vehicleId = context?.vehicleId;
  const fechaSugerida =
    String(prevEv?.fecha || "").slice(0, 10) ||
    String(nextEv?.fecha || "").slice(0, 10) ||
    "";
  const idLocActual = eventLocacionId(prevEv);
  const locActualLabel = formatEventLocation(prevEv) || "(Sin locación)";

  const [detalleSalida, setDetalleSalida] = useState("Salida");
  const [detalleWaypoint, setDetalleWaypoint] = useState("Llegada");
  const [detalleRetorno, setDetalleRetorno] = useState("Retorno");
  const [fechaSalida, setFechaSalida] = useState(fechaSugerida);
  const [fechaWaypoint, setFechaWaypoint] = useState(fechaSugerida);
  const [fechaRetorno, setFechaRetorno] = useState(fechaSugerida);
  const [horaSalida, setHoraSalida] = useState("");
  const [horaWaypoint, setHoraWaypoint] = useState("");
  const [horaRetorno, setHoraRetorno] = useState("");
  const [idLocWaypoint, setIdLocWaypoint] = useState("");
  const [subidaSalida, setSubidaSalida] = useState(emptyBoard);
  const [bajadaSalida, setBajadaSalida] = useState(emptyBoard);
  const [subidaWaypoint, setSubidaWaypoint] = useState(emptyBoard);
  const [bajadaWaypoint, setBajadaWaypoint] = useState(emptyBoard);
  const [subidaRetorno, setSubidaRetorno] = useState(emptyBoard);
  const [bajadaRetorno, setBajadaRetorno] = useState(emptyBoard);
  const [idPropuestasTags, setIdPropuestasTags] = useState(
    () => [...(context?.idPropuestasTags || [])].map(Number).filter(Number.isFinite),
  );
  const [idGruposTags, setIdGruposTags] = useState(
    () => [...(context?.idGruposTags || [])].map(Number).filter(Number.isFinite),
  );
  const [audienciaOfrn, setAudienciaOfrn] = useState(
    () => context?.audienciaOfrn || "none",
  );
  const [tagsPickerOpen, setTagsPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

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
      };
    });
    return [...props, ...grupos];
  }, [propuestas, giraGrupos]);

  const draftEventoForTags = useMemo(() => {
    const propObjs = idPropuestasTags
      .map((id) => (propuestas || []).find((p) => Number(p.id) === Number(id)))
      .filter(Boolean)
      .map((p) => ({ id: p.id, nombre: p.nombre, color: p.color }));
    const grupoObjs = idGruposTags
      .map((id) => (giraGrupos || []).find((g) => Number(g.id) === Number(id)))
      .filter(Boolean)
      .map((g) => ({ id: g.id, nombre: g.nombre, color: g.color }));
    return {
      id: null,
      actividad: "Recorrido intermedio (borrador)",
      propuestas: propObjs,
      grupos: grupoObjs,
      audiencia_ofrn: audienciaOfrn,
    };
  }, [
    idPropuestasTags,
    idGruposTags,
    audienciaOfrn,
    propuestas,
    giraGrupos,
  ]);

  const tagChips = useMemo(() => {
    const chips = [];
    for (const id of idPropuestasTags) {
      const p = (propuestas || []).find((x) => Number(x.id) === Number(id));
      chips.push({
        key: `p:${id}`,
        label: p?.nombre || `Artista #${id}`,
        color: p?.color || null,
      });
    }
    if (audienciaOfrn === "tutti") {
      chips.push({ key: "tutti", label: "Tutti", color: "#0369a1" });
    }
    if (audienciaOfrn === "grupos") {
      for (const id of idGruposTags) {
        const g = (giraGrupos || []).find((x) => Number(x.id) === Number(id));
        chips.push({
          key: `g:${id}`,
          label: g?.nombre || `Grupo #${id}`,
          color: g?.color || "#0369a1",
        });
      }
    }
    return chips;
  }, [
    idPropuestasTags,
    idGruposTags,
    audienciaOfrn,
    propuestas,
    giraGrupos,
  ]);

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
    if (!fechaSalida || !fechaWaypoint || !fechaRetorno) {
      setError("Completá las tres fechas del recorrido");
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
    if (!String(detalleSalida || "").trim() || !String(detalleWaypoint || "").trim() || !String(detalleRetorno || "").trim()) {
      setError("Completá el detalle de las tres paradas");
      return;
    }

    const toMs = (fecha, hora) => {
      const [y, m, d] = String(fecha).split("-").map(Number);
      const [hh, mm] = String(hora).slice(0, 5).split(":").map(Number);
      return new Date(y, m - 1, d, hh || 0, mm || 0, 0, 0).getTime();
    };
    const t1 = toMs(fechaSalida, horaSalida);
    const t2 = toMs(fechaWaypoint, horaWaypoint);
    const t3 = toMs(fechaRetorno, horaRetorno);
    if (!(t1 < t2 && t2 < t3)) {
      setError(
        "Fecha y hora deben ir en orden: salida < intermedia < retorno",
      );
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
        idGruposTags: audienciaOfrn === "grupos" ? idGruposTags : [],
        audienciaOfrn,
        detalleSalida,
        detalleWaypoint,
        detalleRetorno,
        fechaSalida,
        fechaWaypoint,
        fechaRetorno,
        horaSalida,
        horaWaypoint,
        horaRetorno,
        idLocacionActual: idLocActual,
        idLocacionWaypoint: idLocWaypoint,
        boardingSalida: {
          subida: boardFromUi(subidaSalida),
          bajada: boardFromUi(bajadaSalida),
        },
        boardingWaypoint: {
          subida: boardFromUi(subidaWaypoint),
          bajada: boardFromUi(bajadaWaypoint),
        },
        boardingRetorno: {
          subida: boardFromUi(subidaRetorno),
          bajada: boardFromUi(bajadaRetorno),
        },
      });
      if (err) {
        setError(err.message || "No se pudo crear el recorrido intermedio");
        if (eventos?.length) onSaved?.(eventos, { partial: true });
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

  const labelStyle = { margin: 0, fontSize: "0.72rem" };
  const boardThStyle = {
    ...labelStyle,
    padding: "0.28rem 0.4rem",
    borderRadius: 8,
    textAlign: "center",
    fontWeight: 800,
  };

  return (
    <div className="fimba-modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="fimba-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="fimba-recorrido-intermedio-title"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 1080, width: "min(1080px, 98vw)" }}
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
          Completá detalle, horas, tags y (opcional) subida/bajada por parada.
        </p>

        <form onSubmit={submit}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "minmax(5.5rem, 0.7fr) minmax(0, 1.35fr) minmax(6.5rem, 0.55fr) minmax(5rem, 0.45fr) minmax(7rem, 0.85fr) minmax(7rem, 0.85fr)",
              gap: "0.45rem 0.5rem",
              alignItems: "end",
            }}
          >
            <span className="fimba-label" style={labelStyle}>
              Detalle
            </span>
            <span className="fimba-label" style={labelStyle}>
              Locación
            </span>
            <span className="fimba-label" style={labelStyle}>
              Fecha
            </span>
            <span className="fimba-label" style={labelStyle}>
              Hora
            </span>
            <span
              className="fimba-label fimba-planilla-board-th-up"
              style={boardThStyle}
              title="Sugerido en Salida (ida) y Llegada (vuelta)"
            >
              Subida
            </span>
            <span
              className="fimba-label fimba-planilla-board-th-down"
              style={boardThStyle}
              title="Sugerido en Llegada (ida) y Retorno (vuelta)"
            >
              Bajada
            </span>

            {/* Row 1 — salida */}
            <div className="fimba-field" style={{ margin: 0 }}>
              <input
                className="fimba-input"
                type="text"
                value={detalleSalida}
                onChange={(e) => setDetalleSalida(e.target.value)}
                required
                aria-label="Detalle salida"
                disabled={saving}
                placeholder="Salida"
              />
            </div>
            <div className="fimba-field" style={{ margin: 0 }}>
              {locLocked}
            </div>
            <div className="fimba-field" style={{ margin: 0 }}>
              <input
                className="fimba-input"
                type="date"
                value={fechaSalida}
                onChange={(e) => setFechaSalida(e.target.value)}
                required
                aria-label="Fecha de salida"
                disabled={saving}
              />
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
            <BoardingCompactCell
              value={subidaSalida}
              onChange={setSubidaSalida}
              passengerOptions={passengerOptions}
              disabled={saving}
              direction="up"
              ariaLabel="Subida en salida"
              hint="Ida típica: subir aquí"
            />
            <BoardingCompactCell
              value={bajadaSalida}
              onChange={setBajadaSalida}
              passengerOptions={passengerOptions}
              disabled={saving}
              direction="down"
              ariaLabel="Bajada en salida"
            />

            {/* Row 2 — waypoint / llegada */}
            <div className="fimba-field" style={{ margin: 0 }}>
              <input
                className="fimba-input"
                type="text"
                value={detalleWaypoint}
                onChange={(e) => setDetalleWaypoint(e.target.value)}
                required
                aria-label="Detalle llegada"
                disabled={saving}
                placeholder="Llegada"
              />
            </div>
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
              <input
                className="fimba-input"
                type="date"
                value={fechaWaypoint}
                min={fechaSalida || undefined}
                onChange={(e) => setFechaWaypoint(e.target.value)}
                required
                aria-label="Fecha en waypoint"
                disabled={saving}
              />
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
            <BoardingCompactCell
              value={subidaWaypoint}
              onChange={setSubidaWaypoint}
              passengerOptions={passengerOptions}
              disabled={saving}
              direction="up"
              ariaLabel="Subida en llegada"
              hint="Vuelta típica: subir aquí"
            />
            <BoardingCompactCell
              value={bajadaWaypoint}
              onChange={setBajadaWaypoint}
              passengerOptions={passengerOptions}
              disabled={saving}
              direction="down"
              ariaLabel="Bajada en llegada"
              hint="Ida típica: bajar aquí"
            />

            {/* Row 3 — retorno */}
            <div className="fimba-field" style={{ margin: 0 }}>
              <input
                className="fimba-input"
                type="text"
                value={detalleRetorno}
                onChange={(e) => setDetalleRetorno(e.target.value)}
                required
                aria-label="Detalle retorno"
                disabled={saving}
                placeholder="Retorno"
              />
            </div>
            <div className="fimba-field" style={{ margin: 0 }}>
              {locLocked}
            </div>
            <div className="fimba-field" style={{ margin: 0 }}>
              <input
                className="fimba-input"
                type="date"
                value={fechaRetorno}
                min={fechaWaypoint || fechaSalida || undefined}
                onChange={(e) => setFechaRetorno(e.target.value)}
                required
                aria-label="Fecha de retorno"
                disabled={saving}
              />
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
            <BoardingCompactCell
              value={subidaRetorno}
              onChange={setSubidaRetorno}
              passengerOptions={passengerOptions}
              disabled={saving}
              direction="up"
              ariaLabel="Subida en retorno"
            />
            <BoardingCompactCell
              value={bajadaRetorno}
              onChange={setBajadaRetorno}
              passengerOptions={passengerOptions}
              disabled={saving}
              direction="down"
              ariaLabel="Bajada en retorno"
              hint="Vuelta típica: bajar aquí"
            />
          </div>

          <div
            style={{
              marginTop: "0.85rem",
              padding: "0.65rem 0.75rem",
              borderRadius: 8,
              border: "1px solid var(--fimba-border, #e2e8f0)",
              background: "rgba(246, 248, 251, 0.8)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
                marginBottom: 6,
              }}
            >
              <label
                className="fimba-label"
                style={{ margin: 0, display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                <IconTag size={13} style={{ color: "var(--fimba-accent)" }} />
                Tags artistas / grupos
                <span className="fimba-muted" style={{ fontWeight: 400, fontSize: "0.72rem" }}>
                  (compartidos · 3 paradas)
                </span>
              </label>
              <button
                type="button"
                className="fimba-btn fimba-btn-ghost"
                disabled={saving}
                onClick={() => setTagsPickerOpen(true)}
                style={{
                  padding: "0.15rem 0.45rem",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  color: "var(--fimba-cyan, #0e7490)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <IconPlus size={12} aria-hidden />
                {tagChips.length ? "Editar" : "Agregar"}
              </button>
            </div>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 4,
                alignItems: "center",
                minHeight: "1.5rem",
              }}
            >
              {tagChips.length === 0 ? (
                <span className="fimba-muted" style={{ fontSize: "0.75rem" }}>
                  Sin tags — visible en toda la edición (heredados del evento previo si había).
                </span>
              ) : (
                tagChips.map((c) => (
                  <span
                    key={c.key}
                    className="fimba-badge"
                    style={{
                      background: c.color ? `${c.color}22` : undefined,
                      color: c.color || undefined,
                    }}
                  >
                    {c.label}
                  </span>
                ))
              )}
            </div>
          </div>

          <p
            className="fimba-muted"
            style={{ margin: "0.65rem 0 0", fontSize: "0.72rem" }}
          >
            Pausado en {locActualLabel}
            {fechaSugerida ? ` · ${formatFechaLabel(fechaSugerida)}` : ""}
            {nextEv?.hora_inicio
              ? ` · siguiente evento ${String(nextEv.hora_inicio).slice(0, 5)}`
              : ""}
            {" · "}
            Boarding tip: ↑ salida / ↓ llegada (ida); ↑ llegada / ↓ retorno (vuelta).
            Grupo OFRN = reserva técnica en la parada de subida.
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

        <FimbaEventArtistasTagsPicker
          open={tagsPickerOpen}
          evento={draftEventoForTags}
          propuestas={propuestas}
          giraGrupos={giraGrupos}
          edicion={edicion}
          draftMode
          onClose={() => setTagsPickerOpen(false)}
          onApply={(tags) => {
            setIdPropuestasTags(
              (tags?.id_propuestas || [])
                .map(Number)
                .filter((n) => Number.isFinite(n) && n > 0),
            );
            const ao = ["none", "tutti", "grupos"].includes(tags?.audiencia_ofrn)
              ? tags.audiencia_ofrn
              : "none";
            setAudienciaOfrn(ao);
            setIdGruposTags(
              ao === "grupos"
                ? (tags?.id_grupos || [])
                    .map(Number)
                    .filter((n) => Number.isFinite(n) && n > 0)
                : [],
            );
          }}
        />
      </div>
    </div>
  );
}
