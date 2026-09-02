/**
 * Estadía FIMBA por persona (Ruggiero cuarteto + herencia del artista).
 * Run: node scripts/verify-fimba-stay.mjs
 */

import {
  classifyStayOverride,
  computeStayOccupancy,
  isoDateOrNull,
  normalizeParticipanteStayAgainstGroup,
  resolveParticipanteStay,
  stayOverrideLabel,
} from "../src/utils/fimbaStay.js";
import { computeArtistaMealsPlan } from "../src/utils/fimbaMealsStay.js";

function assert(cond, msg) {
  if (!cond) {
    console.error("FAIL:", msg);
    process.exitCode = 1;
  } else {
    console.log("ok:", msg);
  }
}

const propuesta = {
  nombre: "Daniel Ruggiero cuarteto",
  cantidad_planificada: 4,
  checkin_at: "2026-09-15",
  checkout_at: "2026-09-18",
  checkin_early: false,
  checkout_late: false,
};

const ruggiero = {
  id: 1,
  apellido: "Ruggiero",
  nombre: "Osvaldo Daniel",
  activo: true,
  tipo_alimentacion: "regular",
  checkin_at: "2026-09-15",
  checkout_at: "2026-09-18",
};
const others = [
  { id: 2, apellido: "Mastrocola", nombre: "Nicolas", activo: true, tipo_alimentacion: "regular", checkin_at: "2026-09-16", checkout_at: "2026-09-18" },
  { id: 3, apellido: "Longo", nombre: "Emilio", activo: true, tipo_alimentacion: "regular", checkin_at: "2026-09-16", checkout_at: "2026-09-18" },
  { id: 4, apellido: "Negri", nombre: "Facundo", activo: true, tipo_alimentacion: "regular", checkin_at: "2026-09-16", checkout_at: "2026-09-18" },
];
const people = [ruggiero, ...others];

const stayR = resolveParticipanteStay(ruggiero, propuesta);
const stayM = resolveParticipanteStay(others[0], propuesta);
assert(stayR.checkin_at === "2026-09-15" && stayR.noches === 3, "Ruggiero 15→18 = 3 noches");
assert(stayM.checkin_at === "2026-09-16" && stayM.noches === 2, "Mastrocola 16→18 = 2 noches");
assert(stayM.inherited_checkin === false, "override de check-in no hereda");

const inherited = resolveParticipanteStay(
  { activo: true, checkin_at: null, checkout_at: null },
  propuesta,
);
assert(inherited.checkin_at === "2026-09-15" && inherited.inherited_checkin, "vacío hereda artista");

assert(
  classifyStayOverride("checkin", null, "2026-09-16") === "inherit",
  "sin fecha propia = usa grupo",
);
assert(
  classifyStayOverride("checkin", "2026-09-15", "2026-09-16") === "early",
  "fecha anterior = llegada anticipada",
);
assert(
  classifyStayOverride("checkin", "2026-09-16", "2026-09-16") === "inherit",
  "igual al grupo se trata como hereda",
);
assert(
  classifyStayOverride("checkout", "2026-09-19", "2026-09-18") === "late",
  "salida posterior",
);
assert(
  stayOverrideLabel("early", "checkin") === "Llegada anticipada",
  "label llegada anticipada",
);

const normalized = normalizeParticipanteStayAgainstGroup(
  "2026-09-16",
  "2026-09-18",
  "2026-09-16",
  "2026-09-18",
);
assert(normalized.checkin_at == null && normalized.checkout_at == null, "igual al grupo → limpia FK");
const earlyNorm = normalizeParticipanteStayAgainstGroup(
  "2026-09-15",
  "2026-09-18",
  "2026-09-16",
  "2026-09-18",
);
assert(
  earlyNorm.checkin_at === "2026-09-15" && earlyNorm.checkout_at == null,
  "anticipada conserva in; out igual limpia",
);

const occ = computeStayOccupancy(propuesta, people);
assert(occ.stay_staggered === true, "llegadas desfasadas");
assert(occ.noches === 3, "rango del grupo = 3 noches");
assert(occ.pax_noches === 3 + 2 + 2 + 2, "pax-noche 9 (no 12)");

const uniform = computeStayOccupancy(propuesta, [
  { activo: true },
  { activo: true },
  { activo: true },
  { activo: true },
]);
assert(uniform.stay_staggered === false && uniform.pax_noches === 12, "sin override = 4×3 pax-noche");

const meals = computeArtistaMealsPlan({
  ...propuesta,
  artistaNombre: propuesta.nombre,
  pax: 4,
  participantes: people,
});
const byFecha = Object.fromEntries(meals.days.map((d) => [d.fecha, d]));
assert(byFecha["2026-09-15"]?.cena === 1, "15/9: 1 cena (solo Ruggiero)");
assert(byFecha["2026-09-15"]?.desayuno === 0, "15/9: sin desayuno (día de llegada)");
assert(byFecha["2026-09-16"]?.cena === 4, "16/9: 4 cenas");
assert(byFecha["2026-09-16"]?.desayuno === 1, "16/9: 1 desayuno (Ruggiero ya está)");
assert(byFecha["2026-09-17"]?.desayuno === 4, "17/9: 4 desayunos");
assert(byFecha["2026-09-18"]?.desayuno === 4, "18/9: 4 desayunos (salida)");
assert(byFecha["2026-09-18"]?.cena === 0, "18/9: sin cena");
assert(meals.pax_noches === 9, "comidas pax-noche = 9");

const mealsUniform = computeArtistaMealsPlan({
  ...propuesta,
  pax: 4,
  participantes: [],
});
assert(mealsUniform.pax_noches === 12, "sin nómina: 4 pax × 3 noches");
assert(mealsUniform.days.find((d) => d.fecha === "2026-09-15")?.cena === 4, "sin nómina: 4 cenas el 15");

const pedidoKeys = new Set(
  people.map((p) => {
    const s = resolveParticipanteStay(p, propuesta);
    return `${s.checkin_at}|${s.checkout_at}`;
  }),
);
assert(pedidoKeys.size === 2, "pedido hotel parte en dos rangos (15-18 y 16-18)");
assert(pedidoKeys.has("2026-09-15|2026-09-18"), "grupo Ruggiero 15-18");
assert(pedidoKeys.has("2026-09-16|2026-09-18"), "grupo resto 16-18");
assert(isoDateOrNull("0009-10-18") == null, "no persiste año 0009");
assert(isoDateOrNull("2026-09-16") === "2026-09-16", "ISO 2026 ok");

function formatFechaVerify(f) {
  if (!f) return "";
  const s = String(f).slice(0, 10);
  const [y, m, d] = s.split("-");
  if (!d) return s;
  return `${d}/${m}/${y}`;
}

const ruggieroRow = {
  propuesta,
  hotel: { nombre: "Hotel test" },
  checkin_at: propuesta.checkin_at,
  checkout_at: propuesta.checkout_at,
  personas: people,
  habitaciones: [
    {
      id: 55,
      orden: 1,
      ocupantes: [
        { orden: 1, id_participante: 3, participante: others[1] },
        { orden: 2, id_participante: 2, participante: others[0] },
      ],
    },
    {
      id: 56,
      orden: 2,
      ocupantes: [
        { orden: 1, id_participante: 4, participante: others[2] },
        { orden: 2, id_participante: 1, participante: ruggiero },
      ],
    },
  ],
};

const hab2Occs = ruggieroRow.habitaciones[1].ocupantes.map((o) => {
  const stay = resolveParticipanteStay(o.participante, ruggieroRow);
  const name = `${o.participante.apellido}, ${o.participante.nombre}`;
  return `${name} (${formatFechaVerify(stay.checkin_at)} → ${formatFechaVerify(stay.checkout_at)})`;
});
assert(hab2Occs.length === 2, "rooming DBL #2: 2 ocupantes");
assert(
  hab2Occs.some((s) => s.includes("Ruggiero") && s.includes("15/09/2026")),
  "contrato Excel hab.: Ruggiero IN 15/09/2026",
);
assert(
  hab2Occs.some((s) => s.includes("Negri") && s.includes("16/09/2026")),
  "contrato Excel hab.: Negri IN 16/09/2026",
);

const detalleFechas = people.map((p) => {
  const s = resolveParticipanteStay(p, propuesta);
  return { apellido: p.apellido, checkin: s.checkin_at, checkout: s.checkout_at };
});
assert(
  detalleFechas.find((p) => p.apellido === "Ruggiero")?.checkin === "2026-09-15",
  "detalle: Ruggiero check-in 15",
);
assert(
  detalleFechas.find((p) => p.apellido === "Longo")?.checkin === "2026-09-16",
  "detalle: Longo check-in 16",
);

if (process.exitCode) {
  console.error("verify-fimba-stay: FAILED");
} else {
  console.log("verify-fimba-stay: OK");
}
