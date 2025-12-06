import React, { useState, useEffect } from 'react';
import { IconPlus, IconX, IconCheck, IconTrash, IconMusic, IconMapPin, IconClock, IconCalendar, IconEdit, IconRefresh, IconArrowRight } from '../../components/ui/Icons';
import LocationMultiSelect from '../../components/filters/LocationMultiSelect';
import DateInput from '../../components/ui/DateInput';
import TimeInput from '../../components/ui/TimeInput';

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
    setSelectedLocations 
}) {
    // --- ESTADOS ---
    const [concerts, setConcerts] = useState([]);
    const [loadingConcerts, setLoadingConcerts] = useState(false);
    const [locacionesFull, setLocacionesFull] = useState([]); 
    const [newConcert, setNewConcert] = useState({ fecha: '', hora: '20:00', id_locacion: '' });
    const [conciertoTypeId, setConciertoTypeId] = useState(null);
    const [editingConcertId, setEditingConcertId] = useState(null);

    // --- ESTADOS PARA TRASLADAR GIRA ---
    const [isShifting, setIsShifting] = useState(false);
    const [shiftNewDate, setShiftNewDate] = useState('');
    const [shiftLoading, setShiftLoading] = useState(false);

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

    const handleSaveConcert = async () => {
        if (!newConcert.fecha || !conciertoTypeId) return alert("Fecha requerida");
        setLoadingConcerts(true);
        
        const payload = {
            id_gira: giraId,
            id_tipo_evento: conciertoTypeId,
            fecha: newConcert.fecha,
            hora_inicio: newConcert.hora,
            hora_fin: newConcert.hora, 
            id_locacion: newConcert.id_locacion || null,
            descripcion: 'Concierto Principal'
        };

        if (editingConcertId) {
            const { data, error } = await supabase.from('eventos').update(payload).eq('id', editingConcertId).select('id, fecha, hora_inicio, id_locacion, locaciones(nombre)').single();
            if (error) alert("Error: " + error.message);
            else {
                setConcerts(concerts.map(c => c.id === editingConcertId ? data : c));
                handleCancelConcertEdit();
            }
        } else {
            const { data, error } = await supabase.from('eventos').insert([payload]).select('id, fecha, hora_inicio, id_locacion, locaciones(nombre)').single();
            if (error) alert("Error: " + error.message);
            else {
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

    const removeLocation = (locId) => {
        const newSet = new Set(selectedLocations);
        newSet.delete(locId);
        setSelectedLocations(newSet);
    };

    // --- LÓGICA DE TRASLADO ---
    const handleShiftProgram = async () => {
        if (!shiftNewDate) return alert("Selecciona la nueva fecha de inicio");
        
        const oldStart = new Date(formData.fecha_desde);
        const newStart = new Date(shiftNewDate);
        
        const diffTime = newStart - oldStart;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return alert("La fecha es la misma.");

        if (!confirm(`¿Mover toda la gira ${diffDays} días?\n\nNueva fecha: ${shiftNewDate}\nSe actualizarán eventos y Drive.`)) return;

        setShiftLoading(true);
        try {
            const { error: shiftError } = await supabase.functions.invoke('shift-program', {
                body: { programId: giraId, daysShift: diffDays }
            });
            if (shiftError) throw shiftError;

            const { error: driveError } = await supabase.functions.invoke('manage-drive', {
                body: { action: 'sync_program', programId: giraId }
            });
            if (driveError) console.warn("Error Drive:", driveError);

            alert("Gira trasladada con éxito.");
            if (onRefresh) onRefresh(); else onCancel(); 

        } catch (err) {
            alert("Error al trasladar: " + err.message);
        } finally {
            setShiftLoading(false);
            setIsShifting(false);
        }
    };

    return (
        <div className={`p-4 rounded-xl border shadow-sm animate-in fade-in zoom-in-95 duration-200 ${isNew ? 'bg-indigo-50 border-indigo-200' : 'bg-white ring-2 ring-indigo-500 border-indigo-500 z-10 relative'}`}>
            <div className="flex justify-between items-center mb-4 border-b border-indigo-100 pb-2">
                <h3 className="text-indigo-900 font-bold flex items-center gap-2">
                    {isNew ? <><IconPlus size={18}/> Nuevo Programa</> : <><IconEdit size={18}/> Editando Programa</>}
                </h3>
                
                {!isNew && !isShifting && (
                    <button 
                        onClick={() => setIsShifting(true)} 
                        className="text-xs bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full border border-indigo-100 hover:bg-indigo-100 flex items-center gap-1 transition-colors"
                    >
                        <IconCalendar size={14}/> Trasladar Gira
                    </button>
                )}
            </div>

            {isShifting && (
                <div className="mb-6 bg-amber-50 border border-amber-200 p-4 rounded-lg animate-in slide-in-from-top-2">
                    <h4 className="text-amber-800 font-bold text-sm mb-2 flex items-center gap-2">
                        <IconRefresh size={16}/> Trasladar Gira Completa
                    </h4>
                    <p className="text-xs text-amber-700 mb-3">
                        Mueve fecha de inicio, fin y <b>todos los eventos</b>.
                    </p>
                    <div className="flex items-end gap-3">
                        <div className="flex-1">
                            <span className="text-[10px] text-amber-600 font-bold uppercase">Inicio Actual</span>
                            <div className="text-sm font-mono text-slate-600 bg-white border px-2 py-1.5 rounded">
                                {formData.fecha_desde?.split('-').reverse().join('/')}
                            </div>
                        </div>
                        <div className="pb-2 text-amber-400"><IconArrowRight/></div>
                        <div className="flex-1">
                            <DateInput label="Nueva Fecha Inicio" value={shiftNewDate} onChange={setShiftNewDate} />
                        </div>
                    </div>
                    <div className="flex gap-2 mt-3 justify-end">
                        <button onClick={() => setIsShifting(false)} className="px-3 py-1 bg-white border border-amber-200 text-amber-700 text-xs rounded hover:bg-amber-100">Cancelar</button>
                        <button onClick={handleShiftProgram} disabled={shiftLoading} className="px-3 py-1 bg-amber-600 text-white text-xs font-bold rounded hover:bg-amber-700 shadow-sm flex items-center gap-2">
                            {shiftLoading ? <IconRefresh className="animate-spin" size={12}/> : <IconCheck size={12}/>}
                            {shiftLoading ? 'Moviendo...' : 'Confirmar'}
                        </button>
                    </div>
                </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-8">
                    <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Nombre Interno</label>
                    <input type="text" placeholder="Ej: Gira Patagónica" className="w-full border border-slate-300 p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none bg-white font-medium text-lg" value={formData.nombre_gira} onChange={(e) => setFormData({...formData, nombre_gira: e.target.value})}/>
                </div>
                <div className="md:col-span-4">
                    <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Tipo de Programa</label>
                    <select className="w-full border border-slate-300 p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none bg-white h-[46px]" value={formData.tipo || 'Sinfónico'} onChange={(e) => setFormData({...formData, tipo: e.target.value})}>
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
                    <input type="text" placeholder="Ej: Alto Valle" className="w-full border border-slate-300 p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none bg-white" value={formData.zona || ''} onChange={(e) => setFormData({...formData, zona: e.target.value})}/>
                </div>
                
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

            {!isNew && (
                <div className="mt-6 pt-4 border-t border-indigo-100">
                    <h4 className="text-sm font-bold text-indigo-900 mb-3 flex items-center gap-2"><IconMusic size={16}/> Conciertos</h4>
                    <div className="space-y-2 mb-3">
                        {concerts.map(c => (
                            <div key={c.id} className={`flex items-center gap-3 p-2 rounded border text-sm transition-colors ${editingConcertId === c.id ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'}`}>
                                <div className="flex items-center gap-1 w-24 text-slate-700 font-medium"><IconCalendar size={14} className="text-slate-400"/> {c.fecha?.split('-').reverse().join('/')}</div>
                                <div className="flex items-center gap-1 w-16 text-slate-600"><IconClock size={14} className="text-slate-400"/> {c.hora_inicio?.slice(0,5)}</div>
                                <div className="flex-1 flex items-center gap-1 text-slate-600 truncate"><IconMapPin size={14} className="text-slate-400"/> {c.locaciones?.nombre || 'Sin locación'}</div>
                                <button onClick={() => handleEditConcertClick(c)} className={`p-1.5 rounded transition-colors ${editingConcertId === c.id ? 'bg-amber-200 text-amber-800' : 'text-slate-400 hover:text-indigo-600 hover:bg-white'}`} title="Editar"><IconEdit size={16}/></button>
                                <button onClick={() => handleDeleteConcert(c.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-white rounded transition-colors" title="Borrar"><IconTrash size={16}/></button>
                            </div>
                        ))}
                        {concerts.length === 0 && !loadingConcerts && <div className="text-xs text-slate-400 italic">No hay conciertos cargados.</div>}
                    </div>
                    <div className={`flex gap-2 items-end p-2 rounded border transition-all ${editingConcertId ? 'bg-amber-50 border-amber-200' : 'bg-indigo-50/50 border-indigo-100'}`}>
                        <div className="w-32"><DateInput value={newConcert.fecha} onChange={v => setNewConcert({...newConcert, fecha: v})}/></div>
                        <div className="w-24"><TimeInput value={newConcert.hora} onChange={v => setNewConcert({...newConcert, hora: v})}/></div>
                        <div className="flex-1">
                            <select className="w-full border border-slate-300 p-2 rounded text-sm h-[38px] outline-none bg-white" value={newConcert.id_locacion} onChange={e => setNewConcert({...newConcert, id_locacion: e.target.value})}>
                                <option value="">-- Seleccionar Lugar --</option>
                                {locacionesFull.map(l => <option key={l.id} value={l.id}>{l.nombre} ({l.localidades?.localidad})</option>)}
                            </select>
                        </div>
                        {editingConcertId && <button onClick={handleCancelConcertEdit} className="bg-white border border-slate-300 text-slate-500 px-3 py-2 rounded h-[38px] hover:bg-slate-100"><IconX size={16}/></button>}
                        <button onClick={handleSaveConcert} disabled={loadingConcerts} className={`px-3 py-2 rounded h-[38px] text-white flex items-center justify-center gap-1 min-w-[40px] ${editingConcertId ? 'bg-amber-500 hover:bg-amber-600' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
                            {editingConcertId ? <IconCheck size={18}/> : <IconPlus size={18}/>}
                        </button>
                    </div>
                </div>
            )}

            <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-indigo-100/50">
                <button onClick={onCancel} className="flex items-center gap-1 px-3 py-1.5 rounded text-slate-600 hover:bg-slate-100 text-sm font-medium"><IconX size={16}/> Cerrar</button>
                <button onClick={onSave} disabled={loading} className="flex items-center gap-1 px-4 py-1.5 rounded bg-indigo-600 text-white hover:bg-indigo-700 text-sm font-medium shadow-sm"><IconCheck size={16}/> Guardar Datos Gira</button>
            </div>
        </div>
    );
}