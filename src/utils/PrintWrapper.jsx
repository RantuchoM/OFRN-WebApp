/**
 * Exportación inteligente: Recibe una referencia de React o HTML directo.
 * Captura los estilos de Tailwind de la página actual para que no se desformatee.
 */
export const handlePrintExport = (ref, title = "Reporte") => {
  const htmlContent = ref?.current ? ref.current.innerHTML : ref;

  if (!htmlContent) {
    console.error("No se encontró contenido para exportar");
    return;
  }

  const printWindow = window.open('', '_blank', 'width=1200,height=800');

  // Capturar todos los estilos actuales de la aplicación (Tailwind, index.css, etc)
  const styleElements = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
    .map(el => el.outerHTML)
    .join('\n');

  const fullHtml = `
    <html>
      <head>
        <title>${title}</title>
        ${styleElements}
        <style>
          /* Ajustes específicos para impresión que Tailwind a veces ignora */
          body { 
            background-color: white !important; 
            color: black !important; 
            padding: 20px !important;
            -webkit-print-color-adjust: exact; 
            print-color-adjust: exact;
          }
          
          /* Forzar visibilidad de tablas y bordes */
          table { border-collapse: collapse !important; width: 100% !important; }
          th, td { border: 1px solid #e2e8f0 !important; padding: 8px !important; }
          
          /* Ocultar elementos innecesarios en el PDF */
          .no-print, button, .btn-print, select { display: none !important; }
          
          /* Evitar que las filas se corten a la mitad entre páginas */
          tr { page-break-inside: avoid !important; }
          
          @media print {
            @page { margin: 1.5cm; }
            .sticky { position: static !important; } /* Desactivar headers fijos */
          }
        </style>
      </head>
      <body>
        <div class="print-container">
          <h1 class="text-2xl font-bold mb-4 border-b pb-2">${title}</h1>
          ${htmlContent}
        </div>
      </body>
    </html>
  `;

  printWindow.document.write(fullHtml);
  printWindow.document.close();

  // Esperar un momento a que los estilos se apliquen antes de imprimir
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 500);
};