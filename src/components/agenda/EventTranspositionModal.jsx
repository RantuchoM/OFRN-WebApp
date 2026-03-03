import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  parseISO,
  isValid as isValidDate,
  differenceInCalendarDays,
  addDays,
  format as formatDate,
} from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import {
  IconX,
  IconRefresh,
  IconCalendar,
  IconAlertTriangle,
} from "../ui/Icons";
import SearchableSelect from "../ui/SearchableSelect";
import { getEventsByGira } from "../../services/giraService";

function computeSafeDate(iso) {
  try {
    const d = parseISO(iso);
    return isValidDate(d) ? d : null;
  } catch {
    return null;
  }
}

function formatIsoDate(iso) {
  const d = computeSafeDate(iso);
  if (!d) return "-";
  try {
    return formatDate(d, "dd/MM/yyyy", { locale: es });
  } catch {
    return iso || "-";
  }
}

export default function EventTranspositionModal({
  isOpen,
  onClose,
  supabase,
  giraDestino,
  giraId,
  currentEvents = [],
  onImported,
}) {
  const [loadingPrograms, setLoadingPrograms] = useState(false);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [saving, setSaving] = useState(false);

  const [programOptions, setProgramOptions] = useState([]);
  const [programById, setProgramById] = useState({});
  const [selectedOriginId, setSelectedOriginId] = useState(null);
  const [originProgram, setOriginProgram] = useState(null);
  const [originEvents, setOriginEvents] = useState([]);

  const [deltaDays, setDeltaDays] = useState(0);
  const [hasCustomDelta, setHasCustomDelta] = useState(false);

  const [selectedTypeIds, setSelectedTypeIds] = useState([]);
  const [selectedEventIds, setSelectedEventIds] = useState(() => new Set());

  // Cargar programas candidatos (otras giras)
  useEffect(() => {
    if (!isOpen || !supabase) return;

    let isCancelled = false;
    const fetchPrograms = async () => {
      setLoadingPrograms(true);
      try {
        let query = supabase
          .from("programas")
          .select(
            "id, nombre_gira, nomenclador, mes_letra, fecha_desde, fecha_hasta, tipo, zona, estado",
          )
          .order("fecha_desde", { ascending: false })
          .limit(80);

        const destinoId = giraDestino?.id || giraId;
        if (destinoId) {
          query = query.neq("id", destinoId);
        }

        const { data, error } = await query;
        if (error) throw error;
        if (isCancelled) return;

        const byId = {};
        const opts =
          (data || []).map((p) => {
            byId[p.id] = p;
            const title =
              p.nomenclador || p.nombre_gira || `Programa #${p.id}`;
            const prefix = p.mes_letra ? `${p.mes_letra} | ` : "";
            const label = `${prefix}${title}`;
            const meta = [p.tipo, p.zona]
              .filter(Boolean)
              .join(" • ")
              .trim();
            const subLabelParts = [];
            if (p.fecha_desde) {
              subLabelParts.push(`Desde ${formatIsoDate(p.fecha_desde)}`);
            }
            if (p.fecha_hasta) {
              subLabelParts.push(`Hasta ${formatIsoDate(p.fecha_hasta)}`);
            }
            if (meta) subLabelParts.push(meta);

            return {
              id: p.id,
              label,
              subLabel: subLabelParts.join(" · "),
            };
          }) || [];

        setProgramById(byId);
        setProgramOptions(opts);
      } catch (err) {
        console.error("[EventTranspositionModal] Error fetching programas:", err);
        toast.error("No se pudieron cargar las giras origen.");
      } finally {
        if (!isCancelled) setLoadingPrograms(false);
      }
    };

    fetchPrograms();

    return () => {
      isCancelled = true;
    };
  }, [isOpen, supabase, giraDestino, giraId]);

  // Reset básico al abrir/cerrar
  useEffect(() => {
    if (!isOpen) {
      setSelectedOriginId(null);
      setOriginProgram(null);
      setOriginEvents([]);
      setSelectedEventIds(new Set());
      setSelectedTypeIds([]);
      setDeltaDays(0);
      setHasCustomDelta(false);
    }
  }, [isOpen]);

  // Cuando cambia la gira origen seleccionada -> actualizar objeto y traer eventos
  useEffect(() => {
    if (!isOpen || !supabase || !selectedOriginId) return;
    const program = programById[selectedOriginId];
    setOriginProgram(program || null);

    let isCancelled = false;
    const fetchEvents = async () => {
      setLoadingEvents(true);
      try {
        const events = await getEventsByGira(supabase, selectedOriginId);
        if (isCancelled) return;

        setOriginEvents(events || []);
        setSelectedEventIds(new Set((events || []).map((e) => e.id)));

        // Inicializar filtros de tipo con todos los tipos presentes
        const typeIds = Array.from(
          new Set(
            (events || [])
              .map((e) => e.id_tipo_evento)
              .filter((id) => id != null),
          ),
        );
        setSelectedTypeIds(typeIds);
      } catch (err) {
        console.error(
          "[EventTranspositionModal] Error fetching eventos origen:",
          err,
        );
        toast.error("No se pudieron cargar los eventos de la gira origen.");
      } finally {
        if (!isCancelled) setLoadingEvents(false);
      }
    };

    fetchEvents();

    return () => {
      isCancelled = true;
    };
  }, [isOpen, supabase, selectedOriginId, programById]);

  // Calcular delta por defecto cuando tenemos gira destino y origen
  useEffect(() => {
    if (!isOpen) return;
    if (!giraDestino || !originProgram) return;
    if (hasCustomDelta) return;

    const dest = giraDestino.fecha_hasta
      ? computeSafeDate(giraDestino.fecha_hasta)
      : null;
    const origin = originProgram.fecha_hasta
      ? computeSafeDate(originProgram.fecha_hasta)
      : null;

    if (!dest || !origin) {
      setDeltaDays(0);
      return;
    }

    try {
      const diff = differenceInCalendarDays(dest, origin);
      setDeltaDays(diff);
    } catch {
      setDeltaDays(0);
    }
  }, [isOpen, giraDestino, originProgram, hasCustomDelta]);

  const categoriesTree = useMemo(() => {
    const categoriesMap = new Map();
    originEvents.forEach((e) => {
      if (!e.tipos_evento) return;
      const typeId = e.id_tipo_evento;
      if (typeId == null) return;
      const typeName = e.tipos_evento.nombre || `Tipo ${typeId}`;
      const typeColor = e.tipos_evento.color || "#6366f1";
      const cat = e.tipos_evento.categorias_tipos_eventos;
      const catId = cat?.id ?? 0;
      const catName = cat?.nombre || "Sin categoría";
      if (!categoriesMap.has(catId)) {
        categoriesMap.set(catId, {
          id: catId,
          nombre: catName,
          tipos: [],
        });
      }
      const bucket = categoriesMap.get(catId);
      if (!bucket.tipos.some((t) => t.id === typeId)) {
        bucket.tipos.push({
          id: typeId,
          nombre: typeName,
          color: typeColor,
        });
      }
    });
    const arr = Array.from(categoriesMap.values());
    arr.forEach((cat) =>
      cat.tipos.sort((a, b) => a.nombre.localeCompare(b.nombre, "es")),
    );
    return arr.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  }, [originEvents]);

  const filteredOriginEvents = useMemo(() => {
    if (!originEvents || originEvents.length === 0) return [];
    if (!selectedTypeIds || selectedTypeIds.length === 0) return originEvents;
    const allowed = new Set(selectedTypeIds);
    return originEvents.filter((e) =>
      e.id_tipo_evento != null ? allowed.has(e.id_tipo_evento) : true,
    );
  }, [originEvents, selectedTypeIds]);

  const toggleType = (id) => {
    setSelectedTypeIds((prev) => {
      if (!prev || prev.length === 0) return [id];
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      return [...prev, id];
    });
  };

  const toggleCategory = (catId) => {
    const cat = categoriesTree.find((c) => c.id === catId);
    if (!cat) return;
    const typeIds = cat.tipos.map((t) => t.id);
    setSelectedTypeIds((prev) => {
      const current = new Set(prev || []);
      const allSelected = typeIds.every((id) => current.has(id));
      if (allSelected) {
        typeIds.forEach((id) => current.delete(id));
      } else {
        typeIds.forEach((id) => current.add(id));
      }
      return Array.from(current);
    });
  };

  const handleDeltaChange = (e) => {
    const raw = e.target.value;
    if (raw === "" || raw === "-") {
      setDeltaDays(0);
      setHasCustomDelta(true);
      return;
    }
    const parsed = parseInt(raw, 10);
    if (Number.isNaN(parsed)) return;
    setDeltaDays(parsed);
    setHasCustomDelta(true);
  };

  const computeNewDateIso = (evt) => {
    if (!evt || !evt.fecha) return null;
    const base = computeSafeDate(evt.fecha);
    if (!base) return null;
    try {
      const shifted = addDays(base, deltaDays || 0);
      return shifted.toISOString().slice(0, 10);
    } catch {
      return evt.fecha;
    }
  };

  const mixedTimeline = useMemo(() => {
    const existing = (currentEvents || [])
      .filter((e) => e && e.fecha && !e.isProgramMarker)
      .map((e) => ({
        kind: "existing",
        id: `existing-${e.id}`,
        baseId: e.id,
        date: e.fecha,
        timeStart: e.hora_inicio || "00:00:00",
        timeEnd: e.hora_fin || null,
        label:
          e.descripcion ||
          e.tipos_evento?.nombre ||
          e.programas?.nombre_gira ||
          "Evento",
        tipo: e.tipos_evento?.nombre || null,
        color: e.tipos_evento?.color || "#6366f1",
      }));

    const proposed = filteredOriginEvents.map((e) => {
      const newIso = computeNewDateIso(e);
      return {
        kind: "proposed",
        id: `proposed-${e.id}`,
        baseId: e.id,
        originDate: e.fecha,
        newDate: newIso,
        timeStart: e.hora_inicio || "00:00:00",
        timeEnd: e.hora_fin || null,
        label:
          e.descripcion ||
          e.tipos_evento?.nombre ||
          originProgram?.nombre_gira ||
          "Evento origen",
        tipo: e.tipos_evento?.nombre || null,
        color: e.tipos_evento?.color || "#6366f1",
        checked: selectedEventIds.has(e.id),
      };
    });

    const all = [...existing, ...proposed];
    all.sort((a, b) => {
      const aDate =
        a.kind === "proposed"
          ? a.newDate || a.originDate
          : a.date || a.originDate;
      const bDate =
        b.kind === "proposed"
          ? b.newDate || b.originDate
          : b.date || b.originDate;
      const aKey = `${aDate || ""}T${a.timeStart || "00:00:00"}`;
      const bKey = `${bDate || ""}T${b.timeStart || "00:00:00"}`;
      if (aKey < bKey) return -1;
      if (aKey > bKey) return 1;
      if (a.kind === "existing" && b.kind === "proposed") return -1;
      if (a.kind === "proposed" && b.kind === "existing") return 1;
      return 0;
    });

    return all;
  }, [currentEvents, filteredOriginEvents, selectedEventIds, deltaDays, originProgram]);

  const existingKeys = useMemo(() => {
    const set = new Set();
    (currentEvents || []).forEach((e) => {
      if (!e || !e.fecha) return;
      const key = `${e.fecha}|${e.hora_inicio || ""}|${e.id_locacion || ""}`;
      set.add(key);
    });
    return set;
  }, [currentEvents]);

  const countSelected = useMemo(
    () => selectedEventIds.size,
    [selectedEventIds],
  );

  const handleToggleEvent = (eventId) => {
    setSelectedEventIds((prev) => {
      const next = new Set(prev);
      if (next.has(eventId)) next.delete(eventId);
      else next.add(eventId);
      return next;
    });
  };

  const handleSelectAll = () => {
    setSelectedEventIds(
      new Set(filteredOriginEvents.map((e) => e.id)),
    );
  };

  const handleClearAll = () => {
    setSelectedEventIds(new Set());
  };

  const handleConfirmImport = async () => {
    if (!supabase) return;
    if (!giraDestino && !giraId) {
      toast.error("No se encontró la gira destino.");
      return;
    }
    if (!selectedOriginId || originEvents.length === 0) {
      toast.error("Seleccioná primero una gira origen con eventos.");
      return;
    }
    if (selectedEventIds.size === 0) {
      toast.error("Seleccioná al menos un evento a importar.");
      return;
    }

    const destinationId = giraDestino?.id || giraId;
    const payload = [];
    originEvents.forEach((evt) => {
      if (!selectedEventIds.has(evt.id)) return;
      const newIso = computeNewDateIso(evt);
      if (!newIso) return;
      payload.push({
        fecha: newIso,
        hora_inicio: evt.hora_inicio,
        hora_fin: evt.hora_fin,
        tecnica: evt.tecnica,
        descripcion: evt.descripcion,
        convocados: evt.convocados,
        id_tipo_evento: evt.id_tipo_evento,
        id_locacion: evt.id_locacion,
        id_gira: destinationId,
        id_gira_transporte: evt.id_gira_transporte,
        id_estado_venue: evt.id_estado_venue,
      });
    });

    if (payload.length === 0) {
      toast.error("No hay eventos válidos para importar con el delta actual.");
      return;
    }

    try {
      setSaving(true);
      const { error } = await supabase.from("eventos").insert(payload);
      if (error) throw error;
      toast.success(`Se importaron ${payload.length} evento(s) correctamente.`);
      if (onImported) {
        await onImported();
      }
      onClose();
    } catch (err) {
      console.error("[EventTranspositionModal] Error importando eventos:", err);
      toast.error("No se pudieron importar los eventos.");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between gap-3 bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-100 text-indigo-700 rounded-full p-1.5">
              <IconRefresh size={16} />
            </div>
            <div className="flex flex-col">
              <h3 className="text-sm sm:text-base font-bold text-slate-800">
                Importar y Trasponer Eventos
              </h3>
              <p className="text-[11px] text-slate-500">
                Copiá eventos desde otra gira y ajustá sus fechas con un
                desplazamiento en días.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-200 text-slate-500"
          >
            <IconX size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-0 md:gap-4">
          {/* Columna izquierda: Configuración */}
          <div className="border-b md:border-b-0 md:border-r border-slate-200 p-4 space-y-4 bg-white">
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                Gira Origen
              </span>
              <SearchableSelect
                options={programOptions}
                value={selectedOriginId}
                onChange={(id) => setSelectedOriginId(id)}
                placeholder={
                  loadingPrograms
                    ? "Cargando giras..."
                    : "Elegí una gira origen..."
                }
                className="text-xs"
              />
              {originProgram && (
                <p className="text-[11px] text-slate-500 mt-1">
                  Origen:{" "}
                  <span className="font-semibold text-slate-700">
                    {originProgram.nomenclador || originProgram.nombre_gira}
                  </span>{" "}
                  ({formatIsoDate(originProgram.fecha_desde)} →{" "}
                  {formatIsoDate(originProgram.fecha_hasta)})
                </p>
              )}
              {giraDestino && (
                <p className="text-[11px] text-slate-500">
                  Destino:{" "}
                  <span className="font-semibold text-slate-700">
                    {giraDestino.nomenclador || giraDestino.nombre_gira}
                  </span>{" "}
                  ({formatIsoDate(giraDestino.fecha_desde)} →{" "}
                  {formatIsoDate(giraDestino.fecha_hasta)})
                </p>
              )}
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                Delta de días
              </span>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 border border-slate-300 rounded-lg px-2 py-1 bg-slate-50">
                  <IconCalendar size={14} className="text-slate-500" />
                  <input
                    type="number"
                    className="w-20 text-xs bg-transparent outline-none"
                    value={deltaDays}
                    onChange={handleDeltaChange}
                  />
                  <span className="text-[10px] text-slate-500">
                    día(s)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setHasCustomDelta(false);
                    // Se recalculará en el efecto correspondiente si hay origen+destino
                  }}
                  className="text-[11px] text-indigo-600 hover:underline"
                >
                  Recalcular por defecto
                </button>
              </div>
              <p className="text-[11px] text-slate-500">
                Un delta positivo mueve los eventos hacia adelante en el
                calendario; un delta negativo los adelanta.
              </p>
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                Filtros por tipo de evento
              </span>
              {categoriesTree.length === 0 ? (
                <p className="text-[11px] text-slate-400 italic">
                  No hay tipos de evento para filtrar todavía.
                </p>
              ) : (
                <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                  {categoriesTree.map((cat) => {
                    const typeIds = cat.tipos.map((t) => t.id);
                    const selectedCount = typeIds.filter((id) =>
                      selectedTypeIds.includes(id),
                    ).length;
                    const allSelected =
                      selectedCount > 0 && selectedCount === typeIds.length;
                    const someSelected =
                      selectedCount > 0 && selectedCount < typeIds.length;
                    return (
                      <div
                        key={cat.id}
                        className="border border-slate-100 rounded-lg p-1.5 bg-slate-50/40"
                      >
                        <button
                          type="button"
                          onClick={() => toggleCategory(cat.id)}
                          className={`w-full flex items-center justify-between text-[11px] font-semibold px-2 py-1 rounded ${
                            allSelected
                              ? "bg-indigo-50 text-indigo-700"
                              : someSelected
                              ? "bg-slate-100 text-slate-700"
                              : "bg-white text-slate-600"
                          }`}
                        >
                          <span className="truncate">{cat.nombre}</span>
                          <span className="text-[10px] text-slate-500 ml-2">
                            {selectedCount}/{typeIds.length}
                          </span>
                        </button>
                        {cat.tipos.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1 pl-1.5">
                            {cat.tipos.map((t) => {
                              const active = selectedTypeIds.includes(t.id);
                              return (
                                <button
                                  key={t.id}
                                  type="button"
                                  onClick={() => toggleType(t.id)}
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] border"
                                  style={{
                                    backgroundColor: active
                                      ? `${t.color || "#6366f1"}20`
                                      : "#ffffff",
                                    borderColor: active
                                      ? `${t.color || "#6366f1"}60`
                                      : "#e5e7eb",
                                    color: active ? "#111827" : "#4b5563",
                                  }}
                                >
                                  <span
                                    className="w-2 h-2 rounded-full"
                                    style={{
                                      backgroundColor: t.color || "#6366f1",
                                    }}
                                  />
                                  <span className="truncate max-w-[120px]">
                                    {t.nombre}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="space-y-2 border-t border-slate-200 pt-3 mt-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                Selección de eventos
              </span>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-600">
                  Seleccionados:{" "}
                  <span className="font-semibold">{countSelected}</span>
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="px-2 py-0.5 rounded-full border border-slate-300 text-slate-600 hover:bg-slate-50"
                  >
                    Todos
                  </button>
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="px-2 py-0.5 rounded-full border border-slate-300 text-slate-600 hover:bg-slate-50"
                  >
                    Ninguno
                  </button>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 flex items-start gap-1">
                <IconAlertTriangle size={12} className="mt-0.5 text-amber-500" />
                <span>
                  Solo se importarán los eventos marcados. Los eventos actuales
                  de la gira destino se muestran a la derecha como referencia y
                  no se modifican.
                </span>
              </p>
            </div>
          </div>

          {/* Columna derecha: Vista previa */}
          <div className="p-4 flex flex-col bg-slate-50 min-h-0">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wide flex items-center gap-1">
                Línea de Tiempo Combinada
              </span>
              {(loadingEvents || loadingPrograms) && (
                <span className="text-[11px] text-slate-500">
                  Cargando datos...
                </span>
              )}
            </div>

            <div className="flex-1 min-h-0 border border-slate-200 rounded-xl bg-white overflow-hidden">
              <div className="h-full overflow-y-auto divide-y divide-slate-100">
                {mixedTimeline.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs italic">
                    Seleccioná una gira origen para ver los eventos a
                    importar junto con la agenda actual.
                  </div>
                ) : (
                  mixedTimeline.map((row) => {
                    const isExisting = row.kind === "existing";
                    const key =
                      isExisting && row.date
                        ? `${row.date}|${row.timeStart || ""}|${
                            row.locId || ""
                          }`
                        : null;
                    const mayOverlap =
                      !isExisting &&
                      row.newDate &&
                      existingKeys.has(
                        `${row.newDate}|${row.timeStart || ""}|${
                          row.locId || ""
                        }`,
                      );

                    return (
                      <div
                        key={row.id}
                        className={`px-3 py-2 text-xs flex items-start gap-3 ${
                          isExisting
                            ? "bg-slate-50/60 text-slate-500"
                            : "bg-white"
                        }`}
                      >
                        <div className="w-24 shrink-0 text-[11px] text-slate-500 flex flex-col">
                          <span className="font-semibold">
                            {formatIsoDate(
                              isExisting ? row.date : row.newDate || row.originDate,
                            )}
                          </span>
                          <span>
                            {row.timeStart?.slice(0, 5)}
                            {row.timeEnd
                              ? `–${row.timeEnd.slice(0, 5)}`
                              : ""}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            {!isExisting && (
                              <input
                                type="checkbox"
                                checked={row.checked}
                                onChange={() =>
                                  handleToggleEvent(row.baseId)
                                }
                                className="mt-0.5 accent-indigo-600"
                              />
                            )}
                            <div
                              className="flex-1 border rounded-lg px-2 py-1.5"
                              style={{
                                borderStyle: isExisting ? "solid" : "dashed",
                                borderColor: `${row.color || "#6366f1"}40`,
                                backgroundColor: isExisting
                                  ? "#f9fafb"
                                  : `${row.color || "#6366f1"}15`,
                              }}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span
                                  className="font-semibold truncate text-slate-700"
                                >
                                  {row.label}
                                </span>
                                {row.tipo && (
                                  <span
                                    className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
                                    style={{
                                      backgroundColor: `${row.color || "#6366f1"}20`,
                                      color: "#111827",
                                    }}
                                  >
                                    {row.tipo}
                                  </span>
                                )}
                              </div>
                              {!isExisting && (
                                <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-slate-500">
                                  <span>
                                    Original:{" "}
                                    {formatIsoDate(row.originDate)}
                                  </span>
                                  <span>→</span>
                                  <span className="font-semibold text-indigo-700">
                                    Nueva fecha:{" "}
                                    {formatIsoDate(row.newDate)}
                                  </span>
                                  {mayOverlap && (
                                    <span className="px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold">
                                      Posible solapamiento
                                    </span>
                                  )}
                                </div>
                              )}
                              {isExisting && (
                                <p className="mt-0.5 text-[10px] text-slate-500 italic">
                                  Evento existente en la gira destino (solo
                                  lectura).
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="text-[11px] text-slate-500 flex items-center gap-2">
            <IconAlertTriangle size={14} className="text-amber-500" />
            <span>
              Los eventos se crearán como nuevas filas en la agenda de la gira
              destino, sin modificar los existentes.
            </span>
          </div>
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-full border border-slate-300 text-slate-600 text-xs hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirmImport}
              disabled={
                saving ||
                loadingEvents ||
                !selectedOriginId ||
                selectedEventIds.size === 0
              }
              className="px-4 py-1.5 rounded-full text-xs font-bold inline-flex items-center gap-2 bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
            >
              {saving ? (
                <span>Guardando...</span>
              ) : (
                <>
                  <IconRefresh size={14} />
                  <span>Importar eventos seleccionados</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

