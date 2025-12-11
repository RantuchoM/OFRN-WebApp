// src/views/Giras/GiraForm.jsx
import React, { useState, useEffect, useRef } from 'react';
import { 
    IconPlus, IconX, IconCheck, IconTrash, IconMusic, IconMapPin, 
    IconClock, IconCalendar, IconEdit, IconRefresh, 
    IconUsers, IconLayers, IconLoader, IconAlertTriangle, IconChevronDown
} from '../../components/ui/Icons';
import LocationMultiSelect from '../../components/filters/LocationMultiSelect';
import DateInput from '../../components/ui/DateInput';
import TimeInput from '../../components/ui/TimeInput';

// --- COMPONENTE INTERNO: MultiSelect Dropdown (Estilo Checklist) ---
const SourceMultiSelect = ({ title, options, selectedSet, onToggle, color = "indigo", icon: Icon }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    // Cerrar al hacer clic fuera
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        if (isOpen) document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isOpen]);

    const count = selectedSet.size;

    return (
        <div className="relative w-full" ref={containerRef}>
            <button 
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full flex justify-between items-center px-3 py-2 text-xs font-bold uppercase border rounded-lg transition-all 
                    ${isOpen 
                        ? `border-${color}-400 ring-1 ring-${color}-400 bg-${color}-50 text-${color}-900` 
                        : count > 0 
                            ? `bg-${color}-50 text-${color}-800 border-${color}-200 hover:border-${color}-300` 
                            : 'bg-white text-slate-500 border-slate-300 hover:border-slate-400'
                    }`}
            >
                <div className="flex items-center gap-2 truncate">
                    {Icon && <Icon size={14} className={count > 0 ? `text-${color}-600` : "text-slate-400"}/>}
                    <span className="truncate">{title}</span>
                </div>
                <div className="flex items-center gap-2">
                    {count > 0 && (
                        <span className={`px-1.5 py-0.5 rounded-full text-[9px] bg-${color}-200 text-${color}-800`}>
                            {count}
                        </span>
                    )}
                    <IconChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-180' : ''} opacity-50`}/>
                </div>
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto p-1 animate-in fade-in zoom-in-95 duration-100">
                    {options.length === 0 ? (
                        <div className="p-2 text-center text-xs text-slate-400 italic">No hay opciones</div>
                    ) : (
                        <div className="space-y-0.5">
                            {options.map((opt) => {
                                const isSelected = selectedSet.has(opt.value);
                                return (
                                    <div 
                                        key={opt.value} 
                                        onClick={(e) => {
                                            e.stopPropagation(); // Evita cerrar el dropdown
                                            onToggle(opt.value, opt.label);
                                        }}
                                        className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer text-xs select-none transition-colors ${isSelected ? `bg-${color}-50 text-${color}-900 font-medium` : 'hover:bg-slate-50 text-slate-600'}`}
                                    >
                                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${isSelected ? `bg-${color}-500 border-${color}-500` : 'border-slate-300 bg-white'}`}>
                                            {isSelected && <IconCheck size={12} className="text-white"/>}
                                        </div>
                                        <span className="truncate">{opt.label}</span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default function GiraForm({ 
    supabase, 
    giraId,   
    formData, 
    setFormData, 
    onCancel, 
    onSave, 
    onRefresh, 
    loading, 
    isNew = false,
    locationsList = [], 
    selectedLocations = new Set(), 
    setSelectedLocations,
    ensemblesList = [],
    allIntegrantes = [],
    selectedSources = [],
    setSelectedSources,
    selectedStaff = [],
    setSelectedStaff
}) {
    // --- ESTADOS CONCIERTOS ---
    const [concerts, setConcerts] = useState([]);
    const [loadingConcerts, setLoadingConcerts] = useState(false);
    const [locacionesFull, setLocacionesFull] = useState([]); 
    const [newConcert, setNewConcert] = useState({ fecha: '', hora: '20:00', id_locacion: '' });
    const [conciertoTypeId, setConciertoTypeId] = useState(null);
    const [editingConcertId, setEditingConcertId] = useState(null);

    // --- ESTADOS TRASLADO ---
    const [isShifting, setIsShifting] = useState(false);
    const [shiftNewDate, setShiftNewDate] = useState('');
    const [shiftLoading, setShiftLoading] = useState(false);

    // --- ESTADO LOCAL PARA STAFF ---
    const [staffRole, setStaffRole] = useState('director');
    const [staffId, setStaffId] = useState('');

    const FAMILIES = ["Cuerdas", "Maderas", "Metales", "Percusión", "Teclados", "Vocal"];

    useEffect(() => {
        if (!isNew && giraId) {
            fetchConcertsData();
        }
    }, [giraId, isNew]);

    const fetchConcertsData = async () => {
        setLoadingConcerts(true);
        const { data: types } = await supabase.from('tipos_evento').select('id, nombre');
        const typeId = types?.find(t => t.nombre.toLowerCase().includes('concierto'))?.id;
        setConciertoTypeId(typeId);

        const { data: locs } = await supabase.from('locaciones').select('id, nombre, localidades(localidad)').order('nombre');
        setLocacionesFull(locs || []);

        if (typeId) {
            const { data: evts } = await supabase
                .from('eventos')
                .select('id, fecha, hora_inicio, id_locacion, locaciones(nombre)')
                .eq('id_gira', giraId)
                .eq('id_tipo_evento', typeId)
                .order('fecha');
            setConcerts(evts || []);
        }
        setLoadingConcerts(false);
    };

    // --- LÓGICA DE SELECCIÓN DE FUENTES (Check/Uncheck automático) ---
    
    // Sets auxiliares para saber qué está marcado en cada dropdown
    const selectedEnsemblesIds = new Set(selectedSources.filter(s => s.tipo === 'ENSAMBLE').map(s => s.valor_id));
    const selectedFamiliesIds = new Set(selectedSources.filter(s => s.tipo === 'FAMILIA').map(s => s.valor_texto));
    const excludedEnsemblesIds = new Set(selectedSources.filter(s => s.tipo === 'EXCL_ENSAMBLE').map(s => s.valor_id));

    const toggleSource = (tipo, value, label) => {
        const isId = tipo !== 'FAMILIA'; 
        const exists = selectedSources.some(s => 
            s.tipo === tipo && (isId ? s.valor_id === value : s.valor_texto === value)
        );

        if (exists) {
            // REMOVER
            setSelectedSources(prev => prev.filter(s => 
                !(s.tipo === tipo && (isId ? s.valor_id === value : s.valor_texto === value))
            ));
        } else {
            // AGREGAR
            const newItem = { tipo, label };
            if (isId) newItem.valor_id = value;
            else newItem.valor_texto = value;
            setSelectedSources(prev => [...prev, newItem]);
        }
    };

    // --- HANDLERS CONCIERTOS (Sin cambios) ---
    const handleSaveConcert = async () => {
        if (!newConcert.fecha || !conciertoTypeId) return alert("Fecha requerida");
        setLoadingConcerts(true);
        const payload = {
            id_gira: giraId, id_tipo_evento: conciertoTypeId,
            fecha: newConcert.fecha, hora_inicio: newConcert.hora, hora_fin: newConcert.hora, 
            id_locacion: newConcert.id_locacion || null, descripcion: 'Concierto Principal'
        };
        if (editingConcertId) {
            const { data, error } = await supabase.from('eventos').update(payload).eq('id', editingConcertId).select('id, fecha, hora_inicio, id_locacion, locaciones(nombre)').single();
            if (!error) {
                setConcerts(concerts.map(c => c.id === editingConcertId ? data : c));
                handleCancelConcertEdit();
            }
        } else {
            const { data, error } = await supabase.from('eventos').insert([payload]).select('id, fecha, hora_inicio, id_locacion, locaciones(nombre)').single();
            if (!error) {
                setConcerts([...concerts, data]);
                setNewConcert({ ...newConcert, id_locacion: '' });
            }
        }
        setLoadingConcerts(false);
    };

    const handleEditConcertClick = (concert) => {
        setNewConcert({ fecha: concert.fecha, hora: concert.hora_inicio, id_locacion: concert.id_locacion || '' });
        setEditingConcertId(concert.id);
    };
    const handleCancelConcertEdit = () => {
        setNewConcert({ fecha: '', hora: '20:00', id_locacion: '' });
        setEditingConcertId(null);
    };
    const handleDeleteConcert = async (id) => {
        if (!confirm("¿Borrar este concierto?")) return;
        setLoadingConcerts(true);
        await supabase.from('eventos').delete().eq('id', id);
        setConcerts(concerts.filter(c => c.id !== id));
        if (editingConcertId === id) handleCancelConcertEdit();
        setLoadingConcerts(false);
    };

    // --- HANDLERS TRASLADO Y LOCALIDADES (Sin cambios) ---
    const handleShiftProgram = async () => {
        if (!shiftNewDate) return alert("Selecciona la nueva fecha de inicio");
        const oldStart = new Date(formData.fecha_desde);
        const newStart = new Date(shiftNewDate);
        const diffTime = newStart - oldStart;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays === 0) return alert("La fecha es la misma.");
        if (!confirm(`¿Mover toda la gira ${diffDays} días?\n\nNueva fecha: ${shiftNewDate}`)) return;
        setShiftLoading(true);
        try {
            const { error } = await supabase.functions.invoke('shift-program', { body: { programId: giraId, daysShift: diffDays } });
            if (error) throw error;
            await supabase.functions.invoke('manage-drive', { body: { action: 'sync_program', programId: giraId } });
            alert("Gira trasladada con éxito.");
            if (onRefresh) onRefresh(); else onCancel(); 
        } catch (err) { alert("Error: " + err.message); } finally { setShiftLoading(false); setIsShifting(false); }
    };

    const removeLocation = (locId) => {
        const newSet = new Set(selectedLocations);
        newSet.delete(locId);
        setSelectedLocations(newSet);
    };

    // --- HANDLERS STAFF ---
    const addStaff = () => {
        if (!staffId) return;
        const idInt = parseInt(staffId);
        const person = allIntegrantes.find(i => i.value === idInt);
        if (!person) return;
        const exists = selectedStaff.some(s => s.id_integrante === idInt && s.rol === staffRole);
        if (!exists) {
            setSelectedStaff([...selectedStaff, { id_integrante: idInt, rol: staffRole, label: person.label }]);
        }
        setStaffId('');
    };
    const removeStaff = (index) => {
        const newStaff = [...selectedStaff];
        newStaff.splice(index, 1);
        setSelectedStaff(newStaff);
    };

    return (
        <div className={`p-4 rounded-xl border shadow-sm animate-in fade-in zoom-in-95 duration-200 ${isNew ? 'bg-indigo-50 border-indigo-200' : 'bg-white ring-2 ring-indigo-500 border-indigo-500 z-10 relative'}`}>
            
            {/* HEADER */}
            <div className="flex justify-between items-center mb-4 border-b border-indigo-100 pb-2">
                <h3 className="text-indigo-900 font-bold flex items-center gap-2">
                    {isNew ? <><IconPlus size={18}/> Nuevo Programa</> : <><IconEdit size={18}/> Editando Programa</>}
                </h3>
                {!isNew && !isShifting && (
                    <button onClick={() => setIsShifting(true)} className="text-xs bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full border border-indigo-100 hover:bg-indigo-100 flex items-center gap-1 transition-colors">
                        <IconCalendar size={14}/> Trasladar Gira
                    </button>
                )}
            </div>

            {/* TRASLADO */}
            {isShifting && (
                 <div className="mb-6 bg-amber-50 border border-amber-200 p-4 rounded-lg animate-in slide-in-from-top-2">
                    <h4 className="text-amber-800 font-bold text-sm mb-2 flex items-center gap-2"><IconRefresh size={16}/> Trasladar Gira Completa</h4>
                    <div className="flex items-end gap-3">
                         <div className="flex-1"><DateInput label="Nueva Fecha Inicio" value={shiftNewDate} onChange={setShiftNewDate} /></div>
                         <button onClick={handleShiftProgram} disabled={shiftLoading} className="px-3 py-1 bg-amber-600 text-white text-xs font-bold rounded mb-1">{shiftLoading ? '...' : 'Confirmar'}</button>
                         <button onClick={() => setIsShifting(false)} className="px-3 py-1 bg-white border border-amber-200 text-amber-700 text-xs rounded mb-1">Cancelar</button>
                    </div>
                 </div>
            )}
            
            {/* DATOS GENERALES */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-8">
                    <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Nombre Interno</label>
                    <input type="text" className="w-full border border-slate-300 p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none bg-white font-medium text-lg" value={formData.nombre_gira} onChange={(e) => setFormData({...formData, nombre_gira: e.target.value})}/>
                </div>
                <div className="md:col-span-4">
                    <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Tipo de Programa</label>
                    <select className="w-full border border-slate-300 p-2 rounded bg-white h-[46px]" value={formData.tipo || 'Sinfónico'} onChange={(e) => setFormData({...formData, tipo: e.target.value})}>
                        <option value="Sinfónico">Sinfónico</option>
                        <option value="Camerata Filarmónica">Camerata Filarmónica</option>
                        <option value="Ensamble">Ensamble</option>
                    </select>
                </div>
                <div className="md:col-span-3">
                    <DateInput label="Fecha Inicio" value={formData.fecha_desde} onChange={(val) => setFormData({...formData, fecha_desde: val})}/>
                </div>
                <div className="md:col-span-3">
                    <DateInput label="Fecha Fin" value={formData.fecha_hasta} onChange={(val) => setFormData({...formData, fecha_hasta: val})}/>
                </div>
                <div className="md:col-span-6">
                    <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Zona</label>
                    <input type="text" className="w-full border border-slate-300 p-2 rounded bg-white" value={formData.zona || ''} onChange={(e) => setFormData({...formData, zona: e.target.value})}/>
                </div>
                
                {/* LOCALIDADES */}
                <div className="md:col-span-12 pt-2 border-t border-slate-100 mt-2">
                    <LocationMultiSelect locations={locationsList} selectedIds={selectedLocations} onChange={setSelectedLocations} />
                    <div className="flex flex-wrap gap-2 mt-2">
                        {Array.from(selectedLocations).map(locId => {
                            const locName = locationsList.find(l => l.id === locId)?.localidad;
                            if (!locName) return null;
                            return (
                                <span key={locId} className="inline-flex items-center gap-1.5 px-2 py-1 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded text-xs font-bold uppercase animate-in zoom-in-95">
                                    {locName}
                                    <button onClick={() => removeLocation(locId)} className="hover:text-red-500 rounded-full p-0.5"><IconX size={12}/></button>
                                </span>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* --- SECCIÓN NUEVA: FUENTES (3 columnas compactas) y STAFF --- */}
            <div className="mt-6 pt-4 border-t border-indigo-100 grid grid-cols-1 md:grid-cols-12 gap-6">
                
                {/* COLUMNA IZQUIERDA: FUENTES */}
                <div className="md:col-span-7 space-y-3">
                    <h4 className="text-sm font-bold text-indigo-900 flex items-center gap-2"><IconLayers size={16}/> Configuración de Personal</h4>
                    
                    {/* GRILLA DE 3 DESPLEGABLES */}
                    <div className="grid grid-cols-3 gap-2">
                        <SourceMultiSelect 
                            title="Ensambles" 
                            color="emerald" 
                            icon={IconMusic}
                            options={ensemblesList} 
                            selectedSet={selectedEnsemblesIds}
                            onToggle={(val, lbl) => toggleSource('ENSAMBLE', val, lbl)}
                        />
                        <SourceMultiSelect 
                            title="Familias" 
                            color="indigo" 
                            icon={IconUsers}
                            options={FAMILIES.map(f => ({ value: f, label: f }))} 
                            selectedSet={selectedFamiliesIds}
                            onToggle={(val, lbl) => toggleSource('FAMILIA', val, lbl)}
                        />
                        <SourceMultiSelect 
                            title="Excluir Ens." 
                            color="red" 
                            icon={IconAlertTriangle}
                            options={ensemblesList} 
                            selectedSet={excludedEnsemblesIds}
                            onToggle={(val, lbl) => toggleSource('EXCL_ENSAMBLE', val, lbl)}
                        />
                    </div>

                    {/* Chips de resumen */}
                    <div className="flex flex-wrap gap-2 min-h-[30px] content-start bg-slate-50 p-2 rounded-lg border border-slate-100">
                        {selectedSources.length === 0 && <span className="text-[10px] text-slate-400 italic">Nada seleccionado</span>}
                        {selectedSources.map((s, idx) => (
                            <span key={idx} className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold uppercase border animate-in zoom-in-95 shadow-sm bg-white ${
                                s.tipo === 'EXCL_ENSAMBLE' ? 'border-red-200 text-red-700' :
                                s.tipo === 'FAMILIA' ? 'border-indigo-200 text-indigo-700' :
                                'border-emerald-200 text-emerald-700'
                            }`}>
                                {s.tipo === 'EXCL_ENSAMBLE' && '🚫 '}
                                {s.label}
                                {/* Botón X para quitarlo directamente desde el chip también */}
                                <button onClick={() => setSelectedSources(prev => prev.filter((_, i) => i !== idx))} className="ml-1 hover:text-black hover:bg-black/5 rounded-full p-0.5"><IconX size={10}/></button>
                            </span>
                        ))}
                    </div>
                </div>

                {/* COLUMNA DERECHA: STAFF */}
                <div className="md:col-span-5">
                    <h4 className="text-sm font-bold text-indigo-900 mb-3 flex items-center gap-2"><IconUsers size={16}/> Staff Artístico</h4>
                    <div className="flex flex-col gap-2 p-3 rounded-lg border bg-fuchsia-50/30 border-fuchsia-100 h-full">
                        <div className="flex gap-2">
                            <select className="w-1/3 border border-slate-300 p-1.5 rounded text-xs outline-none bg-white" value={staffRole} onChange={e => setStaffRole(e.target.value)}>
                                <option value="director">Director</option>
                                <option value="solista">Solista</option>
                            </select>
                            <select className="flex-1 border border-slate-300 p-1.5 rounded text-xs outline-none bg-white" value={staffId} onChange={e => setStaffId(e.target.value)}>
                                <option value="">-- Buscar Persona --</option>
                                {allIntegrantes.map(i => <option key={i.value} value={i.value}>{i.label}</option>)}
                            </select>
                            <button onClick={addStaff} className="bg-fuchsia-100 text-fuchsia-700 p-1.5 rounded hover:bg-fuchsia-200"><IconPlus size={16}/></button>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-2 content-start">
                            {selectedStaff.length === 0 && <span className="text-[10px] text-slate-400 italic">Sin staff asignado</span>}
                            {selectedStaff.map((s, idx) => (
                                <span key={idx} className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold border shadow-sm animate-in zoom-in-95 bg-white ${
                                    s.rol === 'director' ? 'text-purple-700 border-purple-200' : 'text-fuchsia-700 border-fuchsia-200'
                                }`}>
                                    <span className="opacity-50 uppercase mr-0.5 text-[9px]">{s.rol.slice(0,3)}:</span> {s.label}
                                    <button onClick={() => removeStaff(idx)} className="ml-1 hover:text-red-600 rounded-full hover:bg-slate-100 p-0.5"><IconX size={10}/></button>
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* --- SECCIÓN CONCIERTOS (Sin cambios) --- */}
            {!isNew && (
                <div className="mt-6 pt-4 border-t border-indigo-100">
                    <h4 className="text-sm font-bold text-indigo-900 mb-3 flex items-center gap-2"><IconMusic size={16}/> Conciertos</h4>
                    <div className="space-y-2 mb-3">
                        {concerts.map(c => (
                            <div key={c.id} className={`flex items-center gap-3 p-2 rounded border text-sm transition-colors ${editingConcertId === c.id ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'}`}>
                                <div className="flex items-center gap-1 w-24 text-slate-700 font-medium"><IconCalendar size={14} className="text-slate-400"/> {c.fecha?.split('-').reverse().join('/')}</div>
                                <div className="flex items-center gap-1 w-16 text-slate-600"><IconClock size={14} className="text-slate-400"/> {c.hora_inicio?.slice(0,5)}</div>
                                <div className="flex-1 flex items-center gap-1 text-slate-600 truncate"><IconMapPin size={14} className="text-slate-400"/> {c.locaciones?.nombre || 'Sin locación'}</div>
                                <button onClick={() => handleEditConcertClick(c)} className="p-1.5 rounded hover:bg-white text-slate-400 hover:text-indigo-600"><IconEdit size={16}/></button>
                                <button onClick={() => handleDeleteConcert(c.id)} className="p-1.5 rounded hover:bg-white text-slate-400 hover:text-red-500"><IconTrash size={16}/></button>
                            </div>
                        ))}
                        {concerts.length === 0 && !loadingConcerts && <div className="text-xs text-slate-400 italic">No hay conciertos cargados.</div>}
                    </div>
                    {/* Formulario Agregar/Editar Concierto */}
                    <div className={`flex gap-2 items-end p-2 rounded border transition-all ${editingConcertId ? 'bg-amber-50 border-amber-200' : 'bg-indigo-50/50 border-indigo-100'}`}>
                        <div className="w-32"><DateInput value={newConcert.fecha} onChange={v => setNewConcert({...newConcert, fecha: v})}/></div>
                        <div className="w-24"><TimeInput value={newConcert.hora} onChange={v => setNewConcert({...newConcert, hora: v})}/></div>
                        <div className="flex-1">
                            <select className="w-full border border-slate-300 p-2 rounded text-sm h-[38px] outline-none bg-white" value={newConcert.id_locacion} onChange={e => setNewConcert({...newConcert, id_locacion: e.target.value})}>
                                <option value="">-- Lugar --</option>
                                {locacionesFull.map(l => <option key={l.id} value={l.id}>{l.nombre} ({l.localidades?.localidad})</option>)}
                            </select>
                        </div>
                        {editingConcertId && <button onClick={handleCancelConcertEdit} className="bg-white border border-slate-300 text-slate-500 px-3 py-2 rounded h-[38px]"><IconX size={16}/></button>}
                        <button onClick={handleSaveConcert} disabled={loadingConcerts} className={`px-3 py-2 rounded h-[38px] text-white flex items-center justify-center gap-1 min-w-[40px] ${editingConcertId ? 'bg-amber-500 hover:bg-amber-600' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
                            {editingConcertId ? <IconCheck size={18}/> : <IconPlus size={18}/>}
                        </button>
                    </div>
                </div>
            )}

            {/* --- FOOTER --- */}
            <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-indigo-100/50">
                <button onClick={onCancel} disabled={loading} className="flex items-center gap-1 px-3 py-1.5 rounded text-slate-600 hover:bg-slate-100 text-sm font-medium disabled:opacity-50"><IconX size={16}/> Cerrar</button>
                <button onClick={onSave} disabled={loading} className="flex items-center gap-2 px-4 py-1.5 rounded bg-indigo-600 text-white hover:bg-indigo-700 text-sm font-bold shadow-sm disabled:opacity-70 disabled:cursor-not-allowed transition-all">
                    {loading ? <IconLoader className="animate-spin" size={16}/> : <IconCheck size={16}/>}
                    {loading ? 'Guardando...' : 'Guardar Datos Gira'}
                </button>
            </div>
        </div>
    );
}