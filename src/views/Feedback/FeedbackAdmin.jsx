import React, { useState, useEffect, useMemo } from "react";
import {
  IconCheck,
  IconX,
  IconLoader,
  IconMessageSquare,
  IconTrash,
  IconFilter,
  IconSearch,
  IconRefresh,
  IconEdit
} from "../../components/ui/Icons";
import { format } from "date-fns";
import { es } from "date-fns/locale";

// Configuración de Estados y Colores
const STATUS_CONFIG = {
  PENDIENTE: { 
    label: "Pendientes", 
    color: "bg-slate-100 text-slate-600 border-slate-200", 
    activeColor: "bg-slate-800 text-white border-slate-800" 
  },
  EN_PROCESO: { 
    label: "En Proceso", 
    color: "bg-blue-50 text-blue-600 border-blue-200", 
    activeColor: "bg-blue-600 text-white border-blue-600" 
  },
  RESUELTO: { 
    label: "Resueltos", 
    color: "bg-emerald-50 text-emerald-600 border-emerald-200", 
    activeColor: "bg-emerald-600 text-white border-emerald-600" 
  },
  DESCARTADO: { 
    label: "Descartados", 
    color: "bg-red-50 text-red-600 border-red-200", 
    activeColor: "bg-red-600 text-white border-red-600" 
  },
};

export default function FeedbackAdmin({ supabase }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Filtros
  const [selectedStatuses, setSelectedStatuses] = useState(["PENDIENTE", "EN_PROCESO"]);
  const [searchTerm, setSearchTerm] = useState("");

  // ESTADO PARA EDICIÓN INLINE DE COMENTARIOS
  const [editingId, setEditingId] = useState(null);
  const [tempComment, setTempComment] = useState("");

  useEffect(() => {
    fetchFeedback();
  }, []);

  const fetchFeedback = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("app_feedback")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error("Error al cargar feedback:", error);
    } finally {
      setLoading(false);
    }
  };

  // --- CAMBIO DE ESTADO (Rápido, sin prompt) ---
  const handleStatusChange = async (id, newStatus) => {
    try {
      const { error } = await supabase
        .from("app_feedback")
        .update({ estado: newStatus }) // Solo actualizamos estado
        .eq("id", id);

      if (error) throw error;
      
      // Actualización optimista
      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, estado: newStatus } : item))
      );
    } catch (error) {
      alert("Error al actualizar estado: " + error.message);
    }
  };

  // --- MANEJO DE EDICIÓN DE COMENTARIOS ---
  const startEditing = (item) => {
    setEditingId(item.id);
    setTempComment(item.admin_comments || "");
  };

  const cancelEditing = () => {
    setEditingId(null);
    setTempComment("");
  };

  const saveComment = async (id) => {
    try {
      const { error } = await supabase
        .from("app_feedback")
        .update({ admin_comments: tempComment })
        .eq("id", id);

      if (error) throw error;

      // Actualización optimista
      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, admin_comments: tempComment } : item))
      );
      setEditingId(null);
    } catch (error) {
      alert("Error al guardar comentario: " + error.message);
    }
  };

  // --- LÓGICA DE FILTRADO ---
  const toggleStatus = (statusKey) => {
    setSelectedStatuses((prev) => {
      if (prev.includes(statusKey)) {
        return prev.filter((s) => s !== statusKey);
      } else {
        return [...prev, statusKey];
      }
    });
  };

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const currentStatus = (item.estado || "PENDIENTE").toUpperCase();
      if (!selectedStatuses.includes(currentStatus)) return false;

      if (searchTerm) {
        const lower = searchTerm.toLowerCase();
        const textMatch = 
            (item.titulo || "").toLowerCase().includes(lower) ||
            (item.mensaje || "").toLowerCase().includes(lower) ||
            (item.user_email || "").toLowerCase().includes(lower);
        if (!textMatch) return false;
      }

      return true;
    });
  }, [items, selectedStatuses, searchTerm]);

  const counts = useMemo(() => {
    const acc = { PENDIENTE: 0, EN_PROCESO: 0, RESUELTO: 0, DESCARTADO: 0 };
    items.forEach(i => {
        const s = (i.estado || "PENDIENTE").toUpperCase();
        if (acc[s] !== undefined) acc[s]++;
    });
    return acc;
  }, [items]);

  return (
    <div className="flex flex-col h-full bg-slate-50 p-4 md:p-8 animate-in fade-in">
      <div className="max-w-5xl mx-auto w-full flex flex-col h-full">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 shrink-0">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <IconMessageSquare className="text-indigo-600" />
              Centro de Feedback
            </h1>
            <p className="text-slate-500 text-sm">Gestiona reportes de error y sugerencias del equipo.</p>
          </div>
          <button 
            onClick={fetchFeedback}
            className="p-2 bg-white border border-slate-200 rounded-full text-slate-500 hover:text-indigo-600 hover:border-indigo-200 transition-colors shadow-sm"
            title="Recargar"
          >
            <IconRefresh size={20} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        {/* CONTROLES */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6 shrink-0 space-y-4">
            <div className="relative">
                <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                    type="text" 
                    placeholder="Buscar por título, mensaje o email..." 
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-slate-400 uppercase mr-2 flex items-center gap-1">
                    <IconFilter size={14}/> Estados:
                </span>
                {Object.entries(STATUS_CONFIG).map(([key, config]) => {
                    const isActive = selectedStatuses.includes(key);
                    return (
                        <button
                            key={key}
                            onClick={() => toggleStatus(key)}
                            className={`
                                flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all border shadow-sm select-none
                                ${isActive ? config.activeColor : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"}
                            `}
                        >
                            {config.label}
                            <span className={`px-1.5 py-0.5 rounded-full text-[9px] ${isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}>
                                {counts[key]}
                            </span>
                            {isActive && <IconCheck size={12} />}
                        </button>
                    );
                })}
                {selectedStatuses.length < 4 && (
                    <button 
                        onClick={() => setSelectedStatuses(Object.keys(STATUS_CONFIG))}
                        className="text-[10px] text-indigo-600 hover:underline ml-auto font-bold"
                    >
                        Ver todo
                    </button>
                )}
            </div>
        </div>

        {/* LISTA */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-3">
          {loading && items.length === 0 ? (
             <div className="text-center py-20 text-slate-400">
                <IconLoader className="animate-spin mx-auto mb-2" size={32} />
                Cargando feedback...
             </div>
          ) : filteredItems.length === 0 ? (
             <div className="text-center py-20 bg-white rounded-xl border border-dashed border-slate-300 text-slate-400">
                <IconMessageSquare size={48} className="mx-auto mb-4 opacity-20" />
                <p>No se encontraron items con los filtros actuales.</p>
             </div>
          ) : (
            filteredItems.map((item) => (
              <div 
                key={item.id} 
                className={`bg-white rounded-xl border p-4 shadow-sm transition-all hover:shadow-md ${
                    item.tipo === 'BUG' ? 'border-l-4 border-l-red-400' : 'border-l-4 border-l-emerald-400'
                }`}
              >
                <div className="flex flex-col md:flex-row gap-4 justify-between items-start">
                    <div className="flex-1 min-w-0 space-y-2">
                        {/* Header Item */}
                        <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                                item.tipo === 'BUG' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                            }`}>
                                {item.tipo === 'BUG' ? 'Error' : 'Sugerencia'}
                            </span>
                            <span className="text-xs text-slate-400">
                                {item.created_at ? format(new Date(item.created_at), "d MMM, HH:mm", { locale: es }) : '-'}
                            </span>
                            <span className={`text-[10px] px-2 py-0.5 rounded border ml-auto md:ml-0 ${
                                STATUS_CONFIG[item.estado]?.color || "bg-gray-100"
                            }`}>
                                {STATUS_CONFIG[item.estado]?.label || item.estado}
                            </span>
                        </div>

                        <h3 className="text-base font-bold text-slate-800">{item.titulo}</h3>
                        
                        <p className="text-sm text-slate-600 whitespace-pre-wrap bg-slate-50 p-3 rounded-lg border border-slate-100">
                            {item.mensaje}
                        </p>

                        {/* --- SECCIÓN DE COMENTARIOS INLINE --- */}
                        {editingId === item.id ? (
                            <div className="mt-2 animate-in fade-in zoom-in-95">
                                <textarea
                                    className="w-full text-sm p-3 border border-amber-300 rounded-lg bg-amber-50 focus:ring-2 focus:ring-amber-500 outline-none text-slate-700 placeholder:text-amber-300/50"
                                    rows={3}
                                    placeholder="Escribe una nota interna para el equipo..."
                                    value={tempComment}
                                    onChange={(e) => setTempComment(e.target.value)}
                                    autoFocus
                                />
                                <div className="flex items-center gap-2 mt-2">
                                    <button 
                                        onClick={() => saveComment(item.id)}
                                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded flex items-center gap-1 transition-colors shadow-sm"
                                    >
                                        <IconCheck size={14} /> Guardar Nota
                                    </button>
                                    <button 
                                        onClick={cancelEditing}
                                        className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-500 text-xs font-bold rounded flex items-center gap-1 transition-colors"
                                    >
                                        <IconX size={14} /> Cancelar
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="mt-2 group">
                                {item.admin_comments ? (
                                    <div 
                                        onClick={() => startEditing(item)}
                                        className="bg-amber-50 border border-amber-100 p-3 rounded-lg text-xs text-amber-800 cursor-pointer hover:border-amber-300 transition-colors relative"
                                    >
                                        <span className="font-bold block mb-1 text-amber-900/50 uppercase text-[10px] tracking-wider">Nota Admin:</span>
                                        <p className="whitespace-pre-wrap leading-relaxed">{item.admin_comments}</p>
                                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <IconEdit size={14} className="text-amber-400" />
                                        </div>
                                    </div>
                                ) : (
                                    <button 
                                        onClick={() => startEditing(item)}
                                        className="text-[10px] text-slate-400 hover:text-indigo-600 flex items-center gap-1 py-1 px-2 hover:bg-slate-100 rounded transition-colors border border-transparent hover:border-slate-200"
                                    >
                                        <IconEdit size={12} /> Agregar nota interna
                                    </button>
                                )}
                            </div>
                        )}

                        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-2 border-t border-slate-100 mt-2">
                            <span className="flex items-center gap-1 font-medium">
                                👤 {item.user_email || 'Anónimo'}
                            </span>
                            {item.ruta_pantalla && (
                                <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">
                                    {item.ruta_pantalla}
                                </span>
                            )}
                            {item.screenshot_path && (
                                <a href={item.screenshot_path} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline flex items-center gap-1 ml-auto">
                                    📸 Ver Captura
                                </a>
                            )}
                        </div>
                    </div>

                    {/* BOTONES DE ACCIÓN */}
                    <div className="flex flex-row md:flex-col gap-2 shrink-0 md:border-l md:border-slate-100 md:pl-4 min-w-[140px]">
                        <span className="text-[10px] font-bold text-slate-400 uppercase hidden md:block mb-1">Acciones</span>
                        
                        {item.estado !== 'PENDIENTE' && (
                            <button 
                                onClick={() => handleStatusChange(item.id, 'PENDIENTE')}
                                className="px-3 py-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-700 text-xs font-bold transition-colors flex items-center gap-2 border border-transparent"
                            >
                                <IconRefresh size={14} /> Reabrir
                            </button>
                        )}

                        {item.estado !== 'EN_PROCESO' && item.estado !== 'RESUELTO' && item.estado !== 'DESCARTADO' && (
                            <button 
                                onClick={() => handleStatusChange(item.id, 'EN_PROCESO')}
                                className="px-3 py-1.5 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-bold transition-colors border border-blue-100 flex items-center justify-center gap-2"
                            >
                                Iniciar
                            </button>
                        )}

                        {item.estado !== 'RESUELTO' && (
                            <button 
                                onClick={() => handleStatusChange(item.id, 'RESUELTO')}
                                className="px-3 py-1.5 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-bold transition-colors border border-emerald-100 flex items-center justify-center gap-2"
                            >
                                <IconCheck size={14} /> Resolver
                            </button>
                        )}

                        {item.estado !== 'DESCARTADO' && item.estado !== 'RESUELTO' && (
                            <button 
                                onClick={() => handleStatusChange(item.id, 'DESCARTADO')}
                                className="px-3 py-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-600 text-xs font-bold transition-colors flex items-center justify-center gap-2"
                            >
                                <IconTrash size={14} /> Descartar
                            </button>
                        )}
                    </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}