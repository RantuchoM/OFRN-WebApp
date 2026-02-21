/**
 * Sanear string para uso como nombre de archivo (quitar acentos, ñ, caracteres especiales).
 * @param {string} str - Texto a sanear
 * @returns {string} - Texto en minúsculas, solo letras, números, punto y guión; vacío → "archivo"
 */
export function sanitizeFilename(str) {
  if (!str) return "archivo";
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ñ/g, "n")
    .replace(/Ñ/g, "N")
    .replace(/[^a-zA-Z0-9.-]/g, "_")
    .toLowerCase();
}
