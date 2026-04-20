import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

// Elimina etiquetas HTML (solo texto plano)
const stripHtml = (html) => {
    if (!html) return '';
    return html.replace(/<[^>]*>?/gm, '');
};

const DESC_FONT_SIZE = 8;
const DESC_LINE_HEIGHT_MM = 4;

/**
 * Normaliza HTML de descripción para PDF: quita spans con estilos largos (Tailwind etc.),
 * convierte <span style="...font-weight: bolder..."> en <b>, mantiene <u>, <i>, <b>.
 * Respeta saltos de línea: <br> → \n, <div> y </div> → \n.
 */
function normalizeDescForPdf(html) {
    if (!html || typeof html !== 'string') return '';
    const stack = [];
    let out = '';
    let i = 0;
    const s = html;
    const len = s.length;
    while (i < len) {
        if (s.substring(i, i + 6) === '</div>') {
            out += '\n';
            i += 6;
            continue;
        }
        if (s.substring(i, i + 4) === '<div') {
            const end = s.indexOf('>', i);
            if (end !== -1) {
                if (out.slice(-1) !== '\n') out += '\n';
                i = end + 1;
                continue;
            }
        }
        if (s.substring(i, i + 4) === '<br ') {
            const end = s.indexOf('>', i);
            if (end !== -1) { out += '\n'; i = end + 1; continue; }
        }
        if (s.substring(i, i + 4) === '<br>') { out += '\n'; i += 4; continue; }
        if (s.substring(i, i + 5) === '<br/>') { out += '\n'; i += 5; continue; }
        if (s.substring(i, i + 6) === '<br />') { out += '\n'; i += 6; continue; }
        if (s.substring(i, i + 5) === '<span') {
            const end = s.indexOf('>', i);
            if (end === -1) { i++; continue; }
            const tag = s.substring(i, end + 1);
            const isBold = /font-weight:\s*(?:bolder|bold)\b/i.test(tag);
            stack.push(isBold ? 'b' : 's');
            out += isBold ? '<b>' : '';
            i = end + 1;
            continue;
        }
        if (s.substring(i, i + 7) === '</span>') {
            if (stack.length) {
                const t = stack.pop();
                if (t === 'b') out += '</b>';
            }
            i += 7;
            continue;
        }
        if (s.substring(i, i + 3) === '<b>' || s.substring(i, i + 4) === '</b>') {
            out += s.substring(i, s.substring(i, i + 4) === '</b>' ? i + 4 : i + 3);
            i += s.substring(i, i + 4) === '</b>' ? 4 : 3;
            continue;
        }
        if (s.substring(i, i + 3) === '<i>' || s.substring(i, i + 4) === '</i>') {
            out += s.substring(i, s.substring(i, i + 4) === '</i>' ? i + 4 : i + 3);
            i += s.substring(i, i + 4) === '</i>' ? 4 : 3;
            continue;
        }
        if (s.substring(i, i + 3) === '<u>' || s.substring(i, i + 4) === '</u>') {
            out += s.substring(i, s.substring(i, i + 4) === '</u>' ? i + 4 : i + 3);
            i += s.substring(i, i + 4) === '</u>' ? 4 : 3;
            continue;
        }
        if (s[i] === '<') {
            const end = s.indexOf('>', i);
            if (end !== -1) { i = end + 1; continue; }
        }
        out += s[i];
        i++;
    }
    return out.replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * Parsea HTML con <b>, <i>, <u> en segmentos { text, bold, italic, underline }.
 */
function parseRichText(html) {
    if (!html || typeof html !== 'string') return [{ text: '', bold: false, italic: false, underline: false }];
    const segments = [];
    let bold = false, italic = false, underline = false;
    const re = /<(?:b|i|u)>|<\/(?:b|i|u)>|([^<]+)/gi;
    let m;
    while ((m = re.exec(html)) !== null) {
        if (m[1] !== undefined) {
            segments.push({ text: m[1], bold, italic, underline });
        } else {
            const tag = m[0].toLowerCase();
            if (tag === '<b>') bold = true;
            else if (tag === '</b>') bold = false;
            else if (tag === '<i>') italic = true;
            else if (tag === '</i>') italic = false;
            else if (tag === '<u>') underline = true;
            else if (tag === '</u>') underline = false;
        }
    }
    return segments.length ? segments : [{ text: '', bold: false, italic: false, underline: false }];
}

/**
 * Calcula altura en mm del bloque de rich text con wrap a maxWidth.
 */
function getRichTextHeight(doc, html, maxWidthMm, fontSize, lineHeightMm) {
    const segments = parseRichText(html);
    doc.setFontSize(fontSize);
    let y = 0;
    let lineW = 0;
    segments.forEach(({ text, bold, italic, underline }) => {
        const style = (bold ? 'bold' : '') + (italic ? 'italic' : '');
        doc.setFont(undefined, style || 'normal');
        const parts = text.split('\n');
        parts.forEach((part, idx) => {
            if (idx) { lineW = 0; y += lineHeightMm; }
            const words = part.split(/(\s+)/).filter(Boolean);
            words.forEach((word) => {
                const w = doc.getTextWidth(word);
                if (lineW + w > maxWidthMm && lineW > 0) { lineW = 0; y += lineHeightMm; }
                lineW += w;
            });
        });
    });
    if (lineW > 0) y += lineHeightMm;
    return Math.max(y, lineHeightMm);
}

/**
 * Dibuja rich text en (x, y) con wrap; devuelve la Y final en mm.
 */
function drawRichText(doc, html, x, y, maxWidthMm, fontSize, lineHeightMm) {
    const segments = parseRichText(html);
    doc.setFontSize(fontSize);
    doc.setTextColor(0, 0, 0);
    let currentY = y;
    let lineW = 0;
    const lineStartX = x;
    segments.forEach(({ text, bold, italic, underline }) => {
        const style = (bold ? 'bold' : '') + (italic ? 'italic' : '');
        doc.setFont(undefined, style || 'normal');
        const parts = text.split('\n');
        parts.forEach((part, idx) => {
            if (idx) { lineW = 0; currentY += lineHeightMm; }
            const words = part.split(/(\s+)/).filter(Boolean);
            words.forEach((word) => {
                const w = doc.getTextWidth(word);
                if (lineW + w > maxWidthMm && lineW > 0) { lineW = 0; currentY += lineHeightMm; }
                doc.text(word, lineStartX + lineW, currentY);
                if (underline) {
                    const baseline = currentY + 0.3;
                    doc.setDrawColor(0, 0, 0);
                    doc.setLineWidth(0.1);
                    doc.line(lineStartX + lineW, baseline, lineStartX + lineW + w, baseline);
                }
                lineW += w;
            });
        });
    });
    doc.setFont(undefined, 'normal');
    return currentY + lineHeightMm;
}

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
  // Excluir marcadores de programa, eventos eliminados (soft delete)
  // y filas asociadas a integrantes marcados como ausentes.
  const events = (items || []).filter((i) => {
    if (!i || i.isProgramMarker || i.is_deleted) return false;
    const estadoIntegrante = i.estado_gira || i.estado || null;
    if (estadoIntegrante === 'ausente') return false;
    return true;
  });

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

    const rawDesc = evt.descripcion || evt.tipos_evento?.nombre || '';
    const normalizedDesc = normalizeDescForPdf(rawDesc);
    const hasRichDesc = /<b>|<\/b>|<i>|<\/i>|<u>|<\/u>/i.test(normalizedDesc);

    const rowData = {
        desde: start,
        hasta: end,
        tipo: typeName,
        transportChip: transportName, 
        transportColor: transportColor,
        desc: hasRichDesc ? '' : stripHtml(normalizedDesc),
        locacion: evt.locaciones?.nombre || '-',
        direccion: evt.locaciones?.direccion || '',
        localidad: evt.locaciones?.localidades?.localidad || '-',
        raw: evt,
        descRaw: hasRichDesc ? normalizedDesc : null,
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

        // Altura dinámica para descripción con formato enriquecido
        if (data.section === 'body' && data.column.dataKey === 'desc' && data.row.raw.descRaw) {
            const maxW = (data.cell.width && data.cell.width > 0) ? data.cell.width - 5 : 55;
            const requiredHeight = getRichTextHeight(doc, data.row.raw.descRaw, maxW, DESC_FONT_SIZE, DESC_LINE_HEIGHT_MM);
            const withPadding = requiredHeight + 5;
            if (withPadding > (data.cell.styles.minCellHeight || 0)) {
                data.cell.styles.minCellHeight = withPadding;
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

        // C. Descripción con formato enriquecido (bold, italic, underline)
        if (data.column.dataKey === 'desc' && rowRaw.descRaw) {
            const contentX = data.cell.x + 2.5;
            const contentY = data.cell.y + 2.5 + (DESC_LINE_HEIGHT_MM * 0.25);
            const maxWidth = Math.max(data.cell.width - 5, 10);
            drawRichText(doc, rowRaw.descRaw, contentX, contentY, maxWidth, DESC_FONT_SIZE, DESC_LINE_HEIGHT_MM);
        }

        // D. Dirección de la Locación (Insertada debajo del nombre con cálculo dinámico)
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

/**
 * Exporta la grilla de conciertos filtrada a PDF.
 */
export const exportConciertosToPDF = (
  rows,
  title = "Gestión de Conciertos",
  subTitle = "",
) => {
  const hexToRgb = (hex) => {
    const clean = String(hex || "").trim().replace("#", "");
    if (!/^[0-9a-fA-F]{6}$/.test(clean)) return null;
    return [
      parseInt(clean.slice(0, 2), 16),
      parseInt(clean.slice(2, 4), 16),
      parseInt(clean.slice(4, 6), 16),
    ];
  };

  const pastelRgb = (hex, intensity = 0.85) => {
    const rgb = hexToRgb(hex);
    if (!rgb) return null;
    return rgb.map((v) => Math.round(v * (1 - intensity) + 255 * intensity));
  };

  const doc = new jsPDF("l", "mm", "a4");
  let cursorY = 15;

  doc.setFontSize(16);
  doc.setTextColor(40);
  doc.text(title, 14, cursorY);
  cursorY += 6;

  if (subTitle) {
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(subTitle, 14, cursorY);
    cursorY += 5;
  }

  const dateStr = format(new Date(), "d 'de' MMMM, yyyy", { locale: es });
  doc.setFontSize(8);
  doc.setTextColor(140);
  doc.text(`Generado el ${dateStr}`, 14, cursorY);
  cursorY += 4;

  autoTable(doc, {
    startY: cursorY,
    head: [[
      "Fecha",
      "Hora",
      "Programa",
      "Ensambles/Familias",
      "Locación/Localidad",
      "Estado del Venue",
      "Repertorio",
    ]],
    body: (rows || []).map((row) => [
      row.fecha || "-",
      row.hora || "-",
      row.programa || "-",
      row.participantes || "-",
      row.locacionLocalidad || "-",
      row.estadoVenue || "-",
      Array.isArray(row.repertorioLines) && row.repertorioLines.length > 0
        ? row.repertorioLines.map((line) => `• ${line}`).join("\n")
        : row.repertorio || "-",
    ]),
    theme: "grid",
    styles: {
      fontSize: 7,
      cellPadding: 2,
      valign: "top",
      overflow: "linebreak",
      lineColor: [220, 220, 220],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: 255,
      fontStyle: "bold",
      halign: "left",
    },
    columnStyles: {
      0: { cellWidth: 18 },
      1: { cellWidth: 14 },
      2: { cellWidth: 36 },
      3: { cellWidth: 38 },
      4: { cellWidth: 34 },
      5: { cellWidth: 28 },
      6: { cellWidth: "auto" },
    },
    didParseCell: (data) => {
      if (data.section !== "body") return;
      if (data.column.index !== 5) return;
      const source = rows?.[data.row.index];
      const color = pastelRgb(source?.estadoVenueColor);
      if (!color) return;
      data.cell.styles.fillColor = color;
      data.cell.styles.fontStyle = "bold";
      data.cell.styles.textColor = [15, 23, 42];
    },
  });

  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `Página ${i} de ${pageCount}`,
      doc.internal.pageSize.width - 14,
      doc.internal.pageSize.height - 8,
      { align: "right" },
    );
  }

  const safeTitle = String(title || "Gestion_Conciertos").replace(
    /[^a-z0-9]/gi,
    "_",
  );
  doc.save(`${safeTitle}_${format(new Date(), "yyyy-MM-dd")}.pdf`);
};

/**
 * Exporta reporte de audiencia filtrada con desglose y total.
 */
export const exportAudienceReportToPDF = (
  rows,
  {
    title = "Reporte de Audiencia",
    subTitle = "",
  } = {},
) => {
  const doc = new jsPDF("l", "mm", "a4");
  let cursorY = 15;

  const safeRows = Array.isArray(rows) ? rows : [];
  const totalAudiencia = safeRows.reduce(
    (acc, row) => acc + (Number(row?.audiencia) || 0),
    0,
  );

  const byProgramType = safeRows.reduce((acc, row) => {
    const key = String(row?.tipo_programa || "Sin tipo");
    acc[key] = (acc[key] || 0) + (Number(row?.audiencia) || 0);
    return acc;
  }, {});

  doc.setFontSize(16);
  doc.setTextColor(40);
  doc.text(title, 14, cursorY);
  cursorY += 6;

  if (subTitle) {
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(subTitle, 14, cursorY);
    cursorY += 5;
  }

  const dateStr = format(new Date(), "d 'de' MMMM, yyyy", { locale: es });
  doc.setFontSize(8);
  doc.setTextColor(140);
  doc.text(`Generado el ${dateStr}`, 14, cursorY);
  cursorY += 4;

  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(`Total audiencia filtrada: ${totalAudiencia}`, 14, cursorY);
  cursorY += 2;

  autoTable(doc, {
    startY: cursorY + 2,
    head: [["Fecha", "Hora", "Programa", "Tipo", "Ensambles", "Locación", "Audiencia"]],
    body: safeRows.map((row) => [
      row?.fecha || "-",
      row?.hora || "-",
      row?.programa || "-",
      row?.tipo_programa || "-",
      Array.isArray(row?.ensamblesNombres) && row.ensamblesNombres.length > 0
        ? row.ensamblesNombres.join(", ")
        : "-",
      row?.locacionLocalidad || "-",
      String(Number(row?.audiencia) || 0),
    ]),
    theme: "grid",
    styles: {
      fontSize: 7,
      cellPadding: 2,
      valign: "top",
      overflow: "linebreak",
      lineColor: [220, 220, 220],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: 255,
      fontStyle: "bold",
      halign: "left",
    },
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: 14 },
      2: { cellWidth: 62 },
      3: { cellWidth: 28 },
      4: { cellWidth: 55 },
      5: { cellWidth: 60 },
      6: { cellWidth: 20, halign: "right", fontStyle: "bold" },
    },
  });

  const firstTableEndY = doc.lastAutoTable?.finalY || cursorY + 8;
  const blockStartY = firstTableEndY + 6;

  autoTable(doc, {
    startY: blockStartY,
    head: [["Desglose por tipo de programa", "Audiencia"]],
    body: Object.entries(byProgramType)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => [name, String(value)]),
    theme: "grid",
    styles: {
      fontSize: 8,
      cellPadding: 2,
      lineColor: [220, 220, 220],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [71, 85, 105],
      textColor: 255,
      fontStyle: "bold",
    },
    columnStyles: {
      0: { cellWidth: 80 },
      1: { cellWidth: 25, halign: "right", fontStyle: "bold" },
    },
    margin: { left: 14 },
    tableWidth: "wrap",
  });

  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `Página ${i} de ${pageCount}`,
      doc.internal.pageSize.width - 14,
      doc.internal.pageSize.height - 8,
      { align: "right" },
    );
  }

  const safeTitle = String(title || "Reporte_Audiencia").replace(/[^a-z0-9]/gi, "_");
  doc.save(`${safeTitle}_${format(new Date(), "yyyy-MM-dd")}.pdf`);
};