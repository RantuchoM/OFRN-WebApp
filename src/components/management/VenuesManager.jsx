import React, { useEffect, useMemo, useState, useRef } from "react";
import { IconLoader, IconHistory, IconPencil, IconX } from "../ui/Icons";
import MultiSelect from "../ui/MultiSelect";
import DateInput from "../ui/DateInput";
import SearchableSelect from "../ui/SearchableSelect";
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
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [selectedProgramTypes, setSelectedProgramTypes] = useState([]);
  const [selectedStatusIds, setSelectedStatusIds] = useState([]);
  const [selectedLocationIds, setSelectedLocationIds] = useState([]);
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
  const [openStatusDropdownId, setOpenStatusDropdownId] = useState(null);
  const [bulkStatusId, setBulkStatusId] = useState(null);
  const [bulkNote, setBulkNote] = useState("");
  const [bulkSaving, setBulkSaving] = useState(false);
  const statusDropdownRef = useRef(null);

  const canView = isEditor || isAdmin;

  useEffect(() => {
    if (openStatusDropdownId == null) return;
    const handleClickOutside = (e) => {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(e.target)) {
        setOpenStatusDropdownId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openStatusDropdownId]);

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

  const locationOptions = useMemo(() => {
    const byId = new Map();
    events.forEach((evt) => {
      const loc = evt.locaciones;
      if (loc && loc.id != null) {
        if (!byId.has(loc.id)) {
          const localidad =
            loc.localidades?.localidad || loc.localidad?.localidad || null;
          byId.set(loc.id, {
            id: loc.id,
            label: loc.nombre || "Sin nombre",
            subLabel: localidad || loc.direccion || null,
          });
        }
      }
    });
    return Array.from(byId.values()).sort((a, b) =>
      a.label.localeCompare(b.label),
    );
  }, [events]);

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
      if (selectedLocationIds.length > 0) {
        const locId = evt.locaciones?.id ?? evt.id_locacion ?? null;
        if (!locId || !selectedLocationIds.includes(locId)) {
          return false;
        }
      }
      return true;
    });
  }, [
    events,
    selectedProgramTypes,
    selectedStatusIds,
    selectedLocationIds,
    dateFrom,
    dateTo,
  ]);

  const handleToggleSelectOne = (eventId, checked) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(eventId);
      } else {
        next.delete(eventId);
      }
      return next;
    });
  };

  const handleToggleSelectAllVisible = (checked) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        filteredEvents.forEach((evt) => {
          next.add(evt.id);
        });
      } else {
        filteredEvents.forEach((evt) => {
          next.delete(evt.id);
        });
      }
      return next;
    });
  };

  const handleClearBulkSelection = () => {
    setSelectedIds(new Set());
    setBulkStatusId(null);
    setBulkNote("");
  };

  const handleBulkSave = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    const hasStatusChange = bulkStatusId != null;
    const hasNote = Boolean(bulkNote?.trim());

    if (!hasStatusChange && !hasNote) {
      toast.error(
        "Seleccioná un estado o escribí una nota para aplicar en bloque.",
      );
      return;
    }

    if (hasStatusChange && !hasNote) {
      toast.error("Agrega una nota para el cambio de estado masivo.");
      return;
    }

    setBulkSaving(true);
    try {
      const updatePayload = {};
      if (hasStatusChange) {
        updatePayload.id_estado_venue = bulkStatusId;
      }

      if (Object.keys(updatePayload).length > 0) {
        const { error: updateError } = await supabase
          .from("eventos")
          .update(updatePayload)
          .in("id", ids);
        if (updateError) throw updateError;
      }

      if (hasStatusChange || hasNote) {
        const logsPayload = ids.map((id) => ({
          id_evento: id,
          id_estado_venue: hasStatusChange ? bulkStatusId : null,
          nota: hasNote ? bulkNote.trim() : null,
          id_integrante: userId || null,
        }));

        const { error: logError } = await supabase
          .from("eventos_venue_log")
          .insert(logsPayload);
        if (logError) throw logError;
      }

      const data = await getAllConcertVenues(supabase);
      setEvents(data || []);
      handleClearBulkSelection();
      toast.success("Cambios masivos aplicados a los venues seleccionados.");
    } catch (err) {
      console.error("Error en edición masiva de venues:", err);
      toast.error("No se pudieron aplicar los cambios masivos.");
    } finally {
      setBulkSaving(false);
    }
  };

  const openQuickEdit = (evt, preselectedStatusId = null, notePrefill = null) => {
    setQuickEditEvt(evt);
    setQuickEditStatusId(preselectedStatusId ?? evt.id_estado_venue ?? null);
    if (notePrefill !== undefined) {
      setQuickEditNote(notePrefill);
    } else {
      let lastNote = "";
      if (Array.isArray(evt.eventos_venue_log) && evt.eventos_venue_log.length > 0) {
        const latest = evt.eventos_venue_log.reduce((acc, curr) => {
          if (!acc) return curr;
          return new Date(curr.created_at) > new Date(acc.created_at) ? curr : acc;
        }, null);
        if (latest?.nota) lastNote = latest.nota;
      }
      setQuickEditNote(lastNote);
    }
  };

  const handleStatusOptionFromChip = (evt, newStatusId) => {
    setOpenStatusDropdownId(null);
    const currentId = evt.id_estado_venue ?? null;
    if (newStatusId === currentId) return;
    openQuickEdit(evt, newStatusId ?? null, "");
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
        <div className="space-y-2">
          <DateInput
            label="Fecha desde"
            value={dateFrom}
            onChange={setDateFrom}
          />
          <DateInput
            label="Fecha hasta"
            value={dateTo}
            onChange={setDateTo}
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
            Locaciones
          </label>
          <SearchableSelect
            options={locationOptions}
            value={selectedLocationIds}
            onChange={setSelectedLocationIds}
            isMulti
            placeholder="Filtrar por locación..."
            dropdownMinWidth={260}
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
                <th className="px-2 py-2 w-[4%]">
                  <input
                    type="checkbox"
                    className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    onChange={(e) =>
                      handleToggleSelectAllVisible(e.target.checked)
                    }
                    checked={
                      filteredEvents.length > 0 &&
                      filteredEvents.every((evt) => selectedIds.has(evt.id))
                    }
                    aria-label="Seleccionar todos los conciertos visibles"
                  />
                </th>
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
                    colSpan={7}
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
                    <td className="px-2 py-2 w-[4%] align-top">
                      <input
                        type="checkbox"
                        className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        checked={selectedIds.has(evt.id)}
                        onChange={(e) =>
                          handleToggleSelectOne(evt.id, e.target.checked)
                        }
                        aria-label="Seleccionar concierto para edición masiva"
                      />
                    </td>
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
                    <td className="px-3 py-2 w-[14%] align-top">
                      <div className="relative inline-block" ref={openStatusDropdownId === evt.id ? statusDropdownRef : null}>
                        <button
                          type="button"
                          onClick={() => setOpenStatusDropdownId((prev) => (prev === evt.id ? null : evt.id))}
                          className={`inline-flex items-center gap-2 px-2 py-1 rounded-full text-[11px] font-semibold border border-transparent hover:ring-2 hover:ring-slate-300 transition-all ${
                            status
                              ? ""
                              : "text-slate-500 bg-slate-100 hover:bg-slate-200"
                          }`}
                          style={status ? { backgroundColor: `${status.color}20`, color: "#0f172a" } : undefined}
                          title="Cambiar estado"
                        >
                          {status ? (
                            <>
                              <span
                                className="inline-block w-2 h-2 rounded-full shrink-0"
                                style={{ backgroundColor: status.color }}
                              />
                              <span className="truncate">{status.nombre}</span>
                            </>
                          ) : (
                            <span className="italic">Sin estado</span>
                          )}
                          <svg className="w-3 h-3 shrink-0 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        {openStatusDropdownId === evt.id && (
                          <div className="absolute left-0 top-full mt-1 z-50 min-w-[10rem] py-1 bg-white border border-slate-200 rounded-lg shadow-lg">
                            {VENUE_STATUS_OPTIONS.map((s) => (
                              <button
                                key={s.id}
                                type="button"
                                onClick={() => handleStatusOptionFromChip(evt, s.id)}
                                className={`w-full text-left px-3 py-2 text-[11px] font-medium flex items-center gap-2 hover:bg-slate-50 first:rounded-t-lg last:rounded-b-lg ${
                                  (evt.id_estado_venue ?? null) === s.id ? "bg-indigo-50 text-indigo-800" : "text-slate-700"
                                }`}
                              >
                                <span
                                  className="inline-block w-2 h-2 rounded-full shrink-0"
                                  style={{ backgroundColor: s.color }}
                                />
                                {s.nombre}
                              </button>
                            ))}
                            <button
                              type="button"
                              onClick={() => handleStatusOptionFromChip(evt, null)}
                              className={`w-full text-left px-3 py-2 text-[11px] font-medium hover:bg-slate-50 rounded-b-lg ${
                                evt.id_estado_venue == null ? "bg-indigo-50 text-indigo-800" : "text-slate-500 italic"
                              }`}
                            >
                              Sin estado
                            </button>
                          </div>
                        )}
                      </div>
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

      {selectedIds.size > 0 && (
        <BulkEditBanner
          count={selectedIds.size}
          statusId={bulkStatusId}
          note={bulkNote}
          onChangeStatus={setBulkStatusId}
          onChangeNote={setBulkNote}
          onApply={handleBulkSave}
          saving={bulkSaving}
          onClearSelection={handleClearBulkSelection}
        />
      )}

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

function BulkEditBanner({
  count,
  statusId,
  note,
  onChangeStatus,
  onChangeNote,
  onApply,
  saving,
  onClearSelection,
}) {
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const statusDropdownRef = useRef(null);

  useEffect(() => {
    if (!isStatusDropdownOpen) return;
    const handleClickOutside = (e) => {
      if (
        statusDropdownRef.current &&
        !statusDropdownRef.current.contains(e.target)
      ) {
        setIsStatusDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isStatusDropdownOpen]);

  const currentStatus =
    statusId != null
      ? VENUE_STATUS_OPTIONS.find((s) => s.id === statusId) || null
      : null;

  return (
    <div className="fixed inset-x-4 bottom-4 z-40">
      <div className="max-w-5xl mx-auto bg-indigo-600 text-white rounded-xl shadow-lg px-4 py-3 md:px-6 md:py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3 transition-all duration-200">
        <div className="flex-1 min-w-0 space-y-2 md:space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-100">
            Edición masiva de venues
          </p>
          <p className="text-sm font-medium truncate">
            Aplicar cambios a {count} evento{count === 1 ? "" : "s"} seleccionados
          </p>
          <div className="flex flex-col md:flex-row md:items-center gap-3 text-[11px] text-indigo-100/90">
            <div className="flex-1" ref={statusDropdownRef}>
              <label className="block mb-1 text-[10px] font-semibold uppercase tracking-wide text-indigo-100">
                Estado de venue
              </label>
              <button
                type="button"
                onClick={() =>
                  setIsStatusDropdownOpen((prev) => !prev)
                }
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border border-slate-300 bg-slate-50 text-slate-900 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-200 shadow-sm"
              >
                {currentStatus ? (
                  <>
                    <span
                      className="inline-block w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: currentStatus.color }}
                    />
                    <span className="truncate">{currentStatus.nombre}</span>
                  </>
                ) : (
                  <span className="italic text-slate-500">
                    Sin cambio de estado
                  </span>
                )}
                <svg
                  className="w-3 h-3 shrink-0 opacity-70"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
              {isStatusDropdownOpen && (
                <div className="mt-2 min-w-[12rem] py-1 bg-white border border-slate-200 rounded-lg shadow-lg text-slate-900">
                  {VENUE_STATUS_OPTIONS.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        onChangeStatus(s.id);
                        setIsStatusDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-[11px] font-medium flex items-center gap-2 hover:bg-slate-50 first:rounded-t-lg last:rounded-b-lg ${
                        statusId === s.id
                          ? "bg-indigo-50 text-indigo-800"
                          : "text-slate-700"
                      }`}
                    >
                      <span
                        className="inline-block w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: s.color }}
                      />
                      {s.nombre}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      onChangeStatus(null);
                      setIsStatusDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-[11px] font-medium hover:bg-slate-50 rounded-b-lg ${
                      statusId == null
                        ? "bg-indigo-50 text-indigo-800"
                        : "text-slate-500 italic"
                    }`}
                  >
                    Sin cambio de estado
                  </button>
                </div>
              )}
            </div>
            <div className="flex-1">
              <label className="block mb-1 text-[10px] font-semibold uppercase tracking-wide text-indigo-100">
                Nota masiva
              </label>
              <textarea
                rows={2}
                value={note}
                onChange={(e) => onChangeNote(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2 text-sm text-slate-900 resize-none focus:ring-2 focus:ring-indigo-500 outline-none bg-white placeholder:text-slate-400 shadow-sm"
                placeholder='Ej: "Actualizado por coordinación de logística"...'
              />
            </div>
          </div>
        </div>
        <div className="flex flex-col items-stretch md:items-end gap-2">
          <button
            type="button"
            onClick={onClearSelection}
            className="inline-flex items-center justify-center px-3 py-1.5 rounded-lg text-[11px] font-medium bg-indigo-500/40 hover:bg-indigo-500/60 text-indigo-50 border border-indigo-300/60 transition-colors"
          >
            Limpiar selección
          </button>
          <button
            type="button"
            onClick={onApply}
            disabled={saving}
            className="inline-flex items-center justify-center px-4 py-1.5 rounded-lg text-xs font-semibold bg-white text-indigo-700 hover:bg-indigo-50 disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
          >
            {saving && (
              <IconLoader className="animate-spin mr-1.5" size={14} />
            )}
            Aplicar a {count} evento{count === 1 ? "" : "s"}
          </button>
        </div>
      </div>
    </div>
  );
}

