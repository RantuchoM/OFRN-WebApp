/**
 * Plantilla semanal de ensayos → proyección feb–dic + conflictos con giras.
 * Paridad informe ensambles (valor ≥2h→1, >30min→0,5).
 */

export const PROYECCION_WEEK_START = "2027-02-01";
export const PROYECCION_WEEK_END = "2027-12-13";

export const DOW_LABEL = {
  1: "lunes",
  2: "martes",
  3: "miércoles",
  4: "jueves",
  5: "viernes",
  6: "sábado",
  7: "domingo",
};

/** Abreviatura corta (informes densos). */
export const DOW_LABEL_SHORT = {
  1: "lun",
  2: "mar",
  3: "mié",
  4: "jue",
  5: "vie",
  6: "sáb",
  7: "dom",
};

export function ensayoServicioValue(horaInicio, horaFin) {
  if (!horaInicio || !horaFin) return 0;
  const [h1, m1] = String(horaInicio).slice(0, 5).split(":").map(Number);
  const [h2, m2] = String(horaFin).slice(0, 5).split(":").map(Number);
  const secs = (h2 * 60 + m2 - (h1 * 60 + m1)) * 60;
  if (secs <= 1800) return 0;
  if (secs < 7200) return 0.5;
  return 1;
}

export function addDaysIso(iso, n) {
  const d = new Date(`${String(iso).slice(0, 10)}T12:00:00`);
  d.setDate(d.getDate() + Number(n || 0));
  return d.toISOString().slice(0, 10);
}

export function listMondays(fromIso, toIso) {
  const out = [];
  let cur = String(fromIso).slice(0, 10);
  const end = String(toIso).slice(0, 10);
  while (cur <= end) {
    out.push(cur);
    cur = addDaysIso(cur, 7);
  }
  return out;
}

export function dateForDow(mondayIso, isoDow) {
  return addDaysIso(mondayIso, Number(isoDow) - 1);
}

function overlapsGira(program, dayIso) {
  const a = String(program.fecha_desde || "").slice(0, 10);
  const b = String(program.fecha_hasta || program.fecha_desde || "").slice(
    0,
    10,
  );
  if (!a) return false;
  return dayIso >= a && dayIso <= (b || a);
}

/**
 * Normaliza fila DB / UI a slot de plantilla.
 */
export function normalizeEnsayoSlot(row) {
  if (!row) return null;
  const hora_inicio = String(row.hora_inicio || "").slice(0, 5);
  const hora_fin = String(row.hora_fin || "").slice(0, 5);
  const value =
    row.value != null
      ? Number(row.value)
      : ensayoServicioValue(hora_inicio, hora_fin);
  return {
    id: row.id != null ? Number(row.id) : null,
    id_ensamble: Number(row.id_ensamble),
    isoDow: Number(row.iso_dow ?? row.isoDow),
    hora_inicio,
    hora_fin,
    id_locacion:
      row.id_locacion != null && row.id_locacion !== ""
        ? Number(row.id_locacion)
        : null,
    locacion:
      row.locaciones?.nombre ||
      row.locacion ||
      row.locacion_nombre ||
      null,
    titulo: row.titulo || null,
    activo: row.activo !== false,
    value,
  };
}

/** Map id_ensamble → slots[] (solo activos). */
export function groupSlotsByEnsambleId(rows) {
  const map = new Map();
  for (const raw of rows || []) {
    const slot = normalizeEnsayoSlot(raw);
    if (!slot || !slot.activo || !slot.isoDow) continue;
    if (!map.has(slot.id_ensamble)) map.set(slot.id_ensamble, []);
    map.get(slot.id_ensamble).push(slot);
  }
  for (const list of map.values()) {
    list.sort(
      (a, b) =>
        a.isoDow - b.isoDow ||
        String(a.hora_inicio).localeCompare(String(b.hora_inicio)),
    );
  }
  return map;
}

/**
 * @param {object} opts
 * @param {object[]} opts.slots plantilla del ensamble
 * @param {object[]} opts.programs giras Sinf/CF (con fecha_desde/hasta)
 * @param {(program) => boolean} opts.isConvocado
 * @param {string} [opts.weekStart]
 * @param {string} [opts.weekEnd]
 * @param {string} [opts.dayFrom] clip inferior (default weekStart)
 * @param {string} [opts.dayTo] clip superior (default 2027-12-19 como informe)
 */
export function projectEnsayosNetos({
  slots,
  programs = [],
  isConvocado,
  weekStart = PROYECCION_WEEK_START,
  weekEnd = PROYECCION_WEEK_END,
  dayFrom = "2027-02-01",
  dayTo = "2027-12-19",
} = {}) {
  const tpl = (slots || []).filter((s) => s && s.activo !== false);
  const mondays = listMondays(weekStart, weekEnd);
  let ensayosTotal = 0;
  let ensayosServiciosBrutos = 0;
  let ensayosConflicto = 0;
  let ensayosServiciosConflicto = 0;
  const conflictos = [];

  for (const monday of mondays) {
    for (const slot of tpl) {
      const day = dateForDow(monday, slot.isoDow);
      if (day < dayFrom || day > dayTo) continue;
      const value =
        slot.value != null
          ? Number(slot.value)
          : ensayoServicioValue(slot.hora_inicio, slot.hora_fin);
      if (!value) continue;
      ensayosTotal += 1;
      ensayosServiciosBrutos += value;

      const conflicting = (programs || []).filter(
        (p) =>
          overlapsGira(p, day) &&
          (typeof isConvocado === "function" ? isConvocado(p) : true),
      );
      if (conflicting.length) {
        ensayosConflicto += 1;
        ensayosServiciosConflicto += value;
        conflictos.push({
          fecha: day,
          hora: `${slot.hora_inicio}-${slot.hora_fin}`,
          servicio: value,
          locacion: slot.locacion || null,
          giras: conflicting
            .map((p) => p.nombre_gira || `Gira ${p.id}`)
            .join(" · "),
        });
      }
    }
  }

  const brutos = Math.round(ensayosServiciosBrutos * 100) / 100;
  const conflictoServ = Math.round(ensayosServiciosConflicto * 100) / 100;
  const netos = Math.round(Math.max(0, brutos - conflictoServ) * 100) / 100;

  return {
    ensayosSemanaModelo: tpl.length,
    semanasProyectadas: mondays.length,
    ensayosTotal,
    ensayosConflicto,
    ensayosServiciosBrutos: brutos,
    ensayosServiciosConflicto: conflictoServ,
    ensayosNetos: netos,
    prestNetas: netos,
    templateSlots: tpl.map(
      (s) =>
        `${DOW_LABEL[s.isoDow] || s.isoDow} ${s.hora_inicio}-${s.hora_fin}${
          s.locacion ? ` @ ${s.locacion}` : ""
        } → ${s.value ?? ensayoServicioValue(s.hora_inicio, s.hora_fin)}`,
    ),
    conflictos,
  };
}
