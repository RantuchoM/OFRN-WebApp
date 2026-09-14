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

export const ARTIST_MEAL_SPECS_HEADING =
  "Especificaciones de comidas — artistas";

function partsListForPropuesta(partsByPropuesta, propuestaId) {
  if (!partsByPropuesta) return [];
  const key = String(propuestaId);
  if (typeof partsByPropuesta.get === "function") {
    return partsByPropuesta.get(key) || partsByPropuesta.get(propuestaId) || [];
  }
  return partsByPropuesta[key] || partsByPropuesta[propuestaId] || [];
}

function personMealSpecLabel(p) {
  return `${p?.apellido || ""}, ${p?.nombre || ""}`.replace(/^,\s*/, "").trim() || "—";
}

/**
 * Texto libre de dieta (`nota_alimentacion`): HTML → plano, conserva saltos.
 * @param {unknown} raw
 * @returns {string}
 */
export function normalizeArtistMealSpecText(raw) {
  if (raw == null) return "";
  let s = String(raw);
  if (!s.trim()) return "";
  s = s
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6]|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&#160;/g, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n");
  return s.trim();
}

function escapeMealSpecHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function pushArtistMealSpecEntry(map, artist, person) {
  if (!artist?.id) return;
  if (artist.requiere_comidas === false) return;
  if (person?.activo === false) return;
  const nota = normalizeArtistMealSpecText(person?.nota_alimentacion);
  if (!nota) return;
  const id = String(artist.id);
  if (!map.has(id)) {
    map.set(id, {
      id,
      nombre: artist.nombre || `Artista ${id}`,
      entries: [],
      seen: new Set(),
    });
  }
  const bucket = map.get(id);
  const key =
    person?.id != null && person.id !== ""
      ? `id:${person.id}`
      : `n:${personMealSpecLabel(person)}|${nota}`;
  if (bucket.seen.has(key)) return;
  bucket.seen.add(key);
  bucket.entries.push({
    personLabel: personMealSpecLabel(person),
    nota,
  });
}

function finalizeArtistMealSpecs(map) {
  return Array.from(map.values())
    .map(({ seen, ...rest }) => ({
      ...rest,
      entries: rest.entries.sort((a, b) =>
        a.personLabel.localeCompare(b.personLabel, "es", {
          sensitivity: "base",
        }),
      ),
    }))
    .filter((a) => a.entries.length > 0)
    .sort((a, b) =>
      a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" }),
    );
}

/**
 * Notas libres de nominados FIMBA (`fimba_participantes.nota_alimentacion`)
 * de artistas tagueados en las filas del reporte (respeta filtros).
 *
 * @param {Array<{ propuestas?: Array<{ id?: unknown, nombre?: string, requiere_comidas?: boolean }> }>} reportRows
 * @param {Map|Record} partsByPropuesta
 * @param {{ onlyArtistaIds?: Array<string|number>|null }} [opts]
 * @returns {Array<{ id: string, nombre: string, entries: Array<{ personLabel: string, nota: string }> }>}
 */
export function collectArtistMealSpecsFromReportRows(
  reportRows = [],
  partsByPropuesta = new Map(),
  opts = {},
) {
  const allow = opts.onlyArtistaIds?.length
    ? new Set(opts.onlyArtistaIds.map(String))
    : null;
  const map = new Map();
  for (const row of reportRows || []) {
    for (const p of row.propuestas || []) {
      if (!p?.id) continue;
      if (allow && !allow.has(String(p.id))) continue;
      const parts = partsListForPropuesta(partsByPropuesta, p.id);
      for (const person of parts) {
        pushArtistMealSpecEntry(map, p, person);
      }
    }
  }
  return finalizeArtistMealSpecs(map);
}

/**
 * Misma fuente sobre filas de hotelería / estadía (Excel/PDF comidas FIMBA).
 * @param {Array} hoteleriaRows
 */
export function collectArtistMealSpecsFromHoteleriaRows(hoteleriaRows = []) {
  const map = new Map();
  for (const r of hoteleriaRows || []) {
    if (r.requiere_comidas === false || r.propuesta?.requiere_comidas === false) {
      continue;
    }
    const artist = {
      id: r.propuesta?.id ?? r.id_propuesta,
      nombre: r.propuesta?.nombre || "",
      requiere_comidas: r.propuesta?.requiere_comidas ?? r.requiere_comidas,
    };
    if (!artist.id) continue;
    for (const person of r.personas || r.participantes || []) {
      pushArtistMealSpecEntry(map, artist, person);
    }
  }
  return finalizeArtistMealSpecs(map);
}

export function flattenArtistMealSpecsRows(specs = []) {
  const rows = [];
  for (const a of specs || []) {
    for (const e of a.entries || []) {
      rows.push({
        artista: a.nombre,
        persona: e.personLabel,
        nota: e.nota,
      });
    }
  }
  return rows;
}

export function formatArtistMealSpecsText(specs = []) {
  if (!specs?.length) return "";
  const blocks = [ARTIST_MEAL_SPECS_HEADING];
  for (const a of specs) {
    const lines = [a.nombre];
    for (const e of a.entries || []) {
      if (e.nota.includes("\n")) {
        const indented = e.nota
          .split("\n")
          .map((line) => `  ${line}`)
          .join("\n");
        lines.push(`${e.personLabel}:\n${indented}`);
      } else {
        lines.push(`${e.personLabel}: ${e.nota}`);
      }
    }
    blocks.push(lines.join("\n"));
  }
  return blocks.join("\n\n");
}

export function formatArtistMealSpecsHtml(specs = []) {
  if (!specs?.length) return "";
  const parts = [
    `<h2>${escapeMealSpecHtml(ARTIST_MEAL_SPECS_HEADING)}</h2>`,
  ];
  for (const a of specs) {
    parts.push(`<div class="no-break">`);
    parts.push(`<h3>${escapeMealSpecHtml(a.nombre)}</h3>`);
    for (const e of a.entries || []) {
      parts.push(
        `<p style="white-space:pre-wrap;margin:0 0 8px"><strong>${escapeMealSpecHtml(e.personLabel)}</strong> — ${escapeMealSpecHtml(e.nota)}</p>`,
      );
    }
    parts.push(`</div>`);
  }
  return parts.join("");
}

export function appendArtistMealSpecsSection(text, specs = []) {
  const body = formatArtistMealSpecsText(specs);
  if (!body) return text || "";
  const head = String(text || "").trim();
  return head ? `${head}\n\n${body}` : body;
}

export { ARTISTAS_FIMBA_DIET };
