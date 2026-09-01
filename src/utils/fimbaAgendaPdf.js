import { buildAgendaPdfExportItems } from "./agendaHelpers";
import { exportAgendaToPDF } from "./agendaPdfExporter";
import { labelGiraTransporte } from "../services/fimbaService";

/**
 * Resuelve la unidad de flota primaria para el chip de transporte del PDF OFRN
 * (`giras_transportes.transportes`). Preferencia: 1ª asignación FIMBA → flota por
 * `id_gira_transporte` (parada OFRN / ride).
 */
function resolvePrimaryGiraTransporte(ev, flotaById = null) {
  const fromAssign = ev?.vehiculos?.[0]?.giras_transportes;
  if (fromAssign) return fromAssign;
  if (ev?.id_gira_transporte == null || !flotaById) return null;
  const id = Number(ev.id_gira_transporte);
  if (!Number.isFinite(id)) return null;
  if (typeof flotaById.get === "function") {
    return flotaById.get(id) || null;
  }
  return flotaById[id] || flotaById[String(id)] || null;
}

/**
 * Descripción para el PDF: Detalle FIMBA (`actividad`) + destino/vuelo + artistas
 * + vehículos extra (el exporter solo dibuja un chip de transporte).
 * No usa el encode crudo `Destino:` / `Vuelo:` de `eventos.descripcion`.
 */
function buildFimbaPdfDescription(ev) {
  const parts = [];
  const actividad = String(ev?.actividad || "").trim();
  if (actividad) parts.push(actividad);

  if (!ev?.es_ride_segment) {
    const destVuelo = [ev?.destino, ev?.vuelo]
      .map((s) => String(s || "").trim())
      .filter(Boolean)
      .join(" · ");
    if (destVuelo) parts.push(destVuelo);
  }

  const artists = (ev?.propuestas || [])
    .map((p) => String(p?.nombre || "").trim())
    .filter(Boolean);
  if (artists.length > 0) {
    parts.push(`Artistas: ${artists.join(", ")}`);
  }

  const extraVeh = (ev?.vehiculos || [])
    .slice(1)
    .map((r) => labelGiraTransporte(r?.giras_transportes))
    .filter((label) => label && label !== "Vehículo");
  if (extraVeh.length > 0) {
    parts.push(`+ ${extraVeh.join(", ")}`);
  }

  if (parts.length === 0) {
    return (
      ev?.tipos_evento?.nombre ||
      ev?.tipo_nombre ||
      ""
    );
  }
  return parts.join("\n");
}

/**
 * Adapta filas de agenda FIMBA al shape que consume `exportAgendaToPDF`
 * (mismo pipeline que UnifiedAgenda).
 *
 * @param {Array<object>} rows — filas ya filtradas (planilla / consulta artista)
 * @param {{ flotaById?: Map|Record|null }} [opts]
 * @returns {Array<object>}
 */
export function mapFimbaAgendaRowsForPdf(rows, { flotaById = null } = {}) {
  return (rows || []).map((ev) => {
    const giras_transportes = resolvePrimaryGiraTransporte(ev, flotaById);
    return {
      ...ev,
      descripcion: buildFimbaPdfDescription(ev),
      tipos_evento: ev.tipos_evento || {
        id: ev.id_tipo_evento,
        nombre: ev.tipo_nombre || "",
        color: ev.tipo_color || null,
      },
      locaciones: ev.locaciones || null,
      giras_transportes: giras_transportes || undefined,
      isProgramMarker: false,
    };
  });
}

/**
 * Exporta la vista filtrada de agenda FIMBA reusando `exportAgendaToPDF`.
 * Columna Gira oculta (contexto 1 edición / 1 gira).
 *
 * @param {Array<object>} filteredRows
 * @param {{
 *   title?: string,
 *   subTitle?: string,
 *   flotaById?: Map|Record|null,
 * }} [opts]
 * @returns {number} cantidad de filas exportadas (0 = no se generó PDF)
 */
export function exportFimbaAgendaToPDF(
  filteredRows,
  { title = "Agenda FIMBA", subTitle = "", flotaById = null } = {},
) {
  const exportItems = buildAgendaPdfExportItems(
    mapFimbaAgendaRowsForPdf(filteredRows, { flotaById }),
  );
  if (exportItems.length === 0) return 0;
  exportAgendaToPDF(exportItems, title, subTitle, true);
  return exportItems.length;
}

/**
 * Subtítulo compacto con filtros activos de la planilla staff.
 */
export function buildFimbaAgendaPdfSubTitle({
  edicionNombre,
  filtroOrigen,
  filtroArtistaNombre,
  filtroArtistaNombres,
  grupoNames,
  categoryNames,
  locationNames,
  searchQuery,
} = {}) {
  const parts = [];
  if (edicionNombre) parts.push(String(edicionNombre));
  const artistas =
    filtroArtistaNombres?.length > 0
      ? filtroArtistaNombres
      : filtroArtistaNombre
        ? [filtroArtistaNombre]
        : [];
  if (artistas.length === 1) parts.push(`Artista: ${artistas[0]}`);
  else if (artistas.length > 1) {
    parts.push(`Artistas: ${artistas.join(", ")}`);
  }
  if (grupoNames?.length === 1) parts.push(`Grupo OFRN: ${grupoNames[0]}`);
  else if (grupoNames?.length > 1) {
    parts.push(`Grupos OFRN: ${grupoNames.join(", ")}`);
  }
  if (filtroOrigen === "fimba") parts.push("Solo FIMBA");
  else if (filtroOrigen === "ofrn") parts.push("Solo OFRN");
  if (categoryNames?.length) {
    parts.push(`Categorías: ${categoryNames.join(", ")}`);
  }
  if (locationNames?.length) {
    parts.push(`Locaciones: ${locationNames.join(", ")}`);
  }
  const q = String(searchQuery || "").trim();
  if (q) parts.push(`Búsqueda: “${q}”`);
  return parts.join(" · ");
}
