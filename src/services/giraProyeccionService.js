import { supabase } from "./supabase";
import {
  defaultHoraFinProyeccion,
  defaultHoraInicioProyeccion,
  indexDemorasLocalidad,
  sliceTime,
} from "../utils/giraProyeccionPcv";

export async function fetchGiraDemorasLocalidad() {
  const { data, error } = await supabase
    .from("gira_demoras_localidad")
    .select("id_localidad_origen, id_localidad_destino, minutos, updated_at")
    .order("id_localidad_origen")
    .order("id_localidad_destino");
  if (error) throw error;
  return (data || []).map((r) => ({
    id_localidad_origen: Number(r.id_localidad_origen),
    id_localidad_destino: Number(r.id_localidad_destino),
    minutos: Number(r.minutos) || 0,
    updated_at: r.updated_at,
  }));
}

/** @deprecated Usar fetchGiraDemorasLocalidad */
export async function fetchGiraDemorasHub() {
  return fetchGiraDemorasLocalidad();
}

export async function fetchLocalidadesAll() {
  const { data, error } = await supabase
    .from("localidades")
    .select("id, localidad, hub, alias")
    .order("localidad");
  if (error) throw error;
  const rows = data || [];
  const map = new Map();
  const nameById = new Map();
  const aliasById = new Map();
  for (const row of rows) {
    const id = Number(row.id);
    if (row.hub) map.set(id, row.hub);
    nameById.set(id, row.localidad || "");
    if (row.alias) aliasById.set(id, row.alias);
  }
  return { rows, map, nameById, aliasById };
}

/** @deprecated alias */
export async function fetchLocalidadesHubMap() {
  return fetchLocalidadesAll();
}

export async function upsertGiraDemoraLocalidad(row) {
  const origen = Number(row.id_localidad_origen);
  const destino = Number(row.id_localidad_destino);
  if (!origen || !destino) {
    throw new Error("Origen y destino son obligatorios");
  }
  const payload = {
    id_localidad_origen: origen,
    id_localidad_destino: destino,
    minutos: Math.max(0, Math.round(Number(row.minutos) || 0)),
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase
    .from("gira_demoras_localidad")
    .upsert(payload, {
      onConflict: "id_localidad_origen,id_localidad_destino",
    })
    .select("id_localidad_origen, id_localidad_destino, minutos, updated_at")
    .single();
  if (error) throw error;
  return {
    id_localidad_origen: Number(data.id_localidad_origen),
    id_localidad_destino: Number(data.id_localidad_destino),
    minutos: Number(data.minutos) || 0,
    updated_at: data.updated_at,
  };
}

/** @deprecated */
export async function updateGiraDemoraHub(row) {
  return upsertGiraDemoraLocalidad(row);
}

export async function deleteGiraDemoraLocalidad(idOrigen, idDestino) {
  const { error } = await supabase
    .from("gira_demoras_localidad")
    .delete()
    .eq("id_localidad_origen", Number(idOrigen))
    .eq("id_localidad_destino", Number(idDestino));
  if (error) throw error;
}

export async function updateLocalidadHub(idLocalidad, hub) {
  const { data, error } = await supabase
    .from("localidades")
    .update({ hub: hub || null })
    .eq("id", idLocalidad)
    .select("id, localidad, hub")
    .single();
  if (error) throw error;
  return data;
}

export async function updateProgramaProyeccion(idPrograma, patch) {
  const payload = {};
  if ("fecha_desde" in patch) {
    payload.fecha_desde = patch.fecha_desde
      ? String(patch.fecha_desde).slice(0, 10)
      : null;
  }
  if ("fecha_hasta" in patch) {
    payload.fecha_hasta = patch.fecha_hasta
      ? String(patch.fecha_hasta).slice(0, 10)
      : null;
  }
  if ("hora_inicio_proyeccion" in patch) {
    payload.hora_inicio_proyeccion =
      sliceTime(patch.hora_inicio_proyeccion) || null;
  }
  if ("hora_fin_proyeccion" in patch) {
    payload.hora_fin_proyeccion = sliceTime(patch.hora_fin_proyeccion) || null;
  }
  if ("servicios_estimados" in patch) {
    const v = patch.servicios_estimados;
    payload.servicios_estimados =
      v === "" || v == null ? null : Number(v);
  }
  const { data, error } = await supabase
    .from("programas")
    .update(payload)
    .eq("id", idPrograma)
    .select(
      "id, fecha_desde, fecha_hasta, hora_inicio_proyeccion, hora_fin_proyeccion, servicios_estimados",
    )
    .single();
  if (error) throw error;
  return data;
}

/**
 * Recalcula defaults 15:00 / 23|14 según conciertos de la gira.
 */
export async function resetProgramaProyeccionDefaults(idPrograma, eventos = []) {
  return updateProgramaProyeccion(idPrograma, {
    hora_inicio_proyeccion: defaultHoraInicioProyeccion(),
    hora_fin_proyeccion: defaultHoraFinProyeccion(eventos),
    servicios_estimados: null,
  });
}

export async function fetchProgramasProyeccion({
  fechaDesde,
  fechaHasta,
  tipos = ["Sinfónico", "Camerata Filarmónica"],
} = {}) {
  let q = supabase
    .from("programas")
    .select(
      `
      id, nombre_gira, nomenclador, tipo, zona, estado,
      fecha_desde, fecha_hasta,
      hora_inicio_proyeccion, hora_fin_proyeccion, servicios_estimados,
      giras_fuentes ( tipo, valor_id, valor_texto ),
      giras_localidades ( id_localidad, localidades ( id, localidad, hub ) )
    `,
    )
    .order("fecha_desde", { ascending: true });
  if (tipos?.length) q = q.in("tipo", tipos);
  if (fechaDesde) q = q.gte("fecha_hasta", fechaDesde);
  if (fechaHasta) q = q.lte("fecha_desde", fechaHasta);
  const { data, error } = await q;
  if (error) throw error;
  const programas = data || [];
  const ids = programas.map((p) => p.id).filter(Boolean);
  if (!ids.length) return programas;

  const tramos = [];
  const chunk = 80;
  for (let i = 0; i < ids.length; i += chunk) {
    const slice = ids.slice(i, i + chunk);
    const { data: rows, error: trErr } = await supabase
      .from("giras_tramo_segmentos")
      .select(
        `id, id_gira, indice, fecha_desde, fecha_hasta,
         giras_tramo_localidades ( id_localidad, localidades ( id, localidad ) )`,
      )
      .in("id_gira", slice);
    if (trErr) throw trErr;
    tramos.push(...(rows || []));
  }
  const byGira = new Map();
  for (const t of tramos) {
    const gid = Number(t.id_gira);
    if (!byGira.has(gid)) byGira.set(gid, []);
    byGira.get(gid).push(t);
  }
  for (const p of programas) {
    p.giras_tramo_segmentos = byGira.get(Number(p.id)) || [];
  }
  return programas;
}

/** Ensambles locales (`es_ensamble_local`) + mapa de CF (para encabezados de matriz). */
export async function fetchEnsamblesProyeccionMatrix() {
  const [ensRes, cfRes] = await Promise.all([
    supabase
      .from("ensambles")
      .select(
        "id, ensamble, id_familia, id_localidad, es_ensamble_local, localidades ( id, localidad, alias )",
      )
      .eq("es_ensamble_local", true)
      .order("ensamble"),
    supabase.from("ensambles_cf").select("id_ensamble, id_ensamble_cf"),
  ]);
  if (ensRes.error) throw ensRes.error;
  if (cfRes.error) throw cfRes.error;

  const cfIds = [
    ...new Set(
      (cfRes.data || [])
        .map((r) => Number(r.id_ensamble_cf))
        .filter((id) => Number.isFinite(id) && id > 0),
    ),
  ];
  let cfRows = [];
  if (cfIds.length) {
    const { data, error } = await supabase
      .from("ensambles")
      .select("id, ensamble")
      .in("id", cfIds);
    if (error) throw error;
    cfRows = data || [];
  }
  const cfById = new Map(cfRows.map((r) => [Number(r.id), r]));

  const byChild = new Map();
  for (const row of cfRes.data || []) {
    const child = Number(row.id_ensamble);
    const cf = Number(row.id_ensamble_cf);
    if (!child || !cf || child === cf) continue;
    if (!byChild.has(child)) byChild.set(child, []);
    byChild.get(child).push(cf);
  }

  const ensambles = (ensRes.data || []).map((e) => ({
    ...e,
    id_ensamble_cf_ids: [...new Set(byChild.get(Number(e.id)) || [])],
  }));

  return { ensambles, cfById };
}

/** Concierto / ensayos de gira / ensayo ensamble (paridad informe feriados). */
export async function fetchEventosGiraTiposServicio(giraIds) {
  const ids = [...new Set((giraIds || []).map(Number).filter(Boolean))];
  if (!ids.length) return [];
  const { data, error } = await supabase
    .from("eventos")
    .select(
      "id, id_gira, fecha, hora_inicio, hora_fin, id_tipo_evento, es_didactico, is_deleted",
    )
    .in("id_gira", ids)
    .in("id_tipo_evento", [1, 2, 3, 13])
    .eq("is_deleted", false);
  if (error) throw error;
  return data || [];
}

export async function fetchFeriadosPeriod({ fechaDesde, fechaHasta } = {}) {
  let q = supabase
    .from("feriados")
    .select("fecha, detalle, es_feriado")
    .order("fecha");
  if (fechaDesde) q = q.gte("fecha", String(fechaDesde).slice(0, 10));
  if (fechaHasta) q = q.lte("fecha", String(fechaHasta).slice(0, 10));
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

export function demorasMapFromRows(rows) {
  return indexDemorasLocalidad(rows);
}
