import React, { useState, useEffect } from 'react';
import { 
    IconHotel, IconUsers, IconArrowRight, IconLoader, IconPlus, 
    IconCheck, IconX, IconBed, IconMusic, IconTrash, IconMapPin, IconEdit, IconChevronDown 
} from '../../components/ui/Icons';

// ==========================================
// SUBCOMPONENTES (DEFINIDOS FUERA PARA ESTABILIDAD)
// ==========================================

const RoomForm = ({ onSubmit, onClose, initialData }) => {
    const [tipo, setTipo] = useState(initialData?.tipo || 'Común');
    const [esMatrimonial, setEsMatrimonial] = useState(initialData?.es_matrimonial || false);
    const [conCuna, setConCuna] = useState(initialData?.con_cuna || false);
    const [notas, setNotas] = useState(initialData?.notas_internas || '');

    const handleSubmit = () => {
        onSubmit({ 
            id: initialData?.id, tipo, es_matrimonial: esMatrimonial, con_cuna: conCuna, notas_internas: notas,
            configuracion: esMatrimonial ? 'Matrimonial' : 'Simple' 
        });
        onClose();
    };

    return (
        <div className="p-4 bg-white border rounded-lg shadow-xl w-64 space-y-3 animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
            <h5 className="font-bold text-sm mb-2 text-indigo-900">{initialData ? 'Editar' : 'Nueva Habitación'}</h5>
            <div className="space-y-2">
                <select value={tipo} onChange={e => setTipo(e.target.value)} className="w-full border p-1.5 rounded text-sm outline-none">
                    <option value="Común">Estándar</option><option value="Plus">Plus / Suite</option>
                </select>
                <label className="flex items-center gap-2 text-xs cursor-pointer hover:bg-slate-50 p-1 rounded"><input type="checkbox" checked={esMatrimonial} onChange={e => setEsMatrimonial(e.target.checked)} className="rounded text-indigo-600"/><span>Matrimonial</span></label>
                <label className="flex items-center gap-2 text-xs cursor-pointer hover:bg-slate-50 p-1 rounded"><input type="checkbox" checked={conCuna} onChange={e => setConCuna(e.target.checked)} className="rounded text-indigo-600"/><span>Cuna</span></label>
                <textarea placeholder="Notas..." value={notas} onChange={e => setNotas(e.target.value)} className="w-full border p-1.5 rounded text-xs resize-none h-16 outline-none"/>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100"><button onClick={onClose} className="text-xs text-slate-500 hover:text-slate-700">Cancelar</button><button onClick={handleSubmit} className="bg-indigo-600 text-white px-3 py-1 rounded text-xs font-bold hover:bg-indigo-700">Guardar</button></div>
        </div>
    );
};

const MusicianCard = ({ m, onDragStart, isInRoom, onRemove, isLocal }) => {
    const loc = m.localidad || 'S/D';
    return (
        <div 
            draggable 
            onDragStart={(e) => {
                e.stopPropagation(); // Evita conflictos con contenedores
                onDragStart(e, m);
            }}
            className={`p-1.5 rounded border text-xs flex justify-between items-center shadow-sm cursor-grab active:cursor-grabbing select-none transition-colors ${isLocal ? 'bg-slate-100 text-slate-500 border-slate-200' : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50'}`}
        >
            <div className="truncate max-w-[120px]" title={`${m.apellido}, ${m.nombre} (${loc})`}><b>{m.apellido}</b> {m.nombre}</div>
            <div className="flex items-center gap-1">
                {isLocal && <IconMapPin size={10} className="text-slate-400"/>}
                <span className="text-[9px] text-slate-400 bg-black/5 px-1 rounded uppercase">{loc.slice(0,3)}</span>
                {isInRoom && <button onClick={(e) => { e.stopPropagation(); onRemove(m); }} className="text-slate-300 hover:text-red-500 ml-1"><IconX size={10}/></button>}
            </div>
        </div>
    );
};

const MusicianListColumn = ({ title, color, musicians, isDragging, onDragStart, onDragOver, onDrop }) => {
    const byCity = musicians.reduce((acc, m) => {
        const city = m.localidad || 'Desconocida';
        if (!acc[city]) acc[city] = [];
        acc[city].push(m);
        return acc;
    }, {});
    const sortedCities = Object.keys(byCity).sort((a, b) => {
        const groupA = byCity[a]; const groupB = byCity[b];
        const isLocalA = groupA.some(m => m.isLocal); const isLocalB = groupB.some(m => m.isLocal);
        if (isLocalA && !isLocalB) return 1; if (!isLocalA && isLocalB) return -1;
        return a.localeCompare(b);
    });

    return (
        <div 
            className={`w-48 flex flex-col bg-${color}-50/50 rounded-xl border border-${color}-100 p-3 overflow-y-auto transition-colors ${isDragging ? `bg-${color}-100/50 border-${color}-300 border-dashed` : ''}`}
            onDragOver={onDragOver} onDrop={onDrop}
        >
            <h4 className={`font-bold text-${color}-800 mb-3 flex justify-between`}><span>{title}</span> <span className="bg-white px-2 rounded text-xs shadow-sm">{musicians.length}</span></h4>
            <div className="space-y-3">
                {sortedCities.map(city => {
                    const group = byCity[city];
                    const isGroupLocal = group.some(m => m.isLocal);
                    return (
                        <div key={city}>
                            <div className={`text-[10px] font-bold uppercase tracking-wider mb-1 flex items-center gap-1 border-b border-${color}-200/50 pb-0.5 ${isGroupLocal ? 'text-slate-400' : `text-${color}-700`}`}>{isGroupLocal && <IconMapPin size={10}/>} {city}</div>
                            <div className="space-y-1">{group.map(m => <MusicianCard key={m.id} m={m} onDragStart={onDragStart} isLocal={m.isLocal} />)}</div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const RoomCard = ({ room, index, total, isDragging, onDragStart, onDragOver, onDrop, onDelete, onEdit, onRemoveMusician, onMove, getCapacityLabel, getRoomColor }) => {
    const isPlus = room.tipo === 'Plus';
    const count = room.occupants.length;
    const colorClass = getRoomColor(count);
    const [isOver, setIsOver] = useState(false);

    return (
        <div 
            onDragOver={(e) => { onDragOver(e); setIsOver(true); }} onDragLeave={() => setIsOver(false)} onDrop={(e) => { setIsOver(false); onDrop(e, room.id); }}
            className={`rounded-lg border shadow-sm flex flex-col transition-all duration-200 ${colorClass} ${isPlus ? 'ring-2 ring-amber-400 ring-offset-1' : ''} ${isOver ? 'ring-4 ring-indigo-400 scale-105 z-10' : ''}`}
        >
            <div className="p-2 border-b border-black/5 flex justify-between items-start">
                <div className="flex-1">
                    <div className="flex items-center gap-1 font-bold text-sm"><IconBed size={14} className={room.es_matrimonial ? "text-pink-600" : "text-slate-500"}/> {getCapacityLabel(count)}</div>
                    <div className="text-[9px] opacity-70 flex gap-1">{isPlus && <span className="font-bold text-amber-700">PLUS</span>}{room.es_matrimonial && <span>• Matri</span>}{room.con_cuna && <span>• Cuna</span>}</div>
                </div>
                <div className="flex items-center gap-0.5">
                    <div className="flex flex-col mr-1">
                        {index > 0 && <button onClick={() => onMove(index, -1, room)} className="text-slate-400 hover:text-indigo-600"><IconChevronDown size={12} className="rotate-180"/></button>}
                        {index < total - 1 && <button onClick={() => onMove(index, 1, room)} className="text-slate-400 hover:text-indigo-600"><IconChevronDown size={12}/></button>}
                    </div>
                    <button onClick={onEdit} className="text-slate-400 hover:text-indigo-600 p-0.5"><IconEdit size={12}/></button>
                    <button onClick={() => onDelete(room.id)} className="text-slate-400 hover:text-red-600 p-0.5"><IconTrash size={12}/></button>
                </div>
            </div>
            <div className="p-1.5 space-y-1 min-h-[50px] flex-1">
                {room.occupants.map(m => <MusicianCard key={m.id} m={m} onDragStart={(e) => onDragStart(e, m, room.id)} isInRoom={true} onRemove={(mus) => onRemoveMusician(mus, room.id)} isLocal={m.isLocal} />)}
                {count === 0 && <div className="h-full flex items-center justify-center text-slate-400/50 text-xs italic pointer-events-none">Arrastra aquí</div>}
            </div>
            {room.notas_internas && <div className="px-2 py-1 border-t border-black/5 text-[9px] italic opacity-80 truncate bg-white/30" title={room.notas_internas}>{room.notas_internas}</div>}
        </div>
    );
};

// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================

export default function RoomingManager({ supabase, bookings, program, onBack }) { // RECIBE bookings[]
    const [musicians, setMusicians] = useState([]); 
    const [rooms, setRooms] = useState([]);         
    const [loading, setLoading] = useState(false);
    
    // Modal
    const [showRoomForm, setShowRoomForm] = useState(false);
    const [editingRoomData, setEditingRoomData] = useState(null);
    const [activeBookingIdForNewRoom, setActiveBookingIdForNewRoom] = useState(null); 
    
    // D&D
    const [isDragging, setIsDragging] = useState(false);
    const [draggedMusician, setDraggedMusician] = useState(null);

    const programLocalityIds = new Set(program.giras_localidades?.map(gl => gl.id_localidad) || []);

    useEffect(() => { fetchInitialData(); }, [bookings]);

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            // 1. Habitaciones
            const bookingIds = bookings.map(b => b.id);
            const { data: roomsData, error: roomsError } = await supabase
                .from('hospedaje_habitaciones')
                .select('*')
                .in('id_hospedaje', bookingIds)
                .order('orden', { ascending: true })
                .order('created_at', { ascending: true });
            if (roomsError) throw roomsError;

            // 2. Roster
            const { data: fuentes } = await supabase.from("giras_fuentes").select("*").eq("id_gira", program.id);
            const { data: overrides } = await supabase.from("giras_integrantes").select("id_integrante, estado").eq("id_gira", program.id);
            const overrideMap = {}; overrides?.forEach(o => overrideMap[o.id_integrante] = o.estado);

            const idsToFetch = new Set();
            const ensambleIds = fuentes?.filter(f => f.tipo === 'ENSAMBLE').map(f => f.valor_id) || [];
            if (ensambleIds.length > 0) {
                const { data: rels } = await supabase.from("integrantes_ensambles").select("id_integrante").in("id_ensamble", ensambleIds);
                rels?.forEach(r => idsToFetch.add(r.id_integrante));
            }
            const familiaNames = fuentes?.filter(f => f.tipo === 'FAMILIA').map(f => f.valor_texto) || [];
            if (familiaNames.length > 0) {
                const { data: famMembers } = await supabase.from("integrantes").select("id, instrumentos!inner(familia)").in("instrumentos.familia", familiaNames);
                famMembers?.forEach(m => idsToFetch.add(m.id));
            }
            overrides?.forEach(o => { if (o.estado !== 'ausente') idsToFetch.add(o.id_integrante); });
            const finalMemberIds = Array.from(idsToFetch).filter(id => overrideMap[id] !== 'ausente');

            // 3. Detalles
            let allMusicians = [];
            if (finalMemberIds.length > 0) {
                const { data: details } = await supabase
                    .from('integrantes')
                    .select('id, nombre, apellido, genero, instrumentos(instrumento), localidades(localidad), id_localidad')
                    .in('id', finalMemberIds);
                allMusicians = details || [];
            }

            // 4. Procesamiento
            const normalizeMusician = (m) => ({
                id: m.id, nombre: m.nombre, apellido: m.apellido, genero: m.genero || '-',
                localidad: m.localidades?.localidad || 'S/D', id_localidad: m.id_localidad,
                isLocal: programLocalityIds.has(m.id_localidad)
            });
            const allMusiciansMap = new Map(allMusicians.map(m => [m.id, normalizeMusician(m)]));

            const roomsWithDetails = roomsData.map(room => {
                const occupants = (room.id_integrantes_asignados || []).map(id => allMusiciansMap.get(id)).filter(Boolean);
                const genders = new Set(occupants.map(m => m.genero));
                let roomGender = 'Mixto';
                if (occupants.length > 0) {
                    if (genders.has('F') && !genders.has('M')) roomGender = 'F';
                    else if (genders.has('M') && !genders.has('F')) roomGender = 'M';
                }
                return { ...room, occupants, roomGender };
            });

            const assignedIds = new Set();
            roomsData.forEach(r => (r.id_integrantes_asignados || []).forEach(id => assignedIds.add(id)));

            const unassigned = Array.from(allMusiciansMap.values())
                .filter(m => !assignedIds.has(m.id))
                .sort((a, b) => {
                    if (a.isLocal !== b.isLocal) return a.isLocal ? 1 : -1;
                    return a.apellido.localeCompare(b.apellido);
                });

            setMusicians(unassigned);
            setRooms(roomsWithDetails);
        } catch (error) { console.error(error); } finally { setLoading(false); }
    };

    // --- ACCIONES OPTIMISTAS ---
    const updateLocalState = (newRooms, newMusicians) => { setRooms(newRooms); setMusicians(newMusicians); };
    const syncRoomOccupants = async (roomId, occupants) => {
        const ids = occupants.map(m => m.id);
        await supabase.from('hospedaje_habitaciones').update({ id_integrantes_asignados: ids }).eq('id', roomId);
    };

    // --- DRAG HANDLERS ---
    const handleDragStart = (e, musician, sourceRoomId = null) => {
        e.dataTransfer.setData("text/plain", musician.id);
        e.dataTransfer.effectAllowed = "move";
        setDraggedMusician({ ...musician, sourceRoomId });
        setIsDragging(true);
    };

    const handleDragOver = (e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; };

    const handleDropOnRoom = (e, targetRoomId) => {
        e.preventDefault();
        if (!draggedMusician) return;

        const targetIndex = rooms.findIndex(r => r.id === targetRoomId);
        if (targetIndex === -1) return;
        const targetRoom = { ...rooms[targetIndex] };

        if (targetRoom.occupants.find(m => m.id === draggedMusician.id)) { setIsDragging(false); return; }

        const newRooms = [...rooms];
        const newMusicians = [...musicians];

        // Quitar de origen
        if (draggedMusician.sourceRoomId) {
            const srcIndex = newRooms.findIndex(r => r.id === draggedMusician.sourceRoomId);
            if (srcIndex !== -1) {
                const srcRoom = { ...newRooms[srcIndex] };
                srcRoom.occupants = srcRoom.occupants.filter(m => m.id !== draggedMusician.id);
                // Recalcular género origen
                const g = new Set(srcRoom.occupants.map(m => m.genero));
                srcRoom.roomGender = srcRoom.occupants.length === 0 ? 'Mixto' : (g.has('F') && !g.has('M') ? 'F' : (g.has('M') && !g.has('F') ? 'M' : 'Mixto'));
                newRooms[srcIndex] = srcRoom;
                syncRoomOccupants(srcRoom.id, srcRoom.occupants);
            }
        } else {
            const mIndex = newMusicians.findIndex(m => m.id === draggedMusician.id);
            if (mIndex !== -1) newMusicians.splice(mIndex, 1);
        }

        // Agregar a destino
        targetRoom.occupants = [...targetRoom.occupants, draggedMusician];
        const gT = new Set(targetRoom.occupants.map(m => m.genero));
        targetRoom.roomGender = gT.has('F') && !gT.has('M') ? 'F' : (gT.has('M') && !gT.has('F') ? 'M' : 'Mixto');
        newRooms[targetIndex] = targetRoom;

        updateLocalState(newRooms, newMusicians);
        syncRoomOccupants(targetRoom.id, targetRoom.occupants);
        setDraggedMusician(null); setIsDragging(false);
    };

    const handleDropOnUnassigned = (e) => {
        e.preventDefault();
        if (!draggedMusician || !draggedMusician.sourceRoomId) return;

        const newRooms = [...rooms];
        const srcIndex = newRooms.findIndex(r => r.id === draggedMusician.sourceRoomId);
        if (srcIndex !== -1) {
            const srcRoom = { ...newRooms[srcIndex] };
            srcRoom.occupants = srcRoom.occupants.filter(m => m.id !== draggedMusician.id);
            const g = new Set(srcRoom.occupants.map(m => m.genero));
            srcRoom.roomGender = srcRoom.occupants.length === 0 ? 'Mixto' : (g.has('F') && !g.has('M') ? 'F' : (g.has('M') && !g.has('F') ? 'M' : 'Mixto'));
            newRooms[srcIndex] = srcRoom;
            
            const newMusicians = [...musicians, draggedMusician].sort((a,b) => {
                if (a.isLocal !== b.isLocal) return a.isLocal ? 1 : -1;
                return a.apellido.localeCompare(b.apellido);
            });
            
            updateLocalState(newRooms, newMusicians);
            syncRoomOccupants(srcRoom.id, srcRoom.occupants);
        }
        setDraggedMusician(null); setIsDragging(false);
    };

    const handleDropOnNewRoom = async (e, bookingId) => {
        e.preventDefault();
        if (!draggedMusician) return;
        
        // Optimistic: quitamos de origen pero esperamos respuesta para la nueva hab
        let newRooms = [...rooms];
        let newMusicians = [...musicians];
        
        if (draggedMusician.sourceRoomId) {
            const srcIndex = newRooms.findIndex(r => r.id === draggedMusician.sourceRoomId);
            const srcRoom = { ...newRooms[srcIndex] };
            srcRoom.occupants = srcRoom.occupants.filter(m => m.id !== draggedMusician.id);
            newRooms[srcIndex] = srcRoom;
            syncRoomOccupants(srcRoom.id, srcRoom.occupants);
        } else {
            newMusicians = newMusicians.filter(m => m.id !== draggedMusician.id);
        }
        updateLocalState(newRooms, newMusicians);

        const { data } = await supabase.from('hospedaje_habitaciones').insert([{ 
            id_hospedaje: bookingId, tipo: 'Común', configuracion: 'Simple', 
            id_integrantes_asignados: [draggedMusician.id], orden: 9999 
        }]).select().single();

        if (data) {
             const newRoom = { ...data, occupants: [draggedMusician], roomGender: draggedMusician.genero === 'F' ? 'F' : 'M' };
             setRooms(prev => [...prev, newRoom]);
        }
        setDraggedMusician(null); setIsDragging(false);
    };

    const handleSaveRoom = async (roomData) => {
        if (roomData.id) {
            setRooms(prev => prev.map(r => r.id === roomData.id ? { ...r, ...roomData } : r));
            await supabase.from('hospedaje_habitaciones').update(roomData).eq('id', roomData.id);
        } else {
            const { data } = await supabase.from('hospedaje_habitaciones').insert([{ ...roomData, id_hospedaje: activeBookingIdForNewRoom, id_integrantes_asignados: [], orden: 9999 }]).select().single();
            if (data) setRooms(prev => [...prev, { ...data, occupants: [], roomGender: 'Mixto' }]);
        }
        setEditingRoomData(null);
    };

    const handleDeleteRoom = async (id) => {
        const roomToDelete = rooms.find(r => r.id === id);
        if (!roomToDelete) return;
        const newRooms = rooms.filter(r => r.id !== id);
        const newMusicians = [...musicians, ...(roomToDelete.occupants || [])].sort((a,b) => a.apellido.localeCompare(b.apellido));
        updateLocalState(newRooms, newMusicians);
        await supabase.from('hospedaje_habitaciones').delete().eq('id', id);
    };

    const handleRemoveFromRoom = (musician, roomId) => {
        const roomIndex = rooms.findIndex(r => r.id === roomId);
        if (roomIndex === -1) return;
        const newRooms = [...rooms];
        const targetRoom = { ...newRooms[roomIndex] };
        targetRoom.occupants = targetRoom.occupants.filter(m => m.id !== musician.id);
        newRooms[roomIndex] = targetRoom;
        const newMusicians = [...musicians, musician].sort((a,b) => a.apellido.localeCompare(b.apellido));
        updateLocalState(newRooms, newMusicians);
        syncRoomOccupants(roomId, targetRoom.occupants);
    };

    const handleMoveRoom = async (direction, currentRoom) => {
        const hotelRooms = rooms.filter(r => r.id_hospedaje === currentRoom.id_hospedaje).sort((a,b) => (a.orden||0) - (b.orden||0));
        const currentIndex = hotelRooms.findIndex(r => r.id === currentRoom.id);
        if ((direction === -1 && currentIndex === 0) || (direction === 1 && currentIndex === hotelRooms.length - 1)) return;
        
        const otherRoom = hotelRooms[currentIndex + direction];
        
        // Optimistic Swap Global
        const newRooms = [...rooms];
        const globalIdxA = newRooms.findIndex(r => r.id === currentRoom.id);
        const globalIdxB = newRooms.findIndex(r => r.id === otherRoom.id);
        
        newRooms[globalIdxA] = otherRoom;
        newRooms[globalIdxB] = currentRoom;
        setRooms(newRooms);

        await supabase.from('hospedaje_habitaciones').update({ orden: otherRoom.orden || 0 }).eq('id', currentRoom.id);
        await supabase.from('hospedaje_habitaciones').update({ orden: currentRoom.orden || 0 }).eq('id', otherRoom.id);
    };

    // UI Helpers
    const getCapacityLabel = (count) => { if (count === 0) return 'Vacía'; if (count === 1) return 'Single'; if (count === 2) return 'Doble'; if (count === 3) return 'Triple'; return `Múltiple (${count})`; };
    const getRoomColor = (count) => { if (count === 0) return 'bg-slate-50 border-slate-200'; if (count === 1) return 'bg-blue-50 border-blue-200 text-blue-800'; if (count === 2) return 'bg-emerald-50 border-emerald-200 text-emerald-800'; if (count === 3) return 'bg-amber-50 border-amber-200 text-amber-800'; return 'bg-rose-50 border-rose-200 text-rose-800'; };
    const women = musicians.filter(m => m.genero === 'F');
    const men = musicians.filter(m => m.genero !== 'F');

    return (
        <div className="flex flex-col h-full bg-slate-50 animate-in fade-in">
            {/* Header */}
            <div className="bg-white p-3 border-b border-slate-200 shadow-sm shrink-0">
                <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-3">
                        <button onClick={onBack} className="text-slate-400 hover:text-indigo-600 font-medium text-sm flex items-center gap-1">← Volver</button>
                        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">Gestión Integral Rooming</h2>
                    </div>
                </div>
            </div>

            {(showRoomForm || editingRoomData) && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"><RoomForm initialData={editingRoomData} onSubmit={handleSaveRoom} onClose={() => { setShowRoomForm(false); setEditingRoomData(null); }} /></div>}

            {loading && rooms.length === 0 ? <div className="text-center p-10"><IconLoader className="animate-spin inline text-indigo-600"/></div> : (
                <div className="flex-1 overflow-hidden flex p-4 gap-4">
                    <MusicianListColumn title="Mujeres" color="pink" musicians={women} isDragging={isDragging} onDragStart={handleDragStart} onDragOver={handleDragOver} onDrop={handleDropOnUnassigned} />
                    
                    <div className="flex-1 overflow-y-auto pr-2 space-y-8">
                        {bookings.map(bk => {
                            const hotelRooms = rooms.filter(r => r.id_hospedaje === bk.id);
                            const roomsF = hotelRooms.filter(r => r.roomGender === 'F');
                            const roomsM = hotelRooms.filter(r => r.roomGender === 'M');
                            const roomsMix = hotelRooms.filter(r => r.roomGender === 'Mixto');

                            return (
                                <div key={bk.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                                    <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100">
                                        <h3 className="font-bold text-indigo-900 flex items-center gap-2"><IconHotel/> {bk.hoteles.nombre} <span className="text-slate-400 font-normal text-xs">({bk.hoteles.localidades.localidad})</span></h3>
                                        <div className="text-xs text-slate-500 font-mono">Habitaciones: {hotelRooms.length} | Pax: {hotelRooms.reduce((acc, r) => acc + r.occupants.length, 0)}</div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="flex flex-col gap-3">
                                            <h5 className="text-[10px] font-bold text-slate-400 text-center uppercase tracking-widest">Femeninas</h5>
                                            {roomsF.map((r, idx) => <RoomCard key={r.id} room={r} index={idx} total={roomsF.length} isDragging={isDragging} onDragStart={handleDragStart} onDragOver={handleDragOver} onDrop={handleDropOnRoom} onDelete={handleDeleteRoom} onEdit={() => setEditingRoomData(r)} onRemoveMusician={handleRemoveFromRoom} onMove={(dir, room) => handleMoveRoom(dir, room)} getCapacityLabel={getCapacityLabel} getRoomColor={getRoomColor}/>)}
                                        </div>
                                        <div className="flex flex-col gap-3 px-2 border-x border-slate-100">
                                            <button onClick={() => { setActiveBookingIdForNewRoom(bk.id); setEditingRoomData(null); setShowRoomForm(true); }} className="w-full py-2 mb-2 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-lg hover:bg-indigo-100 font-bold flex justify-center gap-2 text-xs"><IconPlus size={16}/> Nueva</button>
                                            <div onDragOver={handleDragOver} onDrop={(e) => handleDropOnNewRoom(e, bk.id)} className={`flex flex-col items-center justify-center border-2 border-dashed border-indigo-200 text-indigo-300 rounded-xl hover:bg-indigo-50 transition-all h-20 cursor-pointer mb-4 ${isDragging ? 'bg-indigo-50 border-indigo-400' : ''}`}><IconPlus size={20}/> <span className="text-[10px] font-bold mt-1">Arrastrar para crear</span></div>
                                            <h5 className="text-[10px] font-bold text-slate-400 text-center uppercase tracking-widest">Mixtas / Vacías</h5>
                                            {roomsMix.map((r, idx) => <RoomCard key={r.id} room={r} index={idx} total={roomsMix.length} isDragging={isDragging} onDragStart={handleDragStart} onDragOver={handleDragOver} onDrop={handleDropOnRoom} onDelete={handleDeleteRoom} onEdit={() => setEditingRoomData(r)} onRemoveMusician={handleRemoveFromRoom} onMove={(dir, room) => handleMoveRoom(dir, room)} getCapacityLabel={getCapacityLabel} getRoomColor={getRoomColor}/>)}
                                        </div>
                                        <div className="flex flex-col gap-3">
                                            <h5 className="text-[10px] font-bold text-slate-400 text-center uppercase tracking-widest">Masculinas</h5>
                                            {roomsM.map((r, idx) => <RoomCard key={r.id} room={r} index={idx} total={roomsM.length} isDragging={isDragging} onDragStart={handleDragStart} onDragOver={handleDragOver} onDrop={handleDropOnRoom} onDelete={handleDeleteRoom} onEdit={() => setEditingRoomData(r)} onRemoveMusician={handleRemoveFromRoom} onMove={(dir, room) => handleMoveRoom(dir, room)} getCapacityLabel={getCapacityLabel} getRoomColor={getRoomColor}/>)}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    
                    <MusicianListColumn title="Hombres" color="blue" musicians={men} isDragging={isDragging} onDragStart={handleDragStart} onDragOver={handleDragOver} onDrop={handleDropOnUnassigned} />
                </div>
            )}
        </div>
    );
}