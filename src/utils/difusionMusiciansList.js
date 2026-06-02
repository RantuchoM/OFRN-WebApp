import { sortSeatingItems } from "../services/giraService";
import { integranteKey } from "./integranteIds";
import { countsTowardInstrumentationConvoked } from "./instrumentation";
import { isConfirmedConvocadoForSeatingReports } from "./seatingRosterGate";
import { SEATING_STRING_INSTR_IDS } from "./seatingStringsComposition";

function isInstrumentist(m) {
  return (
    isConfirmedConvocadoForSeatingReports(m) &&
    countsTowardInstrumentationConvoked(m.rol_gira)
  );
}

function sortByName(a, b) {
  return (
    (a.apellido || "").localeCompare(b.apellido || "", "es") ||
    (a.nombre || "").localeCompare(b.nombre || "", "es")
  );
}

function instrumentCode(m) {
  return String(m?.id_instr ?? "").trim();
}

/**
 * Secciones para el listado de músicos en Difusión.
 * Cuerdas (01–04): orden por contenedores de seating (Violín 1 / Violín 2 separados).
 * Resto: por id_instr y apellido.
 *
 * @returns {{ header: string, musicians: Array }[]}
 */
export function buildDifusionMusiciansSections(
  roster,
  containers,
  containerItems,
) {
  const eligible = (roster || []).filter(isInstrumentist);
  const rosterByKey = new Map(
    eligible.map((m) => [integranteKey(m.id), m]),
  );
  const shownKeys = new Set();
  const sections = [];

  const pushSection = (header, musicians) => {
    if (!musicians?.length) return;
    sections.push({ header, musicians });
    musicians.forEach((m) => shownKeys.add(integranteKey(m.id)));
  };

  const conts = [...(containers || [])].sort(
    (a, b) => (a.orden ?? 0) - (b.orden ?? 0),
  );
  const itemsByContainer = new Map();
  for (const item of containerItems || []) {
    const cid = Number(item.id_contenedor);
    if (!itemsByContainer.has(cid)) itemsByContainer.set(cid, []);
    itemsByContainer.get(cid).push(item);
  }

  for (const c of conts) {
    const items = sortSeatingItems(itemsByContainer.get(Number(c.id)) || []);
    const musicians = items
      .map((it) => rosterByKey.get(integranteKey(it.id_musico)))
      .filter(Boolean);
    pushSection(String(c.nombre || "").trim() || "Grupo", musicians);
  }

  for (const code of SEATING_STRING_INSTR_IDS) {
    const unassigned = eligible
      .filter((m) => {
        const k = integranteKey(m.id);
        return !shownKeys.has(k) && instrumentCode(m) === code;
      })
      .sort(sortByName);
    if (unassigned.length) {
      const label =
        unassigned[0].instrumentos?.instrumento || `Instrumento ${code}`;
      pushSection(label, unassigned);
    }
  }

  const others = eligible.filter((m) => !shownKeys.has(integranteKey(m.id)));
  const byInstr = new Map();
  for (const m of others) {
    const code = instrumentCode(m) || "999";
    if (SEATING_STRING_INSTR_IDS.includes(code)) continue;
    if (!byInstr.has(code)) byInstr.set(code, []);
    byInstr.get(code).push(m);
  }

  [...byInstr.keys()]
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    .forEach((code) => {
      const group = byInstr.get(code).sort(sortByName);
      const label = group[0].instrumentos?.instrumento || `Instrumento ${code}`;
      pushSection(label, group);
    });

  return sections;
}
