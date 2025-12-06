import React, { useState, useEffect } from 'react';
import { IconUsers, IconPlus, IconTrash, IconEdit, IconSearch, IconX, IconCheck, IconLoader, IconGlobe } from '../../components/ui/Icons';
import DateInput from '../../components/ui/DateInput';

// --- SUBCOMPONENTE AISLADO PARA EL FORMULARIO ---
const ComposerForm = ({ 
    formData, setFormData, handleSave, resetForm, loading, isEditing, paises 
}) => {
    return (
        <div className={`p-4 border-b border-slate-100 grid grid-cols-1 md:grid-cols-12 gap-3 items-end transition-all ${isEditing ? 'bg-indigo-50/30' : 'bg-white'}`}>
            
            <div className="md:col-span-3">
                <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Apellido*</label>
                <input 
                    key="apellido-input" // Clave estática para preservar foco
                    type="text" className="w-full border p-2 rounded text-sm outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Ej: Bach" 
                    value={formData.apellido} onChange={e => setFormData({...formData, apellido: e.target.value})}
                />
            </div>
            <div className="md:col-span-3">
                <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Nombre</label>
                <input 
                    key="nombre-input" // Clave estática para preservar foco
                    type="text" className="w-full border p-2 rounded text-sm outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Ej: Ludwig van" 
                    value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})}
                />
            </div>

            <div className="md:col-span-3">
                <DateInput label="Nacimiento" value={formData.fecha_nacimiento} onChange={v => setFormData({...formData, fecha_nacimiento: v})}/>
            </div>
            <div className="md:col-span-3">
                <DateInput label="Defunción" value={formData.fecha_defuncion} onChange={v => setFormData({...formData, fecha_defuncion: v})}/>
            </div>
            
            <div className="md:col-span-6">
                <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Nacionalidad</label>
                <select className="w-full border p-2 rounded text-sm outline-none focus:ring-2 focus:ring-indigo-500" 
                    value={formData.id_pais} onChange={e => setFormData({...formData, id_pais: e.target.value})}
                >
                    <option value="">-- Seleccionar --</option>
                    {paises.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
            </div>

            <div className="md:col-span-6">
                <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Biografía / Notas</label>
                <textarea 
                    key="bio-input" // Clave estática para preservar foco
                    className="w-full border p-2 rounded text-sm outline-none focus:ring-2 focus:ring-indigo-500 resize-none h-12" placeholder="..." 
                    value={formData.biografia} onChange={e => setFormData({...formData, biografia: e.target.value})}
                />
            </div>

            <div className="md:col-span-12 flex justify-end gap-2">
                {isEditing && <button onClick={resetForm} className="px-3 py-1 rounded border border-slate-300 bg-white text-slate-500 hover:bg-slate-50 text-sm">Cancelar</button>}
                <button onClick={handleSave} disabled={loading || !formData.apellido} className="px-4 py-1 rounded bg-indigo-600 text-white hover:bg-indigo-700 flex justify-center items-center shadow-sm text-sm">
                    {loading ? <IconLoader size={16} className="animate-spin"/> : (isEditing ? 'Actualizar' : 'Agregar')}
                </button>
            </div>
        </div>
    );
};
// --- FIN SUBCOMPONENTE ---

export default function ComposersManager({ supabase, onClose }) {
    const [composers, setComposers] = useState([]);
    const [paises, setPaises] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState("");
    
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({ 
        nombre: '', 
        apellido: '', 
        id_pais: '', 
        fecha_nacimiento: '', 
        fecha_defuncion: '',
        biografia: '' 
    });

    useEffect(() => {
        fetchComposers();
        fetchPaises();
    }, []);

    const fetchPaises = async () => {
        const { data } = await supabase.from('paises').select('id, nombre').order('nombre');
        if (data) setPaises(data);
    };

    const fetchComposers = async () => {
        setLoading(true);
        const { data } = await supabase.from('compositores').select('*, paises(nombre)').order('apellido');
        if (data) setComposers(data);
        setLoading(false);
    };

    const handleSave = async () => {
        if (!formData.apellido) return alert("El apellido es obligatorio");
        setLoading(true);
        
        const payload = { 
            nombre: formData.nombre.trim(), 
            apellido: formData.apellido.trim(),
            id_pais: formData.id_pais ? parseInt(formData.id_pais, 10) : null,
            fecha_nacimiento: formData.fecha_nacimiento || null,
            fecha_defuncion: formData.fecha_defuncion || null,
            biografia: formData.biografia || null
        };

        try {
            if (editingId) {
                const { error } = await supabase.from('compositores').update(payload).eq('id', editingId);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('compositores').insert([payload]);
                if (error) throw error;
            }
        } catch (error) {
            alert("Error al guardar: " + error.message);
            setLoading(false);
            return;
        }
        
        resetForm();
        await fetchComposers();
        setLoading(false);
    };

    const handleDelete = async (id) => {
        if (!confirm("¿Eliminar compositor?")) return;
        setLoading(true);
        const { error } = await supabase.from('compositores').delete().eq('id', id);
        if (error) alert("Error al eliminar (probablemente esté en uso): " + error.message);
        else await fetchComposers();
        setLoading(false);
    };

    const startEdit = (c) => {
        setEditingId(c.id);
        setFormData({ 
            nombre: c.nombre || '', 
            apellido: c.apellido || '',
            fecha_nacimiento: c.fecha_nacimiento || '',
            fecha_defuncion: c.fecha_defuncion || '',
            id_pais: c.id_pais ? c.id_pais.toString() : '',
            biografia: c.biografia || ''
        });
    };

    const resetForm = () => {
        setEditingId(null);
        setFormData({ nombre: '', apellido: '', id_pais: '', fecha_nacimiento: '', fecha_defuncion: '', biografia: '' });
    };

    const filtered = composers.filter(c => 
        `${c.apellido} ${c.nombre}`.toLowerCase().includes(search.toLowerCase())
    );

    const isEditing = !!editingId;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white w-full max-w-4xl rounded-xl shadow-2xl flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-xl shrink-0">
                    <h3 className="font-bold text-slate-700 flex items-center gap-2"><IconUsers size={20}/> Gestor de Compositores</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><IconX size={24}/></button>
                </div>

                {/* --- AQUI SE RENDERIZA EL FORMULARIO AISLADO --- */}
                <ComposerForm
                    formData={formData}
                    setFormData={setFormData}
                    handleSave={handleSave}
                    resetForm={resetForm}
                    loading={loading}
                    isEditing={isEditing}
                    paises={paises}
                />

                {/* Lista */}
                <div className="flex-1 overflow-y-auto p-4">
                    <div className="relative mb-4">
                        <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                        <input 
                            type="text" placeholder="Buscar compositor..." 
                            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-400"
                            value={search} onChange={e => setSearch(e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        {!composers.length && loading ? <div className="text-center p-4 text-indigo-600"><IconLoader className="animate-spin inline"/></div> : null}
                        
                        {filtered.map(c => (
                            <div key={c.id} className={`flex justify-between items-start p-3 rounded border transition-colors ${editingId === c.id ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-100 hover:border-indigo-200'}`}>
                                <div>
                                    <div className="font-bold text-slate-800">{c.apellido}, {c.nombre}</div>
                                    <div className="text-xs text-slate-500 mt-1 flex flex-wrap gap-x-3 gap-y-1">
                                        <span className="flex items-center gap-1"><IconGlobe size={12}/> {c.paises?.nombre || 'S/D'}</span>
                                        {c.fecha_nacimiento && <span>Nac: {c.fecha_nacimiento.split('-').reverse().join('/')}</span>}
                                        {c.fecha_defuncion && <span>Def: {c.fecha_defuncion.split('-').reverse().join('/')}</span>}
                                    </div>
                                </div>
                                <div className="flex gap-2 shrink-0">
                                    <button onClick={() => startEdit(c)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"><IconEdit size={16}/></button>
                                    <button onClick={() => handleDelete(c.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"><IconTrash size={16}/></button>
                                </div>
                            </div>
                        ))}
                        {filtered.length === 0 && !loading && <div className="text-center text-slate-400 text-xs italic py-4">No se encontraron resultados.</div>}
                    </div>
                </div>
            </div>
        </div>
    );
}