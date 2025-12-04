import React, { useState, useEffect, useRef } from 'react';
import { IconLayers, IconChevronDown, IconCheck } from '../ui/Icons';

export default function EnsembleMultiSelect({ ensembles, selectedEnsembleIds, onChange }) {
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
        const newSelection = new Set(selectedEnsembleIds);
        if (newSelection.has(id)) {
            newSelection.delete(id);
        } else {
            newSelection.add(id);
        }
        onChange(newSelection);
    };

    const count = selectedEnsembleIds.size;

    return (
        <div className="relative" ref={dropdownRef}>
            <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Ensambles Asignados</label>
            <button 
                type="button" // Importante para evitar submits accidentales
                onClick={() => setIsOpen(!isOpen)} 
                className="w-full flex items-center justify-between gap-2 p-2 bg-white border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none transition-colors text-left"
            >
                <div className="flex items-center gap-2 overflow-hidden">
                    <IconLayers size={16} className="text-slate-400 shrink-0"/>
                    <span className={`text-sm truncate ${count === 0 ? 'text-slate-400' : 'text-slate-700'}`}>
                        {count === 0 ? "Ningún ensamble seleccionado" : `${count} ensamble(s) seleccionado(s)`}
                    </span>
                </div>
                <IconChevronDown size={14} className={`text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}/>
            </button>
            
            {isOpen && (
                <div className="absolute top-full left-0 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-xl z-50 overflow-hidden flex flex-col max-h-[200px]">
                    <div className="overflow-y-auto p-1 space-y-0.5">
                        {ensembles.map(ens => (
                            <label key={ens.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded cursor-pointer checkbox-wrapper group">
                                <input 
                                    type="checkbox" 
                                    className="hidden" 
                                    checked={selectedEnsembleIds.has(ens.id)} 
                                    onChange={() => toggleSelection(ens.id)}
                                />
                                <div className={`w-4 h-4 border border-slate-300 rounded flex items-center justify-center transition-colors group-hover:border-indigo-400 shrink-0 ${selectedEnsembleIds.has(ens.id) ? 'bg-indigo-600 border-indigo-600' : 'bg-white'}`}>
                                    <IconCheck size={10} className={`text-white ${selectedEnsembleIds.has(ens.id) ? 'block' : 'hidden'}`}/>
                                </div>
                                <span className="text-sm text-slate-700 truncate">{ens.ensamble}</span>
                            </label>
                        ))}
                        {ensembles.length === 0 && <div className="p-3 text-xs text-slate-400 text-center">No hay ensambles disponibles.</div>}
                    </div>
                </div>
            )}
        </div>
    );
}