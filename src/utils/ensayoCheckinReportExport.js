import ExcelJS from "exceljs";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { saveAs } from "file-saver";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  eventColumnLabel,
  formatRegistradoHora,
  formatDistanciaSedeM,
  resolveCheckinDistanciaSedeM,
  buildEnsambleMatrixSections,
  llegadaTardanzaTier,
  TARDANZA_COLORS,
  GEO_LEJOS_COLOR,
  isCheckinGeoLejos,
} from "../services/ensayoCheckinReportService";

/** Líneas de encabezado para Excel (soporta unicode). */
function reportHeaderLines(desde, hasta, ensambleLabels, { includeGeo } = {}) {
  const gen = format(new Date(), "dd/MM/yyyy HH:mm", { locale: es });
  const lines = [
    "Orquesta Filarmónica de Río Negro — Asistencia a ensayos",
    `Período: ${desde} a ${hasta}`,
    `Ensambles: ${ensambleLabels.join(", ")}`,
    `Generado: ${gen}`,
  ];
  if (includeGeo) {
    lines.push(
      "Geolocalización: distancia a la sede del ensayo (naranja si más de 100 m).",
    );
  }
  lines.push(
    "Tardanza llegada: amarillo hasta 10 min | naranja hasta 15 min | rojo más de 15 min.",
  );
  return lines;
}

/** Encabezado compacto para PDF (Helvetica / WinAnsi: sin ≤ · — ni unicode raro). */
function drawPdfReportHeader(doc, { desde, hasta, ensambleLabels, includeGeo }) {
  const gen = format(new Date(), "dd/MM/yyyy HH:mm", { locale: es });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 14;
  let y = 12;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(30, 41, 59);
  doc.text("Asistencia a ensayos de ensamble", margin, y);
  y += 5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text("Orquesta Filarmonica de Rio Negro", margin, y);
  y += 4.5;

  const meta = [
    `Periodo: ${desde} a ${hasta}`,
    `Ensambles: ${(ensambleLabels || []).join(", ") || "-"}`,
    `Generado: ${gen}`,
  ].join("   |   ");
  doc.text(meta, margin, y, { maxWidth: pageW - margin * 2 });
  y += 6;

  // Leyenda de tardanza con cajas de color
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);
  doc.text("Tardanza (llegada):", margin, y);
  let x = margin + doc.getTextWidth("Tardanza (llegada): ") + 2;
  const chips = [
    { label: "hasta 10 min", rgb: TARDANZA_COLORS.yellow.rgb },
    { label: "hasta 15 min", rgb: TARDANZA_COLORS.orange.rgb },
    { label: "mas de 15 min", rgb: TARDANZA_COLORS.red.rgb },
  ];
  for (const chip of chips) {
    const tw = doc.getTextWidth(chip.label) + 4;
    doc.setFillColor(...chip.rgb);
    doc.setDrawColor(148, 163, 184);
    doc.roundedRect(x, y - 3.2, tw, 4.2, 0.6, 0.6, "FD");
    doc.setTextColor(30, 30, 30);
    doc.text(chip.label, x + 2, y);
    x += tw + 3;
  }
  y += 5;

  if (includeGeo) {
    doc.setTextColor(51, 65, 85);
    doc.text("Geo: distancia a la sede del ensayo.", margin, y);
    x = margin + doc.getTextWidth("Geo: distancia a la sede del ensayo. ") + 2;
    doc.setFillColor(...GEO_LEJOS_COLOR.rgb);
    doc.setDrawColor(148, 163, 184);
    const farLabel = "naranja: mas de 100 m";
    const tw = doc.getTextWidth(farLabel) + 4;
    doc.roundedRect(x, y - 3.2, tw, 4.2, 0.6, 0.6, "FD");
    doc.setTextColor(154, 52, 18);
    doc.setFont("helvetica", "bold");
    doc.text(farLabel, x + 2, y);
    doc.setFont("helvetica", "normal");
    y += 5;
  }

  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageW - margin, y);
  y += 5;

  doc.setTextColor(0, 0, 0);
  return y;
}

function personLabel(p) {
  return `${p.apellido || ""}, ${p.nombre || ""}`.trim();
}

/**
 * @param {Map<string, object>} checkinMap
 * @param {'llegada'|'salida'} field
 * @param {{ includeGeo?: boolean, evt?: object }} [opts]
 */
function cellHora(evt, personId, checkinMap, field = "llegada", opts = {}) {
  const c = checkinMap.get(`${evt.id}-${personId}`);
  if (!c) return "";
  const hora = formatRegistradoHora(
    field === "salida" ? c.salida_at : c.registrado_at,
  );
  if (!hora) return "";
  if (!opts.includeGeo) return hora;
  const dist = formatDistanciaSedeM(
    resolveCheckinDistanciaSedeM(c, evt, field),
  );
  return dist ? `${hora} (${dist})` : hora;
}

function applyLlegadaFill(excelCell, checkin, evt) {
  const tier = llegadaTardanzaTier(checkin, evt);
  if (tier === "yellow" || tier === "orange" || tier === "red") {
    excelCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: TARDANZA_COLORS[tier].argb },
    };
  }
}

function applyGeoFontIfLejos(excelCell, checkin, evt, field) {
  if (!isCheckinGeoLejos(checkin, evt, field)) return;
  excelCell.font = {
    ...(excelCell.font || {}),
    color: { argb: GEO_LEJOS_COLOR.argb },
    bold: true,
  };
}

function appendMatrizSectionToSheet(
  sheet,
  section,
  checkinMap,
  { startRow = 1, includeGeo = false } = {},
) {
  let row = startRow;
  const colCount = 2 + section.events.length * 2;
  const titleRow = sheet.getRow(row);
  titleRow.getCell(1).value =
    section.ensamble.ensamble || `Ensamble ${section.ensambleId}`;
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
    const base = 3 + idx * 2;
    headerRow.getCell(base).value = `${eventColumnLabel(evt)} — Llegada${
      includeGeo ? " (+dist.)" : ""
    }`;
    headerRow.getCell(base + 1).value = `${eventColumnLabel(evt)} — Salida${
      includeGeo ? " (+dist.)" : ""
    }`;
  });
  headerRow.font = { bold: true };
  headerRow.eachCell((cell) => {
    cell.alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: true,
    };
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
      const base = 3 + idx * 2;
      const chk = checkinMap.get(`${evt.id}-${p.id}`);
      const llegCell = dataRow.getCell(base);
      llegCell.value = cellHora(evt, p.id, checkinMap, "llegada", {
        includeGeo,
      });
      llegCell.alignment = { horizontal: "center", wrapText: true };
      applyLlegadaFill(llegCell, chk, evt);
      if (includeGeo) applyGeoFontIfLejos(llegCell, chk, evt, "llegada");

      const salCell = dataRow.getCell(base + 1);
      salCell.value = cellHora(evt, p.id, checkinMap, "salida", {
        includeGeo,
      });
      salCell.alignment = { horizontal: "center", wrapText: true };
      if (includeGeo) applyGeoFontIfLejos(salCell, chk, evt, "salida");
    });
    row += 1;
  }

  return row + 1;
}

function filterExportBase(params, ensambleId = null) {
  const {
    events,
    integrantes,
    checkinMap,
    desde,
    hasta,
    ensambles,
    includeGeo = false,
  } = params;
  let ens = ensambles || [];
  let evts = events || [];
  let ints = integrantes || [];
  if (ensambleId != null) {
    const eid = Number(ensambleId);
    ens = ens.filter((e) => Number(e.id) === eid);
    evts = evts.filter((evt) =>
      (evt.eventos_ensambles || []).some((ee) => Number(ee.id_ensamble) === eid),
    );
    ints = ints.filter((p) => p.ensambleIds?.has?.(eid));
  }
  const ensambleLabels =
    params.ensambleLabels?.length && ensambleId == null
      ? params.ensambleLabels
      : ens.map((e) => e.ensamble).filter(Boolean);
  return {
    events: evts,
    integrantes: ints,
    checkinMap,
    desde,
    hasta,
    ensambleLabels,
    ensambles: ens,
    includeGeo: !!includeGeo,
    ensambleId,
  };
}

export async function downloadEnsayoCheckinPorPersonaExcel(params) {
  const {
    events,
    integrantes,
    checkinMap,
    desde,
    hasta,
    ensambleLabels,
    includeGeo,
    ensambleId,
  } = filterExportBase(params, params.ensambleId);
  const wb = new ExcelJS.Workbook();
  const sheet = wb.addWorksheet("Por persona");
  reportHeaderLines(desde, hasta, ensambleLabels, { includeGeo }).forEach(
    (line) => sheet.addRow([line]),
  );
  sheet.addRow([]);
  const headers = [
    "Apellido",
    "Nombre",
    "Instrumento",
    "Ensamble(s)",
    "Fecha",
    "Hora ensayo",
    "Hora llegada",
    "Hora salida",
    "Sede",
  ];
  if (includeGeo) {
    headers.push("Dist. llegada", "Dist. salida");
  }
  sheet.addRow(headers);
  sheet.getRow(sheet.rowCount).font = { bold: true };

  for (const p of integrantes) {
    for (const evt of events) {
      const ensIds = (evt.eventos_ensambles || []).map((ee) =>
        Number(ee.id_ensamble),
      );
      if (!ensIds.some((eid) => p.ensambleIds?.has?.(eid))) continue;
      if (
        ensambleId != null &&
        !ensIds.includes(Number(ensambleId))
      ) {
        continue;
      }
      const ensNames = (evt.eventos_ensambles || [])
        .map((ee) => ee.ensambles?.ensamble)
        .filter(Boolean)
        .join(", ");
      const chk = checkinMap.get(`${evt.id}-${p.id}`);
      const rowVals = [
        p.apellido,
        p.nombre,
        p.instrumento,
        ensNames,
        evt.fecha,
        evt.hora_inicio?.slice(0, 5) || "",
        cellHora(evt, p.id, checkinMap, "llegada"),
        cellHora(evt, p.id, checkinMap, "salida"),
        evt.locaciones?.nombre || "",
      ];
      if (includeGeo) {
        rowVals.push(
          formatDistanciaSedeM(
            resolveCheckinDistanciaSedeM(chk, evt, "llegada"),
          ) || "",
          formatDistanciaSedeM(
            resolveCheckinDistanciaSedeM(chk, evt, "salida"),
          ) || "",
        );
      }
      sheet.addRow(rowVals);
      const dataRow = sheet.getRow(sheet.rowCount);
      applyLlegadaFill(dataRow.getCell(7), chk, evt);
      if (includeGeo) {
        applyGeoFontIfLejos(dataRow.getCell(10), chk, evt, "llegada");
        applyGeoFontIfLejos(dataRow.getCell(11), chk, evt, "salida");
      }
    }
  }

  const buf = await wb.xlsx.writeBuffer();
  const suffix = ensambleId != null ? `_ens${ensambleId}` : "";
  const geoSuffix = includeGeo ? "_geo" : "";
  saveAs(
    new Blob([buf], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    `asistencia_ensayos_persona_${desde}_${hasta}${suffix}${geoSuffix}.xlsx`,
  );
}

export function downloadEnsayoCheckinPorPersonaPdf(params) {
  const {
    events,
    integrantes,
    checkinMap,
    desde,
    hasta,
    ensambleLabels,
    includeGeo,
    ensambleId,
  } = filterExportBase(params, params.ensambleId);
  const doc = new jsPDF({ orientation: includeGeo ? "landscape" : "portrait" });
  const y = drawPdfReportHeader(doc, {
    desde,
    hasta,
    ensambleLabels,
    includeGeo,
  });
  const body = [];
  const meta = [];
  for (const p of integrantes) {
    for (const evt of events) {
      const ensIds = (evt.eventos_ensambles || []).map((ee) =>
        Number(ee.id_ensamble),
      );
      if (!ensIds.some((eid) => p.ensambleIds?.has?.(eid))) continue;
      if (
        ensambleId != null &&
        !ensIds.includes(Number(ensambleId))
      ) {
        continue;
      }
      const ensNames = (evt.eventos_ensambles || [])
        .map((ee) => ee.ensambles?.ensamble)
        .filter(Boolean)
        .join(", ");
      const chk = checkinMap.get(`${evt.id}-${p.id}`);
      const row = [
        personLabel(p),
        p.instrumento,
        ensNames,
        evt.fecha,
        evt.hora_inicio?.slice(0, 5) || "",
        cellHora(evt, p.id, checkinMap, "llegada", { includeGeo }),
        cellHora(evt, p.id, checkinMap, "salida", { includeGeo }),
        evt.locaciones?.nombre || "",
      ];
      body.push(row);
      meta.push({ chk, evt });
    }
  }
  autoTable(doc, {
    startY: y,
    head: [
      [
        "Integrante",
        "Instrumento",
        "Ensamble",
        "Fecha",
        "Hora ensayo",
        "Llegada",
        "Salida",
        "Sede",
      ],
    ],
    body,
    styles: { fontSize: 7 },
    headStyles: { fillColor: [79, 70, 229] },
    didParseCell(data) {
      if (data.section !== "body") return;
      const m = meta[data.row.index];
      if (!m) return;
      if (data.column.index === 5) {
        const tier = llegadaTardanzaTier(m.chk, m.evt);
        if (tier && TARDANZA_COLORS[tier]) {
          data.cell.styles.fillColor = TARDANZA_COLORS[tier].rgb;
          data.cell.styles.textColor = [30, 30, 30];
        }
      }
      if (includeGeo && (data.column.index === 5 || data.column.index === 6)) {
        const kind = data.column.index === 5 ? "llegada" : "salida";
        if (isCheckinGeoLejos(m.chk, m.evt, kind)) {
          data.cell.styles.textColor = GEO_LEJOS_COLOR.rgb;
          data.cell.styles.fontStyle = "bold";
        }
      }
    },
  });
  const suffix = ensambleId != null ? `_ens${ensambleId}` : "";
  const geoSuffix = includeGeo ? "_geo" : "";
  doc.save(
    `asistencia_ensayos_persona_${desde}_${hasta}${suffix}${geoSuffix}.pdf`,
  );
}

/** Matriz doble entrada: una sección por ensamble. */
export async function downloadEnsayoCheckinMatrizExcel(params) {
  const filtered = filterExportBase(params, params.ensambleId);
  const {
    events,
    integrantes,
    checkinMap,
    desde,
    hasta,
    ensambleLabels,
    ensambles,
    includeGeo,
    ensambleId,
  } = filtered;
  const sections = buildEnsambleMatrixSections(ensambles, events, integrantes);
  const wb = new ExcelJS.Workbook();
  const sheet = wb.addWorksheet("Matriz por ensamble");

  let row = 1;
  reportHeaderLines(desde, hasta, ensambleLabels, { includeGeo }).forEach(
    (line) => {
      sheet.getRow(row).getCell(1).value = line;
      row += 1;
    },
  );
  row += 1;

  for (let i = 0; i < sections.length; i++) {
    row = appendMatrizSectionToSheet(sheet, sections[i], checkinMap, {
      startRow: row,
      includeGeo,
    });
    if (i < sections.length - 1) row += 1;
  }

  const buf = await wb.xlsx.writeBuffer();
  const suffix = ensambleId != null ? `_ens${ensambleId}` : "";
  const geoSuffix = includeGeo ? "_geo" : "";
  saveAs(
    new Blob([buf], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    `asistencia_ensayos_matriz_${desde}_${hasta}${suffix}${geoSuffix}.xlsx`,
  );
}

export function downloadEnsayoCheckinMatrizPdf(params) {
  const filtered = filterExportBase(params, params.ensambleId);
  const {
    events,
    integrantes,
    checkinMap,
    desde,
    hasta,
    ensambleLabels,
    ensambles,
    includeGeo,
    ensambleId,
  } = filtered;
  const sections = buildEnsambleMatrixSections(ensambles, events, integrantes);
  const doc = new jsPDF({ orientation: "landscape" });
  let y = drawPdfReportHeader(doc, {
    desde,
    hasta,
    ensambleLabels,
    includeGeo,
  });
  let first = true;

  for (const section of sections) {
    if (!first && y > 160) {
      doc.addPage();
      y = 14;
    }
    first = false;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(49, 46, 129);
    doc.text(
      section.ensamble.ensamble || `Ensamble ${section.ensambleId}`,
      14,
      y,
    );
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
    y += 6;

    const headCols = ["Integrante", "Inst."];
    section.events.forEach((e) => {
      const label = eventColumnLabel(e);
      headCols.push(`${label} L`);
      headCols.push(`${label} S`);
    });

    const bodyMeta = [];
    const body = section.integrantes.map((p) => {
      const row = [personLabel(p), p.instrumento];
      const rowMeta = [];
      section.events.forEach((evt) => {
        const chk = checkinMap.get(`${evt.id}-${p.id}`);
        row.push(
          cellHora(evt, p.id, checkinMap, "llegada", { includeGeo }),
        );
        row.push(cellHora(evt, p.id, checkinMap, "salida", { includeGeo }));
        rowMeta.push({ chk, evt, field: "llegada" }, { chk, evt, field: "salida" });
      });
      bodyMeta.push(rowMeta);
      return row;
    });

    autoTable(doc, {
      startY: y,
      head: [headCols],
      body,
      styles: { fontSize: 6 },
      headStyles: { fillColor: [79, 70, 229] },
      margin: { left: 14 },
      didParseCell(data) {
        if (data.section !== "body") return;
        if (data.column.index < 2) return;
        const metaRow = bodyMeta[data.row.index];
        if (!metaRow) return;
        const m = metaRow[data.column.index - 2];
        if (!m) return;
        if (m.field === "llegada") {
          const tier = llegadaTardanzaTier(m.chk, m.evt);
          if (tier && TARDANZA_COLORS[tier]) {
            data.cell.styles.fillColor = TARDANZA_COLORS[tier].rgb;
            data.cell.styles.textColor = [30, 30, 30];
          }
        }
        if (includeGeo && isCheckinGeoLejos(m.chk, m.evt, m.field)) {
          data.cell.styles.textColor = GEO_LEJOS_COLOR.rgb;
          data.cell.styles.fontStyle = "bold";
        }
      },
    });
    y = doc.lastAutoTable.finalY + 10;
  }

  if (sections.length === 0) {
    doc.text("Sin datos para exportar", 14, y);
  }

  const suffix = ensambleId != null ? `_ens${ensambleId}` : "";
  const geoSuffix = includeGeo ? "_geo" : "";
  doc.save(
    `asistencia_ensayos_matriz_${desde}_${hasta}${suffix}${geoSuffix}.pdf`,
  );
}

/** @deprecated Usar downloadEnsayoCheckinMatrizExcel */
export async function downloadEnsayoCheckinMatrizPorEnsambleExcel(params) {
  return downloadEnsayoCheckinMatrizExcel(params);
}

/** @deprecated Usar downloadEnsayoCheckinMatrizPdf */
export function downloadEnsayoCheckinMatrizPorEnsamblePdf(params) {
  return downloadEnsayoCheckinMatrizPdf(params);
}
