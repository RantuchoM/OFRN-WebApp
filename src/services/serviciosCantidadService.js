import ExcelJS from "exceljs";
import { XLSX_MIME } from "../utils/downloadBlob";
import autoTable from "jspdf-autotable";
import { resolveGiraRosterForMatrix } from "./giraService";
import { fetchRosterForGira } from "../hooks/useGiraRoster";
import {
  attachConflictoToDetalleHits,
  matrixRosterFromGiraRoster,
} from "../utils/serviciosEnsayosConflicto";
import { formatDdMmYyyy } from "../utils/dates";
import {
  PDF_BORDER,
  PDF_GROUP_FILL,
  PDF_HEAD_FILL,
  createServiciosPdfDoc,
  deliverBlob,
  deliverPdf,
  pdfStamp,
  toServiciosPdfText,
} from "../utils/serviciosPdf";
import { stripHtml } from "../utils/eventDisplayUtils";
import {
  isIntegranteConvocadoToEnsayo,
  isProgramBorrador,
} from "../utils/girasYearSummary";
import {
  ID_TIPO_CONCIERTO,
  ID_TIPO_ENSAYO_ENSAMBLE,
  SERVICIO_COLUMN_DEFS,
  SERVICIO_EVENT_TYPE_IDS,
  SERVICIO_POR_MES_COLUMN,
  buildCustomByEventId,
  buildDraftGiraIds,
  customMapForIntegrante,
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
  groupHitsByProgramTipo,
  listServicioHitsForIntegrante,
  sumBuckets,
} from "../utils/serviciosCantidad";
import { currentYearBounds } from "../utils/girasYearSummary";
import { integranteKey } from "../utils/integranteIds";
import { formatProgramSelectLabel } from "../utils/giraUtils";
import { attachEnsambleCfIds } from "../utils/serviciosEnsambleReport";

const PAGE_SIZE = 1000;
const MAX_PAGES = 40;
const IN_CHUNK = 200;
const ROSTER_CONCURRENCY = 8;

const PROGRAMAS_FUENTES_SELECT = `id, nomenclador, mes_letra, nombre_gira, subtitulo, tipo, fecha_desde, fecha_hasta, zona, estado,
            giras_fuentes ( id, tipo, valor_id, valor_texto )`;

const EVENT_SELECT = `
  id, fecha, hora_inicio, hora_fin, tecnica, is_deleted, ensayo_pese_conflicto, ensayo_pese_conflicto_justificacion, id_tipo_evento, id_gira, id_locacion, es_didactico, descripcion,
  tipos_evento ( id, nombre ),
  locaciones ( id, nombre ),
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

/**
 * Catálogo ensambles+CF + programas con `giras_fuentes` que solapan el rango.
 * Una sola tanda (no N queries). Sirve para detectar conflicto pleno en memoria.
 */
export async function fetchConflictoAgendaContext(
  supabase,
  { fechaDesde, fechaHasta } = {},
) {
  if (!supabase) {
    return { programas: [], ensambles: [], error: null };
  }
  const range = normalizeDateRange(fechaDesde, fechaHasta);
  try {
    const programasRaw = await fetchAllPaged(() =>
      supabase
        .from("programas")
        .select(PROGRAMAS_FUENTES_SELECT)
        .lte("fecha_desde", range.fechaHasta)
        .or(`fecha_hasta.gte.${range.fechaDesde},fecha_hasta.is.null`),
    );
    const ensamblesRaw = await supabase
      .from("ensambles")
      .select("id, ensamble, id_familia")
      .order("ensamble");
    const ensCfRaw = await supabase
      .from("ensambles_cf")
      .select("id_ensamble, id_ensamble_cf");
    if (ensamblesRaw.error) throw ensamblesRaw.error;
    if (ensCfRaw.error) throw ensCfRaw.error;
    return {
      programas: (programasRaw || []).filter((p) => !isProgramBorrador(p)),
      ensambles: attachEnsambleCfIds(
        ensamblesRaw.data || [],
        ensCfRaw.data || [],
      ),
      error: null,
      ...range,
    };
  } catch (e) {
    console.error("[serviciosCantidad] conflicto agenda context:", e);
    return { programas: [], ensambles: [], error: e, ...range };
  }
}

const liteSeatingRosterMemo = new Map();

/**
 * Nómina de seating por programa, **en serie** (evita storm de getSession).
 * Memo por id de gira. Solo Tutti-N (Lista), nunca Agenda.
 */
export async function resolveSeatingRostersSequential(supabase, programas) {
  const out = {};
  for (const g of programas || []) {
    const id = Number(g?.id);
    if (!Number.isFinite(id)) continue;
    if (liteSeatingRosterMemo.has(id)) {
      const cached = liteSeatingRosterMemo.get(id);
      out[id] = cached;
      out[g.id] = cached;
      out[String(id)] = cached;
      continue;
    }
    const { roster } = await fetchRosterForGira(supabase, g, { lite: true });
    const matrix = matrixRosterFromGiraRoster(roster);
    liteSeatingRosterMemo.set(id, matrix);
    out[id] = matrix;
    out[g.id] = matrix;
    out[String(id)] = matrix;
  }
  return out;
}

/** @deprecated Usar `resolveSeatingRostersSequential`. Concurrencia 1. */
export async function resolveSeatingRostersForPrograms(supabase, programas) {
  return resolveSeatingRostersSequential(supabase, programas);
}

export async function fetchTuttiNMembershipContext(supabase, ensambleIds) {
  const ids = [...new Set((ensambleIds || []).map(Number).filter(Number.isFinite))];
  if (!supabase || !ids.length) {
    return { memberships: [], integrantes: [] };
  }
  const memberships = await fetchInIdChunks(
    supabase,
    "integrantes_ensambles",
    "id_ensamble, id_integrante, fecha_desde, fecha_hasta",
    "id_ensamble",
    ids,
  );
  const integranteIds = [
    ...new Set(
      (memberships || [])
        .map((row) => row.id_integrante)
        .filter((id) => id != null),
    ),
  ];
  const integrantes = integranteIds.length
    ? await fetchInIdChunks(
        supabase,
        "integrantes",
        "id, nombre, apellido, id_instr",
        "id",
        integranteIds,
      )
    : [];
  return { memberships: memberships || [], integrantes: integrantes || [] };
}

/**
 * Ensayos de ensamble (tipo 13) + membresías + giras que solapan el rango.
 * Conflicto pleno = classify + overlap (sin seating). Roster seating NO se
 * baja aquí (evita N getSession); Tutti-N lo pide Coordinación Lista aparte.
 */
export async function fetchEnsayosConflictoPeriod(
  supabase,
  { fechaDesde, fechaHasta } = {},
) {
  if (!supabase) {
    return {
      events: [],
      customRows: [],
      memberships: [],
      programas: [],
      ensambles: [],
      integrantes: [],
      rosterByGiraId: {},
      error: null,
    };
  }
  const range = normalizeDateRange(fechaDesde, fechaHasta);
  try {
    const eventsRaw = await fetchAllPaged(() =>
      supabase
        .from("eventos")
        .select(EVENT_SELECT)
        .eq("is_deleted", false)
        .eq("id_tipo_evento", ID_TIPO_ENSAYO_ENSAMBLE)
        .gte("fecha", range.fechaDesde)
        .lte("fecha", range.fechaHasta)
        .order("fecha", { ascending: true })
        .order("hora_inicio", { ascending: true }),
    );
    const events = eventsRaw || [];
    const eventIds = events.map((e) => e.id).filter(Boolean);

    const [
      customRows,
      memberships,
      programasRaw,
      ensamblesRaw,
      ensCfRaw,
      integrantesRaw,
    ] = await Promise.all([
      eventIds.length
        ? fetchInIdChunks(
            supabase,
            "eventos_asistencia_custom",
            "id_evento, id_integrante, tipo",
            "id_evento",
            eventIds,
          )
        : Promise.resolve([]),
      fetchAllPaged(() =>
        supabase
          .from("integrantes_ensambles")
          .select("id_ensamble, id_integrante, fecha_desde, fecha_hasta"),
      ),
      fetchAllPaged(() =>
        supabase
          .from("programas")
          .select(PROGRAMAS_FUENTES_SELECT)
          .lte("fecha_desde", range.fechaHasta)
          .or(`fecha_hasta.gte.${range.fechaDesde},fecha_hasta.is.null`),
      ),
      supabase
        .from("ensambles")
        .select("id, ensamble, id_familia")
        .order("ensamble"),
      supabase.from("ensambles_cf").select("id_ensamble, id_ensamble_cf"),
      supabase.from("integrantes").select("id, nombre, apellido, id_instr"),
    ]);
    if (ensamblesRaw.error) throw ensamblesRaw.error;
    if (ensCfRaw.error) throw ensCfRaw.error;
    if (integrantesRaw.error) throw integrantesRaw.error;

    const programas = (programasRaw || []).filter((p) => !isProgramBorrador(p));

    return {
      events,
      customRows: customRows || [],
      memberships: memberships || [],
      programas,
      ensambles: attachEnsambleCfIds(
        ensamblesRaw.data || [],
        ensCfRaw.data || [],
      ),
      integrantes: integrantesRaw.data || [],
      rosterByGiraId: {},
      error: null,
      ...range,
    };
  } catch (e) {
    console.error("[serviciosCantidad] ensayos conflicto:", e);
    return {
      events: [],
      customRows: [],
      memberships: [],
      programas: [],
      ensambles: [],
      integrantes: [],
      rosterByGiraId: {},
      error: e,
      ...range,
    };
  }
}

/** Conciertos del período (tipo 1) para el informe de un ensamble. */
export async function fetchConciertosPeriod(
  supabase,
  { fechaDesde, fechaHasta } = {},
) {
  if (!supabase) {
    return { events: [], error: null };
  }
  const range = normalizeDateRange(fechaDesde, fechaHasta);
  try {
    const events = await fetchAllPaged(() =>
      supabase
        .from("eventos")
        .select(EVENT_SELECT)
        .eq("is_deleted", false)
        .eq("id_tipo_evento", ID_TIPO_CONCIERTO)
        .gte("fecha", range.fechaDesde)
        .lte("fecha", range.fechaHasta)
        .order("fecha", { ascending: true })
        .order("hora_inicio", { ascending: true }),
    );
    return { events: events || [], error: null, ...range };
  } catch (e) {
    console.error("[serviciosCantidad] conciertos periodo:", e);
    return { events: [], error: e, ...range };
  }
}

/**
 * Bundle del informe por ensamble: ensayos + nómina (conflicto),
 * conciertos, y programas con `giras_fuentes` (ENSAMBLE / FAMILIA / EXCL_ENSAMBLE).
 */
export async function fetchEnsambleServiciosBundle(
  supabase,
  { fechaDesde, fechaHasta } = {},
) {
  const range = normalizeDateRange(fechaDesde, fechaHasta);
  if (!supabase) {
    return {
      events: [],
      customRows: [],
      memberships: [],
      programas: [],
      rosterByGiraId: {},
      error: null,
      ...range,
    };
  }
  try {
    const [conflicto, conciertos, programasRaw] = await Promise.all([
      fetchEnsayosConflictoPeriod(supabase, range),
      fetchConciertosPeriod(supabase, range),
      fetchAllPaged(() =>
        supabase
          .from("programas")
          .select(
            `id, nomenclador, mes_letra, nombre_gira, subtitulo, tipo, fecha_desde, fecha_hasta, zona, estado,
            giras_fuentes ( id, tipo, valor_id, valor_texto )`,
          )
          .lte("fecha_desde", range.fechaHasta)
          .or(`fecha_hasta.gte.${range.fechaDesde},fecha_hasta.is.null`),
      ),
    ]);
    const error = conflicto.error || conciertos.error;
    if (error) {
      return {
        events: [],
        customRows: [],
        memberships: [],
        programas: [],
        rosterByGiraId: {},
        error,
        ...range,
      };
    }
    const programas = (programasRaw || []).filter((p) => !isProgramBorrador(p));
    return {
      events: [...(conciertos.events || []), ...(conflicto.events || [])],
      customRows: conflicto.customRows || [],
      memberships: conflicto.memberships || [],
      programas,
      rosterByGiraId: conflicto.rosterByGiraId || {},
      error: null,
      ...range,
    };
  } catch (e) {
    console.error("[serviciosCantidad] ensamble informe:", e);
    return {
      events: [],
      customRows: [],
      memberships: [],
      programas: [],
      rosterByGiraId: {},
      error: e,
      ...range,
    };
  }
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
  pendingConflictoEventIds = null,
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
    pendingConflictoEventIds:
      pendingConflictoEventIds instanceof Set
        ? pendingConflictoEventIds
        : new Set(),
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
  const safe = String(fileName || "cantidad_servicios").replace(/\.xlsx$/i, "");
  return deliverBlob(
    new Blob([buf], { type: XLSX_MIME }),
    `${safe}_${pdfStamp()}.xlsx`,
  );
}

const PDF_POR_MES_FILL = [255, 247, 237];
const DETALLE_COL_COUNT = 6;

function rangoServiciosLabel(fechaDesde, fechaHasta) {
  if (!fechaDesde || !fechaHasta) return "";
  return `${formatDdMmYyyy(fechaDesde)} - ${formatDdMmYyyy(fechaHasta)}`;
}

function writeServiciosPdfHeader(doc, { title, rango, note }) {
  doc.setFontSize(11);
  doc.setTextColor(0);
  doc.text(toServiciosPdfText(title || "Gestion Servicios"), 14, 12);
  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.text(
    [rango, note, `Generado ${new Date().toLocaleString("es-AR")}`]
      .filter(Boolean)
      .map(toServiciosPdfText)
      .join(" - "),
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

function isPdfGroupSepRow(raw) {
  return (
    Array.isArray(raw) &&
    raw.length === 1 &&
    raw[0] &&
    typeof raw[0] === "object" &&
    Number(raw[0].colSpan) > 1
  );
}

const CONFLICTO_PDF_FILL = {
  pending: [255, 251, 235],
  kept: [236, 253, 245],
  partial: [240, 249, 255],
  resolved: [248, 250, 252],
};

function conflictoPdfCells(values, tone) {
  const fill = CONFLICTO_PDF_FILL[tone];
  if (!fill) return values;
  return values.map((value) => ({
    content: value,
    styles: { fillColor: fill },
  }));
}

function detalleHitsWithConflicto(
  integranteId,
  events,
  computeCtx,
  conflictoGroups,
  sessionByEventId,
) {
  return attachConflictoToDetalleHits({
    hits: listServicioHitsForIntegrante(integranteId, events, computeCtx),
    events,
    integranteId,
    groups: conflictoGroups,
    sessionByEventId,
    isConvocado: (evt) =>
      isIntegranteConvocadoToEnsayo(
        evt,
        integranteId,
        computeCtx?.memberships,
        customMapForIntegrante(computeCtx?.customByEventId, integranteId),
      ),
  });
}

function buildDetallePdfBody(hits, ensambleById, programaById) {
  const sections = groupHitsByDetailSection(hits);
  const body = [];
  for (const section of sections) {
    body.push([
      {
        content: toServiciosPdfText(
          `  > ${section.label}  -  ${section.hits.length} ev.  -  ${formatServicioNumber(section.value)}`,
        ),
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
            evt.hora_fin ? `-${String(evt.hora_fin).slice(0, 5)}` : ""
          }`
        : "";
      const dur =
        hit.durationSeconds != null
          ? formatEventDurationLabel(evt)
          : formatServicioHitBandPlain(hit);
      const conflictoNote = hit.conflicto?.label
        ? ` - ${hit.conflicto.label}${
            hit.conflicto.giras ? ` (${hit.conflicto.giras})` : ""
          }${hit.displayOnly ? " - no suma" : ""}`
        : "";
      body.push(
        conflictoPdfCells(
          [
            formatDdMmYyyy(evt.fecha) || evt.fecha || "",
            hora,
            toServiciosPdfText(
              `${formatServicioEventSubtitle(evt, ensambleById, programaById)}${conflictoNote}`,
            ),
            formatServicioMarkLetter(hit.mark),
            toServiciosPdfText(dur || "-", { padHyphen: false }),
            formatServicioNumber(hit.value),
          ],
          hit.conflicto?.tone,
        ),
      );
    }
  }
  return body;
}

/** Colores PDF alineados a PROGRAM_TYPES (resumen del año en Giras). */
const PROGRAM_TIPO_PDF = {
  Sinfónico: {
    fill: [238, 242, 255],
    text: [67, 56, 202],
    border: [199, 210, 254],
  },
  "Camerata Filarmónica": {
    fill: [253, 244, 255],
    text: [162, 28, 175],
    border: [245, 208, 254],
  },
  Ensamble: {
    fill: [236, 253, 245],
    text: [4, 120, 87],
    border: [167, 243, 208],
  },
  "Jazz Band": {
    fill: [255, 251, 235],
    text: [180, 83, 9],
    border: [253, 230, 138],
  },
  Comisión: {
    fill: [224, 242, 254],
    text: [2, 132, 199],
    border: [125, 211, 252],
  },
  default: {
    fill: [248, 250, 252],
    text: [71, 85, 105],
    border: [226, 232, 240],
  },
};

function drawChip(doc, { x, y, w, h, fill, border, textColor, label, value }) {
  doc.setFillColor(...fill);
  doc.setDrawColor(...border);
  doc.setLineWidth(0.25);
  doc.roundedRect(x, y, w, h, 1.4, 1.4, "FD");
  doc.setTextColor(...textColor);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  const num = String(value ?? "");
  const numW = Math.max(doc.getTextWidth(num) + 2.4, 8);
  doc.text(String(label || ""), x + 1.6, y + h / 2 + 0.8, {
    maxWidth: Math.max(w - numW - 4, 8),
  });
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(x + w - numW - 1.2, y + 1.2, numW, h - 2.4, 0.8, 0.8, "F");
  doc.setTextColor(...textColor);
  doc.text(num, x + w - numW / 2 - 1.2, y + h / 2 + 0.8, { align: "center" });
}

/**
 * Recuadro de primera página al estilo GirasYearSummaryBar:
 * tipos de programa en columnas; debajo, nomenclador + nombre.
 */
function drawServiciosYearSummaryRecuadro(doc, {
  startY,
  hits,
  buckets,
  integrante,
  fechaDesde,
  fechaHasta,
  programaById,
  ensambleById,
}) {
  const left = 12;
  const width = 186;
  const pad = 3;
  const entries = groupHitsByProgramTipo(hits, programaById, ensambleById);
  const totalPlain = formatServicioNumber(bucketTotal(buckets?.total));
  const porMes = formatServiciosPorMesPlain(
    bucketTotal(buckets?.total),
    integrante,
    { fechaDesde, fechaHasta },
  );

  const n = Math.max(entries.length, 1);
  const gap = 2;
  const innerW = width - pad * 2;
  const colW = (innerW - gap * (n - 1)) / n;
  const lineH = 3.1;
  const chipH = 8;
  const headerH = 5.5;
  const totalsH = 9;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  const colLines = entries.map((e) => {
    const lines = [];
    for (const p of e.programs) {
      const label = stripHtml(p.label) || "—";
      const wrapped = doc.splitTextToSize(label, Math.max(colW - 1.5, 12));
      lines.push(...(Array.isArray(wrapped) ? wrapped : [wrapped]));
    }
    return lines;
  });
  const maxLines = colLines.reduce((m, l) => Math.max(m, l.length), 1);
  const listH = maxLines * lineH;
  const boxH = pad + headerH + totalsH + chipH + 2 + listH + pad;

  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(255, 255, 255);
  doc.setLineWidth(0.3);
  doc.roundedRect(left, startY, width, boxH, 2.5, 2.5, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text("RESUMEN", left + pad, startY + pad + 3.5);

  const chipY = startY + pad + headerH;
  drawChip(doc, {
    x: left + pad,
    y: chipY,
    w: 42,
    h: 7.2,
    fill: [238, 242, 255],
    border: [199, 210, 254],
    textColor: [67, 56, 202],
    label: "Total",
    value: totalPlain,
  });
  drawChip(doc, {
    x: left + pad + 44,
    y: chipY,
    w: 52,
    h: 7.2,
    fill: [255, 247, 237],
    border: [253, 186, 116],
    textColor: [154, 52, 18],
    label: "Serv/mes",
    value: porMes,
  });

  if (!entries.length) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text("Sin programas en el rango.", left + pad, chipY + totalsH + 5);
    return startY + boxH + 3;
  }

  let x = left + pad;
  const colTop = startY + pad + headerH + totalsH;
  entries.forEach((e, i) => {
    const colors = PROGRAM_TIPO_PDF[e.tipo] || PROGRAM_TIPO_PDF.default;
    drawChip(doc, {
      x,
      y: colTop,
      w: colW,
      h: chipH,
      fill: colors.fill,
      border: colors.border,
      textColor: colors.text,
      label: e.tipo,
      value: formatServicioNumber(e.value),
    });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(51, 65, 85);
    let ly = colTop + chipH + 3.2;
    for (const line of colLines[i]) {
      doc.text(String(line), x + 0.4, ly, { maxWidth: colW - 0.8 });
      ly += lineH;
    }
    x += colW + gap;
  });

  return startY + boxH + 3;
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
      .map(toServiciosPdfText)
      .join(" - "),
    14,
    21,
  );
  doc.setTextColor(0);

  const detailStart = drawServiciosYearSummaryRecuadro(doc, {
    startY: 24,
    hits,
    buckets,
    integrante,
    fechaDesde,
    fechaHasta,
    programaById,
    ensambleById,
  });

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
    title: "Gestion Servicios",
    rango,
    note: estimateNote,
  });

  const head = [
    [
      "Integrante",
      "Instrumento",
      ...SERVICIO_COLUMN_DEFS.map((c) => toServiciosPdfText(c.shortLabel)),
      toServiciosPdfText(SERVICIO_POR_MES_COLUMN.shortLabel),
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
        toServiciosPdfText(formatServicioPartsPlain(buckets[c.key]), {
          padHyphen: false,
        }),
      ),
      toServiciosPdfText(
        formatServiciosPorMesPlain(bucketTotal(buckets.total), row, {
          fechaDesde,
          fechaHasta,
        }),
        { padHyphen: false },
      ),
    ];
  };

  for (const g of groups) {
    if (g.label) {
      body.push([
        {
          content: toServiciosPdfText(`  > ${g.label}`),
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
      toServiciosPdfText(formatServicioPartsPlain(totals[c.key]), {
        padHyphen: false,
      }),
    ),
    "-",
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
        "Servicios/mes = Total / meses feb-dic de presencia (fecha_alta). Enero no cuenta. Totales de Servicios/mes: -.",
        estimateNote,
      ]
        .filter(Boolean)
        .map(toServiciosPdfText)
        .join(" "),
      10,
      y,
      { maxWidth: 190 },
    );
  }

  return deliverPdf(doc, `${fileName}_${pdfStamp()}.pdf`);
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
  return deliverPdf(
    doc,
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
  conflictoGroups = [],
  sessionByEventId = null,
}) {
  const rows = visibleRows || [];
  if (rows.length === 0) return;
  const doc = createServiciosPdfDoc();
  rows.forEach((row, i) => {
    const iid = integranteKey(row.id);
    appendServiciosDetallePage(doc, {
      integrante: row,
      hits: detalleHitsWithConflicto(
        row.id,
        events,
        computeCtx,
        conflictoGroups,
        sessionByEventId,
      ),
      buckets: bucketsByIntegranteId[iid] || {},
      fechaDesde,
      fechaHasta,
      ensambleById,
      programaById,
      isFirstPage: i === 0,
      estimateNote,
    });
  });
  return deliverPdf(doc, `${fileName}_${pdfStamp()}.pdf`);
}
