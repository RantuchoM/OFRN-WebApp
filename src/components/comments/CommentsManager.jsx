import React, { useState, useEffect, useRef } from 'react';
import { 
    IconMessageCircle, IconSend, IconTrash, IconCheckCircle, IconX, 
    IconLoader, IconAtSign, IconClock, IconArchive, IconRefresh, 
    IconArrowRight, IconEyeOff, IconEdit 
} from '../ui/Icons';
import { useAuth } from '../../context/AuthContext';
import { format, isBefore, addDays, parseISO, isToday } from 'date-fns';
import { es } from 'date-fns/locale';

// --- COMPONENTE DE ITEM (EXTERNO) ---
const CommentItem = ({ 
    comment, isChild, user, lastReadAt, usersList, 
    onReply, onResolve, onDelete, onUpdateDate, 
    editingDateId, setEditingDateId 
}) => {
    const isMine = comment.id_autor === user.id;
    const isUnread = new Date(comment.created_at).getTime() > lastReadAt.getTime() && !isMine;
    
    // Estado local para el input de fecha (evita re-render global al tipear)
    const [localDate, setLocalDate] = useState(comment.fecha_limite ? comment.fecha_limite.split('T')[0] : "");

    // Sincronizar estado local si cambia la prop
    useEffect(() => {
        setLocalDate(comment.fecha_limite ? comment.fecha_limite.split('T')[0] : "");
    }, [comment.fecha_limite]);

    const handleSaveDate = () => {
        onUpdateDate(comment.id, localDate);
        setEditingDateId(null);
    };

    const handleClearDate = (e) => {
        e.stopPropagation(); // Evitar que abra el editor de nuevo
        onUpdateDate(comment.id, null); // Enviar null para borrar
        setEditingDateId(null);
    };

    // Colores
    let deadlineClass = "bg-slate-100 text-slate-500 border-slate-200";
    if (comment.fecha_limite && !comment.resuelto && !comment.deleted) {
        const d = parseISO(comment.fecha_limite);
        const now = new Date();
        if (isBefore(d, new Date(now.setHours(0,0,0,0)))) deadlineClass = "bg-red-50 text-red-600 border-red-200 font-bold";
        else if (isToday(d)) deadlineClass = "bg-orange-50 text-orange-600 border-orange-200 font-bold";
        else if (isBefore(d, addDays(now, 3))) deadlineClass = "bg-amber-50 text-amber-600 border-amber-200";
        else deadlineClass = "bg-indigo-50 text-indigo-600 border-indigo-200";
    }

    return (
        <div className={`flex flex-col ${isChild ? 'ml-6 mt-2 border-l-2 border-slate-100 pl-3' : 'mt-3'}`}>
            <div className={`p-3 rounded-lg border shadow-sm transition-all relative group 
                ${comment.deleted ? 'bg-slate-50 border-slate-200 opacity-60' : 
                  comment.resuelto ? 'bg-emerald-50/50 border-emerald-100' : 
                  isUnread ? 'bg-orange-50 border-orange-200 ring-1 ring-orange-200' : 'bg-white border-slate-200'}
            `}>
                <div className="flex justify-between items-start mb-1">
                    <div className="flex items-center gap-2">
                        <span className={`font-bold text-xs ${isMine ? 'text-indigo-700' : 'text-slate-700'}`}>{comment.integrantes?.nombre} {comment.integrantes?.apellido}</span>
                        <span className="text-[10px] text-slate-400">{format(new Date(comment.created_at), "d MMM HH:mm", { locale: es })}</span>
                        {isUnread && <span className="text-[8px] font-black bg-orange-400 text-white px-1.5 rounded animate-pulse">NUEVO</span>}
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!comment.deleted && !comment.resuelto && !isChild && (
                            <button onClick={() => onReply(comment)} className="p-1 rounded hover:bg-indigo-50 text-indigo-400" title="Responder"><IconArrowRight size={14}/></button>
                        )}
                        {!comment.deleted && !isChild && (
                            <button onClick={() => onResolve(comment)} className={`p-1 rounded hover:bg-emerald-50 ${comment.resuelto ? 'text-emerald-600' : 'text-slate-300 hover:text-emerald-500'}`} title={comment.resuelto ? "Reabrir" : "Resolver"}>
                                <IconCheckCircle size={14}/>
                            </button>
                        )}
                        {(isMine || user.rol_sistema === 'admin') && !isChild && (
                            <button onClick={() => onDelete(comment.id, comment.deleted)} className={`p-1 rounded ${comment.deleted ? 'text-indigo-400 hover:bg-indigo-50' : 'text-slate-300 hover:text-red-500 hover:bg-red-50'}`} title={comment.deleted ? "Restaurar" : "Archivar"}>
                                {comment.deleted ? <IconRefresh size={14}/> : <IconArchive size={14}/>}
                            </button>
                        )}
                    </div>
                </div>
                
                <p className={`text-sm whitespace-pre-wrap ${comment.resuelto ? 'text-slate-500 line-through' : 'text-slate-700'}`}>{comment.contenido}</p>
                
                <div className="flex flex-wrap gap-2 mt-2 items-center">
                    {/* Etiquetas */}
                    {comment.etiquetados?.map(tid => {
                        const u = usersList.find(us => us.id === tid);
                        return u ? <span key={tid} className="text-[9px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded border border-indigo-100 flex items-center gap-0.5"><IconAtSign size={10}/> {u.nombre}</span> : null;
                    })}
                    
                    {/* Fecha Límite Editable */}
                    {!comment.resuelto && !comment.deleted && (
                        <div className="flex items-center group/date">
                            {editingDateId === comment.id ? (
                                <div className="flex items-center gap-1 bg-white border border-indigo-300 rounded px-1 shadow-sm z-10">
                                    <input 
                                        type="date" 
                                        className="text-[10px] py-0.5 bg-transparent outline-none w-24"
                                        value={localDate}
                                        onChange={(e) => setLocalDate(e.target.value)}
                                        onBlur={handleSaveDate}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSaveDate()}
                                        autoFocus
                                    />
                                    {/* Botón X para borrar fecha */}
                                    <button 
                                        onMouseDown={handleClearDate} // onMouseDown evita que el onBlur del input se dispare primero
                                        className="text-red-400 hover:text-red-600 p-0.5 hover:bg-red-50 rounded" 
                                        title="Eliminar fecha"
                                    >
                                        <IconX size={12}/>
                                    </button>
                                </div>
                            ) : (
                                <div className={`text-[9px] px-1.5 py-0.5 rounded border flex items-center gap-1 cursor-pointer hover:shadow-sm ${deadlineClass}`}
                                     onClick={() => {
                                         if(isMine || user.rol_sistema === 'admin') {
                                             setEditingDateId(comment.id);
                                         }
                                     }}
                                     title="Clic para editar fecha"
                                >
                                    <IconClock size={10}/> 
                                    {comment.fecha_limite ? `Vence: ${format(parseISO(comment.fecha_limite), "dd/MM/yyyy")}` : "Sin fecha"}
                                    {(isMine || user.rol_sistema === 'admin') && <IconEdit size={8} className="opacity-0 group-hover/date:opacity-50 ml-1"/>}
                                </div>
                            )}
                        </div>
                    )}

                    {comment.fecha_resolucion && <span className="text-[9px] text-emerald-600 flex items-center gap-1 bg-emerald-50 px-1.5 py-0.5 rounded"><IconCheckCircle size={10}/> Resuelto: {format(new Date(comment.fecha_resolucion), "dd/MM/yyyy", { locale: es })}</span>}
                </div>
            </div>
            {comment.children && comment.children.length > 0 && <div>{comment.children.map(child => (
                <CommentItem 
                    key={child.id} comment={child} isChild={true} user={user} lastReadAt={lastReadAt} usersList={usersList}
                    onReply={onReply} onResolve={onResolve} onDelete={onDelete} onUpdateDate={onUpdateDate} 
                    editingDateId={editingDateId} setEditingDateId={setEditingDateId}
                />
            ))}</div>}
        </div>
    );
};

// --- COMPONENTE PRINCIPAL ---
export default function CommentsManager({ supabase, entityType, entityId, title, onClose }) {
    const { user } = useAuth();
    const [comments, setComments] = useState([]);
    const [replyingTo, setReplyingTo] = useState(null);
    const [newComment, setNewComment] = useState("");
    const [deadline, setDeadline] = useState("");
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const [viewMode, setViewMode] = useState('pending');
    
    // Estado para edición de fechas
    const [editingDateId, setEditingDateId] = useState(null);

    const [lastReadAt, setLastReadAt] = useState(new Date(0));
    const [usersList, setUsersList] = useState([]);
    const [showMentions, setShowMentions] = useState(false);
    const [mentionQuery, setMentionQuery] = useState("");
    const inputRef = useRef(null);
    const scrollRef = useRef(null);

    useEffect(() => { if(entityId) { initialize(); } }, [entityId, entityType, viewMode]);

    const initialize = async () => {
        setLoading(true);
        await markAsRead(); 
        await fetchUsers();
        await fetchComments();
        setLoading(false);
    };

    const notifyUpdate = () => {
        // Disparar evento para que el botón se actualice YA
        const event = new CustomEvent('comments-updated', { 
            detail: { entityId: entityId.toString(), entityType: entityType } 
        });
        window.dispatchEvent(event);
    };

    const markAsRead = async () => {
        const now = new Date().toISOString();
        const { error } = await supabase.from('comentarios_lecturas').upsert({
            user_id: user.id,
            entidad_tipo: entityType,
            entidad_id: entityId.toString(),
            last_read_at: now
        }, { onConflict: 'user_id, entidad_tipo, entidad_id' });
        
        if (!error) {
            setLastReadAt(new Date());
            notifyUpdate();
        }
    };

    const markAsUnread = async () => {
        await supabase.from('comentarios_lecturas').delete().match({
            user_id: user.id,
            entidad_tipo: entityType,
            entidad_id: entityId.toString()
        });
        
        notifyUpdate(); // Avisar al botón
        onClose();
    };

    const fetchComments = async () => {
        let query = supabase
            .from('sistema_comentarios')
            .select('*, integrantes(nombre, apellido)')
            .eq('entidad_tipo', entityType)
            .eq('entidad_id', entityId.toString())
            .order('created_at', { ascending: true });

        const { data, error } = await query;
        if (!error) setComments(data || []);
        
        if(loading) setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }), 100);
    };

    const fetchUsers = async () => {
        const { data } = await supabase.from('integrantes').select('id, nombre, apellido, rol_sistema').order('nombre');
        if (data) setUsersList(data);
    };

    const updateCommentDate = async (commentId, newDate) => {
        const val = newDate ? newDate : null;
        const { error } = await supabase.from('sistema_comentarios').update({ fecha_limite: val }).eq('id', commentId);
        if (!error) {
            setComments(prev => prev.map(c => c.id === commentId ? { ...c, fecha_limite: val } : c));
            setEditingDateId(null);
            notifyUpdate(); // Actualizar colores del botón si la fecha cambió status
        }
    };

    // ... (buildThreads, handleSend, toggleResolve, softDeleteComment igual que antes) ...
    // Solo me aseguro de llamar a notifyUpdate() en cada acción que cambie el estado
    
    const buildThreads = (list) => {
        const map = {};
        const roots = [];
        list.forEach(c => { map[c.id] = { ...c, children: [] }; });
        list.forEach(c => {
            if (c.parent_id && map[c.parent_id]) map[c.parent_id].children.push(map[c.id]);
            else roots.push(map[c.id]);
        });
        return viewMode === 'pending' ? roots.filter(root => !root.deleted && !root.resuelto) : roots.filter(root => root.resuelto || root.deleted);
    };

    const handleSend = async (e) => {
        e.preventDefault();
        if (!newComment.trim()) return;
        setSending(true);
        const taggedIds = usersList.filter(u => newComment.includes(`@${u.nombre}${u.apellido}`)).map(u => u.id);
        const payload = { entidad_tipo: entityType, entidad_id: entityId.toString(), id_autor: user.id, contenido: newComment, etiquetados: taggedIds, fecha_limite: deadline || null, parent_id: replyingTo ? replyingTo.id : null };
        await supabase.from('sistema_comentarios').insert([payload]);
        await markAsRead(); 
        setNewComment(""); setDeadline(""); setReplyingTo(null);
        await fetchComments();
        setSending(false);
        notifyUpdate();
    };

    const toggleResolve = async (comment) => {
        const newVal = !comment.resuelto;
        const resolveDate = newVal ? new Date().toISOString() : null;
        const idsToUpdate = [comment.id];
        comments.forEach(c => { if (c.parent_id === comment.id) idsToUpdate.push(c.id); });
        setComments(prev => prev.map(c => idsToUpdate.includes(c.id) ? { ...c, resuelto: newVal, fecha_resolucion: resolveDate } : c));
        await supabase.from('sistema_comentarios').update({ resuelto: newVal, fecha_resolucion: resolveDate }).in('id', idsToUpdate);
        if (viewMode === 'pending' && newVal) setTimeout(fetchComments, 500);
        notifyUpdate();
    };

    const softDeleteComment = async (id, currentStatus) => {
        if (!currentStatus && !confirm("¿Archivar hilo?")) return;
        const idsToUpdate = [id];
        comments.forEach(c => { if (c.parent_id === id) idsToUpdate.push(c.id); });
        await supabase.from('sistema_comentarios').update({ deleted: !currentStatus }).in('id', idsToUpdate);
        fetchComments();
        notifyUpdate();
    };

    const handleInputChange = (e) => { const val = e.target.value; setNewComment(val); const lastWord = val.split(' ').pop(); if (lastWord.startsWith('@') && lastWord.length > 1) { setMentionQuery(lastWord.slice(1)); setShowMentions(true); } else { setShowMentions(false); } };
    const insertMention = (u) => { const words = newComment.split(' '); words.pop(); setNewComment(words.join(' ') + ` @${u.nombre}${u.apellido} `); setShowMentions(false); inputRef.current?.focus(); };
    const filteredUsers = usersList.filter(u => `${u.nombre} ${u.apellido}`.toLowerCase().includes(mentionQuery.toLowerCase()));
    const threads = buildThreads(comments);

    return (
        <div className="flex flex-col h-full bg-white shadow-2xl border-l border-slate-200 w-full md:w-[450px] animate-in slide-in-from-right duration-300 relative z-[60]">
            <div className="p-4 border-b border-slate-100 flex flex-col gap-3 bg-slate-50 shrink-0">
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="font-bold text-slate-800 flex items-center gap-2"><IconMessageCircle className="text-indigo-600"/> Comentarios</h3>
                        <p className="text-xs text-slate-500 truncate max-w-[200px]">{title}</p>
                    </div>
                    <div className="flex items-center gap-1">
                        <button onClick={markAsUnread} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors" title="Marcar como no leído"><IconEyeOff size={18}/></button>
                        <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors"><IconX size={20}/></button>
                    </div>
                </div>
                <div className="flex p-1 bg-slate-200 rounded-lg">
                    <button onClick={() => setViewMode('pending')} className={`flex-1 py-1 text-xs font-bold rounded-md transition-all ${viewMode==='pending' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>Pendientes</button>
                    <button onClick={() => setViewMode('history')} className={`flex-1 py-1 text-xs font-bold rounded-md transition-all ${viewMode==='history' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>Historial</button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 bg-slate-50/30" ref={scrollRef}>
                {loading && <div className="text-center py-4"><IconLoader className="animate-spin text-indigo-500 inline"/></div>}
                {!loading && threads.length === 0 && <div className="text-center py-10 text-slate-400 italic text-sm">{viewMode === 'pending' ? "No hay temas pendientes." : "Historial vacío."}</div>}
                {threads.map(thread => (
                    <CommentItem 
                        key={thread.id} 
                        comment={thread} 
                        user={user} 
                        lastReadAt={lastReadAt} 
                        usersList={usersList}
                        onReply={setReplyingTo}
                        onResolve={toggleResolve}
                        onDelete={softDeleteComment}
                        onUpdateDate={updateCommentDate}
                        editingDateId={editingDateId}
                        setEditingDateId={setEditingDateId}
                    />
                ))}
            </div>

            <div className="p-3 bg-white border-t border-slate-200 relative shrink-0">
                {replyingTo && <div className="flex justify-between items-center bg-indigo-50 p-2 rounded text-xs text-indigo-700 mb-2 border border-indigo-100"><span>Respondiendo a <b>{replyingTo.integrantes?.apellido}</b></span><button onClick={() => setReplyingTo(null)}><IconX size={12}/></button></div>}
                {showMentions && <div className="absolute bottom-full left-4 mb-2 w-64 bg-white border border-slate-200 rounded-lg shadow-xl max-h-48 overflow-y-auto z-50">{filteredUsers.map(u => (<div key={u.id} onClick={() => insertMention(u)} className="px-3 py-2 hover:bg-indigo-50 cursor-pointer text-xs text-slate-700 border-b border-slate-50"><b>{u.nombre} {u.apellido}</b></div>))}</div>}
                <div className="flex items-center gap-2 mb-2"><span className="text-[10px] text-slate-400 font-bold uppercase">Vencimiento (Opcional):</span><input type="date" className="text-xs border border-slate-200 rounded px-2 py-1 bg-slate-50 outline-none" value={deadline} onChange={(e) => setDeadline(e.target.value)}/></div>
                <form onSubmit={handleSend} className="flex gap-2 items-end">
                    <textarea ref={inputRef} className="flex-1 bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 resize-none h-10 min-h-[40px] max-h-24 transition-all focus:h-20" placeholder={replyingTo ? "Escribe una respuesta..." : "Nuevo tema..."} value={newComment} onChange={handleInputChange} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !showMentions) { e.preventDefault(); handleSend(e); } }}/>
                    <button disabled={sending || !newComment.trim()} className="bg-indigo-600 text-white p-2.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm">{sending ? <IconLoader className="animate-spin" size={18}/> : <IconSend size={18}/>}</button>
                </form>
            </div>
        </div>
    );
}