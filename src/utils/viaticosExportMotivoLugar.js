import {
  isRecorridosConfig,
  resolveLugarComisionDestaque,
} from "./destaquesLugarComisionRecorridos";
import {
  resolveLocalidadEfectivaViaticos,
  resolveLocalidadNombresReferenciaRecorrido,
} from "./integranteDomicilioViaticos";
import { resolveLugarComisionAutoForRow } from "./viaticosParadasIntegrante";

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

/**
 * Lugar de comisión individual: override de fila → localidades del transporte
 * (subida→bajada) → lugar general de la gira.
 * @param {object} [options]
 * @param {Record<string, object[]>} [options.logisticsTransportsByPerson]
 * @param {object[]} [options.allEvents]
 * @param {string} [options.lugarFromParadas] - precomputado (evita recalcular)
 */
export function resolveLugarViaticosIndividual(row, config = {}, options = {}) {
  const personal = trimOrEmpty(row?.lugar_comision);
  if (personal) return personal;

  const fromParadas = hasText(options.lugarFromParadas)
    ? trimOrEmpty(options.lugarFromParadas)
    : resolveLugarComisionAutoForRow(
        row,
        options.logisticsTransportsByPerson || {},
        options.allEvents || [],
      );
  if (fromParadas) return fromParadas;

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
        : resolveLugarViaticosIndividual(row, config, {
            logisticsTransportsByPerson: options.logisticsTransportsByPerson,
            allEvents: options.allEvents,
          });
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

export function summarizeExportPersonLabels(labels) {
  const unique = [...new Set(labels.filter(Boolean))];
  if (unique.length <= MAX_LISTED) return unique.join("; ");
  const head = unique.slice(0, MAX_LISTED).join("; ");
  return `${head}; y ${unique.length - MAX_LISTED} más`;
}

/** Grupos disjuntos: solo motivo, solo lugar, o ambos. */
export function groupMotivoLugarIssues(issues) {
  const motivoOnly = [];
  const lugarOnly = [];
  const both = [];
  for (const issue of issues || []) {
    const label = issue?.label;
    if (!label) continue;
    if (issue.missingMotivo && issue.missingLugar) both.push(label);
    else if (issue.missingMotivo) motivoOnly.push(label);
    else if (issue.missingLugar) lugarOnly.push(label);
  }
  return { motivoOnly, lugarOnly, both };
}

export function summarizeMotivoLugarGaps(issues) {
  const grouped = groupMotivoLugarIssues(issues);
  const hasMotivo =
    grouped.motivoOnly.length > 0 || grouped.both.length > 0;
  const hasLugar = grouped.lugarOnly.length > 0 || grouped.both.length > 0;
  return { ...grouped, hasMotivo, hasLugar };
}

const WARNING_SECTIONS = [
  { key: "motivo", lead: "Falta", field: "motivo", listKey: "motivoOnly" },
  { key: "lugar", lead: "Falta", field: "lugar", listKey: "lugarOnly" },
  { key: "ambos", lead: "Faltan", field: "ambos", listKey: "both" },
];

export function getMotivoLugarWarningSections(issues) {
  const grouped = summarizeMotivoLugarGaps(issues);
  return WARNING_SECTIONS.filter((section) => grouped[section.listKey].length)
    .map((section) => ({
      key: section.key,
      lead: section.lead,
      field: section.field,
      names: grouped[section.listKey],
      summary: summarizeExportPersonLabels(grouped[section.listKey]),
    }));
}

export function formatMotivoLugarWarningTitle(issues) {
  const { hasMotivo, hasLugar } = summarizeMotivoLugarGaps(issues);
  if (hasMotivo && hasLugar) return "Faltan motivo y lugar de comisión";
  if (hasMotivo) return "Falta el motivo de comisión";
  if (hasLugar) return "Falta el lugar de comisión";
  return "";
}

export function formatMotivoLugarWarningMessage(issues) {
  if (!issues?.length) return "";

  const sections = getMotivoLugarWarningSections(issues);
  const lines = sections.map(
    (section) => `• ${section.lead} ${section.field}: ${section.summary}`,
  );
  lines.push(
    "",
    "Si hay un valor general en la gira (o en destaques), solo se listan quienes no lo heredan.",
    "",
    "¿Deseas exportar igual?",
  );
  return lines.join("\n");
}
