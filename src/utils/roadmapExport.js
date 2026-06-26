import ExcelJS from "exceljs";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  resolveLocalidadEfectivaViaticos,
  resolveLocalidadResidencia,
  hasLocalidadViaticosAsignada,
} from "./integranteDomicilioViaticos";
import {
  findBestRouteRule,
  isPersonalRouteScope,
  normalizeLocalidadName,
} from "./viaticosLogisticsSchedule";

const formatDateSafe = (dateString) => {
  if (!dateString) return "-";
  try {
    const [, month, day] = dateString.split("-");
    return `${day}/${month}`;
  } catch {
    return dateString;
  }
};

const htmlToPlainText = (input) => {
  const raw = String(input || "").trim();
  if (!raw) return "";

  try {
    if (typeof window !== "undefined" && typeof DOMParser !== "undefined") {
      const doc = new DOMParser().parseFromString(raw, "text/html");
      const body = doc.body;
      body
        .querySelectorAll("br")
        .forEach((br) => br.replaceWith(doc.createTextNode("\n")));
      body.querySelectorAll("div,p,li").forEach((el) => {
        el.insertAdjacentText("beforeend", "\n");
      });
      return (body.textContent || "")
        .replace(/\u00a0/g, " ")
        .replace(/[ \t]+\n/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
    }
  } catch {
    // fall through
  }

  return raw
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\/\s*(div|p|li)\s*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .trim();
};

function getRouteEventId(rule, eventField) {
  if (!rule) return null;
  const nested = rule[eventField];
  if (nested?.id != null) return nested.id;
  const idField =
    eventField === "evento_subida" ? "id_evento_subida" : "id_evento_bajada";
  return rule[idField] ?? null;
}

function ruleMatchesViaticosLocalidad(rule, locId) {
  if (locId == null || locId === "") return false;
  if (String(rule.id_localidad || "") === String(locId)) return true;
  return (rule.target_localities || []).some(
    (x) => String(x) === String(locId),
  );
}

/** Regla de ruta explícita para la localidad de viáticos (no región/general). */
function findLocalidadRouteEventId(rules, locId, eventField) {
  let best = null;
  let bestScore = -1;

  for (const rule of rules || []) {
    const eventId = getRouteEventId(rule, eventField);
    if (eventId == null) continue;

    const scope = String(rule.alcance || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();

    let score = -1;
    if (scope === "localidad" && ruleMatchesViaticosLocalidad(rule, locId)) {
      score = 3;
    } else if (ruleMatchesViaticosLocalidad(rule, locId)) {
      score = 2;
    }

    if (score > bestScore) {
      best = eventId;
      bestScore = score;
    }
  }

  return best;
}

/** Solo reglas con alcance Localidad que apunten a la ciudad de viáticos. */
function findStrictLocalidadScopeEventId(rules, locId, eventField) {
  for (const rule of rules || []) {
    const scope = String(rule.alcance || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
    if (scope !== "localidad") continue;
    if (!ruleMatchesViaticosLocalidad(rule, locId)) continue;
    const eventId = getRouteEventId(rule, eventField);
    if (eventId != null) return eventId;
  }
  return null;
}

/** Parada de subida/bajada según reglas de ruta (Localidad → Región → General). */
function resolveViaticosRouteRuleEventId(
  rulesForTransport,
  locId,
  regionId,
  eventField,
) {
  const fromLocalidad = findLocalidadRouteEventId(
    rulesForTransport,
    locId,
    eventField,
  );
  if (fromLocalidad != null) return fromLocalidad;

  const rule = findBestRouteRule(
    rulesForTransport,
    locId,
    regionId,
    eventField,
  );
  return getRouteEventId(rule, eventField);
}

function sortEventsChrono(events) {
  return [...(events || [])].sort((a, b) =>
    (a.fecha + (a.hora_inicio || "")).localeCompare(
      b.fecha + (b.hora_inicio || ""),
    ),
  );
}

/**
 * Paradas de subida/bajada alineadas con la lógica de exportación de viáticos.
 * Logística de transporte usa residencia; viáticos usa localidad efectiva de viáticos.
 */
export function resolveViaticosAlignedStops(person, transportId, ctx = {}) {
  const { routeRules = [] } = ctx;
  const transportData = person.logistics?.transports?.find(
    (t) => String(t.id) === String(transportId),
  );

  if (!transportData) return { subidaId: null, bajadaId: null };

  const rulesForTransport = (routeRules || []).filter(
    (r) => String(r.id_transporte_fisico) === String(transportId),
  );

  const loc = resolveLocalidadEfectivaViaticos(person);
  const locResidencia = resolveLocalidadResidencia(person);
  const viaticosDiffersFromResidencia =
    hasLocalidadViaticosAsignada(person) &&
    loc.id != null &&
    locResidencia.id != null &&
    String(loc.id) !== String(locResidencia.id);
  const regionId = loc.regionId ?? person.id_region ?? null;

  const resolveOne = (scopeKey, fallbackId, eventField) => {
    // Si viáticos ≠ residencia, la planilla manda: ignorar parada personal.
    if (
      !viaticosDiffersFromResidencia &&
      isPersonalRouteScope(transportData[scopeKey])
    ) {
      return fallbackId ?? null;
    }

    const fromRule = resolveViaticosRouteRuleEventId(
      rulesForTransport,
      loc.id,
      regionId,
      eventField,
    );
    if (fromRule != null) return fromRule;

    return fallbackId ?? null;
  };

  return {
    subidaId: resolveOne(
      "subidaScope",
      transportData.subidaId,
      "evento_subida",
    ),
    bajadaId: resolveOne(
      "bajadaScope",
      transportData.bajadaId,
      "evento_bajada",
    ),
  };
}

function getPassengerResidenceLabel(p, paxLocalities = {}) {
  return (
    p.localidades_residencia?.localidad ||
    p._loc_residencia?.localidad ||
    paxLocalities[p.id] ||
    ""
  );
}

/**
 * @returns {{ sortedEvts: object[], stops: object[], error?: string }}
 */
export function buildRoadmapExportData({
  events,
  passengers,
  startId,
  endId,
  alignViaticos = false,
  transportId,
  routeRules = [],
}) {
  if (!events || events.length === 0) {
    return { sortedEvts: [], stops: [], error: "No hay paradas definidas." };
  }

  const sortedEvts = [...events].sort((a, b) =>
    (a.fecha + a.hora_inicio).localeCompare(b.fecha + b.hora_inicio),
  );
  const startIndex = startId
    ? sortedEvts.findIndex((e) => String(e.id) === String(startId))
    : 0;
  const endIndex = endId
    ? sortedEvts.findIndex((e) => String(e.id) === String(endId))
    : sortedEvts.length - 1;

  if (startIndex === -1 || endIndex === -1 || startIndex > endIndex) {
    return { sortedEvts, stops: [], error: "Rango de paradas inválido." };
  }

  const activeEvents = sortedEvts.slice(startIndex, endIndex + 1);

  const stopsByPassenger = {};
  if (alignViaticos) {
    passengers.forEach((p) => {
      stopsByPassenger[p.id] = resolveViaticosAlignedStops(p, transportId, {
        routeRules,
      });
    });
  }

  const getStops = (p) => {
    if (alignViaticos && stopsByPassenger[p.id]) {
      return stopsByPassenger[p.id];
    }
    const t = p.logistics?.transports?.find(
      (tr) => String(tr.id) === String(transportId),
    );
    return { subidaId: t?.subidaId ?? null, bajadaId: t?.bajadaId ?? null };
  };

  let stops = activeEvents.map((evt, idx) => {
    const ups = passengers
      .filter((p) => String(getStops(p).subidaId) === String(evt.id))
      .sort((a, b) => (a.apellido || "").localeCompare(b.apellido || ""));
    const downs = passengers
      .filter((p) => String(getStops(p).bajadaId) === String(evt.id))
      .sort((a, b) => (a.apellido || "").localeCompare(b.apellido || ""));

    const paxOnBoard = passengers.filter((p) => {
      const { subidaId, bajadaId } = getStops(p);
      if (!subidaId || !bajadaId) return false;
      const upIdx = sortedEvts.findIndex(
        (e) => String(e.id) === String(subidaId),
      );
      const downIdx = sortedEvts.findIndex(
        (e) => String(e.id) === String(bajadaId),
      );
      const currentIdx = sortedEvts.findIndex(
        (e) => String(e.id) === String(evt.id),
      );
      return upIdx <= currentIdx && downIdx > currentIdx;
    }).length;

    return { evt, stopNum: idx + 1, ups, downs, paxOnBoard };
  });

  return { sortedEvts, stops, alignViaticos: !!alignViaticos };
}

function sliceActiveEvents(events, startId, endId) {
  const sortedEvts = sortEventsChrono(events);
  if (!sortedEvts.length) return { sortedEvts, activeEvents: [], error: null };

  const startIndex = startId
    ? sortedEvts.findIndex((e) => String(e.id) === String(startId))
    : 0;
  const endIndex = endId
    ? sortedEvts.findIndex((e) => String(e.id) === String(endId))
    : sortedEvts.length - 1;

  if (startIndex === -1 || endIndex === -1 || startIndex > endIndex) {
    return { sortedEvts, activeEvents: [], error: "Rango de paradas inválido." };
  }

  return {
    sortedEvts,
    activeEvents: sortedEvts.slice(startIndex, endIndex + 1),
    error: null,
  };
}

/** Regla de alcance Localidad para la ciudad de viáticos, con evento dentro del tramo. */
function viaticosLocalidadHasLocalidadRuleInRange(
  locId,
  rulesForTransport,
  activeEvents,
  type,
) {
  if (locId == null || locId === "") return false;
  const eventField = type === "subida" ? "evento_subida" : "evento_bajada";
  const ruleEventId = findStrictLocalidadScopeEventId(
    rulesForTransport,
    locId,
    eventField,
  );
  if (ruleEventId == null) return false;
  return activeEvents.some((e) => String(e.id) === String(ruleEventId));
}

function passengerNeedsViaticosLocalidadRules(
  person,
  transportId,
  rulesForTransport,
  activeEvents,
) {
  const transportData = person.logistics?.transports?.find(
    (t) => String(t.id) === String(transportId),
  );
  if (!transportData) return null;

  const loc = resolveLocalidadEfectivaViaticos(person);
  if (loc.id == null && !loc.nombre) return null;

  const locResidencia = resolveLocalidadResidencia(person);
  const viaticosDiffersFromResidencia =
    hasLocalidadViaticosAsignada(person) &&
    loc.id != null &&
    locResidencia.id != null &&
    String(loc.id) !== String(locResidencia.id);

  const needsSubidaRule =
    viaticosDiffersFromResidencia ||
    !isPersonalRouteScope(transportData.subidaScope);
  const needsBajadaRule =
    viaticosDiffersFromResidencia ||
    !isPersonalRouteScope(transportData.bajadaScope);

  const missingSubida =
    needsSubidaRule &&
    !viaticosLocalidadHasLocalidadRuleInRange(
      loc.id,
      rulesForTransport,
      activeEvents,
      "subida",
    );
  const missingBajada =
    needsBajadaRule &&
    !viaticosLocalidadHasLocalidadRuleInRange(
      loc.id,
      rulesForTransport,
      activeEvents,
      "bajada",
    );

  if (!missingSubida && !missingBajada) return null;

  return {
    localityId: loc.id,
    localityName: loc.nombre || "Sin localidad",
    missingSubida,
    missingBajada,
  };
}

function formatPassengerLabel(p) {
  const name = `${p?.apellido || ""}, ${p?.nombre || ""}`.trim();
  return name.replace(/^,\s*|,\s*$/g, "").trim() || `Integrante ${p?.id ?? "?"}`;
}

const MAX_VIATICOS_PARADA_WARN = 12;

/**
 * Localidades de viáticos de pasajeros del transporte sin parada definida en el tramo.
 * @returns {{ localityId: number|string|null, localityName: string, missingSubida: boolean, missingBajada: boolean, passengers: string[] }[]}
 */
export function collectViaticosLocalitiesWithoutDefinedStop({
  passengers,
  transportId,
  routeRules = [],
  events,
  startId,
  endId,
}) {
  const { activeEvents, error } = sliceActiveEvents(events, startId, endId);
  if (error || !activeEvents.length) return [];

  const rulesForTransport = (routeRules || []).filter(
    (r) => String(r.id_transporte_fisico) === String(transportId),
  );

  const byKey = new Map();

  for (const p of passengers || []) {
    const gap = passengerNeedsViaticosLocalidadRules(
      p,
      transportId,
      rulesForTransport,
      activeEvents,
    );
    if (!gap) continue;

    const key =
      gap.localityId != null
        ? `id:${gap.localityId}`
        : `name:${normalizeLocalidadName(gap.localityName)}`;

    if (!byKey.has(key)) {
      byKey.set(key, {
        localityId: gap.localityId,
        localityName: gap.localityName,
        missingSubida: false,
        missingBajada: false,
        passengers: [],
      });
    }

    const entry = byKey.get(key);
    if (gap.missingSubida) entry.missingSubida = true;
    if (gap.missingBajada) entry.missingBajada = true;
    entry.passengers.push(formatPassengerLabel(p));
  }

  const issues = [];

  for (const entry of byKey.values()) {
    if (!entry.missingSubida && !entry.missingBajada) continue;

    issues.push({
      localityId: entry.localityId,
      localityName: entry.localityName,
      missingSubida: entry.missingSubida,
      missingBajada: entry.missingBajada,
      passengers: [...new Set(entry.passengers)],
    });
  }

  return issues.sort((a, b) =>
    (a.localityName || "").localeCompare(b.localityName || "", "es"),
  );
}

export function formatViaticosParadaWarningMessage(issues) {
  if (!issues?.length) return "";

  const lines = [
    "Hay localidades de viáticos sin regla de parada (alcance Localidad) en el tramo seleccionado:",
    "",
  ];

  for (const issue of issues) {
    const parts = [];
    if (issue.missingSubida) parts.push("subida");
    if (issue.missingBajada) parts.push("bajada");
    const trayecto =
      parts.length === 2
        ? "subida y bajada"
        : parts[0] === "subida"
          ? "subida"
          : "bajada";

    const pax = issue.passengers || [];
    const paxText =
      pax.length <= MAX_VIATICOS_PARADA_WARN
        ? pax.join("; ")
        : `${pax.slice(0, MAX_VIATICOS_PARADA_WARN).join("; ")}; y ${pax.length - MAX_VIATICOS_PARADA_WARN} más`;

    lines.push(
      `• ${issue.localityName}: sin regla de ${trayecto}${paxText ? ` (${paxText})` : ""}`,
    );
  }

  lines.push(
    "",
    "Creá una regla de ruta con alcance Localidad para esa ciudad de viáticos (subida y/o bajada según corresponda).",
    "",
    "¿Deseas exportar igual?",
  );

  return lines.join("\n");
}

function formatPassengerNombre(p, paxLocalities, alignViaticos) {
  if (alignViaticos) return p.nombre || "";
  const loc = getPassengerResidenceLabel(p, paxLocalities);
  return loc ? `${p.nombre} (${loc})` : p.nombre || "";
}

function buildStopHeaderText(stopNum, evt, alignViaticos) {
  const timeStr = evt.hora_inicio ? evt.hora_inicio.slice(0, 5) : "--:--";
  const dateStr = formatDateSafe(evt.fecha);
  if (alignViaticos) {
    return `PARADA #${stopNum}      |      ${timeStr} hs      |      ${dateStr}`;
  }
  const nota = htmlToPlainText(evt.descripcion);
  return `PARADA #${stopNum}      |      ${timeStr} hs      |      ${dateStr}${nota ? `      |      ${nota.toUpperCase()}` : ""}`;
}

function passengerNameColumnLabel(alignViaticos) {
  return alignViaticos ? "NOMBRE" : "NOMBRE / RESIDENCIA";
}

function buildPlaceLabel(evt) {
  const locName = evt.locaciones?.nombre || "Sin Locación Asignada";
  const address = evt.locaciones?.direccion || "";
  const city = evt.locaciones?.localidades?.localidad || "";
  let fullPlace = locName;
  if (address || city) {
    fullPlace += ` (${[address, city].filter(Boolean).join(" - ")})`;
  }
  return fullPlace;
}

export async function generateRoadmapExcel(
  transportName,
  exportData,
  paxLocalities = {},
) {
  const { stops, error, alignViaticos = false } = exportData;
  if (error) {
    alert(error);
    return;
  }

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Hoja de Ruta");
  worksheet.columns = [
    { key: "col1", width: 30 },
    { key: "col2", width: 35 },
    { key: "col3", width: 20 },
  ];

  stops.forEach(({ evt, stopNum, ups, downs, paxOnBoard }) => {
    const headerText = buildStopHeaderText(stopNum, evt, alignViaticos);
    const fullPlace = buildPlaceLabel(evt);

    const headerRow = worksheet.addRow([headerText, "", ""]);
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 12 };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1565C0" },
    };
    headerRow.getCell(1).alignment = { vertical: "middle" };
    worksheet.mergeCells(`A${headerRow.number}:C${headerRow.number}`);

    const placeRow = worksheet.addRow(["LUGAR:", fullPlace, ""]);
    placeRow.font = { bold: true };
    placeRow.height = 30;
    placeRow.getCell(1).font = {
      bold: true,
      color: { argb: "FF555555" },
      size: 10,
    };
    placeRow.getCell(2).alignment = { vertical: "top", wrapText: true };
    worksheet.mergeCells(`B${placeRow.number}:C${placeRow.number}`);

    if (ups.length > 0) {
      const subenHeader = worksheet.addRow([
        `SUBEN (${ups.length})`,
        passengerNameColumnLabel(alignViaticos),
        "DNI",
      ]);
      subenHeader.font = { bold: true, color: { argb: "FF2E7D32" } };
      subenHeader.getCell(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFEBF7ED" },
      };

      ups.forEach((p) => {
        worksheet.addRow([
          p.apellido?.toUpperCase(),
          formatPassengerNombre(p, paxLocalities, alignViaticos),
          p.dni || "-",
        ]);
      });
    }

    if (downs.length > 0) {
      const bajanHeader = worksheet.addRow([
        `BAJAN (${downs.length})`,
        passengerNameColumnLabel(alignViaticos),
        "DNI",
      ]);
      bajanHeader.font = { bold: true, color: { argb: "FFC62828" } };
      bajanHeader.getCell(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFFEEBEB" },
      };

      downs.forEach((p) => {
        worksheet.addRow([
          p.apellido?.toUpperCase(),
          formatPassengerNombre(p, paxLocalities, alignViaticos),
          p.dni || "-",
        ]);
      });
    }

    const totalRow = worksheet.addRow([
      `TOTAL A BORDO AL SALIR: ${paxOnBoard}`,
      "",
      "",
    ]);
    totalRow.font = { bold: true };
    totalRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFEEEEEE" },
    };
    totalRow.getCell(1).alignment = { horizontal: "center" };
    worksheet.mergeCells(`A${totalRow.number}:C${totalRow.number}`);

    worksheet.addRow(["", "", ""]);
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `Hoja_Ruta_${transportName}.xlsx`;
  anchor.click();
  window.URL.revokeObjectURL(url);
}

function drawPassengerTable(
  doc,
  startY,
  title,
  passengers,
  paxLocalities,
  headerColor,
  alignViaticos = false,
) {
  if (!passengers?.length) return startY;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...headerColor);
  doc.text(title, 14, startY);
  startY += 2;

  const body = passengers.map((p) => [
    p.apellido?.toUpperCase() || "",
    formatPassengerNombre(p, paxLocalities, alignViaticos),
    p.dni || "-",
  ]);

  autoTable(doc, {
    startY,
    head: [["APELLIDO", passengerNameColumnLabel(alignViaticos), "DNI"]],
    body,
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 9,
      cellPadding: 2,
      overflow: "linebreak",
      valign: "top",
    },
    headStyles: {
      fillColor: headerColor,
      textColor: 255,
      fontStyle: "bold",
      fontSize: 8,
    },
    columnStyles: {
      0: { cellWidth: 45 },
      1: { cellWidth: 95 },
      2: { cellWidth: 35 },
    },
    margin: { left: 14, right: 14 },
  });

  return doc.lastAutoTable.finalY + 4;
}

export async function generateRoadmapPdf(
  transportName,
  exportData,
  paxLocalities = {},
) {
  const { stops, error, alignViaticos = false } = exportData;
  if (error) {
    alert(error);
    return;
  }

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 14;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text(transportName || "Transporte", pageWidth / 2, y, { align: "center" });
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Hoja de Ruta", pageWidth / 2, y, { align: "center" });
  y += 8;

  const pageHeight = doc.internal.pageSize.getHeight();
  const bottomMargin = 16;

  stops.forEach(({ evt, stopNum, ups, downs, paxOnBoard }) => {
    if (y > pageHeight - bottomMargin) {
      doc.addPage();
      y = 14;
    }

    const headerLine = buildStopHeaderText(stopNum, evt, alignViaticos).replace(
      /\s+\|\s+/g,
      "  |  ",
    );

    doc.setFillColor(21, 101, 192);
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    const headerLines = doc.splitTextToSize(headerLine, pageWidth - 28);
    const headerH = headerLines.length * 4.5 + 4;
    doc.rect(14, y, pageWidth - 28, headerH, "F");
    doc.text(headerLines, pageWidth / 2, y + 5, { align: "center" });
    y += headerH + 3;

    doc.setTextColor(60, 60, 60);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("LUGAR:", 14, y);
    doc.setFont("helvetica", "normal");
    const placeLines = doc.splitTextToSize(buildPlaceLabel(evt), pageWidth - 40);
    doc.text(placeLines, 28, y);
    y += placeLines.length * 4 + 4;

    if (y > pageHeight - 40) {
      doc.addPage();
      y = 14;
    }

    y = drawPassengerTable(
      doc,
      y,
      `SUBEN (${ups.length})`,
      ups,
      paxLocalities,
      [46, 125, 50],
      alignViaticos,
    );

    if (y > pageHeight - 40) {
      doc.addPage();
      y = 14;
    }

    y = drawPassengerTable(
      doc,
      y,
      `BAJAN (${downs.length})`,
      downs,
      paxLocalities,
      [198, 40, 40],
      alignViaticos,
    );

    doc.setFillColor(238, 238, 238);
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    const totalH = 7;
    if (y + totalH > pageHeight - bottomMargin) {
      doc.addPage();
      y = 14;
    }
    doc.rect(14, y, pageWidth - 28, totalH, "F");
    doc.text(
      `TOTAL A BORDO AL SALIR: ${paxOnBoard}`,
      pageWidth / 2,
      y + 4.5,
      { align: "center" },
    );
    y += totalH + 8;
  });

  doc.save(`Hoja_Ruta_${transportName}.pdf`);
}
