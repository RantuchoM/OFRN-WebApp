import { useState, useEffect, useCallback, useMemo } from "react";
import { useGiraRoster } from "./useGiraRoster";

// ==========================================
// 1. HELPERS DE MATCHING
// ==========================================

export const normalize = (str) => (str || "").toLowerCase().trim();

export const getPriorityValue = (scope) => {
  const s = normalize(scope);
  if (s === "persona") return 5;
  if (s === "categoria" || s === "instrumento") return 4;
  if (s === "localidad") return 3;
  if (s === "region") return 2;
  return 1; // General
};

/**
 * Matching Engine Estricto.
 */
export const matchesRule = (rule, person) => {
  const scope = normalize(rule.alcance);
  const pId = String(person.id);

  // 1. PERSONA: Siempre gana, sin filtros.
  if (scope === "persona") {
    const matchIndividual = String(rule.id_integrante) === pId;
    let matchTargets = false;
    if (rule.target_ids && Array.isArray(rule.target_ids)) {
      matchTargets = rule.target_ids.map(String).includes(pId);
    }
    return matchIndividual || matchTargets;
  }

  const pRole = normalize(person.rol_gira);
  const userRole = normalize(person.rol_gira || "musico");

  // 2. CATEGORÍA / INSTRUMENTO
  if (scope === "categoria" || scope === "instrumento") {
    const targets = (rule.target_ids || []).map(t => String(t).toUpperCase());
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

  // 3. GENERAL
  if (scope === "general") return true;

  // 4. REGIÓN / LOCALIDAD
  if (scope === "localidad" || scope === "region") {
      // --- FILTRO CRÍTICO ---
      // Producción, Staff y Directores NO participan, salvo regla explícita superior.
      const condicion = normalize(person.condicion || "");
      
      // Debe ser estable (Tolerante a mayúsculas/minúsculas)
      if (condicion !== "estable") return false;
      
      // No debe ser rol de gestión/técnico
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

// ==========================================
// 2. LOGICA DE CÁLCULO (CAPAS)
// ==========================================

export const calculateLogisticsSummary = (roster, logisticsRules, admissionRules, routeRules, transportesFisicos) => {
  if (!roster || roster.length === 0) return [];

  const transportMap = {};
  transportesFisicos?.forEach(t => transportMap[t.id] = t);

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
          nombre_localidad: evt?.locaciones?.localidades?.localidad || null
      };
  };

  return roster.map((person) => {
    let logisticsData = {
      // Hotel/Comida
      checkin: null, checkin_src: "-", checkin_time: null,
      checkout: null, checkout_src: "-", checkout_time: null,
      comida_inicio: null, comida_inicio_svc: null, comida_inicio_src: "-",
      comida_fin: null, comida_fin_svc: null, comida_fin_src: "-",
      prov_des: null, prov_alm: null, prov_mer: null, prov_cen: null, prov_src: "-",
      
      // TRANSPORTE
      transports: [], 
      transports_src: "-",
    };

    // --- A. LOGÍSTICA HOTEL/COMIDA ---
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

    // --- B. TRANSPORTE (Lógica de 2 Capas) ---
    if (admissionRules && routeRules) {
        
        // 1. Determinar en qué transportes está ADMITIDO
        const myTransportIds = new Set();
        const groupedAdmissions = {}; 

        admissionRules.forEach(r => {
            if (matchesRule(r, person)) {
                const tId = r.id_transporte_fisico;
                if(!groupedAdmissions[tId]) groupedAdmissions[tId] = { inclusions: [], exclusions: [] };
                if (r.tipo === 'EXCLUSION') groupedAdmissions[tId].exclusions.push(r);
                else groupedAdmissions[tId].inclusions.push(r);
            }
        });

        Object.keys(groupedAdmissions).forEach(tId => {
            const { inclusions, exclusions } = groupedAdmissions[tId];
            
            const personalExclusion = exclusions.find(r => normalize(r.alcance) === 'persona');
            const personalInclusion = inclusions.find(r => normalize(r.alcance) === 'persona');

            if (personalExclusion) return; 
            if (personalInclusion) { myTransportIds.add(tId); return; } 

            if (exclusions.length > 0) return; 
            if (inclusions.length > 0) myTransportIds.add(tId); 
        });

        // 2. Para cada transporte admitido, buscar la mejor RUTA
        myTransportIds.forEach(tId => {
            const transportRaw = transportMap[tId];
            
            const myRoutes = routeRules.filter(r => 
                String(r.id_transporte_fisico) === String(tId) &&
                matchesRule(r, person)
            );

            let subida = { id: null, prio: 0, evt: null };
            let bajada = { id: null, prio: 0, evt: null };
            let maxPrio = 0;

            myRoutes.forEach(r => {
                const p = getPriorityValue(r.alcance);
                if (p > maxPrio) maxPrio = p;

                if (r.id_evento_subida && p >= subida.prio) {
                    subida = { id: r.id_evento_subida, prio: p, evt: r.evento_subida };
                }
                if (r.id_evento_bajada && p >= bajada.prio) {
                    bajada = { id: r.id_evento_bajada, prio: p, evt: r.evento_bajada };
                }
            });

            // Extraemos el nombre correctamente desde la relación
            const typeName = transportRaw?.transportes?.nombre || "Transporte";

            logisticsData.transports.push({
                id: Number(tId),
                nombre: typeName,
                detalle: transportRaw?.detalle || "",
                subidaId: subida.id,
                bajadaId: bajada.id,
                subidaData: enrichEvent(subida.evt),
                bajadaData: enrichEvent(bajada.evt),
                priority: maxPrio
            });
        });

        if (logisticsData.transports.length > 0) {
             const maxP = Math.max(...logisticsData.transports.map(t => t.priority));
             logisticsData.transports_src = maxP === 5 ? "P" : maxP === 4 ? "C" : maxP === 3 ? "L" : maxP === 2 ? "R" : "G";
        }
    }

    return { ...person, logistics: logisticsData };
  });
};

// ==========================================
// 3. HOOK
// ==========================================

export function useLogistics(supabase, gira) {
  const { roster: baseRoster, loading: rosterLoading, refreshRoster } = useGiraRoster(supabase, gira);
  const [logisticsRules, setLogisticsRules] = useState([]);
  const [admissionRules, setAdmissionRules] = useState([]);
  const [routeRules, setRouteRules] = useState([]);
  const [transportes, setTransportes] = useState([]);
  const [rulesLoading, setRulesLoading] = useState(true);
  const giraId = gira?.id;

  const fetchRules = useCallback(async () => {
    if (!giraId) return;
    setRulesLoading(true);
    try {
      // 1. Reglas Hotel
      const { data: logData } = await supabase
        .from("giras_logistica_reglas")
        .select("*")
        .eq("id_gira", giraId)
        .order("prioridad", { ascending: true });
      setLogisticsRules(logData || []);

      // 2. Transportes Físicos (CORREGIDO: JOIN con transportes)
      const { data: transData } = await supabase
        .from("giras_transportes")
        .select("id, detalle, capacidad_maxima, transportes ( nombre )")
        .eq("id_gira", giraId);
      setTransportes(transData || []);

      // 3. Reglas ADMISIÓN
      const { data: admData } = await supabase
        .from("giras_logistica_admision")
        .select("*")
        .eq("id_gira", giraId);
      setAdmissionRules(admData || []);

      // 4. Reglas RUTAS
      const { data: routeData, error: routeError } = await supabase
        .from("giras_logistica_rutas")
        .select(`
            *,
            evento_subida: id_evento_subida ( id, fecha, hora_inicio, descripcion, locaciones ( localidades ( localidad ) ) ),
            evento_bajada: id_evento_bajada ( id, fecha, hora_inicio, descripcion, locaciones ( localidades ( localidad ) ) )
        `)
        .eq("id_gira", giraId);
      
      if (routeError) console.error("Error routes:", routeError);
      setRouteRules(routeData || []);

    } catch (error) {
      console.error(error);
    } finally {
      setRulesLoading(false);
    }
  }, [supabase, giraId]);

  useEffect(() => { fetchRules(); }, [fetchRules]);
  
  const refresh = () => { refreshRoster(); fetchRules(); };
  
  const summary = useMemo(
    () => calculateLogisticsSummary(baseRoster, logisticsRules, admissionRules, routeRules, transportes),
    [baseRoster, logisticsRules, admissionRules, routeRules, transportes]
  );

  return {
    summary: summary || [],
    roster: baseRoster,
    logisticsRules,
    admissionRules,
    routeRules,
    transportes, // Exportamos la lista para los modales
    loading: rosterLoading || rulesLoading,
    refresh,
    helpers: { matchesRule }
  };
}