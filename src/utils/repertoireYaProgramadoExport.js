import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { format, parseISO } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatSecondsToTime } from "./time";
import { formatProgramasVigentesBlock } from "./repertoireProgramaFormat";

const stripHtml = (html) =>
  String(html || "")
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();

/** Anchos relativos (suman ~100) para repartir el ancho útil de la página. */
const PDF_COL_WEIGHTS = {
  compositor: 18,
  obra: 28,
  arreglador: 14,
  organico: 12,
  duracion: 8,
  programas: 24,
  fecha: 10,
  observaciones: 16,
  tags: 14,
};

const cmpStr = (a, b) =>
  String(a || "").localeCompare(String(b || ""), "es", { sensitivity: "base" });

/**
 * Compara dos obras por una clave de orden.
 * @returns {number}
 */
function compareWorksByKey(a, b, sortKey) {
  if (sortKey === "duracion") {
    const va = a.duracion_segundos ?? -1;
    const vb = b.duracion_segundos ?? -1;
    return va === vb ? 0 : va < vb ? -1 : 1;
  }
  if (sortKey === "programas") {
    const fa = a._export_programa_fecha || "9999-12-31";
    const fb = b._export_programa_fecha || "9999-12-31";
    return String(fa).localeCompare(String(fb));
  }
  if (sortKey === "fecha") {
    const fa = a.fecha_esperada || "9999-12-31";
    const fb = b.fecha_esperada || "9999-12-31";
    return String(fa).localeCompare(String(fb));
  }
  if (sortKey === "obra") {
    return cmpStr(a.titulo_plain || a.titulo, b.titulo_plain || b.titulo);
  }
  if (sortKey === "compositor") {
    return cmpStr(a.compositor_full, b.compositor_full);
  }
  if (sortKey === "arreglador") {
    return cmpStr(a.arreglador_full, b.arreglador_full);
  }
  if (sortKey === "organico") {
    return cmpStr(a.instrumentacion, b.instrumentacion);
  }
  if (sortKey === "observaciones") {
    return cmpStr(stripHtml(a.observaciones), stripHtml(b.observaciones));
  }
  if (sortKey === "tags") {
    const ta = (a.tags_objects || []).map((t) => t?.tag).filter(Boolean).join(", ");
    const tb = (b.tags_objects || []).map((t) => t?.tag).filter(Boolean).join(", ");
    return cmpStr(ta, tb);
  }
  return cmpStr(a.compositor_full, b.compositor_full);
}

/**
 * @param {'todos'|'historico'|'futuro'} timeScope
 * @param {string} fechaDesde
 * @param {Date} today
 */
function programaMatchesTimeScope(timeScope, fechaDesde, today) {
  if (!fechaDesde) return false;
  if (timeScope === "todos") return true;
  try {
    const start = parseISO(fechaDesde);
    start.setHours(0, 0, 0, 0);
    if (timeScope === "historico") return start < today;
    if (timeScope === "futuro") return start >= today;
  } catch {
    return false;
  }
  return true;
}

/**
 * Filtra programas por tipo/tiempo y ordena obras (uno o varios criterios).
 * @param {Array<object>} works
 * @param {{
 *   types?: Set<string>|Iterable<string>,
 *   timeScope?: 'todos'|'historico'|'futuro',
 *   sortKey?: string,
 *   sortDirection?: 'asc'|'desc',
 *   sortRules?: Array<{ key: string, direction?: 'asc'|'desc' }>,
 * }} options
 */
export function prepareYaProgramadoExportWorks(works, options = {}) {
  const typeSet =
    options.types instanceof Set
      ? options.types
      : new Set(options.types || []);
  const timeScope = options.timeScope || "todos";

  const sortRules =
    Array.isArray(options.sortRules) && options.sortRules.length > 0
      ? options.sortRules.map((r) => ({
          key: r.key || "compositor",
          direction: r.direction === "desc" ? "desc" : "asc",
        }))
      : [
          {
            key: options.sortKey || "compositor",
            direction: options.sortDirection === "desc" ? "desc" : "asc",
          },
        ];

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const prepared = (works || [])
    .map((work) => {
      const programas = (work.programas_vigentes || []).filter((p) => {
        if (typeSet.size === 0) return false;
        if (!typeSet.has(p.tipo)) return false;
        return programaMatchesTimeScope(timeScope, p.fecha_desde, today);
      });
      return {
        ...work,
        programas_vigentes: programas,
        _export_programa_fecha: programas[0]?.fecha_desde || null,
      };
    })
    .filter((work) => (work.programas_vigentes || []).length > 0);

  prepared.sort((a, b) => {
    for (const rule of sortRules) {
      let result = compareWorksByKey(a, b, rule.key);
      if (rule.direction === "desc") result = -result;
      if (result !== 0) return result;
    }
    return cmpStr(a.titulo_plain || a.titulo, b.titulo_plain || b.titulo);
  });

  return prepared;
}

/**
 * Construye filas y columnas de exportación según columnas visibles del Archivo
 * (sin Estado ni Acciones). Con Ya programado, el slot proxima_gira → Programas.
 *
 * @param {Array<object>} works
 * @param {Record<string, boolean>} visibleColumns
 */
export function buildYaProgramadoExportTable(works, visibleColumns = {}) {
  const columns = [];

  if (visibleColumns.compositor !== false) {
    columns.push({ header: "Compositor", key: "compositor", width: 28 });
  }
  if (visibleColumns.obra !== false) {
    columns.push({ header: "Obra", key: "obra", width: 36 });
  }
  if (visibleColumns.arreglador) {
    columns.push({ header: "Arreglador", key: "arreglador", width: 22 });
  }
  if (visibleColumns.organico !== false) {
    columns.push({ header: "Orgánico", key: "organico", width: 18 });
  }
  if (visibleColumns.duracion !== false) {
    columns.push({ header: "Duración", key: "duracion", width: 10 });
  }
  // Estado omitido a propósito
  if (visibleColumns.proxima_gira !== false) {
    columns.push({ header: "Programas", key: "programas", width: 42 });
  }
  if (visibleColumns.fecha) {
    columns.push({ header: "F. Esperada", key: "fecha", width: 12 });
  }
  if (visibleColumns.observaciones) {
    columns.push({ header: "Observaciones", key: "observaciones", width: 28 });
  }
  if (visibleColumns.tags) {
    columns.push({ header: "Palabras clave", key: "tags", width: 22 });
  }

  const data = (works || []).map((work) => {
    const row = {
      compositor: work.compositor_full || "",
      obra: work.titulo_plain || stripHtml(work.titulo) || "",
      arreglador: work.arreglador_full || "",
      organico: work.instrumentacion || "",
      duracion:
        work.duracion_segundos || work.duracion_segundos === 0
          ? formatSecondsToTime(work.duracion_segundos)
          : "",
      programas: formatProgramasVigentesBlock(work.programas_vigentes),
      fecha: work.fecha_esperada
        ? format(parseISO(work.fecha_esperada), "dd/MM/yy")
        : "",
      observaciones: stripHtml(work.observaciones),
      tags: (work.tags_objects || [])
        .map((t) => t?.tag)
        .filter(Boolean)
        .join(", "),
    };
    return row;
  });

  return { columns, data };
}

/**
 * Excel formateado: encabezado fijo, wrap en Programas, autofiltro, filas alternadas.
 */
export async function exportYaProgramadoExcel(works, visibleColumns, fileName = "Obras_ya_programadas") {
  const { columns, data } = buildYaProgramadoExportTable(works, visibleColumns);
  if (columns.length === 0 || data.length === 0) {
    throw new Error("No hay datos para exportar.");
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "OFRN Archivo";
  const worksheet = workbook.addWorksheet("Ya programado", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  worksheet.columns = columns.map((col) => ({
    header: col.header,
    key: col.key,
    width: col.width || 16,
  }));

  data.forEach((row) => {
    worksheet.addRow(row);
  });

  const headerRow = worksheet.getRow(1);
  headerRow.height = 22;
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF312E81" },
    };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = {
      top: { style: "thin", color: { argb: "FFE5E7EB" } },
      left: { style: "thin", color: { argb: "FFE5E7EB" } },
      bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
      right: { style: "thin", color: { argb: "FFE5E7EB" } },
    };
  });

  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return;
    let maxLines = 1;
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const col = columns[colNumber - 1];
      const isProgramas = col?.key === "programas";
      const isObra = col?.key === "obra";
      const text = cell.value == null ? "" : String(cell.value);
      if (isProgramas) {
        maxLines = Math.max(maxLines, text.split("\n").length);
      } else if (isObra) {
        maxLines = Math.max(maxLines, Math.ceil(text.length / 40));
      }
      cell.alignment = {
        vertical: "top",
        horizontal: "left",
        wrapText: true,
      };
      cell.font = { size: 9 };
      cell.border = {
        top: { style: "thin", color: { argb: "FFF1F5F9" } },
        left: { style: "thin", color: { argb: "FFF1F5F9" } },
        bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
        right: { style: "thin", color: { argb: "FFE2E8F0" } },
      };
      if (rowNumber % 2 === 0) {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF8FAFC" },
        };
      }
    });
    row.height = Math.min(12 + maxLines * 12, 90);
  });

  worksheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: columns.length },
  };

  const buffer = await workbook.xlsx.writeBuffer();
  const safeName = (fileName || "export").replace(/[^a-z0-9_\-]/gi, "_");
  saveAs(new Blob([buffer]), `${safeName}.xlsx`);
}

/**
 * PDF apaisado con anchos fijos y salto de línea (obra/programas no estiran la página).
 */
export function exportYaProgramadoPdf(works, visibleColumns, fileName = "Obras_ya_programadas") {
  const { columns, data } = buildYaProgramadoExportTable(works, visibleColumns);
  if (columns.length === 0 || data.length === 0) {
    throw new Error("No hay datos para exportar.");
  }

  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  const marginX = 10;
  const pageWidth = doc.internal.pageSize.getWidth();
  const usableWidth = pageWidth - marginX * 2;

  const weightSum = columns.reduce(
    (sum, col) => sum + (PDF_COL_WEIGHTS[col.key] || 12),
    0,
  );
  const columnStyles = {};
  columns.forEach((col, index) => {
    const weight = PDF_COL_WEIGHTS[col.key] || 12;
    columnStyles[index] = {
      cellWidth: (usableWidth * weight) / weightSum,
      overflow: "linebreak",
      valign: "top",
    };
  });

  const head = [columns.map((c) => c.header)];
  const body = data.map((row) =>
    columns.map((c) => {
      const value = row[c.key];
      if (value === null || value === undefined) return "";
      return String(value);
    }),
  );

  autoTable(doc, {
    head,
    body,
    margin: { top: 12, left: marginX, right: marginX, bottom: 10 },
    tableWidth: usableWidth,
    styles: {
      fontSize: 7,
      cellPadding: 1.5,
      overflow: "linebreak",
      valign: "top",
      halign: "left",
      minCellHeight: 5,
    },
    headStyles: {
      fillColor: [49, 46, 129],
      textColor: 255,
      fontStyle: "bold",
      overflow: "linebreak",
      valign: "middle",
      fontSize: 7,
    },
    columnStyles,
    bodyStyles: {
      overflow: "linebreak",
    },
  });

  const safeName = (fileName || "export").replace(/[^a-z0-9_\-]/gi, "_");
  doc.save(`${safeName}.pdf`);
}
