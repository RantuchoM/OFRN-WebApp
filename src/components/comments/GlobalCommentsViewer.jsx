import React, { useState, useEffect } from "react";
import {
  IconCheckCircle,
  IconX,
  IconLoader,
  IconAlertCircle,
  IconArrowRight,
  IconArchive,
  IconClock,
  IconEdit,
  IconSend,
  IconAtSign,
  IconLink,
  IconBed,
  IconMusic,
  IconCalendar,
  IconMessageCircle
} from "../ui/Icons";
import { format, isBefore, isToday, addDays, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { useAuth } from "../../context/AuthContext";

// --- COMPONENTE DE HILO (THREAD ITEM) ---
const GlobalThreadItem = ({
  thread,
  user,
  onReply,
  onResolve,
  onDelete,
  onUpdateDate,
  onNavigate,
  editingDateId,
  setEditingDateId,
  isGlobalView,
}) => {
  // Datos del contexto (tomamos del primer mensaje para info general)
  const contextData = thread.contextData;
  const messages = thread.messages; // Ya vienen ordenados cronológicamente
  
  // Para la lógica de "estado del hilo", miramos el último mensaje
  const lastMessage = messages[messages.length - 1];
  
  // Verificar si hay menciones en CUALQUIER mensaje del hilo
  const isMentionedInThread = messages.some(m => m.etiquetados?.includes(user.id));

  // Estado local para la edición de fecha
  const [tempDate, setTempDate] = useState(
    lastMessage.fecha_limite ? lastMessage.fecha_limite.split("T")[0] : ""
  );

  useEffect(() => {
    setTempDate(lastMessage.fecha_limite ? lastMessage.fecha_limite.split("T")[0] : "");
  }, [lastMessage.fecha_limite]);

  const handleSaveDate = () => {
    // Actualizamos la fecha sobre el último mensaje (que representa el estado actual del hilo)
    onUpdateDate(lastMessage.id, tempDate);
    setEditingDateId(null);
  };

  const handleClearDate = () => {
    onUpdateDate(lastMessage.id, null);
    setEditingDateId(null);
  };

  const getContextIcon = (type) => {
    if (type === "EVENTO") return <IconCalendar size={14} />;
    if (type === "OBRA") return <IconMusic size={14} />;
    if (type === "HABITACION") return <IconBed size={14} />;
    return <IconLink size={14} />;
  };

  const handleNavigate = () => {
    if (!onNavigate) return;
    let targetView = "AGENDA";
    if (contextData.entidad_tipo === "OBRA") targetView = "REPERTOIRE";
    if (contextData.entidad_tipo === "HABITACION") targetView = "LOGISTICS";
    if (contextData.entidad_tipo === "GIRA") targetView = "AGENDA";

    const targetGiraId = contextData.gira_id || (contextData.entidad_tipo === "GIRA" ? contextData.entidad_id : null);

    if (targetGiraId) {
      onNavigate(targetGiraId, targetView);
    } else {
      alert("No se pudo determinar la gira asociada.");
    }
  };

  // Cálculo de clases para la fecha límite
  let deadlineClass = "bg-slate-100 text-slate-500 border-slate-200";
  if (lastMessage.fecha_limite && !lastMessage.resuelto) {
    const d = parseISO(lastMessage.fecha_limite);
    const now = new Date();
    if (isBefore(d, new Date(now.setHours(0, 0, 0, 0)))) deadlineClass = "bg-red-100 text-red-600 border-red-200 font-bold";
    else if (isToday(d)) deadlineClass = "bg-orange-100 text-orange-600 border-orange-200 font-bold";
    else if (isBefore(d, addDays(now, 3))) deadlineClass = "bg-amber-100 text-amber-600 border-amber-200";
    else deadlineClass = "bg-indigo-50 text-indigo-600 border-indigo-200";
  }

  return (
    <div className={`bg-white rounded-lg border shadow-sm flex flex-col transition-all hover:shadow-md ${isMentionedInThread ? "border-l-4 border-l-indigo-500 ring-1 ring-indigo-50" : "border-slate-200"}`}>
      
      {/* 1. HEADER (Contexto) */}
      <div className="p-3 border-b border-slate-100 bg-slate-50/50 flex justify-between items-start rounded-t-lg">
        <div className="flex flex-col gap-1 max-w-[75%]">
          <div className="flex items-center gap-2 flex-wrap text-[10px] uppercase font-bold text-slate-400">
            {isGlobalView && contextData.nombre_gira ? (
              <>
                <span className="text-indigo-600 bg-indigo-50 px-1.5 rounded">{contextData.nombre_gira}</span>
                {contextData.nomenclador && <span className="text-slate-500 hidden sm:inline">{contextData.nomenclador}</span>}
                <span>•</span>
              </>
            ) : null}
            <span>{contextData.entidad_tipo}</span>
          </div>
          <span className="text-sm font-bold text-slate-800 truncate" title={contextData.contexto || "General"}>
            {contextData.contexto || "General"}
          </span>
        </div>

        <div className="flex gap-1 shrink-0">
          {onNavigate && (
            <button onClick={handleNavigate} className="p-1.5 rounded bg-slate-50 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 border border-transparent hover:border-indigo-100 transition-all mr-1" title="Ir al detalle">
              {getContextIcon(contextData.entidad_tipo)}
            </button>
          )}
          
          <button onClick={() => onReply(thread)} className="p-1.5 rounded hover:bg-indigo-50 text-indigo-500" title="Responder al hilo">
            <IconArrowRight size={16} />
          </button>
          
          <button onClick={() => onResolve(thread)} className="p-1.5 rounded hover:bg-emerald-50 text-slate-300 hover:text-emerald-600" title="Resolver Hilo Completo">
            <IconCheckCircle size={16} />
          </button>
        </div>
      </div>

      {/* 2. BODY (Lista de Mensajes) */}
      <div className="p-3 flex flex-col gap-3">
        {messages.map((msg) => {
            const isMine = msg.id_autor === user.id;
            return (
                <div key={msg.id} className="flex flex-col gap-1 group/msg">
                    <div className="flex justify-between items-baseline">
                        <div className="flex items-center gap-2">
                            <span className={`text-xs font-bold ${isMine ? 'text-indigo-700' : 'text-slate-700'}`}>
                                {isMine ? 'Yo' : `${msg.integrantes?.nombre} ${msg.integrantes?.apellido}`}
                            </span>
                            <span className="text-[10px] text-slate-400">
                                {format(new Date(msg.created_at), "dd/MM HH:mm", { locale: es })}
                            </span>
                        </div>
                        {(isMine || user.rol_sistema === 'admin') && (
                            <button onClick={() => onDelete(msg.id)} className="opacity-0 group-hover/msg:opacity-100 text-slate-300 hover:text-red-400 transition-opacity" title="Eliminar mensaje">
                                <IconArchive size={12}/>
                            </button>
                        )}
                    </div>
                    <p className="text-sm text-slate-600 whitespace-pre-wrap pl-2 border-l-2 border-slate-100">
                        {msg.contenido}
                    </p>
                </div>
            );
        })}
      </div>

      {/* 3. FOOTER (Fecha y Menciones) */}
      <div className="px-3 py-2 border-t border-slate-50 flex justify-between items-center bg-slate-50/30 rounded-b-lg">
         <div className="flex items-center gap-2">
            {/* Edición de Fecha (sobre el último mensaje) */}
            <div className="flex items-center group/date">
              {editingDateId === thread.key ? (
                <div className="flex items-center gap-1 bg-white border border-indigo-300 rounded px-1 shadow-sm z-10 animate-in zoom-in-95">
                  <input
                    type="date"
                    className="text-[10px] py-0.5 bg-transparent outline-none w-24"
                    value={tempDate}
                    onChange={(e) => setTempDate(e.target.value)}
                    onBlur={handleSaveDate}
                    onKeyDown={(e) => e.key === "Enter" && handleSaveDate()}
                    autoFocus
                  />
                  <button onMouseDown={handleClearDate} className="text-red-400 hover:text-red-600 p-0.5 hover:bg-red-50 rounded">
                    <IconX size={12} />
                  </button>
                </div>
              ) : (
                <div
                  className={`text-[9px] px-1.5 py-0.5 rounded border flex items-center gap-1 cursor-pointer hover:shadow-sm transition-colors ${deadlineClass}`}
                  onClick={() => {
                    if (messages.some(m => m.id_autor === user.id) || user.rol_sistema === "admin")
                      setEditingDateId(thread.key);
                  }}
                  title="Clic para editar fecha límite del hilo"
                >
                  <IconClock size={10} />
                  {lastMessage.fecha_limite
                    ? `Vence: ${format(parseISO(lastMessage.fecha_limite), "dd/MM")}`
                    : "Fecha límite"}
                  {(messages.some(m => m.id_autor === user.id) || user.rol_sistema === "admin") && (
                    <IconEdit size={8} className="opacity-0 group-hover/date:opacity-50 ml-1" />
                  )}
                </div>
              )}
            </div>
         </div>
         
         {isMentionedInThread && (
           <span className="text-[9px] bg-indigo-600 text-white px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
             <IconAtSign size={10} /> Para mí
           </span>
         )}
      </div>
    </div>
  );
};

// --- COMPONENTE PRINCIPAL (VIEWER) ---
export default function GlobalCommentsViewer({
  supabase,
  giraId = null,
  onClose,
  onNavigate,
}) {
  const { user } = useAuth();
  
  // Estado ahora maneja HILOS, no mensajes sueltos
  const [threads, setThreads] = useState([]); 
  const [filteredThreads, setFilteredThreads] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filtros y Estados UI
  const [filterMentioned, setFilterMentioned] = useState(false);
  const [replyingThread, setReplyingThread] = useState(null); // Hilo seleccionado para responder
  const [newResponse, setNewResponse] = useState("");
  const [sending, setSending] = useState(false);
  const [editingDateId, setEditingDateId] = useState(null); // ID del hilo (key) que edita fecha
  const [usersList, setUsersList] = useState([]);

  useEffect(() => {
    fetchGlobalComments();
    fetchUsers();
  }, [giraId]);

  useEffect(() => {
    if (!filterMentioned) {
      setFilteredThreads(threads);
    } else {
      setFilteredThreads(
        // Filtrar hilos donde CUALQUIER mensaje me mencione
        threads.filter((t) => t.messages.some(m => m.etiquetados?.includes(user.id)))
      );
    }
  }, [filterMentioned, threads, user.id]);

  const fetchUsers = async () => {
    const { data } = await supabase.from("integrantes").select("id, nombre, apellido, rol_sistema").order("nombre");
    if (data) setUsersList(data);
  };

  const fetchGlobalComments = async () => {
    setLoading(true);
    try {
      // 1. Fetch de TODOS los comentarios pendientes
      let query = supabase
        .from("sistema_comentarios")
        .select("*, integrantes(nombre, apellido)")
        .eq("resuelto", false)
        .eq("deleted", false)
        .order("created_at", { ascending: true }); // Orden ascendente para construir la historia

      const { data: allComments } = await query;
      let rawComments = allComments || [];

      // 2. ENRIQUECIMIENTO DE DATOS (Contexto)
      // Mantenemos tu lógica original de enriquecimiento para Giras/Eventos/Obras
      if (giraId) {
        const contextMap = await buildContextMapForGira(giraId);
        rawComments = rawComments.filter((c) => {
          if (c.entidad_tipo === "GIRA" && c.entidad_id === giraId.toString()) {
            c.contexto = "General de Gira";
            return true;
          }
          const key = `${c.entidad_tipo}_${c.entidad_id}`;
          if (contextMap[key]) {
            c.contexto = contextMap[key];
            return true;
          }
          return false;
        });
      } else {
        // Lógica Global (Bulk fetch)
        const eventIds = rawComments.filter((c) => c.entidad_tipo === "EVENTO").map((c) => c.entidad_id);
        const workIds = rawComments.filter((c) => c.entidad_tipo === "OBRA").map((c) => c.entidad_id);
        const roomIds = rawComments.filter((c) => c.entidad_tipo === "HABITACION").map((c) => c.entidad_id);

        // Fetch de Nombres de Programas
        const { data: progs } = await supabase.from("programas").select("id, nombre_gira, nomenclador, mes_letra");
        const progMap = {}; progs?.forEach((p) => (progMap[p.id] = p));
        const contextMap = {};

        // Fetch Eventos
        if (eventIds.length > 0) {
            const { data: evs } = await supabase.from("eventos").select("id, descripcion, fecha, id_gira").in("id", eventIds);
            evs?.forEach((e) => { 
                contextMap[`EVENTO_${e.id}`] = { 
                    contexto: `${e.descripcion} (${format(new Date(e.fecha), "dd/MM")})`, 
                    gira_id: e.id_gira 
                }; 
            });
        }
        // Fetch Obras
        if (workIds.length > 0) {
             const { data: reps } = await supabase.from("programas_repertorios").select(`id, id_programa, repertorio_obras (obras (titulo, obras_compositores (compositores (nombre, apellido))))`).in("id", workIds);
             reps?.forEach((r) => {
                let titulo = "Obra"; let autor = "";
                const obraData = r.repertorio_obras?.[0]?.obras || r.repertorio_obras?.obras;
                if(obraData) {
                    titulo = obraData.titulo;
                    const comp = obraData.obras_compositores?.[0]?.compositores;
                    if(comp) autor = `${comp.apellido}`;
                }
                contextMap[`OBRA_${r.id}`] = { 
                    contexto: `Obra: ${titulo} ${autor?`(${autor})`:''}`, 
                    gira_id: r.id_programa 
                };
             });
        }
        // Fetch Habitaciones
        if (roomIds.length > 0) {
            const { data: rooms } = await supabase.from("hospedaje_habitaciones").select("id, orden, programas_hospedajes(id_programa, hoteles(nombre))").in("id", roomIds);
            rooms?.forEach((r) => { 
                contextMap[`HABITACION_${r.id}`] = { 
                    contexto: `Hab. ${r.orden} (${r.programas_hospedajes?.hoteles?.nombre})`, 
                    gira_id: r.programas_hospedajes?.id_programa 
                }; 
            });
        }

        // Asignar contexto a cada mensaje
        rawComments = rawComments.map((c) => {
            let info = { contexto: `${c.entidad_tipo} #${c.entidad_id}`, gira_id: null };
            if (c.entidad_tipo === "GIRA") { 
                info.gira_id = parseInt(c.entidad_id); 
                info.contexto = "General"; 
            } else { 
                const key = `${c.entidad_tipo}_${c.entidad_id}`; 
                if (contextMap[key]) info = contextMap[key]; 
            }
            
            const progData = progMap[info.gira_id];
            return { 
                ...c, 
                contexto: info.contexto, 
                gira_id: info.gira_id, 
                nombre_gira: progData ? progData.nombre_gira : "Sin Asignar", 
                nomenclador: progData ? `${progData.mes_letra} | ${progData.nomenclador}` : "" 
            };
        });
      }

      // 3. AGRUPACIÓN POR HILO (Clave Única: Tipo + ID)
      const threadsMap = rawComments.reduce((acc, comment) => {
          const key = `${comment.entidad_tipo}_${comment.entidad_id}`;
          if (!acc[key]) {
              acc[key] = {
                  key,
                  contextData: { ...comment }, // Guardamos metadatos del contexto
                  messages: []
              };
          }
          acc[key].messages.push(comment);
          return acc;
      }, {});

      // Ordenar hilos por fecha del ÚLTIMO mensaje (los más recientes primero)
      const sortedThreads = Object.values(threadsMap).sort((a, b) => {
          const dateA = new Date(a.messages[a.messages.length - 1].created_at);
          const dateB = new Date(b.messages[b.messages.length - 1].created_at);
          return dateB - dateA; // Descendente
      });

      setThreads(sortedThreads);

    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  // Helper para mapa de contexto local (Idéntico a tu código original)
  const buildContextMapForGira = async (targetId) => {
    const map = {};
    const { data: evs } = await supabase.from("eventos").select("id, descripcion, fecha").eq("id_gira", targetId);
    evs?.forEach((e) => { map[`EVENTO_${e.id}`] = `${e.descripcion} (${format(new Date(e.fecha), "dd/MM")})`; });

    const { data: reps } = await supabase.from("programas_repertorios").select(`id, repertorio_obras (obras (titulo, obras_compositores (compositores (nombre, apellido))))`).eq("id_programa", targetId);
    reps?.forEach((r) => {
        let titulo = "Obra"; let autor = "";
        const obraData = r.repertorio_obras?.[0]?.obras || r.repertorio_obras?.obras;
        if(obraData) { titulo = obraData.titulo; const comp = obraData.obras_compositores?.[0]?.compositores; if(comp) autor = `${comp.apellido}`; }
        map[`OBRA_${r.id}`] = `Obra: ${titulo} ${autor?`(${autor})`:''}`;
    });

    const { data: hosp } = await supabase.from("programas_hospedajes").select("id, hoteles(nombre), hospedaje_habitaciones(id, orden)").eq("id_programa", targetId);
    hosp?.forEach((h) => { h.hospedaje_habitaciones?.forEach((room) => { map[`HABITACION_${room.id}`] = `Hab. ${room.orden} (${h.hoteles?.nombre})`; }); });
    
    return map;
  };

  // --- ACTIONS ---

  const handleReplySubmit = async (e) => {
    e.preventDefault();
    if (!newResponse.trim() || !replyingThread) return;
    setSending(true);
    
    const context = replyingThread.contextData;
    const taggedIds = usersList.filter((u) => newResponse.includes(`@${u.nombre}${u.apellido}`)).map((u) => u.id);
    
    // Usamos el ID del último mensaje como parent_id para mantener la cadena (opcional, o null si es plano por contexto)
    const lastMsgId = replyingThread.messages[replyingThread.messages.length - 1].id;

    const payload = {
      entidad_tipo: context.entidad_tipo,
      entidad_id: context.entidad_id,
      // Mantenemos campos legacy si existen
      id_gira: context.gira_id, 
      id_autor: user.id,
      contenido: newResponse,
      etiquetados: taggedIds,
      parent_id: lastMsgId, 
      resuelto: false,
      deleted: false
    };
    
    await supabase.from("sistema_comentarios").insert([payload]);
    setNewResponse("");
    setReplyingThread(null);
    fetchGlobalComments();
    setSending(false);
  };

  const handleResolveThread = async (thread) => {
    if(!confirm("¿Marcar todo este hilo como resuelto?")) return;
    // Resolver todos los mensajes del hilo
    const ids = thread.messages.map(m => m.id);
    await supabase.from("sistema_comentarios").update({ resuelto: true, fecha_resolucion: new Date().toISOString(), resuelto_por: user.id }).in("id", ids);
    fetchGlobalComments();
  };

  const handleArchiveMsg = async (id) => {
    if (!confirm("¿Eliminar este mensaje?")) return;
    await supabase.from("sistema_comentarios").update({ deleted: true }).eq("id", id);
    fetchGlobalComments();
  };

  const handleUpdateDate = async (id, date) => {
    // Actualizamos fecha límite en la BD para el mensaje específico
    await supabase.from("sistema_comentarios").update({ fecha_limite: date || null }).eq("id", id);
    fetchGlobalComments();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white w-full max-w-4xl h-[85vh] rounded-xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* HEADER */}
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-amber-100 p-2 rounded-full text-amber-600"><IconAlertCircle size={20} /></div>
            <div>
              <h3 className="font-bold text-slate-800 text-lg">{giraId ? "Pendientes de Gira" : "Gestor General de Pendientes"}</h3>
              <p className="text-xs text-slate-500">{filteredThreads.length} conversaciones activas {filterMentioned ? "(Filtrado)" : ""}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setFilterMentioned(!filterMentioned)} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${filterMentioned ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}>
              <IconAtSign size={14} /> {filterMentioned ? "Mis menciones" : "Filtrar Menciones"}
            </button>
            <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600 transition-colors"><IconX size={20} /></button>
          </div>
        </div>

        {/* LISTA DE HILOS */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/30">
          {loading && <div className="text-center py-10"><IconLoader className="animate-spin inline text-indigo-500" /></div>}
          {!loading && filteredThreads.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 opacity-60">
              <IconCheckCircle size={64} className="text-emerald-200 mb-4" />
              <p className="font-medium">¡Todo al día!</p>
              <p className="text-sm">No hay pendientes con los filtros actuales.</p>
            </div>
          )}

          {filteredThreads.map((thread) => (
            <GlobalThreadItem
              key={thread.key}
              thread={thread}
              user={user}
              onReply={(t) => setReplyingThread(t)}
              onResolve={handleResolveThread}
              onDelete={handleArchiveMsg}
              onUpdateDate={handleUpdateDate}
              onNavigate={onNavigate}
              editingDateId={editingDateId}
              setEditingDateId={setEditingDateId}
              isGlobalView={!giraId}
            />
          ))}
        </div>

        {/* INPUT DE RESPUESTA FLOTANTE */}
        {replyingThread && (
          <div className="p-4 bg-white border-t border-slate-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] animate-in slide-in-from-bottom-5 z-20">
            <div className="flex justify-between items-center mb-2 text-xs text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100">
              <span className="truncate max-w-[80%]">
                  Respondiendo a: <b>{replyingThread.contextData.contexto}</b>
              </span>
              <button onClick={() => setReplyingThread(null)} className="text-slate-400 hover:text-red-500 transition-colors"><IconX size={16} /></button>
            </div>
            <form onSubmit={handleReplySubmit} className="flex gap-2">
              <input 
                autoFocus 
                type="text" 
                className="flex-1 border border-slate-300 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all" 
                placeholder="Escribe tu respuesta..." 
                value={newResponse} 
                onChange={(e) => setNewResponse(e.target.value)} 
              />
              <button disabled={sending} className="bg-indigo-600 text-white px-4 rounded-lg font-bold hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center justify-center min-w-[50px]">
                {sending ? <IconLoader className="animate-spin" size={20}/> : <IconSend size={20}/>}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}