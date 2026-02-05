import { PDFDocument, PDFName, PDFNumber } from "pdf-lib";
import { saveAs } from "file-saver";

// --- HELPERS ---
const fetchFileBuffer = async (url) => {
  try {
    const res = await fetch(url, {
      method: "GET",
      mode: "cors",
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const contentType = res.headers.get("content-type");
    if (contentType && contentType.includes("text/html")) {
      throw new Error(
        "La URL devolvió HTML en lugar de archivo (probablemente 404/Ruta incorrecta)"
      );
    }

    return await res.arrayBuffer();
  } catch (e) {
    console.warn("Error cargando recurso:", url, e);
    return null;
  }
};

const fmtMoney = (val) => {
  if (val === undefined || val === null || val === "") return "$ 0,00";
  const num = parseFloat(val);
  if (isNaN(num)) return "$ 0,00";
  return (
    "$ " +
    num.toLocaleString("es-AR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
};

const fmtDate = (isoStr) => {
  if (!isoStr) return "";
  const [y, m, d] = isoStr.split("-");
  return `${d}/${m}/${y}`;
};

const fmtTime = (timeStr) => {
  if (!timeStr) return "";
  // Si viene como HH:MM:SS, recortamos a HH:MM
  return timeStr.substring(0, 5);
};

// Calcula Devolución (negativo) o Reintegro (positivo)
const calcDiff = (ant, rend) => {
  const a = parseFloat(ant || 0);
  const r = parseFloat(rend || 0);
  const diff = r - a;

  return {
    dev: diff < 0 ? fmtMoney(Math.abs(diff)) : "",
    reint: diff > 0 ? fmtMoney(diff) : "",
  };
};

const sumRendicion = (data) => {
  const fields = [
    "rendicion_viaticos",
    "rendicion_gasto_alojamiento",
    "rendicion_gasto_pasajes",
    "rendicion_gasto_combustible",
    "rendicion_gastos_movil_otros",
    "rendicion_gastos_capacit",
    "rendicion_gasto_ceremonial",
    "rendicion_transporte_otros",
  ];
  return fields.reduce((acc, f) => acc + parseFloat(data[f] || 0), 0);
};

export const exportViaticosToPDFForm = async (
  giraData,
  viaticosData,
  configData,
  mode = "viatico"
) => {
  // Destaque usa la misma plantilla que Viatico
  const templateName =
    mode === "rendicion" ? "plantilla_rendicion.pdf" : "plantilla_viaticos.pdf";
  const templateBuffer = await fetchFileBuffer(`/plantillas/${templateName}`);

  if (!templateBuffer) {
    alert(
      `Error: No se encontró la plantilla en /public/plantillas/${templateName}`
    );
    throw new Error("Plantilla no encontrada");
  }

  const finalPdf = await PDFDocument.create();

  for (const data of viaticosData) {
    const srcDoc = await PDFDocument.load(templateBuffer);
    const form = srcDoc.getForm();

    const nombreCompleto = `${data.apellido}, ${data.nombre}`;
    const hoy = new Date();
    const lugarFecha = `${
      data.ciudad_origen || "Viedma"
    }, ${hoy.toLocaleDateString("es-AR")}`;

    // HELPER LOCAL PARA MONTOS: Si es destaque devuelve vacío, sino formatea
    const money = (val) => (mode === "destaque" ? "" : fmtMoney(val));

    try {
      if (mode === "rendicion") {
        // ... (Lógica de Rendición se mantiene IDÉNTICA) ...
        const f = (name, val) => {
          try {
            form.getTextField(name).setText(String(val || ""));
          } catch (e) {}
        };

        // Cabecera Rendición
        f("nombre_y_apellido", nombreCompleto);
        f("cargo", data.cargo);
        f("jornada", data.jornada_laboral);
        f("ciudad_origen", data.ciudad_origen || "Viedma");
        f("lugar_comision", configData.lugar_comision);
        f("motivo", data.motivo || configData.motivo);
        f("asiento_habitual", data.ciudad_origen || "Viedma");
        f("dia_salida", fmtDate(data.fecha_salida));
        f("hora_salida", fmtTime(data.hora_salida));
        f("dia_llegada", fmtDate(data.fecha_llegada));
        f("hora_llegada", fmtTime(data.hora_llegada));
        f("dias_computados", data.dias_computables);
        f("valor_diario", fmtMoney(data.valorDiarioCalc));
        f("porcentaje_viatico", data.porcentaje);
        f("porcentaje_temporada", configData.factor_temporada > 0 ? "ALTA" : "BAJA");

        // Tabla Rendición
        f("viaticos_ant", fmtMoney(data.subtotal));
        f("viaticos_rend", fmtMoney(data.rendicion_viaticos));
        const cViat = calcDiff(data.subtotal, data.rendicion_viaticos);
        f("viaticos_dev", cViat.dev);
        f("viaticos_reint", cViat.reint);

        f("alojamiento_ant", fmtMoney(data.gasto_alojamiento));
        f("alojamiento_rend", fmtMoney(data.rendicion_gasto_alojamiento));
        const cAloj = calcDiff(
          data.gasto_alojamiento,
          data.rendicion_gasto_alojamiento
        );
        f("alojamiento_dev", cAloj.dev);
        f("alojamiento_reint", cAloj.reint);

        const antPasaje = data.gasto_pasajes || 0;
        const rendPasaje = data.rendicion_gasto_pasajes || 0;
        f("pasaje_ant", fmtMoney(antPasaje));
        f("pasaje_rend", fmtMoney(rendPasaje));
        const cPas = calcDiff(antPasaje, rendPasaje);
        f("pasaje_dev", cPas.dev);
        f("pasaje_reint", cPas.reint);

        f("combustible_ant", fmtMoney(data.gasto_combustible));
        f("combustible_rend", fmtMoney(data.rendicion_gasto_combustible));
        const cComb = calcDiff(
          data.gasto_combustible,
          data.rendicion_gasto_combustible
        );
        f("combustible_dev", cComb.dev);
        f("combustible_reint", cComb.reint);

        f("otros_movilidad_ant", fmtMoney(data.gastos_movil_otros));
        f("otros_movilidad_rend", fmtMoney(data.rendicion_gastos_movil_otros));
        const cMovOtr = calcDiff(
          data.gastos_movil_otros,
          data.rendicion_gastos_movil_otros
        );
        f("otros_movilidad_dev", cMovOtr.dev);
        f("otros_movilidad_reint", cMovOtr.reint);

        f("capacitacion_ant", fmtMoney(data.gastos_capacit));
        f("capacitacion_rend", fmtMoney(data.rendicion_gastos_capacit));
        const cCap = calcDiff(
          data.gastos_capacit,
          data.rendicion_gastos_capacit
        );
        f("capacitacion_dev", cCap.dev);
        f("capacitacion_reint", cCap.reint);

        const antCer = data.gasto_ceremonial || 0;
        const rendCer = data.rendicion_gasto_ceremonial || 0;
        f("gastos_ceremonial_ant", fmtMoney(antCer));
        f("gastos_ceremonial_rend", fmtMoney(rendCer));
        const cCer = calcDiff(antCer, rendCer);
        f("gastos_ceremonial_dev", cCer.dev);
        f("gastos_ceremonial_reint", cCer.reint);

        const antOtr = data.transporte_otros || 0;
        const rendOtr = data.rendicion_transporte_otros || 0;
        f("otros_gastos_ant", fmtMoney(antOtr));
        f("otros_gastos_rend", fmtMoney(rendOtr));
        const cOtr = calcDiff(antOtr, rendOtr);
        f("otros_gastos_dev", cOtr.dev);
        f("otros_gastos_reint", cOtr.reint);

        const totalAnt = data.totalFinal || 0;
        const totalRend = sumRendicion(data);
        f("totales_ant", fmtMoney(totalAnt));
        f("totales_rend", fmtMoney(totalRend));
        const cTot = calcDiff(totalAnt, totalRend);
        f("totales_dev", cTot.dev);
        f("totales_reint", cTot.reint);

        f("lugar_y_fecha", lugarFecha);
        await insertImageSignature(srcDoc, form, "firma_imagen", data.firma);
      } else {
        // ---------------------------------------------------------
        // MODO VIÁTICO O DESTAQUE
        // ---------------------------------------------------------
        const f = (name, val) => {
          try {
            form.getTextField(name).setText(String(val || ""));
          } catch (e) {}
        };

        // --- CORRECCIÓN AQUÍ: Tratamos checks como TEXTO para poner 'X' ---
        const chk = (name, val) => {
          try {
            // Escribimos "X" si es verdadero, "" si es falso
            form.getTextField(name).setText(val ? "X" : "");
          } catch (e) {
            console.warn(`Campo check (texto) no encontrado: ${name}`);
          }
        };

        f("nombre_y_apellido", nombreCompleto);
        f("cargo", data.cargo);
        f("jornada", data.jornada_laboral);
        f("ciudad_origen", data.ciudad_origen || "Viedma");
        f("lugar_comision", configData.lugar_comision);
        f("motivo", data.motivo || configData.motivo);
        f("asiento_habitual", data.ciudad_origen || "Viedma");

        f("dia_salida", fmtDate(data.fecha_salida));
        f("hora_salida", fmtTime(data.hora_salida));
        f("dia_llegada", fmtDate(data.fecha_llegada));
        f("hora_llegada", fmtTime(data.hora_llegada));
        f("dias_computados", String(data.dias_computables || 0));

        f("valor_diario", money(data.valorDiarioCalc));
        f("porcentaje_viatico", String(data.porcentaje || 0));
// ANTES: chk("check_temporada", data.es_temporada_alta);
chk("check_temporada", configData.factor_temporada > 0);
            f("gasto_alojamiento", money(data.gasto_alojamiento));
        f("gasto_anticipo", money(data.subtotal));

        // Detalle adaptado para destaque
        let descAnticipo;
        if (mode === "destaque") {
          descAnticipo = `( ${
            data.dias_computables || 0
          } días de comisión de servicio )`;
        } else {
          descAnticipo = `( ${
            data.dias_computables || 0
          } días de viáticos a razón de ${fmtMoney(
            data.valorDiarioCalc
          )} diarios -equivalentes al ${
            data.porcentaje || 0
          }% del viático diario)`;
        }
        f("descripcion_anticipo", descAnticipo);

        // Checks como "X"
        chk("check_aereos", data.check_aereo);
        chk("check_terrestre", data.check_terrestre);
        chk("check_patente", data.check_patente_oficial);
        f("patente", data.patente_oficial);
        chk("check_particular", data.check_patente_particular);
        f("patente_particular", data.patente_particular);
        chk("check_otro", data.check_otros);
        f("descripcion_otro", data.transporte_otros_detalle || "");

        // Gastos con helper money()
        f(
          "gasto_movilidad",
          money(data.gasto_pasajes || data.gastos_movilidad)
        );
        f("gasto_otro", money(data.transporte_otros));
        f("gasto_combustible", money(data.gasto_combustible));
        f("gasto_otros", money(data.gasto_otros));
        f("gasto_capacitacion", money(data.gastos_capacit));
        f("gasto_ceremonial", money(data.gasto_ceremonial));
        f("gasto_otros_movilidad", money(data.gastos_movil_otros));

        f("total_anticipo", money(data.totalFinal));
        f("lugar_y_fecha", lugarFecha);

        await insertImageSignature(srcDoc, form, "firma_link", data.firma);
      }
    } catch (err) {
      console.warn("Error rellenando campos PDF:", err);
    }

    form.flatten();
    const [copiedPage] = await finalPdf.copyPages(srcDoc, [0]);
    finalPdf.addPage(copiedPage);
  }

  const pdfBytes = await finalPdf.save();
  return pdfBytes;
};

// --- HELPER ROBUSTO PARA FIRMA ---
async function insertImageSignature(pdfDoc, form, fieldName, firmaUrl) {
  if (!firmaUrl || firmaUrl === "NULL") return;
  const url = firmaUrl.trim();
  if (!url) return;

  try {
    let firmaField;
    try {
      firmaField = form.getTextField(fieldName);
    } catch (e) {
      console.warn(`Campo de firma '${fieldName}' no encontrado.`);
      return;
    }
    if (!firmaField) return;

    const widgets = firmaField.acroField.getWidgets();
    if (!widgets || widgets.length === 0) {
      console.warn(`El campo '${fieldName}' no tiene widgets visuales.`);
      return;
    }

    const widget = widgets[0];
    let rect = null;

    try {
      if (typeof widget.getRect === "function") {
        rect = widget.getRect();
      } else {
        const rawRect = widget.dict.lookup(PDFName.of("Rect"));
        if (rawRect) {
          const llx = rawRect.get(0).asNumber();
          const lly = rawRect.get(1).asNumber();
          const urx = rawRect.get(2).asNumber();
          const ury = rawRect.get(3).asNumber();
          rect = { x: llx, y: lly, width: urx - llx, height: ury - lly };
        }
      }
    } catch (errRect) {
      console.error("Error obteniendo rectángulo de firma:", errRect);
      return;
    }

    if (!rect) return;

    const imgBuffer = await fetchFileBuffer(url);
    if (!imgBuffer) {
      console.warn("No se pudo descargar la firma:", url);
      return;
    }

    const isPng = url.toLowerCase().endsWith(".png");
    const isJpg = url.toLowerCase().match(/\.(jpeg|jpg)$/);

    let imageEmbed;
    if (isPng) imageEmbed = await pdfDoc.embedPng(imgBuffer);
    else if (isJpg) imageEmbed = await pdfDoc.embedJpg(imgBuffer);
    else {
      console.warn("Formato de firma no soportado:", url);
      return;
    }

    const page = pdfDoc.getPages()[0];
    const { width, height } = imageEmbed.scaleToFit(rect.width, rect.height);

    page.drawImage(imageEmbed, {
      x: rect.x + (rect.width - width) / 2,
      y: rect.y + (rect.height - height) / 2,
      width,
      height,
    });

    firmaField.setText("");
  } catch (e) {
    console.error("Error insertando firma:", e);
  }
}