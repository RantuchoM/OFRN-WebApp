import { isCondicionEstable } from "./vacantesLogistics";
import { normalize, ROLES_PRODUCCION } from "./giraUtils";
import { seatingApellido } from "./integranteDisplayName";

export const VIATICOS_SORT_APELLIDO = "apellido";
export const VIATICOS_SORT_ROL = "rol";

export const VIATICOS_SORT_STORAGE_KEY = "ofrn:viaticos_table_sort";

export function readViaticosSortMode() {
  if (typeof window === "undefined") return VIATICOS_SORT_ROL;
  try {
    const stored = localStorage.getItem(VIATICOS_SORT_STORAGE_KEY);
    if (stored === VIATICOS_SORT_ROL || stored === VIATICOS_SORT_APELLIDO) {
      return stored;
    }
  } catch {
    /* ignore */
  }
  return VIATICOS_SORT_ROL;
}

export function writeViaticosSortMode(mode) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      VIATICOS_SORT_STORAGE_KEY,
      mode === VIATICOS_SORT_ROL
        ? VIATICOS_SORT_ROL
        : VIATICOS_SORT_APELLIDO,
    );
  } catch {
    /* ignore */
  }
}

/** Orden de bloques al ordenar viáticos por rol. */
export const VIATICOS_ROW_GROUPS = Object.freeze([
  {
    id: "director",
    labelSingular: "Director",
    labelPlural: "Directores",
  },
  {
    id: "solista",
    labelSingular: "Solista",
    labelPlural: "Solistas",
  },
  {
    id: "produccion",
    labelSingular: "Producción",
    labelPlural: "Producción",
  },
  {
    id: "invitados",
    labelSingular: "Músicos invitados/refuerzos",
    labelPlural: "Músicos invitados/refuerzos",
  },
  {
    id: "estables",
    labelSingular: "Músicos estables",
    labelPlural: "Músicos estables",
  },
]);

const PRODUCCION_ROLES = new Set(
  ROLES_PRODUCCION.map((r) => normalize(r)).concat(["coordinacion"]),
);

/**
 * Grupo de visualización para una fila de viáticos individuales.
 * Prioridad: director → solista externo → producción → invitados → estables.
 * Solistas con condición Estable van a «Músicos estables».
 */
export function getViaticosRowGroupId(row) {
  const rol = normalize(row?.rol_roster || row?.rol_gira || row?.rol || "");
  const estable = isCondicionEstable(row);

  if (rol === "director") return "director";
  if (rol === "solista" && !estable) return "solista";
  if (PRODUCCION_ROLES.has(rol)) return "produccion";
  if (!estable) return "invitados";
  return "estables";
}

export function formatViaticosRowGroupLabel(groupId, count) {
  const meta = VIATICOS_ROW_GROUPS.find((g) => g.id === groupId);
  if (!meta) return groupId;
  if (count === 1) return meta.labelSingular;
  return meta.labelPlural;
}

const compareByApellidoTramo = (a, b) => {
  const byName = seatingApellido(a).localeCompare(seatingApellido(b), "es");
  if (byName !== 0) return byName;
  return (a.tramo_orden || 1) - (b.tramo_orden || 1);
};

/**
 * @param {Array} rows
 * @param {"apellido"|"rol"} sortMode
 * @returns {Array<{ type: "separator", groupId: string, label: string, count: number } | { type: "row", row: object }>}
 */
export function buildViaticosTableEntries(rows, sortMode) {
  const list = Array.isArray(rows) ? [...rows] : [];
  if (sortMode !== VIATICOS_SORT_ROL) {
    list.sort(compareByApellidoTramo);
    return list.map((row) => ({ type: "row", row }));
  }

  const byGroup = new Map(VIATICOS_ROW_GROUPS.map((g) => [g.id, []]));
  list.forEach((row) => {
    const id = getViaticosRowGroupId(row);
    const bucket = byGroup.get(id) || byGroup.get("estables");
    bucket.push(row);
  });

  const entries = [];
  VIATICOS_ROW_GROUPS.forEach((g) => {
    const bucket = byGroup.get(g.id) || [];
    if (!bucket.length) return;
    bucket.sort(compareByApellidoTramo);
    entries.push({
      type: "separator",
      groupId: g.id,
      label: formatViaticosRowGroupLabel(g.id, bucket.length),
      count: bucket.length,
    });
    bucket.forEach((row) => entries.push({ type: "row", row }));
  });
  return entries;
}
