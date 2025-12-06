import React, { useState, useEffect } from 'react';
import { IconTag, IconPlus, IconTrash, IconEdit, IconSearch, IconX, IconCheck, IconLoader } from '../../components/ui/Icons';

export default function TagsManager({ supabase, onClose }) {
    const [tags, setTags] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState("");
    
    const [editingId, setEditingId] = useState(null);
    const [tagName, setTagName] = useState('');

    useEffect(() => { fetchTags(); }, []);

    const fetchTags = async () => {
        setLoading(true);
        const { data } = await supabase.from('palabras_clave').select('*').order('tag');
        if (data) setTags(data);
        setLoading(false);
    };

    const handleSave = async () => {
        if (!tagName) return;
        setLoading(true);
        if (editingId) {
            await supabase.from('palabras_clave').update({ tag: tagName.trim() }).eq('id', editingId);
        } else {
            await supabase.from('palabras_clave').insert([{ tag: tagName.trim() }]);
        }
        setTagName('');
        setEditingId(null);
        await fetchTags();
        setLoading(false);
    };

    const handleDelete = async (id) => {
        if (!confirm("¿Eliminar etiqueta?")) return;
        setLoading(true);
        const { error } = await supabase.from('palabras_clave').delete().eq('id', id);
        if (error) alert("Error: " + error.message);
        else await fetchTags();
        setLoading(false);
    };

    const filtered = tags.filter(t => t.tag.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white w-full max-w-md rounded-xl shadow-2xl flex flex-col max-h-[85vh]">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-xl">
                    <h3 className="font-bold text-slate-700 flex items-center gap-2"><IconTag size={20}/> Palabras Clave</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><IconX size={24}/></button>
                </div>

                <div className="p-4 border-b border-slate-100 bg-indigo-50/30 flex gap-2 items-end">
                    <div className="flex-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Etiqueta</label>
                        <input 
                            type="text" className="w-full border border-slate-300 p-2 rounded text-sm outline-none focus:ring-2 focus:ring-indigo-500" 
                            placeholder="Ej: Obertura"
                            value={tagName} onChange={e => setTagName(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSave()}
                        />
                    </div>
                    {editingId && <button onClick={() => { setEditingId(null); setTagName(''); }} className="p-2 rounded border border-slate-300 bg-white text-slate-500 hover:bg-slate-50"><IconX size={18}/></button>}
                    <button onClick={handleSave} disabled={loading} className="p-2 rounded bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm">
                        {editingId ? <IconCheck size={18}/> : <IconPlus size={18}/>}
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                    <div className="relative mb-4">
                        <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                        <input type="text" placeholder="Buscar..." className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm outline-none" value={search} onChange={e => setSearch(e.target.value)}/>
                    </div>
                    <div className="space-y-2">
                        {filtered.map(t => (
                            <div key={t.id} className={`flex justify-between items-center p-3 rounded border transition-colors ${editingId === t.id ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-100'}`}>
                                <span className="font-bold text-slate-700 text-sm">{t.tag}</span>
                                <div className="flex gap-2">
                                    <button onClick={() => { setEditingId(t.id); setTagName(t.tag); }} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"><IconEdit size={16}/></button>
                                    <button onClick={() => handleDelete(t.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"><IconTrash size={16}/></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}