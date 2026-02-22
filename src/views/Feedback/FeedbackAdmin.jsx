import React, { useState, useEffect, useMemo, useRef } from "react";
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

// Borde izquierdo + tinte sutil de tarjeta por estado (el color ya indica el estado, sin badge).
const ESTADO_BAR = {
  PENDIENTE: "border-l-4 border-l-amber-500",
  EN_PROCESO: "border-l-4 border-l-blue-500",
  RESUELTO: "border-l-4 border-l-emerald-500",
  DESCARTADO: "border-l-4 border-l-slate-400",
};
const ESTADO_TINT = {
  PENDIENTE: "bg-amber-50/50",
  EN_PROCESO: "bg-blue-50/50",
  RESUELTO: "bg-emerald-50/50",
  DESCARTADO: "bg-slate-50/50",
};
function getEstadoTint(estado) {
  return ESTADO_TINT[estado] || ESTADO_TINT.PENDIENTE;
}

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

const TAB_ADMIN = "admin";       // Gestión General (solo admin)
const TAB_MIS_PEDIDOS = "mis_pedidos"; // Mis Reportes

/** Tipos usados en filtro (valores en BD pueden ser Sugerencia, Error, BUG, Ayuda). */
const TIPO_FILTER_KEYS = ["Sugerencia", "Error", "Ayuda"];

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
  const defaultTabSet = useRef(false);
  const [activeTab, setActiveTab] = useState(TAB_MIS_PEDIDOS);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filtros (solo vista Admin): una sola línea (Búsqueda, Tipo, Estado)
  const [selectedStatuses, setSelectedStatuses] = useState(["PENDIENTE", "EN_PROCESO"]);
  const [selectedTypes, setSelectedTypes] = useState([]); // vacío = todos los tipos
  const [searchTerm, setSearchTerm] = useState("");

  // Expandir detalle de un reporte (fila compacta → detalle debajo)
  const [expandedId, setExpandedId] = useState(null);

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

  // Admin: vista por defecto = Gestión General; usuario = solo Mis Reportes
  useEffect(() => {
    if (defaultTabSet.current || user === undefined) return;
    defaultTabSet.current = true;
    setActiveTab(isAdmin ? TAB_ADMIN : TAB_MIS_PEDIDOS);
  }, [user, isAdmin]);

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
        setExpandedId(id);
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
    setExpandedId(item.id);
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

  // --- LÓGICA DE FILTRADO (reactiva a la línea de filtros) ---
  const toggleStatus = (statusKey) => {
    setSelectedStatuses((prev) => {
      if (prev.includes(statusKey)) return prev.filter((s) => s !== statusKey);
      return [...prev, statusKey];
    });
  };

  const toggleType = (tipoKey) => {
    setSelectedTypes((prev) => {
      if (prev.includes(tipoKey)) return prev.filter((t) => t !== tipoKey);
      return [...prev, tipoKey];
    });
  };

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const currentStatus = (item.estado || "PENDIENTE").toUpperCase();
      if (!selectedStatuses.includes(currentStatus)) return false;

      if (selectedTypes.length > 0) {
        const tipo = (item.tipo || "Sugerencia").trim();
        const tipoNorm = tipo === "BUG" ? "Error" : tipo;
        if (!selectedTypes.includes(tipoNorm)) return false;
      }

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
  }, [items, selectedStatuses, selectedTypes, searchTerm]);

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
    <div className="flex flex-col h-full bg-slate-50 p-3 md:p-6 animate-in fade-in">
      <div className="w-full max-w-[1600px] mx-auto flex flex-col h-full min-w-0">
        {/* HEADER: título + refresh */}
        <div className="flex items-center justify-between gap-3 mb-3 shrink-0">
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <IconBulb className="text-indigo-600 shrink-0" />
            Centro de Feedback
          </h1>
          <button
            onClick={fetchFeedback}
            className="p-2 bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-indigo-600 hover:border-indigo-200 transition-colors shadow-sm shrink-0"
            title="Recargar"
          >
            <IconRefresh size={18} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        {/* PESTAÑAS: Admin = Gestión General (default) | Mis Reportes; Usuario = solo Mis Reportes */}
        <div className="flex items-center gap-2 mb-3 shrink-0">
          {isAdmin && (
            <button
              onClick={() => setActiveTab(TAB_ADMIN)}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === TAB_ADMIN
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              <IconBulb size={16} />
              Gestión General
              <span className="px-1.5 py-0.5 rounded text-xs bg-white/20">{items.length}</span>
            </button>
          )}
          <button
            onClick={() => setActiveTab(TAB_MIS_PEDIDOS)}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === TAB_MIS_PEDIDOS
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            <IconUser size={16} />
            Mis Reportes
            <span className="px-1.5 py-0.5 rounded text-xs bg-white/20">{myItems.length}</span>
          </button>
        </div>

        {/* LÍNEA ÚNICA DE FILTROS (solo vista Gestión General): Búsqueda | Tipo | Estado */}
        {isAdminView && (
          <div className="flex flex-row flex-wrap items-center gap-3 mb-3 shrink-0 py-2 px-3 bg-white rounded-lg border border-slate-200 shadow-sm">
            <div className="relative flex-1 min-w-[180px] max-w-[280px]">
              <IconSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Buscar título, mensaje, email..."
                className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <span className="text-xs font-semibold text-slate-400 uppercase flex items-center gap-1 shrink-0">
              <IconFilter size={12} /> Tipo:
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {TIPO_FILTER_KEYS.map((key) => {
                const conf = TIPO_CONFIG[key] || TIPO_CONFIG.Sugerencia;
                const IconT = conf.Icon;
                const isActive = selectedTypes.length === 0 || selectedTypes.includes(key);
                return (
                  <button
                    key={key}
                    onClick={() => toggleType(key)}
                    className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border transition-all ${
                      isActive ? conf.color + " border-current/30" : "bg-slate-50 text-slate-400 border-slate-200"
                    }`}
                  >
                    <IconT size={12} />
                    {conf.label}
                  </button>
                );
              })}
              {selectedTypes.length > 0 && (
                <button
                  onClick={() => setSelectedTypes([])}
                  className="text-[10px] text-indigo-600 hover:underline font-semibold"
                >
                  Ver todos
                </button>
              )}
            </div>
            <span className="text-xs font-semibold text-slate-400 uppercase flex items-center gap-1 shrink-0 ml-1">
              Estado:
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {Object.entries(STATUS_CONFIG).map(([key, config]) => {
                const isActive = selectedStatuses.includes(key);
                return (
                  <button
                    key={key}
                    onClick={() => toggleStatus(key)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all border ${
                      isActive ? config.activeColor : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {config.label}
                    <span className={`px-1 py-0.5 rounded text-[10px] ${isActive ? "bg-white/20" : "bg-slate-100 text-slate-500"}`}>
                      {counts[key]}
                    </span>
                  </button>
                );
              })}
              {selectedStatuses.length < 4 && (
                <button
                  onClick={() => setSelectedStatuses(Object.keys(STATUS_CONFIG))}
                  className="text-[10px] text-indigo-600 hover:underline font-semibold"
                >
                  Ver todo
                </button>
              )}
            </div>
          </div>
        )}

        {/* LISTA: filas compactas horizontales — [Icono][ID] | [Título] | [Badge] | [Email] | [Fecha] | [Acciones] */}
        <div className="flex-1 overflow-y-auto min-h-0 pr-1">
          {loading && items.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <IconLoader className="animate-spin mx-auto mb-2" size={28} />
              <p className="text-sm">Cargando feedback...</p>
            </div>
          ) : displayItems.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-lg border border-dashed border-slate-300 text-slate-400">
              <IconBulb size={40} className="mx-auto mb-3 opacity-20" />
              <p className="text-sm">{activeTab === TAB_MIS_PEDIDOS ? "No tienes reportes." : "No hay resultados con los filtros actuales."}</p>
            </div>
          ) : (
            <div className="space-y-1">
              {displayItems.map((item) => {
                const estadoBar = ESTADO_BAR[item.estado] || ESTADO_BAR.PENDIENTE;
                const estadoTint = getEstadoTint(item.estado);
                const tipoConf = getTipoConfig(item.tipo);
                const TipoIcon = tipoConf.Icon;
                const isExpanded = expandedId === item.id;
                const shortDate = item.created_at ? format(new Date(item.created_at), "dd/MM HH:mm", { locale: es }) : "-";
                return (
                  <div
                    key={item.id}
                    className={`rounded-lg border shadow-sm transition-all ${estadoBar} ${estadoTint} overflow-hidden`}
                  >
                    {/* FILA COMPACTA HORIZONTAL */}
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => setExpandedId((id) => (id === item.id ? null : item.id))}
                      onKeyDown={(e) => e.key === "Enter" && setExpandedId((id) => (id === item.id ? null : item.id))}
                      className="flex flex-row items-start gap-3 py-2 px-3 hover:bg-white/30 cursor-pointer min-h-0"
                    >
                      {/* Col 1: Icono + ID */}
                      <div className="flex items-center gap-2 shrink-0 min-w-0">
                        <span className={`flex items-center justify-center w-8 h-8 rounded ${tipoConf.color}`}>
                          <TipoIcon size={16} />
                        </span>
                        <span className="text-xs font-mono text-slate-500 truncate max-w-[72px]" title={String(item.id)}>
                          #{item.id?.toString().slice(-6) ?? "-"}
                        </span>
                      </div>
                      <span className="text-slate-200 shrink-0">|</span>
                      {/* Col 2: Título (truncado) — estado se sobreentiende por borde + tinte */}
                      <div className="min-w-0 w-[140px] sm:w-[180px] shrink-0">
                        <span className="text-sm font-semibold text-slate-800 truncate block" title={item.titulo}>
                          {item.titulo || "Sin título"}
                        </span>
                      </div>
                      <span className="text-slate-200 shrink-0 hidden md:inline">|</span>
                      {/* Col 3: Detalle truncado — ocupa todo el espacio horizontal restante */}
                      <div className="flex-1 min-w-0 hidden md:block">
                        <span
                          className="text-xs text-slate-600 line-clamp-2 block break-words"
                          title={item.mensaje || ""}
                        >
                          {item.mensaje || "—"}
                        </span>
                      </div>
                      <span className="text-slate-200 shrink-0 hidden md:inline">|</span>
                      {/* Col 4: Persona que carga — columna fija, independiente de los botones */}
                      <div className="hidden sm:flex flex-col items-start shrink-0 text-slate-500 text-left w-[140px] lg:w-[160px]">
                        <span className="text-xs truncate w-full text-left" title={item.user_email || "Anónimo"}>
                          {item.user_email || "Anónimo"}
                        </span>
                        <span className="text-[11px]">{shortDate}</span>
                      </div>
                      <div className="flex sm:hidden flex-col items-end shrink-0 text-slate-500 text-xs">
                        <span className="text-[11px]">{shortDate}</span>
                      </div>
                      <span className="text-slate-200 shrink-0 hidden sm:inline">|</span>
                      {/* Col 5: Acciones — ancho fijo para no desplazar la columna nombre */}
                      <div className="flex items-center gap-1 shrink-0 w-[200px] sm:w-[220px] justify-end" onClick={(e) => e.stopPropagation()}>
                        {activeTab === TAB_MIS_PEDIDOS ? (
                          (item.estado || "").toUpperCase() === "PENDIENTE" && (
                            <button
                              onClick={() => openEditModal(item)}
                              className="p-1.5 rounded bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-semibold transition-colors"
                              title="Editar"
                            >
                              <IconEdit size={14} />
                            </button>
                          )
                        ) : (
                          <>
                            {item.estado !== "PENDIENTE" && (
                              <button
                                onClick={() => handleStatusChange(item.id, "PENDIENTE")}
                                className="p-1.5 rounded hover:bg-slate-100 text-slate-500 text-xs transition-colors"
                                title="Reabrir"
                              >
                                <IconRefresh size={14} />
                              </button>
                            )}
                            {item.estado !== "EN_PROCESO" && item.estado !== "RESUELTO" && item.estado !== "DESCARTADO" && (
                              <button
                                onClick={() => handleStatusChange(item.id, "EN_PROCESO")}
                                className="p-1.5 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs transition-colors"
                                title="Iniciar"
                              >
                                Iniciar
                              </button>
                            )}
                            {item.estado !== "RESUELTO" && (
                              <button
                                onClick={() => handleStatusChange(item.id, "RESUELTO")}
                                className="p-1.5 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs transition-colors"
                                title="Resolver"
                              >
                                <IconCheck size={14} />
                              </button>
                            )}
                            {item.estado !== "DESCARTADO" && item.estado !== "RESUELTO" && (
                              <button
                                onClick={() => handleStatusChange(item.id, "DESCARTADO")}
                                className="p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-600 text-xs transition-colors"
                                title="Descartar"
                              >
                                <IconTrash size={14} />
                              </button>
                            )}
                            <button
                              onClick={(e) => { e.stopPropagation(); startEditing(item); }}
                              className="p-1.5 rounded hover:bg-amber-50 text-amber-700 text-xs transition-colors"
                              title="Comentar"
                            >
                              <IconEdit size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* DETALLE EXPANDIDO: mensaje, respuesta admin, nota admin, acciones */}
                    {isExpanded && (
                      <div className="border-t border-slate-100 bg-slate-50/50 px-3 py-3 text-sm animate-in fade-in slide-in-from-top-1 duration-150">
                        <p className="text-slate-700 whitespace-pre-wrap rounded bg-white p-2 border border-slate-100 mb-2">
                          {item.mensaje}
                        </p>
                        {activeTab === TAB_MIS_PEDIDOS && item.admin_comments && (
                          <div className="mb-2 p-2 rounded bg-emerald-50 border border-emerald-100">
                            <span className="font-semibold text-emerald-800 text-xs uppercase tracking-wider block mb-1">Respuesta de administración</span>
                            <p className="text-slate-800 whitespace-pre-wrap text-sm">{item.admin_comments}</p>
                          </div>
                        )}
                        {isAdminView && editingId === item.id ? (
                          <div className="mb-2">
                            <textarea
                              className="w-full text-sm p-2 border border-amber-300 rounded bg-amber-50 focus:ring-2 focus:ring-amber-500 outline-none"
                              rows={3}
                              placeholder="Nota interna..."
                              value={tempComment}
                              onChange={(e) => setTempComment(e.target.value)}
                              autoFocus
                            />
                            <div className="flex gap-2 mt-1">
                              <button
                                onClick={() => saveComment(item.id)}
                                disabled={savingResolution}
                                className="px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded disabled:opacity-50 flex items-center gap-1"
                              >
                                {savingResolution ? <IconLoader size={12} className="animate-spin" /> : <IconCheck size={12} />}
                                Guardar
                              </button>
                              <button onClick={cancelEditing} className="px-2 py-1 border border-slate-200 rounded text-slate-600 text-xs font-semibold">
                                <IconX size={12} /> Cancelar
                              </button>
                            </div>
                          </div>
                        ) : isAdminView && item.admin_comments && (
                          <div
                            onClick={() => startEditing(item)}
                            className="p-2 rounded bg-amber-50 border border-amber-100 text-amber-800 text-xs cursor-pointer hover:border-amber-300 mb-2"
                          >
                            <span className="font-semibold text-amber-900/70 uppercase text-[10px] block mb-1">Nota Admin</span>
                            <p className="whitespace-pre-wrap">{item.admin_comments}</p>
                          </div>
                        )}
                        {isAdminView && !item.admin_comments && editingId !== item.id && (
                          <button
                            onClick={() => startEditing(item)}
                            className="text-xs text-slate-500 hover:text-indigo-600 flex items-center gap-1 mb-2"
                          >
                            <IconEdit size={12} /> Agregar nota interna
                          </button>
                        )}
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 pt-1 border-t border-slate-100">
                          {item.ruta_pantalla && (
                            <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">{item.ruta_pantalla}</span>
                          )}
                          {item.screenshot_path && (
                            <a href={item.screenshot_path} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">
                              Ver captura
                            </a>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
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