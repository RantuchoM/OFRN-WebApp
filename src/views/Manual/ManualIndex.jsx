import React, { useState, useEffect, useMemo } from 'react';
import { manualService } from '../../services/manualService';
import { 
  IconBookOpen, IconSearch, IconChevronRight, 
  IconChevronDown, IconFileText, IconLoader, IconMenu
} from '../../components/ui/Icons';
import 'react-quill/dist/quill.snow.css';

// --- UTILIDAD: GENERAR EXTRACTO CON RESALTADO ---
const getSearchSnippet = (htmlContent, query) => {
  if (!htmlContent || !query) return null;

  // 1. Eliminar etiquetas HTML para buscar en texto plano
  const div = document.createElement("div");
  div.innerHTML = htmlContent;
  const text = div.textContent || div.innerText || "";
  
  if (!text) return null;

  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const index = lowerText.indexOf(lowerQuery);

  if (index === -1) return null;

  // 2. Calcular ventana de texto (ej: 40 caracteres antes y después)
  const start = Math.max(0, index - 40);
  const end = Math.min(text.length, index + query.length + 60);
  
  let snippet = text.substring(start, end);
  
  // 3. Agregar elipses si cortamos texto
  if (start > 0) snippet = "..." + snippet;
  if (end < text.length) snippet = snippet + "...";

  // 4. Resaltar la palabra encontrada (usando Regex para mantener mayúsculas/minúsculas originales)
  // Reemplazamos la coincidencia por un span con fondo amarillo
  const regex = new RegExp(`(${query})`, 'gi');
  return snippet.replace(regex, '<mark class="bg-yellow-200 font-bold rounded-sm px-0.5">$1</mark>');
};


// --- COMPONENTE RECURSIVO DEL ÁRBOL ---
const ManualTreeItem = ({ node, level = 0, onSelect, selectedId, expandedIds, toggleExpand }) => {
  const hasChildren = node.children && node.children.length > 0;
  const isExpanded = expandedIds.has(node.id);
  const isSelected = selectedId === node.id;
  
  // PROPIEDADES CALCULADAS POR EL FILTRO
  const isDirectMatch = node.isDirectMatch; // ¿Coincidió el texto aquí?
  const searchSnippet = node.searchSnippet; // Extracto del contenido

  // Estilos condicionales
  // Si es match directo: Color normal. Si es solo padre contenedor: Texto gris claro (opacity-60)
  const textColorClass = isDirectMatch 
      ? (isSelected ? 'text-indigo-700' : 'text-slate-700') 
      : (isSelected ? 'text-indigo-400' : 'text-slate-400');

  const fontWeightClass = isDirectMatch || isSelected ? 'font-bold' : 'font-normal';

  return (
    <div className="select-none mb-0.5">
      <div 
        className={`
          flex flex-col py-1.5 px-2 cursor-pointer rounded-md text-sm transition-colors
          ${isSelected ? 'bg-indigo-50' : 'hover:bg-slate-100'}
        `}
        style={{ paddingLeft: `${level * 12 + 8}px` }} 
        onClick={() => onSelect(node)}
      >
        {/* FILA DEL TÍTULO */}
        <div className="flex items-center gap-2">
            {/* Botón Expander */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(node.id);
              }}
              className={`p-0.5 rounded-full hover:bg-slate-200 text-slate-400 shrink-0 ${hasChildren ? '' : 'opacity-0 pointer-events-none'}`}
            >
              {isExpanded ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
            </button>

            {/* Icono */}
            {hasChildren ? (
              <IconBookOpen size={16} className={`${isSelected ? 'text-indigo-500' : (isDirectMatch ? 'text-slate-500' : 'text-slate-300')}`} />
            ) : (
              <IconFileText size={16} className={`${isSelected ? 'text-indigo-500' : (isDirectMatch ? 'text-slate-500' : 'text-slate-300')}`} />
            )}

            {/* Título */}
            <span className={`truncate ${textColorClass} ${fontWeightClass} transition-colors duration-200`}>
                {node.title}
            </span>
        </div>

        {/* SNIPPET DE BÚSQUEDA (Si existe) */}
        {searchSnippet && (
            <div 
                className="ml-8 mt-1 text-xs text-slate-500 border-l-2 border-slate-200 pl-2 italic line-clamp-2"
                dangerouslySetInnerHTML={{ __html: searchSnippet }}
            />
        )}
      </div>

      {/* Renderizado Recursivo de Hijos */}
      {hasChildren && isExpanded && (
        <div className="animate-in slide-in-from-left-1 duration-200">
          {node.children.map(child => (
            <ManualTreeItem
              key={child.id}
              node={child}
              level={level + 1}
              onSelect={onSelect}
              selectedId={selectedId}
              expandedIds={expandedIds}
              toggleExpand={toggleExpand}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// --- VISTA PRINCIPAL ---
export default function ManualIndex() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Estado de UI
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    loadManual();
  }, []);

  const loadManual = async () => {
    try {
      setLoading(true);
      const data = await manualService.getAll();
      setItems(data);
      if (data.length > 0) {
        const root = data.find(i => !i.parent_id) || data[0];
        setSelectedItem(root);
        setExpandedIds(new Set([root.id]));
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // --- LÓGICA DE ÁRBOL Y BÚSQUEDA ---
  const treeData = useMemo(() => {
    // 1. Construir Árbol Completo
    const buildTree = (list) => {
      const map = {};
      const roots = [];
      list.forEach(item => { 
          // Clonamos y agregamos flags por defecto
          map[item.id] = { ...item, children: [], isDirectMatch: true, searchSnippet: null }; 
      });
      list.forEach(item => {
        if (item.parent_id && map[item.parent_id]) {
          map[item.parent_id].children.push(map[item.id]);
        } else {
          roots.push(map[item.id]);
        }
      });
      const sortNodes = (nodes) => {
        nodes.sort((a, b) => a.sort_order - b.sort_order);
        nodes.forEach(node => { if (node.children.length > 0) sortNodes(node.children); });
      };
      sortNodes(roots);
      return roots;
    };

    const fullTree = buildTree(items);

    // 2. Si no hay búsqueda, devolver árbol limpio
    if (!searchQuery.trim()) return fullTree;

    const lowerQuery = searchQuery.toLowerCase();
    
    // 3. Función de Filtrado con Lógica de "Match Directo vs Indirecto"
    const filterNodes = (nodes) => {
      return nodes.reduce((acc, node) => {
        // A. Recursión: filtrar hijos primero
        const filteredChildren = filterNodes(node.children);
        
        // B. Chequear coincidencia propia
        const titleMatch = node.title.toLowerCase().includes(lowerQuery);
        // Generar snippet si hay match en contenido (costoso, pero útil)
        const contentSnippet = getSearchSnippet(node.content, searchQuery);
        
        const isSelfMatch = titleMatch || contentSnippet !== null;

        // C. Decisión: ¿Incluimos este nodo?
        // Sí, si coincide él mismo O si tiene hijos que coinciden.
        if (isSelfMatch || filteredChildren.length > 0) {
          
          // Auto-expandir si hay coincidencia (propia o de hijos)
          setExpandedIds(prev => {
             const newSet = new Set(prev);
             newSet.add(node.id);
             return newSet;
          });

          acc.push({
            ...node,
            children: filteredChildren,
            // Flags para la UI
            isDirectMatch: isSelfMatch, 
            searchSnippet: contentSnippet // Solo tendrá valor si el match fue en el contenido
          });
        }
        return acc;
      }, []);
    };

    return filterNodes(fullTree);

  }, [items, searchQuery]);

  const toggleExpand = (id) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // --- RENDER ---
  if (loading) return <div className="flex h-screen items-center justify-center"><IconLoader className="animate-spin text-indigo-600" size={40}/></div>;

  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden">
      
      {/* HEADER MÓVIL */}
      <div className="md:hidden p-4 border-b flex items-center justify-between bg-white z-20">
         <h1 className="font-bold text-slate-700">Manual de Usuario</h1>
         <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 bg-slate-100 rounded">
            <IconMenu />
         </button>
      </div>

      <div className="flex flex-1 h-full overflow-hidden relative">
        
        {/* SIDEBAR */}
        <div className={`
            absolute md:relative z-10 bg-slate-50 border-r border-slate-200 w-80 h-full flex flex-col transition-transform duration-300
            ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}>
          
          {/* Barra de Búsqueda */}
          <div className="p-4 border-b border-slate-200 bg-white shadow-sm">
             <div className="relative group">
                <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={16} />
                <input 
                  type="text" 
                  placeholder="Buscar..." 
                  className="w-full pl-9 pr-4 py-2 bg-slate-100 border border-transparent focus:bg-white rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
             </div>
          </div>

          {/* Árbol */}
          <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
             {treeData.length === 0 ? (
               <div className="text-center py-10 text-slate-400 text-sm px-4">
                 <p>No se encontraron resultados para "{searchQuery}".</p>
               </div>
             ) : (
               treeData.map(node => (
                 <ManualTreeItem 
                   key={node.id} 
                   node={node} 
                   selectedId={selectedItem?.id}
                   expandedIds={expandedIds}
                   onSelect={(item) => {
                     setSelectedItem(item);
                     if (window.innerWidth < 768) setIsMobileMenuOpen(false);
                   }}
                   toggleExpand={toggleExpand}
                 />
               ))
             )}
          </div>
        </div>

        {/* CONTENIDO (Derecha) - Igual que antes */}
        <div className="flex-1 overflow-y-auto bg-white p-6 md:p-12 w-full">
           <div className="max-w-4xl mx-auto min-h-full">
              {selectedItem ? (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                   {/* Breadcrumb Visual */}
                   <div className="text-xs font-bold text-indigo-500 uppercase tracking-widest mb-2 opacity-70">
                      {selectedItem.isDirectMatch === false && searchQuery ? 'Viendo resultado indirecto' : 'Documentación'}
                   </div>
                   
                   <h1 className="text-3xl md:text-4xl font-bold text-slate-800 mb-8 pb-4 border-b border-slate-100">
                     {selectedItem.title}
                   </h1>

                   {selectedItem.video_url && (
                      <div className="aspect-video w-full rounded-xl overflow-hidden shadow-lg bg-black mb-8 ring-1 ring-slate-900/10">
                         <iframe width="100%" height="100%" src={selectedItem.video_url.replace("watch?v=", "embed/")} title={selectedItem.title} frameBorder="0" allowFullScreen></iframe>
                      </div>
                   )}

                   <div 
                     className="prose prose-lg prose-slate prose-headings:text-slate-800 prose-a:text-indigo-600 max-w-none text-slate-600"
                     dangerouslySetInnerHTML={{ __html: selectedItem.content }}
                   />
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-300">
                   <IconBookOpen size={64} className="mb-4 opacity-50"/>
                   <p className="text-lg">Selecciona un tema para leer</p>
                </div>
              )}
           </div>
        </div>
      </div>
    </div>
  );
}