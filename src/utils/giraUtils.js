// src/utils/giraUtils.js

/**
 * Determines if a member is convoked to an event based on tags.
 * @param {Array<string>} convocadosList - Array of event tags (e.g., ["GRP:TUTTI", "LOC:1"])
 * @param {Object} person - Member object processed by useGiraRoster (must have is_local, rol_gira)
 */
export const isUserConvoked = (convocadosList, person) => {
  if (!convocadosList || convocadosList.length === 0) return false;
  
  return convocadosList.some(tag => {
    if (tag === "GRP:TUTTI") return true;
    
    // Check property calculated by the hook
    if (tag === "GRP:LOCALES") return person.is_local;
    if (tag === "GRP:NO_LOCALES") return !person.is_local;
    
    // Check standardized roles
    if (tag === "GRP:PRODUCCION") return person.rol_gira === 'produccion';
    if (tag === "GRP:SOLISTAS") return person.rol_gira === 'solista';
    if (tag === "GRP:DIRECTORES") return person.rol_gira === 'director';
    
    // Specific checks
    if (tag.startsWith("LOC:")) return person.id_localidad === parseInt(tag.split(":")[1]);
    if (tag.startsWith("FAM:")) return person.instrumentos?.familia === tag.split(":")[1];
    
    return false;
  });
};

/**
 * Calculates Check-in/Check-out and logistics based on rules.
 * @param {Object} person - Member object
 * @param {Array} rules - Array of logistics rules (giras_logistica_reglas)
 */
export const calculateLogisticsForMusician = (person, rules) => {
    const applicable = rules.filter(r => {
        const scope = r.alcance === 'Instrumento' ? 'Categoria' : r.alcance;
        if (scope === 'General') return true;
        
        const targets = r.target_ids || [];
        
        if (scope === 'Persona' && targets.includes(person.id)) return true;
        if (scope === 'Localidad' && targets.includes(person.id_localidad)) return true;
        if (scope === 'Region' && person.localidades?.id_region && targets.includes(person.localidades.id_region)) return true;
        
        if (scope === 'Categoria') {
            const role = person.rol_gira || 'musico';
            if (targets.includes('SOLISTAS') && role === 'solista') return true;
            if (targets.includes('DIRECTORES') && role === 'director') return true;
            if (targets.includes('PRODUCCION') && role === 'produccion') return true;
            if (targets.includes('LOCALES') && person.is_local) return true;
            if (targets.includes('NO_LOCALES') && !person.is_local) return true;
        }
        return false;
    });

    // Sort by priority (higher priority overwrites)
    applicable.sort((a, b) => a.prioridad - b.prioridad);

    let final = {};
    applicable.forEach(r => {
        if(r.fecha_checkin) final.checkin = r.fecha_checkin;
        if(r.hora_checkin) final.checkin_time = r.hora_checkin;
        if(r.fecha_checkout) final.checkout = r.fecha_checkout;
        if(r.hora_checkout) final.checkout_time = r.hora_checkout;
    });
    return final;
};