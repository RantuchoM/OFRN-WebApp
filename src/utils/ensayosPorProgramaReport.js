import ExcelJS from "exceljs";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { saveAs } from "file-saver";
import { format, parseISO, startOfDay } from "date-fns";
import {
  TIPOS_PROGRAMA_ASISTENCIA_MATRIZ,
  resolveGiraRosterIds,
} from "../services/giraService";
import { membershipActiveOnProgramDate } from "./ensembleMembership";
import { getEventProgramIds } from "./rehearsalProgramas";

/** Tipos de programa disponibles en el reporte (sin Comisión). */
export const TIPOS_PROGRAMA_ENSAYOS_REPORTE =
  TIPOS_PROGRAMA_ASISTENCIA_MATRIZ.filter((t) => t !== "Comisión");

/** Tipos que arrancan desmarcados en el informe. */
export const TIPOS_PROGRAMA_OFF_BY_DEFAULT = new Set([
  "Jazz Band",
  "Ensamble",
]);

export const DEFAULT_TIPOS_PROGRAMA_ENSAYOS = new Set(
  TIPOS_PROGRAMA_ENSAYOS_REPORTE.filter(
    (t) => !TIPOS_PROGRAMA_OFF_BY_DEFAULT.has(t),
  ),
);

function normalizeEnsembleLabel(name) {
  return String(name ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/** Nombres de ensamble desmarcados por defecto (además de prefijo CF). */
const ENSEMBLE_NAMES_OFF_BY_DEFAULT = new Set(["produccion", "jazz band"]);

/** Ensambles desmarcados por defecto: CF*, Producción, Jazz Band. */
export function isEnsembleSelectedByDefault(ensambleRow) {
  const raw = String(ensambleRow?.ensamble ?? "").trim();
  if (raw.toUpperCase().startsWith("CF")) return false;
  if (ENSEMBLE_NAMES_OFF_BY_DEFAULT.has(normalizeEnsembleLabel(raw)))
    return false;
  return true;
}

/** Copia nueva del Set de tipos activos al abrir el informe. */
export function createDefaultSelectedProgramTypes() {
  return new Set(
    TIPOS_PROGRAMA_ENSAYOS_REPORTE.filter(
      (t) => !TIPOS_PROGRAMA_OFF_BY_DEFAULT.has(t),
    ),
  );
}

export function getDefaultSelectedEnsembleIds(ensambles) {
  return (ensambles || [])
    .filter(isEnsembleSelectedByDefault)
    .map((e) => Number(e.id))
    .filter(Number.isFinite);
}

const SUMMARY_FILL_ARGB = "FFE2E8F0";

function startOfToday() {
  return startOfDay(new Date());
}

function parseProgramDate(iso) {
  if (!iso) return null;
  try {
    return startOfDay(parseISO(String(iso).slice(0, 10)));
  } catch {
    return null;
  }
}

/** Rango legible de fechas del programa (dd/MM/yyyy). */
export function formatProgramaFechas(programa) {
  const from = parseProgramDate(programa?.fecha_desde);
  const to = parseProgramDate(programa?.fecha_hasta);
  if (!from && !to) return "";
  if (from && to) {
    if (from.getTime() === to.getTime()) return format(from, "dd/MM/yyyy");
    return `${format(from, "dd/MM/yyyy")} – ${format(to, "dd/MM/yyyy")}`;
  }
  if (from) return `Desde ${format(from, "dd/MM/yyyy")}`;
  return `Hasta ${format(to, "dd/MM/yyyy")}`;
}

/**
 * Integrantes de los ensambles indicados con membresía activa en fecha_desde del programa.
 * @returns {Set<number>}
 */
export function getEnsembleMemberIdsForProgram(
  memberships,
  ensembleIds,
  programFechaDesde,
) {
  const ensSet = new Set((ensembleIds || []).map(Number));
  const members = new Set();
  for (const row of memberships || []) {
    const eid = Number(row.id_ensamble);
    const iid = Number(row.id_integrante);
    if (!ensSet.has(eid) || !Number.isFinite(iid)) continue;
    if (!membershipActiveOnProgramDate(row, programFechaDesde)) continue;
    members.add(iid);
  }
  return members;
}

/** True si al menos un integrante de los ensambles está en la nómina convocada del programa. */
export async function programHasConvokedEnsembleMember(
  supabase,
  program,
  ensembleIds,
  memberships,
) {
  const memberIds = getEnsembleMemberIdsForProgram(
    memberships,
    ensembleIds,
    program.fecha_desde,
  );
  if (memberIds.size === 0) return false;
  const rosterIds = await resolveGiraRosterIds(supabase, program.id);
  const rosterSet = new Set(rosterIds.map(Number));
  return [...memberIds].some((id) => rosterSet.has(id));
}

/**
 * Deja solo programas con al menos un músico convocado perteneciente a los ensambles dados.
 */
export async function filterProgramasWithEnsembleConvocados(
  supabase,
  programas,
  ensembleIds,
  memberships,
) {
  if (!programas?.length || !ensembleIds?.length) return [];
  const checks = await Promise.all(
    programas.map(async (p) => {
      const ok = await programHasConvokedEnsembleMember(
        supabase,
        p,
        ensembleIds,
        memberships,
      );
      return ok ? p : null;
    }),
  );
  return checks.filter(Boolean);
}

export function filterProgramasForEnsayosReport(
  programas,
  { selectedTypes, showPastInYear },
) {
  const today = startOfToday();
  const currentYear = today.getFullYear();
  return (programas || []).filter((p) => {
    const tipo = p.tipo;
    if (!tipo || !selectedTypes.has(tipo)) return false;
    if (!p.fecha_desde) return false;
    const fd = parseProgramDate(p.fecha_desde);
    if (!fd) return false;
    if (fd >= today) return true;
    if (showPastInYear && fd < today && fd.getFullYear() === currentYear)
      return true;
    return false;
  });
}

/**
 * @param {object} evt — fila de eventos con relaciones embebidas
 * @returns {Set<number>}
 */
export function getRehearsalEventProgramIds(evt) {
  const wrapped = {
    id_gira: evt.id_gira,
    programas: evt.id_gira != null ? { id: evt.id_gira } : null,
    eventos_programas_asociados: (evt.eventos_programas_asociados || []).map(
      (row) => ({
        programas: row.id_programa != null ? { id: row.id_programa } : null,
        id_programa: row.id_programa,
      }),
    ),
  };
  return getEventProgramIds(wrapped);
}

/**
 * Cuenta ensayos de ensamble por par (programa, ensamble).
 * @returns {Map<string, number>} clave `${programId}-${ensembleId}`
 */
export function buildEnsayosPorProgramaCounts(
  events,
  { programIds, ensembleIds },
) {
  const programSet = new Set(programIds);
  const ensembleSet = new Set(ensembleIds.map(Number));
  const counts = new Map();

  for (const evt of events || []) {
    if (evt.is_deleted) continue;
    const progIds = getRehearsalEventProgramIds(evt);
    const ensIds = (evt.eventos_ensambles || [])
      .map((row) => Number(row.id_ensamble))
      .filter((id) => Number.isFinite(id));

    for (const pid of progIds) {
      if (!programSet.has(pid)) continue;
      for (const eid of ensIds) {
        if (!ensembleSet.has(eid)) continue;
        const key = ensayoCellKey(pid, eid);
        counts.set(key, (counts.get(key) || 0) + 1);
      }
    }
  }

  return counts;
}

export function ensayoCellKey(programId, ensembleId) {
  return `${programId}-${Number(ensembleId)}`;
}

export function getEnsayoCellCount(counts, programId, ensembleId) {
  return counts.get(ensayoCellKey(programId, ensembleId)) || 0;
}

/** Ensayos que cuentan en la celda (programa × ensamble), ordenados por fecha y hora. */
export function getEnsayosForCell(events, programId, ensembleId) {
  const pid = Number(programId);
  const eid = Number(ensembleId);
  const list = [];

  for (const evt of events || []) {
    if (evt.is_deleted) continue;
    const progIds = getRehearsalEventProgramIds(evt);
    if (!progIds.has(pid)) continue;
    const ensIds = (evt.eventos_ensambles || [])
      .map((row) => Number(row.id_ensamble))
      .filter(Number.isFinite);
    if (!ensIds.includes(eid)) continue;
    list.push(evt);
  }

  return list.sort((a, b) => {
    const byDate = String(a.fecha || "").localeCompare(String(b.fecha || ""));
    if (byDate !== 0) return byDate;
    return String(a.hora_inicio || "").localeCompare(
      String(b.hora_inicio || ""),
    );
  });
}

export function computeEnsayoRowTotal(counts, programId, visibleEnsembleIds) {
  let sum = 0;
  for (const eid of visibleEnsembleIds) {
    sum += getEnsayoCellCount(counts, programId, eid);
  }
  return sum;
}

export function computeEnsayoColumnTotal(
  counts,
  ensembleId,
  filteredProgramas,
) {
  let sum = 0;
  for (const p of filteredProgramas) {
    sum += getEnsayoCellCount(counts, p.id, ensembleId);
  }
  return sum;
}

/**
 * Ensayos de ensamble (tipo 13) en ventana amplia para cruzar con programas.
 */
export async function fetchRehearsalEventsForEnsayosReport(supabase) {
  if (!supabase) return { events: [], error: null };
  const y = new Date().getFullYear();
  const minFecha = `${y - 1}-01-01`;
  const maxFecha = `${y + 2}-12-31`;

  const { data, error } = await supabase
    .from("eventos")
    .select(
      `
      id,
      fecha,
      hora_inicio,
      hora_fin,
      descripcion,
      id_gira,
      is_deleted,
      programas ( id, nomenclador, mes_letra, nombre_gira ),
      tipos_evento ( nombre, color ),
      locaciones ( nombre, localidades ( localidad ) ),
      eventos_asistencia_custom (
        tipo,
        id_integrante,
        integrantes ( nombre, apellido )
      ),
      eventos_ensambles (
        id_ensamble,
        ensambles ( id, ensamble )
      ),
      eventos_programas_asociados (
        id_programa,
        programas ( id, nomenclador, mes_letra, nombre_gira )
      )
    `,
    )
    .eq("id_tipo_evento", 13)
    .eq("tecnica", false)
    .gte("fecha", minFecha)
    .lte("fecha", maxFecha);

  return { events: data || [], error };
}

export function programRowLabel(programa) {
  const n = (programa.nomenclador || "").trim();
  const m = (programa.mes_letra || "").trim();
  const name = (programa.nombre_gira || "").trim();
  const head = n && m ? `${n} ${m}` : n || m || `#${programa.id}`;
  return name ? `${head} — ${name}` : head;
}

export function programColumnHeader(programa) {
  const n = (programa.nomenclador || "").trim();
  const m = (programa.mes_letra || "").trim();
  if (n && m) return `${n} ${m}`;
  return n || m || `#${programa.id}`;
}

function formatCellValue(n) {
  return n > 0 ? String(n) : "";
}

/**
 * @param {object} params
 * @param {Array} params.filteredProgramas — filas
 * @param {Array} params.visibleEnsembles — columnas
 * @param {Map<string, number>} params.counts
 * @param {(p: object) => string} [params.programRowLabelFn]
 * @param {(p: object) => string} [params.programHeaderFn]
 */
export async function downloadEnsayosPorProgramaExcel({
  filteredProgramas,
  visibleEnsembles,
  counts,
  programRowLabelFn = programRowLabel,
  programHeaderFn = programColumnHeader,
  reportTitle = "Ensayos por programa",
}) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Ensayos", {
    views: [{ state: "frozen", xSplit: 1, ySplit: 1 }],
  });

  const header = [
    "Programa",
    ...visibleEnsembles.map((e) => e.ensamble || `Ensamble ${e.id}`),
    "Total",
  ];
  sheet.addRow(header);
  const hr = sheet.getRow(1);
  hr.font = { bold: true };
  hr.eachCell((cell) => {
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFF1F5F9" },
    };
  });

  const ensembleIds = visibleEnsembles.map((e) => Number(e.id));

  for (const p of filteredProgramas) {
    const cells = [
      programRowLabelFn(p),
      ...ensembleIds.map((eid) =>
        formatCellValue(getEnsayoCellCount(counts, p.id, eid)),
      ),
      String(computeEnsayoRowTotal(counts, p.id, ensembleIds)),
    ];
    const row = sheet.addRow(cells);
    row.eachCell((cell, colNumber) => {
      cell.alignment = {
        horizontal: colNumber === 1 ? "left" : "center",
        vertical: "middle",
        wrapText: colNumber === 1,
      };
    });
  }

  const totalRow = [
    "Total",
    ...ensembleIds.map((eid) =>
      formatCellValue(computeEnsayoColumnTotal(counts, eid, filteredProgramas)),
    ),
    String(
      filteredProgramas.reduce(
        (acc, p) => acc + computeEnsayoRowTotal(counts, p.id, ensembleIds),
        0,
      ),
    ),
  ];
  const tr = sheet.addRow(totalRow);
  tr.font = { bold: true };
  tr.eachCell((cell, colNumber) => {
    cell.alignment = {
      horizontal: colNumber === 1 ? "left" : "center",
      vertical: "middle",
    };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: SUMMARY_FILL_ARGB },
    };
  });

  sheet.getColumn(1).width = 42;
  visibleEnsembles.forEach((_, i) => {
    sheet.getColumn(i + 2).width = 12;
  });
  sheet.getColumn(visibleEnsembles.length + 2).width = 10;

  const buffer = await workbook.xlsx.writeBuffer();
  const stamp = new Date().toISOString().slice(0, 10);
  saveAs(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    `Ensayos_por_programa_${stamp}.xlsx`,
  );
}

export function downloadEnsayosPorProgramaPdf({
  filteredProgramas,
  visibleEnsembles,
  counts,
  programRowLabelFn = programRowLabel,
  programHeaderFn = programColumnHeader,
  reportTitle = "Ensayos por programa",
}) {
  const ensembleIds = visibleEnsembles.map((e) => Number(e.id));
  const head = [
    "Programa",
    ...visibleEnsembles.map((e) => e.ensamble || `E${e.id}`),
    "Total",
  ];

  const body = filteredProgramas.map((p) => [
    programRowLabelFn(p),
    ...ensembleIds.map((eid) =>
      formatCellValue(getEnsayoCellCount(counts, p.id, eid)),
    ),
    formatCellValue(computeEnsayoRowTotal(counts, p.id, ensembleIds)),
  ]);

  body.push([
    "Total",
    ...ensembleIds.map((eid) =>
      formatCellValue(computeEnsayoColumnTotal(counts, eid, filteredProgramas)),
    ),
    formatCellValue(
      filteredProgramas.reduce(
        (acc, p) => acc + computeEnsayoRowTotal(counts, p.id, ensembleIds),
        0,
      ),
    ),
  ]);

  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  doc.setFontSize(11);
  doc.text(reportTitle, 14, 12);
  doc.setFontSize(8);
  doc.text(
    `Generado: ${new Date().toLocaleString("es-AR")} · ${filteredProgramas.length} programa(s) · ${visibleEnsembles.length} ensamble(s)`,
    14,
    17,
  );

  autoTable(doc, {
    startY: 22,
    head: [head],
    body,
    styles: { fontSize: 7, cellPadding: 1.2 },
    headStyles: { fillColor: [71, 85, 105], textColor: 255 },
    columnStyles: {
      0: { cellWidth: 55 },
    },
    didParseCell: (data) => {
      if (data.section === "body" && data.row.index === body.length - 1) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = [226, 232, 240];
      }
    },
  });

  const stamp = new Date().toISOString().slice(0, 10);
  doc.save(`Ensayos_por_programa_${stamp}.pdf`);
}
