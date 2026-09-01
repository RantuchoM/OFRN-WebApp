import { isFimbaRideAboardAtStop } from "./fimbaTransportBoarding";

/**
 * Query params compartibles para `/fimba/edicion/:id/agenda`.
 * Filtros de entidad (propuestas / grupos OFRN) se combinan con OR.
 *
 * Canonical (generado por «Copiar enlace»):
 * - `propuestas=5,7` — ids `fimba_propuestas`
 * - `grupos=3` — ids `giras_grupos`
 *
 * Aliases de lectura:
 * - `artista=5` | `artistas=5,7` | `propuesta=5`
 * - `grupo=3` | `grupo=Alba` | `ofrn=Alba` (nombre se resuelve al cargar la gira)
 */

/** @param {string|null|undefined} raw */
export function parseCommaSeparatedIds(raw) {
  if (raw == null || raw === "") return [];
  return [
    ...new Set(
      String(raw)
        .split(",")
        .map((s) => Number(String(s).trim()))
        .filter(Number.isFinite),
    ),
  ];
}

function parseNameTokens(raw) {
  if (raw == null || raw === "") return [];
  return [...new Set(String(raw).split(",").map((s) => s.trim()).filter(Boolean))];
}

/**
 * Resuelve nombres de grupo (`grupo=Alba`) contra `giras_grupos`.
 * @param {string[]} grupoNames
 * @param {Array<{ id: unknown, nombre?: string|null }>} giraGrupos
 * @returns {number[]}
 */
export function resolveGrupoIdsFromNames(grupoNames, giraGrupos) {
  if (!grupoNames?.length || !giraGrupos?.length) return [];
  const byNorm = new Map();
  for (const g of giraGrupos) {
    const name = String(g.nombre || "").trim();
    if (!name) continue;
    byNorm.set(name.toLocaleLowerCase("es"), Number(g.id));
  }
  const out = [];
  for (const raw of grupoNames) {
    const id = byNorm.get(String(raw).trim().toLocaleLowerCase("es"));
    if (Number.isFinite(id) && !out.includes(id)) out.push(id);
  }
  return out;
}

/**
 * @param {URLSearchParams|{ get: (key: string) => string|null }} searchParams
 * @param {{ routeArtistaId?: string|number|null }} [opts]
 */
export function parseFimbaAgendaUrlSearchParams(searchParams, opts = {}) {
  const fromPropuestas = parseCommaSeparatedIds(searchParams.get("propuestas"));
  const fromArtistas = parseCommaSeparatedIds(searchParams.get("artistas"));
  const fromPropuestaSingular = parseCommaSeparatedIds(
    searchParams.get("propuesta"),
  );
  const fromArtista = parseCommaSeparatedIds(searchParams.get("artista"));
  const routeId = opts.routeArtistaId != null ? Number(opts.routeArtistaId) : NaN;
  const propuestaIds = [
    ...new Set([
      ...fromPropuestas,
      ...fromArtistas,
      ...fromPropuestaSingular,
      ...fromArtista,
      ...(Number.isFinite(routeId) ? [routeId] : []),
    ]),
  ];

  let grupoIds = parseCommaSeparatedIds(searchParams.get("grupos"));
  const grupoNames = [];
  const grupoRaw = searchParams.get("grupo") || searchParams.get("ofrn");
  if (grupoRaw != null && grupoRaw !== "" && !searchParams.get("grupos")) {
    const asNum = Number(String(grupoRaw).trim());
    if (Number.isFinite(asNum)) {
      grupoIds = [...new Set([...grupoIds, asNum])];
    } else {
      grupoNames.push(...parseNameTokens(grupoRaw));
    }
  }

  const locacionIds = parseCommaSeparatedIds(searchParams.get("locacion"));

  const origenRaw = String(searchParams.get("origen") || "").toLowerCase();
  const origen =
    origenRaw === "fimba" || origenRaw === "ofrn" || origenRaw === "all"
      ? origenRaw
      : null;

  return { propuestaIds, grupoIds, grupoNames, locacionIds, origen };
}

/** @param {number[]} propuestaIds @param {number[]} grupoIds */
export function hasAgendaEntityFilter(propuestaIds, grupoIds) {
  return (
    (propuestaIds || []).some((id) => Number.isFinite(Number(id))) ||
    (grupoIds || []).some((id) => Number.isFinite(Number(id)))
  );
}

/** @param {number[]} propuestaIds @param {number[]} grupoIds */
export function isSinglePropuestaOnlyFilter(propuestaIds, grupoIds) {
  const props = (propuestaIds || []).map(Number).filter(Number.isFinite);
  const grupos = (grupoIds || []).map(Number).filter(Number.isFinite);
  return props.length === 1 && grupos.length === 0;
}

/**
 * ¿El evento es relevante para filtro de artista?
 * — tag `eventos_fimba_propuestas`, o
 * — parada ↑/↓ / a bordo vía `fimba_propuesta_rutas` (evento real en BD, editable).
 *
 * @param {object|null|undefined} ev
 * @param {number[]} propuestaIds
 * @param {Array<object>} [propuestaRoutes]
 * @param {Map|null} [sequencesByVehicle]
 */
export function eventMatchesPropuestaRouteFilter(
  ev,
  propuestaIds,
  propuestaRoutes,
  sequencesByVehicle = null,
) {
  const props = (propuestaIds || []).map(Number).filter(Number.isFinite);
  if (props.length === 0 || !ev?.id) return false;

  const tagged = (ev.propuestas || []).some((p) =>
    props.includes(Number(p.id)),
  );
  if (tagged) return true;

  if (!propuestaRoutes?.length) return false;

  const want = new Set(props);
  const evId = ev.id;

  for (const r of propuestaRoutes) {
    const pid = Number(r?.id_propuesta ?? r?.propuesta?.id);
    if (!want.has(pid)) continue;
    if (Math.max(0, Number(r.plazas) || 0) <= 0) continue;
    if (r.id_evento_subida == null || r.id_evento_subida === "") continue;

    if (String(r.id_evento_subida) === String(evId)) return true;
    if (
      r.id_evento_bajada != null &&
      r.id_evento_bajada !== "" &&
      String(r.id_evento_bajada) === String(evId)
    ) {
      return true;
    }

    const tid = Number(r.id_gira_transporte);
    if (!Number.isFinite(tid) || !sequencesByVehicle) continue;
    const seq = sequencesByVehicle.get(tid);
    const sorted = seq?.sortedEvents || [];
    if (sorted.length && isFimbaRideAboardAtStop(r, evId, sorted)) {
      return true;
    }
  }
  return false;
}

/**
 * IDs de eventos de agenda para filtro de artista: ↑/↓ y paradas intermedias a bordo.
 *
 * @param {number[]} propuestaFilterIds
 * @param {Array<object>} propuestaRoutes
 * @param {Map|null} sequencesByVehicle
 * @returns {number[]}
 */
export function collectPropuestaRouteAgendaEventIds(
  propuestaFilterIds,
  propuestaRoutes,
  sequencesByVehicle,
) {
  const props = (propuestaFilterIds || []).map(Number).filter(Number.isFinite);
  if (!props.length || !propuestaRoutes?.length || !sequencesByVehicle) {
    return [];
  }
  const want = new Set(props);
  /** @type {Set<number>} */
  const ids = new Set();

  for (const r of propuestaRoutes) {
    const pid = Number(r?.id_propuesta ?? r?.propuesta?.id);
    if (!want.has(pid)) continue;
    if (Math.max(0, Number(r.plazas) || 0) <= 0) continue;
    if (r.id_evento_subida == null || r.id_evento_subida === "") continue;

    const subida = Number(r.id_evento_subida);
    if (Number.isFinite(subida)) ids.add(subida);
    if (r.id_evento_bajada != null && r.id_evento_bajada !== "") {
      const bajada = Number(r.id_evento_bajada);
      if (Number.isFinite(bajada)) ids.add(bajada);
    }

    const tid = Number(r.id_gira_transporte);
    if (!Number.isFinite(tid)) continue;
    const sorted = sequencesByVehicle.get(tid)?.sortedEvents || [];
    for (const stopEv of sorted) {
      if (stopEv?.id == null) continue;
      if (isFimbaRideAboardAtStop(r, stopEv.id, sorted)) {
        ids.add(Number(stopEv.id));
      }
    }
  }

  return [...ids].filter(Number.isFinite);
}

/**
 * Unión: evento tagged a alguna propuesta y/o con algún grupo OFRN seleccionado.
 * Transporte del artista: paradas reales vía `fimba_propuesta_rutas` (sin filas sintéticas).
 *
 * @param {object|null|undefined} ev
 * @param {number[]} propuestaIds
 * @param {number[]} grupoIds
 * @param {{ propuestaRoutes?: Array<object>, sequencesByVehicle?: Map|null }} [ctx]
 */
export function eventMatchesAgendaEntityFilter(
  ev,
  propuestaIds,
  grupoIds,
  ctx = {},
) {
  const props = (propuestaIds || []).map(Number).filter(Number.isFinite);
  const grupos = (grupoIds || []).map(Number).filter(Number.isFinite);
  if (props.length === 0 && grupos.length === 0) return true;
  if (!ev) return false;

  let matchProp = false;
  let matchGrupo = false;

  if (props.length > 0) {
    matchProp = eventMatchesPropuestaRouteFilter(
      ev,
      props,
      ctx.propuestaRoutes,
      ctx.sequencesByVehicle,
    );
  }

  if (grupos.length > 0) {
    matchGrupo = (ev.grupos || []).some((g) => grupos.includes(Number(g.id)));
  }

  if (props.length > 0 && grupos.length > 0) return matchProp || matchGrupo;
  if (props.length > 0) return matchProp;
  return matchGrupo;
}

/**
 * Base path público compartible (consulta edición, sin login).
 * @param {string} consultaToken — `fimba_ediciones.token_consulta`
 * @returns {string|null}
 */
export function buildFimbaAgendaConsultaShareBasePath(consultaToken) {
  const t = String(consultaToken || "").trim();
  if (!t) return null;
  return `/fimba/c/${t}/agenda`;
}

/**
 * Enlace público RO: `/fimba/c/{token}/agenda?propuestas=…&grupos=…`
 * @param {string} consultaToken
 * @param {Parameters<typeof buildFimbaAgendaSharePath>[1]} filters
 * @returns {string|null}
 */
export function buildFimbaAgendaConsultaSharePath(consultaToken, filters = {}) {
  const base = buildFimbaAgendaConsultaShareBasePath(consultaToken);
  if (!base) return null;
  return buildFimbaAgendaSharePath(base, filters);
}

/**
 * @param {string} basePath — p.ej. `/fimba/edicion/1/agenda` o `/fimba/c/{token}/agenda`
 * @param {{
 *   propuestaIds?: number[],
 *   grupoIds?: number[],
 *   locacionIds?: number[],
 *   origen?: string|null,
 * }} filters
 */
export function buildFimbaAgendaSharePath(basePath, filters = {}) {
  const params = new URLSearchParams();
  const props = [
    ...new Set((filters.propuestaIds || []).map(Number).filter(Number.isFinite)),
  ];
  if (props.length > 0) {
    params.set("propuestas", props.join(","));
  }

  const grupos = [
    ...new Set((filters.grupoIds || []).map(Number).filter(Number.isFinite)),
  ];
  if (grupos.length > 0) {
    params.set("grupos", grupos.join(","));
  }

  const locs = [
    ...new Set((filters.locacionIds || []).map(Number).filter(Number.isFinite)),
  ];
  if (locs.length === 1) {
    params.set("locacion", String(locs[0]));
  } else if (locs.length > 1) {
    params.set("locacion", locs.join(","));
  }

  if (hasAgendaEntityFilter(props, grupos)) {
    params.set("origen", "all");
  } else if (filters.origen === "fimba" || filters.origen === "ofrn") {
    params.set("origen", filters.origen);
  }

  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}
