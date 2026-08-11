import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useParams } from "react-router-dom";
import {
  IconArrowLeft,
  IconClipboardCheck,
  IconLoader,
  IconTrash,
  IconCheck,
  IconAlertTriangle,
  IconHistory,
} from "../../components/ui/Icons";
import { useAuth } from "../../context/AuthContext";
import { useFimbaUserSession } from "../../hooks/useFimbaUserSession";
import {
  FIMBA_ESTADO_CONOCIDO_PRESETS,
  FIMBA_TIPO_CONTRATACION_DEFAULT,
  createFimbaContratacion,
  deleteFimbaContratacion,
  getFimbaEdicionById,
  listFimbaContratacionEstadoLog,
  listFimbaContrataciones,
  listFimbaPropuestas,
  parseFimbaMonto,
  resolveFimbaEstadoActor,
  resolveFimbaEstadoConocidoPreset,
  updateFimbaContratacion,
} from "../../services/fimbaService";

const NEW_ROW_KEY = "__new__";
const ESTADO_DATALIST_ID = "fimba-estado-conocido-presets";

const BOOL_FIELDS = [
  "envio_firma_mfm_nota",
  "nota_firmada",
  "falta_documentacion",
  "enviado_adm",
];

const EDITABLE_FIELDS = [
  "numero_expediente",
  "id_propuesta",
  "nombre",
  "monto",
  "fecha_limite_resol",
  "tipo_contratacion",
  ...BOOL_FIELDS,
  "ultimo_estado_conocido",
];

function asBool(v) {
  return v === true || v === "true" || v === 1 || v === "1";
}

function draftFromRow(r) {
  return {
    numero_expediente: r?.numero_expediente || "",
    id_propuesta: r?.id_propuesta != null ? String(r.id_propuesta) : "",
    nombre: r?.nombre || "",
    monto: r?.monto != null && r.monto !== "" ? String(r.monto) : "",
    fecha_limite_resol: r?.fecha_limite_resol || "",
    tipo_contratacion: r?.tipo_contratacion || FIMBA_TIPO_CONTRATACION_DEFAULT,
    envio_firma_mfm_nota: asBool(r?.envio_firma_mfm_nota),
    nota_firmada: asBool(r?.nota_firmada),
    falta_documentacion: asBool(r?.falta_documentacion),
    enviado_adm: asBool(r?.enviado_adm),
    ultimo_estado_conocido: r?.ultimo_estado_conocido || "",
  };
}

function emptyDraft() {
  return draftFromRow({ tipo_contratacion: FIMBA_TIPO_CONTRATACION_DEFAULT });
}

function draftsEqual(a, b) {
  return EDITABLE_FIELDS.every((k) => {
    if (BOOL_FIELDS.includes(k)) return asBool(a?.[k]) === asBool(b?.[k]);
    if (k === "monto") {
      return parseFimbaMonto(a?.[k]) === parseFimbaMonto(b?.[k]);
    }
    return String(a?.[k] ?? "") === String(b?.[k] ?? "");
  });
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

function isEmptyDraft(draft) {
  const d = draft || emptyDraft();
  const hasText =
    String(d.numero_expediente || "").trim() ||
    String(d.nombre || "").trim() ||
    String(d.ultimo_estado_conocido || "").trim() ||
    String(d.monto || "").trim() ||
    String(d.fecha_limite_resol || "").trim() ||
    (String(d.tipo_contratacion || "").trim() &&
      String(d.tipo_contratacion).trim() !== FIMBA_TIPO_CONTRATACION_DEFAULT);
  const hasProp = d.id_propuesta != null && String(d.id_propuesta) !== "";
  const hasBool = BOOL_FIELDS.some((k) => asBool(d[k]));
  return !hasText && !hasProp && !hasBool;
}

function validateDraft(draft, { isCreate = false } = {}) {
  if (isCreate && isEmptyDraft(draft)) {
    return { ok: false, empty: true };
  }

  if (draft.monto != null && String(draft.monto).trim() !== "") {
    const m = parseFimbaMonto(draft.monto);
    if (m == null) {
      return { ok: false, error: "Monto inválido" };
    }
  }

  const id_propuesta =
    draft.id_propuesta != null && String(draft.id_propuesta).trim() !== ""
      ? Number(draft.id_propuesta)
      : null;

  return {
    ok: true,
    patch: {
      numero_expediente: String(draft.numero_expediente || "").trim() || null,
      id_propuesta: Number.isFinite(id_propuesta) ? id_propuesta : null,
      nombre: String(draft.nombre || "").trim() || null,
      monto: parseFimbaMonto(draft.monto),
      fecha_limite_resol: draft.fecha_limite_resol || null,
      tipo_contratacion:
        String(draft.tipo_contratacion || "").trim() ||
        FIMBA_TIPO_CONTRATACION_DEFAULT,
      envio_firma_mfm_nota: asBool(draft.envio_firma_mfm_nota),
      nota_firmada: asBool(draft.nota_firmada),
      falta_documentacion: asBool(draft.falta_documentacion),
      enviado_adm: asBool(draft.enviado_adm),
      ultimo_estado_conocido:
        String(draft.ultimo_estado_conocido || "").trim() || null,
    },
  };
}

function formatMontoDisplay(value) {
  const n = parseFimbaMonto(value);
  if (n == null) return "";
  try {
    return new Intl.NumberFormat("es-AR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return String(n);
  }
}

function formatEstadoTimestamp(iso) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return String(iso);
    return d.toLocaleString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return String(iso);
  }
}

/** Badge coloreado para presets conocidos; texto plano si es libre. */
function EstadoConocidoBadge({ estado, style }) {
  const text = estado != null ? String(estado).trim() : "";
  if (!text) {
    return (
      <span className="fimba-muted" style={{ fontSize: "0.78rem", ...style }}>
        —
      </span>
    );
  }
  const preset = resolveFimbaEstadoConocidoPreset(text);
  if (preset) {
    return (
      <span
        className="fimba-ctr-estado-badge"
        style={{
          background: preset.bg,
          color: preset.color,
          ...style,
        }}
        title={text}
      >
        {text}
      </span>
    );
  }
  return (
    <span className="fimba-ctr-estado-badge fimba-ctr-estado-free" title={text} style={style}>
      {text}
    </span>
  );
}

/**
 * Input combobox: presets coloreados + texto libre (datalist).
 */
function EstadoConocidoInput({
  value,
  onChange,
  onCommit,
  onKeyDown,
  disabled,
  placeholder,
  listId = ESTADO_DATALIST_ID,
}) {
  const preset = resolveFimbaEstadoConocidoPreset(value);
  return (
    <div className="fimba-ctr-estado-wrap">
      <input
        className="fimba-cell-input fimba-ctr-estado-input"
        list={listId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => onCommit?.()}
        onKeyDown={onKeyDown}
        disabled={disabled}
        placeholder={placeholder || "Estado…"}
        style={
          preset
            ? { background: preset.bg, color: preset.color, fontWeight: 600 }
            : undefined
        }
        title={
          preset
            ? `Preset: ${preset.label}`
            : "Texto libre o elegí un preset de la lista"
        }
        aria-label="Último estado conocido"
      />
      {value && (
        <div className="fimba-ctr-estado-preview">
          <EstadoConocidoBadge estado={value} />
        </div>
      )}
    </div>
  );
}

/**
 * Planilla Contrataciones: expedientes + flags + estado con log de cambios.
 */
export default function FimbaContratacionesPage() {
  const { edicionId } = useParams();
  const { user, isManagement } = useAuth();
  const fimbaUser = useFimbaUserSession();
  const [edicion, setEdicion] = useState(null);
  const [rows, setRows] = useState([]);
  const [propuestas, setPropuestas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const actor = useMemo(
    () =>
      resolveFimbaEstadoActor({
        ofrnUser: user,
        fimbaUser,
        isOfrnStaff: Boolean(user && isManagement),
      }),
    [user, fimbaUser, isManagement],
  );

  const reload = async () => {
    setLoading(true);
    setError(null);
    const edRes = await getFimbaEdicionById(edicionId);
    if (edRes.error || !edRes.edicion) {
      setError(edRes.error?.message || "Edición no encontrada");
      setEdicion(null);
      setRows([]);
      setPropuestas([]);
      setLoading(false);
      return;
    }
    const [cRes, pRes] = await Promise.all([
      listFimbaContrataciones(edicionId),
      listFimbaPropuestas(edicionId),
    ]);
    if (cRes.error) setError(cRes.error.message || "Error al cargar contrataciones");
    if (pRes.error && !cRes.error) {
      setError(pRes.error.message || "Error al cargar artistas");
    }
    setEdicion(edRes.edicion);
    setRows(cRes.contrataciones || []);
    setPropuestas(pRes.propuestas || []);
    setLoading(false);
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [edicionId]);

  if (loading) {
    return (
      <div
        className="fimba-card fimba-muted"
        style={{ display: "flex", gap: 8, alignItems: "center" }}
      >
        <IconLoader size={18} className="animate-spin" /> Cargando contrataciones…
      </div>
    );
  }

  if (!edicion) {
    return (
      <div>
        <div className="fimba-error">{error || "Edición no encontrada."}</div>
        <Link
          to="/fimba"
          className="fimba-btn fimba-btn-ghost"
          style={{ marginTop: 12, textDecoration: "none" }}
        >
          <IconArrowLeft size={14} /> Volver
        </Link>
      </div>
    );
  }

  return (
    <div className="fimba-transport-wide">
      <Link
        to={`/fimba/edicion/${edicionId}`}
        className="fimba-btn fimba-btn-ghost"
        style={{ textDecoration: "none", marginBottom: 12 }}
      >
        <IconArrowLeft size={14} /> {edicion.nombre}
      </Link>

      <div style={{ marginBottom: "1rem" }}>
        <h1
          style={{
            margin: 0,
            fontSize: "1.5rem",
            color: "var(--fimba-deep)",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <IconClipboardCheck size={22} aria-hidden /> Contrataciones
        </h1>
        <p className="fimba-muted" style={{ margin: "0.35rem 0 0" }}>
          Expedientes y seguimiento. «Último estado» con presets de color o texto
          libre; cada cambio queda en historial (fecha y autor).
        </p>
      </div>

      {error && (
        <div className="fimba-error" style={{ marginBottom: 12 }}>
          {error}
        </div>
      )}

      <ContratacionesPlanilla
        edicionId={edicionId}
        rows={rows}
        propuestas={propuestas}
        actor={actor}
        onListChange={setRows}
        onError={setError}
      />
    </div>
  );
}

function ContratacionesPlanilla({
  edicionId,
  rows,
  propuestas,
  actor,
  onListChange,
  onError,
}) {
  const [drafts, setDrafts] = useState({});
  const [rowStatus, setRowStatus] = useState({});
  const [rowErrors, setRowErrors] = useState({});
  const [historyModal, setHistoryModal] = useState(null);
  const savingRef = useRef(new Set());
  const draftsRef = useRef(drafts);
  draftsRef.current = drafts;
  const listRef = useRef(rows);
  listRef.current = rows;

  useEffect(() => {
    setDrafts((prev) => {
      const next = { [NEW_ROW_KEY]: prev[NEW_ROW_KEY] ?? emptyDraft() };
      for (const r of rows || []) {
        const k = String(r.id);
        next[k] = prev[k] ?? draftFromRow(r);
      }
      draftsRef.current = next;
      return next;
    });
  }, [rows]);

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
          : draftFromRow(
              (listRef.current || []).find((x) => String(x.id) === String(rowKey)) ||
                {},
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
      (isCreate ? emptyDraft() : draftFromRow(existing));

    if (!isCreate) {
      const baseline = draftFromRow(existing);
      if (draftsEqual(draft, baseline)) {
        setRowStatus((prev) => ({
          ...prev,
          [rowKey]: prev[rowKey] === "error" ? "error" : "idle",
        }));
        return;
      }
    }

    const validated = validateDraft(draft, { isCreate });
    if (validated.empty) {
      setRowStatus((prev) => ({ ...prev, [rowKey]: "idle" }));
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

    const opts = { actor };

    if (isCreate) {
      const { contratacion: created, error: err } = await createFimbaContratacion(
        {
          id_edicion: edicionId,
          ...validated.patch,
        },
        opts,
      );
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
      setRowStatus((prev) => ({
        ...prev,
        [NEW_ROW_KEY]: "idle",
        [String(created.id)]: "saved",
      }));
      onListChange((list) => {
        const next = [...(list || []), created].sort((a, b) => {
          const o = (Number(a.orden) || 0) - (Number(b.orden) || 0);
          if (o !== 0) return o;
          return Number(a.id) - Number(b.id);
        });
        listRef.current = next;
        return next;
      });
      return;
    }

    // Evitar re-loguear estado si no cambió: particionar el patch.
    const baseline = draftFromRow(existing);
    const estadoChanged =
      String(draft.ultimo_estado_conocido || "").trim() !==
      String(baseline.ultimo_estado_conocido || "").trim();
    const patch = { ...validated.patch };
    if (!estadoChanged) {
      delete patch.ultimo_estado_conocido;
    }

    const { contratacion: updated, error: err } = await updateFimbaContratacion(
      existing.id,
      patch,
      opts,
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

    const nextDraft = draftFromRow(updated);
    setDrafts((prev) => {
      const n = { ...prev, [rowKey]: nextDraft };
      draftsRef.current = n;
      return n;
    });
    setRowStatus((prev) => ({ ...prev, [rowKey]: "saved" }));
    onListChange((list) => {
      const next = (list || []).map((r) =>
        String(r.id) === String(updated.id) ? updated : r,
      );
      listRef.current = next;
      return next;
    });
  };

  const changeAndCommit = (rowKey, field, value, extra = {}) => {
    const existing =
      rowKey === NEW_ROW_KEY
        ? null
        : (listRef.current || []).find((x) => String(x.id) === String(rowKey));
    const base =
      draftsRef.current[rowKey] ||
      (existing ? draftFromRow(existing) : emptyDraft());
    let nextDraft = { ...base, [field]: value, ...extra };

    if (field === "id_propuesta" && value) {
      const prop = (propuestas || []).find((p) => String(p.id) === String(value));
      if (prop && !String(base.nombre || "").trim()) {
        nextDraft = { ...nextDraft, nombre: prop.nombre || "" };
      }
    }

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

  const handleDelete = async (r) => {
    const label =
      r.nombre ||
      r.fimba_propuestas?.nombre ||
      r.numero_expediente ||
      `#${r.id}`;
    if (!window.confirm(`¿Eliminar contratación «${label}»?`)) return;
    const { error: err } = await deleteFimbaContratacion(r.id);
    if (err) {
      onError?.(err.message || "No se pudo eliminar");
      return;
    }
    const k = String(r.id);
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

  const openHistory = (r) => {
    setHistoryModal({
      id: r.id,
      label:
        r.nombre ||
        r.fimba_propuestas?.nombre ||
        r.numero_expediente ||
        `Contratación #${r.id}`,
    });
  };

  const handleCellKeyDown = (e, rowKey) => {
    if (e.key === "Enter" && e.target.tagName !== "TEXTAREA") {
      e.preventDefault();
      commitRow(rowKey);
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
        const r = (listRef.current || []).find(
          (x) => String(x.id) === String(rowKey),
        );
        if (r) {
          setDrafts((prev) => {
            const n = { ...prev, [rowKey]: draftFromRow(r) };
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

  const list = rows || [];
  const colCount = 14;
  const newDraft = drafts[NEW_ROW_KEY] || emptyDraft();

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
    const displayNum = isNew ? "·" : rowIdx + 1;
    const disabled = status === "saving";

    return (
      <React.Fragment key={rowKey}>
        <tr className={rowCls}>
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
          <td className="fimba-ctr-num" title={isNew ? "Nueva fila" : `#${rowIdx + 1}`}>
            {displayNum}
          </td>
          <td>
            <input
              className="fimba-cell-input"
              placeholder={isNew ? "Nº exp…" : undefined}
              value={draft.numero_expediente}
              onChange={(e) => setField(rowKey, "numero_expediente", e.target.value)}
              onBlur={() => commitRow(rowKey)}
              onKeyDown={(e) => handleCellKeyDown(e, rowKey)}
              disabled={disabled}
            />
          </td>
          <td className="fimba-ctr-nombre">
            <div className="fimba-ctr-nombre-stack">
              <select
                className="fimba-cell-input fimba-ctr-artista-select"
                value={draft.id_propuesta || ""}
                onChange={(e) =>
                  changeAndCommit(rowKey, "id_propuesta", e.target.value)
                }
                disabled={disabled}
                title="Vincular a artista (opcional)"
                aria-label="Artista"
              >
                <option value="">— Sin artista —</option>
                {(propuestas || []).map((p) => (
                  <option key={p.id} value={String(p.id)}>
                    {p.nombre}
                  </option>
                ))}
              </select>
              <input
                className="fimba-cell-input"
                placeholder={isNew ? "Nombre o proveedor…" : "Nombre…"}
                value={draft.nombre}
                onChange={(e) => setField(rowKey, "nombre", e.target.value)}
                onBlur={() => commitRow(rowKey)}
                onKeyDown={(e) => handleCellKeyDown(e, rowKey)}
                disabled={disabled}
              />
            </div>
          </td>
          <td>
            <input
              className="fimba-cell-input fimba-ctr-monto"
              inputMode="decimal"
              placeholder={isNew ? "Monto" : undefined}
              value={draft.monto}
              onChange={(e) => setField(rowKey, "monto", e.target.value)}
              onBlur={() => commitRow(rowKey)}
              onKeyDown={(e) => handleCellKeyDown(e, rowKey)}
              disabled={disabled}
              title={formatMontoDisplay(draft.monto) || "Monto opcional"}
            />
          </td>
          <td>
            <input
              type="date"
              className="fimba-cell-input fimba-ctr-fecha-limite"
              value={draft.fecha_limite_resol || ""}
              onChange={(e) =>
                changeAndCommit(rowKey, "fecha_limite_resol", e.target.value)
              }
              disabled={disabled}
              title="Fecha límite para la resolución"
              aria-label="Fecha límite para la resolución"
            />
          </td>
          <td>
            <input
              className="fimba-cell-input"
              value={draft.tipo_contratacion}
              onChange={(e) => setField(rowKey, "tipo_contratacion", e.target.value)}
              onBlur={() => commitRow(rowKey)}
              onKeyDown={(e) => handleCellKeyDown(e, rowKey)}
              disabled={disabled}
              placeholder={FIMBA_TIPO_CONTRATACION_DEFAULT}
            />
          </td>
          <td style={{ textAlign: "center" }}>
            <input
              type="checkbox"
              className="fimba-ctr-check fimba-ctr-check-blue"
              checked={asBool(draft.envio_firma_mfm_nota)}
              onChange={(e) =>
                changeAndCommit(rowKey, "envio_firma_mfm_nota", e.target.checked)
              }
              disabled={disabled}
              title="Envío a la firma de MFM nota"
              aria-label="Envío a la firma de MFM nota"
            />
          </td>
          <td style={{ textAlign: "center" }}>
            <input
              type="checkbox"
              className="fimba-ctr-check fimba-ctr-check-green"
              checked={asBool(draft.nota_firmada)}
              onChange={(e) =>
                changeAndCommit(rowKey, "nota_firmada", e.target.checked)
              }
              disabled={disabled}
              title="Nota firmada"
              aria-label="Nota firmada"
            />
          </td>
          <td style={{ textAlign: "center" }}>
            <input
              type="checkbox"
              className="fimba-ctr-check fimba-ctr-check-red"
              checked={asBool(draft.falta_documentacion)}
              onChange={(e) =>
                changeAndCommit(rowKey, "falta_documentacion", e.target.checked)
              }
              disabled={disabled}
              title="Falta recibir documentación"
              aria-label="Falta recibir documentación"
            />
          </td>
          <td style={{ textAlign: "center" }}>
            <input
              type="checkbox"
              className="fimba-ctr-check fimba-ctr-check-purple"
              checked={asBool(draft.enviado_adm)}
              onChange={(e) =>
                changeAndCommit(rowKey, "enviado_adm", e.target.checked)
              }
              disabled={disabled}
              title="Enviado a ADM"
              aria-label="Enviado a ADM"
            />
          </td>
          <td className="fimba-ctr-estado-cell">
            <EstadoConocidoInput
              value={draft.ultimo_estado_conocido}
              onChange={(v) => setField(rowKey, "ultimo_estado_conocido", v)}
              onCommit={() => commitRow(rowKey)}
              onKeyDown={(e) => handleCellKeyDown(e, rowKey)}
              disabled={disabled}
              placeholder={isNew ? "Estado…" : undefined}
            />
          </td>
          <td style={{ textAlign: "right", paddingRight: "0.5rem", whiteSpace: "nowrap" }}>
            {!isNew && (
              <>
                <button
                  type="button"
                  className="fimba-btn fimba-btn-ghost"
                  onClick={() => {
                    const r = list.find((x) => String(x.id) === String(rowKey));
                    if (r) openHistory(r);
                  }}
                  title="Ver historial de estados"
                  disabled={disabled}
                  style={{ marginRight: 4, padding: "0.35rem 0.5rem" }}
                >
                  <IconHistory size={14} />
                </button>
                <button
                  type="button"
                  className="fimba-btn fimba-btn-danger"
                  onClick={() => {
                    const r = list.find((x) => String(x.id) === String(rowKey));
                    if (r) handleDelete(r);
                  }}
                  title="Eliminar"
                  disabled={disabled}
                >
                  <IconTrash size={14} />
                </button>
              </>
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

  return (
    <div className="fimba-card fimba-ctr-card" style={{ padding: 0, overflow: "auto" }}>
      <style>{CTR_STYLES}</style>
      <datalist id={ESTADO_DATALIST_ID}>
        {FIMBA_ESTADO_CONOCIDO_PRESETS.map((p) => (
          <option key={p.value} value={p.value} />
        ))}
      </datalist>
      <table className="fimba-table fimba-table-edit fimba-ctr-table">
        <thead>
          <tr>
            <th className="fimba-sync-col" title="Semáforo" />
            <th className="fimba-ctr-num" title="Orden de fila">
              #
            </th>
            <th>Nº expediente</th>
            <th>Nombre</th>
            <th>Monto</th>
            <th title="Fecha límite para la resolución">Fecha límite resol.</th>
            <th>Tipo contrat.</th>
            <th className="fimba-ctr-th-check fimba-ctr-th-blue" title="Envío a la firma de MFM nota">
              Envío firma MFM
            </th>
            <th className="fimba-ctr-th-check fimba-ctr-th-green" title="Nota firmada">
              Nota firmada
            </th>
            <th className="fimba-ctr-th-check fimba-ctr-th-red" title="Falta recibir documentación">
              Falta doc.
            </th>
            <th className="fimba-ctr-th-check fimba-ctr-th-purple" title="Enviado a ADM">
              Enviado ADM
            </th>
            <th title="Preset coloreado o texto libre; cada cambio se registra en historial">
              Último estado conocido
            </th>
            <th className="fimba-col-actions" />
          </tr>
        </thead>
        <tbody>
          {list.map((r, rowIdx) => {
            const rowKey = String(r.id);
            const draft = drafts[rowKey] || draftFromRow(r);
            return renderRow(rowKey, rowIdx, draft);
          })}
          {renderRow(NEW_ROW_KEY, list.length, newDraft, { isNew: true })}
        </tbody>
      </table>
      {list.length === 0 && (
        <div
          className="fimba-muted"
          style={{ padding: "0.5rem 1rem 0.85rem", fontSize: "0.8rem" }}
        >
          Completá la fila vacía (expediente, nombre o flags) para dar de alta la
          primera contratación.
        </div>
      )}
      {historyModal && (
        <EstadoHistorialModal
          contratacionId={historyModal.id}
          label={historyModal.label}
          onClose={() => setHistoryModal(null)}
        />
      )}
    </div>
  );
}

function EstadoHistorialModal({ contratacionId, label, onClose }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const { entries: rows, error: err } =
        await listFimbaContratacionEstadoLog(contratacionId);
      if (cancelled) return;
      if (err) setError(err.message || "No se pudo cargar el historial");
      setEntries(rows || []);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [contratacionId]);

  // Chronological: oldest first in list display
  const chronological = useMemo(
    () => [...(entries || [])].reverse(),
    [entries],
  );

  return createPortal(
    <div
      className="fimba-modal-backdrop"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="fimba-modal"
        style={{ maxWidth: 520 }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="fimba-estado-hist-title"
      >
        <h2 id="fimba-estado-hist-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <IconHistory size={18} aria-hidden /> Historial de estados
        </h2>
        <p className="fimba-muted" style={{ margin: "0 0 1rem", fontSize: "0.88rem" }}>
          {label}
        </p>
        {loading && (
          <div className="fimba-muted" style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <IconLoader size={16} className="animate-spin" /> Cargando…
          </div>
        )}
        {error && <div className="fimba-error">{error}</div>}
        {!loading && !error && chronological.length === 0 && (
          <p className="fimba-muted" style={{ margin: 0 }}>
            Todavía no hay cambios de estado registrados.
          </p>
        )}
        {!loading && chronological.length > 0 && (
          <ul className="fimba-ctr-hist-list">
            {chronological.map((e) => (
              <li key={e.id} className="fimba-ctr-hist-item">
                <div className="fimba-ctr-hist-estado">
                  <EstadoConocidoBadge estado={e.estado} />
                </div>
                <div className="fimba-ctr-hist-meta">
                  <span className="fimba-ctr-hist-when">
                    {formatEstadoTimestamp(e.created_at)}
                  </span>
                  <span className="fimba-ctr-hist-who">
                    {e.created_by_label || "—"}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
        <div style={{ marginTop: "1.1rem", display: "flex", justifyContent: "flex-end" }}>
          <button type="button" className="fimba-btn fimba-btn-ghost" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

const CTR_STYLES = `
  .fimba-ctr-table {
    min-width: 1180px;
    width: max-content;
  }
  .fimba-ctr-table th {
    font-size: 0.72rem;
    white-space: nowrap;
    vertical-align: bottom;
  }
  .fimba-ctr-num {
    width: 2.2rem;
    text-align: center;
    color: #64748b;
    font-variant-numeric: tabular-nums;
    font-size: 0.8rem;
  }
  .fimba-ctr-nombre {
    min-width: 12rem;
  }
  .fimba-ctr-nombre-stack {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 11rem;
  }
  .fimba-ctr-artista-select {
    font-size: 0.72rem !important;
    color: #64748b;
  }
  .fimba-ctr-monto {
    width: 5.5rem;
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
  .fimba-ctr-fecha-limite {
    color: #dc2626 !important;
    font-weight: 700 !important;
    min-width: 8.5rem;
  }
  .fimba-ctr-th-check {
    max-width: 5.5rem;
    text-align: center;
    white-space: normal !important;
    line-height: 1.15;
    font-size: 0.68rem !important;
  }
  .fimba-ctr-th-blue { color: #2563eb; }
  .fimba-ctr-th-green { color: #16a34a; }
  .fimba-ctr-th-red { color: #dc2626; }
  .fimba-ctr-th-purple { color: #7c3aed; }
  .fimba-ctr-check {
    width: 1.05rem;
    height: 1.05rem;
    cursor: pointer;
    accent-color: currentColor;
  }
  .fimba-ctr-check-blue { accent-color: #2563eb; color: #2563eb; }
  .fimba-ctr-check-green { accent-color: #16a34a; color: #16a34a; }
  .fimba-ctr-check-red { accent-color: #dc2626; color: #dc2626; }
  .fimba-ctr-check-purple { accent-color: #7c3aed; color: #7c3aed; }
  .fimba-ctr-estado-cell {
    min-width: 11.5rem;
    max-width: 14rem;
  }
  .fimba-ctr-estado-wrap {
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 10.5rem;
  }
  .fimba-ctr-estado-input {
    font-size: 0.8rem !important;
  }
  .fimba-ctr-estado-preview {
    line-height: 1;
  }
  .fimba-ctr-estado-badge {
    display: inline-flex;
    align-items: center;
    max-width: 100%;
    border-radius: 999px;
    padding: 0.12rem 0.5rem;
    font-size: 0.68rem;
    font-weight: 700;
    line-height: 1.25;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .fimba-ctr-estado-free {
    background: #f1f5f9;
    color: #475569;
    font-weight: 600;
  }
  .fimba-ctr-hist-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.65rem;
    max-height: 55vh;
    overflow: auto;
  }
  .fimba-ctr-hist-item {
    border: 1px solid var(--fimba-border, #e2e8f0);
    border-radius: 10px;
    padding: 0.65rem 0.8rem;
    background: #fafbfc;
  }
  .fimba-ctr-hist-estado {
    margin-bottom: 0.35rem;
  }
  .fimba-ctr-hist-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem 0.85rem;
    font-size: 0.78rem;
    color: var(--fimba-muted, #5c5c5c);
  }
  .fimba-ctr-hist-when {
    font-variant-numeric: tabular-nums;
    font-weight: 600;
  }
  .fimba-ctr-hist-who {
    color: var(--fimba-deep, #94216d);
    font-weight: 600;
  }
`;
