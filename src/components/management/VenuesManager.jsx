import React, { useEffect, useMemo, useState } from "react";
import { IconLoader, IconHistory, IconPencil, IconX } from "../ui/Icons";
import MultiSelect from "../ui/MultiSelect";
import { useAuth } from "../../context/AuthContext";
import { getAllConcertVenues } from "../../services/giraService";
import {
  VENUE_STATUS_OPTIONS,
  getVenueStatusById,
} from "../../utils/venueUtils";
import EventForm from "../forms/EventForm";
import { toast } from "sonner";
import { format, startOfDay, parseISO } from "date-fns";
import { es } from "date-fns/locale";

export function ManagementPanel({ supabase }) {
  const [activeTab, setActiveTab] = useState("venues");

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-800">
            Gestión General
          </h2>
          <p className="text-xs text-slate-500">
            Herramientas administrativas para producción y coordinación.
          </p>
        </div>
        <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab("venues")}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              activeTab === "venues"
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Venues
          </button>
          {/* Futuras pestañas podrían ir aquí */}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === "venues" && <VenuesManager supabase={supabase} />}
      </div>
    </div>
  );
}

export function VenuesManager({ supabase }) {
  const { isEditor, isAdmin, userId } = useAuth();
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState([]);
  const [selectedProgramTypes, setSelectedProgramTypes] = useState([]);
  const [selectedStatusIds, setSelectedStatusIds] = useState([]);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editFormData, setEditFormData] = useState(null);
  const [editingEventObj, setEditingEventObj] = useState(null);
  const [saving, setSaving] = useState(false);
  const [dateFrom, setDateFrom] = useState(() => format(startOfDay(new Date()), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState("");
  const [quickEditEvt, setQuickEditEvt] = useState(null);
  const [quickEditStatusId, setQuickEditStatusId] = useState(null);
  const [quickEditNote, setQuickEditNote] = useState("");
  const [quickEditSaving, setQuickEditSaving] = useState(false);

  const canView = isEditor || isAdmin;

  useEffect(() => {
    const fetchData = async () => {
      if (!canView) return;
      setLoading(true);
      try {
        const data = await getAllConcertVenues(supabase);
        setEvents(data || []);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [supabase, canView]);

  const programTypeOptions = useMemo(() => {
    const tipos = new Set();
    events.forEach((evt) => {
      const tipo = evt.programas?.tipo;
      if (tipo) tipos.add(tipo);
    });
    return Array.from(tipos)
      .sort((a, b) => a.localeCompare(b))
      .map((tipo) => ({
        id: tipo,
        label: tipo,
        subLabel: null,
      }));
  }, [events]);

  const statusOptions = useMemo(() => {
    return VENUE_STATUS_OPTIONS.map((s) => ({
      id: s.id,
      label: s.nombre,
      subLabel: s.slug,
    }));
  }, []);

  const filteredEvents = useMemo(() => {
    return events.filter((evt) => {
      if (evt.id_tipo_evento !== 1) return false;
      const evtDate = evt.fecha || "";
      if (dateFrom && evtDate < dateFrom) return false;
      if (dateTo && evtDate > dateTo) return false;
      const tipoPrograma = evt.programas?.tipo || null;
      if (
        selectedProgramTypes.length > 0 &&
        (!tipoPrograma || !selectedProgramTypes.includes(tipoPrograma))
      ) {
        return false;
      }
      if (
        selectedStatusIds.length > 0 &&
        evt.id_estado_venue &&
        !selectedStatusIds.includes(evt.id_estado_venue)
      ) {
        return false;
      }
      if (selectedStatusIds.length > 0 && !evt.id_estado_venue) {
        return false;
      }
      return true;
    });
  }, [events, selectedProgramTypes, selectedStatusIds, dateFrom, dateTo]);

  const openQuickEdit = (evt) => {
    setQuickEditEvt(evt);
    setQuickEditStatusId(evt.id_estado_venue ?? null);
    let lastNote = "";
    if (Array.isArray(evt.eventos_venue_log) && evt.eventos_venue_log.length > 0) {
      const latest = evt.eventos_venue_log.reduce((acc, curr) => {
        if (!acc) return curr;
        return new Date(curr.created_at) > new Date(acc.created_at) ? curr : acc;
      }, null);
      if (latest?.nota) lastNote = latest.nota;
    }
    setQuickEditNote(lastNote);
  };

  const handleQuickEditSave = async () => {
    if (!quickEditEvt?.id) return;
    const prevStatus = quickEditEvt.id_estado_venue ?? null;
    const newStatus = quickEditStatusId ?? null;
    if (prevStatus !== newStatus && newStatus != null && !quickEditNote?.trim()) {
      toast.error("Agrega una nota para el cambio de estado.");
      return;
    }
    setQuickEditSaving(true);
    try {
      const { error } = await supabase
        .from("eventos")
        .update({ id_estado_venue: newStatus })
        .eq("id", quickEditEvt.id);
      if (error) throw error;
      if (prevStatus !== newStatus && newStatus != null) {
        await supabase.from("eventos_venue_log").insert({
          id_evento: quickEditEvt.id,
          id_estado_venue: newStatus,
          nota: quickEditNote || null,
          id_integrante: userId || null,
        });
      }
      const data = await getAllConcertVenues(supabase);
      setEvents(data || []);
      setQuickEditEvt(null);
      setQuickEditStatusId(null);
      setQuickEditNote("");
      toast.success("Estado actualizado.");
    } catch (err) {
      console.error("Error actualizando estado:", err);
      toast.error("No se pudo actualizar el estado.");
    } finally {
      setQuickEditSaving(false);
    }
  };

  const openEditModal = async (evt) => {
    try {
      setSaving(false);
      let lastVenueNoteText = "";
      if (Array.isArray(evt.eventos_venue_log) && evt.eventos_venue_log.length > 0) {
        const latest = evt.eventos_venue_log.reduce((acc, curr) => {
          if (!acc) return curr;
          return new Date(curr.created_at) > new Date(acc.created_at) ? curr : acc;
        }, null);
        if (latest?.nota) lastVenueNoteText = latest.nota;
      }

      const { data, error } = await supabase
        .from("eventos")
        .select(
          "id, descripcion, fecha, hora_inicio, hora_fin, id_tipo_evento, id_locacion, id_gira, id_gira_transporte, tecnica, id_estado_venue",
        )
        .eq("id", evt.id)
        .single();
      if (error) throw error;
      setEditingEventObj(data);
      setEditFormData({
        ...data,
        venue_status_note: lastVenueNoteText,
      });
      setIsEditOpen(true);
    } catch (err) {
      console.error("Error abriendo EventForm desde VenuesManager:", err);
      toast.error("No se pudo abrir el formulario del evento.");
    }
  };

  const handleEditSave = async () => {
    if (!editFormData.fecha || !editFormData.hora_inicio) {
      toast.error("Faltan datos de fecha u horario.");
      return;
    }

    const prevStatus =
      editingEventObj?.id_estado_venue == null
        ? null
        : editingEventObj.id_estado_venue;
    const newStatus =
      editFormData.id_estado_venue == null
        ? null
        : editFormData.id_estado_venue;

    if (prevStatus !== newStatus && newStatus != null) {
      if (!editFormData.venue_status_note?.trim()) {
        toast.error("Agrega una nota para el cambio de estado de venue.");
        return;
      }
    }

    setSaving(true);
    try {
      const payload = {
        descripcion: editFormData.descripcion,
        fecha: editFormData.fecha,
        hora_inicio: editFormData.hora_inicio,
        hora_fin: editFormData.hora_fin || editFormData.hora_inicio,
        id_tipo_evento: editFormData.id_tipo_evento || null,
        id_locacion: editFormData.id_locacion || null,
        id_gira_transporte: editFormData.id_gira_transporte ?? null,
        tecnica: editFormData.tecnica || false,
        id_estado_venue: editFormData.id_estado_venue || null,
      };

      const { error } = await supabase
        .from("eventos")
        .update(payload)
        .eq("id", editFormData.id);
      if (error) throw error;

      if (prevStatus !== newStatus && newStatus != null) {
        try {
          await supabase.from("eventos_venue_log").insert({
            id_evento: editFormData.id,
            id_estado_venue: newStatus,
            nota: editFormData.venue_status_note || null,
            id_integrante: userId || null,
          });
        } catch (logErr) {
          console.error(
            "Error registrando log de cambio de estado de venue:",
            logErr,
          );
        }
      }

      const data = await getAllConcertVenues(supabase);
      setEvents(data || []);
      setIsEditOpen(false);
      setEditFormData(null);
      setEditingEventObj(null);
    } catch (err) {
      console.error("Error al guardar cambios del evento:", err);
      toast.error("No se pudo guardar el evento.");
    } finally {
      setSaving(false);
    }
  };

  if (!canView) {
    return (
      <div className="text-sm text-slate-500 bg-white border border-slate-200 rounded-lg p-4">
        No tenés permisos para acceder a la gestión general de venues.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
            Fecha desde
          </label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
            Fecha hasta
          </label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>
        <MultiSelect
          label="Tipos de Programa"
          options={programTypeOptions}
          selectedIds={selectedProgramTypes}
          onChange={setSelectedProgramTypes}
        />
        <MultiSelect
          label="Estados de Venue"
          options={statusOptions}
          selectedIds={selectedStatusIds}
          onChange={setSelectedStatusIds}
        />
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <h3 className="text-sm font-bold text-slate-700">
            Conciertos y Venues
          </h3>
          {loading && (
            <span className="flex items-center gap-1 text-[11px] text-slate-400">
              <IconLoader className="animate-spin" size={14} /> Cargando...
            </span>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs table-fixed">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-left text-[10px] font-bold uppercase text-slate-500">
                <th className="px-3 py-2 w-[14%]">Fecha</th>
                <th className="px-3 py-2 w-[20%]">Concierto</th>
                <th className="px-3 py-2 w-[20%]">Programa</th>
                <th className="px-3 py-2 w-[14%]">Estado Venue</th>
                <th className="px-3 py-2 w-[28%]">Nota Estado</th>
                <th className="px-2 py-2 w-[8%] text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredEvents.length === 0 && !loading && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-3 py-4 text-center text-slate-400 text-xs"
                  >
                    No hay conciertos que coincidan con los filtros actuales.
                  </td>
                </tr>
              )}
              {filteredEvents.map((evt) => {
                const status = getVenueStatusById(evt.id_estado_venue);
                const program = evt.programas;
                const fechaRaw = evt.fecha || "";
                const fechaFormatted = fechaRaw
                  ? (() => {
                      try {
                        const d = parseISO(fechaRaw);
                        const s = format(d, "EEEE, dd/MM/yyyy", { locale: es });
                        return s.charAt(0).toUpperCase() + s.slice(1);
                      } catch {
                        return fechaRaw;
                      }
                    })()
                  : "";
                const hora = evt.hora_inicio
                  ? evt.hora_inicio.slice(0, 5)
                  : "";
                let lastVenueNote = null;
                if (Array.isArray(evt.eventos_venue_log) && evt.eventos_venue_log.length > 0) {
                  lastVenueNote = evt.eventos_venue_log.reduce((latest, current) => {
                    if (!latest) return current;
                    return new Date(current.created_at) > new Date(latest.created_at)
                      ? current
                      : latest;
                  }, null);
                }
                return (
                  <tr
                    key={evt.id}
                    className="border-b border-slate-100 hover:bg-slate-50/80"
                  >
                    <td className="px-3 py-2 text-slate-700 w-[14%]">
                      <div className="flex flex-col">
                        <span className="text-xs font-medium">{fechaFormatted}</span>
                        {hora && (
                          <span className="text-[11px] text-slate-400">
                            {hora} hs
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2 w-[20%] text-slate-700 align-top">
                      <button
                        type="button"
                        className="text-left w-full min-w-0"
                        onClick={() => openEditModal(evt)}
                      >
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-semibold truncate block" title={evt.descripcion ? String(evt.descripcion).replace(/<[^>]+>/g, "") : "Concierto"}>
                            {evt.descripcion ? (
                              <span
                                className="[&>b]:font-bold [&>strong]:font-bold"
                                dangerouslySetInnerHTML={{
                                  __html: evt.descripcion,
                                }}
                              />
                            ) : (
                              "Concierto"
                            )}
                          </span>
                          {program?.nombre_gira && (
                            <span className="text-[11px] text-slate-400 truncate block">
                              {program.nombre_gira}
                            </span>
                          )}
                        </div>
                      </button>
                    </td>
                    <td className="px-3 py-2 w-[20%] text-slate-700 align-top">
                      {program ? (
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-semibold truncate block">
                            {program.nombre_gira}
                          </span>
                          {program.nomenclador && (
                            <span className="text-[11px] text-slate-400 truncate block">
                              {program.nomenclador}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">
                          Sin programa
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 w-[14%]">
                      {status ? (
                        <span
                          className="inline-flex items-center gap-2 px-2 py-1 rounded-full text-[11px] font-semibold"
                          style={{
                            backgroundColor: `${status.color}20`,
                            color: "#0f172a",
                          }}
                        >
                          <span
                            className="inline-block w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: status.color }}
                          />
                          <span className="truncate">{status.nombre}</span>
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">
                          Sin estado
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 w-[28%] min-w-0">
                      {lastVenueNote?.nota ? (
                        <span className="text-[11px] text-slate-600 line-clamp-3 block">
                          {lastVenueNote.nota}
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">
                          Sin nota
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-2 w-[8%] text-right align-top">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => openEditModal(evt)}
                          className="p-1.5 rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                          title="Historial / Editar"
                        >
                          <IconHistory size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => openQuickEdit(evt)}
                          className="p-1.5 rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                          title="Editar estado"
                        >
                          <IconPencil size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {quickEditEvt && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={() => {
            setQuickEditEvt(null);
            setQuickEditStatusId(null);
            setQuickEditNote("");
          }}
        >
          <div
            className="bg-white rounded-xl shadow-xl w-full max-w-sm flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800">Editar estado</h3>
              <button
                type="button"
                onClick={() => {
                  setQuickEditEvt(null);
                  setQuickEditStatusId(null);
                  setQuickEditNote("");
                }}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <IconX size={18} />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Estado</label>
                <select
                  value={quickEditStatusId ?? ""}
                  onChange={(e) => setQuickEditStatusId(e.target.value ? Number(e.target.value) : null)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="">Sin estado</option>
                  {VENUE_STATUS_OPTIONS.map((s) => (
                    <option key={s.id} value={s.id}>{s.nombre}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Nota (obligatoria si cambia estado)</label>
                <textarea
                  rows={3}
                  value={quickEditNote}
                  onChange={(e) => setQuickEditNote(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm resize-none focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder='Ej: "Enviado mail a la sala"...'
                />
              </div>
            </div>
            <div className="px-4 py-3 border-t border-slate-100 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setQuickEditEvt(null);
                  setQuickEditStatusId(null);
                  setQuickEditNote("");
                }}
                className="px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleQuickEditSave}
                disabled={quickEditSaving}
                className="px-3 py-1.5 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1"
              >
                {quickEditSaving && <IconLoader className="animate-spin" size={14} />}
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {isEditOpen && editFormData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <EventForm
            formData={editFormData}
            setFormData={setEditFormData}
            onSave={handleEditSave}
            onClose={() => setIsEditOpen(false)}
            loading={saving}
            eventTypes={[]}
            locations={[]}
            isNew={false}
            supabase={supabase}
            onRefreshLocations={undefined}
            giraId={editFormData.id_gira || null}
          />
        </div>
      )}
    </div>
  );
}

