// src/components/ui/NotificationListener.jsx
import React, { useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner'; // O tu librería de toasts preferida, o un simple alert custom

export default function NotificationListener({ supabase }) {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const channel = supabase.channel('global-notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'sistema_comentarios' },
        (payload) => {
          const newComment = payload.new;
          
          // No notificar mis propios comentarios
          if (newComment.id_autor === user.id) return;

          // 1. Me etiquetaron?
          if (newComment.etiquetados && newComment.etiquetados.includes(user.id)) {
            // Mostrar Toast: "Te mencionaron en un comentario"
            new Audio('/notification_sound.mp3').play().catch(e => {}); // Opcional
            alert(`💬 TE MENCIONARON: \n"${newComment.contenido.substring(0, 50)}..."`);
          } 
          // 2. Soy Admin/Editor y es un comentario general?
          else if (['admin', 'editor'].includes(user.rol_sistema)) {
             // Mostrar Toast discreto
             console.log("Nuevo comentario en el sistema:", newComment.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, supabase]);

  return null; // Este componente no renderiza nada visual, solo escucha
}