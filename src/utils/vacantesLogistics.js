/**
 * Helpers puros de vacantes (género / rooming / condición).
 * La coordinación persistida vive en RPCs; esto documenta y testea las reglas.
 */

export function normalizeVacancyGender(g) {
  if (g == null || g === "") return null;
  const t = String(g).trim();
  if (t === "-" || t === "−") return "-";
  const u = t.toUpperCase();
  if (u === "F" || u === "M") return u;
  return t;
}

/**
 * ¿El titular hereda la cama de la vacante?
 * - Ambos NULL/unknown → sí
 * - Uno NULL y el otro F/M/− → no (no mezclar unknown en habitación genderizada)
 * - F vs M o − vs F/M → no
 * - Mismo valor (incl. ambos −) → sí
 */
export function vacancyShouldInheritRoom(genderVacancy, genderTitular) {
  const a = normalizeVacancyGender(genderVacancy);
  const b = normalizeVacancyGender(genderTitular);
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;
  return a === b;
}

export function normalizeAsignacionesConfig(cfg) {
  if (!Array.isArray(cfg)) return [];
  return cfg
    .map((el) => {
      if (el == null || typeof el !== "object") return null;
      const id = Number(el.id);
      if (!Number.isFinite(id)) return null;
      return { ...el, id, ocupa_cama: el.ocupa_cama !== false };
    })
    .filter(Boolean);
}

/** Reemplaza o quita el ID de vacante en asignaciones_config. */
export function remapAsignacionesConfig(cfg, fromId, toId, inherit) {
  const from = Number(fromId);
  const to = Number(toId);
  const seen = new Set();
  const out = [];
  for (const el of normalizeAsignacionesConfig(cfg)) {
    let id = el.id;
    if (id === from) {
      if (!inherit) continue;
      id = to;
    }
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({ ...el, id });
  }
  return out;
}

export function removeIdFromAsignacionesConfig(cfg, integranteId) {
  return remapAsignacionesConfig(cfg, integranteId, integranteId, false);
}

export function isCondicionEstable(person) {
  const raw = person?.condicion ?? person?.integrantes?.condicion ?? "";
  return String(raw || "")
    .toLowerCase()
    .trim() === "estable";
}

/**
 * Membresía de grupos al asignar titular.
 * Si la vacante está en grupo(s), esos son la verdad de la plaza:
 * el titular queda solo en esos grupos de la gira (sin duplicar).
 * Si la vacante no está en ningún grupo, no se toca la membresía del titular.
 */
export function resolveGrupoMembershipOnAssign(
  vacancyGrupoIds,
  titularGrupoIds,
) {
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
