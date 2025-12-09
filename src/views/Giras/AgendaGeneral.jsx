import React, { useState, useEffect } from 'react';
import { format, startOfDay, addMonths, parseISO, isToday } from 'date-fns';
import { es } from 'date-fns/locale'; 
import { IconMapPin, IconLoader, IconCalendar } from '../../components/ui/Icons';
import { useAuth } from '../../context/AuthContext';
import CommentsManager from '../../components/comments/CommentsManager';
import CommentButton from '../../components/comments/CommentButton';

export default function AgendaGeneral({ supabase }) {
    const { user } = useAuth();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [commentsState, setCommentsState] = useState(null);

    useEffect(() => {
        fetchContinuousAgenda();
    }, []);

    const fetchContinuousAgenda = async () => {
        setLoading(true);
        const start = startOfDay(new Date()).toISOString();
        const end = addMonths(new Date(), 12).toISOString();

        try {
            const userRole = user?.rol_sistema || '';
            const isPersonal = userRole === 'consulta_personal' || userRole === 'personal';
            let myEnsembles = new Set();
            let myFamily = null;
            if (isPersonal) {
                 const { data: me } = await supabase.from('integrantes').select('*, instrumentos(familia), integrantes_ensambles(id_ensamble)').eq('id', user.id).single();
                 if (me) { myFamily = me.instrumentos?.familia; me.integrantes_ensambles?.forEach(ie => myEnsembles.add(ie.id_ensamble)); }
            }
            
            const { data: eventsData } = await supabase
                .from('eventos')
                .select(`
                    id, fecha, hora_inicio, descripcion,
                    tipos_evento (nombre, color), locaciones (nombre),
                    programas (id, nombre_gira, google_drive_folder_id, giras_fuentes(tipo, valor_id), giras_integrantes(id_integrante, estado))
                `)
                .gte('fecha', start)
                .lte('fecha', end)
                .order('fecha', { ascending: true })
                .order('hora_inicio', { ascending: true });

             const filtered = (eventsData || []).filter(item => {
                if (!isPersonal) return true;
                const overrides = item.programas?.giras_integrantes || [];
                const sources = item.programas?.giras_fuentes || [];
                const myOverride = overrides.find(o => o.id_integrante === user.id);
                if (myOverride && myOverride.estado === 'ausente') return false;
                if (myOverride) return true;
                return sources.some(s => (s.tipo === 'ENSAMBLE' && myEnsembles.has(s.valor_id)) || (s.tipo === 'FAMILIA' && s.valor_texto === myFamily));
            });

            setItems(filtered);
        } catch (err) { console.error(err); } finally { setLoading(false); }
    };

    const getEventBorderColor = (typeName) => {
        const t = typeName?.toLowerCase() || '';
        if (t.includes('concierto')) return 'border-amber-500';
        if (t.includes('general')) return 'border-rose-500';
        if (t.includes('ensayo')) return 'border-slate-500';
        if (t.includes('viaje')) return 'border-blue-500';
        return 'border-indigo-500';
    };

    const groupedByMonth = items.reduce((acc, item) => {
        const monthKey = format(parseISO(item.fecha), 'yyyy-MM');
        if (!acc[monthKey]) acc[monthKey] = [];
        acc[monthKey].push(item);
        return acc;
    }, {});

    return (
        <div className="p-4 space-y-8 pb-20 animate-in fade-in">
            {loading && <div className="text-center py-10"><IconLoader className="animate-spin inline text-indigo-500" size={30}/></div>}
            
            {!loading && items.length === 0 && (
                <div className="text-center text-slate-400 py-10 italic">No hay eventos próximos agendados.</div>
            )}

            {Object.entries(groupedByMonth).map(([monthKey, monthEvents]) => {
                const monthDate = parseISO(monthEvents[0].fecha); 
                const daysInMonth = monthEvents.reduce((acc, evt) => {
                    const dKey = evt.fecha;
                    if(!acc[dKey]) acc[dKey] = [];
                    acc[dKey].push(evt);
                    return acc;
                }, {});

                return (
                    <div key={monthKey} className="relative">
                        <div className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur py-2 border-b border-slate-200 mb-4 text-slate-500 font-bold uppercase tracking-wider text-sm flex items-center gap-2 shadow-sm">
                             <IconCalendar size={14} className="mb-0.5"/>
                             {format(monthDate, 'MMMM yyyy', { locale: es })}
                        </div>

                        <div className="space-y-6">
                            {Object.entries(daysInMonth).map(([date, dayEvts]) => (
                                <div key={date} className="flex flex-col gap-2">
                                    <div className="pl-2 border-l-2 border-indigo-200">
                                        <span className={`text-lg font-bold ${isToday(parseISO(date)) ? 'text-indigo-600' : 'text-slate-800'} capitalize`}>
                                            {format(parseISO(date), 'EEEE d', { locale: es })}
                                        </span>
                                        {isToday(parseISO(date)) && <span className="ml-2 text-[10px] font-bold bg-indigo-100 text-indigo-700 px-2 rounded-full align-middle">HOY</span>}
                                    </div>

                                    {dayEvts.map(evt => {
                                        const borderClass = getEventBorderColor(evt.tipos_evento?.nombre);
                                        return (
                                            <div key={evt.id} className={`bg-white p-3 rounded-lg shadow-sm border border-slate-100 flex gap-3 ml-2 hover:shadow-md transition-shadow border-l-4 ${borderClass}`}>
                                                <div className="flex flex-col items-center justify-center min-w-[3rem] border-r border-slate-100 pr-3 text-slate-700">
                                                    <span className="font-black text-base">{evt.hora_inicio?.slice(0,5)}</span>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-start">
                                                        <div className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-slate-100 text-slate-600 mb-1">
                                                            {evt.tipos_evento?.nombre}
                                                        </div>
                                                        <CommentButton supabase={supabase} entityType="EVENTO" entityId={evt.id} onClick={() => setCommentsState({ type: 'EVENTO', id: evt.id, title: evt.descripcion })} className="p-0.5"/>
                                                    </div>
                                                    <h4 className="font-bold text-slate-800 text-sm leading-tight mb-1">{evt.descripcion}</h4>
                                                    <div className="flex items-center gap-1 text-xs text-slate-500 truncate">
                                                        <IconMapPin size={12}/> {evt.locaciones?.nombre}
                                                    </div>
                                                    {evt.programas?.google_drive_folder_id && (
                                                        <a href={`https://drive.google.com/drive/folders/${evt.programas.google_drive_folder_id}`} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 px-2 py-1 rounded border border-indigo-100 text-[10px] font-bold hover:bg-indigo-100">
                                                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 2H4a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2Z"/></svg>
                                                            Partituras
                                                        </a>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })}

            {commentsState && (
                <div className="fixed inset-0 z-50 flex justify-end bg-black/20 backdrop-blur-[1px]" onClick={() => setCommentsState(null)}>
                    <div onClick={e => e.stopPropagation()} className="h-full">
                        <CommentsManager 
                            supabase={supabase} 
                            entityType={commentsState.type} 
                            entityId={commentsState.id} 
                            title={commentsState.title}
                            onClose={() => setCommentsState(null)}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}