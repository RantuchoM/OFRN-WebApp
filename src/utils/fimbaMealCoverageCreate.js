/**
 * Crear comidas FIMBA faltantes (cobertura A/M/C) con defaults de producto.
 * Sin hora_fin; convocados GRP:NONE + audiencia_ofrn none (solo artista).
 */

import { toast } from "sonner";
import { ROSTER_CATEGORIES } from "./giraUtils";
import {
  CANONICAL_MEAL_TYPE_IDS,
  mealServicioFromEvent,
  isMealRelatedEvent,
} from "./mealLogistics";
import { setEventoFimbaPropuestas } from "../services/fimbaService";

/** Hora inicio por defecto al auto-crear gaps de cobertura. */
export const MEAL_COVERAGE_DEFAULT_HORA = Object.freeze({
  Almuerzo: "12:30",
  Merienda: "17:00",
  Cena: "21:30",
});

/**
 * Locación más frecuente entre comidas del artista el mismo día
 * (o cualquier comida del artista si no hay ese día).
 *
 * @param {object[]} mealRows filas con fecha, propuestas, id_locacion / locKey
 * @param {string|number} artistaId
 * @param {string} fecha YYYY-MM-DD
 */
export function inferLocacionForArtistMealDay(mealRows, artistaId, fecha) {
  const aid = String(artistaId);
  const day = String(fecha).slice(0, 10);
  const counts = new Map();

  const consider = (row, weight) => {
    const id = row?.id_locacion ?? row?.locaciones?.id ?? row?.locKey;
    if (id == null || id === "" || id === "__none__") return;
    const key = String(id);
    counts.set(key, (counts.get(key) || 0) + weight);
  };

  for (const row of mealRows || []) {
    const props = row.propuestas || [];
    if (!props.some((p) => p?.id != null && String(p.id) === aid)) continue;
    const sameDay = String(row.fecha || "").slice(0, 10) === day;
    consider(row, sameDay ? 3 : 1);
  }

  let best = null;
  let bestN = 0;
  for (const [id, n] of counts) {
    if (n > bestN) {
      best = id;
      bestN = n;
    }
  }
  if (best == null) return null;
  const num = Number(best);
  return Number.isFinite(num) ? num : best;
}

function resolveTipoId(servicio, mealTypes = []) {
  const canon = CANONICAL_MEAL_TYPE_IDS[servicio];
  if (
    canon != null &&
    mealTypes.some((t) => Number(t.id) === Number(canon))
  ) {
    return Number(canon);
  }
  const exact = mealTypes.find(
    (t) =>
      String(t.nombre || "").toLowerCase() === String(servicio).toLowerCase(),
  );
  if (exact) return Number(exact.id);
  const any = mealTypes.find(
    (t) => mealServicioFromEvent({ tipos_evento: t, servicio: t.nombre }) === servicio,
  );
  if (any) return Number(any.id);
  return canon != null ? Number(canon) : null;
}

/**
 * Crea un evento de comida para un gap (artista + fecha + servicio).
 *
 * @returns {Promise<{ ok: boolean, eventId?: number, error?: Error }>}
 */
export async function createFimbaCoverageMealEvent(supabase, opts = {}) {
  const {
    giraId,
    artistaId,
    fecha,
    servicio,
    mealTypes = [],
    siblingRows = [],
  } = opts;

  const hora = MEAL_COVERAGE_DEFAULT_HORA[servicio];
  if (!hora) {
    return { ok: false, error: new Error(`Servicio no soportado: ${servicio}`) };
  }
  const tipoId = resolveTipoId(servicio, mealTypes);
  if (!tipoId) {
    return { ok: false, error: new Error(`Sin tipo de evento para ${servicio}`) };
  }

  const idLocacion = inferLocacionForArtistMealDay(
    siblingRows,
    artistaId,
    fecha,
  );

  const payload = {
    id_gira: giraId,
    fecha: String(fecha).slice(0, 10),
    id_tipo_evento: tipoId,
    hora_inicio: hora,
    hora_fin: null,
    descripcion: servicio,
    id_locacion: idLocacion,
    convocados: [ROSTER_CATEGORIES.NONE],
    audiencia_ofrn: "none",
    visible_agenda: true,
    tecnica: false,
    is_deleted: false,
  };

  const { data, error } = await supabase
    .from("eventos")
    .insert([payload])
    .select("id")
    .single();
  if (error) return { ok: false, error };

  const { error: tagErr } = await setEventoFimbaPropuestas(data.id, [
    artistaId,
  ]);
  if (tagErr) {
    return { ok: false, error: tagErr, eventId: data.id };
  }
  return { ok: true, eventId: data.id };
}

/**
 * Crea varios gaps. Cada gap: { artistaId, fecha, servicio }.
 *
 * @returns {Promise<{ created: number, failed: number, errors: Error[] }>}
 */
export async function createFimbaCoverageMealEventsBatch(
  supabase,
  gaps,
  opts = {},
) {
  const list = gaps || [];
  let created = 0;
  let failed = 0;
  const errors = [];

  for (const gap of list) {
    const res = await createFimbaCoverageMealEvent(supabase, {
      ...opts,
      artistaId: gap.artistaId,
      fecha: gap.fecha,
      servicio: gap.servicio,
    });
    if (res.ok) created += 1;
    else {
      failed += 1;
      if (res.error) errors.push(res.error);
    }
  }

  return { created, failed, errors };
}

/**
 * Aplana gaps del coverage checker a lista de creates.
 * @param {Array<{ artistaId: string, missing: Array<{fecha,servicio}> }>} coverageResults
 */
export function flattenCoverageMissingSlots(coverageResults = []) {
  const out = [];
  for (const g of coverageResults || []) {
    if (g.ok || !g.missing?.length) continue;
    for (const m of g.missing) {
      out.push({
        artistaId: g.artistaId,
        artistaNombre: g.artistaNombre,
        fecha: m.fecha,
        servicio: m.servicio,
      });
    }
  }
  return out;
}

/**
 * Carga tipos comida/catering mínimos para resolver id_tipo_evento.
 */
export async function fetchMealTypesForCoverageCreate(supabase) {
  const { data, error } = await supabase
    .from("tipos_evento")
    .select(
      "id, nombre, id_categoria, categorias_tipos_eventos ( id, nombre )",
    )
    .order("nombre", { ascending: true });
  if (error) throw error;
  return (data || []).filter((t) =>
    isMealRelatedEvent({
      id_tipo_evento: t.id,
      tipos_evento: t,
    }),
  );
}

export async function createCoverageGapsWithToast(supabase, gaps, opts = {}) {
  if (!gaps?.length) {
    toast.message("No hay huecos para crear.");
    return { created: 0, failed: 0 };
  }
  const mealTypes =
    opts.mealTypes || (await fetchMealTypesForCoverageCreate(supabase));
  const result = await createFimbaCoverageMealEventsBatch(supabase, gaps, {
    ...opts,
    mealTypes,
  });
  if (result.created && !result.failed) {
    toast.success(
      `Creadas ${result.created} comida${result.created === 1 ? "" : "s"}`,
    );
  } else if (result.created && result.failed) {
    toast.warning(
      `Creadas ${result.created}; fallaron ${result.failed}`,
    );
  } else {
    toast.error(
      result.errors[0]?.message || "No se pudieron crear las comidas",
    );
  }
  return result;
}
