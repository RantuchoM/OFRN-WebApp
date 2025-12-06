import React, { useState, useRef, useEffect } from 'react';
import { IconTag, IconChevronDown, IconCheck, IconX } from '../ui/Icons';

export default function TagMultiSelect({ tags, selectedIds, onChange }) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
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

    const count = selectedIds.size;

    // Filtramos los objetos completos de los tags seleccionados para poder mostrar su nombre
    const selectedTagsDisplay = tags.filter(t => selectedIds.has(t.id));

    return (
        <div className="relative" ref={dropdownRef}>
            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Palabras Clave</label>
            
            {/* BOTÓN DESPLEGABLE */}
            <button 
                type="button" 
                onClick={() => setIsOpen(!isOpen)} 
                className="w-full flex items-center justify-between gap-2 p-2 bg-white border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none transition-colors text-left"
            >
                <div className="flex items-center gap-2 overflow-hidden">
                    <IconTag size={16} className="text-slate-400 shrink-0"/>
                    <span className={`text-sm truncate ${count === 0 ? 'text-slate-400' : 'text-slate-700'}`}>
                        {count === 0 ? "Seleccionar tags..." : `${count} seleccionados`}
                    </span>
                </div>
                <IconChevronDown size={14} className={`text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}/>
            </button>
            
            {/* MENÚ DESPLEGABLE */}
            {isOpen && (
                <div className="absolute top-full left-0 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-xl z-50 overflow-hidden flex flex-col max-h-[200px]">
                    <div className="overflow-y-auto p-1 space-y-0.5">
                        {tags.map(tag => (
                            <label key={tag.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded cursor-pointer group">
                                <input 
                                    type="checkbox" 
                                    className="hidden" 
                                    checked={selectedIds.has(tag.id)} 
                                    onChange={() => toggleSelection(tag.id)}
                                />
                                <div className={`w-4 h-4 border border-slate-300 rounded flex items-center justify-center transition-colors group-hover:border-indigo-400 shrink-0 ${selectedIds.has(tag.id) ? 'bg-indigo-600 border-indigo-600' : 'bg-white'}`}>
                                    <IconCheck size={10} className={`text-white ${selectedIds.has(tag.id) ? 'block' : 'hidden'}`}/>
                                </div>
                                <span className="text-sm text-slate-700 truncate">{tag.tag}</span>
                            </label>
                        ))}
                        {tags.length === 0 && <div className="p-3 text-xs text-slate-400 text-center">No hay etiquetas cargadas.</div>}
                    </div>
                </div>
            )}

            {/* CHIPS DE SELECCIÓN (NUEVO) */}
            {selectedTagsDisplay.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                    {selectedTagsDisplay.map(tag => (
                        <span 
                            key={tag.id} 
                            className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-indigo-50 text-indigo-700 border border-indigo-100 text-[10px] font-bold uppercase tracking-wide animate-in fade-in zoom-in-95 duration-200"
                        >
                            {tag.tag}
                            <button 
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation(); // Evita que se abra/cierre el menú al borrar
                                    toggleSelection(tag.id);
                                }}
                                className="text-indigo-400 hover:text-red-500 hover:bg-white rounded-full p-0.5 transition-colors"
                            >
                                <IconX size={10} />
                            </button>
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
}