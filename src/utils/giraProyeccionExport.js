import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatDdMmYyyy } from "./dates";

/** Colores PDF alineados a PROGRAM_TYPES */
const PROGRAM_TIPO_PDF = {
  Sinfónico: {
    fill: [238, 242, 255],
    text: [67, 56, 202],
  },
  "Camerata Filarmónica": {
    fill: [253, 244, 255],
    text: [162, 28, 175],
  },
  Ensamble: {
    fill: [236, 253, 245],
    text: [4, 120, 87],
  },
  "Jazz Band": {
    fill: [255, 251, 235],
    text: [180, 83, 9],
  },
  Comisión: {
    fill: [224, 242, 254],
    text: [2, 132, 199],
  },
  default: {
    fill: [248, 250, 252],
    text: [71, 85, 105],
  },
};

function tipoPdfColors(tipo) {
  return PROGRAM_TIPO_PDF[tipo] || PROGRAM_TIPO_PDF.default;
}

function rgbToArgb([r, g, b]) {
  const hex = (n) =>
    Math.max(0, Math.min(255, Math.round(n)))
      .toString(16)
      .padStart(2, "0")
      .toUpperCase();
  return `FF${hex(r)}${hex(g)}${hex(b)}`;
}

function minutesLabel(totalMin) {
  const n = Math.max(0, Math.round(Number(totalMin) || 0));
  const h = Math.floor(n / 60);
  const m = n % 60;
  return `${h}h ${String(m).padStart(2, "0")}min`;
}

function stamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`;
}

/**
 * @param {object} opts
 * @param {Array} opts.rows — filas del sandbox (program, locs, est, hin, hfin, win, franja)
 * @param {Array} opts.demoras — filas gira_demoras_localidad (+ nombres)
 * @param {string} [opts.fechaDesde]
 * @param {string} [opts.fechaHasta]
 * @param {string} [opts.homeLabel]
 */
export async function exportProyeccionExcel({
  rows,
  demoras,
  fechaDesde,
  fechaHasta,
  homeLabel,
}) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "OFRN";
  wb.created = new Date();

  const ws = wb.addWorksheet("Proyección");
  ws.columns = [
    { header: "Gira", key: "gira", width: 36 },
    { header: "Tipo", key: "tipo", width: 18 },
    { header: "Localidades", key: "locs", width: 28 },
    { header: "Desde", key: "desde", width: 12 },
    { header: "Hasta", key: "hasta", width: 12 },
    { header: "Hinicio", key: "hin", width: 10 },
    { header: "Hfin", key: "hfin", width: 10 },
    { header: "Servicios", key: "serv", width: 10 },
    { header: "Origen serv.", key: "servSrc", width: 12 },
    { header: "PCV", key: "pcv", width: 8 },
    { header: "Franja PCV", key: "franja", width: 42 },
  ];

  for (const row of rows) {
    const p = row.program;
    const excelRow = ws.addRow({
      gira: p.nombre_gira || "",
      tipo: p.tipo || "",
      locs: row.locs || "",
      desde: formatDdMmYyyy(p.fecha_desde),
      hasta: formatDdMmYyyy(p.fecha_hasta || p.fecha_desde),
      hin: row.hin || "",
      hfin: row.hfin || "",
      serv: row.est?.value ?? "",
      servSrc:
        row.est?.source === "manual"
          ? "Manual"
          : row.est?.source === "eventos"
            ? "Eventos"
            : "Default",
      pcv: row.win ? Number(row.win.dias) : "",
      franja: row.franja || row.win?.nota || "",
    });
    const colors = tipoPdfColors(p.tipo);
    excelRow.eachCell((cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: rgbToArgb(colors.fill) },
      };
      cell.font = { color: { argb: rgbToArgb(colors.text) }, size: 10 };
      cell.alignment = { vertical: "middle", wrapText: true };
    });
  }

  const header = ws.getRow(1);
  header.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
  header.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1F2937" },
    };
  });

  const wsD = wb.addWorksheet("Demoras localidad");
  wsD.columns = [
    { header: "Origen (localía)", key: "origen", width: 22 },
    { header: "Destino", key: "destino", width: 22 },
    { header: "Minutos", key: "minutos", width: 10 },
    { header: "Duración", key: "duracion", width: 14 },
  ];
  for (const d of demoras || []) {
    wsD.addRow({
      origen: d.origen_nombre || d.id_localidad_origen,
      destino: d.destino_nombre || d.id_localidad_destino,
      minutos: Number(d.minutos) || 0,
      duracion: minutesLabel(d.minutos),
    });
  }
  wsD.getRow(1).font = { bold: true };

  const meta = wb.addWorksheet("Meta");
  meta.addRow(["Informe", "Proyección PCV Prestaciones"]);
  meta.addRow(["Desde", fechaDesde || ""]);
  meta.addRow(["Hasta", fechaHasta || ""]);
  meta.addRow(["Sede referencia", homeLabel || ""]);
  meta.addRow(["Generado", new Date().toISOString()]);

  const buffer = await wb.xlsx.writeBuffer();
  const name = `Proyeccion_PCV_${stamp()}`;
  saveAs(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    `${name}.xlsx`,
  );
}

/**
 * @param {object} opts — mismo shape que Excel
 */
export function exportProyeccionPdf({
  rows,
  demoras,
  fechaDesde,
  fechaHasta,
  homeLabel,
}) {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(30, 41, 59);
  doc.text("Proyección PCV — Prestaciones", 14, 12);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  const metaBits = [
    fechaDesde && fechaHasta
      ? `${formatDdMmYyyy(fechaDesde)} – ${formatDdMmYyyy(fechaHasta)}`
      : null,
    homeLabel ? `Casa: ${homeLabel}` : null,
  ].filter(Boolean);
  if (metaBits.length) doc.text(metaBits.join("  ·  "), 14, 17);

  const body = rows.map((row) => {
    const p = row.program;
    return [
      p.nombre_gira || "",
      p.tipo || "",
      row.locs || "—",
      `${formatDdMmYyyy(p.fecha_desde)} – ${formatDdMmYyyy(p.fecha_hasta || p.fecha_desde)}`,
      row.hin || "",
      row.hfin || "",
      String(row.est?.value ?? "—").replace(".", ","),
      row.win ? String(row.win.dias).replace(".", ",") : "—",
      row.franja || row.win?.nota || "",
    ];
  });

  autoTable(doc, {
    startY: 20,
    head: [
      [
        "Gira",
        "Tipo",
        "Localidades",
        "Fechas",
        "Hinicio",
        "Hfin",
        "Serv.",
        "PCV",
        "Franja",
      ],
    ],
    body,
    styles: { fontSize: 7, cellPadding: 1.4, valign: "middle" },
    headStyles: {
      fillColor: [31, 41, 55],
      textColor: 255,
      fontStyle: "bold",
      fontSize: 7,
    },
    didParseCell(data) {
      if (data.section !== "body") return;
      const row = rows[data.row.index];
      if (!row) return;
      const colors = tipoPdfColors(row.program?.tipo);
      data.cell.styles.fillColor = colors.fill;
      data.cell.styles.textColor = colors.text;
    },
    margin: { left: 10, right: 10 },
  });

  const afterGiras = doc.lastAutoTable?.finalY || 24;
  if (afterGiras > 170) doc.addPage();
  const demY = afterGiras > 170 ? 14 : afterGiras + 8;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text("Demoras localidad → localidad", 14, demY);

  autoTable(doc, {
    startY: demY + 3,
    head: [["Origen (localía)", "Destino", "Duración"]],
    body: (demoras || []).map((d) => [
      d.origen_nombre || String(d.id_localidad_origen),
      d.destino_nombre || String(d.id_localidad_destino),
      minutesLabel(d.minutos),
    ]),
    styles: { fontSize: 8, cellPadding: 1.6 },
    headStyles: {
      fillColor: [31, 41, 55],
      textColor: 255,
      fontStyle: "bold",
    },
    margin: { left: 10, right: 10 },
  });

  doc.save(`Proyeccion_PCV_${stamp()}.pdf`);
}
