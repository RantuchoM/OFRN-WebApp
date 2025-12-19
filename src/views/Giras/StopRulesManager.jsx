import React, { useState, useEffect, useMemo } from 'react';
import { IconX, IconUsers, IconMapPin, IconMusic, IconPlus, IconTrash } from '../../components/ui/Icons';
import SearchableSelect from '../../components/ui/SearchableSelect';

export default function StopRulesManager({ 
    isOpen, onClose, event, type, 
    supabase, giraId, transportId, 
    regions, localities, musicians, 
    onRefresh 
}) {
    if (!isOpen || !event) return null;

    const [activeTab, setActiveTab] = useState('regions'); 
    const [existingRules, setExistingRules] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false); // <--- AGREGADO

    const instrumentFamilies = [
        { id: 'Cuerdas', label: 'Cuerdas' },
        { id: 'Vientos', label: 'Vientos' },
        { id: 'Percusión', label: 'Percusión' },
        { id: 'Bronces', label: 'Bronces' },
        { id: 'Directores', label: 'Directores' },
        { id: 'Staff', label: 'Staff' }
    ];

    useEffect(() => {
        fetchRules();
    }, [event]);

    const handleAddRule = async (selectedTarget, scope) => { // <--- CORREGIDO: Recibe argumentos
        if (!selectedTarget) return;
        setSaving(true);
        try {
            const payload = {
                id_gira_transporte: transportId,
                alcance: scope,
                solo_logistica: true, // CLAVE: Marcar como regla logística pura
            };

            if (type === 'up') payload.id_evento_subida = event.id;
            else payload.id_evento_bajada = event.id;

            // Asignación de campos según el alcance
            if (scope === 'Persona') payload.id_integrante = selectedTarget;
            else if (scope === 'Region') payload.id_region = selectedTarget;
            else if (scope === 'Localidad') payload.id_localidad = selectedTarget;
            else if (scope === 'Instrumento') payload.instrumento_familia = selectedTarget; // <--- AGREGADO

            // Insert
            const { error } = await supabase.from('giras_logistica_reglas_transportes').insert([payload]);
            if (error) throw error;
            
            await fetchRules(); // Recargar reglas locales
            if(onRefresh) await onRefresh(); // Recargar datos globales si es necesario
            
            // No cerramos el modal automáticamente para permitir cargar varias reglas rápido, 
            // pero si prefieres cerrar, descomenta la siguiente línea:
            // onClose(); 
        } catch (e) {
            console.error(e);
            alert("Error al guardar la regla");
        } finally {
            setSaving(false);
        }
    };

    const fetchRules = async () => {
        setLoading(true);
        const field = type === 'up' ? 'id_evento_subida' : 'id_evento_bajada';
        
        const { data, error } = await supabase
            .from('giras_logistica_reglas_transportes')
            .select(`
                id, alcance, id_region, id_localidad, id_integrante, instrumento_familia,
                regiones ( region ), 
                localidades ( localidad ), 
                integrantes ( nombre, apellido )
            `)
            .eq('id_gira_transporte', transportId)
            .eq(field, event.id);
        
        if (error) console.error("Error fetching rules:", error);

        setExistingRules(data || []);
        setLoading(false);
    };

    const groupedRules = useMemo(() => {
        const groups = { Region: [], Localidad: [], Instrumento: [], Persona: [] };
        
        existingRules.forEach(d => {
            const item = { linkId: d.id, ruleId: d.id, label: '?' };
            
            if (d.alcance === 'Region') item.label = d.regiones?.region || `ID ${d.id_region}`;
            if (d.alcance === 'Localidad') item.label = d.localidades?.localidad || `ID ${d.id_localidad}`;
            if (d.alcance === 'Instrumento') item.label = d.instrumento_familia;
            if (d.alcance === 'Persona') item.label = d.integrantes ? `${d.integrantes.apellido}, ${d.integrantes.nombre}` : `ID ${d.id_integrante}`;

            if (groups[d.alcance]) groups[d.alcance].push(item);
        });
        return groups;
    }, [existingRules]);

    const handleRemoveRule = async (linkId) => {
        if(!confirm("¿Quitar esta regla?")) return;
        const { error } = await supabase.from('giras_logistica_reglas_transportes').delete().eq('id', linkId);
        if(!error) {
            fetchRules();
            if(onRefresh) onRefresh();
        }
    };

    // --- RENDER ---
    const renderSelector = () => {
        let options = [];
        let onSelect = (id) => {}; 

        if (activeTab === 'regions') {
            options = regions.map(r => ({ id: r.id, label: r.region }));
            onSelect = (id) => handleAddRule(id, 'Region');
        } else if (activeTab === 'localities') {
            options = localities.map(l => ({ id: l.id, label: l.localidad }));
            onSelect = (id) => handleAddRule(id, 'Localidad');
        } else if (activeTab === 'instruments') {
            options = instrumentFamilies; 
            onSelect = (id) => handleAddRule(id, 'Instrumento');
        } else if (activeTab === 'people') {
            options = musicians.map(m => ({ id: m.id, label: `${m.apellido}, ${m.nombre}` }));
            onSelect = (id) => handleAddRule(id, 'Persona');
        }

        return (
            <div className="mt-2 animate-in fade-in slide-in-from-top-2 duration-200">
                <SearchableSelect 
                    options={options} 
                    onChange={onSelect} 
                    placeholder={`Buscar ${activeTab === 'instruments' ? 'categoría' : activeTab}...`}
                    className="w-full"
                    disabled={saving}
                />
            </div>
        );
    };

    const RenderGroup = ({ title, items, icon: Icon, colorClass }) => {
        if (!items || items.length === 0) return null;
        return (
            <div className="mb-3">
                <div className="text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1">
                    <Icon size={10}/> {title}
                </div>
                <div className="flex flex-wrap gap-2">
                    {items.map(item => (
                        <div key={item.linkId} className={`flex items-center gap-1 px-2 py-1 rounded text-xs border ${colorClass}`}>
                            <span className="font-medium">{item.label}</span>
                            <button onClick={() => handleRemoveRule(item.linkId)} className="hover:bg-black/10 rounded-full p-0.5 transition-colors">
                                <IconX size={10}/>
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 bg-black/30 z-[99999] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200">
                <div className={`p-4 border-b flex justify-between items-center ${type === 'up' ? 'bg-emerald-50' : 'bg-rose-50'}`}>
                    <div>
                        <h3 className={`font-bold text-sm ${type === 'up' ? 'text-emerald-900' : 'text-rose-900'}`}>
                            {type === 'up' ? 'Gestión de Subida' : 'Gestión de Bajada'}
                        </h3>
                        <p className={`text-xs ${type === 'up' ? 'text-emerald-700' : 'text-rose-700'}`}>
                            En: <span className="font-semibold">{event.descripcion}</span>
                        </p>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-black/5 rounded-full text-slate-500"><IconX size={18}/></button>
                </div>
                
                <div className="p-5 overflow-y-auto max-h-[60vh]">
                    <div className="mb-6">
                        {existingRules.length === 0 ? (
                            <div className="text-center p-6 border-2 border-dashed border-slate-100 rounded-lg">
                                <p className="text-slate-400 text-sm">No hay reglas definidas para esta parada.</p>
                            </div>
                        ) : (
                            <div className="space-y-1">
                                <RenderGroup title="Regiones" items={groupedRules.Region} icon={IconMapPin} colorClass="bg-indigo-50 border-indigo-100 text-indigo-700" />
                                <RenderGroup title="Localidades" items={groupedRules.Localidad} icon={IconMapPin} colorClass="bg-blue-50 border-blue-100 text-blue-700" />
                                <RenderGroup title="Categorías" items={groupedRules.Instrumento} icon={IconMusic} colorClass="bg-amber-50 border-amber-100 text-amber-700" />
                                <RenderGroup title="Personas" items={groupedRules.Persona} icon={IconUsers} colorClass="bg-emerald-50 border-emerald-100 text-emerald-700" />
                            </div>
                        )}
                    </div>

                    <div className="pt-4 border-t border-slate-100">
                        <div className="flex gap-1 bg-slate-100 p-1 rounded-lg mb-3">
                            {[{ id: 'regions', label: 'Región' }, { id: 'localities', label: 'Localidad' }, { id: 'instruments', label: 'Categoría' }, { id: 'people', label: 'Persona' }].map(tab => (
                                <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex-1 py-1.5 text-[10px] font-bold rounded-md transition-all ${activeTab === tab.id ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>{tab.label}</button>
                            ))}
                        </div>
                        {renderSelector()}
                        {saving && <p className="text-[10px] text-center text-slate-400 mt-2">Guardando...</p>}
                    </div>
                </div>
            </div>
        </div>
    );
}