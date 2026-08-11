import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useParams } from "react-router-dom";
import {
  IconPlus,
  IconEdit,
  IconArrowLeft,
  IconLoader,
  IconTrash,
  IconUsers,
  IconCheck,
  IconAlertTriangle,
  IconPencil,
  IconChevronRight,
  IconChevronDown,
  IconUser,
} from "../../components/ui/Icons";
import { useAuth } from "../../context/AuthContext";
import { useFimbaUserSession } from "../../hooks/useFimbaUserSession";
import { fimbaSessionCanEditEdicion } from "../../utils/fimbaUserSession";
import {
  FIMBA_ARTISTA_COLORS,
  FIMBA_PROPUESTA_ESTADOS,
  FIMBA_TIPOS_ALIMENTACION,
  computeFimbaCapacity,
  countActiveParticipantes,
  createFimbaPropuesta,
  deleteFimbaPropuesta,
  getFimbaEdicionById,
  listFimbaParticipantes,
  listFimbaPropuestas,
  listHotelesCatalog,
  updateFimbaPropuesta,
} from "../../services/fimbaService";

/** Columnas editables en modo planilla (orden de Tab / Enter). Color/estado solo vía modal. */
const EDITABLE_COLS = [
  "nombre",
  "cantidad_planificada",
  "plazas_extra_materiales",
  "checkin_at",
  "checkin_early",
  "checkout_at",
  "checkout_late",
  "id_hotel",
];

function formatFecha(f) {
  if (!f) return "—";
  const s = String(f).slice(0, 10);
  const [y, m, d] = s.split("-");
  if (!d) return s;
  return `${d}/${m}/${y}`;
}

function asBool(v) {
  return v === true || v === "true" || v === 1 || v === "1";
}

function draftFromPropuesta(p) {
  return {
    nombre: p.nombre || "",
    color: p.color || FIMBA_ARTISTA_COLORS[0],
    estado: p.estado || "activa",
    cantidad_planificada: p.cantidad_planificada ?? 1,
    plazas_extra_materiales: p.plazas_extra_materiales ?? 0,
    checkin_at: p.checkin_at ? String(p.checkin_at).slice(0, 10) : "",
    checkin_early: asBool(p.checkin_early),
    checkout_at: p.checkout_at ? String(p.checkout_at).slice(0, 10) : "",
    checkout_late: asBool(p.checkout_late),
    id_hotel: p.id_hotel != null && p.id_hotel !== "" ? String(p.id_hotel) : "",
  };
}

/**
 * Valida un draft de propuesta antes de guardar.
 * @returns {{ ok: true, patch: object } | { ok: false, error: string }}
 */
function validatePropuestaDraft(draft) {
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
    return { ok: false, error: "Extra materiales debe ser ≥ 0" };
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
      id_hotel: draft.id_hotel !== "" && draft.id_hotel != null ? Number(draft.id_hotel) : null,
    },
  };
}

function draftsEqual(a, b) {
  return EDITABLE_COLS.every((k) => {
    if (k === "checkin_early" || k === "checkout_late") {
      return asBool(a?.[k]) === asBool(b?.[k]);
    }
    return String(a?.[k] ?? "") === String(b?.[k] ?? "");
  });
}

/** Stable string key for propuesta ids (avoids number vs string Set/Object mismatches). */
function propuestaKey(id) {
  if (id == null || id === "") return "";
  const n = Number(id);
  return Number.isFinite(n) ? String(n) : String(id);
}

export default function FimbaEdicionPage() {
  const { edicionId } = useParams();
  const { isManagement } = useAuth();
  const fimbaUser = useFimbaUserSession();
  const isOfrnStaff = Boolean(isManagement);
  const canManageUsers =
    isOfrnStaff || fimbaSessionCanEditEdicion(fimbaUser, edicionId);
  const [edicion, setEdicion] = useState(null);
  const [propuestas, setPropuestas] = useState([]);
  const [hoteles, setHoteles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modal, setModal] = useState(null); // null | { mode, propuesta? }
  const [editMode, setEditMode] = useState(false);

  /** Soft reload preserves mounted table (expand state). Full reload shows spinner. */
  const reload = async ({ soft = false } = {}) => {
    if (!soft) setLoading(true);
    setError(null);
    const [{ edicion: ed, error: e1 }, { propuestas: props, error: e2 }, hotelCat] =
      await Promise.all([
        getFimbaEdicionById(edicionId),
        listFimbaPropuestas(edicionId),
        listHotelesCatalog(),
      ]);
    if (e1 || e2 || hotelCat.error) {
      setError((e1 || e2 || hotelCat.error).message || "Error al cargar");
    }
    setEdicion(ed);
    setPropuestas(props || []);
    setHoteles(hotelCat.hoteles || []);
    if (!soft) setLoading(false);
  };

  useEffect(() => {
    reload();
  }, [edicionId]);

  const handleDelete = async (p) => {
    if (!window.confirm(`¿Eliminar artista «${p.nombre}» y sus participantes?`)) return;
    const { error: err } = await deleteFimbaPropuesta(p.id);
    if (err) {
      setError(err.message || "No se pudo eliminar");
      return;
    }
    reload();
  };

  const handlePropuestaPatched = useCallback((updated) => {
    if (!updated?.id) return;
    setPropuestas((prev) =>
      (prev || []).map((p) => (Number(p.id) === Number(updated.id) ? { ...p, ...updated } : p)),
    );
  }, []);

  if (loading) {
    return (
      <div className="fimba-card fimba-muted" style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <IconLoader size={18} className="animate-spin" /> Cargando edición…
      </div>
    );
  }

  if (!edicion) {
    return (
      <div>
        <div className="fimba-error">Edición no encontrada.</div>
        <Link to="/fimba" className="fimba-btn fimba-btn-ghost" style={{ marginTop: 12, textDecoration: "none" }}>
          <IconArrowLeft size={14} /> Volver
        </Link>
      </div>
    );
  }

  const prog = edicion.programas;

  return (
    <div className="fimba-edicion-wide">
      {isOfrnStaff && (
        <Link
          to="/fimba"
          className="fimba-btn fimba-btn-ghost"
          style={{ textDecoration: "none", marginBottom: 12 }}
        >
          <IconArrowLeft size={14} /> Ediciones
        </Link>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "flex-start", marginBottom: "1.25rem" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "1.5rem", color: "var(--fimba-deep)" }}>
            {edicion.nombre}
          </h1>
          <p className="fimba-muted" style={{ margin: "0.35rem 0 0" }}>
            {edicion.anio}
            {" · "}
            OFRN: {prog?.nomenclador || prog?.nombre_gira || `#${edicion.id_gira}`}
            {edicion.id_gira != null && isOfrnStaff && (
              <>
                {" · "}
                <a
                  href={`/?tab=giras&view=AGENDA&giraId=${edicion.id_gira}`}
                  style={{ color: "var(--fimba-cyan)", fontWeight: 600 }}
                >
                  Abrir gira
                </a>
              </>
            )}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
          {canManageUsers && (
            <Link
              to={`/fimba/edicion/${edicionId}/usuarios`}
              className="fimba-btn fimba-btn-ghost"
              style={{ textDecoration: "none" }}
            >
              <IconUser size={16} /> Usuarios
            </Link>
          )}
          <button
            type="button"
            className="fimba-btn fimba-btn-primary"
            onClick={() => setModal({ mode: "create" })}
          >
            <IconPlus size={16} /> Nuevo artista
          </button>
        </div>
      </div>

      {error && <div className="fimba-error" style={{ marginBottom: "1rem" }}>{error}</div>}

      {propuestas.length === 0 ? (
        <div className="fimba-card fimba-muted">
          Todavía no hay artistas (propuestas). Creá el primero para planificar plazas y participantes.
        </div>
      ) : (
        <>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 10,
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 10,
            }}
          >
            <button
              type="button"
              className={`fimba-btn ${editMode ? "fimba-btn-primary" : "fimba-btn-ghost"}`}
              onClick={() => setEditMode((v) => !v)}
              title={editMode ? "Salir del modo planilla" : "Editar celdas como planilla"}
            >
              <IconPencil size={14} />
              {editMode ? "Salir de modo edición" : "Modo edición"}
            </button>
            {editMode && (
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
                {" — "}Enter o blur guarda · Tab navega
              </span>
            )}
          </div>
          <FimbaArtistasTable
            propuestas={propuestas}
            hoteles={hoteles}
            edicionId={edicionId}
            editMode={editMode}
            onDelete={handleDelete}
            onOpenModal={(p) => setModal({ mode: "edit", propuesta: p })}
            onPropuestaPatched={handlePropuestaPatched}
          />
        </>
      )}

      {modal &&
        createPortal(
          <ArtistaFormModal
            mode={modal.mode}
            propuesta={modal.propuesta}
            edicionId={edicionId}
            hoteles={hoteles}
            onClose={() => setModal(null)}
            onSaved={() => {
              setModal(null);
              reload({ soft: true });
            }}
          />,
          document.body,
        )}
    </div>
  );
}

/**
 * Tabla de artistas: vista + modo planilla (inline) con semáforo por fila.
 * Verde = guardado · amarillo = dirty/saving · rojo = error Supabase/validación.
 */
function FimbaArtistasTable({
  propuestas,
  hoteles,
  edicionId,
  editMode,
  onDelete,
  onOpenModal,
  onPropuestaPatched,
}) {
  const [drafts, setDrafts] = useState({});
  const [rowStatus, setRowStatus] = useState({}); // id key -> idle|dirty|saving|saved|error
  const [rowErrors, setRowErrors] = useState({});
  /** Multi-expand: propuestaKey -> true (plain object; Set + side-effects in updater were unreliable). */
  const [expandedIds, setExpandedIds] = useState({});
  /** Lazy cache: propuestaKey -> { status, rows?, error? } */
  const [participantesByPropuesta, setParticipantesByPropuesta] = useState({});
  const savingRef = useRef(new Set());
  const draftsRef = useRef(drafts);
  draftsRef.current = drafts;
  const loadingPartsRef = useRef(new Set());
  const participantesCacheRef = useRef({});

  // Drafts: al entrar en modo edición se hidratan; si llegan filas nuevas se agregan
  // sin pisar filas dirty (cambios locales pendientes).
  useEffect(() => {
    if (!editMode) {
      setDrafts({});
      setRowStatus({});
      setRowErrors({});
      return;
    }
    setDrafts((prev) => {
      const next = {};
      for (const p of propuestas || []) {
        const k = propuestaKey(p.id);
        next[k] = prev[k] ?? prev[p.id] ?? draftFromPropuesta(p);
      }
      return next;
    });
  }, [editMode, propuestas]);

  // Reset «saved» → idle after flash
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

  const hotelLabel = useMemo(() => {
    const map = {};
    for (const h of hoteles || []) map[String(h.id)] = h.nombre;
    return map;
  }, [hoteles]);

  /** Column count for nested/error row colspan (sync + expand + 8 data cols). */
  const colCount = (editMode ? 1 : 0) + 1 + 8;

  const ensureParticipantes = useCallback(async (rawId) => {
    const key = propuestaKey(rawId);
    if (!key) return;
    if (loadingPartsRef.current.has(key)) return;
    if (participantesCacheRef.current[key]?.status === "ready") return;

    loadingPartsRef.current.add(key);
    setParticipantesByPropuesta((prev) => ({
      ...prev,
      [key]: { status: "loading", rows: prev[key]?.rows || [] },
    }));

    try {
      const { participantes, error: err } = await listFimbaParticipantes(rawId);
      const next = err
        ? { status: "error", rows: [], error: err.message || "Error al cargar nómina" }
        : { status: "ready", rows: participantes || [] };
      participantesCacheRef.current[key] = next;
      setParticipantesByPropuesta((prev) => ({ ...prev, [key]: next }));
    } catch (e) {
      const next = {
        status: "error",
        rows: [],
        error: e?.message || "Error al cargar nómina",
      };
      participantesCacheRef.current[key] = next;
      setParticipantesByPropuesta((prev) => ({ ...prev, [key]: next }));
    } finally {
      loadingPartsRef.current.delete(key);
    }
  }, []);

  const toggleExpand = (rawId, ev) => {
    if (ev) {
      ev.preventDefault();
      ev.stopPropagation();
    }
    const key = propuestaKey(rawId);
    if (!key) return;

    setExpandedIds((prev) => {
      if (prev[key]) {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return { ...prev, [key]: true };
    });
  };

  // Lazy-load on expand (effect is reliable even if setState is async-batched).
  useEffect(() => {
    for (const key of Object.keys(expandedIds)) {
      if (expandedIds[key]) ensureParticipantes(key);
    }
  }, [expandedIds, ensureParticipantes]);

  const retryParticipantes = (rawId) => {
    const key = propuestaKey(rawId);
    loadingPartsRef.current.delete(key);
    delete participantesCacheRef.current[key];
    setParticipantesByPropuesta((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    ensureParticipantes(rawId);
  };

  const setField = (id, field, value) => {
    setDrafts((prev) => {
      const base = prev[id] || draftFromPropuesta(propuestas.find((p) => p.id === id) || {});
      const nextDraft = { ...base, [field]: value };
      draftsRef.current = { ...prev, [id]: nextDraft };
      return draftsRef.current;
    });
    setRowStatus((prev) => ({ ...prev, [id]: prev[id] === "saving" ? "saving" : "dirty" }));
    setRowErrors((prev) => {
      if (!prev[id]) return prev;
      const n = { ...prev };
      delete n[id];
      return n;
    });
  };

  /**
   * @param {number|string} propuestaId
   * @param {object} [draftOverride] — útil tras onChange de select (antes del re-render)
   */
  const commitRow = async (propuestaId, draftOverride = null) => {
    if (savingRef.current.has(propuestaId)) return;
    const p = (propuestas || []).find((x) => Number(x.id) === Number(propuestaId));
    if (!p) return;

    const draft =
      draftOverride ||
      draftsRef.current[propuestaId] ||
      draftFromPropuesta(p);
    const baseline = draftFromPropuesta(p);
    if (draftsEqual(draft, baseline)) {
      setRowStatus((prev) => ({
        ...prev,
        [propuestaId]: prev[propuestaId] === "error" ? "error" : "idle",
      }));
      return;
    }

    const validated = validatePropuestaDraft(draft);
    if (!validated.ok) {
      setRowStatus((prev) => ({ ...prev, [propuestaId]: "error" }));
      setRowErrors((prev) => ({ ...prev, [propuestaId]: validated.error }));
      return;
    }

    savingRef.current.add(propuestaId);
    setRowStatus((prev) => ({ ...prev, [propuestaId]: "saving" }));
    setRowErrors((prev) => {
      const n = { ...prev };
      delete n[propuestaId];
      return n;
    });

    const { propuesta: updated, error: err } = await updateFimbaPropuesta(
      propuestaId,
      validated.patch,
    );

    savingRef.current.delete(propuestaId);

    if (err) {
      setRowStatus((prev) => ({ ...prev, [propuestaId]: "error" }));
      setRowErrors((prev) => ({
        ...prev,
        [propuestaId]: err.message || "Error al guardar",
      }));
      return;
    }

    const nextDraft = draftFromPropuesta(updated);
    setDrafts((prev) => {
      const n = { ...prev, [propuestaId]: nextDraft };
      draftsRef.current = n;
      return n;
    });
    setRowStatus((prev) => ({ ...prev, [propuestaId]: "saved" }));
    onPropuestaPatched?.(updated);
  };

  const changeAndCommit = (id, field, value) => {
    const p = (propuestas || []).find((x) => Number(x.id) === Number(id));
    const base = draftsRef.current[id] || draftFromPropuesta(p || {});
    const nextDraft = { ...base, [field]: value };
    setDrafts((prev) => {
      const n = { ...prev, [id]: nextDraft };
      draftsRef.current = n;
      return n;
    });
    setRowStatus((prev) => ({ ...prev, [id]: "dirty" }));
    setRowErrors((prev) => {
      if (!prev[id]) return prev;
      const n = { ...prev };
      delete n[id];
      return n;
    });
    commitRow(id, nextDraft);
  };

  const focusCell = (rowIdx, colIdx) => {
    const el = document.querySelector(
      `[data-fimba-cell="${rowIdx}-${colIdx}"]`,
    );
    if (el && typeof el.focus === "function") el.focus();
  };

  const handleCellKeyDown = (e, rowIdx, colIdx, propuestaId) => {
    if (e.key === "Enter" && e.target.tagName !== "TEXTAREA") {
      e.preventDefault();
      commitRow(propuestaId).then(() => {
        const nextRow = Math.min(rowIdx + 1, (propuestas || []).length - 1);
        focusCell(nextRow, colIdx);
      });
      return;
    }
    if (e.key === "Tab" && !e.shiftKey) {
      // default tab; still commit on leave via blur
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      const p = propuestas[rowIdx];
      if (!p) return;
      setDrafts((prev) => ({ ...prev, [propuestaId]: draftFromPropuesta(p) }));
      setRowStatus((prev) => ({ ...prev, [propuestaId]: "idle" }));
      setRowErrors((prev) => {
        const n = { ...prev };
        delete n[propuestaId];
        return n;
      });
      e.target.blur();
    }
  };

  const statusMeta = (status) => {
    switch (status) {
      case "saving":
        return {
          cls: "fimba-sync-saving",
          title: "Guardando…",
          label: "Guardando",
        };
      case "dirty":
        return {
          cls: "fimba-sync-pending",
          title: "Cambios pendientes",
          label: "Pendiente",
        };
      case "saved":
        return {
          cls: "fimba-sync-saved",
          title: "Guardado",
          label: "Guardado",
        };
      case "error":
        return {
          cls: "fimba-sync-error",
          title: "Error al guardar",
          label: "Error",
        };
      default:
        return {
          cls: "fimba-sync-idle",
          title: "Sincronizado",
          label: "",
        };
    }
  };

  return (
    <div className="fimba-card" style={{ padding: 0, overflow: "auto" }}>
      <table className={`fimba-table fimba-artistas-table${editMode ? " fimba-table-edit" : ""}`}>
        <thead>
          <tr>
            {editMode && <th className="fimba-sync-col" title="Semáforo" />}
            <th className="fimba-expand-col" aria-label="Expandir" />
            <th className="fimba-col-artista">Artista</th>
            <th className="fimba-col-num">Planif.</th>
            <th className="fimba-col-num">Extra mat.</th>
            <th className="fimba-col-num" title="Planificada + extra materiales">Transp.</th>
            <th className="fimba-col-date">Check-in</th>
            <th className="fimba-col-date">Check-out</th>
            <th className="fimba-col-hotel">Hotel</th>
            <th className="fimba-col-actions" />
          </tr>
        </thead>
        <tbody>
          {propuestas.map((p, rowIdx) => {
            const draft = drafts[p.id] || draftFromPropuesta(p);
            const status = rowStatus[p.id] || "idle";
            const meta = statusMeta(status);
            const cap = computeFimbaCapacity(editMode ? draft : p);
            const hotelId = editMode
              ? draft.id_hotel
              : p.id_hotel != null
                ? String(p.id_hotel)
                : "";
            const hotelName =
              p.hoteles?.nombre ||
              hotelLabel[hotelId] ||
              (hotelId ? `#${hotelId}` : "—");
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
            const pk = propuestaKey(p.id);
            const open = !!expandedIds[pk];
            const partCache = participantesByPropuesta[pk];

            return (
              <React.Fragment key={pk || p.id}>
                <tr className={rowCls}>
                  {editMode && (
                    <td className={`fimba-sync-col ${meta.cls}`} title={rowErrors[p.id] || meta.title}>
                      <span className={`fimba-sync-dot ${meta.cls}`} aria-hidden />
                      {status === "saving" && (
                        <IconLoader size={10} className="animate-spin fimba-sync-icon" />
                      )}
                      {status === "saved" && (
                        <IconCheck size={10} className="fimba-sync-icon" />
                      )}
                      {status === "error" && (
                        <IconAlertTriangle size={10} className="fimba-sync-icon" />
                      )}
                    </td>
                  )}
                  <td className="fimba-expand-col">
                    <button
                      type="button"
                      className="fimba-btn fimba-btn-ghost fimba-expand-btn"
                      onClick={(e) => toggleExpand(p.id, e)}
                      aria-expanded={open}
                      aria-label={open ? `Colapsar ${p.nombre}` : `Expandir nómina de ${p.nombre}`}
                      title={open ? "Ocultar nómina" : "Ver nómina"}
                    >
                      {open ? <IconChevronDown size={16} /> : <IconChevronRight size={16} />}
                    </button>
                  </td>
                  <td className="fimba-col-artista">
                    <div className="fimba-artista-cell">
                      <span
                        className="fimba-swatch"
                        style={{
                          background: (editMode ? draft.color : p.color) || "var(--fimba-accent)",
                        }}
                        title={editMode ? draft.color : p.color}
                      />
                      {editMode ? (
                        <input
                          data-fimba-cell={`${rowIdx}-0`}
                          className="fimba-cell-input"
                          value={draft.nombre}
                          onChange={(e) => setField(p.id, "nombre", e.target.value)}
                          onBlur={() => commitRow(p.id)}
                          onKeyDown={(e) => handleCellKeyDown(e, rowIdx, 0, p.id)}
                          disabled={status === "saving"}
                        />
                      ) : (
                        <button
                          type="button"
                          className="fimba-artista-name-btn"
                          onClick={(e) => toggleExpand(p.id, e)}
                        >
                          {p.nombre}
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="fimba-col-num">
                    {editMode ? (
                      <input
                        data-fimba-cell={`${rowIdx}-1`}
                        className="fimba-cell-input fimba-cell-num"
                        type="number"
                        min={1}
                        max={200}
                        value={draft.cantidad_planificada}
                        onChange={(e) => setField(p.id, "cantidad_planificada", e.target.value)}
                        onBlur={() => commitRow(p.id)}
                        onKeyDown={(e) => handleCellKeyDown(e, rowIdx, 1, p.id)}
                        disabled={status === "saving"}
                      />
                    ) : (
                      cap.tope_personas
                    )}
                  </td>
                  <td className="fimba-col-num">
                    {editMode ? (
                      <input
                        data-fimba-cell={`${rowIdx}-2`}
                        className="fimba-cell-input fimba-cell-num"
                        type="number"
                        min={0}
                        value={draft.plazas_extra_materiales}
                        onChange={(e) =>
                          setField(p.id, "plazas_extra_materiales", e.target.value)
                        }
                        onBlur={() => commitRow(p.id)}
                        onKeyDown={(e) => handleCellKeyDown(e, rowIdx, 2, p.id)}
                        disabled={status === "saving"}
                      />
                    ) : (
                      p.plazas_extra_materiales ?? 0
                    )}
                  </td>
                  <td className="fimba-col-num fimba-muted" title="Planificada + extra materiales (solo lectura)">
                    {cap.para_transporte}
                  </td>
                  <td className="fimba-col-date">
                    {editMode ? (
                      <div className="fimba-date-flag-cell">
                        <input
                          data-fimba-cell={`${rowIdx}-3`}
                          className="fimba-cell-input"
                          type="date"
                          value={draft.checkin_at || ""}
                          onChange={(e) => setField(p.id, "checkin_at", e.target.value)}
                          onBlur={() => commitRow(p.id)}
                          onKeyDown={(e) => handleCellKeyDown(e, rowIdx, 3, p.id)}
                          disabled={status === "saving"}
                        />
                        <label className="fimba-flag-check">
                          <input
                            type="checkbox"
                            checked={asBool(draft.checkin_early)}
                            onChange={(e) =>
                              changeAndCommit(p.id, "checkin_early", e.target.checked)
                            }
                            disabled={status === "saving"}
                          />
                          Early
                        </label>
                      </div>
                    ) : (
                      <span className="fimba-date-flag-read">
                        {formatFecha(p.checkin_at)}
                        {asBool(p.checkin_early) && (
                          <span className="fimba-badge fimba-badge-early">Early</span>
                        )}
                      </span>
                    )}
                  </td>
                  <td className="fimba-col-date">
                    {editMode ? (
                      <div className="fimba-date-flag-cell">
                        <input
                          data-fimba-cell={`${rowIdx}-4`}
                          className="fimba-cell-input"
                          type="date"
                          value={draft.checkout_at || ""}
                          onChange={(e) => setField(p.id, "checkout_at", e.target.value)}
                          onBlur={() => commitRow(p.id)}
                          onKeyDown={(e) => handleCellKeyDown(e, rowIdx, 4, p.id)}
                          disabled={status === "saving"}
                        />
                        <label className="fimba-flag-check">
                          <input
                            type="checkbox"
                            checked={asBool(draft.checkout_late)}
                            onChange={(e) =>
                              changeAndCommit(p.id, "checkout_late", e.target.checked)
                            }
                            disabled={status === "saving"}
                          />
                          Late
                        </label>
                      </div>
                    ) : (
                      <span className="fimba-date-flag-read">
                        {formatFecha(p.checkout_at)}
                        {asBool(p.checkout_late) && (
                          <span className="fimba-badge fimba-badge-late">Late</span>
                        )}
                      </span>
                    )}
                  </td>
                  <td className="fimba-col-hotel">
                    {editMode ? (
                      <select
                        data-fimba-cell={`${rowIdx}-5`}
                        className="fimba-cell-input"
                        value={draft.id_hotel}
                        onChange={(e) => changeAndCommit(p.id, "id_hotel", e.target.value)}
                        onKeyDown={(e) => handleCellKeyDown(e, rowIdx, 5, p.id)}
                        disabled={status === "saving"}
                      >
                        <option value="">— Sin hotel —</option>
                        {(hoteles || []).map((h) => (
                          <option key={h.id} value={h.id}>
                            {h.nombre}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="fimba-muted" style={{ fontSize: "0.85rem" }}>
                        {hotelName}
                      </span>
                    )}
                  </td>
                  <td className="fimba-col-actions">
                    <Link
                      to={`/fimba/edicion/${edicionId}/artista/${p.id}`}
                      className="fimba-btn fimba-btn-ghost"
                      style={{ textDecoration: "none", marginRight: 4 }}
                      title="Participantes y tokens"
                    >
                      <IconUsers size={14} />
                    </Link>
                    {!editMode && (
                      <button
                        type="button"
                        className="fimba-btn fimba-btn-ghost"
                        onClick={() => onOpenModal(p)}
                        title="Editar (formulario)"
                      >
                        <IconEdit size={14} />
                      </button>
                    )}
                    <button
                      type="button"
                      className="fimba-btn fimba-btn-danger"
                      style={{ marginLeft: 4 }}
                      onClick={() => onDelete(p)}
                      title="Eliminar"
                      disabled={status === "saving"}
                    >
                      <IconTrash size={14} />
                    </button>
                  </td>
                </tr>
                {editMode && rowErrors[p.id] && (
                  <tr className="fimba-row-error-msg">
                    <td colSpan={colCount} className="fimba-cell-error-msg">
                      {rowErrors[p.id]}
                    </td>
                  </tr>
                )}
                {open && (
                  <tr className="fimba-nomina-row">
                    <td colSpan={colCount} className="fimba-nomina-cell">
                      <ArtistaNominaPanel
                        edicionId={edicionId}
                        propuesta={p}
                        cap={cap}
                        cache={partCache}
                        onRetry={() => retryParticipantes(p.id)}
                      />
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function labelAlimentacion(value) {
  return (
    FIMBA_TIPOS_ALIMENTACION.find((t) => t.value === value)?.label || value || "—"
  );
}

/**
 * Nested participantes table for an artist row (read-only; lazy via parent cache).
 * Works in view and planilla edit mode.
 */
function ArtistaNominaPanel({ edicionId, propuesta, cap, cache, onRetry }) {
  const status = cache?.status || "loading";
  const rows = cache?.rows || [];
  const nominados = countActiveParticipantes(rows);
  const planif = cap.tope_personas;
  const artistaHref = `/fimba/edicion/${edicionId}/artista/${propuesta.id}`;
  const inactivos =
    status === "ready" ? Math.max(0, rows.length - nominados) : 0;

  return (
    <div className="fimba-nomina-panel">
      <div className="fimba-nomina-subheader">
        <span>
          Nómina:{" "}
          <strong>
            {status === "ready" ? nominados : "…"}
          </strong>
          {" / "}
          <strong>{planif}</strong>
          {" planificada"}
          {inactivos > 0 ? (
            <span className="fimba-muted">
              {" "}
              ({inactivos} inactivo{inactivos === 1 ? "" : "s"})
            </span>
          ) : null}
        </span>
        <Link to={artistaHref} className="fimba-nomina-link">
          Abrir artista
        </Link>
      </div>

      {status === "loading" || !cache ? (
        <div className="fimba-muted" style={{ display: "flex", gap: 8, alignItems: "center", fontSize: "0.85rem" }}>
          <IconLoader size={14} className="animate-spin" /> Cargando participantes…
        </div>
      ) : status === "error" ? (
        <div className="fimba-error" style={{ margin: 0 }}>
          {cache.error || "No se pudo cargar la nómina."}{" "}
          <button type="button" className="fimba-btn fimba-btn-ghost" onClick={onRetry} style={{ marginLeft: 4 }}>
            Reintentar
          </button>
        </div>
      ) : rows.length === 0 ? (
        <div className="fimba-muted" style={{ fontSize: "0.875rem" }}>
          Sin nómina cargada.{" "}
          <Link to={artistaHref} className="fimba-nomina-link">
            Cargar participantes
          </Link>
        </div>
      ) : (
        <table className="fimba-table fimba-nomina-table">
          <thead>
            <tr>
              <th style={{ paddingLeft: "0.75rem" }}>Apellido</th>
              <th>Nombre</th>
              <th>Documento</th>
              <th>Alimentación</th>
              <th>Activo</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((part) => (
              <tr key={part.id} style={{ opacity: part.activo === false ? 0.5 : 1 }}>
                <td style={{ paddingLeft: "0.75rem", fontWeight: 600 }}>{part.apellido}</td>
                <td>{part.nombre}</td>
                <td className="fimba-muted">{part.documento || "—"}</td>
                <td>{labelAlimentacion(part.tipo_alimentacion)}</td>
                <td>{part.activo === false ? "No" : "Sí"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function ArtistaFormModal({ mode, propuesta, edicionId, hoteles = [], onClose, onSaved }) {
  const isEdit = mode === "edit";
  const [nombre, setNombre] = useState(propuesta?.nombre || "");
  const [color, setColor] = useState(propuesta?.color || FIMBA_ARTISTA_COLORS[0]);
  const [cantidad, setCantidad] = useState(propuesta?.cantidad_planificada ?? 10);
  const [extra, setExtra] = useState(propuesta?.plazas_extra_materiales ?? 0);
  const [checkin, setCheckin] = useState(
    propuesta?.checkin_at ? String(propuesta.checkin_at).slice(0, 10) : "",
  );
  const [checkout, setCheckout] = useState(
    propuesta?.checkout_at ? String(propuesta.checkout_at).slice(0, 10) : "",
  );
  const [checkinEarly, setCheckinEarly] = useState(asBool(propuesta?.checkin_early));
  const [checkoutLate, setCheckoutLate] = useState(asBool(propuesta?.checkout_late));
  const [idHotel, setIdHotel] = useState(
    propuesta?.id_hotel != null ? String(propuesta.id_hotel) : "",
  );
  const [estado, setEstado] = useState(propuesta?.estado || "activa");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const cap = computeFimbaCapacity({
    cantidad_planificada: cantidad,
    plazas_extra_materiales: extra,
  });

  const submit = async (ev) => {
    ev.preventDefault();
    setSaving(true);
    setError(null);

    const validated = validatePropuestaDraft({
      nombre,
      color,
      estado,
      cantidad_planificada: cantidad,
      plazas_extra_materiales: extra,
      checkin_at: checkin,
      checkout_at: checkout,
      checkin_early: checkinEarly,
      checkout_late: checkoutLate,
      id_hotel: idHotel,
    });
    if (!validated.ok) {
      setSaving(false);
      setError(validated.error);
      return;
    }

    let err;
    if (isEdit) {
      ({ error: err } = await updateFimbaPropuesta(propuesta.id, validated.patch));
    } else {
      ({ error: err } = await createFimbaPropuesta({
        id_edicion: edicionId,
        ...validated.patch,
      }));
    }
    setSaving(false);
    if (err) {
      setError(err.message || "No se pudo guardar");
      return;
    }
    onSaved?.();
  };

  return (
    <div className="fimba-modal-backdrop" onClick={onClose} role="presentation">
      <div className="fimba-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <h2>{isEdit ? "Editar artista" : "Nuevo artista"}</h2>
        <form onSubmit={submit}>
          <div className="fimba-field">
            <label className="fimba-label">Nombre</label>
            <input className="fimba-input" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
          </div>
          <div className="fimba-field">
            <label className="fimba-label">Color</label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {FIMBA_ARTISTA_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  title={c}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 999,
                    background: c,
                    border: color === c ? "3px solid #222" : "2px solid transparent",
                    cursor: "pointer",
                  }}
                />
              ))}
            </div>
          </div>
          <div className="fimba-grid-2">
            <div className="fimba-field">
              <label className="fimba-label">Cantidad planificada (1–200)</label>
              <input
                className="fimba-input"
                type="number"
                min={1}
                max={200}
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value)}
                required
              />
            </div>
            <div className="fimba-field">
              <label className="fimba-label">Plazas extra materiales</label>
              <input
                className="fimba-input"
                type="number"
                min={0}
                value={extra}
                onChange={(e) => setExtra(e.target.value)}
              />
            </div>
          </div>
          <p className="fimba-muted" style={{ margin: "-0.25rem 0 0.85rem", fontSize: "0.8rem" }}>
            Hotel/comida: {cap.para_hotel_comida} · Transporte: {cap.para_transporte}
            {" "}(extra solo transporte)
          </p>
          <div className="fimba-grid-2">
            <div className="fimba-field">
              <label className="fimba-label">Check-in (opc.)</label>
              <input className="fimba-input" type="date" value={checkin || ""} onChange={(e) => setCheckin(e.target.value)} />
              <label className="fimba-flag-check" style={{ marginTop: 6 }}>
                <input
                  type="checkbox"
                  checked={checkinEarly}
                  onChange={(e) => setCheckinEarly(e.target.checked)}
                />
                Early check-in
              </label>
            </div>
            <div className="fimba-field">
              <label className="fimba-label">Check-out (opc.)</label>
              <input className="fimba-input" type="date" value={checkout || ""} onChange={(e) => setCheckout(e.target.value)} />
              <label className="fimba-flag-check" style={{ marginTop: 6 }}>
                <input
                  type="checkbox"
                  checked={checkoutLate}
                  onChange={(e) => setCheckoutLate(e.target.checked)}
                />
                Late check-out
              </label>
            </div>
          </div>
          <div className="fimba-field">
            <label className="fimba-label">Hotel (opc.)</label>
            <select className="fimba-select" value={idHotel} onChange={(e) => setIdHotel(e.target.value)}>
              <option value="">— Sin hotel —</option>
              {(hoteles || []).map((h) => (
                <option key={h.id} value={h.id}>{h.nombre}</option>
              ))}
            </select>
          </div>
          <div className="fimba-field">
            <label className="fimba-label">Estado</label>
            <select className="fimba-select" value={estado} onChange={(e) => setEstado(e.target.value)}>
              {FIMBA_PROPUESTA_ESTADOS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
          {error && <div className="fimba-error" style={{ marginBottom: 12 }}>{error}</div>}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button type="button" className="fimba-btn fimba-btn-ghost" onClick={onClose}>Cancelar</button>
            <button type="submit" className="fimba-btn fimba-btn-primary" disabled={saving}>
              {saving ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
