import {
  addDays,
  differenceInCalendarDays,
  format,
  parseISO,
  startOfDay,
} from "date-fns";
import { es } from "date-fns/locale";
import { normalize } from "./giraUtils";
import {
  formatDateDDMM,
  formatTramoLabel,
  getTramoLocalidadIds,
  isLocalInPedidoTramo,
  nightBelongsToTramo,
  sliceTime,
} from "./giraTramos";

export const DEFAULT_ADJ = { std_m: 0, std_f: 0, plus_m: 0, plus_f: 0 };

export const DEFAULT_BEDS_PER_ROOM = 2;

export const INITIAL_ORDER_BEDS_PER_ROOM_OPTIONS = [
  { value: 0, label: "Sin habs", title: "Sin habitaciones sugeridas" },
  { value: 1, label: "1", title: "Base individual (1 cama por hab.)" },
  { value: 2, label: "2", title: "Base doble (2 camas por hab.)" },
  { value: 3, label: "3", title: "Base triple (3 camas por hab.)" },
  { value: 4, label: "4", title: "Base cuádruple (4 camas por hab.)" },
];

/** Habitaciones sugeridas por género (F con F, M con M), según camas por habitación. */
export function computeSuggestedRooms(totalF, totalM, bedsPerRoom = DEFAULT_BEDS_PER_ROOM) {
  const cap = Number(bedsPerRoom);
  if (!cap || cap <= 0 || !Number.isFinite(cap)) return 0;
  const f = Math.max(0, Number(totalF) || 0);
  const m = Math.max(0, Number(totalM) || 0);
  return Math.ceil(f / cap) + Math.ceil(m / cap);
}

export function showSuggestedRooms(bedsPerRoom) {
  return Number(bedsPerRoom) > 0;
}

export function getSuggestedRoomsLabel(bedsPerRoom = DEFAULT_BEDS_PER_ROOM) {
  const cap = Number(bedsPerRoom);
  if (!cap || cap <= 0) return null;
  if (cap === 1) return "Habs Sugeridas (SGL)";
  if (cap === 2) return "Habs Sugeridas (DOBLE)";
  if (cap === 3) return "Habs Sugeridas (TRIPLE)";
  if (cap === 4) return "Habs Sugeridas (CUÁDR.)";
  return `Habs Sugeridas (×${cap})`;
}

/** Extrae fecha/hora de un hito de logística (string, evento enriquecido u objeto legacy). */
function parseLogisticsMilestone(raw, siblingTime, defaultTime) {
  if (raw == null || raw === "") return { date: null };

  let dStr = null;
  let tStr = null;

  if (typeof raw === "string") {
    dStr = raw;
    tStr = siblingTime || defaultTime;
  } else if (typeof raw === "object") {
    // useLogistics inicializa checkin/checkout como `{}` (truthy sin fecha).
    dStr = raw.fecha || raw.date || null;
    if (!dStr) return { date: null };
    tStr =
      raw.hora_inicio ||
      raw.hora ||
      raw.time ||
      siblingTime ||
      defaultTime;
  } else {
    return { date: null };
  }

  const day = String(dStr).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return { date: null };
  const safeTime = String(tStr || defaultTime).slice(0, 5);
  const parsed = new Date(`${day}T${safeTime}`);
  if (Number.isNaN(parsed.getTime())) return { date: null };
  return { date: parsed };
}

export function getLogisticsDates(log) {
  const checkin = parseLogisticsMilestone(
    log?.checkin,
    log?.checkin_time,
    "14:00",
  );
  const checkout = parseLogisticsMilestone(
    log?.checkout,
    log?.checkout_time,
    "10:00",
  );
  return { dateIn: checkin.date, dateOut: checkout.date };
}

export function getDatesFromBooking(booking) {
  const inDay = booking?.fecha_checkin
    ? String(booking.fecha_checkin).slice(0, 10)
    : null;
  const outDay = booking?.fecha_checkout
    ? String(booking.fecha_checkout).slice(0, 10)
    : null;
  const inTime = (booking?.hora_checkin || "14:00").slice(0, 5);
  const outTime = (booking?.hora_checkout || "10:00").slice(0, 5);

  const dateIn =
    inDay && /^\d{4}-\d{2}-\d{2}$/.test(inDay)
      ? new Date(`${inDay}T${inTime}`)
      : null;
  const dateOut =
    outDay && /^\d{4}-\d{2}-\d{2}$/.test(outDay)
      ? new Date(`${outDay}T${outTime}`)
      : null;

  return {
    dateIn: dateIn && !Number.isNaN(dateIn.getTime()) ? dateIn : null,
    dateOut: dateOut && !Number.isNaN(dateOut.getTime()) ? dateOut : null,
  };
}

export function bookingBelongsToSegment(
  booking,
  segRow,
  segmentRows = [],
  defaultSegmentId = null,
) {
  if (!booking || !segRow) return false;
  const knownIds = new Set(segmentRows.map((s) => Number(s.id)));
  const segId = booking.id_segmento ?? defaultSegmentId;
  if (Number(segId) === Number(segRow.id)) return true;

  const linked = segmentRows.find((s) => Number(s.id) === Number(segId));
  if (linked != null && Number(linked.indice) === Number(segRow.indice)) {
    return true;
  }

  // Legacy / id obsoleto tras recrear segmentos al agregar cortes → tramo 0.
  if (
    Number(segRow.indice) === 0 &&
    (booking.id_segmento == null ||
      !knownIds.has(Number(booking.id_segmento)))
  ) {
    return true;
  }

  return false;
}

export function resolveSegmentBookingIds(
  bookings,
  segRow,
  segmentRows,
  defaultSegmentId,
) {
  if (!segRow) return null;
  return new Set(
    (bookings || [])
      .filter((b) =>
        bookingBelongsToSegment(b, segRow, segmentRows, defaultSegmentId),
      )
      .map((b) => b.id),
  );
}

function resolveSegmentSpec(segments, segmentRow, tramoIndice = null) {
  if (!segments?.length) return null;
  if (segmentRow?.indice != null) {
    const byRow = segments.find(
      (s) => Number(s.indice) === Number(segmentRow.indice),
    );
    if (byRow) return byRow;
  }
  if (tramoIndice != null && !Number.isNaN(Number(tramoIndice))) {
    const idx = Number(tramoIndice);
    return (
      segments.find((s) => Number(s.indice) === idx) ?? segments[idx] ?? null
    );
  }
  return null;
}

function bumpDateIso(isoDate, days = 1) {
  const d = parseISO(String(isoDate).slice(0, 10));
  if (Number.isNaN(d.getTime())) return isoDate;
  return format(addDays(d, days), "yyyy-MM-dd");
}

/** Fechas del tramo (+ cortes de transición). Usado como fallback del pedido. */
function getDatesFromSegment(booking, segmentRow, segmentSpec) {
  if (!segmentRow?.fecha_desde || !segmentRow?.fecha_hasta) {
    return { dateIn: null, dateOut: null };
  }

  let inDate = String(segmentRow.fecha_desde).slice(0, 10);
  let outDate = String(segmentRow.fecha_hasta).slice(0, 10);
  let inTime = sliceTime(booking?.hora_checkin) || "14:00";
  let outTime = sliceTime(booking?.hora_checkout) || "10:00";

  const corteIn = segmentSpec?.corte_entrada;
  const corteOut = segmentSpec?.corte_salida;
  const isLastSegment = segmentSpec != null && !corteOut;

  if (corteIn && Number(segmentSpec.indice) > 0) {
    inDate = String(corteIn.fecha_checkin || corteIn.fecha || inDate).slice(
      0,
      10,
    );
    inTime = sliceTime(corteIn.hora_checkin) || inTime;
  }
  if (corteOut) {
    outDate = String(
      corteOut.fecha_checkout || corteOut.fecha || outDate,
    ).slice(0, 10);
    outTime = sliceTime(corteOut.hora_checkout) || outTime;
  } else if (isLastSegment && outDate === inDate) {
    // Último tramo con mismo día in/out en el calendario del segmento
    outDate = bumpDateIso(inDate, 1);
  }

  if (outDate <= inDate) {
    outDate = bumpDateIso(inDate, 1);
  }

  return {
    dateIn: new Date(`${inDate}T${inTime}`),
    dateOut: new Date(`${outDate}T${outTime}`),
  };
}

/**
 * Fechas de estadía para pedido.
 * Prioridad por lado (in/out), alineada con RoomingReport:
 * logística personal → booking del hotel → tramo (+ cortes).
 * Así check-in/out individuales (llegada anticipada, salida distinta) no se
 * pisan con el bloque del hospedaje cuando hay tramos o habitación asignada.
 */
export function getStayDatesForTramo(booking, segmentRow, segmentSpec, log) {
  const fromLog = getLogisticsDates(log);
  const fromBooking = getDatesFromBooking(booking);
  const fromSegment = getDatesFromSegment(booking, segmentRow, segmentSpec);

  const dateIn =
    fromLog.dateIn || fromBooking.dateIn || fromSegment.dateIn || null;
  const dateOut =
    fromLog.dateOut || fromBooking.dateOut || fromSegment.dateOut || null;

  let source = "none";
  if (fromLog.dateIn && fromLog.dateOut) source = "logistics";
  else if (
    !fromLog.dateIn &&
    !fromLog.dateOut &&
    fromBooking.dateIn &&
    fromBooking.dateOut
  ) {
    source = "booking";
  } else if (
    !fromLog.dateIn &&
    !fromLog.dateOut &&
    !fromBooking.dateIn &&
    !fromBooking.dateOut &&
    fromSegment.dateIn &&
    fromSegment.dateOut
  ) {
    source = "segment";
  } else if (dateIn && dateOut) {
    source = "mixed";
  }

  return { dateIn, dateOut, source };
}

function getRoomOccupantIds(room) {
  const ids = new Set();
  (room.occupants || []).forEach((o) => {
    if (o?.id != null && o.ocupa_cama !== false) ids.add(Number(o.id));
  });
  const cfg = Array.isArray(room.asignaciones_config)
    ? room.asignaciones_config
    : [];
  cfg.forEach((c) => {
    if (c?.id != null && c.ocupa_cama !== false) ids.add(Number(c.id));
  });
  (room.id_integrantes_asignados || []).forEach((id) => ids.add(Number(id)));
  return ids;
}

/** Todos los asignados a la habitación, incluidas cunas (para fechas de estadía). */
function getAllRoomPersonIds(room) {
  const ids = new Set();
  (room.occupants || []).forEach((o) => {
    if (o?.id != null) ids.add(Number(o.id));
  });
  const cfg = Array.isArray(room.asignaciones_config)
    ? room.asignaciones_config
    : [];
  cfg.forEach((c) => {
    if (c?.id != null) ids.add(Number(c.id));
  });
  (room.id_integrantes_asignados || []).forEach((id) => ids.add(Number(id)));
  return ids;
}

function isAssignedToSegmentRoom(personId, room) {
  return getRoomOccupantIds(room).has(Number(personId));
}

/** Bebé / menor en cuna: no suma pax ni noches pagas. */
function isPersonInCunaForPedido(personId, segmentRooms, person) {
  if (person?.en_cuna === true || person?.ocupa_cama === false) return true;
  for (const room of segmentRooms || []) {
    const cfg = Array.isArray(room.asignaciones_config)
      ? room.asignaciones_config.find(
          (c) => c?.id != null && String(c.id) === String(personId),
        )
      : null;
    if (cfg) return cfg.ocupa_cama === false;
    const occ = (room.occupants || []).find(
      (o) => o?.id != null && String(o.id) === String(personId),
    );
    if (occ && occ.ocupa_cama === false) return true;
  }
  return false;
}

function personCunaLabel(person) {
  const name = [person?.apellido, person?.nombre].filter(Boolean).join(", ");
  return name || (person?.id != null ? `ID ${person.id}` : "Cuna");
}

function getSegmentRooms(rooms, segmentBookingIds) {
  return (rooms || []).filter(
    (r) => !segmentBookingIds || segmentBookingIds.has(r.id_hospedaje),
  );
}

export function findPersonBookingInSegment(
  personId,
  rooms = [],
  bookings = [],
  segmentBookingIds,
) {
  const bookingById = new Map((bookings || []).map((b) => [b.id, b]));
  for (const room of rooms || []) {
    if (segmentBookingIds && !segmentBookingIds.has(room.id_hospedaje)) {
      continue;
    }
    if (!isAssignedToSegmentRoom(personId, room)) continue;
    const booking = bookingById.get(room.id_hospedaje);
    if (booking) return booking;
  }
  return null;
}

export function makeAdjustmentKey(segmentId, rangeLabel) {
  if (segmentId == null) return rangeLabel;
  return `${segmentId}::${rangeLabel}`;
}

export function getAdjustmentForRange(adjustments, segmentId, rangeLabel) {
  if (!adjustments) return { ...DEFAULT_ADJ };
  const key = makeAdjustmentKey(segmentId, rangeLabel);
  return adjustments[key] ?? adjustments[rangeLabel] ?? { ...DEFAULT_ADJ };
}

function groupConsecutiveNights(nights) {
  if (!nights.length) return [];
  const groups = [];
  let current = [nights[0]];
  for (let i = 1; i < nights.length; i++) {
    if (nights[i].index === nights[i - 1].index + 1) {
      current.push(nights[i]);
    } else {
      groups.push(current);
      current = [nights[i]];
    }
  }
  groups.push(current);
  return groups;
}

function buildClippedRange(dIn, dOut, nightGroup, totalNights) {
  const firstIdx = nightGroup[0].index;
  const lastIdx = nightGroup[nightGroup.length - 1].index;

  let clippedIn;
  if (firstIdx === 0) {
    clippedIn = dIn;
  } else {
    const firstNightStart = addDays(startOfDay(dIn), firstIdx);
    if (dIn < firstNightStart) {
      clippedIn = dIn;
    } else {
      const checkInTime = format(dIn, "HH:mm:ss").slice(0, 5);
      clippedIn = new Date(
        `${format(firstNightStart, "yyyy-MM-dd")}T${checkInTime}`,
      );
    }
  }

  let clippedOut;
  if (lastIdx === totalNights - 1) {
    clippedOut = dOut;
  } else {
    const morningAfter = addDays(startOfDay(dIn), lastIdx + 1);
    const outTime = format(dOut, "HH:mm:ss").slice(0, 5);
    clippedOut = new Date(`${format(morningAfter, "yyyy-MM-dd")}T${outTime}`);
  }

  return {
    clippedIn,
    clippedOut,
    nights: nightGroup.length,
  };
}

/**
 * Noche del día de check-in cuando la llegada es anterior al inicio oficial del tramo.
 * Cuenta en el pedido de ese tramo aunque `nightBelongsToTramo` la excluya por instante 20:00.
 */
function isEarlyCheckInNight(dIn, fecha, segments, tramoIndice, segmentRow) {
  if (!dIn || !fecha || tramoIndice == null || Number.isNaN(Number(tramoIndice))) {
    return false;
  }

  const checkInDay = format(startOfDay(dIn), "yyyy-MM-dd");
  const day = String(fecha).slice(0, 10);
  if (day !== checkInDay) return false;

  const dInInstant = `${checkInDay}T${format(dIn, "HH:mm:ss").slice(0, 5)}`;
  const idx = Number(tramoIndice);
  const spec = segments?.find((s) => Number(s.indice) === idx);

  if (spec?.instant_desde) {
    return dInInstant.localeCompare(spec.instant_desde) < 0;
  }

  const desde =
    (segmentRow?.fecha_desde
      ? String(segmentRow.fecha_desde).slice(0, 10)
      : null) ??
    (spec?.fecha_desde ? String(spec.fecha_desde).slice(0, 10) : null);
  return desde ? day < desde : false;
}

/**
 * Noches posteriores al fin oficial del tramo/gira cuando el check-out personal
 * es más tarde (p. ej. gira hasta 22/08 y check-out 24/08). Se imputan al
 * último tramo; sin eso el pedido recorta el check-out al día siguiente del
 * fin oficial (23) y pierde la noche previa a la salida real.
 */
function isLateCheckOutNight(dOut, fecha, segments, tramoIndice, segmentRow) {
  if (
    !dOut ||
    !fecha ||
    tramoIndice == null ||
    Number.isNaN(Number(tramoIndice))
  ) {
    return false;
  }

  const checkoutDay = format(startOfDay(dOut), "yyyy-MM-dd");
  const day = String(fecha).slice(0, 10);
  if (day >= checkoutDay) return false;

  const idx = Number(tramoIndice);
  const isLast = !segments?.length || idx === segments.length - 1;
  // Solo el último tramo absorbe la extensión de salida tardía.
  if (segments?.length > 1 && !isLast) return false;

  const spec = segments?.find((s) => Number(s.indice) === idx);
  const dOutInstant = `${checkoutDay}T${format(dOut, "HH:mm:ss").slice(0, 5)}`;

  if (spec?.instant_hasta) {
    if (dOutInstant.localeCompare(spec.instant_hasta) <= 0) return false;
    const nightInstant = `${day}T20:00`;
    return nightInstant.localeCompare(spec.instant_hasta) > 0;
  }

  const hasta =
    (segmentRow?.fecha_hasta
      ? String(segmentRow.fecha_hasta).slice(0, 10)
      : null) ??
    (spec?.fecha_hasta ? String(spec.fecha_hasta).slice(0, 10) : null);

  // Sin cota de tramo: nightBelongsToTramo suele devolver false; incluir la
  // estadía completa hasta el check-out personal.
  if (!hasta) return true;

  if (checkoutDay <= hasta) return false;
  return day > hasta;
}

function collectEligibleNights(
  dIn,
  dOut,
  segments,
  tramoIndice,
  segmentRow,
) {
  const totalNights = differenceInCalendarDays(dOut, dIn);
  if (totalNights <= 0) return [];

  const nights = [];
  for (let i = 0; i < totalNights; i++) {
    const nightStart = addDays(startOfDay(dIn), i);
    const fecha = format(nightStart, "yyyy-MM-dd");

    if (
      tramoIndice != null &&
      !nightBelongsToTramo(fecha, segments, tramoIndice, segmentRow) &&
      !isEarlyCheckInNight(dIn, fecha, segments, tramoIndice, segmentRow) &&
      !isLateCheckOutNight(dOut, fecha, segments, tramoIndice, segmentRow)
    ) {
      continue;
    }

    nights.push({ index: i, nightStart, fecha });
  }
  return nights;
}

function resolvePersonForPedido(personId, rosterById, segmentRooms) {
  const fromRoster = rosterById.get(Number(personId));
  for (const room of segmentRooms) {
    const occ = (room.occupants || []).find(
      (o) => Number(o.id) === Number(personId),
    );
    if (occ) return { ...fromRoster, ...occ };
    const cfg = Array.isArray(room.asignaciones_config)
      ? room.asignaciones_config.find(
          (c) => c?.id != null && Number(c.id) === Number(personId),
        )
      : null;
    if (cfg) {
      return {
        ...fromRoster,
        ocupa_cama: cfg.ocupa_cama !== false,
        en_cuna: cfg.ocupa_cama === false,
      };
    }
  }
  return fromRoster;
}

function ensureDateGroup(dateGroups, key, clippedIn, clippedOut, nights) {
  if (!dateGroups[key]) {
    dateGroups[key] = {
      rangeLabel: key,
      checkIn: clippedIn,
      checkOut: clippedOut,
      nights,
      baseCount: 0,
      baseStd: 0,
      basePlus: 0,
      /** Plus en habitación no matrimonial (single / twin). */
      basePlusSingle: 0,
      /** Plus en habitación matrimonial. */
      basePlusMatri: 0,
      baseM: 0,
      baseF: 0,
      baseStdM: 0,
      baseStdF: 0,
      basePlusSingleM: 0,
      basePlusSingleF: 0,
      basePlusMatriM: 0,
      basePlusMatriF: 0,
      cunas: [],
    };
  }
  if (!Array.isArray(dateGroups[key].cunas)) dateGroups[key].cunas = [];
  if (dateGroups[key].basePlusSingle == null) dateGroups[key].basePlusSingle = 0;
  if (dateGroups[key].basePlusMatri == null) dateGroups[key].basePlusMatri = 0;
  if (dateGroups[key].baseStdM == null) dateGroups[key].baseStdM = 0;
  if (dateGroups[key].baseStdF == null) dateGroups[key].baseStdF = 0;
  if (dateGroups[key].basePlusSingleM == null) dateGroups[key].basePlusSingleM = 0;
  if (dateGroups[key].basePlusSingleF == null) dateGroups[key].basePlusSingleF = 0;
  if (dateGroups[key].basePlusMatriM == null) dateGroups[key].basePlusMatriM = 0;
  if (dateGroups[key].basePlusMatriF == null) dateGroups[key].basePlusMatriF = 0;
  return dateGroups[key];
}

function addPersonToDateGroups({
  person,
  dIn,
  dOut,
  dateGroups,
  segments,
  tramoIndice,
  segmentRow,
  getPlusRoomForPerson,
  formatD,
  formatT,
  asCuna = false,
}) {
  if (!dIn || !dOut || isNaN(dIn.getTime()) || isNaN(dOut.getTime())) return;

  const totalNights = differenceInCalendarDays(dOut, dIn);
  if (totalNights <= 0) return;

  const eligibleNights = collectEligibleNights(
    dIn,
    dOut,
    segments,
    tramoIndice,
    segmentRow,
  );
  if (!eligibleNights.length) return;

  groupConsecutiveNights(eligibleNights).forEach((nightGroup) => {
    const { clippedIn, clippedOut, nights } = buildClippedRange(
      dIn,
      dOut,
      nightGroup,
      totalNights,
    );
    if (nights <= 0) return;

    const key = `${formatD(clippedIn)} ${formatT(clippedIn)} - ${formatD(clippedOut)} ${formatT(clippedOut)}`;
    const group = ensureDateGroup(
      dateGroups,
      key,
      clippedIn,
      clippedOut,
      nights,
    );

    // Cuna: informar fechas/nombre; no suma pax ni noches pagas.
    if (asCuna) {
      const pid = Number(person.id);
      if (!group.cunas.some((c) => Number(c.id) === pid)) {
        group.cunas.push({
          id: person.id,
          apellido: person.apellido || "",
          nombre: person.nombre || "",
          label: personCunaLabel(person),
          checkIn: clippedIn,
          checkOut: clippedOut,
          nights,
        });
      }
      return;
    }

    group.baseCount++;
    const isF = person.genero === "F";
    const plusRoom = getPlusRoomForPerson?.(person.id) || null;
    if (plusRoom) {
      group.basePlus++;
      if (plusRoom.es_matrimonial) {
        group.basePlusMatri++;
        if (isF) group.basePlusMatriF++;
        else group.basePlusMatriM++;
      } else {
        group.basePlusSingle++;
        if (isF) group.basePlusSingleF++;
        else group.basePlusSingleM++;
      }
    } else {
      group.baseStd++;
      if (isF) group.baseStdF++;
      else group.baseStdM++;
    }
    if (isF) group.baseF++;
    else group.baseM++;
  });
}

/** Grupos de fechas para pedido inicial, opcionalmente acotados a un tramo. */
export function buildInitialDateGroups({
  roster,
  logisticsMap,
  segments,
  segmentRow,
  segmentRows = [],
  rooms,
  bookings = [],
  segmentBookingIds,
  defaultSegmentId = null,
  tramoIndice = null,
  excludedPersonIds = null,
}) {
  const rosterById = new Map(
    (roster || []).map((p) => [Number(p.id), p]),
  );
  const bookingById = new Map((bookings || []).map((b) => [b.id, b]));
  const resolvedIndice =
    tramoIndice != null
      ? Number(tramoIndice)
      : segmentRow?.indice != null
        ? Number(segmentRow.indice)
        : null;
  const segmentSpec = resolveSegmentSpec(segments, segmentRow, resolvedIndice);
  const tramoLocalidadIds = getTramoLocalidadIds(
    segmentRow,
    segmentSpec,
    segmentRows,
    resolvedIndice,
  );

  const getPlusRoomForPerson = (personId) => {
    if (!rooms?.length) return null;
    return (
      rooms.find((r) => {
        if (segmentBookingIds && !segmentBookingIds.has(r.id_hospedaje)) {
          return false;
        }
        if (r.tipo !== "Plus") return false;
        return isAssignedToSegmentRoom(personId, r);
      }) || null
    );
  };

  const dateGroups = {};
  const formatD = (d) => formatDateDDMM(d);
  const formatT = (d) =>
    d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });

  const segmentRooms = getSegmentRooms(rooms, segmentBookingIds);
  const assignedBookingByPerson = new Map();

  segmentRooms.forEach((room) => {
    const booking = bookingById.get(room.id_hospedaje);
    getAllRoomPersonIds(room).forEach((personId) => {
      if (!assignedBookingByPerson.has(personId)) {
        assignedBookingByPerson.set(personId, booking);
      }
    });
  });

  roster.forEach((person) => {
    const personId = Number(person.id);
    const est = normalize(person.estado_gira || person.estado);
    if (est === "ausente" || est === "baja") return;
    if (excludedPersonIds?.has(personId)) return;

    const enriched = resolvePersonForPedido(
      personId,
      rosterById,
      segmentRooms,
    );
    if (!enriched) return;

    if (
      isLocalInPedidoTramo(
        enriched,
        segmentSpec,
        tramoLocalidadIds,
        segmentRow,
        segments,
        segmentRows,
        resolvedIndice,
      )
    ) {
      return;
    }

    const asCuna = isPersonInCunaForPedido(personId, segmentRooms, enriched);

    const log = logisticsMap[person.id] ?? logisticsMap[personId];
    const assignedBooking = assignedBookingByPerson.get(personId);
    let dIn;
    let dOut;

    ({ dateIn: dIn, dateOut: dOut } = getStayDatesForTramo(
      assignedBooking ?? null,
      segmentRow,
      segmentSpec,
      log,
    ));

    addPersonToDateGroups({
      person: enriched,
      dIn,
      dOut,
      dateGroups,
      segments,
      tramoIndice: resolvedIndice,
      segmentRow,
      getPlusRoomForPerson,
      formatD,
      formatT,
      asCuna,
    });
  });

  const sortedGroups = Object.values(dateGroups).sort(
    (a, b) => a.checkIn - b.checkIn,
  );

  return {
    groups: dateGroups,
    sortedKeys: sortedGroups.map((g) => g.rangeLabel),
    sortedGroups,
  };
}

export function buildInitialOrderSections({
  roster,
  logisticsMap,
  rooms = [],
  bookings = [],
  segmentRows = [],
  segments = [],
  cortesCount = 0,
  adjustmentsByRange = {},
  excludedPersonIds = null,
  bedsPerRoom = DEFAULT_BEDS_PER_ROOM,
}) {
  const defaultSegmentId = segmentRows[0]?.id ?? null;
  const excludedIds =
    excludedPersonIds instanceof Set
      ? excludedPersonIds
      : excludedPersonIds?.length
        ? new Set(excludedPersonIds.map(Number))
        : null;
  const hasTramos = cortesCount > 0 && segmentRows.length > 0;

  const buildSection = (segRow, idx) => {
    const tramoIndice = Number(
      segRow?.indice != null && !Number.isNaN(Number(segRow.indice))
        ? segRow.indice
        : idx,
    );
    const bookingIds = segRow
      ? resolveSegmentBookingIds(
          bookings,
          segRow,
          segmentRows,
          defaultSegmentId,
        )
      : null;
    const { sortedGroups } = buildInitialDateGroups({
      roster,
      logisticsMap,
      segments,
      segmentRow: segRow,
      segmentRows,
      rooms,
      bookings,
      segmentBookingIds: bookingIds,
      defaultSegmentId,
      tramoIndice,
      excludedPersonIds: excludedIds,
    });

    const computedRows = sortedGroups.map((group) => {
      const adj = getAdjustmentForRange(
        adjustmentsByRange,
        segRow?.id ?? null,
        group.rangeLabel,
      );
      const extraStdM = adj.std_m || 0;
      const extraStdF = adj.std_f || 0;
      const extraPlusM = adj.plus_m || 0;
      const extraPlusF = adj.plus_f || 0;
      const extraStd = extraStdM + extraStdF;
      const extraPlus = extraPlusM + extraPlusF;
      const stdPax = group.baseStd + extraStd;
      // Ajustes manuales Plus no tienen flag matrimonial → se tratan como single.
      const plusSinglePax = (group.basePlusSingle || 0) + extraPlus;
      const plusMatriPax = group.basePlusMatri || 0;
      const plusPax = plusSinglePax + plusMatriPax;
      const totalRowPax = stdPax + plusPax;
      const stdNights = stdPax * group.nights;
      const plusNights = plusPax * group.nights;
      const totalRowNights = totalRowPax * group.nights;
      const totalF = group.baseF + extraStdF + extraPlusF;
      const totalM = group.baseM + extraStdM + extraPlusM;
      const suggestedRooms = computeSuggestedRooms(totalF, totalM, bedsPerRoom);
      const cunas = Array.isArray(group.cunas) ? group.cunas : [];
      const cunaCount = cunas.length;

      return {
        group,
        stdPax,
        plusPax,
        plusSinglePax,
        plusMatriPax,
        stdM: (group.baseStdM || 0) + extraStdM,
        stdF: (group.baseStdF || 0) + extraStdF,
        // Ajustes Plus sin flag → single.
        plusSingleM: (group.basePlusSingleM || 0) + extraPlusM,
        plusSingleF: (group.basePlusSingleF || 0) + extraPlusF,
        plusMatriM: group.basePlusMatriM || 0,
        plusMatriF: group.basePlusMatriF || 0,
        totalM,
        totalF,
        totalRowPax,
        stdNights,
        plusNights,
        totalRowNights,
        suggestedRooms,
        cunas,
        cunaCount,
      };
    });

    const allCunas = computedRows.flatMap((row) => row.cunas);

    return {
      segmentId: segRow?.id ?? null,
      title: segRow && hasTramos ? formatTramoLabel(idx) : null,
      sortedGroups,
      computedRows,
      cunas: allCunas,
      totalCunas: allCunas.length,
      totalPax: computedRows.reduce((acc, row) => acc + row.totalRowPax, 0),
      totalBedNights: computedRows.reduce(
        (acc, row) => acc + row.totalRowNights,
        0,
      ),
      grandTotalStdNights: computedRows.reduce(
        (acc, row) => acc + row.stdNights,
        0,
      ),
      grandTotalPlusNights: computedRows.reduce(
        (acc, row) => acc + row.plusNights,
        0,
      ),
      totalStdPax: computedRows.reduce((acc, row) => acc + row.stdPax, 0),
      totalPlusPax: computedRows.reduce((acc, row) => acc + row.plusPax, 0),
      totalSuggestedRooms: computedRows.reduce(
        (acc, row) => acc + row.suggestedRooms,
        0,
      ),
    };
  };

  if (!hasTramos) {
    return [buildSection(null, 0)];
  }

  return segmentRows.map((segRow, idx) => buildSection(segRow, idx));
}

function pasajeroLabel(count) {
  return count === 1 ? "pasajero" : "pasajeros";
}

function genderWord(gender, count) {
  if (gender === "F") return count === 1 ? "mujer" : "mujeres";
  return count === 1 ? "hombre" : "hombres";
}

/** Línea de pedido con desglose por sexo en el mismo rango de fechas.
 * Ej: "7 hombres, 1 mujer. Check-in: …" / "3 hombres habitación superior (single). Check-in: …"
 */
function pushGenderedOrderLines(lines, countM, countF, categorySuffix, datePart) {
  if (!datePart) return;
  if (countM <= 0 && countF <= 0) return;

  const parts = [];
  if (countM > 0) parts.push(`${countM} ${genderWord("M", countM)}`);
  if (countF > 0) parts.push(`${countF} ${genderWord("F", countF)}`);
  const suffix = categorySuffix ? ` ${categorySuffix}` : "";
  lines.push(`${parts.join(", ")}${suffix}. ${datePart}`);
}

function formatCheckDate(date) {
  if (!date || Number.isNaN(date.getTime())) return "";
  const weekday = format(date, "EEEE", { locale: es }).toLowerCase();
  const day = date.getDate();
  const month = date.getMonth() + 1;
  return `${weekday}, ${day}/${month}`;
}

function formatStayRangeText(checkIn, checkOut) {
  const inD = formatCheckDate(checkIn);
  const outD = formatCheckDate(checkOut);
  if (!inD || !outD) return "";
  return `Check-in: ${inD} - check-out: ${outD}`;
}

function formatCunaDateTime(date) {
  if (!date || Number.isNaN(date.getTime())) return "";
  const d = formatDateDDMM(date);
  const t = format(date, "HH:mm");
  return `${d} ${t}`;
}

/** Línea de pedido para una cuna (no factura noche). */
function formatCunaOrderLine(cuna) {
  const inPart = formatCunaDateTime(cuna.checkIn);
  const outPart = formatCunaDateTime(cuna.checkOut);
  const name =
    [cuna.apellido, cuna.nombre].filter(Boolean).join(", ") ||
    cuna.label ||
    "Cuna";
  if (!inPart || !outPart) {
    return `1 cuna — ${name}`;
  }
  return `1 cuna. Check-in ${inPart} - Check-out ${outPart} — ${name}`;
}

function sumGenderFromRows(rows) {
  return (rows || []).reduce(
    (acc, row) => ({
      totalM: acc.totalM + (row.totalM || 0),
      totalF: acc.totalF + (row.totalF || 0),
    }),
    { totalM: 0, totalF: 0 },
  );
}

function sumSectionsForText(sections) {
  return (sections || []).reduce(
    (acc, section) => {
      const gender = sumGenderFromRows(section.computedRows);
      return {
        totalPax: acc.totalPax + (section.totalPax || 0),
        totalStdPax: acc.totalStdPax + (section.totalStdPax || 0),
        totalPlusPax: acc.totalPlusPax + (section.totalPlusPax || 0),
        totalM: acc.totalM + gender.totalM,
        totalF: acc.totalF + gender.totalF,
        totalBedNights: acc.totalBedNights + (section.totalBedNights || 0),
        grandTotalStdNights:
          acc.grandTotalStdNights + (section.grandTotalStdNights || 0),
        grandTotalPlusNights:
          acc.grandTotalPlusNights + (section.grandTotalPlusNights || 0),
        totalSuggestedRooms:
          acc.totalSuggestedRooms + (section.totalSuggestedRooms || 0),
        totalCunas: acc.totalCunas + (section.totalCunas || 0),
      };
    },
    {
      totalPax: 0,
      totalStdPax: 0,
      totalPlusPax: 0,
      totalM: 0,
      totalF: 0,
      totalBedNights: 0,
      grandTotalStdNights: 0,
      grandTotalPlusNights: 0,
      totalSuggestedRooms: 0,
      totalCunas: 0,
    },
  );
}

function appendTextSummaryBlock(lines, totals, { title, bedsPerRoom } = {}) {
  if (!totals?.totalPax && !totals?.totalCunas) return;

  lines.push("");
  if (title) lines.push(title);

  if (totals.totalPax > 0) {
    lines.push(`Total pasajeros: ${totals.totalPax}`);

    const genderParts = [];
    if (totals.totalM > 0) {
      genderParts.push(`${totals.totalM} ${genderWord("M", totals.totalM)}`);
    }
    if (totals.totalF > 0) {
      genderParts.push(`${totals.totalF} ${genderWord("F", totals.totalF)}`);
    }
    if (genderParts.length > 0) {
      lines.push(`Sexo: ${genderParts.join(" · ")}`);
    }

    const paxParts = [];
    if (totals.totalStdPax > 0) {
      paxParts.push(`${totals.totalStdPax} estándar`);
    }
    if (totals.totalPlusPax > 0) {
      paxParts.push(`${totals.totalPlusPax} superior`);
    }
    if (paxParts.length > 1) {
      lines.push(`Desglose: ${paxParts.join(" · ")}`);
    }

    lines.push(`Noches básicas (camas): ${totals.grandTotalStdNights}`);
    if (totals.grandTotalPlusNights > 0) {
      lines.push(`Noches superiores (camas): ${totals.grandTotalPlusNights}`);
    }
    lines.push(`Total camas noche: ${totals.totalBedNights}`);

    const roomsLabel = getSuggestedRoomsLabel(bedsPerRoom);
    if (roomsLabel && totals.totalSuggestedRooms > 0) {
      lines.push(`${roomsLabel}: ${totals.totalSuggestedRooms}`);
    }
  }

  if (totals.totalCunas > 0) {
    lines.push(
      `Total cunas (no facturan noche): ${totals.totalCunas}`,
    );
  }
}

/**
 * Texto plano para enviar a hotelería (mismo criterio de filas que el pedido tabular).
 * Ej: "7 hombres, 1 mujer. Check-in: jueves, 18/6 - check-out: sábado, 20/6"
 * Cunas: "1 cuna. Check-in DD/MM HH:MM - Check-out DD/MM HH:MM — Apellido, Nombre"
 */
export function buildInitialOrderTextSummary(
  sections = [],
  { bedsPerRoom = DEFAULT_BEDS_PER_ROOM } = {},
) {
  const lines = [];
  const showTramoHeaders = sections.length > 1;
  const superiorSingleLabel = "habitación superior (single)";
  const superiorMatriLabel = "habitación superior (matrimonial)";

  sections.forEach((section, sectionIdx) => {
    if (showTramoHeaders && section.title) {
      if (lines.length > 0) lines.push("");
      lines.push(section.title);
    }

    (section.computedRows || []).forEach((row) => {
      const {
        stdPax,
        plusPax,
        plusSinglePax,
        plusMatriPax,
        stdM,
        stdF,
        plusSingleM,
        plusSingleF,
        plusMatriM,
        plusMatriF,
        totalM,
        totalF,
        group,
        cunas,
      } = row;
      const datePart = formatStayRangeText(group?.checkIn, group?.checkOut);
      const rowCunas = Array.isArray(cunas)
        ? cunas
        : Array.isArray(group?.cunas)
          ? group.cunas
          : [];

      // Compat: filas viejas sin desglose single/matri → todo Plus como single.
      const singlePax =
        plusSinglePax != null
          ? plusSinglePax
          : Math.max(0, (plusPax || 0) - (plusMatriPax || 0));
      const matriPax = plusMatriPax || 0;

      const hasGenderSplit =
        stdM != null ||
        stdF != null ||
        plusSingleM != null ||
        plusSingleF != null ||
        totalM != null ||
        totalF != null;

      if (datePart && hasGenderSplit) {
        pushGenderedOrderLines(lines, stdM || 0, stdF || 0, "", datePart);
        pushGenderedOrderLines(
          lines,
          plusSingleM || 0,
          plusSingleF || 0,
          superiorSingleLabel,
          datePart,
        );
        pushGenderedOrderLines(
          lines,
          plusMatriM || 0,
          plusMatriF || 0,
          superiorMatriLabel,
          datePart,
        );
      } else if (datePart) {
        // Fallback legacy sin contadores por sexo.
        if (stdPax > 0) {
          lines.push(`${stdPax} ${pasajeroLabel(stdPax)}. ${datePart}`);
        }
        if (singlePax > 0) {
          lines.push(
            `${singlePax} ${pasajeroLabel(singlePax)} ${superiorSingleLabel}. ${datePart}`,
          );
        }
        if (matriPax > 0) {
          lines.push(
            `${matriPax} ${pasajeroLabel(matriPax)} ${superiorMatriLabel}. ${datePart}`,
          );
        }
      }

      rowCunas.forEach((cuna) => {
        lines.push(formatCunaOrderLine(cuna));
      });
    });

    if (
      showTramoHeaders &&
      (section.totalPax > 0 || section.totalCunas > 0)
    ) {
      const gender = sumGenderFromRows(section.computedRows);
      appendTextSummaryBlock(
        lines,
        { ...section, ...gender },
        {
          title: `Resumen · ${section.title ?? "Tramo"}`,
          bedsPerRoom,
        },
      );
    }

    if (
      showTramoHeaders &&
      section.title &&
      sectionIdx < sections.length - 1 &&
      (section.computedRows || []).length > 0
    ) {
      lines.push("");
    }
  });

  const grandTotals = sumSectionsForText(sections);
  if (grandTotals.totalPax > 0 || grandTotals.totalCunas > 0) {
    appendTextSummaryBlock(lines, grandTotals, {
      title: showTramoHeaders
        ? `Total general (${sections.length} tramos)`
        : "Resumen",
      bedsPerRoom,
    });
  }

  return lines.join("\n").trim();
}
