import React from 'react';
import { 
  IconX, IconBookOpen, IconLoader, 
  IconChevronLeft, IconChevronRight, IconArrowUpLeft, IconList 
} from '../../components/ui/Icons';
// Nota: Si no tienes IconArrowUpLeft o IconList, usa IconChevronLeft o IconBookOpen por ahora.

export default function ManualModal({ isOpen, onClose, article, navigation, onNavigate, loading, error }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 relative">
        
        {/* --- HEADER --- */}
        <div className="bg-indigo-600 text-white p-4 shrink-0 flex justify-between items-start shadow-md z-10">
          <div className="flex gap-3 overflow-hidden">
            <div className="p-2 bg-indigo-500 rounded-lg shrink-0 mt-1">
               <IconBookOpen size={24} className="text-white" />
            </div>
            <div className="min-w-0">
               {/* Breadcrumbs de Navegación Superior */}
               <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-indigo-200 mb-1">
                  <span className="truncate">{article?.category || 'Manual'}</span>
                  {navigation?.parent && (
                    <>
                      <span>/</span>
                      <button 
                        onClick={() => onNavigate(navigation.parent.section_key)}
                        className="hover:text-white hover:underline truncate max-w-[150px]"
                        title="Ir al tema padre"
                      >
                        {navigation.parent.title}
                      </button>
                    </>
                  )}
               </div>

               <h2 className="font-bold text-lg leading-tight truncate pr-4">
                 {loading ? 'Cargando...' : (article?.title || 'Manual de Usuario')}
               </h2>
            </div>
          </div>
          <button onClick={onClose} className="hover:bg-indigo-500 p-2 rounded-full transition-colors text-indigo-100 hover:text-white">
            <IconX size={24} />
          </button>
        </div>

        {/* --- CONTENT --- */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden bg-slate-50 relative">
          <div className="p-6 md:p-8 max-w-none text-slate-700 leading-relaxed">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <IconLoader size={40} className="animate-spin mb-4 text-indigo-500" />
                <p>Buscando información...</p>
              </div>
            ) : error ? (
              <div className="bg-amber-50 text-amber-800 p-6 rounded-lg border border-amber-200 text-center mx-auto max-w-md mt-10">
                <p className="font-bold text-lg mb-2">¡Vaya!</p>
                <p>{error}</p>
              </div>
            ) : article ? (
              <div className="space-y-8 pb-10">
                
                {/* Video Player */}
                {article.video_url && (
                  <div className="aspect-video w-full rounded-xl overflow-hidden shadow-lg bg-black ring-1 ring-black/10">
                     <iframe 
                       width="100%" 
                       height="100%" 
                       src={article.video_url.replace("watch?v=", "embed/")} 
                       title="Tutorial Video" 
                       frameBorder="0" 
                       allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                       allowFullScreen
                     ></iframe>
                  </div>
                )}

                {/* HTML Content */}
                <div 
                  className="prose prose-slate prose-headings:text-indigo-900 prose-a:text-indigo-600 max-w-none"
                  dangerouslySetInnerHTML={{ __html: article.content }} 
                />
              </div>
            ) : null}
          </div>
        </div>

        {/* --- FOOTER DE NAVEGACIÓN --- */}
        {!loading && !error && article && (
          <div className="bg-white border-t border-slate-200 p-3 shrink-0 flex justify-between items-center text-sm">
             
             {/* Botón Anterior */}
             <div className="flex-1 min-w-0 pr-2">
                {navigation?.prev ? (
                  <button 
                    onClick={() => onNavigate(navigation.prev.section_key)}
                    className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 transition-colors group text-left w-full"
                  >
                    <IconChevronLeft size={18} className="group-hover:-translate-x-1 transition-transform"/>
                    <div className="flex flex-col truncate">
                       <span className="text-[10px] uppercase font-bold text-slate-400">Anterior</span>
                       <span className="truncate font-medium">{navigation.prev.title}</span>
                    </div>
                  </button>
                ) : (
                  <div className="opacity-0 pointer-events-none">Espacio</div> 
                )}
             </div>

             {/* Botón Central: Ir al Índice General */}
             <div className="px-4 border-x border-slate-100 flex justify-center">
                <button 
                  onClick={() => {
                     // Opción A: Cerrar modal y navegar a /manual (requiere useNavigate si no estás ya ahí)
                     // Opción B: Si ya estás en /manual, solo cerrar modal.
                     // Asumiremos cerrar modal por ahora, el usuario verá la pantalla de fondo.
                     onClose();
                     // Si tienes acceso a navigate de router-dom aquí, podrías hacer navigate('/manual')
                  }}
                  className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-all"
                  title="Cerrar y ver Índice General"
                >
                  <IconList size={20} />
                </button>
             </div>

             {/* Botón Siguiente */}
             <div className="flex-1 min-w-0 pl-2 flex justify-end">
                {navigation?.next ? (
                  <button 
                    onClick={() => onNavigate(navigation.next.section_key)}
                    className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 transition-colors group text-right w-full justify-end"
                  >
                    <div className="flex flex-col truncate items-end">
                       <span className="text-[10px] uppercase font-bold text-slate-400">Siguiente</span>
                       <span className="truncate font-medium">{navigation.next.title}</span>
                    </div>
                    <IconChevronRight size={18} className="group-hover:translate-x-1 transition-transform"/>
                  </button>
                ) : (
                   <span className="text-xs text-slate-300 italic pr-2">Final del manual</span>
                )}
             </div>
          </div>
        )}

      </div>
    </div>
  );
}