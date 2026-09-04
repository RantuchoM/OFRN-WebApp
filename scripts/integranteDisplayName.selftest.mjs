import {
  applySeatingDisplayNames,
  legalApellidoNombre,
  seatingApellidoInicial,
  seatingApellidoNombre,
  seatingNombre,
  seatingApellido,
} from "../src/utils/integranteDisplayName.js";
import { dietsDiffer } from "../src/utils/dietOptions.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const legal = {
  nombre: "María José",
  apellido: "González Pérez",
};

assert(seatingNombre(legal) === "María José", "sin preferencia usa nombre legal");
assert(seatingApellido(legal) === "González Pérez", "sin preferencia usa apellido legal");
assert(
  seatingApellidoNombre(legal) === "González Pérez, María José",
  "formato seating legal",
);

const prefBoth = {
  ...legal,
  nombre_preferencia: "Malena",
  apellido_preferencia: "González",
};
assert(seatingNombre(prefBoth) === "Malena", "nombre preferencia");
assert(seatingApellido(prefBoth) === "González", "apellido preferencia");
assert(
  seatingApellidoNombre(prefBoth) === "González, Malena",
  "ambos preferencia",
);
assert(
  seatingApellidoInicial(prefBoth) === "González, M.",
  "inicial con preferencia",
);
assert(
  legalApellidoNombre(prefBoth) === "González Pérez, María José",
  "legal no cambia",
);

const prefOnlyName = {
  ...legal,
  nombre_preferencia: "Malena",
};
assert(
  seatingApellidoNombre(prefOnlyName) === "González Pérez, Malena",
  "solo nombre de preferencia",
);

const mapped = applySeatingDisplayNames(prefBoth);
assert(mapped.nombre === "Malena", "apply overwrites nombre");
assert(mapped.apellido === "González", "apply overwrites apellido");
assert(mapped.nombre_legal === "María José", "conserva legal");
assert(mapped.apellido_legal === "González Pérez", "conserva legal apellido");
assert(legalApellidoNombre(mapped) === "González Pérez, María José", "legal helper");
assert(seatingApellidoNombre(mapped) === "González, Malena", "seating helper after apply");

assert(dietsDiffer("General", "Vegana") === true, "dietas distintas");
assert(dietsDiffer("  General ", "General") === false, "dietas iguales con trim");

console.log("integranteDisplayName.selftest: ok");
