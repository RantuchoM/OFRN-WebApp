import React, { useState, useEffect } from "react";
import TimeInput from "../../components/ui/TimeInput"; // <--- AGREGAR ESTO
import {
  IconCalendar,
  IconClock,
  IconPlus,
  IconTrash,
  IconEdit,
  IconLoader,
  IconMapPin,
} from "../../components/ui/Icons";

export default function GiraAgenda({ supabase, gira, onBack }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);

  const [eventTypes, setEventTypes] = useState([]);
  const [locations, setLocations] = useState([]);

  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState({
    id_tipo_evento: "",
    id_locacion: "",
    fecha: "",
    hora_inicio: "",
    hora_fin: "",
    descripcion: "",
  });

  useEffect(() => {
    loadData();
  }, [gira.id]);

  const loadData = async () => {
    setLoading(true);
    // Traemos también el color del tipo de evento
    const { data: types } = await supabase
      .from("tipos_evento")
      .select("*")
      .order("nombre");
    if (types) setEventTypes(types);

    const { data: locs } = await supabase
      .from("locaciones")
      .select("id, nombre, localidades(localidad)")
      .order("nombre");
    if (locs) setLocations(locs);

    await fetchEvents();
    setLoading(false);
  };

  const fetchEvents = async () => {
    const { data, error } = await supabase
      .from("eventos")
      .select(
        `
                *,
                tipos_evento (nombre, color),
                locaciones (nombre, localidades(localidad))
            `
      )
      .eq("id_gira", gira.id)
      .order("fecha", { ascending: true })
      .order("hora_inicio", { ascending: true });

    if (error) console.error(error);
    else setEvents(data || []);
  };

  // --- AGRUPAR EVENTOS POR DÍA ---
  const groupEventsByDate = (eventsList) => {
    const grouped = {};
    eventsList.forEach((evt) => {
      const dateKey = evt.fecha; // YYYY-MM-DD
      if (!grouped[dateKey]) grouped[dateKey] = [];
      grouped[dateKey].push(evt);
    });
    // Retornar array ordenado de claves
    return Object.keys(grouped)
      .sort()
      .map((date) => ({
        date,
        items: grouped[date],
      }));
  };

  const resetForm = () => {
    setFormData({
      id_tipo_evento: "",
      id_locacion: "",
      fecha: "",
      hora_inicio: "",
      hora_fin: "",
      descripcion: "",
    });
    setIsEditing(false);
    setEditId(null);
  };

  const handleSave = async () => {
    if (!formData.fecha || !formData.id_tipo_evento)
      return alert("Fecha y Tipo de Evento son obligatorios");

    // --- VALIDACIÓN DE HORARIO ---
    if (formData.hora_inicio && formData.hora_fin) {
      if (formData.hora_fin <= formData.hora_inicio) {
        return alert(
          "⚠️ Error: La hora de finalización debe ser posterior a la de inicio."
        );
      }
    }

    setLoading(true);
    const payload = {
      ...formData,
      id_gira: gira.id,
      id_locacion: formData.id_locacion || null,
    };

    let error;
    if (editId) {
      const { error: err } = await supabase
        .from("eventos")
        .update(payload)
        .eq("id", editId);
      error = err;
    } else {
      const { error: err } = await supabase.from("eventos").insert([payload]);
      error = err;
    }

    if (error) alert("Error: " + error.message);
    else {
      resetForm();
      await fetchEvents();
    }
    setLoading(false);
  };

  const startEdit = (evt) => {
    setEditId(evt.id);
    setFormData({
      id_tipo_evento: evt.id_tipo_evento,
      id_locacion: evt.id_locacion || "",
      fecha: evt.fecha,
      hora_inicio: evt.hora_inicio || "",
      hora_fin: evt.hora_fin || "",
      descripcion: evt.descripcion || "",
    });
    setIsEditing(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id) => {
    if (!confirm("¿Eliminar este evento?")) return;
    setLoading(true);
    await supabase.from("eventos").delete().eq("id", id);
    await fetchEvents();
    setLoading(false);
  };

  const formatTime = (timeStr) => (timeStr ? timeStr.slice(0, 5) : "");

  // --- NUEVO FORMATO DE FECHA (dd/mmm) ---
  const formatDateHeader = (dateStr) => {
    if (!dateStr) return "";
    const [y, m, d] = dateStr.split("-");
    const dateObj = new Date(y, m - 1, d);

    // Nombre del día (Lunes, Martes...)
    const dayName = dateObj.toLocaleDateString("es-AR", { weekday: "long" });
    // Nombre del mes corto (ene, feb, mar...)
    const monthName = dateObj
      .toLocaleDateString("es-AR", { month: "short" })
      .replace(".", "");

    // Resultado ej: "Lunes 03/mar"
    // Capitalizamos el día para que se vea mejor
    const dayNameCap = dayName.charAt(0).toUpperCase() + dayName.slice(1);

    return `${dayNameCap} ${d}/${monthName}`;
  };

  const groupedEvents = groupEventsByDate(events);

  return (
    <div className="flex flex-col h-full bg-slate-50 animate-in fade-in duration-300">
      {/* Header */}
      <div className="bg-white p-4 border-b border-slate-200 shadow-sm flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="text-slate-400 hover:text-indigo-600 font-medium text-sm flex items-center gap-1"
          >
            ← Volver
          </button>
          <div>
            <h2 className="text-xl font-bold text-slate-800">
              {gira.nombre_gira}
            </h2>
            <p className="text-xs text-slate-500 flex items-center gap-1">
              <IconCalendar size={12} /> Agenda de Actividades
            </p>
          </div>
        </div>
        <div className="text-xs bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full border border-indigo-100 font-bold">
          {events.length} Eventos
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 max-w-4xl mx-auto w-full">
        {/* Formulario */}
        <div
          className={`p-5 rounded-xl border mb-8 transition-all ${
            isEditing
              ? "bg-amber-50 border-amber-200 shadow-md ring-1 ring-amber-200"
              : "bg-white border-slate-200 shadow-sm"
          }`}
        >
          <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-2">
            <h3
              className={`text-sm font-bold uppercase flex items-center gap-2 ${
                isEditing ? "text-amber-700" : "text-indigo-600"
              }`}
            >
              {isEditing ? (
                <>
                  <IconEdit size={16} /> Editando Evento
                </>
              ) : (
                <>
                  <IconPlus size={16} /> Nuevo Evento
                </>
              )}
            </h3>
            {isEditing && (
              <button
                onClick={resetForm}
                className="text-xs text-slate-500 underline"
              >
                Cancelar
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            <div className="md:col-span-3">
              <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">
                Tipo
              </label>
              <select
                className="w-full border p-2 rounded text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                value={formData.id_tipo_evento}
                onChange={(e) =>
                  setFormData({ ...formData, id_tipo_evento: e.target.value })
                }
              >
                <option value="">-- Seleccionar --</option>
                {eventTypes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-4">
              <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">
                Locación
              </label>
              <select
                className="w-full border p-2 rounded text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                value={formData.id_locacion}
                onChange={(e) =>
                  setFormData({ ...formData, id_locacion: e.target.value })
                }
              >
                <option value="">-- Lugar (Opcional) --</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.nombre}{" "}
                    {l.localidades?.localidad
                      ? `(${l.localidades.localidad})`
                      : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-3">
              <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">
                Fecha
              </label>
              <input
                type="date"
                className="w-full border p-2 rounded text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                value={formData.fecha}
                onChange={(e) =>
                  setFormData({ ...formData, fecha: e.target.value })
                }
              />
            </div>
            <div className="md:col-span-2 flex gap-2">
              <div className="flex-1">
                <TimeInput
                  label="Inicio"
                  value={formData.hora_inicio}
                  onChange={(val) =>
                    setFormData({ ...formData, hora_inicio: val })
                  }
                />
              </div>
              <div className="flex-1">
                <TimeInput
                  label="Fin"
                  value={formData.hora_fin}
                  onChange={(val) =>
                    setFormData({ ...formData, hora_fin: val })
                  }
                />
              </div>
            </div>
            <div className="md:col-span-10">
              <input
                type="text"
                placeholder="Descripción / Notas (Opcional)"
                className="w-full border-b border-slate-300 py-1 text-sm focus:border-indigo-500 outline-none bg-transparent"
                value={formData.descripcion}
                onChange={(e) =>
                  setFormData({ ...formData, descripcion: e.target.value })
                }
              />
            </div>
            <div className="md:col-span-2">
              <button
                onClick={handleSave}
                disabled={loading}
                className={`w-full py-2 rounded text-sm font-bold text-white shadow-sm flex items-center justify-center gap-1 h-[38px] transition-colors ${
                  isEditing
                    ? "bg-amber-600 hover:bg-amber-700"
                    : "bg-indigo-600 hover:bg-indigo-700"
                }`}
              >
                {isEditing ? "Actualizar" : "Guardar"}
              </button>
            </div>
          </div>
        </div>

        {/* --- TIMELINE AGRUPADO --- */}
        <div className="space-y-8 pb-10">
          {loading && (
            <div className="p-4 text-center text-indigo-600">
              <IconLoader className="animate-spin inline" />
            </div>
          )}

          {!loading &&
            groupedEvents.map((group) => (
              <div key={group.date} className="relative">
                {/* Separador de Día */}
                <div className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-sm py-2 mb-2 flex items-center gap-4">
                  <div className="text-sm font-black text-slate-600 uppercase tracking-wider border bg-white px-3 py-1 rounded-lg shadow-sm">
                    {formatDateHeader(group.date)}
                  </div>
                  <div className="h-px bg-slate-300 flex-1"></div>
                </div>

                {/* Lista de eventos del día */}
                <div className="space-y-3 pl-2">
                  {group.items.map((evt) => {
                    const eventColor = evt.tipos_evento?.color || "#cbd5e1"; // Color DB o gris
                    const isConcert = evt.tipos_evento?.nombre
                      ?.toLowerCase()
                      .includes("concierto");

                    return (
                      <div
                        key={evt.id}
                        className={`relative bg-white rounded-lg border shadow-sm hover:shadow-md transition-all group overflow-hidden ${
                          isConcert ? "border-l-4 p-4" : "border-l-4 p-3"
                        }`}
                        style={{
                          borderLeftColor: eventColor,
                          backgroundColor: isConcert
                            ? `${eventColor}08`
                            : "white", // Fondo muy sutil para conciertos
                        }}
                      >
                        <div className="flex items-start gap-4">
                          {/* Horario (Compacto) */}
                          <div className="min-w-[80px] text-right">
                            <div className="text-sm font-bold text-slate-700">
                              {formatTime(evt.hora_inicio)}
                            </div>
                            <div className="text-xs text-slate-400">
                              {formatTime(evt.hora_fin)}
                            </div>
                          </div>

                          {/* Detalles */}
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-xs font-bold uppercase tracking-wide ${
                                  isConcert ? "text-base" : ""
                                }`}
                                style={{ color: eventColor }}
                              >
                                {evt.tipos_evento?.nombre}
                              </span>
                            </div>

                            <h4
                              className={`font-medium text-slate-800 flex items-center gap-2 ${
                                isConcert ? "text-lg mt-1" : "text-sm"
                              }`}
                            >
                              {evt.locaciones?.nombre || (
                                <span className="text-slate-400 italic font-normal">
                                  Sin ubicación
                                </span>
                              )}
                              {evt.locaciones?.localidades && (
                                <span className="text-[10px] font-normal text-slate-500 bg-slate-100 px-1.5 rounded border border-slate-200">
                                  <IconMapPin
                                    size={10}
                                    className="inline mr-0.5"
                                  />
                                  {evt.locaciones.localidades.localidad}
                                </span>
                              )}
                            </h4>

                            {evt.descripcion && (
                              <p className="text-xs text-slate-500 mt-1 italic">
                                {evt.descripcion}
                              </p>
                            )}
                          </div>

                          {/* Botones Acciones (Hover) */}
                          <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity self-center">
                            <button
                              onClick={() => startEdit(evt)}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                            >
                              <IconEdit size={16} />
                            </button>
                            <button
                              onClick={() => handleDelete(evt.id)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                            >
                              <IconTrash size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

          {!loading && events.length === 0 && (
            <div className="p-8 bg-white border border-dashed border-slate-200 rounded-xl text-center text-slate-400 italic">
              No hay actividades programadas.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
