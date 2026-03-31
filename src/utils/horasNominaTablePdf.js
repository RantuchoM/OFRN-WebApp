import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const MESES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

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

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
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
        item.concepts[c.id] > 0 ? String(item.concepts[c.id]) : "—",
      ),
      String(item.totalCult),
      String(item.totalEdu),
      item.concepts.h_otros > 0 ? String(item.concepts.h_otros) : "—",
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
