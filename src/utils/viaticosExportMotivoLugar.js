import {
  isRecorridosConfig,
  resolveLugarComisionDestaque,
} from "./destaquesLugarComisionRecorridos";
import {
  resolveLocalidadEfectivaViaticos,
  resolveLocalidadNombresReferenciaRecorrido,
} from "./integranteDomicilioViaticos";

/** PDF de viático, destaque o rendición requieren motivo y lugar de comisión. */
export function exportIncludesMotivoLugarPdf(options) {
  return !!(options?.viatico || options?.destaque || options?.rendicion);
}

/** Texto usable en PDF: null, undefined, "" y solo espacios cuentan como vacío. */
export function trimOrEmpty(v) {
  if (v == null) return "";
  return String(v).trim();
}

export function hasText(v) {
  return trimOrEmpty(v).length > 0;
}

export function resolveMotivoViaticosIndividual(row, config = {}) {
  const personal = trimOrEmpty(row?.motivo);
  if (personal) return personal;
  return trimOrEmpty(config.motivo);
}

export function resolveLugarViaticosIndividual(row, config = {}) {
  const personal = trimOrEmpty(row?.lugar_comision);
  if (personal) return personal;
  return trimOrEmpty(config.lugar_comision);
}

export function resolveMotivoDestaqueExport(person, config = {}) {
  const personal = trimOrEmpty(person?.motivo);
  if (personal) return personal;
  const destaques = trimOrEmpty(config.motivo_destaques_exportacion);
  if (destaques) return destaques;
  return trimOrEmpty(config.motivo);
}

export function resolveLugarDestaqueExport(
  person,
  config = {},
  localityNameById = {},
) {
  const lugarStored = config.lugar_comision_destaques_exportacion;
  if (isRecorridosConfig(lugarStored)) {
    const locEfectiva = resolveLocalidadEfectivaViaticos(person);
    const refLocId = locEfectiva?.id ?? person?._massConfigId;
    const refLocNombres = resolveLocalidadNombresReferenciaRecorrido(person);
    const fromRoute = resolveLugarComisionDestaque(
      lugarStored,
      refLocId,
      localityNameById,
      refLocNombres,
    );
    return fromRoute != null ? trimOrEmpty(fromRoute) : "";
  }
  const destaques = trimOrEmpty(lugarStored);
  if (destaques) return destaques;
  return trimOrEmpty(config.lugar_comision);
}

export function formatExportPersonLabel(row) {
  const name = `${row?.apellido || ""}, ${row?.nombre || ""}`.trim();
  const group = row?._groupName ? ` (${row._groupName})` : "";
  const base = `${name}${group}`.trim();
  return base || `Registro ${row?.id ?? "?"}`;
}

/**
 * Valida motivo/lugar con la misma cadena de fallback que el PDF.
 * @param {object[]} rows - filas crudas (tabla o roster destaques), sin normalizar
 * @param {object} config - giras_viaticos_config
 * @param {object} options - flags viatico/destaque/rendicion + isDestaquesBatch + localityNameById
 */
export function collectMotivoLugarWarningsForExport(rows, config, options = {}) {
  if (!exportIncludesMotivoLugarPdf(options)) return [];

  const localityNameById = options.localityNameById || {};
  const isDestaquesBatch = !!options.isDestaquesBatch;
  const issues = [];
  const seen = new Set();

  for (const row of rows || []) {
    const label = formatExportPersonLabel(row);
    let missingMotivo = false;
    let missingLugar = false;

    if (options.viatico || options.destaque) {
      const motivo = isDestaquesBatch
        ? resolveMotivoDestaqueExport(row, config)
        : resolveMotivoViaticosIndividual(row, config);
      const lugar = isDestaquesBatch
        ? resolveLugarDestaqueExport(row, config, localityNameById)
        : resolveLugarViaticosIndividual(row, config);
      if (!hasText(motivo)) missingMotivo = true;
      if (!hasText(lugar)) missingLugar = true;
    }

    if (options.rendicion) {
      if (!hasText(resolveMotivoViaticosIndividual(row, config))) {
        missingMotivo = true;
      }
      // Rendición PDF usa config.lugar_comision (no el lugar por fila).
      if (!hasText(config?.lugar_comision)) {
        missingLugar = true;
      }
    }

    if (!missingMotivo && !missingLugar) continue;

    const key = `${label}|${missingMotivo}|${missingLugar}`;
    if (seen.has(key)) continue;
    seen.add(key);

    issues.push({ label, missingMotivo, missingLugar });
  }

  return issues;
}

/** @deprecated Usar collectMotivoLugarWarningsForExport con config y options. */
export function collectMotivoLugarWarnings(rows) {
  return collectMotivoLugarWarningsForExport(rows, {}, {
    viatico: true,
  });
}

const MAX_LISTED = 12;

function summarizeLabels(labels) {
  const unique = [...new Set(labels.filter(Boolean))];
  if (unique.length <= MAX_LISTED) return unique.join("; ");
  const head = unique.slice(0, MAX_LISTED).join("; ");
  return `${head}; y ${unique.length - MAX_LISTED} más`;
}

export function formatMotivoLugarWarningMessage(issues) {
  if (!issues?.length) return "";

  const sinMotivo = issues.filter((i) => i.missingMotivo).map((i) => i.label);
  const sinLugar = issues.filter((i) => i.missingLugar).map((i) => i.label);

  const lines = [
    "Faltan motivo y/o lugar de comisión para el PDF en:",
    "",
  ];
  if (sinMotivo.length) {
    lines.push(`• Sin motivo: ${summarizeLabels(sinMotivo)}`);
  }
  if (sinLugar.length) {
    lines.push(`• Sin lugar de comisión: ${summarizeLabels(sinLugar)}`);
  }
  lines.push(
    "",
    "Si hay un valor general en la gira (o en destaques), solo se listan quienes no lo heredan.",
    "",
    "¿Deseas exportar igual?",
  );
  return lines.join("\n");
}
