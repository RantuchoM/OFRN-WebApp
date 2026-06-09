import {
  buildSegmentSpecs,
  buildSegments,
  unionLocalidadIds,
} from "../utils/giraTramos";

const SEGMENTO_SELECT = `
  id,
  indice,
  fecha_desde,
  fecha_hasta,
  giras_tramo_localidades(id_localidad)
`;

const CORTES_SELECT = `
  id,
  id_gira,
  orden,
  fecha,
  hora,
  fecha_checkout,
  hora_checkout,
  fecha_checkin,
  hora_checkin,
  id_evento
`;

function mapSegmentRows(rows) {
  const localidadesByIndice = {};
  (rows || []).forEach((row) => {
    localidadesByIndice[row.indice] = (row.giras_tramo_localidades || [])
      .map((l) => Number(l.id_localidad))
      .filter((id) => !Number.isNaN(id));
  });
  return localidadesByIndice;
}

export async function fetchGiraSegmentosBundle(supabase, giraId, gira = null) {
  if (!giraId) {
    return { cortes: [], segmentRows: [], segments: [], cortesCount: 0 };
  }

  let programa = gira;
  if (!programa?.fecha_desde || !programa?.fecha_hasta) {
    const { data } = await supabase
      .from("programas")
      .select("id, fecha_desde, fecha_hasta")
      .eq("id", giraId)
      .maybeSingle();
    programa = data ?? programa;
  }

  const [cortesRes, segmentosRes] = await Promise.all([
    supabase
      .from("giras_tramo_cortes")
      .select(CORTES_SELECT)
      .eq("id_gira", giraId)
      .order("orden"),
    supabase
      .from("giras_tramo_segmentos")
      .select(SEGMENTO_SELECT)
      .eq("id_gira", giraId)
      .order("indice"),
  ]);

  if (cortesRes.error) throw cortesRes.error;
  if (segmentosRes.error) throw segmentosRes.error;

  const cortes = cortesRes.data || [];
  const segmentRows = segmentosRes.data || [];
  const localidadesByIndice = mapSegmentRows(segmentRows);
  const segments = buildSegments(programa, cortes, localidadesByIndice);

  return {
    cortes,
    segmentRows,
    segments,
    cortesCount: cortes.length,
    programa,
  };
}

/** Crea segmento 0 si la gira aún no tiene segmentos (post-migración / giras nuevas). */
export async function ensureDefaultSegment(supabase, giraId) {
  const { data: existing } = await supabase
    .from("giras_tramo_segmentos")
    .select("id")
    .eq("id_gira", giraId)
    .eq("indice", 0)
    .maybeSingle();

  if (existing?.id) return existing.id;

  const { data: programa, error: progErr } = await supabase
    .from("programas")
    .select("fecha_desde, fecha_hasta")
    .eq("id", giraId)
    .single();
  if (progErr) throw progErr;
  if (!programa?.fecha_desde || !programa?.fecha_hasta) {
    throw new Error(
      "La gira necesita fecha_desde y fecha_hasta para crear segmentos.",
    );
  }

  const { data: segment, error: segErr } = await supabase
    .from("giras_tramo_segmentos")
    .insert({
      id_gira: giraId,
      indice: 0,
      fecha_desde: programa.fecha_desde,
      fecha_hasta: programa.fecha_hasta,
    })
    .select("id")
    .single();
  if (segErr) throw segErr;

  const { data: locs } = await supabase
    .from("giras_localidades")
    .select("id_localidad")
    .eq("id_gira", giraId);

  if (locs?.length) {
    await supabase.from("giras_tramo_localidades").insert(
      locs.map((l) => ({
        id_segmento: segment.id,
        id_localidad: l.id_localidad,
      })),
    );
  }

  await supabase
    .from("programas_hospedajes")
    .update({ id_segmento: segment.id })
    .eq("id_programa", giraId)
    .is("id_segmento", null);

  return segment.id;
}

/** Sincroniza localidades del segmento 0 ↔ giras_localidades (modo tradicional). */
export async function syncSegmentZeroLocalidades(supabase, giraId, localidadIds) {
  const segmentId = await ensureDefaultSegment(supabase, giraId);
  const ids = [...new Set(localidadIds.map(Number).filter(Boolean))];

  await supabase
    .from("giras_tramo_localidades")
    .delete()
    .eq("id_segmento", segmentId);

  if (ids.length) {
    const { error } = await supabase.from("giras_tramo_localidades").insert(
      ids.map((id_localidad) => ({ id_segmento: segmentId, id_localidad })),
    );
    if (error) throw error;
  }

  await syncGirasLocalidadesFromSegments(supabase, giraId);
}

/** Unión de localidades de todos los segmentos → giras_localidades. */
export async function syncGirasLocalidadesFromSegments(supabase, giraId, gira = null) {
  const bundle = await fetchGiraSegmentosBundle(supabase, giraId, gira);
  const unionIds = unionLocalidadIds(bundle.segments);

  const { data: current } = await supabase
    .from("giras_localidades")
    .select("id_localidad")
    .eq("id_gira", giraId);

  const currentSet = new Set((current || []).map((r) => Number(r.id_localidad)));
  const targetSet = new Set(unionIds);

  const toAdd = unionIds.filter((id) => !currentSet.has(id));
  const toRemove = [...currentSet].filter((id) => !targetSet.has(id));

  if (toAdd.length) {
    const { error } = await supabase.from("giras_localidades").insert(
      toAdd.map((id_localidad) => ({ id_gira: giraId, id_localidad })),
    );
    if (error) throw error;
  }

  if (toRemove.length) {
    const { error } = await supabase
      .from("giras_localidades")
      .delete()
      .eq("id_gira", giraId)
      .in("id_localidad", toRemove);
    if (error) throw error;
  }
}

/**
 * Recalcula filas de giras_tramo_segmentos tras cambiar cortes o fechas de gira.
 * Preserva localidades por índice cuando es posible.
 */
export async function rebuildSegmentosFromCortes(supabase, giraId) {
  const { data: programa, error: progErr } = await supabase
    .from("programas")
    .select("fecha_desde, fecha_hasta")
    .eq("id", giraId)
    .single();
  if (progErr) throw progErr;

  const bundle = await fetchGiraSegmentosBundle(supabase, giraId, programa);
  const specs = buildSegmentSpecs(programa, bundle.cortes);
  const locsByIndice = mapSegmentRows(bundle.segmentRows);

  const oldIdByIndice = {};
  (bundle.segmentRows || []).forEach((row) => {
    oldIdByIndice[row.indice] = row.id;
  });

  const hospedajeIndice = {};
  if (Object.keys(oldIdByIndice).length) {
    const { data: hoteles } = await supabase
      .from("programas_hospedajes")
      .select("id, id_segmento")
      .eq("id_programa", giraId);
    (hoteles || []).forEach((h) => {
      const idx = Object.entries(oldIdByIndice).find(
        ([, segId]) => Number(segId) === Number(h.id_segmento),
      )?.[0];
      if (idx != null) hospedajeIndice[h.id] = Number(idx);
    });
  }

  await supabase.from("giras_tramo_segmentos").delete().eq("id_gira", giraId);

  const newIdByIndice = {};
  for (const spec of specs) {
    const { data: row, error } = await supabase
      .from("giras_tramo_segmentos")
      .insert({
        id_gira: giraId,
        indice: spec.indice,
        fecha_desde: spec.fecha_desde,
        fecha_hasta: spec.fecha_hasta,
      })
      .select("id, indice")
      .single();
    if (error) throw error;
    newIdByIndice[row.indice] = row.id;

    const locIds =
      locsByIndice[spec.indice]?.length > 0
        ? locsByIndice[spec.indice]
        : spec.indice === 0
          ? locsByIndice[0] || []
          : [];

    if (locIds.length) {
      await supabase.from("giras_tramo_localidades").insert(
        locIds.map((id_localidad) => ({
          id_segmento: row.id,
          id_localidad,
        })),
      );
    }
  }

  for (const [hospId, indice] of Object.entries(hospedajeIndice)) {
    const newSegId = newIdByIndice[indice] ?? newIdByIndice[0];
    if (newSegId) {
      await supabase
        .from("programas_hospedajes")
        .update({ id_segmento: newSegId })
        .eq("id", hospId);
    }
  }

  await syncGirasLocalidadesFromSegments(supabase, giraId, programa);
  return fetchGiraSegmentosBundle(supabase, giraId, programa);
}

/** Localidades de un segmento concreto. */
export async function updateSegmentLocalidades(
  supabase,
  segmentRowId,
  giraId,
  localidadIds,
) {
  const ids = [...new Set(localidadIds.map(Number).filter(Boolean))];

  await supabase
    .from("giras_tramo_localidades")
    .delete()
    .eq("id_segmento", segmentRowId);

  if (ids.length) {
    const { error } = await supabase.from("giras_tramo_localidades").insert(
      ids.map((id_localidad) => ({ id_segmento: segmentRowId, id_localidad })),
    );
    if (error) throw error;
  }

  await syncGirasLocalidadesFromSegments(supabase, giraId);
}

function defaultCorteDate(fechaDesde, fechaHasta) {
  if (!fechaDesde) return null;
  if (!fechaHasta || fechaHasta === fechaDesde) return fechaDesde;
  const start = new Date(`${fechaDesde}T12:00:00`);
  const end = new Date(`${fechaHasta}T12:00:00`);
  const mid = new Date((start.getTime() + end.getTime()) / 2);
  return mid.toISOString().slice(0, 10);
}

/** Agrega un corte de tijera y recalcula segmentos. */
export async function addCorte(supabase, giraId, { fecha, hora = "12:00:00" }) {
  if (!fecha) {
    throw new Error("Indicá la fecha del corte.");
  }

  const { data: existing } = await supabase
    .from("giras_tramo_cortes")
    .select("orden")
    .eq("id_gira", giraId)
    .order("orden", { ascending: false })
    .limit(1);

  const orden = (existing?.[0]?.orden ?? 0) + 1;

  const { error } = await supabase.from("giras_tramo_cortes").insert({
    id_gira: giraId,
    orden,
    fecha,
    hora: hora.length === 5 ? `${hora}:00` : hora,
    fecha_checkout: fecha,
    hora_checkout: "10:00:00",
    fecha_checkin: fecha,
    hora_checkin: "14:00:00",
  });
  if (error) throw error;

  return rebuildSegmentosFromCortes(supabase, giraId);
}

export async function addCorteAtMidpoint(supabase, giraId, gira) {
  const fecha =
    defaultCorteDate(gira?.fecha_desde, gira?.fecha_hasta) ?? gira?.fecha_desde;
  return addCorte(supabase, giraId, { fecha, hora: "12:00:00" });
}

export async function removeCorte(supabase, corteId, giraId) {
  const { error } = await supabase
    .from("giras_tramo_cortes")
    .delete()
    .eq("id", corteId);
  if (error) throw error;
  return rebuildSegmentosFromCortes(supabase, giraId);
}

export async function updateCortePosition(
  supabase,
  corteId,
  giraId,
  { fecha, hora },
) {
  const payload = {};
  if (fecha) payload.fecha = fecha;
  if (hora) payload.hora = hora.length === 5 ? `${hora}:00` : hora;

  const { error } = await supabase
    .from("giras_tramo_cortes")
    .update(payload)
    .eq("id", corteId);
  if (error) throw error;
  return rebuildSegmentosFromCortes(supabase, giraId);
}

/** Transición hotelera global en un corte intermedio. */
export async function updateCorteHotelTransition(supabase, corteId, fields) {
  const allowed = [
    "fecha_checkout",
    "hora_checkout",
    "fecha_checkin",
    "hora_checkin",
  ];
  const payload = {};
  allowed.forEach((key) => {
    if (fields[key] === undefined) return;
    if (key.startsWith("hora_")) {
      const raw = String(fields[key]).slice(0, 5);
      if (!/^\d{1,2}:[0-5]\d$/.test(raw)) return;
      const [h, m] = raw.split(":");
      payload[key] = `${String(h).padStart(2, "0")}:${m}:00`;
      return;
    }
    payload[key] = fields[key];
  });
  if (!Object.keys(payload).length) return;

  const { error } = await supabase
    .from("giras_tramo_cortes")
    .update(payload)
    .eq("id", corteId);
  if (error) throw error;
}

/** Actualiza fechas del segmento único cuando cambian fecha_desde/hasta (0 cortes). */
export async function syncSingleSegmentDates(
  supabase,
  giraId,
  fechaDesde,
  fechaHasta,
) {
  const { data: cortes } = await supabase
    .from("giras_tramo_cortes")
    .select("id")
    .eq("id_gira", giraId)
    .limit(1);

  if (cortes?.length) {
    return rebuildSegmentosFromCortes(supabase, giraId);
  }

  await ensureDefaultSegment(supabase, giraId);

  const { error } = await supabase
    .from("giras_tramo_segmentos")
    .update({ fecha_desde: fechaDesde, fecha_hasta: fechaHasta })
    .eq("id_gira", giraId)
    .eq("indice", 0);
  if (error) throw error;
}
