import React, { useState, useEffect } from "react";
import { 
    IconCheck, IconX, IconLoader, IconClock, IconMapPin, IconCalendar, IconUtensils, IconInfo 
} from "../../components/ui/Icons";
import { format, parseISO, isAfter, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

// --- HELPER CONVOCATORIA ---
const isUserConvoked = (convocadosList, userAttributes) => {
    if (!convocadosList || convocadosList.length === 0) return false;
    return convocadosList.some(tag => {
        if (tag === "GRP:TUTTI") return true;
        if (tag === "GRP:LOCALES") return userAttributes.is_local;
        if (tag === "GRP:NO_LOCALES") return !userAttributes.is_local;
        if (tag === "GRP:PRODUCCION") return userAttributes.rol_gira === 'produccion';
        if (tag === "GRP:SOLISTAS") return userAttributes.rol_gira === 'solista';
        if (tag === "GRP:DIRECTORES") return userAttributes.rol_gira === 'director';
        if (tag.startsWith("LOC:")) return userAttributes.id_localidad === parseInt(tag.split(":")[1]);
        if (tag.startsWith("FAM:")) return userAttributes.familia === tag.split(":")[1];
        return false;
    });
};

export default function MealsAttendancePersonal({ supabase, gira, userId }) {
    const [loading, setLoading] = useState(true);
    const [myEvents, setMyEvents] = useState([]);
    const [answers, setAnswers] = useState({}); 
    const [submitting, setSubmitting] = useState(null);
    const [userData, setUserData] = useState(null);

    // Chequeo global de fecha límite
    const deadline = gira?.fecha_confirmacion_limite ? parseISO(gira.fecha_confirmacion_limite) : null;
    const isExpired = deadline && isAfter(new Date(), deadline);

    useEffect(() => {
        if (gira?.id && userId) fetchMyData();
    }, [gira?.id, userId]);

    const fetchMyData = async () => {
        setLoading(true);
        try {
            // 1. Obtener datos del integrante (CORREGIDO: columna 'alimentacion')
            const { data: userRow } = await supabase
                .from('integrantes')
                .select('id, id_localidad, instrumentos(familia), alimentacion') 
                .eq('id', userId)
                .single();

            // 2. Obtener overrides de rol
            const { data: override } = await supabase
                .from('giras_integrantes')
                .select('rol, estado')
                .eq('id_gira', gira.id)
                .eq('id_integrante', userId)
                .maybeSingle();

            // 3. Obtener localidades de la gira
            const { data: tourLocs } = await supabase
                .from('giras_localidades')
                .select('id_localidad')
                .eq('id_gira', gira.id);
            
            const tourLocSet = new Set(tourLocs?.map(l => l.id_localidad));
            
            // Construir atributos
            const userAttrs = {
                id_localidad: userRow?.id_localidad,
                familia: userRow?.instrumentos?.familia,
                rol_gira: override?.rol || 'musico',
                is_local: tourLocSet.has(userRow?.id_localidad)
            };

            setUserData({ ...userRow, ...userAttrs }); 

            // 4. Traer Eventos
            const { data: events } = await supabase
                .from('eventos')
                .select('*, locaciones(nombre), tipos_evento(nombre)')
                .eq('id_gira', gira.id)
                .in('id_tipo_evento', [7,8,9,10])
                .order('fecha', { ascending: true })
                .order('hora_inicio', { ascending: true });

            // 5. Traer mis respuestas
            const { data: myAnswers } = await supabase
                .from('eventos_asistencia')
                .select('id_evento, estado')
                .eq('id_integrante', userId);

            const answersMap = {};
            myAnswers?.forEach(a => answersMap[a.id_evento] = a.estado);
            setAnswers(answersMap);

            // 6. Filtrar convocatoria
            const relevantEvents = events.filter(evt => isUserConvoked(evt.convocados, userAttrs));
            setMyEvents(relevantEvents);

        } catch (error) { console.error(error); } finally { setLoading(false); }
    };

    const handleResponse = async (eventId, status) => {
        if (isExpired) return alert("El tiempo para confirmar asistencia ha expirado.");
        setSubmitting(eventId);
        try {
            const { error } = await supabase
                .from('eventos_asistencia')
                .upsert(
                    { id_evento: eventId, id_integrante: userId, estado: status },
                    { onConflict: 'id_evento, id_integrante' }
                );
            if (error) throw error;
            setAnswers(prev => ({ ...prev, [eventId]: status }));
        } catch (error) {
            alert("Error al guardar asistencia");
        } finally {
            setSubmitting(null);
        }
    };

    if (loading) return <div className="p-8 flex justify-center"><IconLoader className="animate-spin text-indigo-500" size={32}/></div>;

    if (myEvents.length === 0) {
        return (
            <div className="p-8 text-center text-slate-400 bg-white rounded-lg border border-slate-200 shadow-sm">
                <IconUtensils size={40} className="mx-auto mb-3 opacity-20"/>
                <p>No tienes comidas asignadas en esta gira.</p>
            </div>
        );
    }

    const grouped = myEvents.reduce((acc, evt) => {
        if(!acc[evt.fecha]) acc[evt.fecha] = [];
        acc[evt.fecha].push(evt);
        return acc;
    }, {});

    return (
        <div className="space-y-4 max-w-2xl mx-auto pb-10">
            
            {/* --- TARJETA DE INFORMACIÓN LOGÍSTICA --- */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6">
                <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex justify-between items-center">
                    <h3 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                        <IconInfo size={14}/> Tu Información
                    </h3>
                    {userData?.is_local && (
                        <span className="text-[10px] font-bold bg-orange-100 text-orange-700 px-2 py-0.5 rounded border border-orange-200">
                            RESIDENTE LOCAL
                        </span>
                    )}
                </div>
                <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    {/* FECHA LÍMITE */}
                    <div className="flex flex-col">
                        <span className="text-slate-400 text-xs mb-1">Cierre de Confirmación</span>
                        {deadline ? (
                            <div className={`font-medium flex items-center gap-2 ${isExpired ? 'text-red-600' : 'text-slate-700'}`}>
                                <IconClock size={16} className={isExpired ? 'text-red-500' : 'text-slate-400'}/>
                                <div>
                                    <p>{format(deadline, "EEEE d 'de' MMMM, HH:mm", { locale: es })}hs</p>
                                    {!isExpired && (
                                        <p className="text-xs text-emerald-600 font-bold">
                                            Quedan {formatDistanceToNow(deadline, { locale: es })}
                                        </p>
                                    )}
                                    {isExpired && <p className="text-xs font-bold">FINALIZADO</p>}
                                </div>
                            </div>
                        ) : (
                            <div className="text-slate-500 italic">Sin fecha límite establecida</div>
                        )}
                    </div>

                    {/* DIETA / ALIMENTACIÓN */}
                    <div className="flex flex-col border-t md:border-t-0 md:border-l border-slate-100 pt-3 md:pt-0 md:pl-4">
                        <span className="text-slate-400 text-xs mb-1">Alimentación Especial</span>
                        <div className="flex items-center gap-2">
                            <IconUtensils size={16} className="text-slate-400"/>
                            {/* Verificamos si hay valor en 'alimentacion' */}
                            {userData?.alimentacion ? (
                                <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 inline-block">
                                    {userData.alimentacion}
                                </span>
                            ) : (
                                <span className="text-slate-500 italic">No especificada (Menú Estándar)</span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* --- LISTA DE EVENTOS --- */}
            {Object.entries(grouped).map(([date, dayEvents]) => (
                <div key={date} className="animate-in slide-in-from-bottom-2 fade-in duration-500">
                    <h3 className="text-sm font-bold text-slate-500 uppercase mb-3 ml-1 flex items-center gap-2 sticky top-0 bg-slate-50 py-2 z-10">
                        <IconCalendar size={14}/> {format(parseISO(date), "EEEE d 'de' MMMM", { locale: es })}
                    </h3>
                    
                    <div className="space-y-3">
                        {dayEvents.map(evt => {
                            const myStatus = answers[evt.id];
                            const isLoading = submitting === evt.id;
                            
                            return (
                                <div key={evt.id} className={`bg-white rounded-xl shadow-sm border overflow-hidden transition-all ${
                                    myStatus === 'P' ? 'border-emerald-200 ring-1 ring-emerald-100' :
                                    myStatus === 'A' ? 'border-red-200 ring-1 ring-red-50' :
                                    'border-slate-200'
                                }`}>
                                    <div className="p-4 flex justify-between items-start gap-4">
                                        <div>
                                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide mb-1 ${
                                                evt.id_tipo_evento === 8 ? 'bg-amber-100 text-amber-700' : 
                                                evt.id_tipo_evento === 10 ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'
                                            }`}>
                                                {evt.tipos_evento?.nombre}
                                            </span>
                                            <div className="text-xl font-bold text-slate-800 flex items-baseline gap-2">
                                                {evt.hora_inicio?.slice(0,5)} <span className="text-xs font-normal text-slate-400">hs</span>
                                            </div>
                                            {evt.locaciones?.nombre && (
                                                <div className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                                                    <IconMapPin size={12}/> {evt.locaciones.nombre}
                                                </div>
                                            )}
                                        </div>

                                        <div className="shrink-0">
                                            {isLoading ? <IconLoader className="animate-spin text-indigo-500"/> : (
                                                <>
                                                    {myStatus === 'P' && <div className="flex flex-col items-center text-emerald-600"><IconCheck size={28}/><span className="text-[10px] font-bold">ASISTIRÉ</span></div>}
                                                    {myStatus === 'A' && <div className="flex flex-col items-center text-red-500"><IconX size={28}/><span className="text-[10px] font-bold">NO VOY</span></div>}
                                                    {!myStatus && <div className="bg-orange-100 text-orange-600 px-2 py-1 rounded text-[10px] font-bold">PENDIENTE</div>}
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 border-t border-slate-100 divide-x divide-slate-100">
                                        <button 
                                            onClick={() => handleResponse(evt.id, 'P')}
                                            disabled={isExpired || isLoading}
                                            className={`p-3 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${
                                                myStatus === 'P' ? 'bg-emerald-50 text-emerald-700' : 'hover:bg-emerald-50 text-slate-600 hover:text-emerald-700'
                                            } ${isExpired ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        >
                                            Confirmar
                                        </button>
                                        <button 
                                            onClick={() => handleResponse(evt.id, 'A')}
                                            disabled={isExpired || isLoading}
                                            className={`p-3 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${
                                                myStatus === 'A' ? 'bg-red-50 text-red-700' : 'hover:bg-red-50 text-slate-600 hover:text-red-700'
                                            } ${isExpired ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        >
                                            No asistiré
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
}