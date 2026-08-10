import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  IconLoader,
  IconPrinter,
  IconClipboard,
  IconCopy,
  IconX,
  IconCheck,
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
  isMealEvent,
} from "../../utils/mealLogistics";
import { resolveLocalidadResidencia } from "../../utils/integranteDomicilioViaticos";
import { useGiraSegmentos } from "../../hooks/useGiraSegmentos";

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
  hospedajeExcluidosIds = [],
}) {
  const reportRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState([]);
  const [tagCatalogs, setTagCatalogs] = useState({
    localidadesById: new Map(),
    ensamblesById: new Map(),
  });
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState(
    new Set(["Almuerzo", "Merienda", "Cena"]),
  );
  const [includePending, setIncludePending] = useState(true);
  /** Vacío = todas las locaciones (venue). */
  const [selectedLocationKeys, setSelectedLocationKeys] = useState([]);
  /** Vacío = todas las localidades (ciudad de la locación). */
  const [selectedLocalidadKeys, setSelectedLocalidadKeys] = useState([]);
  /** Vacío = todos los grupos de convocados presentes en el evento. */
  const [selectedConvTags, setSelectedConvTags] = useState([]);
  const { segments } = useGiraSegmentos(supabase, gira, {
    enabled: Boolean(gira?.id),
  });

  useEffect(() => {
    if (gira?.id && enrichedRoster?.length > 0) {
      fetchReportData();
    }
  }, [gira?.id, enrichedRoster, includePending, hospedajeExcluidosIds, segments]);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      // 1. Filtrar solo confirmados del roster que ya viene enriquecido
      const activeRoster = enrichedRoster.filter(
        (p) => p.estado_gira === "confirmado",
      );

      if (activeRoster.length === 0) {
        setReportData([]);
        setTagCatalogs({
          localidadesById: new Map(),
          ensamblesById: new Map(),
        });
        return;
      }

      // 2. Obtener Eventos de Comida (cualquier tipo de categoría Comidas)
      const { data: eventsRaw } = await supabase
        .from("eventos")
        .select(
          "*, tipos_evento(id, nombre, id_categoria), locaciones(id, nombre, id_localidad, localidades(id, localidad)), convocados",
        )
        .eq("id_gira", gira.id)
        .eq("is_deleted", false)
        .order("fecha", { ascending: true })
        .order("hora_inicio", { ascending: true });

      const events = (eventsRaw || []).filter(isMealEvent);

      if (!events || events.length === 0) {
        setReportData([]);
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
      setTagCatalogs(catalogs);

      // 3. Obtener Asistencias manuales
      const eventIds = events.map((e) => e.id);
      const { data: attendance } = await supabase
        .from("eventos_asistencia")
        .select("id_evento, id_integrante, estado")
        .in("id_evento", eventIds);

      const attendanceMap = {};
      attendance?.forEach((a) => {
        attendanceMap[`${a.id_evento}-${a.id_integrante}`] = a.estado;
      });

      // 4. PROCESAMIENTO: convocados + cobertura logística (fecha + servicio por persona)
      const processed = events.map((evt) => {
        const counts = { Total: 0 };
        const eventDate = evt.fecha; // 'YYYY-MM-DD'

        const servicio = mealServicioFromEvent(evt);
        const servicioLabel = mealDisplayLabelFromEvent(evt);

        activeRoster.forEach((person) => {
          // A. ¿Está convocado y con cobertura logística (fecha + servicio del slot)?
          if (
            !isPersonEligibleForMealSlot(
              person,
              {
                fecha: eventDate,
                servicio,
                convocados: evt.convocados,
                hora: evt.hora_inicio,
              },
              { hospedajeExcluidosIds, segments },
            )
          )
            return;

          // C. Validar asistencia manual (Presente / Ausente / Pendiente)
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
        });

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
          ciudadKey,
          ciudadLabel,
          convocados,
          counts,
        };
      });

      setReportData(processed);
    } catch (error) {
      console.error("Error MealsReport:", error);
    } finally {
      setLoading(false);
    }
  };

  // --- Memorias y Totales ---
  const allDiets = useMemo(() => {
    const diets = new Set();
    reportData.forEach((row) => {
      Object.keys(row.counts).forEach((k) => {
        if (k !== "Total") diets.add(k);
      });
    });
    return Array.from(diets).sort((a, b) =>
      a === "Estándar" ? -1 : b === "Estándar" ? 1 : a.localeCompare(b),
    );
  }, [reportData]);

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

    return reportData.filter((r) => {
      if (!selectedTypes.has(r.servicio)) return false;
      if (locSet && !locSet.has(String(r.locKey))) return false;
      if (ciudadSet && !ciudadSet.has(String(r.ciudadKey))) return false;
      if (convSet) {
        const tags = r.convocados?.length ? r.convocados : ["__empty__"];
        const matches = tags.some((t) => convSet.has(String(t)));
        if (!matches) return false;
      }
      return true;
    });
  }, [
    reportData,
    selectedTypes,
    selectedLocationKeys,
    selectedLocalidadKeys,
    selectedConvTags,
  ]);

  const filterSummaryLabel = useMemo(() => {
    const parts = [];
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
    return parts.length ? parts.join(" · ") : null;
  }, [
    selectedLocationKeys,
    selectedLocalidadKeys,
    selectedConvTags,
    locationOptions,
    localidadOptions,
    convTagOptions,
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

  const textSummary = useMemo(() => {
    const formatDayHeader = (isoDate) => {
      const label = format(parseISO(isoDate), "EEEE dd/MM", { locale: es });
      return label.charAt(0).toUpperCase() + label.slice(1);
    };

    const formatDayRange = (isoDate) => format(parseISO(isoDate), "dd/MM");

    const serviceOrder = ["Desayuno", "Almuerzo", "Merienda", "Cena"];
    const servicePlural = {
      Desayuno: "desayunos",
      Almuerzo: "almuerzos",
      Merienda: "meriendas",
      Cena: "cenas",
    };

    const perDate = {};
    filteredReport.forEach((row) => {
      if (!perDate[row.fecha]) perDate[row.fecha] = {};
      // Clave por etiqueta completa para no fusionar "Almuerzo" con "Almuerzo (Vianda)"
      const groupKey = row.servicioLabel || row.servicio;
      if (!perDate[row.fecha][groupKey]) {
        perDate[row.fecha][groupKey] = {
          Total: 0,
          base: row.servicio,
          label: groupKey,
        };
      }
      perDate[row.fecha][groupKey].Total += row.counts.Total || 0;
      Object.entries(row.counts).forEach(([diet, value]) => {
        if (diet === "Total" || !value) return;
        perDate[row.fecha][groupKey][diet] =
          (perDate[row.fecha][groupKey][diet] || 0) + value;
      });
    });

    const orderedDates = Object.keys(perDate).sort((a, b) =>
      a.localeCompare(b),
    );

    const mealBlocks = orderedDates
      .map((dateKey) => {
        const groups = Object.values(perDate[dateKey] || {}).sort((a, b) => {
          const oa = serviceOrder.indexOf(a.base);
          const ob = serviceOrder.indexOf(b.base);
          if (oa !== ob) return (oa < 0 ? 99 : oa) - (ob < 0 ? 99 : ob);
          return String(a.label).localeCompare(String(b.label), "es");
        });

        const dateRows = groups
          .map((counts) => {
            if (!counts || !counts.Total) return null;

            const diets = Object.entries(counts)
              .filter(
                ([k, v]) =>
                  k !== "Total" && k !== "base" && k !== "label" && v > 0,
              )
              .sort(([a], [b]) =>
                a === "Estándar"
                  ? -1
                  : b === "Estándar"
                    ? 1
                    : a.localeCompare(b),
              )
              .map(([diet, value]) => `${value} ${diet.toLowerCase()}`);

            const details = diets.length > 0 ? ` (${diets.join(", ")})` : "";
            const base = counts.base;
            const pluralRoot = servicePlural[base] || String(counts.label || "").toLowerCase();
            // Si la etiqueta difiere del tipo (subcategoría), usarla literal
            const isSub =
              counts.label &&
              String(counts.label).toLowerCase() !== String(base || "").toLowerCase();
            const name = isSub
              ? String(counts.label).toLowerCase()
              : pluralRoot;
            return `${counts.Total} ${name}${details}`;
          })
          .filter(Boolean);

        if (dateRows.length === 0) return null;
        return `${formatDayHeader(dateKey)}\n${dateRows.join("\n")}`;
      })
      .filter(Boolean);

    const isMinorPerson = (person) => {
      if (person?.menor === true || person?.menor === 1) return true;
      if (!person?.fecha_nacimiento) return false;
      const birth = new Date(person.fecha_nacimiento);
      if (Number.isNaN(birth.getTime())) return false;
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const monthDiff = today.getMonth() - birth.getMonth();
      if (
        monthDiff < 0 ||
        (monthDiff === 0 && today.getDate() < birth.getDate())
      ) {
        age -= 1;
      }
      return age < 18;
    };

    const groupedByStay = {};
    nonLocalRoster.forEach((person) => {
      const inDate =
        person?.logistics?.checkin?.date || person?.logistics?.comida_inicio?.date;
      const outDate =
        person?.logistics?.checkout?.date || person?.logistics?.comida_fin?.date;
      if (!inDate || !outDate) return;
      const key = `${inDate}|${outDate}`;
      if (!groupedByStay[key]) {
        groupedByStay[key] = {
          inDate,
          outDate,
          pax: 0,
          minors: 0,
          superiorRooms: new Set(),
        };
      }
      groupedByStay[key].pax += 1;
      if (isMinorPerson(person)) groupedByStay[key].minors += 1;

      const room = person?.habitacion;
      const roomType = String(room?.tipo || "").toLowerCase();
      const isSuperiorRoom = roomType === "plus" || roomType === "superior";
      if (isSuperiorRoom && room?.id) groupedByStay[key].superiorRooms.add(room.id);
    });

    const stayBlocks = Object.values(groupedByStay)
      .sort((a, b) => a.inDate.localeCompare(b.inDate))
      .map((group) => {
        const extras = [];
        if (group.minors > 0) {
          extras.push(`${group.minors} ${group.minors === 1 ? "menor" : "menores"}`);
        }
        const roomCount = group.superiorRooms.size;
        if (roomCount > 0) {
          extras.push(
            `${roomCount} ${roomCount === 1 ? "habitación superior" : "habitaciones superiores"}`,
          );
        }
        const extraText = extras.length > 0 ? ` (${extras.join(", ")})` : "";
        const paxLabel = group.pax === 1 ? "pasajero" : "pasajeros";
        return (
          `Grupo ingreso ${formatDayRange(group.inDate)} al ${formatDayRange(group.outDate)}\n` +
          `${group.pax} ${paxLabel}${extraText}`
        );
      });

    const stayPaxTotal = Object.values(groupedByStay).reduce(
      (sum, group) => sum + group.pax,
      0,
    );

    // Para alimentación: el total debe reflejar comidas (pico por servicio),
    // no el conteo de hospedaje no local (que puede no coincidir con ningún servicio).
    const mealPeak = filteredReport.reduce(
      (max, row) => Math.max(max, row.counts?.Total || 0),
      0,
    );

    const blocks = [];
    if (mealPeak > 0) {
      blocks.push(`Cantidad de pasajeros: ${mealPeak}`);
    }
    if (mealBlocks.length > 0) blocks.push(mealBlocks.join("\n\n"));
    blocks.push("Fecha de ingreso y egreso.");
    if (stayPaxTotal > 0) {
      blocks.push(
        `Hospedaje (no locales): ${stayPaxTotal} ${stayPaxTotal === 1 ? "pasajero" : "pasajeros"}`,
      );
    }
    if (stayBlocks.length > 0) blocks.push(stayBlocks.join("\n\n"));
    return blocks.join("\n\n");
  }, [filteredReport, nonLocalRoster]);

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
        <IconLoader className="animate-spin text-indigo-500" size={32} />
      </div>
    );

  return (
    <div className="flex flex-col h-full bg-white animate-in fade-in">
      {/* Barra de Filtros */}
      <div className="p-3 sm:p-4 border-b border-slate-200 flex flex-wrap items-center gap-x-3 gap-y-2 bg-slate-50 print:hidden">
        <h2 className="text-base sm:text-lg font-bold text-slate-800 shrink-0">
          Reporte de Comidas
        </h2>

        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 gap-0.5 h-[34px] shrink-0">
            {["Desayuno", "Almuerzo", "Merienda", "Cena"].map((type) => (
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
                    ? "bg-indigo-600 text-white"
                    : "text-slate-500 hover:bg-slate-100"
                }`}
              >
                {type.charAt(0)}
              </button>
            ))}
          </div>

          <div
            className={`inline-flex items-stretch rounded-lg border overflow-visible h-[34px] shadow-sm bg-white shrink-0 ${
              selectedLocalidadKeys.length > 0 ||
              selectedLocationKeys.length > 0 ||
              selectedConvTags.length > 0
                ? "border-indigo-400"
                : "border-slate-200"
            }`}
            title="Filtros de lugar y convocados"
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
          </div>

          {(selectedLocalidadKeys.length > 0 ||
            selectedLocationKeys.length > 0 ||
            selectedConvTags.length > 0) && (
            <button
              type="button"
              onClick={() => {
                setSelectedLocalidadKeys([]);
                setSelectedLocationKeys([]);
                setSelectedConvTags([]);
              }}
              className="text-[11px] font-bold text-slate-500 hover:text-indigo-600 underline-offset-2 hover:underline shrink-0"
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
            <div className="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:bg-indigo-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full relative"></div>
            Pendientes
          </label>
        </div>

        <div className="flex items-center gap-2 ml-auto shrink-0">
          <button
            type="button"
            onClick={() => setShowSummaryModal(true)}
            className="flex items-center gap-1.5 bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-indigo-700 h-[34px]"
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

      {/* Contenido Reporte */}
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
          <div className="mb-4 print:hidden text-xs font-medium text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2">
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
                  className="py-2 px-1 w-0 text-right border-l text-xs uppercase text-slate-800 font-bold whitespace-nowrap"
                  title={d}
                >
                  {d.length <= 4 ? d : d.slice(0, 4)}
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
                    className="py-3 px-2 text-right border-l font-mono"
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

      {showSummaryModal && (
        <div
          className="fixed inset-0 z-[90] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 print:hidden"
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
                  copied ? "bg-emerald-600" : "bg-indigo-600 hover:bg-indigo-700"
                }`}
              >
                {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                {copied ? "Copiado" : "Copiar texto"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
