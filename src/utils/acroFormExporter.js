import { PDFDocument } from 'pdf-lib';
import download from 'downloadjs';

// Mapa de URLs de tus plantillas (deben estar en la carpeta public/)
const TEMPLATES = {
    VIATICO: '/plantillas/plantilla_viatico.pdf',
    DESTAQUE: '/plantillas/plantilla_destaque.pdf',
    RENDICION: '/plantillas/plantilla_rendicion.pdf'
};

export const generateAcroFormsBatch = async (dataList, type, giraInfo) => {
    try {
        // 1. Cargar la plantilla correcta
        let templateUrl = TEMPLATES.VIATICO; // Default
        if (type === 'DESTAQUE') templateUrl = TEMPLATES.DESTAQUE;
        if (type === 'RENDICION') templateUrl = TEMPLATES.RENDICION;

        const formBytes = await fetch(templateUrl).then(res => res.arrayBuffer());
        
        // 2. Crear un documento PDF unificado (o podrías hacer un ZIP con individuales)
        const mergedPdf = await PDFDocument.create();

        for (const persona of dataList) {
            // Cargar plantilla base para cada persona
            const pdfDoc = await PDFDocument.load(formBytes);
            const form = pdfDoc.getForm();

            // 3. Rellenar Campos (Mapeo Seguro)
            const safeSet = (field, value) => {
                try {
                    const f = form.getTextField(field);
                    if (f) f.setText(String(value || ''));
                } catch (e) {
                    // Campo no existe en el PDF, ignoramos silenciosamente
                }
            };

            // Datos Personales
            safeSet('nombre_completo', `${persona.apellido}, ${persona.nombre}`);
            safeSet('dni', persona.dni);
            safeSet('cbu', persona.cbu);
            safeSet('alias', persona.alias);
            safeSet('banco', persona.banco);
            
            // Datos Gira
            safeSet('nombre_gira', giraInfo.nombre);
            safeSet('mes_gira', giraInfo.mes);
            safeSet('fecha_generacion', new Date().toLocaleDateString());

            // Cálculos
            const totalViatico = (persona.dias_v || 0) * (persona.monto_v || 0);
            const totalDestaque = (persona.dias_d || 0) * (persona.monto_d || 0);
            const total = totalViatico + totalDestaque;

            if (type === 'VIATICO' || type === 'TODO') {
                safeSet('dias_viatico', persona.dias_v);
                safeSet('monto_diario_viatico', persona.monto_v);
                safeSet('total_viatico', totalViatico);
            }

            if (type === 'DESTAQUE' || type === 'TODO') {
                safeSet('dias_destaque', persona.dias_d);
                safeSet('monto_diario_destaque', persona.monto_d);
                safeSet('total_destaque', totalDestaque);
            }

            safeSet('total_percibir', total);

            // Aplanar formulario (para que no sea editable)
            form.flatten();

            // Copiar páginas al documento maestro
            const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
            copiedPages.forEach((page) => mergedPdf.addPage(page));
        }

        // 4. Guardar y Descargar
        const pdfBytes = await mergedPdf.save();
        download(pdfBytes, `Exportacion_${type}_${giraInfo.nombre}.pdf`, "application/pdf");

    } catch (error) {
        console.error("Error generando PDF:", error);
        alert("Error generando PDF. Verifica que la plantilla exista en /public/plantillas/");
    }
};