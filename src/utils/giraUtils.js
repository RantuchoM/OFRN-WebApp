// src/utils/giraUtils.js

/**
 * Determines if a member is convoked to an event based on tags.
 * @param {Array<string>} convocadosList - Array of event tags (e.g., ["GRP:TUTTI", "LOC:1"])
 * @param {Object} person - Member object processed by useGiraRoster (must have is_local, rol_gira)
 */
export const isUserConvoked = (convocadosList, person) => {
  if (!convocadosList || convocadosList.length === 0) return false;

  return convocadosList.some((tag) => {
    if (tag === "GRP:TUTTI") return true;

    // Check property calculated by the hook
    if (tag === "GRP:LOCALES") return person.is_local;
    if (tag === "GRP:NO_LOCALES") return !person.is_local;

    // Check standardized roles
    if (tag === "GRP:PRODUCCION") {
      // Lista de roles que "comen" con el grupo de Producción
      const rolesProduccion = [
        "produccion",
        "chofer",
        "acompañante",
        "staff",
        "mus_prod",
        "técnico",
      ];

      // Verificamos si el rol de la persona está en esa lista
      return rolesProduccion.includes(person.rol_gira);
    }
    if (tag === "GRP:SOLISTAS") return person.rol_gira === "solista";
    if (tag === "GRP:DIRECTORES") return person.rol_gira === "director";

    // Specific checks
    if (tag.startsWith("LOC:"))
      return person.id_localidad === parseInt(tag.split(":")[1]);
    if (tag.startsWith("FAM:"))
      return person.instrumentos?.familia === tag.split(":")[1];

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
  const rulesWithStrength = rules
    .map((r) => {
      let strength = 0;
      const pId = String(person.id);
      const pLoc = String(person.id_localidad);
      const pReg = String(person.localidades?.id_region || "");

      if ((r.target_ids || []).includes(pId)) strength = 5;
      else if ((r.target_categories || []).length > 0)
        strength = 4; // Simplificado para utils
      else if ((r.target_localities || []).includes(pLoc)) strength = 3;
      else if ((r.target_regions || []).includes(pReg)) strength = 2;
      else if (r.alcance === "General") strength = 1;

      return { rule: r, strength };
    })
    .filter((item) => item.strength > 0)
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

// src/utils/giraUtils.js

// ... (mantén tus funciones existentes como getGiraDates, etc.)

/* --- CONFIGURACIÓN DE TIPOS DE PROGRAMA --- */
export const PROGRAM_TYPES = {
  Sinfónico: {
    label: "Sinfónico",
    color:
      "bg-fixed-indigo-50 text-fixed-indigo-700 border-fixed-indigo-200 ring-fixed-indigo-500/20",
  },
  "Camerata Filarmónica": {
    label: "Camerata",
    color:
      "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200 ring-fuchsia-500/20",
  },
  Ensamble: {
    label: "Ensamble",
    color:
      "bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-500/20",
  },
  "Jazz Band": {
    label: "Jazz Band",
    color: "bg-amber-50 text-amber-700 border-amber-200 ring-amber-500/20",
  },
  Comisión: {
    label: "Comisión",
    color: "bg-sky-100 text-sky-600 border-sky-300 ring-sky-500/20",
  },
  default: {
    label: "General",
    color: "bg-white text-slate-600 border-slate-200",
  },
};

export const getProgramStyle = (type) => {
  return PROGRAM_TYPES[type] || PROGRAM_TYPES["default"];
};

// src/utils/giraUtils.js

/**
 * Verifica si un usuario está convocado a un evento basado en etiquetas y su perfil.
 * @param {Array<string>} convocadosList - Lista de etiquetas (ej: ["GRP:TUTTI", "123"])
 * @param {Object} userProfile - Objeto del usuario (debe tener id, id_localidad, instrumentos, etc.)
 * @param {string} tourRole - Rol del usuario en ESTA gira específica (ej: "solista", "produccion")
 */
export const checkIsConvoked = (convocadosList, userProfile, tourRole) => {
  if (!convocadosList || convocadosList.length === 0) return false;
  if (!userProfile) return false;

  const normalizedRole = (tourRole || "").toLowerCase();
  // Normalizamos familia de instrumento si existe
  const userFamily = userProfile.instrumentos?.familia?.toLowerCase() || "";

  return convocadosList.some((tag) => {
    // 1. Coincidencia directa por ID
    if (tag === String(userProfile.id)) return true;

    // 2. Etiquetas de Grupo
    if (tag === "GRP:TUTTI") return true;
    if (tag === "GRP:LOCALES") return !!userProfile.is_local;
    if (tag === "GRP:NO_LOCALES") return !userProfile.is_local;

    // 3. Etiquetas de Rol en Gira
    if (tag === "GRP:PRODUCCION")
      return (
        normalizedRole === "produccion" || normalizedRole === "coordinacion"
      );
    if (tag === "GRP:STAFF") return normalizedRole === "staff";
    if (tag === "GRP:SOLISTAS") return normalizedRole === "solista";
    if (tag === "GRP:DIRECTORES") return normalizedRole === "director";

    // 4. Etiquetas de Localidad (LOC:123)
    if (tag.startsWith("LOC:")) {
      const locId = parseInt(tag.split(":")[1]);
      return userProfile.id_localidad === locId;
    }

    // 5. Etiquetas de Familia de Instrumento (FAM:Cuerdas)
    if (tag.startsWith("FAM:")) {
      const targetFamily = tag.split(":")[1].toLowerCase();
      return userFamily === targetFamily;
    }

    return false;
  });
};
