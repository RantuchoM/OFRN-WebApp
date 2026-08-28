/**
 * Estadía FIMBA por persona (Ruggiero cuarteto + herencia del artista).
 * Run: node scripts/verify-fimba-stay.mjs
 */

import {
  computeStayOccupancy,
  resolveParticipanteStay,
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

if (process.exitCode) {
  console.error("verify-fimba-stay: FAILED");
} else {
  console.log("verify-fimba-stay: OK");
}
