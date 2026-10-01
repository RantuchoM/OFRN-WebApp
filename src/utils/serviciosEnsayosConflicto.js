import { getAsistenciaMatrixCellMark } from "./asistenciaMatrixExport";
import {
  filterEnsamblesForConvocatoriaView,
  isEnsamblePruebaLabel,
} from "./convocatoriaEnsambleViews";
import { membershipActiveOnProgramDate } from "./ensembleMembership";
import { programOverlapsDateRange } from "./giraDateRange";
import { compareInstrumentIds } from "./giraUtils";
import {
  isIntegranteConvocadoToEnsayo,
  isProgramBorrador,
} from "./girasYearSummary";
import { integranteKey } from "./integranteIds";
import {
  ID_TIPO_ENSAYO_ENSAMBLE,
  formatProgramNomencladorNombre,
} from "./serviciosCantidad";
import { classifyProgramaEnsambleConvocatoria } from "./serviciosEnsambleReport";
import {
  asisteIgualIdsFromCustomRows,
} from "./serviciosConflictoActions";

export { isEnsamblePruebaLabel };

function isConvocadoGiraMark(mark) {
  return mark === "counted" || mark === "reemplazo" || mark === "licencia";
}

/**
 * Pleno: la gira convoca a este ensamble, su CF o su familia
 * (`classifyProgramaEnsambleConvocatoria` = convocado) y NO hay EXCL_ENSAMBLE.
 * Tutti-N: status excluido o no, pero hay gente en el roster real.
 */
export function isEnsambleGrupoConvocadoAGira(program, ensamble) {
  const cls = classifyProgramaEnsambleConvocatoria(program, ensamble);
  return cls.status === "convocado";
}

/**
 * Marcas counted/R/L a partir del roster de seating (`fetchRosterForGira`).
 * `ausente` no cuenta salvo que abone reemplazo o licencia.
 */
export function matrixRosterFromGiraRoster(roster) {
  const counted = new Set();
  const reemplazo = new Set();
  const licencia = new Set();
  const preAlta = new Set();
  for (const person of roster || []) {
    const id = integranteKey(person.id ?? person.id_integrante);
    if (!id) continue;
    const estado = String(person.estado_gira || person.estado || "")
      .toLowerCase()
      .trim();
    if (estado === "ausente") {
      if (person.abona_reemplazo) reemplazo.add(id);
      else if (person.abona_licencia) licencia.add(id);
      continue;
    }
    if (estado === "baja" || estado === "no_convocado") continue;
    counted.add(id);
  }
  return { counted, preAlta, reemplazo, licencia };
}

function overlappingGirasForDate(programas, fecha) {
  const day = String(fecha || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return [];
  return (programas || []).filter((p) => {
    if (!p?.id || isProgramBorrador(p)) return false;
    return programOverlapsDateRange(p, day, day, undefined, {
      calendarOnly: true,
    });
  });
}

function ensambleMapForConflicto(ensambles) {
  const ensambleById = new Map();
  const usable = [
    ...filterEnsamblesForConvocatoriaView(ensambles, "ensambles"),
    ...filterEnsamblesForConvocatoriaView(ensambles, "cameratas"),
  ];
  for (const en of usable) {
    if (isEnsamblePruebaLabel(en?.ensamble)) continue;
    ensambleById.set(Number(en.id), en);
  }
  return ensambleById;
}

function ensambleIdsOnEvent(evt) {
  return [
    ...new Set(
      (evt?.eventos_ensambles || [])
        .map((row) => Number(row.id_ensamble ?? row.ensambles?.id))
        .filter(Number.isFinite),
    ),
  ];
}

function giraOverlapLabel(program) {
  return (
    formatProgramNomencladorNombre(program) || `Programa ${program?.id}`
  );
}

function fullConflictoGirasForEvent(evt, ensambleById, programas) {
  const overlapping = overlappingGirasForDate(programas, evt.fecha);
  if (!overlapping.length) return [];
  const seen = new Set();
  const full = [];
  for (const eid of ensambleIdsOnEvent(evt)) {
    const ensamble = ensambleById.get(eid);
    if (!ensamble) continue;
    for (const program of overlapping) {
      if (!isEnsambleGrupoConvocadoAGira(program, ensamble)) continue;
      const pid = Number(program.id);
      if (seen.has(pid)) continue;
      seen.add(pid);
      full.push(program);
    }
  }
  return full;
}

/**
 * Conflicto pleno en memoria: gira que solapa la fecha + ensamble/CF/familia
 * convocado y no EXCL. No usa roster ni queries por evento.
 */
export function buildFullConflictoImpactByEventId({
  events,
  ensambles,
  programas,
} = {}) {
  const ensambleById = ensambleMapForConflicto(ensambles);
  const map = new Map();
  for (const evt of events || []) {
    if (!evt || evt.is_deleted || evt.tecnica) continue;
    if (Number(evt.id_tipo_evento) !== ID_TIPO_ENSAYO_ENSAMBLE) continue;
    const fullPrograms = fullConflictoGirasForEvent(
      evt,
      ensambleById,
      programas,
    );
    if (!fullPrograms.length) continue;
    const eventId = Number(evt.id);
    if (!Number.isFinite(eventId)) continue;
    map.set(eventId, {
      eventId,
      conflictKind: CONFLICTO_KIND.full,
      overlappingGiras: fullPrograms.map((p) => ({
        id: p.id,
        label: giraOverlapLabel(p),
        count: 1,
      })),
      people: [],
      pullouts: [],
      count: 0,
      resolvedKind: evt.ensayo_pese_conflicto
        ? CONFLICTO_RESOLVED_KIND.kept
        : null,
      justificacion: evt.ensayo_pese_conflicto_justificacion || null,
    });
  }
  return map;
}

/** Giras superpuestas a ensayos tipo 13 que NO son conflicto pleno (candidatas Tutti-N). */
export function uniqueTuttiNProgramasForEvents({
  events,
  ensambles,
  programas,
  fullImpactByEventId,
} = {}) {
  const ensambleById = ensambleMapForConflicto(ensambles);
  const byId = new Map();
  for (const evt of events || []) {
    if (!evt || evt.is_deleted || evt.tecnica) continue;
    if (Number(evt.id_tipo_evento) !== ID_TIPO_ENSAYO_ENSAMBLE) continue;
    if (fullImpactByEventId?.has(Number(evt.id))) continue;
    const overlapping = overlappingGirasForDate(programas, evt.fecha);
    for (const eid of ensambleIdsOnEvent(evt)) {
      const ensamble = ensambleById.get(eid);
      if (!ensamble) continue;
      for (const program of overlapping) {
        if (isEnsambleGrupoConvocadoAGira(program, ensamble)) continue;
        byId.set(Number(program.id), program);
      }
    }
  }
  return [...byId.values()];
}

export function applyTuttiNImpacts(
  fullMap,
  {
    events,
    ensambles,
    programas,
    rosterByGiraId,
    memberships,
    integrantes,
  } = {},
) {
  const map = new Map(fullMap || []);
  if (!rosterByGiraId || !Object.keys(rosterByGiraId).length) return map;
  const ensambleById = ensambleMapForConflicto(ensambles);
  const integranteByKey = new Map(
    (integrantes || []).map((p) => [integranteKey(p.id), p]),
  );
  for (const evt of events || []) {
    if (!evt || evt.is_deleted || evt.tecnica) continue;
    if (Number(evt.id_tipo_evento) !== ID_TIPO_ENSAYO_ENSAMBLE) continue;
    const eventId = Number(evt.id);
    if (!Number.isFinite(eventId) || map.has(eventId)) continue;
    const overlapping = overlappingGirasForDate(programas, evt.fecha);
    if (!overlapping.length) continue;
    const pulloutPeople = [];
    const seenPerson = new Set();
    for (const eid of ensambleIdsOnEvent(evt)) {
      const ensamble = ensambleById.get(eid);
      if (!ensamble) continue;
      const peopleIds = memberIdsForEnsambleOnDate(
        memberships,
        eid,
        evt.fecha,
      );
      for (const iid of peopleIds) {
        if (seenPerson.has(iid)) continue;
        const hits = girasWhereConvocado(iid, overlapping, rosterByGiraId);
        const girasPartial = hits.filter(
          (hit) => !isEnsambleGrupoConvocadoAGira(hit.program, ensamble),
        );
        if (!girasPartial.length) continue;
        seenPerson.add(iid);
        const integrante = integranteByKey.get(iid) || { id: iid };
        pulloutPeople.push({
          id: iid,
          integrante,
          name: personName(integrante, iid),
          giras: girasPartial,
        });
      }
    }
    if (!pulloutPeople.length) continue;
    const listed = sortPeople(pulloutPeople);
    map.set(eventId, {
      eventId,
      conflictKind: CONFLICTO_KIND.partial,
      people: listed,
      pullouts: listed,
      count: listed.length,
      overlappingGiras: overlappingGirasFromPeople(listed),
      resolvedKind: null,
      justificacion: null,
      asisteIgualIds: [
        ...asisteIgualIdsFromCustomRows(evt.eventos_asistencia_custom),
      ],
      eventCustom: evt.eventos_asistencia_custom || [],
    });
  }
  return map;
}

function girasWhereConvocado(integranteId, giras, rosterByGiraId) {
  const hits = [];
  for (const program of giras || []) {
    const mark = getAsistenciaMatrixCellMark(
      rosterByGiraId?.[program.id],
      integranteId,
    );
    if (!isConvocadoGiraMark(mark)) continue;
    hits.push({
      program,
      mark,
      label:
        formatProgramNomencladorNombre(program) || `Programa ${program.id}`,
    });
  }
  return hits;
}

function memberIdsForEnsambleOnDate(memberships, ensambleId, fecha) {
  const ids = new Set();
  const eid = Number(ensambleId);
  for (const row of memberships || []) {
    if (Number(row.id_ensamble) !== eid) continue;
    if (!membershipActiveOnProgramDate(row, fecha)) continue;
    const k = integranteKey(row.id_integrante);
    if (k) ids.add(k);
  }
  return ids;
}

function sortPeople(rows) {
  return [...rows].sort((a, b) => {
    const cmp = compareInstrumentIds(
      a.integrante?.id_instr,
      b.integrante?.id_instr,
    );
    if (cmp !== 0) return cmp;
    const na = `${a.integrante?.apellido || ""} ${a.integrante?.nombre || ""}`.trim();
    const nb = `${b.integrante?.apellido || ""} ${b.integrante?.nombre || ""}`.trim();
    return na.localeCompare(nb, "es");
  });
}

function personName(integrante, id) {
  const name = `${integrante?.apellido || ""}, ${integrante?.nombre || ""}`.trim();
  return name || `Integrante ${id}`;
}

export const CONFLICTO_RESOLVED_KIND = {
  kept: "kept",
  deleted: "deleted",
  rescheduled: "rescheduled",
};

export const CONFLICTO_RESOLVED_LABEL = {
  kept: "Se ensayó igual",
  deleted: "No se ensayó",
  rescheduled: "Otro día",
};

/** Pleno: el ensamble está convocado a la gira que solapa. Parcial: EXCL/no convocado pero hay gente en roster. */
export const CONFLICTO_KIND = {
  full: "full",
  partial: "partial",
};

/** Color de tarjeta / barra para ensayo en conflicto pendiente. */
export const ENSAYO_CONFLICTO_COLOR = "#d97706";
export const ENSAYO_CONFLICTO_BG = "#fffbeb";

function sessionKey(eventId) {
  return eventId == null ? "" : String(eventId);
}

function sessionHit(sessionByEventId, eventId) {
  if (!sessionByEventId || eventId == null) return null;
  const key = sessionKey(eventId);
  return sessionByEventId[key] || sessionByEventId[eventId] || null;
}

export function partitionConflictoEnsayos(ensayos) {
  const pending = [];
  const resolved = [];
  for (const row of ensayos || []) {
    if (row?.resolvedKind) resolved.push(row);
    else pending.push(row);
  }
  return { pending, resolved };
}

/** Título del bloque resuelto: «Se ensayó igual» si solo hay that kind. */
export function resolvedConflictoHeading(resolvedEnsayos) {
  const kinds = new Set(
    (resolvedEnsayos || []).map((row) => row?.resolvedKind).filter(Boolean),
  );
  if (kinds.size === 1 && kinds.has(CONFLICTO_RESOLVED_KIND.kept)) {
    return CONFLICTO_RESOLVED_LABEL.kept;
  }
  return "Resueltos";
}

export function eventFromConflictoEnsayo(ensayo) {
  if (!ensayo) return { id: null };
  return {
    id: ensayo.eventId,
    fecha: ensayo.fecha,
    hora_inicio: ensayo.horaInicio,
    hora_fin: ensayo.horaFin,
    descripcion: ensayo.descripcion,
    tipos_evento: { nombre: ensayo.tipoNombre },
  };
}

/**
 * Mantiene filas resueltas en esta sesión: pisa `resolvedKind` y reinserta
 * ensayos que el refetch ya no trae (borrados / reprogramados).
 */
export function applySessionResolvedToGroups(groups, sessionByEventId) {
  const session = sessionByEventId || {};
  const entries = Object.values(session).filter((e) => e?.eventId != null);
  const used = new Set();
  const next = (groups || []).map((group) => {
    const ensayos = (group.ensayos || []).map((ensayo) => {
      const hit = sessionHit(session, ensayo.eventId);
      if (!hit) return ensayo;
      used.add(sessionKey(ensayo.eventId));
      return {
        ...ensayo,
        resolvedKind: hit.kind,
        justificacion: hit.justificacion ?? ensayo.justificacion,
      };
    });
    for (const entry of entries) {
      if (Number(entry.ensambleId) !== Number(group.ensambleId)) continue;
      const key = sessionKey(entry.eventId);
      if (used.has(key) || !entry.ensayo) continue;
      ensayos.push({ ...entry.ensayo, resolvedKind: entry.kind });
      used.add(key);
    }
    return { ...group, ensayos };
  });
  for (const entry of entries) {
    const key = sessionKey(entry.eventId);
    if (used.has(key) || !entry.ensayo) continue;
    let group = next.find(
      (g) => Number(g.ensambleId) === Number(entry.ensambleId),
    );
    if (!group) {
      group = {
        ensambleId: entry.ensambleId,
        ensambleName: entry.ensambleName || `Ensamble ${entry.ensambleId}`,
        ensayos: [],
      };
      next.push(group);
    }
    group.ensayos.push({ ...entry.ensayo, resolvedKind: entry.kind });
    used.add(key);
  }
  return next;
}

export function applySessionResolvedToEnsambleRows(
  rows,
  sessionByEventId,
  ensamble,
) {
  const session = sessionByEventId || {};
  const entries = Object.values(session).filter((e) => e?.eventId != null);
  const ensambleId = ensamble?.id;
  const used = new Set();
  const next = (rows || []).map((row) => {
    const id = row.event?.id ?? row.conflicto?.eventId;
    const hit = sessionHit(session, id);
    if (!hit) return row;
    used.add(sessionKey(id));
    return {
      ...row,
      conflicto: {
        ...(row.conflicto || {}),
        resolvedKind: hit.kind,
        justificacion: hit.justificacion ?? row.conflicto?.justificacion,
      },
    };
  });
  for (const entry of entries) {
    if (ensambleId != null && Number(entry.ensambleId) !== Number(ensambleId)) {
      continue;
    }
    const key = sessionKey(entry.eventId);
    if (used.has(key) || !entry.ensayo) continue;
    next.push({
      event: eventFromConflictoEnsayo(entry.ensayo),
      conflicto: { ...entry.ensayo, resolvedKind: entry.kind },
    });
    used.add(key);
  }
  return next;
}

/**
 * Giras/programas únicos que solapan el ensayo, a partir de las personas
 * en conflicto. Principal = más personas afectadas, luego nombre.
 */
export function overlappingGirasFromPeople(people) {
  const byKey = new Map();
  for (const person of people || []) {
    for (const g of person.giras || []) {
      const label = String(g?.label || "").trim();
      if (!label) continue;
      const id = g.program?.id;
      const key = id != null ? `id:${id}` : `label:${label}`;
      const prev = byKey.get(key);
      if (prev) {
        prev.count += 1;
      } else {
        byKey.set(key, { id: id ?? null, label, count: 1 });
      }
    }
  }
  return [...byKey.values()].sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return a.label.localeCompare(b.label, "es");
  });
}

function mergeOverlappingGiraRows(a, b) {
  const byKey = new Map();
  for (const g of [...(a || []), ...(b || [])]) {
    const label = String(g?.label || "").trim();
    if (!label) continue;
    const key = g.id != null ? `id:${g.id}` : `label:${label}`;
    if (!byKey.has(key)) byKey.set(key, { ...g, label, count: g.count || 1 });
  }
  return [...byKey.values()];
}

/** Programas ya embebidos en eventos de agenda (sin query extra). */
export function collectEmbeddedProgramas(events) {
  const byId = new Map();
  const take = (p) => {
    if (!p?.id) return;
    const id = Number(p.id);
    if (!Number.isFinite(id)) return;
    const prev = byId.get(id);
    const fuentes = Array.isArray(p.giras_fuentes) ? p.giras_fuentes : [];
    if (!prev) {
      byId.set(id, p);
      return;
    }
    const prevFuentes = Array.isArray(prev.giras_fuentes)
      ? prev.giras_fuentes
      : [];
    if (fuentes.length && !prevFuentes.length) byId.set(id, { ...prev, ...p });
  };
  for (const evt of events || []) {
    take(evt.programas);
    for (const row of evt.eventos_programas_asociados || []) {
      take(row.programas);
    }
  }
  return [...byId.values()];
}

export function mergeProgramasById(...lists) {
  const byId = new Map();
  for (const list of lists) {
    for (const p of list || []) {
      if (!p?.id) continue;
      const id = Number(p.id);
      if (!Number.isFinite(id)) continue;
      const prev = byId.get(id);
      const fuentes = Array.isArray(p.giras_fuentes) ? p.giras_fuentes : [];
      if (!prev) {
        byId.set(id, p);
        continue;
      }
      const prevFuentes = Array.isArray(prev.giras_fuentes)
        ? prev.giras_fuentes
        : [];
      if (fuentes.length && !prevFuentes.length) {
        byId.set(id, { ...prev, ...p });
      }
    }
  }
  return [...byId.values()];
}

/**
 * Ensayos de ensamble (tipo 13) en conflicto pleno o Tutti-N.
 * Un miembro (membresía activa ese día, o invitado/adicional) está en el
 * roster real de seating de una gira cuyo calendario solapa la fecha
 * (`fetchRosterForGira`: counted / R / L; ausente sin abono no).
 * Pleno = `classifyProgramaEnsambleConvocatoria` convocado (ENSAMBLE, FAMILIA
 * o CF) y el ensamble NO está EXCL_ENSAMBLE. Tutti-N = EXCL o sin convocatoria
 * de ensamble/CF/familia, pero hay gente en el roster (override individual).
 * Ensamble Prueba excluido.
 */
export function buildEnsayosConflictoGroups({
  events,
  ensambles,
  integrantes,
  memberships,
  customRows,
  programas,
  rosterByGiraId,
} = {}) {
  const ensambleById = ensambleMapForConflicto(ensambles);
  const integranteByKey = new Map(
    (integrantes || []).map((p) => [integranteKey(p.id), p]),
  );
  const customByEventId = new Map();
  for (const row of customRows || []) {
    if (!customByEventId.has(row.id_evento)) {
      customByEventId.set(row.id_evento, []);
    }
    customByEventId.get(row.id_evento).push(row);
  }

  const groupsMap = new Map();

  for (const evt of events || []) {
    if (!evt || evt.is_deleted || evt.tecnica) continue;
    if (Number(evt.id_tipo_evento) !== ID_TIPO_ENSAYO_ENSAMBLE) continue;

    const ensambleIds = ensambleIdsOnEvent(evt).filter((id) =>
      ensambleById.has(id),
    );
    if (!ensambleIds.length) continue;

    const overlapping = overlappingGirasForDate(programas, evt.fecha);
    if (!overlapping.length) continue;

    const eventCustom = customByEventId.get(evt.id) || [];
    const extraIds = new Set();
    for (const row of eventCustom) {
      const iid = integranteKey(row.id_integrante);
      if (!iid) continue;
      const customMap = new Map();
      customMap.set(evt.id, row);
      if (isIntegranteConvocadoToEnsayo(evt, iid, memberships, customMap)) {
        extraIds.add(iid);
      }
    }

    for (const ensambleId of ensambleIds) {
      const ensamble = ensambleById.get(ensambleId);
      const fullPrograms = overlapping.filter((p) =>
        isEnsambleGrupoConvocadoAGira(p, ensamble),
      );
      const peopleIds = memberIdsForEnsambleOnDate(
        memberships,
        ensambleId,
        evt.fecha,
      );
      for (const extra of extraIds) peopleIds.add(extra);

      const conflictPeople = [];
      const pulloutPeople = [];
      for (const iid of peopleIds) {
        const allHits = girasWhereConvocado(iid, overlapping, rosterByGiraId);
        if (!allHits.length) continue;
        const girasFull = [];
        const girasPartial = [];
        for (const hit of allHits) {
          if (isEnsambleGrupoConvocadoAGira(hit.program, ensamble)) {
            girasFull.push(hit);
          } else {
            girasPartial.push(hit);
          }
        }
        const integrante = integranteByKey.get(iid) || { id: iid };
        const row = {
          id: iid,
          integrante,
          name: personName(integrante, iid),
        };
        if (girasFull.length) {
          conflictPeople.push({ ...row, giras: girasFull });
        } else if (girasPartial.length) {
          pulloutPeople.push({ ...row, giras: girasPartial });
        }
      }

      const isFull = fullPrograms.length > 0;
      if (!isFull && !pulloutPeople.length) continue;

      const listed = sortPeople(isFull ? conflictPeople : pulloutPeople);
      if (!groupsMap.has(ensambleId)) {
        groupsMap.set(ensambleId, {
          ensambleId,
          ensambleName: ensamble?.ensamble || `Ensamble ${ensambleId}`,
          ensayos: [],
        });
      }
      groupsMap.get(ensambleId).ensayos.push({
        eventId: evt.id,
        fecha: evt.fecha,
        horaInicio: evt.hora_inicio || "",
        horaFin: evt.hora_fin || "",
        descripcion: evt.descripcion || "",
        tipoNombre: evt.tipos_evento?.nombre || "Ensayo de ensamble",
        conflictKind: isFull ? CONFLICTO_KIND.full : CONFLICTO_KIND.partial,
        people: listed,
        pullouts: sortPeople(pulloutPeople),
        count: isFull ? listed.length || fullPrograms.length : listed.length,
        overlappingGiras: isFull
          ? fullPrograms.map((p) => ({
              id: p.id,
              label: giraOverlapLabel(p),
              count: 1,
            }))
          : overlappingGirasFromPeople(listed),
        justificacion: evt.ensayo_pese_conflicto_justificacion || null,
        resolvedKind:
          isFull && evt.ensayo_pese_conflicto
            ? CONFLICTO_RESOLVED_KIND.kept
            : null,
      });
    }
  }

  const groups = [...groupsMap.values()].map((g) => ({
    ...g,
    ensayos: [...g.ensayos].sort((a, b) => {
      const fa = String(a.fecha || "");
      const fb = String(b.fecha || "");
      if (fa !== fb) return fa.localeCompare(fb);
      return String(a.horaInicio || "").localeCompare(String(b.horaInicio || ""));
    }),
  }));
  groups.sort((a, b) => a.ensambleName.localeCompare(b.ensambleName, "es"));
  return groups;
}

export function isPendingFullConflicto(ensayo) {
  return (
    ensayo?.conflictKind === CONFLICTO_KIND.full && !ensayo?.resolvedKind
  );
}

export function groupsWithFullConflicto(groups) {
  return (groups || [])
    .map((g) => ({
      ...g,
      ensayos: (g.ensayos || []).filter(
        (e) => e.conflictKind === CONFLICTO_KIND.full,
      ),
    }))
    .filter((g) => (g.ensayos || []).length > 0);
}

export function pendingFullConflictoEventIdSet(groupsOrMap) {
  const ids = new Set();
  if (groupsOrMap instanceof Map) {
    for (const [id, impact] of groupsOrMap) {
      if (!isPendingFullConflicto(impact)) continue;
      ids.add(Number(id));
    }
    return ids;
  }
  for (const group of groupsOrMap || []) {
    for (const ensayo of group.ensayos || []) {
      if (!isPendingFullConflicto(ensayo) || ensayo.eventId == null) continue;
      ids.add(Number(ensayo.eventId));
    }
  }
  return ids;
}

function mergePersonRows(a, b) {
  const byId = new Map();
  for (const row of [...(a || []), ...(b || [])]) {
    const key = integranteKey(row?.id) || String(row?.id ?? "");
    if (!key) continue;
    const prev = byId.get(key);
    if (!prev) {
      byId.set(key, { ...row, giras: [...(row.giras || [])] });
      continue;
    }
    const seen = new Set(
      (prev.giras || []).map((g) => g.program?.id ?? g.label),
    );
    const giras = [...(prev.giras || [])];
    for (const g of row.giras || []) {
      const gk = g.program?.id ?? g.label;
      if (seen.has(gk)) continue;
      seen.add(gk);
      giras.push(g);
    }
    byId.set(key, { ...prev, giras });
  }
  return sortPeople([...byId.values()]);
}

/**
 * Un impacto por evento: pleno gana a Tutti-N. Varios ensambles del mismo
 * ensayo se fusionan (personas y giras).
 */
export function ensayoImpactByEventId(groups) {
  const map = new Map();
  for (const group of groups || []) {
    for (const ensayo of group.ensayos || []) {
      const id = Number(ensayo.eventId);
      if (!Number.isFinite(id)) continue;
      const prev = map.get(id);
      const ensambleIds = [group.ensambleId];
      if (!prev) {
        map.set(id, { ...ensayo, ensambleIds });
        continue;
      }
      const nextIds = [...new Set([...(prev.ensambleIds || []), ...ensambleIds])];
      if (ensayo.conflictKind === CONFLICTO_KIND.full) {
        if (prev.conflictKind !== CONFLICTO_KIND.full) {
          map.set(id, { ...ensayo, ensambleIds: nextIds });
          continue;
        }
        const people = mergePersonRows(prev.people, ensayo.people);
        const fromPeople = overlappingGirasFromPeople(people);
        map.set(id, {
          ...prev,
          people,
          count: people.length,
          overlappingGiras: fromPeople.length
            ? fromPeople
            : mergeOverlappingGiraRows(
                prev.overlappingGiras,
                ensayo.overlappingGiras,
              ),
          ensambleIds: nextIds,
          resolvedKind: prev.resolvedKind || ensayo.resolvedKind,
          justificacion: prev.justificacion || ensayo.justificacion,
        });
        continue;
      }
      if (prev.conflictKind === CONFLICTO_KIND.full) {
        map.set(id, { ...prev, ensambleIds: nextIds });
        continue;
      }
      const people = mergePersonRows(prev.people, ensayo.people);
      map.set(id, {
        ...prev,
        people,
        pullouts: mergePersonRows(prev.pullouts, ensayo.pullouts),
        count: people.length,
        overlappingGiras: overlappingGirasFromPeople(people),
        ensambleIds: nextIds,
      });
    }
  }
  return map;
}

export function getEnsayoImpact(map, eventId) {
  if (!map || eventId == null) return null;
  return (
    map.get(Number(eventId)) ||
    map.get(eventId) ||
    map.get(String(eventId)) ||
    null
  );
}

export function eventIdInPendingConflictoSet(pendingIds, eventId) {
  if (!pendingIds || eventId == null) return false;
  const n = Number(eventId);
  return pendingIds.has(n) || pendingIds.has(eventId) || pendingIds.has(String(eventId));
}
