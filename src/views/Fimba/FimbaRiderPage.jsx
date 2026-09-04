import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import {
  IconArrowLeft,
  IconChevronDown,
  IconChevronRight,
  IconFileText,
  IconLoader,
  IconPrinter,
} from "../../components/ui/Icons";
import { useFimbaAccess } from "../../hooks/useFimbaAccess";
import {
  getFimbaEdicionById,
  listFimbaPropuestas,
  updateFimbaPropuesta,
} from "../../services/fimbaService";
import {
  isFimbaRiderEmpty,
  normalizeFimbaRiderHtml,
} from "../../utils/fimbaRider";
import { printFimbaRiders } from "../../utils/fimbaReports";
import FimbaRichTextEditor from "./FimbaRichTextEditor";

const DEBOUNCE_MS = 500;

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

function riderKey(id) {
  if (id == null || id === "") return "";
  const n = Number(id);
  return Number.isFinite(n) ? String(n) : String(id);
}

/**
 * Pestaña Rider: consolida riders de todos los artistas de la edición.
 * Edición: `canEditPropuestaMeta`. Consulta FIMBA: RO + PDF. Token `/c` y tokens artista: sin tab.
 */
export default function FimbaRiderPage() {
  const { edicionId } = useParams();
  const { canSeeRider, canEditPropuestaMeta } = useFimbaAccess();
  const canEdit = Boolean(canEditPropuestaMeta);

  const [edicion, setEdicion] = useState(null);
  const [propuestas, setPropuestas] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [open, setOpen] = useState({});
  const [status, setStatus] = useState({});
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const draftsRef = useRef(drafts);
  draftsRef.current = drafts;
  const savedRef = useRef({});
  const timersRef = useRef({});
  const savingRef = useRef({});
  const pendingRef = useRef({});

  const edicionLabel = edicion?.nombre || `Edición ${edicionId}`;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const edRes = await getFimbaEdicionById(edicionId);
      if (cancelled) return;
      if (edRes.error || !edRes.edicion) {
        setError(edRes.error?.message || "Edición no encontrada");
        setEdicion(null);
        setLoading(false);
        return;
      }
      const { propuestas: list, error: err } = await listFimbaPropuestas(edicionId);
      if (cancelled) return;
      if (err) {
        setError(err.message || "Error al cargar artistas");
        setEdicion(edRes.edicion);
        setLoading(false);
        return;
      }
      const rows = list || [];
      const nextDrafts = {};
      const nextOpen = {};
      const nextSaved = {};
      for (const p of rows) {
        const k = riderKey(p.id);
        const html = p.rider || "";
        nextDrafts[k] = html;
        nextSaved[k] = normalizeFimbaRiderHtml(html);
        nextOpen[k] = !isFimbaRiderEmpty(html);
      }
      setEdicion(edRes.edicion);
      setPropuestas(rows);
      setDrafts(nextDrafts);
      setOpen(nextOpen);
      savedRef.current = nextSaved;
      setStatus({});
      setErrors({});
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [edicionId]);

  useEffect(
    () => () => {
      Object.values(timersRef.current).forEach((t) => clearTimeout(t));
    },
    [],
  );

  useEffect(() => {
    const ids = Object.keys(status).filter((k) => status[k] === "saved");
    if (!ids.length) return undefined;
    const t = setTimeout(() => {
      setStatus((prev) => {
        const next = { ...prev };
        for (const k of ids) {
          if (next[k] === "saved") next[k] = "idle";
        }
        return next;
      });
    }, 2200);
    return () => clearTimeout(t);
  }, [status]);

  const commitRider = async (key, propuestaId) => {
    if (!canEdit) return;
    if (savingRef.current[key]) {
      pendingRef.current[key] = true;
      return;
    }
    const html = draftsRef.current[key] ?? "";
    const normalized = normalizeFimbaRiderHtml(html);
    if (normalized === (savedRef.current[key] ?? null)) {
      setStatus((s) => ({ ...s, [key]: "idle" }));
      setErrors((e) => ({ ...e, [key]: null }));
      return;
    }

    savingRef.current[key] = true;
    setStatus((s) => ({ ...s, [key]: "saving" }));
    setErrors((e) => ({ ...e, [key]: null }));

    const { propuesta: updated, error: err } = await updateFimbaPropuesta(propuestaId, {
      rider: normalized,
    });
    savingRef.current[key] = false;

    if (err) {
      const msg = err.message || "No se pudo guardar";
      setErrors((e) => ({ ...e, [key]: msg }));
      setStatus((s) => ({ ...s, [key]: "error" }));
      if (pendingRef.current[key]) {
        pendingRef.current[key] = false;
        void commitRider(key, propuestaId);
      }
      return;
    }

    savedRef.current[key] = normalized;
    if (updated) {
      setPropuestas((prev) =>
        prev.map((p) => (riderKey(p.id) === key ? { ...p, rider: updated.rider ?? normalized } : p)),
      );
    }

    const after = normalizeFimbaRiderHtml(draftsRef.current[key]);
    if (after !== savedRef.current[key]) {
      setStatus((s) => ({ ...s, [key]: "dirty" }));
      pendingRef.current[key] = false;
      void commitRider(key, propuestaId);
      return;
    }
    if (pendingRef.current[key]) {
      pendingRef.current[key] = false;
      setStatus((s) => ({ ...s, [key]: "dirty" }));
      void commitRider(key, propuestaId);
      return;
    }
    setStatus((s) => ({ ...s, [key]: "saved" }));
  };

  const scheduleSave = (key, propuestaId) => {
    if (timersRef.current[key]) {
      clearTimeout(timersRef.current[key]);
    }
    timersRef.current[key] = setTimeout(() => {
      delete timersRef.current[key];
      void commitRider(key, propuestaId);
    }, DEBOUNCE_MS);
  };

  const flushSave = (key, propuestaId) => {
    if (timersRef.current[key]) {
      clearTimeout(timersRef.current[key]);
      delete timersRef.current[key];
    }
    void commitRider(key, propuestaId);
  };

  const setRider = (key, propuestaId, html) => {
    setDrafts((prev) => {
      const next = { ...prev, [key]: html };
      draftsRef.current = next;
      return next;
    });
    setStatus((s) => ({ ...s, [key]: s[key] === "saving" ? "saving" : "dirty" }));
    scheduleSave(key, propuestaId);
  };

  const toggleOpen = (key) => {
    setOpen((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const withRiderCount = useMemo(
    () => propuestas.filter((p) => !isFimbaRiderEmpty(drafts[riderKey(p.id)] ?? p.rider)).length,
    [propuestas, drafts],
  );

  const handlePrint = () => {
    const rows = propuestas.map((p) => ({
      ...p,
      rider: drafts[riderKey(p.id)] ?? p.rider,
    }));
    printFimbaRiders(rows, { edicionNombre: edicionLabel });
  };

  if (!canSeeRider) {
    return <Navigate to={`/fimba/edicion/${edicionId}`} replace />;
  }

  if (loading) {
    return (
      <div className="fimba-card fimba-muted" style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <IconLoader size={18} className="animate-spin" /> Cargando riders…
      </div>
    );
  }

  if (!edicion) {
    return (
      <div>
        <div className="fimba-error">{error || "Edición no encontrada."}</div>
        <Link to="/fimba" className="fimba-btn fimba-btn-ghost" style={{ marginTop: 12, textDecoration: "none" }}>
          <IconArrowLeft size={14} /> Volver
        </Link>
      </div>
    );
  }

  return (
    <div>
      <Link
        to={`/fimba/edicion/${edicionId}`}
        className="fimba-btn fimba-btn-ghost"
        style={{ textDecoration: "none", marginBottom: 12 }}
      >
        <IconArrowLeft size={14} /> {edicion.nombre}
      </Link>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "1rem",
          alignItems: "flex-start",
          marginBottom: "1.25rem",
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: "1.5rem",
              color: "var(--fimba-deep)",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <IconFileText size={22} /> Rider
          </h1>
          <p className="fimba-muted" style={{ margin: "0.35rem 0 0" }}>
            Información logística por artista. El PDF incluye quienes tienen texto o imágenes.
            {propuestas.length
              ? ` ${withRiderCount}/${propuestas.length} con contenido.`
              : ""}
          </p>
        </div>
        <button
          type="button"
          className="fimba-btn fimba-btn-primary"
          onClick={handlePrint}
          disabled={!propuestas.length}
          title="Imprimir / guardar como PDF (artistas con texto o imágenes)"
        >
          <IconPrinter size={14} /> Imprimir / PDF
        </button>
      </div>

      {error && (
        <div className="fimba-error" style={{ marginBottom: "1rem" }}>
          {error}
        </div>
      )}

      {!propuestas.length ? (
        <div className="fimba-card fimba-muted">No hay artistas en esta edición.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {propuestas.map((p) => {
            const k = riderKey(p.id);
            const isOpen = Boolean(open[k]);
            const html = drafts[k] ?? p.rider ?? "";
            const empty = isFimbaRiderEmpty(html);
            const st = status[k] || "idle";
            const sync = statusMeta(st);
            const errMsg = errors[k];

            return (
              <section key={k} className="fimba-card" style={{ margin: 0, padding: 0, overflow: "visible" }}>
                <button
                  type="button"
                  onClick={() => toggleOpen(k)}
                  aria-expanded={isOpen}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "0.85rem 1rem",
                    background: "transparent",
                    border: 0,
                    cursor: "pointer",
                    textAlign: "left",
                    font: "inherit",
                    color: "inherit",
                  }}
                >
                  {isOpen ? <IconChevronDown size={16} /> : <IconChevronRight size={16} />}
                  <span
                    className="fimba-swatch"
                    style={{
                      width: 12,
                      height: 12,
                      background: p.color || "var(--fimba-accent)",
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ fontWeight: 700, color: "var(--fimba-deep)", flex: 1 }}>
                    {p.nombre || "Artista"}
                  </span>
                  {empty && (
                    <span className="fimba-muted" style={{ fontSize: "0.75rem", fontWeight: 600 }}>
                      Vacío
                    </span>
                  )}
                  {canEdit && (
                    <span
                      className={`fimba-sync-legend ${sync.cls}`}
                      title={errMsg || sync.title}
                      aria-label={errMsg || sync.title}
                      role="status"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <i className={`fimba-sync-dot ${sync.cls}`} />
                    </span>
                  )}
                </button>
                {isOpen && (
                  <div style={{ padding: "0 1rem 1rem" }}>
                    <FimbaRichTextEditor
                      value={html}
                      readOnly={!canEdit}
                      onChange={(next) => setRider(k, p.id, next)}
                      onBlur={() => flushSave(k, p.id)}
                      placeholder="Escenario, backline, catering, accesos, horarios…"
                      edicionId={edicionId}
                      propuestaId={p.id}
                    />
                    {errMsg && (
                      <div className="fimba-error" style={{ marginTop: 8, marginBottom: 0 }}>
                        {errMsg}
                      </div>
                    )}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
