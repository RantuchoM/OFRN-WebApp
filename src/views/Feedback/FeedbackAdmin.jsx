import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  IconCheck,
  IconX,
  IconLoader,
  IconBulb,
  IconTrash,
  IconFilter,
  IconSearch,
  IconRefresh,
  IconEdit,
  IconUser,
  IconClipboard,
  IconAlertCircle,
  IconHelpCircle,
} from "../../components/ui/Icons";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { useAuth } from "../../context/AuthContext";

// Configuración de Estados y Colores (filtros y badges)
const STATUS_CONFIG = {
  PENDIENTE: {
    label: "Pendientes",
    color: "bg-slate-100 text-slate-600 border-slate-200",
    activeColor: "bg-slate-800 text-white border-slate-800",
    barColor: "border-l-amber-500",
  },
  EN_PROCESO: {
    label: "En Proceso",
    color: "bg-blue-50 text-blue-600 border-blue-200",
    activeColor: "bg-blue-600 text-white border-blue-600",
    barColor: "border-l-blue-500",
  },
  RESUELTO: {
    label: "Resueltos",
    color: "bg-emerald-50 text-emerald-600 border-emerald-200",
    activeColor: "bg-emerald-600 text-white border-emerald-600",
    barColor: "border-l-emerald-500",
  },
  DESCARTADO: {
    label: "Descartados",
    color: "bg-red-50 text-red-600 border-red-200",
    activeColor: "bg-red-600 text-white border-red-600",
    barColor: "border-l-slate-400",
  },
};

// Identificador izquierdo de la tarjeta = estado (naranja / azul / verde). Tipo se muestra con icono en el badge.
const ESTADO_BAR = {
  PENDIENTE: "border-l-4 border-l-amber-500",
  EN_PROCESO: "border-l-4 border-l-blue-500",
  RESUELTO: "border-l-4 border-l-emerald-500",
  DESCARTADO: "border-l-4 border-l-slate-400",
};

// Tipos de feedback: icono + color (Sugerencia = notepad verde, Error = rojo, Ayuda = signo ? amarillo)
const TIPO_CONFIG = {
  Sugerencia: { label: "Sugerencia", Icon: IconClipboard, color: "text-emerald-700 bg-emerald-100" },
  Error: { label: "Error", Icon: IconAlertCircle, color: "text-red-700 bg-red-100" },
  BUG: { label: "Error", Icon: IconAlertCircle, color: "text-red-700 bg-red-100" },
  Ayuda: { label: "Ayuda", Icon: IconHelpCircle, color: "text-amber-600 bg-amber-100" },
};
function getTipoConfig(tipo) {
  return TIPO_CONFIG[tipo] || TIPO_CONFIG.Sugerencia;
}

const TAB_ADMIN = "admin";
const TAB_MIS_PEDIDOS = "mis_pedidos";

/** Normaliza para comparación: minúsculas y sin acentos. */
function normalizeForMatch(s) {
  if (!s || typeof s !== "string") return "";
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim();
}

/** Indica si el registro de feedback corresponde al usuario logueado (por email o por nombre+apellido). */
function isMyFeedback(item, user) {
  const ue = (item.user_email || "").trim();
  const email = (user?.mail || user?.email || "").trim();
  if (email && ue.toLowerCase().includes(email.toLowerCase())) return true;
  const nombre = (user?.nombre || "").trim();
  const apellido = (user?.apellido || "").trim();
  if (!nombre && !apellido) return false;
  const ueNorm = normalizeForMatch(ue);
  const fullName1 = normalizeForMatch(`${nombre} ${apellido}`);
  const fullName2 = normalizeForMatch(`${apellido} ${nombre}`);
  const fullName3 = normalizeForMatch(`${apellido}, ${nombre}`);
  return (
    (fullName1.length > 0 && ueNorm.includes(fullName1)) ||
    (fullName2.length > 0 && ueNorm.includes(fullName2)) ||
    (fullName3.length > 0 && ueNorm.includes(fullName3))
  );
}

export default function FeedbackAdmin({ supabase }) {
  const { user, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState(TAB_MIS_PEDIDOS);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filtros (solo vista Admin)
  const [selectedStatuses, setSelectedStatuses] = useState(["PENDIENTE", "EN_PROCESO"]);
  const [searchTerm, setSearchTerm] = useState("");

  // Edición inline de comentarios (Admin)
  const [editingId, setEditingId] = useState(null);
  const [tempComment, setTempComment] = useState("");
  const [resolvingId, setResolvingId] = useState(null);

  // Modal editar pedido (Mis Pedidos, solo estado Pendiente)
  const [editModalItem, setEditModalItem] = useState(null);
  const [editTitulo, setEditTitulo] = useState("");
  const [editMensaje, setEditMensaje] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [savingResolution, setSavingResolution] = useState(false);

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

  const myItems = useMemo(() => {
    if (!user) return [];
    return items.filter((item) => isMyFeedback(item, user));
  }, [items, user]);

  // --- CAMBIO DE ESTADO (Admin) ---
  const handleStatusChange = async (id, newStatus) => {
    if (newStatus === "RESUELTO") {
      const item = items.find((i) => i.id === id);
      if (item) {
        setResolvingId(id);
        startEditing(item);
      }
      return;
    }
    try {
      const { error } = await supabase
        .from("app_feedback")
        .update({ estado: newStatus })
        .eq("id", id);

      if (error) throw error;

      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, estado: newStatus } : item))
      );
    } catch (error) {
      toast.error("Error al actualizar estado: " + error.message);
    }
  };

  const startEditing = (item) => {
    setEditingId(item.id);
    setTempComment(item.admin_comments || "");
  };

  const cancelEditing = () => {
    setEditingId(null);
    setTempComment("");
    setResolvingId(null);
  };

  const saveComment = async (id) => {
    const item = items.find((i) => i.id === id);
    if (!item) return;
    setSavingResolution(true);
    const isResolving = resolvingId === id;
    try {
      const updatePayload = { admin_comments: tempComment };
      if (isResolving) updatePayload.estado = "RESUELTO";

      const { error } = await supabase
        .from("app_feedback")
        .update(updatePayload)
        .eq("id", id);

      if (error) throw error;

      const newEstado = isResolving ? "RESUELTO" : item.estado;
      const updated = { ...item, admin_comments: tempComment, estado: newEstado };
      setItems((prev) =>
        prev.map((i) => (i.id === id ? updated : i))
      );
      setEditingId(null);
      setResolvingId(null);

      const body = {
        record: updated,
        is_resolution: isResolving,
        admin_comments: tempComment,
      };
      try {
        const { data: fnData, error: fnError } = await supabase.functions.invoke("send-feedback-email", {
          body,
        });
        if (fnError) {
          console.warn("send-feedback-email:", fnError);
          toast.error("Estado guardado, pero " + (fnError.message || "no se pudo enviar el mail al usuario."));
        } else if (fnData?.ok === false) {
          toast.error(isResolving ? "Resolución guardada. Mail: " + (fnData?.error || "sin email") : "Nota guardada. Mail: " + (fnData?.error || "sin email"));
        } else {
          toast.success(isResolving ? "Resolución guardada y usuario notificado." : "Nota guardada.");
        }
      } catch (invokeErr) {
        console.error("send-feedback-email invoke:", invokeErr);
        toast.error("Estado guardado, pero falló el envío del mail: " + (invokeErr?.message || "error de red"));
      }
    } catch (error) {
      toast.error("Error al guardar comentario: " + error.message);
    } finally {
      setSavingResolution(false);
    }
  };

  // --- Modal Editar (Mis Pedidos, estado Pendiente) ---
  const openEditModal = (item) => {
    setEditModalItem(item);
    setEditTitulo(item.titulo || "");
    setEditMensaje(item.mensaje || "");
  };

  const closeEditModal = () => {
    setEditModalItem(null);
    setEditTitulo("");
    setEditMensaje("");
  };

  const saveEditModal = async () => {
    if (!editModalItem) return;
    setSavingEdit(true);
    try {
      const { error } = await supabase
        .from("app_feedback")
        .update({ titulo: editTitulo.trim(), mensaje: editMensaje.trim() })
        .eq("id", editModalItem.id);

      if (error) throw error;

      const updated = {
        ...editModalItem,
        titulo: editTitulo.trim(),
        mensaje: editMensaje.trim(),
      };
      setItems((prev) =>
        prev.map((i) => (i.id === editModalItem.id ? updated : i))
      );

      const { data: fnData, error: fnError } = await supabase.functions.invoke("send-feedback-email", {
        body: { record: updated, is_update: true },
      });
      if (fnError) {
        console.warn("send-feedback-email (is_update):", fnError);
        const msg = fnError.message || "no se pudo notificar a administración.";
        toast.error("Pedido actualizado, pero " + msg);
      } else if (fnData?.ok === false) {
        toast.error("Pedido actualizado. Notificación: " + (fnData?.error || "error desconocido"));
      } else {
        toast.success("Pedido actualizado y administración notificada.");
      }

      closeEditModal();
    } catch (error) {
      toast.error("Error al guardar: " + error.message);
    } finally {
      setSavingEdit(false);
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

  const displayItems = activeTab === TAB_MIS_PEDIDOS ? myItems : filteredItems;
  const isAdminView = activeTab === TAB_ADMIN;

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
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 shrink-0">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <IconBulb className="text-indigo-600" />
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

        {/* PESTAÑAS */}
        <div className="flex items-center gap-2 mb-4 shrink-0">
          <button
            onClick={() => setActiveTab(TAB_MIS_PEDIDOS)}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
              activeTab === TAB_MIS_PEDIDOS
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            <IconUser size={18} />
            Mis Pedidos
            <span className="px-1.5 py-0.5 rounded text-xs bg-white/20 text-inherit">{myItems.length}</span>
          </button>
          {isAdmin && (
            <button
              onClick={() => setActiveTab(TAB_ADMIN)}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
                activeTab === TAB_ADMIN
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              <IconBulb size={18} />
              Administración
              <span className="px-1.5 py-0.5 rounded text-xs bg-white/20 text-inherit">{items.length}</span>
            </button>
          )}
        </div>

        {/* CONTROLES (solo vista Admin) */}
        {isAdminView && (
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
        )}

        {/* LISTA */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-3">
          {loading && items.length === 0 ? (
             <div className="text-center py-20 text-slate-400">
                <IconLoader className="animate-spin mx-auto mb-2" size={32} />
                Cargando feedback...
             </div>
          ) : displayItems.length === 0 ? (
             <div className="text-center py-20 bg-white rounded-xl border border-dashed border-slate-300 text-slate-400">
                <IconBulb size={48} className="mx-auto mb-4 opacity-20" />
                <p>{activeTab === TAB_MIS_PEDIDOS ? "No tienes pedidos de feedback." : "No se encontraron items con los filtros actuales."}</p>
             </div>
          ) : (
            displayItems.map((item) => {
              const estadoBar = ESTADO_BAR[item.estado] || ESTADO_BAR.PENDIENTE;
              const tipoConf = getTipoConfig(item.tipo);
              const TipoIcon = tipoConf.Icon;
              return (
              <div
                key={item.id}
                className={`bg-white rounded-xl border p-4 shadow-sm transition-all hover:shadow-md ${estadoBar}`}
              >
                <div className="flex flex-col md:flex-row gap-4 justify-between items-start">
                    <div className="flex-1 min-w-0 space-y-2">
                        {/* Header Item */}
                        <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider flex items-center gap-1 ${tipoConf.color}`}>
                                <TipoIcon size={12} />
                                {tipoConf.label}
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

                        {/* --- Respuesta de administración (visible en Mis Pedidos cuando está resuelto) --- */}
                        {activeTab === TAB_MIS_PEDIDOS && item.admin_comments && (
                            <div className="mt-2 p-3 rounded-lg bg-emerald-50 border border-emerald-100">
                                <span className="font-bold block mb-1 text-emerald-800 uppercase text-[10px] tracking-wider">Respuesta de administración</span>
                                <p className="text-sm text-emerald-900 whitespace-pre-wrap leading-relaxed">{item.admin_comments}</p>
                            </div>
                        )}

                        {/* --- SECCIÓN DE COMENTARIOS INLINE (solo Admin) --- */}
                        {isAdminView && editingId === item.id ? (
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
                                        disabled={savingResolution}
                                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded flex items-center gap-1 transition-colors shadow-sm disabled:opacity-50"
                                    >
                                        {savingResolution ? <IconLoader size={14} className="animate-spin" /> : <IconCheck size={14} />}
                                        Guardar Nota
                                    </button>
                                    <button 
                                        onClick={cancelEditing}
                                        className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-500 text-xs font-bold rounded flex items-center gap-1 transition-colors"
                                    >
                                        <IconX size={14} /> Cancelar
                                    </button>
                                </div>
                            </div>
                        ) : isAdminView && (
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
                        {activeTab === TAB_MIS_PEDIDOS ? (
                            (item.estado || "").toUpperCase() === "PENDIENTE" && (
                                <button
                                    onClick={() => openEditModal(item)}
                                    className="px-3 py-1.5 rounded bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-bold transition-colors border border-indigo-100 flex items-center justify-center gap-2"
                                >
                                    <IconEdit size={14} /> Editar
                                </button>
                            )
                        ) : (
                            <>
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
                            </>
                        )}
                    </div>
                </div>
              </div>
            );
            })
          )}
        </div>
      </div>

      {editModalItem && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/30"
          role="dialog"
          aria-modal="true"
          aria-label="Editar pedido"
        >
          <div className="absolute inset-0" onClick={closeEditModal} aria-hidden />
          <div className="relative z-10 bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md p-5">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Editar pedido</h3>
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-500 uppercase">Título</label>
              <input
                type="text"
                value={editTitulo}
                onChange={(e) => setEditTitulo(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="Título del pedido"
              />
              <label className="block text-xs font-bold text-slate-500 uppercase">Mensaje</label>
              <textarea
                value={editMensaje}
                onChange={(e) => setEditMensaje(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                placeholder="Mensaje"
              />
            </div>
            <div className="flex items-center justify-end gap-2 mt-5">
              <button type="button" onClick={closeEditModal} className="px-3 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-bold">
                Cancelar
              </button>
              <button
                type="button"
                onClick={saveEditModal}
                disabled={savingEdit}
                className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 text-sm font-bold flex items-center gap-2 disabled:opacity-50"
              >
                {savingEdit ? <IconLoader size={16} className="animate-spin" /> : <IconCheck size={16} />}
                Guardar
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}