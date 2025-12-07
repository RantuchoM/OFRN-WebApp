import React, { useState, useEffect } from 'react';
import { IconHotel, IconPlus, IconCalendar, IconLoader, IconTrash, IconBed, IconUsers } from '../../components/ui/Icons';
import RoomingManager from './RoomingManager'; 

export default function ProgramHoteleria({ supabase, program, onBack }) {
    const [bookings, setBookings] = useState([]);
    const [hotelsList, setHotelsList] = useState([]);
    const [localidadesPrograma, setLocalidadesPrograma] = useState([]);
    const [loading, setLoading] = useState(false);
    
    const [isAdding, setIsAdding] = useState(false);
    const [newBooking, setNewBooking] = useState({ id_hotel: '', fecha_checkin: program.fecha_desde, fecha_checkout: program.fecha_hasta, hora_checkin: '14:00', hora_checkout: '10:00' });
    
    // NUEVO ESTADO: Mostrar el gestor integral
    const [showFullRooming, setShowFullRooming] = useState(false);

    useEffect(() => { 
        loadData();
    }, [program.id]);

    const loadData = async () => {
        setLoading(true);
        
        // Cargar Hoteles
        const { data: hotels } = await supabase.from('hoteles').select('id, nombre, localidades(localidad)').order('nombre');
        if (hotels) setHotelsList(hotels);

        // Cargar Localidades del Programa
        const { data: locs } = await supabase.from('giras_localidades').select('localidades(localidad)').eq('id_gira', program.id);
        if (locs) setLocalidadesPrograma(locs.map(l => l.localidades.localidad).join(', '));

        // Cargar Bookings
        const { data: bks } = await supabase
            .from('programas_hospedajes')
            .select(`*, hoteles(nombre, localidades(localidad))`)
            .eq('id_programa', program.id)
            .order('fecha_checkin');
        
        setBookings(bks || []);
        setLoading(false);
    };

    const handleSaveBooking = async () => {
        if (!newBooking.id_hotel) return alert("Selecciona un hotel.");
        setLoading(true);

        const payload = { ...newBooking, id_programa: program.id };
        const { error } = await supabase.from('programas_hospedajes').insert([payload]);

        if (error) alert("Error: El hotel ya está reservado para este programa, o faltan datos.");
        else {
            setIsAdding(false);
            setNewBooking({ id_hotel: '', fecha_checkin: program.fecha_desde, fecha_checkout: program.fecha_hasta, hora_checkin: '14:00', hora_checkout: '10:00' });
            loadData();
        }
        setLoading(false);
    };

    const handleDeleteBooking = async (id) => {
        if (!confirm("¿Eliminar esta reserva y todas las asignaciones de habitaciones?")) return;
        setLoading(true);
        await supabase.from('programas_hospedajes').delete().eq('id', id);
        loadData();
    };

    // --- MODO GESTIÓN INTEGRAL ---
    if (showFullRooming) {
        return (
            <RoomingManager 
                supabase={supabase} 
                bookings={bookings} // Pasamos TODOS los hoteles
                program={program} 
                onBack={() => setShowFullRooming(false)}
            />
        );
    }

    const formatDateDisplay = (dateString, timeString) => {
        if (!dateString) return '-';
        const [y, m, d] = dateString.split('-');
        const time = timeString ? timeString.slice(0, 5) : '';
        return `${d}/${m}/${y} ${time}`;
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 animate-in fade-in">
            {/* Header */}
            <div className="bg-white p-4 border-b border-slate-200 shadow-sm flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="text-slate-400 hover:text-indigo-600 font-medium text-sm flex items-center gap-1">← Volver</button>
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            <IconHotel size={24} className="text-indigo-600"/> Logística de Hospedaje
                        </h2>
                        <p className="text-xs text-slate-500">Programa: <b>{program.nombre_gira}</b></p>
                    </div>
                </div>
                <div className="flex gap-2">
                    {bookings.length > 0 && (
                        <button 
                            onClick={() => setShowFullRooming(true)}
                            className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-md hover:bg-emerald-700 flex items-center gap-2 transition-all"
                        >
                            <IconUsers size={18}/> Gestión Integral de Rooming
                        </button>
                    )}
                    <button onClick={() => setIsAdding(!isAdding)} className="bg-indigo-600 text-white px-3 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-indigo-700 flex items-center gap-2">
                        <IconPlus size={16}/> {isAdding ? 'Cerrar' : 'Agregar Hotel'}
                    </button>
                </div>
            </div>

            {/* Formulario */}
            {isAdding && (
                <div className="bg-indigo-50/30 p-4 border-b border-slate-200 animate-in slide-in-from-top-2">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end max-w-6xl mx-auto">
                        <div className="md:col-span-4">
                            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Hotel</label>
                            <select className="w-full border p-2 rounded text-sm bg-white outline-none" value={newBooking.id_hotel} onChange={e => setNewBooking({...newBooking, id_hotel: e.target.value})}>
                                <option value="">-- Seleccionar Hotel --</option>
                                {hotelsList.map(h => <option key={h.id} value={h.id}>{h.nombre} ({h.localidades?.localidad})</option>)}
                            </select>
                        </div>
                        <div className="md:col-span-2"><label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Check-in</label><input type="date" className="w-full border p-2 rounded text-sm outline-none" value={newBooking.fecha_checkin} onChange={e => setNewBooking({...newBooking, fecha_checkin: e.target.value})}/></div>
                        <div className="md:col-span-1"><input type="time" className="w-full border p-2 rounded text-sm outline-none" value={newBooking.hora_checkin} onChange={e => setNewBooking({...newBooking, hora_checkin: e.target.value})}/></div>
                        <div className="md:col-span-2"><label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Check-out</label><input type="date" className="w-full border p-2 rounded text-sm outline-none" value={newBooking.fecha_checkout} onChange={e => setNewBooking({...newBooking, fecha_checkout: e.target.value})}/></div>
                        <div className="md:col-span-1"><input type="time" className="w-full border p-2 rounded text-sm outline-none" value={newBooking.hora_checkout} onChange={e => setNewBooking({...newBooking, hora_checkout: e.target.value})}/></div>
                        <div className="md:col-span-2">
                            <button onClick={handleSaveBooking} disabled={loading || !newBooking.id_hotel} className="w-full bg-indigo-600 text-white px-3 py-2 rounded text-sm font-bold h-[38px] flex items-center justify-center gap-1 hover:bg-indigo-700">
                                {loading ? <IconLoader size={16} className="animate-spin"/> : <IconPlus size={16}/>} Guardar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Listado */}
            <div className="flex-1 overflow-y-auto p-4 max-w-6xl mx-auto w-full space-y-4">
                {loading && <div className="text-center p-8 text-indigo-600"><IconLoader className="animate-spin inline"/> Cargando...</div>}
                
                {bookings.map(bk => {
                    const hotel = bk.hoteles;
                    return (
                        <div key={bk.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex justify-between items-center">
                            <div className="flex-1">
                                <h4 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                    <IconHotel size={20} className="text-indigo-500"/> {hotel.nombre}
                                    <span className="text-xs font-normal text-slate-400 bg-slate-50 px-2 py-0.5 rounded">({hotel.localidades?.localidad})</span>
                                </h4>
                                <div className="flex gap-4 text-xs text-slate-600 mt-2">
                                    <span className="flex items-center gap-1"><IconCalendar size={12}/> In: {formatDateDisplay(bk.fecha_checkin, bk.hora_checkin)}</span>
                                    <span className="flex items-center gap-1"><IconCalendar size={12}/> Out: {formatDateDisplay(bk.fecha_checkout, bk.hora_checkout)}</span>
                                </div>
                            </div>
                            
                            <button onClick={() => handleDeleteBooking(bk.id)} className="text-slate-400 hover:text-red-600 p-2 border border-transparent hover:border-red-100 rounded"><IconTrash size={18}/></button>
                        </div>
                    );
                })}

                {bookings.length === 0 && !loading && (
                    <div className="text-center p-12 border-2 border-dashed border-slate-200 rounded-xl text-slate-400">
                        <IconHotel size={32} className="mx-auto mb-2 opacity-20"/>
                        <p>No hay hoteles asignados. Agrega uno arriba.</p>
                    </div>
                )}
            </div>
        </div>
    );
}