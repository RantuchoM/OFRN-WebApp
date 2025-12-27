import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

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

const fmtDate = (isoStr) => {
  if (!isoStr) return '';
  const [y, m, d] = isoStr.split('-');
  return `${d}/${m}/${y}`;
};

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

  // 2. Procesar cada integrante
  for (let i = 0; i < viaticosData.length; i++) {
    const data = viaticosData[i];
    
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
    setVal(CELL_MAP.cargo, data.cargo || 'Músico');
    setVal(CELL_MAP.jornada, data.jornada_laboral);
    setVal(CELL_MAP.ciudad_origen, localidad);
    setVal(CELL_MAP.asiento_habitual, localidad);
    
    setVal(CELL_MAP.lugar_comision, configData.lugar_comision);
    setVal(CELL_MAP.motivo, configData.motivo);

    setVal(CELL_MAP.fecha_salida, fmtDate(data.fecha_salida));
    setVal(CELL_MAP.hora_salida, data.hora_salida);
    setVal(CELL_MAP.fecha_llegada, fmtDate(data.fecha_llegada));
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
    
    // Pie
    const today = new Date();
    const dateStr = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;
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