import React, { useState, useEffect, useMemo } from 'react';
import { IconTrash, IconPlus, IconArrowRight, IconLoader } from '../ui/Icons';

export default function TransportRuleEditor({ 
  supabase, 
  ruleId, 
  giraId, 
  onClose 
}) {
  const [fleet, setFleet] = useState([]); 
  const [allEvents, setAllEvents] = useState([]); // Todos los eventos de la gira
  const [legs, setLegs] = useState([]); 
  
  const [newLeg, setNewLeg] = useState({
    id_gira_transporte: '',
    id_evento_subida: '',
    id_evento_bajada: '',
    detalle: ''
  });

  useEffect(() => {
    loadMasterData();
    loadRuleLegs();
  }, []);

  const loadMasterData = async () => {
    // 1. Traer la flota
    const { data: fleetData } = await supabase
      .from('giras_transportes')
      .select('id, detalle, transportes(nombre)')
      .eq('id_gira', giraId);
    setFleet(fleetData || []);

    // 2. Traer eventos ordenados
    // AHORA INCLUIMOS id_gira_transporte Y descripcion EN EL SELECT
    const { data: eventsData } = await supabase
      .from('eventos')
      .select('id, fecha, hora_inicio, descripcion, id_tipo_evento, id_gira_transporte, locaciones(nombre), tipos_evento(nombre)')
      .eq('id_gira', giraId)
      .order('fecha', { ascending: true })
      .order('hora_inicio', { ascending: true });
    setAllEvents(eventsData || []);
  };

  const loadRuleLegs = async () => {
    const { data } = await supabase
      .from('giras_logistica_reglas_transportes')
      .select(`
        *,
        giras_transportes ( detalle, transportes(nombre) ),
        evento_subida:eventos!id_evento_subida ( descripcion, fecha, hora_inicio ),
        evento_bajada:eventos!id_evento_bajada ( descripcion, fecha, hora_inicio )
      `)
      .eq('id_regla', ruleId)
      .order('orden', { ascending: true });
    setLegs(data || []);
  };

  // --- FILTRADO INTELIGENTE ---
  // Filtramos los eventos para mostrar SOLO los que pertenecen al vehículo seleccionado
  const availableEvents = useMemo(() => {
      if (!newLeg.id_gira_transporte) return [];
      
      const transportId = parseInt(newLeg.id_gira_transporte);
      
      return allEvents.filter(e => {
          // Condición 1: Que sea del transporte seleccionado
          const matchesTransport = e.id_gira_transporte === transportId;
          
          // Condición 2: Que sea tipo 11 o 12 (Transporte)
          // Esto es opcional, pero ayuda a filtrar "ruido" si hubiera error de carga
          const isTransportType = e.id_tipo_evento === 11 || e.id_tipo_evento === 12;

          return matchesTransport && isTransportType;
      });
  }, [newLeg.id_gira_transporte, allEvents]);

  const handleAddLeg = async () => {
    if (!newLeg.id_gira_transporte || !newLeg.id_evento_subida || !newLeg.id_evento_bajada) {
      alert("Completa transporte, subida y bajada");
      return;
    }

    await supabase.from('giras_logistica_reglas_transportes').insert([{
      id_regla: ruleId,
      id_gira_transporte: newLeg.id_gira_transporte,
      id_evento_subida: newLeg.id_evento_subida,
      id_evento_bajada: newLeg.id_evento_bajada,
      detalle: newLeg.detalle,
      orden: legs.length + 1
    }]);

    setNewLeg({ id_gira_transporte: '', id_evento_subida: '', id_evento_bajada: '', detalle: '' });
    loadRuleLegs();
  };

  const handleDeleteLeg = async (id) => {
    await supabase.from('giras_logistica_reglas_transportes').delete().eq('id', id);
    loadRuleLegs();
  };

  const formatEventOption = (evt) => {
    const hora = evt.hora_inicio?.slice(0, 5);
    // Usamos formateo seguro de fecha
    const [y, m, d] = evt.fecha.split('-');
    const fecha = `${d}/${m}`;
    // Preferimos mostrar la descripción (ej: "Salida Hotel") que es más útil para transporte
    return `${fecha} ${hora} - ${evt.descripcion}`;
  };

  return (
    <div className="p-4 w-[500px] max-w-full bg-white rounded-lg shadow-xl border border-slate-200">
      <div className="flex justify-between items-center mb-4">
          <h4 className="font-bold text-slate-800">Configurar Tramos</h4>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
             <IconTrash size={16} className="rotate-45"/>
          </button>
      </div>

      {/* LISTA DE TRAMOS EXISTENTES */}
      <div className="space-y-2 mb-6 max-h-[300px] overflow-y-auto pr-1">
        {legs.map((leg, index) => (
          <div key={leg.id} className="bg-slate-50 border border-slate-200 rounded-lg p-3 relative group">
            <div className="flex justify-between items-start mb-2">
                <span className="text-[10px] font-bold uppercase bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded border border-indigo-200">
                    {index + 1}. {leg.giras_transportes?.transportes?.nombre}
                </span>
                <span className="text-xs text-slate-600 font-bold truncate max-w-[150px]">
                    {leg.giras_transportes?.detalle}
                </span>
            </div>
            
            <div className="flex items-center gap-2 text-xs text-slate-700 bg-white p-2 rounded border border-slate-100">
                <div className="flex-1 min-w-0">
                    <span className="text-[9px] text-emerald-600 font-black block">SUBEN</span> 
                    <span className="truncate block" title={leg.evento_subida?.descripcion}>
                        {leg.evento_subida?.descripcion}
                    </span>
                    <span className="text-[9px] text-slate-400">{leg.evento_subida?.hora_inicio?.slice(0,5)}</span>
                </div>
                <IconArrowRight size={14} className="text-slate-300 shrink-0"/>
                <div className="flex-1 min-w-0 text-right">
                     <span className="text-[9px] text-rose-500 font-black block">BAJAN</span>
                     <span className="truncate block" title={leg.evento_bajada?.descripcion}>
                        {leg.evento_bajada?.descripcion}
                     </span>
                     <span className="text-[9px] text-slate-400">{leg.evento_bajada?.hora_inicio?.slice(0,5)}</span>
                </div>
            </div>
            
            {leg.detalle && (
                <div className="mt-2 text-[10px] text-slate-500 italic border-t border-slate-200 pt-1 flex items-start gap-1">
                    <span className="font-bold not-italic">Nota:</span> {leg.detalle}
                </div>
            )}

            <button 
                onClick={() => handleDeleteLeg(leg.id)} 
                className="absolute -top-2 -right-2 bg-white text-slate-400 hover:text-red-500 border border-slate-200 shadow-sm p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            >
                <IconTrash size={14}/>
            </button>
          </div>
        ))}
        {legs.length === 0 && <p className="text-xs text-slate-400 text-center italic py-4 bg-slate-50 rounded border border-dashed border-slate-200">Sin tramos asignados.</p>}
      </div>

      {/* FORMULARIO DE NUEVO TRAMO */}
      <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-100">
        <label className="text-[10px] font-bold text-indigo-900 uppercase flex items-center gap-1">
            <IconPlus size={10}/> Nuevo Tramo
        </label>
        
        <div className="space-y-2 mt-2">
            {/* 1. SELECCIONAR VEHÍCULO */}
            <select 
                className="w-full text-xs p-2 rounded border border-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                value={newLeg.id_gira_transporte}
                onChange={e => setNewLeg({...newLeg, id_gira_transporte: e.target.value, id_evento_subida: '', id_evento_bajada: ''})}
            >
                <option value="">1. Seleccionar Vehículo...</option>
                {fleet.map(t => (
                    <option key={t.id} value={t.id}>
                        {t.transportes?.nombre} - {t.detalle}
                    </option>
                ))}
            </select>

            {/* AVISO SI NO HAY RECORRIDO */}
            {newLeg.id_gira_transporte && availableEvents.length === 0 && (
                <div className="text-[10px] text-amber-600 bg-amber-50 p-2 rounded border border-amber-100 italic flex items-start gap-2">
                    <span>⚠️</span>
                    <span>Este vehículo no tiene recorrido cargado. Ve a "Gestión de Flota" para agregar sus paradas.</span>
                </div>
            )}

            {/* 2. y 3. SELECCIONAR PARADAS (Solo si hay eventos disponibles) */}
            <div className="flex gap-2">
                <div className="flex-1 min-w-0">
                    <select 
                        className="w-full text-xs p-2 rounded border border-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white disabled:opacity-50 disabled:bg-slate-100"
                        value={newLeg.id_evento_subida}
                        onChange={e => setNewLeg({...newLeg, id_evento_subida: e.target.value})}
                        disabled={!newLeg.id_gira_transporte || availableEvents.length === 0}
                    >
                        <option value="">2. Suben en...</option>
                        {availableEvents.map(e => (
                            <option key={e.id} value={e.id}>{formatEventOption(e)}</option>
                        ))}
                    </select>
                </div>
                <div className="flex-1 min-w-0">
                    <select 
                        className="w-full text-xs p-2 rounded border border-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white disabled:opacity-50 disabled:bg-slate-100"
                        value={newLeg.id_evento_bajada}
                        onChange={e => setNewLeg({...newLeg, id_evento_bajada: e.target.value})}
                        disabled={!newLeg.id_gira_transporte || availableEvents.length === 0}
                    >
                        <option value="">3. Bajan en...</option>
                        {availableEvents.map(e => (
                            <option key={e.id} value={e.id}>{formatEventOption(e)}</option>
                        ))}
                    </select>
                </div>
            </div>

            <input 
                type="text" 
                placeholder="Detalle (opcional)" 
                className="w-full text-xs p-2 rounded border border-indigo-200 outline-none focus:ring-2 focus:ring-indigo-500"
                value={newLeg.detalle} 
                onChange={e => setNewLeg({...newLeg, detalle: e.target.value})}
            />

            <button 
                onClick={handleAddLeg} 
                className="w-full bg-indigo-600 text-white py-2 rounded-md text-xs font-bold hover:bg-indigo-700 shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!newLeg.id_gira_transporte || !newLeg.id_evento_subida || !newLeg.id_evento_bajada}
            >
                AGREGAR
            </button>
        </div>
      </div>
    </div>
  );
}