import {
  explainViaticosDiasCalculation,
} from "./viaticosDiasComputables";

const round2 = (num) => Math.round((num + Number.EPSILON) * 100) / 100;

function addDaysIso(isoDate, delta) {
  const [y, m, d] = String(isoDate).split("-").map(Number);
  const dt = new Date(y, m - 1, d + delta);
  const ym = String(dt.getFullYear());
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${ym}-${mm}-${dd}`;
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
  if (!fecha) {
    const fb = Number(fallbackBase);
    return Number.isFinite(fb) && fb > 0 ? fb : 0;
  }

  const list = Array.isArray(vigencias) ? vigencias : [];
  for (const v of list) {
    const desde = v.vigencia_desde;
    const hasta = v.vigencia_hasta;
    if (fecha >= desde && (!hasta || fecha <= hasta)) {
      const monto = Number(v.monto);
      if (Number.isFinite(monto) && monto > 0) return monto;
    }
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

/**
 * Calcula subtotal y valor diario efectivo prorrateando por vigencias cuando el viaje cruza un corte.
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

  const diasPorMonto = new Map();
  for (const { fecha, dias } of pieces) {
    const montoBase = getMontoVigenteParaFecha(fecha, vigencias, fallbackBase);
    diasPorMonto.set(montoBase, (diasPorMonto.get(montoBase) || 0) + dias);
  }

  const segmentos = [];
  let subtotal = 0;

  for (const [montoBase, dias] of diasPorMonto) {
    const valorDiarioTramo = round2(montoBase * pct * (1 + factor));
    const subtotalTramo = round2(dias * valorDiarioTramo);
    subtotal += subtotalTramo;
    segmentos.push({
      montoBase,
      dias: round2(dias),
      valorDiarioCalc: valorDiarioTramo,
      subtotalTramo,
    });
  }

  subtotal = round2(subtotal);
  segmentos.sort((a, b) => b.montoBase - a.montoBase);

  const valorDiarioCalc =
    dias_computables > 0
      ? round2(subtotal / dias_computables)
      : round2(segmentos[0]?.valorDiarioCalc || 0);

  const usaProporcional = segmentos.length > 1;

  return {
    dias_computables,
    subtotal,
    valorDiarioCalc,
    segmentos,
    usaProporcional,
  };
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

export function formatSegmentosMontoBase(segmentos, fmtMoney) {
  if (!Array.isArray(segmentos) || segmentos.length === 0) return "";
  return segmentos
    .filter((s) => s.montoBase > 0)
    .map((s) => `${fmtDiasLabel(s.dias)} × ${fmtMoney(s.montoBase)}`)
    .join(" + ");
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
