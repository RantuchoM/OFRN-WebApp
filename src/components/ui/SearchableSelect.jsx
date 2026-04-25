import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { IconSearch, IconX, IconCheck } from './Icons';

export default function SearchableSelect({ 
    options = [], // Array de { id, label, subLabel }
    value,        // ID o Array de IDs (si es multi)
    onChange, 
    placeholder = "Buscar...", 
    isMulti = false,
    className = "",
    dropdownMinWidth = 250,
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState("");
    const containerRef = useRef(null);
    const [dropdownStyle, setDropdownStyle] = useState({});
    const [isDropUp, setIsDropUp] = useState(false);

    const normKey = (t) => String(t || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/\p{M}/gu, "");

    // Filtrado local (búsqueda insensible a mayúsculas/acentos)
    const filteredOptions = useMemo(() => {
        if (!search.trim()) return options.slice(0, 300);
        const s = normKey(search);
        return options
            .filter(
                (o) =>
                    normKey(o.label).includes(s) ||
                    (o.subLabel && normKey(o.subLabel).includes(s))
            )
            .slice(0, 80);
    }, [options, search]);

    // Calcular etiqueta seleccionada (Single); trim para alinear con datos viejos con espacios
    const selectedLabel = useMemo(() => {
        if (isMulti) return "";
        const v = value == null ? "" : String(value).trim();
        const found = options.find((o) => String(o.id).trim() === v);
        return found ? found.label : "";
    }, [options, value, isMulti]);

    // Calcular etiquetas seleccionadas (Multi)
    const selectedItems = useMemo(() => {
        if (!isMulti || !Array.isArray(value)) return [];
        return options.filter(o => value.includes(o.id));
    }, [options, value, isMulti]);

    // Posicionamiento del dropdown (inteligente: hacia abajo o hacia arriba)
    useEffect(() => {
        const updatePosition = () => {
            if (!isOpen || !containerRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();

            const estimatedHeight = 250; // max-h-60 (~240px) + buscador
            const spaceBelow = window.innerHeight - rect.bottom;
            const shouldDropUp =
                spaceBelow < estimatedHeight && rect.top > estimatedHeight;

            setIsDropUp(shouldDropUp);

            // position: fixed → coordenadas en px relativas al viewport.
            // getBoundingClientRect() ya es viewport; NO sumar scrollX/scrollY.
            const base = {
                left: rect.left,
                minWidth: dropdownMinWidth,
                width: Math.max(rect.width, dropdownMinWidth),
                zIndex: 99999,
            };

            if (shouldDropUp) {
                // Borde inferior del listado, 5px arriba del input (rect.top)
                setDropdownStyle({
                    ...base,
                    top: "auto",
                    bottom: window.innerHeight - rect.top + 5,
                });
            } else {
                setDropdownStyle({
                    ...base,
                    top: rect.bottom + 5,
                    bottom: "auto",
                });
            }
        };

        if (isOpen) {
            updatePosition();
            window.addEventListener("resize", updatePosition);
            const handleScroll = (e) => {
                const target = e.target;
                const insideTrigger = containerRef.current?.contains(target);
                const insideDropdown = target?.closest?.(".searchable-portal");
                if (!insideTrigger && !insideDropdown) {
                    setIsOpen(false);
                }
            };
            window.addEventListener("scroll", handleScroll, true);
            return () => {
                window.removeEventListener("resize", updatePosition);
                window.removeEventListener("scroll", handleScroll, true);
            };
        }
    }, [isOpen, dropdownMinWidth]);

    // Click outside
    useEffect(() => {
        const handleClick = (e) => {
            if (isOpen && containerRef.current && !containerRef.current.contains(e.target) && !e.target.closest('.searchable-portal')) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [isOpen]);

    const handleSelect = (id) => {
        if (isMulti) {
            const current = Array.isArray(value) ? value : [];
            const newValue = current.includes(id) 
                ? current.filter(x => x !== id) 
                : [...current, id];
            onChange(newValue);
            // En multi no cerramos al seleccionar para permitir elegir varios rápido
        } else {
            onChange(id);
            setIsOpen(false);
            setSearch("");
        }
    };

    const removeMultiItem = (e, id) => {
        e.stopPropagation();
        onChange(value.filter(x => x !== id));
    };

    return (
        <div className={`relative w-full ${className}`} ref={containerRef}>
            <div
                onClick={() => {
                    setSearch("");
                    setIsOpen(true);
                }}
                className={`${
                    isMulti
                        ? "min-h-10 py-1.5 px-2"
                        : "h-10 box-border px-3"
                } flex items-center border rounded-lg text-sm cursor-text bg-white ${
                    isOpen ? "border-indigo-500 ring-1 ring-indigo-500" : "border-slate-300"
                }`}
            >
                {isMulti ? (
                    <div className="flex flex-wrap gap-1 py-1">
                        {selectedItems.length > 0 ? selectedItems.map(item => (
                            <span key={item.id} className="bg-indigo-50 text-indigo-700 border border-indigo-100 px-1.5 rounded flex items-center gap-1">
                                {item.label}
                                <button onClick={(e) => removeMultiItem(e, item.id)} className="hover:text-indigo-900"><IconX size={10}/></button>
                            </span>
                        )) : <span className="text-slate-400">{placeholder}</span>}
                    </div>
                ) : (
                    selectedLabel ? (
                        <div className="flex items-center justify-between w-full">
                            <span className="truncate text-slate-700 font-medium">{selectedLabel}</span>
                            <button onClick={(e) => { e.stopPropagation(); onChange(null); }} className="p-0.5 hover:bg-slate-100 rounded text-slate-400"><IconX size={12}/></button>
                        </div>
                    ) : <span className="text-slate-400">{placeholder}</span>
                )}
            </div>

            {isOpen && createPortal(
                <div
                    className={`searchable-portal fixed bg-white border border-slate-300 shadow-xl rounded-lg flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-100 ${isDropUp ? 'origin-bottom' : 'origin-top'}`}
                    style={dropdownStyle}
                >
                    <div className="p-2 border-b border-slate-100 bg-slate-50">
                        <div className="relative">
                            <IconSearch size={14} className="absolute left-2 top-2 text-slate-400"/>
                            <input
                                type="text"
                                className="w-full pl-7 pr-2 py-1.5 text-xs border rounded outline-none focus:border-indigo-500"
                                placeholder="Escribí para filtrar…"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Escape") {
                                        setIsOpen(false);
                                        setSearch("");
                                    }
                                }}
                                autoFocus
                            />
                        </div>
                    </div>
                    <div className="overflow-y-auto max-h-60">
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map(opt => {
                                const isSelected = isMulti
                                    ? (value || []).includes(opt.id)
                                    : String(value == null ? "" : value).trim() === String(opt.id).trim();
                                const optionStatusClass = opt.optionClassName || "";
                                const optionLabelClass = opt.labelClassName || "text-slate-700";
                                const optionSubLabelClass = opt.subLabelClassName || "text-[10px] text-slate-500";
                                const hoverClass = optionStatusClass ? "" : "hover:bg-slate-50";
                                return (
                                    <div 
                                        key={opt.id} 
                                        onClick={() => handleSelect(opt.id)} 
                                        className={`px-3 py-2 text-xs cursor-pointer border-b border-slate-50 last:border-0 flex items-center justify-between ${isSelected ? 'bg-indigo-50' : ''} ${hoverClass} ${optionStatusClass}`}
                                    >
                                        <div className="flex flex-col">
                                            <span className={`font-bold ${optionLabelClass}`}>{opt.label}</span>
                                            {opt.subLabel && <span className={optionSubLabelClass}>{opt.subLabel}</span>}
                                        </div>
                                        {isSelected && <IconCheck size={14} className="text-indigo-600"/>}
                                    </div>
                                )
                            })
                        ) : (
                            <div className="p-4 text-center text-slate-400 text-xs italic">No se encontraron resultados.</div>
                        )}
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}