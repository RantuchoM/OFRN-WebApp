import ExcelJS from "exceljs";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { saveAs } from "file-saver";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  eventColumnLabel,
  formatRegistradoHora,
  buildEnsambleMatrixSections,
} from "../services/ensayoCheckinReportService";

function reportHeaderLines(desde, hasta, ensambleLabels) {
  const gen = format(new Date(), "dd/MM/yyyy HH:mm", { locale: es });
  return [
    "Orquesta Filarmónica de Río Negro — Asistencia a ensayos",
    `Período: ${desde} a ${hasta}`,
    `Ensambles: ${ensambleLabels.join(", ")}`,
    `Generado: ${gen}`,
  ];
}

function personLabel(p) {
  return `${p.apellido || ""}, ${p.nombre || ""}`.trim();
}

/**
 * @param {Map<string, object>} checkinMap
 */
function cellHora(evt, personId, checkinMap) {
  const c = checkinMap.get(`${evt.id}-${personId}`);
  return c ? formatRegistradoHora(c.registrado_at) : "";
}

function appendMatrizSectionToSheet(sheet, section, checkinMap, { startRow = 1 } = {}) {
  let row = startRow;
  const colCount = 2 + section.events.length;
  const titleRow = sheet.getRow(row);
  titleRow.getCell(1).value = section.ensamble.ensamble || `Ensamble ${section.ensambleId}`;
  titleRow.font = { bold: true, size: 12 };
  titleRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE0E7FF" },
  };
  if (colCount > 1) {
    sheet.mergeCells(row, 1, row, colCount);
  }
  row += 1;

  const headerRow = sheet.getRow(row);
  headerRow.getCell(1).value = "Integrante";
  headerRow.getCell(2).value = "Instrumento";
  section.events.forEach((evt, idx) => {
    headerRow.getCell(3 + idx).value = eventColumnLabel(evt);
  });
  headerRow.font = { bold: true };
  headerRow.eachCell((cell) => {
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFF1F5F9" },
    };
  });
  row += 1;

  for (const p of section.integrantes) {
    const dataRow = sheet.getRow(row);
    dataRow.getCell(1).value = personLabel(p);
    dataRow.getCell(2).value = p.instrumento || "";
    section.events.forEach((evt, idx) => {
      dataRow.getCell(3 + idx).value = cellHora(evt, p.id, checkinMap);
      dataRow.getCell(3 + idx).alignment = { horizontal: "center" };
    });
    row += 1;
  }

  return row + 1;
}

export async function downloadEnsayoCheckinPorPersonaExcel({
  events,
  integrantes,
  checkinMap,
  desde,
  hasta,
  ensambleLabels,
}) {
  const wb = new ExcelJS.Workbook();
  const sheet = wb.addWorksheet("Por persona");
  reportHeaderLines(desde, hasta, ensambleLabels).forEach((line) =>
    sheet.addRow([line]),
  );
  sheet.addRow([]);
  sheet.addRow([
    "Apellido",
    "Nombre",
    "Instrumento",
    "Ensamble(s)",
    "Fecha",
    "Hora ensayo",
    "Hora llegada",
    "Sede",
  ]);
  sheet.getRow(sheet.rowCount).font = { bold: true };

  for (const p of integrantes) {
    for (const evt of events) {
      const ensIds = (evt.eventos_ensambles || []).map((ee) =>
        Number(ee.id_ensamble),
      );
      if (!ensIds.some((eid) => p.ensambleIds?.has?.(eid))) continue;
      const ensNames = (evt.eventos_ensambles || [])
        .map((ee) => ee.ensambles?.ensamble)
        .filter(Boolean)
        .join(", ");
      sheet.addRow([
        p.apellido,
        p.nombre,
        p.instrumento,
        ensNames,
        evt.fecha,
        evt.hora_inicio?.slice(0, 5) || "",
        cellHora(evt, p.id, checkinMap),
        evt.locaciones?.nombre || "",
      ]);
    }
  }

  const buf = await wb.xlsx.writeBuffer();
  saveAs(
    new Blob([buf], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    `asistencia_ensayos_persona_${desde}_${hasta}.xlsx`,
  );
}

export function downloadEnsayoCheckinPorPersonaPdf({
  events,
  integrantes,
  checkinMap,
  desde,
  hasta,
  ensambleLabels,
}) {
  const doc = new jsPDF({ orientation: "portrait" });
  let y = 14;
  reportHeaderLines(desde, hasta, ensambleLabels).forEach((line) => {
    doc.setFontSize(9);
    doc.text(line, 14, y);
    y += 5;
  });
  const body = [];
  for (const p of integrantes) {
    for (const evt of events) {
      const ensIds = (evt.eventos_ensambles || []).map((ee) =>
        Number(ee.id_ensamble),
      );
      if (!ensIds.some((eid) => p.ensambleIds?.has?.(eid))) continue;
      const ensNames = (evt.eventos_ensambles || [])
        .map((ee) => ee.ensambles?.ensamble)
        .filter(Boolean)
        .join(", ");
      body.push([
        personLabel(p),
        p.instrumento,
        ensNames,
        evt.fecha,
        evt.hora_inicio?.slice(0, 5) || "",
        cellHora(evt, p.id, checkinMap),
        evt.locaciones?.nombre || "",
      ]);
    }
  }
  autoTable(doc, {
    startY: y + 4,
    head: [
      [
        "Integrante",
        "Instrumento",
        "Ensamble",
        "Fecha",
        "Hora ensayo",
        "Llegada",
        "Sede",
      ],
    ],
    body,
    styles: { fontSize: 7 },
    headStyles: { fillColor: [79, 70, 229] },
  });
  doc.save(`asistencia_ensayos_persona_${desde}_${hasta}.pdf`);
}

/** Matriz doble entrada: una sección por ensamble (mismas columnas solo de sus ensayos). */
export async function downloadEnsayoCheckinMatrizExcel({
  events,
  integrantes,
  checkinMap,
  desde,
  hasta,
  ensambleLabels,
  ensambles,
}) {
  const sections = buildEnsambleMatrixSections(ensambles, events, integrantes);
  const wb = new ExcelJS.Workbook();
  const sheet = wb.addWorksheet("Matriz por ensamble");

  let row = 1;
  reportHeaderLines(desde, hasta, ensambleLabels).forEach((line) => {
    sheet.getRow(row).getCell(1).value = line;
    row += 1;
  });
  row += 1;

  for (let i = 0; i < sections.length; i++) {
    row = appendMatrizSectionToSheet(sheet, sections[i], checkinMap, {
      startRow: row,
    });
    if (i < sections.length - 1) row += 1;
  }

  const buf = await wb.xlsx.writeBuffer();
  saveAs(
    new Blob([buf], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    `asistencia_ensayos_matriz_${desde}_${hasta}.xlsx`,
  );
}

export function downloadEnsayoCheckinMatrizPdf({
  events,
  integrantes,
  checkinMap,
  desde,
  hasta,
  ensambleLabels,
  ensambles,
}) {
  const sections = buildEnsambleMatrixSections(ensambles, events, integrantes);
  const doc = new jsPDF({ orientation: "landscape" });
  let y = 14;
  let first = true;

  reportHeaderLines(desde, hasta, ensambleLabels).forEach((line) => {
    doc.setFontSize(9);
    doc.text(line, 14, y);
    y += 5;
  });
  y += 4;

  for (const section of sections) {
    if (!first && y > 160) {
      doc.addPage();
      y = 14;
    }
    first = false;

    doc.setFontSize(11);
    doc.setFont(undefined, "bold");
    doc.text(section.ensamble.ensamble || `Ensamble ${section.ensambleId}`, 14, y);
    doc.setFont(undefined, "normal");
    y += 6;

    autoTable(doc, {
      startY: y,
      head: [
        [
          "Integrante",
          "Inst.",
          ...section.events.map((e) => eventColumnLabel(e)),
        ],
      ],
      body: section.integrantes.map((p) => [
        personLabel(p),
        p.instrumento,
        ...section.events.map((evt) => cellHora(evt, p.id, checkinMap)),
      ]),
      styles: { fontSize: 6 },
      headStyles: { fillColor: [79, 70, 229] },
      margin: { left: 14 },
    });
    y = doc.lastAutoTable.finalY + 10;
  }

  if (sections.length === 0) {
    doc.text("Sin datos para exportar", 14, y);
  }

  doc.save(`asistencia_ensayos_matriz_${desde}_${hasta}.pdf`);
}

/** @deprecated Usar downloadEnsayoCheckinMatrizExcel (ya agrupa por ensamble en una hoja). */
export async function downloadEnsayoCheckinMatrizPorEnsambleExcel(params) {
  return downloadEnsayoCheckinMatrizExcel(params);
}

/** @deprecated Usar downloadEnsayoCheckinMatrizPdf */
export function downloadEnsayoCheckinMatrizPorEnsamblePdf(params) {
  return downloadEnsayoCheckinMatrizPdf(params);
}
