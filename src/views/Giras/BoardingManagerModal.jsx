import React from 'react';
import { IconX, IconUsers } from '../../components/ui/Icons';

export default function BoardingManagerModal({ isOpen, onClose, transportId, passengers, events, onSaveBoarding }) {
    if (!isOpen) return null;

    // Filtramos pasajeros que tengan asignado ESTE transporte en sus reglas
    const transportPax = passengers.filter(p => 
        p.logistics?.transports?.some(t => t.id === transportId)
    );

    return (
        <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
                <div className="p-4 border-b flex justify-between items-center bg-amber-50 rounded-t-lg">
                    <h3 className="font-bold text-amber-900 flex items-center gap-2"><IconUsers/> Gestión de Abordaje (Excepciones)</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><IconX size={20}/></button>
                </div>
                
                <div className="p-4 bg-amber-50/50 border-b border-amber-100 text-xs text-amber-800">
                    <p>Aquí puedes ajustar dónde sube y baja cada persona específicamente para este transporte. 
                    Estas reglas no afectarán la visualización en el panel de logística general a menos que agregues comidas u hoteles.</p>
                </div>

                <div className="p-0 overflow-y-auto flex-1">
                    <table className="w-full text-xs text-left">
                        <thead className="text-slate-500 font-bold bg-slate-50 border-b sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th className="p-3 pl-4">Pasajero</th>
                                <th className="p-3">Rol</th>
                                <th className="p-3 bg-emerald-50/50 text-emerald-700 border-l">Origen (Sube)</th>
                                <th className="p-3 bg-rose-50/50 text-rose-700 border-l border-r">Destino (Baja)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {transportPax.map(p => {
                                const tData = p.logistics.transports.find(t => t.id === transportId);
                                
                                return (
                                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="p-3 pl-4 font-medium text-slate-700">{p.apellido}, {p.nombre}</td>
                                        <td className="p-3 text-slate-500">{p.rol_gira}</td>
                                        <td className="p-2 border-l bg-emerald-50/10">
                                            <select 
                                                className="border border-slate-200 rounded p-1.5 w-full max-w-[250px] text-xs focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none" 
                                                value={tData.subidaId || ''}
                                                onChange={(e) => onSaveBoarding(p.id, e.target.value, tData.bajadaId)}
                                            >
                                                {events.map(e => <option key={e.id} value={e.id}>{e.descripcion} ({e.hora_inicio?.slice(0,5)})</option>)}
                                            </select>
                                        </td>
                                        <td className="p-2 border-l border-r bg-rose-50/10">
                                            <select 
                                                className="border border-slate-200 rounded p-1.5 w-full max-w-[250px] text-xs focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none"
                                                value={tData.bajadaId || ''}
                                                onChange={(e) => onSaveBoarding(p.id, tData.subidaId, e.target.value)}
                                            >
                                                {events.map(e => <option key={e.id} value={e.id}>{e.descripcion} ({e.hora_inicio?.slice(0,5)})</option>)}
                                            </select>
                                        </td>
                                    </tr>
                                )
                            })}
                            {transportPax.length === 0 && (
                                <tr>
                                    <td colSpan="4" className="p-8 text-center text-slate-400 italic">
                                        No hay pasajeros asignados a este transporte mediante reglas generales.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}