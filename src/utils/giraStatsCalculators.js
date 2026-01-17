/**
 * src/utils/giraStatsCalculators.js
 */
import { isUserConvoked } from './giraUtils';

// --- HELPER DE NORMALIZACIÓN ---
const normalize = (str) => (str || "").toLowerCase().trim();

// --- CÁLCULOS PUROS (RAW) ---

// 0. GENERAL
export const computeGeneralRaw = (data) => {
  const { roster } = data;
  if (!roster || !Array.isArray(roster)) return null;
  const activePax = roster.filter((p) => {
    const estado = normalize(p.estado_gira || p.estado);
    return estado !== "ausente" && estado !== "rechazado" && estado !== "baja";
  });
  const vacantes = activePax.filter(p => p.es_simulacion).length;
  const total = activePax.length;
  if (total === 0) return { kpi: [{ label: "Sin Pax", value: "-", color: "gray" }], tooltip: "No hay personal en la lista." };
  if (vacantes > 0) {
      return { 
          kpi: [{ label: "Vacantes", value: vacantes, color: "red" }],
          tooltip: `Atención: ${vacantes} posiciones sin cubrir de ${total} totales.` 
      };
  }
  return { 
      kpi: [{ label: "Staff OK", value: total, color: "green" }],
      tooltip: `Plantilla completa: ${total} personas confirmadas.`
  };
};

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

// 5. COMIDAS (CORREGIDO PARA eventos_asistencia)
export const computeMealsRaw = (data) => {
  const { roster } = data;
  if (!roster || !Array.isArray(roster)) return null;

  const meta = roster.mealsMeta;
  if (!meta || !meta.events) return { kpi: [{ label: "Calc...", value: "-", color: "amber" }] };

  const events = meta.events || [];
  const responses = meta.responses || [];

  if (events.length === 0) {
      return { kpi: [{ label: "Sin Comidas", value: "N/A", color: "gray" }], tooltip: "No hay eventos de comida creados." };
  }

  // 1. Mapa de respuestas
  // Se usa 'id_evento' porque estamos leyendo de 'eventos_asistencia'
  const responseSet = new Set();
  responses.forEach(r => {
      // Usamos r.id_evento (nombre en eventos_asistencia)
      if(r.id_evento && r.id_integrante) {
          responseSet.add(`${r.id_evento}_${r.id_integrante}`);
      }
  });

  // 2. Filtrar roster activo
  const activePax = roster.filter(p => {
      const estado = normalize(p.estado_gira || p.estado);
      return estado !== "ausente" && estado !== "rechazado" && estado !== "baja";
  });

  // 3. Contadores
  let countComplete = 0; 
  let countPartial = 0;  
  let countNone = 0;     
  let totalEligiblePax = 0;

  activePax.forEach(person => {
      const myRequiredEvents = events.filter(evt => isUserConvoked(evt.convocados, person));
      const totalRequired = myRequiredEvents.length;

      if (totalRequired === 0) return;

      totalEligiblePax++;

      const respondedCount = myRequiredEvents.filter(evt => 
          responseSet.has(`${evt.id}_${person.id}`)
      ).length;

      if (respondedCount === totalRequired) {
          countComplete++;
      } else if (respondedCount === 0) {
          countNone++;
      } else {
          countPartial++;
      }
  });

  if (totalEligiblePax === 0) {
      return { kpi: [{ label: "Nadie Convocado", value: "-", color: "gray" }], tooltip: "Hay eventos de comida, pero nadie cumple los criterios de convocados." };
  }

  const isAllComplete = countComplete === totalEligiblePax;
  
  let color = "red";
  if (isAllComplete) color = "green";
  else if (countComplete > 0 || countPartial > 0) color = "amber";

  return {
    kpi: [{
      label: isAllComplete ? "Asistencia OK" : "",
      value: `✅:${countComplete} ➖:${countPartial} ❌:${countNone}`,
      color: color,
    }],
    tooltip: `ESTADO DE RESPUESTAS (Sobre ${totalEligiblePax} convocados):
    • Completos: ${countComplete} (Respondieron todo lo asignado)
    • Parciales: ${countPartial} (Faltan algunas respuestas)
    • Sin respuesta: ${countNone} (No han respondido nada)`
  };
};

// --- CONFIGURACIÓN ---

const RAW_CALCULATORS = {
  GENERAL: computeGeneralRaw,
  ROSTER: computeRosterRaw,
  ROOMING: computeRoomingRaw,
  TRANSPORTE: computeTransporteRaw,
  VIATICOS: computeViaticosRaw, 
  MEALS_ATTENDANCE: computeMealsRaw, // Solo se calcula en la pestaña de Asistencia
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