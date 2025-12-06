import React, { useState, useEffect } from 'react';
import { IconHotel, IconUsers, IconArrowRight, IconLoader, IconPlus, IconCheck, IconX, IconBed, IconMusic, IconTrash } from '../../components/ui/Icons';

// Subcomponente para crear/editar una habitación
const RoomForm = ({ onSubmit, onClose, roomData, isEditing }) => {
    const [data, setData] = useState(roomData || { tipo: 'Común', configuracion: 'Simple', con_cuna: false, notas_internas: '' });

    const handleSubmit = () => {
        onSubmit(data);
        onClose();
    };

    return (
        <div className="p-4 bg-white border rounded-lg shadow-md space-y-3">
            <h5 className="font-bold text-sm mb-2">{isEditing ? 'Editar Habitación' : 'Nueva Habitación'}</h5>
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400">Tipo</label>
                    <select value={data.tipo} onChange={e => setData({...data, tipo: e.target.value})} className="w-full border p-2 rounded text-sm">
                        <option value="Común">Común</option>
                        <option value="Plus">Plus</option>
                    </select>
                </div>
                <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400">Camas</label>
                    <select value={data.configuracion} onChange={e => setData({...data, configuracion: e.target.value})} className="w-full border p-2 rounded text-sm">
                        <option value="Simple">Simple</option>
                        <option value="Doble">Doble</option>
                        <option value="Matrimonial">Matrimonial</option>
                    </select>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <input type="checkbox" checked={data.con_cuna} onChange={e => setData({...data, con_cuna: e.target.checked})} />
                <label className="text-sm">Requiere Cuna</label>
            </div>
            <textarea placeholder="Notas internas..." value={data.notas_internas} onChange={e => setData({...data, notas_internas: e.target.value})} className="w-full border p-2 rounded text-sm resize-none"></textarea>
            <div className="flex justify-end gap-2">
                <button onClick={onClose} className="text-sm text-slate-500">Cancelar</button>
                <button onClick={handleSubmit} className="bg-indigo-600 text-white px-3 py-1 rounded text-sm flex items-center gap-1"><IconCheck size={16}/> Guardar</button>
            </div>
        </div>
    );
}

// --- COMPONENTE PRINCIPAL DE ROOMING (DRAG & DROP) ---
export default function RoomingManager({ supabase, booking, program, onBack }) {
    const [musicians, setMusicians] = useState([]); // Músicos que necesitan hospedaje
    const [rooms, setRooms] = useState([]);         // Habitaciones con asignaciones
    const [loading, setLoading] = useState(false);
    const [showRoomForm, setShowRoomForm] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [draggedMusician, setDraggedMusician] = useState(null);

    useEffect(() => {
        fetchInitialData();
    }, [booking.id]);

    const fetchInitialData = async () => {
        setLoading(true);
        
        // 1. Obtener músicos y localidades del programa para filtrar
        const { data: rosterData, error: rosterError } = await supabase
            .from('giras_integrantes')
            .select('integrantes(id, nombre, apellido, instrumentos(instrumento, id_localidad)), programas(giras_localidades(id_localidad))')
            .eq('id_gira', program.id);
        
        if (rosterError) { console.error(rosterError); setLoading(false); return; }

        // Mapear localidades del programa (ciudades donde tocan)
        const programLocalityIds = new Set(program.giras_localidades?.map(gl => gl.id_localidad) || []);

        // Filtrar músicos que NO residen en las localidades del programa (Necesitan Hotel)
        const unassignedMusicians = rosterData
            .map((r) => r.integrantes)
            .filter((m) => m && !programLocalityIds.has(m.instrumentos?.id_localidad))
            .map((m) => ({ 
                id: m.id, 
                nombre: `${m.apellido}, ${m.nombre}`, 
                instrumento: m.instrumentos?.instrumento 
            }));
        
        setMusicians(unassignedMusicians); // Inicialmente todos sin asignar (para el D&D pool)

        // 2. Obtener habitaciones existentes con detalles de los asignados
        const { data: roomsData } = await supabase
            .from('hospedaje_habitaciones')
            .select(`
                *,
                integrantes_asignados:integrantes!hospedaje_habitaciones_id_integrantes_asignados_fkey(id, nombre, apellido, instrumentos(instrumento))
            `)
            .eq('id_hospedaje', booking.id);
        
        setRooms(roomsData || []);

        setLoading(false);
    };

    // --- LÓGICA DRAG & DROP (Simplified) ---
    const handleDragStart = (e, musician) => {
        setDraggedMusician(musician);
        setIsDragging(true);
    };

    const handleDrop = async (e, roomId) => {
        e.preventDefault();
        if (!draggedMusician) return;
        
        setLoading(true);

        // 1. Mover al músico fuera de su habitación anterior (si la tenía)
        const currentRoom = rooms.find(r => r.id_integrantes_asignados.includes(draggedMusician.id));
        if (currentRoom && currentRoom.id !== roomId) {
             const newAssignments = currentRoom.id_integrantes_asignados.filter(id => id !== draggedMusician.id);
             await supabase.from('hospedaje_habitaciones').update({ id_integrantes_asignados: newAssignments }).eq('id', currentRoom.id);
        }

        // 2. Moverlo a la nueva habitación
        const targetRoom = rooms.find(r => r.id === roomId);
        if (targetRoom && !targetRoom.id_integrantes_asignados.includes(draggedMusician.id)) {
            const newAssignments = [...targetRoom.id_integrantes_asignados, draggedMusician.id];
            await supabase.from('hospedaje_habitaciones').update({ id_integrantes_asignados: newAssignments }).eq('id', roomId);
        }

        // 3. Recargar y limpiar estado
        setDraggedMusician(null);
        setIsDragging(false);
        fetchInitialData();
    };

    const handleRoomSubmit = async (data) => {
        setLoading(true);
        const payload = { ...data, id_hospedaje: booking.id };
        await supabase.from('hospedaje_habitaciones').insert([payload]);
        fetchInitialData();
    };

    // --- RENDERIZADO ---
    const unassignedMusicianIds = new Set(musicians.map(m => m.id));
    rooms.forEach(r => r.id_integrantes_asignados.forEach(id => unassignedMusicianIds.delete(id)));

    const availableMusicians = musicians.filter(m => unassignedMusicianIds.has(m.id));

    return (
        <div className="flex flex-col h-full bg-slate-50 animate-in fade-in">
            {/* Header */}
            <div className="bg-white p-4 border-b border-slate-200 shadow-sm flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="text-slate-400 hover:text-indigo-600 font-medium text-sm flex items-center gap-1">← Volver a Reservas</button>
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        {booking.hoteles.nombre} 
                        <span className="text-xs font-normal text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full border">Rooming</span>
                    </h2>
                </div>
            </div>

            {/* Modal de Nueva Habitación */}
            {showRoomForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <RoomForm onSubmit={handleRoomSubmit} onClose={() => setShowRoomForm(false)} />
                </div>
            )}

            {/* Contenido Principal D&D */}
            {loading ? (
                <div className="text-center p-8 text-indigo-600"><IconLoader className="animate-spin inline"/> Cargando datos de rooming...</div>
            ) : (
                <div className="flex-1 overflow-hidden grid md:grid-cols-4 gap-4 p-4">
                    {/* Columna 1: Músicos Sin Asignar */}
                    <div className="md:col-span-1 flex flex-col bg-white rounded-xl border border-slate-200 p-4 overflow-y-auto">
                        <h4 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                            <IconUsers size={20}/> Sin Asignar ({availableMusicians.length})
                        </h4>
                        <div className="space-y-2">
                            {availableMusicians.map(m => (
                                <div 
                                    key={m.id}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, m)}
                                    className="bg-slate-50 p-2 rounded border border-slate-200 hover:bg-indigo-50 cursor-grab active:cursor-grabbing text-sm shadow-sm"
                                >
                                    <div className="font-medium text-slate-800">{m.nombre}</div>
                                    <div className="text-xs text-slate-500">{m.instrumento}</div>
                                </div>
                            ))}
                            {availableMusicians.length === 0 && <p className="text-xs text-slate-400 italic pt-4">Todos los miembros que requieren hotel están asignados.</p>}
                        </div>
                    </div>

                    {/* Columnas 2-4: Habitaciones */}
                    <div className="md:col-span-3 grid grid-cols-3 gap-4 overflow-y-auto">
                        <button onClick={() => setShowRoomForm(true)} className="flex items-center justify-center border-2 border-dashed border-indigo-300 text-indigo-600 rounded-xl hover:bg-indigo-50 transition-colors h-32">
                            <IconPlus size={24}/> Nueva Habitación
                        </button>
                        
                        {rooms.map(room => (
                            <div 
                                key={room.id} 
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) => handleDrop(e, room.id)}
                                className={`bg-white rounded-xl p-4 border transition-all ${isDragging ? 'border-indigo-500 ring-2 ring-indigo-200' : 'border-slate-200'}`}
                            >
                                <div className="flex justify-between items-start mb-3">
                                    <h5 className="font-bold text-sm flex items-center gap-1">
                                        <IconBed size={16} className="text-indigo-600"/> Habitación {room.tipo}
                                    </h5>
                                    <button className="text-slate-400 hover:text-red-500"><IconTrash size={16}/></button>
                                </div>
                                <div className="text-xs text-slate-500 mb-3">
                                    {room.configuracion} {room.con_cuna && ' + Cuna'}
                                </div>
                                <div className="space-y-1 min-h-[50px]">
                                    {room.integrantes_asignados.map(m => (
                                        <div key={m.id} className="bg-indigo-100/50 text-indigo-800 text-xs px-2 py-1 rounded border border-indigo-200 flex justify-between">
                                            {m.apellido}, {m.nombre}
                                            {/* Aquí iría la lógica para quitar al arrastrarlo fuera o con un botón */}
                                        </div>
                                    ))}
                                    {room.integrantes_asignados.length === 0 && <p className="text-slate-300 italic text-xs">Arrastra aquí</p>}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}