import ExcelJS from "exceljs";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { saveAs } from "file-saver";
import { compareInstrumentIds } from "./giraUtils";

/**
 * Agrupa integrantes visibles por ensamble según la selección actual.
 * Solo genera encabezado de sección para ensambles "completamente tildados":
 * todos sus integrantes están en `selectedIntegranteIds` (checkbox del padre en on).
 * Cada persona va bajo el primer ensamble en ese estado (orden de `ensambles`) que la
 * incluya. Así, si solo se tilda el ensamble A, no aparece bloque B aunque haya
 * músicos compartidos. El resto va a "Otros".
 *
 * @param {Set<number>|Iterable<number>} selectedIntegranteIds
 */
export function buildAsistenciaMatrixRowGroups(
  visibleRows,
  ensambles,
  membershipsByEnsamble,
  selectedIntegranteIds,
) {
  const selected =
    selectedIntegranteIds instanceof Set
      ? selectedIntegranteIds
      : new Set(
          Array.from(selectedIntegranteIds, (id) => Number(id)),
        );

  const byId = new Map(visibleRows.map((r) => [Number(r.id), r]));
  const assigned = new Set();
  const groups = [];

  const sortRows = (rows) =>
    [...rows].sort((a, b) => {
      const cmp = compareInstrumentIds(a.id_instr, b.id_instr);
      if (cmp !== 0) return cmp;
      const na = `${a.apellido || ""} ${a.nombre || ""}`.trim();
      const nb = `${b.apellido || ""} ${b.nombre || ""}`.trim();
      return na.localeCompare(nb, "es");
    });

  /** Ensambles cuyo checkbox está completo: todos sus miembros seleccionados. */
  const tickedEnsembles = [];
  for (const en of ensambles) {
    const eid = Number(en.id);
    const memberIds = membershipsByEnsamble.get(eid) || [];
    if (memberIds.length === 0) continue;
    const fullySelected = memberIds.every((id) =>
      selected.has(Number(id)),
    );
    if (fullySelected) tickedEnsembles.push(en);
  }

  for (const en of tickedEnsembles) {
    const eid = Number(en.id);
    const memberIds = membershipsByEnsamble.get(eid) || [];
    const rows = [];
    for (const iid of memberIds) {
      const nid = Number(iid);
      if (!byId.has(nid) || assigned.has(nid)) continue;
      rows.push(byId.get(nid));
      assigned.add(nid);
    }
    if (rows.length === 0) continue;
    groups.push({
      key: eid,
      label: en.ensamble?.trim() || `Ensamble ${eid}`,
      rows: sortRows(rows),
    });
  }

  const leftovers = visibleRows.filter((r) => !assigned.has(Number(r.id)));
  if (leftovers.length > 0) {
    groups.push({
      key: "otros",
      label: "Otros",
      rows: sortRows(leftovers),
    });
  }

  return groups;
}

/**
 * Filas de ensamble para la vista agregada: un renglón por ensamble con al menos
 * un integrante visible en la selección actual.
 *
 * @param {Array<{ id: string|number }>} visibleRows
 * @param {Array<{ id: string|number, ensamble?: string }>} ensambles
 * @param {Map<number, number[]>} membershipsByEnsamble
 * @returns {Array<{ key: number, label: string, visibleMemberIds: number[] }>}
 */
export function buildAsistenciaMatrixEnsambleAggregateRows(
  visibleRows,
  ensambles,
  membershipsByEnsamble,
) {
  const visibleSet = new Set(visibleRows.map((r) => Number(r.id)));
  const out = [];
  for (const en of ensambles) {
    const eid = Number(en.id);
    const memberIds = membershipsByEnsamble.get(eid) || [];
    const visibleMemberIds = memberIds.filter((id) =>
      visibleSet.has(Number(id)),
    );
    if (visibleMemberIds.length === 0) continue;
    out.push({
      key: eid,
      label: en.ensamble?.trim() || `Ensamble ${eid}`,
      visibleMemberIds,
    });
  }
  return out;
}

/**
 * Totales de resumen para una fila de ensamble: suma de los conteos por persona
 * (misma semántica que sumar columnas Sinf/CF/Ens/Total de cada integrante).
 */
export function computeAsistenciaMatrixEnsambleTotals(
  visibleMemberIds,
  filteredProgramas,
  rosterByGiraId,
  selectedTypes,
) {
  let sinfonico = 0;
  let camerata = 0;
  let ensamble = 0;
  let total = 0;
  for (const iid of visibleMemberIds) {
    const t = computeAsistenciaMatrixRowTotals(
      iid,
      filteredProgramas,
      rosterByGiraId,
      selectedTypes,
    );
    sinfonico += t.sinfonico;
    camerata += t.camerata;
    if (t.ensamble != null) ensamble += t.ensamble;
    total += t.total;
  }
  return {
    sinfonico,
    camerata,
    ensamble: selectedTypes.has("Ensamble") ? ensamble : null,
    total,
  };
}

function integranteDetalle(row, ensambles, membershipsByEnsamble) {
  const iid = Number(row.id);
  const inst = row.instrumentos;
  const instLabel =
    inst?.instrumento ||
    inst?.abreviatura ||
    (row.id_instr ? `#${row.id_instr}` : "—");
  const ensLabels = ensambles
    .filter((en) =>
      (membershipsByEnsamble.get(Number(en.id)) || []).includes(iid),
    )
    .map((en) => en.ensamble)
    .filter(Boolean);
  return [instLabel, ensLabels.join(", ")].filter(Boolean).join(" · ");
}

/**
 * Conteos por tipo de programa visible y total de convocatorias en la fila.
 * La columna Ensamble solo aplica si el filtro de tipos incluye "Ensamble".
 *
 * @param {number|string} integranteId
 * @param {Array<{ id: string|number, tipo?: string }>} filteredProgramas
 * @param {Record<string, Set<number>>} rosterByGiraId
 * @param {Set<string>} selectedTypes
 */
export function computeAsistenciaMatrixRowTotals(
  integranteId,
  filteredProgramas,
  rosterByGiraId,
  selectedTypes,
) {
  const iid = Number(integranteId);
  const active = (gid) => {
    const set = rosterByGiraId[gid];
    return set && set.has(iid);
  };
  const countTipo = (tipo) =>
    filteredProgramas.filter((g) => g.tipo === tipo && active(g.id)).length;
  const total = filteredProgramas.filter((g) => active(g.id)).length;
  return {
    sinfonico: countTipo("Sinfónico"),
    camerata: countTipo("Camerata Filarmónica"),
    ensamble: selectedTypes.has("Ensamble") ? countTipo("Ensamble") : null,
    total,
  };
}

/** ARGB gris claro para bloque de columnas de totales (Excel). */
const SUMMARY_FILL_ARGB = "FFE2E8F0";

/** RGB gris claro para bloque de columnas de totales (PDF). */
const SUMMARY_FILL_RGB = [226, 232, 240];

/** Tooltips para encabezados abreviados de totales (p. ej. en la UI). */
export const ASISTENCIA_MATRIX_SUMMARY_HEADER_TITLE = {
  Sinf: "Sinfónico",
  CF: "Camerata Filarmónica",
  Ens: "Ensamble",
  Total: "Total en todos los programas visibles",
};

/** Encabezados cortos de columnas de resumen (PDF/Excel/UI). */
export function getAsistenciaMatrixSummaryHeadLabels(selectedTypes) {
  const labels = ["Sinf", "CF"];
  if (selectedTypes.has("Ensamble")) labels.push("Ens");
  labels.push("Total");
  return labels;
}

/** Valores numéricos en el mismo orden que {@link getAsistenciaMatrixSummaryHeadLabels}. */
export function buildAsistenciaMatrixSummaryValues(totals, selectedTypes) {
  const cells = [totals.sinfonico, totals.camerata];
  if (selectedTypes.has("Ensamble")) cells.push(totals.ensamble ?? 0);
  cells.push(totals.total);
  return cells;
}

/**
 * @param {object} params
 * @param {Array} params.visibleRows
 * @param {Array} params.filteredProgramas
 * @param {Record<string, Set<number>>} params.rosterByGiraId
 * @param {(g: object) => string} params.headerLabel
 * @param {Array} params.ensambles
 * @param {Map<number, number[]>} params.membershipsByEnsamble
 * @param {Set<number>|Iterable<number>} params.selectedIntegranteIds
 * @param {Set<string>} params.selectedTypes — filtros de tipo de programa (define columna Ensamble en totales)
 * @param {boolean} [params.groupByEnsambles]
 */
export async function downloadAsistenciaMatrixExcel({
  visibleRows,
  filteredProgramas,
  rosterByGiraId,
  headerLabel,
  ensambles,
  membershipsByEnsamble,
  selectedIntegranteIds,
  selectedTypes,
  groupByEnsambles = false,
}) {
  const summaryLabels = getAsistenciaMatrixSummaryHeadLabels(selectedTypes);
  const colCount = 2 + filteredProgramas.length + summaryLabels.length;

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Matriz asistencia", {
    views: [{ state: "frozen", xSplit: 2, ySplit: 1 }],
  });

  const header = groupByEnsambles
    ? [
        "Ensamble",
        "Músicos en selección",
        ...filteredProgramas.map((g) => headerLabel(g)),
        ...summaryLabels,
      ]
    : [
        "Integrante",
        "Instrumento / Ensamble",
        ...filteredProgramas.map((g) => headerLabel(g)),
        ...summaryLabels,
      ];
  sheet.addRow(header);
  const hr = sheet.getRow(1);
  const summaryStartCol = 3 + filteredProgramas.length;
  hr.font = { bold: true };
  hr.eachCell((cell, colNumber) => {
    cell.alignment = { horizontal: "center", vertical: "middle" };
    const isSummaryCol = colNumber >= summaryStartCol;
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: isSummaryCol ? SUMMARY_FILL_ARGB : "FFF1F5F9" },
    };
  });

  if (groupByEnsambles) {
    const aggRows = buildAsistenciaMatrixEnsambleAggregateRows(
      visibleRows,
      ensambles,
      membershipsByEnsamble,
    );
    for (const ar of aggRows) {
      const totals = computeAsistenciaMatrixEnsambleTotals(
        ar.visibleMemberIds,
        filteredProgramas,
        rosterByGiraId,
        selectedTypes,
      );
      const cells = [
        ar.label,
        String(ar.visibleMemberIds.length),
        ...filteredProgramas.map((p) => {
          const set = rosterByGiraId[p.id];
          if (!set) return "";
          const n = ar.visibleMemberIds.filter((id) => set.has(Number(id))).length;
          return n > 0 ? String(n) : "";
        }),
        ...buildAsistenciaMatrixSummaryValues(totals, selectedTypes),
      ];
      const dataRow = sheet.addRow(cells);
      dataRow.eachCell((cell, colNumber) => {
        if (colNumber >= 3) {
          cell.alignment = { horizontal: "center", vertical: "middle" };
        } else {
          cell.alignment = { vertical: "middle" };
        }
        if (colNumber >= summaryStartCol) {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: SUMMARY_FILL_ARGB },
          };
        }
      });
    }
  } else {
    const groups = buildAsistenciaMatrixRowGroups(
      visibleRows,
      ensambles,
      membershipsByEnsamble,
      selectedIntegranteIds,
    );

    for (const g of groups) {
      const sep = sheet.addRow([g.label]);
      sheet.mergeCells(sep.number, 1, sep.number, colCount);
      const sc = sep.getCell(1);
      sc.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFE2E8F0" },
      };
      sc.font = { bold: true, size: 11 };
      sc.alignment = { horizontal: "center", vertical: "middle" };

      for (const row of g.rows) {
        const iid = Number(row.id);
        const name = `${row.nombre || ""} ${row.apellido || ""}`.trim();
        const det = integranteDetalle(row, ensambles, membershipsByEnsamble);
        const totals = computeAsistenciaMatrixRowTotals(
          iid,
          filteredProgramas,
          rosterByGiraId,
          selectedTypes,
        );
        const cells = [
          name,
          det,
          ...filteredProgramas.map((p) => {
            const set = rosterByGiraId[p.id];
            return set && set.has(iid) ? "X" : "";
          }),
          ...buildAsistenciaMatrixSummaryValues(totals, selectedTypes),
        ];
        const dataRow = sheet.addRow(cells);
        dataRow.eachCell((cell, colNumber) => {
          if (colNumber >= 3) {
            cell.alignment = { horizontal: "center", vertical: "middle" };
          } else {
            cell.alignment = { vertical: "middle" };
          }
          if (colNumber >= summaryStartCol) {
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: SUMMARY_FILL_ARGB },
            };
          }
        });
      }
    }
  }

  sheet.columns.forEach((col, i) => {
    const progCount = filteredProgramas.length;
    if (i === 0) col.width = 28;
    else if (i === 1) col.width = 36;
    else if (i < 2 + progCount) col.width = 10;
    else col.width = 7;
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const stamp = new Date().toISOString().slice(0, 10);
  saveAs(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    `Matriz_asistencia_${stamp}.xlsx`,
  );
}

/**
 * @param {object} params — mismos que Excel + reportTitle opcional
 * @param {Set<string>} params.selectedTypes
 */
export function downloadAsistenciaMatrixPdf({
  visibleRows,
  filteredProgramas,
  rosterByGiraId,
  headerLabel,
  ensambles,
  membershipsByEnsamble,
  selectedIntegranteIds,
  selectedTypes,
  reportTitle = "Matriz de asistencia",
  groupByEnsambles = false,
}) {
  const summaryLabels = getAsistenciaMatrixSummaryHeadLabels(selectedTypes);
  const colSpan = 2 + filteredProgramas.length + summaryLabels.length;

  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  doc.setFontSize(11);
  doc.text(reportTitle, 14, 12);
  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.text(`Generado ${new Date().toLocaleString("es-AR")}`, 14, 17);
  doc.setTextColor(0);

  const head = [
    groupByEnsambles
      ? [
          "Ensamble",
          "Nº músicos",
          ...filteredProgramas.map((g) => headerLabel(g)),
          ...summaryLabels,
        ]
      : [
          "Integrante",
          "Detalle",
          ...filteredProgramas.map((g) => headerLabel(g)),
          ...summaryLabels,
        ],
  ];

  const body = [];
  if (groupByEnsambles) {
    const aggRows = buildAsistenciaMatrixEnsambleAggregateRows(
      visibleRows,
      ensambles,
      membershipsByEnsamble,
    );
    for (const ar of aggRows) {
      const totals = computeAsistenciaMatrixEnsambleTotals(
        ar.visibleMemberIds,
        filteredProgramas,
        rosterByGiraId,
        selectedTypes,
      );
      body.push([
        ar.label,
        String(ar.visibleMemberIds.length),
        ...filteredProgramas.map((p) => {
          const set = rosterByGiraId[p.id];
          if (!set) return "";
          const n = ar.visibleMemberIds.filter((id) => set.has(Number(id))).length;
          return n > 0 ? String(n) : "";
        }),
        ...buildAsistenciaMatrixSummaryValues(totals, selectedTypes),
      ]);
    }
  } else {
    const groups = buildAsistenciaMatrixRowGroups(
      visibleRows,
      ensambles,
      membershipsByEnsamble,
      selectedIntegranteIds,
    );
    for (const g of groups) {
      body.push([
        {
          content: `  ▸ ${g.label}`,
          colSpan: colSpan,
          styles: {
            fillColor: [226, 232, 240],
            fontStyle: "bold",
            halign: "left",
          },
        },
      ]);
      for (const row of g.rows) {
        const iid = Number(row.id);
        const name = `${row.nombre || ""} ${row.apellido || ""}`.trim();
        const det = integranteDetalle(row, ensambles, membershipsByEnsamble);
        const totals = computeAsistenciaMatrixRowTotals(
          iid,
          filteredProgramas,
          rosterByGiraId,
          selectedTypes,
        );
        body.push([
          name,
          det,
          ...filteredProgramas.map((p) => {
            const set = rosterByGiraId[p.id];
            return set && set.has(iid) ? "X" : "";
          }),
          ...buildAsistenciaMatrixSummaryValues(totals, selectedTypes),
        ]);
      }
    }
  }

  const borderGray = [180, 180, 180];
  const progCount = filteredProgramas.length;
  const summaryStartCol = 2 + progCount;

  autoTable(doc, {
    head,
    body,
    startY: 22,
    theme: "grid",
    styles: {
      fontSize: 5,
      cellPadding: 0.8,
      overflow: "linebreak",
      lineWidth: 0.15,
      lineColor: borderGray,
      valign: "middle",
      halign: "center",
    },
    headStyles: {
      fillColor: [241, 245, 249],
      textColor: [30, 41, 59],
      fontStyle: "bold",
      lineWidth: 0.15,
      lineColor: borderGray,
      halign: "center",
    },
    columnStyles: {
      0: { cellWidth: 32, halign: "left" },
      1: { cellWidth: 36, halign: "left" },
    },
    didParseCell: (data) => {
      if (data.section === "head" && data.column.index >= summaryStartCol) {
        data.cell.styles.fillColor = [...SUMMARY_FILL_RGB];
      }
      if (data.section === "body") {
        const raw = data.row?.raw;
        const isGroupSep =
          Array.isArray(raw) &&
          raw.length === 1 &&
          raw[0] &&
          typeof raw[0] === "object" &&
          Number(raw[0].colSpan) > 1;
        if (!isGroupSep && data.column.index >= summaryStartCol) {
          data.cell.styles.fillColor = [...SUMMARY_FILL_RGB];
        }
      }
    },
    margin: { left: 10, right: 10 },
    tableWidth: "auto",
    showHead: "everyPage",
  });

  const stamp = new Date().toISOString().slice(0, 10);
  doc.save(`Matriz_asistencia_${stamp}.pdf`);
}
