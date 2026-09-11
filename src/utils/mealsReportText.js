/**
 * Texto pedido del MealsReport (cuadro filtrado → mensaje para alimentación).
 * Extraído para reuso en export por artista.
 */

import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

const ARTISTAS_FIMBA_DIET = "Artistas FIMBA";
/** Paridad `CATERING_SERVICE` de mealLogistics (evita arrastrar ese módulo aquí). */
const CATERING_SERVICE = "Catering";

function lookupParts(participantesByPropuestaId, id) {
  if (id == null || id === "") return [];
  const key = String(id);
  if (participantesByPropuestaId instanceof Map) {
    return participantesByPropuestaId.get(key) || [];
  }
  return participantesByPropuestaId?.[key] || [];
}

/** Régimen “sin especificación especial” (no se lista en el bloque de excepciones). */
export function isStandardMealDiet(label) {
  const s = String(label || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  return (
    !s ||
    s === "estandar" ||
    s === "regular" ||
    s === "—" ||
    s === "-" ||
    s === ARTISTAS_FIMBA_DIET.toLowerCase()
  );
}

/**
 * Nominados de un servicio: OFRN contados + artistas FIMBA (incl. residuales).
 */
export function collectMealCasos({
  ofrnPeople = [],
  propuestas = [],
  participantesByPropuestaId = new Map(),
  labelFn,
} = {}) {
  const casos = [];

  for (const person of ofrnPeople || []) {
    if (!person) continue;
    casos.push({
      origen: "OFRN",
      id_propuesta: null,
      artista: "",
      apellido: person.apellido || "",
      nombre: person.nombre || "",
      alimentacion: person.alimentacion || "Estándar",
      nota: "",
    });
  }

  for (const p of propuestas || []) {
    if (p?.requiere_comidas === false) continue;
    const plan = Math.max(0, Number(p.cantidad_planificada) || 0);
    const parts = lookupParts(participantesByPropuestaId, p.id);
    const activos = (parts || []).filter((x) => x.activo !== false);
    const artista = p.nombre || "";

    for (const part of activos) {
      const tipo = part?.tipo_alimentacion;
      const nota = String(part?.nota_alimentacion || "").trim();
      const labeled =
        typeof labelFn === "function" ? labelFn(tipo, nota) : "";
      casos.push({
        origen: "FIMBA",
        id_propuesta: p.id != null ? String(p.id) : null,
        artista,
        apellido: part.apellido || "",
        nombre: part.nombre || "",
        alimentacion: labeled && labeled !== "—" ? labeled : "Regular",
        nota,
      });
    }

    const residual =
      plan === 0 && activos.length > 0
        ? 0
        : Math.max(0, plan - activos.length);
    for (let i = 0; i < residual; i += 1) {
      casos.push({
        origen: "FIMBA",
        id_propuesta: p.id != null ? String(p.id) : null,
        artista,
        apellido: "(por confirmar)",
        nombre: `#${i + 1}`,
        alimentacion: ARTISTAS_FIMBA_DIET,
        nota: "",
      });
    }
  }

  return casos;
}

export function formatMealCasoLine(caso) {
  const who =
    [caso?.apellido, caso?.nombre].filter(Boolean).join(", ") ||
    "(sin nombre)";
  const artist = caso?.artista ? ` (${caso.artista})` : "";
  const diet = caso?.alimentacion || "Regular";
  const nota = String(caso?.nota || "").trim();
  const notaAlreadyInDiet =
    nota && diet.toLowerCase().includes(nota.toLowerCase());
  const notaPart = nota && !notaAlreadyInDiet ? `. ${nota}` : "";
  return `${who}${artist} — ${diet}${notaPart}`;
}

export function collectNonStandardCasosFromRows(rows = []) {
  const seen = new Set();
  const out = [];
  for (const row of rows || []) {
    for (const caso of row.casos || []) {
      if (isStandardMealDiet(caso.alimentacion)) continue;
      const key = [
        caso.origen || "",
        caso.id_propuesta || "",
        caso.apellido || "",
        caso.nombre || "",
        caso.alimentacion || "",
        caso.nota || "",
      ].join("|");
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(caso);
    }
  }
  return out.sort((a, b) => {
    const aa = `${a.artista || ""} ${a.apellido || ""} ${a.nombre || ""}`;
    const bb = `${b.artista || ""} ${b.apellido || ""} ${b.nombre || ""}`;
    return aa.localeCompare(bb, "es", { sensitivity: "base" });
  });
}

/**
 * @param {Array<{ fecha: string, servicio: string, servicioLabel?: string, counts: Record<string, number> }>} filteredRows
 * @param {{ nonLocalRoster?: object[], includeStayBlocks?: boolean }} [opts]
 */
export function buildMealsPedidoText(filteredRows = [], opts = {}) {
  const {
    nonLocalRoster = [],
    includeStayBlocks = true,
    includeCasos = true,
  } = opts;

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

  if (includeCasos) {
    const specs = collectNonStandardCasosFromRows(filteredRows);
    if (specs.length > 0) {
      blocks.push("Especificaciones alimenticias");
      blocks.push(specs.map(formatMealCasoLine).join("\n"));
    }
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
  const artistKey = String(artistaId);
  const casos = (row.casos || []).filter(
    (c) => c?.id_propuesta != null && String(c.id_propuesta) === artistKey,
  );
  return { ...row, counts, propuestas: scopedProps, casos };
}

export { ARTISTAS_FIMBA_DIET };
