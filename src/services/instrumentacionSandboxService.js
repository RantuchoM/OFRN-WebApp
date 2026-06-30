import { fetchRosterForGira } from "../hooks/useGiraRoster";
import { sendConvocatoriaNotificationTasks } from "../utils/convocatoriaNotificationSend";
import { integranteKey } from "../utils/integranteIds";

const SANDBOX_SINGLETON_KEY = "active";

/**
 * @param {unknown} error
 * @returns {{ kind: 'missing' | 'rls' | 'unknown', message: string }}
 */
export function describeSandboxLoadError(error) {
  const err = /** @type {{ code?: string, message?: string }} */ (error);
  const msg = err?.message || String(error);
  if (
    err?.code === "42P01" ||
    err?.code === "PGRST205" ||
    /does not exist/i.test(msg) ||
    /schema cache/i.test(msg)
  ) {
    return {
      kind: "missing",
      message:
        "Faltan las tablas sandbox. Ejecutá la migración 20260629120000.",
    };
  }
  if (
    err?.code === "42501" ||
    /permission denied/i.test(msg) ||
    /row-level security/i.test(msg)
  ) {
    return {
      kind: "rls",
      message:
        "Sin permiso en tablas sandbox. Si el proyecto no usa RLS, aplicá 20260629130100 (deshabilita RLS en sandbox).",
    };
  }
  return { kind: "unknown", message: msg };
}

/**
 * @typedef {object} SandboxGiraDraft
 * @property {string} id
 * @property {string} sandbox_id
 * @property {number} id_gira
 * @property {Array<{ tipo: string, valor_id?: number, valor_texto?: string }>} fuentes
 * @property {Array<{ id_integrante: number, estado?: string, rol?: string, id_instr?: string, abona_reemplazo?: boolean }>} integrantes
 */

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {{ fecha_desde?: string, fecha_hasta?: string, tipo_programa?: string }} [context]
 */
export async function getOrCreateActiveSandbox(supabase, context = {}) {
  const { data: existing, error: readErr } = await supabase
    .from("instrumentacion_sandbox")
    .select("*")
    .eq("singleton_key", SANDBOX_SINGLETON_KEY)
    .maybeSingle();
  if (readErr) throw readErr;

  if (existing) {
    const patch = {};
    if (context.fecha_desde !== undefined) patch.fecha_desde = context.fecha_desde;
    if (context.fecha_hasta !== undefined) patch.fecha_hasta = context.fecha_hasta;
    if (context.tipo_programa !== undefined) {
      patch.tipo_programa = context.tipo_programa;
    }
    if (Object.keys(patch).length > 0) {
      patch.updated_at = new Date().toISOString();
      const { data: updated, error: updErr } = await supabase
        .from("instrumentacion_sandbox")
        .update(patch)
        .eq("id", existing.id)
        .select("*")
        .single();
      if (updErr) throw updErr;
      return updated;
    }
    return existing;
  }

  const { data: created, error: insErr } = await supabase
    .from("instrumentacion_sandbox")
    .insert({
      singleton_key: SANDBOX_SINGLETON_KEY,
      nombre: "Escenario activo",
      fecha_desde: context.fecha_desde ?? null,
      fecha_hasta: context.fecha_hasta ?? null,
      tipo_programa: context.tipo_programa ?? null,
    })
    .select("*")
    .single();
  if (insErr) throw insErr;
  return created;
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} sandboxId
 */
export async function fetchSandboxGiraDrafts(supabase, sandboxId) {
  const { data, error } = await supabase
    .from("instrumentacion_sandbox_gira")
    .select("*")
    .eq("sandbox_id", sandboxId);
  if (error) throw error;
  return data || [];
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {number|string} giraId
 */
export async function cloneProductionConvocatoria(supabase, giraId) {
  const gid = Number(giraId);
  const [fuentesRes, integrantesRes] = await Promise.all([
    supabase.from("giras_fuentes").select("tipo, valor_id, valor_texto").eq("id_gira", gid),
    supabase
      .from("giras_integrantes")
      .select("id_integrante, estado, rol, id_instr, abona_reemplazo")
      .eq("id_gira", gid),
  ]);
  if (fuentesRes.error) throw fuentesRes.error;
  if (integrantesRes.error) throw integrantesRes.error;

  const fuentes = (fuentesRes.data || []).map((f) => ({
    tipo: f.tipo,
    ...(f.valor_id != null ? { valor_id: Number(f.valor_id) } : {}),
    ...(f.valor_texto != null ? { valor_texto: f.valor_texto } : {}),
  }));

  const integrantes = (integrantesRes.data || []).map((o) => ({
    id_integrante: Number(o.id_integrante),
    estado: o.estado ?? "confirmado",
    ...(o.rol != null ? { rol: o.rol } : {}),
    ...(o.id_instr != null ? { id_instr: o.id_instr } : {}),
    abona_reemplazo: Boolean(o.abona_reemplazo),
  }));

  return { fuentes, integrantes };
}

/**
 * Convocatoria productiva de muchas giras en dos consultas (fuentes + integrantes).
 * @returns {Map<number, { fuentes: Array, integrantes: Array }>}
 */
export async function batchFetchProductionConvocatoria(supabase, giraIds = []) {
  const ids = [...new Set(giraIds.map((id) => Number(id)).filter(Number.isFinite))];
  const out = new Map();
  if (!ids.length) return out;

  const [fuentesRes, integrantesRes] = await Promise.all([
    supabase
      .from("giras_fuentes")
      .select("id_gira, tipo, valor_id, valor_texto")
      .in("id_gira", ids),
    supabase
      .from("giras_integrantes")
      .select("id_gira, id_integrante, estado, rol, id_instr, abona_reemplazo")
      .in("id_gira", ids),
  ]);
  if (fuentesRes.error) throw fuentesRes.error;
  if (integrantesRes.error) throw integrantesRes.error;

  for (const id of ids) {
    out.set(id, { fuentes: [], integrantes: [] });
  }

  for (const f of fuentesRes.data || []) {
    const gid = Number(f.id_gira);
    const bucket = out.get(gid);
    if (!bucket) continue;
    bucket.fuentes.push({
      tipo: f.tipo,
      ...(f.valor_id != null ? { valor_id: Number(f.valor_id) } : {}),
      ...(f.valor_texto != null ? { valor_texto: f.valor_texto } : {}),
    });
  }

  for (const o of integrantesRes.data || []) {
    const gid = Number(o.id_gira);
    const bucket = out.get(gid);
    if (!bucket) continue;
    bucket.integrantes.push({
      id_integrante: Number(o.id_integrante),
      estado: o.estado ?? "confirmado",
      ...(o.rol != null ? { rol: o.rol } : {}),
      ...(o.id_instr != null ? { id_instr: o.id_instr } : {}),
      abona_reemplazo: Boolean(o.abona_reemplazo),
    });
  }

  return out;
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} sandboxId
 * @param {number|string} giraId
 * @param {{ fuentes: Array, integrantes: Array }} payload
 */
export async function upsertGiraDraft(supabase, sandboxId, giraId, payload) {
  const row = {
    sandbox_id: sandboxId,
    id_gira: Number(giraId),
    fuentes: payload.fuentes ?? [],
    integrantes: payload.integrantes ?? [],
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("instrumentacion_sandbox_gira")
    .upsert(row, { onConflict: "sandbox_id,id_gira" })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} sandboxId
 * @param {number|string} giraId
 */
export async function deleteGiraDraft(supabase, sandboxId, giraId) {
  const { error } = await supabase
    .from("instrumentacion_sandbox_gira")
    .delete()
    .eq("sandbox_id", sandboxId)
    .eq("id_gira", Number(giraId));
  if (error) throw error;
}

/**
 * Elimina todos los borradores del escenario sandbox activo.
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} sandboxId
 */
export async function discardAllSandboxDrafts(supabase, sandboxId) {
  const { error } = await supabase
    .from("instrumentacion_sandbox_gira")
    .delete()
    .eq("sandbox_id", sandboxId);
  if (error) throw error;
}

/**
 * Aplica el borrador de una gira a tablas productivas.
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} sandboxId
 * @param {number|string} giraId
 */
export async function applyGiraDraftToProduction(supabase, sandboxId, giraId) {
  const gid = Number(giraId);
  const { data: draft, error: draftErr } = await supabase
    .from("instrumentacion_sandbox_gira")
    .select("*")
    .eq("sandbox_id", sandboxId)
    .eq("id_gira", gid)
    .maybeSingle();
  if (draftErr) throw draftErr;
  if (!draft) {
    throw new Error("No hay borrador para esta gira.");
  }

  const fuentes = draft.fuentes || [];
  const integrantes = draft.integrantes || [];

  const { error: delFuentesErr } = await supabase
    .from("giras_fuentes")
    .delete()
    .eq("id_gira", gid);
  if (delFuentesErr) throw delFuentesErr;

  if (fuentes.length > 0) {
    const inserts = fuentes.map((f) => ({
      id_gira: gid,
      tipo: f.tipo,
      ...(f.valor_id != null ? { valor_id: Number(f.valor_id) } : {}),
      ...(f.valor_texto != null ? { valor_texto: f.valor_texto } : {}),
    }));
    const { error: insFuentesErr } = await supabase
      .from("giras_fuentes")
      .insert(inserts);
    if (insFuentesErr) throw insFuentesErr;
  }

  const { data: prodIntegrantes, error: prodIntErr } = await supabase
    .from("giras_integrantes")
    .select("id_integrante")
    .eq("id_gira", gid);
  if (prodIntErr) throw prodIntErr;

  const draftByIntegrante = new Map(
    integrantes.map((o) => [Number(o.id_integrante), o]),
  );
  const prodIds = new Set(
    (prodIntegrantes || []).map((r) => Number(r.id_integrante)),
  );

  for (const o of integrantes) {
    const iid = Number(o.id_integrante);
    const row = {
      id_gira: gid,
      id_integrante: iid,
      estado: o.estado ?? "confirmado",
      ...(o.rol != null ? { rol: o.rol } : {}),
      ...(o.id_instr != null ? { id_instr: o.id_instr } : {}),
      abona_reemplazo: Boolean(o.abona_reemplazo),
    };
    const { error: upsertErr } = await supabase
      .from("giras_integrantes")
      .upsert(row, { onConflict: "id_gira,id_integrante" });
    if (upsertErr) throw upsertErr;
  }

  const draftIds = new Set(integrantes.map((o) => Number(o.id_integrante)));
  const toRemove = [...prodIds].filter((id) => !draftIds.has(id));
  if (toRemove.length > 0) {
    const { error: delIntErr } = await supabase
      .from("giras_integrantes")
      .delete()
      .eq("id_gira", gid)
      .in("id_integrante", toRemove);
    if (delIntErr) throw delIntErr;
  }

  await deleteGiraDraft(supabase, sandboxId, gid);
  return { applied: true };
}

/**
 * @param {Array<SandboxGiraDraft>} drafts
 * @returns {Map<number, { fuentes: Array, integrantes: Array }>}
 */
export function buildSandboxDraftMap(drafts = []) {
  const map = new Map();
  for (const d of drafts) {
    map.set(Number(d.id_gira), {
      fuentes: d.fuentes || [],
      integrantes: d.integrantes || [],
    });
  }
  return map;
}

function buildRepertorioLink(giraId) {
  const origin =
    typeof window !== "undefined" ? window.location.origin : "";
  const path = typeof window !== "undefined" ? window.location.pathname : "";
  return `${origin}${path}?tab=giras&view=REPERTOIRE&giraId=${giraId}`;
}

function programAllowsConvocatoriaNotify(program) {
  return (
    program?.notificaciones_habilitadas !== false &&
    program?.notificacion_inicial_enviada === true
  );
}

/**
 * Músicos confirmados en borrador que no estaban en producción (altas).
 */
export async function computeAddedMusiciansForDraft(
  supabase,
  program,
  draftPayload,
) {
  const lite = { lite: true };
  const { roster: prodRoster } = await fetchRosterForGira(
    supabase,
    program,
    lite,
  );
  const { roster: draftRoster } = await fetchRosterForGira(supabase, program, {
    ...lite,
    fuentesOverride: draftPayload.fuentes,
    integrantesOverride:
      draftPayload.integrantes?.length > 0
        ? draftPayload.integrantes
        : null,
  });

  const prodActive = new Set(
    (prodRoster || [])
      .filter((m) => m.estado_gira !== "ausente")
      .map((m) => integranteKey(m.id)),
  );

  return (draftRoster || []).filter((m) => {
    const kid = integranteKey(m.id);
    return (
      m.estado_gira === "confirmado" &&
      !prodActive.has(kid) &&
      !!m.mail
    );
  });
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} sandboxId
 * @param {object} program — fila programas
 * @param {{ motivo: string, notify?: boolean }} options
 */
export async function applyGiraDraftWithNotifications(
  supabase,
  sandboxId,
  program,
  { motivo, notify = true },
) {
  const gid = Number(program.id);
  const { data: draft, error: draftErr } = await supabase
    .from("instrumentacion_sandbox_gira")
    .select("*")
    .eq("sandbox_id", sandboxId)
    .eq("id_gira", gid)
    .maybeSingle();
  if (draftErr) throw draftErr;
  if (!draft) throw new Error("No hay borrador para esta gira.");

  const payload = {
    fuentes: draft.fuentes || [],
    integrantes: draft.integrantes || [],
  };
  const addedMusicians = await computeAddedMusiciansForDraft(
    supabase,
    program,
    payload,
  );

  await applyGiraDraftToProduction(supabase, sandboxId, gid);

  let notified = 0;
  let notifyFailed = 0;
  if (
    notify &&
    motivo &&
    addedMusicians.length > 0 &&
    programAllowsConvocatoriaNotify(program)
  ) {
    const linkRepertorio = buildRepertorioLink(gid);
    const tasks = addedMusicians.map((m, idx) => ({
      id: `sandbox-alta-${gid}-${m.id}-${idx}`,
      variant: "ALTA",
      emails: [m.mail],
      nombres: [
        m.nombre_completo ||
          `${m.apellido || ""}, ${m.nombre || ""}`.trim(),
      ],
      reason: `Se te convoca a la gira. ${motivo}`,
      giraContext: {
        nombre_gira: program.nombre_gira,
        nomenclador: program.nomenclador,
        fecha_desde: program.fecha_desde,
        fecha_hasta: program.fecha_hasta,
        zona: program.zona,
      },
      linkRepertorio,
    }));
    const result = await sendConvocatoriaNotificationTasks(supabase, tasks, {
      gira: program,
      linkRepertorio,
    });
    notified = result.sent;
    notifyFailed = result.failed;
  }

  return {
    applied: true,
    addedCount: addedMusicians.length,
    notified,
    notifyFailed,
  };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} sandboxId
 * @param {Array<object>} programs — programas con borrador
 * @param {{ motivo: string, notify?: boolean }} options
 */
export async function applyAllSandboxDrafts(
  supabase,
  sandboxId,
  programs,
  { motivo, notify = true },
) {
  const drafts = await fetchSandboxGiraDrafts(supabase, sandboxId);
  if (!drafts.length) {
    throw new Error("No hay borradores para aplicar.");
  }

  const programById = new Map(programs.map((p) => [Number(p.id), p]));
  let totalAdded = 0;
  let totalNotified = 0;
  let totalNotifyFailed = 0;
  const appliedIds = [];

  for (const draft of drafts) {
    const program = programById.get(Number(draft.id_gira));
    if (!program) continue;
    const result = await applyGiraDraftWithNotifications(
      supabase,
      sandboxId,
      program,
      { motivo, notify },
    );
    appliedIds.push(draft.id_gira);
    totalAdded += result.addedCount;
    totalNotified += result.notified;
    totalNotifyFailed += result.notifyFailed;
  }

  return {
    appliedCount: appliedIds.length,
    addedCount: totalAdded,
    notified: totalNotified,
    notifyFailed: totalNotifyFailed,
    appliedIds,
  };
}

/**
 * Cuenta músicos nuevos agregados en todos los borradores del escenario.
 */
export async function countAllAddedMusiciansForDrafts(
  supabase,
  sandboxId,
  programs,
) {
  const drafts = await fetchSandboxGiraDrafts(supabase, sandboxId);
  const programById = new Map(programs.map((p) => [Number(p.id), p]));
  let total = 0;
  for (const draft of drafts) {
    const program = programById.get(Number(draft.id_gira));
    if (!program) continue;
    const added = await computeAddedMusiciansForDraft(supabase, program, {
      fuentes: draft.fuentes || [],
      integrantes: draft.integrantes || [],
    });
    total += added.length;
  }
  return { draftCount: drafts.length, addedCount: total, drafts };
}
