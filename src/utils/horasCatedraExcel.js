import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

const TITLE = "SUBSECRETARÍA ORQUESTA FILARMONICA DE RÍO NEGRO";
const TIPO_CULTURA = "SEC CULTURA";
const TIPO_EDUCACION = "CONVENIO EDUCACION";

const THIN = { style: "thin", color: { argb: "FF000000" } };
const BORDER = { top: THIN, left: THIN, bottom: THIN, right: THIN };
const GREEN = { type: "pattern", pattern: "solid", fgColor: { argb: "FFB6D7A8" } };

/**
 * Una fila por origen con horas en el mes. Desde = fecha de alta del integrante.
 * Hasta = fecha de baja, vacía si sigue activo.
 */
export function buildHorasCatedraExcelRows(rows) {
  const people = [...(rows || [])].sort((a, b) => {
    const ap = String(a.apellido || "").localeCompare(String(b.apellido || ""), "es", {
      sensitivity: "base",
    });
    if (ap !== 0) return ap;
    return String(a.nombre || "").localeCompare(String(b.nombre || ""), "es", {
      sensitivity: "base",
    });
  });

  const out = [];
  for (const person of people) {
    const slots = [
      { hours: Number(person.totalCult) || 0, tipo: TIPO_CULTURA },
      { hours: Number(person.totalEdu) || 0, tipo: TIPO_EDUCACION },
    ];
    for (const slot of slots) {
      if (slot.hours <= 0) continue;
      out.push({
        apellido: String(person.apellido || "").trim(),
        nombre: String(person.nombre || "").trim(),
        cuil: person.cuil ? String(person.cuil).trim() : "",
        horas: slot.hours,
        tipo: slot.tipo,
        desde: toExcelDate(person.fecha_alta),
        hasta: toExcelDate(person.fecha_baja),
      });
    }
  }
  return out;
}

export async function downloadHorasCatedraExcel({ rows, year, month }) {
  const data = buildHorasCatedraExcelRows(rows);
  if (!data.length) {
    throw new Error("No hay integrantes con horas en el mes seleccionado.");
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "OFRN";
  const sheet = workbook.addWorksheet("Horas cátedra", {
    views: [{ state: "frozen", ySplit: 4, showGridLines: true }],
    properties: { defaultRowHeight: 18 },
  });

  sheet.columns = [
    { width: 8 },
    { width: 22 },
    { width: 22 },
    { width: 18 },
    { width: 18.25 },
    { width: 24 },
    { width: 16 },
    { width: 16 },
  ];

  sheet.mergeCells("A1:H3");
  const title = sheet.getCell("A1");
  title.value = TITLE;
  title.font = { name: "Arial", bold: true, size: 16, color: { theme: 1 } };
  title.fill = GREEN;
  title.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  for (let r = 1; r <= 3; r += 1) {
    sheet.getRow(r).height = 22;
    for (let c = 1; c <= 8; c += 1) {
      const cell = sheet.getRow(r).getCell(c);
      cell.fill = GREEN;
      cell.border = BORDER;
      cell.font = { name: "Arial", bold: true, size: 16, color: { theme: 1 } };
    }
  }

  const headers = [
    "N°",
    "APELLIDO",
    "NOMBRE",
    "CUIL",
    "CANTIDAD DE HORAS " + year,
    "TIPO DE HR",
    "DESDE",
    "HASTA",
  ];
  const headerRow = sheet.getRow(4);
  headerRow.height = 36;
  headers.forEach((label, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = label;
    cell.font = { name: "Arial", bold: true, size: 13, color: { theme: 1 } };
    cell.alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: true,
    };
    cell.border = BORDER;
  });

  data.forEach((item, index) => {
    const row = sheet.getRow(5 + index);
    row.height = 20;
    const values = [
      index + 1,
      item.apellido,
      item.nombre,
      item.cuil,
      item.horas,
      item.tipo,
      item.desde,
      item.hasta,
    ];
    values.forEach((value, i) => {
      const cell = row.getCell(i + 1);
      cell.value = value === "" ? null : value;
      cell.font = { name: "Arial", size: 11, color: { theme: 1 } };
      cell.border = BORDER;
      cell.alignment = {
        horizontal: i === 1 || i === 2 ? "left" : "center",
        vertical: "middle",
      };
    });
    row.getCell(4).numFmt = "@";
    if (item.cuil) row.getCell(4).value = item.cuil;
    row.getCell(5).numFmt = "0";
    row.getCell(7).numFmt = "dd/mm/yyyy";
    row.getCell(8).numFmt = "dd/mm/yyyy";
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const mm = String(month).padStart(2, "0");
  saveAs(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    `Horas_Catedra_Subsecretaria_${mm}_${year}.xlsx`,
  );
  return data.length;
}

function toExcelDate(value) {
  if (value == null || value === "") return null;
  const head = String(value).trim().slice(0, 10);
  const match = head.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}
