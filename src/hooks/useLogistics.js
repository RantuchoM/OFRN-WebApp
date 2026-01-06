import { useState, useEffect, useCallback, useMemo } from "react";
import { useGiraRoster } from "./useGiraRoster";

// --- HELPER DE CÁLCULO ---
export const calculateLogisticsSummary = (
  roster,
  logisticsRules,
  transportRules
) => {
  if (!roster || roster.length === 0) return [];

  // Prioridad: Mayor número = Mayor peso
  const getPriorityValue = (scope) => {
    const s = (scope || "").toLowerCase();
    if (s === "persona") return 5;
    if (s === "categoria" || s === "instrumento") return 4;
    if (s === "localidad") return 3;
    if (s === "region") return 2;
    return 1; // General
  };

  // Helper de Coincidencia (MATCHING ENGINE)
  const matchesRule = (rule, person) => {
    const scope = rule.alcance;

    // 1. REGLAS POR PERSONA (Prioridad Máxima - Ignoran Rol)
    if (scope === "Persona") {
      const pId = String(person.id);
      if (rule.target_ids && rule.target_ids.length > 0) {
        return rule.target_ids.map(String).includes(pId);
      }
      return String(rule.id_integrante) === pId;
    }

    // 2. REGLAS POR CATEGORÍA (Roles específicos explícitos)
    if (scope === "Categoria" || scope === "Instrumento") {
      const targets = (rule.target_ids || []).map(String);
      const legacyVal = rule.instrumento_familia;

      if (targets.length > 0) {
        // Roles Especiales
        if (targets.includes("SOLISTAS") && person.rol_gira === "solista") return true;
        if (targets.includes("DIRECTORES") && person.rol_gira === "director") return true;
        if (targets.includes("PRODUCCION") && person.rol_gira === "produccion") return true;
        if (targets.includes("STAFF") && person.rol_gira === "staff") return true;
        if (targets.includes("CHOFER") && person.rol_gira === "chofer") return true;
        
        // Condición Local
        if (targets.includes("LOCALES") && person.is_local) return true;
        if (targets.includes("NO_LOCALES") && !person.is_local) return true;
        
        // Familia Instrumento
        if (person.instrumentos?.familia && targets.includes(person.instrumentos.familia)) return true;
      } else if (legacyVal) {
        return person.instrumentos?.familia?.includes(legacyVal);
      }
      return false;
    }

    // 3. REGLAS MASIVAS (General, Región, Localidad) -> FILTRO INTELIGENTE
    // ------------------------------------------------------------------
    const userRole = (person.rol_gira || "musico").trim().toLowerCase();
    let applyMassive = false;

    if (userRole === "musico") {
        // Los músicos (sean estables o refuerzos) generalmente siguen la logística grupal
        applyMassive = true;
    } else if (["solista", "director"].includes(userRole)) {
        // LÓGICA REFINADA:
        // Si es Solista/Director, solo aplicamos reglas masivas si NO es un adicional (es decir, si es interno).
        // Si 'es_adicional' es true, es un invitado externo -> Se asume logística manual/VIP.
        if (!person.es_adicional) {
            applyMassive = true;
        }
    }
    
    // Si no pasó el filtro (ej. es Staff, Producción, o Solista Externo), retornamos false.
    if (!applyMassive) return false; 
    // ------------------------------------------------------------------

    // Chequeo Geográfico normal
    if (scope === "General") return true;

    const pLoc = String(person.id_localidad);
    const pReg = String(person.localidades?.id_region);

    if (rule.target_ids && rule.target_ids.length > 0) {
      const targets = rule.target_ids.map(String);
      if (scope === "Localidad" && targets.includes(pLoc)) return true;
      if (scope === "Region" && targets.includes(pReg)) return true;
    } else {
      // Legacy support
      if (scope === "Localidad" && String(rule.id_localidad) === pLoc) return true;
      if (scope === "Region" && String(rule.id_region) === pReg) return true;
    }

    return false;
  };

  const getSourceCode = (type) => {
    if (type === "General") return "G";
    if (type === "Region") return "R";
    if (type === "Localidad") return "L";
    if (type === "Categoria" || type === "Instrumento") return "C";
    if (type === "Persona") return "P";
    return "-";
  };

  return roster.map((person) => {
    let logisticsData = {
      checkin: null, checkin_src: "-", checkin_time: null,
      checkout: null, checkout_src: "-", checkout_time: null,
      comida_inicio: null, comida_inicio_svc: null, comida_inicio_src: "-",
      comida_fin: null, comida_fin_svc: null, comida_fin_src: "-",
      prov_des: null, prov_alm: null, prov_mer: null, prov_cen: null, prov_src: "-",
      transports: [], transports_src: "-",
    };

    // 1. LOGÍSTICA (Hotel/Comida)
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

    // 2. TRANSPORTE
    if (transportRules) {
      const matching = transportRules.filter((r) => matchesRule(r, person));
      const transportGroups = {};

      matching.forEach((r) => {
        const tId = r.id_gira_transporte;
        if (!transportGroups[tId]) {
          transportGroups[tId] = { inclusions: [], exclusions: [], logisticsOnly: [] };
        }
        if (r.es_exclusion) transportGroups[tId].exclusions.push(r);
        else if (r.solo_logistica) transportGroups[tId].logisticsOnly.push(r);
        else transportGroups[tId].inclusions.push(r);
      });

      const finalTransports = [];

      Object.keys(transportGroups).forEach((tId) => {
        const { inclusions, exclusions, logisticsOnly } = transportGroups[tId];

        // Si hay exclusión, omitimos todo
        if (exclusions.length > 0) return;
        // Si no hay inclusión base, no viaja
        if (inclusions.length === 0) return; 

        const allStopRules = [...inclusions, ...logisticsOnly];
        
        // Base Data del primer match inclusivo
        const tState = {
          baseData: inclusions[0].giras_transportes,
          subida: { id: null, prio: 0 },
          bajada: { id: null, prio: 0 },
          maxPrio: 0,
        };

        inclusions.forEach((r) => {
          const p = getPriorityValue(r.alcance);
          if (p > tState.maxPrio) tState.maxPrio = p;
        });

        allStopRules.forEach((r) => {
          const prio = getPriorityValue(r.alcance);

          // Lógica de Subida
          if (r.id_evento_subida !== null && r.id_evento_subida !== undefined) {
             if (prio >= tState.subida.prio) {
                 tState.subida.id = r.id_evento_subida;
                 tState.subida.prio = prio;
             }
          } else if (prio === 5) { // Borrado manual (prioridad persona)
             if (prio >= tState.subida.prio) {
                 tState.subida.id = null;
                 tState.subida.prio = prio;
             }
          }

          // Lógica de Bajada
          if (r.id_evento_bajada !== null && r.id_evento_bajada !== undefined) {
             if (prio >= tState.bajada.prio) {
                 tState.bajada.id = r.id_evento_bajada;
                 tState.bajada.prio = prio;
             }
          } else if (prio === 5) { // Borrado manual
             if (prio >= tState.bajada.prio) {
                 tState.bajada.id = null;
                 tState.bajada.prio = prio;
             }
          }
        });

        finalTransports.push({
          id: tState.baseData?.id,
          nombre: tState.baseData?.transportes?.nombre || "Transporte",
          detalle: tState.baseData?.detalle || "",
          subidaId: tState.subida.id,
          subidaPrio: tState.subida.prio, 
          bajadaId: tState.bajada.id,
          bajadaPrio: tState.bajada.prio, 
          priority: tState.maxPrio,
        });
      });

      logisticsData.transports = finalTransports;
    }

    return { ...person, logistics: logisticsData };
  });
};

export function useLogistics(supabase, gira) {
  const { roster: baseRoster, loading: rosterLoading, refreshRoster } = useGiraRoster(supabase, gira);
  const [logisticsRules, setLogisticsRules] = useState([]);
  const [transportRules, setTransportRules] = useState([]);
  const [rulesLoading, setRulesLoading] = useState(true);
  const giraId = gira?.id;

  const fetchRules = useCallback(async () => {
    if (!giraId) return;
    setRulesLoading(true);
    try {
      // 1. Reglas de Logística
      const { data: logData } = await supabase
        .from("giras_logistica_reglas")
        .select("*")
        .eq("id_gira", giraId)
        .order("prioridad", { ascending: true });
      setLogisticsRules(logData || []);

      // 2. Reglas de Transporte (Con join para traer info del transporte)
      const { data: transData, error: transError } = await supabase
        .from("giras_logistica_reglas_transportes")
        .select(`*, giras_transportes!inner (id, id_gira, detalle, transportes ( nombre ))`)
        .eq("giras_transportes.id_gira", giraId)
        .order("id", { ascending: true });

      setTransportRules(!transError ? transData || [] : []);
    } catch (error) {
      console.error(error);
    } finally {
      setRulesLoading(false);
    }
  }, [supabase, giraId]);

  useEffect(() => { fetchRules(); }, [fetchRules]);
  
  const refresh = () => { refreshRoster(); fetchRules(); };
  
  const summary = useMemo(
    () => calculateLogisticsSummary(baseRoster, logisticsRules, transportRules),
    [baseRoster, logisticsRules, transportRules]
  );

  return {
    summary: summary || [],
    roster: baseRoster,
    logisticsRules,
    transportRules,
    loading: rosterLoading || rulesLoading,
    refresh,
  };
}