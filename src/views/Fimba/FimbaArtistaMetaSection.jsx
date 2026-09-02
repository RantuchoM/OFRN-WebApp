import React, { useEffect, useRef, useState } from "react";
import { IconCalendar } from "../../components/ui/Icons";
import {
  FIMBA_ARTISTA_COLORS,
  FIMBA_PROPUESTA_ESTADOS,
  computeFimbaCapacity,
  listHotelesCatalog,
  updateFimbaPropuesta,
} from "../../services/fimbaService";
import FimbaRichTextEditor from "./FimbaRichTextEditor";
import FimbaStayEventCell from "./FimbaStayEventCell";
import {
  isFimbaRiderEmpty,
  normalizeFimbaRiderHtml,
  sanitizeFimbaRiderHtml,
} from "../../utils/fimbaRider";
import {
  FIMBA_HORA_CHECKIN,
  FIMBA_HORA_CHECKOUT,
  formatStayEventLabel,
  stayDateFromEventOrMirror,
} from "../../utils/fimbaStay";

const LEGACY_STAY_BOX_STYLE = {
  marginTop: "0.65rem",
  padding: "0.65rem 0.75rem",
  borderRadius: 8,
  border: "1px solid #e2e8f0",
  background: "#f1f5f9",
};

function asBool(v) {
  return v === true || v === "true" || v === 1 || v === "1";
}

function formatFecha(f) {
  if (!f) return "—";
  const [y, m, d] = String(f).split("-");
  if (!d) return f;
  return `${d}/${m}/${y}`;
}

function labelEstado(value) {
  return FIMBA_PROPUESTA_ESTADOS.find((s) => s.value === value)?.label || value || "—";
}

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

function draftFromPropuestaMeta(p) {
  return {
    nombre: p?.nombre || "",
    color: p?.color || FIMBA_ARTISTA_COLORS[0],
    estado: p?.estado || "activa",
    cantidad_planificada: p?.cantidad_planificada ?? 1,
    plazas_extra_materiales: p?.plazas_extra_materiales ?? 0,
    checkin_at:
      stayDateFromEventOrMirror(p, "checkin") ||
      (p?.checkin_at ? String(p.checkin_at).slice(0, 10) : ""),
    checkin_early: asBool(p?.checkin_early),
    checkout_at:
      stayDateFromEventOrMirror(p, "checkout") ||
      (p?.checkout_at ? String(p.checkout_at).slice(0, 10) : ""),
    checkout_late: asBool(p?.checkout_late),
    requiere_hotel: p?.requiere_hotel !== false,
    requiere_comidas: p?.requiere_comidas !== false,
    id_hotel: p?.id_hotel != null && p?.id_hotel !== "" ? String(p.id_hotel) : "",
    observaciones_logisticas: p?.observaciones_logisticas || "",
    rider: p?.rider || "",
  };
}

/**
 * Valida meta de propuesta (admin / editor_general).
 * @returns {{ ok: true, patch: object } | { ok: false, error: string }}
 */
function validatePropuestaMetaDraft(draft) {
  const nombre = String(draft.nombre || "").trim();
  if (!nombre) return { ok: false, error: "El nombre es obligatorio" };

  const planRaw = Number(draft.cantidad_planificada);
  if (!Number.isFinite(planRaw)) {
    return { ok: false, error: "Planificada debe ser un número entre 1 y 200" };
  }
  const plan = Math.round(planRaw);
  if (plan < 1 || plan > 200) {
    return { ok: false, error: "Planificada debe ser entre 1 y 200" };
  }

  const extraRaw = Number(draft.plazas_extra_materiales);
  if (!Number.isFinite(extraRaw) || extraRaw < 0) {
    return { ok: false, error: "Extra equip. debe ser ≥ 0" };
  }
  const extra = Math.round(extraRaw);

  const checkin = draft.checkin_at ? String(draft.checkin_at).slice(0, 10) : "";
  const checkout = draft.checkout_at ? String(draft.checkout_at).slice(0, 10) : "";
  if (checkin && !/^\d{4}-\d{2}-\d{2}$/.test(checkin)) {
    return { ok: false, error: "Check-in: fecha inválida" };
  }
  if (checkout && !/^\d{4}-\d{2}-\d{2}$/.test(checkout)) {
    return { ok: false, error: "Check-out: fecha inválida" };
  }
  if (checkin && checkout && checkout < checkin) {
    return { ok: false, error: "Check-out no puede ser anterior al check-in" };
  }

  const estadoOk = FIMBA_PROPUESTA_ESTADOS.some((s) => s.value === draft.estado);
  if (!estadoOk) return { ok: false, error: "Estado inválido" };

  return {
    ok: true,
    patch: {
      nombre,
      color: draft.color || FIMBA_ARTISTA_COLORS[0],
      estado: draft.estado,
      cantidad_planificada: plan,
      plazas_extra_materiales: extra,
      checkin_at: checkin || null,
      checkout_at: checkout || null,
      checkin_early: asBool(draft.checkin_early),
      checkout_late: asBool(draft.checkout_late),
      requiere_hotel: draft.requiere_hotel !== false,
      requiere_comidas: draft.requiere_comidas !== false,
      id_hotel: draft.id_hotel !== "" && draft.id_hotel != null ? Number(draft.id_hotel) : null,
      observaciones_logisticas: String(draft.observaciones_logisticas || "").trim() || null,
      rider: normalizeFimbaRiderHtml(draft.rider),
    },
  };
}

/** Campos con debounce (texto/número); el resto se guarda casi al instante. */
const META_DEBOUNCE_MS = 500;
const META_IMMEDIATE_FIELDS = new Set([
  "color",
  "estado",
  "id_hotel",
  "checkin_at",
  "checkout_at",
  "checkin_early",
  "checkout_late",
  "requiere_hotel",
  "requiere_comidas",
]);

/**
 * Draft incompleto en edición (no thrash de errores ni save).
 * Hard validation (rango, fechas cruzadas) sí puede marcar error.
 */
function isSoftInvalidMetaDraft(draft) {
  if (!String(draft?.nombre || "").trim()) return true;
  if (
    draft?.cantidad_planificada === "" ||
    draft?.cantidad_planificada == null ||
    !Number.isFinite(Number(draft.cantidad_planificada))
  ) {
    return true;
  }
  if (
    draft?.plazas_extra_materiales === "" ||
    draft?.plazas_extra_materiales == null ||
    !Number.isFinite(Number(draft.plazas_extra_materiales))
  ) {
    return true;
  }
  return false;
}

function metaPatchesEqual(a, b) {
  if (!a || !b) return false;
  const keys = [
    "nombre",
    "color",
    "estado",
    "cantidad_planificada",
    "plazas_extra_materiales",
    "checkin_at",
    "checkout_at",
    "checkin_early",
    "checkout_late",
    "requiere_hotel",
    "requiere_comidas",
    "id_hotel",
    "observaciones_logisticas",
    "rider",
  ];
  return keys.every((k) => {
    const av = a[k];
    const bv = b[k];
    if (k === "rider") {
      return normalizeFimbaRiderHtml(av) === normalizeFimbaRiderHtml(bv);
    }
    if (av == null && bv == null) return true;
    if (typeof av === "boolean" || typeof bv === "boolean") {
      return asBool(av) === asBool(bv);
    }
    if (typeof av === "number" || typeof bv === "number") {
      return Number(av) === Number(bv);
    }
    return String(av ?? "") === String(bv ?? "");
  });
}

/**
 * Datos generales / meta logística del artista.
 * Editable solo con `canEditPropuestaMeta` (editor_general / OFRN); el resto ve RO.
 * No confundir con `!readOnly` (editores de token /e pueden nómina pero no meta).
 * En edición: autosave debounced + semáforo (idle/dirty/saving/saved/error).
 *
 * @param {"card"|"plain"} [variant="card"] — `plain` para embeber en modal (sin caja fimba-card).
 * @param {string} [idPrefix="fimba-artista"] — prefijo de ids de campos (evitar choques en portal).
 * @param {number|string|null} [idGira] — gira de la edición (picker de estadía).
 */
export default function FimbaArtistaMetaSection({
  propuesta,
  hotelNombre,
  canEdit,
  showRider = false,
  onSaved,
  onError,
  variant = "card",
  idPrefix = "fimba-artista",
  idGira = null,
}) {
  const [draft, setDraft] = useState(() => draftFromPropuestaMeta(propuesta));
  const [hoteles, setHoteles] = useState([]);
  /** idle | dirty | saving | saved | error — mismo semáforo FIMBA que planillas. */
  const [saveStatus, setSaveStatus] = useState("idle");
  const [formError, setFormError] = useState(null);

  const draftRef = useRef(draft);
  draftRef.current = draft;
  const lastSavedPatchRef = useRef(null);
  if (lastSavedPatchRef.current == null) {
    const v0 = validatePropuestaMetaDraft(draftFromPropuestaMeta(propuesta));
    lastSavedPatchRef.current = v0.ok ? v0.patch : null;
  }

  const propuestaIdRef = useRef(propuesta?.id);
  const saveTimerRef = useRef(null);
  const savingRef = useRef(false);
  const pendingSaveRef = useRef(false);
  const hotelesRef = useRef(hoteles);
  hotelesRef.current = hoteles;
  const onSavedRef = useRef(onSaved);
  onSavedRef.current = onSaved;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  // Solo resincronizar draft al cambiar de artista (no al eco de onSaved).
  useEffect(() => {
    if (propuesta?.id === propuestaIdRef.current && propuestaIdRef.current != null) {
      return;
    }
    propuestaIdRef.current = propuesta?.id;
    const d = draftFromPropuestaMeta(propuesta);
    setDraft(d);
    draftRef.current = d;
    const v = validatePropuestaMetaDraft(d);
    lastSavedPatchRef.current = v.ok ? v.patch : null;
    setSaveStatus("idle");
    setFormError(null);
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
  }, [propuesta]);

  useEffect(() => {
    if (!canEdit) return undefined;
    let cancelled = false;
    listHotelesCatalog().then(({ hoteles: list, error: err }) => {
      if (cancelled) return;
      if (err) {
        // no bloquear form
        return;
      }
      setHoteles(list || []);
    });
    return () => {
      cancelled = true;
    };
  }, [canEdit]);

  // Guardado → idle tras flash verde
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

  const commitMeta = async () => {
    if (!canEdit || !propuesta?.id) return;
    if (savingRef.current) {
      pendingSaveRef.current = true;
      return;
    }

    const current = draftRef.current;
    const validated = validatePropuestaMetaDraft(current);

    if (!validated.ok) {
      if (isSoftInvalidMetaDraft(current)) {
        setSaveStatus("dirty");
        setFormError(null);
      } else {
        setSaveStatus("error");
        setFormError(validated.error);
      }
      return;
    }

    if (metaPatchesEqual(validated.patch, lastSavedPatchRef.current)) {
      setFormError(null);
      setSaveStatus("idle");
      return;
    }

    savingRef.current = true;
    setSaveStatus("saving");
    setFormError(null);

    const { propuesta: updated, error: err } = await updateFimbaPropuesta(
      propuesta.id,
      validated.patch,
    );
    savingRef.current = false;

    if (err) {
      const msg = err.message || "No se pudo guardar";
      setFormError(msg);
      setSaveStatus("error");
      onErrorRef.current?.(msg);
      if (pendingSaveRef.current) {
        pendingSaveRef.current = false;
        void commitMeta();
      }
      return;
    }

    lastSavedPatchRef.current = validated.patch;
    const next = { ...(updated || {}), ...validated.patch };
    if (validated.patch.id_hotel != null) {
      const h = (hotelesRef.current || []).find(
        (x) => Number(x.id) === Number(validated.patch.id_hotel),
      );
      if (h) next.hoteles = h;
    } else {
      next.hoteles = null;
    }
    onSavedRef.current?.(next);

    // Cambios tipados durante el request → re-encolar
    const after = draftRef.current;
    const revalidate = validatePropuestaMetaDraft(after);
    if (
      revalidate.ok &&
      !metaPatchesEqual(revalidate.patch, lastSavedPatchRef.current)
    ) {
      setSaveStatus("dirty");
      pendingSaveRef.current = false;
      void commitMeta();
      return;
    }
    if (pendingSaveRef.current) {
      pendingSaveRef.current = false;
      setSaveStatus("dirty");
      void commitMeta();
      return;
    }

    setSaveStatus("saved");
  };

  const scheduleSave = (delayMs) => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    if (delayMs <= 0) {
      void commitMeta();
      return;
    }
    saveTimerRef.current = setTimeout(() => {
      saveTimerRef.current = null;
      void commitMeta();
    }, delayMs);
  };

  const setField = (field, value) => {
    setDraft((prev) => {
      const next = { ...prev, [field]: value };
      draftRef.current = next;
      return next;
    });
    setFormError(null);
    setSaveStatus((prev) => (prev === "saving" ? "saving" : "dirty"));
    const delay = META_IMMEDIATE_FIELDS.has(field) ? 80 : META_DEBOUNCE_MS;
    scheduleSave(delay);
  };

  const flushSave = () => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    void commitMeta();
  };

  const resolvedIdGira =
    idGira != null && idGira !== ""
      ? Number(idGira)
      : propuesta?.fimba_ediciones?.id_gira != null
        ? Number(propuesta.fimba_ediciones.id_gira)
        : null;

  const syncDraftStayFromPropuesta = (p) => {
    const nextIn =
      stayDateFromEventOrMirror(p, "checkin") ||
      (p?.checkin_at ? String(p.checkin_at).slice(0, 10) : "") ||
      "";
    const nextOut =
      stayDateFromEventOrMirror(p, "checkout") ||
      (p?.checkout_at ? String(p.checkout_at).slice(0, 10) : "") ||
      "";
    const next = {
      ...draftRef.current,
      checkin_at: nextIn,
      checkout_at: nextOut,
      checkin_early: asBool(p?.checkin_early ?? draftRef.current.checkin_early),
      checkout_late: asBool(p?.checkout_late ?? draftRef.current.checkout_late),
    };
    draftRef.current = next;
    setDraft(next);
    // Solo alinear fechas espejo en lastSaved (no marcar otros campos dirty como guardados).
    if (lastSavedPatchRef.current) {
      lastSavedPatchRef.current = {
        ...lastSavedPatchRef.current,
        checkin_at: nextIn || null,
        checkout_at: nextOut || null,
        checkin_early: asBool(p?.checkin_early),
        checkout_late: asBool(p?.checkout_late),
      };
    }
  };

  const applyStayLink = async (side, eventId) => {
    if (!canEdit || !propuesta?.id) return;
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    setSaveStatus("saving");
    setFormError(null);
    const patch =
      side === "checkout"
        ? { id_evento_checkout: eventId }
        : { id_evento_checkin: eventId };
    const { propuesta: updated, error: err } = await updateFimbaPropuesta(
      propuesta.id,
      patch,
    );
    if (err) {
      const msg = err.message || "No se pudo vincular la estadía";
      setFormError(msg);
      setSaveStatus("error");
      onErrorRef.current?.(msg);
      throw err;
    }
    syncDraftStayFromPropuesta(updated);
    onSavedRef.current?.(updated);
    // Re-encolar autosave si había otros campos dirty pendientes.
    const after = draftRef.current;
    const revalidate = validatePropuestaMetaDraft(after);
    if (
      revalidate.ok &&
      !metaPatchesEqual(revalidate.patch, lastSavedPatchRef.current)
    ) {
      setSaveStatus("dirty");
      scheduleSave(META_DEBOUNCE_MS);
      return;
    }
    setSaveStatus("saved");
  };

  const cap = computeFimbaCapacity({
    cantidad_planificada: canEdit ? draft.cantidad_planificada : propuesta.cantidad_planificada,
    plazas_extra_materiales: canEdit ? draft.plazas_extra_materiales : propuesta.plazas_extra_materiales,
  });

  const syncMeta = statusMeta(saveStatus);
  const fid = (suffix) => `${idPrefix}-${suffix}`;
  const isPlain = variant === "plain";
  const shellStyle = isPlain
    ? { marginBottom: 0 }
    : { marginBottom: "1.25rem" };
  const shellClass = isPlain ? undefined : "fimba-card";

  const eventInLabel =
    formatStayEventLabel(propuesta?.evento_checkin) ||
    formatFecha(stayDateFromEventOrMirror(propuesta, "checkin"));
  const eventOutLabel =
    formatStayEventLabel(propuesta?.evento_checkout) ||
    formatFecha(stayDateFromEventOrMirror(propuesta, "checkout"));

  if (!canEdit) {
    return (
      <section className={shellClass} style={shellStyle}>
        <h2
          style={{
            margin: "0 0 10px",
            fontSize: "1rem",
            color: "var(--fimba-deep)",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <IconCalendar size={16} /> Datos del artista
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
            gap: "0.85rem 1.25rem",
          }}
        >
          <div>
            <div className="fimba-label">Estado</div>
            <div style={{ fontWeight: 600 }}>{labelEstado(propuesta.estado)}</div>
          </div>
          <div>
            <div className="fimba-label">Planificada</div>
            <div style={{ fontWeight: 600 }}>{cap.tope_personas} pax</div>
          </div>
          <div>
            <div className="fimba-label">Extra Equip.</div>
            <div style={{ fontWeight: 600 }}>{propuesta.plazas_extra_materiales ?? 0}</div>
          </div>
          <div>
            <div className="fimba-label">Transporte tope</div>
            <div style={{ fontWeight: 600 }}>{cap.para_transporte}</div>
          </div>
          <div>
            <div className="fimba-label">Check-in</div>
            <div style={{ fontWeight: 600 }}>
              {eventInLabel}
              {asBool(propuesta.checkin_early) && (
                <span className="fimba-badge" style={{ marginLeft: 6, fontSize: "0.7rem" }}>
                  Early
                </span>
              )}
            </div>
          </div>
          <div>
            <div className="fimba-label">Check-out</div>
            <div style={{ fontWeight: 600 }}>
              {eventOutLabel}
              {asBool(propuesta.checkout_late) && (
                <span className="fimba-badge" style={{ marginLeft: 6, fontSize: "0.7rem" }}>
                  Late
                </span>
              )}
            </div>
          </div>
          {hotelNombre && (
            <div>
              <div className="fimba-label">Hotel</div>
              <div style={{ fontWeight: 600 }}>{hotelNombre}</div>
            </div>
          )}
        </div>
        {propuesta.observaciones_logisticas ? (
          <div style={{ marginTop: "0.85rem" }}>
            <div className="fimba-label">Observaciones logísticas</div>
            <div style={{ fontWeight: 500, whiteSpace: "pre-wrap", fontSize: "0.9rem" }}>
              {propuesta.observaciones_logisticas}
            </div>
          </div>
        ) : null}
        {showRider ? (
          <div style={{ marginTop: "0.85rem" }}>
            <div className="fimba-label">Rider</div>
            {isFimbaRiderEmpty(propuesta.rider) ? (
              <div className="fimba-muted">Sin rider</div>
            ) : (
              <div
                className="fimba-rider-html"
                dangerouslySetInnerHTML={{
                  __html: sanitizeFimbaRiderHtml(propuesta.rider),
                }}
              />
            )}
          </div>
        ) : null}
      </section>
    );
  }

  return (
    <section className={shellClass} style={shellStyle}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 8,
          marginBottom: 14,
          flexWrap: "wrap",
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: isPlain ? "1rem" : "1.05rem",
            color: "var(--fimba-deep)",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <IconCalendar size={16} /> Datos generales
        </h2>
        <span
          className={`fimba-sync-legend ${syncMeta.cls}`}
          title={formError || syncMeta.title}
          aria-label={formError || syncMeta.title}
          role="status"
        >
          <i className={`fimba-sync-dot ${syncMeta.cls}`} />
        </span>
      </div>

      <form
        onSubmit={(ev) => {
          ev.preventDefault();
          flushSave();
        }}
      >
        <div className="fimba-field">
          <label className="fimba-label" htmlFor={fid("nombre")}>
            Nombre
          </label>
          <input
            id={fid("nombre")}
            className="fimba-input"
            value={draft.nombre}
            onChange={(e) => setField("nombre", e.target.value)}
            onBlur={flushSave}
            required
            autoComplete="off"
          />
        </div>

        <div className="fimba-field">
          <span className="fimba-label">Color</span>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
            {FIMBA_ARTISTA_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setField("color", c)}
                title={c}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 999,
                  background: c,
                  border: draft.color === c ? "3px solid #222" : "2px solid transparent",
                  cursor: "pointer",
                }}
              />
            ))}
          </div>
        </div>

        <div className="fimba-grid-2">
          <div className="fimba-field">
            <label className="fimba-label" htmlFor={fid("planif")}>
              Cantidad planificada (1–200)
            </label>
            <input
              id={fid("planif")}
              className="fimba-input"
              type="number"
              min={1}
              max={200}
              value={draft.cantidad_planificada}
              onChange={(e) => setField("cantidad_planificada", e.target.value)}
              onBlur={flushSave}
              required
            />
          </div>
          <div className="fimba-field">
            <label className="fimba-label" htmlFor={fid("extra")}>
              Extra Equip.
            </label>
            <input
              id={fid("extra")}
              className="fimba-input"
              type="number"
              min={0}
              value={draft.plazas_extra_materiales}
              onChange={(e) => setField("plazas_extra_materiales", e.target.value)}
              onBlur={flushSave}
            />
          </div>
        </div>

        <p className="fimba-muted" style={{ margin: "-0.15rem 0 0.9rem", fontSize: "0.8rem" }}>
          Hotel/comida: {cap.para_hotel_comida} · Transporte: {cap.para_transporte}
          {" "}(extra solo transporte)
        </p>

        <div className="fimba-grid-2">
          <div className="fimba-field">
            <span className="fimba-label">Check-in (grupo)</span>
            <FimbaStayEventCell
              side="checkin"
              variant="group"
              ownEvent={propuesta?.evento_checkin || null}
              ownEventId={propuesta?.id_evento_checkin ?? null}
              idGira={resolvedIdGira}
              idPropuesta={propuesta?.id}
              disabled={saveStatus === "saving"}
              onLink={(eventId) => applyStayLink("checkin", eventId)}
              onClear={() => applyStayLink("checkin", null)}
            />
            <label className="fimba-flag-check" style={{ marginTop: 8 }}>
              <input
                type="checkbox"
                checked={asBool(draft.checkin_early)}
                onChange={(e) => setField("checkin_early", e.target.checked)}
              />
              Early check-in
            </label>
          </div>
          <div className="fimba-field">
            <span className="fimba-label">Check-out (grupo)</span>
            <FimbaStayEventCell
              side="checkout"
              variant="group"
              ownEvent={propuesta?.evento_checkout || null}
              ownEventId={propuesta?.id_evento_checkout ?? null}
              idGira={resolvedIdGira}
              idPropuesta={propuesta?.id}
              disabled={saveStatus === "saving"}
              onLink={(eventId) => applyStayLink("checkout", eventId)}
              onClear={() => applyStayLink("checkout", null)}
            />
            <label className="fimba-flag-check" style={{ marginTop: 8 }}>
              <input
                type="checkbox"
                checked={asBool(draft.checkout_late)}
                onChange={(e) => setField("checkout_late", e.target.checked)}
              />
              Late check-out
            </label>
          </div>
        </div>

        <p className="fimba-muted" style={{ fontSize: "0.75rem", margin: "0 0 0.85rem" }}>
          Estadía oficial del artista vía eventos de agenda (tipo Check-in {FIMBA_HORA_CHECKIN} /
          Check-out {FIMBA_HORA_CHECKOUT}). Vincular uno existente o crear uno nuevo. En la
          planilla de integrantes, cada persona hereda este rango o vincula el suyo («Usar
          grupo» limpia el override).
        </p>

        <div style={LEGACY_STAY_BOX_STYLE}>
          <div className="fimba-label" style={{ marginBottom: 6 }}>
            Fechas espejo (legacy — migración)
          </div>
          <p className="fimba-muted" style={{ fontSize: "0.72rem", margin: "0 0 0.55rem" }}>
            Solo si necesitás setear la fecha sin pasar por el picker: crea/reusa el evento
            canónico del día ({FIMBA_HORA_CHECKIN}/{FIMBA_HORA_CHECKOUT}). Preferí vincular o
            crear desde arriba.
          </p>
          <div className="fimba-grid-2">
            <div className="fimba-field" style={{ marginBottom: 0 }}>
              <label className="fimba-label" htmlFor={fid("checkin")}>
                Check-in (fecha)
              </label>
              <input
                id={fid("checkin")}
                className="fimba-input"
                type="date"
                value={draft.checkin_at || ""}
                onChange={(e) => setField("checkin_at", e.target.value)}
              />
            </div>
            <div className="fimba-field" style={{ marginBottom: 0 }}>
              <label className="fimba-label" htmlFor={fid("checkout")}>
                Check-out (fecha)
              </label>
              <input
                id={fid("checkout")}
                className="fimba-input"
                type="date"
                value={draft.checkout_at || ""}
                onChange={(e) => setField("checkout_at", e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="fimba-grid-2">
          <div className="fimba-field">
            <label className="fimba-flag-check">
              <input
                type="checkbox"
                checked={draft.requiere_hotel !== false}
                onChange={(e) => setField("requiere_hotel", e.target.checked)}
              />
              Requiere hotelería
            </label>
            <p className="fimba-muted" style={{ fontSize: "0.72rem", margin: "4px 0 0" }}>
              Si está apagado, se excluye de pedidos/rooming/Excel hotelería.
            </p>
          </div>
          <div className="fimba-field">
            <label className="fimba-flag-check">
              <input
                type="checkbox"
                checked={draft.requiere_comidas !== false}
                onChange={(e) => setField("requiere_comidas", e.target.checked)}
              />
              Requiere comidas
            </label>
            <p className="fimba-muted" style={{ fontSize: "0.72rem", margin: "4px 0 0" }}>
              Si está apagado, se excluye de cubiertos y reportes de comidas.
            </p>
          </div>
        </div>

        <div className="fimba-field">
          <label className="fimba-label" htmlFor={fid("hotel")}>
            Hotel (opc.)
          </label>
          <select
            id={fid("hotel")}
            className="fimba-select"
            value={draft.id_hotel}
            onChange={(e) => setField("id_hotel", e.target.value)}
          >
            <option value="">— Sin hotel —</option>
            {(hoteles || []).map((h) => (
              <option key={h.id} value={h.id}>
                {h.nombre}
              </option>
            ))}
          </select>
        </div>

        <div className="fimba-field">
          <label className="fimba-label" htmlFor={fid("obs")}>
            Observaciones logísticas
          </label>
          <textarea
            id={fid("obs")}
            className="fimba-textarea"
            rows={3}
            value={draft.observaciones_logisticas}
            onChange={(e) => setField("observaciones_logisticas", e.target.value)}
            onBlur={flushSave}
            placeholder="Early/late, transfer, equipaje, notas de hotel…"
          />
        </div>

        {showRider ? (
          <div className="fimba-field">
            <span className="fimba-label">Rider</span>
            <FimbaRichTextEditor
              value={draft.rider}
              onChange={(html) => setField("rider", html)}
              onBlur={flushSave}
              placeholder="Escenario, backline, catering, accesos, horarios…"
              edicionId={propuesta?.id_edicion}
              propuestaId={propuesta?.id}
            />
          </div>
        ) : null}

        <div className="fimba-field">
          <label className="fimba-label" htmlFor={fid("estado")}>
            Estado
          </label>
          <select
            id={fid("estado")}
            className="fimba-select"
            value={draft.estado}
            onChange={(e) => setField("estado", e.target.value)}
          >
            {FIMBA_PROPUESTA_ESTADOS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        {formError && (
          <div className="fimba-error" style={{ marginBottom: 0 }}>
            {formError}
          </div>
        )}
      </form>
    </section>
  );
}
