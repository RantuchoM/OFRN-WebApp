import { useState, useEffect, useCallback, useMemo } from "react";
import { useGiraRoster } from "./useGiraRoster";

// --- 1. HELPERS (Manteniendo tu lógica Base/Legacy) ---

export const normalize = (str) => (str || "").toLowerCase().trim();

export const getPriorityValue = (scope) => {
  const s = normalize(scope);
  if (s === "persona" || s === "p") return 5;
  if (s === "categoria" || s === "instrumento") return 4;
  if (s === "localidad" || s === "l") return 3;
  if (s === "region" || s === "r") return 2;
  return 1;
};

export const getCategoriaLogistica = (person) => {
  const rol = normalize(person?.rol_gira || person?.rol || "musico");
  if (rol === "solista") return "SOLISTAS";
  if (rol === "director") return "DIRECTORES";
  if (rol === "produccion") return "PRODUCCION";
  if (rol === "staff") return "STAFF";
  return person?.is_local ? "LOCALES" : "NO_LOCALES";
};

export const matchesRule = (rule, person, allLocalities = []) => {
  if (!rule || !person) return false;
  const scope = normalize(rule.alcance);
  const pId = String(person.id || person.id_integrante);
  const pLoc = person.id_localidad ? String(person.id_localidad) : "";
  const pRole = normalize(person.rol_gira || person.rol || "musico");
  const pCondicion = normalize(person.condicion || "");

  const locInfo = allLocalities.find((l) => String(l.id) === pLoc);
  const pReg = String(
    person.id_region ||
      person.localidades?.id_region ||
      locInfo?.id_region ||
      "",
  );

  const isTransportRule = "id_transporte_fisico" in rule;
  if (isTransportRule && ["general", "region", "localidad"].includes(scope)) {
    const isStaff = ["produccion", "staff", "director", "chofer"].includes(
      pRole,
    );
    if (isStaff || pCondicion !== "estable") return false;
  }

  if ((rule.target_ids || []).map(String).includes(pId)) return true;
  if ((rule.target_regions || []).map(String).includes(pReg)) return true;
  if ((rule.target_localities || []).map(String).includes(pLoc)) return true;
  if ((rule.target_categories || []).includes(getCategoriaLogistica(person)))
    return true;

  if (scope === "general") return true;
  if (scope === "persona" && String(rule.id_integrante) === pId) return true;
  if (scope === "region" && String(rule.id_region) === pReg) return true;
  if (scope === "localidad" && String(rule.id_localidad) === pLoc) return true;
  if (scope === "categoria" || scope === "instrumento") {
    const family = person.instrumentos?.familia;
    return normalize(rule.instrumento_familia) === normalize(family);
  }
  return false;
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
  allEvents = [], // Nuevo argumento necesario
) => {
  if (!roster || roster.length === 0) return [];
  const transportMap = Object.fromEntries(
    (transportesFisicos || []).map((t) => [t.id, t]),
  );

  const getSourceCode = (r) => {
    // 1. Prioridad máxima: Si hay IDs de personas específicas
    if ((r.target_ids || []).length > 0) return "P";

    // 2. Si hay categorías seleccionadas
    if ((r.target_categories || []).length > 0) return "C";

    // 3. Si hay localidades seleccionadas
    if ((r.target_localities || []).length > 0) return "L";

    // 4. Si hay regiones seleccionadas
    if ((r.target_regions || []).length > 0) return "R";

    // 5. Fallback a la lógica de alcance (Legacy)
    const s = normalize(r.alcance);
    if (s === "persona") return "P";
    if (s === "categoria" || s === "instrumento") return "C";
    if (s === "localidad") return "L";
    if (s === "region") return "R";

    return "G"; // General por defecto
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
      comida_fin: {}, // Inicializados como objetos
      prov_des: "-",
      prov_alm: "-",
      prov_mer: "-",
      prov_cen: "-",
      transports: [],
      transports_src: "-",
    };

    // A. Resolución de Hitos (Modificado para exportar OBJETOS completos)
    const sortedLogRules = [...logisticsRules].sort(
      (a, b) => getPriorityValue(a.alcance) - getPriorityValue(b.alcance),
    );

    sortedLogRules.forEach((r) => {
      if (matchesRule(r, person, allLocalities)) {
        const src = getSourceCode(r);

        const resolve = (key, legacyDate, legacyTime, svcField) => {
          const eventId = r[`id_evento_${key}`];
          const linkedEvent = eventId
            ? allEvents.find((e) => String(e.id) === String(eventId))
            : null;

          if (linkedEvent) {
            log[key] = {
              ...enrichEvent(linkedEvent),
              id_evento: linkedEvent.id, // Aseguramos que tenga esta propiedad
              isLinked: true,
              src,
              ruleId: r.id, // <--- CRÍTICO PARA DESVINCULAR
              field: `id_evento_${key}`, // <--- CRÍTICO PARA DESVINCULAR
              svc: svcField ? r[svcField] : null,
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
            };
          }
        };

        resolve("checkin", "fecha_checkin", "hora_checkin", "Check-In");
        resolve("checkout", "fecha_checkout", "hora_checkout", "Check-Out");
        resolve(
          "comida_inicio",
          "comida_inicio_fecha",
          "comida_inicio_servicio",
          r.comida_inicio_servicio || "Inicio",
        );
        resolve(
          "comida_fin",
          "comida_fin_fecha",
          "comida_fin_servicio",
          r.comida_fin_servicio || "Fin",
        );

        if (r.comida_inicio_servicio)
          log.comida_inicio.svc = r.comida_inicio_servicio;
        if (r.comida_fin_servicio) log.comida_fin.svc = r.comida_fin_servicio;

        if (r.prov_desayuno && r.prov_desayuno !== "-")
          log.prov_des = r.prov_desayuno;
        if (r.prov_almuerzo && r.prov_almuerzo !== "-")
          log.prov_alm = r.prov_almuerzo;
        if (r.prov_merienda && r.prov_merienda !== "-")
          log.prov_mer = r.prov_merienda;
        if (r.prov_cena && r.prov_cena !== "-") log.prov_cen = r.prov_cena;
      }
    });

    // B. Transporte (MANTENIENDO TU LÓGICA BASE INTACTA)
    const allowedTids = new Set();
    (admissionRules || []).forEach((r) => {
      if (matchesRule(r, person, allLocalities)) {
        if (r.tipo === "EXCLUSION" || r.es_exclusion)
          allowedTids.delete(r.id_transporte_fisico);
        else allowedTids.add(r.id_transporte_fisico);
      }
    });

    allowedTids.forEach((tid) => {
      const myRoutes = (routeRules || []).filter(
        (r) =>
          String(r.id_transporte_fisico) === String(tid) &&
          matchesRule(r, person, allLocalities),
      );
      let sub = { prio: -1, data: null },
        baj = { prio: -1, data: null };
      let maxPrio = 0;

      myRoutes.forEach((r) => {
        const p = getPriorityValue(r.alcance);
        if (p > maxPrio) maxPrio = p;
        if (r.id_evento_subida && p >= sub.prio)
          sub = { prio: p, data: r.evento_subida };
        if (r.id_evento_bajada && p >= baj.prio)
          baj = { prio: p, data: r.evento_bajada };
      });

      log.transports.push({
        id: Number(tid),
        nombre: transportMap[tid]?.transportes?.nombre || "Bus",
        detalle: transportMap[tid]?.detalle || "",
        subidaId: sub.data?.id || null,
        bajadaId: baj.data?.id || null,
        subidaData: enrichEvent(sub.data),
        bajadaData: enrichEvent(baj.data),
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
  });
  const [loading, setLoading] = useState(true);
  const giraId = gira?.id;

  const fetchAll = useCallback(async () => {
    if (!giraId) return;
    setLoading(true);
    try {
      const [l, a, r, t, locs, regs, sedes, vDet, dCfg, evs, roomsData] =
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
            .select("*, transportes(nombre)")
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
            .eq("id_gira", giraId),
          supabase
            .from("programas_hospedajes")
            .select("id")
            .eq("id_programa", giraId),
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
      // 1. Detección robusta de Localidad (ID y Objeto)
      const rawLocId =
        p.id_localidad ||
        p.integrante?.id_localidad ||
        p.integrantes?.id_localidad ||
        "";
      const locId = rawLocId ? String(rawLocId) : "";
      const locObj = db.locs.find((l) => String(l.id) === locId);

      // 2. is_local contra las sedes (comparando como números para el Dashboard)
      const isLocal = db.sedes.includes(Number(locId)) && locId !== "";

      return {
        ...p,
        id_localidad: locId,
        localidades: locObj,
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
    );

    if (res && Array.isArray(res)) {
      // Adjuntamos la metadata al array para los motores de Dashboard y Stats
      res.viaticosMeta = db.viaticosMeta;
      res.mealsMeta = db.mealsMeta;
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
    loading: rosterLoading || loading,
    refresh: () => {
      refreshRoster();
      fetchAll();
    },
    helpers: { matchesRule },
  };
}
