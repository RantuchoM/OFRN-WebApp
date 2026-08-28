import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { IconCalendar, IconLoader } from "../../components/ui/Icons";
import {
  upsertFimbaVenueInfo,
  updateLocacionBasics,
} from "../../services/fimbaService";

function statusMeta(status) {
  switch (status) {
    case "saving":
      return { cls: "fimba-sync-saving", title: "Guardando…", label: "Guardando" };
    case "dirty":
      return { cls: "fimba-sync-pending", title: "Cambios pendientes", label: "Pendiente" };
    case "saved":
      return { cls: "fimba-sync-saved", title: "Guardado", label: "Guardado" };
    case "error":
      return { cls: "fimba-sync-error", title: "Error al guardar", label: "Error" };
    default:
      return { cls: "fimba-sync-idle", title: "Sincronizado", label: "" };
  }
}

function draftFromVenue(locacion, venueInfo) {
  return {
    nombre: locacion?.nombre || "",
    direccion: locacion?.direccion || "",
    referente_nombre: venueInfo?.referente_nombre || "",
    referente_telefono: venueInfo?.referente_telefono || "",
    rider_disponible: venueInfo?.rider_disponible || "",
    sillas_disponibles: venueInfo?.sillas_disponibles || "",
    agua: venueInfo?.agua || "",
    observaciones: venueInfo?.observaciones || "",
  };
}

function patchFromDraft(draft) {
  return {
    referente_nombre: draft.referente_nombre,
    referente_telefono: draft.referente_telefono,
    rider_disponible: draft.rider_disponible,
    sillas_disponibles: draft.sillas_disponibles,
    agua: draft.agua,
    observaciones: draft.observaciones,
  };
}

function draftsEqual(a, b) {
  return (
    String(a.nombre ?? "") === String(b.nombre ?? "") &&
    String(a.direccion ?? "") === String(b.direccion ?? "") &&
    String(a.referente_nombre ?? "") === String(b.referente_nombre ?? "") &&
    String(a.referente_telefono ?? "") === String(b.referente_telefono ?? "") &&
    String(a.rider_disponible ?? "") === String(b.rider_disponible ?? "") &&
    String(a.sillas_disponibles ?? "") === String(b.sillas_disponibles ?? "") &&
    String(a.agua ?? "") === String(b.agua ?? "") &&
    String(a.observaciones ?? "") === String(b.observaciones ?? "")
  );
}

function ReadOnlyField({ label, value, multiline = false }) {
  const empty = !value?.trim();
  return (
    <div className="fimba-field">
      <span className="fimba-label">{label}</span>
      {empty ? (
        <span className="fimba-muted" style={{ fontSize: "0.82rem", fontStyle: "italic" }}>
          —
        </span>
      ) : multiline ? (
        <p style={{ margin: 0, fontSize: "0.82rem", whiteSpace: "pre-wrap" }}>{value}</p>
      ) : (
        <span style={{ fontSize: "0.82rem" }}>{value}</span>
      )}
    </div>
  );
}

/**
 * Campos operativos de venue FIMBA (por edición + locación).
 * Editable con `canEdit` (!readOnly staff). Autosave debounced + semáforo.
 */
export default function FimbaVenueInfoSection({
  edicionId,
  locacion,
  venueInfo,
  canEdit,
  onSaved,
  agendaHref,
}) {
  const locId = locacion?.id;
  const [draft, setDraft] = useState(() => draftFromVenue(locacion, venueInfo));
  const [saveStatus, setSaveStatus] = useState("idle");
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const lastSavedRef = useRef(draftFromVenue(locacion, venueInfo));
  const saveTimerRef = useRef(null);
  const savingRef = useRef(false);
  const pendingSaveRef = useRef(false);
  const locIdRef = useRef(locId);
  const onSavedRef = useRef(onSaved);
  onSavedRef.current = onSaved;

  useEffect(() => {
    if (locId === locIdRef.current && locIdRef.current != null) return;
    locIdRef.current = locId;
    const d = draftFromVenue(locacion, venueInfo);
    setDraft(d);
    draftRef.current = d;
    lastSavedRef.current = d;
    setSaveStatus("idle");
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
  }, [locId, locacion, venueInfo]);

  useEffect(() => {
    if (saveStatus !== "saved") return undefined;
    const t = setTimeout(() => {
      setSaveStatus((s) => (s === "saved" ? "idle" : s));
    }, 2200);
    return () => clearTimeout(t);
  }, [saveStatus]);

  useEffect(
    () => () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    },
    [],
  );

  const commit = useCallback(async () => {
    if (!canEdit || locId == null || edicionId == null) return;
    if (savingRef.current) {
      pendingSaveRef.current = true;
      return;
    }

    const current = draftRef.current;
    const saved = lastSavedRef.current;

    if (draftsEqual(current, saved)) {
      setSaveStatus("idle");
      return;
    }

    savingRef.current = true;
    setSaveStatus("saving");

    try {
      const locChanged =
        String(current.nombre ?? "") !== String(saved.nombre ?? "") ||
        String(current.direccion ?? "") !== String(saved.direccion ?? "");

      if (locChanged) {
        const { error: eLoc } = await updateLocacionBasics(locId, {
          nombre: current.nombre,
          direccion: current.direccion,
        });
        if (eLoc) throw eLoc;
      }

      const infoChanged =
        String(current.referente_nombre ?? "") !== String(saved.referente_nombre ?? "") ||
        String(current.referente_telefono ?? "") !== String(saved.referente_telefono ?? "") ||
        String(current.rider_disponible ?? "") !== String(saved.rider_disponible ?? "") ||
        String(current.sillas_disponibles ?? "") !== String(saved.sillas_disponibles ?? "") ||
        String(current.agua ?? "") !== String(saved.agua ?? "") ||
        String(current.observaciones ?? "") !== String(saved.observaciones ?? "");

      if (infoChanged) {
        const { error: eInfo } = await upsertFimbaVenueInfo(
          edicionId,
          locId,
          patchFromDraft(current),
        );
        if (eInfo) throw eInfo;
      }

      lastSavedRef.current = { ...current };
      setSaveStatus("saved");
      onSavedRef.current?.(locId, current);
    } catch (err) {
      console.error("[FimbaVenueInfoSection] save:", err);
      setSaveStatus("error");
      toast.error("No se pudo guardar la información del venue.");
    } finally {
      savingRef.current = false;
      if (pendingSaveRef.current) {
        pendingSaveRef.current = false;
        commit();
      }
    }
  }, [canEdit, locId, edicionId]);

  const scheduleSave = useCallback(() => {
    if (!canEdit) return;
    setSaveStatus("dirty");
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveTimerRef.current = null;
      commit();
    }, 700);
  }, [canEdit, commit]);

  const handleChange = (field, value) => {
    setDraft((prev) => {
      const next = { ...prev, [field]: value };
      draftRef.current = next;
      return next;
    });
    scheduleSave();
  };

  const sync = statusMeta(saveStatus);
  const localidad = locacion?.localidades?.localidad || null;

  if (!canEdit) {
    return (
      <div
        style={{
          padding: "0.75rem 1rem 1rem",
          borderBottom: "1px solid #f1f5f9",
          background: "#fafbfc",
        }}
      >
        <div
          className="fimba-grid-2"
          style={{
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "0.75rem 1.25rem",
          }}
        >
          <ReadOnlyField label="Nombre" value={locacion?.nombre} />
          <ReadOnlyField label="Dirección" value={locacion?.direccion} />
          {localidad && (
            <div className="fimba-field">
              <span className="fimba-label">Localidad</span>
              <span style={{ fontSize: "0.82rem" }}>{localidad}</span>
            </div>
          )}
          <ReadOnlyField label="Referente" value={draft.referente_nombre} />
          <ReadOnlyField label="Teléfono referente" value={draft.referente_telefono} />
          <ReadOnlyField label="Rider disponible" value={draft.rider_disponible} />
          <ReadOnlyField label="Sillas disponibles" value={draft.sillas_disponibles} />
          <ReadOnlyField label="Agua" value={draft.agua} />
          <ReadOnlyField label="Observaciones" value={draft.observaciones} multiline />
        </div>
        {agendaHref && (
          <div style={{ marginTop: "0.75rem" }}>
            <Link
              to={agendaHref}
              className="fimba-btn fimba-btn-ghost"
              style={{ textDecoration: "none", display: "inline-flex", fontSize: "0.8rem" }}
            >
              <IconCalendar size={14} /> Ver agenda de este venue
            </Link>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      style={{
        padding: "0.75rem 1rem 1rem",
        borderBottom: "1px solid #f1f5f9",
        background: "#fafbfc",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "0.5rem",
          marginBottom: "0.65rem",
        }}
      >
        <span className="fimba-label" style={{ margin: 0 }}>
          Información del venue
        </span>
        <span
          className={`fimba-sync-dot ${sync.cls}`}
          title={sync.title}
          aria-label={sync.label || sync.title}
        />
      </div>
      <div
        className="fimba-grid-2"
        style={{
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "0.65rem 1rem",
        }}
      >
        <div className="fimba-field">
          <label className="fimba-label" htmlFor={`venue-nombre-${locId}`}>
            Nombre
          </label>
          <input
            id={`venue-nombre-${locId}`}
            className="fimba-input"
            value={draft.nombre}
            onChange={(e) => handleChange("nombre", e.target.value)}
          />
        </div>
        <div className="fimba-field">
          <label className="fimba-label" htmlFor={`venue-dir-${locId}`}>
            Dirección
          </label>
          <input
            id={`venue-dir-${locId}`}
            className="fimba-input"
            value={draft.direccion}
            onChange={(e) => handleChange("direccion", e.target.value)}
          />
        </div>
        {localidad && (
          <div className="fimba-field">
            <span className="fimba-label">Localidad</span>
            <span style={{ fontSize: "0.82rem" }}>{localidad}</span>
          </div>
        )}
        <div className="fimba-field">
          <label className="fimba-label" htmlFor={`venue-ref-${locId}`}>
            Referente
          </label>
          <input
            id={`venue-ref-${locId}`}
            className="fimba-input"
            value={draft.referente_nombre}
            onChange={(e) => handleChange("referente_nombre", e.target.value)}
          />
        </div>
        <div className="fimba-field">
          <label className="fimba-label" htmlFor={`venue-tel-${locId}`}>
            Teléfono referente
          </label>
          <input
            id={`venue-tel-${locId}`}
            className="fimba-input"
            value={draft.referente_telefono}
            onChange={(e) => handleChange("referente_telefono", e.target.value)}
          />
        </div>
        <div className="fimba-field">
          <label className="fimba-label" htmlFor={`venue-rider-${locId}`}>
            Rider disponible
          </label>
          <input
            id={`venue-rider-${locId}`}
            className="fimba-input"
            value={draft.rider_disponible}
            onChange={(e) => handleChange("rider_disponible", e.target.value)}
            placeholder="Sí / No / enlace / notas"
          />
        </div>
        <div className="fimba-field">
          <label className="fimba-label" htmlFor={`venue-sillas-${locId}`}>
            Sillas disponibles
          </label>
          <input
            id={`venue-sillas-${locId}`}
            className="fimba-input"
            value={draft.sillas_disponibles}
            onChange={(e) => handleChange("sillas_disponibles", e.target.value)}
          />
        </div>
        <div className="fimba-field">
          <label className="fimba-label" htmlFor={`venue-agua-${locId}`}>
            Agua
          </label>
          <input
            id={`venue-agua-${locId}`}
            className="fimba-input"
            value={draft.agua}
            onChange={(e) => handleChange("agua", e.target.value)}
            placeholder="Sí / No / detalle"
          />
        </div>
        <div className="fimba-field" style={{ gridColumn: "1 / -1" }}>
          <label className="fimba-label" htmlFor={`venue-obs-${locId}`}>
            Observaciones
          </label>
          <textarea
            id={`venue-obs-${locId}`}
            className="fimba-textarea"
            rows={2}
            value={draft.observaciones}
            onChange={(e) => handleChange("observaciones", e.target.value)}
          />
        </div>
      </div>
      {agendaHref && (
        <div style={{ marginTop: "0.75rem" }}>
          <Link
            to={agendaHref}
            className="fimba-btn fimba-btn-ghost"
            style={{ textDecoration: "none", display: "inline-flex", fontSize: "0.8rem" }}
          >
            <IconCalendar size={14} /> Ver agenda de este venue
          </Link>
        </div>
      )}
      {saveStatus === "saving" && (
        <span
          className="fimba-muted"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            marginTop: "0.5rem",
            fontSize: "0.72rem",
          }}
        >
          <IconLoader className="animate-spin" size={12} /> Guardando…
        </span>
      )}
    </div>
  );
}
