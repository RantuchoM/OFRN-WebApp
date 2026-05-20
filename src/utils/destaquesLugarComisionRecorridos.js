/**
 * Lugar de comisión para destaques: texto plano o JSON de recorridos.
 * JSON: { "v": 1, "tipo": "recorridos", "recorridos": [{ "ids": [1,2,3] }, ...] }
 * Cada integrante ve las localidades posteriores a su punto de corte en el recorrido
 * (referencia: id localidad de viáticos, fallback residencia).
 */

export function parseLugarComisionStored(raw) {
  const t = String(raw ?? "").trim();
  if (!t) return { tipo: "plano", texto: "" };
  if (!t.startsWith("{")) return { tipo: "plano", texto: t };

  try {
    const j = JSON.parse(t);
    if (j?.tipo === "recorridos" && Array.isArray(j.recorridos)) {
      const recorridos = j.recorridos
        .map((r) => {
          const ids = Array.isArray(r) ? r : r?.ids;
          return (ids || []).map((id) => Number(id)).filter((id) => !Number.isNaN(id));
        })
        .filter((ids) => ids.length > 0);
      return { tipo: "recorridos", recorridos, v: j.v ?? 1 };
    }
  } catch {
    /* texto que parecía JSON inválido → plano */
  }
  return { tipo: "plano", texto: t };
}

export function serializeRecorridos(recorridosIds) {
  const recorridos = (recorridosIds || [])
    .filter((ids) => Array.isArray(ids) && ids.length > 0)
    .map((ids) => ({ ids: ids.map((id) => Number(id)) }));
  return JSON.stringify({ v: 1, tipo: "recorridos", recorridos });
}

export function isRecorridosConfig(raw) {
  return parseLugarComisionStored(raw).tipo === "recorridos";
}

export function normalizeLocalidadName(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/** IDs presentes en JSON de recorridos (para completar mapa de nombres). */
export function localityIdsFromRecorridosStored(storedValue) {
  const parsed = parseLugarComisionStored(storedValue);
  if (parsed.tipo !== "recorridos") return [];
  const set = new Set();
  parsed.recorridos.forEach((rec) => {
    rec.forEach((id) => {
      if (id != null && !Number.isNaN(id)) set.add(Number(id));
    });
  });
  return [...set];
}

export function mergeLocalityNameById(...maps) {
  const out = {};
  maps.forEach((map) => {
    if (!map) return;
    Object.entries(map).forEach(([id, name]) => {
      const label = String(name || "").trim();
      if (!label) return;
      out[id] = label;
      out[String(id)] = label;
    });
  });
  return out;
}

function findCutIndexInRecorrido(recorrido, refId, refNames, nameById) {
  if (refId != null) {
    const byId = recorrido.findIndex((id) => String(id) === String(refId));
    if (byId >= 0) return byId;
  }
  const refNorms = (refNames || [])
    .map(normalizeLocalidadName)
    .filter(Boolean);
  if (refNorms.length === 0) return -1;
  return recorrido.findIndex((id) => {
    const label = nameById[id] ?? nameById[String(id)] ?? "";
    const norm = normalizeLocalidadName(label);
    return norm && refNorms.includes(norm);
  });
}

/** @param {Record<string|number, string>} nameById */
export function formatRecorridosSummary(parsed, nameById = {}) {
  if (parsed?.tipo !== "recorridos") return "";
  return parsed.recorridos
    .map((ids, i) => {
      const names = ids.map((id) => nameById[id] ?? nameById[String(id)] ?? `#${id}`);
      return `R${i + 1}: ${names.join(", ")}`;
    })
    .join(" | ");
}

/**
 * Localidades posteriores en el recorrido (nombres unidos por coma).
 * @param {string|number|null} referenciaLocalidadId - id viáticos → residencia
 * @param {Record<string|number, string>} nameById
 * @param {string[]} [referenciaNombres] - fallback por nombre si el id no está en el recorrido
 * @returns {string|null} null si no aplica modo recorridos
 */
export function lugarComisionFromRecorridos(
  parsed,
  referenciaLocalidadId,
  nameById = {},
  referenciaNombres = [],
) {
  if (parsed?.tipo !== "recorridos") return null;
  if (referenciaLocalidadId == null && (!referenciaNombres || referenciaNombres.length === 0)) {
    return null;
  }

  let bestAfterCount = -1;
  let bestResult = null;

  for (const recorrido of parsed.recorridos) {
    const idx = findCutIndexInRecorrido(
      recorrido,
      referenciaLocalidadId,
      referenciaNombres,
      nameById,
    );
    if (idx < 0) continue;
    const after = recorrido.slice(idx + 1);
    const afterCount = after.length;
    if (afterCount > bestAfterCount) {
      bestAfterCount = afterCount;
      bestResult =
        afterCount === 0
          ? ""
          : after
              .map((id) => nameById[id] ?? nameById[String(id)] ?? "")
              .filter(Boolean)
              .join(", ");
    }
  }

  return bestResult;
}

/**
 * Resuelve lugar de comisión para exportación / PDF.
 * @param {string} storedValue - valor en giras_viaticos_config.lugar_comision_destaques_exportacion
 * @param {string|number|null} referenciaLocalidadId - viáticos → residencia (corte en recorrido)
 * @param {Record<string|number, string>} nameById
 */
export function resolveLugarComisionDestaque(
  storedValue,
  referenciaLocalidadId,
  nameById = {},
  referenciaNombres = [],
) {
  const parsed = parseLugarComisionStored(storedValue);
  if (parsed.tipo === "recorridos") {
    const fromRoute = lugarComisionFromRecorridos(
      parsed,
      referenciaLocalidadId,
      nameById,
      referenciaNombres,
    );
    if (fromRoute !== null) return fromRoute;
    return null;
  }
  return parsed.texto || "";
}

/** Vista previa por localidad del panel */
export function buildRecorridosPreview(parsed, localities, nameById = {}) {
  const serialized =
    parsed.tipo === "recorridos" ? serializeRecorridos(parsed.recorridos) : "";
  return (localities || []).map((loc) => {
    const fromRoute = resolveLugarComisionDestaque(serialized, loc.id, nameById);
    const fromRouteText = fromRoute != null ? String(fromRoute).trim() : "";
    return {
      id: loc.id,
      name: loc.name,
      lugarComision: fromRouteText || "—",
    };
  });
}
