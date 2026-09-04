import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useParams } from "react-router-dom";
import {
  IconArrowLeft,
  IconClipboardCheck,
  IconLoader,
  IconTrash,
  IconCheck,
  IconX,
  IconAlertTriangle,
  IconHistory,
  IconDrive,
  IconFolder,
  IconCloudUpload,
  IconExternalLink,
  IconMoreVertical,
} from "../../components/ui/Icons";
import ConfirmModal from "../../components/ui/ConfirmModal";
import { useAuth } from "../../context/AuthContext";
import { useFimbaAccess } from "../../hooks/useFimbaAccess";
import { useFimbaUserSession } from "../../hooks/useFimbaUserSession";
import {
  FIMBA_CONTRATACIONES_SHEET_URL,
  FIMBA_TIPO_CONTRATACION_DEFAULT,
  createFimbaContratacion,
  deleteFimbaContratacion,
  getFimbaContratacionesSheetSyncState,
  getFimbaEdicionById,
  listFimbaContratacionEstadoLog,
  listFimbaContrataciones,
  listFimbaPropuestas,
  normalizeCarpetaDocumentacion,
  parseFimbaMonto,
  resolveFimbaEstadoActor,
  syncFimbaContratacionesSheet,
  updateFimbaContratacion,
} from "../../services/fimbaService";
import {
  EstadoConocidoBadge,
  EstadoConocidoInput,
  FimbaEstadoConocidoStyles,
  formatFimbaEstadoTimestamp,
} from "./FimbaEstadoConocido";
import { DocumentacionDrivePreview } from "./FimbaDocumentacionDrivePreview";
import { FIMBA_ROLES } from "../../utils/fimbaUserSession";
import { useFimbaSheetLeaveGuard } from "./FimbaSheetLeaveGuardContext";

const NEW_ROW_KEY = "__new__";

const BOOL_FIELDS = [
  "envio_firma_mfm_nota",
  "nota_firmada",
  "falta_documentacion",
  "enviado_adm",
];

/** Campos patchables en edición de fila (doble clic → tilde). Carpeta Drive = modal. */
const EDITABLE_FIELDS = [
  "numero_expediente",
  "id_propuesta",
  "nombre",
  "monto",
  "tipo_contratacion",
  ...BOOL_FIELDS,
  "ultimo_estado_conocido",
];

function asBool(v) {
  if (v === true || v === 1 || v === "1" || v === "true") return true;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    // Sheet / imports may send «Sí»; treat as true for display/toggle only.
    if (s === "sí" || s === "si" || s === "yes") return true;
  }
  return false;
}

/** Inline SVGs — no text labels; true = tildado, false = cuadro vacío. */
function CtrCheckIcon({ checked }) {
  if (checked) {
    return (
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        aria-hidden
        focusable="false"
      >
        <rect
          x="1.5"
          y="1.5"
          width="13"
          height="13"
          rx="2"
          fill="currentColor"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path
          d="M4.2 8.1 L6.8 10.6 L11.8 5.2"
          fill="none"
          stroke="#fff"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      aria-hidden
      focusable="false"
    >
      <rect
        x="1.5"
        y="1.5"
        width="13"
        height="13"
        rx="2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
      />
    </svg>
  );
}

/** Flag de planilla: check tildado / cuadro vacío (colores por columna). Nunca texto «Sí». */
function ContratacionBoolToggle({
  checked,
  color,
  onChange,
  disabled,
  title,
  "aria-label": ariaLabel,
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={ariaLabel}
      title={title}
      disabled={disabled}
      data-ctr-bool={checked ? "1" : "0"}
      className={`fimba-ctr-check-btn fimba-ctr-check-${color}`}
      onClick={() => {
        if (disabled) return;
        onChange(!checked);
      }}
    >
      <CtrCheckIcon checked={checked} />
    </button>
  );
}

/** Kebab: historial + eliminar (Drive queda como acción primaria visible). */
function ContratacionRowMenu({
  disabled,
  readOnly,
  onHistory,
  onDelete,
}) {
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState(null);
  const btnRef = useRef(null);

  useEffect(() => {
    if (!open || !btnRef.current) {
      setMenuStyle(null);
      return undefined;
    }
    const place = () => {
      const r = btnRef.current.getBoundingClientRect();
      const width = 200;
      const left = Math.min(
        Math.max(8, r.right - width),
        window.innerWidth - width - 8,
      );
      const openUp = r.bottom + 160 > window.innerHeight && r.top > 160;
      setMenuStyle({
        position: "fixed",
        top: openUp ? undefined : r.bottom + 4,
        bottom: openUp ? window.innerHeight - r.top + 4 : undefined,
        left,
        width,
        zIndex: 110,
      });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onPointer = (e) => {
      if (btnRef.current?.contains(e.target)) return;
      const menu = document.getElementById("fimba-ctr-row-menu");
      if (menu?.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointer);
    };
  }, [open]);

  const itemStyle = {
    display: "flex",
    alignItems: "center",
    gap: 8,
    width: "100%",
    padding: "0.45rem 0.65rem",
    border: 0,
    background: "transparent",
    textAlign: "left",
    fontSize: "0.82rem",
    cursor: "pointer",
    color: "inherit",
  };

  const menu =
    open &&
    menuStyle &&
    createPortal(
      <div
        id="fimba-ctr-row-menu"
        className="fimba-dropdown-menu"
        role="menu"
        style={{
          ...menuStyle,
          background: "var(--fimba-surface, #fff)",
          border: "1px solid var(--fimba-border, #e2e8f0)",
          borderRadius: 10,
          boxShadow: "0 10px 28px rgba(15, 23, 42, 0.14)",
          padding: "0.3rem 0",
        }}
      >
        <button
          type="button"
          role="menuitem"
          style={itemStyle}
          onClick={() => {
            setOpen(false);
            onHistory?.();
          }}
        >
          <IconHistory size={14} /> Historial de estados
        </button>
        {!readOnly && (
          <button
            type="button"
            role="menuitem"
            style={{ ...itemStyle, color: "#b91c1c" }}
            disabled={disabled}
            onClick={() => {
              setOpen(false);
              onDelete?.();
            }}
          >
            <IconTrash size={14} /> Eliminar
          </button>
        )}
      </div>,
      document.body,
    );

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className="fimba-btn fimba-btn-ghost"
        style={{ padding: "0.28rem 0.3rem" }}
        aria-label="Más acciones"
        aria-expanded={open}
        aria-haspopup="menu"
        disabled={disabled}
        title="Más acciones"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        onDoubleClick={(e) => e.stopPropagation()}
      >
        <IconMoreVertical size={14} />
      </button>
      {menu}
    </>
  );
}

function draftFromRow(r) {
  return {
    numero_expediente: r?.numero_expediente || "",
    id_propuesta: r?.id_propuesta != null ? String(r.id_propuesta) : "",
    nombre: r?.nombre || "",
    monto: r?.monto != null && r.monto !== "" ? String(r.monto) : "",
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

/** Monto en ARS con locale es-AR (p. ej. $ 1.234,56). */
function formatMontoCurrency(value) {
  const n = parseFimbaMonto(value);
  if (n == null) return "";
  try {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return String(n);
  }
}

const ES_COLLATOR = new Intl.Collator("es", {
  sensitivity: "base",
  numeric: true,
});

/** Tipos de orden para columnas de la planilla. */
const SORT_TYPES = {
  orden: "number",
  numero_expediente: "text",
  id_propuesta: "text",
  nombre: "text",
  monto: "number",
  tipo_contratacion: "text",
  envio_firma_mfm_nota: "bool",
  nota_firmada: "bool",
  falta_documentacion: "bool",
  enviado_adm: "bool",
  ultimo_estado_conocido: "text",
};

function sortValEmpty(type, v) {
  if (type === "bool") return false;
  if (type === "number") return v == null || Number.isNaN(v);
  return v == null || String(v).trim() === "";
}

function resolveArtistaLabel(draft, row, propuestasById) {
  if (draft?.id_propuesta == null || String(draft.id_propuesta) === "") return "";
  return (
    propuestasById.get(String(draft.id_propuesta))?.nombre ||
    row?.fimba_propuestas?.nombre ||
    ""
  );
}

function getRowSortValue(key, draft, row, propuestasById) {
  switch (key) {
    case "orden":
      return Number(row?.orden) || Number(row?.id) || 0;
    case "numero_expediente":
      return String(draft?.numero_expediente || "").trim();
    case "id_propuesta":
      return resolveArtistaLabel(draft, row, propuestasById).trim();
    case "nombre":
      return String(draft?.nombre || "").trim();
    case "monto":
      return parseFimbaMonto(draft?.monto);
    case "tipo_contratacion":
      return String(draft?.tipo_contratacion || "").trim();
    case "envio_firma_mfm_nota":
    case "nota_firmada":
    case "falta_documentacion":
    case "enviado_adm":
      return asBool(draft?.[key]) ? 1 : 0;
    case "ultimo_estado_conocido":
      return String(draft?.ultimo_estado_conocido || "").trim();
    default:
      return "";
  }
}

function compareSortValues(type, a, b, dir) {
  const aEmpty = sortValEmpty(type, a);
  const bEmpty = sortValEmpty(type, b);
  if (aEmpty && bEmpty) return 0;
  // Vacíos siempre al final, en asc y desc.
  if (aEmpty) return 1;
  if (bEmpty) return -1;

  let cmp = 0;
  if (type === "number" || type === "bool") {
    cmp = Number(a) - Number(b);
  } else {
    cmp = ES_COLLATOR.compare(String(a), String(b));
  }
  return dir === "desc" ? -cmp : cmp;
}

function rowNombreSearchHaystack(draft, row, propuestasById) {
  const free = String(draft?.nombre || "").trim();
  const artist = resolveArtistaLabel(draft, row, propuestasById);
  return `${free} ${artist}`.trim().toLowerCase();
}

function SortableTh({
  colKey,
  sortKey,
  sortDir,
  onSort,
  className = "",
  title,
  children,
  extra = null,
}) {
  const active = sortKey === colKey;
  return (
    <th
      className={`fimba-ctr-th-sort ${className}${active ? " fimba-ctr-th-sort-active" : ""}${
        extra ? " fimba-ctr-th-has-extra" : ""
      }`}
      role="columnheader"
      aria-sort={
        active ? (sortDir === "asc" ? "ascending" : "descending") : "none"
      }
    >
      <div className={`fimba-ctr-th-head${extra ? " fimba-ctr-th-head-extra" : ""}`}>
        <button
          type="button"
          className="fimba-ctr-th-sort-btn"
          title={title || "Clic para ordenar"}
          onClick={() => onSort(colKey)}
        >
          <span className="fimba-ctr-th-sort-inner">
            <span className="fimba-ctr-th-label">{children}</span>
            <span className="fimba-ctr-sort-ind" aria-hidden>
              {active ? (sortDir === "asc" ? "▲" : "▼") : ""}
            </span>
          </span>
        </button>
        {extra}
      </div>
    </th>
  );
}

/**
 * Planilla Contrataciones: expedientes + flags + estado con log de cambios.
 * Backup Google Sheets: botón «Actualizar» + contador de cambios sin sync + bloqueo de salida.
 */
export default function FimbaContratacionesPage() {
  const { edicionId } = useParams();
  const { user, isManagement } = useAuth();
  const fimbaUser = useFimbaUserSession();
  const access = useFimbaAccess();
  const { registerGuard, tryNavigate } = useFimbaSheetLeaveGuard();
  const [edicion, setEdicion] = useState(null);
  const [rows, setRows] = useState([]);
  const [propuestas, setPropuestas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [unsyncedChanges, setUnsyncedChanges] = useState(0);
  const [hasDirtyDrafts, setHasDirtyDrafts] = useState(false);
  const [sheetSyncing, setSheetSyncing] = useState(false);
  const [sheetSyncMsg, setSheetSyncMsg] = useState("");
  const [sheetLastSyncedAt, setSheetLastSyncedAt] = useState(null);
  const [sheetLastError, setSheetLastError] = useState(null);
  const [sheetUrl, setSheetUrl] = useState(FIMBA_CONTRATACIONES_SHEET_URL);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [leaveSyncError, setLeaveSyncError] = useState(null);
  const planillaApiRef = useRef(null);
  const leaveCallbacksRef = useRef({ onStay: null, onLeaveAfterSync: null });

  const canSyncSheet = Boolean(access.canSeeContrataciones) && !access.readOnly;

  const actor = useMemo(
    () =>
      resolveFimbaEstadoActor({
        ofrnUser: user,
        fimbaUser,
        isOfrnStaff: Boolean(user && isManagement),
      }),
    [user, fimbaUser, isManagement],
  );

  const ofrnAuthPayload = useMemo(() => {
    if (!user?.id || !user?.mail || !isManagement) return null;
    const id = Number(user.id);
    const mail = String(user.mail || "").trim().toLowerCase();
    if (!Number.isFinite(id) || id <= 0 || !mail) return null;
    return { id, mail };
  }, [user, isManagement]);

  const fimbaAuthPayload = useMemo(() => {
    if (
      fimbaUser &&
      fimbaUser.rol_fimba === FIMBA_ROLES.EDITOR_GENERAL &&
      String(fimbaUser.id_edicion) === String(edicionId)
    ) {
      return {
        id: Number(fimbaUser.id),
        mail: String(fimbaUser.mail || "").trim().toLowerCase(),
        id_edicion: Number(fimbaUser.id_edicion),
      };
    }
    return null;
  }, [fimbaUser, edicionId]);

  const needsSheetSync = unsyncedChanges > 0 || hasDirtyDrafts;

  useEffect(() => {
    if (!canSyncSheet) {
      return registerGuard(null);
    }
    return registerGuard({
      get needsSync() {
        return unsyncedChanges > 0 || hasDirtyDrafts;
      },
      requestLeave: ({ onStay, onLeaveAfterSync } = {}) => {
        leaveCallbacksRef.current = { onStay, onLeaveAfterSync };
        setLeaveSyncError(null);
        setLeaveDialogOpen(true);
      },
    });
  }, [canSyncSheet, unsyncedChanges, hasDirtyDrafts, registerGuard]);

  useEffect(() => {
    if (!canSyncSheet || !needsSheetSync) return undefined;
    const onBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [canSyncSheet, needsSheetSync]);

  const loadSheetState = useCallback(async () => {
    const { state } = await getFimbaContratacionesSheetSyncState();
    if (state?.spreadsheet_url) setSheetUrl(state.spreadsheet_url);
    if (state?.last_synced_at) setSheetLastSyncedAt(state.last_synced_at);
    setSheetLastError(state?.last_error || null);
  }, []);

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
    loadSheetState();
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [edicionId]);

  const runSheetSync = useCallback(async () => {
    setSheetSyncing(true);
    setSheetSyncMsg("");
    setSheetLastError(null);
    try {
      // Guardar borradores sucios antes de volcar al Sheet
      if (planillaApiRef.current?.flushDirty) {
        const flush = await planillaApiRef.current.flushDirty();
        if (!flush?.ok) {
          throw new Error(
            flush?.error || "Hay filas con errores; corregilas antes de actualizar el Sheet.",
          );
        }
      }
      const { result, error: syncErr } = await syncFimbaContratacionesSheet({
        edicionId,
        ofrnAuth: ofrnAuthPayload,
        fimbaAuth: fimbaAuthPayload,
      });
      if (syncErr) throw syncErr;
      if (result?.busy) {
        setSheetSyncMsg("Sync en curso; reintentá en unos segundos.");
        return { ok: false, busy: true };
      }
      setUnsyncedChanges(0);
      setHasDirtyDrafts(false);
      if (result?.spreadsheetUrl) setSheetUrl(result.spreadsheetUrl);
      if (result?.syncedAt) setSheetLastSyncedAt(result.syncedAt);
      setSheetLastError(null);
      setSheetSyncMsg(
        `Sheet actualizado (${result?.rowCount ?? 0} filas).`,
      );
      return { ok: true, result };
    } catch (err) {
      const msg = err?.message || "Error al sincronizar Sheet";
      setSheetLastError(msg);
      setSheetSyncMsg(msg);
      return { ok: false, error: msg };
    } finally {
      setSheetSyncing(false);
    }
  }, [edicionId, ofrnAuthPayload, fimbaAuthPayload]);

  const handleLeaveCancel = () => {
    setLeaveDialogOpen(false);
    setLeaveSyncError(null);
    leaveCallbacksRef.current.onStay?.();
    leaveCallbacksRef.current = { onStay: null, onLeaveAfterSync: null };
  };

  const handleLeaveAndSync = async () => {
    setLeaveSyncError(null);
    const res = await runSheetSync();
    if (!res.ok) {
      setLeaveSyncError(res.error || "No se pudo actualizar el Sheet");
      throw new Error(res.error || "sync failed");
    }
    setLeaveDialogOpen(false);
    const proceed = leaveCallbacksRef.current.onLeaveAfterSync;
    leaveCallbacksRef.current = { onStay: null, onLeaveAfterSync: null };
    proceed?.();
  };

  const markPersistedChange = useCallback(() => {
    setUnsyncedChanges((n) => n + 1);
  }, []);

  const lastSyncLabel = useMemo(() => {
    if (!sheetLastSyncedAt) return "Nunca sincronizado en esta sesión / sin registro";
    try {
      return new Date(sheetLastSyncedAt).toLocaleString("es-AR");
    } catch {
      return sheetLastSyncedAt;
    }
  }, [sheetLastSyncedAt]);

  const unsyncedLabel =
    unsyncedChanges === 0 && !hasDirtyDrafts
      ? null
      : unsyncedChanges === 0 && hasDirtyDrafts
        ? "Hay ediciones sin guardar"
        : unsyncedChanges === 1
          ? "1 cambio sin sincronizar"
          : `${unsyncedChanges} cambios sin sincronizar`;

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
        onClick={(e) => {
          if (!tryNavigate(`/fimba/edicion/${edicionId}`)) e.preventDefault();
        }}
      >
        <IconArrowLeft size={14} /> {edicion.nombre}
      </Link>

      <div
        style={{
          marginBottom: "1rem",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div style={{ minWidth: 0, flex: "1 1 240px" }}>
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

        {canSyncSheet && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              gap: 6,
              flex: "0 1 auto",
            }}
          >
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "flex-end" }}>
              <a
                href={sheetUrl || FIMBA_CONTRATACIONES_SHEET_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="fimba-btn fimba-btn-ghost"
                style={{ textDecoration: "none" }}
                title="Abrir Google Sheet de respaldo"
              >
                <IconExternalLink size={14} /> Sheet
              </a>
              <button
                type="button"
                className="fimba-btn"
                disabled={sheetSyncing}
                onClick={() => runSheetSync()}
                title="Volcar la planilla al Google Sheet de respaldo"
                style={{
                  background: needsSheetSync ? "var(--fimba-pink, #d73289)" : undefined,
                  color: needsSheetSync ? "#fff" : undefined,
                }}
              >
                {sheetSyncing ? (
                  <IconLoader size={14} className="animate-spin" />
                ) : (
                  <IconCloudUpload size={14} />
                )}
                {sheetSyncing ? "Actualizando…" : "Actualizar"}
              </button>
            </div>
            <div
              className="fimba-muted"
              style={{ fontSize: "0.75rem", textAlign: "right", maxWidth: 320 }}
            >
              {unsyncedLabel && (
                <div style={{ color: "var(--fimba-pink, #d73289)", fontWeight: 700 }}>
                  {unsyncedLabel}
                </div>
              )}
              <div>Última sync: {lastSyncLabel}</div>
              {sheetSyncMsg && (
                <div
                  style={{
                    color: sheetLastError ? "#b91c1c" : "inherit",
                    marginTop: 2,
                  }}
                >
                  {sheetSyncMsg}
                </div>
              )}
              {sheetLastError && !sheetSyncMsg && (
                <div style={{ color: "#b91c1c", marginTop: 2 }}>{sheetLastError}</div>
              )}
            </div>
          </div>
        )}
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
        readOnly={Boolean(access.readOnly)}
        onListChange={setRows}
        onError={setError}
        onPersistedChange={markPersistedChange}
        onDirtyDraftsChange={setHasDirtyDrafts}
        apiRef={planillaApiRef}
      />

      <ConfirmModal
        isOpen={leaveDialogOpen}
        title="Cambios sin actualizar en Google Sheets"
        message={
          unsyncedLabel
            ? `${unsyncedLabel}. Para salir hay que volcar la planilla al Sheet de respaldo.`
            : "Hay cambios pendientes de sincronizar al Google Sheet."
        }
        cancelText="No salir"
        confirmText="Salir y Actualizar"
        confirmLoading={sheetSyncing}
        loadingText="Actualizando Sheet…"
        errorMessage={leaveSyncError}
        onClose={handleLeaveCancel}
        onConfirm={handleLeaveAndSync}
      />
    </div>
  );
}

function ContratacionesPlanilla({
  edicionId,
  rows,
  propuestas,
  actor,
  readOnly = false,
  onListChange,
  onError,
  onPersistedChange,
  onDirtyDraftsChange,
  apiRef,
}) {
  const [drafts, setDrafts] = useState(() => ({ [NEW_ROW_KEY]: emptyDraft() }));
  const [rowStatus, setRowStatus] = useState({});
  const [rowErrors, setRowErrors] = useState({});
  const [editingRowId, setEditingRowId] = useState(null);
  const [rowEditFocusField, setRowEditFocusField] = useState(null);
  const [historyModal, setHistoryModal] = useState(null);
  const [driveModal, setDriveModal] = useState(null);
  const [montoFocusKey, setMontoFocusKey] = useState(null);
  const [nombreQuery, setNombreQuery] = useState("");
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState("asc");
  const savingRef = useRef(new Set());
  const draftsRef = useRef(drafts);
  draftsRef.current = drafts;
  const listRef = useRef(rows);
  listRef.current = rows;
  const editingRowIdRef = useRef(editingRowId);
  editingRowIdRef.current = editingRowId;
  const onPersistedChangeRef = useRef(onPersistedChange);
  onPersistedChangeRef.current = onPersistedChange;

  useEffect(() => {
    const dirty = Object.entries(rowStatus).some(
      ([key, s]) =>
        (s === "dirty" || s === "saving") &&
        (key !== NEW_ROW_KEY || !isEmptyDraft(draftsRef.current[NEW_ROW_KEY])),
    );
    onDirtyDraftsChange?.(dirty);
  }, [rowStatus, onDirtyDraftsChange]);

  useEffect(() => {
    if (readOnly && editingRowId != null) {
      setEditingRowId(null);
      setRowEditFocusField(null);
    }
  }, [readOnly, editingRowId]);

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

  const isRowEditing = useCallback(
    (rowKey) =>
      editingRowId != null && String(editingRowId) === String(rowKey),
    [editingRowId],
  );

  const setField = (rowKey, field, value, extra = {}) => {
    setDrafts((prev) => {
      const base =
        prev[rowKey] ||
        (rowKey === NEW_ROW_KEY
          ? emptyDraft()
          : draftFromRow(
              (listRef.current || []).find((x) => String(x.id) === String(rowKey)) ||
                {},
            ));
      let nextDraft = { ...base, [field]: value, ...extra };
      if (field === "id_propuesta" && value) {
        const prop = (propuestas || []).find((p) => String(p.id) === String(value));
        if (prop && !String(base.nombre || "").trim()) {
          nextDraft = { ...nextDraft, nombre: prop.nombre || "" };
        }
      }
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
    if (savingRef.current.has(rowKey)) return { ok: false, busy: true };

    const isCreate = rowKey === NEW_ROW_KEY;
    const existing = isCreate
      ? null
      : (listRef.current || []).find((x) => String(x.id) === String(rowKey));

    if (!isCreate && !existing) return { ok: false };

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
        return { ok: true, noop: true };
      }
    }

    const validated = validateDraft(draft, { isCreate });
    if (validated.empty) {
      setRowStatus((prev) => ({ ...prev, [rowKey]: "idle" }));
      return { ok: true, noop: true };
    }
    if (!validated.ok) {
      setRowStatus((prev) => ({ ...prev, [rowKey]: "error" }));
      setRowErrors((prev) => ({ ...prev, [rowKey]: validated.error }));
      return { ok: false, error: validated.error };
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
        return { ok: false, error: err.message || "Error al crear" };
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
      onPersistedChangeRef.current?.();
      return { ok: true };
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
      return { ok: false, error: err.message || "Error al guardar" };
    }

    setDrafts((prev) => {
      const n = { ...prev };
      delete n[rowKey];
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
    onPersistedChangeRef.current?.();
    return { ok: true };
  };

  const cancelRowEdit = useCallback(
    (rowKey) => {
      const key = String(rowKey ?? editingRowIdRef.current ?? "");
      if (!key || key === NEW_ROW_KEY) {
        if (key === NEW_ROW_KEY) {
          setDrafts((prev) => {
            const n = { ...prev, [NEW_ROW_KEY]: emptyDraft() };
            draftsRef.current = n;
            return n;
          });
          setRowStatus((prev) => ({ ...prev, [NEW_ROW_KEY]: "idle" }));
          setRowErrors((prev) => {
            if (!prev[NEW_ROW_KEY]) return prev;
            const n = { ...prev };
            delete n[NEW_ROW_KEY];
            return n;
          });
        }
        setEditingRowId(null);
        setRowEditFocusField(null);
        setMontoFocusKey((k) => (k === NEW_ROW_KEY ? null : k));
        return;
      }
      setDrafts((prev) => {
        if (!prev[key]) return prev;
        const n = { ...prev };
        delete n[key];
        draftsRef.current = n;
        return n;
      });
      setRowStatus((prev) => ({ ...prev, [key]: "idle" }));
      setRowErrors((prev) => {
        if (!prev[key]) return prev;
        const n = { ...prev };
        delete n[key];
        return n;
      });
      setMontoFocusKey((k) => (k === key ? null : k));
      setEditingRowId(null);
      setRowEditFocusField(null);
    },
    [],
  );

  const beginRowEdit = useCallback(
    (row, focusField = null) => {
      if (readOnly || !row?.id) return;
      const key = String(row.id);
      if (editingRowId != null && editingRowId !== key) {
        cancelRowEdit(editingRowId);
      }
      setDrafts((prev) => {
        const n = { ...prev, [key]: draftFromRow(row) };
        draftsRef.current = n;
        return n;
      });
      setRowStatus((prev) => ({ ...prev, [key]: "idle" }));
      setEditingRowId(key);
      setRowEditFocusField(focusField || "numero_expediente");
    },
    [readOnly, editingRowId, cancelRowEdit],
  );

  const confirmRowEdit = useCallback(
    async (rowKey) => {
      const res = await commitRow(rowKey);
      if (res?.ok) {
        if (rowKey !== NEW_ROW_KEY) {
          if (res.noop) {
            setDrafts((prev) => {
              if (!prev[rowKey]) return prev;
              const n = { ...prev };
              delete n[rowKey];
              draftsRef.current = n;
              return n;
            });
          }
          setEditingRowId(null);
          setRowEditFocusField(null);
          setMontoFocusKey((k) => (k === String(rowKey) ? null : k));
        }
      }
      return res;
    },
    // commitRow cierra sobre refs
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useEffect(() => {
    if (editingRowId == null) return undefined;
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      cancelRowEdit(editingRowId);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editingRowId, cancelRowEdit]);

  const flushDirty = useCallback(async () => {
    const statusSnapshot = { ...rowStatus };
    const keys = new Set(Object.keys(draftsRef.current || {}));
    if (editingRowIdRef.current) keys.add(String(editingRowIdRef.current));
    keys.add(NEW_ROW_KEY);
    for (const key of keys) {
      const st = statusSnapshot[key] || rowStatus[key];
      if (st !== "dirty" && st !== "error") continue;
      if (key === NEW_ROW_KEY && isEmptyDraft(draftsRef.current[key])) continue;
      const res = await commitRow(key);
      if (!res?.ok && !res?.noop) {
        return {
          ok: false,
          error: res?.error || "No se pudieron guardar todas las filas",
        };
      }
      if (res?.ok && key !== NEW_ROW_KEY && editingRowIdRef.current === key) {
        setEditingRowId(null);
        setRowEditFocusField(null);
      }
    }
    return { ok: true };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rowStatus, actor, edicionId, onListChange]);

  useEffect(() => {
    if (!apiRef) return undefined;
    apiRef.current = { flushDirty };
    return () => {
      if (apiRef.current?.flushDirty === flushDirty) apiRef.current = null;
    };
  }, [apiRef, flushDirty]);

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
    if (editingRowIdRef.current === k) {
      setEditingRowId(null);
      setRowEditFocusField(null);
    }
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
    onPersistedChangeRef.current?.();
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

  const openDrive = (r) => {
    setDriveModal({
      id: r.id,
      label:
        r.nombre ||
        r.fimba_propuestas?.nombre ||
        r.numero_expediente ||
        `Contratación #${r.id}`,
      carpeta_documentacion: r.carpeta_documentacion || "",
    });
  };

  const handleCellKeyDown = (e, rowKey) => {
    if (e.key === "Enter") {
      if (e.target.tagName === "TEXTAREA") {
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          confirmRowEdit(rowKey);
        }
        return;
      }
      e.preventDefault();
      confirmRowEdit(rowKey);
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      if (rowKey === NEW_ROW_KEY) {
        cancelRowEdit(NEW_ROW_KEY);
      } else {
        cancelRowEdit(rowKey);
      }
    }
  };

  const list = rows || [];
  const colCount = 13; // sync · # · exp · artista · nombre · monto · tipo · 4 checks · estado · acciones
  const newDraft = drafts[NEW_ROW_KEY] || emptyDraft();

  const propuestasById = useMemo(() => {
    const m = new Map();
    for (const p of propuestas || []) {
      m.set(String(p.id), p);
    }
    return m;
  }, [propuestas]);

  const resolveDisplayDraft = useCallback(
    (r) => {
      const rowKey = String(r.id);
      if (drafts[rowKey] && (isRowEditing(rowKey) || rowStatus[rowKey] === "saving")) {
        return drafts[rowKey];
      }
      return draftFromRow(r);
    },
    [drafts, isRowEditing, rowStatus],
  );

  const handleSort = (col) => {
    if (sortKey === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(col);
      setSortDir("asc");
    }
  };

  const displayList = useMemo(() => {
    let items = [...list];
    const q = String(nombreQuery || "")
      .trim()
      .toLowerCase();
    if (q) {
      items = items.filter((r) => {
        const draft = resolveDisplayDraft(r);
        return rowNombreSearchHaystack(draft, r, propuestasById).includes(q);
      });
    }
    if (sortKey && SORT_TYPES[sortKey]) {
      const type = SORT_TYPES[sortKey];
      // While a row is in edit mode, sort from last committed row data so
      // typing in the active sort column does not reorder until confirm/cancel.
      const freezeSort = editingRowId != null;
      items.sort((ra, rb) => {
        const da = freezeSort ? draftFromRow(ra) : resolveDisplayDraft(ra);
        const db = freezeSort ? draftFromRow(rb) : resolveDisplayDraft(rb);
        const va = getRowSortValue(sortKey, da, ra, propuestasById);
        const vb = getRowSortValue(sortKey, db, rb, propuestasById);
        const c = compareSortValues(type, va, vb, sortDir);
        if (c !== 0) return c;
        const o = (Number(ra.orden) || 0) - (Number(rb.orden) || 0);
        if (o !== 0) return o;
        return Number(ra.id) - Number(rb.id);
      });
    }
    return items;
  }, [
    list,
    nombreQuery,
    sortKey,
    sortDir,
    propuestasById,
    resolveDisplayDraft,
    editingRowId,
  ]);

  const totalMonto = useMemo(() => {
    let sum = 0;
    for (const r of displayList) {
      const draft = resolveDisplayDraft(r);
      const n = parseFimbaMonto(draft.monto);
      if (n != null) sum += n;
    }
    return sum;
  }, [displayList, resolveDisplayDraft]);

  const renderRow = (rowKey, rowIdx, draft, { isNew = false, rowEntity = null } = {}) => {
    const status = rowStatus[rowKey] || "idle";
    const meta = statusMeta(status);
    const rowEditing = isNew || isRowEditing(rowKey);
    const rowCls = [
      status === "saving"
        ? "fimba-row-saving"
        : status === "saved"
          ? "fimba-row-saved"
          : status === "dirty"
            ? "fimba-row-dirty"
            : status === "error"
              ? "fimba-row-error"
              : "",
      rowEditing && !isNew ? "fimba-ctr-row-editing" : "",
    ]
      .filter(Boolean)
      .join(" ");
    const displayNum = isNew ? "·" : rowIdx + 1;
    const disabled = status === "saving";
    const artistLabel = resolveArtistaLabel(draft, rowEntity, propuestasById);
    const nombreText = String(draft.nombre || "").trim();

    return (
      <React.Fragment key={rowKey}>
        <tr
          className={rowCls}
          onDoubleClick={
            readOnly || isNew
              ? undefined
              : (e) => {
                  if (
                    e.target.closest(
                      "button, a, input, select, textarea, label, .fimba-ctr-actions",
                    )
                  ) {
                    return;
                  }
                  if (rowEntity) beginRowEdit(rowEntity);
                }
          }
          title={
            readOnly
              ? undefined
              : isNew
                ? "Fila nueva · tilde crea · Esc limpia"
                : rowEditing
                  ? "Editando fila · tilde confirma · Esc / X cancela"
                  : "Doble clic en la fila para editar · carpeta = Documentación Drive"
          }
          style={
            rowEditing && !isNew
              ? { background: "rgba(148,33,109,0.06)" }
              : undefined
          }
        >
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
          <td className="fimba-ctr-exp">
            {rowEditing ? (
              <input
                className="fimba-cell-input"
                placeholder={isNew ? "Nº exp…" : undefined}
                value={draft.numero_expediente}
                autoFocus={rowEditFocusField === "numero_expediente"}
                onChange={(e) => setField(rowKey, "numero_expediente", e.target.value)}
                onKeyDown={(e) => handleCellKeyDown(e, rowKey)}
                onDoubleClick={(e) => e.stopPropagation()}
                disabled={disabled}
              />
            ) : (
              <span className={draft.numero_expediente ? undefined : "fimba-muted"}>
                {draft.numero_expediente || "—"}
              </span>
            )}
          </td>
          <td className="fimba-ctr-artista">
            {rowEditing ? (
              <select
                className={`fimba-cell-input fimba-ctr-artista-select${
                  !draft.id_propuesta ? " fimba-ctr-artista-empty" : ""
                }`}
                value={draft.id_propuesta || ""}
                autoFocus={rowEditFocusField === "id_propuesta"}
                onChange={(e) => setField(rowKey, "id_propuesta", e.target.value)}
                onDoubleClick={(e) => e.stopPropagation()}
                disabled={disabled}
                title="Vincular a artista (opcional)"
                aria-label="Artista"
              >
                <option value="">Sin artista</option>
                {(propuestas || []).map((p) => (
                  <option key={p.id} value={String(p.id)}>
                    {p.nombre}
                  </option>
                ))}
              </select>
            ) : artistLabel ? (
              <span className="fimba-ctr-artista-ro" title={artistLabel}>
                {artistLabel}
              </span>
            ) : (
              <span className="fimba-muted fimba-ctr-artista-ro">Sin artista</span>
            )}
          </td>
          <td className="fimba-ctr-nombre">
            {rowEditing ? (
              <textarea
                className="fimba-cell-input fimba-ctr-nombre-textarea"
                placeholder={isNew ? "Nombre o proveedor…" : "Nombre…"}
                value={draft.nombre}
                autoFocus={rowEditFocusField === "nombre"}
                rows={2}
                onChange={(e) => setField(rowKey, "nombre", e.target.value)}
                onKeyDown={(e) => handleCellKeyDown(e, rowKey)}
                onDoubleClick={(e) => e.stopPropagation()}
                disabled={disabled}
                aria-label="Nombre"
              />
            ) : (
              <span
                className={
                  nombreText
                    ? "fimba-ctr-nombre-ro-text"
                    : "fimba-muted fimba-ctr-nombre-ro-text"
                }
                title={nombreText || undefined}
              >
                {nombreText || "—"}
              </span>
            )}
          </td>
          <td>
            {rowEditing ? (
              <input
                className="fimba-cell-input fimba-ctr-monto"
                inputMode="decimal"
                placeholder={isNew ? "Monto" : undefined}
                value={
                  montoFocusKey === rowKey
                    ? draft.monto
                    : formatMontoCurrency(draft.monto) || draft.monto || ""
                }
                autoFocus={rowEditFocusField === "monto"}
                onFocus={() => setMontoFocusKey(rowKey)}
                onChange={(e) => setField(rowKey, "monto", e.target.value)}
                onBlur={() => {
                  setMontoFocusKey((k) => (k === rowKey ? null : k));
                }}
                onKeyDown={(e) => handleCellKeyDown(e, rowKey)}
                onDoubleClick={(e) => e.stopPropagation()}
                disabled={disabled}
                title={formatMontoCurrency(draft.monto) || "Monto opcional"}
                aria-label="Monto"
              />
            ) : (
              <span
                className={`fimba-ctr-monto-ro${draft.monto ? "" : " fimba-muted"}`}
              >
                {formatMontoCurrency(draft.monto) || "—"}
              </span>
            )}
          </td>
          <td className="fimba-ctr-tipo">
            {rowEditing ? (
              <input
                className="fimba-cell-input"
                value={draft.tipo_contratacion}
                onChange={(e) => setField(rowKey, "tipo_contratacion", e.target.value)}
                onKeyDown={(e) => handleCellKeyDown(e, rowKey)}
                onDoubleClick={(e) => e.stopPropagation()}
                disabled={disabled}
                placeholder={FIMBA_TIPO_CONTRATACION_DEFAULT}
              />
            ) : (
              <span className={draft.tipo_contratacion ? undefined : "fimba-muted"}>
                {draft.tipo_contratacion || "—"}
              </span>
            )}
          </td>
          <td className="fimba-ctr-td-check">
            <ContratacionBoolToggle
              checked={asBool(draft.envio_firma_mfm_nota)}
              color="blue"
              onChange={(v) => setField(rowKey, "envio_firma_mfm_nota", v)}
              disabled={disabled || !rowEditing}
              title="Envío a la firma de MFM nota"
              aria-label="Envío a la firma de MFM nota"
            />
          </td>
          <td className="fimba-ctr-td-check">
            <ContratacionBoolToggle
              checked={asBool(draft.nota_firmada)}
              color="green"
              onChange={(v) => setField(rowKey, "nota_firmada", v)}
              disabled={disabled || !rowEditing}
              title="Nota firmada"
              aria-label="Nota firmada"
            />
          </td>
          <td className="fimba-ctr-td-check">
            <ContratacionBoolToggle
              checked={asBool(draft.falta_documentacion)}
              color="red"
              onChange={(v) => setField(rowKey, "falta_documentacion", v)}
              disabled={disabled || !rowEditing}
              title="Falta recibir documentación"
              aria-label="Falta recibir documentación"
            />
          </td>
          <td className="fimba-ctr-td-check">
            <ContratacionBoolToggle
              checked={asBool(draft.enviado_adm)}
              color="purple"
              onChange={(v) => setField(rowKey, "enviado_adm", v)}
              disabled={disabled || !rowEditing}
              title="Enviado a ADM"
              aria-label="Enviado a ADM"
            />
          </td>
          <td className="fimba-ctr-estado-cell">
            {rowEditing ? (
              <div onDoubleClick={(e) => e.stopPropagation()}>
                <EstadoConocidoInput
                  value={draft.ultimo_estado_conocido}
                  onChange={(v) => setField(rowKey, "ultimo_estado_conocido", v)}
                  onKeyDown={(e) => handleCellKeyDown(e, rowKey)}
                  disabled={disabled}
                  placeholder={isNew ? "Estado…" : undefined}
                />
              </div>
            ) : (
              <EstadoConocidoBadge estado={draft.ultimo_estado_conocido} />
            )}
          </td>
          <td className="fimba-ctr-actions fimba-col-actions">
            {!readOnly && rowEditing ? (
              <>
                <button
                  type="button"
                  className="fimba-btn fimba-btn-ghost"
                  onClick={() => confirmRowEdit(rowKey)}
                  onDoubleClick={(e) => e.stopPropagation()}
                  disabled={disabled}
                  title={
                    rowErrors[rowKey]
                      ? rowErrors[rowKey]
                      : isNew
                        ? "Crear contratación"
                        : "Confirmar cambios"
                  }
                  aria-label={
                    isNew ? "Crear contratación" : "Confirmar cambios de la fila"
                  }
                  style={{ color: "#166534" }}
                >
                  {disabled ? (
                    <IconLoader size={14} className="animate-spin" />
                  ) : (
                    <IconCheck size={14} />
                  )}
                </button>
                <button
                  type="button"
                  className="fimba-btn fimba-btn-ghost"
                  style={{ marginLeft: 2 }}
                  onClick={() => cancelRowEdit(rowKey)}
                  onDoubleClick={(e) => e.stopPropagation()}
                  disabled={disabled}
                  title={isNew ? "Limpiar fila (Esc)" : "Cancelar (Esc)"}
                  aria-label={
                    isNew ? "Limpiar fila nueva" : "Cancelar edición de la fila"
                  }
                >
                  <IconX size={14} />
                </button>
              </>
            ) : (
              !isNew &&
              (() => {
                const entity =
                  rowEntity ||
                  list.find((x) => String(x.id) === String(rowKey));
                const hasDrive = Boolean(
                  String(entity?.carpeta_documentacion || "").trim(),
                );
                return (
                  <div className="fimba-ctr-actions-inner">
                    <button
                      type="button"
                      className="fimba-btn fimba-btn-ghost"
                      onClick={() => {
                        if (entity) openDrive(entity);
                      }}
                      onDoubleClick={(e) => e.stopPropagation()}
                      title={
                        hasDrive
                          ? "Documentación Drive"
                          : "Configurar carpeta Drive"
                      }
                      disabled={disabled || readOnly}
                      style={{
                        padding: "0.28rem 0.35rem",
                        color: hasDrive
                          ? "var(--fimba-cyan, #00b1eb)"
                          : undefined,
                      }}
                    >
                      <IconFolder size={14} />
                    </button>
                    <ContratacionRowMenu
                      disabled={disabled}
                      readOnly={readOnly}
                      onHistory={() => {
                        if (entity) openHistory(entity);
                      }}
                      onDelete={() => {
                        if (entity) handleDelete(entity);
                      }}
                    />
                  </div>
                );
              })()
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
    <div className="fimba-card fimba-ctr-card">
      <style>{CTR_STYLES}</style>
      <FimbaEstadoConocidoStyles />
      <div className="fimba-ctr-total-bar" aria-live="polite">
        <span className="fimba-ctr-total-label">Total montos</span>
        <span className="fimba-ctr-total-value">
          {formatMontoCurrency(totalMonto) || formatMontoCurrency(0)}
        </span>
        <span className="fimba-ctr-total-meta">
          {list.length === 0
            ? "Sin filas"
            : (() => {
                const shown = displayList.length;
                const total = list.length;
                const q = String(nombreQuery || "").trim();
                if (q) {
                  return shown === 1
                    ? `1 de ${total}`
                    : `${shown} de ${total}`;
                }
                return total === 1
                  ? "1 contratación"
                  : `${total} contrataciones`;
              })()}
        </span>
      </div>
      <div className="fimba-ctr-scroll">
      <table className="fimba-table fimba-table-edit fimba-ctr-table">
        <thead>
          <tr>
            <th className="fimba-sync-col" title="Semáforo" />
            <SortableTh
              colKey="orden"
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={handleSort}
              className="fimba-ctr-num"
              title="Orden de fila"
            >
              #
            </SortableTh>
            <SortableTh
              colKey="numero_expediente"
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={handleSort}
              className="fimba-ctr-exp fimba-ctr-th-compact"
              title="Nº de expediente"
            >
              Nº exp.
            </SortableTh>
            <SortableTh
              colKey="id_propuesta"
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={handleSort}
              className="fimba-ctr-th-artista"
              title="Artista vinculado (propuesta)"
            >
              Artista
            </SortableTh>
            <SortableTh
              colKey="nombre"
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={handleSort}
              className="fimba-ctr-th-nombre"
              extra={
                <input
                  type="search"
                  className="fimba-cell-input fimba-ctr-nombre-filter"
                  value={nombreQuery}
                  onChange={(e) => setNombreQuery(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                  placeholder="Buscar…"
                  aria-label="Buscar por nombre"
                  title="Filtrar por nombre (texto libre o artista)"
                />
              }
            >
              Nombre
            </SortableTh>
            <SortableTh
              colKey="monto"
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={handleSort}
              className="fimba-ctr-th-monto"
            >
              Monto
            </SortableTh>
            <SortableTh
              colKey="tipo_contratacion"
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={handleSort}
              className="fimba-ctr-tipo fimba-ctr-th-compact"
              title="Tipo de contratación"
            >
              Tipo
            </SortableTh>
            <SortableTh
              colKey="envio_firma_mfm_nota"
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={handleSort}
              className="fimba-ctr-th-check fimba-ctr-th-blue"
              title="Envío a la firma de MFM nota"
            >
              Firma
            </SortableTh>
            <SortableTh
              colKey="nota_firmada"
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={handleSort}
              className="fimba-ctr-th-check fimba-ctr-th-green"
              title="Nota firmada"
            >
              Firmada
            </SortableTh>
            <SortableTh
              colKey="falta_documentacion"
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={handleSort}
              className="fimba-ctr-th-check fimba-ctr-th-red"
              title="Falta recibir documentación"
            >
              Doc.
            </SortableTh>
            <SortableTh
              colKey="enviado_adm"
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={handleSort}
              className="fimba-ctr-th-check fimba-ctr-th-purple"
              title="Enviado a ADM"
            >
              ADM
            </SortableTh>
            <SortableTh
              colKey="ultimo_estado_conocido"
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={handleSort}
              className="fimba-ctr-th-estado"
              title="Preset coloreado o texto libre; cada cambio se registra en historial"
            >
              Último estado
            </SortableTh>
            <th className="fimba-col-actions fimba-ctr-actions" />
          </tr>
        </thead>
        <tbody>
          {displayList.map((r, rowIdx) => {
            const rowKey = String(r.id);
            const draft = resolveDisplayDraft(r);
            return renderRow(rowKey, rowIdx, draft, { rowEntity: r });
          })}
          {!readOnly &&
            renderRow(NEW_ROW_KEY, displayList.length, newDraft, { isNew: true })}
        </tbody>
      </table>
      </div>
      {!readOnly && list.length === 0 && (
        <div
          className="fimba-muted"
          style={{ padding: "0.5rem 1rem 0.85rem", fontSize: "0.8rem" }}
        >
          Completá la fila vacía y confirmá con la tilde (o Enter) para dar de alta
          la primera contratación.
        </div>
      )}
      {list.length > 0 && displayList.length === 0 && (
        <div
          className="fimba-muted"
          style={{ padding: "0.5rem 1rem 0.85rem", fontSize: "0.8rem" }}
        >
          Ninguna fila coincide con «{nombreQuery.trim()}».
        </div>
      )}
      {!readOnly && list.length > 0 && (
        <div
          className="fimba-muted"
          style={{ padding: "0.35rem 1rem 0.75rem", fontSize: "0.75rem" }}
        >
          Doble clic en una fila para editar · tilde confirma · Esc / X cancela ·
          carpeta = Drive · ⋮ = historial / eliminar
        </div>
      )}
      {historyModal && (
        <EstadoHistorialModal
          contratacionId={historyModal.id}
          label={historyModal.label}
          onClose={() => setHistoryModal(null)}
        />
      )}
      {driveModal && (
        <ContratacionDriveModal
          contratacionId={driveModal.id}
          label={driveModal.label}
          initialCarpeta={driveModal.carpeta_documentacion}
          onClose={() => setDriveModal(null)}
          onSaved={(updated) => {
            if (!updated) return;
            onListChange((list) => {
              const next = (list || []).map((r) =>
                String(r.id) === String(updated.id) ? updated : r,
              );
              listRef.current = next;
              return next;
            });
            setDriveModal((m) =>
              m
                ? {
                    ...m,
                    carpeta_documentacion: updated.carpeta_documentacion || "",
                  }
                : m,
            );
            onPersistedChangeRef.current?.();
          }}
        />
      )}
    </div>
  );
}


function ContratacionDriveModal({
  contratacionId,
  label,
  initialCarpeta = "",
  onClose,
  onSaved,
}) {
  const [draft, setDraft] = useState(() => initialCarpeta || "");
  const [status, setStatus] = useState("idle"); // idle|dirty|saving|saved|error
  const [error, setError] = useState(null);
  const [savedValue, setSavedValue] = useState(() => initialCarpeta || "");
  const savingRef = useRef(false);

  useEffect(() => {
    setDraft(initialCarpeta || "");
    setSavedValue(initialCarpeta || "");
    setStatus("idle");
    setError(null);
  }, [contratacionId, initialCarpeta]);

  const dirty =
    (normalizeCarpetaDocumentacion(draft) || "") !==
    (normalizeCarpetaDocumentacion(savedValue) || "");

  useEffect(() => {
    if (status === "saving" || status === "error") return;
    setStatus(dirty ? "dirty" : status === "saved" ? "saved" : "idle");
  }, [dirty, status]);

  const save = async () => {
    if (savingRef.current) return;
    const next = normalizeCarpetaDocumentacion(draft);
    const prev = normalizeCarpetaDocumentacion(savedValue);
    if ((next || "") === (prev || "")) {
      setStatus("idle");
      return;
    }
    savingRef.current = true;
    setStatus("saving");
    setError(null);
    const { contratacion: updated, error: err } = await updateFimbaContratacion(
      contratacionId,
      { carpeta_documentacion: next },
    );
    savingRef.current = false;
    if (err) {
      setStatus("error");
      setError(err.message || "No se pudo guardar la carpeta");
      return;
    }
    const val = updated?.carpeta_documentacion || "";
    setSavedValue(val);
    setDraft(val || "");
    setStatus("saved");
    onSaved?.(updated);
  };

  const meta = statusMeta(status === "dirty" && dirty ? "dirty" : status);

  return createPortal(
    <div
      className="fimba-modal-backdrop"
      onClick={onClose}
      role="presentation"
      style={{ zIndex: 100 }}
    >
      <div
        className="fimba-modal"
        style={{ maxWidth: 560 }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="fimba-ctr-drive-title"
      >
        <h2
          id="fimba-ctr-drive-title"
          style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 0 }}
        >
          <IconDrive size={18} aria-hidden /> Documentación Drive
        </h2>
        <p className="fimba-muted" style={{ margin: "0 0 1rem", fontSize: "0.88rem" }}>
          {label}
        </p>

        <DocumentacionDrivePreview
          carpetaDocumentacion={draft}
          canUpload
          autoExplore
        >
          {({ exploreButton, driveLink }) => (
            <>
              <div className="fimba-field" style={{ marginBottom: 10 }}>
                <label className="fimba-label" htmlFor="fimba-ctr-drive-url">
                  Carpeta (URL o ID)
                </label>
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    flexWrap: "wrap",
                    alignItems: "center",
                  }}
                >
                  <input
                    id="fimba-ctr-drive-url"
                    className="fimba-input"
                    style={{ flex: 1, minWidth: 200 }}
                    value={draft}
                    onChange={(e) => {
                      setDraft(e.target.value);
                      setStatus("dirty");
                      setError(null);
                    }}
                    onBlur={() => {
                      if (dirty) save();
                    }}
                    placeholder="https://drive.google.com/drive/folders/… o ID"
                    autoComplete="off"
                  />
                  <button
                    type="button"
                    className="fimba-btn fimba-btn-primary"
                    onClick={save}
                    disabled={status === "saving" || !dirty}
                  >
                    {status === "saving" ? "Guardando…" : "Guardar"}
                  </button>
                  <span
                    className={`fimba-sync-legend ${meta.cls}`}
                    title={error || meta.title}
                    aria-label={error || meta.title}
                  >
                    <i className={`fimba-sync-dot ${meta.cls}`} />
                  </span>
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                {exploreButton}
                {driveLink}
              </div>
              <p className="fimba-muted" style={{ margin: "0 0 0.5rem", fontSize: "0.78rem" }}>
                Al abrir este modal se lista la carpeta (no al cargar la planilla). Compartí la
                carpeta con la cuenta del Archivo OFRN (lector; editor para subir con «+»).
                Límite ~4 MB.
              </p>
            </>
          )}
        </DocumentacionDrivePreview>

        {error && (
          <div className="fimba-error" style={{ marginTop: 8 }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
          <button type="button" className="fimba-btn fimba-btn-ghost" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>,
    document.body,
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
                    {formatFimbaEstadoTimestamp(e.created_at)}
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
  .fimba-ctr-card {
    padding: 0;
    overflow: hidden;
  }
  .fimba-ctr-scroll {
    overflow-x: auto;
    overflow-y: visible;
    max-width: 100%;
    -webkit-overflow-scrolling: touch;
  }
  .fimba-ctr-table {
    width: max-content;
    min-width: max(100%, 960px);
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
  .fimba-ctr-exp {
    width: 5.5rem;
    min-width: 5.5rem;
    max-width: 6.25rem;
    padding-left: 0.2rem !important;
    padding-right: 0.2rem !important;
  }
  .fimba-ctr-tipo {
    width: 4.75rem;
    min-width: 4.75rem;
    max-width: 5.5rem;
    padding-left: 0.2rem !important;
    padding-right: 0.2rem !important;
  }
  .fimba-ctr-th-compact,
  .fimba-ctr-th-check {
    white-space: normal !important;
    line-height: 1.15;
  }
  .fimba-ctr-th-compact .fimba-ctr-th-head,
  .fimba-ctr-th-check .fimba-ctr-th-head {
    display: flex;
    width: 100%;
  }
  .fimba-ctr-th-compact .fimba-ctr-th-sort-btn,
  .fimba-ctr-th-check .fimba-ctr-th-sort-btn {
    width: 100%;
    min-width: 0;
  }
  .fimba-ctr-th-compact .fimba-ctr-th-sort-inner,
  .fimba-ctr-th-check .fimba-ctr-th-sort-inner {
    min-width: 0;
    width: 100%;
    align-items: flex-start;
  }
  .fimba-ctr-th-check .fimba-ctr-th-sort-inner {
    justify-content: center;
  }
  .fimba-ctr-th-label {
    min-width: 0;
  }
  .fimba-ctr-th-compact .fimba-ctr-th-label,
  .fimba-ctr-th-check .fimba-ctr-th-label {
    flex: 1 1 auto;
    white-space: normal;
    line-height: 1.15;
  }
  .fimba-ctr-th-check .fimba-ctr-th-label {
    text-align: center;
  }
  .fimba-ctr-artista {
    min-width: 7.5rem;
    max-width: 11rem;
  }
  .fimba-ctr-th-artista {
    min-width: 7.5rem;
    max-width: 11rem;
  }
  .fimba-ctr-nombre {
    min-width: 10rem;
    max-width: 18rem;
  }
  .fimba-ctr-artista-ro {
    display: block;
    font-size: 0.82rem;
    font-weight: 600;
    color: #334155;
    max-width: 11rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .fimba-ctr-nombre-ro-text {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: normal;
    word-break: break-word;
    font-size: 0.82rem;
    line-height: 1.25;
    max-width: 18rem;
  }
  .fimba-ctr-th-monto {
    min-width: 6.5rem;
  }
  .fimba-ctr-monto-ro {
    display: block;
    text-align: right;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
  .fimba-ctr-th-estado,
  .fimba-ctr-estado-cell {
    min-width: 8.5rem;
    max-width: 12rem;
  }
  .fimba-ctr-estado-cell {
    overflow: hidden;
  }
  .fimba-ctr-row-editing td {
    vertical-align: middle;
  }
  .fimba-ctr-artista-select {
    width: 100%;
    min-width: 7rem;
    max-width: 11rem;
    font-size: 0.78rem !important;
  }
  .fimba-ctr-artista-select.fimba-ctr-artista-empty {
    color: #94a3b8;
  }
  .fimba-ctr-artista-select:not(.fimba-ctr-artista-empty) {
    color: #0f172a;
  }
  .fimba-ctr-artista-select option {
    color: #0f172a;
  }
  .fimba-ctr-nombre-textarea {
    width: 100%;
    min-width: 9.5rem;
    max-width: 18rem;
    min-height: 2.4rem;
    max-height: 4.5rem;
    overflow-y: auto;
    resize: vertical;
    line-height: 1.3;
    white-space: pre-wrap;
    font: inherit;
    font-size: 0.82rem !important;
  }
  .fimba-ctr-monto {
    width: 6.75rem;
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
  .fimba-ctr-total-bar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.35rem 0.75rem;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--fimba-border, #e2e8f0);
    background: linear-gradient(90deg, #fce7f3 0%, #fff 55%);
  }
  .fimba-ctr-total-label {
    font-size: 0.78rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--fimba-deep, #94216d);
  }
  .fimba-ctr-total-value {
    font-size: 1.15rem;
    font-weight: 800;
    font-variant-numeric: tabular-nums;
    color: var(--fimba-deep, #94216d);
  }
  .fimba-ctr-total-meta {
    margin-left: auto;
    font-size: 0.78rem;
    color: var(--fimba-muted, #64748b);
  }
  .fimba-ctr-th-sort {
    user-select: none;
    vertical-align: bottom;
  }
  .fimba-ctr-th-head {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    max-width: 100%;
  }
  .fimba-ctr-th-head-extra {
    flex-wrap: wrap;
    width: 100%;
  }
  .fimba-ctr-th-nombre {
    min-width: 10rem;
  }
  .fimba-ctr-th-sort-btn {
    appearance: none;
    background: none;
    border: 0;
    padding: 0;
    margin: 0;
    font: inherit;
    color: inherit;
    cursor: pointer;
    text-align: left;
    line-height: 1.2;
  }
  .fimba-ctr-th-sort-btn:hover .fimba-ctr-th-sort-inner,
  .fimba-ctr-th-sort-active .fimba-ctr-th-sort-btn .fimba-ctr-th-sort-inner {
    color: var(--fimba-deep, #94216d);
  }
  .fimba-ctr-th-sort-active .fimba-ctr-th-sort-btn .fimba-ctr-th-sort-inner {
    font-weight: 700;
  }
  .fimba-ctr-th-sort-inner {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    max-width: 100%;
  }
  .fimba-ctr-sort-ind {
    font-size: 0.58rem;
    line-height: 1;
    opacity: 0.85;
    min-width: 0.65rem;
    flex-shrink: 0;
  }
  .fimba-ctr-nombre-filter {
    flex: 1 1 6.5rem;
    min-width: 5.5rem;
    max-width: 9.5rem;
    height: 1.55rem;
    font-size: 0.7rem !important;
    font-weight: 500 !important;
    padding: 0.12rem 0.4rem !important;
    border-radius: 6px !important;
  }
  .fimba-ctr-th-check,
  .fimba-ctr-td-check {
    width: 2.5rem;
    min-width: 2.5rem;
    max-width: 2.5rem;
    padding-left: 0.08rem !important;
    padding-right: 0.08rem !important;
    text-align: center;
  }
  .fimba-ctr-th-check {
    font-size: 0.62rem !important;
    letter-spacing: 0.01em;
  }
  .fimba-ctr-th-blue { color: #2563eb; }
  .fimba-ctr-th-green { color: #16a34a; }
  .fimba-ctr-th-red { color: #dc2626; }
  .fimba-ctr-th-purple { color: #7c3aed; }
  .fimba-ctr-check-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.5rem;
    height: 1.5rem;
    padding: 0;
    margin: 0;
    border: 0;
    border-radius: 4px;
    background: transparent;
    cursor: pointer;
    line-height: 0;
    color: inherit;
    font-size: 0;
    -webkit-appearance: none;
    appearance: none;
  }
  .fimba-ctr-check-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .fimba-ctr-check-btn:hover:not(:disabled) {
    background: color-mix(in srgb, currentColor 12%, transparent);
  }
  .fimba-ctr-check-btn:focus-visible {
    outline: 2px solid currentColor;
    outline-offset: 1px;
  }
  .fimba-ctr-check-btn svg {
    display: block;
    flex-shrink: 0;
  }
  .fimba-ctr-check-blue { color: #2563eb; }
  .fimba-ctr-check-green { color: #16a34a; }
  .fimba-ctr-check-red { color: #dc2626; }
  .fimba-ctr-check-purple { color: #7c3aed; }
  .fimba-ctr-actions,
  .fimba-ctr-table .fimba-col-actions {
    position: sticky;
    right: 0;
    z-index: 6;
    width: 1%;
    min-width: 4.25rem;
    text-align: right;
    padding-left: 0.35rem !important;
    padding-right: 0.45rem !important;
    white-space: nowrap;
    background: #fff;
    box-shadow: -6px 0 10px -8px rgba(15, 23, 42, 0.28);
  }
  .fimba-ctr-table thead .fimba-ctr-actions,
  .fimba-ctr-table thead .fimba-col-actions {
    z-index: 26;
    background: #fff;
  }
  .fimba-ctr-table tbody tr.fimba-row-dirty > .fimba-ctr-actions {
    background: #fef9eb;
  }
  .fimba-ctr-table tbody tr.fimba-row-saving > .fimba-ctr-actions {
    background: #fef6e8;
  }
  .fimba-ctr-table tbody tr.fimba-row-saved > .fimba-ctr-actions {
    background: #edfaf5;
  }
  .fimba-ctr-table tbody tr.fimba-row-error > .fimba-ctr-actions {
    background: #fef2f2;
  }
  .fimba-ctr-actions-inner {
    display: inline-flex;
    align-items: center;
    justify-content: flex-end;
    gap: 0;
  }
`;
