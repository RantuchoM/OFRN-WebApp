import {
  addDays,
  differenceInCalendarDays,
  format,
  parseISO,
  startOfDay,
} from "date-fns";
import { normalize } from "./giraUtils";
import {
  formatDateDDMM,
  formatTramoTitle,
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

export function getLogisticsDates(log) {
  let dateIn = null;
  let dateOut = null;

  if (log?.checkin) {
    let dStr;
    let tStr;
    if (typeof log.checkin === "object") {
      dStr = log.checkin.fecha || log.checkin.date;
      tStr =
        log.checkin.hora_inicio ||
        log.checkin.hora ||
        log.checkin.time ||
        log.checkin_time ||
        "14:00";
    } else {
      dStr = log.checkin;
      tStr = log.checkin_time || "14:00";
    }
    if (dStr) {
      const safeTime = (tStr || "14:00").slice(0, 5);
      dateIn = new Date(`${dStr}T${safeTime}`);
    }
  }

  if (log?.checkout) {
    let dStr;
    let tStr;
    if (typeof log.checkout === "object") {
      dStr = log.checkout.fecha || log.checkout.date;
      tStr =
        log.checkout.hora_inicio ||
        log.checkout.hora ||
        log.checkout.time ||
        log.checkout_time ||
        "10:00";
    } else {
      dStr = log.checkout;
      tStr = log.checkout_time || "10:00";
    }
    if (dStr) {
      const safeTime = (tStr || "10:00").slice(0, 5);
      dateOut = new Date(`${dStr}T${safeTime}`);
    }
  }

  return { dateIn, dateOut };
}

export function getDatesFromBooking(booking) {
  if (!booking?.fecha_checkin || !booking?.fecha_checkout) {
    return { dateIn: null, dateOut: null };
  }
  const inTime = (booking.hora_checkin || "14:00").slice(0, 5);
  const outTime = (booking.hora_checkout || "10:00").slice(0, 5);
  return {
    dateIn: new Date(`${booking.fecha_checkin}T${inTime}`),
    dateOut: new Date(`${booking.fecha_checkout}T${outTime}`),
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

/** Fechas de estadía para pedido: booking → tramo (+ transiciones) → logística. */
export function getStayDatesForTramo(booking, segmentRow, segmentSpec, log) {
  const fromBooking = getDatesFromBooking(booking);
  if (fromBooking.dateIn && fromBooking.dateOut) {
    return { ...fromBooking, source: "booking" };
  }

  if (segmentRow?.fecha_desde && segmentRow?.fecha_hasta) {
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
      source: "segment",
    };
  }

  const { dateIn, dateOut } = getLogisticsDates(log);
  return { dateIn, dateOut, source: "logistics" };
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

function isAssignedToSegmentRoom(personId, room) {
  return getRoomOccupantIds(room).has(Number(personId));
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
  const clippedIn = firstIdx === 0 ? dIn : addDays(startOfDay(dIn), firstIdx);

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
      !nightBelongsToTramo(fecha, segments, tramoIndice, segmentRow)
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
  }
  return fromRoster;
}

function addPersonToDateGroups({
  person,
  dIn,
  dOut,
  dateGroups,
  segments,
  tramoIndice,
  segmentRow,
  isPersonInPlus,
  formatD,
  formatT,
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

    if (!dateGroups[key]) {
      dateGroups[key] = {
        rangeLabel: key,
        checkIn: clippedIn,
        checkOut: clippedOut,
        nights,
        baseCount: 0,
        baseStd: 0,
        basePlus: 0,
        baseM: 0,
        baseF: 0,
      };
    }

    const group = dateGroups[key];
    group.baseCount++;
    if (isPersonInPlus(person.id)) group.basePlus++;
    else group.baseStd++;
    if (person.genero === "F") group.baseF++;
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

  const isPersonInPlus = (personId) => {
    if (!rooms?.length) return false;
    return rooms.some((r) => {
      if (segmentBookingIds && !segmentBookingIds.has(r.id_hospedaje)) {
        return false;
      }
      if (r.tipo !== "Plus") return false;
      return isAssignedToSegmentRoom(personId, r);
    });
  };

  const dateGroups = {};
  const formatD = (d) => formatDateDDMM(d);
  const formatT = (d) =>
    d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });

  const segmentRooms = getSegmentRooms(rooms, segmentBookingIds);
  const assignedBookingByPerson = new Map();

  segmentRooms.forEach((room) => {
    const booking = bookingById.get(room.id_hospedaje);
    getRoomOccupantIds(room).forEach((personId) => {
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
      isPersonInPlus,
      formatD,
      formatT,
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
      const extraStd = (adj.std_m || 0) + (adj.std_f || 0);
      const extraPlus = (adj.plus_m || 0) + (adj.plus_f || 0);
      const stdPax = group.baseStd + extraStd;
      const plusPax = group.basePlus + extraPlus;
      const totalRowPax = stdPax + plusPax;
      const stdNights = stdPax * group.nights;
      const plusNights = plusPax * group.nights;
      const totalRowNights = totalRowPax * group.nights;
      const totalF = group.baseF + (adj.std_f || 0) + (adj.plus_f || 0);
      const totalM = group.baseM + (adj.std_m || 0) + (adj.plus_m || 0);
      const suggestedRooms = computeSuggestedRooms(totalF, totalM, bedsPerRoom);

      return {
        group,
        stdPax,
        plusPax,
        totalRowPax,
        stdNights,
        plusNights,
        totalRowNights,
        suggestedRooms,
      };
    });

    return {
      segmentId: segRow?.id ?? null,
      title:
        segRow && hasTramos
          ? formatTramoTitle(idx, segRow.fecha_desde, segRow.fecha_hasta)
          : null,
      sortedGroups,
      computedRows,
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
