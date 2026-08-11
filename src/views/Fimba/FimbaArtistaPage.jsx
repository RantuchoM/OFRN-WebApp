import React, { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  IconArrowLeft,
  IconTrash,
  IconLoader,
  IconCopy,
  IconRefresh,
  IconLink,
  IconEye,
  IconEdit,
  IconCheck,
  IconAlertTriangle,
  IconCalendar,
} from "../../components/ui/Icons";
import {
  FIMBA_GENEROS,
  FIMBA_GENERO_DEFAULT,
  FIMBA_TIPOS_ALIMENTACION,
  computeFimbaCapacity,
  countActiveParticipantes,
  createFimbaParticipante,
  deleteFimbaParticipante,
  fimbaTokenUrl,
  getFimbaEdicionById,
  getFimbaPropuestaById,
  listFimbaParticipantes,
  regenerateFimbaTokens,
  updateFimbaParticipante,
  updateFimbaPropuesta,
} from "../../services/fimbaService";
import { useFimbaAccess } from "../../context/FimbaAccessContext";
import FimbaConsultaAgenda from "./FimbaConsultaAgenda";
import FimbaRoomingPanel from "./FimbaRoomingPanel";

/** Columnas editables en planilla (orden Tab / Enter). */
const EDITABLE_COLS = [
  "apellido",
  "nombre",
  "documento",
  "genero",
  "tipo_alimentacion",
  "activo",
];

const NEW_ROW_KEY = "__new__";

function draftFromParticipante(p) {
  return {
    apellido: p?.apellido || "",
    nombre: p?.nombre || "",
    documento: p?.documento || "",
    genero: p?.genero || FIMBA_GENERO_DEFAULT,
    tipo_alimentacion: p?.tipo_alimentacion || "regular",
    activo: p?.activo !== false,
  };
}

function emptyDraft() {
  return draftFromParticipante({});
}

function draftsEqual(a, b) {
  return EDITABLE_COLS.every((k) => {
    if (k === "activo") return asBool(a?.[k]) === asBool(b?.[k]);
    return String(a?.[k] ?? "") === String(b?.[k] ?? "");
  });
}

function asBool(v) {
  return v === true || v === "true" || v === 1 || v === "1";
}

function formatFecha(f) {
  if (!f) return "—";
  const [y, m, d] = String(f).split("-");
  if (!d) return f;
  return `${d}/${m}/${y}`;
}

/**
 * @returns {{ ok: true, patch: object } | { ok: false, error?: string, empty?: boolean, incomplete?: boolean }}
 */
function validateParticipanteDraft(draft, { isCreate = false } = {}) {
  const nombre = String(draft.nombre || "").trim();
  const apellido = String(draft.apellido || "").trim();
  const doc = String(draft.documento || "").trim();

  if (isCreate && !nombre && !apellido && !doc) {
    return { ok: false, empty: true };
  }
  // Alta: no marcar error rojo hasta tener ambos campos de identidad (celda-a-celda vía Tab).
  if (isCreate && (!nombre || !apellido)) {
    return { ok: false, incomplete: true };
  }
  if (!apellido) return { ok: false, error: "El apellido es obligatorio" };
  if (!nombre) return { ok: false, error: "El nombre es obligatorio" };

  const genero = draft.genero || FIMBA_GENERO_DEFAULT;
  if (!FIMBA_GENEROS.some((g) => g.value === genero)) {
    return { ok: false, error: "Género inválido" };
  }

  const tipo = draft.tipo_alimentacion || "regular";
  if (!FIMBA_TIPOS_ALIMENTACION.some((t) => t.value === tipo)) {
    return { ok: false, error: "Tipo de alimentación inválido" };
  }

  return {
    ok: true,
    patch: {
      nombre,
      apellido,
      documento: doc || null,
      genero,
      tipo_alimentacion: tipo,
      activo: draft.activo !== false,
    },
  };
}

function labelAlimentacion(value) {
  return (
    FIMBA_TIPOS_ALIMENTACION.find((t) => t.value === value)?.label || value || "—"
  );
}

function labelGenero(value) {
  return FIMBA_GENEROS.find((g) => g.value === value)?.label || value || "—";
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

export default function FimbaArtistaPage({ readOnly = false, propuestaOverride = null, modeLabel }) {
  const { edicionId, artistaId } = useParams();
  const access = useFimbaAccess();
  const effectiveReadOnly = Boolean(readOnly || access.readOnly);
  const [edicion, setEdicion] = useState(null);
  const [propuesta, setPropuesta] = useState(propuestaOverride);
  const [participantes, setParticipantes] = useState([]);
  const [loading, setLoading] = useState(!propuestaOverride);
  const [error, setError] = useState(null);
  const [tokenMsg, setTokenMsg] = useState(null);
  const [obsDraft, setObsDraft] = useState(propuestaOverride?.observaciones_logisticas || "");
  const [obsStatus, setObsStatus] = useState("idle"); // idle|saving|saved|error
  const [obsError, setObsError] = useState(null);

  const propId = propuestaOverride?.id || artistaId;

  const reload = async () => {
    setLoading(true);
    setError(null);
    const tasks = [
      getFimbaPropuestaById(propId),
      listFimbaParticipantes(propId),
    ];
    if (edicionId && !propuestaOverride) {
      tasks.push(getFimbaEdicionById(edicionId));
    }
    const results = await Promise.all(tasks);
    const { propuesta: prop, error: e1 } = results[0];
    const { participantes: parts, error: e2 } = results[1];
    if (e1 || e2) setError((e1 || e2).message || "Error al cargar");
    setPropuesta(prop);
    setObsDraft(prop?.observaciones_logisticas || "");
    setObsStatus("idle");
    setObsError(null);
    setParticipantes(parts || []);
    if (results[2]) setEdicion(results[2].edicion);
    setLoading(false);
  };

  useEffect(() => {
    if (propuestaOverride) {
      setPropuesta(propuestaOverride);
      setObsDraft(propuestaOverride.observaciones_logisticas || "");
      setObsStatus("idle");
      setObsError(null);
      listFimbaParticipantes(propuestaOverride.id).then(({ participantes: parts, error: err }) => {
        if (err) setError(err.message);
        setParticipantes(parts || []);
        setLoading(false);
      });
      return;
    }
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propId, edicionId]);

  const copy = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text);
      setTokenMsg(`${label} copiado`);
      setTimeout(() => setTokenMsg(null), 2000);
    } catch {
      setTokenMsg("No se pudo copiar");
    }
  };

  const regen = async (which) => {
    if (
      !window.confirm(
        which.consulta && which.edicion
          ? "¿Regenerar ambos enlaces? Los anteriores dejarán de funcionar."
          : which.consulta
            ? "¿Regenerar enlace de consulta?"
            : "¿Regenerar enlace de edición?",
      )
    ) {
      return;
    }
    const { propuesta: next, error: err } = await regenerateFimbaTokens(propId, which);
    if (err) {
      setError(err.message || "No se pudo regenerar");
      return;
    }
    setPropuesta(next);
    setTokenMsg("Tokens actualizados");
    setTimeout(() => setTokenMsg(null), 2000);
  };

  const saveObservacionesLogisticas = async () => {
    if (effectiveReadOnly || !propuesta?.id) return;
    const next = String(obsDraft || "").trim() || null;
    const prev = String(propuesta.observaciones_logisticas || "").trim() || null;
    if (next === prev) {
      setObsStatus("idle");
      return;
    }
    setObsStatus("saving");
    setObsError(null);
    const { propuesta: updated, error: err } = await updateFimbaPropuesta(propuesta.id, {
      observaciones_logisticas: next,
    });
    if (err) {
      setObsStatus("error");
      setObsError(err.message || "No se pudo guardar");
      return;
    }
    setPropuesta((p) => ({ ...(p || {}), ...(updated || {}), observaciones_logisticas: next }));
    setObsDraft(next || "");
    setObsStatus("saved");
    setTimeout(() => setObsStatus((s) => (s === "saved" ? "idle" : s)), 2000);
  };

  if (loading) {
    return (
      <div className="fimba-card fimba-muted" style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <IconLoader size={18} className="animate-spin" /> Cargando…
      </div>
    );
  }

  if (!propuesta) {
    return <div className="fimba-error">Artista no encontrado.</div>;
  }

  const cap = computeFimbaCapacity(propuesta);
  const activos = countActiveParticipantes(participantes);
  const overHotel = activos > cap.para_hotel_comida;
  const backHref = edicionId ? `/fimba/edicion/${edicionId}` : "/fimba";
  const hotelNombre = propuesta.hoteles?.nombre || null;
  const edicionNombre =
    propuesta.fimba_ediciones?.nombre || edicion?.nombre || null;

  return (
    <div>
      {!effectiveReadOnly && edicionId && (
        <Link
          to={backHref}
          className="fimba-btn fimba-btn-ghost"
          style={{ textDecoration: "none", marginBottom: 12 }}
        >
          <IconArrowLeft size={14} /> {edicion?.nombre || "Edición"}
        </Link>
      )}

      <div style={{ marginBottom: "1.25rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span
            className="fimba-swatch"
            style={{ width: 14, height: 14, background: propuesta.color || "var(--fimba-accent)" }}
          />
          <h1 style={{ margin: 0, fontSize: "1.5rem", color: "var(--fimba-deep)" }}>
            {propuesta.nombre}
          </h1>
          {modeLabel && <span className="fimba-badge">{modeLabel}</span>}
        </div>
        {edicionNombre && effectiveReadOnly && (
          <p className="fimba-muted" style={{ margin: "0.35rem 0 0", fontSize: "0.9rem" }}>
            {edicionNombre}
          </p>
        )}
        <p className="fimba-muted" style={{ margin: "0.4rem 0 0" }}>
          {effectiveReadOnly ? (
            <>
              Planificada: {cap.tope_personas} pax
              {" · "}
              Transporte tope: {cap.para_transporte}
            </>
          ) : (
            <>
              Activos: {activos}/{cap.para_hotel_comida} (hotel/comida)
              {" · "}
              Transporte tope: {cap.para_transporte}
              {overHotel && (
                <span style={{ color: "#b91c1c", fontWeight: 700 }}> · Sobre planificado</span>
              )}
            </>
          )}
        </p>
      </div>

      {error && <div className="fimba-error" style={{ marginBottom: "1rem" }}>{error}</div>}

      {effectiveReadOnly && (
        <section className="fimba-card" style={{ marginBottom: "1.25rem" }}>
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
              gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
              gap: "0.75rem 1.25rem",
            }}
          >
            <div>
              <div className="fimba-label">Check-in</div>
              <div style={{ fontWeight: 600 }}>
                {formatFecha(propuesta.checkin_at)}
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
                {formatFecha(propuesta.checkout_at)}
                {asBool(propuesta.checkout_late) && (
                  <span className="fimba-badge" style={{ marginLeft: 6, fontSize: "0.7rem" }}>
                    Late
                  </span>
                )}
              </div>
            </div>
            <div>
              <div className="fimba-label">Planificada</div>
              <div style={{ fontWeight: 600 }}>{cap.tope_personas} pax</div>
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
        </section>
      )}

      {!effectiveReadOnly && (
        <section className="fimba-card" style={{ marginBottom: "1.25rem" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 8,
              marginBottom: 8,
            }}
          >
            <h2 style={{ margin: 0, fontSize: "1rem", color: "var(--fimba-deep)" }}>
              Observaciones logísticas
            </h2>
            <span className="fimba-muted" style={{ fontSize: "0.78rem" }}>
              {obsStatus === "saving"
                ? "Guardando…"
                : obsStatus === "saved"
                  ? "Guardado"
                  : obsStatus === "error"
                    ? "Error"
                    : "Se guarda al salir del campo"}
            </span>
          </div>
          <textarea
            className="fimba-textarea"
            rows={3}
            value={obsDraft}
            onChange={(e) => {
              setObsDraft(e.target.value);
              setObsStatus("dirty");
            }}
            onBlur={() => {
              saveObservacionesLogisticas();
            }}
            placeholder="Early/late, transfer, equipaje, notas de hotel…"
            disabled={obsStatus === "saving"}
          />
          {obsError && (
            <div className="fimba-error" style={{ marginTop: 8 }}>
              {obsError}
            </div>
          )}
        </section>
      )}

      {effectiveReadOnly && <FimbaConsultaAgenda propuesta={propuesta} />}

      {!effectiveReadOnly && (
        <FimbaConsultaAgenda propuesta={propuesta} editable />
      )}

      <FimbaRoomingPanel
        propuestaId={propId}
        participantes={participantes}
        readOnly={effectiveReadOnly}
        mode={
          effectiveReadOnly
            ? "readonly"
            : edicionId
              ? "admin"
              : "assign"
        }
        onError={(msg) => setError(msg || "Error de rooming")}
      />

      {!effectiveReadOnly && edicionId && (
        <section className="fimba-card" style={{ marginBottom: "1.25rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <h2 style={{ margin: 0, fontSize: "1rem", color: "var(--fimba-deep)", display: "flex", alignItems: "center", gap: 6 }}>
              <IconLink size={16} /> Enlaces externos
            </h2>
            {tokenMsg && <span className="fimba-muted" style={{ fontSize: "0.8rem" }}>{tokenMsg}</span>}
          </div>
          <TokenRow
            label="Consulta (solo lectura)"
            url={fimbaTokenUrl("consulta", propuesta.token_consulta)}
            icon={<IconEye size={14} />}
            onCopy={() => copy(fimbaTokenUrl("consulta", propuesta.token_consulta), "Consulta")}
            onRegen={() => regen({ consulta: true, edicion: false })}
          />
          <TokenRow
            label="Edición externa"
            url={fimbaTokenUrl("edicion", propuesta.token_edicion)}
            icon={<IconEdit size={14} />}
            onCopy={() => copy(fimbaTokenUrl("edicion", propuesta.token_edicion), "Edición")}
            onRegen={() => regen({ consulta: false, edicion: true })}
          />
          <button
            type="button"
            className="fimba-btn fimba-btn-ghost"
            style={{ marginTop: 8 }}
            onClick={() => regen({ consulta: true, edicion: true })}
          >
            <IconRefresh size={14} /> Regenerar ambos
          </button>
        </section>
      )}

      <section>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 10,
            marginBottom: 10,
          }}
        >
          <h2 style={{ margin: 0, fontSize: "1.05rem", color: "var(--fimba-deep)" }}>
            Participantes
          </h2>
          {!effectiveReadOnly && (
            <span className="fimba-muted" style={{ fontSize: "0.78rem" }}>
              Semáforo:{" "}
              <span className="fimba-sync-legend">
                <i className="fimba-sync-dot fimba-sync-saved" /> guardado
              </span>
              {" · "}
              <span className="fimba-sync-legend">
                <i className="fimba-sync-dot fimba-sync-pending" /> pendiente / guardando
              </span>
              {" · "}
              <span className="fimba-sync-legend">
                <i className="fimba-sync-dot fimba-sync-error" /> error
              </span>
              {" — "}Enter o blur guarda · Tab navega · fila inferior = alta
            </span>
          )}
        </div>

        {effectiveReadOnly ? (
          <ParticipantesReadOnlyTable participantes={participantes} />
        ) : (
          <ParticipantesPlanilla
            propuestaId={propId}
            participantes={participantes}
            onListChange={setParticipantes}
            onError={setError}
          />
        )}
      </section>
    </div>
  );
}

function TokenRow({ label, url, icon, onCopy, onRegen }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div className="fimba-label" style={{ display: "flex", alignItems: "center", gap: 4 }}>
        {icon} {label}
      </div>
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <input className="fimba-input" readOnly value={url} style={{ fontSize: "0.8rem" }} />
        <button type="button" className="fimba-btn fimba-btn-ghost" onClick={onCopy} title="Copiar">
          <IconCopy size={14} />
        </button>
        <button type="button" className="fimba-btn fimba-btn-ghost" onClick={onRegen} title="Regenerar">
          <IconRefresh size={14} />
        </button>
      </div>
    </div>
  );
}

function ParticipantesReadOnlyTable({ participantes }) {
  if (!participantes?.length) {
    return <div className="fimba-card fimba-muted">Sin participantes cargados.</div>;
  }
  return (
    <div className="fimba-card" style={{ padding: 0, overflow: "hidden" }}>
      <table className="fimba-table">
        <thead>
          <tr>
            <th style={{ paddingLeft: "1rem" }}>Apellido</th>
            <th>Nombre</th>
            <th>Documento</th>
            <th>Género</th>
            <th>Alimentación</th>
            <th>Activo</th>
          </tr>
        </thead>
        <tbody>
          {participantes.map((p) => (
            <tr key={p.id} style={{ opacity: p.activo === false ? 0.5 : 1 }}>
              <td style={{ paddingLeft: "1rem", fontWeight: 600 }}>{p.apellido}</td>
              <td>{p.nombre}</td>
              <td className="fimba-muted">{p.documento || "—"}</td>
              <td>{labelGenero(p.genero)}</td>
              <td>{labelAlimentacion(p.tipo_alimentacion)}</td>
              <td>{p.activo === false ? "No" : "Sí"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Planilla Excel de participantes: celdas inline, blur/Enter guarda, semáforo por fila.
 * Fila inferior `__new__` crea en Supabase al completar apellido+nombre.
 */
function ParticipantesPlanilla({ propuestaId, participantes, onListChange, onError }) {
  const [drafts, setDrafts] = useState({});
  const [rowStatus, setRowStatus] = useState({});
  const [rowErrors, setRowErrors] = useState({});
  const savingRef = useRef(new Set());
  const draftsRef = useRef(drafts);
  draftsRef.current = drafts;
  const listRef = useRef(participantes);
  listRef.current = participantes;

  // Hidratar drafts: no pisar celdas locales pendientes (mismo criterio que planilla artistas).
  useEffect(() => {
    setDrafts((prev) => {
      const next = { [NEW_ROW_KEY]: prev[NEW_ROW_KEY] ?? emptyDraft() };
      for (const p of participantes || []) {
        const k = String(p.id);
        next[k] = prev[k] ?? draftFromParticipante(p);
      }
      draftsRef.current = next;
      return next;
    });
  }, [participantes]);

  // Flash saved → idle
  useEffect(() => {
    const ids = Object.entries(rowStatus)
      .filter(([, s]) => s === "saved")
      .map(([id]) => id);
    if (ids.length === 0) return undefined;
    const t = setTimeout(() => {
      setRowStatus((prev) => {
        const n = { ...prev };
        for (const id of ids) {
          if (n[id] === "saved") n[id] = "idle";
        }
        return n;
      });
    }, 2200);
    return () => clearTimeout(t);
  }, [rowStatus]);

  const setField = (rowKey, field, value) => {
    setDrafts((prev) => {
      const base =
        prev[rowKey] ||
        (rowKey === NEW_ROW_KEY
          ? emptyDraft()
          : draftFromParticipante(
              (listRef.current || []).find((x) => String(x.id) === String(rowKey)) || {},
            ));
      const nextDraft = { ...base, [field]: value };
      draftsRef.current = { ...prev, [rowKey]: nextDraft };
      return draftsRef.current;
    });
    setRowStatus((prev) => ({
      ...prev,
      [rowKey]: prev[rowKey] === "saving" ? "saving" : "dirty",
    }));
    setRowErrors((prev) => {
      if (!prev[rowKey]) return prev;
      const n = { ...prev };
      delete n[rowKey];
      return n;
    });
  };

  const commitRow = async (rowKey, draftOverride = null) => {
    if (savingRef.current.has(rowKey)) return;

    const isCreate = rowKey === NEW_ROW_KEY;
    const existing = isCreate
      ? null
      : (listRef.current || []).find((x) => String(x.id) === String(rowKey));

    if (!isCreate && !existing) return;

    const draft =
      draftOverride ||
      draftsRef.current[rowKey] ||
      (isCreate ? emptyDraft() : draftFromParticipante(existing));

    if (!isCreate) {
      const baseline = draftFromParticipante(existing);
      if (draftsEqual(draft, baseline)) {
        setRowStatus((prev) => ({
          ...prev,
          [rowKey]: prev[rowKey] === "error" ? "error" : "idle",
        }));
        return;
      }
    }

    const validated = validateParticipanteDraft(draft, { isCreate });
    if (validated.empty) {
      setRowStatus((prev) => ({ ...prev, [rowKey]: "idle" }));
      return;
    }
    if (validated.incomplete) {
      // Sigue dirty / pendiente hasta apellido+nombre
      setRowStatus((prev) => ({
        ...prev,
        [rowKey]: prev[rowKey] === "error" ? "error" : "dirty",
      }));
      return;
    }
    if (!validated.ok) {
      setRowStatus((prev) => ({ ...prev, [rowKey]: "error" }));
      setRowErrors((prev) => ({ ...prev, [rowKey]: validated.error }));
      return;
    }

    savingRef.current.add(rowKey);
    setRowStatus((prev) => ({ ...prev, [rowKey]: "saving" }));
    setRowErrors((prev) => {
      const n = { ...prev };
      delete n[rowKey];
      return n;
    });

    if (isCreate) {
      const { participante: created, error: err } = await createFimbaParticipante({
        id_propuesta: propuestaId,
        ...validated.patch,
      });
      savingRef.current.delete(rowKey);
      if (err) {
        setRowStatus((prev) => ({ ...prev, [rowKey]: "error" }));
        setRowErrors((prev) => ({
          ...prev,
          [rowKey]: err.message || "Error al crear",
        }));
        return;
      }
      setDrafts((prev) => {
        const n = { ...prev, [NEW_ROW_KEY]: emptyDraft() };
        draftsRef.current = n;
        return n;
      });
      setRowStatus((prev) => ({ ...prev, [NEW_ROW_KEY]: "idle" }));
      onListChange((list) => {
        const next = [...(list || []), created].sort((a, b) => {
          const ap = String(a.apellido || "").localeCompare(String(b.apellido || ""), "es");
          if (ap !== 0) return ap;
          return String(a.nombre || "").localeCompare(String(b.nombre || ""), "es");
        });
        listRef.current = next;
        return next;
      });
      // Flash saved on the new row id briefly via list join — mark create success on empty
      return;
    }

    const { participante: updated, error: err } = await updateFimbaParticipante(
      existing.id,
      validated.patch,
    );
    savingRef.current.delete(rowKey);

    if (err) {
      setRowStatus((prev) => ({ ...prev, [rowKey]: "error" }));
      setRowErrors((prev) => ({
        ...prev,
        [rowKey]: err.message || "Error al guardar",
      }));
      return;
    }

    const nextDraft = draftFromParticipante(updated);
    setDrafts((prev) => {
      const n = { ...prev, [rowKey]: nextDraft };
      draftsRef.current = n;
      return n;
    });
    setRowStatus((prev) => ({ ...prev, [rowKey]: "saved" }));
    onListChange((list) => {
      const next = (list || []).map((p) =>
        String(p.id) === String(updated.id) ? updated : p,
      );
      listRef.current = next;
      return next;
    });
  };

  const changeAndCommit = (rowKey, field, value) => {
    const existing =
      rowKey === NEW_ROW_KEY
        ? null
        : (listRef.current || []).find((x) => String(x.id) === String(rowKey));
    const base =
      draftsRef.current[rowKey] ||
      (existing ? draftFromParticipante(existing) : emptyDraft());
    const nextDraft = { ...base, [field]: value };
    setDrafts((prev) => {
      const n = { ...prev, [rowKey]: nextDraft };
      draftsRef.current = n;
      return n;
    });
    setRowStatus((prev) => ({ ...prev, [rowKey]: "dirty" }));
    setRowErrors((prev) => {
      if (!prev[rowKey]) return prev;
      const n = { ...prev };
      delete n[rowKey];
      return n;
    });
    commitRow(rowKey, nextDraft);
  };

  const handleDelete = async (p) => {
    if (!window.confirm(`¿Eliminar a ${p.apellido}, ${p.nombre}?`)) return;
    const { error: err } = await deleteFimbaParticipante(p.id);
    if (err) {
      onError?.(err.message || "No se pudo eliminar");
      return;
    }
    const k = String(p.id);
    setDrafts((prev) => {
      const n = { ...prev };
      delete n[k];
      draftsRef.current = n;
      return n;
    });
    setRowStatus((prev) => {
      const n = { ...prev };
      delete n[k];
      return n;
    });
    setRowErrors((prev) => {
      const n = { ...prev };
      delete n[k];
      return n;
    });
    onListChange((list) => {
      const next = (list || []).filter((x) => String(x.id) !== k);
      listRef.current = next;
      return next;
    });
  };

  const focusCell = (rowIdx, colIdx) => {
    const el = document.querySelector(`[data-fimba-part-cell="${rowIdx}-${colIdx}"]`);
    if (el && typeof el.focus === "function") el.focus();
  };

  const rows = participantes || [];
  const totalRows = rows.length + 1; // + new row

  const handleCellKeyDown = (e, rowIdx, colIdx, rowKey) => {
    if (e.key === "Enter" && e.target.tagName !== "TEXTAREA") {
      e.preventDefault();
      commitRow(rowKey).then(() => {
        const nextRow = Math.min(rowIdx + 1, totalRows - 1);
        focusCell(nextRow, colIdx);
      });
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      if (rowKey === NEW_ROW_KEY) {
        setDrafts((prev) => {
          const n = { ...prev, [NEW_ROW_KEY]: emptyDraft() };
          draftsRef.current = n;
          return n;
        });
      } else {
        const p = rows[rowIdx];
        if (p) {
          setDrafts((prev) => {
            const n = { ...prev, [rowKey]: draftFromParticipante(p) };
            draftsRef.current = n;
            return n;
          });
        }
      }
      setRowStatus((prev) => ({ ...prev, [rowKey]: "idle" }));
      setRowErrors((prev) => {
        const n = { ...prev };
        delete n[rowKey];
        return n;
      });
      e.target.blur();
    }
  };

  const colCount = 8; // sync + 6 data + actions

  const renderRow = (rowKey, rowIdx, draft, { isNew = false } = {}) => {
    const status = rowStatus[rowKey] || "idle";
    const meta = statusMeta(status);
    const rowCls =
      status === "saving"
        ? "fimba-row-saving"
        : status === "saved"
          ? "fimba-row-saved"
          : status === "dirty"
            ? "fimba-row-dirty"
            : status === "error"
              ? "fimba-row-error"
              : "";
    const inactive = !isNew && draft.activo === false;

    return (
      <React.Fragment key={rowKey}>
        <tr className={rowCls} style={inactive ? { opacity: 0.65 } : undefined}>
          <td className={`fimba-sync-col ${meta.cls}`} title={rowErrors[rowKey] || meta.title}>
            <span className={`fimba-sync-dot ${meta.cls}`} aria-hidden />
            {status === "saving" && (
              <IconLoader size={10} className="animate-spin fimba-sync-icon" />
            )}
            {status === "saved" && <IconCheck size={10} className="fimba-sync-icon" />}
            {status === "error" && (
              <IconAlertTriangle size={10} className="fimba-sync-icon" />
            )}
          </td>
          <td>
            <input
              data-fimba-part-cell={`${rowIdx}-0`}
              className="fimba-cell-input"
              placeholder={isNew ? "Apellido…" : undefined}
              value={draft.apellido}
              onChange={(e) => setField(rowKey, "apellido", e.target.value)}
              onBlur={() => commitRow(rowKey)}
              onKeyDown={(e) => handleCellKeyDown(e, rowIdx, 0, rowKey)}
              disabled={status === "saving"}
            />
          </td>
          <td>
            <input
              data-fimba-part-cell={`${rowIdx}-1`}
              className="fimba-cell-input"
              placeholder={isNew ? "Nombre…" : undefined}
              value={draft.nombre}
              onChange={(e) => setField(rowKey, "nombre", e.target.value)}
              onBlur={() => commitRow(rowKey)}
              onKeyDown={(e) => handleCellKeyDown(e, rowIdx, 1, rowKey)}
              disabled={status === "saving"}
            />
          </td>
          <td>
            <input
              data-fimba-part-cell={`${rowIdx}-2`}
              className="fimba-cell-input"
              placeholder={isNew ? "Documento…" : undefined}
              value={draft.documento}
              onChange={(e) => setField(rowKey, "documento", e.target.value)}
              onBlur={() => commitRow(rowKey)}
              onKeyDown={(e) => handleCellKeyDown(e, rowIdx, 2, rowKey)}
              disabled={status === "saving"}
            />
          </td>
          <td>
            <select
              data-fimba-part-cell={`${rowIdx}-3`}
              className="fimba-cell-input"
              value={draft.genero || FIMBA_GENERO_DEFAULT}
              onChange={(e) => changeAndCommit(rowKey, "genero", e.target.value)}
              onKeyDown={(e) => handleCellKeyDown(e, rowIdx, 3, rowKey)}
              disabled={status === "saving"}
            >
              {FIMBA_GENEROS.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label}
                </option>
              ))}
            </select>
          </td>
          <td>
            <select
              data-fimba-part-cell={`${rowIdx}-4`}
              className="fimba-cell-input"
              value={draft.tipo_alimentacion || "regular"}
              onChange={(e) => changeAndCommit(rowKey, "tipo_alimentacion", e.target.value)}
              onKeyDown={(e) => handleCellKeyDown(e, rowIdx, 4, rowKey)}
              disabled={status === "saving"}
            >
              {FIMBA_TIPOS_ALIMENTACION.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </td>
          <td style={{ textAlign: "center" }}>
            <input
              data-fimba-part-cell={`${rowIdx}-5`}
              type="checkbox"
              checked={asBool(draft.activo)}
              onChange={(e) => changeAndCommit(rowKey, "activo", e.target.checked)}
              disabled={status === "saving"}
              title="Activo"
              aria-label="Activo"
            />
          </td>
          <td style={{ textAlign: "right", paddingRight: "0.75rem", whiteSpace: "nowrap" }}>
            {!isNew && (
              <button
                type="button"
                className="fimba-btn fimba-btn-danger"
                onClick={() => {
                  const p = rows.find((x) => String(x.id) === String(rowKey));
                  if (p) handleDelete(p);
                }}
                title="Eliminar"
                disabled={status === "saving"}
              >
                <IconTrash size={14} />
              </button>
            )}
          </td>
        </tr>
        {rowErrors[rowKey] && (
          <tr className="fimba-row-error-msg">
            <td colSpan={colCount} className="fimba-cell-error-msg">
              {rowErrors[rowKey]}
            </td>
          </tr>
        )}
      </React.Fragment>
    );
  };

  const newDraft = drafts[NEW_ROW_KEY] || emptyDraft();

  return (
    <div className="fimba-card" style={{ padding: 0, overflow: "auto" }}>
      <table className="fimba-table fimba-table-edit">
        <thead>
          <tr>
            <th className="fimba-sync-col" title="Semáforo" />
            <th style={{ paddingLeft: "0.5rem" }}>Apellido</th>
            <th>Nombre</th>
            <th>Documento</th>
            <th>Género</th>
            <th>Alimentación</th>
            <th style={{ textAlign: "center" }}>Activo</th>
            <th className="fimba-col-actions" />
          </tr>
        </thead>
        <tbody>
          {rows.map((p, rowIdx) => {
            const rowKey = String(p.id);
            const draft = drafts[rowKey] || draftFromParticipante(p);
            return renderRow(rowKey, rowIdx, draft);
          })}
          {renderRow(NEW_ROW_KEY, rows.length, newDraft, { isNew: true })}
        </tbody>
      </table>
      {rows.length === 0 && (
        <div className="fimba-muted" style={{ padding: "0.5rem 1rem 0.85rem", fontSize: "0.8rem" }}>
          Escribí apellido y nombre en la fila vacía para dar de alta el primer participante.
        </div>
      )}
    </div>
  );
}
