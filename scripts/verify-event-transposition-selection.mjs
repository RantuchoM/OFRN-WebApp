/**
 * Filtro de importación de agenda: un concierto destildado no vuelve a entrar.
 * Run: node scripts/verify-event-transposition-selection.mjs
 */
import {
  SIN_TIPO_FILTER_ID,
  buildOriginTypeCategories,
  defaultSelectedTypeIds,
  filterOriginEventsByType,
  pruneSelectedEventIds,
  visibleEventIdSet,
} from "../src/utils/eventTranspositionSelection.js";

function assert(cond, msg) {
  if (!cond) {
    console.error("FAIL:", msg);
    process.exitCode = 1;
  } else {
    console.log("ok:", msg);
  }
}

const concierto = {
  id: 10,
  id_tipo_evento: 1,
  descripcion: "Concierto de abono",
  tipos_evento: {
    nombre: "Concierto",
    categorias_tipos_eventos: { id: 1, nombre: "Conciertos" },
  },
};
const ensayo = {
  id: 11,
  id_tipo_evento: 2,
  descripcion: "Ensayo",
  tipos_evento: {
    nombre: "Ensayo",
    categorias_tipos_eventos: { id: 2, nombre: "Ensayos" },
  },
};
const conciertoSinTipo = {
  id: 2821,
  id_tipo_evento: null,
  descripcion: "Concierto ",
};
const conciertoIdString = {
  id: 12,
  id_tipo_evento: "1",
  descripcion: "Concierto",
  tipos_evento: { nombre: "Concierto" },
};

const events = [concierto, ensayo, conciertoSinTipo, conciertoIdString];

const soloEnsayo = filterOriginEventsByType(events, [2]);
assert(
  soloEnsayo.length === 1 && soloEnsayo[0].id === 11,
  "destildar Concierto deja solo el ensayo",
);

const vacio = filterOriginEventsByType(events, []);
assert(
  vacio.length === 0,
  "sin tipos elegidos no reincluye conciertos (antes el array vacío devolvía todos)",
);

const soloConcierto = filterOriginEventsByType(events, [1]);
assert(
  soloConcierto.map((e) => e.id).join(",") === "10,12",
  "tipo 1 y bigint string '1' son el mismo Concierto; el sin tipo no entra",
);

const sinTipo = filterOriginEventsByType(events, [SIN_TIPO_FILTER_ID]);
assert(
  sinTipo.length === 1 && sinTipo[0].id === 2821,
  "el concierto sin tipo solo entra con el filtro Sin tipo",
);

const defaults = defaultSelectedTypeIds(events);
assert(
  defaults.includes(1) &&
    defaults.includes(2) &&
    defaults.includes(SIN_TIPO_FILTER_ID),
  "al cargar se ven los tipos reales y Sin tipo; los eventos igual arrancan destildados",
);

const visiblesSinConcierto = visibleEventIdSet(
  events,
  defaults.filter((id) => id !== 1),
);
const podados = pruneSelectedEventIds(
  new Set([10, 11, 12, 2821]),
  visiblesSinConcierto,
);
assert(
  !podados.has(10) && !podados.has(12) && podados.has(11) && podados.has(2821),
  "destildar el tipo Concierto saca esos conciertos; el sin tipo queda en su filtro",
);

const todoDestildado = pruneSelectedEventIds(
  new Set([10, 11, 12, 2821]),
  visibleEventIdSet(events, []),
);
assert(
  todoDestildado.size === 0,
  "destildar el último tipo no conserva conciertos seleccionados",
);

const tree = buildOriginTypeCategories(events);
const nombres = tree.flatMap((cat) => cat.tipos.map((t) => t.nombre));
assert(
  nombres.includes("Concierto") && nombres.includes("Sin tipo"),
  "Concierto y Sin tipo son filtros distintos",
);

const conciertosCat = tree.find((cat) => cat.nombre === "Conciertos");
assert(
  conciertosCat?.tipos.length === 1 && conciertosCat.tipos[0].id === 1,
  "la categoría Conciertos no absorbe el evento sin tipo",
);

if (process.exitCode) {
  console.error("verify-event-transposition-selection: hubo fallos");
} else {
  console.log("verify-event-transposition-selection: ok");
}
