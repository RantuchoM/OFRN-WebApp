import { format, parseISO } from "date-fns";

/**
 * Línea de programa vigente/legacy: `dd/MM/yy - nomenclador. nombre`
 * En UI el tag naranja va aparte (`LegacyTag`); en export se puede pedir el sufijo texto.
 * @param {{ fecha_desde?: string, nomenclador?: string, nombre_gira?: string, es_legacy?: boolean }} prog
 * @param {{ includeLegacyLabel?: boolean }} [opts]
 */
export function formatProgramaVigenteLine(prog, opts = {}) {
  const includeLegacyLabel = !!opts.includeLegacyLabel;
  let core;
  if (!prog?.fecha_desde) {
    core = prog?.nombre_gira || "-";
  } else {
    const fecha = format(parseISO(prog.fecha_desde), "dd/MM/yy");
    const nom = (prog.nomenclador || "").trim();
    const nombre = prog.nombre_gira || "";
    core = nom
      ? `${fecha} - ${nom}. ${nombre}`.trim()
      : `${fecha} - ${nombre}`.trim();
  }
  if (includeLegacyLabel && prog?.es_legacy) return `${core} · Legacy`;
  return core;
}

/**
 * Une programas vigentes en texto multilínea (Excel/PDF).
 * @param {Array<object>} programas
 */
export function formatProgramasVigentesBlock(programas) {
  if (!Array.isArray(programas) || programas.length === 0) return "";
  return programas
    .map((p) => formatProgramaVigenteLine(p, { includeLegacyLabel: true }))
    .join("\n");
}
