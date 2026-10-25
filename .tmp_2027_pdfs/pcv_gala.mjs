/** Verifica Gala lírica → 4,75 con tramos empalmados. */
import {
  estimatePcvFromFueraSegs,
  groupFueraTrips,
} from "../src/utils/giraProyeccionPcv.js";

// Inline calc without module resolution issues for viaticos — re-test via estimate if import works
const demorasMap = new Map([
  ["57|16", { minutos: 410 }],
  ["16|57", { minutos: 410 }],
  ["57|60", { minutos: 410 }],
  ["60|57", { minutos: 410 }],
]);

const fueraSegs = [
  {
    indice: 0,
    fecha_desde: "2027-06-02",
    fecha_hasta: "2027-06-05",
    localidad_ids: [16],
  },
  {
    indice: 1,
    fecha_desde: "2027-06-05",
    fecha_hasta: "2027-06-05",
    localidad_ids: [60],
  },
];

console.log("trips", groupFueraTrips(fueraSegs).length);
const r = estimatePcvFromFueraSegs({
  homeLocId: 57,
  fueraSegs,
  fechaDesdeFallback: "2027-06-02",
  fechaHastaFallback: "2027-06-05",
  horaInicioProy: "15:00",
  horaFinProy: "23:00",
  demorasMap,
  locNameById: new Map([
    [57, "Viedma"],
    [16, "Cipolletti"],
    [60, "Villa Regina"],
  ]),
});
console.log(JSON.stringify(r, null, 2));
