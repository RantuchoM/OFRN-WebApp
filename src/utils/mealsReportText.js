/**
 * Texto pedido del MealsReport (cuadro filtrado → mensaje para alimentación).
 * Extraído para reuso en export por artista.
 */

import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import {
  CATERING_SERVICE,
  filterFimbaPropuestasForMeals,
  fimbaArtistMealDietBreakdown,
  mealCoincidenceKey,
} from "./mealLogistics";
import { canonicalizeMealDiet, compareMealDietLabels } from "./dietOptions";

const ARTISTAS_FIMBA_DIET = "Artistas FIMBA";

function uniquePropuestas(rows = []) {
  const map = new Map();
  for (const row of rows) {
    for (const p of filterFimbaPropuestasForMeals(row?.propuestas || [])) {
      if (p?.id == null) continue;
      const key = String(p.id);
      if (!map.has(key)) map.set(key, p);
    }
  }
  return Array.from(map.values());
}

function uniqueOfrnPeople(rows = []) {
  const map = new Map();
  for (const row of rows) {
    for (const p of row?.ofrnPeople || []) {
      if (p?.id == null) continue;
      const key = String(p.id);
      if (!map.has(key)) map.set(key, p);
    }
  }
  return Array.from(map.values());
}

function ofrnCountsFromPeople(people = []) {
  const counts = { Total: 0 };
  for (const p of people) {
    const diet = canonicalizeMealDiet(p.diet || p.alimentacion);
    counts[diet] = (counts[diet] || 0) + 1;
    counts.Total += 1;
  }
  return counts;
}

function sumOfrnCounts(rows = []) {
  const counts = { Total: 0 };
  for (const row of rows) {
    const src = row?.ofrnCounts || {};
    for (const [diet, n] of Object.entries(src)) {
      if (!n) continue;
      counts[diet] = (counts[diet] || 0) + n;
    }
  }
  return counts;
}

function mergeHoras(rows = []) {
  const horas = [
    ...new Set(
      (rows || [])
        .map((r) => String(r?.hora || "").trim().slice(0, 5))
        .filter(Boolean),
    ),
  ].sort();
  if (horas.length === 0) return rows[0]?.hora || "";
  if (horas.length === 1) return horas[0];
  return horas.join(" / ");
}

function mergeServicioLabels(rows = [], servicio) {
  const labels = [
    ...new Set(
      (rows || [])
        .map((r) => r?.servicioLabel || r?.servicio)
        .filter(Boolean)
        .map(String),
    ),
  ];
  if (labels.length <= 1) return labels[0] || servicio;
  return servicio;
}

function mealsReportPlaceLabel(row) {
  const name = String(row?.locacionLabel || "").trim();
  if (name && name !== "Sin ubicación") return name;
  const lugar = String(row?.lugar || "").trim();
  if (lugar && lugar !== "Sin ubicación") return lugar;
  return "";
}

/**
 * Vista del MealsReport: une filas que comparten fecha + tipo (D/A/M/C/Catering)
 * + locación, aunque vengan de eventos distintos.
 * No escribe BD ni fusiona `eventos` (eso sigue siendo el botón Fusionar del Gestor).
 * OFRN por persona única; artistas por propuesta única (recalcula dietas).
 *
 * @param {object[]} rows
 * @param {{
 *   includeArtists?: boolean,
 *   partsByPropuesta?: Map|Record,
 *   labelFn?: Function,
 *   dietBreakdownFn?: Function,
 * }} [opts]
 */
export function unifyMealsReportRowsByTypeAndPlace(rows = [], opts = {}) {
  const {
    includeArtists = false,
    partsByPropuesta,
    labelFn,
    dietBreakdownFn = fimbaArtistMealDietBreakdown,
  } = opts;

  const groups = new Map();
  const keyOrder = [];
  for (const row of rows || []) {
    if (!row) continue;
    const key = mealCoincidenceKey(row) || `solo:${row.id}`;
    if (!groups.has(key)) {
      groups.set(key, []);
      keyOrder.push(key);
    }
    groups.get(key).push(row);
  }

  return keyOrder.map((key) => {
    const group = groups.get(key) || [];
    if (group.length <= 1) return group[0];

    const first = group[0];
    const ofrnPeople = uniqueOfrnPeople(group);
    const ofrnCounts = ofrnPeople.length
      ? ofrnCountsFromPeople(ofrnPeople)
      : sumOfrnCounts(group);
    const propuestas = uniquePropuestas(group);
    const counts = { ...ofrnCounts };

    if (includeArtists) {
      const { dietCounts, residualArt, total: artistTotal } = dietBreakdownFn(
        propuestas,
        partsByPropuesta,
        labelFn,
      );
      for (const [diet, n] of Object.entries(dietCounts || {})) {
        if (!n) continue;
        counts[diet] = (counts[diet] || 0) + n;
      }
      if (residualArt > 0) {
        counts[ARTISTAS_FIMBA_DIET] =
          (counts[ARTISTAS_FIMBA_DIET] || 0) + residualArt;
      } else {
        delete counts[ARTISTAS_FIMBA_DIET];
      }
      counts.Total = (Number(ofrnCounts.Total) || 0) + (Number(artistTotal) || 0);
    }

    const convocados = [
      ...new Set(group.flatMap((r) => r.convocados || []).map(String)),
    ];
    const eventIds = group.flatMap((r) =>
      Array.isArray(r.eventIds) && r.eventIds.length
        ? r.eventIds
        : r.id != null
          ? [r.id]
          : [],
    );

    return {
      ...first,
      id: `u:${key}`,
      eventIds,
      merged: true,
      hora: mergeHoras(group),
      servicioLabel: mergeServicioLabels(group, first.servicio),
      convocados,
      propuestas,
      ofrnPeople,
      ofrnCounts,
      counts,
    };
  });
}

/**
 * @param {Array<{ fecha: string, servicio: string, servicioLabel?: string, counts: Record<string, number> }>} filteredRows
 * @param {{ groupByLugar?: boolean }} [opts]
 */
export function buildMealsPedidoText(filteredRows = [], opts = {}) {
  const { groupByLugar = false } = opts;

  const formatDayHeader = (isoDate) => {
    const label = format(parseISO(isoDate), "EEEE dd/MM", { locale: es });
    return label.charAt(0).toUpperCase() + label.slice(1);
  };

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
    const typeKey = row.servicioLabel || row.servicio;
    const placeKey = groupByLugar
      ? String(row.locKey ?? row.id_locacion ?? "")
      : "";
    const groupKey = groupByLugar ? `${typeKey}\0${placeKey}` : typeKey;
    if (!perDate[row.fecha][groupKey]) {
      perDate[row.fecha][groupKey] = {
        Total: 0,
        base: row.servicio,
        label: typeKey,
        place: groupByLugar ? mealsReportPlaceLabel(row) : "",
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
        const byLabel = String(a.label).localeCompare(String(b.label), "es");
        if (byLabel !== 0) return byLabel;
        return String(a.place || "").localeCompare(String(b.place || ""), "es");
      });

      const dateRows = groups
        .map((counts) => {
          if (!counts || !counts.Total) return null;

          const diets = Object.entries(counts)
            .filter(
              ([k, v]) =>
                k !== "Total" &&
                k !== "base" &&
                k !== "label" &&
                k !== "place" &&
                v > 0,
            )
            .sort(([a], [b]) => compareMealDietLabels(a, b))
            .map(([diet, value]) => {
              const label = canonicalizeMealDiet(diet);
              return `${value} ${String(label).toLowerCase()}`;
            });

          const details = diets.length > 0 ? ` (${diets.join(", ")})` : "";
          const base = counts.base;
          const pluralRoot =
            servicePlural[base] || String(counts.label || "").toLowerCase();
          const isSub =
            counts.label &&
            String(counts.label).toLowerCase() !==
              String(base || "").toLowerCase();
          const name = isSub ? String(counts.label).toLowerCase() : pluralRoot;
          const placeSuffix = counts.place ? ` en ${counts.place}` : "";
          return `${counts.Total} ${name}${placeSuffix}${details}`;
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
