import { useState, useEffect, useCallback, useMemo } from "react";
import { useGiraRoster } from "./useGiraRoster";

// --- HELPERS (Sin cambios) ---
export const normalize = (str) => (str || "").toLowerCase().trim();

export const getPriorityValue = (scope) => {
  const s = normalize(scope);
  if (s === "persona") return 5;
  if (s === "categoria" || s === "instrumento") return 4;
  if (s === "localidad") return 3;
  if (s === "region") return 2;
  return 1;
};

export const matchesRule = (rule, person) => {
  const scope = normalize(rule.alcance);
  const pId = String(person.id || person.id_integrante); 

  if (scope === "persona") {
    const matchIndividual = String(rule.id_integrante) === pId;
    let matchTargets = false;
    if (rule.target_ids && Array.isArray(rule.target_ids)) {
      matchTargets = rule.target_ids.map(String).includes(pId);
    }
    return matchIndividual || matchTargets;
  }

  const pRole = normalize(person.rol_gira || person.rol || "");
  const userRole = pRole || "musico";

  if (scope === "categoria" || scope === "instrumento") {
    const targets = (rule.target_ids || []).map((t) => String(t).toUpperCase());
    const legacyVal = rule.instrumento_familia; 
    let personFamily = person.instrumentos?.familia ? person.instrumentos.familia.toUpperCase() : null;

    if (targets.length > 0) {
      if (targets.includes("SOLISTAS") && pRole === "solista") return true;
      if (targets.includes("DIRECTORES") && pRole === "director") return true;
      if (targets.includes("PRODUCCION") && pRole === "produccion") return true;
      if (targets.includes("STAFF") && pRole === "staff") return true;
      if (targets.includes("CHOFER") && pRole === "chofer") return true;
      if (targets.includes("LOCALES") && person.is_local) return true;
      if (targets.includes("NO_LOCALES") && !person.is_local) return true;
      if (personFamily && targets.includes(personFamily)) return true;
      if (legacyVal && targets.includes(legacyVal.toUpperCase())) return true;
    }
    if (legacyVal && person.instrumentos?.familia?.includes(legacyVal)) return true;
    return false;
  }

  if (scope === "general") return true;

  if (scope === "localidad" || scope === "region") {
    const condicion = normalize(person.condicion || "");
    if (condicion !== "estable") return false;
    if (["produccion", "staff", "director", "chofer"].includes(userRole)) return false;

    const pLoc = String(person.id_localidad);
    const pReg = String(person.localidades?.id_region);

    if (rule.target_ids && rule.target_ids.length > 0) {
      const targets = rule.target_ids.map(String);
      if (scope === "localidad" && targets.includes(pLoc)) return true;
      if (scope === "region" && targets.includes(pReg)) return true;
    } else {
      if (scope === "localidad" && String(rule.id_localidad) === pLoc) return true;
      if (scope === "region" && String(rule.id_region) === pReg) return true;
    }
  }
  return false;
};

// --- CALCULATOR CORE (Sin cambios) ---
export const calculateLogisticsSummary = (
  roster,
  logisticsRules,
  admissionRules,
  routeRules,
  transportesFisicos,
  allRooms
) => {
  if (!roster || roster.length === 0) return [];

  const transportMap = {};
  transportesFisicos?.forEach((t) => (transportMap[t.id] = t));

  const getSourceCode = (type) => {
    const s = normalize(type);
    if (s === "general") return "G";
    if (s === "region") return "R";
    if (s === "localidad") return "L";
    if (s === "categoria") return "C";
    if (s === "persona") return "P";
    return "-";
  };

  const enrichEvent = (evt) => {
    if (!evt) return null;
    return {
      ...evt,
      hora: evt.hora_inicio || evt.hora,
      nombre_localidad: evt?.locaciones?.localidades?.localidad || null,
    };
  };

  return roster.map((person) => {
    const pId = person.id || person.id_integrante;

    let logisticsData = {
      habitacion:
        allRooms?.find((room) => {
          const assignedIds = room.id_integrantes_asignados || [];
          const occupantsIds = (room.occupants || []).map((occ) => occ.id);
          return assignedIds.includes(pId) || occupantsIds.includes(pId);
        }) || null,
      checkin: null, checkin_src: "-", checkin_time: null,
      checkout: null, checkout_src: "-", checkout_time: null,
      comida_inicio: null, comida_inicio_svc: null, comida_inicio_src: "-",
      comida_fin: null, comida_fin_svc: null, comida_fin_src: "-",
      prov_des: null, prov_alm: null, prov_mer: null, prov_cen: null, prov_src: "-",
      transports: [], transports_src: "-",
    };

    logisticsRules.forEach((r) => {
      if (matchesRule(r, person)) {
        const src = getSourceCode(r.alcance);
        if (r.fecha_checkin) { logisticsData.checkin = r.fecha_checkin; logisticsData.checkin_src = src; }
        if (r.hora_checkin) logisticsData.checkin_time = r.hora_checkin;
        if (r.fecha_checkout) { logisticsData.checkout = r.fecha_checkout; logisticsData.checkout_src = src; }
        if (r.hora_checkout) logisticsData.checkout_time = r.hora_checkout;
        if (r.comida_inicio_fecha) { logisticsData.comida_inicio = r.comida_inicio_fecha; logisticsData.comida_inicio_src = src; }
        if (r.comida_inicio_servicio) logisticsData.comida_inicio_svc = r.comida_inicio_servicio;
        if (r.comida_fin_fecha) { logisticsData.comida_fin = r.comida_fin_fecha; logisticsData.comida_fin_src = src; }
        if (r.comida_fin_servicio) logisticsData.comida_fin_svc = r.comida_fin_servicio;
        if (r.prov_desayuno) logisticsData.prov_des = r.prov_desayuno;
        if (r.prov_almuerzo) logisticsData.prov_alm = r.prov_almuerzo;
        if (r.prov_merienda) logisticsData.prov_mer = r.prov_merienda;
        if (r.prov_cena) logisticsData.prov_cen = r.prov_cena;
        if (r.prov_desayuno || r.prov_almuerzo || r.prov_merienda || r.prov_cena) logisticsData.prov_src = src;
      }
    });

    if (admissionRules && routeRules) {
      const myTransportIds = new Set();
      const groupedAdmissions = {};

      admissionRules.forEach((r) => {
        if (matchesRule(r, person)) {
          const tId = r.id_transporte_fisico;
          if (!groupedAdmissions[tId]) groupedAdmissions[tId] = { inclusions: [], exclusions: [] };
          if (r.tipo === "EXCLUSION") groupedAdmissions[tId].exclusions.push(r);
          else groupedAdmissions[tId].inclusions.push(r);
        }
      });

      Object.keys(groupedAdmissions).forEach((tId) => {
        const { inclusions, exclusions } = groupedAdmissions[tId];
        const personalExclusion = exclusions.find((r) => normalize(r.alcance) === "persona");
        const personalInclusion = inclusions.find((r) => normalize(r.alcance) === "persona");
        if (personalExclusion) return;
        if (personalInclusion) { myTransportIds.add(tId); return; }
        if (exclusions.length > 0) return;
        if (inclusions.length > 0) myTransportIds.add(tId);
      });

      myTransportIds.forEach((tId) => {
        const transportRaw = transportMap[tId];
        const myRoutes = routeRules.filter((r) => String(r.id_transporte_fisico) === String(tId) && matchesRule(r, person));
        let subida = { id: null, prio: 0, evt: null };
        let bajada = { id: null, prio: 0, evt: null };
        let maxPrio = 0;
        myRoutes.forEach((r) => {
          const p = getPriorityValue(r.alcance);
          if (p > maxPrio) maxPrio = p;
          if (r.id_evento_subida && p >= subida.prio) subida = { id: r.id_evento_subida, prio: p, evt: r.evento_subida };
          if (r.id_evento_bajada && p >= bajada.prio) bajada = { id: r.id_evento_bajada, prio: p, evt: r.evento_bajada };
        });
        const typeName = transportRaw?.transportes?.nombre || "Transporte";
        logisticsData.transports.push({
          id: Number(tId),
          nombre: typeName,
          detalle: transportRaw?.detalle || "",
          subidaId: subida.id,
          bajadaId: bajada.id,
          subidaData: enrichEvent(subida.evt),
          bajadaData: enrichEvent(bajada.evt),
          priority: maxPrio,
        });
      });

      if (logisticsData.transports.length > 0) {
        const maxP = Math.max(...logisticsData.transports.map((t) => t.priority));
        logisticsData.transports_src = maxP === 5 ? "P" : maxP === 4 ? "C" : maxP === 3 ? "L" : maxP === 2 ? "R" : "G";
      }
    }
    return { ...person, ...logisticsData, logistics: logisticsData };
  });
};

// --- HOOK PRINCIPAL ---

export function useLogistics(supabase, gira, trigger = 0) {
  const {
    roster: baseRoster,
    loading: rosterLoading,
    refreshRoster,
  } = useGiraRoster(supabase, gira);

  const [logisticsRules, setLogisticsRules] = useState([]);
  const [admissionRules, setAdmissionRules] = useState([]);
  const [routeRules, setRouteRules] = useState([]);
  const [transportes, setTransportes] = useState([]);
  const [rooms, setRooms] = useState([]);
  
  const [viaticosMeta, setViaticosMeta] = useState({ 
    exportedPeopleIds: [], 
    exportedLocationIds: [], 
    tourLocationIds: [],
    sedeIds: []
  });

  const [mealsMeta, setMealsMeta] = useState({ events: [], responses: [] });

  const [rulesLoading, setRulesLoading] = useState(true);
  const giraId = gira?.id;

  const fetchLogisticsData = useCallback(async () => {
    if (!giraId) return;
    setRulesLoading(true);
    try {
      // 1. CARGA GENERAL DE LOGÍSTICA
      const { data: logData } = await supabase.from("giras_logistica_reglas").select("*").eq("id_gira", giraId).order("prioridad", { ascending: true });
      setLogisticsRules(logData || []);

      const { data: transData } = await supabase.from("giras_transportes").select("id, detalle, capacidad_maxima, transportes ( nombre )").eq("id_gira", giraId);
      setTransportes(transData || []);

      const { data: admData } = await supabase.from("giras_logistica_admision").select("*").eq("id_gira", giraId);
      setAdmissionRules(admData || []);

      const { data: routeData } = await supabase.from("giras_logistica_rutas").select(`*, evento_subida: id_evento_subida ( id, fecha, hora_inicio, descripcion, locaciones ( id_localidad, localidades ( localidad ) ) ), evento_bajada: id_evento_bajada ( id, fecha, hora_inicio, descripcion, locaciones ( id_localidad, localidades ( localidad ) ) )`).eq("id_gira", giraId);
      setRouteRules(routeData || []);

      const { data: hospedajes } = await supabase.from("programas_hospedajes").select("id").eq("id_programa", giraId);
      const hospIds = (hospedajes || []).map((h) => h.id);
      if (hospIds.length > 0) {
        const { data: roomsData } = await supabase.from("hospedaje_habitaciones").select("*").in("id_hospedaje", hospIds);
        setRooms(roomsData || []);
      } else {
        setRooms([]);
      }

      // --- VIÁTICOS ---
      const { data: vDetalle } = await supabase.from('giras_viaticos_detalle').select('id_integrante').eq('id_gira', giraId).not('fecha_ultima_exportacion', 'is', null);
      const exportedPeopleIds = (vDetalle || []).map(r => r.id_integrante);

      const { data: destConfig } = await supabase.from('giras_destaques_config').select('id_localidad').eq('id_gira', giraId).not('fecha_ultima_exportacion', 'is', null);
      const exportedLocationIds = (destConfig || []).map(r => r.id_localidad);

      const { data: sedesData } = await supabase.from('giras_localidades').select('id_localidad').eq('id_gira', giraId);
      const sedeIds = (sedesData || []).map(s => s.id_localidad);

      const destinations = new Set();
      routeData?.forEach(route => {
          if (route.evento_subida?.locaciones?.id_localidad) destinations.add(route.evento_subida.locaciones.id_localidad);
          if (route.evento_bajada?.locaciones?.id_localidad) destinations.add(route.evento_bajada.locaciones.id_localidad);
      });
      const tourLocationIds = Array.from(destinations);

      setViaticosMeta({ exportedPeopleIds, exportedLocationIds, tourLocationIds, sedeIds });

      // --- COMIDAS: Recuperación robusta desde 'eventos' y 'eventos_asistencia' ---
      
      // A) Obtener Eventos de la Gira que sean Comidas
      const { data: rawMealEvents } = await supabase
        .from('eventos')
        .select(`
          id, 
          convocados,
          tipos_evento!inner (
            id,
            nombre,
            id_categoria,
            categorias_tipos_eventos ( nombre )
          )
        `)
        .eq('id_gira', giraId);

      const mealEvents = (rawMealEvents || []).filter(evt => {
        const catId = evt.tipos_evento?.id_categoria;
        const catName = evt.tipos_evento?.categorias_tipos_eventos?.nombre || "";
        const typeName = evt.tipos_evento?.nombre || "";
        
        return (
            catId === 4 || // ID 4 de Comidas según tu esquema
            normalize(catName).includes("comida") || 
            normalize(typeName).includes("comida") ||
            normalize(typeName).includes("catering") ||
            normalize(typeName).includes("cena") ||
            normalize(typeName).includes("almuerzo")
        );
      });

      // B) Obtener Asistencia (Respuestas) SOLO de esos eventos
      let mealResps = [];
      if (mealEvents.length > 0) {
        const eventIds = mealEvents.map(e => e.id);
        const { data: attendanceData } = await supabase
          .from('eventos_asistencia') 
          .select('id_integrante, id_evento, estado')
          .in('id_evento', eventIds);
        
        mealResps = attendanceData || [];
      }

      setMealsMeta({
          events: mealEvents || [],
          responses: mealResps || []
      });

    } catch (error) {
      console.error("[useLogistics] Error:", error);
    } finally {
      setRulesLoading(false);
    }
  }, [supabase, giraId]);

  useEffect(() => {
    fetchLogisticsData();
  }, [fetchLogisticsData, trigger]);

  const refresh = () => {
    refreshRoster();
    fetchLogisticsData();
  };

  const summary = useMemo(() => {
    const computedRoster = calculateLogisticsSummary(baseRoster, logisticsRules, admissionRules, routeRules, transportes, rooms);
    if (computedRoster && Array.isArray(computedRoster)) {
        computedRoster.viaticosMeta = viaticosMeta;
        computedRoster.mealsMeta = mealsMeta;
    }
    return computedRoster;
  }, [baseRoster, logisticsRules, admissionRules, routeRules, transportes, rooms, viaticosMeta, mealsMeta]);

  return { summary: summary || [], roster: baseRoster, rooms, logisticsRules, admissionRules, routeRules, transportes, loading: rosterLoading || rulesLoading, refresh, helpers: { matchesRule } };
}