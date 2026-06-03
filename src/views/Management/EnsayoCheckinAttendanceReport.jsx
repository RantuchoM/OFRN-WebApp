import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { useAuth } from "../../context/AuthContext";
import DateInput from "../../components/ui/DateInput";
import TimeInput from "../../components/ui/TimeInput";
import ConfirmModal from "../../components/ui/ConfirmModal";
import LocationManagerModal from "../../components/locations/LocationManagerModal";
import {
  IconChevronDown,
  IconDownload,
  IconLoader,
  IconMapPin,
  IconTrash,
} from "../../components/ui/Icons";
import {
  fetchEnsayoCheckinReportData,
  buildCheckinLookup,
  buildEnsambleMatrixSections,
  formatRegistradoHora,
  eventColumnLabel,
  isEnsambleSelectableForCheckinReport,
  checkinGoogleMapsUrl,
  checkinMapPinTitle,
  formatDistanciaSedeM,
  resolveCheckinDistanciaSedeM,
} from "../../services/ensayoCheckinReportService";
import {
  ensayoCheckinAdminUpsert,
  ensayoCheckinAdminDelete,
} from "../../services/ensayoCheckinService";
import {
  downloadEnsayoCheckinPorPersonaExcel,
  downloadEnsayoCheckinPorPersonaPdf,
  downloadEnsayoCheckinMatrizExcel,
  downloadEnsayoCheckinMatrizPdf,
} from "../../utils/ensayoCheckinReportExport";
import {
  getTodayDateStringLocal,
  getDateRangePresetLocal,
  ENSAYO_CHECKIN_DATE_PRESETS,
} from "../../utils/dates";
import { locacionHasStoredCoords } from "../../utils/mapsCoords";

function buildRegistradoAt(fecha, timeHHmm) {
  const t = (timeHHmm || "00:00").slice(0, 5);
  return `${fecha}T${t}:00`;
}

function formatFilterDateLabel(iso) {
  if (!iso) return "";
  try {
    return format(parseISO(iso), "dd/MM/yy");
  } catch {
    return iso;
  }
}

function cellUiClass(checkin) {
  if (!checkin) return "bg-white border-slate-200 text-slate-300";
  if (checkin.justificado)
    return "bg-violet-50 border-violet-300 text-violet-900";
  if (checkin.editado_por_admin)
    return "bg-amber-50 border-amber-300 text-amber-900";
  return "bg-emerald-50 border-emerald-200 text-emerald-800";
}

function CheckinMapPin({ checkin, evt, size = 11, className = "", showDistance = false }) {
  const url = checkinGoogleMapsUrl(checkin);
  if (!url) return null;
  const distLabel = formatDistanciaSedeM(resolveCheckinDistanciaSedeM(checkin, evt));
  return (
    <span className={`inline-flex items-center gap-0.5 ${className}`}>
      {showDistance && distLabel && (
        <span className="text-[9px] font-semibold text-slate-500 tabular-nums">
          {distLabel}
        </span>
      )}
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        title={checkinMapPinTitle(checkin, evt)}
        aria-label={checkinMapPinTitle(checkin, evt)}
        onClick={(e) => e.stopPropagation()}
        className="inline-flex items-center justify-center rounded text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50"
      >
        <IconMapPin size={size} />
      </a>
    </span>
  );
}

export default function EnsayoCheckinAttendanceReport({ supabase }) {
  const { user, isAdmin, roles } = useAuth();
  const canEdit = isAdmin || roles.includes("editor");

  const today = getTodayDateStringLocal();
  const [desde, setDesde] = useState(today);
  const [hasta, setHasta] = useState(today);
  const [ensamblesOptions, setEnsamblesOptions] = useState([]);
  const [selectedEnsambleIds, setSelectedEnsambleIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [events, setEvents] = useState([]);
  const [integrantes, setIntegrantes] = useState([]);
  const [checkins, setCheckins] = useState([]);
  const [ensambles, setEnsambles] = useState([]);
  const [viewMode, setViewMode] = useState("matriz");
  const [editCell, setEditCell] = useState(null);
  const [editTipo, setEditTipo] = useState("presencial");
  const [editTime, setEditTime] = useState("09:00");
  const [editNota, setEditNota] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [activeDatePreset, setActiveDatePreset] = useState(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [editLocationId, setEditLocationId] = useState(null);
  const autoLoadDoneRef = useRef(false);

  const applyDatePreset = (presetId) => {
    const range = getDateRangePresetLocal(presetId);
    if (!range) return;
    setDesde(range.dateFrom);
    setHasta(range.dateTo);
    setActiveDatePreset(presetId);
  };

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("ensambles")
        .select("id, ensamble")
        .order("ensamble");
      if (error) return;
      setEnsamblesOptions(
        (data || [])
          .filter((e) => isEnsambleSelectableForCheckinReport(e.ensamble))
          .map((e) => ({ id: e.id, label: e.ensamble })),
      );
    })();
  }, [supabase]);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const sync = () => setFiltersOpen(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!ensamblesOptions.length || autoLoadDoneRef.current) return;
    autoLoadDoneRef.current = true;
    const ids = ensamblesOptions.map((o) => Number(o.id));
    setSelectedEnsambleIds(ids);

    (async () => {
      setLoading(true);
      setLoadError(null);
      const hoy = getTodayDateStringLocal();
      try {
        const data = await fetchEnsayoCheckinReportData(supabase, {
          desde: hoy,
          hasta: hoy,
          ensambleIds: ids,
        });
        setEvents(data.events);
        setIntegrantes(data.integrantes);
        setCheckins(data.checkins);
        setEnsambles(data.ensambles);
      } catch (e) {
        setLoadError(e.message || "Error al cargar");
      } finally {
        setLoading(false);
      }
    })();
  }, [ensamblesOptions, supabase]);

  const toggleEnsambleId = (id) => {
    const n = Number(id);
    setSelectedEnsambleIds((prev) =>
      prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n],
    );
  };

  const loadReport = useCallback(async () => {
    if (!selectedEnsambleIds.length) {
      toast.error("Seleccioná al menos un ensamble");
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const data = await fetchEnsayoCheckinReportData(supabase, {
        desde,
        hasta,
        ensambleIds: selectedEnsambleIds.map(Number),
      });
      setEvents(data.events);
      setIntegrantes(data.integrantes);
      setCheckins(data.checkins);
      setEnsambles(data.ensambles);
    } catch (e) {
      setLoadError(e.message || "Error al cargar");
      toast.error(e.message || "Error al cargar");
    } finally {
      setLoading(false);
    }
  }, [supabase, desde, hasta, selectedEnsambleIds]);

  const checkinMap = useMemo(() => buildCheckinLookup(checkins), [checkins]);

  const ensambleLabels = useMemo(
    () =>
      ensambles
        .filter((e) => selectedEnsambleIds.includes(Number(e.id)))
        .map((e) => e.ensamble),
    [ensambles, selectedEnsambleIds],
  );

  const matrixSections = useMemo(
    () => buildEnsambleMatrixSections(ensambles, events, integrantes),
    [ensambles, events, integrantes],
  );

  const filterSummary = useMemo(() => {
    const hoy = getTodayDateStringLocal();
    const datePart =
      desde === hasta
        ? desde === hoy
          ? "Hoy"
          : formatFilterDateLabel(desde)
        : `${formatFilterDateLabel(desde)} – ${formatFilterDateLabel(hasta)}`;
    const total = ensamblesOptions.length;
    const n = selectedEnsambleIds.length;
    const ensPart =
      total > 0 && n === total
        ? "Todos los ensambles"
        : `${n} ensamble${n === 1 ? "" : "s"}`;
    return `${datePart} · ${ensPart}`;
  }, [desde, hasta, selectedEnsambleIds, ensamblesOptions.length]);

  const exportBase = useMemo(
    () => ({
      events,
      integrantes,
      checkinMap,
      desde,
      hasta,
      ensambleLabels,
      ensambles,
    }),
    [events, integrantes, checkinMap, desde, hasta, ensambleLabels, ensambles],
  );

  const openEdit = (evt, person, existing) => {
    if (!canEdit) return;
    setEditCell({ evt, person, existing: existing || null });
    if (existing?.justificado) {
      setEditTipo("justificado");
      setEditTime(formatRegistradoHora(existing.registrado_at) || evt.hora_inicio?.slice(0, 5) || "09:00");
      setEditNota(existing.nota_justificacion || "");
    } else if (existing) {
      setEditTipo("presencial");
      setEditTime(formatRegistradoHora(existing.registrado_at) || "09:00");
      setEditNota("");
    } else {
      setEditTipo("presencial");
      setEditTime(evt.hora_inicio?.slice(0, 5) || "09:00");
      setEditNota("");
    }
    setConfirmDelete(false);
  };

  const handleSaveEdit = async () => {
    if (!editCell || !user?.id) return;
    setSaving(true);
    try {
      const { evt, person } = editCell;
      const registradoAt = buildRegistradoAt(evt.fecha, editTime);
      await ensayoCheckinAdminUpsert({
        eventoId: evt.id,
        integranteId: person.id,
        registradoAt,
        editorId: user.id,
        justificado: editTipo === "justificado",
        notaJustificacion: editTipo === "justificado" ? editNota : null,
      });
      toast.success("Asistencia guardada");
      setEditCell(null);
      await loadReport();
    } catch (e) {
      toast.error(e.message || "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEdit = async () => {
    if (!editCell?.existing || !user?.id) return;
    setSaving(true);
    try {
      await ensayoCheckinAdminDelete(
        editCell.evt.id,
        editCell.person.id,
        user.id,
      );
      toast.success("Registro eliminado");
      setEditCell(null);
      await loadReport();
    } catch (e) {
      toast.error(e.message || "Error al eliminar");
    } finally {
      setSaving(false);
    }
  };

  const renderEventColumnHeader = (evt) => {
    const locId = evt.id_locacion ?? evt.locaciones?.id;
    const locName = evt.locaciones?.nombre?.trim() || "Sin locación";
    const datetime = eventColumnLabel(evt);
    const canEditLoc = canEdit && locId;
    const hasCoords = locacionHasStoredCoords(evt.locaciones);

    const inner = (
      <>
        <span className="block font-bold tabular-nums leading-tight">{datetime}</span>
        <span
          className={`block text-[9px] font-normal leading-tight mt-0.5 truncate max-w-[5.5rem] mx-auto ${
            canEditLoc ? "text-indigo-700" : "text-slate-500"
          }`}
        >
          {locName}
        </span>
        {locId && !hasCoords && (
          <span
            className="inline-block mt-0.5 px-1 py-px rounded text-[7px] font-black uppercase tracking-tight bg-amber-100 text-amber-800 border border-amber-300"
            title="La locación no tiene latitud/longitud — no se calculará distancia en check-ins"
          >
            sin coords
          </span>
        )}
      </>
    );

    if (!canEditLoc) {
      return (
        <div className="py-0.5" title={evt.descripcion || locName}>
          {inner}
        </div>
      );
    }

    return (
      <button
        type="button"
        onClick={() => setEditLocationId(Number(locId))}
        className="w-full py-0.5 rounded hover:bg-indigo-50 focus:outline-none focus:ring-1 focus:ring-indigo-300"
        title={`${datetime} — ${locName}. Clic para editar locación.`}
      >
        {inner}
      </button>
    );
  };

  const renderCheckinCell = (evt, p) => {
    const chk = checkinMap.get(`${evt.id}-${p.id}`);
    const hora = chk ? formatRegistradoHora(chk.registrado_at) : "";
    const mapsUrl = checkinGoogleMapsUrl(chk);
    const distLabel = formatDistanciaSedeM(resolveCheckinDistanciaSedeM(chk, evt));
    return (
      <td key={evt.id} className="border p-0.5 text-center">
        <div className="relative min-h-[28px]">
          <button
            type="button"
            disabled={!canEdit}
            onClick={() => openEdit(evt, p, chk)}
            className={`w-full min-h-[28px] rounded border text-[10px] font-bold tabular-nums ${cellUiClass(chk)} ${canEdit ? "cursor-pointer hover:ring-1 hover:ring-indigo-300" : "cursor-default"} ${mapsUrl ? "pr-3 pb-2.5" : ""}`}
            title={
              chk?.justificado
                ? "Justificado"
                : chk?.editado_por_admin
                  ? "Editado por admin"
                  : chk
                    ? checkinMapPinTitle(chk, evt) || "Check-in app"
                    : canEdit
                      ? "Cargar asistencia"
                      : ""
            }
          >
            {hora || (canEdit ? "+" : "")}
          </button>
          {mapsUrl && (
            <div className="absolute bottom-0 right-0 left-0 flex items-center justify-end gap-0.5 px-0.5 pointer-events-none">
              {distLabel && (
                <span className="text-[7px] font-bold text-slate-500 tabular-nums leading-none">
                  {distLabel}
                </span>
              )}
              <CheckinMapPin
                checkin={chk}
                evt={evt}
                size={10}
                className="pointer-events-auto"
              />
            </div>
          )}
        </div>
      </td>
    );
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-hidden">
      <div className="shrink-0 rounded-lg border border-slate-200 bg-white px-2 py-1.5 space-y-1">
        <div className="flex md:hidden items-center gap-1.5">
          <button
            type="button"
            onClick={() => setFiltersOpen((v) => !v)}
            className="flex-1 min-w-0 flex items-center gap-1.5 px-2 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-left"
            aria-expanded={filtersOpen}
          >
            <IconChevronDown
              size={16}
              className={`shrink-0 text-slate-500 transition-transform ${filtersOpen ? "rotate-180" : ""}`}
            />
            <span className="text-[11px] font-bold text-slate-700 truncate">
              {filterSummary}
            </span>
          </button>
          {!filtersOpen && (
            <button
              type="button"
              onClick={loadReport}
              disabled={loading}
              className="shrink-0 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-black hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? "…" : "Cargar"}
            </button>
          )}
        </div>

        <div
          className={`${filtersOpen ? "flex" : "hidden"} md:flex flex-col md:flex-row md:items-stretch gap-2`}
        >
          <div className="flex gap-2 shrink-0 md:contents">
          <div className="grid grid-cols-2 grid-rows-2 gap-0.5 w-[9.25rem] shrink-0 self-stretch">
            {ENSAYO_CHECKIN_DATE_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyDatePreset(preset.id)}
                title={preset.label}
                className={`h-full min-h-0 w-full flex items-center justify-center px-0.5 rounded text-[9px] font-bold border leading-tight text-center ${
                  activeDatePreset === preset.id
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-indigo-50"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-1 w-[10.5rem] shrink-0 self-stretch justify-center">
            <div>
              <label className="text-[9px] font-bold text-slate-400 uppercase leading-none block mb-0.5">
                Desde
              </label>
              <DateInput
                value={desde}
                onChange={(v) => {
                  setDesde(v);
                  setActiveDatePreset(null);
                }}
                showDayName={false}
                showCalendarPicker={false}
                className="!pl-1 border border-slate-300 bg-white rounded text-xs py-1 pr-1 min-h-[1.75rem]"
              />
            </div>
            <div>
              <label className="text-[9px] font-bold text-slate-400 uppercase leading-none block mb-0.5">
                Hasta
              </label>
              <DateInput
                value={hasta}
                onChange={(v) => {
                  setHasta(v);
                  setActiveDatePreset(null);
                }}
                showDayName={false}
                showCalendarPicker={false}
                className="!pl-1 border border-slate-300 bg-white rounded text-xs py-1 pr-1 min-h-[1.75rem]"
              />
            </div>
          </div>
          </div>
          <div className="flex-1 min-w-0 flex flex-col gap-0.5 self-stretch min-h-0">
            <label className="text-[9px] font-bold text-slate-400 uppercase leading-none shrink-0">
              Ensambles
            </label>
            <div className="flex-1 min-h-0 max-h-28 md:max-h-none overflow-y-auto md:overflow-visible grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-0.5 auto-rows-[minmax(1.25rem,1fr)]">
              {ensamblesOptions.length === 0 ? (
                <p className="col-span-full text-[10px] text-slate-400 self-center">
                  Sin ensambles
                </p>
              ) : (
                ensamblesOptions.map((opt) => {
                  const selected = selectedEnsambleIds.includes(Number(opt.id));
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => toggleEnsambleId(opt.id)}
                      title={opt.label}
                      className={`h-full min-h-[1.35rem] w-full flex items-center justify-center px-0.5 rounded text-[9px] font-bold border leading-tight truncate ${
                        selected
                          ? "bg-indigo-600 text-white border-indigo-600"
                          : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-indigo-50"
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              loadReport();
              if (window.matchMedia("(max-width: 767px)").matches) {
                setFiltersOpen(false);
              }
            }}
            disabled={loading}
            className="shrink-0 w-full md:w-14 lg:w-16 h-10 md:h-auto md:self-stretch rounded-lg bg-indigo-600 text-white text-xs sm:text-sm font-black hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center px-1 leading-tight"
          >
            {loading ? "…" : "Cargar"}
          </button>
        </div>
        {events.length > 0 && (
          <div className="flex flex-wrap gap-x-1.5 gap-y-0.5 items-center text-[9px] text-slate-500 border-t border-slate-100 pt-1">
            <div className="inline-flex rounded border border-slate-200 p-px font-bold shrink-0">
              <button
                type="button"
                className={`px-1.5 py-0.5 rounded-sm ${viewMode === "matriz" ? "bg-indigo-600 text-white" : "text-slate-600"}`}
                onClick={() => setViewMode("matriz")}
              >
                Matriz
              </button>
              <button
                type="button"
                className={`px-1.5 py-0.5 rounded-sm ${viewMode === "lista" ? "bg-indigo-600 text-white" : "text-slate-600"}`}
                onClick={() => setViewMode("lista")}
              >
                Lista
              </button>
            </div>
            <span className="text-slate-300">|</span>
            <span title="Ámbar: admin presencial; violeta: justificado (solo pantalla)">
              <span className="text-amber-700 font-bold">A</span> admin ·{" "}
              <span className="text-violet-700 font-bold">J</span> justif.
            </span>
            <span className="text-slate-300">|</span>
            <span className="inline-flex items-center gap-0.5" title="Check-in con GPS (no cargas admin)">
              <IconMapPin size={11} className="text-indigo-600" /> mapa + m
            </span>
            <span className="text-slate-300">|</span>
            <button type="button" className="font-bold text-indigo-600 hover:underline" onClick={() => downloadEnsayoCheckinPorPersonaExcel(exportBase)}>
              XLS pers.
            </button>
            <button type="button" className="font-bold text-indigo-600 hover:underline" onClick={() => downloadEnsayoCheckinPorPersonaPdf(exportBase)}>
              PDF pers.
            </button>
            <button type="button" className="font-bold text-indigo-600 hover:underline" onClick={() => downloadEnsayoCheckinMatrizExcel(exportBase)}>
              XLS mat.
            </button>
            <button type="button" className="font-bold text-indigo-600 hover:underline" onClick={() => downloadEnsayoCheckinMatrizPdf(exportBase)}>
              PDF mat.
            </button>
          </div>
        )}
      </div>

      {loadError && (
        <p className="text-sm text-red-600 px-2">{loadError}</p>
      )}

      <div className="flex-1 min-h-0 overflow-auto rounded-lg border border-slate-200 bg-white">
        {loading && (
          <div className="p-10 flex justify-center">
            <IconLoader className="animate-spin text-indigo-500" size={32} />
          </div>
        )}
        {!loading && events.length === 0 && (
          <p className="p-8 text-center text-slate-400 text-sm">
            {desde === hasta && desde === today
              ? "No hay ensayos de ensamble hoy para los filtros elegidos."
              : "No hay ensayos con estos filtros. Ajustá fechas o ensambles y presioná Cargar."}
          </p>
        )}
        {!loading && events.length > 0 && viewMode === "matriz" && (
          <div className="space-y-6 p-3">
            {matrixSections.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">
                No hay ensayos o integrantes para los ensambles seleccionados.
              </p>
            ) : (
              matrixSections.map((section) => (
                <section
                  key={section.ensambleId}
                  className="rounded-lg border border-indigo-100 overflow-hidden"
                >
                  <div className="bg-indigo-100 border-b border-indigo-200 px-3 py-2">
                    <h3 className="text-sm font-black text-indigo-900 uppercase tracking-wide">
                      {section.ensamble.ensamble}
                    </h3>
                    <p className="text-[10px] text-indigo-700/80">
                      {section.events.length} ensayo(s) · {section.integrantes.length}{" "}
                      integrante(s)
                    </p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border-collapse">
                      <thead className="bg-slate-100">
                        <tr>
                          <th className="sticky left-0 z-10 bg-slate-100 border p-2 text-left min-w-[140px]">
                            Integrante
                          </th>
                          <th className="border p-2 text-left min-w-[80px] bg-slate-100">
                            Instrumento
                          </th>
                          {section.events.map((evt) => (
                            <th
                              key={evt.id}
                              className="border p-0.5 text-center font-bold text-[10px] min-w-[56px] align-bottom"
                            >
                              {renderEventColumnHeader(evt)}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {section.integrantes.map((p) => (
                          <tr key={p.id} className="hover:bg-slate-50">
                            <td className="sticky left-0 z-10 bg-white border p-2 font-medium">
                              {p.apellido}, {p.nombre}
                            </td>
                            <td className="border p-2 text-slate-500 text-[10px]">
                              {p.instrumento}
                            </td>
                            {section.events.map((evt) =>
                              renderCheckinCell(evt, p),
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              ))
            )}
          </div>
        )}
        {!loading && events.length > 0 && viewMode === "lista" && (
          <div className="space-y-4 p-2 sm:p-3">
            {matrixSections.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">
                No hay ensayos o integrantes para los ensambles seleccionados.
              </p>
            ) : (
              matrixSections.map((section) => (
                <section
                  key={section.ensambleId}
                  className="rounded-lg border border-indigo-100 overflow-hidden"
                >
                  <div className="bg-indigo-100 border-b border-indigo-200 px-3 py-2">
                    <h3 className="text-sm font-black text-indigo-900 uppercase tracking-wide">
                      {section.ensamble.ensamble}
                    </h3>
                    <p className="text-[10px] text-indigo-700/80">
                      {section.events.length} ensayo(s)
                    </p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="p-2 text-left">Integrante</th>
                          <th className="p-2 text-left">Ensayo</th>
                          <th className="p-2">Hora</th>
                          <th className="p-2">Llegada</th>
                          <th className="p-2 text-left">Sede</th>
                        </tr>
                      </thead>
                      <tbody>
                        {section.integrantes.flatMap((p) =>
                          section.events.map((evt) => {
                            const chk = checkinMap.get(`${evt.id}-${p.id}`);
                            return (
                              <tr
                                key={`${p.id}-${evt.id}`}
                                className="border-t border-slate-100"
                              >
                                <td className="p-2 font-medium">
                                  {p.apellido}, {p.nombre}
                                </td>
                                <td className="p-2 text-[11px] text-slate-600">
                                  {eventColumnLabel(evt)}
                                </td>
                                <td className="p-2 text-center font-mono text-xs">
                                  {evt.hora_inicio?.slice(0, 5)}
                                </td>
                                <td className="p-2 text-center">
                                  <div className="inline-flex items-center gap-1">
                                    <button
                                      type="button"
                                      disabled={!canEdit}
                                      onClick={() => openEdit(evt, p, chk)}
                                      className={`font-mono font-bold px-2 py-0.5 rounded border text-xs ${cellUiClass(chk)}`}
                                    >
                                      {chk
                                        ? formatRegistradoHora(chk.registrado_at)
                                        : canEdit
                                          ? "+"
                                          : ""}
                                    </button>
                                    <CheckinMapPin
                                      checkin={chk}
                                      evt={evt}
                                      size={14}
                                      showDistance
                                    />
                                  </div>
                                </td>
                                <td className="p-2 text-slate-600 text-xs">
                                  {evt.locaciones?.nombre}
                                </td>
                              </tr>
                            );
                          }),
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>
              ))
            )}
          </div>
        )}
      </div>

      {editCell && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-5 space-y-4">
            <h3 className="font-bold text-slate-800">
              {editCell.existing ? "Editar asistencia" : "Cargar asistencia"}
            </h3>
            <p className="text-sm text-slate-600">
              {editCell.person.apellido}, {editCell.person.nombre} —{" "}
              {editCell.evt.fecha} {editCell.evt.hora_inicio?.slice(0, 5)}
            </p>
            {editCell.existing && checkinGoogleMapsUrl(editCell.existing) && (
              <div className="space-y-1">
                <a
                  href={checkinGoogleMapsUrl(editCell.existing)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-bold text-indigo-600 hover:text-indigo-800 hover:underline"
                >
                  <IconMapPin size={16} />
                  Ver ubicación en Google Maps
                </a>
                {formatDistanciaSedeM(
                  resolveCheckinDistanciaSedeM(editCell.existing, editCell.evt),
                ) && (
                  <p className="text-xs text-slate-500">
                    Aprox.{" "}
                    {formatDistanciaSedeM(
                      resolveCheckinDistanciaSedeM(editCell.existing, editCell.evt),
                    )}{" "}
                    de {editCell.evt.locaciones?.nombre || "la sede"}
                  </p>
                )}
              </div>
            )}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  checked={editTipo === "presencial"}
                  onChange={() => setEditTipo("presencial")}
                />
                Check-in presencial (corrección admin)
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  checked={editTipo === "justificado"}
                  onChange={() => {
                    setEditTipo("justificado");
                    setEditTime(
                      editCell.evt.hora_inicio?.slice(0, 5) || editTime,
                    );
                  }}
                />
                Asistencia justificada (sin presencia)
              </label>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase">
                Hora de llegada / nominal
              </label>
              <TimeInput value={editTime} onChange={setEditTime} />
            </div>
            {editTipo === "justificado" && (
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase">
                  Nota interna (opcional)
                </label>
                <textarea
                  className="w-full border rounded-lg p-2 text-sm"
                  rows={2}
                  value={editNota}
                  onChange={(e) => setEditNota(e.target.value)}
                />
              </div>
            )}
            <div className="flex flex-wrap gap-2 justify-end">
              {editCell.existing && (
                <button
                  type="button"
                  className="mr-auto text-red-600 text-sm font-bold flex items-center gap-1"
                  onClick={() => setConfirmDelete(true)}
                >
                  <IconTrash size={14} /> Eliminar
                </button>
              )}
              <button
                type="button"
                className="px-3 py-1.5 text-sm text-slate-600"
                onClick={() => setEditCell(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={saving}
                className="px-4 py-1.5 bg-indigo-600 text-white text-sm font-bold rounded-lg disabled:opacity-50"
                onClick={handleSaveEdit}
              >
                {saving ? "Guardando…" : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmDelete}
        overlayClassName="z-[400]"
        title="Eliminar registro"
        message="¿Eliminar este check-in de asistencia?"
        onConfirm={handleDeleteEdit}
        onClose={() => setConfirmDelete(false)}
      />

      {editLocationId != null && (
        <LocationManagerModal
          supabase={supabase}
          initialLocationId={editLocationId}
          onClose={() => setEditLocationId(null)}
          onSuccess={loadReport}
        />
      )}
    </div>
  );
}
