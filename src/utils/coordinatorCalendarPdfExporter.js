import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { format } from "date-fns";

/**
 * Captura el nodo del calendario (react-big-calendar) y lo guarda en PDF
 * conservando el aspecto visual de la pantalla.
 *
 * @param {HTMLElement} calendarElement contenedor del calendario (.rbc-calendar padre)
 * @param {{ title?: string, subTitle?: string, orientation?: 'p' | 'l' }} meta
 */
export async function exportCoordinatorCalendarToPdf(
  calendarElement,
  { title = "Coordinación — Calendario", subTitle = "", orientation = "l" } = {},
) {
  if (!calendarElement) {
    throw new Error("No se encontró el calendario para exportar.");
  }

  const canvas = await html2canvas(calendarElement, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: "#ffffff",
  });

  const doc = new jsPDF({
    orientation,
    unit: "mm",
    format: "a4",
  });

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 10;
  let cursorY = margin;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(30, 41, 59);
  doc.text(title, margin, cursorY);
  cursorY += 7;

  if (subTitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    const lines = doc.splitTextToSize(subTitle, pageW - margin * 2);
    doc.text(lines, margin, cursorY);
    cursorY += lines.length * 3.5 + 3;
  }

  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Generado el ${format(new Date(), "dd/MM/yyyy HH:mm")}`,
    margin,
    cursorY,
  );
  cursorY += 5;

  const availW = pageW - margin * 2;
  const availH = pageH - cursorY - margin;
  const imgData = canvas.toDataURL("image/png", 1.0);

  let renderW = availW;
  let renderH = (canvas.height / canvas.width) * renderW;
  if (renderH > availH) {
    renderH = availH;
    renderW = (canvas.width / canvas.height) * renderH;
  }

  const x = margin + (availW - renderW) / 2;
  doc.addImage(imgData, "PNG", x, cursorY, renderW, renderH);

  const safeTitle = title.replace(/[^a-z0-9]/gi, "_");
  doc.save(`${safeTitle}_${format(new Date(), "yyyy-MM-dd")}.pdf`);
}
