/** Cálculo de días computables de viático (salida / llegada con fracciones por horario). */

/** Tablas de referencia (misma lógica que getDepartureFactor / getArrivalFactor). */
export const REFERENCIA_DIAS_SALIDA = [
  { desde: "00:00", hasta: "15:00", dias: 1 },
  { desde: "15:01", hasta: "21:00", dias: 0.75 },
  { desde: "21:01", hasta: "23:59", dias: 0 },
];

export const REFERENCIA_DIAS_LLEGADA = [
  { desde: "00:00", hasta: "03:00", dias: 0 },
  { desde: "03:01", hasta: "14:59", dias: 0.75 },
  { desde: "15:00", hasta: "23:59", dias: 1 },
];

const sliceTime = (timeStr) => {
  if (!timeStr) return null;
  return String(timeStr).slice(0, 5);
};

export const formatFechaViaticos = (isoDate) => {
  if (!isoDate) return "—";
  const [y, m, d] = String(isoDate).split("-");
  if (!d || !m) return isoDate;
  return `${d}/${m}/${y}`;
};

export function getDepartureFactor(timeStr) {
  if (!timeStr) return { value: 0, rule: "Sin hora de salida → 0 días por salida." };
  const [h, m] = String(timeStr).split(":").map(Number);
  const minutes = h * 60 + (m || 0);
  if (minutes <= 900) {
    return {
      value: 1.0,
      rule: `Salida ${sliceTime(timeStr)} (hasta las 15:00 inclusive) → 1 día completo.`,
    };
  }
  if (minutes <= 1260) {
    return {
      value: 0.75,
      rule: `Salida ${sliceTime(timeStr)} (entre 15:01 y 21:00) → 0,75 día.`,
    };
  }
  return {
    value: 0,
    rule: `Salida ${sliceTime(timeStr)} (después de las 21:00) → 0 días por salida.`,
  };
}

export function getArrivalFactor(timeStr) {
  if (!timeStr) return { value: 0, rule: "Sin hora de llegada → 0 días por llegada." };
  const [h, m] = String(timeStr).split(":").map(Number);
  const minutes = h * 60 + (m || 0);
  if (minutes <= 180) {
    return {
      value: 0,
      rule: `Llegada ${sliceTime(timeStr)} (hasta las 03:00 inclusive) → 0 días por llegada.`,
    };
  }
  if (minutes <= 899) {
    return {
      value: 0.75,
      rule: `Llegada ${sliceTime(timeStr)} (entre 03:01 y 14:59) → 0,75 día.`,
    };
  }
  return {
    value: 1.0,
    rule: `Llegada ${sliceTime(timeStr)} (desde las 15:00) → 1 día completo.`,
  };
}

export function calculateDaysDiff(dSal, hSal, dLleg, hLleg) {
  const explained = explainViaticosDiasCalculation(dSal, hSal, dLleg, hLleg);
  return explained.total;
}

export function explainViaticosDiasCalculation(dSal, hSal, dLleg, hLleg) {
  const horaSal = sliceTime(hSal) || "12:00";
  const horaLleg = sliceTime(hLleg) || "12:00";

  if (!dSal || !dLleg) {
    return {
      total: 0,
      incomplete: true,
      fechaSalida: dSal,
      fechaLlegada: dLleg,
      horaSalida: horaSal,
      horaLlegada: horaLleg,
      message:
        "No se pueden calcular días sin fecha de salida y fecha de llegada definidas.",
      steps: [],
      formulaSummary: null,
    };
  }

  const start = new Date(`${dSal}T00:00:00`);
  const end = new Date(`${dLleg}T00:00:00`);
  const diffTime = end.getTime() - start.getTime();
  const diffDays = Math.round(diffTime / (1000 * 3600 * 24));

  if (diffDays < 0) {
    return {
      total: 0,
      incomplete: true,
      fechaSalida: dSal,
      fechaLlegada: dLleg,
      horaSalida: horaSal,
      horaLlegada: horaLleg,
      message: "La fecha de llegada es anterior a la de salida.",
      steps: [],
      formulaSummary: null,
    };
  }

  if (diffDays === 0) {
    return {
      total: 0.5,
      incomplete: false,
      sameDay: true,
      fechaSalida: dSal,
      fechaLlegada: dLleg,
      horaSalida: horaSal,
      horaLlegada: horaLleg,
      message: null,
      steps: [
        {
          label: "Mismo día calendario",
          detail: `Salida y llegada el ${formatFechaViaticos(dSal)} → se asignan 0,5 días computables.`,
        },
      ],
      formulaSummary: "0,5 días (mismo día)",
    };
  }

  const middleDays = Math.max(0, diffDays - 1);
  const dep = getDepartureFactor(horaSal);
  const arr = getArrivalFactor(horaLleg);
  const total = middleDays + dep.value + arr.value;

  const steps = [
    {
      label: "Días intermedios",
      detail:
        middleDays === 0
          ? "No hay días completos entre salida y llegada → 0 días intermedios."
          : `Se suman ${middleDays} día(s) completo(s) entre el día de salida y el de llegada.`,
    },
    {
      label: "Factor por hora de salida",
      detail: dep.rule,
    },
    {
      label: "Factor por hora de llegada",
      detail: arr.rule,
    },
  ];

  const fmtN = (n) =>
    Number.isInteger(n) ? String(n) : String(n).replace(".", ",");

  const formulaSummary = `${fmtN(middleDays)} + ${fmtN(dep.value)} + ${fmtN(arr.value)} = ${fmtN(total)} días`;

  return {
    total,
    incomplete: false,
    sameDay: false,
    calendarDiff: diffDays,
    middleDays,
    departureFactor: dep.value,
    arrivalFactor: arr.value,
    fechaSalida: dSal,
    fechaLlegada: dLleg,
    horaSalida: horaSal,
    horaLlegada: horaLleg,
    message: null,
    steps,
    formulaSummary,
  };
}
