import React, { useState, useEffect } from 'react';
import { 
    IconCalendar, IconMapPin, IconFilter, 
    IconUsers, IconChevronLeft, IconLoader, IconCheck, IconX 
} from '../../components/ui/Icons';
import { useAuth } from '../../context/AuthContext';

export default function AgendaGeneral({ supabase, onBack }) {
    const { user } = useAuth();
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Configuración inicial de fechas: 6 meses atrás y 6 meses adelante para ver más datos
    const today = new Date();
    const pastDate = new Date(); pastDate.setMonth(today.getMonth() - 6);
    const futureDate = new Date(); futureDate.setMonth(today.getMonth() + 6);
    
    const [dateStart, setDateStart] = useState(pastDate.toISOString().split('T')[0]);
    const [dateEnd, setDateEnd] = useState(futureDate.toISOString().split('T')[0]);

    const [selectedTypes, setSelectedTypes] = useState(new Set(['Ensayo', 'Concierto', 'Ensayo General', 'Otros']));
    const [selectedEnsembles, setSelectedEnsembles] = useState(new Set());
    const [selectedFamilies, setSelectedFamilies] = useState(new Set());

    const [catalogTypes, setCatalogTypes] = useState([]);
    const [catalogEnsembles, setCatalogEnsembles] = useState([]);
    const [catalogFamilies] = useState(['Cuerdas', 'Maderas', 'Metales', 'Percusión', 'Teclados']); 
    
    const [showFilters, setShowFilters] = useState(false);

    useEffect(() => {
        fetchCatalogs();
    }, []);

    useEffect(() => {
        if (dateStart && dateEnd) {
            fetchEvents();
        }
    }, [dateStart, dateEnd, user.id]);

    const fetchCatalogs = async () => {
        const { data: tipos } = await supabase.from('tipos_evento').select('*');
        if (tipos) setCatalogTypes(tipos);
        const { data: ens } = await supabase.from('ensambles').select('*');
        if (ens) setCatalogEnsembles(ens);
    };

    const fetchEvents = async () => {
        setLoading(true);
        console.log("--- INICIANDO FETCH AGENDA ---");
        console.log("Fechas:", dateStart, "a", dateEnd);

        try {
            const userRole = user?.rol_sistema || '';
            const isPersonal = userRole === 'consulta_personal' || userRole === 'personal';
            console.log("Rol detectado:", userRole, "| Es personal:", isPersonal);

            // 1. Datos del usuario personal
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
                    console.log("Mis Ensambles:", Array.from(myEnsembles), "Mi Familia:", myFamily);
                }
            }

            // 2. Consulta a Supabase
            const { data, error } = await supabase
                .from('eventos')
                .select(`
                    *,
                    tipos_evento (nombre),
                    locaciones (nombre),
                    programas (
                        id, nombre_gira, tipo,
                        giras_fuentes (tipo, valor_id, valor_texto),
                        giras_integrantes (id_integrante, estado)
                    )
                `)
                .gte('fecha', dateStart)
                .lte('fecha', dateEnd)
                .order('fecha', { ascending: true })
                .order('hora_inicio', { ascending: true });

            if (error) throw error;

            console.log("Eventos traídos de DB (Brutos):", data?.length || 0);

            let result = data || [];

            // 3. Filtrado Personal
            if (isPersonal) {
                result = result.filter(evt => {
                    const prog = evt.programas;
                    if (!prog) return false; 

                    const overrides = prog.giras_integrantes || [];
                    const sources = prog.giras_fuentes || [];
                    const myOverride = overrides.find(o => o.id_integrante === user.id);
                    
                    if (myOverride && myOverride.estado === 'ausente') return false;
                    if (myOverride) return true;

                    const matchesEnsemble = sources.some(s => s.tipo === 'ENSAMBLE' && myEnsembles.has(s.valor_id));
                    const matchesFamily = sources.some(s => s.tipo === 'FAMILIA' && s.valor_texto === myFamily);

                    return matchesEnsemble || matchesFamily;
                });
                console.log("Eventos después de filtro PERSONAL:", result.length);
            }

            setEvents(result);
        } catch (err) {
            console.error("Error fetching events:", err);
        } finally {
            setLoading(false);
        }
    };

    const toggleFilter = (set, value, setter) => {
        const newSet = new Set(set);
        if (newSet.has(value)) newSet.delete(value);
        else newSet.add(value);
        setter(newSet);
    };

    const filteredEvents = events.filter(evt => {
        const typeName = evt.tipos_evento?.nombre || 'Otro';
        
        let typeMatch = false;
        // Lógica de tipos corregida para ser más permisiva
        const isConcierto = typeName.toLowerCase().includes('concierto');
        const isGeneral = typeName.toLowerCase().includes('general'); // Ensayo General
        const isEnsayo = typeName.toLowerCase().includes('ensayo') && !isGeneral;
        
        if (selectedTypes.has('Otros') && !isConcierto && !isEnsayo && !isGeneral) typeMatch = true;
        if (selectedTypes.has('Concierto') && isConcierto) typeMatch = true;
        if (selectedTypes.has('Ensayo') && isEnsayo) typeMatch = true;
        if (selectedTypes.has('Ensayo General') && isGeneral) typeMatch = true;
        
        if (!typeMatch) return false;

        if (selectedEnsembles.size > 0) {
            const fuentes = evt.programas?.giras_fuentes || [];
            const hasEnsemble = fuentes.some(f => f.tipo === 'ENSAMBLE' && selectedEnsembles.has(f.valor_id));
            if (!hasEnsemble) return false; 
        }

        if (selectedFamilies.size > 0) {
            const fuentes = evt.programas?.giras_fuentes || [];
            const hasFamily = fuentes.some(f => f.tipo === 'FAMILIA' && selectedFamilies.has(f.valor_texto));
            if (!hasFamily) return false;
        }

        return true;
    });

    const groupedEvents = filteredEvents.reduce((acc, evt) => {
        const date = evt.fecha;
        if (!acc[date]) acc[date] = [];
        acc[date].push(evt);
        return acc;
    }, {});

    const getEventColor = (name) => {
        const n = name?.toLowerCase() || '';
        if (n.includes('concierto')) return 'border-l-4 border-amber-500 bg-amber-50';
        if (n.includes('general')) return 'border-l-4 border-rose-500 bg-rose-50';
        if (n.includes('ensayo')) return 'border-l-4 border-indigo-500 bg-indigo-50';
        return 'border-l-4 border-slate-300 bg-white';
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="bg-white p-4 border-b border-slate-200 shadow-sm flex flex-col gap-4 shrink-0">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500">
                            <IconChevronLeft size={24}/>
                        </button>
                        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            <IconCalendar className="text-indigo-600"/> Agenda General
                        </h2>
                    </div>
                    
                    <button 
                        onClick={() => setShowFilters(!showFilters)}
                        className={`px-3 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${showFilters ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}
                    >
                        <IconFilter size={16}/> Filtros {showFilters ? <IconX size={14}/> : ''}
                    </button>
                </div>

                {showFilters && (
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-6 text-sm animate-in fade-in slide-in-from-top-2">
                        <div className="space-y-2">
                            <label className="font-bold text-slate-400 text-xs uppercase">Rango de Fechas</label>
                            <div className="flex items-center gap-2">
                                <input type="date" value={dateStart} onChange={e => setDateStart(e.target.value)} className="w-full p-2 border rounded text-slate-700 text-xs"/>
                                <span className="text-slate-400">-</span>
                                <input type="date" value={dateEnd} onChange={e => setDateEnd(e.target.value)} className="w-full p-2 border rounded text-slate-700 text-xs"/>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="font-bold text-slate-400 text-xs uppercase">Tipo de Evento</label>
                            <div className="flex flex-wrap gap-2">
                                {['Ensayo', 'Ensayo General', 'Concierto', 'Otros'].map(type => (
                                    <button 
                                        key={type}
                                        onClick={() => toggleFilter(selectedTypes, type, setSelectedTypes)}
                                        className={`px-3 py-1 rounded-full text-xs font-bold border transition-all flex items-center gap-1 ${selectedTypes.has(type) ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-500 border-slate-200'}`}
                                    >
                                        {selectedTypes.has(type) && <IconCheck size={12}/>} {type}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="font-bold text-slate-400 text-xs uppercase">Filtrar por Grupo (Opcional)</label>
                            <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
                                {catalogEnsembles.map(ens => (
                                    <button 
                                        key={ens.id}
                                        onClick={() => toggleFilter(selectedEnsembles, ens.id, setSelectedEnsembles)}
                                        className={`px-2 py-1 rounded border text-[10px] uppercase font-bold transition-all ${selectedEnsembles.has(ens.id) ? 'bg-emerald-100 text-emerald-700 border-emerald-300' : 'bg-white text-slate-400 border-slate-200'}`}
                                    >
                                        {ens.ensamble}
                                    </button>
                                ))}
                                {catalogFamilies.map(fam => (
                                    <button 
                                        key={fam}
                                        onClick={() => toggleFilter(selectedFamilies, fam, setSelectedFamilies)}
                                        className={`px-2 py-1 rounded border text-[10px] uppercase font-bold transition-all ${selectedFamilies.has(fam) ? 'bg-blue-100 text-blue-700 border-blue-300' : 'bg-white text-slate-400 border-slate-200'}`}
                                    >
                                        {fam}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-8">
                {loading ? (
                    <div className="flex items-center justify-center h-full text-slate-400 gap-2"><IconLoader className="animate-spin"/> Cargando agenda...</div>
                ) : Object.keys(groupedEvents).length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-slate-400 italic bg-slate-50 rounded-xl border border-dashed border-slate-200">
                        <p>No hay eventos para los filtros seleccionados.</p>
                        <p className="text-xs mt-2">({filteredEvents.length} eventos mostrados de {events.length} cargados)</p>
                    </div>
                ) : (
                    Object.keys(groupedEvents).sort().map(date => {
                        const dateObj = new Date(date + 'T00:00:00');
                        const dayName = dateObj.toLocaleDateString('es-AR', { weekday: 'long' });
                        const dayNum = dateObj.getDate();
                        const month = dateObj.toLocaleDateString('es-AR', { month: 'long' });

                        return (
                            <div key={date} className="relative pl-4 md:pl-0">
                                <div className="sticky top-0 bg-slate-50 py-2 z-10 flex items-baseline gap-2 mb-2 border-b border-slate-200/50">
                                    <span className="text-2xl font-black text-slate-700">{dayNum}</span>
                                    <span className="text-sm font-bold text-slate-500 uppercase">{dayName}</span>
                                    <span className="text-xs text-slate-400 uppercase">de {month}</span>
                                </div>

                                <div className="space-y-3">
                                    {groupedEvents[date].map(evt => (
                                        <div key={evt.id} className={`p-3 rounded-lg border shadow-sm hover:shadow-md transition-shadow flex gap-4 items-start ${getEventColor(evt.tipos_evento?.nombre)}`}>
                                            <div className="w-16 shrink-0 text-center pt-1">
                                                <div className="text-sm font-bold text-slate-700">{evt.hora_inicio?.slice(0,5)}</div>
                                                <div className="text-[10px] text-slate-400">HS</div>
                                            </div>
                                            
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border ${
                                                        evt.tipos_evento?.nombre?.toLowerCase().includes('concierto') ? 'bg-amber-100 text-amber-700 border-amber-200' : 
                                                        'bg-slate-100 text-slate-600 border-slate-200'
                                                    }`}>
                                                        {evt.tipos_evento?.nombre}
                                                    </span>
                                                    <span className="text-xs text-indigo-600 font-bold truncate cursor-pointer hover:underline" title="Ver programa">
                                                        {evt.programas?.nombre_gira}
                                                    </span>
                                                </div>
                                                
                                                <div className="text-sm text-slate-600 font-medium leading-tight mb-1">
                                                    {evt.detalle || 'Actividad Programada'}
                                                </div>

                                                <div className="flex items-center gap-4 text-xs text-slate-500 mt-2">
                                                    <div className="flex items-center gap-1">
                                                        <IconMapPin size={12}/> {evt.locaciones?.nombre || 'Lugar a definir'}
                                                    </div>
                                                    {(evt.programas?.giras_fuentes?.length > 0) && (
                                                        <div className="flex items-center gap-1 overflow-hidden">
                                                            <IconUsers size={12}/> 
                                                            <span className="truncate max-w-[150px]">
                                                                {evt.programas.giras_fuentes.map(f => f.tipo === 'ENSAMBLE' 
                                                                    ? catalogEnsembles.find(e => e.id === f.valor_id)?.ensamble 
                                                                    : f.valor_texto
                                                                ).join(', ')}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}