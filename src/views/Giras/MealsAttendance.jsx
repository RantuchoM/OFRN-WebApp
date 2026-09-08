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
import MealOrchestraOnlyFilterChip from "../../components/logistics/MealOrchestraOnlyFilterChip";
import { format, parseISO, isAfter, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { matchesMultiTokenSearch } from "../../utils/sanitize";
import {
  isPersonEligibleForMealSlot,
  mealServicioFromEvent,
  mealDisplayLabelFromEvent,
  getMealServiceStyle,
  isMealRelatedEvent,
  CATERING_SERVICE,
  filterMealManagerRows,
  createDefaultMealFilters,
  isDefaultMealFilters,
  DEFAULT_MEAL_SERVICE_FILTER,
  MEAL_FILTER_NO_LOC,
  buildMealArtistFilterOptions,
  MEAL_FILTER_ORCHESTRA_ONLY,
  mealRowGrupoIds,
  mealRowHasOfrnAudience,
  isOrchestraMealRow,
  findCoincidingGrupoMealRows,
  buildMealAttendanceTurnColumns,
  resolveAttendanceEventForPerson,
  mergeAttendanceStatuses,
} from "../../utils/mealLogistics";
import { useGiraSegmentos } from "../../hooks/useGiraSegmentos";
import { useConfirmDialog } from "../../hooks/useConfirmDialog";
import { buildIntegranteGruposMap } from "../../services/giraGruposService";

const EMPTY_HOSPEDAJE_EXCLUIDOS = Object.freeze([]);

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
  hospedajeExcluidosIds = EMPTY_HOSPEDAJE_EXCLUIDOS,
  mealFilters = null,
  onMealFiltersChange = null,
  giraGrupos = [],
  fimbaMode = false,
}) {
  const { confirm, dialog } = useConfirmDialog();
  const [loading, setLoading] = useState(false);
  /** Fuente completa de eventos meal; filtros solo ocultan columnas. */
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
  const filtersControlled =
    mealFilters != null && typeof onMealFiltersChange === "function";
  const [localMealFilters, setLocalMealFilters] = useState(() =>
    createDefaultMealFilters(),
  );
  const activeMealFilters = filtersControlled ? mealFilters : localMealFilters;
  const patchMealFilters = (patchOrFn) => {
    const apply = (prev) => {
      const base = prev || createDefaultMealFilters();
      const patch =
        typeof patchOrFn === "function" ? patchOrFn(base) : patchOrFn;
      return { ...base, ...patch };
    };
    if (filtersControlled) onMealFiltersChange(apply(mealFilters));
    else setLocalMealFilters((prev) => apply(prev));
  };
  const mealKindFilter = activeMealFilters.mealKindFilter || "all";
  const setMealKindFilter = (v) => patchMealFilters({ mealKindFilter: v });
  const filterLocacionIds = activeMealFilters.locacionIds || [];
  const setFilterLocacionIds = (v) => patchMealFilters({ locacionIds: v });
  const filterArtistaIds = activeMealFilters.artistaIds || [];
  const setFilterArtistaIds = (v) => patchMealFilters({ artistaIds: v });
  const serviceFilter = useMemo(
    () => new Set(activeMealFilters.serviceFilter || DEFAULT_MEAL_SERVICE_FILTER),
    [activeMealFilters.serviceFilter],
  );
  const setServiceFilter = (updater) => {
    patchMealFilters((prev) => {
      const cur = new Set(prev.serviceFilter || DEFAULT_MEAL_SERVICE_FILTER);
      const next = typeof updater === "function" ? updater(cur) : updater;
      return { serviceFilter: [...next] };
    });
  };
  const { segments } = useGiraSegmentos(supabase, gira, {
    enabled: Boolean(gira?.id),
  });

  const integranteGruposMap = useMemo(
    () => buildIntegranteGruposMap(giraGrupos, enrichedRoster || []),
    [giraGrupos, enrichedRoster],
  );

  const checkEligibilityRaw = useCallback(
    (evt, person) => {
      if (!evt || !person) return false;
      if (!mealRowHasOfrnAudience(evt)) return false;
      return isPersonEligibleForMealSlot(
        person,
        {
          fecha: evt.fecha,
          servicio: mealServicioFromEvent(evt),
          convocados: evt.convocados || [],
          hora: evt.hora_inicio,
          grupoIds: mealRowGrupoIds(evt),
        },
        { hospedajeExcluidosIds, segments, integranteGruposMap },
      );
    },
    [hospedajeExcluidosIds, segments, integranteGruposMap],
  );

  /**
   * Elegibilidad post-deducción: en comidas generales (sin grupo), restar
   * quienes comen en un evento de grupo del mismo turno (fecha|servicio).
   */
  const checkEligibility = useCallback(
    (evt, person) => {
      if (!checkEligibilityRaw(evt, person)) return false;
      if (!isOrchestraMealRow(evt)) return true;
      const coinciding = findCoincidingGrupoMealRows(evt, events);
      for (const gRow of coinciding) {
        if (checkEligibilityRaw(gRow, person)) return false;
      }
      return true;
    },
    [checkEligibilityRaw, events],
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
        .select(
          `*, tipos_evento (nombre, id_categoria), locaciones (id, nombre), eventos_grupos ( id_grupo, giras_grupos ( id, nombre, color ) ), eventos_fimba_propuestas ( id_propuesta, fimba_propuestas ( id, nombre, requiere_comidas ) )`,
        )
        .eq("id_gira", gira.id)
        .eq("is_deleted", false)
        .order("fecha", { ascending: true })
        .order("hora_inicio", { ascending: true });

      const mealEvents = (evts || []).filter(isMealRelatedEvent).map((m) => {
        const propuestas = (m.eventos_fimba_propuestas || [])
          .map((link) => link.fimba_propuestas)
          .filter(Boolean);
        return { ...m, propuestas };
      });

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

  const NO_LOC_FILTER = MEAL_FILTER_NO_LOC;

  const locationFilterOptions = useMemo(() => {
    const map = new Map();
    let hasNone = false;
    for (const evt of events) {
      const id = evt.id_locacion ?? evt.locaciones?.id;
      if (id == null || id === "") {
        hasNone = true;
        continue;
      }
      const key = String(id);
      if (map.has(key)) continue;
      map.set(key, {
        value: key,
        label: evt.locaciones?.nombre || `Locación ${key}`,
      });
    }
    const opts = Array.from(map.values()).sort((a, b) =>
      a.label.localeCompare(b.label, "es"),
    );
    if (hasNone) opts.push({ value: NO_LOC_FILTER, label: "Sin locación" });
    return opts;
  }, [events]);

  const artistFilterOptions = useMemo(
    () => buildMealArtistFilterOptions({ rows: events }),
    [events],
  );
  const showArtistFilter =
    fimbaMode ||
    artistFilterOptions.some(
      (o) => o.value !== MEAL_FILTER_ORCHESTRA_ONLY,
    );

  /** Vista filtrada — nunca se escribe sobre `events`. */
  const filteredEvents = useMemo(
    () =>
      filterMealManagerRows(events, {
        mealKindFilter,
        serviceFilter,
        locacionIds: filterLocacionIds,
        artistaIds: filterArtistaIds,
      }),
    [
      events,
      serviceFilter,
      mealKindFilter,
      filterLocacionIds,
      filterArtistaIds,
    ],
  );

  /** Una columna por turno fecha|servicio (colapsa eventos concurrentes). */
  const attendanceColumns = useMemo(
    () => buildMealAttendanceTurnColumns(filteredEvents),
    [filteredEvents],
  );

  const clearEventFilters = () => {
    patchMealFilters(createDefaultMealFilters());
  };

  const hasActiveEventFilters = !isDefaultMealFilters(activeMealFilters);

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
      data = data.filter((p) =>
        matchesMultiTokenSearch(
          [p.nombre, p.apellido, p.instrumentos?.instrumento],
          searchTerm,
        ),
      );
    }

    // 5. Filtro por Estado de Respuesta — una celda por turno (fecha|servicio)
    if (filterResponse !== "ALL") {
      data = data.filter((person) => {
        let req = 0,
          ans = 0;
        attendanceColumns.forEach((col) => {
          const evt = resolveAttendanceEventForPerson(
            col.events,
            person,
            checkEligibility,
          );
          if (!evt) return;
          req++;
          if (attendanceMap[`${evt.id}-${person.id}`]?.estado) ans++;
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
    attendanceColumns,
    attendanceMap,
    selectedRoles,
    selectedConditions,
    checkEligibility,
  ]);

  /** Agrupa columnas de turno por fecha para el header sticky. */
  const turnosByDate = useMemo(() => {
    const groups = {};
    attendanceColumns.forEach((col) => {
      if (!groups[col.fecha]) groups[col.fecha] = [];
      groups[col.fecha].push(col);
    });
    return groups;
  }, [attendanceColumns]);

  /**
   * Persiste asistencia en el evento concreto del turno donde come la persona.
   * Limpia filas residuales en eventos hermanos del mismo turno para no
   * duplicar estado al colapsar columnas.
   */
  const handleAttendanceChange = async (
    eventId,
    memberId,
    currentStatus,
    siblingEventIds = [],
  ) => {
    let newStatus =
      currentStatus === "P" ? "A" : currentStatus === "A" ? null : "P";
    const key = `${eventId}-${memberId}`;
    const siblingIds = siblingEventIds.filter(
      (id) => String(id) !== String(eventId),
    );
    setUpdatingCell(key);
    try {
      if (siblingIds.length > 0) {
        await supabase
          .from("eventos_asistencia")
          .delete()
          .in("id_evento", siblingIds)
          .eq("id_integrante", memberId);
      }

      if (newStatus === null) {
        await supabase
          .from("eventos_asistencia")
          .delete()
          .match({ id_evento: eventId, id_integrante: memberId });
        setAttendanceMap((prev) => {
          const c = { ...prev };
          delete c[key];
          for (const eid of siblingIds) delete c[`${eid}-${memberId}`];
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
        setAttendanceMap((prev) => {
          const next = {
            ...prev,
            [key]: { estado: data.estado, id: data.id },
          };
          for (const eid of siblingIds) delete next[`${eid}-${memberId}`];
          return next;
        });
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
      !(await confirm({
        title: "Enviar avisos",
        message: `¿Enviar mail de aviso a ${recipients.length} integrantes?\n\nSe enviará una COPIA OCULTA (BCC) a todos.`,
        confirmText: "Enviar",
      }))
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
      {dialog}
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
            <div className="flex items-center gap-2 flex-wrap justify-end">
              <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500">
                {[
                  { id: "all", label: "Todos" },
                  { id: "comidas", label: "Comidas" },
                  { id: "catering", label: "Catering" },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setMealKindFilter(opt.id)}
                    className={`px-2 py-0.5 rounded-full border text-[10px] uppercase ${
                      mealKindFilter === opt.id
                        ? opt.id === "catering"
                          ? "bg-orange-600 text-white border-orange-600"
                          : "bg-indigo-600 text-white border-indigo-600"
                        : "bg-slate-50 text-slate-500 border-slate-300"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-0.5 bg-white border border-slate-200 rounded-lg p-0.5 h-[34px]">
                {["Desayuno", "Almuerzo", "Merienda", "Cena", CATERING_SERVICE].map(
                  (svc) => {
                    const active = serviceFilter.has(svc);
                    const short =
                      svc === CATERING_SERVICE
                        ? "Cat"
                        : svc === "Desayuno"
                          ? "D"
                          : svc === "Almuerzo"
                            ? "A"
                            : svc === "Merienda"
                              ? "M"
                              : "C";
                    return (
                      <button
                        key={svc}
                        type="button"
                        title={svc}
                        onClick={() =>
                          setServiceFilter((prev) => {
                            const next = new Set(prev);
                            next.has(svc) ? next.delete(svc) : next.add(svc);
                            return next;
                          })
                        }
                        className={`px-2 h-full text-xs font-bold rounded-md ${
                          active
                            ? svc === CATERING_SERVICE
                              ? "bg-orange-600 text-white"
                              : "bg-indigo-600 text-white"
                            : "text-slate-500 hover:bg-slate-100"
                        }`}
                      >
                        {short}
                      </button>
                    );
                  },
                )}
              </div>
              <div className="w-36 relative z-50">
                <MultiSelectDropdown
                  compact
                  summaryMode="names"
                  summaryMaxNames={1}
                  label="Locación"
                  placeholder="Locación…"
                  options={locationFilterOptions}
                  value={filterLocacionIds}
                  onChange={setFilterLocacionIds}
                />
              </div>
              {showArtistFilter && (
                <MealOrchestraOnlyFilterChip
                  value={filterArtistaIds}
                  onChange={setFilterArtistaIds}
                />
              )}
              {showArtistFilter && (
                <div className="w-36 relative z-50">
                  <MultiSelectDropdown
                    compact
                    summaryMode="names"
                    summaryMaxNames={1}
                    label="Artista"
                    placeholder="Artista…"
                    options={artistFilterOptions}
                    value={filterArtistaIds}
                    onChange={setFilterArtistaIds}
                  />
                </div>
              )}
              {hasActiveEventFilters && (
                <button
                  type="button"
                  onClick={clearEventFilters}
                  className="text-[11px] font-bold text-slate-500 hover:text-indigo-600 underline"
                >
                  Limpiar
                </button>
              )}
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

      {/* TABLA DE ASISTENCIA — columnas = turno (fecha|servicio) */}
      <div className="flex-1 overflow-auto p-4">
        <div className="bg-white border border-slate-300 rounded-lg shadow-sm">
          <table className="w-full text-left border-separate border-spacing-0 text-sm table-fixed min-w-[800px]">
            <thead>
              <tr className="sticky top-0 z-40 shadow-sm">
                <th className="sticky left-0 top-0 z-50 bg-slate-100 border-r border-b border-slate-300 w-[250px] p-2 text-[10px] text-slate-500 uppercase font-bold shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                  Integrante
                </th>
                {Object.keys(turnosByDate)
                  .sort()
                  .map((date) => (
                    <th
                      key={date}
                      colSpan={turnosByDate[date].length}
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
                {attendanceColumns.map((col) => {
                  const sample = col.events[0];
                  const serviceLabel = sample
                    ? mealDisplayLabelFromEvent(sample)
                    : col.servicio;
                  const style = getMealServiceStyle(col.servicio);
                  const titleParts = col.events.map((evt) => {
                    const label = mealDisplayLabelFromEvent(evt);
                    const hora = evt.hora_inicio
                      ? String(evt.hora_inicio).slice(0, 5)
                      : "";
                    return hora ? `${label} · ${hora}` : label;
                  });
                  return (
                    <th
                      key={col.turnoKey}
                      className="border-r border-b border-slate-200 p-1 text-center bg-white w-[56px]"
                      title={titleParts.join("\n")}
                    >
                      {col.hora_inicio ? (
                        <span className="block text-[8px] text-slate-400 font-mono">
                          {col.hora_inicio}
                        </span>
                      ) : col.multiEvent ? (
                        <span className="block text-[8px] text-slate-300 font-mono">
                          ···
                        </span>
                      ) : (
                        <span className="block text-[8px] text-transparent font-mono">
                          —
                        </span>
                      )}
                      <span
                        className={`inline-flex min-w-5 h-5 px-0.5 items-center justify-center rounded-full text-[9px] font-bold border ${style.tag}`}
                      >
                        {col.servicio?.charAt(0) || "?"}
                      </span>
                      {serviceLabel !== col.servicio && !col.multiEvent && (
                        <span
                          className="block text-[7px] leading-tight text-slate-500 font-semibold truncate max-w-[52px] mx-auto"
                          title={serviceLabel}
                        >
                          {serviceLabel
                            .replace(
                              new RegExp(`^${col.servicio}\\s*`, "i"),
                              "",
                            )
                            .trim()}
                        </span>
                      )}
                    </th>
                  );
                })}
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
                  {attendanceColumns.map((col) => {
                    const resolved = resolveAttendanceEventForPerson(
                      col.events,
                      person,
                      checkEligibility,
                    );

                    if (!resolved) {
                      return (
                        <td
                          key={col.turnoKey}
                          className="bg-slate-50/50 border-r border-slate-100 text-center"
                        >
                          <span className="w-1 h-1 rounded-full bg-slate-200 inline-block"></span>
                        </td>
                      );
                    }

                    const cellKey = `${resolved.id}-${person.id}`;
                    const eligibleStatuses = col.events
                      .filter((evt) => checkEligibility(evt, person))
                      .map(
                        (evt) =>
                          attendanceMap[`${evt.id}-${person.id}`]?.estado,
                      );
                    const status =
                      mergeAttendanceStatuses(eligibleStatuses) ||
                      attendanceMap[cellKey]?.estado ||
                      null;

                    return (
                      <td
                        key={col.turnoKey}
                        className="p-1 border-r border-slate-100 text-center relative"
                      >
                        {updatingCell === cellKey && (
                          <IconLoader
                            className="absolute inset-0 m-auto animate-spin text-indigo-400"
                            size={12}
                          />
                        )}
                        <button
                          onClick={() =>
                            handleAttendanceChange(
                              resolved.id,
                              person.id,
                              status,
                              col.events.map((e) => e.id),
                            )
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
