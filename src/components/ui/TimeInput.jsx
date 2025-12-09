// src/components/ui/TimeInput.jsx
import React, { useState, useEffect } from 'react';
import TimeKeeper from 'react-timekeeper';
import { IconClock, IconX, IconCheck } from './Icons';

export default function TimeInput({ value, onChange, label }) {
    const [showClock, setShowClock] = useState(false);
    
    // Aseguramos que tempTime se inicialice como HH:MM
    const initialTime = value ? value.slice(0, 5) : '12:00';
    const [tempTime, setTempTime] = useState(initialTime);

    // Sincronizar tempTime si el valor externo cambia, asegurando formato HH:MM
    useEffect(() => {
        if (value) {
            const formattedTime = value.slice(0, 5);
            setTempTime(formattedTime);
        }
    }, [value]);

    // Manejar escritura manual con validación estricta
    const handleManualChange = (e) => {
        // 1. Permitir SOLO números y dos puntos
        let val = e.target.value.replace(/[^0-9:]/g, '');
        
        // 2. Auto-formato: Si escribe 3 números seguidos (ej: 143), agregar dos puntos (14:3)
        if (val.length === 3 && !val.includes(':')) {
             val = val.slice(0, 2) + ':' + val.slice(2);
        }
        
        // Aseguramos que solo enviamos 5 caracteres (HH:MM)
        if (val.length > 5) val = val.slice(0, 5);

        // Pasamos el valor al padre
        onChange(val);
    };

    // Al abrir el reloj, validamos que la hora actual sea correcta para que no falle TimeKeeper
    const handleOpenClock = () => {
        // Usamos el valor del estado externo, pero lo formateamos a HH:MM para la validación
        const timeToValidate = value ? value.slice(0, 5) : null;
        const isValidTime = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(timeToValidate);
        setTempTime(isValidTime ? timeToValidate : '12:00');
        setShowClock(true);
    };

    // La hora que se muestra en el input SIEMPRE debe ser HH:MM
    const displayValue = value ? value.slice(0, 5) : '';

    return (
        <div className="w-full">
            {label && <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">{label}</label>}
            
            <div className="relative group">
                <input 
                    type="text"
                    value={displayValue} // <-- USAMOS EL VALOR CORTADO
                    onChange={handleManualChange}
                    placeholder="--:--"
                    maxLength={5} // Limita fisicamente a 5 caracteres (HH:MM)
                    className="w-full border border-slate-300 p-2 pl-3 pr-10 rounded text-sm bg-white font-medium text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all placeholder:text-slate-300"
                />
                
                {/* Botón para abrir el reloj */}
                <button 
                    type="button"
                    onClick={handleOpenClock}
                    className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                    title="Abrir reloj"
                >
                    <IconClock size={16}/>
                </button>
            </div>

            {/* MODAL FLOTANTE (Centrado y con fondo oscuro) */}
            {showClock && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 p-4">
                    <div className="absolute inset-0" onClick={() => setShowClock(false)}></div>
                    
                    <div className="relative bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="bg-indigo-50 p-3 flex justify-between items-center border-b border-indigo-100">
                            <span className="text-xs font-bold text-indigo-800 uppercase tracking-wide">Seleccionar Hora</span>
                            <button onClick={() => setShowClock(false)} className="text-slate-400 hover:text-slate-600">
                                <IconX size={18}/>
                            </button>
                        </div>

                        <TimeKeeper
                            time={tempTime}
                            onChange={(t) => setTempTime(t.formatted24)}
                            onDoneClick={() => {
                                onChange(tempTime);
                                setShowClock(false);
                            }}
                            switchToMinuteOnHourSelect={true}
                            hour24Mode={true}
                            doneButton={() => (
                                <div 
                                    onClick={() => {
                                        onChange(tempTime);
                                        setShowClock(false);
                                    }}
                                    className="bg-indigo-600 text-white text-center py-3.5 text-sm font-bold cursor-pointer hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                                >
                                    <IconCheck size={16}/> CONFIRMAR HORA
                                </div>
                            )}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}