import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "../../context/AuthContext";
import { 
  IconCalendar, 
  IconMusic, 
  IconLoader, 
  IconAlertTriangle, 
  IconPlus, 
  IconFilter,
  IconMapPin,
  IconClock,
  IconUsers,
  IconEdit,
  IconEye,
  IconLayers,
  IconChevronDown,
  IconTrash // <--- Importar IconTrash
} from "../../components/ui/Icons";
import IndependentRehearsalForm from "./IndependentRehearsalForm";
import MassiveRehearsalGenerator from "./MassiveRehearsalGenerator";
import FilterDropdown from "../../components/ui/FilterDropdown";
import { format, addMonths } from "date-fns";
import { es } from "date-fns/locale";
import { useGiraRoster } from "../../hooks/useGiraRoster";

// --- UTILIDADES ---
const formatDateBox = (dateStr) => {
  if (!dateStr) return { day: "-", num: "-", month: "-" };
  try {
    const [y, m, d] = dateStr.split('-');
    const date = new Date(y, m - 1, d);
    return {
        day: format(date, "EEE", { locale: es }).toUpperCase().replace(".",""),
        num: format(date, "d"),
        month: format(date, "MMM", { locale: es }).toUpperCase().replace(".","")
    };
  } catch (e) {
    return { day: "-", num: "-", month: "-" };
  }
};

const formatTime = (timeStr) => timeStr ? timeStr.slice(0, 5) : "--:--";

const getTypeColor = (tipo) => {
    switch (tipo) {
        case "Sinfónico": return "bg-indigo-100 text-indigo-800 border-indigo-200";
        case "Ensamble": return "bg-emerald-100 text-emerald-800 border-emerald-200";
        case "Jazz Band": return "bg-amber-100 text-amber-800 border-amber-200";
        default: return "bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200";
    }
};

// --- COMPONENTE TARJETA DE ENSAYO ---
const RehearsalCardItem = ({ evt, activeMembersSet, supabase, onEdit, onDelete, isSuperUser }) => {
    const { day, num, month } = formatDateBox(evt.fecha);
    
    // 1. Calcular Involucrados
    let count = 0;
    let loadingRoster = false;

    const rosterHook = evt.programas ? useGiraRoster(supabase, evt.programas) : { roster: [], loading: false };
    
    if (evt.programas) {
        loadingRoster = rosterHook.loading;
        if (!loadingRoster) {
            const myInvolvedMembers = rosterHook.roster.filter(m => activeMembersSet.has(m.id) && m.estado_gira !== 'ausente');
            count = myInvolvedMembers.length;
        }
    } else {
        const baseCount = activeMembersSet.size; 
        const delta = (evt.deltaGuests || 0) - (evt.deltaAbsent || 0);
        count = Math.max(0, baseCount + delta); 
    }

    const isFull = activeMembersSet.size > 0 && count >= (activeMembersSet.size * 0.9);
    const isMyEvent = evt.isMyRehearsal;
    const deltaTotal = (evt.deltaGuests || 0) - (evt.deltaAbsent || 0);
    const deltaStr = deltaTotal > 0 ? `+${deltaTotal}` : deltaTotal.toString();
    
    const eventColor = evt.tipos_evento?.color || "#64748b"; 
    const tagStyle = { color: eventColor, backgroundColor: `${eventColor}15`, borderColor: `${eventColor}30` }; 

    return (
        <div className={`flex items-center p-2.5 border rounded-lg shadow-sm transition-all hover:shadow-md bg-white border-slate-200 ${!isMyEvent ? 'opacity-80' : ''}`} style={isMyEvent ? {} : { backgroundColor: '#f8fafc' }}>
            
            {/* FECHA */}
            <div className="flex flex-col items-center justify-center rounded-md p-1.5 w-12 mr-3 shrink-0 bg-slate-50 border border-slate-100">
                <span className="text-[9px] font-bold text-slate-400 uppercase leading-none mb-0.5">{day}</span>
                <span className="text-xl font-bold leading-none text-slate-700">{num}</span>
                <span className="text-[9px] font-bold text-slate-400 uppercase leading-none mt-0.5">{month}</span>
            </div>
            
            <div className="flex-1 min-w-0 pl-2 relative">
                <div className="absolute left-0 top-1 bottom-1 w-[3px] rounded-full" style={{ backgroundColor: eventColor }}></div>

                {/* LÍNEA 1: HORA + TÍTULO */}
                <div className="flex items-center gap-2 mb-1 pl-3">
                    <span className="text-xs font-bold font-mono text-slate-600">{formatTime(evt.hora_inicio)}</span>
                    <h3 className={`font-bold text-sm truncate ${isMyEvent ? 'text-slate-800' : 'text-slate-500'}`}>
                        {evt.descripcion || (evt.tipos_evento?.nombre || "Evento")}
                    </h3>
                    
                    {/* Badge de Convocados */}
                    {evt.programas && (
                        <span className={`ml-2 text-[9px] flex items-center gap-1 font-bold ${isFull ? 'text-green-600' : 'text-amber-600'}`} title="Integrantes del ensamble involucrados">
                            <IconUsers size={10}/>
                            {loadingRoster ? "..." : (isFull ? "Todos" : count)}
                        </span>
                    )}

                    {/* BOTONES EDITAR Y BORRAR (Solo mis ensayos tipo 13) */}
                    {isMyEvent && evt.id_tipo_evento === 13 && (
                        <div className="ml-auto flex items-center gap-1">
                            <button onClick={() => onEdit(evt)} className="text-slate-400 hover:text-indigo-600 p-1 rounded hover:bg-slate-100 transition-colors" title="Editar">
                                <IconEdit size={14} />
                            </button>
                            <button onClick={() => onDelete(evt.id)} className="text-slate-400 hover:text-red-600 p-1 rounded hover:bg-slate-100 transition-colors" title="Eliminar">
                                <IconTrash size={14} />
                            </button>
                        </div>
                    )}
                </div>
                
                {/* LÍNEA 2: DETALLES */}
                <div className="flex items-center gap-2 text-xs text-slate-500 pl-3">
                    <span className="text-[9px] px-1.5 rounded border font-bold uppercase tracking-wider" style={tagStyle}>
                        {evt.tipos_evento?.nombre}
                    </span>

                    <span className="flex items-center gap-1 truncate max-w-[120px]" title={evt.locaciones?.nombre}>
                        <IconMapPin size={10}/> {evt.locaciones?.nombre || "TBA"}
                    </span>
                    
                    {isMyEvent && (
                        <div className="flex items-center gap-1 ml-auto sm:ml-1">
                            {evt.eventos_ensambles?.map(ee => (
                                <span key={ee.ensambles?.id} className="text-[9px] bg-slate-100 text-slate-600 px-1.5 rounded border border-slate-200 whitespace-nowrap">
                                    {ee.ensambles?.ensamble}
                                </span>
                            ))}
                            {deltaTotal !== 0 && (
                                <div className={`px-1.5 rounded text-[9px] font-bold border ${deltaTotal > 0 ? 'text-emerald-600 border-emerald-200 bg-emerald-50' : 'text-red-600 border-red-200 bg-red-50'}`}>
                                    {deltaStr}
                                </div>
                            )}
                        </div>
                    )}
                    
                    {!isMyEvent && evt.programas && (
                        <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 rounded border border-slate-200 whitespace-nowrap ml-auto sm:ml-1">
                            {evt.programas.mes_letra} | {evt.programas.nomenclador}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};

// ... (ProgramCardItem se mantiene igual) ...
const ProgramCardItem = ({ program, activeMembersSet, supabase }) => {
    // ... (código existente) ...
    const { roster, loading } = useGiraRoster(supabase, program);

    if (loading) return (
        <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm animate-pulse h-24"></div>
    );

    const myInvolvedMembers = roster.filter(m => activeMembersSet.has(m.id) && m.estado_gira !== 'ausente');
    const count = myInvolvedMembers.length;
    
    if (count === 0 && program.tipo !== 'Ensamble') return null;

    const isFull = activeMembersSet.size > 0 && count >= (activeMembersSet.size * 0.9);

    const showMembersList = (e) => {
        e.stopPropagation();
        if (count === 0) return;
        const names = myInvolvedMembers.map(m => `• ${m.nombre} ${m.apellido}`).join("\n");
        alert(`Integrantes convocados (${count}):\n\n${names}`);
    };

    return (
        <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm hover:shadow-md transition-all flex flex-col justify-between h-full group">
            <div>
                <div className="flex justify-between items-start mb-1">
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider border bg-slate-50 text-slate-600 border-slate-200">
                        {program.tipo}
                    </span>
                    <button 
                        onClick={showMembersList}
                        className={`text-[10px] flex items-center gap-1 font-bold hover:underline ${isFull ? 'text-green-600' : 'text-amber-600'}`} 
                    >
                        <IconUsers size={12}/>
                        {isFull ? "Todos" : count}
                    </button>
                </div>
                <h3 className="font-bold text-slate-800 text-sm leading-tight group-hover:text-indigo-700 transition-colors">
                    {program.mes_letra} | {program.nomenclador} - {program.nombre_gira}
                </h3>
            </div>
            <div className="text-[10px] text-slate-500 flex items-center gap-1 pt-2 border-t border-slate-100 mt-2">
                <IconCalendar size={10}/> 
                {format(new Date(program.fecha_desde), "d MMM", {locale: es})} - {format(new Date(program.fecha_hasta), "d MMM", {locale: es})}
            </div>
        </div>
    );
};

export default function EnsembleCoordinatorView({ supabase }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  
  // ... (Estados existentes) ...
  const [allEnsembles, setAllEnsembles] = useState([]);
  const [myEnsembles, setMyEnsembles] = useState([]);   
  const [rawRelationships, setRawRelationships] = useState([]); 
  const [memberMetadata, setMemberMetadata] = useState({});
  const [adminFilterIds, setAdminFilterIds] = useState([]); 

  const [rehearsals, setRehearsals] = useState([]);
  const [programs, setPrograms] = useState([]); 
  const [listLoading, setListLoading] = useState(false);

  const [activeTab, setActiveTab] = useState("ensayos");
  const [showOverlapOptions, setShowOverlapOptions] = useState(false);
  
  const [overlapCategories, setOverlapCategories] = useState([]); 
  const [categoryOptions, setCategoryOptions] = useState([]);
  
  const [monthsLimit, setMonthsLimit] = useState(3);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMassiveModalOpen, setIsMassiveModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null); 

  const isSuperUser = user?.rol_sistema === 'admin' || user?.rol_sistema === 'produccion_general';

  // ... (useEffect de carga de contexto se mantiene igual) ...
  useEffect(() => {
    const fetchContext = async () => {
      if (!user) { setLoading(false); return; }
      setLoading(true);

      try {
        const { data: cats } = await supabase.from("categorias_tipos_eventos").select("id, nombre").order("nombre");
        setCategoryOptions(cats?.map(c => ({ id: c.id, label: c.nombre })) || []);

        let ensemblesToManage = [];
        if (isSuperUser) {
          const { data } = await supabase.from("ensambles").select("id, ensamble, descripcion").order("ensamble");
          setAllEnsembles(data || []);
          ensemblesToManage = data || [];
        } else {
          const { data: coordData } = await supabase
            .from("ensambles_coordinadores")
            .select(`id_ensamble, ensambles ( id, ensamble, descripcion )`)
            .eq("id_integrante", user.id);
          ensemblesToManage = coordData ? coordData.map(c => c.ensambles).filter(Boolean) : [];
        }
        setMyEnsembles(ensemblesToManage);

        if (ensemblesToManage.length > 0) {
            const ids = ensemblesToManage.map(e => e.id);
            const { data: relData } = await supabase.from("integrantes_ensambles").select("id_integrante, id_ensamble").in("id_ensamble", ids);
            setRawRelationships(relData || []);

            const uniqueMemberIds = [...new Set(relData?.map(r => r.id_integrante) || [])];
            if (uniqueMemberIds.length > 0) {
                const [memberInfos, otherEnsData] = await Promise.all([
                    supabase.from("integrantes").select("id, instrumentos(familia)").in("id", uniqueMemberIds),
                    supabase.from("integrantes_ensambles").select("id_integrante, id_ensamble").in("id_integrante", uniqueMemberIds)
                ]);
                const metaMap = {};
                uniqueMemberIds.forEach(id => {
                    const info = memberInfos.data?.find(m => m.id === id);
                    const otherEns = otherEnsData.data?.filter(oe => oe.id_integrante === id).map(oe => oe.id_ensamble) || [];
                    metaMap[id] = { family: info?.instrumentos?.familia, allEnsembles: otherEns };
                });
                setMemberMetadata(metaMap);
            }
        }
      } catch (error) {
        console.error("Error cargando contexto:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchContext();
  }, [user, supabase, isSuperUser]);

  const activeEnsembles = useMemo(() => {
    if (isSuperUser && adminFilterIds.length > 0) return myEnsembles.filter(e => adminFilterIds.includes(e.id));
    return myEnsembles;
  }, [isSuperUser, adminFilterIds, myEnsembles]);

  const activeMembersSet = useMemo(() => {
      const activeEnsembleIds = new Set(activeEnsembles.map(e => e.id));
      const memberIds = rawRelationships.filter(r => activeEnsembleIds.has(r.id_ensamble)).map(r => r.id_integrante);
      return new Set(memberIds);
  }, [activeEnsembles, rawRelationships]);

  const activeMemberIdsArray = useMemo(() => Array.from(activeMembersSet), [activeMembersSet]);

  const fetchDataList = useCallback(async () => {
    // ... (Lógica de fetch se mantiene igual que la versión anterior corregida) ...
    if (activeEnsembles.length === 0) {
        setRehearsals([]);
        setPrograms([]);
        return;
    }
    setListLoading(true);
    const ensembleIds = activeEnsembles.map(e => e.id);
    const todayISO = new Date().toISOString().split('T')[0];
    const endDateLimit = addMonths(new Date(), monthsLimit).toISOString().split('T')[0];

    try {
      if (activeTab === "ensayos") {
        let allEvents = [];
        const seenEventIds = new Set();

        const { data: myRehearsals } = await supabase
          .from("eventos_ensambles")
          .select(`
            eventos (
              id, fecha, hora_inicio, hora_fin, descripcion, id_tipo_evento, id_locacion, id_gira,
              locaciones ( nombre, localidades(localidad) ),
              tipos_evento ( nombre, color, id_categoria ),
              programas ( id, nombre_gira, mes_letra, nomenclador ),
              eventos_programas_asociados ( programas ( id, nombre_gira, mes_letra, nomenclador ) ),
              eventos_ensambles ( ensambles ( id, ensamble ) ),
              eventos_asistencia_custom ( tipo ) 
            )
          `)
          .in("id_ensamble", ensembleIds)
          .gte("eventos.fecha", todayISO)
          .lte("eventos.fecha", endDateLimit);

        if (myRehearsals) {
            myRehearsals.forEach(r => {
                if (r.eventos && !seenEventIds.has(r.eventos.id)) {
                    seenEventIds.add(r.eventos.id);
                    const customs = r.eventos.eventos_asistencia_custom || [];
                    allEvents.push({
                        ...r.eventos, 
                        isMyRehearsal: true,
                        deltaGuests: customs.filter(c => c.tipo === 'invitado' || c.tipo === 'adicional').length,
                        deltaAbsent: customs.filter(c => c.tipo === 'ausente').length
                    });
                }
            });
        }

        if (overlapCategories.length > 0 && activeMemberIdsArray.length > 0) {
            const targetGiraIds = new Set();
            const targetEventIds = new Set();

            const targetEnsembles = new Set(ensembleIds);
            const targetFamilies = new Set();
            activeMemberIdsArray.forEach(mid => {
                const meta = memberMetadata[mid];
                if (meta?.family) targetFamilies.add(meta.family);
                meta?.allEnsembles?.forEach(eid => {
                    if (!ensembleIds.includes(eid)) {
                    }
                });
            });

            const { data: sources } = await supabase.from("giras_fuentes").select("id_gira, tipo, valor_id, valor_texto");
            sources?.forEach(s => {
                if (s.tipo === 'ENSAMBLE' && targetEnsembles.has(s.valor_id)) targetGiraIds.add(s.id_gira);
                if (s.tipo === 'FAMILIA' && targetFamilies.has(s.valor_texto)) targetGiraIds.add(s.id_gira);
            });

            const { data: memberGiras } = await supabase.from("giras_integrantes").select("id_gira").in("id_integrante", activeMemberIdsArray).eq("estado", "confirmado");
            memberGiras?.forEach(x => targetGiraIds.add(x.id_gira));

            const { data: customInvites } = await supabase.from("eventos_asistencia_custom").select("id_evento").in("id_integrante", activeMemberIdsArray).neq("tipo", "ausente");
            customInvites?.forEach(x => targetEventIds.add(x.id_evento));

            const otherEnsembleIds = new Set();
            activeMemberIdsArray.forEach(mid => memberMetadata[mid]?.allEnsembles?.forEach(eid => !ensembleIds.includes(eid) && otherEnsembleIds.add(eid)));
            if (otherEnsembleIds.size > 0) {
                const { data: oee } = await supabase.from("eventos_ensambles").select("id_evento").in("id_ensamble", Array.from(otherEnsembleIds));
                oee?.forEach(x => targetEventIds.add(x.id_evento));
            }

            const giraIdsArray = Array.from(targetGiraIds);
            const eventIdsArray = Array.from(targetEventIds);

            if (giraIdsArray.length > 0 || eventIdsArray.length > 0) {
                let query = supabase.from("eventos").select(`
                    id, fecha, hora_inicio, hora_fin, descripcion, id_tipo_evento, id_locacion, id_gira,
                    locaciones ( nombre, localidades(localidad) ),
                    tipos_evento!inner ( nombre, color, id_categoria ),
                    programas ( id, nombre_gira, mes_letra, nomenclador )
                `)
                .in("tipos_evento.id_categoria", overlapCategories)
                .gte("fecha", todayISO)
                .lte("fecha", endDateLimit);

                const orParts = [];
                if (giraIdsArray.length > 0) orParts.push(`id_gira.in.(${giraIdsArray.join(',')})`);
                if (eventIdsArray.length > 0) orParts.push(`id.in.(${eventIdsArray.join(',')})`);
                
                if (orParts.length > 0) {
                    query = query.or(orParts.join(','));
                    const { data: extraEvents } = await query;
                    
                    if (extraEvents) {
                        extraEvents.forEach(e => {
                            if (!seenEventIds.has(e.id)) {
                                seenEventIds.add(e.id);
                                allEvents.push({ ...e, isMyRehearsal: false });
                            }
                        });
                    }
                }
            }
        }

        allEvents.sort((a,b) => (a.fecha + a.hora_inicio).localeCompare(b.fecha + b.hora_inicio));
        setRehearsals(allEvents);

      } else {
        const targetEnsembles = new Set();
        const targetFamilies = new Set();
        activeMemberIdsArray.forEach(mid => {
            const meta = memberMetadata[mid];
            if (meta) {
                if (meta.family) targetFamilies.add(meta.family);
                if (meta.allEnsembles) meta.allEnsembles.forEach(e => targetEnsembles.add(e));
            }
        });
        const { data: allSources } = await supabase.from("giras_fuentes").select("id_gira, tipo, valor_id, valor_texto");
        const candidateGiraIds = new Set();
        allSources?.forEach(s => {
            if (s.tipo === 'ENSAMBLE' && targetEnsembles.has(s.valor_id)) candidateGiraIds.add(s.id_gira);
            if (s.tipo === 'FAMILIA' && targetFamilies.has(s.valor_texto)) candidateGiraIds.add(s.id_gira);
        });
        if (activeMemberIdsArray.length > 0) {
            const { data: memberPrograms } = await supabase.from("giras_integrantes").select("id_gira").in("id_integrante", activeMemberIdsArray);
            memberPrograms?.forEach(mp => candidateGiraIds.add(mp.id_gira));
        }
        const allIds = Array.from(candidateGiraIds);
        if (allIds.length === 0) setPrograms([]);
        else {
            const { data: candidates } = await supabase.from("programas")
                .select("id, nombre_gira, fecha_desde, fecha_hasta, tipo, zona, mes_letra, nomenclador")
                .in("id", allIds)
                .gte("fecha_hasta", todayISO) 
                .order("fecha_desde", { ascending: true });
            setPrograms(candidates || []);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setListLoading(false);
    }
  }, [activeTab, activeEnsembles, activeMemberIdsArray, memberMetadata, overlapCategories, monthsLimit, supabase]);

  useEffect(() => { fetchDataList(); }, [fetchDataList]);

  const handleEditRehearsal = (evt) => {
      setEditingEvent(evt);
      setIsModalOpen(true);
  };

  // --- FUNCIÓN DE ELIMINAR ---
  const handleDeleteRehearsal = async (id) => {
      if (!confirm("¿Estás seguro de que quieres eliminar este ensayo? Esta acción no se puede deshacer.")) return;
      
      setLoading(true);
      try {
          const { error } = await supabase.from("eventos").delete().eq("id", id);
          if (error) throw error;
          // Recargar lista
          fetchDataList();
      } catch (err) {
          alert("Error al eliminar: " + err.message);
      } finally {
          setLoading(false);
      }
  };

  if (loading) return <div className="h-full w-full flex items-center justify-center"><IconLoader className="animate-spin text-indigo-600" size={32}/></div>;

  const adminOptions = allEnsembles.map(e => ({ id: e.id, label: e.ensamble }));

  return (
    <div className="flex flex-col h-full bg-slate-50 p-4 md:p-6 gap-6 overflow-hidden">
      
      {/* HEADER + FILTRO ... (Igual) */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
                <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    Panel de Coordinación
                    {isSuperUser && <span className="text-[10px] bg-amber-100 text-amber-700 border border-amber-200 px-2 py-0.5 rounded uppercase tracking-wide">Admin</span>}
                </h1>
                <div className="flex flex-wrap gap-2 mt-2">
                    {activeEnsembles.map(e => (
                    <span key={e.id} className="text-xs font-bold px-2 py-1 bg-white text-slate-600 rounded border border-slate-200 shadow-sm flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                        {e.ensamble}
                    </span>
                    ))}
                </div>
            </div>
            <div className="flex gap-2">
                <button onClick={() => setIsMassiveModalOpen(true)} className="bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50 px-4 py-2 rounded-lg shadow-sm font-bold flex items-center gap-2 text-sm transition-all active:scale-95">
                    <IconCalendar size={18} /> <span className="hidden sm:inline">Masivo</span>
                </button>
                <button onClick={() => { setEditingEvent(null); setIsModalOpen(true); }} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg shadow-md font-bold flex items-center gap-2 text-sm transition-all active:scale-95">
                    <IconPlus size={18} /> <span className="hidden sm:inline">Nuevo Ensayo</span>
                </button>
            </div>
        </div>
        {isSuperUser && (
            <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm w-full md:w-auto self-start">
                <FilterDropdown placeholder="Filtrar por Ensamble..." options={adminOptions} selectedIds={adminFilterIds} onChange={setAdminFilterIds} />
            </div>
        )}
      </div>

      <div className="flex flex-col md:flex-row items-end justify-between border-b border-slate-200 bg-white rounded-t-lg px-4 pt-2 shadow-sm gap-2">
        <div className="flex">
            <button onClick={() => setActiveTab("ensayos")} className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === "ensayos" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500"}`}>Gestión de Ensayos</button>
            <button onClick={() => setActiveTab("programas")} className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === "programas" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500"}`}>Programas</button>
        </div>
        
        {activeTab === "ensayos" && (
            <div className="relative mb-2">
                <button onClick={() => setShowOverlapOptions(!showOverlapOptions)} className={`flex items-center gap-2 px-3 py-1 text-xs font-bold border rounded-lg ${overlapCategories.length > 0 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-white text-slate-500'}`}>
                    <IconEye size={14} /> {overlapCategories.length > 0 ? `+${overlapCategories.length} Filtros` : "Ver Superposiciones"}
                </button>
                {showOverlapOptions && (
                    <div className="absolute top-full right-0 mt-1 w-56 bg-white border border-slate-200 rounded-lg shadow-xl z-50 p-2">
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase mb-2 px-1">Categorías a mostrar</h4>
                        <div className="space-y-1 max-h-48 overflow-y-auto">
                            {categoryOptions.map(t => (
                                <label key={t.id} className="flex items-center gap-2 px-2 py-1 hover:bg-slate-50 rounded cursor-pointer">
                                    <input 
                                      type="checkbox" 
                                      className="rounded text-indigo-600" 
                                      checked={overlapCategories.includes(t.id)} 
                                      onChange={() => setOverlapCategories(prev => prev.includes(t.id) ? prev.filter(id => id !== t.id) : [...prev, t.id])} 
                                    />
                                    <span className="text-xs text-slate-700">{t.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        )}
      </div>

      <div className="flex-1 bg-white rounded-b-lg border border-slate-200 border-t-0 p-0 shadow-sm overflow-hidden relative">
        {listLoading ? <div className="h-full flex items-center justify-center text-slate-400"><IconLoader className="animate-spin mr-2"/> Cargando...</div> : (
            <div className="h-full overflow-y-auto p-4">
                
                {activeTab === "ensayos" && (
                    <>
                        {rehearsals.length > 0 ? (
                            <div className="grid grid-cols-1 gap-2">
                                {rehearsals.map(evt => (
                                    <RehearsalCardItem 
                                        key={evt.id} 
                                        evt={evt} 
                                        activeMembersSet={activeMembersSet} 
                                        supabase={supabase}
                                        onEdit={handleEditRehearsal}
                                        onDelete={handleDeleteRehearsal} // <--- Pasar handler
                                        isSuperUser={isSuperUser}
                                    />
                                ))}
                            </div>
                        ) : <div className="text-center py-10 text-slate-400">No hay eventos visibles.</div>}
                        
                        <div className="py-6 flex justify-center">
                            <button onClick={() => setMonthsLimit(prev => prev + 3)} className="flex items-center gap-2 text-xs font-bold text-indigo-600 bg-indigo-50 px-4 py-2 rounded-full hover:bg-indigo-100 transition-colors">
                                <IconChevronDown size={14}/> Cargar 3 meses más
                            </button>
                        </div>
                    </>
                )}

                {activeTab === "programas" && (
                    programs.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {programs.map(prog => <ProgramCardItem key={prog.id} program={prog} activeMembersSet={activeMembersSet} supabase={supabase} />)}
                        </div>
                    ) : <div className="text-center py-10 text-slate-400">No hay programas vinculados.</div>
                )}
            </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl relative"> 
            <IndependentRehearsalForm supabase={supabase} initialData={editingEvent} onSuccess={() => { setIsModalOpen(false); fetchDataList(); }} onCancel={() => setIsModalOpen(false)} />
          </div>
        </div>
      )}

      {isMassiveModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <MassiveRehearsalGenerator supabase={supabase} onSuccess={() => { setIsMassiveModalOpen(false); fetchDataList(); }} onCancel={() => setIsMassiveModalOpen(false)} />
        </div>
      )}
    </div>
  );
}