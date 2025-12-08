import React, { useState, useEffect } from 'react';
import { IconTruck, IconPlus, IconTrash, IconCheck, IconArrowRight, IconLoader, IconMapPin, IconUsers } from '../../components/ui/Icons';
import DateInput from '../../components/ui/DateInput';
import TimeInput from '../../components/ui/TimeInput';

export default function LogisticsManager({ supabase, gira, onBack }) {
    const [rules, setRules] = useState([]);
    const [loading, setLoading] = useState(false);
    
    // Catálogos
    const [musicians, setMusicians] = useState([]);
    const [locations, setLocations] = useState([]);
    const [regions, setRegions] = useState([]);
    const [families, setFamilies] = useState([]);

    // Formulario
    const [isAdding, setIsAdding] = useState(false);
    const [formData, setFormData] = useState({
        alcance: 'General', // General, Region, Localidad, Instrumento, Persona
        ref_id: '',
        transporte_ida_tipo: 'Bus', transporte_ida_fecha: '', transporte_ida_hora: '',
        transporte_vuelta_tipo: 'Bus', transporte_vuelta_fecha: '', transporte_vuelta_hora: '',
        comidas_desde_fecha: '', comidas_desde_turno: 'Cena',
        comidas_hasta_fecha: '', comidas_hasta_turno: 'Almuerzo',
        cubre_desayuno: true, cubre_almuerzo: true, cubre_merienda: true, cubre_cena: true
    });

    useEffect(() => {
        fetchRules();
        fetchCatalogs();
    }, [gira.id]);

    const fetchCatalogs = async () => {
        const { data: mus } = await supabase.from('integrantes').select('id, nombre, apellido').order('apellido');
        if(mus) setMusicians(mus);
        const { data: loc } = await supabase.from('localidades').select('id, localidad').order('localidad');
        if(loc) setLocations(loc);
        const { data: reg } = await supabase.from('regiones').select('id, region').order('region');
        if(reg) setRegions(reg);
        const { data: inst } = await supabase.from('instrumentos').select('familia');
        if(inst) setFamilies([...new Set(inst.map(i => i.familia).filter(Boolean))]);
    };

    const fetchRules = async () => {
        setLoading(true);
        // Traemos las relaciones para mostrar nombres bonitos en la tabla
        const { data, error } = await supabase
            .from('giras_logistica_reglas')
            .select(`*, integrantes(nombre, apellido), localidades(localidad), regiones(region)`)
            .eq('id_gira', gira.id)
            .order('prioridad', { ascending: false }); // Prioridad alta primero (Persona > General)
        
        if (!error) setRules(data);
        setLoading(false);
    };

    const handleSave = async () => {
        setLoading(true);
        
        let payload = {
            id_gira: gira.id,
            alcance: formData.alcance,
            transporte_ida_tipo: formData.transporte_ida_tipo,
            transporte_ida_fecha: formData.transporte_ida_fecha || null,
            transporte_ida_hora: formData.transporte_ida_hora || null,
            transporte_vuelta_tipo: formData.transporte_vuelta_tipo,
            transporte_vuelta_fecha: formData.transporte_vuelta_fecha || null,
            transporte_vuelta_hora: formData.transporte_vuelta_hora || null,
            comidas_desde_fecha: formData.comidas_desde_fecha || null,
            comidas_desde_turno: formData.comidas_desde_turno,
            comidas_hasta_fecha: formData.comidas_hasta_fecha || null,
            comidas_hasta_turno: formData.comidas_hasta_turno,
            cubre_desayuno: formData.cubre_desayuno,
            cubre_almuerzo: formData.cubre_almuerzo,
            cubre_merienda: formData.cubre_merienda,
            cubre_cena: formData.cubre_cena,
            
            id_integrante: null, id_localidad: null, id_region: null, instrumento_familia: null
        };

        // Asignar Prioridad Automáticamente
        switch (formData.alcance) {
            case 'Persona': 
                payload.prioridad = 4; payload.id_integrante = formData.ref_id; break;
            case 'Instrumento': 
                payload.prioridad = 3; payload.instrumento_familia = formData.ref_id; break;
            case 'Localidad': 
                payload.prioridad = 2; payload.id_localidad = formData.ref_id; break;
            case 'Region': 
                payload.prioridad = 1; payload.id_region = formData.ref_id; break;
            default: 
                payload.prioridad = 0; break;
        }

        const { error } = await supabase.from('giras_logistica_reglas').insert([payload]);
        if (error) alert("Error: " + error.message);
        else {
            setIsAdding(false);
            fetchRules();
        }
        setLoading(false);
    };

    const handleDelete = async (id) => {
        if(!confirm("¿Borrar regla?")) return;
        await supabase.from('giras_logistica_reglas').delete().eq('id', id);
        fetchRules();
    };

    const fmtDate = (d) => d ? d.split('-').reverse().slice(0,2).join('/') : '-';

    return (
        <div className="flex flex-col h-full bg-slate-50 animate-in fade-in">
            {/* Header */}
            <div className="bg-white p-4 border-b border-slate-200 shadow-sm flex justify-between items-center shrink-0">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="text-slate-400 hover:text-indigo-600 font-medium text-sm">← Volver</button>
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2"><IconTruck className="text-indigo-600"/> Logística y Reglas</h2>
                        <p className="text-xs text-slate-500">Define excepciones para transporte y comidas.</p>
                    </div>
                </div>
                <button onClick={() => setIsAdding(!isAdding)} className="bg-indigo-600 text-white px-3 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-indigo-700 flex items-center gap-2">
                    <IconPlus size={16}/> {isAdding ? 'Cerrar' : 'Nueva Regla'}
                </button>
            </div>

            {/* FORMULARIO */}
            {isAdding && (
                <div className="p-4 bg-indigo-50 border-b border-indigo-100 animate-in slide-in-from-top-2 overflow-y-auto max-h-[60vh]">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-4">
                        
                        {/* 1. ALCANCE */}
                        <div className="md:col-span-3">
                            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Aplica a:</label>
                            <select className="w-full border p-2 rounded text-sm bg-white outline-none" value={formData.alcance} onChange={e => setFormData({...formData, alcance: e.target.value, ref_id: ''})}>
                                <option value="General">General (Todos)</option>
                                <option value="Region">Región</option>
                                <option value="Localidad">Localidad</option>
                                <option value="Instrumento">Familia Inst.</option>
                                <option value="Persona">Persona</option>
                            </select>
                        </div>
                        
                        {/* 2. REFERENCIA */}
                        <div className="md:col-span-3">
                            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Selección</label>
                            {formData.alcance === 'General' ? <input disabled value="-- Aplica a Todos --" className="w-full border p-2 rounded text-sm bg-slate-100 text-slate-400"/> : (
                                <select className="w-full border p-2 rounded text-sm bg-white outline-none" value={formData.ref_id} onChange={e => setFormData({...formData, ref_id: e.target.value})}>
                                    <option value="">Seleccionar...</option>
                                    {formData.alcance === 'Persona' && musicians.map(m => <option key={m.id} value={m.id}>{m.apellido}, {m.nombre}</option>)}
                                    {formData.alcance === 'Localidad' && locations.map(l => <option key={l.id} value={l.id}>{l.localidad}</option>)}
                                    {formData.alcance === 'Region' && regions.map(r => <option key={r.id} value={r.id}>{r.region}</option>)}
                                    {formData.alcance === 'Instrumento' && families.map(f => <option key={f} value={f}>{f}</option>)}
                                </select>
                            )}
                        </div>

                        <div className="md:col-span-6"></div> 

                        {/* 3. TRANSPORTE IDA */}
                        <div className="md:col-span-12 border-t border-indigo-200/50 pt-2 mt-2"><h4 className="text-xs font-bold text-indigo-800 uppercase">Transporte Ida</h4></div>
                        <div className="md:col-span-2"><label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Tipo</label><select className="w-full border p-2 rounded text-sm bg-white outline-none" value={formData.transporte_ida_tipo} onChange={e => setFormData({...formData, transporte_ida_tipo: e.target.value})}><option>Bus</option><option>Aéreo</option><option>Propio</option><option>Combi</option></select></div>
                        <div className="md:col-span-3"><DateInput label="Fecha Salida" value={formData.transporte_ida_fecha} onChange={v => setFormData({...formData, transporte_ida_fecha: v})}/></div>
                        <div className="md:col-span-2"><TimeInput label="Hora" value={formData.transporte_ida_hora} onChange={v => setFormData({...formData, transporte_ida_hora: v})}/></div>

                        {/* 4. TRANSPORTE VUELTA */}
                        <div className="md:col-span-12 border-t border-indigo-200/50 pt-2 mt-2"><h4 className="text-xs font-bold text-indigo-800 uppercase">Transporte Regreso</h4></div>
                        <div className="md:col-span-2"><label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Tipo</label><select className="w-full border p-2 rounded text-sm bg-white outline-none" value={formData.transporte_vuelta_tipo} onChange={e => setFormData({...formData, transporte_vuelta_tipo: e.target.value})}><option>Bus</option><option>Aéreo</option><option>Propio</option><option>Combi</option></select></div>
                        <div className="md:col-span-3"><DateInput label="Fecha Regreso" value={formData.transporte_vuelta_fecha} onChange={v => setFormData({...formData, transporte_vuelta_fecha: v})}/></div>
                        <div className="md:col-span-2"><TimeInput label="Hora" value={formData.transporte_vuelta_hora} onChange={v => setFormData({...formData, transporte_vuelta_hora: v})}/></div>

                        {/* 5. COMIDAS */}
                        <div className="md:col-span-12 border-t border-indigo-200/50 pt-2 mt-2"><h4 className="text-xs font-bold text-indigo-800 uppercase">Régimen de Comidas</h4></div>
                        <div className="md:col-span-2"><DateInput label="Desde" value={formData.comidas_desde_fecha} onChange={v => setFormData({...formData, comidas_desde_fecha: v})}/></div>
                        <div className="md:col-span-2"><label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Turno Inicio</label><select className="w-full border p-2 rounded text-sm bg-white outline-none" value={formData.comidas_desde_turno} onChange={e => setFormData({...formData, comidas_desde_turno: e.target.value})}><option>Desayuno</option><option>Almuerzo</option><option>Merienda</option><option>Cena</option></select></div>
                        <div className="md:col-span-1 flex justify-center items-center pt-4 text-slate-300"><IconArrowRight/></div>
                        <div className="md:col-span-2"><DateInput label="Hasta" value={formData.comidas_hasta_fecha} onChange={v => setFormData({...formData, comidas_hasta_fecha: v})}/></div>
                        <div className="md:col-span-2"><label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Turno Fin</label><select className="w-full border p-2 rounded text-sm bg-white outline-none" value={formData.comidas_hasta_turno} onChange={e => setFormData({...formData, comidas_hasta_turno: e.target.value})}><option>Desayuno</option><option>Almuerzo</option><option>Merienda</option><option>Cena</option></select></div>
                        
                        <div className="md:col-span-12 flex gap-6 mt-2 bg-white p-3 rounded border border-indigo-100">
                            {['desayuno', 'almuerzo', 'merienda', 'cena'].map(c => (
                                <label key={c} className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase cursor-pointer">
                                    <input type="checkbox" checked={formData[`cubre_${c}`]} onChange={e => setFormData({...formData, [`cubre_${c}`]: e.target.checked})} className="rounded text-indigo-600 focus:ring-indigo-500"/>
                                    {c}
                                </label>
                            ))}
                        </div>
                    </div>
                    
                    <div className="flex justify-end pt-4">
                        <button onClick={handleSave} disabled={loading} className="bg-indigo-600 text-white px-6 py-2 rounded text-sm font-bold hover:bg-indigo-700 shadow-sm flex items-center gap-2">
                            {loading ? <IconLoader size={16} className="animate-spin"/> : <IconCheck size={18}/>} Guardar Regla
                        </button>
                    </div>
                </div>
            )}

            {/* TABLA DE REGLAS */}
            <div className="flex-1 overflow-auto p-4 bg-slate-50">
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden min-w-[1000px]">
                    <table className="w-full text-left text-sm border-collapse">
                        <thead className="bg-slate-50 text-slate-500 uppercase font-bold border-b border-slate-200 text-xs">
                            <tr>
                                <th className="p-3 w-16 text-center">Prio</th>
                                <th className="p-3 w-32">Alcance</th>
                                <th className="p-3 w-48">Referencia</th>
                                <th className="p-3 bg-blue-50/30 border-l border-white">Ida</th>
                                <th className="p-3 bg-blue-50/30">Vuelta</th>
                                <th className="p-3 bg-emerald-50/30 border-l border-white">Comidas</th>
                                <th className="p-3 bg-emerald-50/30 text-center">Cobertura</th>
                                <th className="p-3 w-10"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                            {rules.map(rule => (
                                <tr key={rule.id} className="hover:bg-yellow-50 transition-colors">
                                    <td className="p-3 text-center">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${rule.prioridad === 0 ? 'bg-slate-100 text-slate-500' : (rule.prioridad === 4 ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700')}`}>
                                            N{rule.prioridad}
                                        </span>
                                    </td>
                                    <td className="p-3 uppercase font-bold text-[10px] text-slate-500">{rule.alcance}</td>
                                    <td className="p-3 font-bold truncate max-w-[200px]" title={rule.alcance}>
                                        {rule.alcance === 'General' && 'GENERAL'}
                                        {rule.alcance === 'Persona' && (rule.integrantes ? `${rule.integrantes.apellido}, ${rule.integrantes.nombre}` : 'Eliminado')}
                                        {rule.alcance === 'Instrumento' && rule.instrumento_familia}
                                        {rule.alcance === 'Localidad' && rule.localidades?.localidad}
                                        {rule.alcance === 'Region' && rule.regiones?.region}
                                    </td>
                                    
                                    <td className="p-3 bg-blue-50/10 border-l border-slate-100">
                                        <div className="font-bold text-xs">{rule.transporte_ida_tipo}</div>
                                        <div className="text-[10px] text-slate-500">{fmtDate(rule.transporte_ida_fecha)} {rule.transporte_ida_hora?.slice(0,5)}</div>
                                    </td>
                                    <td className="p-3 bg-blue-50/10">
                                        <div className="font-bold text-xs">{rule.transporte_vuelta_tipo}</div>
                                        <div className="text-[10px] text-slate-500">{fmtDate(rule.transporte_vuelta_fecha)} {rule.transporte_vuelta_hora?.slice(0,5)}</div>
                                    </td>

                                    <td className="p-3 bg-emerald-50/10 border-l border-slate-100 text-xs">
                                        <div>{fmtDate(rule.comidas_desde_fecha)} ({rule.comidas_desde_turno?.slice(0,3)})</div>
                                        <div className="text-slate-400">a</div>
                                        <div>{fmtDate(rule.comidas_hasta_fecha)} ({rule.comidas_hasta_turno?.slice(0,3)})</div>
                                    </td>
                                    
                                    <td className="p-3 bg-emerald-50/10 text-center">
                                        <div className="flex gap-1 justify-center">
                                            {rule.cubre_desayuno && <span title="Desayuno" className="w-2 h-2 rounded-full bg-emerald-400"></span>}
                                            {rule.cubre_almuerzo && <span title="Almuerzo" className="w-2 h-2 rounded-full bg-emerald-400"></span>}
                                            {rule.cubre_merienda && <span title="Merienda" className="w-2 h-2 rounded-full bg-emerald-400"></span>}
                                            {rule.cubre_cena && <span title="Cena" className="w-2 h-2 rounded-full bg-emerald-400"></span>}
                                        </div>
                                    </td>

                                    <td className="p-3 text-center">
                                        <button onClick={() => handleDelete(rule.id)} className="text-slate-300 hover:text-red-500"><IconTrash size={16}/></button>
                                    </td>
                                </tr>
                            ))}
                            {rules.length === 0 && !loading && (
                                <tr><td colSpan="8" className="p-12 text-center text-slate-400 italic">No hay reglas definidas.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}