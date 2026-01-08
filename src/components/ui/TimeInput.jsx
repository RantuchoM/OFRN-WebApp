import React, { useState, useEffect } from 'react';
import TimeKeeper from 'react-timekeeper';
import { IconClock, IconX, IconCheck } from './Icons';

export default function TimeInput({ value, onChange, label, className }) {
    const [showClock, setShowClock] = useState(false);
    const initialTime = value ? value.slice(0, 5) : '12:00';
    const [tempTime, setTempTime] = useState(initialTime);

    useEffect(() => {
        if (value) {
            setTempTime(value.slice(0, 5));
        }
    }, [value]);

    const handleManualChange = (e) => {
        let val = e.target.value.replace(/[^0-9:]/g, '');
        if (val.length === 3 && !val.includes(':')) {
             val = val.slice(0, 2) + ':' + val.slice(2);
        }
        if (val.length > 5) val = val.slice(0, 5);
        onChange(val);
    };

    const handleOpenClock = () => {
        const timeToValidate = value ? value.slice(0, 5) : null;
        const isValidTime = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(timeToValidate);
        setTempTime(isValidTime ? timeToValidate : '12:00');
        setShowClock(true);
    };

    const displayValue = value ? value.slice(0, 5) : '';

    return (
        <div className="w-full">
            {label && <label className="text-[8px] font-bold text-slate-400 uppercase mb-1 block">{label}</label>}
            
            {/* AGREGADO: 'group' para hover */}
            <div className="relative group">
                <input 
                    type="text"
                    value={displayValue}
                    onChange={handleManualChange}
                    placeholder="--:--"
                    maxLength={5}
                    // AGREGADO: Soporte para className externo
                    className={`w-full outline-none transition-colors text-center p-1 ${className || "border border-slate-300 rounded text-sm bg-white focus:ring-2 focus:ring-indigo-500"}`}
                />
                
                {/* BOTÓN: Opacidad 0 por defecto, 100 al hover */}
                <button 
                    type="button"
                    onClick={handleOpenClock}
                    className="absolute right-0 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-all opacity-0 group-hover:opacity-100 z-10"
                    title="Abrir reloj"
                >
                    <IconClock size={14}/>
                </button>
            </div>

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
                            onDoneClick={() => { onChange(tempTime); setShowClock(false); }}
                            switchToMinuteOnHourSelect={true}
                            hour24Mode={true}
                            doneButton={() => (
                                <div 
                                    onClick={() => { onChange(tempTime); setShowClock(false); }}
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