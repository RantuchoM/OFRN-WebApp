/**
 * src/services/giraService.js
 * Servicio autónomo para cálculos On-Demand en el Dashboard
 */

import {
  filterMembershipRowsForProgramDate,
  integranteActiveOnProgramRange,
  membershipActiveOnProgramDate,
} from "../utils/ensembleMembership";
import { getTodayDateStringLocal } from "../utils/dates";
import {
  integranteIdForDb,
  integranteKey,
} from "../utils/integranteIds";
import {
  sortEnsamblesParticipantes,
  sortFamiliasParticipantes,
} from "../utils/participantesSort";
import { formatTramoTitle } from "../utils/giraTramos";
import { buildGiraInstrumentOverrideMap } from "../utils/giraUtils";
import { isRepertorioPlaceholder } from "../utils/repertorioRowDisplay";

/**
 * Resuelve los IDs de los integrantes de una gira:
 * (Miembros de Ensambles Convocados + Familias Convocadas + Overrides) MINUS (Miembros de Ensambles Excluidos) MINUS (Ausentes).
 * La exclusión de ensamble manda: si un ensamble está en EXCL_ENSAMBLE, sus miembros no entran aunque su familia esté convocada.
 * Vigencia de orquesta (fecha_alta/fecha_baja) y de ensamble (fecha_desde/fecha_hasta en integrantes_ensambles) aplican a convocatoria base;
 * overrides manuales en giras_integrantes (estado !== ausente) ignoran esas vigencias.
 * @see docs/roster-spec.md
 */
async function resolveGiraRosterDetail(supabase, giraId) {
  try {
    const { data: progRow } = await supabase
      .from("programas")
      .select("fecha_desde, fecha_hasta")
      .eq("id", giraId)
      .maybeSingle();
    const programRefDesde =
      progRow?.fecha_desde ?? new Date().toISOString().slice(0, 10);
    const programRefHasta = progRow?.fecha_hasta ?? null;

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

    const rawBaseIds = new Set();
    const manualIds = new Set();

    // B. Ensambles convocados (fuentes activas; vigencia del tramo en integrantes_ensambles)
    const ensambleIds = fuentes
      .filter((f) => f.tipo === "ENSAMBLE")
      .map((f) => Number(f.valor_id));

    if (ensambleIds.length > 0) {
      const ensambleIdSet = new Set(ensambleIds);
      const { data: ensambleRows } = await supabase
        .from("integrantes_ensambles")
        .select("id_integrante, id_ensamble, fecha_desde, fecha_hasta")
        .in("id_ensamble", ensambleIds);

      ensambleRows?.forEach((row) => {
        if (
          ensambleIdSet.has(Number(row.id_ensamble)) &&
          membershipActiveOnProgramDate(row, programRefDesde)
        ) {
          rawBaseIds.add(integranteKey(row.id_integrante));
        }
      });
    }

    // C. Familias convocadas (vigencia de orquesta se valida en el paso D)
    const familias = fuentes
      .filter((f) => f.tipo === "FAMILIA")
      .map((f) => f.valor_texto);

    if (familias.length > 0) {
      const { data: familiaMembers } = await supabase
        .from("integrantes")
        .select("id, instrumentos!inner(familia)")
        .eq("condicion", "Estable")
        .in("instrumentos.familia", familias);

      familiaMembers?.forEach((i) => rawBaseIds.add(integranteKey(i.id)));
    }

    // D. Vigencia de orquesta (fecha_alta / fecha_baja) para convocatoria base
    const baseIds = new Set();
    if (rawBaseIds.size > 0) {
      const idList = Array.from(rawBaseIds)
        .map(integranteIdForDb)
        .filter(Boolean);
      const { data: vigenciaRows } = await supabase
        .from("integrantes")
        .select("id, fecha_alta, fecha_baja")
        .in("id", idList);

      vigenciaRows?.forEach((row) => {
        if (
          integranteActiveOnProgramRange(
            row,
            programRefDesde,
            programRefHasta,
          )
        ) {
          baseIds.add(integranteKey(row.id));
        }
      });
    }

    // E. Overrides manuales: siempre incluidos (estado !== ausente)
    overrides.forEach((o) => {
      if (o.estado !== "ausente") {
        manualIds.add(integranteKey(o.id_integrante));
      }
    });

    const integrantesIds = new Set([...baseIds, ...manualIds]);

    // F. Excluidos por ensamble: sus miembros se sacan siempre (la exclusión manda)
    const exclEnsambleIds = fuentes
      .filter((f) => f.tipo === "EXCL_ENSAMBLE")
      .map((f) => Number(f.valor_id));

    const excludedByEnsamble = new Set();
    if (exclEnsambleIds.length > 0) {
      const exclSet = new Set(exclEnsambleIds);
      const { data: exclRows } = await supabase
        .from("integrantes_ensambles")
        .select("id_integrante, id_ensamble, fecha_desde, fecha_hasta")
        .in("id_ensamble", exclEnsambleIds);

      exclRows?.forEach((row) => {
        if (
          exclSet.has(Number(row.id_ensamble)) &&
          membershipActiveOnProgramDate(row, programRefDesde)
        ) {
          excludedByEnsamble.add(integranteKey(row.id_integrante));
        }
      });
    }

    // G. Ausentes (giras_integrantes.estado === 'ausente')
    const ausentesIds = new Set(
      overrides
        .filter((o) => o.estado === "ausente")
        .map((o) => integranteKey(o.id_integrante)),
    );

    // Resultado: convocados MINUS excluidos por ensamble MINUS ausentes
    const allIds = Array.from(integrantesIds).filter(
      (id) =>
        !excludedByEnsamble.has(id) && !ausentesIds.has(id),
    );

    const countedIds = new Set();
    const preAltaIds = new Set();
    if (allIds.length > 0) {
      const idList = allIds.map(integranteIdForDb).filter(Boolean);
      const { data: vigenciaFinal } = await supabase
        .from("integrantes")
        .select("id, fecha_alta, fecha_baja")
        .in("id", idList);

      vigenciaFinal?.forEach((row) => {
        const key = integranteKey(row.id);
        if (
          integranteActiveOnProgramRange(
            row,
            programRefDesde,
            programRefHasta,
          )
        ) {
          countedIds.add(key);
        } else {
          preAltaIds.add(key);
        }
      });
    }

    return { allIds, countedIds, preAltaIds };
  } catch (error) {
    console.error("[GiraService] Error resolviendo roster IDs:", error);
    return { allIds: [], countedIds: new Set(), preAltaIds: new Set() };
  }
}

/** IDs en nómina (incluye pre-alta y convocatoria contabilizada). */
export const resolveGiraRosterIds = async (supabase, giraId) => {
  const { allIds } = await resolveGiraRosterDetail(supabase, giraId);
  return allIds;
};

/**
 * Nómina para matriz de convocatorias: separa convocatoria contabilizada vs. pre-alta.
 * @returns {{ allIds: string[], countedIds: Set<string>, preAltaIds: Set<string> }}
 */
export const resolveGiraRosterForMatrix = resolveGiraRosterDetail;

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
 * Las membresías a ensamble solo incluyen tramos activos a la fecha de hoy (hora local): si `fecha_hasta`
 * es anterior a hoy, esa relación no entra en el informe.
 */
export const fetchAsistenciaMatrixBaseData = async (supabase) => {
  if (!supabase) {
    return {
      programas: [],
      integrantes: [],
      ensambles: [],
      memberships: [],
      instrumentCatalog: [],
      giraInstrumentOverrideMap: new Map(),
      error: null,
    };
  }
  const y = new Date().getFullYear();
  const minFechaDesde = `${y - 1}-01-01`;
  try {
    const programasRes = await supabase
      .from("programas")
      .select(
        "id, nomenclador, mes_letra, nombre_gira, subtitulo, tipo, fecha_desde, fecha_hasta",
      )
      .gte("fecha_desde", minFechaDesde)
      .order("fecha_desde", { ascending: true });

    if (programasRes.error) throw programasRes.error;

    const programas = programasRes.data || [];
    const programaIds = programas.map((p) => p.id).filter((id) => id != null);

    const [
      integrantesRes,
      ensRes,
      ieRes,
      catalogRes,
      giInstrRes,
    ] = await Promise.all([
      supabase
        .from("integrantes")
        .select(
          "id, nombre, apellido, id_instr, instrumentos ( id, instrumento, familia, abreviatura )",
        )
        .order("id_instr", { ascending: true }),
      supabase.from("ensambles").select("id, ensamble").order("ensamble"),
      supabase
        .from("integrantes_ensambles")
        .select("id_ensamble, id_integrante, fecha_desde, fecha_hasta"),
      supabase
        .from("instrumentos")
        .select("id, instrumento, familia, abreviatura, plaza_extra, rol_gira_default"),
      programaIds.length > 0
        ? supabase
            .from("giras_integrantes")
            .select("id_gira, id_integrante, id_instr")
            .in("id_gira", programaIds)
            .not("id_instr", "is", null)
        : Promise.resolve({ data: [], error: null }),
    ]);

    const err =
      integrantesRes.error ||
      ensRes.error ||
      ieRes.error ||
      catalogRes.error ||
      giInstrRes.error;
    if (err) {
      console.error("[GiraService] fetchAsistenciaMatrixBaseData:", err);
      return {
        programas: [],
        integrantes: [],
        ensambles: [],
        memberships: [],
        instrumentCatalog: [],
        giraInstrumentOverrideMap: new Map(),
        error: err,
      };
    }

    const hoy = getTodayDateStringLocal();
    const membershipsRaw = ieRes.data || [];

    return {
      programas,
      integrantes: integrantesRes.data || [],
      ensambles: ensRes.data || [],
      memberships: filterMembershipRowsForProgramDate(membershipsRaw, hoy),
      instrumentCatalog: catalogRes.data || [],
      giraInstrumentOverrideMap: buildGiraInstrumentOverrideMap(
        giInstrRes.data || [],
      ),
      error: null,
    };
  } catch (e) {
    console.error("[GiraService] fetchAsistenciaMatrixBaseData:", e);
    return {
      programas: [],
      integrantes: [],
      ensambles: [],
      memberships: [],
      instrumentCatalog: [],
      giraInstrumentOverrideMap: new Map(),
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

    const rosterIdList = finalRosterIds
      .map(integranteIdForDb)
      .filter(Boolean);

    // 2. Traer datos en paralelo:
    //    - Detalles de las personas
    //    - Habitaciones asignadas en esta gira
    //    - Transportes asignados en esta gira
    const [paxRes, hospedajesRes, transportesRes] = await Promise.all([
      supabase
        .from("integrantes")
        .select("*, localidades(localidad)")
        .in("id", rosterIdList),

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

export const deleteRepertoireBlockWithDrive = async (supabase, repertoireBlockId) => {
  const { data, error } = await supabase.functions.invoke("manage-drive", {
    body: {
      action: "delete_repertoire_block",
      repertoireBlockId,
    },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  if (!data?.success) {
    throw new Error(data?.message || "No se pudo eliminar el bloque.");
  }
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

    const [bookingsRes, segmentsRes] = await Promise.all([
      supabase
        .from("programas_hospedajes")
        .select(`
          id,
          fecha_checkin,
          fecha_checkout,
          hora_checkin,
          hora_checkout,
          id_segmento,
          hoteles (nombre),
          hospedaje_habitaciones (
            id,
            id_integrantes_asignados,
            tipo,
            es_matrimonial
          )
        `)
        .eq("id_programa", giraId)
        .order("fecha_checkin"),
      supabase
        .from("giras_tramo_segmentos")
        .select("id, indice, fecha_desde, fecha_hasta")
        .eq("id_gira", giraId)
        .order("indice"),
    ]);

    const { data: bookings, error } = bookingsRes;
    if (error) throw error;
    if (!bookings?.length) return { assignments: [] };

    const segmentById = new Map(
      (segmentsRes.data || []).map((s) => [Number(s.id), s]),
    );

    const assignments = [];
    const allMateIds = new Set();

    for (const booking of bookings) {
      const foundRoom = booking.hospedaje_habitaciones?.find((room) =>
        room.id_integrantes_asignados?.includes(numericUserId),
      );
      if (!foundRoom) continue;

      const mateIds = (foundRoom.id_integrantes_asignados || []).filter(
        (id) => id !== numericUserId,
      );
      mateIds.forEach((id) => allMateIds.add(id));

      const segment =
        booking.id_segmento != null
          ? segmentById.get(Number(booking.id_segmento))
          : null;

      assignments.push({
        hotel: booking.hoteles?.nombre || "Sin nombre asignado",
        fecha_checkin: booking.fecha_checkin,
        fecha_checkout: booking.fecha_checkout,
        hora_checkin: booking.hora_checkin,
        hora_checkout: booking.hora_checkout,
        segmentIndex: segment?.indice ?? null,
        segmentLabel: segment
          ? formatTramoTitle(
              segment.indice,
              segment.fecha_desde,
              segment.fecha_hasta,
            )
          : null,
        segmentFechaDesde: segment?.fecha_desde ?? null,
        segmentFechaHasta: segment?.fecha_hasta ?? null,
        mateIds,
        room: foundRoom,
      });
    }

    if (assignments.length === 0) return { assignments: [] };

    let matesById = new Map();
    if (allMateIds.size > 0) {
      const mateIdsArr = [...allMateIds];
      const [matesRes, ausentesRes] = await Promise.all([
        supabase
          .from("integrantes")
          .select("id, nombre, apellido")
          .in("id", mateIdsArr),
        supabase
          .from("giras_integrantes")
          .select("id_integrante")
          .eq("id_gira", giraId)
          .in("id_integrante", mateIdsArr)
          .eq("estado", "ausente"),
      ]);

      const ausentesSet = new Set(
        ausentesRes.data?.map((a) => a.id_integrante) || [],
      );
      (matesRes.data || [])
        .filter((m) => !ausentesSet.has(m.id))
        .forEach((m) => matesById.set(m.id, m));
    }

    return {
      assignments: assignments.map(({ mateIds, ...rest }) => ({
        ...rest,
        mates: mateIds.map((id) => matesById.get(id)).filter(Boolean),
      })),
    };
  } catch (error) {
    console.error("[GiraService] Error en getMyRoomingStatus:", error);
    return { assignments: [] };
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
 * Elimina una vacante (integrante simulado) de una gira y limpia sus vínculos logísticos.
 * @returns {Promise<{ ok: true } | { ok: false, error: string }>}
 */
export const deleteVacancyFromGira = async (supabase, giraId, vacancyId) => {
  if (!supabase || giraId == null || vacancyId == null) {
    return { ok: false, error: "Parámetros inválidos" };
  }
  const gid = Number(giraId);
  const vid = Number(vacancyId);
  if (!Number.isFinite(gid) || !Number.isFinite(vid)) {
    return { ok: false, error: "ID de gira o vacante inválido" };
  }

  try {
    const { data: integrante, error: fetchErr } = await supabase
      .from("integrantes")
      .select("id, es_simulacion")
      .eq("id", vid)
      .maybeSingle();
    if (fetchErr) throw fetchErr;
    if (!integrante?.es_simulacion) {
      return {
        ok: false,
        error: "Solo se pueden eliminar vacantes (integrantes simulados).",
      };
    }

    const [hospedajesRes, transportesRes] = await Promise.all([
      supabase
        .from("programas_hospedajes")
        .select("id, hospedaje_habitaciones(id, id_integrantes_asignados)")
        .eq("id_programa", gid),
      supabase
        .from("giras_transportes")
        .select("id, pasajeros_ids")
        .eq("id_gira", gid),
    ]);
    if (hospedajesRes.error) throw hospedajesRes.error;
    if (transportesRes.error) throw transportesRes.error;

    const roomUpdates = [];
    for (const hospedaje of hospedajesRes.data || []) {
      for (const room of hospedaje.hospedaje_habitaciones || []) {
        const ids = room.id_integrantes_asignados || [];
        if (!ids.some((id) => Number(id) === vid)) continue;
        roomUpdates.push(
          supabase
            .from("hospedaje_habitaciones")
            .update({
              id_integrantes_asignados: ids.filter(
                (id) => Number(id) !== vid,
              ),
            })
            .eq("id", room.id),
        );
      }
    }

    const transportes = transportesRes.data || [];
    const transportUpdates = [];
    for (const transporte of transportes) {
      const pax = transporte.pasajeros_ids || [];
      if (!pax.some((id) => Number(id) === vid)) continue;
      transportUpdates.push(
        supabase
          .from("giras_transportes")
          .update({
            pasajeros_ids: pax.filter((id) => Number(id) !== vid),
          })
          .eq("id", transporte.id),
      );
    }

    const transportIds = transportes.map((t) => t.id).filter(Boolean);
    const logisticsDeletes = [
      supabase
        .from("giras_viaticos")
        .delete()
        .eq("id_gira", gid)
        .eq("id_integrante", vid),
      supabase
        .from("giras_viaticos_detalle")
        .delete()
        .eq("id_gira", gid)
        .eq("id_integrante", vid),
      supabase
        .from("giras_logistica_admision")
        .delete()
        .eq("id_gira", gid)
        .eq("id_integrante", vid),
      supabase
        .from("giras_logistica_rutas")
        .delete()
        .eq("id_gira", gid)
        .eq("id_integrante", vid),
      supabase
        .from("giras_hospedajes_excluidos")
        .delete()
        .eq("id_programa", gid)
        .eq("id_integrante", vid),
      supabase
        .from("giras_accesos")
        .delete()
        .eq("id_gira", gid)
        .eq("id_integrante", vid),
      supabase.from("giras_comidas_rsvp").delete().eq("id_integrante", vid),
    ];

    if (transportIds.length > 0) {
      logisticsDeletes.push(
        supabase
          .from("giras_logistica_reglas_transportes")
          .delete()
          .in("id_gira_transporte", transportIds)
          .eq("id_integrante", vid),
      );
    }

    const cleanupResults = await Promise.all([
      ...roomUpdates,
      ...transportUpdates,
      ...logisticsDeletes,
    ]);
    const cleanupError = cleanupResults.find((r) => r.error)?.error;
    if (cleanupError) throw cleanupError;

    const { error: linkError } = await supabase
      .from("giras_integrantes")
      .delete()
      .eq("id_gira", gid)
      .eq("id_integrante", vid);
    if (linkError) throw linkError;

    const { error: userError } = await supabase
      .from("integrantes")
      .delete()
      .eq("id", vid);
    if (userError) throw userError;

    return { ok: true };
  } catch (err) {
    console.error("[GiraService] deleteVacancyFromGira:", err);
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

function decodeConciertoHtmlEntities(input) {
  return String(input || "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function toConciertoObraFirstLine(txt) {
  if (!txt) return "";
  const withBreaks = String(txt)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(div|p|li|h[1-6])>/gi, "\n");
  const plain = withBreaks.replace(/<[^>]*>/g, " ");
  const decoded = decodeConciertoHtmlEntities(plain)
    .replace(/\r/g, "")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{2,}/g, "\n")
    .trim();
  return decoded.split("\n")[0]?.trim() || "";
}

function buildRepertorioFromProgramasRepertorios(programasRepertorios = []) {
  return (programasRepertorios || [])
    .sort((a, b) => {
      const ao = Number(a?.orden ?? 999999);
      const bo = Number(b?.orden ?? 999999);
      return ao - bo;
    })
    .flatMap((bloque) =>
      (bloque?.repertorio_obras || [])
        .filter((row) => !row?.excluir && !isRepertorioPlaceholder(row))
        .sort((a, b) => {
          const ao = Number(a?.orden ?? 999999);
          const bo = Number(b?.orden ?? 999999);
          return ao - bo;
        })
        .map((row) => {
          const obra = row?.obras || {};
          const comps = (obra?.obras_compositores || [])
            .filter((oc) => oc?.rol === "compositor" && oc?.compositores)
            .map((oc) => oc?.compositores)
            .filter(Boolean);
          const composerNames = comps
            .map((c) => [c?.nombre, c?.apellido].filter(Boolean).join(" ").trim())
            .filter(Boolean);
          return {
            compositor: composerNames.length
              ? composerNames.join("\n")
              : "Autor Desconocido",
            titulo: toConciertoObraFirstLine(
              String(obra?.titulo || "").replace(/\[.*?\]/g, "").trim(),
            ),
          };
        }),
    );
}

function getDifusionObservacionesFromProgram(giraDifusion) {
  const difusionData = Array.isArray(giraDifusion)
    ? giraDifusion[0] || null
    : giraDifusion || null;
  return String(difusionData?.otros_comentarios || "").trim();
}

function buildFamiliasFromGirasFuentes(girasFuentes = []) {
  const familias = Array.from(
    new Set(
      (girasFuentes || [])
        .filter((f) => f?.tipo === "FAMILIA" && f?.valor_texto)
        .map((f) => String(f.valor_texto).trim())
        .filter(Boolean),
    ),
  );
  return sortFamiliasParticipantes(familias);
}

function getExclEnsambleIdsFromGirasFuentes(girasFuentes = []) {
  return new Set(
    (girasFuentes || [])
      .filter((f) => f?.tipo === "EXCL_ENSAMBLE")
      .map((f) => Number(f?.valor_id))
      .filter((id) => !Number.isNaN(id) && id > 0),
  );
}

/**
 * Ensambles para Gestión → Conciertos: incluye los de evento/programa
 * y los marcados explícitamente como EXCL_ENSAMBLE en giras_fuentes.
 */
function buildEnsamblesForConciertoGestion(
  girasFuentes = [],
  eventosEnsambles = [],
  ensambleNameMap = new Map(),
) {
  const exclIds = getExclEnsambleIdsFromGirasFuentes(girasFuentes);
  const map = new Map();

  const upsert = (id, nombre, excluido) => {
    if (!id || id <= 0) return;
    const label = nombre || ensambleNameMap.get(id) || `Ensamble ${id}`;
    const prev = map.get(id);
    if (!prev) {
      map.set(id, { id, nombre: label, excluido: Boolean(excluido) });
      return;
    }
    if (excluido) prev.excluido = true;
    if (label && !prev.nombre) prev.nombre = label;
  };

  (girasFuentes || [])
    .filter((f) => f?.tipo === "ENSAMBLE")
    .forEach((f) => {
      const id = Number(f?.valor_id);
      upsert(id, ensambleNameMap.get(id), exclIds.has(id));
    });

  (eventosEnsambles || []).forEach((ee) => {
    const ens = ee?.ensambles;
    if (!ens?.id) return;
    const id = Number(ens.id);
    upsert(id, ens.ensamble, exclIds.has(id));
  });

  (girasFuentes || [])
    .filter((f) => f?.tipo === "EXCL_ENSAMBLE")
    .forEach((f) => {
      const id = Number(f?.valor_id);
      upsert(id, ensambleNameMap.get(id), true);
    });

  return sortEnsamblesParticipantes(Array.from(map.values()));
}

function buildEnsamblesFromGirasFuentes(girasFuentes = [], ensambleNameMap = new Map()) {
  return buildEnsamblesForConciertoGestion(girasFuentes, [], ensambleNameMap);
}

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
          estado,
          gira_difusion (
            otros_comentarios,
            timestamp_otros_comentarios
          ),
          giras_fuentes ( tipo, valor_id, valor_texto ),
          programas_repertorios (
            id,
            orden,
            repertorio_obras (
              id,
              orden,
              excluir,
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
        .filter((f) => f?.tipo === "ENSAMBLE" || f?.tipo === "EXCL_ENSAMBLE")
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

    return events.map((evt) => {
      const ensambles = buildEnsamblesForConciertoGestion(
        evt.programas?.giras_fuentes,
        evt.eventos_ensambles,
        ensambleNameMap,
      );

      const familiasFromConvocados = (evt.convocados || [])
        .filter((tag) => String(tag).startsWith("FAM:"))
        .map((tag) => String(tag).slice(4).trim())
        .filter(Boolean);
      const familiasFromProgram = buildFamiliasFromGirasFuentes(
        evt.programas?.giras_fuentes,
      );
      const familiasBase =
        familiasFromConvocados.length > 0
          ? familiasFromConvocados
          : familiasFromProgram;
      const familias = sortFamiliasParticipantes(
        Array.from(new Set(familiasBase)),
      );

      const repertorio = buildRepertorioFromProgramasRepertorios(
        evt.programas?.programas_repertorios,
      );

      return {
        id: evt.id,
        id_gira: evt.id_gira,
        id_locacion: evt.id_locacion ?? null,
        id_estado_venue: evt.id_estado_venue ?? null,
        fecha: evt.fecha,
        hora_inicio: evt.hora_inicio,
        audiencia: evt.audiencia,
        tipo_programa: evt.programas?.tipo || "",
        estado_programa: evt.programas?.estado || "Borrador",
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
        difusion_observaciones: getDifusionObservacionesFromProgram(
          evt.programas?.gira_difusion,
        ),
        difusion_observaciones_updated_at:
          (Array.isArray(evt.programas?.gira_difusion)
            ? evt.programas.gira_difusion[0]
            : evt.programas?.gira_difusion)?.timestamp_otros_comentarios || null,
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

/**
 * Programas (giras) activos en un rango de fechas que no tienen ningún concierto
 * (evento id_tipo_evento = 1). Excluye Comisión por defecto.
 */
export const getProgramasSinConciertos = async (
  supabase,
  { dateFrom = null, dateTo = null, programTipoFilter = null, excludeComision = true } = {},
) => {
  if (!supabase) return [];
  try {
    let q = supabase
      .from("programas")
      .select(
        `id, nombre_gira, nomenclador, mes_letra, tipo, estado, fecha_desde, fecha_hasta,
         gira_difusion ( otros_comentarios, timestamp_otros_comentarios ),
         giras_fuentes ( tipo, valor_id, valor_texto ),
         programas_repertorios (
           id, orden,
           repertorio_obras (
             id, orden, excluir,
             obras (
               id, titulo,
               obras_compositores ( rol, compositores ( nombre, apellido ) )
             )
           )
         )`,
      )
      .order("fecha_desde", { ascending: true });

    if (dateFrom) q = q.gte("fecha_hasta", dateFrom);
    if (dateTo) q = q.lte("fecha_desde", dateTo);
    if (programTipoFilter) q = q.eq("tipo", programTipoFilter);
    if (excludeComision) q = q.neq("tipo", "Comisión");

    const { data: programas, error } = await q;
    if (error) throw error;
    if (!programas?.length) return [];

    const ids = programas.map((p) => p.id);
    const { data: conciertos, error: concErr } = await supabase
      .from("eventos")
      .select("id_gira")
      .eq("id_tipo_evento", 1)
      .eq("is_deleted", false)
      .in("id_gira", ids);

    if (concErr) throw concErr;

    const withConcerts = new Set((conciertos || []).map((e) => e.id_gira));
    const sinConciertos = programas.filter((p) => !withConcerts.has(p.id));

    const ensambleIds = new Set();
    sinConciertos.forEach((p) => {
      (p.giras_fuentes || [])
        .filter((f) => f?.tipo === "ENSAMBLE" || f?.tipo === "EXCL_ENSAMBLE")
        .forEach((f) => {
          const id = Number(f?.valor_id);
          if (!Number.isNaN(id) && id > 0) ensambleIds.add(id);
        });
    });

    const ensambleNameMap = new Map();
    if (ensambleIds.size > 0) {
      const { data: ensRows, error: ensErr } = await supabase
        .from("ensambles")
        .select("id, ensamble")
        .in("id", Array.from(ensambleIds));
      if (ensErr) throw ensErr;
      (ensRows || []).forEach((ens) => {
        ensambleNameMap.set(Number(ens.id), ens.ensamble || "");
      });
    }

    return sinConciertos.map((p) => ({
      id: p.id,
      nombre_gira: p.nombre_gira || "",
      nomenclador: p.nomenclador || "",
      mes_letra: p.mes_letra || "",
      tipo: p.tipo || "",
      estado: p.estado || "Borrador",
      fecha_desde: p.fecha_desde,
      fecha_hasta: p.fecha_hasta,
      ensambles: buildEnsamblesFromGirasFuentes(p.giras_fuentes, ensambleNameMap),
      familias: buildFamiliasFromGirasFuentes(p.giras_fuentes),
      repertorio: buildRepertorioFromProgramasRepertorios(p.programas_repertorios),
      difusion_observaciones: getDifusionObservacionesFromProgram(p.gira_difusion),
    }));
  } catch (err) {
    console.error("[GiraService] getProgramasSinConciertos:", err);
    return [];
  }
};