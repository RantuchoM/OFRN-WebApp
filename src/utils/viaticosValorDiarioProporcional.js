import {
  explainViaticosDiasCalculation,
  formatFechaViaticos,
} from "./viaticosDiasComputables";

const round2 = (num) => Math.round((num + Number.EPSILON) * 100) / 100;

function toIsoDay(value) {
  if (value == null || value === "") return "";
  return String(value).slice(0, 10);
}

function addDaysIso(isoDate, delta) {
  const [y, m, d] = String(isoDate).split("-").map(Number);
  const dt = new Date(y, m - 1, d + delta);
  const ym = String(dt.getFullYear());
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${ym}-${mm}-${dd}`;
}

export function formatIsoDateDDMMYYYY(iso) {
  return formatFechaViaticos(iso);
}

export function minIsoDate(dates) {
  const clean = (dates || []).map(toIsoDay).filter(Boolean).sort();
  return clean[0] || "";
}

export function maxIsoDate(dates) {
  const clean = (dates || []).map(toIsoDay).filter(Boolean).sort();
  return clean[clean.length - 1] || "";
}

function sortedVigencias(vigencias) {
  return [...(Array.isArray(vigencias) ? vigencias : [])].sort((a, b) =>
    toIsoDay(b.vigencia_desde).localeCompare(toIsoDay(a.vigencia_desde)),
  );
}

/**
 * Franja que cubre `fecha`. Si hay hueco (hasta cortado antes del siguiente desde),
 * arrastra la última vigencia con desde ≤ fecha.
 */
export function findVigenciaParaFecha(fecha, vigencias) {
  const day = toIsoDay(fecha);
  if (!day) return null;
  const list = sortedVigencias(vigencias);

  for (const v of list) {
    const desde = toIsoDay(v.vigencia_desde);
    const hasta = v.vigencia_hasta ? toIsoDay(v.vigencia_hasta) : null;
    if (desde && day >= desde && (!hasta || day <= hasta)) return v;
  }

  for (const v of list) {
    const desde = toIsoDay(v.vigencia_desde);
    if (desde && desde <= day) return v;
  }

  return null;
}

/** Reparte los días computables por fecha calendario (salida, intermedios, llegada). */
export function buildDiasPorFecha(dSal, hSal, dLleg, hLleg) {
  const explained = explainViaticosDiasCalculation(dSal, hSal, dLleg, hLleg);
  if (explained.incomplete || explained.total <= 0) return [];

  if (explained.sameDay) {
    return [{ fecha: dSal, dias: explained.total }];
  }

  const pieces = [{ fecha: dSal, dias: explained.departureFactor }];
  for (let i = 1; i <= explained.middleDays; i++) {
    pieces.push({ fecha: addDaysIso(dSal, i), dias: 1 });
  }
  pieces.push({ fecha: dLleg, dias: explained.arrivalFactor });
  return pieces.filter((p) => p.dias > 0);
}

export function getMontoVigenteParaFecha(fecha, vigencias, fallbackBase = 0) {
  const found = findVigenciaParaFecha(fecha, vigencias);
  if (found) {
    const monto = Number(found.monto);
    if (Number.isFinite(monto) && monto > 0) return monto;
  }

  const fb = Number(fallbackBase);
  return Number.isFinite(fb) && fb > 0 ? fb : 0;
}

const fmtDiasLabel = (dias) => {
  const n = Number(dias);
  if (!Number.isFinite(n)) return "0 días";
  const label = Number.isInteger(n) ? String(n) : String(n).replace(".", ",");
  return n === 1 ? "1 día" : `${label} días`;
};

export function fmtMoneyArs(val) {
  const n = Number(val);
  const safe = Number.isFinite(n) ? n : 0;
  return `$${safe.toLocaleString("es-AR")}`;
}

/**
 * Calcula subtotal y valor diario efectivo prorrateando por vigencias cuando el viaje cruza un corte.
 * Cada día calendario del conteo DÍAS toma el valor_diario vigente esa fecha
 * (nueva franja desde su `vigencia_desde` inclusive; la anterior cierra el día previo).
 */
export function calcValorDiarioProporcional({
  fechaSalida,
  horaSalida,
  fechaLlegada,
  horaLlegada,
  vigencias = [],
  fallbackBase = 0,
  porcentaje = 100,
  factorTemporada = 0,
}) {
  const explained = explainViaticosDiasCalculation(
    fechaSalida,
    horaSalida,
    fechaLlegada,
    horaLlegada,
  );
  const dias_computables = explained.total;

  const rawPct =
    porcentaje === 0 || porcentaje ? porcentaje : 100;
  const pct = parseFloat(String(rawPct).replace("%", "")) / 100;
  const factor = parseFloat(factorTemporada || 0);

  if (dias_computables <= 0) {
    const base = getMontoVigenteParaFecha(
      fechaSalida,
      vigencias,
      fallbackBase,
    );
    const valorDiarioCalc = round2(base * pct * (1 + factor));
    return {
      dias_computables: 0,
      subtotal: 0,
      valorDiarioCalc,
      segmentos: [],
      usaProporcional: false,
    };
  }

  const pieces = buildDiasPorFecha(
    fechaSalida,
    horaSalida,
    fechaLlegada,
    horaLlegada,
  );

  const grupos = new Map();
  for (const { fecha, dias } of pieces) {
    const row = findVigenciaParaFecha(fecha, vigencias);
    const montoBase = getMontoVigenteParaFecha(fecha, vigencias, fallbackBase);
    const key = String(montoBase);
    const g = grupos.get(key) || {
      montoBase,
      dias: 0,
      fechas: [],
      vigenciaDesde: row ? toIsoDay(row.vigencia_desde) : "",
    };
    g.dias += dias;
    g.fechas.push(toIsoDay(fecha));
    grupos.set(key, g);
  }

  const segmentos = [];
  let subtotal = 0;

  for (const g of grupos.values()) {
    const valorDiarioTramo = round2(g.montoBase * pct * (1 + factor));
    const subtotalTramo = round2(g.dias * valorDiarioTramo);
    subtotal += subtotalTramo;
    const fechas = [...g.fechas].sort();
    segmentos.push({
      montoBase: g.montoBase,
      dias: round2(g.dias),
      valorDiarioCalc: valorDiarioTramo,
      subtotalTramo,
      fechas,
      fechaDesde: fechas[0] || "",
      fechaHasta: fechas[fechas.length - 1] || "",
      vigenciaDesde: g.vigenciaDesde,
    });
  }

  subtotal = round2(subtotal);
  segmentos.sort((a, b) =>
    String(a.fechaDesde).localeCompare(String(b.fechaDesde)),
  );

  const segmentosConMonto = segmentos.filter((s) => s.montoBase > 0);

  const valorDiarioCalc =
    dias_computables > 0
      ? round2(subtotal / dias_computables)
      : round2(segmentosConMonto[0]?.valorDiarioCalc || 0);

  const usaProporcional = segmentosConMonto.length > 1;

  return {
    dias_computables,
    subtotal,
    valorDiarioCalc,
    segmentos: segmentosConMonto,
    usaProporcional,
  };
}

/**
 * Valor diario ya ponderado por el % de la fila (misma convención que
 * `plantilla_viaticos.pdf`: el campo `valor_diario` no es el oficial 86000/92000).
 * Un solo porcentaje: `días × valor_oficial × (porcentaje/100)`.
 */
export function valorDiarioPdfPonderado(segmento, porcentaje = 100) {
  const already = Number(segmento?.valorDiarioCalc);
  if (Number.isFinite(already)) return already;
  const base = Number(segmento?.montoBase);
  const rawPct = porcentaje === 0 || porcentaje ? porcentaje : 100;
  const pct = parseFloat(String(rawPct).replace("%", "")) / 100;
  const safePct = Number.isFinite(pct) ? pct : 1;
  const safeBase = Number.isFinite(base) ? base : 0;
  return round2(safeBase * safePct);
}

/** Primera franja (vieja) vs última (nueva) para el PDF de dos líneas. */
export function splitSegmentosPdfFranjas(segmentos) {
  const ordered = [...(Array.isArray(segmentos) ? segmentos : [])]
    .filter((s) => Number(s.montoBase) > 0 && Number(s.dias) > 0)
    .sort((a, b) => String(a.fechaDesde).localeCompare(String(b.fechaDesde)));
  if (ordered.length < 2) return null;
  const vieja = ordered[0];
  const nueva = ordered[ordered.length - 1];
  const diasTotal = round2(
    ordered.reduce((acc, s) => acc + (Number(s.dias) || 0), 0),
  );
  return { vieja, nueva, diasTotal };
}

export function fmtDiasPdf(dias) {
  const n = Number(dias);
  if (!Number.isFinite(n)) return "0";
  return Number.isInteger(n) ? String(n) : String(n).replace(".", ",");
}

export function formatSegmentosValorDiario(segmentos, fmtMoney) {
  if (!Array.isArray(segmentos) || segmentos.length === 0) return "";
  return segmentos
    .map(
      (s) =>
        `${fmtDiasLabel(s.dias)} × ${fmtMoney(s.valorDiarioCalc)}`,
    )
    .join(" + ");
}

/** Segmentos con monto y días, en orden de fecha (lo que ve la pantalla y el PDF dual). */
export function segmentosParaVista(segmentos) {
  return [...(Array.isArray(segmentos) ? segmentos : [])]
    .filter((s) => Number(s.montoBase) > 0 && Number(s.dias) > 0)
    .sort((a, b) => String(a.fechaDesde).localeCompare(String(b.fechaDesde)));
}

export function tituloSegmentoRango(index, total) {
  if (total <= 1) return "Valor diario";
  if (index === 0) return "Rango anterior";
  if (index === total - 1) return "Rango vigente";
  return `Rango ${index + 1}`;
}

export function fechasSegmentoRango(segmento) {
  const desde = formatFechaViaticos(segmento?.fechaDesde);
  const hasta = formatFechaViaticos(segmento?.fechaHasta);
  if (!segmento?.fechaDesde) return "";
  if (
    !segmento?.fechaHasta ||
    segmento.fechaDesde === segmento.fechaHasta
  ) {
    return desde === "—" ? "" : desde;
  }
  if (desde === "—" || hasta === "—") return "";
  return `${desde}–${hasta}`;
}

export function formatSegmentosMontoBase(segmentos, fmtMoney) {
  if (!Array.isArray(segmentos) || segmentos.length === 0) return "";
  return segmentos
    .filter((s) => s.montoBase > 0)
    .map((s) => `${fmtDiasLabel(s.dias)} × ${fmtMoney(s.montoBase)}`)
    .join(" + ");
}

export function formatSegmentosProrrateoHelp(segmentos, fmtMoney = fmtMoneyArs) {
  if (!Array.isArray(segmentos) || segmentos.length === 0) return "";
  return segmentos
    .filter((s) => s.montoBase > 0 && s.dias > 0)
    .map((s) => {
      const rango =
        s.fechaDesde && s.fechaHasta && s.fechaDesde !== s.fechaHasta
          ? `${formatFechaViaticos(s.fechaDesde)}–${formatFechaViaticos(s.fechaHasta)}`
          : formatFechaViaticos(s.fechaDesde || s.fechaHasta);
      const rangoTxt = rango && rango !== "—" ? ` (${rango})` : "";
      return `${fmtDiasLabel(s.dias)} × ${fmtMoney(s.montoBase)}${rangoTxt}`;
    })
    .join(" + ");
}

/**
 * Franjas que aplican (con arrastre de huecos) entre fechaInicio y fechaFin.
 * La primera fecha visible es max(desde, inicio de ventana) para el chip de la gira.
 */
export function getVigenciasEnVentana(fechaInicio, fechaFin, vigencias = []) {
  const start = toIsoDay(fechaInicio);
  const end = toIsoDay(fechaFin || fechaInicio);
  if (!start) return [];

  const seen = [];
  let cursor = start;
  let lastId = null;
  let guard = 0;
  while (cursor && cursor <= end && guard < 400) {
    const row = findVigenciaParaFecha(cursor, vigencias);
    if (row && row.id !== lastId) {
      const desde = toIsoDay(row.vigencia_desde);
      seen.push({
        ...row,
        fechaVisible: !desde || desde < start ? start : desde,
      });
      lastId = row.id;
    }
    cursor = addDaysIso(cursor, 1);
    guard += 1;
  }
  return seen;
}

export const MSG_VALOR_DIARIO_REQUIERE_FECHAS =
  "Ingresá primero la fecha de salida y de llegada para determinar el valor diario según el historial.";

export function tieneFechasViatico(fechaSalida, fechaLlegada) {
  return Boolean(
    String(fechaSalida || "").trim() && String(fechaLlegada || "").trim(),
  );
}

/** Resuelve el valor diario base únicamente desde el historial de vigencias. */
export function resolverValorDiarioBaseHistorial({
  fechaSalida,
  horaSalida,
  fechaLlegada,
  horaLlegada,
  vigencias = [],
}) {
  if (!tieneFechasViatico(fechaSalida, fechaLlegada)) {
    return {
      estado: "pendiente",
      mensaje: MSG_VALOR_DIARIO_REQUIERE_FECHAS,
      valorDiarioBase: 0,
      segmentos: [],
    };
  }

  const fin = calcValorDiarioProporcional({
    fechaSalida,
    horaSalida,
    fechaLlegada,
    horaLlegada,
    vigencias,
    fallbackBase: 0,
    porcentaje: 100,
    factorTemporada: 0,
  });

  if (fin.dias_computables <= 0) {
    return {
      estado: "pendiente",
      mensaje: MSG_VALOR_DIARIO_REQUIERE_FECHAS,
      valorDiarioBase: 0,
      segmentos: [],
    };
  }

  const segmentosConMonto = fin.segmentos.filter((s) => s.montoBase > 0);
  if (segmentosConMonto.length === 0) {
    return {
      estado: "sin_vigencia",
      mensaje: "No hay vigencia registrada en el historial para esas fechas.",
      valorDiarioBase: 0,
      segmentos: [],
    };
  }

  if (fin.usaProporcional) {
    return {
      estado: "prorrateo",
      valorDiarioBase: null,
      segmentos: segmentosConMonto,
    };
  }

  return {
    estado: "unico",
    valorDiarioBase: segmentosConMonto[0].montoBase,
    segmentos: segmentosConMonto,
  };
}
