import { useState, useEffect, useCallback, useMemo } from "react";
import { useGiraRoster } from "./useGiraRoster";
import {
  normalize,
  getMatchStrength,
  matchesRule,
  getCategoriaLogistica,
  resolveTransportAdmissionStatus,
  resolveRuleFieldInstant,
} from "../utils/giraUtils";
import {
  resolveLocalidadEfectivaViaticos,
  resolveLocalidadResidencia,
} from "../utils/integranteDomicilioViaticos";
import { fetchGiraSegmentosBundle } from "../services/giraSegmentosService";
import { resolvePersonIsLocal } from "../utils/giraTramos";

// --- 1. RE-EXPORTS PARA COMPATIBILIDAD ---
/** Incluye categoría EXTERNOS (ver `getCategoriaLogistica` en `giraUtils.js`). */
export {
  normalize,
  getMatchStrength,
  matchesRule,
  getCategoriaLogistica,
  resolveTransportAdmissionStatus,
  isPersonAdmittedToTransport,
  isPersonVetoedFromTransport,
  isAdmissionExclusionRule,
} from "../utils/giraUtils";

export const getPriorityValue = (scope) => {
  const s = normalize(scope);
  if (s === "persona" || s === "p") return 5;
  if (s === "categoria" || s === "instrumento") return 4;
  if (s === "localidad" || s === "l") return 3;
  if (s === "region" || s === "r") return 2;
  return 1;
};

// --- 2. CALCULADOR CORE (Integración Quirúrgica) ---

export const calculateLogisticsSummary = (
  roster,
  logisticsRules = [],
  admissionRules = [],
  routeRules = [],
  transportesFisicos = [],
  allRooms = [],
  allLocalities = [],
  allEvents = [],
  segments = [],
) => {
  if (!roster || roster.length === 0) return [];
  const transportMap = Object.fromEntries(
    (transportesFisicos || []).map((t) => [t.id, t]),
  );

  // --- HELPERS INTERNOS ---
  const getSourceCode = (r) => {
    if ((r.target_ids || []).length > 0) return "P";
    if ((r.target_categories || []).length > 0) return "C";
    if ((r.target_localities || []).length > 0) return "L";
    if ((r.target_regions || []).length > 0) return "R";
    const s = normalize(r.alcance);
    if (s === "persona") return "P";
    if (s === "categoria" || s === "instrumento") return "C";
    if (s === "localidad") return "L";
    if (s === "region") return "R";
    return "G";
  };

  const enrichEvent = (evt) => {
    if (!evt) return null;
    return {
      ...evt,
      date: evt.fecha,
      time: evt.hora_inicio || evt.hora,
      hora: evt.hora_inicio || evt.hora,
      nombre_localidad: evt?.locaciones?.localidades?.localidad || null,
    };
  };

  return roster.map((person) => {
    const pId = person.id || person.id_integrante;
    const habitacion =
      allRooms?.find((room) =>
        (room.id_integrantes_asignados || []).some(
          (id) => String(id) === String(pId),
        ),
      ) || null;

    let log = {
      checkin: {},
      checkout: {},
      comida_inicio: {},
      comida_fin: {},
      prov_des: "-",
      prov_alm: "-",
      prov_mer: "-",
      prov_cen: "-",
      transports: [],
      transports_src: "-",
    };

    // --- BLOQUE A: RESOLUCIÓN DE HITOS (por campo, localía al instante del hito) ---

    const resolve = (key, legacyDate, legacyTime, svcField, r, strength) => {
      const src = getSourceCode(r);
      const eventId = r[`id_evento_${key}`];
      const linkedEvent = eventId
        ? allEvents.find((e) => String(e.id) === String(eventId))
        : null;

      if (linkedEvent) {
        log[key] = {
          ...enrichEvent(linkedEvent),
          id_evento: linkedEvent.id,
          isLinked: true,
          src,
          ruleId: r.id,
          field: `id_evento_${key}`,
          svc: svcField ? r[svcField] : null,
          strength,
        };
      } else if (r[legacyDate]) {
        log[key] = {
          date: r[legacyDate],
          time: r[legacyTime],
          isLinked: false,
          src,
          ruleId: r.id,
          svc: svcField ? r[svcField] : null,
          descripcion: r[svcField] || "Manual",
          strength,
        };
      }
    };

    const applyFieldRules = (field, legacyDate, legacyTime, svcField) => {
      const rulesWithStrength = logisticsRules
        .map((r) => ({
          rule: r,
          strength: getMatchStrength(r, person, allLocalities, {
            segments,
            instant: resolveRuleFieldInstant(r, field, allEvents),
          }),
        }))
        .filter((item) => item.strength > 0)
        .sort((a, b) => a.strength - b.strength);

      rulesWithStrength.forEach(({ rule: r, strength }) => {
        resolve(field, legacyDate, legacyTime, svcField, r, strength);
      });
    };

    applyFieldRules("checkin", "fecha_checkin", "hora_checkin", "Check-In");
    applyFieldRules("checkout", "fecha_checkout", "hora_checkout", "Check-Out");
    applyFieldRules(
      "comida_inicio",
      "comida_inicio_fecha",
      "comida_inicio_servicio",
      "comida_inicio_servicio",
    );
    applyFieldRules(
      "comida_fin",
      "comida_fin_fecha",
      "comida_fin_servicio",
      "comida_fin_servicio",
    );

    const provRulesWithStrength = logisticsRules
      .map((r) => ({
        rule: r,
        strength: getMatchStrength(r, person, allLocalities, {
          segments,
          instant:
            resolveRuleFieldInstant(r, "checkin", allEvents) ||
            resolveRuleFieldInstant(r, "checkout", allEvents),
        }),
      }))
      .filter((item) => item.strength > 0)
      .sort((a, b) => a.strength - b.strength);

    provRulesWithStrength.forEach(({ rule: r }) => {
      if (r.prov_desayuno && r.prov_desayuno !== "-")
        log.prov_des = r.prov_desayuno;
      if (r.prov_almuerzo && r.prov_almuerzo !== "-")
        log.prov_alm = r.prov_almuerzo;
      if (r.prov_merienda && r.prov_merienda !== "-")
        log.prov_mer = r.prov_merienda;
      if (r.prov_cena && r.prov_cena !== "-") log.prov_cen = r.prov_cena;
    });

    // --- BLOQUE B: TRANSPORTE (con prioridad de reglas personales) ---
    const internalTids = new Set(
      (transportesFisicos || [])
        .filter(
          (t) =>
            String(t.categoria_logistica || "PASAJEROS").toUpperCase() ===
            "INTERNO",
        )
        .map((t) => Number(t.id))
        .filter((id) => !Number.isNaN(id)),
    );
    const allowedTids = new Set();
    const transportIdsForAdmission = new Set([
      ...internalTids,
      ...(admissionRules || [])
        .map((r) => Number(r.id_transporte_fisico))
        .filter((id) => !Number.isNaN(id)),
    ]);

    transportIdsForAdmission.forEach((tid) => {
      const status = resolveTransportAdmissionStatus(
        person,
        tid,
        admissionRules,
        allLocalities,
        { isInternalTransport: internalTids.has(tid) },
      );
      if (status === "admitted") allowedTids.add(tid);
    });

    // Reglas de trayecto único:
    // si un integrante tiene reglas de alcance Persona/Integrante para subida/bajada,
    // esas deben anular reglas de Localidad para ese mismo trayecto.
    allowedTids.forEach((tid) => {
      const myRoutes = (routeRules || []).filter(
        (r) =>
          String(r.id_transporte_fisico) === String(tid) &&
          matchesRule(r, person, allLocalities),
      );

      // Importante: la existencia de reglas "Persona" se evalúa
      // por transporte, no de forma global. Así evitamos que una
      // excepción en otro bus anule reglas de localidad aquí.
      const hasPersonalSubida = myRoutes.some(
        (r) =>
          ["persona", "integrante"].includes(normalize(r.alcance)) &&
          r.id_evento_subida,
      );
      const hasPersonalBajada = myRoutes.some(
        (r) =>
          ["persona", "integrante"].includes(normalize(r.alcance)) &&
          r.id_evento_bajada,
      );
      let sub = { prio: -1, data: null, scope: null },
        baj = { prio: -1, data: null, scope: null };
      let maxPrio = 0;

      myRoutes.forEach((r) => {
        const scope = normalize(r.alcance);
        const p = getMatchStrength(r, person, allLocalities);
        if (p > maxPrio) maxPrio = p;

        const allowSubida =
          !hasPersonalSubida || ["persona", "integrante"].includes(scope);
        const allowBajada =
          !hasPersonalBajada || ["persona", "integrante"].includes(scope);

        if (r.id_evento_subida && allowSubida && p >= sub.prio)
          sub = { prio: p, data: r.evento_subida, scope };
        if (r.id_evento_bajada && allowBajada && p >= baj.prio)
          baj = { prio: p, data: r.evento_bajada, scope };
      });

      log.transports.push({
        id: Number(tid),
        categoria_logistica:
          String(transportMap[tid]?.categoria_logistica || "PASAJEROS").toUpperCase(),
        nombre: transportMap[tid]?.transportes?.nombre || "Bus",
        detalle: transportMap[tid]?.detalle || "",
        patente: transportMap[tid]?.transportes?.patente || "",
        vehicleDocumentation: transportMap[tid]?.transportes?.documentacion || "",
        id_chofer: transportMap[tid]?.id_chofer || null,
        chofer: transportMap[tid]?.chofer || null,
        subidaId: sub.data?.id || null,
        bajadaId: baj.data?.id || null,
        subidaData: enrichEvent(sub.data),
        bajadaData: enrichEvent(baj.data),
        subidaScope: sub.scope,
        bajadaScope: baj.scope,
        priority: maxPrio,
      });
    });

    return { ...person, habitacion, ...log, logistics: log };
  });
};
// --- 3. HOOK useLogistics PRINCIPAL ---

export function useLogistics(supabase, gira, trigger = 0) {
  const {
    roster: baseRoster,
    loading: rosterLoading,
    refreshRoster,
  } = useGiraRoster(supabase, gira);
  const [db, setDb] = useState({
    log: [],
    adm: [],
    route: [],
    trans: [],
    locs: [],
    regs: [],
    sedes: [],
    events: [],
    segments: [],
    cortesCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const giraId = gira?.id;

  const fetchAll = useCallback(async () => {
    if (!giraId) return;
    setLoading(true);
    try {
      const [l, a, r, t, locs, regs, sedes, vDet, dCfg, evs, roomsData, segmentBundle] =
        await Promise.all([
          supabase
            .from("giras_logistica_reglas")
            .select("*")
            .eq("id_gira", giraId),
          supabase
            .from("giras_logistica_admision")
            .select("*")
            .eq("id_gira", giraId),
          supabase
            .from("giras_logistica_rutas")
            .select(
              `*, evento_subida:id_evento_subida(*, locaciones(*, localidades(*))), evento_bajada:id_evento_bajada(*, locaciones(*, localidades(*)))`,
            )
            .eq("id_gira", giraId),
          supabase
            .from("giras_transportes")
            .select(
              "*, transportes(nombre, patente, icon, documentacion), chofer:integrantes!giras_transportes_id_chofer_fkey(id, nombre, apellido, dni, link_carnet, link_dni_img)",
            )
            .eq("id_gira", giraId),
          supabase.from("localidades").select("id, localidad, id_region"),
          supabase.from("regiones").select("id, region"),
          supabase
            .from("giras_localidades")
            .select("id_localidad")
            .eq("id_gira", giraId),
          supabase
            .from("giras_viaticos_detalle")
            .select("id_integrante")
            .eq("id_gira", giraId)
            .not("fecha_ultima_exportacion", "is", null),
          supabase
            .from("giras_destaques_config")
            .select("id_localidad")
            .eq("id_gira", giraId)
            .not("fecha_ultima_exportacion", "is", null),
      supabase
        .from("eventos")
        .select(
          `*, locaciones(*, localidades(*)), tipos_evento(id, nombre, id_categoria)`,
        )
        .eq("id_gira", giraId)
        .eq("is_deleted", false),
          supabase
            .from("programas_hospedajes")
            .select("id")
            .eq("id_programa", giraId),
          fetchGiraSegmentosBundle(supabase, giraId, gira).catch(() => ({
            segments: [],
            cortesCount: 0,
          })),
        ]);

      // 1. Cálculo de destinos para giraStatsCalculator
      const destinations = new Set();
      (r.data || []).forEach((route) => {
        if (route.evento_subida?.locaciones?.id_localidad)
          destinations.add(Number(route.evento_subida.locaciones.id_localidad));
        if (route.evento_bajada?.locaciones?.id_localidad)
          destinations.add(Number(route.evento_bajada.locaciones.id_localidad));
      });

      // 2. Carga de habitaciones para LogisticsDashboard
      let fetchedRooms = [];
      const hospIds = (roomsData.data || []).map((h) => h.id);
      if (hospIds.length > 0) {
        const { data: rData } = await supabase
          .from("hospedaje_habitaciones")
          .select("*")
          .in("id_hospedaje", hospIds);
        fetchedRooms = rData || [];
      }

      // 3. Asistencia a comidas para computeMealsRaw
      const mealEvents = (evs.data || []).filter(
        (e) => e.tipos_evento?.id_categoria === 4,
      );
      let mealResps = [];
      if (mealEvents.length > 0) {
        const { data: att } = await supabase
          .from("eventos_asistencia")
          .select("id_integrante, id_evento, estado")
          .in(
            "id_evento",
            mealEvents.map((e) => e.id),
          );
        mealResps = att || [];
      }

      const sedeIdsList = (sedes.data || []).map((s) => Number(s.id_localidad));

      setDb({
        log: l.data || [],
        adm: a.data || [],
        route: r.data || [],
        trans: t.data || [],
        locs: locs.data || [],
        regs: regs.data || [],
        sedes: sedeIdsList,
        events: evs.data || [],
        rooms: fetchedRooms,
        viaticosMeta: {
          exportedPeopleIds: (vDet.data || []).map((x) => x.id_integrante),
          exportedLocationIds: (dCfg.data || []).map((x) => x.id_localidad),
          tourLocationIds: Array.from(destinations),
          sedeIds: sedeIdsList,
        },
        mealsMeta: { events: mealEvents, responses: mealResps },
        segments: segmentBundle?.segments ?? [],
        cortesCount: segmentBundle?.cortesCount ?? 0,
      });
    } catch (e) {
      console.error("useLogistics Error:", e);
    }
    setLoading(false);
  }, [supabase, giraId]);
  useEffect(() => {
    fetchAll();
  }, [fetchAll, trigger]);

  const summary = useMemo(() => {
    const rosterEnriquecido = (baseRoster || []).map((p) => {
      const integrante = p.integrantes || p.integrante || p;
      const locViaticos = resolveLocalidadEfectivaViaticos(integrante);
      const locResidencia = resolveLocalidadResidencia(integrante);

      const locId =
        locViaticos.id != null && locViaticos.id !== ""
          ? String(locViaticos.id)
          : "";
      const locObj =
        db.locs.find((l) => String(l.id) === locId) || locViaticos.objeto;

      const residenciaId =
        locResidencia.id != null && locResidencia.id !== ""
          ? String(locResidencia.id)
          : "";
      const residenciaObj =
        db.locs.find((l) => String(l.id) === residenciaId) ||
        locResidencia.objeto;

      // Local de gira: segmentos dinámicos o sedes planas (0 cortes).
      const tourLocSet = new Set(db.sedes.map(String));
      const isLocal = resolvePersonIsLocal(p, {
        segments: db.segments,
        tourLocSet,
        cortesCount: db.cortesCount,
      });

      return {
        ...p,
        id_localidad: locId,
        localidades: locObj || p.localidades || null,
        id_localidad_residencia: residenciaId,
        localidades_residencia: residenciaObj || p._loc_residencia || null,
        id_region_residencia: locResidencia.regionId,
        is_local: isLocal,
      };
    });

    // Pasamos db.rooms (antes iba []) para que se calculen las habitaciones asignadas
    const res = calculateLogisticsSummary(
      rosterEnriquecido,
      db.log,
      db.adm,
      db.route,
      db.trans,
      db.rooms,
      db.locs,
      db.events,
      db.segments,
    );

    if (res && Array.isArray(res)) {
      // Adjuntamos la metadata al array para los motores de Dashboard y Stats
      res.viaticosMeta = db.viaticosMeta;
      res.mealsMeta = db.mealsMeta;
      res.segments = db.segments;
      res.cortesCount = db.cortesCount;
    }
    return res;
  }, [baseRoster, db]);

  return {
    summary: summary || [],
    roster: baseRoster,
    rooms: db.rooms, // Restaurado para el Dashboard
    logisticsRules: db.log,
    admissionRules: db.adm,
    routeRules: db.route,
    transportes: db.trans,
    allLocalities: db.locs,
    allRegions: db.regs,
    allEvents: db.events,
    sedeIds: db.sedes,
    segments: db.segments,
    cortesCount: db.cortesCount,
    loading: rosterLoading || loading,
    refresh: () => {
      refreshRoster();
      fetchAll();
    },
    helpers: { matchesRule },
  };
}
