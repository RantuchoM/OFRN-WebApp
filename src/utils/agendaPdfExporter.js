import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

// Función para eliminar etiquetas HTML (b, i, u, etc.)
const stripHtml = (html) => {
    if (!html) return '';
    return html.replace(/<[^>]*>?/gm, '');
};

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
        desc: stripHtml(evt.descripcion || evt.tipos_evento?.nombre || ''),
        locacion: evt.locaciones?.nombre || '-',
        direccion: evt.locaciones?.direccion || '', // Guardamos la dirección
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
      locacion: { cellWidth: 35, fontSize: 7 }, // Reducimos un punto el tamaño para dar espacio a la dirección
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

        // Si la locación tiene dirección, aumentamos la altura de la celda para que quepa todo
        if (data.section === 'body' && data.column.dataKey === 'locacion' && data.row.raw.direccion) {
            data.cell.styles.minCellHeight = 12; 
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
    
    // 2. DIBUJO MANUAL (CHIP, BARRA COLOR Y DIRECCIÓN)
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
            
            const textLines = doc.splitTextToSize(chipText, chipConfig.maxWidth);
            
            let maxLineWidth = 0;
            textLines.forEach(line => {
                const w = doc.getTextWidth(line);
                if (w > maxLineWidth) maxLineWidth = w;
            });

            const ptToMm = 0.3527; 
            const fontHeightMm = chipConfig.fontSize * ptToMm; 

            const textBlockHeight = textLines.length * chipConfig.lineHeight;
            const rectWidth = maxLineWidth + (chipConfig.hPadding * 2);
            const rectHeight = textBlockHeight + (chipConfig.vPadding * 2);

            const xPos = data.cell.x + 1.5 + (data.cell.width - 1.5 - rectWidth) / 2;
            const yPos = data.cell.y + (data.cell.height - rectHeight) / 2;

            doc.setDrawColor(chipColor);
            doc.setLineWidth(0.25); 
            doc.roundedRect(xPos, yPos, rectWidth, rectHeight, 1.5, 1.5, 'D'); 

            doc.setTextColor(0, 0, 0);
            
            const internalTopMargin = (rectHeight - textBlockHeight) / 2;
            const baselineOffset = fontHeightMm * 0.75; 
            
            let currentTextY = yPos + internalTopMargin + baselineOffset + 0.3;

            textLines.forEach(line => {
                const lineWidth = doc.getTextWidth(line);
                const lineX = xPos + (rectWidth - lineWidth) / 2; 
                
                doc.text(line, lineX, currentTextY);
                currentTextY += chipConfig.lineHeight;
            });
        }

        // C. Dirección de la Locación (Insertada debajo del nombre con cálculo dinámico)
        if (data.column.dataKey === 'locacion' && rowRaw.direccion) {
            doc.setFontSize(5.5);    // Tamaño más pequeño
            doc.setTextColor(130);   // Color atenuado (gris)
            doc.setFont(undefined, 'italic');
            
            // Calculamos cuántas líneas ocupa el nombre para determinar la posición Y de la dirección
            const nameText = rowRaw.locacion || '';
            const wrappedName = doc.splitTextToSize(nameText, data.cell.width - 5);
            
            // Si el nombre ocupa más de una línea, bajamos más la dirección
            const lineOffset = wrappedName.length > 1 ? 9.5 : 8.5;

            doc.text(rowRaw.direccion, data.cell.x + 2.5, data.cell.y + lineOffset, {
                maxWidth: data.cell.width - 4
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