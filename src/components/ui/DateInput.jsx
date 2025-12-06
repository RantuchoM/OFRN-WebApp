import React, { useState, useEffect } from 'react';
import { IconCalendar } from './Icons';

export default function DateInput({ value, onChange, label }) {
    const [displayValue, setDisplayValue] = useState('');

    // Cuando el valor externo (base de datos YYYY-MM-DD) cambia, actualizamos el texto visual (DD/MM/YYYY)
    useEffect(() => {
        if (value) {
            const [y, m, d] = value.split('-');
            setDisplayValue(`${d}/${m}/${y}`);
        } else {
            setDisplayValue('');
        }
    }, [value]);

    // Manejar el cambio manual del usuario
    const handleChange = (e) => {
        let input = e.target.value.replace(/\D/g, ''); // Solo números
        
        // Máscara automática DD/MM/YYYY
        if (input.length > 2) input = input.slice(0, 2) + '/' + input.slice(2);
        if (input.length > 5) input = input.slice(0, 5) + '/' + input.slice(5);
        if (input.length > 10) input = input.slice(0, 10);

        setDisplayValue(input);

        // Si la fecha está completa (10 caracteres: dd/mm/yyyy), convertirla a ISO para guardar
        if (input.length === 10) {
            const [d, m, y] = input.split('/');
            // Validar fecha básica
            const dateObj = new Date(`${y}-${m}-${d}`);
            if (!isNaN(dateObj.getTime())) {
                onChange(`${y}-${m}-${d}`); // Enviamos al padre YYYY-MM-DD
            }
        } else if (input === '') {
            onChange('');
        }
    };

    return (
        <div className="w-full">
            {label && <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">{label}</label>}
            <div className="relative">
                <input
                    type="text"
                    placeholder="dd/mm/aaaa"
                    className="w-full border border-slate-300 p-2 pl-9 rounded text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={displayValue}
                    onChange={handleChange}
                    maxLength={10}
                />
                <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                    <IconCalendar size={16}/>
                </div>
            </div>
        </div>
    );
}