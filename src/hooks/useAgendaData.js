import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { startOfDay, endOfDay, addMonths, parseISO } from "date-fns";
import { toast } from "sonner";
import {
  getTodayDateStringLocal,
  getAgendaQueryFromDateLocal,
} from "../utils/dates";
import { calculateLogisticsSummary } from "./useLogistics";
import { membershipActiveOnProgramDate } from "../utils/ensembleMembership";
import { isIntegranteConvocadoAEnsayo } from "../utils/ensayoCheckinBanner";
import { getEventProgramIds } from "../utils/rehearsalProgramas";
import {
  resolveLocalidadEfectivaViaticos,
  resolveLocalidadResidencia,
} from "../utils/integranteDomicilioViaticos";

/** tipos_evento.id — Ensayo de ensamble (independiente o en programa). */
const ID_TIPO_ENSAYO_ENSAMBLE = 13;

const EVENT_SELECT = `
    id, fecha, hora_inicio, hora_fin, tecnica, descripcion, observaciones_internas, convocados, id_tipo_evento, id_locacion, id_gira, id_gira_transporte, id_repertorio, visible_agenda, updated_at, is_deleted, deleted_at, id_estado_venue, es_didactico,
    giras_transportes ( id, detalle, transportes ( nombre, color, icon ) ),
    tipos_evento ( id, nombre, color, categorias_tipos_eventos (id, nombre) ),
    locaciones ( id, nombre, direccion, link_mapa, localidades (localidad) ),
    programas ( id, nombre_gira, nomenclador, google_drive_folder_id, mes_letra, fecha_desde, fecha_hasta, tipo, zona, estado, fecha_confirmacion_limite, giras_fuentes(tipo, valor_id, valor_texto), giras_integrantes(id_integrante, estado, rol) ),
    eventos_programas_asociados ( programas ( id, nombre_gira, google_drive_folder_id, mes_letra, nomenclador, estado, tipo ) ),
    eventos_ensambles ( id_ensamble, ensambles ( id, ensamble ) ),
    eventos_grupos ( id_grupo, giras_grupos ( id, nombre, color ) )
  `;

function normalizeEstadoGira(str) {
  return (str || "").toLowerCase().trim();
}

/** Evento sin grupos → visible; con grupos → solo si el usuario pertenece a alguno (o skipFilter). */
function passesEventoGruposFilter(item, myGrupoIds, skipFilter) {
  if (skipFilter) return true;
  const grupos = item?.eventos_grupos || [];
  if (grupos.length === 0) return true;
  return grupos.some((eg) => {
    const gid = Number(eg.id_grupo ?? eg.giras_grupos?.id);
    return Number.isFinite(gid) && myGrupoIds.has(gid);
  });
}

/**
 * Membresías de grupos del usuario, excluyendo giras donde está ausente/baja/no_convocado.
 */
function buildMyGrupoIdsFromRows(membershipRows, eventsData, effectiveUserId) {
  const blockedGiras = new Set();
  (eventsData || []).forEach((e) => {
    const members = e.programas?.giras_integrantes || [];
    const myRecord = members.find(
      (i) => String(i.id_integrante) === String(effectiveUserId),
    );
    if (
      myRecord &&
      ["ausente", "baja", "no_convocado"].includes(
        normalizeEstadoGira(myRecord.estado),
      )
    ) {
      const gid = e.id_gira ?? e.programas?.id;
      if (gid != null) blockedGiras.add(String(gid));
    }
  });

  const myGrupoIds = new Set();
  (membershipRows || []).forEach((row) => {
    const giraOfGrupo = row.giras_grupos?.id_gira;
    if (giraOfGrupo != null && blockedGiras.has(String(giraOfGrupo))) return;
    const gid = Number(row.id_grupo);
    if (Number.isFinite(gid)) myGrupoIds.add(gid);
  });
  return myGrupoIds;
}

function matchesGiraFuente(sources, userProfile, ensamblesRows, progFd) {
  if (!sources?.length) return false;
  const myFamilySrc = userProfile?.instrumentos?.familia;
  return sources.some((src) => {
    if (src.tipo === "ENSAMBLE") {
      return (ensamblesRows || []).some(
        (ie) =>
          Number(ie.id_ensamble) === Number(src.valor_id) &&
          membershipActiveOnProgramDate(ie, progFd),
      );
    }
    if (src.tipo === "FAMILIA" && src.valor_texto === myFamilySrc) return true;
    return false;
  });
}

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

export function getAgendaCacheKey(
  effectiveUserId,
  giraId,
  includeAssociatedEnsembleRehearsals = false,
) {
  const scope = giraId
    ? `${giraId}${includeAssociatedEnsembleRehearsals ? "_ensReh" : ""}`
    : "general";
  return `agenda_cache_${effectiveUserId}_${scope}_v8`;
}

function eventBelongsToProgramAgenda(evt, giraId, includeAssociatedEnsembleRehearsals) {
  if (!evt || giraId == null) return true;
  if (String(evt.id_gira) === String(giraId)) return true;
  if (
    includeAssociatedEnsembleRehearsals &&
    Number(evt.id_tipo_evento) === ID_TIPO_ENSAYO_ENSAMBLE &&
    getEventProgramIds(evt).has(Number(giraId))
  ) {
    return true;
  }
  return false;
}

async function fetchAssociatedEnsembleRehearsals(
  supabase,
  giraId,
  existingEventIds,
  { signal, includeDeletedBeyond24h },
) {
  const { data: links, error: linksError } = await supabase
    .from("eventos_programas_asociados")
    .select("id_evento")
    .eq("id_programa", giraId)
    .abortSignal(signal);

  if (linksError) throw linksError;

  const candidateIds = [
    ...new Set((links || []).map((row) => row.id_evento).filter(Boolean)),
  ].filter((id) => !existingEventIds.has(id));

  if (candidateIds.length === 0) return [];

  const timestamp24hAgo = new Date(
    Date.now() - 24 * 60 * 60 * 1000,
  ).toISOString();

  let query = supabase
    .from("eventos")
    .select(EVENT_SELECT)
    .in("id", candidateIds)
    .eq("id_tipo_evento", ID_TIPO_ENSAYO_ENSAMBLE)
    .abortSignal(signal);

  if (!includeDeletedBeyond24h) {
    query = query.or(
      `is_deleted.eq.false,is_deleted.is.null,and(is_deleted.eq.true,deleted_at.gt.${timestamp24hAgo})`,
    );
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

/**
 * Hook de datos de la agenda: fetch, caché, realtime y categorías.
 * Recibe filtros de fecha para armar el rango de la query (agenda general).
 * Precarga ~1 mes de pasado; el “Desde” visual recorta en cliente hasta que el
 * usuario pida más atrás que esa ventana (entonces se amplía el gte de la query).
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
 * @param {boolean} [opts.includeDeletedBeyond24h=false] - si true, incluye todos los eventos con is_deleted, incluso más antiguos de 24h
 * @param {boolean} [opts.includeAssociatedEnsembleRehearsals=false] - agenda de programa Ensamble: incluye ensayos de ensamble vinculados por eventos_programas_asociados
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
  includeDeletedBeyond24h = false,
  includeAssociatedEnsembleRehearsals = false,
}) {
  /**
   * Ventana de query general: ~1 mes atrás precargado; solo se mueve más atrás
   * cuando filterDateFrom lo pide. Valor estable en string → evita refetch al
   * retroceder semanas dentro de la ventana.
   */
  const queryDateFrom = useMemo(() => {
    if (giraId) return null;
    return getAgendaQueryFromDateLocal(filterDateFrom);
  }, [giraId, filterDateFrom]);

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
  const locallyMutatedIdsRef = useRef(new Set());
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
      includeDeletedBeyond24h,
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

      const CACHE_KEY = getAgendaCacheKey(
        effectiveUserId,
        giraId,
        includeAssociatedEnsembleRehearsals,
      );

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
          // Precarga pasado (preload) y más atrás solo si el filtro visual lo pide.
          start = startOfDay(parseISO(queryDateFrom)).toISOString();
          end = filterDateTo
            ? endOfDay(parseISO(filterDateTo)).toISOString()
            : addMonths(new Date(), monthsLimit).toISOString();
        }

        const rawProfileRole = userProfile?.rol_sistema;
        const profileRole = (() => {
          if (rawProfileRole == null) return "musico";
          if (Array.isArray(rawProfileRole)) return rawProfileRole[0]?.toLowerCase?.()?.trim() || "musico";
          return String(rawProfileRole).toLowerCase().trim() || "musico";
        })();
        let myEnsembles = new Set();
        let myFamily = null;
        if (userProfile) {
          userProfile.integrantes_ensambles?.forEach((ie) => {
            if (membershipActiveOnProgramDate(ie, todayStr)) {
              myEnsembles.add(ie.id_ensamble);
            }
          });
          myFamily = userProfile.instrumentos?.familia;
        }

        const [customAttendance, ensembleEvents, feriadosData, myGruposRes] =
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
            effectiveUserId && effectiveUserId !== "guest-general"
              ? supabase
                  .from("giras_grupos_integrantes")
                  .select("id_grupo, giras_grupos ( id, id_gira )")
                  .eq("id_integrante", effectiveUserId)
              : Promise.resolve({ data: [] }),
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

        let query = supabase.from("eventos").select(EVENT_SELECT);

        if (!includeDeletedBeyond24h) {
          query = query.or(
            `is_deleted.eq.false,is_deleted.is.null,and(is_deleted.eq.true,deleted_at.gt.${timestamp24hAgo})`,
          );
        }

        query = query
          .order("fecha", { ascending: true })
          .order("hora_inicio", { ascending: true })
          .abortSignal(signal);

        if (giraId) query = query.eq("id_gira", giraId);
        else query = query.gte("fecha", start).lte("fecha", end);

        const { data: eventsDataRaw, error } = await query;
        if (error) {
          if (
            error.code === "AbortError" ||
            error.message?.includes("AbortError") ||
            signal.aborted
          )
            return;
          throw error;
        }

        let eventsData = eventsDataRaw || [];
        if (giraId && includeAssociatedEnsembleRehearsals) {
          const existingIds = new Set(eventsData.map((e) => e.id));
          const associatedRehearsals = await fetchAssociatedEnsembleRehearsals(
            supabase,
            giraId,
            existingIds,
            { signal, includeDeletedBeyond24h },
          );
          if (signal.aborted) return;
          if (associatedRehearsals.length > 0) {
            eventsData = [...eventsData, ...associatedRehearsals];
          }
        }

        const activeTourIds = new Set();
        eventsData?.forEach((e) => {
          if (e.id_gira) activeTourIds.add(e.id_gira);
        });

        let logisticsMap = {};
        const foundRuleTours = new Set();

        if (activeTourIds.size > 0 && userProfile) {
          let ensamblesRows = userProfile.integrantes_ensambles;
          if (!ensamblesRows?.length && effectiveUserId !== "guest-general") {
            const { data: ieData } = await supabase
              .from("integrantes_ensambles")
              .select("id_ensamble, fecha_desde, fecha_hasta")
              .eq("id_integrante", effectiveUserId);
            ensamblesRows = ieData || [];
          }

          const [admRes, routesRes, transRes, locsRes] = await Promise.all([
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
              .select("id, id_gira, detalle, categoria_logistica, transportes(nombre)")
              .in("id_gira", Array.from(activeTourIds)),
            supabase.from("localidades").select("id, localidad, id_region"),
          ]);

          const admissionData = admRes.data || [];
          const routesData = routesRes.data || [];
          const transportsData = transRes.data || [];
          const allLocalities = locsRes.data || [];

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

            const profileWithResidencia = {
              ...userProfile,
              _loc_residencia:
                userProfile.datos_residencia || userProfile._loc_residencia,
              residencia:
                userProfile.datos_residencia || userProfile.residencia,
            };
            const locViaticos = resolveLocalidadEfectivaViaticos(
              profileWithResidencia,
            );
            const locResidencia = resolveLocalidadResidencia(
              profileWithResidencia,
            );
            const locId =
              locViaticos.id != null && locViaticos.id !== ""
                ? String(locViaticos.id)
                : userProfile.id_localidad != null &&
                    userProfile.id_localidad !== ""
                  ? String(userProfile.id_localidad)
                  : "";
            const locObj =
              allLocalities.find((l) => String(l.id) === locId) ||
              locViaticos.objeto;
            // Nunca setear id_localidad_residencia en "" (rompe resolvePersonTerritoryIds:
            // `??` no cae a id_localidad y las reglas por Viedma/etc. dejan de matchear).
            const profileResidenciaFallback =
              userProfile.id_localidad != null &&
              userProfile.id_localidad !== ""
                ? String(userProfile.id_localidad)
                : "";
            const residenciaId =
              locResidencia.id != null && locResidencia.id !== ""
                ? String(locResidencia.id)
                : profileResidenciaFallback;
            const residenciaObj =
              (residenciaId
                ? allLocalities.find((l) => String(l.id) === residenciaId)
                : null) ||
              locResidencia.objeto ||
              userProfile.datos_residencia ||
              userProfile.residencia ||
              null;

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
                const progFd =
                  sampleEvt.programas.fecha_desde?.slice?.(0, 10) ||
                  String(sampleEvt.programas.fecha_desde || "").slice(0, 10) ||
                  todayStr;
                const matchesSource = matchesGiraFuente(
                  sources,
                  userProfile,
                  ensamblesRows,
                  progFd,
                );
                // Agenda de gira: el usuario ya está en esa vista; calcular logística
                // salvo ausente explícito. En agenda general, exigir roster o fuente.
                if (!giraId && !myRecord && !matchesSource) return;
              }

              const mockPerson = {
                ...profileWithResidencia,
                id: userProfile.id ?? effectiveUserId,
                condicion: userProfile.condicion,
                id_localidad: locId || residenciaId,
                localidades: locObj || {
                  id: locId || residenciaId,
                  id_region:
                    locResidencia.regionId ??
                    residenciaObj?.id_region ??
                    null,
                },
                ...(residenciaId
                  ? { id_localidad_residencia: residenciaId }
                  : {}),
                localidades_residencia: residenciaObj,
                id_region_residencia:
                  locResidencia.regionId ??
                  residenciaObj?.id_region ??
                  null,
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
                allLocalities,
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

        const isManagementProfile = [
          "admin",
          "editor",
          "coord_general",
          "director",
        ].includes(profileRole);
        const skipGrupoFilter =
          isManagementProfile || Boolean(isEditor) || Boolean(isManagement);

        const myGrupoIds = buildMyGrupoIdsFromRows(
          myGruposRes?.data,
          eventsData,
          effectiveUserId,
        );

        const visibleEvents = (eventsData || []).filter((item) => {
          if (!item.fecha) return false;

          // Reglas especiales para eliminados:
          if (item.is_deleted === true) {
            // Si no hay timestamp, lo mostramos igualmente (caso borde).
            if (!item.deleted_at) {
              // Siempre visible para todos dentro de las 24 h (no sabemos, así que lo mostramos)
              return includeDeletedBeyond24h || true;
            }

            const deletedAt = new Date(item.deleted_at).getTime();
            const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
            const isWithin24h = deletedAt >= twentyFourHoursAgo;

            // 1) Todos ven los eliminados dentro de las 24 h, sin importar convocatoria.
            if (isWithin24h) return true;

            // 2) Solo admins con el filtro activo ven los eliminados más antiguos.
            if (includeDeletedBeyond24h) return true;

            // 3) Resto: eliminados viejos, ocultos.
            return false;
          }

          // Agenda de gira: todos los eventos de la gira, salvo filtro por grupos.
          if (giraId) {
            return passesEventoGruposFilter(
              item,
              myGrupoIds,
              skipGrupoFilter,
            );
          }

          if (isManagementProfile) return true;
          if (customMap.has(item.id)) {
            return passesEventoGruposFilter(
              item,
              myGrupoIds,
              skipGrupoFilter,
            );
          }
          if (myEnsembleEventIds.has(item.id)) {
            return passesEventoGruposFilter(
              item,
              myGrupoIds,
              skipGrupoFilter,
            );
          }
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
              return passesEventoGruposFilter(
                item,
                myGrupoIds,
                skipGrupoFilter,
              );
            }
            const matchesFuente = sources.some(
              (s) =>
                (s.tipo === "ENSAMBLE" && myEnsembles.has(s.valor_id)) ||
                (s.tipo === "FAMILIA" && s.valor_texto === myFamily),
            );
            if (!matchesFuente) return false;
            return passesEventoGruposFilter(
              item,
              myGrupoIds,
              skipGrupoFilter,
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

        const integrantesEnsambles = userProfile?.integrantes_ensambles || [];
        visibleEvents.forEach((evt) => {
          const custom = customMap.get(evt.id);
          if (custom) {
            if (custom.tipo === "invitado" || custom.tipo === "adicional") {
              evt.is_guest = true;
              evt.guest_note = custom.nota;
            } else if (custom.tipo === "ausente") evt.is_absent = true;
          }
          if (Number(evt.id_tipo_evento) === ID_TIPO_ENSAYO_ENSAMBLE) {
            evt.is_ensayo_convoked = isIntegranteConvocadoAEnsayo(
              evt,
              custom,
              integrantesEnsambles,
            );
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
            const estadoTour = normalizeEstadoGira(myTourRecord?.estado);
            const noParticipaEnGira = [
              "baja",
              "no_convocado",
              "ausente",
            ].includes(estadoTour);
            const convocadosOk = noParticipaEnGira
              ? false
              : checkIsConvoked(evt.convocados, myTourRole);
            // is_convoked también exige pertenecer a algún grupo del evento (AND).
            evt.is_convoked =
              convocadosOk &&
              passesEventoGruposFilter(evt, myGrupoIds, false);
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
      queryDateFrom,
      filterDateTo,
      checkIsConvoked,
      processCategories,
      includeDeletedBeyond24h,
      includeAssociatedEnsembleRehearsals,
      isEditor,
      isManagement,
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
        const { data: evt, error } = await supabase
          .from("eventos")
          .select(EVENT_SELECT)
          .eq("id", id)
          .single();
        if (error || !evt) return;
        if (
          giraId &&
          !eventBelongsToProgramAgenda(
            evt,
            giraId,
            includeAssociatedEnsembleRehearsals,
          )
        ) {
          setItems((prev) => prev.filter((item) => item.id !== id));
          return;
        }

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
        if (Number(evt.id_tipo_evento) === ID_TIPO_ENSAYO_ENSAMBLE) {
          evt.is_ensayo_convoked = isIntegranteConvocadoAEnsayo(
            evt,
            custom,
            userProfile?.integrantes_ensambles || [],
          );
        }
        if (attendanceRes.data) evt.mi_asistencia = attendanceRes.data.estado;
        const myTourRecord = evt.programas?.giras_integrantes?.find(
          (i) => i.id_integrante === effectiveUserId,
        );
        const myTourRole = myTourRecord?.rol || "musico";
        const estadoTour = normalizeEstadoGira(myTourRecord?.estado);
        const noParticipaEnGira = [
          "baja",
          "no_convocado",
          "ausente",
        ].includes(estadoTour);
        evt.is_convoked = noParticipaEnGira
          ? false
          : checkIsConvoked(evt.convocados, myTourRole);

        const rawProfileRoleRt = userProfile?.rol_sistema;
        const profileRoleRt = (() => {
          if (rawProfileRoleRt == null) return "musico";
          if (Array.isArray(rawProfileRoleRt))
            return (
              rawProfileRoleRt[0]?.toLowerCase?.()?.trim() || "musico"
            );
          return String(rawProfileRoleRt).toLowerCase().trim() || "musico";
        })();
        const skipGrupoFilterRt =
          ["admin", "editor", "coord_general", "director"].includes(
            profileRoleRt,
          ) ||
          Boolean(isEditor) ||
          Boolean(isManagement);

        let myGrupoIdsRt = new Set();
        if ((evt.eventos_grupos || []).length > 0) {
          const { data: memb } = await supabase
            .from("giras_grupos_integrantes")
            .select("id_grupo, giras_grupos ( id, id_gira )")
            .eq("id_integrante", effectiveUserId);
          myGrupoIdsRt = buildMyGrupoIdsFromRows(
            memb,
            [evt],
            effectiveUserId,
          );
        }
        if (!noParticipaEnGira) {
          evt.is_convoked =
            checkIsConvoked(evt.convocados, myTourRole) &&
            passesEventoGruposFilter(evt, myGrupoIdsRt, false);
        }

        if (!skipGrupoFilterRt && (evt.eventos_grupos || []).length > 0) {
          if (!passesEventoGruposFilter(evt, myGrupoIdsRt, false)) {
            setItems((prev) => prev.filter((item) => item.id !== id));
            return;
          }
        }

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
        const isOwnMutation = locallyMutatedIdsRef.current.has(id);
        locallyMutatedIdsRef.current.delete(id);
        if (!isOwnMutation) {
          toast.success("Evento actualizado", {
            id: "event-updated",
            duration: 2000,
          });
        }
      } catch (err) {
        console.warn("Error al fusionar evento en tiempo real:", err);
        toast.error("Error al actualizar evento");
      }
    },
    [
      supabase,
      giraId,
      effectiveUserId,
      checkIsConvoked,
      includeAssociatedEnsembleRehearsals,
      userProfile,
      isEditor,
      isManagement,
    ],
  );

  mergeSingleEventFromRealtimeRef.current = mergeSingleEventFromRealtime;

  const markLocalEventMutation = useCallback((id) => {
    if (id != null) locallyMutatedIdsRef.current.add(id);
  }, []);

  const refreshEventById = useCallback(
    (id, { eventType = "UPDATE" } = {}) =>
      mergeSingleEventFromRealtime({
        eventType,
        new: eventType === "DELETE" ? undefined : { id },
        old: eventType === "DELETE" ? { id } : undefined,
      }),
    [mergeSingleEventFromRealtime],
  );

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
    markLocalEventMutation,
    refreshEventById,
  };
}
