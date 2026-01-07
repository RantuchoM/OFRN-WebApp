import { useState, useEffect, useCallback, useMemo } from "react";
import { useGiraRoster } from "./useGiraRoster";

// --- HELPER DE CÁLCULO ---
export const calculateLogisticsSummary = (
  roster,
  logisticsRules,
  transportRules
) => {
  if (!roster || roster.length === 0) return [];

  // Helper de normalización
  const normalize = (str) => (str || "").toLowerCase().trim();

  // Prioridad: Mayor número = Mayor peso
  const getPriorityValue = (scope) => {
    const s = normalize(scope);
    if (s === "persona") return 5;
    if (s === "categoria" || s === "instrumento") return 4;
    if (s === "localidad") return 3;
    if (s === "region") return 2;
    return 1; // General
  };

  // Helper de Coincidencia (MATCHING ENGINE)
  const matchesRule = (rule, person) => {
    const scope = normalize(rule.alcance);
    const pId = String(person.id);

    // -----------------------------------------------------------------------
    // 1. REGLAS POR PERSONA (SUPREMACÍA ABSOLUTA)
    // -----------------------------------------------------------------------
    // Estas reglas ignoran rol, categoría o cualquier otra condición.
    if (scope === "persona") {
      if (rule.target_ids && Array.isArray(rule.target_ids) && rule.target_ids.length > 0) {
        return rule.target_ids.map(String).includes(pId);
      }
      return String(rule.id_integrante) === pId;
    }

    // -----------------------------------------------------------------------
    // 2. REGLAS POR CATEGORÍA / INSTRUMENTO
    // -----------------------------------------------------------------------
    if (scope === "categoria" || scope === "instrumento") {
      const targets = (rule.target_ids || []).map(t => String(t).toUpperCase());
      const legacyVal = rule.instrumento_familia;
      const pRole = normalize(person.rol_gira);

      if (targets.length > 0) {
        if (targets.includes("SOLISTAS") && pRole === "solista") return true;
        if (targets.includes("DIRECTORES") && pRole === "director") return true;
        if (targets.includes("PRODUCCION") && pRole === "produccion") return true;
        if (targets.includes("STAFF") && pRole === "staff") return true;
        if (targets.includes("CHOFER") && pRole === "chofer") return true;
        if (targets.includes("LOCALES") && person.is_local) return true;
        if (targets.includes("NO_LOCALES") && !person.is_local) return true;
        
        if (person.instrumentos?.familia && targets.includes(person.instrumentos.familia.toUpperCase())) return true;
      } else if (legacyVal) {
        return person.instrumentos?.familia?.includes(legacyVal);
      }
      
      // Si es regla de categoría y no aplica, retornamos false aquí.
      // No permitimos que "caiga" a las reglas generales.
      return false; 
    }

    // -----------------------------------------------------------------------
    // 3. FILTRO DE ROLES PARA REGLAS MASIVAS (GEOGRÁFICAS/GENERALES)
    // -----------------------------------------------------------------------
    // Solo Músicos (y directores/solistas de planta) ven reglas generales.
    // Producción/Staff NO ven reglas generales (a menos que tengan regla explícita arriba).
    
    const userRole = normalize(person.rol_gira || "musico");
    let allowMassive = false;

    if (userRole === "musico") {
        allowMassive = true;
    } else if (["solista", "director"].includes(userRole)) {
        if (!person.es_adicional) allowMassive = true;
    }
    
    if (!allowMassive) return false; 

    // -----------------------------------------------------------------------
    // 4. CHEQUEO GEOGRÁFICO / GENERAL
    // -----------------------------------------------------------------------

    if (scope === "general") return true;

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

    return false;
  };

  const getSourceCode = (type) => {
    const s = normalize(type);
    if (s === "general") return "G";
    if (s === "region") return "R";
    if (s === "localidad") return "L";
    if (s === "categoria" || s === "instrumento") return "C";
    if (s === "persona") return "P";
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
        // ... (Lógica de asignación de hotel/comida se mantiene igual)
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

    // 2. TRANSPORTE - LÓGICA DE PRIORIDADES MEJORADA
    if (transportRules) {
      // a) Buscar TODAS las reglas que coincidan con la persona
      const matching = transportRules.filter((r) => matchesRule(r, person));
      const transportGroups = {};

      // b) Agrupar por Transporte
      matching.forEach((r) => {
        const tId = r.id_gira_transporte;
        if (!transportGroups[tId]) {
          transportGroups[tId] = { inclusions: [], exclusions: [], logisticsOnly: [] };
        }
        if (r.es_exclusion) transportGroups[tId].exclusions.push(r);
        else if (!!r.solo_logistica) transportGroups[tId].logisticsOnly.push(r);
        else transportGroups[tId].inclusions.push(r);
      });

      const finalTransports = [];

      Object.keys(transportGroups).forEach((tId) => {
        const { inclusions, exclusions, logisticsOnly } = transportGroups[tId];

        // -----------------------------------------------------
        // PASO CRÍTICO: RESOLUCIÓN DE CONFLICTOS
        // -----------------------------------------------------
        
        // 1. ¿Existe una regla explícita "POR PERSONA"?
        const personalInclusion = inclusions.find(r => normalize(r.alcance) === 'persona');
        const personalExclusion = exclusions.find(r => normalize(r.alcance) === 'persona');
        const personalLogistics = logisticsOnly.find(r => normalize(r.alcance) === 'persona');

        const hasPersonalRule = !!(personalInclusion || personalLogistics);

        // 2. Lógica de VETO (Exclusión)
        // Solo un veto "Persona" puede matar a una inclusión "Persona".
        if (personalExclusion) return; // Veto explícito personal -> NO viaja.

        // Si NO hay inclusión personal, las exclusiones generales (categoría/región) aplican.
        // Si SÍ hay inclusión personal, IGNORAMOS las exclusiones generales.
        if (!hasPersonalRule) {
             if (exclusions.length > 0) return;
        }

        // 3. Lógica de ADMISIÓN (Inclusión)
        let admitted = false;

        if (hasPersonalRule) {
            // Si tiene regla personal (inclusión o logística), entra directo.
            admitted = true;
        } else {
            // Si no es personal, debe cumplir criterios estándar:
            const hasExplicitInclusion = inclusions.length > 0;
            const hasRoleInclusion = inclusions.some(r => ['categoria', 'instrumento'].includes(normalize(r.alcance)));
            
            // Si hay inclusión explícita (general/cat) o por rol -> entra.
            if (hasExplicitInclusion || hasRoleInclusion) admitted = true;
        }

        if (!admitted) return;

        // -----------------------------------------------------

        // Recuperar datos base del transporte
        const allStopRules = [...inclusions, ...logisticsOnly];
        const ruleWithData = allStopRules.find(r => r.giras_transportes);
        
        if (!ruleWithData) return;

        const baseData = ruleWithData.giras_transportes;
        
        // Calcular prioridad visual
        let maxPrio = 0;
        allStopRules.forEach(r => {
             const p = getPriorityValue(r.alcance);
             if(p > maxPrio) maxPrio = p;
        });

        const tState = {
          baseData: baseData,
          subida: { id: null, prio: 0 },
          bajada: { id: null, prio: 0 },
          maxPrio: maxPrio,
        };

        allStopRules.forEach((r) => {
          const prio = getPriorityValue(r.alcance);

          // Subida
          if (r.id_evento_subida) {
             if (prio >= tState.subida.prio) {
                 tState.subida.id = r.id_evento_subida;
                 tState.subida.prio = prio;
             }
          } else if (prio === 5) { 
             // Reset manual si es regla persona
             if (prio >= tState.subida.prio) {
                 tState.subida.id = null;
                 tState.subida.prio = prio;
             }
          }

          // Bajada
          if (r.id_evento_bajada) {
             if (prio >= tState.bajada.prio) {
                 tState.bajada.id = r.id_evento_bajada;
                 tState.bajada.prio = prio;
             }
          } else if (prio === 5) { 
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

      // 2. Reglas de Transporte
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