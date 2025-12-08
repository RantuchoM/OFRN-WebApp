import React, { useState, useEffect } from 'react';
import { 
    format, addMonths, subMonths, startOfMonth, endOfMonth, 
    startOfWeek, endOfWeek, eachDayOfInterval, eachWeekOfInterval, 
    isSameMonth, isSameDay, isToday, parseISO, isWithinInterval, 
    differenceInCalendarDays, isBefore, isAfter 
} from 'date-fns';
import { es } from 'date-fns/locale'; 
import { IconChevronLeft, IconChevronRight, IconMapPin, IconX, IconLoader } from '../../components/ui/Icons';
import { useAuth } from '../../context/AuthContext';

export default function MusicianCalendar({ supabase }) {
    const { user } = useAuth();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [events, setEvents] = useState([]);
    const [tours, setTours] = useState([]); 
    const [loading, setLoading] = useState(false);
    const [selectedDate, setSelectedDate] = useState(null); 

    useEffect(() => { fetchData(); }, [currentDate]);

    const fetchData = async () => {
        setLoading(true);
        const start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 });
        const end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 });

        try {
            const userRole = user?.rol_sistema || '';
            const isPersonal = userRole === 'consulta_personal' || userRole === 'personal';
            let myEnsembles = new Set();
            let myFamily = null;

            if (isPersonal) {
                const { data: me } = await supabase.from('integrantes').select('*, instrumentos(familia), integrantes_ensambles(id_ensamble)').eq('id', user.id).single();
                if (me) { myFamily = me.instrumentos?.familia; me.integrantes_ensambles?.forEach(ie => myEnsembles.add(ie.id_ensamble)); }
            }

            const { data: eventsData } = await supabase.from('eventos').select(`id, fecha, hora_inicio, descripcion, tipos_evento (nombre, color), locaciones (nombre), programas (id, google_drive_folder_id, giras_fuentes (tipo, valor_id), giras_integrantes (id_integrante, estado))`).gte('fecha', start.toISOString()).lte('fecha', end.toISOString());
            const { data: toursData } = await supabase.from('programas').select(`id, nombre_gira, fecha_desde, fecha_hasta, tipo, google_drive_folder_id, giras_fuentes (tipo, valor_id, valor_texto), giras_integrantes (id_integrante, estado)`).lte('fecha_desde', end.toISOString()).gte('fecha_hasta', start.toISOString());

            const filterLogic = (item) => {
                if (!isPersonal) return true; 
                const overrides = item.giras_integrantes || (item.programas?.giras_integrantes) || [];
                const sources = item.giras_fuentes || (item.programas?.giras_fuentes) || [];
                const myOverride = overrides.find(o => o.id_integrante === user.id);
                if (myOverride && myOverride.estado === 'ausente') return false;
                if (myOverride) return true;
                return sources.some(s => (s.tipo === 'ENSAMBLE' && myEnsembles.has(s.valor_id)) || (s.tipo === 'FAMILIA' && s.valor_texto === myFamily));
            };

            setEvents((eventsData || []).filter(evt => filterLogic(evt)));
            setTours((toursData || []).filter(tour => filterLogic(tour)));
        } catch (err) { console.error(err); } finally { setLoading(false); }
    };

    const getTourStyle = (tipo) => {
        const t = tipo?.toLowerCase() || '';
        if (t.includes('camerata')) return 'bg-fuchsia-500 text-white hover:bg-fuchsia-600'; 
        if (t.includes('ensamble')) return 'bg-emerald-500 text-white hover:bg-emerald-600';
        return 'bg-indigo-500 text-white hover:bg-indigo-600';
    };
    const getEventBadgeStyle = (tipo) => {
        const t = tipo?.toLowerCase() || '';
        if (t.includes('concierto')) return 'bg-amber-100 text-amber-800 border-amber-200';
        return 'bg-slate-100 text-slate-600 border-slate-200'; 
    };

    const renderWeeks = () => {
        const monthStart = startOfMonth(currentDate);
        const monthEnd = endOfMonth(currentDate);
        const viewStart = startOfWeek(monthStart, { weekStartsOn: 1 });
        const viewEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
        const weeks = eachWeekOfInterval({ start: viewStart, end: viewEnd }, { weekStartsOn: 1 });

        return weeks.map((weekStart, weekIdx) => {
            const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
            const activeToursInWeek = tours.filter(t => {
                const tStart = parseISO(t.fecha_desde);
                const tEnd = parseISO(t.fecha_hasta);
                return (isBefore(tStart, weekEnd) || isSameDay(tStart, weekEnd)) && (isAfter(tEnd, weekStart) || isSameDay(tEnd, weekStart));
            });

            return (
                <div key={weekIdx} className="flex flex-col border-b-2 border-slate-300 last:border-0 mb-1">
                    {/* TIMELINE GIRAS */}
                    <div className="relative h-8 bg-slate-50 border-b border-dashed border-slate-200 w-full">
                        {activeToursInWeek.map(tour => {
                            const tStart = parseISO(tour.fecha_desde);
                            const tEnd = parseISO(tour.fecha_hasta);
                            const effectiveStart = isBefore(tStart, weekStart) ? weekStart : tStart;
                            const effectiveEnd = isAfter(tEnd, weekEnd) ? weekEnd : tEnd;
                            const startDayIndex = differenceInCalendarDays(effectiveStart, weekStart);
                            const durationDays = differenceInCalendarDays(effectiveEnd, effectiveStart) + 1;
                            const isRealStart = isSameDay(tStart, effectiveStart);
                            const isRealEnd = isSameDay(tEnd, effectiveEnd);
                            const roundedClass = `${isRealStart ? 'rounded-l-md pl-2' : 'border-l-2 border-white/50'} ${isRealEnd ? 'rounded-r-md' : 'border-r-2 border-white/50'}`;

                            return (
                                <div key={tour.id} onClick={(e) => { e.stopPropagation(); setSelectedDate(effectiveStart); }}
                                    className={`absolute top-1 bottom-1 text-xs flex items-center shadow-sm overflow-hidden whitespace-nowrap z-10 cursor-pointer transition-colors ${getTourStyle(tour.tipo)} ${roundedClass}`}
                                    style={{ left: `${startDayIndex * 14.2857}%`, width: `${durationDays * 14.2857}%` }}>
                                    {(isRealStart || startDayIndex === 0) && (
                                        <div className="flex items-center gap-1 w-full px-1">
                                            <span className="font-bold truncate drop-shadow-md">{tour.nombre_gira}</span>
                                            {tour.google_drive_folder_id && <svg className="w-3 h-3 text-white/90 shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M20 6h-8l-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V8h16v10z"/></svg>}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                    {/* GRILLA DIAS */}
                    <div className="grid grid-cols-7 min-h-[80px]">
                        {eachDayOfInterval({ start: weekStart, end: weekEnd }).map((day, dayIdx) => {
                            const isCurrentMonth = isSameMonth(day, currentDate);
                            const dayEvents = events.filter(e => isSameDay(parseISO(e.fecha), day));
                            const groupedEvents = dayEvents.reduce((acc, evt) => {
                                const type = evt.tipos_evento?.nombre || 'Otro'; acc[type] = (acc[type] || 0) + 1; return acc;
                            }, {});
                            return (
                                <div key={dayIdx} onClick={() => (dayEvents.length > 0 || activeToursInWeek.length > 0) && setSelectedDate(day)}
                                    className={`p-1 border-r border-slate-100 last:border-r-0 relative group transition-colors ${!isCurrentMonth ? 'bg-slate-50/50 text-slate-300' : 'bg-white text-slate-700 hover:bg-slate-50 cursor-pointer'}`}>
                                    <div className="flex justify-between items-start"><span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${isToday(day) ? 'bg-indigo-600 text-white' : ''}`}>{format(day, 'd')}</span></div>
                                    <div className="flex flex-col gap-1 mt-1">
                                        {Object.entries(groupedEvents).map(([type, count], idx) => (
                                            <div key={idx} className={`text-[9px] px-1 py-0.5 rounded border truncate ${getEventBadgeStyle(type)}`}>{count > 1 && <b>{count}x </b>}{type}</div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            );
        });
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 relative animate-in fade-in">
            {/* Header de Navegación de Mes */}
            <div className="bg-white px-4 py-2 border-b border-slate-200 flex items-center justify-between shrink-0 shadow-sm">
                 <div className="font-bold text-slate-700 capitalize flex items-center gap-2">
                    {format(currentDate, 'MMMM yyyy', { locale: es })}
                    {loading && <IconLoader className="animate-spin text-indigo-500" size={14}/>}
                 </div>
                 <div className="flex items-center bg-slate-100 rounded-lg">
                    <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-2 hover:bg-slate-200 rounded-l-lg text-slate-500"><IconChevronLeft size={18}/></button>
                    <button onClick={() => setCurrentDate(new Date())} className="px-3 text-xs font-bold border-x border-slate-200 hover:bg-slate-200 h-full text-slate-600">Hoy</button>
                    <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-2 hover:bg-slate-200 rounded-r-lg text-slate-500"><IconChevronRight size={18}/></button>
                 </div>
            </div>

            {/* Contenedor con Scroll Horizontal para móviles */}
            <div className="flex-1 p-2 md:p-4 overflow-y-auto overflow-x-hidden">
                <div className="bg-white border border-slate-300 rounded-lg shadow-sm overflow-x-auto">
                    <div className="min-w-[600px] md:min-w-0">
                        <div className="grid grid-cols-7 bg-slate-800 text-white">
                            {['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'].map(d => <div key={d} className="text-center text-xs font-bold uppercase tracking-wider py-2">{d}</div>)}
                        </div>
                        <div className="flex flex-col">{renderWeeks()}</div>
                    </div>
                </div>
                <div className="md:hidden text-center text-xs text-slate-400 mt-2">Desliza horizontalmente para ver la semana</div>
            </div>

            {/* Modal de Detalle */}
            {selectedDate && (
                <div className="absolute inset-0 z-50 bg-slate-900/30 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setSelectedDate(null)}>
                    <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
                        <div className="bg-slate-50 p-4 border-b border-slate-100 flex justify-between items-center sticky top-0 z-10">
                            <div>
                                <h3 className="text-lg font-black text-slate-800 capitalize leading-none">{format(selectedDate, 'EEEE d', { locale: es })}</h3>
                                <p className="text-slate-400 text-xs font-bold uppercase mt-1">{format(selectedDate, 'MMMM yyyy', { locale: es })}</p>
                            </div>
                            <button onClick={() => setSelectedDate(null)} className="bg-white p-1.5 rounded-full hover:bg-slate-200 text-slate-500 shadow-sm transition-colors"><IconX size={20}/></button>
                        </div>
                        <div className="overflow-y-auto p-4 space-y-4">
                            {tours.filter(t => isWithinInterval(selectedDate, { start: parseISO(t.fecha_desde), end: parseISO(t.fecha_hasta) })).map(tour => (
                                <div key={tour.id} className="p-3 rounded-lg border-l-4 shadow-sm bg-slate-50 border-indigo-500">
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1 min-w-0 pr-2">
                                            <div className="text-[10px] font-black uppercase tracking-wider text-indigo-600 mb-1">Gira</div>
                                            <div className="font-bold text-base leading-tight text-slate-800 break-words">{tour.nombre_gira}</div>
                                            <div className="text-xs mt-1 text-slate-500">{tour.tipo}</div>
                                        </div>
                                        {tour.google_drive_folder_id && (
                                            <a href={`https://drive.google.com/drive/folders/${tour.google_drive_folder_id}`} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center justify-center bg-indigo-50 hover:bg-indigo-100 text-indigo-700 p-2 rounded-lg transition-colors border border-indigo-200 shrink-0">
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 2H4a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2Z"/></svg>
                                                <span className="text-[9px] font-bold mt-1">Partituras</span>
                                            </a>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {events.filter(e => isSameDay(parseISO(e.fecha), selectedDate)).map(evt => (
                                <div key={evt.id} className="flex gap-3 items-start">
                                    <div className="w-14 text-center pt-1 shrink-0"><div className="text-sm font-bold text-slate-700 bg-slate-100 rounded px-1">{evt.hora_inicio?.slice(0,5)}</div></div>
                                    <div className="flex-1 pb-3 border-b border-slate-100 last:border-0">
                                        <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border ${getEventBadgeStyle(evt.tipos_evento?.nombre)}`}>{evt.tipos_evento?.nombre}</span>
                                        <div className="text-sm text-slate-600 font-medium leading-tight mt-1">{evt.descripcion || 'Sin descripción'}</div>
                                        <div className="flex items-center gap-1 text-xs text-slate-400 mt-1"><IconMapPin size={12}/> {evt.locaciones?.nombre || 'TBA'}</div>
                                        {evt.programas?.google_drive_folder_id && (
                                            <a href={`https://drive.google.com/drive/folders/${evt.programas.google_drive_folder_id}`} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 px-2 py-1 rounded border border-indigo-100 text-[10px] font-bold">
                                                 <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 2H4a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2Z"/></svg> Partituras
                                            </a>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}