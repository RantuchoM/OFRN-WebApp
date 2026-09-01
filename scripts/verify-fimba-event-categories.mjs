/**
 * Filtro de categoría FIMBA: tabla BD + tipos + filas.
 * Run: node scripts/verify-fimba-event-categories.mjs
 */

import {
  categoriesFromTiposEvento,
  mergeFimbaAgendaCategories,
  normalizeCategoriasTiposEventos,
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
  "catálogo de tipos incluye Catering",
);
assert(
  fromCatalog.map((c) => c.nombre).join(",") === "Catering,Comidas,Ensayos",
  "catálogo de tipos ordenado es",
);

const emptyAgenda = categoriesFromTiposEvento([]);
assert(emptyAgenda.length === 0, "sin tipos no hay categorías derivadas");

const reunionOnlyCategory = categoriesFromTiposEvento([
  { id: 99, nombre: "Huérfano", id_categoria: null },
]);
assert(
  reunionOnlyCategory.length === 0,
  "tipo sin id_categoria no inventa filtro",
);

const dbCats = [
  { id: 9, nombre: "Catering" },
  { id: 7, nombre: "Reunión" },
  { id: 4, nombre: "Comidas" },
];
const fromDb = normalizeCategoriasTiposEventos(dbCats);
assert(
  fromDb.map((c) => c.nombre).join(",") === "Catering,Comidas,Reunión",
  "tabla categorias_tipos_eventos ordenada es",
);

const mergedFromDbOnly = mergeFimbaAgendaCategories({
  dbCategorias: dbCats,
  catalogTipos: [],
  rowDerived: [],
});
assert(
  mergedFromDbOnly.some((c) => c.nombre === "Catering") &&
    mergedFromDbOnly.some((c) => c.nombre === "Reunión"),
  "filtro planilla lista categorías de BD aunque no haya tipos ni eventos",
);

const mergedEmptyAgenda = mergeFimbaAgendaCategories({
  catalogTipos: catalog,
  rowDerived: [],
});
assert(
  mergedEmptyAgenda.some((c) => c.nombre === "Catering"),
  "fallback: catálogo de tipos si aún no llegó la tabla",
);

const mergedWithRows = mergeFimbaAgendaCategories({
  dbCategorias: dbCats,
  catalogTipos: catalog,
  rowDerived: [{ id: 6, nombre: "Transporte" }],
});
assert(
  mergedWithRows.some((c) => c.nombre === "Transporte") &&
    mergedWithRows.some((c) => c.nombre === "Catering") &&
    mergedWithRows.some((c) => c.nombre === "Reunión"),
  "une BD + tipos + categorías de filas cargadas",
);

if (process.exitCode) {
  console.error("verify-fimba-event-categories FAILED");
  process.exit(1);
}
console.log("verify-fimba-event-categories OK");
