import React, { useState, useEffect } from 'react';
import { IconCalendar } from './Icons';

export default function DateInput({ value, onChange, label, className }) {
    const [displayValue, setDisplayValue] = useState('');

    useEffect(() => {
        if (value) {
            const [y, m, d] = value.split('-');
            setDisplayValue(`${d}/${m}/${y}`);
        } else {
            setDisplayValue('');
        }
    }, [value]);

    const handleChange = (e) => {
        let input = e.target.value.replace(/\D/g, ''); // Solo números
        
        if (input.length > 2) input = input.slice(0, 2) + '/' + input.slice(2);
        if (input.length > 5) input = input.slice(0, 5) + '/' + input.slice(5);
        if (input.length > 10) input = input.slice(0, 10);

        setDisplayValue(input);

        if (input.length === 10) {
            const [d, m, y] = input.split('/');
            const dateObj = new Date(`${y}-${m}-${d}`);
            if (!isNaN(dateObj.getTime())) {
                onChange(`${y}-${m}-${d}`);
            }
        } else if (input === '') {
            onChange('');
        }
    };

    return (
        <div className="w-full">
            {label && <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">{label}</label>}
            
            {/* AGREGADO: 'group' para controlar el hover */}
            <div className="relative group">
                <input
                    type="text"
                    placeholder="dd/mm/aaaa"
                    // AGREGADO: Combinación de clases base + className recibido
                    className={`w-full outline-none transition-colors p-1 ${className || "border border-slate-300 rounded text-sm bg-white focus:ring-2 focus:ring-indigo-500"}`}
                    value={displayValue}
                    onChange={handleChange}
                    maxLength={10}
                />
                {/* ICONO: Opacidad 0 por defecto, 100 al hacer hover en el grupo */}
                <div className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <IconCalendar size={14}/>
                </div>
            </div>
        </div>
    );
}