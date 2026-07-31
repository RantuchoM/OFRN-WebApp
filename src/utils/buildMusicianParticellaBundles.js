import { isRegionalConvocatoriaEnsamble } from "./convocatoriaEnsambleViews";
import { filterMembershipRowsForProgramDate } from "./ensembleMembership";

const isStringInstrumentId = (id) =>
  ["01", "02", "03", "04"].includes(String(id || ""));

export function getMusicianPartIds(musicianAssignments, key) {
  const ids = musicianAssignments?.[key];
  if (!Array.isArray(ids)) return [];
  return ids.filter(
    (id, index) =>
      id &&
      ids.findIndex((candidate) => String(candidate) === String(id)) === index,
  );
}

export function musicianDisplayName(m) {
  return (
    m.apellido_nombre ||
    m.nombre_completo ||
    [m.apellido, m.nombre].filter(Boolean).join(", ") ||
    [m.nombre, m.apellido].filter(Boolean).join(" ") ||
    m.display_name ||
    m.name ||
    `Músico ${m.id}`
  );
}

export function musicianSortName(m) {
  const ap = String(m.apellido || "").trim();
  const no = String(m.nombre || "").trim();
  if (ap || no) return `${ap} ${no}`.trim();
  return musicianDisplayName(m);
}

export function parseParticellaLinks(urlArchivo) {
  if (!urlArchivo) return [];
  try {
    const trimmed = String(urlArchivo).trim();
    if (trimmed.startsWith("[")) {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.map((l) => ({ url: l.url })).filter((l) => l.url);
      }
    }
    return [{ url: urlArchivo }];
  } catch {
    return [{ url: urlArchivo }];
  }
}

/**
 * Particellas asignadas a un músico en una obra (individual o vía contenedor de cuerdas).
 */
export function getPartIdsForMusicianObra({
  musicianId,
  obraId,
  assignments = {},
  musicianAssignments = {},
  containers = [],
}) {
  const mKey = `M-${musicianId}-${obraId}`;
  const fromMusician = getMusicianPartIds(musicianAssignments, mKey);
  if (fromMusician.length) return fromMusician;

  for (const c of containers) {
    const inContainer = (c.items || []).some(
      (item) => String(item.id_musico) === String(musicianId),
    );
    if (!inContainer) continue;
    const partId = assignments[`C-${c.id}-${obraId}`];
    if (partId) return [partId];
  }
  return [];
}

/**
 * @returns {Map<string, { ensambles: string[], regionalKey: string }>}
 */
export function buildMembershipIndex(membershipRows, programDate) {
  const active = filterMembershipRowsForProgramDate(
    membershipRows || [],
    programDate,
  );
  const byMusician = new Map();
  for (const row of active) {
    const mid = String(row.id_integrante);
    const name = row.ensambles?.ensamble || row.ensamble || "";
    if (!byMusician.has(mid)) {
      byMusician.set(mid, { ensambles: [], regionalKey: "" });
    }
    const entry = byMusician.get(mid);
    if (name && !entry.ensambles.includes(name)) {
      entry.ensambles.push(name);
    }
    if (!entry.regionalKey && isRegionalConvocatoriaEnsamble({ ensamble: name })) {
      entry.regionalKey = name;
    }
  }
  return byMusician;
}

/**
 * Construye filas de músicos con sus partes por obra (solo obras con asignación).
 */
export function buildMusicianParticellaBundles({
  roster = [],
  obras = [],
  selectedObraIds,
  assignments = {},
  musicianAssignments = {},
  containers = [],
  particellas = [],
  membershipByMusician = new Map(),
  sortMode = "alpha",
}) {
  const obraIdSet =
    selectedObraIds instanceof Set
      ? selectedObraIds
      : new Set((selectedObraIds || []).map(String));

  const selectedObras = (obras || []).filter((o) =>
    obraIdSet.has(String(o.obra_id)),
  );

  const particellaById = new Map(
    (particellas || []).map((p) => [String(p.id), p]),
  );

  const bundles = [];

  for (const m of roster || []) {
    const parts = [];
    for (const obra of selectedObras) {
      const obraId = obra.obra_id;
      const partIds = getPartIdsForMusicianObra({
        musicianId: m.id,
        obraId,
        assignments,
        musicianAssignments,
        containers,
      });
      for (const partId of partIds) {
        const part = particellaById.get(String(partId));
        if (!part) continue;
        const links = parseParticellaLinks(part.url_archivo);
        parts.push({
          obraId,
          obra,
          partId: part.id,
          partKey: `P-${part.id}`,
          displayName:
            part.nombre_archivo ||
            part.instrumentos?.instrumento ||
            `Particella ${part.id}`,
          links,
          hasMultipleLinks: links.length > 1,
          idInstrumento: part.id_instrumento ?? part.instrumentos?.id ?? "",
        });
      }
    }
    if (!parts.length) continue;

    const mem = membershipByMusician.get(String(m.id)) || {
      ensambles: [],
      regionalKey: "",
    };

    bundles.push({
      musician: m,
      musicianId: m.id,
      displayName: musicianDisplayName(m),
      sortName: musicianSortName(m),
      idInstr: String(m.id_instr || ""),
      instrumentoLabel:
        m.instrumento || m.instrument || m.instrumentos?.instrumento || "",
      ensambles: mem.ensambles,
      regionalKey: mem.regionalKey,
      isString: isStringInstrumentId(m.id_instr),
      parts,
    });
  }

  const byApellido = (a, b) =>
    a.sortName.localeCompare(b.sortName, "es", { sensitivity: "base" });

  bundles.sort((a, b) => {
    if (sortMode === "instrument") {
      const cmp = a.idInstr.localeCompare(b.idInstr, undefined, {
        numeric: true,
      });
      if (cmp !== 0) return cmp;
      return byApellido(a, b);
    }
    if (sortMode === "ensamble") {
      const ka = a.regionalKey || "\uffff";
      const kb = b.regionalKey || "\uffff";
      const cmp = ka.localeCompare(kb, "es", { sensitivity: "base" });
      if (cmp !== 0) return cmp;
      return byApellido(a, b);
    }
    return byApellido(a, b);
  });

  return bundles;
}

export function safeFileToken(value, fallback = "x") {
  return String(value || fallback)
    .replace(/<[^>]*>?/gm, "")
    .replace(/[^a-zA-Z0-9-_]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 80) || fallback;
}
