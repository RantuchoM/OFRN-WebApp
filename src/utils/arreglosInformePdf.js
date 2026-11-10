import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

function stripHtml(html) {
  return (html || "")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function toDateOnly(value) {
  if (!value) return null;
  if (typeof value === "string") {
    const m = value.match(/^(\d{4}-\d{2}-\d{2})/);
    if (m) return m[1];
  }
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${mo}-${day}`;
}

function formatFechaPdf(fechaStr) {
  const iso = toDateOnly(fechaStr);
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function isEntregadoLike(work) {
  const estado = (work?.estado || "").toLowerCase();
  return estado === "entregado" || estado === "oficial";
}

/** Fecha relevante para filtro/informe: entrega si ya entregó; si no, prevista. */
export function getArregloFechaFiltro(work) {
  if (isEntregadoLike(work)) {
    return toDateOnly(work.fecha_entrega) || toDateOnly(work.fecha_esperada);
  }
  return toDateOnly(work.fecha_esperada);
}

export function getArregloFechaTipo(work) {
  if (isEntregadoLike(work) && toDateOnly(work.fecha_entrega)) return "entrega";
  if (toDateOnly(work.fecha_esperada)) return "prevista";
  return null;
}

/**
 * @param {object[]} works lista ya filtrada/ordenada
 * @param {{ titulo?: string, arregladorLabel?: string, fechaDesde?: string, fechaHasta?: string }} meta
 */
export function downloadArreglosInformePdf(works, meta = {}) {
  const list = Array.isArray(works) ? works : [];
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const marginX = 12;

  const titulo = meta.titulo || "Informe de arreglos";
  const rangoParts = [];
  if (meta.fechaDesde) rangoParts.push(`desde ${formatFechaPdf(meta.fechaDesde)}`);
  if (meta.fechaHasta) rangoParts.push(`hasta ${formatFechaPdf(meta.fechaHasta)}`);
  const rangoTxt = rangoParts.length ? rangoParts.join(" ") : "sin filtro de fechas";
  const arregladorTxt = meta.arregladorLabel
    ? `Arreglador: ${meta.arregladorLabel}`
    : "Todos los arregladores";

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(30, 41, 59);
  doc.text(titulo, marginX, 14);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text(
    `OFRN · Repertorio  ·  ${arregladorTxt}  ·  ${rangoTxt}  ·  Total: ${list.length}`,
    marginX,
    20,
  );
  doc.setDrawColor(203, 213, 225);
  doc.line(marginX, 23, pageW - marginX, 23);

  const driveUrls = [];
  const body = list.map((work, idx) => {
    const fechaRaw = getArregloFechaFiltro(work);
    const tipo = getArregloFechaTipo(work);
    const fechaLabel = fechaRaw
      ? `${formatFechaPdf(fechaRaw)}${tipo === "prevista" ? " (prev.)" : ""}`
      : "—";
    const drive = (work.link_drive || "").trim();
    driveUrls.push(drive || null);
    return [
      String(idx + 1),
      String(work.id ?? ""),
      stripHtml(work.titulo) || "—",
      stripHtml(work.compositor_full) || "—",
      stripHtml(work.instrumentacion) || "—",
      fechaLabel,
      drive ? "Abrir carpeta" : "—",
    ];
  });

  autoTable(doc, {
    startY: 26,
    head: [["#", "ID", "Título", "Compositor(es)", "Orgánico", "Fecha", "Carpeta"]],
    body,
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 7,
      cellPadding: 1.4,
      valign: "top",
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: 255,
      fontStyle: "bold",
      fontSize: 7.5,
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 10, halign: "center" },
      1: { cellWidth: 14, halign: "center" },
      2: { cellWidth: 70 },
      3: { cellWidth: 48 },
      4: { cellWidth: 42, fontSize: 6.5 },
      5: { cellWidth: 28, halign: "center" },
      6: { cellWidth: 28, halign: "center", textColor: [37, 99, 235] },
    },
    margin: { left: marginX, right: marginX },
    didDrawCell: (data) => {
      if (data.section !== "body" || data.column.index !== 6) return;
      const url = driveUrls[data.row.index];
      if (!url) return;
      doc.setTextColor(37, 99, 235);
      data.doc.link(data.cell.x, data.cell.y, data.cell.width, data.cell.height, {
        url,
      });
    },
  });

  const finalY = (doc.lastAutoTable?.finalY || 26) + 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(
    "Fecha: entrega (obras Entregado/Oficial) o prevista (Para arreglar). Carpeta = link Drive de la obra.",
    marginX,
    finalY,
  );

  const stamp = new Date().toISOString().slice(0, 10);
  const safeName = (meta.arregladorLabel || "arreglos")
    .replace(/[^\w\- áéíóúñÁÉÍÓÚÑ,.]/gi, "")
    .trim()
    .replace(/\s+/g, "_")
    .slice(0, 40);
  doc.save(`Informe_Arreglos_${safeName || "todos"}_${stamp}.pdf`);
}
