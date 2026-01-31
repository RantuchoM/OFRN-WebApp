import React, { useState, useEffect, useRef, useMemo } from 'react';
import { IconSearch, IconArrowRight } from './Icons';

export default function CommandPalette({ isOpen, onClose, actions = [] }) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);

  // Filtrado
  const filteredActions = useMemo(() => {
      if (!query) return actions.slice(0, 10); // Mostrar primeros 10 si no hay búsqueda
      return actions.filter(action => 
        action.label.toLowerCase().includes(query.toLowerCase())
      );
  }, [query, actions]);

  useEffect(() => { setSelectedIndex(0); }, [query, isOpen]);

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 50);
    else setQuery("");
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % filteredActions.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filteredActions.length) % filteredActions.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredActions[selectedIndex]) {
          filteredActions[selectedIndex].run();
          onClose();
        }
      } else if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredActions, selectedIndex, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh] px-4 bg-slate-900/40 backdrop-blur-sm transition-all" onClick={onClose}>
      <div className="w-full max-w-lg bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
        
        {/* Buscador */}
        <div className="flex items-center px-4 border-b border-slate-100 py-3">
          <IconSearch className="text-slate-400 mr-3" size={20} />
          <input
            ref={inputRef}
            type="text"
            className="flex-1 text-base outline-none text-slate-700 placeholder:text-slate-400 bg-transparent"
            placeholder="Buscar gira, comando o vista..."
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">ESC</span>
        </div>

        {/* Lista */}
        <div className="max-h-[60vh] overflow-y-auto p-2">
          {filteredActions.length > 0 ? (
            <div className="space-y-1">
              {filteredActions.map((action, idx) => (
                <button
                  key={action.id || idx}
                  onClick={() => { action.run(); onClose(); }}
                  className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center justify-between text-sm transition-colors group ${
                    idx === selectedIndex ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                  onMouseEnter={() => setSelectedIndex(idx)}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <span className={`shrink-0 p-1.5 rounded-md ${idx === selectedIndex ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-white group-hover:shadow-sm'}`}>
                        {action.icon || <IconArrowRight size={14}/>}
                    </span>
                    <div className="flex flex-col truncate">
                        <span className="truncate font-medium">{action.label}</span>
                        {/* Mostramos la sección pequeñita si existe */}
                        {action.section && <span className={`text-[9px] uppercase tracking-wider ${idx === selectedIndex ? 'text-indigo-200' : 'text-slate-400'}`}>{action.section}</span>}
                    </div>
                  </div>
                  {idx === selectedIndex && <IconArrowRight size={14} className="opacity-80"/>}
                </button>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-slate-400 text-sm">
              No se encontraron resultados para "{query}"
            </div>
          )}
        </div>
      </div>
    </div>
  );
}