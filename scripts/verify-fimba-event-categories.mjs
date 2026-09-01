/**
 * Filtro de categoría FIMBA: catálogo + filas; Catering aparece sin eventos.
 * Run: node scripts/verify-fimba-event-categories.mjs
 */

import {
  categoriesFromTiposEvento,
  mergeFimbaAgendaCategories,
} from "../src/utils/fimbaEventCategories.js";

function assert(cond, msg) {
  if (!cond) {
    console.error("FAIL:", msg);
    process.exitCode = 1;
  } else {
    console.log("ok:", msg);
  }
}

const catalog = [
  {
    id: 8,
    nombre: "Catering",
    id_categoria: 8,
    categoria_nombre: "Catering",
    categorias_tipos_eventos: { id: 8, nombre: "Catering" },
  },
  {
    id: 7,
    nombre: "Desayuno",
    id_categoria: 4,
    categoria_nombre: "Comidas",
    categorias_tipos_eventos: { id: 4, nombre: "Comidas" },
  },
  {
    id: 2,
    nombre: "Ensayo",
    id_categoria: 2,
    categoria_nombre: "Ensayos",
    categorias_tipos_eventos: { id: 2, nombre: "Ensayos" },
  },
];

const fromCatalog = categoriesFromTiposEvento(catalog);
assert(
  fromCatalog.some((c) => c.id === 8 && c.nombre === "Catering"),
  "catálogo incluye Catering",
);
assert(
  fromCatalog.map((c) => c.nombre).join(",") === "Catering,Comidas,Ensayos",
  "catálogo ordenado es",
);

const emptyAgenda = categoriesFromTiposEvento([]);
assert(emptyAgenda.length === 0, "sin tipos no hay categorías");

const reunionOnlyCategory = categoriesFromTiposEvento([
  { id: 99, nombre: "Huérfano", id_categoria: null },
]);
assert(
  reunionOnlyCategory.length === 0,
  "tipo sin id_categoria no inventa filtro (Reunión vacía)",
);

const mergedEmptyAgenda = mergeFimbaAgendaCategories(catalog, []);
assert(
  mergedEmptyAgenda.some((c) => c.nombre === "Catering"),
  "filtro planilla muestra Catering aunque la agenda esté vacía",
);

const mergedWithRows = mergeFimbaAgendaCategories(catalog, [
  { id: 6, nombre: "Transporte" },
]);
assert(
  mergedWithRows.some((c) => c.nombre === "Transporte") &&
    mergedWithRows.some((c) => c.nombre === "Catering"),
  "une catálogo + categorías de filas cargadas",
);

if (process.exitCode) {
  console.error("verify-fimba-event-categories FAILED");
  process.exit(1);
}
console.log("verify-fimba-event-categories OK");
