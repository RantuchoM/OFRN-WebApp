import React from 'react';
import { IconX, IconBookOpen, IconLoader } from '../../components/ui/Icons';

export default function ManualModal({ isOpen, onClose, article, loading, error }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-4">
        
        {/* Header */}
        <div className="bg-indigo-600 text-white p-4 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500 rounded-lg">
               <IconBookOpen size={24} className="text-white" />
            </div>
            <div>
              <h2 className="font-bold text-lg leading-tight">
                {loading ? 'Cargando...' : (article?.title || 'Manual de Usuario')}
              </h2>
              {article && (
                <p className="text-xs text-indigo-200 uppercase font-semibold tracking-wider">
                  {article.category}
                </p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="hover:bg-indigo-500 p-2 rounded-full transition-colors">
            <IconX size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto text-slate-700 leading-relaxed">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <IconLoader size={40} className="animate-spin mb-4 text-indigo-500" />
              <p>Consultando manual...</p>
            </div>
          ) : error ? (
            <div className="bg-amber-50 text-amber-800 p-4 rounded border border-amber-200 text-center">
              <p className="font-bold">Información no disponible</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
          ) : article ? (
            <div className="space-y-6">
              {/* Video Player */}
              {article.video_url && (
                <div className="aspect-video w-full rounded-lg overflow-hidden shadow-md bg-black">
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

              {/* HTML Content Render */}
              <div 
                className="prose prose-sm prose-indigo max-w-none"
                dangerouslySetInnerHTML={{ __html: article.content }} 
              />
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-100 p-3 flex justify-end shrink-0">
          <button 
            onClick={onClose} 
            className="px-4 py-2 bg-white border border-slate-300 rounded text-slate-700 font-bold text-sm hover:bg-slate-100"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}