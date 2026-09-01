// src/utils/giraUtils.js

import { resolveLocalidadResidencia } from "./integranteDomicilioViaticos";
import { integranteKey } from "./integranteIds";
import {
  isLocalAt,
  isLocalAtMealSlot,
  isLocalForTramoIndex,
} from "./giraTramos";

const MEAL_RULE_FIELDS = new Set(["comida_inicio", "comida_fin"]);

export const normalize = (str) => (str || "").toLowerCase().trim();

/**
 * ¿La persona matchea un tag de convocatoria `LOC:<id>`?
 * Usa **residencia** (no viáticos): `id_localidad_residencia` / `resolveLocalidadResidencia`.
 */
export const personMatchesLocConvocadoTag = (person, tag) => {
  if (!person || !tag || !String(tag).startsWith("LOC:")) return false;
  const locId = String(tag).slice(4);
  if (!locId) return false;

  const resId = resolveLocalidadResidencia(person).id;
  if (resId != null && !Number.isNaN(Number(resId)) && String(resId) === locId) {
    return true;
  }

  if (
    person.id_localidad_residencia != null &&
    person.id_localidad_residencia !== "" &&
    String(person.id_localidad_residencia) === locId
  ) {
    return true;
  }

  // Campos enriquecidos de roster/logística (pueden no estar en resolveLocalidadResidencia).
  const nestedIds = [
    person.localidades_residencia?.id,
    person._loc_residencia?.id,
    person.residencia?.id,
  ];
  if (nestedIds.some((id) => id != null && id !== "" && String(id) === locId)) {
    return true;
  }

  return false;
};

/**
 * ¿La persona matchea un tag `ENS:<id_ensamble>` por membresía vigente en el roster?
 */
export const personMatchesEnsConvocadoTag = (person, tag) => {
  if (!person || !tag || !String(tag).startsWith("ENS:")) return false;
  const ensId = String(tag).slice(4);
  if (!ensId) return false;

  if (
    (person.ensambles || []).some(
      (e) => e?.id != null && String(e.id) === ensId,
    )
  ) {
    return true;
  }

  return (person.integrantes_ensambles || []).some((ie) => {
    const id = ie?.id_ensamble ?? ie?.ensambles?.id;
    return id != null && String(id) === ensId;
  });
};

/** Subidas/bajadas y admisión por territorio usan residencia, no viáticos. */
export const isTransportTerritoryRule = (rule) =>
  Boolean(
    rule &&
      ("id_transporte_fisico" in rule ||
        rule.id_evento_subida != null ||
        rule.id_evento_bajada != null),
  );

/** Id de localidad y región para matchear una regla (residencia vs viáticos). */
export const resolvePersonTerritoryIds = (person, rule, allLocalities = []) => {
  if (!person) return { pLoc: "", pReg: "" };

  if (isTransportTerritoryRule(rule)) {
    const locRes = resolveLocalidadResidencia(person);
    // Ignorar "" / null: si el mock puso id_localidad_residencia vacío, cae a
    // resolveLocalidadResidencia / id_localidad (residencia real del integrante).
    const rawResidenciaField = person.id_localidad_residencia;
    const rawLoc =
      rawResidenciaField != null && String(rawResidenciaField).trim() !== ""
        ? rawResidenciaField
        : (locRes.id ?? person.id_localidad);
    const pLoc =
      rawLoc != null && rawLoc !== "" ? String(rawLoc) : "";
    const resObj =
      person.localidades_residencia ||
      locRes.objeto ||
      person._loc_residencia ||
      person.residencia ||
      null;
    const locFromCatalog = allLocalities.find((l) => String(l.id) === pLoc);
    const pReg = String(
      person.id_region_residencia ??
        resObj?.id_region ??
        resObj?.regiones?.id ??
        locFromCatalog?.id_region ??
        "",
    );
    return { pLoc, pReg };
  }

  const pLoc = person.id_localidad ? String(person.id_localidad) : "";
  const locInfo = allLocalities.find((l) => String(l.id) === pLoc);
  const pReg = String(
    person.id_region ??
      person.localidades?.id_region ??
      locInfo?.id_region ??
      "",
  );
  return { pLoc, pReg };
};

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
  "iluminacion",
];

/** Rol por defecto cuando no está asignado (ID de tabla roles). */
export const DEFAULT_ROL_ID = "musico";

/** Cargo por defecto para exportaciones (label de visualización). */
export const DEFAULT_CARGO = "Músico";

const getInstrumentRel = (member) => {
  const rel = member?.instrumentos;
  if (Array.isArray(rel)) return rel[0] ?? null;
  return rel ?? null;
};

/** Nombre de instrumento del integrante (tabla `instrumentos`). */
export const getInstrumentNameFromMember = (member) =>
  getInstrumentRel(member)?.instrumento ?? "";

/** Familia de instrumento del integrante. */
export const getInstrumentFamilyFromMember = (member) =>
  getInstrumentRel(member)?.familia ?? "";

/** ID de instrumento de ficha (sin override de gira). */
export const getProfileInstrumentId = (member) => {
  const fromField = member?.id_instr_perfil;
  if (fromField != null && String(fromField).trim() !== "") {
    return String(fromField).trim();
  }
  const fromMember = member?.id_instr;
  if (fromMember != null && String(fromMember).trim() !== "") {
    return String(fromMember).trim();
  }
  return null;
};

/** Override explícito de instrumento en giras_integrantes (null = usar ficha). */
export const getGiraInstrumentOverrideId = (member) => {
  const raw = member?.id_instr_gira_override;
  if (raw == null || String(raw).trim() === "") return null;
  return String(raw).trim();
};

/** ID efectivo para roster/seating: override de gira o ficha. */
export const getEffectiveInstrumentId = (member) =>
  getGiraInstrumentOverrideId(member) ?? getProfileInstrumentId(member);

/** Resuelve fila de catálogo `instrumentos` por id. */
export const resolveInstrumentFromCatalog = (instrumentId, catalog = []) => {
  if (instrumentId == null || String(instrumentId).trim() === "") return null;
  const key = String(instrumentId).trim();
  const list = Array.isArray(catalog) ? catalog : [];
  return list.find((row) => String(row.id) === key) ?? null;
};

/**
 * Aplica instrumento efectivo de gira sobre el integrante (mutación de id_instr + instrumentos).
 * @param {object} member - fila con join instrumentos de ficha
 * @param {string|null} giraOverrideId - giras_integrantes.id_instr
 * @param {Array} instrumentCatalog - catálogo completo instrumentos
 */
export const applyEffectiveGiraInstrument = (
  member,
  giraOverrideId,
  instrumentCatalog = [],
) => {
  const idInstrPerfil = member?.id_instr ?? null;
  const idInstrGiraOverride =
    giraOverrideId != null && String(giraOverrideId).trim() !== ""
      ? String(giraOverrideId).trim()
      : null;
  const effectiveId = idInstrGiraOverride ?? idInstrPerfil;
  const profileInstrument = getInstrumentRel(member);
  const catalogRow = resolveInstrumentFromCatalog(effectiveId, instrumentCatalog);
  const effectiveInstrument = catalogRow
    ? {
        instrumento: catalogRow.instrumento,
        familia: catalogRow.familia,
        abreviatura:
          catalogRow.abreviatura ?? profileInstrument?.abreviatura ?? null,
        plaza_extra: catalogRow.plaza_extra ?? profileInstrument?.plaza_extra ?? null,
        rol_gira_default:
          catalogRow.rol_gira_default ?? profileInstrument?.rol_gira_default ?? null,
      }
    : profileInstrument;

  return {
    ...member,
    id_instr_perfil: idInstrPerfil,
    id_instr_gira_override: idInstrGiraOverride,
    id_instr: effectiveId,
    instrumentos: effectiveInstrument,
  };
};

/** Payload base para upsert en giras_integrantes preservando override de instrumento. */
export const buildGiraIntegranteUpsert = (giraId, musician, fields = {}) => {
  const payload = {
    id_gira: giraId,
    id_integrante: musician.id,
    ...fields,
  };
  if (!("rol" in fields) && musician.rol_gira != null) {
    payload.rol = musician.rol_gira;
  }
  if (!("estado" in fields) && musician.estado_gira != null) {
    payload.estado = musician.estado_gira;
  }
  if (!("id_instr" in fields) && musician.id_instr_gira_override != null) {
    payload.id_instr = musician.id_instr_gira_override;
  }
  return payload;
};

/** Mapa `giraId:integranteId` → id_instr override (solo filas con override explícito). */
export const buildGiraInstrumentOverrideMap = (rows = []) => {
  const map = new Map();
  for (const row of rows) {
    if (row?.id_instr == null || String(row.id_instr).trim() === "") continue;
    if (row.id_gira == null || row.id_integrante == null) continue;
    map.set(
      `${row.id_gira}:${row.id_integrante}`,
      String(row.id_instr).trim(),
    );
  }
  return map;
};

/** Instrumento efectivo de un integrante en una gira concreta. */
export const getEffectiveInstrumentIdForGiraMember = (
  integranteId,
  giraId,
  profileInstrId,
  overrideMap = new Map(),
) => {
  const key = `${giraId}:${integranteId}`;
  const override = overrideMap.get(key);
  if (override) return override;
  if (profileInstrId == null || String(profileInstrId).trim() === "") {
    return null;
  }
  return String(profileInstrId).trim();
};

/**
 * Enriquece un integrante para matriz multi-gira: instrumento mostrado según
 * overrides en los programas visibles donde está en roster.
 */
export const buildMatrixIntegranteInstrumentDisplay = (
  integrante,
  filteredProgramas,
  rosterByGiraId,
  overrideMap,
  catalog = [],
) => {
  const iid = integranteKey(integrante.id);
  const profileId =
    integrante.id_instr != null ? String(integrante.id_instr).trim() : null;
  const effectiveIds = [];

  for (const programa of filteredProgramas || []) {
    const roster = rosterByGiraId[programa.id];
    const inRoster =
      roster?.counted?.has(iid) || roster?.preAlta?.has(iid);
    if (!inRoster) continue;
    const eff = getEffectiveInstrumentIdForGiraMember(
      iid,
      programa.id,
      profileId,
      overrideMap,
    );
    if (eff) effectiveIds.push(eff);
  }

  const uniqueIds = [...new Set(effectiveIds)];
  if (uniqueIds.length === 0) {
    return applyEffectiveGiraInstrument(integrante, null, catalog);
  }

  uniqueIds.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  const sortId = uniqueIds[0];
  const names = uniqueIds.map(
    (id) => resolveInstrumentFromCatalog(id, catalog)?.instrumento || `#${id}`,
  );
  const primary = resolveInstrumentFromCatalog(sortId, catalog);
  const singleOverride =
    uniqueIds.length === 1 && uniqueIds[0] !== profileId
      ? uniqueIds[0]
      : null;

  const base = applyEffectiveGiraInstrument(
    integrante,
    singleOverride,
    catalog,
  );

  if (names.length <= 1) return base;

  return {
    ...base,
    instrumentos: {
      ...(base.instrumentos || {}),
      instrumento: names.join(" / "),
    },
  };
};

/** Orden orquestal por código de instrumento (texto, p. ej. 01–04). */
export const compareInstrumentIds = (a, b) => {
  const sa = a != null && String(a).trim() !== "" ? String(a).trim() : "zzzz";
  const sb = b != null && String(b).trim() !== "" ? String(b).trim() : "zzzz";
  return sa.localeCompare(sb, undefined, { numeric: true });
};

/** Rol de gira por defecto configurado en `instrumentos.rol_gira_default`. */
export const getInstrumentDefaultTourRoleFromMember = (member) => {
  const roleId = getInstrumentRel(member)?.rol_gira_default;
  if (roleId == null || String(roleId).trim() === "") return null;
  return String(roleId).trim();
};

const hasProductionEnsemble = (member) => {
  const rows = Array.isArray(member?.integrantes_ensambles)
    ? member.integrantes_ensambles
    : [];
  return rows.some((row) => {
    const ensRel = Array.isArray(row?.ensambles)
      ? row.ensambles[0]
      : row?.ensambles;
    return normalize(ensRel?.ensamble) === "produccion";
  });
};

/**
 * Rol de gira por defecto: `instrumentos.rol_gira_default`, luego ensamble producción, sino músico.
 */
export const inferDefaultTourRole = (member) => {
  const fromInstrument = getInstrumentDefaultTourRoleFromMember(member);
  if (fromInstrument) return fromInstrument;

  if (hasProductionEnsemble(member)) return "produccion";

  return DEFAULT_ROL_ID;
};

/**
 * Rol efectivo en gira: override de `giras_integrantes.rol` o inferencia por perfil.
 */
export const resolveTourRoleOverride = (manualRole, member, fallbackRole) => {
  const normalizedManualRole = normalize(manualRole);
  const fallback = fallbackRole || inferDefaultTourRole(member);

  if (!normalizedManualRole) return fallback;

  const instrumentDefault = getInstrumentDefaultTourRoleFromMember(member);
  if (instrumentDefault && normalizedManualRole === DEFAULT_ROL_ID) {
    return instrumentDefault;
  }

  if (hasProductionEnsemble(member) && normalizedManualRole === DEFAULT_ROL_ID) {
    return "produccion";
  }

  return manualRole;
};

/**
 * Determines if a member is convoked to an event based on tags.
 * @param {Array<string>} convocadosList - Array of event tags (e.g., ["GRP:TUTTI", "LOC:1", "ENS:3"])
 * @param {Object} person - Member object processed by useGiraRoster (must have is_local, rol_gira)
 * @param {{ hospedajeExcluidosIds?: Array<number|string>, cunaExcluidosIds?: Array<number|string>, fecha?: string, servicio?: string, segments?: Array, hora?: string }} [opts] - `hospedajeExcluidosIds`: "GRP:NO_LOCALES" (Solo alojados) excluye "No alojados". Bebés en cuna (`en_cuna` / `ocupa_cama: false` / `cunaExcluidosIds`) quedan fuera de **cualquier** tag. `LOC:` = residencia; `ENS:` = membresía de ensamble.
 */
function personIsLocalForConvocado(person, opts) {
  const { fecha, servicio, segments, hora } = opts;
  if (segments?.length > 0 && fecha) {
    return isLocalAtMealSlot(
      person,
      fecha,
      servicio || "Almuerzo",
      segments,
      hora,
    );
  }
  return Boolean(person.is_local);
}

export const isUserConvoked = (convocadosList, person, opts = {}) => {
  if (!convocadosList || convocadosList.length === 0) return false;
  if (!person) return false;

  // Bebé en cuna (rooming): no consume → nunca convocado a comidas / eventos por tags.
  if (person.en_cuna === true || person.ocupa_cama === false) return false;
  const personId = person.id ?? person.id_integrante;
  if (
    opts.cunaExcluidosIds?.length &&
    opts.cunaExcluidosIds.some((id) => String(id) === String(personId))
  ) {
    return false;
  }

  const hospedajeExcluidosIds = opts.hospedajeExcluidosIds;
  const excluidosHotel =
    hospedajeExcluidosIds != null && hospedajeExcluidosIds.length > 0
      ? new Set(hospedajeExcluidosIds.map((id) => Number(id)))
      : null;

  const rol = normalize(person.rol_gira ?? person.rol);
  const userFamily = normalize(person.instrumentos?.familia);

  return convocadosList.some((tag) => {
    // Convocatoria personal por ID numérico (tags legacy sin prefijo).
    if (personId != null && String(tag) === String(personId)) return true;

    if (tag === ROSTER_CATEGORIES.TUTTI) return true;

    if (tag === ROSTER_CATEGORIES.LOCALES)
      return personIsLocalForConvocado(person, opts);
    if (tag === ROSTER_CATEGORIES.NO_LOCALES) {
      if (personIsLocalForConvocado(person, opts)) return false;
      if (excluidosHotel?.has(Number(personId))) return false;
      return true;
    }

    if (tag === ROSTER_CATEGORIES.PRODUCCION)
      return ROLES_PRODUCCION.includes(rol) || rol === "coordinacion";
    if (tag === ROSTER_CATEGORIES.SOLISTAS) return rol === "solista";
    if (tag === ROSTER_CATEGORIES.DIRECTORES) return rol === "director";
    if (tag === ROSTER_CATEGORIES.STAFF) return rol === "staff";

    if (tag.startsWith("LOC:"))
      return personMatchesLocConvocadoTag(person, tag);
    if (tag.startsWith("ENS:"))
      return personMatchesEnsConvocadoTag(person, tag);
    if (tag.startsWith("FAM:"))
      return userFamily === normalize(tag.split(":")[1]);

    return false;
  });
};

/* --- MOTOR DE REGLAS DE LOGÍSTICA --- */

/** Roles de producción / staff que no entran en EXTERNOS. */
const ROLES_EXCLUIDOS_EXTERNOS = new Set([
  "staff",
  "produccion",
  "mus_prod",
  "director",
  "chofer",
]);

/** Roles que mapean a categoría logística `PRODUCCION` (reglas hotelería, comidas, transporte). */
export const ROLES_CATEGORIA_LOGISTICA_PRODUCCION = Object.freeze([
  "produccion",
  "chofer",
  "mus_prod",
]);

const ROLES_CATEGORIA_LOGISTICA_PRODUCCION_SET = new Set(
  ROLES_CATEGORIA_LOGISTICA_PRODUCCION,
);

/**
 * Categoría logística según rol, condición y sede local de la gira (`is_local`).
 * EXTERNOS: contratados / no planta estable, no residentes locales, no staff-producción.
 */
export const getCategoriaLogistica = (person) => {
  const rol = normalize(person?.rol ?? person?.rol_gira ?? "musico");
  const condicion = normalize(
    person?.condicion ?? person?.integrantes?.condicion ?? "",
  );

  if (rol === "solista") return "SOLISTAS";
  if (rol === "director") return "DIRECTORES";
  if (ROLES_CATEGORIA_LOGISTICA_PRODUCCION_SET.has(rol)) return "PRODUCCION";
  if (rol === "staff") return "STAFF";

  const isPlantaEstable = condicion === "estable";
  const isLocal = Boolean(person?.is_local);

  if (
    !ROLES_EXCLUIDOS_EXTERNOS.has(rol) &&
    !isPlantaEstable &&
    !isLocal
  ) {
    return "EXTERNOS";
  }

  return isLocal ? "LOCALES" : "NO_LOCALES";
};

const RULE_FIELD_INSTANT = {
  checkin: {
    event: "id_evento_checkin",
    date: "fecha_checkin",
    time: "hora_checkin",
  },
  checkout: {
    event: "id_evento_checkout",
    date: "fecha_checkout",
    time: "hora_checkout",
  },
  comida_inicio: {
    event: "id_evento_comida_inicio",
    date: "comida_inicio_fecha",
    time: null,
  },
  comida_fin: {
    event: "id_evento_comida_fin",
    date: "comida_fin_fecha",
    time: null,
  },
};

/** Fecha/hora del hito asociado a un campo de regla logística (check-in, check-out, comidas). */
export const resolveRuleFieldInstant = (rule, field, allEvents = []) => {
  if (!rule || !field) return null;
  const cfg = RULE_FIELD_INSTANT[field];
  if (!cfg) return null;

  if (rule[cfg.event]) {
    const linked = (allEvents || []).find(
      (e) => String(e.id) === String(rule[cfg.event]),
    );
    if (linked?.fecha) {
      return {
        fecha: linked.fecha,
        hora: linked.hora_inicio || linked.hora || "12:00",
      };
    }
  }

  if (rule[cfg.date]) {
    const rawTime = cfg.time ? rule[cfg.time] : null;
    const hora =
      rawTime && String(rawTime).includes(":")
        ? String(rawTime).slice(0, 5)
        : "12:00";
    return { fecha: rule[cfg.date], hora };
  }

  return null;
};

/** Mejor instante disponible en la regla (check-in → check-out → comidas). */
export const resolveRulePrimaryInstant = (rule, allEvents = []) => {
  for (const field of [
    "checkin",
    "checkout",
    "comida_inicio",
    "comida_fin",
  ]) {
    const instant = resolveRuleFieldInstant(rule, field, allEvents);
    if (instant?.fecha) return instant;
  }
  return null;
};

/** ¿Es local en el instante del hito? Con segmentos usa tramo activo; si no, flag del roster. */
export const personIsLocalAtHit = (person, segments, instant) => {
  if (segments?.length && instant?.fecha) {
    return isLocalAt(person, instant, segments);
  }
  return Boolean(person?.is_local);
};

/**
 * LOCALE/NO_LOCALES en reglas de comida: localía del tramo 0 (sede del viaje),
 * no la del instante del servicio. Hotel/bus siguen usando el instante del hito.
 */
export const resolveIsLocalForLogisticsCategory = (
  person,
  segments,
  instant,
  field = null,
) => {
  if (MEAL_RULE_FIELDS.has(field) && segments?.length) {
    return isLocalForTramoIndex(person, segments, 0);
  }
  return personIsLocalAtHit(person, segments, instant);
};

/** Regla con hitos de comida configurados (para preview de chips). */
export const ruleHasMealMilestones = (rule) =>
  Boolean(
    rule?.id_evento_comida_inicio ||
      rule?.comida_inicio_fecha ||
      rule?.id_evento_comida_fin ||
      rule?.comida_fin_fecha,
  );

/**
 * Compatibilidad de categorías para reglas logísticas.
 * "NO_LOCALES" debe abarcar también perfiles clasificados como "EXTERNOS".
 * Locales / No locales: hotel y bus al instante del hito; comidas al tramo 0.
 */
const categoryMatches = (
  ruleCategory,
  personCategory,
  person = null,
  context = {},
) => {
  if (!ruleCategory || !personCategory) return false;
  const { segments, instant, field } = context;
  if (ruleCategory === "LOCALES" || ruleCategory === "NO_LOCALES") {
    const isLocal = resolveIsLocalForLogisticsCategory(
      person,
      segments,
      instant,
      field,
    );
    if (ruleCategory === "LOCALES") return isLocal;
    if (personCategory === "EXTERNOS") return true;
    return !isLocal;
  }
  // Reglas antiguas con categoría CHOFER (choferes ahora son PRODUCCION).
  if (ruleCategory === "CHOFER") {
    const rol = normalize(person?.rol ?? person?.rol_gira ?? "");
    return rol === "chofer";
  }
  if (ruleCategory === personCategory) return true;
  if (ruleCategory === "NO_LOCALES" && personCategory === "EXTERNOS")
    return true;
  return false;
};

/** Fuerza del match para ordenar reglas. Si estado_gira === 'ausente', siempre 0. */
export const getMatchStrength = (
  rule,
  person,
  allLocalities = [],
  options = {},
) => {
  if (!rule || !person) return 0;
  if (normalize(person.estado_gira) === "ausente") return 0;

  const { segments, instant, field } = options;
  const categoryContext = { segments, instant, field };

  const pId = String(person.id ?? person.id_integrante);
  const { pLoc, pReg } = resolvePersonTerritoryIds(person, rule, allLocalities);
  const pCat = getCategoriaLogistica(person);

  // target_ids en alcance Persona = id integrante; en Categoria = nombre de categoría
  // logística (SOLISTAS, …). No confundir ambos.
  if (
    normalize(rule.alcance) === "persona" &&
    ((rule.target_ids || []).map(String).includes(pId) ||
      String(rule.id_integrante) === pId)
  )
    return 5;
  if (
    normalize(rule.alcance) !== "categoria" &&
    normalize(rule.alcance) !== "instrumento" &&
    (rule.target_ids || []).map(String).includes(pId)
  )
    return 5;

  if (
    (rule.target_categories || []).some((cat) =>
      categoryMatches(cat, pCat, person, categoryContext),
    )
  )
    return 4;
  if (
    normalize(rule.alcance) === "categoria" ||
    normalize(rule.alcance) === "instrumento"
  ) {
    if (
      rule.instrumento_familia &&
      normalize(rule.instrumento_familia) ===
        normalize(person.instrumentos?.familia)
    )
      return 4;
    // StopRulesManager guarda categoría logística en target_ids (p.ej. SOLISTAS)
    const cats = rule.target_ids || [];
    if (
      cats.some(
        (cat) =>
          normalize(cat) === normalize(pCat) ||
          categoryMatches(cat, pCat, person, categoryContext),
      )
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
 * Desempate entre reglas de misma fuerza (nivel 4 categoría).
 * Rol explícito (p. ej. PRODUCCION) prima sobre chips geográficos (NO_LOCALES / LOCALES).
 */
const LOGISTICS_CATEGORY_TIEBREAK = {
  PRODUCCION: 90,
  CHOFER: 90,
  DIRECTORES: 85,
  SOLISTAS: 80,
  STAFF: 75,
  EXTERNOS: 50,
  NO_LOCALES: 10,
  LOCALES: 10,
};

export const getRuleCategoryTiebreak = (rule, person, options = {}) => {
  const categories = rule?.target_categories || [];
  if (!rule || !person || categories.length === 0) return 0;

  const { segments, instant, field } = options;
  const categoryContext = { segments, instant, field };
  const pCat = getCategoriaLogistica(person);

  let max = 0;
  for (const cat of categories) {
    if (!categoryMatches(cat, pCat, person, categoryContext)) continue;
    if (cat === pCat) {
      max = Math.max(max, LOGISTICS_CATEGORY_TIEBREAK[cat] ?? 60);
      continue;
    }
    if (cat === "LOCALES" || cat === "NO_LOCALES") {
      max = Math.max(max, LOGISTICS_CATEGORY_TIEBREAK[cat] ?? 10);
      continue;
    }
    max = Math.max(max, LOGISTICS_CATEGORY_TIEBREAK[cat] ?? 40);
  }
  return max;
};

/** Orden ascendente: la última regla del array gana (mayor fuerza → mayor tiebreak → mayor índice). */
export const compareLogisticsRulePrecedence = (a, b) => {
  const strengthA = a.strength ?? a.s ?? 0;
  const strengthB = b.strength ?? b.s ?? 0;
  if (strengthA !== strengthB) return strengthA - strengthB;

  const tieA = a.categoryTiebreak ?? a.tie ?? 0;
  const tieB = b.categoryTiebreak ?? b.tie ?? 0;
  if (tieA !== tieB) return tieA - tieB;

  return (a.idx ?? 0) - (b.idx ?? 0);
};

/**
 * Verifica si una regla aplica a la persona.
 * Reglas de transporte (General / Región / Localidad): no aplican solo a
 * producción, staff o chofer. En alcance Localidad, además de músicos,
 * aplican a solistas y directores con residencia en alguna localidad objetivo
 * de la regla (`id_localidad` o `target_localities`).
 */
export const matchesRule = (
  rule,
  person,
  allLocalities = [],
  options = {},
) => {
  if (!rule || !person) return false;
  if (normalize(person.estado_gira) === "ausente") return false;

  const { segments, instant, field } = options;
  const categoryContext = { segments, instant, field };

  const scope = normalize(rule.alcance);
  const pId = String(person.id ?? person.id_integrante);
  const { pLoc, pReg } = resolvePersonTerritoryIds(person, rule, allLocalities);
  const pRole = normalize(person.rol ?? person.rol_gira ?? "musico");

  const isTransportRule = "id_transporte_fisico" in rule;
  if (isTransportRule && ["general", "region", "localidad"].includes(scope)) {
    const isStaffOnly = ["produccion", "staff", "chofer"].includes(pRole);
    if (isStaffOnly) return false;

    if (scope === "localidad") {
      const ruleLocalityIds = new Set();
      if (rule.id_localidad != null && String(rule.id_localidad).trim() !== "") {
        ruleLocalityIds.add(String(rule.id_localidad).trim());
      }
      (rule.target_localities || []).forEach((id) => {
        if (id != null && String(id).trim() !== "")
          ruleLocalityIds.add(String(id).trim());
      });
      if (ruleLocalityIds.size > 0) {
        const atRuleLocality = Boolean(pLoc) && ruleLocalityIds.has(pLoc);

        const isMusician = pRole.includes("music");
        const isSolistaAtRuleLocality =
          pRole === "solista" && atRuleLocality;
        const isDirectorAtRuleLocality =
          pRole === "director" && atRuleLocality;
        if (
          !isMusician &&
          !isSolistaAtRuleLocality &&
          !isDirectorAtRuleLocality
        ) {
          return false;
        }
      }
    }
  }

  const pCat = getCategoriaLogistica(person);

  // Persona: target_ids puede ser id integrante (legacy) o id_integrante
  if (scope === "persona") {
    if (String(rule.id_integrante) === pId) return true;
    if ((rule.target_ids || []).map(String).includes(pId)) return true;
  } else if (
    scope !== "categoria" &&
    scope !== "instrumento" &&
    (rule.target_ids || []).map(String).includes(pId)
  ) {
    return true;
  }

  if ((rule.target_regions || []).map(String).includes(pReg)) return true;
  if ((rule.target_localities || []).map(String).includes(pLoc)) return true;
  if (
    (rule.target_categories || []).some((cat) =>
      categoryMatches(cat, pCat, person, categoryContext),
    )
  )
    return true;

  if (scope === "general") return true;
  if (scope === "region" && String(rule.id_region) === pReg) return true;
  if (scope === "localidad" && String(rule.id_localidad) === pLoc) return true;
  if (scope === "categoria" || scope === "instrumento") {
    if (
      rule.instrumento_familia &&
      normalize(rule.instrumento_familia) ===
        normalize(person.instrumentos?.familia)
    ) {
      return true;
    }
    // Categoría logística en target_ids (StopRulesManager / giras_logistica_rutas)
    const cats = rule.target_ids || [];
    return cats.some(
      (cat) =>
        normalize(cat) === normalize(pCat) ||
        categoryMatches(cat, pCat, person, categoryContext),
    );
  }
  return false;
};

export const isAdmissionExclusionRule = (rule) =>
  Boolean(rule && (rule.tipo === "EXCLUSION" || rule.es_exclusion));

/**
 * Admisión efectiva a un transporte (giras_logistica_admision).
 * Gana la regla aplicable con mayor `prioridad`; un veto Persona anula una inclusión Localidad.
 *
 * @returns {"admitted"|"excluded"|"none"}
 */
export const resolveTransportAdmissionStatus = (
  person,
  transportId,
  admissionRules = [],
  allLocalities = [],
  { isInternalTransport = false } = {},
) => {
  const tid = String(transportId);
  const applicable = (admissionRules || []).filter(
    (r) =>
      String(r.id_transporte_fisico) === tid &&
      matchesRule(r, person, allLocalities),
  );

  if (applicable.length === 0) {
    return isInternalTransport ? "admitted" : "none";
  }

  applicable.sort((a, b) => (b.prioridad || 0) - (a.prioridad || 0));
  const top = applicable[0];
  return isAdmissionExclusionRule(top) ? "excluded" : "admitted";
};

export const isPersonAdmittedToTransport = (
  person,
  transportId,
  admissionRules,
  allLocalities,
  options,
) =>
  resolveTransportAdmissionStatus(
    person,
    transportId,
    admissionRules,
    allLocalities,
    options,
  ) === "admitted";

export const isPersonVetoedFromTransport = (
  person,
  transportId,
  admissionRules,
  allLocalities,
  options,
) =>
  resolveTransportAdmissionStatus(
    person,
    transportId,
    admissionRules,
    allLocalities,
    options,
  ) === "excluded";

/**
 * Reglas de EXCLUSIÓN/veto de un transporte que aplican a la persona
 * (candidatas a eliminar si se quiere incluirla de nuevo).
 */
export const getExclusionAdmissionRulesForPerson = (
  person,
  transportId,
  admissionRules = [],
  allLocalities = [],
) => {
  if (!person || transportId == null) return [];
  const tid = String(transportId);
  return (admissionRules || []).filter(
    (r) =>
      String(r.id_transporte_fisico) === tid &&
      isAdmissionExclusionRule(r) &&
      matchesRule(r, person, allLocalities),
  );
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

/**
 * Devuelve las clases de color (Tailwind) asociadas a un tipo de programa.
 * Pensado para colorear badges, chips o etiquetas en filtros.
 */
export const getProgramTypeColor = (type) => {
  const config = PROGRAM_TYPES[type] || PROGRAM_TYPES.default;
  return config.color;
};

export const getProgramStyle = (type) => {
  return PROGRAM_TYPES[type] || PROGRAM_TYPES["default"];
};

/** mes_letra, nomenclador y zona no vacíos, unidos con " | ". */
export const formatProgramNomenMes = (program) => {
  const mes =
    program?.mes_letra != null && String(program.mes_letra).trim() !== ""
      ? String(program.mes_letra).trim()
      : "";
  const nom =
    program?.nomenclador != null && String(program.nomenclador).trim() !== ""
      ? String(program.nomenclador).trim()
      : "";
  const zona =
    program?.zona != null && String(program.zona).trim() !== ""
      ? String(program.zona).trim()
      : "";
  return [mes, nom, zona].filter(Boolean).join(" | ");
};

/** Etiqueta para selects: "MES | NOM - Nombre" (omite partes vacías). */
export const formatProgramSelectLabel = (program) => {
  const nombre = String(program?.nombre_gira ?? "").trim();
  const prefix = formatProgramNomenMes(program);
  if (prefix && nombre) return `${prefix} - ${nombre}`;
  if (prefix) return prefix;
  return nombre;
};

/**
 * Devuelve las clases Tailwind para un badge de programa
 * según el tipo de organismo. Pensado para etiquetas pequeñas
 * (ensayos, agenda, etc.).
 */
export const getProgramBadgeClasses = (program) => {
  const rawType = program?.tipo || program?.tipo_organismo || "";
  const t = normalize(rawType);

  // Ensambles
  if (t.includes("ensamble"))
    return "bg-emerald-50 text-emerald-700 border-emerald-200";

  // Jazz Band
  if (t.includes("jazz"))
    return "bg-amber-50 text-amber-700 border-amber-200";

  // Camerata / Filarmónica
  if (t.includes("camerata") || t.includes("filarm"))
    return "bg-indigo-50 text-indigo-700 border-indigo-200";

  // Sinfónica / Orquestas generales
  if (t.includes("sinf") || t.includes("orquesta"))
    return "bg-blue-50 text-blue-700 border-blue-200";

  // Comisión / Otros
  if (t.includes("comisión") || t.includes("comision"))
    return "bg-slate-50 text-slate-700 border-slate-200";

  // Fallback neutro
  return "bg-slate-50 text-slate-700 border-slate-200";
};

// src/utils/giraUtils.js

/**
 * Wrapper de compatibilidad: delega en `isUserConvoked` con el rol de gira.
 * @param {Array<string>} convocadosList - Lista de etiquetas (ej: ["GRP:TUTTI", "123"])
 * @param {Object} userProfile - Objeto del usuario (debe tener id, id_localidad, instrumentos, etc.)
 * @param {string} tourRole - Rol del usuario en ESTA gira específica (ej: "solista", "produccion")
 * @param {{ hospedajeExcluidosIds?: Array<number|string>, cunaExcluidosIds?: Array<number|string>, fecha?: string, servicio?: string, segments?: Array, hora?: string }} [opts]
 */
export const checkIsConvoked = (
  convocadosList,
  userProfile,
  tourRole,
  opts = {},
) => {
  if (!userProfile) return false;
  return isUserConvoked(
    convocadosList,
    {
      ...userProfile,
      rol_gira: tourRole || userProfile.rol_gira || userProfile.rol,
    },
    opts,
  );
};
