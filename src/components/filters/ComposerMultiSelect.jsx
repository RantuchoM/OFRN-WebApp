import React, { useState, useRef, useEffect } from 'react';
import { IconUsers, IconChevronDown, IconCheck, IconX } from '../ui/Icons';

export default function ComposerMultiSelect({ compositores, selectedIds, onChange }) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);
    const [search, setSearch] = useState("");

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setIsOpen(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const toggleSelection = (id) => {
        const newSelection = new Set(selectedIds);
        if (newSelection.has(id)) newSelection.delete(id);
        else newSelection.add(id);
        onChange(newSelection);
    };

    // Filtro simple para buscar en la lista
    const filteredList = compositores.filter(c => 
        `${c.apellido}, ${c.nombre}`.toLowerCase().includes(search.toLowerCase())
    );

    const selectedDisplay = compositores.filter(c => selectedIds.has(c.id));

    return (
        <div className="relative" ref={dropdownRef}>
            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Compositores</label>
            <button type="button" onClick={() => setIsOpen(!isOpen)} className="w-full flex items-center justify-between gap-2 p-2 bg-white border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none text-left">
                <div className="flex items-center gap-2 overflow-hidden">
                    <IconUsers size={16} className="text-slate-400 shrink-0"/>
                    <span className={`text-sm truncate ${selectedIds.size === 0 ? 'text-slate-400' : 'text-slate-700'}`}>
                        {selectedIds.size === 0 ? "Seleccionar..." : `${selectedIds.size} seleccionados`}
                    </span>
                </div>
                <IconChevronDown size={14} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}/>
            </button>
            
            {isOpen && (
                <div className="absolute top-full left-0 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-xl z-50 overflow-hidden flex flex-col max-h-[250px]">
                    <div className="p-2 border-b border-slate-50">
                        <input type="text" autoFocus placeholder="Buscar..." className="w-full text-xs p-1 border rounded outline-none" value={search} onChange={e => setSearch(e.target.value)} />
                    </div>
                    <div className="overflow-y-auto p-1 space-y-0.5">
                        {filteredList.map(c => (
                            <label key={c.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded cursor-pointer group">
                                <input type="checkbox" className="hidden" checked={selectedIds.has(c.id)} onChange={() => toggleSelection(c.id)}/>
                                <div className={`w-4 h-4 border border-slate-300 rounded flex items-center justify-center shrink-0 ${selectedIds.has(c.id) ? 'bg-indigo-600 border-indigo-600' : 'bg-white'}`}>
                                    <IconCheck size={10} className={`text-white ${selectedIds.has(c.id) ? 'block' : 'hidden'}`}/>
                                </div>
                                <span className="text-sm text-slate-700 truncate">{c.apellido}, {c.nombre}</span>
                            </label>
                        ))}
                    </div>
                </div>
            )}

            {/* CHIPS */}
            {selectedDisplay.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                    {selectedDisplay.map(c => (
                        <span key={c.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100 text-[10px] font-bold uppercase">
                            {c.apellido}
                            <button type="button" onClick={() => toggleSelection(c.id)} className="hover:text-red-500"><IconX size={10}/></button>
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
}