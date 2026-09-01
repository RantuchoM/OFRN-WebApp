import { stripHtml } from "./eventDisplayUtils";

/** Comparación de textos UI FIMBA (ES, ignora mayúsculas/acentos). */
const ES_BASE = { sensitivity: "base" };

/**
 * @param {unknown} a
 * @param {unknown} b
 * @returns {number}
 */
export function compareEsText(a, b) {
  return String(a ?? "").localeCompare(String(b ?? ""), "es", ES_BASE);
}

/**
 * Orden alfabético de propuestas/artistas (nombre → id estable).
 * @param {Array<{ id?: unknown, nombre?: string }>|null|undefined} propuestas
 */
export function sortFimbaPropuestasByNombre(propuestas) {
  return [...(propuestas || [])].sort((a, b) => {
    const byName = compareEsText(a?.nombre, b?.nombre);
    if (byName) return byName;
    const aNum = Number(a?.id);
    const bNum = Number(b?.id);
    if (Number.isFinite(aNum) && Number.isFinite(bNum) && aNum !== bNum) {
      return aNum - bNum;
    }
    return String(a?.id ?? "").localeCompare(String(b?.id ?? ""));
  });
}

/** HH:MM para comparar horas (acepta HH:MM:SS / HH:MM). */
function timeKey(t) {
  if (t == null || t === "") return "";
  const s = String(t);
  return s.length >= 5 ? s.slice(0, 5) : s;
}

/** Etiqueta de desempate alfabético en planilla (detalle → tipo). */
function agendaRowLabel(ev) {
  if (!ev) return "";
  return stripHtml(ev.actividad) || ev.tipo_nombre || "";
}

/**
 * Contrato de orden de filas Agenda FIMBA (planilla staff + consulta artista):
 * 1) fecha ASC
 * 2) hora_inicio ASC
 * 3) detalle/actividad (locale es, sensitivity base)
 * 4) tipo_nombre
 * 5) id (estable ante empates; no depende del filtro activo)
 *
 * Reaplicar siempre **después** de filtrar (no mutar y filtrar sin reordenar).
 *
 * @param {object} a
 * @param {object} b
 * @returns {number}
 */
export function compareFimbaAgendaRows(a, b) {
  const fechaCmp = String(a?.fecha || "").localeCompare(String(b?.fecha || ""));
  if (fechaCmp) return fechaCmp;

  const horaCmp = timeKey(a?.hora_inicio).localeCompare(timeKey(b?.hora_inicio));
  if (horaCmp) return horaCmp;

  const labelCmp = compareEsText(agendaRowLabel(a), agendaRowLabel(b));
  if (labelCmp) return labelCmp;

  const tipoCmp = compareEsText(a?.tipo_nombre, b?.tipo_nombre);
  if (tipoCmp) return tipoCmp;

  const aNum = Number(a?.id);
  const bNum = Number(b?.id);
  if (Number.isFinite(aNum) && Number.isFinite(bNum) && aNum !== bNum) {
    return aNum - bNum;
  }
  return String(a?.id ?? "").localeCompare(String(b?.id ?? ""));
}

/**
 * @template T
 * @param {T[]|null|undefined} rows
 * @returns {T[]}
 */
export function sortFimbaAgendaRows(rows) {
  return [...(rows || [])].sort(compareFimbaAgendaRows);
}
