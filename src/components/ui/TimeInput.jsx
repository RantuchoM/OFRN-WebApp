import React, { useState, useRef, useEffect } from 'react';
import TimeKeeper from 'react-timekeeper';
import { IconClock } from './Icons';

export default function TimeInput({ value, onChange, label }) {
    const [showClock, setShowClock] = useState(false);
    const [tempTime, setTempTime] = useState(value || '12:00');
    const containerRef = useRef(null);

    // Cerrar al hacer clic fuera
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setShowClock(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Manejar cambio en el reloj (se actualiza mientras giras las agujas)
    const handleTimeChange = (newTime) => {
        setTempTime(newTime.formatted24); 
    };

    // Confirmar la hora y cerrar
    const handleDone = () => {
        onChange(tempTime);
        setShowClock(false);
    };

    return (
        <div className="relative w-full" ref={containerRef}>
            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">{label}</label>
            
            {/* Input Simulado (Read Only) para abrir el reloj */}
            <div 
                onClick={() => setShowClock(!showClock)}
                className="w-full border border-slate-300 p-2 rounded text-sm bg-white flex items-center justify-between cursor-pointer focus-within:ring-2 focus-within:ring-indigo-500 hover:border-indigo-400 transition-colors"
            >
                <span className={value ? "text-slate-700 font-medium" : "text-slate-400"}>
                    {value || '--:--'}
                </span>
                <IconClock size={16} className="text-slate-400"/>
            </div>

            {/* Popover del Reloj */}
            {showClock && (
                <div className="absolute top-full left-0 mt-2 z-50 shadow-2xl rounded-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                    <TimeKeeper
                        time={tempTime}
                        onChange={handleTimeChange}
                        onDoneClick={handleDone}
                        switchToMinuteOnHourSelect={true}
                        hour24Mode={true}
                        doneButton={() => ( // <--- CAMBIO AQUÍ: Quitamos 'props' y usamos función flecha directa
                            <div 
                                onClick={handleDone} // <--- CAMBIO AQUÍ: Llamamos directamente a handleDone
                                className="bg-indigo-600 text-white text-center py-3 text-sm font-bold cursor-pointer hover:bg-indigo-700 transition-colors"
                            >
                                CONFIRMAR
                            </div>
                        )}
                    />
                </div>
            )}
        </div>
    );
}