import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  IconUtensils,
  IconLoader,
  IconTrash,
  IconEye,
  IconEyeOff,
  IconCalendar,
  IconX,
  IconInfo,
  IconEdit,
  IconCheck,
  IconUsers,
  IconChevronDown,
  IconBold,
  IconItalic,
  IconUnderline,
  IconSearch,
  IconPlus,
  IconAlertTriangle,
} from "../../components/ui/Icons";
import TimeInput from "../../components/ui/TimeInput";
import FoodMatrix from "../../components/logistics/FoodMatrix";
import {
  ROLES_PRODUCCION,
  normalize,
  ROSTER_CATEGORIES,
  isNobodyConvocados,
} from "../../utils/giraUtils";
import { resolveLocalidadResidencia } from "../../utils/integranteDomicilioViaticos";
import {
  isPersonEligibleForMealSlot,
  getMealServiceStyle,
  formatMealServiceLabel,
  rewriteMealDescriptionServiceLabel,
  mealServicioFromEvent,
  mealBaseFromTypeName,
  CANONICAL_MEAL_TYPE_IDS,
  CATERING_SERVICE,
  fetchMealEventTypes,
  fetchMealRelatedEventTypes,
  isMealRelatedEvent,
  isCateringEvent,
  isOrchestraMealRow,
  findCoincidingGrupoMealRows,
  deductGrupoMembersFromOrchestraEligible,
  fimbaArtistMealPax,
  isFimbaArtistOnlyMealEvent,
  findMealTurnoOverInclusions,
  formatComensalesBadgeLabel,
  mealTurnoKey,
  mealRowGrupoIds,
  mealRowHasOfrnAudience,
  isMealPaxAffectingField,
  filterMealManagerRows,
  sortMealManagerGrid,
  createDefaultMealFilters,
  isDefaultMealFilters,
  MEAL_FILTER_NO_LOC,
  MEAL_FILTER_ORCHESTRA_ONLY,
  buildMealArtistFilterOptions,
  toggleMealConvocadosSelection,
  DEFAULT_MEAL_SERVICE_FILTER,
  findFimbaArtistMealCoverageGaps,
  filterFimbaPropuestasForMeals,
} from "../../utils/mealLogistics";
import { createCoverageGapsWithToast } from "../../utils/fimbaMealCoverageCreate";
import MealTypesEditorModal from "../../components/logistics/MealTypesEditorModal";
import { useGiraSegmentos } from "../../hooks/useGiraSegmentos";
import { useConfirmDialog } from "../../hooks/useConfirmDialog";
import {
  buildSegmentSpecs,
  formatTramoTitle,
  isLocalAt,
  mealBelongsToSegment,
} from "../../utils/giraTramos";
import {
  buildIntegranteGruposMap,
  eventGrupoIdsFromEvent,
  eventPassesEditorialGrupoFilter,
  setEventoGrupos,
} from "../../services/giraGruposService";
import MultiSelectDropdown from "../../components/ui/MultiSelectDropdown";
import MealOrchestraOnlyFilterChip from "../../components/logistics/MealOrchestraOnlyFilterChip";
import FimbaEventArtistasTagsCell from "../Fimba/FimbaEventArtistasTagsCell";
import FimbaMealCoveragePanel from "../Fimba/FimbaMealCoveragePanel";
import { grupoNombreInitials } from "../../components/giras/GiraGrupoChips";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { formatFechaLargaEs } from "../../utils/dates";
import { toast } from "sonner";

/** Embed `eventos_grupos` alineado a `selectedGrupos` (deducción orquesta↔grupo en vivo). */
const buildEventosGruposEmbed = (selectedGrupos, giraGrupos) =>
  (selectedGrupos || []).map((gid) => {
    const id = Number(gid);
    const g = (giraGrupos || []).find((x) => Number(x.id) === id);
    return {
      id_grupo: id,
      giras_grupos: g
        ? { id: g.id, nombre: g.nombre, color: g.color }
        : { id },
    };
  });

/**
 * Tras un cambio que afecta pax/elegibilidad, rematerializa filas del mismo turno
 * (`fecha|servicio`) y del turno anterior si fecha/servicio mutó — así badges de
 * comensales, −N deducción y avisos de sobre-inclusión se recalculan para hermanas.
 */
const rematerializeTurnoSiblings = (rows, editedIdx, prevRow, nextRow) => {
  const turnos = new Set();
  const prevKey = mealTurnoKey(prevRow);
  const nextKey = mealTurnoKey(nextRow);
  if (prevKey) turnos.add(prevKey);
  if (nextKey) turnos.add(nextKey);
  if (turnos.size === 0) return rows;
  return rows.map((r, i) => {
    if (i === editedIdx) return nextRow;
    const k = mealTurnoKey(r);
    if (k && turnos.has(k)) return { ...r };
    return r;
  });
};

/** Filas visibles + separadores de día (solo FIMBA; nunca antes de la 1.ª fila). */
const buildGridRenderItems = (rows, fimbaMode) => {
  if (!fimbaMode) return rows.map((row) => ({ type: "row", row, key: row.id }));
  const items = [];
  let prevFecha = null;
  for (const row of rows) {
    if (prevFecha != null && row.fecha && row.fecha !== prevFecha) {
      items.push({
        type: "day-divider",
        fecha: row.fecha,
        key: `day-${row.fecha}`,
      });
    }
    items.push({ type: "row", row, key: row.id });
    prevFecha = row.fecha;
  }
  return items;
};

const mealRowNeedsConvocadosAlert = (row) =>
  !row?.isTemp &&
  !(row.propuestas || []).length &&
  !mealRowHasOfrnAudience(row);

// --- CONSTANTES ---
const SERVICE_IDS = CANONICAL_MEAL_TYPE_IDS;
const SERVICIOS = ["Desayuno", "Almuerzo", "Merienda", "Cena"];
const SERVICE_VALS = { Desayuno: 0, Almuerzo: 1, Merienda: 2, Cena: 3 };

const typeNombreById = (mealTypes, id) =>
  mealTypes?.find((t) => Number(t.id) === Number(id))?.nombre || null;

const typeIdForBase = (mealTypes, base) => {
  const canon = SERVICE_IDS[base];
  if (canon != null && mealTypes?.some((t) => Number(t.id) === Number(canon))) {
    return canon;
  }
  const byName = mealTypes?.find(
    (t) =>
      mealBaseFromTypeName(t.nombre) === base &&
      String(t.nombre).toLowerCase() === String(base).toLowerCase(),
  );
  if (byName) return byName.id;
  const any = mealTypes?.find((t) => mealBaseFromTypeName(t.nombre) === base);
  return any?.id ?? canon ?? null;
};
const GROUP_DEFS = [
  {
    id: "GRP:TUTTI",
    label: "Tutti",
    color: "bg-indigo-100 text-indigo-700",
    filter: (p) => p.estado_gira === "confirmado",
  },
  {
    id: "GRP:NO_LOCALES",
    label: "Solo alojados",
    color: "bg-purple-100 text-purple-700",
    filter: (p) => !p.is_local && p.estado_gira === "confirmado",
  },
  {
    id: "GRP:LOCALES",
    label: "Locales",
    color: "bg-orange-100 text-orange-700",
    filter: (p) => p.is_local && p.estado_gira === "confirmado",
  },
  {
    id: "GRP:PRODUCCION",
    label: "Prod.",
    color: "bg-slate-100 text-slate-700",
    filter: (p) =>
      ROLES_PRODUCCION.includes(p.rol_gira) && p.estado_gira === "confirmado",
  },
  {
    id: "GRP:SOLISTAS",
    label: "Sol.",
    color: "bg-amber-100 text-amber-700",
    filter: (p) => p.rol_gira === "solista" && p.estado_gira === "confirmado",
  },
  {
    id: "GRP:DIRECTORES",
    label: "Dir.",
    color: "bg-red-100 text-red-700",
    filter: (p) => p.rol_gira === "director" && p.estado_gira === "confirmado",
  },
];

const getGroupLabelShort = (id, catalogs) => {
  if (id === ROSTER_CATEGORIES.NONE || id === "GRP:NONE") return "Nadie";
  if (id === "GRP:TUTTI") return "Tutti";
  if (id === "GRP:NO_LOCALES") return "Solo alojados";
  if (id === "GRP:LOCALES") return "Locales";
  if (id === "GRP:PRODUCCION") return "Prod.";
  if (id === "GRP:SOLISTAS") return "Sol.";
  if (id === "GRP:DIRECTORES") return "Dir.";
  if (id.startsWith("LOC:")) {
    const locId = id.split(":")[1];
    const loc =
      catalogs?.localidades?.find((l) => String(l.id) === String(locId)) ||
      catalogs?.localidadesLookup?.find((l) => String(l.id) === String(locId));
    return loc ? loc.localidad : "Loc";
  }
  if (id.startsWith("ENS:")) {
    const ensId = id.split(":")[1];
    const ens = catalogs?.ensambles?.find((e) => String(e.id) === String(ensId));
    return ens ? ens.ensamble : "Ens";
  }
  if (id.startsWith("FAM:")) return id.split(":")[1];
  return id;
};

const personLocalidadLabel = (person) => {
  const res = resolveLocalidadResidencia(person);
  return (
    res.nombre ||
    person?.localidades_residencia?.localidad ||
    person?._loc_residencia?.localidad ||
    person?.residencia?.localidad ||
    "Sin localidad"
  );
};

/** Resumen de dietas + listado agrupado por localidad para el modal de comensales. */
const buildComensalesDetail = (people = []) => {
  const dietCounts = {};
  (people || []).forEach((p) => {
    const diet = (p.alimentacion || "Estándar").trim() || "Estándar";
    dietCounts[diet] = (dietCounts[diet] || 0) + 1;
  });
  const dietSummary = Object.entries(dietCounts).sort(([a], [b]) =>
    a === "Estándar" ? -1 : b === "Estándar" ? 1 : a.localeCompare(b, "es"),
  );

  const sorted = [...(people || [])].sort((a, b) => {
    const la = personLocalidadLabel(a);
    const lb = personLocalidadLabel(b);
    if (la !== lb) return la.localeCompare(lb, "es");
    const ap = `${a.apellido || ""}, ${a.nombre || ""}`;
    const bp = `${b.apellido || ""}, ${b.nombre || ""}`;
    return ap.localeCompare(bp, "es");
  });

  const byLocalidad = [];
  for (const p of sorted) {
    const label = personLocalidadLabel(p);
    const last = byLocalidad[byLocalidad.length - 1];
    if (!last || last.label !== label) {
      byLocalidad.push({ label, people: [p] });
    } else {
      last.people.push(p);
    }
  }

  return { dietSummary, byLocalidad, total: people.length };
};

function MealTurnoOverInclusionModal({
  overInclusions,
  gridById,
  onClose,
}) {
  const { people, artists } = overInclusions || {};
  const hasPeople = (people || []).length > 0;
  const hasArtists = (artists || []).length > 0;

  const eventLabel = (eventId) => {
    const row = gridById.get(String(eventId));
    if (!row) return `Evento ${eventId}`;
    const fecha = row.fecha
      ? format(parseISO(row.fecha), "EEE dd/MM", { locale: es })
      : "";
    return [fecha, row.tipo_nombre || row.servicio, row.hora_inicio]
      .filter(Boolean)
      .join(" · ");
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 print:hidden"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-lg max-h-[85vh] bg-white rounded-xl shadow-2xl border border-slate-200 flex flex-col animate-in zoom-in-95 fade-in duration-150"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="turno-over-modal-title"
      >
        <div className="px-4 py-3 border-b border-slate-200 flex items-start justify-between gap-3 shrink-0">
          <div className="min-w-0">
            <h3
              id="turno-over-modal-title"
              className="text-sm font-bold text-slate-800 flex items-center gap-2"
            >
              <IconAlertTriangle size={16} className="text-amber-600 shrink-0" />
              Mismo turno en varias comidas
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Turno = misma fecha + servicio (sin locación). Conteo post-deducción
              orquesta↔grupo.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 rounded"
            title="Cerrar"
          >
            <IconX size={18} />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-4 py-3 space-y-4">
          {hasPeople && (
            <section>
              <h4 className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-2">
                Integrantes OFRN ({people.length})
              </h4>
              <ul className="space-y-2">
                {people.map((entry) => {
                  const p = entry.person || {};
                  const name = `${p.apellido || ""}, ${p.nombre || ""}`.trim();
                  return (
                    <li
                      key={`p-${entry.id}-${entry.turnoKey}`}
                      className="text-xs border border-slate-100 rounded-lg px-2.5 py-2 bg-slate-50/80"
                    >
                      <div className="font-semibold text-slate-800">{name || `#${entry.id}`}</div>
                      <ul className="mt-1 text-[10px] text-slate-500 list-disc list-inside">
                        {entry.eventIds.map((eid) => (
                          <li key={eid}>{eventLabel(eid)}</li>
                        ))}
                      </ul>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
          {hasArtists && (
            <section>
              <h4 className="text-[10px] font-bold uppercase tracking-wide text-fuchsia-600 mb-2">
                Artistas FIMBA ({artists.length})
              </h4>
              <ul className="space-y-2">
                {artists.map((entry) => (
                  <li
                    key={`a-${entry.id}-${entry.turnoKey}`}
                    className="text-xs border border-fuchsia-100 rounded-lg px-2.5 py-2 bg-fuchsia-50/40"
                  >
                    <div className="font-semibold text-fuchsia-900">{entry.nombre}</div>
                    <ul className="mt-1 text-[10px] text-fuchsia-700/80 list-disc list-inside">
                      {entry.eventIds.map((eid) => (
                        <li key={eid}>{eventLabel(eid)}</li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {!hasPeople && !hasArtists && (
            <p className="text-xs text-slate-400 italic">Sin sobre-inclusión detectada.</p>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function ComensalesDetailModal({
  row,
  people,
  deducted = [],
  artistTags = [],
  artistPax = 0,
  catalogs,
  onClose,
}) {
  const detail = useMemo(() => buildComensalesDetail(people), [people]);
  const deductedDetail = useMemo(
    () => buildComensalesDetail(deducted),
    [deducted],
  );
  const convLabels = (row?.convocados || [])
    .map((id) => getGroupLabelShort(id, catalogs))
    .filter(Boolean);
  const totalShown = detail.total + artistPax;

  if (typeof document === "undefined") return null;

  const fechaLabel = row?.fecha
    ? format(parseISO(row.fecha), "EEE dd/MM", { locale: es })
    : "";

  return createPortal(
    <div
      className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 print:hidden"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-md max-h-[85vh] bg-white rounded-xl shadow-2xl border border-slate-200 flex flex-col animate-in zoom-in-95 fade-in duration-150"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="comensales-modal-title"
      >
        <div className="px-4 py-3 border-b border-slate-200 flex items-start justify-between gap-3 shrink-0">
          <div className="min-w-0">
            <h3
              id="comensales-modal-title"
              className="text-sm font-bold text-slate-800 flex items-center gap-2"
            >
              <IconUsers size={16} className="text-emerald-600 shrink-0" />
              Comensales
              <span className="text-[11px] font-black bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-full">
                {totalShown}
              </span>
              {deducted.length > 0 && (
                <span
                  className="text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded-full"
                  title="Restados por comida de grupo coincidente"
                >
                  −{deducted.length} grupo
                </span>
              )}
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5 truncate">
              {[fechaLabel, row?.tipo_nombre || row?.servicio, row?.hora_inicio]
                .filter(Boolean)
                .join(" · ")}
              {convLabels.length > 0 ? ` · ${convLabels.join(" + ")}` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 rounded"
            title="Cerrar"
          >
            <IconX size={18} />
          </button>
        </div>

        <div className="px-4 py-3 border-b border-slate-100 shrink-0">
          <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-2">
            Cantidades por tipo
          </div>
          {detail.dietSummary.length === 0 && artistPax === 0 ? (
            <p className="text-xs text-slate-400 italic">Sin comensales</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {detail.dietSummary.map(([diet, n]) => (
                <span
                  key={diet}
                  className="inline-flex items-center gap-1.5 text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 rounded-full px-2.5 py-1"
                >
                  <span className="text-slate-500 font-medium">{diet}</span>
                  <span className="tabular-nums font-black text-slate-900">
                    {n}
                  </span>
                </span>
              ))}
              {artistPax > 0 && (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold bg-fuchsia-50 text-fuchsia-800 border border-fuchsia-200 rounded-full px-2.5 py-1">
                  <span className="font-medium">Artistas FIMBA</span>
                  <span className="tabular-nums font-black">{artistPax}</span>
                </span>
              )}
            </div>
          )}
        </div>

        {artistTags.length > 0 && (
          <div className="px-4 py-2 border-b border-slate-100 shrink-0">
            <div className="text-[10px] font-bold uppercase tracking-wide text-fuchsia-600 mb-1.5">
              Artistas tagueados
            </div>
            <ul className="space-y-1">
              {artistTags.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between gap-2 text-xs"
                >
                  <span className="font-medium text-slate-800 truncate">
                    {p.nombre || `Artista ${p.id}`}
                  </span>
                  <span className="tabular-nums font-bold text-fuchsia-700 shrink-0">
                    {Math.max(0, Number(p.cantidad_planificada) || 0)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {deducted.length > 0 && (
          <div className="px-4 py-2 border-b border-amber-100 bg-amber-50/40 shrink-0">
            <div className="text-[10px] font-bold uppercase tracking-wide text-amber-700 mb-1">
              Descontados (comen en grupo · misma comida/lugar)
            </div>
            <p className="text-[11px] text-amber-800 mb-1">
              {deductedDetail.total} persona
              {deductedDetail.total === 1 ? "" : "s"} restada
              {deductedDetail.total === 1 ? "" : "s"} del conteo orquesta.
            </p>
            <ul className="max-h-28 overflow-y-auto divide-y divide-amber-100/80">
              {deducted.map((p) => (
                <li
                  key={`ded-${p.id}`}
                  className="py-1 text-[11px] text-amber-900/90 truncate"
                >
                  {p.apellido}, {p.nombre}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex-1 overflow-y-auto min-h-0 px-4 py-2">
          {detail.byLocalidad.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-4 text-center">
              Nadie elegible para este servicio
            </p>
          ) : (
            detail.byLocalidad.map((group) => (
              <div key={group.label} className="mb-3 last:mb-1">
                <div className="sticky top-0 bg-white/95 backdrop-blur-sm py-1.5 flex items-center justify-between border-b border-slate-100 z-10">
                  <span className="text-[10px] font-black uppercase tracking-wide text-indigo-600">
                    {group.label}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 tabular-nums">
                    {group.people.length}
                  </span>
                </div>
                <ul className="divide-y divide-slate-50">
                  {group.people.map((p) => (
                    <li
                      key={p.id}
                      className="flex items-center justify-between gap-2 py-1.5 text-xs"
                    >
                      <span className="font-medium text-slate-800 truncate">
                        {p.apellido}, {p.nombre}
                      </span>
                      <span className="text-[10px] text-slate-400 uppercase truncate max-w-[40%] text-right shrink-0">
                        {(p.alimentacion && p.alimentacion !== "Estándar"
                          ? p.alimentacion
                          : null) ||
                          p.instrumentos?.instrumento ||
                          ""}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </div>

        <div className="px-4 py-2.5 border-t border-slate-100 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}


const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const stripHtmlToPlain = (html) => {
  if (!html) return "";
  return String(html)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(div|p|li)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
};

const getKnownGroupLabels = (catalogs) => {
  const fixed = [
    "Nadie",
    "Tutti",
    "Solo alojados",
    "Locales",
    "Prod.",
    "Sol.",
    "Dir.",
  ];
  const aliases = ["No Locales", "No locales"];
  const locs = (catalogs?.localidades || [])
    .map((l) => l.localidad)
    .filter(Boolean);
  const ens = (catalogs?.ensambles || []).map((e) => e.ensamble).filter(Boolean);
  const fams = catalogs?.familias || [];
  return [...fixed, ...aliases, ...locs, ...ens, ...fams];
};

/** Localidades de residencia presentes en el roster confirmado. */
const collectRosterResidenciaLocalidades = (roster = []) => {
  const map = new Map();
  for (const p of roster) {
    if (p?.estado_gira && p.estado_gira !== "confirmado") continue;
    const res = resolveLocalidadResidencia(p);
    const id = res.id ?? p.id_localidad_residencia;
    if (id == null || id === "") continue;
    const key = String(id);
    if (map.has(key)) continue;
    const nombre =
      res.nombre ||
      p.localidades_residencia?.localidad ||
      p._loc_residencia?.localidad ||
      p.residencia?.localidad ||
      "";
    map.set(key, { id: Number(id) || id, localidad: nombre || `Loc ${id}` });
  }
  return [...map.values()].sort((a, b) =>
    String(a.localidad).localeCompare(String(b.localidad), "es"),
  );
};

/** Ensambles a los que pertenecen músicos del roster confirmado. */
const collectRosterEnsambles = (roster = []) => {
  const map = new Map();
  const add = (id, nombre) => {
    if (id == null || id === "") return;
    const key = String(id);
    if (map.has(key)) return;
    map.set(key, { id: Number(id) || id, ensamble: nombre || `Ens ${id}` });
  };
  for (const p of roster) {
    if (p?.estado_gira && p.estado_gira !== "confirmado") continue;
    for (const e of p.ensambles || []) {
      add(e?.id, e?.ensamble);
    }
    for (const ie of p.integrantes_ensambles || []) {
      const ens = ie?.ensambles;
      add(ie?.id_ensamble ?? ens?.id, ens?.ensamble);
    }
  }
  return [...map.values()].sort((a, b) =>
    String(a.ensamble).localeCompare(String(b.ensamble), "es"),
  );
};

const splitFlexiblePlus = (text) =>
  String(text)
    .split(/\s*\+\s*/)
    .map((p) => p.trim())
    .filter(Boolean);

const buildConvocadosLabelsOnly = (convocados, catalogs) => {
  const labels = (convocados || [])
    .filter((id) => id !== ROSTER_CATEGORIES.NONE && id !== "GRP:NONE")
    .map((id) => getGroupLabelShort(id, catalogs));
  if (labels.length === 0) return null;
  return labels.join(" + ");
};

/** Etiqueta de servicio con detalle opcional (ej. "Merienda a bordo"). */
const serviceLabelOf = (servicio, detalle) =>
  formatMealServiceLabel(servicio, detalle);

/**
 * Bloque auto de convocados: "Almuerzo Solo alojados + Prod."
 * Nadie (GRP:NONE) → solo el servicio ("Cena"), sin la palabra "Nadie".
 * Sin convocados → null (caller usa "… Gira").
 */
const buildConvocadosAutoPart = (serviceLabel, convocados, catalogs) => {
  if (isNobodyConvocados(convocados)) return serviceLabel;
  const labelsOnly = buildConvocadosLabelsOnly(convocados, catalogs);
  if (!labelsOnly) return null;
  return `${serviceLabel} ${labelsOnly}`;
};

/** Sufijo de siglas FIMBA: " - RT" / " - CPN / CA". */
const buildArtistInitialsSuffix = (propuestas = []) => {
  const siglas = [];
  const seen = new Set();
  for (const p of propuestas || []) {
    if (!p || p.requiere_comidas === false) continue;
    const sigla = grupoNombreInitials(p.nombre || "");
    if (!sigla || seen.has(sigla)) continue;
    seen.add(sigla);
    siglas.push(sigla);
  }
  if (!siglas.length) return "";
  return ` - ${siglas.join(" / ")}`;
};

const ARTIST_INITIALS_SUFFIX_RE =
  /\s+-\s+[A-ZÁÉÍÓÚÜÑ0-9]+(?:\s*\/\s*[A-ZÁÉÍÓÚÜÑ0-9]+)*\s*$/iu;

const stripArtistInitialsSuffix = (plain) =>
  String(plain || "")
    .replace(ARTIST_INITIALS_SUFFIX_RE, "")
    .replace(/\s+$/, "");

const withArtistInitialsSuffix = (plainOrHtml, propuestas) => {
  const plain = stripHtmlToPlain(plainOrHtml);
  const base = stripArtistInitialsSuffix(plain);
  const suffix = buildArtistInitialsSuffix(propuestas);
  return `${base}${suffix}`.trim();
};

const buildMealDescription = (
  serviceLabel,
  convocados,
  catalogs,
  propuestas = [],
) => {
  const base =
    buildConvocadosAutoPart(serviceLabel, convocados, catalogs) ||
    `${serviceLabel} Gira`;
  return withArtistInitialsSuffix(base, propuestas);
};

const isAllKnownLabelParts = (parts, catalogs) => {
  if (parts.length === 0) return false;
  const known = new Set(getKnownGroupLabels(catalogs));
  return parts.every((p) => known.has(p));
};

const isAutoConvocadosTail = (tail, catalogs) =>
  isAllKnownLabelParts(splitFlexiblePlus(tail), catalogs);

const labelSuffixVariants = (labelsPart) => {
  if (!labelsPart) return [];
  return [
    labelsPart,
    labelsPart.replace(/ \+ /g, "+"),
    labelsPart.replace(/ \+ /g, " +"),
  ];
};

/** ¿El bloque "Servicio …" empieza en un límite real (no dentro de "pausa y merienda")? */
const isServiceBlockBoundary = (index, text) => {
  if (index === 0) return true;
  const prev = text[index - 1];
  return /[|–—;\-,(]/.test(prev);
};

/**
 * Sufijo de grupos al final, leyendo etiquetas enteras de derecha a izquierda
 * (evita confundir "Locales" dentro de "No Locales").
 */
const findConvocadosLabelsSuffix = (plainText, catalogs, convocados) => {
  if (!plainText) return null;

  const fromConvocados = buildConvocadosLabelsOnly(convocados, catalogs);
  for (const variant of labelSuffixVariants(fromConvocados)) {
    if (!variant) continue;
    if (plainText === variant) {
      return { start: 0, end: plainText.length, text: plainText, kind: "suffix" };
    }
    if (plainText.endsWith(variant)) {
      const end = plainText.length;
      const start = end - variant.length;
      const sep = start > 0 && plainText[start - 1] === " " ? start - 1 : start;
      return {
        start: sep,
        end,
        text: plainText.slice(sep),
        kind: "suffix",
      };
    }
  }

  const knownSorted = [...getKnownGroupLabels(catalogs)].sort(
    (a, b) => b.length - a.length,
  );
  let pos = plainText.length;
  const parts = [];

  while (pos > 0) {
    while (pos > 0 && /[\s+]/.test(plainText[pos - 1])) pos -= 1;
    if (pos === 0) break;

    let matched = null;
    for (const label of knownSorted) {
      const start = pos - label.length;
      if (start < 0) continue;
      if (plainText.slice(start, pos) !== label) continue;
      const charBefore = start > 0 ? plainText[start - 1] : "";
      if (start > 0 && !/[\s+]/.test(charBefore)) continue;
      matched = { label, start };
      break;
    }
    if (!matched) {
      parts.length = 0;
      break;
    }
    parts.unshift(matched.label);
    pos = matched.start;
  }

  if (parts.length === 0) return null;

  const suffixStart = pos;
  const sep =
    suffixStart > 0 && plainText[suffixStart - 1] === " "
      ? suffixStart - 1
      : suffixStart;
  return {
    start: sep,
    end: plainText.length,
    text: plainText.slice(sep),
    kind: "suffix",
  };
};

/** Tramo "Servicio(+detalle) + grupos" o legado "Servicio en …". */
const findConvocadosAutoSegment = (
  plainText,
  serviceLabel,
  catalogs,
  convocados,
) => {
  if (!plainText) return null;

  const tryExact = (candidate, kind) => {
    if (!candidate) return null;
    // Exact whole string
    if (plainText === candidate) {
      return { start: 0, end: plainText.length, text: candidate, kind };
    }
    const idx = plainText.indexOf(candidate);
    if (idx === -1) return null;
    const end = idx + candidate.length;
    // Evitar que "Cena" gane dentro de "Cena Nadie" / "Cena Tutti".
    const next = plainText[end];
    if (next && /[\p{L}\p{N}]/u.test(next)) return null;
    if (next === " " || next === "\u00a0") {
      const rest = plainText.slice(end + 1);
      // Si lo que sigue parece tramo auto de convocados, preferir match más largo.
      const firstTok = rest.split(/\s+/)[0];
      if (
        firstTok &&
        (firstTok === "Nadie" ||
          firstTok === "Gira" ||
          getKnownGroupLabels(catalogs).includes(firstTok) ||
          firstTok === "Tutti")
      ) {
        return null;
      }
    }
    return {
      start: idx,
      end,
      text: candidate,
      kind,
    };
  };

  // Más largo primero: "Cena Nadie" antes que "Cena".
  const exactCandidates = [
    buildConvocadosAutoPart(serviceLabel, convocados, catalogs),
    `${serviceLabel} Nadie`,
    `${serviceLabel} Gira`,
  ]
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);

  for (const candidate of exactCandidates) {
    const found = tryExact(candidate, "full");
    if (found) return found;
  }

  const servicioRe = escapeRegex(serviceLabel);
  const re = new RegExp(`\\b${servicioRe}\\s+[^\\n|–—;]+`, "gi");
  let match;
  let best = null;
  while ((match = re.exec(plainText)) !== null) {
    if (!isServiceBlockBoundary(match.index, plainText)) continue;
    const candidate = match[0].trim();
    const tail = candidate.slice(serviceLabel.length).trim();
    if (isAutoConvocadosTail(tail, catalogs)) {
      if (!best || candidate.length > best.text.length) {
        best = {
          start: match.index,
          end: match.index + candidate.length,
          text: candidate,
          kind: "full",
        };
      }
    }
  }
  if (best) return best;

  const legacyRe = new RegExp(
    `\\b${servicioRe}\\s+en\\s+[^\\n|–—;]+`,
    "i",
  );
  const legacy = plainText.match(legacyRe);
  if (legacy?.index != null) {
    return {
      start: legacy.index,
      end: legacy.index + legacy[0].length,
      text: legacy[0],
      kind: "legacy",
    };
  }
  return null;
};

const findConvocadosSegment = (
  plainText,
  serviceLabel,
  catalogs,
  convocados,
) => {
  const full = findConvocadosAutoSegment(
    plainText,
    serviceLabel,
    catalogs,
    convocados,
  );
  const suffix = findConvocadosLabelsSuffix(plainText, catalogs, convocados);
  if (full && suffix) {
    // Preferir el tramo más corto (sufijo de grupos) salvo bloque completo al inicio
    if (full.start === 0 && suffix.start > 0) return suffix;
    if (suffix.start > 0 && suffix.text.length <= full.text.length) return suffix;
    return full;
  }
  return full || suffix;
};

const applySegmentReplacement = (
  plain,
  existingHtml,
  segment,
  replacement,
) => {
  const custom = plain.slice(0, segment.start).replace(/\s+$/, "");
  const tail = plain.slice(segment.end).replace(/^\s+/, "");
  const pieces = [custom, replacement, tail].filter((p) => p != null && p !== "");
  let merged = pieces.join(" ").trim();
  if (!merged) merged = "";

  if (existingHtml && existingHtml !== plain && segment.text) {
    if (existingHtml.includes(segment.text)) {
      return existingHtml.replace(segment.text, replacement);
    }
  }
  return merged;
};

/**
 * Reemplaza o agrega el tramo de convocados; conserva aclaraciones de producción.
 * Nadie → sin la palabra "Nadie". Artistas FIMBA → sufijo " - SIGLA [/ SIGLA…]".
 * Ej: "Pausa y merienda" + Tutti → "Pausa y merienda Tutti"
 * Ej: "Merienda a bordo No Locales+Prod." sin Prod. → "Merienda a bordo Solo alojados"
 * @param {string} serviceLabel etiqueta completa ("Merienda a bordo" o "Almuerzo")
 * @param {Array} [propuestas] tags FIMBA para siglas
 */
const mergeMealDescriptionWithConvocados = (
  existingHtml,
  serviceLabel,
  convocados,
  catalogs,
  convocadosForLookup = convocados,
  propuestas = [],
) => {
  const plainRaw = stripHtmlToPlain(existingHtml);
  const plain = stripArtistInitialsSuffix(plainRaw);
  const newLabelsOnly = buildConvocadosLabelsOnly(convocados, catalogs);
  const newAuto = buildConvocadosAutoPart(serviceLabel, convocados, catalogs);
  const segment = findConvocadosSegment(
    plain,
    serviceLabel,
    catalogs,
    convocadosForLookup,
  );

  let merged;
  if (!segment) {
    if (!plain && newAuto) merged = newAuto;
    else if (!plain) merged = `${serviceLabel} Gira`;
    else if (newLabelsOnly) merged = `${plain} ${newLabelsOnly}`;
    else if (isNobodyConvocados(convocados)) {
      // Sin segmento detectable: no conservar "… Nadie" residual.
      merged = newAuto || serviceLabel;
    } else merged = existingHtml || plain;
  } else {
    const hasCustomPrefix = segment.start > 0;
    const useLabelsOnly =
      segment.kind === "suffix" || (segment.kind === "full" && hasCustomPrefix);
    const replacement = useLabelsOnly
      ? newLabelsOnly || ""
      : newAuto || newLabelsOnly || (isNobodyConvocados(convocados) ? serviceLabel : "");

    merged = applySegmentReplacement(
      plain,
      plain === plainRaw ? existingHtml : plain,
      segment,
      replacement,
    );
    if (!merged) merged = `${serviceLabel} Gira`;
  }

  return withArtistInitialsSuffix(merged, propuestas);
};

// --- COMPONENTE: INSPECTOR DE GRUPOS SUPERIOR ---
const GroupInspectorHeader = ({ roster, catalogs, groupDefs }) => {
  const [selectedGroup, setSelectedGroup] = useState(null);

  return (
    <div className="flex items-center gap-2 ml-4 border-l border-slate-200 pl-4 relative overflow-visible">
      <style>{`.tooltip-bridge::after { content: ""; position: absolute; top: 100%; left: 0; width: 100%; height: 15px; background: transparent; }`}</style>
      {groupDefs.map((g) => {
        const count = roster.filter(g.filter).length;
        return (
          <div
            key={g.id}
            className="relative tooltip-bridge z-[1] hover:z-[100]"
            onMouseEnter={() => setSelectedGroup(g.id)}
            onMouseLeave={() => setSelectedGroup(null)}
          >
            <button
              className={`text-[10px] px-2 py-1 rounded font-bold border border-slate-200 bg-white transition-colors ${selectedGroup === g.id ? g.color : "text-slate-500"}`}
            >
              {g.label}: <span className="font-black">{count}</span>
            </button>

            {selectedGroup === g.id && (
              <div className="absolute top-[calc(100%+5px)] left-0 w-64 bg-white border border-slate-200 shadow-xl rounded-lg z-[100] p-2 animate-in fade-in zoom-in-95 origin-top">
                <div className="text-[9px] font-bold text-slate-400 uppercase mb-1 border-b pb-1">
                  Integrantes de {getGroupLabelShort(g.id, catalogs)}
                </div>
                <div className="max-h-40 overflow-y-auto custom-scrollbar">
                  {roster
                    .filter(g.filter)
                    .sort((a, b) => a.apellido.localeCompare(b.apellido))
                    .map((p) => (
                      <div
                        key={p.id}
                        className="text-[10px] py-0.5 flex justify-between border-b border-slate-50 last:border-0"
                      >
                        <span className="truncate">
                          {p.apellido}, {p.nombre[0]}.
                        </span>
                        <span className="text-slate-400 italic text-[8px]">
                          {p.instrumentos?.instrumento?.substring(0, 12)}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// --- COMPONENTE: SELECT DE UBICACIÓN BUSCABLE ---
const GridLocationSelect = ({
  value,
  onChange,
  options,
  disabled,
  isDirty,
  placeholder = "- Lugar -",
  compact = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (
        isOpen &&
        containerRef.current &&
        !containerRef.current.contains(e.target)
      )
        setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen]);

  const selectedOption = options.find((o) => String(o.id) === String(value));
  const filteredOptions = options.filter((o) =>
    o.label.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="relative w-full" ref={containerRef}>
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        title={selectedOption?.label || undefined}
        className={`w-full text-xs border rounded truncate cursor-pointer hover:border-indigo-400 transition-all ${
          compact ? "p-0.5 min-h-[24px] max-w-[7.5rem]" : "p-1 min-h-[26px]"
        } ${
          isOpen ? "border-indigo-500 ring-1 ring-indigo-200" : "border-slate-300"
        } ${isDirty ? "bg-amber-50 border-amber-300" : "bg-white"}`}
      >
        {selectedOption ? (
          <span className="text-slate-700 block truncate">{selectedOption.label}</span>
        ) : (
          <span className="text-slate-400 italic block truncate">{placeholder}</span>
        )}
      </div>
      {isOpen && (
        <div className="absolute top-full left-0 w-64 bg-white border border-slate-300 shadow-xl rounded-lg z-[99999] mt-1 flex flex-col overflow-hidden">
          <div className="p-2 bg-slate-50 border-b border-slate-200">
            <input
              autoFocus
              type="text"
              className="w-full p-1.5 text-xs border rounded outline-none focus:border-indigo-500 text-slate-800"
              placeholder="Buscar ubicación..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => (
                <div
                  key={opt.id}
                  onClick={() => {
                    onChange(opt.id);
                    setIsOpen(false);
                  }}
                  className="px-3 py-2 text-xs hover:bg-indigo-50 text-slate-700 cursor-pointer border-b border-slate-50 last:border-0"
                >
                  {opt.label}
                </div>
              ))
            ) : (
              <div className="p-3 text-xs text-slate-400 italic">
                Sin resultados
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// --- MULTI SELECT DE GRUPOS ---
const CONV_TABS = [
  { id: "categorias", label: "Categorías" },
  { id: "localidades", label: "Localidades" },
  { id: "ensambles", label: "Ensambles" },
];

const CATEGORY_OPTIONS = [
  { id: ROSTER_CATEGORIES.NONE, label: "Nadie (orquesta no come)" },
  { id: "GRP:TUTTI", label: "Tutti" },
  { id: "GRP:NO_LOCALES", label: "Solo alojados" },
  { id: "GRP:LOCALES", label: "Locales" },
  { id: "GRP:PRODUCCION", label: "Producción" },
  { id: "GRP:SOLISTAS", label: "Solistas" },
  { id: "GRP:DIRECTORES", label: "Directores" },
];

const convTagTab = (id) => {
  if (!id) return null;
  if (String(id).startsWith("LOC:")) return "localidades";
  if (String(id).startsWith("ENS:")) return "ensambles";
  if (String(id).startsWith("GRP:") || String(id).startsWith("FAM:"))
    return "categorias";
  return null;
};

const resolveDefaultConvTab = (selected = []) => {
  const counts = { categorias: 0, localidades: 0, ensambles: 0 };
  for (const id of selected) {
    const t = convTagTab(id);
    if (t) counts[t] += 1;
  }
  const withSel = CONV_TABS.filter((t) => counts[t.id] > 0);
  if (withSel.length === 1) return withSel[0].id;
  if (withSel.length > 1) {
    // Si hay varias, prioriza la que concentra más selección.
    return [...withSel].sort((a, b) => counts[b.id] - counts[a.id])[0].id;
  }
  return "categorias";
};

const MultiGroupSelect = ({
  value = [],
  onChange,
  catalogs,
  disabled,
  showAlert,
  isDirty,
  darkMode = false,
  compact = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [tab, setTab] = useState("categorias");
  const [search, setSearch] = useState("");
  const [openUp, setOpenUp] = useState(false);
  const containerRef = useRef(null);
  const searchRef = useRef(null);
  const DROPDOWN_EST_HEIGHT = 320; // max-h-80

  const selectedByTab = useMemo(() => {
    const groups = { categorias: [], localidades: [], ensambles: [] };
    for (const id of value || []) {
      const t = convTagTab(id);
      if (t) groups[t].push(id);
    }
    return groups;
  }, [value]);

  const tabCounts = useMemo(
    () => ({
      categorias: selectedByTab.categorias.length,
      localidades: selectedByTab.localidades.length,
      ensambles: selectedByTab.ensambles.length,
    }),
    [selectedByTab],
  );

  /** Snapshot de seleccionados al abrir: fija el orden “seleccionados primero” en la lista. */
  const selectedOrderAtOpenRef = useRef(new Set());

  useEffect(() => {
    const handleClick = (e) => {
      if (
        isOpen &&
        containerRef.current &&
        !containerRef.current.contains(e.target)
      )
        setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setSearch("");
      return;
    }
    const t = setTimeout(() => searchRef.current?.focus(), 30);
    return () => clearTimeout(t);
  }, [isOpen]);

  useEffect(() => {
    setSearch("");
  }, [tab]);

  const openOrClose = () => {
    if (disabled) return;
    if (!isOpen) {
      setTab(resolveDefaultConvTab(value));
      selectedOrderAtOpenRef.current = new Set(value || []);
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        setOpenUp(
          spaceBelow < DROPDOWN_EST_HEIGHT && spaceAbove > spaceBelow,
        );
      } else {
        setOpenUp(false);
      }
    }
    setIsOpen(!isOpen);
  };

  const toggleOption = (id) => {
    onChange(toggleMealConvocadosSelection(value, id));
  };

  const q = normalize(search);
  const tabOptions = useMemo(() => {
    let options = [];
    if (tab === "categorias") {
      options = CATEGORY_OPTIONS.filter(
        (o) => !q || normalize(o.label).includes(q),
      );
    } else if (tab === "localidades") {
      options = (catalogs?.localidades || [])
        .filter((l) => !q || normalize(l.localidad).includes(q))
        .map((l) => ({ id: `LOC:${l.id}`, label: l.localidad }));
    } else {
      options = (catalogs?.ensambles || [])
        .filter((e) => !q || normalize(e.ensamble).includes(q))
        .map((e) => ({ id: `ENS:${e.id}`, label: e.ensamble }));
    }

    const pinned = selectedOrderAtOpenRef.current;
    return [...options].sort((a, b) => {
      const aPin = pinned.has(a.id) ? 0 : 1;
      const bPin = pinned.has(b.id) ? 0 : 1;
      if (aPin !== bPin) return aPin - bPin;
      return 0;
    });
  }, [tab, catalogs, q, isOpen]);

  const emptyHint =
    tab === "categorias"
      ? "Sin categorías"
      : tab === "localidades"
        ? "Sin localidades de residencia en el roster"
        : "Sin ensambles en el roster";

  return (
    <div className="relative w-full" ref={containerRef}>
      <div
        onClick={openOrClose}
        className={`${compact ? "min-h-[26px] px-1 py-0.5 gap-0.5" : "min-h-[28px] px-2 py-1 gap-1"} border rounded cursor-pointer flex flex-wrap items-center transition-all ${
          darkMode
            ? "bg-indigo-800 border-indigo-600 text-white hover:border-indigo-400"
            : isDirty ? "bg-amber-50 border-amber-300" : "bg-white border-slate-300"
        } ${showAlert ? "border-orange-400 ring-1 ring-orange-200" : "hover:border-indigo-400"}`}
      >
        {!value.length && (
          <span
            className={`text-[10px] ${
              showAlert
                ? "text-orange-500 font-bold"
                : darkMode
                  ? "text-indigo-300 italic"
                  : "text-slate-400 italic"
            }`}
          >
            {showAlert ? (compact ? "⚠️" : "⚠️ Definir...") : compact ? "…" : "Seleccionar..."}
          </span>
        )}
        {value.map((id) => {
          const isNone = id === ROSTER_CATEGORIES.NONE || id === "GRP:NONE";
          const label = getGroupLabelShort(id, catalogs);
          return (
            <span
              key={id}
              className={`${compact ? "text-[8px] pl-0.5 pr-0" : "text-[9px] pl-1 pr-0"} inline-flex items-center gap-0 rounded border font-bold ${
                darkMode
                  ? isNone
                    ? "bg-slate-800 text-slate-200 border-slate-600"
                    : "bg-indigo-900 text-indigo-100 border-indigo-700"
                  : isNone
                    ? "bg-slate-100 text-slate-600 border-slate-300"
                    : "bg-indigo-50 text-indigo-700 border-indigo-100"
              }`}
              title={
                isNone
                  ? "Orquesta OFRN no come; artistas FIMBA se cuentan aparte"
                  : `Quitar ${label}`
              }
            >
              <span className={compact ? "pr-0.5" : "pr-0.5"}>{label}</span>
              {!disabled && (
                <button
                  type="button"
                  aria-label={`Quitar ${label}`}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleOption(id);
                  }}
                  className={`${compact ? "p-0.5" : "p-0.5"} rounded-r hover:bg-black/10 text-current opacity-70 hover:opacity-100`}
                >
                  <IconX size={compact ? 8 : 10} />
                </button>
              )}
            </span>
          );
        })}
      </div>
      {isOpen && (
        <div
          className={`absolute left-0 w-[22rem] bg-white border border-slate-300 shadow-xl rounded-lg z-[999] p-2 max-h-80 flex flex-col gap-2 ${
            openUp ? "bottom-full mb-1" : "top-full mt-1"
          }`}
        >
          <div className="grid grid-cols-3 gap-1">
            {CONV_TABS.map((t) => {
              const count = tabCounts[t.id];
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setTab(t.id);
                  }}
                  className={`relative text-[9px] font-black uppercase tracking-wide px-1 py-1.5 rounded border transition-colors ${
                    active
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  <span className="pr-3">{t.label}</span>
                  <span
                    className={`absolute -top-1.5 -right-1 min-w-[16px] h-4 px-1 rounded-full text-[8px] font-black flex items-center justify-center border ${
                      count > 0
                        ? active
                          ? "bg-white text-indigo-700 border-white"
                          : "bg-indigo-600 text-white border-indigo-600"
                        : active
                          ? "bg-indigo-500 text-indigo-100 border-indigo-500"
                          : "bg-slate-200 text-slate-500 border-slate-200"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="relative">
            <IconSearch
              size={12}
              className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              placeholder={`Buscar ${CONV_TABS.find((t) => t.id === tab)?.label.toLowerCase() || ""}...`}
              className="w-full text-[11px] border border-slate-200 rounded pl-7 pr-2 py-1.5 outline-none focus:border-indigo-400"
            />
          </div>
          <div className="overflow-y-auto flex-1 min-h-0 space-y-0.5">
            {tabOptions.length === 0 ? (
              <div className="text-[10px] text-slate-400 italic text-center py-3">
                {q ? "Sin resultados" : emptyHint}
              </div>
            ) : (
              tabOptions.map((opt) => {
                const selected = (value || [])
                  .map(String)
                  .includes(String(opt.id));
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleOption(opt.id);
                    }}
                    className={`w-full text-left text-[11px] px-2 py-1.5 rounded border transition-colors flex items-center gap-2 min-w-0 ${
                      selected
                        ? tab === "localidades"
                          ? "bg-purple-100 border-purple-300 font-bold text-purple-900"
                          : tab === "ensambles"
                            ? "bg-teal-100 border-teal-300 font-bold text-teal-900"
                            : "bg-indigo-100 border-indigo-300 font-bold text-indigo-900"
                        : "bg-slate-50 border-transparent hover:bg-slate-100 text-slate-700"
                    }`}
                  >
                    <span
                      className={`w-3.5 h-3.5 shrink-0 rounded border flex items-center justify-center ${
                        selected
                          ? "bg-white border-current"
                          : "border-slate-300 bg-white"
                      }`}
                    >
                      {selected && <IconCheck size={9} strokeWidth={4} />}
                    </span>
                    <span className="truncate">{opt.label}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// --- PANEL DE EDICIÓN MASIVA (barra flotante, portal → body) ---
const BulkEditPanel = ({ selectedCount, onApply, onCancel, catalogs }) => {
  const [values, setValues] = useState({
    hora_inicio: "",
    id_locacion: "",
    convocados: [],
  });
  if (typeof document === "undefined") return null;
  return createPortal(
    <div
      className="fixed z-[100] left-1/2 -translate-x-1/2 bottom-4 md:bottom-6 print:hidden max-w-[calc(100vw-1.5rem)]"
      role="status"
      aria-live="polite"
    >
      <div className="bg-indigo-700 border border-indigo-800 rounded-xl shadow-2xl px-3 py-2.5 flex flex-wrap items-center justify-between gap-3 text-white">
        <div className="flex flex-wrap items-center gap-3 min-w-0">
          <div className="flex items-center gap-2 shrink-0">
            <span className="bg-white text-indigo-700 text-xs font-black px-2 py-1 rounded-full">
              {selectedCount}
            </span>
            <span className="text-xs font-black uppercase tracking-widest">
              Edición masiva
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="w-24">
              <TimeInput
                value={values.hora_inicio}
                onChange={(v) => setValues({ ...values, hora_inicio: v })}
                className="!bg-white !text-slate-900 h-8 text-xs border-none"
              />
            </div>
            <div className="w-44 sm:w-48">
              <GridLocationSelect
                value={values.id_locacion}
                onChange={(v) => setValues({ ...values, id_locacion: v })}
                options={catalogs.locaciones}
              />
            </div>
            <div className="w-52 sm:w-56">
              <MultiGroupSelect
                value={values.convocados}
                onChange={(v) => setValues({ ...values, convocados: v })}
                catalogs={catalogs}
                darkMode={false}
              />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => onApply(values)}
            className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black px-3 py-1.5 rounded-lg shadow-md active:scale-95 transition-all flex items-center gap-1"
          >
            <IconCheck size={14} strokeWidth={3} /> Aplicar
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="p-1.5 rounded-lg text-indigo-200 hover:text-white hover:bg-indigo-600/80"
            title="Limpiar selección"
            aria-label="Limpiar selección"
          >
            <IconX size={16} />
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default function MealsManager({
  supabase,
  gira,
  roster,
  hospedajeExcluidosIds = [],
  giraGrupos = [],
  filterGrupoIds = [],
  includeGeneralEvents = true,
  /** Modo FIMBA: tags artistas + pax aditivo + skin/nav del festival. */
  fimbaMode = false,
  propuestas = [],
  edicion = null,
  readOnly = false,
  onFimbaTagsSaved = null,
  /**
   * Filtros compartidos (LogisticsDashboard → Asistencia/Reporte).
   * Si se pasan, el Manager es controlado; si no, estado local (FIMBA Comidas).
   */
  mealFilters = null,
  onMealFiltersChange = null,
}) {
  const { confirm, dialog } = useConfirmDialog();
  const [loading, setLoading] = useState(false);
  /** Fuente completa en memoria. Los filtros NUNCA escriben acá (solo hide en vista). */
  const [grid, setGrid] = useState([]);
  const [catalogs, setCatalogs] = useState({
    locaciones: [],
    localidades: [],
    localidadesLookup: [],
    ensambles: [],
    familias: [],
  });
  const [savingRows, setSavingRows] = useState(new Set());
  const [deletingRows, setDeletingRows] = useState(new Set());
  const [justSavedRows, setJustSavedRows] = useState(new Set()); // Para el destello verde
  const [comensalesDetailRow, setComensalesDetailRow] = useState(null);
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [localMealFilters, setLocalMealFilters] = useState(() =>
    createDefaultMealFilters(),
  );
  const filtersControlled = mealFilters != null && typeof onMealFiltersChange === "function";
  const activeMealFilters = filtersControlled ? mealFilters : localMealFilters;
  const patchMealFilters = (patchOrFn) => {
    const apply = (prev) => {
      const base = prev || createDefaultMealFilters();
      const patch =
        typeof patchOrFn === "function" ? patchOrFn(base) : patchOrFn;
      return { ...base, ...patch };
    };
    if (filtersControlled) {
      onMealFiltersChange(apply(mealFilters));
    } else {
      setLocalMealFilters((prev) => apply(prev));
    }
  };
  const mealKindFilter = activeMealFilters.mealKindFilter || "all";
  const serviceFilter = useMemo(
    () => new Set(activeMealFilters.serviceFilter || DEFAULT_MEAL_SERVICE_FILTER),
    [activeMealFilters.serviceFilter],
  );
  const filterLocacionIds = activeMealFilters.locacionIds || [];
  const filterArtistaIds = activeMealFilters.artistaIds || [];
  const setMealKindFilter = (v) => patchMealFilters({ mealKindFilter: v });
  const setFilterLocacionIds = (v) => patchMealFilters({ locacionIds: v });
  const setFilterArtistaIds = (v) => patchMealFilters({ artistaIds: v });
  const setServiceFilter = (updater) => {
    patchMealFilters((prev) => {
      const cur = new Set(prev.serviceFilter || DEFAULT_MEAL_SERVICE_FILTER);
      const next = typeof updater === "function" ? updater(cur) : updater;
      return { serviceFilter: [...next] };
    });
  };
  const [mealTypes, setMealTypes] = useState([]);
  const [mealTypesEditorOpen, setMealTypesEditorOpen] = useState(false);
  const [resettingNames, setResettingNames] = useState(false);
  const debounceRef = useRef({});
  const [activeSegmentIdx, setActiveSegmentIdx] = useState(0);
  const {
    cortes,
    segmentRows,
    segments,
    cortesCount,
  } = useGiraSegmentos(supabase, gira, {
    enabled: Boolean(gira?.id),
  });
  const segmentSpecs = useMemo(
    () => buildSegmentSpecs(gira, cortes),
    [gira, cortes],
  );
  const activeSegment = segments[activeSegmentIdx] ?? segments[0] ?? null;

  const hasGiraGrupos = (giraGrupos || []).length > 0;
  const integranteGruposMap = useMemo(
    () => buildIntegranteGruposMap(giraGrupos, roster || []),
    [giraGrupos, roster],
  );
  const giraGrupoOptions = useMemo(
    () =>
      (giraGrupos || []).map((g) => ({
        value: Number(g.id),
        label: g.nombre,
        color: g.color,
      })),
    [giraGrupos],
  );

  const isLocalInActiveTramo = useCallback(
    (person) => {
      if (!person) return false;
      if (cortesCount > 0 && activeSegment && segments?.length) {
        return isLocalAt(
          person,
          { fecha: activeSegment.fecha_desde, hora: "12:00" },
          segments,
        );
      }
      return Boolean(person.is_local);
    },
    [cortesCount, activeSegment, segments],
  );

  const groupDefsEffective = useMemo(() => {
    const excluded = new Set(
      (hospedajeExcluidosIds || []).map((id) => Number(id)),
    );
    return GROUP_DEFS.map((g) => {
      if (g.id === "GRP:NO_LOCALES") {
        return {
          ...g,
          filter: (p) =>
            !isLocalInActiveTramo(p) &&
            p.estado_gira === "confirmado" &&
            !excluded.has(Number(p.id)),
        };
      }
      if (g.id === "GRP:LOCALES") {
        return {
          ...g,
          filter: (p) =>
            isLocalInActiveTramo(p) && p.estado_gira === "confirmado",
        };
      }
      return g;
    });
  }, [hospedajeExcluidosIds, isLocalInActiveTramo]);

  useEffect(() => {
    setSelectedRows(new Set());
  }, [activeSegmentIdx]);

  useEffect(() => {
    if (gira?.id) fetchAllData();
  }, [gira?.id]);

  useEffect(() => {
    const localidades = collectRosterResidenciaLocalidades(roster);
    const ensambles = collectRosterEnsambles(roster);
    const fams = [
      ...new Set((roster || []).map((m) => m.instrumentos?.familia).filter(Boolean)),
    ];
    setCatalogs((prev) => ({
      ...prev,
      localidades,
      ensambles,
      familias: fams,
    }));
  }, [roster]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const { data: locs } = await supabase
        .from("locaciones")
        .select("id, nombre, localidades(localidad)")
        .order("nombre");
      const { data: locsGeo } = await supabase
        .from("localidades")
        .select("id, localidad")
        .order("localidad");
      setCatalogs((prev) => ({
        ...prev,
        locaciones: (locs || []).map((l) => ({
          id: l.id,
          label: `${l.nombre} (${l.localidades?.localidad || ""})`,
        })),
        localidadesLookup: locsGeo || [],
        localidades: collectRosterResidenciaLocalidades(roster),
        ensambles: collectRosterEnsambles(roster),
        familias: [
          ...new Set(
            (roster || []).map((m) => m.instrumentos?.familia).filter(Boolean),
          ),
        ],
      }));
      try {
        const types = await fetchMealRelatedEventTypes(supabase);
        setMealTypes(types);
      } catch (err) {
        console.error(err);
        toast.error("No se pudieron cargar los tipos de comida / catering");
      }
      await refreshGridData();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const refreshGridData = async () => {
    // Siempre embeber tags FIMBA: en OFRN identifican comidas compartidas
    // (badge ×N / chips RO). Filas solo-artista se excluyen abajo si !fimbaMode.
    const selectCols = `*, tipos_evento ( id, nombre, color, id_categoria, categorias_tipos_eventos ( id, nombre ) ), eventos_grupos ( id_grupo, giras_grupos ( id, nombre, color ) ), eventos_fimba_propuestas ( id_propuesta, fimba_propuestas ( id, nombre, color, cantidad_planificada, requiere_comidas, estado ) )`;
    const { data: meals } = await supabase
      .from("eventos")
      .select(selectCols)
      .eq("id_gira", gira.id)
      .eq("is_deleted", false)
      .order("fecha", { ascending: true })
      .order("hora_inicio", { ascending: true });
    const mealOnly = (meals || [])
      .filter(isMealRelatedEvent)
      // OFRN Manager: ocultar comidas solo-artista FIMBA (paridad agenda «sin FIMBA»).
      // FIMBA Comidas (`fimbaMode`) las conserva para taggear / pax.
      .filter((m) => fimbaMode || !isFimbaArtistOnlyMealEvent(m))
      .map((m) => {
        const props = (m.eventos_fimba_propuestas || [])
          .map((link) => link.fimba_propuestas)
          .filter(Boolean);
        return { ...m, propuestas: props };
      });
    const { data: rules } = await supabase
      .from("giras_logistica_reglas")
      .select("*")
      .eq("id_gira", gira.id);
    calculateGrid(mealOnly, rules || []);
  };

  const makeTempMealRow = (fecha, servicio) => {
    const idTipo = typeIdForBase(mealTypes, servicio);
    const tipoNombre = typeNombreById(mealTypes, idTipo) || servicio;
    return {
      id: `temp-${fecha}-${servicio}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      fecha,
      servicio,
      id_tipo_evento: idTipo,
      tipo_nombre: tipoNombre,
      hora_inicio: "",
      hora_fin: "",
      descripcion: "",
      id_locacion: "",
      convocados: [],
      selectedGrupos: [],
      visible_agenda: true,
      tecnica: false,
      isTemp: true,
      dirty: false,
    };
  };

  const toDateKey = (raw) => {
    if (!raw) return null;
    const s = String(raw).slice(0, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
  };

  const formatLocalYmd = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const calculateGrid = (mealsData, rulesData) => {
    const normalizedMeals = mealsData
      .map((m) => {
        const fecha = toDateKey(m.fecha);
        const servicio = mealServicioFromEvent(m);
        if (!fecha || !servicio) return null;
        const tipo_nombre =
          m.tipos_evento?.nombre ||
          typeNombreById(mealTypes, m.id_tipo_evento) ||
          servicio;
        return {
          ...m,
          fecha,
          servicio,
          id_tipo_evento: m.id_tipo_evento,
          tipo_nombre,
          hora_inicio: m.hora_inicio?.slice(0, 5),
          hora_fin: m.hora_fin?.slice(0, 5),
          selectedGrupos: eventGrupoIdsFromEvent(m),
          dirty: false,
        };
      })
      .filter(Boolean);
    const cateringMeals = normalizedMeals.filter(
      (m) => m.servicio === CATERING_SERVICE || isCateringEvent(m),
    );
    const slotMeals = normalizedMeals.filter(
      (m) => m.servicio !== CATERING_SERVICE && !isCateringEvent(m),
    );
    const toIntKey = (d, s) => {
      const fecha = toDateKey(d);
      if (!fecha || SERVICE_VALS[s] == null) return null;
      return parseInt(`${fecha.replaceAll("-", "")}${SERVICE_VALS[s]}`, 10);
    };
    let minKey = Infinity,
      maxKey = -Infinity;
    rulesData.forEach((r) => {
      if (r.comida_inicio_fecha) {
        const k = toIntKey(
          r.comida_inicio_fecha,
          r.comida_inicio_servicio || "Desayuno",
        );
        if (k != null) minKey = Math.min(minKey, k);
      }
      if (r.comida_fin_fecha) {
        const k = toIntKey(
          r.comida_fin_fecha,
          r.comida_fin_servicio || "Cena",
        );
        if (k != null) maxKey = Math.max(maxKey, k);
      }
    });
    slotMeals.forEach((m) => {
      const k = toIntKey(m.fecha, m.servicio);
      if (k == null) return;
      if (k < minKey) minKey = k;
      if (k > maxKey) maxKey = k;
    });
    // Sin reglas ni comidas: usar fechas de la gira para poder crear desde vacantes.
    if (minKey === Infinity) {
      const from = toDateKey(gira?.fecha_desde);
      const to = toDateKey(gira?.fecha_hasta);
      if (from && to) {
        minKey = toIntKey(from, "Desayuno");
        maxKey = toIntKey(to, "Cena");
      }
    }
    const newGrid = [];
    if (minKey !== Infinity && maxKey !== -Infinity && minKey != null && maxKey != null) {
      const minStr = String(minKey);
      let curDate = new Date(
        parseInt(minStr.substring(0, 4), 10),
        parseInt(minStr.substring(4, 6), 10) - 1,
        parseInt(minStr.substring(6, 8), 10),
      );
      const maxStr = String(maxKey);
      const endDate = new Date(
        parseInt(maxStr.substring(0, 4), 10),
        parseInt(maxStr.substring(4, 6), 10) - 1,
        parseInt(maxStr.substring(6, 8), 10),
      );
      while (curDate <= endDate) {
        const dStr = formatLocalYmd(curDate);
        SERVICIOS.forEach((svc) => {
          const k = toIntKey(dStr, svc);
          if (k == null || k < minKey || k > maxKey) return;
          const existing = slotMeals
            .filter((m) => m.fecha === dStr && m.servicio === svc)
            .sort((a, b) => {
              const ha = a.hora_inicio || "";
              const hb = b.hora_inicio || "";
              if (ha !== hb) return ha.localeCompare(hb);
              return Number(a.id) - Number(b.id);
            });
          if (existing.length === 0) {
            // Solo vacante si aún no hay comida de ese servicio ese día.
            newGrid.push(makeTempMealRow(dStr, svc));
          } else {
            existing.forEach((m) => {
              newGrid.push({ ...m, isTemp: false, dirty: false });
            });
          }
        });
        curDate.setDate(curDate.getDate() + 1);
      }
    }
    // Catering: sin vacantes; se listan los eventos reales (misma gira).
    // Importante: no dejarlos al final del array — se reordenan con el sort global.
    cateringMeals.forEach((m) => {
      newGrid.push({
        ...m,
        servicio: CATERING_SERVICE,
        isTemp: false,
        dirty: false,
      });
    });
    // Merge D/A/M/C (walk) + Catering → orden cronológico estable
    // (fecha → servicio → hora → id).
    setGrid(sortMealManagerGrid(newGrid));
  };

  /** Agrega otra fila del mismo día/servicio (p. ej. 2.º almuerzo para otro grupo). */
  const addSiblingMeal = (row) => {
    if (!row?.fecha || !row?.servicio) return;
    const newRow = makeTempMealRow(row.fecha, row.servicio);
    setGrid((prev) => {
      const idx = prev.findIndex((r) => r.id === row.id);
      if (idx === -1) return sortMealManagerGrid([...prev, newRow]);
      let insertAt = idx + 1;
      while (
        insertAt < prev.length &&
        prev[insertAt].fecha === row.fecha &&
        prev[insertAt].servicio === row.servicio
      ) {
        insertAt += 1;
      }
      const copy = [...prev];
      copy.splice(insertAt, 0, newRow);
      return sortMealManagerGrid(copy);
    });
  };

  const getEligiblePeopleRaw = useCallback(
    (row) => {
      // Sin audiencia OFRN (GRP:NONE, o convocados∅ + grupos∅) → solo artistas FIMBA.
      // Grupos sin convocados sí cuentan (eje vacío = no filtra; AND con grupos).
      if (!mealRowHasOfrnAudience(row)) return [];
      return (roster || []).filter((p) =>
        isPersonEligibleForMealSlot(
          p,
          {
            fecha: row.fecha,
            servicio: row.servicio,
            convocados: row.convocados || [],
            hora: row.hora_inicio,
            grupoIds: mealRowGrupoIds(row),
          },
          {
            hospedajeExcluidosIds,
            segments,
            integranteGruposMap,
          },
        ),
      );
    },
    [roster, hospedajeExcluidosIds, segments, integranteGruposMap],
  );

  /**
   * Elegibles OFRN + deducción orquesta↔grupo (mismo turno: fecha|servicio).
   * Grupo tiene prioridad aunque la locación difiera. Artistas FIMBA aditivos.
   */
  const getEligibleBreakdown = useCallback(
    (row) => {
      const raw = getEligiblePeopleRaw(row);
      if (!row || row.isTemp || !isOrchestraMealRow(row)) {
        return { people: raw, deducted: [], deductedCount: 0 };
      }
      const coinciding = findCoincidingGrupoMealRows(row, grid);
      if (!coinciding.length) {
        return { people: raw, deducted: [], deductedCount: 0 };
      }
      return deductGrupoMembersFromOrchestraEligible(
        raw,
        coinciding,
        getEligiblePeopleRaw,
      );
    },
    [getEligiblePeopleRaw, grid],
  );

  const getEligiblePeople = useCallback(
    (row) => getEligibleBreakdown(row).people,
    [getEligibleBreakdown],
  );

  const getComensalesTotal = useCallback(
    (row) => {
      const ofrn = getEligiblePeople(row).length;
      const artists = fimbaArtistMealPax(row?.propuestas || []);
      return ofrn + artists;
    },
    [getEligiblePeople],
  );

  /**
   * Sobre-inclusión: misma persona OFRN (o mismo tag FIMBA) en ≥2 comidas
   * del mismo turno (fecha|servicio), post-deducción orquesta↔grupo.
   */
  const turnoOverInclusions = useMemo(
    () => findMealTurnoOverInclusions(grid, getEligiblePeople),
    [grid, getEligiblePeople],
  );
  const [overInclusionOpen, setOverInclusionOpen] = useState(false);

  /** Filas reales (no vacantes temp) para cobertura A/M/C + inferencia de locación. */
  const coverageSiblingRows = useMemo(() => {
    if (!fimbaMode) return [];
    return (grid || []).filter(
      (r) => r && !r.isTemp && r.id != null && !String(r.id).startsWith("temp-"),
    );
  }, [fimbaMode, grid]);

  const coverageGaps = useMemo(() => {
    if (!fimbaMode) return [];
    return findFimbaArtistMealCoverageGaps(coverageSiblingRows, {
      propuestas,
    });
  }, [fimbaMode, coverageSiblingRows, propuestas]);

  const handleCreateCoverageGap = async (gap) => {
    if (!gira?.id || !gap) return;
    await createCoverageGapsWithToast(supabase, [gap], {
      giraId: gira.id,
      siblingRows: coverageSiblingRows,
      mealTypes,
    });
    await refreshGridData();
    onFimbaTagsSaved?.();
  };

  const handleCreateAllCoverageGaps = async (gapsList) => {
    if (!gira?.id) return;
    await createCoverageGapsWithToast(supabase, gapsList, {
      giraId: gira.id,
      siblingRows: coverageSiblingRows,
      mealTypes,
    });
    await refreshGridData();
    onFimbaTagsSaved?.();
  };

  const gridById = useMemo(() => {
    const map = new Map();
    for (const row of grid) {
      if (!row?.isTemp && row?.id != null) map.set(String(row.id), row);
    }
    return map;
  }, [grid]);

  const rowHasTurnoOverInclusion = useCallback(
    (row) => {
      if (!row || row.isTemp) return false;
      const bucket = turnoOverInclusions.byEventId.get(String(row.id));
      return Boolean(
        bucket && (bucket.personIds.size > 0 || bucket.artistIds.size > 0),
      );
    },
    [turnoOverInclusions],
  );

  const liveComensalesDetailRow = useMemo(() => {
    if (!comensalesDetailRow) return null;
    return gridById.get(String(comensalesDetailRow.id)) || comensalesDetailRow;
  }, [comensalesDetailRow, gridById]);

  const hasAnyFimbaTags = useMemo(
    () =>
      fimbaMode ||
      grid.some((r) => !r.isTemp && (r.propuestas || []).length > 0),
    [grid, fimbaMode],
  );

  const mealTableColCount =
    12 + (hasGiraGrupos ? 1 : 0) + (hasAnyFimbaTags ? 1 : 0);

  /** Tinte muy suave por servicio (solo FIMBA); hex del estilo de comida. */
  const fimbaMealRowTintStyle = useCallback(
    (servicio) => {
      if (!fimbaMode) return undefined;
      const hex = getMealServiceStyle(servicio)?.print?.border || "#94a3b8";
      const h = String(hex).replace("#", "");
      if (h.length !== 6) return { backgroundColor: "rgba(148,163,184,0.08)" };
      const r = parseInt(h.slice(0, 2), 16);
      const g = parseInt(h.slice(2, 4), 16);
      const b = parseInt(h.slice(4, 6), 16);
      return { backgroundColor: `rgba(${r},${g},${b},0.08)` };
    },
    [fimbaMode],
  );

  const normalizeTimeHHMM = (value) => {
    const raw = String(value || "").trim();
    if (!raw) return "";
    const digits = raw.replace(/[^\d]/g, "");
    if (!digits) return "";
    const h = parseInt(digits.slice(0, 2), 10);
    const m = parseInt(digits.slice(2, 4) || "0", 10);
    const hh = Number.isNaN(h) ? 0 : Math.min(23, Math.max(0, h));
    const mm = Number.isNaN(m) ? 0 : Math.min(59, Math.max(0, m));
    return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
  };

  const handleGridChange = (rowId, field, val) => {
    setGrid((prev) => {
      const idx = prev.findIndex((r) => r.id === rowId);
      if (idx < 0) return prev;
      const copy = [...prev];
      const normalizedVal =
        field === "hora_inicio" || field === "hora_fin"
          ? normalizeTimeHHMM(val)
          : field === "id_tipo_evento"
            ? val === "" || val == null
              ? null
              : Number(val)
            : val;
      const prevRow = copy[idx];
      let row = { ...prevRow, [field]: normalizedVal, dirty: true };

      if (field === "id_tipo_evento") {
        const tipoId = normalizedVal;
        const tipoNombre =
          typeNombreById(mealTypes, tipoId) || prevRow.tipo_nombre;
        const base =
          mealBaseFromTypeName(tipoNombre) ||
          mealServicioFromEvent({
            id_tipo_evento: tipoId,
            tipos_evento: { nombre: tipoNombre },
          }) ||
          prevRow.servicio;
        const oldLabel =
          prevRow.tipo_nombre ||
          serviceLabelOf(prevRow.servicio, prevRow.servicio_detalle);
        row.tipo_nombre = tipoNombre;
        row.servicio = base;
        if (!stripHtmlToPlain(prevRow.descripcion)) {
          row.descripcion = buildMealDescription(
            tipoNombre || base,
            row.convocados,
            catalogs,
            row.propuestas,
          );
        } else {
          row.descripcion = rewriteMealDescriptionServiceLabel(
            prevRow.descripcion,
            oldLabel,
            tipoNombre || base,
          );
        }
      } else if (field === "convocados") {
        const prevConvocados = prevRow.convocados;
        const label =
          row.tipo_nombre ||
          serviceLabelOf(row.servicio, row.servicio_detalle) ||
          row.servicio;
        row.descripcion = mergeMealDescriptionWithConvocados(
          prevRow.descripcion,
          label,
          val,
          catalogs,
          prevConvocados,
          row.propuestas,
        );
      } else if (field === "selectedGrupos") {
        const grupos = Array.isArray(normalizedVal) ? normalizedVal.map(Number) : [];
        row.selectedGrupos = grupos;
        row.eventos_grupos = buildEventosGruposEmbed(grupos, giraGrupos);
      }

      copy[idx] = row;
      const nextGrid = isMealPaxAffectingField(field)
        ? rematerializeTurnoSiblings(copy, idx, prevRow, row)
        : copy;

      if (debounceRef.current[row.id]) clearTimeout(debounceRef.current[row.id]);
      if (row.hora_inicio && row.fecha) {
        debounceRef.current[row.id] = setTimeout(() => saveRow(row), 1000);
      }
      // Reordenar si mutó posición cronológica (hora / tipo→servicio).
      if (
        field === "hora_inicio" ||
        field === "hora_fin" ||
        field === "id_tipo_evento" ||
        field === "fecha"
      ) {
        return sortMealManagerGrid(nextGrid);
      }
      return nextGrid;
    });
  };

  const handleBulkApply = async (changes) => {
    const selectedIds = Array.from(selectedRows);

    const rowsToSave = grid
      .filter((r) => selectedIds.includes(r.id))
      .map((r) => {
        const newRow = { ...r, dirty: true };

        if (changes.hora_inicio) {
          newRow.hora_inicio = changes.hora_inicio;
        }

        if (changes.id_locacion) {
          newRow.id_locacion = changes.id_locacion;
        }

        if (Array.isArray(changes.convocados) && changes.convocados.length > 0) {
          newRow.convocados = changes.convocados;
          newRow.descripcion = mergeMealDescriptionWithConvocados(
            r.descripcion,
            newRow.tipo_nombre ||
              serviceLabelOf(newRow.servicio, newRow.servicio_detalle) ||
              newRow.servicio,
            changes.convocados,
            catalogs,
            r.convocados,
            r.propuestas,
          );
        }

        return newRow;
      });

    setSelectedRows(new Set());

    for (const row of rowsToSave) {
      if (row.fecha && row.hora_inicio) {
        await saveRow(row);
      }
    }

    refreshGridData();
  };

  const handleResetAllMealNames = async () => {
    const rowsToUpdate = grid.filter((r) => !r.isTemp && r.fecha && r.hora_inicio);
    if (rowsToUpdate.length === 0) {
      toast.info("No hay comidas guardadas para renombrar.");
      return;
    }
    const ok = await confirm({
      title: "Renombrar comidas",
      message: `¿Renombrar ${rowsToUpdate.length} comida(s)? Se actualiza el tramo auto (servicio + convocados + siglas de artistas FIMBA). Se conservan aclaraciones de producción (ej. "a bordo", "pausa y merienda").`,
      confirmText: "Renombrar",
    });
    if (!ok) return;

    setResettingNames(true);
    try {
      const updates = rowsToUpdate.map((row) => {
        const serviceLabel =
          row.tipo_nombre ||
          serviceLabelOf(row.servicio, row.servicio_detalle) ||
          row.servicio;
        // Lee propuestas/tags en memoria de la fila (no solo convocados).
        const descripcion = mergeMealDescriptionWithConvocados(
          row.descripcion,
          serviceLabel,
          row.convocados,
          catalogs,
          row.convocados,
          row.propuestas || [],
        );
        return { id: row.id, descripcion };
      });

      const results = await Promise.all(
        updates.map(({ id, descripcion }) =>
          supabase.from("eventos").update({ descripcion }).eq("id", id),
        ),
      );
      const firstError = results.find((r) => r.error)?.error;
      if (firstError) throw firstError;

      setGrid((prev) =>
        prev.map((r) => {
          const u = updates.find((x) => x.id === r.id);
          return u ? { ...r, descripcion: u.descripcion, dirty: false } : r;
        }),
      );

      toast.success(`Renombradas ${updates.length} comida(s).`);
    } catch (e) {
      console.error(e);
      toast.error(
        e?.message
          ? `No se pudieron renombrar: ${e.message}`
          : "No se pudieron renombrar los nombres.",
      );
    } finally {
      setResettingNames(false);
    }
  };

  const saveRow = async (row) => {
    if (!row.fecha || !row.hora_inicio) return;
    setSavingRows((prev) => new Set(prev).add(row.id));
    
    const label =
      row.tipo_nombre ||
      serviceLabelOf(row.servicio, row.servicio_detalle) ||
      row.servicio;
    const tipoId =
      row.id_tipo_evento != null
        ? Number(row.id_tipo_evento)
        : typeIdForBase(mealTypes, row.servicio);
    if (!tipoId) {
      toast.error("Elegí un tipo de comida válido");
      setSavingRows((prev) => {
        const n = new Set(prev);
        n.delete(row.id);
        return n;
      });
      return;
    }
    const payload = {
      id_gira: gira.id,
      fecha: row.fecha,
      id_tipo_evento: tipoId,
      hora_inicio: row.hora_inicio || null,
      hora_fin: row.hora_fin || null,
      descripcion: row.descripcion || `${label} Gira`,
      id_locacion: row.id_locacion || null,
      convocados: row.convocados || [],
      visible_agenda: row.visible_agenda,
      tecnica: !!row.tecnica,
    };

    try {
      // Embeber tags FIMBA para no perder chips al guardar convocados/hora/etc.
      const selectMeal = `*, tipos_evento ( id, nombre, color, id_categoria ), eventos_fimba_propuestas ( id_propuesta, fimba_propuestas ( id, nombre, color, cantidad_planificada, requiere_comidas, estado ) )`;
      const { data } = row.isTemp
        ? await supabase
            .from("eventos")
            .insert([payload])
            .select(selectMeal)
            .single()
        : await supabase
            .from("eventos")
            .update(payload)
            .eq("id", row.id)
            .select(selectMeal)
            .single();

      const savedId = data?.id;
      if (savedId != null && hasGiraGrupos) {
        const { error: gruposError } = await setEventoGrupos(
          supabase,
          savedId,
          row.selectedGrupos || [],
        );
        if (gruposError) {
          toast.error("Comida guardada, pero falló asignar grupos: " + gruposError.message);
        }
      }

      const eventos_grupos = buildEventosGruposEmbed(
        row.selectedGrupos || [],
        giraGrupos,
      );

      const propuestasFromSelect = (data?.eventos_fimba_propuestas || [])
        .map((link) => link.fimba_propuestas)
        .filter(Boolean);
      // Preferir embed fresco; si falla el join, conservar tags locales (no borrar artistas).
      const preservedPropuestas =
        propuestasFromSelect.length > 0
          ? propuestasFromSelect
          : row.propuestas || [];

      const patched = {
        ...data,
        tipos_evento: data.tipos_evento || {
          id: data.id_tipo_evento,
          nombre:
            typeNombreById(mealTypes, data.id_tipo_evento) ||
            row.tipo_nombre,
        },
        servicio: mealServicioFromEvent({
          ...data,
          tipos_evento: data.tipos_evento || {
            nombre:
              typeNombreById(mealTypes, data.id_tipo_evento) ||
              row.tipo_nombre,
          },
        }),
        tipo_nombre:
          data.tipos_evento?.nombre ||
          typeNombreById(mealTypes, data.id_tipo_evento) ||
          row.tipo_nombre,
        id_tipo_evento: data.id_tipo_evento,
        selectedGrupos: row.selectedGrupos || [],
        eventos_grupos,
        propuestas: preservedPropuestas,
        isTemp: false,
        dirty: false,
      };

      setGrid((prev) => {
        const oldIdx = prev.findIndex((r) => r.id === row.id);
        const prevRow = oldIdx >= 0 ? prev[oldIdx] : row;
        const next = prev.map((r) => (r.id === row.id ? patched : r));
        const editedIdx = next.findIndex((r) => r.id === patched.id);
        if (editedIdx < 0) return next;
        // Recalcular derivados del turno (deducción / sobre-inclusión) para hermanas.
        return rematerializeTurnoSiblings(
          next,
          editedIdx,
          prevRow,
          next[editedIdx],
        );
      });

      // --- DESTELLO VERDE ---
      setJustSavedRows((prev) => new Set(prev).add(patched.id));
      setTimeout(() => {
        setJustSavedRows((prev) => {
          const n = new Set(prev);
          n.delete(patched.id);
          return n;
        });
      }, 1500); // 1.5 segundos de destello

    } catch (e) {
      console.error(e);
      toast.error("Error al guardar fila");
    } finally {
      setSavingRows((prev) => {
        const n = new Set(prev);
        n.delete(row.id);
        return n;
      });
    }
  };

  const deleteRow = async (row) => {
    if (row.isTemp) {
      const siblings = grid.filter(
        (r) => r.fecha === row.fecha && r.servicio === row.servicio,
      );
      // Si es el único slot vacío del día/servicio, no lo quites (queda placeholder).
      if (siblings.length <= 1) return;
      setGrid((prev) => prev.filter((r) => r.id !== row.id));
      return;
    }
    if (
      !(await confirm({
        title: "Borrar evento",
        message: "¿Borrar este evento?",
        destructive: true,
        confirmText: "Borrar",
      }))
    )
      return;

    const rowId = row.id;
    setDeletingRows((prev) => new Set(prev).add(rowId));
    try {
      const { error } = await supabase
        .from("eventos")
        .delete()
        .eq("id", rowId);
      if (error) throw error;

      // Quitar de la grilla de inmediato (sin esperar refresh completo).
      setGrid((prev) => prev.filter((r) => r.id !== rowId));
      setSelectedRows((prev) => {
        if (!prev.has(rowId)) return prev;
        const n = new Set(prev);
        n.delete(rowId);
        return n;
      });
      if (comensalesDetailRow?.id === rowId) setComensalesDetailRow(null);

      // Reconstruir vacantes del día/servicio en background (no bloquea el spinner).
      refreshGridData().catch((e) => console.error(e));
    } catch (e) {
      console.error(e);
      toast.error(
        e?.message
          ? `No se pudo borrar: ${e.message}`
          : "No se pudo borrar el evento",
      );
    } finally {
      setDeletingRows((prev) => {
        const n = new Set(prev);
        n.delete(rowId);
        return n;
      });
    }
  };

  const [editingDescId, setEditingDescId] = useState(null);
  const [editingDescValue, setEditingDescValue] = useState("");
  const [toolbarPos, setToolbarPos] = useState({ top: 0, left: 0, visible: false });
  const editorRef = useRef(null);
  const [mobileEditingRow, setMobileEditingRow] = useState(null);
  const [mobileGroupsOpen, setMobileGroupsOpen] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const NO_LOC_FILTER = MEAL_FILTER_NO_LOC;

  const locationFilterOptions = useMemo(() => {
    const map = new Map();
    let hasNone = false;
    for (const r of grid) {
      if (r.isTemp) continue;
      const id = r.id_locacion;
      if (id == null || id === "") {
        hasNone = true;
        continue;
      }
      const key = String(id);
      if (map.has(key)) continue;
      const cat = catalogs.locaciones.find((l) => String(l.id) === key);
      map.set(key, {
        value: key,
        label: cat?.label || `Locación ${key}`,
      });
    }
    const opts = Array.from(map.values()).sort((a, b) =>
      a.label.localeCompare(b.label, "es"),
    );
    if (hasNone) {
      opts.push({ value: NO_LOC_FILTER, label: "Sin locación" });
    }
    return opts;
  }, [grid, catalogs.locaciones]);

  const artistFilterOptions = useMemo(
    () => buildMealArtistFilterOptions({ propuestas, rows: grid }),
    [grid, propuestas],
  );
  const showArtistFilter =
    fimbaMode ||
    artistFilterOptions.some(
      (o) => o.value !== MEAL_FILTER_ORCHESTRA_ONLY,
    );

  /**
   * Vista filtrada derivada — nunca se escribe de vuelta a `grid`.
   * Fuente = grid completo; filtros solo ocultan; re-sort por si mutaciones
   * locales (hora/fecha/hermanas) desalinearían el orden del walk+catering.
   */
  const filteredGrid = useMemo(
    () =>
      sortMealManagerGrid(
        filterMealManagerRows(grid, {
          mealKindFilter,
          serviceFilter,
          locacionIds: filterLocacionIds,
          artistaIds: filterArtistaIds,
        }),
      ),
    [
      grid,
      serviceFilter,
      mealKindFilter,
      filterLocacionIds,
      filterArtistaIds,
    ],
  );

  const visibleGrid = useMemo(() => {
    let rows =
      cortesCount === 0 || !activeSegment
        ? filteredGrid
        : filteredGrid.filter((row) =>
            mealBelongsToSegment(
              {
                fecha: row.fecha,
                servicio: row.servicio,
                hora_inicio: row.hora_inicio,
              },
              activeSegment,
              activeSegmentIdx,
              segments,
            ),
          );
    if (hasGiraGrupos && (filterGrupoIds || []).length > 0) {
      rows = rows.filter((row) => {
        // Vacantes siempre visibles para poder crear (aunque el filtro oculte generales).
        if (row.isTemp) return true;
        return eventPassesEditorialGrupoFilter(
          {
            ...row,
            eventos_grupos: (row.selectedGrupos || []).map((gid) => ({
              id_grupo: gid,
            })),
          },
          filterGrupoIds,
          includeGeneralEvents,
        );
      });
    }
    return rows;
  }, [
    filteredGrid,
    activeSegment,
    activeSegmentIdx,
    cortesCount,
    segments,
    hasGiraGrupos,
    filterGrupoIds,
    includeGeneralEvents,
  ]);

  const hasActiveExtraFilters = !isDefaultMealFilters(activeMealFilters);

  const clearMealFilters = () => {
    patchMealFilters(createDefaultMealFilters());
  };

  const gridRenderItems = useMemo(
    () => buildGridRenderItems(visibleGrid, fimbaMode),
    [visibleGrid, fimbaMode],
  );

  const realEventIds = useMemo(() => grid.filter((r) => !r.isTemp).map((r) => r.id), [grid]);

  const toggleServiceFilter = (svc) => {
    setServiceFilter((prev) => {
      const next = new Set(prev);
      if (next.has(svc)) next.delete(svc);
      else next.add(svc);
      return next;
    });
  };

  const execDescCmd = (command) => {
    document.execCommand(command, false, null);
    if (editorRef.current) editorRef.current.focus();
  };

  const handleDescPaste = (e) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain");
    document.execCommand("insertText", false, text);
  };

  const handleDescFocus = (e, row) => {
    setEditingDescId(row.id);
    setEditingDescValue(row.descripcion || "");
    editorRef.current = e.currentTarget;
    const rect = e.currentTarget.getBoundingClientRect();
    setToolbarPos({
      top: rect.top + window.scrollY - 40,
      left: rect.left + window.scrollX + 8,
      visible: true,
    });
  };

  const handleDescBlur = (row) => {
    setToolbarPos((prev) => ({ ...prev, visible: false }));
    const newHtml = editorRef.current?.innerHTML ?? editingDescValue;
    if (newHtml !== (row.descripcion || "")) {
      handleGridChange(row.id, "descripcion", newHtml);
    }
    setEditingDescId(null);
  };

  const handleDescKeyDown = (e, row) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      // Forzamos blur + guardado
      e.currentTarget.blur();
      handleDescBlur(row);
    }
  };
  const isMasterChecked = selectedRows.size === grid.length && grid.length > 0;
  const isOnlyRealSelected = selectedRows.size === realEventIds.length && realEventIds.every((id) => selectedRows.has(id)) && realEventIds.length > 0;

  return (
    <div className="flex flex-col h-full min-h-0 bg-slate-50 overflow-hidden">
      {dialog}
      <div className="bg-white p-3 md:p-4 border-b border-slate-200 shadow-sm flex justify-between items-center shrink-0 z-40 relative overflow-visible">
        <div className="flex items-center min-w-0 overflow-visible">
          <div className="flex items-center gap-2 shrink-0">
            <IconUtensils className="text-orange-500" />
            <h2 className="text-lg font-bold text-slate-800 whitespace-nowrap">Comidas</h2>
          </div>
          <div className="hidden md:block overflow-visible">
            <GroupInspectorHeader
              roster={roster}
              catalogs={catalogs}
              groupDefs={groupDefsEffective}
            />
          </div>
        </div>
        <div className="hidden md:flex items-center gap-3 flex-wrap justify-end min-w-0">
          {/* Clase: Comidas / Catering / Ambos */}
          <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 shrink-0">
            <span className="mr-1 uppercase">Tipo:</span>
            {[
              { id: "all", label: "Todos" },
              { id: "comidas", label: "Comidas" },
              { id: "catering", label: "Catering" },
            ].map((opt) => {
              const isActive = mealKindFilter === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setMealKindFilter(opt.id)}
                  className={`px-2 py-0.5 rounded-full border text-[10px] uppercase tracking-wide transition-colors ${
                    isActive
                      ? opt.id === "catering"
                        ? "bg-orange-600 text-white border-orange-600 shadow-sm"
                        : "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                      : "bg-slate-50 text-slate-500 border-slate-300 hover:bg-slate-100"
                  }`}
                  title={
                    opt.id === "all"
                      ? "Comidas y catering"
                      : opt.id === "comidas"
                        ? "Solo categoría Comidas (D/A/M/C)"
                        : "Solo categoría Catering"
                  }
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
          {/* Filtros rápidos por tipo de servicio: D/A/M/C + Catering */}
          <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 shrink-0">
            <span className="mr-1 uppercase">Servicios:</span>
            {[...SERVICIOS, CATERING_SERVICE].map((svc) => {
              const isActive = serviceFilter.has(svc);
              const short =
                svc === "Desayuno"
                  ? "D"
                  : svc === "Almuerzo"
                  ? "A"
                  : svc === "Merienda"
                  ? "M"
                  : svc === "Cena"
                  ? "C"
                  : "Cat";
              return (
                <button
                  key={svc}
                  type="button"
                  onClick={() => toggleServiceFilter(svc)}
                  className={`px-2 py-0.5 rounded-full border text-[10px] uppercase tracking-wide transition-colors ${
                    isActive
                      ? svc === CATERING_SERVICE
                        ? "bg-orange-600 text-white border-orange-600 shadow-sm"
                        : "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                      : "bg-slate-50 text-slate-500 border-slate-300 hover:bg-slate-100"
                  }`}
                  title={svc}
                >
                  {short}
                </button>
              );
            })}
          </div>
          {showArtistFilter && (
            <MealOrchestraOnlyFilterChip
              value={filterArtistaIds}
              onChange={setFilterArtistaIds}
            />
          )}
          <div
            className={`inline-flex items-stretch rounded-lg border overflow-visible h-[28px] shadow-sm bg-white shrink-0 ${
              filterLocacionIds.length > 0 || filterArtistaIds.length > 0
                ? "border-indigo-400"
                : "border-slate-200"
            }`}
            title="Filtros de locación y artistas FIMBA"
          >
            <div className="w-[7.25rem]">
              <MultiSelectDropdown
                compact
                summaryMode="names"
                summaryMaxNames={1}
                label="Locación"
                placeholder="Locación…"
                options={locationFilterOptions}
                value={filterLocacionIds}
                onChange={setFilterLocacionIds}
                className="w-full [&_button]:w-full [&_button]:h-[26px] [&_button]:border-0 [&_button]:rounded-none [&_button]:bg-transparent [&_button]:shadow-none [&_button]:hover:border-transparent [&_button]:px-2 [&_button]:text-[10px]"
              />
            </div>
            {(fimbaMode || showArtistFilter) && (
              <div className="w-[7.25rem] border-l border-slate-200">
                <MultiSelectDropdown
                  compact
                  summaryMode="names"
                  summaryMaxNames={1}
                  label="Artista"
                  placeholder="Artista…"
                  options={artistFilterOptions}
                  value={filterArtistaIds}
                  onChange={setFilterArtistaIds}
                  className="w-full [&_button]:w-full [&_button]:h-[26px] [&_button]:border-0 [&_button]:rounded-none [&_button]:bg-transparent [&_button]:shadow-none [&_button]:hover:border-transparent [&_button]:px-2 [&_button]:text-[10px]"
                />
              </div>
            )}
          </div>
          {hasActiveExtraFilters && (
            <button
              type="button"
              onClick={clearMealFilters}
              className="text-[10px] font-bold text-slate-500 hover:text-indigo-600 underline-offset-2 hover:underline shrink-0"
            >
              Limpiar filtros
            </button>
          )}
          <button
            type="button"
            onClick={() => setMealTypesEditorOpen(true)}
            className="text-[10px] font-bold px-2.5 py-1 rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 flex items-center gap-1 shrink-0"
            title="Crear o renombrar tipos de comida (Merienda a bordo, Almuerzo (Vianda)…)"
          >
            <IconEdit size={12} /> Tipos de comida
          </button>
          <button
            type="button"
            onClick={handleResetAllMealNames}
            disabled={resettingNames || loading}
            className="text-[10px] font-bold px-2.5 py-1 rounded border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 disabled:opacity-50 flex items-center gap-1 shrink-0"
            title="Renombrar: servicio + convocados (sin «Nadie») + siglas de artistas FIMBA; conserva aclaraciones de producción"
          >
            {resettingNames && (
              <IconLoader className="animate-spin" size={12} />
            )}
            Renombrar
          </button>
          <FoodMatrix roster={roster} />
          {loading && <IconLoader className="animate-spin text-orange-500" />}
        </div>
        <div className="md:hidden flex items-center gap-2 relative flex-wrap justify-end">
          <button
            type="button"
            onClick={() => setMealTypesEditorOpen(true)}
            className="text-[10px] font-bold px-2 py-1 rounded border border-slate-300 bg-white text-slate-700"
          >
            Tipos
          </button>
          <button
            type="button"
            onClick={handleResetAllMealNames}
            disabled={resettingNames || loading}
            className="text-[10px] font-bold px-2 py-1 rounded border border-amber-300 bg-amber-50 text-amber-800 disabled:opacity-50 flex items-center gap-1"
            title="Renombrar comidas (convocados + siglas artistas)"
          >
            {resettingNames && (
              <IconLoader className="animate-spin" size={12} />
            )}
            Renombrar
          </button>
          <button
            type="button"
            onClick={() => {
              setMobileGroupsOpen((v) => !v);
              setMobileFiltersOpen(false);
            }}
            className="text-[11px] font-bold px-2 py-1 rounded border border-slate-300 bg-white text-slate-600 flex items-center gap-1"
          >
            Grupos <IconChevronDown size={12} />
          </button>
          <button
            type="button"
            onClick={() => {
              setMobileFiltersOpen((v) => !v);
              setMobileGroupsOpen(false);
            }}
            className="text-[11px] font-bold px-2 py-1 rounded border border-slate-300 bg-white text-slate-600 flex items-center gap-1"
          >
            Filtros <IconChevronDown size={12} />
          </button>
          {loading && <IconLoader className="animate-spin text-orange-500" size={14} />}

          {mobileGroupsOpen && (
            <div className="absolute right-0 top-[calc(100%+6px)] z-40 bg-white border border-slate-200 rounded-lg shadow-xl p-2 w-44 space-y-1">
              {groupDefsEffective.map((g) => (
                <div key={`mg-${g.id}`} className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-600">{g.label}</span>
                  <span className={`px-1.5 py-0.5 rounded font-bold ${g.color}`}>
                    {roster.filter(g.filter).length}
                  </span>
                </div>
              ))}
            </div>
          )}

          {mobileFiltersOpen && (
            <div className="absolute right-0 top-[calc(100%+6px)] z-40 bg-white border border-slate-200 rounded-lg shadow-xl p-2 w-56 space-y-2">
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Tipo</div>
                <div className="flex items-center gap-1 flex-wrap">
                  {[
                    { id: "all", label: "Todos" },
                    { id: "comidas", label: "Comidas" },
                    { id: "catering", label: "Catering" },
                  ].map((opt) => (
                    <button
                      key={`mk-${opt.id}`}
                      type="button"
                      onClick={() => setMealKindFilter(opt.id)}
                      className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${
                        mealKindFilter === opt.id
                          ? "bg-indigo-600 text-white border-indigo-600"
                          : "bg-slate-50 text-slate-500 border-slate-300"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Servicios</div>
                <div className="flex items-center gap-1 flex-wrap">
                  {[...SERVICIOS, CATERING_SERVICE].map((svc) => {
                    const isActive = serviceFilter.has(svc);
                    const short =
                      svc === "Desayuno"
                        ? "D"
                        : svc === "Almuerzo"
                        ? "A"
                        : svc === "Merienda"
                        ? "M"
                        : svc === "Cena"
                        ? "C"
                        : "Cat";
                    return (
                      <button
                        key={`mf-${svc}`}
                        type="button"
                        onClick={() => toggleServiceFilter(svc)}
                        className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${
                          isActive
                            ? svc === CATERING_SERVICE
                              ? "bg-orange-600 text-white border-orange-600"
                              : "bg-indigo-600 text-white border-indigo-600"
                            : "bg-slate-50 text-slate-500 border-slate-300"
                        }`}
                      >
                        {short}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-1">
                <MultiSelectDropdown
                  compact
                  summaryMode="names"
                  summaryMaxNames={1}
                  label="Locación"
                  placeholder="Locación…"
                  options={locationFilterOptions}
                  value={filterLocacionIds}
                  onChange={setFilterLocacionIds}
                />
                {showArtistFilter && (
                  <MealOrchestraOnlyFilterChip
                    value={filterArtistaIds}
                    onChange={setFilterArtistaIds}
                    compact
                  />
                )}
                {showArtistFilter && (
                  <MultiSelectDropdown
                    compact
                    summaryMode="names"
                    summaryMaxNames={1}
                    label="Artista"
                    placeholder="Artista…"
                    options={artistFilterOptions}
                    value={filterArtistaIds}
                    onChange={setFilterArtistaIds}
                  />
                )}
              </div>
              {hasActiveExtraFilters && (
                <button
                  type="button"
                  onClick={clearMealFilters}
                  className="text-[10px] font-bold text-indigo-600 w-full text-left"
                >
                  Limpiar filtros
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {cortesCount > 0 && segmentRows.length > 1 && (
        <div className="bg-white border-b border-slate-200 px-3 py-1 flex gap-1 overflow-x-auto shrink-0">
          {segmentRows.map((seg, idx) => {
            const spec = segmentSpecs[idx];
            const label =
              spec?.fecha_desde && spec?.fecha_hasta
                ? formatTramoTitle(idx, spec.fecha_desde, spec.fecha_hasta)
                : `Tramo ${idx + 1}`;
            const segment = segments[idx] ?? null;
            const rowCount = filteredGrid.filter((row) =>
              mealBelongsToSegment(
                {
                  fecha: row.fecha,
                  servicio: row.servicio,
                  hora_inicio: row.hora_inicio,
                },
                segment,
                idx,
                segments,
              ),
            ).length;
            return (
              <button
                key={seg.id}
                type="button"
                onClick={() => setActiveSegmentIdx(idx)}
                className={`px-2 py-0.5 rounded-md text-[10px] font-bold whitespace-nowrap border ${
                  activeSegmentIdx === idx
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                }`}
              >
                {label}
                <span
                  className={`ml-1 opacity-80 ${
                    activeSegmentIdx === idx ? "text-white" : "text-slate-400"
                  }`}
                >
                  ({rowCount})
                </span>
              </button>
            );
          })}
        </div>
      )}

      {selectedRows.size > 0 && <BulkEditPanel selectedCount={selectedRows.size} onCancel={() => setSelectedRows(new Set())} onApply={handleBulkApply} catalogs={catalogs} />}

      {(turnoOverInclusions.personCount > 0 ||
        turnoOverInclusions.artistCount > 0) && (
        <div className="mx-2 md:mx-4 mt-2 mb-0 shrink-0 flex items-center justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-950">
          <div className="flex items-center gap-2 min-w-0">
            <IconAlertTriangle size={16} className="text-amber-600 shrink-0" />
            <span className="font-medium">
              {turnoOverInclusions.personCount > 0 && (
                <>
                  {turnoOverInclusions.personCount} integrante
                  {turnoOverInclusions.personCount === 1 ? "" : "s"} OFRN
                </>
              )}
              {turnoOverInclusions.personCount > 0 &&
                turnoOverInclusions.artistCount > 0 &&
                " · "}
              {turnoOverInclusions.artistCount > 0 && (
                <>
                  {turnoOverInclusions.artistCount} artista
                  {turnoOverInclusions.artistCount === 1 ? "" : "s"} FIMBA
                </>
              )}{" "}
              en más de una comida del mismo turno (fecha + servicio).
            </span>
          </div>
          <button
            type="button"
            onClick={() => setOverInclusionOpen(true)}
            className="shrink-0 text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded border border-amber-400 bg-white text-amber-900 hover:bg-amber-100"
          >
            Ver detalle
          </button>
        </div>
      )}

      {fimbaMode && coverageGaps.length > 0 && (
        <div className="mx-2 md:mx-4 mt-2 mb-0 shrink-0">
          <FimbaMealCoveragePanel
            compact
            gaps={coverageGaps}
            readOnly={readOnly}
            onFilterArtista={(id) => setFilterArtistaIds([String(id)])}
            onCreateGap={handleCreateCoverageGap}
            onCreateAllGaps={handleCreateAllCoverageGaps}
          />
        </div>
      )}

      {/* Barra de herramientas flotante para descripción (rich text) */}
      {toolbarPos.visible && (
        <div
          className="fixed z-40 bg-white border border-slate-200 rounded-lg shadow-md px-1.5 py-1 flex items-center gap-1 text-xs"
          style={{ top: toolbarPos.top, left: toolbarPos.left }}
        >
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              execDescCmd("bold");
            }}
            className="p-1.5 rounded hover:bg-slate-100 text-slate-700"
            title="Negrita"
          >
            <IconBold size={14} />
          </button>
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              execDescCmd("italic");
            }}
            className="p-1.5 rounded hover:bg-slate-100 text-slate-700"
            title="Itálica"
          >
            <IconItalic size={14} />
          </button>
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              execDescCmd("underline");
            }}
            className="p-1.5 rounded hover:bg-slate-100 text-slate-700"
            title="Subrayado"
          >
            <IconUnderline size={14} />
          </button>
        </div>
      )}

      <div className="flex-1 min-h-0 p-2 md:p-4 overflow-hidden">
        {/* overflow visible on card: sticky thead fails under overflow-hidden ancestors */}
        <div className="bg-white border border-slate-300 rounded-lg shadow-sm flex flex-col relative h-full min-h-0">
          <div className="hidden md:block flex-1 min-h-0 overflow-auto">
          <table className="w-full text-left text-sm min-w-[1320px] border-separate border-spacing-0">
            {/* sticky on th (not thead): Chrome ignores sticky on thead/tr */}
            <thead className="bg-slate-100 text-slate-500 uppercase font-bold text-[10px]">
              <tr>
                <th className="w-1 border-b border-slate-200 bg-slate-100 sticky top-0 z-20 shadow-[0_1px_0_0_#e2e8f0]"></th>
                <th className="px-2 py-3 w-10 text-center border-b border-slate-200 bg-slate-100 sticky top-0 z-20 shadow-[0_1px_0_0_#e2e8f0]">
                  <div onClick={() => isMasterChecked ? setSelectedRows(new Set()) : isOnlyRealSelected ? setSelectedRows(new Set(grid.map((r) => r.id))) : setSelectedRows(new Set(realEventIds))} className={`w-4 h-4 mx-auto rounded border flex items-center justify-center cursor-pointer transition-colors ${isMasterChecked || isOnlyRealSelected ? "bg-indigo-600 border-indigo-600 text-white" : "bg-white border-slate-300"}`}>
                    {isMasterChecked ? <IconCheck size={10} strokeWidth={4} /> : isOnlyRealSelected ? <div className="w-2 h-0.5 bg-white"></div> : null}
                  </div>
                </th>
                <th className="px-3 py-3 w-28 border-r border-b border-slate-200 bg-slate-100 sticky top-0 z-20 shadow-[0_1px_0_0_#e2e8f0]">Día</th>
                <th className="px-3 py-3 w-40 border-b border-slate-200 bg-slate-100 sticky top-0 z-20 shadow-[0_1px_0_0_#e2e8f0]">Servicio</th>
                <th className="px-2 py-3 w-16 border-b border-slate-200 bg-slate-100 sticky top-0 z-20 shadow-[0_1px_0_0_#e2e8f0]" title="Hora inicio">H. Inic.</th>
                <th className="px-2 py-3 w-16 border-b border-slate-200 bg-slate-100 sticky top-0 z-20 shadow-[0_1px_0_0_#e2e8f0]" title="Hora fin (opcional; vacío por defecto)">H. Fin</th>
                <th className={`px-2 py-3 border-b border-slate-200 bg-slate-100 sticky top-0 z-20 shadow-[0_1px_0_0_#e2e8f0] ${fimbaMode ? "w-28 max-w-[7.5rem]" : "w-44"}`}>Lugar</th>
                <th className="px-3 py-3 w-64 border-b border-slate-200 bg-slate-100 sticky top-0 z-20 shadow-[0_1px_0_0_#e2e8f0]">Descripción</th>
                <th className="px-1 py-3 w-28 max-w-28 border-b border-slate-200 bg-slate-100 sticky top-0 z-20 shadow-[0_1px_0_0_#e2e8f0]">
                  {fimbaMode ? (
                    <span className="block normal-case leading-tight">
                      <span className="block">Convocados</span>
                      <span className="block font-semibold text-slate-400">OFRN</span>
                    </span>
                  ) : (
                    "Convocados"
                  )}
                </th>
                {hasGiraGrupos && (
                  <th className="px-1 py-3 w-36 max-w-36 border-b border-slate-200 bg-slate-100 sticky top-0 z-20 shadow-[0_1px_0_0_#e2e8f0]">
                    {fimbaMode ? (
                      <span className="block normal-case leading-tight">
                        <span className="block">Grupos</span>
                        <span className="block font-semibold text-slate-400">OFRN</span>
                      </span>
                    ) : (
                      "Grupos"
                    )}
                  </th>
                )}
                {hasAnyFimbaTags && (
                  <th className="px-1 py-3 w-40 max-w-44 border-b border-slate-200 bg-slate-100 sticky top-0 z-20 shadow-[0_1px_0_0_#e2e8f0]">
                    {fimbaMode ? "Artistas FIMBA" : "Artistas FIMBA"}
                  </th>
                )}
                <th className="px-3 py-3 w-24 text-center border-b border-slate-200 bg-slate-100 sticky top-0 z-20 shadow-[0_1px_0_0_#e2e8f0]">Comensales</th>
                <th className="px-3 py-3 w-12 text-center border-b border-slate-200 bg-slate-100 sticky top-0 z-20 shadow-[0_1px_0_0_#e2e8f0]">Téc</th>
                <th className="px-3 py-3 w-10 sticky top-0 right-0 z-30 bg-slate-100 border-b border-slate-200 shadow-[0_1px_0_0_#e2e8f0]"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleGrid.length === 0 && (
                <tr>
                  <td
                    colSpan={mealTableColCount}
                    className="px-4 py-8 text-center text-sm text-slate-400 italic"
                  >
                    No hay comidas en este tramo con los filtros actuales.
                  </td>
                </tr>
              )}
              {gridRenderItems.map((item) => {
                if (item.type === "day-divider") {
                  return (
                    <tr key={item.key} className="fimba-day-divider-row">
                      <td colSpan={mealTableColCount}>
                        <div className="fimba-day-divider-inner">
                          <span className="fimba-day-divider-label">
                            {formatFechaLargaEs(item.fecha)}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                }

                const row = item.row;
                const breakdown = getEligibleBreakdown(row);
                const eligible = breakdown.people;
                const deductedCount = breakdown.deductedCount || 0;
                const artistPax = fimbaArtistMealPax(row.propuestas || []);
                const comensalesLabel = formatComensalesBadgeLabel(
                  eligible.length,
                  artistPax,
                );
                const comensalesHasPeople = eligible.length > 0 || artistPax > 0;
                const hasTurnoOver = rowHasTurnoOverInclusion(row);
                const isSelected = selectedRows.has(row.id);
                const isSaving = savingRows.has(row.id);
                const isDeleting = deletingRows.has(row.id);
                const isJustSaved = justSavedRows.has(row.id);
                const isDirty = row.dirty;
                const isTemp = row.isTemp;

        // --- LÓGICA DE COLORES POR ESTADO ---
        const statusIndicatorClass = isDeleting
          ? "bg-slate-400 animate-pulse"
          : isSaving
          ? "bg-amber-400 animate-pulse"
          : isJustSaved
            ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]"
            : isDirty
              ? "bg-amber-300"
              : isTemp
                ? "bg-slate-300"
                : "bg-emerald-400 opacity-90";

        const rowBgClass = isSelected
          ? "bg-indigo-50"
          : isDeleting
            ? "bg-slate-200/90"
          : isSaving
            ? "bg-amber-50"
            : isJustSaved
              ? "bg-emerald-100"
              : isDirty
                ? "bg-amber-50/60"
                : isTemp
                  ? "bg-slate-50/80 grayscale opacity-60 italic"
                  : "hover:bg-indigo-50/30";

                const fimbaTintStyle =
                  fimbaMode &&
                  !isSelected &&
                  !isDeleting &&
                  !isSaving &&
                  !isJustSaved &&
                  !isDirty &&
                  !isTemp
                    ? fimbaMealRowTintStyle(row.servicio)
                    : undefined;

                return (
                  <tr
                    key={row.id}
                    className={`${rowBgClass} group transition-all duration-700 ease-in-out`}
                    style={fimbaTintStyle}
                  >
                    <td className={`w-1 p-0 transition-all duration-300 ${statusIndicatorClass}`} title={isDirty ? "Pendiente de guardado" : "Sincronizado"}></td>
                    <td className="px-2 py-1 text-center">
                      <input type="checkbox" checked={isSelected} onChange={() => { const n = new Set(selectedRows); n.has(row.id) ? n.delete(row.id) : n.add(row.id); setSelectedRows(n); }} className="rounded text-indigo-600 focus:ring-0" />
                    </td>
                    <td className="px-3 py-3 font-bold border-r border-slate-200 text-slate-700">
                      <span>{format(parseISO(row.fecha), "EEE dd/MM", { locale: es })}</span>
                    </td>
                    <td className="px-2 py-1">
                      <div className="flex flex-col gap-1 min-w-[10rem]">
                        <div className="flex items-center gap-1">
                          <select
                            value={row.id_tipo_evento ?? ""}
                            disabled={isSaving}
                            onChange={(e) =>
                              handleGridChange(
                                row.id,
                                "id_tipo_evento",
                                e.target.value,
                              )
                            }
                            className={`w-full text-[10px] font-bold border rounded px-1 py-1 outline-none ${
                              getMealServiceStyle(row.servicio).tag
                            } ${isDirty ? "ring-1 ring-amber-300" : ""}`}
                            title="Tipo de evento real (agrupa por primera palabra en D/A/M/C)"
                          >
                            {(mealTypes.length
                              ? mealTypes.filter((t) => {
                                  const rowIsCatering =
                                    row.servicio === CATERING_SERVICE ||
                                    isCateringEvent(row);
                                  if (rowIsCatering) {
                                    return (
                                      t.is_catering ||
                                      t.servicio === CATERING_SERVICE ||
                                      Number(t.id) === Number(row.id_tipo_evento)
                                    );
                                  }
                                  return (
                                    (!t.is_catering &&
                                      (!t.servicio ||
                                        t.servicio === row.servicio)) ||
                                    Number(t.id) === Number(row.id_tipo_evento)
                                  );
                                })
                              : []
                            ).map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.nombre}
                              </option>
                            ))}
                            {!mealTypes.some(
                              (t) =>
                                Number(t.id) === Number(row.id_tipo_evento),
                            ) &&
                              row.id_tipo_evento && (
                                <option value={row.id_tipo_evento}>
                                  {row.tipo_nombre || row.servicio}
                                </option>
                              )}
                          </select>
                          {!row.isTemp && (
                            <button
                              type="button"
                              onClick={() => addSiblingMeal(row)}
                              className="p-0.5 rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all shrink-0"
                              title={`Agregar otro ${row.servicio.toLowerCase()} este día`}
                            >
                              <IconPlus size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-1">
                      <TimeInput value={row.hora_inicio || ""} onChange={(v) => handleGridChange(row.id, "hora_inicio", v)} disabled={isSaving} isDirty={isDirty} />
                    </td>
                    <td className="px-1">
                      <TimeInput
                        value={row.hora_fin || ""}
                        onChange={(v) => handleGridChange(row.id, "hora_fin", v)}
                        disabled={isSaving}
                        isDirty={isDirty}
                        allowEmpty
                      />
                    </td>
                    <td className={`px-1 ${fimbaMode ? "w-28 max-w-[7.5rem]" : ""} relative`}>
                      <GridLocationSelect
                        value={row.id_locacion || ""}
                        onChange={(v) => handleGridChange(row.id, "id_locacion", v)}
                        options={catalogs.locaciones}
                        disabled={isSaving}
                        isDirty={isDirty}
                        compact={fimbaMode}
                      />
                    </td>
                    <td className="px-1">
                      <div
                        ref={editingDescId === row.id ? editorRef : null}
                        contentEditable={!isSaving}
                        suppressContentEditableWarning
                        onFocus={(e) => handleDescFocus(e, row)}
                        onBlur={() => handleDescBlur(row)}
                        onKeyDown={(e) => handleDescKeyDown(e, row)}
                        onPaste={handleDescPaste}
                        dangerouslySetInnerHTML={{ __html: row.descripcion || "" }}
                        className={`w-full text-xs border rounded p-1 outline-none transition-all min-h-[28px] ${
                          isDirty
                            ? "border-amber-300 bg-amber-50/50"
                            : "border-slate-300 bg-white"
                        }`}
                        placeholder="Descripción..."
                      />
                    </td>
                    <td className="px-1 w-28 max-w-28">
                      <MultiGroupSelect value={row.convocados} onChange={(v) => handleGridChange(row.id, "convocados", v)} catalogs={catalogs} disabled={isSaving} isDirty={isDirty} showAlert={mealRowNeedsConvocadosAlert(row)} compact />
                    </td>
                    {hasGiraGrupos && (
                      <td className="px-1 w-36 max-w-36">
                        <MultiSelectDropdown
                          compact
                          summaryMode="names"
                          summaryMaxNames={2}
                          label="Grupos"
                          placeholder="Todos…"
                          options={giraGrupoOptions}
                          value={(row.selectedGrupos || []).map(Number)}
                          onChange={(arr) =>
                            handleGridChange(row.id, "selectedGrupos", arr.map(Number))
                          }
                          className={`w-full ${isDirty ? "[&_button]:border-amber-300" : ""}`}
                        />
                      </td>
                    )}
                    {hasAnyFimbaTags && (
                      <td
                        className="px-1 w-40 max-w-44"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {row.isTemp ? (
                          <span className="text-[10px] text-slate-400 italic">
                            Guardá para etiquetar
                          </span>
                        ) : fimbaMode ? (
                          <FimbaEventArtistasTagsCell
                            ev={row}
                            canEdit={!readOnly}
                            propuestas={propuestas}
                            giraGrupos={giraGrupos}
                            edicion={edicion}
                            mealsOnly
                            onSaved={async (eventoId, tags) => {
                              const idGrupos = (tags?.id_grupos || [])
                                .map(Number)
                                .filter(Number.isFinite);
                              const propIdSet = new Set(
                                (tags?.id_propuestas || []).map(Number),
                              );
                              const fromCatalog = (propuestas || []).filter(
                                (p) => propIdSet.has(Number(p.id)),
                              );
                              let nextPropuestas = [];
                              setGrid((prev) => {
                                const oldIdx = prev.findIndex(
                                  (r) => String(r.id) === String(eventoId),
                                );
                                if (oldIdx < 0) return prev;
                                const prevRow = prev[oldIdx];
                                const keptLocal = (prevRow.propuestas || []).filter(
                                  (p) => propIdSet.has(Number(p.id)),
                                );
                                const byId = new Map();
                                for (const p of [...keptLocal, ...fromCatalog]) {
                                  if (p?.id != null) byId.set(Number(p.id), p);
                                }
                                nextPropuestas = Array.from(byId.values());
                                const label =
                                  prevRow.tipo_nombre ||
                                  serviceLabelOf(
                                    prevRow.servicio,
                                    prevRow.servicio_detalle,
                                  ) ||
                                  prevRow.servicio;
                                const descripcion =
                                  mergeMealDescriptionWithConvocados(
                                    prevRow.descripcion,
                                    label,
                                    prevRow.convocados,
                                    catalogs,
                                    prevRow.convocados,
                                    nextPropuestas,
                                  );
                                const patched = {
                                  ...prevRow,
                                  selectedGrupos: idGrupos,
                                  eventos_grupos: buildEventosGruposEmbed(
                                    idGrupos,
                                    giraGrupos,
                                  ),
                                  propuestas: nextPropuestas,
                                  descripcion,
                                  audiencia_ofrn:
                                    tags?.audiencia_ofrn ?? prevRow.audiencia_ofrn,
                                  dirty: false,
                                };
                                const next = prev.map((r, i) =>
                                  i === oldIdx ? patched : r,
                                );
                                return rematerializeTurnoSiblings(
                                  next,
                                  oldIdx,
                                  prevRow,
                                  patched,
                                );
                              });
                              // Persistir título con siglas (tags ya guardados por el picker).
                              if (eventoId != null && nextPropuestas) {
                                const live = grid.find(
                                  (r) => String(r.id) === String(eventoId),
                                );
                                // Prefer description just computed via setState — refetch from nextPropuestas
                                const label =
                                  live?.tipo_nombre ||
                                  serviceLabelOf(
                                    live?.servicio,
                                    live?.servicio_detalle,
                                  ) ||
                                  live?.servicio;
                                const descripcion =
                                  mergeMealDescriptionWithConvocados(
                                    live?.descripcion || "",
                                    label,
                                    live?.convocados || [],
                                    catalogs,
                                    live?.convocados || [],
                                    nextPropuestas,
                                  );
                                supabase
                                  .from("eventos")
                                  .update({ descripcion })
                                  .eq("id", eventoId)
                                  .then(({ error }) => {
                                    if (error) {
                                      console.error(error);
                                      toast.error(
                                        "Artistas guardados; no se pudo actualizar el nombre",
                                      );
                                    }
                                  });
                              }
                              onFimbaTagsSaved?.(eventoId);
                            }}
                          />
                        ) : filterFimbaPropuestasForMeals(row.propuestas || [])
                            .length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {filterFimbaPropuestasForMeals(
                              row.propuestas || [],
                            ).map((p) => (
                              <span
                                key={p.id}
                                className="text-[10px] font-bold px-1.5 py-0.5 rounded border truncate max-w-[9rem]"
                                style={{
                                  background: `${p.color || "#a21caf"}22`,
                                  borderColor: `${p.color || "#a21caf"}55`,
                                  color: "#701a75",
                                }}
                                title={`${p.nombre} · ${Math.max(0, Number(p.cantidad_planificada) || 0)} pax`}
                              >
                                {p.nombre}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-300">—</span>
                        )}
                      </td>
                    )}
                    <td className="px-3 text-center">
                      <div className="inline-flex items-center gap-1">
                        {hasTurnoOver && (
                          <button
                            type="button"
                            onClick={() => setOverInclusionOpen(true)}
                            className="p-0.5 rounded text-amber-600 hover:bg-amber-50"
                            title="Integrante o artista en más de una comida del mismo turno"
                          >
                            <IconAlertTriangle size={14} />
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={!comensalesHasPeople}
                          onClick={() =>
                            comensalesHasPeople && setComensalesDetailRow(row)
                          }
                          className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-black transition-all ${
                            comensalesHasPeople
                              ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                              : "bg-slate-100 text-slate-400 cursor-default"
                          }`}
                          title={
                            comensalesHasPeople
                              ? deductedCount > 0
                                ? `Ver comensales (−${deductedCount} en grupo coincidente)`
                                : "Ver comensales"
                              : "Sin comensales"
                          }
                        >
                          <IconUsers size={12} /> {comensalesLabel}
                          {deductedCount > 0 && (
                            <span className="text-[9px] font-bold text-amber-700">
                              −{deductedCount}
                            </span>
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="px-3 text-center">
                      <button onClick={() => handleGridChange(row.id, "tecnica", !row.tecnica)} className={`transition-colors p-1 rounded-full hover:bg-slate-100 ${row.tecnica ? "text-indigo-600 bg-indigo-50" : "text-slate-300"}`}>{row.tecnica ? <IconEyeOff size={18} /> : <IconEye size={18} />}</button>
                    </td>
                    <td className={`px-2 text-center sticky right-0 shadow-[-4px_0_10_px_-4px_rgba(0,0,0,0.1)] ${isDeleting ? "bg-slate-200/90" : "bg-white group-hover:bg-slate-50"}`}>{isDeleting || isSaving ? <IconLoader className={`animate-spin mx-auto ${isDeleting ? "text-slate-500" : "text-indigo-500"}`} size={14} /> : (
                      <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        <button
                          type="button"
                          onClick={() => addSiblingMeal(row)}
                          className="text-slate-300 hover:text-indigo-600"
                          title={`Agregar otro ${row.servicio.toLowerCase()} este día`}
                        >
                          <IconPlus size={14} />
                        </button>
                        {( !isTemp || grid.filter((r) => r.fecha === row.fecha && r.servicio === row.servicio).length > 1) && (
                          <button onClick={() => deleteRow(row)} className="text-slate-200 hover:text-red-500"><IconTrash size={14} /></button>
                        )}
                      </div>
                    )}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>

          <div className="md:hidden h-full overflow-y-auto bg-slate-50 p-1.5 space-y-1.5">
            {visibleGrid.length === 0 && (
              <div className="p-6 text-center text-sm text-slate-400 italic">
                No hay comidas en este tramo con los filtros actuales.
              </div>
            )}
            {gridRenderItems.map((item) => {
              if (item.type === "day-divider") {
                return (
                  <div
                    key={item.key}
                    className="fimba-day-divider-inner rounded border border-amber-300/40 bg-amber-50/80 py-1.5 my-1"
                  >
                    <span className="fimba-day-divider-label block text-center">
                      {formatFechaLargaEs(item.fecha)}
                    </span>
                  </div>
                );
              }

              const row = item.row;
              const breakdown = getEligibleBreakdown(row);
              const eligible = breakdown.people;
              const deductedCount = breakdown.deductedCount || 0;
              const artistPax = fimbaArtistMealPax(row.propuestas || []);
              const comensalesLabel = formatComensalesBadgeLabel(
                eligible.length,
                artistPax,
              );
              const comensalesHasPeople = eligible.length > 0 || artistPax > 0;
              const hasTurnoOver = rowHasTurnoOverInclusion(row);
              const isDirty = row.dirty;
              const tone = getMealServiceStyle(row.servicio);
              const artistNames = filterFimbaPropuestasForMeals(
                row.propuestas || [],
              )
                .map((p) => p.nombre)
                .filter(Boolean)
                .join(", ");
              const fimbaTintStyle =
                fimbaMode && !isDirty
                  ? fimbaMealRowTintStyle(row.servicio)
                  : undefined;

              return (
                <div
                  key={`mobile-${row.id}`}
                  style={fimbaTintStyle}
                  className={`border rounded-md px-2 py-1.5 text-[11px] leading-tight ${
                    isDirty ? "border-amber-300 bg-amber-50/50" : tone.card
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-semibold text-slate-700 truncate flex items-center gap-2">
                      <span>{format(parseISO(row.fecha), "EEE dd/MM", { locale: es })}</span>
                      <span className="text-slate-400 font-normal">
                        {row.hora_inicio || "-"}
                        {row.hora_fin ? `–${row.hora_fin}` : ""}
                      </span>
                      {hasTurnoOver && (
                        <IconAlertTriangle
                          size={12}
                          className="text-amber-600 shrink-0"
                          title="Mismo turno en varias comidas"
                        />
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded border font-bold max-w-[9rem] truncate ${tone.tag}`}
                        title={row.tipo_nombre || row.servicio}
                      >
                        {row.tipo_nombre || row.servicio}
                      </span>
                      <button
                        type="button"
                        onClick={() => addSiblingMeal(row)}
                        className="p-1 rounded border border-slate-200 text-indigo-600 bg-white"
                        title={`Agregar otro ${row.servicio.toLowerCase()}`}
                      >
                        <IconPlus size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setMobileEditingRow(row)}
                        className="p-1 rounded border border-slate-200 text-slate-600 bg-white"
                        title="Editar"
                      >
                        <IconEdit size={12} />
                      </button>
                    </div>
                  </div>

                  <div className="mt-1 text-slate-700 truncate">
                    <span className="text-slate-400">Lugar:</span>{" "}
                    {catalogs.locaciones.find((l) => String(l.id) === String(row.id_locacion))
                      ?.label || "-"}
                  </div>

                  <div className="mt-1 text-slate-700 line-clamp-2">
                    <span className="text-slate-400">Descripción:</span>{" "}
                    <span
                      dangerouslySetInnerHTML={{ __html: row.descripcion || "-" }}
                    />
                  </div>

                  <div className="mt-1 flex items-center gap-2">
                    <div className="flex-1 truncate text-slate-700">
                      <span className="text-slate-400">Convocados:</span>{" "}
                      {(row.convocados || []).length > 0
                        ? row.convocados
                            .map((id) => getGroupLabelShort(id, catalogs))
                            .join(", ")
                        : "-"}
                      {artistNames ? (
                        <span className="text-fuchsia-700">
                          {" "}
                          · FIMBA: {artistNames}
                        </span>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        comensalesHasPeople && setComensalesDetailRow(row)
                      }
                      disabled={!comensalesHasPeople}
                      className="shrink-0 text-[10px] px-2 py-1 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 font-bold disabled:opacity-50"
                      title={
                        deductedCount > 0
                          ? `−${deductedCount} en grupo coincidente`
                          : undefined
                      }
                    >
                      <IconUsers size={11} className="inline mr-1" />
                      {comensalesLabel}
                      {deductedCount > 0 ? ` −${deductedCount}` : ""}
                    </button>
                  </div>

                </div>
              );
            })}
          </div>
        </div>
      </div>

      {overInclusionOpen && (
        <MealTurnoOverInclusionModal
          overInclusions={turnoOverInclusions}
          gridById={gridById}
          onClose={() => setOverInclusionOpen(false)}
        />
      )}

      {liveComensalesDetailRow && (
        <ComensalesDetailModal
          row={liveComensalesDetailRow}
          people={getEligibleBreakdown(liveComensalesDetailRow).people}
          deducted={getEligibleBreakdown(liveComensalesDetailRow).deducted}
          artistTags={(liveComensalesDetailRow.propuestas || []).filter(
            (p) => p && p.requiere_comidas !== false,
          )}
          artistPax={fimbaArtistMealPax(liveComensalesDetailRow.propuestas || [])}
          catalogs={catalogs}
          onClose={() => setComensalesDetailRow(null)}
        />
      )}

      {mobileEditingRow && (
        <MobileMealEditor
          row={mobileEditingRow}
          catalogs={catalogs}
          mealTypes={mealTypes}
          onCancel={() => setMobileEditingRow(null)}
          onSave={(draft) => {
            const idx = grid.findIndex((r) => r.id === mobileEditingRow.id);
            if (idx < 0) {
              setMobileEditingRow(null);
              return;
            }
            const prevRow = grid[idx];
            const normalizedDraft = {
              ...draft,
              hora_inicio: normalizeTimeHHMM(draft.hora_inicio),
              hora_fin: normalizeTimeHHMM(draft.hora_fin),
            };
            const updated = { ...prevRow, ...normalizedDraft, dirty: true };
            setGrid((prev) => {
              const next = prev.map((r) =>
                r.id === updated.id ? updated : r,
              );
              const editedIdx = next.findIndex((r) => r.id === updated.id);
              if (editedIdx < 0) return next;
              return sortMealManagerGrid(
                rematerializeTurnoSiblings(
                  next,
                  editedIdx,
                  prevRow,
                  updated,
                ),
              );
            });
            if (updated.hora_inicio && updated.fecha) {
              saveRow(updated);
            }
            setMobileEditingRow(null);
          }}
        />
      )}
      <MealTypesEditorModal
        supabase={supabase}
        open={mealTypesEditorOpen}
        onClose={() => setMealTypesEditorOpen(false)}
        onChanged={async () => {
          try {
            const types = await fetchMealEventTypes(supabase);
            setMealTypes(types);
          } catch (e) {
            console.error(e);
          }
          await refreshGridData();
        }}
      />
    </div>
  );
}

function MobileMealEditor({ row, catalogs, mealTypes = [], onCancel, onSave }) {
  const { confirm, dialog } = useConfirmDialog();
  const descEditorRef = useRef(null);
  const initialRef = useRef({
    hora_inicio: row.hora_inicio || "",
    hora_fin: row.hora_fin || "",
    id_locacion: row.id_locacion || "",
    descripcion: row.descripcion || "",
    id_tipo_evento: row.id_tipo_evento ?? "",
    tipo_nombre: row.tipo_nombre || "",
    servicio: row.servicio,
    convocados: row.convocados || [],
  });
  const [draft, setDraft] = useState({
    hora_inicio: row.hora_inicio || "",
    hora_fin: row.hora_fin || "",
    id_locacion: row.id_locacion || "",
    descripcion: row.descripcion || "",
    id_tipo_evento: row.id_tipo_evento ?? "",
    tipo_nombre: row.tipo_nombre || "",
    servicio: row.servicio,
    convocados: row.convocados || [],
  });

  const serviceLabel = draft.tipo_nombre || row.tipo_nombre || row.servicio;

  const hasUnsavedChanges = useMemo(() => {
    const initial = initialRef.current;
    return (
      String(draft.hora_inicio || "") !== String(initial.hora_inicio || "") ||
      String(draft.hora_fin || "") !== String(initial.hora_fin || "") ||
      String(draft.id_locacion || "") !== String(initial.id_locacion || "") ||
      String(draft.descripcion || "") !== String(initial.descripcion || "") ||
      String(draft.id_tipo_evento || "") !==
        String(initial.id_tipo_evento || "") ||
      JSON.stringify(draft.convocados || []) !==
        JSON.stringify(initial.convocados || [])
    );
  }, [draft]);

  const handleRequestClose = async () => {
    if (hasUnsavedChanges) {
      const shouldClose = await confirm({
        title: "Cerrar sin guardar",
        message: "Hay cambios sin guardar. ¿Deseas cerrar sin guardar?",
        confirmText: "Cerrar",
      });
      if (!shouldClose) return;
    }
    onCancel();
  };

  return (
    <div className="fixed inset-0 z-[95] bg-black/40 md:hidden flex items-end">
      {dialog}
      <div className="w-full h-[80vh] bg-white rounded-t-2xl border-t border-slate-200 flex flex-col">
        <div className="shrink-0 p-2 border-b border-slate-200 flex items-center justify-between">
          <div className="text-sm font-black text-slate-700">Editar Comida</div>
          <button
            type="button"
            onClick={handleRequestClose}
            className="p-1 text-slate-500"
          >
            <IconX size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          <div className="text-[11px] text-slate-500">
            {format(parseISO(row.fecha), "EEE dd/MM", { locale: es })} -{" "}
            {serviceLabel}
          </div>
          <div>
            <label className="text-[9px] font-bold text-slate-500 uppercase">
              Tipo de comida
            </label>
            <select
              value={draft.id_tipo_evento ?? ""}
              onChange={(e) => {
                const nextId = e.target.value ? Number(e.target.value) : null;
                const tipoNombre =
                  typeNombreById(mealTypes, nextId) || draft.tipo_nombre;
                const base = mealBaseFromTypeName(tipoNombre) || row.servicio;
                setDraft((p) => ({
                  ...p,
                  id_tipo_evento: nextId,
                  tipo_nombre: tipoNombre,
                  servicio: base,
                  descripcion: rewriteMealDescriptionServiceLabel(
                    p.descripcion,
                    p.tipo_nombre || row.servicio,
                    tipoNombre || base,
                  ),
                }));
              }}
              className="w-full mt-1 border border-slate-300 rounded px-2 py-1.5 text-xs bg-white"
            >
              {(mealTypes || [])
                .filter(
                  (t) =>
                    !t.servicio ||
                    t.servicio === row.servicio ||
                    Number(t.id) === Number(draft.id_tipo_evento),
                )
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nombre}
                  </option>
                ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[9px] font-bold text-slate-500 uppercase">
                H. Inic.
              </label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="HHMM / HH:MM"
                value={draft.hora_inicio}
                onChange={(e) =>
                  setDraft((p) => ({ ...p, hora_inicio: e.target.value }))
                }
                className="w-full mt-1 border border-slate-300 rounded px-2 py-1.5 text-xs"
              />
            </div>
            <div>
              <label className="text-[9px] font-bold text-slate-500 uppercase">
                H. Fin
              </label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="vacío = sin fin"
                value={draft.hora_fin}
                onChange={(e) =>
                  setDraft((p) => ({ ...p, hora_fin: e.target.value }))
                }
                className="w-full mt-1 border border-slate-300 rounded px-2 py-1.5 text-xs"
              />
            </div>
          </div>
          <div>
            <label className="text-[9px] font-bold text-slate-500 uppercase">
              Lugar
            </label>
            <div className="mt-1">
              <GridLocationSelect
                value={draft.id_locacion}
                onChange={(v) => setDraft((p) => ({ ...p, id_locacion: v }))}
                options={catalogs.locaciones}
              />
            </div>
          </div>
          <div>
            <label className="text-[9px] font-bold text-slate-500 uppercase">
              Descripción
            </label>
            <div
              ref={descEditorRef}
              contentEditable
              suppressContentEditableWarning
              onInput={(e) =>
                setDraft((p) => ({
                  ...p,
                  descripcion: e.currentTarget.innerHTML,
                }))
              }
              dangerouslySetInnerHTML={{ __html: draft.descripcion || "" }}
              className="mt-1 min-h-[72px] max-h-[88px] p-1.5 text-xs border border-slate-300 rounded outline-none overflow-y-auto"
            />
          </div>
          <div>
            <label className="text-[9px] font-bold text-slate-500 uppercase">
              Convocados
            </label>
            <div className="mt-1">
              <MultiGroupSelect
                value={draft.convocados}
                onChange={(v) =>
                  setDraft((p) => ({
                    ...p,
                    convocados: v,
                    descripcion: mergeMealDescriptionWithConvocados(
                      p.descripcion,
                      p.tipo_nombre || row.servicio,
                      v,
                      catalogs,
                      p.convocados,
                    ),
                  }))
                }
                catalogs={catalogs}
              />
            </div>
          </div>
        </div>
        <div className="shrink-0 p-2 border-t border-slate-200 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={handleRequestClose}
            className="px-2.5 py-1.5 text-[11px] font-bold text-slate-600"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => onSave(draft)}
            className="px-2.5 py-1.5 text-[11px] font-bold rounded bg-indigo-600 text-white"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

