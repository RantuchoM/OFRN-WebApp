import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { IconCalendar } from './Icons';

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

/** Día de la semana abreviado a 2 letras en mayúsculas (LU, MA, etc.). */
const getDayBrief = (val) => {
    if (!val) return '';
    const [y, m, d] = val.split('-');
    const date = new Date(y, m - 1, d);
    const day = new Intl.DateTimeFormat('es-AR', { weekday: 'short' }).format(date);
    return day.substring(0, 2).toUpperCase();
};

function toIso(y, m, d) {
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

// Calendario tipo cuadrícula: solo mes/año + días, sin input de texto
function MiniCalendar({ value, onSelect }) {
    const [y, m] = value
        ? (() => {
            const [yy, mm] = value.split('-').map(Number);
            return [yy || new Date().getFullYear(), mm || new Date().getMonth() + 1];
        })()
        : [new Date().getFullYear(), new Date().getMonth() + 1];
    const [year, setYear] = useState(y);
    const [month, setMonth] = useState(m);

    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const startPad = firstDay.getDay();
    const daysInMonth = lastDay.getDate();
    const selectedParts = value ? value.split('-').map(Number) : null;

    const cells = [];
    for (let i = 0; i < startPad; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);

    const handlePrev = () => {
        if (month === 1) {
            setMonth(12);
            setYear((y) => y - 1);
        } else {
            setMonth((m) => m - 1);
        }
    };
    const handleNext = () => {
        if (month === 12) {
            setMonth(1);
            setYear((y) => y + 1);
        } else {
            setMonth((m) => m + 1);
        }
    };
    const handleDayClick = (d) => {
        onSelect(toIso(year, month, d));
    };

    return (
        <div className="min-w-[220px]">
            <div className="flex items-center justify-between gap-2 mb-2">
                <button type="button" onClick={handlePrev} className="p-1 rounded hover:bg-slate-100 text-slate-600" aria-label="Mes anterior">‹</button>
                <span className="text-sm font-semibold text-slate-700">{MESES[month - 1]} {year}</span>
                <button type="button" onClick={handleNext} className="p-1 rounded hover:bg-slate-100 text-slate-600" aria-label="Mes siguiente">›</button>
            </div>
            <div className="grid grid-cols-7 gap-0.5 text-center text-[11px]">
                {['D', 'L', 'M', 'X', 'J', 'V', 'S'].map((d) => (
                    <div key={d} className="text-slate-400 font-medium py-0.5">{d}</div>
                ))}
                {cells.map((d, i) => {
                    if (d === null) return <div key={`e-${i}`} />;
                    const isSelected = selectedParts && selectedParts[0] === year && selectedParts[1] === month && selectedParts[2] === d;
                    return (
                        <button
                            key={d}
                            type="button"
                            onClick={() => handleDayClick(d)}
                            className={`py-1 rounded hover:bg-indigo-100 ${isSelected ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'text-slate-700'}`}
                        >
                            {d}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

export default function DateInput({ value, onChange, label, className, showCalendarPicker = true, showDayName = true }) {
    const [displayValue, setDisplayValue] = useState('');
    const [calendarOpen, setCalendarOpen] = useState(false);
    const containerRef = useRef(null);

    useEffect(() => {
        if (value) {
            const [y, m, d] = value.split('-');
            if (y && m && d) setDisplayValue(`${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`);
            else setDisplayValue('');
        } else {
            setDisplayValue('');
        }
    }, [value]);

    useEffect(() => {
        if (!calendarOpen) return;
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setCalendarOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [calendarOpen]);

    const handleChange = (e) => {
        let input = e.target.value.replace(/\D/g, '');

        if (input.length > 2) input = input.slice(0, 2) + '/' + input.slice(2);
        if (input.length > 5) input = input.slice(0, 5) + '/' + input.slice(5);
        if (input.length > 10) input = input.slice(0, 10);

        setDisplayValue(input);

        if (input.length === 10) {
            const parts = input.split('/');
            const d = parts[0]?.padStart(2, '0') ?? '';
            const m = parts[1]?.padStart(2, '0') ?? '';
            const y = parts[2] ?? '';
            const dateObj = new Date(`${y}-${m}-${d}`);
            if (!isNaN(dateObj.getTime())) {
                onChange(`${y}-${m}-${d}`);
            }
        } else if (input === '') {
            onChange('');
        }
    };

    const handleCalendarSelect = (iso) => {
        onChange(iso);
        const [y, m, d] = iso.split('-');
        setDisplayValue(`${d}/${m}/${y}`);
        setCalendarOpen(false);
    };

    const dayBrief = showDayName ? getDayBrief(value) : '';

    return (
        <div className="w-full" ref={containerRef}>
            {label && <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">{label}</label>}

            <div className="relative group">
                {showDayName && (
                    <span
                        className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 group-hover:opacity-0 transition-opacity pointer-events-none"
                        aria-hidden
                    >
                        {dayBrief}
                    </span>
                )}
                {showCalendarPicker && (
                    <>
                        <button
                            type="button"
                            onClick={() => setCalendarOpen((o) => !o)}
                            className="absolute left-2 top-1/2 -translate-y-1/2 p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity z-10 text-slate-400 hover:text-indigo-600"
                            title="Abrir calendario"
                        >
                            <IconCalendar size={14} />
                        </button>
                        {calendarOpen && createPortal(
                            <div
                                className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
                                role="dialog"
                                aria-modal="true"
                                aria-label="Seleccionar fecha"
                            >
                                <div
                                    className="absolute inset-0 bg-black/20"
                                    onClick={() => setCalendarOpen(false)}
                                    aria-hidden
                                />
                                <div
                                    className="relative z-10 bg-white border border-slate-200 rounded-xl shadow-xl p-3"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <MiniCalendar value={value} onSelect={handleCalendarSelect} />
                                </div>
                            </div>,
                            document.body
                        )}
                    </>
                )}
                <input
                    type="text"
                    placeholder="dd/mm/aaaa"
                    className={`w-full outline-none transition-colors p-1 pl-8 ${className || "border border-slate-300 rounded text-sm bg-white focus:ring-2 focus:ring-indigo-500"}`}
                    value={displayValue}
                    onChange={handleChange}
                    maxLength={10}
                />
            </div>
        </div>
    );
}
