/**
 * Texto pedido del MealsReport (cuadro filtrado → mensaje para alimentación).
 * Extraído para reuso en export por artista.
 */

import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { CATERING_SERVICE } from "./mealLogistics";

const ARTISTAS_FIMBA_DIET = "Artistas FIMBA";

/**
 * @param {Array<{ fecha: string, servicio: string, servicioLabel?: string, counts: Record<string, number> }>} filteredRows
 * @param {{ nonLocalRoster?: object[], includeStayBlocks?: boolean }} [opts]
 */
export function buildMealsPedidoText(filteredRows = [], opts = {}) {
  const { nonLocalRoster = [], includeStayBlocks = true } = opts;

  const formatDayHeader = (isoDate) => {
    const label = format(parseISO(isoDate), "EEEE dd/MM", { locale: es });
    return label.charAt(0).toUpperCase() + label.slice(1);
  };

  const formatDayRange = (isoDate) => format(parseISO(isoDate), "dd/MM");

  const serviceOrder = [
    "Desayuno",
    "Almuerzo",
    "Merienda",
    "Cena",
    CATERING_SERVICE,
  ];
  const servicePlural = {
    Desayuno: "desayunos",
    Almuerzo: "almuerzos",
    Merienda: "meriendas",
    Cena: "cenas",
    [CATERING_SERVICE]: "catering",
  };

  const perDate = {};
  filteredRows.forEach((row) => {
    if (!perDate[row.fecha]) perDate[row.fecha] = {};
    const groupKey = row.servicioLabel || row.servicio;
    if (!perDate[row.fecha][groupKey]) {
      perDate[row.fecha][groupKey] = {
        Total: 0,
        base: row.servicio,
        label: groupKey,
      };
    }
    perDate[row.fecha][groupKey].Total += row.counts?.Total || 0;
    Object.entries(row.counts || {}).forEach(([diet, value]) => {
      if (diet === "Total" || !value) return;
      perDate[row.fecha][groupKey][diet] =
        (perDate[row.fecha][groupKey][diet] || 0) + value;
    });
  });

  const orderedDates = Object.keys(perDate).sort((a, b) => a.localeCompare(b));

  const mealBlocks = orderedDates
    .map((dateKey) => {
      const groups = Object.values(perDate[dateKey] || {}).sort((a, b) => {
        const oa = serviceOrder.indexOf(a.base);
        const ob = serviceOrder.indexOf(b.base);
        if (oa !== ob) return (oa < 0 ? 99 : oa) - (ob < 0 ? 99 : ob);
        return String(a.label).localeCompare(String(b.label), "es");
      });

      const dateRows = groups
        .map((counts) => {
          if (!counts || !counts.Total) return null;

          const diets = Object.entries(counts)
            .filter(
              ([k, v]) =>
                k !== "Total" && k !== "base" && k !== "label" && v > 0,
            )
            .sort(([a], [b]) => {
              const rank = (d) => {
                if (d === "Estándar" || d === "Regular") return 0;
                if (d === ARTISTAS_FIMBA_DIET) return 2;
                return 1;
              };
              const ra = rank(a);
              const rb = rank(b);
              if (ra !== rb) return ra - rb;
              return a.localeCompare(b, "es");
            })
            .map(([diet, value]) => `${value} ${diet.toLowerCase()}`);

          const details = diets.length > 0 ? ` (${diets.join(", ")})` : "";
          const base = counts.base;
          const pluralRoot =
            servicePlural[base] || String(counts.label || "").toLowerCase();
          const isSub =
            counts.label &&
            String(counts.label).toLowerCase() !==
              String(base || "").toLowerCase();
          const name = isSub ? String(counts.label).toLowerCase() : pluralRoot;
          return `${counts.Total} ${name}${details}`;
        })
        .filter(Boolean);

      if (dateRows.length === 0) return null;
      return `${formatDayHeader(dateKey)}\n${dateRows.join("\n")}`;
    })
    .filter(Boolean);

  const mealPeak = filteredRows.reduce(
    (max, row) => Math.max(max, row.counts?.Total || 0),
    0,
  );

  const blocks = [];
  if (mealPeak > 0) {
    blocks.push(`Cantidad de pasajeros: ${mealPeak}`);
  }
  if (mealBlocks.length > 0) blocks.push(mealBlocks.join("\n\n"));

  if (includeStayBlocks && nonLocalRoster?.length) {
    const isMinorPerson = (person) => {
      if (person?.menor === true || person?.menor === 1) return true;
      if (!person?.fecha_nacimiento) return false;
      const birth = new Date(person.fecha_nacimiento);
      if (Number.isNaN(birth.getTime())) return false;
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const monthDiff = today.getMonth() - birth.getMonth();
      if (
        monthDiff < 0 ||
        (monthDiff === 0 && today.getDate() < birth.getDate())
      ) {
        age -= 1;
      }
      return age < 18;
    };

    const groupedByStay = {};
    nonLocalRoster.forEach((person) => {
      const inDate =
        person?.logistics?.checkin?.date ||
        person?.logistics?.comida_inicio?.date;
      const outDate =
        person?.logistics?.checkout?.date ||
        person?.logistics?.comida_fin?.date;
      if (!inDate || !outDate) return;
      const key = `${inDate}|${outDate}`;
      if (!groupedByStay[key]) {
        groupedByStay[key] = {
          inDate,
          outDate,
          pax: 0,
          minors: 0,
          superiorRooms: new Set(),
        };
      }
      groupedByStay[key].pax += 1;
      if (isMinorPerson(person)) groupedByStay[key].minors += 1;

      const room = person?.habitacion;
      const roomType = String(room?.tipo || "").toLowerCase();
      const isSuperiorRoom = roomType === "plus" || roomType === "superior";
      if (isSuperiorRoom && room?.id) {
        groupedByStay[key].superiorRooms.add(room.id);
      }
    });

    const stayBlocks = Object.values(groupedByStay)
      .sort((a, b) => a.inDate.localeCompare(b.inDate))
      .map((group) => {
        const extras = [];
        if (group.minors > 0) {
          extras.push(
            `${group.minors} ${group.minors === 1 ? "menor" : "menores"}`,
          );
        }
        const roomCount = group.superiorRooms.size;
        if (roomCount > 0) {
          extras.push(
            `${roomCount} ${
              roomCount === 1 ? "habitación superior" : "habitaciones superiores"
            }`,
          );
        }
        const extraText = extras.length > 0 ? ` (${extras.join(", ")})` : "";
        const paxLabel = group.pax === 1 ? "pasajero" : "pasajeros";
        return (
          `Grupo ingreso ${formatDayRange(group.inDate)} al ${formatDayRange(group.outDate)}\n` +
          `${group.pax} ${paxLabel}${extraText}`
        );
      });

    const stayPaxTotal = Object.values(groupedByStay).reduce(
      (sum, group) => sum + group.pax,
      0,
    );

    blocks.push("Fecha de ingreso y egreso.");
    if (stayPaxTotal > 0) {
      blocks.push(
        `Hospedaje (no locales): ${stayPaxTotal} ${
          stayPaxTotal === 1 ? "pasajero" : "pasajeros"
        }`,
      );
    }
    if (stayBlocks.length > 0) blocks.push(stayBlocks.join("\n\n"));
  }

  return blocks.join("\n\n");
}

/**
 * Recalcula counts de una fila MealsReport acotada a propuestas del artista.
 * Conserva OFRN (ofrnCounts) y suma dietas solo del artista (paridad filtro UI).
 */
export function scopeMealsReportRowToArtista(
  row,
  artistaId,
  fimbaPartsByPropuesta,
  labelFn,
  dietBreakdownFn,
) {
  const artistSet = new Set([String(artistaId)]);
  const scopedProps = (row.propuestas || []).filter(
    (p) => p?.id != null && artistSet.has(String(p.id)),
  );
  const ofrn = row.ofrnCounts || { Total: 0 };
  const counts = { ...ofrn };
  const { dietCounts, residualArt, total: artistTotal } = dietBreakdownFn(
    scopedProps,
    fimbaPartsByPropuesta,
    labelFn,
  );
  for (const [diet, n] of Object.entries(dietCounts)) {
    if (!n) continue;
    counts[diet] = (counts[diet] || 0) + n;
  }
  if (residualArt > 0) {
    counts[ARTISTAS_FIMBA_DIET] =
      (counts[ARTISTAS_FIMBA_DIET] || 0) + residualArt;
  } else {
    delete counts[ARTISTAS_FIMBA_DIET];
  }
  counts.Total = (Number(ofrn.Total) || 0) + artistTotal;
  return { ...row, counts, propuestas: scopedProps };
}

export { ARTISTAS_FIMBA_DIET };
