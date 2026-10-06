import { membershipActiveOnProgramDate } from "./ensembleMembership";
import { matchesMultiTokenSearch } from "./sanitize";

/** Conceptos de `horas_catedra`. Etiquetas cortas de la grilla. */
export const HORAS_CONCEPTOS = [
  { id: "h_basico", label: "Básico" },
  { id: "h_ensayos", label: "Ens" },
  { id: "h_ensamble", label: "Ensamb" },
  { id: "h_categoria", label: "Cat" },
  { id: "h_coordinacion", label: "Coord" },
  { id: "h_desarraigo", label: "Des" },
  { id: "h_otros", label: "Otros" },
];

export const HORAS_MAIN_CONCEPTOS = HORAS_CONCEPTOS.filter((c) => c.id !== "h_otros");

export const HORAS_MESES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

export const MAX_NOMINA_EXPORT_MONTHS = 36;

export const HORAS_AREA_ORIGEN = ["CULTURA", "EDUCACION"];

export function horasAreaLabel(origen) {
  return origen === "EDUCACION" ? "Educación" : "Cultura";
}

export function horasAreaFileToken(origen) {
  return origen === "EDUCACION" ? "Educacion" : "Cultura";
}

function vigenciaOrdinal(record) {
  return (Number(record?.anio_inicio) || 0) * 12 + (Number(record?.mes_inicio) || 0);
}

/**
 * Registro de horas vigente para un mes calendario y un origen.
 * Entre los que cubren ese mes, gana el de mes de vigencia más reciente
 * (`anio_inicio` / `mes_inicio`), el mismo orden que el historial.
 * `created_at` solo desempata dos registros del mismo mes de inicio.
 */
export function getHorasVigentes(records, year, month, origen) {
  const validRecords = (records || []).filter((r) => {
    if (r.origen !== origen) return false;
    const startOk =
      r.anio_inicio < year || (r.anio_inicio === year && r.mes_inicio <= month);
    const endOk =
      !r.anio_fin || r.anio_fin > year || (r.anio_fin === year && r.mes_fin >= month);
    return startOk && endOk;
  });
  validRecords.sort((a, b) => {
    const byStart = vigenciaOrdinal(b) - vigenciaOrdinal(a);
    if (byStart !== 0) return byStart;
    return new Date(b.created_at) - new Date(a.created_at);
  });
  return validRecords[0] || null;
}

export function previousYearMonth(year, month) {
  if (month <= 1) return { year: year - 1, month: 12 };
  return { year, month: month - 1 };
}

/** Meses inclusivos desde/hasta. Vacío si el desde es posterior al hasta. */
export function listMonthRange(fromYear, fromMonth, toYear, toMonth) {
  const start = Number(fromYear) * 12 + (Number(fromMonth) - 1);
  const end = Number(toYear) * 12 + (Number(toMonth) - 1);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return [];
  const out = [];
  for (let i = start; i <= end; i += 1) {
    out.push({ year: Math.floor(i / 12), month: (i % 12) + 1 });
  }
  return out;
}

function hoursOf(record) {
  const concepts = {};
  for (const c of HORAS_CONCEPTOS) {
    concepts[c.id] = Number(record?.[c.id]) || 0;
  }
  return concepts;
}

function sumMap(concepts) {
  return HORAS_CONCEPTOS.reduce((acc, c) => acc + (concepts[c.id] || 0), 0);
}

function deltaOf(curr, prev) {
  const deltas = {};
  for (const c of HORAS_CONCEPTOS) {
    deltas[c.id] = (curr[c.id] || 0) - (prev[c.id] || 0);
  }
  return deltas;
}

/**
 * Horas vigentes `n` y, si hay novedad, el delta `m` contra el mes anterior.
 * Delta 0 (o ausencia de novedad) deja el valor actual, sin sufijo.
 * @param {number} value
 * @param {number} delta
 * @param {string} [emptyLabel] qué mostrar si n es 0 y m es 0
 */
export function formatHorasNovedadCell(value, delta, emptyLabel = "-") {
  const n = Number(value) || 0;
  const m = Number(delta) || 0;
  if (m === 0) return n > 0 ? String(n) : emptyLabel;
  const sign = m > 0 ? "+" : "-";
  return `${n} (${sign}${Math.abs(m)})`;
}

function signedHours(n) {
  const value = Number(n) || 0;
  if (value === 0) return "0";
  return `${value > 0 ? "+" : "-"}${Math.abs(value)}`;
}

/**
 * Línea de detalle de una novedad respecto del mes anterior del mismo origen.
 * Cada rubro del paréntesis lleva signo. El neto de afuera es la suma de esos deltas.
 * Alta: no había horas y ahora sí. Baja: había y ahora el total es 0. Si no, cambio (Antes/Ahora).
 * @returns {string|null}
 */
export function formatNovedadDetalleLine({
  apellido,
  nombre,
  conceptDeltas,
  conceptos = HORAS_CONCEPTOS,
  prevTotal = 0,
}) {
  const entries = (conceptos || [])
    .map((c) => ({
      label: String(c.label || "").toLocaleLowerCase("es-AR"),
      d: Number(conceptDeltas?.[c.id]) || 0,
    }))
    .filter((e) => e.d !== 0);
  if (!entries.length) return null;
  const neto = entries.reduce((acc, e) => acc + e.d, 0);
  const antes = Number(prevTotal) || 0;
  const ahora = antes + neto;
  const parts = entries.map((e) => `${signedHours(e.d)} ${e.label}`).join(", ");
  const netoTxt = `${signedHours(neto)} hs (${parts})`;
  const who = `${apellido || ""}, ${nombre || ""}`;
  if (antes === 0 && ahora > 0) {
    return `${who}. Alta: ${ahora} hs. ${netoTxt}`;
  }
  if (antes > 0 && ahora === 0) {
    return `${who}. Baja: ${antes} hs. ${netoTxt}`;
  }
  return `${who}. Antes: ${antes} hs. Ahora: ${ahora} hs. ${netoTxt}`;
}

/**
 * Filas de la nómina de un mes, con la misma regla que la grilla:
 * búsqueda, ensambles y altas/bajas (`hasNews` = total del origen distinto al mes anterior).
 */
export function buildHorasNominaRows({
  musicians,
  allRecords,
  year,
  month,
  searchTerm = "",
  ensembleIds,
}) {
  const targetYear = Number(year);
  const targetMonth = Number(month);
  const prev = previousYearMonth(targetYear, targetMonth);
  const selected =
    ensembleIds instanceof Set ? ensembleIds : new Set(ensembleIds || []);
  const hoy = new Date().toISOString().slice(0, 10);
  const query = searchTerm || "";

  return (musicians || [])
    .map((m) => {
      const records = (allRecords || []).filter((r) => r.id_integrante === m.id);
      const cultRec = getHorasVigentes(records, targetYear, targetMonth, "CULTURA") || {};
      const eduRec = getHorasVigentes(records, targetYear, targetMonth, "EDUCACION") || {};
      const prevCultRec = getHorasVigentes(records, prev.year, prev.month, "CULTURA") || {};
      const prevEduRec = getHorasVigentes(records, prev.year, prev.month, "EDUCACION") || {};

      const cultConcepts = hoursOf(cultRec);
      const eduConcepts = hoursOf(eduRec);
      const prevCultConcepts = hoursOf(prevCultRec);
      const prevEduConcepts = hoursOf(prevEduRec);
      const cultDeltas = deltaOf(cultConcepts, prevCultConcepts);
      const eduDeltas = deltaOf(eduConcepts, prevEduConcepts);

      const concepts = {};
      const conceptDeltas = {};
      for (const c of HORAS_CONCEPTOS) {
        concepts[c.id] = cultConcepts[c.id] + eduConcepts[c.id];
        conceptDeltas[c.id] = cultDeltas[c.id] + eduDeltas[c.id];
      }

      const totalCult = sumMap(cultConcepts);
      const totalEdu = sumMap(eduConcepts);
      const prevTotalCult = sumMap(prevCultConcepts);
      const prevTotalEdu = sumMap(prevEduConcepts);
      const deltaCult = totalCult - prevTotalCult;
      const deltaEdu = totalEdu - prevTotalEdu;
      const hasNews = totalCult !== prevTotalCult || totalEdu !== prevTotalEdu;
      const prevGrandTotal = prevTotalCult + prevTotalEdu;
      const grandTotal = totalCult + totalEdu;
      const isBajaMes = hasNews && prevGrandTotal > 0 && grandTotal === 0;

      const myEnsembles =
        m.integrantes_ensambles
          ?.filter((ie) => membershipActiveOnProgramDate(ie, hoy))
          .map((ie) => ie.ensambles)
          .filter(Boolean) || [];

      return {
        ...m,
        myEnsembles,
        cult: cultRec,
        edu: eduRec,
        totalCult,
        totalEdu,
        prevTotalCult,
        prevTotalEdu,
        deltaCult,
        deltaEdu,
        concepts,
        conceptDeltas,
        cultConcepts,
        eduConcepts,
        cultDeltas,
        eduDeltas,
        hasNews,
        isBajaMes,
        prevGrandTotal,
        grandTotal,
        records,
      };
    })
    .filter((m) => {
      const matchesSearch =
        query === "" ||
        matchesMultiTokenSearch(
          [m.apellido, m.nombre, m.instrumentos?.instrumento],
          query,
        );
      let matchesEnsemble = true;
      if (selected.size > 0) {
        matchesEnsemble = m.myEnsembles.some(
          (e) => selected.has(e.id) || selected.has(String(e.id)),
        );
      }
      const showInNomina = m.totalCult + m.totalEdu > 0 || m.hasNews;
      if (query !== "") return matchesSearch && matchesEnsemble;
      return matchesSearch && matchesEnsemble && showInNomina;
    });
}

/** Recorte de una fila a un solo origen. No mezcla Cultura con Educación. */
export function areaNominaSlice(row, origen) {
  const isCult = origen === "CULTURA";
  const concepts = isCult ? row.cultConcepts : row.eduConcepts;
  const deltas = isCult ? row.cultDeltas : row.eduDeltas;
  const total = isCult ? row.totalCult : row.totalEdu;
  const deltaTotal = isCult ? row.deltaCult : row.deltaEdu;
  const prevTotal = isCult ? row.prevTotalCult : row.prevTotalEdu;
  const anyDelta = HORAS_CONCEPTOS.some((c) => (deltas?.[c.id] || 0) !== 0);
  return {
    concepts: concepts || hoursOf(null),
    deltas: deltas || deltaOf(hoursOf(null), hoursOf(null)),
    total: total || 0,
    deltaTotal: deltaTotal || 0,
    prevTotal: prevTotal || 0,
    otros: concepts?.h_otros || 0,
    deltaOtros: deltas?.h_otros || 0,
    visible: (total || 0) > 0 || anyDelta,
    isBaja: (prevTotal || 0) > 0 && (total || 0) === 0,
  };
}

export function novedadDetalleLinesForArea(rows, origen, conceptos = HORAS_CONCEPTOS) {
  const lines = [];
  for (const row of rows || []) {
    const slice = areaNominaSlice(row, origen);
    if (!slice.visible) continue;
    const line = formatNovedadDetalleLine({
      apellido: row.apellido,
      nombre: row.nombre,
      conceptDeltas: slice.deltas,
      conceptos,
      prevTotal: slice.prevTotal,
    });
    if (line) lines.push(line);
  }
  return lines;
}

/**
 * Cierre de un bloque de novedades (un mes, un origen).
 * `neto`: suma de los deltas de las líneas (incluye Otros, porque la línea también lo suma).
 * `hayNovedades`: hubo al menos una línea. Si es false, el pie no escribe el neto.
 * `pagadas`: Total general de esa grilla = horas vigentes del área menos Otros.
 */
export function novedadResumenForArea(rows, origen) {
  let neto = 0;
  let pagadas = 0;
  let hayNovedades = false;
  for (const row of rows || []) {
    const slice = areaNominaSlice(row, origen);
    if (!slice.visible) continue;
    neto += Number(slice.deltaTotal) || 0;
    pagadas += (Number(slice.total) || 0) - (Number(slice.otros) || 0);
    if (HORAS_CONCEPTOS.some((c) => (slice.deltas?.[c.id] || 0) !== 0)) hayNovedades = true;
  }
  return { neto, pagadas, hayNovedades };
}

export function formatNovedadResumenLines({ neto, pagadas, hayNovedades }) {
  const n = Number(neto) || 0;
  const paid = Number(pagadas) || 0;
  const lines = [];
  if (hayNovedades) {
    const netoTxt = n === 0 ? "0 hs" : `${signedHours(n)} hs`;
    lines.push(`Horas que subieron o bajaron: ${netoTxt}`);
  }
  lines.push(`Total de horas pagadas: ${paid} hs`);
  return lines;
}
