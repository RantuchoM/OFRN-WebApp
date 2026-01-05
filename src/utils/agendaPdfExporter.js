import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

export const exportAgendaToPDF = (items, title = "Agenda General", subTitle = "", hideGiraColumn = false) => {
  const doc = new jsPDF();
  let cursorY = 15; // Control de posición vertical dinámica

  // 1. ENCABEZADO DE GIRA (METADATA SUPERIOR)
  // Se muestra solo si estamos filtrando una gira específica (hideGiraColumn=true)
  if (hideGiraColumn && items.length > 0 && items[0].programas) {
      const prog = items[0].programas;
      
      // Construcción del string: "TIPO | ZONA  •  NOMENCLADOR  •  MES"
      const metaParts = [];
      
      // Parte A: Tipo | Zona
      const typeZone = [prog.tipo, prog.zona].filter(Boolean).join(' | ');
      if (typeZone) metaParts.push(typeZone.toUpperCase());

      // Parte B: Nomenclador
      if (prog.nomenclador) metaParts.push(prog.nomenclador);

      // Parte C: Mes
      if (prog.mes_letra) metaParts.push(prog.mes_letra);

      const headerText = metaParts.join('  •  ');

      doc.setFontSize(9);
      doc.setTextColor(100); // Gris
      doc.setFont(undefined, 'bold');
      doc.text(headerText, 14, cursorY);
      
      cursorY += 7; // Bajar el cursor para el título principal
  }

  // 2. TÍTULO PRINCIPAL (Nombre de la Gira o Agenda)
  doc.setFontSize(16);
  doc.setTextColor(40); // Casi negro
  doc.setFont(undefined, 'normal');
  doc.text(title, 14, cursorY);
  
  cursorY += 7;

  // 3. SUBTÍTULO (Solo si hay info extra como "Vista simulada" o borradores)
  if (subTitle) {
      doc.setFontSize(10);
      doc.setTextColor(80);
      doc.text(subTitle, 14, cursorY);
      cursorY += 6;
  }

  // 4. FECHA DE GENERACIÓN
  const dateStr = format(new Date(), "d 'de' MMMM, yyyy", { locale: es });
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text(`Generado el ${dateStr}`, 14, cursorY);
  
  cursorY += 5; // Espacio antes de la tabla

  // --- PREPARACIÓN DE LA TABLA ---
  const events = items.filter(i => !i.isProgramMarker);

  // Definición de Columnas (Anchos optimizados)
  const columns = [
      { header: 'Hora', dataKey: 'hora' },
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
    // Agrupación por Día con Fecha Completa
    const dateKey = format(parseISO(evt.fecha), "EEEE, d 'de' MMMM 'de' yyyy", { locale: es });
    const dateKeyUpper = dateKey.charAt(0).toUpperCase() + dateKey.slice(1);

    // Si cambia el día, insertamos fila separadora
    if (dateKey !== lastDate) {
        tableBody.push({
            hora: dateKeyUpper, // Texto en primera columna (se expandirá)
            isSeparator: true   // Bandera para estilo especial
        });
        lastDate = dateKey;
    }

    const rowData = {
        hora: evt.hora_inicio?.slice(0, 5) || '-',
        tipo: evt.tipos_evento?.nombre || '',
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

  // --- GENERACIÓN DE TABLA ---
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
        lineColor: [200, 200, 200]
    },
    headStyles: { 
        fillColor: [30, 41, 59], 
        textColor: 255, 
        fontStyle: 'bold',
        halign: 'left'
    },
    // Ajuste de Anchos de Columna
    columnStyles: {
      hora: { cellWidth: 16, halign: 'center', fontStyle: 'bold' },
      tipo: { cellWidth: 18, fontSize: 7 }, // Compacto
      desc: { cellWidth: 'auto' }, // Se expande
      locacion: { cellWidth: 35 }, 
      localidad: { cellWidth: 25 },
      gira: { cellWidth: 20, fontSize: 7, textColor: 100 }
    },
    
    // LOGICA 1: Fila Separadora de Día
    didParseCell: function(data) {
        if (data.row.raw && data.row.raw.isSeparator) {
            if (data.column.dataKey === 'hora') {
                data.cell.colSpan = columns.length; // Ocupar todo el ancho
                data.cell.styles.fillColor = [230, 230, 230]; // Gris fondo
                data.cell.styles.textColor = [30, 41, 59];
                data.cell.styles.fontStyle = 'bold';
                data.cell.styles.halign = 'left';
                data.cell.styles.fontSize = 9;
                data.cell.styles.cellPadding = { top: 4, bottom: 2, left: 3 };
            } else {
                data.cell.styles.display = 'none'; // Ocultar otras celdas
            }
        } else if (data.section === 'body' && data.column.dataKey === 'tipo') {
            // Padding extra para la barra de color
            data.cell.styles.cellPadding = { top: 2.5, right: 2.5, bottom: 2.5, left: 4 };
        }
    },
    
    // LOGICA 2: Barra de Color en Tipo de Evento
    didDrawCell: function(data) {
        if (data.section === 'body' && data.column.dataKey === 'tipo' && data.row.raw.raw) {
            const originalItem = data.row.raw.raw;
            if (originalItem && originalItem.tipos_evento?.color) {
                doc.setFillColor(originalItem.tipos_evento.color);
                doc.rect(data.cell.x, data.cell.y, 1.5, data.cell.height, 'F');
            }
        }
    }
  });

  // Numeración de páginas
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