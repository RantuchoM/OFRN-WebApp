import autoTable from "jspdf-autotable";
import { formatDdMmYyyy, formatDdMmYyyyWeekday, timeStringToMinutes } from "./dates";
import { stripHtml } from "./eventDisplayUtils";
import {
  PDF_BORDER,
  PDF_GROUP_FILL,
  PDF_HEAD_FILL,
  createServiciosPdfDoc,
  deliverPdf,
  pdfStamp,
  toServiciosPdfText,
} from "./serviciosPdf";
import { formatSecondsToHm } from "./time";

const RESOLVED_LABEL = {
  kept: "Se ensayó igual",
  deleted: "No se ensayó",
  rescheduled: "Otro día",
};

const PROGRAM_TIPO_PDF = {
  Sinfónico: {
    fill: [238, 242, 255],
    text: [67, 56, 202],
    border: [199, 210, 254],
  },
  "Camerata Filarmónica": {
    fill: [253, 244, 255],
    text: [162, 28, 175],
    border: [245, 208, 254],
  },
  Ensamble: {
    fill: [236, 253, 245],
    text: [4, 120, 87],
    border: [167, 243, 208],
  },
  "Jazz Band": {
    fill: [255, 251, 235],
    text: [180, 83, 9],
    border: [253, 230, 138],
  },
  default: {
    fill: [248, 250, 252],
    text: [71, 85, 105],
    border: [226, 232, 240],
  },
};

function horaSlice(value) {
  return value ? String(value).slice(0, 5) : "";
}

function horaRangeLabel(evt) {
  const a = horaSlice(evt?.hora_inicio);
  const b = horaSlice(evt?.hora_fin);
  if (!a && !b) return "";
  return b ? `${a}-${b}` : a;
}

function ensambleEventTitle(evt) {
  const tipo = stripHtml(evt?.tipos_evento?.nombre) || "Evento";
  const desc = stripHtml(evt?.descripcion);
  if (desc && desc.toLowerCase() !== tipo.toLowerCase()) return desc;
  return tipo;
}

function fechasProgramLabel(row) {
  const a = formatDdMmYyyy(row?.fechaDesde) || row?.fechaDesde || "";
  const b = formatDdMmYyyy(row?.fechaHasta) || row?.fechaHasta || "";
  if (!a) return "";
  if (b && b !== a) return `${a} - ${b}`;
  return a;
}

function formatPdfDuration(evt) {
  if (!evt?.hora_inicio || !evt?.hora_fin) return "";
  const start = timeStringToMinutes(evt.hora_inicio);
  const end = timeStringToMinutes(evt.hora_fin);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return "";
  let diff = end - start;
  if (diff < 0) diff += 24 * 60;
  return formatSecondsToHm(diff * 60);
}

/** Via Familia/CF/Excluido. ENSAMBLE se omite (el bloque ya es de giras). */
export function ensambleViaPdfLabel(row) {
  if (row?.via === "FAMILIA") {
    const extra = (row.familias || []).filter(Boolean).join(", ");
    return extra ? `Familia: ${extra}` : "Familia";
  }
  if (row?.via === "CF") {
    const extra = (row.cfNames || []).filter(Boolean).join(", ");
    return extra ? `CF: ${extra}` : "CF";
  }
  if (row?.via === "EXCL_ENSAMBLE") return "Excluido";
  return "";
}

function concertPdfRow(evt) {
  return {
    fecha: formatDdMmYyyy(evt?.fecha) || evt?.fecha || "-",
    desde: horaSlice(evt?.hora_inicio) || "-",
    hasta: horaSlice(evt?.hora_fin) || "-",
    locacion: stripHtml(evt?.locaciones?.nombre) || "Sin locación",
  };
}

function overlapGirasFromPeople(people) {
  const byKey = new Map();
  for (const person of people || []) {
    for (const g of person.giras || []) {
      const label = String(g?.label || "").trim();
      if (!label) continue;
      const id = g.program?.id;
      const key = id != null ? `id:${id}` : `label:${label}`;
      const prev = byKey.get(key);
      if (prev) prev.count += 1;
      else byKey.set(key, { id: id ?? null, label, count: 1 });
    }
  }
  return [...byKey.values()].sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return a.label.localeCompare(b.label, "es");
  });
}

function overlapGirasPdfLabel(conflicto) {
  const list = conflicto?.overlappingGiras?.length
    ? conflicto.overlappingGiras
    : overlapGirasFromPeople(conflicto?.people);
  return list.map((g) => g.label).filter(Boolean).join("; ");
}

function conflictoPdfRow({ event, conflicto }) {
  const dur = formatPdfDuration(event);
  const resolvedKind = conflicto?.resolvedKind;
  return {
    fecha: formatDdMmYyyyWeekday(event?.fecha) || event?.fecha || "",
    horario: horaRangeLabel(event),
    tipo: ensambleEventTitle(event),
    duracion: dur,
    giras: overlapGirasPdfLabel(conflicto),
    resolvedKind: resolvedKind || "",
    resolvedLabel: RESOLVED_LABEL[resolvedKind] || "",
  };
}

function familiaHintPdf(report) {
  if (!report) return "";
  const bits = [];
  if (report.storedFamilia) bits.push(`Familia ${report.storedFamilia}`);
  if (report.storedCfNames?.length) {
    bits.push(`CF ${report.storedCfNames.join(", ")}`);
  } else if (report.storedCfName) {
    bits.push(`CF ${report.storedCfName}`);
  }
  if (!bits.length) {
    return "Sin familia/CF en Ensambles: solo convocatoria directa de ensamble. Giras = Sinfónico y Camerata Filarmónica.";
  }
  return `${bits.join(" - ")}. EXCL_ENSAMBLE manda. Giras = Sinfónico y Camerata Filarmónica.`;
}

/**
 * Filas del PDF (misma jerarquía que el HTML).
 * `pendingRows` / `resolvedRows` salen del modal (incluye resueltos de sesión).
 */
export function buildEnsambleServiciosPdfTables(
  report,
  {
    fechaDesde,
    fechaHasta,
    pendingRows = [],
    resolvedRows = [],
    resolvedHeading = "",
  } = {},
) {
  if (!report) return null;

  const rango =
    fechaDesde && fechaHasta
      ? `${formatDdMmYyyy(fechaDesde)} - ${formatDdMmYyyy(fechaHasta)}`
      : "";
  const hintBits = [report.regionName, familiaHintPdf(report)].filter(Boolean);

  return {
    ensambleName: stripHtml(report.ensambleName) || "Informe de ensamble",
    rango,
    note: hintBits.join(". "),
    giras: {
      title: "Giras convocadas (Sinfónico y Camerata Filarmónica)",
      count: report.giras.length,
      empty: "Ninguna gira Sinfónico/CF lo convoca en este rango.",
      rows: (report.giras || []).map((row) => ({
        label: stripHtml(row.label) || `Programa ${row.id}`,
        fechas: fechasProgramLabel(row),
        tipo: row.tipo || "",
        via: ensambleViaPdfLabel(row),
      })),
    },
    programas: {
      title: "Programas y conciertos de ensamble",
      count:
        (report.programasPropios?.length || 0) +
        (report.conciertosSueltos?.length || 0),
      empty: "No hay programas propios ni conciertos vinculados.",
      blocks: [
        ...(report.programasPropios || []).map((row) => ({
          kind: "program",
          label: stripHtml(row.label) || `Programa ${row.id}`,
          fechas: fechasProgramLabel(row),
          conciertos: (row.conciertos || []).map(concertPdfRow),
        })),
        ...(report.conciertosSueltos || []).length
          ? [
              {
                kind: "sueltos",
                label: "Conciertos sueltos",
                fechas: "",
                conciertos: (report.conciertosSueltos || []).map(concertPdfRow),
              },
            ]
          : [],
      ],
    },
    ensayos: {
      title: "Ensayos de ensamble",
      count: report.ensayosTotal || 0,
      pendingExtra: pendingRows.length
        ? `${pendingRows.length} en conflicto`
        : "",
      empty: "No hay ensayos de este ensamble en el rango.",
      noneConflict: `${report.ensayosTotal || 0} ensayo${
        report.ensayosTotal === 1 ? "" : "s"
      }. Ninguno en conflicto.`,
      pending: pendingRows.map(conflictoPdfRow),
      resolvedHeading: resolvedRows.length ? resolvedHeading || "Resueltos" : "",
      resolved: resolvedRows.map(conflictoPdfRow),
    },
    excluded: {
      title: "Excluidos en el programa (no cuentan)",
      count: report.excluded?.length || 0,
      rows: (report.excluded || []).map((row) => ({
        label: stripHtml(row.label) || `Programa ${row.id}`,
        fechas: fechasProgramLabel(row),
        tipo: row.tipo || "",
        via: ensambleViaPdfLabel(row),
      })),
    },
  };
}

function slugEnsamblePdf(name) {
  const raw = String(name || "").trim() || "ensamble";
  return (
    raw
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9_-]+/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "")
      .slice(0, 48) || "ensamble"
  );
}

function ensamblePdfEnsureSpace(doc, y, needed = 22) {
  const pageH = doc.internal.pageSize.getHeight();
  if (y + needed > pageH - 14) {
    doc.addPage("a4", "portrait");
    return 14;
  }
  return y;
}

function writeEnsamblePdfSectionTitle(doc, y, title, count, extra = "") {
  const nextY = ensamblePdfEnsureSpace(doc, y, 14);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  const t = toServiciosPdfText(title);
  doc.text(t, 12, nextY);
  const tw = doc.getTextWidth(t) + 2.2;
  doc.setFontSize(13);
  doc.setTextColor(79, 70, 229);
  const c = String(count ?? 0);
  doc.text(c, 12 + tw, nextY);
  if (extra) {
    const cw = doc.getTextWidth(c) + 2.8;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(180, 83, 9);
    doc.text(toServiciosPdfText(extra), 12 + tw + cw, nextY);
  }
  doc.setTextColor(0);
  return nextY + 3;
}

const ENSAMBLE_PDF_TABLE = {
  theme: "grid",
  styles: {
    fontSize: 8,
    cellPadding: 1.4,
    overflow: "linebreak",
    lineWidth: 0.15,
    lineColor: PDF_BORDER,
    valign: "middle",
    halign: "left",
  },
  headStyles: {
    fillColor: PDF_HEAD_FILL,
    textColor: [30, 41, 59],
    fontStyle: "bold",
    lineWidth: 0.15,
    lineColor: PDF_BORDER,
    halign: "center",
  },
  margin: { left: 12, right: 12 },
  tableWidth: "auto",
  showHead: "everyPage",
};

function ensamblePdfAfterTable(doc, fallbackY) {
  return (doc.lastAutoTable?.finalY || fallbackY) + 7;
}

function writeEnsamblePdfEmpty(doc, y, message) {
  const nextY = ensamblePdfEnsureSpace(doc, y, 10);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(toServiciosPdfText(message), 12, nextY, { maxWidth: 186 });
  doc.setTextColor(0);
  return nextY + 8;
}

function drawEnsambleGirasTable(doc, startY, section) {
  if (!section.rows.length) {
    return writeEnsamblePdfEmpty(doc, startY, section.empty);
  }
  autoTable(doc, {
    ...ENSAMBLE_PDF_TABLE,
    startY,
    head: [["Programa", "Fechas", "Tipo", "Vía"]],
    body: section.rows.map((row) => [
      toServiciosPdfText(row.label),
      toServiciosPdfText(row.fechas),
      toServiciosPdfText(row.tipo),
      toServiciosPdfText(row.via),
    ]),
    columnStyles: {
      0: { cellWidth: 78 },
      1: { cellWidth: 40 },
      2: { cellWidth: 38 },
      3: { cellWidth: 30 },
    },
    didParseCell: (data) => {
      if (data.section !== "body" || data.column.index !== 2) return;
      const tipo = section.rows[data.row.index]?.tipo;
      if (!tipo) return;
      const colors = PROGRAM_TIPO_PDF[tipo] || PROGRAM_TIPO_PDF.default;
      data.cell.styles.fillColor = colors.fill;
      data.cell.styles.textColor = colors.text;
      data.cell.styles.fontStyle = "bold";
    },
  });
  return ensamblePdfAfterTable(doc, startY);
}

function drawEnsambleProgramasTable(doc, startY, section) {
  if (!section.blocks.length) {
    return writeEnsamblePdfEmpty(doc, startY, section.empty);
  }
  const body = [];
  for (const block of section.blocks) {
    const title = block.fechas ? `${block.label}  ${block.fechas}` : block.label;
    body.push([
      {
        content: toServiciosPdfText(title),
        colSpan: 4,
        styles: {
          fillColor: PDF_GROUP_FILL,
          fontStyle: "bold",
          halign: "left",
        },
      },
    ]);
    if (!block.conciertos?.length) {
      body.push(["", "", "", toServiciosPdfText("Sin conciertos anidados.")]);
      continue;
    }
    for (const conc of block.conciertos) {
      body.push([
        toServiciosPdfText(conc.fecha),
        toServiciosPdfText(conc.desde, { padHyphen: false }),
        toServiciosPdfText(conc.hasta, { padHyphen: false }),
        toServiciosPdfText(conc.locacion),
      ]);
    }
  }
  autoTable(doc, {
    ...ENSAMBLE_PDF_TABLE,
    startY,
    head: [["Fecha", "Desde", "Hasta", "Locación"]],
    body,
    columnStyles: {
      0: { cellWidth: 28 },
      1: { cellWidth: 22 },
      2: { cellWidth: 22 },
      3: { cellWidth: 114 },
    },
  });
  return ensamblePdfAfterTable(doc, startY);
}

function drawEnsambleEnsayosTable(doc, startY, section) {
  const hasRows = section.pending.length || section.resolved.length;
  if (!hasRows) {
    return writeEnsamblePdfEmpty(
      doc,
      startY,
      section.count ? section.noneConflict : section.empty,
    );
  }
  const body = [];
  const pushRow = (row) => {
    const tipo = row.resolvedLabel
      ? `${row.tipo} (${row.resolvedLabel})`
      : row.tipo;
    body.push([
      toServiciosPdfText(row.fecha),
      toServiciosPdfText(row.horario, { padHyphen: false }),
      toServiciosPdfText(tipo),
      toServiciosPdfText(row.duracion || "-", { padHyphen: false }),
      toServiciosPdfText(row.giras),
    ]);
  };
  for (const row of section.pending) pushRow(row);
  if (section.resolved.length) {
    body.push([
      {
        content: toServiciosPdfText(section.resolvedHeading || "Resueltos"),
        colSpan: 5,
        styles: {
          fillColor: [236, 253, 245],
          textColor: [6, 95, 70],
          fontStyle: "bold",
          halign: "left",
        },
      },
    ]);
    for (const row of section.resolved) pushRow(row);
  }
  autoTable(doc, {
    ...ENSAMBLE_PDF_TABLE,
    startY,
    head: [["Fecha", "Horario", "Tipo", "Dur.", "Giras en conflicto"]],
    body,
    columnStyles: {
      0: { cellWidth: 42 },
      1: { cellWidth: 22 },
      2: { cellWidth: 46 },
      3: { cellWidth: 18, halign: "center" },
      4: { cellWidth: 58 },
    },
  });
  return ensamblePdfAfterTable(doc, startY);
}

/**
 * PDF del informe de un ensamble (misma jerarquía que el modal HTML).
 * A4 vertical, Helvetica, texto saneado (sin flechas Unicode).
 */
export function buildEnsambleServiciosPdfDoc(args = {}) {
  const tables = buildEnsambleServiciosPdfTables(args.report, args);
  if (!tables) return null;

  const doc = createServiciosPdfDoc();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(0);
  doc.text(toServiciosPdfText(tables.ensambleName), 12, 12);

  const subParts = [
    tables.rango,
    tables.note,
    `Generado ${new Date().toLocaleString("es-AR")}`,
  ].filter(Boolean);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100);
  const subLines = doc.splitTextToSize(
    toServiciosPdfText(subParts.join(" - ")),
    186,
  );
  doc.text(subLines, 12, 17, { maxWidth: 186 });
  doc.setTextColor(0);

  let y = 17 + (Array.isArray(subLines) ? subLines.length : 1) * 3.6 + 5;

  y = writeEnsamblePdfSectionTitle(doc, y, tables.giras.title, tables.giras.count);
  y = drawEnsambleGirasTable(doc, y, tables.giras);

  y = writeEnsamblePdfSectionTitle(
    doc,
    y,
    tables.programas.title,
    tables.programas.count,
  );
  y = drawEnsambleProgramasTable(doc, y, tables.programas);

  y = writeEnsamblePdfSectionTitle(
    doc,
    y,
    tables.ensayos.title,
    tables.ensayos.count,
    tables.ensayos.pendingExtra,
  );
  y = drawEnsambleEnsayosTable(doc, y, tables.ensayos);

  if (tables.excluded.count) {
    y = writeEnsamblePdfSectionTitle(
      doc,
      y,
      tables.excluded.title,
      tables.excluded.count,
    );
    y = drawEnsambleGirasTable(doc, y, tables.excluded);
  }

  return doc;
}

export function downloadEnsambleServiciosPdf(args) {
  const doc = buildEnsambleServiciosPdfDoc(args);
  if (!doc) return;
  const slug = slugEnsamblePdf(args?.report?.ensambleName);
  return deliverPdf(doc, `informe_ensamble_${slug}_${pdfStamp()}.pdf`);
}
