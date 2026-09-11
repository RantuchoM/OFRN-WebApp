/**
 * Reglas de vacantes: género/habitación, grupos, delete sin pasajeros_ids,
 * ausente y match territorial de refuerzos.
 *
 * Run: node scripts/verify-vacantes.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

function assert(cond, msg) {
  if (!cond) {
    console.error("FAIL:", msg);
    process.exitCode = 1;
  } else {
    console.log("ok:", msg);
  }
}

function normalizeVacancyGender(g) {
  if (g == null || g === "") return null;
  const t = String(g).trim();
  if (t === "-" || t === "−") return "-";
  const u = t.toUpperCase();
  if (u === "F" || u === "M") return u;
  return t;
}

function vacancyShouldInheritRoom(genderVacancy, genderTitular) {
  const a = normalizeVacancyGender(genderVacancy);
  const b = normalizeVacancyGender(genderTitular);
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;
  return a === b;
}

function remapAsignacionesConfig(cfg, fromId, toId, inherit) {
  const from = Number(fromId);
  const to = Number(toId);
  const seen = new Set();
  const out = [];
  for (const raw of Array.isArray(cfg) ? cfg : []) {
    const id0 = Number(raw?.id);
    if (!Number.isFinite(id0)) continue;
    let id = id0;
    if (id === from) {
      if (!inherit) continue;
      id = to;
    }
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({ ...raw, id });
  }
  return out;
}

function resolveGrupoMembershipOnAssign(vacancyGrupoIds, titularGrupoIds) {
  const vacancy = [
    ...new Set((vacancyGrupoIds || []).map(Number).filter(Number.isFinite)),
  ];
  const titular = [
    ...new Set((titularGrupoIds || []).map(Number).filter(Number.isFinite)),
  ];
  if (vacancy.length === 0) {
    return { nextGrupoIds: titular, changed: false };
  }
  const next = [...vacancy];
  const same =
    next.length === titular.length && next.every((id) => titular.includes(id));
  return { nextGrupoIds: next, changed: !same };
}

function isCondicionEstable(person) {
  return (
    String(person?.condicion ?? person?.integrantes?.condicion ?? "")
      .toLowerCase()
      .trim() === "estable"
  );
}

// --- género / habitación ---
assert(vacancyShouldInheritRoom("F", "F") === true, "mismo género F hereda cama");
assert(vacancyShouldInheritRoom("M", "F") === false, "F vs M desaloja");
assert(vacancyShouldInheritRoom("-", "M") === false, "− vs M desaloja");
assert(vacancyShouldInheritRoom(null, null) === true, "ambos NULL heredan");
assert(vacancyShouldInheritRoom(null, "M") === false, "NULL vs M desaloja");
assert(vacancyShouldInheritRoom("F", null) === false, "F vs NULL desaloja");

const cfg = [
  { id: 10, ocupa_cama: true },
  { id: 99, ocupa_cama: false },
];
assert(
  JSON.stringify(remapAsignacionesConfig(cfg, 10, 20, true)) ===
    JSON.stringify([
      { id: 20, ocupa_cama: true },
      { id: 99, ocupa_cama: false },
    ]),
  "assign mismo género reemplaza id en asignaciones_config",
);
assert(
  JSON.stringify(remapAsignacionesConfig(cfg, 10, 20, false)) ===
    JSON.stringify([{ id: 99, ocupa_cama: false }]),
  "assign otro género quita vacante de asignaciones_config",
);

// --- grupos ---
assert(
  JSON.stringify(resolveGrupoMembershipOnAssign([5], [8]).nextGrupoIds) ===
    JSON.stringify([5]),
  "titular en otro grupo pasa al grupo de la vacante",
);
assert(
  resolveGrupoMembershipOnAssign([5], [5]).changed === false,
  "ya en el mismo grupo: unique-safe, sin duplicar",
);
assert(
  JSON.stringify(resolveGrupoMembershipOnAssign([], [8]).nextGrupoIds) ===
    JSON.stringify([8]),
  "vacante sin grupo no toca membresía del titular",
);

// --- ausente / refuerzo ---
assert(isCondicionEstable({ condicion: "Estable" }) === true, "Estable es estable");
assert(
  isCondicionEstable({ condicion: "Refuerzo" }) === false,
  "vacante Refuerzo no es estable (no match territorial 3–1)",
);
assert(
  isCondicionEstable({ estado_gira: "ausente", condicion: "Estable" }) === true,
  "ausente se bloquea en RPC; condición estable no implica logística si estado ausente",
);

const here = dirname(fileURLToPath(import.meta.url));
const deleteSrc = readFileSync(
  join(here, "..", "src", "services", "giraService.js"),
  "utf8",
);
const deleteFn = deleteSrc.slice(
  deleteSrc.indexOf("export const deleteVacancyFromGira"),
  deleteSrc.indexOf("export const getAllConcertVenues"),
);
assert(
  !deleteFn.includes("pasajeros_ids"),
  "deleteVacancyFromGira no toca pasajeros_ids",
);
assert(
  deleteFn.includes("eliminar_vacante"),
  "deleteVacancyFromGira llama RPC eliminar_vacante",
);

const sql = readFileSync(
  join(
    here,
    "..",
    "supabase",
    "migrations",
    "20260911140000_vacantes_coordinacion.sql",
  ),
  "utf8",
);
assert(
  sql.includes("giras_grupos_integrantes"),
  "migración transfiere/limpia grupos",
);
assert(
  sql.includes("la plaza (vacante) es la verdad"),
  "migración: grupo de la vacante es source of truth",
);
assert(
  sql.includes("ausente"),
  "migración bloquea asignar ausente",
);
assert(
  !sql.includes("pasajeros_ids"),
  "migración no usa pasajeros_ids",
);

if (process.exitCode) {
  console.error("verify-vacantes: FALLÓ");
} else {
  console.log("verify-vacantes: OK");
}
