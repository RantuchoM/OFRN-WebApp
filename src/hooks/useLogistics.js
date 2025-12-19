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

  // Helper de Coincidencia
  const matchesRule = (rule, person) => {
    const scope = rule.alcance;
    if (scope === "General") return true;

    const pId = String(person.id);
    const pLoc = String(person.id_localidad);
    const pReg = String(person.localidades?.id_region);

    if (
      rule.target_ids &&
      Array.isArray(rule.target_ids) &&
      rule.target_ids.length > 0
    ) {
      const targets = rule.target_ids.map(String);
      if (scope === "Persona" && targets.includes(pId)) return true;
      if (scope === "Localidad" && targets.includes(pLoc)) return true;
      if (scope === "Region" && targets.includes(pReg)) return true;
      if (scope === "Categoria" || scope === "Instrumento") {
        if (targets.includes("SOLISTAS") && person.rol_gira === "solista")
          return true;
        if (targets.includes("DIRECTORES") && person.rol_gira === "director")
          return true;
        if (targets.includes("PRODUCCION") && person.rol_gira === "produccion")
          return true;
        if (targets.includes("LOCALES") && person.is_local) return true;
        if (targets.includes("NO_LOCALES") && !person.is_local) return true;
        if (
          person.instrumentos?.familia &&
          targets.includes(person.instrumentos.familia)
        )
          return true;
      }
    } else {
      if (scope === "Persona" && String(rule.id_integrante) === pId)
        return true;
      if (scope === "Localidad" && String(rule.id_localidad) === pLoc)
        return true;
      if (scope === "Region" && String(rule.id_region) === pReg) return true;
      if (
        (scope === "Instrumento" || scope === "Categoria") &&
        rule.instrumento_familia
      ) {
        return person.instrumentos?.familia?.includes(rule.instrumento_familia);
      }
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
      // ... (Hotel y Comida se mantienen igual)
      checkin: null,
      checkin_src: "-",
      checkin_time: null,
      checkout: null,
      checkout_src: "-",
      checkout_time: null,
      comida_inicio: null,
      comida_inicio_svc: null,
      comida_inicio_src: "-",
      comida_fin: null,
      comida_fin_svc: null,
      comida_fin_src: "-",
      prov_des: null,
      prov_alm: null,
      prov_mer: null,
      prov_cen: null,
      prov_src: "-",
      transports: [],
      transports_src: "-",
    };

    // 1. LOGÍSTICA (Hotel/Comida)
    logisticsRules.forEach((r) => {
      if (matchesRule(r, person)) {
        // ... (Lógica existente de hotel/comida)
        const src = getSourceCode(r.alcance);
        if (r.fecha_checkin) {
          logisticsData.checkin = r.fecha_checkin;
          logisticsData.checkin_src = src;
        }
        if (r.hora_checkin) logisticsData.checkin_time = r.hora_checkin;
        if (r.fecha_checkout) {
          logisticsData.checkout = r.fecha_checkout;
          logisticsData.checkout_src = src;
        }
        if (r.hora_checkout) logisticsData.checkout_time = r.hora_checkout;
        if (r.comida_inicio_fecha) {
          logisticsData.comida_inicio = r.comida_inicio_fecha;
          logisticsData.comida_inicio_src = src;
        }
        if (r.comida_inicio_servicio)
          logisticsData.comida_inicio_svc = r.comida_inicio_servicio;
        if (r.comida_fin_fecha) {
          logisticsData.comida_fin = r.comida_fin_fecha;
          logisticsData.comida_fin_src = src;
        }
        if (r.comida_fin_servicio)
          logisticsData.comida_fin_svc = r.comida_fin_servicio;
        if (r.prov_desayuno) logisticsData.prov_des = r.prov_desayuno;
        if (r.prov_almuerzo) logisticsData.prov_alm = r.prov_almuerzo;
        if (r.prov_merienda) logisticsData.prov_mer = r.prov_merienda;
        if (r.prov_cena) logisticsData.prov_cen = r.prov_cena;
        if (
          r.prov_desayuno ||
          r.prov_almuerzo ||
          r.prov_merienda ||
          r.prov_cena
        )
          logisticsData.prov_src = src;
      }
    });

    // 2. TRANSPORTE - NUEVA LÓGICA DE FASES
    if (transportRules) {
      // Filtrar reglas relevantes para esta persona
      const matching = transportRules.filter((r) => matchesRule(r, person));

      // Agrupar por Transporte
      const transportGroups = {};

      matching.forEach((r) => {
        const tId = r.id_gira_transporte;
        if (!transportGroups[tId]) {
          transportGroups[tId] = {
            inclusions: [],
            exclusions: [],
            logisticsOnly: [], // Reglas que solo definen paradas, no acceso
          };
        }

        if (r.es_exclusion) {
          transportGroups[tId].exclusions.push(r);
        } else if (r.solo_logistica) {
          transportGroups[tId].logisticsOnly.push(r);
        } else {
          transportGroups[tId].inclusions.push(r);
        }
      });

      const finalTransports = [];

      Object.keys(transportGroups).forEach((tId) => {
        const { inclusions, exclusions, logisticsOnly } = transportGroups[tId];

        // FASE A: ACCESO
        // Si hay exclusión explícita, fuera.
        if (exclusions.length > 0) return;
        // Si no hay inclusiones explícitas, fuera. (logisticsOnly NO da acceso)
        if (inclusions.length === 0) return;

        // FASE B: LOGÍSTICA DE PARADAS
        // Combinamos inclusiones + logistica pura para determinar las mejores paradas
        // Una regla "solo_logistica" de "Persona" le gana a una regla "inclusión" de "Región"
        const allStopRules = [...inclusions, ...logisticsOnly];

        const tState = {
          baseData: inclusions[0].giras_transportes, // Data del bus
          subida: { id: null, prio: -1 },
          bajada: { id: null, prio: -1 },
          maxPrio: 0,
        };

        // Calculamos prioridad de acceso para el código fuente (P, G, R...)
        inclusions.forEach((r) => {
          const p = getPriorityValue(r.alcance);
          if (p > tState.maxPrio) tState.maxPrio = p;
        });

        // Calculamos paradas usando TODAS las reglas
        allStopRules.forEach((r) => {
          const prio = getPriorityValue(r.alcance);

          if (r.id_evento_subida && prio >= tState.subida.prio) {
            tState.subida.id = r.id_evento_subida;
            tState.subida.prio = prio;
          }
          if (r.id_evento_bajada && prio >= tState.bajada.prio) {
            tState.bajada.id = r.id_evento_bajada;
            tState.bajada.prio = prio;
          }
        });

        finalTransports.push({
          id: tState.baseData?.id,
          nombre: tState.baseData?.transportes?.nombre || "Transporte",
          detalle: tState.baseData?.detalle || "",
          subidaId: tState.subida.id,
          bajadaId: tState.bajada.id,
          priority: tState.maxPrio,
        });
      });

      logisticsData.transports = finalTransports;
      if (finalTransports.length > 0) {
        const maxP = Math.max(...finalTransports.map((t) => t.priority));
        if (maxP >= 5) logisticsData.transports_src = "P";
        else if (maxP === 4) logisticsData.transports_src = "C";
        else if (maxP === 3) logisticsData.transports_src = "L";
        else if (maxP === 2) logisticsData.transports_src = "R";
        else logisticsData.transports_src = "G";
      }
    }

    return { ...person, logistics: logisticsData };
  });
};

// ... (El resto del hook useLogistics se mantiene igual, asegurando que el select traiga 'solo_logistica')
export function useLogistics(supabase, gira) {
  const {
    roster: baseRoster,
    loading: rosterLoading,
    refreshRoster,
  } = useGiraRoster(supabase, gira);
  const [logisticsRules, setLogisticsRules] = useState([]);
  const [transportRules, setTransportRules] = useState([]);
  const [rulesLoading, setRulesLoading] = useState(true);
  const giraId = gira?.id;

  const fetchRules = useCallback(async () => {
    if (!giraId) return;
    setRulesLoading(true);
    try {
      const { data: logData } = await supabase
        .from("giras_logistica_reglas")
        .select("*")
        .eq("id_gira", giraId)
        .order("prioridad", { ascending: true });
      setLogisticsRules(logData || []);

      // AQUÍ: Nos aseguramos de traer la nueva columna
      const { data: transData, error: transError } = await supabase
        .from("giras_logistica_reglas_transportes")
        .select(
          `*, giras_transportes!inner (id, id_gira, detalle, transportes ( nombre ))`
        )
        .eq("giras_transportes.id_gira", giraId)
        .order("id", { ascending: true });

      setTransportRules(!transError ? transData || [] : []);
    } catch (error) {
      console.error(error);
    } finally {
      setRulesLoading(false);
    }
  }, [supabase, giraId]);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);
  const refresh = () => {
    refreshRoster();
    fetchRules();
  };
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
