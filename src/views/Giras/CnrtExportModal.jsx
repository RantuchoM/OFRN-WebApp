import React, { useState, useMemo } from 'react';
import { IconFileText, IconX, IconMapPin, IconArrowRight, IconDownload } from '../../components/ui/Icons';

export default function CnrtExportModal({ transport, events, onClose, onExport }) {
    // Ordenamos eventos cronológicamente (texto ISO seguro)
    const sortedEvents = useMemo(() => {
        return [...events].sort((a, b) => {
            const dateA = (a.fecha || '') + (a.hora_inicio || '');
            const dateB = (b.fecha || '') + (b.hora_inicio || '');
            return dateA.localeCompare(dateB);
        });
    }, [events]);

    // Usamos String() para asegurar coincidencia con los IDs de la BD
    const [startId, setStartId] = useState(String(sortedEvents[0]?.id || ''));
    const [endId, setEndId] = useState(String(sortedEvents[sortedEvents.length - 1]?.id || ''));

    const formatLabel = (evt) => {
        if(!evt) return '-';
        const hora = evt.hora_inicio?.slice(0, 5);
        const [y, m, d] = (evt.fecha || '2000-01-01').split('-');
        return `${d}/${m} ${hora}hs - ${evt.descripcion}`;
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <IconFileText className="text-indigo-600"/> Lista de Pasajeros (CNRT)
                    </h3>
                    <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded-full text-slate-400"><IconX size={18}/></button>
                </div>
                
                <div className="p-6 space-y-4">
                    <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-100 text-sm text-indigo-800">
                        <p className="font-bold">{transport.transportes?.nombre}</p>
                        <p className="text-xs opacity-75">{transport.detalle}</p>
                    </div>

                    <p className="text-xs text-slate-500">
                        Selecciona el tramo para generar la lista. Se incluirán todas las personas que estén a bordo en cualquier momento entre estas dos paradas.
                    </p>

                    <div className="space-y-3">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">Desde (Salida)</label>
                            <div className="relative">
                                <select 
                                    className="w-full text-sm p-2.5 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-indigo-500 outline-none appearance-none"
                                    value={startId}
                                    onChange={(e) => setStartId(e.target.value)}
                                >
                                    {sortedEvents.map((evt, idx) => (
                                        // Deshabilitamos opciones que estén DESPUÉS del final seleccionado
                                        <option key={evt.id} value={String(evt.id)}>
                                            {formatLabel(evt)}
                                        </option>
                                    ))}
                                </select>
                                <IconMapPin className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                            </div>
                        </div>

                        <div className="flex justify-center text-slate-300">
                            <IconArrowRight className="rotate-90" size={20}/>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">Hasta (Llegada)</label>
                            <div className="relative">
                                <select 
                                    className="w-full text-sm p-2.5 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-indigo-500 outline-none appearance-none"
                                    value={endId}
                                    onChange={(e) => setEndId(e.target.value)}
                                >
                                    {sortedEvents.map((evt, idx) => (
                                        <option key={evt.id} value={String(evt.id)}>
                                            {formatLabel(evt)}
                                        </option>
                                    ))}
                                </select>
                                <IconMapPin className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-200 rounded-lg transition-colors">Cancelar</button>
                    <button 
                        onClick={() => onExport(startId, endId)}
                        className="px-4 py-2 text-sm font-bold bg-green-600 text-white hover:bg-green-700 rounded-lg shadow-md transition-all flex items-center gap-2"
                    >
                        <IconDownload size={16}/> Descargar Excel
                    </button>
                </div>
            </div>
        </div>
    );
}