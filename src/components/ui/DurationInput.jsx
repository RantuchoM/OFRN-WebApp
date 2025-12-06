import React, { useState, useEffect } from 'react';
import { IconClock } from './Icons';

export default function DurationInput({ value, onChange, label }) {
    // Value viene en SEGUNDOS (int). Lo convertimos a MM:SS para mostrar.
    const [display, setDisplay] = useState('');

    useEffect(() => {
        if (value || value === 0) {
            const mins = Math.floor(value / 60);
            const secs = value % 60;
            setDisplay(`${mins}:${secs.toString().padStart(2, '0')}`);
        } else {
            setDisplay('');
        }
    }, [value]);

    const handleChange = (e) => {
        let input = e.target.value.replace(/[^0-9]/g, ''); // Solo números
        
        // Máscara simple: si escribe 1234 -> 12:34
        if (input.length > 2) {
            input = input.slice(0, input.length - 2) + ':' + input.slice(input.length - 2);
        }
        
        setDisplay(input);

        // Convertir a segundos para guardar
        if (input.includes(':')) {
            const parts = input.split(':');
            const m = parseInt(parts[0] || 0);
            const s = parseInt(parts[1] || 0);
            onChange((m * 60) + s);
        } else {
            onChange(parseInt(input || 0));
        }
    };

    return (
        <div className="w-full">
            {label && <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">{label}</label>}
            <div className="relative">
                <input
                    type="text"
                    placeholder="mm:ss"
                    className="w-full border border-slate-300 p-2 pl-9 rounded text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={display}
                    onChange={handleChange}
                />
                <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                    <IconClock size={16}/>
                </div>
            </div>
        </div>
    );
}