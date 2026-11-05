import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { IconFilter, IconChevronDown, IconCheck } from '../ui/Icons';

export default function InstrumentFilter({ catalogo, selectedIds, onChange }) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);
    const [dropdownStyle, setDropdownStyle] = useState({});

    useEffect(() => {
        if (!isOpen || !containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        setDropdownStyle({
            top: rect.bottom + window.scrollY + 5,
            left: Math.min(rect.left + window.scrollX, window.innerWidth - 300),
            width: '288px',
            zIndex: 99999,
        });
    }, [isOpen]);

    const toggleSelection = (id) => {
        const newSelection = new Set(selectedIds);
        if (newSelection.has(id)) {
            newSelection.delete(id);
        } else {
            newSelection.add(id);
        }
        onChange(newSelection);
    };

    const selectAll = () => {
        const allIds = new Set(catalogo.map(c => c.id));
        allIds.add('null');
        onChange(allIds);
    };

    const deselectAll = () => onChange(new Set());

    const count = selectedIds.size;
    const total = catalogo.length + 1;

    return (
        <div className="relative" ref={containerRef}>
            <button onClick={() => setIsOpen(!isOpen)} className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-white border border-slate-300 rounded hover:border-indigo-500 transition-colors text-sm font-medium text-slate-700 shadow-sm">
                <div className="flex items-center gap-2">
                    <IconFilter size={16} className="text-indigo-600"/>
                    <span>Instrumentos</span>
                    {count < total && (<span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-0.5 rounded-full">{count}</span>)}
                </div>
                <IconChevronDown size={16} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}/>
            </button>
            {isOpen &&
                createPortal(
                    <>
                        <div
                            className="fixed inset-0 z-[99998]"
                            onClick={() => setIsOpen(false)}
                        />
                        <div
                            className="fixed bg-white border border-slate-200 rounded-lg shadow-xl z-[99999] overflow-hidden flex flex-col max-h-[400px] animate-in fade-in slide-in-from-top-1"
                            style={dropdownStyle}
                        >
                            <div className="p-2 border-b border-slate-100 flex gap-2 bg-slate-50">
                                <button onClick={selectAll} className="flex-1 text-xs bg-white border hover:bg-slate-50 text-slate-600 px-2 py-1 rounded">Marcar Todos</button>
                                <button onClick={deselectAll} className="flex-1 text-xs bg-white border hover:bg-slate-50 text-slate-600 px-2 py-1 rounded">Desmarcar</button>
                            </div>
                            <div className="overflow-y-auto p-2 space-y-1">
                                <label className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded cursor-pointer checkbox-wrapper group">
                                    <input type="checkbox" className="hidden" checked={selectedIds.has('null')} onChange={() => toggleSelection('null')}/>
                                    <div className={`w-5 h-5 border-2 border-slate-300 rounded flex items-center justify-center transition-colors group-hover:border-indigo-400 ${selectedIds.has('null') ? 'bg-indigo-600 border-indigo-600' : 'bg-white'}`}>
                                        <IconCheck size={12} className={`text-white ${selectedIds.has('null') ? 'block' : 'hidden'}`}/>
                                    </div>
                                    <span className="text-sm text-slate-700 italic">-- Sin Instrumento --</span>
                                </label>
                                <hr className="border-slate-100 my-1"/>
                                {catalogo.map(inst => (
                                    <label key={inst.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded cursor-pointer checkbox-wrapper group">
                                        <input type="checkbox" className="hidden" checked={selectedIds.has(inst.id)} onChange={() => toggleSelection(inst.id)}/>
                                        <div className={`w-5 h-5 border-2 border-slate-300 rounded flex items-center justify-center transition-colors group-hover:border-indigo-400 ${selectedIds.has(inst.id) ? 'bg-indigo-600 border-indigo-600' : 'bg-white'}`}>
                                            <IconCheck size={12} className={`text-white ${selectedIds.has(inst.id) ? 'block' : 'hidden'}`}/>
                                        </div>
                                        <span className="text-sm text-slate-700">{inst.instrumento}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </>,
                    document.body,
                )}
        </div>
    );
}
