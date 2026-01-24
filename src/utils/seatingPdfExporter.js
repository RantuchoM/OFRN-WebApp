// src/utils/seatingPdfExporter.js
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

export const exportSeatingToPdf = async (seatingRef, tourName = "Gira") => {
  if (!seatingRef.current) return;

  try {
    const element = seatingRef.current;
    
    // Captura el elemento con alta resolución
    const canvas = await html2canvas(element, {
      scale: 2, // Mejora la nitidez del texto
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight
    });

    const imgData = canvas.toDataURL('image/png');
    
    // Configuración del PDF (A4 Horizontal suele ser mejor para Seating)
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

    // Añadir imagen al PDF
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    
    // Guardar el archivo
    pdf.save(`Seating_${tourName.replace(/\s+/g, '_')}.pdf`);
    
    return true;
  } catch (error) {
    console.error("Error exportando Seating a PDF:", error);
    return false;
  }
};