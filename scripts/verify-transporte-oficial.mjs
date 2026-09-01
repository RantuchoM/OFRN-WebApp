/**
 * Vehículo oficial: check de viáticos/destaques.
 * Run: node scripts/verify-transporte-oficial.mjs
 */

import {
  isTransporteOficial,
  resolveCheckPatenteOficial,
} from "../src/utils/transporteOficial.js";

function assert(cond, msg) {
  if (!cond) {
    console.error("FAIL:", msg);
    process.exitCode = 1;
  } else {
    console.log("ok:", msg);
  }
}

assert(!isTransporteOficial(null), "null no es oficial");
assert(!isTransporteOficial({ patente: "ABC123" }), "sin flag no es oficial");
assert(isTransporteOficial({ es_oficial: true }), "flag plano es oficial");
assert(
  isTransporteOficial({ transportes: { es_oficial: true } }),
  "join transportes.es_oficial es oficial",
);
assert(
  isTransporteOficial({ transporteData: { es_oficial: true } }),
  "transporteData.es_oficial es oficial",
);
assert(
  !isTransporteOficial({ transportes: { es_oficial: false } }),
  "join false no es oficial",
);

assert(
  resolveCheckPatenteOficial(false, true) === true,
  "export tilda oficial si el bus es oficial aunque stored sea false",
);
assert(
  resolveCheckPatenteOficial(true, false) === true,
  "export respeta check manual true",
);
assert(
  resolveCheckPatenteOficial(false, false) === false,
  "sin stored ni bus oficial no tilda",
);
assert(
  resolveCheckPatenteOficial(undefined, true) === true,
  "stored undefined + bus oficial tilda",
);

if (process.exitCode) {
  console.error("verify-transporte-oficial: FAILED");
} else {
  console.log("verify-transporte-oficial: all passed");
}
