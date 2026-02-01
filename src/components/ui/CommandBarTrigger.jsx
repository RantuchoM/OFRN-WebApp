import React from 'react';
import { IconSearch } from './Icons';

export const CommandBarTrigger = ({ className = "" }) => {
  // Lógica nativa pura: Despacha un evento personalizado al navegador
  const handleClick = () => {
    const event = new CustomEvent('open-command-palette');
    window.dispatchEvent(event);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      title="Abrir menú (Ctrl+K)"
      className={`
        group flex items-center justify-between 
        bg-white border border-slate-200 rounded-lg 
        hover:border-indigo-400 hover:ring-2 hover:ring-indigo-50 
        transition-all duration-200 shadow-sm cursor-text
        text-left px-3 py-2
        ${className}
      `}
    >
      <div className="flex items-center gap-2 overflow-hidden">
        <IconSearch size={16} className="text-slate-400 group-hover:text-indigo-500 transition-colors shrink-0" />
        <span className="text-sm text-slate-400 font-medium group-hover:text-slate-600 truncate">
          Buscar o navegar...
        </span>
      </div>
      
      <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity ml-2 shrink-0">
        <kbd className="hidden sm:inline-flex items-center justify-center min-w-[20px] h-5 px-1 text-[10px] font-sans font-bold text-slate-500 bg-slate-100 border border-slate-300 rounded">
          Ctrl
        </kbd>
        <span className="text-slate-300 text-xs hidden sm:inline">+</span>
        <kbd className="hidden sm:inline-flex items-center justify-center min-w-[20px] h-5 px-1 text-[10px] font-sans font-bold text-slate-500 bg-slate-100 border border-slate-300 rounded">
          K
        </kbd>
      </div>
    </button>
  );
};

export default CommandBarTrigger;