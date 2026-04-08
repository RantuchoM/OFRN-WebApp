import ExcelJS from "exceljs";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { saveAs } from "file-saver";

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
      const ia = Number(a.id_instr) || 999999;
      const ib = Number(b.id_instr) || 999999;
      if (ia !== ib) return ia - ib;
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
 * @param {object} params
 * @param {Array} params.visibleRows
 * @param {Array} params.filteredProgramas
 * @param {Record<string, Set<number>>} params.rosterByGiraId
 * @param {(g: object) => string} params.headerLabel
 * @param {Array} params.ensambles
 * @param {Map<number, number[]>} params.membershipsByEnsamble
 * @param {Set<number>|Iterable<number>} params.selectedIntegranteIds
 */
export async function downloadAsistenciaMatrixExcel({
  visibleRows,
  filteredProgramas,
  rosterByGiraId,
  headerLabel,
  ensambles,
  membershipsByEnsamble,
  selectedIntegranteIds,
}) {
  const groups = buildAsistenciaMatrixRowGroups(
    visibleRows,
    ensambles,
    membershipsByEnsamble,
    selectedIntegranteIds,
  );
  const colCount = 2 + filteredProgramas.length;

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Matriz asistencia", {
    views: [{ state: "frozen", xSplit: 2, ySplit: 1 }],
  });

  const header = [
    "Integrante",
    "Instrumento / Ensamble",
    ...filteredProgramas.map((g) => headerLabel(g)),
  ];
  sheet.addRow(header);
  const hr = sheet.getRow(1);
  hr.font = { bold: true };
  hr.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFF1F5F9" },
  };
  hr.eachCell((cell) => {
    cell.alignment = { horizontal: "center", vertical: "middle" };
  });

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
      const cells = [
        name,
        det,
        ...filteredProgramas.map((p) => {
          const set = rosterByGiraId[p.id];
          return set && set.has(iid) ? "X" : "";
        }),
      ];
      const dataRow = sheet.addRow(cells);
      dataRow.eachCell((cell, colNumber) => {
        if (colNumber >= 3) {
          cell.alignment = { horizontal: "center", vertical: "middle" };
        } else {
          cell.alignment = { vertical: "middle" };
        }
      });
    }
  }

  sheet.columns.forEach((col, i) => {
    col.width = i === 0 ? 28 : i === 1 ? 36 : 10;
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
 */
export function downloadAsistenciaMatrixPdf({
  visibleRows,
  filteredProgramas,
  rosterByGiraId,
  headerLabel,
  ensambles,
  membershipsByEnsamble,
  selectedIntegranteIds,
  reportTitle = "Matriz de asistencia",
}) {
  const groups = buildAsistenciaMatrixRowGroups(
    visibleRows,
    ensambles,
    membershipsByEnsamble,
    selectedIntegranteIds,
  );
  const colSpan = 2 + filteredProgramas.length;

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
    [
      "Integrante",
      "Detalle",
      ...filteredProgramas.map((g) => headerLabel(g)),
    ],
  ];

  const body = [];
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
      body.push([
        name,
        det,
        ...filteredProgramas.map((p) => {
          const set = rosterByGiraId[p.id];
          return set && set.has(iid) ? "X" : "";
        }),
      ]);
    }
  }

  const borderGray = [180, 180, 180];

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
    margin: { left: 10, right: 10 },
    tableWidth: "auto",
    showHead: "everyPage",
  });

  const stamp = new Date().toISOString().slice(0, 10);
  doc.save(`Matriz_asistencia_${stamp}.pdf`);
}
