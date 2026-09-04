import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  IconArrowLeft,
  IconDrive,
  IconExternalLink,
  IconEye,
  IconLayout,
  IconLink,
  IconLinkOff,
  IconLoader,
  IconMoreVertical,
  IconPencil,
  IconPlus,
  IconTrash,
  IconX,
} from "../../components/ui/Icons";
import DateInput from "../../components/ui/DateInput";
import SearchableSelect from "../../components/ui/SearchableSelect";
import GiraGrupoChips from "../../components/giras/GiraGrupoChips";
import {
  FIMBA_BACKLINE_ESTADOS,
  buildDriveFilePreviewUrl,
  fetchFimbaDriveFileName,
  formatFimbaMonto,
  getFimbaEdicionById,
  guessDriveLinkLabel,
  isFimbaBacklineEnsayoRow,
  listFimbaBacklineConcerts,
  listFimbaBacklineEnsayosDisponibles,
  parseFimbaMonto,
  resolveFimbaBacklineEstado,
  resolvePlantaEscenarioLabel,
  setEventosBacklineIncluido,
  updateEventoBackline,
} from "../../services/fimbaService";
import {
  createStagePlotForEvent,
  ensureStagePlotForEvent,
  linkEventToStagePlot,
  listStagePlotsByPrograma,
  unlinkEventFromStagePlot,
} from "../../services/stagePlotService";
import { supabase } from "../../services/supabase";
import { useFimbaAccess } from "../../hooks/useFimbaAccess";
import { useConfirmDialog } from "../../hooks/useConfirmDialog";
import {
  extractEventArtistas,
  extractEventGrupos,
  formatVenueEventDate,
} from "../../utils/venueDisplayUtils";
import { buildStandaloneEscenarioTo } from "../../utils/appNavigation";
import StagePlotViewerModal from "../Giras/StagePlotViewerModal";
import {
  FimbaEventDetallePreview,
} from "./FimbaEventDetalleField";
import FimbaRichTextEditor from "./FimbaRichTextEditor";
import {
  isFimbaRiderEmpty,
  sanitizeFimbaRiderHtml,
} from "../../utils/fimbaRider";

function sameIdSet(a, b) {
  const na = Number(a);
  const nb = Number(b);
  return Number.isFinite(na) && Number.isFinite(nb) && na === nb;
}

function BacklineDescripcionPreview({ html, empty = "—", mutedEmpty = true }) {
  if (isFimbaRiderEmpty(html)) {
    return (
      <span
        className={mutedEmpty ? "fimba-muted" : undefined}
        style={{ fontSize: "0.78rem", fontStyle: mutedEmpty ? "italic" : undefined }}
      >
        {empty}
      </span>
    );
  }
  return (
    <div
      className="fimba-rider-html fimba-backline-desc-html"
      style={{ fontSize: "0.78rem", lineHeight: 1.4 }}
      dangerouslySetInnerHTML={{ __html: sanitizeFimbaRiderHtml(html) }}
    />
  );
}

function FimbaArtistaChips({ artistas }) {
  if (!artistas?.length) {
    return <span className="fimba-muted" style={{ fontSize: "0.72rem" }}>—</span>;
  }
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem" }}>
      {artistas.map((a) => (
        <span
          key={a.id}
          className="fimba-badge fimba-badge-fimba"
          style={
            a.color
              ? {
                  backgroundColor: `${a.color}22`,
                  borderColor: `${a.color}55`,
                  color: "#222",
                }
              : undefined
          }
        >
          {a.nombre}
        </span>
      ))}
    </div>
  );
}

function eventStagePlotId(evt) {
  const rows = evt?.stage_plot_eventos;
  if (!Array.isArray(rows) || rows.length === 0) return null;
  return rows[0]?.id_stage_plot || null;
}

/** Nombre del stage_plot vinculado (si el select anidó `stage_plots`). */
function eventStagePlotNombre(evt) {
  const rows = evt?.stage_plot_eventos;
  if (!Array.isArray(rows) || rows.length === 0) return null;
  const plot = rows[0]?.stage_plots;
  const raw = Array.isArray(plot) ? plot[0]?.nombre : plot?.nombre;
  const n = String(raw || "").trim();
  return n || null;
}

function stagePlotLinkRow(plotId, plotNombre = null) {
  const nombre = String(plotNombre || "").trim() || null;
  return {
    id_stage_plot: plotId,
    stage_plots: plotId ? { id: plotId, nombre } : null,
  };
}

/**
 * Descripción backline: preview colapsado + Quill al click (listas, links, etc.).
 * No monta Quill en cada fila; toolbar solo mientras se edita.
 */
function BacklineDescripcionCell({ eventoId, value, readOnly, onSaved }) {
  const [draft, setDraft] = useState(() => value || "");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const lastSavedRef = useRef(String(value || ""));
  const timerRef = useRef(null);
  const draftRef = useRef(draft);
  const cellRef = useRef(null);
  draftRef.current = draft;

  useEffect(() => {
    const next = value || "";
    setDraft(next);
    lastSavedRef.current = String(next);
  }, [eventoId, value]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const persist = useCallback(
    async (htmlOverride) => {
      const next =
        htmlOverride != null ? String(htmlOverride) : String(draftRef.current || "");
      const normalized = isFimbaRiderEmpty(next) ? "" : next;
      if (
        normalized === lastSavedRef.current ||
        (isFimbaRiderEmpty(normalized) && isFimbaRiderEmpty(lastSavedRef.current))
      ) {
        return;
      }
      setSaving(true);
      const { evento, error } = await updateEventoBackline(eventoId, {
        backline_descripcion: normalized || null,
      });
      setSaving(false);
      if (error) {
        toast.error(error.message || "No se pudo guardar");
        return;
      }
      const saved = evento?.backline_descripcion || "";
      lastSavedRef.current = saved;
      setDraft(saved);
      onSaved?.(eventoId, { backline_descripcion: evento?.backline_descripcion ?? null });
    },
    [eventoId, onSaved],
  );

  const closeEditing = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    void persist();
    setEditing(false);
  }, [persist]);

  // Cerrar al click fuera (toolbar Quill no dispara blur confiable).
  useEffect(() => {
    if (!editing) return undefined;
    const onPointerDown = (e) => {
      if (cellRef.current?.contains(e.target)) return;
      closeEditing();
    };
    const onKeyDown = (e) => {
      if (e.key === "Escape") closeEditing();
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [editing, closeEditing]);

  // Focus editor al montar Quill.
  useEffect(() => {
    if (!editing) return undefined;
    const t = window.setTimeout(() => {
      const el = cellRef.current?.querySelector?.(".ql-editor");
      if (el && typeof el.focus === "function") el.focus();
    }, 40);
    return () => window.clearTimeout(t);
  }, [editing]);

  if (readOnly) {
    return (
      <div className="fimba-backline-desc-inner">
        <BacklineDescripcionPreview html={value} />
      </div>
    );
  }

  if (!editing) {
    return (
      <div
        role="button"
        tabIndex={0}
        className="fimba-cell-input fimba-backline-desc-inner"
        onClick={() => setEditing(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setEditing(true);
          }
        }}
        title="Clic para editar descripción"
        aria-label="Editar descripción backline"
        style={{
          display: "block",
          minHeight: 40,
          textAlign: "left",
          cursor: "text",
          height: "auto",
          padding: "0.4rem 0.5rem",
        }}
      >
        <BacklineDescripcionPreview
          html={draft}
          empty="Descripción backline…"
          mutedEmpty
        />
      </div>
    );
  }

  return (
    <div
      ref={cellRef}
      className="fimba-backline-desc-inner fimba-backline-desc-editing"
      style={{
        position: "relative",
        boxSizing: "border-box",
      }}
    >
      <FimbaRichTextEditor
        value={draft}
        placeholder="Descripción backline…"
        helperText={null}
        toolbar="compact"
        onChange={(html) => {
          setDraft(html);
          draftRef.current = html;
          if (timerRef.current) clearTimeout(timerRef.current);
          timerRef.current = setTimeout(() => {
            void persist(html);
          }, 700);
        }}
      />
      {saving && (
        <span className="fimba-muted" style={{ fontSize: "0.65rem" }}>
          Guardando…
        </span>
      )}
    </div>
  );
}

function BacklineMontoCell({ eventoId, value, readOnly, onSaved }) {
  const [draft, setDraft] = useState(() =>
    value != null && value !== "" ? String(value) : "",
  );
  const [focused, setFocused] = useState(false);
  const [saving, setSaving] = useState(false);
  const lastSavedRef = useRef(parseFimbaMonto(value));

  useEffect(() => {
    setDraft(value != null && value !== "" ? String(value) : "");
    lastSavedRef.current = parseFimbaMonto(value);
  }, [eventoId, value]);

  const persist = useCallback(async () => {
    const next = parseFimbaMonto(draft);
    if (next === lastSavedRef.current) return;
    setSaving(true);
    const { evento, error } = await updateEventoBackline(eventoId, {
      backline_monto: next,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message || "No se pudo guardar el monto");
      return;
    }
    lastSavedRef.current = parseFimbaMonto(evento?.backline_monto);
    setDraft(
      evento?.backline_monto != null && evento.backline_monto !== ""
        ? String(evento.backline_monto)
        : "",
    );
    onSaved?.(eventoId, { backline_monto: evento?.backline_monto ?? null });
  }, [draft, eventoId, onSaved]);

  if (readOnly) {
    const formatted = formatFimbaMonto(value);
    return formatted ? (
      <span style={{ fontSize: "0.82rem", fontVariantNumeric: "tabular-nums" }}>
        {formatted}
      </span>
    ) : (
      <span className="fimba-muted" style={{ fontSize: "0.72rem" }}>
        —
      </span>
    );
  }

  return (
    <div style={{ minWidth: "7rem", maxWidth: "9rem" }}>
      <input
        type="text"
        inputMode="decimal"
        className="fimba-cell-input"
        value={
          focused
            ? draft
            : formatFimbaMonto(draft) || draft || ""
        }
        onFocus={() => setFocused(true)}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          setFocused(false);
          void persist();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.currentTarget.blur();
          }
        }}
        placeholder="$ 0,00"
        style={{ textAlign: "left", fontVariantNumeric: "tabular-nums" }}
      />
      {saving && (
        <span className="fimba-muted" style={{ fontSize: "0.65rem" }}>
          Guardando…
        </span>
      )}
    </div>
  );
}

function BacklineEstadoSwatch({
  opt,
  size = "1.15rem",
  empty = false,
  selected = false,
}) {
  if (empty || !opt) {
    return (
      <span
        aria-hidden
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: size,
          height: size,
          borderRadius: "999px",
          border: "2px dashed var(--fimba-border, #cbd5e1)",
          background: "transparent",
          color: "var(--fimba-muted, #94a3b8)",
          fontSize: "0.7rem",
          lineHeight: 1,
          fontWeight: 600,
          boxShadow: selected ? "0 0 0 2px var(--fimba-border, #94a3b8)" : "none",
          flexShrink: 0,
        }}
      >
        —
      </span>
    );
  }
  return (
    <span
      aria-hidden
      style={{
        display: "inline-block",
        width: size,
        height: size,
        borderRadius: "999px",
        background: opt.bg,
        border: selected ? `2.5px solid ${opt.fg}` : `2px solid ${opt.border}`,
        boxShadow: selected ? `0 0 0 2px ${opt.border}` : "none",
        flexShrink: 0,
      }}
    />
  );
}

/**
 * Un solo círculo = estado actual; click abre menú (portal) con colores + limpiar.
 * Portal z-110 para no quedar clipado por `.fimba-planilla-scroll`.
 */
function BacklineEstadoCell({ eventoId, value, readOnly, onSaved }) {
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const current = resolveFimbaBacklineEstado(value);

  const placeMenu = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const menuW = 168;
    const menuH = 220;
    let top = r.bottom + 6;
    if (top + menuH > window.innerHeight - 8) {
      top = Math.max(8, r.top - menuH - 6);
    }
    let left = r.left;
    if (left + menuW > window.innerWidth - 8) {
      left = Math.max(8, window.innerWidth - menuW - 8);
    }
    setPos({ top, left });
  }, []);

  const persist = useCallback(
    async (nextRaw) => {
      const next = nextRaw || null;
      const prev = current?.value || null;
      if (next === prev) {
        setOpen(false);
        return;
      }
      setSaving(true);
      const { evento, error } = await updateEventoBackline(eventoId, {
        backline_estado: next,
      });
      setSaving(false);
      setOpen(false);
      if (error) {
        toast.error(error.message || "No se pudo guardar el estado");
        return;
      }
      onSaved?.(eventoId, {
        backline_estado: evento?.backline_estado ?? null,
      });
    },
    [current?.value, eventoId, onSaved],
  );

  useEffect(() => {
    if (!open) return undefined;
    placeMenu();
    const onPointerDown = (e) => {
      if (triggerRef.current?.contains(e.target)) return;
      if (menuRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const onKeyDown = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onReposition = () => placeMenu();
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [open, placeMenu]);

  if (readOnly) {
    if (!current) {
      return (
        <span className="fimba-muted" style={{ fontSize: "0.72rem" }}>
          —
        </span>
      );
    }
    return (
      <span title={current.label}>
        <BacklineEstadoSwatch opt={current} size="1.1rem" />
      </span>
    );
  }

  const label = current?.label || "Sin estado";

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="fimba-btn fimba-btn-ghost"
        style={{
          padding: "0.2rem",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: saving ? "wait" : "pointer",
          opacity: saving ? 0.7 : 1,
        }}
        onClick={() => {
          if (saving) return;
          if (!open) placeMenu();
          setOpen((v) => !v);
        }}
        disabled={saving}
        title={`Estado: ${label}`}
        aria-label={`Estado Backline: ${label}. Abrir opciones`}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <BacklineEstadoSwatch opt={current} empty={!current} />
      </button>
      {open &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            aria-label="Elegir estado Backline"
            style={{
              position: "fixed",
              top: pos.top,
              left: pos.left,
              zIndex: 110,
              minWidth: "10rem",
              padding: "0.35rem",
              borderRadius: 10,
              border: "1px solid var(--fimba-border, #e2e8f0)",
              background: "var(--fimba-surface, #fff)",
              boxShadow: "0 10px 28px rgba(15, 23, 42, 0.14)",
              display: "flex",
              flexDirection: "column",
              gap: "0.15rem",
            }}
          >
            <button
              type="button"
              role="menuitemradio"
              aria-checked={!current}
              className="fimba-btn fimba-btn-ghost"
              disabled={saving}
              onClick={() => void persist(null)}
              style={{
                justifyContent: "flex-start",
                gap: "0.5rem",
                padding: "0.4rem 0.55rem",
                fontSize: "0.78rem",
                fontWeight: !current ? 700 : 500,
                background: !current ? "rgba(148, 163, 184, 0.12)" : undefined,
              }}
            >
              <BacklineEstadoSwatch empty selected={!current} />
              Sin estado
            </button>
            {FIMBA_BACKLINE_ESTADOS.map((opt) => {
              const selected = current?.value === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="menuitemradio"
                  aria-checked={selected}
                  className="fimba-btn fimba-btn-ghost"
                  disabled={saving}
                  onClick={() => void persist(opt.value)}
                  style={{
                    justifyContent: "flex-start",
                    gap: "0.5rem",
                    padding: "0.4rem 0.55rem",
                    fontSize: "0.78rem",
                    fontWeight: selected ? 700 : 500,
                    background: selected ? `${opt.bg}33` : undefined,
                  }}
                >
                  <BacklineEstadoSwatch opt={opt} selected={selected} />
                  {opt.label}
                </button>
              );
            })}
          </div>,
          document.body,
        )}
    </>
  );
}

/**
 * Celda Planta de Escenario: chip Drive (nombre en DB) + preview modal + menú ⋮
 * (acciones Drive y RiderMaker).
 */
function BacklinePlantaCell({
  evento,
  edicionId,
  readOnly,
  showStagePlotEditorLink,
  creating,
  onSaved,
  onViewStagePlot,
  onChooseStagePlot,
  onEnsureStagePlot,
  onUnlinkStagePlot,
}) {
  const eventoId = evento?.id;
  const storedUrl = String(evento?.planta_escenario_url || "").trim();
  const storedNombre = String(evento?.planta_escenario_nombre || "").trim();
  const plotId = eventStagePlotId(evento);
  const stagePlotTo =
    showStagePlotEditorLink && plotId
      ? buildStandaloneEscenarioTo({ plotId, edicionId })
      : showStagePlotEditorLink && edicionId != null
        ? buildStandaloneEscenarioTo({ plotId: null, edicionId })
        : null;

  const [draftUrl, setDraftUrl] = useState(storedUrl);
  const [draftNombre, setDraftNombre] = useState(storedNombre);
  const [saving, setSaving] = useState(false);
  const [nameRefreshing, setNameRefreshing] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState(null);
  const menuBtnRef = useRef(null);
  const draftUrlRef = useRef(draftUrl);
  const draftNombreRef = useRef(draftNombre);
  draftUrlRef.current = draftUrl;
  draftNombreRef.current = draftNombre;

  const chipLabel = resolvePlantaEscenarioLabel({
    url: storedUrl,
    nombre: storedNombre,
  });
  const plotChipLabel =
    eventStagePlotNombre(evento) || "Escenario asignado";
  const previewUrl = buildDriveFilePreviewUrl(storedUrl);

  useEffect(() => {
    setDraftUrl(storedUrl);
    setDraftNombre(storedNombre);
  }, [eventoId, storedUrl, storedNombre]);

  useEffect(() => {
    if (!menuOpen || !menuBtnRef.current) {
      setMenuStyle(null);
      return undefined;
    }
    const place = () => {
      const r = menuBtnRef.current.getBoundingClientRect();
      const width = 240;
      const left = Math.min(
        Math.max(8, r.right - width),
        window.innerWidth - width - 8,
      );
      const openUp = r.bottom + 280 > window.innerHeight && r.top > 280;
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
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    const onPointer = (e) => {
      if (menuBtnRef.current?.contains(e.target)) return;
      const menuEl = document.getElementById(`backline-planta-menu-${eventoId}`);
      if (menuEl?.contains(e.target)) return;
      setMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointer);
    };
  }, [menuOpen, eventoId]);

  const persistPlanta = useCallback(
    async ({ url, nombre, resolveName = false } = {}) => {
      const nextUrl =
        url !== undefined ? String(url || "").trim() : draftUrlRef.current.trim();
      let nextNombre =
        nombre !== undefined
          ? String(nombre || "").trim()
          : draftNombreRef.current.trim();

      if (resolveName && nextUrl) {
        setNameRefreshing(true);
        const { name } = await fetchFimbaDriveFileName(nextUrl);
        setNameRefreshing(false);
        if (name) nextNombre = name;
        else if (!nextNombre) nextNombre = guessDriveLinkLabel(nextUrl);
      } else if (!nextUrl) {
        nextNombre = "";
      } else if (!nextNombre && (url !== undefined || resolveName)) {
        // URL nueva sin nombre: intentar Drive
        setNameRefreshing(true);
        const { name } = await fetchFimbaDriveFileName(nextUrl);
        setNameRefreshing(false);
        nextNombre = name || guessDriveLinkLabel(nextUrl);
      }

      const urlChanged = nextUrl !== storedUrl;
      const nombreChanged = nextNombre !== storedNombre;
      if (!urlChanged && !nombreChanged) return { ok: true };

      setSaving(true);
      const patch = {};
      if (urlChanged) patch.planta_escenario_url = nextUrl || null;
      if (nombreChanged || (urlChanged && nextUrl)) {
        patch.planta_escenario_nombre = nextNombre || null;
      }
      const { evento: saved, error } = await updateEventoBackline(eventoId, patch);
      setSaving(false);
      if (error) {
        toast.error(error.message || "No se pudo guardar la planta");
        return { ok: false };
      }
      const outUrl = String(saved?.planta_escenario_url || "").trim();
      const outNombre = String(saved?.planta_escenario_nombre || "").trim();
      setDraftUrl(outUrl);
      setDraftNombre(outNombre);
      onSaved?.(eventoId, {
        planta_escenario_url: saved?.planta_escenario_url ?? null,
        planta_escenario_nombre: saved?.planta_escenario_nombre ?? null,
      });
      return { ok: true, nombre: outNombre };
    },
    [eventoId, onSaved, storedNombre, storedUrl],
  );

  const openEdit = () => {
    setMenuOpen(false);
    setDraftUrl(storedUrl);
    setDraftNombre(storedNombre);
    setEditOpen(true);
  };

  const closeMenuRun = (fn) => {
    setMenuOpen(false);
    fn?.();
  };

  const editModal =
    editOpen &&
    createPortal(
      <div
        className="fimba-modal-backdrop"
        style={{ zIndex: 100 }}
        onClick={() => setEditOpen(false)}
        role="presentation"
      >
        <div
          className="fimba-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby={`backline-planta-edit-${eventoId}`}
          onClick={(e) => e.stopPropagation()}
          style={{ maxWidth: 480, width: "min(100%, 480px)" }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: "0.75rem",
              marginBottom: "0.75rem",
            }}
          >
            <h2
              id={`backline-planta-edit-${eventoId}`}
              style={{ margin: 0, fontSize: "1.05rem", color: "var(--fimba-deep)" }}
            >
              Planta Drive
            </h2>
            <button
              type="button"
              className="fimba-btn fimba-btn-ghost"
              style={{ padding: "0.3rem" }}
              onClick={() => setEditOpen(false)}
              aria-label="Cerrar"
            >
              <IconX size={16} />
            </button>
          </div>
          <div className="fimba-field">
            <label className="fimba-label" htmlFor={`planta-url-${eventoId}`}>
              URL
            </label>
            <input
              id={`planta-url-${eventoId}`}
              type="url"
              className="fimba-input"
              value={draftUrl}
              onChange={(e) => setDraftUrl(e.target.value)}
              placeholder="https://drive.google.com/file/d/…/view"
              autoComplete="off"
            />
          </div>
          <div className="fimba-field">
            <label className="fimba-label" htmlFor={`planta-nombre-${eventoId}`}>
              Nombre en chip
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                id={`planta-nombre-${eventoId}`}
                type="text"
                className="fimba-input"
                value={draftNombre}
                onChange={(e) => setDraftNombre(e.target.value)}
                placeholder="Ej. Stage plot — Artista.pdf"
                style={{ flex: 1 }}
                autoComplete="off"
              />
              <button
                type="button"
                className="fimba-btn fimba-btn-ghost"
                style={{ padding: "0.35rem 0.55rem", whiteSpace: "nowrap" }}
                disabled={!draftUrl.trim() || nameRefreshing}
                title="Leer nombre desde Drive"
                onClick={async () => {
                  const url = draftUrl.trim();
                  if (!url) return;
                  setNameRefreshing(true);
                  const { name } = await fetchFimbaDriveFileName(url);
                  setNameRefreshing(false);
                  setDraftNombre(name || guessDriveLinkLabel(url));
                }}
              >
                {nameRefreshing ? (
                  <IconLoader className="animate-spin" size={14} />
                ) : (
                  "Desde Drive"
                )}
              </button>
            </div>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 8,
              marginTop: "1rem",
            }}
          >
            <button
              type="button"
              className="fimba-btn fimba-btn-ghost"
              onClick={() => setEditOpen(false)}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="fimba-btn"
              disabled={saving}
              onClick={async () => {
                const url = draftUrl.trim();
                const nombre = draftNombre.trim();
                const { ok } = await persistPlanta({
                  url,
                  nombre,
                  resolveName: Boolean(url) && !nombre,
                });
                if (ok) setEditOpen(false);
              }}
            >
              {saving ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </div>
      </div>,
      document.body,
    );

  const previewModal =
    previewOpen &&
    storedUrl &&
    createPortal(
      <div
        className="fimba-modal-backdrop"
        style={{ zIndex: 100 }}
        onClick={() => setPreviewOpen(false)}
        role="presentation"
      >
        <div
          className="fimba-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby={`backline-drive-preview-${eventoId}`}
          onClick={(e) => e.stopPropagation()}
          style={{
            maxWidth: 920,
            width: "min(100%, 920px)",
            maxHeight: "min(92vh, 880px)",
            display: "flex",
            flexDirection: "column",
            gap: "0.65rem",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: "0.75rem",
            }}
          >
            <div style={{ minWidth: 0 }}>
              <h2
                id={`backline-drive-preview-${eventoId}`}
                style={{
                  margin: 0,
                  fontSize: "1.05rem",
                  color: "var(--fimba-deep)",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <IconDrive size={18} aria-hidden />
                <span
                  style={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                  title={chipLabel}
                >
                  {chipLabel}
                </span>
              </h2>
              <p
                className="fimba-muted"
                style={{ margin: "0.35rem 0 0", fontSize: "0.72rem" }}
              >
                Planta de escenario (Drive)
              </p>
            </div>
            <button
              type="button"
              className="fimba-btn fimba-btn-ghost"
              style={{ padding: "0.3rem" }}
              onClick={() => setPreviewOpen(false)}
              aria-label="Cerrar"
            >
              <IconX size={16} />
            </button>
          </div>

          <div
            style={{
              flex: 1,
              minHeight: 360,
              borderRadius: 10,
              overflow: "hidden",
              border: "1px solid var(--fimba-border, #e2e8f0)",
              background: "#0f172a08",
            }}
          >
            {previewUrl ? (
              <iframe
                title={chipLabel}
                src={previewUrl}
                style={{
                  width: "100%",
                  height: "min(62vh, 560px)",
                  border: 0,
                  display: "block",
                }}
                allow="autoplay"
              />
            ) : (
              <div
                style={{
                  padding: "2rem 1.25rem",
                  textAlign: "center",
                  fontSize: "0.88rem",
                }}
              >
                <p className="fimba-muted" style={{ marginBottom: "0.75rem" }}>
                  Este enlace no se puede previsualizar aquí. Abrilo en Drive.
                </p>
                <a
                  href={storedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="fimba-btn"
                  style={{ textDecoration: "none", display: "inline-flex", gap: 6 }}
                >
                  <IconExternalLink size={14} /> Abrir en Drive
                </a>
              </div>
            )}
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
            <a
              href={storedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="fimba-btn fimba-btn-ghost"
              style={{
                padding: "0.35rem 0.55rem",
                textDecoration: "none",
                display: "inline-flex",
                gap: 6,
                alignItems: "center",
              }}
            >
              <IconExternalLink size={14} /> Abrir en Drive
            </a>
            {!readOnly && (
              <button
                type="button"
                className="fimba-btn fimba-btn-ghost"
                style={{
                  padding: "0.35rem 0.55rem",
                  display: "inline-flex",
                  gap: 6,
                  alignItems: "center",
                }}
                onClick={() => {
                  setPreviewOpen(false);
                  openEdit();
                }}
              >
                <IconPencil size={14} /> Editar URL / nombre
              </button>
            )}
          </div>
        </div>
      </div>,
      document.body,
    );

  const menuItemStyle = {
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
    textDecoration: "none",
  };

  const menuPortal =
    menuOpen &&
    menuStyle &&
    createPortal(
      <div
        id={`backline-planta-menu-${eventoId}`}
        className="fimba-dropdown-menu"
        role="menu"
        style={{
          ...menuStyle,
          background: "var(--fimba-surface, #fff)",
          border: "1px solid var(--fimba-border, #e2e8f0)",
          borderRadius: 10,
          boxShadow: "0 10px 28px rgba(15, 23, 42, 0.14)",
          padding: "0.3rem 0",
          maxHeight: "min(70vh, 360px)",
          overflowY: "auto",
        }}
      >
        {storedUrl ? (
          <>
            <button
              type="button"
              role="menuitem"
              style={menuItemStyle}
              onClick={() => closeMenuRun(() => setPreviewOpen(true))}
            >
              <IconDrive size={14} /> Ver planta (preview)
            </button>
            <a
              href={storedUrl}
              target="_blank"
              rel="noopener noreferrer"
              role="menuitem"
              style={menuItemStyle}
              onClick={() => setMenuOpen(false)}
            >
              <IconExternalLink size={14} /> Abrir en Drive
            </a>
          </>
        ) : null}
        {!readOnly && (
          <button
            type="button"
            role="menuitem"
            style={menuItemStyle}
            onClick={openEdit}
          >
            <IconPencil size={14} />{" "}
            {storedUrl ? "Editar URL / nombre" : "Pegar URL Drive"}
          </button>
        )}
        {!readOnly && storedUrl && (
          <button
            type="button"
            role="menuitem"
            style={menuItemStyle}
            disabled={nameRefreshing || saving}
            onClick={() =>
              closeMenuRun(() => {
                void persistPlanta({
                  url: storedUrl,
                  resolveName: true,
                }).then((r) => {
                  if (r?.ok) toast.success("Nombre actualizado desde Drive");
                });
              })
            }
          >
            {nameRefreshing ? (
              <IconLoader className="animate-spin" size={14} />
            ) : (
              <IconDrive size={14} />
            )}{" "}
            Actualizar nombre desde Drive
          </button>
        )}
        <div
          style={{
            height: 1,
            background: "var(--fimba-border, #e2e8f0)",
            margin: "0.3rem 0",
          }}
        />
        <button
          type="button"
          role="menuitem"
          style={menuItemStyle}
          disabled={creating}
          onClick={() => closeMenuRun(() => onViewStagePlot?.(evento))}
        >
          <IconEye size={14} /> Ver escenario
        </button>
        {plotId && stagePlotTo && (
          <Link
            to={stagePlotTo}
            role="menuitem"
            style={menuItemStyle}
            onClick={() => setMenuOpen(false)}
          >
            <IconLayout size={14} /> Editar escenario
          </Link>
        )}
        {!readOnly && (
          <button
            type="button"
            role="menuitem"
            style={menuItemStyle}
            disabled={creating}
            onClick={() => closeMenuRun(() => onChooseStagePlot?.(evento))}
          >
            <IconLink size={14} />{" "}
            {plotId ? "Cambiar escenario" : "Elegir escenario"}
          </button>
        )}
        {!plotId && !readOnly && (
          <button
            type="button"
            role="menuitem"
            style={menuItemStyle}
            disabled={creating}
            onClick={() => closeMenuRun(() => onEnsureStagePlot?.(evento))}
          >
            {creating ? (
              <IconLoader className="animate-spin" size={14} />
            ) : (
              <IconPlus size={14} />
            )}{" "}
            Crear escenario
          </button>
        )}
        {plotId && !readOnly && (
          <button
            type="button"
            role="menuitem"
            style={{ ...menuItemStyle, color: "var(--fimba-danger, #be123c)" }}
            disabled={creating}
            onClick={() => closeMenuRun(() => onUnlinkStagePlot?.(evento))}
          >
            <IconLinkOff size={14} /> Desvincular escenario
          </button>
        )}
      </div>,
      document.body,
    );

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.25rem",
        minWidth: "10rem",
        maxWidth: "18rem",
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        {storedUrl ? (
          <button
            type="button"
            className="fimba-btn fimba-chip"
            onClick={() => setPreviewOpen(true)}
            title={chipLabel}
            style={{
              maxWidth: "100%",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "0.28rem 0.55rem",
            }}
          >
            <IconDrive size={14} aria-hidden />
            <span
              style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                fontSize: "0.78rem",
              }}
            >
              {chipLabel}
            </span>
          </button>
        ) : plotId ? (
          <button
            type="button"
            className="fimba-btn fimba-chip"
            onClick={() => onViewStagePlot?.(evento)}
            title={plotChipLabel}
            style={{
              maxWidth: "100%",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "0.28rem 0.55rem",
            }}
          >
            <IconLayout size={14} aria-hidden />
            <span
              style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                fontSize: "0.78rem",
              }}
            >
              {plotChipLabel}
            </span>
          </button>
        ) : (
          <span className="fimba-muted" style={{ fontSize: "0.72rem" }}>
            {readOnly ? "—" : "Sin planta"}
          </span>
        )}
        {(saving || nameRefreshing) && (
          <div className="fimba-muted" style={{ fontSize: "0.65rem", marginTop: 2 }}>
            {saving ? "Guardando…" : "Actualizando nombre…"}
          </div>
        )}
      </div>
      <button
        ref={menuBtnRef}
        type="button"
        className="fimba-btn fimba-btn-ghost"
        style={{ padding: "0.28rem 0.3rem", flexShrink: 0 }}
        aria-label="Acciones de planta y escenario"
        aria-expanded={menuOpen}
        aria-haspopup="menu"
        onClick={() => setMenuOpen((v) => !v)}
      >
        <IconMoreVertical size={16} />
      </button>
      {menuPortal}
      {previewModal}
      {editModal}
    </div>
  );
}

/**
 * Modal: vincular un stage_plot existente O crear uno nuevo (vacío / copia de referencia)
 * vía stage_plot_eventos (UNIQUE id_evento → un plot por evento).
 * Si ya hay vínculo: **Desvincular** (borra solo el link).
 *
 * Pasos: "link" (lista + Vincular + Desvincular) | "create" (vacío o duplicar referencia).
 */
function ChooseStagePlotModal({ open, evento, onClose, onLinked, onUnlinked }) {
  const { confirm, dialog: confirmDialog } = useConfirmDialog();
  const [plots, setPlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedPlotId, setSelectedPlotId] = useState(null);
  const [loadError, setLoadError] = useState(null);
  /** @type {"link" | "create"} */
  const [step, setStep] = useState("link");
  /** @type {"blank" | "reference"} */
  const [createMode, setCreateMode] = useState("blank");
  const [referencePlotId, setReferencePlotId] = useState(null);

  const programId =
    evento?.id_gira ?? evento?.programas?.id ?? evento?.id_programa ?? null;
  const currentPlotId = eventStagePlotId(evento);
  const hasExistingLink = !!currentPlotId;

  useEffect(() => {
    if (!open || programId == null) {
      setPlots([]);
      setSelectedPlotId(null);
      setLoadError(null);
      setStep("link");
      setCreateMode("blank");
      setReferencePlotId(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      setStep("link");
      setCreateMode("blank");
      const { data, error } = await listStagePlotsByPrograma(supabase, programId);
      if (cancelled) return;
      setLoading(false);
      if (error) {
        setLoadError(error.message || "No se pudieron cargar los escenarios");
        setPlots([]);
        return;
      }
      const list = data || [];
      setPlots(list);
      setSelectedPlotId(currentPlotId || list[0]?.id || null);
      setReferencePlotId(list[0]?.id || null);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, programId, currentPlotId, evento?.id]);

  const options = useMemo(
    () =>
      (plots || []).map((p, idx) => ({
        id: p.id,
        label: p.nombre?.trim() || `Lienzo ${idx + 1}`,
        subLabel: p.bloque_ids?.length
          ? `${p.bloque_ids.length} bloque(s)`
          : "Sin bloques asociados",
      })),
    [plots],
  );

  const handleConfirmLink = async () => {
    if (!evento?.id || !selectedPlotId) return;
    setSaving(true);
    const { error } = await linkEventToStagePlot(
      supabase,
      selectedPlotId,
      evento.id,
    );
    setSaving(false);
    if (error) {
      toast.error(error.message || "No se pudo vincular el escenario");
      return;
    }
    const selected = (plots || []).find((p) =>
      sameIdSet(p.id, selectedPlotId),
    );
    onLinked?.(evento.id, selectedPlotId, selected?.nombre);
    toast.success("Escenario vinculado al concierto");
    onClose?.();
  };

  const handleConfirmCreate = async () => {
    if (!evento?.id) return;
    if (createMode === "reference" && !referencePlotId) {
      toast.error("Elegí un escenario de referencia");
      return;
    }
    setSaving(true);
    const { data, error } = await createStagePlotForEvent(supabase, evento, {
      sourcePlotId: createMode === "reference" ? referencePlotId : null,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message || "No se pudo crear el escenario");
      return;
    }
    if (data?.id) {
      onLinked?.(evento.id, data.id, data.nombre);
      toast.success(
        createMode === "reference"
          ? "Escenario duplicado y vinculado al concierto"
          : "Escenario creado y vinculado al concierto",
      );
    }
    onClose?.();
  };

  const handleUnlink = async () => {
    if (!evento?.id || !hasExistingLink) return;
    const ok = await confirm({
      title: "Desvincular escenario",
      message:
        "¿Desvincular este concierto del escenario actual? El lienzo no se elimina; solo se quita el vínculo.",
      destructive: true,
      confirmText: "Desvincular",
      overlayClassName: "z-[110]",
    });
    if (!ok) return;
    setSaving(true);
    const { error } = await unlinkEventFromStagePlot(supabase, evento.id);
    setSaving(false);
    if (error) {
      toast.error(error.message || "No se pudo desvincular el escenario");
      return;
    }
    onUnlinked?.(evento.id);
    toast.success("Escenario desvinculado del concierto");
    onClose?.();
  };

  if (!open) return null;

  const title =
    step === "create"
      ? "Crear escenario nuevo"
      : hasExistingLink
        ? "Cambiar Escenario"
        : "Elegir Escenario";
  const subtitle =
    step === "create"
      ? "Creá un lienzo vacío o duplicá otro de la gira como referencia."
      : "Vincular un lienzo RiderMaker existente de la gira, o crear uno nuevo.";

  return createPortal(
    <div
      className="fimba-modal-backdrop"
      style={{ zIndex: 100 }}
      onClick={onClose}
      role="presentation"
    >
      <div
        className="fimba-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="choose-stage-plot-title"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 420, width: "min(100%, 420px)" }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: "0.75rem",
            marginBottom: "0.75rem",
          }}
        >
          <div>
            <h2
              id="choose-stage-plot-title"
              style={{ margin: 0, fontSize: "1.05rem", color: "var(--fimba-deep)" }}
            >
              {title}
            </h2>
            <p className="fimba-muted" style={{ margin: "0.35rem 0 0", fontSize: "0.78rem" }}>
              {subtitle}
            </p>
          </div>
          <button
            type="button"
            className="fimba-btn fimba-btn-ghost"
            style={{ padding: "0.3rem" }}
            onClick={onClose}
            aria-label="Cerrar"
          >
            <IconX size={16} />
          </button>
        </div>

        {programId == null ? (
          <div className="fimba-error">El concierto no tiene gira asociada.</div>
        ) : loading ? (
          <p className="fimba-muted" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <IconLoader className="animate-spin" size={14} /> Cargando lienzos…
          </p>
        ) : loadError ? (
          <div className="fimba-error">{loadError}</div>
        ) : step === "link" ? (
          <>
            {options.length === 0 ? (
              <p className="fimba-muted" style={{ fontSize: "0.85rem", marginBottom: "0.75rem" }}>
                No hay escenarios en esta gira todavía. Creá uno nuevo para este concierto.
              </p>
            ) : (
              <div style={{ marginBottom: "0.75rem" }}>
                <label className="fimba-label">Lienzo existente</label>
                <SearchableSelect
                  options={options}
                  value={selectedPlotId}
                  onChange={setSelectedPlotId}
                  placeholder="Elegir lienzo…"
                  dropdownMinWidth={280}
                />
              </div>
            )}
            <button
              type="button"
              className="fimba-btn fimba-btn-ghost"
              style={{
                width: "100%",
                justifyContent: "center",
                marginBottom: "0.75rem",
                border: "1px dashed var(--fimba-border)",
              }}
              onClick={() => {
                setStep("create");
                setCreateMode("blank");
                if (!referencePlotId && options[0]?.id) {
                  setReferencePlotId(options[0].id);
                }
              }}
              disabled={saving}
            >
              <IconPlus size={14} /> Crear uno nuevo
            </button>
            {hasExistingLink && (
              <button
                type="button"
                className="fimba-btn fimba-btn-ghost"
                style={{
                  width: "100%",
                  justifyContent: "center",
                  marginBottom: "0.75rem",
                  color: "var(--fimba-danger, #be123c)",
                }}
                onClick={() => void handleUnlink()}
                disabled={saving}
              >
                <IconLinkOff size={14} /> Desvincular
              </button>
            )}
          </>
        ) : (
          <div style={{ marginBottom: "0.75rem", display: "flex", flexDirection: "column", gap: "0.65rem" }}>
            <fieldset style={{ border: "none", margin: 0, padding: 0 }}>
              <legend className="fimba-label" style={{ marginBottom: "0.35rem" }}>
                Cómo crear
              </legend>
              <label
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "0.5rem",
                  fontSize: "0.85rem",
                  marginBottom: "0.4rem",
                  cursor: "pointer",
                }}
              >
                <input
                  type="radio"
                  name="create-stage-mode"
                  checked={createMode === "blank"}
                  onChange={() => setCreateMode("blank")}
                  style={{ marginTop: 3 }}
                />
                <span>
                  <strong style={{ fontWeight: 600 }}>Vacío</strong>
                  <span className="fimba-muted" style={{ display: "block", fontSize: "0.75rem" }}>
                    Lienzo nuevo sin ítems ni formaciones.
                  </span>
                </span>
              </label>
              <label
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "0.5rem",
                  fontSize: "0.85rem",
                  cursor: options.length === 0 ? "not-allowed" : "pointer",
                  opacity: options.length === 0 ? 0.5 : 1,
                }}
              >
                <input
                  type="radio"
                  name="create-stage-mode"
                  checked={createMode === "reference"}
                  onChange={() => setCreateMode("reference")}
                  disabled={options.length === 0}
                  style={{ marginTop: 3 }}
                />
                <span>
                  <strong style={{ fontWeight: 600 }}>Usar otro de referencia</strong>
                  <span className="fimba-muted" style={{ display: "block", fontSize: "0.75rem" }}>
                    Duplica layout, ítems y formaciones de un escenario existente.
                  </span>
                </span>
              </label>
            </fieldset>
            {createMode === "reference" && options.length > 0 && (
              <div>
                <label className="fimba-label">Escenario de referencia</label>
                <SearchableSelect
                  options={options}
                  value={referencePlotId}
                  onChange={setReferencePlotId}
                  placeholder="Elegir referencia…"
                  dropdownMinWidth={280}
                />
              </div>
            )}
            {options.length === 0 && (
              <p className="fimba-muted" style={{ fontSize: "0.75rem", margin: 0 }}>
                No hay escenarios para duplicar; solo podés crear uno vacío.
              </p>
            )}
          </div>
        )}

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "0.5rem",
            marginTop: "0.5rem",
            flexWrap: "wrap",
          }}
        >
          {step === "create" ? (
            <button
              type="button"
              className="fimba-btn fimba-btn-ghost"
              onClick={() => setStep("link")}
              disabled={saving}
            >
              Atrás
            </button>
          ) : (
            <button type="button" className="fimba-btn fimba-btn-ghost" onClick={onClose}>
              Cancelar
            </button>
          )}
          {step === "link" ? (
            <button
              type="button"
              className="fimba-btn fimba-btn-primary"
              disabled={
                saving || loading || !selectedPlotId || options.length === 0 || programId == null
              }
              onClick={() => void handleConfirmLink()}
            >
              {saving ? (
                <>
                  <IconLoader className="animate-spin" size={14} /> Vinculando…
                </>
              ) : (
                <>
                  <IconLink size={14} /> Vincular
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              className="fimba-btn fimba-btn-primary"
              disabled={
                saving ||
                loading ||
                programId == null ||
                (createMode === "reference" && !referencePlotId)
              }
              onClick={() => void handleConfirmCreate()}
            >
              {saving ? (
                <>
                  <IconLoader className="animate-spin" size={14} /> Creando…
                </>
              ) : (
                <>
                  <IconPlus size={14} /> Crear y vincular
                </>
              )}
            </button>
          )}
        </div>
      </div>
      {confirmDialog}
    </div>,
    document.body,
  );
}

function BacklineRow({
  evt,
  edicionId,
  readOnly,
  showStagePlotEditorLink,
  creatingPlotId,
  removingId,
  onViewStagePlot,
  onEnsureStagePlot,
  onChooseStagePlot,
  onUnlinkStagePlot,
  onRemoveEnsayo,
  onPatch,
}) {
  const fechaFormatted = formatVenueEventDate(evt.fecha);
  const hora = evt.hora_inicio ? evt.hora_inicio.slice(0, 5) : "";
  const artistas = extractEventArtistas(evt);
  const grupos = extractEventGrupos(evt);
  const venueName = evt.locaciones?.nombre || null;
  const localidad = evt.locaciones?.localidades?.localidad || null;
  const isEnsayo = isFimbaBacklineEnsayoRow(evt);
  const tipoNombre = evt.tipos_evento?.nombre || (isEnsayo ? "Ensayo" : null);
  const tipoColor = evt.tipos_evento?.color || "#64748b";
  const creating = creatingPlotId === evt.id;
  const removing = removingId === evt.id;
  const estadoPreset = resolveFimbaBacklineEstado(evt.backline_estado);
  const rowTint = estadoPreset
    ? { backgroundColor: `${estadoPreset.bg}33` }
    : undefined;

  return (
    <tr style={rowTint}>
      <td style={{ whiteSpace: "nowrap", verticalAlign: "middle" }}>
        <BacklineEstadoCell
          eventoId={evt.id}
          value={evt.backline_estado}
          readOnly={readOnly}
          onSaved={onPatch}
        />
      </td>
      <td className="fimba-planilla-wrap" style={{ minWidth: "12rem", maxWidth: "18rem" }}>
        {isEnsayo && tipoNombre && (
          <div style={{ marginBottom: "0.3rem" }}>
            <span
              className="fimba-badge"
              style={{
                fontSize: "0.68rem",
                backgroundColor: `${tipoColor}22`,
                borderColor: `${tipoColor}55`,
                color: "#222",
              }}
            >
              {tipoNombre}
            </span>
          </div>
        )}
        <FimbaArtistaChips artistas={artistas} />
        <div style={{ marginTop: "0.25rem" }}>
          {grupos.length > 0 ? (
            <GiraGrupoChips
              grupos={grupos}
              className="fimba-ofrn-grupo-chips"
            />
          ) : artistas.length === 0 ? (
            <span className="fimba-muted" style={{ fontSize: "0.72rem" }}>
              —
            </span>
          ) : null}
        </div>
        {evt.descripcion && (
          <div className="fimba-muted" style={{ fontSize: "0.68rem", marginTop: "0.25rem" }}>
            <FimbaEventDetallePreview
              html={evt.descripcion}
              empty=""
              className=""
            />
          </div>
        )}
      </td>
      <td className="fimba-planilla-wrap" style={{ minWidth: "8rem", maxWidth: "14rem" }}>
        {venueName ? (
          <div>
            <div style={{ fontSize: "0.82rem", fontWeight: 600 }}>{venueName}</div>
            {localidad && (
              <div className="fimba-muted" style={{ fontSize: "0.7rem" }}>
                {localidad}
              </div>
            )}
          </div>
        ) : (
          <span className="fimba-muted" style={{ fontSize: "0.72rem", fontStyle: "italic" }}>
            (Sin locación)
          </span>
        )}
      </td>
      <td style={{ whiteSpace: "nowrap" }}>
        <div style={{ fontSize: "0.82rem", fontWeight: 600 }}>{fechaFormatted}</div>
        {hora && (
          <div className="fimba-muted" style={{ fontSize: "0.72rem" }}>
            {hora} hs
          </div>
        )}
      </td>
      <td className="fimba-planilla-wrap fimba-backline-desc-cell">
        <BacklineDescripcionCell
          eventoId={evt.id}
          value={evt.backline_descripcion}
          readOnly={readOnly}
          onSaved={onPatch}
        />
      </td>
      <td>
        <BacklinePlantaCell
          evento={evt}
          edicionId={edicionId}
          readOnly={readOnly}
          showStagePlotEditorLink={showStagePlotEditorLink}
          creating={creating}
          onSaved={onPatch}
          onViewStagePlot={onViewStagePlot}
          onChooseStagePlot={onChooseStagePlot}
          onEnsureStagePlot={onEnsureStagePlot}
          onUnlinkStagePlot={onUnlinkStagePlot}
        />
      </td>
      <td style={{ textAlign: "left" }}>
        <BacklineMontoCell
          eventoId={evt.id}
          value={evt.backline_monto}
          readOnly={readOnly}
          onSaved={onPatch}
        />
      </td>
      {!readOnly && (
        <td style={{ width: "2.5rem", textAlign: "center", verticalAlign: "middle" }}>
          {isEnsayo ? (
            <button
              type="button"
              className="fimba-btn fimba-btn-ghost"
              style={{
                padding: "0.3rem",
                color: "var(--fimba-danger, #be123c)",
              }}
              title="Quitar ensayo de Backline (no elimina el evento)"
              onClick={() => onRemoveEnsayo?.(evt)}
              disabled={removing}
              aria-label="Quitar ensayo de Backline"
            >
              {removing ? (
                <IconLoader className="animate-spin" size={14} />
              ) : (
                <IconTrash size={14} />
              )}
            </button>
          ) : null}
        </td>
      )}
    </tr>
  );
}

/**
 * Modal: multi-select de ensayos de la gira para agregar a Backline.
 */
function SelectEnsayosBacklineModal({ open, edicionId, onClose, onAdded }) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [ensayos, setEnsayos] = useState([]);
  const [selectedIds, setSelectedIds] = useState(() => new Set());

  useEffect(() => {
    if (!open || edicionId == null) return;
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    setSelectedIds(new Set());
    listFimbaBacklineEnsayosDisponibles(edicionId)
      .then(({ events, error }) => {
        if (cancelled) return;
        if (error) {
          setLoadError(error.message || "No se pudieron cargar ensayos");
          setEnsayos([]);
          return;
        }
        setEnsayos(events || []);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, edicionId]);

  const toggleId = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const key = String(id);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleAdd = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) {
      toast.error("Seleccioná al menos un ensayo");
      return;
    }
    setSaving(true);
    const { error } = await setEventosBacklineIncluido(ids, true);
    setSaving(false);
    if (error) {
      toast.error(error.message || "No se pudieron agregar los ensayos");
      return;
    }
    toast.success(
      ids.length === 1
        ? "Ensayo agregado a Backline"
        : `${ids.length} ensayos agregados a Backline`,
    );
    onAdded?.();
    onClose?.();
  };

  if (!open) return null;

  return createPortal(
    <div
      className="fimba-modal-backdrop"
      style={{ zIndex: 100 }}
      onClick={onClose}
      role="presentation"
    >
      <div
        className="fimba-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="select-ensayos-backline-title"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 520, width: "min(100%, 520px)" }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: "0.75rem",
            marginBottom: "0.75rem",
          }}
        >
          <div>
            <h2
              id="select-ensayos-backline-title"
              style={{ margin: 0, fontSize: "1.05rem", color: "var(--fimba-deep)" }}
            >
              Seleccionar ensayo y Agregar
            </h2>
            <p className="fimba-muted" style={{ margin: "0.35rem 0 0", fontSize: "0.78rem" }}>
              Ensayos de la edición (categoría Ensayos) que aún no están en la planilla.
            </p>
          </div>
          <button
            type="button"
            className="fimba-btn fimba-btn-ghost"
            style={{ padding: "0.3rem" }}
            onClick={onClose}
            aria-label="Cerrar"
          >
            <IconX size={16} />
          </button>
        </div>

        {loading ? (
          <p className="fimba-muted" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <IconLoader className="animate-spin" size={14} /> Cargando ensayos…
          </p>
        ) : loadError ? (
          <div className="fimba-error">{loadError}</div>
        ) : ensayos.length === 0 ? (
          <p className="fimba-muted" style={{ fontSize: "0.85rem" }}>
            No hay ensayos disponibles para agregar (todos los de la gira ya están en Backline, o no hay ensayos cargados).
          </p>
        ) : (
          <div
            style={{
              maxHeight: "min(50vh, 360px)",
              overflowY: "auto",
              border: "1px solid var(--fimba-border)",
              borderRadius: 8,
              marginBottom: "0.85rem",
            }}
          >
            {ensayos.map((ev) => {
              const key = String(ev.id);
              const checked = selectedIds.has(key);
              const fecha = formatVenueEventDate(ev.fecha);
              const hora = ev.hora_inicio ? ev.hora_inicio.slice(0, 5) : "";
              const tipo = ev.tipos_evento?.nombre || "Ensayo";
              const venue = ev.locaciones?.nombre || "Sin locación";
              const arts = extractEventArtistas(ev);
              return (
                <label
                  key={ev.id}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "0.55rem",
                    padding: "0.55rem 0.7rem",
                    borderBottom: "1px solid var(--fimba-border)",
                    cursor: "pointer",
                    background: checked ? "rgba(190, 18, 60, 0.04)" : undefined,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleId(ev.id)}
                    style={{ marginTop: 3 }}
                  />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: "block", fontSize: "0.85rem", fontWeight: 600 }}>
                      {fecha}
                      {hora ? ` · ${hora} hs` : ""}
                      <span className="fimba-muted" style={{ fontWeight: 500 }}>
                        {" "}
                        · {tipo}
                      </span>
                    </span>
                    <span
                      className="fimba-muted"
                      style={{ display: "block", fontSize: "0.72rem", marginTop: 2 }}
                    >
                      {venue}
                      {arts.length > 0
                        ? ` · ${arts.map((a) => a.nombre).filter(Boolean).join(", ")}`
                        : ""}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        )}

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "0.5rem",
            marginTop: ensayos.length === 0 && !loading ? "0.75rem" : 0,
          }}
        >
          <button type="button" className="fimba-btn fimba-btn-ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </button>
          <button
            type="button"
            className="fimba-btn fimba-btn-primary"
            onClick={() => void handleAdd()}
            disabled={saving || loading || selectedIds.size === 0}
          >
            {saving ? (
              <>
                <IconLoader className="animate-spin" size={14} /> Agregando…
              </>
            ) : (
              <>
                <IconPlus size={14} /> Agregar
                {selectedIds.size > 0 ? ` (${selectedIds.size})` : ""}
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/**
 * Backline FIMBA: planilla por concierto + ensayos agregados manualmente.
 */
export default function FimbaBacklinePage() {
  const { edicionId } = useParams();
  const navigate = useNavigate();
  const { readOnly } = useFimbaAccess();
  const canEditStagePlot = !readOnly;
  const { confirm, dialog: confirmDialog } = useConfirmDialog();

  const [edicion, setEdicion] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Vacío = sin filtro (toda la edición). Antes default=hoy ocultaba conciertos pasados.
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedLocationIds, setSelectedLocationIds] = useState([]);
  const [selectedArtistIds, setSelectedArtistIds] = useState([]);
  const [stagePlotViewerEvent, setStagePlotViewerEvent] = useState(null);
  const [creatingPlotId, setCreatingPlotId] = useState(null);
  const [choosePlotEvent, setChoosePlotEvent] = useState(null);
  const [selectEnsayosOpen, setSelectEnsayosOpen] = useState(false);
  const [removingId, setRemovingId] = useState(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [{ edicion: ed, error: eEd }, { events: evts, error: eEv }] =
        await Promise.all([
          getFimbaEdicionById(edicionId),
          listFimbaBacklineConcerts(edicionId),
        ]);
      if (eEd) throw eEd;
      if (eEv) throw eEv;
      setEdicion(ed);
      setEvents(evts || []);
    } catch (err) {
      console.error("[FimbaBacklinePage] reload:", err);
      setError(err?.message || "No se pudo cargar Backline.");
    } finally {
      setLoading(false);
    }
  }, [edicionId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const locationOptions = useMemo(() => {
    const map = new Map();
    (events || []).forEach((evt) => {
      const loc = evt.locaciones;
      const id = loc?.id ?? evt.id_locacion;
      if (id == null || map.has(Number(id))) return;
      map.set(Number(id), {
        id: Number(id),
        label: loc?.nombre || `Locación ${id}`,
      });
    });
    return Array.from(map.values()).sort((a, b) =>
      a.label.localeCompare(b.label, "es"),
    );
  }, [events]);

  const artistOptions = useMemo(() => {
    const map = new Map();
    (events || []).forEach((evt) => {
      extractEventArtistas(evt).forEach((a) => {
        if (a?.id == null || map.has(a.id)) return;
        map.set(a.id, {
          id: a.id,
          label: a.nombre || `Artista ${a.id}`,
        });
      });
    });
    return Array.from(map.values()).sort((a, b) =>
      a.label.localeCompare(b.label, "es"),
    );
  }, [events]);

  const filteredEvents = useMemo(() => {
    const locSet =
      selectedLocationIds?.length > 0
        ? new Set(
            selectedLocationIds
              .map((id) => Number(id))
              .filter((n) => Number.isFinite(n)),
          )
        : null;
    const artistSet =
      selectedArtistIds?.length > 0
        ? new Set(selectedArtistIds.map(String))
        : null;

    return (events || []).filter((evt) => {
      if (dateFrom && evt.fecha && evt.fecha < dateFrom) return false;
      if (dateTo && evt.fecha && evt.fecha > dateTo) return false;
      if (locSet) {
        const locId = evt.locaciones?.id ?? evt.id_locacion;
        const n = Number(locId);
        if (!Number.isFinite(n) || !locSet.has(n)) return false;
      }
      if (artistSet) {
        const arts = extractEventArtistas(evt);
        if (!arts.some((a) => artistSet.has(String(a.id)))) return false;
      }
      return true;
    });
  }, [events, dateFrom, dateTo, selectedLocationIds, selectedArtistIds]);

  const planillaCounts = useMemo(() => {
    let conciertos = 0;
    let ensayos = 0;
    for (const evt of filteredEvents || []) {
      if (isFimbaBacklineEnsayoRow(evt)) ensayos += 1;
      else conciertos += 1;
    }
    return { conciertos, ensayos, total: filteredEvents.length };
  }, [filteredEvents]);

  const handlePatch = useCallback((eventoId, patch) => {
    setEvents((prev) =>
      prev.map((evt) => (evt.id === eventoId ? { ...evt, ...patch } : evt)),
    );
  }, []);

  const handleLinkedPlot = useCallback((eventoId, plotId, plotNombre = null) => {
    setEvents((prev) =>
      prev.map((row) =>
        sameIdSet(row.id, eventoId)
          ? {
              ...row,
              stage_plot_eventos: [stagePlotLinkRow(plotId, plotNombre)],
            }
          : row,
      ),
    );
  }, []);

  const handleUnlinkedPlot = useCallback((eventoId) => {
    setEvents((prev) =>
      prev.map((row) =>
        sameIdSet(row.id, eventoId)
          ? { ...row, stage_plot_eventos: [] }
          : row,
      ),
    );
  }, []);

  const handleUnlinkStagePlot = useCallback(
    async (evt) => {
      if (readOnly || !evt?.id || !eventStagePlotId(evt)) return;
      const ok = await confirm({
        title: "Desvincular escenario",
        message:
          "¿Quitar el vínculo RiderMaker de este evento? El lienzo no se borra; solo deja de estar asociado a esta fila.",
        destructive: true,
        confirmText: "Desvincular",
        overlayClassName: "z-[110]",
      });
      if (!ok) return;
      setCreatingPlotId(evt.id);
      const { error } = await unlinkEventFromStagePlot(supabase, evt.id);
      setCreatingPlotId(null);
      if (error) {
        toast.error(error.message || "No se pudo desvincular");
        return;
      }
      handleUnlinkedPlot(evt.id);
      toast.success("Escenario desvinculado");
    },
    [confirm, handleUnlinkedPlot, readOnly],
  );

  const handleRemoveEnsayo = useCallback(
    async (evt) => {
      if (readOnly || !evt?.id || !isFimbaBacklineEnsayoRow(evt)) return;
      const ok = await confirm({
        title: "Quitar ensayo de Backline",
        message:
          "¿Sacar este ensayo de la planilla Backline? El evento de agenda no se elimina; solo deja de figurar acá.",
        destructive: true,
        confirmText: "Quitar",
        overlayClassName: "z-[110]",
      });
      if (!ok) return;
      setRemovingId(evt.id);
      const { error: err } = await setEventosBacklineIncluido([evt.id], false);
      setRemovingId(null);
      if (err) {
        toast.error(err.message || "No se pudo quitar el ensayo");
        return;
      }
      setEvents((prev) => prev.filter((row) => !sameIdSet(row.id, evt.id)));
      toast.success("Ensayo quitado de Backline");
    },
    [confirm, readOnly],
  );

  const handleEnsureStagePlot = useCallback(
    async (evt) => {
      if (readOnly || !evt?.id) return;
      setCreatingPlotId(evt.id);
      try {
        const { data, created, error: err } = await ensureStagePlotForEvent(
          supabase,
          evt,
        );
        if (err) {
          toast.error(err.message || "No se pudo crear el escenario");
          return;
        }
        if (data?.id) {
          handleLinkedPlot(evt.id, data.id, data.nombre);
          toast.success(
            created
              ? "Escenario creado y vinculado al concierto"
              : "Escenario ya vinculado",
          );
          if (canEditStagePlot && data.id) {
            navigate(
              buildStandaloneEscenarioTo({
                plotId: data.id,
                edicionId,
              }),
            );
          } else {
            setStagePlotViewerEvent({
              ...evt,
              stage_plot_eventos: [
                stagePlotLinkRow(data.id, data.nombre),
              ],
            });
          }
        }
      } finally {
        setCreatingPlotId(null);
      }
    },
    [canEditStagePlot, edicionId, handleLinkedPlot, navigate, readOnly],
  );

  const edicionLabel = edicion?.nombre || `Edición ${edicionId}`;
  const giraProgram = edicion?.programas || null;

  const countLabel = (() => {
    const parts = [];
    if (planillaCounts.conciertos > 0) {
      parts.push(
        `${planillaCounts.conciertos} concierto${planillaCounts.conciertos === 1 ? "" : "s"}`,
      );
    }
    if (planillaCounts.ensayos > 0) {
      parts.push(
        `${planillaCounts.ensayos} ensayo${planillaCounts.ensayos === 1 ? "" : "s"}`,
      );
    }
    if (parts.length === 0) return "0 filas";
    return parts.join(" · ");
  })();

  return (
    <div className="fimba-backline-wide">
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: "1rem",
          flexWrap: "wrap",
          marginBottom: "1rem",
        }}
      >
        <div>
          <Link
            to={`/fimba/edicion/${edicionId}`}
            className="fimba-btn fimba-btn-ghost"
            style={{
              marginBottom: "0.5rem",
              textDecoration: "none",
              display: "inline-flex",
            }}
          >
            <IconArrowLeft size={14} /> Artistas
          </Link>
          <h1
            style={{
              margin: 0,
              fontSize: "1.35rem",
              color: "var(--fimba-deep)",
            }}
          >
            Backline
          </h1>
          <p
            className="fimba-muted"
            style={{ margin: "0.35rem 0 0", fontSize: "0.85rem" }}
          >
            {edicionLabel}
            {giraProgram?.nomenclador ? ` · ${giraProgram.nomenclador}` : ""}
          </p>
        </div>
        {loading && (
          <span
            className="fimba-muted"
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <IconLoader className="animate-spin" size={16} /> Cargando…
          </span>
        )}
      </div>

      {error && (
        <div className="fimba-error" style={{ marginBottom: "1rem" }}>
          {error}
        </div>
      )}

      <div className="fimba-card fimba-no-print" style={{ marginBottom: "1rem" }}>
        <div
          className="fimba-grid-2"
          style={{
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          }}
        >
          <DateInput label="Fecha desde" value={dateFrom} onChange={setDateFrom} />
          <DateInput label="Fecha hasta" value={dateTo} onChange={setDateTo} />
          <div>
            <label className="fimba-label">Artistas</label>
            <SearchableSelect
              options={artistOptions}
              value={selectedArtistIds}
              onChange={setSelectedArtistIds}
              isMulti
              placeholder="Todos…"
              dropdownMinWidth={260}
            />
          </div>
          <div>
            <label className="fimba-label">Locaciones</label>
            <SearchableSelect
              options={locationOptions}
              value={selectedLocationIds}
              onChange={setSelectedLocationIds}
              isMulti
              placeholder="Todas…"
              dropdownMinWidth={260}
            />
          </div>
        </div>
      </div>

      <div className="fimba-card fimba-planilla-card">
        <div
          style={{
            padding: "0.75rem 1rem",
            borderBottom: "1px solid var(--fimba-border)",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: "0.75rem",
            flexWrap: "wrap",
          }}
        >
          <div>
            <strong style={{ fontSize: "0.9rem" }}>Planilla backline</strong>
            <div
              className="fimba-muted"
              style={{ fontSize: "0.75rem", marginTop: "0.15rem" }}
            >
              {countLabel}
              {readOnly ? " · solo lectura" : ""}
            </div>
          </div>
          {!readOnly && (
            <button
              type="button"
              className="fimba-btn fimba-btn-primary"
              onClick={() => setSelectEnsayosOpen(true)}
            >
              <IconPlus size={14} /> Seleccionar ensayo y Agregar
            </button>
          )}
        </div>

        {filteredEvents.length === 0 && !loading ? (
          <p
            className="fimba-muted"
            style={{ textAlign: "center", padding: "2.5rem 1rem" }}
          >
            No hay conciertos ni ensayos en Backline para los filtros actuales.
          </p>
        ) : (
          <div className="fimba-planilla-scroll">
            <table className="fimba-table fimba-planilla-table">
              <thead>
                <tr>
                  <th>Estado</th>
                  <th>Artista</th>
                  <th>Venue</th>
                  <th>Fecha</th>
                  <th className="fimba-backline-desc-cell">Descripción</th>
                  <th>Planta de Escenario</th>
                  <th style={{ textAlign: "left" }}>Monto</th>
                  {!readOnly && <th aria-label="Acciones" />}
                </tr>
              </thead>
              <tbody>
                {filteredEvents.map((evt) => (
                  <BacklineRow
                    key={evt.id}
                    evt={evt}
                    edicionId={edicionId}
                    readOnly={readOnly}
                    showStagePlotEditorLink={canEditStagePlot}
                    creatingPlotId={creatingPlotId}
                    removingId={removingId}
                    onViewStagePlot={setStagePlotViewerEvent}
                    onEnsureStagePlot={handleEnsureStagePlot}
                    onChooseStagePlot={setChoosePlotEvent}
                    onUnlinkStagePlot={handleUnlinkStagePlot}
                    onRemoveEnsayo={handleRemoveEnsayo}
                    onPatch={handlePatch}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <StagePlotViewerModal
        open={!!stagePlotViewerEvent}
        onClose={() => setStagePlotViewerEvent(null)}
        supabase={supabase}
        evento={stagePlotViewerEvent}
        gira={giraProgram}
      />

      <ChooseStagePlotModal
        open={!!choosePlotEvent}
        evento={choosePlotEvent}
        onClose={() => setChoosePlotEvent(null)}
        onLinked={handleLinkedPlot}
        onUnlinked={handleUnlinkedPlot}
      />

      <SelectEnsayosBacklineModal
        open={selectEnsayosOpen}
        edicionId={edicionId}
        onClose={() => setSelectEnsayosOpen(false)}
        onAdded={reload}
      />

      {confirmDialog}
    </div>
  );
}
