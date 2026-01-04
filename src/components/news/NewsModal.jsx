import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { IconBell, IconX, IconInfo, IconCalendar, IconCheck, IconEye } from "../ui/Icons"; 
import { useAuth } from "../../context/AuthContext";

// --- UTILIDADES MULTIMEDIA ---
const processDriveLink = (url) => {
  if (!url) return null;
  const regex = /(?:drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?id=)|drive\.google\.com\/file\/u\/[0-9]\/d\/)([-a-zA-Z0-9]+)/;
  const match = url.match(regex);
  if (match && match[1]) {
    return `https://lh3.googleusercontent.com/d/$${match[1]}`;
  }
  return url;
};

const getYoutubeEmbed = (url) => {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
};

// --- RENDERER RICO (Vista Detallada) ---
const NewsContentFull = ({ content }) => {
  if (!content) return null;
  return (
    <div className="space-y-6 text-slate-700 leading-relaxed font-normal text-sm md:text-base">
      {content.split("\n").map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return <br key={idx} />;

        const ytId = getYoutubeEmbed(trimmed);
        if (ytId && trimmed.startsWith("http")) {
          return (
            <div key={idx} className="aspect-video w-full rounded-xl overflow-hidden shadow-lg my-4 bg-black">
              <iframe
                width="100%"
                height="100%"
                src={`https://www.youtube.com/embed/${ytId}`}
                title="YouTube video"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            </div>
          );
        }

        if ((trimmed.startsWith("http") && trimmed.includes("drive.google.com")) || trimmed.match(/\.(jpeg|jpg|gif|png)$/i)) {
           return (
             <div key={idx} className="flex justify-center my-4">
               <img 
                 src={processDriveLink(trimmed)} 
                 alt="Adjunto" 
                 referrerPolicy="no-referrer"
                 className="max-h-[500px] w-auto rounded-lg shadow-md border border-slate-100 object-contain" 
                 onError={(e) => e.target.style.display = 'none'}
               />
             </div>
           );
        }

        return <div key={idx} dangerouslySetInnerHTML={{ __html: line }} />;
      })}
    </div>
  );
};

// --- RENDERER SIMPLE (Preview Lista) ---
const NewsContentPreview = ({ content }) => {
    const cleanContent = content
        .replace(/(https?:\/\/[^\s]+)/g, (url) => {
            if(url.includes('drive.google') || url.includes('youtu')) return ' [Adjunto Multimedia] ';
            return url;
        })
        .replace(/\n/g, ' ');
        
    return (
        <div className="text-xs text-slate-500 line-clamp-2" dangerouslySetInnerHTML={{ __html: cleanContent }} />
    );
};

// --- COMPONENTE PRINCIPAL ---
export default function NewsModal({ supabase }) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedNews, setSelectedNews] = useState(null);
  const [news, setNews] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const menuRef = useRef(null);

  const userIdInt = user && !isNaN(Number(user.id)) ? user.id : null;

  const fetchNewsForUser = async () => {
    if (!userIdInt) return;

    try {
      let query = supabase
        .from("sistema_novedades")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);

      const isAdminOrEditor = ["admin", "editor", "director", "coord_general"].includes(user?.rol_sistema);
      if (!isAdminOrEditor) {
        query = query.eq("visibilidad", "todos");
      }

      const { data: newsData, error } = await query;
      if (error) throw error;

      const { data: reads } = await supabase
        .from("sistema_novedades_lecturas")
        .select("id_novedad")
        .eq("id_usuario", userIdInt);

      const readIds = new Set(reads?.map(r => r.id_novedad));

      const processedNews = newsData.map(n => ({
        ...n,
        isRead: readIds.has(n.id)
      }));

      setNews(processedNews);
      setUnreadCount(processedNews.filter(n => !n.isRead).length);

    } catch (err) {
      console.error("Error fetching news:", err);
    }
  };

  useEffect(() => {
    if (user) fetchNewsForUser();
    const interval = setInterval(fetchNewsForUser, 300000); 
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // --- NUEVA LÓGICA: TOGGLE INDIVIDUAL ---
  const toggleReadStatus = async (item, forceStatus = null) => {
    if (!userIdInt) return;
    
    // Si forceStatus está definido, lo usamos. Si no, invertimos el estado actual.
    const newIsRead = forceStatus !== null ? forceStatus : !item.isRead;
    
    // 1. Actualización Optimista en UI
    setNews(prev => prev.map(n => n.id === item.id ? { ...n, isRead: newIsRead } : n));
    
    // Recalcular contador
    setUnreadCount(prev => {
        if (item.isRead === newIsRead) return prev; // Sin cambios
        return newIsRead ? Math.max(0, prev - 1) : prev + 1;
    });

    // 2. Persistencia en DB
    if (newIsRead) {
        await supabase.from("sistema_novedades_lecturas").upsert({
            id_novedad: item.id,
            id_usuario: userIdInt
        }, { ignoreDuplicates: true });
    } else {
        await supabase.from("sistema_novedades_lecturas").delete()
            .eq("id_novedad", item.id)
            .eq("id_usuario", userIdInt);
    }
  };

  const openDetail = (item) => {
      setSelectedNews(item);
      setIsOpen(false); 
      // MARCADO AUTOMÁTICO AL ABRIR
      if (!item.isRead) {
          toggleReadStatus(item, true);
      }
  };

  // Solo abre/cierra el menú, YA NO MARCA LEÍDO AUTOMÁTICAMENTE
  const toggleOpen = () => setIsOpen(!isOpen);

  return (
    <>
        <div className="relative z-[9999]" ref={menuRef}>
            <button 
                onClick={toggleOpen}
                className={`relative p-2 rounded-full transition-all duration-200 ${isOpen ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:text-indigo-600 hover:bg-slate-100'}`}
                title="Novedades"
            >
                <IconBell size={22} />
                {unreadCount > 0 && (
                <span className="absolute top-1 right-1 h-4 w-4 bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center rounded-full shadow-sm border border-white animate-pulse">
                    {unreadCount > 9 ? '9+' : unreadCount}
                </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-3 w-80 md:w-96 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-top-2 origin-top-right ring-1 ring-black/5">
                    <div className="bg-slate-50/80 backdrop-blur px-4 py-3 border-b border-slate-100 flex justify-between items-center sticky top-0 z-10">
                        <h3 className="font-bold text-slate-700 text-sm flex items-center gap-2">
                            <IconBell size={16} className="text-indigo-600"/> Centro de Novedades
                        </h3>
                        <div className="flex gap-2">
                            <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-200 rounded-full transition-colors"><IconX size={16}/></button>
                        </div>
                    </div>
                    
                    <div className="max-h-[400px] overflow-y-auto bg-white scrollbar-thin scrollbar-thumb-slate-200">
                        {news.length === 0 ? (
                        <div className="p-8 text-center text-slate-400 text-xs italic flex flex-col items-center gap-2">
                            <div className="p-3 bg-slate-50 rounded-full"><IconInfo size={24} className="text-slate-300"/></div>
                            No hay novedades recientes.
                        </div>
                        ) : (
                        <div className="divide-y divide-slate-50">
                            {news.map((item) => (
                            <div 
                                key={item.id} 
                                className={`p-4 hover:bg-indigo-50/50 transition-colors cursor-pointer group relative ${!item.isRead ? 'bg-indigo-50/20' : 'bg-white'}`}
                                onClick={() => openDetail(item)}
                            >
                                {/* Indicador lateral de no leído */}
                                {!item.isRead && <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-indigo-500"></div>}
                                
                                <div className="flex justify-between items-start mb-1.5">
                                    <div className="flex items-center gap-2">
                                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${
                                            item.importancia === 'alta' 
                                            ? 'bg-rose-50 text-rose-700 border-rose-100' 
                                            : 'bg-slate-100 text-slate-500 border-slate-200'
                                        }`}>
                                            {item.modulo}
                                        </span>
                                        {/* Botón rápido para marcar leído/no leído desde la lista */}
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); toggleReadStatus(item); }}
                                            className={`p-1 rounded-full hover:bg-black/5 transition-colors ${item.isRead ? 'text-slate-300 hover:text-indigo-500' : 'text-indigo-500'}`}
                                            title={item.isRead ? "Marcar como no leído" : "Marcar como leído"}
                                        >
                                            <div className={`w-2 h-2 rounded-full ${item.isRead ? 'border border-slate-400' : 'bg-indigo-500'}`}></div>
                                        </button>
                                    </div>
                                    <span className="text-[10px] text-slate-400 group-hover:text-indigo-500 transition-colors">
                                        {new Date(item.created_at).toLocaleDateString()}
                                    </span>
                                </div>
                                
                                <h4 className={`text-sm mb-1 group-hover:text-indigo-700 transition-colors ${!item.isRead ? 'font-bold text-slate-800' : 'font-medium text-slate-700'}`}>
                                    {item.titulo}
                                </h4>
                                
                                <NewsContentPreview content={item.contenido} />
                            </div>
                            ))}
                        </div>
                        )}
                    </div>
                    
                    <div className="p-2 bg-slate-50 border-t border-slate-100 text-center">
                        <span className="text-[10px] text-slate-400">Mantente al día con el equipo</span>
                    </div>
                </div>
            )}
        </div>

        {/* MODAL DETALLADO */}
        {selectedNews && createPortal(
            <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6" style={{zIndex: 99999}}>
                <div 
                    className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
                    onClick={() => setSelectedNews(null)}
                ></div>

                <div className="bg-white w-full max-w-2xl max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col relative animate-in zoom-in-95 duration-200 ring-1 ring-black/5">
                    <div className="bg-white border-b border-slate-100 px-6 py-4 flex justify-between items-start sticky top-0 z-20">
                        <div className="pr-8">
                            <div className="flex items-center gap-3 mb-2">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                                    selectedNews.importancia === 'alta' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-500'
                                }`}>
                                    {selectedNews.modulo}
                                </span>
                                <span className="text-xs text-slate-400 flex items-center gap-1">
                                    <IconCalendar size={12}/> {new Date(selectedNews.created_at).toLocaleDateString()}
                                </span>
                            </div>
                            <h2 className="text-xl md:text-2xl font-bold text-slate-800 leading-tight">
                                {selectedNews.titulo}
                            </h2>
                        </div>
                        <button onClick={() => setSelectedNews(null)} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 hover:text-slate-700 transition-colors shrink-0">
                            <IconX size={20}/>
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-50/30">
                        <NewsContentFull content={selectedNews.contenido} />
                    </div>

                    <div className="px-6 py-4 border-t border-slate-100 bg-white flex justify-between items-center">
                        {/* BOTÓN PARA MARCAR COMO NO LEÍDO */}
                        <button 
                            onClick={() => {
                                toggleReadStatus(selectedNews, false); // Forzar no leído
                                setSelectedNews(null); // Cerrar modal
                            }}
                            className="text-slate-500 hover:text-indigo-600 text-xs font-bold flex items-center gap-2 px-3 py-2 rounded hover:bg-indigo-50 transition-colors"
                        >
                            <IconEye size={16}/> Marcar como no leído
                        </button>

                        <button 
                            onClick={() => setSelectedNews(null)}
                            className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-sm font-bold shadow-lg shadow-slate-900/10 transition-all"
                        >
                            Cerrar
                        </button>
                    </div>
                </div>
            </div>,
            document.body
        )}
    </>
  );
}