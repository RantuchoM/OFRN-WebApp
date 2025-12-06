import React, { useState, useEffect } from 'react';
import { IconLayers, IconPlus, IconTrash, IconEdit, IconSearch, IconLoader, IconCheck, IconMusic, IconUsers } from '../../components/ui/Icons';

export default function EnsemblesView({ supabase }) {
    const [ensembles, setEnsembles] = useState([]);
    const [selectedEnsemble, setSelectedEnsemble] = useState(null);
    const [allMusicians, setAllMusicians] = useState([]);
    const [memberIds, setMemberIds] = useState(new Set()); 
    const [searchText, setSearchText] = useState("");
    const [loadingMembers, setLoadingMembers] = useState(false);
    const [togglingId, setTogglingId] = useState(null); 
    const [isEditingHeader, setIsEditingHeader] = useState(false);
    const [headerForm, setHeaderForm] = useState({ ensamble: '', descripcion: '' });

    useEffect(() => { fetchEnsembles(); fetchAllMusicians(); }, []);
    
    useEffect(() => {
        if (selectedEnsemble) {
            // Al seleccionar, actualizamos la referencia local con la data fresca del array
            // Esto sirve para que si cambió el contador, se refleje si volvemos a seleccionar
            const updatedEnsemble = ensembles.find(e => e.id === selectedEnsemble.id) || selectedEnsemble;
            if (updatedEnsemble !== selectedEnsemble) setSelectedEnsemble(updatedEnsemble);

            fetchEnsembleMembers(selectedEnsemble.id);
            setIsEditingHeader(false);
            setHeaderForm({ ensamble: selectedEnsemble.ensamble, descripcion: selectedEnsemble.descripcion || '' });
        } else { setMemberIds(new Set()); }
    }, [selectedEnsemble]); // Dependencia simplificada para evitar bucles, controlamos manual

    // --- CAMBIO 1: PEDIR EL COUNT A SUPABASE ---
    const fetchEnsembles = async () => {
        // 'integrantes_ensambles(count)' nos devuelve el número de relaciones
        const { data, error } = await supabase
            .from('ensambles')
            .select('*, integrantes_ensambles(count)') 
            .order('ensamble');
        if (!error) setEnsembles(data || []);
    };

    const fetchAllMusicians = async () => {
        const { data, error } = await supabase.from('integrantes').select('id, nombre, apellido, instrumentos(instrumento)').order('apellido');
        if (!error) setAllMusicians(data || []);
    };

    const fetchEnsembleMembers = async (ensambleId) => {
        setLoadingMembers(true);
        const { data, error } = await supabase.from('integrantes_ensambles').select('id_integrante').eq('id_ensamble', ensambleId);
        if (!error && data) setMemberIds(new Set(data.map(row => row.id_integrante)));
        setLoadingMembers(false);
    };

    const generateEnsembleId = () => Math.floor(100 + Math.random() * 900000); 
    
    const createEnsemble = async () => {
        const nombreDefault = "Nuevo Ensamble " + (ensembles.length + 1);
        const newId = generateEnsembleId();
        const { data, error } = await supabase.from('ensambles').insert([{ id: newId, ensamble: nombreDefault, descripcion: '' }]).select();
        if (error) alert("Error al crear: " + error.message);
        else if (data && data.length > 0) { await fetchEnsembles(); setSelectedEnsemble(data[0]); }
    };

    const deleteEnsemble = async (id, e) => {
        e.stopPropagation();
        if (!confirm("¿Eliminar ensamble?")) return;
        await supabase.from('integrantes_ensambles').delete().eq('id_ensamble', id);
        const { error } = await supabase.from('ensambles').delete().eq('id', id);
        if (error) alert("Error al eliminar: " + error.message); else { if (selectedEnsemble?.id === id) setSelectedEnsemble(null); fetchEnsembles(); }
    };

    const saveHeader = async () => {
        if (!selectedEnsemble) return;
        const { error } = await supabase.from('ensambles').update({ ensamble: headerForm.ensamble, descripcion: headerForm.descripcion }).eq('id', selectedEnsemble.id);
        if (error) alert("Error al actualizar: " + error.message); else { setIsEditingHeader(false); fetchEnsembles(); setSelectedEnsemble({ ...selectedEnsemble, ...headerForm }); }
    };

    const toggleMembership = async (musicianId) => {
        if (!selectedEnsemble) return;
        setTogglingId(musicianId); 
        const isMember = memberIds.has(musicianId);
        const ensambleIdInt = parseInt(selectedEnsemble.id, 10);
        const musicianIdInt = parseInt(musicianId, 10);
        let error = null;
        
        if (isMember) {
            const { error: err } = await supabase.from('integrantes_ensambles').delete().eq('id_ensamble', ensambleIdInt).eq('id_integrante', musicianIdInt); error = err;
        } else {
            const { error: err } = await supabase.from('integrantes_ensambles').insert([{ id_ensamble: ensambleIdInt, id_integrante: musicianIdInt }]); error = err;
        }
        
        if (error) alert(`Error: ${error.message}`); 
        else { 
            const newSet = new Set(memberIds); 
            if (isMember) newSet.delete(musicianId); else newSet.add(musicianId); 
            setMemberIds(newSet);
            
            // --- CAMBIO 3: ACTUALIZAR CONTADOR ---
            // Recargamos la lista de la izquierda para que el número cambie
            await fetchEnsembles(); 
        }
        setTogglingId(null);
    };

    const filteredMusicians = allMusicians.filter(m => {
        const term = searchText.toLowerCase();
        const fullName = `${m.nombre} ${m.apellido}`.toLowerCase();
        const instrument = m.instrumentos?.instrumento?.toLowerCase() || '';
        return fullName.includes(term) || instrument.includes(term);
    }).sort((a, b) => {
        const isMemberA = memberIds.has(a.id);
        const isMemberB = memberIds.has(b.id);
        if (isMemberA && !isMemberB) return -1;
        if (!isMemberA && isMemberB) return 1;
        return (a.apellido || '').localeCompare(b.apellido || '');
    });
    const firstNonMemberIndex = filteredMusicians.findIndex(m => !memberIds.has(m.id));

    return (
        <div className="flex h-full gap-6">
            <div className="w-1/3 min-w-[250px] flex flex-col gap-4 border-r border-slate-200 pr-6 overflow-y-auto">
                <div className="flex items-center justify-between mb-2">
                    <h2 className="text-lg font-bold text-slate-700 flex items-center gap-2"><IconLayers className="text-indigo-600"/> Ensambles</h2>
                    <button onClick={createEnsemble} className="text-xs bg-indigo-600 text-white px-2 py-1 rounded hover:bg-indigo-700 flex items-center gap-1 shadow-sm"><IconPlus size={14}/> Nuevo</button>
                </div>
                <div className="space-y-2">
                    {ensembles.map(ens => (
                        <div key={ens.id} className="group relative">
                            <button onClick={() => setSelectedEnsemble(ens)} className={`w-full text-left p-4 rounded-xl border transition-all pr-10 ${selectedEnsemble?.id === ens.id ? 'bg-indigo-600 text-white border-indigo-600 shadow-md ring-2 ring-indigo-200' : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300 hover:bg-slate-50'}`}>
                                <div className="font-bold text-lg truncate">{ens.ensamble}</div>
                                
                                {/* --- CAMBIO 2: MOSTRAR CONTADOR --- */}
                                {/* Supabase devuelve [{count: N}] en esa propiedad */}
                                <div className={`text-xs font-semibold mb-1 flex items-center gap-1 ${selectedEnsemble?.id === ens.id ? 'text-indigo-200' : 'text-indigo-600'}`}>
                                    <IconUsers size={12} />
                                    {ens.integrantes_ensambles?.[0]?.count || 0} integrantes
                                </div>

                                {ens.descripcion && <div className={`text-xs truncate ${selectedEnsemble?.id === ens.id ? 'text-indigo-200' : 'text-slate-400'}`}>{ens.descripcion}</div>}
                            </button>
                            <button onClick={(e) => deleteEnsemble(ens.id, e)} className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-all ${selectedEnsemble?.id === ens.id ? 'text-white/70 hover:text-white hover:bg-white/20' : 'text-slate-300 hover:text-red-500 hover:bg-red-50'}`}><IconTrash size={16} /></button>
                        </div>
                    ))}
                    {ensembles.length === 0 && <div className="text-center p-8 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-sm">No hay ensambles.<br/>Crea uno para empezar.</div>}
                </div>
            </div>
            
            {/* Panel Derecho (Igual que antes) */}
            <div className="flex-1 flex flex-col h-full overflow-hidden bg-white rounded-xl shadow-sm border border-slate-200">
                {selectedEnsemble ? (
                    <>
                        <div className="p-6 border-b border-slate-100 bg-slate-50">
                            {isEditingHeader ? (
                                <div className="space-y-3 animate-in fade-in duration-200">
                                    <input type="text" className="w-full text-2xl font-bold border border-indigo-300 rounded px-2 py-1 focus:ring-2 focus:ring-indigo-500 outline-none" value={headerForm.ensamble} onChange={(e) => setHeaderForm({...headerForm, ensamble: e.target.value})} placeholder="Nombre del Ensamble"/>
                                    <textarea className="w-full text-sm border border-indigo-300 rounded px-2 py-1 focus:ring-2 focus:ring-indigo-500 outline-none resize-none h-20" value={headerForm.descripcion} onChange={(e) => setHeaderForm({...headerForm, descripcion: e.target.value})} placeholder="Descripción del ensamble..."/>
                                    <div className="flex gap-2 justify-end"><button onClick={() => setIsEditingHeader(false)} className="px-3 py-1 bg-white border rounded text-sm hover:bg-slate-50">Cancelar</button><button onClick={saveHeader} className="px-3 py-1 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700">Guardar</button></div>
                                </div>
                            ) : (
                                <div className="group relative">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                                                {selectedEnsemble.ensamble}
                                                <button onClick={() => setIsEditingHeader(true)} className="text-slate-300 hover:text-indigo-500 transition-colors opacity-0 group-hover:opacity-100" title="Editar Nombre/Descripción"><IconEdit size={18} /></button>
                                            </h2>
                                            <p className="text-slate-500 text-sm mb-4 mt-1">{selectedEnsemble.descripcion || <span className="italic text-slate-400">Sin descripción</span>}</p>
                                        </div>
                                    </div>
                                    <div className="relative mt-2"><div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><IconSearch size={18} /></div><input type="text" className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all" placeholder="Buscar músico para agregar/quitar..." value={searchText} onChange={(e) => setSearchText(e.target.value)}/></div>
                                    <div className="flex justify-between items-center mt-2 text-xs text-slate-400"><span>Total músicos encontrados: {filteredMusicians.length}</span><span>Miembros actuales: {memberIds.size}</span></div>
                                </div>
                            )}
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 bg-slate-50/50">
                            {loadingMembers ? (<div className="flex items-center justify-center h-full text-indigo-600 gap-2"><IconLoader size={24}/> Cargando miembros...</div>) : (
                                <div className="space-y-2">
                                    {filteredMusicians.map((musician, index) => {
                                        const isMember = memberIds.has(musician.id);
                                        const isToggling = togglingId === musician.id;
                                        const showSeparator = index === firstNonMemberIndex && index > 0;
                                        return (
                                            <React.Fragment key={musician.id}>
                                                {showSeparator && (<div className="relative py-4 text-center"><div className="absolute inset-0 flex items-center" aria-hidden="true"><div className="w-full border-t border-slate-300"></div></div><div className="relative flex justify-center"><span className="bg-slate-50 px-2 text-xs text-slate-500 uppercase tracking-wide font-semibold">Músicos Disponibles</span></div></div>)}
                                                <div onClick={() => !isToggling && toggleMembership(musician.id)} className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all select-none ${isMember ? 'bg-indigo-50 border-indigo-200 shadow-sm z-10' : 'bg-white border-slate-200 hover:border-indigo-300'}`}>
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-6 h-6 rounded border flex items-center justify-center transition-colors ${isMember ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-300'}`}>{isToggling ? (<IconLoader size={14} className={isMember ? "text-white" : "text-indigo-600"}/>) : (isMember && <IconCheck size={14} className="text-white"/>)}</div>
                                                        <div><div className={`font-bold ${isMember ? 'text-indigo-900' : 'text-slate-700'}`}>{musician.apellido}, {musician.nombre}</div><div className="text-xs text-slate-500 flex items-center gap-1"><IconMusic size={10}/> {musician.instrumentos?.instrumento || 'Sin instrumento'}</div></div>
                                                    </div>
                                                    {isMember && (<span className="text-xs font-bold text-indigo-600 bg-white px-2 py-1 rounded border border-indigo-100">MIEMBRO</span>)}
                                                </div>
                                            </React.Fragment>
                                        );
                                    })}
                                    {filteredMusicians.length === 0 && <div className="text-center py-10 text-slate-400 italic">No se encontraron músicos con ese nombre.</div>}
                                </div>
                            )}
                        </div>
                    </>
                ) : (<div className="flex-1 flex flex-col items-center justify-center text-slate-300"><IconLayers size={64} className="mb-4 opacity-20"/><p className="text-lg font-medium">Selecciona un ensamble para gestionar</p></div>)}
            </div>
        </div>
    );
}