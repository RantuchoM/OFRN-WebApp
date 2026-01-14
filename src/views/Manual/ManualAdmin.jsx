import React, { useState, useEffect, useRef, useMemo } from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { useSearchParams } from "react-router-dom"; // Para leer ?editId

// --- IMPORTS DND-KIT ---
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  defaultDropAnimationSideEffects,
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { manualService } from "../../services/manualService";
import {
  IconPlus,
  IconSave,
  IconTrash,
  IconBookOpen,
  IconChevronRight,
  IconChevronDown,
  IconCopy,
  IconLoader,
  IconFolderPlus,
  IconGripVertical,
  IconEdit,
  IconLock,
  IconLockOpen,
} from "../../components/ui/Icons";

// --- COMPONENTE DE ÍTEM DEL ÁRBOL ---
const TreeItem = ({
  item,
  depth,
  onSelect,
  isSelected,
  isExpanded,
  onToggle,
  style,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    over,
  } = useSortable({ id: item.id, data: { item, depth } });

  // DETECTAR INTENCIÓN DE ANIDAR (Si paso por encima sin soltar rápido)
  const isOverMe = over?.id === item.id;
  const isNestTarget = isOverMe && !isDragging;

  const draggingStyle = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
    paddingLeft: `${depth * 24}px`,
    ...style,
  };

  return (
    <div
      ref={setNodeRef}
      style={draggingStyle}
      // Si es target de anidamiento, lo pintamos de Sky fuerte
      className={`group relative py-1 pr-2 transition-colors duration-200 
        ${
          isNestTarget
            ? "bg-sky-100 ring-2 ring-inset ring-sky-400 z-10 rounded my-1"
            : ""
        }`}
    >
      {depth > 0 && (
        <div
          className="absolute left-0 top-0 bottom-0 border-l border-slate-200"
          style={{ left: `${depth * 24 - 12}px` }}
        ></div>
      )}

      <div
        className={`flex items-center gap-1 p-1.5 rounded cursor-pointer transition-colors ${
          isSelected
            ? "bg-sky-50 text-sky-700 font-bold ring-1 ring-sky-200"
            : "hover:bg-slate-100 text-slate-600"
        }`}
      >
        <div
          {...attributes}
          {...listeners}
          className="text-slate-300 hover:text-sky-500 cursor-grab active:cursor-grabbing p-0.5"
        >
          <IconGripVertical size={14} />
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggle(item.id);
          }}
          className={`p-0.5 rounded hover:bg-slate-200 text-slate-400 ${
            item.hasChildren ? "" : "opacity-0 pointer-events-none"
          }`}
        >
          {isExpanded ? (
            <IconChevronDown size={14} />
          ) : (
            <IconChevronRight size={14} />
          )}
        </button>

        <div
          onClick={() => onSelect(item)}
          className="flex-1 truncate select-none text-sm"
        >
          {item.title}
          {isNestTarget && (
            <span className="ml-2 text-[10px] bg-sky-600 text-white px-1.5 py-0.5 rounded-full uppercase font-bold tracking-wider">
              Hacer Padre
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

// --- CONFIGURACIÓN QUILL ---
const EDITOR_MODULES = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ["bold", "italic", "underline", "strike"],
    [{ list: "ordered" }, { list: "bullet" }],
    [{ color: [] }, { background: [] }],
    ["link", "image", "video"],
    ["clean"],
  ],
};

export default function ManualAdmin({ supabase }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [activeId, setActiveId] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isKeyLocked, setIsKeyLocked] = useState(true);

  // Hook para detectar si venimos desde el modal de lectura
const [searchParams, setSearchParams] = useSearchParams();

  const [formData, setFormData] = useState({
    id: null,
    title: "",
    section_key: "",
    content: "",
    parent_id: null,
    sort_order: 0,
    video_url: "",
  });

  const quillRef = useRef(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const imageHandler = () => {
    const input = document.createElement("input");
    input.setAttribute("type", "file");
    input.setAttribute("accept", "image/*");
    input.click();
    input.onchange = async () => {
      const file = input.files[0];
      if (file) {
        try {
          const fileName = `${Date.now()}_${file.name.replace(/\s/g, "_")}`;
          const { error } = await supabase.storage
            .from("manual-content")
            .upload(fileName, file);
          if (error) throw error;
          const { data: urlData } = supabase.storage
            .from("manual-content")
            .getPublicUrl(fileName);
          const quill = quillRef.current.getEditor();
          const range = quill.getSelection(true);
          quill.insertEmbed(range.index, "image", urlData.publicUrl);
        } catch (error) {
          alert("Error: " + error.message);
        }
      }
    };
  };

  const modules = useMemo(
    () => ({
      ...EDITOR_MODULES,
      toolbar: {
        container: EDITOR_MODULES.toolbar,
        handlers: { image: imageHandler },
      },
    }),
    []
  );

  useEffect(() => {
    loadData();
  }, []);

  // --- EFECTO PARA ABRIR DESDE URL (Edición Directa) ---
  // --- EFECTO PARA ABRIR DESDE URL (Editar O Crear) ---
useEffect(() => {
    const editId = searchParams.get('editId');
    const createKey = searchParams.get('createKey');

    // 1. MODO EDICIÓN
    if (!loading && items.length > 0 && editId) {
      const targetItem = items.find(i => i.id === editId);
      if (targetItem) {
        handleSelect(targetItem);
        // Expandir padres...
        const parentsToExpand = new Set();
        let currentParent = targetItem.parent_id;
        while (currentParent) {
          parentsToExpand.add(currentParent);
          const parentObj = items.find(i => i.id === currentParent);
          currentParent = parentObj ? parentObj.parent_id : null;
        }
        setExpandedIds(prev => {
           const newSet = new Set(prev);
           parentsToExpand.forEach(id => newSet.add(id));
           return newSet;
        });
        
        // LIMPIEZA SEGURA: Quitamos editId pero DEJAMOS el tab
        setSearchParams(prev => {
            const newParams = new URLSearchParams(prev);
            newParams.delete('editId');
            return newParams;
        }, { replace: true });
      }
    }

    // 2. MODO CREACIÓN
    if (!loading && createKey) {
        setIsKeyLocked(false);
        setFormData({
            id: null,
            title: `Nueva Sección (${createKey})`,
            section_key: createKey,
            content: '<p>Contenido...</p>',
            parent_id: null,
            sort_order: items.length + 1,
            video_url: ''
        });
        setSelectedItem(null);
        
        // LIMPIEZA SEGURA
        setSearchParams(prev => {
            const newParams = new URLSearchParams(prev);
            newParams.delete('createKey');
            return newParams;
        }, { replace: true });
    }

  }, [loading, items, searchParams, setSearchParams]);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await manualService.getAll();
      setItems(data);
      // Auto-expandir el primer nivel
      const roots = data.filter((i) => !i.parent_id).map((i) => i.id);
      setExpandedIds((prev) => new Set([...prev, ...roots]));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // --- CONSTRUCCIÓN DEL ÁRBOL VISUAL ---
  const visualItems = useMemo(() => {
    const tree = [];
    const childrenMap = {};

    items.forEach((item) => {
      const pid = item.parent_id || "root";
      if (!childrenMap[pid]) childrenMap[pid] = [];
      childrenMap[pid].push(item);
    });

    Object.values(childrenMap).forEach((list) =>
      list.sort((a, b) => a.sort_order - b.sort_order)
    );

    const flatten = (parentId = "root", depth = 0) => {
      const children = childrenMap[parentId] || [];
      children.forEach((child) => {
        const hasChildren = !!childrenMap[child.id];
        tree.push({ ...child, depth, hasChildren });
        if (expandedIds.has(child.id)) {
          flatten(child.id, depth + 1);
        }
      });
    };

    flatten();
    return tree;
  }, [items, expandedIds]);

  const toggleExpand = (id, forceState) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (forceState === true) next.add(id);
      else if (forceState === false) next.delete(id);
      else if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // --- DRAG & DROP LOGIC ---
  const handleDragStart = (event) => setActiveId(event.active.id);

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;
    if (active.id === over.id) return;

    const activeItem = items.find((i) => i.id === active.id);
    const overItem = items.find((i) => i.id === over.id);
    if (!activeItem || !overItem) return;

    let newParentId = activeItem.parent_id;
    let newSortOrder = activeItem.sort_order;

    // REGLA 1: ANIDAMIENTO EXPLÍCITO (Soltar 'A' sobre 'B')
    const isDroppingOnDifferentItem = activeItem.parent_id !== overItem.id;

    if (isDroppingOnDifferentItem) {
      newParentId = overItem.id;
      const currentChildrenCount = items.filter(
        (i) => i.parent_id === overItem.id
      ).length;
      newSortOrder = currentChildrenCount + 1;
      toggleExpand(overItem.id, true);
    } else {
      // REGLA 2: REORDENAMIENTO (Mismo Padre)
      newParentId = overItem.parent_id;
      newSortOrder = overItem.sort_order;
    }

    try {
      setItems((prev) =>
        prev.map((item) =>
          item.id === activeItem.id
            ? { ...item, parent_id: newParentId, sort_order: newSortOrder }
            : item
        )
      );
      await manualService.moveItem(activeItem.id, newParentId, newSortOrder);
    } catch (e) {
      console.error(e);
      alert("Error moviendo item: " + e.message);
      loadData();
    }
  };

  // --- CRUD ---
  const handleCreateRoot = () => {
    setIsKeyLocked(false);
    const newKey = `root_${Date.now().toString(36)}`;
    setFormData({
      id: null,
      title: "Nueva Raíz",
      section_key: newKey,
      content: "<p>Inicio...</p>",
      parent_id: null,
      sort_order: items.length,
      video_url: "",
    });
    setSelectedItem(null);
  };

  const handleCreateChild = (parentId) => {
    setIsKeyLocked(false);
    const newKey = `sub_${Date.now().toString(36)}`;
    setFormData({
      id: null,
      title: "Nuevo Sub-tema",
      section_key: newKey,
      content: "<p>Detalle...</p>",
      parent_id: parentId,
      sort_order: 999,
      video_url: "",
    });
    setSelectedItem(null);
    if (parentId) toggleExpand(parentId, true);
  };

  const handleSelect = (item) => {
    setIsKeyLocked(true);
    setSelectedItem(item.id);
    setFormData({ ...item, content: item.content || "" });
  };

  const handleSave = async () => {
    if (!formData.title || !formData.section_key)
      return alert("Falta Título o Key");
    try {
      if (formData.id) {
        await manualService.update(formData.id, formData);
        setItems((prev) =>
          prev.map((i) => (i.id === formData.id ? { ...i, ...formData } : i))
        );
      } else {
        const newItem = await manualService.create(formData);
        setItems((prev) => [...prev, newItem]);
        handleSelect(newItem);
      }
      alert("Guardado");
    } catch (e) {
      alert(e.message);
    }
  };

  const handleDelete = async () => {
    if (!formData.id || !confirm("¿Borrar sección y sus hijos?")) return;
    try {
      await manualService.delete(formData.id);
      setItems((prev) => prev.filter((i) => i.id !== formData.id));
      setFormData({ id: null, title: "", section_key: "", content: "" });
    } catch (e) {
      alert(e.message);
    }
  };

  const activeOverlayItem = useMemo(
    () => items.find((i) => i.id === activeId),
    [activeId, items]
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-full bg-slate-50">
        {/* SIDEBAR ÁRBOL */}
        <div
          className={`${
            isSidebarOpen ? "w-80" : "w-0"
          } bg-white border-r border-slate-200 transition-all duration-300 flex flex-col overflow-hidden`}
        >
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center shrink-0">
            <h2 className="font-bold text-slate-700 flex items-center gap-2">
              <IconBookOpen className="text-sky-600" /> Índice
            </h2>
            <div className="flex gap-1">
              <button
                onClick={handleCreateRoot}
                className="p-1.5 bg-sky-100 text-sky-700 rounded hover:bg-sky-200"
                title="Nueva Raíz"
              >
                <IconFolderPlus size={16} />
              </button>
              {selectedItem && (
                <button
                  onClick={() => handleCreateChild(selectedItem)}
                  className="p-1.5 bg-emerald-100 text-emerald-700 rounded hover:bg-emerald-200"
                  title="Agregar Hijo"
                >
                  <IconPlus size={16} />
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {loading ? (
              <IconLoader className="animate-spin m-4 text-sky-500" />
            ) : (
              <SortableContext
                items={visualItems.map((i) => i.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-0.5">
                  {visualItems.map((item) => (
                    <TreeItem
                      key={item.id}
                      item={item}
                      depth={item.depth}
                      isSelected={selectedItem === item.id}
                      isExpanded={expandedIds.has(item.id)}
                      onSelect={handleSelect}
                      onToggle={toggleExpand}
                    />
                  ))}
                </div>
              </SortableContext>
            )}
            <div className="h-20" onClick={() => setSelectedItem(null)}></div>
          </div>
        </div>

        {/* EDITOR */}
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          {/* Toolbar */}
          <div className="bg-white border-b border-slate-200 p-4 flex justify-between items-center shadow-sm z-10 shrink-0">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="text-slate-400 hover:text-slate-600"
              >
                {isSidebarOpen ? "<" : ">"}
              </button>
              <div>
                <h1 className="text-lg font-bold text-slate-800 truncate max-w-xs">
                  {formData.id ? "Editando" : "Creando"}
                </h1>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <code>{formData.section_key}</code>
                  <button
                    onClick={() =>
                      navigator.clipboard.writeText(formData.section_key)
                    }
                  >
                    <IconCopy size={12} />
                  </button>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              {formData.id && (
                <button
                  onClick={handleDelete}
                  className="p-2 text-rose-600 hover:bg-rose-50 rounded"
                >
                  <IconTrash size={16} />
                </button>
              )}
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-sky-600 text-white rounded font-bold shadow-sm hover:bg-sky-700"
              >
                <IconSave size={16} /> Guardar
              </button>
            </div>
          </div>

          {/* Formulario */}
          <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
            <div className="max-w-5xl mx-auto space-y-6 pb-20">
              <div className="grid grid-cols-12 gap-4 bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
                <div className="col-span-12 md:col-span-8">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                    Título
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    className="w-full p-2 border border-slate-300 rounded font-bold focus:ring-2 focus:ring-sky-500 outline-none"
                  />
                </div>
                <div className="col-span-6 md:col-span-4">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                    Padre
                  </label>
                  <select
                    value={formData.parent_id || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        parent_id: e.target.value || null,
                      })
                    }
                    className="w-full p-2 border border-slate-300 rounded text-sm bg-slate-50"
                  >
                    <option value="">-- Raíz --</option>
                    {items
                      .filter((i) => i.id !== formData.id)
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.parent_id ? "- " : ""}
                          {p.title}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="col-span-12 md:col-span-6">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                    Key
                  </label>
                  <div className="flex gap-1">
                    <input
                      type="text"
                      readOnly={isKeyLocked}
                      value={formData.section_key}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          section_key: e.target.value,
                        })
                      }
                      className={`flex-1 p-2 border rounded font-mono text-sm ${
                        isKeyLocked
                          ? "bg-slate-100"
                          : "bg-white ring-2 ring-sky-50 border-sky-300"
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setIsKeyLocked(!isKeyLocked)}
                      className="p-2 border rounded text-slate-400 hover:text-sky-600"
                    >
                      {isKeyLocked ? (
                        <IconLock size={16} />
                      ) : (
                        <IconLockOpen size={16} />
                      )}
                    </button>
                  </div>
                </div>
                <div className="col-span-12 md:col-span-6">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                    Video
                  </label>
                  <input
                    type="text"
                    value={formData.video_url}
                    onChange={(e) =>
                      setFormData({ ...formData, video_url: e.target.value })
                    }
                    className="w-full p-2 border border-slate-300 rounded text-sm"
                  />
                </div>
              </div>

              <div className="bg-white rounded-lg border border-slate-300 shadow-sm overflow-hidden flex flex-col h-[600px]">
                <ReactQuill
                  ref={quillRef}
                  theme="snow"
                  value={formData.content}
                  onChange={(v) => setFormData({ ...formData, content: v })}
                  modules={modules}
                  className="h-full pb-10"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Drag Overlay */}
        <DragOverlay
          dropAnimation={{
            sideEffects: defaultDropAnimationSideEffects({
              styles: { active: { opacity: "0.5" } },
            }),
          }}
        >
          {activeId && activeOverlayItem ? (
            <div className="p-2 bg-white border border-sky-500 shadow-xl rounded w-64 opacity-90 flex items-center gap-2">
              <IconGripVertical size={14} />{" "}
              <span className="font-bold truncate">
                {activeOverlayItem.title}
              </span>
            </div>
          ) : null}
        </DragOverlay>
      </div>
    </DndContext>
  );
}
