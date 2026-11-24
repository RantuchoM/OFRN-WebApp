/**
 * Temporada alta oficial (Poder Legislativo / destinos turísticos RN):
 * - Dic–Feb: Bariloche, El Bolsón, Las Grutas, El Cóndor, Playas Doradas
 * - Jul–Ago: solo Bariloche y El Bolsón
 *
 * En gira es aviso + franja confirmada por el operador (completa o parcial).
 */

export const FACTOR_TEMPORADA_ALTA = 0.3;

/** @typedef {'off' | 'completa' | 'parcial'} TemporadaModo */

const toIsoDay = (value) => {
  if (value == null || value === "") return "";
  return String(value).slice(0, 10);
};

const fold = (s) =>
  String(s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

/** Alias oficiales → clave canónica de matching. */
const DESTINO_ALIASES = {
  bariloche: "bariloche",
  "san carlos de bariloche": "bariloche",
  "el bolson": "el_bolson",
  "las grutas": "las_grutas",
  "el condor": "el_condor",
  "playas doradas": "playas_doradas",
};

/** Meses 1–12. Verano: todos los destinos; invierno: solo cordillera. */
const REGLAS_TEMPORADA = [
  {
    id: "verano",
    meses: [12, 1, 2],
    destinos: [
      "bariloche",
      "el_bolson",
      "las_grutas",
      "el_condor",
      "playas_doradas",
    ],
    label:
      "Dic–Feb: Bariloche, El Bolsón, Las Grutas, El Cóndor, Playas Doradas",
  },
  {
    id: "invierno",
    meses: [7, 8],
    destinos: ["bariloche", "el_bolson"],
    label: "Jul–Ago: Bariloche y El Bolsón",
  },
];

export function normalizeDestinoTemporadaKey(texto) {
  const f = fold(texto);
  if (!f) return null;
  if (DESTINO_ALIASES[f]) return DESTINO_ALIASES[f];
  for (const [alias, key] of Object.entries(DESTINO_ALIASES)) {
    if (f.includes(alias)) return key;
  }
  return null;
}

/** Extrae claves de destino desde un texto libre (lugar de comisión, lista de paradas). */
export function extractDestinosTemporadaFromText(texto) {
  const f = fold(texto);
  if (!f) return [];
  const found = new Set();
  for (const [alias, key] of Object.entries(DESTINO_ALIASES)) {
    if (f.includes(alias)) found.add(key);
  }
  return [...found];
}

function monthOfIso(iso) {
  const day = toIsoDay(iso);
  if (!day || day.length < 7) return null;
  const m = Number(day.slice(5, 7));
  return Number.isFinite(m) ? m : null;
}

function addDaysIso(isoDate, delta) {
  const day = toIsoDay(isoDate);
  if (!day) return "";
  const [y, m, d] = day.split("-").map(Number);
  const dt = new Date(y, m - 1, d + delta);
  const ym = String(dt.getFullYear());
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${ym}-${mm}-${dd}`;
}

function eachIsoDayInclusive(desde, hasta) {
  const a = toIsoDay(desde);
  const b = toIsoDay(hasta);
  if (!a || !b || a > b) return [];
  const out = [];
  let cur = a;
  let guard = 0;
  while (cur <= b && guard < 800) {
    out.push(cur);
    cur = addDaysIso(cur, 1);
    guard += 1;
  }
  return out;
}

/**
 * ¿El lugar de comisión intersecta destinos de temporada alta?
 * @param {string} lugarTexto
 * @returns {{ destinos: string[], reglas: typeof REGLAS_TEMPORADA }}
 */
export function matchLugarTemporadaAlta(lugarTexto) {
  const destinos = extractDestinosTemporadaFromText(lugarTexto);
  if (destinos.length === 0) {
    return { destinos: [], reglas: [] };
  }
  const reglas = REGLAS_TEMPORADA.filter((r) =>
    r.destinos.some((d) => destinos.includes(d)),
  );
  return { destinos, reglas };
}

/**
 * Solape calendario viaje ∩ meses oficiales para los destinos detectados.
 * @returns {{ aplica: boolean, sugeridoDesde: string, sugeridoHasta: string, destinos: string[], reglas: object[], label: string }}
 */
export function suggestTemporadaFranja({
  fechaDesde,
  fechaHasta,
  lugarTexto,
}) {
  const viajeDesde = toIsoDay(fechaDesde);
  const viajeHasta = toIsoDay(fechaHasta) || viajeDesde;
  const { destinos, reglas } = matchLugarTemporadaAlta(lugarTexto);

  if (!viajeDesde || destinos.length === 0 || reglas.length === 0) {
    return {
      aplica: false,
      sugeridoDesde: "",
      sugeridoHasta: "",
      destinos,
      reglas,
      label: "",
    };
  }

  const mesesOk = new Set();
  for (const r of reglas) {
    if (!r.destinos.some((d) => destinos.includes(d))) continue;
    for (const m of r.meses) mesesOk.add(m);
  }

  const dias = eachIsoDayInclusive(viajeDesde, viajeHasta);
  const enTemporada = dias.filter((d) => {
    const m = monthOfIso(d);
    return m != null && mesesOk.has(m);
  });

  if (enTemporada.length === 0) {
    return {
      aplica: false,
      sugeridoDesde: "",
      sugeridoHasta: "",
      destinos,
      reglas,
      label: reglas.map((r) => r.label).join(" · "),
    };
  }

  return {
    aplica: true,
    sugeridoDesde: enTemporada[0],
    sugeridoHasta: enTemporada[enTemporada.length - 1],
    destinos,
    reglas,
    label: reglas.map((r) => r.label).join(" · "),
  };
}

/** factor_temporada > 0 y fechas null = completa; con fechas = parcial. */
export function resolveTemporadaModo({
  factorTemporada = 0,
  temporadaDesde = null,
  temporadaHasta = null,
  temporadaAlta = null,
} = {}) {
  const factor =
    temporadaAlta === true
      ? FACTOR_TEMPORADA_ALTA
      : temporadaAlta === false
        ? 0
        : parseFloat(factorTemporada || 0) || 0;
  if (!(factor > 0)) return "off";
  const d = toIsoDay(temporadaDesde);
  const h = toIsoDay(temporadaHasta);
  if (d || h) return "parcial";
  return "completa";
}

/**
 * Factor (+0.3 o 0) aplicable a un día calendario según franja.
 * Fechas null + factor>0 → todos los días (completa / legacy).
 */
export function factorTemporadaParaFecha(
  fecha,
  {
    factorTemporada = 0,
    temporadaDesde = null,
    temporadaHasta = null,
  } = {},
) {
  const factor = parseFloat(factorTemporada || 0) || 0;
  if (!(factor > 0)) return 0;
  const day = toIsoDay(fecha);
  if (!day) return factor;

  const desde = toIsoDay(temporadaDesde);
  const hasta = toIsoDay(temporadaHasta);
  if (!desde && !hasta) return factor;
  if (desde && day < desde) return 0;
  if (hasta && day > hasta) return 0;
  return factor;
}

export function temporadaConfigFromModo(modo, { sugeridoDesde, sugeridoHasta, viajeDesde, viajeHasta } = {}) {
  if (modo === "off") {
    return {
      factor_temporada: 0,
      temporada_desde: null,
      temporada_hasta: null,
      temporada_alta: false,
    };
  }
  if (modo === "completa") {
    return {
      factor_temporada: FACTOR_TEMPORADA_ALTA,
      temporada_desde: null,
      temporada_hasta: null,
      temporada_alta: true,
    };
  }
  const desde =
    toIsoDay(sugeridoDesde) ||
    toIsoDay(viajeDesde) ||
    null;
  const hasta =
    toIsoDay(sugeridoHasta) ||
    toIsoDay(viajeHasta) ||
    desde;
  return {
    factor_temporada: FACTOR_TEMPORADA_ALTA,
    temporada_desde: desde,
    temporada_hasta: hasta,
    temporada_alta: true,
  };
}

export { REGLAS_TEMPORADA };
