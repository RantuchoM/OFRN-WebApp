// src/utils/giraUtils.js

export const normalize = (str) => (str || "").toLowerCase().trim();

/* --- ÚNICA FUENTE DE VERDAD: CATEGORÍAS Y ROLES (GRP) --- */

/** Categorías estándar para convocatoria y roster. No inventar nuevos. */
export const ROSTER_CATEGORIES = {
  TUTTI: "GRP:TUTTI",
  SOLISTAS: "GRP:SOLISTAS",
  DIRECTORES: "GRP:DIRECTORES",
  PRODUCCION: "GRP:PRODUCCION",
  STAFF: "GRP:STAFF",
  LOCALES: "GRP:LOCALES",
  NO_LOCALES: "GRP:NO_LOCALES",
};

/** Roles de la tabla `roles` que pertenecen al grupo Producción (convocatoria GRP:PRODUCCION). */
export const ROLES_PRODUCCION = [
  "produccion",
  "chofer",
  "acompañante",
  "staff",
  "mus_prod",
  "técnico",
];

/** Rol por defecto cuando no está asignado (ID de tabla roles). */
export const DEFAULT_ROL_ID = "musico";

/** Cargo por defecto para exportaciones (label de visualización). */
export const DEFAULT_CARGO = "Músico";

/**
 * Determines if a member is convoked to an event based on tags.
 * @param {Array<string>} convocadosList - Array of event tags (e.g., ["GRP:TUTTI", "LOC:1"])
 * @param {Object} person - Member object processed by useGiraRoster (must have is_local, rol_gira)
 */
export const isUserConvoked = (convocadosList, person) => {
  if (!convocadosList || convocadosList.length === 0) return false;

  return convocadosList.some((tag) => {
    if (tag === ROSTER_CATEGORIES.TUTTI) return true;

    if (tag === ROSTER_CATEGORIES.LOCALES) return person.is_local;
    if (tag === ROSTER_CATEGORIES.NO_LOCALES) return !person.is_local;

    if (tag === ROSTER_CATEGORIES.PRODUCCION)
      return ROLES_PRODUCCION.includes(person.rol_gira);
    if (tag === ROSTER_CATEGORIES.SOLISTAS) return person.rol_gira === "solista";
    if (tag === ROSTER_CATEGORIES.DIRECTORES)
      return person.rol_gira === "director";
    if (tag === ROSTER_CATEGORIES.STAFF) return person.rol_gira === "staff";

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

/* --- MOTOR DE REGLAS DE LOGÍSTICA --- */

/** Categoría logística según rol (usa p.rol de giras_integrantes o rol_gira). */
export const getCategoriaLogistica = (person) => {
  const rol = normalize(person?.rol ?? person?.rol_gira ?? "musico");
  if (rol === "solista") return "SOLISTAS";
  if (rol === "director") return "DIRECTORES";
  if (rol === "produccion") return "PRODUCCION";
  if (rol === "staff") return "STAFF";
  return person?.is_local ? "LOCALES" : "NO_LOCALES";
};

/** Fuerza del match para ordenar reglas. Si estado_gira === 'ausente', siempre 0. */
export const getMatchStrength = (rule, person, allLocalities = []) => {
  if (!rule || !person) return 0;
  if (normalize(person.estado_gira) === "ausente") return 0;

  const pId = String(person.id ?? person.id_integrante);
  const pLoc = person.id_localidad ? String(person.id_localidad) : "";
  const pCat = getCategoriaLogistica(person);

  const locInfo = allLocalities.find((l) => String(l.id) === pLoc);
  const pReg = String(
    person.id_region ??
      person.localidades?.id_region ??
      locInfo?.id_region ??
      "",
  );

  if ((rule.target_ids || []).map(String).includes(pId)) return 5;
  if (
    normalize(rule.alcance) === "persona" &&
    String(rule.id_integrante) === pId
  )
    return 5;

  if ((rule.target_categories || []).includes(pCat)) return 4;
  if (
    normalize(rule.alcance) === "categoria" ||
    normalize(rule.alcance) === "instrumento"
  ) {
    if (
      normalize(rule.instrumento_familia) ===
      normalize(person.instrumentos?.familia)
    )
      return 4;
  }

  if ((rule.target_localities || []).map(String).includes(pLoc)) return 3;
  if (
    normalize(rule.alcance) === "localidad" &&
    String(rule.id_localidad) === pLoc
  )
    return 3;

  if ((rule.target_regions || []).map(String).includes(pReg)) return 2;
  if (normalize(rule.alcance) === "region" && String(rule.id_region) === pReg)
    return 2;

  if (normalize(rule.alcance) === "general") return 1;
  return 0;
};

/**
 * Verifica si una regla aplica a la persona.
 * Si regla es General/Localidad/Region Y transporte físico Y person.condicion !== 'estable', retorna false.
 */
export const matchesRule = (rule, person, allLocalities = []) => {
  if (!rule || !person) return false;
  if (normalize(person.estado_gira) === "ausente") return false;

  const scope = normalize(rule.alcance);
  const pId = String(person.id ?? person.id_integrante);
  const pLoc = person.id_localidad ? String(person.id_localidad) : "";
  const pRole = normalize(person.rol ?? person.rol_gira ?? "musico");
  const pCondicion = normalize(person.condicion ?? "");

  const locInfo = allLocalities.find((l) => String(l.id) === pLoc);
  const pReg = String(
    person.id_region ??
      person.localidades?.id_region ??
      locInfo?.id_region ??
      "",
  );

  const isTransportRule = "id_transporte_fisico" in rule;
  if (isTransportRule && ["general", "region", "localidad"].includes(scope)) {
    const isStaff = ["produccion", "staff", "director", "chofer"].includes(
      pRole,
    );
    if (isStaff || pCondicion !== "estable") return false;
  }

  if ((rule.target_ids || []).map(String).includes(pId)) return true;
  if ((rule.target_regions || []).map(String).includes(pReg)) return true;
  if ((rule.target_localities || []).map(String).includes(pLoc)) return true;
  if ((rule.target_categories || []).includes(getCategoriaLogistica(person)))
    return true;

  if (scope === "general") return true;
  if (scope === "persona" && String(rule.id_integrante) === pId) return true;
  if (scope === "region" && String(rule.id_region) === pReg) return true;
  if (scope === "localidad" && String(rule.id_localidad) === pLoc) return true;
  if (scope === "categoria" || scope === "instrumento") {
    const family = person.instrumentos?.familia;
    return normalize(rule.instrumento_familia) === normalize(family);
  }
  return false;
};

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
    if (tag === String(userProfile.id)) return true;

    if (tag === ROSTER_CATEGORIES.TUTTI) return true;
    if (tag === ROSTER_CATEGORIES.LOCALES) return !!userProfile.is_local;
    if (tag === ROSTER_CATEGORIES.NO_LOCALES) return !userProfile.is_local;

    if (tag === ROSTER_CATEGORIES.PRODUCCION)
      return (
        normalizedRole === "produccion" || normalizedRole === "coordinacion"
      );
    if (tag === ROSTER_CATEGORIES.STAFF) return normalizedRole === "staff";
    if (tag === ROSTER_CATEGORIES.SOLISTAS) return normalizedRole === "solista";
    if (tag === ROSTER_CATEGORIES.DIRECTORES)
      return normalizedRole === "director";

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
