import { format, differenceInYears } from "date-fns";
import { es } from "date-fns/locale";

async function loadExcelJS() {
  const { default: ExcelJS } = await import("exceljs");
  return ExcelJS;
}

async function loadPdfLibs() {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  return { jsPDF, autoTable };
}

function downloadExcelBuffer(buffer, fileName) {
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  window.URL.revokeObjectURL(url);
}

export function htmlToPlainText(input) {
  const raw = String(input || "").trim();
  if (!raw) return "";

  try {
    if (typeof window !== "undefined" && typeof DOMParser !== "undefined") {
      const doc = new DOMParser().parseFromString(raw, "text/html");
      const body = doc.body;

      body
        .querySelectorAll("br")
        .forEach((br) => br.replaceWith(doc.createTextNode("\n")));
      body.querySelectorAll("div,p,li").forEach((el) => {
        el.insertAdjacentText("beforeend", "\n");
      });

      return (body.textContent || "")
        .replace(/\u00a0/g, " ")
        .replace(/[ \t]+\n/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
    }
  } catch {
    // fall through
  }

  return raw
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\/\s*(div|p|li)\s*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function sliceEventsByRange(events, startId, endId) {
  const sortedEvts = [...(events || [])].sort((a, b) =>
    (a.fecha + a.hora_inicio).localeCompare(b.fecha + b.hora_inicio),
  );
  const startIndex = sortedEvts.findIndex(
    (e) => String(e.id) === String(startId),
  );
  const endIndex = sortedEvts.findIndex((e) => String(e.id) === String(endId));
  return sortedEvts.slice(startIndex, endIndex + 1);
}

function dayLabelFromEvt(evt) {
  if (!evt?.fecha) return "-";
  const dateObj = new Date(evt.fecha + "T12:00:00");
  const label = format(dateObj, "EEEE, dd 'de' MMMM 'de' yyyy", {
    locale: es,
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function dayLabelFromDate(dateStr) {
  if (!dateStr) return "-";
  const dateObj = new Date(dateStr + "T12:00:00");
  const label = format(dateObj, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: es });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function drawLocacionLocalidadCell(doc, data) {
  if (data.section !== "body" || data.column.index !== 2) return;
  if (!data.cell?.raw || typeof data.cell.raw !== "string") return;
  if (data.cell.raw.includes("colSpan")) return;

  const [loc = "", localidad = ""] = String(data.cell.raw).split("\n");
  const maxWidth =
    data.cell.width - data.cell.padding("left") - data.cell.padding("right");
  const fontSize = data.cell.styles.fontSize || 9;
  const scaleFactor = doc.internal?.scaleFactor || 1;
  const lhFactor = data.cell.styles.lineHeight || 1.15;
  const lineHeight = (fontSize / scaleFactor) * lhFactor;
  const textPos = data.cell.textPos || {
    x: data.cell.x + data.cell.padding("left"),
    y: data.cell.y + data.cell.padding("top") + lineHeight,
  };

  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(fontSize);
  const locLines = doc.splitTextToSize(loc, maxWidth);
  locLines.forEach((line, idx) => {
    doc.text(line, textPos.x, textPos.y + lineHeight * idx);
  });

  doc.setFont("helvetica", "italic");
  const localidadLines = doc.splitTextToSize(localidad, maxWidth);
  const localityStartIdx = Math.max(1, locLines.length);
  localidadLines.forEach((line, idx) => {
    doc.text(line, textPos.x, textPos.y + lineHeight * (localityStartIdx + idx));
  });
  doc.setFont("helvetica", "normal");
}

function buildPassengerExportRows(passengers) {
  return (passengers || []).map((p) => {
    const birthDate = p.fecha_nac ? new Date(p.fecha_nac) : new Date();
    const age = differenceInYears(new Date(), birthDate);
    const isMinor = age < 18;
    let formattedDate = "";
    if (p.fecha_nac) {
      const d = new Date(p.fecha_nac);
      d.setMinutes(d.getMinutes() + d.getTimezoneOffset());
      formattedDate = format(d, "dd/MMM/yyyy", { locale: es }).toLowerCase();
    }
    return {
      apellido: p.apellido?.toUpperCase() || "",
      nombre: p.nombre?.toUpperCase() || "",
      tipo_documento: "DNI",
      numero_documento: p.dni || "",
      sexo: p.genero || "",
      menor: isMinor ? 1 : 0,
      ocupa_butaca: isMinor ? "NO" : "SÍ",
      nacionalidad: p.nacionalidad || "Argentina",
      fecha_nacimiento: formattedDate,
    };
  });
}

export async function downloadStyledExcel(
  passengers,
  fileName = "Lista_Pasajeros.xlsx",
) {
  if (!passengers || passengers.length === 0) {
    return alert("No hay pasajeros para exportar.");
  }

  const ExcelJS = await loadExcelJS();
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Pasajeros");

  worksheet.columns = [
    { header: "APELLIDO", key: "apellido", width: 25 },
    { header: "NOMBRE", key: "nombre", width: 25 },
    { header: "DOC. TIPO", key: "tipo_documento", width: 12 },
    { header: "NÚMERO", key: "numero_documento", width: 18 },
    { header: "SEXO", key: "sexo", width: 10 },
    { header: "MENOR", key: "menor", width: 10 },
    { header: "BUTACA", key: "ocupa_butaca", width: 12 },
    { header: "NACIONALIDAD", key: "nacionalidad", width: 18 },
    { header: "FECHA NAC.", key: "fecha_nacimiento", width: 15 },
  ];

  worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  worksheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF2E7D32" },
  };
  worksheet.getRow(1).alignment = { horizontal: "center", vertical: "middle" };

  buildPassengerExportRows(passengers).forEach((row) => {
    worksheet.addRow(row);
  });

  worksheet.eachRow((row) => {
    row.eachCell((cell) => {
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  downloadExcelBuffer(buffer, fileName);
}

export async function downloadStyledPdf(
  passengers,
  fileName = "Lista_Pasajeros.pdf",
) {
  if (!passengers || passengers.length === 0) {
    return alert("No hay pasajeros para exportar.");
  }

  const { jsPDF, autoTable } = await loadPdfLibs();
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const rows = buildPassengerExportRows(passengers);
  const body = rows.map((r) => [
    r.apellido,
    r.nombre,
    r.tipo_documento,
    r.numero_documento,
    r.sexo,
    String(r.menor),
    r.ocupa_butaca,
    r.nacionalidad,
    r.fecha_nacimiento,
  ]);

  autoTable(doc, {
    startY: 10,
    head: [
      [
        "APELLIDO",
        "NOMBRE",
        "DOC. TIPO",
        "NÚMERO",
        "SEXO",
        "MENOR",
        "BUTACA",
        "NACIONALIDAD",
        "FECHA NAC.",
      ],
    ],
    body,
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 8,
      cellPadding: 1.8,
      halign: "center",
      valign: "middle",
      overflow: "linebreak",
    },
    headStyles: {
      fillColor: [46, 125, 50],
      textColor: 255,
      fontStyle: "bold",
      fontSize: 7,
    },
    margin: { left: 8, right: 8 },
  });

  const pdfName = fileName.endsWith(".pdf")
    ? fileName
    : `${String(fileName).replace(/\.xlsx$/i, "")}.pdf`;
  doc.save(pdfName);
}

export async function downloadStyledPassengers(
  passengers,
  fileName,
  exportFormat = "pdf",
) {
  if (exportFormat === "excel") {
    const excelName = fileName.endsWith(".xlsx")
      ? fileName
      : `${String(fileName).replace(/\.pdf$/i, "")}.xlsx`;
    return downloadStyledExcel(passengers, excelName);
  }
  return downloadStyledPdf(passengers, fileName);
}

export async function generateStopsOnlyPdf(
  transportName,
  events,
  startId,
  endId,
) {
  const activeEvents = sliceEventsByRange(events, startId, endId);
  const { jsPDF, autoTable } = await loadPdfLibs();
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const title = transportName || "Transporte";

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(title, 105, 14, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Cronograma de paradas", 105, 19, { align: "center" });

  const body = [];
  let lastDayKey = null;
  activeEvents.forEach((evt) => {
    const dayKey = evt?.fecha || "";
    if (dayKey !== lastDayKey) {
      body.push([
        {
          content: dayLabelFromEvt(evt),
          colSpan: 4,
          styles: {
            fillColor: [49, 46, 129],
            textColor: 255,
            fontStyle: "bold",
            halign: "center",
            valign: "middle",
          },
        },
      ]);
      lastDayKey = dayKey;
    }

    const hora = evt.hora_inicio ? evt.hora_inicio.slice(0, 5) : "--:--";
    const nota = htmlToPlainText(evt.descripcion);
    const locacion = (evt.locaciones?.nombre || "-").trim();
    const localidad = (evt.locaciones?.localidades?.localidad || "-").trim();
    const direccion = (evt.locaciones?.direccion || "-").trim();

    body.push([
      `${dayLabelFromEvt(evt)}\n${hora} hs.`,
      nota || "",
      `${locacion}\n${localidad}`,
      direccion,
    ]);
  });

  autoTable(doc, {
    startY: 24,
    head: [["Día\nHora", "Nota", "Locación\nLocalidad", "Dirección"]],
    body,
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 10,
      cellPadding: 2.2,
      overflow: "linebreak",
      valign: "top",
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [79, 70, 229],
      textColor: 255,
      fontStyle: "bold",
      halign: "center",
      valign: "middle",
    },
    columnStyles: {
      0: { cellWidth: 32, halign: "center" },
      1: { cellWidth: 76 },
      2: { cellWidth: 38 },
      3: { cellWidth: 40 },
    },
    margin: { left: 8, right: 8 },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 2) {
        data.cell.styles.fontSize = 9;
        data.cell.styles.textColor = [255, 255, 255];
      }
    },
    didDrawCell: (data) => drawLocacionLocalidadCell(doc, data),
  });

  doc.save(`Cronograma_Paradas_${title}.pdf`);
}

export async function generateStopsOnlyExcel(
  transportName,
  events,
  startId,
  endId,
) {
  const activeEvents = sliceEventsByRange(events, startId, endId);
  const ExcelJS = await loadExcelJS();
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Hoja de Paradas");
  worksheet.pageSetup = {
    paperSize: 9,
    orientation: "portrait",
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    horizontalCentered: true,
    margins: {
      left: 0.35,
      right: 0.35,
      top: 0.5,
      bottom: 0.5,
      header: 0.2,
      footer: 0.2,
    },
  };

  worksheet.columns = [
    { header: "DÍA\nHORA", key: "dia_hora", width: 20 },
    { header: "Nota", key: "nota", width: 45 },
    { header: "Locación\nLocalidad", key: "loc_localidad", width: 34 },
    { header: "Dirección", key: "direccion", width: 42 },
  ];

  worksheet.insertRow(1, []);
  const titleCell = worksheet.getCell(1, 1);
  titleCell.value = transportName || "Transporte";
  worksheet.mergeCells(1, 1, 1, worksheet.columnCount);
  worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" }, size: 13 };
  worksheet.getRow(1).alignment = { vertical: "middle", horizontal: "center" };
  worksheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF312E81" },
  };
  worksheet.getRow(1).height = 24;

  worksheet.getRow(2).font = { bold: true, color: { argb: "FFFFFFFF" }, size: 13 };
  worksheet.getRow(2).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF4F46E5" },
  };
  worksheet.getRow(2).alignment = {
    vertical: "middle",
    horizontal: "center",
    wrapText: true,
  };
  worksheet.getRow(2).height = 32;

  const addDaySeparatorRow = (label) => {
    const sepRow = worksheet.addRow({ dia_hora: label });
    worksheet.mergeCells(sepRow.number, 1, sepRow.number, worksheet.columnCount);
    sepRow.height = 34;
    const cell = sepRow.getCell(1);
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 13 };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF312E81" },
    };
    cell.alignment = {
      vertical: "middle",
      horizontal: "center",
      wrapText: true,
    };
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
  };

  let lastDayKey = null;
  activeEvents.forEach((evt) => {
    const dayKey = evt?.fecha || "";
    if (dayKey !== lastDayKey) {
      addDaySeparatorRow(dayLabelFromEvt(evt));
      lastDayKey = dayKey;
    }

    const hora = evt.hora_inicio ? evt.hora_inicio.slice(0, 5) : "--:--";
    const nota = htmlToPlainText(evt.descripcion);
    const locacion = (evt.locaciones?.nombre || "-").trim();
    const localidad = (evt.locaciones?.localidades?.localidad || "-").trim();
    const direccion = (evt.locaciones?.direccion || "-").trim();

    const row = worksheet.addRow({
      dia_hora: `${dayLabelFromEvt(evt)}\n${hora} hs.`,
      nota,
      loc_localidad: {
        richText: [
          { text: locacion, font: { size: 13 } },
          { text: "\n" },
          { text: localidad, font: { size: 13, italic: true } },
        ],
      },
      direccion,
    });

    const getCellText = (value) => {
      if (!value) return "";
      if (typeof value === "object" && Array.isArray(value.richText)) {
        return value.richText.map((t) => t.text || "").join("");
      }
      return String(value);
    };
    const getCellFontSize = (cell) => {
      const v = cell?.value;
      if (v && typeof v === "object" && Array.isArray(v.richText)) {
        const sizes = v.richText
          .map((t) => t?.font?.size)
          .filter((s) => typeof s === "number" && !Number.isNaN(s));
        return sizes.length ? Math.max(...sizes) : 13;
      }
      return cell?.font?.size || 13;
    };
    const estimateWrappedLines = (text, colWidth) => {
      const width = Math.max(8, Number(colWidth) || 20);
      const perLine = Math.max(6, Math.floor(width * 0.68) - 1);
      const segments = String(text || "").split("\n");
      return segments.reduce((acc, seg) => {
        const segLen = seg.trim().length;
        return acc + Math.max(1, Math.ceil(segLen / perLine));
      }, 0);
    };
    const estimateCellHeight = (cell, colWidth) => {
      const text = getCellText(cell.value);
      const fontSize = getCellFontSize(cell);
      const lines = estimateWrappedLines(text, colWidth);
      const lineHeight = Math.max(16, Math.round(fontSize * 1.6));
      const base = lines * lineHeight + 12;
      return Math.ceil(base * 1.15);
    };

    let maxHeight = 20;
    for (let c = 1; c <= worksheet.columnCount; c += 1) {
      const cell = row.getCell(c);
      const colWidth = worksheet.getColumn(c).width;
      maxHeight = Math.max(maxHeight, estimateCellHeight(cell, colWidth));
    }
    row.height = maxHeight;
  });

  worksheet.eachRow((row, rowNumber) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };

      const isRichText =
        cell?.value &&
        typeof cell.value === "object" &&
        Array.isArray(cell.value.richText);
      if (!isRichText && !cell.font?.size) {
        cell.font = { ...(cell.font || {}), size: 13 };
      }

      if (rowNumber >= 3) {
        const isDiaHora = cell.col === 1;
        cell.alignment = {
          vertical: "top",
          horizontal: isDiaHora ? "center" : "left",
          wrapText: true,
        };
      }
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  downloadExcelBuffer(buffer, `Cronograma_Paradas_${transportName}.xlsx`);
}

function compactTransportLabel(fullName) {
  const raw = String(fullName || "").trim();
  if (!raw) return "Transporte";
  const parts = raw.split("-");
  if (parts.length < 2) return raw;
  const right = parts.slice(1).join("-").trim();
  return right || raw;
}

export function buildCombinedStopsExportRows({
  selectedTransportIds = [],
  transports = [],
  transportEvents = {},
}) {
  const rows = [];

  selectedTransportIds.forEach((tid) => {
    const t = transports.find((x) => String(x.id) === String(tid));
    const tName = t
      ? `${t.transportes?.nombre || "Transporte"}${t.detalle ? ` - ${t.detalle}` : ""}`
      : "Transporte";
    const evts = [...(transportEvents[tid] || [])].sort((a, b) =>
      (a.fecha + a.hora_inicio).localeCompare(b.fecha + b.hora_inicio),
    );
    evts.forEach((evt) => {
      rows.push({
        transporte: compactTransportLabel(tName),
        fecha: evt.fecha || "",
        hora: evt.hora_inicio ? evt.hora_inicio.slice(0, 5) : "",
        nota: htmlToPlainText(evt.descripcion || ""),
        locacion: evt.locaciones?.nombre || "",
        localidad: evt.locaciones?.localidades?.localidad || "",
        direccion: evt.locaciones?.direccion || "",
      });
    });
  });

  rows.sort((a, b) =>
    `${a.fecha}${a.hora}`.localeCompare(`${b.fecha}${b.hora}`),
  );

  return rows;
}

export async function exportCombinedStops({ rows, exportFormat, giraId }) {
  if (!rows?.length) {
    alert("No hay paradas para exportar.");
    return;
  }

  if (exportFormat === "excel") {
    const ExcelJS = await loadExcelJS();
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Paradas Combinadas");
    worksheet.pageSetup = {
      paperSize: 9,
      orientation: "portrait",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      horizontalCentered: true,
      margins: {
        left: 0.35,
        right: 0.35,
        top: 0.5,
        bottom: 0.5,
        header: 0.2,
        footer: 0.2,
      },
    };

    worksheet.columns = [
      { header: "DIA\nHORA", key: "dia_hora", width: 20 },
      { header: "Nota", key: "nota", width: 39 },
      { header: "Locacion\nLocalidad", key: "loc_localidad", width: 30 },
      { header: "Direccion", key: "direccion", width: 36 },
      { header: "Transp.", key: "transporte", width: 13 },
    ];

    worksheet.insertRow(1, []);
    const titleCell = worksheet.getCell(1, 1);
    titleCell.value = "Paradas Combinadas";
    worksheet.mergeCells(1, 1, 1, worksheet.columnCount);
    worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" }, size: 13 };
    worksheet.getRow(1).alignment = { vertical: "middle", horizontal: "center" };
    worksheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF312E81" },
    };
    worksheet.getRow(1).height = 24;

    worksheet.getRow(2).font = { bold: true, color: { argb: "FFFFFFFF" }, size: 12 };
    worksheet.getRow(2).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF4F46E5" },
    };
    worksheet.getRow(2).alignment = {
      vertical: "middle",
      horizontal: "center",
      wrapText: true,
    };
    worksheet.getRow(2).height = 30;

    let lastDayKey = null;
    rows.forEach((r) => {
      if (r.fecha !== lastDayKey) {
        const sepRow = worksheet.addRow({ transporte: dayLabelFromDate(r.fecha) });
        worksheet.mergeCells(sepRow.number, 1, sepRow.number, worksheet.columnCount);
        sepRow.height = 30;
        const cell = sepRow.getCell(1);
        cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 12 };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF312E81" },
        };
        cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
        lastDayKey = r.fecha;
      }
      const row = worksheet.addRow({
        dia_hora: `${dayLabelFromDate(r.fecha)}\n${r.hora || "--:--"} hs.`,
        nota: r.nota || "",
        loc_localidad: {
          richText: [
            { text: (r.locacion || "-").trim(), font: { size: 12 } },
            { text: "\n" },
            { text: (r.localidad || "-").trim(), font: { size: 12, italic: true } },
          ],
        },
        direccion: (r.direccion || "-").trim(),
        transporte: r.transporte,
      });
      row.getCell(5).font = { ...(row.getCell(5).font || {}), size: 8 };
    });

    worksheet.eachRow((row, rowNumber) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
        if (rowNumber >= 3) {
          cell.alignment = {
            vertical: "top",
            horizontal: cell.col === 1 ? "center" : "left",
            wrapText: true,
          };
        }
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    downloadExcelBuffer(buffer, `Paradas_Combinadas_Gira${giraId}.xlsx`);
    return;
  }

  const { jsPDF, autoTable } = await loadPdfLibs();
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Paradas Combinadas", 105, 14, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Cronograma de paradas", 105, 19, { align: "center" });

  const body = [];
  let lastDayKey = null;
  rows.forEach((r) => {
    if (r.fecha !== lastDayKey) {
      body.push([
        {
          content: dayLabelFromDate(r.fecha),
          colSpan: 5,
          styles: {
            fillColor: [49, 46, 129],
            textColor: 255,
            fontStyle: "bold",
            halign: "center",
            valign: "middle",
          },
        },
      ]);
      lastDayKey = r.fecha;
    }
    body.push([
      `${dayLabelFromDate(r.fecha)}\n${r.hora || "--:--"} hs.`,
      r.nota || "",
      `${(r.locacion || "-").trim()}\n${(r.localidad || "-").trim()}`,
      (r.direccion || "-").trim(),
      r.transporte || "",
    ]);
  });

  autoTable(doc, {
    startY: 24,
    head: [["Dia\nHora", "Nota", "Locacion\nLocalidad", "Direccion", "Transp."]],
    body,
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 10,
      cellPadding: 2.2,
      overflow: "linebreak",
      valign: "top",
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [79, 70, 229],
      textColor: 255,
      fontStyle: "bold",
      halign: "center",
      valign: "middle",
    },
    columnStyles: {
      0: { cellWidth: 29, halign: "center" },
      1: { cellWidth: 63 },
      2: { cellWidth: 36 },
      3: { cellWidth: 40 },
      4: { cellWidth: 14, fontSize: 7 },
    },
    margin: { left: 8, right: 8 },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 4) {
        data.cell.styles.fontSize = 7;
      }
      if (data.section === "body" && data.column.index === 2) {
        data.cell.styles.fontSize = 9;
        data.cell.styles.textColor = [255, 255, 255];
      }
    },
    didDrawCell: (data) => drawLocacionLocalidadCell(doc, data),
  });

  doc.save(`Paradas_Combinadas_Gira${giraId}.pdf`);
}
