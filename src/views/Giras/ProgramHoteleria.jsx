import React, { useState, useEffect, useMemo } from 'react';
import { IconHotel, IconPlus, IconCalendar, IconLoader, IconTrash, IconBed, IconUsers } from '../../components/ui/Icons';
import RoomingManager from './RoomingManager';
import { ensureDefaultSegment } from '../../services/giraSegmentosService';
import { useGiraSegmentos } from '../../hooks/useGiraSegmentos';
import { buildSegmentSpecs, formatTramoTitle } from '../../utils/giraTramos';

export default function ProgramHoteleria({ supabase, program, onBack }) {
    const [bookings, setBookings] = useState([]);
    const [hotelsList, setHotelsList] = useState([]);
    const [localidadesPrograma, setLocalidadesPrograma] = useState([]);
    const [loading, setLoading] = useState(false);
    const [activeSegmentIdx, setActiveSegmentIdx] = useState(0);
    
    const [isAdding, setIsAdding] = useState(false);
    const [newBooking, setNewBooking] = useState({ id_hotel: '', fecha_checkin: program.fecha_desde, fecha_checkout: program.fecha_hasta, hora_checkin: '14:00', hora_checkout: '10:00' });
    
    const [showFullRooming, setShowFullRooming] = useState(false);

    const { cortes, segmentRows, cortesCount, segments } = useGiraSegmentos(supabase, program);
    const specs = useMemo(() => buildSegmentSpecs(program, cortes), [program, cortes]);

    const activeSegmentRow = segmentRows[activeSegmentIdx] ?? segmentRows[0] ?? null;

    useEffect(() => { 
        loadData();
    }, [program.id]);

    useEffect(() => {
        if (activeSegmentRow && cortesCount > 0) {
            setNewBooking(prev => ({
                ...prev,
                fecha_checkin: activeSegmentRow.fecha_desde || program.fecha_desde,
                fecha_checkout: activeSegmentRow.fecha_hasta || program.fecha_hasta,
            }));
        }
    }, [activeSegmentIdx, activeSegmentRow?.id, cortesCount]);

    const loadData = async () => {
        setLoading(true);
        
        const { data: hotels } = await supabase.from('hoteles').select('id, nombre, localidades(localidad)').order('nombre');
        if (hotels) setHotelsList(hotels);

        const { data: locs } = await supabase.from('giras_localidades').select('localidades(localidad)').eq('id_gira', program.id);
        if (locs) setLocalidadesPrograma(locs.map(l => l.localidades.localidad).join(', '));

        const { data: bks } = await supabase
            .from('programas_hospedajes')
            .select(`*, hoteles(nombre, localidades(localidad))`)
            .eq('id_programa', program.id)
            .order('fecha_checkin');
        
        setBookings(bks || []);
        setLoading(false);
    };

    const filteredBookings = useMemo(() => {
        if (cortesCount === 0 || !activeSegmentRow) return bookings;
        return bookings.filter(b => Number(b.id_segmento) === Number(activeSegmentRow.id));
    }, [bookings, activeSegmentRow, cortesCount]);

    const handleSaveBooking = async () => {
        if (!newBooking.id_hotel) return alert("Selecciona un hotel.");
        setLoading(true);

        try {
            let segmentId = activeSegmentRow?.id;
            if (!segmentId) segmentId = await ensureDefaultSegment(supabase, program.id);
            const payload = { ...newBooking, id_programa: program.id, id_segmento: segmentId };
            const { error } = await supabase.from('programas_hospedajes').insert([payload]);

            if (error) alert("Error: El hotel ya está reservado para este programa, o faltan datos.");
            else {
                setIsAdding(false);
                setNewBooking({
                    id_hotel: '',
                    fecha_checkin: activeSegmentRow?.fecha_desde || program.fecha_desde,
                    fecha_checkout: activeSegmentRow?.fecha_hasta || program.fecha_hasta,
                    hora_checkin: '14:00',
                    hora_checkout: '10:00',
                });
                loadData();
            }
        } catch (err) {
            console.error(err);
            alert(err?.message || "Error al guardar reserva.");
        }
        setLoading(false);
    };

    const handleDeleteBooking = async (id) => {
        if (!confirm("¿Eliminar esta reserva y todas las asignaciones de habitaciones?")) return;
        setLoading(true);
        await supabase.from('programas_hospedajes').delete().eq('id', id);
        loadData();
    };

    if (showFullRooming) {
        return (
            <RoomingManager 
                supabase={supabase} 
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

    const segmentLabel = (idx) => {
        const spec = specs[idx];
        if (!spec || cortesCount === 0) return 'Gira completa';
        return formatTramoTitle(idx, spec.fecha_desde, spec.fecha_hasta);
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 animate-in fade-in">
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

            {cortesCount > 0 && segmentRows.length > 1 && (
                <div className="bg-white border-b border-slate-200 px-4 py-2 flex gap-1 overflow-x-auto shrink-0">
                    {segmentRows.map((seg, idx) => (
                        <button
                            key={seg.id}
                            type="button"
                            onClick={() => setActiveSegmentIdx(idx)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap border ${
                                activeSegmentIdx === idx
                                    ? 'bg-indigo-600 text-white border-indigo-600'
                                    : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-200'
                            }`}
                        >
                            {segmentLabel(idx)}
                        </button>
                    ))}
                </div>
            )}

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

            <div className="flex-1 overflow-y-auto p-4 max-w-6xl mx-auto w-full space-y-4">
                {loading && <div className="text-center p-8 text-indigo-600"><IconLoader className="animate-spin inline"/> Cargando...</div>}
                
                {filteredBookings.map(bk => {
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

                {filteredBookings.length === 0 && !loading && (
                    <div className="text-center p-12 border-2 border-dashed border-slate-200 rounded-xl text-slate-400">
                        <IconHotel size={32} className="mx-auto mb-2 opacity-20"/>
                        <p>{cortesCount > 0 ? 'No hay hoteles en este tramo.' : 'No hay hoteles asignados.'} Agrega uno arriba.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
