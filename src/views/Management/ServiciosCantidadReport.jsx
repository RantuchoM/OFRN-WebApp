import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import DateInput from "../../components/ui/DateInput";
import {
  IconAlertTriangle,
  IconCalculator,
  IconChevronDown,
  IconClipboard,
  IconClock,
  IconDownload,
  IconFileExcel,
  IconFiles,
  IconFileText,
  IconMusic,
  IconRefresh,
  IconSearch,
  IconX,
} from "../../components/ui/Icons";
import {
  fetchAsistenciaMatrixBaseData,
  TIPOS_PROGRAMA_ASISTENCIA_MATRIZ,
} from "../../services/giraService";
import {
  buildServiciosComputeContext,
  downloadServiciosCantidadDetalleLotePdf,
  downloadServiciosCantidadDetallePdf,
  downloadServiciosCantidadExcel,
  downloadServiciosCantidadPdf,
  fetchEnsambleServiciosBundle,
  fetchEnsayosConflictoPeriod,
  fetchIntegranteGrupoIdsByGiraId,
  fetchPrestacionesGirasMeta,
  fetchServiciosCantidadPeriod,
  formatServicioEventSubtitle,
  giraOptionLabel,
  resolveRostersForPrograms,
} from "../../services/serviciosCantidadService";
import { buildAsistenciaMatrixRowGroups } from "../../utils/asistenciaMatrixExport";
import { saveBlobFile } from "../../utils/downloadBlob";
import PrestacionesProyeccionSandbox from "../../components/management/PrestacionesProyeccionSandbox";
import EnsambleServiciosModal from "./EnsambleServiciosModal";
import EnsayosConflictoModal from "./EnsayosConflictoModal";
import { resolveGiraServiciosEstimate } from "../../utils/giraProyeccionPcv";
import {
  CONVOCATORIA_ENSAMBLE_VIEW_MODES,
  CONVOCATORIA_VIEW_SECTION_TITLES,
  SIN_REGION_LABEL,
  filterEnsamblesForConvocatoriaView,
  groupRegionalEnsamblesByRegion,
  isCamerataEnsambleRow,
} from "../../utils/convocatoriaEnsambleViews";
import {
  formatDdMmYyyy,
  formatWeekdayLongLocal,
} from "../../utils/dates";
import { programOverlapsDateRange, toLocalDateString } from "../../utils/giraDateRange";
import { compareInstrumentIds } from "../../utils/giraUtils";
import {
  currentYearBounds,
  isIntegranteConvocadoToEnsayo,
  isProgramBorrador,
} from "../../utils/girasYearSummary";
import { integranteKey } from "../../utils/integranteIds";
import { matchesMultiTokenSearch } from "../../utils/sanitize";
import {
  buildEnsambleServiciosReport,
  listEnsamblesForServiciosReport,
} from "../../utils/serviciosEnsambleReport";
import { downloadEnsambleServiciosTodosPdf } from "../../utils/serviciosEnsamblePdf";
import {
  attachConflictoToDetalleHits,
  buildEnsayosConflictoGroups,
  groupsWithFullConflicto,
  pendingFullConflictoEventIdSet,
} from "../../utils/serviciosEnsayosConflicto";
import {
  ENSAYO_COLUMN_VIEWS,
  FIXED_FUTURE_GIRA_SERVICIOS,
  SERVICIO_POR_MES_COLUMN,
  accumulateServiciosForIntegrante,
  bucketTotal,
  computeServiciosPorMes,
  formatEventDurationLabel,
  formatGiraAveragePlain,
  formatServicioNumber,
  formatServicioParts,
  formatServiciosPorMesPlain,
  customMapForIntegrante,
  getFixedGiraServiciosAverage,
  groupHitsByDetailSection,
  listEstimableGiras,
  listServicioHitsForIntegrante,
  splitServicioListingColumns,
  sumBuckets,
} from "../../utils/serviciosCantidad";
import { buildPrestacionesMetaByIntegranteId } from "../../utils/serviciosPcv";

function createEmptySelectionByMode() {
  return {
    ensambles: new Set(),
    cameratas: new Set(),
    regiones: new Set(),
  };
}

/** Año calendario siguiente completo (proyección de planificación). */
function yearDefaultRange() {
  const b = currentYearBounds();
  const y = b.year + 1;
  return { fechaDesde: `${y}-01-01`, fechaHasta: `${y}-12-31` };
}

/** Misma ordenación que Gestión → Convocatorias. */
function sortIntegrantesByInstrument(integrantes) {
  return [...integrantes].sort((a, b) => {
    const cmp = compareInstrumentIds(a.id_instr, b.id_instr);
    if (cmp !== 0) return cmp;
    const na = `${a.apellido || ""} ${a.nombre || ""}`.trim();
    const nb = `${b.apellido || ""} ${b.nombre || ""}`.trim();
    return na.localeCompare(nb, "es");
  });
}

function EnsayosViewToggle({ view, onChange }) {
  const option = (id, label, title) => (
    <button
      type="button"
      onClick={() => onChange(id)}
      className={`px-1.5 py-0.5 text-[10px] font-bold normal-case tracking-normal ${
        view === id
          ? "bg-emerald-700 text-white"
          : "bg-white text-slate-600 hover:bg-emerald-50"
      }`}
      title={title}
      aria-pressed={view === id}
    >
      {label}
    </button>
  );
  return (
    <div
      className="inline-flex overflow-hidden rounded border border-emerald-300"
      role="group"
      aria-label="Cómo ver las columnas de ensayos"
    >
      {option(
        ENSAYO_COLUMN_VIEWS.origen,
        "Ensamble / gira",
        "Ensayos de ensamble y ensayos de gira",
      )}
      {option(
        ENSAYO_COLUMN_VIEWS.duracion,
        "Duración",
        "Ensayos de 2 h o más, y de menos de 2 h",
      )}
      
    </div>
  );
}

function ServicioPorMesCell({ totalServicios, integrante, range }) {
  const { months, rate } = computeServiciosPorMes(
    totalServicios,
    integrante,
    range,
  );
  if (rate == null) {
    return (
      <span className="inline-flex min-h-[1.35rem] min-w-[1.75rem] items-center justify-end px-1.5 text-slate-300">
        —
      </span>
    );
  }
  return (
    <span
      className={`inline-flex min-h-[1.35rem] items-baseline justify-end gap-0.5 rounded-md px-1.5 py-0.5 tabular-nums ${SERVICIO_POR_MES_COLUMN.chipClass}`}
      title={`${months} mes${months === 1 ? "" : "es"} feb–dic`}
    >
      <span className="font-semibold">{formatServicioNumber(rate)}</span>
      <span className="text-[9px] font-normal opacity-70">({months})</span>
    </span>
  );
}

function ServicioCellValue({ bucket, chipClass, emphasize }) {
  const parts = formatServicioParts(bucket);
  const isEmpty = parts.length === 1 && parts[0].text === "—";
  return (
    <span
      className={`inline-flex min-h-[1.35rem] min-w-[1.75rem] items-baseline justify-end gap-0 rounded-md px-1.5 py-0.5 tabular-nums ${
        isEmpty
          ? "text-slate-300"
          : emphasize
            ? "bg-slate-100 font-semibold text-slate-800"
            : chipClass || "bg-slate-50 text-slate-800"
      }`}
    >
      {parts.map((p, i) => (
        <span
          key={`${p.tone}-${i}`}
          className={
            p.tone === "reemplazo"
              ? "font-semibold text-sky-600"
              : p.tone === "licencia"
                ? "font-semibold text-amber-600"
                : ""
          }
        >
          {p.text}
        </span>
      ))}
    </span>
  );
}

function conflictoRowClass(tone) {
  if (tone === "pending") return "border-l-4 border-amber-500 bg-amber-50";
  if (tone === "kept") return "border-l-4 border-emerald-500 bg-emerald-50";
  if (tone === "partial") return "border-l-4 border-sky-400 bg-sky-50";
  if (tone === "resolved") return "border-l-4 border-slate-300 bg-slate-50";
  return "";
}

function conflictoBadgeClass(tone) {
  if (tone === "pending") return "bg-amber-100 text-amber-900";
  if (tone === "kept") return "bg-emerald-100 text-emerald-900";
  if (tone === "partial") return "bg-sky-100 text-sky-900";
  return "bg-slate-200 text-slate-700";
}

function durationBandLabel(hit) {
  if (hit.origin === "estimado") return "est.";
  if (hit.durationBand === "ge2h") return "≥2h · 1";
  if (hit.durationBand === "lt2h") return "<2h · ½";
  if (hit.kind === "didactico") return "½";
  if (hit.kind === "concierto") return "1";
  return formatServicioNumber(hit.value);
}

function markBadge(mark) {
  if (mark === "reemplazo") {
    return (
      <span className="rounded bg-sky-100 px-1 py-px text-[10px] font-bold uppercase text-sky-700">
        R
      </span>
    );
  }
  if (mark === "licencia") {
    return (
      <span className="rounded bg-amber-100 px-1 py-px text-[10px] font-bold uppercase text-amber-800">
        L
      </span>
    );
  }
  return null;
}

function exportMenuPosition(el) {
  const width = 240;
  const height = 168;
  if (!el) return { top: 8, left: 8, width };
  const r = el.getBoundingClientRect();
  const left = Math.min(
    Math.max(8, r.right - width),
    Math.max(8, window.innerWidth - width - 8),
  );
  const below = r.bottom + 4;
  const top =
    below + height > window.innerHeight - 8 && r.top > height + 8
      ? Math.max(8, r.top - height - 4)
      : below;
  return { top, left, width };
}

function ServiciosExportMenu({ disabled, onPdf, onPdfDetalle, onExcel }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      const target = e.target;
      if (rootRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const run = (fn) => {
    setOpen(false);
    fn?.();
  };

  const itemClass =
    "flex min-h-11 w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-semibold text-slate-700 hover:bg-orange-50";

  return (
    <div className="relative shrink-0" ref={rootRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex min-h-10 items-center gap-1 rounded-md border border-emerald-700 bg-emerald-600 px-3 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
        title="Exportar listado o detalle"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <IconDownload size={14} />
        Exportar
        <IconChevronDown
          size={12}
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={menuRef}
            className="fixed z-[100] overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl"
            role="menu"
            style={exportMenuPosition(rootRef.current)}
          >
            <button
              type="button"
              role="menuitem"
              className={itemClass}
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                run(onPdf);
              }}
            >
              <IconFileText size={16} className="text-slate-400" />
              PDF listado
            </button>
            <button
              type="button"
              role="menuitem"
              className={itemClass}
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                run(onPdfDetalle);
              }}
            >
              <IconFiles size={16} className="text-slate-400" />
              PDF detalle (lote)
            </button>
            <button
              type="button"
              role="menuitem"
              className={itemClass}
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                run(onExcel);
              }}
            >
              <IconFileExcel size={16} className="text-slate-400" />
              Excel
            </button>
          </div>,
          document.body,
        )}
    </div>
  );
}

function PrestChip({ label, value, className }) {
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-semibold ${className}`}
    >
      <span>{label}</span>
      <span className="inline-flex items-center rounded-md bg-white/70 px-1.5 py-0.5 text-base font-bold tabular-nums leading-none">
        {value}
      </span>
    </div>
  );
}

/** Resumen alineado a las columnas del listado (Fuera / En casa / Ensayos / PCV / Total). */
function PrestacionesDetalleResumen({
  buckets,
  meta,
  integrante,
  fechaDesde,
  fechaHasta,
  ensayoColumnView,
}) {
  const total = formatServicioNumber(bucketTotal(buckets?.total));
  const porMes = formatServiciosPorMesPlain(
    bucketTotal(buckets?.total),
    integrante,
    { fechaDesde, fechaHasta },
  );
  const fueraParts = formatServicioParts(buckets?.giras_fuera);
  const enCasaParts = formatServicioParts(buckets?.giras_casa);
  const fuera = fueraParts.map((p) => p.text).join("") || "—";
  const enCasa = enCasaParts.map((p) => p.text).join("") || "—";
  const concEns = formatServicioNumber(
    bucketTotal(buckets?.conciertos_ensamble),
  );
  const prestConc = formatServicioNumber(
    bucketTotal(buckets?.conciertos_prest),
  );
  const pcv = formatServicioNumber(bucketTotal(buckets?.pcv));
  const ensam =
    ensayoColumnView === ENSAYO_COLUMN_VIEWS.origen
      ? formatServicioNumber(bucketTotal(buckets?.ensamble))
      : formatServicioNumber(bucketTotal(buckets?.ensayo_ge2h));
  const giraOrLt =
    ensayoColumnView === ENSAYO_COLUMN_VIEWS.origen
      ? formatServicioNumber(bucketTotal(buckets?.gira))
      : formatServicioNumber(bucketTotal(buckets?.ensayo_lt2h));
  const ensamLabel =
    ensayoColumnView === ENSAYO_COLUMN_VIEWS.origen ? "Ensam." : "≥2h";
  const giraLabel =
    ensayoColumnView === ENSAYO_COLUMN_VIEWS.origen ? "Gira" : "<2h";

  return (
    <section
      className="rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-sm"
      aria-label="Resumen alineado al listado"
    >
      <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
        Mismos números que el listado
      </h3>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <PrestChip
          label="Fuera"
          value={fuera}
          className="border-orange-200 bg-orange-50 text-orange-900"
        />
        <PrestChip
          label="En casa"
          value={enCasa}
          className="border-sky-200 bg-sky-50 text-sky-900"
        />
        <PrestChip
          label="Conc.ens."
          value={concEns}
          className="border-violet-200 bg-violet-50 text-violet-900"
        />
        <PrestChip
          label="Prest.conc."
          value={prestConc}
          className="border-rose-200 bg-rose-50 text-rose-950"
        />
        <PrestChip
          label={ensamLabel}
          value={ensam}
          className="border-emerald-200 bg-emerald-50 text-emerald-900"
        />
        <PrestChip
          label={giraLabel}
          value={giraOrLt}
          className="border-emerald-200 bg-emerald-50 text-emerald-900"
        />
        <PrestChip
          label="PCV"
          value={pcv}
          className="border-teal-200 bg-teal-50 text-teal-900"
        />
        <PrestChip
          label="Total"
          value={total}
          className="border-indigo-100 bg-indigo-50 text-indigo-900"
        />
        <PrestChip
          label="Prest/mes"
          value={porMes}
          className="border-orange-200 bg-orange-50 text-orange-900"
        />
      </div>
      <p className="text-[10px] leading-snug text-slate-500">
        Fuera / En casa = giras (pesos por tramo) y entre paréntesis cantidad de
        conciertos (incl. didácticos). Conc.ens. = conciertos de programas
        Ensamble. Prest.conc. = suma de prestaciones de conciertos. Total =
        conciertos + ensayos + PCV.
        {meta?.homeLabel
          ? ` Localidad viáticos: ${meta.homeLabel}.`
          : ""}
      </p>
    </section>
  );
}

function DetalleCollapse({
  id,
  openKeys,
  toggle,
  title,
  summary,
  headerClass = "bg-slate-50 hover:bg-slate-100",
  children,
}) {
  const open = openKeys.has(id);
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200">
      <button
        type="button"
        onClick={() => toggle(id)}
        className={`flex w-full items-center gap-2 px-3 py-2 text-left ${headerClass}`}
        aria-expanded={open}
      >
        <IconChevronDown
          size={16}
          className={`shrink-0 text-slate-400 transition-transform ${
            open ? "rotate-0" : "-rotate-90"
          }`}
        />
        <span className="flex-1 text-sm font-bold text-slate-800">{title}</span>
        <span className="shrink-0 text-right text-xs font-semibold tabular-nums text-slate-600">
          {summary}
        </span>
      </button>
      {open ? children : null}
    </div>
  );
}

/** "miércoles, 01/04/2026 03:10" */
function formatPcvInstant(fecha, hora) {
  const datePart = formatDdMmYyyy(fecha) || String(fecha || "").slice(0, 10);
  const weekday = formatWeekdayLongLocal(
    typeof fecha === "string" ? fecha.slice(0, 10) : "",
  );
  const time = hora ? String(hora).slice(0, 5) : "";
  const head = [weekday, datePart].filter(Boolean).join(", ");
  if (!head) return time || "—";
  return time ? `${head} ${time}` : head;
}

function formatPcvWindowLine(w) {
  const locs = String(w?.localidades || "").trim() || "Sin localidad";
  const from = formatPcvInstant(w?.fecha_salida, w?.hora_salida);
  const to = formatPcvInstant(w?.fecha_llegada, w?.hora_llegada);
  return `${locs} · ${from} → ${to}`;
}

function EnsayosSectionSummary({ ensayosCount, prestaciones }) {
  const n = Number(ensayosCount) || 0;
  const prestNum = Number(prestaciones) || 0;
  const m = formatServicioNumber(prestNum);
  return (
    <span className="block leading-tight">
      <span className="block">
        {n} ensayo{n === 1 ? "" : "s"}
      </span>
      <span className="block text-emerald-800">
        {m} prestación{prestNum === 1 ? "" : "es"}
      </span>
    </span>
  );
}

function ServicioDetalleModal({
  integrante,
  hits,
  buckets,
  meta,
  fechaDesde,
  fechaHasta,
  ensambleById,
  programaById,
  ensayoColumnView,
  estimateNote,
  onExportPdf,
  onClose,
}) {
  const [openKeys, setOpenKeys] = useState(
    () => new Set(["giras", "pcv", "ensamble", "gira"]),
  );
  const sections = useMemo(() => groupHitsByDetailSection(hits), [hits]);
  const name = `${integrante?.apellido || ""}, ${integrante?.nombre || ""}`.trim();
  const inst =
    integrante?.instrumentos?.instrumento ||
    integrante?.instrumentos?.abreviatura ||
    "—";
  const familia = integrante?.instrumentos?.familia || "";
  const girasDetalle = meta?.girasDetalle || [];
  const pcvDetalle = meta?.pcvDetalle || [];

  const toggle = (key) => {
    setOpenKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const eventSubtitle = (evt) =>
    formatServicioEventSubtitle(evt, ensambleById, programaById);

  const ensayoSections = sections.filter(
    (s) => s.key === "ensamble" || s.key === "gira",
  );

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="servicios-detalle-title"
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 bg-orange-50 px-4 py-3">
          <div className="min-w-0">
            <h3
              id="servicios-detalle-title"
              className="truncate text-base font-bold text-slate-900"
            >
              {name || `Integrante ${integrante?.id}`}
            </h3>
            <p className="truncate text-xs text-slate-500">
              {inst}
              {familia ? ` · ${familia}` : ""}
              {integrante?.id != null ? ` · ID ${integrante.id}` : ""}
            </p>
            {estimateNote ? (
              <p className="mt-0.5 truncate text-[10px] text-orange-800">
                {estimateNote}
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={onExportPdf}
              className="inline-flex items-center gap-1 rounded-md border border-orange-200 bg-white px-2 py-1 text-[11px] font-bold text-slate-600 hover:border-orange-300"
              title="Descargar PDF de esta persona"
            >
              <IconFileText size={14} />
              PDF
            </button>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-md p-1 text-slate-400 hover:bg-white hover:text-slate-700"
              aria-label="Cerrar"
            >
              <IconX size={20} />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="border-b border-slate-100 bg-white px-3 py-2">
            <PrestacionesDetalleResumen
              buckets={buckets}
              meta={meta}
              integrante={integrante}
              fechaDesde={fechaDesde}
              fechaHasta={fechaHasta}
              ensayoColumnView={ensayoColumnView}
            />
          </div>

          <div className="space-y-2 p-3">
            <DetalleCollapse
              id="giras"
              openKeys={openKeys}
              toggle={toggle}
              title="Giras (Sinfónico / CF / Jazz Band)"
              summary={`${girasDetalle.length} · fuera ${formatServicioNumber(meta?.girasFuera)} · en casa ${formatServicioNumber(meta?.girasEnCasa)}`}
              headerClass="bg-orange-50/80 hover:bg-orange-50"
            >
              {girasDetalle.length === 0 ? (
                <p className="px-3 py-2 text-xs text-slate-400">
                  Ninguna gira Sinfónico/CF/Jazz Band en nómina en el rango. Los
                  programas tipo Ensamble no cuentan en Fuera / En casa.
                </p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {girasDetalle.map((g) => (
                    <li
                      key={g.programId}
                      className="flex items-start gap-2 px-3 py-2"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-slate-800">
                          {g.zona ? `${g.zona} · ` : ""}
                          {g.label}
                        </div>
                        <p className="mt-0.5 text-[11px] text-slate-500">
                          {g.tipo}
                          {g.fechaDesde
                            ? ` · ${formatDdMmYyyy(g.fechaDesde) || g.fechaDesde}`
                            : ""}
                          {g.fechaHasta && g.fechaHasta !== g.fechaDesde
                            ? ` – ${formatDdMmYyyy(g.fechaHasta) || g.fechaHasta}`
                            : ""}
                          {g.tramoCount > 1
                            ? ` · ${g.tramosFuera}/${g.tramoCount} tramos fuera`
                            : ""}
                        </p>
                      </div>
                      <div className="shrink-0 text-right text-[11px] tabular-nums">
                        {g.pesoFuera > 0 ? (
                          <div className="font-semibold text-orange-800">
                            Fuera {formatServicioNumber(g.pesoFuera)}
                          </div>
                        ) : null}
                        {g.pesoEnCasa > 0 ? (
                          <div className="font-semibold text-sky-800">
                            En casa {formatServicioNumber(g.pesoEnCasa)}
                          </div>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </DetalleCollapse>

            <DetalleCollapse
              id="pcv"
              openKeys={openKeys}
              toggle={toggle}
              title="PCV — Prestaciones Complementarias por Viáticos"
              summary={formatServicioNumber(meta?.pcv)}
              headerClass="bg-teal-50/80 hover:bg-teal-50"
            >
              <p className="border-b border-teal-100 px-3 py-2 text-[11px] leading-snug text-teal-900/80">
                Días computables (misma tabla de horarios que Viáticos: salida ≤15:00
                → 1; 15:01–21:00 → 0,75; llegada ≥15:00 → 1; etc.). Solo tramos /
                giras Sinfónico, CF o Jazz Band fuera de la localidad de viáticos.
                Suma al Total.
              </p>
              {pcvDetalle.length === 0 ? (
                <p className="px-3 py-2 text-xs text-slate-400">
                  Sin días PCV en el rango (en casa, sin nómina o sin fechas).
                </p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {pcvDetalle.map((w, idx) => (
                    <li
                      key={`${w.programId}-${w.tramoLabel}-${idx}`}
                      className="flex items-start gap-2 px-3 py-2"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-slate-800">
                          {w.programLabel}
                          {w.tramoLabel ? (
                            <span className="font-normal text-slate-500">
                              {" "}
                              · {w.tramoLabel}
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-0.5 text-[11px] leading-snug text-slate-600">
                          {formatPcvWindowLine(w)}
                        </p>
                        <p className="mt-0.5 text-[10px] text-slate-400">
                          {w.fromTransport
                            ? "Horarios de transporte de la gira"
                            : "Mediodía (sin transporte en el tramo)"}
                          {" · "}
                          {formatServicioNumber(w.dias)} día
                          {Number(w.dias) === 1 ? "" : "s"} PCV
                        </p>
                      </div>
                      <div className="shrink-0 text-right text-xs font-bold tabular-nums text-teal-900">
                        {formatServicioNumber(w.dias)}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </DetalleCollapse>

            {ensayoSections.map((section) => (
              <DetalleCollapse
                key={section.key}
                id={section.key}
                openKeys={openKeys}
                toggle={toggle}
                title={section.label}
                summary={
                  <EnsayosSectionSummary
                    ensayosCount={section.hits.length}
                    prestaciones={section.value}
                  />
                }
                headerClass="bg-emerald-50/80 hover:bg-emerald-50"
              >
                {section.hits.length === 0 ? (
                  <p className="px-3 py-2 text-xs text-slate-400">
                    Ningún evento en esta categoría.
                  </p>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {section.hits.map((hit) => {
                      const evt = hit.event;
                      const estimado = hit.origin === "estimado";
                      const conflicto = hit.conflicto;
                      const tone = conflicto?.tone;
                      return (
                        <li
                          key={evt.id}
                          className={`flex items-start gap-2 px-3 py-2 ${
                            tone
                              ? conflictoRowClass(tone)
                              : estimado
                                ? "bg-orange-50/70"
                                : ""
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5 text-sm font-medium text-slate-800">
                              <span>
                                {formatDdMmYyyy(evt.fecha) || evt.fecha}
                              </span>
                              {evt.hora_inicio ? (
                                <span className="text-xs font-normal text-slate-500">
                                  {String(evt.hora_inicio).slice(0, 5)}
                                  {evt.hora_fin
                                    ? `–${String(evt.hora_fin).slice(0, 5)}`
                                    : ""}
                                </span>
                              ) : null}
                              {tone ? (
                                <span
                                  className={`inline-flex items-center gap-1 rounded px-1 py-px text-[10px] font-bold uppercase ${conflictoBadgeClass(tone)}`}
                                >
                                  {tone === "pending" ? (
                                    <IconAlertTriangle size={10} />
                                  ) : null}
                                  {conflicto.label}
                                </span>
                              ) : null}
                              {estimado ? (
                                <span className="rounded bg-orange-100 px-1 py-px text-[10px] font-bold uppercase text-orange-800">
                                  Est.
                                </span>
                              ) : (
                                markBadge(hit.mark)
                              )}
                            </div>
                            <p
                              className={`mt-0.5 text-xs leading-snug ${
                                estimado
                                  ? "italic text-orange-800"
                                  : tone === "pending"
                                    ? "text-amber-900"
                                    : "text-slate-500"
                              }`}
                            >
                              {eventSubtitle(evt)}
                              {conflicto?.giras
                                ? ` · ${conflicto.giras}`
                                : ""}
                            </p>
                          </div>
                          <div className="shrink-0 text-right">
                            <div
                              className={`text-xs font-bold tabular-nums ${
                                hit.displayOnly
                                  ? "text-amber-800"
                                  : "text-slate-800"
                              }`}
                            >
                              {formatServicioNumber(hit.value)}
                            </div>
                            {hit.displayOnly ? (
                              <div className="text-[10px] font-semibold text-amber-700">
                                no suma
                              </div>
                            ) : null}
                            <div className="inline-flex items-center gap-0.5 text-[10px] text-slate-400">
                              <IconClock size={10} />
                              {hit.durationSeconds != null
                                ? formatEventDurationLabel(evt)
                                : durationBandLabel(hit)}
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </DetalleCollapse>
            ))}

            <p className="px-1 text-[10px] text-slate-400">
              Conciertos y didácticos ya no entran al Total del listado; siguen
              en el PDF de detalle si los necesitás por evento.
            </p>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/**
 * Gestión → Prestaciones. Árbol y nómina = informe de Convocatorias.
 * Eventos/roster solo cuando hay integrantes seleccionados.
 */
export default function ServiciosCantidadReport({ supabase }) {
  const defaults = yearDefaultRange();
  const [fechaDesde, setFechaDesde] = useState(defaults.fechaDesde);
  const [fechaHasta, setFechaHasta] = useState(defaults.fechaHasta);
  const [giraId, setGiraId] = useState("");
  const [search, setSearch] = useState("");
  const [groupByEnsambles, setGroupByEnsambles] = useState(false);
  const [ensayoColumnView, setEnsayoColumnView] = useState(
    ENSAYO_COLUMN_VIEWS.origen,
  );
  const [estimarFuturos, setEstimarFuturos] = useState(true);
  /** listado | sandbox — proyección editable de giras / demoras */
  const [panelMode, setPanelMode] = useState("sandbox");
  const [selectedTypes, setSelectedTypes] = useState(
    () => new Set(TIPOS_PROGRAMA_ASISTENCIA_MATRIZ),
  );

  const [catalogLoading, setCatalogLoading] = useState(true);
  const [periodLoading, setPeriodLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);

  const [programasCatalog, setProgramasCatalog] = useState([]);
  const [integrantes, setIntegrantes] = useState([]);
  const [ensambles, setEnsambles] = useState([]);
  const [membershipsTree, setMembershipsTree] = useState([]);
  const [events, setEvents] = useState([]);
  const [customRows, setCustomRows] = useState([]);
  const [membershipsCount, setMembershipsCount] = useState([]);
  const [programasPeriod, setProgramasPeriod] = useState([]);
  const [rosterByGiraId, setRosterByGiraId] = useState({});
  const [rosterLoading, setRosterLoading] = useState(false);
  const [integranteGrupoIdsByGiraId, setIntegranteGrupoIdsByGiraId] = useState(
    () => new Map(),
  );
  const [gruposMembershipLoading, setGruposMembershipLoading] = useState(false);
  const [detalleIntegrante, setDetalleIntegrante] = useState(null);
  const [conflictoOpen, setConflictoOpen] = useState(false);
  const [conflictoLoading, setConflictoLoading] = useState(false);
  const [conflictoError, setConflictoError] = useState(null);
  const [conflictoGroups, setConflictoGroups] = useState([]);
  const [conflictoTick, setConflictoTick] = useState(0);
  const [conflictoSessionByEventId, setConflictoSessionByEventId] = useState(
    {},
  );
  const [reportEnsambleId, setReportEnsambleId] = useState(null);
  const [todosPdfBusy, setTodosPdfBusy] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState(null);
  const [reportData, setReportData] = useState(null);
  const [reportTick, setReportTick] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [pendingSave, setPendingSave] = useState(null);

  const [selectedIntegranteIdsByMode, setSelectedIntegranteIdsByMode] =
    useState(createEmptySelectionByMode);
  const [openEnsambles, setOpenEnsambles] = useState(() => new Set());
  const [ensambleViewMode, setEnsambleViewMode] = useState("ensambles");
  const [openRegions, setOpenRegions] = useState(() => new Set());

  const ensambleCheckboxRefs = useRef({});
  const regionCheckboxRefs = useRef({});

  const rememberConflictoResolved = useCallback((entry) => {
    if (!entry?.eventId || !entry?.kind) return;
    setConflictoSessionByEventId((prev) => ({
      ...prev,
      [String(entry.eventId)]: entry,
    }));
  }, []);

  const forgetConflictoResolved = useCallback((eventId) => {
    if (eventId == null) return;
    const key = String(eventId);
    setConflictoSessionByEventId((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  useEffect(() => {
    setConflictoSessionByEventId({});
  }, [fechaDesde, fechaHasta]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setCatalogLoading(true);
      setLoadError(null);
      const res = await fetchAsistenciaMatrixBaseData(supabase);
      if (cancelled) return;
      if (res.error) {
        setLoadError(res.error.message || "Error al cargar datos");
        setCatalogLoading(false);
        return;
      }
      setProgramasCatalog(res.programas || []);
      setIntegrantes(res.integrantes || []);
      setEnsambles(res.ensambles || []);
      setMembershipsTree(res.memberships || []);
      setSelectedIntegranteIdsByMode(createEmptySelectionByMode());
      setOpenEnsambles(new Set());
      setCatalogLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const selectedCountForConflicto = (
    selectedIntegranteIdsByMode[ensambleViewMode] || new Set()
  ).size;

  useEffect(() => {
    const needCount = selectedCountForConflicto > 0;
    if ((!conflictoOpen && !needCount) || !supabase) return undefined;
    let cancelled = false;
    (async () => {
      setConflictoLoading(conflictoGroups.length === 0);
      setConflictoError(null);
      const res = await fetchEnsayosConflictoPeriod(supabase, {
        fechaDesde,
        fechaHasta,
      });
      if (cancelled) return;
      if (res.error) {
        setConflictoError(res.error);
        setConflictoGroups([]);
        setConflictoLoading(false);
        return;
      }
      setConflictoGroups(
        buildEnsayosConflictoGroups({
          events: res.events,
          ensambles: ensambles.length ? ensambles : res.ensambles,
          integrantes: integrantes.length ? integrantes : res.integrantes,
          memberships: res.memberships,
          customRows: res.customRows,
          programas: res.programas,
          rosterByGiraId: res.rosterByGiraId,
        }),
      );
      setConflictoLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [
    conflictoOpen,
    selectedCountForConflicto,
    supabase,
    fechaDesde,
    fechaHasta,
    ensambles,
    integrantes,
    conflictoTick,
  ]);

  useEffect(() => {
    if (!reportEnsambleId || !supabase) return undefined;
    const ensamble = (ensambles || []).find(
      (en) => Number(en.id) === Number(reportEnsambleId),
    );
    if (!ensamble) {
      setReportData(null);
      setReportError(new Error("Ensamble no encontrado"));
      return undefined;
    }
    let cancelled = false;
    (async () => {
      setReportLoading(!reportData);
      setReportError(null);
      const res = await fetchEnsambleServiciosBundle(supabase, {
        fechaDesde,
        fechaHasta,
      });
      if (cancelled) return;
      if (res.error) {
        setReportError(res.error);
        setReportData(null);
        setReportLoading(false);
        return;
      }
      const groups = buildEnsayosConflictoGroups({
        events: res.events,
        ensambles,
        integrantes,
        memberships: res.memberships,
        customRows: res.customRows,
        programas: res.programas,
        rosterByGiraId: res.rosterByGiraId,
      });
      setReportData(
        buildEnsambleServiciosReport({
          ensamble,
          programas: res.programas,
          events: res.events,
          conflictoGroups: groups,
          fechaDesde,
          fechaHasta,
          ensambles,
          memberships: res.memberships,
          fimba: res.fimba,
        }),
      );
      setReportLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [
    reportEnsambleId,
    supabase,
    fechaDesde,
    fechaHasta,
    ensambles,
    integrantes,
    reportTick,
  ]);

  const membershipsByEnsamble = useMemo(() => {
    const map = new Map();
    for (const row of membershipsTree) {
      const eid = Number(row.id_ensamble);
      const iid = integranteKey(row.id_integrante);
      if (!iid) continue;
      if (!map.has(eid)) map.set(eid, []);
      map.get(eid).push(iid);
    }
    return map;
  }, [membershipsTree]);

  const visibleEnsamblesForView = useMemo(
    () => filterEnsamblesForConvocatoriaView(ensambles, ensambleViewMode),
    [ensambles, ensambleViewMode],
  );

  const regionGroups = useMemo(() => {
    if (ensambleViewMode !== "regiones") return [];
    return groupRegionalEnsamblesByRegion(ensambles)
      .map((group) => ({
        ...group,
        ensambles: group.ensambles.filter((en) => {
          const memberIds = membershipsByEnsamble.get(Number(en.id)) || [];
          return memberIds.length > 0;
        }),
      }))
      .filter((group) => group.ensambles.length > 0);
  }, [ensambles, ensambleViewMode, membershipsByEnsamble]);

  const visibleIntegranteIdsForView = useMemo(() => {
    const ids = new Set();
    for (const en of visibleEnsamblesForView) {
      const memberIds = membershipsByEnsamble.get(Number(en.id)) || [];
      memberIds.forEach((id) => ids.add(id));
    }
    return ids;
  }, [visibleEnsamblesForView, membershipsByEnsamble]);

  const selectedIntegranteIds = useMemo(
    () => selectedIntegranteIdsByMode[ensambleViewMode] ?? new Set(),
    [selectedIntegranteIdsByMode, ensambleViewMode],
  );

  const ensamblesForGrouping = useMemo(
    () => filterEnsamblesForConvocatoriaView(ensambles, "ensambles"),
    [ensambles],
  );

  const integranteById = useMemo(() => {
    const m = new Map();
    for (const it of integrantes) m.set(integranteKey(it.id), it);
    return m;
  }, [integrantes]);

  const hasSelection = selectedIntegranteIds.size > 0;

  useEffect(() => {
    let cancelled = false;
    if (!hasSelection || !supabase || !fechaDesde || !fechaHasta) {
      setEvents([]);
      setCustomRows([]);
      setMembershipsCount([]);
      setProgramasPeriod([]);
      setIntegranteGrupoIdsByGiraId(new Map());
      setPeriodLoading(false);
      setGruposMembershipLoading(false);
      return undefined;
    }
    (async () => {
      setPeriodLoading(true);
      setGruposMembershipLoading(true);
      setLoadError(null);
      const period = await fetchServiciosCantidadPeriod(supabase, {
        fechaDesde,
        fechaHasta,
        giraId: giraId || null,
      });
      if (cancelled) return;
      if (period.error) {
        setLoadError(period.error.message || "Error al cargar eventos");
        setEvents([]);
        setIntegranteGrupoIdsByGiraId(new Map());
        setPeriodLoading(false);
        setGruposMembershipLoading(false);
        return;
      }
      const nextEvents = period.events || [];
      setEvents(nextEvents);
      setCustomRows(period.customRows || []);
      setMembershipsCount(period.memberships || []);
      setProgramasPeriod(period.programas || []);
      setPeriodLoading(false);
      const gruposMap = await fetchIntegranteGrupoIdsByGiraId(
        supabase,
        nextEvents,
      );
      if (cancelled) return;
      setIntegranteGrupoIdsByGiraId(gruposMap);
      setGruposMembershipLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase, hasSelection, fechaDesde, fechaHasta, giraId]);

  const programasById = useMemo(() => {
    const m = new Map();
    for (const p of programasCatalog) m.set(p.id, p);
    for (const p of programasPeriod) m.set(p.id, p);
    return m;
  }, [programasCatalog, programasPeriod]);

  const allProgramas = useMemo(() => [...programasById.values()], [programasById]);

  const filteredProgramas = useMemo(() => {
    return allProgramas.filter((p) => {
      if (!p?.id) return false;
      if (isProgramBorrador(p)) return false;
      if (p.tipo && !selectedTypes.has(p.tipo)) return false;
      if (giraId && String(p.id) !== String(giraId)) return false;
      return programOverlapsDateRange(p, fechaDesde, fechaHasta, undefined, {
        calendarOnly: true,
      });
    });
  }, [allProgramas, selectedTypes, giraId, fechaDesde, fechaHasta]);

  const giraOptions = useMemo(
    () =>
      (programasCatalog || []).filter((p) => {
        if (!p?.id || isProgramBorrador(p)) return false;
        return programOverlapsDateRange(p, fechaDesde, fechaHasta, undefined, {
          calendarOnly: true,
        });
      }),
    [programasCatalog, fechaDesde, fechaHasta],
  );

  const ensamblesForReport = useMemo(
    () => listEnsamblesForServiciosReport(ensambles),
    [ensambles],
  );

  const ensambleById = useMemo(() => {
    const m = new Map();
    for (const en of ensambles) m.set(Number(en.id), en);
    return m;
  }, [ensambles]);

  const giraIdsNeedingRoster = useMemo(() => {
    if (!hasSelection) return [];
    // Todas las giras del filtro: columnas Giras/PCV necesitan nómina aunque no haya eventos.
    return filteredProgramas.map((p) => p.id).filter((id) => id != null);
  }, [filteredProgramas, hasSelection]);

  useEffect(() => {
    let cancelled = false;
    if (!supabase || !hasSelection || giraIdsNeedingRoster.length === 0) {
      setRosterByGiraId({});
      setRosterLoading(false);
      return undefined;
    }
    (async () => {
      setRosterLoading(true);
      const list = giraIdsNeedingRoster.map(
        (id) => programasById.get(id) || { id },
      );
      const map = await resolveRostersForPrograms(supabase, list);
      if (cancelled) return;
      setRosterByGiraId(map);
      setRosterLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase, hasSelection, giraIdsNeedingRoster, programasById]);

  const giraAverage = useMemo(() => {
    if (!estimarFuturos) return null;
    return getFixedGiraServiciosAverage();
  }, [estimarFuturos]);

  const estimableGiraIds = useMemo(() => {
    if (!estimarFuturos) return new Set();
    return new Set(
      listEstimableGiras(filteredProgramas, {
        today: toLocalDateString(),
        selectedTypes,
        giraIdFilter: giraId || null,
        onlySinfonico: true,
      }).map((p) => Number(p.id)),
    );
  }, [estimarFuturos, filteredProgramas, selectedTypes, giraId]);

  /** Estimación por gira (servicios_estimados / eventos / default 7). */
  const giraEstimateById = useMemo(() => {
    const map = new Map();
    if (!estimarFuturos) return map;
    const eventsByGira = new Map();
    for (const evt of events || []) {
      if (evt?.id_gira == null) continue;
      const gid = Number(evt.id_gira);
      if (!eventsByGira.has(gid)) eventsByGira.set(gid, []);
      eventsByGira.get(gid).push(evt);
    }
    for (const id of estimableGiraIds) {
      const prog =
        programasById.get?.(id) ||
        programasById.get?.(Number(id)) ||
        filteredProgramas.find((p) => Number(p.id) === Number(id));
      if (!prog) continue;
      if (
        prog.tipo !== "Sinfónico" &&
        prog.tipo !== "Camerata Filarmónica"
      ) {
        continue;
      }
      const est = resolveGiraServiciosEstimate(
        prog,
        eventsByGira.get(Number(id)) || [],
      );
      const byKind = est.byKind || {
        concierto: 1,
        didactico: 0,
        ensayo_gira_full: Math.max(0, Number(est.value) - 1),
        ensayo_gira_half: 0,
      };
      map.set(Number(id), {
        mean: est.value,
        byKind,
        source: est.source,
      });
    }
    return map;
  }, [
    estimarFuturos,
    estimableGiraIds,
    events,
    programasById,
    filteredProgramas,
  ]);

  const estimateNote = useMemo(() => {
    if (!estimarFuturos) return "";
    return `Estimar futuros · por gira (default ${FIXED_FUTURE_GIRA_SERVICIOS}; override en Proyección)`;
  }, [estimarFuturos]);

  const pendingConflictoEventIds = useMemo(
    () => pendingFullConflictoEventIdSet(conflictoGroups),
    [conflictoGroups],
  );

  const [girasMetaPrograms, setGirasMetaPrograms] = useState([]);
  const [transportEventsByGiraId, setTransportEventsByGiraId] = useState(
    () => new Map(),
  );
  const [girasMetaLoading, setGirasMetaLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!supabase || !hasSelection || filteredProgramas.length === 0) {
      setGirasMetaPrograms([]);
      setTransportEventsByGiraId(new Map());
      setGirasMetaLoading(false);
      return undefined;
    }
    (async () => {
      setGirasMetaLoading(true);
      const clones = filteredProgramas.map((p) => ({ ...p }));
      const meta = await fetchPrestacionesGirasMeta(supabase, clones);
      if (cancelled) return;
      setGirasMetaPrograms(meta.programs || clones);
      setTransportEventsByGiraId(meta.transportEventsByGiraId || new Map());
      setGirasMetaLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase, hasSelection, filteredProgramas]);

  const prestacionesMetaByIntegranteId = useMemo(() => {
    if (
      !hasSelection ||
      rosterLoading ||
      girasMetaLoading ||
      gruposMembershipLoading
    ) {
      return new Map();
    }
    const selected = integrantes.filter((it) =>
      selectedIntegranteIds.has(integranteKey(it.id)),
    );
    return buildPrestacionesMetaByIntegranteId(selected, {
      programs: girasMetaPrograms,
      rosterByGiraId,
      transportEventsByGiraId,
      events,
      fechaDesde,
      fechaHasta,
      giraIdFilter: giraId || null,
      integranteGrupoIdsByGiraId,
    });
  }, [
    hasSelection,
    rosterLoading,
    girasMetaLoading,
    gruposMembershipLoading,
    integrantes,
    selectedIntegranteIds,
    girasMetaPrograms,
    rosterByGiraId,
    transportEventsByGiraId,
    events,
    fechaDesde,
    fechaHasta,
    giraId,
    integranteGrupoIdsByGiraId,
  ]);

  const computeCtx = useMemo(
    () =>
      buildServiciosComputeContext({
        rosterByGiraId,
        memberships: membershipsCount.length
          ? membershipsCount
          : membershipsTree,
        customRows,
        programas: allProgramas,
        filteredProgramas,
        fechaDesde,
        fechaHasta,
        giraIdFilter: giraId || null,
        estimarFuturos,
        estimableGiraIds,
        giraAverage,
        giraEstimateById,
        programasById,
        pendingConflictoEventIds,
        prestacionesMetaByIntegranteId,
        integranteGrupoIdsByGiraId,
      }),
    [
      rosterByGiraId,
      membershipsCount,
      membershipsTree,
      customRows,
      allProgramas,
      filteredProgramas,
      fechaDesde,
      fechaHasta,
      giraId,
      estimarFuturos,
      estimableGiraIds,
      giraAverage,
      giraEstimateById,
      programasById,
      pendingConflictoEventIds,
      prestacionesMetaByIntegranteId,
      integranteGrupoIdsByGiraId,
    ],
  );

  const visibleRows = useMemo(() => {
    const rows = sortIntegrantesByInstrument(
      integrantes.filter((it) => selectedIntegranteIds.has(integranteKey(it.id))),
    );
    if (!search.trim()) return rows;
    return rows.filter((row) =>
      matchesMultiTokenSearch(
        [
          row.apellido,
          row.nombre,
          row.instrumentos?.instrumento,
          row.instrumentos?.abreviatura,
          row.instrumentos?.familia,
          String(row.id),
        ],
        search,
      ),
    );
  }, [integrantes, selectedIntegranteIds, search]);

  const bucketsByIntegranteId = useMemo(() => {
    const out = {};
    if (
      !hasSelection ||
      periodLoading ||
      rosterLoading ||
      conflictoLoading ||
      girasMetaLoading ||
      gruposMembershipLoading
    ) {
      return out;
    }
    for (const row of visibleRows) {
      const iid = integranteKey(row.id);
      out[iid] = accumulateServiciosForIntegrante(iid, events, computeCtx);
    }
    return out;
  }, [
    visibleRows,
    events,
    computeCtx,
    hasSelection,
    periodLoading,
    rosterLoading,
    conflictoLoading,
    girasMetaLoading,
    gruposMembershipLoading,
  ]);

  const rowGroups = useMemo(() => {
    if (!groupByEnsambles) {
      return [{ key: "flat", label: null, rows: visibleRows }];
    }
    if (ensambleViewMode === "cameratas") {
      if (visibleRows.length === 0) return [];
      return [{ key: "cameratas", label: null, rows: visibleRows }];
    }
    return buildAsistenciaMatrixRowGroups(
      visibleRows,
      ensamblesForGrouping,
      membershipsByEnsamble,
      selectedIntegranteIds,
    );
  }, [
    groupByEnsambles,
    ensambleViewMode,
    visibleRows,
    ensamblesForGrouping,
    membershipsByEnsamble,
    selectedIntegranteIds,
  ]);

  const columnTotals = useMemo(
    () =>
      sumBuckets(
        visibleRows.map((r) => bucketsByIntegranteId[integranteKey(r.id)]),
      ),
    [visibleRows, bucketsByIntegranteId],
  );

  const detalleHits = useMemo(() => {
    if (!detalleIntegrante) return [];
    const iid = detalleIntegrante.id;
    return attachConflictoToDetalleHits({
      hits: listServicioHitsForIntegrante(iid, events, computeCtx),
      events,
      integranteId: iid,
      groups: conflictoGroups,
      sessionByEventId: conflictoSessionByEventId,
      isConvocado: (evt) =>
        isIntegranteConvocadoToEnsayo(
          evt,
          iid,
          computeCtx.memberships,
          customMapForIntegrante(computeCtx.customByEventId, iid),
        ),
    });
  }, [
    detalleIntegrante,
    events,
    computeCtx,
    conflictoGroups,
    conflictoSessionByEventId,
  ]);

  const toggleType = useCallback((tipo) => {
    setSelectedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(tipo)) next.delete(tipo);
      else next.add(tipo);
      return next;
    });
  }, []);

  const patchSelectionForMode = useCallback(
    (updater) => {
      setSelectedIntegranteIdsByMode((prev) => {
        const current = new Set(prev[ensambleViewMode] || []);
        const next = updater(current);
        return { ...prev, [ensambleViewMode]: next };
      });
    },
    [ensambleViewMode],
  );

  const toggleIntegrante = useCallback(
    (id) => {
      const n = integranteKey(id);
      if (!n) return;
      patchSelectionForMode((prev) => {
        const next = new Set(prev);
        if (next.has(n)) next.delete(n);
        else next.add(n);
        return next;
      });
    },
    [patchSelectionForMode],
  );

  const toggleEnsambleMembers = useCallback(
    (_ensambleId, memberIds) => {
      patchSelectionForMode((prev) => {
        const allSelected = memberIds.every((id) => prev.has(id));
        const next = new Set(prev);
        if (allSelected) memberIds.forEach((id) => next.delete(id));
        else memberIds.forEach((id) => next.add(id));
        return next;
      });
    },
    [patchSelectionForMode],
  );

  const toggleEnsambleOpen = useCallback((id) => {
    setOpenEnsambles((prev) => {
      const next = new Set(prev);
      const n = Number(id);
      if (next.has(n)) next.delete(n);
      else next.add(n);
      return next;
    });
  }, []);

  const toggleRegionOpen = useCallback((key) => {
    setOpenRegions((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  useEffect(() => {
    const ensList =
      ensambleViewMode === "regiones"
        ? regionGroups.flatMap((g) => g.ensambles)
        : visibleEnsamblesForView;
    for (const en of ensList) {
      const eid = Number(en.id);
      const memberIds = membershipsByEnsamble.get(eid) || [];
      const ref = ensambleCheckboxRefs.current[eid];
      if (!ref) continue;
      const selected = memberIds.filter((id) => selectedIntegranteIds.has(id));
      ref.indeterminate =
        selected.length > 0 && selected.length < memberIds.length;
    }
  }, [
    ensambleViewMode,
    regionGroups,
    visibleEnsamblesForView,
    membershipsByEnsamble,
    selectedIntegranteIds,
  ]);

  useEffect(() => {
    if (ensambleViewMode !== "regiones") return;
    for (const group of regionGroups) {
      const allMemberIds = [];
      for (const en of group.ensambles) {
        const memberIds = membershipsByEnsamble.get(Number(en.id)) || [];
        allMemberIds.push(...memberIds);
      }
      const ref = regionCheckboxRefs.current[group.key];
      if (!ref || allMemberIds.length === 0) continue;
      const selected = allMemberIds.filter((id) =>
        selectedIntegranteIds.has(id),
      );
      ref.indeterminate =
        selected.length > 0 && selected.length < allMemberIds.length;
    }
  }, [
    ensambleViewMode,
    regionGroups,
    membershipsByEnsamble,
    selectedIntegranteIds,
  ]);

  const selectAllIntegrantes = useCallback(() => {
    setSelectedIntegranteIdsByMode((prev) => ({
      ...prev,
      [ensambleViewMode]: new Set(visibleIntegranteIdsForView),
    }));
  }, [ensambleViewMode, visibleIntegranteIdsForView]);

  const clearAllIntegrantes = useCallback(() => {
    setSelectedIntegranteIdsByMode((prev) => ({
      ...prev,
      [ensambleViewMode]: new Set(),
    }));
  }, [ensambleViewMode]);

  const resetYear = useCallback(() => {
    const next = yearDefaultRange();
    setFechaDesde(next.fechaDesde);
    setFechaHasta(next.fechaHasta);
    setGiraId("");
  }, []);

  const loading =
    catalogLoading ||
    (hasSelection &&
      (periodLoading ||
        rosterLoading ||
        girasMetaLoading ||
        gruposMembershipLoading));
  const exportDisabled = loading || visibleRows.length === 0 || exporting;

  const applyDownloadResult = useCallback((built) => {
    if (!built?.blob) return;
    if (built.result === "needs-gesture") {
      setPendingSave({ blob: built.blob, fileName: built.fileName });
      toast.message(
        "El archivo está listo. Tocá «Guardar» para bajarlo al teléfono.",
      );
      return;
    }
    if (built.result === "cancelled") return;
    setPendingSave(null);
    if (built.result === "downloaded") toast.success("Descarga iniciada");
  }, []);

  const downloadTodosInformes = useCallback(async () => {
    if (!supabase || todosPdfBusy) return;
    if (!ensamblesForReport.length) {
      toast.error("No hay ensambles para el informe.");
      return;
    }
    setTodosPdfBusy(true);
    toast.message("Armando el PDF de todos los ensambles…");
    try {
      const res = await fetchEnsambleServiciosBundle(supabase, {
        fechaDesde,
        fechaHasta,
      });
      if (res.error) throw res.error;
      const groups = buildEnsayosConflictoGroups({
        events: res.events,
        ensambles,
        integrantes,
        memberships: res.memberships,
        customRows: res.customRows,
        programas: res.programas,
        rosterByGiraId: res.rosterByGiraId,
      });
      const reports = ensamblesForReport
        .map((ensamble) =>
          buildEnsambleServiciosReport({
            ensamble,
            programas: res.programas,
            events: res.events,
            conflictoGroups: groups,
            fechaDesde,
            fechaHasta,
            ensambles,
            memberships: res.memberships,
            fimba: res.fimba,
          }),
        )
        .filter(Boolean);
      const built = await downloadEnsambleServiciosTodosPdf({
        reports,
        fechaDesde,
        fechaHasta,
        sessionByEventId: conflictoSessionByEventId,
      });
      applyDownloadResult(built);
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "No se pudo generar el PDF de ensambles.");
    } finally {
      setTodosPdfBusy(false);
    }
  }, [
    supabase,
    todosPdfBusy,
    ensamblesForReport,
    fechaDesde,
    fechaHasta,
    ensambles,
    integrantes,
    conflictoSessionByEventId,
    applyDownloadResult,
  ]);

  const onInformeEnsambleChange = useCallback(
    (event) => {
      const value = event.target.value;
      if (value === "todos") {
        void downloadTodosInformes();
        return;
      }
      setReportEnsambleId(value ? Number(value) : null);
    },
    [downloadTodosInformes],
  );

  const runExport = useCallback(
    async (task) => {
      if (exportDisabled) {
        if (!exporting && visibleRows.length === 0) {
          toast.error("Seleccioná al menos un integrante para exportar.");
        }
        return;
      }
      setExporting(true);
      try {
        const built = await task();
        applyDownloadResult(built);
      } catch (err) {
        toast.error(err?.message || "No se pudo generar el archivo");
      } finally {
        setExporting(false);
      }
    },
    [exportDisabled, exporting, visibleRows.length, applyDownloadResult],
  );

  const handleSavePending = useCallback(async () => {
    if (!pendingSave) return;
    try {
      const result = await saveBlobFile(pendingSave.blob, pendingSave.fileName);
      applyDownloadResult({ ...pendingSave, result });
    } catch (err) {
      toast.error(err?.message || "No se pudo guardar el archivo");
    }
  }, [pendingSave, applyDownloadResult]);

  const handleExportExcel = useCallback(async () => {
    await runExport(() =>
      downloadServiciosCantidadExcel({
        visibleRows,
        bucketsByIntegranteId,
        rowGroups: groupByEnsambles ? rowGroups : null,
        fechaDesde,
        fechaHasta,
        fileName: "cantidad_prestaciones",
        estimateNote,
        ensayoColumnView,
      }),
    );
  }, [
    exportDisabled,
    visibleRows,
    bucketsByIntegranteId,
    groupByEnsambles,
    rowGroups,
    fechaDesde,
    fechaHasta,
    estimateNote,
    ensayoColumnView,
    runExport,
  ]);

  const handleExportPdf = useCallback(() => {
    void runExport(() =>
      downloadServiciosCantidadPdf({
      visibleRows,
      bucketsByIntegranteId,
      rowGroups: groupByEnsambles ? rowGroups : [],
      fechaDesde,
      fechaHasta,
      groupByEnsambles,
      fileName: "cantidad_prestaciones",
      estimateNote,
      ensayoColumnView,
    }),
    );
  }, [
    runExport,
    visibleRows,
    bucketsByIntegranteId,
    groupByEnsambles,
    rowGroups,
    fechaDesde,
    fechaHasta,
    estimateNote,
    ensayoColumnView,
  ]);

  const handleExportDetalleLote = useCallback(() => {
    void runExport(() =>
      downloadServiciosCantidadDetalleLotePdf({
      visibleRows,
      events,
      computeCtx,
      bucketsByIntegranteId,
      fechaDesde,
      fechaHasta,
      ensambleById,
      programaById: programasById,
      estimateNote,
      conflictoGroups,
      sessionByEventId: conflictoSessionByEventId,
    }),
    );
  }, [
    runExport,
    visibleRows,
    events,
    computeCtx,
    bucketsByIntegranteId,
    fechaDesde,
    fechaHasta,
    ensambleById,
    programasById,
    estimateNote,
    conflictoGroups,
    conflictoSessionByEventId,
  ]);

  const handleExportDetalleOne = useCallback(
    (integrante, hits) => {
      if (!integrante) return;
      void runExport(() =>
        downloadServiciosCantidadDetallePdf({
          integrante,
          hits,
          buckets: bucketsByIntegranteId[integranteKey(integrante.id)] || {},
          fechaDesde,
          fechaHasta,
          ensambleById,
          programaById: programasById,
          estimateNote,
        }),
      );
    },
    [
      runExport,
      bucketsByIntegranteId,
      fechaDesde,
      fechaHasta,
      ensambleById,
      programasById,
      estimateNote,
    ],
  );

  const renderEnsambleNode = (en, { nested = false } = {}) => {
    const eid = Number(en.id);
    const memberIds = membershipsByEnsamble.get(eid) || [];
    if (memberIds.length === 0) return null;
    const open = openEnsambles.has(eid);
    const allOn = memberIds.every((id) => selectedIntegranteIds.has(id));
    const selectedCount = memberIds.filter((id) =>
      selectedIntegranteIds.has(id),
    ).length;
    return (
      <div
        key={eid}
        className={`overflow-hidden rounded-lg border border-slate-100 ${
          nested ? "ml-2" : ""
        }`}
      >
        <div className="flex items-center gap-1 bg-slate-50/80 px-1.5 py-1">
          <button
            type="button"
            onClick={() => toggleEnsambleOpen(eid)}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-white hover:text-slate-600"
            aria-expanded={open}
          >
            <IconChevronDown
              size={14}
              className={`shrink-0 transition-transform duration-200 ${
                open ? "rotate-0" : "-rotate-90"
              }`}
            />
          </button>
          <input
            ref={(el) => {
              ensambleCheckboxRefs.current[eid] = el;
            }}
            type="checkbox"
            checked={allOn}
            onChange={() => toggleEnsambleMembers(eid, memberIds)}
            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
          />
          <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800">
            {en.ensamble || `Ensamble ${eid}`}
          </span>
          {isCamerataEnsambleRow(en) ? null : (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setReportEnsambleId(eid);
              }}
              className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-indigo-500 hover:bg-white hover:text-indigo-700"
              title={`Informe de ${en.ensamble || "ensamble"}`}
              aria-label={`Informe de ${en.ensamble || "ensamble"}`}
            >
              <IconClipboard size={14} />
            </button>
          )}
          <span className="shrink-0 pr-1 text-[10px] tabular-nums text-slate-400">
            {selectedCount}/{memberIds.length}
          </span>
        </div>
        {open && (
          <div className="space-y-0.5 border-t border-slate-100 py-1 pl-3">
            {memberIds.map((iid) => {
              const p = integranteById.get(iid);
              if (!p) return null;
              const label = `${p.nombre || ""} ${p.apellido || ""}`.trim();
              return (
                <label
                  key={`${eid}-${iid}`}
                  className="flex min-h-9 cursor-pointer items-center gap-2.5 rounded-md py-1.5 pl-6 pr-2 text-sm text-slate-600 transition-colors hover:bg-slate-50"
                >
                  <input
                    type="checkbox"
                    checked={selectedIntegranteIds.has(iid)}
                    onChange={() => toggleIntegrante(iid)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="truncate leading-tight">{label}</span>
                </label>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const {
    columns: listingColumns,
    leading: listingLeading,
    ensayos: listingEnsayos,
    trailing: listingTrailing,
  } = splitServicioListingColumns(ensayoColumnView);
  const listingColCount = 1 + listingColumns.length + 1;
  const ensayoColumnKeys = new Set(listingEnsayos.map((col) => col.key));

  const renderDataRow = (row, key) => {
    const iid = integranteKey(row.id);
    const buckets = bucketsByIntegranteId[iid] || {};
    const name = `${row.apellido || ""}, ${row.nombre || ""}`.trim();
    return (
      <tr
        key={key}
        className="group cursor-pointer border-b border-slate-100 hover:bg-orange-50/60"
        onClick={() => setDetalleIntegrante(row)}
      >
        <td className="sticky left-0 z-[1] min-w-[10rem] max-w-[14rem] bg-white px-2 py-1.5 shadow-[2px_0_0_0_rgba(226,232,240,1)] group-hover:bg-orange-50">
          <div className="truncate text-sm font-medium text-slate-800">
            {name || `Integrante ${row.id}`}
          </div>
          <div className="truncate text-[10px] text-slate-400">
            {row.instrumentos?.instrumento ||
              row.instrumentos?.abreviatura ||
              "—"}
            {row.instrumentos?.familia
              ? ` · ${row.instrumentos.familia}`
              : ""}
          </div>
        </td>
        {listingColumns.map((col) => {
          const tint =
            col.key === "giras_fuera"
              ? "bg-orange-50/70 group-hover:bg-orange-100"
              : col.key === "giras_casa"
                ? "bg-sky-50/70 group-hover:bg-sky-100"
                : col.key === "conciertos_ensamble"
                  ? "bg-violet-50/70 group-hover:bg-violet-100"
                  : col.key === "conciertos_prest"
                    ? "bg-rose-50/70 group-hover:bg-rose-100"
                    : col.key === "pcv"
                      ? "bg-teal-50/70 group-hover:bg-teal-100"
                      : ensayoColumnKeys.has(col.key)
                        ? "bg-emerald-50/70 group-hover:bg-emerald-100"
                        : "";
          return (
            <td
              key={col.key}
              className={`px-2 py-1.5 text-right text-xs ${tint}`}
              title={col.title}
            >
              <ServicioCellValue
                bucket={buckets[col.key]}
                chipClass={col.chipClass}
                emphasize={col.key === "total"}
              />
            </td>
          );
        })}
        <td
          className="px-2 py-1.5 text-right text-xs"
          title={SERVICIO_POR_MES_COLUMN.title}
        >
          <ServicioPorMesCell
            totalServicios={bucketTotal(buckets.total)}
            integrante={row}
            range={{ fechaDesde, fechaHasta }}
          />
        </td>
      </tr>
    );
  };

  if (catalogLoading && integrantes.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-sm text-slate-500">
        Cargando filtros de convocatoria…
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-sm text-red-600">
        {loadError}
      </div>
    );
  }

  const isProyeccion = panelMode === "sandbox";

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-y-contain pb-8 [-webkit-overflow-scrolling:touch] lg:overflow-hidden lg:pb-0">
      <div className="flex shrink-0 flex-wrap items-end gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5">
        <div className="flex flex-wrap items-center gap-1 pb-0.5">
          <span className="mr-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Vista
          </span>
          <button
            type="button"
            onClick={() => setPanelMode("listado")}
            className={`rounded-md px-2.5 py-1 text-[11px] font-bold ${
              panelMode === "listado"
                ? "bg-indigo-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Listado
          </button>
          <button
            type="button"
            onClick={() => setPanelMode("sandbox")}
            className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-bold ${
              isProyeccion
                ? "bg-orange-600 text-white"
                : "bg-orange-50 text-orange-800 hover:bg-orange-100"
            }`}
          >
            <IconCalculator size={13} />
            Proyección
          </button>
        </div>
        <div className="mx-1 hidden h-7 w-px bg-slate-200 sm:block" aria-hidden />
        <div className="flex flex-wrap items-end gap-2">
          <div className="w-[9rem]">
            <DateInput
              label="Desde"
              value={fechaDesde}
              onChange={(v) => v && setFechaDesde(v)}
              showDayName={false}
            />
          </div>
          <div className="w-[9rem]">
            <DateInput
              label="Hasta"
              value={fechaHasta}
              onChange={(v) => v && setFechaHasta(v)}
              showDayName={false}
            />
          </div>
          <button
            type="button"
            onClick={resetYear}
            className="mb-px inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-[11px] font-bold text-slate-600 hover:border-slate-300 hover:bg-white"
            title="Rango = año calendario siguiente completo"
          >
            <IconRefresh size={14} />
            Año siguiente
          </button>
        </div>
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 lg:flex-row lg:overflow-hidden">
      {!isProyeccion ? (
      <aside className="flex w-full shrink-0 flex-col rounded-lg border border-slate-200 bg-white lg:min-h-0 lg:w-72 lg:self-stretch lg:overflow-hidden">
        <div className="shrink-0 border-b border-slate-100 px-3 py-2">
          <h3 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Tipo de programa
          </h3>
          <div className="mb-3 flex flex-wrap gap-1">
            {TIPOS_PROGRAMA_ASISTENCIA_MATRIZ.map((tipo) => {
              const on = selectedTypes.has(tipo);
              return (
                <button
                  key={tipo}
                  type="button"
                  onClick={() => toggleType(tipo)}
                  className={`rounded-full border px-2 py-0.5 text-[11px] font-bold transition-colors ${
                    on
                      ? "border-indigo-300 bg-indigo-50 text-indigo-800"
                      : "border-slate-200 bg-white text-slate-400 hover:border-slate-300"
                  }`}
                >
                  {tipo}
                </button>
              );
            })}
          </div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-600">
              Integrantes
            </h3>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setFiltersOpen((v) => !v)}
                className="inline-flex min-h-9 items-center rounded-md px-2 text-[11px] font-bold text-indigo-700 lg:hidden"
                aria-expanded={filtersOpen}
              >
                {filtersOpen ? "Ocultar" : "Mostrar"}
              </button>
              <button
                type="button"
                onClick={selectAllIntegrantes}
                className="min-h-9 rounded px-2 text-[11px] font-bold text-indigo-600 hover:bg-indigo-50"
              >
                Todos
              </button>
              <button
                type="button"
                onClick={clearAllIntegrantes}
                className="min-h-9 rounded px-2 text-[11px] font-bold text-slate-500 hover:bg-slate-50"
              >
                Ninguno
              </button>
            </div>
          </div>
          <div className="mb-2 flex flex-wrap items-center gap-2 lg:hidden">
            {pendingSave && (
              <button
                type="button"
                onClick={handleSavePending}
                className="inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-md bg-indigo-600 px-3 py-2 text-xs font-bold text-white"
              >
                <IconDownload size={14} />
                Guardar
              </button>
            )}
            <ServiciosExportMenu
              disabled={exportDisabled}
              onPdf={handleExportPdf}
              onPdfDetalle={handleExportDetalleLote}
              onExcel={handleExportExcel}
            />
            <button
              type="button"
              onClick={() => setConflictoOpen(true)}
              className="inline-flex min-h-10 items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5 text-[11px] font-bold text-amber-900"
            >
              <IconAlertTriangle size={14} />
              Conflictos
            </button>
          </div>
          <div
            className="mb-2 inline-flex w-full rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-[10px] font-bold"
            role="tablist"
            aria-label="Vista de ensambles"
          >
            {CONVOCATORIA_ENSAMBLE_VIEW_MODES.map((mode) => (
              <button
                key={mode}
                type="button"
                role="tab"
                aria-selected={ensambleViewMode === mode}
                onClick={() => setEnsambleViewMode(mode)}
                className={`flex-1 rounded-md px-1.5 py-1 capitalize transition-colors ${
                  ensambleViewMode === mode
                    ? "bg-white text-indigo-700 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {mode === "ensambles"
                  ? "Ensambles"
                  : mode === "cameratas"
                    ? "Cameratas"
                    : "Regiones"}
              </button>
            ))}
          </div>
          <label className="mb-2 mt-2 block">
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Informe de un ensamble
            </span>
            <select
              value={reportEnsambleId || ""}
              onChange={onInformeEnsambleChange}
              disabled={todosPdfBusy}
              className="w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-300 disabled:opacity-60"
              title="Elegí un ensamble, o Todos para descargar el PDF con el cuadro general y cada informe"
            >
              <option value="">Elegí ensamble…</option>
              <option value="todos">
                {todosPdfBusy ? "Armando PDF…" : "Todos"}
              </option>
              {ensamblesForReport.map((en) => (
                <option key={en.id} value={en.id}>
                  {en.ensamble || `Ensamble ${en.id}`}
                </option>
              ))}
            </select>
          </label>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            {CONVOCATORIA_VIEW_SECTION_TITLES[ensambleViewMode]}
          </p>
        </div>
        <div
          className={`max-h-[min(40vh,18rem)] min-h-[8rem] space-y-1.5 overflow-y-auto p-2 [-webkit-overflow-scrolling:touch] lg:max-h-none lg:min-h-0 lg:flex-1 ${
            filtersOpen ? "" : "hidden lg:block"
          }`}
        >
          {ensambleViewMode === "regiones"
            ? regionGroups.map((group) => {
                const open = openRegions.has(group.key);
                const allMemberIds = [];
                for (const en of group.ensambles) {
                  allMemberIds.push(
                    ...(membershipsByEnsamble.get(Number(en.id)) || []),
                  );
                }
                const allOn =
                  allMemberIds.length > 0 &&
                  allMemberIds.every((id) => selectedIntegranteIds.has(id));
                const selectedCount = allMemberIds.filter((id) =>
                  selectedIntegranteIds.has(id),
                ).length;
                const regionLabel = group.name || SIN_REGION_LABEL;
                return (
                  <div
                    key={group.key}
                    className="overflow-hidden rounded-lg border border-slate-100"
                  >
                    <div className="flex items-center gap-1 bg-slate-100/80 px-1.5 py-1">
                      <button
                        type="button"
                        onClick={() => toggleRegionOpen(group.key)}
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-white"
                        aria-expanded={open}
                      >
                        <IconChevronDown
                          size={14}
                          className={`transition-transform ${
                            open ? "rotate-0" : "-rotate-90"
                          }`}
                        />
                      </button>
                      <input
                        ref={(el) => {
                          regionCheckboxRefs.current[group.key] = el;
                        }}
                        type="checkbox"
                        checked={allOn}
                        onChange={() =>
                          toggleEnsambleMembers(group.key, allMemberIds)
                        }
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-700">
                        {regionLabel}
                      </span>
                      <span className="shrink-0 pr-1 text-[10px] tabular-nums text-slate-400">
                        {selectedCount}/{allMemberIds.length}
                      </span>
                    </div>
                    {open && (
                      <div className="space-y-1.5 border-t border-slate-100 p-1.5">
                        {group.ensambles.map((en) =>
                          renderEnsambleNode(en, { nested: true }),
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            : visibleEnsamblesForView.map((en) => renderEnsambleNode(en))}
        </div>
      </aside>
      ) : null}

      <div className="flex min-w-0 shrink-0 flex-col rounded-lg border border-slate-200 bg-white lg:min-h-0 lg:flex-1 lg:shrink lg:overflow-hidden">
        {!isProyeccion ? (
        <div className="sticky top-0 z-[4] border-b border-slate-100 bg-white lg:static">
          <div className="flex flex-col gap-2 px-3 py-2">
            <div className="flex flex-wrap items-end gap-2">
            <label className="min-w-[9rem] flex-1">
              <span className="mb-1 block text-[10px] font-bold uppercase text-slate-400">
                Gira
              </span>
              <select
                value={giraId}
                onChange={(e) => setGiraId(e.target.value)}
                className="w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-300"
              >
                <option value="">Todas las giras</option>
                {giraOptions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {giraOptionLabel(p)}
                  </option>
                ))}
              </select>
            </label>
            <label className="min-w-[10rem] max-w-xs flex-1">
              <span className="mb-1 block text-[10px] font-bold uppercase text-slate-400">
                Buscar
              </span>
              <span className="relative block">
                <IconSearch
                  size={14}
                  className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Integrante…"
                  className="w-full rounded-md border border-slate-200 py-1.5 pl-7 pr-2 text-xs text-slate-700 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-300"
                />
              </span>
            </label>
            <div className="ml-auto hidden pb-0.5 lg:block">
              <ServiciosExportMenu
                disabled={exportDisabled}
                onPdf={handleExportPdf}
                onPdfDetalle={handleExportDetalleLote}
                onExcel={handleExportExcel}
              />
            </div>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <label className="inline-flex cursor-pointer items-center gap-1.5 text-[11px] font-medium text-slate-600">
                <input
                  type="checkbox"
                  checked={groupByEnsambles}
                  onChange={(e) => setGroupByEnsambles(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                Agrupar por ensambles
              </label>
              <label
                className="inline-flex cursor-pointer items-center gap-1.5 text-[11px] font-medium text-slate-600"
                title={`Giras Sinf/CF con fecha_hasta de hoy en adelante: reemplaza ensayos/conciertos de gira por servicios estimados (default ${FIXED_FUTURE_GIRA_SERVICIOS}; editable en Proyección). Ensamble queda exacto.`}
              >
                <input
                  type="checkbox"
                  checked={estimarFuturos}
                  onChange={(e) => setEstimarFuturos(e.target.checked)}
                  className="rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                />
                <IconCalculator size={14} className="text-orange-600" />
                Estimar futuros
              </label>
              {pendingSave && (
                <button
                  type="button"
                  onClick={handleSavePending}
                  className="ml-auto hidden min-h-10 items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-2 text-xs font-bold text-white lg:inline-flex"
                >
                  <IconDownload size={14} />
                  Guardar
                </button>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 border-t border-indigo-100 bg-indigo-50/60 px-3 py-1.5">
            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-indigo-700">
              <IconMusic size={13} />
              Informe de ensamble
            </span>
            <select
              value={reportEnsambleId || ""}
              onChange={onInformeEnsambleChange}
              disabled={todosPdfBusy}
              className="max-w-[14rem] rounded-md border border-indigo-200 bg-white px-2 py-1 text-[11px] font-bold text-indigo-900 focus:border-indigo-400 focus:outline-none disabled:opacity-60"
              title="Elegí un ensamble, o Todos para descargar el PDF con el cuadro general y cada informe"
            >
              <option value="">Elegí ensamble…</option>
              <option value="todos">
                {todosPdfBusy ? "Armando PDF…" : "Todos"}
              </option>
              {ensamblesForReport.map((en) => (
                <option key={en.id} value={en.id}>
                  {en.ensamble || `Ensamble ${en.id}`}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setConflictoOpen(true)}
              className="hidden items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-bold text-amber-900 hover:border-amber-300 lg:inline-flex"
              title="Ensayos de ensamble con miembros convocados a una gira que solapa esa fecha"
            >
              <IconAlertTriangle size={14} />
              Ensayos en conflicto
            </button>
          </div>
        </div>
        ) : null}

        {!isProyeccion ? (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-50 px-3 py-1.5 text-[11px] text-slate-500">
          <span>
            {!hasSelection
              ? "Seleccioná integrantes a la izquierda para cargar prestaciones"
              : loading
                ? "Calculando…"
                : `${visibleRows.length} integrante(s)`}
            {hasSelection && !loading && (
              <>
                {" · "}
                total:{" "}
                <span className="font-semibold text-slate-700">
                  {formatServicioNumber(bucketTotal(columnTotals.total))}
                </span>
              </>
            )}
            {hasSelection && !loading && estimateNote ? (
              <>
                {" · "}
                <span className="font-semibold text-orange-800">
                  {estimateNote}
                </span>
              </>
            ) : null}
          </span>
          <span className="hidden text-[10px] text-slate-400 sm:inline">
            Fuera / En casa = giras (pesos por tramo) · (n) = cantidad de conciertos (incl. didácticos) · Conc.ens. = conciertos de ensamble · Prest.conc. = prestaciones de conciertos · Eventos con tags de grupo (p. ej. FIMBA) solo cuentan si el integrante está en el grupo · PCV = días de viático fuera de localidad (fracciones) · Total = conciertos + ensayos + PCV · ½ = 0,5 · R celeste · L ámbar · Prest/mes = total ÷ meses feb–dic · Estimar futuros: gira = {FIXED_FUTURE_GIRA_SERVICIOS} · clic en la fila para el detalle
          </span>
          <span className="text-[10px] text-slate-400 sm:hidden">
            Tocá una persona para el resumen. Deslizá para ver el resto.
          </span>
        </div>
        ) : null}

        <div
          className={
            isProyeccion
              ? "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
              : "max-h-[68vh] min-h-[14rem] overflow-auto overscroll-contain [-webkit-overflow-scrolling:touch] lg:max-h-none lg:min-h-0 lg:flex-1"
          }
        >
          {isProyeccion ? (
            <div className="flex min-h-0 min-w-0 flex-1 flex-col p-3">
              <PrestacionesProyeccionSandbox
                supabase={supabase}
                fechaDesde={fechaDesde}
                fechaHasta={fechaHasta}
              />
            </div>
          ) : !hasSelection ? (
            <div className="flex h-full items-center justify-center p-8 text-center text-sm text-slate-400">
              No hay músicos seleccionados. Elegí ensambles o pulsá Todos.
            </div>
          ) : loading ? (
            <div className="flex h-full items-center justify-center p-8 text-sm text-slate-400">
              Cargando eventos y convocatorias…
            </div>
          ) : visibleRows.length === 0 ? (
            <div className="flex h-full items-center justify-center p-8 text-sm text-slate-400">
              {search.trim()
                ? `Ningún integrante coincide con «${search.trim()}».`
                : "No hay músicos seleccionados o no hay membresías de ensamble."}
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-2 border-b border-emerald-100 bg-emerald-50 px-3 py-2 md:hidden">
                <span className="text-[11px] font-bold uppercase tracking-wide text-emerald-900">
                  Ensayos
                </span>
                <EnsayosViewToggle
                  view={ensayoColumnView}
                  onChange={setEnsayoColumnView}
                />
              </div>
              <div className="divide-y divide-slate-100 md:hidden">
                {(rowGroups.length
                  ? rowGroups
                  : [{ key: "all", label: null, rows: visibleRows }]
                ).flatMap((group) => {
                  const nodes = [];
                  if (group.label) {
                    nodes.push(
                      <div
                        key={`mh-${group.key}`}
                        className="bg-slate-100 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-700"
                      >
                        {group.label}
                      </div>,
                    );
                  }
                  for (const row of group.rows || []) {
                    const iid = integranteKey(row.id);
                    const buckets = bucketsByIntegranteId[iid] || {};
                    const name =
                      `${row.apellido || ""}, ${row.nombre || ""}`.trim();
                    nodes.push(
                      <button
                        key={`m-${group.key}-${row.id}`}
                        type="button"
                        onClick={() => setDetalleIntegrante(row)}
                        className="flex w-full items-center gap-3 px-3 py-3 text-left active:bg-orange-50"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold text-slate-900">
                            {name || `Integrante ${row.id}`}
                          </div>
                          <div className="truncate text-[11px] text-slate-400">
                            {row.instrumentos?.instrumento ||
                              row.instrumentos?.abreviatura ||
                              "—"}
                            {row.instrumentos?.familia
                              ? ` · ${row.instrumentos.familia}`
                              : ""}
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <div className="text-sm font-bold tabular-nums text-slate-800">
                            {formatServicioNumber(bucketTotal(buckets.total))}
                          </div>
                          <div className="text-[10px] text-orange-800">
                            {formatServiciosPorMesPlain(
                              bucketTotal(buckets.total),
                              row,
                              { fechaDesde, fechaHasta },
                            )}
                          </div>
                        </div>
                      </button>,
                    );
                  }
                  return nodes;
                })}
              </div>
              <table className="hidden w-full min-w-[56rem] border-collapse text-left md:table">
              <thead className="sticky top-0 z-[2]">
                <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                  <th
                    rowSpan={2}
                    className="sticky left-0 z-[3] min-w-[10rem] bg-slate-50 px-2 py-2 align-bottom shadow-[2px_0_0_0_rgba(226,232,240,1)]"
                  >
                    Integrante
                  </th>
                  {listingLeading.map((col) => (
                    <th
                      key={col.key}
                      rowSpan={2}
                      className={`whitespace-nowrap px-2 py-2 text-right align-bottom ${
                        col.key === "giras_fuera"
                          ? "bg-orange-50 text-orange-900"
                          : col.key === "giras_casa"
                            ? "bg-sky-50 text-sky-900"
                            : col.key === "conciertos_ensamble"
                              ? "bg-violet-50 text-violet-900"
                              : col.key === "conciertos_prest"
                                ? "bg-rose-50 text-rose-950"
                                : ""
                      }`}
                      title={col.title}
                    >
                      {col.shortLabel}
                    </th>
                  ))}
                  <th
                    colSpan={listingEnsayos.length}
                    scope="colgroup"
                    className="border-x border-emerald-200 bg-emerald-50 px-2 py-1.5 text-center normal-case tracking-normal"
                  >
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-[10px] font-bold uppercase tracking-wide text-emerald-900">
                        Ensayos
                      </span>
                      <EnsayosViewToggle
                        view={ensayoColumnView}
                        onChange={setEnsayoColumnView}
                      />
                    </div>
                  </th>
                  {listingTrailing.map((col) => (
                    <th
                      key={col.key}
                      rowSpan={2}
                      className={`whitespace-nowrap px-2 py-2 text-right align-bottom ${
                        col.key === "pcv"
                          ? "bg-teal-50 text-teal-900"
                          : "bg-slate-100"
                      }`}
                      title={col.title}
                    >
                      {col.shortLabel}
                    </th>
                  ))}
                  <th
                    rowSpan={2}
                    className="whitespace-nowrap bg-orange-50 px-2 py-2 text-right align-bottom text-orange-800"
                    title={SERVICIO_POR_MES_COLUMN.title}
                  >
                    {SERVICIO_POR_MES_COLUMN.shortLabel}
                  </th>
                </tr>
                <tr className="border-b border-emerald-200 bg-emerald-50 text-[10px] font-bold uppercase tracking-wide text-emerald-800">
                  {listingEnsayos.map((col) => (
                    <th
                      key={col.key}
                      scope="col"
                      className="whitespace-nowrap border-x border-emerald-100 bg-emerald-50 px-2 py-1.5 text-right"
                      title={col.title}
                    >
                      {col.shortLabel}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(rowGroups.length
                  ? rowGroups
                  : [{ key: "all", label: null, rows: visibleRows }]
                ).flatMap((group) => {
                  const rows = [];
                  if (group.label) {
                    rows.push(
                      <tr
                        key={`h-${group.key}`}
                        className="border-b border-slate-100 bg-slate-200/90"
                      >
                        <td
                          colSpan={listingColCount}
                          className="px-2 py-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-800"
                        >
                          {group.label}
                        </td>
                      </tr>,
                    );
                  }
                  for (const row of group.rows || []) {
                    rows.push(
                      renderDataRow(row, `${group.key}-${row.id}`),
                    );
                  }
                  return rows;
                })}
              </tbody>
              {visibleRows.length > 0 && (
                <tfoot className="sticky bottom-0 z-[2]">
                  <tr className="border-t border-slate-200 bg-slate-100 text-xs font-bold">
                    <td className="sticky left-0 z-[3] bg-slate-100 px-2 py-1.5 shadow-[2px_0_0_0_rgba(203,213,225,1)]">
                      Totales
                    </td>
                    {listingColumns.map((col) => (
                      <td
                        key={col.key}
                        className={`px-2 py-1.5 text-right ${
                          col.key === "giras_fuera"
                            ? "bg-orange-50"
                            : col.key === "giras_casa"
                              ? "bg-sky-50"
                              : col.key === "conciertos_ensamble"
                                ? "bg-violet-50"
                                : col.key === "conciertos_prest"
                                  ? "bg-rose-50"
                                  : col.key === "pcv"
                                    ? "bg-teal-50"
                                    : ensayoColumnKeys.has(col.key)
                                      ? "bg-emerald-50"
                                      : ""
                        }`}
                      >
                        <ServicioCellValue
                          bucket={columnTotals[col.key]}
                          chipClass={col.chipClass}
                          emphasize={col.key === "total"}
                        />
                      </td>
                    ))}
                    <td
                      className="bg-orange-50 px-2 py-1.5 text-right text-slate-400"
                      title="No se promedia Prestaciones/mes en el pie"
                    >
                      —
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
            </>
          )}
        </div>
      </div>
      </div>

      {detalleIntegrante && (
        <ServicioDetalleModal
          integrante={detalleIntegrante}
          hits={detalleHits}
          buckets={
            bucketsByIntegranteId[integranteKey(detalleIntegrante.id)] || {}
          }
          meta={
            prestacionesMetaByIntegranteId.get(
              integranteKey(detalleIntegrante.id),
            ) || null
          }
          fechaDesde={fechaDesde}
          fechaHasta={fechaHasta}
          ensambleById={ensambleById}
          programaById={programasById}
          ensayoColumnView={ensayoColumnView}
          estimateNote={estimateNote}
          onExportPdf={() =>
            handleExportDetalleOne(detalleIntegrante, detalleHits)
          }
          onClose={() => setDetalleIntegrante(null)}
        />
      )}

      {conflictoOpen && (
        <EnsayosConflictoModal
          groups={groupsWithFullConflicto(conflictoGroups)}
          loading={conflictoLoading}
          error={conflictoError}
          fechaDesde={fechaDesde}
          fechaHasta={fechaHasta}
          supabase={supabase}
          ensambles={ensambles}
          sessionByEventId={conflictoSessionByEventId}
          onSessionResolved={rememberConflictoResolved}
          onSessionForgotten={forgetConflictoResolved}
          onChanged={() => setConflictoTick((n) => n + 1)}
          onClose={() => setConflictoOpen(false)}
        />
      )}

      {reportEnsambleId != null && (
        <EnsambleServiciosModal
          report={reportData}
          loading={reportLoading}
          error={reportError}
          fechaDesde={fechaDesde}
          fechaHasta={fechaHasta}
          supabase={supabase}
          ensambles={ensambles}
          sessionByEventId={conflictoSessionByEventId}
          onSessionResolved={rememberConflictoResolved}
          onSessionForgotten={forgetConflictoResolved}
          onChanged={() => setReportTick((n) => n + 1)}
          onClose={() => {
            setReportEnsambleId(null);
            setReportData(null);
            setReportError(null);
          }}
        />
      )}
    </div>
  );
}
