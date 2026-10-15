import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import jsPDFDefault, { jsPDF as jsPDFNamed } from "jspdf";
import autoTable from "jspdf-autotable";
import { formatProgramNomenMes } from "../utils/giraUtils";
import { calcValorDiarioProporcional } from "../utils/viaticosValorDiarioProporcional";
import { scheduleFromParadaRange } from "../utils/viaticosParadasIntegrante";
import { calcDevolucionReintegro } from "../utils/rendicionDiff";
import { listValorDiarioVigencias } from "./viaticosValorDiarioService";

const JsPDF =
  typeof jsPDFNamed === "function"
    ? jsPDFNamed
    : jsPDFDefault?.jsPDF || jsPDFDefault;

const round2 = (num) => Math.round((Number(num) + Number.EPSILON) * 100) / 100;

/** Pares gasto anticipado / rendición (misma lógica que ViaticosTable). */
export const SEGUIMIENTO_FINANCIAL_COLS = [
  {
    label: "Movilidad",
    exp: "gastos_movilidad",
    ren: "rendicion_transporte_otros",
  },
  {
    label: "Combustible",
    exp: "gasto_combustible",
    ren: "rendicion_gasto_combustible",
  },
  {
    label: "Alojamiento",
    exp: "gasto_alojamiento",
    ren: "rendicion_gasto_alojamiento",
  },
  { label: "Capacit.", exp: "gastos_capacit", ren: "rendicion_gastos_capacit" },
  {
    label: "Mov. Otros",
    exp: "gastos_movil_otros",
    ren: "rendicion_gastos_movil_otros",
  },
  { label: "Otros", exp: "gasto_otros", ren: "rendicion_gasto_otros" },
];

function safeMoney(v) {
  if (v === null || v === undefined || v === "") return 0;
  const n = typeof v === "number" ? v : parseFloat(String(v).trim());
  return Number.isFinite(n) ? n : 0;
}

function sumAnticipoGastos(row) {
  return SEGUIMIENTO_FINANCIAL_COLS.reduce(
    (acc, p) => acc + safeMoney(row[p.exp]),
    0,
  );
}

function sumRendicionTotal(row) {
  return (
    safeMoney(row.rendicion_viaticos) +
    SEGUIMIENTO_FINANCIAL_COLS.reduce(
      (acc, p) => acc + safeMoney(row[p.ren]),
      0,
    )
  );
}

export const SEGUIMIENTO_TIPO_OPTIONS = [
  { value: null, label: "—" },
  { value: "viatico", label: "Viatico" },
  { value: "reintegro", label: "Reintegro" },
];

export const SEGUIMIENTO_COLOR_OPTIONS = [
  { value: null, label: "Sin marca" },
  { value: "amarillo", label: "Amarillo" },
  { value: "verde", label: "Verde" },
  { value: "celeste", label: "Celeste" },
  { value: "rojo", label: "Rojo" },
];

function unwrapEmbed(value) {
  if (Array.isArray(value)) return value[0] || null;
  return value || null;
}

function sliceTime(value) {
  if (!value) return null;
  return String(value).slice(0, 5);
}

function formatDateShort(dateStr) {
  if (!dateStr) return "";
  const raw = String(dateStr).slice(0, 10);
  const [y, m, d] = raw.split("-");
  if (!d || !m) return raw;
  return `${d}/${m}`;
}

function formatLegCell({ fecha, hora, vehiculo }) {
  const datePart = formatDateShort(fecha);
  const timePart = sliceTime(hora);
  if (!datePart && !timePart && !vehiculo) return "";
  const left =
    datePart && timePart
      ? `${datePart}|${timePart}`
      : datePart || timePart || "";
  const vehicle = String(vehiculo || "").trim();
  if (left && vehicle) return `${left} ${vehicle}`;
  return left || vehicle;
}

function formatPersonaCell({ apellido, nombre, tramoLabel, rolLabel }) {
  const name = `${apellido || ""}, ${nombre || ""}`.trim().replace(/^,\s*/, "");
  const parts = [name];
  if (tramoLabel) parts.push(tramoLabel);
  if (rolLabel) parts.push(rolLabel);
  return parts.filter(Boolean).join(" / ");
}

function resolveTramoLabel(row) {
  const etiqueta = String(row.etiqueta_tramo || "").trim();
  if (etiqueta) return etiqueta;
  if (row.id_evento_parada_inicio != null && row.id_evento_parada_fin != null) {
    const orden = row.tramo_orden != null ? Number(row.tramo_orden) : null;
    return Number.isFinite(orden) && orden > 0 ? `Tramo ${orden}` : "Tramo";
  }
  return "";
}

function resolveVehiculoLabel(row) {
  const patente = String(row.patente_oficial || "").trim();
  if (patente) return patente;
  const particular = String(row.patente_particular || "").trim();
  if (particular) return particular;
  const otros = String(row.transporte_otros || "").trim();
  if (otros) return otros;
  if (row.check_terrestre || row.check_aereo || row.check_patente_oficial) {
    return "A definir";
  }
  return "";
}

function resolveMonto(row, schedule, vigencias, factorTemporada) {
  if (row.anticipo_custom != null && row.anticipo_custom !== "") {
    const custom = parseFloat(row.anticipo_custom);
    if (Number.isFinite(custom)) return round2(custom);
  }
  if (row.backup_viatico != null && row.backup_viatico !== "") {
    const backup = parseFloat(row.backup_viatico);
    if (Number.isFinite(backup)) return round2(backup);
  }

  const rawPct =
    row.porcentaje === 0 || row.porcentaje ? row.porcentaje : 100;
  const fin = calcValorDiarioProporcional({
    fechaSalida: schedule.fecha_salida,
    horaSalida: schedule.hora_salida,
    fechaLlegada: schedule.fecha_llegada,
    horaLlegada: schedule.hora_llegada,
    vigencias,
    fallbackBase: 0,
    porcentaje: rawPct,
    factorTemporada: factorTemporada || 0,
  });
  if (fin.subtotal > 0) return round2(fin.subtotal);

  const dias = parseFloat(
    row.backup_dias_computables ?? row.dias_computables ?? 0,
  );
  if (Number.isFinite(dias) && dias > 0 && fin.valorDiarioCalc > 0) {
    return round2(dias * fin.valorDiarioCalc);
  }
  return 0;
}

function yearBounds(year) {
  const y = Number(year);
  return {
    desde: `${y}-01-01`,
    hasta: `${y}-12-31`,
  };
}

/**
 * Carga consolidada de viáticos individuales para Gestión → Seguimiento.
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {{ year?: number }} [options]
 */
export async function fetchViaticosSeguimientoRows(supabase, options = {}) {
  const year = options.year ?? new Date().getFullYear();
  const { desde, hasta } = yearBounds(year);

  const [
    { data: detalleData, error: detalleError },
    vigencias,
    { data: configsData, error: configsError },
  ] = await Promise.all([
    supabase
      .from("giras_viaticos_detalle")
      .select(
        `
        id,
        id_gira,
        id_integrante,
        dias_computables,
        porcentaje,
        patente_oficial,
        patente_particular,
        transporte_otros,
        check_aereo,
        check_terrestre,
        check_patente_oficial,
        check_patente_particular,
        cargo,
        anticipo_custom,
        backup_viatico,
        backup_fecha_salida,
        backup_hora_salida,
        backup_fecha_llegada,
        backup_hora_llegada,
        backup_dias_computables,
        gastos_movilidad,
        gasto_combustible,
        gasto_alojamiento,
        gastos_capacit,
        gastos_movil_otros,
        gasto_otros,
        rendicion_viaticos,
        rendicion_transporte_otros,
        rendicion_gasto_combustible,
        rendicion_gasto_alojamiento,
        rendicion_gastos_capacit,
        rendicion_gastos_movil_otros,
        rendicion_gasto_otros,
        id_evento_parada_inicio,
        id_evento_parada_fin,
        tramo_orden,
        etiqueta_tramo,
        seguimiento_tipo,
        seguimiento_color,
        integrantes:id_integrante(id, nombre, apellido),
        programas:id_gira!inner(
          id, mes_letra, nomenclador, zona, nombre_gira, fecha_desde, fecha_hasta
        )
      `,
      )
      .gte("programas.fecha_desde", desde)
      .lte("programas.fecha_desde", hasta)
      .order("id", { ascending: true }),
    listValorDiarioVigencias(supabase),
    supabase.from("giras_viaticos_config").select("id_gira, factor_temporada"),
  ]);

  if (detalleError) throw detalleError;
  if (configsError) throw configsError;

  const factorByGira = new Map();
  (configsData || []).forEach((c) => {
    factorByGira.set(String(c.id_gira), parseFloat(c.factor_temporada || 0) || 0);
  });

  const inYear = detalleData || [];

  const giraIds = [
    ...new Set(inYear.map((r) => r.id_gira).filter((id) => id != null)),
  ];

  let rolesMap = new Map();
  if (giraIds.length > 0) {
    const { data: rolesData, error: rolesError } = await supabase
      .from("giras_integrantes")
      .select("id_gira, id_integrante, rol")
      .in("id_gira", giraIds);
    if (rolesError) throw rolesError;
    rolesMap = new Map(
      (rolesData || []).map((r) => [
        `${r.id_gira}:${r.id_integrante}`,
        r.rol || "",
      ]),
    );
  }

  const eventIds = [
    ...new Set(
      inYear
        .flatMap((r) => [r.id_evento_parada_inicio, r.id_evento_parada_fin])
        .filter((id) => id != null),
    ),
  ];
  let eventsById = new Map();
  if (eventIds.length > 0) {
    const { data: eventsData, error: eventsError } = await supabase
      .from("eventos")
      .select(
        `
        id, fecha, hora_inicio, descripcion, id_gira_transporte,
        locaciones:id_locacion(nombre, localidades:id_localidad(localidad))
      `,
      )
      .in("id", eventIds);
    if (eventsError) throw eventsError;
    eventsById = new Map((eventsData || []).map((e) => [String(e.id), e]));
  }

  const rows = inYear.map((row) => {
    const persona = unwrapEmbed(row.integrantes);
    const programa = unwrapEmbed(row.programas);
    const rolGira =
      rolesMap.get(`${row.id_gira}:${row.id_integrante}`) || "";
    const tramoLabel = resolveTramoLabel(row);

    let fechaSalida = row.backup_fecha_salida || null;
    let horaSalida = sliceTime(row.backup_hora_salida);
    let fechaLlegada = row.backup_fecha_llegada || null;
    let horaLlegada = sliceTime(row.backup_hora_llegada);

    if (
      (!fechaSalida || !fechaLlegada) &&
      row.id_evento_parada_inicio != null &&
      row.id_evento_parada_fin != null
    ) {
      const allEvents = [
        eventsById.get(String(row.id_evento_parada_inicio)),
        eventsById.get(String(row.id_evento_parada_fin)),
      ].filter(Boolean);
      const tramoSched = scheduleFromParadaRange(
        allEvents,
        row.id_evento_parada_inicio,
        row.id_evento_parada_fin,
      );
      if (tramoSched) {
        fechaSalida = fechaSalida || tramoSched.fecha_salida;
        horaSalida = horaSalida || sliceTime(tramoSched.hora_salida);
        fechaLlegada = fechaLlegada || tramoSched.fecha_llegada;
        horaLlegada = horaLlegada || sliceTime(tramoSched.hora_llegada);
      }
    }

    const vehiculo = resolveVehiculoLabel(row);
    const schedule = {
      fecha_salida: fechaSalida,
      hora_salida: horaSalida,
      fecha_llegada: fechaLlegada,
      hora_llegada: horaLlegada,
    };
    const factor = factorByGira.get(String(row.id_gira)) || 0;
    const anticipoViatico = resolveMonto(row, schedule, vigencias, factor);
    const anticipo = round2(anticipoViatico + sumAnticipoGastos(row));
    const rendicion = round2(sumRendicionTotal(row));
    const { dev, reint } = calcDevolucionReintegro(anticipo, rendicion);
    const apellido = persona?.apellido || "";
    const nombre = persona?.nombre || "";
    const rolLabel = String(row.cargo || rolGira || "").trim();
    const mesLetra = String(programa?.mes_letra || "").trim();
    const nomenclador = String(programa?.nomenclador || "").trim();
    const zona = String(programa?.zona || "").trim();
    const programaLabel = formatProgramNomenMes(programa) ||
      String(programa?.nombre_gira || "").trim() ||
      `Gira ${row.id_gira}`;
    const programaTop = [mesLetra, nomenclador].filter(Boolean).join(" | ");
    const programaNombre = String(programa?.nombre_gira || "").trim();

    const detail = {};
    SEGUIMIENTO_FINANCIAL_COLS.forEach((col) => {
      detail[col.exp] = safeMoney(row[col.exp]);
      detail[col.ren] = safeMoney(row[col.ren]);
    });

    return {
      id: row.id,
      id_gira: row.id_gira,
      id_integrante: row.id_integrante,
      apellido,
      nombre,
      rol_gira: rolGira,
      cargo: row.cargo || "",
      rolLabel,
      tramoLabel,
      personaCell: formatPersonaCell({
        apellido,
        nombre,
        tramoLabel,
        rolLabel,
      }),
      fecha_salida: fechaSalida,
      hora_salida: horaSalida,
      fecha_llegada: fechaLlegada,
      hora_llegada: horaLlegada,
      vehiculo,
      salidaCell: formatLegCell({
        fecha: fechaSalida,
        hora: horaSalida,
        vehiculo,
      }),
      regresoCell: formatLegCell({
        fecha: fechaLlegada,
        hora: horaLlegada,
        vehiculo,
      }),
      programaLabel,
      programaTop,
      programaZona: zona,
      programaNombre,
      programaFechaDesde: programa?.fecha_desde
        ? String(programa.fecha_desde).slice(0, 10)
        : null,
      anticipoViatico: round2(anticipoViatico),
      anticipo,
      rendicion_viaticos: safeMoney(row.rendicion_viaticos),
      rendicion,
      devolucion: round2(dev),
      reintegro: round2(reint),
      /** Compat: monto = anticipo total */
      monto: anticipo,
      ...detail,
      seguimiento_tipo: row.seguimiento_tipo || null,
      seguimiento_color: row.seguimiento_color || null,
    };
  });

  rows.sort((a, b) => {
    const da = a.fecha_salida || a.programaFechaDesde || "";
    const db = b.fecha_salida || b.programaFechaDesde || "";
    if (da !== db) return da.localeCompare(db);
    const byApellido = (a.apellido || "").localeCompare(b.apellido || "", "es");
    if (byApellido !== 0) return byApellido;
    return (a.tramoLabel || "").localeCompare(b.tramoLabel || "", "es");
  });

  return { year, rows, vigencias };
}

/**
 * Actualiza tipo y/o color de seguimiento de una fila de detalle.
 */
export async function patchViaticoSeguimiento(
  supabase,
  id,
  { seguimiento_tipo, seguimiento_color },
) {
  const payload = {};
  if (seguimiento_tipo !== undefined) {
    payload.seguimiento_tipo = seguimiento_tipo || null;
  }
  if (seguimiento_color !== undefined) {
    payload.seguimiento_color = seguimiento_color || null;
  }
  const { data, error } = await supabase
    .from("giras_viaticos_detalle")
    .update(payload)
    .eq("id", id)
    .select("id, seguimiento_tipo, seguimiento_color")
    .single();
  if (error) throw error;
  return data;
}

function colorLabel(value) {
  if (value === "amarillo") return "Amarillo";
  if (value === "verde") return "Verde";
  if (value === "celeste") return "Celeste";
  if (value === "rojo") return "Rojo";
  return "";
}

export function formatMontoArs(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "";
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
  }).format(n);
}

export function formatDevReintLabel(row) {
  const reint = Number(row?.reintegro) || 0;
  const dev = Number(row?.devolucion) || 0;
  if (reint > 0) return `Reint ${formatMontoArs(reint)}`;
  if (dev > 0) return `Dev ${formatMontoArs(dev)}`;
  return "—";
}

const ROW_FILL_ARGB = {
  amarillo: "FFFFF59D",
  verde: "FFA5D6A7",
  celeste: "FF81D4FA",
  rojo: "FFEF9A9A",
};

const ROW_FILL_RGB = {
  amarillo: [255, 245, 157],
  verde: [165, 214, 167],
  celeste: [129, 212, 250],
  rojo: [239, 154, 154],
};

const PDF_ORANGE = [255, 237, 213];
const PDF_ORANGE_TEXT = [124, 45, 18];
const PDF_GREEN = [209, 250, 229];
const PDF_GREEN_TEXT = [6, 95, 70];

/** Conceptos de anticipo (arriba) y rendición (abajo) en PDF y grupos de Excel. */
const EXPORT_MONEY_COLS = [
  { label: "Viático", exp: "anticipoViatico", ren: "rendicion_viaticos" },
  ...SEGUIMIENTO_FINANCIAL_COLS.map((col) => ({
    label: col.label,
    exp: col.exp,
    ren: col.ren,
  })),
];

function seguimientoFileBase(fileName, year) {
  return fileName || `Seguimiento_viaticos_${year}`;
}

function formatDevReintTotals(totals) {
  const parts = [];
  if ((totals?.devolucion || 0) > 0) {
    parts.push(`Dev ${formatMontoArs(totals.devolucion)}`);
  }
  if ((totals?.reintegro || 0) > 0) {
    parts.push(`Reint ${formatMontoArs(totals.reintegro)}`);
  }
  return parts.join("\n") || "—";
}

/** Suma de las filas visibles (anticipo, rendición, dev/reint y desglose). */
export function sumViaticosSeguimientoRows(rows) {
  const totals = {
    anticipo: 0,
    rendicion: 0,
    devolucion: 0,
    reintegro: 0,
    anticipoViatico: 0,
    rendicion_viaticos: 0,
  };
  for (const col of SEGUIMIENTO_FINANCIAL_COLS) {
    totals[col.exp] = 0;
    totals[col.ren] = 0;
  }
  for (const row of rows || []) {
    totals.anticipo += Number(row.anticipo) || 0;
    totals.rendicion += Number(row.rendicion) || 0;
    totals.devolucion += Number(row.devolucion) || 0;
    totals.reintegro += Number(row.reintegro) || 0;
    totals.anticipoViatico += Number(row.anticipoViatico) || 0;
    totals.rendicion_viaticos += Number(row.rendicion_viaticos) || 0;
    for (const col of SEGUIMIENTO_FINANCIAL_COLS) {
      totals[col.exp] += Number(row[col.exp]) || 0;
      totals[col.ren] += Number(row[col.ren]) || 0;
    }
  }
  for (const key of Object.keys(totals)) {
    totals[key] = round2(totals[key]);
  }
  return totals;
}

function detailExportColumns(prefix, group, field) {
  return EXPORT_MONEY_COLS.map((col) => ({
    header: `${prefix} ${col.label}`,
    type: "money",
    width: 14,
    group,
    value: (row) => Number(row[col[field]]) || 0,
    total: (totals) => totals[col[field]] || 0,
  }));
}

function buildSeguimientoExportColumns() {
  return [
    {
      header: "Persona / Tramo / Rol",
      type: "text",
      width: 36,
      value: (row) => row.personaCell || "",
    },
    {
      header: "Salida",
      type: "text",
      width: 22,
      value: (row) => row.salidaCell || "",
    },
    {
      header: "Regreso",
      type: "text",
      width: 22,
      value: (row) => row.regresoCell || "",
    },
    {
      header: "Programa",
      type: "text",
      width: 28,
      value: (row) => row.programaLabel || "",
    },
    ...detailExportColumns("Ant.", "anticipo", "exp"),
    {
      header: "Anticipo",
      type: "money",
      width: 14,
      summary: "anticipo",
      note: "Detalle de anticipo oculto a la izquierda. Usá el + de esta columna para desplegarlo.",
      value: (row) => Number(row.anticipo) || 0,
      total: (totals) => totals.anticipo,
    },
    {
      header: "Dev/Reint",
      type: "dev",
      width: 22,
      value: (row) => formatDevReintLabel(row),
      total: (totals) => formatDevReintTotals(totals),
    },
    ...detailExportColumns("Rend.", "rendicion", "ren"),
    {
      header: "Rendición",
      type: "money",
      width: 14,
      summary: "rendicion",
      note: "Detalle de rendición oculto a la izquierda. Usá el + de esta columna para desplegarlo.",
      value: (row) => Number(row.rendicion) || 0,
      total: (totals) => totals.rendicion,
    },
    {
      header: "Color",
      type: "text",
      width: 12,
      value: (row) => colorLabel(row.seguimiento_color),
    },
  ];
}

function headerFillForColumn(col) {
  if (col.group === "anticipo") return { bg: "FFFFEDD5", fg: "FF9A3412" };
  if (col.summary === "anticipo") return { bg: "FFFDBA74", fg: "FF9A3412" };
  if (col.group === "rendicion") return { bg: "FFD1FAE5", fg: "FF065F46" };
  if (col.summary === "rendicion") return { bg: "FF6EE7B7", fg: "FF065F46" };
  return { bg: "FFF1F5F9", fg: "FF334155" };
}

function applyRowFill(excelRow, argb) {
  if (!argb) return;
  excelRow.eachCell({ includeEmpty: true }, (cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb },
    };
  });
}

function solidFill(argb) {
  return {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb },
  };
}

/**
 * Libro Excel del seguimiento visible.
 * El desglose de anticipo y de rendición queda agrupado y oculto.
 */
export function createViaticosSeguimientoWorkbook({ rows, year }) {
  const list = rows || [];
  const cols = buildSeguimientoExportColumns();
  const totals = sumViaticosSeguimientoRows(list);
  const devCol = cols.findIndex((col) => col.type === "dev") + 1;

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(`Viáticos ${year}`, {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  ws.addRow(cols.map((col) => col.header));
  const header = ws.getRow(1);
  header.height = 32;
  cols.forEach((col, idx) => {
    const cell = header.getCell(idx + 1);
    const tone = headerFillForColumn(col);
    cell.fill = solidFill(tone.bg);
    cell.font = { bold: true, size: 9, color: { argb: tone.fg } };
    cell.alignment = {
      vertical: "middle",
      horizontal: col.type === "text" && !col.group ? "left" : "center",
      wrapText: true,
    };
    if (col.note) cell.note = col.note;
  });

  for (const row of list) {
    const excelRow = ws.addRow(cols.map((col) => col.value(row)));
    excelRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const def = cols[colNumber - 1];
      cell.alignment = {
        vertical: "middle",
        horizontal: def?.type === "money" || def?.type === "dev" ? "right" : "left",
        wrapText: def?.type !== "money",
      };
    });
    applyRowFill(excelRow, ROW_FILL_ARGB[row.seguimiento_color]);
    const devReintCell = excelRow.getCell(devCol);
    if ((Number(row.reintegro) || 0) > 0) {
      devReintCell.font = {
        ...(devReintCell.font || {}),
        color: { argb: "FFBE123C" },
      };
    } else if ((Number(row.devolucion) || 0) > 0) {
      devReintCell.font = {
        ...(devReintCell.font || {}),
        color: { argb: "FF0369A1" },
      };
    }
  }

  const totalRow = ws.addRow(
    cols.map((col, idx) => {
      if (idx === 0) return `Total (${list.length})`;
      if (col.total) return col.total(totals);
      return "";
    }),
  );
  totalRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    const def = cols[colNumber - 1];
    cell.fill = solidFill("FFE2E8F0");
    cell.font = { bold: true, size: 10 };
    cell.border = {
      top: { style: "medium", color: { argb: "FF475569" } },
    };
    cell.alignment = {
      vertical: "middle",
      horizontal: def?.type === "money" || def?.type === "dev" ? "right" : "left",
      wrapText: def?.type === "dev",
    };
    if (def?.type === "money") cell.numFmt = '"$"#,##0.00';
  });

  cols.forEach((def, idx) => {
    const column = ws.getColumn(idx + 1);
    column.width = def.width;
    if (def.type === "money") column.numFmt = '"$"#,##0.00';
    if (def.group) {
      column.outlineLevel = 1;
      column.hidden = true;
    }
  });
  // outlineLevelCol por encima del nivel de las columnas evita que ExcelJS
  // marque collapsed en el detalle; hidden + outlineLevel las deja plegadas.
  ws.properties.outlineLevelCol = 2;
  ws.properties.outlineProperties = {
    summaryRight: true,
    summaryBelow: false,
  };

  return wb;
}

/**
 * Exporta el seguimiento visible a Excel (columnas de la planilla).
 * El desglose de anticipo y rendición queda oculto y se despliega con el grupo.
 */
export async function downloadViaticosSeguimientoExcel({
  rows,
  year,
  fileName,
}) {
  const wb = createViaticosSeguimientoWorkbook({ rows, year });
  const buf = await wb.xlsx.writeBuffer();
  const safe = seguimientoFileBase(fileName, year);
  saveAs(
    new Blob([buf], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    `${safe}.xlsx`,
  );
}

function pdfMoneyText(value, blankZero) {
  const n = Number(value) || 0;
  if (blankZero && Math.abs(n) < 0.005) return "—";
  return n.toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function pdfMoneyCell(value, tone, { blankZero = true, emphasize = false } = {}) {
  const isAnt = tone === "ant";
  return {
    content: pdfMoneyText(value, blankZero),
    styles: {
      halign: "right",
      fontStyle: emphasize ? "bold" : "normal",
      fillColor: isAnt ? PDF_ORANGE : PDF_GREEN,
      textColor: isAnt ? PDF_ORANGE_TEXT : PDF_GREEN_TEXT,
    },
  };
}

function pdfSpanCell(content, fill, extraStyles = {}) {
  return {
    content: content == null ? "—" : content,
    rowSpan: 2,
    styles: {
      valign: "middle",
      ...(fill ? { fillColor: fill } : {}),
      ...extraStyles,
    },
  };
}

/**
 * PDF apaisado: cada fila de seguimiento ocupa dos renglones
 * (anticipo arriba, rendición abajo), con total al pie.
 */
export function createViaticosSeguimientoPdf({ rows, year }) {
  const list = rows || [];
  const totals = sumViaticosSeguimientoRows(list);
  const doc = new JsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });
  const margin = { top: 12, right: 8, bottom: 12, left: 8 };

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(30, 41, 59);
  doc.text(`Seguimiento viáticos ${year}`, margin.left, 10);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(
    `${list.length} filas · fila superior: anticipo · fila inferior: rendición`,
    margin.left,
    15,
  );

  const head = [[
    "Persona / Tramo / Rol",
    "Salida",
    "Regreso",
    "Programa",
    ...EXPORT_MONEY_COLS.map((col) => col.label),
    "Total",
    "Dev/Reint",
    "Color",
  ]];

  const body = [];
  for (const row of list) {
    const mark = ROW_FILL_RGB[row.seguimiento_color] || null;
    const reint = Number(row.reintegro) || 0;
    const dev = Number(row.devolucion) || 0;
    const devColor = reint > 0 ? [190, 18, 60] : dev > 0 ? [3, 105, 161] : [100, 116, 139];
    body.push([
      pdfSpanCell(row.personaCell, mark),
      pdfSpanCell(row.salidaCell, mark),
      pdfSpanCell(row.regresoCell, mark),
      pdfSpanCell(row.programaLabel, mark),
      ...EXPORT_MONEY_COLS.map((col) => pdfMoneyCell(row[col.exp], "ant")),
      pdfMoneyCell(row.anticipo, "ant", { blankZero: false, emphasize: true }),
      pdfSpanCell(formatDevReintLabel(row), mark, {
        halign: "right",
        fontStyle: "bold",
        textColor: devColor,
      }),
      pdfSpanCell(colorLabel(row.seguimiento_color) || "—", mark, {
        halign: "center",
      }),
    ]);
    body.push([
      ...EXPORT_MONEY_COLS.map((col) => pdfMoneyCell(row[col.ren], "ren")),
      pdfMoneyCell(row.rendicion, "ren", { blankZero: false, emphasize: true }),
    ]);
  }

  const totalFill = [226, 232, 240];
  body.push([
    pdfSpanCell(`Total (${list.length})`, totalFill, { fontStyle: "bold" }),
    pdfSpanCell("", totalFill),
    pdfSpanCell("", totalFill),
    pdfSpanCell("", totalFill),
    ...EXPORT_MONEY_COLS.map((col) =>
      pdfMoneyCell(totals[col.exp], "ant", { blankZero: false, emphasize: true }),
    ),
    pdfMoneyCell(totals.anticipo, "ant", { blankZero: false, emphasize: true }),
    pdfSpanCell(formatDevReintTotals(totals), totalFill, {
      halign: "right",
      fontStyle: "bold",
    }),
    pdfSpanCell("", totalFill),
  ]);
  body.push([
    ...EXPORT_MONEY_COLS.map((col) =>
      pdfMoneyCell(totals[col.ren], "ren", { blankZero: false, emphasize: true }),
    ),
    pdfMoneyCell(totals.rendicion, "ren", { blankZero: false, emphasize: true }),
  ]);

  const moneyWidth = 16;
  autoTable(doc, {
    head,
    body,
    startY: 18,
    margin,
    theme: "grid",
    tableWidth: "wrap",
    rowPageBreak: "avoid",
    styles: {
      font: "helvetica",
      fontSize: 6.5,
      cellPadding: 1,
      valign: "middle",
      overflow: "linebreak",
      lineColor: [203, 213, 225],
      lineWidth: 0.1,
      textColor: [30, 41, 59],
    },
    headStyles: {
      fillColor: [241, 245, 249],
      textColor: [51, 65, 85],
      fontStyle: "bold",
      halign: "center",
      fontSize: 6.5,
    },
    columnStyles: {
      0: { cellWidth: 32 },
      1: { cellWidth: 24 },
      2: { cellWidth: 24 },
      3: { cellWidth: 26 },
      4: { cellWidth: moneyWidth },
      5: { cellWidth: moneyWidth },
      6: { cellWidth: moneyWidth },
      7: { cellWidth: moneyWidth },
      8: { cellWidth: 14 },
      9: { cellWidth: moneyWidth },
      10: { cellWidth: 14 },
      11: { cellWidth: 18 },
      12: { cellWidth: 24 },
      13: { cellWidth: 14 },
    },
    didDrawPage: () => {
      const page = doc.internal.getCurrentPageInfo().pageNumber;
      const height = doc.internal.pageSize.getHeight();
      const width = doc.internal.pageSize.getWidth();
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(100);
      doc.text(
        "Anticipo (naranja) sobre rendición (verde)",
        margin.left,
        height - 6,
      );
      doc.text(String(page), width - margin.right, height - 6, {
        align: "right",
      });
    },
  });

  return doc;
}

/** Exporta el seguimiento visible a PDF horizontal. */
export function downloadViaticosSeguimientoPdf({ rows, year, fileName }) {
  const doc = createViaticosSeguimientoPdf({ rows, year });
  doc.save(`${seguimientoFileBase(fileName, year)}.pdf`);
}
