import { format, parseISO } from "date-fns";

/**
 * Primer lunes estrictamente posterior a una fecha (yyyy-MM-dd).
 * Útil para fecha límite de rendición por defecto (posterior al fin de gira).
 */
export function firstMondayAfter(dateStr) {
  if (!dateStr || typeof dateStr !== "string") return "";
  try {
    const d = parseISO(dateStr);
    if (isNaN(d.getTime())) return "";
    d.setDate(d.getDate() + 1);
    while (d.getDay() !== 1) d.setDate(d.getDate() + 1);
    return format(d, "yyyy-MM-dd");
  } catch {
    return "";
  }
}

/**
 * Utilidades de fecha y hora en hora local del navegador.
 * Usar este módulo para "hoy", "hora actual" y formato de fechas en la app.
 * No forzar GMT-3 salvo donde una spec lo indique.
 */

/**
 * Fecha/hora actual en hora local del dispositivo.
 */
export function getNowLocal() {
  return new Date();
}

/**
 * Hora actual en formato "HH:mm" (hora local).
 */
export function getCurrentTimeLocal() {
  return format(getNowLocal(), "HH:mm");
}

/**
 * Fecha de hoy en formato "yyyy-MM-dd" (hora local).
 * Útil para comparar con campos fecha de la BD y para inputs type="date".
 */
export function getTodayDateStringLocal() {
  return format(getNowLocal(), "yyyy-MM-dd");
}

/**
 * Convierte una cadena "HH:mm" o "HH:mm:ss" a minutos desde medianoche.
 * @param {string} s - Hora en formato "HH:mm" o "HH:mm:ss"
 * @returns {number} Minutos (0–1439)
 */
export function timeStringToMinutes(s) {
  if (!s) return 0;
  const [h, m] = s.slice(0, 5).split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

/**
 * Formato de fecha para inputs type="date" (YYYY-MM-DD).
 * @param {Date} date - Fecha a formatear
 * @returns {string} "yyyy-MM-dd"
 */
export function formatForDateInput(date) {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) return "";
  return format(date, "yyyy-MM-dd");
}

/**
 * @param {string|Date|number} value
 * @param {"dd/MM/yyyy"|"dd/MM/yy"} outputPattern
 */
function formatDdMm(value, outputPattern) {
  if (value == null || value === "") return "";
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return format(value, outputPattern);
  }
  const s = String(value).trim();
  if (!s) return "";
  const head = s.slice(0, 10);
  const ymd = head.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (ymd) {
    const y = parseInt(ymd[1], 10);
    const mo = parseInt(ymd[2], 10);
    const d = parseInt(ymd[3], 10);
    const dateObj = new Date(y, mo - 1, d);
    if (
      dateObj.getFullYear() !== y ||
      dateObj.getMonth() !== mo - 1 ||
      dateObj.getDate() !== d
    ) {
      return "";
    }
    return format(dateObj, outputPattern);
  }
  try {
    const date = parseISO(s);
    if (!Number.isNaN(date.getTime())) return format(date, outputPattern);
  } catch {
    /* ignore */
  }
  return "";
}

/**
 * dd/MM/yy — exportación viáticos (PDF/Excel).
 * Acepta "yyyy-MM-dd", ISO con hora, u objeto Date.
 */
export function formatDdMmYy(value) {
  return formatDdMm(value, "dd/MM/yy");
}

/**
 * dd/MM/yyyy — exportación rendiciones (PDF) y pantallas.
 * Acepta "yyyy-MM-dd", ISO con hora, u objeto Date.
 */
export function formatDdMmYyyy(value) {
  return formatDdMm(value, "dd/MM/yyyy");
}

/**
 * Formato de fecha para mostrar al usuario: dd/MM/yyyy.
 * @param {string} dateStr - Fecha en formato "yyyy-MM-dd"
 * @returns {string} "dd/MM/yyyy" o "" si la fecha no es válida
 */
export function formatDisplayDate(dateStr) {
  if (!dateStr || typeof dateStr !== "string") return "";
  return formatDdMmYyyy(dateStr);
}
