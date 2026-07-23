import { format, parseISO } from "date-fns";

/**
 * Línea de programa vigente para UI/export: `dd/MM/yy - nomenclador. nombre`
 * @param {{ fecha_desde?: string, nomenclador?: string, nombre_gira?: string }} prog
 */
export function formatProgramaVigenteLine(prog) {
  if (!prog?.fecha_desde) return prog?.nombre_gira || "-";
  const fecha = format(parseISO(prog.fecha_desde), "dd/MM/yy");
  const nom = (prog.nomenclador || "").trim();
  const nombre = prog.nombre_gira || "";
  if (nom) return `${fecha} - ${nom}. ${nombre}`.trim();
  return `${fecha} - ${nombre}`.trim();
}

/**
 * Une programas vigentes en texto multilínea (Excel/PDF).
 * @param {Array<object>} programas
 */
export function formatProgramasVigentesBlock(programas) {
  if (!Array.isArray(programas) || programas.length === 0) return "";
  return programas.map(formatProgramaVigenteLine).join("\n");
}
