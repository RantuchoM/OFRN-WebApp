import {
  applyMultiTokenOrIlike,
  filterAndRankMultiTokenSearch,
  normalizeForSearch,
} from "./sanitize";

/** Prefijos/alias que clavan el comando de búsqueda al tope de la paleta. */
export const PALETTE_PERSON_SEARCH_ALIASES = ["personas", "persona"];
export const PALETTE_REPERTOIRE_SEARCH_ALIASES = ["repertorio", "obras", "obra"];
const PALETTE_PIN_MIN_CHARS = 3;

/**
 * `pers` → personas, `rep` → repertorio, `obra`/`obras` exactos.
 * No pinnea con 1–2 letras para no tapar el resto de comandos.
 */
export function shouldPinPaletteSearchCommand(query, aliases) {
  const q = normalizeForSearch(query);
  if (q.length < PALETTE_PIN_MIN_CHARS) return false;
  return (aliases || []).some((alias) => {
    const a = normalizeForSearch(alias);
    return !!a && (a.startsWith(q) || q === a);
  });
}

/**
 * Filtra comandos de la paleta y pone Buscar personas / repertorio primero
 * cuando el query es prefijo de sus alias.
 */
export function rankPaletteCommands(actions, query) {
  const trimmed = String(query || "").trim();
  if (!trimmed) return actions.slice(0, 10);

  const ranked = filterAndRankMultiTokenSearch(
    actions,
    (action) => [
      action.label,
      action.section,
      action.subtitle,
      ...(action.aliases || []),
    ],
    trimmed,
  );

  const pinned = [];
  const rest = [];
  for (const action of ranked) {
    if (shouldPinPaletteSearchCommand(trimmed, action.aliases)) pinned.push(action);
    else rest.push(action);
  }
  return [...pinned, ...rest];
}

export const PALETTE_ENTITY_MIN_QUERY = 2;
export const PALETTE_ENTITY_LIMIT = 20;
const FETCH_LIMIT = 20;

const OBRA_SELECT =
  "id, titulo, obras_compositores(rol, compositores(apellido, nombre))";

const PERSON_SELECT =
  "id, nombre, apellido, nombre_preferencia, apellido_preferencia, es_simulacion, condicion, instrumentos(instrumento)";

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
  const apellido = String(
    person?.apellido_preferencia || person?.apellido || "",
  ).trim();
  const nombre = String(
    person?.nombre_preferencia || person?.nombre || "",
  ).trim();
  if (apellido && nombre) return `${apellido}, ${nombre}`;
  return apellido || nombre || `ID ${person?.id}`;
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
 * Busca obras por título, compositor/arreglador o id numérico.
 * No vuelca el catálogo: debounce + límite en el caller.
 */
export async function searchPaletteObras(supabase, query) {
  const trimmed = String(query || "").trim();
  if (!supabase || trimmed.length < PALETTE_ENTITY_MIN_QUERY) return [];

  const numericId = isNumericIdQuery(trimmed);

  let byTitleQuery = supabase.from("obras").select(OBRA_SELECT);
  byTitleQuery = applyMultiTokenOrIlike(byTitleQuery, ["titulo"], trimmed);
  const titlePromise = byTitleQuery.limit(FETCH_LIMIT);

  let composersQuery = supabase.from("compositores").select("id");
  composersQuery = applyMultiTokenOrIlike(
    composersQuery,
    ["apellido", "nombre"],
    trimmed,
  );
  const composersPromise = composersQuery.limit(20);

  const idPromise = numericId
    ? supabase.from("obras").select(OBRA_SELECT).eq("id", numericId).maybeSingle()
    : Promise.resolve({ data: null });

  const [{ data: byTitle }, { data: composers }, { data: byIdRow }] =
    await Promise.all([titlePromise, composersPromise, idPromise]);

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

  const merged = mergeById([
    ...(byTitle || []),
    ...byComposer,
    ...(byIdRow ? [byIdRow] : []),
  ]);

  return filterAndRankMultiTokenSearch(
    merged,
    (obra) => [obra.titulo, formatObraComposerLabel(obra), String(obra.id)],
    trimmed,
  ).slice(0, PALETTE_ENTITY_LIMIT);
}

/**
 * Busca integrantes reales (no vacantes) por nombre, instrumento o id numérico.
 */
export async function searchPalettePeople(supabase, query) {
  const trimmed = String(query || "").trim();
  if (!supabase || trimmed.length < PALETTE_ENTITY_MIN_QUERY) return [];

  const numericId = isNumericIdQuery(trimmed);

  let byName = supabase
    .from("integrantes")
    .select(PERSON_SELECT)
    .eq("es_simulacion", false);
  byName = applyMultiTokenOrIlike(
    byName,
    ["nombre", "apellido", "nombre_preferencia", "apellido_preferencia"],
    trimmed,
  );
  const namePromise = byName.limit(FETCH_LIMIT);

  let instrQuery = supabase.from("instrumentos").select("id");
  instrQuery = applyMultiTokenOrIlike(instrQuery, ["instrumento"], trimmed);
  const instrPromise = instrQuery.limit(20);

  const idPromise = numericId
    ? supabase
        .from("integrantes")
        .select(PERSON_SELECT)
        .eq("id", numericId)
        .eq("es_simulacion", false)
        .maybeSingle()
    : Promise.resolve({ data: null });

  const [{ data: named }, { data: instruments }, { data: byIdRow }] =
    await Promise.all([namePromise, instrPromise, idPromise]);

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

  const merged = mergeById([
    ...(named || []),
    ...byInstr,
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
