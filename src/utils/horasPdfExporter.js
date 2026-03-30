import Docxtemplater from "docxtemplater";
import PizZip from "pizzip";
import mammoth from "mammoth";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";

/** Carpeta destino en Google Drive para notas de horas cátedra (Secretaría de Cultura). */
export const HORAS_NOTAS_DRIVE_FOLDER_ID = "1kPOHAfOo_pNWSLbqhuVQ87WSij2f4_A_";

export const MODELO_HORAS_DOCX_URL = "/plantillas/modelo_horas.docx";

/**
 * Texto de respaldo si falla la plantilla .docx (mismo contenido que el modelo Google).
 */
const NOTA_TEMPLATE_FALLBACK = `Viedma, [fecha_hoy] 



Al Secretario de Cultura 


Su despacho 


Por medio de la presente solicito [tipo_cambio_con_articulo] de horas cátedras del siguiente agente a partir del [fecha_novedad_primero_de_mes]: 
[nombre_y_apellido], DNI: [nro_dni] 


Horas cátedra actual 
 Modificación 
 Cantidad de horas a partir del [fecha_novedad_primero_de_mes] 
 [horas_previas] 
 [horas_cambio] 
 [horas_actuales] 


Saludo atentamente.`;

const CONCEPTOS = [
  { id: "h_basico", label: "Básico" },
  { id: "h_ensayos", label: "Ensayos" },
  { id: "h_ensamble", label: "Ensamble" },
  { id: "h_categoria", label: "Categoría" },
  { id: "h_coordinacion", label: "Coordinación" },
  { id: "h_desarraigo", label: "Desarraigo" },
  { id: "h_otros", label: "Otros" },
];

const MESES = [
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

export function sumHorasRecord(record) {
  if (!record) return 0;
  return CONCEPTOS.reduce((acc, c) => acc + (Number(record[c.id]) || 0), 0);
}

export function getPreviousHorasRecord(records, registroActual) {
  if (!records?.length || !registroActual) return null;
  const sorted = [...records].sort(
    (a, b) => new Date(a.created_at) - new Date(b.created_at),
  );
  const sameOrigen = sorted.filter((r) => r.origen === registroActual.origen);
  const idx = sameOrigen.findIndex((r) => r.id === registroActual.id);
  if (idx <= 0) return null;
  return sameOrigen[idx - 1];
}

/** Misma regla que el dashboard: registro vigente para ese mes calendario y origen. */
function getHoursForDate(records, date, origen) {
  const y = date.getFullYear();
  const mo = date.getMonth() + 1;
  const validRecords = (records || []).filter((r) => {
    if (r.origen !== origen) return false;
    const startOk = r.anio_inicio < y || (r.anio_inicio === y && r.mes_inicio <= mo);
    const endOk =
      !r.anio_fin || r.anio_fin > y || (r.anio_fin === y && r.mes_fin >= mo);
    return startOk && endOk;
  });
  validRecords.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  return validRecords[0] || null;
}

function getTipoCambioConArticulo(prevSum, currSum) {
  if (prevSum === 0 && currSum > 0) {
    return { clave: "alta", texto: "el alta" };
  }
  if (prevSum > 0 && currSum === 0) {
    return { clave: "baja", texto: "la baja" };
  }
  if (currSum > prevSum) {
    return { clave: "aumento", texto: "el aumento" };
  }
  if (currSum < prevSum) {
    return { clave: "disminucion", texto: "la disminución" };
  }
  return {
    clave: "constancia",
    texto: "la constancia de la asignación vigente",
  };
}

export function formatFechaHoyPlaceholder(date = new Date()) {
  const d = date.getDate();
  const m = MESES[date.getMonth()];
  const y = date.getFullYear();
  return `${d} de ${m} de ${y}`;
}

export function formatFechaHoyViedma(date = new Date()) {
  return `Viedma, ${formatFechaHoyPlaceholder(date)}`;
}

/** Fecha de vigencia del cambio, p. ej. "01 de marzo de 2026". */
export function formatFechaNovedadPrimero(mesInicio, anioInicio) {
  const mes = Number(mesInicio);
  const anio = Number(anioInicio);
  if (!Number.isFinite(mes) || mes < 1 || mes > 12 || !Number.isFinite(anio)) {
    return "";
  }
  return `01 de ${MESES[mes - 1]} de ${anio}`;
}

function sanitizeFilename(str) {
  return String(str || "archivo")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[/\\?*:[\]]/g, "_")
    .replace(/\s+/g, "_")
    .slice(0, 120);
}

export function buildHorasNotaFilename(integrante, registroActual) {
  const ap = sanitizeFilename(integrante?.apellido || "integrante");
  const origen = String(registroActual?.origen || "X");
  return `Nota_Horas_Catedra_${ap}_${origen}_${registroActual?.mes_inicio}-${registroActual?.anio_inicio}.pdf`;
}

export function buildHorasNotaDocxFilename(integrante, registroActual) {
  const ap = sanitizeFilename(integrante?.apellido || "integrante");
  const origen = String(registroActual?.origen || "X");
  return `Nota_Horas_Catedra_${ap}_${origen}_${registroActual?.mes_inicio}-${registroActual?.anio_inicio}.docx`;
}

/** Evita colisiones cuando hay varias notas del mismo mes/origen. */
export function buildHorasNotaDocxFilenameUnique(integrante, registroActual) {
  const base = buildHorasNotaDocxFilename(integrante, registroActual);
  const id = registroActual?.id;
  if (id == null) return base;
  return base.replace(/\.docx$/i, `_id${id}.docx`);
}

/**
 * Novedades del mes **de nómina** indicado (mismo criterio que la tabla): mes/año elegidos
 * en el panel vs. el mes anterior. No usa el mes “en curso” ni la fecha de creación del registro.
 * @param {Array<{ hasNews: boolean, records?: Array, id: number, apellido?: string, nombre?: string, dni?: string }>} reportRows
 */
export function collectNovedadesMesDocJobs(reportRows, year, month) {
  const targetDate = new Date(year, month - 1, 1);
  const prevDate = new Date(year, month - 2, 1);
  const jobs = [];
  for (const row of reportRows) {
    if (!row.hasNews) continue;
    const records = row.records || [];
    const cult = getHoursForDate(records, targetDate, "CULTURA");
    const edu = getHoursForDate(records, targetDate, "EDUCACION");
    const prevCult = getHoursForDate(records, prevDate, "CULTURA");
    const prevEdu = getHoursForDate(records, prevDate, "EDUCACION");

    const tc = sumHorasRecord(cult);
    const pc = sumHorasRecord(prevCult);
    const te = sumHorasRecord(edu);
    const pe = sumHorasRecord(prevEdu);

    if (tc !== pc && cult) {
      jobs.push({ integrante: row, registro: cult, prev: prevCult });
    }
    if (te !== pe && edu) {
      jobs.push({ integrante: row, registro: edu, prev: prevEdu });
    }
  }
  return jobs;
}

async function zipNamedDocxBlobs(files) {
  const zip = new PizZip();
  const used = new Set();
  for (const f of files) {
    let name = f.name;
    const stem = name.replace(/\.docx$/i, "");
    let k = 0;
    while (used.has(name)) {
      k += 1;
      name = `${stem}_${k}.docx`;
    }
    used.add(name);
    const buf = await f.blob.arrayBuffer();
    zip.file(name, buf);
  }
  return zip.generate({ type: "blob", mimeType: "application/zip" });
}

/**
 * Descarga un ZIP con todas las notas del lote.
 */
export async function downloadNovedadesMesZip(jobs, year, month) {
  if (!jobs.length) {
    throw new Error(
      "No hay novedades para el mes seleccionado (sin cambio en la nómina respecto del mes anterior).",
    );
  }
  const templateBuf = await fetchTemplateArrayBuffer();
  const files = [];
  for (const job of jobs) {
    const blob = await buildFilledHorasDocxBlob(
      job.integrante,
      job.registro,
      job.prev,
      templateBuf,
    );
    files.push({
      name: buildHorasNotaDocxFilenameUnique(job.integrante, job.registro),
      blob,
    });
  }
  const zipBlob = await zipNamedDocxBlobs(files);
  const zipName = `Novedades_horas_${String(month).padStart(2, "0")}_${year}.zip`;
  saveAs(zipBlob, zipName);
}

/**
 * Sube cada Word del lote a la carpeta de Drive.
 * @returns {number} cantidad subida
 */
export async function uploadAllNovedadesMesToDrive(supabase, jobs) {
  if (!jobs.length) {
    throw new Error(
      "No hay novedades para el mes seleccionado (sin cambio en la nómina respecto del mes anterior).",
    );
  }
  const templateBuf = await fetchTemplateArrayBuffer();
  let n = 0;
  for (const job of jobs) {
    const blob = await buildFilledHorasDocxBlob(
      job.integrante,
      job.registro,
      job.prev,
      templateBuf,
    );
    const fileName = buildHorasNotaDocxFilenameUnique(job.integrante, job.registro);
    await uploadHorasNotaToDrive(supabase, blob, fileName, HORAS_NOTA_DOCX_MIME);
    n++;
  }
  return n;
}

/**
 * Datos para docxtemplater: claves = nombre dentro de [ ... ] en el .docx
 */
export function buildHorasNotaTemplateData(integrante, registroActual, registroPrevio) {
  const prevSum = registroPrevio ? sumHorasRecord(registroPrevio) : 0;
  const currSum = sumHorasRecord(registroActual);
  const diffAbs = Math.abs(currSum - prevSum);
  const tipo = getTipoCambioConArticulo(prevSum, currSum);
  const fechaVigencia = formatFechaNovedadPrimero(
    registroActual.mes_inicio,
    registroActual.anio_inicio,
  );
  const nombreCompleto = `${integrante?.apellido || ""}, ${integrante?.nombre || ""}`.trim();
  const dni =
    integrante?.dni != null && integrante?.dni !== ""
      ? String(integrante.dni)
      : "S/D";

  return {
    fecha_hoy: formatFechaHoyPlaceholder(),
    tipo_cambio_con_articulo: tipo.texto,
    fecha_novedad_primero_de_mes: fechaVigencia,
    nombre_y_apellido: nombreCompleto,
    nro_dni: dni,
    horas_previas: String(prevSum),
    horas_cambio: String(diffAbs),
    horas_actuales: String(currSum),
  };
}

export function buildNotaHorasTextoPlano(integrante, registroActual, registroPrevio) {
  const data = buildHorasNotaTemplateData(
    integrante,
    registroActual,
    registroPrevio,
  );
  const map = {
    "[fecha_hoy]": data.fecha_hoy,
    "[tipo_cambio_con_articulo]": data.tipo_cambio_con_articulo,
    "[fecha_novedad_primero_de_mes]": data.fecha_novedad_primero_de_mes,
    "[nombre_y_apellido]": data.nombre_y_apellido,
    "[nro_dni]": data.nro_dni,
    "[horas_previas]": data.horas_previas,
    "[horas_cambio]": data.horas_cambio,
    "[horas_actuales]": data.horas_actuales,
  };
  let text = NOTA_TEMPLATE_FALLBACK;
  Object.entries(map).forEach(([k, v]) => {
    text = text.split(k).join(v);
  });
  return text;
}

async function fetchTemplateArrayBuffer(url = MODELO_HORAS_DOCX_URL) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(
      `No se encontró la plantilla (${url}). Coloque modelo_horas.docx en public/plantillas/.`,
    );
  }
  return res.arrayBuffer();
}

/**
 * Copia la plantilla .docx con los valores sustituidos.
 * @returns {Blob} application/vnd.openxmlformats-officedocument.wordprocessingml.document
 */
export async function buildFilledHorasDocxBlob(
  integrante,
  registroActual,
  registroPrevio,
  templateArrayBuffer = null,
) {
  const buf = templateArrayBuffer ?? (await fetchTemplateArrayBuffer());
  const zip = new PizZip(buf);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: { start: "[", end: "]" },
  });
  doc.render(
    buildHorasNotaTemplateData(integrante, registroActual, registroPrevio),
  );
  return doc.getZip().generate({
    type: "blob",
    mimeType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
}

function fillJsPdfWithPlainText(doc, text) {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 18;
  const maxW = pageW - 2 * margin;
  const lineHeight = 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  const lines = doc.splitTextToSize(text, maxW);
  let y = margin;
  lines.forEach((line) => {
    if (y + lineHeight > pageH - margin) {
      doc.addPage();
      y = margin;
    }
    doc.text(line, margin, y);
    y += lineHeight;
  });
}

function plainTextToPdfBlob(text) {
  const doc = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
  fillJsPdfWithPlainText(doc, text);
  return doc.output("blob");
}

function exportPlainTextToJsPdf(integrante, registroActual, registroPrevio) {
  const text = buildNotaHorasTextoPlano(
    integrante,
    registroActual,
    registroPrevio,
  );
  const doc = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
  fillJsPdfWithPlainText(doc, text);
  return doc;
}

/**
 * Texto del .docx ya rellenado → PDF (jsPDF).
 * No usamos html2pdf/html2canvas: en muchos navegadores capturan en blanco nodos fuera del viewport.
 */
async function docxBlobToPdfBlob(docxBlob) {
  const arrayBuffer = await docxBlob.arrayBuffer();
  const { value: raw } = await mammoth.extractRawText({ arrayBuffer });
  const text = (raw || "").replace(/\r\n/g, "\n").trim();
  if (!text.length) {
    throw new Error(
      "El Word rellenado no devolvió texto. Revise la plantilla modelo_horas.docx.",
    );
  }
  return plainTextToPdfBlob(text);
}

/**
 * PDF generado desde la plantilla Word (o texto plano si falla el flujo docx).
 * @returns {Promise<Blob>}
 */
export async function exportNotaHoraPdfBlob(
  integrante,
  registroActual,
  registroPrevio,
) {
  try {
    const docxBlob = await buildFilledHorasDocxBlob(
      integrante,
      registroActual,
      registroPrevio,
    );
    return await docxBlobToPdfBlob(docxBlob);
  } catch (e) {
    console.warn("[horasPdfExporter] DOCX/PDF vía plantilla falló, usando texto plano:", e);
    const jspdf = exportPlainTextToJsPdf(
      integrante,
      registroActual,
      registroPrevio,
    );
    return jspdf.output("blob");
  }
}

/** @deprecated Usar exportNotaHoraPdfBlob; mantenido por compatibilidad si algo espera jsPDF */
export function exportNotaHoraPDF(integrante, registroActual, registroPrevio) {
  return exportPlainTextToJsPdf(
    integrante,
    registroActual,
    registroPrevio,
  );
}

export async function downloadNotaHoraPdf(
  integrante,
  registroActual,
  registroPrevio,
) {
  const pdfBlob = await exportNotaHoraPdfBlob(
    integrante,
    registroActual,
    registroPrevio,
  );
  saveAs(pdfBlob, buildHorasNotaFilename(integrante, registroActual));
}

export async function downloadFilledHorasDocx(
  integrante,
  registroActual,
  registroPrevio,
) {
  const blob = await buildFilledHorasDocxBlob(
    integrante,
    registroActual,
    registroPrevio,
  );
  saveAs(blob, buildHorasNotaDocxFilename(integrante, registroActual));
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onloadend = () => {
      const s = String(r.result || "");
      const b64 = s.includes(",") ? s.split(",")[1] : s;
      resolve(b64);
    };
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

/** MIME del .docx rellenado (subida a Drive). */
export const HORAS_NOTA_DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

/**
 * Sube un archivo a Drive (PDF o Word según mimeType).
 */
export async function uploadHorasNotaToDrive(
  supabase,
  fileBlob,
  fileName,
  mimeType = "application/pdf",
) {
  const fileBase64 = await blobToBase64(fileBlob);

  const { data, error } = await supabase.functions.invoke("manage-drive", {
    body: {
      action: "upload_file",
      fileName,
      fileBase64,
      mimeType,
      parentId: HORAS_NOTAS_DRIVE_FOLDER_ID,
    },
  });

  if (error) throw error;
  let payload = data;
  if (typeof data === "string") {
    try {
      payload = JSON.parse(data);
    } catch {
      payload = {};
    }
  }
  if (payload?.error) throw new Error(String(payload.error));
  if (payload && payload.success === false) {
    throw new Error(payload.message || "Error al subir el archivo a Drive");
  }
  return payload;
}
