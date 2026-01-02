import React, { useState, useEffect } from 'react';
import { IconLoader, IconCopy, IconArrowRight } from '../ui/Icons';
import DateInput from '../ui/DateInput';

export const MoveGiraModal = ({ isOpen, onClose, onConfirm, gira, loading }) => {
    const [newDate, setNewDate] = useState('');
    useEffect(() => { if (isOpen && gira) setNewDate(gira.fecha_desde); }, [isOpen, gira]);
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
                <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
                    <IconArrowRight className="text-orange-500" /> Trasladar Gira
                </h3>
                <p className="text-sm text-slate-500 mb-4">
                    Se moverán <strong>{gira?.nombre_gira}</strong> y todos sus eventos manteniendo la estructura.
                </p>
                <div className="mb-6">
                    <label className="block text-xs font-bold uppercase mb-1">Nueva Fecha Inicio</label>
                    <DateInput value={newDate} onChange={setNewDate} />
                </div>
                <div className="flex justify-end gap-2">
                    <button onClick={onClose} disabled={loading} className="px-3 py-2 text-sm text-slate-500 hover:bg-slate-100 rounded">Cancelar</button>
                    <button onClick={() => onConfirm(newDate)} disabled={loading || !newDate} className="px-3 py-2 text-sm font-bold bg-orange-600 text-white rounded hover:bg-orange-700 flex items-center gap-2">
                        {loading && <IconLoader className="animate-spin"/>} Confirmar
                    </button>
                </div>
            </div>
        </div>
    );
};

export const DuplicateGiraModal = ({ isOpen, onClose, onConfirm, gira, loading }) => {
    const [newDate, setNewDate] = useState('');
    const [newName, setNewName] = useState('');
    useEffect(() => { 
        if (isOpen && gira) {
            setNewDate(''); 
            setNewName(`${gira.nombre_gira} (Copia)`);
        }
    }, [isOpen, gira]);
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
                <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
                    <IconCopy className="text-indigo-500" /> Duplicar Gira
                </h3>
                <p className="text-sm text-slate-500 mb-4">
                    Se creará una copia de <strong>{gira?.nombre_gira}</strong>. Logística y Roster no se copian.
                </p>
                <div className="space-y-3 mb-6">
                    <div>
                        <label className="block text-xs font-bold uppercase mb-1">Nombre Nueva Gira</label>
                        <input type="text" className="w-full border rounded p-2 text-sm" value={newName} onChange={e => setNewName(e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase mb-1">Nueva Fecha Inicio</label>
                        <DateInput value={newDate} onChange={setNewDate} />
                    </div>
                </div>
                <div className="flex justify-end gap-2">
                    <button onClick={onClose} disabled={loading} className="px-3 py-2 text-sm text-slate-500 hover:bg-slate-100 rounded">Cancelar</button>
                    <button onClick={() => onConfirm(newDate, newName)} disabled={loading || !newDate || !newName} className="px-3 py-2 text-sm font-bold bg-indigo-600 text-white rounded hover:bg-indigo-700 flex items-center gap-2">
                        {loading && <IconLoader className="animate-spin"/>} Duplicar
                    </button>
                </div>
            </div>
        </div>
    );
};  