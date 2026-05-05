import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { IconLayers, IconPlus, IconTrash, IconEdit, IconSearch, IconLoader, IconCheck, IconMusic, IconUsers, IconMail } from '../../components/ui/Icons';
import WhatsAppLink from '../../components/ui/WhatsAppLink';

const createEmptyEnsembleInstrumentation = () => ({
    fl: 0,
    ob: 0,
    cl: 0,
    bn: 0,
    hn: 0,
    tpt: 0,
    tbn: 0,
    tba: 0,
    strings: { vln: 0, vla: 0, vlc: 0, cb: 0 },
});

const classifyInstrument = (instrumentData) => {
    const instrumentName = (instrumentData?.instrumento || '').toLowerCase();
    const familyName = (instrumentData?.familia || '').toLowerCase();

    if (instrumentName.includes('flaut') || instrumentName.includes('picc')) return { type: 'wind', key: 'fl' };
    if (instrumentName.includes('oboe') || instrumentName.includes('corno ing')) return { type: 'wind', key: 'ob' };
    if (instrumentName.includes('clarin') || instrumentName.includes('requinto') || instrumentName.includes('basset')) return { type: 'wind', key: 'cl' };
    if (instrumentName.includes('fagot') || instrumentName.includes('contraf')) return { type: 'wind', key: 'bn' };
    if (instrumentName.includes('corno') || instrumentName.includes('trompa')) return { type: 'wind', key: 'hn' };
    if (instrumentName.includes('trompet') || instrumentName.includes('fliscorno')) return { type: 'wind', key: 'tpt' };
    if (instrumentName.includes('trombon') || instrumentName.includes('trombón')) return { type: 'wind', key: 'tbn' };
    if (instrumentName.includes('tuba') || instrumentName.includes('bombard')) return { type: 'wind', key: 'tba' };

    if (instrumentName.includes('violin') || instrumentName.includes('violín') || instrumentName.includes('vln')) return { type: 'string', key: 'vln' };
    if (instrumentName.includes('viola') || instrumentName.includes('vla')) return { type: 'string', key: 'vla' };
    if (instrumentName.includes('violonc') || instrumentName.includes('cello') || instrumentName.includes('vlc')) return { type: 'string', key: 'vlc' };
    if (instrumentName.includes('contrab') || instrumentName.includes('cb')) return { type: 'string', key: 'cb' };

    if (familyName.includes('cuerd')) return { type: 'string', key: 'vln' };
    return null;
};

const formatEnsembleInstrumentation = (counter) => {
    if (!counter) return '';
    const hasWinds = [counter.fl, counter.ob, counter.cl, counter.bn, counter.hn, counter.tpt, counter.tbn, counter.tba].some((v) => v > 0);
    const windBlock = `${counter.fl}.${counter.ob}.${counter.cl}.${counter.bn} - ${counter.hn}.${counter.tpt}.${counter.tbn}.${counter.tba}`;
    const stringsTotal = counter.strings.vln + counter.strings.vla + counter.strings.vlc + counter.strings.cb;
    const stringsBlock = stringsTotal ? `Str: ${counter.strings.vln}.${counter.strings.vla}.${counter.strings.vlc}.${counter.strings.cb}` : '';
    if (hasWinds && stringsBlock) return `${windBlock}, ${stringsBlock}`;
    if (hasWinds) return windBlock;
    return stringsBlock;
};

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
    const [musicianSortMode, setMusicianSortMode] = useState('instrument');
    const [coordinatorIds, setCoordinatorIds] = useState(new Set());
    const [showMusicianPicker, setShowMusicianPicker] = useState(false);
    const [loadingAllMusicians, setLoadingAllMusicians] = useState(false);
    const [musiciansLoaded, setMusiciansLoaded] = useState(false);
    const [ensembleMembersDetailed, setEnsembleMembersDetailed] = useState([]);

    useEffect(() => { fetchEnsembles(); }, []);

    useEffect(() => {
        if (!selectedEnsemble && ensembles.length > 0) {
            setSelectedEnsemble(ensembles[0]);
        }
    }, [ensembles, selectedEnsemble]);
    
    useEffect(() => {
        if (selectedEnsemble) {
            // Al seleccionar, actualizamos la referencia local con la data fresca del array
            // Esto sirve para que si cambió el contador, se refleje si volvemos a seleccionar
            const updatedEnsemble = ensembles.find(e => e.id === selectedEnsemble.id) || selectedEnsemble;
            if (updatedEnsemble !== selectedEnsemble) setSelectedEnsemble(updatedEnsemble);

            fetchEnsembleMembers(selectedEnsemble.id);
            setIsEditingHeader(false);
            setHeaderForm({ ensamble: selectedEnsemble.ensamble, descripcion: selectedEnsemble.descripcion || '' });
            setShowMusicianPicker(false);
            setSearchText('');
        } else {
            setMemberIds(new Set());
            setCoordinatorIds(new Set());
            setEnsembleMembersDetailed([]);
            setShowMusicianPicker(false);
            setSearchText('');
        }
    }, [selectedEnsemble]); // Dependencia simplificada para evitar bucles, controlamos manual

    // --- CAMBIO 1: PEDIR EL COUNT A SUPABASE ---
    const fetchEnsembles = async () => {
        // 'integrantes_ensambles(count)' nos devuelve el número de relaciones
        const { data, error } = await supabase
            .from('ensambles')
            .select('*, integrantes_ensambles(count)') 
            .order('ensamble');
        if (error) return;

        const { data: membersByEnsemble } = await supabase
            .from('integrantes_ensambles')
            .select('id_ensamble, integrantes(id, instrumentos(instrumento, familia))');

        const instrumentationByEnsemble = {};
        (membersByEnsemble || []).forEach((row) => {
            const ensambleId = row.id_ensamble;
            if (!instrumentationByEnsemble[ensambleId]) {
                instrumentationByEnsemble[ensambleId] = createEmptyEnsembleInstrumentation();
            }
            const integrante = Array.isArray(row.integrantes) ? row.integrantes[0] : row.integrantes;
            const bucket = classifyInstrument(integrante?.instrumentos);
            if (!bucket) return;
            if (bucket.type === 'wind') {
                instrumentationByEnsemble[ensambleId][bucket.key] += 1;
            } else if (bucket.type === 'string') {
                instrumentationByEnsemble[ensambleId].strings[bucket.key] += 1;
            }
        });

        const enriched = (data || []).map((ensamble) => ({
            ...ensamble,
            instrumentationLabel: formatEnsembleInstrumentation(instrumentationByEnsemble[ensamble.id]),
        }));
        setEnsembles(enriched);
    };

    const fetchAllMusicians = async () => {
        setLoadingAllMusicians(true);
        const { data, error } = await supabase.from('integrantes').select('id, nombre, apellido, mail, telefono, id_instr, instrumentos(instrumento, familia)').order('apellido');
        if (!error) {
            setAllMusicians(data || []);
            setMusiciansLoaded(true);
        } else {
            toast.error("No se pudo cargar el padrón de músicos");
        }
        setLoadingAllMusicians(false);
    };

    const fetchEnsembleMembers = async (ensambleId) => {
        setLoadingMembers(true);
        const [membersRes, coordinatorsRes] = await Promise.all([
            supabase
                .from('integrantes_ensambles')
                .select('id_integrante, integrantes(id, nombre, apellido, mail, telefono, id_instr, instrumentos(instrumento, familia))')
                .eq('id_ensamble', ensambleId),
            supabase.from('ensambles_coordinadores').select('id_integrante').eq('id_ensamble', ensambleId),
        ]);
        if (!membersRes.error && membersRes.data) {
            setMemberIds(new Set(membersRes.data.map(row => row.id_integrante)));
            const detailedMembers = membersRes.data
                .map((row) => (Array.isArray(row.integrantes) ? row.integrantes[0] : row.integrantes))
                .filter(Boolean);
            setEnsembleMembersDetailed(detailedMembers);
        }
        if (!coordinatorsRes.error && coordinatorsRes.data) setCoordinatorIds(new Set(coordinatorsRes.data.map(row => row.id_integrante)));
        setLoadingMembers(false);
    };

    const generateEnsembleId = () => Math.floor(100 + Math.random() * 900000); 
    
    const createEnsemble = async () => {
        const nombreDefault = "Nuevo Ensamble " + (ensembles.length + 1);
        const newId = generateEnsembleId();
        const { data, error } = await supabase.from('ensambles').insert([{ id: newId, ensamble: nombreDefault, descripcion: '' }]).select();
        if (error) toast.error("Error al crear: " + error.message);
        else if (data && data.length > 0) { await fetchEnsembles(); setSelectedEnsemble(data[0]); }
    };

    const deleteEnsemble = async (id, e) => {
        e.stopPropagation();
        if (!confirm("¿Eliminar ensamble?")) return;
        await supabase.from('integrantes_ensambles').delete().eq('id_ensamble', id);
        const { error } = await supabase.from('ensambles').delete().eq('id', id);
        if (error) toast.error("Error al eliminar: " + error.message); else { if (selectedEnsemble?.id === id) setSelectedEnsemble(null); fetchEnsembles(); }
    };

    const saveHeader = async () => {
        if (!selectedEnsemble) return;
        const { error } = await supabase.from('ensambles').update({ ensamble: headerForm.ensamble, descripcion: headerForm.descripcion }).eq('id', selectedEnsemble.id);
        if (error) toast.error("Error al actualizar: " + error.message); else { setIsEditingHeader(false); fetchEnsembles(); setSelectedEnsemble({ ...selectedEnsemble, ...headerForm }); }
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
        
        if (error) toast.error(`Error: ${error.message}`); 
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

    const getInstrumentSortKey = (musician) => {
        return String(musician.id_instr || '');
    };

    const goToMusicianEditor = (musician) => {
        sessionStorage.setItem('musicians_last_search', `${musician.apellido || ''} ${musician.nombre || ''}`.trim());
        window.location.href = '/?tab=musicos';
    };

    const handleOpenMusicianPicker = async () => {
        if (!musiciansLoaded) await fetchAllMusicians();
        setShowMusicianPicker(true);
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
        if (musicianSortMode === 'instrument') {
            const instrumentCompare = getInstrumentSortKey(a).localeCompare(getInstrumentSortKey(b));
            if (instrumentCompare !== 0) return instrumentCompare;
        }
        return (a.apellido || '').localeCompare(b.apellido || '');
    });
    const sortedEnsembleMembers = [...ensembleMembersDetailed].sort((a, b) => {
        if (musicianSortMode === 'instrument') {
            const instrumentCompare = getInstrumentSortKey(a).localeCompare(getInstrumentSortKey(b));
            if (instrumentCompare !== 0) return instrumentCompare;
        }
        return (a.apellido || '').localeCompare(b.apellido || '');
    });
    const visibleMusicians = showMusicianPicker ? filteredMusicians : sortedEnsembleMembers;
    const firstNonMemberIndex = filteredMusicians.findIndex(m => !memberIds.has(m.id));

    return (
        <div className="flex h-full gap-4 lg:gap-5 flex-col lg:flex-row min-w-0 w-full">
            <div className="lg:hidden w-full min-w-0 max-w-none bg-white border border-slate-200 rounded-xl p-3 sm:p-3 shadow-sm">
                <div className="flex items-center justify-between gap-2 mb-2">
                    <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                        <IconLayers className="text-indigo-600" size={16} />
                        Ensamble
                    </h2>
                    <button onClick={createEnsemble} className="text-[11px] bg-indigo-600 text-white px-2 py-1 rounded hover:bg-indigo-700 flex items-center gap-1 shadow-sm"><IconPlus size={12}/> Nuevo</button>
                </div>
                <select
                    value={selectedEnsemble?.id || ''}
                    onChange={(e) => {
                        const selectedId = e.target.value;
                        const ens = ensembles.find((item) => String(item.id) === String(selectedId)) || null;
                        setSelectedEnsemble(ens);
                    }}
                    className="w-full min-w-0 max-w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white text-slate-700 whitespace-normal"
                >
                    <option value="">Seleccionar ensamble...</option>
                    {ensembles.map((ens) => (
                        <option key={ens.id} value={ens.id}>
                            {ens.ensamble}{ens.instrumentationLabel ? ` (${ens.instrumentationLabel})` : ''}
                        </option>
                    ))}
                </select>
            </div>

            <div className="hidden lg:flex lg:w-[38%] lg:min-w-[280px] lg:max-w-[480px] xl:max-w-[520px] flex-shrink-0 flex-col gap-3 border-r border-slate-200 pr-4 lg:pr-5 overflow-y-auto min-w-0">
                <div className="flex items-center justify-between mb-2">
                    <h2 className="text-base lg:text-lg font-bold text-slate-700 flex items-center gap-2"><IconLayers className="text-indigo-600"/> Ensambles</h2>
                    <button onClick={createEnsemble} className="text-xs bg-indigo-600 text-white px-2 py-1 rounded hover:bg-indigo-700 flex items-center gap-1 shadow-sm"><IconPlus size={14}/> Nuevo</button>
                </div>
                <div className="space-y-2">
                    {ensembles.map(ens => (
                        <div key={ens.id} className="group relative">
                            <button onClick={() => setSelectedEnsemble(ens)} className={`w-full min-w-0 text-left p-3 lg:p-3.5 rounded-xl border transition-all pr-10 ${selectedEnsemble?.id === ens.id ? 'bg-indigo-600 text-white border-indigo-600 shadow-md ring-2 ring-indigo-200' : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300 hover:bg-slate-50'}`}>
                                <div className="flex flex-col gap-1 items-stretch min-w-0">
                                    <span className={`font-bold text-base lg:text-lg break-words hyphens-auto leading-snug ${selectedEnsemble?.id === ens.id ? 'text-white' : 'text-slate-800'}`}>{ens.ensamble}</span>
                                    {ens.instrumentationLabel && (
                                        <span className={`text-[10px] lg:text-[11px] font-mono font-medium break-all leading-tight ${selectedEnsemble?.id === ens.id ? 'text-white/95' : 'text-slate-500'}`}>
                                            ({ens.instrumentationLabel})
                                        </span>
                                    )}
                                </div>
                                
                                {/* --- CAMBIO 2: MOSTRAR CONTADOR --- */}
                                {/* Supabase devuelve [{count: N}] en esa propiedad */}
                                <div className={`text-xs font-semibold mb-1 flex items-center gap-1 ${selectedEnsemble?.id === ens.id ? 'text-white/90' : 'text-indigo-600'}`}>
                                    <IconUsers size={12} />
                                    {ens.integrantes_ensambles?.[0]?.count || 0} integrantes
                                </div>
                                {ens.descripcion && <div className={`text-xs truncate ${selectedEnsemble?.id === ens.id ? 'text-white/85' : 'text-slate-400'}`}>{ens.descripcion}</div>}
                            </button>
                            <button onClick={(e) => deleteEnsemble(ens.id, e)} className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-all ${selectedEnsemble?.id === ens.id ? 'text-white/70 hover:text-white hover:bg-white/20' : 'text-slate-300 hover:text-red-500 hover:bg-red-50'}`}><IconTrash size={16} /></button>
                        </div>
                    ))}
                    {ensembles.length === 0 && <div className="text-center p-8 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-sm">No hay ensambles.<br/>Crea uno para empezar.</div>}
                </div>
            </div>
            
            {/* Panel Derecho (Igual que antes) */}
            <div className="w-full flex-1 flex flex-col h-full overflow-hidden bg-white rounded-xl shadow-sm border border-slate-200">
                {selectedEnsemble ? (
                    <>
                        <div className="p-4 lg:p-5 border-b border-slate-100 bg-slate-50">
                            {isEditingHeader ? (
                                <div className="space-y-3 animate-in fade-in duration-200">
                                    <input type="text" className="w-full text-2xl font-bold border border-indigo-300 rounded px-2 py-1 focus:ring-2 focus:ring-indigo-500 outline-none" value={headerForm.ensamble} onChange={(e) => setHeaderForm({...headerForm, ensamble: e.target.value})} placeholder="Nombre del Ensamble"/>
                                    <textarea className="w-full text-sm border border-indigo-300 rounded px-2 py-1 focus:ring-2 focus:ring-indigo-500 outline-none resize-none h-20" value={headerForm.descripcion} onChange={(e) => setHeaderForm({...headerForm, descripcion: e.target.value})} placeholder="Descripción del ensamble..."/>
                                    <div className="flex gap-2 justify-end"><button onClick={() => setIsEditingHeader(false)} className="px-3 py-1 bg-white border rounded text-sm hover:bg-slate-50">Cancelar</button><button onClick={saveHeader} className="px-3 py-1 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700">Guardar</button></div>
                                </div>
                            ) : (
                                <div className="group relative">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                                                {selectedEnsemble.ensamble}
                                                <button onClick={() => setIsEditingHeader(true)} className="text-slate-300 hover:text-indigo-500 transition-colors opacity-0 group-hover:opacity-100" title="Editar Nombre/Descripción"><IconEdit size={18} /></button>
                                            </h2>
                                            <p className="text-slate-500 text-sm mb-4 mt-1">{selectedEnsemble.descripcion || <span className="italic text-slate-400">Sin descripción</span>}</p>
                                        </div>
                                        {selectedEnsemble.instrumentationLabel && (
                                            <div className="text-[10px] lg:text-[11px] font-mono text-slate-600 bg-white border border-slate-200 rounded-md px-2 py-1 shrink-0">
                                                ({selectedEnsemble.instrumentationLabel})
                                            </div>
                                        )}
                                    </div>
                                    <div className="mt-2 flex items-center justify-between gap-2">
                                        <button
                                            type="button"
                                            onClick={handleOpenMusicianPicker}
                                            disabled={loadingAllMusicians}
                                            className="text-xs bg-indigo-600 text-white px-2.5 py-1.5 rounded-md hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-1"
                                        >
                                            {loadingAllMusicians ? <IconLoader size={12} /> : <IconPlus size={12} />}
                                            Agregar músico
                                        </button>
                                        {showMusicianPicker && (
                                            <button
                                                type="button"
                                                onClick={() => setShowMusicianPicker(false)}
                                                className="text-xs border border-slate-300 text-slate-600 px-2.5 py-1.5 rounded-md hover:bg-slate-100"
                                            >
                                                Ocultar lista
                                            </button>
                                        )}
                                    </div>
                                    <div className="mt-2 flex justify-end">
                                        <select value={musicianSortMode} onChange={(e) => setMusicianSortMode(e.target.value)} className="text-xs border border-slate-300 rounded-md px-2 py-1 bg-white text-slate-600">
                                            <option value="surname">Orden: Apellido</option>
                                            <option value="instrument">Orden: Instrumento</option>
                                        </select>
                                    </div>
                                    {showMusicianPicker && (
                                        <>
                                            <div className="relative mt-2"><div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><IconSearch size={18} /></div><input type="text" className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all" placeholder="Buscar músico para agregar/quitar..." value={searchText} onChange={(e) => setSearchText(e.target.value)}/></div>
                                        </>
                                    )}
                                    <div className="flex justify-between items-center mt-2 text-xs text-slate-400"><span>Total músicos encontrados: {visibleMusicians.length}</span><span>Miembros actuales: {memberIds.size}</span></div>
                                </div>
                            )}
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 lg:p-2.5 bg-slate-50/50">
                            {loadingMembers ? (<div className="flex items-center justify-center h-full text-indigo-600 gap-2"><IconLoader size={24}/> Cargando miembros...</div>) : !showMusicianPicker ? (
                                <div className="space-y-2">
                                    {visibleMusicians.map((musician) => {
                                        const isMember = memberIds.has(musician.id);
                                        const isCoordinator = coordinatorIds.has(musician.id);
                                        const isToggling = togglingId === musician.id;
                                        return (
                                            <div key={musician.id} onClick={() => !isToggling && toggleMembership(musician.id)} className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all select-none ${isMember ? 'bg-indigo-50 shadow-sm z-10' : 'bg-white'} ${isCoordinator ? 'border-2 border-amber-400' : isMember ? 'border-indigo-200' : 'border-slate-200 hover:border-indigo-300'}`}>
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-6 h-6 rounded border flex items-center justify-center transition-colors ${isMember ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-300'}`}>{isToggling ? (<IconLoader size={14} className={isMember ? "text-white" : "text-indigo-600"}/>) : (isMember && <IconCheck size={14} className="text-white"/>)}</div>
                                                    <div><div className={`font-bold ${isMember ? 'text-indigo-900' : 'text-slate-700'}`}>{musician.apellido}, {musician.nombre}</div><div className="text-xs text-slate-500 flex items-center gap-1"><IconMusic size={10}/> {musician.instrumentos?.instrumento || 'Sin instrumento'}</div></div>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    {musician.mail && (
                                                        <a href={`mailto:${musician.mail}`} onClick={(e) => e.stopPropagation()} className="p-1 rounded-full text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors" title="Enviar mail">
                                                            <IconMail size={14} />
                                                        </a>
                                                    )}
                                                    <WhatsAppLink phone={musician.telefono} className="p-1 rounded-full text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors inline-flex items-center justify-center" iconSize={14} title="Enviar WhatsApp" />
                                                    <button type="button" onClick={(e) => { e.stopPropagation(); goToMusicianEditor(musician); }} className="p-1 rounded-full text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors" title="Editar músico">
                                                        <IconEdit size={14} />
                                                    </button>
                                                    {isMember && (<span className="text-xs font-bold text-indigo-600 bg-white px-2 py-1 rounded border border-indigo-100">MIEMBRO</span>)}
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {visibleMusicians.length === 0 && (
                                        <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                                            No hay integrantes en este ensamble. Presiona <span className="font-bold mx-1">Agregar músico</span> para sumar.
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {filteredMusicians.map((musician, index) => {
                                        const isMember = memberIds.has(musician.id);
                                        const isCoordinator = coordinatorIds.has(musician.id);
                                        const isToggling = togglingId === musician.id;
                                        const showSeparator = index === firstNonMemberIndex && index > 0;
                                        return (
                                            <React.Fragment key={musician.id}>
                                                {showSeparator && (<div className="relative py-4 text-center"><div className="absolute inset-0 flex items-center" aria-hidden="true"><div className="w-full border-t border-slate-300"></div></div><div className="relative flex justify-center"><span className="bg-slate-50 px-2 text-xs text-slate-500 uppercase tracking-wide font-semibold">Músicos Disponibles</span></div></div>)}
                                                <div onClick={() => !isToggling && toggleMembership(musician.id)} className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all select-none ${isMember ? 'bg-indigo-50 shadow-sm z-10' : 'bg-white'} ${isCoordinator ? 'border-2 border-amber-400' : isMember ? 'border-indigo-200' : 'border-slate-200 hover:border-indigo-300'}`}>
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-6 h-6 rounded border flex items-center justify-center transition-colors ${isMember ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-300'}`}>{isToggling ? (<IconLoader size={14} className={isMember ? "text-white" : "text-indigo-600"}/>) : (isMember && <IconCheck size={14} className="text-white"/>)}</div>
                                                        <div><div className={`font-bold ${isMember ? 'text-indigo-900' : 'text-slate-700'}`}>{musician.apellido}, {musician.nombre}</div><div className="text-xs text-slate-500 flex items-center gap-1"><IconMusic size={10}/> {musician.instrumentos?.instrumento || 'Sin instrumento'}</div></div>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        {musician.mail && (
                                                            <a
                                                                href={`mailto:${musician.mail}`}
                                                                onClick={(e) => e.stopPropagation()}
                                                                className="p-1 rounded-full text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                                                                title="Enviar mail"
                                                            >
                                                                <IconMail size={14} />
                                                            </a>
                                                        )}
                                                        <WhatsAppLink
                                                            phone={musician.telefono}
                                                            className="p-1 rounded-full text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors inline-flex items-center justify-center"
                                                            iconSize={14}
                                                            title="Enviar WhatsApp"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                goToMusicianEditor(musician);
                                                            }}
                                                            className="p-1 rounded-full text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                                                            title="Editar músico"
                                                        >
                                                            <IconEdit size={14} />
                                                        </button>
                                                        {isMember && (<span className="text-xs font-bold text-indigo-600 bg-white px-2 py-1 rounded border border-indigo-100">MIEMBRO</span>)}
                                                    </div>
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