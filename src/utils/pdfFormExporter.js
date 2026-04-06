import { PDFArray, PDFBool, PDFDocument, PDFName, PDFNumber, PDFString } from "pdf-lib";
import { saveAs } from "file-saver";
import { firstMondayAfter } from "./dates";
import {
  getAnticipoSubtotalForExport,
  sumGastosViaticoRow,
} from "./viaticosAnticipo";

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

const zeroDestaqueMonetaryFields = (data) => {
  const monetaryKeys = [
    "subtotal",
    "totalFinal",
    "gasto_alojamiento",
    "gasto_combustible",
    "gasto_otros",
    "gastos_movilidad",
    "gastos_movil_otros",
    "gastos_capacit",
    "gasto_ceremonial",
    "gasto_pasajes",
    "rendicion_viaticos",
    "rendicion_gasto_alojamiento",
    "rendicion_gasto_pasajes",
    "rendicion_gasto_combustible",
    "rendicion_gastos_movil_otros",
    "rendicion_gastos_capacit",
    "rendicion_gasto_ceremonial",
    "rendicion_transporte_otros",
    "rendicion_viatico_monto",
    "total_percibir",
    "valorDiarioCalc",
    "anticipo_custom",
  ];

  const cloned = { ...data };
  monetaryKeys.forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(cloned, key)) {
      cloned[key] = 0;
    }
  });

  return cloned;
};

const fmtDate = (isoStr) => {
  if (!isoStr) return "";
  const [y, m, d] = isoStr.split("-");
  return `${d}/${m}/${y}`;
};

const getSpanishMonthLong = (monthIndex) => {
  const months = [
    "enero",
    "febrero",
    "marzo",
    "abril",
    "mayo",
    "junio",
    "julio",
    "agosto",
    "septiembre",
    "octubre",
    "noviembre",
    "diciembre",
  ];
  return months[monthIndex] || "";
};

/**
 * Texto del acrofield `lugar_y_fecha` (pie del formulario): ciudad + fecha límite de rendición
 * (`rendicion_fecha` o primer lunes posterior a `fecha_hasta`).
 * Formato: "Ciudad, dd de mes de YYYY". Si no hay fecha válida, usa la fecha de hoy.
 */
const buildLugarYFecha = (data, giraData, configData) => {
  const lugar = data.ciudad_origen || "Viedma";
  const rawIso =
    configData?.rendicion_fecha || firstMondayAfter(giraData?.fecha_hasta);
  if (rawIso && typeof rawIso === "string") {
    const parts = rawIso.split("-");
    if (parts.length >= 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      const d = parseInt(parts[2], 10);
      if (!Number.isNaN(y) && !Number.isNaN(m) && !Number.isNaN(d)) {
        const dateObj = new Date(y, m - 1, d);
        const dia = String(dateObj.getDate()).padStart(2, "0");
        const mesNom = getSpanishMonthLong(dateObj.getMonth());
        const anioYyyy = String(dateObj.getFullYear());
        return `${lugar}, ${dia} de ${mesNom} de ${anioYyyy}`;
      }
    }
  }
  const hoy = new Date();
  const diaHoy = String(hoy.getDate()).padStart(2, "0");
  const mesHoy = getSpanishMonthLong(hoy.getMonth());
  const anioYyyy = String(hoy.getFullYear());
  return `${lugar}, ${diaHoy} de ${mesHoy} de ${anioYyyy}`;
};

const fmtTime = (timeStr) => {
  if (!timeStr) return "";
  // Si viene como HH:MM:SS, recortamos a HH:MM
  return timeStr.substring(0, 5);
};

// Calcula Devolución (negativo) o Reintegro (positivo)
// En exportación editable queremos números crudos (sin $ ni formato local).
const calcDiff = (ant, rend, keepEditable = false) => {
  const a = parseFloat(ant || 0);
  const r = parseFloat(rend || 0);
  const diff = r - a;
  const raw = (n) => {
    const num = Number(n);
    if (!Number.isFinite(num)) return "";
    return String(num);
  };

  return {
    dev: diff < 0 ? (keepEditable ? raw(Math.abs(diff)) : fmtMoney(Math.abs(diff))) : "",
    reint: diff > 0 ? (keepEditable ? raw(diff) : fmtMoney(diff)) : "",
  };
};

export const sumRendicion = (data) => {
  // Orden y campos alineados con ViaticosTable: Movilidad→transporte_otros, Otros→gasto_otros, etc.
  const fields = [
    "rendicion_viaticos",
    "rendicion_gasto_alojamiento",
    "rendicion_transporte_otros", // Pasajes en PDF = columna Movilidad
    "rendicion_gasto_combustible",
    "rendicion_gastos_movil_otros",
    "rendicion_gastos_capacit",
    "rendicion_gasto_ceremonial",
    "rendicion_gasto_otros", // columna Otros
  ];
  return fields.reduce((acc, f) => acc + parseFloat(data[f] || 0), 0);
};

export const exportViaticosToPDFForm = async (
  giraData,
  viaticosData,
  configData,
  mode = "viatico"
) => {
  const keepEditable = !!configData?.keep_editable;
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

  const effectiveDataList =
    mode === "destaque"
      ? viaticosData.map((d) => zeroDestaqueMonetaryFields(d))
      : viaticosData;

  const useHistorical = !!configData?.useHistoricalCalc;

  for (const rawData of effectiveDataList) {
    const data =
      mode === "destaque"
        ? rawData
        : (() => {
            const sub = getAnticipoSubtotalForExport(rawData, useHistorical);
            const gastos = sumGastosViaticoRow(rawData);
            return { ...rawData, subtotal: sub, totalFinal: sub + gastos };
          })();
    const srcDoc = await PDFDocument.load(templateBuffer);
    const form = srcDoc.getForm();

    const removeFieldSafe = (fieldName) => {
      try {
        const field = form.getField(fieldName);
        if (field) form.removeField(field);
      } catch (e) {}
    };

    const nombreCompleto = `${data.apellido}, ${data.nombre}`;
    const hoy = new Date();
    const diaHoy = String(hoy.getDate()).padStart(2, "0");
    const mesHoy = getSpanishMonthLong(hoy.getMonth());
    const anioHoy = String(hoy.getFullYear());
    const lugarYFecha = buildLugarYFecha(data, giraData, configData);

    const money = (val) => {
      if (!keepEditable) return fmtMoney(val);
      const num = Number(val);
      if (!Number.isFinite(num)) return "";
      // Exportación editable: número visible, sin formato moneda.
      return String(num);
    };

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
        f(
          "asiento_habitual",
          data.asiento_habitual || data.ciudad_origen || "Viedma"
        );
        f("dia_salida", fmtDate(data.fecha_salida));
        f("hora_salida", fmtTime(data.hora_salida));
        f("dia_llegada", fmtDate(data.fecha_llegada));
        f("hora_llegada", fmtTime(data.hora_llegada));
        f("dias_computados", data.dias_computables);
        f("valor_diario", money(data.valorDiarioCalc));
        f("porcentaje_viatico", String(data.porcentaje || 0));
        f(
          "porcentaje_temporada",
          configData.factor_temporada > 0 ? "ALTA" : "BAJA"
        );

        // Tabla Rendición
        f("viaticos_ant", money(data.subtotal));
        f("viaticos_rend", money(data.rendicion_viaticos));
        const cViat = calcDiff(data.subtotal, data.rendicion_viaticos, keepEditable);
        f("viaticos_dev", cViat.dev);
        f("viaticos_reint", cViat.reint);

        f("alojamiento_ant", money(data.gasto_alojamiento));
        f("alojamiento_rend", money(data.rendicion_gasto_alojamiento));
        const cAloj = calcDiff(
          data.gasto_alojamiento,
          data.rendicion_gasto_alojamiento,
          keepEditable
        );
        f("alojamiento_dev", cAloj.dev);
        f("alojamiento_reint", cAloj.reint);

        // Pasajes en el PDF = columna Movilidad de la tabla (gastos_movilidad / rendicion_transporte_otros)
        const antPasaje = data.gastos_movilidad || 0;
        const rendPasaje = data.rendicion_transporte_otros || 0;
        f("pasaje_ant", money(antPasaje));
        f("pasaje_rend", money(rendPasaje));
        const cPas = calcDiff(antPasaje, rendPasaje, keepEditable);
        f("pasaje_dev", cPas.dev);
        f("pasaje_reint", cPas.reint);

        f("combustible_ant", money(data.gasto_combustible));
        f("combustible_rend", money(data.rendicion_gasto_combustible));
        const cComb = calcDiff(
          data.gasto_combustible,
          data.rendicion_gasto_combustible,
          keepEditable
        );
        f("combustible_dev", cComb.dev);
        f("combustible_reint", cComb.reint);

        f("otros_movilidad_ant", money(data.gastos_movil_otros));
        f("otros_movilidad_rend", money(data.rendicion_gastos_movil_otros));
        const cMovOtr = calcDiff(
          data.gastos_movil_otros,
          data.rendicion_gastos_movil_otros,
          keepEditable
        );
        f("otros_movilidad_dev", cMovOtr.dev);
        f("otros_movilidad_reint", cMovOtr.reint);

        f("capacitacion_ant", money(data.gastos_capacit));
        f("capacitacion_rend", money(data.rendicion_gastos_capacit));
        const cCap = calcDiff(
          data.gastos_capacit,
          data.rendicion_gastos_capacit,
          keepEditable
        );
        f("capacitacion_dev", cCap.dev);
        f("capacitacion_reint", cCap.reint);

        const antCer = data.gasto_ceremonial || 0;
        const rendCer = data.rendicion_gasto_ceremonial || 0;
        f("gastos_ceremonial_ant", money(antCer));
        f("gastos_ceremonial_rend", money(rendCer));
        const cCer = calcDiff(antCer, rendCer, keepEditable);
        f("gastos_ceremonial_dev", cCer.dev);
        f("gastos_ceremonial_reint", cCer.reint);

        // "Otros gastos" en el PDF = columna "Otros" de la tabla (ViaticosTable: gasto_otros / rendicion_gasto_otros)
        const antOtr = data.gasto_otros || 0;
        const rendOtr = data.rendicion_gasto_otros || 0;
        f("otros_gastos_ant", money(antOtr));
        f("otros_gastos_rend", money(rendOtr));
        const cOtr = calcDiff(antOtr, rendOtr, keepEditable);
        f("otros_gastos_dev", cOtr.dev);
        f("otros_gastos_reint", cOtr.reint);

        const totalAnt = data.totalFinal || 0;
        const totalRend = sumRendicion(data);
        f("totales_ant", money(totalAnt));
        f("totales_rend", money(totalRend));
        const cTot = calcDiff(totalAnt, totalRend, keepEditable);
        f("totales_dev", cTot.dev);
        f("totales_reint", cTot.reint);

        // Pie del formulario: lugar + fecha límite de rendición (config o lunes post-gira)
        f("lugar_y_fecha", lugarYFecha);
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
        const lugarParaDoc =
          mode === "destaque" && configData.lugar_comision_destaques_exportacion
            ? configData.lugar_comision_destaques_exportacion
            : configData.lugar_comision;
        f("lugar_comision", lugarParaDoc || "");
        const motivoParaDoc =
          data.motivo ||
          (mode === "destaque" && configData.motivo_destaques_exportacion
            ? configData.motivo_destaques_exportacion
            : configData.motivo);
        f("motivo", motivoParaDoc || "");
        f(
          "asiento_habitual",
          data.asiento_habitual || data.ciudad_origen || "Viedma"
        );

        f("dia_salida", fmtDate(data.fecha_salida));
        f("hora_salida", fmtTime(data.hora_salida));
        f("dia_llegada", fmtDate(data.fecha_llegada));
        f("hora_llegada", fmtTime(data.hora_llegada));
        f("dias_computados", String(data.dias_computables || 0));

        // Nuevos campos de acroform: porcentaje y valor_diario
        f("valor_diario", money(data.valorDiarioCalc));
        f("porcentaje", String(data.porcentaje || 0));
        // Compatibilidad hacia atrás si existe el campo antiguo
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
          } días de viáticos a razón de ${
            keepEditable ? String(Number(data.valorDiarioCalc || 0)) : fmtMoney(data.valorDiarioCalc)
          } diarios -equivalentes al ${
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
        // Detalle de transporte \"Otros\":
        // - En ViáticosManual se llama transporte_otros_detalle
        // - En Viáticos de Giras (tabla) usamos transporte_otros como texto
        const detalleOtro =
          (data.transporte_otros && String(data.transporte_otros).trim()) ||
          data.transporte_otros_detalle ||
          "";
        // Campo de texto principal en la plantilla
        f("transporte_otros", detalleOtro);
        // Campo auxiliar de descripción (usado en versiones anteriores)
        f("descripcion_otro", detalleOtro);

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

        // Total final del anticipo (en editable: número crudo)
        f("total_anticipo", money(data.totalFinal));
        f("lugar_y_fecha", lugarYFecha);
        // Nuevos campos de fecha descompuesta (dd, mmmm, yyyy)
        f("dia_hoy", diaHoy);
        f("mes_hoy", mesHoy);
        f("anio_hoy", anioHoy);

        await insertImageSignature(srcDoc, form, "firma_link", data.firma);
      }
    } catch (err) {
      console.warn("Error rellenando campos PDF:", err);
    }

    // Exportación editable: eliminar campo de firma (si existe) para firma ológrafa posterior
    if (keepEditable) {
      removeFieldSafe("firma_link");
      removeFieldSafe("firma_imagen");
    }

    // Exportación editable: forzar generación/visualización de apariencias
    if (keepEditable) {
      setNeedAppearances(srcDoc, true);
      try {
        // Forzar apariencias para evitar que el valor quede "invisible" hasta click
        form.updateFieldAppearances();
      } catch (e) {}
    }

    if (!keepEditable) form.flatten();
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

// --- CÁLCULO (PDF AcroForm JS) ---
function setFieldCalculationJs(form, fieldName, jsCode) {
  try {
    const field = form.getField(fieldName);
    const dict = field?.acroField?.dict;
    if (!dict) return;

    // /AA << /C << /S /JavaScript /JS (...) >> >>
    const ctx = dict.context;
    const jsAction = ctx.obj({
      S: PDFName.of("JavaScript"),
      JS: PDFString.of(jsCode),
    });
    const aa = ctx.obj({
      C: jsAction,
    });
    dict.set(PDFName.of("AA"), aa);
  } catch (e) {
    // ignore
  }
}

function ensureInCalculationOrder(pdfDoc, form, fieldName) {
  try {
    const field = form.getField(fieldName);
    const fieldRef = field?.acroField?.ref;
    if (!fieldRef) return;

    const acroForm = pdfDoc.catalog.lookup(PDFName.of("AcroForm"));
    if (!acroForm) return;
    const ctx = acroForm.context;

    const existing = acroForm.lookup(PDFName.of("CO"));
    if (!existing) {
      acroForm.set(PDFName.of("CO"), ctx.obj([fieldRef]));
      return;
    }
    if (!(existing instanceof PDFArray)) return;

    // Evitar duplicados
    for (let i = 0; i < existing.size(); i++) {
      const r = existing.get(i);
      if (r === fieldRef) return;
    }
    existing.push(fieldRef);
  } catch (e) {
    // ignore
  }
}

function setNeedAppearances(pdfDoc, enable = true) {
  try {
    const acroForm = pdfDoc.catalog.lookup(PDFName.of("AcroForm"));
    if (!acroForm) return;
    acroForm.set(PDFName.of("NeedAppearances"), enable ? PDFBool.True : PDFBool.False);
  } catch (e) {
    // ignore
  }
}