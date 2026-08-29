import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  DESTINO_LOCACION_KEY_PREFIX,
  eventDestinoMatchNorms,
  eventLocacionId,
  eventMatchesLocacionFilter,
  locacionKeyFromQuery,
  locacionesFromAgendaRows,
  pruneLocacionFilterKeys,
} from "./fimbaAgendaLocacionFilter.js";

const pscCatalog = {
  id: 4077,
  actividad: "Apertura de sala",
  destino: "Puerto San Carlos",
  id_locacion: null,
};

const pscConcert = {
  id: 3972,
  actividad: "Concierto Cápsula Mercado de la Música",
  destino: "Puerto San Carlos",
  id_locacion: 59,
  locacion_nombre: "Puerto San Carlos",
  locacion_ciudad: "San Carlos de Bariloche",
  locaciones: {
    id: 59,
    nombre: "Puerto San Carlos",
    localidades: { localidad: "San Carlos de Bariloche" },
  },
};

const baitaDestinoOnly = {
  id: 4074,
  actividad: "Apertura de sala",
  destino: "Teatro La Baita",
  id_locacion: null,
};

const baitaCatalog = {
  id: 3928,
  actividad: "Concierto CRIMSON",
  destino: "Teatro La Baita",
  id_locacion: 252,
  locacion_nombre: "Teatro La Baita",
  locacion_ciudad: "San Carlos de Bariloche",
};

const aDefinirViedma = {
  id: 3823,
  // listFimbaAgenda rellena destino con locNombre si no hay línea Destino:
  destino: "A definir",
  id_locacion: 251,
  locacion_nombre: "A definir",
  locacion_ciudad: "Viedma",
};

const aDefinirCipolletti = {
  id: 3824,
  destino: "A definir",
  id_locacion: 104,
  locacion_nombre: "A definir",
  locacion_ciudad: "Cipolletti",
};

const campusInvap = {
  id: 4082,
  destino: "Campus INVAP",
  id_locacion: null,
};

/** Concierto con FK de otro venue y Destino: Puerto San Carlos. */
const pscWrongCatalog = {
  id: 3973,
  actividad: "Concierto Cápsula Mercado de la Música",
  destino: "Puerto San Carlos",
  id_locacion: 7,
  locacion_nombre: "Camping Musical Campus de Artes y Música Bariloche",
  locacion_ciudad: "San Carlos de Bariloche",
};

describe("eventLocacionId", () => {
  it("lee id numérico o embed locaciones.id", () => {
    assert.equal(eventLocacionId({ id_locacion: "59" }), 59);
    assert.equal(eventLocacionId({ locaciones: { id: 59 } }), 59);
    assert.equal(eventLocacionId({ destino: "Puerto San Carlos" }), null);
  });
});

describe("locacionKeyFromQuery", () => {
  it("normaliza ?locacion=59 a clave de catálogo", () => {
    assert.equal(locacionKeyFromQuery("59"), "59");
    assert.equal(locacionKeyFromQuery("d:puerto san carlos"), "d:puerto san carlos");
    assert.equal(locacionKeyFromQuery(""), null);
  });
});

describe("locacionesFromAgendaRows", () => {
  it("une destino texto con el catálogo y no duplica la opción", () => {
    const opts = locacionesFromAgendaRows([pscCatalog, pscConcert, campusInvap]);
    const psc = opts.find((o) => o.id === 59);
    const invap = opts.find((o) => o.key.startsWith(DESTINO_LOCACION_KEY_PREFIX));
    assert.ok(psc);
    assert.equal(psc.nombre, "Puerto San Carlos · San Carlos de Bariloche");
    assert.equal(opts.filter((o) => /puerto san carlos/i.test(o.nombre)).length, 1);
    assert.ok(invap);
    assert.equal(invap.nombre, "Campus INVAP");
  });

  it("no crea opción destino si el nombre ya existe en catálogo", () => {
    const opts = locacionesFromAgendaRows([baitaDestinoOnly, baitaCatalog]);
    assert.equal(opts.length, 1);
    assert.equal(opts[0].id, 252);
  });
});

describe("eventMatchesLocacionFilter", () => {
  it("vacío = todas visibles", () => {
    const opts = locacionesFromAgendaRows([pscCatalog, pscConcert]);
    assert.equal(eventMatchesLocacionFilter(pscCatalog, [], opts), true);
  });

  it("seleccionar Puerto San Carlos incluye apertura solo-destino y concierto con id", () => {
    const opts = locacionesFromAgendaRows([
      pscCatalog,
      pscConcert,
      campusInvap,
      pscWrongCatalog,
    ]);
    const pscKey = opts.find((o) => o.id === 59).key;
    assert.equal(eventMatchesLocacionFilter(pscCatalog, [pscKey], opts), true);
    assert.equal(eventMatchesLocacionFilter(pscConcert, [pscKey], opts), true);
    assert.equal(eventMatchesLocacionFilter(pscWrongCatalog, [pscKey], opts), true);
    assert.equal(eventMatchesLocacionFilter(campusInvap, [pscKey], opts), false);
  });

  it("no cruza «A definir» de distintas ciudades por nombre de catálogo", () => {
    const opts = locacionesFromAgendaRows([aDefinirViedma, aDefinirCipolletti]);
    const viedma = opts.find((o) => o.id === 251);
    assert.ok(viedma);
    assert.equal(eventMatchesLocacionFilter(aDefinirViedma, [viedma.key], opts), true);
    assert.equal(
      eventMatchesLocacionFilter(aDefinirCipolletti, [viedma.key], opts),
      false,
    );
  });

  it("filtra opción solo-destino", () => {
    const opts = locacionesFromAgendaRows([campusInvap, pscConcert]);
    const invap = opts.find((o) => o.id == null);
    assert.ok(invap);
    assert.equal(eventMatchesLocacionFilter(campusInvap, [invap.key], opts), true);
    assert.equal(eventMatchesLocacionFilter(pscConcert, [invap.key], opts), false);
  });

  it("oculta filas sin id ni destino cuando el filtro está activo", () => {
    const opts = locacionesFromAgendaRows([pscConcert]);
    const noLugar = { id: 1, destino: "", id_locacion: null };
    assert.equal(
      eventMatchesLocacionFilter(noLugar, [opts[0].key], opts),
      false,
    );
  });
});

describe("eventDestinoMatchNorms", () => {
  it("acepta «nombre · ciudad» y se queda con el nombre", () => {
    const norms = eventDestinoMatchNorms({
      destino: "Puerto San Carlos · San Carlos de Bariloche",
    });
    assert.ok(norms.includes("puerto san carlos"));
  });
});

describe("pruneLocacionFilterKeys", () => {
  it("saca claves que ya no están en la agenda cargada", () => {
    const opts = locacionesFromAgendaRows([pscConcert]);
    const pruned = pruneLocacionFilterKeys(["59", "d:ghost"], opts);
    assert.deepEqual(pruned, ["59"]);
  });

  it("no limpia la selección mientras las opciones están vacías (carga)", () => {
    assert.deepEqual(pruneLocacionFilterKeys(["59"], []), ["59"]);
  });
});
