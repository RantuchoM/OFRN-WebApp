import { fetchGiraDemorasLocalidad } from "./giraProyeccionService";
import { fetchOrCreateProyeccionConfig } from "./ensambleProyeccionEnsayosService";
import { getAnioProyeccion } from "../utils/ensambleProyeccionConfig";
import { isRegionalConvocatoriaEnsamble } from "../utils/convocatoriaEnsambleViews";

async function fetchInChunks(supabase, table, select, column, ids) {
  const unique = [...new Set((ids || []).map(Number).filter(Boolean))];
  const out = [];
  const size = 80;
  for (let i = 0; i < unique.length; i += size) {
    const slice = unique.slice(i, i + size);
    const { data, error } = await supabase
      .from(table)
      .select(select)
      .in(column, slice);
    if (error) throw error;
    out.push(...(data || []));
  }
  return out;
}

/**
 * Bundle vivo desde Supabase, misma forma que los JSON del CLI
 * (`scripts/informe-ensambles-2027.mjs`).
 * Año = getAnioProyeccion() («el que viene»).
 */
export async function fetchInformeEnsambles2027Bundle(supabase) {
  if (!supabase) throw new Error("Supabase no disponible");

  const YEAR = getAnioProyeccion();
  const yearStart = `${YEAR}-01-01`;
  const yearEnd = `${YEAR}-12-31`;

  const [
    girasRes,
    ensRes,
    cfRes,
    ensayosRes,
    ciclosRes,
    feriadosRes,
    demorasRows,
    proyeccionConfig,
    locsRes,
  ] = await Promise.all([
    supabase
      .from("programas")
      .select(
        `
        id, nombre_gira, tipo, zona, estado,
        fecha_desde, fecha_hasta,
        hora_inicio_proyeccion, hora_fin_proyeccion,
        giras_fuentes ( tipo, valor_id, valor_texto ),
        giras_localidades ( id_localidad, localidades ( id, localidad, alias ) )
      `,
      )
      .in("tipo", ["Sinfónico", "Camerata Filarmónica"])
      .gte("fecha_desde", yearStart)
      .lte("fecha_desde", yearEnd)
      .order("fecha_desde"),
    supabase
      .from("ensambles")
      .select(
        "id, ensamble, id_familia, id_localidad, es_ensamble_local, localidades ( id, localidad, alias )",
      )
      .order("ensamble"),
    supabase.from("ensambles_cf").select("id_ensamble, id_ensamble_cf"),
    supabase
      .from("ensamble_proyeccion_ensayos")
      .select(
        `
        id, id_ensamble, iso_dow, hora_inicio, hora_fin, id_locacion, titulo, activo,
        locaciones ( id, nombre ),
        ensambles ( id, ensamble )
      `,
      )
      .eq("activo", true)
      .order("id_ensamble")
      .order("iso_dow")
      .order("hora_inicio"),
    supabase
      .from("programas")
      .select(
        `
        id, nombre_gira, tipo, subtitulo, fecha_desde, fecha_hasta,
        giras_fuentes ( tipo, valor_id, valor_texto )
      `,
      )
      .eq("tipo", "Ensamble")
      .gte("fecha_desde", yearStart)
      .lte("fecha_desde", yearEnd),
    supabase
      .from("feriados")
      .select("fecha, detalle, es_feriado")
      .gte("fecha", yearStart)
      .lte("fecha", yearEnd)
      .order("fecha"),
    fetchGiraDemorasLocalidad(),
    fetchOrCreateProyeccionConfig(YEAR),
    supabase.from("localidades").select("id, localidad, alias").order("localidad"),
  ]);

  if (girasRes.error) throw girasRes.error;
  if (ensRes.error) throw ensRes.error;
  if (cfRes.error) throw cfRes.error;
  if (ensayosRes.error) throw ensayosRes.error;
  if (ciclosRes.error) throw ciclosRes.error;
  if (feriadosRes.error) throw feriadosRes.error;
  if (locsRes.error) throw locsRes.error;

  const cfByEns = new Map();
  for (const row of cfRes.data || []) {
    const eid = Number(row.id_ensamble);
    if (!cfByEns.has(eid)) cfByEns.set(eid, []);
    cfByEns.get(eid).push(Number(row.id_ensamble_cf));
  }

  const ensamblesRaw = (ensRes.data || [])
    .filter((e) => isRegionalConvocatoriaEnsamble(e))
    .map((e) => ({
      id: e.id,
      ensamble: e.ensamble,
      id_familia: e.id_familia,
      id_localidad: e.id_localidad,
      es_ensamble_local: e.es_ensamble_local !== false,
      localidad: e.localidades?.localidad || "",
      localidad_alias: e.localidades?.alias || null,
      cf_ids: cfByEns.get(Number(e.id)) || [],
    }));

  const giraIds = (girasRes.data || []).map((g) => g.id);
  const [tramos, eventosGiras] = await Promise.all([
    fetchInChunks(
      supabase,
      "giras_tramo_segmentos",
      `id, id_gira, indice, fecha_desde, fecha_hasta,
       giras_tramo_localidades ( id_localidad )`,
      "id_gira",
      giraIds,
    ),
    fetchInChunks(
      supabase,
      "eventos",
      `id, id_gira, fecha, hora_inicio, hora_fin, id_tipo_evento, es_didactico, is_deleted,
       tipos_evento ( nombre )`,
      "id_gira",
      giraIds,
    ),
  ]);

  const tramosByGira = new Map();
  for (const t of tramos) {
    const gid = Number(t.id_gira);
    if (!tramosByGira.has(gid)) tramosByGira.set(gid, []);
    tramosByGira.get(gid).push({
      indice: t.indice,
      fecha_desde: t.fecha_desde,
      fecha_hasta: t.fecha_hasta,
      localidad_ids: (t.giras_tramo_localidades || [])
        .map((l) => Number(l.id_localidad))
        .filter(Boolean),
    });
  }

  const girasRaw = (girasRes.data || []).map((g) => ({
    id: g.id,
    nombre_gira: g.nombre_gira,
    tipo: g.tipo,
    zona: g.zona,
    estado: g.estado,
    fecha_desde: g.fecha_desde,
    fecha_hasta: g.fecha_hasta,
    hora_inicio_proyeccion: g.hora_inicio_proyeccion,
    hora_fin_proyeccion: g.hora_fin_proyeccion,
    fuentes: g.giras_fuentes || [],
    localias: (g.giras_localidades || [])
      .map((gl) => ({
        id: gl.localidades?.id ?? gl.id_localidad,
        localidad: gl.localidades?.localidad || "",
        alias: gl.localidades?.alias || null,
      }))
      .filter((l) => l.id),
    tramos: tramosByGira.get(Number(g.id)) || [],
  }));

  const eventosGirasYear = (eventosGiras || [])
    .filter((e) => !e.is_deleted)
    .filter((e) => [1, 2, 3, 13].includes(Number(e.id_tipo_evento)))
    .map((e) => ({
      id_gira: e.id_gira,
      fecha: e.fecha,
      hora_inicio: e.hora_inicio,
      hora_fin: e.hora_fin,
      id_tipo_evento: e.id_tipo_evento,
      tipo_evento: e.tipos_evento?.nombre || "",
      es_didactico: e.es_didactico,
    }));

  /** Plantilla editable (`ensamble_proyeccion_ensayos`); forma legacy ensayosProx para el export. */
  const ensayosProx = (ensayosRes.data || []).map((e) => ({
    id: e.id,
    id_ensamble: e.id_ensamble,
    iso_dow: e.iso_dow,
    hora_inicio: e.hora_inicio,
    hora_fin: e.hora_fin,
    id_locacion: e.id_locacion,
    locacion: e.locaciones?.nombre || null,
    titulo: e.titulo,
    activo: e.activo !== false,
    ensambles: e.ensambles?.ensamble || "",
    id_tipo_evento: 13,
    descripcion: e.titulo,
    source: "ensamble_proyeccion_ensayos",
  }));

  const cicloIds = (ciclosRes.data || []).map((c) => c.id);
  const cicloEventos = await fetchInChunks(
    supabase,
    "eventos",
    "id, id_gira, fecha, hora_inicio, hora_fin, id_tipo_evento, es_didactico, descripcion, is_deleted",
    "id_gira",
    cicloIds,
  );
  const cicloEvByGira = new Map();
  for (const ev of cicloEventos) {
    if (ev.is_deleted) continue;
    if (Number(ev.id_tipo_evento) !== 1) continue;
    const gid = Number(ev.id_gira);
    if (!cicloEvByGira.has(gid)) cicloEvByGira.set(gid, []);
    cicloEvByGira.get(gid).push(ev);
  }

  const ciclosRaw = (ciclosRes.data || []).map((c) => ({
    id: c.id,
    nombre_gira: c.nombre_gira,
    tipo: c.tipo,
    subtitulo: c.subtitulo,
    fecha_desde: c.fecha_desde,
    fecha_hasta: c.fecha_hasta,
    fuentes: c.giras_fuentes || [],
    eventos: cicloEvByGira.get(Number(c.id)) || [],
  }));

  const feriadosYear = (feriadosRes.data || []).map((f) => ({
    fecha: f.fecha,
    detalle: f.detalle,
    es_feriado: f.es_feriado,
  }));

  const localidades = (locsRes.data || []).map((l) => ({
    id: l.id,
    localidad: l.localidad,
    alias: l.alias || null,
  }));

  return {
    anio: YEAR,
    proyeccionConfig,
    girasRaw,
    ensamblesRaw,
    ensayosProx,
    ciclosRaw,
    feriados2027: feriadosYear,
    eventosGiras2027: eventosGirasYear,
    demorasRows,
    localidades,
  };
}

/**
 * Descarga PDF y/o Excel del informe (mismo contenido que el mail).
 * @param {'pdf'|'excel'|'both'} format
 */
export async function downloadInformeEnsambles2027(supabase, format = "both") {
  const { exportInformeEnsambles2027 } = await import(
    "../utils/informeEnsambles2027Export.js"
  );
  const bundle = await fetchInformeEnsambles2027Bundle(supabase);
  return exportInformeEnsambles2027(bundle, {
    format: format === "excel" ? "xlsx" : format,
    demorasRows: bundle.demorasRows,
  });
}
