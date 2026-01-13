/**
 * src/utils/giraStatsCalculators.js
 */

// --- HELPER ---
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

// 4. VIÁTICOS (LOGICA DE EXCLUSIÓN MUTUA)
export const computeViaticosRaw = (data) => {
  const { roster } = data;
  if (!roster || !Array.isArray(roster)) return null;

  const meta = roster.viaticosMeta;
  if (!meta) return { kpi: [{ label: "Calc...", value: "-", color: "amber" }] };

  const sedeSet = new Set((meta.sedeIds || []).map(Number));
  
  // Arrays para clasificar a la gente activa
  const potentialIndividualIds = [];
  const poolForLocations = []; // Gente que genera potencial de localidad (Estables/Musicos)

  // 1. CLASIFICACIÓN DE PERSONAL
  roster.forEach(p => {
      // Filtro de actividad
      const estado = normalize(p.estado_gira || p.estado);
      if (estado === "ausente" || estado === "rechazado" || estado === "baja") return;

      const condicion = normalize(p.condicion);
      const rol = normalize(p.rol_gira || p.rol);

      // Regla Individual: (NO es estable) O (rol NO es musico/solista)
      const isEstable = condicion === 'estable';
      const isMusicoOrSolista = rol === 'musico' || rol === 'solista';
      const isIndividual = (!isEstable) || (!isMusicoOrSolista);

      if (isIndividual) {
          potentialIndividualIds.push(p.id);
      } else {
          // Si NO es individual, contribuye al cálculo de localidades/destaques
          poolForLocations.push(p);
      }
  });

  // --- A. CÁLCULO DE INDIVIDUALES ---
  const totalPotentialPeople = potentialIndividualIds.length;
  const exportedPeopleSet = new Set((meta.exportedPeopleIds || []).map(Number));
  // Cuántos de los potenciales individuales están exportados
  const totalExportedPeople = potentialIndividualIds.filter(id => exportedPeopleSet.has(Number(id))).length;


  // --- B. CÁLCULO DE LOCALIDADES (DESTAQUES) ---
  // Solo usamos 'poolForLocations' (excluyendo a los directores/staff/contratados que ya fueron contados arriba)
  const potentialLocsMap = new Map(); // ID -> Nombre

  poolForLocations.forEach(p => {
      // Determinación de localidad (Viático > Residencia)
      let locId = null;
      let locName = "";

      if (p.viaticos && p.viaticos.id) {
          locId = p.viaticos.id;
          locName = p.viaticos.localidad;
      } else if (p.id_loc_viaticos) {
          locId = p.id_loc_viaticos;
          locName = `Loc ${locId}`;
      } else if (p.localidades && p.localidades.id) {
          locId = p.localidades.id;
          locName = p.localidades.localidad;
      } else if (p.id_localidad) {
          locId = p.id_localidad;
          locName = `Loc ${locId}`;
      }

      // Si tiene localidad y NO es Sede, es potencial
      if (locId && !sedeSet.has(Number(locId))) {
          potentialLocsMap.set(Number(locId), locName || "Desconocida");
      }
  });

  const totalPotentialLocations = potentialLocsMap.size;
  const exportedLocSet = new Set((meta.exportedLocationIds || []).map(Number));
  
  // Cuántas de las localidades potenciales están exportadas
  const exportedCount = Array.from(potentialLocsMap.keys()).filter(id => exportedLocSet.has(id)).length;
  
  // Identificar faltantes para tooltip
  const missingLocNames = [];
  potentialLocsMap.forEach((name, id) => {
      if (!exportedLocSet.has(id)) missingLocNames.push(name);
  });


  // --- C. RESULTADO ---
  if (totalPotentialPeople === 0 && totalPotentialLocations === 0) {
      return { kpi: [{ label: "Viáticos N/A", value: "OK", color: "green" }] };
  }

  const peopleComplete = totalExportedPeople >= totalPotentialPeople;
  const locsComplete = exportedCount >= totalPotentialLocations;
  const isFullyComplete = peopleComplete && locsComplete;

  let color = "red";
  if (isFullyComplete) color = "green";
  else if (totalExportedPeople > 0 || exportedCount > 0) color = "amber";

  const valueString = `P:${totalExportedPeople}/${totalPotentialPeople} L:${exportedCount}/${totalPotentialLocations}`;
  
  let tooltip = `ESTADO VIÁTICOS:
  • Individuales: ${totalExportedPeople} exportados de ${totalPotentialPeople}.
  • Localidades: ${exportedCount} exportadas de ${totalPotentialLocations}.`;
  
  if (missingLocNames.length > 0) {
      const displayNames = missingLocNames.slice(0, 3).join(", ");
      const extraCount = missingLocNames.length - 3;
      const extraText = extraCount > 0 ? ` (+${extraCount})` : "";
      tooltip += `\n\nFALTAN LOCALIDADES:\n• ${displayNames}${extraText}`;
  }

  return {
    kpi: [{
      label: isFullyComplete ? "Viáticos OK" : "Pendiente",
      value: valueString,
      color: color,
    }],
    tooltip: tooltip
  };
};

const RAW_CALCULATORS = {
  ROSTER: computeRosterRaw,
  ROOMING: computeRoomingRaw,
  TRANSPORTE: computeTransporteRaw,
  VIATICOS: computeViaticosRaw, 
};

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