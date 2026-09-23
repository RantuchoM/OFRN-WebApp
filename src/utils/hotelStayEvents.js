/**
 * Early check-in / late check-out: tipos de agenda, horas canónicas,
 * media noche extra en hotel y validación de orden en reglas logísticas.
 *
 * Horas al generar desde reglas / EventForm vacío:
 * - Early check-in (40) → 14:00
 * - Late check-out (41) → 10:00
 *
 * Check-in/Out habituales OFRN (22/23) suelen ser 12:00 en logística.
 * Si al editar un Check-in la hora es < 14:00, se pregunta si es early;
 * si un Check-Out es > 10:00, se pregunta si es late.
 */

import { toInstantKey, sliceTime, mealSlotToInstant } from "./giraTramos";
import {
  MEAL_SERVICE_ORDER,
  canonicalizeMealSlotService,
  resolveRuleMealSlot,
} from "./mealLogistics";

export const TIPO_EVENTO_CHECKIN = 22;
export const TIPO_EVENTO_CHECKOUT = 23;
export const TIPO_EVENTO_EARLY_CHECKIN = 40;
export const TIPO_EVENTO_LATE_CHECKOUT = 41;

export const HORA_EARLY_CHECKIN = "14:00";
export const HORA_LATE_CHECKOUT = "10:00";
export const HORA_CHECKIN_HABITUAL = "14:00";
export const HORA_CHECKOUT_HABITUAL = "10:00";
export const HORA_LOGISTICA_DEFAULT = "12:00";

export const LABEL_EARLY_CHECKIN = "Early check-in";
export const LABEL_LATE_CHECKOUT = "Late check-out";
export const LABEL_CHECKIN = "Check-In";
export const LABEL_CHECKOUT = "Check-Out";

export const HALF_NIGHT_EXTRA = 0.5;

const STAY_TIPO_IDS = new Set([
  TIPO_EVENTO_CHECKIN,
  TIPO_EVENTO_CHECKOUT,
  TIPO_EVENTO_EARLY_CHECKIN,
  TIPO_EVENTO_LATE_CHECKOUT,
]);

export function isStayTipoEvento(tipoId) {
  const id = Number(tipoId);
  return STAY_TIPO_IDS.has(id);
}

export function isEarlyCheckInTipo(tipoId) {
  return Number(tipoId) === TIPO_EVENTO_EARLY_CHECKIN;
}

export function isLateCheckOutTipo(tipoId) {
  return Number(tipoId) === TIPO_EVENTO_LATE_CHECKOUT;
}

export function defaultHoraForStayTipo(tipoId) {
  const id = Number(tipoId);
  if (id === TIPO_EVENTO_EARLY_CHECKIN) return HORA_EARLY_CHECKIN;
  if (id === TIPO_EVENTO_LATE_CHECKOUT) return HORA_LATE_CHECKOUT;
  if (id === TIPO_EVENTO_CHECKIN || id === TIPO_EVENTO_CHECKOUT) {
    return HORA_LOGISTICA_DEFAULT;
  }
  return null;
}

export function horaInicioForStayTipo(tipoId) {
  const h = defaultHoraForStayTipo(tipoId);
  return h ? `${h}:00` : "12:00:00";
}

function timeToMinutes(hora) {
  const s = sliceTime(hora);
  if (!s || !/^\d{1,2}:\d{2}/.test(s)) return null;
  const [hh, mm] = s.split(":").map(Number);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
  return hh * 60 + mm;
}

export function isHoraEmpty(hora) {
  const s = sliceTime(hora);
  return !s;
}

/**
 * ¿Aplicar hora canónica al elegir el tipo en un alta?
 * Vacío, 12:00 de logística, o el mapeo invertido (10 en CI / 14 en CO).
 */
export function shouldApplyStayHoraDefault(tipoId, currentHora) {
  const canonical = defaultHoraForStayTipo(tipoId);
  if (!canonical) return false;
  const current = sliceTime(currentHora);
  if (!current) return true;
  if (current === canonical) return false;
  if (current === HORA_LOGISTICA_DEFAULT) return true;
  if (isEarlyCheckInTipo(tipoId) && current === "10:00") return true;
  if (isLateCheckOutTipo(tipoId) && current === "14:00") return true;
  return false;
}

/**
 * Fusiona el snapshot de EventForm (Sí/No del prompt) con el state del padre.
 */
export function resolveEventFormSaveData(state, snapshot) {
  if (!snapshot || typeof snapshot !== "object" || snapshot.nativeEvent) {
    return state || {};
  }
  return { ...(state || {}), ...snapshot };
}

export const STAY_SIDES = {
  checkin: {
    side: "checkin",
    primaryField: "checkin",
    extraField: "checkin_early",
    primaryCol: "id_evento_checkin",
    extraCol: "id_evento_checkin_early",
    normalTipo: TIPO_EVENTO_CHECKIN,
    extraTipo: TIPO_EVENTO_EARLY_CHECKIN,
    extraLabel: LABEL_EARLY_CHECKIN,
    extraShort: "Early",
    extraTitle: "Early check-in (+0,5 noche)",
  },
  checkout: {
    side: "checkout",
    primaryField: "checkout",
    extraField: "checkout_late",
    primaryCol: "id_evento_checkout",
    extraCol: "id_evento_checkout_late",
    normalTipo: TIPO_EVENTO_CHECKOUT,
    extraTipo: TIPO_EVENTO_LATE_CHECKOUT,
    extraLabel: LABEL_LATE_CHECKOUT,
    extraShort: "Late",
    extraTitle: "Late check-out (+0,5 noche)",
  },
};

export function staySideFromField(field) {
  const raw = String(field || "");
  const key = raw.startsWith("id_evento_")
    ? raw.slice("id_evento_".length)
    : raw;
  if (key === "checkin" || key === "checkin_early") return "checkin";
  if (key === "checkout" || key === "checkout_late") return "checkout";
  return null;
}

export function staySideConfig(fieldOrSide) {
  if (!fieldOrSide) return null;
  if (STAY_SIDES[fieldOrSide]) return STAY_SIDES[fieldOrSide];
  const side = staySideFromField(fieldOrSide);
  return side ? STAY_SIDES[side] : null;
}

export function isStayExtraTipo(tipoId) {
  const id = Number(tipoId);
  return (
    id === TIPO_EVENTO_EARLY_CHECKIN || id === TIPO_EVENTO_LATE_CHECKOUT
  );
}

export function extraOnFromTipo(side, tipoId) {
  const cfg = staySideConfig(side);
  if (!cfg) return false;
  return Number(tipoId) === cfg.extraTipo;
}

export function stayTipoForExtra(side, extraOn) {
  const cfg = staySideConfig(side);
  if (!cfg) return null;
  return extraOn ? cfg.extraTipo : cfg.normalTipo;
}

export function ruleStayDisplayEventId(rule, side) {
  const cfg = staySideConfig(side);
  if (!cfg || !rule) return null;
  return rule[cfg.primaryCol] || rule[cfg.extraCol] || null;
}

export function ruleHasStayExtra(rule, side) {
  const cfg = staySideConfig(side);
  if (!cfg || !rule) return false;
  const v = rule[cfg.extraCol];
  return v != null && v !== "";
}

/** Tilde on: same event in CI/CO habitual + FK extra (0,5 noche). Off: solo habitual. */
export function stayFkPatch(side, extraOn, eventId) {
  const cfg = staySideConfig(side);
  if (!cfg) return {};
  if (eventId == null || eventId === "") {
    return { [cfg.primaryCol]: null, [cfg.extraCol]: null };
  }
  if (extraOn) {
    return { [cfg.primaryCol]: eventId, [cfg.extraCol]: eventId };
  }
  return { [cfg.primaryCol]: eventId, [cfg.extraCol]: null };
}

export function staySideForRuleEvent(rule, eventId) {
  if (!rule || eventId == null || eventId === "") return null;
  const id = String(eventId);
  for (const side of ["checkin", "checkout"]) {
    const cfg = STAY_SIDES[side];
    if (
      String(rule[cfg.primaryCol] || "") === id ||
      String(rule[cfg.extraCol] || "") === id
    ) {
      return side;
    }
  }
  return null;
}

/**
 * Si confirman early/late desde check-in/out, vincular la FK
 * que suma 0,5 noche (y al revés si eligen No).
 */
export function stayRuleFieldForTipo(field, tipoId) {
  const cfg = staySideConfig(field);
  if (!cfg) {
    const raw = String(field || "");
    return raw.startsWith("id_evento_") ? raw.slice("id_evento_".length) : raw;
  }
  return extraOnFromTipo(cfg.side, tipoId) ? cfg.extraField : cfg.primaryField;
}

/**
 * Prompt al guardar Check-in < 14:00 o Check-Out > 10:00.
 * @returns {{ kind: 'early'|'late', title: string, message: string, yesTipoId: number } | null}
 */
export function stayHourCategoryPrompt(tipoId, hora) {
  const id = Number(tipoId);
  const minutes = timeToMinutes(hora);
  if (minutes == null) return null;

  const habitualIn = timeToMinutes(HORA_CHECKIN_HABITUAL);
  const habitualOut = timeToMinutes(HORA_CHECKOUT_HABITUAL);

  if (id === TIPO_EVENTO_CHECKIN && minutes < habitualIn) {
    return {
      kind: "early",
      title: "¿Es early check-in?",
      message:
        "La hora es anterior a las 14:00 (check-in habitual). Si confirmás, el evento pasa a Early check-in y suma media noche extra en el reporte de hotel.",
      yesTipoId: TIPO_EVENTO_EARLY_CHECKIN,
    };
  }
  if (id === TIPO_EVENTO_CHECKOUT && minutes > habitualOut) {
    return {
      kind: "late",
      title: "¿Es late check-out?",
      message:
        "La hora es posterior a las 10:00 (check-out habitual). Si confirmás, el evento pasa a Late check-out y suma media noche extra en el reporte de hotel.",
      yesTipoId: TIPO_EVENTO_LATE_CHECKOUT,
    };
  }
  return null;
}

function hitHasStayExtra(hit) {
  if (!hit || typeof hit !== "object") return false;
  return Boolean(
    hit.date || hit.fecha || hit.id_evento || hit.isLinked === true,
  );
}

export function logisticsHasEarlyCheckIn(log) {
  return hitHasStayExtra(log?.checkin_early);
}

export function logisticsHasLateCheckOut(log) {
  return hitHasStayExtra(log?.checkout_late);
}

/** 0, 0.5 o 1.0 según early / late vinculados en la logística de la persona. */
export function extraHotelNightsFromLogistics(log) {
  if (!log) return 0;
  let extra = 0;
  if (logisticsHasEarlyCheckIn(log)) extra += HALF_NIGHT_EXTRA;
  if (logisticsHasLateCheckOut(log)) extra += HALF_NIGHT_EXTRA;
  return extra;
}

export function formatHotelNights(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "—";
  return v.toLocaleString("es-AR", {
    minimumFractionDigits: v % 1 === 0 ? 0 : 1,
    maximumFractionDigits: 1,
  });
}

const STAY_IN_FIELDS = [
  { event: "id_evento_checkin", label: "check-in" },
  { event: "id_evento_checkin_early", label: "early check-in" },
];
const STAY_OUT_FIELDS = [
  { event: "id_evento_checkout", label: "check-out" },
  { event: "id_evento_checkout_late", label: "late check-out" },
];

function eventInstantKey(allEvents, eventId) {
  if (eventId == null || eventId === "") return null;
  const ev = (allEvents || []).find(
    (e) => String(e.id) === String(eventId),
  );
  if (!ev?.fecha) return null;
  return toInstantKey(ev.fecha, ev.hora_inicio || ev.hora || "12:00");
}

/**
 * Check-in (o early) posterior al check-out (o late) en la misma regla.
 * @returns {string[]}
 */
export function validateLogisticsRuleStayOrder(rule, allEvents = []) {
  if (!rule) return [];
  const ins = STAY_IN_FIELDS.map((f) => ({
    ...f,
    key: eventInstantKey(allEvents, rule[f.event]),
  })).filter((x) => x.key);
  const outs = STAY_OUT_FIELDS.map((f) => ({
    ...f,
    key: eventInstantKey(allEvents, rule[f.event]),
  })).filter((x) => x.key);
  if (!ins.length || !outs.length) return [];

  const errors = [];
  for (const inn of ins) {
    for (const out of outs) {
      if (inn.key > out.key) {
        errors.push(
          `El ${inn.label} no puede ser posterior al ${out.label}.`,
        );
      }
    }
  }
  return errors;
}

function mealSlotKey(fecha, servicio, fallbackServicio) {
  if (!fecha) return null;
  const svc =
    canonicalizeMealSlotService(servicio) ||
    fallbackServicio ||
    "Almuerzo";
  const instant = mealSlotToInstant(fecha, svc);
  return toInstantKey(instant.fecha, instant.hora);
}

/** Comida inicial posterior a la final. */
export function validateLogisticsRuleMealOrder(rule) {
  if (!rule) return [];
  const start = resolveRuleMealSlot(rule, "inicio");
  const end = resolveRuleMealSlot(rule, "fin");
  if (!start?.fecha || !end?.fecha) return [];
  const a = mealSlotKey(start.fecha, start.servicio, "Desayuno");
  const b = mealSlotKey(end.fecha, end.servicio, "Cena");
  if (a && b && a > b) {
    return [
      "La comida inicial no puede ser posterior a la comida final.",
    ];
  }
  if (
    start.fecha === end.fecha &&
    start.servicio &&
    end.servicio &&
    (MEAL_SERVICE_ORDER[start.servicio] ?? 0) >
      (MEAL_SERVICE_ORDER[end.servicio] ?? 0)
  ) {
    return [
      "La comida inicial no puede ser posterior a la comida final.",
    ];
  }
  return [];
}

export function validateLogisticsRule(rule, allEvents = []) {
  return [
    ...validateLogisticsRuleStayOrder(rule, allEvents),
    ...validateLogisticsRuleMealOrder(rule),
  ];
}

export function ruleEventColumn(field) {
  if (!field) return null;
  return String(field).startsWith("id_evento_")
    ? field
    : `id_evento_${field}`;
}

export const STAY_EVENT_FOOTNOTE =
  "Early check-in y late check-out suman 0,5 noche cada uno (se acumulan). Las noches de calendario siguen siendo check-out − check-in.";
