import React, { useState, useEffect } from 'react';
import { IconMessageCircle, IconEye } from '../ui/Icons';
import { useAuth } from '../../context/AuthContext';
import { isBefore, startOfDay, parseISO, addDays } from 'date-fns';

export default function CommentButton({ supabase, entityType, entityId, onClick, className = "" }) {
    const { user, isEditor } = useAuth();
    
    // Si no es editor/admin, no mostrar nada
    if (user?.rol_sistema !== 'admin' && user?.rol_sistema !== 'editor' && !isEditor) return null;

    const [visuals, setVisuals] = useState({
        count: 0,
        badgeClass: 'hidden',
        iconClass: 'text-slate-300',
        showEye: false,
        tooltip: 'Comentarios'
    });

    const fetchData = async () => {
        if (!entityId || !user?.id) return;

        // A. Mi última lectura
        const { data: lectura } = await supabase
            .from('comentarios_lecturas')
            .select('last_read_at')
            .match({ user_id: user.id, entidad_tipo: entityType, entidad_id: entityId.toString() })
            .maybeSingle();

        const lastRead = lectura?.last_read_at ? new Date(lectura.last_read_at) : new Date(0); 

        // B. Comentarios Activos
        const { data: comments } = await supabase
            .from('sistema_comentarios')
            .select('created_at, resuelto, deleted, etiquetados, fecha_limite')
            .eq('entidad_tipo', entityType)
            .eq('entidad_id', entityId.toString())
            .eq('deleted', false)
            .eq('resuelto', false);

        if (comments) {
            let unreadCount = 0;
            let isMentioned = false;
            
            // Prioridad de fechas (Semáforo)
            let dateStatus = 'none'; // none, soon, today, overdue
            const now = startOfDay(new Date());
            const in3Days = addDays(now, 3);

            comments.forEach(c => {
                // 1. Detección de No Leídos
                const created = new Date(c.created_at);
                // Margen de 500ms para compensar diferencias de reloj
                if (created.getTime() > (lastRead.getTime() + 500)) {
                    unreadCount++;
                    if (Array.isArray(c.etiquetados) && c.etiquetados.includes(user.id)) {
                        isMentioned = true;
                    }
                }

                // 2. Detección de Fechas
                if (c.fecha_limite) {
                    const date = parseISO(c.fecha_limite);
                    const dateStart = startOfDay(date);
                    
                    if (isBefore(dateStart, now)) dateStatus = 'overdue';
                    else if (dateStart.getTime() === now.getTime() && dateStatus !== 'overdue') dateStatus = 'today';
                    else if (isBefore(dateStart, in3Days) && dateStatus !== 'overdue' && dateStatus !== 'today') dateStatus = 'soon';
                }
            });

            // --- ESTILOS ---
            let iconStyle = unreadCount > 0 
                ? 'text-indigo-600 fill-indigo-50' 
                : 'text-slate-400 group-hover:text-indigo-500';

            let badgeStyle = 'bg-slate-200 text-slate-600 border-slate-300'; // Default: Pendientes leídos
            let tip = `${comments.length} pendientes`;

            if (dateStatus === 'overdue') {
                badgeStyle = 'bg-red-500 text-white border-red-600 animate-pulse'; 
                tip = '¡Tareas vencidas!';
            } else if (dateStatus === 'today') {
                badgeStyle = 'bg-orange-500 text-white border-orange-600'; 
                tip = 'Vence hoy';
            } else if (dateStatus === 'soon') {
                badgeStyle = 'bg-amber-400 text-amber-900 border-amber-500'; 
                tip = 'Vence pronto';
            } else if (unreadCount > 0) {
                badgeStyle = 'bg-indigo-500 text-white border-indigo-600'; 
                tip = `${unreadCount} mensajes nuevos`;
            }

            if (comments.length === 0) {
                iconStyle = 'text-slate-300 group-hover:text-indigo-300';
                badgeStyle = 'hidden';
                tip = 'Sin comentarios';
            }

            setVisuals({
                count: unreadCount > 0 ? unreadCount : comments.length,
                badgeClass: badgeStyle,
                iconClass: iconStyle,
                showEye: isMentioned,
                tooltip: tip
            });
        }
    };

    useEffect(() => {
        let isMounted = true;
        fetchData();

        // 1. Escuchar evento LOCAL (Disparado por CommentsManager al cerrar)
        const handleLocalUpdate = (e) => {
            if (e.detail?.entityId === entityId.toString() && e.detail?.entityType === entityType) {
                fetchData();
            }
        };
        window.addEventListener('comments-updated', handleLocalUpdate);

        // 2. Realtime Database
        const channel = supabase.channel(`btn-${entityType}-${entityId}-${Math.random()}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'sistema_comentarios', filter: `entidad_tipo=eq.${entityType}` }, 
                (payload) => {
                    if (payload.new?.entidad_id == entityId || payload.old?.entidad_id == entityId) fetchData();
                }
            )
            .on('postgres_changes', { event: '*', schema: 'public', table: 'comentarios_lecturas' }, 
                (payload) => {
                    const rec = payload.new || payload.old;
                    if (rec && rec.user_id == user.id && rec.entidad_id == entityId && rec.entidad_tipo == entityType) {
                        fetchData();
                    }
                }
            )
            .subscribe();

        return () => { 
            isMounted = false; 
            supabase.removeChannel(channel);
            window.removeEventListener('comments-updated', handleLocalUpdate);
        };
    }, [entityId, entityType, user.id]);

    return (
        <button 
            onClick={(e) => { e.stopPropagation(); onClick(); }} 
            className={`relative group p-1.5 rounded-full hover:bg-slate-100 transition-all ${className}`}
            title={visuals.tooltip}
        >
            <IconMessageCircle size={16} className={`transition-colors duration-300 ${visuals.iconClass}`} />
            
            {visuals.showEye && (
                <div className="absolute -top-1.5 -left-1.5 bg-white rounded-full p-0.5 shadow-sm border border-indigo-100 z-10 animate-bounce">
                    <IconEye size={10} className="text-indigo-600"/>
                </div>
            )}

            {visuals.count > 0 && (
                <span className={`absolute -top-1 -right-1 text-[9px] font-bold h-4 w-4 flex items-center justify-center rounded-full border shadow-sm ${visuals.badgeClass}`}>
                    {visuals.count > 9 ? '9+' : visuals.count}
                </span>
            )}
        </button>
    );
}