import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { IconSearch, IconArrowRight, IconLoader, IconUser, IconMusicNote } from "./Icons";
import { getSearchHighlightRanges } from "../../utils/sanitize";
import { PALETTE_ENTITY_MIN_QUERY, rankPaletteCommands } from "../../utils/commandPaletteEntitySearch";

const HighlightSearchMatch = ({ text, query }) => {
  const rawText = String(text ?? "");
  const ranges = getSearchHighlightRanges(rawText, query);
  if (!ranges.length) return <>{rawText}</>;

  const parts = [];
  let cursor = 0;
  ranges.forEach(([start, end], idx) => {
    if (cursor < start) parts.push(<span key={`t-${idx}`}>{rawText.slice(cursor, start)}</span>);
    parts.push(
      <mark key={`m-${idx}`} className="bg-yellow-200 text-yellow-900 rounded-sm px-0.5">
        {rawText.slice(start, end)}
      </mark>,
    );
    cursor = end;
  });
  if (cursor < rawText.length) parts.push(<span key="tail">{rawText.slice(cursor)}</span>);

  return <>{parts}</>;
};

const SEARCH_MODE_UI = {
  obra: {
    placeholder: "Título, compositor o id…",
    title: "Buscar repertorio",
    empty: "Escribí al menos 2 caracteres para buscar en el archivo (sin cargar el catálogo completo).",
  },
  persona: {
    placeholder: "Nombre, instrumento o id…",
    title: "Buscar personas",
    empty: "Escribí al menos 2 caracteres para buscar integrantes (sin cargar el padrón completo).",
  },
};

const PALETTE_VIEWS = {
  comandos: {
    id: "comandos",
    label: "Comandos",
    placeholder: "Buscar comando o gira...",
    Icon: IconSearch,
    tabActive: "bg-indigo-600 text-white shadow-sm",
    row: "bg-indigo-600 text-white shadow-md",
    rowSub: "text-indigo-100",
    bar: "bg-indigo-500",
    field: "border-indigo-100",
  },
  persona: {
    id: "persona",
    label: "Personas",
    placeholder: SEARCH_MODE_UI.persona.placeholder,
    Icon: IconUser,
    tabActive: "bg-emerald-600 text-white shadow-sm",
    row: "bg-emerald-600 text-white shadow-md",
    rowSub: "text-emerald-100",
    bar: "bg-emerald-500",
    field: "border-emerald-200",
  },
  obra: {
    id: "obra",
    label: "Repertorio",
    placeholder: SEARCH_MODE_UI.obra.placeholder,
    Icon: IconMusicNote,
    tabActive: "bg-violet-600 text-white shadow-sm",
    row: "bg-violet-600 text-white shadow-md",
    rowSub: "text-violet-100",
    bar: "bg-violet-500",
    field: "border-violet-200",
  },
};

export default function CommandPalette({
  isOpen,
  onClose,
  actions = [],
  canSearchPeople = false,
  canSearchObras = false,
  entityActions = [],
  isSearchingEntities = false,
  searchMode = null,
  onExitSearchMode,
  onSearchModeChange,
  onQueryChange,
}) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const inEntityMode = searchMode === "obra" || searchMode === "persona";
  const modeUi = SEARCH_MODE_UI[searchMode];
  const views = useMemo(() => {
    const next = [PALETTE_VIEWS.comandos];
    if (canSearchPeople) next.push(PALETTE_VIEWS.persona);
    if (canSearchObras) next.push(PALETTE_VIEWS.obra);
    return next;
  }, [canSearchPeople, canSearchObras]);
  const activeViewId = inEntityMode ? searchMode : "comandos";
  const activeView = PALETTE_VIEWS[activeViewId] || PALETTE_VIEWS.comandos;

  const filteredCommands = useMemo(() => {
    if (inEntityMode) return [];
    return rankPaletteCommands(actions, query);
  }, [query, actions, inEntityMode]);

  const visibleActions = inEntityMode ? entityActions : filteredCommands;

  const runAction = useCallback(
    (action) => {
      if (!action) return;
      if (action.keepOpen) {
        setQuery("");
        action.run?.();
        return;
      }
      action.run?.();
      onClose();
    },
    [onClose],
  );

  const exitMode = useCallback(() => {
    setQuery("");
    onExitSearchMode?.();
  }, [onExitSearchMode]);

  const selectView = useCallback(
    (viewId) => {
      if (viewId === activeViewId) {
        inputRef.current?.focus();
        return;
      }
      if (viewId === "comandos") onExitSearchMode?.();
      else onSearchModeChange?.(viewId);
      setTimeout(() => inputRef.current?.focus(), 0);
    },
    [activeViewId, onExitSearchMode, onSearchModeChange],
  );

  const cycleView = useCallback(
    (direction) => {
      if (views.length < 2) {
        inputRef.current?.focus();
        return;
      }
      const idx = views.findIndex((view) => view.id === activeViewId);
      const safeIdx = idx === -1 ? 0 : idx;
      const next = views[(safeIdx + direction + views.length) % views.length];
      selectView(next.id);
    },
    [views, activeViewId, selectView],
  );

  useEffect(() => { setSelectedIndex(0); }, [query, isOpen, visibleActions.length, searchMode]);

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 50);
    else setQuery("");
  }, [isOpen, searchMode]);

  useEffect(() => {
    onQueryChange?.(isOpen ? query : "", isOpen ? searchMode : null);
  }, [isOpen, query, searchMode, onQueryChange]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Tab" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        e.stopPropagation();
        cycleView(e.shiftKey ? -1 : 1);
        return;
      }
      if (e.key === "ArrowDown") {
        if (!visibleActions.length) return;
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % visibleActions.length);
      } else if (e.key === "ArrowUp") {
        if (!visibleActions.length) return;
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + visibleActions.length) % visibleActions.length);
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (visibleActions[selectedIndex]) runAction(visibleActions[selectedIndex]);
      } else if (e.key === "Escape") {
        e.preventDefault();
        if (inEntityMode) {
          if (query) setQuery("");
          else exitMode();
        } else {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [isOpen, visibleActions, selectedIndex, onClose, exitMode, inEntityMode, query, runAction, cycleView]);

  useEffect(() => {
    const selectedEl = listRef.current?.querySelector("[data-palette-selected='true']");
    selectedEl?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex, visibleActions]);

  if (!isOpen || typeof document === "undefined") return null;

  const rows = [];
  let lastSection = null;
  visibleActions.forEach((action, idx) => {
    if (action.section && action.section !== lastSection) {
      lastSection = action.section;
      rows.push(
        <div
          key={`sec-${idx}-${action.section}`}
          className="px-3 pt-2 pb-1 text-[9px] font-bold uppercase tracking-wider text-slate-400"
        >
          {action.section}
        </div>,
      );
    }
    rows.push(
      <button
        key={action.id || idx}
        type="button"
        tabIndex={-1}
        data-palette-selected={idx === selectedIndex ? "true" : undefined}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => runAction(action)}
        onMouseMove={(e) => {
          if (!e.movementX && !e.movementY) return;
          setSelectedIndex(idx);
        }}
        className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center justify-between text-sm transition-colors group ${
          idx === selectedIndex ? activeView.row : "text-slate-600 hover:bg-slate-50"
        }`}
      >
        <div className="flex items-center gap-3 overflow-hidden">
          <span className={`shrink-0 p-1.5 rounded-md ${idx === selectedIndex ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500 group-hover:bg-white group-hover:shadow-sm"}`}>
            {action.icon || <IconArrowRight size={14} />}
          </span>
          <div className="flex flex-col truncate">
            <span className="truncate font-medium">
              <HighlightSearchMatch text={action.label} query={query} />
            </span>
            {action.subtitle && (
              <span className={`truncate text-[11px] ${idx === selectedIndex ? activeView.rowSub : "text-slate-400"}`}>
                <HighlightSearchMatch text={action.subtitle} query={query} />
              </span>
            )}
          </div>
        </div>
        {idx === selectedIndex && <IconArrowRight size={14} className="opacity-80 shrink-0" />}
      </button>,
    );
  });

  const showTypeHint =
    inEntityMode && query.trim().length > 0 && query.trim().length < PALETTE_ENTITY_MIN_QUERY;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh] px-4 bg-slate-900/40 backdrop-blur-sm transition-all" onClick={onClose}>
      <div
        data-palette-view={activeViewId}
        className="w-full max-w-lg bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`h-1.5 w-full transition-colors duration-200 ${activeView.bar}`} />

        {views.length > 1 && (
          <div className="px-3 pt-3">
            <div
              role="tablist"
              aria-label="Vista de búsqueda"
              className="grid gap-1 rounded-lg bg-slate-100 p-1"
              style={{ gridTemplateColumns: `repeat(${views.length}, minmax(0, 1fr))` }}
            >
              {views.map((view) => {
                const selected = view.id === activeViewId;
                const ViewIcon = view.Icon;
                return (
                  <button
                    key={view.id}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    tabIndex={-1}
                    data-palette-view-tab={view.id}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => selectView(view.id)}
                    className={`flex items-center justify-center gap-1.5 rounded-md px-2 py-2 text-xs font-semibold transition-colors ${
                      selected ? view.tabActive : "text-slate-500 hover:bg-white/70 hover:text-slate-800"
                    }`}
                  >
                    <ViewIcon size={14} />
                    {view.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className={`flex items-center px-4 border-b py-3 transition-colors ${activeView.field}`}>
          <IconSearch className="text-slate-400 mr-3 shrink-0" size={20} />
          <input
            ref={inputRef}
            type="text"
            className="flex-1 text-base outline-none text-slate-700 placeholder:text-slate-400 bg-transparent"
            placeholder={activeView.placeholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="flex items-center gap-1 shrink-0 ml-2">
            {isSearchingEntities && <IconLoader size={16} className="text-slate-400 mr-1" />}
            {views.length > 1 && (
              <span title="Cambiar de vista" className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                Tab
              </span>
            )}
            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">ESC</span>
          </div>
        </div>

        <div key={activeViewId} ref={listRef} className="max-h-[60vh] overflow-y-auto p-2 animate-in fade-in duration-150">
          {inEntityMode && !query.trim() && (
            <div className="px-3 py-6 text-center text-slate-400 text-sm">
              {modeUi.empty}
            </div>
          )}
          {showTypeHint && (
            <div className="px-3 py-1 text-[11px] text-slate-400">
              Escribí al menos {PALETTE_ENTITY_MIN_QUERY} caracteres.
            </div>
          )}
          {visibleActions.length > 0 ? (
            <div className="space-y-0.5">{rows}</div>
          ) : inEntityMode && query.trim().length >= PALETTE_ENTITY_MIN_QUERY ? (
            isSearchingEntities ? (
              <div className="py-8 text-center text-slate-400 text-sm">Buscando…</div>
            ) : (
              <div className="py-8 text-center text-slate-400 text-sm">
                No se encontraron resultados para "{query}"
              </div>
            )
          ) : !inEntityMode && query.trim() ? (
            <div className="py-8 text-center text-slate-400 text-sm">
              No se encontraron resultados para "{query}"
            </div>
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  );
}
