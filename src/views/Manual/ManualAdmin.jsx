import React, { useState, useEffect, useRef, useMemo } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

// --- IMPORTS DND-KIT ---
import {
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  defaultDropAnimationSideEffects
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { manualService } from '../../services/manualService';
import { 
  IconPlus, IconSave, IconTrash, IconBookOpen, 
  IconChevronRight, IconCopy, IconLoader,
  IconFolderPlus, IconGripVertical 
} from '../../components/ui/Icons';

// --- COMPONENTE INTERNO SORTABLE ---
const SortableSidebarItem = ({ id, item, depth = 0, onClick, isSelected, style: propStyle }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1, 
    ...propStyle
  };

  return (
    <div ref={setNodeRef} style={style} className={`flex items-center group ${depth > 0 ? 'ml-4' : ''} mb-1`}>
      <div 
         {...attributes} 
         {...listeners} 
         className="mr-1 text-slate-300 hover:text-indigo-500 cursor-grab active:cursor-grabbing p-1 touch-none"
      >
        <IconGripVertical size={14} />
      </div>
      
      <div 
        onClick={onClick} 
        className={`flex-1 flex items-center gap-2 p-1.5 rounded cursor-pointer min-w-0 transition-colors ${isSelected ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}
      >
        {depth === 0 ? (
           <IconChevronRight size={14} className="text-slate-400 shrink-0"/>
        ) : (
           <div className="w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0"></div>
        )}
        <span className="truncate text-sm">{item.title}</span>
      </div>
    </div>
  );
};

// --- OVERLAY FLOTANTE ---
const ItemOverlay = ({ item }) => {
  if (!item) return null;
  return (
    <div className="flex items-center p-2 rounded bg-white shadow-xl border border-indigo-200 opacity-90 cursor-grabbing w-64 z-50">
      <IconGripVertical size={14} className="text-indigo-500 mr-2" />
      <span className="font-bold text-indigo-700 truncate">{item.title}</span>
    </div>
  );
};

// --- CONFIGURACIÓN QUILL ---
const EDITOR_MODULES = {
  toolbar: [
    [{ 'header': [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
    [{ 'color': [] }, { 'background': [] }],
    ['link', 'image', 'video'],
    ['clean']
  ],
  clipboard: { matchVisual: false }
};

export default function ManualAdmin({ supabase }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeId, setActiveId] = useState(null);
  
  const quillRef = useRef(null);
  const categoryInputRef = useRef(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const [formData, setFormData] = useState({
    id: null,
    title: '',
    category: 'General',
    section_key: '',
    content: '',
    parent_id: null,
    sort_order: 0,
    video_url: ''
  });

  // --- HANDLER DE IMÁGENES ---
  const imageHandler = () => {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.click();
    input.onchange = async () => {
      const file = input.files[0];
      if (file) {
        try {
          const fileName = `${Date.now()}_${file.name.replace(/\s/g, '_')}`;
          const { error } = await supabase.storage.from('manual-content').upload(fileName, file);
          if (error) throw error;
          const { data: urlData } = supabase.storage.from('manual-content').getPublicUrl(fileName);
          const quill = quillRef.current.getEditor();
          const range = quill.getSelection(true);
          quill.insertEmbed(range.index, 'image', urlData.publicUrl);
        } catch (error) {
          alert('Error al subir imagen: ' + error.message);
        }
      }
    };
  };

  const modules = useMemo(() => ({
    ...EDITOR_MODULES,
    toolbar: {
      container: EDITOR_MODULES.toolbar,
      handlers: { image: imageHandler }
    }
  }), []);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await manualService.getAll();
      setItems(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // --- GENERACIÓN DEL ÁRBOL ---
  const treeData = useMemo(() => {
    const tree = {};

    // 1. Inicializar categorías
    items.forEach(item => {
      if (!tree[item.category]) tree[item.category] = { roots: [], orphans: [] };
    });

    // 2. Separar Padres de Hijos potenciales
    const potentialChildren = [];

    items.forEach(item => {
      if (!item.parent_id) {
        if(tree[item.category]) {
           tree[item.category].roots.push({ ...item, children: [] });
        }
      } else {
        potentialChildren.push(item);
      }
    });

    // 3. Asignar hijos
    potentialChildren.forEach(child => {
      let foundParent = false;
      Object.keys(tree).forEach(cat => {
         const parent = tree[cat].roots.find(r => r.id === child.parent_id);
         if (parent) {
           parent.children.push(child);
           foundParent = true;
         }
      });

      if (!foundParent) {
         if (tree[child.category]) {
             tree[child.category].orphans.push(child);
         } else {
             if(!tree['Sin Asignar']) tree['Sin Asignar'] = { roots: [], orphans: [] };
             tree['Sin Asignar'].orphans.push(child);
         }
      }
    });

    // 4. Ordenar
    Object.keys(tree).forEach(cat => {
      tree[cat].roots.sort((a, b) => a.sort_order - b.sort_order);
      tree[cat].roots.forEach(root => root.children.sort((a, b) => a.sort_order - b.sort_order));
    });

    return tree;
  }, [items]);


  // --- HANDLERS DND ---
  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveId(null);
    
    if (!over) return;
    if (active.id === over.id) return;

    const oldIndex = items.findIndex(i => i.id === active.id);
    const newIndex = items.findIndex(i => i.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    let newItems = [...items];
    const activeItem = newItems[oldIndex];
    const overItem = newItems[newIndex];

    let newParentId = activeItem.parent_id;
    let newCategory = activeItem.category;

    const isOverRoot = !overItem.parent_id; 
    const isActiveRoot = !activeItem.parent_id; 

    // LÓGICA DE ACTUALIZACIÓN (Padre/Categoría)
    if (isOverRoot) {
        if (!isActiveRoot) {
           newParentId = overItem.id;
           newCategory = overItem.category; 
        } else {
           newCategory = overItem.category;
           newParentId = null; 
        }
    } else {
        newParentId = overItem.parent_id;
        newCategory = overItem.category;
    }

    newItems[oldIndex] = { ...activeItem, parent_id: newParentId, category: newCategory };
    newItems = arrayMove(newItems, oldIndex, newIndex);

    setItems(newItems); // UI Inmediata

    try {
        const siblings = newItems.filter(i => 
            i.category === newCategory && 
            i.parent_id === newParentId
        );

        const updates = siblings.map((item, index) => ({
            id: item.id,
            sort_order: index, 
            parent_id: item.parent_id, 
            category: item.category 
        }));
        
        const promises = updates.map(u => 
             manualService.update(u.id, {
                 sort_order: u.sort_order,
                 parent_id: u.parent_id,
                 category: u.category
             })
        );
        await Promise.all(promises);
    } catch (err) {
        console.error("Error reordenando:", err);
        alert("Error de sincronización. Recargando...");
        loadData();
    }
  };

  // --- CRUD HANDLERS MEJORADOS ---

  // 1. CREAR CATEGORÍA NUEVA (Con Prompt para evitar errores)
  const handleCreateCategory = () => {
    const catName = prompt("Nombre de la nueva Categoría (Rubro):");
    if (!catName || catName.trim() === "") return; // Cancelado

    const cleanName = catName.trim();
    const slug = cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    const newKey = `${slug}_intro_${Date.now().toString(36)}`;

    // Configuramos el formulario con TODO listo
    setFormData({
      id: null,
      title: `Introducción a ${cleanName}`,
      category: cleanName,
      section_key: newKey,
      content: `<p>Bienvenido a la sección <strong>${cleanName}</strong>.</p>`,
      parent_id: null,
      sort_order: 0,
      video_url: ''
    });
    
    setSelectedItem(null);
    // Enfocar título por si quiere ajustarlo
    setTimeout(() => { 
        const titleInput = document.querySelector('input[name="titleInput"]');
        if(titleInput) titleInput.focus();
    }, 100);
  };

  // 2. CREAR ARTÍCULO NORMAL
  const handleCreateNew = (parentId = null, category = 'General') => {
    const newKey = `sec_${Date.now().toString(36)}`;
    setFormData({ 
        id: null, 
        title: '', 
        category, 
        section_key: newKey, 
        content: '', 
        parent_id: parentId, 
        sort_order: items.length + 1, 
        video_url: '' 
    });
    setSelectedItem(null);
  };

  const handleSelect = (item) => {
    setSelectedItem(item.id);
    setFormData({ id: item.id, title: item.title, category: item.category, section_key: item.section_key, content: item.content || '', parent_id: item.parent_id, sort_order: item.sort_order || 0, video_url: item.video_url || '' });
  };

  const handleSave = async () => {
    if (!formData.title || !formData.section_key || !formData.category) return alert("Faltan datos obligatorios (Título, Categoría, Key).");
    try {
      if (formData.id) {
        await manualService.update(formData.id, formData);
        setItems(prev => prev.map(i => i.id === formData.id ? { ...i, ...formData } : i));
      } else {
        const newItem = await manualService.create(formData);
        setItems(prev => [...prev, newItem]);
        handleSelect(newItem);
      }
      alert("Guardado correctamente");
    } catch (e) { alert("Error: " + e.message); }
  };

  const handleDelete = async () => {
    if (!formData.id || !confirm("¿Borrar esta sección?")) return;
    try {
      await manualService.delete(formData.id);
      setItems(prev => prev.filter(i => i.id !== formData.id));
      setFormData({ ...formData, id: null, title: '' });
    } catch (e) { alert(e.message); }
  };

  const generateKey = (title) => {
    if (formData.id) return;
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    const prefix = formData.category ? formData.category.toLowerCase().split(' ')[0] + '_' : '';
    setFormData(prev => ({ ...prev, section_key: prefix + slug }));
  };

  const activeOverlayItem = useMemo(() => items.find(i => i.id === activeId), [activeId, items]);

  return (
    <DndContext 
      sensors={sensors} 
      collisionDetection={closestCenter} 
      onDragStart={handleDragStart} 
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-full bg-slate-50">
        
        {/* SIDEBAR */}
        <div className={`${isSidebarOpen ? 'w-80' : 'w-0'} bg-white border-r border-slate-200 transition-all duration-300 flex flex-col overflow-hidden`}>
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center shrink-0">
            <h2 className="font-bold text-slate-700 flex items-center gap-2">
              <IconBookOpen className="text-indigo-600"/> Estructura
            </h2>
            <div className="flex gap-1">
               {/* BOTÓN NUEVA CATEGORÍA (VERDE) */}
               <button onClick={handleCreateCategory} className="p-1.5 bg-emerald-100 text-emerald-700 rounded hover:bg-emerald-200" title="Nueva Categoría"><IconFolderPlus size={16}/></button>
               {/* BOTÓN NUEVO ÍTEM (AZUL) */}
               <button onClick={() => handleCreateNew()} className="p-1.5 bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200" title="Nuevo Artículo"><IconPlus size={16}/></button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2 space-y-4">
            {loading ? <IconLoader className="animate-spin m-4 text-indigo-500"/> : 
             Object.entries(treeData).map(([catName, data]) => (
              <div key={catName} className="mb-4">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-2 flex justify-between group">
                  {catName}
                  <button onClick={(e) => { e.stopPropagation(); handleCreateNew(null, catName); }} className="text-indigo-600 hover:text-indigo-800"><IconPlus size={14}/></button>
                </div>
                
                <SortableContext 
                  items={[...data.roots, ...data.orphans].map(x => x.id)} 
                  strategy={verticalListSortingStrategy}
                >
                  {data.roots.map(root => (
                    <div key={root.id} className="mb-1">
                      {/* ROOT */}
                      <SortableSidebarItem 
                        id={root.id}
                        item={root}
                        depth={0}
                        onClick={() => handleSelect(root)}
                        isSelected={selectedItem === root.id}
                      />
                      {/* CHILDREN */}
                      <div className="mt-1">
                        {root.children.map(child => (
                           <SortableSidebarItem 
                             key={child.id}
                             id={child.id}
                             item={child}
                             depth={1} 
                             onClick={() => handleSelect(child)}
                             isSelected={selectedItem === child.id}
                           />
                        ))}
                      </div>
                    </div>
                  ))}
                  
                  {/* ORPHANS */}
                  {data.orphans.length > 0 && (
                     <div className="mt-2 border-t pt-2 border-red-100 bg-red-50/50 rounded p-1">
                       <p className="text-[10px] text-red-400 font-bold mb-1 uppercase">Sin asignar (Arrastrar para corregir)</p>
                       {data.orphans.map(orphan => (
                          <SortableSidebarItem 
                            key={orphan.id}
                            id={orphan.id}
                            item={orphan}
                            depth={0}
                            style={{ opacity: 0.8 }}
                            onClick={() => handleSelect(orphan)}
                            isSelected={selectedItem === orphan.id}
                          />
                       ))}
                     </div>
                  )}
                </SortableContext>
              </div>
            ))}
          </div>
        </div>

        {/* EDITOR */}
        <div className="flex-1 flex flex-col h-full overflow-hidden">
           <div className="bg-white border-b border-slate-200 p-4 flex justify-between items-center shadow-sm z-10 shrink-0">
             <div className="flex items-center gap-4">
                <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-slate-400 hover:text-slate-600">
                  {isSidebarOpen ? '<' : '>'}
                </button>
                <div>
                  <h1 className="text-lg font-bold text-slate-800 truncate max-w-xs">{formData.id ? 'Editando' : 'Creando'}</h1>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                     <code>{formData.section_key}</code>
                     <button onClick={() => navigator.clipboard.writeText(formData.section_key)}><IconCopy size={12}/></button>
                  </div>
                </div>
             </div>
             <div className="flex gap-2">
               {formData.id && <button onClick={handleDelete} className="p-2 text-rose-600 hover:bg-rose-50 rounded"><IconTrash size={16}/></button>}
               <button onClick={handleSave} className="px-4 py-2 bg-indigo-600 text-white rounded font-bold shadow-sm"><IconSave size={16}/> Guardar</button>
             </div>
           </div>

           <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
             <div className="max-w-5xl mx-auto space-y-6 pb-20">
               <div className="grid grid-cols-12 gap-4 bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
                 <div className="col-span-12 md:col-span-6">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Título</label>
                    <input name="titleInput" type="text" value={formData.title} onChange={e => { setFormData({...formData, title: e.target.value}); if(!formData.id) generateKey(e.target.value); }} className="w-full p-2 border border-slate-300 rounded font-bold" />
                 </div>
                 <div className="col-span-6 md:col-span-3">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Categoría</label>
                    <input ref={categoryInputRef} type="text" list="cat_list" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full p-2 border border-slate-300 rounded text-sm"/>
                    <datalist id="cat_list">{Object.keys(treeData).map(c=><option key={c} value={c}/>)}</datalist>
                 </div>
                 <div className="col-span-6 md:col-span-3">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Orden</label>
                    <input type="number" value={formData.sort_order} onChange={e => setFormData({...formData, sort_order: parseInt(e.target.value)})} className="w-full p-2 border border-slate-300 rounded text-sm"/>
                 </div>
                 <div className="col-span-12 md:col-span-6">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Padre</label>
                    <select value={formData.parent_id || ''} onChange={e => setFormData({...formData, parent_id: e.target.value || null})} className="w-full p-2 border border-slate-300 rounded text-sm">
                      <option value="">-- Tema Principal --</option>
                      {items.filter(i => !i.parent_id && i.id !== formData.id).map(p => <option key={p.id} value={p.id}>{p.category} &gt; {p.title}</option>)}
                    </select>
                 </div>
                  <div className="col-span-12 md:col-span-6">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Video</label>
                    <input type="text" value={formData.video_url} onChange={e => setFormData({...formData, video_url: e.target.value})} className="w-full p-2 border border-slate-300 rounded text-sm"/>
                 </div>
               </div>

               <div className="bg-white rounded-lg border border-slate-300 shadow-sm overflow-hidden flex flex-col">
                 <div className="bg-slate-100 p-2 border-b border-slate-200 text-xs text-slate-500 font-bold flex items-center gap-2"><IconBookOpen size={14}/> Contenido</div>
                 <div className="h-[500px]">
                   <ReactQuill ref={quillRef} theme="snow" value={formData.content} onChange={v => setFormData({...formData, content: v})} modules={modules} className="h-full pb-10" />
                 </div>
               </div>
             </div>
           </div>
        </div>

        {/* DRAG OVERLAY */}
        <DragOverlay dropAnimation={{ sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.5' } } }) }}>
           {activeId ? <ItemOverlay item={activeOverlayItem} /> : null}
        </DragOverlay>

      </div>
    </DndContext>
  );
}