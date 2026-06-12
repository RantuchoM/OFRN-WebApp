import React, { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  useDroppable,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  IconMusic,
  IconPlus,
  IconTrash,
  IconSearch,
  IconLoader,
  IconCheck,
  IconX,
  IconLink,
  IconChevronDown,
  IconChevronUp,
  IconAlertCircle,
  IconEdit,
  IconYoutube,
  IconDrive,
  IconEye,
  IconEyeOff,
  IconSettings,
  IconFilter,
  IconGripVertical,
  IconCopy,
  IconRefresh,
  IconViolin,
} from "../ui/Icons";
import {
  updateWorkPosition,
  normalizeRepertorioBlockOrden,
  seatingItemMatrixPosition,
  deleteRepertoireBlockWithDrive,
} from "../../services/giraService";
import { formatSecondsToTime, inputToSeconds } from "../../utils/time";
import {
  calculateInstrumentation,
  calculateTotalDuration,
  calculateNetDuration,
  effectiveRepertorioObraDurationSeconds,
  hasRepertorioObraDurationOverride,
  getInstrumentValue,
  hasStrings,
} from "../../utils/instrumentation";
import { useDebouncedCallback } from "../../hooks/useDebouncedCallback";
import CommentsManager from "../comments/CommentsManager";
import CommentButton from "../comments/CommentButton";
import { useAuth } from "../../context/AuthContext";
import WorkForm from "../../views/Repertoire/WorkForm";
import InstrumentationFilterModal from "./InstrumentationFilterModal";
import { getInstrumentationFilterLabel } from "../../utils/instrumentationFilterPresets";
const ModalPortal = ({ children, onClose = null, closeOnBackdrop = false }) => {
  useEffect(() => {
    if (!onClose) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onMouseDown={(event) => {
        if (closeOnBackdrop && event.target === event.currentTarget) onClose?.();
      }}
    >
      {children}
    </div>,
    document.body,
  );
};

const normalizeSearchText = (value) =>
  String(value || "")
    .replace(/<[^>]*>?/gm, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

const sanitizePreviewHtml = (content) => {
  let html = String(content || "");
  if (!html) return "";
  // El editor suele dejar tags inline vacíos dentro de bloques vacíos
  // (p.ej. <div><i>\n</i></div>), que también agregan altura.
  const EMPTY_INLINE_TAG_RE =
    /<(?:span|i|em|strong|b|u|small|font)[^>]*>(?:\s|&nbsp;|<br\s*\/?>)*<\/(?:span|i|em|strong|b|u|small|font)>/gi;
  let prev = "";
  while (prev !== html) {
    prev = html;
    html = html.replace(EMPTY_INLINE_TAG_RE, "");
  }
  // Luego removemos bloques vacíos al final (<div><br></div>, <p>&nbsp;</p>, etc.),
  // incluso con atributos (<div style="...">).
  html = html.replace(
    /(?:\s*<(?:div|p)[^>]*>(?:\s|&nbsp;|<br\s*\/?>)*<\/(?:div|p)>)+\s*$/gi,
    "",
  );
  // También cortamos <br> sueltos al final.
  html = html.replace(/(?:\s|&nbsp;|<br\s*\/?>)+$/gi, "");
  return html.trim();
};

function secondsToMmSsDurationInput(totalSeconds) {
  if (totalSeconds == null || !Number.isFinite(Number(totalSeconds))) return "";
  const n = Math.max(0, Math.floor(Number(totalSeconds)));
  const m = Math.floor(n / 60);
  const s = n % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Celda Dur.repertorio: sin "0:00" si no hay duración (catálogo ni override > 0). */
function formatRepertorioDuracionVisible(seconds) {
  const n = Number(seconds);
  if (!Number.isFinite(n) || n <= 0) return "";
  return formatSecondsToTime(n);
}

/** Duración por programa: cursiva si hay override; escritorio = IconEdit al hover; móvil = IconEdit junto al tiempo; al editar, IconRefresh restaura catálogo. */
function RepertorioProgramDurationCell({ item, isEditor, updateWorkDetail, compact }) {
  const effective = effectiveRepertorioObraDurationSeconds(item);
  const hasOv = hasRepertorioObraDurationOverride(item);
  const catalogSeconds = item.obras?.duracion_segundos ?? 0;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    if (!editing) {
      setDraft(hasOv ? secondsToMmSsDurationInput(item.duracion_segundos_concierto) : "");
    }
  }, [item.id, item.duracion_segundos_concierto, editing, hasOv]);

  const revertCatalog = () => {
    updateWorkDetail(item.id, "duracion_segundos_concierto", null);
    setDraft("");
    setEditing(false);
  };

  const persistDraftAndClose = (raw) => {
    const t = String(raw ?? "").trim();
    if (!t) {
      if (hasRepertorioObraDurationOverride(item)) {
        updateWorkDetail(item.id, "duracion_segundos_concierto", null);
      }
    } else {
      updateWorkDetail(item.id, "duracion_segundos_concierto", inputToSeconds(t));
    }
    setEditing(false);
  };

  const catalogTitle = hasOv
    ? `Duración en catálogo: ${formatRepertorioDuracionVisible(catalogSeconds) || "—"}`
    : undefined;
  const spanItalic = hasOv ? "italic text-indigo-900 font-semibold" : "";

  if (!isEditor) {
    return (
      <span
        className={`font-mono tabular-nums text-[10px] text-slate-600 ${spanItalic}`}
        title={catalogTitle}
      >
        {formatRepertorioDuracionVisible(effective)}
      </span>
    );
  }

  if (compact) {
    return (
      <div className="flex flex-col items-end gap-0.5 min-w-0">
        <div className="flex items-center gap-0.5 shrink-0">
          <span
            className={`font-mono tabular-nums text-[10px] text-slate-600 ${spanItalic}`}
            title={catalogTitle}
          >
            {formatRepertorioDuracionVisible(effective)}
          </span>
          <button
            type="button"
            className="p-0.5 rounded text-slate-400 hover:text-fixed-indigo-600 shrink-0"
            title={editing ? "Guardar y cerrar" : "Editar duración solo este programa"}
            aria-label={editing ? "Guardar duración" : "Editar duración del programa"}
            onClick={() => {
              if (editing) persistDraftAndClose(draft);
              else {
                setDraft(hasOv ? secondsToMmSsDurationInput(item.duracion_segundos_concierto) : "");
                setEditing(true);
              }
            }}
          >
            <IconEdit size={11} />
          </button>
        </div>
        {editing && (
          <div className="flex items-center gap-1 justify-end w-full">
            <input
              type="text"
              className="w-[4.25rem] text-[9px] px-1 py-0.5 rounded border border-slate-200 font-mono"
              placeholder="mm:ss"
              title="Minutos (ej. 8) o mm:ss. Vacío = catálogo."
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={() => persistDraftAndClose(draft)}
              autoFocus
            />
            <button
              type="button"
              className="p-0.5 rounded text-slate-500 hover:text-emerald-600 shrink-0"
              title="Volver a la duración del catálogo"
              aria-label="Restaurar duración original"
              onMouseDown={(e) => e.preventDefault()}
              onClick={revertCatalog}
            >
              <IconRefresh size={12} />
            </button>
          </div>
        )}
      </div>
    );
  }

  if (editing) {
    return (
      <div className="flex flex-col items-center gap-1 py-0.5 w-full min-w-0 px-0.5">
        <div className="flex items-center justify-center gap-1 w-full">
          <input
            type="text"
            className="flex-1 min-w-0 max-w-[5rem] text-[10px] px-1 py-0.5 rounded border border-slate-200 font-mono text-center"
            placeholder="mm:ss"
            title="Minutos o mm:ss; vacío = obra."
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => persistDraftAndClose(draft)}
            autoFocus
          />
          <button
            type="button"
            className="p-0.5 rounded text-slate-500 hover:text-emerald-600 shrink-0"
            title="Volver a la duración del catálogo"
            aria-label="Restaurar duración original"
            onMouseDown={(e) => e.preventDefault()}
            onClick={revertCatalog}
          >
            <IconRefresh size={14} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="group relative flex items-center justify-center min-h-[2rem] px-6">
      <span
        className={`font-mono tabular-nums text-[10px] text-slate-600 ${spanItalic}`}
        title={catalogTitle}
      >
        {formatRepertorioDuracionVisible(effective)}
      </span>
      <button
        type="button"
        className="absolute right-0 top-1/2 -translate-y-1/2 p-0.5 rounded text-slate-400 hover:text-fixed-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity"
        title="Editar duración solo para este programa"
        aria-label="Editar duración del programa"
        onClick={() => {
          setDraft(hasOv ? secondsToMmSsDurationInput(item.duracion_segundos_concierto) : "");
          setEditing(true);
        }}
      >
        <IconEdit size={14} />
      </button>
    </div>
  );
}

// --- RENDERER DE TEXTO RICO ---
const RichTextPreview = ({ content, className = "" }) => {
  const sanitized = sanitizePreviewHtml(content);
  if (!sanitized) return null;
  return (
    <div
      className={`whitespace-pre-wrap [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_li]:ml-1 leading-tight ${className}`}
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  );
};
// --- NUEVO: RENDERER DE TÍTULO INTELIGENTE (MULTI-LÍNEA) ---
const MultiLineTitle = ({ content }) => {
  if (!content) return null;

  // Limpieza básica
  let clean = content.replace(/^<p>|<\/p>$/g, "");

  // Separar por saltos de línea (html o texto)
  const rawParts = clean.split(/<br\s*\/?>|<\/div><div>|\n/i);
  const parts = rawParts
    .map((p) => p.replace(/<div>|<\/div>/g, ""))
    .filter((p) => p.trim() !== "");

  if (parts.length === 0) return null;

  return (
    <div className="flex flex-col text-slate-800">
      {/* Primera línea: Tamaño normal y Negrita */}
      <div
        className="text-[15px] font-bold leading-tight"
        dangerouslySetInnerHTML={{ __html: parts[0] }}
      />

      {/* Líneas subsiguientes: Más pequeñas y tenues */}
      {parts.length > 1 && (
        <div className="mt-0.5 text-[11px] font-medium opacity-60 leading-tight">
          {parts.slice(1).map((line, idx) => (
            <div key={idx} dangerouslySetInnerHTML={{ __html: line }} />
          ))}
        </div>
      )}
    </div>
  );
};

const NOTAS_STICKY_PANEL_CLASS =
  "bg-yellow-50 border border-yellow-100 text-yellow-900 rounded-lg shadow-[2px_3px_10px_rgba(234,179,8,0.22)] relative leading-tight rotate-[0.15deg]";

/** Notas por programa: stick-it en escritorio; estado local + guardado en blur (evita perder foco). */
function NotasProgramaStickyCell({ item, isEditor, updateWorkDetail, shrinkWhenEmpty = false }) {
  const editingRef = useRef(false);
  const [draft, setDraft] = useState(() => item.notas_especificas ?? "");
  const [notesFocused, setNotesFocused] = useState(false);

  useEffect(() => {
    if (!editingRef.current) {
      setDraft(item.notas_especificas ?? "");
    }
  }, [item.id, item.notas_especificas]);

  const stickyWrap = (inner) => (
    <div
      className={`${NOTAS_STICKY_PANEL_CLASS} ${shrinkWhenEmpty ? "px-2 py-1" : "p-2"}`}
    >
      <IconAlertCircle
        size={10}
        className={`absolute left-1.5 text-amber-500/75 pointer-events-none ${shrinkWhenEmpty ? "top-1.5" : "top-2"}`}
      />
      <div className="min-w-0 pl-3">{inner}</div>
    </div>
  );

  if (isEditor) {
    const showPostIt = draft.trim().length > 0 || notesFocused;
    const collapsedEmpty = shrinkWhenEmpty && !showPostIt;
    const textarea = (
      <textarea
        rows={collapsedEmpty ? 1 : shrinkWhenEmpty && showPostIt ? 1 : 3}
        spellCheck
        className={
          collapsedEmpty
            ? "w-full min-h-0 max-h-[1.35rem] resize-none overflow-hidden bg-transparent border-0 p-0 text-[10px] outline-none focus:ring-0 leading-snug text-slate-700 placeholder:text-slate-400"
            : showPostIt
              ? shrinkWhenEmpty
                ? "w-full min-h-[1.35rem] max-h-[6.5rem] resize-y overflow-y-auto bg-transparent border-0 p-0 text-[10px] outline-none focus:ring-0 leading-snug text-yellow-950 placeholder:text-amber-800/40 [field-sizing:content]"
                : "w-full min-h-[2.75rem] resize-y bg-transparent border-0 p-0 text-[10px] outline-none focus:ring-0 leading-snug text-yellow-950 placeholder:text-amber-800/40"
              : "w-full min-h-[2.75rem] resize-y bg-transparent border-0 p-0 text-[10px] outline-none focus:ring-0 leading-snug text-slate-700 placeholder:text-slate-400"
        }
        placeholder="Observaciones..."
        value={draft}
        onFocus={() => {
          editingRef.current = true;
          setNotesFocused(true);
        }}
        onBlur={() => {
          editingRef.current = false;
          setNotesFocused(false);
          const prev = item.notas_especificas ?? "";
          if (draft !== prev) {
            updateWorkDetail(item.id, "notas_especificas", draft);
          }
        }}
        onChange={(e) => setDraft(e.target.value)}
      />
    );

    return (
      <div
        className={`min-w-0 max-w-full ${collapsedEmpty || (shrinkWhenEmpty && showPostIt) ? "px-1 py-0" : "p-1"}`}
      >
        {showPostIt ? (
          stickyWrap(textarea)
        ) : (
          <div
            className={`rounded-lg border border-dashed border-slate-200 bg-white shadow-[inset_0_1px_2px_rgba(15,23,42,0.04)] ${collapsedEmpty ? "px-1.5 py-0.5" : "p-2"}`}
          >
            {textarea}
          </div>
        )}
      </div>
    );
  }

  if (!item.notas_especificas?.trim()) {
    return (
      <span
        className={`block text-[10px] text-slate-300 italic text-center ${shrinkWhenEmpty ? "px-1 py-0" : "p-2"}`}
      >
        —
      </span>
    );
  }

  return (
    <div className={`min-w-0 ${shrinkWhenEmpty ? "px-1 py-0" : "p-1"}`}>
      {stickyWrap(
        <div
          className={`text-[10px] text-yellow-950 [&_*]:text-inherit [&_a]:underline ${shrinkWhenEmpty ? "max-h-[6.5rem] overflow-y-auto pr-0.5" : ""}`}
        >
          <RichTextPreview content={item.notas_especificas} />
        </div>,
      )}
    </div>
  );
}

// --- COMPONENTE INTERNO: SELECTOR DE SOLISTA ---
const SoloistSelect = ({ currentId, musicians, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const wrapperRef = useRef(null);
  const selectedMusician = musicians.find((m) => m.id === currentId);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = musicians.filter((m) =>
    `${m.apellido}, ${m.nombre}`.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="relative w-full" ref={wrapperRef}>
      {!isOpen ? (
        <div
          onClick={() => setIsOpen(true)}
          className="w-full text-[10px] text-slate-700 truncate cursor-pointer hover:bg-fixed-indigo-50 p-1 rounded border border-transparent hover:border-fixed-indigo-100 min-h-[24px] flex items-center"
        >
          {selectedMusician ? (
            <span className="font-bold text-fixed-indigo-700">
              {selectedMusician.apellido}, {selectedMusician.nombre}
            </span>
          ) : (
            <span className="text-slate-400 italic">- Seleccionar -</span>
          )}
        </div>
      ) : (
        <div className="absolute top-0 left-0 w-64 bg-white border border-fixed-indigo-200 shadow-xl rounded z-50 animate-in zoom-in-95 duration-100">
          <input
            type="text"
            autoFocus
            placeholder="Buscar apellido..."
            className="w-full p-2 text-xs border-b border-slate-100 outline-none"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="max-h-48 overflow-y-auto">
            <div
              onClick={() => {
                onChange(null);
                setIsOpen(false);
              }}
              className="p-2 text-xs text-slate-400 hover:bg-red-50 hover:text-red-600 cursor-pointer border-b border-slate-50 italic"
            >
              - Quitar Solista -
            </div>
            {filtered.map((m) => (
              <div
                key={m.id}
                onClick={() => {
                  onChange(m.id);
                  setIsOpen(false);
                }}
                className={`p-2 text-xs cursor-pointer hover:bg-fixed-indigo-50 flex justify-between ${
                  currentId === m.id
                    ? "bg-fixed-indigo-50 font-bold text-fixed-indigo-700"
                    : "text-slate-600"
                }`}
              >
                <span>
                  {m.apellido}, {m.nombre}
                </span>
                <span className="text-[9px] text-slate-400 ml-2 truncate max-w-[80px]">
                  {m.instrumentos?.instrumento}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};


function QuickWorkRow({
  rep,
  definitionMode,
  isEditor,
  user,
  supabase,
  addWorkToBlock,
  fetchFullRepertoire,
  setQuickEntryFollowup,
}) {
  const MIN_SEARCH_LEN = 2;
  const [composerInput, setComposerInput] = useState("");
  const [composerOptions, setComposerOptions] = useState([]);
  const [activeComposerIndex, setActiveComposerIndex] = useState(-1);
  const [selectedComposer, setSelectedComposer] = useState(null);
  const [showComposerDropdown, setShowComposerDropdown] = useState(false);
  const [searchingComposer, setSearchingComposer] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [instrumentacion, setInstrumentacion] = useState("");
  const [duracion, setDuracion] = useState("");
  const [saving, setSaving] = useState(false);
  const [isNewWorkForComposer, setIsNewWorkForComposer] = useState(false);
  const [workOptions, setWorkOptions] = useState([]);
  const [activeWorkIndex, setActiveWorkIndex] = useState(-1);
  const [showWorkDropdown, setShowWorkDropdown] = useState(false);
  const [searchingWork, setSearchingWork] = useState(false);
  const [selectedWork, setSelectedWork] = useState(null);
  const composerInputRef = useRef(null);
  const workInputRef = useRef(null);
  const [composerDropdownPos, setComposerDropdownPos] = useState(null);
  const [workDropdownPos, setWorkDropdownPos] = useState(null);
  const [arrangerInput, setArrangerInput] = useState("");
  const [arrangerOptions, setArrangerOptions] = useState([]);
  const [activeArrangerIndex, setActiveArrangerIndex] = useState(-1);
  const [selectedArranger, setSelectedArranger] = useState(null);
  const [showArrangerDropdown, setShowArrangerDropdown] = useState(false);
  const [searchingArranger, setSearchingArranger] = useState(false);
  const arrangerInputRef = useRef(null);
  const [arrangerDropdownPos, setArrangerDropdownPos] = useState(null);
  const getDropdownPosition = (inputRef, minWidth = 260) => {
    if (!inputRef?.current) return null;
    const rect = inputRef.current.getBoundingClientRect();
    const margin = 8;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const width = Math.min(
      Math.max(rect.width, minWidth),
      Math.max(180, viewportWidth - margin * 2),
    );
    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;
    /** Preferir debajo del campo; solo arriba si abajo no entra una lista mínima y hay hueco claro arriba. */
    const minBelowPx = 100;
    const placeAbove =
      spaceBelow < minBelowPx &&
      spaceAbove >= minBelowPx + 32 &&
      spaceAbove > spaceBelow + 16;
    const maxHeight = Math.max(
      100,
      placeAbove ? spaceAbove - margin - 8 : spaceBelow - margin - 8,
    );
    let left = rect.left;
    if (left + width > viewportWidth - margin) left = viewportWidth - margin - width;
    if (left < margin) left = margin;
    if (placeAbove) {
      return {
        left,
        width,
        maxHeight,
        bottom: viewportHeight - rect.top + 4,
      };
    }
    return {
      left,
      width,
      maxHeight,
      top: rect.bottom + 4,
    };
  };

  const debouncedSearchComposer = useDebouncedCallback(
    async (query) => {
      const trimmed = query.trim();
      if (trimmed.length < 2) {
        setComposerOptions([]);
        setSearchingComposer(false);
        setShowComposerDropdown(false);
        return;
      }

      let apellido = trimmed;
      let nombre = "";
      if (trimmed.includes(",")) {
        const parts = trimmed.split(",");
        apellido = parts[0].trim();
        nombre = parts[1]?.trim() || "";
      }

      try {
        let q = supabase
          .from("compositores")
          .select("id, apellido, nombre")
          .order("apellido")
          .limit(8);
        if (apellido) q = q.ilike("apellido", `${apellido}%`);
        if (nombre) q = q.ilike("nombre", `${nombre}%`);
        const { data, error } = await q;
        if (error) {
          console.error("Error buscando compositores:", error);
          setComposerOptions([]);
        } else {
          setComposerOptions(data || []);
        }
      } catch (e) {
        console.error("Error buscando compositores:", e);
        setComposerOptions([]);
      } finally {
        setSearchingComposer(false);
        setShowComposerDropdown(true);
      }
    },
    300,
  );

  const debouncedSearchArranger = useDebouncedCallback(
    async (query) => {
      const trimmed = query.trim();
      if (trimmed.length < 2) {
        setArrangerOptions([]);
        setSearchingArranger(false);
        setShowArrangerDropdown(false);
        return;
      }

      let apellido = trimmed;
      let nombre = "";
      if (trimmed.includes(",")) {
        const parts = trimmed.split(",");
        apellido = parts[0].trim();
        nombre = parts[1]?.trim() || "";
      }

      try {
        let q = supabase
          .from("compositores")
          .select("id, apellido, nombre")
          .order("apellido")
          .limit(8);
        if (apellido) q = q.ilike("apellido", `${apellido}%`);
        if (nombre) q = q.ilike("nombre", `${nombre}%`);
        const { data, error } = await q;
        if (error) {
          console.error("Error buscando arregladores:", error);
          setArrangerOptions([]);
        } else {
          setArrangerOptions(data || []);
        }
      } catch (e) {
        console.error("Error buscando arregladores:", e);
        setArrangerOptions([]);
      } finally {
        setSearchingArranger(false);
        setShowArrangerDropdown(true);
      }
    },
    300,
  );

  const debouncedSearchWorks = useDebouncedCallback(
    async (composerId, rawTitle) => {
      const clean = (rawTitle || "").trim();
      if (!composerId) {
        setWorkOptions([]);
        setIsNewWorkForComposer(false);
        setSearchingWork(false);
        setShowWorkDropdown(false);
        return;
      }
      try {
        let query = supabase
          .from("obras")
          .select(
            "id, titulo, duracion_segundos, instrumentacion, link_drive, link_youtube, observaciones, obras_compositores!inner(id_compositor, rol)",
          )
          .eq("obras_compositores.id_compositor", composerId)
          .eq("obras_compositores.rol", "compositor")
          .order("titulo")
          .limit(20);

        if (clean.length >= 2) {
          query = query.ilike("titulo", `%${clean}%`);
        }

        const { data, error } = await query;
        if (error) {
          console.warn("Error buscando obras del compositor:", error);
          setWorkOptions([]);
          setIsNewWorkForComposer(false);
          return;
        }
        const list = data || [];
        setWorkOptions(list);
        setIsNewWorkForComposer(!(list.length > 0 && clean.length >= 3));
        setShowWorkDropdown(true);
      } catch (e) {
        console.warn("Error buscando obras del compositor:", e);
        setWorkOptions([]);
        setIsNewWorkForComposer(false);
      } finally {
        setSearchingWork(false);
      }
    },
    400,
  );

  useEffect(() => {
    if (!showComposerDropdown) {
      setComposerDropdownPos(null);
      return undefined;
    }
    const updatePosition = () => setComposerDropdownPos(getDropdownPosition(composerInputRef, 260));
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [showComposerDropdown]);

  useEffect(() => {
    if (!showWorkDropdown) {
      setWorkDropdownPos(null);
      return undefined;
    }
    const updatePosition = () => setWorkDropdownPos(getDropdownPosition(workInputRef, 320));
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [showWorkDropdown]);

  useEffect(() => {
    if (!showArrangerDropdown) {
      setArrangerDropdownPos(null);
      return undefined;
    }
    const updatePosition = () => setArrangerDropdownPos(getDropdownPosition(arrangerInputRef, 260));
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [showArrangerDropdown]);

  const handleComposerChange = (e) => {
    const val = e.target.value;
    setComposerInput(val);
    setSelectedComposer(null);
    setSelectedWork(null);
    setSelectedArranger(null);
    setWorkOptions([]);
    setShowWorkDropdown(false);
    setIsNewWorkForComposer(false);
    if (val.trim().length >= MIN_SEARCH_LEN) {
      setSearchingComposer(true);
      debouncedSearchComposer(val);
    } else {
      setComposerOptions([]);
      setShowComposerDropdown(false);
    }
  };

  const handleComposerSelect = (comp) => {
    setSelectedComposer(comp);
    setComposerInput(`${comp.apellido}, ${comp.nombre}`);
    setShowComposerDropdown(false);
    setActiveComposerIndex(-1);
    setSelectedWork(null);
    setWorkOptions([]);
    setShowWorkDropdown(false);
    setIsNewWorkForComposer(false);
  };

  const handleQuickCreateComposerFromInput = async () => {
    const raw = composerInput.trim();
    if (!raw) return;

    let apellido = raw;
    let nombre = "";
    if (raw.includes(",")) {
      const parts = raw.split(",");
      apellido = parts[0].trim();
      nombre = parts[1]?.trim() || "";
    }
    if (!apellido) return;

    try {
      // Buscar si ya existe uno igual
      let qComp = supabase
        .from("compositores")
        .select("id, apellido, nombre")
        .eq("apellido", apellido)
        .limit(1);
      if (nombre) {
        qComp = qComp.eq("nombre", nombre);
      } else {
        qComp = qComp.is("nombre", null);
      }
      const { data: existing, error: findError } = await qComp;
      if (findError) {
        console.error("Error buscando compositor para creación rápida:", findError);
      }

      let comp = existing && existing.length > 0 ? existing[0] : null;
      if (!comp) {
        const payload = { apellido, nombre: nombre || null };
        const { data: newComp, error: insertError } = await supabase
          .from("compositores")
          .insert([payload])
          .select()
          .single();
        if (insertError) {
          console.error("Error creando compositor rápido:", insertError);
          return;
        }
        comp = newComp;
      }

      setSelectedComposer(comp);
      setComposerInput(`${comp.apellido}${comp.nombre ? `, ${comp.nombre}` : ""}`);
      setComposerOptions([]);
      setShowComposerDropdown(false);
    } catch (e) {
      console.error("Error en creación rápida de compositor:", e);
    }
  };

  const handleArrangerChange = (e) => {
    const val = e.target.value;
    setArrangerInput(val);
    setSelectedArranger(null);
    if (val.trim().length >= MIN_SEARCH_LEN) {
      setSearchingArranger(true);
      debouncedSearchArranger(val);
    } else {
      setArrangerOptions([]);
      setShowArrangerDropdown(false);
    }
  };

  const handleArrangerSelect = (comp) => {
    setSelectedArranger(comp);
    setArrangerInput(`${comp.apellido}, ${comp.nombre}`);
    setShowArrangerDropdown(false);
    setActiveArrangerIndex(-1);
  };

  useEffect(() => {
    if (!showComposerDropdown || composerOptions.length === 0) {
      setActiveComposerIndex(-1);
      return;
    }
    setActiveComposerIndex(0);
  }, [showComposerDropdown, composerOptions]);

  useEffect(() => {
    if (!showWorkDropdown || workOptions.length === 0) {
      setActiveWorkIndex(-1);
      return;
    }
    setActiveWorkIndex(0);
  }, [showWorkDropdown, workOptions]);

  useEffect(() => {
    if (!showArrangerDropdown || arrangerOptions.length === 0) {
      setActiveArrangerIndex(-1);
      return;
    }
    setActiveArrangerIndex(0);
  }, [showArrangerDropdown, arrangerOptions]);

  const handleInsertExistingWork = async (work) => {
    if (!isEditor || saving) return;
    if (!selectedComposer) return;

    setSaving(true);
    try {
      await addWorkToBlock(work.id, rep.id);

      setComposerInput("");
      setSelectedComposer(null);
      setComposerOptions([]);
      setShowComposerDropdown(false);
      setTitulo("");
      setInstrumentacion("");
      setDuracion("");
      setWorkOptions([]);
      setShowWorkDropdown(false);
      setSelectedWork(null);
      setArrangerInput("");
      setSelectedArranger(null);
      setArrangerOptions([]);
      setShowArrangerDropdown(false);
      setIsNewWorkForComposer(false);

      // No se abre el modal de follow-up porque la obra ya existe
      fetchFullRepertoire();
    } catch (e) {
      console.error("Error insertando obra existente:", e);
      alert("No se pudo insertar la obra seleccionada. Intenta nuevamente.");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!isEditor || saving) return;
    const composerText = composerInput.trim();
    const hasComposer = !!selectedComposer || !!composerText;

    if (!hasComposer || !titulo.trim()) {
      alert("Completa al menos Compositor y Título para crear la obra.");
      return;
    }

    setSaving(true);
    try {
      let composerId = selectedComposer?.id || null;
      let composerApellido = selectedComposer?.apellido || "";
      let composerNombre = selectedComposer?.nombre || "";

      if (selectedWork && composerId) {
        const insertedRepObra = await addWorkToBlock(selectedWork.id, rep.id);

        setComposerInput("");
        setSelectedComposer(null);
        setComposerOptions([]);
        setShowComposerDropdown(false);
        setTitulo("");
        setInstrumentacion("");
        setDuracion("");
        setWorkOptions([]);
        setShowWorkDropdown(false);
        setSelectedWork(null);
        setIsNewWorkForComposer(false);

        setQuickEntryFollowup({
          obraId: selectedWork.id,
          repertorioObraId: insertedRepObra?.id ?? null,
          titulo: selectedWork.titulo,
          composerLabel:
            composerApellido || composerNombre
              ? `${composerApellido}${composerNombre ? `, ${composerNombre}` : ""}`
              : "",
          link_drive: selectedWork.link_drive || "",
          link_youtube: selectedWork.link_youtube || "",
          observaciones: selectedWork.observaciones || "",
        estado: selectedWork.estado || "Solicitud",
        comentarios: selectedWork.comentarios || "",
          notas_especificas: "",
        });

        fetchFullRepertoire();
        return;
      }

      if (!composerId) {
        let apellido = composerText;
        let nombre = "";
        if (composerText.includes(",")) {
          const parts = composerText.split(",");
          apellido = parts[0].trim();
          nombre = parts[1]?.trim() || "";
        }
        if (!apellido) {
          throw new Error("El apellido del compositor es obligatorio.");
        }

        let qComp = supabase
          .from("compositores")
          .select("id, apellido, nombre")
          .eq("apellido", apellido)
          .limit(1);
        if (nombre) {
          qComp = qComp.eq("nombre", nombre);
        } else {
          qComp = qComp.is("nombre", null);
        }
        const { data: existing } = await qComp;

        if (existing && existing.length > 0) {
          composerId = existing[0].id;
          composerApellido = existing[0].apellido;
          composerNombre = existing[0].nombre;
        } else {
          const { data: newComp, error: compError } = await supabase
            .from("compositores")
            .insert([{ apellido, nombre }])
            .select()
            .single();
          if (compError) throw compError;
          composerId = newComp.id;
          composerApellido = newComp.apellido;
          composerNombre = newComp.nombre;
        }
      }

      const tituloHtml = `<p>${titulo}</p>`;
      const payload = {
        titulo: tituloHtml,
        duracion_segundos: inputToSeconds(duracion),
        instrumentacion: instrumentacion || null,
        estado: "Solicitud",
        id_usuario_carga: user?.id ?? null,
      };

      const { data: newWork, error: obraError } = await supabase
        .from("obras")
        .insert([payload])
        .select()
        .single();
      if (obraError) throw obraError;

      const newWorkId = newWork.id;

      const relaciones = [
        {
          id_obra: newWorkId,
          id_compositor: composerId,
          rol: "compositor",
        },
      ];
      if (selectedArranger?.id && selectedArranger.id !== composerId) {
        relaciones.push({
          id_obra: newWorkId,
          id_compositor: selectedArranger.id,
          rol: "arreglador",
        });
      }
      await supabase.from("obras_compositores").insert(relaciones);

      const insertedRepObra = await addWorkToBlock(newWorkId, rep.id);

      setComposerInput("");
      setSelectedComposer(null);
      setComposerOptions([]);
      setShowComposerDropdown(false);
      setTitulo("");
      setInstrumentacion("");
      setDuracion("");
      setWorkOptions([]);
      setShowWorkDropdown(false);
      setSelectedWork(null);
      setArrangerInput("");
      setSelectedArranger(null);
      setArrangerOptions([]);
      setShowArrangerDropdown(false);
      setIsNewWorkForComposer(false);

      setQuickEntryFollowup({
        obraId: newWorkId,
        repertorioObraId: insertedRepObra?.id ?? null,
        titulo: tituloHtml,
        composerLabel:
          composerApellido || composerNombre
            ? `${composerApellido}${composerNombre ? `, ${composerNombre}` : ""}`
            : "",
        link_drive: newWork.link_drive || "",
        link_youtube: newWork.link_youtube || "",
        observaciones: newWork.observaciones || "",
        estado: newWork.estado || "Solicitud",
        comentarios: newWork.comentarios || "",
        notas_especificas: "",
      });

      fetchFullRepertoire();
    } catch (e) {
      console.error("Error en creación rápida de obra:", e);
      alert("No se pudo crear la obra. Intenta nuevamente.");
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      if (showComposerDropdown || showWorkDropdown || showArrangerDropdown) {
        e.preventDefault();
        setShowComposerDropdown(false);
        setShowWorkDropdown(false);
        setShowArrangerDropdown(false);
      }
      return;
    }

    if (showComposerDropdown && composerOptions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveComposerIndex((prev) => (prev + 1) % composerOptions.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveComposerIndex((prev) =>
          prev <= 0 ? composerOptions.length - 1 : prev - 1,
        );
        return;
      }
    }
    if (showWorkDropdown && workOptions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveWorkIndex((prev) => (prev + 1) % workOptions.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveWorkIndex((prev) =>
          prev <= 0 ? workOptions.length - 1 : prev - 1,
        );
        return;
      }
    }
    if (showArrangerDropdown && arrangerOptions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveArrangerIndex((prev) => (prev + 1) % arrangerOptions.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveArrangerIndex((prev) =>
          prev <= 0 ? arrangerOptions.length - 1 : prev - 1,
        );
        return;
      }
    }

    if (e.key === "Enter") {
      e.preventDefault();
      if (showComposerDropdown) {
        if (composerOptions.length > 0) {
          const target = composerOptions[Math.max(0, activeComposerIndex)];
          if (target) handleComposerSelect(target);
          return;
        }
        if (composerInput.trim().length >= MIN_SEARCH_LEN) {
          handleQuickCreateComposerFromInput();
          return;
        }
      }
      if (showWorkDropdown && workOptions.length > 0) {
        const target = workOptions[Math.max(0, activeWorkIndex)];
        if (target) {
          const cleanTitle = (target.titulo || "").replace(/<[^>]*>?/gm, "") || "";
          setSelectedWork(target);
          setTitulo(cleanTitle);
          setShowWorkDropdown(false);
          setIsNewWorkForComposer(false);
          return;
        }
      }
      if (showArrangerDropdown && arrangerOptions.length > 0) {
        const target = arrangerOptions[Math.max(0, activeArrangerIndex)];
        if (target) {
          handleArrangerSelect(target);
          return;
        }
      }
      handleSubmit();
    }
  };

  return (
    <tr className="bg-white/80 border-t border-slate-200">
      <td className="p-1 text-center text-slate-300">
        <IconPlus size={12} />
      </td>
      <td className="p-1 text-center text-[10px] text-slate-400 font-bold">
        Nueva
      </td>
      <td className="p-1 text-center text-slate-300">+</td>
      <td className="min-w-0 p-1 align-middle">
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:gap-2">
          <div className="relative max-w-[42%] shrink-0 min-w-[7rem]">
            <input
              type="text"
              value={composerInput}
              onChange={handleComposerChange}
              onKeyDown={handleKeyDown}
              placeholder="Compositor (Apellido, Nombre)"
              ref={composerInputRef}
              className="w-full px-2 py-1 text-[11px] border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-fixed-indigo-500 focus:border-fixed-indigo-500 bg-white"
            />
            {searchingComposer && (
              <div className="absolute right-1 top-1.5">
                <IconLoader size={12} className="animate-spin text-slate-400" />
              </div>
            )}
            {showComposerDropdown &&
              composerDropdownPos &&
              (composerOptions.length > 0 || composerInput.trim().length >= 2) &&
              createPortal(
                <div
                  className="fixed z-[13000] bg-white border border-slate-200 rounded shadow-lg overflow-y-auto text-xs min-w-[220px]"
                  style={{
                    left: composerDropdownPos.left,
                    width: composerDropdownPos.width,
                    maxHeight: composerDropdownPos.maxHeight,
                    ...(composerDropdownPos.top != null
                      ? { top: composerDropdownPos.top, bottom: "auto" }
                      : { bottom: composerDropdownPos.bottom, top: "auto" }),
                  }}
                >
                  {composerOptions.map((c, index) => (
                    <div
                      key={c.id}
                      className={`px-2 py-1 cursor-pointer flex justify-between items-center ${index === activeComposerIndex ? "bg-fixed-indigo-50" : "hover:bg-fixed-indigo-50"}`}
                      onMouseEnter={() => setActiveComposerIndex(index)}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleComposerSelect(c);
                      }}
                    >
                      <span className="text-[11px] text-slate-700">
                        {c.apellido}, {c.nombre}
                      </span>
                    </div>
                  ))}
                  {composerOptions.length === 0 && composerInput.trim().length >= 2 && (
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleQuickCreateComposerFromInput();
                      }}
                      className="w-full text-left px-2 py-1 border-t border-slate-100 text-fixed-indigo-600 text-[10px] font-semibold hover:bg-fixed-indigo-50"
                    >
                      + Crear "{composerInput.trim()}"
                    </button>
                  )}
                </div>,
                document.body,
              )}
          </div>
          <div className="relative flex min-w-0 flex-1 flex-col gap-1">
            <input
              type="text"
              value={titulo}
              onChange={(e) => {
                const val = e.target.value;
                setTitulo(val);
                setSelectedWork(null);
                if (selectedComposer && val.trim().length >= MIN_SEARCH_LEN) {
                  setSearchingWork(true);
                  debouncedSearchWorks(selectedComposer.id, val);
                } else {
                  setWorkOptions([]);
                  setShowWorkDropdown(false);
                  setIsNewWorkForComposer(false);
                }
              }}
              onFocus={() => {
                if (selectedComposer) {
                  setSearchingWork(true);
                  debouncedSearchWorks(selectedComposer.id, "");
                }
              }}
              onKeyDown={handleKeyDown}
              placeholder="Título de la obra"
              ref={workInputRef}
              className="w-full px-2 py-1 text-[11px] border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-fixed-indigo-500 focus:border-fixed-indigo-500 bg-white"
            />
            {selectedComposer && titulo.trim().length >= MIN_SEARCH_LEN && isNewWorkForComposer && (
              <span className="inline-flex items-center gap-1 text-[9px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5 w-fit">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Nueva obra para este compositor
              </span>
            )}
            {showWorkDropdown &&
              selectedComposer &&
              workDropdownPos &&
              (workOptions.length > 0 || titulo.trim().length >= MIN_SEARCH_LEN) &&
              createPortal(
                <div
                  className="fixed z-[13000] bg-white border border-slate-200 rounded shadow-lg overflow-y-auto text-xs"
                  style={{
                    left: workDropdownPos.left,
                    width: workDropdownPos.width,
                    maxHeight: workDropdownPos.maxHeight,
                    ...(workDropdownPos.top != null
                      ? { top: workDropdownPos.top, bottom: "auto" }
                      : { bottom: workDropdownPos.bottom, top: "auto" }),
                  }}
                >
                  <div className="px-2 py-1 border-b border-slate-100 text-[10px] font-bold uppercase text-slate-500 flex items-center justify-between">
                    <span>Obras del archivo</span>
                    {searchingWork && (
                      <IconLoader size={10} className="animate-spin text-slate-400" />
                    )}
                  </div>
                  {workOptions.map((w, index) => {
                    const cleanTitle = (w.titulo || "").replace(/<[^>]*>?/gm, "") || "";
                    return (
                      <div
                        key={w.id}
                        className={`w-full px-2 py-1.5 flex items-center gap-2 ${index === activeWorkIndex ? "bg-fixed-indigo-50" : "hover:bg-fixed-indigo-50"}`}
                        onMouseEnter={() => setActiveWorkIndex(index)}
                      >
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            title="Copiar título en la fila (crear nueva obra)"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setSelectedWork(w);
                              setTitulo(cleanTitle);
                              setShowWorkDropdown(false);
                              setIsNewWorkForComposer(false);
                            }}
                            className="p-1 rounded-full text-slate-400 hover:text-fixed-indigo-600 hover:bg-fixed-indigo-50"
                          >
                            <IconCopy size={12} />
                          </button>
                          <button
                            type="button"
                            title="Insertar esta obra en el bloque"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              handleInsertExistingWork(w);
                            }}
                            className="p-1 rounded-full text-fixed-indigo-600 hover:text-white hover:bg-fixed-indigo-600 bg-fixed-indigo-50"
                          >
                            <IconPlus size={12} />
                          </button>
                        </div>
                        <button
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleInsertExistingWork(w);
                          }}
                          className="flex-1 text-left flex flex-col gap-0.5"
                        >
                          <span
                            className="font-semibold text-[11px] text-slate-800 truncate"
                            title={cleanTitle}
                          >
                            {cleanTitle}
                          </span>
                          <div className="flex items-center justify-between text-[10px] text-slate-500">
                            <span className="font-mono">
                              {w.instrumentacion ||
                                calculateInstrumentation(w.obras_particellas || []) ||
                                "-"}
                            </span>
                            <span className="font-mono">
                              {formatSecondsToTime(w.duracion_segundos || 0)}
                            </span>
                          </div>
                        </button>
                      </div>
                    );
                  })}
                  {workOptions.length === 0 && titulo.trim().length >= MIN_SEARCH_LEN && (
                    <div className="px-2 py-1 text-[10px] text-slate-400 border-t border-slate-100">
                      Sin coincidencias en el archivo para este compositor.
                    </div>
                  )}
                </div>,
                document.body,
              )}
          </div>
        </div>
      </td>
      {definitionMode && <td className="p-1 bg-slate-50/40" aria-hidden />}
      <td className="p-1 text-center">
        <input
          type="text"
          value={instrumentacion}
          onChange={(e) => setInstrumentacion(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Instr."
          className="w-full px-1.5 py-1 text-[10px] border border-slate-300 rounded font-mono text-slate-600 focus:outline-none focus:ring-1 focus:ring-fixed-indigo-500 focus:border-fixed-indigo-500 bg-white"
        />
      </td>
      <td className="p-1 text-center">
        <input
          type="text"
          value={duracion}
          onChange={(e) => setDuracion(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="00:00"
          className="w-full px-1.5 py-1 text-[10px] border border-slate-300 rounded font-mono text-slate-700 text-center focus:outline-none focus:ring-1 focus:ring-fixed-indigo-500 focus:border-fixed-indigo-500 bg-white"
        />
      </td>
      {/* Columna Solista (se deja vacía en la fila rápida) */}
      <td className="p-1" />
      {/* Columna Arr.: Arreglador opcional */}
      <td className="p-1 align-middle">
        <div className="relative">
          <input
            type="text"
            value={arrangerInput}
            onChange={handleArrangerChange}
            onKeyDown={handleKeyDown}
            placeholder="Arreglador (Opcional)"
            ref={arrangerInputRef}
            className="w-full px-2 py-1 text-[11px] border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-fixed-indigo-500 focus:border-fixed-indigo-500 bg-white"
          />
          {searchingArranger && (
            <div className="absolute right-1 top-1.5">
              <IconLoader size={12} className="animate-spin text-slate-400" />
            </div>
          )}
          {showArrangerDropdown &&
            arrangerDropdownPos &&
            (arrangerOptions.length > 0 || arrangerInput.trim().length >= 2) &&
            createPortal(
                <div
                  className="fixed z-[13000] bg-white border border-slate-200 rounded shadow-lg overflow-y-auto text-xs min-w-[220px]"
                  style={{
                    left: arrangerDropdownPos.left,
                    width: arrangerDropdownPos.width,
                    maxHeight: arrangerDropdownPos.maxHeight,
                    ...(arrangerDropdownPos.top != null
                      ? { top: arrangerDropdownPos.top, bottom: "auto" }
                      : { bottom: arrangerDropdownPos.bottom, top: "auto" }),
                  }}
                >
                {arrangerOptions.map((c, index) => (
                  <div
                    key={c.id}
                    className={`px-2 py-1 cursor-pointer flex justify-between items-center ${index === activeArrangerIndex ? "bg-fixed-indigo-50" : "hover:bg-fixed-indigo-50"}`}
                    onMouseEnter={() => setActiveArrangerIndex(index)}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleArrangerSelect(c);
                    }}
                  >
                    <span className="text-[11px] text-slate-700">
                      {c.apellido}, {c.nombre}
                    </span>
                  </div>
                ))}
              </div>,
              document.body,
            )}
        </div>
      </td>
      <td className="p-1" />
      <td className="p-1" />
      <td className="p-1 text-right">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={saving}
          className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold bg-fixed-indigo-600 text-white hover:bg-fixed-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
        >
          {saving ? <IconLoader size={12} className="animate-spin" /> : <IconCheck size={12} />}
          Guardar
        </button>
      </td>
      <td className="p-1" />
    </tr>
  );
}

export default function RepertoireManager({
  supabase,
  programId,
  giraId,
  initialData = [],
  isCompact = false,
  readOnly = undefined,
  onSyncArco,
}) {
  const LIBRARY_PAGE_SIZE = 80;
  const { user, isEditor: isGlobalEditor, isAdmin } = useAuth();

  const isEditor = readOnly !== undefined ? !readOnly : isGlobalEditor;
  // Notas internas (post-it) visibles para quien puede editar en general, aunque la vista esté en readOnly
  const canSeeInternalNotes = isGlobalEditor || isAdmin;

  const [repertorios, setRepertorios] = useState(initialData);
  const [musicians, setMusicians] = useState([]);

  const [seatingMap, setSeatingMap] = useState({});
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [syncingDrive, setSyncingDrive] = useState(false);
  const [editingBlock, setEditingBlock] = useState({ id: null, nombre: "" });
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditWorkModalOpen, setIsEditWorkModalOpen] = useState(false);
  const [activeRepertorioId, setActiveRepertorioId] = useState(null);
  const [activeWorkItem, setActiveWorkItem] = useState(null);
  const [worksLibrary, setWorksLibrary] = useState([]);
  const [loadingLibrary, setLoadingLibrary] = useState(false);
  const [libraryPage, setLibraryPage] = useState(0);
  const [libraryHasMore, setLibraryHasMore] = useState(false);
  const [hasSearchedLibrary, setHasSearchedLibrary] = useState(false);
  const [libraryError, setLibraryError] = useState(null);
  const [observacionesPreviewWork, setObservacionesPreviewWork] = useState(null);
  const [instrumentList, setInstrumentList] = useState([]);
  const [commentsState, setCommentsState] = useState(null);
  const [filters, setFilters] = useState({
    compositor: "",
    titulo: "",
    arreglador: "",
  });
  const [debouncedFilters, setDebouncedFilters] = useState({
    compositor: "",
    titulo: "",
    arreglador: "",
  });
  const [selectedInstruments, setSelectedInstruments] = useState([]);
  const [limitToSelected, setLimitToSelected] = useState(false);
  const [workFormData, setWorkFormData] = useState({});
  const [showAddModalInstrFilter, setShowAddModalInstrFilter] = useState(false);
  const [addModalInstrFilters, setAddModalInstrFilters] = useState([]);
  const [addModalStringsFilter, setAddModalStringsFilter] = useState("all");
  const [addModalStrictMode, setAddModalStrictMode] = useState(false);
  const addModalInstrFilterAnchorRef = useRef(null);
  const [savingPosition, setSavingPosition] = useState(false);
  const [dragOverId, setDragOverId] = useState(null);
  const [activeDragId, setActiveDragId] = useState(null);
  const [quickEntryFollowup, setQuickEntryFollowup] = useState(null);
  const [savingQuickLinks, setSavingQuickLinks] = useState(false);
  // --- CALCULAR MAPA DE ARCOS DISPONIBLES ---
  const arcosByWork = useMemo(() => {
    const map = {};
    repertorios.forEach((rep) => {
      rep.repertorio_obras?.forEach((item) => {
        const workId = item.obras?.id ?? item.id_obra;
        if (workId == null) return;
        const list = item.obras?.obras_arcos;
        const arr = Array.isArray(list) ? list : list != null ? [list] : [];
        map[workId] = arr;
      });
    });
    return map;
  }, [repertorios]);
  const userInstrumentId = useMemo(() => {
    if (!user || musicians.length === 0) return null;
    const me = musicians.find((m) => m.id === user.id);
    return me?.id_instr;
  }, [musicians, user]);

  useEffect(() => {
    if (!initialData.length && programId) fetchFullRepertoire();
    else if (initialData.length) {
      setRepertorios(
        initialData.map((r) => ({
          ...r,
          repertorio_obras:
            r.repertorio_obras?.sort((a, b) => a.orden - b.orden) || [],
        })),
      );
      fetchFullRepertoire();
    }
    if (musicians.length === 0) fetchMusicians();

    // CALL THE NEW FETCH
    fetchSeating();
  }, [programId, user?.id]);
  useEffect(() => {
    if (isAddModalOpen || isEditWorkModalOpen) {
      if (instrumentList.length === 0) fetchInstruments();
    }
  }, [isAddModalOpen, isEditWorkModalOpen]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedFilters(filters);
    }, 180);
    return () => clearTimeout(timer);
  }, [filters]);

  useEffect(() => {
    if (!isAddModalOpen) return;
    setWorksLibrary([]);
    setLibraryPage(0);
    setLibraryHasMore(false);
    setHasSearchedLibrary(false);
    setLibraryError(null);
  }, [isAddModalOpen]);

  const fetchMusicians = async () => {
    const { data } = await supabase
      .from("integrantes")
      .select("id, nombre, apellido, id_instr, instrumentos(instrumento)")
      .order("apellido");
    if (data) setMusicians(data);
  };

  const fetchSeating = async () => {
    if (!programId) return;

    const { data: containers } = await supabase
      .from("seating_contenedores")
      .select("id, nombre")
      .eq("id_programa", programId);

    const { data: items } = await supabase
      .from("seating_contenedores_items")
      .select("id_contenedor, id_musico, orden, atril_num, lado")
      .in("id_contenedor", containers?.map((c) => c.id) || []);

    const { data: asigns } = await supabase
      .from("seating_asignaciones")
      .select("id_obra, id_particella, id_contenedor, id_musicos_asignados")
      .eq("id_programa", programId);

    setAssignments(asigns || []);

    const newMap = {};
    items?.forEach((item) => {
      if (item.id_musico) {
        const container = containers.find((c) => c.id === item.id_contenedor);

        const { atril_num: deskNumber, lado } = seatingItemMatrixPosition(
          item,
          0,
        );
        const deskSuffix = lado === 0 ? "a" : "b";

        newMap[String(item.id_musico)] = {
          containerId: item.id_contenedor,
          containerName: container?.nombre,
          desk: `${deskNumber ?? 1}${deskSuffix}`, // Resultado: "1a", "1b", etc.
        };
      }
    });
    setSeatingMap(newMap);
  };
  const MultiSoloistSelect = ({
    selectedIds = [],
    musicians,
    onAdd,
    onRemove,
    isEditor,
  }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState("");
    const wrapperRef = useRef(null);

    // Filtrar músicos seleccionados para mostrar los chips
    const selectedMusicians = musicians.filter((m) =>
      selectedIds?.includes(m.id),
    );

    // Filtrar opciones para el desplegable (excluyendo los ya seleccionados)
    const availableOptions = musicians.filter(
      (m) =>
        !selectedIds?.includes(m.id) &&
        `${m.apellido}, ${m.nombre}`
          .toLowerCase()
          .includes(search.toLowerCase()),
    );

    return (
      <div className="flex flex-wrap gap-1 items-center p-1" ref={wrapperRef}>
        {/* Renderizado de Chips */}
        {selectedMusicians.map((m) => (
          <div
            key={m.id}
            className="flex items-center gap-1 bg-fixed-indigo-100 text-fixed-indigo-700 px-1.5 py-0.5 rounded-full text-[9px] font-bold border border-fixed-indigo-200"
          >
            {/* Cambiamos m.apellido por m.apellido, m.nombre y aumentamos el max-w */}
            <span className="truncate max-w-[120px]">
              {m.apellido}, {m.nombre}
            </span>
            {isEditor && (
              <button
                onClick={() => onRemove(m.id)}
                className="hover:text-red-600 transition-colors"
              >
                <IconX size={10} strokeWidth={3} />
              </button>
            )}
          </div>
        ))}
        {/* Botón de Añadir / Buscador */}
        {isEditor && (
          <div className="relative">
            {!isOpen ? (
              <button
                onClick={() => setIsOpen(true)}
                className="text-[10px] text-slate-400 hover:text-fixed-indigo-600 p-1 italic"
              >
                + Añadir
              </button>
            ) : (
              <div className="absolute top-0 left-0 w-64 bg-white border border-fixed-indigo-200 shadow-xl rounded z-50">
                <input
                  type="text"
                  autoFocus
                  placeholder="Buscar..."
                  className="w-full p-2 text-xs border-b outline-none"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onBlur={() => setTimeout(() => setIsOpen(false), 200)}
                />
                <div className="max-h-40 overflow-y-auto">
                  {availableOptions.map((m) => (
                    <div
                      key={m.id}
                      onClick={() => {
                        onAdd(m.id);
                        setSearch("");
                        setIsOpen(false);
                      }}
                      className="p-2 text-xs cursor-pointer hover:bg-fixed-indigo-50 flex justify-between"
                    >
                      <span>
                        {m.apellido}, {m.nombre}
                      </span>
                      <span className="text-[9px] text-slate-400">
                        {m.instrumentos?.instrumento}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };
  const fetchInstruments = async () => {
    const { data } = await supabase
      .from("instrumentos")
      .select("id, instrumento")
      .order("id");
    if (data) setInstrumentList(data);
  };

  // src/components/repertoire/RepertoireManager.jsx

  const fetchFullRepertoire = async () => {
    if (repertorios.length === 0) setLoading(true);
    const { data: reps, error } = await supabase
      .from("programas_repertorios")
      .select(
        `*, repertorio_obras (
          id, 
          orden, 
          notas_especificas, 
          ids_solistas,
          google_drive_shortcut_id, 
          excluir, 
          id_arco_seleccionado,
          duracion_segundos_concierto,
          obras (
              id, titulo, duracion_segundos, estado, link_drive, link_youtube, anio_composicion, instrumentacion, observaciones, comentarios,
              obras_arcos (id, nombre, link, descripcion, id_drive_folder),
              compositores (id, apellido, nombre), 
              obras_compositores (rol, compositores(id, apellido, nombre)),
          obras_particellas (id, nombre_archivo, nota_organico, id_instrumento, url_archivo, es_solista, instrumentos (instrumento, abreviatura))
          )
      )`,
      )
      .eq("id_programa", programId)
      .order("orden", { ascending: true });

    if (error) {
      console.error("Error al cargar repertorio:", error);
      setLoading(false);
      return;
    }

    setRepertorios(
      reps.map((r) => ({
        ...r,
        repertorio_obras:
          r.repertorio_obras?.sort((a, b) => a.orden - b.orden) || [],
      })),
    );
    setLoading(false);
  };

  const hasActiveInstrFilter =
    addModalInstrFilters.length > 0 ||
    addModalStringsFilter !== "all" ||
    addModalStrictMode;

  const fetchLibrary = async ({ page = 0, append = false } = {}) => {
    setLoadingLibrary(true);
    setLibraryError(null);
    const composerFilter = normalizeSearchText(debouncedFilters.compositor);
    const arrangerFilter = normalizeSearchText(debouncedFilters.arreglador);
    const useBroadFetch =
      composerFilter.length >= 2 ||
      arrangerFilter.length >= 2 ||
      hasActiveInstrFilter;
    const from = page * LIBRARY_PAGE_SIZE;
    const to = from + LIBRARY_PAGE_SIZE - 1;
    let query = supabase
      .from("obras")
      .select(
        `*, obras_compositores (rol, compositores (apellido, nombre)), obras_palabras_clave (palabras_clave (tag)), obras_particellas (nombre_archivo, nota_organico, es_solista, instrumentos (instrumento, abreviatura))`,
      )
      .order("titulo");

    if (useBroadFetch) {
      // Para compositor/arreglador, necesitamos una base amplia para que el filtro local funcione correctamente.
      query = query.range(0, 1999);
    } else {
      query = query.range(from, to);
    }

    const tituloFilter = normalizeSearchText(debouncedFilters.titulo);
    if (tituloFilter.length >= 2) {
      query = query.ilike("titulo", `%${debouncedFilters.titulo.trim()}%`);
    }

    const { data, error } = await query;
    if (error) {
      setLibraryError(error.message || "No se pudo cargar la biblioteca de obras.");
      setLoadingLibrary(false);
      return;
    }
    const mapped = (data || []).map((w) => ({
      ...w,
      compositor_full: getComposers(w),
      arreglador_full: getArranger(w),
      titulo_plain: normalizeSearchText(w.titulo),
      compositor_plain: normalizeSearchText(getComposers(w)),
      arreglador_plain: normalizeSearchText(getArranger(w)),
    }));
    setWorksLibrary((prev) => (append ? [...prev, ...mapped] : mapped));
    setLibraryPage(page);
    setLibraryHasMore(!useBroadFetch && mapped.length === LIBRARY_PAGE_SIZE);
    setHasSearchedLibrary(true);
    setLoadingLibrary(false);
  };

  const autoSyncDrive = async () => {
    setSyncingDrive(true);
    try {
      await supabase.functions.invoke("manage-drive", {
        body: {
          action: "sync_repertoire_shortcuts",
          programId: programId || giraId,
        },
      });
    } catch (err) {
      console.error(err);
    } finally {
      setSyncingDrive(false);
    }
  };

  const handleWorkSaved = async (savedWorkId, isNew = false) => {
    if (isNew && activeRepertorioId) {
      await addWorkToBlock(savedWorkId, activeRepertorioId);
      if (isAddModalOpen) setIsAddModalOpen(false);
    }
    fetchFullRepertoire();
    if (!isNew) {
      autoSyncDrive();
    }
  };

  const openEditModal = (item) => {
    setActiveWorkItem(item);
    setWorkFormData({ ...item.obras, id: item.obras.id });
    setIsEditWorkModalOpen(true);
  };

  const openCreateModal = () => {
    setWorkFormData({
      id: null,
      titulo: "",
      duracion_segundos: 0,
      link_drive: "",
      link_youtube: "",
      estado: "Solicitud",
    });
    setIsEditWorkModalOpen(true);
  };

  const startEditBlock = (rep) => {
    setEditingBlock({ id: rep.id, nombre: rep.nombre });
  };
  const saveBlockName = async () => {
    if (!editingBlock.nombre.trim()) return;
    setRepertorios(
      repertorios.map((r) =>
        r.id === editingBlock.id ? { ...r, nombre: editingBlock.nombre } : r,
      ),
    );
    await supabase
      .from("programas_repertorios")
      .update({ nombre: editingBlock.nombre })
      .eq("id", editingBlock.id);
    setEditingBlock({ id: null, nombre: "" });
  };

  const moveWork = async (repertorioId, workId, direction) => {
    if (!isEditor) return;
    const repIndex = repertorios.findIndex((r) => r.id === repertorioId);
    if (repIndex === -1) return;
    const currentRep = repertorios[repIndex];
    const obras = [...(currentRep.repertorio_obras || [])];
    if (obras.length === 0) return;
    const workIndex = obras.findIndex((o) => o.id === workId);
    if (workIndex === -1) return;
    const targetIndex = workIndex + direction;
    if (targetIndex < 0 || targetIndex >= obras.length) return;
    const itemA = obras[workIndex];
    const itemB = obras[targetIndex];
    [itemA.orden, itemB.orden] = [itemB.orden, itemA.orden];
    [obras[workIndex], obras[targetIndex]] = [itemB, itemA];
    const newRepertorios = [...repertorios];
    newRepertorios[repIndex].repertorio_obras = obras;
    setRepertorios(newRepertorios);
    await supabase
      .from("repertorio_obras")
      .update({ orden: itemA.orden })
      .eq("id", itemA.id);
    await supabase
      .from("repertorio_obras")
      .update({ orden: itemB.orden })
      .eq("id", itemB.id);
    autoSyncDrive();
  };

  const addWorkToBlock = async (workId, targetRepertorioId = null) => {
    const repId = targetRepertorioId || activeRepertorioId;
    if (!repId) return;

    const currentRep = repertorios.find((r) => r.id === repId);
    const maxOrder =
      currentRep?.repertorio_obras?.reduce(
        (max, o) => (o.orden > max ? o.orden : max),
        0,
      ) || 0;

    const { data: insertedRows, error } = await supabase
      .from("repertorio_obras")
      .insert([{ id_repertorio: repId, id_obra: workId, orden: maxOrder + 1 }])
      .select();

    if (error) {
      console.error("Error añadiendo obra al bloque:", error);
    }
    const inserted = insertedRows?.[0] || null;

    if (isAddModalOpen && !targetRepertorioId) {
      setIsAddModalOpen(false);
      fetchFullRepertoire();
    }
    autoSyncDrive();
    return inserted;
  };

  // --- ELIMINAR OBRA (CON LIMPIEZA DE SHORTCUTS ROBUSTA) ---
  const removeWork = async (itemId) => {
    if (!confirm("¿Eliminar esta obra del bloque de repertorio?")) return;

    // Buscar la obra para obtener su título (necesario para borrar el shortcut por nombre)
    let workTitle = null;
    repertorios.forEach((rep) => {
      const found = rep.repertorio_obras?.find((o) => o.id === itemId);
      if (found && found.obras) {
        workTitle = found.obras.titulo;
      }
    });

    try {
      setLoading(true);

      // 1. Llamar a Edge Function para limpiar shortcuts asociados a este título en la carpeta de arcos
      if (workTitle) {
        await supabase.functions.invoke("manage-drive", {
          body: {
            action: "delete_work_shortcuts",
            programId: programId || giraId,
            obraTitulo: workTitle,
          },
        });
      }

      // 2. Borrar registro de BD
      await supabase.from("repertorio_obras").delete().eq("id", itemId);

      // 3. Actualizar UI
      fetchFullRepertoire();
    } catch (error) {
      console.error("Error al eliminar obra:", error);
      alert("Error al eliminar obra.");
    } finally {
      setLoading(false);
    }
  };
  const addRepertoireBlock = async () => {
    const nombre = prompt("Nombre del bloque:", "Nuevo Bloque");
    if (!nombre) return;
    await supabase
      .from("programas_repertorios")
      .insert([
        { id_programa: programId, nombre, orden: repertorios.length + 1 },
      ]);
    fetchFullRepertoire();
  };

  const deleteRepertoireBlock = async (id) => {
    if (
      !confirm(
        "¿Eliminar bloque? Se borrarán las obras del bloque y su carpeta en Drive.",
      )
    ) {
      return;
    }
    setLoading(true);
    try {
      await deleteRepertoireBlockWithDrive(supabase, id);
      fetchFullRepertoire();
      autoSyncDrive();
    } catch (err) {
      console.error("Error eliminando bloque:", err);
      alert(`Error: ${err.message || "No se pudo eliminar el bloque."}`);
    } finally {
      setLoading(false);
    }
  };

  const updateWorkDetail = async (itemId, field, value) => {
    setRepertorios(
      repertorios.map((r) => ({
        ...r,
        repertorio_obras: r.repertorio_obras.map((o) =>
          o.id === itemId ? { ...o, [field]: value } : o,
        ),
      })),
    );
    await supabase
      .from("repertorio_obras")
      .update({ [field]: value })
      .eq("id", itemId);
    if (field === "ids_solistas" && Array.isArray(value) && giraId) {
      try {
        for (const solistId of value) {
          await supabase.from("giras_integrantes").upsert(
            {
              id_gira: giraId,
              id_integrante: solistId,
              rol: "solista",
              estado: "confirmado",
            },
            { onConflict: "id_gira, id_integrante" },
          );
        }
      } catch (e) {
        console.error("Error al sincronizar plantel:", e);
      }
    }
  };

  const handleQuickLinksSave = async () => {
    if (!quickEntryFollowup) return;
    const {
      obraId,
      repertorioObraId,
      link_drive,
      link_youtube,
      observaciones,
      notas_especificas,
      estado,
      comentarios,
    } = quickEntryFollowup;

    setSavingQuickLinks(true);
    try {
      if (obraId) {
        await supabase
          .from("obras")
          .update({
            link_drive: (link_drive || "").trim() || null,
            link_youtube: (link_youtube || "").trim() || null,
            observaciones: observaciones || null,
            estado: estado || null,
            comentarios: comentarios || null,
          })
          .eq("id", obraId);
      }
      if (repertorioObraId) {
        await supabase
          .from("repertorio_obras")
          .update({
            notas_especificas: notas_especificas || null,
          })
          .eq("id", repertorioObraId);
      }
      setQuickEntryFollowup(null);
      fetchFullRepertoire();
    } catch (e) {
      console.error("Error guardando enlaces rápidos:", e);
      alert("Error al guardar los enlaces rápidos.");
    } finally {
      setSavingQuickLinks(false);
    }
  };

  const getComposers = (obra) =>
    obra.obras_compositores?.length > 0
      ? obra.obras_compositores
          .filter((oc) => !oc.rol || oc.rol === "compositor")
          .map(
            (oc) => `${oc.compositores?.apellido}, ${oc.compositores?.nombre}`,
          )
          .join(" / ")
      : obra.compositores
        ? `${obra.compositores.apellido}, ${obra.compositores.nombre}`
        : "Anónimo";

  /** Lista { apellido, nombre } por compositor (p. ej. celda escritorio en dos líneas). */
  const getComposersNameParts = (obra) => {
    if (obra.obras_compositores?.length > 0) {
      return obra.obras_compositores
        .filter((oc) => !oc.rol || oc.rol === "compositor")
        .map((oc) => ({
          apellido: oc.compositores?.apellido ?? "",
          nombre: oc.compositores?.nombre ?? "",
        }));
    }
    if (obra.compositores) {
      return [
        {
          apellido: obra.compositores.apellido ?? "",
          nombre: obra.compositores.nombre ?? "",
        },
      ];
    }
    return [{ apellido: "Anónimo", nombre: "" }];
  };
  const getArranger = (obra) => {
    const arr = obra.obras_compositores?.find((oc) => oc.rol === "arreglador");
    return arr
      ? `${arr.compositores.apellido}, ${arr.compositores.nombre}`
      : "-";
  };
  // --- LÓGICA PARA IDENTIFICAR INSTRUMENTOS DE CUERDA ---
  const isStringInstrument = useMemo(() => {
    if (!user || musicians.length === 0) return false;
    const me = musicians.find((m) => m.id === user.id);
    const instr = me?.instrumentos?.instrumento?.toLowerCase() || "";
    // Detectamos si el nombre del instrumento contiene palabras clave de cuerdas
    return [
      "violín",
      "violin",
      "viola",
      "violoncello",
      "cello",
      "contrabajo",
    ].some((s) => instr.includes(s));
  }, [musicians, user]);

  const isTourStarted = !!giraId;
  const getMyPartUrl = (obra) => {
    if (!user || !assignments.length) return null;

    const userId = String(user.id);
    const mySeating = seatingMap[userId];

    const assignment = assignments.find((a) => {
      const matchObra = String(a.id_obra) === String(obra.id);
      if (!matchObra) return false;
      const matchUser = a.id_musicos_asignados?.some(
        (id) => String(id) === userId,
      );
      const matchContainer =
        mySeating?.containerId &&
        String(a.id_contenedor) === String(mySeating.containerId);
      return matchUser || matchContainer;
    });

    if (!assignment) return null;

    const myPart = obra.obras_particellas?.find(
      (p) => String(p.id) === String(assignment.id_particella),
    );

    if (!myPart) return null;

    let url = myPart.url_archivo;
    try {
      if (url?.startsWith("[")) url = JSON.parse(url)[0]?.url;
    } catch (e) {}

    return { url, name: myPart.nombre_archivo };
  };
  const renderMyPartBadge = (obra) => {
    const isDebugWork = true;

    if (!user || !assignments.length) {
      if (isDebugWork && !user)
        if (isDebugWork && !assignments.length)
          //console.log(`DEBUG BADGE [${obra.titulo}]: No hay user`);
          //console.log(`DEBUG BADGE [${obra.titulo}]: No hay assignments`);
          return null;
    }

    const userId = String(user.id);
    const mySeating = seatingMap[userId];

    const assignment = assignments.find((a) => {
      const matchObra = String(a.id_obra) === String(obra.id);
      if (!matchObra) return false;

      const matchUser = a.id_musicos_asignados?.some(
        (id) => String(id) === userId,
      );

      const matchContainer =
        mySeating?.containerId &&
        String(a.id_contenedor) === String(mySeating.containerId);

      return matchUser || matchContainer;
    });

    if (!assignment) return null;

    const myPart = obra.obras_particellas?.find(
      (p) => String(p.id) === String(assignment.id_particella),
    );

    if (!myPart) {
      return null;
    }

    const label = isStringInstrument
      ? "𝄞"
      : (myPart.nombre_archivo || "Parte").replace(/\.[^/.]+$/, "");
    let url = myPart.url_archivo;
    try {
      if (url?.startsWith("[")) url = JSON.parse(url)[0]?.url;
    } catch (e) {}

    const isGlyph = label === "𝄞";

    return (
      <a
        href={url || "#"}
        target="_blank"
        rel="noreferrer"
        onClick={(e) => !url && e.preventDefault()}
        className={`mt-1 inline-flex items-center gap-1 rounded border transition-all shadow-sm group w-fit ${
          isGlyph ? "px-1.5 py-0 min-w-[22px] justify-center" : "px-2 py-0.5"
        } ${
          url
            ? "bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-600 hover:text-white"
            : "bg-slate-100 text-slate-400 border-slate-200 cursor-help"
        }`}
        title={url ? `Abrir: ${myPart.nombre_archivo}` : "Archivo pendiente"}
      >
        {!isGlyph && (
          <IconDrive
            size={10}
            className={
              url ? "text-emerald-400 group-hover:text-white" : "opacity-50"
            }
          />
        )}
        <span
          className={`font-black uppercase tracking-tight ${isGlyph ? "text-[12px]" : "text-[9px]"}`}
        >
          {label}
        </span>
      </a>
    );
  };
  const getEstadoRowBgClass = (estado) => {
    const e = estado || "Oficial";
    switch (e) {
      case "Informativo":
        return "bg-blue-50/40 hover:bg-blue-50/70";
      case "Solicitud":
        return "bg-amber-50/45 hover:bg-amber-50/70";
      case "Para arreglar":
        return "bg-orange-50/40 hover:bg-orange-50/65";
      case "Entregado":
        return "bg-sky-50/45 hover:bg-sky-50/75 border-l-[3px] border-sky-300/60";
      case "Oficial":
        return "bg-emerald-50/40 hover:bg-emerald-50/65";
      case "Pendiente":
        return "bg-slate-50/50 hover:bg-slate-100/75";
      default:
        return "bg-slate-50/40 hover:bg-slate-50/70";
    }
  };

  const splitNamesLabel = (value) =>
    String(value || "")
      .split("/")
      .map((part) => {
        const [apellido, ...resto] = part.split(",");
        return {
          apellido: (apellido || "").trim(),
          nombre: resto.join(",").trim(),
        };
      })
      .filter((p) => p.apellido || p.nombre);

  const shouldFetchLibrary = useMemo(() => {
    const composerFilter = normalizeSearchText(debouncedFilters.compositor);
    const titleFilter = normalizeSearchText(debouncedFilters.titulo);
    const arrangerFilter = normalizeSearchText(debouncedFilters.arreglador);
    return (
      composerFilter.length >= 2 ||
      titleFilter.length >= 2 ||
      arrangerFilter.length >= 2 ||
      hasActiveInstrFilter
    );
  }, [debouncedFilters, hasActiveInstrFilter]);

  useEffect(() => {
    if (!isAddModalOpen) return;
    if (!shouldFetchLibrary) {
      setWorksLibrary([]);
      setLibraryPage(0);
      setLibraryHasMore(false);
      return;
    }
    fetchLibrary({ page: 0, append: false });
  }, [isAddModalOpen, shouldFetchLibrary, debouncedFilters]);

  const filteredLibrary = useMemo(() => worksLibrary.filter((w) => {
    const tituloFilter = normalizeSearchText(debouncedFilters.titulo);
    const compositorFilter = normalizeSearchText(debouncedFilters.compositor);
    const arregladorFilter = normalizeSearchText(debouncedFilters.arreglador);

    if (tituloFilter && !String(w.titulo_plain || normalizeSearchText(w.titulo)).includes(tituloFilter)) return false;
    if (compositorFilter && !String(w.compositor_plain || normalizeSearchText(w.compositor_full)).includes(compositorFilter)) return false;
    if (arregladorFilter && !String(w.arreglador_plain || normalizeSearchText(w.arreglador_full)).includes(arregladorFilter)) return false;

    const instr = w.instrumentacion || calculateInstrumentation(w.obras_particellas) || "";
    const hasStr = hasStrings(instr);

    if (addModalStringsFilter !== "all") {
      if (addModalStringsFilter === "with" && !hasStr) return false;
      if (addModalStringsFilter === "without" && hasStr) return false;
    }

    if (addModalInstrFilters.length > 0 || addModalStringsFilter !== "all" || addModalStrictMode) {
      const passActiveRules = addModalInstrFilters.every((rule) => {
        const countInWork = getInstrumentValue(instr, rule.instrument);
        const targetVal = parseInt(rule.value, 10) || 0;
        if (rule.operator === "eq") return countInWork === targetVal;
        if (rule.operator === "gte") return countInWork >= targetVal;
        if (rule.operator === "lte") return countInWork <= targetVal;
        return true;
      });
      if (!passActiveRules) return false;

      if (addModalStrictMode) {
        const activeKeys = new Set(addModalInstrFilters.map((r) => r.instrument));
        const masterList = ["fl", "ob", "cl", "bn", "hn", "tpt", "tbn", "tba", "timp", "perc", "harp", "key"];
        for (const key of masterList) {
          if (!activeKeys.has(key) && (getInstrumentValue(instr, key) || 0) > 0) return false;
        }
        if (addModalStringsFilter === "all" && hasStr) return false;
        if (instr.includes("+")) return false;
      }
    }
    return true;
  }), [
    worksLibrary,
    debouncedFilters,
    addModalInstrFilters,
    addModalStringsFilter,
    addModalStrictMode,
  ]);
  // --- MANEJADOR CAMBIO DE ARCO (BD + DRIVE VIA PADRE) ---
  const handleArcoSelectionChange = async (item, newArcoId) => {
    // 1. Actualización optimista en BD (Repertorio)
    updateWorkDetail(item.id, "id_arco_seleccionado", newArcoId);

    // 2. Si es deselección, terminamos
    if (!newArcoId) return;

    // 3. Obtener datos del arco seleccionado
    const selectedArco = arcosByWork[item.obras.id]?.find(
      (a) => a.id == newArcoId,
    );
    if (!selectedArco) return;

    // Intentar obtener ID de Drive
    let targetId = selectedArco.id_drive_folder;
    if (!targetId && selectedArco.link) {
      const match = selectedArco.link.match(/[-\w]{25,}/);
      if (match) targetId = match[0];
    }

    if (!targetId) {
      console.warn("No hay ID de Drive para vincular shortcut.");
      return;
    }

    // 4. Delegar al padre la sincronización con Drive
    if (onSyncArco) {
      onSyncArco(item.obras, selectedArco.nombre, targetId)
        .then(() => console.log("Arcos vinculados correctamente."))
        .catch((err) => console.error("Error vinculando arcos:", err));
    }
  };
  // --- Crear Set de Arcos (columna Arcos en tabla) ---
  const handleCreateBowingSetForManager = async (workId, workTitle, nombre) => {
    if (!onSyncArco) throw new Error("Función de sincronización no disponible.");
    const result = await onSyncArco(
      { id: workId, titulo: workTitle },
      nombre,
      null,
    );
    return result;
  };

  // --- Drag & Drop: fila ordenable con handle GripVertical ---
  const SortableRepertorioRow = ({
    item,
    rep,
    idx,
    rowClassName,
    rowTitle,
    isEditor,
    isCompact,
    moveWork,
    dragOverId,
    children,
  }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({
      id: item.id,
      data: { id_repertorio: rep.id, index: idx },
    });
    const isOver = dragOverId === item.id;
    const style = {
      transform: CSS.Translate.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    };
    return (
      <tr
        ref={setNodeRef}
        style={style}
        title={rowTitle}
        className={`${rowClassName} ${isOver ? "ring-2 ring-inset ring-indigo-400 bg-indigo-50/80" : ""}`}
      >
        <td className="px-0 py-1 text-center align-middle">
          {isEditor && !isCompact && (
            <div
              {...listeners}
              {...attributes}
              className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-indigo-600 inline-flex touch-none justify-center w-full"
              title="Arrastrar para reordenar"
            >
              <IconGripVertical size={14} />
            </div>
          )}
        </td>
        <td className="px-0 py-1 text-center font-bold text-slate-500 tabular-nums">
          <span>{idx + 1}</span>
        </td>
        {children}
      </tr>
    );
  };

  const BLOCK_ZONE_START = (repId) => `block-${repId}-start`;
  const BLOCK_ZONE_END = (repId) => `block-${repId}-end`;

  const BlockDropZoneRow = ({ zoneId, label, colSpan }) => {
    const { setNodeRef, isOver } = useDroppable({ id: zoneId });
    return (
      <tr ref={setNodeRef}>
        <td
          colSpan={colSpan}
          className={`min-h-[28px] py-1 px-2 border-2 border-dashed rounded text-[10px] text-slate-400 transition-colors ${
            isOver ? "border-indigo-400 bg-indigo-50 text-indigo-600" : "border-slate-200 bg-slate-50/50"
          }`}
        >
          {label}
        </td>
      </tr>
    );
  };


  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const itemId = active.id;
    const overId = over.id;
    let sourceRep = null;
    let sourceIdx = -1;
    let targetRep = null;
    let targetIdx = -1;

    for (const r of repertorios) {
      const i = (r.repertorio_obras || []).findIndex((o) => o.id === itemId);
      if (i >= 0) {
        sourceRep = r;
        sourceIdx = i;
        break;
      }
    }
    if (!sourceRep) return;

    const obras = (r) => r.repertorio_obras || [];
    if (typeof overId === "string" && overId.startsWith("block-")) {
      const parts = overId.split("-");
      const repId = parseInt(parts[1], 10);
      const zone = parts[2];
      targetRep = repertorios.find((r) => r.id === repId);
      if (!targetRep) return;
      targetIdx = zone === "start" ? 0 : obras(targetRep).length;
    } else {
      for (const r of repertorios) {
        const i = obras(r).findIndex((o) => o.id === overId);
        if (i >= 0) {
          targetRep = r;
          targetIdx = i;
          break;
        }
      }
    }
    if (!targetRep) return;

    const movedToOtherBlock = sourceRep.id !== targetRep.id;
    const nuevoIdBloque = targetRep.id;
    // Si soltamos en "inicio", usar orden 0 para que tras normalizar quede primero (evita empate con el actual orden 1).
    const nuevoOrden = targetIdx === 0 ? 0 : targetIdx + 1;

    setSavingPosition(true);
    try {
      await updateWorkPosition(supabase, itemId, nuevoIdBloque, nuevoOrden);
      await normalizeRepertorioBlockOrden(supabase, sourceRep.id);
      if (movedToOtherBlock) {
        await normalizeRepertorioBlockOrden(supabase, targetRep.id);
      }
      await fetchFullRepertoire();
      autoSyncDrive();
    } catch (err) {
      console.error("Error reordenando obra:", err);
    } finally {
      setSavingPosition(false);
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  );

  const allRepertorioObraIds = useMemo(
    () => repertorios.flatMap((r) => (r.repertorio_obras || []).map((o) => o.id)),
    [repertorios],
  );

  const activeDragItemData = useMemo(() => {
    if (!activeDragId) return null;
    for (const r of repertorios) {
      const item = (r.repertorio_obras || []).find((o) => o.id === activeDragId);
      if (item) return { item, rep: r };
    }
    return null;
  }, [activeDragId, repertorios]);

  return (
    <div className={containerClasses(isCompact)}>
      {savingPosition && (
        <div className="sticky top-0 z-20 flex items-center justify-center py-2 bg-amber-100 border-b border-amber-200 text-amber-800 text-sm font-bold shadow-sm">
          <IconLoader size={16} className="animate-spin mr-2" />
          Guardando orden...
        </div>
      )}
      {loading && repertorios.length === 0 ? (
        <div className="flex items-center justify-center gap-2 py-8 text-slate-400 text-sm">
          <IconLoader className="animate-spin" size={18} />
          Cargando repertorio…
        </div>
      ) : (
        <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={({ active }) => {
          setDragOverId(null);
          setActiveDragId(active.id);
        }}
        onDragOver={({ over }) => setDragOverId(over?.id ?? null)}
        onDragEnd={(e) => {
          setDragOverId(null);
          setActiveDragId(null);
          handleDragEnd(e);
        }}
      >
        <SortableContext items={allRepertorioObraIds} strategy={verticalListSortingStrategy}>
      {repertorios.map((rep) => {
        // Calculamos el atril para el usuario actual en este bloque (si aplica)
        const userSeating = user ? seatingMap[user.id] : null;
        const isDefinitionMode =
          (rep.repertorio_obras || []).some((o) => o.en_definicion) || false;

        return (
          <div
            key={rep.id}
            className={`flex w-full max-w-full min-w-0 flex-col items-stretch border border-slate-200 ${
              isCompact ? "mb-4 rounded shadow-sm" : "bg-white shadow-sm"
            } overflow-visible ${activeDragId ? "z-10" : ""}`}
          >
            {/* --- HEADER DEL BLOQUE (TÍTULO Y DURACIÓN) --- */}
            <div className="bg-fixed-indigo-50/50 p-2 border-b border-slate-200 flex justify-between items-center h-10 sticky top-0 z-10 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <IconMusic size={14} className="text-fixed-indigo-600" />
                {editingBlock.id === rep.id ? (
                  <input
                    autoFocus
                    type="text"
                    className="w-full text-xs p-1 border border-fixed-indigo-300 rounded outline-none"
                    value={editingBlock.nombre}
                    onChange={(e) =>
                      setEditingBlock({
                        ...editingBlock,
                        nombre: e.target.value,
                      })
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveBlockName();
                    }}
                    onBlur={saveBlockName}
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <span
                      className="font-bold text-slate-800 text-xs uppercase flex items-center gap-2 group cursor-pointer"
                      onClick={() => isEditor && startEditBlock(rep)}
                    >
                      {rep.nombre}{" "}
                      {isEditor && (
                        <IconEdit
                          size={12}
                          className="opacity-0 group-hover:opacity-100 text-slate-400"
                        />
                      )}
                    </span>

                    {isEditor && (
                      <button
                        onClick={async () => {
                          const nextValue = !isDefinitionMode;
                          // Actualizar UI local
                          setRepertorios((current) =>
                            current.map((r) =>
                              r.id === rep.id
                                ? {
                                    ...r,
                                    repertorio_obras: (r.repertorio_obras || []).map(
                                      (o) => ({
                                        ...o,
                                        en_definicion: nextValue,
                                      }),
                                    ),
                                  }
                                : r,
                            ),
                          );
                          // Persistir en Supabase para todas las obras del bloque
                          const obraIds = (rep.repertorio_obras || []).map(
                            (o) => o.id,
                          );
                          if (obraIds.length > 0) {
                            try {
                              await supabase
                                .from("repertorio_obras")
                                .update({ en_definicion: nextValue })
                                .in("id", obraIds);
                            } catch (e) {
                              console.error(
                                "Error al actualizar en_definicion del bloque:",
                                e,
                              );
                              alert(
                                "Error al actualizar el modo de definición del bloque.",
                              );
                            }
                          }
                        }}
                        className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold transition-colors ${
                          isDefinitionMode
                            ? "bg-amber-50 border-amber-300 text-amber-800"
                            : "bg-white border-slate-200 text-slate-500"
                        }`}
                        title="Controla si este bloque está en modo de definición/curaduría"
                      >
                        {isDefinitionMode ? (
                          <>
                            <IconAlertCircle size={12} className="text-amber-500" />
                            <span>Modo Definición</span>
                          </>
                        ) : (
                          <>
                            <IconCheck size={12} className="text-emerald-500" />
                            <span>Definido</span>
                          </>
                        )}
                      </button>
                    )}

                    {/* Badge de Atril (si el usuario tiene asignación) */}
                    {userSeating && (
                      <div className="flex items-center gap-1.5 px-2 py-0.5 bg-white border border-fixed-indigo-200 rounded text-[10px] text-fixed-indigo-700 shadow-sm animate-in fade-in">
                        <span className="font-bold">
                          {userSeating.containerName}
                        </span>
                        <span className="text-fixed-indigo-200">|</span>
                        <span className="font-medium">
                          Atril {userSeating.desk}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold text-slate-600 bg-white px-1.5 rounded border">
                  Total: {calculateTotalDuration(rep.repertorio_obras)}
                  {(rep.repertorio_obras || []).some((o) => o.excluir) ? (
                    <span className="text-slate-500 font-normal">
                      {" "}
                      (Neto {calculateNetDuration(rep.repertorio_obras)})
                    </span>
                  ) : null}
                </span>
                {isEditor && (
                  <>
                    <button
                      onClick={() => deleteRepertoireBlock(rep.id)}
                      className="text-slate-400 hover:text-red-600 p-1"
                    >
                      <IconTrash size={12} />
                    </button>
                  </>
                )}
              </div>
            </div>
            {/* ============================================================ */}
            {/* VISTA MÓVIL: TARJETAS COMPACTAS (LESS SPACING)             */}
            {/* ============================================================ */}
            <div className="md:hidden bg-slate-50 p-2 space-y-1">
              {rep.repertorio_obras.map((item, idx) => {
                // LÓGICA DE BORDE IZQUIERDO:
                const myPartData = getMyPartUrl(item.obras);
                // Está cargada si existe myPartData y tiene URL
                const hasUploadedPart = !!myPartData?.url;

                const estado = item.obras.estado;
                let borderClass = "bg-slate-300";
                let cardBorderClass = "border-slate-200";

                if (estado === "Informativo") {
                  borderClass = "bg-blue-500";
                  cardBorderClass = "border-blue-400 bg-blue-50/50";
                } else if (estado === "Solicitud") {
                  borderClass = "bg-amber-500";
                  cardBorderClass = "border-amber-300 bg-amber-50/50";
                } else if (estado === "Oficial") {
                  borderClass = "bg-emerald-500";
                  cardBorderClass = "border-emerald-300 bg-emerald-50/60";
                } else if (!estado && hasUploadedPart) {
                  borderClass = "bg-emerald-500";
                  cardBorderClass = "border-emerald-300 bg-emerald-50/40";
                }

                return (
                  <div
                    key={item.id}
                    className={`rounded-lg border shadow-sm p-2 relative overflow-hidden ${cardBorderClass} ${
                      item.excluir
                        ? "opacity-[0.8] saturate-[0.68] grayscale-[0.18] ring-1 ring-inset ring-slate-400/60 bg-slate-100/50"
                        : ""
                    }`}
                    title={item.excluir ? "Excluida de la programación" : undefined}
                  >
                    {/* Barra lateral de estado */}
                    <div
                      className={`absolute left-0 top-0 bottom-0 w-1 ${borderClass}`}
                    ></div>

                    <div className="flex gap-2 pl-2 pr-1">
                      <div className="flex-1 min-w-0">
                        {/* Fila 1: Orden, Compositor, Duración */}
                        <div className="flex justify-between items-center mb-1">
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-0.5 shrink-0">
                              <span className="bg-slate-100 text-slate-500 text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full">
                                {idx + 1}
                              </span>
                              {isEditor ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateWorkDetail(
                                      item.id,
                                      "excluir",
                                      !item.excluir,
                                    )
                                  }
                                  className="rounded-full p-0.5 border border-slate-200 bg-white hover:border-red-200 shadow-sm"
                                  title={
                                    item.excluir
                                      ? "Incluir en la programación"
                                      : "Excluir de la programación"
                                  }
                                >
                                  {item.excluir ? (
                                    <IconEyeOff
                                      size={8}
                                      className="text-red-500"
                                    />
                                  ) : (
                                    <IconEye
                                      size={8}
                                      className="text-slate-400"
                                    />
                                  )}
                                </button>
                              ) : item.excluir ? (
                                <span className="rounded-full p-0.5 border border-red-100 bg-white">
                                  <IconEyeOff
                                    size={8}
                                    className="text-red-500"
                                  />
                                </span>
                              ) : null}
                              {item.excluir && (
                                <span className="text-[8px] bg-slate-200 text-slate-600 px-1 rounded border border-slate-300 font-semibold leading-none py-0.5">
                                  Excl
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide truncate max-w-[150px]">
                              {getComposers(item.obras)}
                            </span>
                          </div>
                          <span className="text-[10px] font-mono bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100 inline-flex items-start justify-end">
                            <RepertorioProgramDurationCell
                              item={item}
                              isEditor={isEditor}
                              updateWorkDetail={updateWorkDetail}
                              compact
                            />
                          </span>
                        </div>

                        {/* Fila 2: Título Multi-línea */}
                        <div className="mb-1">
                          <div className="flex items-center gap-1 flex-wrap">
                            <MultiLineTitle content={item.obras.titulo} />
                            {item.obras.estado === "Informativo" && (
                              <span className="text-[8px] bg-blue-100 text-blue-600 px-1 rounded border border-blue-200 align-text-top">
                                INFO
                              </span>
                            )}
                          </div>
                          {canSeeInternalNotes &&
                            (item.obras.estado === "Solicitud" ||
                              item.obras.estado === "Pendiente") &&
                            (item.obras.nota_interna ||
                              item.obras.observaciones ||
                              item.obras.comentarios) && (
                              <div className="group relative w-fit mt-1">
                                <div className="bg-yellow-100 border border-yellow-200 text-yellow-800 text-[10px] px-2 py-0.5 rounded-sm shadow-sm flex items-center gap-1 cursor-help transform -rotate-1 hover:rotate-0 transition-transform origin-left max-w-[160px]">
                                  <span className="text-[9px]">📝</span>
                                  <span className="truncate font-normal">
                                    {(item.obras.nota_interna ||
                                      item.obras.observaciones ||
                                      item.obras.comentarios)
                                      ?.replace(/<[^>]*>?/gm, "")
                                      .trim()
                                      .slice(0, 60)}
                                    {((item.obras.nota_interna ||
                                      item.obras.observaciones ||
                                      item.obras.comentarios)
                                      ?.replace(/<[^>]*>?/gm, "")
                                      .trim().length || 0) > 60
                                      ? "…"
                                      : ""}
                                  </span>
                                </div>
                                <div className="absolute left-0 top-full mt-1 hidden group-hover:block w-56 bg-yellow-50 border border-yellow-200 shadow-xl p-2 rounded text-xs font-normal text-slate-700 z-[60] whitespace-normal animate-in fade-in zoom-in-95">
                                  {(item.obras.nota_interna ||
                                    item.obras.observaciones ||
                                    item.obras.comentarios)
                                    ?.replace(/<[^>]*>?/gm, " ")
                                    .replace(/\s+/g, " ")
                                    .trim()}
                                </div>
                              </div>
                            )}
                          {getArranger(item.obras) !== "-" && (
                            <p className="text-[10px] text-slate-400 italic mt-0.5">
                              Arr: {getArranger(item.obras)}
                            </p>
                          )}
                        </div>

                        {/* Fila 3: Instrumentación + Mi Parte */}
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className="text-[10px] font-mono text-slate-500 bg-slate-50 px-1 rounded">
                            {item.obras.instrumentacion ||
                              calculateInstrumentation(
                                item.obras.obras_particellas,
                              ) ||
                              "-"}
                          </span>
                          {renderMyPartBadge(item.obras)}
                        </div>

                        {/* Fila 4: Notas (misma línea stick-it que escritorio en lectura) */}
                        {(item.notas_especificas?.trim() || isEditor) && (
                          <div className="mb-2">
                            <NotasProgramaStickyCell
                              item={item}
                              isEditor={isEditor}
                              updateWorkDetail={updateWorkDetail}
                              shrinkWhenEmpty
                            />
                          </div>
                        )}

                {/* Fila 5: Solistas */}
                        {(item.ids_solistas || item.id_solista) && (
                          <div className="flex flex-wrap items-center gap-1 mb-2">
                            {(
                              item.ids_solistas ||
                              (item.id_solista ? [item.id_solista] : [])
                            ).map((id) => {
                              const m = musicians.find((mus) => mus.id === id);
                              return m ? (
                                <span
                                  key={id}
                                  className="text-[10px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-100"
                                >
                                  ★ {`${m.apellido}, ${m.nombre}`}
                                </span>
                              ) : null;
                            })}
                          </div>
                        )}

                        {/* Fila 6: Curaduría (solo si el bloque está en definición) */}
                        {item.en_definicion && (
                          <div className="mb-2 mt-1 border-t border-amber-100 pt-1">
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-1">
                                <span className="text-[9px] uppercase tracking-wide text-amber-700 font-semibold">
                                  Curaduría
                                </span>
                                {item.estado_curaduria === "Aceptado" && (
                                  <IconCheck
                                    size={10}
                                    className="text-emerald-600"
                                  />
                                )}
                                {item.estado_curaduria === "Rechazado" && (
                                  <IconX size={10} className="text-red-600" />
                                )}
                                {!item.estado_curaduria ||
                                  item.estado_curaduria === "Propuesto" ? (
                                  <IconAlertCircle
                                    size={10}
                                    className="text-amber-500"
                                  />
                                ) : null}
                              </div>
                              {isEditor ? (
                                <div className="flex flex-col gap-1">
                                  <select
                                    value={item.estado_curaduria || "Propuesto"}
                                    onChange={(e) =>
                                      updateWorkDetail(
                                        item.id,
                                        "estado_curaduria",
                                        e.target.value,
                                      )
                                    }
                                    className={`w-full text-[10px] px-2 py-1 rounded border focus:outline-none focus:ring-1 ${
                                      item.estado_curaduria === "Aceptado"
                                        ? "bg-emerald-50 border-emerald-300 text-emerald-700 focus:ring-emerald-400"
                                        : item.estado_curaduria === "Rechazado"
                                          ? "bg-red-50 border-red-300 text-red-700 focus:ring-red-400"
                                          : "bg-amber-50 border-amber-300 text-amber-800 focus:ring-amber-400"
                                    }`}
                                  >
                                    <option value="Propuesto">Propuesto</option>
                                    <option value="Aceptado">Aceptado</option>
                                    <option value="Rechazado">Rechazado</option>
                                  </select>
                                  <input
                                    type="text"
                                    className="w-full text-[10px] px-2 py-1 rounded border border-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-300"
                                    placeholder="Observación de curaduría..."
                                    defaultValue={item.observacion_curaduria || ""}
                                    onBlur={(e) =>
                                      updateWorkDetail(
                                        item.id,
                                        "observacion_curaduria",
                                        e.target.value,
                                      )
                                    }
                                  />
                                </div>
                              ) : (
                                <div className="flex flex-col gap-1">
                                  <span
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                                      item.estado_curaduria === "Aceptado"
                                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                        : item.estado_curaduria === "Rechazado"
                                          ? "bg-red-50 text-red-700 border border-red-200"
                                          : "bg-amber-50 text-amber-800 border border-amber-200"
                                    }`}
                                  >
                                    {item.estado_curaduria || "Propuesto"}
                                  </span>
                                  {item.observacion_curaduria && (
                                    <p className="text-[10px] text-slate-600 leading-tight">
                                      {item.observacion_curaduria}
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Fila 7: Botonera inferior */}
                        <div className="pt-1 border-t border-slate-50 flex justify-between items-center">
                          <div className="flex gap-3">
                            {(item.google_drive_shortcut_id ||
                              item.obras.link_drive) && (
                              <a
                                href={item.obras.link_drive}
                                target="_blank"
                                rel="noreferrer"
                                className="text-blue-600 flex items-center gap-1 text-[10px] font-medium"
                              >
                                <IconDrive size={12} /> Drive
                              </a>
                            )}
                            {item.obras.link_youtube && (
                              <a
                                href={item.obras.link_youtube}
                                target="_blank"
                                rel="noreferrer"
                                className="text-red-600 flex items-center gap-1 text-[10px] font-medium"
                              >
                                <IconYoutube size={12} /> Video
                              </a>
                            )}
                          </div>

                          <div className="flex items-center gap-1">
                            <CommentButton
                              supabase={supabase}
                              entityType="OBRA"
                              entityId={item.id}
                              onClick={() =>
                                setCommentsState({
                                  type: "OBRA",
                                  id: item.id,
                                  title: item.obras.titulo,
                                })
                              }
                              className="text-slate-400 hover:text-fixed-indigo-600 p-1"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Columna de acciones (orden / editar / borrar) */}
                      {isEditor && (
                        <div className="flex flex-col items-center justify-between py-1">
                          <button
                            onClick={() => moveWork(rep.id, item.id, -1)}
                            disabled={idx === 0}
                            className="w-7 h-7 flex items-center justify-center rounded-full bg-slate-100 text-slate-700 shadow-sm hover:bg-slate-200 disabled:opacity-25"
                            title="Mover arriba"
                          >
                            <IconChevronDown size={14} className="rotate-180" />
                          </button>
                          <button
                            onClick={() => openEditModal(item)}
                            className="w-7 h-7 mt-1 mb-1 flex items-center justify-center rounded-full bg-slate-100 text-slate-700 shadow-sm hover:bg-slate-200"
                            title="Editar obra"
                          >
                            <IconEdit size={14} />
                          </button>
                          <button
                            onClick={() => moveWork(rep.id, item.id, 1)}
                            disabled={idx === rep.repertorio_obras.length - 1}
                            className="w-7 h-7 flex items-center justify-center rounded-full bg-slate-100 text-slate-700 shadow-sm hover:bg-slate-200 disabled:opacity-25"
                            title="Mover abajo"
                          >
                            <IconChevronDown size={14} />
                          </button>
                          <button
                            onClick={() => removeWork(item.id)}
                            className="w-7 h-7 mt-1 flex items-center justify-center rounded-full bg-red-50 text-red-500 shadow-sm hover:bg-red-100"
                            title="Eliminar obra"
                          >
                            <IconTrash size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ============================================================ */}
            {/* VISTA ESCRITORIO: TABLA (Visible solo en md o superior)      */}
            {/* ============================================================ */}
            <div className="hidden min-w-0 w-full max-w-none pb-4 md:grid md:grid-cols-1 md:[grid-template-columns:minmax(0,1fr)] md:overflow-x-auto md:overflow-y-visible [&>*]:max-w-none [&>*]:min-w-0">
              <table
                className="w-full max-w-none min-w-0 table-fixed border-collapse text-left text-xs"
                style={{ width: "100%", tableLayout: "fixed" }}
              >
                {/* Px estrechos + columna principal en % para que `table-layout:fixed` llene el ancho real del bloque. */}
                <colgroup>
                  <col style={{ width: "26px" }} />
                  <col style={{ width: "22px" }} />
                  <col style={{ width: "32px" }} />
                  <col style={{ width: "40%" }} />
                  {isDefinitionMode && <col style={{ width: "140px" }} />}
                  <col style={{ width: "124px" }} />
                  <col style={{ width: "90px" }} />
                  <col style={{ width: "88px" }} />
                  <col style={{ width: "62px" }} />
                  <col style={{ width: "110px" }} />
                  <col style={{ width: "118px" }} />
                  <col style={{ width: "32px" }} />
                </colgroup>

                <thead className={tableHeaderClasses(isCompact)}>
                  <tr>
                    <th className="px-0 py-1 w-[26px]" aria-label="Arrastrar" />
                    <th className="px-0 py-1 text-center">#</th>
                    <th className="px-0 py-1 text-center">GD</th>
                    <th className="p-1 min-w-0">Compositor / Obra</th>
                    {isDefinitionMode && (
                      <th className="p-1 text-center">Curaduría</th>
                    )}
                    <th className="p-1 text-center">Instr.</th>
                    <th
                      className="p-1 text-center"
                      title="Cursiva = duración solo este programa. Pase el mouse para editar."
                    >
                      Dur.
                    </th>
                    <th className="p-1">Solista</th>
                    <th className="p-1">Arr.</th>
                    <th className="p-1">Notas</th>
                    <th
                      className="px-0 py-1 text-center text-slate-500"
                      title="Arcos, YouTube y acciones"
                      scope="col"
                    >
                      <span className="sr-only">Arcos, YouTube y acciones</span>
                      <span className="inline-flex items-center justify-center gap-0 opacity-80">
                        <IconViolin size={11} aria-hidden />
                        <IconYoutube size={11} className="opacity-70" aria-hidden />
                      </span>
                    </th>
                    <th className="px-0 py-1 text-center">Excl.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isEditor && !isCompact && activeDragId && (
                    <BlockDropZoneRow
                      zoneId={BLOCK_ZONE_START(rep.id)}
                      colSpan={isDefinitionMode ? 12 : 11}
                      label={
                        (rep.repertorio_obras || []).length === 0
                          ? "Soltar aquí para agregar la primera obra"
                          : "Soltar aquí para colocar al inicio"
                      }
                    />
                  )}
                  {(rep.repertorio_obras || []).map((item, idx) => (
                    <SortableRepertorioRow
                      key={item.id}
                      item={item}
                      rep={rep}
                      idx={idx}
                      rowClassName={`group ${
                        item.obras.estado === "Informativo"
                          ? "bg-blue-50 hover:bg-blue-100 border-l-2 border-blue-400"
                          : item.obras.estado !== "Oficial"
                            ? "bg-amber-50 hover:bg-amber-100"
                            : "bg-emerald-50 hover:bg-emerald-100 border-l-2 border-emerald-400"
                      }${
                        item.excluir
                          ? " opacity-[0.8] saturate-[0.68] grayscale-[0.18] ring-1 ring-inset ring-slate-400/60 [&_td]:bg-slate-100/45 [&_td]:text-slate-500"
                          : ""
                      }`}
                      rowTitle={item.excluir ? "Excluida de la programación" : undefined}
                      isEditor={isEditor}
                      isCompact={isCompact}
                      moveWork={moveWork}
                      dragOverId={dragOverId}
                    >
                      <td className="px-0 py-1 text-center">
                        {item.obras.estado === "Informativo" ? (
                          <span className="text-slate-300 text-[10px]" title="Obra informativa (sin archivo)">—</span>
                        ) : item.google_drive_shortcut_id ? (
                          item.obras.link_drive ? (
                            <a
                              href={item.obras.link_drive}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex justify-center text-slate-600 hover:text-fixed-indigo-600"
                              title="Abrir carpeta original en Drive"
                            >
                              <IconDrive className="w-3 h-3" />
                            </a>
                          ) : (
                            <IconDrive className="w-3 h-3 mx-auto text-slate-600" />
                          )
                        ) : item.obras.link_drive ? (
                          <a
                            href={item.obras.link_drive}
                            target="_blank"
                            rel="noreferrer"
                            className="block w-2 h-2 bg-amber-400 rounded-full mx-auto"
                            title="Abrir carpeta original en Drive"
                          ></a>
                        ) : (
                          <span className="text-slate-200">-</span>
                        )}
                      </td>
                      <td
                        className="min-w-0 p-1 align-middle text-slate-800"
                        title={item.obras.titulo?.replace(/<[^>]*>?/gm, "")}
                      >
                        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:gap-2">
                          <div className="flex max-w-[42%] shrink-0 min-w-[7rem] flex-col items-center justify-center text-center text-slate-600">
                            <div className="flex w-full flex-col items-center justify-center gap-1">
                              <div
                                className="min-w-0 w-full space-y-1"
                                title={getComposers(item.obras)}
                              >
                                {getComposersNameParts(item.obras).map((c, i) => (
                                  <div
                                    key={i}
                                    className={`min-w-0 ${i > 0 ? "pt-1 border-t border-slate-100" : ""}`}
                                  >
                                    <div className="truncate text-[11px] font-semibold text-slate-700 leading-tight">
                                      {c.apellido}
                                    </div>
                                    {c.nombre ? (
                                      <div className="truncate text-[10px] font-medium normal-case tracking-normal text-slate-500 leading-tight">
                                        {c.nombre}
                                      </div>
                                    ) : null}
                                  </div>
                                ))}
                              </div>
                              {renderMyPartBadge(item.obras)}
                            </div>
                          </div>
                          <div className="flex min-w-0 flex-1 flex-col gap-1">
                            <div className="flex min-w-0 flex-wrap items-center gap-1">
                              <RichTextPreview content={item.obras.titulo} />
                              {item.obras.estado === "Informativo" && (
                                <span className="ml-1 text-[8px] bg-blue-100 text-blue-600 px-1 rounded border border-blue-200 align-text-top">
                                  INFO
                                </span>
                              )}
                              {(item.obras.estado === "Solicitud" || item.obras.estado === "Pendiente") && (
                                <span className="ml-1 text-[8px] bg-amber-100 text-amber-700 px-1 rounded border border-amber-200 align-text-top">
                                  PEND
                                </span>
                              )}
                            </div>
                            {canSeeInternalNotes && (item.obras.estado === "Solicitud" || item.obras.estado === "Pendiente") && (item.obras.nota_interna || item.obras.observaciones || item.obras.comentarios) && (
                              <div className="group relative max-w-full">
                                <div className="flex max-w-full cursor-help items-center gap-1 rounded-sm border border-yellow-200 bg-yellow-100 px-2 py-0.5 text-[10px] text-yellow-800 shadow-sm transition-transform hover:rotate-0 origin-left -rotate-1">
                                  <span className="text-[9px] shrink-0">📝</span>
                                  <span className="min-w-0 truncate font-normal">
                                    {(item.obras.nota_interna || item.obras.observaciones || item.obras.comentarios)?.replace(/<[^>]*>?/gm, "").trim().slice(0, 60)}
                                    {((item.obras.nota_interna || item.obras.observaciones || item.obras.comentarios)?.replace(/<[^>]*>?/gm, "").trim().length || 0) > 60 ? "…" : ""}
                                  </span>
                                </div>
                                <div className="absolute left-0 top-full z-[60] mt-1 hidden w-56 rounded border border-yellow-200 bg-yellow-50 p-2 text-xs font-normal whitespace-normal text-slate-700 shadow-xl group-hover:block animate-in fade-in zoom-in-95">
                                  {(item.obras.nota_interna || item.obras.observaciones || item.obras.comentarios)?.replace(/<[^>]*>?/gm, " ").replace(/\s+/g, " ").trim()}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      {isDefinitionMode && (
                        <td className="p-1 text-center align-middle">
                          {item.en_definicion ? (
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-1">
                                {item.estado_curaduria === "Aceptado" && (
                                  <IconCheck
                                    size={12}
                                    className="text-emerald-600 shrink-0"
                                  />
                                )}
                                {item.estado_curaduria === "Rechazado" && (
                                  <IconX
                                    size={12}
                                    className="text-red-600 shrink-0"
                                  />
                                )}
                                {!item.estado_curaduria ||
                                  item.estado_curaduria === "Propuesto" ? (
                                  <IconAlertCircle
                                    size={12}
                                    className="text-amber-500 shrink-0"
                                  />
                                ) : null}
                                {isEditor ? (
                                  <select
                                    value={item.estado_curaduria || "Propuesto"}
                                    onChange={(e) =>
                                      updateWorkDetail(
                                        item.id,
                                        "estado_curaduria",
                                        e.target.value,
                                      )
                                    }
                                    className={`flex-1 min-w-[80px] text-[10px] px-1.5 py-0.5 rounded border focus:outline-none focus:ring-1 ${
                                      item.estado_curaduria === "Aceptado"
                                        ? "bg-emerald-50 border-emerald-300 text-emerald-700 focus:ring-emerald-400"
                                        : item.estado_curaduria === "Rechazado"
                                          ? "bg-red-50 border-red-300 text-red-700 focus:ring-red-400"
                                          : "bg-amber-50 border-amber-300 text-amber-800 focus:ring-amber-400"
                                    }`}
                                  >
                                    <option value="Propuesto">Propuesto</option>
                                    <option value="Aceptado">Aceptado</option>
                                    <option value="Rechazado">Rechazado</option>
                                  </select>
                                ) : (
                                  <span
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                                      item.estado_curaduria === "Aceptado"
                                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                        : item.estado_curaduria === "Rechazado"
                                          ? "bg-red-50 text-red-700 border border-red-200"
                                          : "bg-amber-50 text-amber-800 border border-amber-200"
                                    }`}
                                  >
                                    {item.estado_curaduria || "Propuesto"}
                                  </span>
                                )}
                              </div>
                              {isEditor && (
                                <input
                                  type="text"
                                  className="w-full text-[10px] px-1.5 py-0.5 rounded border border-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-300"
                                  placeholder="Obs. curaduría…"
                                  defaultValue={item.observacion_curaduria || ""}
                                  onBlur={(e) =>
                                    updateWorkDetail(
                                      item.id,
                                      "observacion_curaduria",
                                      e.target.value,
                                    )
                                  }
                                />
                              )}
                              {!isEditor && item.observacion_curaduria && (
                                <p className="text-[10px] text-slate-600 leading-tight">
                                  {item.observacion_curaduria}
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-300">-</span>
                          )}
                        </td>
                      )}
                      <td className="p-1 text-center whitespace-pre-line text-[10px] text-slate-500 font-mono">
                        {item.obras.instrumentacion ||
                          calculateInstrumentation(
                            item.obras.obras_particellas,
                          ) ||
                          "-"}
                      </td>
                      <td className="p-1 text-center align-middle min-w-0">
                        <RepertorioProgramDurationCell
                          item={item}
                          isEditor={isEditor}
                          updateWorkDetail={updateWorkDetail}
                          compact={false}
                        />
                      </td>
                      <td className="p-0 border-l border-slate-100 align-middle">
                        {isEditor ? (
                          <div className="px-1">
                            <MultiSoloistSelect
                              selectedIds={
                                item.ids_solistas ||
                                (item.id_solista ? [item.id_solista] : [])
                              }
                              musicians={musicians}
                              isEditor={true}
                              onAdd={(newId) => {
                                const current =
                                  item.ids_solistas ||
                                  (item.id_solista ? [item.id_solista] : []);
                                updateWorkDetail(item.id, "ids_solistas", [
                                  ...current,
                                  newId,
                                ]);
                              }}
                              onRemove={(removeId) => {
                                const current =
                                  item.ids_solistas ||
                                  (item.id_solista ? [item.id_solista] : []);
                                updateWorkDetail(
                                  item.id,
                                  "ids_solistas",
                                  current.filter((id) => id !== removeId),
                                );
                              }}
                            />
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-1 p-1">
                            {(
                              item.ids_solistas ||
                              (item.id_solista ? [item.id_solista] : [])
                            ).length > 0 ? (
                              (
                                item.ids_solistas ||
                                (item.id_solista ? [item.id_solista] : [])
                              ).map((id) => {
                                const m = musicians.find(
                                  (mus) => mus.id === id,
                                );
                                return m ? (
                                  <span
                                    key={id}
                                    className="text-[10px] font-bold text-fixed-indigo-700 bg-fixed-indigo-50 px-1.5 py-0.5 rounded border border-fixed-indigo-100 truncate max-w-[100px]"
                                  >
                                    {m.apellido}, {m.nombre[0]}.
                                  </span>
                                ) : null;
                              })
                            ) : (
                              <span className="text-[10px] text-slate-300 italic p-1">
                                -
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="p-1 truncate text-slate-500">
                        {getArranger(item.obras)}
                      </td>
                      <td className="p-0 border-l border-slate-100 align-middle min-w-0">
                        <NotasProgramaStickyCell
                          item={item}
                          isEditor={isEditor}
                          updateWorkDetail={updateWorkDetail}
                          shrinkWhenEmpty
                        />
                      </td>
                      <td className="px-0 py-0.5 align-middle">
                        {(() => {
                          const obraArcos =
                            arcosByWork[item.obras?.id ?? item.id_obra] ?? [];
                          const arcoSel =
                            item.id_arco_seleccionado != null &&
                            item.id_arco_seleccionado !== ""
                              ? obraArcos.find(
                                  (a) =>
                                    String(a.id) ===
                                    String(item.id_arco_seleccionado),
                                )
                              : null;
                          const arcTitle =
                            arcoSel?.nombre ?? "Sin set de arcos";
                          const arcDriveHref = arcoSel?.link || null;
                          return (
                            <div className="flex min-w-0 flex-nowrap items-center justify-end gap-0">
                              <div
                                className={`relative flex h-7 w-7 shrink-0 items-center justify-center rounded transition-colors ${isEditor ? "hover:bg-slate-100/90" : ""}`}
                                title={
                                  isEditor
                                    ? `${arcTitle} · Click para elegir set`
                                    : arcTitle
                                }
                              >
                                <IconViolin
                                  size={14}
                                  className={`pointer-events-none ${item.id_arco_seleccionado ? "text-emerald-600" : "text-slate-400"}`}
                                  aria-hidden
                                />
                                {isEditor ? (
                                  <select
                                    value={item.id_arco_seleccionado || ""}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      if (val === "NEW_SET_ACTION") {
                                        const nombreSet = prompt(
                                          "Nombre para el nuevo set de arcos:",
                                          `Arcos ${new Date().getFullYear()}`,
                                        );
                                        if (!nombreSet?.trim()) return;
                                        handleCreateBowingSetForManager(
                                          item.obras?.id ?? item.id_obra,
                                          item.obras?.titulo ?? "",
                                          nombreSet.trim(),
                                        )
                                          .then((result) => {
                                            if (result?.newArcoId) {
                                              handleArcoSelectionChange(
                                                item,
                                                result.newArcoId,
                                              );
                                              fetchFullRepertoire();
                                            }
                                          })
                                          .catch((err) => {
                                            console.error(
                                              "Error creando set de arcos:",
                                              err,
                                            );
                                            alert(
                                              err?.message ||
                                                "Error al crear set de arcos.",
                                            );
                                          });
                                      } else {
                                        handleArcoSelectionChange(
                                          item,
                                          val === "" ? null : val,
                                        );
                                      }
                                    }}
                                    className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                                    aria-label="Seleccionar set de arcos"
                                  >
                                    <option value="">-- Sin definir --</option>
                                    {obraArcos.map((arco) => (
                                      <option key={arco.id} value={arco.id}>
                                        {arco.nombre}
                                      </option>
                                    ))}
                                    <option disabled>──────────</option>
                                    <option value="NEW_SET_ACTION">
                                      + Crear Nuevo Set...
                                    </option>
                                  </select>
                                ) : null}
                              </div>
                              {arcDriveHref ? (
                                <a
                                  href={arcDriveHref}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="flex shrink-0 items-center justify-center rounded p-0.5 text-slate-400 hover:bg-fixed-indigo-50 hover:text-fixed-indigo-600"
                                  title="Carpeta de arcos en Drive"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <IconLink size={11} />
                                </a>
                              ) : null}
                              {item.obras.link_youtube ? (
                                <a
                                  href={item.obras.link_youtube}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="flex shrink-0 items-center justify-center rounded p-0.5 text-red-600 hover:bg-red-50"
                                  title="YouTube"
                                >
                                  <IconYoutube size={13} />
                                </a>
                              ) : null}
                              <CommentButton
                                supabase={supabase}
                                entityType="OBRA"
                                entityId={item.id}
                                onClick={() =>
                                  setCommentsState({
                                    type: "OBRA",
                                    id: item.id,
                                    title: item.obras.titulo,
                                  })
                                }
                                className="p-0.5"
                              />
                              {isEditor ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => openEditModal(item)}
                                    className="shrink-0 rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-fixed-indigo-600"
                                    title="Editar obra"
                                  >
                                    <IconEdit size={12} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => removeWork(item.id)}
                                    className="shrink-0 rounded p-0.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                                    title="Quitar del programa"
                                  >
                                    <IconTrash size={12} />
                                  </button>
                                </>
                              ) : null}
                            </div>
                          );
                        })()}
                      </td>
                      <td className="p-1 text-center align-middle">
                        {isEditor ? (
                          <input
                            type="checkbox"
                            className="cursor-pointer accent-red-600"
                            checked={!!item.excluir}
                            onChange={(e) =>
                              updateWorkDetail(
                                item.id,
                                "excluir",
                                e.target.checked,
                              )
                            }
                            title="Excluir de la programación"
                          />
                        ) : item.excluir ? (
                          <span className="text-red-600 font-bold text-[10px]">
                            NO
                          </span>
                        ) : (
                          <span className="text-slate-200">-</span>
                        )}
                      </td>
                    </SortableRepertorioRow>
                  ))}
                  {isEditor && !isCompact && activeDragId && (rep.repertorio_obras || []).length > 0 && (
                    <BlockDropZoneRow
                      zoneId={BLOCK_ZONE_END(rep.id)}
                      colSpan={isDefinitionMode ? 12 : 11}
                      label="Soltar aquí para colocar al final"
                    />
                  )}
                  {isEditor && !isCompact && (
                    <QuickWorkRow
                      rep={rep}
                      definitionMode={isDefinitionMode}
                      isEditor={isEditor}
                      user={user}
                      supabase={supabase}
                      addWorkToBlock={addWorkToBlock}
                      fetchFullRepertoire={fetchFullRepertoire}
                      setQuickEntryFollowup={setQuickEntryFollowup}
                    />
                  )}
                </tbody>
              </table>
            </div>

            {isEditor && (
              <div className="bg-slate-50 border-t p-1">
                <button
                  onClick={() => {
                    setActiveRepertorioId(rep.id);
                    setIsAddModalOpen(true);
                  }}
                  className="w-full py-1 text-slate-400 hover:text-fixed-indigo-600 text-[10px] font-bold uppercase flex justify-center gap-1 hover:bg-slate-100"
                >
                  <IconPlus size={10} /> Agregar Obra
                </button>
              </div>
            )}
          </div>
        );
      })}
        </SortableContext>

        <DragOverlay dropAnimation={null} zIndex={9998}>
          {activeDragItemData ? (
            <div className="bg-white border border-slate-200 rounded-lg shadow-xl p-2 flex items-center gap-3 min-w-[280px] pointer-events-none">
              <IconGripVertical size={16} className="text-slate-400 shrink-0" />
              <span className="text-slate-500 font-bold text-xs w-5 text-center shrink-0">#</span>
              <span className="text-[11px] text-slate-600 truncate max-w-[120px]">
                {getComposers(activeDragItemData.item.obras)}
              </span>
              <span className="text-[11px] font-medium text-slate-800 truncate max-w-[180px]" title={activeDragItemData.item.obras?.titulo?.replace(/<[^>]*>?/gm, "")}>
                <RichTextPreview content={activeDragItemData.item.obras?.titulo} />
              </span>
              <span
                className={`text-[10px] font-mono text-slate-500 shrink-0 ${hasRepertorioObraDurationOverride(activeDragItemData.item) ? "italic text-indigo-800" : ""}`}
              >
                {formatRepertorioDuracionVisible(
                  effectiveRepertorioObraDurationSeconds(activeDragItemData.item),
                )}
              </span>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {!isCompact && (
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            {syncingDrive && (
              <span className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded">
                <IconLoader className="animate-spin inline mr-1" />
                Sincronizando carpetas de Drive
              </span>
            )}
          </div>
          {isEditor && (
            <button
              onClick={addRepertoireBlock}
              className="bg-fixed-indigo-600 text-white px-3 py-2 rounded text-sm font-bold flex items-center gap-2"
            >
              <IconPlus size={16} /> Bloque
            </button>
          )}
        </div>
      )}
        </>
      )}

      {/* MODAL BUSCAR */}
      {isAddModalOpen && isEditor && (
        <ModalPortal onClose={() => setIsAddModalOpen(false)}>
          <div className="bg-white w-full max-w-5xl h-[85vh] md:h-[80vh] rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95">
            <div className="p-3 border-b flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-700 flex gap-2">
                <IconSearch size={18} /> Buscar Obra
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <IconX size={20} />
              </button>
            </div>
            <div className="p-2 border-b grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,9rem)_minmax(14rem,2.75fr)_auto] gap-4 bg-white items-end">
              <div className="space-y-2 min-w-0">
                <div className="flex items-center text-xs font-bold text-slate-500 uppercase">Compositor</div>
                <input
                  type="text"
                  placeholder="Buscar..."
                  autoFocus
                  className="w-full p-1.5 border border-slate-300 rounded text-xs outline-none focus:border-indigo-500"
                  value={filters.compositor}
                  onChange={(e) =>
                    setFilters({ ...filters, compositor: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2 min-w-0">
                <div className="flex items-center text-xs font-bold text-slate-500 uppercase">Obra</div>
                <input
                  type="text"
                  placeholder="Buscar..."
                  className="w-full p-1.5 border border-slate-300 rounded text-xs outline-none focus:border-indigo-500"
                  value={filters.titulo}
                  onChange={(e) =>
                    setFilters({ ...filters, titulo: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2 min-w-0">
                <div className="flex items-center text-xs font-bold text-slate-500 uppercase">Arreglador</div>
                <input
                  type="text"
                  placeholder="Buscar..."
                  className="w-full p-1.5 border border-slate-300 rounded text-xs outline-none focus:border-indigo-500"
                  value={filters.arreglador}
                  onChange={(e) =>
                    setFilters({ ...filters, arreglador: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2 relative min-w-0 md:min-w-[14rem]">
                <div className="flex items-center text-xs font-bold text-slate-500 uppercase">Orgánico</div>
                <button
                  ref={addModalInstrFilterAnchorRef}
                  type="button"
                  onClick={() => setShowAddModalInstrFilter(!showAddModalInstrFilter)}
                  className={`w-full text-xs p-1.5 border rounded flex items-center justify-between gap-2 min-h-[2rem] ${addModalInstrFilters.length > 0 || addModalStringsFilter !== "all" ? "bg-indigo-50 border-indigo-300 text-indigo-700 font-bold" : "bg-white border-slate-300 text-slate-500"}`}
                >
                  <span className="truncate text-left">
                    {getInstrumentationFilterLabel(
                      addModalInstrFilters,
                      addModalStringsFilter,
                      addModalStrictMode,
                    )}
                  </span>
                  <IconFilter size={10} />
                </button>
                {showAddModalInstrFilter && (
                  <InstrumentationFilterModal
                    anchorRef={addModalInstrFilterAnchorRef}
                    onClose={() => setShowAddModalInstrFilter(false)}
                    currentFilters={addModalInstrFilters}
                    stringsFilter={addModalStringsFilter}
                    setStringsFilter={setAddModalStringsFilter}
                    strictMode={addModalStrictMode}
                    setStrictMode={setAddModalStrictMode}
                    onApply={(newRules) => {
                      setAddModalInstrFilters(newRules);
                      setShowAddModalInstrFilter(false);
                    }}
                  />
                )}
              </div>
              <div className="flex justify-end pb-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    openCreateModal();
                  }}
                  className="bg-fixed-indigo-600 text-white px-3 py-1.5 rounded text-xs font-bold hover:bg-fixed-indigo-700 flex items-center gap-1"
                >
                  <IconPlus size={12} /> Crear Solicitud
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {loadingLibrary ? (
                <div className="p-8 text-center text-fixed-indigo-600">
                  <IconLoader className="animate-spin inline" />
                </div>
              ) : !shouldFetchLibrary ? (
                <div className="p-8 text-center">
                  <div className="text-sm font-semibold text-slate-600">
                    Escribí compositor, obra o arreglador, o elegí un filtro de orgánico.
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Cargamos resultados bajo demanda para reducir consumo de datos.
                  </div>
                </div>
              ) : libraryError ? (
                <div className="p-8 text-center">
                  <div className="text-sm font-semibold text-red-600">
                    {libraryError}
                  </div>
                </div>
              ) : filteredLibrary.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="text-sm font-semibold text-slate-600">
                    Sin coincidencias con los filtros actuales.
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Probá limpiar filtros o crear una nueva solicitud.
                  </div>
                </div>
              ) : (
                <>
                  <div className="md:hidden p-2 space-y-2">
                    {filteredLibrary.map((w) => (
                      <div key={w.id} className={`rounded-lg border border-slate-200 p-3 shadow-sm ${getEstadoRowBgClass(w.estado)}`}>
                        <div className="text-[11px] text-slate-600 text-center">
                          {splitNamesLabel(w.compositor_full).map((c, idx) => (
                            <div key={idx} className="leading-tight">
                              <div className="font-semibold">{c.apellido}</div>
                              {c.nombre ? <div className="text-[10px] text-slate-500">{c.nombre}</div> : null}
                            </div>
                          ))}
                        </div>
                        {w.arreglador_full !== "-" && (
                          <div className="text-[10px] text-slate-500 truncate mt-0.5 text-center">
                            {splitNamesLabel(w.arreglador_full).map((a, idx) => (
                              <div key={idx} className="leading-tight">
                                <span className="font-semibold">{a.apellido}</span>
                                {a.nombre ? <span>{`, ${a.nombre}`}</span> : null}
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="text-xs text-slate-800 mt-1 line-clamp-2">
                          <RichTextPreview content={w.titulo} />
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-2 text-[10px] text-slate-500">
                          <span>Dur.: {formatSecondsToTime(w.duracion_segundos)}</span>
                          <span className="truncate">Instr.: {w.instrumentacion || calculateInstrumentation(w.obras_particellas) || "-"}</span>
                          <span>Año: {w.anio_composicion || "-"}</span>
                          <span>
                            Drive:{" "}
                            {w.link_drive ? (
                              <a href={w.link_drive} target="_blank" rel="noreferrer" className="text-blue-600 underline">Abrir</a>
                            ) : (
                              "-"
                            )}
                          </span>
                        </div>
                        <button
                          onClick={() => addWorkToBlock(w.id)}
                          className="mt-3 w-full min-h-11 bg-fixed-indigo-600 text-white rounded font-bold text-xs hover:bg-fixed-indigo-700"
                        >
                          Seleccionar
                        </button>
                      </div>
                    ))}
                  </div>
                  <table className="hidden md:table w-full table-fixed text-left text-xs">
                    <colgroup>
                      <col style={{ width: "18%" }} />
                      <col style={{ width: "26%" }} />
                      <col style={{ width: "10%" }} />
                      <col style={{ width: "4.25rem" }} />
                      <col style={{ width: "22%" }} />
                      <col style={{ width: "3rem" }} />
                      <col style={{ width: "2.75rem" }} />
                      <col style={{ width: "2.75rem" }} />
                      <col style={{ width: "5.5rem" }} />
                    </colgroup>
                    <thead className="bg-slate-50 text-slate-500 uppercase sticky top-0 font-bold shadow-sm">
                      <tr>
                        <th className="p-2 text-center align-middle">Compositor</th>
                        <th className="p-2">Obra</th>
                        <th className="p-2">Arreglador</th>
                        <th className="p-2 text-center">Duración</th>
                        <th className="p-2 text-center">Instr.</th>
                        <th className="p-2 text-center">Año</th>
                        <th className="p-2 text-center">Drive</th>
                        <th className="p-2 text-center">Notas</th>
                        <th className="p-2 text-right"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {filteredLibrary.map((w) => (
                        <tr key={w.id} className={`group ${getEstadoRowBgClass(w.estado)}`}>
                          <td className="p-2 text-center align-middle text-slate-600">
                            <div className="truncate" title={w.compositor_full}>
                              {splitNamesLabel(w.compositor_full).slice(0, 2).map((c, idx) => (
                                <div key={idx} className="leading-tight">
                                  <div className="truncate text-[11px] font-semibold text-slate-700">{c.apellido}</div>
                                  {c.nombre ? <div className="truncate text-[10px] text-slate-500">{c.nombre}</div> : null}
                                </div>
                              ))}
                            </div>
                          </td>
                          <td className="p-2 text-slate-800 truncate">
                            <RichTextPreview content={w.titulo} />
                          </td>
                          <td className="p-2 text-slate-500 truncate max-w-0">
                            {w.arreglador_full !== "-"
                              ? splitNamesLabel(w.arreglador_full).map((a, idx) => (
                                  <div key={idx} className="leading-tight">
                                    <span className="font-semibold text-[11px] text-slate-600">{a.apellido}</span>
                                    {a.nombre ? <span className="text-[10px] text-slate-500">{`, ${a.nombre}`}</span> : null}
                                  </div>
                                ))
                              : ""}
                          </td>
                          <td className="p-2 text-center font-mono text-[10px] text-slate-400 whitespace-nowrap">
                            {formatSecondsToTime(w.duracion_segundos)}
                          </td>
                          <td className="p-2 text-center font-mono text-[10px] text-slate-500 bg-slate-50/50 rounded align-middle">
                            <div className="line-clamp-3 break-all whitespace-normal" title={w.instrumentacion ||
                              calculateInstrumentation(w.obras_particellas) ||
                              "-"}>
                              {w.instrumentacion ||
                                calculateInstrumentation(w.obras_particellas) ||
                                "-"}
                            </div>
                          </td>
                          <td className="p-2 text-center text-slate-500">
                            {w.anio_composicion || "-"}
                          </td>
                          <td className="p-2 text-center">
                            {w.link_drive ? (
                              <a
                                href={w.link_drive}
                                target="_blank"
                                rel="noreferrer"
                                className="text-blue-600 hover:text-blue-800 inline-block p-1 bg-blue-50 rounded-full"
                              >
                                <IconDrive size={14} />
                              </a>
                            ) : (
                              <span className="text-slate-200">-</span>
                            )}
                          </td>
                          <td className="p-2 text-center">
                            {normalizeSearchText(w.observaciones) ? (
                              <button
                                type="button"
                                onClick={() => setObservacionesPreviewWork(w)}
                                className="inline-flex items-center justify-center rounded border border-yellow-200 bg-yellow-50 text-yellow-700 hover:bg-yellow-100 p-1"
                                title="Ver observaciones generales"
                              >
                                <IconAlertCircle size={12} />
                              </button>
                            ) : (
                              <span className="text-slate-200">-</span>
                            )}
                          </td>
                          <td className="p-2 text-right">
                            <button
                              onClick={() => addWorkToBlock(w.id)}
                              className="bg-white border border-fixed-indigo-200 text-fixed-indigo-600 px-2 py-1 rounded font-bold hover:bg-fixed-indigo-600 hover:text-white shadow-sm transition-colors text-[10px] min-h-9"
                            >
                              Seleccionar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {libraryHasMore && (
                    <div className="p-2 border-t border-slate-100 flex justify-center bg-white">
                      <button
                        type="button"
                        disabled={loadingLibrary}
                        onClick={() =>
                          fetchLibrary({ page: libraryPage + 1, append: true })
                        }
                        className="px-3 py-1.5 text-xs font-bold rounded border border-fixed-indigo-200 text-fixed-indigo-600 hover:bg-fixed-indigo-50 disabled:opacity-60"
                      >
                        {loadingLibrary ? "Cargando..." : "Cargar más"}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </ModalPortal>
      )}

      {observacionesPreviewWork && (
        <ModalPortal onClose={() => setObservacionesPreviewWork(null)}>
          <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-700">
                Observaciones generales
              </h3>
              <button
                onClick={() => setObservacionesPreviewWork(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <IconX size={18} />
              </button>
            </div>
            <div className="p-4 space-y-2">
              <div className="text-xs text-slate-500">
                <RichTextPreview content={observacionesPreviewWork.titulo} />
              </div>
              <div className="rounded border border-yellow-200 bg-yellow-50 p-3 text-sm text-slate-700 max-h-[55vh] overflow-auto">
                <RichTextPreview content={observacionesPreviewWork.observaciones} />
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {quickEntryFollowup && (
        <ModalPortal onClose={() => setQuickEntryFollowup(null)}>
          <div className="bg-white w-full max-w-md rounded-xl shadow-2xl p-5 overflow-hidden animate-in zoom-in-95">
            <h3 className="text-sm font-bold text-slate-800 mb-1 flex items-center gap-2">
              <IconLink size={16} className="text-fixed-indigo-600" />
              Enlaces de la nueva obra
            </h3>
            <p className="text-xs text-slate-500 mb-3">
              ¿Deseas agregar los enlaces ahora?
            </p>
            {(quickEntryFollowup.composerLabel || quickEntryFollowup.titulo) && (
              <div className="mb-3 rounded border border-slate-200 bg-slate-50 px-3 py-2">
                <div className="text-[11px] font-semibold text-slate-600 truncate">
                  {quickEntryFollowup.composerLabel}
                </div>
                <div className="text-[11px] text-slate-700 font-medium mt-0.5 line-clamp-2">
                  <RichTextPreview content={quickEntryFollowup.titulo} />
                </div>
              </div>
            )}
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                  Tipo de registro
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setQuickEntryFollowup((prev) => ({
                        ...prev,
                        estado: "Solicitud",
                      }))
                    }
                    className={`flex-1 px-2 py-1.5 text-[11px] font-semibold rounded border ${
                      (quickEntryFollowup.estado || "Solicitud") === "Solicitud"
                        ? "bg-amber-50 border-amber-400 text-amber-800"
                        : "bg-white border-slate-300 text-slate-500"
                    }`}
                  >
                    Solicitud
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setQuickEntryFollowup((prev) => ({
                        ...prev,
                        estado: "Informativo",
                      }))
                    }
                    className={`flex-1 px-2 py-1.5 text-[11px] font-semibold rounded border ${
                      quickEntryFollowup.estado === "Informativo"
                        ? "bg-sky-50 border-sky-400 text-sky-700"
                        : "bg-white border-slate-300 text-slate-500"
                    }`}
                  >
                    Informativo
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                  Carpeta Drive de material
                </label>
                <input
                  type="text"
                  value={quickEntryFollowup.link_drive || ""}
                  onChange={(e) =>
                    setQuickEntryFollowup((prev) => ({
                      ...prev,
                      link_drive: e.target.value,
                    }))
                  }
                  placeholder="URL de carpeta en Drive..."
                  className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs outline-none focus:ring-1 focus:ring-fixed-indigo-500 focus:border-fixed-indigo-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                  Link Audio / Video
                </label>
                <input
                  type="text"
                  value={quickEntryFollowup.link_youtube || ""}
                  onChange={(e) =>
                    setQuickEntryFollowup((prev) => ({
                      ...prev,
                      link_youtube: e.target.value,
                    }))
                  }
                  placeholder="Spotify / YouTube..."
                  className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs outline-none focus:ring-1 focus:ring-fixed-indigo-500 focus:border-fixed-indigo-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                  Observaciones (públicas)
                </label>
                <textarea
                  value={quickEntryFollowup.observaciones || ""}
                  onChange={(e) =>
                    setQuickEntryFollowup((prev) => ({
                      ...prev,
                      observaciones: e.target.value,
                    }))
                  }
                  rows={3}
                  className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs outline-none focus:ring-1 focus:ring-fixed-indigo-500 focus:border-fixed-indigo-500 resize-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                  Comentarios (internos)
                </label>
                <textarea
                  value={quickEntryFollowup.comentarios || ""}
                  onChange={(e) =>
                    setQuickEntryFollowup((prev) => ({
                      ...prev,
                      comentarios: e.target.value,
                    }))
                  }
                  rows={3}
                  className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs outline-none focus:ring-1 focus:ring-fixed-indigo-500 focus:border-fixed-indigo-500 resize-none bg-slate-50"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                  Notas específicas para este programa
                </label>
                <textarea
                  value={quickEntryFollowup.notas_especificas || ""}
                  onChange={(e) =>
                    setQuickEntryFollowup((prev) => ({
                      ...prev,
                      notas_especificas: e.target.value,
                    }))
                  }
                  rows={3}
                  className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs outline-none focus:ring-1 focus:ring-fixed-indigo-500 focus:border-fixed-indigo-500 resize-none"
                />
              </div>
            </div>
            <div className="flex justify-between gap-2 mt-4">
              <button
                type="button"
                onClick={() => setQuickEntryFollowup(null)}
                className="flex-1 py-2 text-[11px] font-bold text-slate-500 rounded border border-slate-200 hover:bg-slate-50"
              >
                Más tarde
              </button>
              <button
                type="button"
                onClick={handleQuickLinksSave}
                disabled={savingQuickLinks}
                className="flex-1 py-2 text-[11px] font-bold rounded bg-fixed-indigo-600 text-white hover:bg-fixed-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-1"
              >
                {savingQuickLinks ? (
                  <IconLoader size={14} className="animate-spin" />
                ) : (
                  <IconCheck size={14} />
                )}
                Guardar ahora
              </button>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* MODAL EDITAR (WORKFORM) */}
      {isEditWorkModalOpen && isEditor && (
        <ModalPortal onClose={() => setIsEditWorkModalOpen(false)}>
          <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto overflow-x-hidden rounded-xl bg-white p-2 shadow-2xl animate-in zoom-in-95 sm:p-3">
            <WorkForm
              supabase={supabase}
              formData={workFormData}
              onCancel={() => setIsEditWorkModalOpen(false)}
              onSave={handleWorkSaved}
              catalogoInstrumentos={instrumentList}
              context="program"
              onInsertExistingWork={async (workId) => {
                await addWorkToBlock(workId, activeRepertorioId);
                setIsEditWorkModalOpen(false);
              }}
            />
          </div>
        </ModalPortal>
      )}

      {commentsState && (
        <div
          className="fixed inset-0 z-[80] flex justify-end bg-black/20 backdrop-blur-[1px]"
          onClick={() => setCommentsState(null)}
        >
          <div onClick={(e) => e.stopPropagation()} className="h-full">
            <CommentsManager
              supabase={supabase}
              entityType={commentsState.type}
              entityId={commentsState.id}
              title={commentsState.title}
              onClose={() => setCommentsState(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

const containerClasses = (isCompact) =>
  isCompact
    ? "w-full min-w-0 bg-white"
    : "flex w-full min-w-0 flex-col items-stretch gap-8";
const tableHeaderClasses = (isCompact) =>
  isCompact
    ? "hidden"
    : "bg-blue-200 text-slate-700 border-b-2 border-slate-400 font-bold uppercase tracking-tight";
