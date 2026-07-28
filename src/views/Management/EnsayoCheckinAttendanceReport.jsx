import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { useAuth } from "../../context/AuthContext";
import {
  IconChevronDown,
  IconDownload,
  IconFilter,
  IconLoader,
  IconMapPin,
  IconTrash,
} from "../../components/ui/Icons";
import MultiSelect from "../../components/ui/MultiSelect";
import DateInput from "../../components/ui/DateInput";
import TimeInput from "../../components/ui/TimeInput";
import ConfirmModal from "../../components/ui/ConfirmModal";
import LocationManagerModal from "../../components/locations/LocationManagerModal";
import {
  fetchEnsayoCheckinReportData,
  buildCheckinLookup,
  buildEnsambleMatrixSections,
  formatRegistradoHora,
  buildRegistradoAtArgentina,
  eventColumnLabel,
  isEnsambleSelectableForCheckinReport,
  checkinGoogleMapsUrl,
  checkinMapPinTitle,
  formatDistanciaSedeM,
  resolveCheckinDistanciaSedeM,
  checkinCellUiClass,
  isCheckinGeoLejos,
  ENSAYO_GEO_LEJOS_M,
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

function formatFilterDateLabel(iso) {
  if (!iso) return "";
  try {
    return format(parseISO(iso), "dd/MM/yy");
  } catch {
    return iso;
  }
}

function CheckinMapPin({
  checkin,
  evt,
  kind = "llegada",
  size = 11,
  className = "",
  showDistance = false,
}) {
  const url = checkinGoogleMapsUrl(checkin, kind);
  if (!url) return null;
  const distM = resolveCheckinDistanciaSedeM(checkin, evt, kind);
  const distLabel = formatDistanciaSedeM(distM);
  const lejos = isCheckinGeoLejos(checkin, evt, kind);
  const title = checkinMapPinTitle(checkin, evt, kind);
  return (
    <span className={`inline-flex items-center gap-0.5 ${className}`}>
      {showDistance && distLabel && (
        <span
          className={`text-[9px] font-semibold tabular-nums ${
            lejos ? "text-orange-600 font-black" : "text-slate-500"
          }`}
        >
          {distLabel}
        </span>
      )}
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        title={title}
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className={`inline-flex items-center justify-center rounded hover:bg-indigo-50 ${
          lejos
            ? "text-orange-600 hover:text-orange-800"
            : kind === "salida"
              ? "text-sky-600 hover:text-sky-800"
              : "text-indigo-600 hover:text-indigo-800"
        }`}
      >
        <IconMapPin size={size} />
      </a>
    </span>
  );
}

function LegendSwatch({ boxClass, label, title }) {
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] text-slate-600"
      title={title}
    >
      <span
        className={`inline-block h-2.5 w-2.5 shrink-0 rounded-sm border ${boxClass}`}
        aria-hidden
      />
      <span>{label}</span>
    </span>
  );
}

/** Menú de descarga (global o por ensamble). */
function CheckinExportMenu({
  ensambleId = null,
  ensambleLabel = null,
  exportBase,
  buttonClassName = "inline-flex items-center gap-1.5 rounded-lg border border-indigo-300 bg-white px-2.5 py-1 text-[11px] font-bold text-indigo-700 hover:bg-indigo-50",
  label = "Exportar",
  iconOnly = false,
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const run = async (kind, includeGeo) => {
    setOpen(false);
    const params = {
      ...exportBase,
      includeGeo,
      ...(ensambleId != null
        ? {
            ensambleId,
            ensambleLabels: [ensambleLabel].filter(Boolean),
          }
        : {}),
    };
    try {
      if (kind === "xlsx-mat") await downloadEnsayoCheckinMatrizExcel(params);
      else if (kind === "pdf-mat") downloadEnsayoCheckinMatrizPdf(params);
      else if (kind === "xlsx-pers")
        await downloadEnsayoCheckinPorPersonaExcel(params);
      else if (kind === "pdf-pers") downloadEnsayoCheckinPorPersonaPdf(params);
    } catch (e) {
      toast.error(e.message || "Error al exportar");
    }
  };

  const title = ensambleLabel
    ? `Descargar informe de ${ensambleLabel}`
    : "Descargar informes de asistencia";

  return (
    <div className="relative shrink-0" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={buttonClassName}
        title={title}
        aria-label={title}
        aria-expanded={open}
      >
        <IconDownload size={iconOnly ? 14 : 13} />
        {!iconOnly && (
          <>
            {label}
            <IconChevronDown
              size={12}
              className={`transition-transform ${open ? "rotate-180" : ""}`}
            />
          </>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-1 w-56 rounded-lg border border-slate-200 bg-white py-1 shadow-lg text-left normal-case tracking-normal">
          <p className="px-2.5 py-1 text-[9px] font-bold uppercase text-slate-400">
            Vista matriz
          </p>
          <button
            type="button"
            className="w-full px-2.5 py-1.5 text-left text-[11px] font-semibold text-slate-700 hover:bg-indigo-50"
            onClick={() => run("xlsx-mat", false)}
          >
            Excel — sin geolocalización
          </button>
          <button
            type="button"
            className="w-full px-2.5 py-1.5 text-left text-[11px] font-semibold text-slate-700 hover:bg-indigo-50"
            onClick={() => run("xlsx-mat", true)}
          >
            Excel — con geolocalización
          </button>
          <button
            type="button"
            className="w-full px-2.5 py-1.5 text-left text-[11px] font-semibold text-slate-700 hover:bg-indigo-50"
            onClick={() => run("pdf-mat", false)}
          >
            PDF — sin geolocalización
          </button>
          <button
            type="button"
            className="w-full px-2.5 py-1.5 text-left text-[11px] font-semibold text-slate-700 hover:bg-indigo-50"
            onClick={() => run("pdf-mat", true)}
          >
            PDF — con geolocalización
          </button>
          <div className="my-1 border-t border-slate-100" />
          <p className="px-2.5 py-1 text-[9px] font-bold uppercase text-slate-400">
            Lista por persona
          </p>
          <button
            type="button"
            className="w-full px-2.5 py-1.5 text-left text-[11px] font-semibold text-slate-700 hover:bg-indigo-50"
            onClick={() => run("xlsx-pers", false)}
          >
            Excel — sin geolocalización
          </button>
          <button
            type="button"
            className="w-full px-2.5 py-1.5 text-left text-[11px] font-semibold text-slate-700 hover:bg-indigo-50"
            onClick={() => run("xlsx-pers", true)}
          >
            Excel — con geolocalización
          </button>
          <button
            type="button"
            className="w-full px-2.5 py-1.5 text-left text-[11px] font-semibold text-slate-700 hover:bg-indigo-50"
            onClick={() => run("pdf-pers", false)}
          >
            PDF — sin geolocalización
          </button>
          <button
            type="button"
            className="w-full px-2.5 py-1.5 text-left text-[11px] font-semibold text-slate-700 hover:bg-indigo-50"
            onClick={() => run("pdf-pers", true)}
          >
            PDF — con geolocalización
          </button>
        </div>
      )}
    </div>
  );
}

function EnsambleExportMenu({ section, exportBase }) {
  return (
    <CheckinExportMenu
      ensambleId={section.ensambleId}
      ensambleLabel={section.ensamble.ensamble}
      exportBase={exportBase}
      iconOnly
      buttonClassName="inline-flex items-center justify-center rounded-md border border-indigo-300 bg-white p-1 text-indigo-700 hover:bg-indigo-50"
    />
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
  const [editSalidaTime, setEditSalidaTime] = useState("");
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
          .map((e) => ({ id: Number(e.id), label: e.ensamble })),
      );
    })();
  }, [supabase]);

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

  const selectAllEnsambles = () => {
    setSelectedEnsambleIds(ensamblesOptions.map((o) => Number(o.id)));
  };

  const clearAllEnsambles = () => {
    setSelectedEnsambleIds([]);
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

  const handleApplyFilters = async () => {
    await loadReport();
    setFiltersOpen(false);
  };

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
      setEditSalidaTime(formatRegistradoHora(existing.salida_at) || "");
      setEditNota(existing.nota_justificacion || "");
    } else if (existing) {
      setEditTipo("presencial");
      setEditTime(formatRegistradoHora(existing.registrado_at) || "09:00");
      setEditSalidaTime(formatRegistradoHora(existing.salida_at) || "");
      setEditNota("");
    } else {
      setEditTipo("presencial");
      setEditTime(evt.hora_inicio?.slice(0, 5) || "09:00");
      setEditSalidaTime(evt.hora_fin?.slice(0, 5) || "");
      setEditNota("");
    }
    setConfirmDelete(false);
  };

  const handleSaveEdit = async () => {
    if (!editCell || !user?.id) return;
    const salidaTrim = (editSalidaTime || "").trim();
    if (salidaTrim && editTime && salidaTrim < editTime.slice(0, 5)) {
      toast.error("La hora de salida no puede ser anterior a la de llegada");
      return;
    }
    setSaving(true);
    try {
      const { evt, person } = editCell;
      const registradoAt = buildRegistradoAtArgentina(evt.fecha, editTime);
      const salidaAt = salidaTrim
        ? buildRegistradoAtArgentina(evt.fecha, salidaTrim)
        : null;
      await ensayoCheckinAdminUpsert({
        eventoId: evt.id,
        integranteId: person.id,
        registradoAt,
        salidaAt,
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

  const renderCheckinCell = (evt, p, field) => {
    const chk = checkinMap.get(`${evt.id}-${p.id}`);
    const iso = field === "salida" ? chk?.salida_at : chk?.registrado_at;
    const hora = iso ? formatRegistradoHora(iso) : "";
    const mapsUrl = checkinGoogleMapsUrl(chk, field);
    const distM = resolveCheckinDistanciaSedeM(chk, evt, field);
    const distLabel = formatDistanciaSedeM(distM);
    const lejos = isCheckinGeoLejos(chk, evt, field);
    const emptyHint = field === "llegada" ? "+" : "·";
    return (
      <td key={`${evt.id}-${field}`} className="border p-0.5 text-center">
        <div className="relative min-h-[28px]">
          <button
            type="button"
            disabled={!canEdit}
            onClick={() => openEdit(evt, p, chk)}
            className={`w-full min-h-[28px] rounded border text-[10px] font-bold tabular-nums ${checkinCellUiClass(chk, evt, field)} ${canEdit ? "cursor-pointer hover:ring-1 hover:ring-indigo-300" : "cursor-default"} ${mapsUrl ? "pr-3 pb-2.5" : ""}`}
            title={
              chk?.justificado
                ? "Justificado"
                : chk?.editado_por_admin
                  ? "Editado por admin"
                  : chk
                    ? checkinMapPinTitle(chk, evt, field) ||
                      (field === "llegada" ? "Check-in app" : "Salida")
                    : canEdit
                      ? "Cargar asistencia"
                      : ""
            }
          >
            {hora || (canEdit ? emptyHint : "")}
          </button>
          {mapsUrl && (
            <div className="absolute bottom-0 right-0 left-0 flex items-center justify-end gap-0.5 px-0.5 pointer-events-none">
              {distLabel && (
                <span
                  className={`text-[7px] font-bold tabular-nums leading-none ${
                    lejos ? "text-orange-600" : "text-slate-500"
                  }`}
                >
                  {distLabel}
                </span>
              )}
              <CheckinMapPin
                checkin={chk}
                evt={evt}
                kind={field}
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
    <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
      <div className="shrink-0 space-y-2">
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-1.5">
          <button
            type="button"
            onClick={() => setFiltersOpen((v) => !v)}
            className={`inline-flex h-9 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-bold transition-colors ${
              filtersOpen
                ? "border-indigo-400 bg-indigo-100 text-indigo-800"
                : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            }`}
            aria-expanded={filtersOpen}
            aria-label={filtersOpen ? "Ocultar filtros" : "Mostrar filtros"}
          >
            <IconFilter size={16} />
            Filtros
            <IconChevronDown
              size={14}
              className={`transition-transform ${filtersOpen ? "rotate-180" : ""}`}
            />
          </button>
          <span className="min-w-0 flex-1 truncate text-xs font-semibold text-slate-600">
            {filterSummary}
          </span>
        </div>

        {filtersOpen && (
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <p className="mb-2 text-xs font-black uppercase tracking-wider text-slate-500">
                  Rango de fechas
                </p>
                <div className="mb-3 inline-flex flex-wrap gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
                  {ENSAYO_CHECKIN_DATE_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => applyDatePreset(preset.id)}
                      className={`rounded-md px-2.5 py-1.5 text-xs font-bold transition-colors ${
                        activeDatePreset === preset.id
                          ? "bg-white text-indigo-800 shadow-sm ring-1 ring-slate-200/80"
                          : "text-slate-600 hover:bg-white/80"
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                  <div className="min-w-0 flex-1">
                    <label className="mb-0.5 block text-[10px] font-bold uppercase text-slate-400">
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
                      className="!pl-2 border border-slate-300 bg-white rounded-lg text-sm py-2 pr-2 min-h-[2.25rem]"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <label className="mb-0.5 block text-[10px] font-bold uppercase text-slate-400">
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
                      className="!pl-2 border border-slate-300 bg-white rounded-lg text-sm py-2 pr-2 min-h-[2.25rem]"
                    />
                  </div>
                </div>
              </div>

              <div>
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-black uppercase tracking-wider text-slate-500">
                    Ensambles
                  </p>
                  <div className="flex items-center gap-2 text-[11px] font-bold">
                    <button
                      type="button"
                      onClick={selectAllEnsambles}
                      className="text-indigo-600 hover:underline"
                    >
                      Seleccionar todos
                    </button>
                    <span className="text-slate-300">·</span>
                    <button
                      type="button"
                      onClick={clearAllEnsambles}
                      className="text-slate-500 hover:underline"
                    >
                      Ninguno
                    </button>
                  </div>
                </div>
                <MultiSelect
                  label={null}
                  options={ensamblesOptions}
                  selectedIds={selectedEnsambleIds}
                  onChange={(ids) =>
                    setSelectedEnsambleIds(ids.map((id) => Number(id)))
                  }
                  showChips={false}
                  placeholder="Seleccionar ensambles…"
                />
                <p className="mt-1.5 text-[10px] text-slate-400">
                  {selectedEnsambleIds.length} de {ensamblesOptions.length}{" "}
                  seleccionado(s)
                </p>
              </div>
            </div>

            <div className="mt-4 flex justify-end border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={handleApplyFilters}
                disabled={loading}
                className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-black text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <IconLoader size={16} className="mr-2 animate-spin" />
                    Cargando…
                  </>
                ) : (
                  "Aplicar y cargar"
                )}
              </button>
            </div>
          </div>
        )}

        {events.length > 0 && (
          <div className="flex flex-wrap gap-x-2 gap-y-1.5 items-center text-[10px] text-slate-500 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5">
            <div className="inline-flex rounded border border-slate-200 p-px font-bold shrink-0">
              <button
                type="button"
                className={`px-2 py-0.5 rounded-sm text-[10px] ${viewMode === "matriz" ? "bg-indigo-600 text-white" : "text-slate-600"}`}
                onClick={() => setViewMode("matriz")}
              >
                Matriz
              </button>
              <button
                type="button"
                className={`px-2 py-0.5 rounded-sm text-[10px] ${viewMode === "lista" ? "bg-indigo-600 text-white" : "text-slate-600"}`}
                onClick={() => setViewMode("lista")}
              >
                Lista
              </button>
            </div>
            <span className="hidden sm:inline text-slate-300">|</span>
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
              <LegendSwatch
                boxClass="bg-amber-100 border-amber-400"
                label="Admin"
                title="Carga o corrección presencial por administración"
              />
              <LegendSwatch
                boxClass="bg-violet-100 border-violet-400"
                label="Justificado"
                title="Ausencia justificada (sin presencia física)"
              />
              <LegendSwatch
                boxClass="bg-yellow-100 border-yellow-400"
                label="Tarde hasta 10 min"
                title="Llegada hasta 10 minutos después de la hora de inicio"
              />
              <LegendSwatch
                boxClass="bg-orange-100 border-orange-400"
                label="Tarde hasta 15 min"
                title="Llegada entre 11 y 15 minutos tarde"
              />
              <LegendSwatch
                boxClass="bg-red-100 border-red-400"
                label="Tarde más de 15 min"
                title="Llegada más de 15 minutos después del inicio"
              />
              <span
                className="inline-flex items-center gap-1 text-[10px] text-slate-600"
                title={`Ubicación GPS · naranja si distancia a la sede > ${ENSAYO_GEO_LEJOS_M} m`}
              >
                <IconMapPin size={11} className="text-indigo-600" />
                Llegada
                <IconMapPin size={11} className="text-sky-600" />
                Salida
                <IconMapPin size={11} className="text-orange-600" />
                &gt;{ENSAYO_GEO_LEJOS_M} m
              </span>
            </div>
            <span className="ml-auto" />
            <CheckinExportMenu exportBase={exportBase} label="Exportar" />
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
              : "No hay ensayos con estos filtros. Abrí Filtros, ajustá fechas o ensambles y aplicá."}
          </p>
        )}
        {!loading && events.length > 0 && viewMode === "matriz" && (
          <div
            className="grid gap-3 p-3 items-start"
            style={{
              gridTemplateColumns:
                "repeat(auto-fit, minmax(min(100%, 26rem), 1fr))",
            }}
          >
            {matrixSections.length === 0 ? (
              <p className="col-span-full text-sm text-slate-400 text-center py-6">
                No hay ensayos o integrantes para los ensambles seleccionados.
              </p>
            ) : (
              matrixSections.map((section) => (
                <section
                  key={section.ensambleId}
                  className={`rounded-lg border border-indigo-100 overflow-hidden min-w-0 ${
                    section.events.length >= 3 ? "col-span-full" : ""
                  }`}
                >
                  <div className="bg-indigo-100 border-b border-indigo-200 px-3 py-2 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="text-sm font-black text-indigo-900 uppercase tracking-wide">
                        {section.ensamble.ensamble}
                      </h3>
                      <p className="text-[10px] text-indigo-700/80">
                        {section.events.length} ensayo(s) ·{" "}
                        {section.integrantes.length} integrante(s)
                      </p>
                    </div>
                    <EnsambleExportMenu
                      section={section}
                      exportBase={exportBase}
                    />
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full table-fixed text-xs border-collapse">
                      <colgroup>
                        <col className="w-[11.5rem]" style={{ width: "11.5rem" }} />
                        <col className="w-[6.5rem]" style={{ width: "6.5rem" }} />
                        {section.events.map((evt) => (
                          <React.Fragment key={`${evt.id}-cols`}>
                            <col />
                            <col />
                          </React.Fragment>
                        ))}
                      </colgroup>
                      <thead className="bg-slate-100">
                        <tr>
                          <th
                            rowSpan={2}
                            className="sticky left-0 z-10 bg-slate-100 border p-2 text-left"
                          >
                            Integrante
                          </th>
                          <th
                            rowSpan={2}
                            className="border p-2 text-left bg-slate-100"
                          >
                            Instrumento
                          </th>
                          {section.events.map((evt) => (
                            <th
                              key={evt.id}
                              colSpan={2}
                              className="border p-0.5 text-center font-bold text-[10px] align-bottom"
                            >
                              {renderEventColumnHeader(evt)}
                            </th>
                          ))}
                        </tr>
                        <tr>
                          {section.events.map((evt) => (
                            <React.Fragment key={`${evt.id}-sub`}>
                              <th className="border px-0.5 py-0.5 text-[8px] font-bold text-slate-500 uppercase tracking-tight">
                                Lleg.
                              </th>
                              <th className="border px-0.5 py-0.5 text-[8px] font-bold text-slate-500 uppercase tracking-tight">
                                Sal.
                              </th>
                            </React.Fragment>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {section.integrantes.map((p) => (
                          <tr key={p.id} className="hover:bg-slate-50">
                            <td
                              className="sticky left-0 z-10 bg-white border p-2 font-medium truncate"
                              title={`${p.apellido}, ${p.nombre}`}
                            >
                              {p.apellido}, {p.nombre}
                            </td>
                            <td
                              className="border p-2 text-slate-500 text-[10px] truncate"
                              title={p.instrumento || ""}
                            >
                              {p.instrumento}
                            </td>
                            {section.events.flatMap((evt) => [
                              renderCheckinCell(evt, p, "llegada"),
                              renderCheckinCell(evt, p, "salida"),
                            ])}
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
                  <div className="bg-indigo-100 border-b border-indigo-200 px-3 py-2 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="text-sm font-black text-indigo-900 uppercase tracking-wide">
                        {section.ensamble.ensamble}
                      </h3>
                      <p className="text-[10px] text-indigo-700/80">
                        {section.events.length} ensayo(s)
                      </p>
                    </div>
                    <EnsambleExportMenu
                      section={section}
                      exportBase={exportBase}
                    />
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="p-2 text-left">Integrante</th>
                          <th className="p-2 text-left">Ensayo</th>
                          <th className="p-2">Hora</th>
                          <th className="p-2">Llegada</th>
                          <th className="p-2">Salida</th>
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
                                      className={`font-mono font-bold px-2 py-0.5 rounded border text-xs ${checkinCellUiClass(chk, evt, "llegada")}`}
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
                                      kind="llegada"
                                      size={14}
                                      showDistance
                                    />
                                  </div>
                                </td>
                                <td className="p-2 text-center">
                                  <div className="inline-flex items-center gap-1">
                                    <button
                                      type="button"
                                      disabled={!canEdit}
                                      onClick={() => openEdit(evt, p, chk)}
                                      className={`font-mono font-bold px-2 py-0.5 rounded border text-xs ${checkinCellUiClass(chk, evt, "salida")}`}
                                    >
                                      {chk?.salida_at
                                        ? formatRegistradoHora(chk.salida_at)
                                        : canEdit
                                          ? "·"
                                          : ""}
                                    </button>
                                    <CheckinMapPin
                                      checkin={chk}
                                      evt={evt}
                                      kind="salida"
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
            {editCell.existing &&
              (checkinGoogleMapsUrl(editCell.existing, "llegada") ||
                checkinGoogleMapsUrl(editCell.existing, "salida")) && (
              <div className="space-y-2">
                {checkinGoogleMapsUrl(editCell.existing, "llegada") && (
                  <div className="space-y-0.5">
                    <a
                      href={checkinGoogleMapsUrl(editCell.existing, "llegada")}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm font-bold text-indigo-600 hover:text-indigo-800 hover:underline"
                    >
                      <IconMapPin size={16} />
                      Ubicación de llegada
                    </a>
                    {formatDistanciaSedeM(
                      resolveCheckinDistanciaSedeM(
                        editCell.existing,
                        editCell.evt,
                        "llegada",
                      ),
                    ) && (
                      <p className="text-xs text-slate-500">
                        Aprox.{" "}
                        {formatDistanciaSedeM(
                          resolveCheckinDistanciaSedeM(
                            editCell.existing,
                            editCell.evt,
                            "llegada",
                          ),
                        )}{" "}
                        de {editCell.evt.locaciones?.nombre || "la sede"}
                      </p>
                    )}
                  </div>
                )}
                {checkinGoogleMapsUrl(editCell.existing, "salida") && (
                  <div className="space-y-0.5">
                    <a
                      href={checkinGoogleMapsUrl(editCell.existing, "salida")}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm font-bold text-sky-600 hover:text-sky-800 hover:underline"
                    >
                      <IconMapPin size={16} />
                      Ubicación de salida
                    </a>
                    {formatDistanciaSedeM(
                      resolveCheckinDistanciaSedeM(
                        editCell.existing,
                        editCell.evt,
                        "salida",
                      ),
                    ) && (
                      <p className="text-xs text-slate-500">
                        Aprox.{" "}
                        {formatDistanciaSedeM(
                          resolveCheckinDistanciaSedeM(
                            editCell.existing,
                            editCell.evt,
                            "salida",
                          ),
                        )}{" "}
                        de {editCell.evt.locaciones?.nombre || "la sede"}
                      </p>
                    )}
                  </div>
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
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase">
                Hora de salida (opcional)
              </label>
              <TimeInput
                value={editSalidaTime}
                onChange={setEditSalidaTime}
              />
              {editSalidaTime ? (
                <button
                  type="button"
                  className="mt-1 text-[11px] text-slate-500 underline"
                  onClick={() => setEditSalidaTime("")}
                >
                  Quitar salida
                </button>
              ) : null}
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
