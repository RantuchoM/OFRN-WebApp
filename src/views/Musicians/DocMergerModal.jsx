import React, { useState, useEffect } from "react";
import {
  IconX,
  IconLoader,
  IconFileText,
  IconLayoutGrid,
  IconChevronLeft,
  IconChevronRight,
  IconCrop,
  IconCheck
} from "../../components/ui/Icons";

export default function DocMergerModal({ isOpen, onClose, supabase, musicianName, sources, onGenerated }) {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]); // Array de objetos { id, url, thumb, type, config }

  // 1. Cargar miniaturas al abrir
  useEffect(() => {
    if (isOpen) fetchThumbnails();
  }, [isOpen]);

  const fetchThumbnails = async () => {
    setLoading(true);
    try {
      // Filtramos solo los links que no están vacíos
      const validSources = Object.entries(sources)
        .filter(([key, url]) => !!url)
        .map(([key, url]) => url);

      if (validSources.length === 0) {
        alert("No hay links de Drive configurados para procesar.");
        onClose();
        return;
      }

      const { data, error } = await supabase.functions.invoke("manage-drive", {
        body: { action: "get_thumbnails", sources: validSources }
      });

      if (error) throw error;

      // Inicializamos los items con un orden por defecto y config básica
      setItems(data.data.map((item, index) => ({
        ...item,
        order: index,
        zoom: 1,
        offsetY: 0 // Para simular un crop vertical simple
      })));
    } catch (err) {
      console.error("Error al cargar miniaturas:", err);
      alert("Error al conectar con Google Drive.");
    } finally {
      setLoading(false);
    }
  };

  // 2. Lógica para reordenar (Mover a la izquierda/derecha)
  const moveItem = (index, direction) => {
    const newItems = [...items];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= newItems.length) return;
    
    [newItems[index], newItems[targetIndex]] = [newItems[targetIndex], newItems[index]];
    setItems(newItems);
  };

  // 3. Lógica de Procesamiento Final
  const handleGenerate = async (layout) => {
    setLoading(true);
    try {
      const fileName = `${musicianName} - ${layout === 'full' ? 'Documentacion' : 'Mosaico'}`;
      
      const { data, error } = await supabase.functions.invoke("manage-drive", {
        body: { 
          action: "assemble_docs", 
          layout, 
          // Enviamos los items en el orden que el usuario eligió
          sources: items.map(item => ({
             url: item.originalUrl,
             isPdf: item.isPdf,
             config: { zoom: item.zoom, offsetY: item.offsetY }
          })),
          fileName
        }
      });

      if (error) throw error;

      onGenerated(layout, data.url);
      onClose();
    } catch (err) {
      alert("Error al procesar el archivo: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-6 border-b bg-white flex justify-between items-center">
          <div>
            <h4 className="font-black text-slate-800 text-xl flex items-center gap-2">
              <IconCrop className="text-indigo-600" /> Editor de Fusión
            </h4>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">{musicianName}</p>
          </div>
          <button onClick={onClose} className="bg-slate-100 p-2 rounded-full text-slate-400 hover:text-red-500 transition-colors">
            <IconX size={24}/>
          </button>
        </div>
        
        {/* Workspace */}
        <div className="p-8 overflow-y-auto flex-1 bg-slate-50">
          {loading && (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <IconLoader className="animate-spin text-indigo-600" size={48}/>
              <p className="text-slate-500 font-bold animate-pulse">Procesando archivos de Drive...</p>
            </div>
          )}
          
          {!loading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {items.map((item, i) => (
                <div key={i} className="flex flex-col gap-3">
                  <div className="relative group rounded-2xl border-2 border-white shadow-xl overflow-hidden bg-white aspect-[3/4] transition-transform hover:scale-[1.02]">
                    <img 
                      src={item.thumb} 
                      className="w-full h-full object-cover" 
                      style={{ 
                        transform: `scale(${item.zoom}) translateY(${item.offsetY}%)`,
                        filter: item.isPdf ? 'sepia(0.2)' : 'none'
                      }}
                      alt="Preview" 
                    />
                    
                    {/* Badge tipo de archivo */}
                    <div className="absolute top-2 left-2 bg-black/50 backdrop-blur-md text-white text-[9px] px-2 py-1 rounded-full font-bold uppercase">
                      {item.isPdf ? 'PDF' : 'Imagen'}
                    </div>

                    {/* Controles de reordenamiento */}
                    <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex justify-between">
                      <button onClick={() => moveItem(i, -1)} className="p-1 bg-white/20 hover:bg-white/40 rounded text-white"><IconChevronLeft size={18}/></button>
                      <span className="text-white text-[10px] font-bold">POS {i+1}</span>
                      <button onClick={() => moveItem(i, 1)} className="p-1 bg-white/20 hover:bg-white/40 rounded text-white"><IconChevronRight size={18}/></button>
                    </div>
                  </div>
                  
                  {/* Selector simple de "Crop" / Ajuste (Visual) */}
                  <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-200">
                    <label className="text-[9px] font-bold text-slate-400 uppercase">Ajuste</label>
                    <input 
                      type="range" min="1" max="2" step="0.1" 
                      value={item.zoom} 
                      onChange={(e) => {
                        const newItems = [...items];
                        newItems[i].zoom = parseFloat(e.target.value);
                        setItems(newItems);
                      }}
                      className="flex-1 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer de Acciones */}
        <div className="p-6 bg-white border-t grid grid-cols-1 md:grid-cols-2 gap-4">
          <button 
            disabled={loading || items.length === 0}
            onClick={() => handleGenerate('full')}
            className="group relative overflow-hidden bg-slate-900 text-white py-4 rounded-2xl font-bold hover:bg-black disabled:opacity-50 transition-all flex items-center justify-center gap-3"
          >
            <IconFileText size={20} className="group-hover:rotate-12 transition-transform"/>
            <div className="text-left">
              <div className="leading-none">Generar PDF Full</div>
              <div className="text-[10px] text-slate-400 font-normal">Une archivos en páginas completas</div>
            </div>
          </button>

          <button 
            disabled={loading || items.length === 0}
            onClick={() => handleGenerate('mosaic')}
            className="group relative overflow-hidden bg-indigo-600 text-white py-4 rounded-2xl font-bold hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center justify-center gap-3 shadow-lg shadow-indigo-200"
          >
            <IconLayoutGrid size={20} className="group-hover:scale-110 transition-transform"/>
            <div className="text-left">
              <div className="leading-none">Generar Mosaico</div>
              <div className="text-[10px] text-indigo-200 font-normal">Mosaico 4x1 (Ideal para reducción)</div>
            </div>
            <IconCheck className="absolute right-4 opacity-20" size={40}/>
          </button>
        </div>
      </div>
    </div>
  );
}