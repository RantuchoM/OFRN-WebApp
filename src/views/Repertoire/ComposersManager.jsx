import React, { useState, useEffect, useRef } from 'react';
import { 
    IconUsers, IconPlus, IconTrash, IconEdit, IconSearch, 
    IconX, IconCheck, IconLoader, IconGlobe, IconMusic, 
    IconArrowLeft, IconAlertTriangle, IconChevronDown 
} from '../../components/ui/Icons';
import DateInput from '../../components/ui/DateInput';

// --- 1. SUB-COMPONENTE: SELECTOR CON BÚSQUEDA ---
const SearchableSelect = ({ label, options, value, onChange, placeholder, colorClass, iconColorClass }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState("");
    const wrapperRef = useRef(null);

    // Encontrar el item seleccionado para mostrar su nombre
    const selectedItem = options.find(o => o.id.toString() === value.toString());

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Sincronizar input con selección externa
    useEffect(() => {
        if (selectedItem) {
            setQuery(`${selectedItem.apellido}, ${selectedItem.nombre}`);
        } else if (!value) {
            setQuery("");
        }
    }, [selectedItem, value]);

    const filteredOptions = options.filter(item => 
        `${item.apellido} ${item.nombre}`.toLowerCase().includes(query.toLowerCase())
    );

    return (
        <div className="relative" ref={wrapperRef}>
            <label className={`text-[10px] font-bold uppercase mb-1 block ${colorClass}`}>
                {label}
            </label>
            <div className="relative">
                <input
                    type="text"
                    className={`w-full p-2 pr-8 border rounded text-sm outline-none focus:ring-2 transition-shadow ${
                        isOpen ? `ring-2 ${iconColorClass.replace('text-', 'ring-')}` : 'border-slate-200'
                    }`}
                    placeholder={placeholder}
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setIsOpen(true);
                        if(value) onChange(""); // Limpiar selección al escribir para obligar a re-seleccionar
                    }}
                    onFocus={() => setIsOpen(true)}
                />
                <div className={`absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none ${iconColorClass}`}>
                    {isOpen ? <IconSearch size={14}/> : <IconChevronDown size={14}/>}
                </div>
            </div>

            {/* Dropdown Flotante */}
            {isOpen && (
                <div className="absolute top-full left-0 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-48 overflow-y-auto z-50 custom-scrollbar">
                    {filteredOptions.length > 0 ? (
                        filteredOptions.map(opt => (
                            <div 
                                key={opt.id}
                                onClick={() => {
                                    onChange(opt.id);
                                    setIsOpen(false);
                                    setQuery(`${opt.apellido}, ${opt.nombre}`);
                                }}
                                className="p-2 text-sm hover:bg-slate-50 cursor-pointer border-b border-slate-50 last:border-0 text-slate-700"
                            >
                                <span className="font-bold">{opt.apellido}</span>, {opt.nombre}
                            </div>
                        ))
                    ) : (
                        <div className="p-3 text-xs text-slate-400 text-center italic">
                            No hay coincidencias
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// --- 2. MODAL DE FUSIÓN (Merge) ---
const MergeComposersModal = ({ isOpen, onClose, composers, supabase, onMergeSuccess }) => {
    const [sourceId, setSourceId] = useState("");
    const [targetId, setTargetId] = useState("");
    const [merging, setMerging] = useState(false);

    if (!isOpen) return null;

    // Ordenar alfabéticamente para facilitar la búsqueda
    const sortedComposers = [...composers].sort((a, b) => a.apellido.localeCompare(b.apellido));

    const handleMerge = async () => {
        if (!sourceId || !targetId) return alert("Selecciona ambos compositores.");
        if (sourceId === targetId) return alert("No puedes fusionar un compositor consigo mismo.");

        if (!confirm("⚠️ ESTA ACCIÓN ES IRREVERSIBLE.\n\nSe eliminará el compositor duplicado y todas sus obras pasarán al compositor destino.\n\n¿Estás seguro?")) return;

        setMerging(true);
        try {
            // 1. Actualizar referencias directas en tabla 'obras'
            const { error: errArreglador } = await supabase
                .from('obras')
                .update({ id_arreglador: targetId })
                .eq('id_arreglador', sourceId);
            
            if (errArreglador) throw errArreglador;

            // 2. Gestionar relaciones en 'obras_compositores'
            const { data: sourceRels, error: errGet } = await supabase
                .from('obras_compositores')
                .select('*')
                .eq('id_compositor', sourceId);

            if (errGet) throw errGet;

            for (const rel of sourceRels) {
                // Verificar si el destino YA tiene esa misma obra/rol
                const { data: existing } = await supabase
                    .from('obras_compositores')
                    .select('id')
                    .eq('id_compositor', targetId)
                    .eq('id_obra', rel.id_obra)
                    .eq('rol', rel.rol)
                    .maybeSingle();

                if (existing) {
                    // Si ya existe, borramos la del duplicado
                    await supabase.from('obras_compositores').delete().eq('id', rel.id);
                } else {
                    // Si no existe, transferimos
                    await supabase.from('obras_compositores').update({ id_compositor: targetId }).eq('id', rel.id);
                }
            }

            // 3. Eliminar el duplicado
            const { error: errDel } = await supabase
                .from('compositores')
                .delete()
                .eq('id', sourceId);

            if (errDel) throw errDel;

            alert("✅ Fusión completada con éxito.");
            onMergeSuccess();
            onClose();
            setSourceId("");
            setTargetId("");

        } catch (error) {
            console.error(error);
            alert("❌ Error al fusionar: " + error.message);
        } finally {
            setMerging(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white w-full max-w-md rounded-xl shadow-2xl p-6 border border-slate-200 flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center mb-4 shrink-0">
                    <h3 className="font-black text-slate-800 text-lg uppercase flex items-center gap-2">
                        <IconUsers className="text-purple-600"/> Fusión de Duplicados
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><IconX size={20}/></button>
                </div>

                <div className="space-y-4 bg-purple-50 p-4 rounded-xl border border-purple-100 overflow-visible">
                    <p className="text-xs text-purple-800 mb-2 flex gap-2">
                        <IconAlertTriangle size={16} className="shrink-0"/>
                        Selecciona el duplicado (se borrará) y el destino (se queda).
                    </p>

                    {/* USAMOS EL COMPONENTE SEARCHABLE SELECT AQUÍ */}
                    <SearchableSelect 
                        label="1. Eliminar (Duplicado)"
                        placeholder="Buscar duplicado..."
                        options={sortedComposers.filter(c => c.id.toString() !== targetId)}
                        value={sourceId}
                        onChange={setSourceId}
                        colorClass="text-red-500"
                        iconColorClass="text-red-500"
                    />

                    <div className="flex justify-center text-slate-300 font-bold text-xs py-1">
                        ⬇️ SE FUSIONA EN ⬇️
                    </div>

                    <SearchableSelect 
                        label="2. Mantener (Correcto)"
                        placeholder="Buscar destino..."
                        options={sortedComposers.filter(c => c.id.toString() !== sourceId)}
                        value={targetId}
                        onChange={setTargetId}
                        colorClass="text-emerald-600"
                        iconColorClass="text-emerald-500"
                    />
                </div>

                <div className="flex justify-end gap-2 mt-6 shrink-0">
                    <button onClick={onClose} className="px-4 py-2 text-sm text-slate-500 hover:bg-slate-100 rounded-lg font-bold">Cancelar</button>
                    <button 
                        onClick={handleMerge}
                        disabled={merging || !sourceId || !targetId}
                        className="px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 font-bold shadow-sm flex items-center gap-2"
                    >
                        {merging ? <IconLoader className="animate-spin" size={14}/> : <IconCheck size={14}/>}
                        {merging ? "Fusionando..." : "Confirmar Fusión"}
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- 3. SUBCOMPONENTE: FORMULARIO DE DETALLE ---
const ComposerDetail = ({ 
    formData, setFormData, handleSave, handleDelete, isEditing, paises, loading, works 
}) => {
    return (
        <div className="flex flex-col h-full overflow-hidden bg-white">
            {/* Formulario Superior */}
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 shrink-0 overflow-y-auto max-h-[60%]">
                <h4 className="text-sm font-bold text-slate-700 uppercase mb-4 flex items-center gap-2">
                    {isEditing ? <><IconEdit size={16} className="text-indigo-500"/> Editar Compositor</> : <><IconPlus size={16} className="text-emerald-500"/> Nuevo Compositor</>}
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Apellido*</label>
                        <input 
                            type="text" className="w-full border p-2 rounded text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white" 
                            placeholder="Ej: Bach" 
                            value={formData.apellido} onChange={e => setFormData({...formData, apellido: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Nombre</label>
                        <input 
                            type="text" className="w-full border p-2 rounded text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white" 
                            placeholder="Ej: Johann Sebastian" 
                            value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})}
                        />
                    </div>
                    
                    <div>
                        <DateInput label="Nacimiento" value={formData.fecha_nacimiento} onChange={v => setFormData({...formData, fecha_nacimiento: v})}/>
                    </div>
                    <div>
                        <DateInput label="Defunción" value={formData.fecha_defuncion} onChange={v => setFormData({...formData, fecha_defuncion: v})}/>
                    </div>

                    <div className="md:col-span-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Nacionalidad</label>
                        <select 
                            className="w-full border p-2 rounded text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white" 
                            value={formData.id_pais} onChange={e => setFormData({...formData, id_pais: e.target.value})}
                        >
                            <option value="">-- Seleccionar --</option>
                            {paises.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                        </select>
                    </div>

                    <div className="md:col-span-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Biografía / Notas</label>
                        <textarea 
                            className="w-full border p-2 rounded text-sm outline-none focus:ring-2 focus:ring-indigo-500 resize-none h-20 bg-white" 
                            placeholder="Información relevante..." 
                            value={formData.biografia} onChange={e => setFormData({...formData, biografia: e.target.value})}
                        />
                    </div>
                </div>

                <div className="flex justify-between items-center pt-2">
                    {isEditing ? (
                        <button onClick={handleDelete} className="text-red-500 hover:text-red-700 text-xs font-bold flex items-center gap-1 px-2 py-1 rounded hover:bg-red-50">
                            <IconTrash size={14}/> Eliminar
                        </button>
                    ) : <div></div>}
                    
                    <button 
                        onClick={handleSave} 
                        disabled={loading || !formData.apellido} 
                        className="px-6 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 flex items-center gap-2 shadow-sm text-sm font-bold transition-all disabled:opacity-50"
                    >
                        {loading ? <IconLoader size={16} className="animate-spin"/> : <IconCheck size={16}/>}
                        {isEditing ? 'Guardar Cambios' : 'Crear Compositor'}
                    </button>
                </div>
            </div>

            {/* Lista de Obras Relacionadas */}
            {isEditing && (
                <div className="flex-1 overflow-hidden flex flex-col border-t border-slate-200">
                    <div className="p-3 bg-slate-50 border-b border-slate-100 flex justify-between items-center shrink-0">
                        <h4 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                            <IconMusic size={14}/> Obras vinculadas ({works.length})
                        </h4>
                    </div>
                    <div className="flex-1 overflow-y-auto p-0">
                        {works.length === 0 ? (
                            <div className="p-8 text-center text-slate-400 text-xs italic">
                                No hay obras registradas para este músico.
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {works.map((work, idx) => (
                                    <div key={idx} className="p-3 hover:bg-indigo-50/50 flex items-center gap-3 transition-colors group">
                                        <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center shrink-0 font-bold text-xs">
                                            {idx + 1}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-bold text-slate-700 text-sm truncate" dangerouslySetInnerHTML={{__html: work.obras?.titulo}}></div>
                                            <div className="text-[10px] text-slate-500 flex gap-2 mt-0.5">
                                                {work.rol === 'compositor' && <span className="bg-indigo-100 text-indigo-700 px-1.5 rounded font-bold">Compositor</span>}
                                                {work.rol === 'arreglador' && <span className="bg-emerald-100 text-emerald-700 px-1.5 rounded font-bold">Arreglador</span>}
                                                <span className="truncate text-slate-400 font-mono">{work.obras?.instrumentacion}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

// --- 4. COMPONENTE PRINCIPAL ---
export default function ComposersManager({ supabase, onClose }) {
    const [composers, setComposers] = useState([]);
    const [paises, setPaises] = useState([]);
    const [loading, setLoading] = useState(false);
    const [worksLoading, setWorksLoading] = useState(false);
    const [search, setSearch] = useState("");
    const [showMergeModal, setShowMergeModal] = useState(false);
    
    // Estado de selección
    const [selectedId, setSelectedId] = useState(null);
    const [relatedWorks, setRelatedWorks] = useState([]);

    const [formData, setFormData] = useState({ 
        nombre: '', apellido: '', id_pais: '', fecha_nacimiento: '', fecha_defuncion: '', biografia: '' 
    });

    useEffect(() => {
        fetchComposers();
        fetchPaises();
    }, []);

    // Cargar obras cuando se selecciona un compositor
    useEffect(() => {
        if (selectedId) {
            fetchRelatedWorks(selectedId);
        } else {
            setRelatedWorks([]);
        }
    }, [selectedId]);

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

    const fetchRelatedWorks = async (composerId) => {
        setWorksLoading(true);
        const { data } = await supabase
            .from('obras_compositores')
            .select(`
                rol,
                obras (id, titulo, instrumentacion)
            `)
            .eq('id_compositor', composerId);
        
        if (data) setRelatedWorks(data);
        setWorksLoading(false);
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
            if (selectedId) {
                const { error } = await supabase.from('compositores').update(payload).eq('id', selectedId);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('compositores').insert([payload]);
                if (error) throw error;
                resetForm(); // Limpiar solo si es nuevo
            }
            await fetchComposers(); // Recargar lista
        } catch (error) {
            alert("Error: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!selectedId) return;
        if (!confirm("¿Eliminar compositor? Esto podría fallar si tiene obras vinculadas.")) return;
        
        setLoading(true);
        const { error } = await supabase.from('compositores').delete().eq('id', selectedId);
        
        if (error) {
            alert("No se puede eliminar porque tiene obras vinculadas. Usa la opción 'Fusionar' si es un duplicado.");
        } else {
            resetForm();
            await fetchComposers();
        }
        setLoading(false);
    };

    const selectComposer = (c) => {
        setSelectedId(c.id);
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
        setSelectedId(null);
        setFormData({ nombre: '', apellido: '', id_pais: '', fecha_nacimiento: '', fecha_defuncion: '', biografia: '' });
        setRelatedWorks([]);
    };

    const filtered = composers.filter(c => 
        `${c.apellido} ${c.nombre}`.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white w-full max-w-6xl h-[85vh] rounded-2xl shadow-2xl flex overflow-hidden border border-slate-200">
                
                {/* --- PANEL IZQUIERDO: LISTA --- */}
                <div className={`w-full md:w-1/3 border-r border-slate-200 flex flex-col bg-slate-50 ${selectedId ? 'hidden md:flex' : 'flex'}`}>
                    {/* Header Lista */}
                    <div className="p-4 border-b border-slate-200 bg-white shrink-0">
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="font-black text-slate-700 text-lg uppercase tracking-tight flex items-center gap-2">
                                <IconUsers className="text-indigo-600"/> Compositores
                            </h3>
                            <button onClick={onClose} className="md:hidden text-slate-400 hover:text-slate-600"><IconX size={24}/></button>
                        </div>
                        <div className="relative">
                            <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                            <input 
                                type="text" placeholder="Buscar..." 
                                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-400 shadow-sm"
                                value={search} onChange={e => setSearch(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Botón Nuevo (Móvil) */}
                    <button 
                        onClick={resetForm}
                        className="mx-4 mt-3 mb-1 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold shadow-sm hover:bg-indigo-700 flex items-center justify-center gap-2 md:hidden"
                    >
                        <IconPlus size={16}/> Crear Nuevo
                    </button>

                    {/* Lista Scrollable */}
                    <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                        {filtered.map(c => (
                            <div 
                                key={c.id} 
                                onClick={() => selectComposer(c)}
                                className={`p-3 rounded-lg cursor-pointer transition-all border ${
                                    selectedId === c.id 
                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-md transform scale-[1.02]' 
                                    : 'bg-white text-slate-700 border-transparent hover:bg-white hover:border-slate-200 hover:shadow-sm'
                                }`}
                            >
                                <div className="font-bold truncate">{c.apellido}, {c.nombre}</div>
                                <div className={`text-xs flex items-center gap-2 mt-1 ${selectedId === c.id ? 'text-indigo-200' : 'text-slate-400'}`}>
                                    {c.paises && <span className="flex items-center gap-1"><IconGlobe size={10}/> {c.paises.nombre}</span>}
                                    {c.fecha_nacimiento && <span>• {c.fecha_nacimiento.substring(0,4)}</span>}
                                </div>
                            </div>
                        ))}
                        {filtered.length === 0 && !loading && <div className="text-center p-8 text-slate-400 text-sm">Sin resultados</div>}
                    </div>

                    {/* Botón Nuevo y Fusionar (Desktop - Footer) */}
                    <div className="p-3 border-t border-slate-200 bg-white hidden md:block space-y-2">
                        <button 
                            onClick={resetForm}
                            className={`w-full py-3 rounded-xl border-2 border-dashed border-indigo-200 text-indigo-600 font-bold hover:bg-indigo-50 hover:border-indigo-300 transition-all flex items-center justify-center gap-2 ${!selectedId ? 'bg-indigo-50 border-indigo-400 ring-2 ring-indigo-200 ring-offset-2' : ''}`}
                        >
                            <IconPlus size={18}/> {selectedId ? 'Crear Nuevo Compositor' : 'Creando Nuevo...'}
                        </button>
                        
                        <button 
                            onClick={() => setShowMergeModal(true)}
                            className="w-full py-2 bg-purple-50 text-purple-700 rounded-lg text-xs font-bold hover:bg-purple-100 flex items-center justify-center gap-2 border border-purple-100"
                        >
                            <IconUsers size={14}/> Fusionar Duplicados
                        </button>
                    </div>
                </div>

                {/* --- PANEL DERECHO: DETALLE --- */}
                <div className={`w-full md:w-2/3 bg-white flex flex-col h-full ${!selectedId && 'hidden md:flex'}`}>
                    {/* Header Móvil para volver */}
                    <div className="md:hidden p-2 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
                        <button onClick={() => setSelectedId(null)} className="p-2 text-slate-500"><IconArrowLeft/></button>
                        <span className="font-bold text-slate-700">{selectedId ? 'Editar' : 'Nuevo'}</span>
                    </div>

                    <div className="flex justify-end p-2 absolute top-2 right-2 z-10 md:block hidden">
                        <button onClick={onClose} className="p-2 bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors">
                            <IconX size={20}/>
                        </button>
                    </div>

                    {/* Contenido del Formulario */}
                    <ComposerDetail 
                        formData={formData}
                        setFormData={setFormData}
                        handleSave={handleSave}
                        handleDelete={handleDelete}
                        isEditing={!!selectedId}
                        paises={paises}
                        loading={loading}
                        works={relatedWorks}
                    />
                </div>

            </div>

            {/* Modal de Fusión */}
            <MergeComposersModal 
                isOpen={showMergeModal}
                onClose={() => setShowMergeModal(false)}
                composers={composers}
                supabase={supabase}
                onMergeSuccess={() => {
                    fetchComposers();
                    resetForm();
                }}
            />
        </div>
    );
}