import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { DEFAULT_CARGO } from './giraUtils';
import { formatDdMmYy } from './dates';

// --- CONFIGURACIÓN DE CELDAS (Mapeo Actualizado) ---
const CELL_MAP = {
  // Datos Personales
  nombre: 'D4',
  cargo: 'C5',
  jornada: 'C6',
  ciudad_origen: 'C7',
  lugar_comision: 'C8',
  motivo: 'C9',
  asiento_habitual: 'C10',
  
  // Fechas y Horas
  fecha_salida: 'C13',
  hora_salida: 'F13',
  fecha_llegada: 'C14',
  hora_llegada: 'F14',
  
  // Cálculo Días
  dias_computables: 'C16',
  
  // Importes Base
  gasto_alojamiento: 'G18',
  subtotal: 'G20',        
  es_temporada_alta: 'G22', 
  
  // --- MOVILIDAD (Ajustado según tus indicaciones) ---
  gasto_pasajes: 'G22', // Asumo que subió junto con el resto
  
  check_aereo: 'B23',     // <--- CORREGIDO
  check_terrestre: 'D23', // <--- CORREGIDO
  
  patente_oficial: 'D24',        // Asumo que está al lado del check
  check_patente_oficial: 'E24',  // <--- CORREGIDO
  
  patente_particular: 'D25',     // Asumo que está al lado del check
  check_patente_particular: 'E25', // <--- CORREGIDO
  
  check_otros: 'C26',            // <--- CORREGIDO
  transporte_otros_monto: 'G26', // Asumo que está en la misma fila
  
  // --- GASTOS ---
  gasto_combustible: 'E30',
  gasto_otros: 'E32',
  gastos_capacit: 'E35',
  gastos_movil_otros: 'E39',
  
  // Totales y Pie
  total_final: 'G41',
  lugar_fecha_pie: 'C49'
};

// Coordenadas para pegar la firma (Ajustar si la imagen no cae bien)
const FIRMA_COORDS = {
  tl: { col: 0.5, row: 44.5 }, // Columna A (0), Fila 45 aprox
  br: { col: 3.5, row: 48.5 }  // Columna D (3), Fila 49 aprox
};

// --- HELPERS ---
const fmtMoney = (val) => (val && val !== '' ? parseFloat(val) : 0);

// Devuelve X para marcar la celda. 
// Asegúrate de que en el Excel la celda tenga Alineación: Centro.
const getCheck = (val) => (val ? "X" : "");

const fetchFileBuffer = async (url) => {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const contentType = res.headers.get("content-type");
    if (contentType && contentType.includes("text/html")) {
        throw new Error("El archivo devuelto es HTML (posiblemente 404)");
    }
    return await res.arrayBuffer();
  } catch (e) {
    console.error("Error cargando recurso:", url, e);
    return null;
  }
};

/**
 * Función robusta para clonar hoja manteniendo estilos y merges
 */
const duplicateSheet = (workbook, templateSheet, newSheetName) => {
  const newSheet = workbook.addWorksheet(newSheetName, {
    pageSetup: templateSheet.pageSetup,
    properties: templateSheet.properties,
    views: templateSheet.views,
  });

  // 1. Copiar Columnas (Anchos)
  if (templateSheet.columns) {
    newSheet.columns = templateSheet.columns.map(col => ({ 
      key: col.key,
      width: col.width, 
      style: col.style
    }));
  }

  // 2. Copiar Filas, Valores y Estilos
  templateSheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
    const newRow = newSheet.getRow(rowNumber);
    newRow.height = row.height;
    
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const newCell = newRow.getCell(colNumber);
      newCell.value = cell.value;
      // Clonar estilo para evitar referencias cruzadas
      if (cell.style) newCell.style = JSON.parse(JSON.stringify(cell.style));
      if (cell.numFmt) newCell.numFmt = cell.numFmt;
    });
    newRow.commit();
  });

  // 3. Copiar Celdas Fusionadas (Merges)
  const merges = templateSheet._merges || (templateSheet.model && templateSheet.model.merges);
  if (merges) {
      Object.keys(merges).forEach(merge => {
          try { newSheet.mergeCells(merge); } catch(e) {}
      });
  }

  // 4. Copiar Imágenes estáticas del template (Logos, etc)
  const images = templateSheet.getImages();
  if (images && images.length > 0) {
      images.forEach(img => {
          newSheet.addImage(img.imageId, img.range);
      });
  }

  return newSheet;
};

// --- FUNCIÓN PRINCIPAL ---
export const exportViaticosToExcel = async (giraData, viaticosData, configData) => {
  // 1. Cargar Plantilla
  const templateBuffer = await fetchFileBuffer('/plantillas/modelo_viatico.xlsx');
  if (!templateBuffer) return alert("Error: No se encontró /public/plantillas/modelo_viatico.xlsx");

  const workbook = new ExcelJS.Workbook();
  try {
      await workbook.xlsx.load(templateBuffer);
  } catch (err) {
      return alert("El archivo modelo no es válido o está dañado.");
  }

  if (workbook.worksheets.length === 0) return alert("El Excel modelo está vacío.");
  const templateSheet = workbook.worksheets[0];

  // 2. Procesar cada integrante (excluyendo ausentes por seguridad)
  const effectiveViaticos = (viaticosData || []).filter((row) => {
    if (!row) return false;
    const estado = row.estado_gira || row.estado || null;
    return estado !== 'ausente';
  });

  for (let i = 0; i < effectiveViaticos.length; i++) {
    const data = effectiveViaticos[i];
    
    // Nombre seguro para la hoja (Excel no permite caracteres raros)
    const safeName = `${data.apellido} ${data.nombre}`.substring(0, 30).replace(/[\\/?*\[\]]/g, '');
    
    // Si es el primero usamos la hoja template, sino clonamos
    let ws;
    if (i === 0) {
        ws = templateSheet;
        ws.name = safeName;
    } else {
        ws = duplicateSheet(workbook, templateSheet, safeName);
    }

    // Helper para escribir valor
    const setVal = (cellId, value) => {
        if (!cellId) return;
        try { ws.getCell(cellId).value = value; } catch(e) {}
    };

    // --- RELLENAR DATOS ---
    const nombreCompleto = `${data.nombre} ${data.apellido}`;
    const localidad = data.ciudad_origen || 'Viedma';
    
    setVal(CELL_MAP.nombre, nombreCompleto);
    setVal(CELL_MAP.cargo, data.cargo || DEFAULT_CARGO);
    setVal(CELL_MAP.jornada, data.jornada_laboral);
    setVal(CELL_MAP.ciudad_origen, localidad);
    setVal(CELL_MAP.asiento_habitual, localidad);
    
    setVal(CELL_MAP.lugar_comision, configData.lugar_comision);
    // Motivo: primero el valor propio de la fila, si no hay usamos el motivo general
    setVal(CELL_MAP.motivo, data.motivo || configData.motivo);

    setVal(CELL_MAP.fecha_salida, formatDdMmYy(data.fecha_salida));
    setVal(CELL_MAP.hora_salida, data.hora_salida);
    setVal(CELL_MAP.fecha_llegada, formatDdMmYy(data.fecha_llegada));
    setVal(CELL_MAP.hora_llegada, data.hora_llegada);
    
    setVal(CELL_MAP.dias_computables, data.dias_computables);
    
    // Importes
    setVal(CELL_MAP.gasto_alojamiento, fmtMoney(data.gasto_alojamiento));
    setVal(CELL_MAP.subtotal, fmtMoney(data.subtotal));
    setVal(CELL_MAP.es_temporada_alta, getCheck(data.es_temporada_alta));
    
    // Movilidad (Aquí es donde pusiste los checkboxes)
    setVal(CELL_MAP.gasto_pasajes, fmtMoney(data.gasto_pasajes));
    setVal(CELL_MAP.check_aereo, getCheck(data.check_aereo));
    setVal(CELL_MAP.check_terrestre, getCheck(data.check_terrestre));
    
    setVal(CELL_MAP.patente_oficial, data.patente_oficial);
    setVal(CELL_MAP.check_patente_oficial, getCheck(data.check_patente_oficial));
    
    setVal(CELL_MAP.patente_particular, data.patente_particular);
    setVal(CELL_MAP.check_patente_particular, getCheck(data.check_patente_particular));
    
    setVal(CELL_MAP.check_otros, getCheck(data.check_otros));
    setVal(CELL_MAP.transporte_otros_monto, fmtMoney(data.transporte_otros));
    
    // Otros Gastos
    setVal(CELL_MAP.gasto_combustible, fmtMoney(data.gasto_combustible));
    setVal(CELL_MAP.gasto_otros, fmtMoney(data.gasto_otros));
    setVal(CELL_MAP.gastos_capacit, fmtMoney(data.gastos_capacit));
    setVal(CELL_MAP.gastos_movil_otros, fmtMoney(data.gastos_movil_otros));
    
    setVal(CELL_MAP.total_final, fmtMoney(data.totalFinal));
    
    // Pie (fecha con año YYYY)
    const dateStr = formatDdMmYy(new Date());
    setVal(CELL_MAP.lugar_fecha_pie, `${localidad}, ${dateStr}`);

    // --- INSERTAR FIRMA ---
    if (data.firma && data.firma !== 'NULL') {
        const imageBuffer = await fetchFileBuffer(data.firma);
        if (imageBuffer) {
            const imageId = workbook.addImage({
                buffer: imageBuffer,
                extension: 'png',
            });
            ws.addImage(imageId, {
                tl: FIRMA_COORDS.tl,
                br: FIRMA_COORDS.br
            });
        }
    }
  }

  // 3. Descargar
  const buffer = await workbook.xlsx.writeBuffer();
  const safeName = (giraData?.nombre_gira || 'Gira').replace(/[^a-z0-9]/gi, '_');
  saveAs(new Blob([buffer]), `Viaticos_${safeName}.xlsx`);
};

/**
 * Exporta la grilla de conciertos filtrada a Excel.
 */
export const exportConciertosToExcel = async (
  rows,
  fileName = "Gestion_Conciertos",
) => {
  const hexToRgb = (hex) => {
    const clean = String(hex || "").trim().replace("#", "");
    if (!/^[0-9a-fA-F]{6}$/.test(clean)) return null;
    return {
      r: parseInt(clean.slice(0, 2), 16),
      g: parseInt(clean.slice(2, 4), 16),
      b: parseInt(clean.slice(4, 6), 16),
    };
  };

  const pastelFromHex = (hex, intensity = 0.85) => {
    const rgb = hexToRgb(hex);
    if (!rgb) return null;
    const blend = (value) =>
      Math.round(value * (1 - intensity) + 255 * intensity)
        .toString(16)
        .padStart(2, "0");
    return `FF${blend(rgb.r)}${blend(rgb.g)}${blend(rgb.b)}`.toUpperCase();
  };

  const argbFromHex = (hex) => {
    const rgb = hexToRgb(hex);
    if (!rgb) return null;
    return `FF${String(hex).trim().replace("#", "").toUpperCase()}`;
  };

  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet("Conciertos");
  const WRAP_COLUMN_KEYS = [
    "programa",
    "participantes",
    "locacionLocalidad",
    "repertorio",
  ];

  const estimateCellLines = (value, columnWidth) => {
    if (value == null) return 1;
    const txt = String(value);
    if (!txt.trim()) return 1;
    const hardLines = txt.split(/\r?\n/);
    const charsPerVisualLine = Math.max(8, Math.floor((columnWidth || 20) * 1.15));
    return hardLines.reduce((total, line) => {
      const len = String(line || "").length;
      const wrapped = Math.max(1, Math.ceil(len / charsPerVisualLine));
      return total + wrapped;
    }, 0);
  };

  ws.columns = [
    { header: "Fecha", key: "fecha", width: 12 },
    { header: "Hora", key: "hora", width: 10 },
    { header: "Programa", key: "programa", width: 36 },
    { header: "Ensambles/Familias", key: "participantes", width: 48 },
    { header: "Locación/Localidad", key: "locacionLocalidad", width: 34 },
    { header: "Estado del Venue", key: "estadoVenue", width: 22 },
    { header: "Repertorio", key: "repertorio", width: 64 },
  ];

  ws.getRow(1).font = { bold: true };
  ws.getRow(1).alignment = { vertical: "middle", horizontal: "center" };

  (rows || []).forEach((row) => {
    const repertorioLines = Array.isArray(row.repertorioLines)
      ? row.repertorioLines
      : String(row.repertorio || "")
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean);
    ws.addRow({
      fecha: row.fecha || "",
      hora: row.hora || "",
      programa: row.programa || "",
      participantes: row.participantes || "",
      locacionLocalidad: row.locacionLocalidad || "",
      estadoVenue: row.estadoVenue || "",
      repertorio:
        repertorioLines.length > 0
          ? repertorioLines.map((line) => `• ${line}`).join("\n")
          : row.repertorio || "",
    });
  });

  ws.eachRow((excelRow, rowNumber) => {
    excelRow.alignment = {
      vertical: "top",
      horizontal: rowNumber === 1 ? "center" : "left",
      wrapText: true,
    };

    excelRow.eachCell({ includeEmpty: true }, (cell) => {
      cell.border = {
        top: { style: "thin", color: { argb: "FF1F2937" } },
        left: { style: "thin", color: { argb: "FF1F2937" } },
        bottom: { style: "thin", color: { argb: "FF1F2937" } },
        right: { style: "thin", color: { argb: "FF1F2937" } },
      };
    });

    if (rowNumber > 1) {
      const source = rows[rowNumber - 2] || {};
      const maxLines = WRAP_COLUMN_KEYS.reduce((acc, key) => {
        const col = ws.columns.find((c) => c.key === key);
        const lines = estimateCellLines(source[key], col?.width);
        return Math.max(acc, lines);
      }, 1);
      excelRow.height = Math.max(22, Math.min(240, maxLines * 14));
    }
  });

  (rows || []).forEach((row, idx) => {
    const excelRow = ws.getRow(idx + 2);
    const statusCell = excelRow.getCell("estadoVenue");
    const bgColor = pastelFromHex(row?.estadoVenueColor);
    const fgColor = argbFromHex(row?.estadoVenueColor);
    if (bgColor) {
      statusCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: bgColor },
      };
      statusCell.font = {
        ...(statusCell.font || {}),
        bold: true,
        color: fgColor ? { argb: fgColor } : undefined,
      };
      statusCell.alignment = {
        ...(statusCell.alignment || {}),
        horizontal: "center",
        vertical: "middle",
      };
    }
  });

  const safeName = String(fileName || "Gestion_Conciertos").replace(
    /[^a-z0-9_-]/gi,
    "_",
  );
  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), `${safeName}.xlsx`);
};