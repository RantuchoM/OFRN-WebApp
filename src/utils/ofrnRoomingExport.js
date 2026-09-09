/**
 * Export Excel del rooming OFRN (giras), agrupado / filtrado por hotel.
 * Paridad de contenido con `RoomingReport.jsx` (ocupantes confirmados, tipo hab., fechas).
 */

import { saveAs } from "file-saver";
import { differenceInCalendarDays } from "date-fns";
import { toast } from "sonner";
import { formatTramoTitle } from "./giraTramos";

async function loadExcelJS() {
  const { default: ExcelJS } = await import("exceljs");
  return ExcelJS;
}

function safeFilePart(s) {
  return String(s || "Rooming")
    .replace(/[^\w\-ÁÉÍÓÚáéíóúñÑüÜ. +]+/gi, "_")
    .replace(/\s+/g, "_")
    .slice(0, 80);
}

function stamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`;
}

function sheetName(raw, used = new Set()) {
  let base = String(raw || "Hotel")
    .replace(/[\\/*?:\[\]]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 31);
  if (!base) base = "Hotel";
  let name = base;
  let i = 2;
  while (used.has(name.toLowerCase())) {
    const suffix = ` (${i})`;
    name = `${base.slice(0, Math.max(1, 31 - suffix.length))}${suffix}`;
    i += 1;
  }
  used.add(name.toLowerCase());
  return name;
}

const formatDate = (d) =>
  d
    ? d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" })
    : "";
const formatTime = (d) =>
  d
    ? d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })
    : "";
const formatDOB = (isoString) =>
  isoString ? isoString.split("-").reverse().join("/") : "";

/** Misma resolución que roomingInitialOrder / RoomingReport. */
export function getLogisticsDates(log) {
  const parseMilestone = (raw, siblingTime, defaultTime) => {
    if (raw == null || raw === "") return null;
    let dStr = null;
    let tStr = null;
    if (typeof raw === "string") {
      dStr = raw;
      tStr = siblingTime || defaultTime;
    } else if (typeof raw === "object") {
      dStr = raw.fecha || raw.date || null;
      if (!dStr) return null;
      tStr =
        raw.hora_inicio ||
        raw.hora ||
        raw.time ||
        siblingTime ||
        defaultTime;
    } else {
      return null;
    }
    const day = String(dStr).slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
    const safeTime = String(tStr || defaultTime).slice(0, 5);
    const parsed = new Date(`${day}T${safeTime}`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  return {
    dateIn: parseMilestone(log?.checkin, log?.checkin_time, "14:00"),
    dateOut: parseMilestone(log?.checkout, log?.checkout_time, "10:00"),
  };
}

function getBookingSegmentBounds(bk, segmentRow) {
  let segIn = null;
  let segOut = null;
  if (bk?.fecha_checkin) {
    const t = (bk.hora_checkin || "14:00").slice(0, 5);
    segIn = new Date(`${bk.fecha_checkin}T${t}`);
  } else if (segmentRow?.fecha_desde) {
    segIn = new Date(`${segmentRow.fecha_desde}T14:00`);
  }
  if (bk?.fecha_checkout) {
    const t = (bk.hora_checkout || "10:00").slice(0, 5);
    segOut = new Date(`${bk.fecha_checkout}T${t}`);
  } else if (segmentRow?.fecha_hasta) {
    segOut = new Date(`${segmentRow.fecha_hasta}T10:00`);
  }
  return { segIn, segOut };
}

function clipDatesToSegment(dateIn, dateOut, bk, segmentRow) {
  const { segIn, segOut } = getBookingSegmentBounds(bk, segmentRow);
  if (!segIn && !segOut) return { dateIn, dateOut };
  let inClipped = dateIn;
  let outClipped = dateOut;
  if (segIn && dateIn && dateIn < segIn) inClipped = segIn;
  if (segOut && dateOut && dateOut > segOut) outClipped = segOut;
  if (segIn && !dateIn) inClipped = segIn;
  if (segOut && !dateOut) outClipped = segOut;
  return { dateIn: inClipped, dateOut: outClipped };
}

function processRoom(r, logisticsMap, bk, segmentRow) {
  const validOccupants = (r.occupants || []).filter(
    (occ) => occ.estado_gira === "confirmado",
  );

  const occupantsWithDates = validOccupants.map((occ) => {
    const log = logisticsMap[occ.id] || {};
    const { dateIn, dateOut } = getLogisticsDates(log);
    const clipped = clipDatesToSegment(dateIn, dateOut, bk, segmentRow);
    return {
      ...occ,
      dateIn: clipped.dateIn,
      dateOut: clipped.dateOut,
      ocupa_cama: occ.ocupa_cama !== false,
    };
  });

  occupantsWithDates.sort((a, b) => {
    if (!a.dateIn) return 1;
    if (!b.dateIn) return -1;
    return a.dateIn - b.dateIn;
  });

  const effectiveCheckIn =
    occupantsWithDates.length > 0 && occupantsWithDates[0].dateIn
      ? occupantsWithDates[0].dateIn
      : null;
  const sortedByOut = [...occupantsWithDates].sort((a, b) => {
    if (!a.dateOut) return 1;
    if (!b.dateOut) return -1;
    return b.dateOut - a.dateOut;
  });
  const effectiveCheckOut =
    sortedByOut.length > 0 && sortedByOut[0].dateOut
      ? sortedByOut[0].dateOut
      : null;

  const bedOccupants = occupantsWithDates.filter((o) => o.ocupa_cama !== false);
  const extraOccupants = occupantsWithDates.filter((o) => o.ocupa_cama === false);
  const count = bedOccupants.length;
  const capacityType =
    count === 1
      ? "Simple"
      : count === 2
        ? "Doble"
        : count === 3
          ? "Triple"
          : count === 4
            ? "Cuádruple"
            : count > 4
              ? "Múltiple"
              : "Vacía";
  const isPlus = r.tipo === "Plus";
  const isMatri = r.es_matrimonial;
  const hasCuna =
    r.con_cuna || (extraOccupants && extraOccupants.length > 0);

  return {
    ...r,
    occupants: occupantsWithDates,
    bedOccupants,
    extraOccupants,
    effectiveCheckIn,
    effectiveCheckOut,
    capacityType,
    isPlus,
    isMatri,
    hasCuna,
    typeMainCapital: `${capacityType} ${isPlus ? "Superior" : "Básico"}`,
    typeExtras: [isMatri && "Matrimonial", hasCuna && "Cuna"].filter(Boolean),
  };
}

/**
 * Hoteles con al menos una habitación (para el selector de export).
 */
export function listOfrnRoomingHotels(bookings = [], rooms = []) {
  return (bookings || [])
    .filter((bk) => (rooms || []).some((r) => r.id_hospedaje === bk.id))
    .map((bk) => ({
      bookingId: bk.id,
      hotelId: bk.id_hotel ?? bk.hoteles?.id ?? null,
      nombre: bk.hoteles?.nombre || "Hotel sin nombre",
      localidad: bk.hoteles?.localidades?.localidad || "",
      label: [
        bk.hoteles?.nombre || "Hotel sin nombre",
        bk.hoteles?.localidades?.localidad
          ? `(${bk.hoteles.localidades.localidad})`
          : null,
      ]
        .filter(Boolean)
        .join(" "),
    }));
}

/**
 * Secciones de reporte (tramo → hoteles) listas para UI / Excel / print.
 * @param {object} opts
 * @param {number|string|null} [opts.hotelBookingId] — si set, solo ese hospedaje
 */
export function buildOfrnRoomingSegmentSections({
  bookings = [],
  rooms = [],
  logisticsMap = {},
  segmentRows = [],
  segments = [],
  cortesCount = 0,
  hotelBookingId = null,
} = {}) {
  const defaultSegmentId = segmentRows[0]?.id ?? null;
  const bookingFilter =
    hotelBookingId == null || hotelBookingId === "" || hotelBookingId === "all"
      ? null
      : Number(hotelBookingId);

  const filterBookings = (list) => {
    const withRooms = (list || []).filter((bk) =>
      rooms.some((r) => r.id_hospedaje === bk.id),
    );
    if (bookingFilter == null) return withRooms;
    return withRooms.filter((b) => Number(b.id) === bookingFilter);
  };

  const hasTramos = cortesCount > 0 && segmentRows.length > 0;
  const rawSections = !hasTramos
    ? [
        {
          segmentRow: null,
          segmentSpec: null,
          indice: 0,
          bookings: filterBookings(bookings),
        },
      ]
    : segmentRows.map((segRow, idx) => ({
        segmentRow: segRow,
        segmentSpec: segments[idx] ?? null,
        indice: idx,
        bookings: filterBookings(
          bookings.filter((b) => {
            const segId = b.id_segmento ?? defaultSegmentId;
            return Number(segId) === Number(segRow.id);
          }),
        ),
      }));

  return rawSections
    .map((section) => {
      const tramoTitle = section.segmentRow
        ? formatTramoTitle(
            section.indice,
            section.segmentRow.fecha_desde,
            section.segmentRow.fecha_hasta,
          )
        : null;

      const hotels = section.bookings.map((bk) => {
        const hotelRooms = rooms
          .filter((r) => r.id_hospedaje === bk.id)
          .map((r) => processRoom(r, logisticsMap, bk, section.segmentRow));

        hotelRooms.sort((a, b) => {
          if (!a.effectiveCheckIn) return 1;
          if (!b.effectiveCheckIn) return -1;
          return a.effectiveCheckIn - b.effectiveCheckIn;
        });

        const { segIn, segOut } = getBookingSegmentBounds(bk, section.segmentRow);
        const stayLabel =
          segIn && segOut
            ? `${formatDate(segIn)} – ${formatDate(segOut)}`
            : null;

        return {
          bookingId: bk.id,
          hotelName: bk.hoteles?.nombre || "Hotel sin nombre",
          localidad: bk.hoteles?.localidades?.localidad || "",
          stayLabel,
          rooms: hotelRooms,
        };
      });

      return {
        ...section,
        tramoTitle,
        hotels: hotels.filter((h) => h.rooms.length > 0),
      };
    })
    .filter((section) => section.hotels.length > 0);
}

const HAB_COLS = [
  { header: "Tramo", key: "tramo", width: 22 },
  { header: "Hotel", key: "hotel", width: 26 },
  { header: "Localidad", key: "localidad", width: 16 },
  { header: "#", key: "num", width: 6 },
  { header: "Tipo habitación", key: "tipo", width: 22 },
  { header: "Extras", key: "extras", width: 16 },
  { header: "Notas", key: "notas", width: 24 },
  { header: "Ocupantes (IN → OUT)", key: "ocupantes", width: 56 },
  { header: "Check-in hab.", key: "checkin", width: 14 },
  { header: "Check-out hab.", key: "checkout", width: 14 },
];

const PLAZA_COLS = [
  { header: "Tramo", key: "tramo", width: 22 },
  { header: "Hotel", key: "hotel", width: 26 },
  { header: "Localidad", key: "localidad", width: 16 },
  { header: "# Hab", key: "num", width: 8 },
  { header: "Tipo habitación", key: "tipo", width: 22 },
  { header: "Extras", key: "extras", width: 16 },
  { header: "Apellido y Nombre", key: "ocupante", width: 28 },
  { header: "Sexo", key: "sexo", width: 8 },
  { header: "DNI", key: "dni", width: 12 },
  { header: "F. Nac", key: "fnac", width: 12 },
  { header: "Check-in", key: "checkin", width: 14 },
  { header: "Check-out", key: "checkout", width: 14 },
];

function buildRowsFromSections(sections) {
  const habitaciones = [];
  const plazas = [];

  for (const section of sections) {
    const tramo = section.tramoTitle || "";
    for (const hotel of section.hotels) {
      hotel.rooms.forEach((r, idx) => {
        const num = idx + 1;
        const extras = r.typeExtras.join(", ");
        const occLabel = (r.occupants || [])
          .map((o) => {
            const name = `${o.apellido || ""}, ${o.nombre || ""}`.replace(
              /^,\s*/,
              "",
            );
            const cuna = o.ocupa_cama === false ? " (Cuna)" : "";
            const inL = formatDate(o.dateIn);
            const outL = formatDate(o.dateOut);
            const range =
              inL || outL ? ` (${inL || "—"} → ${outL || "—"})` : "";
            return `${name}${cuna}${range}`;
          })
          .join("; ");

        habitaciones.push({
          tramo,
          hotel: hotel.hotelName,
          localidad: hotel.localidad,
          num,
          tipo: r.typeMainCapital,
          extras,
          notas: r.notas_internas || "",
          ocupantes: occLabel || "(sin asignar)",
          checkin: r.effectiveCheckIn
            ? `${formatDate(r.effectiveCheckIn)} ${formatTime(r.effectiveCheckIn)}`.trim()
            : "",
          checkout: r.effectiveCheckOut
            ? `${formatDate(r.effectiveCheckOut)} ${formatTime(r.effectiveCheckOut)}`.trim()
            : "",
        });

        if (!(r.occupants || []).length) {
          plazas.push({
            tramo,
            hotel: hotel.hotelName,
            localidad: hotel.localidad,
            num,
            tipo: r.typeMainCapital,
            extras,
            ocupante: "(sin asignar)",
            sexo: "",
            dni: "",
            fnac: "",
            checkin: "",
            checkout: "",
          });
        } else {
          for (const o of r.occupants) {
            plazas.push({
              tramo,
              hotel: hotel.hotelName,
              localidad: hotel.localidad,
              num,
              tipo: r.typeMainCapital,
              extras,
              ocupante: `${o.apellido || ""}, ${o.nombre || ""}${
                o.ocupa_cama === false ? " (Cuna)" : ""
              }`.replace(/^,\s*/, ""),
              sexo: o.genero || "",
              dni: o.dni || "",
              fnac: formatDOB(o.fecha_nac),
              checkin: o.dateIn
                ? `${formatDate(o.dateIn)} ${formatTime(o.dateIn)}`.trim()
                : "",
              checkout: o.dateOut
                ? `${formatDate(o.dateOut)} ${formatTime(o.dateOut)}`.trim()
                : "",
            });
          }
        }
      });
    }
  }

  return { habitaciones, plazas };
}

function styleHeader(ws) {
  const headerRow = ws.getRow(1);
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF312E81" },
    };
    cell.alignment = { vertical: "middle", wrapText: true };
  });
  headerRow.height = 20;
}

function fillSheet(ws, columns, rows) {
  ws.columns = columns.map((c) => ({
    header: c.header,
    key: c.key,
    width: c.width || 14,
  }));
  for (const row of rows) ws.addRow(row);
  styleHeader(ws);
  ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return;
    row.eachCell((cell) => {
      cell.alignment = { vertical: "middle", wrapText: true };
    });
  });
}

/**
 * Excel rooming OFRN.
 * - Un hotel: 2 hojas (Habitaciones + Rooming plazas).
 * - Todos: mismas 2 hojas con columna Hotel (+ opcional una hoja por hotel).
 */
export async function exportOfrnRoomingExcel({
  bookings = [],
  rooms = [],
  logisticsMap = {},
  segmentRows = [],
  segments = [],
  cortesCount = 0,
  hotelBookingId = null,
  programName = "",
  fileName,
} = {}) {
  const sections = buildOfrnRoomingSegmentSections({
    bookings,
    rooms,
    logisticsMap,
    segmentRows,
    segments,
    cortesCount,
    hotelBookingId,
  });
  const { habitaciones, plazas } = buildRowsFromSections(sections);
  if (!habitaciones.length && !plazas.length) {
    toast.message("No hay rooming para exportar en ese hotel.");
    return false;
  }

  const hotels = listOfrnRoomingHotels(bookings, rooms).filter((h) => {
    if (hotelBookingId == null || hotelBookingId === "" || hotelBookingId === "all") {
      return true;
    }
    return Number(h.bookingId) === Number(hotelBookingId);
  });

  const ExcelJS = await loadExcelJS();
  const wb = new ExcelJS.Workbook();
  wb.creator = "OFRN";
  wb.created = new Date();

  fillSheet(wb.addWorksheet("Habitaciones"), HAB_COLS, habitaciones);
  fillSheet(wb.addWorksheet("Rooming plazas"), PLAZA_COLS, plazas);

  // Si hay varios hoteles, una hoja extra por hotel (solo plazas) para mandar a cada recepción.
  if (
    hotels.length > 1 &&
    (hotelBookingId == null || hotelBookingId === "" || hotelBookingId === "all")
  ) {
    const used = new Set(
      wb.worksheets.map((ws) => String(ws.name || "").toLowerCase()),
    );
    for (const hotel of hotels) {
      const hotelSections = buildOfrnRoomingSegmentSections({
        bookings,
        rooms,
        logisticsMap,
        segmentRows,
        segments,
        cortesCount,
        hotelBookingId: hotel.bookingId,
      });
      const { plazas: hotelPlazas } = buildRowsFromSections(hotelSections);
      if (!hotelPlazas.length) continue;
      const ws = wb.addWorksheet(sheetName(hotel.nombre, used));
      fillSheet(ws, PLAZA_COLS, hotelPlazas);
    }
  }

  const hotelSuffix =
    hotels.length === 1
      ? safeFilePart(hotels[0].nombre)
      : hotels.length > 1
        ? "Todos_hoteles"
        : "Rooming";
  const base =
    fileName ||
    `Rooming_${safeFilePart(programName)}_${hotelSuffix}_${stamp()}`;

  const buffer = await wb.xlsx.writeBuffer();
  saveAs(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    `${safeFilePart(base)}.xlsx`,
  );
  return true;
}

/** Camas-noche (solo ocupantes de cama) — útil para resúmenes. */
export function totalBedNightsFromRooms(processedRooms = []) {
  let total = 0;
  for (const room of processedRooms) {
    for (const occ of room.bedOccupants || []) {
      if (occ.dateIn && occ.dateOut) {
        const nights = differenceInCalendarDays(occ.dateOut, occ.dateIn);
        if (nights > 0) total += nights;
      }
    }
  }
  return total;
}
