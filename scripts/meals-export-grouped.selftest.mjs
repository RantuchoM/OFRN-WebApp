/**
 * Agrupación por locación/artista + especificaciones alimenticias.
 * Run:
 *   npx esbuild scripts/meals-export-grouped.selftest.mjs --bundle --platform=node --format=esm --outfile=/tmp/meals-export-selftest.mjs && node /tmp/meals-export-selftest.mjs
 */

import { writeFileSync, mkdirSync } from "node:fs";
import {
  collectMealCasos,
  collectNonStandardCasosFromRows,
  formatMealCasoLine,
  isStandardMealDiet,
  buildMealsPedidoText,
  scopeMealsReportRowToArtista,
} from "../src/utils/mealsReportText.js";
import {
  buildMealsReportBundlesByArtista,
  buildMealsReportBundlesByLocacion,
} from "../src/utils/mealsReportBundles.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

assert(isStandardMealDiet("Regular"), "regular es estándar");
assert(isStandardMealDiet("Estándar"), "estándar con tilde");
assert(isStandardMealDiet("Estandar"), "estandar sin tilde");
assert(!isStandardMealDiet("Celíaco"), "celíaco no es estándar");
assert(!isStandardMealDiet("Vegetariano"), "vegetariano no es estándar");

const partsByProp = new Map([
  [
    "10",
    [
      {
        activo: true,
        nombre: "Ana",
        apellido: "Pérez",
        tipo_alimentacion: "celiaco",
        nota_alimentacion: "sin trazas",
      },
      {
        activo: true,
        nombre: "Luis",
        apellido: "Gómez",
        tipo_alimentacion: "regular",
      },
    ],
  ],
]);

const casos = collectMealCasos({
  ofrnPeople: [
    { apellido: "Ruiz", nombre: "Marta", alimentacion: "Vegetariano" },
    { apellido: "Sosa", nombre: "Juan", alimentacion: "Estándar" },
  ],
  propuestas: [
    { id: 10, nombre: "Los Nocheros", cantidad_planificada: 4, requiere_comidas: true },
  ],
  participantesByPropuestaId: partsByProp,
  labelFn: (tipo, nota) => {
    if (tipo === "celiaco") return "Celíaco";
    if (tipo === "regular") return "Regular";
    return nota || "Regular";
  },
});

assert(casos.length === 6, `6 casos (2 OFRN + 2 nominados + 2 residuales), got ${casos.length}`);
assert(
  casos.filter((c) => c.origen === "OFRN").length === 2,
  "2 OFRN",
);
assert(
  casos.filter((c) => c.apellido === "(por confirmar)").length === 2,
  "2 residuales FIMBA",
);
assert(
  casos.some((c) => c.apellido === "Pérez" && c.alimentacion === "Celíaco"),
  "Ana Pérez celíaca",
);

const noComida = collectMealCasos({
  propuestas: [
    { id: 10, nombre: "X", cantidad_planificada: 3, requiere_comidas: false },
  ],
  participantesByPropuestaId: partsByProp,
  labelFn: () => "Regular",
});
assert(noComida.length === 0, "requiere_comidas false no genera casos");

const rowHotel = {
  fecha: "2026-09-15",
  hora: "12:30",
  servicio: "Almuerzo",
  servicioLabel: "Almuerzo",
  lugar: "Hotel NH - Bariloche",
  locacionLabel: "Hotel NH",
  locKey: "82",
  counts: { Total: 5, Regular: 3, Celíaco: 1, Vegetariano: 1 },
  ofrnCounts: { Total: 2, Vegetariano: 1, Estándar: 1 },
  propuestas: [
    { id: 10, nombre: "Los Nocheros", cantidad_planificada: 4, requiere_comidas: true },
  ],
  casos,
};
const rowOtroLugar = {
  ...rowHotel,
  locKey: "99",
  locacionLabel: "Teatro",
  lugar: "Teatro - Bariloche",
  propuestas: [
    { id: 22, nombre: "Otro", cantidad_planificada: 1, requiere_comidas: true },
  ],
};

const byLoc = buildMealsReportBundlesByLocacion([rowHotel, rowOtroLugar]);
assert(byLoc.length === 2, `2 locaciones, got ${byLoc.length}`);
assert(
  byLoc[0].nombre === "Hotel NH" || byLoc[1].nombre === "Hotel NH",
  "incluye Hotel NH",
);
const hotelBundle = byLoc.find((b) => b.id === "82");
assert(hotelBundle.rows.length === 1, "hotel tiene 1 servicio");
assert(hotelBundle.rows[0].casos.length === 6, "casos viajan con la fila");

const onlyHotel = buildMealsReportBundlesByLocacion(
  [rowHotel, rowOtroLugar],
  ["82"],
);
assert(onlyHotel.length === 1 && onlyHotel[0].id === "82", "filtro onlyLocKeys");

const dietBreakdownStub = (props, partsMap, labelFn) => {
  const dietCounts = {};
  let residualArt = 0;
  let total = 0;
  for (const p of props) {
    const parts = partsMap.get(String(p.id)) || [];
    const activos = parts.filter((x) => x.activo !== false);
    for (const part of activos) {
      const lab = labelFn(part.tipo_alimentacion, part.nota_alimentacion);
      dietCounts[lab] = (dietCounts[lab] || 0) + 1;
    }
    const plan = Number(p.cantidad_planificada) || 0;
    residualArt += Math.max(0, plan - activos.length);
    total += plan === 0 ? activos.length : plan;
  }
  return { dietCounts, residualArt, total };
};

const byArtist = buildMealsReportBundlesByArtista(
  [rowHotel, rowOtroLugar],
  partsByProp,
  (tipo) => (tipo === "celiaco" ? "Celíaco" : "Regular"),
  null,
  dietBreakdownStub,
);
assert(byArtist.some((b) => b.id === "10"), "artista 10 presente");
const noch = byArtist.find((b) => b.id === "10");
assert(noch.rows.length === 1, "Los Nocheros solo en hotel (no en teatro)");
assert(
  (noch.rows[0].casos || []).every((c) => String(c.id_propuesta) === "10"),
  "casos del artista acotados",
);
assert(
  (noch.rows[0].casos || []).some((c) => c.apellido === "Pérez"),
  "nominada Pérez en bundle artista",
);

const scoped = scopeMealsReportRowToArtista(
  rowHotel,
  "10",
  partsByProp,
  (tipo) => (tipo === "celiaco" ? "Celíaco" : "Regular"),
  dietBreakdownStub,
);
assert(
  scoped.casos.every((c) => String(c.id_propuesta) === "10"),
  "scope quita OFRN y otros artistas",
);

const specs = collectNonStandardCasosFromRows([rowHotel]);
assert(specs.length >= 2, "Pérez celíaca + Ruiz vegetariana");
assert(
  specs.every((c) => !isStandardMealDiet(c.alimentacion)),
  "solo no-estándar",
);
const line = formatMealCasoLine({
  apellido: "Pérez",
  nombre: "Ana",
  artista: "Los Nocheros",
  alimentacion: "Celíaco",
  nota: "sin trazas",
});
assert(line.includes("Pérez, Ana"), "nombre en línea");
assert(line.includes("Los Nocheros"), "artista en línea");
assert(line.includes("Celíaco"), "dieta en línea");
assert(line.includes("sin trazas"), "nota en línea");

const text = buildMealsPedidoText([rowHotel], {
  includeStayBlocks: false,
  includeCasos: true,
});
assert(text.includes("Especificaciones alimenticias"), "bloque specs en texto");
assert(text.includes("Pérez, Ana"), "nominada en texto pedido");

const textNoSpecs = buildMealsPedidoText(
  [{ ...rowHotel, casos: [], counts: { Total: 2, Regular: 2 } }],
  { includeStayBlocks: false, includeCasos: true },
);
assert(
  !textNoSpecs.includes("Especificaciones alimenticias"),
  "sin bloque si no hay excepciones",
);

const outDir = process.env.MEALS_EXPORT_ARTIFACT_DIR || "/opt/cursor/artifacts";
mkdirSync(outDir, { recursive: true });
writeFileSync(`${outDir}/fimba-comidas-pedido-hotel-nh.txt`, text, "utf8");

console.log("meals-export-grouped.selftest: ok");
console.log(`pedido: ${outDir}/fimba-comidas-pedido-hotel-nh.txt`);
