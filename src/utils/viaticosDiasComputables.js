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

/** Ida y vuelta el mismo día: según horas entre salida y llegada. */
export const REFERENCIA_DIAS_MISMO_DIA = [
  { condicion: "6 horas o más entre salida y llegada", dias: 1 },
  { condicion: "Menos de 6 horas", dias: 0.75 },
];

const MISMO_DIA_HORAS_COMPLETO = 6;

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

function parseTimeToMinutes(timeStr) {
  if (!timeStr) return null;
  const [h, m] = String(timeStr).split(":").map(Number);
  if (!Number.isFinite(h)) return null;
  return h * 60 + (Number.isFinite(m) ? m : 0);
}

function formatHorasMinutos(totalMinutes) {
  const mins = Math.max(0, Math.round(totalMinutes));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}

/** Va y viene el mismo día: ≥6 h → 1 día; si no → 0,75 día. */
export function getSameDayRoundTripFactor(horaSal, horaLleg) {
  const startMin = parseTimeToMinutes(horaSal);
  const endMin = parseTimeToMinutes(horaLleg);

  if (startMin == null || endMin == null) {
    return {
      value: 0.75,
      durationMinutes: null,
      rule:
        "Sin hora de salida o llegada → se asignan 0,75 día (ida y vuelta el mismo día).",
    };
  }

  let durationMinutes = endMin - startMin;
  if (durationMinutes < 0) {
    return {
      value: 0.75,
      durationMinutes: 0,
      rule: `La hora de llegada (${sliceTime(horaLleg)}) es anterior a la de salida (${sliceTime(horaSal)}) en el mismo día → 0,75 día.`,
    };
  }

  const durationHours = durationMinutes / 60;
  const duracionLabel = formatHorasMinutos(durationMinutes);

  if (durationHours >= MISMO_DIA_HORAS_COMPLETO) {
    return {
      value: 1,
      durationMinutes,
      rule: `Entre ${sliceTime(horaSal)} y ${sliceTime(horaLleg)} hay ${duracionLabel} (6 h o más) → 1 día.`,
    };
  }

  return {
    value: 0.75,
    durationMinutes,
    rule: `Entre ${sliceTime(horaSal)} y ${sliceTime(horaLleg)} hay ${duracionLabel} (menos de 6 h) → 0,75 día.`,
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
    const sameDay = getSameDayRoundTripFactor(horaSal, horaLleg);
    const fmtN = (n) =>
      Number.isInteger(n) ? String(n) : String(n).replace(".", ",");

    return {
      total: sameDay.value,
      incomplete: false,
      sameDay: true,
      sameDayDurationMinutes: sameDay.durationMinutes,
      fechaSalida: dSal,
      fechaLlegada: dLleg,
      horaSalida: horaSal,
      horaLlegada: horaLleg,
      message: null,
      steps: [
        {
          label: "Ida y vuelta el mismo día",
          detail: sameDay.rule,
        },
      ],
      formulaSummary: `${fmtN(sameDay.value)} día(s) (mismo día)`,
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
