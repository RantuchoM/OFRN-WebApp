import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  IconLoader,
  IconSearch,
  IconCheck,
  IconX,
  IconHelpCircle,
  IconClock,
  IconEdit,
  IconAlertTriangle,
  IconMail,
} from "../../components/ui/Icons";
import DateInput from "../../components/ui/DateInput";
import TimeInput from "../../components/ui/TimeInput";
import MultiSelectDropdown from "../../components/ui/MultiSelectDropdown";
import { format, parseISO, isAfter, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { isUserConvoked } from "../../utils/giraUtils";

// Condiciones estándar (estas pueden seguir fijas si no tienes tabla de condiciones)
const CONDICIONES_OPTIONS = [
  { value: "estable", label: "Estable" },
  { value: "contrato", label: "Contrato" },
  { value: "refuerzo", label: "Refuerzo" },
  { value: "invitado", label: "Invitado" },
  { value: "becario", label: "Becario" },
];

export default function MealsAttendance({
  supabase,
  gira,
  roster: enrichedRoster,
  hospedajeExcluidosIds = [],
}) {
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState([]);
  const [attendanceMap, setAttendanceMap] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [filterResponse, setFilterResponse] = useState("ALL");
  const [updatingCell, setUpdatingCell] = useState(null);
  const [sortConfig, setSortConfig] = useState({
    key: "apellido",
    direction: "asc",
  });

  // ESTADOS PARA FECHA LÍMITE
  const [deadline, setDeadline] = useState(null);
  const [deadlineTime, setDeadlineTime] = useState("12:00");
  const [isEditingDeadline, setIsEditingDeadline] = useState(false);
  const [savingDeadline, setSavingDeadline] = useState(false);

  // ESTADOS DE FILTROS Y ENVÍO
  const [rolesOptions, setRolesOptions] = useState([]); // <--- NUEVO ESTADO PARA ROLES
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [selectedConditions, setSelectedConditions] = useState([]);
  const [sendingMails, setSendingMails] = useState(false);

  const checkEligibility = useCallback(
    (evt, person) => {
      if (!evt || !person) return false;
      const convocadosList = evt.convocados || [];
      if (
        !isUserConvoked(convocadosList, person, { hospedajeExcluidosIds })
      )
        return false;
      const eventDate = evt.fecha;
      const coverageFrom = person.logistics?.comida_inicio?.date;
      const coverageTo = person.logistics?.comida_fin?.date;
      if (coverageFrom && eventDate < coverageFrom) return false;
      if (coverageTo && eventDate > coverageTo) return false;
      if (!person.is_local && !coverageFrom && !coverageTo) return false;
      return true;
    },
    [hospedajeExcluidosIds],
  );

  useEffect(() => {
    if (gira?.id) {
      fetchMatrixData();
      fetchRoles(); // <--- LLAMADA A CARGAR ROLES
      if (gira.fecha_confirmacion_limite) {
        const dt = new Date(gira.fecha_confirmacion_limite);
        setDeadline(dt.toISOString().split("T")[0]);
        setDeadlineTime(dt.toTimeString().slice(0, 5));
      }
    }
  }, [gira?.id]);

  // --- NUEVA FUNCIÓN PARA OBTENER ROLES ---
  const fetchRoles = async () => {
    try {
      const { data, error } = await supabase
        .from("roles")
        .select("id")
        .order("orden", { ascending: true }); // Ordenar por jerarquía o nombre

      if (error) throw error;

      if (data) {
        // Mapeamos al formato que espera MultiSelect: { value, label }
        const formattedRoles = data.map((r) => ({
          value: r.id.toLowerCase(), // Usamos minúsculas para comparar fácil
          label: r.id,
        }));
        setRolesOptions(formattedRoles);
      }
    } catch (err) {
      console.error("Error al cargar roles:", err);
      toast.error("No se pudieron cargar los roles");
    }
  };

  const fetchMatrixData = async () => {
    setLoading(true);
    try {
      const { data: evts } = await supabase
        .from("eventos")
        .select(`*, tipos_evento (nombre, id_categoria)`)
        .eq("id_gira", gira.id)
        .eq("is_deleted", false)
        .order("fecha", { ascending: true })
        .order("hora_inicio", { ascending: true });

      const mealEvents = (evts || []).filter(
        (e) =>
          e.tipos_evento?.id_categoria === 4 ||
          [7, 8, 9, 10].includes(e.id_tipo_evento),
      );

      if (mealEvents.length > 0) {
        const { data: att } = await supabase
          .from("eventos_asistencia")
          .select("*")
          .in(
            "id_evento",
            mealEvents.map((e) => e.id),
          );

        const map = {};
        att?.forEach((a) => {
          map[`${a.id_evento}-${a.id_integrante}`] = {
            estado: a.estado,
            id: a.id,
          };
        });
        setAttendanceMap(map);
      }
      setEvents(mealEvents);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDeadline = async () => {
    if (!deadline) return;
    setSavingDeadline(true);
    try {
      const isoString = new Date(
        `${deadline}T${deadlineTime}:00`,
      ).toISOString();
      const { error } = await supabase
        .from("programas")
        .update({ fecha_confirmacion_limite: isoString })
        .eq("id", gira.id);

      if (error) throw error;
      setIsEditingDeadline(false);
      toast.success("Fecha límite actualizada");
    } catch (err) {
      toast.error("Error al guardar fecha límite: " + err.message);
    } finally {
      setSavingDeadline(false);
    }
  };

  // --- FILTRO DE ROSTER (Memoizado) ---
  const sortedRoster = useMemo(() => {
    if (!enrichedRoster) return [];

    // 1. Descartar ausentes/bajas de base
    let data = enrichedRoster.filter(
      (p) => p.estado_gira !== "ausente" && p.estado_gira !== "baja",
    );

    // 2. Filtro por Rol (Multiselect) - AHORA DINÁMICO
    if (selectedRoles.length > 0) {
      data = data.filter((p) =>
        selectedRoles.includes((p.rol_gira || "").toLowerCase()),
      );
    }

    // 3. Filtro por Condición (Multiselect)
    if (selectedConditions.length > 0) {
      data = data.filter((p) => {
        const cond = (p.condicion_contrato || p.condicion || "").toLowerCase();
        return selectedConditions.some((sc) => cond.includes(sc));
      });
    }

    // 4. Filtro por Búsqueda de Texto
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      data = data.filter(
        (p) =>
          p.nombre.toLowerCase().includes(lower) ||
          p.apellido.toLowerCase().includes(lower) ||
          p.instrumentos?.instrumento?.toLowerCase().includes(lower),
      );
    }

    // 5. Filtro por Estado de Respuesta (Completitud)
    if (filterResponse !== "ALL") {
      data = data.filter((person) => {
        let req = 0,
          ans = 0;
        events.forEach((evt) => {
          if (checkEligibility(evt, person)) {
            req++;
            if (attendanceMap[`${evt.id}-${person.id}`]?.estado) ans++;
          }
        });
        if (req === 0) return false;
        if (filterResponse === "COMPLETE") return ans === req;
        if (filterResponse === "PARTIAL") return ans > 0 && ans < req;
        if (filterResponse === "NONE") return ans === 0;
        return true;
      });
    }

    // 6. Ordenamiento
    return data.sort((a, b) => {
      const valA = `${a.apellido} ${a.nombre}`;
      const valB = `${b.apellido} ${b.nombre}`;
      return sortConfig.direction === "asc"
        ? valA.localeCompare(valB)
        : valB.localeCompare(valA);
    });
  }, [
    enrichedRoster,
    searchTerm,
    sortConfig,
    filterResponse,
    events,
    attendanceMap,
    selectedRoles,
    selectedConditions,
    checkEligibility,
  ]);

  const eventsByDate = useMemo(() => {
    const groups = {};
    events.forEach((e) => {
      if (!groups[e.fecha]) groups[e.fecha] = [];
      groups[e.fecha].push(e);
    });
    return groups;
  }, [events]);

  const handleAttendanceChange = async (eventId, memberId, currentStatus) => {
    let newStatus =
      currentStatus === "P" ? "A" : currentStatus === "A" ? null : "P";
    const key = `${eventId}-${memberId}`;
    setUpdatingCell(key);
    try {
      if (newStatus === null) {
        await supabase
          .from("eventos_asistencia")
          .delete()
          .match({ id_evento: eventId, id_integrante: memberId });
        setAttendanceMap((prev) => {
          const c = { ...prev };
          delete c[key];
          return c;
        });
      } else {
        const { data } = await supabase
          .from("eventos_asistencia")
          .upsert(
            { id_evento: eventId, id_integrante: memberId, estado: newStatus },
            { onConflict: "id_evento, id_integrante" },
          )
          .select()
          .single();
        setAttendanceMap((prev) => ({
          ...prev,
          [key]: { estado: data.estado, id: data.id },
        }));
      }
    } catch (e) {
      toast.error("Error al actualizar asistencia");
    } finally {
      setUpdatingCell(null);
    }
  };

  // --- ENVÍO MASIVO DE CORREOS (BCC) ---
  const handleSendMealEmails = async () => {
    if (!deadline) {
      return alert("Primero debes definir una fecha límite de confirmación.");
    }

    const recipients = sortedRoster.filter((p) => p.mail);

    if (recipients.length === 0) {
      return alert("No hay integrantes con email en la lista actual filtrada.");
    }

    if (
      !confirm(
        `¿Enviar mail de aviso a ${recipients.length} integrantes?\n\nSe enviará una COPIA OCULTA (BCC) a todos.`,
      )
    )
      return;

    setSendingMails(true);
    const toastId = toast.loading("Enviando correos...");

    const deadlineDateObj = new Date(`${deadline}T${deadlineTime}:00`);
    const fechaLarga = format(
      deadlineDateObj,
      "EEEE d 'de' MMMM 'a las' HH:mm 'hs'",
      { locale: es },
    );

    const bccList = recipients.map((p) => p.mail);

    try {
      const { error } = await supabase.functions.invoke("mails_produccion", {
        body: {
          action: "enviar_mail",
          templateId: "confirmacion_comidas",
          bcc: bccList,
          nombre: "",
          gira: gira.nombre_gira,
          detalle: {
            nomenclador: gira.nomenclador,
            fechaLimiteTexto: fechaLarga,
          },
        },
      });

      if (error) throw error;

      toast.success(`Aviso enviado a ${bccList.length} personas.`, {
        id: toastId,
      });
    } catch (err) {
      console.error(err);
      toast.error("Error al enviar correos.", { id: toastId });
    } finally {
      setSendingMails(false);
    }
  };

  if (loading)
    return (
      <div className="flex justify-center py-20">
        <IconLoader className="animate-spin text-indigo-500" size={32} />
      </div>
    );

  const isExpired =
    deadline && isAfter(new Date(), new Date(`${deadline}T${deadlineTime}:00`));

  return (
    <div className="flex flex-col h-full bg-slate-50 animate-in fade-in">
      {/* HEADER SUPERIOR */}
      <div className="bg-white p-4 border-b border-slate-200 shrink-0 flex flex-col gap-4">
        <div className="flex justify-between items-start">
          {/* Título y Configuración de Cierre */}
          <div className="flex flex-col gap-3">
            <div>
              <h2 className="text-xl font-bold text-slate-800">
                Control de Asistencia
              </h2>
              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-tight">
                Sincronizado con Cobertura Logística
              </p>
            </div>

            <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-lg p-2 max-w-fit">
              <div className="flex items-center gap-2">
                <div
                  className={`p-1.5 rounded-full ${isExpired ? "bg-red-100 text-red-600" : "bg-emerald-100 text-emerald-600"}`}
                >
                  <IconClock size={16} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                    Cierre de Confirmación
                  </span>
                  {isEditingDeadline ? (
                    <div className="flex items-center gap-2 mt-1">
                      <DateInput
                        value={deadline}
                        onChange={setDeadline}
                        className="h-7 text-xs w-32 bg-white border-slate-300 focus:border-indigo-500"
                      />
                      <TimeInput
                        value={deadlineTime}
                        onChange={setDeadlineTime}
                        className="h-7 text-xs w-20 bg-white border-slate-300 focus:border-indigo-500"
                      />
                      <button
                        onClick={handleSaveDeadline}
                        disabled={savingDeadline}
                        className="p-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
                      >
                        {savingDeadline ? (
                          <IconLoader className="animate-spin" size={14} />
                        ) : (
                          <IconCheck size={14} />
                        )}
                      </button>
                      <button
                        onClick={() => setIsEditingDeadline(false)}
                        className="p-1 text-slate-400 hover:text-slate-600"
                      >
                        <IconX size={14} />
                      </button>
                    </div>
                  ) : (
                    <div
                      className="flex items-center gap-2 group cursor-pointer"
                      onClick={() => setIsEditingDeadline(true)}
                    >
                      <span
                        className={`text-sm font-bold ${isExpired ? "text-red-600" : "text-slate-700"}`}
                      >
                        {deadline ? (
                          <>
                            {format(parseISO(deadline), "d 'de' MMMM", {
                              locale: es,
                            })}{" "}
                            • {deadlineTime} hs
                            <span className="text-[10px] font-normal text-slate-400 ml-2 normal-case">
                              (
                              {isExpired
                                ? `Cerró hace ${formatDistanceToNow(new Date(`${deadline}T${deadlineTime}`), { locale: es })}`
                                : `Cierra en ${formatDistanceToNow(new Date(`${deadline}T${deadlineTime}`), { locale: es })}`}
                              )
                            </span>
                          </>
                        ) : (
                          <span className="text-slate-400 italic">
                            Sin fecha límite definida
                          </span>
                        )}
                      </span>
                      <IconEdit
                        size={12}
                        className="text-slate-300 group-hover:text-indigo-500 transition-colors opacity-0 group-hover:opacity-100"
                      />
                    </div>
                  )}
                </div>
              </div>
              {isExpired && !isEditingDeadline && (
                <div className="border-l border-slate-200 pl-3 ml-1 flex items-center gap-1 text-red-600 text-xs font-bold bg-red-50 px-2 py-1 rounded">
                  <IconAlertTriangle size={14} /> <span>CERRADO</span>
                </div>
              )}
            </div>
          </div>

          {/* FILTROS Y ACCIONES */}
          <div className="flex flex-col items-end gap-3">
            <div className="flex items-center gap-2">
              <div className="w-40 relative z-50">
                {/* USAMOS EL ESTADO DE ROLES DINÁMICO */}
                <MultiSelectDropdown
                  label="Rol"
                  options={rolesOptions}
                  value={selectedRoles}
                  onChange={setSelectedRoles}
                  placeholder="Rol"
                  compact={true}
                />
              </div>
              <div className="w-40 relative z-50">
                <MultiSelectDropdown
                  label="Condición"
                  options={CONDICIONES_OPTIONS}
                  value={selectedConditions}
                  onChange={setSelectedConditions}
                  placeholder="Condición"
                  compact={true}
                />
              </div>
              <div className="relative z-10">
                <IconSearch
                  className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400"
                  size={14}
                />
                <input
                  type="text"
                  placeholder="Buscar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="text-xs border rounded pl-8 pr-2 py-1.5 outline-none w-32 focus:ring-2 focus:ring-indigo-100 transition-all h-[34px]"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={filterResponse}
                onChange={(e) => setFilterResponse(e.target.value)}
                className="text-xs border rounded px-2 py-1.5 font-bold outline-none bg-white hover:border-slate-400 transition-colors cursor-pointer h-[34px]"
              >
                <option value="ALL">Todos los estados</option>
                <option value="COMPLETE">✅ Completos</option>
                <option value="PARTIAL">⚠️ Parciales</option>
                <option value="NONE">❌ Sin Respuesta</option>
              </select>

              <div className="h-6 w-px bg-slate-200 mx-2"></div>

              <button
                onClick={handleSendMealEmails}
                disabled={sendingMails || sortedRoster.length === 0}
                className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 text-white rounded text-xs font-bold hover:bg-slate-700 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed h-[34px]"
              >
                {sendingMails ? (
                  <IconLoader className="animate-spin" size={14} />
                ) : (
                  <IconMail size={14} />
                )}
                <span>Enviar Aviso ({sortedRoster.length})</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* TABLA DE ASISTENCIA */}
      <div className="flex-1 overflow-auto p-4">
        <div className="bg-white border border-slate-300 rounded-lg shadow-sm">
          <table className="w-full text-left border-separate border-spacing-0 text-sm table-fixed min-w-[800px]">
            <thead>
              <tr className="sticky top-0 z-40 shadow-sm">
                <th className="sticky left-0 top-0 z-50 bg-slate-100 border-r border-b border-slate-300 w-[250px] p-2 text-[10px] text-slate-500 uppercase font-bold shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                  Integrante
                </th>
                {Object.keys(eventsByDate)
                  .sort()
                  .map((date) => (
                    <th
                      key={date}
                      colSpan={eventsByDate[date].length}
                      className="text-center border-r border-b border-slate-300 px-2 py-1 bg-slate-200 text-[10px] font-bold text-slate-600 uppercase"
                    >
                      {format(parseISO(date), "EEE d MMM", { locale: es })}
                    </th>
                  ))}
              </tr>
              <tr className="sticky top-[33px] z-40 shadow-sm">
                <th className="sticky left-0 z-50 bg-slate-50 border-r border-b border-slate-300 p-2 text-[9px] font-bold text-slate-400 uppercase shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                  Dieta / Instrumento
                </th>
                {events.map((evt) => (
                  <th
                    key={evt.id}
                    className="border-r border-b border-slate-200 p-1 text-center bg-white w-[50px]"
                  >
                    <span className="block text-[8px] text-slate-400 font-mono">
                      {evt.hora_inicio?.slice(0, 5)}
                    </span>
                    <span
                      className={`inline-flex w-5 h-5 items-center justify-center rounded-full text-[9px] font-bold border ${evt.id_tipo_evento === 8 ? "bg-amber-50 text-amber-600 border-amber-200" : "bg-indigo-50 text-indigo-600 border-indigo-200"}`}
                    >
                      {evt.tipos_evento?.nombre?.charAt(0)}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedRoster.map((person) => (
                <tr key={person.id} className="hover:bg-slate-50 group h-12">
                  <td className="sticky left-0 bg-white group-hover:bg-slate-50 z-30 border-r border-slate-200 px-3 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                    <div className="flex flex-col min-w-0">
                      <span className="font-bold truncate text-slate-700 text-xs">
                        {person.apellido}, {person.nombre}
                      </span>
                      <span className="text-[9px] text-purple-500 font-medium truncate uppercase">
                        {person.instrumentos?.instrumento ||
                          person.alimentacion ||
                          "Estándar"}
                      </span>
                    </div>
                  </td>
                  {events.map((evt) => {
                    const isEligible = checkEligibility(evt, person);
                    const key = `${evt.id}-${person.id}`;
                    const status = attendanceMap[key]?.estado;

                    if (!isEligible) {
                      return (
                        <td
                          key={evt.id}
                          className="bg-slate-50/50 border-r border-slate-100 text-center"
                        >
                          <span className="w-1 h-1 rounded-full bg-slate-200 inline-block"></span>
                        </td>
                      );
                    }

                    return (
                      <td
                        key={evt.id}
                        className="p-1 border-r border-slate-100 text-center relative"
                      >
                        {updatingCell === key && (
                          <IconLoader
                            className="absolute inset-0 m-auto animate-spin text-indigo-400"
                            size={12}
                          />
                        )}
                        <button
                          onClick={() =>
                            handleAttendanceChange(evt.id, person.id, status)
                          }
                          className={`w-7 h-7 rounded-md flex items-center justify-center mx-auto border-2 transition-all ${status === "P" ? "bg-emerald-100 border-emerald-400 text-emerald-700" : status === "A" ? "bg-red-50 border-red-200 text-red-400" : "bg-white border-slate-200 text-slate-200 hover:border-slate-300"}`}
                        >
                          {status === "P" ? (
                            <IconCheck size={14} strokeWidth={3} />
                          ) : status === "A" ? (
                            <IconX size={14} strokeWidth={3} />
                          ) : (
                            <IconHelpCircle size={12} />
                          )}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
