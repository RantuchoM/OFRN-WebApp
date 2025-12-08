import React, { useState, useEffect } from 'react';
import { 
    format, addMonths, subMonths, startOfMonth, endOfMonth, 
    startOfWeek, endOfWeek, eachDayOfInterval, eachWeekOfInterval, 
    isSameMonth, isSameDay, isToday, parseISO, isWithinInterval, 
    differenceInCalendarDays, isBefore, isAfter 
} from 'date-fns';
import { es } from 'date-fns/locale'; 
import { 
    IconChevronLeft, IconChevronRight, IconMapPin, IconX, IconLoader 
} from '../../components/ui/Icons';
import { useAuth } from '../../context/AuthContext';

export default function MusicianCalendar({ supabase, onBack }) {
    const { user } = useAuth();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [events, setEvents] = useState([]);
    const [tours, setTours] = useState([]); 
    const [loading, setLoading] = useState(false);
    const [selectedDate, setSelectedDate] = useState(null); 

    useEffect(() => {
        fetchData();
    }, [currentDate]);

    const fetchData = async () => {
        setLoading(true);
        const start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 });
        const end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 });

        try {
            // 1. Filtros Personales
            const userRole = user?.rol_sistema || '';
            const isPersonal = userRole === 'consulta_personal' || userRole === 'personal';
            let myEnsembles = new Set();
            let myFamily = null;

            if (isPersonal) {
                const { data: me } = await supabase.from('integrantes')
                    .select('*, instrumentos(familia), integrantes_ensambles(id_ensamble)')
                    .eq('id', user.id)
                    .single();
                if (me) {
                    myFamily = me.instrumentos?.familia;
                    me.integrantes_ensambles?.forEach(ie => myEnsembles.add(ie.id_ensamble));
                }
            }

            // 2. Fetch Eventos
            const { data: eventsData } = await supabase
                .from('eventos')
                .select(`
                    id, fecha, hora_inicio, descripcion,
                    tipos_evento (nombre, color),
                    locaciones (nombre),
                    programas (
                        id,
                        google_drive_folder_id,
                        giras_fuentes (tipo, valor_id, valor_texto),
                        giras_integrantes (id_integrante, estado)
                    )
                `)
                .gte('fecha', start.toISOString())
                .lte('fecha', end.toISOString());

            // 3. Fetch Programas (Giras)
            const { data: toursData } = await supabase
                .from('programas')
                .select(`
                    id, nombre_gira, fecha_desde, fecha_hasta, tipo,
                    google_drive_folder_id,
                    giras_fuentes (tipo, valor_id, valor_texto),
                    giras_integrantes (id_integrante, estado)
                `)
                .lte('fecha_desde', end.toISOString())
                .gte('fecha_hasta', start.toISOString());

            // 4. Filtrado en Memoria
            const filterLogic = (item) => {
                if (!isPersonal) return true; 
                const overrides = item.giras_integrantes || (item.programas?.giras_integrantes) || [];
                const sources = item.giras_fuentes || (item.programas?.giras_fuentes) || [];
                const myOverride = overrides.find(o => o.id_integrante === user.id);
                if (myOverride && myOverride.estado === 'ausente') return false;
                if (myOverride) return true;
                const matchesEnsemble = sources.some(s => s.tipo === 'ENSAMBLE' && myEnsembles.has(s.valor_id));
                const matchesFamily = sources.some(s => s.tipo === 'FAMILIA' && s.valor_texto === myFamily);
                return matchesEnsemble || matchesFamily;
            };

            setEvents((eventsData || []).filter(evt => filterLogic(evt)));
            setTours((toursData || []).filter(tour => filterLogic(tour)));

        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // --- Helpers Visuales ---
    const getTourStyle = (tipo) => {
        const t = tipo?.toLowerCase() || '';
        if (t.includes('camerata')) return 'bg-fuchsia-500 text-white hover:bg-fuchsia-600'; 
        if (t.includes('ensamble')) return 'bg-emerald-500 text-white hover:bg-emerald-600';
        return 'bg-indigo-500 text-white hover:bg-indigo-600';
    };

    const getEventBadgeStyle = (tipo) => {
        const t = tipo?.toLowerCase() || '';
        if (t.includes('concierto')) return 'bg-amber-100 text-amber-800 border border-amber-200';
        if (t.includes('general')) return 'bg-rose-100 text-rose-800 border border-rose-200';
        return 'bg-slate-100 text-slate-600 border border-slate-200'; 
    };

    // --- LOGICA DE RENDERIZADO POR SEMANAS ---
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
                return (isBefore(tStart, weekEnd) || isSameDay(tStart, weekEnd)) && 
                       (isAfter(tEnd, weekStart) || isSameDay(tEnd, weekStart));
            });

            return (
                <div key={weekIdx} className="flex flex-col border-b-2 border-slate-300 last:border-0 mb-1">
                    
                    {/* --- PISO 1: GIRAS --- */}
                    <div className="relative h-8 bg-slate-50 border-b border-dashed border-slate-200 w-full">
                        {activeToursInWeek.map(tour => {
                            const tStart = parseISO(tour.fecha_desde);
                            const tEnd = parseISO(tour.fecha_hasta);

                            const effectiveStart = isBefore(tStart, weekStart) ? weekStart : tStart;
                            const effectiveEnd = isAfter(tEnd, weekEnd) ? weekEnd : tEnd;

                            const startDayIndex = differenceInCalendarDays(effectiveStart, weekStart);
                            const durationDays = differenceInCalendarDays(effectiveEnd, effectiveStart) + 1;

                            const left = `${startDayIndex * 14.2857}%`;
                            const width = `${durationDays * 14.2857}%`;

                            const isRealStart = isSameDay(tStart, effectiveStart);
                            const isRealEnd = isSameDay(tEnd, effectiveEnd);
                            const roundedClass = `${isRealStart ? 'rounded-l-md pl-2' : 'rounded-l-none border-l-2 border-white/30'} ${isRealEnd ? 'rounded-r-md' : 'rounded-r-none border-r-2 border-white/30'}`;

                            return (
                                <div 
                                    key={tour.id}
                                    // CORRECCIÓN: Ahora tiene onClick y cursor-pointer
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedDate(effectiveStart); // Abre modal en el primer día visible de la gira
                                    }}
                                    className={`absolute top-1 bottom-1 text-xs flex items-center shadow-sm overflow-hidden whitespace-nowrap z-10 cursor-pointer transition-colors ${getTourStyle(tour.tipo)} ${roundedClass}`}
                                    style={{ left, width }}
                                    title={`${tour.nombre_gira} (${tour.tipo}) - Clic para ver detalles y partituras`}
                                >
                                    {(isRealStart || startDayIndex === 0) && (
                                        <div className="flex items-center gap-1 w-full px-1">
                                            <span className="font-bold truncate drop-shadow-md">
                                                {tour.nombre_gira}
                                            </span>
                                            {tour.google_drive_folder_id && (
                                                <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 text-white/90 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                                                    <path d="M20 6h-8l-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V8h16v10z"/>
                                                </svg>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* --- PISO 2: DÍAS --- */}
                    <div className="grid grid-cols-7 min-h-[80px]">
                        {eachDayOfInterval({ start: weekStart, end: weekEnd }).map((day, dayIdx) => {
                            const isCurrentMonth = isSameMonth(day, currentDate);
                            const isTodayDate = isToday(day);
                            
                            const dayEvents = events.filter(e => isSameDay(parseISO(e.fecha), day));
                            const groupedEvents = dayEvents.reduce((acc, evt) => {
                                const type = evt.tipos_evento?.nombre || 'Otro';
                                acc[type] = (acc[type] || 0) + 1;
                                return acc;
                            }, {});

                            return (
                                <div 
                                    key={dayIdx}
                                    onClick={() => (dayEvents.length > 0 || activeToursInWeek.length > 0) && setSelectedDate(day)}
                                    className={`
                                        p-1 border-r border-slate-100 last:border-r-0 relative group transition-colors
                                        ${!isCurrentMonth ? 'bg-slate-50/50 text-slate-300' : 'bg-white text-slate-700 hover:bg-slate-50 cursor-pointer'}
                                    `}
                                >
                                    <div className="flex justify-between items-start">
                                        <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${isTodayDate ? 'bg-indigo-600 text-white' : ''}`}>
                                            {format(day, 'd')}
                                        </span>
                                    </div>

                                    <div className="flex flex-col gap-1 mt-1">
                                        {Object.entries(groupedEvents).map(([type, count], idx) => (
                                            <div key={idx} className={`text-[9px] px-1 py-0.5 rounded border truncate ${getEventBadgeStyle(type)}`}>
                                                {count > 1 && <span className="font-bold">{count}x </span>}
                                                {type}
                                            </div>
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

    const weekDays = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'];

    return (
        <div className="flex flex-col h-full bg-slate-50 relative animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-white p-4 border-b border-slate-200 shadow-sm flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="text-slate-400 hover:text-indigo-600 font-medium text-sm flex items-center gap-1">
                        <IconChevronLeft size={18}/> Volver
                    </button>
                    <h2 className="text-xl font-black text-slate-800 capitalize flex items-center gap-2">
                        {format(currentDate, 'MMMM yyyy', { locale: es })}
                        {loading && <IconLoader size={16} className="animate-spin text-indigo-500"/>}
                    </h2>
                </div>
                <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1">
                    <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-1.5 hover:bg-white rounded-md text-slate-500 transition-all"><IconChevronLeft size={20}/></button>
                    <button onClick={() => setCurrentDate(new Date())} className="text-xs font-bold px-3 py-1 hover:bg-white rounded-md text-slate-600 transition-all">Hoy</button>
                    <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-1.5 hover:bg-white rounded-md text-slate-500 transition-all"><IconChevronRight size={20}/></button>
                </div>
            </div>

            {/* Calendario */}
            <div className="flex-1 p-2 md:p-4 overflow-y-auto">
                <div className="bg-white border border-slate-300 rounded-lg shadow-sm overflow-hidden">
                    <div className="grid grid-cols-7 bg-slate-800 text-white">
                        {weekDays.map(d => (
                            <div key={d} className="text-center text-xs font-bold uppercase tracking-wider py-2">
                                {d}
                            </div>
                        ))}
                    </div>
                    <div className="flex flex-col">
                        {renderWeeks()}
                    </div>
                </div>
            </div>

            {/* MODAL DETALLE */}
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
                            {/* GIRAS ACTIVAS */}
                            {tours.filter(t => isWithinInterval(selectedDate, { start: parseISO(t.fecha_desde), end: parseISO(t.fecha_hasta) })).map(tour => (
                                <div key={tour.id} className={`p-3 rounded-lg border-l-4 shadow-sm bg-slate-50 border-indigo-500`}>
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1 min-w-0 pr-2">
                                            <div className="text-[10px] font-black uppercase tracking-wider text-indigo-600 mb-1">Gira / Programa</div>
                                            <div className="font-bold text-base leading-tight text-slate-800 break-words">{tour.nombre_gira}</div>
                                            <div className="text-xs mt-1 text-slate-500">{tour.tipo}</div>
                                        </div>

                                        {/* BOTÓN DRIVE EN EL MODAL */}
                                        {tour.google_drive_folder_id && (
                                            <a 
                                                href={`https://drive.google.com/drive/folders/${tour.google_drive_folder_id}`} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="flex flex-col items-center justify-center bg-indigo-50 hover:bg-indigo-100 text-indigo-700 p-2 rounded-lg transition-colors border border-indigo-200 shrink-0 group"
                                                title="Abrir carpeta de partituras"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:scale-110 transition-transform">
                                                    <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 2H4a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2Z"/>
                                                    <path d="M12 10v6"/>
                                                    <path d="M9 13l3 3 3-3"/>
                                                </svg>
                                                <span className="text-[9px] font-bold mt-1">Partituras</span>
                                            </a>
                                        )}
                                    </div>
                                </div>
                            ))}

                            {/* EVENTOS PUNTUALES */}
                            {events.filter(e => isSameDay(parseISO(e.fecha), selectedDate)).sort((a,b) => a.hora_inicio.localeCompare(b.hora_inicio)).map(evt => (
                                <div key={evt.id} className="flex gap-3 items-start group">
                                    <div className="w-14 text-center pt-1 shrink-0">
                                        <div className="text-sm font-bold text-slate-700 bg-slate-100 rounded px-1">{evt.hora_inicio?.slice(0,5)}</div>
                                    </div>
                                    <div className="flex-1 pb-3 border-b border-slate-100 group-last:border-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border ${getEventBadgeStyle(evt.tipos_evento?.nombre)}`}>
                                                {evt.tipos_evento?.nombre}
                                            </span>
                                        </div>
                                        <div className="text-sm text-slate-600 font-medium leading-tight">
                                            {evt.descripcion || 'Sin descripción'}
                                        </div>
                                        <div className="flex items-center gap-1 text-xs text-slate-400 mt-1">
                                            <IconMapPin size={12}/> 
                                            {evt.locaciones?.nombre || 'Lugar a definir'}
                                        </div>
                                        {/* Botón Drive para Eventos Puntuales (si lo tuvieran) */}
                                        {evt.programas?.google_drive_folder_id && (
                                            <a 
                                                href={`https://drive.google.com/drive/folders/${evt.programas.google_drive_folder_id}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 mt-2 bg-indigo-50 px-2 py-1 rounded border border-indigo-100"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 2H4a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2Z"/></svg>
                                                Partituras
                                            </a>
                                        )}
                                    </div>
                                </div>
                            ))}
                            
                            {events.filter(e => isSameDay(parseISO(e.fecha), selectedDate)).length === 0 && 
                             tours.filter(t => isWithinInterval(selectedDate, { start: parseISO(t.fecha_desde), end: parseISO(t.fecha_hasta) })).length === 0 && (
                                <div className="text-center text-slate-400 italic py-4">Sin actividad.</div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}