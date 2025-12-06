import React, { useState, useEffect } from 'react';
import { IconPlus, IconX, IconCheck, IconCalendar, IconLoader, IconChevronDown } from '../../components/ui/Icons';
import EnsembleMultiSelect from '../../components/filters/EnsembleMultiSelect';
import DateInput from '../../components/ui/DateInput'; // <--- IMPORTAMOS EL COMPONENTE DE FECHA

const GENERO_OPCIONES = ["F", "M", "-"];

export default function MusicianForm({ 
    supabase,
    musicianId,
    formData, 
    setFormData, 
    onCancel, 
    onSave, 
    loading, 
    isNew = false, 
    catalogoInstrumentos, 
    ensemblesList, 
    musicianEnsembles, 
    setMusicianEnsembles 
}) {
    // --- ESTADOS PARA EL HISTORIAL ---
    const [historyOpen, setHistoryOpen] = useState(false);
    const [historyView, setHistoryView] = useState('giras'); // 'giras' | 'eventos'
    const [historyData, setHistoryData] = useState({ giras: [], eventos: [] });
    const [loadingHistory, setLoadingHistory] = useState(false);

    // Cargar historial solo cuando se abre la pestaña
    useEffect(() => {
        if (historyOpen && musicianId && historyData.giras.length === 0) {
            fetchHistory();
        }
    }, [historyOpen]);

    const fetchHistory = async () => {
        setLoadingHistory(true);
        try {
            // 1. Buscar Giras donde está el músico (tabla intermedia)
            const { data: girasRel, error } = await supabase
                .from('giras_integrantes')
                .select(`
                    estado,
                    giras (
                        id, nombre_gira, fecha_desde, fecha_hasta,
                        eventos (
                            id, fecha, hora_inicio, descripcion,
                            tipos_evento (nombre, color),
                            locaciones (nombre)
                        )
                    )
                `)
                .eq('id_integrante', musicianId);

            if (error) throw error;

            const girasList = [];
            let eventosList = [];

            girasRel.forEach(item => {
                if (!item.giras) return;
                
                // Formatear Gira
                girasList.push({
                    id: item.giras.id,
                    nombre: item.giras.nombre_gira,
                    fechas: `${formatDate(item.giras.fecha_desde)} - ${formatDate(item.giras.fecha_hasta)}`,
                    estado_asistencia: item.estado // 'confirmado' o 'ausente'
                });

                // Si el músico NO está ausente en la gira, agregamos sus eventos
                if (item.estado !== 'ausente' && item.giras.eventos) {
                    const evts = item.giras.eventos.map(e => ({
                        id: e.id,
                        fecha: e.fecha,
                        hora: e.hora_inicio,
                        tipo: e.tipos_evento?.nombre,
                        color: e.tipos_evento?.color,
                        lugar: e.locaciones?.nombre,
                        gira_nombre: item.giras.nombre_gira
                    }));
                    eventosList = [...eventosList, ...evts];
                }
            });

            // Ordenar eventos por fecha
            eventosList.sort((a, b) => new Date(a.fecha + 'T' + a.hora) - new Date(b.fecha + 'T' + b.hora));

            setHistoryData({ giras: girasList, eventos: eventosList });

        } catch (err) {
            console.error("Error historial:", err);
        } finally {
            setLoadingHistory(false);
        }
    };

    const formatDate = (d) => {
        if(!d) return '';
        const [y, m, day] = d.split('-');
        return `${day}/${m}/${y}`;
    };

    return (
        <div className={`p-4 rounded-xl border shadow-sm animate-in fade-in zoom-in-95 duration-200 ${isNew ? 'bg-indigo-50 border-indigo-200' : 'bg-white ring-2 ring-indigo-500 border-indigo-500 z-10 relative'}`}>
            {isNew && <h3 className="text-indigo-900 font-bold mb-4 flex items-center gap-2 border-b border-indigo-100 pb-2"><IconPlus size={18}/> Nuevo Integrante</h3>}
            
            {/* --- FORMULARIO DE DATOS PERSONALES --- */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-1"><label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Nombre</label><input type="text" className="w-full border border-slate-300 p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none bg-white" value={formData.nombre} onChange={(e) => setFormData({...formData, nombre: e.target.value})}/></div>
                <div className="md:col-span-1"><label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Apellido</label><input type="text" className="w-full border border-slate-300 p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none bg-white" value={formData.apellido} onChange={(e) => setFormData({...formData, apellido: e.target.value})}/></div>
                <div className="md:col-span-2"><label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Instrumento</label><select className="w-full border border-slate-300 p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none bg-white" value={formData.id_instr} onChange={(e) => setFormData({...formData, id_instr: e.target.value})}><option value="">-- Sin Asignar --</option>{catalogoInstrumentos.map(inst => (<option key={inst.id} value={inst.id}>{inst.instrumento}</option>))}</select></div>
                
                <div className="md:col-span-1"><label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">DNI (Número)</label><input type="number" className="w-full border border-slate-300 p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none bg-white" value={formData.dni} onChange={(e) => setFormData({...formData, dni: e.target.value})}/></div>
                <div className="md:col-span-1"><label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">CUIL</label><input type="text" className="w-full border border-slate-300 p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none bg-white" value={formData.cuil} onChange={(e) => setFormData({...formData, cuil: e.target.value})}/></div>
                <div className="md:col-span-1"><label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Nacionalidad</label><input type="text" className="w-full border border-slate-300 p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none bg-white" value={formData.nacionalidad} onChange={(e) => setFormData({...formData, nacionalidad: e.target.value})}/></div>
                
                {/* FECHA NACIMIENTO CON DATEINPUT */}
                <div className="md:col-span-1">
                    <DateInput 
                        label="Fecha Nacimiento" 
                        value={formData.fecha_nac} 
                        onChange={(val) => setFormData({...formData, fecha_nac: val})} 
                    />
                </div>

                {/* FECHAS ALTA/BAJA CON DATEINPUT */}
                <div className="md:col-span-1">
                    <div className="bg-emerald-50/50 p-1 rounded">
                        <DateInput 
                            label="Fecha de Alta" 
                            value={formData.fecha_alta} 
                            onChange={(val) => setFormData({...formData, fecha_alta: val})} 
                        />
                    </div>
                </div>
                <div className="md:col-span-1">
                    <div className="bg-red-50/50 p-1 rounded">
                        <DateInput 
                            label="Fecha de Baja" 
                            value={formData.fecha_baja} 
                            onChange={(val) => setFormData({...formData, fecha_baja: val})} 
                        />
                    </div>
                </div>

                <div className="md:col-span-1"><label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Teléfono</label><input type="text" className="w-full border border-slate-300 p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none bg-white" value={formData.telefono} onChange={(e) => setFormData({...formData, telefono: e.target.value})}/></div>
                <div className="md:col-span-1"><label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Email Contacto</label><input type="email" className="w-full border border-slate-300 p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none bg-white" value={formData.mail} onChange={(e) => setFormData({...formData, mail: e.target.value})}/></div>
                
                <div className="md:col-span-1 relative">
                    <label className="text-[10px] uppercase font-bold text-indigo-500 mb-1 flex items-center gap-1">Email Google Calendar</label>
                    <input type="email" placeholder="para invitaciones..." className="w-full border border-indigo-200 bg-indigo-50/30 p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none" value={formData.email_google || ''} onChange={(e) => setFormData({...formData, email_google: e.target.value})}/>
                </div>

                <div className="md:col-span-1">
                    <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Género</label>
                    <select className="w-full border border-slate-300 p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none bg-white" value={formData.genero} onChange={(e) => setFormData({...formData, genero: e.target.value})}>
                        <option value="">-- Seleccionar --</option>
                        {GENERO_OPCIONES.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                </div>
                <div className="md:col-span-2"><label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Alimentación</label><input type="text" className="w-full border border-slate-300 p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none bg-white" value={formData.alimentacion} onChange={(e) => setFormData({...formData, alimentacion: e.target.value})}/></div>
                
                <div className="md:col-span-4 border-t border-slate-100 pt-3 mt-1">
                    <EnsembleMultiSelect ensembles={ensemblesList} selectedEnsembleIds={musicianEnsembles} onChange={setMusicianEnsembles} />
                </div>
            </div>

            {/* --- SECCIÓN HISTORIAL (DESPLEGABLE) --- */}
            {!isNew && (
                <div className="mt-6 border border-slate-200 rounded-lg overflow-hidden">
                    <button 
                        onClick={() => setHistoryOpen(!historyOpen)}
                        className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
                    >
                        <span className="text-sm font-bold text-slate-600 flex items-center gap-2">
                            <IconCalendar size={16} className="text-indigo-600"/> Historial de Actividad
                        </span>
                        <IconChevronDown size={16} className={`text-slate-400 transition-transform ${historyOpen ? 'rotate-180' : ''}`}/>
                    </button>

                    {historyOpen && (
                        <div className="p-4 bg-white border-t border-slate-200 animate-in slide-in-from-top-2">
                            {/* Pestañas internas */}
                            <div className="flex gap-2 mb-3">
                                <button 
                                    onClick={() => setHistoryView('giras')} 
                                    className={`text-xs px-3 py-1 rounded-full border transition-all ${historyView === 'giras' ? 'bg-indigo-600 text-white border-indigo-600' : 'text-slate-500 hover:bg-slate-50'}`}
                                >
                                    Ver Giras ({historyData.giras.length})
                                </button>
                                <button 
                                    onClick={() => setHistoryView('eventos')} 
                                    className={`text-xs px-3 py-1 rounded-full border transition-all ${historyView === 'eventos' ? 'bg-indigo-600 text-white border-indigo-600' : 'text-slate-500 hover:bg-slate-50'}`}
                                >
                                    Ver Eventos ({historyData.eventos.length})
                                </button>
                            </div>

                            {loadingHistory ? (
                                <div className="p-4 text-center text-indigo-600"><IconLoader className="animate-spin inline"/> Cargando historial...</div>
                            ) : (
                                <div className="max-h-60 overflow-y-auto pr-1">
                                    {/* VISTA GIRAS */}
                                    {historyView === 'giras' && (
                                        <div className="space-y-2">
                                            {historyData.giras.map(g => (
                                                <div key={g.id} className="flex justify-between items-center p-2 rounded border border-slate-100 hover:bg-slate-50 text-xs">
                                                    <div>
                                                        <div className="font-bold text-slate-700">{g.nombre}</div>
                                                        <div className="text-slate-400">{g.fechas}</div>
                                                    </div>
                                                    <span className={`px-2 py-0.5 rounded capitalize ${g.estado_asistencia === 'ausente' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                                        {g.estado_asistencia}
                                                    </span>
                                                </div>
                                            ))}
                                            {historyData.giras.length === 0 && <div className="text-xs text-slate-400 italic text-center p-2">Sin giras registradas.</div>}
                                        </div>
                                    )}

                                    {/* VISTA EVENTOS */}
                                    {historyView === 'eventos' && (
                                        <div className="space-y-2">
                                            {historyData.eventos.map(evt => (
                                                <div key={evt.id} className="p-2 rounded border-l-2 border-slate-200 bg-slate-50/50 hover:bg-white text-xs flex gap-3" style={{ borderLeftColor: evt.color || '#cbd5e1' }}>
                                                    <div className="min-w-[40px] text-right text-slate-500">
                                                        <div className="font-bold">{formatDate(evt.fecha)}</div>
                                                        <div>{evt.hora?.slice(0,5)}</div>
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-slate-700 flex gap-2">
                                                            {evt.tipo} 
                                                            <span className="font-normal text-slate-400 text-[10px] bg-white px-1 border rounded self-center">{evt.gira_nombre}</span>
                                                        </div>
                                                        <div className="text-slate-500">{evt.lugar || 'Sin lugar'}</div>
                                                    </div>
                                                </div>
                                            ))}
                                            {historyData.eventos.length === 0 && <div className="text-xs text-slate-400 italic text-center p-2">Sin eventos confirmados.</div>}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-indigo-100/50">
                <button onClick={onCancel} className="flex items-center gap-1 px-3 py-1.5 rounded text-slate-600 hover:bg-slate-100 text-sm font-medium"><IconX size={16}/> Cancelar</button>
                <button onClick={onSave} disabled={loading} className="flex items-center gap-1 px-4 py-1.5 rounded bg-indigo-600 text-white hover:bg-indigo-700 text-sm font-medium shadow-sm"><IconCheck size={16}/> Guardar</button>
            </div>
        </div>
    );
}