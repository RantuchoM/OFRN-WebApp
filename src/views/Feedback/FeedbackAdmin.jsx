import React, { useState, useEffect } from "react";
import {
  IconCheck,
  IconTrash,
  IconEye,
  IconFilter,
  IconMessageCircle,
  IconAlertCircle,
  IconHelpCircle,
  IconX,
  IconLoader,
  IconSave,
  IconCalendar,
  IconEdit,
  IconClock,
  IconBulb,
} from "../../components/ui/Icons";

export default function FeedbackAdmin({ supabase }) {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("Todos");

  // Estado para el modal y edición
  const [selectedItem, setSelectedItem] = useState(null);
  const [imageUrl, setImageUrl] = useState(null);

  // Estado local para editar datos dentro del modal sin guardar inmediatamente
  const [editForm, setEditForm] = useState({
    estado: "",
    admin_comments: "",
    estimated_date: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchFeedbacks();
  }, []);

  const fetchFeedbacks = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("app_feedback")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) console.error("Error fetching feedback:", error);
    else setFeedbacks(data || []);
    setLoading(false);
  };

  // Abrir modal y preparar datos de edición
  const handleOpenDetail = async (item) => {
    setSelectedItem(item);
    setEditForm({
      estado: item.estado || "Pendiente",
      admin_comments: item.admin_comments || "",
      estimated_date: item.estimated_date || "",
    });
    setImageUrl(null);

    if (item.screenshot_path) {
      const { data } = await supabase.storage
        .from("archivos_generales") // Asegúrate que coincida con tu bucket
        .createSignedUrl(item.screenshot_path, 3600);
      if (data) setImageUrl(data.signedUrl);
    }
  };

  // Guardar cambios desde el modal (Estado, Comentario, Fecha)
  const handleSaveChanges = async () => {
    if (!selectedItem) return;
    setSaving(true);

    const updates = {
      estado: editForm.estado,
      admin_comments: editForm.admin_comments,
      estimated_date: editForm.estimated_date || null,
    };

    const { error } = await supabase
      .from("app_feedback")
      .update(updates)
      .eq("id", selectedItem.id);

    if (error) {
      alert("Error guardando cambios");
    } else {
      // Actualizar lista localmente
      setFeedbacks((prev) =>
        prev.map((f) => (f.id === selectedItem.id ? { ...f, ...updates } : f))
      );
      setSelectedItem(null); // Cerrar modal al guardar (opcional)
    }
    setSaving(false);
  };

  // Eliminar definitivamente (Borrado físico)
  const handleDelete = async (id, screenshotPath) => {
    if (
      !confirm("¿Eliminar este reporte permanentemente? (No se puede deshacer)")
    )
      return;

    if (screenshotPath) {
      await supabase.storage
        .from("archivos_generales")
        .remove([screenshotPath]);
    }
    const { error } = await supabase.from("app_feedback").delete().eq("id", id);

    if (error) alert("Error eliminando");
    else {
      setFeedbacks((prev) => prev.filter((f) => f.id !== id));
      if (selectedItem?.id === id) setSelectedItem(null);
    }
  };

  // --- RENDER HELPERS ---
  const getTypeIcon = (type) => {
    switch (type) {
      case "Error":
        return <IconAlertCircle className="text-red-500" />;
      case "Ayuda":
        return <IconHelpCircle className="text-blue-500" />;
      default:
        return <IconBulb className="text-emerald-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Pendiente":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "En Progreso":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "Resuelto":
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "Descartado":
        return "bg-slate-100 text-slate-500 border-slate-200 line-through decoration-slate-400";
      default:
        return "bg-gray-100";
    }
  };

  const filteredData =
    filterStatus === "Todos"
      ? feedbacks
      : feedbacks.filter((f) => f.estado === filterStatus);

  return (
    <div className="p-6 max-w-7xl mx-auto h-full flex flex-col animate-in fade-in">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <IconMessageCircle size={28} className="text-indigo-600" /> Centro
            de Feedback
          </h1>
          <p className="text-slate-500 text-sm">
            Gestiona incidencias y sugerencias del equipo.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-white p-1 rounded-lg border border-slate-200 shadow-sm overflow-x-auto">
          <IconFilter size={16} className="text-slate-400 ml-2 shrink-0" />
          {["Todos", "Pendiente", "En Progreso", "Resuelto", "Descartado"].map(
            (st) => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all whitespace-nowrap ${
                  filterStatus === st
                    ? "bg-indigo-100 text-indigo-700 shadow-sm"
                    : "text-slate-500 hover:bg-slate-50"
                }`}
              >
                {st}
              </button>
            )
          )}
        </div>
      </div>

      {/* LISTA DE CARDS */}
      <div className="flex-1 overflow-y-auto pr-2 space-y-3 pb-10">
        {loading ? (
          <div className="text-center py-10">
            <IconLoader className="animate-spin inline text-indigo-500" />{" "}
            Cargando...
          </div>
        ) : filteredData.length === 0 ? (
          <div className="text-center py-10 text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
            No hay items en estado: {filterStatus}.
          </div>
        ) : (
          filteredData.map((item) => (
            <div
              key={item.id}
              onClick={() => handleOpenDetail(item)}
              className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-all flex gap-4 items-start group cursor-pointer hover:border-indigo-300"
            >
              {/* ICONO TIPO */}
              <div className="p-3 bg-slate-50 rounded-full border border-slate-100 shrink-0 mt-1">
                {getTypeIcon(item.tipo)}
              </div>

              {/* CONTENIDO */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap justify-between items-start gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${getStatusColor(
                        item.estado
                      )}`}
                    >
                      {item.estado}
                    </span>
                    <span className="text-xs text-slate-400">
                      {new Date(item.created_at).toLocaleDateString()}
                    </span>
                    {item.estimated_date && (
                      <span className="flex items-center gap-1 text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-100">
                        <IconCalendar size={10} />{" "}
                        {new Date(item.estimated_date).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
                <h4 className="font-bold text-slate-800 mt-1.5 text-base">
                  {item.titulo || `${item.tipo} sin título`}
                </h4>

                <p className="text-sm text-slate-600 line-clamp-1 mt-0.5">
                  {item.mensaje}
                </p>

                <div className="text-xs text-slate-400 mt-2 flex flex-wrap gap-x-4 gap-y-1 items-center">
                  {/* Mostrar el icono de usuario para distinguir */}
                  <span className="flex items-center gap-1 bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                    👤 {item.user_email || "Anónimo"}
                  </span>
                  <span
                    className="hidden sm:inline truncate max-w-[200px]"
                    title={item.ruta_pantalla}
                  >
                    🔗 {item.ruta_pantalla}
                  </span>
                </div>

                <h4 className="font-bold text-slate-800 mt-1 text-sm md:text-base line-clamp-1">
                  {item.tipo}: {item.mensaje}
                </h4>

                <div className="text-xs text-slate-500 mt-1 flex flex-wrap gap-x-4 gap-y-1">
                  <span>
                    <b>Usuario:</b> {item.user_email || "Anónimo"}
                  </span>
                  <span className="hidden sm:inline">
                    <b>Ruta:</b> {item.ruta_pantalla}
                  </span>
                </div>

                {item.admin_comments && (
                  <div className="mt-2 text-xs text-slate-600 bg-slate-50 p-2 rounded border-l-2 border-indigo-300 italic line-clamp-2">
                    💬 <b>Nota admin:</b> {item.admin_comments}
                  </div>
                )}
              </div>

              {/* ACTIONS PREVIEW */}
              <div className="self-center opacity-0 group-hover:opacity-100 transition-opacity">
                <IconEdit size={18} className="text-slate-300" />
              </div>
            </div>
          ))
        )}
      </div>

      {/* MODAL DETALLE / EDICIÓN */}
      {selectedItem && (
        <div
          className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in zoom-in-95"
          onClick={() => setSelectedItem(null)}
        >
          <div
            className="bg-white w-full max-w-5xl h-[85vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Modal */}
            <div className="bg-white px-6 py-4 border-b flex justify-between items-center shrink-0">
              <div>
                <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                  {getTypeIcon(selectedItem.tipo)}
                  Reporte #{selectedItem.id}
                </h3>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    handleDelete(selectedItem.id, selectedItem.screenshot_path)
                  }
                  className="text-red-500 hover:bg-red-50 p-2 rounded-full"
                  title="Eliminar permanentemente"
                >
                  <IconTrash size={20} />
                </button>
                <div className="w-px h-8 bg-slate-200 mx-1"></div>
                <button
                  onClick={() => setSelectedItem(null)}
                  className="text-slate-400 hover:bg-slate-100 p-2 rounded-full"
                >
                  <IconX size={24} />
                </button>
              </div>
            </div>

            {/* Body Modal (2 Columnas) */}
            <div className="flex-1 overflow-hidden flex flex-col md:flex-row bg-slate-50">
              {/* COLUMNA IZQUIERDA: DETALLES Y EVIDENCIA (Scrollable) */}
              <div className="flex-1 overflow-y-auto p-6 border-r border-slate-200">
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm mb-6">
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-2">
                    Mensaje del Usuario
                  </label>
                  <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
                    {selectedItem.mensaje}
                  </p>
                  <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 gap-4 text-xs text-slate-600">
                    <div>
                      <b className="block text-slate-400">Usuario:</b>{" "}
                      {selectedItem.user_email || "Anónimo"}
                    </div>
                    <div>
                      <b className="block text-slate-400">Fecha:</b>{" "}
                      {new Date(selectedItem.created_at).toLocaleString()}
                    </div>
                    <div className="col-span-2 truncate">
                      <b className="block text-slate-400">Contexto (URL):</b>{" "}
                      {selectedItem.ruta_pantalla}
                    </div>
                  </div>
                </div>

                {/* Evidencia Visual */}
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold text-slate-400 block ml-1">
                    Evidencia (Screenshot)
                  </label>
                  {imageUrl ? (
                    <div className="bg-slate-200 rounded-xl overflow-hidden border border-slate-300 shadow-inner group relative">
                      <img
                        src={imageUrl}
                        alt="Captura"
                        className="w-full h-auto object-contain bg-[url('https://t3.ftcdn.net/jpg/05/11/25/36/360_F_511253627_zuzpapnIVDB88e8j6Z7w8X77T4Fk8b93.jpg')] bg-contain"
                      />
                      <a
                        href={imageUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="absolute top-2 right-2 bg-black/70 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-black/90 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        Abrir Original
                      </a>
                    </div>
                  ) : (
                    <div className="h-32 flex items-center justify-center bg-slate-100 text-slate-400 italic rounded-xl border-2 border-dashed border-slate-200">
                      Sin captura de pantalla adjunta
                    </div>
                  )}
                </div>
              </div>

              {/* COLUMNA DERECHA: GESTIÓN (Fija o Scrollable según altura) */}
              <div className="w-full md:w-80 bg-white p-6 flex flex-col gap-6 shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.05)] z-10">
                <div className="flex items-center gap-2 mb-2">
                  <IconSave className="text-indigo-600" />
                  <h4 className="font-bold text-slate-800">Gestión Admin</h4>
                </div>

                {/* Selector de Estado */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">
                    Estado
                  </label>
                  <div className="relative">
                    <select
                      className="w-full p-2.5 rounded-lg border border-slate-300 bg-white text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none appearance-none"
                      value={editForm.estado}
                      onChange={(e) =>
                        setEditForm({ ...editForm, estado: e.target.value })
                      }
                    >
                      <option value="Pendiente">🟡 Pendiente</option>
                      <option value="En Progreso">🔵 En Progreso</option>
                      <option value="Resuelto">🟢 Resuelto</option>
                      <option value="Descartado">⚪ Descartado</option>
                    </select>
                    <div className="absolute right-3 top-3 text-slate-400 pointer-events-none text-xs">
                      ▼
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    {editForm.estado === "Descartado"
                      ? "Este item no requiere acción."
                      : editForm.estado === "Resuelto"
                      ? "El problema fue solucionado."
                      : "Requiere revisión."}
                  </p>
                </div>

                {/* Fecha Estimada */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">
                    Fecha Estimada (Opcional)
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      className="w-full p-2.5 pl-9 rounded-lg border border-slate-300 bg-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                      value={editForm.estimated_date}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          estimated_date: e.target.value,
                        })
                      }
                    />
                    <IconCalendar
                      size={16}
                      className="absolute left-3 top-3 text-slate-400"
                    />
                  </div>
                </div>

                {/* Comentarios Admin */}
                <div className="flex-1 min-h-[150px]">
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">
                    Notas Internas (Resolución)
                  </label>
                  <textarea
                    className="w-full h-full p-3 rounded-lg border border-slate-300 bg-slate-50 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                    placeholder="Escribe aquí notas sobre la solución, causa del error o pasos a seguir..."
                    value={editForm.admin_comments}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        admin_comments: e.target.value,
                      })
                    }
                  ></textarea>
                </div>

                {/* Footer Botón */}
                <button
                  onClick={handleSaveChanges}
                  disabled={saving}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md flex items-center justify-center gap-2 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <IconLoader className="animate-spin" />
                  ) : (
                    <IconSave size={20} />
                  )}
                  {saving ? "Guardando..." : "Guardar Cambios"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
