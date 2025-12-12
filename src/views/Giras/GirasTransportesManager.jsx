import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
    IconTrash, IconTruck, IconPlus, IconLoader, IconMapPin, 
    IconCalendar, IconClock, IconEye, IconEyeOff, IconSearch, IconX, IconEdit, IconSave,
    IconUpload, IconDownload 
} from '../../components/ui/Icons';
import DateInput from '../../components/ui/DateInput';
import TimeInput from '../../components/ui/TimeInput';
// Note: We don't import the hook here yet because this view is for DEFINITION of transports, 
// not assignment of people (yet). But we leave it ready if you want to filter local locations.

// --- LOCATION SEARCH COMPONENT (Unchanged) ---
const LocationSearchInput = ({ locations, value, onChange, placeholder = "Buscar lugar..." }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState("");
    const containerRef = useRef(null);
    const [dropdownStyle, setDropdownStyle] = useState({});

    const selectedItem = useMemo(() => locations.find(l => l.id === value), [locations, value]);

    const filteredOptions = useMemo(() => {
        if (!search) return locations.slice(0, 50);
        const lowerSearch = search.toLowerCase();
        return locations.filter(l => 
            l.nombre.toLowerCase().includes(lowerSearch) || 
            l.ciudad.toLowerCase().includes(lowerSearch)
        );
    }, [locations, search]);

    useEffect(() => {
        if (isOpen && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            setDropdownStyle({
                top: rect.bottom + window.scrollY + 5,
                left: rect.left + window.scrollX,
                width: rect.width,
                minWidth: '250px',
                zIndex: 99999
            });
        }
    }, [isOpen]);

    useEffect(() => {
        const handleClick = (e) => {
            if (isOpen && containerRef.current && !containerRef.current.contains(e.target) && !e.target.closest('.loc-portal-dropdown')) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [isOpen]);

    const handleSelect = (id) => {
        onChange(id);
        setIsOpen(false);
        setSearch("");
    };

    return (
        <div className="relative w-full" ref={containerRef}>
            <div 
                onClick={() => setIsOpen(true)}
                className={`w-full h-8 flex items-center px-2 border rounded text-xs cursor-text bg-white ${isOpen ? 'border-indigo-500 ring-1 ring-indigo-500' : 'border-slate-300'}`}
            >
                {selectedItem ? (
                    <div className="flex items-center justify-between w-full">
                        <span className="truncate text-slate-700 font-medium">
                            {selectedItem.nombre} <span className="text-slate-400 font-normal">({selectedItem.ciudad})</span>
                        </span>
                        <button onClick={(e) => { e.stopPropagation(); onChange(null); }} className="p-0.5 hover:bg-slate-100 rounded text-slate-400"><IconX size={12}/></button>
                    </div>
                ) : (
                    <span className="text-slate-400">{placeholder}</span>
                )}
            </div>
            {isOpen && createPortal(
                <div className="loc-portal-dropdown fixed bg-white border border-slate-300 shadow-xl rounded-lg flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-100" style={dropdownStyle}>
                    <div className="p-2 border-b border-slate-100 bg-slate-50">
                        <div className="relative">
                            <IconSearch size={14} className="absolute left-2 top-2 text-slate-400"/>
                            <input type="text" className="w-full pl-7 pr-2 py-1.5 text-xs border rounded outline-none focus:border-indigo-500" placeholder="Escribí ciudad o lugar..." value={search} onChange={e => setSearch(e.target.value)} autoFocus/>
                        </div>
                    </div>
                    <div className="overflow-y-auto max-h-60">
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map(opt => (
                                <div key={opt.id} onClick={() => handleSelect(opt.id)} className={`px-3 py-2 text-xs cursor-pointer hover:bg-indigo-50 border-b border-slate-50 last:border-0 flex flex-col ${value === opt.id ? 'bg-indigo-50' : ''}`}>
                                    <span className="font-bold text-slate-700">{opt.nombre}</span>
                                    <span className="text-[10px] text-slate-500">{opt.ciudad}</span>
                                </div>
                            ))
                        ) : (
                            <div className="p-4 text-center text-slate-400 text-xs italic">No se encontraron lugares.</div>
                        )}
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default function GirasTransportesManager({ supabase, giraId }) {
  const [transports, setTransports] = useState([]);
  const [catalog, setCatalog] = useState([]); 
  const [locationsList, setLocationsList] = useState([]); 
  const [transportEvents, setTransportEvents] = useState({}); 
  const [paxInfo, setPaxInfo] = useState({}); 
  
  const [loading, setLoading] = useState(false);
  const [newTransp, setNewTransp] = useState({ id_transporte: '', detalle: '', costo: '' });
  
  const [activeTransportId, setActiveTransportId] = useState(null); 
  const [editingEventId, setEditingEventId] = useState(null); 
  const [newEvent, setNewEvent] = useState({
      fecha: '',
      hora: '',
      id_locacion: null, 
      descripcion: '', 
      id_tipo_evento: '11'
  });

  useEffect(() => {
    if (giraId) fetchData();
  }, [giraId]);

  const fetchData = async () => {
    setLoading(true);
    try {
        // 1. CARGA DE CATÁLOGOS
        const [catData, locData, regData, cityData, musData] = await Promise.all([
            supabase.from('transportes').select('*').order('nombre'),
            supabase.from('locaciones').select('id, nombre, localidades(localidad)').order('nombre'),
            supabase.from('regiones').select('id, region'),
            supabase.from('localidades').select('id, localidad'),
            supabase.from('integrantes').select('id, nombre, apellido')
        ]);

        const catalogList = catData.data || [];
        setCatalog(catalogList);

        const regionsMap = (regData.data || []).reduce((acc, r) => ({ ...acc, [r.id]: r.region }), {});
        const citiesMap = (cityData.data || []).reduce((acc, c) => ({ ...acc, [c.id]: c.localidad }), {});
        const musiciansMap = (musData.data || []).reduce((acc, m) => ({ ...acc, [m.id]: `${m.apellido} ${m.nombre}` }), {});

        const formattedLocs = (locData.data || []).map(l => ({
            id: l.id,
            nombre: l.nombre,
            ciudad: l.localidades?.localidad || "Sin ciudad"
        }));
        setLocationsList(formattedLocs);

        // 2. Transportes de la Gira
        const { data: list } = await supabase.from('giras_transportes').select(`id, detalle, costo, id_transporte, transportes ( nombre )`).eq('id_gira', giraId).order('id');
        setTransports(list || []);

        // 3. Eventos y Reglas
        if (list && list.length > 0) {
            const tIds = list.map(t => t.id);
            const { data: evts } = await supabase
                .from('eventos')
                .select(`id, fecha, hora_inicio, descripcion, id_tipo_evento, id_gira_transporte, id_locacion, locaciones(nombre)`)
                .in('id_gira_transporte', tIds)
                .order('fecha', { ascending: true })
                .order('hora_inicio', { ascending: true });
            
            const map = {};
            evts?.forEach(e => {
                if (!map[e.id_gira_transporte]) map[e.id_gira_transporte] = [];
                map[e.id_gira_transporte].push(e);
            });
            setTransportEvents(map);

            // 4. FETCH DE REGLAS DE TRANSPORTE (Para mostrar resumen)
            const { data: rules } = await supabase
                .from('giras_logistica_reglas_transportes')
                .select(`
                    id_evento_subida, 
                    id_evento_bajada, 
                    giras_logistica_reglas ( alcance, target_ids )
                `)
                .in('id_gira_transporte', tIds);

            const paxMap = {};
            
            rules?.forEach(r => {
                const ruleData = r.giras_logistica_reglas;
                if (!ruleData) return;

                let label = "";
                const targets = ruleData.target_ids || [];

                if (ruleData.alcance === 'General') {
                    label = "Todos (General)";
                } else if (targets.length === 0) {
                    label = `${ruleData.alcance} (Todos)`;
                } else {
                    let names = [];
                    if (ruleData.alcance === 'Region') {
                        names = targets.map(id => regionsMap[id] || `Reg.${id}`);
                        label = `Región: ${names.join(', ')}`;
                    } else if (ruleData.alcance === 'Localidad') {
                        names = targets.map(id => citiesMap[id] || `Loc.${id}`);
                        label = `Loc: ${names.join(', ')}`;
                    } else if (['Categoria', 'Instrumento'].includes(ruleData.alcance)) {
                        names = targets.map(t => String(t).charAt(0).toUpperCase() + String(t).slice(1).toLowerCase().replace('_', ' '));
                        label = names.join(', ');
                    } else if (ruleData.alcance === 'Persona') {
                        names = targets.map(id => musiciansMap[id] || 'Desconocido');
                        label = names.length > 5 ? `${names.slice(0, 5).join(', ')} y ${names.length - 5} más` : names.join(', ');
                    }
                }

                if (r.id_evento_subida) {
                    if (!paxMap[r.id_evento_subida]) paxMap[r.id_evento_subida] = { up: [], down: [] };
                    if (!paxMap[r.id_evento_subida].up.includes(label)) paxMap[r.id_evento_subida].up.push(label);
                }
                if (r.id_evento_bajada) {
                    if (!paxMap[r.id_evento_bajada]) paxMap[r.id_evento_bajada] = { up: [], down: [] };
                    if (!paxMap[r.id_evento_bajada].down.includes(label)) paxMap[r.id_evento_bajada].down.push(label);
                }
            });
            setPaxInfo(paxMap);
        }
    } catch (e) { console.error("Error:", e); } finally { setLoading(false); }
  };

  const formatDateSafe = (dateString) => {
      if (!dateString) return '-';
      const [year, month, day] = dateString.split('-');
      return `${day}/${month}`;
  };

  const handleAddTransport = async () => {
    if (!newTransp.id_transporte) return alert("Selecciona tipo");
    await supabase.from('giras_transportes').insert([{
      id_gira: giraId,
      id_transporte: parseInt(newTransp.id_transporte),
      detalle: newTransp.detalle,
      costo: parseFloat(newTransp.costo) || 0
    }]);
    setNewTransp({ id_transporte: '', detalle: '', costo: '' });
    fetchData();
  };

  const handleDeleteTransport = async (id) => {
    if(!confirm("Se borrará el transporte y SUS EVENTOS. ¿Seguro?")) return;
    await supabase.from('giras_transportes').delete().eq('id', id);
    fetchData();
  };

  const handleSaveEvent = async (transportId) => {
      if (!newEvent.fecha || !newEvent.hora || !newEvent.id_locacion) return alert("Fecha, hora y lugar obligatorios");
      let desc = newEvent.descripcion;
      if (!desc) {
          const loc = locationsList.find(l => l.id === newEvent.id_locacion);
          desc = loc ? `${loc.nombre} (${loc.ciudad})` : "Parada de transporte";
      }
      const payload = {
          id_gira: giraId, id_gira_transporte: transportId, fecha: newEvent.fecha,
          hora_inicio: newEvent.hora, id_locacion: newEvent.id_locacion, descripcion: desc,
          id_tipo_evento: parseInt(newEvent.id_tipo_evento), convocados: [] 
      };
      if (editingEventId) await supabase.from('eventos').update(payload).eq('id', editingEventId);
      else await supabase.from('eventos').insert([payload]);
      
      setNewEvent({ fecha: '', hora: '', id_locacion: null, descripcion: '', id_tipo_evento: '11' });
      setEditingEventId(null);
      fetchData();
  };

  const startEditEvent = (evt) => {
      setEditingEventId(evt.id);
      setNewEvent({ fecha: evt.fecha, hora: evt.hora_inicio, id_locacion: evt.id_locacion, descripcion: evt.descripcion, id_tipo_evento: evt.id_tipo_evento.toString() });
  };

  const cancelEdit = () => { setEditingEventId(null); setNewEvent({ fecha: '', hora: '', id_locacion: null, descripcion: '', id_tipo_evento: '11' }); };
  const handleDeleteEvent = async (eventId) => {
      if(!confirm("¿Borrar parada?")) return;
      await supabase.from('eventos').delete().eq('id', eventId);
      if (editingEventId === eventId) cancelEdit();
      fetchData();
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow-sm border border-slate-200 max-w-5xl mx-auto">
      <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2 border-b pb-2"><IconTruck className="text-indigo-600"/> Flota y Recorridos</h3>
      <div className="flex gap-2 mb-6 items-end bg-slate-50 p-3 rounded-lg border border-slate-200">
        <div className="w-1/4">
            <label className="text-[10px] font-bold text-slate-500">TIPO</label>
            <select className="w-full text-xs border p-2 rounded" value={newTransp.id_transporte} onChange={e => setNewTransp({...newTransp, id_transporte: e.target.value})}>
                <option value="">Seleccionar...</option>
                {catalog.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
        </div>
        <div className="flex-1">
            <label className="text-[10px] font-bold text-slate-500">DETALLE (Patente/Empresa)</label>
            <input type="text" className="w-full text-xs border p-2 rounded" placeholder="Ej: Interno 404" value={newTransp.detalle} onChange={e => setNewTransp({...newTransp, detalle: e.target.value})}/>
        </div>
        <button onClick={handleAddTransport} className="bg-indigo-600 text-white p-2 rounded hover:bg-indigo-700"><IconPlus size={18}/></button>
      </div>

      <div className="space-y-4">
        {transports.map(t => {
            const isExpanded = activeTransportId === t.id;
            const myEvents = transportEvents[t.id] || [];
            return (
                <div key={t.id} className={`border rounded-lg transition-all ${isExpanded ? 'border-indigo-300 shadow-md bg-white' : 'border-slate-200 hover:border-indigo-200 bg-white'}`}>
                    <div className="p-3 flex justify-between items-center cursor-pointer" onClick={() => { setActiveTransportId(isExpanded ? null : t.id); cancelEdit(); }}>
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-full ${isExpanded ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}><IconTruck size={20}/></div>
                            <div>
                                <div className="font-bold text-slate-800">{t.detalle || "Sin detalle"}</div>
                                <div className="text-xs text-slate-500 uppercase font-bold flex items-center gap-2">{t.transportes?.nombre}<span className="bg-slate-100 px-1.5 py-0.5 rounded text-[9px] border border-slate-200">{myEvents.length} paradas</span></div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {isExpanded && <button onClick={(e) => {e.stopPropagation(); handleDeleteTransport(t.id);}} className="text-red-400 hover:text-red-600 p-2"><IconTrash size={16}/></button>}
                            <div className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''} text-slate-400`}>▼</div>
                        </div>
                    </div>
                    {isExpanded && (
                        <div className="border-t border-indigo-100 bg-indigo-50/30 p-4 animate-in slide-in-from-top-2">
                            <h4 className="text-xs font-bold text-indigo-900 uppercase mb-3 flex items-center gap-2"><IconMapPin size={12}/> Recorrido y Paradas</h4>
                            <div className="space-y-2 mb-4">
                                {myEvents.map((evt, idx) => {
                                    const isEditingThis = editingEventId === evt.id;
                                    const pax = paxInfo[evt.id] || { up: [], down: [] };
                                    return (
                                        <div key={evt.id} className={`flex items-center gap-3 p-2 rounded border text-xs relative group transition-colors ${isEditingThis ? 'bg-amber-50 border-amber-300 ring-1 ring-amber-300' : 'bg-white border-slate-200'}`}>
                                            <div className="w-6 text-center font-bold text-slate-400 text-[10px]">{idx + 1}</div>
                                            <div className="flex items-center gap-1 text-slate-700 font-mono bg-slate-50 px-1 rounded border border-slate-100 shrink-0"><IconCalendar size={10}/> {formatDateSafe(evt.fecha)}<span className="mx-1">|</span><IconClock size={10}/> {evt.hora_inicio?.slice(0,5)}</div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2"><span className="font-medium truncate">{evt.descripcion}</span>{evt.locaciones?.nombre && !evt.descripcion.includes(evt.locaciones.nombre) && (<span className="text-slate-400 font-normal truncate">({evt.locaciones.nombre})</span>)}</div>
                                                {(pax.up.length > 0 || pax.down.length > 0) && (
                                                    <div className="flex flex-wrap gap-2 mt-1.5">
                                                        {pax.up.length > 0 && (<div className="flex items-center gap-1 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded text-[10px] text-emerald-700" title={pax.up.join('\n')}><IconUpload size={10}/><span className="font-bold">Suben:</span> <span className="truncate max-w-[300px]">{pax.up.join(', ')}</span></div>)}
                                                        {pax.down.length > 0 && (<div className="flex items-center gap-1 bg-rose-50 border border-rose-100 px-1.5 py-0.5 rounded text-[10px] text-rose-700" title={pax.down.join('\n')}><IconDownload size={10}/><span className="font-bold">Bajan:</span> <span className="truncate max-w-[300px]">{pax.down.join(', ')}</span></div>)}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0 ml-2">
                                                {evt.id_tipo_evento === 11 ? <span className="text-[9px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded border border-green-200 flex items-center gap-1"><IconEye size={10}/></span> : <span className="text-[9px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded border border-gray-200 flex items-center gap-1"><IconEyeOff size={10}/></span>}
                                                <button onClick={() => startEditEvent(evt)} className="text-slate-300 hover:text-indigo-500 transition-opacity" title="Editar"><IconEdit size={14}/></button>
                                                <button onClick={() => handleDeleteEvent(evt.id)} className="text-slate-300 hover:text-red-500 transition-opacity" title="Eliminar"><IconTrash size={14}/></button>
                                            </div>
                                        </div>
                                    );
                                })}
                                {myEvents.length === 0 && <div className="text-slate-400 text-xs italic ml-8">Sin recorrido definido.</div>}
                            </div>
                            <div className={`flex items-end gap-2 p-2 rounded border transition-colors flex-wrap ${editingEventId ? 'bg-amber-50 border-amber-200' : 'bg-white border-indigo-100'}`}>
                                <div className="w-24"><label className="text-[9px] font-bold text-slate-400 block mb-1">FECHA</label><DateInput value={newEvent.fecha} onChange={v => setNewEvent({...newEvent, fecha: v})} className="h-8 text-xs"/></div>
                                <div className="w-20"><label className="text-[9px] font-bold text-slate-400 block mb-1">HORA</label><TimeInput value={newEvent.hora} onChange={v => setNewEvent({...newEvent, hora: v})} className="h-8 text-xs"/></div>
                                <div className="flex-1 min-w-[200px]"><label className="text-[9px] font-bold text-slate-400 block mb-1">LUGAR</label><LocationSearchInput locations={locationsList} value={newEvent.id_locacion} onChange={(id) => setNewEvent({...newEvent, id_locacion: id})}/></div>
                                <div className="flex-1 min-w-[150px]"><label className="text-[9px] font-bold text-slate-400 block mb-1">NOTA</label><input type="text" className="w-full h-8 text-xs border border-slate-300 rounded px-2 outline-none focus:border-indigo-500 bg-white" placeholder="Detalle extra..." value={newEvent.descripcion} onChange={e => setNewEvent({...newEvent, descripcion: e.target.value})}/></div>
                                <div className="w-24"><label className="text-[9px] font-bold text-slate-400 block mb-1">VISIBILIDAD</label><select className="w-full h-8 text-xs border border-slate-300 rounded px-1 outline-none bg-white" value={newEvent.id_tipo_evento} onChange={e => setNewEvent({...newEvent, id_tipo_evento: e.target.value})}><option value="11">Público</option><option value="12">Interno</option></select></div>
                                {editingEventId ? (<div className="flex gap-1"><button onClick={cancelEdit} className="h-8 px-2 text-xs font-bold text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded">CANCELAR</button><button onClick={() => handleSaveEvent(t.id)} className="h-8 px-3 bg-amber-500 hover:bg-amber-600 text-white rounded flex items-center justify-center gap-1 transition-colors text-xs font-bold"><IconSave size={14}/> GUARDAR</button></div>) : (<button onClick={() => handleSaveEvent(t.id)} className="h-8 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded flex items-center justify-center transition-colors" title="Agregar Parada"><IconPlus size={16}/></button>)}
                            </div>
                        </div>
                    )}
                </div>
            );
        })}
      </div>
    </div>
  );
}