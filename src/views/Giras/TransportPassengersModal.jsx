import React, { useState, useMemo } from 'react';
import { 
    IconX, IconPlus, IconUserCheck, IconUserX, IconTrash, 
    IconMapPin, IconChevronDown, IconChevronUp 
} from '../../components/ui/Icons';

export default function TransportPassengersModal({ 
    isOpen, 
    onClose, 
    transport, 
    transportRules, 
    roster, 
    regions, 
    localities,
    supabase, 
    onRefresh 
}) {
    if (!isOpen || !transport) return null;

    const [activeTab, setActiveTab] = useState('list'); // 'list' | 'add'
    const [addType, setAddType] = useState('Persona'); // 'Persona', 'Region', 'Localidad'
    const [selectedId, setSelectedId] = useState(null);
    const [loading, setLoading] = useState(false);
    
    // NUEVO: Estado para mostrar/ocultar reglas de logística
    const [showLogistics, setShowLogistics] = useState(false);

    // 1. Filtrar reglas de ESTE transporte
    const myRules = useMemo(() => {
        return (transportRules || []).filter(r => r.id_gira_transporte === transport.id);
    }, [transportRules, transport.id]);

    // 2. Separar reglas Principales (Acceso/Veto) de Logística (Paradas)
    const { mainRules, logisticsRules } = useMemo(() => {
        const main = [];
        const logistics = [];
        
        myRules.forEach(r => {
            if (r.solo_logistica) {
                logistics.push(r);
            } else {
                main.push(r);
            }
        });

        // Ordenar principales: Exclusiones primero
        main.sort((a, b) => (a.es_exclusion === b.es_exclusion) ? 0 : a.es_exclusion ? -1 : 1);
        
        return { mainRules: main, logisticsRules: logistics };
    }, [myRules]);

    // 3. Calcular pasajeros actuales
    const currentPassengers = useMemo(() => {
        return roster.filter(p => 
            p.logistics?.transports?.some(t => t.id === transport.id)
        );
    }, [roster, transport.id]);

    // --- ACCIONES ---

    const handleAddRule = async (isExclusion = false) => {
        if (!selectedId) return;
        setLoading(true);
        try {
            const payload = {
                id_gira_transporte: transport.id,
                alcance: addType,
                es_exclusion: isExclusion,
                solo_logistica: false // Desde este modal siempre agregamos reglas de acceso por defecto
            };

            if (addType === 'Persona') payload.id_integrante = selectedId;
            else if (addType === 'Region') payload.id_region = selectedId;
            else if (addType === 'Localidad') payload.id_localidad = selectedId;

            await supabase.from('giras_logistica_reglas_transportes').insert([payload]);
            onRefresh();
            setActiveTab('list');
            setSelectedId(null);
        } catch (e) {
            console.error(e);
            alert("Error al guardar regla");
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteRule = async (ruleId) => {
        if(!confirm("¿Eliminar esta regla?")) return;
        setLoading(true);
        try {
            await supabase.from('giras_logistica_reglas_transportes').delete().eq('id', ruleId);
            onRefresh();
        } catch(e) { console.error(e); } 
        finally { setLoading(false); }
    };

    // --- UI HELPERS ---

    const getRuleLabel = (r) => {
        let label = r.alcance;
        if (r.alcance === 'General') label = "Todos los integrantes";
        else if (r.alcance === 'Region') label = `Región: ${regions.find(x=>String(x.id)===String(r.id_region))?.region || '?'}`;
        else if (r.alcance === 'Localidad') label = `Loc.: ${localities.find(x=>String(x.id)===String(r.id_localidad))?.localidad || '?'}`;
        else if (r.alcance === 'Persona') {
            const p = roster.find(x=>String(x.id)===String(r.id_integrante));
            label = p ? `${p.apellido}, ${p.nombre}` : `ID #${r.id_integrante}`;
        }
        if (r.instrumento_familia) label += ` (${r.instrumento_familia})`;
        return label;
    };

    const getRuleStyles = (r) => {
        if (r.es_exclusion) {
            return {
                bg: 'bg-red-50', border: 'border-red-100', text: 'text-red-700',
                icon: <IconUserX size={16} className="text-red-500"/>,
                typeLabel: 'EXCLUIR (VETO)'
            };
        }
        if (r.solo_logistica) {
            return {
                bg: 'bg-blue-50', border: 'border-blue-100', text: 'text-blue-700',
                icon: <IconMapPin size={16} className="text-blue-500"/>,
                typeLabel: 'AJUSTE LOGÍSTICA'
            };
        }
        return {
            bg: 'bg-emerald-50', border: 'border-emerald-100', text: 'text-emerald-800',
            icon: <IconPlus size={16} className="text-emerald-600"/>,
            typeLabel: 'INCLUIR (ACCESO)'
        };
    };

    const selectOptions = useMemo(() => {
        if (addType === 'Region') return regions.map(r => ({ value: r.id, label: r.region }));
        if (addType === 'Localidad') return localities.map(l => ({ value: l.id, label: l.localidad }));
        if (addType === 'Persona') return roster.map(p => ({ value: p.id, label: `${p.apellido}, ${p.nombre}` }));
        return [];
    }, [addType, regions, localities, roster]);


    const RuleCard = ({ r }) => {
        const styles = getRuleStyles(r);
        return (
            <div className={`flex justify-between items-center p-2 rounded border ${styles.bg} ${styles.border}`}>
                <div className="flex items-center gap-3">
                    {styles.icon}
                    <div>
                        <div className={`text-[10px] font-bold uppercase ${styles.text} opacity-70`}>
                            {styles.typeLabel}
                        </div>
                        <div className={`text-sm font-medium ${styles.text}`}>
                            {getRuleLabel(r)}
                        </div>
                        {r.solo_logistica && (
                            <div className="text-[10px] text-slate-500 flex gap-2 mt-0.5">
                                {r.id_evento_subida && <span>Subida Personalizada</span>}
                                {r.id_evento_subida && r.id_evento_bajada && <span>•</span>}
                                {r.id_evento_bajada && <span>Bajada Personalizada</span>}
                            </div>
                        )}
                    </div>
                </div>
                <button onClick={() => handleDeleteRule(r.id)} className="text-slate-400 hover:text-red-500 p-1 rounded hover:bg-white/50 transition-colors">
                    <IconTrash size={14} />
                </button>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                
                {/* HEADER */}
                <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
                    <div>
                        <h3 className="font-bold text-slate-800 flex items-center gap-2">
                            <IconUserCheck className="text-indigo-600" /> 
                            Pasajeros: {transport.detalle}
                        </h3>
                        <p className="text-xs text-slate-500">
                            {currentPassengers.length} personas asignadas actualmente
                        </p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <IconX size={20} />
                    </button>
                </div>

                {/* TABS */}
                <div className="flex border-b text-sm font-medium">
                    <button 
                        onClick={() => setActiveTab('list')}
                        className={`flex-1 py-3 text-center border-b-2 transition-colors ${activeTab === 'list' ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        Reglas Activas
                    </button>
                    <button 
                        onClick={() => setActiveTab('add')}
                        className={`flex-1 py-3 text-center border-b-2 transition-colors ${activeTab === 'add' ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        Agregar / Excluir
                    </button>
                </div>

                {/* CONTENT */}
                <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50">
                    
                    {activeTab === 'list' && (
                        <div className="space-y-6">
                            
                            {/* SECCIÓN 1: REGLAS PRINCIPALES (ACCESO) */}
                            <div>
                                <h4 className="text-xs font-bold text-slate-400 uppercase mb-2 tracking-wider flex justify-between items-center">
                                    <span>Reglas de Acceso</span>
                                    <span className="text-[10px] font-normal bg-white px-2 rounded border">Orden: Veto {'>'} Acceso</span>
                                </h4>
                                <div className="space-y-2">
                                    {mainRules.length === 0 && logisticsRules.length === 0 && <p className="text-sm text-slate-400 italic text-center py-4">No hay reglas definidas.</p>}
                                    {mainRules.map(r => <RuleCard key={r.id} r={r} />)}
                                </div>
                            </div>

                            {/* SECCIÓN 2: REGLAS LOGÍSTICA (COLAPSIBLE) */}
                            {logisticsRules.length > 0 && (
                                <div className="border-t border-slate-200 pt-4">
                                    <button 
                                        onClick={() => setShowLogistics(!showLogistics)}
                                        className="w-full flex items-center justify-between text-xs font-bold text-blue-600 bg-blue-50 px-3 py-2 rounded hover:bg-blue-100 transition-colors"
                                    >
                                        <span className="flex items-center gap-2">
                                            <IconMapPin size={14}/> 
                                            Ajustes de Paradas ({logisticsRules.length})
                                        </span>
                                        {showLogistics ? <IconChevronUp size={14}/> : <IconChevronDown size={14}/>}
                                    </button>
                                    
                                    {showLogistics && (
                                        <div className="mt-2 space-y-2 animate-in slide-in-from-top-2">
                                            {logisticsRules.map(r => <RuleCard key={r.id} r={r} />)}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* SECCIÓN 3: PERSONAS */}
                            <div>
                                <h4 className="text-xs font-bold text-slate-400 uppercase mb-2 tracking-wider mt-6 border-t pt-4">
                                    Pasajeros Resultantes ({currentPassengers.length})
                                </h4>
                                <div className="bg-white rounded border border-slate-200 divide-y divide-slate-100 max-h-60 overflow-y-auto">
                                    {currentPassengers.map(p => (
                                        <div key={p.id} className="p-2 text-sm flex justify-between items-center hover:bg-slate-50 group">
                                            <span className="text-slate-700">{p.apellido}, {p.nombre}</span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 rounded">
                                                    {p.logistics?.transports?.find(t => t.id === transport.id)?.priority >= 4 ? 'Individual' : 'Grupo'}
                                                </span>
                                                <button 
                                                    onClick={() => {
                                                        if(confirm(`¿Excluir a ${p.apellido} de este transporte?`)) {
                                                            const payload = { id_gira_transporte: transport.id, alcance: 'Persona', id_integrante: p.id, es_exclusion: true, solo_logistica: false };
                                                            supabase.from('giras_logistica_reglas_transportes').insert([payload]).then(onRefresh);
                                                        }
                                                    }}
                                                    className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-opacity"
                                                    title="Vetar de este transporte"
                                                >
                                                    <IconUserX size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'add' && (
                        <div className="space-y-4">
                            <div className="bg-white p-4 rounded border border-slate-200 shadow-sm">
                                <label className="block text-xs font-bold text-slate-500 mb-1">Tipo de Regla de Acceso</label>
                                <div className="flex gap-2 mb-4">
                                    {['Persona', 'Region', 'Localidad'].map(type => (
                                        <button
                                            key={type}
                                            onClick={() => { setAddType(type); setSelectedId(null); }}
                                            className={`px-3 py-1.5 text-xs rounded font-bold border transition-colors ${addType === type ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                                        >
                                            {type}
                                        </button>
                                    ))}
                                </div>

                                <label className="block text-xs font-bold text-slate-500 mb-1">Seleccionar {addType}</label>
                                <select 
                                    className="w-full border p-2 rounded text-sm mb-6 bg-slate-50 focus:bg-white transition-colors outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                    value={selectedId || ''}
                                    onChange={(e) => setSelectedId(e.target.value)}
                                >
                                    <option value="">-- Seleccionar --</option>
                                    {selectOptions.map(o => (
                                        <option key={o.value} value={o.value}>{o.label}</option>
                                    ))}
                                </select>

                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => handleAddRule(false)}
                                        disabled={!selectedId || loading}
                                        className="py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-sm flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 transition-all active:scale-95"
                                    >
                                        <IconPlus size={16} /> Incluir (Acceso)
                                    </button>
                                    <button
                                        onClick={() => handleAddRule(true)}
                                        disabled={!selectedId || loading}
                                        className="py-2 bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 rounded font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-all active:scale-95"
                                    >
                                        <IconUserX size={16} /> Excluir (Veto)
                                    </button>
                                </div>
                                <p className="text-[10px] text-slate-400 mt-3 text-center border-t pt-2">
                                    Nota: Las reglas de "Logística" (paradas específicas) se gestionan desde el botón de cada parada en el listado principal.
                                </p>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}