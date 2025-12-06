import React, { useState, useEffect } from 'react';
import { IconPlus, IconX, IconCheck, IconLink, IconTrash, IconMusic, IconFileLink } from '../../components/ui/Icons';
import TagMultiSelect from '../../components/filters/TagMultiSelect';
import ComposerMultiSelect from '../../components/filters/ComposerMultiSelect'; // NUEVO
import DurationInput from '../../components/ui/DurationInput'; // NUEVO

export default function WorkForm({ 
    supabase, formData, setFormData, onCancel, onSave, loading, isNew = false, catalogoInstrumentos = [] 
}) {
    const [compositores, setCompositores] = useState([]);
    const [tagsList, setTagsList] = useState([]);
    
    // Estados Relacionales
    const [particellas, setParticellas] = useState([]);
    const [selectedTags, setSelectedTags] = useState(new Set());
    const [selectedComposers, setSelectedComposers] = useState(new Set()); // NUEVO

    const [newPart, setNewPart] = useState({ id_instrumento: '', nombre_archivo: '', url_archivo: '' });

    useEffect(() => {
        loadDropdowns();
        if (!isNew && formData.id) {
            loadWorkDetails();
        }
    }, []);

    const loadDropdowns = async () => {
        const { data: comp } = await supabase.from('compositores').select('id, apellido, nombre').order('apellido');
        if (comp) setCompositores(comp);
        const { data: tags } = await supabase.from('palabras_clave').select('id, tag').order('tag');
        if (tags) setTagsList(tags);
    };

    const loadWorkDetails = async () => {
        // 1. Particellas
        const { data: parts } = await supabase.from('obras_particellas').select('*, instrumentos(instrumento, familia)').eq('id_obra', formData.id);
        if (parts) setParticellas(parts);

        // 2. Tags
        const { data: workTags } = await supabase.from('obras_palabras_clave').select('id_palabra_clave').eq('id_obra', formData.id);
        if (workTags) setSelectedTags(new Set(workTags.map(t => t.id_palabra_clave)));

        // 3. Compositores (NUEVO - N:N)
        const { data: workComps } = await supabase.from('obras_compositores').select('id_compositor').eq('id_obra', formData.id);
        if (workComps) setSelectedComposers(new Set(workComps.map(c => c.id_compositor)));
    };

    const addParticella = () => {
        if (!newPart.id_instrumento) return alert("Selecciona un instrumento");
        const instData = catalogoInstrumentos.find(i => i.id == newPart.id_instrumento);
        setParticellas([...particellas, { ...newPart, tempId: Date.now(), instrumentos: instData }]);
        setNewPart({ id_instrumento: '', nombre_archivo: '', url_archivo: '' });
    };

    const removeParticella = async (index, item) => {
        if (item.id) await supabase.from('obras_particellas').delete().eq('id', item.id);
        const newList = [...particellas];
        newList.splice(index, 1);
        setParticellas(newList);
    };

    const handleSaveFull = async () => {
        if (selectedComposers.size === 0) return alert("Debe seleccionar al menos un compositor.");

        // 1. Guardar Obra (Ya no enviamos id_compositor en formData)
        const obraId = await onSave(); 
        
        if (obraId) {
            // 2. Guardar Compositores (N:N)
            await supabase.from('obras_compositores').delete().eq('id_obra', obraId);
            const compsToInsert = Array.from(selectedComposers).map(compId => ({
                id_obra: obraId, id_compositor: compId
            }));
            await supabase.from('obras_compositores').insert(compsToInsert);

            // 3. Guardar Tags
            await supabase.from('obras_palabras_clave').delete().eq('id_obra', obraId);
            if (selectedTags.size > 0) {
                const tagsToInsert = Array.from(selectedTags).map(tagId => ({ id_obra: obraId, id_palabra_clave: tagId }));
                await supabase.from('obras_palabras_clave').insert(tagsToInsert);
            }

            // 4. Guardar Particellas
            const newParts = particellas.filter(p => !p.id).map(p => ({
                id_obra: obraId,
                id_instrumento: p.id_instrumento,
                nombre_archivo: p.nombre_archivo || `${p.instrumentos.instrumento} (Parte)`,
                url_archivo: p.url_archivo || null
            }));
            if (newParts.length > 0) await supabase.from('obras_particellas').insert(newParts);
        }
    };

    return (
        <div className={`p-6 rounded-xl border shadow-sm animate-in fade-in zoom-in-95 duration-200 ${isNew ? 'bg-indigo-50 border-indigo-200' : 'bg-white ring-2 ring-indigo-500 border-indigo-500 z-10 relative'}`}>
            <h3 className="text-indigo-900 font-bold mb-6 flex items-center gap-2 border-b border-indigo-100 pb-2">
                {isNew ? <><IconPlus size={18}/> Nueva Obra</> : <><IconFileLink size={18}/> Editando Obra</>}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-6">
                <div className="md:col-span-6">
                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Título de la Obra</label>
                    <input type="text" className="w-full border p-2 rounded text-lg font-bold bg-white focus:ring-2 focus:ring-indigo-500 outline-none" value={formData.titulo || ''} onChange={(e) => setFormData({...formData, titulo: e.target.value})} placeholder="Ej: Sinfonía No. 5"/>
                </div>
                
                {/* MULTI SELECT DE COMPOSITORES */}
                <div className="md:col-span-6">
                    <ComposerMultiSelect 
                        compositores={compositores} 
                        selectedIds={selectedComposers} 
                        onChange={setSelectedComposers} 
                    />
                </div>

                <div className="md:col-span-3">
                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Arreglador</label>
                    <select className="w-full border p-2 rounded text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none" value={formData.id_arreglador || ''} onChange={(e) => setFormData({...formData, id_arreglador: e.target.value})}>
                        <option value="">-- Ninguno --</option>
                        {compositores.map(c => <option key={c.id} value={c.id}>{c.apellido}, {c.nombre}</option>)}
                    </select>
                </div>

                <div className="md:col-span-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Año</label>
                    <input type="number" className="w-full border p-2 rounded text-sm bg-white" value={formData.anio_composicion || ''} onChange={(e) => setFormData({...formData, anio_composicion: e.target.value})}/>
                </div>
                
                {/* DURACIÓN (SEGUNDOS) */}
                <div className="md:col-span-2">
                    <DurationInput 
                        label="Duración" 
                        value={formData.duracion_segundos} 
                        onChange={(val) => setFormData({...formData, duracion_segundos: val})}
                    />
                </div>

                <div className="md:col-span-5">
                    <TagMultiSelect tags={tagsList} selectedIds={selectedTags} onChange={setSelectedTags} />
                </div>
                
                <div className="md:col-span-6">
                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Link Drive</label>
                    <div className="relative"><input type="text" className="w-full border p-2 pl-8 rounded text-sm bg-white text-blue-600 underline" value={formData.link_drive || ''} onChange={(e) => setFormData({...formData, link_drive: e.target.value})}/><IconLink size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"/></div>
                </div>
                <div className="md:col-span-6">
                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Link YouTube</label>
                    <div className="relative"><input type="text" className="w-full border p-2 pl-8 rounded text-sm bg-white text-blue-600 underline" value={formData.link_youtube || ''} onChange={(e) => setFormData({...formData, link_youtube: e.target.value})}/><IconLink size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"/></div>
                </div>
                <div className="md:col-span-12">
                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Observaciones</label>
                    <textarea className="w-full border p-2 rounded text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none resize-y min-h-[60px]" value={formData.observaciones || ''} onChange={(e) => setFormData({...formData, observaciones: e.target.value})} placeholder="Notas..."/>
                </div>
            </div>

            {/* SECCIÓN INSTRUMENTACIÓN */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <h4 className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-2"><IconMusic size={14}/> Instrumentación & Archivos</h4>
                <div className="flex flex-col md:flex-row gap-2 items-end mb-4 bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                    <div className="w-full md:w-1/3"><label className="text-[10px] text-slate-400 uppercase font-bold">Instrumento</label><select className="w-full border p-1.5 rounded text-sm outline-none" value={newPart.id_instrumento} onChange={e => setNewPart({...newPart, id_instrumento: e.target.value})}><option value="">-- Seleccionar --</option>{catalogoInstrumentos.map(i => <option key={i.id} value={i.id}>{i.instrumento}</option>)}</select></div>
                    <div className="w-full md:w-1/3"><label className="text-[10px] text-slate-400 uppercase font-bold">Nombre Parte</label><input type="text" placeholder="Ej: Flauta 1" className="w-full border p-1.5 rounded text-sm outline-none" value={newPart.nombre_archivo} onChange={e => setNewPart({...newPart, nombre_archivo: e.target.value})}/></div>
                    <div className="flex-1 w-full"><label className="text-[10px] text-slate-400 uppercase font-bold">Link PDF</label><input type="text" placeholder="https://..." className="w-full border p-1.5 rounded text-sm outline-none text-blue-600" value={newPart.url_archivo} onChange={e => setNewPart({...newPart, url_archivo: e.target.value})}/></div>
                    <button onClick={addParticella} className="bg-indigo-600 text-white px-3 py-1.5 rounded text-sm font-bold hover:bg-indigo-700 h-[34px]"><IconPlus/></button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                    {particellas.map((p, idx) => (
                        <div key={p.id || p.tempId} className="bg-white border border-slate-200 p-2 rounded flex flex-col justify-between group hover:border-indigo-300 transition-all relative">
                            <div><div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">{p.instrumentos?.familia || 'Otro'}</div><div className="text-sm font-bold text-slate-700 truncate" title={p.nombre_archivo}>{p.nombre_archivo || p.instrumentos?.instrumento}</div>{p.url_archivo ? (<a href={p.url_archivo} target="_blank" rel="noreferrer" className="text-[10px] text-blue-500 hover:underline flex items-center gap-1 mt-1"><IconLink size={10}/> Ver</a>) : <span className="text-[10px] text-amber-500 mt-1 block">Sin link</span>}</div><button onClick={() => removeParticella(idx, p)} className="absolute top-1 right-1 text-slate-300 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity"><IconTrash size={14}/></button>
                        </div>
                    ))}
                    {particellas.length === 0 && <div className="col-span-full text-center py-4 text-xs text-slate-400 italic">No hay instrumentos cargados.</div>}
                </div>
            </div>

            <div className="flex justify-end gap-2 mt-6 pt-3 border-t border-indigo-100/50">
                <button onClick={onCancel} className="flex items-center gap-1 px-3 py-1.5 rounded text-slate-600 hover:bg-slate-100 text-sm font-medium"><IconX size={16}/> Cancelar</button>
                <button onClick={handleSaveFull} disabled={loading} className="flex items-center gap-1 px-4 py-1.5 rounded bg-indigo-600 text-white hover:bg-indigo-700 text-sm font-medium shadow-sm"><IconCheck size={16}/> Guardar Obra</button>
            </div>
        </div>
    );
}