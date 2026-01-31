import React from 'react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
    IconCalendar, IconClock, IconMapPin, IconMusic, 
    IconEdit, IconTrash, IconX, IconUsers, IconUserPlus, IconUserX 
} from '../../components/ui/Icons';

export default function EventQuickView({ event, onClose, onEdit, onDelete }) {
    if (!event) return null;

    // Parseo de datos para visualización
    const dateStr = format(parseISO(event.fecha), "EEEE d 'de' MMMM", { locale: es });
    const timeStr = `${event.hora_inicio.slice(0, 5)} - ${event.hora_fin?.slice(0, 5) || '?'}`;
    const location = event.locaciones ? `${event.locaciones.nombre} ${event.locaciones.localidades?.localidad ? `(${event.locaciones.localidades.localidad})` : ''}` : 'Sin ubicación';
    
    // Asistencia
    const customs = event.eventos_asistencia_custom || [];
    const guests = customs.filter(c => c.tipo === 'invitado' || c.tipo === 'adicional');
    const absents = customs.filter(c => c.tipo === 'ausente');

    // Programas
    const programs = [];
    if(event.programas) programs.push(event.programas);
    if(event.eventos_programas_asociados) {
        event.eventos_programas_asociados.forEach(epa => {
            if(epa.programas) programs.push(epa.programas);
        });
    }

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/20 backdrop-blur-[2px]" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
                
                {/* Cabecera con Color del Evento */}
                <div className="h-2 w-full" style={{ backgroundColor: event.tipos_evento?.color || '#6366f1' }}></div>
                
                <div className="p-5">
                    <div className="flex justify-between items-start mb-3">
                        <div>
                            <h3 className="font-bold text-lg text-slate-800 leading-tight">
                                {event.descripcion || (event.tipos_evento?.nombre || "Evento")}
                            </h3>
                            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100 mt-1 inline-block">
                                {event.tipos_evento?.nombre}
                            </span>
                        </div>
                        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1"><IconX size={18}/></button>
                    </div>

                    <div className="space-y-3 text-sm text-slate-600">
                        <div className="flex items-center gap-3">
                            <div className="bg-indigo-50 p-1.5 rounded text-indigo-600"><IconCalendar size={16}/></div>
                            <span className="capitalize font-medium">{dateStr}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="bg-indigo-50 p-1.5 rounded text-indigo-600"><IconClock size={16}/></div>
                            <span className="font-mono font-bold">{timeStr}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="bg-indigo-50 p-1.5 rounded text-indigo-600"><IconMapPin size={16}/></div>
                            <span>{location}</span>
                        </div>

                        {programs.length > 0 && (
                            <div className="border-t border-slate-100 pt-2 mt-2">
                                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Repertorio / Gira</p>
                                <div className="flex flex-col gap-1">
                                    {programs.map(p => (
                                        <div key={p.id} className="flex items-center gap-2 text-xs bg-slate-50 p-1.5 rounded border border-slate-100">
                                            <IconMusic size={12} className="text-slate-400"/>
                                            <span className="truncate">{p.nomenclador} {p.nombre_gira}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {(guests.length > 0 || absents.length > 0) && (
                            <div className="border-t border-slate-100 pt-2">
                                <div className="flex flex-wrap gap-1">
                                    {guests.map(g => (
                                        <span key={g.id} className="text-[10px] px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded border border-emerald-100 flex items-center gap-1">
                                            <IconUserPlus size={10}/> {g.integrantes?.apellido}
                                        </span>
                                    ))}
                                    {absents.map(a => (
                                        <span key={a.id} className="text-[10px] px-1.5 py-0.5 bg-red-50 text-red-700 rounded border border-red-100 flex items-center gap-1">
                                            <IconUserX size={10}/> {a.integrantes?.apellido}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Acciones */}
                    {event.isMyRehearsal && (
                        <div className="flex gap-2 mt-6 pt-4 border-t border-slate-100">
                            <button 
                                onClick={() => onDelete(event.id)} 
                                className="flex-1 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded border border-transparent hover:border-red-100 transition-colors flex items-center justify-center gap-2"
                            >
                                <IconTrash size={14}/> Eliminar
                            </button>
                            <button 
                                onClick={() => onEdit(event)} 
                                className="flex-[2] py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded shadow-sm transition-colors flex items-center justify-center gap-2"
                            >
                                <IconEdit size={14}/> Editar Completo
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}