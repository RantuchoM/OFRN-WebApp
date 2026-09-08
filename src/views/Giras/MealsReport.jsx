import React, { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import {
  IconLoader,
  IconPrinter,
  IconClipboard,
  IconCopy,
  IconX,
  IconCheck,
  IconDownload,
  IconFiles,
} from "../../components/ui/Icons";
import MultiSelectDropdown from "../../components/ui/MultiSelectDropdown";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { handlePrintExport } from "../../utils/PrintWrapper";
import {
  isPersonEligibleForMealSlot,
  mealServicioFromEvent,
  mealDisplayLabelFromEvent,
  MEAL_TYPE_ID_TO_SERVICE,
  getMealServiceStyle,
  isMealRelatedEvent,
  CATERING_SERVICE,
  passesMealKindFilter,
  createDefaultMealFilters,
  isDefaultMealFilters,
  DEFAULT_MEAL_SERVICE_FILTER,
  fimbaArtistMealDietBreakdown,
  mealRowGrupoIds,
  mealRowHasOfrnAudience,
  isOrchestraMealRow,
  findCoincidingGrupoMealRows,
  deductGrupoMembersFromOrchestraEligible,
  findFimbaArtistMealCoverageGaps,
} from "../../utils/mealLogistics";
import {
  buildMealsPedidoText,
  ARTISTAS_FIMBA_DIET,
} from "../../utils/mealsReportText";
import { exportMealsReportByArtista } from "../../utils/mealsReportByArtistExport";
import { resolveLocalidadResidencia } from "../../utils/integranteDomicilioViaticos";
import { useGiraSegmentos } from "../../hooks/useGiraSegmentos";
import { buildIntegranteGruposMap } from "../../services/giraGruposService";
import { labelFimbaAlimentacion } from "../../services/fimbaService";
/** Etiquetas fijas de tags GRP: (alineado con MealsManager). */
const CONV_TAG_LABELS = {
  "GRP:TUTTI": "Tutti",
  "GRP:NO_LOCALES": "Solo alojados",
  "GRP:LOCALES": "Locales",
  "GRP:PRODUCCION": "Producción",
  "GRP:SOLISTAS": "Solistas",
  "GRP:DIRECTORES": "Directores",
  "GRP:STAFF": "Staff",
};

const NO_LOCATION_KEY = "__none__";
const NO_LOCALIDAD_KEY = "__none_localidad__";
const NO_ARTIST_KEY = "__none__";
const DEFAULT_REPORT_TYPES = new Set(DEFAULT_MEAL_SERVICE_FILTER);
/** Default prop `= []` is a new ref every render → infinite fetch if used in deps. */
const EMPTY_HOSPEDAJE_EXCLUIDOS = Object.freeze([]);

function rosterFingerprint(roster) {
  if (!roster?.length) return "0";
  return roster
    .map((p) => `${p.id}:${p.estado_gira || ""}:${p.alimentacion || ""}`)
    .join("|");
}

function excluidosFingerprint(ids) {
  if (!ids?.length) return "";
  return [...ids].map(String).sort().join(",");
}

function segmentsFingerprint(segments) {
  if (!segments?.length) return "0";
  return segments
    .map(
      (s) =>
        `${s?.indice ?? ""}:${s?.fecha_desde || ""}:${s?.fecha_hasta || ""}:${[...(s?.localidadIds || [])].map(String).sort().join(".")}`,
    )
    .join("|");
}

/** Mapa id → nombre desde roster confirmado (residencias + ensambles). */
const buildTagNameMapsFromRoster = (roster = []) => {
  const localidadesById = new Map();
  const ensamblesById = new Map();

  for (const p of roster || []) {
    if (p?.estado_gira && p.estado_gira !== "confirmado") continue;

    const res = resolveLocalidadResidencia(p);
    const locId = res.id ?? p.id_localidad_residencia;
    if (locId != null && locId !== "") {
      const key = String(locId);
      if (!localidadesById.has(key) || !localidadesById.get(key)) {
        const nombre =
          res.nombre ||
          p.localidades_residencia?.localidad ||
          p._loc_residencia?.localidad ||
          p.residencia?.localidad ||
          "";
        if (nombre) localidadesById.set(key, nombre);
        else if (!localidadesById.has(key)) localidadesById.set(key, null);
      }
    }

    const addEns = (id, nombre) => {
      if (id == null || id === "") return;
      const key = String(id);
      if (nombre && (!ensamblesById.has(key) || !ensamblesById.get(key))) {
        ensamblesById.set(key, nombre);
      } else if (!ensamblesById.has(key)) {
        ensamblesById.set(key, null);
      }
    };
    for (const e of p.ensambles || []) {
      addEns(e?.id, e?.ensamble);
    }
    for (const ie of p.integrantes_ensambles || []) {
      const ens = ie?.ensambles;
      addEns(ie?.id_ensamble ?? ens?.id, ens?.ensamble);
    }
  }

  return { localidadesById, ensamblesById };
};

const collectTagIdsFromEvents = (events = []) => {
  const locIds = new Set();
  const ensIds = new Set();
  for (const evt of events || []) {
    for (const tag of evt?.convocados || []) {
      const t = String(tag);
      if (t.startsWith("LOC:")) {
        const id = t.slice(4);
        if (id) locIds.add(id);
      } else if (t.startsWith("ENS:")) {
        const id = t.slice(4);
        if (id) ensIds.add(id);
      }
    }
  }
  return { locIds, ensIds };
};

/** Completa mapas con nombres faltantes vía Supabase. */
const hydrateTagNameMaps = async (supabase, maps, locIds, ensIds) => {
  const localidadesById = new Map(maps.localidadesById);
  const ensamblesById = new Map(maps.ensamblesById);

  const missingLoc = [...locIds].filter(
    (id) => !localidadesById.get(String(id)),
  );
  if (missingLoc.length > 0) {
    const { data } = await supabase
      .from("localidades")
      .select("id, localidad")
      .in(
        "id",
        missingLoc.map((id) =>
          Number.isSafeInteger(Number(id)) ? Number(id) : id,
        ),
      );
    (data || []).forEach((row) => {
      if (row?.id != null && row.localidad) {
        localidadesById.set(String(row.id), row.localidad);
      }
    });
  }

  const missingEns = [...ensIds].filter(
    (id) => !ensamblesById.get(String(id)),
  );
  if (missingEns.length > 0) {
    const { data } = await supabase
      .from("ensambles")
      .select("id, ensamble")
      .in(
        "id",
        missingEns.map((id) =>
          Number.isSafeInteger(Number(id)) ? Number(id) : id,
        ),
      );
    (data || []).forEach((row) => {
      if (row?.id != null && row.ensamble) {
        ensamblesById.set(String(row.id), row.ensamble);
      }
    });
  }

  return { localidadesById, ensamblesById };
};

const labelForConvTag = (tag, catalogs = null) => {
  if (!tag) return "Sin convocados";
  if (CONV_TAG_LABELS[tag]) return CONV_TAG_LABELS[tag];
  const t = String(tag);
  if (t.startsWith("LOC:")) {
    const id = t.slice(4);
    const name = catalogs?.localidadesById?.get?.(String(id));
    return name || `Localidad ${id}`;
  }
  if (t.startsWith("ENS:")) {
    const id = t.slice(4);
    const name = catalogs?.ensamblesById?.get?.(String(id));
    return name || `Ensamble ${id}`;
  }
  if (t.startsWith("FAM:")) return t.slice(4);
  return t;
};

// IMPORTANTE: Ahora usamos la prop 'roster' que viene del LogisticsDashboard
export default function MealsReport({
  supabase,
  gira,
  roster: enrichedRoster,
  hospedajeExcluidosIds = EMPTY_HOSPEDAJE_EXCLUIDOS,
  /** Filtros compartidos desde LogisticsDashboard / MealsManager / FimbaComidasPage. */
  mealFilters = null,
  onMealFiltersChange = null,
  /** FIMBA Comidas: suma pax artistas tagueados + skin magenta. */
  fimbaMode = false,
  /** Grupos de convocatoria de la gira (AND con elegibilidad). */
  giraGrupos = [],
  /** Consulta FIMBA: sin crear comidas desde alertas. */
  readOnly = false,
  /** FIMBA Comidas: ir a pestaña Gestor (cobertura A/M/C vive ahí). */
  onGoToGestor = null,
}) {
  const reportRef = useRef(null);
  const fetchGenRef = useRef(0);
  const [loading, setLoading] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);
  const [reportData, setReportData] = useState([]);
  /** id_propuesta → participantes (dietas FIMBA) para recalcular al filtrar artista. */
  const [fimbaPartsByPropuesta, setFimbaPartsByPropuesta] = useState(
    () => new Map(),
  );
  const [tagCatalogs, setTagCatalogs] = useState({
    localidadesById: new Map(),
    ensamblesById: new Map(),
  });
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [showArtistExportModal, setShowArtistExportModal] = useState(false);
  const [artistExportBusy, setArtistExportBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const filtersControlled =
    mealFilters != null && typeof onMealFiltersChange === "function";
  const [localMealFilters, setLocalMealFilters] = useState(() =>
    createDefaultMealFilters(),
  );
  const activeMealFilters = filtersControlled ? mealFilters : localMealFilters;
  const patchMealFilters = (patchOrFn) => {
    const apply = (prev) => {
      const base = prev || createDefaultMealFilters();
      const patch =
        typeof patchOrFn === "function" ? patchOrFn(base) : patchOrFn;
      return { ...base, ...patch };
    };
    if (filtersControlled) onMealFiltersChange(apply(mealFilters));
    else setLocalMealFilters((prev) => apply(prev));
  };

  const selectedTypes = useMemo(
    () => new Set(activeMealFilters.serviceFilter || DEFAULT_MEAL_SERVICE_FILTER),
    [activeMealFilters.serviceFilter],
  );
  const setSelectedTypes = (updater) => {
    patchMealFilters((prev) => {
      const cur = new Set(prev.serviceFilter || DEFAULT_MEAL_SERVICE_FILTER);
      const next = typeof updater === "function" ? updater(cur) : updater;
      return { serviceFilter: [...next] };
    });
  };
  const mealKindFilter = activeMealFilters.mealKindFilter || "all";
  const setMealKindFilter = (v) => patchMealFilters({ mealKindFilter: v });
  const selectedLocationKeys = activeMealFilters.locacionIds || [];
  const setSelectedLocationKeys = (v) => patchMealFilters({ locacionIds: v });
  const selectedArtistaIds = activeMealFilters.artistaIds || [];
  const setSelectedArtistaIds = (v) => patchMealFilters({ artistaIds: v });

  const [includePending, setIncludePending] = useState(true);
  /** Vacío = todas las localidades (ciudad de la locación). */
  const [selectedLocalidadKeys, setSelectedLocalidadKeys] = useState([]);
  /** Vacío = todos los grupos de convocados presentes en el evento. */
  const [selectedConvTags, setSelectedConvTags] = useState([]);
  const { segments } = useGiraSegmentos(supabase, gira, {
    enabled: Boolean(gira?.id),
  });

  const integranteGruposMap = useMemo(
    () => buildIntegranteGruposMap(giraGrupos, enrichedRoster || []),
    [giraGrupos, enrichedRoster],
  );

  const rosterKey = useMemo(
    () => rosterFingerprint(enrichedRoster),
    [enrichedRoster],
  );
  const excluidosKey = useMemo(
    () => excluidosFingerprint(hospedajeExcluidosIds),
    [hospedajeExcluidosIds],
  );
  const segmentsKey = useMemo(
    () => segmentsFingerprint(segments),
    [segments],
  );
  const giraGruposKey = useMemo(
    () =>
      (giraGrupos || [])
        .map((g) => {
          const members = (g.giras_grupos_integrantes || [])
            .map((r) => String(r.id_integrante))
            .sort()
            .join(".");
          return `${g?.id ?? ""}:${members}`;
        })
        .join("|"),
    [giraGrupos],
  );

  useEffect(() => {
    if (!gira?.id || (!(enrichedRoster?.length > 0) && !fimbaMode)) return;

    const gen = ++fetchGenRef.current;
    let cancelled = false;

    const fetchReportData = async () => {
      setLoading(true);
      try {
        // 1. Filtrar solo confirmados del roster que ya viene enriquecido
        const activeRoster = (enrichedRoster || []).filter(
          (p) => p.estado_gira === "confirmado",
        );

        // OFRN sin roster → nada que contar. FIMBA puede tener solo artistas.
        if (activeRoster.length === 0 && !fimbaMode) {
          if (!cancelled && gen === fetchGenRef.current) {
            setReportData([]);
            setFimbaPartsByPropuesta(new Map());
            setTagCatalogs({
              localidadesById: new Map(),
              ensamblesById: new Map(),
            });
          }
          return;
        }

        // 2. Obtener Eventos de Comida (cualquier tipo de categoría Comidas)
        const { data: eventsRaw } = await supabase
          .from("eventos")
          .select(
            "*, tipos_evento(id, nombre, id_categoria), locaciones(id, nombre, id_localidad, localidades(id, localidad)), convocados, eventos_grupos ( id_grupo, giras_grupos ( id, nombre, color ) ), eventos_fimba_propuestas ( id_propuesta, fimba_propuestas ( id, nombre, cantidad_planificada, requiere_comidas ) )",
          )
          .eq("id_gira", gira.id)
          .eq("is_deleted", false)
          .order("fecha", { ascending: true })
          .order("hora_inicio", { ascending: true });

        if (cancelled || gen !== fetchGenRef.current) return;

        const events = (eventsRaw || []).filter(isMealRelatedEvent);

        if (!events || events.length === 0) {
          setReportData([]);
          setFimbaPartsByPropuesta(new Map());
          setTagCatalogs(buildTagNameMapsFromRoster(activeRoster));
          return;
        }

        // 2b. Catálogo de nombres para LOC:/ENS: (roster + lookup BD de faltantes)
        const { locIds, ensIds } = collectTagIdsFromEvents(events);
        const catalogs = await hydrateTagNameMaps(
          supabase,
          buildTagNameMapsFromRoster(activeRoster),
          locIds,
          ensIds,
        );
        if (cancelled || gen !== fetchGenRef.current) return;
        setTagCatalogs(catalogs);

        // 3. Obtener Asistencias manuales
        const eventIds = events.map((e) => e.id);
        const { data: attendance } = await supabase
          .from("eventos_asistencia")
          .select("id_evento, id_integrante, estado")
          .in("id_evento", eventIds);

        if (cancelled || gen !== fetchGenRef.current) return;

        const attendanceMap = {};
        attendance?.forEach((a) => {
          attendanceMap[`${a.id_evento}-${a.id_integrante}`] = a.estado;
        });

        // 3b. FIMBA: participantes nominados → desglose de dietas (no solo pax ART.)
        const participantesByPropuestaId = new Map();
        if (fimbaMode) {
          const propuestaIds = [
            ...new Set(
              events.flatMap((evt) =>
                (evt.eventos_fimba_propuestas || [])
                  .map((link) => link?.id_propuesta ?? link?.fimba_propuestas?.id)
                  .filter((id) => id != null && id !== ""),
              ),
            ),
          ];
          if (propuestaIds.length > 0) {
            const { data: parts, error: partsErr } = await supabase
              .from("fimba_participantes")
              .select(
                "id_propuesta, tipo_alimentacion, nota_alimentacion, activo",
              )
              .in("id_propuesta", propuestaIds);
            if (partsErr) throw partsErr;
            if (cancelled || gen !== fetchGenRef.current) return;
            for (const part of parts || []) {
              const key = String(part.id_propuesta);
              if (!participantesByPropuestaId.has(key)) {
                participantesByPropuestaId.set(key, []);
              }
              participantesByPropuestaId.get(key).push(part);
            }
          }
        }

        // 4. PROCESAMIENTO: elegibles OFRN (+ deducción orquesta↔grupo mismo turno)
        //    luego cobertura de asistencia / dietas; artistas FIMBA aditivos.
        const rawEligibleByEventId = new Map();
        for (const evt of events) {
          const eventDate = evt.fecha;
          const servicio = mealServicioFromEvent(evt);
          const people = [];
          if (mealRowHasOfrnAudience(evt)) {
            for (const person of activeRoster) {
              if (
                isPersonEligibleForMealSlot(
                  person,
                  {
                    fecha: eventDate,
                    servicio,
                    convocados: evt.convocados,
                    hora: evt.hora_inicio,
                    grupoIds: mealRowGrupoIds(evt),
                  },
                  {
                    hospedajeExcluidosIds,
                    segments,
                    integranteGruposMap,
                  },
                )
              ) {
                people.push(person);
              }
            }
          }
          rawEligibleByEventId.set(evt.id, people);
        }

        const processed = events.map((evt) => {
          const counts = { Total: 0 };
          const servicio = mealServicioFromEvent(evt);
          const servicioLabel = mealDisplayLabelFromEvent(evt);

          let ofrnPeople = rawEligibleByEventId.get(evt.id) || [];
          if (isOrchestraMealRow(evt)) {
            const coinciding = findCoincidingGrupoMealRows(evt, events);
            if (coinciding.length) {
              ofrnPeople = deductGrupoMembersFromOrchestraEligible(
                ofrnPeople,
                coinciding,
                (gRow) => rawEligibleByEventId.get(gRow.id) || [],
              ).people;
            }
          }

          for (const person of ofrnPeople) {
            const status = attendanceMap[`${evt.id}-${person.id}`];
            let shouldCount = false;

            if (status === "P") shouldCount = true;
            else if (status === "A") shouldCount = false;
            else if (includePending && !status) shouldCount = true;

            if (shouldCount) {
              const diet = person.alimentacion || "Estándar";
              counts[diet] = (counts[diet] || 0) + 1;
              counts.Total++;
            }
          }

          const locId = evt.id_locacion ?? evt.locaciones?.id ?? null;
          const locKey =
            locId != null && locId !== "" ? String(locId) : NO_LOCATION_KEY;
          const locName = evt.locaciones?.nombre || "Sin ubicación";
          const locCity = evt.locaciones?.localidades?.localidad;
          const ciudadId =
            evt.locaciones?.id_localidad ??
            evt.locaciones?.localidades?.id ??
            null;
          const ciudadKey =
            ciudadId != null && ciudadId !== ""
              ? String(ciudadId)
              : locCity
                ? `name:${locCity}`
                : NO_LOCALIDAD_KEY;
          const ciudadLabel = locCity || "Sin localidad";
          const convocados = Array.isArray(evt.convocados)
            ? evt.convocados.map(String)
            : [];
          const propuestas = (evt.eventos_fimba_propuestas || [])
            .map((link) => link.fimba_propuestas)
            .filter(Boolean);

          // Snapshot OFRN antes de sumar artistas (para refiltrar por artista).
          const ofrnCounts = { ...counts };

          // FIMBA: pax artistas aditivo; dietas desde fimba_participantes.
          // Residuo (planificada − nominados) queda en columna Art.
          if (fimbaMode) {
            const { dietCounts, residualArt, total: artistTotal } =
              fimbaArtistMealDietBreakdown(
                propuestas,
                participantesByPropuestaId,
                labelFimbaAlimentacion,
              );
            for (const [diet, n] of Object.entries(dietCounts)) {
              if (!n) continue;
              counts[diet] = (counts[diet] || 0) + n;
            }
            if (residualArt > 0) {
              counts[ARTISTAS_FIMBA_DIET] =
                (counts[ARTISTAS_FIMBA_DIET] || 0) + residualArt;
            }
            if (artistTotal > 0) counts.Total += artistTotal;
          }

          return {
            id: evt.id,
            fecha: evt.fecha,
            hora: evt.hora_inicio?.slice(0, 5),
            servicio:
              servicio ||
              MEAL_TYPE_ID_TO_SERVICE[evt.id_tipo_evento] ||
              evt.tipos_evento?.nombre,
            servicioLabel:
              servicioLabel ||
              servicio ||
              evt.tipos_evento?.nombre,
            lugar: locCity ? `${locName} - ${locCity}` : locName,
            locacionLabel: locName,
            locKey,
            id_locacion: locId,
            ciudadKey,
            ciudadLabel,
            convocados,
            propuestas,
            ofrnCounts,
            rawEvent: evt,
            counts,
          };
        });

        if (cancelled || gen !== fetchGenRef.current) return;
        setFimbaPartsByPropuesta(participantesByPropuestaId);
        setReportData(processed);
      } catch (error) {
        console.error("Error MealsReport:", error);
      } finally {
        if (!cancelled && gen === fetchGenRef.current) {
          setLoading(false);
        }
      }
    };

    fetchReportData();
    return () => {
      cancelled = true;
    };
    // Primitive/serialized keys — array identity of roster/excluidos/segments is unstable.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional stable keys
  }, [
    gira?.id,
    rosterKey,
    includePending,
    excluidosKey,
    segmentsKey,
    giraGruposKey,
    fimbaMode,
    refreshTick,
  ]);

  // --- Memorias y Totales ---
  const locationOptions = useMemo(() => {
    const map = new Map();
    reportData.forEach((row) => {
      if (!map.has(row.locKey)) {
        map.set(row.locKey, {
          value: row.locKey,
          label: row.locacionLabel || row.lugar,
        });
      }
    });
    return Array.from(map.values()).sort((a, b) =>
      a.label.localeCompare(b.label, "es"),
    );
  }, [reportData]);

  const localidadOptions = useMemo(() => {
    const map = new Map();
    reportData.forEach((row) => {
      if (!map.has(row.ciudadKey)) {
        map.set(row.ciudadKey, {
          value: row.ciudadKey,
          label: row.ciudadLabel || "Sin localidad",
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => {
      if (a.value === NO_LOCALIDAD_KEY) return 1;
      if (b.value === NO_LOCALIDAD_KEY) return -1;
      return a.label.localeCompare(b.label, "es");
    });
  }, [reportData]);

  const convTagOptions = useMemo(() => {
    const tags = new Set();
    reportData.forEach((row) => {
      if (!row.convocados?.length) {
        tags.add("__empty__");
        return;
      }
      row.convocados.forEach((t) => tags.add(t));
    });
    const preferredOrder = Object.keys(CONV_TAG_LABELS);
    return Array.from(tags)
      .map((tag) => ({
        value: tag,
        label:
          tag === "__empty__"
            ? "Sin convocados"
            : labelForConvTag(tag, tagCatalogs),
      }))
      .sort((a, b) => {
        const ia = preferredOrder.indexOf(a.value);
        const ib = preferredOrder.indexOf(b.value);
        if (a.value === "__empty__") return 1;
        if (b.value === "__empty__") return -1;
        if (ia !== -1 || ib !== -1) {
          return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
        }
        return a.label.localeCompare(b.label, "es");
      });
  }, [reportData, tagCatalogs]);

  const artistOptions = useMemo(() => {
    const map = new Map();
    let hasNone = false;
    reportData.forEach((row) => {
      const props = row.propuestas || [];
      if (!props.length) {
        hasNone = true;
        return;
      }
      props.forEach((p) => {
        if (!p?.id) return;
        const key = String(p.id);
        if (map.has(key)) return;
        map.set(key, {
          value: key,
          label: p.nombre || `Artista ${p.id}`,
        });
      });
    });
    const opts = Array.from(map.values()).sort((a, b) =>
      a.label.localeCompare(b.label, "es", { sensitivity: "base" }),
    );
    if (hasNone) {
      opts.push({ value: NO_ARTIST_KEY, label: "Sin artistas" });
    }
    return opts;
  }, [reportData]);

  // Descartar selecciones que ya no existan en los datos cargados
  useEffect(() => {
    if (selectedLocationKeys.length === 0) return;
    const valid = new Set(locationOptions.map((o) => o.value));
    const next = selectedLocationKeys.filter((k) => valid.has(k));
    if (next.length !== selectedLocationKeys.length) {
      setSelectedLocationKeys(next);
    }
  }, [locationOptions, selectedLocationKeys]);

  useEffect(() => {
    if (selectedLocalidadKeys.length === 0) return;
    const valid = new Set(localidadOptions.map((o) => o.value));
    const next = selectedLocalidadKeys.filter((k) => valid.has(k));
    if (next.length !== selectedLocalidadKeys.length) {
      setSelectedLocalidadKeys(next);
    }
  }, [localidadOptions, selectedLocalidadKeys]);

  useEffect(() => {
    if (selectedConvTags.length === 0) return;
    const valid = new Set(convTagOptions.map((o) => o.value));
    const next = selectedConvTags.filter((k) => valid.has(k));
    if (next.length !== selectedConvTags.length) {
      setSelectedConvTags(next);
    }
  }, [convTagOptions, selectedConvTags]);

  useEffect(() => {
    if (selectedArtistaIds.length === 0) return;
    const valid = new Set(artistOptions.map((o) => o.value));
    const next = selectedArtistaIds.filter((k) => valid.has(k));
    if (next.length !== selectedArtistaIds.length) {
      setSelectedArtistaIds(next);
    }
  }, [artistOptions, selectedArtistaIds]);

  const filteredReport = useMemo(() => {
    const locSet =
      selectedLocationKeys.length > 0
        ? new Set(selectedLocationKeys.map(String))
        : null;
    const ciudadSet =
      selectedLocalidadKeys.length > 0
        ? new Set(selectedLocalidadKeys.map(String))
        : null;
    const convSet =
      selectedConvTags.length > 0
        ? new Set(selectedConvTags.map(String))
        : null;
    const artistSet =
      selectedArtistaIds.length > 0
        ? new Set(selectedArtistaIds.map(String))
        : null;

    const rows = reportData.filter((r) => {
      if (!selectedTypes.has(r.servicio)) return false;
      if (!passesMealKindFilter(r.rawEvent || r, mealKindFilter)) return false;
      if (locSet && !locSet.has(String(r.locKey))) return false;
      if (ciudadSet && !ciudadSet.has(String(r.ciudadKey))) return false;
      if (convSet) {
        const tags = r.convocados?.length ? r.convocados.map(String) : ["__empty__"];
        if (!tags.some((t) => convSet.has(t))) return false;
      }
      if (artistSet) {
        const ids = (r.propuestas || [])
          .map((p) => (p?.id != null ? String(p.id) : null))
          .filter(Boolean);
        const matches =
          (ids.length === 0 && artistSet.has(NO_ARTIST_KEY)) ||
          ids.some((id) => artistSet.has(id));
        if (!matches) return false;
      }
      return true;
    });

    // Con filtro de artista: solo sumar dietas de las propuestas seleccionadas
    // (el total OFRN del servicio se mantiene; no se inventan splits).
    if (!fimbaMode || !artistSet) return rows;

    return rows.map((row) => {
      const scopedProps = (row.propuestas || []).filter(
        (p) => p?.id != null && artistSet.has(String(p.id)),
      );
      const ofrn = row.ofrnCounts || { Total: 0 };
      const counts = { ...ofrn };
      const { dietCounts, residualArt, total: artistTotal } =
        fimbaArtistMealDietBreakdown(
          scopedProps,
          fimbaPartsByPropuesta,
          labelFimbaAlimentacion,
        );
      for (const [diet, n] of Object.entries(dietCounts)) {
        if (!n) continue;
        counts[diet] = (counts[diet] || 0) + n;
      }
      if (residualArt > 0) {
        counts[ARTISTAS_FIMBA_DIET] =
          (counts[ARTISTAS_FIMBA_DIET] || 0) + residualArt;
      } else {
        delete counts[ARTISTAS_FIMBA_DIET];
      }
      counts.Total = (Number(ofrn.Total) || 0) + artistTotal;
      return { ...row, counts };
    });
  }, [
    reportData,
    selectedTypes,
    mealKindFilter,
    selectedLocationKeys,
    selectedLocalidadKeys,
    selectedConvTags,
    selectedArtistaIds,
    fimbaMode,
    fimbaPartsByPropuesta,
  ]);

  /** Tipos de alimentación presentes en el set filtrado (exports / tabla). */
  const allDiets = useMemo(() => {
    const diets = new Set();
    filteredReport.forEach((row) => {
      Object.keys(row.counts).forEach((k) => {
        if (k !== "Total") diets.add(k);
      });
    });
    return Array.from(diets).sort((a, b) => {
      const rank = (d) => {
        if (d === "Estándar" || d === "Regular") return 0;
        if (d === ARTISTAS_FIMBA_DIET) return 2;
        return 1;
      };
      const ra = rank(a);
      const rb = rank(b);
      if (ra !== rb) return ra - rb;
      return a.localeCompare(b, "es");
    });
  }, [filteredReport]);

  const filterSummaryLabel = useMemo(() => {
    const parts = [];
    if (mealKindFilter === "comidas") parts.push("Tipo: Comidas");
    if (mealKindFilter === "catering") parts.push("Tipo: Catering");
    if (selectedLocalidadKeys.length > 0) {
      const labels = selectedLocalidadKeys
        .map(
          (k) =>
            localidadOptions.find((o) => o.value === k)?.label || k,
        )
        .filter(Boolean);
      if (labels.length) parts.push(`Localidad: ${labels.join(", ")}`);
    }
    if (selectedLocationKeys.length > 0) {
      const labels = selectedLocationKeys
        .map(
          (k) =>
            locationOptions.find((o) => o.value === k)?.label || k,
        )
        .filter(Boolean);
      if (labels.length) parts.push(`Locación: ${labels.join(", ")}`);
    }
    if (selectedConvTags.length > 0) {
      const labels = selectedConvTags
        .map(
          (k) =>
            convTagOptions.find((o) => o.value === k)?.label ||
            labelForConvTag(k, tagCatalogs),
        )
        .filter(Boolean);
      if (labels.length) parts.push(`Convocados: ${labels.join(", ")}`);
    }
    if (selectedArtistaIds.length > 0) {
      const labels = selectedArtistaIds
        .map((k) => artistOptions.find((o) => o.value === k)?.label || k)
        .filter(Boolean);
      if (labels.length) parts.push(`Artista: ${labels.join(", ")}`);
    }
    return parts.length ? parts.join(" · ") : null;
  }, [
    mealKindFilter,
    selectedLocationKeys,
    selectedLocalidadKeys,
    selectedConvTags,
    selectedArtistaIds,
    locationOptions,
    localidadOptions,
    convTagOptions,
    artistOptions,
    tagCatalogs,
  ]);

  const activeRoster = useMemo(
    () => (enrichedRoster || []).filter((p) => p.estado_gira === "confirmado"),
    [enrichedRoster],
  );

  const nonLocalRoster = useMemo(
    () => activeRoster.filter((p) => !p.is_local),
    [activeRoster],
  );

  const textSummary = useMemo(
    () =>
      buildMealsPedidoText(filteredReport, {
        nonLocalRoster,
        includeStayBlocks: true,
      }),
    [filteredReport, nonLocalRoster],
  );

  /** Filas del reporte sin filtro de artista (base del batch por artista). */
  const reportRowsForArtistBatch = useMemo(() => {
    const locSet =
      selectedLocationKeys.length > 0
        ? new Set(selectedLocationKeys.map(String))
        : null;
    const ciudadSet =
      selectedLocalidadKeys.length > 0
        ? new Set(selectedLocalidadKeys.map(String))
        : null;
    const convSet =
      selectedConvTags.length > 0
        ? new Set(selectedConvTags.map(String))
        : null;

    return reportData.filter((r) => {
      if (!selectedTypes.has(r.servicio)) return false;
      if (!passesMealKindFilter(r.rawEvent || r, mealKindFilter)) return false;
      if (locSet && !locSet.has(String(r.locKey))) return false;
      if (ciudadSet && !ciudadSet.has(String(r.ciudadKey))) return false;
      if (convSet) {
        const tags = r.convocados?.length
          ? r.convocados.map(String)
          : ["__empty__"];
        if (!tags.some((t) => convSet.has(t))) return false;
      }
      return true;
    });
  }, [
    reportData,
    selectedTypes,
    mealKindFilter,
    selectedLocationKeys,
    selectedLocalidadKeys,
    selectedConvTags,
  ]);

  const coverageGaps = useMemo(() => {
    if (!fimbaMode) return [];
    return findFimbaArtistMealCoverageGaps(reportData);
  }, [fimbaMode, reportData]);

  const coverageBrokenCount = useMemo(
    () =>
      (coverageGaps || []).filter((g) => !g.ok && g.missing?.length > 0).length,
    [coverageGaps],
  );

  const handleExportByArtista = async (modes) => {
    setArtistExportBusy(true);
    try {
      const onlyIds =
        selectedArtistaIds.length > 0
          ? selectedArtistaIds.filter((id) => id !== NO_ARTIST_KEY)
          : null;
      await exportMealsReportByArtista({
        reportRows: reportRowsForArtistBatch,
        fimbaPartsByPropuesta,
        labelFn: labelFimbaAlimentacion,
        onlyArtistaIds: onlyIds,
        giraNombre: gira?.nombre_gira || gira?.nomenclador || "Gira",
        modes,
      });
      setShowArtistExportModal(false);
    } finally {
      setArtistExportBusy(false);
    }
  };

  const handleCopySummary = async () => {
    try {
      await navigator.clipboard.writeText(textSummary);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (error) {
      console.error("No se pudo copiar el resumen de comidas:", error);
    }
  };

  const calculateGroupTotals = (services) => {
    const totals = { Total: 0 };
    allDiets.forEach((d) => (totals[d] = 0));
    filteredReport
      .filter((r) => services.includes(r.servicio))
      .forEach((row) => {
        totals.Total += row.counts.Total || 0;
        allDiets.forEach((d) => {
          totals[d] += row.counts[d] || 0;
        });
      });
    return totals;
  };

  const mainMealsTotal = calculateGroupTotals(["Almuerzo", "Cena"]);
  const lightMealsTotal = calculateGroupTotals(["Desayuno", "Merienda"]);

  if (loading)
    return (
      <div className="flex justify-center py-20">
        <IconLoader
          className={`animate-spin ${fimbaMode ? "text-[#d73289]" : "text-indigo-500"}`}
          size={32}
        />
      </div>
    );

  /* Solid hex fallback: --fimba-magenta must exist on .fimba-root; if missing,
   * Tailwind bg-[var(--fimba-magenta)] alone yields white-on-white selected chips. */
  const accentActive = fimbaMode
    ? "bg-[#d73289] text-white border-[#d73289] shadow-sm"
    : "bg-indigo-600 text-white border-indigo-600 shadow-sm";
  const accentBtn = fimbaMode
    ? "bg-[#d73289] text-white hover:opacity-90"
    : "bg-indigo-600 text-white hover:bg-indigo-700";
  const filterBanner = fimbaMode
    ? "text-[#d73289] bg-fuchsia-50 border-fuchsia-100"
    : "text-indigo-700 bg-indigo-50 border-indigo-100";
  const filterClusterBorder =
    selectedLocalidadKeys.length > 0 ||
    selectedLocationKeys.length > 0 ||
    selectedConvTags.length > 0 ||
    selectedArtistaIds.length > 0
      ? fimbaMode
        ? "border-[#d73289]"
        : "border-indigo-400"
      : "border-slate-200";

  return (
    <div className="flex flex-col h-full bg-white animate-in fade-in">
      {/* Barra de Filtros */}
      <div className="p-3 sm:p-4 border-b border-slate-200 flex flex-wrap items-center gap-x-3 gap-y-2 bg-slate-50 print:hidden">
        <h2 className="text-base sm:text-lg font-bold text-slate-800 shrink-0">
          Reporte de Comidas
        </h2>

        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 shrink-0">
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
                        : accentActive
                      : "bg-slate-50 text-slate-500 border-slate-300 hover:bg-slate-100"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 gap-0.5 h-[34px] shrink-0">
            {["Desayuno", "Almuerzo", "Merienda", "Cena", CATERING_SERVICE].map(
              (type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() =>
                    setSelectedTypes((prev) => {
                      const next = new Set(prev);
                      next.has(type) ? next.delete(type) : next.add(type);
                      return next;
                    })
                  }
                  className={`px-2.5 h-full min-w-[1.75rem] text-xs font-bold rounded-md transition-colors ${
                    selectedTypes.has(type)
                      ? type === CATERING_SERVICE
                        ? "bg-orange-600 text-white"
                        : fimbaMode
                          ? "bg-[#d73289] text-white"
                          : "bg-indigo-600 text-white"
                      : "text-slate-500 hover:bg-slate-100"
                  }`}
                  title={type}
                >
                  {type === CATERING_SERVICE ? "Cat" : type.charAt(0)}
                </button>
              ),
            )}
          </div>

          <div
            className={`inline-flex items-stretch rounded-lg border overflow-visible h-[34px] shadow-sm bg-white shrink-0 ${filterClusterBorder}`}
            title="Filtros de lugar, convocados y artistas"
          >
            <div className="w-[7.5rem] sm:w-[8.75rem]">
              <MultiSelectDropdown
                compact
                summaryMode="names"
                summaryMaxNames={1}
                label="Localidad"
                placeholder="Localidad…"
                options={localidadOptions}
                value={selectedLocalidadKeys}
                onChange={setSelectedLocalidadKeys}
                className="w-full [&_button]:w-full [&_button]:h-[32px] [&_button]:border-0 [&_button]:rounded-none [&_button]:bg-transparent [&_button]:shadow-none [&_button]:hover:border-transparent [&_button]:px-2"
              />
            </div>
            <div className="w-[7.5rem] sm:w-[8.75rem] border-l border-slate-200">
              <MultiSelectDropdown
                compact
                summaryMode="names"
                summaryMaxNames={1}
                label="Locación"
                placeholder="Locación…"
                options={locationOptions}
                value={selectedLocationKeys}
                onChange={setSelectedLocationKeys}
                className="w-full [&_button]:w-full [&_button]:h-[32px] [&_button]:border-0 [&_button]:rounded-none [&_button]:bg-transparent [&_button]:shadow-none [&_button]:hover:border-transparent [&_button]:px-2"
              />
            </div>
            <div className="w-[7.5rem] sm:w-[8.75rem] border-l border-slate-200">
              <MultiSelectDropdown
                compact
                summaryMode="names"
                summaryMaxNames={1}
                label="Convocados"
                placeholder="Convocados…"
                options={convTagOptions}
                value={selectedConvTags}
                onChange={setSelectedConvTags}
                className="w-full [&_button]:w-full [&_button]:h-[32px] [&_button]:border-0 [&_button]:rounded-none [&_button]:bg-transparent [&_button]:shadow-none [&_button]:hover:border-transparent [&_button]:px-2"
              />
            </div>
            {artistOptions.length > 0 && (
              <div className="w-[7.5rem] sm:w-[8.75rem] border-l border-slate-200">
                <MultiSelectDropdown
                  compact
                  summaryMode="names"
                  summaryMaxNames={1}
                  label="Artista"
                  placeholder="Artista…"
                  options={artistOptions}
                  value={selectedArtistaIds}
                  onChange={setSelectedArtistaIds}
                  className="w-full [&_button]:w-full [&_button]:h-[32px] [&_button]:border-0 [&_button]:rounded-none [&_button]:bg-transparent [&_button]:shadow-none [&_button]:hover:border-transparent [&_button]:px-2"
                />
              </div>
            )}
          </div>

          {(!isDefaultMealFilters(activeMealFilters) ||
            selectedLocalidadKeys.length > 0 ||
            selectedConvTags.length > 0) && (
            <button
              type="button"
              onClick={() => {
                patchMealFilters(createDefaultMealFilters());
                setSelectedLocalidadKeys([]);
                setSelectedConvTags([]);
              }}
              className={`text-[11px] font-bold text-slate-500 underline-offset-2 hover:underline shrink-0 ${
                fimbaMode
                  ? "hover:text-[#d73289]"
                  : "hover:text-indigo-600"
              }`}
            >
              Limpiar
            </button>
          )}

          <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium text-slate-700 shrink-0">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={includePending}
              onChange={() => setIncludePending(!includePending)}
            />
            <div
              className={`w-9 h-5 bg-slate-200 rounded-full peer after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full relative ${
                fimbaMode
                  ? "peer-checked:bg-[#d73289]"
                  : "peer-checked:bg-indigo-600"
              }`}
            ></div>
            Pendientes
          </label>
        </div>

        <div className="flex items-center gap-2 ml-auto shrink-0">
          {fimbaMode && (
            <button
              type="button"
              onClick={() => setShowArtistExportModal(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold h-[34px] border ${
                fimbaMode
                  ? "border-[#d73289] text-[#d73289] bg-white hover:bg-fuchsia-50"
                  : "border-indigo-600 text-indigo-700 bg-white"
              }`}
              title="Excel multi-hoja y/o ZIP de textos pedido, uno por artista"
            >
              <IconFiles size={16} /> Por artista
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowSummaryModal(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold h-[34px] ${accentBtn}`}
          >
            <IconClipboard size={16} /> Texto pedido
          </button>
          <button
            type="button"
            onClick={() =>
              handlePrintExport(
                reportRef,
                `Reporte Comidas - ${gira.nombre_gira}`,
              )
            }
            className="flex items-center gap-1.5 bg-slate-800 text-white px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-slate-700 h-[34px]"
          >
            <IconPrinter size={16} /> Exportar PDF
          </button>
        </div>
      </div>

      {fimbaMode && coverageBrokenCount > 0 && (
        <div className="px-3 sm:px-4 pt-3 print:hidden">
          <div
            className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-950"
            role="status"
          >
            <span className="font-medium">
              Cobertura A/M/C incompleta · {coverageBrokenCount} artista
              {coverageBrokenCount === 1 ? "" : "s"}
            </span>
            {typeof onGoToGestor === "function" ? (
              <button
                type="button"
                onClick={onGoToGestor}
                className="shrink-0 text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded border border-[#d73289] bg-white text-[#d73289] hover:bg-fuchsia-50"
              >
                Ir a Gestor
              </button>
            ) : (
              <span className="text-amber-800/80">
                Gestionar huecos en la pestaña Gestor.
              </span>
            )}
          </div>
        </div>
      )}

      {/* Contenido Reporte = cuadro / tabla por dieta */}
      <div className="meals-report-export flex-1 overflow-auto p-8" ref={reportRef}>
        <div className="mb-6 hidden print:block">
          <h1 className="text-2xl font-bold">{gira.nombre_gira}</h1>
          <p className="text-slate-700">
            Reporte de Alimentación - Cantidades por Dieta
          </p>
          {filterSummaryLabel && (
            <p className="text-sm text-slate-600 mt-1">{filterSummaryLabel}</p>
          )}
        </div>

        {filterSummaryLabel && (
          <div
            className={`mb-4 print:hidden text-xs font-medium border rounded-lg px-3 py-2 ${filterBanner}`}
          >
            Exportando / vista filtrada · {filterSummaryLabel}
            {filteredReport.length === 0
              ? " · sin filas con estos criterios"
              : ` · ${filteredReport.length} servicio(s)`}
          </div>
        )}

        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="border-b-2 border-slate-800">
              <th className="py-2 px-1 w-0 whitespace-nowrap" title="Fecha">Fecha</th>
              <th className="py-2 px-1 w-0 whitespace-nowrap" title="Hora">Hora</th>
              <th className="py-2 px-1 whitespace-nowrap" title="Servicio">Serv</th>
              <th className="py-2 px-2 min-w-0">Lugar</th>
              <th className="py-2 px-1 w-0 text-right bg-slate-100 whitespace-nowrap" title="Total">Total</th>
              {allDiets.map((d) => (
                <th
                  key={d}
                  className={`py-2 px-1 w-0 text-right border-l text-xs uppercase font-bold whitespace-nowrap ${
                    d === ARTISTAS_FIMBA_DIET
                      ? "text-fuchsia-800"
                      : "text-slate-800"
                  }`}
                  title={
                    d === ARTISTAS_FIMBA_DIET
                      ? "Artistas FIMBA sin nominar / por confirmar"
                      : d
                  }
                >
                  {d === ARTISTAS_FIMBA_DIET
                    ? "Art."
                    : d.length <= 4
                      ? d
                      : d.slice(0, 4)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filteredReport.map((row) => (
              <tr key={row.id} className="break-inside-avoid">
                <td className="py-3 px-2 font-medium">
                  {format(parseISO(row.fecha), "EEE dd/MM", { locale: es })}
                </td>
                <td className="py-3 px-2 text-slate-800">{row.hora}</td>
                <td className="py-3 px-2 whitespace-nowrap align-middle">
                  <span
                    className={`inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded border whitespace-nowrap ${
                      getMealServiceStyle(row.servicio).reportTag
                    }`}
                    title={row.servicioLabel || row.servicio}
                  >
                    {row.servicioLabel || row.servicio}
                  </span>
                </td>
                <td className="py-3 px-2 text-slate-800">{row.lugar}</td>
                <td className="py-3 px-2 text-right font-black text-lg bg-slate-50">
                  {row.counts.Total}
                </td>
                {allDiets.map((d) => (
                  <td
                    key={d}
                    className={`py-3 px-2 text-right border-l font-mono ${
                      d === ARTISTAS_FIMBA_DIET ? "text-fuchsia-800" : ""
                    }`}
                  >
                    {row.counts[d] || "-"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t-4 border-slate-300 bg-slate-50">
            <tr>
              <td
                colSpan={4}
                className="py-3 px-4 text-right font-bold uppercase"
              >
                Total Almuerzos + Cenas
              </td>
              <td className="py-3 px-2 text-right font-black text-lg border-l">
                {mainMealsTotal.Total}
              </td>
              {allDiets.map((d) => (
                <td key={d} className="py-3 px-2 text-right border-l font-bold">
                  {mainMealsTotal[d] || 0}
                </td>
              ))}
            </tr>
            <tr>
              <td
                colSpan={4}
                className="py-3 px-4 text-right font-bold uppercase"
              >
                Total Desayunos + Meriendas
              </td>
              <td className="py-3 px-2 text-right font-black text-lg border-l">
                {lightMealsTotal.Total}
              </td>
              {allDiets.map((d) => (
                <td key={d} className="py-3 px-2 text-right border-l font-bold">
                  {lightMealsTotal[d] || 0}
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>

      {showSummaryModal &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 print:hidden"
            onClick={() => setShowSummaryModal(false)}
          >
            <div
              className="w-full max-w-3xl bg-white rounded-xl shadow-2xl border border-slate-200 flex flex-col max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800">
                  Texto para enviar a alimentación
                </h3>
                <button
                  onClick={() => setShowSummaryModal(false)}
                  className="p-1 text-slate-400 hover:text-slate-700"
                  title="Cerrar"
                >
                  <IconX size={18} />
                </button>
              </div>
              <div className="p-4 overflow-auto">
                <textarea
                  readOnly
                  value={textSummary}
                  className="w-full min-h-[360px] border border-slate-300 rounded-lg p-3 text-sm font-mono text-slate-700 resize-y bg-slate-50"
                />
              </div>
              <div className="px-4 py-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  onClick={() => setShowSummaryModal(false)}
                  className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-800"
                >
                  Cerrar
                </button>
                <button
                  onClick={handleCopySummary}
                  className={`px-3 py-1.5 rounded text-xs font-bold text-white flex items-center gap-1 ${
                    copied
                      ? "bg-emerald-600"
                      : fimbaMode
                        ? "bg-[#d73289] hover:opacity-90"
                        : "bg-indigo-600 hover:bg-indigo-700"
                  }`}
                >
                  {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                  {copied ? "Copiado" : "Copiar texto"}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {showArtistExportModal &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 print:hidden"
            onClick={() => !artistExportBusy && setShowArtistExportModal(false)}
          >
            <div
              className="w-full max-w-md bg-white rounded-xl shadow-2xl border border-slate-200 flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800">
                  Exportar por artista
                </h3>
                <button
                  type="button"
                  disabled={artistExportBusy}
                  onClick={() => setShowArtistExportModal(false)}
                  className="p-1 text-slate-400 hover:text-slate-700"
                  title="Cerrar"
                >
                  <IconX size={18} />
                </button>
              </div>
              <div className="p-4 space-y-3 text-sm text-slate-600">
                <p className="m-0">
                  Genera un archivo por cada artista tagueado en comidas
                  {selectedArtistaIds.length > 0
                    ? " (solo los del filtro Artista activo)"
                    : ""}
                  . Respeta filtros de tipo/locación/convocados.
                </p>
                <ul className="list-disc pl-5 m-0 space-y-1 text-xs">
                  <li>
                    <strong>Excel</strong>: multi-hoja (Índice + una hoja cuadro
                    por artista)
                  </li>
                  <li>
                    <strong>ZIP textos</strong>: un .txt de pedido por artista
                  </li>
                </ul>
              </div>
              <div className="px-4 py-3 border-t border-slate-200 flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  disabled={artistExportBusy}
                  onClick={() => handleExportByArtista(["excel"])}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  {artistExportBusy ? (
                    <IconLoader size={14} className="animate-spin inline" />
                  ) : (
                    <IconDownload size={14} className="inline mr-1" />
                  )}{" "}
                  Solo Excel
                </button>
                <button
                  type="button"
                  disabled={artistExportBusy}
                  onClick={() => handleExportByArtista(["zip"])}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Solo ZIP textos
                </button>
                <button
                  type="button"
                  disabled={artistExportBusy}
                  onClick={() => handleExportByArtista(["excel", "zip"])}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-[#d73289] hover:opacity-90 disabled:opacity-50 inline-flex items-center gap-1"
                >
                  {artistExportBusy ? (
                    <IconLoader size={14} className="animate-spin" />
                  ) : (
                    <IconFiles size={14} />
                  )}
                  Excel + ZIP
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
