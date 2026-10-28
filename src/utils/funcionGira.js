import { isCondicionEstable } from "./vacantesLogistics";
import { seatingApellidoNombre } from "./integranteDisplayName";

export const FUNCION_GIRA_IDS = Object.freeze([
  "reemplazo",
  "refuerzo",
  "pasante",
]);

const FUNCION_LABELS = Object.freeze({
  reemplazo: "Reemplazo",
  refuerzo: "Refuerzo",
  pasante: "Pasante",
});

export function normalizeFuncionGira(value) {
  const id = String(value ?? "").trim().toLowerCase();
  return FUNCION_LABELS[id] ? id : null;
}

export function isRolMusico(rol) {
  return String(rol ?? "").trim().toLowerCase() === "musico";
}

/** Reemplazo / Refuerzo / Pasante: no Estable y rol músico. */
export function canChooseFuncionGira(person, rol) {
  if (!person || person.es_simulacion) return false;
  if (!isRolMusico(rol)) return false;
  return !isCondicionEstable(person);
}

export function isFuncionPasante(person) {
  return (
    normalizeFuncionGira(person?.funcion_gira ?? person?.funcion) === "pasante"
  );
}

export function funcionGiraShortTag(person) {
  const id = normalizeFuncionGira(person?.funcion_gira ?? person?.funcion);
  if (!id) return "";
  if (id === "reemplazo") {
    const who = String(person?.cubre_a_label || "").trim();
    return who ? `Reemplazo de ${who}` : "Reemplazo";
  }
  return FUNCION_LABELS[id];
}

export function appendFuncionGiraTag(label, person) {
  const tag = funcionGiraShortTag(person);
  const base = String(label ?? "").trim();
  if (!base || !tag) return base;
  return `${base} (${tag})`;
}

/**
 * Tag de la columna Rol / Instr. Solo con rol músico.
 * Indiv solo si hay fila en giras_integrantes (convocatoria individual).
 * Quien entra solo por ensamble o familia no lleva tag.
 */
export function rosterFuncionTag(person) {
  if (!person || person.es_simulacion) return null;
  if (!isRolMusico(person.rol_gira ?? person.rol)) return null;
  const id = normalizeFuncionGira(person.funcion_gira ?? person.funcion);
  if (id === "reemplazo") {
    const who = String(person.cubre_a_label || "").trim();
    return {
      id,
      label: who ? `Reemplazo de ${who}` : "Reemplazo",
    };
  }
  if (id === "refuerzo" || id === "pasante") {
    return { id, label: FUNCION_LABELS[id] };
  }
  if (!person.en_giras_integrantes) return null;
  return { id: "indiv", label: "Indiv" };
}

export function funcionGiraTagClass(id) {
  if (id === "reemplazo") {
    return "bg-sky-100 text-sky-800 border-sky-300";
  }
  if (id === "refuerzo") {
    return "bg-violet-100 text-violet-800 border-violet-300";
  }
  if (id === "pasante") {
    return "bg-green-100 text-green-800 border-green-300";
  }
  return "bg-slate-100 text-slate-600 border-slate-300";
}

export function funcionGiraRowClass(person) {
  if (!person || person.es_simulacion) return "";
  if (!isRolMusico(person.rol_gira ?? person.rol)) return "";
  const id = normalizeFuncionGira(person.funcion_gira ?? person.funcion);
  if (id === "reemplazo") return " bg-sky-100 border-l-sky-300 text-slate-800";
  if (id === "refuerzo") return " bg-violet-100 border-l-violet-300 text-slate-800";
  if (id === "pasante") return " bg-green-100 border-l-green-300 text-slate-800";
  return "";
}

/** Payload persistible. Null si la función no aplica. */
export function sanitizeFuncionPayload(person, rol, funcion, idCubreA) {
  if (!canChooseFuncionGira(person, rol)) {
    return { funcion: null, id_cubre_a: null };
  }
  const id = normalizeFuncionGira(funcion);
  if (id === "reemplazo") {
    const cubre = idCubreA != null && String(idCubreA).trim() !== ""
      ? Number(idCubreA)
      : null;
    return {
      funcion: "reemplazo",
      id_cubre_a: Number.isFinite(cubre) ? cubre : null,
    };
  }
  if (id === "refuerzo" || id === "pasante") {
    return { funcion: id, id_cubre_a: null };
  }
  return { funcion: null, id_cubre_a: null };
}

export function cubreALabelFromRef(ref) {
  if (!ref) return "";
  return seatingApellidoNombre(ref);
}
