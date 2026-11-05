import { fetchRosterForGira } from "../hooks/useGiraRoster";
import { calculateLogisticsSummary } from "../hooks/useLogistics";
import { buildPersonalLogisticsFromSummary } from "../utils/viaticosLogisticsSchedule";
import {
  enrichRosterWithGrupoIds,
  fetchGiraGrupos,
} from "./giraGruposService";
import { fetchGiraSegmentosBundle } from "./giraSegmentosService";
import {
  resolveLocalidadEfectivaViaticos,
  resolveLocalidadResidencia,
} from "../utils/integranteDomicilioViaticos";
import { resolvePersonIsLocal } from "../utils/giraTramos";
import { integranteIdForDb, integranteKey } from "../utils/integranteIds";

/** Cache por gira: datos logísticos + summary enriquecido. */
const bundleCache = new Map();

function isoDate(value) {
  const s = String(value || "").slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

function formatDdMm(iso) {
  const d = isoDate(iso);
  if (!d) return "";
  const [, m, day] = d.split("-");
  return `${day}/${m}`;
}

/**
 * Carga roster + reglas de transporte de la gira (cacheado).
 * Usado para sugerir fechas de constancia = primera ↑ / última ↓.
 */
async function loadGiraLogisticsBundle(supabase, idGira) {
  const key = String(idGira);
  if (bundleCache.has(key)) return bundleCache.get(key);

  const pending = (async () => {
    const giraId = Number(idGira);
    const { data: programa, error: progErr } = await supabase
      .from("programas")
      .select("id, fecha_desde, fecha_hasta, nombre_gira")
      .eq("id", giraId)
      .maybeSingle();
    if (progErr) throw progErr;
    if (!programa) throw new Error("Gira no encontrada");

    const [
      rosterPack,
      logRes,
      admRes,
      routeRes,
      transRes,
      locsRes,
      sedesRes,
      evsRes,
      segmentBundle,
      gruposPack,
    ] = await Promise.all([
      fetchRosterForGira(supabase, programa),
      supabase.from("giras_logistica_reglas").select("*").eq("id_gira", giraId),
      supabase.from("giras_logistica_admision").select("*").eq("id_gira", giraId),
      supabase
        .from("giras_logistica_rutas")
        .select(
          `*, evento_subida:id_evento_subida(*, locaciones(*, localidades(*))), evento_bajada:id_evento_bajada(*, locaciones(*, localidades(*)))`,
        )
        .eq("id_gira", giraId),
      supabase
        .from("giras_transportes")
        .select(
          "*, transportes(nombre, patente, icon, documentacion, es_oficial)",
        )
        .eq("id_gira", giraId),
      supabase.from("localidades").select("id, localidad, id_region"),
      supabase
        .from("giras_localidades")
        .select("id_localidad")
        .eq("id_gira", giraId),
      supabase
        .from("eventos")
        .select(
          `*, locaciones(*, localidades(*)), tipos_evento(id, nombre, color, id_categoria)`,
        )
        .eq("id_gira", giraId)
        .eq("is_deleted", false),
      fetchGiraSegmentosBundle(supabase, giraId, programa).catch(() => ({
        segments: [],
        cortesCount: 0,
      })),
      fetchGiraGrupos(supabase, giraId).catch(() => ({
        grupos: [],
        error: null,
      })),
    ]);

    const locs = locsRes.data || [];
    const sedeIds = (sedesRes.data || []).map((s) => Number(s.id_localidad));
    const tourLocSet = new Set(sedeIds.map(String));
    const segments = segmentBundle?.segments || [];
    const cortesCount = segmentBundle?.cortesCount ?? 0;

    const rosterEnriquecido = (rosterPack.roster || []).map((p) => {
      const integrante = p.integrantes || p.integrante || p;
      const locViaticos = resolveLocalidadEfectivaViaticos(integrante);
      const locResidencia = resolveLocalidadResidencia(integrante);
      const locId =
        locViaticos.id != null && locViaticos.id !== ""
          ? String(locViaticos.id)
          : "";
      const locObj =
        locs.find((l) => String(l.id) === locId) || locViaticos.objeto;
      const residenciaId =
        locResidencia.id != null && locResidencia.id !== ""
          ? String(locResidencia.id)
          : "";
      const residenciaObj =
        locs.find((l) => String(l.id) === residenciaId) ||
        locResidencia.objeto;

      const isLocal = resolvePersonIsLocal(p, {
        segments,
        tourLocSet,
        cortesCount,
      });

      return {
        ...p,
        id: p.id ?? integrante?.id,
        id_localidad: locId,
        localidades: locObj || p.localidades || null,
        id_localidad_residencia: residenciaId,
        localidades_residencia: residenciaObj || p._loc_residencia || null,
        id_region_residencia: locResidencia.regionId,
        is_local: isLocal,
      };
    });

    const rosterWithGrupos = enrichRosterWithGrupoIds(
      rosterEnriquecido,
      gruposPack?.grupos || [],
    );

    const summary = calculateLogisticsSummary(
      rosterWithGrupos,
      logRes.data || [],
      admRes.data || [],
      routeRes.data || [],
      transRes.data || [],
      [],
      locs,
      evsRes.data || [],
      segments,
    );

    const travelMap = buildPersonalLogisticsFromSummary(summary);
    const byKey = new Map();
    (summary || []).forEach((person) => {
      const k = integranteKey(person.id);
      if (!k) return;
      const travel =
        travelMap[person.id] || travelMap[String(person.id)] || null;
      byKey.set(k, {
        is_local: Boolean(person.is_local),
        travel,
        estado: String(person.estado || person.estado_gira || "").toLowerCase(),
      });
    });

    return {
      programa,
      byKey,
    };
  })();

  bundleCache.set(key, pending);
  try {
    return await pending;
  } catch (err) {
    bundleCache.delete(key);
    throw err;
  }
}

/**
 * Sugiere fechas de constancia desde la logística de transporte
 * (primera subida ↑ / última bajada ↓), solo si la persona no es local.
 *
 * @returns {{
 *   isLocal: boolean|null,
 *   fechaDesde: string|null,
 *   fechaHasta: string|null,
 *   horaSalida: string|null,
 *   horaLlegada: string|null,
 *   lugarSalida: string|null,
 *   lugarLlegada: string|null,
 *   label: string|null,
 *   reason: string|null,
 * }}
 */
export async function suggestConstanciaFechasFromLogistics(
  supabase,
  { idIntegrante, idGira },
) {
  const idInt = integranteIdForDb(idIntegrante);
  if (!idInt) {
    return {
      isLocal: null,
      fechaDesde: null,
      fechaHasta: null,
      horaSalida: null,
      horaLlegada: null,
      lugarSalida: null,
      lugarLlegada: null,
      label: null,
      reason: "invalid_person",
    };
  }
  if (!idGira) {
    return {
      isLocal: null,
      fechaDesde: null,
      fechaHasta: null,
      horaSalida: null,
      horaLlegada: null,
      lugarSalida: null,
      lugarLlegada: null,
      label: null,
      reason: "invalid_gira",
    };
  }

  const bundle = await loadGiraLogisticsBundle(supabase, idGira);
  const entry = bundle.byKey.get(integranteKey(idInt));
  if (!entry) {
    return {
      isLocal: null,
      fechaDesde: null,
      fechaHasta: null,
      horaSalida: null,
      horaLlegada: null,
      lugarSalida: null,
      lugarLlegada: null,
      label: null,
      reason: "not_in_roster",
    };
  }

  if (entry.estado === "ausente") {
    return {
      isLocal: entry.is_local,
      fechaDesde: null,
      fechaHasta: null,
      horaSalida: null,
      horaLlegada: null,
      lugarSalida: null,
      lugarLlegada: null,
      label: null,
      reason: "ausente",
    };
  }

  if (entry.is_local) {
    return {
      isLocal: true,
      fechaDesde: null,
      fechaHasta: null,
      horaSalida: null,
      horaLlegada: null,
      lugarSalida: null,
      lugarLlegada: null,
      label: "Persona local de la gira: no aplica ventana de viaje.",
      reason: "local",
    };
  }

  const travel = entry.travel;
  const fechaDesde = isoDate(travel?.fecha_salida);
  const fechaHasta = isoDate(travel?.fecha_llegada);
  if (!fechaDesde && !fechaHasta) {
    return {
      isLocal: false,
      fechaDesde: null,
      fechaHasta: null,
      horaSalida: null,
      horaLlegada: null,
      lugarSalida: null,
      lugarLlegada: null,
      label: "Sin subida/bajada de transporte asignada en logística.",
      reason: "no_transport",
    };
  }

  const horaSalida = travel?.hora_salida || null;
  const horaLlegada = travel?.hora_llegada || null;
  const lugarSalida = travel?.lugar_salida || null;
  const lugarLlegada = travel?.lugar_llegada || null;

  const parts = [];
  if (fechaDesde) {
    parts.push(
      `sale ${formatDdMm(fechaDesde)}${horaSalida ? ` ${horaSalida}` : ""}${
        lugarSalida ? ` (${lugarSalida})` : ""
      }`,
    );
  }
  if (fechaHasta) {
    parts.push(
      `vuelve ${formatDdMm(fechaHasta)}${horaLlegada ? ` ${horaLlegada}` : ""}${
        lugarLlegada ? ` (${lugarLlegada})` : ""
      }`,
    );
  }

  return {
    isLocal: false,
    fechaDesde,
    fechaHasta,
    horaSalida,
    horaLlegada,
    lugarSalida,
    lugarLlegada,
    label: parts.length ? `Logística: ${parts.join(" · ")}` : null,
    reason: null,
  };
}

/** Invalida cache (p. ej. tras cambios de logística en la misma sesión). */
export function clearConstanciaLogisticsFechasCache(idGira) {
  if (idGira == null) {
    bundleCache.clear();
    return;
  }
  bundleCache.delete(String(idGira));
}
