import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { IconSearch, IconArrowRight, IconLoader, IconChevronLeft } from "./Icons";
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

export default function CommandPalette({
  isOpen,
  onClose,
  actions = [],
  entityActions = [],
  isSearchingEntities = false,
  searchMode = null,
  onExitSearchMode,
  onQueryChange,
}) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const inEntityMode = searchMode === "obra" || searchMode === "persona";
  const modeUi = SEARCH_MODE_UI[searchMode];

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

  useEffect(() => { setSelectedIndex(0); }, [query, isOpen, visibleActions.length, searchMode]);

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 50);
    else setQuery("");
  }, [isOpen]);

  useEffect(() => {
    if (inEntityMode) {
      setQuery("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [searchMode, inEntityMode]);

  useEffect(() => {
    onQueryChange?.(isOpen ? query : "", isOpen ? searchMode : null);
  }, [isOpen, query, searchMode, onQueryChange]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
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
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, visibleActions, selectedIndex, onClose, exitMode, inEntityMode, query, runAction]);

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
        data-palette-selected={idx === selectedIndex ? "true" : undefined}
        onClick={() => runAction(action)}
        className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center justify-between text-sm transition-colors group ${
          idx === selectedIndex ? "bg-indigo-600 text-white shadow-md" : "text-slate-600 hover:bg-slate-50"
        }`}
        onMouseEnter={() => setSelectedIndex(idx)}
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
              <span className={`truncate text-[11px] ${idx === selectedIndex ? "text-indigo-100" : "text-slate-400"}`}>
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
      <div className="w-full max-w-lg bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>

        {inEntityMode && (
          <div className="flex items-center gap-2 px-3 pt-3 pb-0">
            <button
              type="button"
              onClick={exitMode}
              className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800"
              title="Volver a comandos"
            >
              <IconChevronLeft size={16} />
            </button>
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600">
              {modeUi.title}
            </span>
          </div>
        )}

        <div className="flex items-center px-4 border-b border-slate-100 py-3">
          <IconSearch className="text-slate-400 mr-3" size={20} />
          <input
            ref={inputRef}
            type="text"
            className="flex-1 text-base outline-none text-slate-700 placeholder:text-slate-400 bg-transparent"
            placeholder={modeUi?.placeholder || "Buscar comando o gira..."}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {isSearchingEntities ? (
            <IconLoader size={16} className="text-indigo-500 mr-2" />
          ) : (
            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">ESC</span>
          )}
        </div>

        <div ref={listRef} className="max-h-[60vh] overflow-y-auto p-2">
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
