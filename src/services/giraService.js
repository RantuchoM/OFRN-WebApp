/**
 * src/services/giraService.js
 * Servicio autónomo para cálculos On-Demand en el Dashboard
 */

/**
 * 1. FUNCIÓN INTERNA (NO EXPORTADA)
 * Resuelve los IDs de los integrantes de una gira:
 * (Miembros de Ensambles Convocados + Familias Convocadas + Overrides) MINUS (Miembros de Ensambles Excluidos) MINUS (Ausentes).
 * La exclusión de ensamble manda: si un ensamble está en EXCL_ENSAMBLE, sus miembros no entran aunque su familia esté convocada.
 */
const resolveGiraRosterIds = async (supabase, giraId) => {
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
      .select("id, detalle, id_transporte, transportes(nombre, patente)")
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