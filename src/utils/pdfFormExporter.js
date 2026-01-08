import { PDFDocument } from 'pdf-lib';
import { saveAs } from 'file-saver';

// --- HELPERS ---
const fetchFileBuffer = async (url) => {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.arrayBuffer();
  } catch (e) {
    console.error("Error cargando:", url);
    return null;
  }
};

const fmtMoney = (val) => {
  if (val === undefined || val === null || val === "") return "";
  return parseFloat(val).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const fmtDate = (isoStr) => {
  if (!isoStr) return '';
  const [y, m, d] = isoStr.split('-');
  return `${d}/${m}/${y}`;
};

// Calcula Devolución (negativo) o Reintegro (positivo)
// Retorna strings formateados para los campos _dev y _reint
const calcDiff = (ant, rend) => {
  const a = parseFloat(ant || 0);
  const r = parseFloat(rend || 0);
  const diff = r - a;
  
  // Si diff < 0 sobra dinero (Devolución)
  // Si diff > 0 falta dinero (Reintegro)
  return {
    dev: diff < 0 ? fmtMoney(Math.abs(diff)) : "",
    reint: diff > 0 ? fmtMoney(diff) : ""
  };
};

// Helper para sumar totales de rendición
const sumRendicion = (data) => {
  const fields = [
    'rendicion_viaticos',
    'rendicion_gasto_alojamiento',
    'rendicion_gasto_pasajes', // Nota: a veces llamado gasto_otros en DB para pasajes
    'rendicion_gasto_combustible',
    'rendicion_gastos_movil_otros',
    'rendicion_gastos_capacit',
    'rendicion_gasto_ceremonial', // Si existe
    'rendicion_transporte_otros' // Otros gastos
  ];
  return fields.reduce((acc, f) => acc + parseFloat(data[f] || 0), 0);
};

// --- FUNCIÓN PRINCIPAL EXPORTADORA ---
export const exportViaticosToPDFForm = async (giraData, viaticosData, configData, mode = 'viatico') => {
  // 1. Seleccionar Plantilla
  const templateName = mode === 'rendicion' ? 'plantilla_rendicion.pdf' : 'plantilla_viaticos.pdf';
  const templateBuffer = await fetchFileBuffer(`/plantillas/${templateName}`);
  
  if (!templateBuffer) return alert(`No se encontró /plantillas/${templateName}`);

  // Documento final (merged)
  const finalPdf = await PDFDocument.create();

  for (const data of viaticosData) {
    const srcDoc = await PDFDocument.load(templateBuffer);
    const form = srcDoc.getForm();

    // Datos comunes
    const nombreCompleto = `${data.apellido}, ${data.nombre}`;
    const hoy = new Date();
    const lugarFecha = `${data.ciudad_origen || 'Viedma'}, ${hoy.toLocaleDateString('es-AR')}`;

    try {
      // ---------------------------------------------------------
      // MODO RENDICIÓN
      // ---------------------------------------------------------
      if (mode === 'rendicion') {
        const f = (name, val) => { try { form.getTextField(name).setText(String(val || '')); } catch(e){} };

        // Cabecera
        f('nombre_y_apellido', nombreCompleto);
        f('cargo', data.cargo);
        f('jornada', data.jornada_laboral);
        f('ciudad_origen', data.ciudad_origen || 'Viedma');
        f('lugar_comision', configData.lugar_comision);
        f('motivo', configData.motivo);
        f('asiento_habitual', data.ciudad_origen || 'Viedma');

        // Fechas
        f('dia_salida', fmtDate(data.fecha_salida));
        f('hora_salida', data.hora_salida);
        f('dia_llegada', fmtDate(data.fecha_llegada));
        f('hora_llegada', data.hora_llegada);
        f('dias_computados', data.dias_computables);
        f('valor_diario', fmtMoney(data.valorDiarioCalc)); // Calculado previamente en Manager
        f('porcentaje_viatico', data.porcentaje);
        f('porcentaje_temporada', data.es_temporada_alta ? "ALTA" : "BAJA");

        // --- TABLA DE CÁLCULOS (Anticipo | Rendición | Devolución | Reintegro) ---
        
        // 1. Viáticos
        f('viaticos_ant', fmtMoney(data.subtotal));
        f('viaticos_rend', fmtMoney(data.rendicion_viaticos));
        const cViat = calcDiff(data.subtotal, data.rendicion_viaticos);
        f('viaticos_dev', cViat.dev);
        f('viaticos_reint', cViat.reint);

        // 2. Alojamiento
        f('alojamiento_ant', fmtMoney(data.gasto_alojamiento));
        f('alojamiento_rend', fmtMoney(data.rendicion_gasto_alojamiento));
        const cAloj = calcDiff(data.gasto_alojamiento, data.rendicion_gasto_alojamiento);
        f('alojamiento_dev', cAloj.dev);
        f('alojamiento_reint', cAloj.reint);

        // 3. Pasajes (Usamos gasto_pasajes o gasto_otros según tu lógica anterior)
        // Asumiendo gasto_pasajes para "Pasajes"
        const antPasaje = data.gasto_pasajes || 0; 
        const rendPasaje = data.rendicion_gasto_pasajes || 0; 
        f('pasaje_ant', fmtMoney(antPasaje));
        f('pasaje_rend', fmtMoney(rendPasaje));
        const cPas = calcDiff(antPasaje, rendPasaje);
        f('pasaje_dev', cPas.dev);
        f('pasaje_reint', cPas.reint);

        // 4. Combustible
        f('combustible_ant', fmtMoney(data.gasto_combustible));
        f('combustible_rend', fmtMoney(data.rendicion_gasto_combustible));
        const cComb = calcDiff(data.gasto_combustible, data.rendicion_gasto_combustible);
        f('combustible_dev', cComb.dev);
        f('combustible_reint', cComb.reint);

        // 5. Otros Movilidad (Art 14)
        f('otros_movilidad_ant', fmtMoney(data.gastos_movil_otros));
        f('otros_movilidad_rend', fmtMoney(data.rendicion_gastos_movil_otros));
        const cMovOtr = calcDiff(data.gastos_movil_otros, data.rendicion_gastos_movil_otros);
        f('otros_movilidad_dev', cMovOtr.dev);
        f('otros_movilidad_reint', cMovOtr.reint);

        // 6. Capacitación
        f('capacitacion_ant', fmtMoney(data.gastos_capacit));
        f('capacitacion_rend', fmtMoney(data.rendicion_gastos_capacit));
        const cCap = calcDiff(data.gastos_capacit, data.rendicion_gastos_capacit);
        f('capacitacion_dev', cCap.dev);
        f('capacitacion_reint', cCap.reint);

        // 7. Ceremonial (solo titular)
        // Asumo campos en DB si existen, sino 0
        const antCer = data.gasto_ceremonial || 0;
        const rendCer = data.rendicion_gasto_ceremonial || 0;
        f('gastos_ceremonial_ant', fmtMoney(antCer));
        f('gastos_ceremonial_rend', fmtMoney(rendCer));
        const cCer = calcDiff(antCer, rendCer);
        f('gastos_ceremonial_dev', cCer.dev);
        f('gastos_ceremonial_reint', cCer.reint);

        // 8. Otros Gastos (Peaje, etc)
        // En manager usabas "transporte_otros" o "gasto_otros" para esto. 
        // Usaré transporte_otros como "Otros Gastos Varios"
        const antOtr = data.transporte_otros || 0;
        const rendOtr = data.rendicion_transporte_otros || 0;
        f('otros_gastos_ant', fmtMoney(antOtr));
        f('otros_gastos_rend', fmtMoney(rendOtr));
        const cOtr = calcDiff(antOtr, rendOtr);
        f('otros_gastos_dev', cOtr.dev);
        f('otros_gastos_reint', cOtr.reint);

        // TOTALES
        const totalAnt = data.totalFinal || 0;
        const totalRend = sumRendicion(data);
        f('totales_ant', fmtMoney(totalAnt));
        f('totales_rend', fmtMoney(totalRend));
        const cTot = calcDiff(totalAnt, totalRend);
        f('totales_dev', cTot.dev);
        f('totales_reint', cTot.reint);

        f('lugar_y_fecha', lugarFecha);

        // FIRMA (Placeholder: firma_imagen)
        await insertImageSignature(srcDoc, form, 'firma_imagen', data.firma);

      } 
      // ---------------------------------------------------------
      // MODO VIÁTICO (SOLICITUD)
      // ---------------------------------------------------------
      else {
        const f = (name, val) => { try { form.getTextField(name).setText(String(val || '')); } catch(e){} };
        const chk = (name, val) => { 
            if(val) { try { form.getCheckBox(name).check(); } catch(e){ console.warn("Checkbox no encontrado:", name)} } 
        };

        // Datos Personales
        f('nombre_y_apellido', nombreCompleto);
        f('cargo', data.cargo);
        f('jornada', data.jornada_laboral);
        f('ciudad_origen', data.ciudad_origen || 'Viedma');
        f('lugar_comision', configData.lugar_comision);
        f('motivo', configData.motivo);
        f('asiento_habitual', data.ciudad_origen || 'Viedma');

        // Fechas
        f('dia_salida', fmtDate(data.fecha_salida));
        f('hora_salida', data.hora_salida);
        f('dia_llegada', fmtDate(data.fecha_llegada));
        f('hora_llegada', data.hora_llegada);
        f('dias_computados', data.dias_computables);
        f('valor_diario', fmtMoney(data.valorDiarioCalc));
        f('porcentaje_viatico', data.porcentaje);
        
        // Checkboxes
        chk('check_temporada', data.es_temporada_alta);
        
        // Importes
        f('gasto_alojamiento', fmtMoney(data.gasto_alojamiento));
        
        // Anticipo Viático (Subtotal de días)
        f('gasto_anticipo', fmtMoney(data.subtotal)); 
        const descAnticipo = `${data.dias_computables} días al 100%`;
        f('descripcion_anticipo', descAnticipo);

        // Transporte
        chk('check_aereos', data.check_aereo);
        chk('check_terrestre', data.check_terrestre);
        chk('check_patente', data.check_patente_oficial);
        f('patente', data.patente_oficial);
        
        chk('check_particular', data.check_patente_particular);
        f('patente_particular', data.patente_particular);
        
        chk('check_otro', data.check_otros);
        f('descripcion_otro', data.transporte_otros_detalle || ''); // Si tienes detalle de texto

        // Gastos
        // Nota: "gasto_movilidad" en el form suele ser Pasajes
        f('gasto_movilidad', fmtMoney(data.gasto_pasajes || data.gastos_movilidad)); 
        f('gasto_otro', fmtMoney(data.transporte_otros)); // El monto del transporte "otro"
        f('gasto_combustible', fmtMoney(data.gasto_combustible));
        f('gasto_otros', fmtMoney(data.gasto_otros)); // Peajes etc
        f('gasto_capacitacion', fmtMoney(data.gastos_capacit));
        f('gasto_ceremonial', fmtMoney(data.gasto_ceremonial));
        f('gasto_otros_movilidad', fmtMoney(data.gastos_movil_otros));

        f('total_anticipo', fmtMoney(data.totalFinal));
        f('lugar_y_fecha', lugarFecha);

        // FIRMA (Placeholder: firma_link)
        await insertImageSignature(srcDoc, form, 'firma_link', data.firma);
      }

    } catch (err) {
      console.warn("Error rellenando campos PDF:", err);
    }

    form.flatten();
    const [copiedPage] = await finalPdf.copyPages(srcDoc, [0]);
    finalPdf.addPage(copiedPage);
  }

  // Descarga
  const pdfBytes = await finalPdf.save();
  const safeName = (giraData?.nombre || 'Gira').replace(/[^a-z0-9]/gi, '_');
  const fileName = `${mode === 'rendicion' ? 'Rendiciones' : 'Viaticos'}_${safeName}.pdf`;
  
  // Retornamos los bytes para que el Manager decida si descargar o subir a Drive
  return pdfBytes;
};


// Helper interno para insertar firma
async function insertImageSignature(pdfDoc, form, fieldName, firmaUrl) {
  if (!firmaUrl || firmaUrl === 'NULL') return;
  try {
    const firmaField = form.getTextField(fieldName);
    if (!firmaField) return;

    const widgets = firmaField.acroField.getWidgets();
    const rect = widgets[0].getRect();
    
    // Descargar imagen
    const imgBuffer = await fetchFileBuffer(firmaUrl);
    if (!imgBuffer) return;

    const isPng = firmaUrl.toLowerCase().endsWith('.png');
    const isJpg = firmaUrl.toLowerCase().match(/\.(jpeg|jpg)$/);

    let imageEmbed;
    if (isPng) imageEmbed = await pdfDoc.embedPng(imgBuffer);
    else if (isJpg) imageEmbed = await pdfDoc.embedJpg(imgBuffer);
    else return; // Formato no soportado

    const page = pdfDoc.getPages()[0];
    const { width, height } = imageEmbed.scaleToFit(rect.width, rect.height);

    page.drawImage(imageEmbed, {
      x: rect.x + (rect.width - width) / 2,
      y: rect.y + (rect.height - height) / 2,
      width,
      height
    });

    firmaField.setText(''); // Limpiar texto del placeholder
  } catch (e) {
    console.error("Error insertando firma:", e);
  }
}