/**
 * Exportaciones Excel FIMBA (hotelería, comidas, transporte).
 * Reutiliza ExcelJS + file-saver como OFRN (`universalExportLogic` / `transportExport`).
 */

import { saveAs } from "file-saver";
import {
  FIMBA_GENEROS,
  FIMBA_TIPOS_ALIMENTACION,
  labelFimbaAlimentacion,
  labelFimbaHabitacionTipo,
  labelGiraTransporte,
} from "../services/fimbaService";
import {
  formatEventLocation,
  formatNextStopDestino,
  nextEventInVehicleSequence,
} from "./fimbaTransportBoarding";

async function loadExcelJS() {
  const { default: ExcelJS } = await import("exceljs");
  return ExcelJS;
}

function safeFilePart(s) {
  return String(s || "FIMBA")
    .replace(/[^\w\-ÁÉÍÓÚáéíóúñÑüÜ. +]+/gi, "_")
    .replace(/\s+/g, "_")
    .slice(0, 80);
}

function stamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`;
}

function formatFecha(f) {
  if (!f) return "";
  const s = String(f).slice(0, 10);
  const [y, m, d] = s.split("-");
  if (!d) return s;
  return `${d}/${m}/${y}`;
}

function asSi(v) {
  return v === true || v === "true" || v === 1 || v === "1" ? "Sí" : "";
}

function labelGenero(g) {
  return FIMBA_GENEROS.find((x) => x.value === g)?.label || g || "";
}

function eventLabel(ev) {
  if (!ev) return "";
  const fecha = formatFecha(ev.fecha);
  const hora = String(ev.hora_inicio || "").slice(0, 5);
  const loc = formatEventLocation(ev);
  const act = ev.actividad || ev.tipo_nombre || "";
  return [fecha, hora, loc || act].filter(Boolean).join(" · ");
}

function eventMapFromSequence(sequence) {
  const map = new Map();
  for (const ev of sequence?.sortedEvents || []) {
    map.set(String(ev.id), ev);
  }
  return map;
}

/**
 * Aplica estilo de cabecera OFRN-like a la fila 1.
 * @param {import('exceljs').Worksheet} ws
 * @param {string} [headerArgb]
 */
function styleHeaderRow(ws, headerArgb = "FF1F2937") {
  const headerRow = ws.getRow(1);
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: headerArgb },
    };
    cell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
    cell.border = {
      top: { style: "thin", color: { argb: "FFE5E7EB" } },
      left: { style: "thin", color: { argb: "FFE5E7EB" } },
      bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
      right: { style: "thin", color: { argb: "FFE5E7EB" } },
    };
  });
  headerRow.height = 20;
}

/**
 * @param {import('exceljs').Worksheet} ws
 * @param {Array<{ header: string, key: string, width?: number }>} columns
 * @param {Array<object>} rows
 */
function fillSheet(ws, columns, rows) {
  ws.columns = columns.map((c) => ({
    header: c.header,
    key: c.key,
    width: c.width || 16,
  }));
  for (const row of rows || []) {
    const safe = {};
    for (const c of columns) {
      const v = row[c.key];
      safe[c.key] = v == null ? "" : v;
    }
    ws.addRow(safe);
  }
  styleHeaderRow(ws);
  ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return;
    row.eachCell((cell) => {
      cell.alignment = { vertical: "middle", wrapText: true };
      cell.border = {
        top: { style: "thin", color: { argb: "FFF1F5F9" } },
        left: { style: "thin", color: { argb: "FFF1F5F9" } },
        bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
        right: { style: "thin", color: { argb: "FFE5E7EB" } },
      };
    });
  });
}

/**
 * @param {string} fileName — sin extensión o con .xlsx
 * @param {Array<{ name: string, columns: Array, rows: Array }>} sheets
 */
export async function writeFimbaWorkbook(fileName, sheets) {
  const ExcelJS = await loadExcelJS();
  const wb = new ExcelJS.Workbook();
  wb.creator = "FIMBA";
  wb.created = new Date();

  for (const sheet of sheets || []) {
    const name = String(sheet.name || "Datos").slice(0, 31);
    const ws = wb.addWorksheet(name || "Datos");
    fillSheet(ws, sheet.columns || [], sheet.rows || []);
  }

  if (!wb.worksheets.length) {
    const ws = wb.addWorksheet("Vacío");
    fillSheet(ws, [{ header: "Info", key: "info", width: 40 }], [
      { info: "Sin datos para exportar" },
    ]);
  }

  const buffer = await wb.xlsx.writeBuffer();
  const base = String(fileName || "FIMBA_export").replace(/\.xlsx$/i, "");
  saveAs(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    `${safeFilePart(base)}.xlsx`,
  );
}

function roomLabelForParticipante(habitaciones, participanteId) {
  if (participanteId == null) return "";
  for (const h of habitaciones || []) {
    for (const o of h.ocupantes || []) {
      if (Number(o.id_participante) === Number(participanteId)) {
        const tipo = labelFimbaHabitacionTipo(h);
        const ord = h.orden != null ? `#${h.orden}` : "";
        const lab = h.label ? ` ${h.label}` : "";
        return [tipo, ord, lab].filter(Boolean).join(" ").trim();
      }
    }
  }
  return "";
}

/**
 * Filas detalle de hotelería por persona (+ filas «sin nombre» planificadas).
 * @param {Array} hoteleriaRows — `listFimbaHoteleria().rows`
 */
export function buildFimbaHoteleriaPersonasRows(hoteleriaRows) {
  const out = [];
  for (const r of hoteleriaRows || []) {
    const artista = r.propuesta?.nombre || "";
    const hotel = r.hotel?.nombre || "";
    const checkin = formatFecha(r.checkin_at);
    const checkout = formatFecha(r.checkout_at);
    const noches = r.noches != null ? r.noches : "";
    const early = asSi(r.checkin_early);
    const late = asSi(r.checkout_late);
    const obs = String(r.propuesta?.observaciones_logisticas || "").trim();

    for (const p of r.personas || r.participantes || []) {
      if (p.activo === false) continue;
      out.push({
        artista,
        hotel,
        checkin,
        early,
        checkout,
        late,
        noches,
        apellido: p.apellido || "",
        nombre: p.nombre || "",
        documento: p.documento || "",
        genero: labelGenero(p.genero),
        habitacion: roomLabelForParticipante(r.habitaciones, p.id),
        alimentacion: labelFimbaAlimentacion(
          p.tipo_alimentacion,
          p.nota_alimentacion,
        ),
        observaciones: obs,
      });
    }

    const sinNombre = r.sin_nombre ?? r.por_confirmar ?? 0;
    for (let i = 0; i < sinNombre; i += 1) {
      out.push({
        artista,
        hotel,
        checkin,
        early,
        checkout,
        late,
        noches,
        apellido: "(sin nombre)",
        nombre: `#${i + 1}`,
        documento: "",
        genero: "",
        habitacion: "",
        alimentacion: "",
        observaciones: obs,
      });
    }
  }
  return out;
}

/**
 * Resumen por artista (cupos hotel / rooming).
 */
export function buildFimbaHoteleriaResumenRows(hoteleriaRows) {
  return (hoteleriaRows || []).map((r) => ({
    artista: r.propuesta?.nombre || "",
    hotel: r.hotel?.nombre || "",
    checkin: formatFecha(r.checkin_at),
    early: asSi(r.checkin_early),
    checkout: formatFecha(r.checkout_at),
    late: asSi(r.checkout_late),
    noches: r.noches != null ? r.noches : "",
    pax_planificada: r.pax_planificada ?? 0,
    nominados: r.nominados ?? 0,
    sin_nombre: r.sin_nombre ?? r.por_confirmar ?? 0,
    habitaciones: r.rooming_label || "",
    rooming:
      r.rooming?.slots > 0
        ? `${r.rooming.ocupadas}/${r.rooming.slots}`
        : "",
    camas_noche: r.camas_noche ?? "",
    observaciones: String(r.propuesta?.observaciones_logisticas || "").trim(),
  }));
}

/**
 * Lista de habitaciones con ocupantes (rooming list).
 */
export function buildFimbaRoomingRows(hoteleriaRows) {
  const out = [];
  for (const r of hoteleriaRows || []) {
    const artista = r.propuesta?.nombre || "";
    const hotel = r.hotel?.nombre || "";
    const checkin = formatFecha(r.checkin_at);
    const checkout = formatFecha(r.checkout_at);
    const habs = r.habitaciones || [];
    if (!habs.length) {
      out.push({
        artista,
        hotel,
        checkin,
        checkout,
        habitacion: "(sin inventario)",
        tipo: "",
        plaza: "",
        ocupante: "",
        documento: "",
      });
      continue;
    }
    for (const h of habs) {
      const tipo = labelFimbaHabitacionTipo(h);
      const habName = [tipo, h.orden != null ? `#${h.orden}` : "", h.label || ""]
        .filter(Boolean)
        .join(" ")
        .trim();
      const occs = (h.ocupantes || [])
        .slice()
        .sort((a, b) => (a.orden || 0) - (b.orden || 0));
      const cap = h.capacidad || 1;
      for (let i = 0; i < cap; i += 1) {
        const o = occs[i];
        const p = o?.participante || null;
        out.push({
          artista,
          hotel,
          checkin,
          checkout,
          habitacion: habName,
          tipo,
          plaza: i + 1,
          ocupante: p
            ? `${p.apellido || ""}, ${p.nombre || ""}`.replace(/^,\s*/, "")
            : "(vacante)",
          documento: p?.documento || "",
        });
      }
    }
  }
  return out;
}

/**
 * Resumen de regímenes + detalle de personas.
 * @param {Array} hoteleriaRows
 * @returns {{ resumen: Array, detalle: Array }}
 */
export function buildFimbaComidasExportData(hoteleriaRows) {
  const counts = {};
  const detalle = [];

  for (const r of hoteleriaRows || []) {
    const artista = r.propuesta?.nombre || "";
    for (const p of r.personas || r.participantes || []) {
      if (p.activo === false) continue;
      const tipo = String(p.tipo_alimentacion || "regular").toLowerCase();
      counts[tipo] = (counts[tipo] || 0) + 1;
      detalle.push({
        artista,
        apellido: p.apellido || "",
        nombre: p.nombre || "",
        documento: p.documento || "",
        genero: labelGenero(p.genero),
        regimen: labelFimbaAlimentacion(
          p.tipo_alimentacion,
          p.nota_alimentacion,
        ),
        tipo_codigo: tipo,
        nota:
          tipo === "otro" || p.nota_alimentacion
            ? String(p.nota_alimentacion || "").trim()
            : "",
      });
    }
  }

  const resumen = [];
  for (const t of FIMBA_TIPOS_ALIMENTACION) {
    const n = counts[t.value] || 0;
    if (n > 0) {
      resumen.push({
        regimen: t.label,
        tipo_codigo: t.value,
        cantidad: n,
      });
    }
  }
  for (const [k, n] of Object.entries(counts)) {
    if (FIMBA_TIPOS_ALIMENTACION.some((t) => t.value === k)) continue;
    if (n > 0) {
      resumen.push({ regimen: k, tipo_codigo: k, cantidad: n });
    }
  }
  resumen.push({
    regimen: "TOTAL nominados",
    tipo_codigo: "",
    cantidad: detalle.length,
  });

  return { resumen, detalle };
}

const HOT_RESUMEN_COLS = [
  { header: "Artista", key: "artista", width: 28 },
  { header: "Hotel", key: "hotel", width: 28 },
  { header: "Check-in", key: "checkin", width: 12 },
  { header: "Early", key: "early", width: 8 },
  { header: "Check-out", key: "checkout", width: 12 },
  { header: "Late", key: "late", width: 8 },
  { header: "Noches", key: "noches", width: 10 },
  { header: "PAX planif.", key: "pax_planificada", width: 12 },
  { header: "Nominados", key: "nominados", width: 12 },
  { header: "Sin nombre", key: "sin_nombre", width: 12 },
  { header: "Habitaciones", key: "habitaciones", width: 18 },
  { header: "Rooming", key: "rooming", width: 12 },
  { header: "Camas-noche", key: "camas_noche", width: 12 },
  { header: "Obs. logísticas", key: "observaciones", width: 36 },
];

const HOT_PERSONAS_COLS = [
  { header: "Artista", key: "artista", width: 24 },
  { header: "Hotel", key: "hotel", width: 24 },
  { header: "Apellido", key: "apellido", width: 18 },
  { header: "Nombre", key: "nombre", width: 18 },
  { header: "Documento", key: "documento", width: 14 },
  { header: "Género", key: "genero", width: 14 },
  { header: "Habitación", key: "habitacion", width: 22 },
  { header: "Check-in", key: "checkin", width: 12 },
  { header: "Early", key: "early", width: 8 },
  { header: "Check-out", key: "checkout", width: 12 },
  { header: "Late", key: "late", width: 8 },
  { header: "Noches", key: "noches", width: 10 },
  { header: "Alimentación", key: "alimentacion", width: 22 },
  { header: "Obs. logísticas", key: "observaciones", width: 30 },
];

const ROOMING_COLS = [
  { header: "Artista", key: "artista", width: 24 },
  { header: "Hotel", key: "hotel", width: 24 },
  { header: "Check-in", key: "checkin", width: 12 },
  { header: "Check-out", key: "checkout", width: 12 },
  { header: "Habitación", key: "habitacion", width: 24 },
  { header: "Tipo", key: "tipo", width: 18 },
  { header: "Plaza", key: "plaza", width: 8 },
  { header: "Ocupante", key: "ocupante", width: 28 },
  { header: "Documento", key: "documento", width: 14 },
];

const COMIDAS_RESUMEN_COLS = [
  { header: "Régimen", key: "regimen", width: 22 },
  { header: "Código", key: "tipo_codigo", width: 14 },
  { header: "Cantidad", key: "cantidad", width: 12 },
];

const COMIDAS_DETALLE_COLS = [
  { header: "Artista", key: "artista", width: 24 },
  { header: "Apellido", key: "apellido", width: 18 },
  { header: "Nombre", key: "nombre", width: 18 },
  { header: "Documento", key: "documento", width: 14 },
  { header: "Género", key: "genero", width: 14 },
  { header: "Alimentación", key: "regimen", width: 28 },
  { header: "Nota (Otro)", key: "nota", width: 32 },
];

/**
 * Excel hotelería: resumen + personas + rooming (multi-hoja).
 * @param {{ edicionNombre?: string, rows: Array, fileName?: string }} opts
 */
export async function exportFimbaHoteleriaExcel(opts = {}) {
  const { edicionNombre = "Edicion", rows = [], fileName } = opts;
  if (!rows.length) {
    alert("No hay datos de hotelería para exportar.");
    return false;
  }
  const resumen = buildFimbaHoteleriaResumenRows(rows);
  const personas = buildFimbaHoteleriaPersonasRows(rows);
  const rooming = buildFimbaRoomingRows(rows);
  const name =
    fileName ||
    `FIMBA_Hoteleria_${safeFilePart(edicionNombre)}_${stamp()}`;
  await writeFimbaWorkbook(name, [
    { name: "Resumen artistas", columns: HOT_RESUMEN_COLS, rows: resumen },
    { name: "Personas", columns: HOT_PERSONAS_COLS, rows: personas },
    { name: "Rooming", columns: ROOMING_COLS, rows: rooming },
  ]);
  return true;
}

/**
 * Solo rooming list (útil desde ficha artista).
 */
export async function exportFimbaRoomingExcel(opts = {}) {
  const { edicionNombre = "Edicion", artistaNombre, rows = [], fileName } = opts;
  if (!rows.length) {
    alert("No hay rooming para exportar.");
    return false;
  }
  const rooming = buildFimbaRoomingRows(rows);
  const name =
    fileName ||
    `FIMBA_Rooming_${safeFilePart(artistaNombre || edicionNombre)}_${stamp()}`;
  await writeFimbaWorkbook(name, [
    { name: "Rooming", columns: ROOMING_COLS, rows: rooming },
  ]);
  return true;
}

/**
 * Excel comidas / alimentación (resumen por régimen + detalle).
 */
export async function exportFimbaComidasExcel(opts = {}) {
  const { edicionNombre = "Edicion", rows = [], fileName } = opts;
  const { resumen, detalle } = buildFimbaComidasExportData(rows);
  if (!detalle.length) {
    alert("No hay participantes nominados con alimentación para exportar.");
    return false;
  }
  const name =
    fileName ||
    `FIMBA_Comidas_${safeFilePart(edicionNombre)}_${stamp()}`;
  await writeFimbaWorkbook(name, [
    { name: "Resumen regímenes", columns: COMIDAS_RESUMEN_COLS, rows: resumen },
    { name: "Detalle", columns: COMIDAS_DETALLE_COLS, rows: detalle },
  ]);
  return true;
}

const TRANSPORTE_PAX_COLS = [
  { header: "Origen", key: "origen", width: 12 },
  { header: "Pasajero / Grupo", key: "pasajero", width: 32 },
  { header: "Documento", key: "documento", width: 14 },
  { header: "Plazas", key: "plazas", width: 10 },
  { header: "Subida", key: "subida", width: 40 },
  { header: "Bajada", key: "bajada", width: 40 },
];

const TRANSPORTE_SEQ_COLS = [
  { header: "#", key: "stopNum", width: 6 },
  { header: "Fecha", key: "fecha", width: 12 },
  { header: "Hora", key: "hora", width: 8 },
  { header: "Locación / actividad", key: "ubicacion", width: 36 },
  { header: "Mov.", key: "movimiento", width: 12 },
  { header: "Suben", key: "suben", width: 10 },
  { header: "Bajan", key: "bajan", width: 10 },
  { header: "Δ", key: "delta", width: 8 },
  { header: "En tránsito", key: "en_transito", width: 12 },
  { header: "Orquesta en lugar", key: "orquesta", width: 14 },
  { header: "FIMBA en lugar", key: "fimba", width: 12 },
  { header: "Artistas (lugar)", key: "artistas", width: 36 },
  { header: "Libres", key: "libres", width: 10 },
  { header: "Destino sig.", key: "destino", width: 28 },
];

/**
 * Construye filas de abordaje por unidad a partir de la secuencia de boarding.
 * @param {object} sequence — `buildVehicleBoardingSequence` result
 * @param {object} [passengerById] — map id integrante → { apellido, nombre, documento? }
 */
export function buildFimbaTransportePaxRows(sequence, passengerById = null) {
  const evMap = eventMapFromSequence(sequence);
  const out = [];

  for (const r of sequence?.ofrnRides || []) {
    const p =
      passengerById?.get?.(String(r.id)) ||
      passengerById?.get?.(Number(r.id)) ||
      null;
    const apellido = p?.apellido || r.apellido || "";
    const nombre = p?.nombre || r.nombre || "";
    out.push({
      origen: "OFRN",
      pasajero:
        apellido || nombre
          ? `${String(apellido).toUpperCase()}, ${String(nombre)}`.replace(
              /,\s*$/,
              "",
            )
          : `Integrante ${r.id}`,
      documento: p?.dni || p?.documento || "",
      plazas: Number(r.seats) || 1,
      subida: eventLabel(evMap.get(String(r.subidaId))),
      bajada: eventLabel(evMap.get(String(r.bajadaId))),
    });
  }

  for (const r of sequence?.fimbaRides || []) {
    const nombre =
      r.nombre ||
      (r.id_propuesta != null ? `Artista #${r.id_propuesta}` : "FIMBA (sintético)");
    out.push({
      origen: r.source === "fimba_ruta" ? "FIMBA" : "FIMBA (sínt.)",
      pasajero: nombre,
      documento: "",
      plazas: Number(r.seats) || 0,
      subida: eventLabel(evMap.get(String(r.subidaId))),
      bajada: eventLabel(evMap.get(String(r.bajadaId))),
    });
  }

  out.sort((a, b) =>
    String(a.pasajero).localeCompare(String(b.pasajero), "es", {
      sensitivity: "base",
    }),
  );
  return out;
}

/**
 * Secuencia de paradas para export por vehículo.
 */
export function buildFimbaTransporteSecuenciaRows(sequence) {
  const sorted = sequence?.sortedEvents || [];
  return (sequence?.stops || []).map((s) => {
    const ev = s.evt;
    const next = nextEventInVehicleSequence(
      { sortedEvents: sorted },
      s.eventId,
    );
    const artistasParts = [];
    if (s.artistas_en_lugar instanceof Map) {
      for (const v of s.artistas_en_lugar.values()) {
        if (v.seats > 0) {
          artistasParts.push(
            `${v.nombre || "Artista"} ${v.seats}`.trim(),
          );
        }
      }
    }
    return {
      stopNum: s.stopNum,
      fecha: formatFecha(ev?.fecha),
      hora: String(ev?.hora_inicio || "").slice(0, 5),
      ubicacion: s.location || formatEventLocation(ev) || ev?.actividad || "",
      movimiento: s.movimiento_label || s.movimiento || "",
      suben: s.board_seats ?? 0,
      bajan: s.alight_seats ?? 0,
      delta: s.delta ?? 0,
      en_transito: s.en_transito ?? 0,
      orquesta: s.orquesta_en_lugar ?? 0,
      fimba: s.fimba_en_lugar ?? 0,
      artistas: artistasParts.join("; "),
      libres: s.libres != null ? s.libres : "",
      destino: formatNextStopDestino(next),
    };
  });
}

/**
 * Export de un vehículo: lista de abordaje + secuencia de paradas.
 * @param {{
 *   edicionNombre?: string,
 *   vehiculo: object,
 *   sequence: object,
 *   passengerById?: Map|null,
 *   fileName?: string,
 * }} opts
 */
export async function exportFimbaTransporteVehiculoExcel(opts = {}) {
  const {
    edicionNombre = "Edicion",
    vehiculo,
    sequence,
    passengerById = null,
    fileName,
  } = opts;
  const label = labelGiraTransporte(vehiculo) || `Vehiculo_${vehiculo?.id}`;
  const pax = buildFimbaTransportePaxRows(sequence, passengerById);
  const seq = buildFimbaTransporteSecuenciaRows(sequence);
  if (!pax.length && !seq.length) {
    alert(`No hay paradas ni pasajeros para exportar en ${label}.`);
    return false;
  }
  const name =
    fileName ||
    `FIMBA_Transporte_${safeFilePart(label)}_${safeFilePart(edicionNombre)}_${stamp()}`;
  await writeFimbaWorkbook(name, [
    { name: "Abordaje", columns: TRANSPORTE_PAX_COLS, rows: pax },
    { name: "Secuencia paradas", columns: TRANSPORTE_SEQ_COLS, rows: seq },
  ]);
  return true;
}

/**
 * Un Excel con una hoja de abordaje por cada vehículo + resumen de flota.
 * @param {{
 *   edicionNombre?: string,
 *   vehiculos: Array,
 *   sequencesByVehicle: Map<number, object>,
 *   passengerById?: Map|null,
 *   fileName?: string,
 * }} opts
 */
export async function exportFimbaTransporteTodosExcel(opts = {}) {
  const {
    edicionNombre = "Edicion",
    vehiculos = [],
    sequencesByVehicle,
    passengerById = null,
    fileName,
  } = opts;
  if (!vehiculos.length) {
    alert("No hay vehículos para exportar.");
    return false;
  }

  const sheets = [];
  const resumenFlota = [];

  for (const gt of vehiculos) {
    const seq = sequencesByVehicle?.get?.(Number(gt.id));
    const label = labelGiraTransporte(gt);
    resumenFlota.push({
      vehiculo: label,
      capacidad: gt.capacidad_maxima ?? "",
      pico: seq?.peak_en_transito ?? 0,
      libres_pico: seq?.libres_peak ?? "",
      overbook: seq?.overbook_peak ? "Sí" : "",
      paradas: seq?.stops?.length ?? 0,
      pax_rides:
        (seq?.ofrnRides?.length || 0) + (seq?.fimbaRides?.length || 0),
    });

    const pax = buildFimbaTransportePaxRows(seq, passengerById);
    const sheetName = safeFilePart(label).slice(0, 28) || `V_${gt.id}`;
    sheets.push({
      name: sheetName,
      columns: TRANSPORTE_PAX_COLS,
      rows: pax.length
        ? pax
        : [{ origen: "", pasajero: "(sin pasajeros)", documento: "", plazas: "", subida: "", bajada: "" }],
    });
  }

  sheets.unshift({
    name: "Flota",
    columns: [
      { header: "Vehículo", key: "vehiculo", width: 28 },
      { header: "Capacidad", key: "capacidad", width: 12 },
      { header: "Pico en tránsito", key: "pico", width: 14 },
      { header: "Libres (pico)", key: "libres_pico", width: 12 },
      { header: "Sobre cupo", key: "overbook", width: 12 },
      { header: "Paradas", key: "paradas", width: 10 },
      { header: "Rides (OFRN+FIMBA)", key: "pax_rides", width: 16 },
    ],
    rows: resumenFlota,
  });

  const name =
    fileName ||
    `FIMBA_Transportes_${safeFilePart(edicionNombre)}_${stamp()}`;
  await writeFimbaWorkbook(name, sheets);
  return true;
}
