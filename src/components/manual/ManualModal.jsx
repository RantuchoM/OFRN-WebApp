import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  IconX, IconBookOpen, IconLoader, 
  IconChevronLeft, IconChevronRight, IconList,
  IconFolderPlus, IconEdit, IconPlus
} from '../../components/ui/Icons';

export default function ManualModal({ isOpen, onClose, article, currentKey, navigation, onNavigate, loading, error }) {
  const navigate = useNavigate();
  const { isAdmin } = useAuth(); 

  if (!isOpen) return null;

  // Ir a Editar (Artículo existente)
  const handleEditClick = () => {
    onClose();
    navigate(`/?tab=manual_admin&editId=${article.id}`);
  };

  const handleCreateClick = () => {
    onClose();
    navigate(`/?tab=manual_admin&createKey=${currentKey}`);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 relative">
        
        {/* HEADER */}
        <div className={`text-white p-4 shrink-0 flex justify-between items-start shadow-md z-10 ${error ? 'bg-amber-600' : 'bg-sky-600'}`}>
          <div className="flex gap-3 overflow-hidden flex-1">
            <div className={`p-2 rounded-lg shrink-0 mt-1 ${error ? 'bg-amber-700' : 'bg-sky-500'}`}>
               <IconBookOpen size={24} className="text-white" />
            </div>
            <div className="min-w-0 flex-1">
               
               {/* BREADCRUMBS */}
               {!error && (
                 <div className="flex flex-wrap items-center gap-1 text-[10px] uppercase tracking-wider text-sky-100 mb-1 leading-none">
                    <span className="opacity-70">{article?.category || 'Manual'}</span>
                    {navigation?.breadcrumbs?.map((crumb) => (
                      <React.Fragment key={crumb.id}>
                        <span className="opacity-50">/</span>
                        <button onClick={() => onNavigate(crumb.section_key)} className="hover:text-white hover:underline truncate max-w-[100px]">{crumb.title}</button>
                      </React.Fragment>
                    ))}
                 </div>
               )}

               <div className="flex items-center gap-3">
                 <h2 className="font-bold text-lg leading-tight truncate pr-4">
                   {loading ? 'Cargando...' : (error ? 'Sección no encontrada' : (article?.title || 'Detalle'))}
                 </h2>
                 
                 {/* BOTONES DE ACCIÓN PARA ADMIN */}
                 {!loading && isAdmin && (
                    <>
                      {/* Caso 1: Existe -> Editar */}
                      {article && (
                        <button 
                          onClick={handleEditClick}
                          className="flex items-center gap-1 px-2 py-0.5 bg-white/20 hover:bg-white hover:text-sky-600 text-[10px] uppercase font-bold rounded transition-colors shadow-sm border border-white/30"
                        >
                          <IconEdit size={12} /> Editar
                        </button>
                      )}
                      
                      {/* Caso 2: No existe -> Crear */}
                      {error && currentKey && (
                        <button 
                          onClick={handleCreateClick}
                          className="flex items-center gap-1 px-2 py-0.5 bg-white text-amber-700 hover:bg-amber-50 text-[10px] uppercase font-bold rounded transition-colors shadow-sm animate-pulse"
                        >
                          <IconPlus size={12} /> Crear Sección
                        </button>
                      )}
                    </>
                 )}
               </div>
            </div>
          </div>
          <button onClick={onClose} className="hover:bg-white/20 p-2 rounded-full transition-colors text-white ml-2">
            <IconX size={24} />
          </button>
        </div>

        {/* CONTENT */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden bg-slate-50 relative custom-scrollbar">
          <div className="p-6 md:p-8 max-w-none text-slate-700 leading-relaxed">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <IconLoader size={40} className="animate-spin mb-4 text-sky-500" />
                <p>Buscando información...</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                 <div className="bg-amber-50 text-amber-800 p-8 rounded-xl border border-amber-200 max-w-md">
                    <p className="font-bold text-xl mb-2">¡Ups!</p>
                    <p className="mb-4">No existe contenido para la clave: <br/><code className="bg-amber-100 px-2 py-1 rounded text-sm font-mono mt-2 inline-block">{currentKey}</code></p>
                    
                    {isAdmin ? (
                       <p className="text-sm text-amber-600">Usa el botón <b>"Crear Sección"</b> de arriba para redactarla ahora mismo.</p>
                    ) : (
                       <p className="text-sm text-slate-400">Contacta al administrador si necesitas ayuda.</p>
                    )}
                 </div>
              </div>
            ) : article ? (
              <div className="space-y-8 pb-4">
                {article.video_url && (
                  <div className="aspect-video w-full rounded-xl overflow-hidden shadow-lg bg-black ring-1 ring-black/10">
                     <iframe width="100%" height="100%" src={article.video_url.replace("watch?v=", "embed/")} title="Video" frameBorder="0" allowFullScreen></iframe>
                  </div>
                )}
                <div className="prose prose-slate prose-headings:text-sky-900 prose-a:text-sky-600 max-w-none" dangerouslySetInnerHTML={{ __html: article.content }} />
                
                {navigation?.children && navigation.children.length > 0 && (
                  <div className="mt-12 pt-6 border-t border-slate-200">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2"><IconFolderPlus size={14}/> Temas relacionados:</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {navigation.children.map(child => (
                        <button key={child.id} onClick={() => onNavigate(child.section_key)} className="group flex items-start gap-3 p-3 bg-white border border-slate-200 rounded-lg hover:border-sky-300 hover:shadow-md transition-all text-left">
                          <div className="mt-0.5 p-1.5 bg-sky-50 text-sky-600 rounded-md group-hover:bg-sky-600 group-hover:text-white transition-colors"><IconChevronRight size={16} /></div>
                          <div><span className="block font-bold text-slate-700 group-hover:text-sky-700 text-sm">{child.title}</span></div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>

        {/* FOOTER (Solo visible si hay artículo válido) */}
        {!loading && !error && article && (
          <div className="bg-white border-t border-slate-200 p-3 shrink-0 flex justify-between items-center text-sm">
             <div className="flex-1 min-w-0 pr-2">
                {navigation?.prev ? (
                  <button onClick={() => onNavigate(navigation.prev.section_key)} className="flex items-center gap-2 text-slate-500 hover:text-sky-600 transition-colors group text-left w-full">
                    <IconChevronLeft size={18} className="group-hover:-translate-x-1 transition-transform"/>
                    <div className="flex flex-col truncate"><span className="text-[10px] uppercase font-bold text-slate-400">Anterior</span><span className="truncate font-medium">{navigation.prev.title}</span></div>
                  </button>
                ) : <div className="w-8"/>}
             </div>
             <div className="px-4 border-x border-slate-100 flex justify-center">
                <button onClick={onClose} className="p-2 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-full transition-all"><IconList size={20} /></button>
             </div>
             <div className="flex-1 min-w-0 pl-2 flex justify-end">
                {navigation?.next ? (
                  <button onClick={() => onNavigate(navigation.next.section_key)} className="flex items-center gap-2 text-slate-500 hover:text-sky-600 transition-colors group text-right w-full justify-end">
                    <div className="flex flex-col truncate items-end"><span className="text-[10px] uppercase font-bold text-slate-400">Siguiente</span><span className="truncate font-medium">{navigation.next.title}</span></div>
                    <IconChevronRight size={18} className="group-hover:translate-x-1 transition-transform"/>
                  </button>
                ) : <span className="text-xs text-slate-300 italic pr-2">Final</span>}
             </div>
          </div>
        )}
      </div>
    </div>
  );
}