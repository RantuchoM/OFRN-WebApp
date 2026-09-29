import {
  filterAndRankMultiTokenSearch,
  normalizeForSearch,
  splitSearchTokens,
} from "./sanitize";
import { seatingApellidoNombre } from "./integranteDisplayName";

/**
 * Filtra comandos de la paleta. Personas y repertorio no son ítems:
 * se entra con Tab, en las vistas del selector.
 * Con una gira abierta, sus comandos (scope "gira") van antes que
 * General, Historial y el resto, si coinciden con la búsqueda.
 */
export function rankPaletteCommands(actions, query) {
  const trimmed = String(query || "").trim();
  if (!trimmed) return actions.slice(0, 10);

  const ranked = filterAndRankMultiTokenSearch(
    actions,
    (action) => [action.label, action.section, action.subtitle, ...(action.aliases || [])],
    trimmed,
  );
  const inGira = [];
  const rest = [];
  for (const action of ranked) {
    if (action.scope === "gira") inGira.push(action);
    else rest.push(action);
  }
  return [...inGira, ...rest];
}

export const PALETTE_ENTITY_MIN_QUERY = 2;
export const PALETTE_ENTITY_LIMIT = 20;
const FETCH_LIMIT = 20;

const OBRA_SELECT =
  "id, titulo, obras_compositores(rol, compositores(apellido, nombre))";

const PERSON_SELECT =
  "id, nombre, apellido, nombre_preferencia, apellido_preferencia, es_simulacion, condicion, telefono, mail, instrumentos(instrumento)";

/**
 * Letras cuyo NFD cae en la misma base (á/à/ä → a, ñ → n).
 * `ilike` no pliega tildes; el filtro de la paleta usa estas clases en `~*`.
 */
let accentFoldClasses;
function accentFoldClassMap() {
  if (accentFoldClasses) return accentFoldClasses;
  const map = new Map();
  const add = (base, ch) => {
    if (!map.has(base)) map.set(base, new Set([base, base.toUpperCase()]));
    map.get(base).add(ch);
  };
  for (let cp = 0x00c0; cp <= 0x024f; cp += 1) {
    const ch = String.fromCodePoint(cp);
    const base = normalizeForSearch(ch);
    if (base.length === 1 && /[a-z]/.test(base)) add(base, ch);
  }
  for (const ch of "øØ") add("o", ch);
  for (const ch of "łŁ") add("l", ch);
  for (const ch of "đĐ") add("d", ch);
  accentFoldClasses = map;
  return map;
}

function accentFoldRegex(token) {
  const normalized = normalizeForSearch(token);
  if (!normalized) return "";
  const classes = accentFoldClassMap();
  let pattern = "";
  for (const ch of normalized) {
    const set = classes.get(ch);
    if (set && set.size > 1) pattern += `[${[...set].join("")}]`;
    else if (/[a-z0-9]/.test(ch)) pattern += ch;
    else pattern += ch.replace(/[\\^$.*+?()[\]{}|]/g, "\\$&");
  }
  return pattern;
}

function quotePostgrestValue(value) {
  return `"${String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

/** Un token, sin tildes, contra cualquiera de los campos (`OR` de `~*`). */
function applyAccentFoldOr(queryBuilder, fields, token) {
  const pattern = accentFoldRegex(token);
  if (!pattern) return queryBuilder;
  const quoted = quotePostgrestValue(pattern);
  return queryBuilder.or(fields.map((field) => `${field}.imatch.${quoted}`).join(","));
}

function isNumericIdQuery(query) {
  const trimmed = String(query || "").trim();
  if (!/^\d+$/.test(trimmed)) return false;
  const id = Number(trimmed);
  return Number.isFinite(id) ? id : null;
}

export function formatObraComposerLabel(obra) {
  const rels = obra?.obras_compositores || [];
  const composers = rels
    .filter((oc) => oc.rol === "compositor" || !oc.rol)
    .map((oc) => {
      const c = oc.compositores;
      if (!c) return "";
      return [c.apellido, c.nombre].filter(Boolean).join(", ");
    })
    .filter(Boolean);
  const arrangers = rels
    .filter((oc) => oc.rol === "arreglador")
    .map((oc) => {
      const c = oc.compositores;
      if (!c) return "";
      return [c.apellido, c.nombre].filter(Boolean).join(", ");
    })
    .filter(Boolean);

  const composerText = composers.join(" / ");
  if (composerText && arrangers.length) {
    return `${composerText} · arr. ${arrangers.join(" / ")}`;
  }
  return composerText || (arrangers.length ? `arr. ${arrangers.join(" / ")}` : "");
}

export function formatPersonLabel(person) {
  return seatingApellidoNombre(person) || `ID ${person?.id}`;
}

function mergeById(rows) {
  const byId = new Map();
  for (const row of rows) {
    if (row == null || row.id == null) continue;
    const id = Number(row.id);
    if (!Number.isFinite(id)) continue;
    byId.set(id, { ...row, id });
  }
  return [...byId.values()];
}

/**
 * Un token contra título o contra apellido/nombre del compositor.
 * El AND entre tokens lo hace el ranking cliente, para que «Tchai Ele»
 * encuentre Elegy (título) de Tchaikovsky (compositor).
 */
async function obrasMatchingToken(supabase, token) {
  let byTitleQuery = supabase.from("obras").select(OBRA_SELECT);
  byTitleQuery = applyAccentFoldOr(byTitleQuery, ["titulo"], token);
  const titlePromise = byTitleQuery.limit(FETCH_LIMIT);

  let composersQuery = supabase.from("compositores").select("id");
  composersQuery = applyAccentFoldOr(composersQuery, ["apellido", "nombre"], token);
  const composersPromise = composersQuery.limit(20);

  const [{ data: byTitle }, { data: composers }] = await Promise.all([
    titlePromise,
    composersPromise,
  ]);

  let byComposer = [];
  const composerIds = (composers || []).map((c) => c.id).filter((id) => id != null);
  if (composerIds.length) {
    const { data } = await supabase
      .from("obras")
      .select(
        "id, titulo, obras_compositores!inner(rol, id_compositor, compositores(apellido, nombre))",
      )
      .in("obras_compositores.id_compositor", composerIds)
      .limit(FETCH_LIMIT);
    byComposer = data || [];
  }

  return [...(byTitle || []), ...byComposer];
}

/**
 * Busca obras por título, compositor/arreglador o id numérico.
 * Cada token se busca solo (título o compositor). El AND entre palabras
 * queda en el cliente, sobre título + compositor juntos.
 * No vuelca el catálogo: debounce + límite en el caller.
 */
export async function searchPaletteObras(supabase, query) {
  const trimmed = String(query || "").trim();
  if (!supabase || trimmed.length < PALETTE_ENTITY_MIN_QUERY) return [];

  const numericId = isNumericIdQuery(trimmed);
  const tokens = splitSearchTokens(trimmed);

  const idPromise = numericId
    ? supabase.from("obras").select(OBRA_SELECT).eq("id", numericId).maybeSingle()
    : Promise.resolve({ data: null });

  const [tokenGroups, { data: byIdRow }] = await Promise.all([
    Promise.all(tokens.map((token) => obrasMatchingToken(supabase, token))),
    idPromise,
  ]);

  const merged = mergeById([
    ...tokenGroups.flat(),
    ...(byIdRow ? [byIdRow] : []),
  ]);

  return filterAndRankMultiTokenSearch(
    merged,
    (obra) => [obra.titulo, formatObraComposerLabel(obra), String(obra.id)],
    trimmed,
  ).slice(0, PALETTE_ENTITY_LIMIT);
}

/**
 * Un token contra nombre/apellido o contra el instrumento.
 * El AND entre tokens lo hace el ranking cliente.
 */
async function peopleMatchingToken(supabase, token) {
  let byName = supabase
    .from("integrantes")
    .select(PERSON_SELECT)
    .eq("es_simulacion", false);
  byName = applyAccentFoldOr(
    byName,
    ["nombre", "apellido", "nombre_preferencia", "apellido_preferencia"],
    token,
  );
  const namePromise = byName.limit(FETCH_LIMIT);

  let instrQuery = supabase.from("instrumentos").select("id");
  instrQuery = applyAccentFoldOr(instrQuery, ["instrumento"], token);
  const instrPromise = instrQuery.limit(20);

  const [{ data: named }, { data: instruments }] = await Promise.all([
    namePromise,
    instrPromise,
  ]);

  let byInstr = [];
  const instrIds = (instruments || []).map((i) => i.id).filter((id) => id != null);
  if (instrIds.length) {
    const { data } = await supabase
      .from("integrantes")
      .select(PERSON_SELECT)
      .eq("es_simulacion", false)
      .in("id_instr", instrIds)
      .limit(FETCH_LIMIT);
    byInstr = data || [];
  }

  return [...(named || []), ...byInstr];
}

/**
 * Busca integrantes reales (no vacantes) por nombre, instrumento o id numérico.
 * Cada token se busca solo (nombre o instrumento). El AND entre palabras
 * queda en el cliente.
 */
export async function searchPalettePeople(supabase, query) {
  const trimmed = String(query || "").trim();
  if (!supabase || trimmed.length < PALETTE_ENTITY_MIN_QUERY) return [];

  const numericId = isNumericIdQuery(trimmed);
  const tokens = splitSearchTokens(trimmed);

  const idPromise = numericId
    ? supabase
        .from("integrantes")
        .select(PERSON_SELECT)
        .eq("id", numericId)
        .eq("es_simulacion", false)
        .maybeSingle()
    : Promise.resolve({ data: null });

  const [tokenGroups, { data: byIdRow }] = await Promise.all([
    Promise.all(tokens.map((token) => peopleMatchingToken(supabase, token))),
    idPromise,
  ]);

  const merged = mergeById([
    ...tokenGroups.flat(),
    ...(byIdRow ? [byIdRow] : []),
  ]).filter((person) => !person.es_simulacion);

  return filterAndRankMultiTokenSearch(
    merged,
    (person) => [
      person.nombre,
      person.apellido,
      person.nombre_preferencia,
      person.apellido_preferencia,
      [person.apellido, person.nombre].filter(Boolean).join(" "),
      [person.nombre, person.apellido].filter(Boolean).join(" "),
      person.instrumentos?.instrumento,
      String(person.id),
    ],
    trimmed,
  ).slice(0, PALETTE_ENTITY_LIMIT);
}
