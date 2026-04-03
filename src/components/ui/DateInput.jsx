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
// Alias por si se referencian con otros nombres (evitar ReferenceError)
const dayNameFromIso = getDayBrief;
const getWeekdayShort = getDayBrief;

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

/** Parsea segmentos a yyyy-MM-dd; retorna '' si no es válido. */
function segmentsToIso(d, m, y) {
    const dd = String(d).replace(/\D/g, '').padStart(2, '0');
    const mm = String(m).replace(/\D/g, '').padStart(2, '0');
    let yy = String(y).replace(/\D/g, '');
    if (yy.length === 2) yy = '20' + yy;
    if (yy.length !== 4) return '';
    const iso = `${yy}-${mm}-${dd}`;
    const dateObj = new Date(iso);
    return !isNaN(dateObj.getTime()) ? iso : '';
}

const inputBaseClass = 'border-0 bg-transparent outline-none p-0 text-center text-slate-800 min-w-0';

/**
 * Input de fecha dd/mm/aaaa con estado local (día, mes, año) sincronizado desde la prop `value`.
 * - Sincronización value→estado solo cuando value cambia (lastValueRef), para no pisar la edición.
 * - En blur solo se emite onChange cuando día/mes/año están completos (no guardar "01" si solo
 *   se escribió "1" en el día). Ver docs/specs/ui-dateinput-v2.md.
 */
export default function DateInput({ value, onChange, label, className, showCalendarPicker = true, showDayName = true }) {
    const [day, setDay] = useState('');
    const [month, setMonth] = useState('');
    const [year, setYear] = useState('');
    const [calendarOpen, setCalendarOpen] = useState(false);
    const containerRef = useRef(null);
    const calendarPortalRef = useRef(null);
    const dayRef = useRef(null);
    const monthRef = useRef(null);
    const yearRef = useRef(null);
    /** Último value recibido por props; solo sincronizamos estado cuando value cambia. */
    const lastValueRef = useRef(undefined);

    // Sincronizar estado local solo cuando la prop value cambia desde el padre,
    // no en cada render. Así no se sobrescribe lo que el usuario está escribiendo
    // (p. ej. el primer dígito del día) con el valor anterior.
    useEffect(() => {
        if (value === lastValueRef.current) return;
        lastValueRef.current = value;
        if (value) {
            const [y, m, d] = value.split('-');
            if (y && m && d) {
                setDay(d);
                setMonth(m);
                setYear(y);
            } else {
                setDay('');
                setMonth('');
                setYear('');
            }
        } else {
            setDay('');
            setMonth('');
            setYear('');
        }
    }, [value]);

    useEffect(() => {
        if (!calendarOpen) return;
        const handleClickOutside = (e) => {
            const inContainer = containerRef.current?.contains(e.target);
            const inCalendar = calendarPortalRef.current?.contains(e.target);
            if (!inContainer && !inCalendar) setCalendarOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [calendarOpen]);

    const selectAll = (ref) => {
        requestAnimationFrame(() => {
            if (ref?.current && typeof ref.current.select === 'function') {
                ref.current.select();
            }
        });
    };

    const handleDayFocus = () => selectAll(dayRef);
    const handleMonthFocus = () => selectAll(monthRef);
    const handleYearFocus = () => selectAll(yearRef);

    const handleDayChange = (e) => {
        const v = e.target.value.replace(/\D/g, '').slice(0, 2);
        setDay(v);
        if (v.length === 2) {
            const iso = segmentsToIso(v, month, year);
            if (iso) onChange(iso);
            monthRef.current?.focus();
            selectAll(monthRef);
        }
    };

    const handleMonthChange = (e) => {
        const v = e.target.value.replace(/\D/g, '').slice(0, 2);
        setMonth(v);
        if (v.length === 2) {
            const iso = segmentsToIso(day, v, year);
            if (iso) onChange(iso);
            yearRef.current?.focus();
            selectAll(yearRef);
        }
    };

    const handleYearChange = (e) => {
        const v = e.target.value.replace(/\D/g, '').slice(0, 4);
        setYear(v);
        if (v.length === 4) {
            const iso = segmentsToIso(day, month, v);
            if (iso) onChange(iso);
        }
    };

    const handleKeyDown = (e, segment) => {
        const start = e.target.selectionStart ?? 0;
        if (e.key === 'ArrowLeft' && start === 0) {
            if (segment === 'month') {
                e.preventDefault();
                dayRef.current?.focus();
                selectAll(dayRef);
            } else if (segment === 'year') {
                e.preventDefault();
                monthRef.current?.focus();
                selectAll(monthRef);
            }
        }
        if (e.key === 'ArrowRight') {
            const len = e.target.value.length;
            if (segment === 'day' && start >= len) {
                e.preventDefault();
                monthRef.current?.focus();
                selectAll(monthRef);
            } else if (segment === 'month' && start >= len) {
                e.preventDefault();
                yearRef.current?.focus();
                selectAll(yearRef);
            }
        }
        if (e.key === 'Backspace' && segment !== 'day' && start === 0 && e.target.selectionEnd === 0) {
            e.preventDefault();
            if (segment === 'month') {
                dayRef.current?.focus();
                selectAll(dayRef);
            } else {
                monthRef.current?.focus();
                selectAll(monthRef);
            }
        }
    };

    const handleContainerPaste = (e) => {
        const pasted = (e.clipboardData?.getData('text') || '').trim();
        const digits = pasted.replace(/\D/g, '');
        if (digits.length >= 8) {
            e.preventDefault();
            setDay(digits.slice(0, 2));
            setMonth(digits.slice(2, 4));
            setYear(digits.slice(4, 8));
            yearRef.current?.focus();
            selectAll(yearRef);
        } else {
            const parts = pasted.split(/[/\-.]/).map((p) => p.replace(/\D/g, ''));
            if (parts.length >= 3) {
                e.preventDefault();
                setDay(parts[0].slice(0, 2));
                setMonth(parts[1].slice(0, 2));
                setYear(parts[2].slice(0, 4));
                yearRef.current?.focus();
                selectAll(yearRef);
            }
        }
    };

    const handleBlur = () => {
        if (!day && !month && !year) {
            onChange('');
            return;
        }
        // Solo emitir fecha cuando los tres segmentos están completos; si el usuario
        // escribió solo un dígito (p. ej. "1" en día) no guardar "01" al hacer blur.
        const dayOk = String(day).replace(/\D/g, '').length === 2;
        const monthOk = String(month).replace(/\D/g, '').length === 2;
        const yearOk = String(year).replace(/\D/g, '').length === 4;
        if (dayOk && monthOk && yearOk) {
            const iso = segmentsToIso(day, month, year);
            if (iso && iso !== value) onChange(iso);
        }
    };

    const handleCalendarSelect = (iso) => {
        onChange(iso);
        const [y, m, d] = iso.split('-');
        setDay(d);
        setMonth(m);
        setYear(y);
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
                                ref={calendarPortalRef}
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
                <div
                    className={`flex items-center justify-start gap-0 w-full outline-none transition-colors p-1 pl-8 pr-1 rounded ${className || 'border border-slate-300 bg-white focus-within:ring-2 focus-within:ring-indigo-500'}`}
                    onPaste={handleContainerPaste}
                >
                    <input
                        ref={dayRef}
                        type="text"
                        inputMode="numeric"
                        placeholder="dd"
                        maxLength={2}
                        value={day}
                        onChange={handleDayChange}
                        onFocus={handleDayFocus}
                        onKeyDown={(e) => handleKeyDown(e, 'day')}
                        onBlur={handleBlur}
                        className={`${inputBaseClass} w-[2ch] shrink-0 text-xs`}
                        aria-label="Día"
                    />
                    <span className="text-slate-400 select-none shrink-0" aria-hidden>/</span>
                    <input
                        ref={monthRef}
                        type="text"
                        inputMode="numeric"
                        placeholder="mm"
                        maxLength={2}
                        value={month}
                        onChange={handleMonthChange}
                        onFocus={handleMonthFocus}
                        onKeyDown={(e) => handleKeyDown(e, 'month')}
                        onBlur={handleBlur}
                        className={`${inputBaseClass} w-[2ch] shrink-0 text-xs`}
                        aria-label="Mes"
                    />
                    <span className="text-slate-400 select-none shrink-0" aria-hidden>/</span>
                    <input
                        ref={yearRef}
                        type="text"
                        inputMode="numeric"
                        placeholder="aaaa"
                        maxLength={4}
                        value={year}
                        onChange={handleYearChange}
                        onFocus={handleYearFocus}
                        onKeyDown={(e) => handleKeyDown(e, 'year')}
                        onBlur={handleBlur}
                        className={`${inputBaseClass} w-[4ch] shrink-0 text-[10px]`}
                        aria-label="Año"
                    />
                </div>
            </div>
        </div>
    );
}
