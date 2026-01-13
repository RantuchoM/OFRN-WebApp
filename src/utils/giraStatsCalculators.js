/**
 * src/utils/giraStatsCalculators.js
 */
import { isUserConvoked } from './giraUtils';

// --- HELPER DE NORMALIZACIÓN ---
const normalize = (str) => (str || "").toLowerCase().trim();

// --- CÁLCULOS PUROS (RAW) ---

// 1. ROSTER
export const computeRosterRaw = (data) => {
  const { vacantesCount } = data;
  if (vacantesCount === undefined || vacantesCount === null) return null;
  if (vacantesCount > 0) {
    return { kpi: [{ label: "Vacantes", value: vacantesCount, color: "red" }], tooltip: `Se detectaron ${vacantesCount} posiciones sin cubrir.` };
  }
  return { kpi: [{ label: "Plantilla", value: "100%", color: "green" }], tooltip: "Toda la plantilla está cubierta." };
};

// 2. ROOMING
export const computeRoomingRaw = (data) => {
  const { roster } = data;
  if (!roster || !Array.isArray(roster)) return null;
  const paxQueRequierenHotel = roster.filter((p) => {
    const estado = normalize(p.estado_gira || p.estado);
    const esActivo = estado !== "ausente" && estado !== "rechazado" && estado !== "baja";
    const esLocal = p.is_local === true; 
    return esActivo && !esLocal;
  });
  const totalNecesitanHotel = paxQueRequierenHotel.length;
  if (totalNecesitanHotel === 0) {
    return { kpi: [{ label: "Rooming OK", value: "100%", color: "green" }], tooltip: "No hay personal externo que requiera hospedaje." };
  }
  const faltantes = paxQueRequierenHotel.filter((p) => !p.habitacion);
  const unassignedCount = faltantes.length;
  return {
    kpi: [{ label: unassignedCount > 0 ? "Sin Habitación" : "Rooming OK", value: unassignedCount > 0 ? unassignedCount : "100%", color: unassignedCount > 0 ? "red" : "green" }],
    tooltip: unassignedCount > 0 ? `Faltan asignar ${unassignedCount} personas.` : "Todos los externos tienen habitación asignada.",
    meta: { totalNecesitanHotel, assigned: totalNecesitanHotel - unassignedCount }
  };
};

// 3. TRANSPORTE
export const computeTransporteRaw = (data) => {
  const { roster } = data;
  if (!roster || !Array.isArray(roster)) return null;
  const activePax = roster.filter((p) => {
    const estado = normalize(p.estado_gira || p.estado);
    return estado !== "ausente" && estado !== "rechazado" && estado !== "baja";
  });
  const totalPax = activePax.length;
  if (totalPax === 0) return null;
  const sinTransporte = activePax.filter((p) => {
    return !p.transports || p.transports.length === 0;
  }).length;
  return {
    kpi: [{ label: sinTransporte > 0 ? "Sin Asiento" : "Transporte OK", value: sinTransporte > 0 ? sinTransporte : "100%", color: sinTransporte > 0 ? "red" : "green" }],
    tooltip: sinTransporte > 0 ? `${sinTransporte} pasajeros sin asignación.` : "Todos con transporte asignado.",
    meta: { totalPax, assigned: totalPax - sinTransporte }
  };
};

// 4. VIÁTICOS
export const computeViaticosRaw = (data) => {
  const { roster } = data;
  if (!roster || !Array.isArray(roster)) return null;

  const meta = roster.viaticosMeta;
  if (!meta) return { kpi: [{ label: "Calc...", value: "-", color: "amber" }] };

  const sedeSet = new Set(meta.sedeIds || []);
  
  // A. PERSONAS
  const potentialPeopleIds = roster
    .filter(p => {
        const estado = normalize(p.estado_gira || p.estado);
        if (estado === "ausente" || estado === "rechazado" || estado === "baja") return false;
        const condicion = normalize(p.condicion);
        const rol = normalize(p.rol_gira || p.rol);
        const isEstable = condicion === 'estable';
        const isMusicoOrSolista = rol === 'musico' || rol === 'solista';
        return (!isEstable) || (!isMusicoOrSolista);
    })
    .map(p => p.id);
  
  const totalPotentialPeople = potentialPeopleIds.length;
  const exportedPeopleSet = new Set(meta.exportedPeopleIds || []);
  const totalExportedPeople = potentialPeopleIds.filter(id => exportedPeopleSet.has(id)).length;

  // B. LOCALIDADES
  const activeMusicians = roster.filter(p => {
      const estado = normalize(p.estado_gira || p.estado);
      return estado !== "ausente" && estado !== "rechazado" && estado !== "baja";
  });
  const uniqueResidenceIds = new Set();
  activeMusicians.forEach(p => { if (p.id_localidad) uniqueResidenceIds.add(Number(p.id_localidad)); });
  const potentialLocIds = Array.from(uniqueResidenceIds).filter(locId => !sedeSet.has(locId));
  const totalPotentialLocations = potentialLocIds.length;
  const exportedLocSet = new Set(meta.exportedLocationIds || []);
  const totalExportedLocations = potentialLocIds.filter(id => exportedLocSet.has(id)).length;

  if (totalPotentialPeople === 0 && totalPotentialLocations === 0) {
      return { kpi: [{ label: "Viáticos N/A", value: "OK", color: "green" }] };
  }

  const peopleComplete = totalExportedPeople >= totalPotentialPeople;
  const locsComplete = totalExportedLocations >= totalPotentialLocations;
  const isFullyComplete = peopleComplete && locsComplete;

  let color = "red";
  if (isFullyComplete) color = "green";
  else if (totalExportedPeople > 0 || totalExportedLocations > 0) color = "amber";

  return {
    kpi: [{
      label: isFullyComplete ? "Viáticos OK" : "Pendiente",
      value: `P:${totalExportedPeople}/${totalPotentialPeople} L:${totalExportedLocations}/${totalPotentialLocations}`,
      color: color,
    }],
    tooltip: `PERSONAS: ${totalExportedPeople} exportadas de ${totalPotentialPeople} potenciales.\nLUGARES: ${totalExportedLocations} exportados de ${totalPotentialLocations} potenciales.`
  };
};

// 5. COMIDAS (DEBUGGEADO)
export const computeMealsRaw = (data) => {
  const { roster } = data;
  if (!roster || !Array.isArray(roster)) return null;

  const meta = roster.mealsMeta;
  if (!meta || !meta.events) return { kpi: [{ label: "Calc...", value: "-", color: "amber" }] };

  const events = meta.events || [];
  const responses = meta.responses || [];

  console.groupCollapsed("🍔 [MEALS DEBUG] Diagnóstico de Cálculo de Comidas");
  console.log(`Total Eventos Comida: ${events.length}`);
  
  if (events.length === 0) {
      console.groupEnd();
      return { kpi: [{ label: "Sin Comidas", value: "N/A", color: "gray" }], tooltip: "No hay eventos de comida creados." };
  }

  // Filtrar roster activo
  const activePax = roster.filter(p => {
      const estado = normalize(p.estado_gira || p.estado);
      return estado !== "ausente" && estado !== "rechazado" && estado !== "baja";
  });
  console.log(`Total Roster Activo: ${activePax.length}`);

  // --- DEBUG POR EVENTO ---
  console.group("Análisis por Evento (Convocados vs Respuestas)");
  events.forEach((evt, idx) => {
      // Calculamos quiénes DEBERÍAN estar en este evento
      const convokedForEvent = activePax.filter(p => isUserConvoked(evt.convocados, p));
      
      // Calculamos cuántos de esos tienen respuesta registrada
      const answersForEvent = responses.filter(r => 
          r.id_comida_evento === evt.id && 
          convokedForEvent.some(p => p.id === r.id_integrante)
      );

      console.log(`Evento #${idx + 1} (ID ${evt.id}): Convocados: ${convokedForEvent.length} | Respuestas: ${answersForEvent.length}`);
      // Si quieres ver los tags: console.log("   Tags:", evt.convocados);
  });
  console.groupEnd();

  // --- CÁLCULO POR PERSONA ---
  let countComplete = 0;
  let countPartial = 0;
  let countNone = 0;
  let totalEligiblePax = 0;

  activePax.forEach(person => {
      // 1. Identificar a qué eventos está convocado ESTA persona
      const myEvents = events.filter(evt => isUserConvoked(evt.convocados, person));

      if (myEvents.length === 0) {
          // Si no está convocado a nada, no cuenta para el denominador
          return;
      }

      totalEligiblePax++;

      // 2. Contar cuántos de esos eventos tienen respuesta
      const respondedCount = myEvents.filter(evt => 
          responses.some(r => r.id_comida_evento === evt.id && r.id_integrante === person.id)
      ).length;

      if (respondedCount === myEvents.length) {
          countComplete++;
      } else if (respondedCount === 0) {
          countNone++;
      } else {
          countPartial++;
      }
  });

  console.log(`RESULTADO FINAL: Eligibles: ${totalEligiblePax} | Completos: ${countComplete} | Parciales: ${countPartial} | Nada: ${countNone}`);
  console.groupEnd();

  if (totalEligiblePax === 0) {
      return { kpi: [{ label: "Nadie Convocado", value: "-", color: "gray" }] };
  }

  const isAllComplete = countComplete === totalEligiblePax;
  let color = "red";
  if (isAllComplete) color = "green";
  else if (countComplete > 0 || countPartial > 0) color = "amber";

  return {
    kpi: [{
      label: isAllComplete ? "Asistencia OK" : "Incompleto",
      value: `OK:${countComplete} P:${countPartial} 0:${countNone}`,
      color: color,
    }],
    tooltip: `ASISTENCIA A COMIDAS:
    • Completos: ${countComplete} (Respondieron todo lo convocado)
    • Parciales: ${countPartial}
    • Sin respuesta: ${countNone}
    (Total convocados: ${totalEligiblePax})`
  };
};

// --- CONFIGURACIÓN ---

const RAW_CALCULATORS = {
  ROSTER: computeRosterRaw,
  ROOMING: computeRoomingRaw,
  TRANSPORTE: computeTransporteRaw,
  VIATICOS: computeViaticosRaw, 
  MEALS: computeMealsRaw, 
};

// --- EXPORTACIONES ---

export const hasCalculator = (sectionKey) => {
  if (!sectionKey) return false;
  return !!RAW_CALCULATORS[sectionKey.toUpperCase()];
};

export const calculateStatsFromData = (sectionKey, data) => {
  const key = sectionKey?.toUpperCase();
  const calculator = RAW_CALCULATORS[key];
  if (!calculator) return null;
  try {
    return calculator(data);
  } catch (e) {
    console.error(`[Stats] Error en cálculo de ${key}:`, e);
    return null;
  }
};