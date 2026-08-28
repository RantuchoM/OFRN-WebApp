import { dedupeSeatingStringItems } from "./seatingStringItemsDedupe";

/**
 * Configs de cuerdas por programa: resolución por bloque (como stage plots).
 * - 1 config → aplica a todos los bloques.
 * - N configs → matching por bloque_ids; vacío = fallback global.
 */

export const sortCuerdasConfigs = (configs = []) =>
  [...(configs || [])].sort((a, b) => {
    const so = (a.sort_order ?? 0) - (b.sort_order ?? 0);
    if (so !== 0) return so;
    const ca = a.created_at ? new Date(a.created_at).getTime() : 0;
    const cb = b.created_at ? new Date(b.created_at).getTime() : 0;
    if (ca !== cb) return ca - cb;
    return Number(a.id) - Number(b.id);
  });

export const normalizeCuerdasBloqueIds = (raw) => {
  if (!Array.isArray(raw)) return [];
  return [
    ...new Set(
      raw
        .map((id) => Number(id))
        .filter((id) => Number.isFinite(id) && id > 0),
    ),
  ];
};

/**
 * @param {Array<object>} configs
 * @param {number|string|null|undefined} blockId - programas_repertorios.id
 * @returns {object|null}
 */
export const resolveCuerdasConfigForBlock = (configs, blockId) => {
  const list = sortCuerdasConfigs(configs);
  if (!list.length) return null;
  if (list.length === 1) return list[0];

  const bid = blockId != null && blockId !== "" ? Number(blockId) : null;
  if (Number.isFinite(bid)) {
    const matched = list.find((cfg) =>
      normalizeCuerdasBloqueIds(cfg.bloque_ids).includes(bid),
    );
    if (matched) return matched;
  }

  const globalFallback = list.find(
    (cfg) => normalizeCuerdasBloqueIds(cfg.bloque_ids).length === 0,
  );
  if (globalFallback) return globalFallback;

  return list[0];
};

/**
 * Bloques del programa que no están cubiertos por ninguna config cuando hay N>1.
 * (Con 1 config todos están cubiertos implícitamente.)
 */
export const uncoveredCuerdasBlockIds = (configs, allBlockIds = []) => {
  const list = sortCuerdasConfigs(configs);
  if (list.length <= 1) return [];

  const covered = new Set();
  let hasGlobal = false;
  for (const cfg of list) {
    const ids = normalizeCuerdasBloqueIds(cfg.bloque_ids);
    if (!ids.length) {
      hasGlobal = true;
      break;
    }
    ids.forEach((id) => covered.add(id));
  }
  if (hasGlobal) return [];

  return (allBlockIds || [])
    .map((id) => Number(id))
    .filter((id) => Number.isFinite(id) && !covered.has(id));
};

/**
 * Dueño 1:1 de un bloque (config con exactamente ese bloque_ids).
 * @returns {object|null}
 */
export const findCuerdasConfigOwnerForBlock = (configs, blockId) => {
  const bid = Number(blockId);
  if (!Number.isFinite(bid)) return null;
  return (
    sortCuerdasConfigs(configs).find((cfg) => {
      const ids = normalizeCuerdasBloqueIds(cfg.bloque_ids);
      return ids.length === 1 && ids[0] === bid;
    }) || null
  );
};

/**
 * Asocia `configId` en exclusiva a `bloqueId` (1:1) y lo quita del resto.
 */
export const claimCuerdasBloqueOneToOne = async (
  supabase,
  { programId, configId, bloqueId },
) => {
  if (!supabase || programId == null || configId == null) {
    return { error: "Parámetros inválidos" };
  }
  const bid = Number(bloqueId);
  if (!Number.isFinite(bid) || bid <= 0) {
    return { error: "Bloque inválido" };
  }

  const siblings = await fetchCuerdasConfigsForProgram(supabase, programId);
  for (const cfg of siblings) {
    if (String(cfg.id) === String(configId)) {
      const { error } = await supabase
        .from("seating_cuerdas_configs")
        .update({ bloque_ids: [bid] })
        .eq("id", cfg.id);
      if (error) return { error: error.message };
      continue;
    }
    const ids = normalizeCuerdasBloqueIds(cfg.bloque_ids);
    if (!ids.includes(bid)) continue;
    // Conservar 1:1: si tenía varios, sacar este; si era solo este, quedar vacío (fallback).
    const next = ids.filter((id) => id !== bid);
    const { error } = await supabase
      .from("seating_cuerdas_configs")
      .update({ bloque_ids: next })
      .eq("id", cfg.id);
    if (error) return { error: error.message };
  }
  return { error: null };
};

export const fetchCuerdasConfigsForProgram = async (supabase, programId) => {
  if (!supabase || programId == null || programId === "") return [];
  const { data, error } = await supabase
    .from("seating_cuerdas_configs")
    .select("id, id_programa, nombre, sort_order, bloque_ids, created_at")
    .eq("id_programa", programId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) {
    console.error("fetchCuerdasConfigsForProgram:", error);
    return [];
  }
  return sortCuerdasConfigs(data || []);
};

/**
 * Asegura al menos una config para el programa. Si no hay ninguna, crea "Cuerdas".
 * @returns {Promise<object|null>}
 */
export const ensureDefaultCuerdasConfig = async (supabase, programId) => {
  if (!supabase || programId == null || programId === "") return null;
  const existing = await fetchCuerdasConfigsForProgram(supabase, programId);
  if (existing.length) return existing[0];

  const { data, error } = await supabase
    .from("seating_cuerdas_configs")
    .insert({
      id_programa: programId,
      nombre: "Cuerdas",
      sort_order: 0,
      bloque_ids: [],
    })
    .select("id, id_programa, nombre, sort_order, bloque_ids, created_at")
    .single();
  if (error) {
    console.error("ensureDefaultCuerdasConfig:", error);
    return null;
  }
  return data;
};

/**
 * Duplica config + contenedores + items. No copia seating_asignaciones.
 */
export const duplicateCuerdasConfig = async (
  supabase,
  sourceConfigId,
  { nombre = null, bloque_ids = [] } = {},
) => {
  if (!supabase || sourceConfigId == null) {
    return { error: "Config origen inválida" };
  }

  const { data: source, error: srcErr } = await supabase
    .from("seating_cuerdas_configs")
    .select("id, id_programa, nombre, sort_order, bloque_ids")
    .eq("id", sourceConfigId)
    .maybeSingle();
  if (srcErr || !source) {
    return { error: srcErr?.message || "Config no encontrada" };
  }

  const siblings = await fetchCuerdasConfigsForProgram(
    supabase,
    source.id_programa,
  );
  const nextOrder =
    siblings.reduce((max, c) => Math.max(max, c.sort_order ?? 0), -1) + 1;

  const { data: created, error: createErr } = await supabase
    .from("seating_cuerdas_configs")
    .insert({
      id_programa: source.id_programa,
      nombre: (nombre || `${source.nombre || "Cuerdas"} (copia)`).trim(),
      sort_order: nextOrder,
      bloque_ids: normalizeCuerdasBloqueIds(bloque_ids),
    })
    .select("id, id_programa, nombre, sort_order, bloque_ids, created_at")
    .single();
  if (createErr || !created) {
    return { error: createErr?.message || "No se pudo duplicar la config" };
  }

  const { data: conts, error: contErr } = await supabase
    .from("seating_contenedores")
    .select("id, nombre, orden, id_instrumento, capacidad")
    .eq("id_config", sourceConfigId)
    .order("orden");
  if (contErr) return { error: contErr.message, config: created };

  if (!conts?.length) return { config: created };

  const { data: items } = await supabase
    .from("seating_contenedores_items")
    .select("id_contenedor, id_musico, orden, atril_num, lado")
    .in(
      "id_contenedor",
      conts.map((c) => c.id),
    );

  const itemsByCont = {};
  (items || []).forEach((it) => {
    if (!itemsByCont[it.id_contenedor]) itemsByCont[it.id_contenedor] = [];
    itemsByCont[it.id_contenedor].push(it);
  });

  for (const cont of conts) {
    const { data: newCont, error: ncErr } = await supabase
      .from("seating_contenedores")
      .insert({
        id_programa: source.id_programa,
        id_config: created.id,
        nombre: cont.nombre,
        orden: cont.orden,
        id_instrumento: cont.id_instrumento || "00",
        capacidad: cont.capacidad ?? null,
      })
      .select("id")
      .single();
    if (ncErr || !newCont) continue;

    const srcItems = itemsByCont[cont.id] || [];
    if (!srcItems.length) continue;
    await supabase.from("seating_contenedores_items").insert(
      srcItems.map((it) => ({
        id_contenedor: newCont.id,
        id_musico: it.id_musico,
        orden: it.orden,
        atril_num: it.atril_num,
        lado: it.lado,
      })),
    );
  }

  return { config: created };
};

/**
 * Carga configs + contenedores (con items) de un programa, agrupados por config.
 * @returns {Promise<{ configs: object[], groups: { config: object, containers: object[] }[] }>}
 */
export const fetchCuerdasDispositionGroups = async (supabase, programId) => {
  const configs = await fetchCuerdasConfigsForProgram(supabase, programId);
  if (!configs.length) return { configs: [], groups: [] };

  const { data: conts } = await supabase
    .from("seating_contenedores")
    .select("*")
    .eq("id_programa", programId)
    .order("orden");

  const allConts = conts || [];
  if (!allConts.length) {
    return {
      configs,
      groups: configs.map((config) => ({ config, containers: [] })),
    };
  }

  const { data: items } = await supabase
    .from("seating_contenedores_items")
    .select("*, integrantes(nombre, apellido, instrumentos(instrumento))")
    .in(
      "id_contenedor",
      allConts.map((c) => c.id),
    )
    .order("atril_num", { ascending: true, nullsFirst: true })
    .order("lado", { ascending: true, nullsFirst: true })
    .order("id", { ascending: true });

  const deduped = dedupeSeatingStringItems(items || [], allConts);

  const groups = configs.map((config) => {
    const contsForConfig = allConts.filter(
      (c) => String(c.id_config) === String(config.id),
    );
    const containers = contsForConfig.map((c) => ({
      ...c,
      items: deduped.filter((i) => Number(i.id_contenedor) === Number(c.id)),
    }));
    return { config, containers };
  });

  return { configs, groups };
};
