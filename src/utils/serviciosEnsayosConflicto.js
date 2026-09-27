import { getAsistenciaMatrixCellMark } from "./asistenciaMatrixExport";
import {
  filterEnsamblesForConvocatoriaView,
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

export function isEnsamblePruebaLabel(name) {
  return String(name ?? "")
    .trim()
    .toLowerCase() === "prueba";
}

function isConvocadoGiraMark(mark) {
  return mark === "counted" || mark === "reemplazo" || mark === "licencia";
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
      return { ...ensayo, resolvedKind: hit.kind };
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
      conflicto: { ...(row.conflicto || {}), resolvedKind: hit.kind },
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

/**
 * Ensayos de ensamble (tipo 13) en conflicto: algún miembro (membresía activa
 * ese día, o invitado/adicional via `isIntegranteConvocadoToEnsayo`) está
 * convocado a una gira (marca counted / R / L) cuyo calendario solapa la fecha
 * del ensayo. Ensamble Prueba excluido. Ausente sin abono no es convocado.
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
  const ensambleById = new Map();
  const usable = [
    ...filterEnsamblesForConvocatoriaView(ensambles, "ensambles"),
    ...filterEnsamblesForConvocatoriaView(ensambles, "cameratas"),
  ];
  for (const en of usable) {
    if (isEnsamblePruebaLabel(en?.ensamble)) continue;
    ensambleById.set(Number(en.id), en);
  }
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

    const ensambleIds = [
      ...new Set(
        (evt.eventos_ensambles || [])
          .map((row) => Number(row.id_ensamble))
          .filter(Number.isFinite),
      ),
    ].filter((id) => ensambleById.has(id));
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
      const peopleIds = memberIdsForEnsambleOnDate(
        memberships,
        ensambleId,
        evt.fecha,
      );
      for (const extra of extraIds) peopleIds.add(extra);
      if (!peopleIds.size) continue;

      const people = [];
      for (const iid of peopleIds) {
        const giras = girasWhereConvocado(iid, overlapping, rosterByGiraId);
        if (!giras.length) continue;
        const integrante = integranteByKey.get(iid) || { id: iid };
        people.push({
          id: iid,
          integrante,
          name: personName(integrante, iid),
          giras,
        });
      }
      if (!people.length) continue;

      const sortedPeople = sortPeople(people);
      if (!groupsMap.has(ensambleId)) {
        const en = ensambleById.get(ensambleId);
        groupsMap.set(ensambleId, {
          ensambleId,
          ensambleName: en?.ensamble || `Ensamble ${ensambleId}`,
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
        people: sortedPeople,
        count: sortedPeople.length,
        overlappingGiras: overlappingGirasFromPeople(sortedPeople),
        resolvedKind: evt.ensayo_pese_conflicto
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
