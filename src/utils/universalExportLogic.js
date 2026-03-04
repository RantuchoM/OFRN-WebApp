import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/**
 * Normaliza el ancho de columna recibido desde la UI.
 * Acepta números (caracteres aproximados) o strings tipo "120px".
 */
const normalizeWidth = (width) => {
  if (typeof width === "number") return width;
  if (typeof width === "string") {
    const pxMatch = width.match(/(\d+)(px)?/);
    if (pxMatch) {
      const px = parseInt(pxMatch[1], 10);
      // Aproximación: 1 char ~ 7px
      return Math.max(8, Math.round(px / 7));
    }
  }
  return 16;
};

/**
 * Genera un archivo Excel sencillo a partir de datos tabulares.
 *
 * @param {Array<object>} data
 * @param {Array<{ header: string, key: string, width?: number|string, type?: 'text'|'number'|'date' }>} columns
 * @param {string} fileName
 */
export const generateExcel = async (data, columns, fileName = "export") => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Datos");

  worksheet.columns = columns.map((col) => ({
    header: col.header,
    key: col.key,
    width: normalizeWidth(col.width),
  }));

  data.forEach((row) => {
    const safeRow = {};
    columns.forEach((col) => {
      let value = row[col.key];
      if (value === undefined || value === null) value = "";
      if (col.type === "number" && value !== "" && !Number.isNaN(Number(value))) {
        safeRow[col.key] = Number(value);
      } else if (col.type === "date" && typeof value === "string" && value) {
        // Intentar parsear YYYY-MM-DD
        const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (match) {
          const [_, y, m, d] = match;
          const date = new Date(Number(y), Number(m) - 1, Number(d));
          safeRow[col.key] = date;
        } else {
          safeRow[col.key] = value;
        }
      } else {
        safeRow[col.key] = value;
      }
    });
    worksheet.addRow(safeRow);
  });

  // Estilos de encabezado
  const headerRow = worksheet.getRow(1);
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1F2937" }, // gris azulado oscuro
    };
    cell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
    cell.border = {
      top: { style: "thin", color: { argb: "FFE5E7EB" } },
      left: { style: "thin", color: { argb: "FFE5E7EB" } },
      bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
      right: { style: "thin", color: { argb: "FFE5E7EB" } },
    };
  });
  headerRow.height = 20;

  // Bordes y alineación para el resto de filas
  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return;
    row.eachCell((cell, colNumber) => {
      const col = columns[colNumber - 1];
      const isNumeric = col?.type === "number";
      cell.alignment = {
        vertical: "middle",
        horizontal: isNumeric ? "right" : "left",
        wrapText: true,
      };
      cell.border = {
        top: { style: "thin", color: { argb: "FFF1F5F9" } },
        left: { style: "thin", color: { argb: "FFF1F5F9" } },
        bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
        right: { style: "thin", color: { argb: "FFE5E7EB" } },
      };
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const safeName = (fileName || "export").replace(/[^a-z0-9_\-]/gi, "_");
  saveAs(new Blob([buffer]), `${safeName}.xlsx`);
};

/**
 * Genera un PDF en formato tabla usando jsPDF + autoTable.
 *
 * @param {Array<object>} data
 * @param {Array<{ header: string, key: string, width?: number|string }>} columns
 * @param {string} fileName
 * @param {'p'|'l'} orientation
 */
export const generatePDF = (data, columns, fileName = "export", orientation = "p") => {
  const doc = new jsPDF({
    orientation: orientation === "l" ? "landscape" : "portrait",
    unit: "mm",
    format: "a4",
  });

  const head = [columns.map((c) => c.header)];
  const body = data.map((row) =>
    columns.map((c) => {
      const value = row[c.key];
      if (value === null || value === undefined) return "";
      return String(value);
    })
  );

  autoTable(doc, {
    head,
    body,
    styles: {
      fontSize: 8,
      cellPadding: 2,
      valign: "middle",
    },
    headStyles: {
      fillColor: [31, 41, 55], // gris azulado oscuro
      textColor: 255,
      fontStyle: "bold",
    },
    bodyStyles: {
      cellWidth: "wrap",
    },
    tableWidth: "auto",
    margin: { top: 14, left: 10, right: 10, bottom: 10 },
  });

  const safeName = (fileName || "export").replace(/[^a-z0-9_\-]/gi, "_");
  doc.save(`${safeName}.pdf`);
};

