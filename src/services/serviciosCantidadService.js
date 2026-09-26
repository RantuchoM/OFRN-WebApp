import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { resolveGiraRosterForMatrix } from "./giraService";
import { formatDdMmYyyy } from "../utils/dates";
import { stripHtml } from "../utils/eventDisplayUtils";
import {
  SERVICIO_COLUMN_DEFS,
  SERVICIO_EVENT_TYPE_IDS,
  SERVICIO_POR_MES_COLUMN,
  buildCustomByEventId,
  buildDraftGiraIds,
  bucketTotal,
  eventAssociatedProgramaIds,
  eventMatchesGiraFilter,
  formatEventDurationLabel,
  formatServicioHitBandPlain,
  formatServicioMarkLetter,
  formatServicioNumber,
  formatServicioPartsPlain,
  formatServiciosPorMesPlain,
  groupHitsByDetailSection,
  listServicioHitsForIntegrante,
  sumBuckets,
} from "../utils/serviciosCantidad";
import { currentYearBounds } from "../utils/girasYearSummary";
import { integranteKey } from "../utils/integranteIds";
import { formatProgramSelectLabel } from "../utils/giraUtils";

const PAGE_SIZE = 1000;
const MAX_PAGES = 40;
const IN_CHUNK = 200;
const ROSTER_CONCURRENCY = 8;

const EVENT_SELECT = `
  id, fecha, hora_inicio, hora_fin, tecnica, is_deleted, id_tipo_evento, id_gira, es_didactico, descripcion,
  tipos_evento ( id, nombre ),
  locaciones ( nombre ),
  eventos_ensambles ( id_ensamble ),
  eventos_programas_asociados ( id_programa )
`;

async function fetchAllPaged(makeQuery) {
  const all = [];
  let offset = 0;
  for (let page = 0; page < MAX_PAGES; page++) {
    const { data, error } = await makeQuery().range(
      offset,
      offset + PAGE_SIZE - 1,
    );
    if (error) throw error;
    const chunk = data || [];
    all.push(...chunk);
    if (chunk.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }
  return all;
}

async function fetchInIdChunks(supabase, table, select, column, ids) {
  const unique = [...new Set((ids || []).filter((id) => id != null))];
  const all = [];
  for (let i = 0; i < unique.length; i += IN_CHUNK) {
    const slice = unique.slice(i, i + IN_CHUNK);
    const page = await fetchAllPaged(() =>
      supabase.from(table).select(select).in(column, slice),
    );
    all.push(...page);
  }
  return all;
}

async function mapInBatches(items, batchSize, mapper) {
  const out = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const slice = items.slice(i, i + batchSize);
    const part = await Promise.all(slice.map(mapper));
    out.push(...part);
  }
  return out;
}

function normalizeDateRange(fechaDesde, fechaHasta) {
  const bounds = currentYearBounds();
  let desde = String(fechaDesde || bounds.desde).slice(0, 10);
  let hasta = String(fechaHasta || bounds.hasta).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(desde)) desde = bounds.desde;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(hasta)) hasta = bounds.hasta;
  if (desde > hasta) {
    const tmp = desde;
    desde = hasta;
    hasta = tmp;
  }
  return { fechaDesde: desde, fechaHasta: hasta };
}

/**
 * Eventos del período (paginado, tope PostgREST 1000) + custom de asistencia +
 * membresías de ensamble (tramos con fecha, para `isIntegranteConvocadoToEnsayo`).
 * No resuelve roster: eso va por `resolveGiraRosterForMatrix` (Convocatorias).
 */
export async function fetchServiciosCantidadPeriod(
  supabase,
  { fechaDesde, fechaHasta, giraId } = {},
) {
  if (!supabase) {
    return {
      events: [],
      customRows: [],
      memberships: [],
      programas: [],
      error: null,
      fechaDesde: null,
      fechaHasta: null,
    };
  }
  const range = normalizeDateRange(fechaDesde, fechaHasta);
  try {
    const eventsRaw = await fetchAllPaged(() =>
      supabase
        .from("eventos")
        .select(EVENT_SELECT)
        .eq("is_deleted", false)
        .in("id_tipo_evento", SERVICIO_EVENT_TYPE_IDS)
        .gte("fecha", range.fechaDesde)
        .lte("fecha", range.fechaHasta)
        .order("fecha", { ascending: true })
        .order("hora_inicio", { ascending: true }),
    );

    const events = (eventsRaw || []).filter((evt) =>
      eventMatchesGiraFilter(evt, giraId),
    );

    const eventIds = events.map((e) => e.id).filter(Boolean);
    const giraIds = [
      ...new Set(events.flatMap((e) => eventAssociatedProgramaIds(e))),
    ];

    const [customRows, programas, memberships] = await Promise.all([
      eventIds.length
        ? fetchInIdChunks(
            supabase,
            "eventos_asistencia_custom",
            "id_evento, id_integrante, tipo",
            "id_evento",
            eventIds,
          )
        : Promise.resolve([]),
      giraIds.length
        ? fetchInIdChunks(
            supabase,
            "programas",
            "id, nomenclador, mes_letra, nombre_gira, subtitulo, tipo, fecha_desde, fecha_hasta, zona, estado",
            "id",
            giraIds,
          )
        : Promise.resolve([]),
      fetchAllPaged(() =>
        supabase
          .from("integrantes_ensambles")
          .select("id_ensamble, id_integrante, fecha_desde, fecha_hasta"),
      ),
    ]);

    return {
      events,
      customRows: customRows || [],
      memberships: memberships || [],
      programas: programas || [],
      error: null,
      ...range,
    };
  } catch (e) {
    console.error("[serviciosCantidad] period:", e);
    return {
      events: [],
      customRows: [],
      memberships: [],
      programas: [],
      error: e,
      ...range,
    };
  }
}

export function giraOptionLabel(programa) {
  return formatProgramSelectLabel(programa) || `Programa ${programa?.id}`;
}

/** Subtítulo de evento (modal HTML y PDF de detalle). */
export function formatServicioEventSubtitle(evt, ensambleById, programaById) {
  const tipoNombre = stripHtml(evt?.tipos_evento?.nombre) || "Evento";
  const ensNames = (evt?.eventos_ensambles || [])
    .map((row) =>
      stripHtml(ensambleById?.get(Number(row.id_ensamble))?.ensamble),
    )
    .filter(Boolean);
  const prog = evt?.id_gira != null ? programaById?.get(evt.id_gira) : null;
  const loc = stripHtml(evt?.locaciones?.nombre);
  const bits = [tipoNombre];
  if (ensNames.length) bits.push(ensNames.join(", "));
  if (prog) bits.push(giraOptionLabel(prog));
  if (loc) bits.push(loc);
  const desc = stripHtml(evt?.descripcion);
  if (desc && desc.toLowerCase() !== tipoNombre.toLowerCase()) bits.push(desc);
  return stripHtml(bits.join(" · "));
}

export async function resolveRostersForPrograms(supabase, programas) {
  const list = programas || [];
  const entries = await mapInBatches(list, ROSTER_CONCURRENCY, async (g) => {
    const { countedIds, preAltaIds, reemplazoIds, licenciaIds } =
      await resolveGiraRosterForMatrix(supabase, g.id);
    return [
      g.id,
      {
        counted: countedIds,
        preAlta: preAltaIds,
        reemplazo: reemplazoIds,
        licencia: licenciaIds,
      },
    ];
  });
  return Object.fromEntries(entries);
}

export function buildServiciosComputeContext({
  rosterByGiraId,
  memberships,
  customRows,
  programas,
  filteredProgramas,
  fechaDesde,
  fechaHasta,
  giraIdFilter,
  estimarFuturos = false,
  estimableGiraIds = null,
  giraAverage = null,
  programasById = null,
}) {
  return {
    rosterByGiraId: rosterByGiraId || {},
    memberships: memberships || [],
    customByEventId: buildCustomByEventId(customRows),
    draftGiraIds: buildDraftGiraIds(programas),
    filteredProgramIds: new Set(
      (filteredProgramas || []).map((p) => p.id).filter((id) => id != null),
    ),
    fechaDesde,
    fechaHasta,
    giraIdFilter: giraIdFilter || null,
    estimarFuturos: Boolean(estimarFuturos),
    estimableGiraIds: estimableGiraIds instanceof Set ? estimableGiraIds : new Set(),
    giraAverage: giraAverage || null,
    programasById: programasById || new Map(),
  };
}

/**
 * @param {object} params
 * @param {Array} params.visibleRows
 * @param {Record<string, object>} params.bucketsByIntegranteId
 * @param {string} [params.fileName]
 */
export async function downloadServiciosCantidadExcel({
  visibleRows,
  bucketsByIntegranteId,
  rowGroups = [],
  fechaDesde,
  fechaHasta,
  fileName = "cantidad_servicios",
  estimateNote = "",
}) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Servicios");

  const headers = [
    "Integrante",
    "Instrumento",
    "Familia",
    ...SERVICIO_COLUMN_DEFS.map((c) => c.label),
    SERVICIO_POR_MES_COLUMN.label,
  ];
  ws.addRow(headers);
  ws.getRow(1).font = { bold: true };

  const porMesPlain = (row) => {
    const iid = integranteKey(row.id);
    const buckets = bucketsByIntegranteId[iid] || {};
    return formatServiciosPorMesPlain(bucketTotal(buckets.total), row, {
      fechaDesde,
      fechaHasta,
    });
  };

  const pushRow = (row) => {
    const iid = integranteKey(row.id);
    const buckets = bucketsByIntegranteId[iid] || {};
    const name = `${row.apellido || ""}, ${row.nombre || ""}`.trim();
    const inst =
      row.instrumentos?.instrumento ||
      row.instrumentos?.abreviatura ||
      "";
    const familia = row.instrumentos?.familia || "";
    ws.addRow([
      name,
      inst,
      familia,
      ...SERVICIO_COLUMN_DEFS.map((c) =>
        formatServicioPartsPlain(buckets[c.key]),
      ),
      porMesPlain(row),
    ]);
  };

  if (rowGroups?.length) {
    for (const g of rowGroups) {
      if (g.label) {
        const headerRow = ws.addRow([g.label]);
        headerRow.font = { bold: true, italic: true };
      }
      for (const row of g.rows || []) pushRow(row);
    }
  } else {
    for (const row of visibleRows || []) pushRow(row);
  }

  ws.columns.forEach((col) => {
    let max = 10;
    col.eachCell({ includeEmpty: true }, (cell) => {
      const len = String(cell.value ?? "").length;
      if (len > max) max = len;
    });
    col.width = Math.min(max + 2, 28);
  });

  if (estimateNote) {
    const noteRow = ws.addRow([estimateNote]);
    noteRow.font = { italic: true, size: 9 };
  }

  const buf = await wb.xlsx.writeBuffer();
  saveAs(
    new Blob([buf], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    `${fileName}.xlsx`,
  );
}

const PDF_BORDER = [180, 180, 180];
const PDF_GROUP_FILL = [226, 232, 240];
const PDF_HEAD_FILL = [241, 245, 249];
const PDF_POR_MES_FILL = [255, 247, 237];
const DETALLE_COL_COUNT = 6;

function createServiciosPdfDoc() {
  return new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
}

function rangoServiciosLabel(fechaDesde, fechaHasta) {
  if (!fechaDesde || !fechaHasta) return "";
  return `${formatDdMmYyyy(fechaDesde)} – ${formatDdMmYyyy(fechaHasta)}`;
}

function writeServiciosPdfHeader(doc, { title, rango, note }) {
  doc.setFontSize(11);
  doc.setTextColor(0);
  doc.text(title || "Gestión → Servicios", 14, 12);
  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.text(
    [rango, note, `Generado ${new Date().toLocaleString("es-AR")}`]
      .filter(Boolean)
      .join(" · "),
    14,
    17,
    { maxWidth: 180 },
  );
  doc.setTextColor(0);
}

function integrantePdfName(row) {
  const name = `${row?.apellido || ""}, ${row?.nombre || ""}`.trim();
  return name || `Integrante ${row?.id}`;
}

function integrantePdfInstrument(row) {
  return (
    row?.instrumentos?.instrumento ||
    row?.instrumentos?.abreviatura ||
    ""
  );
}

function slugIntegrantePdf(row) {
  const raw = `${row?.apellido || ""}_${row?.nombre || ""}`.trim() || `id_${row?.id}`;
  return raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 48) || "integrante";
}

function pdfStamp() {
  return new Date().toISOString().slice(0, 10);
}

function isPdfGroupSepRow(raw) {
  return (
    Array.isArray(raw) &&
    raw.length === 1 &&
    raw[0] &&
    typeof raw[0] === "object" &&
    Number(raw[0].colSpan) > 1
  );
}

function buildDetallePdfBody(hits, ensambleById, programaById) {
  const sections = groupHitsByDetailSection(hits);
  const body = [];
  for (const section of sections) {
    body.push([
      {
        content: `  > ${section.label}  ·  ${section.hits.length} ev.  ·  ${formatServicioNumber(section.value)}`,
        colSpan: DETALLE_COL_COUNT,
        styles: {
          fillColor: PDF_GROUP_FILL,
          fontStyle: "bold",
          halign: "left",
        },
      },
    ]);
    if (section.hits.length === 0) {
      body.push(["", "", "Ningún evento en esta categoría.", "", "", ""]);
      continue;
    }
    for (const hit of section.hits) {
      const evt = hit.event || {};
      const hora = evt.hora_inicio
        ? `${String(evt.hora_inicio).slice(0, 5)}${
            evt.hora_fin ? `–${String(evt.hora_fin).slice(0, 5)}` : ""
          }`
        : "";
      const dur =
        hit.durationSeconds != null
          ? formatEventDurationLabel(evt)
          : formatServicioHitBandPlain(hit);
      body.push([
        formatDdMmYyyy(evt.fecha) || evt.fecha || "",
        hora,
        formatServicioEventSubtitle(evt, ensambleById, programaById),
        formatServicioMarkLetter(hit.mark),
        dur || "—",
        formatServicioNumber(hit.value),
      ]);
    }
  }
  return body;
}

function personSummaryValueCells(integrante, buckets, fechaDesde, fechaHasta) {
  return [
    ...SERVICIO_COLUMN_DEFS.map((c) =>
      formatServicioPartsPlain(buckets?.[c.key]),
    ),
    formatServiciosPorMesPlain(bucketTotal(buckets?.total), integrante, {
      fechaDesde,
      fechaHasta,
    }),
  ];
}

function appendServiciosDetallePage(doc, {
  integrante,
  hits,
  buckets,
  fechaDesde,
  fechaHasta,
  ensambleById,
  programaById,
  isFirstPage = true,
  estimateNote = "",
}) {
  if (!isFirstPage) doc.addPage("a4", "portrait");
  const rango = rangoServiciosLabel(fechaDesde, fechaHasta);
  writeServiciosPdfHeader(doc, {
    title: integrantePdfName(integrante),
    rango,
    note: estimateNote,
  });

  const inst = integrantePdfInstrument(integrante);
  const familia = integrante?.instrumentos?.familia || "";
  doc.setFontSize(8);
  doc.setTextColor(80);
  doc.text(
    [inst, familia, integrante?.id != null ? `ID ${integrante.id}` : ""]
      .filter(Boolean)
      .join(" · "),
    14,
    21,
  );
  doc.setTextColor(0);

  autoTable(doc, {
    head: [["Categoría", "Valor"]],
    body: (() => {
      const values = personSummaryValueCells(
        integrante,
        buckets,
        fechaDesde,
        fechaHasta,
      );
      const labels = [
        ...SERVICIO_COLUMN_DEFS.map((c) => c.shortLabel),
        SERVICIO_POR_MES_COLUMN.shortLabel,
      ];
      return labels.map((label, i) => [label, values[i]]);
    })(),
    startY: 24,
    theme: "grid",
    styles: {
      fontSize: 8,
      cellPadding: 1.2,
      overflow: "linebreak",
      lineWidth: 0.15,
      lineColor: PDF_BORDER,
      valign: "middle",
    },
    headStyles: {
      fillColor: PDF_HEAD_FILL,
      textColor: [30, 41, 59],
      fontStyle: "bold",
      fontSize: 8,
      lineWidth: 0.15,
      lineColor: PDF_BORDER,
      halign: "center",
    },
    columnStyles: {
      0: { cellWidth: 42, halign: "left" },
      1: { cellWidth: 38, halign: "right" },
    },
    didParseCell: (data) => {
      if (data.section !== "body") return;
      const label = Array.isArray(data.row?.raw)
        ? String(data.row.raw[0] || "")
        : "";
      if (label === "Total") {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = PDF_HEAD_FILL;
      }
      if (label === SERVICIO_POR_MES_COLUMN.shortLabel) {
        data.cell.styles.fillColor = PDF_POR_MES_FILL;
      }
    },
    margin: { left: 12, right: 12 },
    tableWidth: 80,
  });

  const detailStart = (doc.lastAutoTable?.finalY || 24) + 5;

  autoTable(doc, {
    head: [["Fecha", "Horario", "Evento", "R/L", "Dur.", "Valor"]],
    body: buildDetallePdfBody(hits, ensambleById, programaById),
    startY: detailStart,
    theme: "grid",
    styles: {
      fontSize: 7,
      cellPadding: 1,
      overflow: "linebreak",
      lineWidth: 0.15,
      lineColor: PDF_BORDER,
      valign: "middle",
      halign: "left",
    },
    headStyles: {
      fillColor: PDF_HEAD_FILL,
      textColor: [30, 41, 59],
      fontStyle: "bold",
      lineWidth: 0.15,
      lineColor: PDF_BORDER,
      halign: "center",
    },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 22 },
      2: { cellWidth: 88 },
      3: { cellWidth: 12, halign: "center" },
      4: { cellWidth: 16, halign: "center" },
      5: { cellWidth: 16, halign: "right" },
    },
    didParseCell: (data) => {
      if (isPdfGroupSepRow(data.row?.raw)) return;
      if (data.section === "body" && data.column.index === 3) {
        const rawText = data.cell?.text;
        const letter = Array.isArray(rawText)
          ? rawText.join("")
          : String(rawText || "");
        if (letter === "R") data.cell.styles.textColor = [2, 132, 199];
        if (letter === "L") data.cell.styles.textColor = [217, 119, 6];
      }
    },
    margin: { left: 12, right: 12 },
    tableWidth: "auto",
    showHead: "everyPage",
  });
}

/**
 * PDF del listado general (mismas columnas y separadores que la tabla HTML).
 * Stack: jsPDF + autoTable, igual que Gestión → Convocatorias. A4 vertical.
 */
export function downloadServiciosCantidadPdf({
  visibleRows,
  bucketsByIntegranteId,
  rowGroups = [],
  fechaDesde,
  fechaHasta,
  groupByEnsambles = false,
  fileName = "cantidad_servicios",
  estimateNote = "",
}) {
  const colCount = 2 + SERVICIO_COLUMN_DEFS.length + 1;
  const doc = createServiciosPdfDoc();
  const rango = rangoServiciosLabel(fechaDesde, fechaHasta);

  writeServiciosPdfHeader(doc, {
    title: "Gestión → Servicios",
    rango,
    note: estimateNote,
  });

  const head = [
    [
      "Integrante",
      "Instrumento",
      ...SERVICIO_COLUMN_DEFS.map((c) => c.shortLabel),
      SERVICIO_POR_MES_COLUMN.shortLabel,
    ],
  ];

  const body = [];
  const groups =
    groupByEnsambles && rowGroups?.length
      ? rowGroups
      : [{ key: "flat", label: null, rows: visibleRows || [] }];

  const dataCells = (row) => {
    const iid = integranteKey(row.id);
    const buckets = bucketsByIntegranteId[iid] || {};
    return [
      integrantePdfName(row),
      integrantePdfInstrument(row),
      ...SERVICIO_COLUMN_DEFS.map((c) =>
        formatServicioPartsPlain(buckets[c.key]),
      ),
      formatServiciosPorMesPlain(bucketTotal(buckets.total), row, {
        fechaDesde,
        fechaHasta,
      }),
    ];
  };

  for (const g of groups) {
    if (g.label) {
      body.push([
        {
          content: `  > ${g.label}`,
          colSpan: colCount,
          styles: {
            fillColor: PDF_GROUP_FILL,
            fontStyle: "bold",
            halign: "left",
          },
        },
      ]);
    }
    for (const row of g.rows || []) body.push(dataCells(row));
  }

  const totals = sumBuckets(
    (visibleRows || []).map(
      (r) => bucketsByIntegranteId[integranteKey(r.id)],
    ),
  );
  body.push([
    "Totales",
    "",
    ...SERVICIO_COLUMN_DEFS.map((c) =>
      formatServicioPartsPlain(totals[c.key]),
    ),
    "—",
  ]);

  const totalCol = 2 + SERVICIO_COLUMN_DEFS.length - 1;
  const porMesCol = totalCol + 1;

  autoTable(doc, {
    head,
    body,
    startY: 22,
    theme: "grid",
    styles: {
      fontSize: 6.5,
      cellPadding: 0.8,
      overflow: "linebreak",
      lineWidth: 0.15,
      lineColor: PDF_BORDER,
      valign: "middle",
      halign: "right",
    },
    headStyles: {
      fillColor: PDF_HEAD_FILL,
      textColor: [30, 41, 59],
      fontStyle: "bold",
      fontSize: 6.5,
      lineWidth: 0.15,
      lineColor: PDF_BORDER,
      halign: "center",
    },
    columnStyles: {
      0: { cellWidth: 32, halign: "left" },
      1: { cellWidth: 22, halign: "left" },
    },
    didParseCell: (data) => {
      const raw = data.row?.raw;
      if (isPdfGroupSepRow(raw)) return;
      const isTotals =
        data.section === "body" &&
        Array.isArray(raw) &&
        raw[0] === "Totales";
      if (data.section === "head" && data.column.index === porMesCol) {
        data.cell.styles.fillColor = PDF_POR_MES_FILL;
      }
      if (data.section === "body" && data.column.index === totalCol) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = PDF_HEAD_FILL;
      }
      if (data.section === "body" && data.column.index === porMesCol) {
        data.cell.styles.fillColor = PDF_POR_MES_FILL;
      }
      if (isTotals) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = PDF_HEAD_FILL;
      }
    },
    margin: { left: 10, right: 10 },
    tableWidth: "auto",
    showHead: "everyPage",
  });

  const y = (doc.lastAutoTable?.finalY || 22) + 6;
  if (y < 275) {
    doc.setFontSize(7);
    doc.setTextColor(100);
    doc.text(
      [
        "Servicios/mes = Total ÷ meses feb–dic de presencia (fecha_alta). Enero no cuenta. Totales de Servicios/mes: —.",
        estimateNote,
      ]
        .filter(Boolean)
        .join(" "),
      10,
      y,
      { maxWidth: 190 },
    );
  }

  doc.save(`${fileName}_${pdfStamp()}.pdf`);
}

/** PDF de detalle de una persona (mismas categorías colapsables que el modal). */
export function downloadServiciosCantidadDetallePdf({
  integrante,
  hits,
  buckets,
  fechaDesde,
  fechaHasta,
  ensambleById,
  programaById,
  estimateNote = "",
}) {
  const doc = createServiciosPdfDoc();
  appendServiciosDetallePage(doc, {
    integrante,
    hits,
    buckets,
    fechaDesde,
    fechaHasta,
    ensambleById,
    programaById,
    isFirstPage: true,
    estimateNote,
  });
  doc.save(
    `servicios_detalle_${slugIntegrantePdf(integrante)}_${pdfStamp()}.pdf`,
  );
}

/**
 * Lote: un solo PDF, una página (o más si el detalle desborda) por integrante.
 * Mismo patrón que Seating unificado (`addPage` por ítem).
 */
export function downloadServiciosCantidadDetalleLotePdf({
  visibleRows,
  events,
  computeCtx,
  bucketsByIntegranteId,
  fechaDesde,
  fechaHasta,
  ensambleById,
  programaById,
  fileName = "servicios_detalle_lote",
  estimateNote = "",
}) {
  const rows = visibleRows || [];
  if (rows.length === 0) return;
  const doc = createServiciosPdfDoc();
  rows.forEach((row, i) => {
    const iid = integranteKey(row.id);
    appendServiciosDetallePage(doc, {
      integrante: row,
      hits: listServicioHitsForIntegrante(row.id, events, computeCtx),
      buckets: bucketsByIntegranteId[iid] || {},
      fechaDesde,
      fechaHasta,
      ensambleById,
      programaById,
      isFirstPage: i === 0,
      estimateNote,
    });
  });
  doc.save(`${fileName}_${pdfStamp()}.pdf`);
}
