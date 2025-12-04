import React, { useState, useEffect } from 'react';
import { IconPlus, IconSearch, IconAlertCircle, IconMusic, IconUsers, IconMail, IconPhone, IconEdit } from '../../components/ui/Icons';
import InstrumentFilter from '../../components/filters/InstrumentFilter';
import MusicianForm from './MusicianForm';

export default function MusiciansView({ supabase, catalogoInstrumentos }) {
    const [resultados, setResultados] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [searchText, setSearchText] = useState("");
    const [selectedInstruments, setSelectedInstruments] = useState(new Set()); 
    const [editingId, setEditingId] = useState(null);
    const [ensemblesList, setEnsemblesList] = useState([]); 
    
    // ESTADO DEL FORMULARIO EXTENDIDO
    const [editFormData, setEditFormData] = useState({ 
        nombre: '', apellido: '', id_instr: '',
        genero: '', telefono: '', dni: '', mail: '',
        alimentacion: '', nacionalidad: '', cuil: '', fecha_nac: ''
    });
    const [musicianEnsembles, setMusicianEnsembles] = useState(new Set()); 
    const [isAdding, setIsAdding] = useState(false);

    useEffect(() => {
        const allIds = new Set(catalogoInstrumentos.map(i => i.id));
        allIds.add('null');
        setSelectedInstruments(allIds);
        fetchData(supabase, "", allIds);
        fetchEnsemblesList();
    }, [catalogoInstrumentos]);

    const fetchEnsemblesList = async () => {
        const { data } = await supabase.from('ensambles').select('id, ensamble').order('ensamble');
        if (data) setEnsemblesList(data);
    };

    const fetchData = async (client = supabase, search = searchText, instruments = selectedInstruments) => {
        if (!client) return;
        setLoading(true);
        setError(null);
        setEditingId(null);
        try {
            let query = client.from('integrantes')
                .select('*, instrumentos(instrumento)')
                .order('apellido', { ascending: true });
            
            if (search.trim()) {
                const term = search.trim();
                query = query.or(`nombre.ilike.%${term}%,apellido.ilike.%${term}%`);
            }
            const instrumentArray = Array.from(instruments);
            const realIds = instrumentArray.filter(id => id !== 'null');
            const includeNull = instruments.has('null');
            if (realIds.length === 0 && !includeNull) { setResultados([]); setLoading(false); return; }
            let orConditions = [];
            if (realIds.length > 0) orConditions.push(`id_instr.in.(${realIds.join(',')})`);
            if (includeNull) orConditions.push(`id_instr.is.null`);
            if (orConditions.length > 0) query = query.or(orConditions.join(','));
            
            const { data: musicians, error: musError } = await query;
            if (musError) throw musError;

            // Traer Relaciones N:N manualmente
            const { data: relations } = await client.from('integrantes_ensambles').select('id_integrante, id_ensamble');
            
            // Unir en JS
            const mergedData = musicians.map(m => {
                const myRel = relations ? relations.filter(r => r.id_integrante === m.id) : [];
                const myEnsembles = myRel.map(r => {
                    const ens = ensemblesList.find(e => e.id === r.id_ensamble);
                    return ens ? { ensamble: ens.ensamble } : null;
                }).filter(Boolean);

                return {
                    ...m,
                    integrantes_ensambles: myEnsembles
                };
            });

            setResultados(mergedData);
        } catch (err) { 
            console.error(err);
            setError("Error al cargar datos: " + err.message); 
        } finally { 
            setLoading(false); 
        }
    };

    const handleSearch = (e) => { e.preventDefault(); fetchData(supabase, searchText, selectedInstruments); };
    const handleInstrumentChange = (newSet) => { setSelectedInstruments(newSet); fetchData(supabase, searchText, newSet); };
    
    // Función auxiliar para actualizar relaciones N:N
    const updateEnsembleRelations = async (musicianId, selectedIds) => {
        await supabase.from('integrantes_ensambles').delete().eq('id_integrante', musicianId);
        if (selectedIds.size > 0) {
            const inserts = Array.from(selectedIds).map(ensId => ({
                id_integrante: musicianId,
                id_ensamble: parseInt(ensId, 10)
            }));
            await supabase.from('integrantes_ensambles').insert(inserts);
        }
    };

    const guardarEdicion = async (id) => {
        if (!supabase) return;
        setLoading(true);
        try {
            const updateData = { ...editFormData };
            if (!updateData.id_instr) updateData.id_instr = null;
            if (updateData.dni) updateData.dni = parseInt(updateData.dni, 10);
            
            const { error } = await supabase.from('integrantes').update(updateData).eq('id', id);
            if (error) throw error;

            await updateEnsembleRelations(id, musicianEnsembles);
            await fetchData(supabase, searchText, selectedInstruments);
            setEditingId(null);
        } catch (err) { alert("Error al guardar: " + err.message); } finally { setLoading(false); }
    };

    const generateRandomId = () => Math.floor(10000000 + Math.random() * 90000000);

    const crearIntegrante = async () => {
        if (!supabase) return;
        setLoading(true);
        try {
            const newId = generateRandomId();
            const insertData = { ...editFormData, id: newId };
            if (!insertData.id_instr) insertData.id_instr = null;
            if (insertData.dni) insertData.dni = parseInt(insertData.dni, 10);

            const { error } = await supabase.from('integrantes').insert([insertData]);
            if (error) throw error;

            await updateEnsembleRelations(newId, musicianEnsembles);
            setIsAdding(false);
            resetForm();
            await fetchData(supabase, searchText, selectedInstruments);
        } catch (err) { alert("Error al crear: " + err.message); } finally { setLoading(false); }
    };

    const resetForm = () => {
        setEditFormData({ nombre: '', apellido: '', id_instr: '', genero: '', telefono: '', dni: '', mail: '', alimentacion: '', nacionalidad: '', cuil: '', fecha_nac: '' });
        setMusicianEnsembles(new Set());
    };

    const startEdit = async (item) => { 
        setEditingId(item.id); 
        setEditFormData({ 
            nombre: item.nombre || '', apellido: item.apellido || '', id_instr: item.id_instr || '',
            genero: item.genero || '', telefono: item.telefono || '', dni: item.dni || '', 
            mail: item.mail || '', alimentacion: item.alimentacion || '', nacionalidad: item.nacionalidad || '', 
            cuil: item.cuil || '', fecha_nac: item.fecha_nac || ''
        });
        const { data } = await supabase.from('integrantes_ensambles').select('id_ensamble').eq('id_integrante', item.id);
        if (data) { setMusicianEnsembles(new Set(data.map(r => r.id_ensamble))); } 
        else { setMusicianEnsembles(new Set()); }
        setIsAdding(false); 
    };
    
    const startAdd = () => { setEditingId(null); resetForm(); setIsAdding(true); };

    return (
        <div className="space-y-6 h-full flex flex-col overflow-hidden">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 shrink-0">
                <div className="flex flex-col md:flex-row gap-4">
                    <form onSubmit={handleSearch} className="flex-1 relative">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><IconSearch size={18} /></div>
                        <input type="text" className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded hover:border-indigo-500 focus:ring-2 focus:ring-indigo-500 outline-none transition-all" placeholder="Buscá por nombre o apellido..." value={searchText} onChange={(e) => setSearchText(e.target.value)} />
                    </form>
                    <div className="w-full md:w-auto min-w-[200px]">
                        <InstrumentFilter catalogo={catalogoInstrumentos} selectedIds={selectedInstruments} onChange={handleInstrumentChange} />
                    </div>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500 pt-2 mt-2 border-t border-slate-100">
                    <span>Mostrando {resultados.length} resultados</span>
                    {loading && <span className="text-indigo-600 font-medium">Actualizando...</span>}
                </div>
            </div>

            {error && (<div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start gap-3"><IconAlertCircle className="shrink-0 mt-0.5" /><div><p className="font-bold text-sm">Ocurrió un error</p><p className="text-sm opacity-90">{error}</p></div></div>)}

            <div className="flex-1 overflow-y-auto space-y-3 pb-4 pr-2">
                {!isAdding && (<button onClick={startAdd} className="w-full py-3 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 hover:border-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 transition-all flex items-center justify-center gap-2 font-medium"><IconPlus size={20} /> Agregar Nuevo Integrante</button>)}
                
                {isAdding && (
                    <MusicianForm formData={editFormData} setFormData={setEditFormData} onCancel={() => setIsAdding(false)} onSave={crearIntegrante} loading={loading} isNew={true} catalogoInstrumentos={catalogoInstrumentos} ensemblesList={ensemblesList} musicianEnsembles={musicianEnsembles} setMusicianEnsembles={setMusicianEnsembles} />
                )}

                {resultados.map((item) => (
                    <div key={item.id}>
                        {editingId === item.id ? (
                            <MusicianForm formData={editFormData} setFormData={setEditFormData} onCancel={() => setEditingId(null)} onSave={() => guardarEdicion(item.id)} loading={loading} catalogoInstrumentos={catalogoInstrumentos} ensemblesList={ensemblesList} musicianEnsembles={musicianEnsembles} setMusicianEnsembles={setMusicianEnsembles} />
                        ) : (
                            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm transition-all hover:shadow-md flex items-start gap-4">
                                <div className={`p-3 rounded-full shrink-0 ${item.id_instr ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>{item.id_instr ? <IconMusic size={24}/> : <IconUsers size={24}/>}</div>
                                <div className="flex-1 min-w-0 pt-1">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="text-lg font-bold text-slate-800 leading-tight">
                                                {item.apellido}, {item.nombre}
                                                {item.integrantes_ensambles && item.integrantes_ensambles.length > 0 && (
                                                    <span className="ml-2 text-xs font-normal text-slate-400">
                                                        | {item.integrantes_ensambles.map(ie => ie.ensamble).join(" | ")}
                                                    </span>
                                                )}
                                            </h3>
                                            <p className="text-sm text-slate-500 mt-1 flex items-center gap-2">
                                                <span className={`px-2 py-0.5 rounded text-xs font-semibold ${item.instrumentos ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}>{item.instrumentos?.instrumento || 'Sin Instrumento'}</span>
                                                <span className="text-slate-300 text-[10px]">ID: {item.id}</span>
                                            </p>
                                            <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
                                                {item.mail && <div className="flex items-center gap-1 hover:text-indigo-600"><IconMail size={12}/> {item.mail}</div>}
                                                {item.telefono && <div className="flex items-center gap-1 hover:text-indigo-600"><IconPhone size={12}/> {item.telefono}</div>}
                                                {item.dni && <div className="flex items-center gap-1">DNI: {item.dni}</div>}
                                            </div>
                                        </div>
                                        <button onClick={() => startEdit(item)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Editar Completo"><IconEdit size={20}/></button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
                {!loading && resultados.length === 0 && (<div className="text-center py-12 px-4 border-2 border-dashed border-slate-200 rounded-xl"><div className="bg-slate-50 p-4 rounded-full inline-block mb-3"><IconSearch className="text-slate-400" size={32}/></div><h3 className="text-slate-600 font-bold">No se encontraron resultados</h3></div>)}
            </div>
        </div>
    );
}