import { format } from "date-fns";
import { integranteKey, integranteIdForDb } from "./integranteIds";
import { getProgramTypeColor, formatProgramSelectLabel } from "./giraUtils";
import { fetchRosterForGira } from "../hooks/useGiraRoster";
import { ENSAYO_CUSTOM_TIPO_ASISTE_IGUAL } from "./serviciosConflictoActions";

/** Tipos excluidos del selector de repertorio/preparación en ensayos */
export const EXCLUDED_REHEARSAL_PROGRAM_TYPES = new Set(["Comisión"]);

/** Tipos de programa mapeados por cada filtro toggle (sin Comisión). */
export const REHEARSAL_PROGRAM_TYPE_FILTERS = [
  {
    key: "Sinf",
    abbr: "Sinf",
    types: ["Sinfónico", "Camerata Filarmónica"],
    colorKey: "Sinfónico",
  },
  { key: "Ens", abbr: "Ens", types: ["Ensamble"], colorKey: "Ensamble" },
  { key: "Jazz", abbr: "Jazz", types: ["Jazz Band"], colorKey: "Jazz Band" },
];

export const REHEARSAL_PROGRAM_TYPE_FILTER_KEYS =
  REHEARSAL_PROGRAM_TYPE_FILTERS.map((f) => f.key);

/** Unión de tipos DB activos según las claves de filtro seleccionadas. */
export function getTypesForActiveFilters(activeTypeKeys) {
  const types = new Set();
  if (!activeTypeKeys?.size) return types;
  for (const filter of REHEARSAL_PROGRAM_TYPE_FILTERS) {
    if (!activeTypeKeys.has(filter.key)) continue;
    filter.types.forEach((t) => types.add(t));
  }
  return types;
}

function familiaFromInstrumentos(instrumentos) {
  if (!instrumentos) return null;
  const row = Array.isArray(instrumentos) ? instrumentos[0] : instrumentos;
  return row?.familia || null;
}

async function resolveEnsembleMemberKeys(supabase, ensIds, memberKeys) {
  if (memberKeys.size > 0 || ensIds.length === 0) return memberKeys;

  const { data: rels, error } = await supabase
    .from("integrantes_ensambles")
    .select("id_integrante")
    .in("id_ensamble", ensIds);
  if (error) throw error;

  const resolved = new Set(memberKeys);
  (rels || []).forEach((row) => {
    const key = integranteKey(row.id_integrante);
    if (key) resolved.add(key);
  });
  return resolved;
}

function memberIdsForDbQuery(memberKeys) {
  return Array.from(memberKeys)
    .map((id) => integranteIdForDb(id))
    .filter((id) => id != null);
}

function addGiraId(target, id) {
  if (id != null) target.add(id);
}

/**
 * Candidatos a la lista de Coordinación:
 * - confirmados: ensamble fuente explícito (sin EXCL de ese ensamble) o integrante
 *   en giras_integrantes (no ausente). No hace falta resolver el roster entero.
 * - por roster: FAMILIA u otros ENSAMBLE de los miembros, si el ensamble coordinado
 *   no está excluido. Se confirma con fetchRosterForGira (mismo motor que el badge).
 */
async function collectCoordinatorProgramIds(supabase, { ensIds, memberKeys }) {
  const memberIdList = memberIdsForDbQuery(memberKeys);
  const coordinatorEns = new Set(ensIds.map(Number).filter(Number.isFinite));
  const fuenteEnsambleIds = new Set(coordinatorEns);
  let memberFamilies = [];

  if (memberIdList.length > 0) {
    const [memberEnsRes, membersRes] = await Promise.all([
      supabase
        .from("integrantes_ensambles")
        .select("id_ensamble")
        .in("id_integrante", memberIdList),
      supabase
        .from("integrantes")
        .select("id, instrumentos(familia)")
        .in("id", memberIdList),
    ]);
    if (memberEnsRes.error) throw memberEnsRes.error;
    if (membersRes.error) throw membersRes.error;

    (memberEnsRes.data || []).forEach((row) => {
      if (row.id_ensamble != null) {
        fuenteEnsambleIds.add(Number(row.id_ensamble));
      }
    });
    memberFamilies = [
      ...new Set(
        (membersRes.data || [])
          .map((member) => familiaFromInstrumentos(member.instrumentos))
          .filter(Boolean),
      ),
    ];
  }

  const fuenteEnsIds = Array.from(fuenteEnsambleIds);
  const coordinatorEnsIds = Array.from(coordinatorEns);
  const [fuentesEnsRes, fuentesExclRes, fuentesFamRes, giRes] =
    await Promise.all([
      fuenteEnsIds.length > 0
        ? supabase
            .from("giras_fuentes")
            .select("id_gira, valor_id")
            .eq("tipo", "ENSAMBLE")
            .in("valor_id", fuenteEnsIds)
        : Promise.resolve({ data: [] }),
      coordinatorEnsIds.length > 0
        ? supabase
            .from("giras_fuentes")
            .select("id_gira")
            .eq("tipo", "EXCL_ENSAMBLE")
            .in("valor_id", coordinatorEnsIds)
        : Promise.resolve({ data: [] }),
      memberFamilies.length > 0
        ? supabase
            .from("giras_fuentes")
            .select("id_gira")
            .eq("tipo", "FAMILIA")
            .in("valor_texto", memberFamilies)
        : Promise.resolve({ data: [] }),
      memberIdList.length > 0
        ? supabase
            .from("giras_integrantes")
            .select("id_gira, id_integrante, estado")
            .in("id_integrante", memberIdList)
        : Promise.resolve({ data: [] }),
    ]);

  if (fuentesEnsRes.error) throw fuentesEnsRes.error;
  if (fuentesExclRes.error) throw fuentesExclRes.error;
  if (fuentesFamRes.error) throw fuentesFamRes.error;
  if (giRes.error) throw giRes.error;

  const excludedIds = new Set();
  (fuentesExclRes.data || []).forEach((row) => addGiraId(excludedIds, row.id_gira));

  const confirmedIds = new Set();
  const needsRosterCheck = new Set();

  (fuentesEnsRes.data || []).forEach((row) => {
    if (row.id_gira == null) return;
    const ensambleId = Number(row.valor_id);
    if (coordinatorEns.has(ensambleId) && !excludedIds.has(row.id_gira)) {
      confirmedIds.add(row.id_gira);
      return;
    }
    if (!excludedIds.has(row.id_gira)) needsRosterCheck.add(row.id_gira);
  });

  (fuentesFamRes.data || []).forEach((row) => {
    if (row.id_gira == null) return;
    // EXCL_ENSAMBLE manda sobre FAMILIA: sin override en giras_integrantes no hay gente.
    if (excludedIds.has(row.id_gira)) return;
    needsRosterCheck.add(row.id_gira);
  });

  (giRes.data || []).forEach((row) => {
    if (row.estado === "ausente") return;
    if (
      row.id_gira != null &&
      memberKeys.has(integranteKey(row.id_integrante))
    ) {
      confirmedIds.add(row.id_gira);
    }
  });

  needsRosterCheck.forEach((id) => {
    if (confirmedIds.has(id)) needsRosterCheck.delete(id);
  });

  return { confirmedIds, needsRosterCheck };
}

function programHasEnsembleMemberOnRoster(roster, memberKeys) {
  return (roster || []).some(
    (member) =>
      memberKeys.has(integranteKey(member.id)) &&
      member.estado_gira !== "ausente",
  );
}

async function filterProgramsWithMemberParticipation(
  supabase,
  programs,
  memberKeys,
) {
  if (!programs?.length || memberKeys.size === 0) return [];

  const confirmed = [];
  const chunkSize = 6;
  for (let i = 0; i < programs.length; i += chunkSize) {
    const chunk = programs.slice(i, i + chunkSize);
    const part = await Promise.all(
      chunk.map(async (program) => {
        const { roster } = await fetchRosterForGira(supabase, program, {
          lite: true,
        });
        return programHasEnsembleMemberOnRoster(roster, memberKeys)
          ? program
          : null;
      }),
    );
    confirmed.push(...part.filter(Boolean));
  }
  return confirmed;
}

function sortProgramsByFecha(programs) {
  return [...programs].sort((a, b) =>
    String(a?.fecha_desde || "").localeCompare(String(b?.fecha_desde || "")),
  );
}

/**
 * Programas visibles en Coordinación:
 * 1) el ensamble está fuente ENSAMBLE (y no EXCL_ENSAMBLE de ese ensamble);
 * 2) al menos un integrante del ensamble está en el roster de useGiraRoster
 *    (FAMILIA, otro ensamble, o override en giras_integrantes; ausente no cuenta).
 */
export async function fetchCoordinatorPrograms(
  supabase,
  { ensembleIds = [], memberIds = [] } = {},
) {
  const ensIds = [...new Set((ensembleIds || []).map(Number).filter(Boolean))];
  let memberKeys = new Set(
    (memberIds || []).map((id) => integranteKey(id)).filter(Boolean),
  );

  if (ensIds.length === 0 && memberKeys.size === 0) return [];

  memberKeys = await resolveEnsembleMemberKeys(supabase, ensIds, memberKeys);

  const { confirmedIds, needsRosterCheck } = await collectCoordinatorProgramIds(
    supabase,
    { ensIds, memberKeys },
  );

  const allIds = [...new Set([...confirmedIds, ...needsRosterCheck])];
  if (allIds.length === 0) return [];

  const { data: programs, error } = await supabase
    .from("programas")
    .select(
      "id, nombre_gira, fecha_desde, fecha_hasta, mes_letra, nomenclador, tipo, estado, zona",
    )
    .in("id", allIds)
    .order("fecha_desde", { ascending: true });

  if (error) throw error;

  const byId = new Map((programs || []).map((p) => [Number(p.id), p]));
  const confirmedPrograms = [...confirmedIds]
    .map((id) => byId.get(Number(id)))
    .filter(Boolean);
  const toResolve = [...needsRosterCheck]
    .map((id) => byId.get(Number(id)))
    .filter(Boolean);

  const rosterConfirmed = await filterProgramsWithMemberParticipation(
    supabase,
    toResolve,
    memberKeys,
  );

  const merged = new Map();
  for (const program of [...confirmedPrograms, ...rosterConfirmed]) {
    merged.set(program.id, program);
  }
  return sortProgramsByFecha([...merged.values()]);
}

/**
 * @deprecated Preferir fetchCoordinatorPrograms con ensembleIds cuando existan.
 * Mantenido para contextos sin ensambles (p. ej. agenda global).
 */
export async function fetchRelevantProgramasForMembers(
  supabase,
  memberIds,
  ensembleIds = null,
) {
  if (ensembleIds?.length) {
    return fetchCoordinatorPrograms(supabase, { ensembleIds, memberIds });
  }
  return fetchCoordinatorPrograms(supabase, { ensembleIds: [], memberIds });
}

export function mapProgramToRehearsalOption(program) {
  const tipo = program.tipo || "";
  return {
    id: program.id,
    label: formatProgramSelectLabel(program),
    subLabel: program.fecha_desde
      ? `Inicio: ${format(new Date(program.fecha_desde), "dd/MM/yyyy")}`
      : "Sin fecha",
    tipo,
    fecha_desde: program.fecha_desde || null,
    fecha_hasta: program.fecha_hasta || null,
    estado: program.estado || "Borrador",
    optionClassName: getProgramTypeColor(tipo) || "",
    badgeClass: getProgramTypeColor(tipo) || "",
  };
}

export function filterRehearsalProgramOptions(
  options,
  {
    activeTypeKeys = null,
    nameQuery = "",
    minRehearsalDate = null,
    selectedIds = [],
  } = {},
) {
  const selectedSet = new Set(selectedIds);
  const q = String(nameQuery || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

  const allowedTypes =
    activeTypeKeys == null
      ? null
      : getTypesForActiveFilters(activeTypeKeys);

  return (options || []).filter((opt) => {
    if (selectedSet.has(opt.id)) return true;

    if (EXCLUDED_REHEARSAL_PROGRAM_TYPES.has(opt.tipo)) return false;

    if (allowedTypes != null) {
      if (allowedTypes.size === 0) return false;
      if (!allowedTypes.has(opt.tipo)) return false;
    }

    if (minRehearsalDate) {
      if (opt.fecha_hasta && opt.fecha_hasta <= minRehearsalDate) return false;
    }

    if (q) {
      const haystack = String(opt.label || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }

    return true;
  });
}

/** IDs de programas vinculados a un evento (directo o por asociación). */
export function getEventProgramIds(evt) {
  const ids = new Set();
  if (evt?.programas?.id != null) ids.add(evt.programas.id);
  if (evt?.id_gira != null) ids.add(evt.id_gira);
  (evt?.eventos_programas_asociados || []).forEach((epa) => {
    if (epa?.programas?.id != null) ids.add(epa.programas.id);
  });
  return ids;
}

/** True si el evento ya trae relaciones embebidas (p. ej. desde la query de coordinación). */
export function eventHasEmbeddedRelations(evt) {
  if (!evt) return false;
  return (
    Array.isArray(evt.eventos_ensambles) ||
    Array.isArray(evt.eventos_programas_asociados) ||
    Array.isArray(evt.eventos_asistencia_custom) ||
    Array.isArray(evt.eventos_grupos)
  );
}

/** Arma form + asistencia desde un evento con relaciones embebidas o campos básicos. */
export function buildRehearsalFormFromEvent(initialData, myEnsembles = []) {
  const selectedEnsambles = (initialData?.eventos_ensambles || [])
    .map((r) => r.id_ensamble ?? r.ensambles?.id)
    .filter((id) => id != null);

  const selectedProgramas = [];
  (initialData?.eventos_programas_asociados || []).forEach((r) => {
    const id = r.id_programa ?? r.programas?.id;
    if (id != null) selectedProgramas.push(id);
  });
  if (initialData?.programas?.id != null && !selectedProgramas.includes(initialData.programas.id)) {
    selectedProgramas.push(initialData.programas.id);
  }
  if (initialData?.id_gira != null && !selectedProgramas.includes(initialData.id_gira)) {
    selectedProgramas.push(initialData.id_gira);
  }

  const customAttendance = (initialData?.eventos_asistencia_custom || [])
    .filter((c) => c.tipo !== ENSAYO_CUSTOM_TIPO_ASISTE_IGUAL)
    .map((c) => ({
      id_integrante: c.id_integrante,
      tipo: c.tipo,
      nota: c.nota || "",
      label: c.integrantes
        ? `${c.integrantes.apellido}, ${c.integrantes.nombre}`
        : c.label || "",
    }));

  const form = {
    fecha: initialData?.fecha || "",
    hora_inicio: initialData?.hora_inicio || "",
    hora_fin: initialData?.hora_fin || "",
    id_locacion: initialData?.id_locacion || "",
    descripcion: initialData?.descripcion || "",
    selectedEnsambles:
      selectedEnsambles.length > 0
        ? selectedEnsambles
        : myEnsembles.length === 1
          ? [myEnsembles[0].id]
          : [],
    selectedProgramas,
    selectedGrupos: (initialData?.eventos_grupos || [])
      .map((r) => r.id_grupo ?? r.giras_grupos?.id)
      .filter((id) => id != null),
  };

  return { form, customAttendance };
}
