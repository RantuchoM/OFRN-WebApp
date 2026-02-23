import { useState, useEffect, useRef, useCallback } from "react";
import { startOfDay, endOfDay, addMonths, parseISO } from "date-fns";
import { toast } from "sonner";
import { getTodayDateStringLocal } from "../utils/dates";
import { calculateLogisticsSummary } from "./useLogistics";

const EVENT_SELECT = `
    id, fecha, hora_inicio, hora_fin, tecnica, descripcion, convocados, id_tipo_evento, id_locacion, id_gira, id_gira_transporte, updated_at, is_deleted, deleted_at,
    giras_transportes ( id, detalle, transportes ( nombre, color ) ),
    tipos_evento ( id, nombre, color, categorias_tipos_eventos (id, nombre) ),
    locaciones ( id, nombre, direccion, link_mapa, localidades (localidad) ),
    programas ( id, nombre_gira, nomenclador, google_drive_folder_id, mes_letra, fecha_desde, fecha_hasta, tipo, zona, estado, fecha_confirmacion_limite, giras_fuentes(tipo, valor_id, valor_texto), giras_integrantes(id_integrante, estado, rol) ),
    eventos_programas_asociados ( programas ( id, nombre_gira, google_drive_folder_id, mes_letra, nomenclador, estado ) ),
    eventos_ensambles ( ensambles ( id, ensamble ) )
  `;

function saveToCache(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    if (error.name === "QuotaExceededError" || error.code === 22) {
      console.warn("⚠️ LocalStorage lleno. Limpiando caché antigua...");
      Object.keys(localStorage).forEach((k) => {
        if (k.startsWith("agenda_cache_")) localStorage.removeItem(k);
      });
      try {
        localStorage.setItem(key, JSON.stringify(data));
      } catch (retryError) {
        console.error("❌ Imposible guardar en caché.", retryError);
      }
    }
  }
}

export function getAgendaCacheKey(effectiveUserId, giraId) {
  return `agenda_cache_${effectiveUserId}_${giraId || "general"}_v5`;
}

/**
 * Hook de datos de la agenda: fetch, caché, realtime y categorías.
 * Recibe filtros de fecha para armar el rango de la query (agenda general).
 *
 * @param {object} opts
 * @param {object} opts.supabase
 * @param {string} opts.effectiveUserId
 * @param {string | null} opts.giraId
 * @param {object | null} opts.userProfile
 * @param {number} opts.monthsLimit
 * @param {string} opts.filterDateFrom
 * @param {string | null} opts.filterDateTo
 * @param {function} opts.checkIsConvoked(convocadosList, tourRole)
 * @param {function} opts.setSelectedCategoryIds
 * @param {number[]} opts.selectedCategoryIds - para processCategories (default selection)
 * @param {function} opts.setAvailableCategories - el componente posee availableCategories; el hook lo actualiza
 * @param {boolean} opts.isEditor
 * @param {boolean} opts.isManagement
 * @param {object | null} opts.user - para suscripción realtime
 */
export function useAgendaData({
  supabase,
  effectiveUserId,
  giraId,
  userProfile,
  monthsLimit,
  filterDateFrom,
  filterDateTo,
  checkIsConvoked,
  setSelectedCategoryIds,
  selectedCategoryIds,
  setAvailableCategories,
  isEditor,
  isManagement,
  user,
}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [feriados, setFeriados] = useState([]);
  const [myTransportLogistics, setMyTransportLogistics] = useState({});
  const [toursWithRules, setToursWithRules] = useState(() => new Set());
  const [recentlyUpdatedEventIds, setRecentlyUpdatedEventIds] = useState(
    () => new Set(),
  );
  const [isOfflineMode, setIsOfflineMode] = useState(!navigator.onLine);
  const [lastUpdate, setLastUpdate] = useState(() => new Date());
  const [realtimeStatus, setRealtimeStatus] = useState("CONNECTING");

  const abortControllerRef = useRef(null);
  const refreshTimeoutRef = useRef(null);
  const mergeSingleEventFromRealtimeRef = useRef(null);
  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const processCategories = useCallback(
    (eventsList) => {
      const categoriesMap = {};
      eventsList.forEach((evt) => {
        if (evt.isProgramMarker) return;
        const cat = evt.tipos_evento?.categorias_tipos_eventos;
        if (cat && !categoriesMap[cat.id]) categoriesMap[cat.id] = cat;
      });
      const uniqueCats = Object.values(categoriesMap).sort((a, b) =>
        a.nombre.localeCompare(b.nombre),
      );
      setAvailableCategories(uniqueCats);
      if (selectedCategoryIds?.length === 0 && uniqueCats.length > 0) {
        const defaultSelection = uniqueCats
          .filter((cat) => {
            if (isEditor || isManagement) return true;
            return cat.id !== 3;
          })
          .map((c) => c.id);
        setSelectedCategoryIds(defaultSelection);
      }
    },
    [
      selectedCategoryIds?.length,
      isEditor,
      isManagement,
      setSelectedCategoryIds,
      setAvailableCategories,
    ],
  );

  const fetchAgenda = useCallback(
    async (isBackground = false) => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;
      const signal = controller.signal;

      if (!isBackground) setLoading(true);
      else setIsRefreshing(true);

      const CACHE_KEY = getAgendaCacheKey(effectiveUserId, giraId);

      try {
        if (!isBackground && itemsRef.current.length === 0) {
          const cachedData = localStorage.getItem(CACHE_KEY);
          if (cachedData) {
            const parsedData = JSON.parse(cachedData);
            setItems(parsedData);
            processCategories(parsedData.filter((i) => !i.isProgramMarker));
          }
        }

        if (!navigator.onLine) {
          setIsOfflineMode(true);
          throw new Error("OFFLINE_MODE");
        }

        const todayStr = getTodayDateStringLocal();
        let start, end;
        if (giraId) {
          start = startOfDay(new Date()).toISOString();
          end = addMonths(new Date(), monthsLimit).toISOString();
        } else {
          const fromPast = filterDateFrom && filterDateFrom < todayStr;
          start = fromPast
            ? startOfDay(parseISO(filterDateFrom)).toISOString()
            : startOfDay(new Date()).toISOString();
          end = filterDateTo
            ? endOfDay(parseISO(filterDateTo)).toISOString()
            : addMonths(new Date(), monthsLimit).toISOString();
        }

        const profileRole = userProfile?.rol_sistema || "musico";
        let myEnsembles = new Set();
        let myFamily = null;
        if (userProfile) {
          userProfile.integrantes_ensambles?.forEach((ie) =>
            myEnsembles.add(ie.id_ensamble),
          );
          myFamily = userProfile.instrumentos?.familia;
        }

        const [customAttendance, ensembleEvents, feriadosData] =
          await Promise.all([
            supabase
              .from("eventos_asistencia_custom")
              .select("id_evento, tipo, nota")
              .eq("id_integrante", effectiveUserId),
            myEnsembles.size > 0
              ? supabase
                  .from("eventos_ensambles")
                  .select("id_evento")
                  .in("id_ensamble", Array.from(myEnsembles))
              : Promise.resolve({ data: [] }),
            supabase.from("feriados").select("*").order("fecha", { ascending: true }),
          ]);

        if (signal.aborted) return;

        const customMap = new Map();
        customAttendance.data?.forEach((c) => customMap.set(c.id_evento, c));
        const myEnsembleEventIds = new Set(
          ensembleEvents.data?.map((e) => e.id_evento),
        );

        const timestamp24hAgo = new Date(
          Date.now() - 24 * 60 * 60 * 1000,
        ).toISOString();

        let query = supabase
          .from("eventos")
          .select(EVENT_SELECT)
          .or(
            `is_deleted.eq.false,is_deleted.is.null,and(is_deleted.eq.true,deleted_at.gt.${timestamp24hAgo})`,
          )
          .order("fecha", { ascending: true })
          .order("hora_inicio", { ascending: true })
          .abortSignal(signal);

        if (giraId) query = query.eq("id_gira", giraId);
        else query = query.gte("fecha", start).lte("fecha", end);

        const { data: eventsData, error } = await query;
        if (error) {
          if (
            error.code === "AbortError" ||
            error.message?.includes("AbortError") ||
            signal.aborted
          )
            return;
          throw error;
        }

        const activeTourIds = new Set();
        eventsData?.forEach((e) => {
          if (e.id_gira) activeTourIds.add(e.id_gira);
        });

        let logisticsMap = {};
        const foundRuleTours = new Set();

        if (activeTourIds.size > 0 && userProfile) {
          const [admRes, routesRes, transRes] = await Promise.all([
            supabase
              .from("giras_logistica_admision")
              .select("*")
              .in("id_gira", Array.from(activeTourIds)),
            supabase
              .from("giras_logistica_rutas")
              .select(
                "*, evento_subida:id_evento_subida(id, fecha, hora_inicio), evento_bajada:id_evento_bajada(id, fecha, hora_inicio)",
              )
              .in("id_gira", Array.from(activeTourIds)),
            supabase
              .from("giras_transportes")
              .select("id, id_gira, detalle, transportes(nombre)")
              .in("id_gira", Array.from(activeTourIds)),
          ]);

          const admissionData = admRes.data || [];
          const routesData = routesRes.data || [];
          const transportsData = transRes.data || [];

          if (transportsData.length > 0) {
            const admissionByGira = {};
            const routesByGira = {};
            const transportsByGira = {};
            admissionData.forEach((r) => {
              if (!admissionByGira[r.id_gira]) admissionByGira[r.id_gira] = [];
              admissionByGira[r.id_gira].push(r);
              foundRuleTours.add(r.id_gira);
            });
            routesData.forEach((r) => {
              if (!routesByGira[r.id_gira]) routesByGira[r.id_gira] = [];
              routesByGira[r.id_gira].push(r);
              foundRuleTours.add(r.id_gira);
            });
            transportsData.forEach((t) => {
              if (!transportsByGira[t.id_gira]) transportsByGira[t.id_gira] = [];
              transportsByGira[t.id_gira].push(t);
            });

            const userEnsemblesIds = (
              userProfile.integrantes_ensambles || []
            ).map((ie) => String(ie.id_ensamble));
            const cleanLocId = userProfile.id_localidad
              ? Number(userProfile.id_localidad)
              : null;
            const residenciaObj = userProfile.datos_residencia;
            const cleanRegionId = residenciaObj?.id_region
              ? Number(residenciaObj.id_region)
              : null;

            activeTourIds.forEach((gId) => {
              const sampleEvt = eventsData.find(
                (e) => String(e.id_gira) === String(gId) && e.programas,
              );
              const currentTransports = transportsByGira[gId] || [];
              if (currentTransports.length === 0) return;

              let tourRole = "musico";
              let estadoGira = null;

              if (sampleEvt?.programas) {
                const members = sampleEvt.programas.giras_integrantes || [];
                const myRecord = members.find(
                  (i) => String(i.id_integrante) === String(effectiveUserId),
                );
                if (myRecord) {
                  tourRole = myRecord.rol;
                  estadoGira = myRecord.estado;
                  if (["baja", "no_convocado", "ausente"].includes(estadoGira))
                    return;
                }
                const sources = sampleEvt.programas.giras_fuentes || [];
                const myFamilySrc = userProfile.instrumentos?.familia;
                const matchesSource = sources.some((src) => {
                  if (
                    src.tipo === "ENSAMBLE" &&
                    userEnsemblesIds.includes(String(src.valor_id))
                  )
                    return true;
                  if (src.tipo === "FAMILIA" && src.valor_texto === myFamilySrc)
                    return true;
                  return false;
                });
                if (!myRecord && !matchesSource) return;
              }

              const mockPerson = {
                ...userProfile,
                id: userProfile.id,
                id_localidad: cleanLocId,
                localidades: { id: cleanLocId, id_region: cleanRegionId },
                instrumentos: userProfile.instrumentos || {},
                rol_gira: tourRole,
                estado_gira: estadoGira,
                es_adicional: false,
                logistics: {},
              };
              const result = calculateLogisticsSummary(
                [mockPerson],
                [],
                admissionByGira[gId] || [],
                routesByGira[gId] || [],
                currentTransports,
                [],
              );
              const myTransports = result[0]?.logistics?.transports || [];
              myTransports.forEach((t) => {
                logisticsMap[String(t.id)] = {
                  assigned: true,
                  subidaId: t.subidaId,
                  bajadaId: t.bajadaId,
                  priority: t.priority,
                };
              });
            });
          }
        }

        setMyTransportLogistics(logisticsMap);
        setToursWithRules(foundRuleTours);

        const visibleEvents = (eventsData || []).filter((item) => {
          if (!item.fecha) return false;
          if (item.is_deleted === true && item.deleted_at) {
            const deletedAt = new Date(item.deleted_at).getTime();
            if (deletedAt < Date.now() - 24 * 60 * 60 * 1000) return false;
          }
          if (giraId) return true;
          const isManagementProfile = [
            "admin",
            "editor",
            "coord_general",
            "director",
          ].includes(profileRole);
          if (isManagementProfile) return true;
          if (customMap.has(item.id)) return true;
          if (myEnsembleEventIds.has(item.id)) return true;
          if (item.programas) {
            const overrides = item.programas.giras_integrantes || [];
            const sources = item.programas.giras_fuentes || [];
            const myOverride = overrides.find(
              (o) => o.id_integrante === effectiveUserId,
            );
            if (myOverride) {
              if (
                ["baja", "no_convocado", "ausente"].includes(myOverride.estado)
              )
                return false;
              return true;
            }
            return sources.some(
              (s) =>
                (s.tipo === "ENSAMBLE" && myEnsembles.has(s.valor_id)) ||
                (s.tipo === "FAMILIA" && s.valor_texto === myFamily),
            );
          }
          return false;
        });

        const programStartMarkers = [];
        const processedPrograms = new Set();
        visibleEvents.forEach((evt) => {
          if (evt.programas && !processedPrograms.has(evt.programas.id)) {
            processedPrograms.add(evt.programas.id);
            if (evt.programas.fecha_desde) {
              programStartMarkers.push({
                id: `prog-start-${evt.programas.id}`,
                fecha: evt.programas.fecha_desde,
                hora_inicio: "00:00:00",
                isProgramMarker: true,
                programas: evt.programas,
                tipos_evento: { categorias_tipos_eventos: { id: -1 } },
              });
            }
          }
        });

        const allItems = [...visibleEvents, ...programStartMarkers].sort(
          (a, b) => {
            const dateA = new Date(
              `${a.fecha}T${a.hora_inicio || "00:00:00"}`,
            );
            const dateB = new Date(
              `${b.fecha}T${b.hora_inicio || "00:00:00"}`,
            );
            if (dateA < dateB) return -1;
            if (dateA > dateB) return 1;
            if (a.isProgramMarker && !b.isProgramMarker) return -1;
            if (!a.isProgramMarker && b.isProgramMarker) return 1;
            return 0;
          },
        );

        processCategories(visibleEvents);

        visibleEvents.forEach((evt) => {
          const custom = customMap.get(evt.id);
          if (custom) {
            if (custom.tipo === "invitado" || custom.tipo === "adicional") {
              evt.is_guest = true;
              evt.guest_note = custom.nota;
            } else if (custom.tipo === "ausente") evt.is_absent = true;
          }
        });

        if (
          visibleEvents.length > 0 &&
          effectiveUserId !== "guest-general"
        ) {
          const eventIds = visibleEvents.map((e) => e.id);
          const { data: attendanceData } = await supabase
            .from("eventos_asistencia")
            .select("id_evento, estado")
            .in("id_evento", eventIds)
            .eq("id_integrante", effectiveUserId);

          const attendanceMap = {};
          attendanceData?.forEach((a) => {
            attendanceMap[a.id_evento] = a.estado;
          });

          visibleEvents.forEach((evt) => {
            evt.mi_asistencia = attendanceMap[evt.id];
            const myTourRecord = evt.programas?.giras_integrantes?.find(
              (i) => i.id_integrante === effectiveUserId,
            );
            const myTourRole = myTourRecord?.rol || "musico";
            evt.is_convoked = checkIsConvoked(evt.convocados, myTourRole);
          });
        }

        if (signal.aborted) return;

        setItems(allItems);
        setFeriados(feriadosData.data || []);
        setRecentlyUpdatedEventIds(new Set());
        saveToCache(CACHE_KEY, allItems);
        setIsOfflineMode(false);
        setLastUpdate(new Date());
      } catch (err) {
        if (
          err.name === "AbortError" ||
          err.code === 20 ||
          err.message?.includes("AbortError") ||
          signal.aborted
        ) {
          return;
        }
        if (err.message === "OFFLINE_MODE") return;
        console.error("Error fetching agenda:", err);
        if (!isBackground) setIsOfflineMode(true);
      } finally {
        if (abortControllerRef.current === controller) {
          setLoading(false);
          setIsRefreshing(false);
        }
      }
    },
    [
      supabase,
      effectiveUserId,
      giraId,
      userProfile,
      monthsLimit,
      filterDateFrom,
      filterDateTo,
      checkIsConvoked,
      processCategories,
    ],
  );

  const mergeSingleEventFromRealtime = useCallback(
    async (payload) => {
      const eventType = payload.eventType;
      const id = eventType === "DELETE" ? payload.old?.id : payload.new?.id;
      if (!id) return;

      if (eventType === "DELETE") {
        setItems((prev) => prev.filter((item) => item.id !== id));
        setRecentlyUpdatedEventIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        return;
      }

      try {
        let query = supabase
          .from("eventos")
          .select(EVENT_SELECT)
          .eq("id", id)
          .single();
        if (giraId) query = query.eq("id_gira", giraId);
        const { data: evt, error } = await query;
        if (error || !evt) return;

        const [customRes, attendanceRes] = await Promise.all([
          supabase
            .from("eventos_asistencia_custom")
            .select("id_evento, tipo, nota")
            .eq("id_evento", id)
            .eq("id_integrante", effectiveUserId)
            .maybeSingle(),
          effectiveUserId !== "guest-general"
            ? supabase
                .from("eventos_asistencia")
                .select("id_evento, estado")
                .eq("id_evento", id)
                .eq("id_integrante", effectiveUserId)
                .maybeSingle()
            : Promise.resolve({ data: null }),
        ]);

        const custom = customRes.data;
        if (custom) {
          if (custom.tipo === "invitado" || custom.tipo === "adicional") {
            evt.is_guest = true;
            evt.guest_note = custom.nota;
          } else if (custom.tipo === "ausente") evt.is_absent = true;
        }
        if (attendanceRes.data) evt.mi_asistencia = attendanceRes.data.estado;
        const myTourRecord = evt.programas?.giras_integrantes?.find(
          (i) => i.id_integrante === effectiveUserId,
        );
        evt.is_convoked = checkIsConvoked(
          evt.convocados,
          myTourRecord?.rol || "musico",
        );

        setItems((prev) => {
          const without = prev.filter((item) => item.id !== id);
          const merged = [...without, evt].sort((a, b) => {
            const dateA = new Date(
              `${a.fecha}T${a.hora_inicio || "00:00:00"}`,
            );
            const dateB = new Date(
              `${b.fecha}T${b.hora_inicio || "00:00:00"}`,
            );
            if (dateA < dateB) return -1;
            if (dateA > dateB) return 1;
            if (a.isProgramMarker && !b.isProgramMarker) return -1;
            if (!a.isProgramMarker && b.isProgramMarker) return 1;
            return 0;
          });
          return merged;
        });
        setRecentlyUpdatedEventIds((prev) => new Set(prev).add(id));
        toast.success("Evento actualizado", {
          id: "event-updated",
          duration: 2000,
        });
      } catch (err) {
        console.warn("Error al fusionar evento en tiempo real:", err);
        toast.error("Error al actualizar evento");
      }
    },
    [supabase, giraId, effectiveUserId, checkIsConvoked],
  );

  mergeSingleEventFromRealtimeRef.current = mergeSingleEventFromRealtime;

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("agenda-updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "eventos" },
        (payload) => {
          if (refreshTimeoutRef.current)
            clearTimeout(refreshTimeoutRef.current);
          refreshTimeoutRef.current = setTimeout(() => {
            refreshTimeoutRef.current = null;
            mergeSingleEventFromRealtimeRef.current?.(payload);
          }, 500);
        },
      )
      .subscribe((status) => setRealtimeStatus(status));

    return () => {
      supabase.removeChannel(channel);
      if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, [user, giraId, supabase]);

  return {
    items,
    setItems,
    loading,
    setLoading,
    isRefreshing,
    setIsRefreshing,
    fetchAgenda,
    feriados,
    myTransportLogistics,
    toursWithRules,
    recentlyUpdatedEventIds,
    isOfflineMode,
    setIsOfflineMode,
    lastUpdate,
    setLastUpdate,
    realtimeStatus,
    processCategories,
  };
}
