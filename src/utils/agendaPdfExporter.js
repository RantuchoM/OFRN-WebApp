import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

export const exportAgendaToPDF = (items, title = "Agenda General", subTitle = "", hideGiraColumn = false) => {
  const doc = new jsPDF();
  let cursorY = 15; 

  // 1. ENCABEZADO DE GIRA
  if (hideGiraColumn && items.length > 0 && items[0].programas) {
      const prog = items[0].programas;
      
      const metaParts = [];
      const typeZone = [prog.tipo, prog.zona].filter(Boolean).join(' | ');
      if (typeZone) metaParts.push(typeZone.toUpperCase());
      if (prog.nomenclador) metaParts.push(prog.nomenclador);
      if (prog.mes_letra) metaParts.push(prog.mes_letra);

      const headerText = metaParts.join('  •  ');

      doc.setFontSize(9);
      doc.setTextColor(100); 
      doc.setFont(undefined, 'bold');
      doc.text(headerText, 14, cursorY);
      
      cursorY += 7; 
  }

  // 2. TÍTULO
  doc.setFontSize(16);
  doc.setTextColor(40); 
  doc.setFont(undefined, 'normal');
  doc.text(title, 14, cursorY);
  
  cursorY += 7;

  // 3. SUBTÍTULO
  if (subTitle) {
      doc.setFontSize(10);
      doc.setTextColor(80);
      doc.text(subTitle, 14, cursorY);
      cursorY += 6;
  }

  // 4. FECHA
  const dateStr = format(new Date(), "d 'de' MMMM, yyyy", { locale: es });
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text(`Generado el ${dateStr}`, 14, cursorY);
  
  cursorY += 5; 

  // --- PREPARACIÓN DE DATOS ---
  const events = items.filter(i => !i.isProgramMarker);

  const columns = [
      { header: 'Desde', dataKey: 'desde' },
      { header: 'Hasta', dataKey: 'hasta' },
      { header: 'Tipo', dataKey: 'tipo' }, 
      { header: 'Descripción', dataKey: 'desc' },
      { header: 'Locación', dataKey: 'locacion' },
      { header: 'Localidad', dataKey: 'localidad' },
  ];

  if (!hideGiraColumn) {
      columns.push({ header: 'Gira', dataKey: 'gira' });
  }

  const tableBody = [];
  let lastDate = null;

  events.forEach(evt => {
    // Agrupación por Día
    const dateKey = format(parseISO(evt.fecha), "EEEE, d 'de' MMMM 'de' yyyy", { locale: es });
    const dateKeyUpper = dateKey.charAt(0).toUpperCase() + dateKey.slice(1);

    if (dateKey !== lastDate) {
        tableBody.push({
            desde: dateKeyUpper,
            isSeparator: true   
        });
        lastDate = dateKey;
    }

    // Horas
    const start = evt.hora_inicio?.slice(0, 5) || '-';
    let end = '-';
    if (evt.hora_fin && evt.hora_fin !== evt.hora_inicio) {
        end = evt.hora_fin.slice(0, 5);
    }

    // Chip de Transporte
    const transportData = evt.giras_transportes?.transportes;
    const transportName = transportData?.nombre || null;
    const transportColor = transportData?.color || '#94a3b8'; 

    let typeName = evt.tipos_evento?.nombre || '';
    if (transportName) {
        typeName = ''; // Ocultamos texto si hay chip
    }

    const rowData = {
        desde: start,
        hasta: end,
        tipo: typeName,
        transportChip: transportName, 
        transportColor: transportColor,
        desc: evt.descripcion || evt.tipos_evento?.nombre || '',
        locacion: evt.locaciones?.nombre || '-',
        localidad: evt.locaciones?.localidades?.localidad || '-',
        raw: evt 
    };

    if (!hideGiraColumn) {
        rowData.gira = evt.programas?.nomenclador || evt.programas?.nombre_gira || '-';
    }

    tableBody.push(rowData);
  });

  // CONFIGURACIÓN DEL CHIP
  const chipConfig = {
      fontSize: 5.5,    // Puntos (pt)
      lineHeight: 2.2,  // Milímetros (mm)
      hPadding: 2,      // mm
      vPadding: 1.2,    // mm
      maxWidth: 14      // mm
  };

  // --- GENERAR TABLA ---
  autoTable(doc, {
    startY: cursorY,
    columns: columns,
    body: tableBody,
    
    theme: 'grid',
    styles: { 
        fontSize: 8, 
        cellPadding: 2.5, 
        valign: 'middle', 
        overflow: 'linebreak',
        lineWidth: 0.1,
        lineColor: [220, 220, 220]
    },
    headStyles: { 
        fillColor: [30, 41, 59], 
        textColor: 255, 
        fontStyle: 'bold',
        halign: 'left'
    },
    columnStyles: {
      desde: { cellWidth: 14, halign: 'center', fontStyle: 'bold', fontSize: 7 },
      hasta: { cellWidth: 14, halign: 'center', fontSize: 7, textColor: 80 },
      tipo: { cellWidth: 20, fontSize: 7, halign: 'center' }, 
      desc: { cellWidth: 'auto' }, 
      locacion: { cellWidth: 35 }, 
      localidad: { cellWidth: 25 },
      gira: { cellWidth: 20, fontSize: 7, textColor: 100 }
    },
    
    // 1. FILA SEPARADORA & HEIGHT CONTROL
    didParseCell: function(data) {
        if (data.row.raw && data.row.raw.isSeparator) {
            if (data.column.dataKey === 'desde') {
                data.cell.colSpan = columns.length; 
                data.cell.styles.fillColor = [240, 240, 240]; 
                data.cell.styles.textColor = [30, 41, 59];
                data.cell.styles.fontStyle = 'bold';
                data.cell.styles.halign = 'left';
                data.cell.styles.fontSize = 9;
                data.cell.styles.cellPadding = { top: 4, bottom: 2, left: 3 };
            } else {
                data.cell.styles.display = 'none'; 
            }
        } 
        
        // Ajuste de padding para la columna tipo
        if (data.section === 'body' && data.column.dataKey === 'tipo') {
            data.cell.styles.cellPadding = { top: 2.5, right: 1, bottom: 2.5, left: 3 };
        }

        // CALCULO DE ALTURA DINÁMICA (Para asegurar que el chip quepa)
        if (data.section === 'body' && data.column.dataKey === 'tipo' && data.row.raw.transportChip) {
             const text = data.row.raw.transportChip;
             
             doc.setFontSize(chipConfig.fontSize);
             doc.setFont(undefined, 'bold');
             const lines = doc.splitTextToSize(text, chipConfig.maxWidth);
             
             const textBlockHeight = lines.length * chipConfig.lineHeight;
             const totalChipHeight = textBlockHeight + (chipConfig.vPadding * 2);
             const requiredCellHeight = totalChipHeight + 3; // +3mm margen seguridad

             if (requiredCellHeight > (data.cell.styles.minCellHeight || 0)) {
                 data.cell.styles.minCellHeight = requiredCellHeight;
             }
        }
    },
    
    // 2. DIBUJO MANUAL (CHIP & BARRA COLOR)
    didDrawCell: function(data) {
        if (data.section !== 'body' || !data.row.raw.raw) return;

        const originalItem = data.row.raw.raw;
        const rowRaw = data.row.raw;

        // A. Barra Lateral de Color
        if (data.column.dataKey === 'tipo') {
            if (originalItem.tipos_evento?.color) {
                doc.setFillColor(originalItem.tipos_evento.color);
                doc.rect(data.cell.x, data.cell.y, 1.5, data.cell.height, 'F');
            }
        }

        // B. Chip de Transporte
        if (data.column.dataKey === 'tipo' && rowRaw.transportChip) {
            const chipText = rowRaw.transportChip;
            const chipColor = rowRaw.transportColor;

            doc.setFontSize(chipConfig.fontSize);
            doc.setFont(undefined, 'bold');
            
            // Dividir texto
            const textLines = doc.splitTextToSize(chipText, chipConfig.maxWidth);
            
            // Calcular ancho máximo
            let maxLineWidth = 0;
            textLines.forEach(line => {
                const w = doc.getTextWidth(line);
                if (w > maxLineWidth) maxLineWidth = w;
            });

            // Alturas reales en mm
            // 1 punto = 0.3527 mm. Usamos esto para el cálculo de baseline preciso.
            const ptToMm = 0.3527; 
            const fontHeightMm = chipConfig.fontSize * ptToMm; 

            const textBlockHeight = textLines.length * chipConfig.lineHeight;
            const rectWidth = maxLineWidth + (chipConfig.hPadding * 2);
            const rectHeight = textBlockHeight + (chipConfig.vPadding * 2);

            // Coordenadas del Rectángulo (Centrado)
            // +1.5 en X es para no tapar la barra de color lateral
            const xPos = data.cell.x + 1.5 + (data.cell.width - 1.5 - rectWidth) / 2;
            const yPos = data.cell.y + (data.cell.height - rectHeight) / 2;

            // 1. Dibujar Borde
            doc.setDrawColor(chipColor);
            doc.setLineWidth(0.25); 
            doc.roundedRect(xPos, yPos, rectWidth, rectHeight, 1.5, 1.5, 'D'); 

            // 2. Dibujar Texto
            doc.setTextColor(0, 0, 0);
            
            // CÁLCULO DE ALINEACIÓN VERTICAL CORREGIDO
            // Para centrar visualmente, el 'top' de la primera línea debe estar separado del 'top' del rect
            // por la misma distancia que el 'bottom' de la última línea del 'bottom' del rect.
            
            // El espacio total vertical disponible es rectHeight.
            // El espacio ocupado por el texto es textBlockHeight.
            // Margen superior interno = (rectHeight - textBlockHeight) / 2.
            
            // La función doc.text(x, y) dibuja sobre la BASELINE.
            // La baseline está aproximadamente a (FontSize * 0.75) hacia abajo desde el Top de la letra.
            
            const internalTopMargin = (rectHeight - textBlockHeight) / 2;
            
            // Queremos que el TOP de la primera línea esté en yPos + internalTopMargin.
            // Por lo tanto, su BASELINE debe estar en:
            // yPos + internalTopMargin + (fontHeightMm * 0.75)
            // Agregamos un pequeño offset para compensar el interlineado visual
            
            const baselineOffset = fontHeightMm * 0.75; 
            
            // Cálculo de la Y inicial (para la primera línea)
            let currentTextY = yPos + internalTopMargin + baselineOffset + 0.3; // +0.3mm ajuste visual hacia abajo

            textLines.forEach(line => {
                const lineWidth = doc.getTextWidth(line);
                const lineX = xPos + (rectWidth - lineWidth) / 2; // Centrado Horizontal
                
                doc.text(line, lineX, currentTextY);
                currentTextY += chipConfig.lineHeight;
            });
        }
    }
  });

  // Numeración
  const pageCount = doc.internal.getNumberOfPages();
  for(let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(`Página ${i} de ${pageCount}`, doc.internal.pageSize.width - 20, doc.internal.pageSize.height - 10, { align: 'right' });
  }

  const safeTitle = title.replace(/[^a-z0-9]/gi, '_');
  doc.save(`${safeTitle}_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
};