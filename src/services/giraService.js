/**
 * src/services/giraService.js
 * Servicio autónomo para cálculos On-Demand en el Dashboard
 */

/**
 * Resuelve los IDs de los integrantes de una gira:
 * (Miembros de Ensambles Convocados + Familias Convocadas + Overrides) MINUS (Miembros de Ensambles Excluidos) MINUS (Ausentes).
 * La exclusión de ensamble manda: si un ensamble está en EXCL_ENSAMBLE, sus miembros no entran aunque su familia esté convocada.
 * @see docs/roster-spec.md
 */
export const resolveGiraRosterIds = async (supabase, giraId) => {
  try {
    const num = (id) => Number(id);

    // A. Traemos configuración de fuentes y overrides
    const [fuentesRes, overridesRes] = await Promise.all([
      supabase.from("giras_fuentes").select("*").eq("id_gira", giraId),
      supabase
        .from("giras_integrantes")
        .select("id_integrante, estado")
        .eq("id_gira", giraId),
    ]);

    const fuentes = fuentesRes.data || [];
    const overrides = overridesRes.data || [];

    const integrantesIds = new Set();

    // B. Ensambles convocados (fuentes activas)
    const ensambleIds = fuentes
      .filter((f) => f.tipo === "ENSAMBLE")
      .map((f) => f.valor_id);

    if (ensambleIds.length > 0) {
      const { data: ensambleMembers } = await supabase
        .from("integrantes_ensambles")
        .select("id_integrante")
        .in("id_ensamble", ensambleIds);

      ensambleMembers?.forEach((i) => integrantesIds.add(num(i.id_integrante)));
    }

    // C. Familias convocadas
    const familias = fuentes
      .filter((f) => f.tipo === "FAMILIA")
      .map((f) => f.valor_texto);

    if (familias.length > 0) {
      const { data: familiaMembers } = await supabase
        .from("integrantes")
        .select("id, instrumentos!inner(familia)")
        .in("instrumentos.familia", familias);

      familiaMembers?.forEach((i) => integrantesIds.add(num(i.id)));
    }

    // D. Overrides: agregar a los forzados manualmente (estado !== ausente)
    overrides.forEach((o) => {
      if (o.estado !== "ausente") {
        integrantesIds.add(num(o.id_integrante));
      }
    });

    // E. Excluidos por ensamble: sus miembros se sacan siempre (la exclusión manda)
    const exclEnsambleIds = fuentes
      .filter((f) => f.tipo === "EXCL_ENSAMBLE")
      .map((f) => f.valor_id);

    const excludedByEnsamble = new Set();
    if (exclEnsambleIds.length > 0) {
      const { data: exclMembers } = await supabase
        .from("integrantes_ensambles")
        .select("id_integrante")
        .in("id_ensamble", exclEnsambleIds);

      exclMembers?.forEach((i) => excludedByEnsamble.add(num(i.id_integrante)));
    }

    // F. Ausentes (giras_integrantes.estado === 'ausente')
    const ausentesIds = new Set(
      overrides
        .filter((o) => o.estado === "ausente")
        .map((o) => num(o.id_integrante)),
    );

    // Resultado: convocados MINUS excluidos por ensamble MINUS ausentes
    return Array.from(integrantesIds).filter(
      (id) =>
        !excludedByEnsamble.has(num(id)) && !ausentesIds.has(num(id)),
    );
  } catch (error) {
    console.error("[GiraService] Error resolviendo roster IDs:", error);
    return [];
  }
};

/** Valores de `programas.tipo` (enum tipo_programa) usados en filtros del reporte de matriz. */
export const TIPOS_PROGRAMA_ASISTENCIA_MATRIZ = [
  "Sinfónico",
  "Camerata Filarmónica",
  "Ensamble",
  "Jazz Band",
  "Comisión",
];

/**
 * Carga datos base para el reporte Matriz de Asistencia (programas recientes, integrantes con instrumento, ensambles).
 * Los programas se traen desde el 1-ene del año anterior para no perder giras que cruzan de año.
 */
export const fetchAsistenciaMatrixBaseData = async (supabase) => {
  if (!supabase) {
    return {
      programas: [],
      integrantes: [],
      ensambles: [],
      memberships: [],
      error: null,
    };
  }
  const y = new Date().getFullYear();
  const minFechaDesde = `${y - 1}-01-01`;
  try {
    const [programasRes, integrantesRes, ensRes, ieRes] = await Promise.all([
      supabase
        .from("programas")
        .select(
          "id, nomenclador, mes_letra, nombre_gira, subtitulo, tipo, fecha_desde, fecha_hasta",
        )
        .gte("fecha_desde", minFechaDesde)
        .order("fecha_desde", { ascending: true }),
      supabase
        .from("integrantes")
        .select(
          "id, nombre, apellido, id_instr, instrumentos ( id, instrumento, familia, abreviatura )",
        )
        .order("id_instr", { ascending: true }),
      supabase.from("ensambles").select("id, ensamble").order("ensamble"),
      supabase.from("integrantes_ensambles").select("id_ensamble, id_integrante"),
    ]);

    const err =
      programasRes.error ||
      integrantesRes.error ||
      ensRes.error ||
      ieRes.error;
    if (err) {
      console.error("[GiraService] fetchAsistenciaMatrixBaseData:", err);
      return {
        programas: [],
        integrantes: [],
        ensambles: [],
        memberships: [],
        error: err,
      };
    }

    return {
      programas: programasRes.data || [],
      integrantes: integrantesRes.data || [],
      ensambles: ensRes.data || [],
      memberships: ieRes.data || [],
      error: null,
    };
  } catch (e) {
    console.error("[GiraService] fetchAsistenciaMatrixBaseData:", e);
    return {
      programas: [],
      integrantes: [],
      ensambles: [],
      memberships: [],
      error: e,
    };
  }
};

// Selección reducida de eventos pensada para trasposición/previa en UnifiedAgenda
const EVENT_FOR_TRANSPOSE_SELECT = `
  id, fecha, hora_inicio, hora_fin, tecnica, descripcion, convocados, id_tipo_evento, id_locacion, id_gira, id_gira_transporte, id_estado_venue,
  tipos_evento ( id, nombre, color, categorias_tipos_eventos (id, nombre) ),
  locaciones ( id, nombre, direccion, localidades (localidad) )
`;

/**
 * Devuelve todos los eventos de una gira específica (programa) en orden cronológico.
 * Pensado para el modal de trasposición de agenda.
 */
export const getEventsByGira = async (supabase, giraId) => {
  if (!supabase || !giraId) return [];
  try {
    const { data, error } = await supabase
      .from("eventos")
      .select(EVENT_FOR_TRANSPOSE_SELECT)
      .eq("id_gira", giraId)
      .eq("is_deleted", false)
      .order("fecha", { ascending: true })
      .order("hora_inicio", { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error("[GiraService] getEventsByGira:", err);
    return [];
  }
};

/**
 * 2. FUNCIÓN PRINCIPAL (EXPORTADA)
 * Devuelve el Roster con datos de Logística (Habitación, Transporte)
 * para ser consumido por los calculadores de estadísticas.
 */
export const getEnrichedRosterOnDemand = async (supabase, giraId) => {
  try {
    // 1. Obtener la lista limpia de IDs de personas que viajan
    const finalRosterIds = await resolveGiraRosterIds(supabase, giraId);

    if (!finalRosterIds || finalRosterIds.length === 0) return [];

    // 2. Traer datos en paralelo:
    //    - Detalles de las personas
    //    - Habitaciones asignadas en esta gira
    //    - Transportes asignados en esta gira
    const [paxRes, hospedajesRes, transportesRes] = await Promise.all([
      supabase
        .from("integrantes")
        .select("*, localidades(localidad)")
        .in("id", finalRosterIds),

      supabase
        .from("programas_hospedajes")
        .select("id, hospedaje_habitaciones(*)")
        .eq("id_programa", giraId),

      supabase
        .from("giras_transportes")
        .select("id, pasajeros_ids")
        .eq("id_gira", giraId),
    ]);

    const fullRoster = paxRes.data || [];

    // Aplanamos todas las habitaciones de todos los hoteles de la gira
    // (hospedaje_habitaciones viene anidado dentro de cada hospedaje)
    const allRooms =
      hospedajesRes.data?.flatMap((h) => h.hospedaje_habitaciones || []) || [];
    const allTransports = transportesRes.data || [];

    // 3. Cruzar datos (Enriquecer)
    const paxIdNum = (id) => Number(id);
    return fullRoster.map((pax) => {
      const pid = paxIdNum(pax.id);
      const habitacion =
        allRooms.find((r) =>
          (r.id_integrantes_asignados || []).some(
            (aid) => Number(aid) === pid,
          ),
        ) || null;

      const transporte =
        allTransports.find((t) =>
          (t.pasajeros_ids || []).some((paid) => Number(paid) === pid),
        ) || null;

      return {
        ...pax,
        habitacion,
        transporte,
        // Inyectamos estado 'confirmado' para que el filtro del calculator lo tome como activo
        estado_gira: "confirmado",
      };
    });
  } catch (error) {
    console.error("[GiraService] Error en enrichedRoster on demand:", error);
    return [];
  }
};
export const syncBowingToProgram = async (
  supabase,
  { programId, obraId, obraTitulo, nombreSet, targetDriveId },
) => {
  const { data, error } = await supabase.functions.invoke("manage-drive", {
    body: {
      action: "sync_bowing_to_program",
      programId,
      obraId,
      obraTitulo,
      nombreSet,
      targetDriveId,
    },
  });

  if (error) throw error;
  return data;
};

/**
 * Copia múltiples archivos en Drive usando la Edge Function manage-drive.
 * Pensado para operaciones batch como "Scores para Arcos".
 *
 * @param {object} supabase - Cliente Supabase
 * @param {Array<{ fileId: string, destinationFolderId: string, newName?: string }>} files
 * @param {number|string} giraId - ID de la gira (programa) para logging/tracking
 */
export const copyFilesBatchToDrive = async (supabase, { files, giraId }) => {
  const { data, error } = await supabase.functions.invoke("manage-drive", {
    body: {
      action: "COPY_FILES_BATCH",
      giraId,
      files,
    },
  });

  if (error) throw error;
  return data;
};

export const syncProgramRepertoire = async (supabase, programId) => {
  const runShortcutsSync = async () => {
    const { data, error } = await supabase.functions.invoke("manage-drive", {
      body: {
        action: "sync_repertoire_shortcuts",
        programId,
      },
    });
    return { data, error };
  };

  let { data, error } = await runShortcutsSync();
  if (!error) return data;

  // Fallback: si la carpeta raíz de Drive no existe todavía, la creamos/sincronizamos
  // y reintentamos la sincronización de accesos directos.
  const { error: metadataError } = await supabase.functions.invoke("manage-drive", {
    body: {
      action: "sync_program_metadata",
      programId,
    },
  });

  if (metadataError) {
    throw metadataError;
  }

  const retry = await runShortcutsSync();
  if (retry.error) throw retry.error;
  return retry.data;
};

/**
 * Actualiza la posición de una obra en el repertorio (bloque y orden).
 * @param {object} supabase - Cliente Supabase
 * @param {number} id_repertorio_obra - ID de repertorio_obras (id de la relación)
 * @param {number} nuevo_id_bloque - ID de programas_repertorios (id_repertorio)
 * @param {number} nuevo_orden - Nuevo valor de orden
 * @returns {Promise<void>}
 */
export const updateWorkPosition = async (
  supabase,
  id_repertorio_obra,
  nuevo_id_bloque,
  nuevo_orden,
) => {
  const { error } = await supabase
    .from("repertorio_obras")
    .update({
      id_repertorio: nuevo_id_bloque,
      orden: nuevo_orden,
    })
    .eq("id", id_repertorio_obra);

  if (error) throw error;
};

/**
 * Normaliza el campo orden de todas las obras en un bloque (1, 2, 3, ...).
 * @param {object} supabase - Cliente Supabase
 * @param {number} id_repertorio - ID de programas_repertorios
 * @returns {Promise<void>}
 */
export const normalizeRepertorioBlockOrden = async (
  supabase,
  id_repertorio,
) => {
  const { data: rows, error: fetchError } = await supabase
    .from("repertorio_obras")
    .select("id, orden")
    .eq("id_repertorio", id_repertorio)
    .order("orden", { ascending: true })
    .order("id", { ascending: true });

  if (fetchError) throw fetchError;
  if (!rows?.length) return;

  for (let i = 0; i < rows.length; i++) {
    const { error: updateError } = await supabase
      .from("repertorio_obras")
      .update({ orden: i + 1 })
      .eq("id", rows[i].id);
    if (updateError) throw updateError;
  }
};
/**
 * Obtiene la información de habitación de un integrante específico para una gira.
 */
// src/services/giraService.js

// src/services/giraService.js

/**
 * Obtiene la información de habitación de un integrante específico para una gira.
 * Resuelve nombres de integrantes generales y filtra ausentes.
 */
/**
 * Obtiene la lista de transportes de una gira (giras_transportes) para selectores en formularios.
 * id_gira referencia programas(id). La tabla tiene id_transporte -> transportes(id).
 * @param {object} supabase - Cliente Supabase
 * @param {number|string} giraId - ID de la gira (programa)
 * @returns {Promise<Array>} Lista de { id, detalle, transportes?: { nombre, patente } }
 */
export const getTransportesByGira = async (supabase, giraId) => {
  if (!supabase) return [];
  const idGira = giraId != null && giraId !== "" ? Number(giraId) : NaN;
  if (Number.isNaN(idGira)) return [];

  try {
    // Intentar con join a transportes (nombre viene de la tabla maestra transportes)
    const { data, error } = await supabase
      .from("giras_transportes")
      .select(
        "id, detalle, id_transporte, categoria_logistica, transportes(nombre, patente)",
      )
      .eq("id_gira", idGira)
      .order("id");

    if (error) throw error;
    if (data && data.length > 0) return data;

    // Si no hay filas, devolver [] (gira sin transportes asignados)
    return [];
  } catch (err) {
    console.error("[GiraService] getTransportesByGira:", err);
    // Fallback sin join: solo columnas de giras_transportes (detalle suele tener el nombre)
    try {
      const { data: fallback, error: err2 } = await supabase
        .from("giras_transportes")
        .select("id, detalle")
        .eq("id_gira", idGira)
        .order("id");
      if (err2) return [];
      return fallback || [];
    } catch {
      return [];
    }
  }
};

export const getMyRoomingStatus = async (supabase, giraId, userId) => {
  try {
    const numericUserId = parseInt(userId);

    // 1. Obtener todos los alojamientos de la gira
    const { data: bookings, error } = await supabase
      .from('programas_hospedajes')
      .select(`
        id,
        hoteles (nombre),
        hospedaje_habitaciones (
          id,
          id_integrantes_asignados,
          tipo,
          es_matrimonial
        )
      `)
      .eq('id_programa', giraId);

    if (error) throw error;
    if (!bookings) return null;

    let myBooking = null;
    let myRoom = null;

    // 2. Encontrar la habitación del usuario
    for (const b of bookings) {
      const foundRoom = b.hospedaje_habitaciones?.find(r => 
        r.id_integrantes_asignados?.includes(numericUserId)
      );
      if (foundRoom) {
        myBooking = b;
        myRoom = foundRoom;
        break;
      }
    }

    if (!myRoom) return null;

    // 3. Obtener nombres de los compañeros y filtrar ausentes
    const mateIds = myRoom.id_integrantes_asignados.filter(id => id !== numericUserId);
    
    let mates = [];
    if (mateIds.length > 0) {
      // Traemos los nombres de la tabla maestra de integrantes
      const { data: matesData } = await supabase
        .from('integrantes')
        .select('id, nombre, apellido')
        .in('id', mateIds);

      // Consultamos quiénes están marcados como ausentes en esta gira puntual
      const { data: ausentes } = await supabase
        .from('giras_integrantes')
        .select('id_integrante')
        .eq('id_gira', giraId)
        .in('id_integrante', mateIds)
        .eq('estado', 'ausente');

      const ausentesSet = new Set(ausentes?.map(a => a.id_integrante) || []);
      
      // Filtramos la lista final
      mates = (matesData || []).filter(m => !ausentesSet.has(m.id));
    }

    return {
      hotel: myBooking.hoteles?.nombre || "Sin nombre asignado",
      room: myRoom,
      mates: mates
    };
  } catch (error) {
    console.error("[GiraService] Error en getMyRoomingStatus:", error);
    return null;
  }
};

/**
 * Obtiene el historial de cambios (logs) de un evento.
 * Solo se registran cambios en fecha, hora_inicio y hora_fin para eventos sensibles (Conciertos, Ensayos, Transporte).
 * @param {object} supabase - Cliente Supabase
 * @param {number|string} eventId - ID del evento
 * @returns {Promise<Array<{ id, id_evento, campo, valor_anterior, valor_nuevo, created_at }>>}
 */
export const getEventLogs = async (supabase, eventId) => {
  if (!supabase || eventId == null) return [];
  try {
    const { data, error } = await supabase
      .from("eventos_logs")
      .select("id, id_evento, campo, valor_anterior, valor_nuevo, created_at")
      .eq("id_evento", eventId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error("[GiraService] getEventLogs:", err);
    return [];
  }
};

/**
 * Cuenta eventos de agenda activos (no borrados lógicamente) vinculados a un
 * registro de `giras_transportes` vía `eventos.id_gira_transporte`.
 */
export const countEventosByGiraTransporte = async (supabase, giraTransporteId) => {
  if (!supabase || giraTransporteId == null) return 0;
  try {
    const { count, error } = await supabase
      .from("eventos")
      .select("id", { count: "exact", head: true })
      .eq("id_gira_transporte", giraTransporteId)
      .eq("is_deleted", false);
    if (error) throw error;
    return count ?? 0;
  } catch (err) {
    console.error("[GiraService] countEventosByGiraTransporte:", err);
    return 0;
  }
};

/**
 * Elimina un transporte de la planificación de la gira y todos los vínculos
 * coherentes: eventos de traslado, reglas de logística y filas auxiliares.
 * Orden respetando FKs (equivalente a una eliminación en cascada a nivel app).
 *
 * @returns {Promise<{ ok: true } | { ok: false, error: string }>}
 */
export const deleteGiraTransporteCascade = async (supabase, giraTransporteId) => {
  if (!supabase || giraTransporteId == null) {
    return { ok: false, error: "Cliente o transporte no válido" };
  }
  const tid = giraTransporteId;
  try {
    const { data: evRows, error: evFetchErr } = await supabase
      .from("eventos")
      .select("id")
      .eq("id_gira_transporte", tid);
    if (evFetchErr) throw evFetchErr;
    const eventIds = (evRows || []).map((r) => r.id).filter((id) => id != null);

    const { error: delReglasTransporteErr } = await supabase
      .from("giras_logistica_reglas_transportes")
      .delete()
      .eq("id_gira_transporte", tid);
    if (delReglasTransporteErr) throw delReglasTransporteErr;

    if (eventIds.length > 0) {
      const cleanup = await Promise.all([
        supabase
          .from("giras_logistica_rutas")
          .update({ id_evento_subida: null })
          .in("id_evento_subida", eventIds),
        supabase
          .from("giras_logistica_rutas")
          .update({ id_evento_bajada: null })
          .in("id_evento_bajada", eventIds),
        supabase
          .from("giras_logistica_reglas_transportes")
          .update({ id_evento_subida: null })
          .in("id_evento_subida", eventIds),
        supabase
          .from("giras_logistica_reglas_transportes")
          .update({ id_evento_bajada: null })
          .in("id_evento_bajada", eventIds),
        supabase
          .from("giras_logistica_reglas")
          .update({ id_evento_checkin: null })
          .in("id_evento_checkin", eventIds),
        supabase
          .from("giras_logistica_reglas")
          .update({ id_evento_checkout: null })
          .in("id_evento_checkout", eventIds),
        supabase
          .from("giras_logistica_reglas")
          .update({ id_evento_comida_inicio: null })
          .in("id_evento_comida_inicio", eventIds),
        supabase
          .from("giras_logistica_reglas")
          .update({ id_evento_comida_fin: null })
          .in("id_evento_comida_fin", eventIds),
      ]);
      for (const r of cleanup) {
        if (r.error) throw r.error;
      }
    }

    const { error: delEventosErr } = await supabase
      .from("eventos")
      .delete()
      .eq("id_gira_transporte", tid);
    if (delEventosErr) throw delEventosErr;

    const { error: delRutasErr } = await supabase
      .from("giras_logistica_rutas")
      .delete()
      .eq("id_transporte_fisico", tid);
    if (delRutasErr) throw delRutasErr;

    const { error: delAdmErr } = await supabase
      .from("giras_logistica_admision")
      .delete()
      .eq("id_transporte_fisico", tid);
    if (delAdmErr) throw delAdmErr;

    const { error: delTransportErr } = await supabase
      .from("giras_transportes")
      .delete()
      .eq("id", tid);
    if (delTransportErr) throw delTransportErr;

    return { ok: true };
  } catch (err) {
    console.error("[GiraService] deleteGiraTransporteCascade:", err);
    return {
      ok: false,
      error: err?.message || String(err),
    };
  }
};

/**
 * Obtiene todos los eventos de tipo Concierto (id_tipo_evento = 1)
 * junto con su programa asociado y el estado actual del venue.
 * Pensado para el módulo de Gestión de Venues.
 */
export const getAllConcertVenues = async (supabase) => {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from("eventos")
      .select(
        `
        id,
        fecha,
        hora_inicio,
        hora_fin,
        descripcion,
        id_estado_venue,
        id_tipo_evento,
        id_gira,
        id_locacion,
        locaciones ( id, nombre, direccion, localidades (localidad) ),
        programas ( id, nombre_gira, nomenclador, tipo ),
        venue_status_types ( id, nombre, color, slug ),
        eventos_venue_log ( nota, created_at )
      `,
      )
      .eq("id_tipo_evento", 1)
      .order("fecha", { ascending: true })
      .order("hora_inicio", { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error("[GiraService] getAllConcertVenues:", err);
    return [];
  }
};

/**
 * Obtiene la grilla completa de conciertos para el módulo de Gestión.
 * Incluye relaciones de programa, venue, ensambles, familias convocadas y repertorio.
 */
export const getConciertosFullData = async (
  supabase,
  { dateFrom = null, dateTo = null } = {},
) => {
  if (!supabase) return [];
  try {
    let query = supabase
      .from("eventos")
      .select(
        `
        id,
        fecha,
        hora_inicio,
        audiencia,
        convocados,
        id_tipo_evento,
        id_gira,
        id_locacion,
        id_estado_venue,
        programas (
          id,
          nombre_gira,
          nomenclador,
          mes_letra,
          tipo,
          giras_fuentes ( tipo, valor_id, valor_texto ),
          programas_repertorios (
            id,
            orden,
            repertorio_obras (
              id,
              orden,
              obras (
                id,
                titulo,
                obras_compositores (
                  rol,
                  compositores ( nombre, apellido )
                )
              )
            )
          )
        ),
        locaciones ( id, nombre, localidades ( localidad ) ),
        venue_status_types ( id, nombre, color, slug ),
        eventos_ensambles ( ensambles ( id, ensamble ) )
      `,
      )
      .eq("id_tipo_evento", 1)
      .eq("is_deleted", false)
      .order("fecha", { ascending: true })
      .order("hora_inicio", { ascending: true });

    if (dateFrom) query = query.gte("fecha", dateFrom);
    if (dateTo) query = query.lte("fecha", dateTo);

    const { data, error } = await query;
    if (error) throw error;
    const events = data || [];

    const ensambleIdsFromEvents = new Set();
    events.forEach((evt) => {
      (evt.eventos_ensambles || []).forEach((ee) => {
        const eid = Number(ee?.ensambles?.id);
        if (!Number.isNaN(eid) && eid > 0) ensambleIdsFromEvents.add(eid);
      });
      (evt.programas?.giras_fuentes || [])
        .filter((f) => f?.tipo === "ENSAMBLE")
        .forEach((f) => {
          const eid = Number(f?.valor_id);
          if (!Number.isNaN(eid) && eid > 0) ensambleIdsFromEvents.add(eid);
        });
    });

    const ensambleNameMap = new Map();
    if (ensambleIdsFromEvents.size > 0) {
      const { data: ensRows, error: ensErr } = await supabase
        .from("ensambles")
        .select("id, ensamble")
        .in("id", Array.from(ensambleIdsFromEvents));
      if (ensErr) throw ensErr;
      (ensRows || []).forEach((ens) => {
        ensambleNameMap.set(Number(ens.id), ens.ensamble || "");
      });
    }

    const decodeEntities = (input) =>
      String(input || "")
        .replace(/&nbsp;/gi, " ")
        .replace(/&amp;/gi, "&")
        .replace(/&quot;/gi, '"')
        .replace(/&#39;/gi, "'")
        .replace(/&lt;/gi, "<")
        .replace(/&gt;/gi, ">");

    const toFirstLine = (txt) => {
      if (!txt) return "";
      const withBreaks = String(txt)
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/(div|p|li|h[1-6])>/gi, "\n");
      const plain = withBreaks.replace(/<[^>]*>/g, " ");
      const decoded = decodeEntities(plain)
        .replace(/\r/g, "")
        .replace(/\u00a0/g, " ")
        .replace(/[ \t]+/g, " ")
        .replace(/\n{2,}/g, "\n")
        .trim();
      return decoded.split("\n")[0]?.trim() || "";
    };

    return events.map((evt) => {
      const ensamblesEvent = (evt.eventos_ensambles || [])
        .map((ee) => ee?.ensambles)
        .filter(Boolean)
        .map((ens) => ({
          id: Number(ens.id),
          nombre: ens.ensamble || "",
        }))
        .filter((ens) => ens.id > 0);

      const ensamblesFromSources = (evt.programas?.giras_fuentes || [])
        .filter((f) => f?.tipo === "ENSAMBLE")
        .map((f) => Number(f?.valor_id))
        .filter((id) => !Number.isNaN(id) && id > 0)
        .map((id) => ({
          id,
          nombre: ensambleNameMap.get(id) || `Ensamble ${id}`,
        }));

      const ensambleMap = new Map();
      [...ensamblesFromSources, ...ensamblesEvent].forEach((ens) => {
        if (!ens || !ens.id) return;
        if (!ensambleMap.has(ens.id)) ensambleMap.set(ens.id, ens.nombre || "");
      });
      const ensambles = Array.from(ensambleMap.entries())
        .map(([id, nombre]) => ({ id, nombre }))
        .sort((a, b) => a.nombre.localeCompare(b.nombre));

      const familiasFromConvocados = (evt.convocados || [])
        .filter((tag) => String(tag).startsWith("FAM:"))
        .map((tag) => String(tag).slice(4).trim())
        .filter(Boolean);
      const familiasFromProgram = (evt.programas?.giras_fuentes || [])
        .filter((f) => f?.tipo === "FAMILIA" && f?.valor_texto)
        .map((f) => String(f.valor_texto).trim())
        .filter(Boolean);
      const familiasBase =
        familiasFromConvocados.length > 0
          ? familiasFromConvocados
          : familiasFromProgram;
      const familias = Array.from(new Set(familiasBase)).sort((a, b) =>
        a.localeCompare(b),
      );

      const repertorio = (evt.programas?.programas_repertorios || [])
        .sort((a, b) => {
          const ao = Number(a?.orden ?? 999999);
          const bo = Number(b?.orden ?? 999999);
          return ao - bo;
        })
        .flatMap((bloque) =>
          (bloque?.repertorio_obras || [])
            .sort((a, b) => {
              const ao = Number(a?.orden ?? 999999);
              const bo = Number(b?.orden ?? 999999);
              return ao - bo;
            })
            .map((row) => {
              const obra = row?.obras || {};
              const comps = (obra?.obras_compositores || [])
                .filter((oc) => !oc?.rol || oc.rol === "compositor")
                .map((oc) => oc?.compositores)
                .filter(Boolean);
              const composerNames = comps
                .map((c) => [c?.apellido, c?.nombre].filter(Boolean).join(", ").trim())
                .filter(Boolean);
              return {
                compositor: composerNames.join(" / "),
                titulo: toFirstLine(obra?.titulo),
              };
            }),
        );

      return {
        id: evt.id,
        fecha: evt.fecha,
        hora_inicio: evt.hora_inicio,
        audiencia: evt.audiencia,
        tipo_programa: evt.programas?.tipo || "",
        nombre_gira: evt.programas?.nombre_gira || "",
        nomenclador: evt.programas?.nomenclador || "",
        mes_letra: evt.programas?.mes_letra || "",
        locacion: evt.locaciones?.nombre || "",
        localidad: evt.locaciones?.localidades?.localidad || "",
        venue_estado: evt.venue_status_types?.nombre || "",
        venue_estado_color: evt.venue_status_types?.color || "",
        ensambles,
        familias,
        repertorio,
      };
    });
  } catch (err) {
    console.error("[GiraService] getConciertosFullData:", err);
    return [];
  }
};

/**
 * Helpers para conversión entre índice lineal `orden` y matriz (atril_num, lado).
 *
 * **Convención almacenada (1-based, para legados / exportaciones):**
 *   `orden = 2 * (fila - 1) + lado_mano`
 * con `lado_mano` 1 = izquierdo, 2 = derecho (columna física).
 * En DB seguimos guardando `lado` como 0 = izq, 1 = der, por lo que:
 *   `orden = (atril_num - 1) * 2 + lado_db + 1`  → valores 1, 2, 3, 4, …
 *
 * **Legado (solo `orden` sin matriz):** índice 0-based
 *   `orden = (atril_num - 1) * 2 + lado_db`  → 0, 1, 2, 3, …
 */

/** Inverso de `seatingMatrixToOrder` (convención 1-based, orden ≥ 1). */
export const seatingOrderToMatrix = (orden) => {
  if (orden == null || Number.isNaN(Number(orden))) {
    return { atril_num: null, lado: null };
  }
  const o = Math.trunc(Number(orden));
  if (o < 1) return { atril_num: null, lado: null };
  return {
    atril_num: Math.floor((o - 1) / 2) + 1,
    lado: (o - 1) % 2,
  };
};

/** Legado: `orden` 0-based (primera silla izquierda = 0). */
export const seatingOrderToMatrixLegacyZeroBased = (orden) => {
  if (orden == null || Number.isNaN(Number(orden))) {
    return { atril_num: null, lado: null };
  }
  const o = Math.trunc(Number(orden));
  if (o < 0) return { atril_num: null, lado: null };
  return {
    atril_num: Math.floor(o / 2) + 1,
    lado: o % 2,
  };
};

/**
 * Resuelve (atril_num, lado DB 0/1) desde un ítem de `seating_contenedores_items`.
 * Prioriza coordenadas matriciales; si faltan, infiere desde `orden` (legado 0-based).
 */
export const seatingItemMatrixPosition = (item, fallbackIndex = 0) => {
  const fb = Number(fallbackIndex) || 0;

  const hasAtril =
    item?.atril_num != null && !Number.isNaN(Number(item.atril_num));
  const hasLado =
    item?.lado != null && !Number.isNaN(Number(item.lado));

  if (hasAtril) {
    const atril_num = Number(item.atril_num);
    if (hasLado) return { atril_num, lado: Number(item.lado) };
    if (item?.orden != null && !Number.isNaN(Number(item.orden))) {
      const o = Math.trunc(Number(item.orden));
      const fromOne = seatingOrderToMatrix(o);
      if (fromOne.atril_num === atril_num) return { atril_num, lado: fromOne.lado };
      const fromZero = seatingOrderToMatrixLegacyZeroBased(o);
      if (fromZero.atril_num === atril_num) return { atril_num, lado: fromZero.lado };
    }
    return { atril_num, lado: fb % 2 };
  }

  if (item?.orden != null && !Number.isNaN(Number(item.orden))) {
    return seatingOrderToMatrixLegacyZeroBased(Math.trunc(Number(item.orden)));
  }

  return {
    atril_num: Math.floor(fb / 2) + 1,
    lado: fb % 2,
  };
};

export const seatingMatrixToOrder = (atril_num, lado) => {
  if (
    atril_num == null ||
    lado == null ||
    Number.isNaN(Number(atril_num)) ||
    Number.isNaN(Number(lado))
  ) {
    return null;
  }
  const a = Number(atril_num);
  const l = Number(lado);
  return (a - 1) * 2 + l + 1;
};

/**
 * Orden estable para listas de `seating_contenedores_items`: primero por fila (atril_num),
 * luego lado (0 izq, 1 der), luego id. Usa la misma lógica que `seatingItemMatrixPosition`
 * respetando el índice original solo como fallback para datos sin matriz.
 */
export const compareSeatingItems = (a, b, indexA = 0, indexB = 0) => {
  const pa = seatingItemMatrixPosition(a, indexA);
  const pb = seatingItemMatrixPosition(b, indexB);
  const da = (pa.atril_num ?? 0) - (pb.atril_num ?? 0);
  if (da !== 0) return da;
  const dl = (pa.lado ?? 0) - (pb.lado ?? 0);
  if (dl !== 0) return dl;
  return Number(a?.id ?? 0) - Number(b?.id ?? 0);
};

export const sortSeatingItems = (items = []) => {
  const list = [...items];
  const indexById = new Map();
  list.forEach((item, idx) => {
    if (item?.id != null) indexById.set(item.id, idx);
  });
  return list.sort((a, b) => {
    const ia = indexById.has(a?.id) ? indexById.get(a.id) : 0;
    const ib = indexById.has(b?.id) ? indexById.get(b.id) : 0;
    return compareSeatingItems(a, b, ia, ib);
  });
};

/**
 * Wrapper de conveniencia para el RPC shift_seating_line en Supabase.
 * Permite desplazar únicamente una línea (lado) de un contenedor de cuerdas.
 */
export const shiftSeatingLine = async (
  supabase,
  { containerId, startAtril, lado, direction },
) => {
  if (!supabase) return { error: "Supabase client is required" };
  const payload = {
    target_cont_id: containerId,
    start_atril: startAtril,
    target_lado: lado,
    direction,
  };
  const { data, error } = await supabase.rpc("shift_seating_line", payload);
  return { data, error };
};