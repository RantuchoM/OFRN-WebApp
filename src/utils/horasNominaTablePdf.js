import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

function createJsPdf(options) {
  const Ctor = typeof jsPDF === "function" ? jsPDF : jsPDF?.jsPDF || jsPDF?.default;
  return new Ctor(options);
}
import PizZip from "pizzip";
import { saveAs } from "file-saver";
import {
  HORAS_AREA_ORIGEN,
  HORAS_CONCEPTOS,
  HORAS_MESES,
  areaNominaSlice,
  buildHorasNominaRows,
  formatHorasNovedadCell,
  horasAreaFileToken,
  horasAreaLabel,
  listMonthRange,
  formatNovedadResumenLines,
  novedadDetalleLinesForArea,
  novedadResumenForArea,
} from "./horasNominaReport";

const MESES = HORAS_MESES;

/**
 * PDF de la tabla de nómina (mes seleccionado), estilo alineado a la vista web (slate / cyan novedad / totales).
 * @param {object} params
 * @param {Array} params.reportData filas del dashboard
 * @param {object} params.footerTotals totales pie (concepts, totalCult, totalEdu, totalOtros, totalGeneral)
 * @param {number} params.month 1–12
 * @param {number} params.year
 * @param {Array<{ id: string, label: string }>} params.mainConceptos columnas de conceptos (sin h_otros)
 */
export function downloadHorasNominaTablePdf({
  reportData,
  footerTotals,
  month,
  year,
  mainConceptos,
}) {
  if (!reportData?.length) {
    throw new Error("No hay filas para exportar.");
  }

  const doc = createJsPdf({ orientation: "portrait", unit: "mm", format: "a4" });
  const margin = 10;
  const pageW = doc.internal.pageSize.getWidth();
  /** Ancho interior (A4 210 mm − márgenes): la tabla ocupa todo */
  const innerW = pageW - margin * 2;
  const mesNombre = MESES[Math.max(0, Math.min(11, month - 1))] || "";
  const title = `Nómina Horas — ${mesNombre} ${year}`;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(30, 41, 59);
  doc.text(title, margin, 14);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`Generado: ${new Date().toLocaleString("es-AR")}`, margin, 19);

  const head = [
    [
      "Integrante",
      "Instrumento\nFamilia",
      "Ensambles",
      ...mainConceptos.map((c) => c.label),
      "Tot. Cult",
      "Tot. Edu",
      "Otros",
    ],
  ];

  const body = reportData.map((item) => {
    const ens =
      item.myEnsembles?.length > 0
        ? item.myEnsembles.map((e) => e.ensamble).join(", ")
        : "—";
    const inst = item.instrumentos?.nombre || "S/D";
    const fam = (item.instrumentos?.familia || "—").toUpperCase();
    const instFam = `${inst}\n${fam}`;
    return [
      `${item.apellido}, ${item.nombre}`,
      instFam,
      ens,
      ...mainConceptos.map((c) =>
        formatHorasNovedadCell(
          item.concepts?.[c.id],
          item.conceptDeltas?.[c.id],
          "—",
        ),
      ),
      formatHorasNovedadCell(item.totalCult, item.deltaCult, "0"),
      formatHorasNovedadCell(item.totalEdu, item.deltaEdu, "0"),
      formatHorasNovedadCell(
        item.concepts?.h_otros,
        item.conceptDeltas?.h_otros,
        "—",
      ),
    ];
  });

  const nCol = 3 + mainConceptos.length + 3;

  const footSub = [
    "Subtotales",
    "",
    "",
    ...mainConceptos.map((c) =>
      footerTotals.concepts[c.id] > 0 ? String(footerTotals.concepts[c.id]) : "—",
    ),
    String(footerTotals.totalCult),
    String(footerTotals.totalEdu),
    String(footerTotals.totalOtros),
  ];

  const footTotalLine = `Total general: (${footerTotals.totalCult} + ${footerTotals.totalEdu}) − ${footerTotals.totalOtros} (Otros) = ${footerTotals.totalGeneral} hs`;

  /** 0 nombre | 1 inst/fam | 2 ensambles | 3… conceptos | totales */
  const idxCult = 3 + mainConceptos.length;
  const idxEdu = idxCult + 1;
  const idxOtros = idxEdu + 1;

  /** Nombre más angosto; columna inst/fam estrecha; el resto a números */
  const nameColWidth = 48;
  const instFamColWidth = 20;
  const ensColWidth = 30;
  const numCount = mainConceptos.length + 3;
  const numColWidth =
    (innerW - nameColWidth - instFamColWidth - ensColWidth) / numCount;
  /** Cuerpo/pie numéricos; cabeceras más chicas para evitar saltos de línea en columnas angostas */
  const numFontSize = 9;
  const headFontSize = 5.5;
  const instFamFontSize = 6;

  const columnStyles = {
    0: { cellWidth: nameColWidth, halign: "left" },
    1: {
      cellWidth: instFamColWidth,
      halign: "left",
      fontSize: instFamFontSize,
      fontStyle: "normal",
    },
    2: { cellWidth: ensColWidth, halign: "left", fontSize: 7.5 },
  };
  for (let c = 3; c <= idxOtros; c += 1) {
    columnStyles[c] = {
      cellWidth: numColWidth,
      halign: "center",
      fontSize: numFontSize,
      fontStyle: "bold",
    };
  }
  columnStyles[idxCult].fillColor = [255, 247, 237];
  columnStyles[idxCult].textColor = [154, 52, 18];
  columnStyles[idxEdu].fillColor = [239, 246, 255];
  columnStyles[idxEdu].textColor = [29, 78, 216];
  columnStyles[idxOtros].fillColor = [241, 245, 249];
  columnStyles[idxOtros].textColor = [71, 85, 105];

  autoTable(doc, {
    startY: 22,
    tableWidth: innerW,
    margin: { left: margin, right: margin },
    head,
    body,
    foot: [
      footSub,
      [
        {
          content: footTotalLine,
          colSpan: nCol,
          styles: {
            fillColor: [30, 41, 59],
            textColor: [255, 255, 255],
            fontStyle: "bold",
            halign: "center",
            valign: "middle",
            fontSize: numFontSize,
          },
        },
      ],
    ],
    theme: "plain",
    styles: {
      fontSize: numFontSize,
      cellPadding: 1.1,
      lineColor: [226, 232, 240],
      lineWidth: 0.15,
      valign: "middle",
    },
    headStyles: {
      fillColor: [241, 245, 249],
      textColor: [71, 85, 105],
      fontStyle: "bold",
      fontSize: headFontSize,
      halign: "center",
      cellPadding: 0.65,
    },
    footStyles: {
      fillColor: [241, 245, 249],
      textColor: [71, 85, 105],
      fontStyle: "bold",
      fontSize: numFontSize,
    },
    columnStyles,
    didParseCell: (data) => {
      const { section, column, row } = data;
      if (section === "body" && column.index === 0) {
        data.cell.styles.fontSize = 11;
      }
      if (section === "head" && column.index === 0) {
        data.cell.styles.fontSize = 8.5;
      }
      if (section === "head" && column.index === 1) {
        data.cell.styles.fontSize = instFamFontSize;
        data.cell.styles.valign = "middle";
      }
      if (section === "head" && column.index === 2) {
        data.cell.styles.fontSize = headFontSize;
      }
      if (section === "body" && column.index === 1) {
        data.cell.styles.fontSize = instFamFontSize;
        data.cell.styles.fontStyle = "normal";
        data.cell.styles.valign = "middle";
      }
      if (section === "foot" && row.index === 0 && column.index === 0) {
        data.cell.styles.fontSize = 7.5;
      }
      if (section === "head" && row.index === 0) {
        if (column.index === idxCult) {
          data.cell.styles.fillColor = [255, 247, 237];
          data.cell.styles.textColor = [194, 65, 12];
        }
        if (column.index === idxEdu) {
          data.cell.styles.fillColor = [239, 246, 255];
          data.cell.styles.textColor = [37, 99, 235];
        }
        if (column.index === idxOtros) {
          data.cell.styles.fillColor = [226, 232, 240];
          data.cell.styles.textColor = [71, 85, 105];
        }
      }
      if (section === "body") {
        const item = reportData[row.index];
        if (item?.hasNews) {
          data.cell.styles.fillColor = [236, 254, 255];
          if (column.index === 0 || column.index === 1) {
            data.cell.styles.textColor = [14, 116, 144];
          }
        }
        if (column.index === idxCult) {
          data.cell.styles.fillColor = [255, 247, 237];
          data.cell.styles.textColor = [154, 52, 18];
          data.cell.styles.fontStyle = "bold";
        }
        if (column.index === idxEdu) {
          data.cell.styles.fillColor = [239, 246, 255];
          data.cell.styles.textColor = [29, 78, 216];
          data.cell.styles.fontStyle = "bold";
        }
        if (column.index === idxOtros) {
          data.cell.styles.fillColor = item?.hasNews ? [241, 245, 249] : [248, 250, 252];
        }
        if (column.index >= 3 && cellTextHasNovedad(data.cell)) {
          data.cell.styles.textColor = [14, 116, 144];
        }
      }
      if (section === "foot" && row.index === 0) {
        if (column.index === idxCult) {
          data.cell.styles.fillColor = [254, 243, 199];
          data.cell.styles.textColor = [154, 52, 18];
        }
        if (column.index === idxEdu) {
          data.cell.styles.fillColor = [219, 234, 254];
          data.cell.styles.textColor = [29, 78, 216];
        }
        if (column.index === idxOtros) {
          data.cell.styles.fillColor = [203, 213, 225];
          data.cell.styles.textColor = [30, 41, 59];
        }
      }
      /** Conceptos + totales: cuerpo/pie con numFontSize; cabecera con tipografía más chica */
      if (column.index >= 3 && column.index <= idxOtros) {
        if (section === "head") {
          data.cell.styles.fontSize = headFontSize;
          data.cell.styles.fontStyle = "bold";
        } else {
          data.cell.styles.fontSize = numFontSize;
          data.cell.styles.fontStyle = "bold";
        }
      }
    },
  });

  const fn = `Nomina_horas_${String(month).padStart(2, "0")}_${year}.pdf`;
  doc.save(fn);
}

function cellTextHasNovedad(cell) {
  const fromRaw =
    cell?.raw != null && typeof cell.raw !== "object" ? String(cell.raw) : "";
  const fromText = Array.isArray(cell?.text)
    ? cell.text.join("")
    : String(cell?.text || "");
  return /\([+-]\d+\)/.test(fromRaw || fromText);
}

function flowText(doc, text, y, margin, { size = 9, style = "normal", color = [51, 65, 85], gap = 4.2 } = {}) {
  const pageH = doc.internal.pageSize.getHeight();
  const pageW = doc.internal.pageSize.getWidth();
  const maxW = pageW - margin * 2;
  doc.setFont("helvetica", style);
  doc.setFontSize(size);
  doc.setTextColor(color[0], color[1], color[2]);
  const chunks = doc.splitTextToSize(String(text || ""), maxW);
  for (const chunk of chunks) {
    if (y + gap > pageH - margin) {
      doc.addPage();
      y = margin + 4;
    }
    doc.text(chunk, margin, y);
    y += gap;
  }
  return y;
}

function appendNovedadesDetalle(doc, lines, startY, margin, summaryLines = []) {
  const pageH = doc.internal.pageSize.getHeight();
  const pageW = doc.internal.pageSize.getWidth();
  const maxW = pageW - margin * 2;
  let y = (startY || margin) + 8;
  const ensure = (need) => {
    if (y + need > pageH - margin) {
      doc.addPage();
      y = margin;
    }
  };
  ensure(12);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text("Detalle de novedades", margin, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  const body = lines?.length ? lines : ["Sin novedades."];
  for (const line of body) {
    const chunks = doc.splitTextToSize(line, maxW);
    for (const chunk of chunks) {
      ensure(5);
      doc.text(chunk, margin, y);
      y += 4.4;
    }
  }
  if (summaryLines.length) {
    y += 2;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    for (const line of summaryLines) {
      const chunks = doc.splitTextToSize(line, maxW);
      for (const chunk of chunks) {
        ensure(5);
        doc.text(chunk, margin, y);
        y += 4.6;
      }
    }
  }
  return y;
}

function slicesForOrigen(rows, origen) {
  const slices = [];
  for (const row of rows || []) {
    const slice = areaNominaSlice(row, origen);
    if (!slice.visible) continue;
    slices.push({ row, slice });
  }
  return slices;
}

function monthHeading(month, year) {
  const mesNombre = MESES[Math.max(0, Math.min(11, month - 1))] || "";
  return `${mesNombre} ${year}`;
}

function rangePhrase(fromYear, fromMonth, toYear, toMonth) {
  const a = monthHeading(fromMonth, fromYear);
  const b = monthHeading(toMonth, toYear);
  if (a === b) return a;
  return `${a} a ${b}`;
}

function rangeFileToken(fromYear, fromMonth, toYear, toMonth) {
  if (fromYear === toYear && fromMonth === toMonth) {
    return `${String(fromMonth).padStart(2, "0")}_${fromYear}`;
  }
  return `${fromYear}-${String(fromMonth).padStart(2, "0")}_a_${toYear}-${String(toMonth).padStart(2, "0")}`;
}

/** Tabla de un origen. startY permite repetirla en el mismo PDF (varios meses o áreas). */
function renderAreaNominaTable(doc, { slices, origen, mainConceptos, startY, margin = 10 }) {
  const pageW = doc.internal.pageSize.getWidth();
  const innerW = pageW - margin * 2;
  const head = [
    [
      "Integrante",
      "Instrumento\nFamilia",
      "Ensambles",
      ...mainConceptos.map((c) => c.label),
      "Total",
      "Otros",
    ],
  ];
  const nCol = 3 + mainConceptos.length + 2;
  const idxTotal = 3 + mainConceptos.length;
  const idxOtros = idxTotal + 1;

  const body = slices.length
    ? slices.map(({ row, slice }) => {
        const ens =
          row.myEnsembles?.length > 0
            ? row.myEnsembles.map((e) => e.ensamble).join(", ")
            : "—";
        const inst = row.instrumentos?.nombre || "S/D";
        const fam = (row.instrumentos?.familia || "—").toUpperCase();
        const name = slice.isBaja
          ? `${row.apellido}, ${row.nombre}\nBAJA`
          : `${row.apellido}, ${row.nombre}`;
        return [
          name,
          `${inst}\n${fam}`,
          ens,
          ...mainConceptos.map((c) =>
            formatHorasNovedadCell(slice.concepts[c.id], slice.deltas[c.id], "—"),
          ),
          formatHorasNovedadCell(slice.total, slice.deltaTotal, "0"),
          formatHorasNovedadCell(slice.otros, slice.deltaOtros, "—"),
        ];
      })
    : [
        [
          {
            content: "Sin integrantes en la nómina de este mes.",
            colSpan: nCol,
            styles: {
              halign: "center",
              fontStyle: "italic",
              textColor: [100, 116, 139],
              fontSize: 9,
            },
          },
        ],
      ];

  const footerConcepts = {};
  for (const c of mainConceptos) footerConcepts[c.id] = 0;
  let totalSum = 0;
  let otrosSum = 0;
  for (const { slice } of slices) {
    for (const c of mainConceptos) {
      footerConcepts[c.id] += slice.concepts[c.id] || 0;
    }
    totalSum += slice.total || 0;
    otrosSum += slice.otros || 0;
  }
  const totalGeneral = totalSum - otrosSum;

  const footSub = [
    "Subtotales",
    "",
    "",
    ...mainConceptos.map((c) =>
      footerConcepts[c.id] > 0 ? String(footerConcepts[c.id]) : "—",
    ),
    String(totalSum),
    String(otrosSum),
  ];
  const footTotalLine = `Total general: ${totalSum} − ${otrosSum} (Otros) = ${totalGeneral} hs`;

  const isCult = origen === "CULTURA";
  const totalFill = isCult ? [255, 247, 237] : [239, 246, 255];
  const totalText = isCult ? [154, 52, 18] : [29, 78, 216];
  const totalHeadText = isCult ? [194, 65, 12] : [37, 99, 235];
  const totalFootFill = isCult ? [254, 243, 199] : [219, 234, 254];

  const nameColWidth = 52;
  const instFamColWidth = 28;
  const ensColWidth = 40;
  const numCount = mainConceptos.length + 2;
  const numColWidth = (innerW - nameColWidth - instFamColWidth - ensColWidth) / numCount;
  const numFontSize = 8;
  const headFontSize = 7;

  const columnStyles = {
    0: { cellWidth: nameColWidth, halign: "left" },
    1: { cellWidth: instFamColWidth, halign: "left", fontSize: 7 },
    2: { cellWidth: ensColWidth, halign: "left", fontSize: 7.5 },
  };
  for (let c = 3; c <= idxOtros; c += 1) {
    columnStyles[c] = {
      cellWidth: numColWidth,
      halign: "center",
      fontSize: numFontSize,
      fontStyle: "bold",
    };
  }
  columnStyles[idxTotal].fillColor = totalFill;
  columnStyles[idxTotal].textColor = totalText;
  columnStyles[idxOtros].fillColor = [241, 245, 249];
  columnStyles[idxOtros].textColor = [71, 85, 105];

  autoTable(doc, {
    startY,
    tableWidth: innerW,
    margin: { left: margin, right: margin },
    head,
    body,
    foot: [
      footSub,
      [
        {
          content: footTotalLine,
          colSpan: nCol,
          styles: {
            fillColor: [30, 41, 59],
            textColor: [255, 255, 255],
            fontStyle: "bold",
            halign: "center",
            fontSize: numFontSize,
          },
        },
      ],
    ],
    theme: "plain",
    styles: {
      fontSize: numFontSize,
      cellPadding: 1.2,
      lineColor: [226, 232, 240],
      lineWidth: 0.15,
      valign: "middle",
      overflow: "linebreak",
    },
    headStyles: {
      fillColor: [241, 245, 249],
      textColor: [71, 85, 105],
      fontStyle: "bold",
      fontSize: headFontSize,
      halign: "center",
    },
    footStyles: {
      fillColor: [241, 245, 249],
      textColor: [71, 85, 105],
      fontStyle: "bold",
      fontSize: numFontSize,
    },
    columnStyles,
    didParseCell: (data) => {
      const { section, column, row } = data;
      if (!slices.length) return;
      if (section === "head" && column.index === idxTotal) {
        data.cell.styles.fillColor = totalFill;
        data.cell.styles.textColor = totalHeadText;
      }
      if (section === "head" && column.index === idxOtros) {
        data.cell.styles.fillColor = [226, 232, 240];
      }
      if (section === "body") {
        const item = slices[row.index];
        const anyDelta = item?.slice
          ? Object.values(item.slice.deltas).some((d) => d)
          : false;
        if (anyDelta) {
          data.cell.styles.fillColor = [236, 254, 255];
        }
        if (column.index === idxTotal) {
          data.cell.styles.fillColor = totalFill;
          data.cell.styles.textColor = totalText;
          data.cell.styles.fontStyle = "bold";
        }
        if (column.index === idxOtros) {
          data.cell.styles.fillColor = [248, 250, 252];
        }
        if (column.index >= 3 && cellTextHasNovedad(data.cell)) {
          data.cell.styles.textColor = [14, 116, 144];
        }
      }
      if (section === "foot" && row.index === 0 && column.index === idxTotal) {
        data.cell.styles.fillColor = totalFootFill;
        data.cell.styles.textColor = totalText;
      }
    },
  });
}

function paintDocHeader(doc, { title, subtitle, margin = 10 }) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(30, 41, 59);
  doc.text(title, margin, 12);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`Generado: ${new Date().toLocaleString("es-AR")}`, margin, 17);
  doc.setFontSize(7.5);
  const pageW = doc.internal.pageSize.getWidth();
  const lines = doc.splitTextToSize(subtitle, pageW - margin * 2);
  doc.text(lines, margin, 21);
  return 21 + lines.length * 3.6 + 2;
}

/**
 * Un mes de un origen, con título de sección y detalle opcional debajo de esa tabla.
 * @returns {number} Y siguiente
 */
function appendAreaMonthBlock(doc, {
  rows,
  origen,
  mainConceptos,
  includeDetalle,
  startY,
  heading,
  margin = 10,
}) {
  const pageH = doc.internal.pageSize.getHeight();
  let y = startY;
  if (y > pageH - 48) {
    doc.addPage();
    y = margin;
  }
  if (heading) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59);
    doc.text(heading, margin, y);
    y += 4;
  }
  const slices = slicesForOrigen(rows, origen);
  renderAreaNominaTable(doc, {
    slices,
    origen,
    mainConceptos,
    startY: y,
    margin,
  });
  let after = doc.lastAutoTable?.finalY || y;
  if (includeDetalle) {
    const lines = novedadDetalleLinesForArea(
      slices.map((s) => s.row),
      origen,
      HORAS_CONCEPTOS,
    );
    after = appendNovedadesDetalle(
      doc,
      lines,
      after,
      margin,
      formatNovedadResumenLines(novedadResumenForArea(rows, origen)),
    );
  }
  return after + 8;
}

/**
 * PDF de un solo origen (Cultura o Educación) para un mes.
 * Es el archivo que entra en el ZIP de PDFs individuales.
 * @returns {{ blob: Blob, filename: string, doc: import("jspdf").jsPDF }}
 */
export function buildHorasAreaNominaPdf({
  rows,
  month,
  year,
  origen,
  mainConceptos,
  includeDetalle = true,
}) {
  const area = horasAreaLabel(origen);
  const slices = slicesForOrigen(rows, origen);

  const doc = createJsPdf({ orientation: "landscape", unit: "mm", format: "a4" });
  const margin = 10;
  const mesNombre = MESES[Math.max(0, Math.min(11, month - 1))] || "";
  const title = `Nómina Horas — ${area} — ${mesNombre} ${year}`;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(30, 41, 59);
  doc.text(title, margin, 12);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`Generado: ${new Date().toLocaleString("es-AR")}`, margin, 17);
  doc.setFontSize(7.5);
  doc.text(
    "Celda con novedad: horas vigentes (delta vs. mes anterior). Esta planilla es solo de " +
      area +
      ".",
    margin,
    21,
  );

  renderAreaNominaTable(doc, {
    slices,
    origen,
    mainConceptos,
    startY: 25,
    margin,
  });
  if (includeDetalle) {
    const lines = novedadDetalleLinesForArea(
      slices.map((s) => s.row),
      origen,
      HORAS_CONCEPTOS,
    );
    appendNovedadesDetalle(
      doc,
      lines,
      doc.lastAutoTable?.finalY || 25,
      margin,
      formatNovedadResumenLines(novedadResumenForArea(rows, origen)),
    );
  }

  const filename = `Nomina_horas_${horasAreaFileToken(origen)}_${String(month).padStart(2, "0")}_${year}.pdf`;
  const blob = doc.output("blob");
  return { blob, filename, doc };
}

function nominaZipFilename(fromYear, fromMonth, toYear, toMonth) {
  const same = fromYear === toYear && fromMonth === toMonth;
  if (same) {
    return `Nomina_horas_${String(fromMonth).padStart(2, "0")}_${fromYear}.zip`;
  }
  const a = `${fromYear}-${String(fromMonth).padStart(2, "0")}`;
  const b = `${toYear}-${String(toMonth).padStart(2, "0")}`;
  return `Nomina_horas_${a}_a_${b}.zip`;
}

/**
 * ZIP con un PDF por mes y por área (Cultura y Educación nunca van en el mismo archivo).
 * @returns {Promise<{ zipBlob: Blob, zipName: string, fileCount: number, filenames: string[] }>}
 */
export async function buildHorasNominaRangeZipBlob({
  musicians,
  allRecords,
  fromYear,
  fromMonth,
  toYear,
  toMonth,
  searchTerm = "",
  ensembleIds,
  includeDetalle = true,
  mainConceptos,
}) {
  const months = listMonthRange(fromYear, fromMonth, toYear, toMonth);
  if (!months.length) {
    throw new Error("El mes desde no puede ser posterior al mes hasta.");
  }
  const zip = new PizZip();
  const filenames = [];
  for (const { year, month } of months) {
    const rows = buildHorasNominaRows({
      musicians,
      allRecords,
      year,
      month,
      searchTerm,
      ensembleIds,
    });
    for (const origen of HORAS_AREA_ORIGEN) {
      const { blob, filename } = buildHorasAreaNominaPdf({
        rows,
        month,
        year,
        origen,
        mainConceptos,
        includeDetalle,
      });
      const buf = await blob.arrayBuffer();
      zip.file(filename, buf);
      filenames.push(filename);
    }
  }
  const zipBlob = zip.generate({ type: "blob", mimeType: "application/zip" });
  const zipName = nominaZipFilename(fromYear, fromMonth, toYear, toMonth);
  return { zipBlob, zipName, fileCount: filenames.length, filenames };
}

export async function downloadHorasNominaRangeZip(args) {
  const built = await buildHorasNominaRangeZipBlob(args);
  saveAs(built.zipBlob, built.zipName);
  return { fileCount: built.fileCount, zipName: built.zipName };
}

function rowsForMonth(args, year, month) {
  return buildHorasNominaRows({
    musicians: args.musicians,
    allRecords: args.allRecords,
    year,
    month,
    searchTerm: args.searchTerm || "",
    ensembleIds: args.ensembleIds,
  });
}

/**
 * Un PDF de un origen con todos los meses del rango, cada mes en su sección.
 */
export function buildHorasAreaRangePdf({
  fromYear,
  fromMonth,
  toYear,
  toMonth,
  origen,
  mainConceptos,
  includeDetalle = true,
  ...rest
}) {
  const months = listMonthRange(fromYear, fromMonth, toYear, toMonth);
  if (!months.length) {
    throw new Error("El mes desde no puede ser posterior al mes hasta.");
  }
  const doc = createJsPdf({ orientation: "landscape", unit: "mm", format: "a4" });
  const area = horasAreaLabel(origen);
  const phrase = rangePhrase(fromYear, fromMonth, toYear, toMonth);
  let y = paintDocHeader(doc, {
    title: `Nómina Horas — ${area} — ${phrase}`,
    subtitle:
      "Celda con novedad: horas vigentes (delta vs. mes anterior). Esta planilla es solo de " +
      area +
      ".",
  });
  const multi = months.length > 1;
  const margin = 10;
  months.forEach(({ year, month }, index) => {
    if (index > 0) {
      doc.addPage();
      y = margin + 4;
    }
    y = appendAreaMonthBlock(doc, {
      rows: rowsForMonth(rest, year, month),
      origen,
      mainConceptos,
      includeDetalle,
      startY: y,
      heading: multi ? monthHeading(month, year) : "",
    });
  });
  const filename = `Nomina_horas_${horasAreaFileToken(origen)}_${rangeFileToken(fromYear, fromMonth, toYear, toMonth)}.pdf`;
  return { blob: doc.output("blob"), filename, doc };
}

/**
 * Un solo PDF: cada mes tiene sección Cultura y sección Educación, rotuladas.
 */
export function buildHorasUnifiedRangePdf({
  fromYear,
  fromMonth,
  toYear,
  toMonth,
  mainConceptos,
  includeDetalle = true,
  ...rest
}) {
  const months = listMonthRange(fromYear, fromMonth, toYear, toMonth);
  if (!months.length) {
    throw new Error("El mes desde no puede ser posterior al mes hasta.");
  }
  const doc = createJsPdf({ orientation: "landscape", unit: "mm", format: "a4" });
  const phrase = rangePhrase(fromYear, fromMonth, toYear, toMonth);
  let y = paintDocHeader(doc, {
    title: `Nómina Horas — ${phrase}`,
    subtitle:
      "Celda con novedad: horas vigentes (delta vs. mes anterior). Cultura y Educación van en secciones separadas.",
  });
  const margin = 10;
  months.forEach(({ year, month }, index) => {
    if (index > 0) {
      doc.addPage();
      y = margin + 4;
    }
    const rows = rowsForMonth(rest, year, month);
    for (const origen of HORAS_AREA_ORIGEN) {
      y = appendAreaMonthBlock(doc, {
        rows,
        origen,
        mainConceptos,
        includeDetalle,
        startY: y,
        heading: `${horasAreaLabel(origen)} — ${monthHeading(month, year)}`,
      });
    }
  });
  const filename = `Nomina_horas_${rangeFileToken(fromYear, fromMonth, toYear, toMonth)}.pdf`;
  return { blob: doc.output("blob"), filename, doc };
}

const PDF_PAIR_DELAY_MS = 350;

function triggerBlobDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    a.remove();
    URL.revokeObjectURL(url);
  }, 1500);
}

/** Dos descargas de PDF sueltas, con una pausa para que el navegador no se trague la segunda. */
export async function downloadPdfPair(files) {
  for (let i = 0; i < files.length; i += 1) {
    if (i > 0) await new Promise((resolve) => setTimeout(resolve, PDF_PAIR_DELAY_MS));
    triggerBlobDownload(files[i].blob, files[i].filename);
  }
  return { fileCount: files.length, filenames: files.map((file) => file.filename) };
}

/** Dos PDF de grilla (Cultura y Educación), cada uno con el rango completo. Sin ZIP. */
export function buildHorasNominaConsolidatedPair(args) {
  const months = listMonthRange(args.fromYear, args.fromMonth, args.toYear, args.toMonth);
  if (!months.length) {
    throw new Error("El mes desde no puede ser posterior al mes hasta.");
  }
  return HORAS_AREA_ORIGEN.map((origen) => buildHorasAreaRangePdf({ ...args, origen }));
}

/**
 * PDF de novedades de un solo origen, mes tras mes, sin tabla.
 * El texto fluye: no hay salto de página forzado al cambiar de mes.
 */
export function buildHorasNovedadesAreaPdf({
  fromYear,
  fromMonth,
  toYear,
  toMonth,
  origen,
  ...rest
}) {
  const months = listMonthRange(fromYear, fromMonth, toYear, toMonth);
  if (!months.length) {
    throw new Error("El mes desde no puede ser posterior al mes hasta.");
  }
  const doc = createJsPdf({ orientation: "portrait", unit: "mm", format: "a4" });
  const margin = 14;
  const area = horasAreaLabel(origen);
  const phrase = rangePhrase(fromYear, fromMonth, toYear, toMonth);
  let y = paintDocHeader(doc, {
    title: `Novedades de horas — ${area} — ${phrase}`,
    subtitle: `Solo novedades de ${area}, sin listado. Alta, baja o cambio respecto del mes anterior.`,
    margin,
  });
  y = flowText(doc, area, y + 2, margin, {
    size: 11,
    style: "bold",
    color: origen === "CULTURA" ? [194, 65, 12] : [37, 99, 235],
    gap: 5,
  });
  for (const { year, month } of months) {
    const rows = rowsForMonth(rest, year, month);
    y = flowText(doc, monthHeading(month, year), y + 3, margin, {
      size: 12,
      style: "bold",
      color: [30, 41, 59],
      gap: 5.5,
    });
    const lines = novedadDetalleLinesForArea(rows, origen, HORAS_CONCEPTOS);
    const body = lines.length ? lines : ["Sin novedades."];
    for (const line of body) {
      y = flowText(doc, line, y, margin, {
        size: 9,
        style: lines.length ? "normal" : "italic",
        color: lines.length ? [51, 65, 85] : [100, 116, 139],
        gap: 4.4,
      });
    }
    const resumen = formatNovedadResumenLines(novedadResumenForArea(rows, origen));
    resumen.forEach((line, index) => {
      y = flowText(doc, line, index === 0 ? y + 2 : y, margin, {
        size: 9,
        style: "bold",
        color: [30, 41, 59],
        gap: 4.6,
      });
    });
  }
  const filename = `Nomina_horas_novedades_${horasAreaFileToken(origen)}_${rangeFileToken(fromYear, fromMonth, toYear, toMonth)}.pdf`;
  return { blob: doc.output("blob"), filename, doc };
}

/** Dos PDF de novedades (Cultura y Educación), nunca mezclados. Sin ZIP. */
export function buildHorasNovedadesPair(args) {
  const months = listMonthRange(args.fromYear, args.fromMonth, args.toYear, args.toMonth);
  if (!months.length) {
    throw new Error("El mes desde no puede ser posterior al mes hasta.");
  }
  return HORAS_AREA_ORIGEN.map((origen) => buildHorasNovedadesAreaPdf({ ...args, origen }));
}

export async function downloadHorasNominaNovedadesPdf(args) {
  return downloadPdfPair(buildHorasNovedadesPair(args));
}

export function downloadHorasNominaUnifiedPdf(args) {
  const built = buildHorasUnifiedRangePdf(args);
  saveAs(built.blob, built.filename);
  return { fileCount: 1, filename: built.filename, zipName: built.filename };
}

export async function downloadHorasNominaConsolidatedPdfs(args) {
  return downloadPdfPair(buildHorasNominaConsolidatedPair(args));
}

/**
 * `individuales` reutiliza el ZIP por mes y área.
 * `unico` descarga un PDF. `consolidados` y `novedades` disparan dos PDF sueltos.
 */
export async function downloadHorasNominaExport(args) {
  const mode = args?.mode || "individuales";
  if (mode === "unico") return downloadHorasNominaUnifiedPdf(args);
  if (mode === "consolidados") return downloadHorasNominaConsolidatedPdfs(args);
  if (mode === "novedades") return downloadHorasNominaNovedadesPdf(args);
  return downloadHorasNominaRangeZip(args);
}
