import { seatingApellidoNombre } from "./integranteDisplayName";
import { integranteKey } from "./integranteIds";
import { hasGiraCobertura } from "./rosterMatrixIds";
import { bajaGirasIntegrantes } from "../services/giraRosterAudit";

export { hasGiraCobertura };

export function coberturaLabelFromRef(ref, fallbackNombre = "") {
  if (ref) {
    const label = seatingApellidoNombre(ref);
    if (label) return label;
  }
  return String(fallbackNombre || "").trim();
}

export function coberturaLabelFromMusician(musician) {
  if (!musician) return "";
  if (musician.cobertura_label) return String(musician.cobertura_label).trim();
  if (musician.cobertura_ref) {
    return coberturaLabelFromRef(musician.cobertura_ref, musician.cobertura_nombre);
  }
  return String(musician.cobertura_nombre || "").trim();
}

/**
 * Quita la fila del integrante que cubría (si había) y limpia vínculo.
 * No toca logística del ausente (ya está ausente).
 */
export async function removeCoberturaCoverPerson(
  supabase,
  { idGira, actorId, coverIntegranteId, motivo = "Fin de cobertura" },
) {
  const coverId = Number(coverIntegranteId);
  if (!Number.isFinite(coverId)) return;
  await bajaGirasIntegrantes(supabase, {
    idGira,
    actorId,
    integranteIds: [coverId],
    motivo,
  });
}

/** Campos de cobertura limpios para upsert del ausente. */
export function emptyCoberturaFields() {
  return {
    cobertura_id_integrante: null,
    cobertura_nombre: null,
    abona_reemplazo: false,
    abona_licencia: false,
  };
}

export function buildCoberturaAusenteFields({
  coberturaIdIntegrante = null,
  coberturaNombre = "",
}) {
  const id = Number(coberturaIdIntegrante);
  const hasId = Number.isFinite(id);
  const nombre = String(coberturaNombre || "").trim();
  return {
    abona_reemplazo: false,
    abona_licencia: false,
    cobertura_id_integrante: hasId ? id : null,
    cobertura_nombre: hasId ? null : nombre || null,
  };
}

/** Mapa coverId → label del ausente al que cubre (para tags C verde). */
export function buildCoberturaCubreLabelMap(roster = []) {
  const map = new Map();
  for (const m of roster || []) {
    if (m?.estado_gira !== "ausente" && m?.estado !== "ausente") continue;
    const coverKey = integranteKey(m.cobertura_id_integrante);
    if (!coverKey) continue;
    const ausenteLabel =
      m.nombre_completo || seatingApellidoNombre(m) || coverKey;
    map.set(coverKey, ausenteLabel);
  }
  return map;
}

/**
 * Tag personal en GiraCard: quién te cubre / a quién cubrís / Asistís.
 * @returns {{ kind: 'cubierto'|'cubre'|'asistis', text: string } | null}
 */
export function personalCoberturaTagFromRow(
  myRow,
  { teCubreLabel = "", cubrisALabel = "", includeAsistis = false } = {},
) {
  if (!myRow) return null;
  const estado = String(myRow.estado || "").toLowerCase();
  if (myRow.es_cobertura) {
    const label = String(cubrisALabel || "").trim();
    return {
      kind: "cubre",
      text: label ? `Cubrís a ${label}` : "Cobertura",
    };
  }
  const hasCobertura =
    myRow.cobertura_id_integrante != null ||
    String(myRow.cobertura_nombre || "").trim();
  if (estado === "ausente" && hasCobertura) {
    const label =
      String(teCubreLabel || "").trim() ||
      String(myRow.cobertura_nombre || "").trim();
    return {
      kind: "cubierto",
      text: label ? `Te cubre ${label}` : "Con cobertura",
    };
  }
  // Editor/admin en nómina presente: ayuda a ubicar a qué gira va.
  if (includeAsistis && estado !== "ausente") {
    return { kind: "asistis", text: "Asistís" };
  }
  return null;
}

/**
 * Resuelve el tag del usuario logueado sobre un programa (listado).
 * Usa `gira.mi_cobertura` si vino del enrich; si no, deriva de `giras_integrantes`.
 */
export function resolveMiCoberturaForUser(
  gira,
  userId,
  { includeAsistis = false } = {},
) {
  if (gira?.mi_cobertura?.text) return gira.mi_cobertura;
  const uid = Number(userId);
  if (!Number.isFinite(uid) || !gira) return null;
  const roster = gira.giras_integrantes || [];
  const mine = roster.find((r) => Number(r.id_integrante) === uid);
  if (!mine) return null;

  let teCubreLabel = String(mine.cobertura_nombre || "").trim();
  if (mine.cobertura_id_integrante != null) {
    const cover = roster.find(
      (r) => Number(r.id_integrante) === Number(mine.cobertura_id_integrante),
    );
    teCubreLabel =
      seatingApellidoNombre(cover?.integrantes) || teCubreLabel;
  }

  let cubrisALabel = "";
  if (mine.es_cobertura) {
    const covered = roster.find(
      (r) => Number(r.cobertura_id_integrante) === uid,
    );
    cubrisALabel = seatingApellidoNombre(
      covered?.integrantes || covered,
    );
  }

  const tag = personalCoberturaTagFromRow(mine, {
    teCubreLabel,
    cubrisALabel,
    includeAsistis,
  });
  if (!tag) return null;
  return {
    ...tag,
    estado: mine.estado,
    es_cobertura: Boolean(mine.es_cobertura),
    hideAgenda: tag.kind === "cubierto",
  };
}
