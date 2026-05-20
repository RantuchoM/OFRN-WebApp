import { format } from "date-fns";
import { integranteKey } from "./integranteIds";
import { getProgramTypeColor, formatProgramSelectLabel } from "./giraUtils";

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

/**
 * Programas visibles en Coordinación: fuente ensamble activo y/o integrantes en gira.
 * Mucho más rápido que evaluar fetchRosterForGira por cada programa.
 */
export async function fetchCoordinatorPrograms(
  supabase,
  { ensembleIds = [], memberIds = [] } = {},
) {
  const ensIds = [...new Set((ensembleIds || []).map(Number).filter(Boolean))];
  const memberKeys = new Set(
    (memberIds || []).map((id) => integranteKey(id)).filter(Boolean),
  );

  if (ensIds.length === 0 && memberKeys.size === 0) return [];

  const [fuentesRes, giRes] = await Promise.all([
    ensIds.length > 0
      ? supabase
          .from("giras_fuentes")
          .select("id_gira")
          .eq("tipo", "ENSAMBLE")
          .in("valor_id", ensIds)
      : Promise.resolve({ data: [] }),
    memberKeys.size > 0
      ? supabase
          .from("giras_integrantes")
          .select("id_gira, id_integrante, estado")
          .in("id_integrante", Array.from(memberKeys))
      : Promise.resolve({ data: [] }),
  ]);

  const programIds = new Set();
  (fuentesRes.data || []).forEach((f) => {
    if (f.id_gira != null) programIds.add(f.id_gira);
  });
  (giRes.data || []).forEach((row) => {
    if (row.estado === "ausente") return;
    if (
      row.id_gira != null &&
      memberKeys.has(integranteKey(row.id_integrante))
    ) {
      programIds.add(row.id_gira);
    }
  });

  if (programIds.size === 0) return [];

  const { data: programs, error } = await supabase
    .from("programas")
    .select(
      "id, nombre_gira, fecha_desde, fecha_hasta, mes_letra, nomenclador, tipo, estado, zona",
    )
    .in("id", Array.from(programIds))
    .order("fecha_desde", { ascending: true });

  if (error) throw error;
  return programs || [];
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
    Array.isArray(evt.eventos_asistencia_custom)
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

  const customAttendance = (initialData?.eventos_asistencia_custom || []).map((c) => ({
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
  };

  return { form, customAttendance };
}
