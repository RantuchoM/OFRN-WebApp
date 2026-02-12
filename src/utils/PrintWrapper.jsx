/**
 * Exportación inteligente para impresión.
 * Inyecta estilos críticos manualmente para garantizar que el reporte se vea bien
 * incluso si los estilos externos fallan.
 */
export const handlePrintExport = (ref, title = "Reporte") => {
  const htmlContent = ref?.current ? ref.current.innerHTML : ref;

  if (!htmlContent) {
    console.error("No se encontró contenido para exportar");
    return;
  }

  const printWindow = window.open('', '_blank', 'height=800,width=1200');
  
  if (!printWindow) {
    alert("Por favor permite las ventanas emergentes para poder imprimir.");
    return;
  }

  // Estilos críticos manuales (Tailwind-like) para asegurar la visualización
  const criticalStyles = `
    /* Reset */
    * { box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 20px; color: #1e293b; }
    
    /* Layout */
    .print-container { width: 100%; max-width: 100%; }
    .hidden { display: none !important; }
    .print\\:block { display: block !important; } /* Forzar mostrar encabezados de impresión */
    
    /* Tablas */
    table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 10px; }
    th, td { padding: 8px; border: 1px solid #e2e8f0; text-align: left; }
    th { background-color: #f8fafc; font-weight: 700; text-transform: uppercase; font-size: 11px; color: #64748b; }
    
    /* Alineación */
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    
    /* Bordes y Fondos específicos */
    .border-b-2 { border-bottom-width: 2px; }
    .border-slate-800 { border-color: #1e293b; }
    .border-l { border-left: 1px solid #e2e8f0; }
    .bg-slate-50 { background-color: #f8fafc; }
    .bg-slate-100 { background-color: #f1f5f9; }
    
    /* Badges / Etiquetas */
    span.rounded {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      border: 1px solid #e2e8f0;
    }
    
    /* Colores de badges (Hardcoded para que siempre se vean) */
    .bg-amber-50 { background-color: #fffbeb; color: #b45309; border-color: #fcd34d; }
    .bg-indigo-50 { background-color: #eef2ff; color: #4338ca; border-color: #c7d2fe; }
    .bg-slate-50-badge { background-color: #f8fafc; color: #475569; border-color: #e2e8f0; }

    /* Tipografía */
    .font-bold { font-weight: 700; }
    .font-black { font-weight: 900; }
    .text-lg { font-size: 1.125rem; }
    .text-xs { font-size: 0.75rem; }
    .text-slate-500 { color: #64748b; }
    .text-slate-600 { color: #475569; }
    
    /* Utilidades de impresión */
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .no-print { display: none; }
      tr { page-break-inside: avoid; }
    }
  `;

  // Construir el HTML completo
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title}</title>
        <meta charset="utf-8" />
        <style>${criticalStyles}</style>
      </head>
      <body>
        <div class="print-container">
          ${!htmlContent.includes('print:block') ? `<h1 style="font-size: 24px; font-weight: bold; margin-bottom: 20px; border-bottom: 2px solid #333;">${title}</h1>` : ''}
          ${htmlContent}
        </div>
        <script>
          window.onload = () => {
            setTimeout(() => {
              window.print();
            }, 100);
          };
        </script>
      </body>
    </html>
  `);

  printWindow.document.close();
};