import { PDFDocument } from 'pdf-lib';
import { saveAs } from 'file-saver';

// Helper para descargar archivos
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

// Helper para formato moneda
const fmtMoney = (val) => {
  if (val === undefined || val === null || val === "") return "";
  // Formatear a string con 2 decimales
  return parseFloat(val).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// Helper fecha
const fmtDate = (isoStr) => {
  if (!isoStr) return '';
  const [y, m, d] = isoStr.split('-');
  return `${d}/${m}/${y}`;
};

export const exportViaticosToPDFForm = async (giraData, viaticosData, configData) => {
  // 1. Cargar la Plantilla PDF (AcroForm)
  const templateBuffer = await fetchFileBuffer('/plantillas/formulario_viatico.pdf');
  if (!templateBuffer) return alert("No se encontró la plantilla PDF en public/plantillas/");

  // Creamos un documento nuevo que contendrá todas las páginas
  const finalPdf = await PDFDocument.create();

  for (const data of viaticosData) {
    // Cargamos la plantilla para esta iteración
    const srcDoc = await PDFDocument.load(templateBuffer);
    const form = srcDoc.getForm();

    // --- RELLENADO DE CAMPOS POR NOMBRE ---
    // (Asegúrate que estos nombres coincidan con los que pusiste en el PDF)
    
    try {
      // Datos Personales
      form.getTextField('nombre_apellido').setText(`${data.apellido}, ${data.nombre}`);
      form.getTextField('cargo').setText(data.cargo || '');
      form.getTextField('jornada').setText(data.jornada_laboral || '');
      form.getTextField('origen').setText(data.ciudad_origen || 'Viedma');
      form.getTextField('destino').setText(configData.lugar_comision || '');
      form.getTextField('motivo').setText(configData.motivo || '');
      
      // Fechas
      form.getTextField('fecha_salida').setText(fmtDate(data.fecha_salida));
      form.getTextField('hora_salida').setText(data.hora_salida || '');
      form.getTextField('fecha_llegada').setText(fmtDate(data.fecha_llegada));
      form.getTextField('hora_llegada').setText(data.hora_llegada || '');
      form.getTextField('dias_computables').setText(String(data.dias_computables || 0));

      // Importes
      form.getTextField('importe_alojamiento').setText(fmtMoney(data.gasto_alojamiento));
      form.getTextField('importe_anticipo').setText(fmtMoney(data.subtotal));
      form.getTextField('importe_pasajes').setText(fmtMoney(data.gasto_pasajes));
      form.getTextField('importe_combustible').setText(fmtMoney(data.gasto_combustible));
      form.getTextField('importe_otros').setText(fmtMoney(data.gasto_otros));
      form.getTextField('importe_capacitacion').setText(fmtMoney(data.gastos_capacit));
      form.getTextField('importe_movil_otros').setText(fmtMoney(data.gastos_movil_otros));
      form.getTextField('importe_total').setText(fmtMoney(data.totalFinal));

      // Detalle Cálculo (Campo de texto largo)
      const txtCalc = `${data.dias_computables} días al valor diario calculado.`;
      form.getTextField('detalle_calculo').setText(txtCalc);

      // Checkboxes (Deben ser checkboxes reales en el PDF)
      if (data.es_temporada_alta) form.getCheckBox('check_temporada').check();
      if (data.check_aereo) form.getCheckBox('check_aereo').check();
      if (data.check_terrestre) form.getCheckBox('check_terrestre').check();
      if (data.check_patente_oficial) form.getCheckBox('check_oficial').check();
      if (data.check_patente_particular) form.getCheckBox('check_particular').check();
      
      // Campos condicionales de texto
      if (data.patente_oficial) form.getTextField('patente_oficial').setText(data.patente_oficial);
      if (data.patente_particular) form.getTextField('patente_particular').setText(data.patente_particular);

      // Pie
      const today = new Date();
      const dateStr = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;
      form.getTextField('lugar_fecha').setText(`${data.ciudad_origen || 'Viedma'}, ${dateStr}`);

    } catch (err) {
      console.warn("Algún campo no se encontró en el PDF:", err.message);
    }

    // --- INSERTAR FIRMA (EL TRUCO) ---
    // Buscamos el campo 'firma_placeholder' para obtener sus coordenadas
    if (data.firma && data.firma !== 'NULL') {
      try {
        const firmaField = form.getTextField('firma_placeholder');
        if (firmaField) {
            // Obtenemos coordenadas y dimensiones del campo
            const widgets = firmaField.acroField.getWidgets();
            const rect = widgets[0].getRect(); // { x, y, width, height }
            
            // Descargamos la imagen
            const firmaBuffer = await fetchImageBuffer(data.firma);
            if (firmaBuffer) {
                const firmaImage = await srcDoc.embedPng(firmaBuffer);
                const page = srcDoc.getPages()[0];
                
                // Dibujamos la imagen EXACTAMENTE donde estaba el campo de texto
                // Ajustamos aspect ratio para que no se deforme
                const dims = firmaImage.scaleToFit(rect.width, rect.height);
                
                page.drawImage(firmaImage, {
                    x: rect.x + (rect.width - dims.width) / 2, // Centrado horizontal
                    y: rect.y + (rect.height - dims.height) / 2, // Centrado vertical
                    width: dims.width,
                    height: dims.height,
                });
            }
            // Borramos el texto del placeholder (o el campo mismo)
            firmaField.setText(''); 
        }
      } catch (e) {
          console.error("Error al procesar firma:", e);
      }
    }

    // Aplanar el formulario (convierte campos editables en texto fijo)
    form.flatten();

    // Copiar la página procesada al documento final
    const [copiedPage] = await finalPdf.copyPages(srcDoc, [0]);
    finalPdf.addPage(copiedPage);
  }

  // 3. Descargar
  const pdfBytes = await finalPdf.save();
  const safeName = (giraData?.nombre_gira || 'Gira').replace(/[^a-z0-9]/gi, '_');
  saveAs(new Blob([pdfBytes], { type: 'application/pdf' }), `Viaticos_${safeName}.pdf`);
};