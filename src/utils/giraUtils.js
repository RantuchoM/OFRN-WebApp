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
    // Calculamos fuerza individual para esta persona
    const rulesWithStrength = rules.map(r => {
        let strength = 0;
        const pId = String(person.id);
        const pLoc = String(person.id_localidad);
        const pReg = String(person.localidades?.id_region || "");
        
        if ((r.target_ids || []).includes(pId)) strength = 5;
        else if ((r.target_categories || []).length > 0) strength = 4; // Simplificado para utils
        else if ((r.target_localities || []).includes(pLoc)) strength = 3;
        else if ((r.target_regions || []).includes(pReg)) strength = 2;
        else if (r.alcance === 'General') strength = 1;
        
        return { rule: r, strength };
    })
    .filter(item => item.strength > 0)
    .sort((a, b) => a.strength - b.strength);

    let final = {};
    rulesWithStrength.forEach(({ rule: r }) => {
        if (r.fecha_checkin) {
            final.checkin = r.fecha_checkin;
            final.checkin_time = r.hora_checkin;
        }
        if (r.fecha_checkout) {
            final.checkout = r.fecha_checkout;
            final.checkout_time = r.hora_checkout;
        }
    });
    return final;
};